/* ============================================================
   STUNTS KÖLLE 4D — more real Cologne landmarks (second catalogue).
   Built with the helpers of js/landmarks.js via World.registerLandmark;
   each model is grounded, centred, front towards +z, with its source.
   ============================================================ */

// Kreuzblume: the full-size concrete copy of the Dom's south-tower finial on the Domplatte.
// Square crocketed shaft, a big four-armed leaf cross with up-curled tips, a smaller cross
// turned 45 degrees, and the pointed octagonal bud with its knob: a spire tip at street level.
World.registerLandmark('kreuzblume', 'Kreuzblume', 'https://de.wikipedia.org/wiki/Kreuzblumen_des_K%C3%B6lner_Domes', (g, o, k) => {
  const STONE = 0xa6a092, GRIME = 0x6e695f, PLINTH = 0x5a5a5e, PALE = 0xaba596;
  // A leaf arm: side profile (radial r, height y) extruded to a width, rotated to angle a around the axis.
  function arm(pts, width, a, color, bevel) {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    const b = bevel || 0.12;
    const geo = new THREE.ExtrudeGeometry(s, { depth: width - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
    geo.translate(0, 0, -(width - 2 * b) / 2);
    const m = k.part(g, geo, color, 0, 0, 0); m.rotation.y = a; return m;
  }
  // Plinth with the bronze plaque on the street side.
  k.box(g, 5.6, 0.6, 5.6, PLINTH, 0, 0.3, 0);
  k.box(g, 4.4, 0.25, 4.4, 0x6a6a6e, 0, 0.72, 0);
  k.box(g, 1.1, 0.4, 0.06, 0x8a6a3a, 0, 0.32, 2.83);
  // Tapering square shaft, faces to the four arms, crocket rows on the corners.
  const shaft = new THREE.CylinderGeometry(0.99, 1.27, 3.3, 4, 1); shaft.rotateY(Math.PI / 4);
  k.part(g, shaft, STONE, 0, 0.85 + 1.65, 0);
  // Vertical grooves on each face read as the spire's tracery ribs.
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const rib = k.box(g, 0.24, 2.8, 0.2, GRIME, Math.sin(a) * 0.8, 2.5, Math.cos(a) * 0.8); rib.rotation.y = a;
  }
  // Crockets climbing the four corners of the shaft.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    for (const [y, r] of [[1.55, 1.12], [2.75, 1.02]]) {
      arm([[r - 0.2, y], [r + 0.35, y - 0.05], [r + 0.55, y + 0.35], [r + 0.3, y + 0.55], [r - 0.2, y + 0.45]], 0.5, a - Math.PI / 2, PALE, 0.08);
    }
  }
  // Ring moulding under the leaf cross.
  k.box(g, 2.2, 0.4, 2.2, PALE, 0, 4.0, 0);
  k.cyl(g, 0.95, 1.05, 0.3, GRIME, 0, 4.35, 0, 8);
  // Main leaf cross, 4.6 m tip to tip: each arm droops out and curls its tip upward.
  const main = [[0, 4.3], [0.9, 4.25], [1.6, 4.05], [2.05, 4.0], [2.35, 4.35], [2.45, 5.05], [2.2, 5.2], [1.95, 4.75], [1.6, 4.9], [0.9, 5.35], [0, 5.5]];
  const mainUnder = [[0.3, 4.12], [1.6, 3.92], [2.0, 3.88], [2.0, 4.1], [0.3, 4.35]];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 - Math.PI / 2;
    arm(main, 1.6, a, STONE);
    arm(mainUnder, 1.3, a, GRIME, 0.06);
    // Side lobes of the leaf, curled outward: they give the arm its "cabbage leaf" edge.
    for (const side of [-1, 1]) {
      const lobe = arm([[0.8, 4.4], [1.6, 4.2], [2.0, 4.5], [1.9, 5.0], [1.2, 4.95]], 0.7, a + side * 0.45, PALE, 0.1);
      lobe.name = 'Blattlappen';
    }
  }
  // Core of the flower between the tiers.
  const core = new THREE.CylinderGeometry(0.75, 0.95, 1.2, 8, 1); core.rotateY(Math.PI / 8);
  k.part(g, core, STONE, 0, 5.9, 0);
  // Second, smaller leaf cross turned 45 degrees.
  const upper = [[0, 6.1], [0.8, 6.02], [1.15, 6.0], [1.35, 6.3], [1.35, 6.85], [1.1, 6.9], [0.95, 6.55], [0.6, 6.75], [0, 6.9]];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2 - Math.PI / 2;
    arm(upper, 1.0, a, PALE, 0.1);
    arm([[0.3, 5.95], [1.1, 5.88], [1.1, 6.05], [0.3, 6.15]], 0.8, a, GRIME, 0.05);
  }
  // Neck, then the pointed octagonal bud with small crockets and the knob at 9.9 m.
  k.cyl(g, 0.55, 0.6, 0.6, STONE, 0, 7.2, 0, 8);
  k.cyl(g, 0.9, 0.9, 0.25, GRIME, 0, 7.55, 0, 8);
  const bud = k.cone(g, 1.1, 2.6, STONE, 0, 7.6 + 1.3, 0, 8); bud.rotation.y = Math.PI / 8;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 - Math.PI / 2 + Math.PI / 4;
    arm([[0.55, 8.0], [1.05, 7.95], [1.15, 8.3], [0.8, 8.45], [0.4, 8.4]], 0.4, a, PALE, 0.06);
    arm([[0.25, 8.9], [0.6, 8.85], [0.7, 9.15], [0.45, 9.3], [0.2, 9.25]], 0.3, a + Math.PI / 4, PALE, 0.05);
  }
  const knob = k.part(g, new THREE.SphereGeometry(0.35, 8, 6), PALE, 0, 9.95, 0);
  knob.scale.y = 0.9;
});

// Stapelhaus, Frankenwerft 35: the long trachyte block of the 1960s rebuild with its steep
// Cologne hipped slate roof and dormer rows, and the surviving octagonal stair tower at the
// south end that rises above the roof with a flat, parapeted top. Rhine front faces +z.
World.registerLandmark('stapelhaus', 'Stapelhaus', 'https://de.wikipedia.org/wiki/Stapelhaus', (g, o, k) => {
  const WALL = 0xa39e90, TOWER = 0x8d8778, ROOF = 0x3d4249, FRAME = 0xf0eee8, GLASS = 0x2a3038, SILL = 0xc2bdb0;
  const L = 40, D = 14, EAVE = 11;
  // Many small repeated parts share one mesh per colour (keeps the mesh count low).
  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    const m = new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z);
    geo.applyMatrix4(m);
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o3 = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, o3); nor.set(geo.attributes.normal.array, o3); o3 += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  // Octagonal pieces of the stair tower, flat-shaded so the eight faces read as stone faces.
  function oct(rt, rb, h, color, x, y, z) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, 8, 1).toNonIndexed(); geo.rotateY(Math.PI / 8); geo.computeVertexNormals();
    return k.part(g, geo, color, x, y, z);
  }
  const bx = (w, h, d, color, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), color, x, y, z, ry);
  // Hipped roof: rectangle w x d at the eaves, ridge of length w - d at height h.
  function hip(w, d, h, color, y) {
    const a = w / 2, b = d / 2, r = Math.max(0, a - b * 0.9);
    const p = (x, yy, z) => [x, y + yy, z];
    const c = [p(-a, 0, b), p(a, 0, b), p(a, 0, -b), p(-a, 0, -b)], R1 = p(-r, h, 0), R2 = p(r, h, 0);
    const tris = [[c[0], c[1], R2], [c[0], R2, R1], [c[2], c[3], R1], [c[2], R1, R2], [c[1], c[2], R2], [c[3], c[0], R1]];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(2), 3));
    geo.computeVertexNormals(); return k.part(g, geo, color, 0, 0, 0);
  }
  // Main body, plinth course, string course and eaves cornice.
  k.box(g, L, EAVE, D, WALL, 0, EAVE / 2, 0);
  k.box(g, L + 0.3, 0.8, D + 0.3, 0x7c776b, 0, 0.4, 0);
  k.box(g, L + 0.4, 0.35, D + 0.4, SILL, 0, 4.1, 0);
  k.box(g, L + 0.9, 0.5, D + 0.9, SILL, 0, EAVE - 0.1, 0);
  hip(L + 1.2, D + 1.2, 7, ROOF, EAVE + 0.15);
  // Window rows on both long sides and the two ends.
  const cols = []; for (let x = -17.2; x <= 17.3; x += 2.65) cols.push(x);
  for (const side of [1, -1]) {
    const zf = side * (D / 2), ry = side > 0 ? 0 : Math.PI;
    for (const x of cols) {
      if (side > 0 && x < -14) continue; // the stair tower covers the south end of the Rhine front
      for (const y of [6.0, 9.0]) {
        bx(1.5, 1.9, 0.12, FRAME, x, y, zf + side * 0.06, ry);
        bx(1.2, 1.6, 0.12, GLASS, x, y, zf + side * 0.12, ry);
        bx(0.12, 1.6, 0.12, FRAME, x, y, zf + side * 0.16, ry);
      }
    }
    // Ground floor: larger openings of the restaurants and shops.
    for (let i = 0; i < 7; i++) {
      const x = -15 + i * 5.2; if (side > 0 && x < -13) continue;
      bx(3.4, 3.0, 0.12, GLASS, x + 0.8, 2.3, zf + side * 0.08, ry);
      bx(3.7, 0.25, 0.14, FRAME, x + 0.8, 3.9, zf + side * 0.1, ry);
      bx(0.14, 3.0, 0.14, FRAME, x + 0.8, 2.3, zf + side * 0.14, ry);
    }
  }
  for (const side of [1, -1]) {
    const xf = side * (L / 2), ry = side * Math.PI / 2;
    for (const z of [-3.6, 0, 3.6]) for (const y of [6.0, 9.0]) {
      bx(1.5, 1.9, 0.12, FRAME, xf + side * 0.06, y, z, ry); bx(1.2, 1.6, 0.12, GLASS, xf + side * 0.12, y, z, ry);
    }
    bx(3.4, 3.0, 0.12, GLASS, xf + side * 0.08, 2.3, 0, ry);
  }
  // Five small slate dormers per long side, sitting on the 45-degree roof slope.
  for (const side of [1, -1]) for (let i = 0; i < 5; i++) {
    const x = -12 + i * 6.2, z = side * 5.1, ry = side > 0 ? 0 : Math.PI;
    bx(1.8, 2.4, 2.2, ROOF, x, EAVE + 2.25, z, ry);
    bx(1.1, 1.2, 0.12, FRAME, x, EAVE + 2.45, z + side * 1.08, ry);
    bx(0.85, 0.95, 0.12, GLASS, x, EAVE + 2.45, z + side * 1.13, ry);
    const s = new THREE.Shape(); s.moveTo(-1.15, 0); s.lineTo(1.15, 0); s.lineTo(0, 1.1); s.closePath();
    const rg = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: false }); rg.translate(0, 0, -1.2);
    add(rg, ROOF, x, EAVE + 3.45, z, ry);
  }
  // Chimneys on the ridge, as on the Altstadt roofs.
  for (const x of [-8, 9]) bx(1.0, 2.2, 1.0, 0x6d6a64, x, EAVE + 7.6, 0);
  // Octagonal stair tower in darker trachyte, attached to the Rhine front at the south end.
  const tx = -L / 2 + 3.4, tz = D / 2 + 1.2, TH = 24, TR = 2.95;
  oct(TR, TR + 0.1, TH, TOWER, tx, TH / 2, tz);
  oct(TR + 0.35, TR + 0.45, 1.2, 0x6f6a5f, tx, 0.6, tz);
  for (const y of [4.1, 11.0, 17.5]) oct(TR + 0.18, TR + 0.18, 0.35, SILL, tx, y, tz);
  // Narrow lancet windows staggered up the faces like the stair inside.
  const faces = [0, 1, 7, 2, 6];
  for (let i = 0; i < faces.length; i++) {
    const a = faces[i] * Math.PI / 4, rr = TR * Math.cos(Math.PI / 8) + 0.05;
    for (const y of [6.0, 13.0, 19.2]) {
      const yy = y + (i % 2) * 1.2;
      k.pointed(g, 0.7, 2.2, tx + Math.sin(a) * rr, yy, tz + Math.cos(a) * rr, 0x22282e, a);
    }
  }
  k.arch(g, 1.6, 2.8, tx, 0.8, tz + TR * Math.cos(Math.PI / 8) + 0.06, 0x3a3228);
  // Flat top: projecting cornice on corbels and a 1 m stone parapet around the viewing platform.
  oct(TR + 0.55, TR + 0.2, 0.6, SILL, tx, TH + 0.3, tz);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8, rr = TR - 0.05;
    bx(0.35, 0.8, 0.5, 0x7c776b, tx + Math.sin(a) * rr, TH - 0.35, tz + Math.cos(a) * rr, a);
  }
  // Parapet wall with a neo-Gothic battlement crown: two merlons on each of the eight faces.
  oct(TR + 0.45, TR + 0.45, 0.7, TOWER, tx, TH + 0.95, tz);
  oct(TR + 0.55, TR + 0.55, 0.15, SILL, tx, TH + 1.35, tz);
  const ap = (TR + 0.45) * Math.cos(Math.PI / 8), side = 2 * (TR + 0.45) * Math.sin(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    for (const s of [-1, 1]) {
      const off = s * side * 0.25;
      bx(side * 0.32, 0.8, 0.4, TOWER, tx + Math.sin(a) * (ap - 0.15) + Math.cos(a) * off, TH + 1.82, tz + Math.cos(a) * (ap - 0.15) - Math.sin(a) * off, a);
      bx(side * 0.36, 0.12, 0.48, SILL, tx + Math.sin(a) * (ap - 0.15) + Math.cos(a) * off, TH + 2.28, tz + Math.cos(a) * (ap - 0.15) - Math.sin(a) * off, a);
    }
  }
  // The platform floor inside the battlements, seen from above.
  oct(TR - 0.1, TR - 0.1, 0.1, 0x5d5950, tx, TH + 1.47, tz);
  flush();
});

// Kölner Pegel: the round 1951 gauge house on the Frankenwerft promenade near the Deutzer
// Brücke. A squat stone drum on a basalt plinth with a thin overhanging flat roof, and the big
// Pegeluhr dial in a drum-shaped case: small hand metres, big hand decimetres (here 3.5 m).
World.registerLandmark('pegel', 'Kölner Pegel', 'https://de.wikipedia.org/wiki/Pegel_K%C3%B6ln', (g, o, k) => {
  const BASALT = 0x4a4a4e, SLAB = 0xb4b0a6, JOINT = 0x8f8b82, ROOFC = 0x6a6a70, INK = 0x1a1a1a;
  const R = 2.0, BASE = 1.0, TOP = 8.6, DY = 6.9, DR = 1.1, LEVEL = 3.5, SEG = 24;
  // Plinth ring, the stone drum with thin joint rings, a cornice and the overhanging roof disc.
  k.cyl(g, R + 0.3, R + 0.4, BASE, BASALT, 0, BASE / 2, 0, SEG);
  k.cyl(g, R, R, TOP - BASE, SLAB, 0, (BASE + TOP) / 2, 0, SEG);
  for (const y of [2.5, 4.0, 5.5]) k.cyl(g, R + 0.03, R + 0.03, 0.07, JOINT, 0, y, 0, SEG);
  k.cyl(g, R + 0.18, R + 0.12, 0.3, 0x9a968d, 0, TOP - 0.15, 0, SEG);
  k.cyl(g, R + 0.55, R + 0.55, 0.28, ROOFC, 0, TOP + 0.14, 0, SEG);
  // Dial face drawn once on a canvas: white, black rim, ten divisions with numerals 0-9.
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(128, 128, 128, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2f0ea'; c.beginPath(); c.arc(128, 128, 114, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#1a1a1a'; c.fillStyle = '#1a1a1a';
  for (let i = 0; i < 50; i++) {
    const a = i / 50 * Math.PI * 2, big = i % 5 === 0, r0 = big ? 90 : 100;
    c.lineWidth = big ? 7 : 3; c.beginPath();
    c.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); c.lineTo(128 + Math.sin(a) * 110, 128 - Math.cos(a) * 110); c.stroke();
  }
  c.font = 'bold 36px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.fillText(String(i), 128 + Math.sin(a) * 68, 128 - Math.cos(a) * 68); }
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  const faceMat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x6a675f, emissiveMap: tex });
  // One dial each on the promenade (+z) and river (-z) sides. The black case is a short drum
  // whose back sinks into the round wall, so the dial never floats off the curve.
  for (const side of [1, -1]) {
    const ry = side > 0 ? 0 : Math.PI, zf = side * R;
    const bezel = k.cyl(g, DR + 0.15, DR + 0.15, 0.7, INK, 0, DY, side * (R - 0.25), 24); bezel.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(DR, 24), faceMat);
    face.position.set(0, DY, zf + side * 0.14); face.rotation.y = ry; g.add(face);
    // Hands: angle measured clockwise from the top as seen by the viewer on that side.
    const hand = (len, thick, value, dz) => {
      const a = value / 10 * Math.PI * 2;
      const h = k.box(g, thick, len, 0.06, INK, 0, 0, 0);
      h.geometry.translate(0, len / 2 - 0.12, 0);
      h.position.set(0, DY, zf + side * dz);
      h.rotation.set(0, ry, -a);
      return h;
    };
    hand(0.66, 0.24, LEVEL, 0.2);              // metres
    hand(1.0, 0.1, (LEVEL * 10) % 10, 0.26);   // decimetres
    const hub = k.cyl(g, 0.12, 0.12, 0.12, INK, 0, DY, zf + side * 0.3, 8); hub.rotation.x = Math.PI / 2;
    // Blue enamel plate under the dial, set just proud of the curved wall.
    const plate = k.sign(g, 'PEGEL KÖLN', 2.2, 0, 5.05, side * (R + 0.08), '#1c3f95');
    plate.rotation.y = ry;
    const back = k.box(g, 2.3, 1.2, 0.5, 0x14306f, 0, 5.05, side * (R - 0.2)); back.rotation.y = ry;
  }
  // Staff gauge strip on the downstream (+x) side: black-and-white bars up the wall.
  for (let i = 0; i < 20; i++) k.box(g, 0.12, 0.3, 0.4, i % 2 ? INK : 0xf2f0ea, R + 0.02, 1.3 + i * 0.3, 0);
  // Dark green steel door on the promenade side, lintel, slot window, and steps up to it.
  const dx = -0.9, dz = Math.sqrt(R * R - dx * dx), da = Math.atan2(dx, dz);
  const door = k.box(g, 0.95, 2.1, 0.3, 0x2e4a3a, dx, BASE + 1.05, dz - 0.08); door.rotation.y = da;
  const lint = k.box(g, 1.15, 0.14, 0.34, 0x9a968d, dx, BASE + 2.17, dz - 0.07); lint.rotation.y = da;
  const slot = k.box(g, 0.32, 1.0, 0.3, 0x22282e, dx, 3.7, dz - 0.08); slot.rotation.y = da;
  const step = k.box(g, 1.4, 0.35, 0.8, BASALT, dx * 1.25, 0.18, dz * 1.25 + 0.05); step.rotation.y = da;
});

