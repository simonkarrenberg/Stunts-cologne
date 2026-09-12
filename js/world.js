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

  // Materials are cached so that the static-geometry merger can batch by material.
  const matCache = new Map();
  function mat(color, opts) {
    const key = 'c' + color + JSON.stringify(opts || {});
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {})));
    return matCache.get(key);
  }
  function bmat(color) {
    const key = 'b' + color;
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color }));
    return matCache.get(key);
  }
  function tmat(tex, color, opts) {
    if (opts && opts.nocache) { const o = Object.assign({}, opts); delete o.nocache; return new THREE.MeshLambertMaterial(Object.assign({ map: tex, color: color == null ? 0xffffff : color }, o)); }
    const key = 't' + tex.uuid + '|' + color + JSON.stringify(opts || {});
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial(Object.assign({ map: tex, color: color == null ? 0xffffff : color }, opts || {})));
    return matCache.get(key);
  }
  const V = (o) => new THREE.Vector3(o.x, o.y, o.z);
  let THEME = { night: false };
  const animated = [];   // objects with userData.update(t, dt)

  // ------------------------------------------------ primitives ----
  function box(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x || 0, y == null ? h / 2 : y, z || 0);
    return m;
  }
  function tbox(w, h, d, tex, x, y, z, color, scaleUV, topColor) {
    // textured box; the texture repeat is baked into the UVs (scaleUV = metres per tile [u, v])
    // so one shared texture/material serves every building -> mergeable into a few draw calls.
    const su = scaleUV ? scaleUV[0] : 8, sv = scaleUV ? scaleUV[1] : 8;
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    const rep = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      const ru = Math.max(1, Math.round(rep[f][0] / su)), rv = Math.max(1, Math.round(rep[f][1] / sv));
      for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    }
    // sides get the texture, top/bottom a plain colour
    geo.clearGroups();
    geo.addGroup(0, 12, 0); geo.addGroup(12, 12, 1); geo.addGroup(24, 12, 0);
    const m = new THREE.Mesh(geo, [tmat(tex, color), mat(topColor == null ? 0x6a6a6a : topColor)]);
    m.position.set(x || 0, y == null ? h / 2 : y, z || 0);
    return m;
  }
  // textured cylinder with UV repeat baked in
  function tcyl(rt, rb, h, tex, ru, rv, color, seg) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, seg || 8);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    return new THREE.Mesh(geo, tmat(tex, color == null ? 0xffffff : color));
  }

  // merge a small group (a crowd) into ONE vertex-coloured mesh so it costs a single draw call
  function mergeVertexColored(group) {
    group.updateMatrixWorld(true);
    const pos = [], nor = [], col = [], idx = []; let base = 0; const v = new THREE.Vector3(); const nm = new THREE.Matrix3(); const c = new THREE.Color();
    const meshes = []; group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    for (const m of meshes) {
      const geo = m.geometry, p = geo.attributes.position, n = geo.attributes.normal; const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); nm.getNormalMatrix(mw);
      const material = Array.isArray(m.material) ? m.material[0] : m.material; c.copy(material.color || new THREE.Color(0xffffff));
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(mw); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
      const index = geo.index ? geo.index.array : null; const cnt = index ? index.length : p.count;
      for (let i = 0; i < cnt; i++) idx.push(base + (index ? index[i] : i));
      base += p.count;
    }
    for (const m of meshes) m.parent.remove(m);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, vcMat()); group.add(mesh); return mesh;
  }
  let _vc; function vcMat() { if (!_vc) _vc = new THREE.MeshLambertMaterial({ vertexColors: true }); return _vc; }

  // ---------- static geometry merger: one mesh per material ----------
  function mergeStatic(group, animatedSet) {
    group.updateMatrixWorld(true);
    const isAnimated = (o) => { for (let p = o; p; p = p.parent) { if (animatedSet.has(p) || p.userData.keep) return true; } return false; };
    const meshes = [];
    group.traverse((o) => { if (o.isMesh && !isAnimated(o) && o.geometry.attributes.position && !o.geometry.attributes.color) meshes.push(o); });
    const buckets = new Map();
    const nm = new THREE.Matrix3(); const v = new THREE.Vector3();
    for (const m of meshes) {
      const geo = m.geometry;
      const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
      const index = geo.index ? geo.index.array : null;
      const groups = geo.groups && geo.groups.length ? geo.groups : [{ start: 0, count: index ? index.length : pos.count, materialIndex: 0 }];
      nm.getNormalMatrix(m.matrixWorld);
      for (const g of groups) {
        const material = Array.isArray(m.material) ? m.material[g.materialIndex] : m.material;
        if (!material) continue;
        let b = buckets.get(material);
        if (!b) { b = { pos: [], nor: [], uv: [], idx: [], base: 0, hasUv: !!uv }; buckets.set(material, b); }
        // copy the vertices used by this group (all of them; simple and fine)
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); b.pos.push(v.x, v.y, v.z);
          if (nor) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); b.nor.push(v.x, v.y, v.z); } else b.nor.push(0, 1, 0);
          if (uv) b.uv.push(uv.getX(i), uv.getY(i)); else b.uv.push(0, 0);
        }
        const end = Math.min(g.start + g.count, index ? index.length : pos.count);
        for (let i = g.start; i < end; i++) b.idx.push(b.base + (index ? index[i] : i));
        b.base += pos.count;
      }
      m.parent.remove(m);
    }
    const out = new THREE.Group();
    for (const [material, b] of buckets) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setIndex(b.idx);
      const mesh = new THREE.Mesh(geo, material); mesh.frustumCulled = true; mesh.castShadow = true; mesh.receiveShadow = true; out.add(mesh);
    }
    group.add(out);
    return out;
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
    c.width = 512; c.height = Math.max(24, Math.round(512 * h / w));
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    if (opts.border) { x.fillStyle = opts.border; x.fillRect(0, 0, c.width, 8); x.fillRect(0, c.height - 8, c.width, 8); x.fillRect(0, 0, 8, c.height); x.fillRect(c.width - 8, 0, 8, c.height); }
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
  const SHOPS = ['APOTHEKE', 'CAFÉ', 'DÖNER', 'BÄCKEREI', 'FRISEUR', 'BLUMEN', 'PIZZERIA', 'BRAUHAUS', 'OPTIK', 'RIEVKOOCHE', 'HALVE HAHN', 'KÖLSCH', 'KAMELLE', 'EAU DE COLOGNE', 'FC FANSHOP', 'METZGEREI', 'BUCHLADEN', 'EISDIELE', 'REISEBÜRO', 'SCHNEIDEREI', 'WEINHANDLUNG', 'FLÖNZ & CO'];
  function building(w, h, d, style, wall, roof, seed, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const facade = T.facade(style, wall, seed, THEME.night);
    const bay = style === 'altstadt' ? 2.6 : style === 'modern' || style === 'glass' ? 3.0 : 3.4;
    const floorH = style === 'altstadt' ? 3.0 : 3.6;
    const b = tbox(w, h, d, facade, 0, h / 2, 0, 0xffffff, [bay * 4, floorH * 4], new THREE.Color(PX.shade(wall, 0.8)).getHex());
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
    // Miami-Vice neon strip along the roof line at night
    if (opts.night && seed % 3 === 0) {
      const nc = [0xff2d95, 0x00e5ff, 0xc04dff, 0xffd400][seed % 4];
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.18, 0.18), bmat(nc))).position.set(0, h + 0.1, d / 2 + 0.1);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), bmat(nc))).position.set(-w / 2 - 0.05, h / 2, d / 2 + 0.1);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), bmat(nc))).position.set(w / 2 + 0.05, h / 2, d / 2 + 0.1);
      g.add(glow(w + 4, 6, nc, 0, d / 2 + 2));
    }
    // shop front on the street side (+z)
    if (opts.shop) {
      const sw = Math.min(w - 1, 9);
      const sign = textPlane(opts.shop, opts.night ? '#fff3b0' : '#f8f4e8', opts.signBg || ['#7a1a1a', '#1c3f95', '#2d6a4f', '#3a2a5a', '#8a4a1a'][seed % 5], sw, 1.1, opts.night, { border: '#ffd400' });
      sign.position.set(0, 3.55, d / 2 + 0.06); g.add(sign);
      g.add(box(sw, 0.2, 0.3, 0x2a2a2a, 0, 3.0, d / 2 + 0.15));
      if (style !== 'modern') { const aw = new THREE.Mesh(new THREE.PlaneGeometry(sw, 1.5), tmat(T.stripes(opts.awning || 0xc1121f, 0xffffff), 0xffffff, { side: THREE.DoubleSide })); aw.rotation.x = -Math.PI / 2 + 0.55; aw.position.set(0, 2.9, d / 2 + 0.8); g.add(aw); }
      // shop window
      g.add(box(sw - 1, 2.0, 0.15, opts.night ? 0xffe8a0 : 0x9fd3ff, 0, 1.5, d / 2 + 0.02));
      g.add(box(0.9, 2.1, 0.12, 0x5a3a2a, sw / 2 - 0.2, 1.1, d / 2 + 0.05));
    }
    // balconies for Gründerzeit
    if (opts.balconies) {
      for (let f = 1; f < Math.floor(h / 3.6); f++) { if ((seed + f) % 2) continue; const bx = ((seed * 7 + f * 3) % 3 - 1) * (w / 3.2); g.add(box(2.2, 0.25, 1.0, PX.shade(wall, 0.7), bx, f * 3.6 + 0.4, d / 2 + 0.5)); g.add(box(2.2, 0.9, 0.08, 0x2a2a2a, bx, f * 3.6 + 1.0, d / 2 + 1.0)); }
    }
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
    const apse = tcyl(22 * S, 22 * S, 42 * S, tr, 8, 2, stone, 8); apse.position.set(0, 21 * S, -66 * S); g.add(apse);
    g.add(cone(23 * S, 22 * S, roofC, 0, 53 * S, -66 * S, 8));
    // twin towers with spires
    for (const x of [-15 * S, 15 * S]) {
      g.add(tbox(15 * S, 100 * S, 15 * S, tr, x, 50 * S, 45 * S, stone, [16, 24]));
      g.add(cone(9.5 * S, 57 * S, spireC, x, 128 * S, 45 * S, 8));
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cone(1.6 * S, 12 * S, spireC, x + dx * 6.5 * S, 106 * S, 45 * S + dz * 6.5 * S, 4));
      g.add(box(0.8, 5, 0.8, 0xffd700, x, 159 * S, 45 * S));
    }
    // west front: rose window and three portals between the towers
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(6 * S, 6 * S, 0.6, 12), mat(0x1c1c26)); rose.rotation.x = Math.PI / 2; rose.position.set(0, 60 * S, 45 * S + 7.6 * S); g.add(rose);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI; const spoke = box(0.5, 11.6 * S, 0.3, 0x8a8a94, 0, 60 * S, 45 * S + 8 * S); spoke.rotation.z = a; g.add(spoke); }
    g.add(tbox(30 * S, 60 * S, 6 * S, tr, 0, 30 * S, 45 * S + 4 * S, stone, [16, 24]));
    for (const x of [-9, 0, 9]) { g.add(box(5 * S, 16 * S, 0.5, 0x15151c, x * S, 8 * S, 45 * S + 7.4 * S)); g.add(cone(3.2 * S, 5 * S, 0x15151c, x * S, 18.5 * S, 45 * S + 7.4 * S, 4)); }
    // flying buttresses & piers along the nave
    for (let z = -60; z <= 30; z += 12) {
      for (const sx of [-1, 1]) {
        g.add(box(3 * S, 30 * S, 3 * S, 0x3d3d44, sx * 31 * S, 15 * S, z * S));
        g.add(cone(2 * S, 8 * S, spireC, sx * 31 * S, 34 * S, z * S, 4));
        const fb = box(1.4, 2, 12 * S, 0x45454c, sx * 26.5 * S, 33 * S, z * S); fb.rotation.z = sx * 0.55; g.add(fb);
      }
    }
    // Domplatte: stone plaza
    const pg = new THREE.PlaneGeometry(150, 190); { const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 40, uv.getY(i) * 50); }
    const plate = new THREE.Mesh(pg, tmat(T.cobble(0xb8b0a4, 4), 0xffffff));
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
    const t = tcyl(22, 22, 100, T.facade('glass', 0x6f9fc8, 8, THEME.night), 12, 8, 0xffffff, 3); t.position.y = 50; g.add(t);
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
    const shaft = tcyl(3, 5, 250, T.steel(0xbfc4c9), 4, 40, 0xffffff, 10); shaft.position.y = 125; g.add(shaft);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(16, 12, 14, 12), tmat(T.facade('glass', 0xd9dde0, 5, THEME.night), 0xffffff)); disc.position.y = 170; g.add(disc);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 40, 6), mat(0xff3333))).position.y = 270;
    const l = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 6), bmat(0xff2020)); l.position.y = 290; l.userData.blink = true; g.add(l); animated.push(l);
    return g;
  };
  P.helios = () => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 40, 8), tmat(T.brick(0xe6dccb), 0xffffff)); t.position.y = 20; g.add(t); const top = cyl(4.5, 4.5, 4, 0x3f3f3f, 0, 42, 0, 8); g.add(top); const l = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), bmat(0xffee88)); l.position.y = 46; g.add(l); return g; };
  P.arena = () => {
    const g = new THREE.Group();
    const dg = new THREE.SphereGeometry(45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); { const uv = dg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 4); }
    const dome = new THREE.Mesh(dg, tmat(T.facade('glass', 0x3a4a70, 9, THEME.night), 0xffffff)); g.add(dome);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(52, 2.2, 6, 24, Math.PI), bmat(THEME.night ? 0x7fd3ff : 0xd8e8f0)); arch.position.y = 2; g.add(arch);
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
  const glowCache = new Map();
  function glowMat(color) { const k = 'g' + color; if (!glowCache.has(k)) glowCache.set(k, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false })); return glowCache.get(k); }
  function glow(w, d, color, x, z) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), glowMat(color)); m.rotation.x = -Math.PI / 2; m.position.set(x || 0, 0.12, z || 0); return m; }
  P.neon = (o) => {
    const g = new THREE.Group(); const col = o.color || '#ff2d95';
    const w = o.small ? 9 : 18, h = o.small ? 2.4 : 4;
    const s = textPlane(o.text, col, '#0a0a18', w, h, true, { border: col });
    s.position.y = o.small ? 4.2 : 6; g.add(s);
    g.add(box(0.5, 4, 0.5, 0x333344, -w / 2 + 1, 2, 0)); g.add(box(0.5, 4, 0.5, 0x333344, w / 2 - 1, 2, 0));
    if (THEME.night) { g.add(glow(w + 6, 14, new THREE.Color(col).getHex(), 0, 5)); }
    if (o.light !== false && THEME.night) { const light = new THREE.PointLight(new THREE.Color(col), 1.2, 60); light.position.set(0, 6, 3); g.add(light); }
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
    g.add(human({ shirt: 0x8a5a2a, koelsch: true })).position.set(3.4, 0, 1.6); // Büdchen-Kunde
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
  P.lamp = () => { const g = new THREE.Group(); g.add(cyl(0.12, 0.16, 7, 0x444444, 0, 3.5, 0, 6)); const arm = box(1.6, 0.15, 0.15, 0x444444, 0.7, 7, 0); g.add(arm); const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), THEME.night ? bmat(0xffe8a0) : mat(0xdddddd)); head.position.set(1.4, 6.9, 0); g.add(head); if (THEME.night) { const gl = glow(5, 5, 0xffc860, 1.4, 0); gl.material = gl.material.clone(); gl.material.opacity = 0.07; g.add(gl); } return g; };
  P.flag = (o) => { const g = new THREE.Group(); g.add(cyl(0.08, 0.1, 6, 0x777777, 0, 3, 0, 6)); const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), tmat(T.stripes((o && o.a) || 0xc1121f, (o && o.b) || 0xffffff), 0xffffff, { side: THREE.DoubleSide })); f.position.set(1.15, 5.2, 0); f.userData.flag = true; g.add(f); animated.push(f); return g; };
  P.bunting = () => {
    // carnival bunting across the street
    const g = new THREE.Group(); const cols = [0xff5fa2, 0xffd400, 0x00a0ff, 0x7fff00, 0xffffff, 0xff2d2d];
    for (let x = -14; x <= 14; x += 1.2) { const y = 6.5 - Math.cos(x / 14 * Math.PI / 2) * 1.2; const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), mat(cols[Math.floor(Math.abs(x) * 1.7) % cols.length], { side: THREE.DoubleSide })); f.position.set(x, y, 0); g.add(f); }
    g.add(box(30, 0.06, 0.06, 0x333333, 0, 6.6, 0));
    g.add(cyl(0.12, 0.12, 7, 0x555555, -15, 3.5, 0, 6)); g.add(cyl(0.12, 0.12, 7, 0x555555, 15, 3.5, 0, 6));
    return g;
  };
  P.chimney = () => { const g = new THREE.Group(); const c = tcyl(2.2, 3.2, 70, T.brick(0x8a4a3a), 3, 12, 0xffffff, 8); c.position.y = 35; g.add(c); g.add(cyl(2.4, 2.4, 3, 0xdddddd, 0, 60, 0, 8)); g.add(cyl(2.4, 2.4, 3, 0xc1121f, 0, 66, 0, 8)); g.add(tbox(50, 16, 30, T.facade('industrial', 0x8a4a3a, 4, THEME.night), 20, 8, 0, 0xffffff, [14, 14])); return g; };
  // Rounded human figure. o: { h (metres, default 1.75), skin, hair, shirt, pants, shoes, hat: cap|fedora|gnome|tricorn|helmet|none,
  //   hatColor, beard, glasses, cigar, scarf, koelsch, briefcase, dress, bronze, wave }
  function human(o) {
    o = o || {}; const H = (o.h || 1.75) / 1.75; const g = new THREE.Group();
    const skin = o.bronze ? 0x6a4a2a : (o.skin || [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac, 0x8d5524][Math.floor(Math.random() * 5)]);
    const shirt = o.bronze ? 0x6a4a2a : (o.shirt || 0x3a4a6a), pants = o.bronze ? 0x5a3a20 : (o.pants || 0x2a2a34), shoes = o.bronze ? 0x4a2a18 : (o.shoes || 0x1a1a1a), hair = o.bronze ? 0x5a3a20 : (o.hair || 0x3a2a1a);
    const M = (c) => mat(c);
    const part = (geo, c, x, y, z, rx, rz) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x * H, y * H, z * H); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; m.scale.set(H, H, H); g.add(m); return m; };
    // legs & shoes
    for (const sx of [-1, 1]) { part(new THREE.CylinderGeometry(0.075, 0.065, 0.82, 10), pants, sx * 0.1, 0.42, 0); part(new THREE.BoxGeometry(0.12, 0.08, 0.26), shoes, sx * 0.1, 0.04, 0.04); }
    if (o.dress) part(new THREE.CylinderGeometry(0.17, 0.3, 0.5, 12), o.dress, 0, 0.68, 0);
    // torso (tapered) + shoulders
    part(new THREE.CylinderGeometry(0.17, 0.14, 0.62, 12), shirt, 0, 1.13, 0).scale.set(H, H, 0.72 * H);
    part(new THREE.SphereGeometry(0.19, 12, 10), shirt, 0, 1.42, 0).scale.set(H, 0.5 * H, 0.75 * H);
    // arms
    for (const sx of [-1, 1]) { const wave = o.wave && sx === 1; const a = part(new THREE.CylinderGeometry(0.048, 0.042, 0.62, 8), shirt, sx * 0.24, wave ? 1.55 : 1.12, wave ? 0.05 : 0.02, 0, wave ? -sx * 2.6 : sx * 0.15); if (wave) a.userData.waveArm = true; part(new THREE.SphereGeometry(0.05, 8, 8), skin, sx * (wave ? 0.5 : 0.27), wave ? 1.85 : 0.82, wave ? 0.05 : 0.06); }
    // neck & head
    part(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skin, 0, 1.5, 0);
    part(new THREE.SphereGeometry(0.115, 14, 12), skin, 0, 1.64, 0).scale.set(H, 1.12 * H, H);
    // hair / hat
    if (!o.bald && o.hat !== 'gnome') { const hr = part(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.66, -0.01); hr.scale.set(H, 1.05 * H, H); }
    if (o.hat === 'cap') { part(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), o.hatColor || 0x555555, 0, 1.68, 0); part(new THREE.BoxGeometry(0.12, 0.02, 0.1), o.hatColor || 0x555555, 0, 1.68, 0.16); }
    if (o.hat === 'fedora') { part(new THREE.CylinderGeometry(0.19, 0.2, 0.02, 16), o.hatColor || 0x111111, 0, 1.72, 0); part(new THREE.CylinderGeometry(0.1, 0.12, 0.13, 12), o.hatColor || 0x111111, 0, 1.79, 0); part(new THREE.CylinderGeometry(0.121, 0.121, 0.03, 12), 0x8a1a1a, 0, 1.745, 0); }
    if (o.hat === 'gnome') { part(new THREE.ConeGeometry(0.13, 0.42, 12), o.hatColor || 0xc1121f, 0, 1.9, 0).rotation.x = -0.15; }
    if (o.hat === 'tricorn') { part(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 3), o.hatColor || 0xc1121f, 0, 1.74, 0); part(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), o.hatColor || 0xc1121f, 0, 1.72, 0); part(new THREE.SphereGeometry(0.03, 6, 6), 0xffffff, 0, 1.9, 0); }
    if (o.hat === 'helmet') { part(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), o.hatColor || 0x1c3f95, 0, 1.66, 0); }
    // face details: eyes, brows, nose, mouth
    for (const sx of [-1, 1]) { part(new THREE.SphereGeometry(0.014, 6, 6), 0xffffff, sx * 0.045, 1.665, 0.098); part(new THREE.SphereGeometry(0.008, 6, 6), 0x1a1a22, sx * 0.045, 1.665, 0.11); part(new THREE.BoxGeometry(0.04, 0.008, 0.01), hair, sx * 0.045, 1.695, 0.105); }
    part(new THREE.ConeGeometry(0.018, 0.045, 6), skin, 0, 1.64, 0.118).rotation.x = Math.PI / 2;
    part(new THREE.BoxGeometry(0.05, 0.008, 0.01), 0x8a3a3a, 0, 1.6, 0.108);
    if (o.beard) { part(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), o.beard, 0, 1.6, 0.02).scale.set(1.05 * H, 1.3 * H, 1.05 * H); }
    if (o.glasses) { for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12), M(0x111111)); r.position.set(sx * 0.045 * H, 1.665 * H, 0.112 * H); r.scale.set(H, H, H); g.add(r); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.028, 10), M(0x111122)); lens.position.set(sx * 0.045 * H, 1.665 * H, 0.113 * H); lens.scale.set(H, H, H); g.add(lens); } }
    if (o.cigar) { part(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 6), 0x7a4a2a, 0.04, 1.6, 0.16).rotation.x = Math.PI / 2; const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), bmat(0xff6a00)); tip.position.set(0.04 * H, 1.6 * H, 0.22 * H); g.add(tip); }
    if (o.scarf) { part(new THREE.TorusGeometry(0.1, 0.035, 8, 12), o.scarf, 0, 1.5, 0).rotation.x = Math.PI / 2; part(new THREE.BoxGeometry(0.07, 0.3, 0.03), o.scarf, 0.07, 1.32, 0.13); part(new THREE.BoxGeometry(0.07, 0.3, 0.03), o.scarf === 0xc1121f ? 0xffffff : o.scarf, -0.05, 1.3, 0.13); }
    if (o.koelsch) { part(new THREE.CylinderGeometry(0.025, 0.022, 0.13, 10), 0xffc300, 0.3, 0.9, 0.08); part(new THREE.CylinderGeometry(0.026, 0.026, 0.025, 10), 0xffffff, 0.3, 0.975, 0.08); }
    if (o.kranz) { part(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), 0x8a5a2a, -0.32, 0.95, 0.08); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; part(new THREE.CylinderGeometry(0.02, 0.018, 0.12, 8), 0xffc300, -0.32 + Math.cos(a) * 0.11, 1.02, 0.08 + Math.sin(a) * 0.11); } }
    if (o.briefcase) part(new THREE.BoxGeometry(0.28, 0.2, 0.08), 0x3a2a1a, 0.3, 0.72, 0.06);
    if (o.wrench) part(new THREE.BoxGeometry(0.03, 0.3, 0.03), 0x9a9aa0, -0.3, 0.9, 0.08);
    g.userData.human = true;
    return g;
  }
  const CROWD_OUTFITS = [
    { shirt: 0xc1121f, scarf: 0xc1121f }, { shirt: 0xffffff, scarf: 0xc1121f, koelsch: true }, { shirt: 0x1c3f95, koelsch: true }, { shirt: 0xff5fa2, hat: 'tricorn', hatColor: 0xff5fa2 }, { shirt: 0x2d6a4f, hat: 'cap' },
    { shirt: 0xffd400, hat: 'gnome', hatColor: 0xffd400 }, { shirt: 0x8a5a2a, koelsch: true }, { shirt: 0x3a3a5a, hat: 'fedora' }, { shirt: 0xff8800, dress: 0xff8800 }, { shirt: 0x7fbf7f, koelsch: true, hat: 'cap', hatColor: 0xc1121f }
  ];
  P.figure = (h, coat, hat, skin) => human({ h: 1.75 * (h || 0.55) / 0.55 * 0.55, shirt: coat, pants: coat === 0x1a1a1a ? 0x1a1a1a : 0x2a2a34, hat: hat ? 'fedora' : 'none', hatColor: hat, skin: skin });
  P.human = human;
  P.tuenn = () => { const g = human({ h: 2.1, skin: 0xe0ac69, shirt: 0x14141a, pants: 0x14141a, hat: 'fedora', hatColor: 0x0a0a0a, cigar: true, glasses: true, koelsch: true, wave: true }); g.userData.wave = true; animated.push(g);
    const sign = textPlane('DER LANGE TÜNN', '#ffd400', '#111111', 4, 0.8, THEME.night, { border: '#ffd400' }); sign.position.set(0, 2.9, 0); g.add(sign); return g; };
  P.schael = () => { const g = human({ h: 1.62, skin: 0xf1c27d, shirt: 0x3a2a22, pants: 0x2a2a2a, hat: 'none', hair: 0x1a1a1a, scarf: 0xc1121f }); const sign = textPlane('SCHÄL', '#ffffff', '#2d6a4f', 2.2, 0.6, false, { border: '#fff' }); sign.position.set(0, 2.3, 0); g.add(sign); return g; };
  P.tuennes = () => human({ h: 1.7, skin: 0xffdbac, shirt: 0x2a4a8a, pants: 0x2a2a34, hat: 'cap', hatColor: 0x777777, scarf: 0xc1121f, koelsch: true });
  P.heinzel = () => human({ h: 1.2, skin: 0xffdbac, shirt: 0x2d6a4f, pants: 0x5a3a20, hat: 'gnome', beard: 0xf4f4f4, wrench: true });
  P.koebes = () => human({ h: 1.78, skin: 0xe0ac69, shirt: 0x1c3f95, pants: 0x14141a, hat: 'none', hair: 0x4a4a4a, kranz: true });
  P.anna = () => human({ h: 1.68, skin: 0xffdbac, shirt: 0xc1121f, dress: 0xffffff, pants: 0xffffff, hat: 'tricorn', hatColor: 0xc1121f, hair: 0xd9a24a });
  P.gangster = () => human({ h: 1.8, shirt: 0x2a2a30, pants: 0x2a2a30, hat: 'fedora', hatColor: 0x1a1a1a, cigar: Math.random() < 0.5, skin: 0xe0ac69 });
  P.polizist = () => human({ h: 1.78, shirt: 0x1c3f95, pants: 0x1c3f95, hat: 'cap', hatColor: 0x1c3f95 });
  P.denkmal = () => { // Tünnes & Schäl bronze statue by Groß St. Martin
    const g = new THREE.Group(); g.add(box(3.2, 0.8, 2.2, 0x6a6a70, 0, 0.4, 0));
    const t = human({ h: 1.6, bronze: true, hat: 'cap', hatColor: 0x6a4a2a }); t.position.set(-0.6, 0.8, 0); g.add(t);
    const sc = human({ h: 1.75, bronze: true, hat: 'none' }); sc.position.set(0.6, 0.8, 0); g.add(sc);
    const s = textPlane('TÜNNES & SCHÄL', '#f0e0c0', '#3a3a40', 3, 0.5, false, { sizeK: 0.5 }); s.position.set(0, 0.4, 1.12); g.add(s);
    return g; };
  P.heinzelbrunnen = () => { // Heinzelmännchenbrunnen at the Brauhaus
    const g = new THREE.Group(); g.add(box(8, 1.2, 4, 0x8a8a90, 0, 0.6, 0)); g.add(box(7, 0.3, 3, 0x3f7fc0, 0, 1.25, 0.3));
    const stairs = [0, 1, 2, 3]; for (const k of stairs) g.add(box(2.4 - k * 0.4, 0.5, 1.2, 0x9a9aa0, 0, 1.4 + k * 0.5, -1.2 + k * 0.2));
    for (let k = 0; k < 5; k++) { const hz = human({ h: 0.8, bronze: true, hat: 'gnome', hatColor: 0x6a4a2a, beard: 0x6a4a2a }); hz.position.set(-1 + (k % 3) * 1.0, 1.65 + Math.floor(k / 3) * 0.5, -0.8 + (k % 2) * 0.4); hz.rotation.y = (k - 2) * 0.4; g.add(hz); }
    const w = human({ h: 1.65, bronze: true, hat: 'none', dress: 0x6a4a2a }); w.position.set(0, 3.4, -1.4); g.add(w);
    const s = textPlane('HEINZELMÄNNCHENBRUNNEN', '#f0e0c0', '#3a3a40', 5, 0.6, false, { sizeK: 0.45 }); s.position.set(0, 1.0, 2.05); g.add(s);
    return g; };
  P.stadion = () => { // RheinEnergieStadion, Müngersdorf: bowl with four pylons (far landmark)
    const g = new THREE.Group(); const bowl = new THREE.Mesh(new THREE.CylinderGeometry(70, 60, 22, 24, 1, true), mat(0x9aa0aa, { side: THREE.DoubleSide })); bowl.position.y = 11; g.add(bowl);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(72, 3, 8, 24), mat(0xdddddd))).position.y = 22; g.children[1].rotation.x = Math.PI / 2;
    for (const [x, z] of [[-60, -40], [60, -40], [-60, 40], [60, 40]]) { g.add(box(4, 70, 4, 0xd0d0d0, x, 35, z)); g.add(new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), bmat(0xff3333))).position.set(x, 71, z); }
    const s = textPlane('RHEINENERGIESTADION · MÜNGERSDORF', '#c1121f', '#ffffff', 60, 6); s.position.set(0, 26, 62); g.add(s);
    return g; };
  P.rain = () => { // drizzle for Chicago-am-Rhein nights, follows the camera
    const N = 900; const pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 80; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 80; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaab4d0, size: 0.35, transparent: true, opacity: 0.55, depthWrite: false }));
    pts.userData.rain = true; pts.userData.keep = true; pts.frustumCulled = false; animated.push(pts); return pts; };
  P.crowd = () => {
    const g = new THREE.Group();
    const cols = [0xc1121f, 0xffffff, 0xffd400, 0x1c3f95, 0xff5fa2, 0x2d6a4f, 0xff8800];
    const r = mulberry(31);
    for (let i = 0; i < 10; i++) { const f = human(Object.assign({ h: 1.6 + r() * 0.3 }, CROWD_OUTFITS[Math.floor(r() * CROWD_OUTFITS.length)])); f.position.set((i - 4.5) * 1.3, 0, (r() - 0.5) * 2); f.rotation.y = (r() - 0.5) * 0.6; g.add(f); }
    g.add(box(14, 0.8, 0.3, 0x8a5a2a, 0, 0.4, 1.4)); // barrier
    mergeVertexColored(g);
    g.userData.crowd = true; g.userData.phase = Math.random() * 6; animated.push(g);
    return g;
  };
  P.lastenrad = () => { const g = new THREE.Group(); g.add(box(2.4, 0.8, 1.2, 0x9b5de5, 0, 0.9, 0)); for (const x of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 6, 10), mat(0x222222)); w.position.set(x, 0.5, 0); w.rotation.y = Math.PI / 2; g.add(w); } return g; };
  P.boat = () => { const g = new THREE.Group(); g.add(box(26, 2.5, 6, 0xf4f4f4, 0, 0.9, 0)); g.add(box(16, 2, 5, 0x1c3f95, 0, 3, 0)); g.add(box(1, 3, 1, 0x333333, -4, 5.5, 0)); const s = textPlane('KD RHEINSCHIFF', '#1c3f95', '#ffffff', 12, 1.4); s.position.set(0, 1.4, 3.05); g.add(s); g.userData.boat = true; animated.push(g); return g; };
  P.barge = () => { const g = new THREE.Group(); g.add(box(60, 2, 9, 0x4a4a52, 0, 0.8, 0)); g.add(box(50, 1.2, 8, 0x2f2f36, 0, 2.2, 0)); g.add(box(6, 4, 6, 0xf0f0f0, -25, 3.8, 0)); g.userData.boat = true; animated.push(g); return g; };
  function water(w, l) {
    const tex = T.water(THEME.water).clone(); tex.needsUpdate = true; tex.repeat.set(w / 16, l / 8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), tmat(tex, 0xffffff, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, nocache: true }));
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
  function tplane(w, h, tex, ru, rv, color, opts) { const pg = new THREE.PlaneGeometry(w, h); const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); return new THREE.Mesh(pg, tmat(tex, color == null ? 0xffffff : color, opts)); }
  P.rails = () => { const g = new THREE.Group(); const m = tplane(300, 8, T.rails(), 75, 2); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; g.add(m); return g; };
  P.hbarch = () => {
    // Hohenzollernbrücke: tied steel arches beside the road + parallel rail bridge with a train
    const g = new THREE.Group(); const steel = tmat(T.steel(0x2f6b4f), 0xffffff);
    const arch = (z) => { const a = new THREE.Mesh(new THREE.TorusGeometry(40, 1.6, 6, 24, Math.PI), steel); a.position.set(0, 0, z); g.add(a);
      for (let i = -4; i <= 4; i++) { const x = i * 8.5; const h = Math.sqrt(Math.max(0, 40 * 40 - x * x)); g.add(box(0.5, h, 0.5, 0x2f6b4f, x, h / 2, z)); } };
    arch(-8.6); arch(8.6); arch(24); arch(40);
    // rail deck between the second pair of arches
    g.add(box(120, 1.2, 16, 0x555555, 0, 0.4, 32));
    const r = tplane(120, 16, T.rails(), 30, 4); r.rotation.x = -Math.PI / 2; r.position.set(0, 1.05, 32); g.add(r);
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
  P.tree = (seed) => { const g = new THREE.Group(); const s = 1 + ((seed || 0) % 3) * 0.3; g.add(cyl(0.25 * s, 0.4 * s, 2.6 * s, 0x5a3a1a, 0, 1.3 * s, 0, 7));
    const crown = (r, y, dx, dz, col) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(col)); m.position.set(dx, y, dz); g.add(m); };
    crown(1.9 * s, 3.8 * s, 0, 0, 0x2f7a3a); crown(1.4 * s, 4.9 * s, 0.6 * s, 0.3 * s, 0x3f9a48); crown(1.3 * s, 4.4 * s, -0.8 * s, -0.4 * s, 0x2a6e34); crown(1.1 * s, 3.4 * s, 0.9 * s, -0.7 * s, 0x358a40);
    return g; };
  P.tram = () => { const g = new THREE.Group(); g.add(box(2.4, 2.2, 14, 0xe30613, 0, 1.5, 0)); g.add(box(2.42, 0.8, 13.6, 0x9fd3ff, 0, 1.9, 0)); g.add(box(2.4, 0.3, 14.2, 0xdddddd, 0, 2.75, 0)); g.add(box(0.1, 1.2, 1.6, 0x333333, 0, 3.4, 0)); const s = textPlane('KVB  1  WEIDEN WEST', '#ffb000', '#222222', 2.2, 0.5); s.position.set(0, 2.9, 7.01); g.add(s); return g; };
  // --- more Cologne ---
  P.rathaus = () => {
    // Historisches Rathaus: Gothic tower with figure tiers, Renaissance loggia in front
    const g = new THREE.Group(); const tex = T.romanesque(0xd9cdb5);
    g.add(tbox(14, 40, 14, tex, 0, 20, 0, 0xffffff, [16, 16]));
    g.add(tbox(11, 12, 11, tex, 0, 46, 0, 0xffffff, [16, 16]));
    g.add(tbox(8, 8, 8, tex, 0, 56, 0, 0xffffff, [16, 16]));
    g.add(cone(5, 12, 0x3a3a44, 0, 66, 0, 8));
    for (let t = 0; t < 3; t++) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const r = [8.3, 6.6, 5.0][t]; g.add(box(0.7, 1.6, 0.7, 0xf0e6d0, Math.cos(a) * r, [12, 26, 41][t], Math.sin(a) * r)); }
    // loggia
    g.add(tbox(34, 12, 12, tex, 0, 6, 13, 0xffffff, [16, 16]));
    for (let x = -14; x <= 14; x += 7) { const arch = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 8, 1, false, 0, Math.PI), mat(0x2a2a30)); arch.rotation.x = Math.PI / 2; arch.rotation.z = 0; arch.position.set(x, 3.2, 19.3); g.add(arch); g.add(box(4.4, 3.2, 0.6, 0x2a2a30, x, 1.6, 19.2)); }
    g.add(box(36, 1, 14, 0x9a8a70, 0, 12.5, 13));
    const sign = textPlane('HISTORISCHES RATHAUS · ALTER MARKT', '#3a2a10', '#f0e6d0', 22, 1.6); sign.position.set(0, 9.8, 19.4); g.add(sign);
    // Jan von Werth fountain on Alter Markt
    g.add(cyl(4, 4.5, 1, 0x8a8a8a, 0, 0.5, 36, 8)); g.add(cyl(0.8, 1, 5, 0x9a9a9a, 0, 3.5, 36, 6)); g.add(human({ h: 2.2, bronze: true, hat: 'fedora', hatColor: 0x6a4a2a })).position.set(0, 6, 36);
    return g;
  };
  P.rgm = () => { // Römisch-Germanisches Museum: low concrete box, glass front, Dionysus mosaic inside
    const g = new THREE.Group();
    g.add(tbox(58, 13, 40, T.facade('concrete', 0xb5b0a6, 6, THEME.night), 0, 6.5, 0, 0xffffff, [12, 12]));
    g.add(box(50, 8, 0.6, THEME.night ? 0xffe8a0 : 0x8fc0e8, 0, 5, 20.3));
    const mosaic = textPlane('DIONYSOS-MOSAIK', '#c9a34a', '#3a2a1a', 20, 2.4); mosaic.position.set(0, 2.5, 20.7); g.add(mosaic);
    const sign = textPlane('RÖMISCH-GERMANISCHES MUSEUM', '#111', '#e8e0d0', 30, 2); sign.position.set(0, 11, 20.4); g.add(sign);
    g.add(box(6, 9, 6, 0x9a9088, -22, 4.5, 24)); // Roman tomb of Poblicius-ish
    return g;
  };
  P.eaudecologne = () => { // the neo-gothic Glockengasse house with the carillon
    const g = new THREE.Group();
    g.add(tbox(30, 22, 18, T.facade('gruenderzeit', 0xf1e9d6, 15, THEME.night), 0, 11, 0, 0xffffff, [14, 14]));
    g.add(gable(31, 6, 19, T.roof(0x5a5a66, 3), 0xffffff, 0, 22, 0));
    for (const x of [-12, 12]) { g.add(box(3, 8, 3, 0xe8dcc0, x, 26, 6)); g.add(cone(2.2, 4, 0x5a5a66, x, 32, 6, 4)); }
    const sign = textPlane('EAU DE COLOGNE · GLOCKENGASSE', '#ffd400', '#0b6e6e', 22, 2.2, THEME.night, { border: '#ffd400' }); sign.position.set(0, 16, 9.2); g.add(sign);
    const carillon = textPlane('♪ GLOCKENSPIEL ♪', '#0b6e6e', '#f6f0e0', 10, 1.2); carillon.position.set(0, 20, 9.2); g.add(carillon);
    return g;
  };
  P.reiter = () => { // Heumarkt equestrian statue
    const g = new THREE.Group(); g.add(box(8, 6, 12, 0x8a8a90, 0, 3, 0)); g.add(box(2.4, 2.2, 6, 0x3a4a3a, 0, 7, 0)); g.add(box(1.2, 2, 1.4, 0x3a4a3a, 0, 8.6, 3.2)); for (const [x, z] of [[-0.8, -2], [0.8, -2], [-0.8, 2], [0.8, 2]]) g.add(box(0.5, 2.2, 0.5, 0x3a4a3a, x, 4.9, z)); const rider = human({ h: 1.9, bronze: true, hat: 'fedora', hatColor: 0x3a4a3a }); rider.position.set(0, 7.8, 0); g.add(rider); return g; };
  P.flatbridge = () => { const g = new THREE.Group(); g.add(box(340, 3, 26, 0x6f6f74, 0, 12, 0)); for (let x = -140; x <= 140; x += 70) g.add(box(6, 12, 8, 0x5a5a5e, x, 5, 0)); for (let x = -160; x <= 160; x += 26) g.add(P.lamp()).position.set(x, 13.5, 12); return g; };
  P.archbridge = () => { // Südbrücke style: two steel arches over the deck
    const g = new THREE.Group(); const steel = tmat(T.steel(0x4a6a5a), 0xffffff);
    g.add(box(320, 2.5, 18, 0x555555, 0, 10, 0));
    for (const cx of [-100, 0, 100]) for (const z of [-8, 8]) { const a = new THREE.Mesh(new THREE.TorusGeometry(46, 1.4, 6, 20, Math.PI), steel); a.position.set(cx, 10, z); g.add(a); }
    for (let x = -150; x <= 150; x += 100) g.add(box(6, 10, 18, 0x5a5a5e, x, 5, 0));
    return g;
  };
  P.moschee = () => { // DITIB central mosque in Ehrenfeld: concrete shell dome and two slim minarets
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8d4cc)); dome.position.y = 10; g.add(dome);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; const shell = box(3, 30, 26, 0xc9c5bd, Math.cos(a) * 16, 15, Math.sin(a) * 16); shell.rotation.y = -a; g.add(shell); }
    g.add(box(40, 10, 40, 0xb9b5ad, 0, 5, 0));
    for (const x of [-26, 26]) { g.add(cyl(1.3, 1.6, 55, 0xd8d4cc, x, 27.5, 8, 8)); g.add(cone(1.8, 5, 0x8a8a90, x, 57, 8, 8)); }
    g.add(box(50, 1, 60, 0x9a9690, 0, 0.5, 5));
    return g;
  };
  P.vulkanhalle = () => { const g = new THREE.Group(); g.add(tbox(70, 14, 36, T.facade('industrial', 0x8a4a3a, 5, THEME.night), 0, 7, 0, 0xffffff, [14, 14])); for (let i = 0; i < 5; i++) g.add(gable(14, 5, 36, T.steel(0x6a6a6a), 0xffffff, -28 + i * 14, 14, 0)); const s = textPlane('VULKAN HALLEN · EHRENFELD', '#f0e0c0', '#4a2a1a', 24, 1.8, THEME.night); s.position.set(0, 10, 18.3); g.add(s); g.add(cyl(1.6, 2, 30, 0x8a4a3a, 30, 15, -12, 8)); return g; };
  P.halle = (o) => { const g = new THREE.Group(); g.add(tbox(60, 16, 30, T.facade('industrial', 0x7a4636, 8, THEME.night), 0, 8, 0, 0xffffff, [14, 14])); g.add(gable(62, 6, 32, T.steel(0x555555), 0xffffff, 0, 16, 0)); const s = textPlane((o && o.text) || 'HALLEN KALK', '#ffd400', '#2a1a1a', 20, 1.8, THEME.night); s.position.set(0, 12, 15.3); g.add(s); return g; };
  P.zootor = () => { const g = new THREE.Group(); for (const x of [-9, 9]) g.add(tbox(3, 9, 3, T.brick(0x8a4a3a), x, 4.5, 0, 0xffffff, [4, 4])); g.add(box(21, 1.2, 1, 0x2a2a2a, 0, 9.3, 0)); const s = textPlane('KÖLNER ZOO', '#ffd400', '#1a5a2a', 14, 2.4, false, { border: '#ffd400' }); s.position.set(0, 11.2, 0); g.add(s); g.add(P.giraffe()).position.set(-16, 0, -6); g.add(P.giraffe()).position.set(16, 0, -8); for (let i = 0; i < 6; i++) g.add(box(0.5, 1.6, 0.5, 0xff8fb0, -6 + i * 2.4, 1.0, -10)); return g; };
  P.giraffe = () => { const g = new THREE.Group(); const c = 0xd9a24a; g.add(box(4, 2.4, 1.6, c, 0, 3.2, 0)); for (const [x, z] of [[-1.5, -0.5], [1.5, -0.5], [-1.5, 0.5], [1.5, 0.5]]) g.add(box(0.5, 2.2, 0.5, c, x, 1.1, z)); g.add(box(0.9, 4.5, 0.9, c, 1.8, 6.4, 0)); g.add(box(1.8, 1, 1, c, 2.2, 9, 0)); for (let i = 0; i < 6; i++) g.add(box(0.5, 0.5, 0.2, 0x7a4a1a, -1.5 + i * 0.7, 3.2 + (i % 2) * 0.8, 0.85)); return g; };
  P.tanzbrunnen = () => { const g = new THREE.Group(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.add(cone(7, 10, 0xf4f4f4, Math.cos(a) * 9, 9, Math.sin(a) * 9, 4)); g.add(cyl(0.3, 0.3, 14, 0x555555, Math.cos(a) * 9, 7, Math.sin(a) * 9, 6)); } g.add(cyl(20, 20, 0.6, 0x8a8a90, 0, 0.3, 0, 12)); g.add(cyl(6, 6, 0.4, 0x3f7fc0, 0, 0.8, 0, 12)); const s = textPlane('TANZBRUNNEN', '#1c3f95', '#ffffff', 10, 1.2); s.position.set(0, 4, 20); g.add(s); return g; };
  P.tribuene = () => { // carnival grandstand full of Jecken
    const g = new THREE.Group(); const cols = [0xc1121f, 0xffffff, 0xffd400, 0x1c3f95, 0xff5fa2, 0x2d6a4f, 0xff8800, 0x7fff00];
    const r = mulberry(77);
    for (let row = 0; row < 4; row++) { g.add(box(22, 0.8, 1.6, 0x6a5a4a, 0, 0.4 + row * 0.9, -row * 1.6)); for (let i = 0; i < 12; i++) { const f = human(Object.assign({ h: 1.55 + r() * 0.3 }, CROWD_OUTFITS[Math.floor(r() * CROWD_OUTFITS.length)])); f.position.set(-9.5 + i * 1.75, 0.8 + row * 0.9, -row * 1.6); g.add(f); } }
    mergeVertexColored(g);
    const s = textPlane('KÖLLE ALAAF!', '#ffffff', '#c1121f', 12, 1.6, false, { border: '#ffd400' }); s.position.set(0, 5.5, -6); g.add(s);
    g.userData.crowd = true; g.userData.phase = Math.random() * 6; animated.push(g);
    return g;
  };
  P.zochwagen = () => { const g = buildCar({ shape: 'float', color: [0x00a0ff, 0x7fff00, 0xff8800][Math.floor(Math.random() * 3)] }); g.scale.set(1.4, 1.4, 1.4); g.add(P.figure(0.7, 0xffd400, 0xc1121f)).position.set(0, 1.6, 0.6); return g; };
  P.kirche = (o) => { const g = new THREE.Group(); const tex = T.romanesque((o && o.color) || 0xc4ad8c); const h = (o && o.h) || 40; g.add(tbox(14, 18, 34, tex, 0, 9, -6, 0xffffff, [16, 16])); g.add(gable(15, 8, 35, T.roof(0x6a3a2a, 2), 0xffffff, 0, 18, -6)); g.add(tbox(9, h, 9, tex, 0, h / 2, 12, 0xffffff, [16, 16])); g.add(cone(6, 16, 0x3a3a44, 0, h + 8, 12, 4)); return g; };
  P.hyatt = () => { const g = new THREE.Group(); g.add(tbox(50, 42, 30, T.facade('modern', 0xb8c8d8, 4, THEME.night), 0, 21, 0, 0xffffff, [12, 12])); g.add(box(52, 1.5, 32, 0xdddddd, 0, 42.7, 0)); return g; };
  P.cafe = () => { const g = new THREE.Group(); const r = mulberry(88); for (let i = 0; i < 3; i++) { const x = -3 + i * 3; g.add(cyl(0.6, 0.6, 0.1, 0xf4f4f4, x, 0.9, 0, 8)); g.add(cyl(0.06, 0.08, 0.9, 0x555555, x, 0.45, 0, 6)); g.add(cyl(0.1, 0.1, 2.6, 0x8a8a8a, x, 1.3, 0, 6)); g.add(cone(1.6, 0.9, [0xc1121f, 0xffd400, 0xf4f4f4][i % 3], x, 2.9, 0, 8)); if (r() < 0.7) { const hm = human({ shirt: [0x3a3a5a, 0xc1121f, 0x2d6a4f][i % 3], koelsch: true }); hm.position.set(x + 0.9, 0, 0.5); hm.rotation.y = Math.PI; g.add(hm); } } return g; };
  P.ampel = () => { const g = new THREE.Group(); g.add(cyl(0.1, 0.12, 4.2, 0x444444, 0, 2.1, 0, 6)); g.add(box(0.5, 1.4, 0.4, 0x222222, 0, 3.6, 0)); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.1), bmat(0xff2020))).position.set(0, 4.05, 0.22); g.add(box(0.28, 0.28, 0.1, 0x3a2a00, 0, 3.6, 0.22)); g.add(box(0.28, 0.28, 0.1, 0x0a3a1a, 0, 3.15, 0.22)); return g; };
  P.schild = (o) => { const g = new THREE.Group(); g.add(cyl(0.06, 0.08, 3, 0x777777, 0, 1.5, 0, 6)); const s = textPlane((o && o.text) || 'HOHE STRASSE', '#ffffff', '#1c3f95', 2.6, 0.5, false, { border: '#ffffff', sizeK: 0.5 }); s.position.set(0.9, 2.7, 0); g.add(s); return g; };
  P.parkedcar = (o) => { const g = new THREE.Group(); const c = (o && o.color) || 0x888888; g.add(box(1.8, 0.6, 4.0, c, 0, 0.7, 0)); g.add(box(1.6, 0.55, 2.0, c, 0, 1.25, -0.2)); g.add(box(1.62, 0.3, 1.8, 0x223344, 0, 1.3, -0.2)); for (const [x, z] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) g.add(box(0.3, 0.6, 0.6, 0x111111, x, 0.3, z)); return g; };
  P.passant = (o) => { const k = (o && o.k) || 0; return human(Object.assign({ h: 1.55 + (k % 5) * 0.07 }, CROWD_OUTFITS[k % CROWD_OUTFITS.length])); };
  P.muell = () => { const g = new THREE.Group(); g.add(cyl(0.4, 0.4, 1.1, 0xff7a00, 0, 0.55, 0, 8)); g.add(cyl(0.45, 0.45, 0.15, 0x333333, 0, 1.15, 0, 8)); return g; };
  P.fahrrad = () => { const g = new THREE.Group(); for (const x of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 5, 8), mat(0x222222)); w.position.set(x, 0.36, 0); w.rotation.y = Math.PI / 2; g.add(w); } g.add(box(1.0, 0.08, 0.08, 0x2a6a9a, 0, 0.7, 0)); g.add(box(0.08, 0.6, 0.08, 0x2a6a9a, 0.2, 0.7, 0)); return g; };
  P.tramline = (o) => { // rails alongside the street with a KVB tram shuttling back and forth
    const g = new THREE.Group(); const len = (o && o.len) || 160;
    const r = tplane(4, len, T.rails(), 1, len / 4); r.rotation.x = -Math.PI / 2; r.position.y = 0.06; g.add(r);
    for (let z = -len / 2; z <= len / 2; z += 30) { g.add(cyl(0.1, 0.12, 6, 0x555555, 2.4, 3, z, 6)); g.add(box(3, 0.1, 0.1, 0x555555, 1, 6, z)); }
    g.add(box(0.05, 0.05, len, 0x333333, 0, 5.4, 0));
    const tram = P.tram(); tram.userData.tramline = { len, dir: 1, speed: 9 + Math.random() * 3 }; tram.userData.keep = true; g.add(tram); animated.push(tram);
    return g;
  };
  P.hansahochhaus = () => { // 1920s brick high-rise on the Hansaring, once the tallest in Europe
    const g = new THREE.Group(); const b = T.facade('industrial', 0x7a3a2a, 2, THEME.night);
    g.add(tbox(34, 50, 24, b, 0, 25, 0, 0xffffff, [12, 12])); g.add(tbox(22, 14, 18, b, 0, 57, 0, 0xffffff, [12, 12])); g.add(tbox(12, 8, 10, b, 0, 68, 0, 0xffffff, [12, 12]));
    for (let x = -14; x <= 14; x += 7) g.add(box(2, 54, 1, 0x5a2a1a, x, 27, 12.6));
    const s = textPlane('HANSAHOCHHAUS', '#ffd400', '#2a1010', 20, 2.2, THEME.night, { border: '#ffd400' }); s.position.set(0, 46, 12.3); g.add(s);
    if (THEME.night) g.add(glow(36, 20, 0xffd400, 0, 14));
    return g;
  };
  P.koelnturm = () => { const g = new THREE.Group(); g.add(tbox(22, 140, 22, T.facade('glass', 0x6f8fc8, 3, THEME.night), 0, 70, 0, 0xffffff, [10, 10])); g.add(box(24, 2, 24, 0xdddddd, 0, 141, 0)); g.add(box(1, 12, 1, 0xff3333, 0, 148, 0)); const s = textPlane('MEDIAPARK', '#00e5ff', '#0b0f2a', 16, 2.4, THEME.night); s.position.set(0, 120, 11.2); g.add(s); return g; };
  P.eigelsteintor = () => { const g = P.severinstor(); g.traverse((o) => { if (o.isMesh && o.material.map) o.material = tmat(T.brick(0x7a5a4a), 0xffffff); }); const s = textPlane('EIGELSTEINTOR', '#f0e0c0', '#3a2a1a', 14, 1.8, THEME.night); s.position.set(0, 20, 5); g.add(s); if (THEME.night) g.add(glow(30, 14, 0xffa060, 0, 4)); return g; };
  P.hafenkran = () => { // Mülheim harbour crane
    const g = new THREE.Group(); const c = 0x3a4a5a;
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) g.add(box(0.8, 34, 0.8, c, x, 17, z));
    for (let y = 6; y < 34; y += 7) { g.add(box(7, 0.5, 0.5, c, 0, y, -3)); g.add(box(7, 0.5, 0.5, c, 0, y, 3)); g.add(box(0.5, 0.5, 7, c, -3, y, 0)); g.add(box(0.5, 0.5, 7, c, 3, y, 0)); }
    g.add(box(8, 3, 6, 0x555566, 0, 35.5, 0));
    const jib = box(38, 1.2, 1.2, c, 16, 36.5, 0); g.add(jib); g.add(box(12, 1.2, 1.2, c, -9, 36.5, 0));
    g.add(box(0.3, 14, 0.3, 0x222222, 30, 29, 0)); g.add(box(3, 2, 3, 0xffd400, 30, 21, 0));
    g.add(box(4, 4, 6, 0x8a2a2a, -11, 34, 0));
    return g;
  };
  P.odonien = () => { // Ehrenfeld's scrap-metal art playground
    const g = new THREE.Group(); const r = mulberry(99);
    g.add(box(30, 0.4, 20, 0x5a5a60, 0, 0.2, 0));
    for (let i = 0; i < 9; i++) { const h = 3 + r() * 9; const c = [0x8a7a6a, 0xb07a2a, 0x6a6a72, 0xc1121f][i % 4]; const b = box(1 + r() * 2, h, 1 + r() * 2, c, -12 + i * 3, h / 2 + 0.4, -6 + r() * 12); b.rotation.z = (r() - 0.5) * 0.4; g.add(b); }
    const robot = new THREE.Group(); robot.add(box(3, 4, 2, 0x8a7a6a, 0, 4, 0)); robot.add(box(2, 2, 2, 0x9a8a7a, 0, 7, 0)); robot.add(box(0.8, 3.5, 0.8, 0x7a6a5a, -2.2, 4, 0)); robot.add(box(0.8, 3.5, 0.8, 0x7a6a5a, 2.2, 4, 0)); robot.add(box(0.5, 0.5, 0.2, 0xff2020, -0.5, 7.2, 1.05)); robot.add(box(0.5, 0.5, 0.2, 0xff2020, 0.5, 7.2, 1.05)); robot.position.set(6, 0.4, 5); g.add(robot);
    const s = textPlane('ODONIEN – FREISTAAT', '#ffd400', '#2a2a2a', 12, 1.6, THEME.night, { border: '#ff2d95' }); s.position.set(0, 6, 10); g.add(s);
    g.add(box(0.3, 6, 0.3, 0x444444, -6, 3, 10)); g.add(box(0.3, 6, 0.3, 0x444444, 6, 3, 10));
    return g;
  };
  P.rheinsprung = () => { const g = new THREE.Group(); const s = textPlane('RHEIN SPRUNG  →', '#c1121f', '#f6f0e0', 6, 2.2, false, { border: '#c1121f' }); s.position.set(0, 3.2, 0); g.add(s); g.add(cyl(0.12, 0.14, 2.2, 0x555555, -2.5, 1.1, 0, 6)); g.add(cyl(0.12, 0.14, 2.2, 0x555555, 2.5, 1.1, 0, 6)); return g; };
  // --- Chicago am Rhein / Miami Vice extras & more street life ---
  P.palm = (o) => { const g = new THREE.Group(); const h = (o && o.h) || 7; const r = mulberry((o && o.seed) || 3);
    for (let i = 0; i < 6; i++) { const seg = box(0.7, h / 6 + 0.1, 0.7, i % 2 ? 0x8a6a3a : 0x7a5a2a, Math.sin(i * 0.4) * 0.4, (i + 0.5) * h / 6, 0); g.add(seg); }
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const leaf = box(0.5, 0.25, 3.6, k % 2 ? 0x2f9a48 : 0x3fb858, Math.cos(a) * 1.6, h + 0.3 - Math.abs(Math.sin(k)) * 0.3, Math.sin(a) * 1.6); leaf.rotation.y = -a + Math.PI / 2; leaf.rotation.x = 0.35; g.add(leaf); }
    g.add(box(0.5, 0.5, 0.5, 0x8a5a1a, 0.3, h - 0.2, 0.3)); // coconuts (Kölsch-Kokos)
    if (THEME.night) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.25, h, 0.25), bmat(r() < 0.5 ? 0xff2d95 : 0x00e5ff))).position.set(-0.55, h / 2, 0);
    return g; };
  P.beach = () => { // "Rheinstrand km 689": sand, parasols, palms, beach bar
    const g = new THREE.Group(); const sand = tplane(60, 30, T.grass(0xe8d8a0, 5), 8, 4); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.06; g.add(sand);
    for (let i = 0; i < 6; i++) { const x = -22 + i * 9; g.add(cyl(0.08, 0.08, 2.6, 0x8a8a8a, x, 1.3, -4 + (i % 2) * 6, 6)); g.add(cone(1.8, 0.9, [0xff2d95, 0x00e5ff, 0xffd400, 0xffffff][i % 4], x, 2.9, -4 + (i % 2) * 6, 8)); g.add(box(1.8, 0.4, 0.8, [0xff2d95, 0x00e5ff][i % 2], x + 1.2, 0.35, -4 + (i % 2) * 6)); }
    for (let i = 0; i < 4; i++) g.add(P.palm({ h: 6 + i, seed: i })).position.set(-26 + i * 17, 0, -12);
    const bar = new THREE.Group(); bar.add(box(8, 3, 3, 0x8a5a2a, 0, 1.5, 0)); bar.add(box(9, 0.3, 4, 0xd0a060, 0, 3.1, 0)); bar.add(cone(5.5, 1.6, 0xb0864a, 0, 4, 0, 4)); const sg = textPlane('RHEINSTRAND KM 689 · KÖLSCH & COCKTAILS', THEME.night ? '#ff2d95' : '#c1121f', '#f6f0e0', 8, 1.2, THEME.night, { border: '#ff2d95' }); sg.position.set(0, 2.3, 1.55); bar.add(sg); bar.position.set(18, 0, 10); g.add(bar);
    for (let i = 0; i < 5; i++) { const f = human({ shirt: [0xff2d95, 0xffd400, 0x00e5ff, 0xffffff, 0xff8800][i], pants: 0xf4e0c0, koelsch: i % 2 === 0 }); f.position.set(-16 + i * 7, 0, 2 + (i % 2) * 4); f.rotation.y = Math.random() * 6; g.add(f); }
    if (THEME.night) g.add(glow(40, 20, 0xff2d95, 10, 4));
    return g; };
  P.speedboat = () => { const g = new THREE.Group(); g.add(box(9, 1.2, 3, 0xf4f4f4, 0, 0.6, 0)); g.add(box(4, 0.8, 2.6, 0xff2d95, -1, 1.5, 0)); g.add(box(2, 0.5, 2.2, 0x00e5ff, 1.5, 1.4, 0)); g.add(box(0.15, 0.15, 3, 0x00e5ff, 0, 1.3, 0)); g.add(box(1.5, 0.3, 1.5, 0xffffff, 3.5, 1.0, 0)); g.userData.speedboat = { phase: Math.random() * 10 }; animated.push(g); return g; };
  P.riesenrad = () => { // Ferris wheel by the harbour, slowly turning
    const g = new THREE.Group(); const R = 22;
    for (const z of [-2, 2]) { g.add(box(3, R + 6, 2, 0x8a8a92, -6, (R + 6) / 2, z)).rotation.z = 0.25; g.add(box(3, R + 6, 2, 0x8a8a92, 6, (R + 6) / 2, z)).rotation.z = -0.25; }
    const wheel = new THREE.Group(); wheel.position.y = R + 3;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const sp = box(0.5, R, 0.5, 0xdddddd, Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a + Math.PI / 2; wheel.add(sp); const gondola = box(2.6, 2.2, 2, [0xff2d95, 0x00e5ff, 0xffd400, 0xffffff][k % 4], Math.cos(a) * R, Math.sin(a) * R, 0); gondola.userData.gondolaK = k; wheel.add(gondola); if (THEME.night) wheel.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), bmat([0xff2d95, 0x00e5ff][k % 2]))).position.set(Math.cos(a) * R, Math.sin(a) * R, 1.3); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.5, 6, 24), THEME.night ? bmat(0xff2d95) : mat(0xdddddd)); wheel.add(rim);
    wheel.userData.wheel = true; wheel.userData.keep = true; g.add(wheel); animated.push(wheel);
    const s = textPlane('RIESENRAD AM RHING', '#ffd400', '#2a1a3a', 12, 1.6, THEME.night); s.position.set(0, 3.5, 6); g.add(s);
    return g; };
  P.zeppelin = () => { // the Kölsch airship cruising over the city
    const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), mat(0xf4f4f4)); body.scale.set(3.2, 1, 1); g.add(body);
    g.add(box(6, 2, 2.5, 0xdddddd, 0, -5.5, 0)); g.add(box(2, 4, 0.3, 0xc1121f, -17, 1, 0)); g.add(box(2, 0.3, 4, 0xc1121f, -17, 1, 0));
    const s = textPlane('TÜNN KÖLSCH – ET LÄUFT', '#c1121f', '#f4f4f4', 14, 3, THEME.night); s.position.set(0, 0, 6.2); g.add(s); const s2 = s.clone(); s2.position.z = -6.2; s2.rotation.y = Math.PI; g.add(s2);
    g.position.y = 120; g.userData.zeppelin = { phase: Math.random() * 100 }; g.userData.keep = true; animated.push(g);
    return g; };
  P.fireworks = () => { // Kölner Lichter: bursts over the Rhine (night)
    const N = 420; const pos = new Float32Array(N * 3), col = new Float32Array(N * 3); const vel = new Float32Array(N * 3); const life = new Float32Array(N);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    for (let i = 0; i < N; i++) life[i] = -Math.random() * 6;
    pts.userData.fw = { pos, col, vel, life, N, timer: 0 }; pts.userData.keep = true; pts.frustumCulled = false; animated.push(pts);
    return pts; };
  P.moewen = () => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const m = new THREE.Group(); m.add(box(1.2, 0.1, 0.25, 0xf4f4f4, -0.6, 0, 0)).rotation.z = 0.3; m.add(box(1.2, 0.1, 0.25, 0xf4f4f4, 0.6, 0, 0)).rotation.z = -0.3; m.position.set((i - 3) * 6, 14 + (i % 3) * 3, (i % 2) * 5); m.userData.moewe = { phase: i }; g.add(m); animated.push(m); } return g; };
  P.litfass = (o) => { const g = new THREE.Group(); g.add(cyl(1.1, 1.1, 3.2, 0x3a3a44, 0, 1.6, 0, 10)); g.add(cyl(1.3, 1.3, 0.3, 0x2a2a30, 0, 3.35, 0, 10)); g.add(cone(1.2, 0.6, 0x2a2a30, 0, 3.8, 0, 10));
    const posters = (o && o.texts) || ['ROSENMONTAG', 'KÖLSCH-FEST', 'FC HEIMSPIEL', 'TÜNN LIVE', 'BOXKELLER'];
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const pl = textPlane(posters[k % posters.length], ['#ffffff', '#ffd400', '#111', '#ff2d95'][k % 4], ['#c1121f', '#1c3f95', '#ffd400', '#2a1a3a'][k % 4], 1.6, 2.2, false, { sizeK: 0.35 }); pl.position.set(Math.sin(a) * 1.13, 1.7, Math.cos(a) * 1.13); pl.rotation.y = a; g.add(pl); }
    return g; };
  P.telefonzelle = () => { const g = new THREE.Group(); g.add(box(1.2, 2.4, 1.2, 0xffd400, 0, 1.2, 0)); g.add(box(1.0, 1.4, 0.05, 0x9fd3ff, 0, 1.5, 0.61)); g.add(box(1.3, 0.2, 1.3, 0x1c1c1c, 0, 2.5, 0)); const s = textPlane('TELEFON', '#111', '#ffd400', 1.1, 0.25, false, { sizeK: 0.6 }); s.position.set(0, 2.25, 0.63); g.add(s); return g; };
  P.bude = (o) => { // Currywurst / Halve Hahn stand
    const g = new THREE.Group(); const txt = (o && o.text) || 'CURRYWURST & HALVE HAHN';
    g.add(tbox(4.5, 2.6, 2.6, T.facade('concrete', 0xd8c8a8, 3, THEME.night), 0, 1.3, 0, 0xffffff, [4, 3]));
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4), tmat(T.stripes(0xffd400, 0xc1121f), 0xffffff, { side: THREE.DoubleSide })); aw.rotation.x = -Math.PI / 2 + 0.5; aw.position.set(0, 2.9, 1.9); g.add(aw);
    const s = textPlane(txt, THEME.night ? '#ffd400' : '#111', THEME.night ? '#2a1a1a' : '#f6f0e0', 4.4, 0.7, THEME.night, { border: '#c1121f' }); s.position.set(0, 3.1, 1.35); g.add(s);
    g.add(box(4, 0.15, 0.6, 0x8a5a2a, 0, 1.0, 1.5)); g.add(box(0.5, 0.6, 0.5, 0xffffff, -1.2, 1.4, 0.6)); g.add(box(0.3, 0.3, 0.3, 0xffd400, 0.8, 1.2, 1.6)); g.add(box(0.3, 0.3, 0.3, 0xc1121f, 1.3, 1.2, 1.6));
    g.add(human({ shirt: 0xffffff, hat: 'cap', hatColor: 0xffffff, koelsch: true })).position.set(-1.5, 0, 2.6); g.add(human({ shirt: 0x3a3a5a })).position.set(0.6, 0, 3.0);
    if (THEME.night) g.add(glow(8, 6, 0xffd400, 0, 2));
    return g; };
  P.marktstand = () => { const g = new THREE.Group(); g.add(box(3.5, 0.9, 1.6, 0x8a5a2a, 0, 0.7, 0)); for (const x of [-1.6, 1.6]) g.add(cyl(0.06, 0.06, 2.6, 0x555555, x, 1.3, -0.7, 6)); const aw = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.2), tmat(T.stripes([0xc1121f, 0x2d6a4f, 0x1c3f95][Math.floor(Math.random() * 3)], 0xffffff), 0xffffff, { side: THREE.DoubleSide })); aw.rotation.x = -Math.PI / 2 + 0.25; aw.position.set(0, 2.6, 0); g.add(aw); for (let i = 0; i < 6; i++) g.add(box(0.45, 0.35, 0.45, [0xff2020, 0x7fff00, 0xffd400, 0xff8800, 0x2f9a48, 0xf0e0c0][i], -1.3 + i * 0.5, 1.3, 0.3)); return g; };
  P.bank = () => { const g = new THREE.Group(); g.add(box(2.2, 0.12, 0.5, 0x6a4a2a, 0, 0.5, 0)); g.add(box(2.2, 0.5, 0.1, 0x6a4a2a, 0, 0.85, -0.25)); g.add(box(0.15, 0.5, 0.5, 0x333333, -1, 0.25, 0)); g.add(box(0.15, 0.5, 0.5, 0x333333, 1, 0.25, 0)); return g; };
  P.fahrradstaender = () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = P.fahrrad(); b.position.set(i * 0.7 - 1, 0, 0); b.rotation.y = Math.PI / 2; g.add(b); } return g; };
  P.bus = () => { const g = new THREE.Group(); g.add(box(2.5, 2.6, 12, 0xe30613, 0, 1.6, 0)); g.add(box(2.52, 1.0, 11.4, 0x9fd3ff, 0, 2.2, 0)); g.add(box(2.5, 0.2, 12.2, 0xf4f4f4, 0, 2.95, 0)); const s = textPlane('KVB 132 · ZOOBRÜCKE', '#ffb000', '#222', 2.2, 0.45, THEME.night); s.position.set(0, 2.5, 6.05); g.add(s); for (const z of [3.8, -3.8]) { for (const x of [-1.1, 1.1]) g.add(cyl(0.45, 0.45, 0.4, 0x111111, x, 0.45, z, 8)).rotation.z = Math.PI / 2; } return g; };
  P.polizei = () => { // Polizei Köln, blue lights blinking
    const g = new THREE.Group(); g.add(box(1.9, 0.6, 4.4, 0xf4f4f4, 0, 0.7, 0)); g.add(box(1.75, 0.6, 2.2, 0xf4f4f4, 0, 1.3, -0.3)); g.add(box(1.77, 0.35, 2.1, 0x9fd3ff, 0, 1.35, -0.3)); g.add(box(1.95, 0.35, 4.4, 0x1c3f95, 0, 0.55, 0));
    const s = textPlane('POLIZEI', '#1c3f95', '#f4f4f4', 1.6, 0.35, false, { sizeK: 0.6 }); s.position.set(0.98, 0.85, 0); s.rotation.y = Math.PI / 2; g.add(s);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.4), bmat(0x2060ff)); bar.position.set(0, 1.72, -0.3); bar.userData.blink = true; g.add(bar); animated.push(bar);
    if (THEME.night) { const gl = glow(10, 10, 0x2060ff, 0, 0); gl.userData.blink = true; g.add(gl); animated.push(gl); }
    for (const [x, z] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) g.add(box(0.3, 0.6, 0.6, 0x111111, x, 0.3, z));
    g.add(P.polizist()).position.set(1.6, 0, 0.6);
    return g; };
  P.blitzer = () => { // Kölle's favourite: the speed camera. Flash handled by the game.
    const g = new THREE.Group(); g.add(cyl(0.15, 0.18, 3, 0x555555, 0, 1.5, 0, 6)); g.add(box(0.9, 1.0, 0.7, 0x3a3a44, 0, 3.4, 0)); g.add(box(0.35, 0.35, 0.1, 0x111111, 0, 3.4, 0.4));
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })); flash.position.set(0, 3.4, 0.45); g.add(flash); g.userData.flash = flash;
    const s = textPlane('BLITZER', '#fff', '#c1121f', 1.4, 0.35, false, { sizeK: 0.6 }); s.position.set(0, 2.2, 0.3); g.add(s);
    return g; };
  // --- Chicago am Rhein: the real Ringe venues of the 60s/70s ---
  function clubFront(w, h, d, wall, style, seed) { const b = building(w, h, d, style || 'gruenderzeit', wall, 'hip', seed || 3, { night: THEME.night, balconies: true }); return b; }
  P.kleinkoeln = () => { // Friesenstraße: first Cologne bar with a night licence (1926), boxers weighed in here
    const g = new THREE.Group(); g.add(clubFront(16, 14, 12, 0xd8c8a8, 'gruenderzeit', 21));
    const sign = textPlane('KLEIN KÖLN · SEIT 1926', '#ffd400', '#7a1010', 12, 1.6, THEME.night, { border: '#ffd400' }); sign.position.set(0, 4.6, 6.1); g.add(sign);
    const n2 = textPlane('BOXER · NACHTLIZENZ · KÖLSCH', THEME.night ? '#ff2d95' : '#ffffff', '#1a1020', 9, 0.9, THEME.night); n2.position.set(0, 3.5, 6.1); g.add(n2);
    // weigh-in scale and a couple of boxers out front
    g.add(box(0.9, 0.15, 0.9, 0x333333, -5, 0.08, 7.2)); g.add(cyl(0.05, 0.05, 1.6, 0x888888, -5, 0.9, 6.9, 6)); g.add(cyl(0.3, 0.3, 0.08, 0xffffff, -5, 1.7, 6.9, 12));
    const b1 = human({ h: 1.82, shirt: 0xe0ac69, pants: 0xc1121f, hat: 'none', skin: 0xe0ac69 }); b1.position.set(-4, 0, 8); b1.rotation.y = 0.6; g.add(b1);
    const b2 = human({ h: 1.9, shirt: 0xc68642, pants: 0x1c3f95, hat: 'none', skin: 0xc68642 }); b2.position.set(-2.6, 0, 8.4); b2.rotation.y = -0.4; g.add(b2);
    for (const sx of [-1, 1]) { const gl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xc1121f)); gl.position.set(sx * 5.5, 5.6, 6.2); g.add(gl); }
    if (THEME.night) g.add(glow(16, 8, 0xffd400, 0, 8));
    return g; };
  P.loversclub = () => { // the club where the Lange Tünn started as a doorman in the early 60s
    const g = new THREE.Group(); g.add(clubFront(18, 12, 12, 0x3a2a3a, 'concrete', 8));
    const sign = textPlane('LOVERS CLUB', '#ff2d95', '#14061a', 12, 2.2, THEME.night, { border: '#ff2d95' }); sign.position.set(0, 7, 6.1); g.add(sign);
    for (const sx of [-1, 1]) { const heart = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), THEME.night ? bmat(0xff2d95) : mat(0xff2d95)); heart.position.set(sx * 7.5, 7, 6.3); g.add(heart); }
    g.add(box(4, 0.05, 6, 0xa01020, 0, 0.13, 9)); // red carpet
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { g.add(cyl(0.05, 0.05, 1, 0xd0b060, sx * 1.6, 0.5, 6.8 + k * 1.6, 6)); g.add(box(0.06, 0.06, 1.6, 0xc1121f, sx * 1.6, 0.95, 7.6 + k * 1.6)); }
    const door = box(2.4, 3.2, 0.2, 0x2a1020, 0, 1.6, 6.05); g.add(door); g.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.3), bmat(0xff2d95))).position.set(0, 3.3, 6.15);
    const tuenn = human({ h: 2.08, skin: 0xe0ac69, shirt: 0x14141a, pants: 0x14141a, hat: 'fedora', hatColor: 0x0a0a0a, cigar: true, glasses: true }); tuenn.position.set(2.4, 0, 7.4); tuenn.rotation.y = 0.5; g.add(tuenn);
    const s2 = textPlane('TÜRSTEHER: DER LANGE TÜNN', '#ffd400', '#111', 3.4, 0.5, THEME.night, { sizeK: 0.5 }); s2.position.set(2.4, 2.6, 7.4); g.add(s2);
    const q = [{ shirt: 0xffffff, dress: 0xff2d95, hair: 0xd9a24a }, { shirt: 0x2a2a30, hat: 'fedora' }, { shirt: 0xffd400 }, { shirt: 0x1c3f95, hat: 'cap' }];
    q.forEach((o, i) => { const hm = human(Object.assign({ h: 1.6 + (i % 2) * 0.2 }, o)); hm.position.set(-2.2 - i * 0.9, 0, 7.6 + i * 0.7); hm.rotation.y = 0.9; g.add(hm); });
    if (THEME.night) { g.add(glow(20, 12, 0xff2d95, 0, 9)); const pl = new THREE.PointLight(0xff2d95, 1.4, 40); pl.position.set(0, 6, 8); g.add(pl); }
    return g; };
  P.sartory = () => { // Sartory-Säle on Friesenstraße: ballroom, boxing nights, carnival sessions
    const g = new THREE.Group(); g.add(building(30, 16, 22, 'concrete', 0xe8dcc4, 'flat', 5, { night: THEME.night }));
    g.add(box(32, 1.2, 24, 0xc8b898, 0, 16.4, 0));
    const sign = textPlane('SARTORY SÄLE', '#111', '#f4e8c0', 20, 2.6, THEME.night, { border: '#c1121f' }); sign.position.set(0, 12.5, 11.1); g.add(sign);
    const s2 = textPlane('HEUTE: BOXNACHT · MORGEN: PRUNKSITZUNG', '#ffd400', '#2a1a1a', 18, 1.2, THEME.night); s2.position.set(0, 10.3, 11.1); g.add(s2);
    for (let k = 0; k < 6; k++) g.add(box(0.5, 9, 0.5, 0xd8ccb0, -12.5 + k * 5, 4.5, 11.3));
    g.add(box(30, 0.6, 5, 0x8a7a60, 0, 9.2, 13));
    return g; };
  P.residenz = () => { // Residenz cinema, Christophstraße: start of the Lange Tünn's tour
    const g = new THREE.Group(); g.add(building(22, 15, 18, 'concrete', 0xc9c2b4, 'flat', 12, { night: THEME.night }));
    g.add(box(24, 1.6, 6, 0x2a2a30, 0, 6.5, 11)); for (let k = 0; k < 8; k++) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), bmat(0xffe08a))).position.set(-10.5 + k * 3, 7.4, 13.6);
    const m = textPlane('RESIDENZ · HEUTE: CHICAGO AM RHEIN', '#111', '#fff8e0', 22, 1.4, THEME.night, { border: '#c1121f' }); m.position.set(0, 6.5, 14.05); g.add(m);
    const s2 = textPlane('KINO', '#ff2d95', '#1a1020', 6, 2.2, THEME.night, { border: '#ff2d95' }); s2.position.set(0, 11, 9.1); g.add(s2);
    for (let k = 0; k < 3; k++) { const p = textPlane(['DER PATE VOM RING', 'ZOCKER', 'FRISCHSE PITTER'][k], '#ffd400', ['#5a1020', '#102a5a', '#2a2a2a'][k], 3, 4, false, { sizeK: 0.35 }); p.position.set(-7 + k * 7, 3.2, 9.1); g.add(p); }
    return g; };
  P.spielclub = () => { // Zocker den
    const g = new THREE.Group(); g.add(clubFront(14, 12, 12, 0x2a2a34, 'concrete', 15));
    const sign = textPlane('SPIEL-CLUB · ROULETTE · POKER · 24 H', '#00e5ff', '#0a0a18', 12, 1.4, THEME.night, { border: '#00e5ff' }); sign.position.set(0, 5, 6.1); g.add(sign);
    const dice = box(0.9, 0.9, 0.9, 0xffffff, -6, 7.5, 6.2); dice.rotation.set(0.4, 0.6, 0.2); g.add(dice); for (let k = 0; k < 3; k++) g.add(box(0.15, 0.15, 0.1, 0x111111, -6.3 + k * 0.3, 7.5 + (k % 2) * 0.3, 6.7));
    const z = human({ h: 1.75, shirt: 0x8a1a1a, pants: 0x2a2a2a, hat: 'fedora', hatColor: 0x8a1a1a, cigar: true }); z.position.set(3, 0, 7.5); z.rotation.y = -0.4; g.add(z);
    if (THEME.night) g.add(glow(14, 8, 0x00e5ff, 0, 8));
    return g; };
  P.expresskiosk = (o) => { // EXPRESS newspaper stand with today's Chicago-am-Rhein headline
    const g = new THREE.Group(); g.add(box(3.2, 2.6, 2.2, 0xc1121f, 0, 1.3, 0)); g.add(box(3.4, 0.2, 2.4, 0xffffff, 0, 2.7, 0));
    const s = textPlane('EXPRESS', '#ffffff', '#c1121f', 3, 0.7, THEME.night, { border: '#fff' }); s.position.set(0, 2.2, 1.12); g.add(s);
    const h = textPlane((o && o.text) || 'CHICAGO AM RHEIN: 50.000 STRAFTATEN!', '#111', '#f4f0e0', 2.8, 1.0, false, { sizeK: 0.3 }); h.position.set(0, 1.2, 1.12); g.add(h);
    g.add(human({ shirt: 0x8a5a2a, hat: 'cap', hatColor: 0x555555 })).position.set(1.9, 0, 1.4);
    return g; };
  P.kripo = () => { // 1960s Polizei Köln patrol car, green & white
    const g = buildCar({ shape: 'sedan', color: 0xf4f4f4, stripe: 0x2a6a3a, plate: 'K-PZ 61' }, THEME.night);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 10), bmat(0x2060ff)); bar.position.set(0, 1.55, -0.2); bar.userData.blink = true; g.add(bar); animated.push(bar);
    const s = textPlane('POLIZEI', '#2a6a3a', '#f4f4f4', 1.4, 0.3, false, { sizeK: 0.6 }); s.position.set(0.9, 0.75, 0); s.rotation.y = Math.PI / 2; g.add(s);
    g.add(P.polizist()).position.set(1.5, 0, 0.8);
    return g; };
  P.boxring = () => { // street boxing night
    const g = new THREE.Group(); g.add(box(7, 0.8, 7, 0x2a2a34, 0, 0.4, 0)); for (const [x, z] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) g.add(cyl(0.08, 0.08, 1.6, 0xdddddd, x, 1.6, z, 6));
    for (let k = 1; k <= 3; k++) { for (const z of [-3.3, 3.3]) g.add(box(6.6, 0.04, 0.04, [0xc1121f, 0xffffff, 0x1c3f95][k - 1], 0, 0.8 + k * 0.4, z)); for (const x of [-3.3, 3.3]) g.add(box(0.04, 0.04, 6.6, [0xc1121f, 0xffffff, 0x1c3f95][k - 1], x, 0.8 + k * 0.4, 0)); }
    const a = human({ h: 1.85, shirt: 0xe0ac69, pants: 0xc1121f, skin: 0xe0ac69 }); a.position.set(-0.9, 0.8, 0); a.rotation.y = Math.PI / 2; g.add(a);
    const b = human({ h: 1.8, shirt: 0xc68642, pants: 0x1c3f95, skin: 0xc68642 }); b.position.set(0.9, 0.8, 0); b.rotation.y = -Math.PI / 2; g.add(b);
    const ref = human({ h: 1.7, shirt: 0xffffff, pants: 0x1a1a1a }); ref.position.set(0, 0.8, -2); g.add(ref);
    const s = textPlane('BOXNACHT AM RING · TÜNN WIEGT', '#ffd400', '#2a1a1a', 6, 0.8, THEME.night); s.position.set(0, 2.9, 3.4); g.add(s);
    g.add(P.crowd()).position.set(0, 0, 6);
    return g; };
  P.house = (seed) => { const r = mulberry(seed); const styles = THEME.street === 'altstadt' ? ['altstadt'] : THEME.street === 'industrial' ? ['industrial', 'concrete'] : THEME.street === 'modern' ? ['modern', 'concrete'] : ['gruenderzeit', 'gruenderzeit', 'concrete']; const st = styles[Math.floor(r() * styles.length)];
    const cols = st === 'altstadt' ? PASTEL : st === 'gruenderzeit' ? GRUENDER : st === 'industrial' ? INDUSTRIAL : st === 'modern' ? [0x9fc4e0, 0x8fb4d0] : CONCRETE;
    const w = st === 'altstadt' ? 6 + r() * 3 : 9 + r() * 6, d = 10 + r() * 6, h = st === 'altstadt' ? 11 + r() * 6 : 12 + r() * 10;
    const shops = (THEME.shops || []).concat(SHOPS);
    const opts = { shop: r() < 0.4 ? shops[Math.floor(r() * shops.length)] : null, balconies: st === 'gruenderzeit' && r() < 0.7, night: THEME.night, awning: [0xc1121f, 0x1c3f95, 0x2d6a4f, 0xffd400][Math.floor(r() * 4)] };
    return building(w, h, d, st, cols[Math.floor(r() * cols.length)], st === 'altstadt' ? (r() < 0.5 ? 'stepped' : 'gable') : st === 'gruenderzeit' ? 'hip' : 'flat', Math.floor(r() * 1000), opts); };

  // ------------------------------------------------ road ----
  function buildRoad(track, theme) {
    const S = track.samples, n = S.length;
    const pos = [], col = [], uv = [], idx = [];
    const c1 = new THREE.Color(theme.road[0]), c2 = new THREE.Color(theme.road[1]);
    const cRed = new THREE.Color(theme.night ? 0x9a1e1e : 0xd22a2a), cWhite = new THREE.Color(theme.night ? 0x9a9aa4 : 0xf2f2f2), cLine = new THREE.Color(theme.night ? 0xb8a85a : 0xf5e27a);
    const cStart = new THREE.Color(0xffffff), cStartB = new THREE.Color(0x111111), cWalk = new THREE.Color(theme.night ? 0x2e2e38 : 0x8f8a82), cUnder = new THREE.Color(0x2a2a2a);
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
    const tex = theme.wet ? T.wet() : theme.street === 'altstadt' ? T.cobble(0xe8e2dc, 3) : T.asphalt(0xffffff, 2);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, side: THREE.DoubleSide, roughness: theme.wet ? 0.35 : 0.85, metalness: theme.wet ? 0.25 : 0.05 });
    const group = new THREE.Group();
    const roadMesh = new THREE.Mesh(g, m); roadMesh.receiveShadow = true;
    group.add(roadMesh);
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
      if (s.kind === 'tunnel' && i % 2 === 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(ROAD_W + 1.8, 0.9, 6, 12, Math.PI), tunnelM); const p = off(s, 0, 0.6); ring.position.copy(p); ring.lookAt(p.clone().add(V(s.T))); g.add(ring); if (i % 10 === 0) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1.5), bmat(0xfff0b0)); l.position.copy(off(s, 0, 7.0)); g.add(l); } }
      if (s.kind === 'ramp' && i % 4 === 0) { const p = off(s, 0, -0.3); const h = Math.max(0.2, p.y - GROUND_Y); const b = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W * 2 + 1.5, h, 2.2), tmat(T.stripes(0xffd400, 0x222222), 0xffffff)); b.position.set(p.x, GROUND_Y + h / 2, p.z); g.add(b); }
    }
    // start gantry
    const s0 = S[2];
    const banner = textPlane('KÖLLE 4D  •  START / ZIEL', '#ffffff', '#c1121f', 20, 2.2, theme.night, { border: '#ffd400' });
    const bp = off(s0, 0, 6.5); banner.position.copy(bp); banner.lookAt(bp.clone().sub(V(s0.T))); g.add(banner);
    for (const side of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7.5, 6), post); pole.position.copy(off(s0, side * 10, 3.5)); g.add(pole); }
    mergeStatic(g, new Set());
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
    ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND_Y; ground.receiveShadow = true; ground.userData.keep = true; g.add(ground);
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
    const FACING = ['kleinkoeln', 'loversclub', 'sartory', 'residenz', 'spielclub', 'expresskiosk', 'boxring', 'denkmal', 'heinzelbrunnen', 'tuennes', 'heinzel', 'koebes', 'anna', 'polizist', 'beach', 'bude', 'litfass', 'telefonzelle', 'marktstand', 'polizei', 'blitzer', 'riesenrad', 'bank', 'hansahochhaus', 'koelnturm', 'eigelsteintor', 'hahnentor', 'odonien', 'rheinsprung', 'billboard', 'neon', 'graffiti', 'tuenn', 'schael', 'gangster', 'crowd', 'koelsch', 'kranhaus', 'hbf', 'schoko', 'museum', 'arena', 'flora', 'lastenrad', 'altstadt', 'row', 'buedchen', 'haltestelle', 'viaduct', 'stmartin', 'dom', 'messeturm', 'chimney', 'triangle', 'lvr', 'musicaldome', 'promenade', 'elephant', 'tram', 'lamp', 'flag'];
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
      prop.userData.type = pd.type; prop.userData.at = at; if (pd.story) prop.userData.story = pd.story; propList.push(prop);
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
      // sidewalk life: lamps, flags, street signs, traffic lights, parked cars, people, bins, bikes, cafés, trees
      const flat = (s.kind === 'straight' || s.kind === 'curve') && Math.abs(s.p.y) < 0.5;
      if (street !== 'park' && flat) {
        const bx = s.B.x, bz = s.B.z; const bl = Math.hypot(bx, bz) || 1;
        const at = (side, lat) => [s.p.x + bx / bl * side * lat, s.p.z + bz / bl * side * lat];
        const put = (prop, side, lat, face) => { const [x, z] = at(side, lat); prop.position.set(x, GROUND_Y, z); if (face) prop.lookAt(s.p.x, GROUND_Y, s.p.z); else prop.rotation.y = Math.atan2(s.T.x, s.T.z); g.add(prop); };
        const k = i / step;
        if (k % 2 === 0) {
          const side = k % 4 ? 1 : -1;
          const l = theme.confetti && rnd() < 0.5 ? P.flag({ a: [0xff5fa2, 0xffd400, 0x00a0ff][i % 3], b: 0xffffff }) : rnd() < 0.15 ? P.flag() : P.lamp();
          put(l, side, ROAD_W + 3.4, true);
        }
        if (k % 7 === 3 && theme.streets) put(P.schild({ text: theme.streets[Math.floor(k / 7) % theme.streets.length] }), k % 2 ? 1 : -1, ROAD_W + 3.9, true);
        if (Math.abs(s.curv || 0) > 0.02 && k % 5 === 0) put(P.ampel(), 1, ROAD_W + 2.0, true);
        if (rnd() < 0.35) put(P.parkedcar({ color: [0x888888, 0xdddddd, 0x223355, 0x7a1a1a, 0x2d6a4f, 0x111111, 0xd9a24a][Math.floor(rnd() * 7)] }), rnd() < 0.5 ? 1 : -1, ROAD_W + 2.6, false);
        if (rnd() < 0.5) { const side = rnd() < 0.5 ? 1 : -1; const [x, z] = at(side, ROAD_W + 2.2 + rnd() * 2); const f = P.passant({ k: Math.floor(rnd() * 20) }); f.position.set(x, GROUND_Y, z); f.rotation.y = rnd() * Math.PI * 2; g.add(f); }
        if (rnd() < 0.15) put(P.muell(), rnd() < 0.5 ? 1 : -1, ROAD_W + 4.0, false);
        if (rnd() < 0.15) put(P.fahrrad(), rnd() < 0.5 ? 1 : -1, ROAD_W + 4.1, false);
        if (k % 9 === 5) put(P.litfass({ texts: theme.posters }), k % 2 ? 1 : -1, ROAD_W + 5.0, false);
        if (k % 13 === 6) put(P.telefonzelle(), k % 2 ? -1 : 1, ROAD_W + 4.6, true);
        if (rnd() < 0.08) put(P.bank(), rnd() < 0.5 ? 1 : -1, ROAD_W + 4.2, true);
        if (rnd() < 0.05) put(P.fahrradstaender(), rnd() < 0.5 ? 1 : -1, ROAD_W + 4.4, false);
        if (k % 17 === 9 && street !== 'altstadt') put(P.bus(), k % 2 ? 1 : -1, ROAD_W + 2.9, false);
        if (street === 'altstadt' && k % 11 === 4) put(P.marktstand(), rnd() < 0.5 ? 1 : -1, ROAD_W + 6.5, true);
        if (street === 'altstadt' && rnd() < 0.25) put(P.cafe(), rnd() < 0.5 ? 1 : -1, ROAD_W + 6.5, true);
        if ((street === 'gruenderzeit' || street === 'modern') && k % 3 === 1) put(P.tree(Math.floor(rnd() * 3)), k % 2 ? 1 : -1, ROAD_W + 4.3, false);
      } else if (street === 'park' && flat && (i / step) % 3 === 0) {
        const bx = s.B.x, bz = s.B.z; const bl = Math.hypot(bx, bz) || 1; const side = (i / step) % 2 ? 1 : -1;
        const l = P.lamp(); l.position.set(s.p.x + bx / bl * side * (ROAD_W + 3.4), GROUND_Y, s.p.z + bz / bl * side * (ROAD_W + 3.4)); l.lookAt(s.p.x, GROUND_Y, s.p.z); g.add(l);
      }
    }
    // background skyline ring: far blocks all around so the city never ends
    let cx = 0, cz = 0; for (const s of S) { cx += s.p.x; cz += s.p.z; } cx /= n; cz /= n;
    let maxR = 0; for (const s of S) maxR = Math.max(maxR, Math.hypot(s.p.x - cx, s.p.z - cz));
    const ringR = maxR + 260;
    const ringN = 64;
    for (let k = 0; k < ringN; k++) {
      const a = k / ringN * Math.PI * 2 + rnd() * 0.1; const rr = ringR + (k % 2 ? 0 : 140) + rnd() * 120;
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      let b;
      if (k % 9 === 4) b = P.kirche({ h: 30 + rnd() * 30, color: [0xc4ad8c, 0xb9a184, 0x9a8a78][k % 3] });        // the romanesque churches of Kölle
      else if (k % 11 === 7) b = P.chimney();
      else {
        const w = 30 + rnd() * 40, h = theme.night ? 30 + rnd() * 70 : 18 + rnd() * 40, d = 30 + rnd() * 30;
        const st = rnd() < 0.3 ? 'modern' : 'concrete';
        b = building(w, h, d, st, (st === 'modern' ? [0x9fc4e0, 0x8fb4d0] : CONCRETE)[Math.floor(rnd() * 2)], 'flat', k);
      }
      b.position.set(x, GROUND_Y, z); b.lookAt(cx, GROUND_Y, cz); g.add(b);
    }
    // far landmarks (the Dom is visible from everywhere in Kölle)
    for (const fl of (theme.far || [])) {
      const prop = P[fl.type](fl, theme); const a = fl.angle * Math.PI / 180;
      prop.position.set(cx + Math.cos(a) * (ringR + (fl.dist || 120)), GROUND_Y, cz + Math.sin(a) * (ringR + (fl.dist || 120)));
      prop.lookAt(cx, GROUND_Y, cz); g.add(prop);
    }
    // batch everything static into one mesh per material (hundreds of draw calls -> a few dozen)
    mergeStatic(g, new Set(animated));
    return { group: g, animated, props: propList };
  }

  const _qTmp = new THREE.Quaternion(), _yAxis = new THREE.Vector3(0, 1, 0), _zAxis = new THREE.Vector3(0, 0, 1);
  function animate(t, dt, center) {
    for (const a of animated) {
      const u = a.userData;
      if (u.wave) { if (!u.baseQ) u.baseQ = a.quaternion.clone(); a.quaternion.copy(u.baseQ).multiply(_qTmp.setFromAxisAngle(_yAxis, Math.sin(t * 0.0015) * 0.25)); a.traverse((c) => { if (c.userData.waveArm) c.rotation.z = -2.6 + Math.sin(t * 0.006) * 0.35; }); }
      else if (u.rain && center) { const p = a.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 3) { p[i + 1] -= dt * 28; if (p[i + 1] < 0) { p[i + 1] = 40; p[i] = center.x + (Math.random() - 0.5) * 80; p[i + 2] = center.z + (Math.random() - 0.5) * 80; } } a.geometry.attributes.position.needsUpdate = true; }
      else if (u.crowd) { if (!u.baseQ) u.baseQ = a.quaternion.clone(); a.position.y = GROUND_Y + Math.abs(Math.sin(t * 0.006 + u.phase)) * 0.35; a.quaternion.copy(u.baseQ).multiply(_qTmp.setFromAxisAngle(_zAxis, Math.sin(t * 0.003 + u.phase) * 0.03)); }
      else if (u.boat) a.position.x += Math.sin(t * 0.0002) * 0.02;
      else if (u.gondola != null) { a.position.x += dt * 4; if (a.position.x > 110) a.position.x = -110; }
      else if (u.water) a.userData.water.offset.x = (t * 0.00004) % 1;
      else if (u.sky && center) { a.position.set(center.x, GROUND_Y - 200, center.z); }
      else if (u.train) { a.position.x += dt * 12; if (a.position.x > 70) a.position.x = -110; }
      else if (u.tramline) { const t2 = u.tramline; a.position.z += t2.dir * t2.speed * dt; if (Math.abs(a.position.z) > t2.len / 2 - 8) { t2.dir *= -1; a.rotation.y = t2.dir > 0 ? 0 : Math.PI; } }
      else if (u.flag) a.rotation.y = Math.sin(t * 0.004) * 0.35;
      else if (u.blink) a.visible = Math.floor(t / 300) % 2 === 0;
      else if (u.speedboat) { a.position.x += Math.cos(t * 0.0004 + u.speedboat.phase) * dt * 14; a.rotation.y = Math.cos(t * 0.0004 + u.speedboat.phase) > 0 ? 0 : Math.PI; }
      else if (u.wheel) a.rotation.z = t * 0.00025;
      else if (u.zeppelin) { const z = u.zeppelin; a.position.x += dt * 6; a.position.y = 120 + Math.sin(t * 0.0003 + z.phase) * 6; if (!z.origin) z.origin = a.position.x; if (a.position.x - z.origin > 900) a.position.x = z.origin - 300; }
      else if (u.moewe) { a.position.x += Math.sin(t * 0.0006 + u.moewe.phase) * dt * 5; a.position.y += Math.cos(t * 0.0011 + u.moewe.phase) * dt * 1.5; a.rotation.z = Math.sin(t * 0.008 + u.moewe.phase) * 0.4; }
      else if (u.fw) {
        const f = u.fw; f.timer -= dt;
        if (f.timer <= 0) { // launch a burst
          f.timer = 1.2 + Math.random() * 2.2; const cx = (center ? center.x : 0) + (Math.random() - 0.5) * 300, cz = (center ? center.z : 0) + (Math.random() - 0.5) * 300, cy = 60 + Math.random() * 50;
          const hue = Math.random(); const c = new THREE.Color().setHSL(hue, 1, 0.6);
          let n = 0; for (let i = 0; i < f.N && n < 70; i++) { if (f.life[i] > 0) continue; n++; f.life[i] = 1.6 + Math.random() * 0.8; f.pos[i * 3] = cx; f.pos[i * 3 + 1] = cy; f.pos[i * 3 + 2] = cz; const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = 14 + Math.random() * 10; f.vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp; f.vel[i * 3 + 1] = Math.cos(ph) * sp; f.vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp; f.col[i * 3] = c.r; f.col[i * 3 + 1] = c.g; f.col[i * 3 + 2] = c.b; }
        }
        for (let i = 0; i < f.N; i++) { if (f.life[i] <= 0) { f.pos[i * 3 + 1] = -100; continue; } f.life[i] -= dt; f.vel[i * 3 + 1] -= 9 * dt; f.pos[i * 3] += f.vel[i * 3] * dt; f.pos[i * 3 + 1] += f.vel[i * 3 + 1] * dt; f.pos[i * 3 + 2] += f.vel[i * 3 + 2] * dt; const k = Math.max(0, f.life[i]) / 2; f.col[i * 3] *= 0.995; }
        a.geometry.attributes.position.needsUpdate = true; a.geometry.attributes.color.needsUpdate = true;
      }
    }
  }

  // ------------------------------------------------ cars ----
  // Side-profile definitions (z along the car, y up), extruded across the width with bevelled edges.
  // 1960s/70s Cologne: Ford Capri & Taunus were built here; the black Benz is the Milieu-Benz of the Ringe.
  const PROFILES = {
    hatch:  { L: 3.9, W: 1.72, pts: [[1.95, 0.32], [1.95, 0.62], [1.7, 0.78], [0.55, 0.86], [0.2, 1.35], [-0.9, 1.4], [-1.5, 1.35], [-1.85, 0.9], [-1.95, 0.5], [-1.95, 0.32]], ws: [0.55, 0.86, 0.2, 1.35], rw: [-1.5, 1.35, -1.85, 0.9] },
    coupe:  { L: 4.4, W: 1.76, pts: [[2.2, 0.3], [2.2, 0.58], [1.95, 0.7], [0.75, 0.78], [0.35, 1.28], [-0.55, 1.32], [-1.3, 1.1], [-1.9, 0.86], [-2.2, 0.8], [-2.2, 0.3]], ws: [0.75, 0.78, 0.35, 1.28], rw: [-0.55, 1.32, -1.3, 1.1] },
    coupe2: { L: 4.75, W: 1.78, pts: [[2.38, 0.3], [2.38, 0.6], [2.1, 0.72], [0.7, 0.8], [0.3, 1.3], [-0.6, 1.34], [-1.4, 1.14], [-2.1, 0.88], [-2.38, 0.82], [-2.38, 0.3]], ws: [0.7, 0.8, 0.3, 1.3], rw: [-0.6, 1.34, -1.4, 1.14] },
    sport:  { L: 4.5, W: 1.85, pts: [[2.25, 0.3], [2.25, 0.5], [1.9, 0.6], [0.6, 0.72], [0.15, 1.2], [-0.7, 1.24], [-1.5, 1.0], [-2.1, 0.86], [-2.25, 0.8], [-2.25, 0.3]], ws: [0.6, 0.72, 0.15, 1.2], rw: [-0.7, 1.24, -1.5, 1.0] },
    sedan:  { L: 4.7, W: 1.78, pts: [[2.35, 0.32], [2.35, 0.65], [2.1, 0.8], [0.7, 0.86], [0.3, 1.38], [-0.7, 1.4], [-1.15, 1.35], [-1.6, 0.95], [-2.35, 0.9], [-2.35, 0.32]], ws: [0.7, 0.86, 0.3, 1.38], rw: [-0.7, 1.4, -1.15, 1.35] },
    limo:   { L: 5.4, W: 1.86, pts: [[2.7, 0.32], [2.7, 0.7], [2.4, 0.86], [0.9, 0.92], [0.5, 1.42], [-0.9, 1.45], [-1.5, 1.4], [-1.9, 1.0], [-2.7, 0.94], [-2.7, 0.32]], ws: [0.9, 0.92, 0.5, 1.42], rw: [-0.9, 1.45, -1.5, 1.4] }
  };
  const paintCache = new Map();
  function paint(color) { const k = 'p' + color; if (!paintCache.has(k)) paintCache.set(k, new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.32 })); return paintCache.get(k); }
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a3a50, metalness: 0.9, roughness: 0.15, transparent: true, opacity: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.2 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.9 });
  function bodyShape(pts) { const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath(); return sh; }
  function buildCarReal(car, night) {
    const P = PROFILES[car.shape] || PROFILES.coupe; const g = new THREE.Group(); const W = P.W;
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape(P.pts), { depth: W - 0.24, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: 4 }), paint(car.color));
    // profile x -> world z (nose at +z), extrusion (local z) -> world x, centred
    body.rotation.set(0, -Math.PI / 2, 0); body.position.set((W - 0.24) / 2, 0, 0); g.add(body);
    // windows: windshield & rear window quads on the slanted faces, side windows
    const quad = (z0, y0, z1, y1, out) => { const geo = new THREE.BufferGeometry(); const hw = W / 2 - 0.16; const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy) || 1; const nz = dy / len * out, ny = -dz / len * out;
      const v = [-hw, y0 + ny, z0 + nz, hw, y0 + ny, z0 + nz, hw, y1 + ny, z1 + nz, -hw, y1 + ny, z1 + nz]; geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, glassMat); m.material.side = THREE.DoubleSide; return m; };
    g.add(quad(P.ws[0], P.ws[1], P.ws[2], P.ws[3], 0.03)); g.add(quad(P.rw[0], P.rw[1], P.rw[2], P.rw[3], 0.03));
    const cabLen = Math.abs(P.ws[2] - P.rw[0]) + 0.1; const cabMid = (P.ws[2] + P.rw[0]) / 2; const cabH = Math.min(P.ws[3], P.rw[1]) - P.ws[1];
    for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.03, cabH * 0.75, cabLen), glassMat); sw.position.set(sx * (W / 2 - 0.09), P.ws[1] + cabH * 0.55, cabMid); g.add(sw); const pillar = box(0.04, cabH * 0.8, 0.08, 0x111111, sx * (W / 2 - 0.09), P.ws[1] + cabH * 0.55, cabMid); g.add(pillar); }
    // chrome bumpers, grille, headlights, tail lights, mirrors, door line, plate
    const nose = P.pts[0][0], tail = P.pts[P.pts.length - 1][0], noseH = P.pts[1][1];
    for (const z of [nose + 0.08, tail - 0.08]) { const b = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.14, 0.16), chromeMat); b.position.set(0, 0.42, z); g.add(b); }
    g.add(box(W * 0.55, noseH - 0.5, 0.06, 0x1a1a1a, 0, 0.5 + (noseH - 0.5) / 2, nose + 0.02));
    for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 14), bmat(night ? 0xfff6d0 : 0xe8f0ff)); hl.rotation.x = Math.PI / 2; hl.position.set(sx * (W / 2 - 0.28), noseH - 0.02, nose + 0.03); g.add(hl); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 14), chromeMat); ring.position.copy(hl.position); g.add(ring);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), bmat(0xff2020)); tl.position.set(sx * (W / 2 - 0.28), P.pts[P.pts.length - 2][1] - 0.12, tail - 0.02); g.add(tl);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.16), paint(car.color)); mirror.position.set(sx * (W / 2 + 0.08), P.ws[1] + 0.32, P.ws[2] + 0.35); g.add(mirror);
      g.add(box(0.012, 0.45, cabLen * 0.9, 0x111111, sx * (W / 2 + 0.005), P.ws[1] - 0.1, cabMid));
    }
    if (car.stripe != null && car.stripe !== 0xffffff) g.add(box(W + 0.02, 0.05, (nose - tail) * 0.9, car.stripe, 0, 0.66, (nose + tail) / 2));
    if (car.shape === 'sport') g.add(box(W * 0.9, 0.05, 0.4, 0x111111, 0, P.pts[P.pts.length - 2][1] + 0.16, tail + 0.3));
    // wheels with rims & arches
    const wr = 0.34, axF = nose - 0.85, axR = tail + 0.85;
    for (const [sx, z] of [[-1, axF], [1, axF], [-1, axR], [1, axR]]) {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, 0.24, 18), tyreMat); tyre.rotation.z = Math.PI / 2; tyre.position.set(sx * (W / 2 - 0.1), wr, z); g.add(tyre);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wr * 0.6, wr * 0.6, 0.26, 12), chromeMat); rim.rotation.z = Math.PI / 2; rim.position.copy(tyre.position); g.add(rim);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(wr + 0.06, 0.05, 6, 14, Math.PI), paint(car.color)); arch.rotation.y = Math.PI / 2; arch.position.set(sx * (W / 2 - 0.02), wr, z); g.add(arch);
    }
    const backZ = tail;
    if (car.plate) { const pl = textPlane(car.plate, '#111', '#f4f4f4', 0.52, 0.12, false, { sizeK: 0.6 }); pl.position.set(0, 0.56, backZ - 0.03); pl.rotation.y = Math.PI; g.add(pl); const pf = textPlane(car.plate, '#111', '#f4f4f4', 0.52, 0.12, false, { sizeK: 0.6 }); pf.position.set(0, 0.5, nose + 0.11); g.add(pf); }
    if (car.shape === 'sport') { const bk = textPlane('BOXKELLER', '#ff2d95', '#0e0e12', 1.4, 0.3, true); bk.position.set(W / 2 + 0.012, 0.95, -0.2); bk.rotation.y = Math.PI / 2; g.add(bk); }
    if (night) { for (const x of [-0.5, 0.5]) { const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 14), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.025, blending: THREE.AdditiveBlending, depthWrite: false })); beam.rotation.x = -Math.PI / 2; beam.position.set(x, 0.05, nose + 7.5); g.add(beam); } }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.userData.backZ = backZ;
    return g;
  }
  function buildCar(car, night) {
    if (PROFILES[car.shape]) return buildCarReal(car, night);
    const g = new THREE.Group();
    const c = car.color, dark = 0x1b1b1b, glass = 0x9fd3ff, stripe = car.stripe == null ? 0xffffff : car.stripe;
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
      case 'hatch': {
        g.add(box(1.9, 0.6, 3.8, c, 0, 0.7, 0)); g.add(box(1.75, 0.7, 2.2, c, 0, 1.3, -0.5)); g.add(box(1.77, 0.4, 2.1, glass, 0, 1.35, -0.5));
        g.add(box(1.95, 0.08, 3.8, stripe, 0, 1.02, 0)); g.add(box(1.8, 0.12, 0.4, 0x111111, 0, 1.7, -1.6));
        wheel(-0.95, 1.25, 0.4); wheel(0.95, 1.25, 0.4); wheel(-0.95, -1.25, 0.4); wheel(0.95, -1.25, 0.4); break;
      }
      case 'coupe2': {
        g.add(box(2.0, 0.6, 4.8, c, 0, 0.7, 0)); g.add(box(1.75, 0.6, 2.4, c, 0, 1.28, -0.5)); g.add(box(1.77, 0.35, 2.3, glass, 0, 1.32, -0.5));
        g.add(box(0.5, 0.05, 4.8, stripe, -0.5, 1.02, 0)); g.add(box(0.5, 0.05, 4.8, stripe, 0.5, 1.02, 0));
        g.add(box(2.05, 0.12, 0.45, 0x111111, 0, 1.15, -2.2));
        wheel(-1.0, 1.55); wheel(1.0, 1.55); wheel(-1.0, -1.55); wheel(1.0, -1.55); break;
      }
      case 'sport': {
        g.add(box(2.1, 0.5, 4.8, c, 0, 0.65, 0)); g.add(box(1.7, 0.55, 2.0, c, 0, 1.15, -0.6)); g.add(box(1.72, 0.32, 1.9, glass, 0, 1.2, -0.6));
        g.add(box(2.15, 0.06, 0.8, stripe, 0, 0.92, 1.4)); // side strakes / pink pinstripe
        g.add(box(0.5, 0.15, 0.7, c, -0.6, 0.98, 1.9)); g.add(box(0.5, 0.15, 0.7, c, 0.6, 0.98, 1.9)); // pop-up lights
        g.add(box(2.2, 0.1, 0.5, 0x111111, 0, 1.05, -2.3));
        const bk = textPlane('BOXKELLER', '#ff2d95', '#0e0e12', 1.6, 0.35, true); bk.position.set(1.06, 0.7, -0.4); bk.rotation.y = Math.PI / 2; g.add(bk);
        wheel(-1.05, 1.5); wheel(1.05, 1.5); wheel(-1.05, -1.5); wheel(1.05, -1.5); break;
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
    if (!['tram', 'float', 'kart'].includes(car.shape)) {
      const len = car.shape === 'limo' ? 5.6 : car.shape === 'hatch' ? 3.8 : car.shape === 'coupe2' || car.shape === 'sport' ? 4.8 : 4.4;
      const wid = car.shape === 'limo' ? 2.1 : car.shape === 'sport' ? 2.1 : 2.0;
      // bumpers, mirrors, side windows, door line, wheel arches
      g.add(box(wid + 0.05, 0.22, 0.25, 0x222226, 0, 0.55, len / 2 + 0.05)); g.add(box(wid + 0.05, 0.22, 0.25, 0x222226, 0, 0.55, -len / 2 - 0.05));
      for (const x of [-1, 1]) { g.add(box(0.12, 0.14, 0.3, c, x * (wid / 2 + 0.12), 1.12, 0.5)); g.add(box(0.05, 1.0, 1.9, glass, x * (wid / 2 - 0.12), 1.32, -0.4)); g.add(box(0.03, 0.55, len - 0.8, 0x111111, x * (wid / 2 + 0.005), 0.72, 0)); }
      for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const az = car.shape === 'hatch' ? 1.25 : car.shape === 'limo' ? 1.8 : car.shape === 'coupe2' || car.shape === 'sport' ? 1.5 : 1.4; g.add(box(0.3, 0.5, 1.1, 0x161618, x * (wid / 2 - 0.05), 0.6, z * az)); }
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    const backZ = (car.shape === 'tram' || car.shape === 'float') ? -3.0 : car.shape === 'limo' ? -2.8 : car.shape === 'hatch' ? -1.92 : car.shape === 'coupe2' || car.shape === 'sport' ? -2.42 : -2.25;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.08), bmat(0xff2020)); tl.position.set(0, 0.85, backZ); g.add(tl);
    if (car.plate) { const pl = textPlane(car.plate, '#111', '#f4f4f4', 0.7, 0.18, false, { sizeK: 0.6 }); pl.position.set(0, 0.6, backZ - 0.02); pl.rotation.y = Math.PI; g.add(pl); }
    if (night) { for (const x of [-0.7, 0.7]) { const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 14), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.025, blending: THREE.AdditiveBlending, depthWrite: false })); beam.rotation.x = -Math.PI / 2; beam.position.set(x, 0.05, -backZ + 8.5); g.add(beam); } }
    return g;
  }

  // ------------------------------------------------ confetti ----
  function buildConfetti() {
    const N = 260;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const cols = [0xff5fa2, 0xffd400, 0x00a0ff, 0x7fff00, 0xffffff, 0xff2d2d];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      const c = new THREE.Color(cols[i % cols.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.5, vertexColors: true }));
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

  root.World = { buildRoad, buildScenery, buildCar, buildConfetti, textPlane, animate, ROAD_W, GROUND_Y, WATER_Y, P, human, mergeVertexColored };
})(window);
