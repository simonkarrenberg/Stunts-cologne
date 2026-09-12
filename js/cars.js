/* Kölle 4D – car bodies.
 * Every car is lofted from rounded cross-sections (superellipses) along a side profile,
 * so the bodies have real curvature: a Taunus hatch, a Capri fastback, a Manta-style coupé,
 * a low sports coupé and the long W108 Milieu-Benz. Paint is clearcoated and reflects the
 * sky through an environment map handed in by the game (World.setEnv). */
(function () {
  'use strict';
  const Cars = {};
  const RING = 30;
  let envTex = null;
  const reflective = [];
  Cars.setEnv = (tex) => { envTex = tex; for (const m of reflective) { m.envMap = tex; m.needsUpdate = true; } };

  const paintCache = new Map();
  function paint(color) {
    const k = 'p' + color;
    if (!paintCache.has(k)) { const m = new THREE.MeshPhysicalMaterial({ color, metalness: 0.15, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1, envMap: envTex, envMapIntensity: 0.5 }); reflective.push(m); paintCache.set(k, m); }
    return paintCache.get(k);
  }
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, metalness: 1, roughness: 0.15, envMap: envTex, envMapIntensity: 0.9 }); reflective.push(chrome);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0e141e, metalness: 0.1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.72, envMap: envTex, envMapIntensity: 0.6, side: THREE.DoubleSide }); reflective.push(glass);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.92, metalness: 0 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0f0f12, roughness: 0.6, metalness: 0.3 });
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.5, metalness: 0.6 });
  const lampOff = new THREE.MeshPhysicalMaterial({ color: 0xcfd8e0, metalness: 0.1, roughness: 0.15, clearcoat: 1, envMap: envTex, envMapIntensity: 0.8 }); reflective.push(lampOff);
  const lampOn = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
  const tailOff = new THREE.MeshPhysicalMaterial({ color: 0xb01818, roughness: 0.2, clearcoat: 1, envMap: envTex }); reflective.push(tailOff);
  const tailOn = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const amber = new THREE.MeshPhysicalMaterial({ color: 0xd88a10, roughness: 0.2, clearcoat: 1, envMap: envTex }); reflective.push(amber);

  /* profiles: body = belt/hood line stations [z, yTop, widthFactor] from tail to nose,
   * cabin = greenhouse stations from the cowl backwards [z, yTop, widthFactor], ax = axle z (front, rear) */
  const SPECS = {
    hatch:  { L: 3.9, W: 1.68, wr: 0.31, floor: 0.27,
      body: [[-1.95, 0.80, 0.84], [-1.75, 0.85, 0.95], [-0.8, 0.87, 1], [0.7, 0.85, 1], [1.5, 0.78, 0.96], [1.95, 0.71, 0.84]],
      cabin: [[0.65, 0.84, 0.9], [0.1, 1.36, 0.9], [-0.95, 1.40, 0.9], [-1.5, 1.24, 0.88], [-1.8, 0.88, 0.84]],
      ax: [1.25, -1.2], lights: 'rect', grille: 'wide' },
    coupe:  { L: 4.4, W: 1.72, wr: 0.32, floor: 0.27,
      body: [[-2.2, 0.80, 0.85], [-1.95, 0.86, 0.96], [-0.5, 0.87, 1], [0.9, 0.83, 1], [1.8, 0.74, 0.97], [2.2, 0.69, 0.84]],
      cabin: [[0.45, 0.82, 0.9], [-0.05, 1.28, 0.9], [-0.95, 1.31, 0.9], [-1.65, 1.06, 0.88], [-2.1, 0.84, 0.85]],
      ax: [1.4, -1.45], lights: 'round4', grille: 'slim' },
    coupe2: { L: 4.55, W: 1.74, wr: 0.32, floor: 0.27,
      body: [[-2.27, 0.82, 0.85], [-2.0, 0.88, 0.96], [-0.6, 0.88, 1], [0.9, 0.84, 1], [1.9, 0.74, 0.97], [2.27, 0.68, 0.84]],
      cabin: [[0.5, 0.83, 0.9], [0.0, 1.30, 0.9], [-0.9, 1.33, 0.9], [-1.6, 1.12, 0.88], [-2.1, 0.86, 0.85]],
      ax: [1.45, -1.5], lights: 'rect', grille: 'wide', spoiler: true },
    sport:  { L: 4.5, W: 1.86, wr: 0.33, floor: 0.24,
      body: [[-2.25, 0.78, 0.86], [-1.9, 0.84, 0.97], [-0.5, 0.86, 1], [1.0, 0.74, 1], [1.9, 0.62, 0.96], [2.25, 0.56, 0.82]],
      cabin: [[0.35, 0.80, 0.88], [-0.15, 1.18, 0.88], [-0.95, 1.20, 0.88], [-1.55, 1.0, 0.86], [-1.95, 0.82, 0.85]],
      ax: [1.45, -1.5], lights: 'popup', grille: 'slot', spoiler: true },
    limo:   { L: 4.95, W: 1.8, wr: 0.34, floor: 0.29,
      body: [[-2.47, 0.88, 0.86], [-2.2, 0.94, 0.96], [-0.9, 0.94, 1], [0.7, 0.9, 1], [1.9, 0.86, 0.98], [2.47, 0.83, 0.86]],
      cabin: [[0.65, 0.88, 0.9], [0.2, 1.42, 0.9], [-1.0, 1.45, 0.9], [-1.5, 1.2, 0.88], [-1.85, 0.94, 0.85]],
      ax: [1.55, -1.55], lights: 'vertical', grille: 'benz' },
    sedan:  { L: 4.7, W: 1.76, wr: 0.32, floor: 0.28,
      body: [[-2.35, 0.86, 0.86], [-2.1, 0.9, 0.96], [-0.8, 0.9, 1], [0.7, 0.87, 1], [1.8, 0.8, 0.98], [2.35, 0.76, 0.85]],
      cabin: [[0.6, 0.86, 0.9], [0.15, 1.4, 0.9], [-0.95, 1.42, 0.9], [-1.45, 1.18, 0.88], [-1.8, 0.9, 0.85]],
      ax: [1.5, -1.5], lights: 'rect', grille: 'wide' }
  };
  Cars.SPECS = SPECS;

  function superRing(hw, y0, y1, n, tumble, R) {
    R = R || RING; const pts = []; const cy = (y0 + y1) / 2, hh = (y1 - y0) / 2;
    for (let i = 0; i < R; i++) {
      const a = i / R * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * hw; const y = cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * hh;
      if (tumble && y > cy) x *= 1 - tumble * (y - cy) / hh;
      pts.push([x, y]);
    }
    return pts;
  }
  function interp(st, z, k) { // stations sorted by z ascending; linear interpolation of column k
    if (z <= st[0][0]) return st[0][k]; if (z >= st[st.length - 1][0]) return st[st.length - 1][k];
    for (let i = 0; i < st.length - 1; i++) { const a = st[i], b = st[i + 1]; if (z >= a[0] && z <= b[0]) { const t = (z - a[0]) / (b[0] - a[0] || 1); return a[k] + (b[k] - a[k]) * t; } }
    return st[0][k];
  }
  /** loft a list of stations {z, ring} into a smooth closed tube with flat caps */
  function loft(stations, material, caps) {
    const S = stations.length, pos = [], idx = []; const RING = stations[0].ring.length;
    for (let j = 0; j < S; j++) { const st = stations[j]; for (let i = 0; i < RING; i++) pos.push(st.ring[i][0], st.ring[i][1], st.z); }
    for (let j = 0; j < S - 1; j++) for (let i = 0; i < RING; i++) { const i2 = (i + 1) % RING, a = j * RING + i, b = j * RING + i2, c = (j + 1) * RING + i2, d = (j + 1) * RING + i; idx.push(a, b, c, a, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const g = new THREE.Group(); const body = new THREE.Mesh(geo, material); body.castShadow = true; g.add(body);
    if (caps) for (const end of [0, S - 1]) {
      const st = stations[end]; let cx = 0, cy = 0; for (const p of st.ring) { cx += p[0]; cy += p[1]; } cx /= RING; cy /= RING;
      const cp = [], ci = []; cp.push(cx, cy, st.z); for (let i = 0; i < RING; i++) cp.push(st.ring[i][0], st.ring[i][1], st.z);
      for (let i = 0; i < RING; i++) { const i2 = (i + 1) % RING; if (end === 0) ci.push(0, 1 + i2, 1 + i); else ci.push(0, 1 + i, 1 + i2); }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setIndex(ci); cg.computeVertexNormals();
      const cap = new THREE.Mesh(cg, material); cap.castShadow = true; g.add(cap);
    }
    return g;
  }
  /** a bar between two points */
  function bar(a, b, w, h, material) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b); const len = va.distanceTo(vb);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), material); m.position.copy(va).lerp(vb, 0.5); m.lookAt(vb); return m;
  }
  function boxM(w, h, d, material, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m; }
  function cylM(rt, rb, h, material, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), material); }

  function wheel(spec, side) {
    const wr = spec.wr; const g = new THREE.Group();
    const t = cylM(wr, wr, 0.22, tyre, 22); t.rotation.z = Math.PI / 2; t.castShadow = true; g.add(t);
    const rim = cylM(wr * 0.64, wr * 0.64, 0.23, chrome, 16); rim.rotation.z = Math.PI / 2; g.add(rim);
    const dish = cylM(wr * 0.5, wr * 0.5, 0.12, dark, 16); dish.rotation.z = Math.PI / 2; dish.position.x = side * 0.09; g.add(dish);
    for (let k = 0; k < 5; k++) { const sp = boxM(0.05, wr * 0.9, 0.06, chrome, side * 0.12, 0, 0); sp.rotation.x = k / 5 * Math.PI; g.add(sp); }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(wr * 0.16, 10, 8), chrome); hub.position.x = side * 0.13; g.add(hub);
    return g;
  }

  function liteWheel(spec, side) { const g = new THREE.Group(); const t = cylM(spec.wr, spec.wr, 0.22, tyre, 14); t.rotation.z = Math.PI / 2; g.add(t); const rim = cylM(spec.wr * 0.6, spec.wr * 0.6, 0.24, chrome, 10); rim.rotation.z = Math.PI / 2; g.add(rim); return g; }
  Cars.build = function (car, night, H, opts) {
    opts = opts || {}; const lite = !!opts.lite; H = H || {};
    const spec = SPECS[car.shape] || SPECS.coupe; const g = new THREE.Group();
    const W = spec.W, hw = W / 2, tail = spec.body[0][0], nose = spec.body[spec.body.length - 1][0];
    const floorAt = (z) => spec.floor + Math.max(0, Math.abs(z) - (spec.L / 2 - 0.55)) * 0.5;
    // ---- body: belt line loft with a bit of tumblehome and a flat nose / tail face
    const bodySt = [];
    const zs = []; for (let z = tail; z < nose - 0.01; z += lite ? 0.45 : 0.22) zs.push(z); zs.push(nose);
    for (const z of zs) bodySt.push({ z, ring: superRing(hw * interp(spec.body, z, 2), floorAt(z), interp(spec.body, z, 1), 5.5, 0.07, lite ? 18 : RING) });
    const body = loft(bodySt, paint(car.color), true); g.add(body);
    // ---- cabin: glass loft from cowl to rear window; painted roof panel + pillars on top
    const cab = spec.cabin; const cabSt = [];
    const cz = []; for (let z = cab[cab.length - 1][0]; z < cab[0][0] - 0.01; z += lite ? 0.25 : 0.12) cz.push(z); cz.push(cab[0][0]);
    const belt = (z) => interp(spec.body, z, 1);
    for (const z of cz) cabSt.push({ z, ring: superRing(hw * interp(cab.slice().reverse(), z, 2) * 0.96, belt(z) - 0.08, interp(cab.slice().reverse(), z, 1), 3.2, 0.18, lite ? 18 : RING) });
    g.add(loft(cabSt, glass, false));
    const roofW = hw * cab[1][2] * 0.96 * 0.78;
    const roofLen = cab[1][0] - cab[2][0];
    const roof = boxM(roofW * 2, 0.06, roofLen + 0.1, paint(car.color), 0, cab[1][1] + 0.005, (cab[1][0] + cab[2][0]) / 2); g.add(roof);
    const pw = hw * 0.96 * 0.9 - 0.02;
    for (const sx of [-1, 1]) {
      const yTop = cab[1][1] - 0.02;
      g.add(bar([sx * (pw * cab[0][2] - 0.04), belt(cab[0][0]) + 0.02, cab[0][0] - 0.02], [sx * (roofW + 0.02), yTop, cab[1][0] + 0.02], 0.06, 0.06, paint(car.color)));   // A
      g.add(bar([sx * (roofW + 0.02), yTop, cab[2][0]], [sx * (pw * cab[3][2] - 0.02), cab[3][1] - 0.02, cab[3][0]], 0.07, 0.07, paint(car.color)));                             // C
      g.add(bar([sx * (pw * cab[3][2] - 0.02), cab[3][1] - 0.02, cab[3][0]], [sx * (pw * cab[4][2]), belt(cab[4][0]) + 0.02, cab[4][0]], 0.06, 0.06, paint(car.color)));
      const bz = (cab[1][0] + cab[2][0]) / 2 - 0.15; g.add(bar([sx * (pw * 0.995), belt(bz) + 0.02, bz], [sx * (roofW + 0.01), yTop, bz], 0.05, 0.05, dark));                   // B
      // roof rail / drip strip
      g.add(bar([sx * (roofW + 0.03), yTop + 0.01, cab[1][0] + 0.05], [sx * (roofW + 0.03), yTop + 0.01, cab[2][0] - 0.05], 0.03, 0.03, chrome));
      if (lite) continue;
      // belt-line chrome trim, door seams, handles, mirror
      g.add(bar([sx * hw * 0.985, belt(0) + 0.005, cab[0][0] + 0.15], [sx * hw * 0.985, belt(tail + 0.3) + 0.005, tail + 0.3], 0.025, 0.03, chrome));
      const doorZ = cab[0][0] - 0.05; g.add(boxM(0.012, belt(doorZ) - floorAt(doorZ) - 0.1, 0.02, dark, sx * hw * 0.99, (belt(doorZ) + floorAt(doorZ)) / 2, doorZ));
      const doorZ2 = doorZ - (spec.L > 4.6 ? 1.05 : 1.35); g.add(boxM(0.012, belt(doorZ2) - floorAt(doorZ2) - 0.1, 0.02, dark, sx * hw * 0.99, (belt(doorZ2) + floorAt(doorZ2)) / 2, doorZ2));
      if (spec.L > 4.6) { const doorZ3 = doorZ2 - 0.95; g.add(boxM(0.012, belt(doorZ3) - floorAt(doorZ3) - 0.1, 0.02, dark, sx * hw * 0.99, (belt(doorZ3) + floorAt(doorZ3)) / 2, doorZ3)); }
      g.add(boxM(0.03, 0.03, 0.14, chrome, sx * hw * 1.0, belt(doorZ) - 0.14, doorZ - 0.35));
      const mir = boxM(0.09, 0.08, 0.13, paint(car.color), sx * (hw + 0.1), belt(cab[0][0]) + 0.18, cab[0][0] + 0.1); g.add(mir);
      g.add(boxM(0.01, 0.06, 0.1, chrome, sx * (hw + 0.1), belt(cab[0][0]) + 0.18, cab[0][0] + 0.17));
      g.add(bar([sx * hw * 0.92, belt(cab[0][0]) + 0.1, cab[0][0] + 0.06], [sx * (hw + 0.1), belt(cab[0][0]) + 0.18, cab[0][0] + 0.1], 0.02, 0.02, dark));
      // side sill in black
      g.add(boxM(0.04, 0.08, spec.L * 0.62, rubber, sx * hw * 0.96, spec.floor + 0.02, (nose + tail) / 2));
    }
    // wipers
    if (!lite) for (const wx of [-0.25, 0.3]) g.add(bar([wx, belt(cab[0][0]) + 0.05, cab[0][0] - 0.02], [wx + 0.18, belt(cab[0][0]) + 0.32, cab[0][0] - 0.26], 0.015, 0.012, dark));
    // ---- front: grille, headlights, bumper, plate
    const nz = nose + 0.01, noseTop = interp(spec.body, nose, 1), noseBot = floorAt(nose);
    const bumperY = noseBot + 0.18;
    g.add(boxM(W * 0.98, 0.11, 0.1, chrome, 0, bumperY, nose + 0.06)); g.add(boxM(W * 0.98, 0.11, 0.1, chrome, 0, bumperY, tail - 0.06));
    for (const sx of [-1, 1]) { g.add(boxM(0.06, 0.16, 0.12, rubber, sx * W * 0.32, bumperY, nose + 0.08)); g.add(boxM(0.06, 0.16, 0.12, rubber, sx * W * 0.32, bumperY, tail - 0.08)); }
    const lampMat = night ? lampOn : lampOff;
    const gy = (noseTop + bumperY + 0.08) / 2, gh = noseTop - bumperY - 0.14;
    if (spec.grille === 'benz') {
      g.add(boxM(0.6, gh + 0.06, 0.08, chrome, 0, gy, nz)); g.add(boxM(0.52, gh - 0.02, 0.05, grilleMat, 0, gy, nz + 0.03));
      for (let k = 0; k < 6; k++) g.add(boxM(0.5, 0.015, 0.02, chrome, 0, gy - gh / 2 + 0.06 + k * (gh - 0.12) / 5, nz + 0.06));
      const star = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 6, 20), chrome); star.position.set(0, noseTop + 0.06, nz - 0.05); g.add(star);
      for (let k = 0; k < 3; k++) { const sp = boxM(0.012, 0.15, 0.012, chrome, 0, noseTop + 0.06, nz - 0.05); sp.rotation.z = k * Math.PI * 2 / 3 + Math.PI; g.add(sp); }
    } else if (spec.grille === 'wide') {
      g.add(boxM(W * 0.72, gh, 0.05, grilleMat, 0, gy, nz)); for (let k = 0; k < 4; k++) g.add(boxM(W * 0.72, 0.012, 0.02, chrome, 0, gy - gh / 2 + 0.03 + k * (gh - 0.06) / 3, nz + 0.03));
    } else if (spec.grille === 'slim') {
      g.add(boxM(W * 0.5, gh * 0.5, 0.05, grilleMat, 0, gy, nz)); g.add(boxM(W * 0.5, 0.02, 0.03, chrome, 0, gy + gh * 0.25, nz + 0.02)); g.add(boxM(W * 0.5, 0.02, 0.03, chrome, 0, gy - gh * 0.25, nz + 0.02));
    } else { g.add(boxM(W * 0.6, gh * 0.4, 0.05, grilleMat, 0, gy - gh * 0.2, nz)); }
    const lightAt = (x, y, kind) => {
      if (kind === 'round') { const l = cylM(0.11, 0.11, 0.05, lampMat, 18); l.rotation.x = Math.PI / 2; l.position.set(x, y, nz + 0.02); g.add(l); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 6, 20), chrome); ring.position.set(x, y, nz + 0.04); g.add(ring); }
      else if (kind === 'rect') { g.add(boxM(0.34, 0.16, 0.05, lampMat, x, y, nz + 0.02)); g.add(boxM(0.36, 0.18, 0.02, chrome, x, y, nz)); }
      else if (kind === 'vertical') { g.add(boxM(0.2, 0.32, 0.05, lampMat, x, y, nz + 0.02)); g.add(boxM(0.22, 0.34, 0.02, chrome, x, y, nz)); g.add(boxM(0.2, 0.08, 0.06, amber, x, y - 0.2, nz + 0.02)); }
      else if (kind === 'popup') { g.add(boxM(0.3, 0.08, 0.04, lampMat, x, y, nz + 0.01)); g.add(boxM(0.34, 0.03, 0.34, paint(car.color), x, y + 0.055, nz - 0.18)); }
    };
    const ly = noseTop - 0.14;
    for (const sx of [-1, 1]) {
      if (spec.lights === 'round4') { lightAt(sx * (hw - 0.2), ly, 'round'); lightAt(sx * (hw - 0.45), ly, 'round'); }
      else if (spec.lights === 'rect') lightAt(sx * (hw - 0.27), ly, 'rect');
      else if (spec.lights === 'vertical') lightAt(sx * (hw - 0.2), ly - 0.02, 'vertical');
      else lightAt(sx * (hw - 0.3), ly, 'popup');
      // indicators & tail lights
      g.add(boxM(0.14, 0.07, 0.04, amber, sx * (hw - 0.12), bumperY + 0.12, nz));
      const tailTop = interp(spec.body, tail, 1);
      g.add(boxM(spec.lights === 'vertical' ? 0.42 : 0.3, 0.13, 0.05, night ? tailOn : tailOff, sx * (hw - 0.3), tailTop - 0.16, tail - 0.02));
      g.add(boxM(0.12, 0.13, 0.05, amber, sx * (hw - 0.52), tailTop - 0.16, tail - 0.02));
      g.add(boxM(0.1, 0.13, 0.05, lampOff, sx * (hw - 0.09), tailTop - 0.16, tail - 0.02));
    }
    // hood ornament / badge, antenna, exhaust
    g.add(boxM(0.09, 0.09, 0.02, chrome, 0, ly + 0.02, nz + 0.01));
    if (!lite) g.add(bar([-hw * 0.7, belt(cab[0][0] + 0.3), cab[0][0] + 0.3], [-hw * 0.7 - 0.05, belt(cab[0][0] + 0.3) + 0.7, cab[0][0] + 0.15], 0.012, 0.012, chrome));
    const ex = cylM(0.035, 0.035, 0.25, chrome, 10); ex.rotation.x = Math.PI / 2; ex.position.set(hw * 0.6, spec.floor + 0.03, tail - 0.05); g.add(ex);
    if (spec.spoiler) { g.add(boxM(W * 0.86, 0.05, 0.36, spec.lights === 'popup' ? dark : paint(car.color), 0, interp(spec.body, tail, 1) + 0.16, tail + 0.35)); for (const sx of [-1, 1]) g.add(boxM(0.05, 0.16, 0.3, dark, sx * W * 0.36, interp(spec.body, tail, 1) + 0.07, tail + 0.35)); }
    if (car.stripe != null && car.stripe !== 0xffffff) { const st = H.mat ? H.mat(car.stripe) : new THREE.MeshStandardMaterial({ color: car.stripe }); for (const sx of [-1, 1]) g.add(bar([sx * hw * 0.99, belt(tail + 0.3) - 0.2, tail + 0.3], [sx * hw * 0.99, belt(nose - 0.3) - 0.2, nose - 0.3], 0.02, 0.09, st)); }
    // ---- wheels: wells + spinning wheels (front ones steer)
    const wells = []; g.userData.wheels = []; g.userData.steer = [];
    for (const [ai, z] of [[0, spec.ax[0]], [1, spec.ax[1]]]) for (const sx of [-1, 1]) {
      const well = cylM(spec.wr + 0.08, spec.wr + 0.08, 0.3, dark, 20); well.rotation.z = Math.PI / 2; well.position.set(sx * (hw - 0.14), spec.wr + 0.02, z); g.add(well); wells.push(well);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(spec.wr + 0.09, 0.035, 6, 20, Math.PI), paint(car.color)); lip.rotation.y = Math.PI / 2; lip.position.set(sx * hw * 0.99, spec.wr + 0.02, z); g.add(lip);
      const steer = new THREE.Group(); steer.position.set(sx * (hw - 0.12), spec.wr, z); g.add(steer);
      const w = lite ? liteWheel(spec, sx) : wheel(spec, sx); w.userData.wheelGroup = true; steer.userData.wheelGroup = true; steer.add(w); g.userData.wheels.push(w); if (ai === 0) g.userData.steer.push(steer);
    }
    g.userData.wheelR = spec.wr;
    // plates
    if (car.plate && H.textPlane) {
      const pl = H.textPlane(car.plate, '#111', '#f4f4f4', 0.5, 0.11, false, { sizeK: 0.6 }); pl.position.set(0, bumperY + 0.13, tail - 0.04); pl.rotation.y = Math.PI; g.add(pl);
      const pf = H.textPlane(car.plate, '#111', '#f4f4f4', 0.5, 0.11, false, { sizeK: 0.6 }); pf.position.set(0, bumperY - 0.01, nose + 0.12); g.add(pf);
    }
    if (car.shape === 'sport' && H.textPlane) { const bk = H.textPlane('BOXKELLER', '#ff2d95', '#0e0e12', 1.3, 0.28, true); bk.position.set(hw + 0.005, belt(-0.5) - 0.25, -0.5); bk.rotation.y = Math.PI / 2; g.add(bk); }
    if (night) {
      for (const x of [-0.5, 0.5]) { const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 14), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.025, blending: THREE.AdditiveBlending, depthWrite: false })); beam.rotation.x = -Math.PI / 2; beam.position.set(x, 0.05, nose + 7.5); g.add(beam); }
    }
    // soft contact shadow under the car (helps grounding even without shadow maps)
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, spec.L + 0.4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
    g.traverse((o) => { if (o.isMesh && o.material !== glass && o !== sh) o.castShadow = true; });
    g.userData.backZ = tail; g.userData.spin = 0;
    for (const w of g.userData.wheels) compact(w);
    compact(g, (o) => { for (let p = o; p && p !== g; p = p.parent) if (p.userData.wheelGroup) return true; return false; });
    return g;
  };

  /** merge every mesh of a group into one mesh per material (keeps the group's transform tree flat) */
  const _v = new THREE.Vector3(), _nm = new THREE.Matrix3();
  function compact(group, skip) {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const meshes = []; group.traverse((o) => { if (o.isMesh && !(skip && skip(o))) meshes.push(o); });
    const buckets = new Map();
    for (const m of meshes) {
      const geo = m.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
      const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); _nm.getNormalMatrix(mw);
      let b = buckets.get(m.material); if (!b) { b = { pos: [], nor: [], uv: [], idx: [], base: 0 }; buckets.set(m.material, b); }
      for (let i = 0; i < pos.count; i++) { _v.fromBufferAttribute(pos, i).applyMatrix4(mw); b.pos.push(_v.x, _v.y, _v.z); if (nor) { _v.fromBufferAttribute(nor, i).applyMatrix3(_nm).normalize(); b.nor.push(_v.x, _v.y, _v.z); } else b.nor.push(0, 1, 0); if (uv) b.uv.push(uv.getX(i), uv.getY(i)); else b.uv.push(0, 0); }
      const index = geo.index ? geo.index.array : null; const cnt = index ? index.length : pos.count;
      for (let i = 0; i < cnt; i++) b.idx.push(b.base + (index ? index[i] : i));
      b.base += pos.count;
      if (m.parent) m.parent.remove(m);
    }
    for (const [material, b] of buckets) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); geo.setIndex(b.idx);
      const mesh = new THREE.Mesh(geo, material); mesh.castShadow = material !== glass && !(material.transparent && material.opacity < 0.5); group.add(mesh);
    }
    // drop now-empty groups
    const empties = []; group.traverse((o) => { if (o !== group && o.isGroup && !o.children.length && !o.userData.wheelGroup) empties.push(o); }); for (const e of empties) if (e.parent) e.parent.remove(e);
  }

  /** spin the wheels according to the distance driven and turn the front ones with the steering */
  Cars.animate = function (mesh, v, dt, steer) {
    const u = mesh.userData; if (!u.wheels) return;
    u.spin += v * dt / (u.wheelR || 0.32);
    for (const w of u.wheels) w.rotation.x = u.spin;
    for (const s of u.steer) s.rotation.y = -steer * 0.45;
  };

  window.Cars = Cars;
})();