// Römerturm, Zeughausstraße / St.-Apern-Straße: the north-west corner tower of the Roman
// city wall (1st century AD), squat and round, famous for its inlaid stone mosaic bands
// (discs, triangles, lozenges, little temple gables) and the crenellated crown added c. 1900.
World.registerLandmark('roemerturm', 'Römerturm', 'https://de.wikipedia.org/wiki/R%C3%B6merturm_(K%C3%B6ln)', (g, o, k) => {
  const wall = 0x9c6450, trachyte = 0x8a8780, grey = 0x7d7a72, white = 0xe9e3d2, iron = 0x24272a;
  const R = 6.3, H = 11, SEG = 24;
  // Merge many small ornament pieces into one mesh per colour (keeps the mesh count low).
  function merged(list, color) {
    const pos = [], nor = [];
    for (const geo of list) {
      const gg = geo.index ? geo.toNonIndexed() : geo; gg.computeVertexNormals();
      pos.push(...gg.attributes.position.array); nor.push(...gg.attributes.normal.array);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return k.part(g, out, color, 0, 0, 0);
  }
  // place a flat piece (built facing +z at the origin) on the drum at angle a and height y
  function onDrum(geo, a, y, r) {
    geo.translate(0, 0, r || R + 0.03); geo.rotateY(a); geo.translate(0, y, 0); return geo;
  }
  const discs = [], tris = [], lozenges = [], gables = [];
  function disc(a, y, d) { const c = new THREE.CylinderGeometry(d / 2, d / 2, 0.1, 8); c.rotateX(Math.PI / 2); discs.push(onDrum(c, a, y)); }
  function tri(a, y, w, h, down) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, down ? h / 2 : -h / 2); s.lineTo(w / 2, down ? h / 2 : -h / 2); s.lineTo(0, down ? -h / 2 : h / 2); s.closePath();
    tris.push(onDrum(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }), a, y));
  }
  function lozenge(a, y, s) { const b = new THREE.BoxGeometry(s, s, 0.08); b.rotateZ(Math.PI / 4); lozenges.push(onDrum(b, a, y)); }

  // ground: cobbled corner patch, grey trachyte plinth, the drum
  k.box(g, 26.5, 0.2, 19, 0x9a958a, -3.75, 0.1, 0);
  k.cyl(g, R + 0.8, R + 1, 0.8, grey, 0, 0.6, 0, SEG);
  k.cyl(g, R, R, H, wall, 0, 1 + H / 2, 0, SEG);
  // three ornament bands (light trachyte strips carrying alternating white discs and grey triangles)
  const bands = [2.6, 5.9, 9.2], n = 28;
  for (const y of bands) {
    k.cyl(g, R + 0.02, R + 0.02, 1.2, 0xa8876c, 0, y, 0, SEG);
    k.cyl(g, R + 0.05, R + 0.05, 0.12, white, 0, y + 0.66, 0, SEG);
    k.cyl(g, R + 0.05, R + 0.05, 0.12, white, 0, y - 0.66, 0, SEG);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (i % 2) disc(a, y, 0.8);
      else tri(a, y, 0.9, 0.85, (i / 2) % 2 === 1);
    }
  }
  // rows of small white lozenges between the bands
  for (const y of [4.25, 7.55]) for (let i = 0; i < 20; i++) {
    const a = (i + 0.5) / 20 * Math.PI * 2, d = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    if (!(y < 5 && d < 0.55)) lozenge(a, y, 0.5);
  }
  // grey chevron row at the foot
  for (let i = 0; i < 24; i++) tri((i / 24) * Math.PI * 2, 1.45, 1.2, 0.6, true);
  // two small white "temple front" gables facing the road
  for (const a of [-0.32, 0.32]) {
    const s = new THREE.Shape();
    s.moveTo(-0.75, 0); s.lineTo(0.75, 0); s.lineTo(0.75, 1.1); s.lineTo(0.95, 1.1); s.lineTo(0, 1.8); s.lineTo(-0.95, 1.1); s.lineTo(-0.75, 1.1); s.closePath();
    const h = new THREE.Path(); h.moveTo(-0.4, 0.15); h.lineTo(-0.4, 0.9); h.lineTo(0.4, 0.9); h.lineTo(0.4, 0.15); h.closePath(); s.holes.push(h);
    gables.push(onDrum(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), a, 3.35));
  }
  merged(discs, white); merged(tris, trachyte); merged(lozenges, white); merged(gables, white);

  // crenellated crown of c. 1900: parapet ring and 12 merlons, open flat top
  const top = 1 + H;
  k.cyl(g, R + 0.25, R, 0.4, trachyte, 0, top + 0.2, 0, SEG);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.25, R + 0.25, 1.3, SEG, 1, true), k.mat(trachyte));
  ring.position.set(0, top + 1.05, 0); g.add(ring);
  const inner = k.cyl(g, R - 0.6, R - 0.6, 1.3, 0x6c6962, 0, top + 1.05, 0, SEG);
  inner.material = new THREE.MeshLambertMaterial({ color: 0x6c6962, side: THREE.BackSide });
  k.cyl(g, R - 0.55, R - 0.55, 0.2, 0x5d5a55, 0, top + 0.5, 0, SEG); // flat stone top inside
  const ringTop = new THREE.RingGeometry(R - 0.6, R + 0.25, SEG); ringTop.rotateX(-Math.PI / 2);
  k.part(g, ringTop, grey, 0, top + 1.71, 0);
  const merlons = [];
  for (let i = 0; i < 12; i++) {
    const a = (i + 0.5) / 12 * Math.PI * 2, b = new THREE.BoxGeometry(1.4, 1.3, 0.85);
    b.translate(0, 0, R - 0.18); b.rotateY(a); b.translate(0, top + 2.35, 0); merlons.push(b);
  }
  merged(merlons, trachyte);

  // The neo-Gothic house of 1898/99 (Carl Moritz) built onto the tower's west side, later the
  // Dombauverwaltung and today a gallery: pale sandstone, stepped street gable, pointed windows.
  const HX = -10.5, HW = 12, HZ = -2, HD = 11, HH = 9.6, hs = 0xcabda2, hf = HZ + HD / 2; // hf = street face
  k.box(g, HW, HH, HD, hs, HX, HH / 2, HZ);
  k.box(g, HW + 0.3, 1.1, HD + 0.3, grey, HX, 0.55, HZ);
  for (const y of [3.75, 6.75]) k.box(g, HW + 0.3, 0.3, HD + 0.3, trachyte, HX, y, HZ);
  k.roof(g, HW + 0.6, 5.2, HD + 0.4, 0x4b515b, HX, HH, HZ - 0.2);
  const steps = [];
  for (let i = 0; i < 5; i++) {
    const w = HW - i * 2.5, b = new THREE.BoxGeometry(w, 1.2, 0.8); b.translate(HX, HH + 0.6 + i * 1.2, hf - 0.3); steps.push(b);
    if (i < 4) for (const s of [-1, 1]) { const c = new THREE.BoxGeometry(0.9, 0.35, 0.9); c.translate(HX + s * (w / 2 - 0.45), HH + 1.37 + i * 1.2, hf - 0.3); steps.push(c); }
  }
  const fin = new THREE.ConeGeometry(0.45, 1.6, 4); fin.translate(HX, HH + 6.8, hf - 0.3); steps.push(fin);
  merged(steps, hs);
  const frames = [], holes = [];
  const pw = (list, w, h, x, y, z, ry) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h * 0.68); s.lineTo(0, h); s.lineTo(-w / 2, h * 0.68); s.closePath();
    const geo = new THREE.ShapeGeometry(s); geo.rotateY(ry || 0); geo.translate(x, y, z); list.push(geo);
  };
  for (const [x, y, w, h] of [[-3.3, 1.3, 1.5, 2.2], [3.3, 1.3, 1.5, 2.2], [0, 1.1, 1.9, 2.5], [-3.3, 4.2, 1.5, 2.2], [0, 4.2, 1.5, 2.2], [3.3, 4.2, 1.5, 2.2],
    [-3.3, 7.1, 1.4, 2.0], [0, 7.1, 1.4, 2.0], [3.3, 7.1, 1.4, 2.0], [0, 10.6, 1.1, 1.9]]) {
    pw(frames, w + 0.6, h + 0.5, HX + x, y - 0.25, hf + 0.14); pw(holes, w, h, HX + x, y, hf + 0.2);
  }
  for (const z of [-5.5, -1.5, 2.5]) for (const y of [1.3, 4.2, 7.1]) { pw(frames, 2.0, 2.6, HX - HW / 2 - 0.04, y - 0.25, HZ + z + 1.5, -Math.PI / 2); pw(holes, 1.4, 2.1, HX - HW / 2 - 0.1, y, HZ + z + 1.5, -Math.PI / 2); }
  merged(frames, trachyte); merged(holes, 0x2c3440);

  // black iron railing round the free sides of the corner patch (one mesh), plaque post, two ground lamps
  const rail = [], L = 8.8;
  for (const [x0, z0, x1, z1] of [[-3.8, -L, L, -L], [L, -L, L, L], [L, L, HX - HW / 2, L]]) {
    const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.round(len / 1.1);
    for (let i = 0; i < steps; i++) {
      const t = i / steps, b = new THREE.BoxGeometry(0.08, 1.1, 0.08); b.translate(x0 + (x1 - x0) * t, 0.75, z0 + (z1 - z0) * t); rail.push(b);
    }
    for (const y of [1.25, 0.45]) {
      const b = new THREE.BoxGeometry(Math.abs(x1 - x0) + 0.1, 0.08, Math.abs(z1 - z0) + 0.1); b.translate((x0 + x1) / 2, y, (z0 + z1) / 2); rail.push(b);
    }
  }
  merged(rail, iron);
  k.box(g, 0.14, 1.4, 0.14, iron, 3.6, 0.9, 8.1); k.box(g, 1.1, 0.75, 0.1, 0x3e5a52, 3.6, 1.85, 8.2);
  const glow = new THREE.MeshLambertMaterial({ color: 0xfff1c0, emissive: 0xffd98a });
  for (const x of [-2.6, 2.6]) { k.box(g, 0.7, 0.35, 0.5, 0x333333, x, 0.37, 7.6); k.box(g, 0.5, 0.12, 0.08, 0xfff1c0, x, 0.42, 7.87).material = glow; }
});

// Gereonsmühle, Gereonswall / Hansaring: a round tower of the medieval city wall that was
// turned into a windmill (documented 1446). Dark basalt drum, tiny staggered windows, a tall
// pointed slate cap and no sails, flanked by a surviving crenellated stretch of the Stadtmauer.
World.registerLandmark('gereonsmuehle', 'Gereonsmühle', 'https://de.wikipedia.org/wiki/Gereonsm%C3%BChle', (g, o, k) => {
  const basalt = 0x3b3b40, basalt2 = 0x47474d, trachyte = 0x9a948a, tuff = 0xb8ad96, slate = 0x3f4650, lawn = 0x5f7a3e;
  const R = 6.3, H = 24, SEG = 20, WZ = -2.6; // tower centre at z=0, wall line behind it
  function merged(list, color) {
    const pos = [], nor = [];
    for (const geo of list) {
      const gg = geo.index ? geo.toNonIndexed() : geo; gg.computeVertexNormals();
      pos.push(...gg.attributes.position.array); nor.push(...gg.attributes.normal.array);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return k.part(g, out, color, 0, 0, 0);
  }
  function boxAt(list, w, h, d, x, y, z, ry) {
    const b = new THREE.BoxGeometry(w, h, d); if (ry) b.rotateY(ry); b.translate(x, y, z); list.push(b);
  }

  // old moat: a strip of rough lawn in front
  k.box(g, 52, 0.15, 5, lawn, 0, 0.075, 8.8);

  // the mill tower: trachyte foot band, basalt drum with slightly lighter courses, slate cone
  k.cyl(g, R + 0.35, R + 0.45, 1.7, trachyte, 0, 0.85, 0, SEG);
  k.cyl(g, R, R + 0.2, H - 1.7, basalt, 0, 1.7 + (H - 1.7) / 2, 0, SEG);
  const courses = [];
  for (const y of [6.3, 11.1, 15.9, 20.7]) {
    const c = new THREE.CylinderGeometry(R + 0.08, R + 0.1, 0.35, SEG); c.translate(0, y, 0); courses.push(c);
  }
  merged(courses, basalt2);
  k.cyl(g, R + 0.55, R + 0.3, 0.6, trachyte, 0, H + 0.3, 0, SEG); // eaves ring
  // the pointed cap ("Spitzhaube"): slightly bell-cast at the eaves, then a steep point
  const capPts = [[R + 0.95, 0], [R + 0.35, 0.7], [R - 0.3, 1.9], [R * 0.72, 4.2], [R * 0.42, 7.2], [0.14, 10.2]].map(([x, y]) => new THREE.Vector2(x, y));
  k.part(g, new THREE.LatheGeometry(capPts, SEG), slate, 0, H + 0.6, 0);
  k.cyl(g, 0.1, 0.1, 2.2, 0x2a2d31, 0, H + 11.4, 0, 6);
  k.part(g, new THREE.SphereGeometry(0.35, 8, 6), 0xb09a60, 0, H + 12.5, 0);

  // small dark windows, two per storey, staggered round the drum; one arched door at the foot
  const wins = [], rAt = (y) => R + 0.2 * (H - y) / (H - 1.7) + 0.04;
  for (let s = 0; s < 5; s++) for (let j = 0; j < 2; j++) {
    const a = (j === 0 ? -0.55 : 0.75) + (s % 2) * 0.55 + (j ? Math.PI * 0.55 : 0);
    const y = 3.2 + s * 4.3;
    boxAt(wins, 0.9, 1.3, 0.3, Math.sin(a) * rAt(y), y, Math.cos(a) * rAt(y), a);
  }
  // front windows so the street side reads as a lived-in tower
  for (const [a, y] of [[0.2, 9.2], [-0.25, 17.8], [0.1, 22.1]]) boxAt(wins, 0.9, 1.3, 0.3, Math.sin(a) * rAt(y), y, Math.cos(a) * rAt(y), a);
  merged(wins, 0x1b1e22);
  // arched door in a trachyte surround set into the foot of the drum
  k.box(g, 2.9, 4.1, 1.2, trachyte, 0, 2.05, R);
  k.arch(g, 1.8, 3.3, 0, 0, R + 0.62, 0x2a2420);

  // the two-storey arcade base ("Mühlgang") on the town side, three round arches
  // wraps the tower's inner half in a two-storey half-ring on eight piers, under a lean-to slate skirt
  const MR = R + 3.6, MH = 8.4, MS = 9;
  k.part(g, new THREE.CylinderGeometry(MR, MR, MH, MS, 1, false, Math.PI / 2, Math.PI), basalt, 0, MH / 2, WZ);
  k.part(g, new THREE.CylinderGeometry(MR + 0.25, MR + 0.25, 0.45, MS, 1, false, Math.PI / 2, Math.PI), trachyte, 0, 3.5, WZ);
  k.part(g, new THREE.CylinderGeometry(R + 0.1, MR + 0.5, 2.6, MS * 2, 1, true, Math.PI / 2, Math.PI), slate, 0, MH + 1.3, WZ);
  const arcs = [], upper = [], ap = MR * Math.cos(Math.PI / (2 * MS)) + 0.04;
  for (let i = 1; i < MS - 1; i++) {
    const a = Math.PI / 2 + (i + 0.5) * Math.PI / MS;
    const s2 = new THREE.Shape(), w = 2.2, h = 3.1; s2.moveTo(-w / 2, 0); s2.lineTo(w / 2, 0); s2.lineTo(w / 2, h - w / 2); s2.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s2.closePath();
    const ag = new THREE.ShapeGeometry(s2, 5); ag.translate(0, 0.1, ap); ag.rotateY(a); ag.translate(0, 0, WZ); arcs.push(ag);
    boxAt(upper, 0.8, 1.2, 0.3, Math.sin(a) * (ap - 0.1), 5.9, WZ + Math.cos(a) * (ap - 0.1), a);
  }
  merged(arcs, 0x1b1e22); merged(upper, 0x1b1e22);

  // city wall stubs either side: basalt with tuff crenellated parapet, walkway, arrow slits
  const merl = [], slits = [];
  for (const side of [-1, 1]) {
    const x0 = side * (R + 9.5), WL = 23; // inner end buried in the drum
    k.box(g, WL, 10.5, 3.4, basalt, x0, 5.25, WZ);
    k.box(g, WL, 1.3, 1.1, trachyte, x0, 0.65, WZ + 1.9); // battered foot
    k.box(g, WL, 1.0, 0.8, tuff, x0, 11, WZ + 1.3);        // parapet
    for (let i = 0; i < 9; i++) boxAt(merl, 1.6, 1.6, 0.8, side * (R + 1.2 + i * 2.35), 12.3, WZ + 1.3);
    for (const dx of [4, 10, 16]) boxAt(slits, 0.22, 1.7, 0.1, side * (R + dx), 6.2, WZ + 1.71);
    k.box(g, WL, 0.3, 2.6, 0x5a5650, x0, 10.65, WZ - 0.4); // wall walk
  }
  merged(merl, tuff); merged(slits, 0x141518);
});

// "Dropped Cone" at Neumarkt: the giant upside-down waffle cone (2001) that seems to have
// fallen onto the corner of the shopping centre roof at Richmodstraße, point to the sky,
// its vanilla scoop splashed over the edge and dripping down the facade.
(function () {
  let waffleTex = null;
  function waffle() {
    if (waffleTex) return waffleTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#c8955a'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#8f6034'; x.lineWidth = 5;
    for (let i = -128; i <= 256; i += 32) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke();
      x.beginPath(); x.moveTo(i, 128); x.lineTo(i + 128, 0); x.stroke();
    }
    waffleTex = new THREE.CanvasTexture(c);
    waffleTex.wrapS = waffleTex.wrapT = THREE.RepeatWrapping; waffleTex.repeat.set(6, 3);
    waffleTex.magFilter = THREE.NearestFilter;
    return waffleTex;
  }

  World.registerLandmark('eistuete', 'Eistüte am Neumarkt', 'https://de.wikipedia.org/wiki/Dropped_Cone', (g, o, k) => {
    const stone = 0xcfd0cc, glass = 0x7fa0b8, frame = 0x8e9194, cream = 0xf4e3d8, W = 26, D = 22, H = 18;
    // the 4-storey commercial block: pale stone, horizontal glass bands, flat roof, parapet
    k.box(g, W, H, D, stone, 0, H / 2, 0);
    for (const sz of [-1, 1]) k.box(g, W + 0.6, 0.8, 0.6, 0xbfc0bc, 0, H + 0.4, sz * D / 2);
    for (const sx of [-1, 1]) k.box(g, 0.6, 0.8, D + 0.6, 0xbfc0bc, sx * W / 2, H + 0.4, 0);
    k.box(g, W - 0.4, 0.1, D - 0.4, 0x8d8f8c, 0, H + 0.05, 0);
    k.box(g, 5, 2.4, 4, 0xa9aba7, -6, H + 1.2, -4); // roof plant room
    for (let s = 0; s < 4; s++) {
      const y = s === 0 ? 2.2 : 3.2 + s * 4.1, h = s === 0 ? 3.4 : 1.8;
      k.box(g, W + 0.12, h, D + 0.12, s === 0 ? 0x5e7686 : glass, 0, y, 0);
      if (s) k.box(g, W + 0.3, 0.25, D + 0.3, frame, 0, y + h / 2 + 0.1, 0);
    }
    // vertical mullions on the two street faces (front +z, side +x)
    for (let i = -5; i <= 5; i++) k.box(g, 0.35, H - 4.4, 0.35, stone, i * 2.4, 4.2 + (H - 4.4) / 2, D / 2 + 0.1);
    for (let i = -4; i <= 4; i++) k.box(g, 0.35, H - 4.4, 0.35, stone, W / 2 + 0.1, 4.2 + (H - 4.4) / 2, i * 2.4);
    // shop entrance canopy on the corner
    k.box(g, 8, 0.4, 2.2, 0x4a5156, 6, 4.2, D / 2 + 1.1);

    // the cone: point up, tilted out over the front-right roof corner, open end sunk into the edge
    const cx = W / 2 - 3.2, cz = D / 2 - 3.2, cy = H + 0.2;
    const coneH = 14, coneR = 3.5;
    const coneGeo = new THREE.ConeGeometry(coneR, coneH, 20, 1, true);
    coneGeo.translate(0, coneH / 2 - 1.2, 0);
    const coneMat = new THREE.MeshLambertMaterial({ map: waffle(), side: THREE.DoubleSide, emissive: 0x4a3420 }); // spotlit: still reads at night
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(cx, cy, cz); cone.rotation.set(0.26, 0, -0.24); g.add(cone);
    // rolled rim at the open end
    const rim = new THREE.Mesh(new THREE.TorusGeometry(coneR - 0.05, 0.25, 6, 20), k.mat(0xa8763f));
    rim.rotation.x = Math.PI / 2; rim.position.set(0, -1.1, 0); cone.add(rim);

    // the splashed vanilla scoop over the corner, plus lumps and drips down both facades
    const iceMat = new THREE.MeshLambertMaterial({ color: cream, emissive: 0x2e2a26 }); // lit with the cone at night
    const ice = (m) => { m.material = iceMat; return m; };
    const scoop = ice(k.part(g, new THREE.SphereGeometry(4.2, 16, 8), cream, cx + 0.4, cy - 0.2, cz + 0.4));
    scoop.scale.set(1.15, 0.45, 1.15);
    for (const [x, z, r] of [[W / 2 - 0.2, D / 2 - 5.5, 1.6], [W / 2 - 5.5, D / 2 - 0.2, 1.7], [W / 2 - 0.6, D / 2 - 0.6, 1.8]]) {
      const lump = ice(k.part(g, new THREE.SphereGeometry(r, 10, 6), cream, x, cy - 0.1, z)); lump.scale.y = 0.6;
    }
    // drips run flat down the facade between the mullions (front face +z and side face +x)
    const drip = (x, z, len, side) => {
      const c = ice(k.cyl(g, 0.42, 0.42, len, cream, x, H - len / 2 + 0.3, z, 8));
      const b = ice(k.part(g, new THREE.SphereGeometry(0.5, 8, 6), cream, x, H - len + 0.3, z));
      for (const m of [c, b]) if (side) m.scale.x = 0.6; else m.scale.z = 0.6;
    };
    drip(W / 2 - 2.2, D / 2 + 0.5, 3.6); drip(W / 2 - 4.6, D / 2 + 0.5, 2.2); drip(W / 2 - 7.0, D / 2 + 0.5, 4.2);
    drip(W / 2 + 0.5, D / 2 - 2.6, 2.8, 1); drip(W / 2 + 0.5, D / 2 - 5.0, 3.9, 1);
    // a touch of pink blush on the scoop top
    const blush = k.part(g, new THREE.SphereGeometry(2.2, 10, 6), 0xf0c8c4, cx - 0.6, cy + 1.2, cz - 0.4); blush.scale.y = 0.35;
    // cool white spotlight housing on the roof, aimed at the cone
    k.box(g, 0.6, 0.6, 0.9, 0x40464c, W / 2 - 9, H + 0.6, D / 2 - 1.5);
    k.sign(g, 'NEUMARKT', 10, -6, 4.9, D / 2 + 0.4);
  });
})();

