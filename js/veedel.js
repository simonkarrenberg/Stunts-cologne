/* ============================================================
   STUNTS KÖLLE 4D — Veedel life: the small things on Cologne's
   sidewalks. Karneval, Chicago-am-Rhein milieu, everyday street life
   and a few LamboGina moments. Load after world.js (and lambogina.js).

   Every model is original low-poly geometry, grounded at y = 0, its
   front facing +z (the placement turns +z towards the street).
   A model that moves sets g.userData.tick = (t, dt, ctx) => {...};
   t in seconds, ctx = { center, cars, beat } (beat: LamboBeat.now()).
   ============================================================ */
(function (root) {
  'use strict';
  const W = root.World, P = W.P, THREE = root.THREE;
  const catalog = W.veedelCatalog = W.veedelCatalog || {};
  const cache = new Map();

  // ---- the kit every model is built with ----
  const K = {
    mat(color, o) {
      o = o || {};
      const key = color + (o.glow ? 'g' : 'l') + (o.opacity != null ? 'o' + o.opacity : '') + (o.double ? 'd' : '');
      if (!cache.has(key)) {
        const p = { color, side: o.double ? THREE.DoubleSide : THREE.FrontSide };
        if (o.opacity != null) { p.transparent = true; p.opacity = o.opacity; p.depthWrite = false; }
        cache.set(key, o.glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p));
      }
      return cache.get(key);
    },
    part(g, geo, color, x, y, z, o) { const m = new THREE.Mesh(geo, K.mat(color, o)); m.position.set(x || 0, y || 0, z || 0); g.add(m); return m; },
    box(g, w, h, d, color, x, y, z, o) { return K.part(g, new THREE.BoxGeometry(w, h, d), color, x, y == null ? h / 2 : y, z, o); },
    cyl(g, rt, rb, h, color, x, y, z, seg, o) { return K.part(g, new THREE.CylinderGeometry(rt, rb, h, seg || 10), color, x, y == null ? h / 2 : y, z, o); },
    cone(g, r, h, color, x, y, z, seg, o) { return K.part(g, new THREE.ConeGeometry(r, h, seg || 8), color, x, y == null ? h / 2 : y, z, o); },
    sphere(g, r, color, x, y, z, seg, o) { return K.part(g, new THREE.SphereGeometry(r, seg || 10, Math.max(4, Math.round((seg || 10) * 0.7))), color, x, y == null ? r : y, z, o); },
    // a sign with text: o = { fg, bg, w, h, x, y, z, ry, glow, border, sizeK }
    text(g, text, o) {
      o = o || {};
      const m = W.textPlane(text, o.fg || '#ffffff', o.bg || '#1c3f95', o.w || 2, o.h || 0.5, !!o.glow, { border: o.border, sizeK: o.sizeK });
      m.position.set(o.x || 0, o.y || 0, o.z || 0); m.rotation.y = o.ry || 0; g.add(m); return m;
    },
    // a Kölner: see World.human for options (shirt, pants, hat: 'fedora'|'cap'|'tricorn'|'helmet'|'polizei'|'gnome',
    // dress, coat, suit, tie, koelsch, kranz, apron, cigar, shades, glasses, beard, moustache, bald, heavy, scarf, bag, h ...)
    person(o) { return W.human(Object.assign({ lite: true }, o || {})); },
    put(g, obj, x, y, z, ry) { obj.position.set(x || 0, y || 0, z || 0); if (ry) obj.rotation.y = ry; g.add(obj); return obj; },
    rnd(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
    T: root.Pixel && root.Pixel.T,
    theme() { return W.theme ? W.theme() : { night: false }; },
    beat() { return root.LamboBeat ? root.LamboBeat.now() : { pulse: 0, energy: 0.3, section: 'a', playing: false, phase: 0, beat: 0, bar: 0 }; }
  };

  // define(id, { name, kind, w, d }, (g, options, K) => {...})
  // kind: 'karneval' | 'chicago' | 'strasse' | 'lambogina'; w × d: footprint in metres (x × z)
  function define(id, meta, make) {
    catalog[id] = Object.assign({ id }, meta);
    P[id] = (o) => {
      const g = new THREE.Group(); g.name = meta.name || id;
      g.userData.veedel = id; g.userData.type = id;
      make(g, o || {}, K);
      return g;
    };
  }
  root.Veedel = { define, K, catalog };
})(window);

