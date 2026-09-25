/* ============================================================
   STUNTS KÖLLE 4D — more of the real city, drawn in low-poly stone.
   Load after world.js. Original geometry; no downloaded image assets.
   Dimensions are compressed for the game's fictional street layouts.
   Each model is grounded at y=0; the presentation facade faces +z.
   ============================================================ */
(function (root) {
  'use strict';
  const W = root.World, P = W.P;
  const STONE = 0xc9bb9e, LIGHT = 0xe0d6c0, DARK = 0x30434a;
  const SLATE = 0x515966, BRICK = 0x984f3d, TRIM = 0xab9272;
  const materials = new Map();
  const catalog = W.landmarkCatalog = W.landmarkCatalog || {};

  function mat(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color }));
    return materials.get(color);
  }
  function part(g, geo, color, x, y, z) {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x || 0, y || 0, z || 0); g.add(m); return m;
  }
  function box(g, w, h, d, color, x, y, z) {
    return part(g, new THREE.BoxGeometry(w, h, d), color, x, y == null ? h / 2 : y, z);
  }
  function cyl(g, rt, rb, h, color, x, y, z, seg) {
    return part(g, new THREE.CylinderGeometry(rt, rb, h, seg || 12), color, x, y == null ? h / 2 : y, z);
  }
  function cone(g, r, h, color, x, y, z, seg) {
    return part(g, new THREE.ConeGeometry(r, h, seg || 8), color, x, y, z);
  }
  function roof(g, w, h, d, color, x, y, z) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, -d / 2);
    return part(g, geo, color, x, y, z);
  }
  function dome(g, r, h, color, x, y, z) {
    const m = part(g, new THREE.SphereGeometry(r, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z);
    m.scale.y = h / r; return m;
  }
  // Front-facing arch; rotations place the same detail on side facades.
  function arch(g, w, h, x, y, z, color, rotation) {
    const r = w / 2, s = new THREE.Shape();
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r);
    s.absarc(0, h - r, r, 0, Math.PI, false); s.closePath();
    const m = part(g, new THREE.ShapeGeometry(s, 6), color || DARK, x, y, z);
    m.rotation.y = rotation || 0; return m;
  }
  function pointed(g, w, h, x, y, z, color, rotation) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h * 0.66);
    s.lineTo(0, h); s.lineTo(-w / 2, h * 0.66); s.closePath();
    const m = part(g, new THREE.ShapeGeometry(s), color || DARK, x, y, z);
    m.rotation.y = rotation || 0; return m;
  }
  function window(g, w, h, x, y, z, rotation) {
    const m = box(g, w, h, 0.14, DARK, x, y, z); m.rotation.y = rotation || 0; return m;
  }
  function sign(g, text, w, x, y, z, bg) {
    const m = W.textPlane(text, '#f7edce', bg || '#343c43', w, Math.max(1.1, w / 13), false);
    m.position.set(x || 0, y, z); g.add(m); return m;
  }
  function cross(g, x, y, z) {
    box(g, 0.4, 3, 0.4, 0xb09a60, x, y, z); box(g, 1.8, 0.4, 0.4, 0xb09a60, x, y + 0.3, z);
  }
  function cornice(g, w, d, y, color, x, z) { box(g, w + 0.8, 0.65, d + 0.8, color || LIGHT, x, y, z); }
  function nave(g, w, h, d, x, z, color, roofColor) {
    box(g, w, h, d, color || STONE, x, h / 2, z);
    roof(g, w + 1, 8, d + 1, roofColor || SLATE, x, h, z);
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      const pz = z - d / 2 + 5 + i * (d - 10) / 4;
      arch(g, 2.1, 6, x + side * (w / 2 + 0.05), h - 9, pz, DARK, side * Math.PI / 2);
      box(g, 0.7, h - 2, 0.9, TRIM, x + side * (w / 2 + 0.25), (h - 2) / 2, pz + 2.2);
    }
  }
  function apse(g, r, h, x, z, color, roofColor) {
    cyl(g, r, r, h, color || STONE, x, h / 2, z, 12);
    cone(g, r + 0.6, 7, roofColor || SLATE, x, h + 3.5, z, 12);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      arch(g, 1.8, 5.3, x + Math.sin(a) * (r + 0.04), h - 7.2, z + Math.cos(a) * (r + 0.04), DARK, a);
    }
  }
  function tower(g, w, h, x, z, color, roofColor, spire) {
    box(g, w, h, w, color || STONE, x, h / 2, z);
    for (const y of [h * 0.42, h * 0.69, h - 1]) cornice(g, w, w, y, TRIM, x, z);
    for (let side = 0; side < 4; side++) for (const dx of [-w * 0.2, w * 0.2]) {
      const a = side * Math.PI / 2, px = x + Math.sin(a) * (w / 2 + 0.06) + Math.cos(a) * dx;
      const pz = z + Math.cos(a) * (w / 2 + 0.06) - Math.sin(a) * dx;
      arch(g, w * 0.18, 5.5, px, h - 8, pz, DARK, a);
    }
    const rh = spire || 12, cap = cone(g, w * 0.78, rh, roofColor || SLATE, x, h + rh / 2, z, 4);
    cap.rotation.y = Math.PI / 4; cross(g, x, h + rh + 1, z);
  }
  function register(id, name, source, make) {
    catalog[id] = { name, source };
    P[id] = (options) => {
      const g = new THREE.Group(); g.name = name;
      g.userData.landmarkId = id; g.userData.landmarkName = name; g.userData.landmarkSource = source;
      make(g, options || {});
      // A placement offset refers to the complete footprint, including side wings.
      const bounds = new THREE.Box3().setFromObject(g), center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      for (const child of g.children) { child.position.x -= center.x; child.position.z -= center.z; }
      g.userData.landmarkFootprint = { width: size.x, depth: size.z, height: size.y };
      g.updateMatrixWorld(true);
      return g;
    };
  }

  // Triple apses, crossing lantern and tall west tower: the Neumarkt silhouette.
  register('aposteln', 'St. Aposteln', 'https://www.romanische-kirchen-koeln.de/grosse-kirchen/st-aposteln/dreikonchenanlage/', (g) => {
    nave(g, 22, 22, 42, 0, 0, STONE, SLATE);
    box(g, 37, 20, 18, STONE, 0, 10, -13);
    apse(g, 9, 21, -16, -13); apse(g, 9, 21, 16, -13); apse(g, 9, 21, 0, -25);
    cyl(g, 9, 9, 7, LIGHT, 0, 28.5, -13, 8); dome(g, 9.5, 7, SLATE, 0, 32, -13);
    cyl(g, 2.3, 2.3, 4, LIGHT, 0, 41, -13, 8); cone(g, 3, 4, SLATE, 0, 45, -13, 8);
    for (const x of [-11.5, 11.5]) tower(g, 5, 31, x, -21, LIGHT, SLATE, 9);
    tower(g, 13, 49, 0, 22, STONE, SLATE, 15);
    arch(g, 4, 7, 0, 0, 28.6); sign(g, 'ST. APOSTELN', 13, 0, 10, 28.65);
  });

  // Three towers, a rounded Rhine-facing choir and red/slate roof contrast.
  register('kunibert', 'St. Kunibert', 'https://www.romanische-kirchen-koeln.de/grosse-kirchen/st-kunibert/querhaus-chor/', (g) => {
    nave(g, 21, 23, 43, 0, 0, LIGHT, 0x815143);
    box(g, 38, 20, 16, LIGHT, 0, 10, -13); apse(g, 10, 23, 0, -23, LIGHT, 0x815143);
    for (const x of [-13, 13]) tower(g, 7.2, 35, x, -15, LIGHT, SLATE, 14);
    tower(g, 14, 43, 0, 20, LIGHT, SLATE, 16);
    arch(g, 5, 9, 0, 0, 27.1); sign(g, 'ST. KUNIBERT', 12, 0, 12, 27.2);
    for (const x of [-6.5, 6.5]) box(g, 1.2, 33, 1.2, TRIM, x, 16.5, 27);
  });

  // The towerless broad trefoil plan differentiates this church from its neighbours.
  register('mariakapitol', 'St. Maria im Kapitol', 'https://willkommen.koelntourismus.de/terminal/singlepage/sehenswuerdigkeiten/st-maria-im-kapitol', (g) => {
    nave(g, 23, 21, 40, 0, 4, 0xb8a88e, 0x91604c);
    box(g, 35, 21, 20, 0xb8a88e, 0, 10.5, -12);
    apse(g, 11, 22, -17, -12, 0xb8a88e, 0x91604c); apse(g, 11, 22, 17, -12, 0xb8a88e, 0x91604c);
    apse(g, 11, 22, 0, -26, 0xb8a88e, 0x91604c);
    roof(g, 21, 9, 23, 0x91604c, 0, 24, -12);
    box(g, 31, 24, 10, STONE, 0, 12, 21); roof(g, 32, 8, 11, SLATE, 0, 24, 21);
    for (const x of [-9, 0, 9]) arch(g, 3, 8, x, 3, 26.05);
    sign(g, 'ST. MARIA IM KAPITOL', 24, 0, 15, 26.1);
    // Lichhof wall and a small open gate; no invisible collision box.
    box(g, 12, 3.5, 1, STONE, -21, 1.75, 29); box(g, 12, 3.5, 1, STONE, 21, 1.75, 29);
  });

  // Monumental pale westwork, two cylindrical stair towers, restrained red bands.
  register('pantaleon', 'St. Pantaleon', 'https://willkommen.koelntourismus.de/sehenswuerdigkeiten/st-pantaleon', (g) => {
    nave(g, 24, 21, 45, 0, -5, LIGHT, 0x986348); apse(g, 10, 19, 0, -25, LIGHT, 0x986348);
    box(g, 25, 32, 15, LIGHT, 0, 16, 19); roof(g, 26, 11, 16, SLATE, 0, 32, 19);
    tower(g, 11, 43, 0, 18, LIGHT, SLATE, 13);
    for (const x of [-14, 14]) {
      cyl(g, 3.6, 3.6, 37, LIGHT, x, 18.5, 20, 12); cone(g, 4.3, 12, SLATE, x, 43, 20, 12);
      for (const y of [11, 22, 33]) cyl(g, 3.8, 3.8, 0.6, 0xa96f58, x, y, 20, 12);
      arch(g, 1.5, 4, x, 28, 23.65);
    }
    for (const y of [9, 19, 29]) box(g, 25.5, 0.55, 0.3, 0xa96f58, 0, y, 26.65);
    for (const x of [-7, 0, 7]) arch(g, 3, 7, x, 12, 26.7);
    arch(g, 5, 8, 0, 0, 26.7); sign(g, 'ST. PANTALEON', 16, 0, 23, 26.75);
  });

  // Gothic civic festival hall: crenellated corners and two rows of pointed windows.
  register('guerzenich', 'Gürzenich', 'https://www.stadt-koeln.de/artikel/71967/index.html', (g) => {
    box(g, 49, 21, 29, 0x968d7e); roof(g, 48, 8, 28, SLATE, 0, 21, 0);
    cornice(g, 49, 29, 10, LIGHT); cornice(g, 49, 29, 21, LIGHT);
    for (const x of [-24, 24]) for (const z of [-14, 14]) {
      box(g, 4, 25, 4, STONE, x, 12.5, z);
      for (const dx of [-1.3, 1.3]) for (const dz of [-1.3, 1.3]) box(g, 1.1, 1.8, 1.1, LIGHT, x + dx, 25.7, z + dz);
    }
    for (let x = -18; x <= 18; x += 6) {
      for (const y of [2, 12]) { arch(g, 3.6, 6.5, x, y, 14.55); box(g, 0.25, 6, 0.15, LIGHT, x, y + 3, 14.65); }
      box(g, 0.65, 19, 0.6, LIGHT, x + 2.4, 10.5, 14.7);
    }
    for (let x = -21; x <= 21; x += 4.2) box(g, 1.8, 1.5, 1.1, STONE, x, 22.1, 14.5);
    sign(g, 'GÜRZENICH', 17, 0, 10.3, 14.95);
    // St. Alban's roofless stone enclosure beside the hall.
    box(g, 1, 10, 20, 0x81796d, 29, 5, -2); box(g, 9, 10, 1, 0x81796d, 25, 5, -12);
  });

  // Ungers' strict cubic volumes and stone grid, based on the 2001 main building.
  register('wallraf', 'Wallraf-Richartz-Museum', 'https://www.wallraf.museum/hintergrund/', (g) => {
    box(g, 38, 26, 31, 0xcab99d, -5, 13, -2); box(g, 16, 18, 25, 0xded8c8, 20, 9, 1);
    box(g, 31, 7, 22, 0xbfbcb2, -6, 29.5, -5);
    for (let x = -23; x <= 13; x += 4.5) box(g, 0.12, 26, 0.2, 0x8d8372, x, 13, 13.6);
    for (let y = 4; y <= 26; y += 4.4) box(g, 38, 0.12, 0.2, 0x8d8372, -5, y, 13.65);
    for (const x of [-18.5, -9.5, -0.5, 8.5]) for (const y of [6.5, 15.3, 24.1]) window(g, 2.5, 3, x, y, 13.75);
    box(g, 13, 5, 0.3, DARK, 18, 2.5, 13.6);
    for (const x of [14, 18, 22]) box(g, 0.2, 5, 0.35, LIGHT, x, 2.5, 13.75);
    sign(g, 'WALLRAF-RICHARTZ', 26, -4, 3, 13.85);
  });

  // Zumthor's warm grey brick skin floats over visibly older ruin fragments.
  register('kolumba', 'Kolumba', 'https://kolumba.de/index.php?art=311&cat=22&language=-', (g) => {
    box(g, 38, 22, 28, 0xb8b5a8, -3, 11, 0); box(g, 15, 31, 18, 0xc4c0b3, 14, 15.5, -5);
    box(g, 13, 27, 20, 0xc4c0b3, -17, 13.5, -4);
    for (let y = 2; y <= 21; y += 1.25) box(g, 38, 0.1, 0.16, 0xaaa698, -3, y, 14.08);
    for (let x = -20; x <= 13; x += 1.8) for (let y = 8.5; y < 13; y += 1.2) window(g, 0.45, 0.3, x, y, 14.2);
    for (const x of [-16, 0, 14]) window(g, 5, 7, x, 18, 14.25);
    // Jagged darker church remnants at the base, plus a recognizable pointed arch.
    for (let i = 0; i < 9; i++) box(g, 4, 3 + (i % 3) * 1.3, 0.6, i % 2 ? 0x82786a : 0x968875, -19 + i * 4, null, 14.45);
    arch(g, 4, 6.2, -12, 0, 14.81, 0x2b3438);
    box(g, 8, 4.6, 0.4, DARK, 11, 2.3, 14.85); sign(g, 'KOLUMBA', 11, 9, 6.2, 14.9);
  });

  // Riphahn's distinctive tapering stage/workshop towers above the glass foyer.
  register('oper', 'Oper am Offenbachplatz', 'https://sanierung.buehnen.koeln/de/interview-wolfgang-schmidtlein', (g) => {
    box(g, 60, 8, 36, 0xe3ded0, 0, 4, 0); box(g, 52, 6, 0.3, 0x638491, 0, 4, 18.2);
    for (let x = -24; x <= 24; x += 4) box(g, 0.45, 7, 0.6, 0xe8e2d2, x, 4, 18.4);
    box(g, 62, 0.8, 9, LIGHT, 0, 8.5, 17);
    box(g, 31, 17, 25, 0xd7d2c4, 0, 16.5, -2);
    for (const x of [-22, 22]) {
      const geo = new THREE.CylinderGeometry(12, 7.3, 32, 4, 1); geo.rotateY(Math.PI / 4);
      const t = part(g, geo, 0xe4dfd1, x, 24, -7); t.scale.z = 0.9;
      for (let y = 12; y <= 37; y += 4.1) {
        const span = 10.7 + (y - 8) * 0.205;
        box(g, span, 0.42, 0.3, 0xa9a99f, x, y, -7 + (5.2 + (y - 8) * 0.093));
      }
    }
    sign(g, 'OPER KÖLN', 19, 0, 10.5, 21.6);
    // Offenbachplatz's fountain reads as a meeting point at street level.
    cyl(g, 5.5, 5.5, 0.65, 0xa9a394, 0, 0.325, 26, 16);
    cyl(g, 4.8, 4.8, 0.12, 0x6c9eae, 0, 0.72, 26, 16);
    for (const x of [-2, 0, 2]) box(g, 0.6, 1.6 + Math.abs(x) * 0.3, 0.6, 0xc9b47d, x, 1.5, 26);
  });

  // Broad brick cylinder, rhythm of tall arches and restored rooftop arcade.
  register('wasserturm', 'Wasserturm Kaygasse', 'https://www.wasserturm-hotel-cologne.com/', (g) => {
    cyl(g, 15, 16, 29, BRICK, 0, 14.5, 0, 20);
    for (const y of [2, 10, 20, 28]) cyl(g, 15.8 - y * 0.025, 15.8 - y * 0.025, 0.8, 0xc08a63, 0, y, 0, 20);
    for (let i = 0; i < 20; i++) {
      const a = i * Math.PI / 10, r = 15.55;
      arch(g, 2, 14, Math.sin(a) * r, 11, Math.cos(a) * r, DARK, a);
      box(g, 0.9, 5.5, 0.9, BRICK, Math.sin(a) * 14.4, 31.3, Math.cos(a) * 14.4);
    }
    cyl(g, 15.3, 15.3, 0.8, 0xb87754, 0, 34.3, 0, 20); cyl(g, 12.8, 12.8, 2.8, DARK, 0, 30.7, 0, 20);
    cyl(g, 13.1, 13.1, 0.5, 0x655c50, 0, 32.4, 0, 20);
    arch(g, 4, 7, 0, 0, 16.15); sign(g, 'WASSERTURM', 13, 0, 8.5, 16.2);
  });

  // Low redoubt with a green roof and rose beds, distinct from medieval gate towers.
  register('fortx', 'Fort X · Rosengarten', 'https://www.stadt-koeln.de/leben-in-koeln/freizeit-natur-sport/parks/66306/index.html', (g) => {
    box(g, 43, 9, 21, 0xb5a285, 0, 4.5, -3); cyl(g, 13, 13, 10, 0xb5a285, 0, 5, -6, 16);
    for (const x of [-23, 23]) { box(g, 10, 7, 28, 0xb5a285, x, 3.5, 0); box(g, 11, 0.5, 29, 0x5c7c46, x, 7.2, 0); }
    box(g, 44, 0.6, 22, 0x5c7c46, 0, 9.3, -3); cyl(g, 13, 13, 0.5, 0x5c7c46, 0, 10.2, -6, 16);
    for (let x = -18; x <= 18; x += 6) arch(g, 2, 3.8, x, 3.6, 7.55);
    arch(g, 5.3, 7, 0, 0, 7.65); sign(g, 'FORT X', 9, 0, 8.2, 7.8);
    for (const x of [-16, -8, 8, 16]) {
      box(g, 5, 0.5, 7, 0x4e6438, x, 9.9, -3);
      for (let i = 0; i < 5; i++) cyl(g, 0.55, 0.55, 0.5, i % 2 ? 0xef8799 : 0xc9395b, x - 1.3 + i % 2 * 2.5, 10.45, -5.5 + i * 1.2, 6);
    }
    for (const x of [-24, 24]) for (const z of [-10, 0, 10]) box(g, 0.45, 3.5, 0.45, 0xded6bd, x, 9.2, z);
    for (const x of [-24, 24]) box(g, 1.4, 0.35, 22, 0xded6bd, x, 11, 0);
  });

  // Oval domed reception hall with the lower hipped-roof wings on Ottoplatz.
  register('deutzbahnhof', 'Bahnhof Köln Messe/Deutz', 'https://jswd.de/projects/ice-terminal-messe-deutz', (g) => {
    box(g, 59, 11, 23, 0xc8b697, 0, 5.5, 0);
    for (const x of [-22, 22]) {
      box(g, 17, 13, 25, 0xc8b697, x, 6.5, 1); roof(g, 18, 7, 26, SLATE, x, 13, 1);
      for (const dx of [-5, 0, 5]) { arch(g, 2.3, 4.5, x + dx, 2, 13.6); window(g, 2.3, 2.8, x + dx, 10, 13.7); }
    }
    const hall = cyl(g, 13, 13, 17, 0xd7c7a7, 0, 8.5, 0, 16); hall.scale.z = 0.8;
    const d = dome(g, 14, 11, 0x636d69, 0, 17, 0); d.scale.z = 0.8;
    for (const x of [-7, 0, 7]) arch(g, 4, 10, x, 0, 11.7);
    for (const x of [-11, -3.5, 3.5, 11]) box(g, 1, 11, 1, LIGHT, x, 5.5, 12);
    sign(g, 'KÖLN MESSE / DEUTZ', 23, 0, 13.5, 12.1);
    cyl(g, 1.8, 2.4, 3, 0x63706b, 0, 28.5, 0, 8);
    // Ottoplatz's red flywheel monument: a tiny but recognizable foreground cue.
    box(g, 5, 0.6, 2, 0x7c7c76, 19, 0.3, 19);
    const wheel = part(g, new THREE.TorusGeometry(2.2, 0.22, 5, 16), 0x9e2b27, 19, 2.7, 19);
    for (let i = 0; i < 6; i++) { const spoke = box(g, 0.17, 4.2, 0.17, 0x9e2b27, 19, 2.7, 19); spoke.rotation.z = i * Math.PI / 6; }
    wheel.name = 'Ottoplatz Schwungrad';
  });

  register('palladium', 'Palladium · Schanzenstraße', 'https://www.palladium-koeln.de/', (g) => {
    box(g, 39, 11, 41, BRICK, 0, 5.5, -3); roof(g, 40, 7, 42, 0x536467, 0, 11, -3);
    box(g, 17, 8, 34, 0xaa7055, 26, 4, -3); roof(g, 18, 4, 35, 0x536467, 26, 8, -3);
    box(g, 37, 4.5, 8, 0xa5684e, 0, 2.25, 20); box(g, 39, 0.6, 9, 0x454b4b, 0, 4.8, 20);
    for (const x of [-13, -6.5, 0, 6.5, 13]) { arch(g, 4, 6, x, 6, 17.6); box(g, 0.2, 5.5, 0.2, 0xada087, x, 9, 17.75); }
    for (const x of [-14, -7, 0, 7, 14]) window(g, 4, 2.7, x, 2, 24.1);
    sign(g, 'PALLADIUM', 24, 0, 5.7, 24.2);
    for (let z = -18; z <= 12; z += 7.5) { arch(g, 3.2, 6, -19.55, 3, z, DARK, -Math.PI / 2); box(g, 1, 11, 1, 0xb67f60, -19.7, 5.5, z + 3); }
  });

  // Twin gables, pale inset panels, round windows and the former water-tank tower.
  register('ewerk', 'E-Werk · Schanzenstraße', 'https://www.e-werk-cologne.com/', (g) => {
    for (const x of [-10, 10]) {
      box(g, 19, 13, 36, BRICK, x, 6.5, -1); roof(g, 20, 9, 37, SLATE, x, 13, -1);
      roof(g, 18, 8.4, 0.7, 0xcfc9b8, x, 13, 17.65);
      box(g, 15, 9.5, 0.4, 0xcfc9b8, x, 8, 17.35);
      const ring = part(g, new THREE.TorusGeometry(2.8, 0.5, 5, 16), BRICK, x, 15.5, 18.1);
      const pane = cyl(g, 2.55, 2.55, 0.15, DARK, x, 15.5, 17.95, 16); pane.rotation.x = Math.PI / 2;
      ring.name = 'Rundes Giebelfenster';
      for (const dx of [-5, 0, 5]) arch(g, 2.5, 6, x + dx, 4, 17.7);
      for (const dx of [-9, 9]) box(g, 1.1, 15, 1, BRICK, x + dx, 7.5, 17.6);
    }
    box(g, 35, 4, 7, BRICK, 0, 2, 21); box(g, 36, 0.6, 8, SLATE, 0, 4.2, 21);
    sign(g, 'E-WERK', 18, 0, 5.5, 24.65);
    box(g, 7, 26, 7, BRICK, -24, 13, 7); cornice(g, 7, 7, 25, LIGHT, -24, 7);
    dome(g, 5, 5, 0x5b625d, -24, 26, 7); cyl(g, 1.8, 1.8, 3, 0x5b625d, -24, 32, 7, 8);
    cone(g, 2.8, 5, 0x5b625d, -24, 36, 7, 8);
    for (const y of [8, 16, 22]) arch(g, 2, 3.5, -24, y - 2, 10.6);
  });

  // Riphahn's cantilevered glass pavilion on a round fortification base.
  register('bastei', 'Bastei am Rheinufer', 'https://www.stadt-koeln.de/mediaasset/content/pdf480/tag_des_offenen_denkmals_2017_mit_%C3%84nderungen_st._gertrud.pdf', (g) => {
    cyl(g, 10, 11, 8, 0x9d9687, 0, 4, -3, 16);
    cyl(g, 17, 17, 0.8, 0xd8d8c9, 0, 8.4, 1, 16);
    cyl(g, 14.5, 14.5, 4.7, 0x72959d, 0, 11.1, 1, 16);
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, x = Math.sin(a) * 14.7, z = 1 + Math.cos(a) * 14.7;
      box(g, 0.42, 5, 0.42, LIGHT, x, 11.2, z);
      const rib = box(g, 0.32, 0.45, 18, LIGHT, 0, 14.6, 1); rib.rotation.y = a;
    }
    cone(g, 18.8, 4.8, 0x687b72, 0, 15.1, 1, 16);
    cyl(g, 18.9, 18.9, 0.5, LIGHT, 0, 12.8, 1, 16);
    box(g, 13, 8, 8, 0xc9c3b2, 0, 4, -14); box(g, 14, 0.5, 9, 0x63736c, 0, 8.3, -14);
    sign(g, 'BASTEI', 11, 0, 6.4, 10.4);
    for (let i = 0; i < 4; i++) box(g, 8, 0.5, 1.6, STONE, 0, 0.25 + i * 0.5, 17 - i * 1.6);
  });

  // Ehrenfeld's former municipal baths: cream Jugendstil frontage and green dome.
  register('neptunbad', 'Neptunbad · Ehrenfeld', 'https://neptunbad.de/', (g) => {
    box(g, 42, 12, 25, 0xd8caa9, 0, 6, -1); roof(g, 43, 6, 26, 0x637468, 0, 12, -1);
    box(g, 15, 17, 6, 0xe9dfc1, 0, 8.5, 11); roof(g, 16, 8, 7, 0xe9dfc1, 0, 17, 11);
    cyl(g, 7.6, 7.6, 4, 0xb5b29b, 0, 17, -4, 12); dome(g, 8.6, 7.5, 0x72927f, 0, 19, -4);
    cyl(g, 1.8, 2.4, 2.5, 0x4b6556, 0, 27, -4, 8); cone(g, 2.3, 3, 0x4b6556, 0, 29.5, -4, 8);
    for (const x of [-16, -10, 10, 16]) {
      arch(g, 3.4, 6, x, 2, 11.6); window(g, 2.6, 2.2, x, 10.2, 11.65);
      box(g, 0.7, 11.5, 0.6, 0xb7a98b, x + 2.4, 5.75, 11.8);
    }
    for (const x of [-4.5, 0, 4.5]) arch(g, 2.7, 5.5, x, 1, 14.1);
    arch(g, 5, 5.8, 0, 10.3, 14.2); sign(g, 'NEPTUNBAD', 15, 0, 8.1, 14.25, '#62766a');
    for (const x of [-7, 7]) { cyl(g, 0.55, 0.7, 15, 0xe8dfc5, x, 7.5, 14.3, 8); cone(g, 1, 1.5, 0xb9af97, x, 16, 14.3, 8); }
  });

  // Rodenkirchen's riverside Kapellchen: modest whitewashed hall and slim spire.
  register('altstmaternus', 'Alt St. Maternus · Kapellchen', 'https://www.rheinbogen-kirche.de/kirchen/alt-st-maternus/', (g) => {
    box(g, 14, 10, 23, 0xe2dfcf, -2, 5, -1); roof(g, 15, 6, 24, SLATE, -2, 10, -1);
    box(g, 7, 7, 21, 0xd2cdb7, 8, 3.5, 0); roof(g, 8, 4, 22, SLATE, 8, 7, 0);
    apse(g, 6, 9, -2, -11, 0xe2dfcf, SLATE);
    tower(g, 6.5, 20, -2, 7.5, 0xe2dfcf, SLATE, 14);
    box(g, 16, 7, 5, 0xe2dfcf, 1, 3.5, 12); roof(g, 17, 5, 6, SLATE, 1, 7, 12);
    arch(g, 3, 5, -2, 0, 14.6); sign(g, 'ALT ST. MATERNUS', 15, 0, 6.3, 14.65);
    for (const z of [-7, 0]) arch(g, 2, 4.8, -9.05, 3, z, DARK, -Math.PI / 2);
    box(g, 25, 1.6, 1, STONE, 0, 0.8, 17); box(g, 1, 1.6, 31, STONE, -12, 0.8, 1);
  });

  // Long campus frontage with its coloured central glazing and Albertus statue.
  register('unikoeln', 'Universität zu Köln · Hauptgebäude', 'https://uocmaps.uni-koeln.de/?building=100', (g) => {
    box(g, 64, 16, 24, 0xd5c9b7); cornice(g, 64, 24, 16, LIGHT);
    for (const x of [-25, 25]) box(g, 14, 16, 10, 0xd5c9b7, x, 8, -15);
    for (let x = -28; x <= 28; x += 4) {
      if (Math.abs(x) < 9) continue;
      for (const y of [4, 8.2, 12.4]) window(g, 2.1, 2.8, x, y, 12.1);
    }
    box(g, 17, 13, 0.5, DARK, 0, 6.5, 12.25);
    const glass = [0x558a92, 0xc4944a, 0x906963, 0x788e73, 0xc4b870];
    for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) box(g, 2.1, 2.8, 0.25, glass[(i + j * 3) % glass.length], -7.2 + i * 2.4, 1.7 + j * 3.05, 12.6);
    box(g, 21, 0.6, 5, 0xe4dfd1, 0, 4, 14); sign(g, 'UNIVERSITÄT ZU KÖLN', 31, 0, 14.5, 12.6);
    // Seated Albertus Magnus; a recognizable scale cue on the square.
    box(g, 3, 0.7, 3, 0xafa592, 13, 0.35, 18); box(g, 1.8, 2.3, 1.6, 0x425c50, 13, 1.85, 18);
    box(g, 1.6, 2.2, 1, 0x425c50, 13, 3, 17.8);
    part(g, new THREE.SphereGeometry(0.6, 8, 6), 0x425c50, 13, 4.4, 17.9);
    for (const x of [12.5, 13.5]) box(g, 0.4, 1.7, 0.5, 0x425c50, x, 1.2, 19);
    box(g, 1.6, 0.22, 1, 0x6c7d62, 13, 2.7, 19);
  });

  // Neusser Platz: neo-Gothic hall and a deliberately spireless square belfry.
  register('agnes', 'St. Agnes · Neusser Platz', 'https://www.koelntourismus.de/kunst-kultur/sehenswuerdigkeiten/detail/st-agnes', (g) => {
    const stone = 0xd0c6ae, red = 0xa7725e;
    box(g, 24, 24, 48, stone, 0, 12, -2); roof(g, 25, 10, 49, SLATE, 0, 24, -2);
    box(g, 39, 21, 17, stone, 0, 10.5, -13);
    const transept = roof(g, 18, 9, 40, SLATE, 0, 21, -13); transept.rotation.y = Math.PI / 2;
    cyl(g, 10.5, 10.5, 22, stone, 0, 11, -25, 8); cone(g, 11.2, 10, SLATE, 0, 27, -25, 8);
    for (const side of [-1, 1]) for (const z of [-20, -8, 4, 16]) {
      pointed(g, 3.7, 12, side * 12.06, 7, z, DARK, side * Math.PI / 2);
      box(g, 1, 23, 1.7, red, side * 12.25, 11.5, z + 3.8);
    }
    box(g, 14, 49, 14, stone, 0, 24.5, 23);
    for (const y of [15, 29, 46.5, 49]) cornice(g, 14, 14, y, red, 0, 23);
    for (let side = 0; side < 4; side++) {
      const a = side * Math.PI / 2;
      for (const dx of [-3, 3]) {
        const x = Math.sin(a) * 7.1 + Math.cos(a) * dx, z = 23 + Math.cos(a) * 7.1 - Math.sin(a) * dx;
        pointed(g, 3.4, 13, x, 32, z, DARK, a);
      }
      pointed(g, 3, 9, Math.sin(a) * 7.15, 18, 23 + Math.cos(a) * 7.15, DARK, a);
    }
    // Open-looking parapet and four little pinnacles, never a generic steeple.
    box(g, 12, 0.5, 12, SLATE, 0, 48.7, 23);
    for (const x of [-6, 6]) for (const z of [17, 29]) {
      box(g, 1.6, 5, 1.6, stone, x, 50.5, z); cone(g, 1.2, 2.4, red, x, 54.2, z, 4);
    }
    for (const x of [-4, 0, 4]) box(g, 1, 1.6, 0.8, stone, x, 49.9, 30);
    pointed(g, 5.2, 10, 0, 0, 30.15); sign(g, 'ST. AGNES', 12, 0, 12.4, 30.25);
  });

  // Ten-sided central body, long choir and paired eastern towers—not a generic basilica.
  register('gereon', 'St. Gereon · Dekagon', 'https://www.stgereon.de/kirchen/st-gereon/', (g) => {
    const pale = 0xc9b99d, red = 0x9d6b51;
    box(g, 19, 20, 32, pale, 0, 10, -25); roof(g, 20, 9, 33, 0x825b49, 0, 20, -25);
    apse(g, 9.5, 21, 0, -41, pale, 0x825b49);
    for (const x of [-12, 12]) tower(g, 7.5, 33, x, -36, pale, SLATE, 13);
    // Rotate the polygon geometry before stretching its north/south axis. An
    // object rotation would turn that stretch too and bury the facade windows.
    const base = cyl(g, 18, 18, 28, pale, 0, 14, 3, 10); base.geometry.rotateY(Math.PI / 10); base.scale.z = 1.13;
    for (const y of [10, 20, 28]) {
      const band = cyl(g, 18.25, 18.25, 0.65, red, 0, y, 3, 10); band.geometry.rotateY(Math.PI / 10); band.scale.z = 1.13;
    }
    const cap = cyl(g, 9, 19, 9, SLATE, 0, 32.5, 3, 10); cap.geometry.rotateY(Math.PI / 10); cap.scale.z = 1.13;
    const top = cone(g, 9, 6, SLATE, 0, 40, 3, 10); top.geometry.rotateY(Math.PI / 10); top.scale.z = 1.13;
    cross(g, 0, 44, 3);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5, radius = 18 * Math.cos(Math.PI / 10) + 0.12;
      const x = Math.sin(a) * radius, z = 3 + Math.cos(a) * radius * 1.13;
      // Facade normals differ from radial angles on the elongated decagon.
      const facing = Math.atan2(Math.sin(a) * 1.13, Math.cos(a));
      arch(g, 3.4, 8, x, 17.8, z, DARK, facing);
      arch(g, 3, 5.4, x, 3, z, DARK, facing);
      const buttress = box(g, 0.9, 28, 1.3, red, Math.sin(a + Math.PI / 10) * 18.2, 14, 3 + Math.cos(a + Math.PI / 10) * 20.55);
      buttress.rotation.y = a + Math.PI / 10;
    }
    box(g, 16, 8, 9, pale, 0, 4, 23); roof(g, 17, 4, 10, 0x825b49, 0, 8, 23);
    arch(g, 4.7, 6.4, 0, 0, 27.6); sign(g, 'ST. GEREON', 14, 0, 9, 28.1);
  });

  // Roonstraße: neo-Romanesque rose window, pyramidal roof and slender corner turrets.
  register('synagoge', 'Synagoge Roonstraße', 'https://willkommen.koelntourismus.de/sehenswuerdigkeiten/synagoge', (g) => {
    const stone = 0xc4b89e, trim = 0x9e8b70, roofColor = 0x657069;
    box(g, 39, 21, 36, stone, 0, 10.5, -1); cornice(g, 39, 36, 20.7, trim, 0, -1);
    box(g, 25, 8, 25, stone, 0, 25, -3);
    const cap = cone(g, 21, 17, roofColor, 0, 37.5, -3, 4); cap.rotation.y = Math.PI / 4;
    roof(g, 31, 11, 1.3, stone, 0, 21, 17.6);
    for (const x of [-17, 17]) {
      cyl(g, 2.5, 2.5, 29, stone, x, 14.5, 17, 8);
      for (const y of [10, 20, 28]) cyl(g, 2.7, 2.7, 0.6, trim, x, y, 17, 8);
      cone(g, 3.2, 8, roofColor, x, 33, 17, 8); arch(g, 1.3, 5, x, 21, 19.55);
    }
    for (const x of [-7, 0, 7]) {
      arch(g, 5, 8, x, 0.5, 18.4);
      for (const dx of [-2.6, 2.6]) cyl(g, 0.4, 0.4, 5.5, trim, x + dx, 3.25, 18.6, 8);
    }
    // Round rose window with six-point tracery drawn as two original triangle outlines.
    const pane = cyl(g, 5.1, 5.1, 0.15, 0x496c76, 0, 18, 18.45, 18); pane.rotation.x = Math.PI / 2;
    part(g, new THREE.TorusGeometry(5.4, 0.55, 5, 18), trim, 0, 18, 18.6);
    for (const flip of [0, Math.PI]) for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3 + flip, b = (i + 1) * Math.PI * 2 / 3 + flip;
      const x1 = Math.sin(a) * 4.4, y1 = Math.cos(a) * 4.4, x2 = Math.sin(b) * 4.4, y2 = Math.cos(b) * 4.4;
      const bar = box(g, Math.hypot(x2 - x1, y2 - y1), 0.24, 0.18, LIGHT, (x1 + x2) / 2, 18 + (y1 + y2) / 2, 18.85);
      bar.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    }
    for (const side of [-1, 1]) for (const z of [-12, -3, 6]) arch(g, 3, 9, side * 19.56, 8, z, DARK, side * Math.PI / 2);
    sign(g, 'SYNAGOGE · ROONSTRASSE', 26, 0, 10.4, 18.9);
    for (let i = 0; i < 3; i++) box(g, 29, 0.4, 1.3, LIGHT, 0, 0.2 + i * 0.4, 22 - i * 1.3);
  });

  // The Neumarkt legend is told by two white horse heads peering from high windows.
  register('richmodisturm', 'Richmodisturm · Zwei Päädsköpp', 'https://www.kuladig.de/Objektansicht/KLD-298065', (g) => {
    const brick = 0xa56e50, cream = 0xd3bc94;
    box(g, 17, 19, 14, 0xc4ae90, -7, 9.5, -3); roof(g, 18, 7, 15, 0x54615a, -7, 19, -3);
    const shaft = cyl(g, 4.9, 5.3, 32, brick, 0, 16, 5, 8); shaft.rotation.y = Math.PI / 8;
    for (const y of [6, 12, 18, 23, 30.5]) {
      const band = cyl(g, 5.2, 5.2, 0.6, cream, 0, y, 5, 8); band.rotation.y = Math.PI / 8;
    }
    const cap = cone(g, 5.6, 11, 0x4f665b, 0, 37.5, 5, 8); cap.rotation.y = Math.PI / 8;
    cyl(g, 0.13, 0.13, 3, 0x6d785d, 0, 44, 5, 6);
    for (const a of [0, Math.PI / 4, -Math.PI / 4]) for (const y of [8, 15, 24]) {
      arch(g, 2.2, 4.2, Math.sin(a) * 4.91, y, 5 + Math.cos(a) * 4.91, DARK, a);
    }
    for (const a of [0, Math.PI / 4]) {
      const horse = new THREE.Group(); horse.name = 'Richmodis-Pferdekopf';
      horse.position.set(Math.sin(a) * 4.95, 25, 5 + Math.cos(a) * 4.95); horse.rotation.y = a;
      const neck = box(horse, 1, 1.9, 0.9, 0xeee9d7, 0, 0.35, 0.2); neck.rotation.x = -0.25;
      box(horse, 1.15, 1, 1.7, 0xeee9d7, 0, 1.45, 0.65);
      box(horse, 1.05, 0.7, 0.75, 0xded7c5, 0, 1.14, 1.7);
      for (const x of [-0.35, 0.35]) cone(horse, 0.22, 0.8, 0xeee9d7, x, 2.3, 0.1, 4);
      for (const x of [-0.6, 0.6]) box(horse, 0.1, 0.2, 0.2, DARK, x, 1.65, 0.7);
      box(horse, 0.24, 1.6, 0.4, 0xc4bcab, 0, 0.8, -0.26); g.add(horse);
    }
    for (const x of [-12, -7]) for (const y of [5, 11, 16]) window(g, 2.4, 3, x, y, 4.1);
    arch(g, 3.3, 5.4, 0, 0, 10.1); sign(g, 'RICHMODISTURM', 13, -4, 4.3, 10.25);
  });

  // Historic Tor II on Aachener Straße, not today's principal Piusstraße entrance.
  register('melaten', 'Melaten · Historisches Tor II', 'https://www.stadt-koeln.de/mediaasset/bilder/gruen/pdfua_stk_67_melaten_einzelseiten_231124.pdf', (g) => {
    const stone = 0xb8a88f, trim = 0xd4c5a5;
    for (const x of [-15, 15]) { box(g, 19, 5.2, 1.8, stone, x, 2.6, 7); box(g, 19.4, 0.45, 2.2, trim, x, 5.3, 7); }
    for (const x of [-5.5, 5.5]) {
      box(g, 3, 8, 3, stone, x, 4, 7); box(g, 3.4, 0.6, 3.5, trim, x, 0.4, 7);
      box(g, 3.7, 0.5, 3.5, trim, x, 7.7, 7);
      for (const dx of [-0.9, 0.9]) box(g, 0.45, 6.7, 0.35, trim, x + dx, 4.1, 8.6);
    }
    box(g, 14.4, 2.1, 3.4, trim, 0, 8.8, 7); box(g, 15.2, 0.45, 3.8, stone, 0, 10, 7);
    roof(g, 15, 3.2, 3.6, stone, 0, 10.2, 7);
    sign(g, 'FUNERIBUS AGRIPPINENSIUM SACER LOCUS', 13.5, 0, 8.7, 8.8, '#716857');
    // Fine iron gates leave the archway visually open onto a short tree-lined path.
    for (let x = -3.8; x <= 3.8; x += 0.76) box(g, 0.12, 6, 0.12, 0x35463e, x, 3, 7);
    for (const y of [1.5, 4.2, 5.6]) box(g, 8.2, 0.12, 0.14, 0x35463e, 0, y, 7);
    box(g, 10, 0.14, 27, 0xb8b39a, 0, 0.08, -7.5);
    for (const x of [-8.5, 8.5]) for (const z of [-2, -12, -21]) {
      cyl(g, 0.5, 0.75, 7, 0x6c604b, x, 3.5, z, 7);
      const crown = part(g, new THREE.IcosahedronGeometry(4.6, 0), 0x627d46, x, 9.2, z); crown.scale.y = 1.25;
    }
    sign(g, 'MELATEN · TOR II', 12, -16, 3.8, 8.05, '#596648');
  });

  // The surviving four-storey mill tower has no sails: a round stone landmark on a green mound.
  register('bottmuehle', 'Bottmühle · Severinswall', 'https://www.kuladig.de/Objektansicht/O-69809-20130716-3', (g) => {
    const stone = 0x7f8074, trim = 0x9b947d;
    cyl(g, 14, 16, 3.4, 0x77776a, 0, 1.7, 0, 16);
    cyl(g, 12.4, 14.3, 2.5, 0x617a40, 0, 4.1, 0, 16);
    cyl(g, 7.4, 8, 24, stone, 0, 17.2, 0, 16);
    for (const y of [6, 12, 18, 24, 29.3]) cyl(g, 8.15 - (y - 6) * 0.025, 8.15 - (y - 6) * 0.025, 0.5, trim, 0, y, 0, 16);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      for (const y of [8, 14, 20, 25]) {
        const r = 8.02 - (y - 6) * 0.025;
        arch(g, y === 8 ? 2.4 : 1.5, y === 8 ? 3.4 : 2.5, Math.sin(a) * r, y - 1.3, Math.cos(a) * r, DARK, a);
      }
      const tooth = box(g, 2.1, 1.5, 1.1, stone, Math.sin(a) * 7.2, 30.1, Math.cos(a) * 7.2); tooth.rotation.y = a;
    }
    cyl(g, 6.8, 6.8, 0.2, 0x4c564b, 0, 29.1, 0, 16);
    // A steep little access stair and railing explain its raised position at the wall.
    for (let i = 0; i < 7; i++) box(g, 3, 0.75, 1.1, trim, 0, 0.375 + i * 0.75, 15.4 - i * 1.1);
    for (const x of [-1.8, 1.8]) for (let i = 0; i < 4; i++) box(g, 0.13, 1.7, 0.13, DARK, x, 1.4 + i * 1.5, 14.8 - i * 2.2);
    cyl(g, 0.12, 0.12, 6, 0x9a9c8b, 0, 32.4, 0, 6); box(g, 2.4, 1.4, 0.08, 0xc4483b, 1.2, 34.5, 0);
    sign(g, 'BOTTMÜHLE', 11, 0, 3.1, 15.1, '#566847');
  });

  // Ülepooz: the old gate, attached mill tower and low caponier are one ensemble.
  // The present mill tower has a slate cap, not working windmill sails.
  register('ulrepforte', 'Ulrepforte · Ülepooz', 'https://rote-funken.de/historie/', (g) => {
    const stone = 0xa7997d, trim = 0xc4b494;
    box(g, 28, 10, 12, stone, 0, 5, 0);
    for (const x of [-12, 12]) {
      cyl(g, 4.9, 4.9, 14, stone, x, 7, 3, 12);
      cyl(g, 5.3, 5.3, 0.7, trim, x, 13.8, 3, 12);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const tooth = box(g, 1.7, 1.6, 1.1, stone, x + Math.sin(a) * 4.55, 14.8, 3 + Math.cos(a) * 4.55);
        tooth.rotation.y = a;
      }
      arch(g, 1.4, 3.5, x, 7, 7.96);
    }
    cyl(g, 6.1, 6.5, 25, 0xa28e71, -6, 12.5, -5, 16);
    for (const y of [11, 20, 24.5]) cyl(g, 6.45, 6.45, 0.6, trim, -6, y, -5, 16);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      arch(g, 1.6, 4.5, -6 + Math.sin(a) * 6.26, 17, -5 + Math.cos(a) * 6.26, DARK, a);
    }
    cone(g, 7.2, 10, SLATE, -6, 30, -5, 8);
    cyl(g, 1.8, 1.8, 4, 0xa28e71, -6, 36, -5, 8);
    cone(g, 2.7, 7, SLATE, -6, 41.5, -5, 8);
    box(g, 27, 4.5, 16, stone, 5, 2.25, -12); box(g, 28, 0.5, 17, 0x657044, 5, 4.75, -12);
    for (const x of [-20, 20]) { box(g, 8, 7, 2, stone, x, 3.5, 0); cornice(g, 8, 2, 7, trim, x, 0); }
    arch(g, 5, 7, 0, 0, 6.12); sign(g, 'ULREPFORTE', 15, 0, 9, 6.2);
    // Red-and-white Funken colours are a small present-day local clue.
    for (const x of [-3.7, 3.7]) { box(g, 0.45, 5, 0.18, 0xb83634, x, 3, 6.3); box(g, 0.45, 1.4, 0.2, LIGHT, x, 4.3, 6.4); }
  });

  // Five window axes and a deep stepped gable distinguish this medieval town house.
  register('overstolzenhaus', 'Overstolzenhaus · Rheingasse', 'https://www.khm.de/bib_ueber_uns/', (g) => {
    const stone = 0xb6a083, trim = 0xd5bc95;
    box(g, 25, 20, 23, stone); roof(g, 25.5, 14, 24, SLATE, 0, 20, 0);
    for (let tier = 0; tier < 5; tier++) {
      const w = 25 - tier * 4.8, y = 20 + tier * 2.8;
      box(g, w, 2.8, 1, stone, 0, y + 1.4, 11.8);
      box(g, w + 0.4, 0.4, 1.3, trim, 0, y + 2.8, 11.8);
      for (let x = -w / 2 + 2.5; x <= w / 2 - 2; x += 4.8) arch(g, 1.25, 1.8, x, y + 0.4, 12.36);
    }
    for (const y of [1.4, 10, 19.8]) box(g, 25.8, 0.6, 1, trim, 0, y, 11.7);
    for (let x = -9.6; x <= 9.6; x += 4.8) {
      for (const y of [4, 12]) {
        arch(g, 3.6, 5.9, x, y, 11.55, trim);
        for (const dx of [-0.88, 0.88]) arch(g, 1.45, 4.8, x + dx, y + 0.45, 11.62);
        cyl(g, 0.17, 0.23, 4.2, trim, x, y + 2.55, 11.85, 8);
      }
      box(g, 0.45, 18, 0.6, trim, x + 2.35, 10.5, 11.8);
    }
    arch(g, 3.8, 5, -9.6, 0, 11.96); sign(g, 'OVERSTOLZENHAUS', 21, 0, 2.8, 12.1);
    for (const side of [-1, 1]) for (const z of [-7, 0, 7]) for (const y of [6, 14]) window(g, 2.3, 3.7, side * 12.57, y, z, side * Math.PI / 2);
  });

  // St. Severin's tall Gothic west tower and two much smaller choir towers.
  register('severin', 'St. Severin · Vringsveedel', 'https://www.st-severin-koeln.de/kirchen/st.-severin/bau/', (g) => {
    const stone = 0xc8b99d, trim = 0xa58d71;
    nave(g, 20, 18, 42, 0, -1, stone, SLATE);
    for (const x of [-13, 13]) { box(g, 7, 10, 40, stone, x, 5, -1); roof(g, 8, 4.5, 41, SLATE, x, 10, -1); }
    box(g, 34, 21, 15, stone, 0, 10.5, -18);
    const choir = cyl(g, 10, 10, 21, stone, 0, 10.5, -28, 8); choir.rotation.y = Math.PI / 8;
    const choirRoof = cone(g, 10.8, 9, SLATE, 0, 25.5, -28, 8); choirRoof.rotation.y = Math.PI / 8;
    for (const x of [-11, 11]) tower(g, 5.5, 28, x, -24, stone, SLATE, 10);
    box(g, 12, 38, 12, stone, 0, 19, 21);
    for (const y of [13, 25, 37.5]) cornice(g, 12, 12, y, trim, 0, 21);
    for (const x of [-5.7, 5.7]) for (const z of [15.3, 26.7]) {
      box(g, 1.6, 35, 1.6, trim, x, 17.5, z);
      cone(g, 1.4, 4.5, stone, x, 39.5, z, 4);
    }
    for (let side = 0; side < 4; side++) {
      const a = side * Math.PI / 2;
      for (const dx of [-2.3, 2.3]) pointed(g, 3, 10, Math.sin(a) * 6.08 + Math.cos(a) * dx, 26, 21 + Math.cos(a) * 6.08 - Math.sin(a) * dx, DARK, a);
    }
    // A broad lower pitch changes into the very slender slate Knickhelm.
    const skirt = cyl(g, 3.1, 9.2, 7, SLATE, 0, 41.5, 21, 4); skirt.rotation.y = Math.PI / 4;
    cone(g, 3.3, 19, SLATE, 0, 54.5, 21, 8); cross(g, 0, 65, 21);
    pointed(g, 5, 11, 0, 12, 27.12); pointed(g, 4.5, 8, 0, 0, 27.15);
    sign(g, 'ST. SEVERIN', 13, 0, 10, 27.2);
    for (const side of [-1, 1]) for (const z of [-12, -3, 6, 15]) pointed(g, 2.6, 6, side * 16.56, 2, z, DARK, side * Math.PI / 2);
  });

  // The square westwork carries Ursula's unmistakable crown, not a pointed spire.
  register('ursula', 'St. Ursula · Goldene Kammer', 'https://www.romanische-kirchen-koeln.de/grosse-kirchen/st-ursula/westbau-mit-schatzkammer/', (g) => {
    const stone = 0xc5b08d, trim = 0xa48363, copper = 0x62736b, gold = 0xcfb362;
    nave(g, 20, 20, 43, 0, -3, stone, SLATE);
    for (const x of [-12, 12]) { box(g, 6, 12, 40, stone, x, 6, -3); roof(g, 7, 4, 41, SLATE, x, 12, -3); }
    const choir = cyl(g, 9, 9, 22, stone, 0, 11, -28, 8); choir.rotation.y = Math.PI / 8;
    const choirRoof = cone(g, 10, 9, SLATE, 0, 26.5, -28, 8); choirRoof.rotation.y = Math.PI / 8;
    box(g, 31, 16, 11, stone, 0, 8, 21); roof(g, 32, 5.5, 12, SLATE, 0, 16, 21);
    box(g, 13, 34, 13, stone, 0, 17, 21);
    for (const y of [12, 24, 33.6]) cornice(g, 13, 13, y, trim, 0, 21);
    for (let side = 0; side < 4; side++) {
      const a = side * Math.PI / 2;
      for (const dx of [-2.4, 2.4]) arch(g, 2.6, 5.6, Math.sin(a) * 6.58 + Math.cos(a) * dx, 26, 21 + Math.cos(a) * 6.58 - Math.sin(a) * dx, DARK, a);
    }
    const base = cyl(g, 3.8, 9.4, 5, copper, 0, 36.5, 21, 4); base.rotation.y = Math.PI / 4;
    const bulb = part(g, new THREE.SphereGeometry(4.9, 12, 8), copper, 0, 40.5, 21); bulb.scale.y = 0.78;
    cyl(g, 2.6, 3.9, 3, copper, 0, 44.8, 21, 8);
    cyl(g, 3.1, 3.1, 0.5, gold, 0, 46.5, 21, 12);
    // Open lantern and arched crown ribs preserve the characteristic sky gaps.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      cyl(g, 0.2, 0.2, 4.8, gold, Math.sin(a) * 2.5, 49, 21 + Math.cos(a) * 2.5, 6);
      const rib = part(g, new THREE.TorusGeometry(2.65, 0.17, 4, 12, Math.PI), gold, 0, 51.1, 21);
      rib.rotation.y = a; // upper semicircle in the vertical XY plane
    }
    cyl(g, 2.8, 2.8, 0.45, gold, 0, 51.3, 21, 12); cross(g, 0, 55.1, 21);
    for (const x of [-11, -5.5, 5.5, 11]) arch(g, 3.3, 7, x, 2, 26.65, trim);
    arch(g, 4, 7, 0, 0, 27.6); sign(g, 'ST. URSULA', 12, 0, 10, 27.7);
  });

  // Schwarz and Bernard's brick museum: four wings, a real courtyard, parallel gables.
  register('makk', 'MAKK · Museum für Angewandte Kunst', 'https://makk.de/entdecken/das-museum/architektur', (g, options) => {
    const brick = 0xa66e53, trim = 0xd4b79a;
    for (const x of [-20, 20]) { box(g, 10, 17, 40, brick, x, 8.5, 0); roof(g, 10.7, 6, 41, SLATE, x, 17, 0); }
    for (const z of [-15, 15]) {
      box(g, 32, 17, 10, brick, 0, 8.5, z);
      for (const x of [-10.5, 0, 10.5]) roof(g, 10.7, 6, 11, SLATE, x, 17, z);
    }
    for (let x = -22; x <= 22; x += 4) {
      box(g, 0.6, 17, 0.5, trim, x, 8.5, 20.1);
      for (const y of [5.5, 10.5, 15]) window(g, 2.2, 3.1, x + 1.6, y, 20.1);
    }
    for (const side of [-1, 1]) for (let z = -15; z <= 15; z += 5) for (const y of [6, 12]) window(g, 2.2, 3.3, side * 25.07, y, z, side * Math.PI / 2);
    box(g, 11, 4.2, 0.3, DARK, 0, 2.1, 20.3); box(g, 15, 0.5, 4.5, LIGHT, 0, 4.4, 21.5);
    sign(g, options.historic ? 'WALLRAF-RICHARTZ-MUSEUM' : 'MAKK', options.historic ? 25 : 12, 0, 6.2, 20.6);
    // The sheltered Mataré fountain is visible through the open central court.
    box(g, 27, 0.15, 20, 0xb5afa0, 0, 0.08, 0);
    cyl(g, 4.5, 4.5, 0.7, 0xb8ad93, 0, 0.4, 0, 12); cyl(g, 3.8, 3.8, 0.1, 0x7098a4, 0, 0.81, 0, 12);
    box(g, 1, 3.5, 1, 0x60786c, 0, 2.6, 0); dome(g, 0.6, 0.7, 0x60786c, 0, 4.4, 0);
    for (const side of [-1, 1]) { const wing = box(g, 2.5, 0.25, 0.7, 0x60786c, side * 1.2, 3.8, 0); wing.rotation.z = side * 0.55; }
  });

  // The white former abbey church has one square west tower and a separate roof lantern.
  register('altheribert', 'Alt St. Heribert · Abtei Deutz', 'https://www.romanische-kirchen-koeln.de/kleine-kirchen/alt-st-heribert/', (g) => {
    const white = 0xe6e0cd, red = 0xa66853;
    box(g, 19, 20, 37, white, 0, 10, -2); roof(g, 20, 10, 38, SLATE, 0, 20, -2);
    const choir = cyl(g, 9.5, 9.5, 20, white, 0, 10, -20, 8); choir.rotation.y = Math.PI / 8;
    const cap = cone(g, 10.4, 10, SLATE, 0, 25, -20, 8); cap.rotation.y = Math.PI / 8;
    for (const side of [-1, 1]) for (const z of [-13, -4, 5, 14]) {
      pointed(g, 3.5, 13, side * 9.57, 3.2, z, DARK, side * Math.PI / 2);
      box(g, 0.75, 19, 1, 0xbeb8a6, side * 9.75, 9.5, z + 3.4);
    }
    box(g, 10, 28, 10, white, 0, 14, 20); cornice(g, 10, 10, 27.7, red, 0, 20);
    for (const side of [-1, 1]) arch(g, 2.3, 4.7, side * 2, 21, 25.08);
    const towerRoof = cyl(g, 2.2, 7.8, 7, SLATE, 0, 31.5, 20, 4); towerRoof.rotation.y = Math.PI / 4;
    cyl(g, 1.8, 1.8, 4.4, red, 0, 37.2, 20, 8);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; arch(g, 1, 2.6, Math.sin(a) * 1.82, 35.6, 20 + Math.cos(a) * 1.82, DARK, a); }
    dome(g, 2.2, 2.4, SLATE, 0, 39.4, 20); cross(g, 0, 42.8, 20);
    cyl(g, 2.4, 2.4, 4, red, 0, 32, -8, 8); cone(g, 3.3, 4, SLATE, 0, 36, -8, 8);
    cyl(g, 1.3, 1.3, 3.5, red, 0, 39.5, -8, 8); cone(g, 2, 10, SLATE, 0, 46, -8, 8); cross(g, 0, 52, -8);
    arch(g, 3.6, 6, 0, 0, 25.1); sign(g, 'ALT ST. HERIBERT', 17, 0, 8.5, 25.2);
    box(g, 13, 11, 27, 0xddcfb6, 15, 5.5, -2); roof(g, 14, 5, 28, SLATE, 15, 11, -2);
    for (const x of [11, 16, 20]) for (const y of [3.5, 8]) window(g, 2, 2.8, x, y, 11.6);
  });

  // The former Danziger Lagerhaus is nicknamed Siebengebirge but has NINE roof gables.
  register('siebengebirge', 'Siebengebirge · Rheinauhafen', 'https://www.rheinauhafen-koeln.de/architektur/das-siebengebirge', (g) => {
    const brick = 0xc5ac70, trim = 0xe0cca0;
    box(g, 72, 22, 21, brick); cornice(g, 72, 21, 7.2, trim); cornice(g, 72, 21, 21.8, trim);
    for (let i = 0; i < 9; i++) {
      const x = -32 + i * 8, roofHeight = i === 4 ? 10 : 8;
      roof(g, 8.3, roofHeight, 22, SLATE, x, 22, 0);
      roof(g, 7.8, roofHeight - 0.4, 0.6, brick, x, 22, 10.85);
      box(g, 0.7, 22, 0.7, trim, x - 3.7, 11, 10.85);
      for (const y of [3.5, 10.6, 17.4]) for (const dx of [-1.8, 1.8]) arch(g, 1.6, 4.8, x + dx, y - 2.4, 10.61);
      arch(g, 2.3, 3.5, x, 23, 11.19);
      for (const y of [7.5, 14.5, 21.5]) box(g, 7.2, 0.35, 0.5, trim, x, y, 10.8);
      for (const dx of [-2.5, 2.5]) window(g, 2, 3.5, x + dx, 16.8, -10.58, Math.PI);
    }
    sign(g, 'SIEBENGEBIRGE', 24, 0, 8.1, 11.25);
    for (const side of [-1, 1]) for (const z of [-6, 0, 6]) for (const y of [5, 12, 19]) window(g, 2.2, 3.7, side * 36.08, y, z, side * Math.PI / 2);
  });

  // Former airfield terminal, reduced to the white reception hall and control-tower wing.
  register('butzweilerhof', 'Butzweilerhof · Historischer Flughafen', 'https://www.stadt-koeln.de/artikel/06212/index.html', (g) => {
    const white = 0xe2dfce, basalt = 0x52606b, glass = 0x688b96;
    box(g, 52, 9, 18, white); box(g, 53, 0.8, 19, basalt, 0, 0.4, 0);
    box(g, 24, 14, 23, white, -7, 7, 1); box(g, 25, 0.7, 25, basalt, -7, 14.2, 1);
    for (const x of [-15, -11, -7, -3, 1]) {
      window(g, 2.5, 7, x, 7, 12.6); box(g, 0.4, 9, 0.5, basalt, x + 1.8, 7, 12.6);
    }
    box(g, 17, 0.6, 5, white, -7, 4.8, 13.5); sign(g, 'KÖLN', 12, -7, 12, 12.8, '#53616b');
    for (const x of [-23, -19, 9, 13, 17, 21]) window(g, 2.4, 3.8, x, 5, 9.08);
    box(g, 12, 21, 12, white, 25, 10.5, -2); box(g, 13, 0.8, 13, basalt, 25, 21.2, -2);
    box(g, 10, 4, 10, glass, 25, 23.5, -2); box(g, 14, 0.7, 14, basalt, 25, 25.8, -2);
    for (const x of [20.4, 23.4, 26.6, 29.6]) box(g, 0.25, 4, 0.3, white, x, 23.5, 3.1);
    for (const y of [7, 12, 17]) { window(g, 3, 2.8, 25, y, 4.1); window(g, 3, 2.8, 31.08, y, -2, Math.PI / 2); }
    cyl(g, 0.15, 0.15, 8, basalt, 25, 30, -2, 6);
    box(g, 28, 11, 27, white, 20, 5.5, -18); box(g, 29, 0.8, 28, basalt, 20, 11.3, -18);
    box(g, 22, 8, 0.3, basalt, 20, 4.5, -31.6);
    sign(g, 'BUTZWEILERHOF', 27, -5, 2.2, 14.1, '#53616b');
  });
})(window);