// Ulrepforte, Sachsenring / Kartäuserwall: the squat round tower of the medieval city wall with its
// corbelled battlement ring and low slate cap, the gate block beside it with its pointed passage and
// Cologne shield, and a crenellated stretch of the wall. Seat of the Rote Funken. Street side faces +z.
World.registerLandmark('ulrepforte', 'Ulrepforte', 'https://de.wikipedia.org/wiki/Ulrepforte', (g, o, k) => {
  const TUFF = 0x6a6157, BAND = 0xa39885, DARKST = 0x544c44, ROOF = 0x3a3c42, HOLE = 0x1a1a1a;
  const RED = 0xc8102e, WHITE = 0xf2efe8, GOLD = 0xd4a52a;
  // Repeated small parts are merged into one mesh per colour.
  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, off); nor.set(geo.attributes.normal.array, off); off += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);

  // --- Round tower: 12 m drum, lighter trachyte bands, arrow slits.
  const R = 6, TH = 15;
  k.cyl(g, R + 0.3, R + 0.5, 1.2, DARKST, 0, 0.6, 0, 20);
  k.cyl(g, R, R + 0.15, TH, TUFF, 0, TH / 2, 0, 20);
  for (const y of [3.5, 7, 10.5]) add(new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.45, 20, 1, true), BAND, 0, y, 0);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.7 + i * (Math.PI * 1.4 / 6) + Math.PI, y = i % 2 ? 5.2 : 8.8;
    bx(0.45, 1.7, 0.3, HOLE, Math.sin(a) * (R + 0.05), y, Math.cos(a) * (R + 0.05), a);
  }
  // A small doorway and window on the street side of the drum.
  k.arch(g, 1.6, 2.8, 2.6, 1.2, R * Math.cos(0.45) + 0.12, HOLE, 0.45);
  bx(1.1, 1.5, 0.25, HOLE, -1.6, 12.2, R - 0.1, -0.27);
  // Corbel ring, merlons and set-back slate cone.
  for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10; bx(0.5, 0.7, 0.8, DARKST, Math.sin(a) * (R + 0.2), TH - 0.2, Math.cos(a) * (R + 0.2), a); }
  k.cyl(g, R + 0.6, R + 0.35, 0.8, BAND, 0, TH + 0.4, 0, 20);
  add(new THREE.CylinderGeometry(R + 0.5, R + 0.5, 0.9, 20, 1, true), TUFF, 0, TH + 1.25, 0);
  for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; bx(1.5, 1.3, 1.0, TUFF, Math.sin(a) * (R + 0.1), TH + 2.35, Math.cos(a) * (R + 0.1), a); }
  k.cyl(g, R - 0.3, R - 0.3, 0.1, 0x4a4540, 0, TH + 0.85, 0, 20);
  k.cone(g, 5.5, 4, ROOF, 0, TH + 2.8, 0, 20);
  // Flagpole with the red-and-white flag.
  k.cyl(g, 0.1, 0.12, 6, 0xdcdcdc, 0, TH + 7.3, 0, 6);
  bx(3.4, 1.1, 0.08, RED, 1.75, TH + 9.55, 0); bx(3.4, 1.1, 0.08, WHITE, 1.75, TH + 8.45, 0);

  // --- Gate block west of the tower with the pointed passage (road runs through along z).
  const GX = -10, GW = 10, GD = 9, GH = 11;
  k.box(g, GW, GH, GD, TUFF, GX, GH / 2, 0);
  k.box(g, GW + 0.3, 0.9, GD + 0.3, DARKST, GX, 0.45, 0);
  // Mid string course: on the flanks, and on the gate faces only beside the arch (never across the passage).
  for (const sx of [-1, 1]) bx(0.3, 0.45, GD + 0.6, BAND, GX + sx * (GW / 2 + 0.15), 5.4, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(2.3, 0.45, 0.3, BAND, GX + sx * (GW / 2 - 0.85), 5.4, sz * (GD / 2 + 0.15));
  bx(GW + 0.8, 0.5, GD + 0.8, BAND, GX, GH - 0.1, 0);
  bx(GW - 0.1, 0.12, GD - 0.1, 0x4a4540, GX, GH + 0.22, 0); // walk deck above the cornice top
  for (let x = GX - GW / 2 + 0.7; x <= GX + GW / 2 - 0.6; x += 2.15) for (const z of [-GD / 2 + 0.4, GD / 2 - 0.4]) bx(1.3, 1.2, 0.9, TUFF, x, GH + 0.75, z);
  for (const x of [GX - GW / 2 + 0.4, GX + GW / 2 - 0.4]) for (let z = -2.1; z <= 2.1; z += 2.1) bx(0.9, 1.2, 1.3, TUFF, x, GH + 0.75, z);
  for (const side of [1, -1]) {
    const zf = side * (GD / 2 + 0.03), ry = side > 0 ? 0 : Math.PI;
    // Stone voussoir frame, then the dark passage (square jambs + pointed head).
    k.pointed(g, 5.4, 7.3, GX, 0, zf + side * 0.01, BAND, ry);
    k.pointed(g, 4.2, 6.4, GX, 0, zf + side * 0.04, HOLE, ry);
    bx(1.0, 0.9, 0.2, HOLE, GX - 3.2, 8.3, zf, ry); bx(1.0, 0.9, 0.2, HOLE, GX + 3.2, 8.3, zf, ry);
  }
  // Passage floor so the gate reads as open from above.
  bx(4.2, 0.06, GD + 0.2, 0x3b3834, GX, 0.03, 0);
  // Cologne shield above the arch: red chief with three golden crowns, white field with black flames.
  const sz = GD / 2 + 0.15;
  bx(2.2, 2.6, 0.15, 0x2a2622, GX, 8.9, sz - 0.05);
  bx(2.0, 0.85, 0.15, RED, GX, 9.75, sz);
  const lower = new THREE.Shape(); lower.moveTo(-1, 0); lower.lineTo(1, 0); lower.lineTo(1, -1.0); lower.quadraticCurveTo(1, -1.5, 0, -1.8); lower.quadraticCurveTo(-1, -1.5, -1, -1.0); lower.closePath();
  add(new THREE.ShapeGeometry(lower, 4), WHITE, GX, 9.33, sz + 0.09);
  for (const dx of [-0.6, 0, 0.6]) bx(0.42, 0.34, 0.08, GOLD, GX + dx, 9.8, sz + 0.1);
  for (let i = 0; i < 11; i++) { const row = i < 6 ? 0 : 1, col = row ? i - 6 : i; bx(0.12, 0.26, 0.05, 0x151515, GX - 0.7 + col * 0.28 + row * 0.14, 9.0 - row * 0.45, sz + 0.13); }

  // --- The city wall running east along the Kartäuserwall: crenellated, with the battle relief.
  const WX0 = R - 0.6, WL = 36, WH = 7, WT = 2.2;
  k.box(g, WL, WH, WT, TUFF, WX0 + WL / 2, WH / 2, -1);
  bx(WL, 0.6, WT + 0.3, DARKST, WX0 + WL / 2, 0.3, -1);
  bx(WL, 0.35, WT + 0.2, BAND, WX0 + WL / 2, WH - 0.2, -1);
  for (let x = WX0 + 1.4; x <= WX0 + WL - 0.6; x += 2.4) bx(1.3, 1.3, WT, TUFF, x, WH + 0.65, -1);
  for (let x = WX0 + 4; x <= WX0 + WL - 2; x += 6) if (Math.abs(x - (WX0 + 19)) > 5) bx(0.35, 1.3, 0.2, HOLE, x, 3.6, -1 + WT / 2 + 0.02);
  // Buttresses on the field side.
  for (let x = WX0 + 9; x < WX0 + WL; x += 9) bx(1.4, WH - 1.4, 1.2, TUFF, x, (WH - 1.4) / 2, -1 - WT / 2 - 0.5);
  // The 1268 battle relief: a pale sandstone plaque on the street face of the wall.
  bx(4.6, 2.4, 0.2, 0xcbbd9c, WX0 + 7, 3.4, -1 + WT / 2 + 0.1);
  for (let i = 0; i < 5; i++) {
    const hgt = 1.1 + (i % 2) * 0.3, fx = WX0 + 5.3 + i * 0.85;
    bx(0.5, hgt, 0.12, 0x8a7c62, fx, 2.75 + hgt / 2, -1 + WT / 2 + 0.2);        // armoured figure
    bx(0.32, 0.32, 0.12, 0x8a7c62, fx, 2.95 + hgt, -1 + WT / 2 + 0.2);          // helmeted head
  }
  bx(4.8, 0.3, 0.3, 0x9c8e72, WX0 + 7, 4.75, -1 + WT / 2 + 0.15);               // frame cap
  k.sign(g, 'ULREPFORTE', 8, WX0 + 19, 3.6, -1 + WT / 2 + 0.12, '#5a2020');
  flush();
});

// St. Severin, Severinskirchplatz (Vringsveedel): the long Gothic basilica with its slate roof, the
// Romanesque east choir between two slim flanking towers, and above all the massive late-Gothic west
// tower in three stepped storeys with tall louvre lancets, a pinnacled parapet and a slate pyramid:
// the landmark of the Südstadt. The church lies along x (west tower at -x); the south flank faces +z.
World.registerLandmark('stseverin', 'St. Severin', 'https://de.wikipedia.org/wiki/St._Severin_(K%C3%B6ln)', (g, o, k) => {
  const TUFF = 0xb3a68e, TOWER = 0xa4967c, TRIM = 0xcfc3a8, ROOF = 0x3b3e45, HOLE = 0x23272c, BUTT = 0x9a8c72;
  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, off); nor.set(geo.attributes.normal.array, off); off += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);
  function lancet(w, h, c, x, y, z, ry) { // pointed window plane, facing +z before rotation
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h * 0.72); s.lineTo(0, h); s.lineTo(-w / 2, h * 0.72); s.closePath();
    add(new THREE.ShapeGeometry(s), c, x, y, z, ry);
  }
  // A prism along x from a (z, y) profile.
  function prismX(pts, len, c, x) {
    const s = new THREE.Shape(); s.moveTo(-pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(-p[0], p[1]); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    add(geo, c, x, 0, 0, Math.PI / 2);
  }
  const face = (side) => (side > 0 ? 0 : Math.PI);

  // --- Nave (x -20..28): tall central vessel with clerestory, lower aisles with lean-to roofs.
  const NX0 = -20, NX1 = 28, NL = NX1 - NX0, NC = (NX0 + NX1) / 2, NW = 10, NH = 19, AW = 4, AH = 10;
  k.box(g, NW, NH, NL, TUFF, NC, NH / 2, 0).rotation.y = Math.PI / 2;
  prismX([[-NW / 2 - 0.6, NH], [NW / 2 + 0.6, NH], [0, NH + 8.5]], NL + 0.6, ROOF, NC);
  for (const side of [1, -1]) {
    const zc = side * (NW / 2 + AW / 2);
    bx(NL - 2, AH, AW, TUFF, NC + 1, AH / 2, zc);
    prismX([[side * (NW / 2), AH], [side * (NW / 2 + AW + 0.5), AH - 0.3], [side * (NW / 2 + AW + 0.5), AH], [side * (NW / 2), AH + 3]], NL - 1.4, ROOF, NC + 1);
    bx(NL - 1.6, 0.4, AW + 0.6, TRIM, NC + 1, AH - 0.2, zc);
    bx(NL, 0.45, 0.6, TRIM, NC, NH - 0.2, side * (NW / 2 + 0.1));
    for (let x = NX0 + 5; x <= NX1 - 3; x += 6) {
      lancet(1.6, 5, HOLE, x, AH + 3.5, side * (NW / 2 + 0.03), face(side));   // clerestory, clear of the aisle roof
      lancet(1.8, 6, HOLE, x, 2.2, side * (NW / 2 + AW + 0.03), face(side));    // aisle windows
      bx(0.9, AH - 1, 0.9, BUTT, x + 3, (AH - 1) / 2, side * (NW / 2 + AW + 0.35));
      bx(0.7, NH - AH - 1, 0.7, BUTT, x + 3, (AH + NH - 1) / 2 + 0.5, side * (NW / 2 + 0.3)); // clerestory pilaster
    }
  }
  // South porch at the Severinskirchplatz.
  bx(5, 7, 3, TOWER, 6, 3.5, NW / 2 + AW + 1.5);
  k.roof(g, 5.6, 3, 3.4, ROOF, 6, 7, NW / 2 + AW + 1.5);
  lancet(2.4, 4.6, HOLE, 6, 0, NW / 2 + AW + 3.04, 0);

  // --- East choir (x 28..37) and the half-round apse, flanked by two slim Romanesque towers.
  const CW = 11, CH = 17, CX0 = NX1, CX1 = 37;
  bx(CX1 - CX0, CH, CW, TUFF, (CX0 + CX1) / 2, CH / 2, 0);
  prismX([[-CW / 2 - 0.5, CH], [CW / 2 + 0.5, CH], [0, CH + 7.5]], CX1 - CX0, ROOF, (CX0 + CX1) / 2);
  const apse = new THREE.CylinderGeometry(CW / 2, CW / 2, CH, 12, 1, false, 0, Math.PI);
  add(apse, TUFF, CX1, CH / 2, 0);
  add(new THREE.ConeGeometry(CW / 2 + 0.5, 7.5, 12, 1, false, 0, Math.PI), ROOF, CX1, CH + 3.75, 0);
  add(new THREE.CylinderGeometry(CW / 2 + 0.25, CW / 2 + 0.25, 0.6, 12, 1, true, 0, Math.PI), TRIM, CX1, CH - 1.2, 0);
  for (let i = 1; i < 6; i++) {
    const a = i * Math.PI / 6;
    k.arch(g, 1.5, 5.5, CX1 + Math.sin(a) * (CW / 2 + 0.05), 7.5, Math.cos(a) * (CW / 2 + 0.05), HOLE, a);
    k.arch(g, 1.2, 2.2, CX1 + Math.sin(a) * (CW / 2 + 0.05), 13.4, Math.cos(a) * (CW / 2 + 0.05), 0x8e826b, a);
  }
  for (const side of [1, -1]) {
    const tx = CX0 + 2.6, tz = side * (CW / 2 + 2.25), TW = 4.5, TH = 27;
    bx(TW, TH, TW, TOWER, tx, TH / 2, tz);
    for (const y of [9, 16, 22]) bx(TW + 0.35, 0.35, TW + 0.35, TRIM, tx, y, tz);
    const cap = new THREE.ConeGeometry(TW * 0.75, 5, 4); cap.rotateY(Math.PI / 4); add(cap, ROOF, tx, TH + 2.5, tz);
    for (const s of [1, -1]) {
      k.arch(g, 1.4, 3, tx, 17.5, tz + s * (TW / 2 + 0.03), HOLE, face(s));
      k.arch(g, 1.4, 3, tx + s * (TW / 2 + 0.03), 17.5, tz, HOLE, s * Math.PI / 2);
      k.arch(g, 0.8, 2, tx, 11, tz + s * (TW / 2 + 0.03), HOLE, face(s));
    }
  }

  // --- West tower: three storeys stepping back (12 -> 11 -> 10 m), corner buttresses, louvres.
  const WX = NX0 - 6, tiers = [[0, 21, 12], [21, 39, 11], [39, 53, 10]];
  for (const [y0, y1, w] of tiers) {
    const h = y1 - y0;
    k.box(g, w, h, w, TOWER, WX, y0 + h / 2, 0);
    bx(w + 0.7, 0.55, w + 0.7, TRIM, WX, y1 - 0.2, 0);
    // Stepped corner buttresses.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const bw = y0 === 0 ? 1.8 : 1.3;
      bx(bw, h - 1, bw, BUTT, WX + sx * (w / 2 + bw / 2 - 0.5), y0 + (h - 1) / 2, sz * (w / 2 + bw / 2 - 0.5));
      bx(bw * 0.8, 1.2, bw * 0.8, TRIM, WX + sx * (w / 2 + bw / 2 - 0.5), y1 - 1.2, sz * (w / 2 + bw / 2 - 0.5));
    }
    // Two tall louvre lancets per face (blind windows on the lowest storey).
    const lw = y0 === 0 ? 1.8 : 1.7, lh = y0 === 0 ? 6 : h - 7, ly = y0 === 0 ? 11 : y0 + 3;
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2;
      for (const dx of [-w * 0.2, w * 0.2]) {
        const px = WX + Math.sin(a) * (w / 2 + 0.04) + Math.cos(a) * dx, pz = Math.cos(a) * (w / 2 + 0.04) - Math.sin(a) * dx;
        lancet(lw + 0.5, lh + 0.5, TRIM, px, ly - 0.25, pz, a);
        const px2 = px + Math.sin(a) * 0.03, pz2 = pz + Math.cos(a) * 0.03;
        lancet(lw, lh, HOLE, px2, ly, pz2, a);
        if (y0 > 0) for (let yy = ly + 1.2; yy < ly + lh * 0.7; yy += 1.1) bx(lw, 0.18, 0.12, 0x6d6557, px2 + Math.sin(a) * 0.05, yy, pz2 + Math.cos(a) * 0.05, a);
      }
    }
  }
  // West portal (street side of the Severinstraße) and a clock on the south face.
  lancet(4, 7.5, TRIM, WX - 6.08, 0, 0, -Math.PI / 2); lancet(3.2, 6.6, HOLE, WX - 6.12, 0, 0, -Math.PI / 2);
  for (const [px, pz, a] of [[WX, 5.55, 0], [WX - 5.55, 0, -Math.PI / 2]]) {
    const dial = new THREE.CylinderGeometry(1.5, 1.5, 0.15, 16); dial.rotateX(Math.PI / 2);
    add(dial, 0xe8dfc4, px, 36, pz, a);
    bx(0.15, 1.2, 0.08, 0x1c1c1c, px + Math.sin(a) * 0.1, 36.45, pz + Math.cos(a) * 0.1, a);
    bx(0.9, 0.15, 0.08, 0x1c1c1c, px + Math.sin(a) * 0.1 + Math.cos(a) * 0.35, 36, pz + Math.cos(a) * 0.1 - Math.sin(a) * 0.35, a);
  }
  // Parapet, corner pinnacles and the slate pyramid with a cross.
  const TOP = 53;
  for (const s of [-1, 1]) { bx(10.6, 1.4, 0.5, TOWER, WX, TOP + 0.7, s * 5.05); bx(0.5, 1.4, 10.6, TOWER, WX + s * 5.05, TOP + 0.7, 0); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    bx(1.2, 2.2, 1.2, TOWER, WX + sx * 5, TOP + 1.1, sz * 5);
    add(new THREE.ConeGeometry(0.75, 4, 4), TRIM, WX + sx * 5, TOP + 4.2, sz * 5, Math.PI / 4);
  }
  const pyr = new THREE.ConeGeometry(6.6, 8, 4); pyr.rotateY(Math.PI / 4); add(pyr, ROOF, WX, TOP + 4, 0);
  k.cross(g, WX, TOP + 9, 0);
  flush();
});

