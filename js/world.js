/* ============================================================
   STUNTS KÖLLE 4D — World: road mesh, pixel-art Cologne, cars
   Requires THREE (r128, global), TrackBuilder and Pixel.
   ============================================================ */
(function (root) {
  'use strict';
  const TB = root.TrackBuilder, PX = root.Pixel, T = PX.T;
  const ROAD_W = 6;        // half width
  const GROUND_Y = -0.3;
  const WATER_Y = -0.08;
  const mulberry = PX.mulberry;

  const mat = (color, opts) => new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  const tmat = (tex, color, opts) => new THREE.MeshLambertMaterial(Object.assign({ map: tex, color: color == null ? 0xffffff : color }, opts || {}));
  const V = (o) => new THREE.Vector3(o.x, o.y, o.z);
  let THEME = { night: false };
  const animated = [];   // objects with userData.update(t, dt)

  // ------------------------------------------------ primitives ----
  function box(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x || 0, y == null ? h / 2 : y, z || 0);
    return m;
  }
  function tbox(w, h, d, tex, x, y, z, color, scaleUV) {
    // textured box, texture repeats scale with size (scaleUV = metres per tile [x, y])
    const su = scaleUV ? scaleUV[0] : 8, sv = scaleUV ? scaleUV[1] : 8;
    const mk = (a, b) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(a / su)), Math.max(1, Math.round(b / sv))); return tmat(t, color); };
    const mats = [mk(d, h), mk(d, h), mk(w, d), mk(w, d), mk(w, h), mk(w, h)];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set(x || 0, y == null ? h / 2 : y, z || 0);
    return m;
  }
  function cone(r, h, color, x, y, z, seg) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 4), mat(color));
    m.position.set(x || 0, y, z || 0);
    return m;
  }
  function cyl(rt, rb, h, color, x, y, z, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), mat(color));
    m.position.set(x || 0, y == null ? h / 2 : y, z || 0);
    return m;
  }
  // triangular prism (gable roof): base width w (x), height h (y), depth d (z); ridge along z
  function prismGeo(w, h, d) {
    const g = new THREE.BufferGeometry();
    const hw = w / 2, hd = d / 2;
    const v = [
      // front triangle (z = +hd)
      -hw, 0, hd, hw, 0, hd, 0, h, hd,
      // back triangle
      hw, 0, -hd, -hw, 0, -hd, 0, h, -hd,
      // left slope
      -hw, 0, -hd, -hw, 0, hd, 0, h, hd, 0, h, -hd,
      // right slope
      hw, 0, hd, hw, 0, -hd, 0, h, -hd, 0, h, hd,
      // bottom
      -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd
    ];
    const uv = [0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1, 0, 0, d / 4, 0, d / 4, 1, 0, 1, 0, 0, d / 4, 0, d / 4, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
    const idx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 6, 8, 9, 10, 11, 12, 10, 12, 13, 14, 16, 15, 14, 17, 16];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function gable(w, h, d, tex, color, x, y, z) {
    const m = new THREE.Mesh(prismGeo(w, h, d), tex ? tmat(tex, color) : mat(color));
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  // ------------------------------------------------ text ----
  function textTexture(text, fg, bg, w, h, opts) {
    opts = opts || {};
    const c = document.createElement('canvas');
    c.width = 256; c.height = Math.max(16, Math.round(256 * h / w));
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    if (opts.border) { x.fillStyle = opts.border; x.fillRect(0, 0, c.width, 4); x.fillRect(0, c.height - 4, c.width, 4); x.fillRect(0, 0, 4, c.height); x.fillRect(c.width - 4, 0, 4, c.height); }
    x.fillStyle = fg;
    let size = Math.round(c.height * (opts.sizeK || 0.55));
    const setFont = () => { x.font = `bold ${size}px "Press Start 2P", Impact, "Arial Black", sans-serif`; };
    setFont();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    while (x.measureText(text).width > c.width * 0.9 && size > 6) { size -= 1; setFont(); }
    x.fillText(text, c.width / 2, c.height / 2 + 1);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipMapLinearFilter;
    return t;
  }
  function textPlane(text, fg, bg, w, h, emissive, opts) {
    const t = textTexture(text, fg, bg, w, h, opts);
    const m = emissive
      ? new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })
      : new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  }

  // ------------------------------------------------ buildings ----
  const PASTEL = [0xf2d6a2, 0xe9b7a0, 0xbfd8c8, 0xf6f0d8, 0xd9b8d8, 0xf5c56b, 0xa8c8e8, 0xe8e8e8, 0xf0a08a, 0xcfe0a0];
  const GRUENDER = [0xe8dcc4, 0xd9c9a8, 0xe4d4c0, 0xcdb9a0, 0xd8d0c0, 0xe0c8b0, 0xc8c0b8];
  const CONCRETE = [0xb8b4a8, 0xc9c4b8, 0xa8a8a0, 0xd2cabd, 0x9c9a94];
  const INDUSTRIAL = [0x8a4a3a, 0x9a5a48, 0x7a4636, 0xa06a50];

  /** generic building: style + wall color + roof type ('flat' | 'gable' | 'stepped' | 'hip') */
  function building(w, h, d, style, wall, roof, seed) {
    const g = new THREE.Group();
    const facade = T.facade(style, wall, seed, THEME.night);
    const bay = style === 'altstadt' ? 2.6 : style === 'modern' || style === 'glass' ? 3.0 : 3.4;
    const floorH = style === 'altstadt' ? 3.0 : 3.6;
    const b = tbox(w, h, d, facade, 0, h / 2, 0, 0xffffff, [bay * 4, floorH * 4]);
    // plain top
    b.material[2] = mat(PX.shade(wall, 0.8));
    g.add(b);
    const roofC = style === 'industrial' ? 0x555555 : style === 'altstadt' ? [0x9a3a2a, 0x7a3a30, 0x5a5a66][seed % 3] : [0x8a3a2c, 0x5a5a66, 0x7a4a3a, 0x6a4030][seed % 4];
    const roofTex = T.roof(roofC, seed);
    if (roof === 'gable') g.add(gable(w + 0.6, Math.min(w * 0.6, 6), d + 0.6, roofTex, 0xffffff, 0, h, 0));
    else if (roof === 'hip') { const r = gable(d + 0.6, Math.min(d * 0.5, 5), w + 0.6, roofTex, 0xffffff, 0, h, 0); r.rotation.y = Math.PI / 2; g.add(r); }
    else if (roof === 'stepped') {
      // stepped gable on the street side (+z): stack of narrowing boxes
      const steps = 3;
      for (let i = 0; i < steps; i++) { const sw = w - i * (w / (steps + 0.5)); g.add(tbox(sw, 1.6, 1.2, facade, 0, h + 0.8 + i * 1.6, d / 2 - 0.6, 0xffffff, [bay * 4, floorH * 4])); }
      g.add(gable(w + 0.4, Math.min(w * 0.7, 6), d - 1.4, roofTex, 0xffffff, 0, h, -0.7));
    } else {
      g.add(box(w + 0.4, 0.6, d + 0.4, PX.shade(wall, 0.65), 0, h + 0.3, 0));
      if (seed % 3 === 0) g.add(box(2, 2, 2, 0x777777, w / 4, h + 1.6, -d / 4));
    }
    // dormer / chimney
    if (seed % 2 === 0 && roof !== 'flat') g.add(box(1, 2.2, 1, 0x6a5a50, w / 4, h + 1.6, -d / 4));
    return g;
  }

  // ------------------------------------------------ Cologne landmarks ----
  const P = {};

  P.dom = () => {
    const g = new THREE.Group();
    const tr = T.tracery();
    const stone = 0xffffff, spireC = 0x2b2b31, roofC = 0x2c2c34;
    const S = 0.9; // slightly smaller than life
    const nave = tbox(44 * S, 42 * S, 110 * S, tr, 0, 21 * S, -10 * S, stone, [16, 24]); g.add(nave);
    g.add(gable(46 * S, 22 * S, 112 * S, T.roof(roofC, 2), 0xffffff, 0, 42 * S, -10 * S));
    const transept = tbox(80 * S, 42 * S, 26 * S, tr, 0, 21 * S, -30 * S, stone, [16, 24]); g.add(transept);
    const tRoof = gable(28 * S, 22 * S, 82 * S, T.roof(roofC, 2), 0xffffff, 0, 42 * S, -30 * S); tRoof.rotation.y = Math.PI / 2; g.add(tRoof);
    // crossing spire (Vierungsturm)
    g.add(cone(5 * S, 40 * S, spireC, 0, 84 * S, -30 * S, 8));
    // choir end (round apse)
    const apse = cyl(22 * S, 22 * S, 42 * S, 0xffffff, 0, 21 * S, -66 * S, 8); apse.material = tmat(tr.clone(), stone); apse.material.map.needsUpdate = true; apse.material.map.repeat.set(8, 2); g.add(apse);
    g.add(cone(23 * S, 22 * S, roofC, 0, 53 * S, -66 * S, 8));
    // twin towers with spires
    for (const x of [-15 * S, 15 * S]) {
      g.add(tbox(15 * S, 100 * S, 15 * S, tr, x, 50 * S, 45 * S, stone, [16, 24]));
      g.add(cone(9.5 * S, 57 * S, spireC, x, 128 * S, 45 * S, 8));
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cone(1.6 * S, 12 * S, spireC, x + dx * 6.5 * S, 106 * S, 45 * S + dz * 6.5 * S, 4));
      g.add(box(0.8, 5, 0.8, 0xffd700, x, 159 * S, 45 * S));
    }
    // flying buttresses & piers along the nave
    for (let z = -60; z <= 30; z += 12) {
      for (const sx of [-1, 1]) {
        g.add(box(3 * S, 30 * S, 3 * S, 0x3d3d44, sx * 31 * S, 15 * S, z * S));
        g.add(cone(2 * S, 8 * S, spireC, sx * 31 * S, 34 * S, z * S, 4));
        const fb = box(1.4, 2, 12 * S, 0x45454c, sx * 26.5 * S, 33 * S, z * S); fb.rotation.z = sx * 0.55; g.add(fb);
      }
    }
    // Domplatte: stone plaza
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(150, 190), tmat(T.cobble(0xb8b0a4, 4).clone(), 0xffffff)); plate.material.map.needsUpdate = true; plate.material.map.repeat.set(40, 50);
    plate.rotation.x = -Math.PI / 2; plate.position.set(0, 0.03, 0); g.add(plate);
    // pigeons... a few grey dots
    for (let i = 0; i < 10; i++) g.add(box(0.5, 0.4, 0.7, 0x8a8a90, -40 + i * 8, 0.25, 70 + (i % 3) * 4));
    return g;
  };
  P.stmartin = () => {
    const g = new THREE.Group();
    const tex = T.romanesque(0xc4ad8c);
    g.add(tbox(30, 24, 52, tex, 0, 12, 0, 0xffffff, [16, 16]));
    g.add(gable(31, 12, 53, T.roof(0x8a3a2a, 1), 0xffffff, 0, 24, 0));
    const trans = tbox(48, 24, 22, tex, 0, 12, -6, 0xffffff, [16, 16]); g.add(trans);
    const tr = gable(23, 11, 49, T.roof(0x8a3a2a, 1), 0xffffff, 0, 24, -6); tr.rotation.y = Math.PI / 2; g.add(tr);
    // massive crossing tower with four corner turrets (the Altstadt silhouette)
    g.add(tbox(18, 58, 18, tex, 0, 29, -6, 0xffffff, [16, 16]));
    g.add(cone(12.5, 24, 0x6a3a2a, 0, 70, -6, 4));
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.add(cyl(2.3, 2.3, 22, 0xc4ad8c, dx * 9, 58, -6 + dz * 9, 6)); g.add(cone(2.8, 8, 0x6a3a2a, dx * 9, 73, -6 + dz * 9, 6)); }
    // apse
    g.add(cyl(11, 11, 22, 0xc4ad8c, 0, 11, -30, 8)); g.add(cone(12, 8, 0x8a3a2a, 0, 26, -30, 8));
    return g;
  };
  P.altstadt = (o) => {
    // a row of narrow, colourful gabled houses (Fischmarkt / Frankenwerft style)
    const g = new THREE.Group(); const n = (o && o.n) || 7; const r = mulberry((o && o.seed) || 5);
    let x = 0; const total = [];
    for (let i = 0; i < n; i++) { const w = 6 + Math.floor(r() * 3) * 1.2; total.push(w); }
    const width = total.reduce((a, b) => a + b, 0); x = -width / 2;
    for (let i = 0; i < n; i++) {
      const w = total[i], h = 12 + Math.floor(r() * 3) * 3, d = 12;
      const b = building(w, h, d, 'altstadt', PASTEL[Math.floor(r() * PASTEL.length)], r() < 0.5 ? 'stepped' : 'gable', Math.floor(r() * 1000));
      b.position.set(x + w / 2, 0, 0); g.add(b); x += w;
    }
    // Brauhaus sign on one of them
    const s = textPlane('BRAUHAUS', '#ffd400', '#7a1a1a', 7, 1.3, false, { border: '#ffd400' }); s.position.set(-width / 2 + total[0] / 2, 5, 6.1); g.add(s);
    const glass = cyl(0.35, 0.3, 1.4, 0xffc300, -width / 2 + total[0] / 2 + 4.2, 5, 6.3, 8); g.add(glass);
    return g;
  };
  P.row = (o) => {
    // generic street row: style gruenderzeit | concrete | industrial | modern
    const g = new THREE.Group(); const n = (o && o.n) || 5; const style = (o && o.style) || 'gruenderzeit'; const r = mulberry((o && o.seed) || 9);
    const cols = style === 'gruenderzeit' ? GRUENDER : style === 'industrial' ? INDUSTRIAL : style === 'modern' ? [0x9fc4e0, 0x8fb4d0, 0xb0c8d8] : CONCRETE;
    const widths = []; for (let i = 0; i < n; i++) widths.push(9 + Math.floor(r() * 3) * 3);
    const width = widths.reduce((a, b) => a + b, 0); let x = -width / 2;
    for (let i = 0; i < n; i++) {
      const w = widths[i], h = style === 'industrial' ? 10 + Math.floor(r() * 2) * 4 : 14 + Math.floor(r() * 3) * 3.6, d = 14;
      const b = building(w, h, d, style, cols[Math.floor(r() * cols.length)], style === 'gruenderzeit' ? 'hip' : 'flat', Math.floor(r() * 1000));
      b.position.set(x + w / 2, 0, 0); g.add(b); x += w;
    }
    return g;
  };
  P.hbf = () => {
    const g = new THREE.Group();
    g.add(tbox(130, 14, 34, T.facade('concrete', 0xb9b3a5, 3, THEME.night), 0, 7, 0, 0xffffff, [14, 14]));
    const hall = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 130, 10, 1, false, 0, Math.PI), tmat(T.steel(0x6f8f9f), 0xffffff));
    hall.rotation.z = Math.PI / 2; hall.position.y = 14; g.add(hall);
    const sign = textPlane('KÖLN HAUPTBAHNHOF', '#ffffff', '#1c3f95', 36, 3.6, THEME.night, { border: '#ffffff' }); sign.position.set(0, 19, 17.5); g.add(sign);
    const clock = textPlane('DB', '#ffffff', '#c1121f', 4, 4, THEME.night); clock.position.set(-52, 12, 17.3); g.add(clock);
    // platforms with a train
    for (let i = 0; i < 3; i++) g.add(box(120, 0.6, 3, 0x9a9a9a, 0, 0.3, -20 - i * 7));
    const ice = box(70, 3.6, 2.8, 0xf4f4f4, -10, 2.1, -23.5); g.add(ice); g.add(box(70, 0.6, 2.9, 0xc1121f, -10, 1.6, -23.5));
    return g;
  };
  P.museum = () => {
    const g = new THREE.Group(); g.add(tbox(52, 18, 32, T.facade('modern', 0xc9c2b4, 4, THEME.night), 0, 9, 0, 0xffffff, [12, 12]));
    // saw-tooth roof of Museum Ludwig
    for (let i = 0; i < 6; i++) { const r = gable(8.5, 5, 32, T.steel(0x7a94a2), 0xffffff, -21 + i * 8.5, 18, 0); g.add(r); }
    const s = textPlane('MUSEUM LUDWIG', '#111', '#f2f2f2', 20, 2.5); s.position.set(0, 8, 16.2); g.add(s);
    return g;
  };
  P.triangle = () => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 100, 3), tmat(T.facade('glass', 0x6f9fc8, 8, THEME.night).clone(), 0xffffff));
    t.material.map.needsUpdate = true; t.material.map.repeat.set(12, 8); t.position.y = 50; g.add(t);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(23, 23, 2, 3), mat(0xdddddd))).position.y = 101;
    return g;
  };
  P.musicaldome = () => { const g = new THREE.Group(); g.add(cone(34, 28, 0x1f4fbf, 0, 14, 0, 12)); g.add(cone(6, 6, 0xffffff, 0, 30, 0, 12)); g.add(box(60, 3, 60, 0x9a9a9a, 0, 1.5, 0)); return g; };
  P.lvr = P.triangle;
  P.kranhaus = () => {
    const g = new THREE.Group();
    const f = T.facade('glass', 0x8fb3c9, 6, THEME.night);
    // vertical shaft near the street, the upper block cantilevers out over the river (away from the road)
    g.add(tbox(16, 62, 22, f, 0, 31, 0, 0xffffff, [12, 12]));
    g.add(tbox(16, 22, 62, f, 0, 51, -20, 0xffffff, [12, 12]));
    g.add(box(5, 40, 5, 0x555555, 0, 20, -46));
    return g;
  };
  P.schoko = () => {
    const g = new THREE.Group();
    g.add(tbox(56, 15, 24, T.facade('glass', 0x9fb7c8, 7, THEME.night), 0, 7.5, 0, 0xffffff, [12, 12]));
    const bow = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 24, 8, 1, false, 0, Math.PI), tmat(T.steel(0xa9c2d2), 0xffffff)); bow.rotation.z = Math.PI / 2; bow.position.set(0, 15, 0); g.add(bow);
    const sign = textPlane('SCHOKOLADENMUSEUM', '#4b2a12', '#f2e2c8', 36, 3.4); sign.position.set(0, 11, 12.2); g.add(sign);
    return g;
  };
  P.severinstor = () => {
    const g = new THREE.Group();
    const tex = T.romanesque(0x9a8468);
    g.add(tbox(11, 28, 9, tex, -13, 14, 0, 0xffffff, [16, 16])); g.add(tbox(11, 28, 9, tex, 13, 14, 0, 0xffffff, [16, 16]));
    g.add(tbox(37, 7, 9, tex, 0, 25, 0, 0xffffff, [16, 16]));
    g.add(cone(7, 9, 0x5a3a2a, -13, 32.5, 0, 4)); g.add(cone(7, 9, 0x5a3a2a, 13, 32.5, 0, 4));
    // battlements
    for (let x = -18; x <= 18; x += 4) g.add(box(2, 1.6, 9.4, 0x8a7458, x, 29.3, 0));
    return g;
  };
  P.hahnentor = P.severinstor;
  P.colonius = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 250, 10), tmat(T.steel(0xbfc4c9).clone(), 0xffffff))).position.y = 125;
    g.children[0].material.map.needsUpdate = true; g.children[0].material.map.repeat.set(4, 40);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(16, 12, 14, 12), tmat(T.facade('glass', 0xd9dde0, 5, THEME.night), 0xffffff)); disc.position.y = 170; g.add(disc);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 40, 6), mat(0xff3333))).position.y = 270;
    const l = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); l.position.y = 290; l.userData.blink = true; g.add(l); animated.push(l);
    return g;
  };
  P.helios = () => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 40, 8), tmat(T.brick(0xe6dccb), 0xffffff)); t.position.y = 20; g.add(t); const top = cyl(4.5, 4.5, 4, 0x3f3f3f, 0, 42, 0, 8); g.add(top); const l = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffee88 })); l.position.y = 46; g.add(l); return g; };
  P.arena = () => {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), tmat(T.facade('glass', 0x3a4a70, 9, THEME.night).clone(), 0xffffff)); dome.material.map.needsUpdate = true; dome.material.map.repeat.set(10, 4); g.add(dome);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(52, 2.2, 6, 24, Math.PI), new THREE.MeshBasicMaterial({ color: THEME.night ? 0x7fd3ff : 0xd8e8f0 })); arch.position.y = 2; g.add(arch);
    const sign = textPlane('ARENA KÖLLE', '#00e5ff', '#0b0f2a', 40, 5, true); sign.position.set(0, 50, 0); g.add(sign);
    return g;
  };
  P.messeturm = () => { const g = new THREE.Group(); const b = T.brick(0x9a4a34); g.add(tbox(18, 70, 18, b, 0, 35, 0, 0xffffff, [6, 6])); g.add(tbox(12, 12, 12, b, 0, 76, 0, 0xffffff, [6, 6])); g.add(box(2, 8, 2, 0x333333, 0, 86, 0)); g.add(tbox(120, 18, 40, T.facade('industrial', 0x9a4a34, 3, THEME.night), 60, 9, 0, 0xffffff, [14, 14])); return g; };
  P.flora = () => { const g = new THREE.Group(); g.add(tbox(50, 14, 26, T.facade('gruenderzeit', 0xe9e2d3, 2, THEME.night), 0, 7, 0, 0xffffff, [14, 14])); const dome = new THREE.Mesh(new THREE.SphereGeometry(12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), tmat(T.facade('glass', 0x8fd3c9, 2, false), 0xffffff)); dome.position.y = 14; g.add(dome); for (let i = 0; i < 6; i++) g.add(P.tree(i * 1.3)).position.set(-30 + i * 12, 0, 22); return g; };
  P.elephant = () => { const g = new THREE.Group(); g.add(box(7, 4.5, 4, 0x8a8a8a, 0, 4, 0)); g.add(box(3.5, 3.5, 3.5, 0x8a8a8a, 5, 5, 0)); g.add(box(0.8, 4, 0.8, 0x8a8a8a, 6.5, 2.4, 0)); for (const [x, z] of [[-2.5, -1.3], [-2.5, 1.3], [2.5, -1.3], [2.5, 1.3]]) g.add(box(1.4, 2, 1.4, 0x777777, x, 1, z)); g.add(box(0.4, 3, 3, 0x9a9a9a, 5, 5, 0)); g.add(box(8, 0.3, 6, 0x6a5a40, 0, 0.15, 0)); return g; };
  P.koelsch = () => {
    const g = new THREE.Group();
    const glass = cyl(3, 3, 16, 0xffc300, 0, 8, 0, 12); glass.material.transparent = true; glass.material.opacity = 0.92; g.add(glass);
    g.add(cyl(3.2, 3.2, 2.5, 0xffffff, 0, 17, 0, 12));
    const label = textPlane('TÜNN KÖLSCH', '#c1121f', '#ffffff', 5.5, 2.4, false, { border: '#c1121f' }); label.position.set(0, 9, 3.05); g.add(label);
    const label2 = label.clone(); label2.position.set(0, 9, -3.05); label2.rotation.y = Math.PI; g.add(label2);
    return g;
  };
  P.billboard = (o) => {
    const g = new THREE.Group();
    const s = textPlane(o.text, '#1a1a1a', '#f6e7b8', 16, 4, false, { border: '#c1121f' });
    s.position.y = 5.5; g.add(s);
    g.add(box(0.4, 3.5, 0.4, 0x555555, -6, 1.75, 0)); g.add(box(0.4, 3.5, 0.4, 0x555555, 6, 1.75, 0));
    return g;
  };
  P.neon = (o) => {
    const g = new THREE.Group();
    const s = textPlane(o.text, o.color || '#ff2d95', '#0a0a18', 18, 4, true, { border: o.color || '#ff2d95' });
    s.position.y = 6; g.add(s);
    g.add(box(0.5, 4, 0.5, 0x333344, -7, 2, 0)); g.add(box(0.5, 4, 0.5, 0x333344, 7, 2, 0));
    if (o.light !== false) { const light = new THREE.PointLight(new THREE.Color(o.color || '#ff2d95'), 1.2, 60); light.position.set(0, 6, 3); g.add(light); }
    return g;
  };
  P.graffiti = (o) => {
    const g = new THREE.Group();
    g.add(tbox(18, 5, 1, T.brick(0x8b8378), 0, 2.5, 0, 0xffffff, [4, 4]));
    const s = textPlane(o.text, o.color || '#ff2d95', '#6a4a8e', 16, 3.5, false, { border: '#ffd400' }); s.position.set(0, 2.6, 0.55); g.add(s);
    return g;
  };
  P.viaduct = () => {
    // Ehrenfeld Bahnbögen: brick railway viaduct with arches & street art
    const g = new THREE.Group(); const b = T.brick(0x8a4a3a);
    const wall = tbox(160, 9, 8, b, 0, 4.5, 0, 0xffffff, [4, 4]); g.add(wall);
    for (let x = -72; x <= 72; x += 16) {
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8.4, 10, 1, false, 0, Math.PI), mat(0x1c1a20)); arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.position.set(x, 0, 0); g.add(arch);
      const art = textPlane(['KÖLLE', 'EHRENFELD', 'ALAAF', 'TÜNN', 'FC', 'JECK'][((x + 72) / 16) % 6], ['#ff2d95', '#ffd400', '#00e5ff', '#7fff00'][((x + 72) / 16) % 4], '#2a2a35', 8, 4, false); art.position.set(x + 8, 2.5, 4.05); g.add(art);
    }
    g.add(box(160, 0.5, 8.5, 0x555555, 0, 9.25, 0));
    const tram = box(28, 3.4, 2.6, 0xe30613, 20, 11.2, 0); g.add(tram); g.add(box(28, 1, 2.7, 0xffffff, 20, 11.6, 0));
    return g;
  };
  P.buedchen = () => {
    const g = new THREE.Group();
    g.add(tbox(5, 3, 3.5, T.facade('concrete', 0xd8cfae, 1, THEME.night), 0, 1.5, 0, 0xffffff, [5, 3]));
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.6), tmat(T.stripes(0xc1121f, 0xffffff), 0xffffff, { side: THREE.DoubleSide })); awning.rotation.x = -Math.PI / 2 + 0.5; awning.position.set(0, 3.3, 2.3); g.add(awning);
    const sign = textPlane('BÜDCHE · KÖLSCH · KAMELLE', '#111', '#ffd400', 5, 0.8, THEME.night); sign.position.set(0, 3.5, 1.8); g.add(sign);
    for (let i = 0; i < 3; i++) g.add(box(0.9, 0.6, 0.6, [0xc1121f, 0x1c3f95, 0x2d6a4f][i], -3 + i * 1, 0.3, 1.5));
    g.add(box(0.5, 1.2, 0.5, 0xf1c27d, 3.4, 0.6, 1.4)); // Büdchen-Kunde
    return g;
  };
  P.haltestelle = () => {
    const g = new THREE.Group();
    g.add(cyl(0.12, 0.12, 4, 0x555555, 0, 2, 0, 6));
    const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d');
    x.fillStyle = '#ffd400'; x.beginPath(); x.arc(16, 16, 15, 0, Math.PI * 2); x.fill(); x.fillStyle = '#0a7a3a'; x.beginPath(); x.arc(16, 16, 12, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffd400'; x.font = 'bold 18px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', 16, 17);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, transparent: true })); sign.position.y = 3.6; g.add(sign);
    g.add(box(3, 2.4, 1.2, 0x9fb0b8, 2.5, 1.2, -0.5)); g.add(box(3.4, 0.2, 1.6, 0x444444, 2.5, 2.5, -0.5));
    return g;
  };
  P.lamp = () => { const g = new THREE.Group(); g.add(cyl(0.12, 0.16, 7, 0x444444, 0, 3.5, 0, 6)); const arm = box(1.6, 0.15, 0.15, 0x444444, 0.7, 7, 0); g.add(arm); const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), THEME.night ? new THREE.MeshBasicMaterial({ color: 0xffe8a0 }) : mat(0xdddddd)); head.position.set(1.4, 6.9, 0); g.add(head); return g; };
  P.flag = (o) => { const g = new THREE.Group(); g.add(cyl(0.08, 0.1, 6, 0x777777, 0, 3, 0, 6)); const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), tmat(T.stripes((o && o.a) || 0xc1121f, (o && o.b) || 0xffffff), 0xffffff, { side: THREE.DoubleSide })); f.position.set(1.15, 5.2, 0); f.userData.flag = true; g.add(f); animated.push(f); return g; };
  P.bunting = () => {
    // carnival bunting across the street
    const g = new THREE.Group(); const cols = [0xff5fa2, 0xffd400, 0x00a0ff, 0x7fff00, 0xffffff, 0xff2d2d];
    for (let x = -14; x <= 14; x += 1.2) { const y = 6.5 - Math.cos(x / 14 * Math.PI / 2) * 1.2; const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), mat(cols[Math.floor(Math.abs(x) * 1.7) % cols.length], { side: THREE.DoubleSide })); f.position.set(x, y, 0); g.add(f); }
    g.add(box(30, 0.06, 0.06, 0x333333, 0, 6.6, 0));
    g.add(cyl(0.12, 0.12, 7, 0x555555, -15, 3.5, 0, 6)); g.add(cyl(0.12, 0.12, 7, 0x555555, 15, 3.5, 0, 6));
    return g;
  };
  P.chimney = () => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 70, 8), tmat(T.brick(0x8a4a3a).clone(), 0xffffff)); c.material.map.needsUpdate = true; c.material.map.repeat.set(3, 12); c.position.y = 35; g.add(c); g.add(cyl(2.4, 2.4, 3, 0xdddddd, 0, 60, 0, 8)); g.add(cyl(2.4, 2.4, 3, 0xc1121f, 0, 66, 0, 8)); g.add(tbox(50, 16, 30, T.facade('industrial', 0x8a4a3a, 4, THEME.night), 20, 8, 0, 0xffffff, [14, 14])); return g; };
  P.figure = (h, coat, hat, skin) => {
    const g = new THREE.Group();
    g.add(box(0.8 * h, 1.7 * h, 0.5 * h, coat, 0, 1.75 * h, 0));
    const head = box(0.6 * h, 0.6 * h, 0.55 * h, skin || 0xf1c27d, 0, 3.0 * h, 0); g.add(head);
    g.add(box(0.3 * h, 0.9 * h, 0.3 * h, 0x222222, -0.25 * h, 0.45 * h, 0)); g.add(box(0.3 * h, 0.9 * h, 0.3 * h, 0x222222, 0.25 * h, 0.45 * h, 0));
    if (hat) { g.add(box(1.0 * h, 0.1 * h, 1.0 * h, hat, 0, 3.32 * h, 0)); g.add(box(0.6 * h, 0.6 * h, 0.6 * h, hat, 0, 3.65 * h, 0)); }
    return g;
  };
  P.tuenn = () => { const g = P.figure(1.5, 0x1a1a1a, 0x111111); g.userData.wave = true; animated.push(g);
    g.add(box(0.6, 0.1, 0.1, 0xd0a060, 0.6, 4.4, 0.4));
    const glass = cyl(0.12, 0.1, 0.5, 0xffc300, -0.9, 3.2, 0.4, 6); g.add(glass);
    const sign = textPlane('DER LANGE TÜNN', '#ffd400', '#111111', 6, 1.2, THEME.night, { border: '#ffd400' }); sign.position.set(0, 6.6, 0); g.add(sign); return g; };
  P.schael = () => { const g = P.figure(0.9, 0x2d6a4f, 0x8a5a2a); const sign = textPlane('SCHÄL', '#ffffff', '#2d6a4f', 3, 0.9, false, { border: '#fff' }); sign.position.set(0, 4.1, 0); g.add(sign); return g; };
  P.gangster = () => P.figure(1.0, 0x2a2a2a, 0x1a1a1a);
  P.crowd = () => {
    const g = new THREE.Group();
    const cols = [0xc1121f, 0xffffff, 0xffd400, 0x1c3f95, 0xff5fa2, 0x2d6a4f, 0xff8800];
    const r = mulberry(31);
    for (let i = 0; i < 10; i++) { const f = P.figure(0.55 + r() * 0.25, cols[i % cols.length], r() < 0.3 ? cols[(i + 3) % cols.length] : null); f.position.set((i - 4.5) * 1.3, 0, (r() - 0.5) * 2); f.userData.bounce = r() * 6; g.add(f); }
    g.add(box(14, 0.8, 0.3, 0x8a5a2a, 0, 0.4, 1.4)); // barrier
    g.userData.crowd = true; animated.push(g);
    return g;
  };
  P.lastenrad = () => { const g = new THREE.Group(); g.add(box(2.4, 0.8, 1.2, 0x9b5de5, 0, 0.9, 0)); for (const x of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 6, 10), mat(0x222222)); w.position.set(x, 0.5, 0); w.rotation.y = Math.PI / 2; g.add(w); } return g; };
  P.boat = () => { const g = new THREE.Group(); g.add(box(26, 2.5, 6, 0xf4f4f4, 0, 0.9, 0)); g.add(box(16, 2, 5, 0x1c3f95, 0, 3, 0)); g.add(box(1, 3, 1, 0x333333, -4, 5.5, 0)); const s = textPlane('KD RHEINSCHIFF', '#1c3f95', '#ffffff', 12, 1.4); s.position.set(0, 1.4, 3.05); g.add(s); g.userData.boat = true; animated.push(g); return g; };
  P.barge = () => { const g = new THREE.Group(); g.add(box(60, 2, 9, 0x4a4a52, 0, 0.8, 0)); g.add(box(50, 1.2, 8, 0x2f2f36, 0, 2.2, 0)); g.add(box(6, 4, 6, 0xf0f0f0, -25, 3.8, 0)); g.userData.boat = true; animated.push(g); return g; };
  function water(w, l) {
    const tex = T.water(THEME.water).clone(); tex.needsUpdate = true; tex.repeat.set(w / 16, l / 8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), tmat(tex, 0xffffff, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.y = WATER_Y - GROUND_Y; m.userData.water = tex; animated.push(m);
    return m;
  }
  P.rhine = (o) => {
    // crosses the track under a bridge / jump; extent per side is clipped so the river never
    // runs under other parts of the circuit (o.extent = [left, right] metres, filled in by buildScenery)
    const g = new THREE.Group(); const ex = (o && o.extent) || [450, 450]; const wd = (o && o.w) || 130;
    // extent[0] was measured along -B, which is local +x after the yaw; extent[1] along +B = local -x
    const right = water(ex[0], wd); right.position.x = ex[0] / 2; g.add(right);
    const left = water(ex[1], wd); left.position.x = -ex[1] / 2; g.add(left);
    return g;
  };
  P.rhineSide = (o) => { const g = new THREE.Group(); g.add(water((o && o.w) || 260, (o && o.l) || 800)); g.rotation.y = Math.PI / 2; return g; }; // runs alongside
  P.promenade = () => { // Rhine promenade: plane trees + railing
    const g = new THREE.Group(); for (let x = -90; x <= 90; x += 15) { g.add(P.tree(2)).position.set(x, 0, 0); } g.add(box(200, 1, 0.2, 0x3a3a3a, 0, 0.6, 4)); for (let x = -100; x <= 100; x += 5) g.add(box(0.2, 1.1, 0.2, 0x3a3a3a, x, 0.55, 4)); return g; };
  P.rails = () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(300, 8), tmat(T.rails().clone(), 0xffffff)); m.material.map.needsUpdate = true; m.material.map.repeat.set(75, 2); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; g.add(m); return g; };
  P.hbarch = () => {
    // Hohenzollernbrücke: tied steel arches beside the road + parallel rail bridge with a train
    const g = new THREE.Group(); const steel = tmat(T.steel(0x2f6b4f), 0xffffff);
    const arch = (z) => { const a = new THREE.Mesh(new THREE.TorusGeometry(40, 1.6, 6, 24, Math.PI), steel); a.position.set(0, 0, z); g.add(a);
      for (let i = -4; i <= 4; i++) { const x = i * 8.5; const h = Math.sqrt(Math.max(0, 40 * 40 - x * x)); g.add(box(0.5, h, 0.5, 0x2f6b4f, x, h / 2, z)); } };
    arch(-8.6); arch(8.6); arch(24); arch(40);
    // rail deck between the second pair of arches
    g.add(box(120, 1.2, 16, 0x555555, 0, 0.4, 32));
    const r = new THREE.Mesh(new THREE.PlaneGeometry(120, 16), tmat(T.rails().clone(), 0xffffff)); r.material.map.needsUpdate = true; r.material.map.repeat.set(30, 4); r.rotation.x = -Math.PI / 2; r.position.set(0, 1.05, 32); g.add(r);
    const train = new THREE.Group(); train.add(box(60, 3.8, 3, 0xf4f4f4, 0, 3, 0)); train.add(box(60, 0.7, 3.1, 0xc1121f, 0, 2.2, 0)); train.add(box(60, 1, 3.05, 0x1c2a3a, 0, 3.6, 0)); train.position.set(-30, 0, 30); train.userData.train = true; g.add(train); animated.push(train);
    // love locks
    g.add(box(90, 1.2, 0.25, 0xffd700, 0, 1.4, -8.7));
    // portal towers
    for (const x of [-58, 58]) for (const z of [-12, 44]) { g.add(tbox(6, 12, 6, T.romanesque(0x8a7a68), x, 6, z, 0xffffff, [16, 16])); g.add(cone(4.2, 5, 0x5a5a66, x, 14.5, z, 4)); }
    return g;
  };
  P.severinsbruecke = () => {
    // cable-stayed bridge with the characteristic A-pylon, runs along local X
    const g = new THREE.Group(); const steelC = 0x6a7a80;
    g.add(box(320, 2.2, 22, 0x6f6f74, 0, 12, 0));
    const py = 78;
    for (const z of [-8, 8]) { const leg = box(3, py, 3, steelC, 0, py / 2, z); leg.rotation.x = z > 0 ? -0.1 : 0.1; g.add(leg); }
    for (let i = 1; i <= 7; i++) { for (const s of [-1, 1]) { const x = s * i * 20; const len = Math.sqrt(x * x + (py - 14) * (py - 14)); const c = box(0.3, len, 0.3, 0xdddddd, x / 2, 14 + (py - 14) / 2, 0); c.rotation.z = Math.atan2(x, py - 14) * -1; g.add(c); } }
    for (let x = -150; x <= 150; x += 60) g.add(box(6, 12, 20, 0x5a5a5e, x, 5, 0));
    return g;
  };
  P.suspension = () => {
    // Mülheimer Brücke style: green suspension bridge along local X
    const g = new THREE.Group(); const c = 0x2f6b4f;
    g.add(box(360, 2.2, 22, 0x6f6f74, 0, 14, 0));
    for (const x of [-110, 110]) { for (const z of [-9, 9]) g.add(box(3, 60, 3, c, x, 30, z)); g.add(box(24, 3, 3, c, x, 58, 0)); }
    for (let x = -170; x <= 170; x += 6) { const u = Math.abs(x) <= 110 ? (x / 110) : 0; const y = Math.abs(x) <= 110 ? 58 - (1 - u * u) * 36 : 58 - (Math.abs(x) - 110) / 60 * 40; for (const z of [-9, 9]) { g.add(box(0.5, 0.5, 0.5, c, x, y, z)); g.add(box(0.2, Math.max(0.5, y - 15), 0.2, c, x, 15 + (y - 15) / 2, z)); } }
    return g;
  };
  P.zoobruecke = () => { const g = new THREE.Group(); g.add(box(300, 3, 26, 0x2f6b4f, 0, 12, 0)); for (let x = -120; x <= 120; x += 60) g.add(box(4, 12, 6, 0x777777, x, 5, 0)); for (let x = -140; x <= 140; x += 20) g.add(P.lamp()).position.set(x, 13.5, 12); return g; };
  P.seilbahn = () => { const g = new THREE.Group(); for (const x of [-120, 120]) for (const z of [-4, 4]) g.add(box(2, 40, 2, 0x555555, x, 20, z));
    g.add(box(240, 0.15, 0.15, 0x222222, 0, 36, 0));
    for (let i = 0; i < 6; i++) { const c = box(2.5, 2.5, 2.5, [0xff5fa2, 0xffd400, 0x00a0ff][i % 3], -100 + i * 40, 33.5, 0); c.userData.gondola = i; g.add(c); animated.push(c); }
    return g; };
  P.tree = (seed) => { const g = new THREE.Group(); const s = 1 + ((seed || 0) % 3) * 0.3; g.add(box(0.6, 2.5 * s, 0.6, 0x5a3a1a, 0, 1.25 * s, 0)); const c1 = box(3.2 * s, 2.6 * s, 3.2 * s, 0x2f7a3a, 0, 3.6 * s, 0); g.add(c1); g.add(box(2.2 * s, 1.6 * s, 2.2 * s, 0x3f9a48, 0, 5.4 * s, 0)); return g; };
  P.tram = () => { const g = new THREE.Group(); g.add(box(2.4, 2.2, 14, 0xe30613, 0, 1.5, 0)); g.add(box(2.42, 0.8, 13.6, 0x9fd3ff, 0, 1.9, 0)); g.add(box(2.4, 0.3, 14.2, 0xdddddd, 0, 2.75, 0)); g.add(box(0.1, 1.2, 1.6, 0x333333, 0, 3.4, 0)); const s = textPlane('KVB  1  WEIDEN WEST', '#ffb000', '#222222', 2.2, 0.5); s.position.set(0, 2.9, 7.01); g.add(s); return g; };
  P.house = (seed) => { const r = mulberry(seed); const styles = THEME.street === 'altstadt' ? ['altstadt'] : THEME.street === 'industrial' ? ['industrial', 'concrete'] : THEME.street === 'modern' ? ['modern', 'concrete'] : ['gruenderzeit', 'gruenderzeit', 'concrete']; const st = styles[Math.floor(r() * styles.length)];
    const cols = st === 'altstadt' ? PASTEL : st === 'gruenderzeit' ? GRUENDER : st === 'industrial' ? INDUSTRIAL : st === 'modern' ? [0x9fc4e0, 0x8fb4d0] : CONCRETE;
    const w = st === 'altstadt' ? 6 + r() * 3 : 9 + r() * 6, d = 10 + r() * 6, h = st === 'altstadt' ? 11 + r() * 6 : 12 + r() * 10;
    return building(w, h, d, st, cols[Math.floor(r() * cols.length)], st === 'altstadt' ? (r() < 0.5 ? 'stepped' : 'gable') : st === 'gruenderzeit' ? 'hip' : 'flat', Math.floor(r() * 1000)); };

  // ------------------------------------------------ road ----
  function buildRoad(track, theme) {
    const S = track.samples, n = S.length;
    const pos = [], col = [], uv = [], idx = [];
    const c1 = new THREE.Color(theme.road[0]), c2 = new THREE.Color(theme.road[1]);
    const cRed = new THREE.Color(0xd22a2a), cWhite = new THREE.Color(0xf2f2f2), cLine = new THREE.Color(0xf5e27a);
    const cStart = new THREE.Color(0xffffff), cStartB = new THREE.Color(0x111111), cWalk = new THREE.Color(0xb9b3a8), cUnder = new THREE.Color(0x2a2a2a);
    let vi = 0;
    function quad(a, b, c, d, color, u0, u1, v0, v1) {
      for (const p of [a, b, c, d]) { pos.push(p.x, p.y, p.z); col.push(color.r, color.g, color.b); }
      uv.push(u0, v0, u1, v0, u0, v1, u1, v1);
      idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
      vi += 4;
    }
    const off = (s, lat, up) => new THREE.Vector3(s.p.x + s.B.x * lat + s.N.x * up, s.p.y + s.B.y * lat + s.N.y * up, s.p.z + s.B.z * lat + s.N.z * up);
    const city = theme.street && theme.street !== 'park';
    for (let i = 0; i < n; i++) {
      const a = S[i], b = S[(i + 1) % n];
      if (a.kind === 'gap') continue;
      const stripe = Math.floor(i / 6) % 2 === 0;
      let color = stripe ? c1 : c2;
      const nearStart = i < 6 || i >= n - 2;
      if (nearStart) color = (Math.floor(i / 2) % 2 === 0) ? cStart : cStartB;
      const h = 0.1, v0 = i / 2.5, v1 = (i + 1) / 2.5;
      quad(off(a, -ROAD_W, h), off(a, ROAD_W, h), off(b, -ROAD_W, h), off(b, ROAD_W, h), color, 0, 5, v0, v1);
      const curb = Math.floor(i / 4) % 2 === 0 ? cRed : cWhite;
      quad(off(a, -ROAD_W - 1.1, h + 0.05), off(a, -ROAD_W, h + 0.05), off(b, -ROAD_W - 1.1, h + 0.05), off(b, -ROAD_W, h + 0.05), curb, 0, 0.1, v0, v1);
      quad(off(a, ROAD_W, h + 0.05), off(a, ROAD_W + 1.1, h + 0.05), off(b, ROAD_W, h + 0.05), off(b, ROAD_W + 1.1, h + 0.05), curb, 0, 0.1, v0, v1);
      if (Math.floor(i / 4) % 2 === 0 && !nearStart) quad(off(a, -0.18, h + 0.04), off(a, 0.18, h + 0.04), off(b, -0.18, h + 0.04), off(b, 0.18, h + 0.04), cLine, 0, 0.05, v0, v1);
      // sidewalks in the city
      const flat = a.kind === 'straight' || a.kind === 'curve' || a.kind === 'hill' || a.kind === 'dip' || a.kind === 'tunnel';
      if (city && flat) {
        quad(off(a, -ROAD_W - 4.5, h + 0.12), off(a, -ROAD_W - 1.1, h + 0.12), off(b, -ROAD_W - 4.5, h + 0.12), off(b, -ROAD_W - 1.1, h + 0.12), cWalk, 0, 1.4, v0, v1);
        quad(off(a, ROAD_W + 1.1, h + 0.12), off(a, ROAD_W + 4.5, h + 0.12), off(b, ROAD_W + 1.1, h + 0.12), off(b, ROAD_W + 4.5, h + 0.12), cWalk, 0, 1.4, v0, v1);
      }
      if (a.kind === 'loop' || a.kind === 'ramp' || a.p.y > 1.5) quad(off(a, ROAD_W, -0.3), off(a, -ROAD_W, -0.3), off(b, ROAD_W, -0.3), off(b, -ROAD_W, -0.3), cUnder, 0, 2, v0, v1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const tex = theme.street === 'altstadt' ? T.cobble(0xe8e2dc, 3) : T.asphalt(0xffffff, 2);
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex, side: THREE.DoubleSide });
    const group = new THREE.Group();
    group.add(new THREE.Mesh(g, m));
    group.add(buildRoadDetails(track, theme));
    return group;
  }

  function buildRoadDetails(track, theme) {
    const S = track.samples, n = S.length;
    const g = new THREE.Group();
    const steel = tmat(T.steel(0x2f6b4f), 0xffffff), post = mat(0x555555), tunnelM = tmat(T.brick(theme.night ? 0x3a3a55 : 0x8a7a6a), 0xffffff, { side: THREE.DoubleSide });
    const off = (s, lat, up) => new THREE.Vector3(s.p.x + s.B.x * lat + s.N.x * up, s.p.y + s.B.y * lat + s.N.y * up, s.p.z + s.B.z * lat + s.N.z * up);
    const railGeo = new THREE.BoxGeometry(0.25, 1.1, 1.05);
    for (let i = 0; i < n; i++) {
      const s = S[i];
      if (s.kind === 'loop' && i % 8 === 0 && s.p.y > 2.5) {
        for (const side of [-1, 1]) { const top = off(s, side * (ROAD_W + 0.6), -0.3); const h = top.y - GROUND_Y; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, h, 6), post); c.position.set(top.x, GROUND_Y + h / 2, top.z); g.add(c); }
      }
      if (s.kind === 'bridge') {
        for (const side of [-1, 1]) { const r = new THREE.Mesh(railGeo, steel); const p = off(s, side * (ROAD_W + 1.3), 0.6); r.position.copy(p); r.lookAt(p.clone().add(V(s.T))); g.add(r); }
        if (i % 12 === 0) { const p = off(s, 0, -0.5); const pyl = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W * 2 + 3, 1.4, 1.5), steel); pyl.position.set(p.x, p.y - 0.9, p.z); g.add(pyl); }
        if (i % 24 === 0) { const l = P.lamp(); const p = off(s, ROAD_W + 1.6, 0); l.position.copy(p); l.rotation.y = Math.atan2(s.T.x, s.T.z) + Math.PI; g.add(l); }
      }
      if (s.kind === 'tunnel' && i % 2 === 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(ROAD_W + 1.8, 0.9, 6, 12, Math.PI), tunnelM); const p = off(s, 0, 0.6); ring.position.copy(p); ring.lookAt(p.clone().add(V(s.T))); g.add(ring); if (i % 10 === 0) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1.5), new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); l.position.copy(off(s, 0, 7.0)); g.add(l); } }
      if (s.kind === 'ramp' && i % 4 === 0) { const p = off(s, 0, -0.3); const h = Math.max(0.2, p.y - GROUND_Y); const b = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W * 2 + 1.5, h, 2.2), tmat(T.stripes(0xffd400, 0x222222), 0xffffff)); b.position.set(p.x, GROUND_Y + h / 2, p.z); g.add(b); }
    }
    // start gantry
    const s0 = S[2];
    const banner = textPlane('STUNTS KÖLLE 4D  •  START / ZIEL', '#ffffff', '#c1121f', 20, 2.2, theme.night, { border: '#ffd400' });
    const bp = off(s0, 0, 6.5); banner.position.copy(bp); banner.lookAt(bp.clone().sub(V(s0.T))); g.add(banner);
    for (const side of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7.5, 6), post); pole.position.copy(off(s0, side * 10, 3.5)); g.add(pole); }
    return g;
  }

  // ------------------------------------------------ scene ----
  function buildScenery(track, theme) {
    animated.length = 0;
    THEME = theme;
    const g = new THREE.Group();
    const S = track.samples, n = S.length, L = track.length;
    // ground
    const gtex = (theme.street === 'altstadt' ? T.cobble(theme.ground, 1) : theme.street && theme.street !== 'park' ? T.asphalt(theme.ground, 1) : T.grass(theme.ground, 1)).clone();
    gtex.needsUpdate = true; gtex.repeat.set(1500, 1500);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), tmat(gtex, 0xffffff));
    ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND_Y; g.add(ground);
    // sky dome
    const sky = new THREE.Mesh(new THREE.SphereGeometry(2200, 24, 12), new THREE.MeshBasicMaterial({ map: T.sky(theme), side: THREE.BackSide, fog: false }));
    sky.userData.sky = true; g.add(sky); animated.push(sky);

    // position along the track: either a fraction `at` or a segment index + fraction inside it
    function segAt(segIdx, u) {
      let i0 = -1, i1 = -1;
      for (let i = 0; i < n; i++) if (S[i].seg === segIdx) { if (i0 < 0) i0 = i; i1 = i; }
      if (i0 < 0) return 0;
      return ((i0 + (u == null ? 0.5 : u) * (i1 - i0)) * track.ds) / L;
    }
    function place(prop, at, side, dist, faceTrack) {
      const f = TB.frameAt(track, at * L);
      const bx = f.B.x, bz = f.B.z; const bl = Math.hypot(bx, bz) || 1;
      const x = f.p.x + bx / bl * side * dist, z = f.p.z + bz / bl * side * dist;
      prop.position.set(x, GROUND_Y, z);
      prop.rotation.y = Math.atan2(f.T.x, f.T.z);
      if (faceTrack) { const fb = TB.frameAt(track, at * L - 30); prop.lookAt(fb.p.x, GROUND_Y, fb.p.z); }
      return prop;
    }
    const FACING = ['billboard', 'neon', 'graffiti', 'tuenn', 'schael', 'gangster', 'crowd', 'koelsch', 'kranhaus', 'hbf', 'schoko', 'museum', 'arena', 'flora', 'lastenrad', 'altstadt', 'row', 'buedchen', 'haltestelle', 'viaduct', 'stmartin', 'dom', 'messeturm', 'chimney', 'triangle', 'lvr', 'musicaldome', 'promenade', 'elephant', 'tram', 'lamp', 'flag'];
    const keepOut = []; const propList = [];
    for (const pd of (track.def.props || [])) {
      const fn = P[pd.type]; if (!fn) { console.warn('unknown prop', pd.type); continue; }
      const at = pd.seg != null ? segAt(pd.seg, pd.u) : pd.at;
      if (pd.type === 'rhine' && !pd.extent) {
        // walk outwards along the crossing axis until we get close to a road that is not a bridge/gap
        const f = TB.frameAt(track, at * L); const bx = f.B.x, bz = f.B.z; const bl = Math.hypot(bx, bz) || 1;
        const ext = [450, 450];
        for (let sideI = 0; sideI < 2; sideI++) {
          const sgn = sideI === 0 ? 1 : -1; // sideI 0 walks along -B (local +x), sideI 1 along +B (local -x)
          const dirx = -bx / bl * sgn, dirz = -bz / bl * sgn;
          let d = 20;
          for (; d < 450; d += 10) {
            const x = f.p.x + dirx * d, z = f.p.z + dirz * d; let hit = false;
            for (let i = 0; i < n; i += 2) { const q = S[i]; if (q.kind === 'bridge' || q.kind === 'gap' || q.kind === 'ramp') continue; const dx = q.p.x - x, dz = q.p.z - z; if (dx * dx + dz * dz < 24 * 24) { hit = true; break; } }
            if (hit) break;
          }
          ext[sideI] = Math.max(30, d - 20);
        }
        pd.extent = ext;
      }
      const prop = fn(pd, theme);
      place(prop, at, pd.side, pd.dist, pd.face != null ? pd.face : FACING.includes(pd.type));
      if (pd.rot) prop.rotation.y += pd.rot;
      if (pd.type === 'hbarch') prop.rotation.y += Math.PI / 2;
      prop.userData.type = pd.type; propList.push(prop);
      g.add(prop);
      keepOut.push({ x: prop.position.x, z: prop.position.z, r: pd.keep || (pd.type === 'dom' ? 110 : pd.type.match(/altstadt|row|viaduct|hbf|stmartin|arena|messeturm|chimney/) ? 55 : 30) });
    }
    // street fillers along the track
    const rnd = mulberry(1234 + track.def.id.length * 77);
    const grid = S.map((s) => [s.p.x, s.p.z]);
    function freeAt(x, z, minD, iSkip) {
      for (let i = 0; i < grid.length; i += 3) { if (Math.abs(i - iSkip) < 40 || Math.abs(i - iSkip) > n - 40) continue; const dx = grid[i][0] - x, dz = grid[i][1] - z; if (dx * dx + dz * dz < minD * minD) return false; }
      for (const k of keepOut) { if ((k.x - x) * (k.x - x) + (k.z - z) * (k.z - z) < k.r * k.r) return false; }
      return true;
    }
    const street = theme.street || 'mixed';
    let count = 0;
    const step = street === 'park' ? 22 : 13;
    for (let i = 0; i < n && count < 220; i += step) {
      const s = S[i];
      if (s.kind === 'gap' || s.kind === 'ramp' || s.kind === 'loop' || s.kind === 'bridge') continue;
      for (const side of [-1, 1]) {
        if (rnd() < (street === 'park' ? 0.4 : 0.12)) continue;
        const dist = street === 'park' ? 16 + rnd() * 24 : 19 + (Math.abs(s.curv || 0) > 0.02 ? 6 : 0);
        const bx = s.B.x, bz = s.B.z; const bl = Math.hypot(bx, bz) || 1;
        const x = s.p.x + bx / bl * side * dist, z = s.p.z + bz / bl * side * dist;
        if (!freeAt(x, z, 16, i)) continue;
        let prop;
        const roll = rnd();
        if (street === 'park') prop = roll < 0.85 ? P.tree(Math.floor(rnd() * 3)) : P.lamp();
        else if (roll < 0.06) prop = P.buedchen();
        else if (roll < 0.1) prop = P.haltestelle();
        else if (roll < 0.15) prop = P.tree(Math.floor(rnd() * 3));
        else prop = P.house(Math.floor(rnd() * 1e6));
        prop.position.set(x, GROUND_Y, z);
        const fb = TB.frameAt(track, (i - 40 + n) % n * track.ds);
        prop.lookAt(s.p.x, GROUND_Y, s.p.z);
        if (prop.children.length && rnd() < 0.5) prop.rotation.y += (rnd() - 0.5) * 0.1;
        g.add(prop); count++;
      }
      // lamps / flags on the sidewalk
      if (street !== 'park' && i % (step * 2) === 0) {
        const side = (i / step) % 2 ? 1 : -1;
        const bx = s.B.x, bz = s.B.z; const bl = Math.hypot(bx, bz) || 1;
        const x = s.p.x + bx / bl * side * (ROAD_W + 3.2), z = s.p.z + bz / bl * side * (ROAD_W + 3.2);
        const flat = s.kind === 'straight' || s.kind === 'curve';
        if (flat && Math.abs(s.p.y) < 0.5) {
          const l = theme.confetti && rnd() < 0.5 ? P.flag({ a: [0xff5fa2, 0xffd400, 0x00a0ff][i % 3], b: 0xffffff }) : rnd() < 0.15 ? P.flag() : P.lamp();
          l.position.set(x, GROUND_Y, z); l.lookAt(s.p.x, GROUND_Y, s.p.z); g.add(l);
        }
      }
    }
    // background skyline ring: far blocks all around so the city never ends
    let cx = 0, cz = 0; for (const s of S) { cx += s.p.x; cz += s.p.z; } cx /= n; cz /= n;
    let maxR = 0; for (const s of S) maxR = Math.max(maxR, Math.hypot(s.p.x - cx, s.p.z - cz));
    const ringR = maxR + 260;
    for (let k = 0; k < 44; k++) {
      const a = k / 44 * Math.PI * 2 + rnd() * 0.1; const rr = ringR + rnd() * 160;
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      const w = 30 + rnd() * 40, h = theme.night ? 30 + rnd() * 70 : 18 + rnd() * 40, d = 30 + rnd() * 30;
      const st = rnd() < 0.3 ? 'modern' : 'concrete';
      const b = building(w, h, d, st, (st === 'modern' ? [0x9fc4e0, 0x8fb4d0] : CONCRETE)[Math.floor(rnd() * 2)], 'flat', k);
      b.position.set(x, GROUND_Y, z); b.lookAt(cx, GROUND_Y, cz); g.add(b);
    }
    // far landmarks (the Dom is visible from everywhere in Kölle)
    for (const fl of (theme.far || [])) {
      const prop = P[fl.type](fl, theme); const a = fl.angle * Math.PI / 180;
      prop.position.set(cx + Math.cos(a) * (ringR + (fl.dist || 120)), GROUND_Y, cz + Math.sin(a) * (ringR + (fl.dist || 120)));
      prop.lookAt(cx, GROUND_Y, cz); g.add(prop);
    }
    return { group: g, animated, props: propList };
  }

  function animate(t, dt, center) {
    for (const a of animated) {
      const u = a.userData;
      if (u.wave) a.rotation.z = Math.sin(t * 0.003) * 0.06;
      else if (u.crowd) a.children.forEach((f) => { if (f.userData.bounce != null) f.position.y = Math.abs(Math.sin(t * 0.006 + f.userData.bounce)) * 0.5; });
      else if (u.boat) a.position.x += Math.sin(t * 0.0002) * 0.02;
      else if (u.gondola != null) { a.position.x += dt * 4; if (a.position.x > 110) a.position.x = -110; }
      else if (u.water) a.userData.water.offset.x = (t * 0.00004) % 1;
      else if (u.sky && center) { a.position.set(center.x, GROUND_Y - 200, center.z); }
      else if (u.train) { a.position.x += dt * 12; if (a.position.x > 70) a.position.x = -110; }
      else if (u.flag) a.rotation.y = Math.sin(t * 0.004) * 0.35;
      else if (u.blink) a.visible = Math.floor(t / 600) % 2 === 0;
    }
  }

  // ------------------------------------------------ cars ----
  function buildCar(car) {
    const g = new THREE.Group();
    const c = car.color, dark = 0x1b1b1b, glass = 0x9fd3ff;
    const wheel = (x, z, r) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.42, r || 0.42, 0.35, 8), mat(dark)); w.rotation.z = Math.PI / 2; w.position.set(x, r || 0.42, z); g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry((r || 0.42) * 0.5, (r || 0.42) * 0.5, 0.37, 6), mat(0xbbbbbb)); hub.rotation.z = Math.PI / 2; hub.position.copy(w.position); g.add(hub); return w; };
    switch (car.shape) {
      case 'kart': {
        g.add(box(1.7, 0.45, 2.8, c, 0, 0.5, 0)); g.add(box(0.9, 0.7, 0.9, 0xffffff, 0, 1.0, -0.4));
        g.add(box(1.6, 0.15, 1.6, 0x8a5a2a, 0, 0.85, 0.7));
        for (let i = 0; i < 6; i++) { const gl = cyl(0.13, 0.11, 0.55, 0xffc300, -0.5 + (i % 3) * 0.5, 1.2, 0.4 + Math.floor(i / 3) * 0.5, 6); g.add(gl); }
        wheel(-0.9, 1.0, 0.35); wheel(0.9, 1.0, 0.35); wheel(-0.9, -1.0, 0.35); wheel(0.9, -1.0, 0.35); break;
      }
      case 'limo': {
        g.add(box(2.1, 0.7, 5.6, c, 0, 0.75, 0)); g.add(box(1.9, 0.6, 2.6, c, 0, 1.4, -0.3)); g.add(box(1.92, 0.35, 2.4, glass, 0, 1.45, -0.3));
        g.add(box(2.2, 0.2, 0.3, 0xdddddd, 0, 0.6, 2.8)); g.add(box(2.2, 0.2, 0.3, 0xdddddd, 0, 0.6, -2.8));
        g.add(box(2.15, 0.12, 3.0, 0xdddddd, 0, 0.78, 0.6));
        wheel(-1.1, 1.8); wheel(1.1, 1.8); wheel(-1.1, -1.8); wheel(1.1, -1.8); break;
      }
      case 'tram': {
        g.add(box(2.4, 2.2, 7, c, 0, 1.5, 0)); g.add(box(2.42, 0.8, 6.6, glass, 0, 1.9, 0)); g.add(box(2.4, 0.3, 7.2, 0xdddddd, 0, 2.75, 0)); g.add(box(0.1, 1.2, 1.6, 0x333333, 0, 3.4, 0));
        const sign = textPlane('1  WEIDEN WEST', '#ffb000', '#222222', 2.2, 0.5); sign.position.set(0, 2.9, 3.51); g.add(sign);
        for (const z of [2.4, 0.8, -0.8, -2.4]) { wheel(-1.0, z, 0.38); wheel(1.0, z, 0.38); } break;
      }
      case 'float': {
        g.add(box(2.6, 1.0, 6, c, 0, 0.9, 0)); g.add(box(2.4, 1.6, 3, 0xffd400, 0, 2.2, -0.8));
        g.add(box(2.0, 2.0, 2.0, 0x00a0ff, 0, 3.8, -0.8)); g.add(box(0.8, 0.8, 0.8, 0xff0000, 0, 3.6, 0.4));
        const banner = textPlane('KÖLLE ALAAF', '#c1121f', '#ffffff', 3, 0.9, false, { border: '#c1121f' }); banner.position.set(0, 1.9, 2.2); g.add(banner);
        for (const z of [2, -2]) { wheel(-1.2, z, 0.5); wheel(1.2, z, 0.5); } break;
      }
      case 'sedan': {
        g.add(box(2.0, 0.7, 4.4, c, 0, 0.75, 0)); g.add(box(1.8, 0.7, 2.2, c, 0, 1.4, -0.2)); g.add(box(1.82, 0.4, 2.0, glass, 0, 1.45, -0.2));
        const taxi = textPlane('TAXI', '#111111', '#ffd400', 1.0, 0.35); g.add(box(1.0, 0.35, 0.2, 0xffd400, 0, 1.95, -0.2)); taxi.position.set(0, 1.95, -0.09); g.add(taxi);
        wheel(-1.0, 1.4); wheel(1.0, 1.4); wheel(-1.0, -1.4); wheel(1.0, -1.4); break;
      }
      default: {
        g.add(box(2.0, 0.6, 4.4, c, 0, 0.7, 0)); g.add(box(1.7, 0.6, 2.0, c, 0, 1.25, -0.4)); g.add(box(1.72, 0.35, 1.9, glass, 0, 1.3, -0.4));
        g.add(box(0.15, 0.55, 0.4, 0x111111, -0.55, 0.9, 2.1)); g.add(box(0.15, 0.55, 0.4, 0x111111, 0.55, 0.9, 2.1));
        g.add(box(2.1, 0.12, 0.5, 0x111111, 0, 1.15, -2.0));
        g.add(box(0.5, 0.05, 4.2, 0xffffff, 0, 1.01, 0)); // racing stripe
        wheel(-1.0, 1.4); wheel(1.0, 1.4); wheel(-1.0, -1.4); wheel(1.0, -1.4);
      }
    }
    for (const x of [-0.7, 0.7]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffcc })); hl.position.set(x, 0.85, (car.shape === 'tram' || car.shape === 'float') ? 3.0 : 2.25); g.add(hl); }
    for (const x of [-0.7, 0.7]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2020 })); tl.position.set(x, 0.85, (car.shape === 'tram' || car.shape === 'float') ? -3.0 : -2.25); g.add(tl); }
    return g;
  }

  // ------------------------------------------------ confetti ----
  function buildConfetti() {
    const N = 500;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const cols = [0xff5fa2, 0xffd400, 0x00a0ff, 0x7fff00, 0xffffff, 0xff2d2d];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      const c = new THREE.Color(cols[i % cols.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.7, vertexColors: true }));
    pts.userData.update = (dt, center) => {
      const a = g.attributes.position.array;
      for (let i = 0; i < N; i++) {
        a[i * 3 + 1] -= dt * (3 + (i % 5)); a[i * 3] += Math.sin(a[i * 3 + 1] * 0.5 + i) * dt * 2;
        if (a[i * 3 + 1] < -1) { a[i * 3 + 1] = 40; a[i * 3] = center.x + (Math.random() - 0.5) * 120; a[i * 3 + 2] = center.z + (Math.random() - 0.5) * 120; }
      }
      g.attributes.position.needsUpdate = true;
    };
    return pts;
  }

  root.World = { buildRoad, buildScenery, buildCar, buildConfetti, textPlane, animate, ROAD_W, GROUND_Y, WATER_Y };
})(window);
