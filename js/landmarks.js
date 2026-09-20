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
})(window);