// St. Maria in Lyskirchen, An Lyskirchen by the Rhine: the smallest of the twelve Romanesque churches,
// a compact basilica with low lean-to aisles, a small half-round east apse with a blind arcade band,
// and the single square north-west tower with paired round louvres and a slate pyramid carrying a
// golden ship vane for the Rhine boatmen. The east apse faces the Rhine front (+z).
World.registerLandmark('lyskirchen', 'St. Maria in Lyskirchen', 'https://de.wikipedia.org/wiki/St._Maria_in_Lyskirchen', (g, o, k) => {
  const TUFF = 0xc2b28f, TOWER = 0xb5a47f, TRIM = 0xdccfb0, BAND = 0xa89878, ROOF = 0x3a3d44, HOLE = 0x262a2e, GOLD = 0xd4a017;
  // Built along x, then turned so the east apse faces the Rhine front (+z) with the tower behind at the north-west.
  const s = new THREE.Group(); s.rotation.y = -Math.PI / 2; g.add(s);
  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, off); nor.set(geo.attributes.normal.array, off); off += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(s, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);
  function rarch(w, h, c, x, y, z, ry) { // round-arched opening plane facing +z before rotation
    const r = w / 2, sh = new THREE.Shape(); sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, h - r); sh.absarc(0, h - r, r, 0, Math.PI, false); sh.closePath();
    add(new THREE.ShapeGeometry(sh, 5), c, x, y, z, ry);
  }
  function prismX(pts, len, c, x) { // prism along x from a (z, y) profile
    const sh = new THREE.Shape(); sh.moveTo(-pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(-p[0], p[1]); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    add(geo, c, x, 0, 0, Math.PI / 2);
  }
  const face = (side) => (side > 0 ? 0 : Math.PI);

  // --- Nave (x -15..15), 12 m wide, 13 m high, slate gable roof.
  const NX0 = -15, NX1 = 15, NL = 30, NW = 12, NH = 14, AW = 3.5, AH = 8;
  bx(NL, NH, NW, TUFF, 0, NH / 2, 0);
  prismX([[-NW / 2 - 0.5, NH], [NW / 2 + 0.5, NH], [0, NH + 6]], NL - 0.1, ROOF, 0);
  // Masonry gable triangles standing just proud of the roof ends (the gables read as stone, not slate).
  prismX([[-NW / 2, NH - 0.1], [NW / 2, NH - 0.1], [0, NH + 5.6]], NL + 0.3, TUFF, 0);
  bx(NL + 0.2, 0.45, NW + 0.4, TRIM, 0, NH - 0.2, 0);
  for (const side of [1, -1]) {
    const zc = side * (NW / 2 + AW / 2);
    bx(NL - 1, AH, AW, TUFF, 0.5, AH / 2, zc);
    prismX([[side * NW / 2, AH], [side * (NW / 2 + AW + 0.45), AH - 0.2], [side * (NW / 2 + AW + 0.45), AH + 0.1], [side * NW / 2, AH + 2.3]], NL - 0.6, ROOF, 0.5);
    bx(NL - 1, 0.35, 0.3, TRIM, 0.5, AH - 0.15, side * (NW / 2 + AW + 0.1));
    for (let x = NX0 + 4.5; x <= NX1 - 3; x += 5) {
      rarch(1.1, 2.6, HOLE, x, AH + 2.7, side * (NW / 2 + 0.03), face(side));      // clerestory, clear of the aisle roof
      rarch(1.4, 3.2, HOLE, x, 2.6, side * (NW / 2 + AW + 0.03), face(side));      // aisle windows
      bx(0.5, AH - 0.6, 0.35, BAND, x + 2.5, (AH - 0.6) / 2, side * (NW / 2 + AW + 0.15)); // pilaster strips
    }
    // Romanesque round-arch frieze under the aisle eaves.
    for (let x = NX0 + 1.4; x <= NX1 - 1.4; x += 1.4) rarch(1.0, 0.8, BAND, x, AH - 1.3, side * (NW / 2 + AW + 0.06), face(side));
  }
  // --- West front: gable, portal, round window.
  const wf = NX0 - 0.04;
  rarch(3.2, 5.2, TRIM, wf - 0.02, 0, 0, -Math.PI / 2); rarch(2.4, 4.6, HOLE, wf - 0.06, 0, 0, -Math.PI / 2);
  const rose = new THREE.CylinderGeometry(1.3, 1.3, 0.12, 12); rose.rotateZ(Math.PI / 2); add(rose, HOLE, wf - 0.02, 9.5, 0);
  const roseR = new THREE.TorusGeometry(1.35, 0.22, 4, 12); roseR.rotateY(Math.PI / 2); add(roseR, TRIM, wf - 0.05, 9.5, 0);
  for (const dz of [-2.4, 2.4]) rarch(1.0, 2.4, HOLE, wf - 0.02, 7.2, dz, -Math.PI / 2);
  rarch(1.0, 2.0, HOLE, wf - 0.16, NH + 1.2, 0, -Math.PI / 2);

  // --- East apse: half-round, with a dark-ish blind arcade band and half-cone roof.
  const AR = 5, APH = 10;
  add(new THREE.CylinderGeometry(AR, AR, APH, 12, 1, false, 0, Math.PI), TUFF, NX1, APH / 2, 0);
  add(new THREE.CylinderGeometry(AR + 0.08, AR + 0.08, 2.2, 12, 1, true, 0, Math.PI), BAND, NX1, APH - 1.6, 0);
  add(new THREE.ConeGeometry(AR + 0.4, 5, 12, 1, false, 0, Math.PI), ROOF, NX1, APH + 2.5, 0);
  add(new THREE.CylinderGeometry(AR + 0.35, AR + 0.35, 0.4, 12, 1, true, 0, Math.PI), TRIM, NX1, APH - 0.3, 0);
  for (let i = 1; i < 12; i++) {
    const a = i * Math.PI / 12;
    rarch(0.9, 1.5, 0x7e7058, NX1 + Math.sin(a) * (AR + 0.12), APH - 2.5, Math.cos(a) * (AR + 0.12), a);
    if (i % 3 === 0) rarch(1.2, 3, HOLE, NX1 + Math.sin(a) * (AR + 0.06), 3.4, Math.cos(a) * (AR + 0.06), a);
  }
  // East gable of the nave above the apse.
  rarch(1.2, 2.2, HOLE, NX1 + 0.2, NH + 1.4, 0, Math.PI / 2);

  // --- North-west tower, 8 x 8 m, 26 m, paired round louvres, slate pyramid and golden ship vane.
  const TX = NX0 + 4, TZ = -(NW / 2 + 3.2), TW = 8, TH = 26;
  k.box(s, TW, TH, TW, TOWER, TX, TH / 2, TZ);
  for (const y of [8.5, 17, TH - 0.2]) bx(TW + 0.5, 0.45, TW + 0.5, TRIM, TX, y, TZ);
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a), tx = Math.cos(a), tz = -Math.sin(a);
    const fx = TX + nx * (TW / 2 + 0.03), fz = TZ + nz * (TW / 2 + 0.03);
    // Lisenes at the corners and a round-arch frieze under each storey band.
    for (const d of [-TW / 2 + 0.3, TW / 2 - 0.3]) bx(0.6, TH - 0.5, 0.2, BAND, fx + tx * d, (TH - 0.5) / 2, fz + tz * d, a);
    for (const y of [16.2, TH - 1]) for (let d = -3; d <= 3; d += 1.2) rarch(0.9, 0.7, BAND, fx + tx * d + nx * 0.04, y - 0.6, fz + tz * d + nz * 0.04, a);
    // Top storey: two paired round louvres with a colonnette; lower storey: one slit.
    for (const d of [-1.7, 1.7]) {
      for (const e of [-0.6, 0.6]) rarch(1.0, 2.6, HOLE, fx + tx * (d + e) + nx * 0.05, 19.5, fz + tz * (d + e) + nz * 0.05, a);
      rarch(2.6, 3.4, TRIM, fx + tx * d + nx * 0.02, 19.1, fz + tz * d + nz * 0.02, a);
    }
    rarch(1.0, 2.4, HOLE, fx + nx * 0.05, 11.5, fz + nz * 0.05, a);
  }
  const pyr = new THREE.ConeGeometry(TW * 0.76, 7, 4); pyr.rotateY(Math.PI / 4); add(pyr, ROOF, TX, TH + 3.5, TZ);
  // Golden weather-vane ship on a rod.
  k.cyl(s, 0.1, 0.12, 3, 0x8a7a50, TX, TH + 8.3, TZ, 6);
  const hull = new THREE.Shape(); hull.moveTo(-1.4, 0.55); hull.lineTo(1.4, 0.55); hull.lineTo(0.85, 0); hull.lineTo(-0.85, 0); hull.closePath();
  add(new THREE.ExtrudeGeometry(hull, { depth: 0.12, bevelEnabled: false }), GOLD, TX, TH + 9.5, TZ - 0.06);
  bx(0.08, 1.4, 0.08, GOLD, TX, TH + 10.7, TZ);
  const sail = new THREE.Shape(); sail.moveTo(0.05, 0.1); sail.lineTo(1.05, 0.1); sail.lineTo(0.05, 1.3); sail.closePath();
  add(new THREE.ShapeGeometry(sail), GOLD, TX, TH + 10.05, TZ + 0.04); add(new THREE.ShapeGeometry(sail), GOLD, TX, TH + 10.05, TZ - 0.04, Math.PI);
  // Tower ground-floor doorway to the churchyard.
  rarch(1.6, 3, HOLE, TX - TW / 2 - 0.05, 0, TZ, -Math.PI / 2);
  flush();
});

// St. Clemens, Mülheim: the old boatmen's church right on the Rhine bank beside the Mülheimer
// Brücke. Whitewashed hall with one big slate saddle roof (Schürmann's 1950s rebuild) and the
// east choir tower: square white shaft, balustrade, octagonal storey, curved "welsche Haube"
// and a little lantern. Long side faces +z (the street), the river quay lies behind (-z).
World.registerLandmark('stclemens', 'St. Clemens · Mülheim', 'https://de.wikipedia.org/wiki/St._Clemens_(K%C3%B6ln-M%C3%BClheim)', (g, o, k) => {
  const WHITE = 0xefebe2, SHADE = 0xe2ddd0, ROOF = 0x3b4149, WIN = 0x2e3a44, BAND = 0xb9ae98, GOLD = 0xd4af37;
  const QUAY = 0x8d8a84, TRUNK = 0x5d4a3a, LEAF = 0x5f7f45;
  // Small repeated parts share one mesh per colour.
  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
    const gg = geo.index ? geo.toNonIndexed() : geo;
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(gg);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o3 = 0;
      for (const geo of list) {
        if (!geo.attributes.normal) geo.computeVertexNormals();
        pos.set(geo.attributes.position.array, o3); nor.set(geo.attributes.normal.array, o3);
        o3 += geo.attributes.position.count * 3;
      }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);
  function archShape(w, h) {
    const r = w / 2, s = new THREE.Shape();
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.closePath();
    return s;
  }
  const arc = (w, h, c, x, y, z, ry) => add(new THREE.ShapeGeometry(archShape(w, h), 5), c, x, y, z, ry);

  // --- Hall nave: long axis along x, 26 m long, 14 m wide, eaves 10 m, ridge 18 m.
  const NL = 26, NW = 14, EAVE = 10, RH = 8, NX = -3;
  k.box(g, NL, EAVE, NW, WHITE, NX, EAVE / 2, 0);
  // White gable walls (prism) under two slate roof planes, so the gable ends stay white.
  const gable = k.roof(g, NW, RH, NL, SHADE, NX, EAVE, 0); gable.rotation.y = Math.PI / 2;
  const slope = Math.hypot(NW / 2, RH), ang = Math.atan2(RH, NW / 2);
  for (const s of [-1, 1]) {
    const p = k.box(g, NL + 1.4, 0.45, slope + 0.9, ROOF, NX, EAVE + RH / 2 + 0.15, s * (NW / 4 + 0.1));
    p.rotation.x = s * ang;
  }
  bx(NL + 0.4, 0.8, NW + 0.4, 0xc9c3b4, NX, 0.4, 0); // plinth
  // Four tall round-arched windows per long side.
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = NX - 9 + i * 6;
    arc(1.7, 4.8, WIN, x, 3.6, s * (NW / 2 + 0.05), s > 0 ? 0 : Math.PI);
  }
  // Street-side door with a little porch roof.
  arc(2.4, 3.6, 0x4a3a2c, NX - 12 + 16.5, 0, NW / 2 + 0.06, 0);
  // West gable toward the river: arched portal, round window high up.
  const wx = NX - NL / 2 - 0.06;
  // Low Vorhalle (porch) in front of the west portal, with its own little slate gable roof.
  k.box(g, 3.2, 4.6, 5.6, WHITE, wx - 1.54, 2.3, 0);
  const pr = k.roof(g, 6.4, 2.2, 3.8, ROOF, wx - 1.54, 4.6, 0); pr.rotation.y = Math.PI / 2;
  arc(2.6, 3.6, 0x4a3a2c, wx - 3.2, 0, 0, -Math.PI / 2);
  arc(1.4, 3.6, WIN, wx, 6, -3.6, -Math.PI / 2); arc(1.4, 3.6, WIN, wx, 6, 3.6, -Math.PI / 2);
  const oc = new THREE.CircleGeometry(1.3, 10); oc.rotateY(-Math.PI / 2); add(oc, WIN, wx - 0.04, EAVE + 2.8, 0);
  // Gable-edge trim on the west end.
  k.cross(g, wx + 0.3, EAVE + RH + 1.2, 0);

  // --- East choir tower: square white shaft, balustrade, octagon, welsche Haube, lantern.
  const TX = NX + NL / 2 + 3.6, TW = 7.4, SH = 22;
  k.box(g, TW, SH, TW, WHITE, TX, SH / 2, 0);
  for (const y of [8, 15.5]) bx(TW + 0.4, 0.45, TW + 0.4, BAND, TX, y, 0);
  bx(TW + 0.3, 0.7, TW + 0.3, 0xc9c3b4, TX, 0.35, 0);
  // Shaft openings: small arched windows, then paired louvres near the top.
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a);
    const px = TX + nx * (TW / 2 + 0.05), pz = nz * (TW / 2 + 0.05);
    arc(1.2, 2.6, WIN, px, 10.8, pz, a);
    for (const d of [-1.25, 1.25]) arc(1.3, 3.4, WIN, px + Math.cos(a) * d, 17.4, pz - Math.sin(a) * d, a);
  }
  // Cornice and balustrade ring around the platform.
  bx(TW + 1.2, 0.6, TW + 1.2, BAND, TX, SH + 0.3, 0);
  const BW = TW + 0.8;
  for (const s of [-1, 1]) {
    bx(BW, 0.3, 0.3, BAND, TX, SH + 1.55, s * BW / 2); bx(0.3, 0.3, BW, BAND, TX + s * BW / 2, SH + 1.55, 0);
    for (let i = -3; i <= 3; i++) {
      bx(0.25, 1.0, 0.25, WHITE, TX + i * BW / 7, SH + 1.0, s * BW / 2);
      bx(0.25, 1.0, 0.25, WHITE, TX + s * BW / 2, SH + 1.0, i * BW / 7);
    }
  }
  // Octagonal belfry storey with round-arched louvres.
  const OR = 3.2, OH = 6, OY = SH + 0.6;
  const oct = k.cyl(g, OR, OR, OH, WHITE, TX, OY + OH / 2, 0, 8); oct.rotation.y = Math.PI / 8;
  const octBand = k.cyl(g, OR + 0.3, OR + 0.3, 0.45, BAND, TX, OY + OH, 0, 8); octBand.rotation.y = Math.PI / 8;
  for (let f = 0; f < 8; f++) {
    const a = f * Math.PI / 4, rr = OR * Math.cos(Math.PI / 8) + 0.05;
    arc(1.3, 3.4, WIN, TX + Math.sin(a) * rr, OY + 1.3, Math.cos(a) * rr, a);
  }
  // Welsche Haube: bulging, then pinched slate cap (lathe profile).
  const HY = OY + OH + 0.2;
  const prof = [[3.6, 0], [3.9, 0.5], [3.5, 1.5], [2.3, 2.6], [1.1, 3.3], [0.9, 3.9]].map(([r, y]) => new THREE.Vector2(r, y));
  const haube = new THREE.LatheGeometry(prof, 8); haube.rotateY(Math.PI / 8);
  k.part(g, haube, ROOF, TX, HY, 0);
  // Lantern with little windows, its own cap, a gold ball and cross.
  const LY = HY + 3.9;
  const lan = k.cyl(g, 1.0, 1.0, 2.4, WHITE, TX, LY + 1.2, 0, 8); lan.rotation.y = Math.PI / 8;
  for (let f = 0; f < 4; f++) { const a = f * Math.PI / 2 + Math.PI / 4; bx(0.5, 1.4, 0.1, WIN, TX + Math.sin(a) * 0.97, LY + 1.3, Math.cos(a) * 0.97, a); }
  const lprof = [[1.3, 0], [1.2, 0.5], [0.6, 1.2], [0.15, 2.4]].map(([r, y]) => new THREE.Vector2(r, y));
  const lcap = new THREE.LatheGeometry(lprof, 8); lcap.rotateY(Math.PI / 8);
  k.part(g, lcap, ROOF, TX, LY + 2.4, 0);
  const TOP = LY + 4.8;
  k.part(g, new THREE.SphereGeometry(0.35, 8, 6), GOLD, TX, TOP, 0);
  bx(0.25, 2.0, 0.25, GOLD, TX, TOP + 1.2, 0); bx(1.2, 0.25, 0.25, GOLD, TX, TOP + 1.6, 0);

  // --- Rhine quay behind the church: low grey wall, railing, two plane trees.
  bx(44, 1.5, 1.2, QUAY, NX + 3, 0.75, -NW / 2 - 5.5);
  bx(44, 0.12, 0.12, 0x3a3f44, NX + 3, 2.4, -NW / 2 - 5.5);
  for (let i = 0; i <= 11; i++) bx(0.12, 0.9, 0.12, 0x3a3f44, NX - 19 + i * 4, 1.95, -NW / 2 - 5.5);
  for (const tx of [NX - 17, NX + 22]) {
    bx(0.7, 5, 0.7, TRUNK, tx, 2.5, -NW / 2 - 2.5);
    const crown = new THREE.IcosahedronGeometry(3.6, 0); crown.scale(1, 0.85, 1);
    add(crown, LEAF, tx, 7.4, -NW / 2 - 2.5);
  }
  flush();
});

