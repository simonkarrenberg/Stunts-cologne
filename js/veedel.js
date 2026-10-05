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
  // since: the year a scene belongs to the city from (an era track such as the 1968 Ring leaves later ones out)
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

/* ==== street scenes (built and reviewed one by one; each draws only into its own group) ==== */

// Der Nubbel: the straw scapegoat of Carnival hangs over the door of the Kneipe "Zum Nubbel", a broomstick through his
// sleeves like a scarecrow, a sackcloth face with button eyes and straw poking out everywhere. On Carnival Tuesday night
// he is burned for all the sins of the Jecken, and the chalkboard by the door already knows who did it: "HÄ WOR ET!"
Veedel.define('nubbel', { name: 'Der Nubbel', kind: 'karneval', w: 3, d: 2 }, (g, o, K) => {
  const night = K.theme().night;
  const ZF = -0.7;                       // facade front plane (facade slab from z -1.0 to -0.7)

  // ---- tiny merge helper: many small parts -> one vertex-coloured mesh ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const VM = K.__vcMatCache || (K.__vcMatCache = {}); // shared vertex-colour materials (one set for all instances)
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  function merge(parts, kc) {            // kc: colour factor (the lamp-lit Nubbel at night)
    const pos = [], nor = [], col = [];
    for (const it of parts) {
      const geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.q) _q.copy(it.q); else { _e.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0); _q.setFromEuler(_e); }
      _p.set(it.p[0], it.p[1], it.p[2]); _s.set(it.s ? it.s[0] : 1, it.s ? it.s[1] : 1, it.s ? it.s[2] : 1); _m.compose(_p, _q, _s); geo.applyMatrix4(_m);
      const pa = geo.attributes.position.array, na = geo.attributes.normal.array; _c.setHex(it.c); if (kc) _c.multiplyScalar(kc);
      for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (let i = 0; i < pa.length / 3; i++) col.push(_c.r, _c.g, _c.b);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return bg;
  }
  const vmesh = (parent, parts, double, glow, kc) => { const m = new THREE.Mesh(merge(parts, kc), vcMat(double, glow)); parent.add(m); return m; };
  const box = (w, h, d, c, x, y, z, r) => ({ geo: new THREE.BoxGeometry(w, h, d), c, p: [x, y, z], r });
  // a stick between two points (for ropes, struts)
  const stick = (ax, ay, az, bx, by, bz, rad, c, seg) => { _a.set(ax, ay, az); _b.set(bx, by, bz); const len = _a.distanceTo(_b); const q = new THREE.Quaternion().setFromUnitVectors(_up, _d.subVectors(_b, _a).normalize()); return { geo: new THREE.CylinderGeometry(rad, rad, len, seg || 5), c, p: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], q }; };

  // ---------------------------------------------------------------- the Kneipe facade ----
  const WOOD = 0x4a2a18, WOOD_L = 0x7a4a26, WALL = 0xeedcb0, WHITE = 0xf4f0e6;
  K.box(g, 3.0, 3.05, 0.3, WOOD, 0, 1.525, -0.85);                  // dark wooden Kneipe front
  K.box(g, 3.0, 2.85, 0.3, WALL, 0, 3.05 + 1.425, -0.85);           // cream upper floor
  K.box(g, 3.0, 0.16, 0.4, 0x8a8478, 0, 3.07, -0.8);               // stone ledge over the ground floor
  K.box(g, 3.0, 0.2, 0.4, 0x9a4a32, 0, 5.8, -0.8);                // eaves cornice
  // wood trim, pilasters, door frame, window mullions, flower box: one mesh
  const trim = [
    box(0.14, 2.9, 0.06, WOOD_L, -1.43, 1.45, ZF + 0.03), box(0.14, 2.9, 0.06, WOOD_L, 1.43, 1.45, ZF + 0.03), box(0.14, 2.3, 0.06, WOOD_L, -0.2, 1.15, ZF + 0.03),
    box(1.2, 0.12, 0.08, WOOD_L, -0.8, 2.34, ZF + 0.04), box(0.1, 2.3, 0.08, WOOD_L, -1.35, 1.15, ZF + 0.04), box(0.1, 2.3, 0.08, WOOD_L, -0.25, 1.15, ZF + 0.04),
    box(1.36, 0.12, 0.1, WOOD_L, 0.72, 0.93, ZF + 0.05), box(1.36, 0.1, 0.08, WOOD_L, 0.72, 2.23, ZF + 0.04),
    box(0.08, 1.3, 0.08, WOOD_L, 0.04, 1.58, ZF + 0.04), box(0.08, 1.3, 0.08, WOOD_L, 1.4, 1.58, ZF + 0.04), box(0.06, 1.25, 0.06, WOOD_L, 0.72, 1.58, ZF + 0.06), box(1.3, 0.06, 0.06, WOOD_L, 0.72, 1.82, ZF + 0.06),
    box(3.0, 0.06, 0.04, WOOD_L, 0, 0.45, ZF + 0.02), box(1.3, 0.06, 0.04, WOOD_L, 0.72, 0.45, ZF + 0.03),
    // upper windows: white frames and crosses
    box(0.9, 1.3, 0.03, WHITE, -0.8, 4.25, ZF + 0.015), box(0.9, 1.3, 0.03, WHITE, 0.8, 4.25, ZF + 0.015),
    box(0.06, 1.15, 0.05, WHITE, -0.8, 4.25, ZF + 0.07), box(0.06, 1.15, 0.05, WHITE, 0.8, 4.25, ZF + 0.07), box(0.75, 0.06, 0.05, WHITE, -0.8, 4.45, ZF + 0.07), box(0.75, 0.06, 0.05, WHITE, 0.8, 4.45, ZF + 0.07),
    // green shutters
    box(0.36, 1.3, 0.05, 0x2d6a4f, -1.43 + 0.2, 4.25, ZF + 0.03), box(0.36, 1.3, 0.05, 0x2d6a4f, 1.43 - 0.2, 4.25, ZF + 0.03),
    // flower box under the right upper window with red geraniums
    box(0.95, 0.2, 0.22, 0x8a5a2a, 0.8, 3.52, ZF + 0.11),
    // stone step before the door
    box(1.2, 0.14, 0.3, 0x9a968c, -0.8, 0.07, ZF + 0.15)
  ];
  for (let i = 0; i < 6; i++) trim.push({ geo: new THREE.SphereGeometry(0.075, 5, 4), c: i % 2 ? 0xd81e2c : 0x2f7a3a, p: [0.45 + i * 0.14, 3.66 + (i % 2) * 0.04, ZF + 0.12 + (i % 3) * 0.03] });
  vmesh(g, trim);
  // panes: glass (upper) and the brightly lit Kneipe window
  const glass = night ? K.mat(0x1c2230) : K.mat(0x3a5068), lit = night ? K.mat(0xffc45a, { glow: true }) : K.mat(0xe8b050);
  const upL = K.box(g, 0.75, 1.15, 0.02, 0, -0.8, 4.25, ZF + 0.04); upL.material = glass;
  const upR = K.box(g, 0.75, 1.15, 0.02, 0, 0.8, 4.25, ZF + 0.04); upR.material = night ? K.mat(0xffd98a, { glow: true }) : glass;
  const win = K.box(g, 1.3, 1.25, 0.02, 0, 0.72, 1.58, ZF + 0.02); win.material = lit;
  K.box(g, 1.26, 0.42, 0.02, 0xf6f2ea, 0.72, 1.18, ZF + 0.035);    // half curtain (Scheibengardine)
  // the door with a small lit pane and a brass knob
  K.box(g, 0.95, 2.22, 0.04, 0x2a160c, -0.8, 1.11, ZF + 0.02);
  const dp = K.box(g, 0.45, 0.55, 0.02, 0, -0.8, 1.72, ZF + 0.05); dp.material = lit;
  K.sphere(g, 0.04, 0xd9a93a, -0.43, 1.05, ZF + 0.07, 6);
  // Kneipe sign and the ALAAF poster in the window
  K.text(g, 'ZUM NUBBEL', { fg: '#f2c14e', bg: '#1f4d2e', border: '#f2c14e', w: 2.75, h: 0.52, x: 0, y: 2.74, z: ZF + 0.02, glow: night, sizeK: 0.6 });
  K.text(g, 'ALAAF!', { fg: '#d81e2c', bg: '#ffffff', border: '#d81e2c', w: 0.62, h: 0.34, x: 0.36, y: 1.95, z: ZF + 0.04, glow: night });
  // wall lantern between door and window
  K.box(g, 0.05, 0.05, 0.26, 0x1a1a1a, -0.2, 2.1, ZF + 0.13);
  K.box(g, 0.2, 0.05, 0.2, 0x1a1a1a, -0.2, 2.17, ZF + 0.26);
  const lamp = K.box(g, 0.14, 0.2, 0.14, 0, -0.2, 2.05, ZF + 0.26); lamp.material = night ? K.mat(0xffe08a, { glow: true }) : K.mat(0xf2d27a);

  // ---------------------------------------------------------------- the wooden bracket ----
  // over the door, its wall plate above the upper window; the hook ring hangs under the tip
  const BX = -0.62, BY = 5.3, BZ = 0.5;
  vmesh(g, [
    box(0.13, 0.14, BZ + 0.12 - ZF, 0x6a3e1c, BX, BY + 0.1, (ZF + BZ + 0.12) / 2),   // beam
    box(0.3, 0.62, 0.06, 0x5a3418, BX, BY - 0.05, ZF + 0.03),                       // wall plate
    stick(BX, BY - 0.3, ZF + 0.06, BX, BY + 0.06, ZF + 0.62, 0.045, 0x6a3e1c, 4),    // knee brace
    box(0.16, 0.05, 0.16, 0x2a2a2a, BX, BY + 0.19, BZ),                             // iron cap
    { geo: new THREE.TorusGeometry(0.045, 0.012, 4, 8), c: 0x2a2a2a, p: [BX, BY, BZ] },    // hook ring
    { geo: new THREE.CylinderGeometry(0.05, 0.1, 0.09, 8), c: 0x2d6a4f, p: [BX, BY, BZ - 0.3] }   // lamp shade under the beam
  ]);
  const spot = K.sphere(g, 0.05, 0, BX, BY - 0.065, BZ - 0.3, 6); spot.material = night ? K.mat(0xfff0b0, { glow: true }) : K.mat(0xf4e8c0);
  if (night) { // the lamp lights the Nubbel: a faint cone of light
    const cone = K.part(g, new THREE.ConeGeometry(0.42, 1.7, 12, 1, true), 0xffe7a0, BX, BY - 0.065 - 0.837, BZ - 0.3 + 0.144, { glow: true, opacity: 0.13 });
    cone.rotation.x = -0.17;
  }

  // ---------------------------------------------------------------- pennant garlands ----
  // two strings of red-white pennants from the beam to the upper facade corners
  const GX = BX, GY = BY + 0.17, GZ = BZ - 0.28;
  const pen = [], pcol = [];
  const garland = (ax, ay, az, bx, by, bz, n, sag) => {
    for (let i = 0; i < n; i++) {
      const u0 = (i + 0.15) / n, u1 = (i + 0.85) / n, um = (u0 + u1) / 2;
      const P = (u) => [ax + (bx - ax) * u, ay + (by - ay) * u - Math.sin(u * Math.PI) * sag, az + (bz - az) * u];
      const a = P(u0), b = P(u1), m = P(um);
      pen.push(a[0], a[1], a[2], b[0], b[1], b[2], m[0], m[1] - 0.24, m[2]);
      _c.setHex(i % 2 ? 0xffffff : 0xd81e2c); for (let k = 0; k < 3; k++) pcol.push(_c.r, _c.g, _c.b);
    }
  };
  garland(GX, GY, GZ, -1.46, 5.62, ZF + 0.02, 4, 0.14);
  garland(GX, GY, GZ, 1.46, 5.62, ZF + 0.02, 9, 0.34);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pen, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(pcol, 3)); pg.computeVertexNormals();
  g.add(new THREE.Mesh(pg, vcMat(true, false)));
  const strings = [];
  const strand = (ax, ay, az, bx, by, bz, sag) => { let px = ax, py = ay, pz = az; for (let k = 1; k <= 6; k++) { const u = k / 6, x = ax + (bx - ax) * u, y = ay + (by - ay) * u - Math.sin(u * Math.PI) * sag, z = az + (bz - az) * u; strings.push(stick(px, py, pz, x, y, z, 0.012, 0x333333, 3)); px = x; py = y; pz = z; } };
  strand(GX, GY, GZ, -1.46, 5.62, ZF + 0.02, 0.14); strand(GX, GY, GZ, 1.46, 5.62, ZF + 0.02, 0.34);
  vmesh(g, strings);
  // little bulbs on the garland strings: they glow at night
  const bulbs = [];
  const bulbLine = (ax, ay, az, bx, by, bz, sag, n) => { for (let k = 0; k <= n; k++) { const u = (k + 0.5) / (n + 1); bulbs.push({ geo: new THREE.SphereGeometry(0.045, 5, 3), c: [0xffe07a, 0xff6a5a, 0xfff4d0][k % 3], p: [ax + (bx - ax) * u, ay + (by - ay) * u - Math.sin(u * Math.PI) * sag - 0.03, az + (bz - az) * u] }); } };
  bulbLine(GX, GY, GZ, -1.46, 5.62, ZF + 0.02, 0.14, 3); bulbLine(GX, GY, GZ, 1.46, 5.62, ZF + 0.02, 0.34, 8);
  vmesh(g, bulbs, false, night);

  // ---------------------------------------------------------------- beer barrel table ----
  K.cyl(g, 0.3, 0.3, 0.95, 0x8a5a2a, 0.85, 0.475, 0.15, 10);
  vmesh(g, [
    { geo: new THREE.CylinderGeometry(0.315, 0.315, 0.06, 10), c: 0x3a3a3a, p: [0.85, 0.15, 0.15] },
    { geo: new THREE.CylinderGeometry(0.315, 0.315, 0.06, 10), c: 0x3a3a3a, p: [0.85, 0.8, 0.15] },
    { geo: new THREE.CylinderGeometry(0.34, 0.34, 0.04, 12), c: 0x6a3e1c, p: [0.85, 0.97, 0.15] },
    { geo: new THREE.CylinderGeometry(0.05, 0.05, 0.01, 8), c: 0xffffff, p: [0.95, 0.995, 0.25] },   // Bierdeckel
    { geo: new THREE.CylinderGeometry(0.03, 0.028, 0.16, 6), c: 0xf5b800, p: [0.95, 1.08, 0.25] },   // Kölsch Stange
    { geo: new THREE.CylinderGeometry(0.031, 0.031, 0.03, 6), c: 0xffffff, p: [0.95, 1.175, 0.25] }
  ]);

  // ---------------------------------------------------------------- the chalkboard by the door ----
  // an A-frame "Kundenstopper": the chalk names the culprit and points up at him
  const TH = 0.2, BHT = 0.95, CHALK = 0xf2eedc, SLATE = 0x22302a;
  const af = new THREE.Group(); af.position.set(0.02, 0, 0.56); af.rotation.y = 0.12; g.add(af);
  const cyB = BHT / 2 * Math.cos(TH) + 0.02 * Math.sin(TH) + 0.002;
  const fb = new THREE.Group(); fb.position.set(0, cyB, 0); fb.rotation.x = -TH; af.add(fb);
  const bb = new THREE.Group(); bb.position.set(0, cyB, -BHT * Math.sin(TH)); bb.rotation.x = TH; af.add(bb);
  K.box(fb, 0.6, BHT, 0.04, 0x8a5a2a, 0, 0, 0); K.box(bb, 0.6, BHT, 0.04, 0x8a5a2a, 0, 0, 0);
  const arrow = [box(0.52, 0.84, 0.004, SLATE, 0, -0.01, 0.022)];   // the slate (front at z 0.024)
  K.text(fb, 'HÄ WOR ET!', { fg: '#f2eedc', bg: '#22302a', w: 0.5, h: 0.28, x: 0, y: 0.22, z: 0.026, sizeK: 0.62, glow: night });
  { const ang = 0.62, L = 0.3, cx = 0.05, cy = -0.2, dx = -Math.sin(ang), dy = Math.cos(ang), tx = cx + dx * L / 2, ty = cy + dy * L / 2;   // up and left, towards the Nubbel
    arrow.push(box(0.035, L, 0.006, CHALK, cx, cy, 0.027, [0, 0, ang]));
    for (const sgn of [-1, 1]) { const a2 = ang + sgn * 2.5; arrow.push(box(0.035, 0.12, 0.006, CHALK, tx - Math.sin(a2) * 0.05, ty + Math.cos(a2) * 0.05, 0.028, [0, 0, a2])); } }
  vmesh(fb, arrow, false, night);

  // ---------------------------------------------------------------- the Nubbel ----
  // a straw doll in old clothes on a broomstick, hung from the stick ends by a rope bridle that keeps clear of his head
  const swing = new THREE.Group(); swing.position.set(BX, BY, BZ); g.add(swing);
  const NH = 1.6, H = NH / 1.75, SY = 1.33, DROP = 0.85, SX = 0.78;   // doll height; stick height in the doll; hook to stick; stick half-length
  const STRAW = 0xe6c048, STRAW_D = 0xc99a2e, KC = night ? 0.85 : 0;  // at night he is lit by the lamp
  const nub = K.person({ h: NH, skin: 0xd6b97c, hair: STRAW, shirt: 0x6b4a2b, pants: 0x56606e, shoes: 0x3a2616, suit: true, tie: 0xd81e2c, shirtC: 0xe8e0c8, hat: 'none' });
  K.put(swing, nub, 0, -DROP - SY * H, 0);
  // arms straight out along the broomstick; the hands go, straw comes out of the cuffs instead
  const segTo = (m, ax, ay, az, bx, by, bz) => { const L0 = m.geometry.parameters.height; _a.set(ax, ay, az); _b.set(bx, by, bz); _d.subVectors(_b, _a); const L = _d.length(); m.quaternion.setFromUnitVectors(_up, _d.multiplyScalar(1 / L)); m.position.addVectors(_a, _b).multiplyScalar(0.5); m.scale.set(1, L / L0, 1); };
  for (const ch of nub.children.slice()) {
    if (!ch.isMesh) continue;
    const gt = ch.geometry.type, px = ch.position.x, py = ch.position.y, sx = Math.sign(px);
    if (gt === 'CylinderGeometry' && Math.abs(px) > 0.19 && py > 0.75 && py < 1.33) { if (py > 1.1) segTo(ch, sx * 0.21, 1.36, 0, sx * 0.46, 1.335, 0.01); else segTo(ch, sx * 0.46, 1.335, 0.01, sx * 0.69, 1.325, 0.015); }
    else if (gt === 'SphereGeometry' && Math.abs(px) > 0.2 && py < 1.0) nub.remove(ch);
  }
  // a sackcloth face: button eyes, rosy cheeks, a stitched grin (one texture for every Nubbel)
  if (!VM.nubFace) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#d6b97c'; x.fillRect(0, 0, 128, 64);
    x.fillStyle = 'rgba(110,80,30,0.2)'; for (let i = 0; i < 128; i += 3) x.fillRect(i, 0, 1, 64); for (let j = 0; j < 64; j += 3) x.fillRect(0, j, 128, 1);
    const cx = 32;                                   // the sphere's +z meridian
    x.fillStyle = '#7a5a2a'; x.fillRect(95, 0, 2, 64); for (let j = 2; j < 64; j += 5) x.fillRect(93, j, 6, 1);   // seam at the back
    x.fillStyle = '#e8786a'; for (const sx of [-1, 1]) { x.beginPath(); x.arc(cx + sx * 14, 37, 4.2, 0, 6.3); x.fill(); }
    for (const sx of [-1, 1]) {
      x.fillStyle = '#121212'; x.beginPath(); x.arc(cx + sx * 8.5, 29.5, 4.4, 0, 6.3); x.fill();
      x.fillStyle = '#8a8a8a'; for (const [dx, dy] of [[-1.5, -1.5], [1, -1.5], [-1.5, 1], [1, 1]]) x.fillRect(cx + sx * 8.5 + dx, 29.5 + dy, 1, 1);
    }
    x.fillStyle = '#a8763a'; x.beginPath(); x.moveTo(cx, 31); x.lineTo(cx - 3, 38); x.lineTo(cx + 3, 38); x.closePath(); x.fill();
    x.fillStyle = '#2a1a10'; for (let k = -10; k <= 10; k++) { const u = k / 10.5; x.fillRect(cx + u * 11, 41 + (1 - u * u) * 4.5, 1.2, 1.4); }
    for (let k = -4; k <= 4; k += 2) { const u = k / 4.6; x.fillRect(cx + u * 11 - 0.4, 39.6 + (1 - u * u) * 4.5, 1, 4.2); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter;
    VM.nubFace = { day: new THREE.MeshLambertMaterial({ map: t }), night: new THREE.MeshBasicMaterial({ map: t, color: 0xd9d9d9 }) };
  }
  for (const ch of nub.children) {
    if (!ch.isMesh) continue;
    if (ch.material.map) ch.material = night ? VM.nubFace.night : VM.nubFace.day;
    else if (night) ch.material = K.mat(_c.copy(ch.material.color).multiplyScalar(KC).getHex(), { glow: true });
  }
  // straw everywhere, the broomstick, a battered hat, patches (person-local coordinates, scaled with him)
  const bits = [], R = K.rnd(4711);
  const fan = (x, y, z, dx, dy, dz, n, len, spread) => {
    for (let k = 0; k < n; k++) {
      _d.set(dx + (R() - 0.5) * spread, dy + (R() - 0.5) * spread, dz + (R() - 0.5) * spread).normalize();
      const l = len * (0.75 + R() * 0.5);
      bits.push({ geo: new THREE.BoxGeometry(0.016, l, 0.016), c: k % 3 ? STRAW : STRAW_D, p: [x + _d.x * l / 2, y + _d.y * l / 2, z + _d.z * l / 2], q: new THREE.Quaternion().setFromUnitVectors(_up, _d) });
    }
  };
  for (const sx of [-1, 1]) {
    fan(sx * 0.69, 1.325, 0.015, sx * 0.55, -0.8, 0.1, 7, 0.13, 0.8); // out of the cuffs, drooping
    fan(sx * 0.11, 0.1, 0.02, sx * 0.4, -0.5, 0.4, 4, 0.11, 0.9);   // out of the trouser legs
  }
  for (let k = 0; k < 9; k++) { const a = 0.95 + k / 8 * (Math.PI * 2 - 1.9); fan(Math.sin(a) * 0.105, 1.7, Math.cos(a) * 0.095, Math.sin(a), -0.55, Math.cos(a), 1, 0.15, 0.3); } // straw hair under the hat
  for (const a of [-2.3, -1.3, 1.3, 2.3, Math.PI]) fan(Math.sin(a) * 0.07, 1.45, Math.cos(a) * 0.05, Math.sin(a) * 0.8, 0.7, Math.cos(a) * 0.8, 1, 0.1, 0.3); // out of the collar
  fan(0.03, 1.9, 0.0, 0.25, 1, 0, 5, 0.1, 0.9);                     // out of the hole in his hat
  bits.push({ geo: new THREE.CylinderGeometry(0.018, 0.018, SX * 2, 6), c: 0x9a6a3a, p: [0, SY, 0.012], r: [0, 0, Math.PI / 2] });   // the broomstick
  // battered hat: floppy tilted brim, dented crown, a sad red-white band
  bits.push({ geo: new THREE.CylinderGeometry(0.2, 0.21, 0.025, 10), c: 0x3a3428, p: [0, 1.775, 0], r: [0.12, 0, 0.14] });
  bits.push({ geo: new THREE.CylinderGeometry(0.1, 0.125, 0.16, 8), c: 0x3a3428, p: [0.01, 1.85, -0.005], r: [0.1, 0, 0.2] });
  bits.push({ geo: new THREE.CylinderGeometry(0.127, 0.128, 0.035, 8), c: 0xd81e2c, p: [0.005, 1.8, -0.002], r: [0.11, 0, 0.18] });
  bits.push(box(0.06, 0.04, 0.04, 0x8a7a5a, -0.07, 1.87, 0.1, [0.3, 0, 0.2]));           // a patch on the crown
  // trouser and sleeve patches, a red Strüßje in the buttonhole
  bits.push(box(0.1, 0.1, 0.02, 0xd81e2c, -0.1, 0.62, 0.08, [0, 0, 0.2]), box(0.09, 0.09, 0.02, 0xe8d8a0, 0.12, 0.3, 0.06, [0, 0, -0.3]), box(0.09, 0.07, 0.02, 0x8a6a3a, -0.56, 1.33, 0.045, [0, 0, 0.15]));
  bits.push({ geo: new THREE.SphereGeometry(0.035, 5, 4), c: 0xff3050, p: [-0.09, 1.3, 0.125] });
  vmesh(nub, bits, false, night, KC);
  // the rope bridle from the hook ring to both stick ends, knotted
  const se = SX * H - 0.03, sz = 0.012 * H, rope = 0xc8a060;
  vmesh(swing, [
    stick(0, 0, 0, -se, -DROP, sz, 0.014, rope, 4), stick(0, 0, 0, se, -DROP, sz, 0.014, rope, 4),
    { geo: new THREE.SphereGeometry(0.03, 5, 4), c: rope, p: [-se, -DROP, sz] }, { geo: new THREE.SphereGeometry(0.03, 5, 4), c: rope, p: [se, -DROP, sz] }
  ], false, night, KC);

  // ---------------------------------------------------------------- the sway ----
  const wp = new THREE.Vector3(); let gust = 0;
  g.userData.tick = (t, dt, ctx) => {
    const cars = ctx && ctx.cars;
    if (cars && cars.length) {
      g.getWorldPosition(wp);
      for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c) continue; const dx = c.x - wp.x, dz = c.z - wp.z; if (dx * dx + dz * dz < 196) { gust = Math.min(1, gust + dt * 4); break; } }
    }
    gust = Math.max(0, gust - dt * 0.35);            // a passing car sets him swinging a little more
    const a = 1 + gust * 1.4;
    swing.rotation.z = Math.sin(t * 1.3) * 0.055 * a;
    swing.rotation.x = Math.sin(t * 0.95 + 1.3) * 0.035 * a;
    swing.rotation.y = Math.sin(t * 0.41) * 0.2;       // slowly twisting on the rope
  };
});

// Schunkeln: five Jecken arm in arm under a carnival light string, swaying left and right in 3/4 time, every one with
// a Kölsch Stange. From the left: a clown (fist up: Alaaf!), a cowboy, a Funk in red and white, a bee, a pirate raising
// his glass. The upper bodies sway from the hips, the legs stay planted, the hooked elbows follow every frame.
Veedel.define('schunkeln', { name: 'Schunkel-Jecken', kind: 'karneval', w: 6, d: 2 }, (g, o, K) => {
  const night = K.theme().night, rnd = K.rnd((o && o.seed) || 11);
  const KC = night ? 0.78 : 0;           // at night the light string lights the Jecken (glow colours at 78 %)

  // ---- tiny merge helper: many small parts -> one vertex-coloured mesh ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const VM = K.__vcMatCache || (K.__vcMatCache = {}); // shared vertex-colour materials (one set for all instances)
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  function merge(parts, kc) {            // kc: colour factor for the lamp-lit night look
    const pos = [], nor = [], col = [];
    for (const it of parts) {
      const geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.q) _q.copy(it.q); else { _e.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0); _q.setFromEuler(_e); }
      _p.set(it.p[0], it.p[1], it.p[2]); _s.set(it.s ? it.s[0] : 1, it.s ? it.s[1] : 1, it.s ? it.s[2] : 1); _m.compose(_p, _q, _s); geo.applyMatrix4(_m);
      const pa = geo.attributes.position.array, na = geo.attributes.normal.array; _c.setHex(it.c); if (kc) _c.multiplyScalar(kc);
      for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (let i = 0; i < pa.length / 3; i++) col.push(_c.r, _c.g, _c.b);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return bg;
  }
  const vmesh = (parent, parts, double, glow, kc) => { const m = new THREE.Mesh(merge(parts, kc), vcMat(double, glow)); parent.add(m); return m; };
  const B = (w, h, d, c, x, y, z, r, s) => ({ geo: new THREE.BoxGeometry(w, h, d), c, p: [x, y, z], r, s });
  const C = (rt, rb, h, c, x, y, z, seg, r, s) => ({ geo: new THREE.CylinderGeometry(rt, rb, h, seg || 8), c, p: [x, y, z], r, s });
  const S = (rad, c, x, y, z, seg, s) => ({ geo: new THREE.SphereGeometry(rad, seg || 6, Math.max(3, Math.round((seg || 6) * 0.7))), c, p: [x, y, z], s });
  const T = (rad, tube, c, x, y, z, r, s) => ({ geo: new THREE.TorusGeometry(rad, tube, 3, 12), c, p: [x, y, z], r, s });
  // a rod between two points (light string, ties)
  const ROD = (ax, ay, az, bx, by, bz, rad, c, seg) => { _a.set(ax, ay, az); _b.set(bx, by, bz); const len = _a.distanceTo(_b); return { geo: new THREE.CylinderGeometry(rad, rad, len, seg || 4), c, p: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], q: new THREE.Quaternion().setFromUnitVectors(UP, _d.subVectors(_b, _a).normalize()) }; };
  // a Kölsch Stange (with foam) standing at x,y(bottom),z
  const stange = (x, y, z) => [C(0.036, 0.031, 0.2, 0xf5b400, x, y + 0.1, z, 7), C(0.037, 0.037, 0.035, 0xffffff, x, y + 0.215, z, 7)];

  // ---- local arm poses (person space, before the person's scale) ----
  const SHX = 0.21, SHY = 1.36, HIP = 0.9;                       // shoulders; the hip line the upper body sways about
  const WR_R = [0.19, 1.2, 0.26], WR_L = [-0.19, 1.13, 0.24];   // glass hand in front of the chest, fist on the other side
  const EL_R = [0.44, 1.16, 0.06], EL_L = [-0.44, 1.16, 0.06];  // rest elbows (the linked ones are recomputed every frame)
  const UPR = { el: [0.36, 1.56, 0.07], wr: [0.34, 1.83, 0.11] }; // a raised arm (mirrored for the left)

  const RED = 0xd81e2c, WHITE = 0xf8f6f0, BLACK = 0x141414, YEL = 0xffd400, GOLD = 0xe8b020;
  const JECKEN = [
    { // the clown: white face, red nose, orange curly wig, tiny green hat, giant shoes
      o: { h: 1.72, shirt: 0x2a9df4, pants: YEL, shoes: 0xe01010, skin: 0xfaf4ec, hair: 0xff6a00, hat: 'none', lips: true, smile: 1, brow: 4 },
      bigShoes: true, raiseL: true,
      extra: () => {
        const e = [S(0.046, 0xff1010, 0, 1.635, 0.125, 8)];
        for (const q of [[-0.13, 1.63, -0.01, 0.075], [0.13, 1.63, -0.01, 0.075], [-0.12, 1.73, -0.05, 0.07], [0.12, 1.73, -0.05, 0.07], [0, 1.77, -0.09, 0.075], [-0.07, 1.8, 0.03, 0.06], [0.07, 1.8, 0.03, 0.06], [0, 1.68, -0.13, 0.07]]) e.push(S(q[3], 0xff6a00, q[0], q[1], q[2], 6));
        e.push(T(0.13, 0.045, WHITE, 0, 1.455, 0, [Math.PI / 2, 0, 0], [1, 0.85, 1]));             // ruff
        for (let k = 0; k < 3; k++) e.push(S(0.032, [RED, 0x2fa84f, RED][k], 0, 1.27 - k * 0.15, 0.13 - k * 0.006, 6));  // pompom buttons
        e.push(C(0.09, 0.09, 0.012, 0x2fa84f, 0.05, 1.85, 0, 10, [0, 0, 0.35]), C(0.05, 0.055, 0.1, 0x2fa84f, 0.07, 1.9, 0, 8, [0, 0, 0.35]), C(0.056, 0.056, 0.02, RED, 0.063, 1.875, 0, 8, [0, 0, 0.35]));
        return e;
      }
    },
    { // the cowboy: brown hat, mustard shirt, leather vest, red neckerchief, sheriff star, toy revolver
      o: { h: 1.86, shirt: 0xe0a030, pants: 0x3a5a9a, shoes: 0x6a3a1a, hair: 0x5a3a20, moustache: 0x5a3a20, hat: 'none', smile: 1, skin: 0xe0ac69 },
      extra: () => [
        C(0.24, 0.24, 0.022, 0x8a5a2a, 0, 1.745, 0, 12, [0.06, 0, 0], [1, 1, 0.85]), C(0.1, 0.12, 0.16, 0x8a5a2a, 0, 1.83, -0.005, 9), C(0.122, 0.122, 0.035, 0x3a2414, 0, 1.775, -0.005, 9),
        B(0.05, 0.03, 0.18, 0x6a4020, 0, 1.905, -0.005),                                            // crease
        B(0.1, 0.4, 0.03, 0x6a4020, -0.085, 1.16, 0.118), B(0.1, 0.4, 0.03, 0x6a4020, 0.085, 1.16, 0.118), B(0.3, 0.44, 0.03, 0x6a4020, 0, 1.15, -0.112),
        { geo: new THREE.ConeGeometry(0.08, 0.15, 4), c: RED, p: [0, 1.36, 0.11], r: [Math.PI, Math.PI / 4, 0], s: [1, 1, 0.4] },
        C(0.162, 0.162, 0.05, 0x241810, 0, 0.87, 0, 10, null, [1, 1, 0.78]), B(0.07, 0.055, 0.02, GOLD, 0, 0.87, 0.128),
        C(0.038, 0.038, 0.012, GOLD, -0.085, 1.26, 0.138, 5, [Math.PI / 2, 0, 0]),                   // sheriff star
        B(0.06, 0.17, 0.08, 0x5a3418, 0.195, 0.78, 0.02), B(0.035, 0.08, 0.05, 0x9a9aa0, 0.195, 0.9, 0.035, [0.3, 0, 0])
      ]
    },
    { // the Funk: red tunic, white trousers, cross belts, black gaiters, tricorn, white wig with pigtail, wooden rifle with a flower
      o: { h: 1.8, shirt: RED, pants: WHITE, shoes: BLACK, hair: 0xf2f2f2, hat: 'none', smile: 1, moustache: 0x5a3a20, skin: 0xffdbac },
      whiteGloves: true,
      extra: () => [
        B(0.055, 0.64, 0.02, WHITE, 0, 1.12, 0.128, [0, 0, 0.5]), B(0.055, 0.64, 0.02, WHITE, 0, 1.12, 0.13, [0, 0, -0.5]),
        B(0.3, 0.07, 0.02, WHITE, 0, 0.87, 0.105), B(0.06, 0.06, 0.025, GOLD, 0, 1.13, 0.142),
        B(0.13, 0.3, 0.13, BLACK, -0.11, 0.24, 0.0), B(0.13, 0.3, 0.13, BLACK, 0.11, 0.24, 0.0),        // gaiters
        C(0.215, 0.215, 0.05, BLACK, 0, 1.76, 0, 3), C(0.232, 0.232, 0.03, WHITE, 0, 1.745, 0, 3),     // tricorn with white trim
        { geo: new THREE.SphereGeometry(0.122, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), c: BLACK, p: [0, 1.74, 0] },
        S(0.035, RED, 0.1, 1.81, 0.12, 6), S(0.02, WHITE, 0.1, 1.81, 0.145, 5),                    // cockade
        C(0.022, 0.012, 0.16, WHITE, 0, 1.53, -0.13, 5, [-0.3, 0, 0]), B(0.08, 0.035, 0.02, BLACK, 0, 1.6, -0.125),   // pigtail + bow
        B(0.04, 0.95, 0.05, 0x8a5a2a, 0, 1.12, -0.17, [0, 0, 0.55]), C(0.012, 0.012, 0.25, 0x555555, -0.28, 1.6, -0.17, 5, [0, 0, 0.55]),
        S(0.05, 0xff3050, -0.36, 1.73, -0.17, 6)                                                   // flower in the barrel
      ]
    },
    { // the bee: yellow-black stripes, black tutu with a yellow ring, antennae, see-through wings, stinger
      o: { h: 1.64, shirt: YEL, pants: BLACK, shoes: BLACK, dress: BLACK, hair: 0x6a4020, hairStyle: 'short', lips: true, smile: 1, hat: 'none', skin: 0xf1c27d },
      wings: true,
      extra: () => [
        C(0.158, 0.152, 0.06, BLACK, 0, 0.98, 0, 10, null, [1, 1, 0.76]), C(0.166, 0.16, 0.06, BLACK, 0, 1.12, 0, 10, null, [1, 1, 0.76]), C(0.186, 0.176, 0.06, BLACK, 0, 1.26, 0, 10, null, [1, 1, 0.76]),
        C(0.232, 0.25, 0.07, YEL, 0, 0.69, 0, 10),
        S(0.075, 0x6a4020, -0.1, 1.6, -0.08, 6), S(0.075, 0x6a4020, 0.1, 1.6, -0.08, 6), S(0.06, 0x6a4020, -0.13, 1.5, -0.08, 6), S(0.06, 0x6a4020, 0.13, 1.5, -0.08, 6),  // two pigtails
        C(0.008, 0.008, 0.22, BLACK, -0.085, 1.86, 0.0, 4, [0, 0, 0.35]), C(0.008, 0.008, 0.22, BLACK, 0.085, 1.86, 0.0, 4, [0, 0, -0.35]),
        S(0.035, YEL, -0.125, 1.965, 0.0, 6), S(0.035, YEL, 0.125, 1.965, 0.0, 6),
        { geo: new THREE.ConeGeometry(0.045, 0.14, 6), c: BLACK, p: [0, 0.6, -0.3], r: [-Math.PI / 2 - 0.3, 0, 0] }
      ]
    },
    { // the pirate: striped shirt in red and white, red sash, eye patch, black tricorn with a skull, earring, hook
      o: { h: 1.78, shirt: WHITE, pants: 0x1a1a1a, shoes: 0x3a2a1a, hair: 0x1a1a1a, beard: 0x1a1a1a, heavy: true, hat: 'none', smile: 1, skin: 0xc68642 },
      raiseR: true, hook: true,
      extra: () => [
        C(0.182, 0.176, 0.05, RED, 0, 1.0, 0, 10, null, [1, 1, 0.76]), C(0.19, 0.182, 0.05, RED, 0, 1.13, 0, 10, null, [1, 1, 0.76]), C(0.205, 0.198, 0.05, RED, 0, 1.26, 0, 10, null, [1, 1, 0.76]),
        C(0.2, 0.2, 0.09, 0xa01020, 0, 0.87, 0, 10, null, [1, 1, 0.78]), B(0.07, 0.24, 0.02, 0xa01020, 0.14, 0.74, 0.1, [0, 0, 0.2]),
        B(0.055, 0.046, 0.02, BLACK, -0.048, 1.668, 0.107), T(0.123, 0.006, BLACK, 0, 1.7, 0, [Math.PI / 2, 0, 0.32]),
        { geo: new THREE.TorusGeometry(0.018, 0.005, 3, 8), c: GOLD, p: [0.117, 1.6, 0.0], r: [0, Math.PI / 2, 0] },
        C(0.22, 0.22, 0.05, BLACK, 0, 1.765, 0, 3), { geo: new THREE.SphereGeometry(0.126, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), c: BLACK, p: [0, 1.745, 0] },
        S(0.035, WHITE, 0, 1.8, 0.118, 6), B(0.07, 0.014, 0.01, WHITE, 0, 1.765, 0.133, [0, 0, 0.6]), B(0.07, 0.014, 0.01, WHITE, 0, 1.765, 0.133, [0, 0, -0.6])
      ]
    }
  ];

  // ---------------------------------------------------------------- build the row ----
  // every Jeck gets an upper-body group pivoting at the hip line; arms, head and torso live in it, the legs stay put
  const SP = 0.93, ppl = [];
  const setSeg = (m, ax, ay, az, bx, by, bz) => {        // upper-body coordinates (y measured from the hip line)
    _d.set(bx - ax, by - ay, bz - az); const L = _d.length(); _d.multiplyScalar(1 / L);
    m.quaternion.setFromUnitVectors(UP, _d); m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); m.scale.set(1, L / m.userData.len, 1);
  };
  const setHand = (m, el, wr, k) => { _d.set(wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]).normalize(); m.quaternion.setFromUnitVectors(UP, _d); m.position.set(wr[0] + _d.x * k, wr[1] - HIP + _d.y * k, wr[2] + _d.z * k); };
  const arm = (A, side, el, wr) => { const sx = side === 'L' ? -SHX : SHX; setSeg(A[side].ua, sx, SHY - HIP, 0, el[0], el[1] - HIP, el[2]); setSeg(A[side].fa, el[0], el[1] - HIP, el[2], wr[0], wr[1] - HIP, wr[2]); setHand(A[side].hand, el, wr, 0.035); };
  const lightUp = (ch) => {                               // night: swap to lamp-lit glow materials (never touch a shared material)
    const m = ch.material; if (!m || m.vertexColors) return;
    if (m.map) { const k = 'litface' + m.map.uuid; ch.material = VM[k] || (VM[k] = new THREE.MeshBasicMaterial({ map: m.map, color: 0xc8c8c8 })); }
    else ch.material = K.mat(_c.copy(m.color).multiplyScalar(KC).getHex(), m.transparent ? { glow: true, opacity: m.opacity } : { glow: true });
  };
  const tmpBox = new THREE.Box3();
  JECKEN.forEach((J, i) => {
    const p = K.person(J.o), H = J.o.h / 1.75;
    K.put(g, p, (i - 2) * SP, 0, 0);
    const up = new THREE.Group(); up.position.y = HIP; p.add(up);
    const A = { L: {}, R: {} };
    for (const ch of p.children.slice()) {
      if (!ch.isMesh) continue;
      const gt = ch.geometry.type, px = ch.position.x, py = ch.position.y;
      if (gt === 'CylinderGeometry' && Math.abs(px) > 0.19 && py > 0.75 && py < 1.33) { const sd = px < 0 ? A.L : A.R; if (py > 1.1) sd.ua = ch; else sd.fa = ch; ch.userData.len = ch.geometry.parameters.height; }
      else if (gt === 'SphereGeometry' && Math.abs(px) > 0.2 && py < 1.0) (px < 0 ? A.L : A.R).hand = ch;
      else if (gt === 'BoxGeometry' && ch.geometry.parameters.width < 0.02) { p.remove(ch); continue; }   // jacket zip line: hidden by costumes anyway
      else if (J.bigShoes && gt === 'BoxGeometry' && py < 0.05) { ch.scale.set(1.35, 1.3, 1.75); ch.position.y = 0.035 * 1.3; ch.position.z += 0.08; }
      // everything whose centre lies above the hip line moves into the swaying upper body (arms and hands always)
      if (!ch.geometry.boundingBox) ch.geometry.computeBoundingBox();
      tmpBox.copy(ch.geometry.boundingBox);
      const cy = py + (tmpBox.min.y + tmpBox.max.y) / 2 * ch.scale.y;
      if (cy > HIP || ch === A.L.hand || ch === A.R.hand || ch === A.L.fa || ch === A.R.fa) { p.remove(ch); ch.position.y -= HIP; up.add(ch); }
    }
    // arms: pose the free ones now, the linked ones follow the elbows every frame
    const left = i === 0 && J.raiseL ? { el: [-UPR.el[0], UPR.el[1], UPR.el[2]], wr: [-UPR.wr[0], UPR.wr[1], UPR.wr[2]] } : { el: EL_L, wr: WR_L };
    const right = i === JECKEN.length - 1 && J.raiseR ? UPR : { el: EL_R, wr: WR_R };
    arm(A, 'L', left.el, left.wr); arm(A, 'R', right.el, right.wr);
    if (J.whiteGloves) { A.L.hand.material = K.mat(0xffffff); A.R.hand.material = K.mat(0xffffff); }
    if (J.hook) { A.L.hand.geometry = new THREE.TorusGeometry(0.038, 0.011, 4, 8, Math.PI * 1.4); A.L.hand.material = K.mat(0xc8c8d0); A.L.hand.scale.set(1, 1, 1); }
    if (night) { for (const ch of p.children) if (ch.isMesh) lightUp(ch); for (const ch of up.children) if (ch.isMesh) lightUp(ch); }
    // costume bits + the Kölsch Stange in the right hand: belt-line and below stay with the legs, the rest sways
    const bits = J.extra();
    const gw = right.wr; bits.push(...stange(gw[0] - 0.01, gw[1] - 0.05, gw[2] + 0.03));
    const lo = [], hi = []; for (const b of bits) (b.p[1] > 0.92 ? hi : lo).push(b);
    if (lo.length) vmesh(p, lo, false, night, KC);
    vmesh(up, hi, false, night, KC).position.y = -HIP;
    if (J.wings) {
      const wg = merge([S(0.2, 0xffffff, -0.19, 1.28, -0.16, 8, [0.75, 1.45, 0.12]), S(0.2, 0xffffff, 0.19, 1.28, -0.16, 8, [0.75, 1.45, 0.12])]);
      const wing = new THREE.Mesh(wg, night ? K.mat(0xb8d8f0, { glow: true, opacity: 0.45 }) : K.mat(0xe4f4ff, { opacity: 0.6 })); wing.position.y = -HIP; up.add(wing);
    }
    ppl.push({ g: p, up, H, A, x: (i - 2) * SP, y: 0 });
  });

  // ---------------------------------------------------------------- the floor: confetti, streamers, a crate stack, a barrel ----
  const cp = [], cc = [], CONF = [RED, YEL, 0x2a9df4, 0x2fa84f, 0xff5fa2, 0xffffff, 0xff8a00];
  for (let k = 0; k < 170; k++) {
    const x = (rnd() - 0.5) * 5.8, z = (rnd() - 0.5) * 1.8, s = 0.06 + rnd() * 0.05, r = rnd() * 6.28, y = 0.006 + rnd() * 0.004;
    cp.push(x, y, z, x + s * Math.sin(r), y, z + s * Math.cos(r), x + s * Math.cos(r), y, z - s * Math.sin(r));
    _c.setHex(CONF[k % CONF.length]); if (night) _c.multiplyScalar(0.5); for (let v = 0; v < 3; v++) cc.push(_c.r, _c.g, _c.b);
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); cg.computeVertexNormals();
  g.add(new THREE.Mesh(cg, vcMat(false, night)));
  const floor = [];
  for (let k = 0; k < 7; k++) floor.push(T(0.09 + rnd() * 0.05, 0.012, CONF[(k + 2) % CONF.length], (rnd() - 0.5) * 5.4, 0.012, (rnd() - 0.5) * 1.6, [Math.PI / 2, 0, 0]));
  // crate stack on the left with empties
  floor.push(B(0.46, 0.3, 0.34, 0x1c3f95, -2.62, 0.15, -0.3), B(0.46, 0.3, 0.34, RED, -2.62, 0.45, -0.28, [0, 0.12, 0]), B(0.46, 0.3, 0.34, 0x1c3f95, -2.64, 0.15, 0.12, [0, -0.1, 0]));
  for (let k = 0; k < 4; k++) floor.push(C(0.03, 0.03, 0.14, 0x5a3a14, -2.75 + (k % 2) * 0.2, 0.67, -0.35 + Math.floor(k / 2) * 0.14, 6));
  // barrel on the right as a standing table, with a Kölsch Kranz on top
  floor.push(C(0.3, 0.3, 0.96, 0x8a5a2a, 2.66, 0.48, -0.25, 10), C(0.31, 0.31, 0.06, 0x3a3a3a, 2.66, 0.18, -0.25, 10), C(0.31, 0.31, 0.06, 0x3a3a3a, 2.66, 0.8, -0.25, 10));
  floor.push(C(0.19, 0.19, 0.03, 0x8a5a2a, 2.66, 0.975, -0.25, 10), C(0.012, 0.012, 0.36, 0x6a4020, 2.66, 1.17, -0.25, 5), T(0.06, 0.012, 0x6a4020, 2.66, 1.35, -0.25));
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; floor.push(...stange(2.66 + Math.cos(a) * 0.13, 0.99, -0.25 + Math.sin(a) * 0.13)); }
  // the light string's poles: a broomstick lashed to the crates, a pole tied to the barrel
  const PL = [-2.9, -0.5], PR = [2.94, -0.55], PH = 2.62, SAG = 0.4;
  floor.push(C(0.024, 0.03, PH, 0x7a5a32, PL[0], PH / 2, PL[1], 6), C(0.024, 0.03, PH, 0x7a5a32, PR[0], PH / 2, PR[1], 6));
  floor.push(T(0.04, 0.012, 0xc8a060, PL[0], 0.52, PL[1], [Math.PI / 2, 0, 0]), T(0.04, 0.012, 0xc8a060, PR[0], 0.72, PR[1], [Math.PI / 2, 0, 0]));
  const sAt = (u) => [PL[0] + (PR[0] - PL[0]) * u, PH - 0.04 - Math.sin(u * Math.PI) * SAG, PL[1] + (PR[1] - PL[1]) * u];
  for (let k = 0; k < 14; k++) { const a0 = sAt(k / 14), a1 = sAt((k + 1) / 14); floor.push(ROD(a0[0], a0[1], a0[2], a1[0], a1[1], a1[2], 0.009, 0x2a2a2a, 3)); }
  vmesh(g, floor, false, night, night ? 0.6 : 0);
  // the bulbs: coloured by day, they glow at night
  const bulbs = [], BULB = [RED, YEL, 0x2a9df4, 0x2fa84f, 0xff5fa2, 0xfff4d0];
  for (let k = 0; k < 15; k++) { const a = sAt((k + 0.5) / 15); bulbs.push(C(0.012, 0.012, 0.05, 0x2a2a2a, a[0], a[1] - 0.03, a[2], 4), S(0.048, BULB[k % BULB.length], a[0], a[1] - 0.09, a[2], 6)); }
  vmesh(g, bulbs, false, night);
  // a hurricane lantern on the crates (glows at night)
  K.cyl(g, 0.07, 0.07, 0.02, 0x1a1a1a, -2.52, 0.61, -0.26, 8);
  const lan = K.cyl(g, 0.055, 0.055, 0.16, 0, -2.52, 0.7, -0.26, 8); lan.material = night ? K.mat(0xffc45a, { glow: true }) : K.mat(0xf2d27a);
  K.cyl(g, 0.02, 0.07, 0.06, 0x1a1a1a, -2.52, 0.81, -0.26, 8);

  // ---------------------------------------------------------------- schunkeln ----
  // 1.2 s per swing: the bodies lean a little from the feet, the upper bodies sway more from the hips, three small
  // bounces per swing (3/4 time) and a kick on the LamboBeat. The hooked elbows are solved in world space each frame.
  const OM = Math.PI * 2 / 2.4, AB = 0.035, AU = 0.15, EDROP = 0.2, EZ = 0.06;
  const n = ppl.length;
  let cb = 1, sb = 0, cu = 1, su = 0;
  const wx = (P, ux, uy) => P.x + P.H * (cb * (cu * ux - su * uy) - sb * (HIP + su * ux + cu * uy));   // upper-body point -> world
  const wy = (P, ux, uy) => P.y + P.H * (sb * (cu * ux - su * uy) + cb * (HIP + su * ux + cu * uy));
  const linkArm = (P, side, ex, ey) => {                      // hook this arm's elbow at the world point (ex, ey)
    const dx = (ex - P.x) / P.H, dy = (ey - P.y) / P.H, px = cb * dx + sb * dy, qy = -sb * dx + cb * dy - HIP;
    const lx = cu * px + su * qy, ly = -su * px + cu * qy, lz = EZ / P.H, wr = side === 'R' ? WR_R : WR_L;
    setSeg(P.A[side].ua, side === 'R' ? SHX : -SHX, SHY - HIP, 0, lx, ly, lz); setSeg(P.A[side].fa, lx, ly, lz, wr[0], wr[1] - HIP, wr[2]);
  };
  g.userData.tick = (t, dt, ctx) => {
    const sw = Math.sin(t * OM), tb = sw * AB, tu = sw * AU;
    cb = Math.cos(tb); sb = Math.sin(tb); cu = Math.cos(tu); su = Math.sin(tu);
    let bob = 0.016 * Math.abs(Math.sin(t * OM * 3));         // three little bounces per swing: 3/4 time
    const b = ctx && ctx.beat; if (b && b.playing) bob += (b.pulse || 0) * 0.015;
    for (let i = 0; i < n; i++) { const P = ppl[i]; P.y = 0.21 * Math.abs(sb) * P.H + bob; P.g.position.y = P.y; P.g.rotation.z = tb; P.up.rotation.z = tu; }
    for (let i = 0; i < n - 1; i++) {
      const A = ppl[i], Bp = ppl[i + 1];
      const ax = wx(A, SHX, SHY - HIP), ay = wy(A, SHX, SHY - HIP), bx = wx(Bp, -SHX, SHY - HIP), by = wy(Bp, -SHX, SHY - HIP);
      const ex = (ax + bx) / 2, ey = (ay + by) / 2 - EDROP;
      linkArm(A, 'R', ex, ey); linkArm(Bp, 'L', ex, ey);
    }
  };
  g.userData.tick(0, 0, null);
});

// Dreigestirn on a small red-white parade float: Jungfrau, Prinz and Bauer wave to the Jecken,
// the three sway along at walking pace as if the Wagen were rolling (it stays in place), everybody turns towards passing cars.
Veedel.define('dreigestirn', { name: 'Dreigestirn-Wagen', kind: 'karneval', w: 7, d: 3 }, (g, o, K) => {
  const night = K.theme().night;
  const RED = 0xc1121f, WHITE = 0xf6f2ea, GOLD = 0xffc300, GREEN = 0x2d6a4f, PINK = 0xff5fa2, YEL = 0xffd400;

  // ---- merge helper: many small parts of one colour become one mesh ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const bag = () => {
    const parts = new Map();
    const add = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz, opts) => {
      _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x || 0, y || 0, z || 0); _s.set(sx || 1, sy || 1, sz || 1);
      _m.compose(_p, _q, _s); const q = geo.index ? geo.toNonIndexed() : geo; q.applyMatrix4(_m);
      const key = color + (opts && opts.glow ? 'g' : '') + (opts && opts.double ? 'd' : '');
      if (!parts.has(key)) parts.set(key, { color, opts, list: [] });
      parts.get(key).list.push(q);
    };
    return {
      add,
      box: (w, h, d, c, x, y, z, rx, ry, rz, opts) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz, 1, 1, 1, opts),
      cyl: (rt, rb, h, c, x, y, z, seg, rx, ry, rz, sx, sz, opts) => add(new THREE.CylinderGeometry(rt, rb, h, seg || 8), c, x, y, z, rx, ry, rz, sx || 1, 1, sz || 1, opts),
      cone: (r, h, c, x, y, z, seg, rx, ry, rz, opts) => add(new THREE.ConeGeometry(r, h, seg || 6), c, x, y, z, rx, ry, rz, 1, 1, 1, opts),
      ball: (r, c, x, y, z, seg, sx, sy, sz, opts) => add(new THREE.SphereGeometry(r, seg || 6, (seg || 6) > 6 ? 4 : 3), c, x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1, opts),
      torus: (r, t, c, x, y, z, rx, ry, rz, opts) => add(new THREE.TorusGeometry(r, t, 4, 10), c, x, y, z, rx, ry, rz, 1, 1, 1, opts),
      flush(parent) {
        const out = [];
        parts.forEach(({ color, opts, list }) => {
          let n = 0; for (const q of list) n += q.attributes.position.count;
          const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
          for (const q of list) { pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3); off += q.attributes.position.count; }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          geo.computeBoundingSphere(); out.push(K.part(parent, geo, color, 0, 0, 0, opts));
        });
        parts.clear(); return out;
      }
    };
  };

  // ---- fewer draw calls: a figure moves as a whole, so the game cannot batch it; merge its rigid parts (and, on
  // their own, the parts inside each arm pivot) into one mesh per look (World.human's and K.mat's caches hold
  // identical materials for the same colour, so they are matched by what they look like). `skip` stays separate.
  const slim = (grp, skip) => {
    const lists = new Map();
    for (const c of grp.children.slice()) {
      if (!c.isMesh) { if (c.children.length) slim(c, skip); continue; }
      const m = c.material;
      if ((skip && skip.has(c)) || Array.isArray(m) || c.children.length) continue;
      c.updateMatrix();
      const q = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
      const key = [m.type, m.color ? m.color.getHex() : '', m.map ? m.map.uuid : '', m.side, m.transparent, m.opacity, m.vertexColors].join('|');
      if (!lists.has(key)) lists.set(key, { mat: m, list: [] });
      lists.get(key).list.push(q); grp.remove(c);
    }
    lists.forEach(({ mat, list }) => {
      const uvs = !!mat.map && list.every((q) => q.attributes.uv);
      let n = 0; for (const q of list) n += q.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = uvs ? new Float32Array(n * 2) : null; let off = 0;
      for (const q of list) { pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3); if (uv) uv.set(q.attributes.uv.array, off * 2); off += q.attributes.position.count; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere(); grp.add(new THREE.Mesh(geo, mat));
    });
  };

  // ---- arm rig: re-parent the raised right arm of a K.person into shoulder + elbow pivots ----
  const pivot = (p, px, py, pz, test) => {
    const pv = new THREE.Group(); pv.position.set(px, py, pz);
    for (const c of p.children.slice()) if (c.isMesh && test(c.position)) { p.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; pv.add(c); }
    p.add(pv); return pv;
  };
  const waveRig = (p) => { const sh = pivot(p, 0.21, 1.36, 0, (v) => v.x > 0.17 && v.y > 1.2); const el = pivot(sh, 0.17, 0.14, 0.02, (v) => v.y > 0.2); return { sh, el }; };

  // ================= the float =================
  // it stands still (the game batches everything that does not move into a few draw calls);
  // the walking-pace motion is in the people on it, who sway along like on a rolling Wagen
  const wheels = bag();
  for (const x of [-2.2, 2.2]) for (const z of [-1.02, 1.02]) wheels.cyl(0.34, 0.34, 0.22, 0x1a1a1a, x, 0.34, z, 10, Math.PI / 2);
  wheels.box(0.2, 0.08, 0.1, 0x3a3a3a, 3.33, 0.42, 0); // drawbar stub
  wheels.flush(g);

  const deck = new THREE.Group(); g.add(deck);
  const f = bag();
  const DY = 1.15; // deck height
  f.box(6.5, DY - 0.3, 2.7, WHITE, 0, (DY + 0.3) / 2, 0);                  // skirt
  // red rim, its top 8 mm above the skirt top so the two faces do not fight
  for (const zs of [1, -1]) f.box(6.62, 0.14, 0.08, RED, 0, DY - 0.062, zs * 1.37);
  for (const xs of [1, -1]) f.box(0.08, 0.14, 2.66, RED, xs * 3.27, DY - 0.062, 0);
  f.box(6.56, 0.1, 2.76, RED, 0, 0.36, 0);                                 // bottom band
  // painted panel frames on the long sides (front + back) and the ends
  for (const zs of [1, -1]) {
    for (const x of [-3.22, -1.68, 1.68, 3.22]) f.box(0.07, 0.62, 0.02, RED, x, 0.68, zs * 1.355);
    // diamond band (Rautenband) under the rim
    if (zs > 0) for (let i = 0; i < 28; i++) { const x = -3.1 + i * 0.23; f.box(0.11, 0.11, 0.02, i % 2 ? GOLD : RED, x, 0.94, zs * 1.357, 0, 0, Math.PI / 4); }
  }
  for (const xs of [1, -1]) f.box(0.02, 0.5, 2.3, RED, xs * 3.255, 0.66, 0); // end panels
  // Cologne coat of arms on the front panels: red chief with three golden crowns, white field with eleven black flames
  for (const cx of [-2.45, 2.45]) {
    const z = 1.36;
    f.box(0.84, 0.66, 0.02, GOLD, cx, 0.66, z);
    f.box(0.76, 0.24, 0.02, RED, cx, 0.86, z + 0.012);
    f.box(0.76, 0.34, 0.02, 0xffffff, cx, 0.57, z + 0.012);
    for (let k = -1; k <= 1; k++) {
      f.box(0.13, 0.05, 0.02, GOLD, cx + k * 0.22, 0.83, z + 0.025);
      for (let s = -1; s <= 1; s++) f.cone(0.022, 0.07, GOLD, cx + k * 0.22 + s * 0.05, 0.88, z + 0.025, 4);
    }
    for (let i = 0; i < 11; i++) { const row = i < 6 ? 0 : 1, col = row ? i - 6 : i; f.cone(0.03, 0.09, 0x111111, cx + (col - (row ? 2 : 2.5)) * 0.11, 0.66 - row * 0.15, z + 0.025, 4, Math.PI); }
  }
  // flower planter along the front edge and the back edge, packed with Strüßjer colours
  const FL = [RED, 0xffffff, YEL, PINK];
  for (const zs of [1, -1]) {
    f.box(6.3, 0.16, 0.2, GREEN, 0, DY + 0.08, zs * 1.22);
    const n = zs > 0 ? 25 : 14, sp = 6.0 / (n - 1);
    for (let i = 0; i < n; i++) f.ball(zs > 0 ? 0.085 : 0.11, FL[(i + (zs < 0 ? 2 : 0)) % 4], -3.0 + i * sp, DY + 0.2, zs * 1.22 + (i % 2 ? 0.04 : -0.03), 6);
  }
  // light bulbs on the rim
  for (let i = 0; i < 15; i++) f.ball(0.045, night ? 0xfff2a8 : 0xfffbe8, -3.08 + i * 0.44, DY - 0.065, 1.425, 5, 1, 1, 1, night ? { glow: true } : null);
  // red carpet + Prinz pedestal
  f.box(4.4, 0.02, 1.5, RED, 0, DY + 0.01, -0.05);
  f.box(0.9, 0.2, 0.8, GOLD, 0, DY + 0.1, 0.0);
  f.box(0.94, 0.05, 0.84, RED, 0, DY + 0.2, 0.0);
  // corner posts with red-white stripes, pompoms and little Cologne flags (red over white)
  for (const xs of [-1, 1]) {
    const x = xs * 3.02;
    f.cyl(0.05, 0.05, 1.8, 0xffffff, x, DY + 0.9, 0.9, 6);
    for (let k = 0; k < 3; k++) f.cyl(0.056, 0.056, 0.3, RED, x, DY + 0.15 + k * 0.6, 0.9, 6);
    f.ball(0.14, night ? 0xffe08a : GOLD, x, DY + 1.95, 0.9, 8, 1, 1, 1, night ? { glow: true } : null);
    f.box(0.62, 0.17, 0.03, RED, x - xs * 0.34, DY + 1.72, 0.9);
    f.box(0.62, 0.17, 0.03, 0xffffff, x - xs * 0.34, DY + 1.55, 0.9);
    // Strüßjer urn at the back corner
    f.cyl(0.22, 0.14, 0.36, GOLD, x - xs * 0.15, DY + 0.18, -0.8, 8);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; f.ball(0.1, FL[k % 4], x - xs * 0.15 + Math.cos(a) * 0.14, DY + 0.46 + (k % 2) * 0.06, -0.8 + Math.sin(a) * 0.14, 6); }
    f.ball(0.12, 0x3f8a3a, x - xs * 0.15, DY + 0.52, -0.8, 6);
  }
  f.flush(deck);
  // lettering
  K.text(deck, 'KÖLLE ALAAF', { fg: '#ffffff', bg: '#c1121f', w: 3.1, h: 0.56, x: 0, y: 0.66, z: 1.372, glow: night, border: '#ffc300', sizeK: 0.62 });
  K.text(deck, 'ALAAF!', { fg: '#c1121f', bg: '#ffffff', w: 1.6, h: 0.4, x: 0, y: 0.66, z: -1.372, ry: Math.PI, glow: night, border: '#c1121f' });
  // the ends face the traffic coming along the street
  for (const xs of [1, -1]) K.text(deck, 'DREIGESTIRN', { fg: '#ffffff', bg: '#c1121f', w: 2.1, h: 0.42, x: xs * 3.272, y: 0.66, z: 0, ry: xs * Math.PI / 2, glow: night, border: '#ffc300', sizeK: 0.6 });
  const NG = night ? { glow: true } : null; // gold regalia catch the float lights after dark

  // ================= the Dreigestirn =================
  // --- Jungfrau (left): burly fellow as a blonde maiden with braids and a crown
  const jung = K.person({ h: 1.84, heavy: true, skin: 0xffcfa0, hair: 0xf2c94c, shirt: RED, pants: WHITE, shoes: RED, wave: true, lips: true, age: 1, smile: 1, eyes: '#3a6aa8' });
  const jr = waveRig(jung);
  {
    const b = bag();
    b.cyl(0.2, 0.42, 0.9, WHITE, 0, 0.45, 0, 12);                          // gown
    b.cyl(0.43, 0.43, 0.07, GOLD, 0, 0.04, 0, 12);                         // hem
    b.cyl(0.3, 0.31, 0.05, GOLD, 0, 0.47, 0, 12);                          // gown band
    b.cyl(0.185, 0.185, 0.07, GOLD, 0, 0.9, 0, 10, 0, 0, 0, 1, 0.75);      // belt
    b.box(0.08, 0.62, 0.02, RED, 0, 0.55, 0.298, -0.24);                   // front panel
    // long blonde hair down the back of the head (World.human's 'long' style would cover half the face)
    b.add(new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI, 0, Math.PI * 0.8), 0xf2c94c, 0, 1.6, -0.02, 0, Math.PI, 0);
    // braids from behind the ears forward over the shoulders, with red bows
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 6; k++) b.ball(0.045 - k * 0.003, 0xf2c94c, sx * (0.125 + k * 0.012), 1.6 - k * 0.085, -0.035 + k * 0.036, 6);
      b.box(0.1, 0.05, 0.03, RED, sx * 0.19, 1.12, 0.165);
    }
    // golden crown with points and red jewels
    b.cyl(0.13, 0.125, 0.08, GOLD, 0, 1.8, 0, 10, 0, 0, 0, 1, 1, NG);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.cone(0.03, 0.1, GOLD, Math.sin(a) * 0.115, 1.88, Math.cos(a) * 0.115, 4, 0, 0, 0, NG); }
    b.ball(0.022, RED, 0, 1.8, 0.13, 5); b.ball(0.018, 0x1c3f95, 0.07, 1.8, 0.11, 5); b.ball(0.018, 0x1c3f95, -0.07, 1.8, 0.11, 5);
    // Strüßje in the left hand
    b.cone(0.07, 0.2, 0xffffff, -0.26, 0.72, 0.1, 6, Math.PI);
    b.ball(0.05, PINK, -0.26, 0.86, 0.1, 6); b.ball(0.045, YEL, -0.3, 0.84, 0.14, 6); b.ball(0.045, RED, -0.22, 0.85, 0.15, 6); b.ball(0.04, 0xffffff, -0.25, 0.88, 0.05, 6);
    b.flush(jung);
  }
  slim(jung);
  K.put(deck, jung, -1.45, DY + 0.02, 0.2, 0.18); // on the red carpet (2 cm), not in it

  // --- Prinz (centre, on the pedestal): glittering white-silver outfit, red cape, cap with a fan of pheasant feathers
  const prinz = K.person({ h: 1.8, skin: 0xf1c27d, hair: 0x5a3a20, shirt: 0xeef2f6, pants: 0xeef2f6, shoes: RED, wave: true, smile: 1 });
  const pr = waveRig(prinz);
  let glitA, glitB;
  {
    const b = bag();
    b.box(0.5, 0.98, 0.03, RED, 0, 0.98, -0.155, 0.06);                     // cape
    b.box(0.52, 0.05, 0.035, GOLD, 0, 0.5, -0.125, 0.06);                   // cape hem
    b.box(0.07, 0.55, 0.02, GOLD, 0, 1.17, 0.125, 0, 0, 0.62);              // sash
    b.cyl(0.165, 0.165, 0.06, GOLD, 0, 0.87, 0, 10, 0, 0, 0, 1, 0.75);     // belt
    for (const sx of [-1, 1]) b.box(0.13, 0.04, 0.13, GOLD, sx * 0.21, 1.445, 0); // epaulettes
    for (const sx of [-1, 1]) b.cyl(0.075, 0.075, 0.1, RED, sx * 0.11, 0.42, 0.01, 8); // red garters
    // cap: red with golden trim and a brooch
    b.cyl(0.132, 0.126, 0.14, RED, 0, 1.79, 0, 12);
    b.cyl(0.138, 0.138, 0.035, GOLD, 0, 1.735, 0, 12, 0, 0, 0, 1, 1, NG);
    b.ball(0.035, GOLD, 0, 1.79, 0.13, 6, 1, 1, 1, NG);
    // the fan: 13 pheasant feathers, banded tan/brown, leaning back a little
    const tilt = -0.28, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let i = 0; i < 13; i++) {
      const a = -1.3 + i * (2.6 / 12), L = 1.02 - 0.3 * Math.abs(a) / 1.3;
      const dx = Math.sin(a), dy = Math.cos(a) * ct, dz = Math.cos(a) * st;
      const segs = [[0, 0.42, 0xd9a441, 0.034, 0.014], [0.42, 0.78, 0x6b3e1f, 0.032, 0.034], [0.78, 1.0, 0xd9a441, 0.006, 0.032]];
      for (const [s0, s1, col, rt, rb] of segs) {
        const mid = (s0 + s1) / 2 * L, len = (s1 - s0) * L;
        b.add(new THREE.CylinderGeometry(rt, rb, len, 4), col, dx * mid, 1.84 + dy * mid, -0.03 + dz * mid, tilt, 0, -a, 1, 1, 0.35);
      }
    }
    b.flush(prinz);
    // glitter: two sets of sequins that twinkle in turn
    const sa = bag(), sb = bag();
    const spots = [[-0.08, 1.3, 0.13], [0.09, 1.05, 0.13], [-0.1, 0.98, 0.125], [0.06, 1.34, 0.135], [-0.11, 0.66, 0.08], [0.12, 0.6, 0.08], [0.0, 1.15, 0.14], [-0.2, 1.1, -0.17], [0.18, 0.8, -0.17], [0.0, 1.25, -0.17]];
    spots.forEach(([x, y, z], i) => (i % 2 ? sa : sb).box(0.05, 0.05, 0.02, 0xffffff, x, y, z, 0, 0, Math.PI / 4, { glow: true }));
    glitA = sa.flush(prinz)[0]; glitB = sb.flush(prinz)[0];
    // Pritsche (the Prinz's slapstick) in the left hand
    const pb = bag();
    pb.box(0.06, 0.5, 0.025, RED, -0.26, 0.93, 0.17, 0.65);
    pb.box(0.075, 0.08, 0.035, GOLD, -0.26, 1.14, 0.3, 0.65);
    pb.flush(prinz);
  }
  slim(prinz, new Set([glitA, glitB]));
  K.put(deck, prinz, 0, DY + 0.225, 0.05);

  // --- Bauer (right): green jacket, city-wall crown with towers and peacock feathers, the big Stadtschlüssel
  const bauer = K.person({ h: 1.84, heavy: true, skin: 0xe0ac69, hair: 0x3a2a1a, shirt: GREEN, pants: WHITE, shoes: 0x1a1a1a, wave: true, moustache: 0x3a2a1a, smile: 1 });
  const br = waveRig(bauer);
  {
    const b = bag();
    const STONE = 0xe3d3a6;
    b.cyl(0.25, 0.2, 0.34, STONE, 0, 1.9, 0, 14);                           // the wall
    b.cyl(0.21, 0.21, 0.05, GOLD, 0, 1.745, 0, 14, 0, 0, 0, 1, 1, NG);     // golden band
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + 0.26; b.box(0.07, 0.08, 0.05, STONE, Math.sin(a) * 0.23, 2.1, Math.cos(a) * 0.23, 0, a); } // crenellations
    for (const a of [0.78, -0.78, 2.36, -2.36]) {                           // four towers with red roofs
      const x = Math.sin(a) * 0.24, z = Math.cos(a) * 0.24;
      b.cyl(0.07, 0.07, 0.5, STONE, x, 1.97, z, 8);
      b.cone(0.095, 0.18, RED, x, 2.31, z, 8);
      b.box(0.03, 0.06, 0.02, 0x222222, x * 1.3, 2.08, z * 1.3, 0, a);
    }
    b.box(0.09, 0.13, 0.03, 0x3a2a1a, 0, 1.84, 0.235);                      // city gate
    for (const [x, rz, hgt] of [[0, 0, 0.5], [-0.07, 0.25, 0.44], [0.07, -0.25, 0.44]]) { // peacock feathers
      // the quill runs from the top of the wall (x, 2.07) straight to its eye (tx, ty)
      b.cyl(0.008, 0.008, hgt, 0x2d6a4f, x - Math.sin(rz) * hgt / 2, 2.07 + Math.cos(rz) * hgt / 2, -0.02, 4, 0, 0, rz);
      const tx = x - Math.sin(rz) * hgt, ty = 2.07 + Math.cos(rz) * hgt;
      b.ball(0.06, 0x1a9a8a, tx - 0.0, ty, -0.02, 6, 0.9, 1.4, 0.4);
      b.ball(0.028, 0x1c3f95, tx, ty, 0.005, 5, 1, 1.3, 0.5);
    }
    // gold buttons and belt on the jacket
    for (let k = 0; k < 4; k++) b.ball(0.02, GOLD, 0, 1.3 - k * 0.12, 0.16, 5);
    b.cyl(0.19, 0.19, 0.07, 0x5a3a20, 0, 0.9, 0, 10, 0, 0, 0, 1, 0.78);
    b.box(0.08, 0.07, 0.02, GOLD, 0, 0.9, 0.15);
    // the Stadtschlüssel, held upright in the left hand
    const KX = -0.31, KZ = 0.14;
    b.cyl(0.032, 0.032, 0.66, GOLD, KX, 1.04, KZ, 8, 0, 0, 0, 1, 1, NG);
    b.torus(0.11, 0.035, GOLD, KX, 1.47, KZ, 0, 0, 0, NG);
    b.ball(0.05, RED, KX, 1.47, KZ, 6, 1, 1, 0.5);
    b.box(0.16, 0.06, 0.04, GOLD, KX - 0.08, 0.76, KZ, 0, 0, 0, NG);
    b.box(0.12, 0.05, 0.04, GOLD, KX - 0.06, 0.84, KZ, 0, 0, 0, NG);
    b.box(0.05, 0.12, 0.08, RED, KX, 1.34, KZ);                             // ribbon
    b.flush(bauer);
  }
  slim(bauer);
  K.put(deck, bauer, 1.45, DY + 0.02, 0.2, -0.18);

  // ================= animation =================
  const crew = [
    { p: jung, rig: jr, ry: 0.18, ph: 0.0, s: jung.scale.y },
    { p: prinz, rig: pr, ry: 0.0, ph: 2.1, s: prinz.scale.y },
    { p: bauer, rig: br, ry: -0.18, ph: 4.0, s: bauer.scale.y }
  ];
  const lp = new THREE.Vector3();
  let wph = 0, look = 0, near = 0, lastT = -1;
  g.userData.tick = (t, dt, ctx) => {
    dt = Math.min(dt || 0.016, 0.1);
    // nearest car, in the prop's own frame
    let best = 1e9, bx = 0, bz = 1;
    const cars = ctx && ctx.cars;
    if (cars) for (let i = 0; i < cars.length; i++) { lp.copy(cars[i]); g.worldToLocal(lp); const d2 = lp.x * lp.x + lp.z * lp.z; if (d2 < best) { best = d2; bx = lp.x; bz = lp.z; } }
    const nTarget = best < 625 ? 1 - Math.sqrt(best) / 25 : 0;
    const lTarget = nTarget > 0 && bz > -2 ? Math.max(-0.7, Math.min(0.7, Math.atan2(bx, Math.max(bz, 0.5)))) : 0;
    const k = Math.min(1, dt * 3); near += (nTarget - near) * k; look += (lTarget - look) * k;
    const beat = ctx && ctx.beat, pulse = beat ? beat.pulse || 0 : 0;
    wph += dt * 6.5 * (1 + near * 0.8 + pulse * 0.3);
    if (lastT < 0) wph += t * 6.5; lastT = t;
    // walking pace: all three sway together like on a rolling Wagen (schunkeln) and give at the knees on every
    // step, feet planted; the kick of the song makes the dip a little deeper
    const w = t * Math.PI * 1.8, sway = Math.sin(w) * 0.035, dip = 0.01 * (0.5 - 0.5 * Math.cos(w * 2)) + 0.015 * pulse;
    for (let i = 0; i < 3; i++) {
      const c = crew[i];
      c.p.rotation.y = c.ry * (1 - near) + look * near * 0.8 + Math.sin(t * 0.7 + c.ph) * 0.06;
      c.p.rotation.z = sway;
      c.p.scale.y = c.s * (1 - dip);
      c.rig.el.rotation.z = Math.sin(wph + c.ph) * (0.45 + near * 0.2);
      c.rig.sh.rotation.z = Math.sin(wph * 0.5 + c.ph) * 0.12 - near * 0.1;
    }
    // sequins twinkle
    const tw = Math.floor(t * 5) % 2 === 0;
    glitA.visible = tw; glitB.visible = !tw;
  };
});

// Kamellewagen: a decorated Bollerwagen overflowing with Kamelle bags and Strüßjer, pulled by a clown,
// a Jeck in a bee costume on top throws sweets that arc onto the pavement; a little pirate catches them
// in an upside-down umbrella and hops for joy.
Veedel.define('kamellewagen', { name: 'Kamellewagen', kind: 'karneval', w: 4, d: 2.2 }, (g, o, K) => {
  const night = K.theme().night;
  const RED = 0xc1121f, WHITE = 0xf6f2ea, GOLD = 0xffc300, YEL = 0xffd400, PINK = 0xff5fa2, BLUE = 0x1c7fd6, GREEN = 0x2d9a4f, ORANGE = 0xff8800, WOOD = 0xb5793c, BLACK = 0x1a1a1a;
  const rnd = K.rnd(4711);

  // ---- merge helper: many small parts of one colour become one mesh ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const bag = () => {
    const parts = new Map();
    const put = (geo, color, opts) => {
      const q = geo.index ? geo.toNonIndexed() : geo; q.applyMatrix4(_m);
      const key = color + (opts && opts.glow ? 'g' : '') + (opts && opts.double ? 'd' : '');
      if (!parts.has(key)) parts.set(key, { color, opts, list: [] });
      parts.get(key).list.push(q);
    };
    const add = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz, opts) => {
      _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x || 0, y || 0, z || 0); _s.set(sx || 1, sy || 1, sz || 1);
      _m.compose(_p, _q, _s); put(geo, color, opts);
    };
    return {
      add,
      box: (w, h, d, c, x, y, z, rx, ry, rz, opts) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz, 1, 1, 1, opts),
      cyl: (rt, rb, h, c, x, y, z, seg, rx, ry, rz, opts) => add(new THREE.CylinderGeometry(rt, rb, h, seg || 8), c, x, y, z, rx, ry, rz, 1, 1, 1, opts),
      cone: (r, h, c, x, y, z, seg, rx, ry, rz, opts) => add(new THREE.ConeGeometry(r, h, seg || 6), c, x, y, z, rx, ry, rz, 1, 1, 1, opts),
      ball: (r, c, x, y, z, seg, sx, sy, sz, opts) => add(new THREE.SphereGeometry(r, seg || 6, (seg || 6) > 6 ? 4 : 3), c, x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1, opts),
      // a round rod from point a to point b
      rod(ax, ay, az, bx, by, bz, r, c, seg) {
        _a.set(ax, ay, az); _b.set(bx, by, bz); const len = _a.distanceTo(_b);
        _q.setFromUnitVectors(_up, _b.sub(_a).normalize()); _p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); _s.set(1, 1, 1);
        _m.compose(_p, _q, _s); put(new THREE.CylinderGeometry(r, r, len, seg || 6), c);
      },
      flush(parent) {
        const out = [];
        parts.forEach(({ color, opts, list }) => {
          let n = 0; for (const q of list) n += q.attributes.position.count;
          const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
          for (const q of list) { pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3); off += q.attributes.position.count; }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          geo.computeBoundingSphere(); out.push(K.part(parent, geo, color, 0, 0, 0, opts));
        });
        parts.clear(); return out;
      }
    };
  };
  // fewer draw calls: a figure moves as a whole, so the game cannot batch it; merge its rigid parts (and, on their
  // own, the parts inside each arm pivot) into one mesh per look (World.human's and K.mat's caches hold identical
  // materials for the same colour, so they are matched by what they look like). Meshes in `skip` stay separate.
  const slim = (grp, skip) => {
    const lists = new Map();
    for (const c of grp.children.slice()) {
      if (!c.isMesh) { if (c.children.length) slim(c, skip); continue; }
      const m = c.material;
      if ((skip && skip.has(c)) || Array.isArray(m) || c.children.length) continue;
      c.updateMatrix();
      const q = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
      const key = [m.type, m.color ? m.color.getHex() : '', m.map ? m.map.uuid : '', m.side, m.transparent, m.opacity, m.vertexColors].join('|');
      if (!lists.has(key)) lists.set(key, { mat: m, list: [] });
      lists.get(key).list.push(q); grp.remove(c);
    }
    lists.forEach(({ mat, list }) => {
      const uvs = !!mat.map && list.every((q) => q.attributes.uv);
      let n = 0; for (const q of list) n += q.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = uvs ? new Float32Array(n * 2) : null; let off = 0;
      for (const q of list) { pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3); if (uv) uv.set(q.attributes.uv.array, off * 2); off += q.attributes.position.count; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere(); grp.add(new THREE.Mesh(geo, mat));
    });
  };
  // re-parent the raised right arm of a K.person into shoulder (+ elbow) pivots
  const pivot = (p, px, py, pz, test) => {
    const pv = new THREE.Group(); pv.position.set(px, py, pz);
    for (const c of p.children.slice()) if (c.isMesh && test(c.position)) { p.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; pv.add(c); }
    p.add(pv); return pv;
  };
  const armRig = (p) => { const sh = pivot(p, 0.21, 1.36, 0, (v) => v.x > 0.17 && v.y > 1.2); const el = pivot(sh, 0.17, 0.14, 0.02, (v) => v.y > 0.2); return { sh, el }; };

  // ================= the Bollerwagen =================
  const WX = -0.45, WZ = -0.3, BL = 1.8, BW = 0.95, FLOOR = 0.47, TOP = 0.85; // bed centre, length, width, floor and rail height
  const x0 = WX - BL / 2, x1 = WX + BL / 2, z0 = WZ - BW / 2, z1 = WZ + BW / 2;
  const w = bag();
  // wheels, axles, frame
  for (const x of [x0 + 0.25, x1 - 0.25]) {
    for (const z of [z0 - 0.06, z1 + 0.06]) { w.cyl(0.22, 0.22, 0.08, BLACK, x, 0.22, z, 10, Math.PI / 2); w.cyl(0.08, 0.08, 0.1, RED, x, 0.22, z, 6, Math.PI / 2); }
    w.box(0.05, 0.05, BW + 0.2, 0x333333, x, 0.22, WZ);
  }
  w.box(BL - 0.2, 0.08, 0.1, 0x333333, WX, 0.36, WZ);
  w.box(BL, 0.06, BW, WOOD, WX, FLOOR - 0.03, WZ);                                  // bed
  for (const z of [z0 + 0.02, z1 - 0.02]) { w.box(BL, 0.17, 0.04, WOOD, WX, FLOOR + 0.085, z); w.box(BL, 0.15, 0.04, WOOD, WX, FLOOR + 0.305, z); w.box(BL + 0.04, 0.04, 0.06, RED, WX, TOP, z); }
  for (const x of [x0 + 0.02, x1 - 0.02]) { w.box(0.04, 0.17, BW, WOOD, x, FLOOR + 0.085, WZ); w.box(0.04, 0.15, BW, WOOD, x, FLOOR + 0.305, WZ); w.box(0.06, 0.04, BW + 0.04, RED, x, TOP, WZ); }
  // crepe-paper fringe along the front rail, paper-flower pompoms on the corners
  for (let i = 0; i < 14; i++) w.box(0.1, 0.1, 0.012, i % 2 ? WHITE : RED, x0 + 0.08 + i * 0.126, TOP - 0.07, z1 + 0.035, 0, 0, Math.PI / 4);
  for (const x of [x0, x1]) for (const z of [z0, z1]) w.ball(0.09, (x === x0) === (z === z0) ? RED : WHITE, x, TOP + 0.05, z, 6);
  // fairy lights along the front rail (they glow after dark)
  for (let i = 0; i < 9; i++) w.ball(0.03, night ? 0xfff0a0 : 0xffffff, x0 + 0.1 + i * 0.2, TOP + 0.03, z1 + 0.04, 5, 1, 1, 1, night ? { glow: true } : null);
  // Deichsel (handle) forward to the clown's left hand, with a T-grip
  const HX = 1.25, HY = 0.74, HZ = 0.03;
  w.rod(x1 + 0.02, 0.3, WZ, HX, HY, HZ, 0.025, 0x333333);
  w.rod(HX - 0.06, HY + 0.02, HZ - 0.1, HX + 0.04, HY - 0.02, HZ + 0.12, 0.03, BLACK);
  // Cologne pennant at the back corner
  w.cyl(0.018, 0.018, 1.2, 0x8a5a2a, x0 + 0.05, TOP + 0.5, z1 - 0.05, 5);
  w.box(0.44, 0.13, 0.02, RED, x0 + 0.29, TOP + 0.99, z1 - 0.05);
  w.box(0.44, 0.13, 0.02, 0xffffff, x0 + 0.29, TOP + 0.86, z1 - 0.05);

  // the load: a heap of Kamelle bags, candy boxes and Strüßjer bulging over the rails
  const CANDY = [RED, YEL, BLUE, PINK, GREEN, ORANGE, 0xffffff, 0x8a2be2];
  const TX = -0.5, TZ = WZ - 0.02; // thrower stands here on a Kölsch crate
  w.box(0.42, 0.3, 0.32, 0x1c3f95, TX, FLOOR + 0.15, TZ);
  let placed = 0;
  for (let i = 0; i < 60 && placed < 22; i++) {
    const x = x0 + 0.2 + rnd() * (BL - 0.4), z = z0 + 0.17 + rnd() * (BW - 0.34);
    if (Math.abs(x - TX) < 0.3 && Math.abs(z - TZ) < 0.24) continue;
    const layer = placed < 11 ? 0 : 1, big = rnd() < 0.55;
    const bw = big ? 0.3 : 0.2, bh = big ? 0.34 : 0.18, bd = big ? 0.2 : 0.16;
    const y = FLOOR + bh / 2 + layer * 0.26 + rnd() * 0.04;
    const col = big ? (rnd() < 0.6 ? WHITE : CANDY[Math.floor(rnd() * 6)]) : CANDY[Math.floor(rnd() * CANDY.length)];
    const ry = (rnd() - 0.5) * 1.2, rz = (rnd() - 0.5) * 0.4;
    w.box(bw, bh, bd, col, x, y, z, 0, ry, rz);
    if (big && col === WHITE) w.box(bw + 0.01, 0.06, bd + 0.01, CANDY[placed % 6], x, y + 0.04, z, 0, ry, rz); // printed band on the bag
    placed++;
  }
  // a fat Kamelle sack at the back
  w.ball(0.3, 0xc9a26a, x0 + 0.3, FLOOR + 0.3, WZ + 0.05, 8, 1, 1.15, 0.9);
  w.cyl(0.07, 0.1, 0.12, 0xc9a26a, x0 + 0.3, FLOOR + 0.66, WZ + 0.05, 6);
  w.box(0.2, 0.05, 0.05, RED, x0 + 0.3, FLOOR + 0.62, WZ + 0.05);
  // Strüßjer sticking out of the heap
  const FL = [RED, PINK, YEL, 0xffffff, ORANGE];
  [[x0 + 0.15, z1 - 0.12], [x0 + 0.62, z0 + 0.12], [WX + 0.2, z1 - 0.1], [x1 - 0.2, z0 + 0.14], [x1 - 0.12, z1 - 0.14], [WX - 0.1, z0 + 0.1]].forEach(([x, z], i) => {
    w.cone(0.07, 0.3, 0xffffff, x, 1.02, z, 6, Math.PI);
    w.ball(0.06, 0x3f8a3a, x, 1.17, z, 6);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + i; w.ball(0.055, FL[(i + k) % FL.length], x + Math.cos(a) * 0.06, 1.2 + (k % 2) * 0.03, z + Math.sin(a) * 0.06, 6); }
  });
  // Kamelle already lying on the pavement
  for (let i = 0; i < 9; i++) {
    const x = -1.2 + i * 0.34 + (rnd() - 0.5) * 0.15, z = 0.62 + rnd() * 0.45;
    if (x > -1.3 && x < -0.75) continue;
    w.box(0.14, 0.07, 0.09, CANDY[i % CANDY.length], x, 0.035, z, 0, rnd() * 3, 0);
  }
  w.cone(0.06, 0.24, 0xffffff, 0.35, 0.062, 0.95, 6, 0, 0, Math.PI / 2); w.ball(0.06, PINK, 0.21, 0.062, 0.95, 6); // a fallen Strüßje
  w.flush(g);
  K.text(g, 'KAMELLE!', { fg: '#c1121f', bg: '#ffd400', w: 1.36, h: 0.3, x: WX + 0.18, y: FLOOR + 0.16, z: z1 + 0.026, glow: night, border: '#c1121f', sizeK: 0.66 });

  // ================= the Jecken =================
  // the bee on top: throwing arm, sweets bag in the other hand
  const bee = K.person({ h: 1.72, skin: 0xffdbac, hair: 0x6a3a1a, shirt: YEL, pants: BLACK, shoes: BLACK, wave: true, smile: 1, bag: 0xffffff });
  const beeRig = armRig(bee);
  {
    const b = bag();
    for (const [y, r] of [[1.0, 0.152], [1.13, 0.162], [1.26, 0.178]]) b.add(new THREE.TorusGeometry(r, 0.032, 4, 12), BLACK, 0, y, 0, Math.PI / 2, 0, 0, 1, 0.72, 1);
    for (const sx of [-1, 1]) {
      b.rod(sx * 0.04, 1.76, 0.0, sx * 0.13, 2.0, 0.05, 0.01, BLACK, 4); b.ball(0.035, BLACK, sx * 0.13, 2.01, 0.05, 6);
      b.add(new THREE.SphereGeometry(0.2, 8, 4), 0xdff3ff, sx * 0.17, 1.32, -0.17, 0, sx * 0.35, sx * 0.55, 1, 0.55, 0.12);
    }
    b.cone(0.045, 0.14, BLACK, 0, 0.86, -0.15, 6, -Math.PI / 2);
    b.box(0.21, 0.08, 0.11, RED, -0.3, 1.06, 0.08); // bag full of Kamelle sticking out of the top
    b.flush(bee);
  }
  // a sweet in the throwing hand (shown until the release)
  let handMesh = null; beeRig.el.children.forEach((c) => { if (!handMesh || c.position.y > handMesh.position.y) handMesh = c; });
  const handCandy = K.box(beeRig.el, 0.13, 0.08, 0.08, RED, handMesh.position.x, handMesh.position.y + 0.05, handMesh.position.z + 0.04);
  K.put(g, bee, TX, FLOOR + 0.3, TZ, 0.25);

  // the clown pulling the handle and waving
  const clown = K.person({ h: 1.76, skin: 0xf1c27d, hair: 0xd9541e, shirt: 0x1c3f95, pants: YEL, shoes: RED, hat: 'gnome', hatColor: 0x2dbd6e, wave: true, smile: 1 });
  const clownRig = armRig(clown);
  {
    const b = bag();
    b.add(new THREE.TorusGeometry(0.13, 0.045, 4, 12), 0xffffff, 0, 1.46, 0, Math.PI / 2, 0, 0, 1, 1, 0.5); // ruff
    b.ball(0.036, RED, 0, 1.635, 0.125, 6);                                                              // red nose
    b.ball(0.05, 0xffffff, 0, 2.14, -0.035, 6);                                                          // pompom on the hat
    for (const [x, y] of [[-0.07, 1.28], [0.08, 1.18], [-0.05, 1.05], [0.07, 0.95]]) b.ball(0.032, [RED, YEL, 0xffffff, RED][Math.round(y * 10) % 4], x, y, 0.12, 6); // polka dots
    for (const sx of [-1, 1]) b.box(0.16, 0.09, 0.36, RED, sx * 0.11, 0.045, 0.08);                      // big clown shoes
    b.flush(clown);
  }
  slim(clown);
  K.put(g, clown, 1.35, 0, -0.2, 0.9);

  // the little pirate with an upside-down umbrella
  // he stands left of the sign and holds the umbrella out on his outer side (the figure is mirrored, so the raised
  // arm is his left one): from either side of the street the umbrella never covers the 'K' of KAMELLE!
  const KIDX = -1.21, KIDZ = 0.6, KIDR = 0.15;
  const kid = K.person({ h: 1.12, skin: 0xe0ac69, hair: 0x2a1a10, shirt: 0xffffff, pants: 0x1c3f95, shoes: BLACK, hat: 'tricorn', hatColor: BLACK, wave: true, smile: 1 });
  const kidRig = armRig(kid); kidRig.sh.rotation.z = -0.35;
  {
    const b = bag();
    for (const y of [1.02, 1.14, 1.26]) b.add(new THREE.TorusGeometry(y > 1.2 ? 0.176 : 0.156, 0.022, 4, 12), RED, 0, y, 0, Math.PI / 2, 0, 0, 1, 0.72, 1); // striped shirt
    b.box(0.08, 0.05, 0.02, BLACK, 0.045, 1.665, 0.112); b.rod(-0.1, 1.72, 0.05, 0.1, 1.64, 0.1, 0.006, BLACK, 4);    // eye patch
    b.box(0.03, 0.34, 0.02, 0x8a5a2a, -0.26, 0.9, 0.1, 0.3);                                                        // wooden sabre
    // umbrella: handle in the raised hand, shaft down through the canopy
    b.rod(0.58, 1.8, 0.04, 0.7, 0.9, 0.08, 0.018, 0x333333, 5);
    b.add(new THREE.TorusGeometry(0.05, 0.014, 4, 8, Math.PI), 0x333333, 0.58, 1.8, 0.04, 0, 0, 0);
    b.flush(kid);
    const cb = bag();
    // red and white panels (Kölle!), so the bowl stands out against the yellow sign and the bee
    for (let k = 0; k < 8; k++) cb.add(new THREE.ConeGeometry(0.5, 0.3, 2, 1, true, k * Math.PI / 4, Math.PI / 4), k % 2 ? 0xffffff : RED, 0.7, 1.12, 0.08, Math.PI, 0, 0, 1, 1, 1, { double: true });
    cb.flush(kid);
    // catch so far: a little pile resting in the bowl, clear of the canopy walls
    for (let k = 0; k < 4; k++) K.box(kid, 0.13, 0.07, 0.09, CANDY[k], 0.7 + ((k % 2) - 0.5) * 0.12, 1.11 + (k >> 1) * 0.055, 0.08 + ((k >> 1) - 0.5) * 0.08 * ((k % 2) ? 1 : -1)).rotation.y = k * 0.8; // catch so far
  }
  slim(kid);
  kid.scale.x = -kid.scale.x; // mirrored: umbrella in the left hand (three.js flips the winding for us)
  K.put(g, kid, KIDX, 0, KIDZ, KIDR);

  // ================= flying Kamelle =================
  g.updateMatrixWorld(true);
  const REL = 0.62, PER = 1.0, TF = 1.15, REST = 0.9, NC = 12, PERTHROW = 3, GROUPS = NC / PERTHROW;
  const armX = (ph) => ph < 0.5 ? 0.1 - 0.9 * Math.sin(ph / 0.5 * Math.PI / 2) : ph < 0.7 ? -0.8 + 1.9 * (ph - 0.5) / 0.2 : 1.1 - 1.0 * (ph - 0.7) / 0.3;
  beeRig.sh.rotation.x = armX(REL); bee.updateMatrixWorld(true);
  const S = new THREE.Vector3(); handMesh.getWorldPosition(S); g.worldToLocal(S);
  beeRig.sh.rotation.x = 0;
  slim(bee, new Set([handCandy])); // after the hand has been found; the sweet in it blinks, so it stays apart
  // the umbrella canopy centre, in prop coordinates
  const BOWL = new THREE.Vector3(0.7, 1.08, 0.08); kid.localToWorld(BOWL); g.worldToLocal(BOWL);
  // userData.keep: the game batches every part its tick probe sees standing still into one static mesh, and its
  // short probe (dt 1/60) never gets far enough into the throw cycle to see these fly; keep them out of the batch
  const candies = [];
  for (let j = 0; j < NC; j++) { const m = K.box(g, j % 4 === 3 ? 0.22 : 0.16, 0.09, 0.1, CANDY[j % CANDY.length], S.x, S.y, S.z); m.visible = false; m.userData.keep = true; candies.push(m); }
  const hash = (a) => { const s = Math.sin(a * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  const lp = new THREE.Vector3();
  let clk = -1, near = 0, wph = 0, hop = 0;
  g.userData.tick = (t, dt, ctx) => {
    dt = Math.min(dt || 0.016, 0.1);
    let best = 1e9;
    const cars = ctx && ctx.cars;
    if (cars) for (let i = 0; i < cars.length; i++) { lp.copy(cars[i]); g.worldToLocal(lp); const d2 = lp.x * lp.x + lp.z * lp.z; if (d2 < best) best = d2; }
    near += ((best < 625 ? 1 - Math.sqrt(best) / 25 : 0) - near) * Math.min(1, dt * 3);
    const beat = ctx && ctx.beat, pulse = beat ? beat.pulse || 0 : 0;
    const rate = 1 + near * 0.8;
    if (clk < 0) clk = t; else clk += dt * rate;
    wph += dt * 6.5 * (1 + near * 0.6);
    // the bee throws
    const ph = (clk / PER) % 1;
    beeRig.sh.rotation.x = armX(ph);
    beeRig.el.rotation.x = ph > 0.5 && ph < 0.75 ? 0.4 : 0;
    handCandy.visible = ph < REL - 0.02 || ph > 0.92;
    bee.position.y = FLOOR + 0.3 + pulse * 0.02;
    // the clown waves, the handle stays in his other hand
    clownRig.el.rotation.z = Math.sin(wph) * 0.5;
    clownRig.sh.rotation.z = Math.sin(wph * 0.5) * 0.1;
    clown.rotation.y = 0.9 - near * 0.25 + Math.sin(t * 0.8) * 0.04;
    // sweets in flight
    const k = Math.floor(clk / PER);
    let caught = false;
    for (let j = 0; j < NC; j++) {
      const m = candies[j], grp = (j / PERTHROW) | 0, c = j % PERTHROW;
      let kj = k - ((((k - grp) % GROUPS) + GROUPS) % GROUPS);
      let age = clk - (kj + REL) * PER;
      if (age < 0) { kj -= GROUPS; age += GROUPS * PER; }
      if (kj < 0 || age > TF + REST) { m.visible = false; continue; }
      const inBowl = c === 0 && kj % 2 === 0;
      let tx, tz, ty;
      if (inBowl) { tx = BOWL.x; ty = BOWL.y; tz = BOWL.z; }
      else {
        // on the pavement in front of the Wagen, right of the pirate: nothing falls through his umbrella or onto his feet
        tx = KIDX + 0.32 + (1.8 - KIDX - 0.32) * hash(kj * 3 + c); tz = 0.55 + 0.45 * hash(kj * 7 + c * 13 + 1); ty = 0.045;
        if (tx > 1.0 && tz < 0.7) tz = 0.75; // and in front of the clown's shoes
      }
      if (age < TF) {
        const s = age / TF, hp = 0.6 + 0.6 * hash(kj * 11 + c * 5), fall = 1 - s;
        // the tumble dies down towards the end, so the sweet touches down already lying flat (no pop on landing)
        m.position.set(S.x + (tx - S.x) * s, S.y + (ty - S.y) * s + 4 * hp * s * fall, S.z + (tz - S.z) * s);
        m.rotation.set(age * (5 + c * 3) * fall, age * 4 + kj + c, age * (3 + c) * fall);
        m.visible = true;
      } else if (!inBowl) {
        m.position.set(tx, ty, tz); m.rotation.set(0, TF * 4 + kj + c, 0); m.visible = true;
      } else { m.visible = false; if (age < TF + 0.3) caught = true; }
    }
    // the pirate hops when something lands in his umbrella
    hop = caught ? Math.min(1, hop + dt * 8) : Math.max(0, hop - dt * 4);
    kid.position.y = Math.sin(hop * Math.PI * 0.5) * 0.07;
    kid.rotation.y = KIDR + Math.sin(t * 1.3) * 0.05;
  };
});

// Tanzgruppe on the pavement: two Tanzmariechen do high kicks left and right, in the middle the
// Tanzoffizier holds the third Mariechen stiff as a board above his head and throws her 1.5 m up:
// she spins once around her long axis with legs in the splits and lands back in his hands.
// Behind them a red-white Wimpelkette with a string of bulbs hangs between two poles stuck in Kölsch
// crates; at night the bulbs take turns on the beat and two little spotlights light the show.
Veedel.define('funkemariechen', { name: 'Tanzgruppe mit Mariechen-Wurf', kind: 'karneval', w: 5, d: 2.2 }, (g, o, K) => {
  const rnd = K.rnd((o && o.seed) || 5), night = K.theme().night;
  const RED = 0xd21f2b, WHITE = 0xf7f5f0, GOLD = 0xf0b422, BLACK = 0x17171a, TIGHTS = 0xf2c9a2;

  // ---- bake helper: every plain mesh directly under a group becomes one vertex-coloured mesh ----
  const VM = K.__vcMatCache || (K.__vcMatCache = {}); // shared with the other props
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  const _c = new THREE.Color();
  function bake(grp) {
    const lists = { l: [], g: [] };
    for (const ch of grp.children.slice()) {
      if (!ch.isMesh || ch.userData.keep) continue;
      const m = ch.material;
      if (Array.isArray(m) || m.map || m.transparent || m.side === THREE.DoubleSide || m.vertexColors) continue;
      ch.updateMatrix();
      const geo = (ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone()).applyMatrix4(ch.matrix);
      lists[m.isMeshBasicMaterial ? 'g' : 'l'].push({ geo, color: m.color.getHex() });
      grp.remove(ch);
    }
    for (const key of ['l', 'g']) {
      const list = lists[key]; if (!list.length) continue;
      let n = 0; for (const it of list) n += it.geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
      for (const it of list) {
        const pa = it.geo.attributes.position.array, cnt = pa.length / 3; pos.set(pa, off * 3); nor.set(it.geo.attributes.normal.array, off * 3);
        _c.setHex(it.color); for (let i = 0; i < cnt; i++) { col[(off + i) * 3] = _c.r; col[(off + i) * 3 + 1] = _c.g; col[(off + i) * 3 + 2] = _c.b; }
        off += cnt;
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      bg.computeBoundingSphere(); grp.add(new THREE.Mesh(bg, vcMat(false, key === 'g')));
    }
    for (const ch of grp.children) if (!ch.isMesh) bake(ch);
  }
  // ---- rig: re-parent a K.person's limbs into hip/knee/ankle and shoulder/elbow pivots ----
  const pivot = (parent, px, py, pz, test) => {
    const pv = new THREE.Group(); pv.position.set(px, py, pz);
    for (const c of parent.children.slice()) if (c.isMesh && test(c.position)) { parent.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; pv.add(c); }
    parent.add(pv); return pv;
  };
  function rig(p, knees) {
    const R = {};
    for (const sx of [-1, 1]) {
      const hip = pivot(p, sx * 0.1, 0.86, 0, (v) => sx * v.x > 0.03 && sx * v.x < 0.17 && v.y < 0.8);
      let knee = null, ankle = null;
      if (knees) { knee = pivot(hip, sx * 0.01, -0.39, 0.02, (v) => v.y < -0.3); ankle = pivot(knee, 0, -0.38, -0.03, (v) => v.y < -0.4); }
      const sh = pivot(p, sx * 0.21, 1.36, 0, (v) => sx * v.x > 0.17 && v.y > 0.7 && v.y < 1.45);
      const el = pivot(sh, sx * 0.04, -0.3, 0, (v) => v.y < -0.3);
      for (const c of el.children) if (c.geometry && c.geometry.type === 'SphereGeometry') c.material = K.mat(WHITE); // white gloves
      R[sx < 0 ? 'L' : 'R'] = { hip, knee, ankle, sh, el };
    }
    return R;
  }
  // costume parts, given in the person's own coordinates, dropped into a pivot
  const kit = (pv, root) => {
    let ox = 0, oy = 0, oz = 0; for (let q = pv; q && q !== root; q = q.parent) { ox += q.position.x; oy += q.position.y; oz += q.position.z; }
    const fix = (m, rx, ry, rz) => { m.position.x -= ox; m.position.y -= oy; m.position.z -= oz; m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };
    return {
      box: (w, h, d, c, x, y, z, rx, ry, rz) => fix(K.box(pv, w, h, d, c, x, y, z), rx, ry, rz),
      cyl: (rt, rb, h, c, x, y, z, seg, rx, ry, rz) => fix(K.cyl(pv, rt, rb, h, c, x, y, z, seg), rx, ry, rz),
      cone: (r, h, c, x, y, z, seg, rx, ry, rz) => fix(K.cone(pv, r, h, c, x, y, z, seg), rx, ry, rz),
      ball: (r, c, x, y, z, seg) => fix(K.sphere(pv, r, c, x, y, z, seg || 6))
    };
  };

  // ================= a Tanzmariechen: red jacket with white plastron, short white skirt, tricorn, white boots =================
  function mariechen(h, hair, skin, flyer) {
    const p = K.person({ h, skin, hair, hairStyle: 'long', shirt: RED, pants: TIGHTS, shoes: WHITE, hat: 'tricorn', hatColor: RED, lips: true, smile: 1, eyes: '#3a6aa8' });
    const R = rig(p, false);
    const b = kit(p, p);
    b.cyl(0.165, 0.215, 0.1, RED, 0, 0.93, 0, 12).scale.z = 0.8;          // jacket peplum
    b.cyl(0.217, 0.222, 0.025, WHITE, 0, 0.873, 0, 12).scale.z = 0.8;      // its white edge
    const sk = b.cyl(0.2, 0.34, 0.17, WHITE, 0, 0.78, 0, 14);               // the short, stiff white skirt
    const hem = b.cyl(0.343, 0.345, 0.035, RED, 0, 0.7, 0, 14);             // red hem ribbon
    if (flyer) { sk.scale.x = hem.scale.x = 0.62; }                        // pressed flat when she lies on his hands
    b.box(0.13, 0.34, 0.02, WHITE, 0, 1.2, 0.124, 0.07);                    // white plastron
    for (let k = 0; k < 4; k++) b.ball(0.016, GOLD, 0, 1.1 + k * 0.085, 0.14, 5);
    b.cyl(0.075, 0.09, 0.05, WHITE, 0, 1.455, 0, 8);                        // stand-up collar
    for (const sx of [-1, 1]) b.box(0.12, 0.035, 0.13, GOLD, sx * 0.21, 1.445, 0); // epaulettes
    b.cyl(0.228, 0.228, 0.022, WHITE, 0, 1.748, 0, 3);                      // white edge of the tricorn
    b.ball(0.03, GOLD, 0, 1.775, 0.2, 5);                                   // cockade at the front corner
    for (let k = 0; k < 4; k++) b.ball(0.042 - k * 0.004, hair, 0, 1.5 - k * 0.065, -0.14 - k * 0.012, 6); // braid
    b.box(0.1, 0.045, 0.03, RED, 0, 1.53, -0.13);                           // bow
    for (const sx of [-1, 1]) {
      const L = R[sx < 0 ? 'L' : 'R'], lb = kit(L.hip, p), eb = kit(L.el, p);
      lb.cyl(0.073, 0.064, 0.37, WHITE, sx * 0.11, 0.245, 0.005, 8);        // white boot
      lb.cyl(0.077, 0.077, 0.035, RED, sx * 0.11, 0.43, 0.008, 8);          // red cuff
      lb.box(0.035, 0.05, 0.06, WHITE, sx * 0.11, 0.025, -0.07);             // little heel
      eb.cyl(0.046, 0.046, 0.05, WHITE, sx * 0.245, 0.84, 0.04, 6);          // glove cuff
    }
    return { p, R };
  }

  // ================= the Tanzoffizier: red tunic, white cross belts, white trousers, black gaiters, black tricorn =================
  const offi = K.person({ h: 1.86, skin: 0xe8b88a, hair: 0xf2f0ea, shirt: RED, pants: WHITE, shoes: BLACK, hat: 'tricorn', hatColor: BLACK, moustache: 0x7a5230, smile: 1, brow: 3 });
  for (const c of offi.children.slice()) if (c.isMesh && c.geometry.type === 'SphereGeometry' && c.position.y > 1.9) offi.remove(c); // no pompom: she lies right above it
  const OR = rig(offi, true);
  {
    const b = kit(offi, offi);
    b.box(0.055, 0.66, 0.02, WHITE, 0, 1.12, 0.13, 0, 0, 0.5); b.box(0.055, 0.66, 0.02, WHITE, 0, 1.12, 0.132, 0, 0, -0.5);   // cross belts
    b.box(0.055, 0.6, 0.02, WHITE, 0, 1.12, -0.125, 0, 0, 0.5); b.box(0.055, 0.6, 0.02, WHITE, 0, 1.12, -0.127, 0, 0, -0.5);
    b.box(0.07, 0.07, 0.025, GOLD, 0, 1.13, 0.143);                                                                           // belt plate
    b.cyl(0.162, 0.162, 0.07, WHITE, 0, 0.875, 0, 10).scale.z = 0.78;                                                         // white belt
    b.box(0.09, 0.07, 0.02, GOLD, 0, 0.875, 0.128);
    b.box(0.3, 0.42, 0.03, RED, 0, 0.7, -0.115, -0.12); b.box(0.06, 0.42, 0.032, WHITE, 0, 0.7, -0.117, -0.12);             // coat tails with white facing
    for (const sx of [-1, 1]) { b.box(0.14, 0.04, 0.15, GOLD, sx * 0.21, 1.45, 0); b.box(0.15, 0.05, 0.16, GOLD, sx * 0.24, 1.41, 0, 0, 0, sx * -0.5); } // epaulettes with fringe
    b.cyl(0.08, 0.095, 0.05, WHITE, 0, 1.455, 0, 8);
    b.cyl(0.23, 0.23, 0.022, WHITE, 0, 1.748, 0, 3);                                                                          // white hat edge
    b.ball(0.035, RED, 0.02, 1.78, 0.2, 6); b.ball(0.018, WHITE, 0.02, 1.78, 0.23, 5);                                        // cockade
    b.cyl(0.022, 0.012, 0.18, WHITE, 0, 1.52, -0.13, 5, -0.3); b.box(0.08, 0.035, 0.02, BLACK, 0, 1.6, -0.125);              // wig pigtail + bow
    for (const sx of [-1, 1]) {
      const L = OR[sx < 0 ? 'L' : 'R'], kb = kit(L.knee, offi), eb = kit(L.el, offi);
      kb.cyl(0.074, 0.066, 0.36, BLACK, sx * 0.11, 0.265, 0.005, 8);                                                          // black gaiters
      for (let k = 0; k < 3; k++) kb.ball(0.012, WHITE, sx * 0.11 + sx * 0.06, 0.16 + k * 0.1, 0.04, 4);
      eb.cyl(0.048, 0.048, 0.06, WHITE, sx * 0.245, 0.84, 0.04, 6);
    }
  }
  const OX = 0, OZ = -0.36, OH = 1.86 / 1.75;
  K.put(g, offi, OX, 0, OZ);

  // ================= the three Mariechen =================
  const left = mariechen(1.64, 0xf3e6b0, 0xffdbac, false), right = mariechen(1.66, 0xf6f1e4, 0xf1c27d, false);
  K.put(g, left.p, -1.78, 0, 0.18, 0.3); K.put(g, right.p, 1.78, 0, 0.18, -0.3);
  const kickers = [
    { m: left, out: left.R.L, inn: left.R.R, sx: -1, ph: 0 },
    { m: right, out: right.R.R, inn: right.R.L, sx: 1, ph: 0 }
  ];
  for (const k of kickers) {
    // outer arm up in an "Alaaf!", inner hand on the hip
    k.out.sh.rotation.z = k.sx * 2.45; k.out.el.rotation.z = k.sx * -0.25;
    k.inn.sh.rotation.z = -k.sx * 0.62; k.inn.el.rotation.z = k.sx * 1.45;
  }
  const fly = mariechen(1.6, 0xf2c94c, 0xffdbac, true), FH = 1.6 / 1.75;
  const flyRoot = new THREE.Group(); g.add(flyRoot);
  const COM = 0.93 * FH;
  K.put(flyRoot, fly.p, 0, -COM, 0);
  // her lower arm stretched over the head, the upper one reaching for the sky
  fly.R.L.sh.rotation.z = -(Math.PI - 0.12); fly.R.R.sh.rotation.z = Math.PI / 2 + 0.15; fly.R.R.el.rotation.z = -0.25;

  // ================= the ground: confetti, a Strüßje, two Kölsch on a crate =================
  const floor = new THREE.Group(); g.add(floor);
  {
    const cp = [], cc = [], CONF = [RED, 0xffd400, 0x2a9df4, 0x2fa84f, 0xff5fa2, 0xffffff, 0xff8a00];
    for (let k = 0; k < 150; k++) {
      const x = (rnd() - 0.5) * 4.8, z = (rnd() - 0.5) * 2.0, s = 0.06 + rnd() * 0.05, r = rnd() * 6.28, y = 0.006 + rnd() * 0.004;
      cp.push(x, y, z, x + s * Math.sin(r), y, z + s * Math.cos(r), x + s * Math.cos(r), y, z - s * Math.sin(r));
      _c.setHex(CONF[k % CONF.length]); for (let v = 0; v < 3; v++) cc.push(_c.r, _c.g, _c.b);
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    cg.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(cp.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.add(new THREE.Mesh(cg, vcMat(true, false)));
    // a Kölsch crate at the back with two Stangen (the Offizier's reward)
    K.box(floor, 0.42, 0.28, 0.32, 0x1c3f95, 1.0, 0.14, -0.78, null);
    K.box(floor, 0.44, 0.03, 0.34, 0x16307a, 1.0, 0.295, -0.78);
    for (const dx of [-0.1, 0.1]) { K.cyl(floor, 0.035, 0.03, 0.2, 0xf5b400, 1.0 + dx, 0.41, -0.78, 7); K.cyl(floor, 0.036, 0.036, 0.035, 0xffffff, 1.0 + dx, 0.527, -0.78, 7); }
    // a dropped Strüßje
    K.cone(floor, 0.06, 0.2, 0xffffff, -0.8, 0.072, 0.75, 6).rotation.z = Math.PI / 2 - 0.1;
    for (const [dx, dz, c] of [[0.12, 0, 0xff5fa2], [0.14, 0.05, 0xffd400], [0.13, -0.05, RED], [0.17, 0, 0xffffff]]) K.sphere(floor, 0.045, c, -0.8 - dx, 0.05, 0.75 + dz, 6);
    // Kamelle
    for (let k = 0; k < 6; k++) { const x = (rnd() - 0.5) * 4, z = 0.3 + rnd() * 0.6; K.sphere(floor, 0.03, [RED, 0xffd400, 0x2a9df4][k % 3], x, 0.025, z, 5).scale.set(1.6, 0.8, 1); }
  }

  // ================= Veedel decoration: red-white bunting and a string of bulbs on two poles stuck in Kölsch crates =================
  // The bulbs glow at night and take turns on the beat, so the group still reads in the dark.
  const PX = 2.26, PZ = -0.93, PTOP = 3.4, SAG = 0.26;
  const lineY = (x) => PTOP - 0.07 - SAG * (1 - (x / PX) * (x / PX));
  for (const sx of [-1, 1]) {
    const x = sx * PX;
    K.box(floor, 0.4, 0.27, 0.3, 0xc1121f, x, 0.135, PZ);                                   // a red Kölsch crate holds the pole
    K.box(floor, 0.42, 0.03, 0.32, 0x9a0e19, x, 0.285, PZ);
    K.cyl(floor, 0.026, 0.032, PTOP, WHITE, x, PTOP / 2, PZ, 6);                              // white pole ...
    for (let k = 0; k < 4; k++) K.part(floor, new THREE.CylinderGeometry(0.034, 0.034, 0.22, 6, 1, true), RED, x, 0.62 + k * 0.62, PZ); // ... with red bands
    K.sphere(floor, 0.055, GOLD, x, PTOP + 0.03, PZ, 6);                                      // gold knob
  }
  // two little spotlights clamped to the poles light the show; at night their light cones are visible
  // (the cones exist only in a night build: the game merges static meshes without looking at .visible)
  {
    const UPV = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), lens = new THREE.Vector3(), tgt = new THREE.Vector3();
    for (const sx of [-1, 1]) {
      lens.set(sx * (PX - 0.13), PTOP - 0.36, PZ + 0.05); tgt.set(sx * 0.5, 0.3, 0.1);
      dir.subVectors(tgt, lens); const L = dir.length(); dir.normalize();
      K.box(floor, 0.13, 0.03, 0.03, 0x2a2a2e, sx * (PX - 0.06), PTOP - 0.3, PZ);             // clamp arm
      const can = K.cyl(floor, 0.075, 0.06, 0.17, 0x1c1c20, lens.x - dir.x * 0.06, lens.y - dir.y * 0.06, lens.z - dir.z * 0.06, 8);
      can.quaternion.setFromUnitVectors(UPV, dir);
      const ln = K.cyl(floor, 0.064, 0.064, 0.02, night ? 0xfff2c8 : 0xd8d4c8, lens.x + dir.x * 0.03, lens.y + dir.y * 0.03, lens.z + dir.z * 0.03, 8, night ? { glow: true } : null);
      ln.quaternion.setFromUnitVectors(UPV, dir);
      if (night) {
        const cone = K.part(g, new THREE.ConeGeometry(0.5, L, 10, 1, true), 0xffe6a0, (lens.x + tgt.x) / 2, (lens.y + tgt.y) / 2, (lens.z + tgt.z) / 2, { glow: true, opacity: 0.12, double: true });
        cone.quaternion.setFromUnitVectors(UPV, dir.negate());                                // apex at the lamp
      }
    }
  }
  {
    // the line itself (thin dark rods) and the pennants (one double-sided vertex-coloured mesh)
    const N = 12, UPV = new THREE.Vector3(0, 1, 0), da = new THREE.Vector3();
    const xs = []; for (let i = 0; i <= 10; i++) xs.push(-PX + i * (2 * PX) / 10);
    for (let i = 0; i < 10; i++) {
      const ax = xs[i], bx = xs[i + 1], ay = lineY(ax), by = lineY(bx);
      da.set(bx - ax, by - ay, 0); const len = da.length();
      const rodM = K.part(floor, new THREE.CylinderGeometry(0.009, 0.009, len, 3, 1, true), 0x2a2a2e, (ax + bx) / 2, (ay + by) / 2, PZ);
      rodM.quaternion.setFromUnitVectors(UPV, da.normalize());
    }
    const pp = [], pc = [], pn = [];
    for (let i = 0; i < N; i++) {
      const x = -PX + 0.32 + i * (2 * PX - 0.64) / (N - 1), hw = 0.12, ht = 0.3;
      pp.push(x - hw, lineY(x - hw) - 0.01, PZ, x, lineY(x) - 0.01 - ht, PZ, x + hw, lineY(x + hw) - 0.01, PZ);
      _c.setHex(i % 2 ? WHITE : RED); for (let v = 0; v < 3; v++) { pc.push(_c.r, _c.g, _c.b); pn.push(0, 0, 1); }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); pg.setAttribute('normal', new THREE.Float32BufferAttribute(pn, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3));
    g.add(new THREE.Mesh(pg, vcMat(true, false)));
  }
  // bulbs between the pennants, in two sets that take turns at night
  const bulbSets = [new THREE.Group(), new THREE.Group()]; g.add(bulbSets[0]); g.add(bulbSets[1]);
  {
    const BULB = [0xffd23f, 0xff4040, 0x4fe070, 0x4aa8ff, 0xff7ad9];
    for (let i = 0; i < 13; i++) {
      const x = -PX + 0.14 + i * (2 * PX - 0.28) / 12;
      K.sphere(bulbSets[i % 2], 0.065, BULB[i % BULB.length], x, lineY(x) - 0.075, PZ + 0.01, 6);
    }
  }

  // ================= bake everybody into a handful of meshes =================
  for (const q of [offi, left.p, right.p, fly.p]) bake(q);
  // an old ghettoblaster on the pavement plays the Marsch; its speakers pump, its display glows at night
  const gb = new THREE.Group(); K.put(g, gb, -0.95, 0, -0.8, 0.3);
  K.box(gb, 0.58, 0.27, 0.14, 0x2a2a30, 0, 0.135, 0);
  K.box(gb, 0.56, 0.25, 0.01, 0xb8bcc4, 0, 0.135, 0.072);
  for (const sx of [-1, 1]) { K.cyl(gb, 0.092, 0.092, 0.02, 0x3a3a40, sx * 0.175, 0.125, 0.078, 12).rotation.x = Math.PI / 2; }
  K.box(gb, 0.14, 0.075, 0.012, 0x39424e, 0, 0.14, 0.078);                                   // cassette window
  K.box(gb, 0.1, 0.04, 0.012, 0x22262c, 0, 0.14, 0.082);
  K.box(gb, 0.14, 0.032, 0.012, night ? 0x7dffc8 : 0x4a8a6a, 0, 0.215, 0.078, night ? { glow: true } : null); // tuner display
  for (let k = 0; k < 6; k++) K.box(gb, 0.035, 0.02, 0.03, k % 3 === 0 ? RED : 0x1a1a1a, -0.1 + k * 0.04, 0.28, 0.02);   // piano keys
  K.box(gb, 0.44, 0.025, 0.025, 0x1a1a1a, 0, 0.36, -0.01); for (const sx of [-1, 1]) K.box(gb, 0.025, 0.09, 0.025, 0x1a1a1a, sx * 0.21, 0.31, -0.01); // handle
  K.cyl(gb, 0.006, 0.006, 0.5, 0xd0d0d8, 0.24, 0.5, -0.04, 4).rotation.z = -0.35;              // antenna
  const cones = [];
  for (const sx of [-1, 1]) {
    const c = K.sphere(gb, 0.078, 0x141418, sx * 0.175, 0.125, 0.086, 10); c.scale.set(1, 1, 0.28); c.userData.keep = true; cones.push(c);
    const cap = K.sphere(c, 0.028, 0x9a9aa2, 0, 0, 0.06, 6); cap.userData.keep = true;
  }
  bake(floor); bake(gb); bake(bulbSets[0]); bake(bulbSets[1]);
  // at night: one set burns bright, the other glows dimmed, and they swap on every beat (two cached materials, never recoloured)
  const bulbs = [bulbSets[0].children[0], bulbSets[1].children[0]], BULB_ON = vcMat(false, true);
  const BULB_OFF = VM.sgDim || (VM.sgDim = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x5a5a5a }));
  if (night) { bulbs[0].material = BULB_ON; bulbs[1].material = BULB_OFF; }

  // ================= pose + animation =================
  const SQ_L = 0.771;   // thigh + shin
  const setOffi = (s, spread) => {
    const a = 0.55 * s;
    for (const sx of [-1, 1]) {
      const L = OR[sx < 0 ? 'L' : 'R'];
      L.hip.rotation.x = -a; L.knee.rotation.x = 2 * a; L.ankle.rotation.x = -a;
      L.sh.rotation.set(0.2, 0, sx * (Math.PI - 0.14 - spread)); L.el.rotation.z = sx * 0.9 * spread;
    }
    const drop = (SQ_L * (1 - Math.cos(a)) + 0.05 * Math.sin(a)) * OH * 0.997;   // ankle height change: feet stay on (never in) the ground
    offi.position.y = -drop;
    return drop;
  };
  // where his hands are in the hold pose: she rests right on top of them
  setOffi(0, 0); g.updateMatrixWorld(true);
  const hv = new THREE.Vector3(); let handTop = 0, handZ = 0;
  for (const sx of [-1, 1]) { const el = OR[sx < 0 ? 'L' : 'R'].el; el.localToWorld(hv.set(sx * -0.01, -0.3, 0.06)); handTop = Math.max(handTop, hv.y); handZ += hv.z / 2; }
  const Y0 = handTop + 0.05 * OH + 0.155;   // hand radius + half her body
  flyRoot.position.set(OX + 0.02, Y0, handZ + 0.02); flyRoot.rotation.set(0.18, 0, Math.PI / 2);

  const P = 2.5, T0 = 0.22, T1 = 0.7;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const kickCurve = (w) => (w < 0.22 ? 1 - (1 - w / 0.22) * (1 - w / 0.22) : w < 0.3 ? 1 : w < 0.5 ? 1 - ease((w - 0.3) / 0.2) : 0);
  g.userData.tick = (t, dt, ctx) => {
    // --- the toss ---
    const bt = ctx && ctx.beat, pz = bt ? bt.pulse || 0 : 0.8 * Math.exp(-((t * 128 / 60) % 1) * 6);
    for (let i = 0; i < 2; i++) { cones[i].scale.z = 0.28 * (1 + 1.4 * pz); cones[i].scale.x = cones[i].scale.y = 1 + 0.06 * pz; }
    const u = (t / P + 0.52) % 1;
    let s = 0, spread = 0, lift = 0, spin = 0, split = 0;
    if (u < 0.12) s = ease(u / 0.12);
    else if (u < T0) s = 1 - ease((u - 0.12) / (T0 - 0.12));
    else if (u < T1) { const v = (u - T0) / (T1 - T0); lift = 1.5 * 4 * v * (1 - v); spin = Math.PI * 2 * v; split = Math.sin(Math.PI * v); spread = 0.45 * split; }
    else if (u < 0.78) s = 0.8 * ease((u - T1) / 0.08);
    else if (u < 0.9) s = 0.8 * (1 - ease((u - 0.78) / 0.12));
    const drop = setOffi(s, spread);
    flyRoot.position.y = Y0 - drop + lift;
    flyRoot.rotation.x = 0.18 + spin;
    fly.R.L.hip.rotation.x = -0.95 * split; fly.R.R.hip.rotation.x = 0.75 * split;
    fly.R.R.sh.rotation.z = Math.PI / 2 + 0.15 + (split > 0 ? 0.5 * split : Math.sin(t * 7) * 0.12);
    // --- the kick line: four beats per pair of kicks, outer leg first ---
    const b = ctx && ctx.beat;
    const bf = b && b.beat != null ? b.beat + (b.phase || 0) : t * 128 / 60;
    const pulse = b ? b.pulse || 0 : 0.8 * Math.exp(-(bf % 1) * 6);
    if (night) { const odd = ((Math.floor(bf) % 2) + 2) % 2 === 1; bulbs[0].material = odd ? BULB_OFF : BULB_ON; bulbs[1].material = odd ? BULB_ON : BULB_OFF; } // the bulbs take turns on the beat
    for (let i = 0; i < 2; i++) {
      const k = kickers[i], w0 = (bf / 4) % 1, w1 = (w0 + 0.5) % 1;
      const kOut = kickCurve(w0), kIn = kickCurve(w1);
      const legOut = k.sx < 0 ? k.m.R.L : k.m.R.R, legIn = k.sx < 0 ? k.m.R.R : k.m.R.L;
      legOut.hip.rotation.x = -1.7 * kOut; legIn.hip.rotation.x = -1.7 * kIn;
      k.m.p.rotation.x = -0.12 * Math.max(kOut, kIn);
      const kk = Math.max(kOut, kIn);   // lean back over the heel and rise a little: neither heel dips into the ground
      k.m.p.position.y = 0.025 * pulse + 0.11 * Math.sin(0.12 * kk) + 0.008 * Math.min(1, kk * 20);
      k.out.sh.rotation.z = k.sx * (2.45 + 0.15 * Math.sin(bf * Math.PI));
    }
  };
  g.userData.tick(0, 0, null);
});

// Musikwagen: a small white flatbed truck with a clown nose, turned into a rolling sound system.
// Speaker towers pump to LamboGina (130 BPM), PAR cans and moving heads change colour on every beat,
// DJ Köbes (blue Köbes jacket, headphones, shades) nods along and raises a Kölsch Kranz on the kick,
// next to him "LamboGina" herself dances in a white wedge-car costume.
Veedel.define('musikwagen', { name: 'Musikwagen', kind: 'lambogina', w: 7, d: 3 }, (g, o, K) => {
  const night = K.theme().night;
  const MAG = 0xff2d95, CYA = 0x00e5ff, YEL = 0xffd400, VIO = 0x9b5cff, GRN = 0x7cff4f, ORA = 0xff6a1f;
  const WHITE = 0xf4f4f2, BLACK = 0x19191d, DARK = 0x2a2a30, SILVER = 0xc4c8d0, PURPLE = 0x1f1236, RED = 0xd21f2b, GLASS = 0x2a3a4e, BLUE = 0x1c3f95;

  // ---- bake helper: every plain mesh directly under a group becomes one vertex-coloured mesh ----
  const VM = K.__vcMatCache || (K.__vcMatCache = {});
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  const _c = new THREE.Color();
  function bake(grp) {
    const lists = { l: [], g: [] };
    for (const ch of grp.children.slice()) {
      if (!ch.isMesh || ch.userData.keep) continue;
      const m = ch.material;
      if (Array.isArray(m) || m.map || m.transparent || m.side === THREE.DoubleSide || m.vertexColors) continue;
      ch.updateMatrix();
      const geo = (ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone()).applyMatrix4(ch.matrix);
      lists[m.isMeshBasicMaterial ? 'g' : 'l'].push({ geo, color: m.color.getHex() });
      grp.remove(ch);
    }
    for (const key of ['l', 'g']) {
      const list = lists[key]; if (!list.length) continue;
      let n = 0; for (const it of list) n += it.geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
      for (const it of list) {
        const pa = it.geo.attributes.position.array, cnt = pa.length / 3; pos.set(pa, off * 3); nor.set(it.geo.attributes.normal.array, off * 3);
        _c.setHex(it.color); for (let i = 0; i < cnt; i++) { col[(off + i) * 3] = _c.r; col[(off + i) * 3 + 1] = _c.g; col[(off + i) * 3 + 2] = _c.b; }
        off += cnt;
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      bg.computeBoundingSphere(); grp.add(new THREE.Mesh(bg, vcMat(false, key === 'g')));
    }
    for (const ch of grp.children) if (!ch.isMesh) bake(ch);
  }
  const pivot = (parent, px, py, pz, test) => {
    const pv = new THREE.Group(); pv.position.set(px, py, pz);
    for (const c of parent.children.slice()) if (c.isMesh && test(c.position)) { parent.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; pv.add(c); }
    parent.add(pv); return pv;
  };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const rod = (par, ax, ay, az, bx, by, bz, r, c, seg) => {
    _a.set(ax, ay, az); _b.set(bx, by, bz); const len = _a.distanceTo(_b);
    const m = K.part(par, new THREE.CylinderGeometry(r, r, len, seg || 4, 1, true), c, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    m.quaternion.setFromUnitVectors(UP, _b.sub(_a).normalize()); return m;
  };
  // a flat truss: two chords offset along (nx,ny,nz) with a zigzag between them
  const truss = (par, ax, ay, az, bx, by, bz, nx, ny, nz) => {
    const h = 0.09, len = Math.hypot(bx - ax, by - ay, bz - az), n = Math.max(2, Math.round(len / 0.3));
    for (const s of [-1, 1]) rod(par, ax + nx * h * s, ay + ny * h * s, az + nz * h * s, bx + nx * h * s, by + ny * h * s, bz + nz * h * s, 0.024, SILVER, 4);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, s0 = i % 2 ? 1 : -1;
      rod(par, ax + (bx - ax) * t0 + nx * h * s0, ay + (by - ay) * t0 + ny * h * s0, az + (bz - az) * t0 + nz * h * s0,
        ax + (bx - ax) * t1 - nx * h * s0, ay + (by - ay) * t1 - ny * h * s0, az + (bz - az) * t1 - nz * h * s0, 0.012, SILVER, 3);
    }
  };

  const S = new THREE.Group(); g.add(S);   // everything static, baked at the end

  // ================= the truck =================
  K.box(S, 6.7, 0.22, 0.9, DARK, -0.12, 0.64, 0);                                 // chassis
  const wheel = (x, z) => {
    K.cyl(S, 0.46, 0.46, 0.3, 0x141414, x, 0.46, z, x > 0 ? 14 : 10).rotation.x = Math.PI / 2;
    K.cyl(S, 0.22, 0.22, 0.31, 0xa0a0a8, x, 0.46, z, 8).rotation.x = Math.PI / 2;
  };
  for (const z of [-1.0, 1.0]) { wheel(2.5, z); wheel(-1.3, z); wheel(-2.35, z); }
  // cab: white, magenta and cyan stripes, a red clown nose on the grille and eyelashes over the headlights
  K.box(S, 1.58, 1.1, 2.3, WHITE, 2.51, 1.5, 0);
  K.box(S, 1.48, 0.75, 2.26, WHITE, 2.46, 2.425, 0);
  K.box(S, 1.54, 0.07, 2.3, WHITE, 2.46, 2.835, 0);
  K.box(S, 0.03, 0.6, 2.0, GLASS, 3.205, 2.42, 0);                                 // windscreen
  K.box(S, 0.12, 0.07, 2.2, DARK, 3.24, 2.77, 0);                                  // sun visor
  for (const zs of [-1, 1]) K.box(S, 0.03, 0.04, 0.8, 0x111111, 3.225, 2.2, zs * 0.5).rotation.x = 0.25;  // wipers
  for (const zs of [-1, 1]) {
    K.box(S, 0.95, 0.55, 0.02, GLASS, 2.66, 2.43, zs * 1.14);                       // door window
    K.box(S, 1.58, 0.1, 0.02, MAG, 2.51, 1.62, zs * 1.152);                          // stripes
    K.box(S, 1.58, 0.06, 0.02, CYA, 2.51, 1.48, zs * 1.152);
    K.box(S, 0.02, 1.8, 0.02, 0x9a9aa2, 2.05, 1.9, zs * 1.153);                      // door gaps
    K.box(S, 0.02, 1.8, 0.02, 0x9a9aa2, 3.18, 1.9, zs * 1.153);
    K.box(S, 0.14, 0.035, 0.03, DARK, 2.2, 1.95, zs * 1.16);                         // handle
    K.box(S, 0.3, 0.08, 0.02, DARK, 2.35, 0.99, zs * 1.1);                           // step
    rod(S, 3.1, 2.3, zs * 1.14, 3.14, 2.3, zs * 1.32, 0.015, DARK, 4);               // mirror arm
    K.box(S, 0.05, 0.3, 0.16, DARK, 3.14, 2.25, zs * 1.36);                          // mirror
    K.box(S, 1.62, 0.09, 0.05, DARK, 2.51, 0.97, zs * 1.14);                         // sill over the wheel
  }
  K.box(S, 0.03, 0.62, 1.4, DARK, 3.31, 1.3, 0);                                   // grille
  for (let k = 0; k < 4; k++) K.box(S, 0.035, 0.035, 1.36, SILVER, 3.325, 1.07 + k * 0.155, 0);
  K.box(S, 0.18, 0.2, 2.34, DARK, 3.3, 0.8, 0);                                     // bumper
  for (const zs of [-1, 1]) {
    K.cyl(S, 0.135, 0.135, 0.03, SILVER, 3.305, 1.18, zs * 0.87, 10).rotation.z = Math.PI / 2;                 // round headlights = eyes
    K.cyl(S, 0.11, 0.11, 0.04, night ? 0xfff2c0 : 0xeef0e8, 3.315, 1.18, zs * 0.87, 10, night ? { glow: true } : null).rotation.z = Math.PI / 2;
    K.box(S, 0.04, 0.1, 0.12, ORA, 3.315, 1.18, zs * 1.1, night ? { glow: true } : null);                         // indicators
    for (let k = -1; k <= 1; k++) K.box(S, 0.03, 0.13, 0.035, 0x111111, 3.315, 1.36, zs * 0.87 + k * 0.1).rotation.x = k * 0.45; // eyelashes
  }
  K.sphere(S, 0.155, RED, 3.33, 1.3, 0, 12);                                        // the clown nose
  K.sphere(S, 0.04, 0xff8a8a, 3.43, 1.36, 0.05, 5);                                 // its shine
  for (const zs of [-1, 1]) K.cyl(S, 0.075, 0.085, 0.12, ORA, 2.9, 2.93, zs * 0.85, 8, night ? { glow: true } : null); // roof beacons
  K.text(g, 'KÖLLE ALAAF', { fg: '#d21f2b', bg: '#f4f4f2', w: 1.0, h: 0.26, x: 2.62, y: 1.85, z: 1.165, glow: night });
  K.text(g, 'KÖLLE ALAAF', { fg: '#d21f2b', bg: '#f4f4f2', w: 1.0, h: 0.26, x: 2.62, y: 1.85, z: -1.165, ry: Math.PI, glow: night });

  // flatbed with a parade skirt over the wheels (Radabdeckung) carrying the banner
  const DX0 = -3.45, DX1 = 1.66, DCX = (DX0 + DX1) / 2, DW = DX1 - DX0, DY = 1.2;
  K.box(S, DW, 0.12, 2.44, 0x3a3a44, DCX, DY - 0.06, 0);
  for (const zs of [-1, 1]) {
    K.box(S, DW, 0.8, 0.04, PURPLE, DCX, 0.7, zs * 1.2);
    K.box(S, DW, 0.05, 0.06, YEL, DCX, 0.31, zs * 1.2);
  }
  K.box(S, 0.04, 0.8, 2.44, PURPLE, DX0 + 0.02, 0.7, 0);
  // rear end: red tail lights (lit at night) and a Cologne number plate, K for Köln, LG 130 for LamboGina at 130 BPM
  for (const zs of [-1, 1]) { K.box(S, 0.03, 0.11, 0.26, 0xd01020, DX0 - 0.015, 0.52, zs * 0.86, night ? { glow: true } : null); K.box(S, 0.03, 0.06, 0.12, ORA, DX0 - 0.015, 0.66, zs * 0.93, night ? { glow: true } : null); }
  K.text(g, 'K-LG 130', { fg: '#111111', bg: '#f4f4f2', w: 0.52, h: 0.12, x: DX0 - 0.012, y: 0.43, z: 0, ry: -Math.PI / 2, border: '#111111', glow: night });
  // banner: synthwave canvas, shared by all Musikwagen of the same theme
  const BC = K.__mwBanner || (K.__mwBanner = {});
  if (!BC[night ? 'n' : 'd']) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 72; const x = cv.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, 72); sky.addColorStop(0, '#12061e'); sky.addColorStop(0.62, '#4a1250'); sky.addColorStop(1, '#12061e');
    x.fillStyle = sky; x.fillRect(0, 0, 512, 72);
    x.strokeStyle = '#ff2d95'; x.lineWidth = 1; for (let i = -20; i <= 20; i++) { x.beginPath(); x.moveTo(256 + i * 8, 52); x.lineTo(256 + i * 30, 72); x.stroke(); }
    for (const y of [55, 60, 67]) { x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke(); }
    x.fillStyle = '#ffd23f'; for (let r = 0; r < 18; r++) { const w = Math.round(Math.sqrt(18 * 18 - r * r) * 2); if (r % 4 !== 3) { x.fillRect(46 - w / 2, 50 - r, w, 1); x.fillRect(466 - w / 2, 50 - r, w, 1); } }
    x.font = 'bold 34px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#00e5ff'; x.fillText('LAMBOGINA · 130 BPM', 258, 30); x.fillStyle = '#ff2d95'; x.fillText('LAMBOGINA · 130 BPM', 256, 28);
    x.fillStyle = '#00e5ff'; x.fillRect(0, 0, 512, 4); x.fillRect(0, 68, 512, 4);
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
    BC[night ? 'n' : 'd'] = night ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
  }
  for (const zs of [-1, 1]) { const bn = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 0.69), BC[night ? 'n' : 'd']); bn.position.set(DCX, 0.72, zs * 1.225); bn.rotation.y = zs < 0 ? Math.PI : 0; g.add(bn); }
  // railing
  for (const zs of [-1, 1]) {
    for (let k = 0; k < 6; k++) K.box(S, 0.04, 1.05, 0.04, SILVER, DX0 + 0.05 + k * (DW - 0.1) / 5, DY + 0.525, zs * 1.19);
    for (const y of [DY + 0.63, DY + 1.05]) K.box(S, DW - 0.06, 0.04, 0.04, SILVER, DCX, y, zs * 1.19);
  }
  for (const y of [DY + 0.63, DY + 1.05]) K.box(S, 0.04, 0.04, 2.38, SILVER, DX0 + 0.05, y, 0);
  // Cologne flag (red over white) on the cab's back corner
  rod(S, 1.82, 2.85, -1.0, 1.82, 3.75, -1.0, 0.018, SILVER, 5);
  K.box(S, 0.5, 0.16, 0.02, RED, 2.08, 3.64, -1.0); K.box(S, 0.5, 0.16, 0.02, 0xffffff, 2.08, 3.48, -1.0);
  // balloons tied to the cab roof
  [[2.3, 3.45, -0.25, MAG], [2.55, 3.62, 0.1, CYA], [2.8, 3.42, -0.05, YEL], [2.45, 3.3, 0.35, 0xffffff], [2.72, 3.3, -0.45, RED]].forEach(([x, y, z, c]) => {
    K.sphere(S, 0.15, c, x, y, z, 7).scale.set(1, 1.2, 1); rod(S, x, y - 0.18, z, 2.55, 2.88, 0, 0.005, 0xdddddd, 3);
  });

  // ================= stage truss =================
  const TX0 = -3.36, TX1 = 1.57, TZ = 1.07, TY = 3.95;
  for (const zs of [-1, 1]) for (const x of [TX0, TX1]) truss(S, x, DY, zs * TZ, x, TY + 0.09, zs * TZ, 1, 0, 0);
  for (const zs of [-1, 1]) truss(S, TX0, TY, zs * TZ, TX1, TY, zs * TZ, 0, 1, 0);
  for (const x of [TX0, TX1, -1.2]) truss(S, x, TY, -TZ, x, TY, TZ, 0, 1, 0);

  // ================= speaker towers =================
  const cones = [];
  const cone = (x, y, z, r, ring) => {
    K.cyl(S, r + 0.04, r + 0.04, 0.02, 0x3a3a42, x, y, z, 14).rotation.x = Math.PI / 2;           // surround
    K.part(S, new THREE.RingGeometry(r + 0.045, r + 0.08, 16), ring, x, y, z + 0.012, { glow: true }); // LED ring
    const c = K.sphere(g, r, 0x131316, x, y, z + 0.01, r > 0.2 ? 10 : 8); c.userData.base = 0.3; c.scale.set(1, 1, 0.3);
    K.sphere(c, r * 0.3, 0x5a5a66, 0, 0, r * 0.82, 5);                                              // dust cap
    cones.push(c);
  };
  const tower = (tx) => {
    for (let k = 0; k < 2; k++) {
      const y = DY + 0.425 + k * 0.85;
      K.box(S, 1.0, 0.85, 0.7, BLACK, tx, y, 0.55); K.box(S, 0.94, 0.79, 0.01, 0x2c2c33, tx, y, 0.905);
      cone(tx, y, 0.91, 0.29, MAG);
    }
    const y = DY + 1.975;
    K.box(S, 0.92, 0.55, 0.55, BLACK, tx, y, 0.625); K.box(S, 0.86, 0.49, 0.01, 0x2c2c33, tx, y, 0.905);
    cone(tx - 0.2, y, 0.91, 0.15, CYA);
    K.box(S, 0.3, 0.22, 0.02, 0x3a3a42, tx + 0.22, y, 0.91); K.box(S, 0.22, 0.12, 0.02, 0x0c0c0e, tx + 0.22, y, 0.918);
    // moving head base + yoke on top
    K.box(S, 0.3, 0.1, 0.3, DARK, tx, y + 0.325, 0.62);
    for (const s of [-1, 1]) K.box(S, 0.04, 0.26, 0.08, DARK, tx + s * 0.14, y + 0.5, 0.62);
  };
  const TWX = [-2.87, 1.15];
  tower(TWX[0]); tower(TWX[1]);

  // ================= DJ desk =================
  const DJX = -1.25;
  K.box(S, 1.7, 0.95, 0.65, BLACK, DJX, DY + 0.475, 0.575);
  K.box(S, 1.82, 0.05, 0.74, 0x33333c, DJX, DY + 0.975, 0.56);
  K.text(g, 'DJ KÖBES', { fg: '#ffd400', bg: '#1c3f95', w: 1.5, h: 0.44, x: DJX, y: DY + 0.37, z: 0.905, glow: night, border: '#ff2d95', sizeK: 0.56 });
  const platters = [];
  for (const dx of [-0.5, 0.5]) {
    K.box(S, 0.4, 0.08, 0.38, 0x3a3a42, DJX + dx, DY + 1.04, 0.56);
    rod(S, DJX + dx + 0.15, DY + 1.1, 0.42, DJX + dx + 0.08, DY + 1.1, 0.62, 0.008, SILVER, 3);  // tone arm
    const pl = new THREE.Group(); pl.position.set(DJX + dx - 0.03, DY + 1.09, 0.56); g.add(pl);
    K.cyl(pl, 0.15, 0.15, 0.02, 0x0e0e10, 0, 0, 0, 14);
    K.cyl(pl, 0.05, 0.05, 0.022, dx < 0 ? MAG : CYA, 0, 0, 0, 8);
    K.box(pl, 0.1, 0.024, 0.02, 0xdddddd, 0.09, 0, 0);
    platters.push(pl);
  }
  K.box(S, 0.34, 0.1, 0.36, 0x4a4a54, DJX, DY + 1.05, 0.56);                         // mixer
  for (let k = 0; k < 3; k++) K.box(S, 0.03, 0.02, 0.1, [MAG, CYA, YEL][k], DJX - 0.09 + k * 0.09, DY + 1.105, 0.62, { glow: true }); // faders
  for (let k = 0; k < 6; k++) K.box(S, 0.03, 0.03, 0.03, 0xdddddd, DJX - 0.1 + (k % 3) * 0.1, DY + 1.11, 0.46 + Math.floor(k / 3) * 0.06);
  for (const dz of [0.4, 0.52]) { K.cyl(S, 0.034, 0.03, 0.2, 0xf5b400, -0.41, DY + 1.1, dz, 7); K.cyl(S, 0.035, 0.035, 0.035, 0xffffff, -0.41, DY + 1.217, dz, 7); } // two Kölsch

  // ================= DJ Köbes =================
  const dj = K.person({ h: 1.78, skin: 0xe8b890, shirt: BLUE, pants: 0x14141a, shoes: 0x14141a, apron: BLUE, bald: true, hair: 0x9a9a9a, moustache: 0x5a4636, wave: true, smile: 1, age: 1 });
  const djHead = pivot(dj, 0, 1.5, 0, (v) => v.y > 1.52 && Math.abs(v.x) < 0.16);
  const djSh = pivot(dj, 0.21, 1.36, 0, (v) => v.x > 0.17 && v.y > 1.2);
  const djEl = pivot(djSh, 0.17, 0.14, 0.02, (v) => v.y > 0.2);
  const djLSh = pivot(dj, -0.21, 1.36, 0, (v) => v.x < -0.17 && v.y > 0.7 && v.y < 1.45);
  djLSh.rotation.set(-1.05, 0, -0.12);
  let kr;
  {
    // headphones: band over the head, two cups
    const hb = K.part(djHead, new THREE.TorusGeometry(0.128, 0.016, 4, 10, Math.PI), 0x111114, 0, 0.16, 0); hb.rotation.z = 0;
    for (const s of [-1, 1]) { K.cyl(djHead, 0.055, 0.055, 0.05, 0x111114, s * 0.125, 0.15, 0.0, 8).rotation.z = Math.PI / 2; K.cyl(djHead, 0.03, 0.03, 0.052, MAG, s * 0.127, 0.15, 0.0, 6).rotation.z = Math.PI / 2;
    K.box(djHead, 0.21, 0.05, 0.03, 0x0c0c10, 0, 0.165, 0.103);                          // shades
    K.box(djHead, 0.06, 0.012, 0.012, 0x6a6a7a, -0.05, 0.178, 0.12); }
    // Köbes money pouch on the belt, white shirt collar
    K.box(dj, 0.14, 0.12, 0.05, 0x5a3418, 0.12, 0.92, 0.14);
    K.box(dj, 0.14, 0.06, 0.03, 0xf4f4f0, 0, 1.43, 0.12);
    // the Kölsch Kranz hanging from the raised hand (kept level): handle, tray, eight Stangen
    kr = new THREE.Group(); kr.position.set(0.04, 0.35, 0.02); djEl.add(kr);
    K.cyl(kr, 0.012, 0.012, 0.3, 0x8a5a2a, 0, -0.15, 0, 5);
    K.cyl(kr, 0.17, 0.17, 0.03, 0x8a5a2a, 0, -0.3, 0, 12);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; K.cyl(kr, 0.024, 0.021, 0.15, 0xf5b400, Math.cos(a) * 0.12, -0.21, Math.sin(a) * 0.12, 5); K.cyl(kr, 0.025, 0.025, 0.025, 0xffffff, Math.cos(a) * 0.12, -0.125, Math.sin(a) * 0.12, 6); }
  }
  const DJH = 1.78 / 1.75;
  K.put(g, dj, DJX, DY, -0.02);

  // ================= "LamboGina" in a white wedge-car costume =================
  const gina = K.person({ h: 1.68, skin: 0xf1c27d, hair: 0xf2c94c, hairStyle: 'long', shirt: CYA, pants: MAG, shoes: 0xffffff, lips: true, smile: 1, eyes: '#3a7a9a', wave: true });
  const gR = pivot(gina, 0.21, 1.36, 0, (v) => v.x > 0.17 && v.y > 1.2);
  const gL = pivot(gina, -0.21, 1.36, 0, (v) => v.x < -0.17 && v.y > 0.7 && v.y < 1.45);
  {
    // big 80s hair + magenta sweatband
    for (const [x, y, z, r] of [[-0.12, 1.71, -0.02, 0.095], [0.12, 1.71, -0.02, 0.095], [0, 1.77, -0.06, 0.11], [0, 1.64, -0.12, 0.11]]) K.sphere(gina, r, 0xf2c94c, x, y, z, 6);
    K.cyl(gina, 0.128, 0.128, 0.035, MAG, 0, 1.7, 0.0, 10);
    // leg warmers
    for (const s of [-1, 1]) K.cyl(gina, 0.075, 0.068, 0.26, YEL, s * 0.11, 0.2, 0.0, 8);
    // the white wedge costume: a box whose front top edge is pulled down to the bumper
    const wg = new THREE.BoxGeometry(0.48, 0.28, 0.82), pa = wg.attributes.position;
    for (let i = 0; i < pa.count; i++) if (pa.getZ(i) > 0 && pa.getY(i) > 0) pa.setY(i, -0.06);
    wg.computeVertexNormals();
    K.part(gina, wg, 0xf6f6f2, 0, 0.93, 0.06);
    K.box(gina, 0.5, 0.03, 0.74, 0x1a1a1a, 0, 0.8, 0.06);                                // black sill
    K.box(gina, 0.495, 0.035, 0.6, MAG, 0, 0.9, 0.0);                                    // magenta side stripe
    for (const s of [-1, 1]) {
      for (const wz of [-0.22, 0.34]) { K.cyl(gina, 0.11, 0.11, 0.03, 0x111111, s * 0.245, 0.84, wz, 8).rotation.z = Math.PI / 2; K.cyl(gina, 0.05, 0.05, 0.034, 0xb0b0b8, s * 0.245, 0.84, wz, 6).rotation.z = Math.PI / 2; }
      K.box(gina, 0.1, 0.035, 0.02, 0xfff6b0, s * 0.15, 0.835, 0.472);                    // headlights
      K.box(gina, 0.1, 0.05, 0.02, 0xff2020, s * 0.15, 0.99, -0.352);                     // tail lights
      K.box(gina, 0.035, 0.36, 0.02, 0x1a1a1a, s * 0.12, 1.22, 0.1);                      // shoulder straps
      K.box(gina, 0.035, 0.36, 0.02, 0x1a1a1a, s * 0.12, 1.22, -0.1);
    }
    K.box(gina, 0.4, 0.02, 0.18, 0x20202a, 0, 0.945, 0.25).rotation.x = 0.24;                        // windscreen on the bonnet
  }
  gL.rotation.z = -2.95;
  // go-go podium so she dances above the railing
  const GY = DY + 0.36;
  K.box(S, 0.9, 0.34, 0.9, 0x2a2a34, 0.15, DY + 0.17, 0.36);
  K.box(S, 0.92, 0.04, 0.92, 0x4a4a56, 0.15, GY - 0.02, 0.36);
  K.box(S, 0.92, 0.05, 0.02, MAG, 0.15, GY - 0.06, 0.82, { glow: true }); K.box(S, 0.02, 0.05, 0.92, MAG, 0.61, GY - 0.06, 0.36, { glow: true });
  K.put(g, gina, 0.15, GY, 0.36, 0.7);

  // ================= stage lights =================
  const PAL = [MAG, CYA, YEL, GRN, ORA, VIO];
  const lensM = PAL.map((c) => K.mat(c, { glow: true }));
  const beamM = PAL.map((c) => K.mat(c, { glow: true, opacity: 0.2, double: true }));
  const lights = []; // { lens, beam }
  const PARX = [-3.0, -2.2, -1.55, -0.85, -0.1, 0.65, 1.3];
  PARX.forEach((x, i) => {
    const par = new THREE.Group(); par.position.set(x, TY - 0.2, TZ); par.rotation.x = 0.42; g.add(par);
    K.box(S, 0.06, 0.12, 0.06, DARK, x, TY - 0.12, TZ);                                // clamp
    K.cyl(par, 0.1, 0.085, 0.24, 0x1e1e24, 0, 0, 0, 8);
    const lens = K.cyl(par, 0.1, 0.1, 0.07, PAL[0], 0, -0.14, 0, 8, { glow: true }); lens.userData.keep = true;
    const beam = K.part(par, new THREE.ConeGeometry(0.42, 2.2, 10, 1, true), PAL[0], 0, -0.175 - 1.1, 0, { glow: true, opacity: 0.2, double: true });
    beam.visible = night; lights.push({ lens, beam });
    bake(par);
  });
  // moving heads on the towers: sweep their beams into the sky
  const heads = [];
  TWX.forEach((tx, i) => {
    const hd = new THREE.Group(); hd.position.set(tx, DY + 1.975 + 0.5, 0.62); g.add(hd);
    K.cyl(hd, 0.11, 0.11, 0.22, 0x1e1e24, 0, 0, 0, 10).rotation.z = 0;               // head, pointing up
    const lens = K.cyl(hd, 0.085, 0.085, 0.02, PAL[0], 0, 0.115, 0, 10, { glow: true }); lens.userData.keep = true;
    const beam = K.part(hd, new THREE.ConeGeometry(0.34, 2.4, 10, 1, true), PAL[0], 0, 0.12 + 1.2, 0, { glow: true, opacity: 0.18, double: true });
    beam.rotation.x = Math.PI; beam.visible = night;
    bake(hd);
    heads.push({ g: hd, lens, beam, side: i === 0 ? -1 : 1 });
  });
  // mirror ball over the DJ
  rod(S, DJX, TY - 0.09, 0, DJX, 3.58, 0, 0.01, SILVER, 3);
  const ball = (() => {
    const geo = new THREE.SphereGeometry(0.19, 10, 7).toNonIndexed(), n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let f = 0; f < n / 3; f++) { _c.setHex([0xf2f4ff, 0x8a90a8, 0xc8e8ff, 0x60647a, 0xffffff][(f * 7 + (f >> 2)) % 5]); for (let v = 0; v < 3; v++) { col[(f * 3 + v) * 3] = _c.r; col[(f * 3 + v) * 3 + 1] = _c.g; col[(f * 3 + v) * 3 + 2] = _c.b; } }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, vcMat(false, night)); m.position.set(DJX, 3.39, 0); g.add(m); return m;
  })();
  // strobes on the front truss, only during the drop
  const strobe = new THREE.Group(); g.add(strobe);
  for (const x of [-2.6, 0.2]) K.box(strobe, 0.28, 0.1, 0.08, 0xffffff, x, TY + 0.15, TZ, { glow: true });
  bake(strobe); strobe.visible = false;
  // LED strips on the deck edges + desk trim: swap between the palette materials
  const strips = [];
  for (const zs of [-1, 1]) strips.push(K.box(g, DW, 0.05, 0.03, PAL[0], DCX, DY - 0.04, zs * 1.235, { glow: true }));
  strips.push(K.box(g, 1.82, 0.035, 0.035, PAL[0], DJX, DY + 0.95, 0.93, { glow: true }));

  // ---- bake the static parts ----
  bake(S); bake(dj); bake(gina);

  // ================= animation =================
  let lastBeat = -1, bf = 0, spin = 0;
  const setColours = (beat) => {
    for (let i = 0; i < lights.length; i++) { const k = (beat + i) % 6; lights[i].lens.material = lensM[k]; lights[i].beam.material = beamM[k]; }
    for (let i = 0; i < heads.length; i++) { const k = (beat + 3 + i * 2) % 6; heads[i].lens.material = lensM[k]; heads[i].beam.material = beamM[k]; }
    for (let i = 0; i < strips.length; i++) strips[i].material = lensM[(beat + i * 2 + 1) % 6];
  };
  g.userData.tick = (t, dt, ctx) => {
    dt = Math.min(dt || 0.016, 0.1);
    const b = ctx && ctx.beat;
    let beat, phase, pulse, drop = false;
    if (b && b.beat != null) { beat = b.beat; phase = b.phase || 0; pulse = b.pulse || 0; drop = b.section === 'drop'; }   // strobes only in the bass run
    else { bf = t * 128 / 60; beat = Math.floor(bf); phase = bf - beat; pulse = 0.85 * Math.exp(-phase * 6); }
    if (beat !== lastBeat) { lastBeat = beat; setColours(beat < 0 ? 0 : beat); }
    // speakers pump
    for (let i = 0; i < cones.length; i++) { const c = cones[i]; c.scale.z = c.userData.base * (1 + 1.8 * pulse); c.scale.x = c.scale.y = 1 + 0.07 * pulse; }
    // DJ: nod on the kick, Kranz up, left hand scratches
    djHead.rotation.x = 0.32 * pulse - 0.05;
    djSh.rotation.z = 0.3 * pulse - 0.55; djEl.rotation.z = 0.25 * pulse - 0.1; kr.rotation.z = -(djSh.rotation.z + djEl.rotation.z);
    djLSh.rotation.y = Math.sin(t * 9) * 0.12;
    dj.position.y = DY + 0.015 * pulse;
    // LamboGina hops, arms pump alternately
    const hop = Math.abs(Math.sin((beat + phase) * Math.PI));
    gina.position.y = GY + 0.07 * hop * hop;
    gina.rotation.y = 0.7 + 0.12 * Math.sin((beat + phase) * Math.PI / 2);
    gR.rotation.z = (beat % 2 ? 0.35 : -0.05) * (1 - phase) ; gL.rotation.z = -2.95 + (beat % 2 ? 0 : 0.3) * (1 - phase);
    // moving heads sweep, mirror ball turns, records spin
    for (let i = 0; i < heads.length; i++) { const h = heads[i]; h.g.rotation.z = h.side * (0.2 + 0.25 * Math.sin(t * 0.9 + i * 2.1)); h.g.rotation.x = 0.14 * Math.sin(t * 0.63 + i); }
    spin += dt; ball.rotation.y = spin * 0.9;
    platters[0].rotation.y = -t * 3.5; platters[1].rotation.y = -t * 3.5 + 1.3 + Math.sin(t * 9) * 0.4;
    strobe.visible = drop && pulse > 0.45;
  };
  g.userData.tick(0, 0, null);
});

// Spielhalle "Jolde Hufeise": a 1970s gambling arcade on the Ring. Mustard tiles, bronze window frames, smoked glass with
// rows of wall-hung fruit machines glowing behind it, a red marquee framed by chasing bulbs and a golden horseshoe on top.
// By the door a heavy man in fedora and leather coat smokes and watches the traffic; inside, a regular in a flat cap
// feeds the machine that, every few seconds, hits the 7-7-7.
// The front stands close to the house line (the game puts a facade piece's +z edge on it), the marquee reaches over the
// pavement, and the building block behind is full depth, so it reads as a one-storey infill shop between the houses.
Veedel.define('spielhalle', { name: 'Spielhalle Jolde Hufeise', kind: 'chicago', w: 8, d: 2.5 }, (root, o, K) => {
  const night = K.theme().night;
  const SH = 0.9;                                    // everything is built 0.9 m further back and moved forward as one
  const g = new THREE.Group(); g.position.z = SH; root.add(g);

  // ---- merge helper: many small parts -> one mesh (vertex colours, optional uv remap) ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const VM = K.__vcMatCache || (K.__vcMatCache = {});
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  function merge(parts) {
    const pos = [], nor = [], col = [], uv = [];
    for (const it of parts) {
      const geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      _e.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0); _q.setFromEuler(_e);
      _p.set(it.p[0], it.p[1], it.p[2]); _s.set(1, 1, 1); _m.compose(_p, _q, _s); geo.applyMatrix4(_m);
      const pa = geo.attributes.position.array, na = geo.attributes.normal.array, ua = geo.attributes.uv.array; _c.setHex(it.c == null ? 0xffffff : it.c);
      for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (let i = 0; i < pa.length / 3; i++) col.push(_c.r, _c.g, _c.b);
      const r = it.uvr || [0, 0, 1, 1]; // [u0, v0, su, sv]
      for (let i = 0; i < ua.length; i += 2) uv.push(r[0] + ua[i] * r[2], r[1] + ua[i + 1] * r[3]);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return bg;
  }
  const vmesh = (parts, glow, material) => { const m = new THREE.Mesh(merge(parts), material || vcMat(false, glow)); g.add(m); return m; };
  const bx = (x0, x1, y0, y1, z0, z1, c) => ({ geo: new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), c, p: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });

  // ---- fruit machine screens: one pixel atlas with four reel pictures (shared by every Spielhalle) ----
  function screenMat() {
    if (K.__spielhalleScreen) return K.__spielhalleScreen;
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 96; const x = cv.getContext('2d');
    const sym = (s, cx, cy) => {
      if (s === 'cherry') { x.strokeStyle = '#1f8a2a'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 3, cy + 1); x.lineTo(cx + 1, cy - 7); x.lineTo(cx + 3, cy + 2); x.stroke(); x.fillStyle = '#e0101c'; x.beginPath(); x.arc(cx - 3, cy + 3, 3.4, 0, 7); x.fill(); x.beginPath(); x.arc(cx + 3, cy + 4, 3.4, 0, 7); x.fill(); }
      if (s === 'bell') { x.fillStyle = '#f0b800'; x.beginPath(); x.moveTo(cx, cy - 8); x.quadraticCurveTo(cx + 6, cy - 7, cx + 6, cy + 3); x.lineTo(cx + 7, cy + 5); x.lineTo(cx - 7, cy + 5); x.lineTo(cx - 6, cy + 3); x.quadraticCurveTo(cx - 6, cy - 7, cx, cy - 8); x.fill(); x.fillStyle = '#8a5a00'; x.fillRect(cx - 1, cy + 5, 3, 3); }
      if (s === 'lemon') { x.fillStyle = '#ffe000'; x.beginPath(); x.ellipse(cx, cy, 6, 4.5, 0, 0, 7); x.fill(); x.fillStyle = '#c8a800'; x.fillRect(cx + 5, cy - 1, 2, 2); }
      if (s === 'seven') { x.fillStyle = '#e0101c'; x.fillRect(cx - 5, cy - 8, 11, 4); x.beginPath(); x.moveTo(cx + 6, cy - 4); x.lineTo(cx + 1, cy + 8); x.lineTo(cx - 3, cy + 8); x.lineTo(cx + 2, cy - 4); x.fill(); }
      if (s === 'bar') { x.fillStyle = '#111111'; x.fillRect(cx - 6, cy - 4, 13, 8); x.fillStyle = '#ffffff'; x.fillRect(cx - 5, cy - 1, 11, 2); }
    };
    [['cherry', 'bell', 'seven'], ['bell', 'lemon', 'cherry'], ['seven', 'seven', 'seven'], ['bar', 'cherry', 'lemon']].forEach((row, ri) => {
      const y0 = ri * 24; x.fillStyle = ri === 2 ? '#ffd23f' : '#101018'; x.fillRect(0, y0, 48, 24);
      row.forEach((s, k) => { x.fillStyle = '#fffbe8'; x.fillRect(k * 16 + 1, y0 + 2, 14, 20); sym(s, k * 16 + 8, y0 + 12); });
      x.fillStyle = ri === 2 ? '#e0101c' : '#ff3030'; x.fillRect(0, y0 + 11, 1, 2); x.fillRect(47, y0 + 11, 1, 2); // win line marks
    });
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    return (K.__spielhalleScreen = new THREE.MeshBasicMaterial({ map: tex }));
  }
  const ROW = (r) => [0, 1 - (r + 1) / 4, 1, 0.25]; // uv window of atlas row r (0 = top)

  // ---- colours ----
  const BROWN = 0x3b2518, MUSTARD = 0xd49a2e, BRONZE = 0x9a7a3e, RED = 0xa8101c, CHROME = 0xd0d0d6, STONE = 0x8a8680;
  const ZB = -2.15, ZI = -1.25, ZF = -0.45;   // back of the building block, back of the shop window, front face of the facade
  const MZ = 0.25, MC = (ZF + MZ) / 2;        // front of the marquee, middle of the marquee
  const L = [], GL = [];                       // lambert parts, glowing parts
  const lamp = (p) => (night ? GL : L).push(p); // glows only at night

  // ---------------------------------------------------------------- facade ----
  L.push(
    bx(-3.7, -0.8, 0, 0.35, ZB, ZF, BROWN), bx(0.8, 3.7, 0, 0.35, ZB, ZF, BROWN),                     // tiled plinths
    bx(-4, -3.7, 0, 2.65, ZB, ZF, BROWN), bx(-0.8, -0.6, 0, 2.65, ZB, ZF, BROWN),                   // pilasters
    bx(0.6, 0.8, 0, 2.65, ZB, ZF, BROWN), bx(3.7, 4, 0, 2.65, ZB, ZF, BROWN),
    bx(-0.6, 0.6, 2.4, 2.65, ZB, ZF, BROWN),                                                           // over the door
    bx(-4, 4, 0, 2.65, ZB, ZB + 0.05, BROWN),                                                         // back wall of the block
    bx(-4, 4, 2.65, 4.4, ZB, ZF, MUSTARD),                                                             // upper wall
    bx(-4, 4, 2.65, 2.8, ZF, ZF + 0.03, BROWN), bx(-4, 4, 4.0, 4.07, ZF, ZF + 0.02, BROWN),           // brown tile bands
    bx(-4, 4, 4.4, 4.56, ZB, ZF + 0.12, BROWN), bx(-4, 4, 4.4, 4.45, ZF + 0.12, ZF + 0.15, BRONZE) // cornice
  );
  for (const xa of [-3.7, 0.8]) for (const y of [0.12, 0.24]) L.push(bx(xa, xa + 2.9, y - 0.012, y + 0.012, ZF, ZF + 0.006, 0x6a4a30)); // plinth tile joints
  // window frames (bronze anodised), transom
  for (const [xa, xb] of [[-3.7, -0.8], [0.8, 3.7]]) {
    L.push(bx(xa, xa + 0.06, 0.35, 2.65, ZF - 0.1, ZF - 0.02, BRONZE), bx(xb - 0.06, xb, 0.35, 2.65, ZF - 0.1, ZF - 0.02, BRONZE),
      bx(xa, xb, 0.35, 0.42, ZF - 0.1, ZF - 0.02, BRONZE), bx(xa, xb, 2.58, 2.65, ZF - 0.1, ZF - 0.02, BRONZE), bx(xa, xb, 2.26, 2.31, ZF - 0.1, ZF - 0.02, BRONZE));
  }
  // door: recessed smoked-glass door, bronze frame, chrome push bar, stone step
  L.push(bx(-0.6, -0.53, 0, 2.4, -0.68, -0.6, BRONZE), bx(0.53, 0.6, 0, 2.4, -0.68, -0.6, BRONZE), bx(-0.6, 0.6, 2.33, 2.4, -0.68, -0.6, BRONZE),
    bx(-0.53, 0.53, 0.1, 2.33, -0.68, -0.65, 0x1c161a), bx(-0.42, 0.42, 1.04, 1.1, -0.64, -0.6, CHROME), bx(-0.53, 0.53, 0.1, 0.3, -0.65, -0.64, BRONZE),
    bx(-0.6, 0.6, 0, 0.1, -0.68, -0.3, STONE));
  // interior: dark red wallpaper with a gold rail (lit at night), fluorescent tubes
  lamp(bx(-3.7, 3.7, 0.35, 2.65, ZI + 0.05, ZI + 0.15, night ? 0x4a1424 : 0x3a0c16));
  L.push(bx(-3.7, 3.7, 1.02, 1.06, ZI + 0.15, ZI + 0.17, 0xc8a040), bx(-3.7, 3.7, 0.35, 2.65, ZI, ZI + 0.05, BROWN)); // gold rail; plain brown back skin
  GL.push(bx(-3.5, -1.0, 2.55, 2.6, -0.78, -0.7, 0xeef4ff), bx(1.0, 3.5, 2.55, 2.6, -0.78, -0.7, 0xeef4ff));

  // ---------------------------------------------------------------- fruit machines ----
  const MX = [-3.33, -2.61, -1.89, -1.17, 1.17, 1.89, 2.61, 3.33], CAB = [0xc1121f, 0x1e1e24, 0xe0701a, 0x5a3a20], HEAD = [0xff3d8a, 0xffd23f, 0x2fd4ff, 0x7fff3a];
  const screens = [], FLICK = 6;
  MX.forEach((x, i) => {
    L.push(bx(x - 0.31, x + 0.31, 1.12, 2.16, -1.1, -0.88, CAB[i % 4]), bx(x - 0.32, x + 0.32, 2.16, 2.2, -1.1, -0.86, CHROME),
      bx(x - 0.27, x + 0.27, 1.66, 1.94, -0.88, -0.87, 0x0a0a0a),                       // screen surround
      bx(x - 0.18, x + 0.18, 1.2, 1.28, -0.88, -0.8, CHROME),                           // coin tray
      bx(x - 0.2, x - 0.12, 1.4, 1.45, -0.88, -0.86, 0xffffff), bx(x - 0.04, x + 0.04, 1.4, 1.45, -0.88, -0.86, 0xffffff), bx(x + 0.12, x + 0.2, 1.4, 1.45, -0.88, -0.86, 0xe0101c)); // start buttons
    GL.push(bx(x - 0.27, x + 0.27, 1.98, 2.12, -0.88, -0.865, HEAD[i % 4]));          // lit header
    for (let k = 0; k < 5; k++) GL.push(bx(x - 0.255 + k * 0.11, x - 0.185 + k * 0.11, 1.53, 1.6, -0.88, -0.865, [0xff3030, 0xffd23f, 0x30ff60][(k + i) % 3])); // risk ladder
    if (i !== FLICK) screens.push({ geo: new THREE.PlaneGeometry(0.48, 0.22), p: [x, 1.8, -0.864], uvr: ROW([0, 1, 3, 1, 0, 3, 1, 0][i]) });
  });
  const sm = screenMat();
  vmesh(screens, false, sm);
  const scrN = new THREE.Mesh(merge([{ geo: new THREE.PlaneGeometry(0.48, 0.22), p: [0, 0, 0], uvr: ROW(3) }]), sm);   // reels spinning
  const scrJ = new THREE.Mesh(merge([{ geo: new THREE.PlaneGeometry(0.48, 0.22), p: [0, 0, 0], uvr: ROW(2) }]), sm);   // 7-7-7
  scrN.position.set(MX[FLICK], 1.8, -0.864); scrJ.position.set(MX[FLICK], 1.8, -0.864); scrJ.visible = false; g.add(scrN, scrJ);

  // ---------------------------------------------------------------- marquee ----
  L.push(bx(-3, 3, 2.8, 3.8, ZF, MZ, RED),
    bx(-3.03, 3.03, 2.77, 2.83, MZ - 0.03, MZ + 0.03, CHROME), bx(-3.03, 3.03, 3.77, 3.83, MZ - 0.03, MZ + 0.03, CHROME),
    bx(-3.03, -2.97, 2.8, 3.8, MZ - 0.03, MZ + 0.03, CHROME), bx(2.97, 3.03, 2.8, 3.8, MZ - 0.03, MZ + 0.03, CHROME));
  lamp(bx(-2.7, 2.7, 2.97, 3.63, MZ, MZ + 0.015, 0x111111));                              // black sign panel (unlit at night, like the letters' ground)
  GL.push(bx(-2.95, 2.95, 2.785, 2.8, ZF + 0.05, MZ - 0.05, 0xfff2b8));                   // bulb-lit soffit
  lamp(bx(-3.9, 3.9, 4.2, 4.25, ZF, ZF + 0.04, 0xff3d9a));                                // pink neon line under the cornice
  K.text(g, 'SPIELHALLE', { fg: '#ffffff', bg: '#111111', w: 2.6, h: 0.22, x: 0, y: 3.51, z: MZ + 0.02, glow: night, sizeK: 0.8 });
  K.text(g, 'JOLDE HUFEISE', { fg: '#ffd23f', bg: '#111111', w: 5.2, h: 0.42, x: 0, y: 3.17, z: MZ + 0.02, glow: night, sizeK: 0.8 });
  for (const s of [-1, 1]) K.text(g, '7 7 7', { fg: '#ffd23f', bg: '#111111', border: '#d0d0d6', w: 0.62, h: 0.5, x: s * 3.005, y: 3.3, z: MC, ry: s * Math.PI / 2, glow: night });
  // window lettering, an OPEN neon and the door notice
  K.text(g, 'GELDSPIELGERÄTE', { fg: '#ffd23f', bg: '#1a1014', w: 2.4, h: 0.24, x: -2.25, y: 0.62, z: ZF - 0.06, glow: night });
  K.text(g, 'FLIPPER · BILLARD', { fg: '#ffd23f', bg: '#1a1014', w: 2.4, h: 0.24, x: 2.25, y: 0.62, z: ZF - 0.06, glow: night });
  K.text(g, 'GEÖFFNET', { fg: '#ff4fa0', bg: '#1a0a12', w: 0.8, h: 0.2, x: -1.4, y: 2.1, z: ZF - 0.06, glow: true });
  K.text(g, 'ZUTRITT AB 18', { fg: '#ffffff', bg: '#1c161a', w: 0.8, h: 0.16, x: 0, y: 1.55, z: -0.645, glow: night, sizeK: 0.6 });

  // chasing bulbs round the sign: one dim base set, three lit sets that take turns
  const BP = [];
  for (let k = 0; k <= 22; k++) BP.push([-2.85 + k * 5.7 / 22, 3.725]);
  for (const y of [3.5, 3.3, 3.1]) BP.push([2.85, y]);
  for (let k = 22; k >= 0; k--) BP.push([-2.85 + k * 5.7 / 22, 2.875]);
  for (const y of [3.1, 3.3, 3.5]) BP.push([-2.85, y]);
  const dim = [], litP = [[], [], []];
  BP.forEach(([x, y], i) => {
    dim.push({ geo: new THREE.OctahedronGeometry(0.045), c: night ? 0x6a5a3a : 0xf0e2b0, p: [x, y, MZ + 0.025] });
    litP[i % 3].push({ geo: new THREE.IcosahedronGeometry(0.056), c: 0xfff0a0, p: [x, y, MZ + 0.025] });
  });
  L.push(...dim);
  const lit = litP.map((ps) => vmesh(ps, true));

  // golden horseshoe on the marquee roof, open side up so the luck stays in
  const hs = K.part(g, new THREE.TorusGeometry(0.4, 0.08, 6, 14, Math.PI * 1.3), night ? 0xffc830 : 0xe0b030, 0, 4.28, MC, { glow: night }); hs.rotation.z = 0.85 * Math.PI;
  for (let k = 0; k < 6; k++) { const a = 0.95 * Math.PI + (k + 0.5) * 1.1 * Math.PI / 6; L.push({ geo: new THREE.BoxGeometry(0.045, 0.045, 0.02), c: 0x5a3a10, p: [Math.cos(a) * 0.4, 4.28 + Math.sin(a) * 0.4, MC + 0.08], r: [0, 0, a] }); } // nail holes

  // standing ashtray by the door
  L.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), c: CHROME, p: [-1.05, 0.37, -0.22] }, { geo: new THREE.CylinderGeometry(0.16, 0.12, 0.1, 10), c: CHROME, p: [-1.05, 0.76, -0.22] },
    { geo: new THREE.CylinderGeometry(0.17, 0.19, 0.04, 10), c: 0x2a2a2a, p: [-1.05, 0.02, -0.22] }, { geo: new THREE.CylinderGeometry(0.13, 0.13, 0.02, 8), c: 0xb8b0a0, p: [-1.05, 0.81, -0.22] },
    { geo: new THREE.CylinderGeometry(0.045, 0.045, 0.01, 8), c: 0xffffff, p: [-1.0, 0.825, -0.2] }, { geo: new THREE.CylinderGeometry(0.03, 0.027, 0.17, 6), c: 0xf5b800, p: [-1.0, 0.915, -0.2] },
    { geo: new THREE.CylinderGeometry(0.031, 0.031, 0.03, 6), c: 0xffffff, p: [-1.0, 1.015, -0.2] }); // somebody's forgotten Kölsch on its Deckel

  vmesh(L, false); vmesh(GL, true);

  // smoked glass over the machines
  const glass = K.mat(night ? 0x0c0c14 : 0x1a1a24, { opacity: night ? 0.35 : 0.5 });
  for (const x of [-2.25, 2.25]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.88, 2.3), glass); p.position.set(x, 1.5, ZF - 0.07); g.add(p); }

  // ---------------------------------------------------------------- people ----
  // gather head, hair, hat, glasses and cigar of a K.person into a pivot, so the head can turn on its own
  function headPivot(pp) {
    const pv = new THREE.Group(); pv.position.set(0, 1.58, 0);
    pp.children.filter((c) => c.isMesh && c.position.y >= 1.56 && Math.abs(c.position.x) < 0.2).forEach((c) => { c.position.y -= 1.58; pv.add(c); });
    pp.add(pv); return pv;
  }
  // hang an arm of a K.person (upper arm, forearm, hand) from a pivot at the shoulder, so it can swing as one; null if not found
  const findAt = (pp, x, y, z) => pp.children.find((c) => c.isMesh && Math.abs(c.position.x - x) < 0.004 && Math.abs(c.position.y - y) < 0.004 && Math.abs(c.position.z - z) < 0.004);
  function armPivot(pp, sx) {
    const parts = [findAt(pp, sx * 0.23, 1.21, 0), findAt(pp, sx * 0.245, 0.93, 0.025), findAt(pp, sx * 0.24, 0.76, 0.06)];
    if (parts.some((m) => !m)) return null;
    const pv = new THREE.Group(); pv.position.set(sx * 0.21, 1.36, 0); pp.add(pv);
    for (const m of parts) { m.position.x -= sx * 0.21; m.position.y -= 1.36; pv.add(m); }
    return pv;
  }
  // the regular inside, back to the street, feeding the jackpot machine (no. 6, beside him so its screen stays in view);
  // when the 7-7-7 comes he throws both arms in the air
  const PLAYER_X = 2.22, PLAYER_RY = Math.PI - 0.3;
  const player = K.put(g, K.person({ hat: 'cap', hatColor: 0x5a5a4a, shirt: 0x8a7a52, pants: 0x3a3a44, skin: 0xf1c27d, h: 1.7 }), PLAYER_X, 0.35, -0.7, PLAYER_RY);
  const armL = armPivot(player, 1), armR = armPivot(player, -1);
  // the man by the door: fedora, leather coat, gold tie, shades, cigar
  const MAN_H = 1.8, MS = MAN_H / 1.75, BODY0 = -0.25;
  const man = K.put(g, K.person({ hat: 'fedora', hatColor: 0x141414, shirt: 0x3a2216, pants: 0x18181c, shoes: 0x0e0e0e, coat: true, cigar: true, glasses: true, shades: true, moustache: 0x2a1a10, skin: 0xe0ac69, tie: 0xd4a020, heavy: true, smile: 0.3, h: MAN_H }), 1.2, 0, -0.1, BODY0);
  const mHead = headPivot(man);
  // cigar smoke: soft unlit puffs that leave the cigar tip and rise on their own (they do not swing with the head)
  const smoke = night ? K.mat(0x8a8a9a, { glow: true, opacity: 0.32 }) : K.mat(0xf4f4f0, { glow: true, opacity: 0.5 });
  const puffGeo = new THREE.IcosahedronGeometry(0.05, 1), NP = 4, puffs = [], pOx = new Float32Array(NP), pOy = new Float32Array(NP), pOz = new Float32Array(NP), pPh = new Float32Array(NP);
  const TIPX = 0.04, TIPY = 0.035, TIPZ = 0.25;           // cigar tip relative to the head pivot (person units)
  let tipX = 0, tipY = 0, tipZ = 0;
  const cigarTip = (by, hy) => {                           // -> tipX/Y/Z in the front group's frame
    const cy = Math.cos(hy), sy = Math.sin(hy), hx = TIPX * cy + TIPZ * sy, hz = -TIPX * sy + TIPZ * cy;
    const px = hx * MS, pz = hz * MS, cb = Math.cos(by), sb = Math.sin(by);
    tipX = man.position.x + px * cb + pz * sb; tipY = man.position.y + (1.58 + TIPY) * MS; tipZ = man.position.z - px * sb + pz * cb;
  };
  cigarTip(BODY0, 0);
  for (let i = 0; i < NP; i++) { const p = new THREE.Mesh(puffGeo, smoke); p.position.set(tipX, tipY, tipZ); p.scale.setScalar(0.001); g.add(p); puffs.push(p); pOx[i] = tipX; pOy[i] = tipY; pOz[i] = tipZ; pPh[i] = 1; }

  // ---------------------------------------------------------------- animation ----
  const _lc = new THREE.Vector3(); let bodyYaw = BODY0, headYaw = 0;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  root.userData.tick = (t, dt, ctx) => {
    const b = ctx && ctx.beat, party = !!(b && b.playing && b.pulse > 0.7);
    const cyc = t % 9, jackpot = cyc < 1.8, flash = Math.floor(t * 8) % 2 === 0; // machine 6 hits the 7-7-7 every nine seconds
    const step = Math.floor(t * 7) % 3;                        // chase: two sets on, one off, running round; all flash at a jackpot
    for (let k = 0; k < 3; k++) lit[k].visible = jackpot ? flash : party || k !== step;
    if (jackpot) { scrN.visible = false; scrJ.visible = flash; player.position.y = 0.35 + Math.abs(Math.sin(t * 12)) * 0.04; player.rotation.y = PLAYER_RY + Math.sin(t * 9) * 0.12;
      const up = 2.5 + 0.22 * Math.sin(t * 12); if (armL) armL.rotation.set(0, 0, up); if (armR) armR.rotation.set(0, 0, -up); }
    else { const h = Math.imul(Math.floor(t * 15) + 7, 2654435761) >>> 0; scrN.visible = h % 11 > 1; scrJ.visible = false; player.position.y = 0.35; player.rotation.y = PLAYER_RY;
      if (armL) armL.rotation.set(-0.1, 0, 0); if (armR) armR.rotation.set(-0.2 - 0.12 * Math.max(0, Math.sin(t * 6)), 0, 0); } // taps the start button
    // he looks after a passing car: the head does most of the turning, the body follows a little
    let target = BODY0; const cars = ctx && ctx.cars;
    if (cars && cars.length) {
      let best = 400;
      for (let i = 0; i < cars.length; i++) { if (!cars[i]) continue; _lc.copy(cars[i]); g.worldToLocal(_lc); const dx = _lc.x - man.position.x, dz = _lc.z - man.position.z, d2 = dx * dx + dz * dz; if (dz > 0 && d2 < best) { best = d2; target = clamp(Math.atan2(dx, dz), -1.15, 1.15); } }
    }
    const k = Math.min(1, dt * 2.5), wantBody = BODY0 + clamp((target - BODY0) * 0.3, -0.35, 0.35) + Math.sin(t * 0.7) * 0.04; // a slow weight shift
    bodyYaw += (wantBody - bodyYaw) * k; man.rotation.y = bodyYaw;
    headYaw += (clamp(target - bodyYaw, -0.85, 0.85) - headYaw) * Math.min(1, dt * 5); mHead.rotation.y = headYaw;
    // cigar smoke
    cigarTip(bodyYaw, headYaw);
    for (let i = 0; i < NP; i++) {
      const ph = (t * 0.4 + i / NP) % 1, p = puffs[i];
      if (ph < pPh[i]) { pOx[i] = tipX; pOy[i] = tipY; pOz[i] = tipZ; }   // a new puff leaves the cigar
      pPh[i] = ph;
      p.position.set(pOx[i] + ph * 0.16, pOy[i] + ph * 0.6, pOz[i] + ph * 0.05);
      p.scale.setScalar(Math.max(0.001, (0.45 + ph * 1.5) * (ph < 0.75 ? 1 : (1 - ph) * 4)));
    }
  };
});

// Wettbüro "Zum Lahme Jaul": a small 1970s betting shop. Racing-green front, a lit fascia with a golden galloping horse,
// a chalk board with today's odds from Weidenpesch and a TV inside showing the race. Outside two regulars with the
// racing paper "DÄ SCHNELLE": the one in the fedora grins over his paper (he backed the lame nag at 99:1), the one in
// the flat cap shakes his head, crumples his ticket and flicks it at the bin - and misses, like everybody before him.
// The fedora's dachshund watches the paper ball fly. A projecting WETTEN sign reads from down the street.
// The front stands close to the house line (the game puts a facade piece's +z edge on it) and the block behind is full
// depth, so the shop reads as a one-storey infill between the houses.
Veedel.define('wettbuero', { name: 'Wettbüro Zum Lahme Jaul', kind: 'chicago', w: 6, d: 2.5 }, (root, o, K) => {
  const night = K.theme().night;
  const SH = 0.6;                                    // everything is built 0.6 m further back and moved forward as one
  const g = new THREE.Group(); g.position.z = SH; root.add(g);

  // ---- merge helper: many small parts -> one mesh (vertex colours, optional uv remap) ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const VM = K.__vcMatCache || (K.__vcMatCache = {});
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  function merge(parts) {
    const pos = [], nor = [], col = [], uv = [];
    for (const it of parts) {
      const geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      _e.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0); _q.setFromEuler(_e);
      _p.set(it.p[0], it.p[1], it.p[2]); _s.set(1, 1, 1); _m.compose(_p, _q, _s); geo.applyMatrix4(_m);
      const pa = geo.attributes.position.array, na = geo.attributes.normal.array, ua = geo.attributes.uv.array; _c.setHex(it.c == null ? 0xffffff : it.c);
      for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (let i = 0; i < pa.length / 3; i++) col.push(_c.r, _c.g, _c.b);
      const r = it.uvr || [0, 0, 1, 1];
      for (let i = 0; i < ua.length; i += 2) uv.push(r[0] + ua[i] * r[2], r[1] + ua[i + 1] * r[3]);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return bg;
  }
  const vmesh = (parent, parts, glow, material) => { const m = new THREE.Mesh(merge(parts), material || vcMat(false, glow)); parent.add(m); return m; };
  const bx = (x0, x1, y0, y1, z0, z1, c) => ({ geo: new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), c, p: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
  const texMat = (cv, glow, extra) => { const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; const p = Object.assign({ map: t }, extra || {}); return glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); };

  // ---- a galloping horse with jockey, drawn on a canvas (TV frames, the fascia cutout, the paper photo) ----
  function drawHorse(x, cx, cy, s, frame, coat, silk) {
    x.fillStyle = coat; x.strokeStyle = coat; x.lineCap = 'round';
    x.beginPath(); x.ellipse(cx, cy, 10 * s, 4.5 * s, 0, 0, 7); x.fill();                                   // body
    x.beginPath(); x.moveTo(cx + 6 * s, cy - 3 * s); x.lineTo(cx + 12 * s, cy - 10 * s); x.lineTo(cx + 15 * s, cy - 9 * s); x.lineTo(cx + 10 * s, cy + 1 * s); x.fill(); // neck
    x.beginPath(); x.ellipse(cx + 15.5 * s, cy - 8 * s, 3.6 * s, 1.9 * s, 0.55, 0, 7); x.fill();             // head
    x.lineWidth = 1.8 * s; x.beginPath(); x.moveTo(cx - 9 * s, cy - 2 * s); x.quadraticCurveTo(cx - 14 * s, cy - 3 * s, cx - 16 * s, cy + 3 * s); x.stroke(); // tail
    x.lineWidth = 1.7 * s;
    const leg = (ax, ay, kx, ky, fx, fy) => { x.beginPath(); x.moveTo(cx + ax * s, cy + ay * s); x.lineTo(cx + kx * s, cy + ky * s); x.lineTo(cx + fx * s, cy + fy * s); x.stroke(); };
    if (frame === 0) { leg(7, 2, 12, 6, 16, 8); leg(5, 3, 9, 7, 13, 10); leg(-7, 2, -12, 6, -16, 9); leg(-5, 3, -9, 7, -12, 11); }   // stretched
    else { leg(7, 2, 9, 7, 6, 10); leg(5, 3, 5, 8, 2, 10); leg(-7, 2, -5, 7, -2, 10); leg(-5, 3, -2, 7, 1, 9); }                    // gathered
    x.fillStyle = silk; x.beginPath(); x.moveTo(cx - 2 * s, cy - 4 * s); x.lineTo(cx + 5 * s, cy - 9 * s); x.lineTo(cx + 7 * s, cy - 7 * s); x.lineTo(cx + 2 * s, cy - 3 * s); x.fill(); // jockey, crouched
    x.beginPath(); x.arc(cx + 7 * s, cy - 10.5 * s, 1.8 * s, 0, 7); x.fill();
  }
  // shared canvases/materials (built once for all Wettbüros, per day/night)
  const C = K.__wettbuero || (K.__wettbuero = {});
  if (!C.tv) {
    C.tv = [0, 1].map((f) => {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48; const x = cv.getContext('2d');
      x.fillStyle = '#7ab8e0'; x.fillRect(0, 0, 64, 16); x.fillStyle = '#2f8a3a'; x.fillRect(0, 16, 64, 32);
      x.fillStyle = '#ffffff'; x.fillRect(0, 17, 64, 2); for (let k = f * 4; k < 64; k += 8) x.fillRect(k, 15, 2, 4); // rail and posts
      drawHorse(x, 16 + f, 30, 0.75, f, '#5a3418', '#ff2020'); drawHorse(x, 38 - f, 36, 0.8, 1 - f, '#2a1a10', '#ffd400'); drawHorse(x, 50 + f, 27, 0.65, f, '#8a5a30', '#1c6cff');
      x.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 48; y += 2) x.fillRect(0, y, 64, 1);                    // scan lines
      return texMat(cv, true);
    });
    const hc = document.createElement('canvas'); hc.width = 128; hc.height = 96; const hx = hc.getContext('2d');
    drawHorse(hx, 62, 50, 3.3, 0, '#d4a020', '#d4a020'); hx.fillStyle = '#d4a020'; hx.fillRect(8, 88, 112, 8);
    C.horse = [texMat(hc, false, { alphaTest: 0.5, side: THREE.DoubleSide }), texMat(hc, true, { alphaTest: 0.5, side: THREE.DoubleSide })];
    // chalk board with the odds
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 240; const b = bc.getContext('2d');
    b.fillStyle = '#1f2b26'; b.fillRect(0, 0, 256, 240); b.fillStyle = 'rgba(255,255,255,0.06)'; for (let k = 0; k < 30; k++) b.fillRect((k * 53) % 240, (k * 37) % 230, 30, 4); // smudges
    b.textBaseline = 'middle'; b.fillStyle = '#ffe36a'; b.font = 'bold 30px monospace'; b.textAlign = 'center'; b.fillText('QUOTEN', 128, 26);
    b.font = 'bold 18px monospace'; b.fillStyle = '#f0f0e8'; b.fillText('3. Rennen Weidenpesch', 128, 56);
    const odds = [['1 Flönz', '3:1'], ['2 Halve Hahn', '5:1'], ['3 Kamelle', '8:1'], ['4 Strüßjer', '12:1'], ['5 Lahme Jaul', '99:1']];
    b.font = 'bold 20px monospace';
    odds.forEach(([n, q], i) => { const y = 92 + i * 30; b.fillStyle = i === 4 ? '#ff9ad0' : '#f0f0e8'; b.textAlign = 'left'; b.fillText(n, 14, y); b.textAlign = 'right'; b.fillText(q, 242, y); });
    b.strokeStyle = '#ff9ad0'; b.lineWidth = 3; b.beginPath(); b.ellipse(128, 212, 124, 17, 0, 0, 7); b.stroke();
    C.board = [texMat(bc, false), texMat(bc, true, { color: 0xb8b8b8 })];
    // the racing paper: four pages side by side (front, races, sport, result)
    const pc = document.createElement('canvas'); pc.width = 384; pc.height = 136; const p = pc.getContext('2d');
    p.fillStyle = '#f2eee2'; p.fillRect(0, 0, 384, 136);
    const cols = (x0, y0, y1) => { p.fillStyle = '#9a968c'; for (let cx = x0 + 6; cx < x0 + 90; cx += 29) for (let y = y0; y < y1; y += 5) p.fillRect(cx, y, 24 - ((y * 7 + cx) % 9), 2); };
    p.fillStyle = '#ffd400'; p.fillRect(0, 0, 96, 22); p.fillStyle = '#111111'; p.font = 'bold 14px monospace'; p.textAlign = 'center'; p.textBaseline = 'middle'; p.fillText('DÄ SCHNELLE', 48, 12);
    p.fillStyle = '#c1121f'; p.font = 'bold 20px monospace'; p.fillText('JAUL', 48, 36); p.fillText('SIEGT!', 48, 56);
    p.fillStyle = '#6a8a6a'; p.fillRect(8, 68, 80, 34); drawHorse(p, 46, 86, 1.4, 0, '#2a1a10', '#ffd400'); cols(0, 108, 132);
    p.fillStyle = '#111111'; p.font = 'bold 13px monospace'; p.fillText('RENNEN', 144, 12); p.fillStyle = '#111'; p.fillRect(100, 22, 88, 2); cols(96, 30, 132);
    p.fillStyle = '#1c3f95'; p.fillRect(192, 0, 96, 20); p.fillStyle = '#ffffff'; p.fillText('SPORT', 240, 11); cols(192, 28, 132);
    p.fillStyle = '#c1121f'; p.fillRect(288, 0, 96, 20); p.fillStyle = '#ffffff'; p.fillText('ERGEBNIS', 336, 11);
    p.fillStyle = '#111111'; p.font = 'bold 15px monospace'; p.fillText('1. LAHME', 336, 36); p.fillText('JAUL', 336, 54);
    p.fillStyle = '#c1121f'; p.font = 'bold 24px monospace'; p.fillText('99:1', 336, 80); cols(288, 96, 132);
    const ptex = new THREE.CanvasTexture(pc);
    C.paper = [new THREE.MeshLambertMaterial({ map: ptex, side: THREE.DoubleSide }), new THREE.MeshLambertMaterial({ map: ptex })]; // static pages (both sides), turning page (one side each)
  }
  const PAGE = (i) => [i / 4, 0, 1 / 4, 1];

  // ---- colours and planes ----
  const GREEN = 0x1f5a3a, GREEN_D = 0x163e28, BEIGE = 0xd8c8a0, CREAM = 0xeee2c0, WOOD = 0x6a4020, BRASS = 0xd4a020, STONE = 0x8a8680;
  const ZB = -1.85, ZI = -1.25, ZF = -0.5;   // back of the block, back of the shop, front face of the facade
  const L = [], GL = [];
  const lamp = (p) => (night ? GL : L).push(p);

  // ---------------------------------------------------------------- facade ----
  L.push(
    bx(-2.8, -0.2, 0, 0.5, ZB, ZF, GREEN_D),                                                             // plinth under the window
    bx(-3, -2.8, 0, 2.4, ZB, ZF, GREEN), bx(-0.2, 0.05, 0, 2.4, ZB, ZF, GREEN), bx(1.15, 1.35, 0, 2.4, ZB, ZF, GREEN), bx(2.8, 3, 0, 2.4, ZB, ZF, GREEN), // pilasters
    bx(1.35, 2.8, 0, 2.4, ZB, ZF - 0.02, GREEN_D), bx(1.35, 2.8, 0, 0.5, ZF - 0.02, ZF, GREEN),         // wall right of the door
    bx(0.05, 1.15, 2.3, 2.4, ZB, ZF, GREEN),                                                             // over the door
    bx(-3, 3, 2.4, 3.9, ZB, ZF, BEIGE),                                                                  // upper wall
    bx(-3, 3, 0, 2.4, ZB, ZB + 0.05, GREEN_D),                                                           // back wall of the block
    bx(-3, 3, 2.4, 2.76, ZF, ZF + 0.03, 0x1a1a1a),                                                       // black band for TOTO · LOTTO
    bx(-2.97, 2.97, 2.82, 3.55, ZF, ZF + 0.22, GREEN),                                                   // fascia light box
    bx(-3, 3, 3.9, 4.02, ZB, ZF + 0.08, 0x6a5a48),                                                 // cornice
    bx(-2.8, -0.2, 0.5, 0.56, ZF - 0.12, ZF + 0.04, CREAM), bx(-2.8, -2.74, 0.5, 2.4, ZF - 0.1, ZF - 0.02, CREAM), bx(-0.26, -0.2, 0.5, 2.4, ZF - 0.1, ZF - 0.02, CREAM),
    bx(-2.8, -0.2, 2.34, 2.4, ZF - 0.1, ZF - 0.02, CREAM), bx(-2.8, -0.2, 2.02, 2.06, ZF - 0.1, ZF - 0.02, CREAM), bx(-1.53, -1.47, 0.5, 2.02, ZF - 0.1, ZF - 0.02, CREAM) // window frame, transom, mullion
  );
  for (const y of [0.17, 0.34]) L.push(bx(-2.8, -0.2, y - 0.012, y + 0.012, ZF, ZF + 0.006, 0x2a5a3e));   // tile joints
  // door: green, lit pane, brass handle, cream frame, stone step
  L.push(bx(0.05, 0.11, 0, 2.3, -0.7, -0.6, CREAM), bx(1.09, 1.15, 0, 2.3, -0.7, -0.6, CREAM), bx(0.05, 1.15, 2.24, 2.3, -0.7, -0.6, CREAM),
    bx(0.11, 1.09, 0.1, 2.24, -0.7, -0.66, GREEN), bx(0.9, 0.98, 1.08, 1.13, -0.66, -0.6, BRASS), bx(0.05, 1.15, 0, 0.1, -0.7, -0.36, STONE));
  lamp(bx(0.26, 0.94, 1.25, 2.05, -0.66, -0.655, night ? 0xffd890 : 0x8aa4b8));
  // interior: warm back wall, posters, counter, a coupon rack, the ceiling light
  lamp(bx(-2.8, -0.2, 0.5, 2.4, -1.15, -1.05, night ? 0xe8c890 : 0xd8c8a0));
  L.push(bx(-2.8, -0.2, 0.5, 2.4, ZI, ZI + 0.1, GREEN_D),
    bx(-2.7, -0.5, 0.5, 1.05, -1.05, -0.82, WOOD), bx(-2.72, -0.48, 1.05, 1.09, -1.05, -0.78, 0x3a2a1a),  // counter
    bx(-2.55, -2.1, 1.3, 1.9, -1.05, -1.04, 0xc1121f), bx(-2.0, -1.65, 1.35, 1.75, -1.05, -1.04, 0x1c3f95), bx(-0.75, -0.35, 1.3, 1.85, -1.05, -1.04, 0xffd400), // posters
    bx(-0.48, -0.34, 1.09, 1.31, -1.0, -0.86, 0xf2eee2));                                               // stack of coupons
  GL.push(bx(-2.6, -0.4, 2.33, 2.37, -0.95, -0.85, 0xfff6d8));
  // the TV on its pole, showing the race
  L.push(bx(-1.28, -1.24, 2.1, 2.4, -0.8, -0.76, 0x2a2a2a), bx(-1.55, -0.97, 1.7, 2.1, -1.0, -0.66, 0x5a3a20), bx(-1.08, -1.0, 1.75, 2.05, -0.66, -0.65, 0x9a9a9a));
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), C.tv[0]); tv.position.set(-1.3, 1.9, -0.655); g.add(tv);
  // glass
  const glass = K.mat(0x9ac0d8, { opacity: night ? 0.12 : 0.22 });
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(2.48, 1.84), glass); gp.position.set(-1.5, 1.45, ZF - 0.06); g.add(gp);

  // ---------------------------------------------------------------- signs ----
  K.text(g, 'WETTBÜRO ZUM LAHME JAUL', { fg: '#f4ecd0', bg: '#1f5a3a', border: '#d4a020', w: 5.9, h: 0.72, x: 0, y: 3.185, z: ZF + 0.225, glow: night, sizeK: 0.5 });
  K.text(g, 'TOTO · LOTTO · PFERDEWETTEN', { fg: '#ffd400', bg: '#1a1a1a', w: 4.8, h: 0.3, x: 0, y: 2.58, z: ZF + 0.035, glow: night });
  K.text(g, 'RENNTAG IN WEIDENPESCH', { fg: '#ffffff', bg: '#c1121f', border: '#ffffff', w: 1.15, h: 0.26, x: -2.1, y: 2.21, z: ZF - 0.05, glow: night, sizeK: 0.5 });
  K.text(g, 'GEÖFFNET', { fg: '#1f5a3a', bg: '#ffffff', w: 0.46, h: 0.14, x: 0.6, y: 1.7, z: -0.65, glow: night, sizeK: 0.6 });
  const horse = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.125), C.horse[night ? 1 : 0]); horse.position.set(0, 3.55 + 1.125 / 2, ZF + 0.12); g.add(horse);
  // chalk board with the odds, wooden frame, gooseneck lamp
  L.push(bx(1.48, 2.72, 0.93, 2.17, ZF, ZF + 0.04, WOOD), bx(1.6, 2.6, 0.9, 0.95, ZF, ZF + 0.1, WOOD),
    { geo: new THREE.CylinderGeometry(0.015, 0.015, 0.34, 5), c: 0x2a2a2a, p: [2.1, 2.3, ZF + 0.17], r: [Math.PI / 2, 0, 0] },
    { geo: new THREE.ConeGeometry(0.09, 0.1, 8, 1, true), c: 0x1f5a3a, p: [2.1, 2.26, ZF + 0.34] });
  lamp({ geo: new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), c: 0xfff0b0, p: [2.1, 2.205, ZF + 0.34] });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.16), C.board[night ? 1 : 0]); board.position.set(2.1, 1.55, ZF + 0.045); g.add(board);

  // a projecting enamel sign on an iron arm, so the shop reads from down the street (both faces point along it)
  const PX = -2.86, PZ0 = ZF + 0.3, PZ1 = ZF + 1.1;
  // (above the fascia, so from down the street it covers plain wall, not the shop's name)
  L.push(bx(PX - 0.02, PX + 0.02, 3.98, 4.02, ZF + 0.08, PZ1 + 0.02, 0x2a2a2a),                                   // arm from the cornice
    bx(PX - 0.012, PX + 0.012, 3.96, 3.98, PZ0 + 0.06, PZ0 + 0.09, 0x2a2a2a), bx(PX - 0.012, PX + 0.012, 3.96, 3.98, PZ1 - 0.09, PZ1 - 0.06, 0x2a2a2a), // hangers
    bx(PX - 0.03, PX + 0.03, 3.58, 3.96, PZ0, PZ1, 0xc1121f));                                                    // sign box
  for (const sd of [-1, 1]) K.text(g, 'WETTEN', { fg: '#ffffff', bg: '#c1121f', border: '#ffd400', w: 0.78, h: 0.36, x: PX + sd * 0.032, y: 3.77, z: (PZ0 + PZ1) / 2, ry: sd * Math.PI / 2, glow: night });

  // ---------------------------------------------------------------- newspaper stand "DÄ SCHNELLE" ----
  const SX = -2.45, SZ = -0.1;
  for (const px of [-0.38, 0.38]) for (const pz of [-0.18, 0.18]) L.push(bx(SX + px - 0.015, SX + px + 0.015, 0, pz < 0 ? 1.78 : 0.95, SZ + pz - 0.015, SZ + pz + 0.015, 0x3a3a3a));
  L.push(bx(SX - 0.4, SX + 0.4, 1.12, 1.78, SZ - 0.19, SZ - 0.165, 0x2a2a2a));                              // headline board
  for (let i = 0; i < 3; i++) {
    const y = 0.32 + i * 0.3, z = SZ + 0.1 - i * 0.12;
    L.push(bx(SX - 0.38, SX + 0.38, y - 0.02, y, z - 0.09, z + 0.09, 0x4a4a4a));                           // shelf
    L.push({ geo: new THREE.BoxGeometry(0.68, 0.07, 0.16), c: 0xf2eee2, p: [SX, y + 0.05, z], r: [-0.35, 0, 0] },
      { geo: new THREE.BoxGeometry(0.68, 0.02, 0.05), c: [0xffd400, 0xffd400, 0x1c3f95][i], p: [SX, y + 0.1, z + 0.05], r: [-0.35, 0, 0] });
  }
  K.text(g, 'DÄ SCHNELLE', { fg: '#111111', bg: '#ffd400', w: 0.76, h: 0.18, x: SX, y: 1.66, z: SZ - 0.16, glow: night });
  K.text(g, 'LAHME JAUL', { fg: '#c1121f', bg: '#ffffff', w: 0.76, h: 0.2, x: SX, y: 1.45, z: SZ - 0.16, glow: night, sizeK: 0.6 });
  K.text(g, 'SIEGT!', { fg: '#c1121f', bg: '#ffffff', w: 0.76, h: 0.2, x: SX, y: 1.25, z: SZ - 0.16, glow: night, sizeK: 0.7 });

  // wire bin on the pilaster, and all the losing tickets that missed it
  L.push(bx(1.23, 1.27, 0.5, 1.1, ZF, ZF + 0.12, 0x3a3a3a));
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.38, 8, 1, true), K.mat(0xa8adb2, { double: true })); bin.position.set(1.25, 0.9, ZF + 0.26); g.add(bin);
  L.push({ geo: new THREE.TorusGeometry(0.17, 0.012, 4, 10), c: 0xd8dce0, p: [1.25, 1.09, ZF + 0.26], r: [Math.PI / 2, 0, 0] }, { geo: new THREE.CylinderGeometry(0.13, 0.13, 0.01, 8), c: 0x3a3a3a, p: [1.25, 0.715, ZF + 0.26] }); // rim, bottom
  const TK = [[0.95, 0.15], [1.1, 0.42], [1.55, 0.1], [0.3, 0.68], [0.05, 0.7], [1.62, 0.5], [0.66, 0.36], [1.3, -0.2]]; // TK[6]: where today's ticket lands
  TK.forEach(([x, z], i) => L.push({ geo: new THREE.IcosahedronGeometry(0.04, 0), c: i % 3 ? 0xf4f0e8 : 0xf4d8e4, p: [x, 0.04, z], r: [i, i * 2, 0] }));
  for (let i = 0; i < 3; i++) L.push({ geo: new THREE.IcosahedronGeometry(0.045, 0), c: 0xf4f0e8, p: [1.2 + i * 0.06, 1.07, ZF + 0.26 + (i - 1) * 0.05] });

  vmesh(g, L, false); vmesh(g, GL, true);

  // ---------------------------------------------------------------- the two regulars ----
  const _u = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
  const findAt = (pp, x, y, z) => pp.children.find((c) => c.isMesh && Math.abs(c.position.x - x) < 0.004 && Math.abs(c.position.y - y) < 0.004 && Math.abs(c.position.z - z) < 0.004);
  // bend an arm of a K.person: new directions for upper arm and forearm (x mirrored by side sx). With pivot, the arm
  // hangs from a group at the shoulder that can swing. Returns { hand (pivot or person space), handMesh, pivot } or null.
  function poseArm(pp, sx, du, df, sleeve, pivot) {
    const ua = findAt(pp, sx * 0.23, 1.21, 0), fa = findAt(pp, sx * 0.245, 0.93, 0.025), hd = findAt(pp, sx * 0.24, 0.76, 0.06);
    if (!ua || !fa || !hd) return null;
    const sh = new THREE.Vector3(sx * 0.21, 1.36, 0);
    _d.set(sx * du[0], du[1], du[2]).normalize(); const el = sh.clone().addScaledVector(_d, 0.3027);
    ua.position.copy(sh).lerp(el, 0.5); ua.quaternion.setFromUnitVectors(_u, _d);
    _d.set(sx * df[0], df[1], df[2]).normalize(); const wr = el.clone().addScaledVector(_d, 0.265);
    fa.position.copy(el).lerp(wr, 0.5); fa.quaternion.setFromUnitVectors(_u, _d);
    hd.position.copy(wr).addScaledVector(_d, 0.03); hd.quaternion.setFromUnitVectors(_u, _d);
    const elb = K.sphere(pp, 0.047, sleeve, el.x, el.y, el.z, 6);                                       // elbow
    let pv = null;
    if (pivot) { pv = new THREE.Group(); pv.position.copy(sh); pp.add(pv); for (const m of [ua, fa, hd, elb]) { m.position.sub(sh); pv.add(m); } }
    return { hand: hd.position.clone(), handMesh: hd, pivot: pv };
  }
  // gather head, hair and hat into a pivot so the head can nod and shake
  function headPivot(pp) {
    const pv = new THREE.Group(); pv.position.set(0, 1.58, 0);
    pp.children.filter((c) => c.isMesh && c.position.y >= 1.56 && Math.abs(c.position.x) < 0.2).forEach((c) => { c.position.y -= 1.58; pv.add(c); });
    pp.add(pv); return pv;
  }

  // the winner: fedora, camel coat, grinning over "DÄ SCHNELLE"
  const WIN_C = 0xb08840;
  const win = K.put(g, K.person({ hat: 'fedora', hatColor: 0x8a6a3a, shirt: WIN_C, pants: 0x4a3a2a, shoes: 0x3a2214, tie: 0xc1121f, skin: 0xffdbac, hair: 0x5a3a20, smile: 1, h: 1.78 }), -1.45, 0, 0.25, 0.2);
  poseArm(win, 1, [0.1, -1, 0.35], [-0.35, 0.35, 1], WIN_C); poseArm(win, -1, [0.1, -1, 0.35], [-0.35, 0.35, 1], WIN_C);
  const wHead = headPivot(win);
  const paper = new THREE.Group(); paper.position.set(0, 1.24, 0.385); paper.rotation.x = -0.28; win.add(paper);
  vmesh(paper, [{ geo: new THREE.PlaneGeometry(0.28, 0.4), p: [-0.14, 0, 0], uvr: PAGE(2) }, { geo: new THREE.PlaneGeometry(0.28, 0.4), p: [0.14, 0, -0.004], uvr: PAGE(1) }], false, C.paper[0]);
  const hinge = new THREE.Group(); hinge.position.z = 0.004; paper.add(hinge);
  vmesh(hinge, [{ geo: new THREE.PlaneGeometry(0.28, 0.4), p: [0.14, 0, 0], uvr: PAGE(0) }, { geo: new THREE.PlaneGeometry(0.28, 0.4), p: [0.14, 0, -0.002], r: [0, Math.PI, 0], uvr: PAGE(3) }], false, C.paper[1]);

  // the loser: flat cap, grey-blue blouson, moustache, crumpling his ticket
  const LOS_C = 0x5f6f86;
  const los = K.put(g, K.person({ hat: 'cap', hatColor: 0x6a6a5a, shirt: LOS_C, pants: 0x3a3a44, skin: 0xf1c27d, hair: 0x6a6a6a, moustache: 0x6a6a6a, smile: -0.9, age: 1, h: 1.72 }), -0.35, 0, 0.32, -0.45);
  const arm = poseArm(los, 1, [0.15, -1, 0.3], [-0.55, 0.6, 0.8], LOS_C, true);   // his throwing arm, on a shoulder pivot
  const lHead = headPivot(los);
  // folded racing paper in the other hand
  vmesh(los, [{ geo: new THREE.BoxGeometry(0.03, 0.28, 0.2), c: 0xf2eee2, p: [-0.25, 0.66, 0.07] }, { geo: new THREE.BoxGeometry(0.034, 0.05, 0.2), c: 0xffd400, p: [-0.25, 0.77, 0.07] }]);
  const ticket = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.11), K.mat(0xf4d8e4, { double: true }));
  if (arm) { ticket.position.copy(arm.hand).add(_d.set(-0.02, 0.06, 0.03)); arm.pivot.add(ticket); } else { ticket.position.set(0.2, 0.95, 0.25); los.add(ticket); }
  ticket.rotation.x = -0.6;
  // the crumpled ball: in the hand while he crumples and throws, then an arc to the pavement short of the bin
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), K.mat(0xf4d8e4)); ball.visible = false; g.add(ball);
  const REL_X = -0.35, REL_Z = 0.9;                                                    // arm pose at the release: a sideways flick
  const relP = new THREE.Vector3(), groundP = new THREE.Vector3(TK[6][0], 0.045, TK[6][1]);
  const handAt = (out) => { if (arm) { arm.handMesh.getWorldPosition(out); g.worldToLocal(out); } else out.set(-0.15, 0.95, 0.65); return out; };
  g.updateMatrixWorld(true);
  if (arm) { arm.pivot.rotation.set(REL_X, 0, REL_Z); handAt(relP); arm.pivot.rotation.set(0, 0, 0); } else handAt(relP);
  handAt(ball.position);

  // the winner's dachshund: wags his tail and follows the flying ticket with his eyes
  const DX = -1.0, DZ = 0.62, DOG = 0x8a4a22, EAR = 0x5e2e12, BLK = 0x111111;
  const dog = new THREE.Group(); dog.position.set(DX, 0, DZ); g.add(dog);
  vmesh(dog, [{ geo: new THREE.CylinderGeometry(0.065, 0.065, 0.36, 8), c: DOG, p: [0, 0.17, 0], r: [0, 0, Math.PI / 2] },
    { geo: new THREE.SphereGeometry(0.072, 8, 6), c: DOG, p: [0.17, 0.168, 0] }, { geo: new THREE.SphereGeometry(0.066, 8, 6), c: DOG, p: [-0.17, 0.17, 0] },
    bx(0.13, 0.17, 0, 0.12, 0.02, 0.06, DOG), bx(0.13, 0.17, 0, 0.12, -0.06, -0.02, DOG), bx(-0.19, -0.15, 0, 0.12, 0.02, 0.06, DOG), bx(-0.19, -0.15, 0, 0.12, -0.06, -0.02, DOG),
    { geo: new THREE.TorusGeometry(0.05, 0.012, 4, 10), c: 0xc1121f, p: [0.22, 0.215, 0], r: [0, Math.PI / 2, 0] }]);
  const dHead = new THREE.Group(); dHead.position.set(0.23, 0.22, 0); dog.add(dHead);
  vmesh(dHead, [{ geo: new THREE.SphereGeometry(0.055, 8, 6), c: DOG, p: [0.03, 0.04, 0] }, bx(0.05, 0.16, -0.005, 0.045, -0.026, 0.026, DOG), bx(0.15, 0.172, 0.02, 0.045, -0.014, 0.014, BLK),
    bx(0.0, 0.03, -0.06, 0.05, 0.05, 0.068, EAR), bx(0.0, 0.03, -0.06, 0.05, -0.068, -0.05, EAR), bx(0.07, 0.085, 0.055, 0.07, 0.022, 0.036, BLK), bx(0.07, 0.085, 0.055, 0.07, -0.036, -0.022, BLK)]);
  const dTail = new THREE.Group(); dTail.position.set(-0.22, 0.2, 0); dog.add(dTail);
  vmesh(dTail, [{ geo: new THREE.CylinderGeometry(0.01, 0.018, 0.16, 5), c: DOG, p: [-0.06, 0.053, 0], r: [0, 0, 0.85] }]);
  let dYaw = 0.1, dPitch = 0.35, dTilt = 0, tailPh = 0;

  // ---------------------------------------------------------------- animation ----
  const sm = (u) => u * u * (3 - 2 * u);
  root.userData.tick = (t, dt, ctx) => {
    tv.material = C.tv[Math.floor(t * 6) % 2];                               // the race on TV
    // winner: folds the page over every six seconds, chuckles at the good bits
    const pc = t % 6;
    hinge.rotation.y = pc < 0.7 ? Math.PI * sm(pc / 0.7) : pc < 3.2 ? Math.PI : pc < 3.9 ? Math.PI * (1 - sm((pc - 3.2) / 0.7)) : 0; // the page swings towards him, not into the street
    wHead.rotation.x = 0.14 + (pc > 1 && pc < 2.8 ? Math.abs(Math.sin(t * 11)) * 0.07 : 0);
    wHead.rotation.y = pc > 4.2 && pc < 5.4 ? Math.sin((pc - 4.2) / 1.2 * Math.PI) * 0.5 : 0;  // a glance to the loser
    // loser: stares at the ticket, crumples it shaking his head, flicks it at the bin, misses
    const lc = (t + 2) % 8, pv = arm && arm.pivot;
    let ax = 0, az = 0;
    if (lc < 2.5) { ticket.visible = true; ball.visible = false; lHead.rotation.set(0.28, 0, 0); }
    else if (lc < 4) { ticket.visible = false; ball.visible = true; ax = Math.sin(t * 25) * 0.06; ball.scale.setScalar(0.75 + 0.35 * Math.abs(Math.sin(t * 20))); lHead.rotation.set(0.08, Math.sin(t * 13) * 0.4, 0); }
    else if (lc < 4.25) { const u = sm((lc - 4) / 0.25); ax = 0.35 * u; az = -0.15 * u; ball.visible = true; ball.scale.setScalar(1); lHead.rotation.set(0.1, 0.35 * u, 0); }
    else if (lc < 4.45) { const u = sm((lc - 4.25) / 0.2); ax = 0.35 + (REL_X - 0.35) * u; az = -0.15 + (REL_Z + 0.15) * u; ball.visible = true; lHead.rotation.set(0.1, 0.35, 0); }
    else if (lc < 5.1) { const u = (lc - 4.45) / 0.65, e = 1 - sm(u); ax = REL_X * e; az = REL_Z * e; ball.visible = true; ball.scale.setScalar(1);
      ball.position.lerpVectors(relP, groundP, u); ball.position.y += Math.sin(u * Math.PI) * 0.35; lHead.rotation.set(0.25 * u, 0.35, 0); }
    else { ball.visible = true; ball.position.copy(groundP); ticket.visible = lc > 7.4; lHead.rotation.set(0.12, 0.35 + Math.sin(t * 2.5) * 0.12, 0); }
    if (pv) pv.rotation.set(ax, 0, az);
    if (lc >= 2.5 && lc < 4.45) handAt(ball.position);                       // the ball sits in his hand until he lets go
    // the dachshund: tail goes faster while his master chuckles; eyes on the paper ball once it is out
    tailPh = (tailPh + Math.min(dt, 0.1) * (pc > 1 && pc < 2.8 ? 22 : 11)) % (Math.PI * 2); dTail.rotation.y = Math.sin(tailPh) * 0.6;
    let wy = 0.1, wp = 0.35, tilt = 0;
    if (ball.visible && lc >= 4) { const dx = ball.position.x - DX - 0.26, dz = ball.position.z - DZ, dy = ball.position.y - 0.26;
      wy = Math.max(-1, Math.min(1, Math.atan2(-dz, dx))); wp = Math.max(-0.35, Math.min(0.7, Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)))); }
    else if (lc < 2.5) tilt = Math.sin(t * 0.9) * 0.3;                         // head tilt: what is that paper?
    const kd = Math.min(1, dt * 8); dYaw += (wy - dYaw) * kd; dPitch += (wp - dPitch) * kd; dTilt += (tilt - dTilt) * kd;
    dHead.rotation.set(dTilt, dYaw, dPitch);
  };
});

// Tresorknacker: two comic burglars (striped shirts, eye masks, flat caps) sneak a heavy green safe along
// the sidewalk, the lanky one walking backwards in front, the round one shoving after him. They dropped their
// crowbar and their still-burning torch on the way. When a car comes close they freeze mid-step, stare at
// the street and sweat, then tiptoe on; at the ends of the sidewalk they stop, look round and turn back.
Veedel.define('tresorknacker', { name: 'Tresorknacker', kind: 'chicago', w: 7, d: 1.8 }, (g, o, K) => {
  const night = K.theme().night;
  const BLACK = 0x16161c, WHITE = 0xf6f4ee, GREEN = 0x2f8a3e, LGREEN = 0x3fa650, DGREEN = 0x1d5c28, GOLD = 0xffc93c, STEEL = 0xb8bcc4, RED = 0xd01c1c;

  // ---- merge helper: parts of one colour become one mesh ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const mergeInto = (parent, color, list, opts) => {
    let n = 0; const geos = [];
    for (const it of list) {
      const q = it.geo.index ? it.geo.toNonIndexed() : it.geo;
      if (it.m) _m.copy(it.m); else {
        const r = it.r || [0, 0, 0], p = it.p || [0, 0, 0], s = it.s || [1, 1, 1];
        _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e); _p.set(p[0], p[1], p[2]); _s.set(s[0], s[1], s[2]); _m.compose(_p, _q, _s);
      }
      q.applyMatrix4(_m); geos.push(q); n += q.attributes.position.count;
    }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
    for (const q of geos) { pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3); off += q.attributes.position.count; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.computeBoundingSphere();
    return K.part(parent, geo, color, 0, 0, 0, opts);
  };
  // move the meshes of a K.person that pass test() into a pivot group at (px, py, pz)
  const pivot = (p, px, py, pz, test) => {
    const pv = new THREE.Group(); pv.position.set(px, py, pz);
    for (const c of p.children.slice()) if (c.isMesh && test(c.position)) { p.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; pv.add(c); }
    p.add(pv); return pv;
  };

  // ================= a burglar =================
  const burglar = (opt) => {
    const hv = opt.heavy ? 1.18 : 1;
    const p = K.person({ h: opt.h, shirt: WHITE, pants: 0x24242e, shoes: BLACK, skin: opt.skin, hair: opt.hair, hat: 'none', heavy: opt.heavy, moustache: opt.moustache, age: opt.age, smile: -0.3, brow: 3 });
    // stripes round the torso (follow the torso lathe's profile, 7 sides like the lite torso)
    const prof = [[0.15 * hv, 0.82], [0.155 * hv, 0.9], [0.145 * hv, 1.02], [0.155 * hv, 1.14], [0.17 * hv, 1.26], [0.185, 1.37]];
    const rAt = (y) => { for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1]; if (y <= b[1]) { const k = Math.max(0, (y - a[1]) / (b[1] - a[1])); return a[0] + (b[0] - a[0]) * k; } } return prof[prof.length - 1][0]; };
    const rings = [];
    for (const y of [0.88, 0.99, 1.1, 1.21, 1.32]) rings.push({ geo: new THREE.CylinderGeometry(rAt(y + 0.025) + 0.012, rAt(y - 0.025) + 0.012, 0.05, 7, 1, true), p: [0, y, 0], s: [1, 1, 0.74] });
    mergeInto(p, BLACK, rings);
    // head on a neck pivot (it turns), arms on shoulder pivots (they hold the safe), legs on hip pivots (they step)
    const head = pivot(p, 0, 1.52, 0, (v) => v.y > 1.55);
    const arms = [-1, 1].map((sx) => pivot(p, sx * 0.21, 1.36, 0, (v) => v.x * sx > 0.17 && v.y > 0.6));
    const legs = [-1, 1].map((sx) => pivot(p, sx * 0.1, 0.86, 0, (v) => v.x * sx > 0.05 && v.x * sx < 0.17 && v.y < 0.8));
    // sleeve stripes: rings round upper arm and forearm, in the arm pivot's frame
    arms.forEach((arm, i) => {
      const sx = i ? 1 : -1, sh = [sx * 0.21, 1.36, 0], el = [sx * 0.25, 1.06, 0], wr = [sx * 0.24, 0.8, 0.05], list = [];
      const seg = (a, b, r0, r1, fr) => {
        const va = new THREE.Vector3(a[0], a[1], a[2]), vb = new THREE.Vector3(b[0], b[1], b[2]);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
        for (const f of fr) {
          const c = va.clone().lerp(vb, f).sub(new THREE.Vector3(sh[0], sh[1], sh[2])), r = r0 + (r1 - r0) * f + 0.01;
          list.push({ geo: new THREE.CylinderGeometry(r, r, 0.045, 6, 1, true), m: new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)) });
        }
      };
      seg(sh, el, 0.058 * hv, 0.046, [0.45, 0.8]); seg(el, wr, 0.046, 0.036, [0.3, 0.68]);
      mergeInto(arm, BLACK, list);
    });
    // eye mask: black band round the head with white comic eyes, knot and tails at the back
    const hy = 1.664 - 1.52;
    mergeInto(head, BLACK, [
      { geo: new THREE.CylinderGeometry(0.124, 0.124, 0.06, 10, 1, true), p: [0, hy, 0], s: [1, 1, 1.04] },
      { geo: new THREE.SphereGeometry(0.03, 6, 4), p: [0, hy, -0.13] },
      { geo: new THREE.BoxGeometry(0.035, 0.1, 0.012), p: [0.025, hy - 0.06, -0.14], r: [0.25, 0, 0.3] },
      { geo: new THREE.BoxGeometry(0.035, 0.1, 0.012), p: [-0.025, hy - 0.06, -0.14], r: [0.25, 0, -0.3] },
      { geo: new THREE.SphereGeometry(0.011, 5, 4), p: [0.045, hy - 0.002, 0.137] },
      { geo: new THREE.SphereGeometry(0.011, 5, 4), p: [-0.045, hy - 0.002, 0.137] }
    ]);
    mergeInto(head, WHITE, [ // after dark only the comic eyes shine out of the masks
      { geo: new THREE.SphereGeometry(0.026, 7, 5), p: [0.045, hy + 0.002, 0.122], s: [1, 1.1, 0.5] },
      { geo: new THREE.SphereGeometry(0.026, 7, 5), p: [-0.045, hy + 0.002, 0.122], s: [1, 1.1, 0.5] }
    ], night ? { glow: true } : null);
    // flat cap (Schiebermötz): a squashed pillow pulled forward, with a short brim
    mergeInto(head, opt.cap, [
      { geo: new THREE.SphereGeometry(0.14, 10, 6), p: [0, 1.748 - 1.52, 0.018], s: [1, 0.42, 1.12], r: [0.12, 0, 0] },
      { geo: new THREE.BoxGeometry(0.17, 0.02, 0.085), p: [0, 1.712 - 1.52, 0.14], r: [0.3, 0, 0] }
    ]);
    // sweat drops, only while they freeze
    const sweat = mergeInto(head, 0x7fd4ff, [
      { geo: new THREE.SphereGeometry(0.028, 6, 4), p: [0.14, 0.2, 0.04], s: [0.8, 1.3, 0.8] },
      { geo: new THREE.SphereGeometry(0.022, 6, 4), p: [-0.13, 0.23, 0.02], s: [0.8, 1.3, 0.8] },
      { geo: new THREE.SphereGeometry(0.018, 6, 4), p: [0.12, 0.3, -0.02], s: [0.8, 1.3, 0.8] }
    ], night ? { glow: true } : null);
    sweat.visible = false;
    const walker = new THREE.Group(); walker.add(p);
    return { walker, p, head, arms, legs, sweat, H: opt.h / 1.75, roll: opt.heavy ? 0.1 : 0.065 };
  };

  // ================= the crew: two burglars and the safe between them =================
  const crew = new THREE.Group(); g.add(crew); crew.position.z = -0.22;
  const A = burglar({ h: 1.64, heavy: true, skin: 0xe0ac69, hair: 0x2a1a10, moustache: 0x2a1a10, cap: 0x6a4a2a });   // round one, shoves
  const B = burglar({ h: 1.86, skin: 0xffdbac, hair: 0x9a4a1a, age: 1, cap: 0x3c4454 });                          // lanky one, walks backwards
  const YAW = 0.3; // both turned a little towards the street
  A.psi = Math.PI / 2 - YAW; B.psi = -Math.PI / 2 + YAW;

  // the safe: green, gold lettering front and back (it shows the street whichever way they carry it)
  const safe = new THREE.Group(); crew.add(safe);
  const SW = 0.66, SH = 0.72, SD = 0.5, SY = 0.86;
  safe.position.set(0.02, SY, 0); safe.rotation.z = 0.07; // the lanky one holds his end higher
  safe.updateMatrix();
  // place each burglar so his straight arms just reach two grips on his side of the safe, and aim the arms there
  const L = Math.hypot(0.03, 0.6, 0.06), v0 = new THREE.Vector3(0.03, -0.6, 0.06).normalize(), gl = new THREE.Vector3(), d = new THREE.Vector3();
  const grip = (b, side) => {
    const gs = [-1, 1].map((gz) => new THREE.Vector3(side * (SW / 2 + 0.03), -0.03, gz * 0.16).applyMatrix4(safe.matrix));
    const mid = gs[0].clone().add(gs[1]).multiplyScalar(0.5), fx = Math.sin(b.psi), fz = Math.cos(b.psi), c = Math.cos(b.psi), sn = Math.sin(b.psi);
    const local = (w, px, pz, out) => { const dx = w.x - px, dz = w.z - pz; return out.set((dx * c - dz * sn) / b.H, w.y / b.H, (dx * sn + dz * c) / b.H); };
    let px = mid.x, pz = mid.z;
    for (let s = 0.15; s < 0.9; s += 0.004) {
      px = mid.x - fx * s; pz = mid.z - fz * s; let far = 0;
      for (const w of gs) { local(w, px, pz, gl); const sx = gl.x < 0 ? -1 : 1; far = Math.max(far, d.set(gl.x - sx * 0.21, gl.y - 1.36, gl.z).length()); }
      if (far >= L * 0.985) break;
    }
    for (const w of gs) { local(w, px, pz, gl); const sx = gl.x < 0 ? -1 : 1; d.set(gl.x - sx * 0.21, gl.y - 1.36, gl.z).normalize(); b.arms[sx < 0 ? 0 : 1].quaternion.setFromUnitVectors(v0.clone().set(sx * 0.03, -0.6, 0.06).normalize(), d); }
    b.walker.position.set(px, 0, pz); b.walker.rotation.y = b.psi; crew.add(b.walker);
  };
  grip(A, -1); grip(B, 1);
  K.box(safe, SW, SH, SD, GREEN, 0, 0, 0);
  const trim = [], gold = [], steel = [], dark = [];
  for (const sz of [1, -1]) {
    const fz = sz * (SD / 2 + 0.012);
    trim.push({ geo: new THREE.BoxGeometry(SW - 0.1, SH - 0.1, 0.024), p: [0, -0.02, fz] });
    // dial, handle and hinges
    steel.push({ geo: new THREE.CylinderGeometry(0.095, 0.095, 0.04, 14), p: [-0.09, -0.11, sz * (SD / 2 + 0.035)], r: [Math.PI / 2, 0, 0] });
    dark.push({ geo: new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), p: [-0.09, -0.11, sz * (SD / 2 + 0.06)], r: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; dark.push({ geo: new THREE.BoxGeometry(0.012, 0.026, 0.01), p: [-0.09 + Math.sin(a) * 0.078, -0.11 + Math.cos(a) * 0.078, sz * (SD / 2 + 0.056)], r: [0, 0, -a] }); } // dial ticks
    gold.push({ geo: new THREE.BoxGeometry(0.035, 0.2, 0.035), p: [0.16, -0.1, sz * (SD / 2 + 0.045)] });
    gold.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), p: [0.16, -0.1, sz * (SD / 2 + 0.025)], r: [Math.PI / 2, 0, 0] });
    for (const hy of [0.17, -0.2]) gold.push({ geo: new THREE.CylinderGeometry(0.022, 0.022, 0.1, 6), p: [-sz * (SW / 2 - 0.01), hy, sz * (SD / 2 + 0.01)] });
    K.text(safe, 'TRESOR', { fg: '#ffd23f', bg: '#16401e', border: '#ffc93c', w: 0.56, h: 0.17, x: 0, y: 0.18, z: sz * (SD / 2 + 0.026), ry: sz > 0 ? 0 : Math.PI, sizeK: 0.7 }); // brass nameplate
  }
  mergeInto(safe, LGREEN, trim);
  mergeInto(safe, GOLD, gold);
  mergeInto(safe, STEEL, steel);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) dark.push({ geo: new THREE.CylinderGeometry(0.035, 0.045, 0.06, 6), p: [sx * (SW / 2 - 0.06), -SH / 2 - 0.03, sz * (SD / 2 - 0.06)] });
  dark.push({ geo: new THREE.BoxGeometry(SW + 0.02, 0.04, SD + 0.02), p: [0, SH / 2 + 0.02, 0] });
  mergeInto(safe, DGREEN, dark);

  // the comic "!?" that pops up over their heads when they are caught in the headlights
  const burst = K.text(crew, '!?', { fg: '#d01c1c', bg: '#ffd400', w: 0.5, h: 0.4, x: 0.05, y: 2.3, z: 0, border: '#16161c', sizeK: 0.8, glow: night });
  burst.visible = false;

  // ================= what they dropped on the way =================
  // crowbar: a red bar with a bent claw at one end
  const bar = new THREE.Group(); K.put(g, bar, 0.9, 0, 0.55, 0.35);
  mergeInto(bar, RED, [
    { geo: new THREE.BoxGeometry(0.8, 0.036, 0.036), p: [0, 0.018, 0] },
    { geo: new THREE.BoxGeometry(0.14, 0.036, 0.036), p: [0.44, 0.018, 0.05], r: [0, -0.9, 0] },
    { geo: new THREE.BoxGeometry(0.08, 0.036, 0.03), p: [0.47, 0.018, 0.11], r: [0, -2.1, 0] }
  ]);
  mergeInto(bar, 0x2a2a30, [{ geo: new THREE.BoxGeometry(0.06, 0.03, 0.05), p: [-0.4, 0.018, 0], r: [0, 0.4, 0] }]);
  // torch, still on, its beam across the flagstones towards the crew
  const torch = new THREE.Group(); K.put(g, torch, 2.85, 0, 0.5, -0.25);
  mergeInto(torch, 0x1c3f95, [
    { geo: new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), p: [0.11, 0.035, 0], r: [0, 0, Math.PI / 2] },
    { geo: new THREE.CylinderGeometry(0.052, 0.04, 0.07, 8), p: [-0.035, 0.052, 0], r: [0, 0, Math.PI / 2] }
  ]);
  K.cyl(torch, 0.045, 0.045, 0.01, 0xfff3b0, -0.072, 0.052, 0, 10, { glow: night }).rotation.z = Math.PI / 2;
  if (night) {
    const beam = K.cone(torch, 0.32, 1.25, 0xfff3b0, -0.7, 0.06, 0, 10, { glow: true, opacity: 0.22 });
    beam.rotation.z = -Math.PI / 2; beam.scale.x = 0.16;
    const spot = K.part(torch, new THREE.CircleGeometry(0.5, 14), 0xfff3b0, -1.35, 0.012, 0, { glow: true, opacity: 0.3 });
    spot.rotation.x = -Math.PI / 2; spot.scale.set(0.75, 1, 1);
  }
  // a few coins that fell out of the safe
  const coins = [];
  const cr = K.rnd(1972);
  for (let i = 0; i < 6; i++) coins.push({ geo: new THREE.CylinderGeometry(0.035, 0.035, 0.01, 8), p: [-1.9 + cr() * 1.2, 0.005, 0.35 + cr() * 0.35] });
  mergeInto(g, GOLD, coins);

  // ================= sneaking =================
  const XL = 2.25, SPEED = 1.0, STEP = 1.9; // turn points, m/s, steps per second
  const wp = new THREE.Vector3();
  let x = -0.8, dir = 1, pause = 0, freeze = 0, hurry = 0, near = false, phase = 0.1;
  for (const b of [A, B]) b.look = 0;
  const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const pose = (b, s, sway) => {
    const a = s * 0.42;
    b.legs[0].rotation.x = a; b.legs[1].rotation.x = -a;
    // keep the lowest shoe corner on the ground, then lift for the side-to-side waddle
    const ca = Math.cos(a), sa = Math.sin(a); let low = 0;
    for (let k = -1; k <= 1; k += 2) { const c = ca, sn = sa * k; low = Math.min(low, -0.86 * c - 0.175 * sn, -0.86 * c + 0.095 * sn, -0.79 * c - 0.175 * sn, -0.79 * c + 0.095 * sn); }
    const r = sway * b.roll; b.walker.rotation.z = r;
    b.walker.position.y = b.H * (Math.max(0, -0.86 - low) + 0.17 * Math.abs(Math.sin(r)));
  };
  crew.position.x = x; pose(A, Math.sin(phase * Math.PI * 2), Math.sin(phase * Math.PI * 2)); pose(B, -Math.sin(phase * Math.PI * 2), Math.sin(phase * Math.PI * 2));

  g.userData.tick = (t, dt, ctx) => {
    dt = Math.min(dt || 0, 0.1);
    // a car within 25 m: freeze for 1.5 s (once per approach)
    let nearNow = false; const cars = ctx && ctx.cars;
    if (cars && cars.length) {
      g.getWorldPosition(wp);
      for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c) continue; const dx = c.x - wp.x, dz = c.z - wp.z; if (dx * dx + dz * dz < 625) { nearNow = true; break; } }
    }
    if (nearNow && !near) freeze = 1.5;
    near = nearNow;
    const frozen = freeze > 0;
    if (frozen) { freeze -= dt; if (freeze <= 0) hurry = 1.4; } // caught in the headlights ... then scurry on
    else if (pause > 0) { pause -= dt; if (pause <= 0) dir = -dir; }
    else {
      const k = hurry > 0 ? 1.8 : 1; if (hurry > 0) hurry -= dt;
      x += dir * SPEED * k * dt; phase += dt * STEP * 0.5 * k;
      if (x > XL) { x = XL; pause = 0.9; } else if (x < -XL) { x = -XL; pause = 0.9; }
    }
    crew.position.x = x;
    // gait: legs swing, bodies waddle, the safe swings between them
    const s = Math.sin(phase * Math.PI * 2);
    pose(A, s, s); pose(B, -s, s);
    safe.rotation.x = s * 0.05; safe.position.y = SY - Math.abs(s) * 0.025;
    burst.visible = frozen;
    if (frozen) { const k = Math.max(0.05, Math.min(1, (1.5 - freeze) * 8)); burst.scale.set(k, k, 1); burst.rotation.z = Math.sin(t * 20) * 0.08; }
    // heads: nervous glances along the way and at the street; a stare at the street while frozen;
    // at the turn they look where they are going next
    const travel = (pause > 0 ? -dir : dir) * Math.PI / 2;
    for (let i = 0; i < 2; i++) {
      const b = i ? B : A;
      let target;
      if (frozen) target = 0;
      else { const w = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1); target = travel * (1 - w * 0.8); }
      const rel = Math.max(-1.35, Math.min(1.35, wrap(target - b.psi)));
      b.look += (rel - b.look) * Math.min(1, dt * (frozen ? 14 : 4));
      b.head.rotation.y = b.look;
      b.head.rotation.x = frozen ? -0.08 : 0.06 * Math.sin(t * 3 + i);
      b.sweat.visible = frozen;
      if (frozen) b.sweat.position.y = (1.5 - freeze) * 0.05;
    }
  };
});

// Paketdienst: a white-and-yellow RUCKZUCK PAKETE van parked right on the sidewalk (where else), hazard
// lights blinking, the sliding door open on a load of parcels. The courier balances a tower of three boxes
// out past the bonnet; the top one, marked ZERBRECHLICH, wobbles. There is a Knöllchen under the wiper.
Veedel.define('paketdienst', { name: 'Paketdienst', kind: 'strasse', since: 1995, w: 7, d: 2.6 }, (g, o, K) => {
  const night = K.theme().night;
  const WHITE = 0xf4f4ef, YEL = 0xffc800, NAVY = 0x1c2a6a, DARK = 0x2a2a30, TIRE = 0x18181c, GLASS = 0x26384a, CARD = 0xc08a4e, CARD2 = 0xa8743c, CARD3 = 0xd4a468, TAPE = 0xe8d9b0;

  // ---- merge helper: parts of one colour become one mesh ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const mergeInto = (parent, color, list, opts) => {
    let n = 0; const geos = [];
    for (const it of list) {
      const q = it.geo.index ? it.geo.toNonIndexed() : it.geo;
      const r = it.r || [0, 0, 0], p = it.p || [0, 0, 0], s = it.s || [1, 1, 1];
      _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e); _p.set(p[0], p[1], p[2]); _s.set(s[0], s[1], s[2]); _m.compose(_p, _q, _s);
      q.applyMatrix4(_m); geos.push(q); n += q.attributes.position.count;
    }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
    for (const q of geos) { pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3); off += q.attributes.position.count; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.computeBoundingSphere();
    return K.part(parent, geo, color, 0, 0, 0, opts);
  };
  const B = (w, h, d, x, y, z, rx, ry, rz) => ({ geo: new THREE.BoxGeometry(w, h, d), p: [x, y, z], r: [rx || 0, ry || 0, rz || 0] });

  // ================= the van =================
  const van = new THREE.Group(); g.add(van); van.position.x = 0.08; van.rotation.y = 0.045; // pulled in nose-first, a bit askew
  const X0 = -3.45, X1 = 1.85, HW = 0.95, FL = 0.42, ROOF = 2.42; // rear, nose, half width, sill, roof
  const DX0 = -0.6, DX1 = 0.45, DY0 = 0.56, DY1 = 2.12;          // the sliding-door opening
  // body: the side profile extruded across the width, with the door opening punched through
  const prof = new THREE.Shape();
  [[X0, FL], [X1, FL], [X1 + 0.05, 0.62], [X1 + 0.03, 1.05], [1.72, 1.2], [1.25, 1.33], [0.72, 2.28], [0.5, ROOF], [X0 + 0.1, ROOF], [X0, ROOF - 0.1]]
    .forEach((p, i) => (i ? prof.lineTo(p[0], p[1]) : prof.moveTo(p[0], p[1])));
  const hole = new THREE.Path(); hole.moveTo(DX0, DY0); hole.lineTo(DX1, DY0); hole.lineTo(DX1, DY1); hole.lineTo(DX0, DY1); prof.holes.push(hole);
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: HW * 2, bevelEnabled: false, steps: 1, curveSegments: 1 }); bodyGeo.translate(0, 0, -HW);
  K.part(van, bodyGeo, WHITE, 0, 0, 0);
  // the far side of the opening: grey inside (warmly lit by the cargo lamp after dark), a closed door outside,
  // and a plywood load floor
  K.box(van, DX1 - DX0, DY1 - DY0, 0.02, night ? 0xb09868 : 0x8a8c90, (DX0 + DX1) / 2, (DY0 + DY1) / 2, -HW + 0.06, night ? { glow: true } : null);
  K.box(van, DX1 - DX0, DY1 - DY0, 0.02, WHITE, (DX0 + DX1) / 2, (DY0 + DY1) / 2, -HW + 0.02);
  K.box(van, DX1 - DX0 - 0.004, 0.012, HW * 2 - 0.1, night ? 0x9a8058 : 0xa8865a, (DX0 + DX1) / 2, DY0 + 0.006, 0, night ? { glow: true } : null);
  // after dark the lamp spills out of the open door onto the flagstones
  if (night) {
    const fan = new THREE.Shape(), a = (DX1 - DX0) / 2, b = a + 0.28; // widening away from the door, like a real light cone
    fan.moveTo(-a, 0); fan.lineTo(a, 0); fan.lineTo(b, -0.44); fan.lineTo(-b, -0.44); fan.lineTo(-a, 0);
    K.part(van, new THREE.ShapeGeometry(fan), 0xffcf70, (DX0 + DX1) / 2, 0.012, HW + 0.01, { glow: true, opacity: 0.28 }).rotation.x = -Math.PI / 2; // shape -y -> +z (street), face up
  }
  // yellow band along both sides (interrupted by the opening on the street side), and a yellow roof edge
  const band = [];
  const BY = 1.25, BH = 0.46;
  band.push(B(X1 - 0.12 - X0, BH, 0.02, (X0 + X1 - 0.12) / 2, BY, -HW - 0.01));
  band.push(B(DX0 - X0, BH, 0.02, (X0 + DX0) / 2, BY, HW + 0.01));
  band.push(B(1.63 - DX1, BH, 0.02, (DX1 + 1.63) / 2, BY, HW + 0.01));
  band.push(B(0.03, BH, HW * 2, X0 - 0.01, BY, 0));
  // the slid-back door on the street side, outside the body
  const doorX = DX0 - (DX1 - DX0) / 2 - 0.03;
  K.box(van, DX1 - DX0 + 0.04, DY1 - DY0 + 0.04, 0.04, WHITE, doorX, (DY0 + DY1) / 2, HW + 0.04);
  band.push(B(DX1 - DX0 + 0.04, BH, 0.02, doorX, BY, HW + 0.07));
  mergeInto(van, YEL, band);
  // dark parts: bumpers, skirts, grille, door rails, handles, wiper, mirrors, rear-door seam
  mergeInto(van, DARK, [
    B(0.12, 0.3, HW * 2 + 0.06, X1 + 0.02, 0.56, 0), B(0.1, 0.24, HW * 2 + 0.06, X0 - 0.02, 0.54, 0),
    B(X1 - X0 - 0.3, 0.1, 0.03, (X0 + X1) / 2, FL + 0.05, HW + 0.01), B(X1 - X0 - 0.3, 0.1, 0.03, (X0 + X1) / 2, FL + 0.05, -HW - 0.01),
    B(0.04, 0.26, 1.0, X1 + 0.045, 0.86, 0),
    B(2.2, 0.03, 0.03, -1.5, DY1 + 0.02, HW + 0.02),
    B(0.12, 0.04, 0.03, doorX + 0.4, 1.62, HW + 0.08), B(0.12, 0.04, 0.03, 0.05, 1.62, HW + 0.02), B(0.12, 0.04, 0.03, (DX0 + DX1) / 2, 1.62, -HW - 0.02),
    B(0.03, 1.7, 0.03, X0 - 0.01, 1.4, 0), B(0.03, 0.04, 0.12, X0 - 0.02, 1.4, 0.12), B(0.03, 0.04, 0.12, X0 - 0.02, 1.4, -0.12),
    B(0.03, 0.02, 0.62, 1.26, 1.36, 0.3, 0, 0, 0.3),
    B(0.05, 0.22, 0.12, 1.16, 1.66, HW + 0.13), B(0.05, 0.22, 0.12, 1.16, 1.66, -HW - 0.13),
    B(0.14, 0.03, 0.14, 1.2, 1.58, HW + 0.06), B(0.14, 0.03, 0.14, 1.2, 1.58, -HW - 0.06)
  ]);
  mergeInto(van, 0xc4c6ca, [B(0.5, 0.08, 0.5, -1.6, ROOF + 0.04, 0), B(0.4, 0.06, 0.4, -2.8, ROOF + 0.03, 0)]); // roof vents
  // glass: windscreen and the cab side windows
  const ws = Math.hypot(0.53, 0.95);
  const glass = [{ geo: new THREE.BoxGeometry(0.02, ws - 0.08, HW * 2 - 0.12), p: [0.985 + 0.012, 1.805, 0], r: [0, 0, Math.atan2(0.53, 0.95)] }];
  const win = new THREE.Shape(); win.moveTo(0.58, 1.42); win.lineTo(1.12, 1.42); win.lineTo(0.72, 2.14); win.lineTo(0.58, 2.14); win.lineTo(0.58, 1.42);
  for (const sz of [1, -1]) glass.push({ geo: new THREE.ShapeGeometry(win), p: [0, 0, sz * (HW + 0.004)] });
  mergeInto(van, GLASS, glass, { double: true });
  // wheels
  const tires = [], hubs = [];
  for (const wx of [-2.55, 1.05]) for (const sz of [1, -1]) {
    tires.push({ geo: new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14), p: [wx, 0.36, sz * (HW - 0.105)], r: [Math.PI / 2, 0, 0] });
    hubs.push({ geo: new THREE.CylinderGeometry(0.19, 0.19, 0.03, 10), p: [wx, 0.36, sz * (HW + 0.02)], r: [Math.PI / 2, 0, 0] });
  }
  mergeInto(van, TIRE, tires); mergeInto(van, 0xc4c6ca, hubs);
  // headlamps and tail lamps
  mergeInto(van, night ? 0xfff6d0 : 0xe8eef4, [B(0.04, 0.16, 0.3, X1 + 0.045, 1.08, 0.58), B(0.04, 0.16, 0.3, X1 + 0.045, 1.08, -0.58)], night ? { glow: true } : null);
  mergeInto(van, night ? 0xd01818 : 0xb01010, [B(0.04, 0.32, 0.14, X0 - 0.02, 0.86, 0.84), B(0.04, 0.32, 0.14, X0 - 0.02, 0.86, -0.84)], night ? { glow: true } : null); // parking lights on after dark
  // hazard lights: front corners, side repeaters, rear clusters — one mesh that swaps material
  const hazOn = K.mat(0xffb020, { glow: true }), hazOff = K.mat(0x9a6010);
  const haz = mergeInto(van, 0x9a6010, [
    B(0.05, 0.12, 0.14, X1 + 0.04, 1.08, 0.86), B(0.05, 0.12, 0.14, X1 + 0.04, 1.08, -0.86),
    B(0.12, 0.05, 0.02, 1.5, 0.98, HW + 0.012), B(0.12, 0.05, 0.02, 1.5, 0.98, -HW - 0.012),
    B(0.04, 0.14, 0.14, X0 - 0.02, 1.1, 0.84), B(0.04, 0.14, 0.14, X0 - 0.02, 1.1, -0.84)
  ]);
  // glow halos after dark; they start dark (like the lamps above): the first tick switches them on, so the
  // game's still-part probe always sees them change and keeps them out of the static batch
  let halo = null;
  if (night) { halo = mergeInto(van, 0xffb020, [[X1 + 0.1, 1.08, 0.86], [X1 + 0.1, 1.08, -0.86], [X0 - 0.08, 1.1, 0.84], [X0 - 0.08, 1.1, -0.84]].map((p) => ({ geo: new THREE.SphereGeometry(0.15, 8, 6), p })), { glow: true, opacity: 0.35 }); halo.visible = false; }
  // cargo lamp under the roof, lit after dark
  K.box(van, 0.4, 0.03, 0.2, night ? 0xfff0c0 : 0xe8e8e0, (DX0 + DX1) / 2, DY1 - 0.03, 0.1, night ? { glow: true } : null);

  // lettering: RUCKZUCK above the band, PAKETE on it, the Kölsch motto on the door
  const sides = [1, -1];
  for (const sz of sides) {
    const ry = sz > 0 ? 0 : Math.PI, zf = sz * (HW + 0.024);
    const cx = -2.56;
    K.text(van, 'PAKETE', { fg: '#1c2a6a', bg: '#ffc800', w: sz > 0 ? 1.62 : 2.4, h: sz > 0 ? 0.44 : 0.4, x: sz > 0 ? cx : -1.2, y: BY, z: zf, ry, sizeK: 0.78 });
    K.text(van, 'RUCKZUCK', { fg: '#1c2a6a', bg: '#f4f4ef', w: sz > 0 ? 1.6 : 2.0, h: sz > 0 ? 0.38 : 0.36, x: sz > 0 ? cx : -1.2, y: 1.78, z: sz * (HW + 0.004), ry, sizeK: 0.8 });
  }
  // the company motto (Kölsches Grundgesetz, Artikel 2), in two lines so it reads from the curb
  K.text(van, 'Et kütt', { fg: '#1c2a6a', bg: '#f4f4ef', w: 1.0, h: 0.2, x: doorX, y: 1.9, z: HW + 0.063, sizeK: 0.7 });
  K.text(van, 'wie et kütt.', { fg: '#1c2a6a', bg: '#f4f4ef', w: 1.0, h: 0.2, x: doorX, y: 1.7, z: HW + 0.063, sizeK: 0.7 });
  K.text(van, 'RUCKZUCK', { fg: '#1c2a6a', bg: '#ffc800', w: 1.3, h: 0.3, x: X0 - 0.03, y: 1.75, z: 0, ry: -Math.PI / 2, sizeK: 0.78 });
  // the Knöllchen under the wiper, street side ...
  const WS = Math.atan2(0.53, 0.95);
  K.box(van, 0.02, 0.1, 0.16, 0xffffff, 1.22, 1.44, 0.55).rotation.z = WS;
  // ... despite the card on the dashboard (driver's side): the classic second-row excuse
  const nx = Math.cos(WS), ny = Math.sin(WS), ux = -Math.sin(WS), uy = Math.cos(WS); // windscreen normal and up
  [['BEN JLEICH', 0.27], ['WIDDER DO!', 0.15]].forEach(([s, a]) => {
    const c = K.text(van, s, { fg: '#c01818', bg: '#fffbe8', w: 0.6, h: 0.12, x: 0.997 + 0.0125 * nx + (a - 0.475) * ux, y: 1.805 + 0.0125 * ny + (a - 0.475) * uy, z: -0.42, sizeK: 0.85 });
    c.rotation.order = 'YXZ'; c.rotation.set(-WS, Math.PI / 2, 0);
  });

  // parcels inside, stacked behind the opening
  const inside = [[CARD, []], [CARD2, []], [CARD3, []]], tape = [];
  const parcel = (w, h, d, x, y, z, ry, c) => { y += 0.012; inside[c][1].push(B(w, h, d, x, y + h / 2, z, 0, ry)); tape.push(B(w + 0.004, h + 0.004, 0.06, x, y + h / 2, z, 0, ry)); }; // on the load floor
  parcel(0.55, 0.45, 0.5, -0.3, DY0, -0.6, 0.05, 0); parcel(0.5, 0.4, 0.45, -0.28, DY0 + 0.45, -0.62, -0.08, 1); parcel(0.4, 0.35, 0.4, -0.3, DY0 + 0.85, -0.6, 0.12, 2);
  parcel(0.45, 0.5, 0.45, 0.2, DY0, -0.6, -0.04, 2); parcel(0.4, 0.3, 0.35, 0.18, DY0 + 0.5, -0.64, 0.1, 0); parcel(0.3, 0.25, 0.3, 0.22, DY0 + 0.8, -0.6, -0.15, 1);
  parcel(0.35, 0.3, 0.3, 0.05, DY0, -0.05, 0.3, 1); parcel(0.3, 0.22, 0.28, -0.35, DY0, 0.05, -0.2, 0); parcel(0.26, 0.18, 0.22, -0.33, DY0 + 0.22, 0.02, 0.25, 2);
  parcel(0.28, 0.2, 0.24, 0.26, DY0, 0.6, 0.35, 0); // the next one, ready at the sill
  for (const [c, list] of inside) mergeInto(van, c, list);
  mergeInto(van, TAPE, tape);

  // ================= the courier with his tower of boxes =================
  const cp = K.person({ h: 1.8, shirt: YEL, pants: NAVY, shoes: DARK, skin: 0xc68642, hair: 0x1a1a1a, hat: 'cap', hatColor: NAVY, smile: 0.2, brow: 4 });
  const pivot = (p, px, py, pz, test) => {
    const pv = new THREE.Group(); pv.position.set(px, py, pz);
    for (const c of p.children.slice()) if (c.isMesh && test(c.position)) { p.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; pv.add(c); }
    p.add(pv); return pv;
  };
  const head = pivot(cp, 0, 1.52, 0, (v) => v.y > 1.55);
  const arms = [-1, 1].map((sx) => pivot(cp, sx * 0.21, 1.36, 0, (v) => v.x * sx > 0.17 && v.y > 0.6));
  const legs = [-1, 1].map((sx) => pivot(cp, sx * 0.1, 0.86, 0, (v) => v.x * sx > 0.05 && v.x * sx < 0.17 && v.y < 0.8));
  legs[0].rotation.x = -0.24; // a balancing half-step, the front foot on its heel
  // a navy badge on the chest (on the torso's front edge, not floating in front of it)
  K.box(cp, 0.1, 0.07, 0.015, NAVY, 0.07, 1.3, 0.13);
  // the tower (in the courier's frame, unscaled): bottom box held by both hands, two more piled on, the top one teeters
  const tower = new THREE.Group(); cp.add(tower);
  const BZ = 0.42;
  mergeInto(tower, CARD, [B(0.52, 0.34, 0.4, 0, 1.06, BZ)]);
  mergeInto(tower, TAPE, [B(0.524, 0.344, 0.06, 0, 1.06, BZ), B(0.06, 0.304, 0.364, 0.07, 1.39, BZ + 0.01, 0, 0.12, 0)]);
  mergeInto(tower, CARD3, [B(0.42, 0.3, 0.36, 0.07, 1.38, BZ + 0.01, 0, 0.12, 0)]);
  const top = new THREE.Group(); top.position.set(0.12, 1.53, BZ); tower.add(top);
  mergeInto(top, CARD2, [B(0.34, 0.26, 0.3, 0, 0.13, 0)]);
  K.text(top, 'ZERBRECHLICH', { fg: '#d01c1c', bg: '#f4ead4', w: 0.3, h: 0.08, x: 0, y: 0.15, z: 0.152, sizeK: 0.7 });
  K.box(top, 0.06, 0.06, 0.004, 0xd01c1c, 0, 0.06, 0.152); // a red glass symbol
  // hands under the bottom box's lower edges: aim the straight arms at them
  const L = Math.hypot(0.03, 0.6, 0.06), d = new THREE.Vector3(), v0 = new THREE.Vector3();
  for (const sx of [-1, 1]) {
    d.set(sx * 0.27 - sx * 0.21, 0.93 - 1.36, BZ + 0.02); const k = d.length(); d.normalize();
    arms[sx < 0 ? 0 : 1].quaternion.setFromUnitVectors(v0.set(sx * 0.03, -0.6, 0.06).normalize(), d);
    if (k > L * 1.05 || k < L * 0.85) console.warn('paketdienst: arm reach', k, L);
  }
  head.rotation.set(-0.3, -0.35, 0.1); // peeking up round the tower at the top box
  K.put(g, cp, 2.72, 0, 0.1, 0.55);

  // ================= blink and wobble =================
  g.userData.tick = (t, dt, ctx) => {
    const on = (t * 1.5 + 0.1) % 1 < 0.5;
    haz.material = on ? hazOn : hazOff;
    if (halo) halo.visible = on;
    // the top box teeters, the courier leans against it and follows it with his eyes
    const w = Math.sin(t * 3.1) * 0.1 + Math.sin(t * 1.27 + 1) * 0.07 + Math.sin(t * 7.3) * 0.02;
    top.rotation.z = w; top.position.x = 0.12 + w * 0.12;
    top.rotation.x = Math.sin(t * 2.3) * 0.04;
    tower.rotation.z = w * 0.15;
    cp.rotation.z = -w * 0.12; cp.position.y = 0.18 * Math.abs(Math.sin(cp.rotation.z));
    head.rotation.z = 0.1 + w * 0.6;
  };
});

// Kölsche Baustelle on the pavement: the city is famously never finished. Red-white barrier boards on trestles with
// blinking yellow lamps, Leitkegel, a hole with an exposed pipe, a sand pile, a little yellow Minibagger that digs all
// by itself, and the worker, who leans on his shovel and has a Kölsch. The sign says it all: seit 1972, fertig demnächst.
Veedel.define('baustelle', { name: 'Dauerbaustelle', kind: 'strasse', w: 7, d: 2.4 }, (g, o, K) => {
  const night = K.theme().night;
  const RED = 0xd8202a, WHITE = 0xf4f2ec, ORANGE = 0xff5a0a, YELLOW = 0xf2b705, BLACK = 0x1c1c1e, GREY = 0x6a6a70, SAND = 0xe2c27c, DIRT = 0x7a5534;

  // ---- bake helper: every plain mesh directly under a group becomes one vertex-coloured mesh ----
  const VM = K.__vcMatCache || (K.__vcMatCache = {});
  const vcMat = (glow) => { const k = 's' + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  const _c = new THREE.Color();
  function bake(grp) {
    const lists = { l: [], g: [] };
    for (const ch of grp.children.slice()) {
      if (!ch.isMesh || ch.userData.keep) continue;
      const m = ch.material;
      if (Array.isArray(m) || m.map || m.transparent || m.side === THREE.DoubleSide || m.vertexColors) continue;
      ch.updateMatrix();
      const geo = (ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone()).applyMatrix4(ch.matrix);
      lists[m.isMeshBasicMaterial ? 'g' : 'l'].push({ geo, color: m.color.getHex() });
      grp.remove(ch);
    }
    for (const key of ['l', 'g']) {
      const list = lists[key]; if (!list.length) continue;
      let n = 0; for (const it of list) n += it.geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
      for (const it of list) {
        const pa = it.geo.attributes.position.array, cnt = pa.length / 3; pos.set(pa, off * 3); nor.set(it.geo.attributes.normal.array, off * 3);
        _c.setHex(it.color); for (let i = 0; i < cnt; i++) { col[(off + i) * 3] = _c.r; col[(off + i) * 3 + 1] = _c.g; col[(off + i) * 3 + 2] = _c.b; }
        off += cnt;
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      bg.computeBoundingSphere(); grp.add(new THREE.Mesh(bg, vcMat(key === 'g')));
    }
    for (const ch of grp.children) if (!ch.isMesh) bake(ch);
  }
  const rot = (m, rx, ry, rz) => { m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };

  // ================= barrier boards on red-white trestles, each with a yellow warning lamp =================
  // at night the red-white foil of boards, cones and the hi-vis jacket shines back in the headlights
  const RFL = (c) => (night ? { [WHITE]: 0xc4c4bc, [RED]: 0xa0141c }[c] || c : c), RO = { glow: night };
  const lampOn = K.mat(0xffc41a, { glow: true }), lampOff = night ? K.mat(0x4a3a12) : K.mat(0xb8901c);
  const lamps = [], halos = [];
  // at night a lit lamp gets a soft halo, so it still reads as a blinking light from far away
  const halo = (grp, x, y, z, r) => { if (!night) return null; const h = K.sphere(grp, r, 0xffc41a, x, y, z, 8, { glow: true, opacity: 0.3 }); h.userData.keep = true; return h; };
  // a barrier of length L centred at (x, z); side = true runs it along z (legs splay in x)
  function barrier(x, z, L, side, lampAt) {
    const b = new THREE.Group(); b.position.set(x, 0, z); if (side) b.rotation.y = Math.PI / 2; g.add(b);
    const n = Math.max(3, Math.round(L / 0.3)), sw = L / n;
    for (let i = 0; i < n; i++) K.box(b, sw, 0.25, 0.035, RFL(i % 2 ? WHITE : RED), -L / 2 + sw * (i + 0.5), 0.9, 0, RO);      // the striped board
    K.box(b, L, 0.025, 0.04, BLACK, 0, 1.03, 0); K.box(b, L, 0.025, 0.04, BLACK, 0, 0.77, 0);                         // top and bottom rail
    for (const ex of [-L / 2 + 0.14, L / 2 - 0.14]) {                                                                  // A-frame trestles
      for (const sz of [-1, 1]) rot(K.box(b, 0.05, 1.08, 0.05, sz > 0 ? RED : WHITE, ex, 0.531, sz * 0.13), sz * -0.25, 0, 0);
      K.box(b, 0.06, 0.05, 0.3, BLACK, ex, 0.4, 0);                                                                    // cross bar
      K.box(b, 0.12, 0.04, 0.12, BLACK, ex, 0.02, 0.26); K.box(b, 0.12, 0.04, 0.12, BLACK, ex, 0.02, -0.26);           // rubber feet
    }
    // the yellow warning lamp clamped on top
    const lx = lampAt * (L / 2 - 0.14);
    K.box(b, 0.05, 0.14, 0.05, BLACK, lx, 1.1, 0);
    K.box(b, 0.24, 0.24, 0.07, BLACK, lx, 1.28, 0);
    const lens = K.cyl(b, 0.1, 0.1, 0.1, 0, lx, 1.28, 0, 12); rot(lens, Math.PI / 2, 0, 0); lens.material = lampOn; lens.userData.keep = true;
    lamps.push(lens); halos.push(halo(b, lx, 1.28, 0, 0.21));
    return b;
  }
  barrier(-0.35, 0.95, 1.8, false, -1);     // front, before the hole
  barrier(2.4, 0.95, 1.9, false, 1);        // front, before the digger
  K.box(g, 0.02, 0.1, 0.02, BLACK, 2.05, 0.71, 0.97); K.box(g, 0.02, 0.1, 0.02, BLACK, 2.75, 0.71, 0.97);
  K.text(g, 'MER SIN DRAN!', { fg: '#1c1c1e', bg: '#f4f2ec', border: '#d8202a', w: 0.9, h: 0.24, x: 2.4, y: 0.56, z: 0.975, sizeK: 0.5, glow: night });  // we're on it. since 1972.
  barrier(-1.4, -0.15, 1.3, true, 1);       // left side, between the hole and the worker's break corner

  // ================= Leitkegel: orange cones with white reflective bands =================
  function cone(x, z, lying) {
    const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c);
    const H = 0.5, R = 0.15, r = (y) => R * (1 - (y - 0.04) / H);
    K.box(c, 0.34, 0.04, 0.34, BLACK, 0, 0.02, 0);
    K.cone(c, R, H, ORANGE, 0, 0.04 + H / 2, 0, 10);
    for (const y of [0.22, 0.36]) K.cyl(c, r(y + 0.035) + 0.006, r(y - 0.035) + 0.006, 0.07, RFL(WHITE), 0, y, 0, 10, RO);
    if (lying) { c.rotation.set(0, lying, Math.PI / 2 - 0.25); c.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(c); c.position.y = -bb.min.y; }
    return c;
  }
  cone(0.95, 1.02); cone(3.2, 0.62); cone(3.2, -0.3);
  cone(0.62, -0.95, 0.9);                   // one has fallen over, obviously

  // ================= the hole, with dirt rim, exposed pipe and lifted paving stones =================
  const HX = -0.3, HW = 1.5, HD = 1.1;
  K.box(g, HW, 0.02, HD, 0x24170e, HX, 0.01, 0);                                                                         // darkness down there
  K.box(g, HW - 0.2, 0.01, HD - 0.3, 0x3a2616, HX + 0.05, 0.02, 0.05);
  K.box(g, HW + 0.2, 0.09, 0.14, DIRT, HX, 0.045, -HD / 2 - 0.05); K.box(g, HW + 0.2, 0.06, 0.12, DIRT, HX, 0.03, HD / 2 + 0.04);
  K.box(g, 0.14, 0.08, HD, DIRT, HX - HW / 2 - 0.05, 0.04, 0); K.box(g, 0.14, 0.07, HD, DIRT, HX + HW / 2 + 0.05, 0.035, 0);
  // the old pipe runs along the front of the hole, clear of where the bucket digs (z -0.34 .. -0.02)
  const PZ = 0.2;
  rot(K.cyl(g, 0.075, 0.075, HW + 0.1, 0x8a8a90, HX, 0.085, PZ, 10), 0, 0, Math.PI / 2);                               // the old pipe
  K.cyl(g, 0.088, 0.088, 0.08, 0x5a5a60, HX - 0.2, 0.089, PZ, 10).rotation.z = Math.PI / 2;                            // its sleeve
  K.cyl(g, 0.03, 0.03, 0.26, 0xc1121f, HX - 0.2, 0.2, PZ, 6);                                                         // red valve wheel stem
  K.cyl(g, 0.08, 0.08, 0.02, 0xc1121f, HX - 0.2, 0.34, PZ, 10);
  // lifted paving stones stacked beside the hole
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) K.box(g, 0.13, 0.11, 0.13, (i + j) % 2 ? 0x8e8a84 : 0x7c7872, 0.95 + i * 0.15, 0.055, -0.25 + j * 0.15);
  for (let i = 0; i < 2; i++) K.box(g, 0.13, 0.11, 0.13, 0x86827c, 1.02 + i * 0.15, 0.165, -0.18);

  // ================= sand pile with a bucket, the Kölsch crate as a seat =================
  K.cone(g, 0.6, 0.55, SAND, -2.84, 0.275, -0.45, 9);
  K.cone(g, 0.32, 0.2, 0xd4b26c, -2.45, 0.1, -0.05, 7);
  K.cyl(g, 0.12, 0.1, 0.22, 0x2a5aa8, -3.25, 0.11, 0.3, 10);                                                            // a blue bucket
  // blue Kölsch crate with bottles
  K.box(g, 0.42, 0.28, 0.32, 0x1c3f95, -1.86, 0.14, 0.68);
  K.box(g, 0.43, 0.03, 0.33, 0x2a55b8, -1.86, 0.28, 0.68);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (!(i === 3 && j === 1)) { K.cyl(g, 0.028, 0.03, 0.12, 0x4a2a0e, -2.01 + i * 0.1, 0.34, 0.61 + j * 0.13, 6); }

  // ================= the sign: BAUSTELLE SEIT 1972 · FERTIG DEMNÄCHST =================
  const SX = -2.2, SZ = -1.0;
  for (const px of [-3.3, -1.1]) { K.box(g, 0.07, 3.0, 0.07, GREY, px, 1.5, SZ); K.box(g, 0.3, 0.05, 0.3, BLACK, px, 0.025, SZ); }
  K.box(g, 2.5, 1.3, 0.05, 0x1c3f95, SX, 2.33, SZ);                                                                   // blue board
  K.text(g, 'BAUSTELLE', { fg: '#d8202a', bg: '#ffffff', w: 2.4, h: 0.44, x: SX, y: 2.73, z: SZ + 0.03, glow: night, sizeK: 0.78 });
  K.text(g, 'SEIT 1972', { fg: '#1c1c1e', bg: '#ffffff', w: 2.4, h: 0.36, x: SX, y: 2.33, z: SZ + 0.03, glow: night, sizeK: 0.74 });
  K.text(g, 'FERTIG DEMNÄCHST', { fg: '#ffffff', bg: '#1c3f95', w: 2.4, h: 0.38, x: SX, y: 1.93, z: SZ + 0.03, glow: night, sizeK: 0.62 });
  // the classic triangle "Arbeitsstelle" sign on a post at the front corner
  const tri = new THREE.Group(); tri.position.set(-3.12, 0, 0.8); g.add(tri);
  K.box(tri, 0.05, 1.5, 0.05, GREY, 0, 0.75, -0.02); K.box(tri, 0.3, 0.05, 0.3, BLACK, 0, 0.025, -0.02);
  rot(K.cyl(tri, 0.36, 0.36, 0.03, RED, 0, 1.6, 0.02, 3), -Math.PI / 2, 0, 0);
  rot(K.cyl(tri, 0.26, 0.26, 0.03, WHITE, 0, 1.585, 0.03, 3), -Math.PI / 2, 0, 0);
  rot(K.cyl(tri, 0.35, 0.35, 0.01, 0x9a9ca0, 0, 1.6, 0.0, 3), -Math.PI / 2, 0, 0);                                    // plain aluminium back
  K.sphere(tri, 0.028, BLACK, -0.05, 1.7, 0.05, 5); rot(K.box(tri, 0.05, 0.12, 0.02, BLACK, -0.04, 1.6, 0.05), 0, 0, 0.3);  // little digging man
  rot(K.box(tri, 0.03, 0.1, 0.02, BLACK, -0.07, 1.52, 0.05), 0, 0, -0.2); rot(K.box(tri, 0.03, 0.1, 0.02, BLACK, -0.01, 1.52, 0.05), 0, 0, 0.3);
  rot(K.box(tri, 0.02, 0.16, 0.02, BLACK, 0.05, 1.58, 0.05), 0, 0, -0.7); rot(K.cyl(tri, 0.06, 0.06, 0.02, BLACK, 0.1, 1.49, 0.05, 3), -Math.PI / 2, 0, 0);
  K.box(tri, 0.3, 0.025, 0.02, BLACK, 0, 1.475, 0.05);

  // ================= the Minibagger (faces -x, towards the hole) =================
  const dig = new THREE.Group(); dig.position.set(2.3, 0, -0.18); g.add(dig);
  for (const tz of [-0.36, 0.36]) {
    K.box(dig, 1.1, 0.3, 0.24, BLACK, 0, 0.15, tz);
    for (const tx of [-0.55, 0.55]) rot(K.cyl(dig, 0.15, 0.15, 0.24, BLACK, tx, 0.15, tz, 10), Math.PI / 2, 0, 0);
    for (const tx of [-0.55, 0, 0.55]) rot(K.cyl(dig, 0.07, 0.07, 0.25, 0x77777c, tx, 0.15, tz, 8), Math.PI / 2, 0, 0);
  }
  K.box(dig, 0.8, 0.14, 0.5, 0x3a3a3e, 0, 0.3, 0);
  K.box(dig, 0.08, 0.24, 1.0, YELLOW, -0.78, 0.14, 0); K.box(dig, 0.3, 0.06, 0.3, YELLOW, -0.62, 0.22, 0);            // dozer blade
  const up = new THREE.Group(); up.position.set(0, 0.37, 0); dig.add(up);
  K.cyl(up, 0.34, 0.34, 0.06, 0x3a3a3e, 0, 0.03, 0, 12);
  K.box(up, 1.0, 0.42, 0.88, YELLOW, 0.1, 0.27, 0);                                                                   // body
  K.box(up, 0.2, 0.46, 0.9, 0x303034, 0.66, 0.25, 0);                                                                 // counterweight
  K.box(up, 0.5, 0.1, 0.4, BLACK, 0.3, 0.55, 0.12);                                                                   // seat base
  K.box(up, 0.3, 0.08, 0.34, BLACK, 0.2, 0.62, 0.12); K.box(up, 0.08, 0.36, 0.34, BLACK, 0.37, 0.82, 0.12);         // seat
  for (const cx of [-0.3, 0.52]) for (const cz of [-0.36, 0.36]) K.box(up, 0.05, 1.05, 0.05, BLACK, cx, 0.98, cz);   // canopy posts
  K.box(up, 0.95, 0.06, 0.82, YELLOW, 0.11, 1.53, 0);                                                                 // canopy roof
  K.box(up, 0.2, 0.06, 0.07, BLACK, -0.12, 0.7, 0.28); K.box(up, 0.2, 0.06, 0.07, BLACK, -0.12, 0.7, -0.04);         // control levers
  K.box(up, 0.2, 0.2, 0.3, YELLOW, -0.45, 0.2, 0);                                                                    // swing bracket
  { const cc = cone(0, 0); g.remove(cc); up.add(cc); cc.position.set(-0.1, 1.56, 0.12); cc.rotation.z = 0.12; }  // somebody put a cone on the roof
  const beacon = K.cyl(up, 0.07, 0.08, 0.12, 0, 0.3, 1.62, -0.2, 8); beacon.material = lampOn; beacon.userData.keep = true; lamps.push(beacon); halos.push(halo(up, 0.3, 1.62, -0.2, 0.17));
  K.text(up, 'KLÜNGEL-BAU', { fg: '#1c1c1e', bg: '#f2b705', w: 0.74, h: 0.2, x: 0.1, y: 0.3, z: 0.445, sizeK: 0.6 });   // mer kenne uns, mer helfe uns
  // boom -> stick -> bucket
  const boom = new THREE.Group(); boom.position.set(-0.55, 0.3, 0); up.add(boom);
  K.box(boom, 0.13, 1.3, 0.14, YELLOW, 0, 0.62, 0); K.box(boom, 0.16, 0.18, 0.16, 0x303034, 0, 0.02, 0);
  K.cyl(boom, 0.035, 0.035, 0.7, 0xc8c8cc, 0.1, 0.55, 0, 6);                                                           // hydraulic ram
  const stick = new THREE.Group(); stick.position.set(0, 1.25, 0); boom.add(stick);
  K.box(stick, 0.11, 0.85, 0.11, YELLOW, 0, -0.4, 0); K.box(stick, 0.14, 0.14, 0.14, 0x303034, 0, 0, 0);
  const bucket = new THREE.Group(); bucket.position.set(0, -0.85, 0); stick.add(bucket);
  K.box(bucket, 0.24, 0.2, 0.32, 0x3a3a3e, -0.08, -0.08, 0); K.box(bucket, 0.06, 0.14, 0.32, 0x3a3a3e, -0.2, -0.17, 0);
  for (let i = 0; i < 4; i++) K.box(bucket, 0.06, 0.04, 0.04, 0xa8a8ac, -0.25, -0.24, -0.12 + i * 0.08);
  K.cone(bucket, 0.09, 0.08, SAND, -0.08, 0.02, 0, 6);                                                                 // a bit of Kölsche Erde

  // ================= the worker: orange jacket, Blaumann, white helmet, a Kölsch and a shovel =================
  const W = K.person({ h: 1.76, skin: 0xe8b088, hair: 0x3a2a1a, shirt: ORANGE, pants: 0x1f4fa8, shoes: 0x3a2a1a, hat: 'helmet', hatColor: WHITE, heavy: true, moustache: 0x3a2618, koelsch: true, smile: 1, age: 1 });
  for (const c of W.children.slice()) if (c.isMesh && c.geometry.type === 'BoxGeometry' && c.position.y > 1.6 && c.position.z > 0.12) W.remove(c); // no visor: a Bauhelm
  const pivot = (parent, px, py, pz, test) => {
    const p = new THREE.Group(); p.position.set(px, py, pz);
    for (const c of parent.children.slice()) if (c.isMesh && test(c.position)) { parent.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; p.add(c); }
    parent.add(p); return p;
  };
  const arm = {};
  for (const sx of [-1, 1]) {
    const sh = pivot(W, sx * 0.21, 1.36, 0, (v) => sx * v.x > 0.17 && v.y > 0.7 && v.y < 1.45);
    const el = pivot(sh, sx * 0.04, -0.3, 0, (v) => v.y < -0.29);
    arm[sx] = { sh, el };
  }
  // the hand with the Kölsch gets a wrist, so the Stange can tilt to his lips (hand, glass and foam move together)
  const RW = pivot(arm[1].el, 0.01, -0.14, 0.16, (v) => v.z > 0.15);
  // one leg crossed over in front of the other, on its toes: the classic Baustellen-Pause (pose solved offline:
  // toe on the ground in front of the standing foot, heel up, shin and shoe clear of the other leg)
  { const hip = pivot(W, 0.1, 0.86, 0, (v) => v.x > 0.03 && v.x < 0.17 && v.y < 0.8);
    const knee = pivot(hip, 0.01, -0.39, 0.02, (v) => v.y < -0.3);
    const ankle = pivot(knee, 0, -0.38, -0.03, (v) => v.y < -0.4);
    hip.rotation.set(-0.563, -0.176, -0.304); knee.rotation.x = 0.462; ankle.rotation.set(0.598, 0, 0.167); }
  // reflective stripes round the jacket (they shine at night) and the brim of the Bauhelm
  K.cyl(W, 0.19, 0.182, 0.045, night ? 0xc8ccd0 : 0xd8dce0, 0, 0.98, 0, 10, RO).scale.z = 0.76;
  K.cyl(W, 0.2, 0.19, 0.045, night ? 0xc8ccd0 : 0xd8dce0, 0, 1.18, 0, 10, RO).scale.z = 0.76;
  K.cyl(W, 0.17, 0.17, 0.02, WHITE, 0, 1.69, 0.02, 10);
  // left forearm rests on the shovel grip in front of him: he leans on it, as one does during the break
  arm[-1].sh.rotation.set(-0.202, -0.019, 0.107); arm[-1].el.rotation.set(-0.963, -0.008, 0);
  const WX = -2.35, WZ = 0.42, WRY = 0.35;
  K.put(g, W, WX, 0, WZ, WRY);
  W.updateMatrixWorld(true); { const bb = new THREE.Box3().setFromObject(W); if (bb.min.y < 0) W.position.y -= bb.min.y; } // the toe may dip a hair
  // the shovel: blade in the ground in front of him, the handle leaning back to the grip under his left hand
  W.updateMatrixWorld(true);
  const hand = new THREE.Vector3(); { let hm = null; arm[-1].el.children.forEach((c) => { if (c.isMesh && (!hm || c.position.y < hm.position.y)) hm = c; }); hm.getWorldPosition(hand); g.updateMatrixWorld(true); g.worldToLocal(hand); }
  const foot = new THREE.Vector3(hand.x - 0.06 * Math.cos(WRY) + 0.17 * Math.sin(WRY), 0, hand.z + 0.06 * Math.sin(WRY) + 0.17 * Math.cos(WRY)); hand.y -= 0.06;
  const sh = new THREE.Group(); g.add(sh); sh.position.copy(foot);
  const dir = new THREE.Vector3().subVectors(hand, foot), len = dir.length(); dir.normalize();
  sh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  K.box(sh, 0.22, 0.28, 0.02, 0x5a5a60, 0, 0.14, 0);                                                                 // blade
  K.cyl(sh, 0.018, 0.018, len - 0.25, 0xb07a3a, 0, 0.25 + (len - 0.25) / 2 - 0.02, 0, 6);                          // wooden handle
  K.box(sh, 0.12, 0.03, 0.03, BLACK, 0, len + 0.01, 0);                                                              // grip
  // stand the blade on the ground (tilted blade corners may poke below): lift the whole shovel a touch
  sh.updateMatrixWorld(true); { const bb = new THREE.Box3().setFromObject(sh); sh.position.y -= bb.min.y - 0.003; }

  bake(g);

  // ================= animation =================
  const RS = arm[1].sh, RE = arm[1].el;
  // the sip: shoulder, elbow and wrist angles that bring the rim of the Stange to his lips (solved offline against
  // World.human's arm layout); in between, the glass swings up in front of him without touching the body
  const SIP = [-1.609, -0.716, -0.087, -0.928, -0.11, -0.037, 1.363, -0.088, -0.05];
  const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  g.userData.tick = (t, dt, ctx) => {
    // warning lamps blink alternately, the beacon flashes with the second group
    const ph = Math.floor(t * 2) % 2;
    for (let i = 0; i < lamps.length; i++) { const on = i % 2 === ph; lamps[i].material = on ? lampOn : lampOff; if (halos[i]) halos[i].visible = on; }
    // the digger reaches into the hole, scoops at the bottom, curls the bucket and lifts the Kölsche Erde out:
    // slowly, as is customary (the teeth just reach the floor of the hole, y 0.02, and never leave the footprint)
    const w = t * 0.55, s = Math.sin(w);
    boom.rotation.z = 1.075 + 0.175 * s;
    stick.rotation.z = -1.345 - 0.345 * s;
    bucket.rotation.z = -0.18 + 0.72 * Math.sin(w - 0.6);
    // every 9 seconds the worker raises his Stange, drinks for a moment and lowers it again
    const k = t % 9, sip = k < 6.4 ? 0 : k < 7.0 ? smooth((k - 6.4) / 0.6) : k < 8.2 ? 1 : smooth((8.9 - k) / 0.7);
    RS.rotation.set(SIP[0] * sip, SIP[1] * sip, SIP[2] * sip); RE.rotation.set(SIP[3] * sip, SIP[4] * sip, SIP[5] * sip); RW.rotation.set(SIP[6] * sip, SIP[7] * sip, SIP[8] * sip);
  };
  g.userData.tick(0, 0, null);
});

// Domtauben: twelve grey Cologne pigeons pecking around a dropped Halve Hahn and a few crumbs, fed by an old man on a
// park bench, right under the city's sign that says feeding them is forbidden. One of them sits on his cap.
// A car within 18 m and the whole flock bursts up and circles overhead; 3 s after the car is gone they come back down.
Veedel.define('tauben', { name: 'Domtauben', kind: 'strasse', w: 5, d: 2.5 }, (g, o, K) => {
  const night = K.theme().night, rnd = K.rnd((o && o.seed) || 12);

  // ---- bake helper: every plain mesh directly under a group becomes one vertex-coloured mesh ----
  const VM = K.__vcMatCache || (K.__vcMatCache = {});
  const vcMat = (glow) => { const k = 's' + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  const _c = new THREE.Color();
  function bake(grp) {
    const lists = { l: [], g: [] };
    for (const ch of grp.children.slice()) {
      if (!ch.isMesh || ch.userData.keep) continue;
      const m = ch.material;
      if (Array.isArray(m) || m.map || m.transparent || m.side === THREE.DoubleSide || m.vertexColors) continue;
      ch.updateMatrix();
      const geo = (ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone()).applyMatrix4(ch.matrix);
      lists[m.isMeshBasicMaterial ? 'g' : 'l'].push({ geo, color: m.color.getHex() });
      grp.remove(ch);
    }
    for (const key of ['l', 'g']) {
      const list = lists[key]; if (!list.length) continue;
      let n = 0; for (const it of list) n += it.geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
      for (const it of list) {
        const pa = it.geo.attributes.position.array, cnt = pa.length / 3; pos.set(pa, off * 3); nor.set(it.geo.attributes.normal.array, off * 3);
        _c.setHex(it.color); for (let i = 0; i < cnt; i++) { col[(off + i) * 3] = _c.r; col[(off + i) * 3 + 1] = _c.g; col[(off + i) * 3 + 2] = _c.b; }
        off += cnt;
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      bg.computeBoundingSphere(); grp.add(new THREE.Mesh(bg, vcMat(key === 'g')));
    }
    for (const ch of grp.children) if (!ch.isMesh) bake(ch);
  }
  const pivot = (parent, px, py, pz, test) => {
    const p = new THREE.Group(); p.position.set(px, py, pz);
    for (const c of parent.children.slice()) if (c.isMesh && test(c.position)) { parent.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; p.add(c); }
    parent.add(p); return p;
  };

  // ================= the old man on the bench =================
  const MX = -0.95, MZ = -0.98, MRY = 0.3;
  const M = K.person({ h: 1.72, skin: 0xf1c8a0, hair: 0xdcdcdc, shirt: 0x6e6a58, pants: 0x4a4a54, shoes: 0x2a1a10, hat: 'cap', hatColor: 0x5a5448, glasses: true, moustache: 0xe8e8e8, age: 1, smile: 1, scarf: 0x8a2a2a });
  const leg = {}, arm = {};
  for (const sx of [-1, 1]) {
    const hip = pivot(M, sx * 0.1, 0.86, 0, (v) => sx * v.x > 0.03 && sx * v.x < 0.17 && v.y < 0.8);
    const knee = pivot(hip, sx * 0.01, -0.39, 0.02, (v) => v.y < -0.3);
    const ankle = pivot(knee, 0, -0.38, -0.03, (v) => v.y < -0.4);
    leg[sx] = { hip, knee, ankle };
    hip.rotation.set(-1.5, 0, sx * 0.06); knee.rotation.x = 1.38; ankle.rotation.x = 0.12;
    const sh = pivot(M, sx * 0.21, 1.36, 0, (v) => sx * v.x > 0.17 && v.y > 0.7 && v.y < 1.45);
    const el = pivot(sh, sx * 0.04, -0.3, 0, (v) => v.y < -0.29);
    arm[sx] = { sh, el };
  }
  // left hand (at -x) holds the paper bag of breadcrumbs on his lap, the right one throws
  arm[-1].sh.rotation.set(-0.5, 0, 0.12); arm[-1].el.rotation.set(-0.95, 0, 0);
  K.box(arm[-1].el, 0.14, 0.17, 0.09, 0xd8c29a, 0.0, -0.35, 0.06); K.box(arm[-1].el, 0.141, 0.03, 0.091, 0xb8a27a, 0.0, -0.25, 0.06);
  const RS = arm[1].sh, RE = arm[1].el;
  const REST_SX = -0.45, REST_EX = -0.75;
  RS.rotation.set(REST_SX, 0, -0.05); RE.rotation.set(REST_EX, 0, 0);
  K.put(g, M, MX, 0, MZ, MRY);
  M.updateMatrixWorld(true);
  { const bb = new THREE.Box3().setFromObject(M); M.position.y = -bb.min.y + 0.002; }
  M.updateMatrixWorld(true);
  const H = 1.72 / 1.75, hipY = M.position.y + 0.86 * H;
  // where his throwing hand is at the top of the swing: the crumbs start there
  const handAt = (sxr, exr, out) => {
    RS.rotation.x = sxr; RE.rotation.x = exr; M.updateMatrixWorld(true);
    let hm = null; RE.children.forEach((c) => { if (c.isMesh && (!hm || c.position.y < hm.position.y)) hm = c; });
    hm.getWorldPosition(out); g.updateMatrixWorld(true); g.worldToLocal(out); return out;
  };
  const THROW_SX = -1.25, THROW_EX = -0.25;
  const hand0 = handAt(THROW_SX, THROW_EX, new THREE.Vector3());
  RS.rotation.x = REST_SX; RE.rotation.x = REST_EX;
  // where the top of his cap is: the thirteenth-best spot in town, reserved for pigeon no. 12
  const capTop = new THREE.Vector3(); { const bb = new THREE.Box3().setFromObject(M); capTop.set(MX, bb.max.y, MZ); }

  // ================= the bench (wooden slats on green cast-iron frames) =================
  const WOOD = 0x9a6436, IRON = 0x24452e, seatY = hipY - 0.09 * H, BX = -1.2, BL = 1.75;
  for (let i = 0; i < 3; i++) K.box(g, BL, 0.035, 0.12, WOOD, BX, seatY - 0.018, MZ - 0.15 + i * 0.14);
  for (let i = 0; i < 2; i++) K.box(g, BL, 0.11, 0.03, WOOD, BX, seatY + 0.2 + i * 0.16, MZ - 0.27 - i * 0.03).rotation.x = -0.18;
  for (const ex of [BX - BL / 2 + 0.12, BX + BL / 2 - 0.12]) {
    K.box(g, 0.05, seatY - 0.02, 0.05, IRON, ex, (seatY - 0.02) / 2, MZ + 0.12);          // front leg
    K.box(g, 0.05, seatY + 0.5, 0.05, IRON, ex, (seatY + 0.5) / 2, MZ - 0.31);             // rear leg + back support
    K.box(g, 0.05, 0.04, 0.5, IRON, ex, seatY - 0.06, MZ - 0.08);                          // seat bearer
    K.box(g, 0.06, 0.04, 0.4, IRON, ex, seatY + 0.22, MZ - 0.05);                          // armrest
    K.box(g, 0.04, 0.22, 0.04, IRON, ex, seatY + 0.1, MZ + 0.12);
    K.box(g, 0.12, 0.02, 0.12, IRON, ex, 0.01, MZ + 0.12); K.box(g, 0.12, 0.02, 0.12, IRON, ex, 0.01, MZ - 0.3);
  }
  // a newspaper beside him and his walking stick
  K.box(g, 0.34, 0.03, 0.26, 0xeeeae0, BX - 0.45, seatY + 0.015, MZ - 0.02).rotation.y = 0.2;
  K.box(g, 0.3, 0.005, 0.1, 0x3a3a3a, BX - 0.45, seatY + 0.032, MZ - 0.05).rotation.y = 0.2;
  { const st = K.cyl(g, 0.015, 0.015, 0.9, 0x5a3418, BX + BL / 2 - 0.02, 0.45, MZ + 0.2, 6); st.rotation.z = 0.12; st.position.y = 0.45 * Math.cos(0.12) + 0.01; }

  // ================= the sign right behind him =================
  const SGX = -1.55, SGZ = -1.36;
  K.box(g, 0.06, 2.1, 0.06, 0x7a7a80, SGX, 1.05, SGZ);
  K.box(g, 1.36, 0.66, 0.04, 0xd8202a, SGX, 1.78, SGZ + 0.01);
  K.box(g, 1.3, 0.6, 0.01, 0x9a9ca0, SGX, 1.78, SGZ - 0.015);                               // plain aluminium back
  K.text(g, 'TAUBEN FÜTTERN', { fg: '#1c1c1e', bg: '#ffffff', w: 1.26, h: 0.28, x: SGX, y: 1.9, z: SGZ + 0.035, sizeK: 0.6, glow: night });
  K.text(g, 'VERBOTEN!', { fg: '#d8202a', bg: '#ffffff', w: 1.26, h: 0.28, x: SGX, y: 1.62, z: SGZ + 0.035, sizeK: 0.7, glow: night });
  // and a street lamp over the bench, so that at night one sees whom one scares away
  K.cyl(g, 0.05, 0.07, 3.3, 0x2a3a30, 1.9, 1.65, -1.3, 8);
  K.box(g, 0.06, 0.06, 0.4, 0x2a3a30, 1.9, 3.28, -1.15);                                  // short arm: the flock circles clear of it
  K.cyl(g, 0.16, 0.2, 0.12, 0x2a3a30, 1.9, 3.28, -0.98, 8);
  K.cyl(g, 0.15, 0.1, 0.1, night ? 0xffe6a0 : 0xe8e2cc, 1.9, 3.18, -0.98, 8, { glow: night });
  if (night) { const pool = K.part(g, new THREE.CircleGeometry(1.25, 14), 0xffe6a0, 1.2, 0.012, -0.2, { glow: true, opacity: 0.16 }); pool.rotation.x = -Math.PI / 2; pool.userData.keep = true; }

  // ================= the Halve Hahn (rye roll, fat slice of Gouda, onion rings) and crumbs =================
  const RX = 0.65, RZ = 0.55;
  const roll = new THREE.Group(); roll.position.set(RX, 0, RZ); roll.rotation.y = 0.5; roll.scale.setScalar(1.4); g.add(roll);
  const dome = new THREE.SphereGeometry(0.08, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  K.part(roll, dome, 0x7a4a24, -0.05, 0, 0).scale.set(1.1, 0.6, 0.8);
  K.box(roll, 0.12, 0.025, 0.1, 0xf2c230, 0.04, 0.02, 0.01).rotation.y = 0.3;             // the Gouda slipped out
  K.part(roll, dome, 0x8a5a2c, 0.13, 0, 0.03).scale.set(1.0, 0.5, 0.8);                    // the other half rolled away
  for (let i = 0; i < 3; i++) K.box(roll, 0.03, 0.01, 0.03, 0xf4f0f0, -0.02 + i * 0.05, 0.036, -0.02 + (i % 2) * 0.03);   // onion rings (well, bits)
  K.box(roll, 0.05, 0.006, 0.03, 0xc49a22, 0.07, 0.035, 0.02);                            // mustard
  const CR = [];
  for (let i = 0; i < 14; i++) { const a = rnd() * 6.283, r = 0.1 + rnd() * 0.5; const x = RX + Math.cos(a) * r, z = RZ + Math.sin(a) * r * 0.8; K.box(g, 0.025, 0.015, 0.025, i % 3 ? 0xc89a5a : 0xe0c290, x, 0.0075, z).rotation.y = a; }
  // food spots the pigeons like: the roll, and where the crumbs usually land
  const FOOD = [[RX, RZ], [RX, RZ], [RX, RZ], [0.0, 0.3], [1.55, 0.95], [0.1, 1.05], [1.8, 0.1], [-1.3, 0.55], [-0.9, 1.1]];

  // thrown crumbs (animated)
  const crumbMat = K.mat(0xd8b070), throwN = 4, crumbs = [];
  for (let i = 0; i < throwN; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), crumbMat); m.userData.keep = true; m.position.set(-0.2 + i * 0.12, 0.01, 0.2 + (i % 2) * 0.1); g.add(m); crumbs.push({ m, x0: 0, y0: 0, z0: 0, x1: m.position.x, z1: m.position.z }); }

  // ================= the pigeons =================
  const LOOK = [
    { body: 0x8c909e, wing: 0x9fa3af, bar: 0x2a2a30, head: 0x7c8190, neck: 0x4f8074, neck2: 0x7c5a92, tail: 0x6c707e },
    { body: 0x868a98, wing: 0x989ca8, bar: 0x26262c, head: 0x767a88, neck: 0x3f7a6a, neck2: 0x6a4a82, tail: 0x666a78 },
    { body: 0xebe7df, wing: 0xf4f0e8, bar: 0xd8d2c8, head: 0xefebe3, neck: 0xe2ddd2, neck2: 0xe8e2d8, tail: 0xe0dcd2 },   // the white one
    { body: 0x9a7866, wing: 0xb08c74, bar: 0x5a3a2a, head: 0x8e6e5e, neck: 0x5a7a60, neck2: 0x7a5a70, tail: 0x7a5a4a },   // the brown one
    { body: 0x50525c, wing: 0x5c5e68, bar: 0x1a1a1e, head: 0x4a4c56, neck: 0x2f6a5a, neck2: 0x5a3a6a, tail: 0x3a3c44 }    // the dark one
  ];
  const LOOKS = [0, 1, 0, 2, 0, 1, 3, 0, 1, 4, 0, 1];
  const PG = [];
  function pigeon(i) {
    const c = LOOK[LOOKS[i]];
    const root = new THREE.Group(); root.name = 'taube' + i; g.add(root);
    for (const sx of [-1, 1]) K.box(root, 0.02, 0.065, 0.03, 0xd8506a, sx * 0.03, 0.0325, 0.006);
    const body = new THREE.Group(); body.name = 'body'; body.position.set(0, 0.06, 0); root.add(body);
    K.sphere(body, 0.1, c.body, 0, 0.08, -0.01, 7).scale.set(0.92, 0.8, 1.55);
    // folded wings: a lighter hump over back and flanks with the two dark wing bars of a proper Domtaube
    K.sphere(body, 0.1, c.wing, 0, 0.112, -0.06, 7).scale.set(0.97, 0.62, 1.42);
    for (const [bz, by] of [[-0.1, 0.168], [-0.145, 0.158]]) K.box(body, 0.1, 0.01, 0.024, c.bar, 0, by - 0.004, bz);
    K.box(body, 0.09, 0.018, 0.13, c.tail, 0, 0.1, -0.2).rotation.x = -0.22;
    K.box(body, 0.092, 0.02, 0.03, 0x2a2a2e, 0, 0.087, -0.26).rotation.x = -0.22;
    K.sphere(body, 0.062, c.neck2, 0, 0.14, 0.09, 5);
    const head = new THREE.Group(); head.name = 'head'; head.position.set(0, 0.16, 0.1); body.add(head);
    K.sphere(head, 0.052, c.neck, 0, 0.0, 0.0, 6);
    K.sphere(head, 0.047, c.head, 0, 0.06, 0.03, 7);
    K.cone(head, 0.012, 0.045, 0x3a3a3a, 0, 0.055, 0.09, 4).rotation.x = Math.PI / 2;
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Group(); w.name = 'wing'; w.position.set(sx * 0.06, 0.15, 0.03); w.visible = false; body.add(w);
      K.box(w, 0.3, 0.012, 0.13, c.wing, sx * 0.15, 0, 0);
      for (const s of [0.13, 0.18]) K.box(w, 0.025, 0.004, 0.11, c.bar, sx * s, 0.008, 0);
      wings.push(w);
    }
    const p = { root, body, head, wL: wings[0], wR: wings[1], x: 0, y: 0, z: 0, hd: 0, tx: 0, tz: 0, fx: 0, fz: 0, mode: 0, timer: 0, ph: rnd() * 6.283,
      step: 0, fold: 1, flap: 0, hx: 0, hy: 0, pt: 0, bk: 0, lx: 0, lz: 0, t0: 0, lt0: 0, snap: false, sx0: 0, sy0: 0, sz0: 0, ang: 0, rx: 0, rz: 0, h: 0, om: 0, gy: 0, perch: false, done: true };
    PG.push(p); return p;
  }
  const ZMIN = -0.3, ZMAX = 1.15, XMAX = 2.25;        // walkers keep 0.35 m from the front edge: an opening wing reaches 0.36 m
  const pickTarget = (p) => {
    let f;
    if (rnd() < 0.35 && crumbsDown) { const c = crumbs[Math.floor(rnd() * throwN)]; f = [c.x1, c.z1]; } else f = FOOD[Math.floor(rnd() * FOOD.length)];
    const a = rnd() * 6.283, r = 0.12 + rnd() * 0.3;
    p.fx = f[0]; p.fz = f[1];
    p.tx = Math.max(-XMAX, Math.min(XMAX, f[0] + Math.cos(a) * r)); p.tz = Math.max(ZMIN, Math.min(ZMAX, f[1] + Math.sin(a) * r));
  };
  let crumbsDown = true;
  for (let i = 0; i < 12; i++) {
    const p = pigeon(i);
    if (i === 11) { p.perch = true; p.x = capTop.x - 0.02; p.z = capTop.z; p.gy = capTop.y - 0.004; p.y = p.gy; p.hd = MRY + 0.2; }
    else { pickTarget(p); p.x = p.tx; p.z = p.tz; p.hd = Math.atan2(p.fx - p.x, p.fz - p.z); p.mode = 1; p.timer = 0.5 + rnd() * 3; }
    p.lx = p.x; p.lz = p.z;
  }
  bake(g);

  // ================= behaviour =================
  const CX = 0.05, CZ = 0.05;             // centre of the circling (radii below keep wingtips inside the footprint and 0.4 m off the lamp)
  const wp = new THREE.Vector3();
  let state = 0, stateT = -1e9, lastNear = -1e9, prevT = null, throwT = 0.6, launched = -1, crumbT = -1, crumbsFlying = false, fist = 0, swNow = 0;
  const S_GROUND = 0, S_FLY = 1, S_LAND = 2;
  const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u), smooth = (u) => u * u * (3 - 2 * u);
  const wrapA = (a) => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
  function place(p, t) {
    p.root.position.set(p.x, p.y, p.z); p.root.rotation.y = p.hd;
    const f = p.fold;
    for (let k = 0; k < 2; k++) { const w = k ? p.wR : p.wL, sx = k ? 1 : -1; w.visible = f < 0.55; w.rotation.y = sx * 1.3 * f; w.rotation.z = sx * (1 - f) * p.flap; }
  }
  function takeoff(t) {
    for (let i = 0; i < PG.length; i++) {
      const p = PG[i];
      p.t0 = t + rnd() * 0.35; p.sx0 = p.x; p.sy0 = p.y; p.sz0 = p.z; p.done = false; p.snap = false;
      p.ang = Math.atan2((p.z - CZ) / 1.1, p.x - CX) + (rnd() - 0.5) * 0.6;
      p.rx = 1.45 + rnd() * 0.4; p.rz = 0.7 + rnd() * 0.25; p.h = 2.2 + rnd() * 3.2; p.om = 1.05 + rnd() * 0.3;
    }
  }
  function land(t) {
    for (let i = 0; i < PG.length; i++) {
      const p = PG[i]; p.lt0 = t + i * 0.13; p.snap = false;
      if (p.perch) { p.tx = capTop.x - 0.02; p.tz = capTop.z; }
      else { pickTarget(p); }
    }
  }
  function flyPos(p, t) {
    const tau = t - p.t0;
    if (tau <= 0) return false;
    const a = p.ang + p.om * tau;
    const cx = CX + p.rx * Math.cos(a), cz = CZ + p.rz * Math.sin(a), cy = p.h + 0.25 * Math.sin(tau * 1.3 + p.ph);
    const k = smooth(clamp01(tau / 1.8)), ky = 1 - (1 - clamp01(tau / 1.5)) * (1 - clamp01(tau / 1.5));
    p.x = p.sx0 + (cx - p.sx0) * k; p.z = p.sz0 + (cz - p.sz0) * k; p.y = p.sy0 + (cy - p.sy0) * ky;
    return true;
  }
  g.userData.tick = (t, dt, ctx) => {
    if (prevT !== null && t < prevT - 0.5) {
      // the clock jumped back (new race): everybody back down at once
      lastNear = -1e9; stateT = -1e9; state = S_GROUND; throwT = t + 0.6; launched = -1; crumbsFlying = false; crumbsDown = true; fist = 0; swNow = 0;
      for (let i = 0; i < PG.length; i++) { const p = PG[i]; p.done = true; p.fold = 1; p.flap = 0; if (p.perch) { p.x = capTop.x - 0.02; p.z = capTop.z; p.y = capTop.y - 0.004; } else { pickTarget(p); p.x = p.tx; p.z = p.tz; p.y = 0; p.mode = 1; p.timer = rnd() * 2; } }
    }
    prevT = t;
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    // ---- cars ----
    let near = false; const cars = ctx && ctx.cars;
    if (cars && cars.length) {
      g.getWorldPosition(wp);
      for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c) continue; const dx = c.x - wp.x, dz = c.z - wp.z; if (dx * dx + dz * dz < 324) { near = true; break; } }
    }
    if (near) lastNear = t;
    if (near && state !== S_FLY) { takeoff(t); state = S_FLY; stateT = t; }
    else if (state === S_FLY && t - lastNear > 3 && t - stateT > 2.5) { land(t); state = S_LAND; stateT = t; }
    let allDown = true;
    // ---- pigeons ----
    for (let i = 0; i < PG.length; i++) {
      const p = PG[i];
      p.lx = p.x; p.lz = p.z; const ly = p.y;
      let pitch = 0, headX = 0, headY = 0, headZ = 0, flapping = false;
      if (state === S_FLY || (state === S_LAND && !p.done && t < p.lt0)) {
        // up, up and circle
        const up = flyPos(p, t);
        if (up) {
          const tau = t - p.t0; flapping = true;
          const glide = tau > 2.5 && Math.sin(t * 0.9 + p.ph) > 0.35;
          p.flap = glide ? 0.12 + 0.08 * Math.sin(t * 5 + p.ph) : 0.25 + 0.9 * Math.sin(t * 30 + p.ph);
          pitch = tau < 1.2 ? -0.5 : -0.12; headX = -0.25;
        } else { headX = -0.3; }   // startled: head up
        allDown = false;
      } else if (state === S_LAND && !p.done) {
        if (!p.snap) { p.snap = true; p.sx0 = p.x; p.sy0 = p.y; p.sz0 = p.z; }
        const u = clamp01((t - p.lt0) / 2.4), k = smooth(u);
        p.x = p.sx0 + (p.tx - p.sx0) * k; p.z = p.sz0 + (p.tz - p.sz0) * k;
        const gy = p.perch ? capTop.y - 0.004 : 0;
        p.y = gy + (p.sy0 - gy) * Math.pow(1 - u, 1.6);
        flapping = true;
        p.flap = u > 0.7 ? 0.55 + 0.6 * Math.sin(t * 32 + p.ph) : 0.15 + 0.1 * Math.sin(t * 6 + p.ph);   // touch-down: wings up, braking
        pitch = u > 0.7 ? -0.55 : -0.1;
        if (u >= 1) { p.done = true; p.y = gy; p.mode = 1; p.timer = 0.8 + rnd() * 2; }   // pecking mode turns it to the food, no snap
        else allDown = false;
      } else if (p.perch) {
        // sits on the cap, looks around, fluffs up now and then
        headY = 0.6 * Math.sin(t * 0.7 + p.ph); headX = 0.15 * Math.max(0, Math.sin(t * 2.3));
      } else {
        // ---- on the pavement: walk (bobbing the head), peck, look around ----
        if (p.mode === 0) {
          const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.sqrt(dx * dx + dz * dz);
          if (d < 0.03) { p.mode = 1; p.timer = 1.2 + rnd() * 3; }
          else {
            const sp = 0.32 * dt; p.x += dx / d * Math.min(sp, d); p.z += dz / d * Math.min(sp, d);
            const want = Math.atan2(dx, dz); p.hd += wrapA(want - p.hd) * Math.min(1, dt * 10);
            p.step += dt * 9; headZ = 0.03 * Math.sin(p.step * 2); pitch = 0.05;
          }
        } else if (p.mode === 1) {
          const want = Math.atan2(p.fx - p.x, p.fz - p.z); p.hd += wrapA(want - p.hd) * Math.min(1, dt * 6);
          const pk = Math.sin(t * 8.5 + p.ph); const peck = pk > 0 ? pk * pk : 0;
          pitch = 0.3 + 0.12 * peck; headX = 0.4 + 0.75 * peck; headZ = 0.02 * peck;
          p.timer -= dt; if (p.timer <= 0) { p.mode = 2; p.timer = 0.6 + rnd() * 1.4; }
        } else {
          headY = 0.5 * Math.sin(t * 3 + p.ph); headX = -0.1;
          p.timer -= dt; if (p.timer <= 0) { pickTarget(p); p.mode = 0; }
        }
      }
      // nose up only with some air below the tail
      if (flapping && pitch < 0) pitch *= clamp01((p.y - (p.perch ? capTop.y : 0)) / 0.3);
      // wings fold in on the ground, open in the air
      p.fold += ((flapping ? 0 : 1) - p.fold) * Math.min(1, dt * (flapping ? 12 : 5));
      if (!flapping) p.flap = 0; else if (p.flap < -0.4 - 2 * p.y) p.flap = -0.4 - 2 * p.y;   // no downstroke into the pavement
      // heading follows the flight path
      if (flapping) { const mx = p.x - p.lx, mz = p.z - p.lz; if (mx * mx + mz * mz > 1e-7) p.hd += wrapA(Math.atan2(mx, mz) - p.hd) * Math.min(1, dt * 8); }
      p.hd = wrapA(p.hd);   // circling adds whole turns: keep the heading bounded
      const kb = Math.min(1, dt * 12); p.pt += (pitch - p.pt) * kb; p.bk += ((flapping && p.y > 1 ? -0.25 : 0) - p.bk) * kb;   // flare and bank ease in
      p.body.rotation.x = p.pt; p.body.rotation.z = p.bk;
      // the head follows quickly but not in one frame (startle and touch-down would snap it otherwise)
      const kh = Math.min(1, dt * 20); p.hx += (headX - p.hx) * kh; p.hy += (headY - p.hy) * kh;
      p.head.rotation.set(p.hx, p.hy, 0); p.head.position.z = 0.1 + headZ; p.head.position.y = 0.16 - 0.018 * Math.max(0, p.hx - 0.4);
      place(p, t);
    }
    // keep the walkers from standing inside each other
    if (state === S_GROUND) {
      for (let i = 0; i < 11; i++) for (let j = i + 1; j < 11; j++) {
        const a = PG[i], b = PG[j], dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 < 0.1156 && d2 > 1e-8) {   // 0.34 m apart: a pigeon is about 0.35 m from beak to tail
          const d = Math.sqrt(d2), push = (0.34 - d) * 0.5 / d; a.x -= dx * push; a.z -= dz * push; b.x += dx * push; b.z += dz * push;
          a.x = Math.max(-XMAX, Math.min(XMAX, a.x)); a.z = Math.max(ZMIN, Math.min(ZMAX, a.z)); b.x = Math.max(-XMAX, Math.min(XMAX, b.x)); b.z = Math.max(ZMIN, Math.min(ZMAX, b.z));
          a.root.position.x = a.x; a.root.position.z = a.z; b.root.position.x = b.x; b.root.position.z = b.z;
        }
      }
    }
    if (state === S_LAND && allDown) { state = S_GROUND; stateT = t; }
    // ---- the old man: throws crumbs while they are down, shakes his fist when a car scares them off ----
    // (fist and swing ease in and out, so the arm never jumps between the two)
    fist += ((state === S_GROUND ? 0 : 1) - fist) * Math.min(1, dt * 7);
    if (state === S_GROUND) {
      const rel = t - throwT;
      swNow = 0;
      if (rel >= 0) {
        const cyc = Math.floor(rel / 4.5), u = rel - cyc * 4.5;
        swNow = u < 0.9 ? Math.sin(u / 0.9 * Math.PI) : 0;
        // the crumbs leave his hand at the top of the swing and land 0.7 s later
        if (u >= 0.45 && cyc !== launched) {
          launched = cyc; crumbT = throwT + cyc * 4.5 + 0.45; crumbsFlying = true; crumbsDown = false;
          for (let i = 0; i < throwN; i++) { const c = crumbs[i]; c.x0 = hand0.x; c.y0 = hand0.y; c.z0 = hand0.z; c.x1 = -0.45 + rnd() * 1.1; c.z1 = rnd() * 0.7; }
        }
      }
      if (crumbsFlying) {
        const f = (t - crumbT) / 0.7;
        for (let i = 0; i < throwN; i++) { const c = crumbs[i], fi = clamp01(f * (1 + i * 0.1)); c.m.position.set(c.x0 + (c.x1 - c.x0) * fi, (c.y0 - 0.01) * (1 - fi) + 0.01 + 1.4 * fi * (1 - fi) * 0.25, c.z0 + (c.z1 - c.z0) * fi); }
        if (f >= 1) { crumbsFlying = false; crumbsDown = true; }
      }
    } else {
      swNow = Math.max(0, swNow - dt * 3);
      throwT = t + 1.5; launched = -1;
      if (crumbsFlying) { crumbsFlying = false; crumbsDown = true; for (let i = 0; i < throwN; i++) crumbs[i].m.position.set(crumbs[i].x1, 0.01, crumbs[i].z1); }
    }
    const kf = 1 - fist;
    RS.rotation.set((REST_SX + (THROW_SX - REST_SX) * swNow) * kf + (-2.75 + 0.25 * Math.sin(t * 13)) * fist, 0, -0.05 * kf + 0.25 * fist);
    RE.rotation.set((REST_EX + (THROW_EX - REST_EX) * swNow) * kf + (-0.7 + 0.35 * Math.sin(t * 13 + 1)) * fist, 0, 0);
  };
  g.userData.tick(0, 0, null);
});

// Kölsche Straßenband on the pavement: a big fellow on the tuba (sousaphone, the bell over his head),
// a trumpeter in fedora and shades, a snare drummer and an old Quetschebüggel (accordion) player, all in
// red-white scarves. In front: the open case with coins and a hand-painted cardboard "KÖLSCHE TÖN · SPENDE".
// Everybody bobs to the beat, the drummer's sticks hit the snare, the accordion's bellows breathe.
Veedel.define('strassenband', { name: 'Kölsche Straßenband', kind: 'strasse', w: 5, d: 2.2 }, (g, o, K) => {
  const night = K.theme().night, rnd = K.rnd((o && o.seed) || 13);
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
  const BRASS = 0xe8b020, BRASS_D = 0x9a6a10, RED = 0xc1121f, WHITE = 0xf6f4ee, BLACK = 0x17171a, CHROME = 0xc8c8d0;

  // ---- merge helper: many small parts -> one vertex-coloured mesh (shared materials) ----
  const VM = K.__vcMatCache || (K.__vcMatCache = {});
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3(), _c = new THREE.Color();
  function merge(parts) {
    let n = 0; const geos = [];
    for (const it of parts) {
      const geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.m) _m.copy(it.m);
      else {
        if (it.q) _q.copy(it.q); else { const r = it.r || [0, 0, 0]; _e.set(r[0], r[1], r[2], r[3] || 'XYZ'); _q.setFromEuler(_e); }
        _p.set(it.p[0], it.p[1], it.p[2]); _s.set(it.s ? it.s[0] : 1, it.s ? it.s[1] : 1, it.s ? it.s[2] : 1); _m.compose(_p, _q, _s);
      }
      geo.applyMatrix4(_m); geos.push([geo, it.c]); n += geo.attributes.position.count;
    }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
    for (const [geo, c] of geos) {
      const cnt = geo.attributes.position.count; pos.set(geo.attributes.position.array, off * 3); nor.set(geo.attributes.normal.array, off * 3);
      _c.set(c); for (let i = 0; i < cnt; i++) { col[(off + i) * 3] = _c.r; col[(off + i) * 3 + 1] = _c.g; col[(off + i) * 3 + 2] = _c.b; }
      off += cnt;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bg.computeBoundingSphere(); return bg;
  }
  const vmesh = (parent, parts, double, glow) => { const m = new THREE.Mesh(merge(parts), vcMat(double, glow)); parent.add(m); return m; };
  const B = (w, h, d, c, x, y, z, r, s) => ({ geo: new THREE.BoxGeometry(w, h, d), c, p: [x, y, z], r, s });
  const C = (rt, rb, h, c, x, y, z, seg, r, s, open) => ({ geo: new THREE.CylinderGeometry(rt, rb, h, seg || 8, 1, !!open), c, p: [x, y, z], r, s });
  const S = (rad, c, x, y, z, seg, s) => ({ geo: new THREE.SphereGeometry(rad, seg || 6, Math.max(3, Math.round((seg || 6) * 0.7))), c, p: [x, y, z], s });
  const TO = (R, tube, c, x, y, z, r, rs, ts) => ({ geo: new THREE.TorusGeometry(R, tube, rs || 4, ts || 12), c, p: [x, y, z], r });
  const L = (a, b, r0, r1, c, seg) => { // a cylinder from point a to point b
    const d = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    return { geo: new THREE.CylinderGeometry(r1, r0, len, seg || 6), c, p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], q: new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()) };
  };

  // ---- people: K.person, its plain meshes baked into one, arms rebuilt in playing poses ----
  function compact(p) {
    const parts = [];
    for (const ch of p.children.slice()) {
      if (!ch.isMesh) continue;
      const mt = ch.material;
      if (mt.map || mt.transparent || mt.isMeshBasicMaterial) continue;       // the face stays its own mesh
      const gt = ch.geometry.type, px = ch.position.x, py = ch.position.y, gp = ch.geometry.parameters;
      const arm = (gt === 'CylinderGeometry' && Math.abs(px) > 0.19 && py > 0.75 && py < 1.33 && gp.radiusBottom > 0.035) || (gt === 'SphereGeometry' && Math.abs(px) > 0.2 && py < 1.0 && gp.radius < 0.05);
      p.remove(ch);
      if (arm) continue;
      ch.updateMatrix(); parts.push({ geo: ch.geometry, c: mt.color.getHex(), m: ch.matrix.clone() });
    }
    return parts;
  }
  // two-bone arm: shoulder at (sx*0.21, 1.36, 0), upper arm A, forearm Bf; elbow bends towards `hint`
  const A = 0.3, Bf = 0.27;
  const _S = new V3(), _W = new V3(), _D = new V3(), _P = new V3(), _E = new V3();
  function ik(sx, wx, wy, wz, hint) {
    _S.set(sx * 0.21, 1.36, 0); _W.set(wx, wy, wz); _D.subVectors(_W, _S);
    let d = _D.length(); d = Math.min(Math.max(d, 0.08), A + Bf - 0.002); _D.normalize();
    const x = (A * A - Bf * Bf + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A * A - x * x));
    _P.copy(hint).addScaledVector(_D, -hint.dot(_D)).normalize();
    _E.copy(_S).addScaledVector(_D, x).addScaledVector(_P, h);
    _W.copy(_S).addScaledVector(_D, d);
  }
  const hintOf = (sx, y, z) => new V3(sx * 0.8, y == null ? -0.4 : y, z == null ? -0.4 : z);
  // static arm parts (baked with the body)
  function armParts(sx, w, cols, hint) {
    ik(sx, w[0], w[1], w[2], hint || hintOf(sx));
    const s = [_S.x, _S.y, _S.z], e = [_E.x, _E.y, _E.z], wr = [_W.x, _W.y, _W.z];
    const dir = new V3().subVectors(_W, _E).normalize(), hq = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    return [L(s, e, 0.058, 0.047, cols.up), S(0.047, cols.up, e[0], e[1], e[2], 6), L(e, wr, 0.047, 0.037, cols.fore),
      { geo: new THREE.SphereGeometry(0.043, 6, 4), c: cols.skin, p: [wr[0] + dir.x * 0.035, wr[1] + dir.y * 0.035, wr[2] + dir.z * 0.035], q: hq, s: [0.8, 1.25, 0.55] }];
  }
  const person = (opt, x, z, ry) => { const p = K.person(opt); K.put(g, p, x, 0, z, ry || 0); return p; };
  // bottom corners of everything a person carries (in the person's scaled frame): the sway lift keeps them above y = 0
  function footCorners(p) {
    const px = p.position.clone(), rot = p.rotation.clone(); p.position.set(0, 0, 0); p.rotation.set(0, 0, 0); p.updateMatrixWorld(true);
    const u = new THREE.Box3(), bx = new THREE.Box3();
    p.traverse((m) => { if (m.isMesh) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bx.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); u.union(bx); } });
    p.position.copy(px); p.rotation.copy(rot); p.updateMatrixWorld(true);
    const x0 = u.min.x - 0.05, x1 = u.max.x + 0.05, z0 = u.min.z - 0.05, z1 = u.max.z + 0.05;
    return [new V3(x0, u.min.y, z0), new V3(x1, u.min.y, z0), new V3(x0, u.min.y, z1), new V3(x1, u.min.y, z1)];
  }
  const _R = new THREE.Matrix4();
  const liftFor = (P) => { _R.makeRotationFromEuler(P.p.rotation); const e = _R.elements; let mn = 0; for (let i = 0; i < P.corners.length; i++) { const c = P.corners[i], y = e[1] * c.x + e[5] * c.y + e[9] * c.z; if (y < mn) mn = y; } return -mn + 0.002; };
  const band = [];

  // ================= 1) the tuba (sousaphone): a big fellow, brass ring round the body, bell above the head
  {
    const cols = { up: 0x2c4f8f, fore: 0x2c4f8f, skin: 0xe0ac69 };
    const p = person({ h: 1.84, heavy: true, shirt: cols.up, pants: 0x24242c, shoes: BLACK, skin: cols.skin, hair: 0x4a3020, hat: 'cap', hatColor: 0x3a3a44, scarf: RED, moustache: 0x3a2414, smile: 0.4 }, -1.72, -0.12, 0.12);
    const parts = compact(p);
    parts.push(...armParts(1, [0.16, 1.1, 0.3], cols), ...armParts(-1, [-0.14, 1.24, 0.3], cols, hintOf(-1, -0.7, -0.2)));
    // ring around the body resting on the left shoulder, valves at the right hand, lead pipe to the mouth
    parts.push({ geo: new THREE.TorusGeometry(0.31, 0.055, 6, 18), c: BRASS, p: [0, 1.2, 0.02], r: [Math.PI / 2, 0, -0.62, 'ZYX'] });
    parts.push(L([-0.26, 1.37, 0.02], [-0.15, 1.85, -0.06], 0.045, 0.05, BRASS, 7), L([-0.15, 1.85, -0.06], [-0.08, 2.08, -0.14], 0.05, 0.06, BRASS, 7));
    for (let k = 0; k < 3; k++) parts.push(C(0.022, 0.022, 0.16, BRASS_D, 0.07 + k * 0.05, 1.12, 0.3, 6), C(0.026, 0.026, 0.02, CHROME, 0.07 + k * 0.05, 1.21, 0.3, 6));
    parts.push(L([-0.18, 1.28, 0.27], [-0.03, 1.56, 0.18], 0.016, 0.012, BRASS, 5), C(0.02, 0.01, 0.05, CHROME, -0.015, 1.575, 0.16, 6, [1.2, 0, 0]));
    // bell: wide end facing the street, a dark throat inside, bright rim
    parts.push(TO(0.3, 0.024, 0xffd84a, -0.08, 2.2, 0.21, null, 4, 18), C(0.25, 0.25, 0.01, BRASS_D, -0.08, 2.2, 0.08, 16, [Math.PI / 2, 0, 0]));
    vmesh(p, parts);
    vmesh(p, [C(0.3, 0.06, 0.36, BRASS, -0.08, 2.2, 0.03, 16, [Math.PI / 2, 0, 0], null, true)], true);
    band.push({ p, ph: 0, H: 1.84 / 1.75 });
  }

  // ================= 2) the trumpet: fedora, shades, black suit, horn pointing jazzily up to the sky
  {
    const cols = { up: 0x1e1e26, fore: 0x1e1e26, skin: 0xffdbac };
    const p = person({ h: 1.8, suit: true, shirt: cols.up, pants: cols.up, shoes: 0x3a2414, skin: cols.skin, hat: 'fedora', hatColor: 0x2a2a30, glasses: true, shades: true, scarf: RED, smile: 0.2 }, -0.62, 0.02, -0.08);
    const parts = compact(p);
    // the horn: mouthpiece -> lead pipe -> valves -> bell, tilted up ~14 degrees
    const tilt = 0.25, at = (dz, dy) => [0, 1.585 + dz * tilt + (dy || 0), 0.14 + dz];
    parts.push(L(at(0), at(0.42), 0.013, 0.013, BRASS, 5), L(at(0.08, -0.06), at(0.36, -0.06), 0.012, 0.012, BRASS, 5), L(at(0.36, -0.06), at(0.36, 0), 0.012, 0.012, BRASS, 5), L(at(0.08, -0.06), at(0.08, 0), 0.012, 0.012, BRASS, 5));
    for (let k = 0; k < 3; k++) { const v = at(0.17 + k * 0.045, -0.03); parts.push(C(0.016, 0.016, 0.09, BRASS_D, v[0], v[1], v[2], 6), C(0.012, 0.012, 0.03, WHITE, v[0], v[1] + 0.055, v[2], 6)); }
    const bell = at(0.5), mp = at(-0.01);
    parts.push(C(0.018, 0.012, 0.03, CHROME, mp[0], mp[1], mp[2], 6, [Math.PI / 2 - tilt, 0, 0]), TO(0.078, 0.008, 0xffd84a, bell[0], bell[1] + 0.04 * tilt, bell[2] + 0.04, [-tilt, 0, 0], 4, 12));
    parts.push(...armParts(1, [0.05, 1.63, 0.31], cols, hintOf(1, -0.9, 0)), ...armParts(-1, [-0.03, 1.55, 0.34], cols, hintOf(-1, -0.9, 0)));
    vmesh(p, parts);
    vmesh(p, [C(0.078, 0.014, 0.16, BRASS, bell[0], bell[1] - 0.01, bell[2] - 0.04, 12, [Math.PI / 2 - tilt, 0, 0], null, true)], true);
    band.push({ p, ph: 0.5, H: 1.8 / 1.75, trumpet: true });
  }

  // ================= 3) the snare drummer: white shirt, red cap, drum on a tripod stand, forearms hit
  const sticks = [];
  {
    const cols = { up: WHITE, fore: WHITE, skin: 0xc68642 };
    const p = person({ h: 1.76, shirt: WHITE, pants: 0x3a3a5a, shoes: 0xf0f0f0, skin: cols.skin, hair: 0x1a1a1a, hat: 'cap', hatColor: RED, scarf: RED, moustache: 0x1a1a1a, smile: 1 }, 0.58, -0.2, 0);
    const parts = compact(p);
    // stand + snare (z in front of the belly)
    const dz = 0.36, dy = 0.74;
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; parts.push(L([Math.sin(a) * 0.22, 0.0, dz + Math.cos(a) * 0.22], [0, 0.42, dz], 0.012, 0.012, 0x44444c, 4)); }
    parts.push(L([0, 0.42, dz], [0, dy - 0.07, dz], 0.014, 0.014, CHROME, 5));
    for (let k = 0; k < 3; k++) { const a = k * 2.094; parts.push(L([0, dy - 0.07, dz], [Math.sin(a) * 0.16, dy - 0.04, dz + Math.cos(a) * 0.16], 0.008, 0.008, CHROME, 4)); }
    parts.push(C(0.18, 0.18, 0.13, RED, 0, dy, dz, 14), C(0.184, 0.184, 0.02, CHROME, 0, dy + 0.065, dz, 14), C(0.184, 0.184, 0.02, CHROME, 0, dy - 0.065, dz, 14), C(0.176, 0.176, 0.006, WHITE, 0, dy + 0.074, dz, 14));
    parts.push(C(0.182, 0.182, 0.035, WHITE, 0, dy, dz, 14)); // a white band round the shell
    for (let k = 0; k < 6; k++) { const a = k * 1.047 + 0.3; parts.push(B(0.018, 0.1, 0.018, CHROME, Math.sin(a) * 0.187, dy, dz + Math.cos(a) * 0.187, [0, a, 0])); }
    // upper arms fixed, forearms (with hand + stick) swing from the elbow
    for (const sx of [-1, 1]) {
      ik(sx, sx * 0.13, 0.98, 0.27, hintOf(sx, -0.5, -0.5));
      const s = [_S.x, _S.y, _S.z], e = [_E.x, _E.y, _E.z];
      parts.push(L(s, e, 0.058, 0.047, cols.up), S(0.047, cols.up, e[0], e[1], e[2], 6));
      const el = new THREE.Group(); el.position.set(e[0], e[1], e[2]); p.add(el);
      const wr = [_W.x - e[0], _W.y - e[1], _W.z - e[2]];
      const tip = [sx * 0.05 - e[0], dy + 0.1 - e[1], dz - 0.02 - e[2]], tail = [wr[0] + (wr[0] - tip[0]) * 0.35, wr[1] + (wr[1] - tip[1]) * 0.35, wr[2] + (wr[2] - tip[2]) * 0.35];
      vmesh(el, [L([0, 0, 0], wr, 0.047, 0.037, cols.fore), S(0.045, cols.skin, wr[0], wr[1], wr[2], 6, [1, 0.8, 1]), L(tail, tip, 0.011, 0.008, 0xe8d0a0, 4), S(0.014, 0xe8d0a0, tip[0], tip[1], tip[2], 4)]);
      sticks.push({ g: el, sx });
    }
    vmesh(p, parts);
    band.push({ p, ph: 0.25, H: 1.76 / 1.75 });
  }

  // ================= 4) the Quetschebüggel: an old man in a brown cardigan, the accordion breathing
  let bellows = null, bassEnd = null, bassArm = null;
  {
    const cols = { up: 0x8a5a2a, fore: 0x8a5a2a, skin: 0xffdbac };
    const p = person({ h: 1.72, heavy: true, shirt: cols.up, pants: 0x4a4a52, shoes: 0x3a2414, skin: cols.skin, hair: 0xdadada, hat: 'cap', hatColor: 0x5a5a60, scarf: RED, moustache: 0xe8e8e8, age: 1, smile: 0.8, glasses: true }, 1.7, 0, -0.1);
    const parts = compact(p);
    const ay = 1.13, az = 0.26;
    // treble end (player's right = -x): red box, white/black keys along the outer edge, chrome grille in front
    parts.push(B(0.1, 0.44, 0.22, RED, -0.2, ay, az), B(0.03, 0.4, 0.2, WHITE, -0.265, ay, az), B(0.018, 0.4, 0.21, BLACK, -0.268, ay + 0.005, az - 0.012, null, [1, 1, 0.5]));
    for (let k = 0; k < 7; k++) parts.push(B(0.02, 0.025, 0.12, BLACK, -0.275, ay - 0.17 + k * 0.055, az - 0.03));
    parts.push(B(0.07, 0.3, 0.012, CHROME, -0.2, ay + 0.02, az + 0.112));
    // straps over the shoulders
    for (const sx of [-1, 1]) parts.push(L([sx * 0.13, ay + 0.2, az - 0.1], [sx * 0.15, 1.42, 0.02], 0.02, 0.02, 0x3a2414, 4));
    parts.push(...armParts(-1, [-0.3, 1.2, 0.3], cols, hintOf(-1, -0.5, -0.2)));
    vmesh(p, parts);
    // bellows: folds from x=0 to x=1, scaled every frame between the two ends
    const bp = [];
    for (let k = 0; k < 7; k++) bp.push(B(1 / 7, k % 2 ? 0.44 : 0.4, k % 2 ? 0.22 : 0.19, k % 2 ? BLACK : WHITE, (k + 0.5) / 7, 0, 0));
    bellows = vmesh(p, bp); bellows.position.set(-0.15, ay, az);
    // bass end (player's left = +x): moves in and out with the left hand strap and buttons
    bassEnd = new THREE.Group(); bassEnd.position.set(0, 0, 0); p.add(bassEnd);
    const be = [B(0.08, 0.44, 0.22, RED, 0.16, ay, az), B(0.012, 0.34, 0.18, 0x3a2414, 0.205, ay, az)];
    for (let k = 0; k < 6; k++) be.push(S(0.012, WHITE, 0.2, ay - 0.12 + k * 0.05, az + 0.115, 4));
    be.push(B(0.06, 0.1, 0.012, 0xffd84a, 0.16, ay + 0.13, az + 0.112));
    vmesh(bassEnd, be);
    // left arm (animated): two meshes, set every frame
    const mk = (parts2) => { const m = new THREE.Mesh(merge(parts2), vcMat(false, false)); p.add(m); return m; };
    bassArm = {
      ua: mk([C(0.047, 0.058, A, cols.up, 0, A / 2, 0, 6), S(0.047, cols.up, 0, A, 0, 6)]),
      fa: mk([C(0.037, 0.047, Bf, cols.fore, 0, Bf / 2, 0, 6), S(0.043, cols.skin, 0, Bf + 0.035, 0, 6, [0.8, 1.25, 0.55])]),
      hint: hintOf(1, -0.6, -0.3), ay, az
    };
    band.push({ p, ph: 0.75, H: 1.72 / 1.75 });
  }

  // ================= the open case with coins, the cardboard sign leaning in the lid
  {
    const cx = -0.02, cz = 0.74, phi = 0.28, parts = [];
    parts.push(B(0.96, 0.1, 0.32, BLACK, cx, 0.05, cz), B(0.9, 0.02, 0.26, 0x8a1030, cx, 0.1, cz));
    const hy = 0.1, hz = cz - 0.16, lh = 0.32, ly = hy + (lh / 2) * Math.cos(phi), lz = hz - (lh / 2) * Math.sin(phi);
    parts.push(B(0.96, lh, 0.035, BLACK, cx, ly, lz, [-phi, 0, 0]), B(0.9, lh - 0.04, 0.01, 0x8a1030, cx, ly + 0.02 * Math.sin(phi), lz + 0.02 * Math.cos(phi), [-phi, 0, 0]));
    parts.push(B(0.06, 0.03, 0.02, CHROME, cx - 0.3, 0.07, cz + 0.165), B(0.06, 0.03, 0.02, CHROME, cx + 0.3, 0.07, cz + 0.165), B(0.2, 0.025, 0.03, 0x3a3a40, cx, 0.06, cz + 0.17));
    // coins and two notes on the plush
    const CO = [0xe8c040, 0xd8d8e0, 0xc87a3a, 0xe8c040, 0xd8d8e0];
    for (let k = 0; k < 16; k++) parts.push(C(0.018, 0.018, 0.006, CO[k % 5], cx - 0.36 + rnd() * 0.72, 0.114 + (k % 3) * 0.003, cz - 0.02 + rnd() * 0.13, 7));
    parts.push(B(0.12, 0.004, 0.065, 0x7ab0d8, cx + 0.22, 0.113, cz + 0.06, [0, 0.4, 0]), B(0.12, 0.004, 0.065, 0xe0a060, cx - 0.2, 0.113, cz + 0.07, [0, -0.3, 0]));
    vmesh(g, parts);
    // hand-painted cardboard (own little canvas, shared by all instances)
    if (!K.__sbSignMat) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d');
      x.fillStyle = '#c9a06a'; x.fillRect(0, 0, 256, 128);
      x.fillStyle = '#b48a55'; for (let i = 0; i < 9; i++) x.fillRect(0, 10 + i * 13, 256, 2);   // corrugation
      x.fillStyle = '#9a7040'; x.beginPath(); x.moveTo(0, 0); x.lineTo(20, 0); x.lineTo(0, 16); x.fill();   // torn corner
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const fit = (txt, px, maxW) => { let sz = px; do { x.font = 'bold ' + sz + 'px Impact, "Arial Black", sans-serif'; sz -= 1; } while (x.measureText(txt).width > maxW && sz > 8); };
      x.save(); x.translate(128, 44); x.rotate(-0.04); x.fillStyle = '#16161a'; fit('KÖLSCHE TÖN', 48, 232); x.fillText('KÖLSCHE TÖN', 0, 0); x.restore();
      x.save(); x.translate(128, 96); x.rotate(0.03); x.fillStyle = '#c1121f'; fit('· SPENDE ·', 38, 170); x.fillText('· SPENDE ·', -12, 0);
      x.beginPath(); const hx = 92, hy2 = -2; x.moveTo(hx, hy2 + 12); x.bezierCurveTo(hx - 18, hy2, hx - 10, hy2 - 14, hx, hy2 - 4); x.bezierCurveTo(hx + 10, hy2 - 14, hx + 18, hy2, hx, hy2 + 12); x.fill(); x.restore();
      const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipMapLinearFilter;
      K.__sbSignMat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
      K.__sbSignMatN = new THREE.MeshBasicMaterial({ map: tex, color: 0xffd9a8, side: THREE.DoubleSide }); // at night: in the lantern's warm light
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), night ? K.__sbSignMatN : K.__sbSignMat);
    const sph = 0.36; sign.position.set(cx + 0.01, 0.112 + 0.2 * Math.cos(sph), hz + 0.05 - 0.2 * Math.sin(sph)); sign.rotation.set(-sph, 0, 0.03); g.add(sign);
  }

  // ================= the band's Kölsch crate with three Stangen on it, two more glasses by the tuba
  {
    const parts = [], X = 2.24, Z = 0.3;
    parts.push(B(0.42, 0.3, 0.3, 0x1c3f95, X, 0.15, Z), B(0.36, 0.02, 0.24, 0x14306e, X, 0.3, Z));
    for (let k = 0; k < 6; k++) parts.push(C(0.028, 0.028, 0.03, 0x5a3a14, X - 0.13 + (k % 3) * 0.13, 0.31, Z - 0.06 + Math.floor(k / 3) * 0.12, 6));
    const st = (x, y, z) => [C(0.034, 0.03, 0.18, 0xf5b400, x, y + 0.09, z, 7), C(0.035, 0.035, 0.03, 0xffffff, x, y + 0.195, z, 7)];
    parts.push(...st(X + 0.12, 0.31, Z + 0.08), ...st(X - 0.14, 0.31, Z + 0.09), ...st(X - 0.01, 0.31, Z - 0.07), ...st(-2.28, 0, 0.42), ...st(-2.18, 0, 0.5));
    vmesh(g, parts);
  }
  // ================= the storm lantern on the pavement beside the case: at night it lights the sign and the coins
  {
    const lx = 0.6, lz = 0.8, parts = [];
    parts.push(C(0.075, 0.08, 0.02, BLACK, lx, 0.01, lz, 8), C(0.025, 0.075, 0.07, BLACK, lx, 0.235, lz, 8), TO(0.045, 0.006, BLACK, lx, 0.3, lz, [0, 0, 0], 3, 8));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; parts.push(L([lx + Math.cos(a) * 0.065, 0.02, lz + Math.sin(a) * 0.065], [lx + Math.cos(a) * 0.065, 0.2, lz + Math.sin(a) * 0.065], 0.006, 0.006, BLACK, 3)); }
    vmesh(g, parts);
    const glass = K.cyl(g, 0.05, 0.05, 0.17, 0, lx, 0.105, lz, 8);
    glass.material = night ? K.mat(0xffc45a, { glow: true }) : K.mat(0xf2e2a8);
    if (night) K.sphere(g, 0.17, 0xffc060, lx, 0.17, lz, 10, { glow: true, opacity: 0.2 }); // warm halo, resting on the ground
  }
  // ================= the band's Dackel, lying beside the case in a red-white neckerchief, guarding the coins;
  // the tail wags to the beat
  let tail = null;
  {
    const DX = -0.86, DZ = 0.8, FUR = 0x9a4a18, FUR_D = 0x5a2808, parts = [];
    const at = (x, y, z) => [DX + x, y, DZ + z];
    parts.push(C(0.058, 0.058, 0.26, FUR, ...at(0, 0.075, 0), 8, [0, 0, Math.PI / 2]));                 // long body
    parts.push(S(0.064, FUR, ...at(-0.13, 0.072, 0), 6), S(0.066, FUR, ...at(0.12, 0.085, 0), 6));       // haunch, chest
    for (const s of [-1, 1]) {
      parts.push(S(0.042, FUR, ...at(-0.12, 0.04, s * 0.052), 5, [1.35, 0.75, 0.6]));                    // folded hind legs
      parts.push(L(at(0.14, 0.026, s * 0.034), at(0.27, 0.02, s * 0.034), 0.018, 0.016, FUR, 5), S(0.021, FUR_D, ...at(0.275, 0.02, s * 0.034), 5, [1.3, 0.7, 1])); // front legs, paws
    }
    parts.push(L(at(0.13, 0.1, 0), at(0.19, 0.155, 0), 0.04, 0.034, FUR, 6));                            // neck
    parts.push(S(0.056, FUR, ...at(0.205, 0.168, 0), 6, [1.15, 0.92, 0.88]));                             // head
    parts.push(L(at(0.245, 0.158, 0), at(0.315, 0.148, 0), 0.03, 0.019, FUR, 6), S(0.015, BLACK, ...at(0.318, 0.149, 0), 5)); // snout, nose
    for (const s of [-1, 1]) {
      parts.push(S(0.042, FUR_D, ...at(0.19, 0.145, s * 0.052), 5, [0.75, 1.35, 0.32]));                 // floppy ears
      parts.push(B(0.016, 0.01, 0.006, BLACK, ...at(0.243, 0.183, s * 0.04)));                            // sleepy eyes
    }
    parts.push(TO(0.04, 0.012, RED, ...at(0.165, 0.128, 0), [0, Math.PI / 2, 0.75, 'ZYX'], 4, 10));     // neckerchief: knot round the neck
    parts.push({ geo: new THREE.ConeGeometry(0.05, 0.075, 3), c: RED, p: at(0.19, 0.075, 0), r: [Math.PI, 0, 0], s: [0.5, 1, 1.25] }, { geo: new THREE.ConeGeometry(0.03, 0.04, 3), c: WHITE, p: at(0.198, 0.06, 0), r: [Math.PI, 0, 0], s: [0.5, 1, 1.25] });
    vmesh(g, parts);
    tail = new THREE.Group(); tail.position.set(...at(-0.185, 0.095, 0)); g.add(tail);
    vmesh(tail, [L([0, 0, 0], [-0.13, 0.06, 0], 0.017, 0.006, FUR, 5)]);
  }

  // ================= animation: bob to the beat, drum sticks, bellows, the Dackel's tail;
  // a car roaring past gets a carnival "Tusch": trumpet up to the sky, a drum roll, everybody on their toes
  const _T = new V3(), _wp = new V3();
  let tusch = 0;
  const setSeg = (m, ax, ay, az, bx, by, bz) => { m.position.set(ax, ay, az); _T.set(bx - ax, by - ay, bz - az).normalize(); m.quaternion.setFromUnitVectors(UP, _T); };
  g.userData.tick = (t, dt, ctx) => {
    const b = ctx && ctx.beat;
    const bf = b && b.beat != null ? b.beat + (b.phase || 0) : t * 128 / 60, ph = bf - Math.floor(bf);
    const pulse = b && b.pulse != null ? b.pulse : 0.8 * Math.exp(-ph * 6), en = b && b.playing ? 0.7 + 0.5 * (b.energy || 0.5) : 0.8;
    // a car within 14 m (props never move once placed; matrixWorld is kept by the renderer)
    let near = false; const cs = ctx && ctx.cars;
    if (cs && cs.length) {
      _wp.setFromMatrixPosition(g.matrixWorld);
      for (let i = 0; i < cs.length && !near; i++) { const c = cs[i]; if (c) { const dx = c.x - _wp.x, dz = c.z - _wp.z; near = dx * dx + dz * dz < 196; } }
    }
    const step = Math.min(0.1, Math.max(0, dt || 0));
    tusch = near ? Math.min(1, tusch + step * 5) : Math.max(0, tusch - step * 0.8);
    for (let i = 0; i < band.length; i++) {
      const P = band[i]; if (!P.corners) continue;
      const sw = Math.sin(Math.PI * (bf + P.ph)) * 0.035 * en * (1 - 0.5 * tusch);
      let lean = 0;
      if (P.trumpet) lean = -0.07 * (0.5 + 0.5 * Math.sin(bf * Math.PI / 4)) * (1 - tusch) - 0.13 * tusch;
      P.p.rotation.z = sw; P.p.rotation.x = lean;
      P.p.position.y = liftFor(P) + 0.03 * pulse * en + 0.035 * tusch;
    }
    // sticks: right on the beat, left on the off-beat (|sin| is zero at the hit); a quick roll during the Tusch
    for (let k = 0; k < sticks.length; k++) {
      const S2 = sticks[k], v = Math.abs(Math.sin(Math.PI * (bf + (S2.sx > 0 ? 0 : 0.5)))), roll = Math.abs(Math.sin(t * 38 + (S2.sx > 0 ? 0 : 1.6)));
      S2.g.rotation.x = -0.8 * Math.pow(v, 0.7) * en * (1 - tusch) - 0.22 * roll * tusch;
    }
    tail.rotation.y = 0.55 * Math.sin(Math.PI * bf) * (0.6 + 0.4 * pulse);
    // bellows: open and close over two bars, the left hand rides along
    const off = 0.07 * Math.sin(bf * Math.PI / 4);
    bassEnd.position.x = off; bellows.scale.x = 0.27 + off;
    ik(1, 0.25 + off, bassArm.ay - 0.02, bassArm.az + 0.02, bassArm.hint);
    setSeg(bassArm.ua, _S.x, _S.y, _S.z, _E.x, _E.y, _E.z); setSeg(bassArm.fa, _E.x, _E.y, _E.z, _W.x, _W.y, _W.z);
  };
  g.userData.tick(0, 0, null);
  for (const P of band) P.corners = footCorners(P.p);
  g.userData.tick(0, 0, null);
});

// Junggesellinnenabschied in the Altstadt: five women in matching pink T-shirts ("TEAM BRAUT" on the chest).
// In the middle the bride-to-be with a white veil, a plastic tiara, a white tutu and the sash "BRAUT"; two friends
// hold the "TEAM BRAUT" banner over her head on two poles, one sells Schabau (Kölsch for schnapps) from a
// Bauchladen, everybody else holds a Kölsch Stange. Behind them the Bollerwagen with a crate and heart balloons.
// They sway, cheer with their glasses up in turns (everybody at once when the song drops), the banner wobbles.
Veedel.define('jga', { name: 'Junggesellinnenabschied', kind: 'strasse', since: 1995, w: 6, d: 2.2 }, (g, o, K) => {
  const night = K.theme().night;
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
  const PINK = 0xff4fa3, PINK_L = 0xff9ccc, WHITE = 0xf8f6f2, BLACK = 0x18181c, JEANS = 0x3a5a8a, GOLD = 0xe8b020, SILVER = 0xd0d4dc;

  // ---- merge helper: many small parts -> one vertex-coloured mesh (shared materials) ----
  const VM = K.__vcMatCache || (K.__vcMatCache = {});
  const vcMat = (double, glow) => { const k = (double ? 'd' : 's') + (glow ? 'g' : 'l'); if (!VM[k]) { const p = { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide }; VM[k] = glow ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial(p); } return VM[k]; };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3(), _c = new THREE.Color();
  function merge(parts) {
    let n = 0; const geos = [];
    for (const it of parts) {
      const geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.m) _m.copy(it.m);
      else {
        if (it.q) _q.copy(it.q); else { const r = it.r || [0, 0, 0]; _e.set(r[0], r[1], r[2], r[3] || 'XYZ'); _q.setFromEuler(_e); }
        _p.set(it.p[0], it.p[1], it.p[2]); _s.set(it.s ? it.s[0] : 1, it.s ? it.s[1] : 1, it.s ? it.s[2] : 1); _m.compose(_p, _q, _s);
      }
      geo.applyMatrix4(_m); geos.push([geo, it.c]); n += geo.attributes.position.count;
    }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
    for (const [geo, c] of geos) {
      const cnt = geo.attributes.position.count; pos.set(geo.attributes.position.array, off * 3); nor.set(geo.attributes.normal.array, off * 3);
      _c.set(c); for (let i = 0; i < cnt; i++) { col[(off + i) * 3] = _c.r; col[(off + i) * 3 + 1] = _c.g; col[(off + i) * 3 + 2] = _c.b; }
      off += cnt;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bg.computeBoundingSphere(); return bg;
  }
  const vmesh = (parent, parts, double, glow) => { const m = new THREE.Mesh(merge(parts), vcMat(double, glow)); parent.add(m); return m; };
  const B = (w, h, d, c, x, y, z, r, s) => ({ geo: new THREE.BoxGeometry(w, h, d), c, p: [x, y, z], r, s });
  const C = (rt, rb, h, c, x, y, z, seg, r, s, open) => ({ geo: new THREE.CylinderGeometry(rt, rb, h, seg || 8, 1, !!open), c, p: [x, y, z], r, s });
  const S = (rad, c, x, y, z, seg, s) => ({ geo: new THREE.SphereGeometry(rad, seg || 6, Math.max(3, Math.round((seg || 6) * 0.7))), c, p: [x, y, z], s });
  const L = (a, b, r0, r1, c, seg) => {
    const d = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    return { geo: new THREE.CylinderGeometry(r1, r0, len, seg || 6), c, p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], q: new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()) };
  };
  // a heart: two balls and a cone, facing +z (size = overall width)
  const heart = (sz, c, x, y, z, depth) => { const r = sz * 0.3, dz = depth || 0.35; return [
    S(r, c, x - r * 0.72, y + r * 0.35, z, 6, [1, 1, dz]), S(r, c, x + r * 0.72, y + r * 0.35, z, 6, [1, 1, dz]),
    { geo: new THREE.ConeGeometry(r * 1.62, r * 2.2, 4), c, p: [x, y - r * 0.8, z], r: [Math.PI, 0, 0], s: [1, 1, dz] }]; };

  // ---- people: K.person, the plain meshes baked into one, arms rebuilt as two-bone arms ----
  function compact(p) {
    const parts = [];
    for (const ch of p.children.slice()) {
      if (!ch.isMesh) continue;
      const mt = ch.material;
      if (mt.map || mt.transparent || mt.isMeshBasicMaterial) continue;
      const gt = ch.geometry.type, px = ch.position.x, py = ch.position.y, gp = ch.geometry.parameters;
      const arm = (gt === 'CylinderGeometry' && Math.abs(px) > 0.19 && py > 0.75 && py < 1.33 && gp.radiusBottom > 0.035) || (gt === 'SphereGeometry' && Math.abs(px) > 0.2 && py < 1.0 && gp.radius < 0.05);
      p.remove(ch);
      if (arm) continue;
      if (gt === 'SphereGeometry' && gp.widthSegments >= 12 && gp.phiLength < 3.2) { // long hair: rebuilt to fall down the back, face free
        const hc = mt.color.getHex();
        parts.push({ geo: new THREE.SphereGeometry(0.13, 8, 6, Math.PI, Math.PI, 0, Math.PI * 0.72), c: hc, p: [0, 1.645, -0.012] },
          { geo: new THREE.CylinderGeometry(0.125, 0.15, 0.3, 8, 1, false, Math.PI / 2, Math.PI), c: hc, p: [0, 1.47, -0.035], s: [1, 1, 0.8] });
        continue;
      }
      ch.updateMatrix(); parts.push({ geo: ch.geometry, c: mt.color.getHex(), m: ch.matrix.clone() });
    }
    return parts;
  }
  const A = 0.29, Bf = 0.26;
  const _S = new V3(), _W = new V3(), _D = new V3(), _P = new V3(), _E = new V3(), _T = new V3();
  function ik(sx, wx, wy, wz, hint) {
    _S.set(sx * 0.2, 1.36, 0); _W.set(wx, wy, wz); _D.subVectors(_W, _S);
    let d = _D.length(); d = Math.min(Math.max(d, 0.08), A + Bf - 0.002); _D.normalize();
    const x = (A * A - Bf * Bf + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A * A - x * x));
    _P.copy(hint).addScaledVector(_D, -hint.dot(_D)).normalize();
    _E.copy(_S).addScaledVector(_D, x).addScaledVector(_P, h);
    _W.copy(_S).addScaledVector(_D, d);
  }
  // an arm in a T-shirt: pink sleeve, bare arm; ua from the shoulder, fa (with hand) from the elbow
  function mkArm(p, sx, skin, shirt, rest, up, hint) {
    const mk = (parts) => { const m = new THREE.Mesh(merge(parts), vcMat(false, false)); p.add(m); return m; };
    const ua = mk([C(0.058, 0.064, 0.13, shirt, 0, 0.065, 0, 6), C(0.04, 0.046, A, skin, 0, A / 2, 0, 5), S(0.04, skin, 0, A, 0, 5)]);
    const fa = mk([C(0.031, 0.04, Bf, skin, 0, Bf / 2, 0, 5), S(0.04, skin, 0, Bf + 0.032, 0, 5, [0.8, 1.25, 0.55])]);
    return { ua, fa, sx, rest, up, hint: hint || new V3(sx * 0.8, -0.35, -0.45), held: null, hx: 0, hy: 0, hz: 0 };
  }
  const setSeg = (m, ax, ay, az, bx, by, bz) => { m.position.set(ax, ay, az); _T.set(bx - ax, by - ay, bz - az).normalize(); m.quaternion.setFromUnitVectors(UP, _T); };
  function poseArm(a, k) { // k = 0 rest .. 1 up
    const r = a.rest, u = a.up || a.rest;
    ik(a.sx, r[0] + (u[0] - r[0]) * k, r[1] + (u[1] - r[1]) * k, r[2] + (u[2] - r[2]) * k, a.hint);
    setSeg(a.ua, _S.x, _S.y, _S.z, _E.x, _E.y, _E.z); setSeg(a.fa, _E.x, _E.y, _E.z, _W.x, _W.y, _W.z);
    _T.subVectors(_W, _E).normalize(); a.hx = _W.x + _T.x * 0.04; a.hy = _W.y + _T.y * 0.04; a.hz = _W.z + _T.z * 0.04;
    if (a.held) a.held.position.set(a.hx, a.hy - 0.02, a.hz + 0.035);
  }
  const stange = (parent) => vmesh(parent, [C(0.029, 0.025, 0.16, 0xf5b400, 0, 0.02, 0, 7), C(0.03, 0.03, 0.03, 0xffffff, 0, 0.115, 0, 7)]);
  // pink cowboy hat / heart antennae / tiara, in person coordinates
  const cowboyHat = (c) => [C(0.25, 0.25, 0.022, c, 0, 1.745, 0, 12, [0.08, 0, 0], [1, 1, 0.85]), C(0.1, 0.122, 0.15, c, 0, 1.83, -0.005, 9),
    C(0.124, 0.124, 0.03, WHITE, 0, 1.775, -0.005, 9), B(0.05, 0.03, 0.17, PX_shade(c), 0, 1.9, -0.005)];
  function PX_shade(c) { _c.set(c).multiplyScalar(0.8); return _c.getHex(); }
  const antennaeBand = (c) => [{ geo: new THREE.TorusGeometry(0.125, 0.009, 3, 10, Math.PI), c, p: [0, 1.69, 0.0], r: [0, 0, 0] },
    L([-0.08, 1.78, 0.0], [-0.12, 1.96, 0.02], 0.006, 0.006, BLACK, 3), L([0.08, 1.78, 0.0], [0.12, 1.96, 0.02], 0.006, 0.006, BLACK, 3)];
  const women = [], blinkers = [];
  const tee = (p, txt) => { const t = K.text(p, txt, { fg: '#ffffff', bg: '#ff4fa3', w: 0.28, h: 0.095, x: 0, y: 1.24, z: 0.142, sizeK: 0.78 }); t.rotation.x = -0.1; return t; };
  function woman(opt, x, z, ry) {
    const p = K.person(Object.assign({ shirt: PINK, hairStyle: 'long', lips: true, smile: 1, hat: 'none' }, opt));
    K.put(g, p, x, 0, z, ry || 0);
    return p;
  }

  // ================= 1) far left: blonde, heart antennae that blink at night, hand on the hip, Kölsch up in her turn
  {
    const skin = 0xffdbac, p = woman({ h: 1.68, skin, hair: 0xe8c070, pants: JEANS, shoes: WHITE, eyes: '#3a6a9a' }, -2.3, 0.35, 0.15);
    const parts = compact(p); parts.push(...antennaeBand(BLACK));
    vmesh(p, parts); tee(p, 'TEAM BRAUT');
    const hearts = new THREE.Mesh(merge([...heart(0.11, 0, -0.12, 1.99, 0.02), ...heart(0.11, 0, 0.12, 1.99, 0.02)]), K.mat(0xff2050)); p.add(hearts); blinkers.push(hearts);
    const aR = mkArm(p, 1, skin, PINK, [0.23, 1.0, 0.2], [0.32, 1.93, 0.12]); aR.held = stange(p);
    const aL = mkArm(p, -1, skin, PINK, [-0.19, 0.96, 0.05], null, new V3(-1, 0.1, -0.2));
    women.push({ p, arms: [aR, aL], cheer: [0, -1], sway: true, H: 1.68 / 1.75, ph: 0 });
  }
  // ================= 2) banner holder left: pink cowboy hat, white jeans; inner hand holds the pole
  const poles = [];
  {
    const skin = 0xc68642, p = woman({ h: 1.72, skin, hair: 0x1a1a1a, pants: 0xf0f0f0, shoes: PINK_L, eyes: '#4a3020' }, -1.12, 0.25, 0);
    const parts = compact(p); parts.push(...cowboyHat(PINK_L));
    vmesh(p, parts); tee(p, 'TEAM BRAUT');
    const aP = mkArm(p, 1, skin, PINK, [0.24, 1.66, 0.2], null, new V3(1, -0.6, -0.2));
    const aO = mkArm(p, -1, skin, PINK, [-0.23, 1.0, 0.2], [-0.32, 1.93, 0.12]); aO.held = stange(p);
    const pole = vmesh(p, [C(0.016, 0.016, 1.45, 0x8a5a2a, 0, 0.2, 0, 6), S(0.03, WHITE, 0, 0.94, 0, 6)]);
    poles.push({ arm: aP, pole, p });
    women.push({ p, arms: [aP, aO], cheer: [-2, 3], sway: false, H: 1.72 / 1.75, ph: 0 });
  }
  // ================= 3) the bride: veil, tiara, sash "BRAUT", white tutu over white leggings, both arms up in her turn
  {
    const skin = 0xf1c27d, p = woman({ h: 1.66, skin, hair: 0x7a4a24, pants: 0xf4f4f4, shoes: WHITE, eyes: '#4a7a4a' }, 0, 0.42, 0);
    const parts = compact(p);
    parts.push(C(0.17, 0.33, 0.12, WHITE, 0, 0.86, 0, 12), C(0.16, 0.29, 0.1, 0xfff0f6, 0, 0.93, 0, 12)); // tutu, two layers
    parts.push({ geo: new THREE.TorusGeometry(0.118, 0.008, 3, 10, Math.PI), c: SILVER, p: [0, 1.7, 0.03], r: [-0.35, 0, 0] });
    for (let k = 0; k < 5; k++) { const a = 0.55 + k * 0.51; parts.push({ geo: new THREE.ConeGeometry(0.012, k === 2 ? 0.07 : 0.045, 4), c: k === 2 ? PINK : SILVER, p: [Math.cos(a) * 0.118, 1.7 + Math.sin(a) * 0.118 * Math.cos(0.35) + 0.03, 0.03 - Math.sin(a) * 0.118 * Math.sin(0.35)], r: [0, 0, a - Math.PI / 2] }); }
    vmesh(p, parts);
    // veil: a translucent half cone falling down the back, fixed at the tiara
    const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.27, 0.66, 12, 1, true, Math.PI / 2 + 0.25, Math.PI - 0.5), K.mat(0xffffff, { opacity: 0.72, double: true }));
    veil.position.set(0, 1.42, -0.03); veil.rotation.x = 0.08; p.add(veil);
    // sash from the right shoulder to the left hip
    const sash = K.text(p, 'BRAUT', { fg: '#e0147a', bg: '#ffffff', w: 0.5, h: 0.1, x: 0.0, y: 1.16, z: 0.152, sizeK: 0.78 }); sash.rotation.set(-0.06, 0, -0.98);
    const aR = mkArm(p, 1, skin, PINK, [0.23, 1.0, 0.2], [0.34, 1.92, 0.1]); aR.held = stange(p);
    const aL = mkArm(p, -1, skin, PINK, [-0.23, 0.98, 0.16], [-0.34, 1.92, 0.1]);
    women.push({ p, arms: [aR, aL], cheer: [1, 1], sway: true, H: 1.66 / 1.75, ph: 1.1 });
  }
  // ================= 4) banner holder right: denim skirt, black tights, heart antennae
  {
    const skin = 0xffdbac, p = woman({ h: 1.64, skin, hair: 0xb04a20, pants: BLACK, shoes: BLACK, dress: JEANS, eyes: '#3a7a5a' }, 1.12, 0.25, 0);
    const parts = compact(p); parts.push(...antennaeBand(BLACK));
    vmesh(p, parts); tee(p, 'TEAM BRAUT');
    const hearts = new THREE.Mesh(merge([...heart(0.11, 0, -0.12, 1.99, 0.02), ...heart(0.11, 0, 0.12, 1.99, 0.02)]), K.mat(0xff2050)); p.add(hearts); blinkers.push(hearts);
    const aP = mkArm(p, -1, skin, PINK, [-0.24, 1.66, 0.2], null, new V3(-1, -0.6, -0.2));
    const aO = mkArm(p, 1, skin, PINK, [0.23, 1.0, 0.2], [0.32, 1.93, 0.12]); aO.held = stange(p);
    const pole = vmesh(p, [C(0.016, 0.016, 1.45, 0x8a5a2a, 0, 0.2, 0, 6), S(0.03, WHITE, 0, 0.94, 0, 6)]);
    poles.push({ arm: aP, pole, p });
    women.push({ p, arms: [aP, aO], cheer: [-3, 4], sway: false, H: 1.64 / 1.75, ph: 0 });
  }
  // ================= 5) far right: the Bauchladen with Schabau bottles, pink cowboy hat, raises a Pinnchen
  {
    const skin = 0x8d5524, p = woman({ h: 1.7, skin, hair: 0x2a1a10, pants: BLACK, shoes: PINK_L, eyes: '#3a2414' }, 2.28, 0.32, -0.15);
    const parts = compact(p); parts.push(...cowboyHat(WHITE));
    // the tray on a strap round the neck
    const ty = 0.98, tz = 0.31;
    parts.push(B(0.54, 0.03, 0.32, 0xd8b078, 0, ty, tz), B(0.54, 0.1, 0.02, 0xb88a50, 0, ty + 0.04, tz + 0.16), B(0.02, 0.07, 0.32, 0xb88a50, -0.26, ty + 0.03, tz), B(0.02, 0.07, 0.32, 0xb88a50, 0.26, ty + 0.03, tz));
    for (const sx of [-1, 1]) parts.push(L([sx * 0.22, ty + 0.02, tz - 0.14], [sx * 0.08, 1.47, 0.02], 0.012, 0.012, PINK, 3));
    const BOT = [0x2f8a3a, 0x7a3a10, 0xc01020, 0xd8e0e8, 0x2f8a3a, 0xe8b020];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) {
      const bx = -0.19 + k * 0.095, bz = tz - 0.09 + r * 0.085, c = BOT[(k + r * 2) % 6];
      parts.push(C(0.019, 0.019, 0.065, c, bx, ty + 0.047, bz, 5), C(0.008, 0.013, 0.045, k % 2 ? GOLD : SILVER, bx, ty + 0.1, bz, 4));
    }
    vmesh(p, parts); tee(p, 'TEAM BRAUT');
    K.text(p, 'SCHABAU 2 DM', { fg: '#ffffff', bg: '#e0147a', w: 0.46, h: 0.08, x: 0, y: ty + 0.045, z: tz + 0.172, sizeK: 0.72 });
    const aL = mkArm(p, -1, skin, PINK, [-0.29, 1.02, 0.27], null, new V3(-1, -0.5, -0.3));
    const aR = mkArm(p, 1, skin, PINK, [0.29, 1.02, 0.27], [0.33, 1.9, 0.16], new V3(1, -0.4, -0.35));
    aR.held = vmesh(p, [C(0.017, 0.017, 0.06, 0x2f8a3a, 0, 0.0, 0, 5), C(0.008, 0.012, 0.03, 0x2f8a3a, 0, 0.045, 0, 4), C(0.009, 0.009, 0.012, GOLD, 0, 0.065, 0, 4)]);
    women.push({ p, arms: [aR, aL], cheer: [2, -1], sway: true, H: 1.7 / 1.75, ph: 2.3 });
  }

  // ================= the banner "TEAM BRAUT" between the two poles
  const BW = 1.62, BH = 0.42;
  const banner = K.text(g, 'TEAM BRAUT', { fg: '#ffffff', bg: '#e0147a', w: BW, h: BH, border: '#ffffff', glow: night, sizeK: 0.5 });
  const bannerBack = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), K.mat(0xe0147a)); bannerBack.rotation.y = Math.PI; banner.add(bannerBack); bannerBack.position.z = -0.005;

  // ================= Bollerwagen behind them: crate, a bag of Strüßjer, two heart balloons on strings
  // (kept within 0.6 m behind the origin: Altstadt house fronts can stand right there)
  let balloons;
  {
    const X = -1.85, Z = -0.28, parts = [];
    parts.push(B(0.9, 0.26, 0.5, 0x2d6a4f, X, 0.36, Z), B(0.84, 0.02, 0.44, 0x1f4a37, X, 0.24, Z));
    for (const wx of [-0.32, 0.32]) for (const wz of [-0.27, 0.27]) parts.push(C(0.12, 0.12, 0.05, BLACK, X + wx, 0.12, Z + wz, 10, [Math.PI / 2, 0, 0]), C(0.05, 0.05, 0.055, 0xc8c8c8, X + wx, 0.12, Z + wz, 6, [Math.PI / 2, 0, 0]));
    parts.push(L([X + 0.45, 0.3, Z], [X + 0.85, 0.55, Z + 0.05], 0.015, 0.015, BLACK, 4), B(0.04, 0.04, 0.22, BLACK, X + 0.86, 0.56, Z + 0.05));
    parts.push(B(0.4, 0.28, 0.3, 0xc1121f, X - 0.2, 0.63, Z), B(0.36, 0.02, 0.26, 0x8a0e18, X - 0.2, 0.77, Z));
    for (let k = 0; k < 6; k++) parts.push(C(0.026, 0.026, 0.07, 0x5a3a14, X - 0.32 + (k % 3) * 0.12, 0.8, Z - 0.06 + Math.floor(k / 3) * 0.12, 6));
    parts.push(B(0.22, 0.3, 0.14, 0xf0e0c0, X + 0.2, 0.64, Z + 0.05, [0, 0.2, 0.1]));                  // paper bag
    for (let k = 0; k < 5; k++) parts.push(S(0.05, [0xff3050, 0xffd400, 0xff8ad0, 0xffffff, 0xff3050][k], X + 0.15 + (k % 3) * 0.06, 0.82 + (k % 2) * 0.04, Z + 0.02 + (k % 2) * 0.05, 6)); // Strüßjer flowers
    // strings up to the balloons
    parts.push(L([X + 0.3, 0.5, Z - 0.2], [X + 0.15, 2.52, Z - 0.1], 0.004, 0.004, WHITE, 3), L([X + 0.3, 0.5, Z - 0.2], [X + 0.55, 2.3, Z - 0.2], 0.004, 0.004, WHITE, 3));
    vmesh(g, parts);
    balloons = new THREE.Group(); balloons.position.set(0, 0, 0); g.add(balloons);
    // LED heart balloons: they light up at night
    vmesh(balloons, [...heart(0.42, PINK, X + 0.15, 2.72, Z - 0.1, 0.3), ...heart(0.36, night ? 0xffd0ec : SILVER, X + 0.55, 2.47, Z - 0.2, 0.3)], false, night);
  }

  // ================= the party speaker on the pavement: LED rings pump with the beat (they glow at night)
  const leds = [];
  {
    const SX = 2.74, SZ = 0.66, RY = -0.35, spk = new THREE.Group(); spk.position.set(SX, 0, SZ); spk.rotation.y = RY; g.add(spk);
    const parts = [B(0.36, 0.18, 0.13, 0x24242a, 0, 0.11, 0), B(0.34, 0.012, 0.11, 0x3a3a44, 0, 0.206, 0)];
    for (const fx of [-0.12, 0.12]) parts.push(B(0.05, 0.02, 0.1, 0x111114, fx, 0.01, 0));             // rubber feet
    parts.push(L([-0.13, 0.2, 0], [-0.1, 0.27, 0], 0.01, 0.01, 0x111114, 4), L([0.13, 0.2, 0], [0.1, 0.27, 0], 0.01, 0.01, 0x111114, 4), L([-0.1, 0.27, 0], [0.1, 0.27, 0], 0.012, 0.012, 0x111114, 4)); // handle
    for (const fx of [-0.085, 0.085]) parts.push(C(0.055, 0.055, 0.012, 0x0c0c10, fx, 0.11, 0.066, 12, [Math.PI / 2, 0, 0]), C(0.02, 0.02, 0.016, 0x4a4a54, fx, 0.11, 0.068, 8, [Math.PI / 2, 0, 0]));
    vmesh(spk, parts);
    const ringMat = night ? K.mat(0xff3fa6, { glow: true }) : K.mat(0xff3fa6);
    for (const fx of [-0.085, 0.085]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 4, 16), ringMat); r.position.set(fx, 0.11, 0.074); spk.add(r); leds.push(r); }
  }

  // ================= animation
  const _R = new THREE.Matrix4();
  function footCorners(p) {
    const px = p.position.clone(), rot = p.rotation.clone(); p.position.set(0, 0, 0); p.rotation.set(0, 0, 0); p.updateMatrixWorld(true);
    const u = new THREE.Box3(), bx = new THREE.Box3();
    p.traverse((m) => { if (m.isMesh) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bx.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); u.union(bx); } });
    p.position.copy(px); p.rotation.copy(rot); p.updateMatrixWorld(true);
    const x0 = u.min.x - 0.08, x1 = u.max.x + 0.08, z0 = u.min.z - 0.08, z1 = u.max.z + 0.08;
    return [new V3(x0, u.min.y, z0), new V3(x1, u.min.y, z0), new V3(x0, u.min.y, z1), new V3(x1, u.min.y, z1)];
  }
  const liftFor = (W) => { _R.makeRotationFromEuler(W.p.rotation); const e = _R.elements; let mn = 0; for (let i = 0; i < W.corners.length; i++) { const c = W.corners[i], y = e[1] * c.x + e[5] * c.y + e[9] * c.z; if (y < mn) mn = y; } return -mn + 0.002; };
  const glowHeart = K.mat(0xff2a6a, { glow: true }), litHeart = K.mat(0xff2050);
  const cheerK = (bf, slot) => { // 8-beat cycle, five cheer slots in turn; smooth up and down
    if (slot < 0) return 0;
    let u = ((bf % 8) + 8) % 8 - slot * 1.55; if (u < 0) u += 8; u /= 2.2;
    return u < 1 ? Math.pow(Math.sin(Math.PI * u), 0.6) : 0;
  };
  const pt0 = new V3(), pt1 = new V3(), _wp = new V3();
  let hype = 0; // a racer roaring past within 14 m: everybody cheers at once
  g.userData.tick = (t, dt, ctx) => {
    const b = ctx && ctx.beat;
    const bf = b && b.beat != null ? b.beat + (b.phase || 0) : t * 128 / 60, ph = bf - Math.floor(bf);
    const pulse = b && b.pulse != null ? b.pulse : 0.8 * Math.exp(-ph * 6);
    const drop = !!(b && b.playing && b.section === 'drop');
    let near = false; const cs = ctx && ctx.cars;
    if (cs && cs.length) { // props never move once placed; matrixWorld is kept by the renderer
      _wp.setFromMatrixPosition(g.matrixWorld);
      for (let i = 0; i < cs.length && !near; i++) { const c = cs[i]; if (c) { const dx = c.x - _wp.x, dz = c.z - _wp.z; near = dx * dx + dz * dz < 196; } }
    }
    const step = Math.min(0.1, Math.max(0, dt || 0));
    hype = near ? Math.min(1, hype + step * 4) : Math.max(0, hype - step * 0.9);
    for (let i = 0; i < women.length; i++) {
      const W = women[i];
      for (let k = 0; k < W.arms.length; k++) { const a = W.arms[k]; if (a.up) poseArm(a, drop ? 1 : Math.max(cheerK(bf, W.cheer[k]), hype)); else if (!a.posed) { poseArm(a, 0); a.posed = true; } }
      if (!W.corners) continue;
      if (W.sway) W.p.rotation.z = 0.06 * Math.sin(Math.PI * bf / 2 + W.ph);
      W.p.position.y = (W.sway ? liftFor(W) : 0) + 0.025 * pulse;
    }
    // poles pump alternately, the banner follows their tops
    for (let k = 0; k < poles.length; k++) {
      const P = poles[k], a = P.arm, lift = 0.07 * Math.sin(Math.PI * bf / 2 + k * Math.PI);
      ik(a.sx, a.rest[0], a.rest[1] + lift, a.rest[2], a.hint);
      setSeg(a.ua, _S.x, _S.y, _S.z, _E.x, _E.y, _E.z); setSeg(a.fa, _E.x, _E.y, _E.z, _W.x, _W.y, _W.z);
      P.pole.position.set(_W.x, _W.y + 0.02, _W.z + 0.03);
    }
    const p0 = poles[0], p1 = poles[1];
    pt0.set(p0.pole.position.x, p0.pole.position.y + 0.72, p0.pole.position.z).multiplyScalar(p0.p.scale.x).add(p0.p.position);
    pt1.set(p1.pole.position.x, p1.pole.position.y + 0.72, p1.pole.position.z).multiplyScalar(p1.p.scale.x).add(p1.p.position);
    const dx = pt1.x - pt0.x, dy = pt1.y - pt0.y;
    banner.position.set((pt0.x + pt1.x) / 2, (pt0.y + pt1.y) / 2 - BH / 2 + 0.06, (pt0.z + pt1.z) / 2 + 0.02);
    banner.rotation.z = Math.atan2(dy, dx); banner.scale.x = Math.sqrt(dx * dx + dy * dy) / BW;
    // heart antennae blink at night, the balloons bob in the breeze
    const on = night && Math.floor(bf) % 2 === 0;
    for (let k = 0; k < blinkers.length; k++) blinkers[k].material = on ? glowHeart : litHeart;
    balloons.position.y = 0.025 * Math.sin(t * 1.3);
    const ls = 1 + 0.4 * pulse; // the speaker's LED rings pump with the kick
    for (let k = 0; k < leds.length; k++) leds[k].scale.set(ls, ls, 1);
  };
  g.userData.tick(0, 0, null);
  for (const W of women) W.corners = footCorners(W.p);
  g.userData.tick(0, 0, null);
});

// Rievkoochebud: a wooden market hut with a red-and-white striped awning and a big roof sign
// "RIEVKOOCHE · 3 STÖCK". Behind the counter the vendor (white cap, red apron) flips potato fritters on a
// huge black pan, steam puffs rise from the fat and the stovepipe smokes. On the counter: the paper tray with
// fresh Rievkooche, jars of apple sauce and one of dark beet syrup. Waiting in front: an Oma with her handbag
// and a Dackel on a red leash who stares at the pan wagging his tail, and a Jeck with a clown nose, a red-and-white
// top hat and a Kölsch whose tie was snipped off at Weiberfastnacht. A Domtaube pecks at a dropped crumb, a red
// gas bottle feeds the burner and a chalk board asks "JECK OP RIEVKOOCHE?". At night the lantern, the fairy
// lights and the sign glow and the stall throws a warm pool of light onto the pavement.
// Kept under 4.5 m in every animation phase (smoke included), so the game files it as a sidewalk scene.
Veedel.define('rievkoochebud', { name: 'Rievkoochebud', kind: 'strasse', w: 4, d: 2.6 }, (g, o, K) => {
  const night = K.theme().night;
  const RED = 0xc1121f, WHITE = 0xf6f2ea, WOOD = 0x9a6436, WOOD_D = 0x6a4020, WOOD_DD = 0x4a2c14, ROOF = 0x7a2418;
  const FRIT = 0xc98a2a, FRIT_D = 0x8a5418, BLACK = 0x1a1a1a, STEEL = 0xb8b8c0;

  // ---- bake: every mesh under a (not yet placed) group becomes one mesh per material ----
  function bake(src, dst) {
    src.updateMatrixWorld(true);
    const byMat = new Map();
    src.traverse((m) => {
      if (!m.isMesh) return;
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      geo.applyMatrix4(m.matrixWorld);
      if (!byMat.has(m.material)) byMat.set(m.material, []);
      byMat.get(m.material).push(geo);
    });
    byMat.forEach((list, material) => {
      let n = 0; for (const q of list) n += q.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let off = 0;
      for (const q of list) {
        pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3);
        if (q.attributes.uv) uv.set(q.attributes.uv.array, off * 2);
        off += q.attributes.position.count;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere(); const m = new THREE.Mesh(geo, material); m.renderOrder = material.transparent ? 1 : 0; dst.add(m);
    });
  }
  const S = new THREE.Group(); // everything static is built here, then baked into g
  const rot = (m, rx, ry, rz) => { m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const rod = (grp, a, b, r, c, seg) => { _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); const len = _a.distanceTo(_b); const m = K.cyl(grp, r, r, len, c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, seg || 5); m.quaternion.setFromUnitVectors(_up, _b.sub(_a).normalize()); return m; };

  // ================= the hut =================
  const FL = 0.12, TOP = 0.96, EAVE = 2.45, RIDGE = 3.0, ZR = -0.55, ZF = 0.15, ZB = -1.25;
  K.box(S, 2.6, FL, 1.4, WOOD_DD, 0, FL / 2, -0.55);                                   // plank floor
  K.box(S, 2.6, EAVE, 0.08, WOOD, 0, EAVE / 2, ZB + 0.04);                             // back wall
  for (const sx of [-1, 1]) K.box(S, 0.08, EAVE, 1.4, WOOD, sx * 1.26, EAVE / 2, -0.55); // side walls
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) K.box(S, 0.012, EAVE - 0.1, 0.03, WOOD_D, sx * 1.305, EAVE / 2, -1.1 + k * 0.36); // plank joints
  for (let k = 0; k < 5; k++) K.box(S, 0.03, EAVE - 0.1, 0.012, WOOD_D, -1.04 + k * 0.52, EAVE / 2, ZB - 0.006);       // and on the back
  for (const sx of [-1, 1]) K.box(S, 0.1, EAVE, 0.1, WOOD_D, sx * 1.27, EAVE / 2, ZF - 0.03); // corner posts
  // counter: front panel with plank lines, a thick top
  K.box(S, 2.44, TOP - 0.03, 0.08, WOOD, 0, (TOP - 0.03) / 2, ZF - 0.04);
  for (const y of [0.24, 0.48, 0.72]) K.box(S, 2.44, 0.02, 0.01, WOOD_D, 0, y, ZF + 0.005);
  K.box(S, 2.7, 0.06, 0.58, WOOD_D, 0, TOP - 0.03, -0.11);
  // fascia board over the opening
  K.box(S, 2.6, 0.42, 0.08, WOOD_D, 0, EAVE - 0.21, ZF - 0.04);
  // gables (triangles) and the two roof slabs, a light ridge cap
  const gab = new THREE.Shape(); gab.moveTo(ZF, EAVE); gab.lineTo(ZR, RIDGE - 0.02); gab.lineTo(ZB, EAVE); gab.closePath();
  const gabGeo = new THREE.ExtrudeGeometry(gab, { depth: 0.08, bevelEnabled: false });
  for (const sx of [-1, 1]) { const m = K.part(S, gabGeo, WOOD, sx > 0 ? 1.3 : -1.22, 0, 0); m.rotation.y = -Math.PI / 2; }
  const slope = Math.atan2(RIDGE - EAVE, ZF - ZR), slab = Math.hypot(RIDGE - EAVE, ZF - ZR) + 0.06;
  rot(K.box(S, 2.9, 0.06, slab, ROOF, 0, (EAVE + RIDGE) / 2 + 0.03, (ZF + ZR) / 2 + 0.01), slope);
  rot(K.box(S, 2.9, 0.06, slab - 0.04, ROOF, 0, (EAVE + RIDGE) / 2 + 0.03, (ZB + ZR) / 2 + 0.01), -slope);
  K.box(S, 2.94, 0.08, 0.12, WHITE, 0, RIDGE + 0.05, ZR);
  // roof sign on two posts, backed by a board
  for (const sx of [-1, 1]) K.box(S, 0.07, 0.42, 0.07, WOOD_DD, sx * 1.0, RIDGE + 0.2, ZR - 0.04);
  K.box(S, 3.3, 0.7, 0.05, WOOD_DD, 0, RIDGE + 0.62, ZR - 0.05);
  K.text(S, 'RIEVKOOCHE · 3 STÖCK', { fg: '#ffffff', bg: '#c1121f', border: '#ffd400', w: 3.2, h: 0.62, x: 0, y: RIDGE + 0.62, z: ZR - 0.02, glow: night, sizeK: 0.62 });
  // stovepipe behind the sign
  const SPX = 1.05, SPZ = -1.0, SPY = 3.62;
  K.cyl(S, 0.06, 0.06, 0.95, 0x3a3a3e, SPX, 2.62 + 0.475, SPZ, 7);
  K.cone(S, 0.12, 0.1, 0x3a3a3e, SPX, SPY, SPZ, 7);
  // the striped awning: ten stripes, scalloped valance, two struts, fairy lights along the edge
  const AZ0 = ZF + 0.02, AY0 = EAVE, AZ1 = 0.95, AY1 = 2.2;
  const aw = Math.atan2(AY0 - AY1, AZ1 - AZ0), al = Math.hypot(AY0 - AY1, AZ1 - AZ0);
  const scal = new THREE.CircleGeometry(0.145, 6, Math.PI, Math.PI);
  for (let i = 0; i < 10; i++) {
    const x = -1.305 + i * 0.29, c = i % 2 ? WHITE : RED;
    rot(K.box(S, 0.29, 0.025, al, c, x, (AY0 + AY1) / 2, (AZ0 + AZ1) / 2), aw);
    K.part(S, scal, c, x, AY1 - 0.01, AZ1 + 0.01, { double: true });
  }
  for (const sx of [-1, 1]) { // struts bolted to the corner posts (a little bracket on the post's outer face)
    K.box(S, 0.03, 0.08, 0.07, BLACK, sx * 1.335, 1.9, ZF - 0.03);
    rod(S, [sx * 1.335, 1.9, ZF - 0.03], [sx * 1.4, AY1 + 0.02, AZ1 - 0.05], 0.018, BLACK);
  }
  // a bulb clipped to the tip of every scallop (red, warm white, yellow), so none hangs in the air
  const BULB = [0xfff2c0, 0xff4040, 0xffd400];
  for (let i = 0; i < 10; i++) K.sphere(S, 0.04, BULB[i % 3], -1.305 + i * 0.29, AY1 - 0.175, AZ1 + 0.012, 5, night ? { glow: true } : null);
  // a proper lantern on a bracket at the right front post (lit at night, with a soft halo)
  const LX = 1.62, LY = 1.92, LZ = 0.1;
  rod(S, [1.31, LY + 0.32, LZ], [LX, LY + 0.32, LZ], 0.018, BLACK);
  rod(S, [1.31, LY + 0.1, LZ], [LX - 0.08, LY + 0.3, LZ], 0.012, BLACK);
  K.box(S, 0.014, 0.08, 0.014, BLACK, LX, LY + 0.28, LZ);
  K.cone(S, 0.18, 0.14, BLACK, LX, LY + 0.2, LZ, 4).rotation.y = Math.PI / 4;
  K.box(S, 0.2, 0.28, 0.2, night ? 0xffc860 : 0xf0e2b0, LX, LY, LZ, night ? { glow: true } : null);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(S, 0.025, 0.3, 0.025, BLACK, LX + sx * 0.1, LY, LZ + sz * 0.1);
  K.box(S, 0.24, 0.035, 0.24, BLACK, LX, LY - 0.155, LZ);
  if (night) {
    K.sphere(S, 0.21, 0xffc060, LX, LY, LZ, 8, { glow: true, opacity: 0.2 });                       // halo, soft falloff
    K.sphere(S, 0.32, 0xffb050, LX, LY, LZ, 8, { glow: true, opacity: 0.09 });
    const pool = K.part(S, new THREE.CircleGeometry(1, 20), 0xffb050, 0.1, 0.012, 0.62, { glow: true, opacity: 0.12 });
    pool.rotation.x = -Math.PI / 2; pool.scale.set(1.75, 0.62, 1);                                   // warm light on the pavement
  }
  // inside: warm back wall at night, a ceiling bulb, potato sack
  if (night) K.box(S, 2.4, 1.3, 0.01, 0xd8a868, 0, 1.75, ZB + 0.085, { glow: true });
  K.box(S, 0.012, 0.25, 0.012, BLACK, 0, EAVE - 0.12, -0.5);
  K.sphere(S, 0.06, night ? 0xfff0c0 : 0xf0f0e0, 0, EAVE - 0.28, -0.5, 6, night ? { glow: true } : null);
  K.cyl(S, 0.2, 0.24, 0.5, 0xb09060, -0.95, FL + 0.25, -0.95, 7);
  for (let k = 0; k < 4; k++) K.sphere(S, 0.07, 0xc8a060, -0.95 + (k % 2 - 0.5) * 0.12, FL + 0.53, -0.95 + (k - 1.5) * 0.06, 5);
  K.text(S, 'KARTOFFELN', { fg: '#3a2a10', bg: '#d8c090', w: 0.36, h: 0.1, x: -0.95, y: FL + 0.3, z: -0.72, sizeK: 0.7 });
  // outside, right: the red gas bottle that feeds the burner, its hose into the hut
  K.cyl(S, 0.12, 0.12, 0.04, 0x6a6a70, 1.52, 0.02, -0.85, 10);
  K.cyl(S, 0.15, 0.15, 0.46, RED, 1.52, 0.27, -0.85, 10);
  K.cyl(S, 0.08, 0.15, 0.1, RED, 1.52, 0.55, -0.85, 10);
  K.cyl(S, 0.035, 0.035, 0.08, 0x8a8a90, 1.52, 0.64, -0.85, 6);
  rod(S, [1.52, 0.68, -0.85], [1.31, 0.86, -0.7], 0.014, BLACK);
  // outside, left: a chalk board (A-frame) for the passers-by
  const AF = new THREE.Group(); AF.position.set(-1.62, 0, 0.0); AF.rotation.y = 0.4; S.add(AF);
  for (const s of [1, -1]) {
    const b = new THREE.Group(); b.position.set(0, 0.378, s * 0.07); b.rotation.x = -s * 0.19; AF.add(b);
    K.box(b, 0.54, 0.76, 0.03, WOOD_D, 0, 0, 0);
    if (s > 0) {
      K.box(b, 0.46, 0.64, 0.01, 0x22302a, 0, 0, 0.016);
      K.text(b, 'JECK OP', { fg: '#f4f4ec', bg: '#22302a', w: 0.42, h: 0.15, x: 0, y: 0.17, z: 0.023, sizeK: 0.62 });
      K.text(b, 'RIEVKOOCHE?', { fg: '#ffd400', bg: '#22302a', w: 0.44, h: 0.13, x: 0, y: 0.01, z: 0.023, sizeK: 0.62 });
      K.cyl(b, 0.07, 0.07, 0.012, FRIT, -0.08, -0.17, 0.024, 8).rotation.x = Math.PI / 2;               // a chalk fritter
      K.cyl(b, 0.05, 0.05, 0.012, 0xefd98a, 0.1, -0.19, 0.024, 8).rotation.x = Math.PI / 2;             // and its apple sauce
    }
  }

  // ================= on the counter =================
  const PX = -0.35, PZ = -0.12, PY = TOP + 0.05;                    // pan centre, top of the fat
  K.box(S, 0.62, 0.02, 0.5, 0x2a2a2a, PX, TOP + 0.01, PZ);          // burner plate
  K.cyl(S, 0.27, 0.25, 0.05, BLACK, PX, TOP + 0.045, PZ, 14);       // the big pan
  K.cyl(S, 0.24, 0.24, 0.01, 0x8a6a20, PX, PY, PZ, 14);             // hot fat
  rod(S, [PX - 0.26, TOP + 0.06, PZ], [PX - 0.5, TOP + 0.08, PZ], 0.02, BLACK);
  const FR = [[-0.12, 0.08], [0.1, 0.1], [0.14, -0.06], [-0.06, -0.12], [-0.15, -0.02]];
  for (const [dx, dz] of FR) K.cyl(S, 0.07, 0.07, 0.022, FRIT, PX + dx, PY + 0.012, PZ + dz, 8);
  // batter bowl with ladle
  K.cyl(S, 0.14, 0.09, 0.12, 0xe8e8e0, -1.0, TOP + 0.06, -0.15, 9);
  K.cyl(S, 0.125, 0.125, 0.01, 0xe8d8a0, -1.0, TOP + 0.11, -0.15, 9);
  rod(S, [-1.0, TOP + 0.1, -0.15], [-0.92, TOP + 0.32, -0.25], 0.012, STEEL);
  // paper tray with fresh Rievkooche, a stack of paper plates
  K.box(S, 0.34, 0.03, 0.22, WHITE, 0.2, TOP + 0.015, 0.0);
  for (let k = 0; k < 3; k++) K.cyl(S, 0.07, 0.07, 0.022, k === 1 ? FRIT_D : FRIT, 0.11 + k * 0.09, TOP + 0.045 + (k === 1 ? 0.015 : 0), 0.0, 8);
  K.cyl(S, 0.11, 0.1, 0.1, WHITE, 1.05, TOP + 0.05, -0.25, 9);
  // jars of apple sauce (and one of dark beet syrup)
  const JAR = [[0.55, 0.02, 0xefd98a], [0.7, -0.1, 0xefd98a], [0.84, 0.03, 0xefd98a], [0.98, -0.08, 0x3a1a0a]];
  for (const [x, z, c] of JAR) { K.cyl(S, 0.055, 0.055, 0.13, c, x, TOP + 0.065, z, 8); K.cyl(S, 0.06, 0.06, 0.03, c === 0x3a1a0a ? 0xffd400 : RED, x, TOP + 0.145, z, 8); }
  K.text(S, 'MIT APFELMUS · RÜBENKRAUT', { fg: '#1c3f95', bg: '#fff6d8', border: '#c1121f', w: 1.9, h: 0.3, x: 0, y: 0.6, z: ZF + 0.012, glow: night, sizeK: 0.6 });

  // ================= people =================
  // the vendor: white cap, white shirt, red apron with a bib; his right forearm and the spatula move
  const vend = K.person({ h: 1.78, shirt: 0xf4f4f0, pants: 0x2a2a34, apron: RED, hat: 'cap', hatColor: 0xf4f4f0, heavy: true, moustache: 0x3a2a1a, skin: 0xf1c27d, hair: 0x3a2a1a, smile: 1, koelsch: true });
  const VX = PX - 0.264, VZ = -0.72, VS = 1.78 / 1.75;
  K.put(S, vend, VX, FL, VZ);
  K.box(vend, 0.22, 0.3, 0.012, RED, 0, 1.1, 0.13 * 1.18 + 0.01);             // apron bib
  for (const c of vend.children.slice()) if (c.isMesh && Math.abs(c.position.x - 0.27) < 0.006 && Math.abs(c.position.z - 0.19) < 0.006) vend.remove(c); // no Kölsch while frying
  const vLive = new THREE.Group(); vLive.position.set(VX, FL, VZ); vLive.scale.setScalar(VS); g.add(vLive);
  const regroup = (pp, px, py, pz, test) => {
    const pv = new THREE.Group(); pv.position.set(px, py, pz);
    for (const c of pp.children.slice()) if (c.isMesh && test(c.position)) { pp.remove(c); c.position.x -= px; c.position.y -= py; c.position.z -= pz; pv.add(c); }
    vLive.add(pv); return pv;
  };
  const fore = regroup(vend, 0.25, 1.06, 0.05, (p) => p.x > 0.2 && p.y > 0.8 && p.y < 1.05);
  const head = regroup(vend, 0, 1.58, 0, (p) => p.y >= 1.56 && Math.abs(p.x) < 0.2);
  // spatula in his hand: wooden handle, steel blade over the pan
  K.box(fore, 0.03, 0.03, 0.24, WOOD_DD, 0.01, -0.17, 0.23);
  K.box(fore, 0.12, 0.008, 0.13, STEEL, 0.01, -0.175, 0.41);
  // the fritter being flipped: golden side and fried side
  const flip = new THREE.Group(); flip.position.set(PX, PY + 0.013, -0.2); g.add(flip);
  K.cyl(flip, 0.07, 0.07, 0.012, FRIT, 0, 0.006, 0, 8); K.cyl(flip, 0.07, 0.07, 0.012, FRIT_D, 0, -0.006, 0, 8);

  // Oma with handbag and glasses, her Dackel on a red leash
  const oma = K.person({ h: 1.62, shirt: 0x6a3a6a, dress: 0x3a4a6a, pants: 0xe0c8b0, shoes: 0x3a2a1a, skin: 0xffdbac, hair: 0xd8d8d8, hairStyle: 'sides', bag: 0x5a2a1a, glasses: true, age: 1, smile: 0.8, scarf: 0xe0a0b0 });
  K.put(S, oma, -1.02, 0, 0.7, 1.95);
  const dog = new THREE.Group(); dog.position.set(-1.5, 0, 0.98); dog.rotation.y = 2.0; S.add(dog);
  const DOG = 0x7a3a14, DOG_D = 0x4a200a;
  K.box(dog, 0.13, 0.11, 0.42, DOG, 0, 0.145, 0);                                                     // long Dackel body, short legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(dog, 0.035, 0.09, 0.04, DOG_D, sx * 0.045, 0.045, sz * 0.15);
  K.box(dog, 0.1, 0.1, 0.12, DOG, 0, 0.25, 0.22); K.box(dog, 0.07, 0.06, 0.1, DOG, 0, 0.23, 0.32); K.box(dog, 0.03, 0.025, 0.02, BLACK, 0, 0.25, 0.375);
  for (const sx of [-1, 1]) K.box(dog, 0.02, 0.1, 0.06, DOG_D, sx * 0.058, 0.22, 0.2);
  K.box(dog, 0.12, 0.03, 0.03, RED, 0, 0.21, 0.17);
  S.updateMatrixWorld(true);
  const tail = new THREE.Group(); tail.position.copy(dog.localToWorld(new THREE.Vector3(0, 0.18, -0.2))); tail.rotation.y = dog.rotation.y; g.add(tail);
  const tailM = K.box(tail, 0.03, 0.03, 0.2, DOG_D, 0, 0.05, -0.08); tailM.rotation.x = 0.65;          // tail up
  // leash from her right hand to the collar
  S.updateMatrixWorld(true);
  const hand = oma.localToWorld(new THREE.Vector3(0.24, 0.76, 0.06)), collar = dog.localToWorld(new THREE.Vector3(0, 0.21, 0.17));
  rod(S, [hand.x, hand.y, hand.z], [collar.x, collar.y, collar.z], 0.008, RED, 4);

  // the Jeck: grey suit, snipped tie (Weiberfastnacht!), clown nose, a Kölsch in his hand
  const jeck = K.person({ h: 1.8, shirt: 0x6a6a74, pants: 0x5a5a64, suit: true, tie: 0xffd400, hat: 'none', skin: 0xe0ac69, hair: 0x2a1a0a, koelsch: true, smile: 1 });
  K.cyl(jeck, 0.2, 0.2, 0.02, RED, 0, 1.745, 0, 10); K.cyl(jeck, 0.115, 0.125, 0.22, RED, 0, 1.86, 0, 10);        // red-and-white carnival top hat
  K.cyl(jeck, 0.127, 0.127, 0.05, WHITE, 0, 1.785, 0, 10); K.sphere(jeck, 0.04, 0xffd400, 0.1, 1.82, 0.07, 5);    // band and a Strüßje
  for (const c of jeck.children) if (c.isMesh && Math.abs(c.position.x) < 0.001 && Math.abs(c.position.y - 1.16) < 0.005) { c.scale.y = 0.35; c.position.y = 1.255; } // half a tie left
  K.sphere(jeck, 0.03, 0xff1a1a, 0, 1.635, 0.125, 6);                                                              // clown nose
  K.put(S, jeck, 1.0, 0, 0.85, -1.25);

  // a Domtaube at their feet, pecking at a crumb that fell off the tray
  const PGX = 0.22, PGZ = 1.0, PGR = -0.5, PIG = 0x8a8c9c, PIG_D = 0x5c5e6c;
  const pigS = new THREE.Group(); pigS.position.set(PGX, 0, PGZ); pigS.rotation.y = PGR; S.add(pigS);
  for (const sx of [-1, 1]) { K.box(pigS, 0.014, 0.07, 0.014, 0xd86a7a, sx * 0.03, 0.035, 0.0); K.box(pigS, 0.03, 0.008, 0.05, 0xd86a7a, sx * 0.03, 0.004, 0.015); }
  K.box(pigS, 0.045, 0.012, 0.035, FRIT, 0, 0.006, 0.2); K.box(pigS, 0.02, 0.01, 0.02, FRIT_D, 0.05, 0.005, 0.24);   // the crumb
  const pig = new THREE.Group(); pig.position.set(PGX, 0.07, PGZ); pig.rotation.y = PGR; g.add(pig);
  const pigBody = new THREE.Group(); pig.add(pigBody);                                                              // pivots at the hips
  const PB = new THREE.Group();
  K.sphere(PB, 0.075, PIG, 0, 0.065, 0.0, 7).scale.set(1, 0.95, 1.6);
  rot(K.box(PB, 0.08, 0.02, 0.13, PIG_D, 0, 0.07, -0.16), -0.25);                                                  // tail
  for (const sx of [-1, 1]) rot(K.box(PB, 0.02, 0.06, 0.15, PIG_D, sx * 0.07, 0.075, -0.03), 0.1);                // folded wings
  bake(PB, pigBody);
  const pigHead = new THREE.Group(); pigHead.position.set(0, 0.1, 0.08); pigBody.add(pigHead);                     // pivots at the neck
  const PH = new THREE.Group();
  K.sphere(PH, 0.045, 0x5a8a7a, 0, 0.02, 0.0, 6);                                                                   // shimmering neck
  K.sphere(PH, 0.038, 0x7a7c8c, 0, 0.065, 0.02, 6);                                                                 // head
  rot(K.cone(PH, 0.011, 0.04, 0x3a3a3a, 0, 0.06, 0.07, 4), Math.PI / 2);                                         // beak
  bake(PH, pigHead);

  bake(S, g);

  // ================= steam and smoke (own materials: their opacity fades) =================
  const puff = new THREE.SphereGeometry(1, 7, 5), puffs = [], smoke = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(puff, new THREE.MeshBasicMaterial({ color: night ? 0xf8e8d0 : 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); m.renderOrder = 2; g.add(m); puffs.push(m); }
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(puff, new (night ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial)({ color: night ? 0x4a4a58 : 0xb8b8b8, transparent: true, opacity: 0.5, depthWrite: false })); m.renderOrder = 2; g.add(m); smoke.push(m); }

  const sm = (u) => u * u * (3 - 2 * u);
  g.userData.tick = (t, dt, ctx) => {
    for (let i = 0; i < 4; i++) {
      const p = (t / 2.2 + i / 4) % 1, m = puffs[i];
      m.position.set(PX + Math.sin(i * 1.7 + p * 3) * 0.1, PY + 0.08 + p * 0.85, PZ + p * 0.12);
      m.scale.setScalar(0.05 + p * 0.14); m.material.opacity = 0.62 * (1 - p) * Math.min(1, p * 6);
    }
    for (let i = 0; i < 3; i++) { // stays below 4.45 m at every phase
      const p = (t / 3 + i / 3) % 1, m = smoke[i];
      m.position.set(SPX + p * 0.22, SPY + 0.1 + p * 0.5, SPZ + p * 0.08);
      m.scale.setScalar(0.08 + p * 0.1); m.material.opacity = 0.55 * (1 - p) * Math.min(1, p * 5);
    }
    // flip cycle: slide under, flick, the fritter somersaults and lands fried side up, then back again
    const c = t % 3, side = Math.floor(t / 3) % 2;
    let a = 0;
    if (c < 0.5) a = 0.12 * sm(c / 0.5); else if (c < 0.65) a = 0.12 - 0.7 * sm((c - 0.5) / 0.15); else if (c < 1.3) a = -0.58 * (1 - sm((c - 0.65) / 0.65));
    fore.rotation.x = a;
    if (c > 0.55 && c < 1.2) { const q = (c - 0.55) / 0.65; flip.position.y = PY + 0.013 + 0.34 * 4 * q * (1 - q); flip.rotation.x = (side + q) * Math.PI; }
    else { flip.position.y = PY + 0.013; flip.rotation.x = (c >= 1.2 ? side + 1 : side) * Math.PI; }
    head.rotation.x = c > 0.5 && c < 1.3 ? -0.15 * Math.sin((c - 0.5) / 0.8 * Math.PI) + 0.2 : 0.2;   // eyes on the fritter
    tail.rotation.y = 2.0 + Math.sin(t * 14) * 0.45;                                  // the Dackel is hopeful
    // the pigeon: two quick pecks, a look around, again
    const pc = (t + 0.4) % 2.4;
    let peck = 0;
    if (pc < 0.9) peck = Math.max(0, Math.sin(pc / 0.45 * Math.PI));                 // down-up, down-up
    pigBody.rotation.x = 0.55 * peck;
    pigHead.rotation.x = 1.0 * peck - 0.15 * (1 - peck);
    pig.rotation.y = PGR + (pc > 1.2 ? Math.sin((pc - 1.2) / 1.2 * Math.PI) * 0.5 : 0);
  };
  g.userData.tick(0, 0, {});                                                                       // puffs start in place
});

// Autohaus Gina: a flat 1980s glass pavilion on a checkered floor. Under the white roof slab "AUTOHAUS GINA",
// on the roof a pink neon script "LamboGina" with a cyan tube that pumps with the song. Inside, on a chrome
// turntable under three ceiling spots, the white wedge (the game's own LamboGina Contessa) turns once every twelve
// seconds. A salesman in a cream suit, pink tie, shades, moustache and a proper Vokuhila waves the drivers in
// (harder when a car comes by) and turns after every car that passes. On the back wall the synthwave poster
// "DÄ WEISSE KEIL VUN KÖLLE", in the window "FINANZIERUNG? ET HÄTT NOCH EMMER JOT JEJANGE", a standee
// "PREIS AUF ANFRAGE", potted palms, a pennant string under the roof edge (the used-car lot never quite left)
// and a bunch of opening-day balloons at the door. Outside, a Pänz in a red cagoule presses his hands to the
// window: the wedge from the poster over his bed, for real. Round the back: the Werkstatt door, the air con.
Veedel.define('autohausgina', { name: 'Autohaus Gina', kind: 'lambogina', w: 12, d: 7 }, (g, o, K) => {
  const night = K.theme().night;
  const WHITE = 0xf4f4f6, STEEL = 0x24242c, PINK = 0xff2d95, CYAN = 0x00e5ff, GREY = 0x5a5a64, YELLOW = 0xffd400;

  // ---- bake: every mesh under a (not yet placed) group becomes one mesh per material ----
  function bake(src, dst) {
    src.updateMatrixWorld(true);
    const byMat = new Map();
    src.traverse((m) => {
      if (!m.isMesh) return;
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      geo.applyMatrix4(m.matrixWorld);
      if (!byMat.has(m.material)) byMat.set(m.material, []);
      byMat.get(m.material).push(geo);
    });
    byMat.forEach((list, material) => {
      let n = 0; for (const q of list) n += q.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let off = 0;
      for (const q of list) {
        pos.set(q.attributes.position.array, off * 3); nor.set(q.attributes.normal.array, off * 3);
        if (q.attributes.uv) uv.set(q.attributes.uv.array, off * 2);
        off += q.attributes.position.count;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere(); const m = new THREE.Mesh(geo, material); m.renderOrder = material.transparent ? 1 : 0; dst.add(m);
    });
  }
  const S = new THREE.Group();
  const texOf = (cv) => { const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
  const plane = (grp, w, h, material, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); m.rotation.y = ry || 0; grp.add(m); return m; };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const between = (m, a, b) => { _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); m.position.copy(_a).lerp(_b, 0.5); m.quaternion.setFromUnitVectors(_up, _b.sub(_a).normalize()); return m; };
  const tris = (arr) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.computeVertexNormals(); return geo; };

  // shared canvases and materials (built once): checker floor, neon script dim/bright, the synthwave poster,
  // the spot-light cones and the "showroom-lit" paint the wedge wears at night
  const C = K.__autohausgina || (K.__autohausgina = {});
  if (!C.floor) {
    const fc = document.createElement('canvas'); fc.width = 32; fc.height = 18; const f = fc.getContext('2d');
    for (let y = 0; y < 18; y++) for (let x = 0; x < 32; x++) { f.fillStyle = (x + y) % 2 ? '#1c1c24' : '#ececf0'; f.fillRect(x, y, 1, 1); }
    C.floor = texOf(fc);
    const neon = (bright) => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d');
      x.font = 'italic bold 84px "Brush Script MT", "URW Chancery L", "Z003", cursive, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineJoin = 'round'; x.shadowColor = '#ff2d95';
      x.shadowBlur = bright ? 22 : 6; x.strokeStyle = bright ? '#ff4aa8' : '#8a1850'; x.lineWidth = bright ? 10 : 7; x.strokeText('LamboGina', 256, 60);
      x.shadowBlur = bright ? 10 : 0; x.strokeStyle = bright ? '#ffe0f0' : '#b02a6a'; x.lineWidth = 3.5; x.strokeText('LamboGina', 256, 60);
      return new THREE.MeshBasicMaterial({ map: texOf(cv), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    };
    C.neonDim = neon(false); C.neonBright = neon(true);
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128; const x = pc.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, 84); sky.addColorStop(0, '#1a0a3a'); sky.addColorStop(0.6, '#7a1a6a'); sky.addColorStop(1, '#ff7a3a');
    x.fillStyle = sky; x.fillRect(0, 0, 256, 84);
    x.fillStyle = '#ffd23f'; for (let r = 0; r < 22; r++) { const w = Math.round(Math.sqrt(22 * 22 - r * r) * 2); if (r % 5 !== 4) x.fillRect(128 - w / 2, 82 - r, w, 1); }
    x.fillStyle = '#12061e'; x.fillRect(0, 84, 256, 44);
    x.strokeStyle = '#ff2d95'; x.lineWidth = 1; for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(128 + i * 5, 84); x.lineTo(128 + i * 26, 128); x.stroke(); }
    for (const y of [88, 94, 103, 116]) { x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
    // the white wedge in profile
    x.fillStyle = '#f4f4f2'; x.beginPath(); x.moveTo(78, 100); x.lineTo(90, 88); x.lineTo(126, 80); x.lineTo(148, 81); x.lineTo(176, 89); x.lineTo(178, 100); x.closePath(); x.fill();
    x.fillStyle = '#20202a'; x.beginPath(); x.moveTo(118, 82); x.lineTo(138, 81); x.lineTo(150, 87); x.lineTo(121, 87); x.closePath(); x.fill();
    x.fillStyle = '#111'; for (const wx of [96, 162]) { x.beginPath(); x.arc(wx, 100, 7, 0, Math.PI * 2); x.fill(); } x.fillStyle = '#aaa'; for (const wx of [96, 162]) x.fillRect(wx - 2, 98, 4, 4);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 19px monospace'; x.fillStyle = '#00e5ff'; x.fillText('DÄ WEISSE KEIL', 129, 17); x.fillStyle = '#ffffff'; x.fillText('DÄ WEISSE KEIL', 128, 16);
    x.font = 'bold 15px monospace'; x.fillStyle = '#ff2d95'; x.fillText('VUN KÖLLE', 128, 37);
    C.poster = [new THREE.MeshLambertMaterial({ map: texOf(pc) }), new THREE.MeshBasicMaterial({ map: texOf(pc), color: 0xd0d0d0 })];
    C.floorMat = [new THREE.MeshLambertMaterial({ map: C.floor }), new THREE.MeshBasicMaterial({ map: C.floor, color: 0x9a96a8 })];
  }
  if (!C.cone) C.cone = new THREE.MeshBasicMaterial({ color: 0xfff0d8, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  if (!C.showPaint) C.showPaint = new THREE.MeshPhongMaterial({ color: 0xf4f4f2, emissive: 0x5c5c62, specular: 0x9a9a9a, shininess: 60 });

  // ================= the pavilion =================
  const FH = 0.15, WH = 3.45, X0 = -5.6, X1 = 5.6, ZB = -3.3, ZF = 2.9, ZC = (ZB + ZF) / 2, RY = FH + WH, GZ = ZF - 0.07;
  K.box(S, X1 - X0, FH, ZF - ZB, GREY, 0, FH / 2, ZC);                                        // floor slab
  const fl = plane(S, X1 - X0 - 0.02, ZF - ZB - 0.02, C.floorMat[night ? 1 : 0], 0, FH + 0.004, ZC); fl.rotation.x = -Math.PI / 2;
  K.box(S, X1 - X0, WH, 0.12, night ? 0xa898c0 : 0xe8e4ee, 0, FH + WH / 2, ZB + 0.06, night ? { glow: true } : null); // back wall, lit at night
  K.box(S, X1 - X0 - 0.2, 0.08, 0.02, PINK, 0, FH + 2.95, ZB + 0.13, { glow: true });           // neon lines on the back wall
  K.box(S, X1 - X0 - 0.2, 0.05, 0.02, CYAN, 0, FH + 2.8, ZB + 0.13, { glow: true });
  // roof slab with overhang, white, gravel inside the parapet; a pink band under the fascia; the air con
  K.box(S, 11.6, 0.5, 6.6, WHITE, 0, RY + 0.25, ZC);
  K.box(S, 11.0, 0.02, 6.0, 0x8c8a92, 0, RY + 0.51, ZC);
  K.box(S, 11.62, 0.06, 0.04, PINK, 0, RY + 0.03, ZC + 3.3, { glow: true });
  K.text(S, 'AUTOHAUS GINA', { fg: '#1a1a2a', bg: '#f4f4f6', w: 6.2, h: 0.46, x: 0, y: RY + 0.25, z: ZC + 3.305, glow: night, sizeK: 0.9 });
  K.box(S, 1.3, 0.55, 0.9, 0xd4d4dc, -4.1, RY + 0.5 + 0.275, ZB + 1.0);
  K.box(S, 0.6, 0.02, 0.6, 0x3a3a44, -4.1, RY + 0.5 + 0.56, ZB + 1.0);
  // steel posts: front, corners, side middles; the door bay (right) with transom and chrome handles
  const PXS = [-5.53, -2.77, 0, 2.77, 5.53];
  for (const x of PXS) K.box(S, 0.14, WH, 0.14, STEEL, x, FH + WH / 2, GZ);
  for (const sx of [-1, 1]) { K.box(S, 0.14, WH, 0.14, STEEL, sx * 5.53, FH + WH / 2, ZB + 0.19); K.box(S, 0.1, WH, 0.1, STEEL, sx * 5.55, FH + WH / 2, ZC); }
  K.box(S, 11.2, 0.1, 0.12, STEEL, 0, FH + 0.05, GZ);                                          // sill
  K.box(S, 2.63, 0.08, 0.1, STEEL, 4.15, FH + 2.35, GZ);                                        // transom over the door
  K.box(S, 0.06, 2.3, 0.1, STEEL, 4.15, FH + 1.15, GZ);                                         // door meeting stiles
  for (const sx of [-1, 1]) K.box(S, 0.04, 0.8, 0.04, 0xd8d8e0, 4.15 + sx * 0.12, FH + 1.05, ZF + 0.02);
  K.text(S, 'OFFEN', { fg: '#ffffff', bg: '#ff2d95', w: 0.6, h: 0.2, x: 4.6, y: FH + 1.6, z: GZ + 0.014, glow: true, sizeK: 0.7 }); // stuck on the door glass
  // glass: front and sides, with a few glints so it reads as glass from the street
  const glass = K.mat(0xbfe4f5, { opacity: night ? 0.12 : 0.22, double: true });
  plane(S, 11.06, WH - 0.1, glass, 0, FH + 0.1 + (WH - 0.1) / 2, GZ);
  for (const sx of [-1, 1]) plane(S, ZF - ZB - 0.3, WH - 0.1, glass, sx * 5.56, FH + 0.1 + (WH - 0.1) / 2, ZC, Math.PI / 2);
  const glint = K.mat(0xffffff, { opacity: night ? 0.07 : 0.3, double: true });
  for (const [x, w] of [[-4.6, 0.2], [-4.22, 0.07], [-1.85, 0.2], [-1.47, 0.07], [0.95, 0.2], [1.33, 0.07]]) plane(S, w, 1.7, glint, x, FH + 2.05, GZ + 0.012).rotation.z = -0.6;
  // ceiling light panels and three spots on the turntable (light cones at night)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) K.box(S, 1.6, 0.04, 0.5, night ? 0xfff6e8 : 0xf8f8f0, -3.6 + i * 3.6, RY - 0.02, -1.6 + j * 2.4, night ? { glow: true } : null);
  const TX = -1.4, TZ = -0.15, TR = 2.75, DT = 0.16;                                             // turntable centre, radius, disc top over the floor
  for (const [sx, sz] of [[-2.7, 1.35], [0.3, 1.35], [-1.4, -2.3]]) {
    K.box(S, 0.16, 0.12, 0.16, STEEL, sx, RY - 0.06, sz);
    K.box(S, 0.1, 0.01, 0.1, night ? 0xfff6d8 : 0xd8d8d0, sx, RY - 0.125, sz, night ? { glow: true } : null);
    if (night) {
      _a.set(TX + (sx - TX) * 0.3, FH + 0.55, TZ + (sz - TZ) * 0.3); _b.set(sx, RY - 0.13, sz);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.8, _a.distanceTo(_b), 10, 1, true), C.cone);
      between(cone, [_a.x, _a.y, _a.z], [_b.x, _b.y, _b.z]); S.add(cone);
    }
  }
  // neon script on a rack on the roof (the plane swaps between a dim and a bright material)
  const NY = RY + 1.3, NZ = ZF - 0.4;
  for (const sx of [-1, 1]) K.box(S, 0.08, 1.35, 0.08, STEEL, sx * 2.6, RY + 0.5 + 0.675, NZ - 0.12);
  for (const y of [NY - 0.45, NY + 0.4]) K.box(S, 5.5, 0.05, 0.05, STEEL, 0, y, NZ - 0.12);
  const neon = plane(g, 6.4, 1.6, C.neonBright, 0, NY, NZ);
  const tubeB = K.mat(CYAN, { glow: true }), tubeD = K.mat(0x0a5a6a, { glow: true });
  const tube = K.box(g, 4.9, 0.07, 0.07, CYAN, 0.1, NY - 0.62, NZ, { glow: true });
  // a pennant string under the roof edge, from the left corner to the door
  const PEN = [PINK, CYAN, YELLOW, WHITE], penTri = PEN.map(() => []), line = [];
  const PZ = ZC + 3.33, PY = RY - 0.02, SAG = 0.18;
  let pi = 0;
  for (const [a, b] of [[-5.53, -2.77], [-2.77, 0], [0, 2.77], [2.77, 4.45]]) {
    const yAt = (x) => PY - SAG * (1 - Math.pow((2 * x - a - b) / (b - a), 2));
    const n = Math.round((b - a) / 0.34);
    for (let k = 0; k < n; k++) { const x = a + (k + 0.5) * (b - a) / n; penTri[pi++ % 4].push(x - 0.1, yAt(x - 0.1), PZ, x, yAt(x) - 0.26, PZ, x + 0.1, yAt(x + 0.1), PZ); }
    for (let k = 0; k < 6; k++) { const x0 = a + k * (b - a) / 6, x1 = a + (k + 1) * (b - a) / 6, y0 = yAt(x0), y1 = yAt(x1); line.push(x0, y0 + 0.01, PZ, x0, y0 - 0.01, PZ, x1, y1 - 0.01, PZ, x0, y0 + 0.01, PZ, x1, y1 - 0.01, PZ, x1, y1 + 0.01, PZ); }
  }
  PEN.forEach((c, i) => K.part(S, tris(penTri[i]), c, 0, 0, 0, { double: true }));
  K.part(S, tris(line), 0x2a2a30, 0, 0, 0, { double: true });

  // ================= inside =================
  // turntable with the white wedge (the stripes and the car turn; plinth, disc and the pink ring stay)
  const turn = new THREE.Group(); turn.position.set(TX, FH, TZ); g.add(turn);
  K.cyl(S, TR + 0.05, TR + 0.1, 0.06, STEEL, TX, FH + 0.03, TZ, 28);                              // plinth
  K.part(S, new THREE.CylinderGeometry(TR + 0.115, TR + 0.115, 0.04, 32, 1, true), PINK, TX, FH + 0.025, TZ, { glow: true });
  const lit = night ? { glow: true } : null;                                                     // at night the showroom lights carry the floor
  K.cyl(S, TR, TR, 0.1, night ? 0xa8a6b4 : 0xc4c4ce, TX, FH + DT - 0.05, TZ, 28, lit);           // the disc is round: it may as well stand still
  for (let k = 0; k < 2; k++) K.box(turn, 2 * TR - 0.1, 0.004, 0.06, night ? 0x77768a : 0x8a8a96, 0, DT + 0.002, 0, lit).rotation.y = k * Math.PI / 2 + Math.PI / 4; // its stripes turn
  const def = (window.GameData && GameData.CARS || []).find((c) => c.id === 'countach');
  if (def && World.buildCar) {
    // the game's own wedge. Built "lite" like the game's parked cars (same body, fewer facets; the full build
    // spends 6300 triangles on spokes nobody sees through the glass), with World.buildCar as the fallback
    const C3 = window.Cars, lite = C3 && C3.build && C3.SPECS && C3.SPECS[def.shape];
    const car = lite ? C3.build(def, night, { textPlane: World.textPlane, mat: (c) => K.mat(c) }, { lite: true }) : World.buildCar(def, night);
    const kill = []; car.traverse((m) => { if (m.isMesh && m.material && m.material.blending === THREE.AdditiveBlending) kill.push(m); }); // no headlight beams in the showroom
    for (const m of kill) m.parent.remove(m);
    // at night the paint would go dark like a car in the street: here it stands under the showroom lights
    if (night) car.traverse((m) => { if (m.isMesh && m.material && m.material.isMeshPhysicalMaterial && m.material.color.getHex() === def.color) m.material = C.showPaint; });
    const carG = new THREE.Group(); carG.position.y = DT; turn.add(carG); bake(car, carG);       // tyres on the disc; one mesh per material
  }
  // price standee, desk with a chair and a phone, potted palms
  K.cyl(S, 0.18, 0.2, 0.04, STEEL, 1.75, FH + 0.02, 2.2, 8); K.box(S, 0.04, 1.0, 0.04, STEEL, 1.75, FH + 0.5, 2.2);
  K.text(S, 'PREIS AUF ANFRAGE', { fg: '#ffffff', bg: '#1a1a2a', border: '#ff2d95', w: 0.9, h: 0.34, x: 1.75, y: FH + 1.12, z: 2.23, ry: -0.3, glow: night, sizeK: 0.55 });
  const DX = 3.35, DZ = -2.3;
  K.box(S, 1.5, 0.06, 0.75, 0x1a1a24, DX, FH + 0.75, DZ); for (const sx of [-1, 1]) K.box(S, 0.06, 0.72, 0.7, 0x1a1a24, DX + sx * 0.7, FH + 0.36, DZ);
  K.box(S, 0.25, 0.08, 0.2, 0xc1121f, DX - 0.4, FH + 0.82, DZ - 0.05); K.box(S, 0.35, 0.02, 0.25, 0xf4f0e8, DX + 0.2, FH + 0.79, DZ);
  K.box(S, 0.45, 0.06, 0.45, PINK, DX, FH + 0.45, DZ + 0.7); K.box(S, 0.45, 0.5, 0.06, PINK, DX, FH + 0.7, DZ + 0.9); K.cyl(S, 0.03, 0.03, 0.42, STEEL, DX, FH + 0.21, DZ + 0.7, 5);
  const palm = (x, z) => {
    K.cyl(S, 0.26, 0.2, 0.45, 0xf4f4f6, x, FH + 0.225, z, 8); K.cyl(S, 0.23, 0.23, 0.02, 0x4a2a1a, x, FH + 0.45, z, 8);
    K.cyl(S, 0.05, 0.07, 1.1, 0x7a5a3a, x, FH + 1.0, z, 5);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; const l = K.box(S, 0.2, 0.02, 0.8, 0x2d8a3a, x + Math.sin(a) * 0.36, FH + 1.48, z + Math.cos(a) * 0.36); l.rotation.order = 'YXZ'; l.rotation.set(0.45, a, 0); }
  };
  palm(-4.8, 2.0); palm(4.8, -2.4);                                                              // fronds stay inside the glass
  // the poster on the back wall, in a steel frame
  K.box(S, 3.3, 1.7, 0.03, STEEL, 2.4, FH + 1.9, ZB + 0.135);
  plane(S, 3.2, 1.6, C.poster[night ? 1 : 0], 2.4, FH + 1.9, ZB + 0.155);
  // a banner in the left window: the house's financing promise
  const BX = -4.15, BZ = 2.52;
  for (const sx of [-1, 1]) K.box(S, 0.012, RY - (FH + 2.98), 0.012, STEEL, BX + sx * 0.85, (RY + FH + 2.98) / 2, BZ);
  K.text(S, 'FINANZIERUNG?', { fg: '#ffffff', bg: '#ff2d95', w: 2.0, h: 0.36, x: BX, y: FH + 2.8, z: BZ, glow: night, sizeK: 0.7 });
  K.text(S, 'ET HÄTT NOCH EMMER JOT JEJANGE', { fg: '#1a1a2a', bg: '#ffffff', border: '#00e5ff', w: 2.3, h: 0.26, x: BX, y: FH + 2.45, z: BZ, glow: night, sizeK: 0.5 });
  // round the back: the Werkstatt door
  K.box(S, 3.0, 2.7, 0.04, 0x8a8a94, -2.6, 1.35, ZB - 0.02);
  for (let k = 1; k < 5; k++) K.box(S, 3.0, 0.03, 0.012, 0x5a5a64, -2.6, k * 0.54, ZB - 0.046);
  K.text(S, 'WERKSTATT', { fg: '#ffffff', bg: '#24242c', w: 1.8, h: 0.34, x: -2.6, y: 3.05, z: ZB - 0.01, ry: Math.PI, sizeK: 0.6 });

  // the salesman: cream suit, pink tie, shades, moustache, Vokuhila; his waving arm hangs on its own pivot
  const MX = 2.6, MZ = 1.3, MR = -0.25, MH = 1.8 / 1.75;
  const man = new THREE.Group(); man.position.set(MX, FH, MZ); man.rotation.y = MR; g.add(man);
  const ms = K.person({ h: 1.8, shirt: 0xeee6d2, pants: 0xeee6d2, shoes: 0xf4f4f4, suit: true, tie: PINK, moustache: 0x2a1a0a, hair: 0x3a2412, skin: 0xe0ac69, smile: 1, wave: true });
  K.box(ms, 0.165, 0.042, 0.02, 0x0a0a12, 0, 1.664, 0.126);                                    // shades
  K.box(ms, 0.2, 0.2, 0.075, 0x3a2412, 0, 1.56, -0.0975);                                       // short in front, long at the back
  const armSrc = new THREE.Group();
  for (const c of ms.children.slice()) if (c.isMesh && c.position.x > 0.25 && c.position.y > 1.4) { ms.remove(c); c.position.x -= 0.21; c.position.y -= 1.36; armSrc.add(c); }
  bake(ms, man);
  const arm = new THREE.Group(); arm.position.set(0.21 * MH, 1.36 * MH, 0); arm.scale.setScalar(MH); man.add(arm);
  bake(armSrc, arm);

  // outside at the window: a Pänz in a red cagoule, hands on the glass and nose almost on it, staring at the
  // wedge from the poster over his bed. His hanging arms are swapped for two that reach up to the pane.
  const kid = K.person({ h: 1.3, shirt: 0xc1121f, pants: 0x2a4a8a, shoes: 0xf4f4f4, hat: 'cap', hatColor: 0xffffff, skin: 0xffdbac, hair: 0x8a5a2a, smile: 1 });
  for (const c of kid.children.slice()) if (c.isMesh && Math.abs(c.position.x) > 0.215 && c.position.y > 0.7 && c.position.y < 1.3) kid.remove(c);
  const limb = (a, b, r0, r1, c) => between(K.cyl(kid, r1, r0, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), c, 0, 0, 0, 5), a, b);
  for (const sx of [-1, 1]) {
    limb([sx * 0.21, 1.36, 0], [sx * 0.37, 1.34, 0.12], 0.058, 0.046, 0xc1121f);             // elbows out
    limb([sx * 0.37, 1.34, 0.12], [sx * 0.22, 1.6, 0.24], 0.046, 0.036, 0xc1121f);           // forearms up to the pane
    K.sphere(kid, 0.045, 0xffdbac, sx * 0.21, 1.64, 0.265, 6).scale.set(0.85, 1.15, 0.45);    // hands flat on the glass
  }
  K.put(S, kid, -2.25, 0, 3.04, Math.PI);                                                     // toes at the slab edge

  // balloons at the door for the grand opening, tied to a post on the pavement
  const balloons = [], BC = [PINK, CYAN, WHITE, YELLOW], BLX = 5.2, BLZ = 3.25, BLY = 1.1;
  K.box(S, 0.07, BLY, 0.07, STEEL, BLX, BLY / 2, BLZ);
  const TIPS = [[-0.22, 1.45, 0.06], [0.02, 1.75, 0.1], [0.22, 1.5, -0.06], [-0.04, 1.25, -0.12]];
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group(); b.position.set(BLX, BLY, BLZ); g.add(b);
    const tip = TIPS[i];
    between(K.cyl(b, 0.006, 0.006, Math.hypot(tip[0], tip[1], tip[2]), 0xdddddd, 0, 0, 0, 3), [0, 0, 0], tip);
    K.sphere(b, 0.2, BC[i], tip[0], tip[1] + 0.22, tip[2], 6).scale.set(1, 1.2, 1);
    balloons.push(b);
  }

  bake(S, g);

  // ================= animation =================
  const rel = new THREE.Vector3();
  let look = MR, amp = 0.15, wph = 0;
  g.userData.tick = (t, dt, ctx) => {
    dt = Math.min(dt || 0, 0.1);
    turn.rotation.y = (t / 12) * Math.PI * 2;                                                       // one turn per 12 s
    const b = ctx && ctx.beat;
    let bright;
    if (b && b.playing) bright = b.pulse > 0.3 || (b.section === 'drop' && b.pulse > 0.12);
    else bright = (t % 7.3) > 0.45 || Math.floor(t * 18) % 2 === 0;                                 // a tired tube flickers now and then
    neon.material = bright ? C.neonBright : C.neonDim; tube.material = bright ? tubeB : tubeD;
    for (let i = 0; i < 4; i++) { const bl = balloons[i]; bl.rotation.z = Math.sin(t * 1.3 + i * 1.9) * 0.05; bl.rotation.x = Math.sin(t * 1.1 + i) * 0.04; }
    // the salesman turns towards the nearest car in front and waves harder the closer it is
    let want = MR, best = 30 * 30;
    const cars = ctx && ctx.cars;
    if (cars) for (let i = 0; i < cars.length; i++) {
      const c = cars[i]; if (!c) continue;
      rel.copy(c); g.worldToLocal(rel); rel.x -= MX; rel.z -= MZ;
      const d2 = rel.x * rel.x + rel.z * rel.z;
      if (d2 < best && rel.z > 0.5) { best = d2; want = Math.max(-1.1, Math.min(1.1, Math.atan2(rel.x, rel.z))); }
    }
    const excite = best < 900 ? 1 - Math.sqrt(best) / 30 : 0, k = Math.min(1, dt * 3);
    look += (want - look) * k; man.rotation.y = look;
    amp += (0.14 + 0.32 * excite - amp) * k;
    wph += dt * (3 + 6 * excite);
    arm.rotation.z = -0.08 + Math.sin(wph) * amp;
  };
  g.userData.tick(0, 0, {});
});

/* ---- Heimspill: fans in red and white on the way to Müngersdorf, scarves up, one flag, and a goat that
   came along on a lead. No club name, no crest: just the colours of the city. ---- */
Veedel.define('fanmarsch', { name: 'Fans op dem Wäch noh Müngersdorf', kind: 'strasse', w: 7, d: 2.4, tracks: ['heimspill', 'zuelpicher', 'ehrenfeld', 'kalk', 'zoch'] }, (g, o, K) => {
  const rnd = K.rnd((o && o.seed) || 1948), night = K.theme().night, RED = 0xc1121f, WHITE = 0xf4f4f2;
  const fans = [];
  for (let i = 0; i < 9; i++) {
    const x = -3 + i * 0.72 + (rnd() - 0.5) * 0.25, z = (i % 2 ? 0.45 : -0.35) + (rnd() - 0.5) * 0.3;
    const p = K.person({ h: 1.62 + rnd() * 0.3, shirt: i % 3 === 1 ? WHITE : RED, pants: [0x2a2a34, 0x3a4a6a, 0x4a4a4a][i % 3], scarf: i % 3 === 1 ? RED : WHITE, hat: i % 4 === 2 ? 'cap' : 'none', koelsch: i % 4 === 0 });
    K.put(g, p, x, 0, z, (rnd() - 0.5) * 0.5);
    // the scarf held up over the head with both hands, red and white blocks
    const sc = new THREE.Group(); sc.position.set(x, 1.95 + rnd() * 0.1, z);
    for (let k = 0; k < 6; k++) K.box(sc, 0.16, 0.14, 0.03, k % 2 ? WHITE : RED, -0.4 + k * 0.16, 0, 0);
    g.add(sc); fans.push({ p, sc, ph: rnd() * 6.28, base: p.position.y });
  }
  // a flag on a pole: red over white, with a small Dom silhouette instead of any crest
  const flag = new THREE.Group(); flag.position.set(2.6, 0, -0.2); g.add(flag);
  K.cyl(flag, 0.025, 0.03, 3.2, 0x8a6a3a, 0, 1.6, 0, 6);
  const cloth = new THREE.Group(); cloth.position.set(0, 2.85, 0); flag.add(cloth);
  K.box(cloth, 1.2, 0.35, 0.02, RED, 0.62, 0.17, 0); K.box(cloth, 1.2, 0.35, 0.02, WHITE, 0.62, -0.18, 0);
  K.box(cloth, 0.08, 0.26, 0.03, 0x111111, 0.52, -0.16, 0); K.box(cloth, 0.08, 0.26, 0.03, 0x111111, 0.72, -0.16, 0); K.box(cloth, 0.28, 0.1, 0.03, 0x111111, 0.62, -0.25, 0);
  // the banner the first two carry
  K.text(g, 'RUT UN WIESS – MER JONN NOH MÜNGERSDORF', { fg: '#ffffff', bg: '#c1121f', w: 2.6, h: 0.42, x: -1.9, y: 1.45, z: 0.75, border: '#ffffff', glow: night, sizeK: 0.5 });
  for (const x of [-3.15, -0.65]) K.cyl(g, 0.02, 0.02, 1.7, 0x8a6a3a, x, 0.85, 0.75, 5);
  // ene Jeißbock: a white goat on a lead, nibbling at the verge
  const goat = new THREE.Group(); goat.position.set(3.4, 0, 0.6); goat.rotation.y = -0.6; g.add(goat);
  const GOAT = 0xece6d8, HORN = 0x6a5a40;
  K.box(goat, 0.36, 0.34, 0.8, GOAT, 0, 0.62, 0);
  for (const [lx, lz] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) K.box(goat, 0.08, 0.45, 0.08, GOAT, lx, 0.225, lz);
  K.box(goat, 0.08, 0.14, 0.06, GOAT, 0, 0.82, -0.42);
  const head = new THREE.Group(); head.position.set(0, 0.86, 0.42); goat.add(head);
  K.box(head, 0.2, 0.2, 0.32, GOAT, 0, 0, 0.12); K.box(head, 0.06, 0.12, 0.06, 0xd8d0c0, 0, -0.14, 0.24);
  for (const sx of [-1, 1]) { const h = K.cone(head, 0.035, 0.28, HORN, sx * 0.07, 0.18, -0.02, 5); h.rotation.x = -0.6; h.rotation.z = sx * 0.25; K.box(head, 0.12, 0.05, 0.04, GOAT, sx * 0.13, 0.04, 0.0); }
  K.box(goat, 0.02, 0.02, 1.0, 0x8a1a1a, -0.2, 0.9, 0.9).rotation.x = 0.5; // the lead
  g.userData.tick = (t, dt, ctx) => {
    const b = ctx && ctx.beat, pulse = b && b.playing ? b.pulse : 0;
    for (const f of fans) { const hop = Math.max(0, Math.sin(t * 5.2 + f.ph)); f.p.position.y = f.base + hop * 0.08 + pulse * 0.03; f.sc.position.y = 1.97 + hop * 0.1; f.sc.rotation.z = Math.sin(t * 2.6 + f.ph) * 0.12; }
    cloth.rotation.y = Math.sin(t * 2.1) * 0.35; cloth.rotation.z = Math.sin(t * 3.3) * 0.05;
    head.rotation.x = 0.55 + Math.sin(t * 1.3) * 0.35; // nibbling grass, looking up now and then
  };
});