/* ---- LamboGina billboard: the white wedge under a synthwave sky, pumping with the song ---- */
Veedel.define('lamboposter', { name: 'LamboGina-Plakat', kind: 'lambogina', w: 12.4, d: 1.2 }, (g, o, K) => {
  const night = K.theme().night;
  const cv = document.createElement('canvas'); cv.width = 192; cv.height = 80; const x = cv.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 52); sky.addColorStop(0, '#1a0a3a'); sky.addColorStop(0.6, '#7a1a6a'); sky.addColorStop(1, '#ff7a3a');
  x.fillStyle = sky; x.fillRect(0, 0, 192, 52);
  x.fillStyle = '#ffd23f'; for (let r = 0; r < 14; r++) { const w = Math.round(Math.sqrt(14 * 14 - r * r) * 2); if (r % 4 !== 3) x.fillRect(96 - w / 2, 50 - r, w, 1); } // striped sun
  x.fillStyle = '#12061e'; x.fillRect(0, 52, 192, 28);
  x.strokeStyle = '#ff2d95'; x.lineWidth = 1; for (let i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(96 + i * 4, 52); x.lineTo(96 + i * 22, 80); x.stroke(); }
  for (const y of [55, 59, 65, 73]) { x.beginPath(); x.moveTo(0, y); x.lineTo(192, y); x.stroke(); }
  // the white wedge in profile
  x.fillStyle = '#f4f4f2'; x.beginPath(); x.moveTo(62, 60); x.lineTo(70, 51); x.lineTo(96, 46); x.lineTo(112, 47); x.lineTo(132, 53); x.lineTo(134, 60); x.closePath(); x.fill();
  x.fillStyle = '#20202a'; x.beginPath(); x.moveTo(90, 48); x.lineTo(104, 47); x.lineTo(112, 51); x.lineTo(92, 51); x.closePath(); x.fill();
  x.fillStyle = '#111'; for (const wx of [74, 122]) { x.beginPath(); x.arc(wx, 60, 5, 0, Math.PI * 2); x.fill(); } x.fillStyle = '#999'; for (const wx of [74, 122]) x.fillRect(wx - 1, 59, 2, 2);
  x.fillStyle = '#ff2020'; x.fillRect(132, 54, 2, 2); x.fillStyle = '#fff6b0'; x.fillRect(62, 56, 3, 2);
  x.font = 'bold 22px monospace'; x.textAlign = 'center'; x.fillStyle = '#00e5ff'; x.fillText('LAMBOGINA', 97, 20); x.fillStyle = '#ff2d95'; x.fillText('LAMBOGINA', 96, 19);
  x.font = '8px monospace'; x.fillStyle = '#ffffff'; x.fillText('DÄ WEISSE KEIL VUN KÖLLE · 130 BPM', 96, 31);
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const mat = night ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), mat); board.position.set(0, 6.6, 0.12); g.add(board);
  K.box(g, 12.4, 5.4, 0.2, 0x1a1a24, 0, 6.6, 0); // frame and back
  for (const px of [-4.5, 4.5]) K.box(g, 0.35, 4.2, 0.35, 0x3a3a44, px, 2.1, 0);
  const neon = K.box(g, 12.2, 0.12, 0.12, 0xff2d95, 0, 9.35, 0.16, { glow: true }); K.box(g, 12.2, 0.12, 0.12, 0x00e5ff, 0, 3.85, 0.16, { glow: true });
  // the board is its own material: it may pulse without touching anything else
  g.userData.tick = (t, dt, ctx) => { const b = ctx && ctx.beat; const k = b && b.playing ? b.pulse * (0.5 + 0.5 * b.energy) : 0; mat.color.setScalar(night ? 0.8 + 0.35 * k : 1); neon.visible = !b || !b.playing || b.pulse > 0.15 || Math.floor(t * 4) % 2 === 0; };
});
