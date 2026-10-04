// What the driver reads: the Botengang board faces the car coming up the road (not mirrored), the Kripo row
// tells the truth once the Kripo lost you, and the fork after the Poller loop shows up the moment you leave the loop.
// Private test hooks are instrumented into the served copy only (as in cop-routes).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

const hook = `
  window.STUNTS_SIGNS_TEST = (what) => {
    if (what === 'sign') { const r = mission && (mission.stage === 'drive2' ? mission.ring2 : mission.ring), d = new THREE.Vector3(); camera.getWorldDirection(d); return { dot: d.x * Math.sin(r.rotation.y) + d.z * Math.cos(r.rotation.y), pick: mission.pickName, drop: mission.dropName }; }
    if (what === 'lost') { kripo.lostT = 9; return true; }
    const S = track.samples; return S[Math.floor(((player.s % track.length) + track.length) % track.length / track.ds) % S.length].kind;
  };
`;

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, serviceWorkers: 'block' });
    await context.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    const source = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), marker = 'window.STUNTS_FIELD =';
    assert.strictEqual(source.split(marker).length, 2, 'private test hook must have exactly one insertion point');
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/js/game.js', (route) => route.fulfill({ contentType: 'text/javascript', body: source.replace(marker, hook + marker) }));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_SIGNS_TEST === 'function', undefined, { timeout: 120000 });
    const order = await page.evaluate(() => window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id));

    // 1) Poller: out of the harbour loop at full speed, the three-way fork is on screen on the very first frame
    await page.evaluate((i) => { window.STUNTS_SIMSTEPS = 4; document.querySelectorAll('.trackRow')[i].click(); document.getElementById('startBtn').click(); }, order.indexOf('poller'));
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000), 'Poller race must start');
    const fork = await page.evaluate(() => Math.min(...window.STUNTS_ROUTES().filter((r) => r.id === 'poller-schuette').map((r) => r.startS)));
    await page.evaluate((s) => { window.STUNTS_SIMSTEPS = 0; window.STUNTS_MANUAL_STEP = true; window.STUNTS_AUTOPILOT = true; window.STUNTS_TELEPORT(s - 150, 42, 0); }, fork);
    let inLoop = false, first = null;
    for (let k = 0; k < 900 && !first; k++) {
      const r = await page.evaluate(() => { const st = window.STUNTS_DRIVE_STEPS(1), h = document.getElementById('hudShortcut'); return { s: st.player.s, kind: window.STUNTS_SIGNS_TEST('kind'), hidden: h.hidden, text: h.textContent, low: h.classList.contains('low') }; });
      if (r.kind === 'loop') inLoop = true; else if (inLoop) first = r;
    }
    await page.evaluate(() => { window.STUNTS_AUTOPILOT = false; window.STUNTS_MANUAL_STEP = false; });
    assert(first, 'the autopilot must drive through the harbour loop');
    assert(!first.hidden && /SIEGBURGER/.test(first.text), `first frame after the loop shows the fork: ${first.hidden ? 'hidden' : first.text}`);
    assert(first.low, 'the post-loop banner sits lower');
    lines.push(`Poller, ${Math.round(fork - first.s)} m before the fork: "${first.text}"`);

    // 2) Botengang on the Rheinauhafen: harbour places, the board readable from the approaching car
    await page.evaluate((i) => { window.STUNTS_SIMSTEPS = 4; window.STUNTS_MISSION(i); }, order.indexOf('rheinauhafen'));
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000), 'mission must start');
    await page.evaluate(() => { window.STUNTS_SIMSTEPS = 0; window.STUNTS_MANUAL_STEP = true; const m = window.STUNTS_MISSION_STATE(); window.STUNTS_TELEPORT(m.pickS - 16, 0, 0); window.STUNTS_DRIVE_STEPS(2, { gas: 0, brake: 1, steer: 0, turbo: 0 }); });
    await page.waitForTimeout(2000); // the chase camera settles behind the car
    const sign = await page.evaluate(() => window.STUNTS_SIGNS_TEST('sign'));
    const harbour = await page.evaluate(() => window.GameData.TRACKS.find((t) => t.id === 'rheinauhafen').mission.where);
    assert(harbour.includes(sign.pick) && harbour.includes(sign.drop), `Rheinauhafen jobs go to harbour places, not ${sign.pick} / ${sign.drop}`);
    assert(sign.dot < 0, `the pickup board must face the camera (view · normal = ${sign.dot.toFixed(2)})`);
    lines.push(`pickup board ${sign.pick}: view · normal ${sign.dot.toFixed(2)}`);

    // 3) get out, fetch, get back in: the Kripo row shows the real gap, then ABJEHÄNGT once it lost you
    await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_TELEPORT(m.pickS - 2, 0, 0); window.STUNTS_MANUAL_STEP = false; });
    assert(await waitFor(page, () => !document.getElementById('hudPrompt').hidden, 15000), 'get-out prompt');
    await page.evaluate(() => window.STUNTS_ACT()); await page.waitForTimeout(400);
    await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_WALK(m.door[0] - 1, m.door[1]); }); await page.waitForTimeout(600);
    await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_WALK(m.car[0] + 1, m.car[2]); });
    assert(await waitFor(page, () => !document.getElementById('hudPrompt').hidden, 15000), 'get-in prompt');
    await page.evaluate(() => window.STUNTS_ACT()); await page.waitForTimeout(600);
    const chase = await page.evaluate(() => document.getElementById('hudKripo').textContent);
    assert(/^HINTER DIR \(\d+ M\)$/.test(chase), `Kripo row shows the gap behind you: "${chase}"`);
    await page.evaluate(() => { window.STUNTS_MANUAL_STEP = true; const m = window.STUNTS_MISSION_STATE(); window.STUNTS_TELEPORT(m.dropS - 16, 0, 0); window.STUNTS_SIGNS_TEST('lost'); window.STUNTS_DRIVE_STEPS(2, { gas: 0, brake: 1, steer: 0, turbo: 0 }); });
    const lost = await page.evaluate(() => document.getElementById('hudKripo').textContent);
    assert(!/HINTER DIR/.test(lost) && lost === 'ABJEHÄNGT', `once the Kripo lost you the row says so: "${lost}"`);
    await page.waitForTimeout(2000);
    const drop = await page.evaluate(() => window.STUNTS_SIGNS_TEST('sign'));
    assert(drop.dot < 0, `the drop-off board must face the camera (view · normal = ${drop.dot.toFixed(2)})`);
    lines.push(`Kripo row: "${chase}", then "${lost}"; drop-off board view · normal ${drop.dot.toFixed(2)}`);

    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'signs-hud', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
