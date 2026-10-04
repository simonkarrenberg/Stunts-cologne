// B19: landmark name tags and the Wahrzeichen album. All twelve Romanesque churches stand on some track with a story;
// every album entry has a story somewhere. On the Dom track (desktop 1280×720 and a touch phone 844×390), when dä Lange
// tells the Tünnes-un-Schäl story, #landmarkTag shows that monument's name and its pointer ends on the projected
// statue (± 40 px); passing it puts it in the album under REKORDE.
const assert = require('assert');
const path = require('path');
const { once } = require('events');
const { serve, launch } = require('./helpers');
const D = require('../js/data.js').GameData;

const ROMANESQUE = ['andreas', 'aposteln', 'caecilien', 'georg', 'gereon', 'kunibert', 'mariakapitol', 'lyskirchen', 'stmartin', 'pantaleon', 'stseverin', 'ursula'];
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' };

module.exports = async function () {
  const lines = [], errors = [], WZ = D.WAHRZEICHEN;
  // 1) the data: twelve Romanesque churches, each a prop with a story on some track; every album entry can be found
  const told = new Map(); for (const t of D.TRACKS) for (const p of t.props || []) if (p.story) { const k = p.wz || p.type; if (!told.has(k)) told.set(k, t.id); }
  assert.deepStrictEqual(Object.keys(WZ).filter((k) => WZ[k].roman).sort(), [...ROMANESQUE].sort(), 'the album marks exactly the twelve Romanesque churches');
  for (const k of ROMANESQUE) assert(told.has(k), `${k}: a Romanesque church needs a prop with a story on some track`);
  for (const k of Object.keys(WZ)) { assert(told.has(k), `${k}: every Wahrzeichen in the album must be told somewhere`); assert(/^[A-ZÄÖÜ0-9 .·'()-]+$/.test(WZ[k].name), `${k}: the tag is an upper-case name`); }
  assert(D.TUENN.orden.some((o) => o.id === 'romanisch' && o.stat === 'roman' && o.need === 12 && o.name === 'ZWÖLF ROMANISCHE'), 'Orden ZWÖLF ROMANISCHE');
  lines.push(`${Object.keys(WZ).length} Wahrzeichen in the album, 12 Romanesque churches told on ${new Set(ROMANESQUE.map((k) => told.get(k))).size} tracks`);

  const server = serve(0); let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const run = async (label, opts, shot) => {
      const ctx = await browser.newContext(Object.assign({ serviceWorkers: 'block' }, opts));
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); localStorage.setItem('stuntskoelle.chatter', 'VILL'); });
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(label + ': ' + e.message));
      await page.goto(`http://localhost:${server.address().port}/`);
      await page.waitForFunction(() => typeof window.STUNTS_STORIES === 'function' && document.querySelectorAll('.trackRow').length >= 10, undefined, { timeout: 120000 });
      const i = await page.evaluate(() => window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).findIndex((t) => t.id === 'dom'));
      // during the intro or countdown the car is put 20 m before the Tünnes-un-Schäl statue and waits there: the race
      // starts in its story's window (a frame loop in the page does it the moment the scene is up)
      await page.evaluate((k) => { window.STUNTS_SIMSTEPS = 6; window.STUNTS_AUTOPILOT = false;
        const put = () => { const st = /intro|countdown/.test(window.STUNTS_DEBUG().phase) && window.STUNTS_STORIES().find((x) => x.wz === 'denkmal'); if (st) { window.STUNTS_SIMSTEPS = 0; window.STUNTS_TELEPORT(st.s - 20, 0, 0); window.__put = st; } else requestAnimationFrame(put); };
        document.querySelectorAll('.trackRow')[k].click(); document.getElementById('startBtn').click(); requestAnimationFrame(put); }, i);
      await page.waitForFunction(() => window.__put, undefined, { timeout: 120000 });
      const st = await page.evaluate(() => window.__put);
      await page.waitForFunction(() => window.STUNTS_DEBUG().phase === 'race', undefined, { timeout: 120000 });
      assert(st, label + ': the Dom track tells the Tünnes-un-Schäl story');
      let tag = null;
      for (let k = 0; k < 300 && !tag; k++) {
        await page.waitForTimeout(100);
        tag = await page.evaluate(() => { const log = window.STUNTS_MSGLOG(); if (!log.some((m) => m.story && /^Tünnes un Schäl/.test(m.text))) return null;
          const t = window.STUNTS_LANDMARK_TAG(), el = document.getElementById('landmarkTag'); if (!t || !t.on) return null;
          const r = el.getBoundingClientRect(), cam = window.STUNTS_CAM(), v = new THREE.Vector3(...t.anchor).project(cam);
          const prop = window.STUNTS_PROPS().find((p) => p.type === 'denkmal' && p.parent);
          return { text: el.textContent, hidden: el.hidden, visible: r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none', tip: [r.left + r.width / 2, r.bottom], box: [r.left, r.top, r.right, r.bottom],
            proj: [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight], anchor: t.anchor, prop: prop && [prop.x, prop.y, prop.z], w: innerWidth, h: innerHeight }; });
      }
      assert(tag, label + ': the Tünnes-un-Schäl story must be told and its tag shown');
      if (shot) await page.screenshot({ path: shot });
      assert(!tag.hidden && tag.visible, label + ': #landmarkTag is visible');
      assert.strictEqual(tag.text, WZ.denkmal.name, label + ': the tag names the statue');
      assert(tag.prop && Math.hypot(tag.anchor[0] - tag.prop[0], tag.anchor[2] - tag.prop[2]) < 0.5 && tag.anchor[1] >= tag.prop[1] - 0.01 && tag.anchor[1] - tag.prop[1] <= 30, label + ': the tag points at the statue');
      const off = Math.hypot(tag.tip[0] - tag.proj[0], tag.tip[1] - tag.proj[1]);
      assert(off <= 40, `${label}: the pointer ends ${off.toFixed(0)} px from the projected statue (tip ${tag.tip.map(Math.round)}, statue ${tag.proj.map(Math.round)})`);
      assert(tag.box[0] >= 0 && tag.box[2] <= tag.w && tag.box[1] >= 0, `${label}: the tag stays on screen (${tag.box.map(Math.round)})`);
      lines.push(`${label}: "${tag.text}" ${off.toFixed(0)} px from the projected statue`);
      // the album: passing the statue put it in, REKORDE shows the count
      await page.evaluate(() => { window.STUNTS_AUTOPILOT = true; });
      const album = await page.evaluate(async () => { const t0 = Date.now(); while (!window.STUNTS_WAHRZEICHEN().includes('denkmal') && Date.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 100)); return window.STUNTS_WAHRZEICHEN(); });
      assert(album.includes('denkmal'), label + ': passing the statue puts it in the album');
      await ctx.close();
      return album;
    };
    const shot = (n) => (process.env.SHOTS ? path.join(process.env.SHOTS, n) : null); // SHOTS=dir: keep a screenshot of each tag
    await run('desktop 1280×720', { viewport: { width: 1280, height: 720 } }, shot('wahrzeichen-desktop.png'));
    await run('phone 844×390', PHONE, shot('wahrzeichen-phone.png'));
    // REKORDE lists the album with its count and the Romanesque counter
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.wahrzeichen', JSON.stringify(['denkmal', 'stmartin', 'georg', 'kein-ort'])); });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push('records: ' + e.message));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.getElementById('recordsBtn'), undefined, { timeout: 120000 });
    const rec = await page.evaluate(() => { document.getElementById('recordsBtn').click(); const a = document.querySelector('#recordsList .wzAlbum'); return a && { head: a.querySelector('.ordenHead').textContent, rom: a.querySelector('.wzRom').textContent, on: [...a.querySelectorAll('.wz.on')].map((e) => e.textContent) }; });
    assert(rec, 'REKORDE shows the Wahrzeichen album');
    assert.strictEqual(rec.head, `WAHRZEICHEN 3/${Object.keys(WZ).length} ENTDECKT`, 'album head counts the known places');
    assert(/2 \/ 12/.test(rec.rom), 'two of the twelve Romanesque churches: ' + rec.rom);
    assert.deepStrictEqual(rec.on.sort(), [WZ.denkmal.name, WZ.georg.name, WZ.stmartin.name].sort(), 'found places show their names');
    lines.push(`REKORDE: "${rec.head}", "${rec.rom}"`);
    await ctx.close();
    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'wahrzeichen', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