// Justizgebäude am Reichenspergerplatz (Oberlandesgericht Köln, Paul Thoemer 1907-1911):
// a neo-baroque sandstone palace whose gently curved front embraces the square. Central
// risalit with six colossal columns under a pediment and the tall slate roof pavilion (the
// 65 m tower above it was lost in the war and never rebuilt), long wings with mansard roofs
// and dormers, two projecting corner pavilions with segmental gables, rusticated ground floor.
World.registerLandmark('oberlandesgericht', 'Oberlandesgericht · Reichenspergerplatz', 'https://de.wikipedia.org/wiki/Justizgeb%C3%A4ude_Reichenspergerplatz', (g, o, k) => {
  const SAND = 0xd8ccb0, RUST = 0xc4b796, GROOVE = 0xa89c7e, TRIMC = 0xe8dfc8, ROOF = 0x4a525c;
  const WIN = 0x2f3a44, DOOR = 0x3b2f26, COPPER = 0x5f9a86, LAWN = 0x6d8f4e, LEAF = 0x5a7b43, TRUNK = 0x5d4a3a;
  const batches = new Map();
  const T = (x, y, z, ry) => new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x || 0, y || 0, z || 0);
  function add(geo, color, M) {
    if (M) geo.applyMatrix4(M);
    const gg = geo.index ? geo.toNonIndexed() : geo;
    if (!gg.attributes.normal) gg.computeVertexNormals();
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(gg);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o3 = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, o3); nor.set(geo.attributes.normal.array, o3); o3 += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  // Local helpers: geometry placed in a block frame M (origin = front-face centre at ground).
  const place = (M, geo, c, x, y, z, ry) => { geo.applyMatrix4(T(x, y, z, ry)); add(geo, c, M); };
  const lb = (M, w, h, d, c, x, y, z, ry) => place(M, new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);
  function archGeo(w, h) {
    const r = w / 2, s = new THREE.Shape();
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.closePath();
    return new THREE.ShapeGeometry(s, 5);
  }
  // Rectangular frustum (mansard / pavilion roof), base centred at the origin.
  function frustum(wb, db, wt, dt, h) {
    const B = [[-wb / 2, 0, db / 2], [wb / 2, 0, db / 2], [wb / 2, 0, -db / 2], [-wb / 2, 0, -db / 2]];
    const U = [[-wt / 2, h, dt / 2], [wt / 2, h, dt / 2], [wt / 2, h, -dt / 2], [-wt / 2, h, -dt / 2]];
    const t = [];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; t.push(B[i], B[j], U[j], B[i], U[j], U[i]); }
    t.push(U[0], U[1], U[2], U[0], U[2], U[3]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(t.flat(), 3));
    geo.computeVertexNormals(); return geo;
  }
  function extruded(shape, depth) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 6 });
    return geo;
  }

  // One facade block: len along local x, front face at z = 0, body toward -z.
  function block(M, len, H, D, opts) {
    lb(M, len, H, D, SAND, 0, H / 2, -D / 2);
    // Rusticated ground floor with grooves, string course, main cornice.
    for (const side of [1, -1]) {
      const z = side > 0 ? 0.2 : -D - 0.2;
      lb(M, len, 5.6, 0.4, RUST, 0, 2.8, z);
      for (const y of [1.4, 2.8, 4.2]) lb(M, len + 0.02, 0.14, 0.44, GROOVE, 0, y, z);
    }
    lb(M, len + 0.6, 0.5, D + 1, TRIMC, 0, 5.85, -D / 2);
    lb(M, len + 1.2, 0.9, D + 1.6, TRIMC, 0, H - 0.3, -D / 2);
    // Window grid on both long faces: arched ground floor, three rows above with pilasters.
    const n = Math.max(1, Math.floor(len / 4.2)), step = len / n;
    for (const side of [1, -1]) {
      const ry = side > 0 ? 0 : Math.PI, z0 = side > 0 ? 0 : -D;
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + step * (i + 0.5);
        if (opts.skip && Math.abs(x) < opts.skip && side > 0) continue;
        place(M, archGeo(1.6, 3.4), WIN, x, 1.2, z0 + side * 0.44, ry);
        for (const y of [8.4, 12.6, 16.8]) {
          if (y > H - 3) continue;
          lb(M, 1.6, 2.8, 0.12, WIN, x, y, z0 + side * 0.05);
          lb(M, 2.2, 0.35, 0.3, TRIMC, x, y + 1.7, z0 + side * 0.1);
        }
        if (side > 0) lb(M, 0.55, H - 7, 0.3, TRIMC, x + step / 2, 6 + (H - 7) / 2, z0 + 0.12);
      }
    }
    // Mansard roof with a dormer on every other window axis.
    const RH = opts.roofH || 6;
    add(frustum(len + 0.8, D + 0.8, opts.topW || len - 4, opts.topD || D - 5, RH), ROOF, M.clone().multiply(T(0, H + 0.15, -D / 2)));
    if (opts.dormers) for (let i = 0; i < n; i += 2) {
      const x = -len / 2 + step * (i + 0.5);
      if (opts.skip && Math.abs(x) < opts.skip) continue;
      lb(M, 1.8, 3.0, 2.4, TRIMC, x, H + 2.1, -1.0);
      lb(M, 1.0, 1.6, 0.1, WIN, x, H + 2.0, 0.22);
      const cap = new THREE.ConeGeometry(1.4, 1.1, 4); cap.rotateY(Math.PI / 4); cap.scale(1, 1, 1.3);
      place(M, cap, ROOF, x, H + 4.15, -1.0);
    }
    // Windowed side faces (corner pavilions show them to the approaching driver).
    if (opts.sides) for (const sx of [opts.sides]) {
      const xs = sx * len / 2, ry = sx * Math.PI / 2;
      lb(M, 0.4, 5.6, D, RUST, xs + sx * 0.2, 2.8, -D / 2);
      for (const y of [1.4, 2.8, 4.2]) lb(M, 0.44, 0.14, D + 0.02, GROOVE, xs + sx * 0.2, y, -D / 2);
      const m = Math.max(1, Math.floor(D / 4.4)), st = D / m;
      for (let j = 0; j < m; j++) {
        const z = -st * (j + 0.5);
        place(M, archGeo(1.6, 3.4), WIN, xs + sx * 0.44, 1.2, z, ry);
        for (const y of [8.4, 12.6, 16.8]) {
          if (y > H - 3) continue;
          lb(M, 1.6, 2.8, 0.12, WIN, xs + sx * 0.05, y, z, ry);
          lb(M, 2.2, 0.35, 0.3, TRIMC, xs + sx * 0.1, y + 1.7, z, ry);
        }
      }
    }
  }

  const TH = 12 * Math.PI / 180; // wings swing forward: a concave, square-embracing front
  const CL = 28, CH = 22, CD = 22, WL = 25, WH = 21, WD = 18, PL = 16, PH = 24, PD = 22;
  const c = Math.cos(TH), s = Math.sin(TH);

  // --- Centre block with risalit, portico and roof pavilion.
  const MC = T(0, 0, 0, 0);
  block(MC, CL, CH, CD, { skip: 13, roofH: 6 });
  lb(MC, 26, CH + 2, 2.6, SAND, 0, (CH + 2) / 2, 1.3);
  lb(MC, 27, 5.6, 5.6, RUST, 0, 2.8, 2.8);
  for (const y of [1.4, 2.8, 4.2]) lb(MC, 27.04, 0.14, 5.64, GROOVE, 0, y, 2.8);
  lb(MC, 27.6, 0.6, 6, TRIMC, 0, 5.9, 2.8);
  for (const x of [-7, 0, 7]) place(MC, archGeo(3, 4.6), DOOR, x, 0.3, 5.63, 0);
  for (let i = 0; i < 4; i++) lb(MC, 22 - i * 0.6, 0.35, 1.3, 0xbdb193, 0, 0.175 + i * 0.35 - 0.0, 6.9 + (3 - i) * 1.1);
  // Six colossal columns with bases and capitals, entablature and triangular pediment.
  for (const x of [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5]) {
    place(MC, new THREE.CylinderGeometry(0.8, 0.85, 13.4, 8), TRIMC, x, 12.9, 4.4);
    lb(MC, 2.0, 0.6, 2.0, TRIMC, x, 6.5, 4.4); lb(MC, 2.0, 0.6, 2.0, TRIMC, x, 19.4, 4.4);
  }
  // Windows between the columns, behind the portico.
  for (const x of [-8.4, -4.2, 0, 4.2, 8.4]) for (const y of [8.6, 13.4]) lb(MC, 1.8, 3.2, 0.12, WIN, x, y, 2.66);
  lb(MC, 27, 1.7, 5.2, TRIMC, 0, 20.5, 3.2);
  const ped = new THREE.Shape(); ped.moveTo(-13.8, 0); ped.lineTo(13.8, 0); ped.lineTo(0, 6); ped.closePath();
  place(MC, extruded(ped, 1.2), SAND, 0, 21.35, 4.0);
  const pin = new THREE.Shape(); pin.moveTo(-12, 0); pin.lineTo(12, 0); pin.lineTo(0, 5.1); pin.closePath();
  place(MC, new THREE.ShapeGeometry(pin), RUST, 0, 21.8, 5.22);
  // Tall slate roof pavilion over the centre, crowned by copper cresting and a finial.
  add(frustum(24, 20, 9, 7, 15), ROOF, T(0, CH + 0.2, -9));
  lb(MC, 9.6, 0.5, 7.6, COPPER, 0, CH + 15.4, -9);
  for (const x of [-3.6, 0, 3.6]) place(MC, new THREE.ConeGeometry(0.35, 2.4, 6), COPPER, x, CH + 16.8, -9);
  // Round oculus dormers on the pavilion's front slope.
  for (const x of [-5, 5]) {
    lb(MC, 3.0, 3.6, 3.0, TRIMC, x, CH + 6.3, -2.5);
    lb(MC, 3.4, 0.4, 3.2, TRIMC, x, CH + 8.2, -2.5);
    const oc = new THREE.CircleGeometry(1.0, 12); place(MC, oc, WIN, x, CH + 6.2, -0.98);
  }

  // --- Wings and corner pavilions, mirrored.
  for (const side of [-1, 1]) {
    const ry = -side * TH;
    const MW = T(side * (CL / 2 + (WL / 2) * c - 0.4), 0, (WL / 2) * s - 0.2, ry);
    block(MW, WL + 1, WH, WD, { dormers: true, roofH: 6 });
    const d = CL / 2 + WL * c - 0.6 + (PL / 2) * c, MP = T(side * d, 0, (WL + PL / 2) * s, ry).multiply(T(0, 0, 2));
    block(MP, PL, PH, PD, { roofH: 9, topW: 7, topD: 11, sides: side });
    // Segmental gable over the pavilion front, with an oval window.
    const sg = new THREE.Shape(); sg.moveTo(-6.5, 0); sg.lineTo(6.5, 0); sg.quadraticCurveTo(0, 8.4, -6.5, 0);
    place(MP, extruded(sg, 1.0), SAND, 0, PH + 0.1, -0.8);
    lb(MP, 14, 0.5, 1.3, TRIMC, 0, PH + 0.3, -0.3);
    const ov = new THREE.CircleGeometry(1.1, 10); ov.scale(1, 0.75, 1); place(MP, ov, WIN, 0, PH + 2.0, 0.22);
    // Corner quoins as light bands.
    for (const x of [-PL / 2 + 0.3, PL / 2 - 0.3]) lb(MP, 0.7, PH - 6, 0.5, TRIMC, x, 6 + (PH - 6) / 2, 0.1);
  }

  // --- Reichenspergerplatz: lawn in front with a few trees at the sides.
  add(new THREE.BoxGeometry(70, 0.2, 12), LAWN, T(0, 0.1, 17));
  for (const x of [-32, -24, 24, 32]) for (const z of [13, 21]) {
    add(new THREE.BoxGeometry(0.6, 4, 0.6), TRUNK, T(x, 2, z));
    const crown = new THREE.IcosahedronGeometry(3, 0); crown.scale(1, 0.9, 1); add(crown, LEAF, T(x, 6, z));
  }
  flush();
});

// Staatenhaus am Rheinpark (Adolf Abel, PRESSA 1928; interim stage of the Cologne Opera):
// a long, low, flat-roofed brick hall bent in an arc around the Tanzbrunnen. On the inner
// (concave) side a colonnade of square brick pillars runs in front of the hall; in the middle a
// taller gate block with one big open round arch splits the colonnade in two. Concave side faces +z.
World.registerLandmark('staatenhaus', 'Staatenhaus am Rheinpark', 'https://de.wikipedia.org/wiki/Staatenhaus_am_Rheinpark', (g, o, k) => {
  const BRICK = 0x8e5040, BRICK2 = 0x7a4436, TRIMC = 0xd9cfbd, WIN = 0x2d3640, SHADE = 0x5e3a30;
  const LAWN = 0x6d8f4e, LEAF = 0x5a7b43, TRUNK = 0x5d4a3a, PAVE = 0xb3ab9c;
  const batches = new Map();
  const T = (x, y, z, ry) => new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x || 0, y || 0, z || 0);
  function add(geo, color, M) {
    if (M) geo.applyMatrix4(M);
    const gg = geo.index ? geo.toNonIndexed() : geo;
    if (!gg.attributes.normal) gg.computeVertexNormals();
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(gg);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o3 = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, o3); nor.set(geo.attributes.normal.array, o3); o3 += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const lb = (M, w, h, d, c, x, y, z) => { const geo = new THREE.BoxGeometry(w, h, d); geo.translate(x, y, z); add(geo, c, M); };

  // Arc around the Tanzbrunnen: centre of curvature in front (+z). Local frame of each
  // segment: origin on the colonnade's inner edge, +z toward the centre, -z outward.
  const RIN = 58, COL = 5, HALL = 14, H = 12, CH = 6.6, SPAN = 45 * Math.PI / 180, GATE = 7.5 * Math.PI / 180;
  const N = 6, da = (SPAN - GATE) / N;
  const frame = (a) => T(RIN * Math.sin(a), 0, RIN - RIN * Math.cos(a), -a);
  const chord = (r) => 2 * r * Math.sin(da / 2) + 0.3;
  for (const side of [-1, 1]) for (let i = 0; i < N; i++) {
    const a = side * (GATE + da * (i + 0.5)), M = frame(a);
    const Lc = chord(RIN + COL / 2), Lh = chord(RIN + COL + HALL);
    // Hall body with light cornice and a dark plinth.
    lb(M, Lh, H, HALL, BRICK, 0, H / 2, -COL - HALL / 2);
    lb(M, Lh + 0.1, 0.5, HALL - 0.4, 0x6b6760, 0, H + 0.1, -COL - HALL / 2);
    for (const z of [-COL + 0.1, -COL - HALL - 0.1]) lb(M, Lh + 0.2, 0.9, 0.8, TRIMC, 0, H + 0.1, z);
    lb(M, Lh + 0.1, 1.0, 0.3, BRICK2, 0, 0.5, -COL - HALL - 0.1);
    // Colonnade: roof slab on square pillars, with doors and high windows behind.
    lb(M, Lc, 0.8, COL + 0.4, TRIMC, 0, CH + 0.4, -COL / 2);
    for (const x of [-Lc / 4, Lc / 4]) lb(M, 1.0, CH, 1.0, BRICK, x, CH / 2, -0.7);
    lb(M, Lc, 0.12, COL - 0.2, SHADE, 0, 0.06, -COL / 2 - 0.1);
    lb(M, 2.6, 4.2, 0.12, WIN, 0, 2.1, -COL + 0.06);
    for (const x of [-Lc / 4, Lc / 4]) lb(M, 1.8, 3.0, 0.12, WIN, x, CH + 2.6, -COL + 0.06);
    // Outer (back) side: a strict row of tall narrow windows.
    for (const x of [-Lh / 3, 0, Lh / 3]) {
      lb(M, 1.7, 6.6, 0.12, WIN, x, 5.2, -COL - HALL - 0.07);
      lb(M, 2.3, 0.35, 0.3, TRIMC, x, 1.7, -COL - HALL - 0.1);
    }
  }
  // End walls of the two wings: windows on the last segment's actual end face.
  for (const side of [-1, 1]) {
    const M = frame(side * (GATE + da * (N - 0.5))), xe = side * (chord(RIN + COL + HALL) / 2 + 0.07);
    for (const z of [-COL - 3.5, -COL - 7, -COL - 10.5]) {
      lb(M, 0.12, 6.6, 1.7, WIN, xe, 5.2, z);
      lb(M, 0.3, 0.35, 2.3, TRIMC, xe + side * 0.1, 1.7, z);
    }
    lb(M, 0.3, 1.0, HALL, BRICK2, xe + side * 0.1, 0.5, -COL - HALL / 2);
  }

  // Central gate block: taller, with one big open round arch straight through.
  const GW = 2 * RIN * Math.sin(GATE) + 2, GH = 19, GD = COL + HALL + 1.6;
  const s = new THREE.Shape();
  s.moveTo(-GW / 2, 0); s.lineTo(GW / 2, 0); s.lineTo(GW / 2, GH); s.lineTo(-GW / 2, GH); s.closePath();
  const hole = new THREE.Path(), hw = 4.8, hh = 13;
  hole.moveTo(-hw, 0); hole.lineTo(-hw, hh - hw); hole.absarc(0, hh - hw, hw, Math.PI, 0, true); hole.lineTo(hw, 0); hole.closePath();
  s.holes.push(hole);
  const gate = new THREE.ExtrudeGeometry(s, { depth: GD, bevelEnabled: false, steps: 1, curveSegments: 10 });
  gate.translate(0, 0, -GD + 0.8);
  add(gate, BRICK, null);
  lb(null, GW - 0.4, 0.5, GD - 0.8, 0x6b6760, 0, GH + 0.1, -GD / 2 + 0.8);
  for (const z of [0.8, -GD + 0.8]) lb(null, GW + 0.8, 1.0, 0.9, TRIMC, 0, GH + 0.2, z);
  for (const x of [-GW / 2, GW / 2]) lb(null, 0.9, 1.0, GD + 0.8, TRIMC, x, GH + 0.2, -GD / 2 + 0.8);
  // Stone arch surround and slim flanking windows.
  for (const x of [-hw - 0.5, hw + 0.5]) lb(null, 1.0, hh - hw, 0.3, TRIMC, x, (hh - hw) / 2, 0.9);
  for (const x of [-GW / 2 + 2.2, GW / 2 - 2.2]) for (const z of [0.86, -GD + 0.74]) lb(null, 1.3, 8, 0.12, WIN, x, 6, z);
  // Name band above the arch (the Opera's lettering sits here today).
  lb(null, GW - 3, 2.6, 0.3, 0x8e2a2a, 0, 15.6, 0.95);
  k.sign(g, 'STAATENHAUS', GW - 4.5, 0, 15.6, 1.15, '#8e2a2a');

  // Forecourt toward the Tanzbrunnen: paving under the arch, lawn and a few trees.
  lb(null, 12, 0.1, GD + 12, PAVE, 0, 0.05, -GD / 2 + 6);
  for (const side of [-1, 1]) {
    lb(null, 22, 0.2, 9, LAWN, side * 19, 0.1, 15);
    for (const x of [12, 27]) {
      lb(null, 0.6, 4, 0.6, TRUNK, side * x, 2, 18);
      const c = new THREE.IcosahedronGeometry(2.8, 0); c.scale(1, 0.9, 1); add(c, LEAF, T(side * x, 5.8, 18));
    }
  }
  flush();
});

