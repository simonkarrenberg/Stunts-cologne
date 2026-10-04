// B18 + B26: Kölsch stays, Hochdeutsch on demand, and 'Neu en Kölle?' for newcomers.
// Data: every story, side-street note and place line carries its Hochdeutsch line (hd), every menu setting a one-line hint.
// Browser: the four door cards on the first start (none on the second), NEU EN KÖLLE? replays them, every settings button
// explains itself (title), functional labels carry their gloss, and #msgHd shows only with KÖLSCH-HÜLP on.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { serve, launch } = require('./helpers');

module.exports = async function () {
  const lines = [], errors = [];
  // ---- data ----
  const D = require(path.join(__dirname, '..', 'js', 'data.js')).GameData, T = D.TUENN;
  let stories = 0, notes = 0;
  for (const t of D.TRACKS) {
    for (const p of t.props || []) if (p.story) { stories++; assert(typeof p.hd === 'string' && p.hd.trim(), `${t.id}/${p.type}: story without hd: "${p.story.slice(0, 50)}"`); assert(p.hd !== p.story, `${t.id}/${p.type}: hd only repeats the story`); }
    for (const r of (t.shortcuts || []).concat(t.branches || [])) if (r.note) { notes++; assert(typeof r.hd === 'string' && r.hd.trim(), `${r.id}: side-street note without hd`); }
  }
  const places = Object.values(T.places).flat();
  for (const l of places) assert(l && typeof l.t === 'string' && typeof l.hd === 'string' && l.hd.trim(), `place line without { t, hd }: ${JSON.stringify(l).slice(0, 60)}`);
  for (const l of T.pause) assert(l.t && l.hd, 'pause lines carry hd');
  assert.strictEqual(T.onboard.cards.length, 4, 'four door cards');
  for (const c of T.onboard.cards) assert(c.title && c.titleHd && c.t && c.hd, `door card ${c.title} needs title, t and their Hochdeutsch`);
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const subIds = [...html.match(/<div class="subBtns">([\s\S]*?)<\/div>/)[1].matchAll(/<button id="([^"]+)"/g)].map((m) => m[1]);
  for (const id of subIds) assert(T.hints[id] && T.hints[id].trim(), `settings button #${id} needs a hint in TUENN.hints`);
  lines.push(`${stories} stories, ${notes} side-street notes, ${places.length} place lines with hd; ${subIds.length} settings buttons with hints`);

  // ---- browser ----
  const server = serve(0); let browser;
  try {
    await new Promise((r) => server.listening ? r() : server.on('listening', r));
    const url = `http://localhost:${server.address().port}/`;
    browser = await launch();
    const open = async (opts, init) => {
      const ctx = await browser.newContext(opts || { viewport: { width: 1280, height: 720 } });
      await ctx.addInitScript(init || (() => {}));
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10);
      return { ctx, page };
    };
    const state = (page) => page.evaluate(() => ({ open: !document.getElementById('onboard').hidden, cards: document.querySelectorAll('#onboard .obCard').length, on: [...document.querySelectorAll('#onboard .obCard')].findIndex((c) => c.classList.contains('on')), seen: localStorage.getItem('stuntskoelle.onboarded') }));

    // 1) the first start (localStorage empty): four door cards; WIGGER through all four closes them; the second start shows none
    const a = await open(null, () => { window.STUNTS_ONBOARD = true; });
    let st = await state(a.page);
    assert(st.open && st.cards === 4 && st.on === 0 && !st.seen, `first start: the door cards are up with 4 cards (${JSON.stringify(st)})`);
    const card1 = await a.page.evaluate(() => document.querySelector('#onboard .obCard.on').textContent);
    assert(/JAS/.test(card1) && /Gas/.test(card1) && /SHIFT/.test(card1), 'card 1: gas, brake and nitro on the keyboard, with the Hochdeutsch line');
    for (let i = 1; i < 4; i++) { await a.page.click('#obNext'); st = await state(a.page); assert.strictEqual(st.on, i, `WIGGER shows card ${i + 1}`); }
    const texts = await a.page.evaluate(() => [...document.querySelectorAll('#onboard .obCard')].map((c) => c.textContent));
    assert(/deckel/i.test(texts[1]) && /Knöllche/.test(texts[2]) && /K \(oder ☎\)/.test(texts[2]) && /FALSCHPARKER/.test(texts[3]) && /KRIPO-FREI/.test(texts[3]) && /KÖLSCH/.test(texts[3]), 'cards 2-4: Deckel, Blitzer/Knöllchen/Kripo/Telefon, the signs and their perks');
    await a.page.click('#obNext'); st = await state(a.page);
    assert(!st.open && st.seen === '1', 'LOSS JONN on the last card closes them for good');
    await a.page.reload(); await a.page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function');
    st = await state(a.page); assert(!st.open, 'the second start shows no door cards');
    // replayed from the menu; Esc closes
    await a.page.click('#onboardBtn'); st = await state(a.page); assert(st.open && st.on === 0, 'NEU EN KÖLLE? replays the cards');
    await a.page.keyboard.press('ArrowRight'); st = await state(a.page); assert.strictEqual(st.on, 1, '→ turns the card');
    await a.page.keyboard.press('Escape'); st = await state(a.page); assert(!st.open, 'Esc closes the cards');
    assert.strictEqual(await a.page.evaluate(() => window.STUNTS_DEBUG().phase), 'menu', 'keys on the cards do not start a race');
    lines.push('first start: 4 door cards, closed by the last WIGGER; second start: none; NEU EN KÖLLE? replays them');

    // 2) every settings button explains itself; functional labels carry the Hochdeutsch gloss
    const tips = await a.page.evaluate(() => [...document.querySelectorAll('.subBtns button')].map((b) => ({ id: b.id, title: b.title })));
    for (const t of tips) assert(t.title && t.title.trim().length > 8, `#${t.id} needs a hint (title)`);
    await a.page.hover('#kidsBtn'); assert(/PÄNZ = Kinder/.test(await a.page.textContent('#setHint')), 'hovering PÄNZ-MODUS shows its hint line');
    const font0 = await a.page.evaluate(() => localStorage.getItem('stuntskoelle.bigtext'));
    await a.page.click('#fontBtn'); assert.strictEqual(await a.page.textContent('#fontBtn .gl'), font0 === '1' ? '' : 'Schrift: groß', 'SCHRIFT: JROSS carries the gloss Schrift: groß');
    await a.page.click('#fontBtn');
    assert.strictEqual(await a.page.evaluate(() => document.querySelector('#nameEntry b .gl').textContent), 'dein Name für die Tafel', 'name entry: DING NAME / dein Name');
    assert.strictEqual(await a.page.evaluate(() => window.STUNTS_CHAT()), 'NORMAL', 'desktop: GESCHWÄTZ starts on NORMAL');
    await a.page.evaluate(() => window.innerWidth && window.dispatchEvent(new Event('resize')));
    assert(/Gerede/.test(await a.page.textContent('#chatBtn')) && /Hochdeutsch-Hilfe/.test(await a.page.textContent('#hdBtn')), 'the glosses survive a relabel on resize');
    lines.push(`${tips.length} settings buttons with hints; glosses on SCHRIFT, GESCHWÄTZ, KÖLSCH-HÜLP and the name entry`);

    // 3) KÖLSCH-HÜLP: #msgHd only when on, and only for a line that has hd
    const story = D.TRACKS.find((t) => t.id === 'dom').props.find((p) => p.story);
    const box = (text, hd) => a.page.evaluate(({ text, hd }) => { window.STUNTS_HD(hd); window.STUNTS_SAY(text, 3000, true); const e = document.getElementById('msgHd'); return { hidden: e.hidden || getComputedStyle(e).display === 'none', text: e.textContent }; }, { text, hd });
    let b = await box(story.story, false); assert(b.hidden, 'KÖLSCH-HÜLP AUS: #msgHd is hidden');
    b = await box(T.places.brauhaus[1].t, true); assert(!b.hidden && b.text === T.places.brauhaus[1].hd, 'KÖLSCH-HÜLP AN: #msgHd shows the line\'s Hochdeutsch');
    b = await box('Dat es ene Satz ohne Hülp.', true); assert(b.hidden, 'a line without hd shows nothing extra');
    await a.page.evaluate(() => window.STUNTS_HD(false));
    lines.push('#msgHd: hidden with KÖLSCH-HÜLP AUS, the hd text with AN, nothing for a line without hd');
    await a.ctx.close();

    // 4) a test harness (navigator.webdriver) is not blocked by the cards; a phone starts on GESCHWÄTZ: WENIJ
    const c = await open({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
    st = await state(c.page); assert(!st.open, 'without STUNTS_ONBOARD a driven browser skips the cards (other tests click the menu)');
    assert.strictEqual(await c.page.evaluate(() => window.STUNTS_CHAT()), 'WENIJ', 'touch: GESCHWÄTZ starts on WENIJ');
    await c.page.evaluate(() => document.getElementById('onboardBtn').click()); st = await state(c.page);
    assert(st.open && /☰/.test(await c.page.evaluate(() => document.querySelector('#onboard .obCard').textContent)), 'phone: card 1 names the touch buttons');
    assert(await c.page.evaluate(() => { const r = document.querySelector('#onboard .obBox').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; }), 'phone: the door card fits the landscape screen');
    await c.ctx.close();
    lines.push('harness without STUNTS_ONBOARD: no cards; phone: WENIJ by default, touch keys on card 1, card fits 844×390');
    assert.deepStrictEqual(errors, [], 'no script errors');
    return { name: 'onboard', ok: true, lines };
  } catch (e) {
    return { name: 'onboard', ok: false, lines: lines.concat(errors, [String(e && e.stack || e)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
