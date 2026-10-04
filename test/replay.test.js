// Replay and ghost keep the whole race: a race over 5:32 on the Zoo replays to its end, the replay's speedometer shows the
// recorded speed (not a fixed 108 km/h), the stored best-lap ghost has 20 samples a second and the car it drove; on the
// Poller Wiesen the ghost flies over the jump at its recorded height.
const assert = require('assert');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

const parseTime = (s) => { const m = /(\d+):(\d+(?:\.\d+)?)/.exec(s); return m ? +m[1] * 60 + +m[2] : NaN; };

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${server.address().port}/`);
    assert(await waitFor(page, () => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length > 0, 60000), 'menu must load');
    const start = async (id) => {
      await page.evaluate((tid) => { window.STUNTS_MANUAL_STEP = false; window.STUNTS_NORENDER = false; const order = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id); document.querySelectorAll('.trackRow')[order.indexOf(tid)].click(); document.getElementById('startBtn').click(); }, id);
      assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 180000), `${id}: the race must start`);
      await page.evaluate(() => { window.STUNTS_MANUAL_STEP = true; window.STUNTS_NORENDER = true; window.STUNTS_AUTOPILOT = true; });
    };
    const drive = (n, ctl) => page.evaluate(({ n, ctl }) => { let d; for (let left = n; left > 0; left -= 6000) d = window.STUNTS_DRIVE_STEPS(Math.min(6000, left), ctl || undefined); return d; }, { n, ctl });
    const finish = async (id) => {
      for (let k = 0; k < 200 && !(await page.evaluate(() => window.STUNTS_DEBUG().player.finished)); k++) await drive(600);
      await page.evaluate(() => { window.STUNTS_MANUAL_STEP = false; });
      assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'finished', 60000), `${id}: the race must end`);
      await page.evaluate(() => { window.STUNTS_MANUAL_STEP = true; });
    };

    // 1) the Zoo: 40 s flat out, a long stop on the way (over 5:32 in all), then to the flag
    await start('zoo');
    const at40 = await drive(2400);
    await drive(1200); await drive(15000, { gas: 0, brake: 1, steer: 0, turbo: 0 });
    await finish('zoo');
    const race = await page.evaluate(() => ({ time: window.STUNTS_DEBUG().raceTime, car: window.STUNTS_REC(0).cars[0] }));
    assert(race.time >= 332, `the race must last 5:32 or more (${race.time})`);
    const t40 = await page.evaluate((t) => window.STUNTS_REC(t), at40.raceTime);
    assert(Math.abs(t40.t - at40.raceTime) < 0.03 && Math.abs(t40.v - at40.player.v) * 3.6 < 1.5, `the recording at 40 s must hold the driven speed (${(t40.v * 3.6).toFixed(1)} vs ${(at40.player.v * 3.6).toFixed(1)} km/h)`);
    const shot = await page.evaluate((t) => window.STUNTS_REPLAY_CAM(t, 0, 0), t40.t);
    const shown = parseTime(shot.label.split('/')[1]);
    assert(shown >= 332 && shown >= race.time - 0.1, `the replay must keep the whole race: ${shot.label} for a ${race.time.toFixed(2)} s race`);
    assert(shot.speedo !== '108' && Math.abs(+shot.speedo - Math.abs(t40.v) * 3.6) <= 1, `the replay speedometer at 40 s must show the recorded speed: ${shot.speedo} vs ${(t40.v * 3.6).toFixed(1)} km/h`);
    const end = await page.evaluate((t) => window.STUNTS_REPLAY_CAM(t, 0, 0), race.time - 1);
    const speeds = new Set(); for (const t of [10, 25, 60, 120, 200, race.time - 5]) speeds.add((await page.evaluate((tt) => window.STUNTS_REPLAY_CAM(tt, 0, 0), t)).speedo);
    assert(speeds.size >= 3, 'the replay speedometer must follow the race: ' + [...speeds].join(' '));
    lines.push(`Zoo: ${race.time.toFixed(1)} s race, replay "${shot.label}", speedo ${shot.speedo} at 40 s (recorded ${(t40.v * 3.6).toFixed(1)} km/h), end "${end.label}"`);
    const ghost = await page.evaluate(() => JSON.parse(localStorage.getItem('stuntskoelle.ghost.zoo') || 'null'));
    assert(ghost && ghost.t.length >= 0.9 * ghost.time * 20, `the ghost must keep 20 samples a second: ${ghost && ghost.t.length} for ${ghost && ghost.time.toFixed(1)} s`);
    assert(ghost.y && ghost.y.length === ghost.t.length && ghost.routes.length === ghost.t.length, 'the ghost must store a height (or null) and a route per sample');
    assert.strictEqual(ghost.car, race.car, 'the ghost must remember the car it drove');
    lines.push(`Zoo ghost: ${ghost.t.length} samples for a ${ghost.time.toFixed(2)} s lap, car ${ghost.car}`);

    // 2) the Poller Wiesen: a race for the ghost, then a second one with the ghost flying over the jump
    await page.evaluate(() => document.getElementById('menuBtn').click());
    await start('poller'); await finish('poller');
    const pg = await page.evaluate(() => JSON.parse(localStorage.getItem('stuntskoelle.ghost.poller') || 'null'));
    assert(pg && pg.y.some((y) => y != null), 'the Poller ghost must have flown');
    let run = [0, 0], cur = null; pg.y.forEach((y, i) => { if (y != null) { if (cur == null) cur = i; if (i - cur > run[1] - run[0]) run = [cur, i]; } else cur = null; });
    const mid = Math.floor((run[0] + run[1]) / 2), tMid = pg.t[mid], sMid = pg.s[mid];
    await page.evaluate(() => document.getElementById('menuBtn').click());
    await start('poller');
    const g = await page.evaluate((t) => window.STUNTS_GHOST(t), tMid);
    const road = await page.evaluate((s) => window.STUNTS_FRAME(s).p[1], sMid);
    assert(g && g.n === pg.t.length, 'the second race must load the ghost');
    assert(g.pos[1] - road > 3, `the ghost must fly at its recorded height mid-jump: ${g.pos[1].toFixed(2)} m over a road at ${road.toFixed(2)} m (recorded ${pg.y[mid]})`);
    lines.push(`Poller ghost mid-jump (lap ${tMid.toFixed(2)} s): ${(g.pos[1] - road).toFixed(2)} m above the road`);
    assert.deepStrictEqual(errors, [], 'no page errors');
    return { name: 'replay', ok: true, lines };
  } catch (e) {
    lines.push(String(e && e.stack || e)); return { name: 'replay', ok: false, lines };
  } finally { if (browser) await browser.close(); server.close(); }
};
