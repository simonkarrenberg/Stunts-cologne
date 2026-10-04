// Dä Lange tells a landmark's story where that landmark is (B20): on every track, each place story fires at most
// 120 m (along the road) from the road point nearest to its building, and at the trigger of a church, tower or gate story no other
// church, tower or gate stands nearer to the road point than the story's own building. The Rheinauhafen Wasserturm story fires with the Wasserturm
// as the nearest landmark. Positions are the final ones after the scenery pass (landmarks may be moved off the road).
const assert = require('assert');
const { once } = require('events');
const { serve, launch } = require('./helpers');
const TB = require('../js/track.js').TrackBuilder, D = require('../js/data.js').GameData;

const TALL = /^(kirche|turm|tor)$/;

module.exports = async function () {
  const server = serve(0), errors = [], lines = [], fails = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_STORIES === 'function' && document.querySelectorAll('.trackRow').length, undefined, { timeout: 120000 });
    const tracks = await page.evaluate(() => window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id));
    let checked = 0, wasser = null;
    for (let i = 0; i < tracks.length; i++) {
      const id = tracks[i];
      await page.evaluate((k) => { window.STUNTS_SIMSTEPS = 0; document.querySelectorAll('.trackRow')[k].click(); document.getElementById('startBtn').click(); }, i);
      const want = TB.buildTrack(D.TRACKS.find((t) => t.id === id)).length; // the new scene is up when the track length is this one's
      assert(await page.waitForFunction((L) => { const d = window.STUNTS_DEBUG(); return /intro|countdown|race/.test(d.phase) && Math.abs(window.STUNTS_FRAME(0).len - L) < 0.5; }, want, { timeout: 120000 }).then(() => true, () => false), id + ': race must start');
      const r = await page.evaluate(() => {
        const WZ = window.GameData.WAHRZEICHEN, props = window.STUNTS_PROPS(), len = window.STUNTS_FRAME(0).len;
        const road = []; for (let s = 0; s < len; s += 2) road.push([s, window.STUNTS_FRAME(s).p]);
        const stories = window.STUNTS_STORIES().filter((st) => st.placed).map((st) => { let best = Infinity, near = 0; for (const [s, p] of road) { const d = Math.hypot(p[0] - st.x, p[2] - st.z); if (d < best) { best = d; near = s; } } return { ...st, near, cam: window.STUNTS_FRAME(st.s).p }; });
        return { len, stories, props: props.filter((p) => p.parent).map((p) => ({ type: p.type, wz: p.wz, x: p.x, z: p.z, kind: (WZ[p.wz || p.type] || {}).kind || (p.type === 'kirche' ? 'kirche' : '') })) };
      });
      const tall = r.props.filter((p) => TALL.test(p.kind));
      for (const st of r.stories) {
        checked++;
        let ds = Math.abs(st.s - st.near) % r.len; ds = Math.min(ds, r.len - ds);
        if (ds > 120) fails.push(`${id} ${st.wz || st.type}: trigger ${Math.round(st.s)} m is ${Math.round(ds)} m along the road from its place (the road is nearest to it at ${Math.round(st.near)} m)`);
        if (!st.wz) continue;
        const d = (p) => Math.hypot(p.x - st.cam[0], p.z - st.cam[2]), own = Math.hypot(st.x - st.cam[0], st.z - st.cam[2]);
        if (!TALL.test((D.WAHRZEICHEN[st.wz] || {}).kind)) continue; // the 'other church or tower' rule is for churches, towers and gates
        const rival = tall.filter((p) => !(Math.abs(p.x - st.x) < 0.01 && Math.abs(p.z - st.z) < 0.01) && d(p) <= own).sort((a, b) => d(a) - d(b))[0];
        if (rival) fails.push(`${id} ${st.wz}: at the trigger (${Math.round(st.s)} m) ${rival.wz || rival.type} is nearer (${Math.round(d(rival))} m) than the landmark (${Math.round(own)} m)`);
        if (id === 'rheinauhafen' && st.wz === 'wasserturm') {
          const nearest = r.props.filter((p) => p.kind).sort((a, b) => d(a) - d(b))[0];
          wasser = { nearest: nearest.wz || nearest.type, own: Math.round(own), s: Math.round(st.s) };
        }
      }
      lines.push(`${id}: ${r.stories.length} place stories, ${r.stories.filter((st) => st.wz).length} of them Wahrzeichen`);
    }
    if (!wasser) fails.push('the Rheinauhafen must tell the Wasserturm story');
    else if (wasser.nearest !== 'wasserturm') fails.push(`the Wasserturm story must fire with the Wasserturm as the nearest landmark, not ${wasser.nearest}`);
    else lines.push(`rheinauhafen: Wasserturm story at ${wasser.s} m, the Wasserturm ${wasser.own} m away is the nearest landmark`);
    for (const f of fails.slice(0, 40)) lines.push('FAIL ' + f);
    assert(checked > 50, 'the landmark stories of all tracks must be checked');
    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'story-spots', ok: !fails.length, lines: [`${checked} place stories checked on ${tracks.length} tracks`, ...lines] };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
