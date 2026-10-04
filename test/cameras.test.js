// Cameras never sit inside buildings, trees or loops: in a race and in the replay on Ehrenfeld, Zülpicher Straße and
// the Poller Wiesen, every 2 s in the chase camera (0) and the TV camera (3), a ray from the camera to the player's car
// (exact triangles of the road and the whole city, no boxes) hits nothing before the car in at least 95 % of the samples,
// and the first replay frame shows the car inside the viewport.
const assert = require('assert');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

const TRACKS = ['ehrenfeld', 'zuelpicher', 'poller'];
const SAMPLES = 25; // per track, mode and race/replay: 50 s of driving

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    let all = 0, clear = 0;
    for (const id of TRACKS) {
      const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, serviceWorkers: 'block' });
      await ctx.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(`${id}: ${e.message}`));
      await page.goto(`http://localhost:${server.address().port}/`);
      assert(await waitFor(page, () => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length > 0, 60000), 'menu must load');
      await page.evaluate((tid) => { const order = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id); document.querySelectorAll('.trackRow')[order.indexOf(tid)].click(); document.getElementById('startBtn').click(); }, id);
      assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 180000), `${id}: the race must start`);
      await page.evaluate(() => {
        window.STUNTS_MANUAL_STEP = true; window.STUNTS_NORENDER = true; window.STUNTS_AUTOPILOT = true;
        const ray = new THREE.Raycaster(), hidden = (o) => { for (let p = o; p; p = p.parent) if (p.userData.walker || p.userData.kind === 'walker' || p.userData.sky || p.userData.water) return true; return false; };
        // exact line of sight from the camera to the middle of the player's car
        window.__seen = () => {
          const cam = window.STUNTS_CAM(), m = window.__car;
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion), target = m.position.clone().addScaledVector(up, 1.2);
          const from = cam.position.clone(), dir = target.clone().sub(from), d = dir.length(); dir.normalize(); ray.set(from, dir); ray.far = Math.max(0, d - 1.5);
          const hit = ray.intersectObjects(window.STUNTS_STATIC(), true).find((h) => { const mt = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material; return !(mt.transparent && mt.opacity < 0.9) && mt.side !== THREE.BackSide && !hidden(h.object); });
          cam.updateMatrixWorld(); const v = target.clone().project(cam);
          return { clear: !hit, layer: window.STUNTS_OCC(from.toArray(), target.toArray()), what: hit ? (() => { const chain = []; for (let p = hit.object; p && chain.length < 4; p = p.parent) chain.push(p.userData.kind || p.userData.type || p.type); const mt = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material; return chain.join('<') + (hit.object.geometry.attributes.color ? ' vc' : '') + ' ' + mt.type + ' ' + hit.point.toArray().map((x) => Math.round(x)).join(','); })() + '@' + hit.distance.toFixed(1) + '/' + d.toFixed(1) : '', onScreen: v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1, cam: from.toArray().map((x) => Math.round(x)) };
        };
      });
      // find the player's car mesh: the scene child nearest to the player's frame position with many meshes
      await page.evaluate(() => { const p = window.STUNTS_DEBUG().player; let best = null, bd = 1e9; for (const ch of window.STUNTS_SCENE().children) { if (!ch.isGroup || window.STUNTS_STATIC().includes(ch)) continue; const d = ch.position.distanceTo(new THREE.Vector3(...p.pos)); if (d < bd) { bd = d; best = ch; } } window.__car = best; });
      const stats = {};
      const sample = async (label) => { const r = await page.evaluate(() => window.__seen()); stats[label] = stats[label] || { n: 0, ok: 0, bad: [] }; stats[label].n++; if (r.clear) stats[label].ok++; else if (stats[label].bad.length < 4) stats[label].bad.push(r.what + ' cam ' + r.cam.join(',') + ' layer ' + r.layer.toFixed(2)); return r; };
      for (const mode of [0, 3]) {
        await page.evaluate((m) => window.STUNTS_SET_CAM(m), mode);
        await page.evaluate(() => window.STUNTS_CAM_STEPS(60));
        for (let k = 0; k < SAMPLES; k++) { await page.evaluate(() => window.STUNTS_CAM_STEPS(120)); await sample('race' + mode); }
      }
      // the replay of that drive: the first frame, then every 2 s
      const first = await page.evaluate(() => { window.STUNTS_REPLAY_CAM(0, 0, 0); return window.__seen(); });
      assert(first.onScreen, `${id}: the first replay frame must show the car (camera ${first.cam})`);
      const rec = await page.evaluate(() => window.STUNTS_REC(0));
      for (const mode of [0, 3]) for (let k = 0; k < SAMPLES; k++) { const t = rec.first + 2 + k * 2 * (rec.last - rec.first - 4) / (2 * SAMPLES); await page.evaluate(({ tt, m }) => window.STUNTS_REPLAY_CAM(tt, m, 30), { tt: t, m: mode }); await sample('replay' + mode); }
      const parts = Object.entries(stats).map(([k, v]) => { all += v.n; clear += v.ok; return `${k} ${v.ok}/${v.n}` + (v.bad.length ? ` [${v.bad.join('; ')}]` : ''); });
      lines.push(`${id}: ${parts.join(', ')}`);
      for (const [k, v] of Object.entries(stats)) assert(v.ok / v.n >= 0.95, `${id} ${k}: only ${v.ok} of ${v.n} samples see the car`);
      await ctx.close();
    }
    lines.push(`all: ${clear}/${all} samples with a clear line of sight`);
    assert.deepStrictEqual(errors, [], 'no page errors');
    return { name: 'cameras', ok: true, lines };
  } catch (e) {
    lines.push(String(e && e.stack || e)); return { name: 'cameras', ok: false, lines };
  } finally { if (browser) await browser.close(); server.close(); }
};