// Hochbunker Körnerstraße 101, Ehrenfeld: the 1943 air-raid bunker on the site of the Ehrenfeld
// synagogue (destroyed 1938). A long, heavy block of bare grey concrete with weather streaks, rows of
// small deep-set slits, a steel door in a massive frame, a memorial plaque, an art banner, and a steep
// red-brown pan-tile hip roof. Long side faces the street (+z).
World.registerLandmark('hochbunker', 'Bunker Körnerstroß', 'https://de.wikipedia.org/wiki/Hochbunker_K%C3%B6rnerstra%C3%9Fe_(K%C3%B6ln)', (g, o, k) => {
  const CONC = 0x8e8c86, STREAK = 0x6e6c68, PALE = 0x9c9a93, TILE = 0x7e3526, TILE2 = 0x652a1c, HOLE = 0x26282b,
    STEEL = 0x3a3a3a, BRONZE = 0x8c6a2c;
  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, off); nor.set(geo.attributes.normal.array, off); off += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);

  const W = 40, D = 13, H = 12, RH = 6.5, OV = 0.6;
  // The concrete body with a slightly paler plinth and a thick eaves band.
  bx(W, H, D, CONC, 0, H / 2, 0);
  bx(W + 0.3, 1.2, D + 0.3, PALE, 0, 0.6, 0);
  bx(W + 0.5, 0.7, D + 0.5, PALE, 0, H - 0.35, 0);
  // Weather streaks running down from the eaves.
  const streaks = [-18.2, -15.1, -11.6, -7.3, -3.9, 4.8, 8.6, 12.9, 16.4, 18.6];
  streaks.forEach((x, i) => {
    const h = 3 + ((i * 37) % 5) * 1.1;
    bx(0.5 + (i % 3) * 0.3, h, 0.06, STREAK, x, H - 0.7 - h / 2, D / 2 + 0.03);
    bx(0.5 + ((i + 1) % 3) * 0.3, h + 0.8, 0.06, STREAK, -x * 0.93, H - 0.7 - (h + 0.8) / 2, -D / 2 - 0.03);
  });
  for (const s of [1, -1]) for (const [z, h] of [[-2.2, 5], [2.2, 7], [5.6, 3.5]]) bx(0.06, h, 0.6, STREAK, s * (W / 2 + 0.03), H - 0.7 - h / 2, z * s);

  // Hip roof: eaves rectangle up to a short ridge along x.
  {
    const ex = W / 2 + OV, ez = D / 2 + OV, rx = ex - ez * 1.05, y0 = H, y1 = H + RH;
    const p = [
      // front slope
      [-ex, y0, ez], [ex, y0, ez], [rx, y1, 0], [-ex, y0, ez], [rx, y1, 0], [-rx, y1, 0],
      // back slope
      [ex, y0, -ez], [-ex, y0, -ez], [-rx, y1, 0], [ex, y0, -ez], [-rx, y1, 0], [rx, y1, 0],
      // hips
      [ex, y0, ez], [ex, y0, -ez], [rx, y1, 0],
      [-ex, y0, -ez], [-ex, y0, ez], [-rx, y1, 0],
      // underside
      [-ex, y0, ez], [ex, y0, -ez], [ex, y0, ez], [-ex, y0, ez], [-ex, y0, -ez], [ex, y0, -ez],
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.flat()), 3));
    geo.computeVertexNormals();
    add(geo, TILE, 0, 0, 0, 0);
    // Tile courses: darker horizontal lines on the long slopes.
    for (let i = 1; i <= 4; i++) {
      const t = i / 5, y = y0 + RH * t + 0.04, zz = ez * (1 - t) + 0.05, hw = ex - (ex - rx) * t;
      for (const s of [1, -1]) {
        const strip = new THREE.BoxGeometry(hw * 2, 0.14, 0.16);
        strip.applyMatrix4(new THREE.Matrix4().makeRotationX(s * -Math.atan2(RH, ez)));
        add(strip, TILE2, 0, y, s * zz, 0);
      }
    }
    bx(rx * 2 + 0.3, 0.35, 0.4, TILE2, 0, y1 + 0.05, 0); // ridge tiles
  }

  // Three rows of small window slits, deep-set: dark hole with a thick concrete reveal around it.
  function slit(x, y, z, ry) {
    bx(0.6, 1.1, 0.1, HOLE, x, y, z, ry);
    const n = ry ? 0 : 1, s = z < 0 && !ry ? -1 : 1;
    // reveal lips (top and sill) projecting a little to suggest the 1.1 m wall
    if (!ry) { bx(1.1, 0.18, 0.35, PALE, x, y + 0.76, z + s * 0.12); bx(1.1, 0.18, 0.45, PALE, x, y - 0.76, z + s * 0.17); }
    else { bx(0.35, 0.18, 1.1, PALE, x + (x > 0 ? 0.12 : -0.12), y + 0.76, z); bx(0.45, 0.18, 1.1, PALE, x + (x > 0 ? 0.17 : -0.17), y - 0.76, z); }
    return n;
  }
  // Few, widely spaced openings: the wall reads as mass, not as a house front.
  const rows = [3.6, 6.9, 9.9];
  for (const y of rows) {
    for (const x of [-15.5, -10.5, 5.5, 10.5, 15.5]) {
      slit(x, y, D / 2 + 0.03, 0);
      slit(-x, y, -D / 2 - 0.03, 0);
    }
    if (y > 5) slit(-3.5, y, D / 2 + 0.03, 0);
    slit(0, y, -D / 2 - 0.03, 0);
    for (const z of [-4, 4]) { slit(W / 2 + 0.03, y, z, Math.PI / 2); slit(-W / 2 - 0.03, y, z, Math.PI / 2); }
  }
  // Shuttering joints: faint horizontal pour lines in the bare concrete, and a dark splash zone.
  for (const y of [2.9, 5.3, 8.3, 10.9]) for (const s of [1, -1]) bx(W + 0.02, 0.1, 0.05, STREAK, 0, y, s * (D / 2 + 0.02));
  bx(W + 0.34, 0.5, D + 0.34, 0x74726c, 0, 0.25, 0);

  // Heavy steel door in a deep concrete portal at the centre of the street side.
  // Portal built from two thick jambs and a lintel so the door sits deep in the concrete (1.1 m walls).
  for (const sx of [-1, 1]) bx(1.05, 3.9, 1.3, PALE, sx * 1.575, 1.95, D / 2 + 0.6);
  bx(2.1, 1.3, 1.3, PALE, 0, 3.25, D / 2 + 0.6);
  bx(2.1, 2.6, 0.2, STEEL, 0, 1.3, D / 2 + 0.1);
  for (const y of [0.6, 1.3, 2.0]) bx(2.1, 0.08, 0.1, 0x55575a, 0, y, D / 2 + 0.25);
  bx(0.12, 0.3, 0.12, 0x9a9a9a, 0.7, 1.3, D / 2 + 0.26);
  bx(4.8, 0.45, 1.8, CONC, 0, 4.1, D / 2 + 0.75); // canopy slab
  // Bronze memorial plaque beside the door (synagogue remembrance) and a small stone below it.
  bx(1.3, 1.0, 0.1, BRONZE, 3.4, 1.9, D / 2 + 0.05);
  bx(1.1, 0.1, 0.12, 0xc9a24a, 3.4, 2.15, D / 2 + 0.1);
  bx(1.1, 0.1, 0.12, 0xc9a24a, 3.4, 1.8, D / 2 + 0.1);
  bx(1.8, 0.6, 0.8, 0x777570, 3.4, 0.3, D / 2 + 0.5);

  // A vertical art banner on the facade (the bunker is an art space today).
  const BAN = [0xe8412c, 0xf2c230, 0x2d8bd6, 0xe86ab0, 0x3fb56a];
  BAN.forEach((c, i) => bx(2.2, 1.35, 0.1, c, -8.5, H - 1.8 - i * 1.35, D / 2 + 0.12));
  bx(2.8, 0.18, 0.25, STEEL, -8.5, H - 1.0, D / 2 + 0.15);
  // A second banner round the corner so it reads from the other direction too.
  [0x2d8bd6, 0xf2c230, 0xe8412c, 0xffffff].forEach((c, i) => bx(0.1, 1.4, 2, c, W / 2 + 0.12, H - 2 - i * 1.4, 0));

  flush();
  k.sign(g, 'BUNKER K101', 6.5, 8.5, 5.2, D / 2 + 0.12, '#4a4a4a');
});

// Herkules-Hochhaus, Neuehrenfeld (Herkulesstraße / Innere Kanalstraße): the 102 m, 31-storey
// residential slab by Peter Neufert, clad since its renovation in blue, orange, red and lilac enamelled
// panels with silver three-part windows set in a free rhythm - the "Papageienhaus". A slim slab on a
// dark plinth with a flat entrance canopy and a grey plant room on the flat roof. Long side faces +z.
World.registerLandmark('herkuleshochhaus', 'Papageiehuus (Herkules-Hochhaus)', 'https://en.wikipedia.org/wiki/Herkules_Hochhaus', (g, o, k) => {
  const BLUE = 0x2f5fa8, ORANGE = 0xf08a24, RED = 0xc8322c, LILAC = 0x9a7cc0, SILVER = 0xc8ccd2, GLASS = 0x2a3440,
    PLINTH = 0x4a4a50, ROOFC = 0x8a8c90, EDGE = 0xb4b8be, CORE = 0x6c6e73;
  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, off); nor.set(geo.attributes.normal.array, off); off += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);
  const pl = (w, h, c, x, y, z, ry) => add(new THREE.PlaneGeometry(w, h), c, x, y, z, ry);
  let seed = 1969;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const W = 34, D = 13, PH = 5, FL = 31, SH = 2.55, TOP = PH + FL * SH; // ~84 m to the roof slab
  // Core volume (seen only at the corners), plinth storey, roof slab.
  bx(W - 0.2, TOP - PH, D - 0.2, CORE, 0, PH + (TOP - PH) / 2, 0);
  bx(W - 1.6, PH, D - 1.6, PLINTH, 0, PH / 2, 0);
  bx(W + 0.4, 0.8, D + 0.4, 0x6a6c70, 0, TOP + 0.4, 0);
  for (const s of [1, -1]) { bx(W + 0.5, 0.5, 0.5, EDGE, 0, TOP + 0.65, s * (D / 2)); bx(0.5, 0.5, D + 0.5, EDGE, s * (W / 2), TOP + 0.65, 0); }
  // Slim silver corner edges running up the slab.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.5, TOP - PH, 0.5, EDGE, sx * W / 2, PH + (TOP - PH) / 2, sz * D / 2);

  // Facade mosaic: each face is a grid (cells x storeys). Colours come in large free blocks
  // (a few cells wide, a few storeys high), windows are silver three-part strips in an irregular rhythm.
  const PAL = [BLUE, ORANGE, RED, LILAC];
  function facade(len, cols, px, pz, ry, nx, nz) {
    const cw = len / cols;
    // Assign colour blocks.
    const grid = [];
    for (let r = 0; r < FL; r++) grid.push(new Array(cols).fill(-1));
    for (let r = 0; r < FL; r++) for (let c = 0; c < cols; c++) {
      if (grid[r][c] >= 0) continue;
      const bw = 2 + Math.floor(rnd() * 3), bh = 3 + Math.floor(rnd() * 5);
      // The triad blue / orange / violet dominates; red is only an occasional accent.
      let col = rnd() < 0.12 ? 2 : [0, 1, 3][Math.floor(rnd() * 3)];
      const left = c > 0 ? grid[r][c - 1] : -1, below = r > 0 ? grid[r - 1][c] : -1;
      if (col === left || col === below) col = [0, 1, 3, 2].find((q) => q !== left && q !== below);
      for (let rr = r; rr < Math.min(FL, r + bh); rr++) for (let cc = c; cc < Math.min(cols, c + bw); cc++) if (grid[rr][cc] < 0) grid[rr][cc] = col;
    }
    // Local frame: u along the face, the face plane offset slightly outward.
    const put = (u, y, w, h, color, out) => {
      const x = px + Math.cos(ry) * u + nx * out, z = pz - Math.sin(ry) * u + nz * out;
      pl(w, h, color, x, y, z, ry);
    };
    for (let r = 0; r < FL; r++) {
      const y = PH + r * SH + SH / 2;
      // merge horizontal runs of equal colour into one panel
      let c0 = 0;
      for (let c = 1; c <= cols; c++) {
        if (c === cols || grid[r][c] !== grid[r][c0]) {
          const n = c - c0, u = -len / 2 + (c0 + n / 2) * cw;
          put(u, y, n * cw, SH, PAL[grid[r][c0]], 0.02);
          c0 = c;
        }
      }
      // windows: roughly two out of three cells, shifted within the cell, three variants
      for (let c = 0; c < cols; c++) {
        if (rnd() < 0.3) continue;
        const kind = Math.floor(rnd() * 3);
        const ww = kind === 0 ? cw * 0.8 : kind === 1 ? cw * 0.55 : cw * 0.95, wh = kind === 2 ? SH * 0.45 : SH * 0.62;
        const u = -len / 2 + c * cw + cw / 2 + (rnd() - 0.5) * (cw - ww) * 0.9;
        const wy = y - SH * 0.08 + (kind === 2 ? SH * 0.1 : 0);
        put(u, wy, ww + 0.18, wh + 0.18, SILVER, 0.05);
        put(u, wy, ww - 0.1, wh - 0.1, GLASS, 0.08);
        for (const f of [-1 / 6, 1 / 6]) put(u + f * ww, wy, 0.1, wh - 0.1, SILVER, 0.1);
      }
      // thin silver floor line every storey
      put(0, PH + r * SH, len, 0.1, SILVER, 0.04);
    }
  }
  facade(W, 12, 0, D / 2, 0, 0, 1);
  facade(W, 12, 0, -D / 2, Math.PI, 0, -1);
  facade(D, 5, W / 2, 0, Math.PI / 2, 1, 0);
  facade(D, 5, -W / 2, 0, -Math.PI / 2, -1, 0);

  // Plinth: glazed lobby, flat entrance canopy on slim posts, a few steps.
  pl(10, 3.4, GLASS, 0, 1.9, D / 2 - 0.78, 0);
  for (let x = -5; x <= 5; x += 2.5) bx(0.15, 3.4, 0.15, SILVER, x, 1.9, D / 2 - 0.72);
  bx(14, 0.45, 5, EDGE, 0, 4.1, D / 2 + 1.6);
  for (const x of [-6.5, 6.5]) bx(0.3, 3.9, 0.3, SILVER, x, 1.95, D / 2 + 3.7);
  for (let i = 0; i < 3; i++) bx(8, 0.18, 1.2 - i * 0.35, 0x9a9a9a, 0, 0.09 + i * 0.18, D / 2 + 3.9 - i * 0.2);
  for (const sx of [-1, 1]) pl(8, 2.6, GLASS, sx * 12, 2.2, D / 2 - 0.78, 0);
  pl(24, 2.6, GLASS, 0, 2.2, -D / 2 + 0.78, Math.PI);

  // Roof: set-back plant room, lift overrun and a railing edge.
  bx(12, 4, 8, ROOFC, 0, TOP + 0.8 + 2, 0);
  bx(4, 2.2, 3, CORE, -3, TOP + 4.8 + 1.1, 0);
  bx(12.4, 0.35, 8.4, EDGE, 0, TOP + 4.95, 0);
  for (const s of [1, -1]) bx(W, 0.9, 0.12, EDGE, 0, TOP + 1.25, s * (D / 2 + 0.1));
  bx(1.4, 5, 1.4, CORE, 13, TOP + 0.8 + 2.5, -3);
  flush();
});

