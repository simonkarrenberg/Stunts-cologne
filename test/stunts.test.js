// B23: stunts that test the entry speed. Every jump ends in a landing ramp raised out of the last metres of its gap (the
// layout of the city and its side streets stays exactly where it was) and a marked landing zone; the engine pushes only
// as hard as the road presses the wheels down (no thrust up a loop's wall, none on a ramp); a loop throws you off below
// sqrt(g·R)·1.2 at its top. On the Poller Wiesen loop 55 km/h falls ('loop'), 130 km/h goes round; on the Schäl Sick jump
// 70 km/h (short) and a forced 200 km/h (past the zone) crash or cost ≥ 0.3 damage while 120 km/h lands clean; the
// speedometer says ZE LANGSAM! 100 m before the loop at 50 km/h; the rivals take every stunt of a lap without falling.
const assert = require('assert');
const path = require('path');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    // 0) the track builder: landing ramps inside the gaps, the layout untouched
    const TB = require(path.join(__dirname, '../js/track.js')).TrackBuilder, D = require(path.join(__dirname, '../js/data.js')).GameData;
    let jumps = 0;
    for (const def of D.TRACKS) {
      const t = TB.buildTrack(def), flat = TB.buildTrack(Object.assign({}, def, { segments: def.segments.map((s) => s.t === 'jump' ? Object.assign({}, s, { land: false }) : s) }));
      assert.strictEqual(t.samples.length, flat.samples.length, def.id + ': the landing ramps add no metres');
      for (let i = 0; i < t.samples.length; i += 7) assert(Math.hypot(t.samples[i].p.x - flat.samples[i].p.x, t.samples[i].p.z - flat.samples[i].p.z) < 1e-6, def.id + ': the landing ramps move nothing on the map');
      def.segments.forEach((sg, k) => { if (sg.t !== 'jump') return; jumps++;
        const S = t.samples.filter((q) => q.seg === k), land = S.filter((q) => q.kind === 'land'), gap = S.filter((q) => q.kind === 'gap');
        assert(land.length >= 6 && gap.length > land.length, `${def.id} jump ${k}: a landing ramp at the end of the gap`);
        assert(land[0].p.y > 1 && land[land.length - 1].p.y < 0.5 && land.every((q, i) => !i || q.p.y < land[i - 1].p.y), `${def.id} jump ${k}: the landing ramp runs down to the road`);
        assert(S.indexOf(land[0]) > S.indexOf(gap[gap.length - 1]), `${def.id} jump ${k}: the ramp comes after the open gap (and after a roof)`);
      });
    }
    lines.push(`${jumps} jumps with a landing ramp in the last metres of the gap; no track moved`);

    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, serviceWorkers: 'block' });
    await context.addInitScript(() => { window.STUNTS_IDLE = 99999; window.STUNTS_NORENDER = true; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length > 0, undefined, { timeout: 120000 });
    const race = async (id) => {
      await page.evaluate((id) => { window.STUNTS_MANUAL_STEP = false; window.STUNTS_MODE('RENNEN', 3); window.STUNTS_LENK('AUS'); const order = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id); document.querySelectorAll('.trackRow')[order.indexOf(id)].click(); window.STUNTS_SIMSTEPS = 4; document.getElementById('startBtn').click(); }, id);
      assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 180000), id + ': the race starts');
      await page.evaluate(() => { window.STUNTS_SIMSTEPS = 0; window.STUNTS_MANUAL_STEP = true; });
    };
    // drive from s at v (km/h) with the gas held until the stunt is behind (len m) or the car crashed; turbo never
    const through = (s, kmh, len) => page.evaluate(({ s, kmh, len }) => {
      window.STUNTS_RACERS_RAW()[0].damage = 0; window.STUNTS_TELEPORT(s, kmh / 3.6, 0); const d0 = window.STUNTS_DEBUG().player; /* every run with a whole car */ let d = window.STUNTS_DEBUG(), went = 0, last = d0.s, minTop = 1e9;
      for (let i = 0; i < 1500; i++) { d = window.STUNTS_DRIVE_STEPS(1, { gas: 1, brake: 0, steer: 0, turbo: 0 }); let ds = d.player.s - last; if (ds < -d.trackLen / 2) ds += d.trackLen; went += ds; last = d.player.s; const f = window.STUNTS_FRAME(d.player.s); if (f.kind === 'loop' && f.N[1] < -0.9) minTop = Math.min(minTop, d.player.v);
        if (d.player.crashed > 0 || went > len && !d.player.air) break; }
      return { crashed: d.player.crashed > 0, kind: d.player.crashed > 0 ? d.player.lastCrash : '', damage: d.player.damage - d0.damage, hard: d.player.hardLandings - d0.hardLandings, minTop };
    }, { s, kmh, len });

    // 1) the Poller Wiesen loop
    await race('poller');
    const loop = await page.evaluate(() => window.STUNTS_STUNTS().list.find((t) => t.kind === 'loop'));
    const R = 14, need = Math.sqrt(9.81 * R) * 1.2;
    const slow = await through(loop.s - 1, 55, loop.len), fast = await through(loop.s - 1, 130, loop.len);
    assert(slow.crashed && slow.kind === 'loop', `55 km/h into the loop falls with kind 'loop' (${JSON.stringify(slow)})`);
    assert(!fast.crashed, `130 km/h goes round (${JSON.stringify(fast)})`);
    assert(fast.minTop >= need * 0.999, `at the top the fast car still has sqrt(g·R)·1.2 = ${(need * 3.6).toFixed(0)} km/h (${(fast.minTop * 3.6).toFixed(0)})`);
    assert(loop.min * 3.6 > 55 && loop.min * 3.6 < 130, `the loop's minimum entry speed lies between (${(loop.min * 3.6).toFixed(0)} km/h)`);
    lines.push(`Poller loop (R ${R} m): 55 km/h falls, 130 km/h goes round (${(fast.minTop * 3.6).toFixed(0)} km/h at the top, needs ${(need * 3.6).toFixed(0)}); minimum entry ${(loop.min * 3.6).toFixed(0)} km/h`);
    // no thrust up the wall: on the vertical part the gas does nothing
    const wall = await page.evaluate((ls) => { let s = ls; while (Math.abs(window.STUNTS_FRAME(s).N[1]) > 0.05) s += 0.25; const run = (gas) => { window.STUNTS_TELEPORT(s, 30, 0); return window.STUNTS_DRIVE_STEPS(1, { gas, brake: 0, steer: 0, turbo: 0 }).player.v; }; return { gas: run(1), coast: run(1e-6) }; }, loop.s); // a feather on the pedal: no rolling drag either way
    assert(Math.abs(wall.gas - wall.coast) < 0.02, `no engine thrust up the vertical wall (${wall.gas.toFixed(3)} vs ${wall.coast.toFixed(3)} m/s)`);
    // the speedometer 100 m before the loop
    const warn = await page.evaluate((ls) => { const at = (kmh) => { window.STUNTS_TELEPORT(ls - 100.4, kmh / 3.6, 0); window.STUNTS_DRIVE_STEPS(1, { gas: 0, brake: 0, steer: 0, turbo: 0 }); return document.getElementById('speedo').textContent; }; return { slow: at(50), fast: at(130) }; }, loop.s);
    assert(/ZE LANGSAM/.test(warn.slow), `#speedo shows ZE LANGSAM at 50 km/h 100 m before the loop ("${warn.slow}")`);
    assert(!/ZE LANGSAM|ZE SCHNELL/.test(warn.fast), 'at 130 km/h it does not');
    // LENKHILFE forgives 10 %
    const easy = await page.evaluate(() => { window.STUNTS_LENK('AN'); const t = window.STUNTS_STUNTS().list.find((x) => x.kind === 'loop'); window.STUNTS_LENK('AUS'); return t.min; });
    assert(easy < loop.min, `with LENKHILFE the loop asks for less (${(easy * 3.6).toFixed(0)} < ${(loop.min * 3.6).toFixed(0)} km/h)`);
    lines.push(`speedometer: "${warn.slow}" at 50 km/h, nothing at 130; LENKHILFE minimum ${(easy * 3.6).toFixed(0)} km/h`);

    // 2) the rivals take every loop and jump of a Poller lap without falling
    const field = await page.evaluate(() => {
      window.STUNTS_FIELD_SETUP(60, 20); const crashes = {}, was = {}, laps = {}; const start = window.STUNTS_FIELD();
      for (let i = 0; i < 1100; i++) { const f = window.STUNTS_FIELD_STEPS(6); for (const c of f) if (c.ai) { if (c.crashed && !was[c.name]) crashes[c.name] = (crashes[c.name] || 0) + 1; was[c.name] = c.crashed; laps[c.name] = c.lap; } if (f.filter((c) => c.ai).every((c) => c.lap > start.find((x) => x.name === c.name).lap)) break; }
      return { crashes, laps, n: start.filter((c) => c.ai).length };
    });
    const total = Object.values(field.crashes).reduce((a, b) => a + b, 0);
    assert(Object.values(field.laps).every((l) => l >= 2), `every rival finishes the lap (${JSON.stringify(field.laps)})`);
    assert(total <= 1, `the rivals drive the stunts with the same model and (almost) never fall (${JSON.stringify(field.crashes)})`);
    lines.push(`Poller lap for ${field.n} rivals: ${total} crashes`);

    // 3) the Schäl Sick jump over the Rhine
    await race('zoo');
    const jump = await page.evaluate(() => window.STUNTS_STUNTS().list.find((t) => t.kind === 'jump'));
    const j70 = await through(jump.s - 1, 70, jump.len), j120 = await through(jump.s - 1, 120, jump.len), j200 = await through(jump.s - 1, 200, jump.len);
    const bad = (r) => r.crashed || r.damage >= 0.3;
    assert(bad(j70), `70 km/h is too short: a crash or damage ≥ 0.3 (${JSON.stringify(j70)})`);
    assert(bad(j200) && (j200.crashed || j200.hard), `a forced 200 km/h flies past the landing zone: a crash or damage ≥ 0.3 (${JSON.stringify(j200)})`);
    assert(!j120.crashed && j120.damage < 0.05 && !j120.hard, `120 km/h lands clean (${JSON.stringify(j120)})`);
    const jwarn = await page.evaluate((js) => { window.STUNTS_RACERS_RAW()[0].damage = 0; window.STUNTS_TELEPORT(js - 60, 200 / 3.6, 0); window.STUNTS_DRIVE_STEPS(1, { gas: 0, brake: 0, steer: 0, turbo: 0 }); return document.getElementById('speedo').textContent; }, jump.s);
    assert(/ZE SCHNELL/.test(jwarn), `#speedo shows ZE SCHNELL at 200 km/h before the jump ("${jwarn}")`);
    lines.push(`Schäl Sick jump (clean ${(jump.min * 3.6).toFixed(0)}–${(jump.max * 3.6).toFixed(0)} km/h): 70 → ${j70.crashed ? 'crash ' + j70.kind : 'damage ' + j70.damage.toFixed(2)}, 120 → clean, 200 → ${j200.crashed ? 'crash ' + j200.kind : 'hard landing, damage ' + j200.damage.toFixed(2)}`);
    await page.evaluate(() => window.STUNTS_LENK('AUTO'));
    assert.deepStrictEqual(errors, [], 'no script errors');
    return { name: 'stunts', ok: true, lines };
  } catch (error) {
    return { name: 'stunts', ok: false, lines: lines.concat(errors, [String(error && error.stack || error)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
