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
    if (!routes.length) return group;
    const T = root.Pixel.T, P = W.P, ROAD_W = W.ROAD_W;
    const pos = [], col = [], uv = [], idx = []; let vi = 0;
    const ppos = [], pcol = [], pidx = []; let pvi = 0;
    const cRoad = new THREE.Color(theme.road[0]), cRoad2 = new THREE.Color(theme.road[1]);
    const cCurb = new THREE.Color(theme.night ? 0x4f5058 : 0x9a9994), cWalk = new THREE.Color(theme.night ? 0x2e2e38 : 0x8f8a82);
    const cLine = new THREE.Color(theme.night ? 0xa8a8b0 : 0xf6f6f2), cRail = new THREE.Color(0x2c2c30), cRailTop = new THREE.Color(theme.night ? 0x6a6a72 : 0xb8b8bc);
    const cPark = new THREE.Color(theme.night ? 0x2a2a33 : 0x6c6c70);
    const quad = (a, b, c, d, color, u0, u1, v0, v1) => {
      for (const p of [a, b, c, d]) { pos.push(p[0], p[1], p[2]); col.push(color.r, color.g, color.b); }
      uv.push(u0, v0, u1, v0, u0, v1, u1, v1); idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3); vi += 4;
    };
    const paint = (a, b, c, d, color) => {
      for (const p of [a, b, c, d]) { ppos.push(p[0], p[1], p[2]); pcol.push(color.r, color.g, color.b); }
      pidx.push(pvi, pvi + 2, pvi + 1, pvi + 1, pvi + 2, pvi + 3); pvi += 4;
    };
    const at = (f, lat, h) => [f.p.x + f.B.x * lat, f.p.y + h, f.p.z + f.B.z * lat];
    const clearOfMain = (pr, lat, margin) => !pr.flat || Math.abs(pr.lat + lat * pr.bd) > margin;
    const addProp = (obj, f, lat, faceStreet) => {
      obj.position.set(f.p.x + f.B.x * lat, W.GROUND_Y, f.p.z + f.B.z * lat);
      if (faceStreet) obj.lookAt(f.p.x, W.GROUND_Y, f.p.z); else obj.rotation.y = Math.atan2(f.T.x, f.T.z);
      group.add(obj); return obj;
    };

    for (const route of routes) {
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
          if (!clearOfMain(pa, edge, ROAD_W + 1.3) || !clearOfMain(pb, edge, ROAD_W + 1.3)) continue;
          const e0 = edge, e1 = edge + dir * 0.35, ch = 0.14;
          paint(at(a, e0, ha), at(a, e1, ha + ch), at(b, e0, hb), at(b, e1, hb + ch), cCurb);
          paint(at(a, e0, ha), at(a, e0, ha + ch), at(b, e0, hb), at(b, e0, hb + ch), cCurb);
          const walk = WALK + (dir < 0 ? park : 0); // both sidewalks end on the same building line
          if (clearOfMain(pa, edge + dir * walk, ROAD_W + 4.8) && clearOfMain(pb, edge + dir * walk, ROAD_W + 4.8)) quad(at(a, e1, ha + ch), at(a, edge + dir * walk, ha + ch), at(b, e1, hb + ch), at(b, edge + dir * walk, hb + ch), cWalk, 0, 1.2, v0, v1);
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
        if (clearAt(d, lat)) { const lamp = P.lamp(); addProp(lamp, frame(d), lat, false); lamp.lookAt(frame(d).p.x, W.GROUND_Y, frame(d).p.z); }
      }
      if (route.perks.includes('trees')) for (let d = 9; d < L - 9; d += 12) for (const side of [-1, 1]) {
        const lat = side > 0 ? right + 1.9 : left - 1.9; if (clearAt(d, lat)) addProp(P.tree(Math.floor(d) % 3), frame(d), lat, false);
      }
      if (park) for (let d = 16, k = 0; d < L - 16; d += 7.5, k++) {
        if (k % 4 === 3 || !clearAt(d, hw + park / 2)) continue;
        const car = P.parkedcar({ color: [0x8a8a90, 0xdddddd, 0x223355, 0x7a1a1a, 0x2d6a4f, 0x111111, 0xd9a24a, 0x4a6a8a][(k * 5 + route.index) % 8], taxi: k % 9 === 4 });
        addProp(car, frame(d), hw + park / 2, false);
      }
      for (const o of RouteExtras.obstacles(route)) {
        const f = frame(o.d), obj = o.kind === 'marktstand' ? P.marktstand() : kisten(route.index);
        addProp(obj, f, o.lat, false); if (o.kind === 'marktstand') obj.rotation.y += Math.PI / 2;
      }
      // blue street-name signs at both corners, on the corner clear of the circuit
      for (const d of [9, L - 9]) {
        const f = frame(d), lats = [left - 1.4, right + 1.4];
        const k = Math.max(0, Math.min(S.length - 1, Math.round(d))), lat = Math.abs(prof[k].lat + lats[0] * prof[k].bd) > Math.abs(prof[k].lat + lats[1] * prof[k].bd) ? lats[0] : lats[1];
        const sign = P.schild({ text: route.street }); addProp(sign, f, lat, false); sign.rotation.y = Math.atan2(f.B.x, f.B.z);
      }
      // the white signpost on the circuit, 34 m before the junction: arrow, street, destination
      const mf = root.TrackBuilder.frameAt(track, route.startS - 34), arrow = route.side < 0 ? '←' : '→';
      const post = new THREE.Group();
      post.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0x8a8a8a })));
      post.children[0].position.y = 1.7;
      const board = W.textPlane(`${arrow} ${route.street}`, '#111111', '#f4f4f0', 5.2, 0.8, false, { border: '#111111', sizeK: 0.52 }); board.position.y = 3.3; post.add(board);
      if (route.toward) { const to = W.textPlane(route.toward, '#111111', '#f4f4f0', 5.2, 0.62, false, { sizeK: 0.46 }); to.position.y = 2.5; post.add(to); }
      post.position.set(mf.p.x + mf.B.x * route.side * (ROAD_W + 2.4), W.GROUND_Y, mf.p.z + mf.B.z * route.side * (ROAD_W + 2.4));
      post.rotation.y = Math.atan2(-mf.T.x, -mf.T.z); post.userData.kind = 'wegweiser'; group.add(post);
    }
    const tex = theme.wet ? T.wet() : routes.some((r) => r.surface === 'cobble') && !routes.some((r) => r.surface !== 'cobble') ? T.cobble(0xe8e2dc, 3) : T.asphalt(0xffffff, 2);
    const mesh = (P1, C1, I1, material) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P1, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C1, 3)); geo.setIndex(I1); geo.computeVertexNormals(); const nrm = geo.attributes.normal; for (let k = 0; k < nrm.count; k++) nrm.setXYZ(k, 0, 1, 0); const m = new THREE.Mesh(geo, material); m.receiveShadow = true; return m; };
    // cobbled streets get their own mesh and texture so a Gasse looks like one next to an asphalt street
    const byTex = [[routes.filter((r) => r.surface !== 'cobble'), tex], [routes.filter((r) => r.surface === 'cobble'), T.cobble(0xe8e2dc, 3)]];
    if (byTex[1][0].length && byTex[0][0].length) {
      // split the surface quads we already built by route: rebuild per surface type (cheap: a few thousand quads)
      group.add(splitBySurface(routes, track, theme, byTex, quad));
    } else {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const nrm = new Float32Array(pos.length); for (let k = 1; k < nrm.length; k += 3) nrm[k] = 1; geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      const surface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: byTex[1][0].length ? byTex[1][1] : tex, side: THREE.DoubleSide, roughness: theme.wet ? 0.35 : 0.85, metalness: theme.wet ? 0.25 : 0.05 }));
      surface.receiveShadow = true; surface.userData.kind = 'streetSurface'; group.add(surface);
    }
    if (ppos.length) { const m = mesh(ppos, pcol, pidx, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, roughness: 0.85 })); m.userData.kind = 'streetPaint'; group.add(m); }
    W.mergeStatic(group, new Set()); // lamps, trees, parked cars and signs: one draw call per material
    return group;
  };

  // Mixed surfaces on one track: build one textured mesh per surface kind.
  function splitBySurface(routes, track, theme, byTex) {
    const out = new THREE.Group();
    for (const [list, tex] of byTex) {
      if (!list.length) continue;
      const sub = Object.assign({}, track, { shortcuts: list });
      const g = W.buildShortcutRoadsSurfaceOnly(sub, theme, tex); out.add(g);
    }
    return out;
  }
  W.buildShortcutRoadsSurfaceOnly = function (track, theme, tex) {
    const pos = [], col = [], uv = [], idx = []; let vi = 0;
    const cRoad = new THREE.Color(theme.road[0]), cRoad2 = new THREE.Color(theme.road[1]), cPark = new THREE.Color(theme.night ? 0x2a2a33 : 0x6c6c70);
    const quad = (a, b, c, d, color, u0, u1, v0, v1) => { for (const p of [a, b, c, d]) { pos.push(p[0], p[1], p[2]); col.push(color.r, color.g, color.b); } uv.push(u0, v0, u1, v0, u0, v1, u1, v1); idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3); vi += 4; };
    const at = (f, lat, h) => [f.p.x + f.B.x * lat, f.p.y + h, f.p.z + f.B.z * lat];
    for (const route of track.shortcuts) {
      const S = route.samples, hw = route.halfWidth, park = RouteExtras.parking(route);
      for (let i = 0; i < S.length - 1; i++) {
        const a = S[i], b = S[i + 1], ha = root.Shortcuts.surfaceOffset(route, a.s), hb = root.Shortcuts.surfaceOffset(route, b.s), v0 = a.s / 2.5, v1 = b.s / 2.5;
        quad(at(a, -hw, ha), at(a, hw, ha), at(b, -hw, hb), at(b, hw, hb), Math.floor(i / 6) % 2 ? cRoad2 : cRoad, 0, hw * 2 / 2.4, v0, v1);
        if (park) quad(at(a, hw, ha), at(a, hw + park, ha), at(b, hw, hb), at(b, hw + park, hb), cPark, 0, 1, v0, v1);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const nrm = new Float32Array(pos.length); for (let k = 1; k < nrm.length; k += 3) nrm[k] = 1; geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, side: THREE.DoubleSide, roughness: theme.wet ? 0.35 : 0.85, metalness: theme.wet ? 0.25 : 0.05 }));
    m.receiveShadow = true; m.userData.kind = 'streetSurface'; return m;
  };
})(window);
