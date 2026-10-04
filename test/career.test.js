// B27: the career map in Session order.
// Data: twelve chapters with ids, ELFTER IM ELFTEN before the Rosenmontag chapters, the Nubbel epilogue on Karnevalsdienstag
// night (after Rosenmontag, before Aschermittwoch), careerV1 = the old order for the migration.
// Browser: an old save { chapter: 6 } keeps its chapter by id (HAFENRUNDE), KARRIERE opens a map of 12 tiles with done/open/
// current/locked states and stars, a locked tile stays shut, a finished tile starts that chapter; finished saves stay finished.
const assert = require('assert');
const path = require('path');
const { serve, launch, waitFor } = require('./helpers');

module.exports = async function () {
  const lines = [], errors = [];
  // ---- data ----
  const T = require(path.join(__dirname, '..', 'js', 'data.js')).GameData.TUENN, C = T.career, ids = C.map((c) => c.id), at = (title) => C.findIndex((c) => c.title === title);
  assert.strictEqual(C.length, 12, 'twelve chapters');
  assert.strictEqual(new Set(ids).size, 12, 'every chapter has its own id');
  assert(at('ELFTER IM ELFTEN') >= 0 && at('ELFTER IM ELFTEN') < at('KAMELLE FÖR TOM'), 'the Session starts on 11.11.: ELFTER IM ELFTEN comes before KAMELLE FÖR TOM');
  assert(at('ELFTER IM ELFTEN') < at('DAT PAKET VUM ROSENMONTAG'), 'and before the Rosenmontag parcel');
  assert.strictEqual(at('DIE TÜR STEHT OFFE'), 11, 'the door is still the finale');
  assert.deepStrictEqual(T.careerV1.slice().sort(), ids.slice().sort(), 'careerV1 (the old order) names the same twelve chapters');
  assert.strictEqual(C[ids.indexOf(T.careerV1[6])].title, 'HAFENRUNDE', 'old chapter index 6 was the HAFENRUNDE');
  const epi = C.findIndex((c) => c.epilogue);
  assert(epi >= 0 && /Dä Nubbel es schuld\. Wie jedes Johr\./.test(C[epi].epilogue) && /Karnevalsdienstag/.test(C[epi].epilogue), 'the Nubbel epilogue on Karnevalsdienstag night');
  assert(epi >= at('KAMELLE FÖR TOM') && epi < at('HAFENRUNDE'), 'the epilogue sits between Rosenmontag and Aschermittwoch');
  for (const c of C) assert(c.id && c.track && c.title && c.intro && c.outro, `chapter ${c.id} is complete`);
  lines.push(`order: ${C.map((c) => c.id).join(' → ')}`);

  // ---- browser ----
  const server = serve(0); let browser;
  try {
    await new Promise((r) => server.listening ? r() : server.on('listening', r));
    const url = `http://localhost:${server.address().port}/`;
    browser = await launch();
    const open = async (save, opts) => {
      const ctx = await browser.newContext(opts || { viewport: { width: 1280, height: 720 } });
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; window.STUNTS_SIMSTEPS = 4; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
      await ctx.addInitScript((s) => { if (s != null && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('stuntskoelle.career', s); } }, save);
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10);
      return { ctx, page };
    };
    const tiles = (page) => page.evaluate(() => [...document.querySelectorAll('#cmTiles .cmTile')].map((t) => ({ id: t.dataset.id, state: t.className.replace('cmTile', '').trim(), stars: t.querySelectorAll('.cmStars i.on').length })));

    // 1) an old save from the first release: { chapter: 6 } = six chapters done, the seventh (HAFENRUNDE) next
    const a = await open(JSON.stringify({ chapter: 6 }));
    const st = await a.page.evaluate(() => window.STUNTS_CAREER_STATE());
    assert.strictEqual(st.cur, T.careerV1[6], `old index 6 maps to the same chapter id (${st.cur})`);
    assert.deepStrictEqual(Object.keys(st.done).sort(), T.careerV1.slice(0, 6).sort(), 'the six chapters before it stay done, by id');
    assert(/"v":2/.test(await a.page.evaluate(() => localStorage.getItem('stuntskoelle.career'))), 'the migrated save is written back');
    assert(await a.page.evaluate(() => document.getElementById('careerBtn').textContent.includes('6/12')), 'the KARRIERE button counts 6/12');
    // KARRIERE opens the map, it does not start a race
    await a.page.click('#careerBtn');
    assert.strictEqual(await a.page.evaluate(() => window.STUNTS_DEBUG().phase), 'menu', 'KARRIERE opens the map, not a race');
    let tl = await tiles(a.page);
    assert.strictEqual(tl.length, 12, 'the map shows 12 tiles');
    const state = (id) => tl.find((t) => t.id === id).state;
    assert.strictEqual(state('hafen'), 'cur', 'HAFENRUNDE is the current tile');
    assert.strictEqual(state('elfter'), 'open', 'ELFTER IM ELFTEN (moved forward) is open, not done');
    assert.strictEqual(state('kamelle'), 'done', 'the Rosenmontag chapters stay done');
    assert.strictEqual(state('tuer'), 'locked', 'the door is still locked');
    assert(tl.filter((t) => t.state === 'done').every((t) => t.stars >= 1), 'every finished tile has its goal star');
    // a locked tile stays shut; Esc closes the map
    await a.page.click('#cmTiles .cmTile[data-id="tuer"]', { force: true });
    assert.strictEqual(await a.page.evaluate(() => window.STUNTS_DEBUG().phase), 'menu', 'a locked tile does not start');
    await a.page.keyboard.press('Escape');
    assert(await a.page.evaluate(() => document.getElementById('careerMap').hidden), 'Esc closes the map');
    // a finished tile starts that chapter
    await a.page.click('#careerBtn');
    await a.page.click('#cmTiles .cmTile[data-id="dom"]');
    assert(await waitFor(a.page, () => ['intro', 'countdown', 'race'].includes(window.STUNTS_DEBUG().phase), 90000), 'clicking a finished tile starts a race');
    const title = await a.page.textContent('#hudTrack');
    assert(/KAPITEL 2: MORJENS AM DOM/.test(title), `the finished tile replays its own chapter (${title})`);
    await a.ctx.close();
    lines.push('old save { chapter: 6 } → cur hafen, 6 done by id; map: 12 tiles (done/open/cur/locked); a finished tile replays its chapter');

    // 2) a save that finished the Nachtschicht once: every tile done and replayable, the Contessa stays unlocked
    const b = await open(JSON.stringify({ chapter: 0, done: true }));
    await b.page.click('#careerBtn');
    tl = await tiles(b.page);
    assert(tl.every((t) => t.state === 'done'), 'a finished Nachtschicht keeps all twelve chapters done');
    assert(await b.page.evaluate(() => !document.querySelector('.card.car.locked')), 'the Contessa is free after the whole Nachtschicht');
    assert(/NOCHMAL/.test(await b.page.textContent('#cmGo')), 'the map offers the Nachtschicht again');
    await b.ctx.close();

    // 3) a new save: only chapter 1 is open, on a phone the map fits the screen
    const c = await open(null, { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
    await c.page.evaluate(() => { document.getElementById('moreBtn').click(); document.getElementById('careerBtn').click(); });
    tl = await tiles(c.page);
    assert.deepStrictEqual(tl.map((t) => t.state), ['cur'].concat(Array(11).fill('locked')), 'a new career: chapter 1 is current, the rest locked');
    const fit = await c.page.evaluate(() => { const b2 = document.querySelector('#careerMap .cmBox'), go = document.getElementById('cmGo').getBoundingClientRect(); return b2.scrollHeight <= b2.clientHeight + 1 && go.bottom <= innerHeight; });
    assert(fit, 'the map fits a 844×390 phone without scrolling');
    await c.ctx.close();
    lines.push('finished save: all 12 done, Contessa free; new save: only chapter 1; the map fits a phone');

    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'career', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
};
