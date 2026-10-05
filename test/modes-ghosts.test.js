// B21 + B28: race modes, lap counts, split times and named ghosts.
//   old saves: a record board from before the modes becomes the track's RENNEN board over its own three laps
//   RENNEN: the rubber band only for LEICHT and MITTEL (SCHWER: band 1), and KLÜNGEL: AUS switches it off
//   splits: three laps on the Poller Wiesen show #hudSplit with a signed delta at each of the four checkpoints of lap 2;
//     GEIST SPEICHERN FÖR … stores the race's best lap as PAP, the menu offers GEGEN PAP FAHRE, the ghost comes with its
//     own car, and the front page says who beat whom; a record ghost travels as a K4G1 code into another browser
//   ZEITFAHREN, RUNDEN 1 on the Poller Wiesen: one racer, no Blitzer, Kripo, Auftrag, Razzia or pedestrians for the whole
//     lap, the race ends after one lap, the record lands on a board whose key holds 'tt', and the ghost is the big one
//   STADTRUNDFAHRT, RUNDEN 1 on kalk: every story of the track told in track order, never over 60 km/h, and a postcard
const assert = require('assert');
const { serve, launch, waitFor } = require('./helpers');

module.exports = async function () {
  const server = serve(0), lines = [], errors = []; let browser;
  try {
    await new Promise((r) => server.listening ? r() : server.on('listening', r));
    const url = `http://localhost:${server.address().port}/`;
    browser = await launch();
    const open = async (init) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; window.STUNTS_NORENDER = true; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
      if (init) await ctx.addInitScript(init);
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10);
      return { ctx, page };
    };
    const pickTrack = (page, id) => page.evaluate((tid) => { const order = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id); document.querySelectorAll('.trackRow')[order.indexOf(tid)].click(); }, id);
    const start = async (page) => { await page.evaluate(() => { window.STUNTS_MANUAL_STEP = false; document.getElementById('startBtn').click(); }); assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 180000), 'the race must start'); };

    // 1) an old save: one board per track becomes the RENNEN board over three laps
    const a = await open(() => { if (!localStorage.getItem('stuntskoelle.rec.poller.race3')) { localStorage.setItem('stuntskoelle.rec.poller', JSON.stringify([{ name: 'OPA', car: 'Niehl GT', time: 600, date: 1 }])); localStorage.setItem('stuntskoelle.best.poller', '600'); } });
    const mig = await a.page.evaluate(() => ({ rec: JSON.parse(localStorage.getItem('stuntskoelle.rec.poller.race3') || '[]'), best: localStorage.getItem('stuntskoelle.best.poller.race3'), old: localStorage.getItem('stuntskoelle.rec.poller'), oldBest: localStorage.getItem('stuntskoelle.best.poller') }));
    assert(mig.rec.length === 1 && mig.rec[0].name === 'OPA' && mig.best === '600' && mig.old == null && mig.oldBest == null, 'the old poller board must move to RENNEN · 3 RUNDEN: ' + JSON.stringify(mig));
    await a.page.evaluate(() => document.getElementById('recordsBtn').click());
    const board = await a.page.evaluate(() => document.getElementById('recordsList').textContent);
    assert(/RENNEN · 3 RUNDEN/.test(board) && /OPA/.test(board), 'REKORDE shows the migrated board');
    await a.page.evaluate(() => document.getElementById('recordsClose').click());
    lines.push('old save: stuntskoelle.rec.poller → .race3 (OPA 10:00.00), shown as RENNEN · 3 RUNDEN');

    // 2) RENNEN: the rubber band only for LEICHT and MITTEL, KLÜNGEL: AUS switches it off
    const bands = async (driver, kluengel) => {
      await a.page.evaluate(({ d, k }) => { window.STUNTS_MODE(0, 3, k); const i = window.GameData.DRIVERS.filter((x) => x.diff).findIndex((x) => x.id === d); document.querySelectorAll('#driverCards .card')[i].click(); }, { d: driver, k: kluengel });
      await pickTrack(a.page, 'poller'); await start(a.page);
      await a.page.evaluate(() => { window.STUNTS_SIMSTEPS = 8; });
      await waitFor(a.page, () => window.STUNTS_DEBUG().raceTime > 12, 60000);
      const f = await a.page.evaluate(() => window.STUNTS_FIELD());
      await a.page.evaluate(() => { window.STUNTS_SIMSTEPS = 0; document.getElementById('pauseBtn').click(); document.getElementById('pauseQuit').click(); });
      return f.filter((r) => r.ai).map((r) => r.band);
    };
    const hard = await bands('heinzel', true), easy = await bands('tuennes', true), off = await bands('tuennes', false);
    assert.strictEqual(hard.length, 9, 'RENNEN races a field of ten');
    assert(hard.every((b) => b === 1), 'SCHWER: the band in aiControl is 1 for every rival: ' + hard);
    assert(easy.some((b) => b < 0.99), 'LEICHT: the leading rivals wait for you: ' + easy.map((b) => b.toFixed(2)));
    assert(off.every((b) => b === 1), 'KLÜNGEL: AUS: no rubber band, not even on LEICHT: ' + off);
    lines.push(`RENNEN bands: SCHWER all 1, LEICHT down to ${Math.min(...easy).toFixed(2)}, LEICHT with KLÜNGEL: AUS all 1`);

    // 3) splits over three laps on the Poller Wiesen (the player alone on the road, driven by the autopilot)
    await a.page.evaluate(() => { window.STUNTS_MODE(0, 3, true); localStorage.removeItem('stuntskoelle.initials'); });
    await pickTrack(a.page, 'poller'); await start(a.page);
    const drive = await a.page.evaluate(() => {
      window.STUNTS_MANUAL_STEP = true; window.STUNTS_AUTOPILOT = true; const shown = [];
      for (let i = 0; i < 60 * 600 && !window.STUNTS_DEBUG().player.finished; i++) { const n = window.STUNTS_SPLITS().log.length; window.STUNTS_DRIVE_STEPS(1); const s = window.STUNTS_SPLITS(); if (s.log.length > n) shown.push({ ...s.log[s.log.length - 1], hud: document.getElementById('hudSplit').textContent }); }
      return { shown, d: window.STUNTS_DEBUG() };
    });
    assert(drive.d.player.finished, 'the autopilot must finish three laps');
    const lap2 = drive.shown.filter((x) => x.lap === 2);
    assert.deepStrictEqual(lap2.map((x) => x.cp), [1, 2, 3, 4], 'lap 2 passes the four checkpoints: ' + JSON.stringify(drive.shown));
    for (const x of lap2) { assert(typeof x.d === 'number', `lap 2, checkpoint ${x.cp}: a delta`); assert(/^[1-4]\/4 [+−]\d+\.\d\d$/.test(x.hud), `#hudSplit shows a signed delta at checkpoint ${x.cp}: "${x.hud}"`); }
    lines.push(`splits lap 2: ${lap2.map((x) => x.hud).join(' · ')}`);
    await a.page.evaluate(() => { window.STUNTS_MANUAL_STEP = false; });
    assert(await waitFor(a.page, () => !document.getElementById('results').hidden, 30000), 'the results come');
    // GEIST SPEICHERN FÖR … PAP
    const car0 = await a.page.evaluate(() => window.STUNTS_REC(0).cars[0]);
    assert(await a.page.locator('#ghostSaveBtn').isVisible(), 'GEIST SPEICHERN FÖR … is offered');
    await a.page.evaluate(() => { if (!document.getElementById('nameEntry').hidden) document.getElementById('neOk').click(); }); // the top-five name first, as a player would
    await a.page.locator('#ghostSaveBtn').click();
    assert(await a.page.locator('#nameEntry').isVisible(), 'the three letters are asked for');
    for (const k of ['KeyP', 'KeyA', 'KeyP']) await a.page.keyboard.press(k);
    await a.page.keyboard.press('Enter');
    const named = await a.page.evaluate(() => JSON.parse(localStorage.getItem('stuntskoelle.ghosts.poller') || '{}'));
    const packed = await a.page.evaluate(() => (localStorage.getItem('stuntskoelle.ghosts.poller') || '').length);
    assert(named.PAP && named.PAP.car === car0 && named.PAP.s.length > 100 && packed < 20000, `the ghost is stored packed as PAP with its car (${packed} chars): ` + Object.keys(named));
    lines.push(`named ghost PAP: ${named.PAP.time.toFixed(2)} s lap in ${named.PAP.car}`);
    // the menu offers GEGEN PAP FAHRE; another car, and the ghost still drives its own
    await a.page.evaluate(() => document.getElementById('menuBtn').click());
    await a.page.evaluate(() => document.querySelectorAll('#carCards .card')[2].click());
    let label = ''; for (let k = 0; k < 5 && !/GEGEN PAP FAHRE/.test(label); k++) { label = await a.page.evaluate(() => document.getElementById('ghostBtn').textContent); if (!/GEGEN PAP FAHRE/.test(label)) await a.page.evaluate(() => document.getElementById('ghostBtn').click()); }
    assert(/GEGEN PAP FAHRE/.test(label), 'the start bar offers GEGEN PAP FAHRE: ' + label);
    await a.page.evaluate(() => localStorage.setItem('stuntskoelle.initials', 'PÄN')); // the child drives now
    await pickTrack(a.page, 'poller'); await start(a.page);
    const g = await a.page.evaluate(() => ({ g: window.STUNTS_GHOST(0), me: window.STUNTS_REC(0) && window.STUNTS_REC(0).cars[0], intro: document.getElementById('introSub').textContent, splits: window.STUNTS_SPLITS() }));
    assert(g.g && g.g.name === 'PAP' && g.g.car === car0, 'the ghost PAP comes with its stored car: ' + JSON.stringify(g.g));
    assert(/GEGEN PAP/.test(g.intro), 'the intro says GEGEN PAP: ' + g.intro);
    assert(g.splits.ghost && g.splits.ghost.sp.every((t) => t > 0), 'the ghost has four checkpoint times');
    await a.page.evaluate(() => { window.STUNTS_MANUAL_STEP = true; window.STUNTS_DRIVE_STEPS(30); });
    await a.page.keyboard.press('KeyG'); await a.page.evaluate(() => window.STUNTS_DRIVE_STEPS(2));
    assert.strictEqual((await a.page.evaluate(() => window.STUNTS_GHOST())).visible, false, 'G hides the ghost');
    await a.page.keyboard.press('KeyG');
    const pg = await a.page.evaluate(() => { document.getElementById('pauseBtn').click(); const b = document.getElementById('pauseGhost'), vis = !b.hidden, on = b.textContent; b.click(); const off = b.textContent, hid = !window.STUNTS_GHOST().visible; b.click(); document.getElementById('pauseGo').click(); return { vis, on, off, hid }; });
    assert(pg.vis && /GEIST: AN/.test(pg.on) && /GEIST: AUS/.test(pg.off) && pg.hid, 'the pause has a GEIST switch for the phone: ' + JSON.stringify(pg));
    await a.page.evaluate(() => { for (let i = 0; i < 400 && !window.STUNTS_DEBUG().player.finished; i++) window.STUNTS_DRIVE_STEPS(60); window.STUNTS_MANUAL_STEP = false; });
    assert(await waitFor(a.page, () => !document.getElementById('results').hidden, 30000), 'the race against PAP ends');
    const head = await a.page.evaluate(() => document.getElementById('resExpress').textContent);
    assert(/SCHLÄ[TS] .* ÖM \d+,\d SEKUNDE/.test(head) && /PAP/.test(head), 'the front page says who beat whom: ' + head);
    lines.push(`against PAP (${g.g.car}, player in another car): "${head}"`);
    // a record ghost as a code, into a fresh browser
    const code = await a.page.evaluate(() => window.STUNTS_EXPORT_GHOST('poller'));
    assert(/^K4G1\./.test(code) && code.length < 40000, 'a record ghost exports as a short K4G1 code: ' + (code || '').length);

    // 4) ZEITFAHREN, one lap, on the Poller Wiesen (in this browser PAP is the picked ghost)
    await a.page.evaluate(() => { document.getElementById('menuBtn').click(); window.STUNTS_MODE('ZEITFAHREN', 1); window.STUNTS_AUFTRAG = true; });
    await pickTrack(a.page, 'poller'); await start(a.page);
    await a.page.evaluate(() => { window.STUNTS_AUTOPILOT = true; window.STUNTS_SIMSTEPS = 8; });
    const big = await a.page.evaluate(() => window.STUNTS_GHOST());
    assert(big && big.opacity >= 0.55, 'ZEITFAHREN: the big ghost: ' + JSON.stringify(big && big.opacity));
    let seen = 0, worst = null;
    for (const t0 = Date.now(); Date.now() - t0 < 240000;) {
      const m = await a.page.evaluate(() => ({ ...window.STUNTS_MODE(), phase: window.STUNTS_DEBUG().phase }));
      if (m.racers !== 1 || m.blitzers || m.signals || m.kripo || m.kripoSeen || m.auftrag || m.razzia || m.walkersShown) worst = m;
      seen++; if (m.phase !== 'race') break; await a.page.waitForTimeout(200);
    }
    assert(!worst, 'ZEITFAHREN: one racer, no Blitzer, Kripo, Auftrag, Razzia or pedestrians: ' + JSON.stringify(worst));
    assert(await waitFor(a.page, () => !document.getElementById('results').hidden, 30000), 'ZEITFAHREN ends');
    const tt = await a.page.evaluate(() => ({ laps: window.STUNTS_DEBUG().player.laps.length, keys: Object.keys(localStorage).filter((k) => /^stuntskoelle\.rec\.poller\./.test(k)), rec: JSON.parse(localStorage.getItem('stuntskoelle.rec.poller.tt1') || '[]'), title: document.getElementById('resTitle').textContent, table: document.getElementById('resTable').textContent }));
    assert.strictEqual(tt.laps, 1, 'RUNDEN 1 ends the race after one lap');
    assert(tt.keys.some((k) => /tt/.test(k.split('.').pop())) && tt.rec.length === 1 && typeof tt.rec[0].side === 'boolean', 'the record is stored under a key with tt: ' + tt.keys);
    assert(/^ZEITFAHREN: /.test(tt.title) && /(MIT|OHNE) NEBENSTROSSE/.test(tt.table), 'the results show the ZEITFAHREN board: ' + tt.title);
    lines.push(`ZEITFAHREN poller, 1 lap: ${seen} checks, ${tt.title}; boards ${tt.keys.join(', ')}`);
    await a.ctx.close();

    const b = await open();
    const imp = await b.page.evaluate((c) => { const msg = window.STUNTS_IMPORT(c); return { msg, g: window.STUNTS_GHOSTS('poller') }; }, code);
    assert(imp.g.named.includes('PÄN') && imp.g.pick === 'PÄN', 'the code brings the record ghost, named after its driver (PÄN beat PAP): ' + JSON.stringify(imp));
    lines.push(`ghost code ${code.length} chars → "${imp.msg}"`);
    // a broken or hostile code is refused with a message, and a name that is no name never reads as GEIST: AUS
    const bad = await b.page.evaluate((c) => { const j = JSON.parse(decodeURIComponent(escape(atob(c.slice(5))))), enc = (o) => 'K4G1.' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
      const out = [window.STUNTS_IMPORT('K4G1.%%%'), window.STUNTS_IMPORT(enc(Object.assign({}, j, { l: null }))), window.STUNTS_IMPORT(enc(Object.assign({}, j, { name: '-' })))];
      return { out, g: window.STUNTS_GHOSTS('poller') }; }, code);
    assert(bad.out.every((m) => typeof m === 'string') && !bad.g.named.includes('-') && bad.g.named.includes('DU'), 'broken ghost codes give a message; "-" becomes DU: ' + JSON.stringify(bad));

    // 5) STADTRUNDFAHRT, one lap, on kalk
    await b.page.evaluate(() => { window.STUNTS_MODE('STADTRUNDFAHRT', 1); window.STUNTS_AUTOPILOT = true; });
    await pickTrack(b.page, 'kalk'); await start(b.page);
    await b.page.evaluate(() => { window.STUNTS_SIMSTEPS = 8; });
    assert(await waitFor(b.page, () => window.STUNTS_DEBUG().phase === 'finished', 400000), 'the tour ends');
    const tour = await b.page.evaluate(() => ({ d: window.STUNTS_DEBUG(), m: window.STUNTS_MODE(), log: window.STUNTS_MSGLOG(), stories: window.STUNTS_STORIES() }));
    const told = tour.log.filter((l) => l.story).map((l) => l.text).filter((t) => tour.stories.some((s) => s.text === t));
    const want = tour.stories.slice().sort((x, y) => x.s - y.s).map((s) => s.text);
    assert.strictEqual(tour.m.racers, 1, 'no rivals on the tour');
    assert.deepStrictEqual(told, want, 'every story of the track, in track order');
    assert(tour.d.player.vMax <= 16.7, `never over 60 km/h (${(tour.d.player.vMax * 3.6).toFixed(1)} km/h)`);
    assert.strictEqual(tour.d.player.laps.length, 1, 'one lap');
    assert(await waitFor(b.page, () => !document.getElementById('resPostcard').hidden && document.querySelectorAll('#resPostcard li').length >= 5, 30000), 'the postcard lists the sights');
    const pc = await b.page.evaluate(() => [...document.querySelectorAll('#resPostcard li')].map((li) => li.textContent));
    lines.push(`STADTRUNDFAHRT kalk: ${told.length}/${want.length} stories in order, top speed ${(tour.d.player.vMax * 3.6).toFixed(1)} km/h, lap ${tour.d.player.laps[0].toFixed(1)} s, postcard: ${pc.slice(0, 4).join(', ')} …`);
    await b.ctx.close();
    assert.deepStrictEqual(errors, [], 'no page errors');
    return { name: 'modes-ghosts', ok: true, lines };
  } catch (e) {
    return { name: 'modes-ghosts', ok: false, lines: lines.concat(errors, [String(e && e.stack || e)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
