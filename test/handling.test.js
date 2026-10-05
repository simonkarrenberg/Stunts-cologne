// B22: the car has a heading against the road. A 100 ms ← tap at 100 km/h leaves a slide that dies away over a third of a
// second or more (not a stop dead), holding ← in the air moves the car at most 0.3 m, the verge carries less yaw than
// the road, LENKHILFE follows its rules (AUTO: LEICHT on, SCHWER off, never in ZEITFAHREN), and with LENKHILFE on the
// first career chapter driven by an autopilot with a shaky hand ends in at most two crashes off the road.
const assert = require('assert');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, serviceWorkers: 'block' });
    await context.addInitScript(() => { window.STUNTS_IDLE = 99999; window.STUNTS_NORENDER = true; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length > 0, undefined, { timeout: 120000 });

    // 1) LENKHILFE: AUTO follows the driver and the mode; AN and AUS override, ZEITFAHREN never has it
    const rules = await page.evaluate(() => { window.STUNTS_LENK('AUTO'); return window.STUNTS_LENK(); });
    assert.strictEqual(rules.mode, 'AUTO', 'LENKHILFE starts on AUTO');

    // career chapter 1 (the Ringe, Tünnes = LEICHT): LENKHILFE is on
    await page.evaluate(() => { window.STUNTS_SIMSTEPS = 4; window.STUNTS_CAREER(); });
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000), 'career chapter 1 must start a race');
    await page.evaluate(() => { window.STUNTS_SIMSTEPS = 0; window.STUNTS_MANUAL_STEP = true; });
    assert.strictEqual(await page.evaluate(() => window.STUNTS_DEBUG().player.assist), true, 'LEICHT on AUTO: LENKHILFE on');
    assert.strictEqual(await page.evaluate(() => (window.STUNTS_LENK('AUS'), window.STUNTS_DEBUG().player.assist)), false, 'LENKHILFE: AUS switches it off');

    // 2) the feel test without LENKHILFE: a 100 ms ← tap at 100 km/h on a straight
    const feel = await page.evaluate(() => {
      const L = window.STUNTS_DEBUG().trackLen; let s0 = -1;
      for (let s = 40; s < L - 300 && s0 < 0; s += 5) { let k = 0; while (k < 120 && window.STUNTS_FRAME(s + k).kind === 'straight') k += 2; if (k >= 120) s0 = s; }
      window.STUNTS_TELEPORT(s0, 100 / 3.6, 0); let prev = 0; const v = [];
      for (let i = 0; i < 90; i++) { const d = window.STUNTS_DRIVE_STEPS(1, { gas: 0.4, brake: 0, steer: i < 6 ? -1 : 0, turbo: 0 }); v.push((d.player.lat - prev) * 60); prev = d.player.lat; }
      // the verge: the same tap with the car on the shoulder turns it less
      window.STUNTS_TELEPORT(s0, 100 / 3.6, 0); window.STUNTS_DRIVE_STEPS(6, { gas: 0.4, brake: 0, steer: -1, turbo: 0 }); const road = window.STUNTS_DEBUG().player.yaw;
      window.STUNTS_TELEPORT(s0, 100 / 3.6, 8.5); window.STUNTS_DRIVE_STEPS(6, { gas: 0.4, brake: 0, steer: -1, turbo: 0 }); const verge = window.STUNTS_DEBUG().player.yaw;
      return { s0, v, road, verge };
    });
    assert(feel.s0 > 0, 'the Ringe have a 120 m straight');
    const v = feel.v.map(Math.abs), peak = Math.max(...v), at = v.indexOf(peak);
    assert(peak > 1, `the tap moves the car sideways (${peak.toFixed(2)} m/s)`);
    assert(at >= 6, 'the slide grows while the key is held and a little after');
    assert(v[6] > 0.5 * peak, 'one frame after the release the car still slides (no stop dead)');
    const late = v[at + 18]; // 0.3 s after the peak
    assert(late > 0.15 * peak, `0.3 s after the peak the slide is still there (${late.toFixed(2)} of ${peak.toFixed(2)} m/s)`);
    assert(v[89] < 0.25 * peak, 'and it dies away: the car straightens out');
    let fall = 0; while (at + fall < 89 && v[at + fall] > 0.1 * peak) fall++;
    assert(fall / 60 >= 0.3, `the slide decays over ${(fall / 60).toFixed(2)} s (≥ 0.3 s)`);
    lines.push(`100 ms tap at 100 km/h: ${peak.toFixed(2)} m/s sideways at most, still ${late.toFixed(2)} m/s 0.3 s later, under 10 % after ${(fall / 60).toFixed(2)} s`);
    assert(Math.abs(feel.verge) < Math.abs(feel.road) * 0.7, `the verge carries less yaw than the road (${feel.verge.toFixed(3)} vs ${feel.road.toFixed(3)} rad)`);

    // 3) holding ← in the air: at most 0.3 m
    const air = await page.evaluate(() => {
      const st = window.STUNTS_STUNTS().list.find((t) => t.kind === 'jump'); if (!st) return null;
      window.STUNTS_TELEPORT(st.s - 30, (st.min + Math.min(st.max, 60)) / 2, 0); let lat0 = null, d;
      for (let i = 0; i < 900; i++) { d = window.STUNTS_DRIVE_STEPS(1, { gas: 0.2, brake: 0, steer: lat0 == null ? 0 : -1, turbo: 0 }); if (d.player.air && lat0 == null) lat0 = d.player.lat; if (lat0 != null && !d.player.air || d.player.crashed > 0) break; }
      return { moved: d.player.lat - lat0, crashed: d.player.crashed > 0, flight: d.player.jumps.slice(-1)[0] };
    });
    assert(air, 'the Ringe have a jump');
    assert(!air.crashed, 'the jump at its middle speed lands');
    assert(Math.abs(air.moved) <= 0.3, `holding ← in the air moves the car ≤ 0.3 m (${air.moved.toFixed(3)} m)`);
    lines.push(`holding ← over the jump: ${Math.abs(air.moved).toFixed(3)} m sideways`);

    // 4) LENKHILFE on: the autopilot with a shaky hand drives the whole chapter (three laps), at most two crashes off the road
    const run = await page.evaluate(() => {
      window.STUNTS_LENK('AUTO'); window.STUNTS_TELEPORT(6, 0, 0);
      let seed = 4711; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      let noise = 0, off = 0, other = [], was = false, d = window.STUNTS_DEBUG();
      for (let i = 0; i < 60 * 400 && !d.player.finished; i++) {
        if (i % 15 === 0) noise = (rnd() - 0.5) * 1.2; // a new wobble every quarter second, up to ±0.6 of full lock
        const c = window.STUNTS_AI_CTL(); c.steer = Math.max(-1, Math.min(1, c.steer + noise));
        d = window.STUNTS_DRIVE_STEPS(1, c);
        const cr = d.player.crashed > 0; if (cr && !was) { if (d.player.lastCrash === 'off') off++; else other.push(d.player.lastCrash); } was = cr;
      }
      return { off, other, finished: d.player.finished, laps: d.player.laps, assist: d.player.assist };
    });
    assert(run.assist, 'LENKHILFE is on for the run');
    assert(run.finished, `the autopilot finishes the chapter (${run.laps.length} laps)`);
    assert(run.off <= 2, `at most two crashes off the road (${run.off})`);
    lines.push(`career chapter 1, autopilot ± 0.6 noise, LENKHILFE: ${run.laps.map((t) => t.toFixed(1)).join(' / ')} s, ${run.off} off-road crashes${run.other.length ? ', other: ' + run.other.join(' ') : ''}`);

    // 5) ZEITFAHREN never has LENKHILFE, not even on AN
    await page.evaluate(() => { window.STUNTS_MANUAL_STEP = false; window.STUNTS_FINISH(); });
    assert(await waitFor(page, () => !document.getElementById('results').hidden, 30000), 'results');
    await page.evaluate(() => { window.STUNTS_LENK('AN'); window.STUNTS_MODE('ZEITFAHREN', 1); document.getElementById('menuBtn').click(); });
    await waitFor(page, () => window.STUNTS_DEBUG().phase === 'menu', 10000);
    await page.evaluate(() => { window.STUNTS_SIMSTEPS = 4; document.getElementById('startBtn').click(); });
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000), 'a ZEITFAHREN starts');
    assert.strictEqual(await page.evaluate(() => window.STUNTS_DEBUG().player.assist), false, 'ZEITFAHREN: LENKHILFE off even on AN');
    await page.evaluate(() => { window.STUNTS_LENK('AUTO'); window.STUNTS_MODE('RENNEN', 3); });
    lines.push('LENKHILFE: on for LEICHT on AUTO, off on AUS, off in ZEITFAHREN even on AN');
    assert.deepStrictEqual(errors, [], 'no script errors');
    return { name: 'handling', ok: true, lines };
  } catch (error) {
    return { name: 'handling', ok: false, lines: lines.concat(errors, [String(error && error.stack || error)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
