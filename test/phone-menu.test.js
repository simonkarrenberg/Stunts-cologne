// B25: one-tap start and a short menu.
// Phone (667×375, touch): the menu is one screen (≤ 1.3 × the height), no visible text under 9 px (12 px with JROSSE SCHRIFT),
// the track carousel shows icon chips, the jargon waits behind DETAILS, KARRIERE & Co. behind ☰ MEHR, and one tap on
// EINFACH LOSFAHRE reaches the countdown (the first time: the Dom track with Tünnes). Desktop (1366×768): 02 WAGEN WÄHLEN
// stands fully above the sticky JETZ FAHREN bar.
const assert = require('assert');
const { serve, launch, waitFor } = require('./helpers');

const PHONE = { viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' };

// every visible text node in the menu whose font is smaller than min
function tinyText(min) {
  const out = [];
  const walk = (el) => { for (const n of el.childNodes) {
    if (n.nodeType === 3 && n.textContent.trim()) { const p = n.parentElement, r = p.getBoundingClientRect(), cs = getComputedStyle(p);
      if (r.width > 0 && r.height > 0 && p.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && parseFloat(cs.fontSize) < min) out.push(`${cs.fontSize} ${p.tagName.toLowerCase()}.${p.className} "${n.textContent.trim().slice(0, 30)}"`); }
    else if (n.nodeType === 1) walk(n); } };
  walk(document.getElementById('menu'));
  return out;
}

module.exports = async function () {
  const lines = [], errors = [], server = serve(0); let browser;
  try {
    await new Promise((r) => server.listening ? r() : server.on('listening', r));
    const url = `http://localhost:${server.address().port}/`;
    browser = await launch();
    const open = async (opts, init) => {
      const ctx = await browser.newContext(opts);
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
      if (init) await ctx.addInitScript(init);
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10);
      await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
      return { ctx, page };
    };

    // 1) phone, first visit: one screen, nothing under 9 px
    const a = await open(PHONE);
    let m = await a.page.evaluate(() => ({ mobile: document.body.classList.contains('mobile'), menu: document.getElementById('menu').scrollHeight, doc: document.scrollingElement.scrollHeight, h: innerHeight, w: document.getElementById('menu').scrollWidth, iw: innerWidth }));
    assert(m.mobile, 'the phone uses the mobile layout');
    assert(m.doc <= 1.3 * m.h, `document.scrollingElement.scrollHeight ${m.doc} ≤ 1.3 × ${m.h}`);
    assert(m.menu <= 1.3 * m.h, `the menu scrolls at most 1.3 screens: ${m.menu} ≤ 1.3 × ${m.h}`);
    assert(m.w <= m.iw, 'no sideways overflow');
    let tiny = await a.page.evaluate(tinyText, 9);
    assert.deepStrictEqual(tiny, [], 'no visible text under 9 px on the phone menu');
    lines.push(`phone 667×375: menu ${m.menu} px for a ${m.h} px screen, no text under 9 px`);
    // the carousel: picture, name, plain line and chips; the jargon is folded behind DETAILS
    const car = await a.page.evaluate(() => { const tl = document.getElementById('trackList'), dom = [...document.querySelectorAll('.trackRow')].find((r) => /DOMBLITZ/.test(r.textContent));
      const seen = (id) => document.getElementById(id).checkVisibility({ visibilityProperty: true });
      return { sideways: tl.scrollWidth > tl.clientWidth, chips: dom ? [...dom.querySelectorAll('.chips i')].map((i) => i.textContent) : [], routes: seen('trackRoutes'), desc: seen('trackDesc') }; });
    assert(car.sideways, 'the tracks are a sideways carousel');
    assert(car.chips.includes('LOOP') && car.chips.includes('SPRUNG'), `the Dom track shows its LOOP and SPRUNG chips (${car.chips})`);
    assert(!car.routes && !car.desc, 'the Veedels-Pass jargon and the long description wait behind DETAILS');
    await a.page.tap('#trackMore summary');
    assert(await waitFor(a.page, () => document.getElementById('trackRoutes').checkVisibility() && document.getElementById('trackDesc').checkVisibility() && /VEEDELS-PASS/.test(document.getElementById('trackRoutes').textContent), 3000), 'DETAILS opens the description and the Veedels-Pass line');
    await a.page.tap('#trackMore summary');
    // ☰ MEHR: Karriere, Hinterzimmer, Cup, Baukasten and Rekorde only when asked for, still at 9 px or more
    const hiddenBefore = await a.page.evaluate(() => ['careerBtn', 'clubBtn', 'cupBtn', 'editorBtn', 'recordsBtn'].filter((id) => document.getElementById(id).getBoundingClientRect().height > 0));
    assert.deepStrictEqual(hiddenBefore, [], 'KARRIERE, HINTERZIMMER, CUP, BAUKASTEN and REKORDE wait behind ☰ MEHR');
    await a.page.tap('#moreBtn');
    const shownAfter = await a.page.evaluate(() => ['careerBtn', 'clubBtn', 'cupBtn', 'editorBtn', 'recordsBtn'].filter((id) => document.getElementById(id).getBoundingClientRect().height > 0));
    assert.strictEqual(shownAfter.length, 5, '☰ MEHR shows them all');
    tiny = await a.page.evaluate(tinyText, 9);
    assert.deepStrictEqual(tiny, [], 'no text under 9 px behind ☰ MEHR either');
    await a.page.evaluate(() => document.getElementById('moreBtn').click());
    lines.push(`carousel with chips (Dom: ${car.chips.join(' · ')}), DETAILS fold, ☰ MEHR opens and closes`);
    // one tap on EINFACH LOSFAHRE: the Dom track with Tünnes, straight into the countdown
    const sub = await a.page.textContent('#easySub');
    assert(/DOMBLITZ/.test(sub) && /TÜNNES/.test(sub) && /LEICHT/.test(sub), `the first time EINFACH LOSFAHRE names the Dom track with Tünnes, LEICHT ("${sub}")`);
    await a.page.evaluate(() => { const el = document.getElementById('menu'); el.scrollTop = 0; });
    await a.page.tap('#easyBtn');
    assert(await waitFor(a.page, () => window.STUNTS_DEBUG().phase === 'countdown', 90000), 'one tap on EINFACH LOSFAHRE reaches the countdown');
    const race = await a.page.evaluate(() => ({ title: document.getElementById('hudTrack').textContent, last: localStorage.getItem('stuntskoelle.last') }));
    assert(/DOMBLITZ/.test(race.title) && race.last === 'dom', `the first race is the Dom track (${race.title})`);
    await a.ctx.close();
    lines.push('one tap on EINFACH LOSFAHRE: Domblitz 4D with Tünnes, phase countdown');

    // 2) a returning player: EINFACH LOSFAHRE takes the last track; JROSSE SCHRIFT keeps every text at 12 px or more
    const b = await open(PHONE, () => { localStorage.setItem('stuntskoelle.last', 'zoo'); localStorage.setItem('stuntskoelle.bigtext', '1'); });
    assert(/SCHÄL SICK SCHRAUBE/.test(await b.page.textContent('#easySub')), 'a returning player gets the last track');
    // the last track is gone (yesterday's Streck des Tages): the track picked last, not the first-time Dom with Tünnes
    const gone = await b.page.evaluate(() => { localStorage.setItem('stuntskoelle.last', 'tag-20000101'); const r = document.querySelectorAll('.trackRow')[3]; r.click(); return { sub: document.getElementById('easySub').textContent, name: r.querySelector('.info b').textContent }; });
    assert(gone.sub.includes(gone.name) && !/TÜNNES/.test(gone.sub), `a last track that is gone falls back to the picked track ("${gone.sub}")`);
    await b.page.evaluate(() => { localStorage.setItem('stuntskoelle.last', 'zoo'); });
    tiny = await b.page.evaluate(tinyText, 12);
    assert.deepStrictEqual(tiny, [], 'no visible text under 12 px with JROSSE SCHRIFT');
    await b.page.evaluate(() => document.getElementById('moreBtn').click());
    tiny = await b.page.evaluate(tinyText, 12);
    assert.deepStrictEqual(tiny, [], 'no text under 12 px behind ☰ MEHR with JROSSE SCHRIFT');
    await b.ctx.close();
    lines.push('returning player: EINFACH LOSFAHRE = last track; JROSSE SCHRIFT: nothing under 12 px');

    // 3) desktop 1366×768: 02 WAGEN WÄHLEN fully above the sticky bar, EINFACH LOSFAHRE on top, no ☰ MEHR
    const c = await open({ viewport: { width: 1366, height: 768 } });
    const d = await c.page.evaluate(() => { const cars = document.querySelector('.panel.cars').getBoundingClientRect(), bar = document.querySelector('#menu > .quickStart').getBoundingClientRect(), easy = document.getElementById('easyBtn').getBoundingClientRect();
      return { carsTop: cars.top, carsBottom: cars.bottom, bar: bar.top, easy: easy.height > 0 && easy.bottom < cars.top, more: document.getElementById('moreBtn').getBoundingClientRect().height, h2: document.querySelector('.panel.cars h2').textContent }; });
    assert(/02\s*WAGEN WÄHLEN/.test(d.h2), 'the car panel is 02 WAGEN WÄHLEN');
    assert(d.carsTop >= 0 && d.carsBottom <= d.bar, `02 WAGEN WÄHLEN stands fully above the sticky bar (${Math.round(d.carsBottom)} ≤ ${Math.round(d.bar)})`);
    assert(d.easy, 'EINFACH LOSFAHRE sits above the panels');
    assert.strictEqual(d.more, 0, 'the desktop shows everything, no ☰ MEHR');
    await c.ctx.close();
    lines.push(`desktop 1366×768: 02 WAGEN WÄHLEN ends at ${Math.round(d.carsBottom)} px, the bar starts at ${Math.round(d.bar)} px`);

    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'phone-menu', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
};
