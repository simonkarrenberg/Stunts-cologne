// B17 + B18: Dä Lange's chatter setting and the Hochdeutsch help, in three autopilot races (no rendering, 8 steps a frame).
//   dom, desktop, KÖLSCH-HÜLP AN: every 'Dä Lange verzällt' line shows #msgHd with its Hochdeutsch line
//   kalk, desktop, GESCHWÄTZ NORMAL, three full laps: at least 80 % of the track's stories are in the Verzällcher journal,
//     stories are told, and no line comes twice
//   zuelpicher, phone (touch: WENIJ by default): at most one line per 10 s, no line twice, every story passed is in the
//     journal, and a story on the phone is a one-line place tag
const assert = require('assert');
const { serve, launch, waitFor } = require('./helpers');

const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' };

module.exports = async function () {
  const server = serve(0), lines = [], errors = []; let browser;
  try {
    await new Promise((r) => server.listening ? r() : server.on('listening', r));
    const url = `http://localhost:${server.address().port}/`;
    browser = await launch();
    async function race(id, opts, setup) {
      const ctx = await browser.newContext(opts || { viewport: { width: 1280, height: 720 } });
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; window.STUNTS_NORENDER = true; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(`${id}: ${e.message}`));
      await page.goto(url); await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10);
      await page.evaluate(setup || (() => {}));
      await page.evaluate((tid) => {
        // what the box really shows for every 'verzällt' line: the Kölsch text and the visible Hochdeutsch line under it
        window.__seen = []; new MutationObserver(() => { const who = document.getElementById('msgWho').textContent, hd = document.getElementById('msgHd'); if (/verzällt/.test(who)) window.__seen.push({ text: document.getElementById('msgText').textContent, hd: hd.hidden ? '' : hd.textContent }); }).observe(document.getElementById('msgText'), { childList: true, characterData: true, subtree: true });
        const order = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id);
        document.querySelectorAll('.trackRow')[order.indexOf(tid)].click(); window.STUNTS_AUTOPILOT = true; window.STUNTS_SIMSTEPS = 8; document.getElementById('startBtn').click();
      }, id);
      const done = await waitFor(page, () => window.STUNTS_DEBUG().phase === 'finished', 300000);
      const r = await page.evaluate((tid) => ({ log: window.STUNTS_MSGLOG(), stories: window.STUNTS_STORIES(), journal: window.STUNTS_JOURNAL()[tid] || [], chat: window.STUNTS_CHAT(), laps: window.STUNTS_DEBUG().player.laps.length, seen: window.__seen }), id);
      await ctx.close();
      assert(done, `${id}: the autopilot race must finish`);
      const texts = r.log.map((l) => l.text), dups = texts.filter((t, i) => texts.indexOf(t) !== i);
      r.dups = dups; r.told = r.stories.filter((s) => s.told).length; r.inJournal = r.stories.filter((s) => r.journal.includes(s.text)).length;
      return r;
    }

    // 1) dom with KÖLSCH-HÜLP: every story line carries its Hochdeutsch line, in the log and on screen
    const dom = await race('dom', null, () => window.STUNTS_HD(true));
    const verz = dom.log.filter((l) => l.who === 'Dä Lange verzällt');
    assert(verz.length >= 3, `dom: Dä Lange tells stories (${verz.length})`);
    for (const l of verz) assert(l.hd && l.hd.trim(), `dom: 'Dä Lange verzällt' without Hochdeutsch: "${l.text.slice(0, 60)}"`);
    assert(dom.seen.length >= verz.length, 'dom: the box showed every story');
    for (const s of dom.seen) assert(s.hd.trim(), `dom: #msgHd empty under "${s.text.slice(0, 60)}"`);
    lines.push(`dom, KÖLSCH-HÜLP AN: ${verz.length} 'verzällt' lines, all with #msgHd (${dom.seen.length} seen in the box)`);

    // 2) kalk on a desktop, NORMAL: the stories are logged, nothing twice
    const kalk = await race('kalk');
    assert.strictEqual(kalk.chat, 'NORMAL', 'desktop default is NORMAL');
    assert.strictEqual(kalk.laps, 3, 'kalk: three full laps');
    assert(kalk.inJournal >= 0.8 * kalk.stories.length, `kalk: ≥ 80 % of the stories in the Verzällcher (${kalk.inJournal}/${kalk.stories.length})`);
    assert(kalk.told >= 6, `kalk: stories beat flavour, at least six told aloud (${kalk.told})`);
    assert.deepStrictEqual(kalk.dups, [], 'kalk: no line twice in one race');
    lines.push(`kalk, NORMAL: ${kalk.told}/${kalk.stories.length} stories told, ${kalk.inJournal} in the journal, ${kalk.log.length} lines, none twice`);

    // 3) zuelpicher on a phone: WENIJ, one line per 10 s at most, stories as place tags, every story passed in the journal
    const zp = await race('zuelpicher', PHONE);
    assert.strictEqual(zp.chat, 'WENIJ', 'touch default is WENIJ');
    let gap = 99; for (let i = 1; i < zp.log.length; i++) gap = Math.min(gap, zp.log[i].c - zp.log[i - 1].c);
    assert(gap >= 10 - 1e-6, `zuelpicher: at most one line per 10 s (closest ${gap.toFixed(2)} s)`);
    assert.deepStrictEqual(zp.dups, [], 'zuelpicher: no duplicate text in the log');
    assert(zp.log.every((l) => l.must || l.story), 'WENIJ: only needed lines and stories');
    const passed = zp.stories.filter((s) => s.logged);
    assert.strictEqual(passed.length, zp.stories.length, 'three laps pass every place');
    for (const s of passed) assert(zp.journal.includes(s.text), `zuelpicher: story passed but not in the journal: "${s.text.slice(0, 50)}"`);
    const tagged = zp.log.filter((l) => l.story);
    assert(tagged.length >= 2 && tagged.every((l) => l.tag), 'phone: the stories come as one-line place tags');
    lines.push(`zuelpicher, phone WENIJ: ${zp.log.length} lines, closest ${gap.toFixed(1)} s apart, none twice; ${zp.inJournal}/${zp.stories.length} stories in the journal, ${tagged.length} told as tags (${tagged.map((l) => l.tag).slice(0, 3).join(', ')} …)`);
    assert.deepStrictEqual(errors, [], 'no script errors');
    return { name: 'chatter', ok: true, lines };
  } catch (e) {
    return { name: 'chatter', ok: false, lines: lines.concat(errors, [String(e && e.stack || e)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
