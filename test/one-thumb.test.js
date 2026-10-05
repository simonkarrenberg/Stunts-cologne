// B24: EIN-DAUMEN on a phone (667×375, touch through CDP). The menu has DAUMEN: EINS / ZWEI (touch only) and dä Lange
// says his line; in EINS the gas is always on (no touch: the car passes 80 km/h), the left 45 % of the screen is a
// steering strip (a thumb down at x = 100 sliding to x = 160 steers more than half right), ◀ ▶ ▲ are gone, LENKHILFE is
// on, a tap on N fires the nitro, and a whole race is finished with nothing but the strip and ■.
const assert = require('assert');
const { serve, launch, waitFor } = require('./helpers');

const PHONE = { viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' };

module.exports = async function () {
  const lines = [], errors = [], server = serve(0); let browser;
  try {
    await new Promise((r) => server.listening ? r() : server.on('listening', r));
    browser = await launch();
    // the desktop has no DAUMEN button
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' }); const page = await ctx.newPage();
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; });
      await page.goto(`http://localhost:${server.address().port}/`); await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function');
      assert(await page.evaluate(() => document.getElementById('thumbBtn').hidden), 'DAUMEN is a touch-only setting');
      assert(/LENKHILFE: AUTO/.test(await page.textContent('#lenkBtn')), 'LENKHILFE starts on AUTO');
      await ctx.close(); }

    const ctx = await browser.newContext(PHONE);
    await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; window.STUNTS_ONBOARD = false; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); localStorage.setItem('stuntskoelle.controlsSeen', '9'); });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10);

    // 1) the menu toggle: ZWEI → EINS, with dä Lange's line; LENKHILFE follows
    assert(!(await page.evaluate(() => document.getElementById('thumbBtn').hidden)), 'DAUMEN is offered on touch');
    assert(/DAUMEN: ZWEI/.test(await page.textContent('#thumbBtn')), 'two thumbs by default');
    await page.evaluate(() => { document.body.classList.add('menuMore'); document.getElementById('thumbBtn').click(); });
    assert(/DAUMEN: EINS/.test(await page.textContent('#thumbBtn')), 'one tap: DAUMEN: EINS');
    assert(await waitFor(page, () => /Ein Daume reicht\. Dä andere hält dä Kaffe\./.test(document.getElementById('msgText').textContent), 3000), 'dä Lange: Ein Daume reicht. Dä andere hält dä Kaffe.');
    assert(/LENKHILFE: AN/.test(await page.textContent('#lenkBtn')), 'with one thumb the LENKHILFE is on');
    lines.push('menu: DAUMEN: ZWEI → EINS, dä Lange says his line, LENKHILFE: AN (EIN DAUME)');

    // 2) a one-lap race on the Ringe: the controls on screen
    await page.evaluate(() => { window.STUNTS_MODE('RENNEN', 1, true); const order = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id); document.querySelectorAll('.trackRow')[order.indexOf('kalk')].click(); window.STUNTS_SIMSTEPS = 4; document.getElementById('startBtn').click(); });
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 180000), 'the race starts');
    await page.evaluate(() => { window.STUNTS_SIMSTEPS = 0; window.STUNTS_MANUAL_STEP = true; });
    const ui = await page.evaluate(() => { const vis = (id) => { const e = document.getElementById(id); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }; const st = document.getElementById('tStrip').getBoundingClientRect();
      return { left: vis('tLeft'), right: vis('tRight'), gas: vis('tGas'), brake: vis('tBrake'), nitro: vis('tNitro'), strip: vis('tStrip'), w: st.width / innerWidth, assist: window.STUNTS_DEBUG().player.assist }; });
    assert(ui.strip && Math.abs(ui.w - 0.45) < 0.01, `the steering strip covers the left 45 % (${(ui.w * 100).toFixed(1)} %)`);
    assert(!ui.left && !ui.right && !ui.gas, '◀ ▶ ▲ are not needed with one thumb');
    assert(ui.brake && ui.nitro, '■ and N stay');
    assert(ui.assist, 'LENKHILFE is on in EINS mode');
    await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'one-thumb.png') });
    await page.evaluate(() => { window.STUNTS_NORENDER = true; }); // the rest is driving: no need to draw

    // 3) no touch: the gas is on by itself
    const go = await page.evaluate(() => window.STUNTS_DRIVE_STEPS(300).player.v * 3.6);
    assert(go > 80, `with no touch the car passes 80 km/h (${go.toFixed(0)})`);
    lines.push(`no touch for 5 s: ${go.toFixed(0)} km/h`);

    // 4) a thumb down at x = 100, sliding to x = 160: more than half right; lifted: straight
    const cdp = await ctx.newCDPSession(page), y = 250;
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await touch('touchStart', [{ x: 100, y, id: 1 }]);
    const s0 = await page.evaluate(() => window.STUNTS_THUMB().steer);
    for (const x of [120, 140, 160]) await touch('touchMove', [{ x, y, id: 1 }]);
    const s1 = await page.evaluate(() => ({ strip: window.STUNTS_THUMB().steer, input: window.STUNTS_DEBUG().input.steer }));
    await touch('touchEnd', []);
    const s2 = await page.evaluate(() => window.STUNTS_THUMB().steer);
    assert(Math.abs(s0) < 1e-9, 'where the thumb comes down is straight ahead');
    assert(s1.strip > 0.5 && s1.input > 0.5, `x 100 → 160 steers right by more than half (${s1.strip.toFixed(2)})`);
    assert.strictEqual(s2, 0, 'thumb lifted: straight');
    lines.push(`strip: down at x 100 = 0, slid to x 160 = ${s1.strip.toFixed(2)}, lifted = 0`);

    // 5) a tap on N fires the nitro
    const nb = await page.evaluate(() => { const r = document.getElementById('tNitro').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.evaluate(() => { window.STUNTS_DRIVE_STEPS(1); });
    const t0 = await page.evaluate(() => window.STUNTS_DEBUG().player.turbo);
    await touch('touchStart', [{ x: nb.x, y: nb.y, id: 2 }]); await touch('touchEnd', []);
    const nit = await page.evaluate(() => { const a = window.STUNTS_DEBUG().input.turbo; const d = window.STUNTS_DRIVE_STEPS(30); return { a, turbo: d.player.turbo, after: window.STUNTS_DRIVE_STEPS(90).input.turbo }; });
    assert(nit.a === 1 && nit.turbo < t0, 'a tap on N fires the nitro');
    assert.strictEqual(nit.after, 0, 'the nitro tap runs out by itself');

    // 6) the race, finished with the strip and ■ only: a thumb that steers back to the middle of the road and ■ on ZE SCHNELL!
    const bb = await page.evaluate(() => { const r = document.getElementById('tBrake').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const sx = 140, scale = await page.evaluate(() => Math.min(110, Math.max(50, innerWidth * 0.11)));
    await page.evaluate(() => window.STUNTS_TELEPORT(6, 0, 0));
    let down = false, braking = false, state, crashes = 0, was = false, t = 0;
    for (; t < (process.env.THUMB_DEBUG ? 150 : 2400); t++) { // 0.1 s per control step: 4 min of race at most
      state = await page.evaluate(() => { const d = window.STUNTS_DEBUG(); return { lat: d.player.lat, yaw: d.player.yaw, v: d.player.v, crashed: d.player.crashed > 0, air: d.player.air, finished: d.player.finished, lap: d.player.lap, s: d.player.s, warn: document.getElementById('speedWarn').textContent }; });
      if (state.finished) break;
      if (state.crashed && !was) crashes++; was = state.crashed;
      const want = Math.max(-1, Math.min(1, -state.lat * 0.12 - state.yaw * 3));
      const brake = state.warn === 'ZE SCHNELL!' || state.v > 42 && !state.air;
      const pts = [{ x: sx + want * scale, y, id: 1 }].concat(brake ? [{ x: bb.x, y: bb.y, id: 3 }] : []);
      if (braking && !brake) { await touch('touchEnd', []); down = false; } // ■ let go: CDP lifts all fingers, the thumb comes down again on the strip
      if (!down) { await touch('touchStart', [{ x: sx, y, id: 1 }]); down = true; }
      await touch('touchMove', pts); // a new finger on ■ is pressed, the thumb slides
      braking = brake;
      if (process.env.THUMB_DEBUG && t % 10 === 0) console.log(JSON.stringify(state), JSON.stringify(await page.evaluate(() => window.STUNTS_DEBUG().input)), JSON.stringify(pts));
      await page.evaluate(() => window.STUNTS_DRIVE_STEPS(6));
    }
    await touch('touchEnd', []);
    assert(state.finished, `the race is finished with the strip and ■ alone (lap ${state.lap}, ${state.s.toFixed(0)} m after ${(t / 10).toFixed(0)} s)`);
    await page.evaluate(() => { window.STUNTS_MANUAL_STEP = false; });
    assert(await waitFor(page, () => !document.getElementById('results').hidden, 30000), 'the results come up');
    lines.push(`one lap of the Ringe with the strip and ■ only: ${(t / 10).toFixed(0)} s, ${crashes} crashes`);
    assert.deepStrictEqual(errors, [], 'no script errors');
    await ctx.close();
    return { name: 'one-thumb', ok: true, lines };
  } catch (e) {
    return { name: 'one-thumb', ok: false, lines: lines.concat(errors, [String(e && e.stack || e)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