// Herkulesberg ("Mont Klamott"), Innerer Grüngürtel by the Innere Kanalstraße: Cologne's largest rubble
// hill, heaped from the ruins of the war and grassed over. A broad elliptical green mound in three soft
// tiers with a flat top, clumps of trees on the flanks (denser towards the road, +z), a pale gravel path
// winding up to the summit with a few benches, and here and there a broken brick poking out of the grass.
World.registerLandmark('herkulesberg', 'Herkulesberg (Mont Klamott)', 'https://de.wikipedia.org/wiki/Herkulesberg', (g, o, k) => {
  const G1 = 0x5f8a3c, G2 = 0x6f9a48, G3 = 0x7eaa52, CROWN = 0x2f5a2a, CROWN2 = 0x3d6b30, TRUNK = 0x5a3f28,
    PATH = 0xcfc3a4, WOOD = 0x8a5a32, IRON = 0x3a3a3a, RUBBLE = 0x9a5040, CONC = 0x8e8c86;
  const batches = new Map();
  function addM(geo, color, m) {
    geo.applyMatrix4(m);
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  const add = (geo, color, x, y, z, ry) => addM(geo, color, new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, off); nor.set(geo.attributes.normal.array, off); off += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);
  let seed = 1945;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // The mound: radius profile along x (z is squeezed to 0.75 for the 120 x 90 m ellipse).
  const SZ = 0.75;
  const prof = [[60, 0], [52, 2.5], [44, 7], [35, 11.5], [26, 16], [17, 20.2], [10, 22]];
  const tier = (i) => (i < 2 ? G1 : i < 4 ? G2 : G3);
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
    const geo = new THREE.CylinderGeometry(r1, r0, y1 - y0, 28, 1, true);
    geo.scale(1, 1, SZ);
    add(geo, tier(i), 0, (y0 + y1) / 2, 0, 0);
  }
  { const top = new THREE.CircleGeometry(10, 28); top.rotateX(-Math.PI / 2); top.scale(1, 1, SZ); add(top, G3, 0, 22, 0, 0); }
  // Height of the ground at elliptical radius r (x units).
  function hAt(r) {
    if (r <= 10) return 22;
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i + 1], [r1, y1] = prof[i];
      if (r >= r0 && r <= r1) return y0 + (y1 - y0) * (r - r0) / (r1 - r0);
    }
    return 0;
  }
  const at = (a, r) => [Math.sin(a) * r, Math.cos(a) * r * SZ];

  // Path centreline (used to keep trees off the path).
  const pathPts = [];
  for (let i = 0; i <= 96; i++) { const t = i / 96; pathPts.push(at(0.15 - t * 3.6, 59 - t * 53)); }
  const onPath = (x, z) => pathPts.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 3.2 * 3.2);
  // Trees in clumps on the lower and middle flanks, more on the road side (+z).
  const clumps = [[0.35, 46], [-0.45, 44], [0.9, 40], [-1.1, 48], [1.7, 42], [-1.9, 38], [2.6, 46], [-2.7, 43], [3.1, 36], [0.05, 30], [-0.8, 28], [1.3, 31],
    [2.2, 26], [-2.3, 27], [-1.5, 22], [2.9, 24], [0.75, 22], [-3.5, 50], [4.0, 30]];
  for (const [ca, cr] of clumps) {
    const front = Math.cos(ca) > 0.3;
    const n = front ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = ca + (rnd() - 0.5) * 0.28, r = cr + (rnd() - 0.5) * 7;
      const [x, z] = at(a, r), y = hAt(r) - 0.4;
      if (onPath(x, z) || r < 12) { rnd(); rnd(); rnd(); rnd(); continue; }
      const s = 7 + rnd() * 2.5, th = 3.5 + rnd() * 1.5;
      add(new THREE.CylinderGeometry(0.35, 0.5, th + 1, 5), TRUNK, x, y + (th + 1) / 2, z, 0);
      const crown = new THREE.IcosahedronGeometry(s / 2, 1);
      crown.scale(1, 0.9, 1);
      add(crown, rnd() < 0.5 ? CROWN : CROWN2, x, y + th + s * 0.4, z, rnd() * 3);
    }
  }

  // Gravel path: winds up from the road side foot of the hill to the summit. Built as a ribbon draped on
  // the slope (inner and outer edge each follow the ground), so it neither floats nor sinks into the grass.
  {
    const STEPS = 48, HW = 1.2, pos = [];
    const edge = (t, side) => {
      const a = 0.15 - t * 3.6, r = 59 - t * 53 + side * HW;
      const [x, z] = at(a, r);
      return [x, hAt(r) + 0.12, z];
    };
    for (let i = 0; i < STEPS; i++) {
      const t0 = i / STEPS, t1 = (i + 1) / STEPS;
      const a0 = edge(t0, -1), b0 = edge(t0, 1), a1 = edge(t1, -1), b1 = edge(t1, 1);
      pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.computeVertexNormals();
    // make sure the faces point up whatever the winding: flip every triangle if the first points down
    if (geo.attributes.normal.getY(0) < 0) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i += 3) { const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, x, y, z); }
    }
    geo.computeVertexNormals();
    addM(geo, PATH, new THREE.Matrix4());
  }
  // Summit: gravel circle and three benches looking out over the city.
  { const c = new THREE.CircleGeometry(6.2, 16); c.rotateX(-Math.PI / 2); c.scale(1, 1, SZ); add(c, PATH, 0, 22.06, 0, 0); }
  for (const a of [0.2, 2.3, 4.3]) {
    const x = Math.sin(a) * 6.8, z = Math.cos(a) * 6.8 * SZ;
    bx(2.4, 0.15, 0.6, WOOD, x, 22.55, z, a);
    bx(2.4, 0.55, 0.12, WOOD, x - Math.sin(a) * 0.35, 22.95, z - Math.cos(a) * 0.35, a);
    for (const s of [-1, 1]) bx(0.12, 0.5, 0.6, IRON, x + Math.cos(a) * s * 1.05, 22.25, z - Math.sin(a) * s * 1.05, a);
  }
  // A lamp post at the summit and a little rubble ("Klamotten") peeking out of the grass by the path.
  add(new THREE.CylinderGeometry(0.1, 0.12, 4, 5), IRON, -3.5, 24, -1.5, 0);
  bx(0.7, 0.35, 0.7, 0xf2e2a0, -3.5, 26.1, -1.5, 0);
  for (let i = 0; i < 9; i++) {
    const a = 0.1 - i * 0.4 + (rnd() - 0.5) * 0.2, r = 52 - i * 3.2 + (rnd() - 0.5) * 3;
    const [x, z] = at(a + 0.25, r);
    const geo = new THREE.BoxGeometry(1.2 + rnd(), 0.6, 0.8 + rnd() * 0.5);
    geo.rotateZ(rnd() * 0.6 - 0.3); geo.rotateX(rnd() * 0.5 - 0.25);
    add(geo, i % 3 === 0 ? CONC : RUBBLE, x, hAt(r) + 0.1, z, rnd() * 3);
  }
  // A small park sign on two posts at the foot of the path.
  for (const x of [8.5, 15.5]) bx(0.2, 2.6, 0.2, IRON, x, 1.3, 46.6, 0);
  flush();
  k.sign(g, 'HERKULESBERG', 7.6, 12, 2.1, 46.75, '#4f6a3a');
});

// Jan-von-Werth-Brunnen, Alter Markt (Wilhelm Albermann, 1884): a neo-Gothic fountain on a
// stepped octagonal base. Front/back and side basins, a slim square pedestal with pointed-arch
// panels and a gabled cap, Jan and Griet at its foot, and on top the Reitergeneral in
// 17th-century armour with his broad plumed hat, hand on the sword. Front faces +z.
World.registerLandmark('janvonwerth', 'Jan-von-Werth-Brunnen', 'https://de.wikipedia.org/wiki/Jan-von-Werth-Brunnen', (g, o, k) => {
  const STEP = 0xc9bb9e, STEP2 = 0xb9ab8e, SAND = 0xab9272, SAND2 = 0xc4ab88, PANEL = 0x30434a;
  const BRONZE = 0x4a5a4a, BRONZE2 = 0x3a4a3e, WATER = 0x3f7fc0, RIM = 0xd4c8ad, PLUME = 0xe8e2d0;
  const oct = (r, h, color, y) => { const m = k.cyl(g, r, r, h, color, 0, y, 0, 8); m.rotation.y = Math.PI / 8; return m; };

  // Three-step octagonal plinth, about 7.6 m across.
  oct(3.9, 0.3, STEP2, 0.15); oct(3.55, 0.3, STEP, 0.45); oct(3.2, 0.3, STEP2, 0.75);

  // Basins: large ones front and back, small ones left and right, stone rim with water inside.
  function basin(w, d, x, z) {
    k.box(g, w, 0.7, d, RIM, x, 0.9 + 0.35, z);
    k.box(g, w - 0.3, 0.04, d - 0.3, WATER, x, 1.62, z);
    for (const sz of [-1, 1]) k.box(g, w + 0.16, 0.2, 0.2, SAND2, x, 1.68, z + sz * (d / 2));
    for (const sx of [-1, 1]) k.box(g, 0.2, 0.2, d, SAND2, x + sx * (w / 2), 1.68, z);
  }
  basin(2.6, 1.6, 0, 2.05); basin(2.6, 1.6, 0, -2.05);
  basin(1.4, 1.8, 2.05, 0); basin(1.4, 1.8, -2.05, 0);
  // Spouts from the pedestal into the big basins, and a thin jet of water.
  for (const s of [1, -1]) {
    k.box(g, 0.2, 0.2, 0.6, BRONZE, 0, 2.9, s * 1.2);
    k.box(g, 0.12, 1.0, 0.12, 0x9cc8ee, 0, 2.3, s * 1.55);
  }

  // Pedestal: base block, shaft with pointed-arch panels, cornice and small gables.
  const PB = 0.9, SH = 6.2;
  k.box(g, 2.3, 1.2, 2.3, SAND, 0, PB + 0.6, 0);
  k.box(g, 2.5, 0.25, 2.5, SAND2, 0, PB + 1.25, 0);
  k.box(g, 1.8, SH - 1.4, 1.8, SAND, 0, PB + 1.4 + (SH - 1.4) / 2, 0);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, sx = Math.sin(a), sz = Math.cos(a);
    k.pointed(g, 1.2, 2.6, sx * 0.91, PB + 2.2, sz * 0.91, PANEL, a);
    k.pointed(g, 1.0, 1.3, sx * 0.91, PB + 5.0, sz * 0.91, PANEL, a);
    // gable over each face
    const gb = k.roof(g, 1.9, 0.9, 0.3, SAND2, sx * 0.85, PB + SH, sz * 0.85);
    gb.rotation.y = a;
  }
  // corner pinnacles
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.box(g, 0.3, SH - 1.4, 0.3, SAND2, sx * 0.9, PB + 1.4 + (SH - 1.4) / 2, sz * 0.9);
    const p = k.cone(g, 0.24, 1.1, SAND2, sx * 0.9, PB + SH + 0.55, sz * 0.9, 4); p.rotation.y = Math.PI / 4;
  }
  k.box(g, 2.1, 0.3, 2.1, SAND2, 0, PB + SH - 0.15, 0);
  k.box(g, 1.3, 0.4, 1.3, SAND2, 0, PB + SH + 0.2, 0);
  // statue plinth above the gables and pinnacles, so the general is seen head to boots
  k.box(g, 1.0, 0.8, 1.0, SAND, 0, PB + SH + 0.8, 0);
  k.box(g, 1.2, 0.15, 1.2, SAND2, 0, PB + SH + 1.27, 0);
  const TOPY = PB + SH + 1.35;

  // A simple figure: legs, torso, arms, head. Returns nothing; parts go straight into g.
  function figure(x, z, ry, s, color, kind) {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    const b = (w, h, d, c, px, py, pz) => k.box(f, w * s, h * s, d * s, c, px * s, py * s, pz * s);
    if (kind === 'griet') {
      k.cyl(f, 0.22 * s, 0.42 * s, 0.95 * s, color, 0, 0.48 * s, 0, 8); // skirt
      b(0.44, 0.55, 0.28, color, 0, 1.22, 0);
      b(0.13, 0.5, 0.13, color, -0.28, 1.2, 0.05); b(0.13, 0.5, 0.13, color, 0.28, 1.2, 0.05);
      b(0.5, 0.25, 0.35, BRONZE2, 0.38, 1.0, 0.2); // basket of fruit
    } else {
      b(0.16, 0.9, 0.18, color, -0.12, 0.45, 0); b(0.16, 0.9, 0.18, color, 0.12, 0.45, 0);
      b(0.46, 0.65, 0.28, color, 0, 1.22, 0);
      b(0.13, 0.55, 0.13, color, -0.3, 1.2, 0.02); b(0.13, 0.55, 0.13, color, 0.3, 1.2, 0.02);
    }
    k.part(f, new THREE.SphereGeometry(0.15 * s, 8, 6), color, 0, 1.72 * s, 0);
    return f;
  }
  // Jan (as a young farmhand) and Griet at the front corners of the pedestal, on small plinths.
  for (const [x, ry, kind] of [[-1.72, -0.6, 'jan'], [1.72, 0.6, 'griet']]) {
    k.box(g, 0.8, 0.35, 0.8, SAND2, x, 0.9 + 0.175, 1.25);
    figure(x, 1.25, ry, 1.0, BRONZE, kind).position.y = 1.25;
  }

  // The general on top: 2.8 m, tall cavalry boots, cuirass, sash, cape, broad plumed hat, sword.
  const G = new THREE.Group(); G.position.set(0, TOPY, 0); g.add(G);
  const s = 1.15, gb2 = (w, h, d, c, x, y, z) => k.box(G, w * s, h * s, d * s, c, x * s, y * s, z * s);
  gb2(0.26, 0.9, 0.3, BRONZE2, -0.17, 0.45, 0.02); gb2(0.26, 0.9, 0.3, BRONZE2, 0.2, 0.45, 0.05); // boots (flared)
  gb2(0.34, 0.2, 0.36, BRONZE2, -0.17, 0.85, 0.02); gb2(0.34, 0.2, 0.36, BRONZE2, 0.2, 0.85, 0.05);
  gb2(0.2, 0.3, 0.22, BRONZE, -0.15, 1.1, 0); gb2(0.2, 0.3, 0.22, BRONZE, 0.17, 1.1, 0);
  gb2(0.62, 0.72, 0.38, BRONZE, 0, 1.6, 0); // cuirass
  gb2(0.7, 0.1, 0.42, BRONZE2, 0, 1.3, 0); // sash
  gb2(0.8, 1.2, 0.08, BRONZE2, 0, 1.45, -0.24); // cape
  gb2(0.66, 0.14, 0.44, BRONZE, 0, 2.0, 0); // collar
  gb2(0.16, 0.62, 0.16, BRONZE, -0.4, 1.62, 0.12); // left arm, down to the sword hilt
  const ra = gb2(0.16, 0.66, 0.16, BRONZE, 0.42, 1.72, 0.05); ra.rotation.z = 0.35; // right arm on the hip / baton
  gb2(0.08, 1.2, 0.06, 0x2a322c, -0.46, 0.95, 0.18).rotation.z = -0.25; // sword
  gb2(0.26, 0.05, 0.05, 0x2a322c, -0.4, 1.45, 0.18);
  k.part(G, new THREE.SphereGeometry(0.19 * s, 8, 6), BRONZE, 0, 2.28 * s, 0.02 * s); // head
  gb2(0.18, 0.18, 0.1, BRONZE2, 0, 2.12, 0.14); // beard
  const brim = k.cyl(G, 0.5 * s, 0.5 * s, 0.07 * s, BRONZE2, 0, 2.45 * s, 0, 12); brim.rotation.x = -0.18; brim.rotation.z = 0.12;
  k.cyl(G, 0.2 * s, 0.24 * s, 0.25 * s, BRONZE2, 0, 2.58 * s, 0, 8);
  const pl = k.part(G, new THREE.SphereGeometry(0.28 * s, 8, 5), PLUME, 0.15 * s, 2.72 * s, -0.12 * s); pl.scale.set(1.4, 0.55, 0.8); pl.rotation.z = -0.4;

  // Name plate on the front of the plinth.
  k.sign(g, 'JAN VON WERTH', 2.4, 0, 1.22, 2.87, '#5a4a36');
});

// Deutzer Drehbrücke (1908): the riveted green steel-truss swing bridge over the mouth of the
// Deutzer Hafen. Two side trusses whose top chords rise to a peak over the off-centre pivot
// pier, a small steel control house with a pyramid roof at the pivot, lattice railings, lamp
// posts at the ends and stone bridge heads on the quay walls. The truss elevation faces +z;
// the harbour basin runs under it along z.
World.registerLandmark('drehbruecke', 'Deutzer Drehbrücke', 'https://de.wikipedia.org/wiki/Deutzer_Drehbr%C3%BCcke', (g, o, k) => {
  const GREEN = 0x3f6b4a, GREEN2 = 0x2f5238, ASPH = 0x333336, QUAY = 0x8a8478, QUAY2 = 0x767064;
  const CAP = 0xa49d8e, WATERC = 0x2f5f86, RAIL = 0x2a4632, LAMP = 0x2b2f30;
  const L = 32, BW = 10, DECK = 3.2, PIV = -L / 2 + 12, TE = 2.2, TP = 5.5, TZ = BW / 2 - 0.2;
  const X0 = -L / 2, X1 = L / 2;

  // Merge helper: many small parts become one mesh per colour.
  const batches = new Map();
  function add(geo, color, x, y, z, rx, ry, rz) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)).setPosition(x, y, z));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o3 = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, o3); nor.set(geo.attributes.normal.array, o3); o3 += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, rz) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, 0, 0, rz);
  // A straight bar between two points in the x/y plane at depth z.
  function bar(x1, y1, x2, y2, z, t, d, c) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    bx(len, t, d, c, (x1 + x2) / 2, (y1 + y2) / 2, z, Math.atan2(dy, dx));
  }
  const topY = (x) => DECK + (x < PIV ? TE + (TP - TE) * (x - X0) / (PIV - X0) : TE + (TP - TE) * (X1 - x) / (X1 - PIV));

  // Harbour water between the quays, quay walls and the two bridge heads.
  const WX = L / 2 - 2.5; // inner face of the quay walls
  k.box(g, 2 * WX, 0.06, 30, WATERC, 0, 0.03, 0);
  for (const s of [-1, 1]) {
    bx(3, DECK, 30, QUAY, s * (WX + 1.5), DECK / 2, 0);
    bx(3.3, 0.3, 30, CAP, s * (WX + 1.5), DECK + 0.1, 0); // coping stands 5 cm proud of the wall top (no z-fighting)
    // bridge head with stepped Jugendstil cap and pilasters
    bx(4, DECK + 0.1, 12, QUAY2, s * (L / 2 + 0.5), (DECK + 0.1) / 2, 0);
    for (const z of [-6.2, 6.2]) {
      bx(1.4, DECK + 1.6, 1.4, QUAY2, s * (L / 2 + 0.5), (DECK + 1.6) / 2, z);
      bx(1.8, 0.35, 1.8, CAP, s * (L / 2 + 0.5), DECK + 1.75, z);
      bx(1.0, 0.45, 1.0, CAP, s * (L / 2 + 0.5), DECK + 2.1, z);
    }
    // dark tide stain at the waterline
    bx(0.1, 0.8, 30, 0x4d4a44, s * WX, 0.5, 0);
  }
  // Pivot pier (stone drum with a cap ring) and a fender pier at the free end.
  k.cyl(g, 3, 3.2, DECK - 0.8, QUAY, PIV, (DECK - 0.8) / 2, 0, 16);
  k.cyl(g, 3.3, 3.3, 0.25, CAP, PIV, DECK - 0.9, 0, 16);

  // Deck with asphalt, kerbs and the steel edge girders.
  bx(L, 0.8, BW, GREEN2, 0, DECK - 0.4, 0);
  bx(L, 0.06, BW - 1.4, ASPH, 0, DECK + 0.03, 0);
  for (const s of [-1, 1]) bx(L, 0.2, 0.5, 0x8a8a86, 0, DECK + 0.1, s * (BW / 2 - 0.95));

  // Two side trusses: bottom chord, sloped top chord, verticals, diagonals and gusset plates.
  const N = 10, P = L / N;
  for (const s of [-1, 1]) {
    const z = s * TZ;
    bx(L, 0.5, 0.4, GREEN, 0, DECK + 0.25, z);
    bar(X0, topY(X0), PIV, topY(PIV), z, 0.55, 0.45, GREEN);
    bar(PIV, topY(PIV), X1, topY(X1), z, 0.55, 0.45, GREEN);
    const xs = []; for (let i = 0; i <= N; i++) xs.push(X0 + i * P);
    xs.push(PIV); xs.sort((a, b) => a - b);
    for (const x of xs) {
      const h = topY(x) - DECK;
      bx(0.32, h, 0.32, GREEN, x, DECK + h / 2, z);
      bx(0.7, 0.7, 0.08, GREEN2, x, DECK + 0.35, z + s * 0.22);
      bx(0.7, 0.7, 0.08, GREEN2, x, topY(x) - 0.3, z + s * 0.24);
    }
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1]; if (b - a < 0.5) continue;
      // diagonals fall toward the pivot, as in a Pratt truss
      if (b <= PIV) bar(a, topY(a) - 0.2, b, DECK + 0.4, z, 0.22, 0.2, GREEN);
      else bar(a, DECK + 0.4, b, topY(b) - 0.2, z, 0.22, 0.2, GREEN);
    }
    // rivet rows: darker strips along the chords
    bx(L, 0.1, 0.06, GREEN2, 0, DECK + 0.25, z + s * 0.23);
  }
  // Overhead cross bracing where the trusses are tall enough (around the pivot).
  for (const x of xs2()) bx(0.25, 0.3, 2 * TZ, GREEN, x, topY(x) - 0.25, 0);
  function xs2() { return [PIV - P, PIV, PIV + P]; }

  // Geometric lattice railings along the footways on the inner side of the trusses.
  for (const s of [-1, 1]) {
    const z = s * (TZ - 0.5);
    bx(L, 0.08, 0.08, RAIL, 0, DECK + 1.1, z);
    bx(L, 0.06, 0.06, RAIL, 0, DECK + 0.35, z);
    for (let x = X0 + 0.4; x < X1; x += 1.6) {
      bx(0.07, 1.1, 0.07, RAIL, x, DECK + 0.6, z);
      bar(x, DECK + 0.4, x + 0.8, DECK + 1.05, z, 0.05, 0.04, RAIL);
      bar(x + 0.8, DECK + 1.05, x + 1.6, DECK + 0.4, z, 0.05, 0.04, RAIL);
    }
  }

  // Control house on a cantilevered platform at the pivot, on the street side.
  const HZ = BW / 2 + 1.9, HY = DECK - 0.1;
  bx(4.2, 0.3, 3.8, GREEN2, PIV, HY, HZ);
  // knee braces from the platform's outer edge back down to the deck's edge girder
  for (const sx of [-1, 1]) {
    const y1 = DECK - 0.75, z1 = BW / 2 - 0.1, y2 = HY - 0.15, z2 = HZ + 1.6, dy = y2 - y1, dz = z2 - z1;
    add(new THREE.BoxGeometry(0.25, Math.hypot(dy, dz), 0.25), GREEN2, PIV + sx * 1.8, (y1 + y2) / 2, (z1 + z2) / 2, Math.atan2(dz, dy), 0, 0);
  }
  bx(3, 2.6, 3, GREEN, PIV, HY + 1.45, HZ);
  bx(3.3, 0.2, 3.3, GREEN2, PIV, HY + 2.85, HZ);
  bx(0.9, 1.9, 0.08, GREEN2, PIV + 0.8, HY + 1.1, HZ + 1.52);
  flush();
  const roofM = k.cone(g, 2.45, 1.4, GREEN2, PIV, HY + 3.65, HZ, 4); roofM.rotation.y = Math.PI / 4;
  k.box(g, 0.12, 0.6, 0.12, GREEN2, PIV, HY + 4.6, HZ);
  const glow = new THREE.MeshLambertMaterial({ color: 0xf2c65a, emissive: 0x8a6a1c });
  const win = (x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), glow); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); };
  for (const d of [-0.7, 0.7]) {
    if (d < 0) win(PIV + d, HY + 1.8, HZ + 1.52, 0);
    win(PIV + d, HY + 1.8, HZ - 1.52, Math.PI);
    win(PIV + 1.52, HY + 1.8, HZ + d, Math.PI / 2);
    win(PIV - 1.52, HY + 1.8, HZ + d, -Math.PI / 2);
  }
  win(PIV + 0.8, HY + 1.8, HZ + 1.53, 0);

  // Lamp posts with round lanterns at the four corners.
  const lampM = new THREE.MeshLambertMaterial({ color: 0xfff1c0, emissive: 0xffd98a });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (L / 2 - 0.6), z = sz * (TZ + 0.55);
    k.cyl(g, 0.08, 0.14, 2.8, LAMP, x, DECK + 1.4, z, 6);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), lampM); b.position.set(x, DECK + 3.1, z); g.add(b);
    k.cone(g, 0.34, 0.3, LAMP, x, DECK + 3.62, z, 6);
  }
});

