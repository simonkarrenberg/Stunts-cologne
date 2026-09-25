/* ============================================================
   STUNTS KÖLLE 4D — branch roads drawn as real Cologne streets.
   Same asphalt or cobbles as the circuit, grey granite curbs, sidewalks,
   parking lanes, tram rails, lamps and trees, the blue street-name sign
   at both corners and a white signpost on the circuit before the junction.
   Houses along a street are placed by World.buildScenery (placeStreetWalls)
   so the city's clearance and landmark rules apply to them too.
   ============================================================ */
(function (root) {
  'use strict';
  const W = root.World;
  const PARK = 2.2, WALK = 3.2;

  // Gameplay and rendering agree on where things stand on a street.
  const RouteExtras = root.RouteExtras = {
    parking(route) { return route.perks.includes('parked') ? PARK : 0; },
    obstacles(route) { // a market stall and a stack of Kölsch crates narrow a Gasse from alternating sides
      if (!route.perks.includes('market')) return [];
      const hw = route.halfWidth;
      return [{ d: route.length * 0.4, lat: -(hw - 1.25), r: 1.25, kind: 'marktstand' }, { d: route.length * 0.66, lat: hw - 1.05, r: 1.0, kind: 'kisten' }];
    },
    koelsch(route) { return route.perks.includes('koelsch') ? [0.34, 0.68].map((f, i) => ({ d: route.length * f, lat: i ? 1.2 : -1.2 })) : []; },
    // For each branch sample: its lateral position in the circuit's frame, to tell
    // which parts of the street lie outside the circuit's own road and sidewalks.
    profile(track, route) {
      if (route._profile) return route._profile;
      const S = track.samples, n = S.length, out = [];
      for (const q of route.samples) {
        const h0 = Math.round((route.startS + q.s * (route.endS - route.startS) / route.length) / track.ds);
        let best = 1e18, bi = h0;
        for (let k = -70; k <= 70; k++) { const i = ((h0 + k) % n + n) % n, p = S[i].p, d = (p.x - q.p.x) ** 2 + (p.z - q.p.z) ** 2; if (d < best) { best = d; bi = i; } }
        const m = S[bi], bl = Math.hypot(m.B.x, m.B.z) || 1;
        out.push({ lat: ((q.p.x - m.p.x) * m.B.x + (q.p.z - m.p.z) * m.B.z) / bl, bd: Math.sign(q.B.x * m.B.x + q.B.z * m.B.z) || 1, mainY: m.p.y, flat: m.p.y < 1.5 });
      }
      return (route._profile = out);
    }
  };

  // a stack of Kölsch crates in front of a Büdchen: red and blue crates, bottle caps on top
  function kisten(seed) {
    const g = new THREE.Group(), cols = [0xc1121f, 0x1c3f95, 0xc1121f, 0xd9a24a];
    const m = (c) => new THREE.MeshLambertMaterial({ color: c });
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3 - (x === 2 ? 1 : 0); y++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.42), m(cols[(x + y + seed) % cols.length]));
      crate.position.set((x - 1) * 0.66, 0.16 + y * 0.33, 0); g.add(crate);
      if (y === (x === 2 ? 1 : 2)) for (let b = 0; b < 3; b++) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 6), m(0x7a4a1a)); cap.position.set((x - 1) * 0.66 + (b - 1) * 0.18, 0.2 + y * 0.33 + 0.12, 0); g.add(cap); }
    }
    return g;
  }

  W.buildShortcutRoads = function (track, theme) {
    const group = new THREE.Group(), routes = track.shortcuts || [];
    // The later scenery pass keeps procedural trees out of sign faces and the
    // last few metres of their approach. Rebuilding a course resets the plots.
    track.wayfinderKeepouts = [];
    if (!routes.length) return group;
    const T = root.Pixel.T, P = W.P, ROAD_W = W.ROAD_W;
    const surfaces = new Map(); let surfaceBatch;
    const ppos = [], pcol = [], pidx = []; let pvi = 0;
    const cRoad = new THREE.Color(theme.road[0]), cRoad2 = new THREE.Color(theme.road[1]);
    const cCurb = new THREE.Color(theme.night ? 0x4f5058 : 0x9a9994), cWalk = new THREE.Color(theme.night ? 0x2e2e38 : 0x8f8a82);
    const cLine = new THREE.Color(theme.night ? 0xa8a8b0 : 0xf6f6f2), cRail = new THREE.Color(0x2c2c30), cRailTop = new THREE.Color(theme.night ? 0x6a6a72 : 0xb8b8bc);
    const cPark = new THREE.Color(theme.night ? 0x2a2a33 : 0x6c6c70);
    const quad = (a, b, c, d, color, u0, u1, v0, v1) => {
      const { pos, col, uv, idx } = surfaceBatch, vi = surfaceBatch.vi;
      for (const p of [a, b, c, d]) { pos.push(p[0], p[1], p[2]); col.push(color.r, color.g, color.b); }
      uv.push(u0, v0, u1, v0, u0, v1, u1, v1); idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3); surfaceBatch.vi += 4;
    };
    const paint = (a, b, c, d, color) => {
      for (const p of [a, b, c, d]) { ppos.push(p[0], p[1], p[2]); pcol.push(color.r, color.g, color.b); }
      pidx.push(pvi, pvi + 2, pvi + 1, pvi + 1, pvi + 2, pvi + 3); pvi += 4;
    };
    const at = (f, lat, h) => [f.p.x + f.B.x * lat, f.p.y + h, f.p.z + f.B.z * lat];
    const clearOfMain = (pr, lat, margin) => !pr.flat || Math.abs(pr.lat + lat * pr.bd) > margin;
    // A spatial index covers ALL driving lanes. A lamp clear of the main road
    // can otherwise stand directly in the sibling of a three-way junction.
    const lanes = new Map(), CELL = 16, laneReach = Math.max(ROAD_W, ...routes.map((r) => r.halfWidth)) + 0.65;
    const addLane = (q, halfWidth, routeId) => {
      const key = Math.floor(q.p.x / CELL) + ',' + Math.floor(q.p.z / CELL);
      if (!lanes.has(key)) lanes.set(key, []);
      lanes.get(key).push({ p: q.p, halfWidth, routeId });
    };
    for (const q of track.samples) addLane(q, ROAD_W, null);
    for (const r of routes) for (const q of r.samples) addLane(q, r.halfWidth, r.id);
    const near = (minX, maxX, minZ, maxZ, visit) => {
      for (let x = Math.floor((minX - laneReach) / CELL); x <= Math.floor((maxX + laneReach) / CELL); x++)
        for (let z = Math.floor((minZ - laneReach) / CELL); z <= Math.floor((maxZ + laneReach) / CELL); z++)
          for (const q of lanes.get(x + ',' + z) || []) if (visit(q)) return true;
      return false;
    };
    const edgeClear = (f, lat, ignored) => {
      const p = at(f, lat, 0);
      return !near(p[0], p[0], p[2], p[2], (q) => q.routeId !== ignored && Math.abs(q.p.y - p[1]) < 1.5 &&
        Math.hypot(q.p.x - p[0], q.p.z - p[2]) < q.halfWidth + 0.5);
    };
    const propClear = (obj, ignored) => {
      obj.updateMatrixWorld(true); let blocked = false;
      obj.traverse((mesh) => {
        if (blocked || !mesh.isMesh || !mesh.geometry) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const b = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        blocked = near(b.min.x, b.max.x, b.min.z, b.max.z, (q) => {
          if (ignored && q.routeId === ignored) return false;
          if (b.max.y < q.p.y + 0.3 || b.min.y > q.p.y + 3.5) return false;
          const dx = Math.max(b.min.x - q.p.x, 0, q.p.x - b.max.x), dz = Math.max(b.min.z - q.p.z, 0, q.p.z - b.max.z);
          return dx * dx + dz * dz < (q.halfWidth + 0.6) ** 2;
        });
      });
      return !blocked;
    };
    const addProp = (obj, f, lat, faceStreet, kind, ignored, turn) => {
      obj.position.set(f.p.x + f.B.x * lat, W.GROUND_Y, f.p.z + f.B.z * lat);
      if (faceStreet) obj.lookAt(f.p.x, W.GROUND_Y, f.p.z); else obj.rotation.y = Math.atan2(f.T.x, f.T.z);
      obj.rotation.y += turn || 0;
      obj.userData.kind = kind || 'streetFurniture';
      if (!propClear(obj, ignored)) return null;
      group.add(obj); return obj;
    };
    const routeColor = (r) => r.kind === 'alternate' ? { ink: '#bceaff', bg: '#12304b', border: '#6ccfff' } : { ink: '#baffd8', bg: '#123c30', border: '#83e7b3' };
    const distanceLabel = (r) => `${r.saved >= 0 ? '−' : '+'}${Math.round(Math.abs(r.saved))} M`;
    const makePost = (height) => {
      const post = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, height, 6), new THREE.MeshLambertMaterial({ color: 0x8a8a8a }));
      pole.position.y = height / 2; post.add(pole); return post;
    };
    const addBoard = (post, text, width, y, color, height) => {
      const board = W.textPlane(text, color.ink, color.bg, width, height || 0.8, true, { border: color.border, sizeK: 0.53 });
      board.position.y = y; post.add(board);
    };
    const placedSigns = [];
    const putWayfinder = (post, s, side, kind, startS) => {
      post.userData.kind = kind;
      // Search nearby verges without blocking any main or sibling lane.
      // After a stunt, the first flat approach can be shorter than 34 metres.
      // In that case keep the warning near the actual fork, never under a loop.
      for (const position of [s, s - 10, s - 22, s + 8, startS - 24, startS - 18, startS - 12]) {
        const f = root.TrackBuilder.frameAt(track, position);
        if (f.p.y > 1.5 || Math.abs(f.T.y) > 0.08 || f.N.y < 0.95) continue;
        for (const signSide of [side, -side]) for (const away of [10.5, 13, 16, 19]) {
          post.position.set(f.p.x + f.B.x * signSide * away, W.GROUND_Y, f.p.z + f.B.z * signSide * away);
          post.rotation.y = Math.atan2(-f.T.x, -f.T.z);
          if (!propClear(post)) continue;
          const bounds = new THREE.Box3().setFromObject(post).expandByScalar(0.5);
          if (placedSigns.some((other) => bounds.intersectsBox(other))) continue;
          placedSigns.push(bounds); post.userData.beforeFork = startS - position;
          const sightline = bounds.clone().expandByScalar(0.25);
          const approach = new THREE.Vector3(-f.T.x * 6, 0, -f.T.z * 6);
          sightline.union(sightline.clone().translate(approach));
          track.wayfinderKeepouts.push({ bounds: sightline, routeId: post.userData.routeId, fork: post.userData.fork });
          group.add(post); return true;
        }
      }
      return false;
    };

    for (const route of routes) {
      const surfaceType = route.surface === 'cobble' ? 'cobble' : 'asphalt';
      if (!surfaces.has(surfaceType)) surfaces.set(surfaceType, { pos: [], col: [], uv: [], idx: [], vi: 0 });
      surfaceBatch = surfaces.get(surfaceType);
      const S = route.samples, hw = route.halfWidth, park = RouteExtras.parking(route), prof = RouteExtras.profile(track, route);
      const left = -hw, right = hw + park; // parking lane on the street's right-hand side
      const wide = hw >= 4.4 && route.surface !== 'cobble';
      for (let i = 0; i < S.length - 1; i++) {
        const a = S[i], b = S[i + 1], pa = prof[i], pb = prof[i + 1];
        const ha = root.Shortcuts.surfaceOffset(route, a.s), hb = root.Shortcuts.surfaceOffset(route, b.s);
        const v0 = a.s / 2.5, v1 = b.s / 2.5, color = Math.floor(i / 6) % 2 ? cRoad2 : cRoad;
        quad(at(a, left, ha), at(a, hw, ha), at(b, left, hb), at(b, hw, hb), color, 0, hw * 2 / 2.4, v0, v1);
        if (park) quad(at(a, hw, ha), at(a, right, ha), at(b, hw, hb), at(b, right, hb), cPark, 0, 1, v0, v1);
        // granite curbs and sidewalks, only where the street is clear of the circuit's own road and walks
        for (const [edge, dir] of [[left, -1], [right, 1]]) {
          if (!clearOfMain(pa, edge, ROAD_W + 1.3) || !clearOfMain(pb, edge, ROAD_W + 1.3) ||
            !edgeClear(a, edge, route.id) || !edgeClear(b, edge, route.id)) continue;
          const e0 = edge, e1 = edge + dir * 0.35, ch = 0.14;
          paint(at(a, e0, ha), at(a, e1, ha + ch), at(b, e0, hb), at(b, e1, hb + ch), cCurb);
          paint(at(a, e0, ha), at(a, e0, ha + ch), at(b, e0, hb), at(b, e0, hb + ch), cCurb);
          const walk = WALK + (dir < 0 ? park : 0); // both sidewalks end on the same building line
          if (clearOfMain(pa, edge + dir * walk, ROAD_W + 4.8) && clearOfMain(pb, edge + dir * walk, ROAD_W + 4.8) &&
            edgeClear(a, edge + dir * walk, route.id) && edgeClear(b, edge + dir * walk, route.id))
            quad(at(a, e1, ha + ch), at(a, edge + dir * walk, ha + ch), at(b, e1, hb + ch), at(b, edge + dir * walk, hb + ch), cWalk, 0, 1.2, v0, v1);
        }
        if (wide && Math.floor(a.s / 4) % 2 === 0 && clearOfMain(pa, 0, ROAD_W + 0.5)) paint(at(a, -0.12, ha + 0.03), at(a, 0.12, ha + 0.03), at(b, -0.12, hb + 0.03), at(b, 0.12, hb + 0.03), cLine);
        if (park && Math.floor(a.s / 6) % 2 === 0) paint(at(a, hw - 0.06, ha + 0.03), at(a, hw + 0.06, ha + 0.03), at(b, hw - 0.06, hb + 0.03), at(b, hw + 0.06, hb + 0.03), cLine);
        if (route.perks.includes('tram')) for (const r of [-0.72, 0.72]) {
          paint(at(a, r - 0.09, ha + 0.02), at(a, r + 0.09, ha + 0.02), at(b, r - 0.09, hb + 0.02), at(b, r + 0.09, hb + 0.02), cRail);
          paint(at(a, r - 0.035, ha + 0.035), at(a, r + 0.035, ha + 0.035), at(b, r - 0.035, hb + 0.035), at(b, r + 0.035, hb + 0.035), cRailTop);
        }
      }
      // furniture: lamps, trees, parked cars, the obstacles of a market Gasse
      const L = route.length, clearAt = (d, lat) => { const k = Math.max(0, Math.min(S.length - 1, Math.round(d))); return clearOfMain(prof[k], lat, ROAD_W + 5.2); };
      const frame = (d) => root.Shortcuts.frameAt(route, d);
      for (let d = 14, k = 0; d < L - 14; d += 23, k++) {
        const side = k % 2 ? 1 : -1, lat = side > 0 ? right + 1.1 : left - 1.1;
        if (clearAt(d, lat)) addProp(P.lamp(), frame(d), lat, true, 'streetLamp');
      }
      if (route.perks.includes('trees')) for (let d = 9; d < L - 9; d += 12) for (const side of [-1, 1]) {
        const lat = side > 0 ? right + 1.9 : left - 1.9; if (clearAt(d, lat)) addProp(P.tree(Math.floor(d) % 3), frame(d), lat, false, 'streetTree');
      }
      if (park) for (let d = 16, k = 0; d < L - 16; d += 7.5, k++) {
        if (k % 4 === 3 || !clearAt(d, hw + park / 2)) continue;
        const car = P.parkedcar({ color: [0x8a8a90, 0xdddddd, 0x223355, 0x7a1a1a, 0x2d6a4f, 0x111111, 0xd9a24a, 0x4a6a8a][(k * 5 + route.index) % 8], taxi: k % 9 === 4 });
        addProp(car, frame(d), hw + park / 2, false, 'streetParkedCar');
      }
      for (const o of RouteExtras.obstacles(route)) {
        const f = frame(o.d), obj = o.kind === 'marktstand' ? P.marktstand() : kisten(route.index);
        obj.userData.routeObstacle = route.id;
        addProp(obj, f, o.lat, false, 'streetObstacle', route.id, o.kind === 'marktstand' ? Math.PI / 2 : 0);
      }
      // blue street-name signs at both corners, on the corner clear of the circuit
      for (const d of [9, L - 9]) {
        const f = frame(d), lats = [left - 1.4, right + 1.4];
        const k = Math.max(0, Math.min(S.length - 1, Math.round(d))), lat = Math.abs(prof[k].lat + lats[0] * prof[k].bd) > Math.abs(prof[k].lat + lats[1] * prof[k].bd) ? lats[0] : lats[1];
        const sign = P.schild({ text: route.street });
        addProp(sign, f, lat, false, 'streetName', null, -Math.PI / 2);
      }
      // A longer alternate honestly shows +metres; green cuts show the saving.
      const color = routeColor(route), arrow = route.side < 0 ? '←' : '→', post = makePost(3.7);
      const label = `${arrow} ${route.street} · ${distanceLabel(route)}`;
      addBoard(post, label, 7.4, 3.5, color, 1);
      addBoard(post, route.toward || (route.kind === 'alternate' ? 'PANORAMAROUTE' : 'ABKÜRZUNG'), 7.4, 2.55, color, 0.65);
      Object.assign(post.userData, { routeId: route.id, routeKind: route.kind, saved: route.saved, signText: label });
      putWayfinder(post, route.startS - 34, route.side, 'routeWayfinder', route.startS);
    }
    const forks = new Map();
    for (const route of routes) if (route.fork) {
      if (!forks.has(route.fork)) forks.set(route.fork, []);
      forks.get(route.fork).push(route);
    }
    for (const [fork, choices] of forks) {
      if (choices.length < 2) continue;
      const post = makePost(4.7), sorted = choices.slice().sort((a, b) => a.side - b.side);
      const label = `${choices.length + 1} WEGE · ↑ HAUPTSTRECKE`;
      addBoard(post, label, 9.4, 4.45, { ink: '#ffffff', bg: '#29343b', border: '#e4ece9' }, 0.9);
      sorted.forEach((r, i) => addBoard(post, `${r.side < 0 ? '←' : '→'} ${r.street} · ${distanceLabel(r)}`, 9.4, 3.4 - i * 0.9, routeColor(r), 0.8));
      Object.assign(post.userData, { fork, routeIds: sorted.map((r) => r.id), signText: label });
      putWayfinder(post, choices[0].startS - 56, 1, 'forkWayfinder', choices[0].startS);
    }
    const mesh = (P1, C1, I1, material) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P1, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C1, 3)); geo.setIndex(I1); geo.computeVertexNormals(); const nrm = geo.attributes.normal; for (let k = 0; k < nrm.count; k++) nrm.setXYZ(k, 0, 1, 0); const m = new THREE.Mesh(geo, material); m.receiveShadow = true; return m; };
    // Keep sidewalks in the surface batches, including mixed asphalt/cobble tracks.
    for (const [surfaceType, { pos, col, uv, idx }] of surfaces) {
      const tex = surfaceType === 'cobble' ? T.cobble(0xe8e2dc, 3) : theme.wet ? T.wet() : T.asphalt(0xffffff, 2);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const nrm = new Float32Array(pos.length); for (let k = 1; k < nrm.length; k += 3) nrm[k] = 1; geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      const surface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, side: THREE.DoubleSide, roughness: theme.wet ? 0.35 : 0.85, metalness: theme.wet ? 0.25 : 0.05 }));
      surface.receiveShadow = true; surface.userData.kind = 'streetSurface'; surface.userData.surface = surfaceType; group.add(surface);
    }
    if (ppos.length) { const m = mesh(ppos, pcol, pidx, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, roughness: 0.85 })); m.userData.kind = 'streetPaint'; group.add(m); }
    if (root.STUNTS_AUDIT_STREETS) root.STUNTS_AUDIT_STREETS(group, track);
    W.mergeStatic(group, new Set()); // lamps, trees, parked cars and signs: one draw call per material
    return group;
  };

})(window);
