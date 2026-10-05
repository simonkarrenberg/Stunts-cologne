// The verge: off the road edge a car lands on the shoulder (gravel, grass, sidewalk), slows down hard and crashes
// only past it or against a wall. Player and rivals share that code path, and a respawn never sets you back: the
// first career chapter with an autopilot that steers off the road five times only ever moves forward.
// A private test hook is instrumented into the served copy only (as in cop-routes).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

const hook = `
  window.STUNTS_VERGE_TEST = (s0, v0, n) => { // the same controls for a rival (in the player's car) and the player
    const ai = racers.find((r) => r.isAI), run = (r) => {
      Object.assign(r, { s: s0, lat: 0, v: v0, shortcut: -1, air: false, vy: 0, crashed: 0, turbo: 0, damage: 0, prevRoadVy: 0, safeS: s0, steerVis: 0, yaw: 0, steerIn: 0, airLat: 0, zoneLeft: null }); const out = [];
      for (let i = 0; i < n; i++) { updateRacer(r, SIM_DT, { gas: 0, brake: 0, steer: 1, turbo: 0 }); out.push([+r.lat.toFixed(5), +r.v.toFixed(5), r.crashed > 0]); if (r.crashed > 0) break; }
      return out;
    };
    const car = ai.car, assist = ai.assist; ai.car = player.car; ai.assist = player.assist; const a = run(ai); ai.car = car; ai.assist = assist; const p = run(player); player.crashed = 0; ai.crashed = 0; // the same car and the same LENKHILFE setting
    return { ai: a, player: p };
  };
`;

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    // 0) the source: no special treatment of the rivals at the road edge left in updateRacer
    const source = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), marker = 'window.STUNTS_FIELD =';
    const body = source.slice(source.indexOf('function updateRacer('), source.indexOf('function aiControl('));
    assert(body.length > 1000, 'updateRacer must be found');
    assert(!/isAI\s*\?\s*clamp|isAI\)\s*\{?\s*r\.lat\s*=\s*clamp/.test(body), 'no rival-only clamp at the road edge in updateRacer');
    assert.strictEqual(source.split(marker).length, 2, 'private test hook must have exactly one insertion point');

    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, serviceWorkers: 'block' });
    await context.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/js/game.js', (route) => route.fulfill({ contentType: 'text/javascript', body: source.replace(marker, hook + marker) }));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_VERGE_TEST === 'function', undefined, { timeout: 120000 });

    // 1) career chapter 1 (the Ringe): the race starts
    await page.evaluate(() => { window.STUNTS_SIMSTEPS = 4; window.STUNTS_CAREER(); });
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000), 'career chapter 1 must start a race');
    await page.evaluate(() => { window.STUNTS_SIMSTEPS = 0; window.STUNTS_MANUAL_STEP = true; });

    // 2) the feel test: holding → at 100 km/h on a straight with a full verge to the right
    const feel = await page.evaluate(() => {
      // the longest straight whose right verge stays free (no parked car, tree or house in it) from the road edge on
      const L = window.STUNTS_DEBUG().trackLen; let s0 = -1, best = 0;
      const ok = (s, k) => { const f = window.STUNTS_FRAME(s + k); return f.kind === 'straight' && (k < 25 || f.verge[1] >= 4); }; // 25 m: the road edge comes after ~27 m
      for (let s = 10; s < L - 200; s += 2) { let k = 0; while (k < 185 && ok(s, k)) k += 0.5; if (k - 25 > best) { best = k - 25; s0 = s; } }
      if (best < 40) return null;
      window.STUNTS_TELEPORT(s0, 100 / 3.6, 0); const out = [];
      for (let i = 0; i < 400; i++) { const d = window.STUNTS_DRIVE_STEPS(1, { gas: 0, brake: 0, steer: 1, turbo: 0 }), f = window.STUNTS_FRAME(d.player.s); out.push({ i: i + 1, s: d.player.s, lat: d.player.lat, v: d.player.v, verge: d.player.onVerge, crashed: d.player.crashed > 0, limit: f.edge + f.verge[1], edge: f.edge }); if (d.player.crashed > 0) break; }
      return { s0, out };
    });
    assert(feel, 'the Ringe need a straight with 40 m of free verge');
    const out = feel.out, at49 = out[48], onVerge = out.filter((o) => o.verge && !o.crashed), crash = out.find((o) => o.crashed);
    assert(at49 && !at49.crashed, 'after 49 frames of → at 100 km/h the car must not have crashed');
    assert(onVerge.length > 10, 'the car must drive on the verge before it crashes');
    for (let k = 1; k < onVerge.length; k++) assert(onVerge[k].v < onVerge[k - 1].v, 'on the verge the speed must decay');
    assert(onVerge.every((o) => Math.abs(o.lat) > o.edge && Math.abs(o.lat) <= o.limit + 1e-9), 'on the verge means between the road edge and the end of the verge');
    assert(crash, 'holding → must end past the verge');
    assert(Math.abs(crash.lat) > crash.limit, `the crash must come only past the verge (|lat| ${crash.lat.toFixed(2)} > ${crash.limit.toFixed(2)})`);
    lines.push(`feel: road edge at ${out[0].edge.toFixed(1)} m reached in step ${out.findIndex((o) => o.verge) + 1}, ${onVerge.length} steps on the verge (${(onVerge[0].v * 3.6).toFixed(0)} → ${(onVerge[onVerge.length - 1].v * 3.6).toFixed(0)} km/h), crash at |lat| ${crash.lat.toFixed(2)} > ${crash.limit.toFixed(2)} m`);

    // 3) a rival in the same car with the same controls does exactly what the player does
    const same = await page.evaluate((s0) => window.STUNTS_VERGE_TEST(s0, 100 / 3.6, 400), feel.s0);
    assert(same.player.length > 60 && same.player[same.player.length - 1][2], 'the player run must end past the verge');
    assert.deepStrictEqual(same.ai, same.player, 'rival and player must share the off-road rules step by step');
    lines.push(`rival = player: ${same.ai.length} identical steps to the crash`);

    // 4) five times off the road with the autopilot in between: progress never goes down, the R tip comes
    const L = await page.evaluate(() => { window.STUNTS_TELEPORT(40, 0, 0); window.STUNTS_AUTOPILOT = true; return window.STUNTS_DEBUG().trackLen; });
    const routes = await page.evaluate(() => window.STUNTS_ROUTES().map((r) => ({ startS: r.startS, side: r.side })));
    let lastAfter = -1, tip = false, side = 1;
    for (let k = 0; k < 5; k++) {
      const res = await page.evaluate(({ routes, side }) => {
        let d = window.STUNTS_DRIVE_STEPS(150); // the autopilot drives a bit
        for (let i = 0; i < 900 && (d.player.crashed > 0 || d.player.shortcut >= 0 || d.player.air); i++) d = window.STUNTS_DRIVE_STEPS(1); // out of a side street the autopilot took
        const ahead = routes.find((r) => r.startS > d.player.s && r.startS - d.player.s < 160); const dir = ahead ? -ahead.side : side; // away from a side street
        for (let i = 0; i < 900 && !(d.player.crashed > 0); i++) d = window.STUNTS_DRIVE_STEPS(1, { gas: 1, brake: 0, steer: dir, turbo: 0 });
        const atCrash = { s: d.player.s, lap: d.player.lap, route: d.player.shortcut, crashed: d.player.crashed > 0, kind: d.player.lastCrash };
        for (let i = 0; i < 400 && d.player.crashed > 0; i++) d = window.STUNTS_DRIVE_STEPS(1, { gas: 0, brake: 0, steer: 0, turbo: 0 });
        return { atCrash, after: { s: d.player.s, lap: d.player.lap, lat: d.player.lat, crashed: d.player.crashed > 0 }, t: d.raceTime };
      }, { routes, side });
      side = -side;
      assert(res.atCrash.crashed, `run ${k + 1}: steering off must end in a crash`);
      assert.strictEqual(res.atCrash.route, -1, `run ${k + 1}: the crash must happen on the main road`);
      assert(!res.after.crashed && res.after.lat === 0, `run ${k + 1}: the respawn puts the car back on the centre line`);
      const before = (res.atCrash.lap - 1) * L + res.atCrash.s, after = (res.after.lap - 1) * L + res.after.s;
      assert(after >= before, `run ${k + 1}: the respawn must not be behind the crash (${before.toFixed(1)} → ${after.toFixed(1)})`);
      assert(after >= lastAfter, `run ${k + 1}: progress after a respawn must never go down (${lastAfter.toFixed(1)} → ${after.toFixed(1)})`);
      lines.push(`off-road ${k + 1}: crash at ${before.toFixed(0)} m, back on the road at ${after.toFixed(0)} m (race time ${res.t.toFixed(1)} s)`);
      lastAfter = after;
      if (k >= 1 && !tip) { await page.waitForTimeout(1600); tip = await page.evaluate(() => document.getElementById('msgText').textContent.includes('R = zeröck op de Stroß')); }
    }
    assert(tip, 'after two respawns within 30 s Dä Lange tells the R key');
    assert.deepStrictEqual(errors, [], 'no script errors');
    return { name: 'verge', ok: true, lines };
  } catch (error) {
    return { name: 'verge', ok: false, lines: lines.concat(errors, [String(error && error.stack || error)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