// Poller Köpfe: the historic groynes (from 1560, the three big ones 1577-1583) of basalt and
// oak piles that reach from the Poller Wiesen into the Rhine. Three low, parallel dark stone
// tongues tapering toward rounded heads, loose basalt blocks on top, rows of old oak pile
// stumps along the flanks, a red-and-white groyne marker on the middle head (right Rhine
// bank), foam on the upstream side and a few gulls. The bank is at +z, the river at -z.
World.registerLandmark('pollerkoepfe', 'Poller Köpfe', 'https://de.wikipedia.org/wiki/Poller_K%C3%B6pfe', (g, o, k) => {
  const BASALT = 0x34322f, BASALT2 = 0x46433e, BLOCK = 0x5a5650, OAK = 0x5a4630, FOAM = 0xe8eef0;
  const WATERC = 0x3a6c93, BANK = 0x6c7a4a, GULL = 0xf4f4f0, RED = 0xc8322a, WHITE = 0xf2f2ee;
  const LEN = 46, WB = 9, WH = 6, GAP = 21, ZB = 20; // bank end at z = ZB, head at ZB - LEN

  // Seeded random so the rubble does not jump between builds.
  let seed = 1577; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const batches = new Map();
  function add(geo, color, x, y, z, ry) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z));
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush() {
    for (const [color, list] of batches) {
      let n = 0; for (const geo of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o3 = 0;
      for (const geo of list) { pos.set(geo.attributes.position.array, o3); nor.set(geo.attributes.normal.array, o3); o3 += geo.attributes.position.count * 3; }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      k.part(g, merged, color, 0, 0, 0);
    }
  }
  const bx = (w, h, d, c, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, ry);

  // Groyne body: tapered tongue with a rounded head, extruded upward (shape y = -z).
  function tongue(wb, wh, h, y0, color, x) {
    const s = new THREE.Shape(), zh = ZB - LEN + wh / 2;
    s.moveTo(-wb / 2, -ZB); s.lineTo(wb / 2, -ZB); s.lineTo(wh / 2, -zh);
    s.absarc(0, -zh, wh / 2, 0, Math.PI, false); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 8 });
    geo.rotateX(-Math.PI / 2);
    add(geo, color, x, y0, 0, 0);
  }

  // River water and a strip of the stone-lined Poller bank.
  const WW = 2 * GAP + WB + 10;
  k.box(g, WW, 0.06, LEN + 8, WATERC, 0, 0.03, ZB - (LEN + 8) / 2);
  bx(WW, 0.2, 1.6, BANK, 0, 0.1, ZB + 0.8);
  const rev = new THREE.BoxGeometry(WW, 0.2, 2.4); rev.rotateX(0.2);
  add(rev, BASALT2, 0, 0.36, ZB - 1.1, 0);

  for (let j = -1; j <= 1; j++) {
    const x = j * GAP;
    tongue(WB, WH, 0.8, 0, BASALT, x);                 // wide rubble foot
    tongue(WB - 2.4, WH - 2.2, 0.6, 0.75, BASALT2, x); // narrower crown
    // loose basalt blocks on the crown
    for (let i = 0; i < 26; i++) {
      const t = rnd(), z = ZB - 2 - t * (LEN - 6), w = (WB - 2.4) + ((WH - 2.2) - (WB - 2.4)) * t;
      const sz = 0.6 + rnd() * 0.6;
      bx(sz, sz * 0.6, sz * (0.8 + rnd() * 0.5), BLOCK, x + (rnd() - 0.5) * (w - 1), 1.35 + sz * 0.2, z, rnd() * Math.PI);
    }
    // oak pile stumps along both flanks, every 5 m
    for (let z = ZB - 3; z > ZB - LEN + 4; z -= 5) {
      const t = (ZB - z) / LEN, w = WB + (WH - WB) * t;
      for (const s of [-1, 1]) {
        const ph = 1.4 + rnd() * 0.3, c = new THREE.CylinderGeometry(0.22, 0.27, ph, 6);
        add(c, OAK, x + s * (w / 2 + 0.1), ph / 2, z, 0);
      }
    }
    // foam on the upstream (-x) side and a thin arc around the head
    for (let i = 0; i < 4; i++) {
      const z = ZB - 6 - i * 10, t = (ZB - z) / LEN, w = WB + (WH - WB) * t;
      bx(0.25, 0.04, 6 + rnd() * 2, FOAM, x - w / 2 - 0.5 - rnd() * 0.4, 0.08, z, 0.04);
    }
    bx(WH * 0.8, 0.04, 0.3, FOAM, x - 0.8, 0.08, ZB - LEN - 0.4, 0.3);
  }
  // Gulls sitting on the stones.
  for (const [x, z] of [[-GAP + 1, 2], [-GAP - 1.2, -12], [0.8, 6], [-0.6, -20], [GAP + 0.5, -4], [GAP - 1, 10]]) {
    bx(0.45, 0.25, 0.22, GULL, x, 1.5, z, rnd() * 3);
    bx(0.14, 0.16, 0.14, GULL, x + 0.18, 1.7, z, 0);
    bx(0.5, 0.05, 0.12, 0x9a9a98, x - 0.05, 1.55, z, 0);
  }
  // Groyne marker on the middle head: banded post and a red can top.
  const MZ = ZB - LEN + WH / 2 - 0.5;
  for (let i = 0; i < 8; i++) bx(0.34, 0.6, 0.34, i % 2 ? WHITE : RED, 0, 1.65 + i * 0.6, MZ, 0);
  flush();
  // red can top with retro-reflective paint, so the marker still reads in headlights at night
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 8), new THREE.MeshLambertMaterial({ color: RED, emissive: 0x6a1410 }));
  can.position.set(0, 6.6, MZ); g.add(can);
});

// Rheinboulevard Deutz (2015): the long concrete Freitreppe on the Kennedy-Ufer between
// Deutzer Brücke and Hohenzollernbrücke, where half of Köln sits with a Kölsch and looks
// across the Rhine at the Dom. 13 big seating steps (0.45 m high, 0.9 m deep) with light
// treads and dark risers, two straight stairways cut through it, a promenade with plane
// trees and a railing on top, one of the three basalt-clad "Bastionen" (viewing balconies)
// jutting into the steps, and a warm LED line under every tread nose at night.
// Road side (+z) is the high plain back wall; the steps fall away toward the river (-z).
World.registerLandmark('rheinboulevard', 'Rheinboulevard', 'https://www.stadt-koeln.de/artikel/08218/index.html', (g, o, k) => {
  const night = !!((o.theme && o.theme.night) || (World.theme && World.theme().night));
  const TREAD = 0xc8c3b9, RISER = 0x4a4a50, WALL = 0x46464c, COPING = 0xbdb8ae;
  const N = 13, RH = 0.45, TD = 0.9, H = N * RH, PROM = 4;   // 5.85 m high, promenade 4 m deep
  const L = 108, GAP = 8;                                    // compressed from ~120 m (game scale)
  const stairX = [-L / 6, L / 6];                            // stairways at one and two thirds

  // Tiny merge helper: many boxes -> one vertex-coloured mesh (top faces one colour, the rest another).
  const mergeBoxes = (list, material) => {
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const b of list) {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d).toNonIndexed();
      if (b.ry) geo.rotateY(b.ry);
      if (b.rx) geo.rotateX(b.rx);
      geo.translate(b.x, b.y, b.z);
      const p = geo.attributes.position, n = geo.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
        c.setHex(n.getY(i) > 0.5 && b.top != null ? b.top : b.c); col.push(c.r, c.g, c.b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, material || new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
    g.add(m); return m;
  };

  // Sections of the seating terrace between the two stairway cuts.
  const edges = [-L / 2, stairX[0] - GAP / 2, stairX[0] + GAP / 2, stairX[1] - GAP / 2, stairX[1] + GAP / 2, L / 2];
  const sections = [[edges[0], edges[1]], [edges[2], edges[3]], [edges[4], edges[5]]];
  const concrete = [], leds = [];
  // Promenade block along the whole length: plain dark back wall to the road, light paving on top.
  concrete.push({ w: L, h: H, d: PROM, x: 0, y: H / 2, z: -PROM / 2, c: WALL, top: TREAD });
  concrete.push({ w: L + 0.2, h: 0.18, d: 0.5, x: 0, y: H + 0.09, z: -0.25, c: COPING, top: COPING });
  for (const [x0, x1] of sections) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    for (let i = 1; i <= N; i++) {
      const top = H - RH * i, zc = -PROM - TD * (i - 0.5), zn = -PROM - TD * i;
      if (top > 0) concrete.push({ w, h: top, d: TD, x: cx, y: top / 2, z: zc, c: RISER, top: TREAD });
      else concrete.push({ w, h: 0.06, d: TD, x: cx, y: 0.03, z: zc, c: RISER, top: TREAD });
      // LED line tucked under the nose of the tread above (the riser top of this step).
      leds.push({ w: w - 0.2, h: 0.1, d: 0.06, x: cx, y: top + RH - 0.08, z: zn + TD - 0.02, c: 0xffd9a0 });
    }
  }
  // Two straight stairways (0.15 m steps, 0.3 m deep) through the terrace, with a centre handrail.
  const rails = [];
  for (const sx of stairX) {
    const n = Math.round(H / 0.15);
    for (let j = 1; j <= n; j++) {
      const top = H - 0.15 * j;
      if (top > 0) concrete.push({ w: GAP, h: top, d: 0.3, x: sx, y: top / 2, z: -PROM - 0.3 * (j - 0.5), c: 0x8e8a83, top: 0xd8d3c9 });
    }
    // Sloped handrail on posts down the middle of each stairway.
    const run = N * TD, slope = Math.atan2(H, run), len = Math.hypot(H, run);
    rails.push({ w: 0.08, h: 0.08, d: len, x: sx, y: H / 2 + 1.0, z: -PROM - run / 2, rx: -slope, c: 0x9ea3a8 });
    for (let t = 0; t <= 4; t++) {
      const zz = -PROM - run * (t / 4) - 0.05, yy = H - H * (t / 4);
      rails.push({ w: 0.08, h: 1.0, d: 0.08, x: sx, y: yy + 0.5, z: zz, c: 0x9ea3a8 });
    }
  }
  // One of the three "Bastionen": a balcony-like viewing platform at promenade level that juts
  // out into the steps, its walls clad in dark basalt, with a steel railing round the edge.
  const BAS = 0x2c2d31, BW = 10, BD = 5.5, bz0 = -PROM, bz1 = -PROM - BD;
  concrete.push({ w: BW, h: H, d: BD, x: 0, y: H / 2, z: (bz0 + bz1) / 2, c: BAS, top: TREAD });
  concrete.push({ w: BW + 0.3, h: 0.2, d: 0.3, x: 0, y: H + 0.1, z: bz1 + 0.1, c: BAS, top: COPING });
  for (const sx of [-1, 1]) concrete.push({ w: 0.3, h: 0.2, d: BD, x: sx * (BW / 2 + 0.0), y: H + 0.1, z: (bz0 + bz1) / 2, c: BAS, top: COPING });
  rails.push({ w: BW, h: 0.08, d: 0.08, x: 0, y: H + 1.1, z: bz1 + 0.15, c: 0x9ea3a8 });
  for (const sx of [-1, 1]) rails.push({ w: 0.08, h: 0.08, d: BD, x: sx * BW / 2, y: H + 1.1, z: (bz0 + bz1) / 2, c: 0x9ea3a8 });
  for (let x = -BW / 2; x <= BW / 2 + 0.01; x += 2.5) rails.push({ w: 0.09, h: 1.1, d: 0.09, x, y: H + 0.55, z: bz1 + 0.15, c: 0x9ea3a8 });
  for (const sx of [-1, 1]) for (const zz of [bz0 - 1.8, bz0 - 3.6]) rails.push({ w: 0.09, h: 1.1, d: 0.09, x: sx * BW / 2, y: H + 0.55, z: zz, c: 0x9ea3a8 });
  // Railing along the road edge of the promenade: posts, top rail and middle rail.
  rails.push({ w: L, h: 0.08, d: 0.08, x: 0, y: H + 1.1, z: -0.3, c: 0x9ea3a8 });
  rails.push({ w: L, h: 0.05, d: 0.05, x: 0, y: H + 0.6, z: -0.3, c: 0x9ea3a8 });
  for (let x = -L / 2; x <= L / 2 + 0.01; x += 3) rails.push({ w: 0.09, h: 1.1, d: 0.09, x, y: H + 0.55, z: -0.3, c: 0x9ea3a8 });
  // Dark precast panels of the back wall: slightly lighter joints every 3 m and a plinth line.
  for (let x = -L / 2 + 3; x < L / 2 - 0.5; x += 3) concrete.push({ w: 0.12, h: H - 0.4, d: 0.04, x, y: H / 2 + 0.1, z: 0.02, c: 0x5c5c62 });
  concrete.push({ w: L, h: 0.35, d: 0.12, x: 0, y: 0.175, z: 0.06, c: 0x38383d });
  // Lamp masts along the promenade between the trees (warm heads at night).
  const lampHeads = [];
  for (let t = 0; t <= 6; t++) {
    const x = -L / 2 + L * t / 6 + (t === 0 ? 2 : t === 6 ? -2 : 0), z = -PROM + 0.5;
    rails.push({ w: 0.16, h: 6, d: 0.16, x, y: H + 3, z, c: 0x5a5e63 });
    rails.push({ w: 0.2, h: 0.12, d: 1.2, x, y: H + 6, z: z - 0.4, c: 0x5a5e63 });
    lampHeads.push({ w: 0.5, h: 0.14, d: 0.7, x, y: H + 5.88, z: z - 0.75, c: 0xffe2b0 });
  }
  mergeBoxes(lampHeads, night ? new THREE.MeshBasicMaterial({ color: 0xffe2b0 }) : new THREE.MeshLambertMaterial({ color: 0xd8d8d0 }));
  mergeBoxes(concrete);
  mergeBoxes(rails);
  mergeBoxes(leds, night ? new THREE.MeshBasicMaterial({ color: 0xffd9a0 }) : new THREE.MeshLambertMaterial({ color: 0x77736c }));

  // Six plane trees on the promenade.
  for (let t = 0; t < 6; t++) {
    const x = -L / 2 + L * (t + 0.5) / 6, z = -PROM / 2 - 0.3;
    k.cyl(g, 0.3, 0.38, 4, 0xa39a82, x, H + 2, z, 7);
    const crown = k.part(g, new THREE.IcosahedronGeometry(3, 1), t % 2 ? 0x4a7a3a : 0x55863f, x, H + 4 + 2.2, z);
    crown.scale.set(1.1, 0.85, 1.0);
  }

  // Fourteen people sitting in pairs on the steps, looking at the Dom (-z), some with a Kölsch.
  const people = [], s = 1.25;
  const shirts = [0xc1121f, 0x1c3f95, 0xf2f2ee, 0x2d6a4f, 0xe8a33d, 0x6a3a8a, 0x222226];
  const pants = [0x2b3f66, 0x3a3a40, 0x5a4a3a, 0x2b3f66];
  const skin = [0xe8c4a0, 0xc99a74, 0x8d5a3b, 0xf0d0b0];
  const spots = [[0, -44, 4], [0, -30, 9], [1, -7, 6], [1, 6, 11], [2, 26, 3], [2, 38, 8], [2, 47, 12]];
  let pi = 0;
  for (const [sec, x0, step] of spots) {
    const yt = H - RH * step, zn = -PROM - TD * step;
    for (const dx of [0, 0.75 * s]) {
      const x = x0 + dx, sh = shirts[pi % shirts.length], pa = pants[pi % pants.length], sk = skin[(pi * 3) % skin.length];
      people.push({ w: 0.42 * s, h: 0.15 * s, d: 0.5 * s, x, y: yt + 0.075 * s, z: zn + 0.15, c: pa });                       // thighs
      people.push({ w: 0.36 * s, h: RH, d: 0.14 * s, x, y: yt - RH / 2, z: zn - 0.08, c: pa });                               // shins over the riser
      people.push({ w: 0.46 * s, h: 0.58 * s, d: 0.28 * s, x, y: yt + (0.15 + 0.29) * s, z: zn + 0.5 * s, c: sh });          // torso
      people.push({ w: 0.26 * s, h: 0.28 * s, d: 0.26 * s, x, y: yt + 0.88 * s, z: zn + 0.5 * s, c: sk, top: pi % 3 ? 0x3a2a1e : 0xd9b05a }); // head + hair
      if (pi % 3 !== 2) {
        const gx = x + (dx ? -0.3 : 0.3) * s;
        people.push({ w: 0.1 * s, h: 0.3 * s, d: 0.1 * s, x: gx, y: yt + 0.42 * s, z: zn + 0.3 * s, c: sh });                // forearm
        people.push({ w: 0.1 * s, h: 0.2 * s, d: 0.1 * s, x: gx, y: yt + 0.66 * s, z: zn + 0.3 * s, c: 0xe3b23c, top: 0xfbf6e8 }); // Stange Kölsch
      }
      pi++;
    }
  }
  mergeBoxes(people);
});
