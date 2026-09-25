/* Branching city streets: green cuts, blue scenic alternatives and readable fork signs. */
(function (root) {
  'use strict';
  const W = root.World;
  W.buildShortcutRoads = function (track, theme) {
    const group = new THREE.Group(), positions = [], colors = [];
    const green = new THREE.Color(0x83e7b3);
    const blue = new THREE.Color(0x6ccfff), white = new THREE.Color(0xd2e2dd);
    const edge = (f, lat, h) => [f.p.x + f.B.x * lat, f.p.y + h, f.p.z + f.B.z * lat];
    const quad = (a, b, c, d, color) => {
      for (const v of [a, c, b, b, c, d]) { positions.push(...v); colors.push(color.r, color.g, color.b); }
    };
    for (const route of track.shortcuts || []) {
      const samples = route.samples, w = route.halfWidth;
      const scenic = route.kind === 'alternate', stripe = scenic ? blue : green;
      const asphalt = new THREE.Color(scenic ? (theme.night ? 0x344956 : 0x526a7c) : (theme.night ? 0x42564e : 0x657b69));
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        const ah = root.Shortcuts.surfaceOffset(route, a.s), bh = root.Shortcuts.surfaceOffset(route, b.s);
        // Tapered elevation keeps the shared mouths joined to the main road.
        quad(edge(a, -w, ah), edge(a, w, ah), edge(b, -w, bh), edge(b, w, bh), asphalt);
        for (const side of [-1, 1]) quad(edge(a, side * w, ah + 0.02), edge(a, side * (w - 0.18), ah + 0.02), edge(b, side * w, bh + 0.02), edge(b, side * (w - 0.18), bh + 0.02), stripe);
        if (w >= 4.5 && a.s > 12 && a.s < route.length - 12 && Math.floor(a.s / 5) % 2 === 0) quad(edge(a, -0.09, ah + 0.025), edge(a, 0.09, ah + 0.025), edge(b, -0.09, bh + 0.025), edge(b, 0.09, bh + 0.025), white);
      }
      for (const distance of [26]) {
        const f = root.TrackBuilder.frameAt(track, route.startS - distance);
        const delta = `${route.saved >= 0 ? '−' : '+'}${Math.round(Math.abs(route.saved))} M`;
        const sign = W.textPlane(`${route.side < 0 ? '←' : '→'} ${route.name.toUpperCase()} · ${delta}`, scenic ? '#bceaff' : '#baffd8', scenic ? '#12304b' : '#123c30', 10, 1.6, true, { border: scenic ? '#6ccfff' : '#83e7b3', sizeK: 0.52 });
        sign.position.set(f.p.x + f.B.x * route.side * 9.5, f.p.y + 3.4, f.p.z + f.B.z * route.side * 9.5);
        sign.rotation.y = Math.atan2(-f.T.x, -f.T.z); group.add(sign);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), new THREE.MeshLambertMaterial({ color: 0xb5c7bc }));
        post.position.copy(sign.position); post.position.y -= 1.8; group.add(post);
      }
    }
    const gates = new Set();
    for (const route of track.shortcuts || []) {
      if (!route.fork || gates.has(route.fork)) continue;
      gates.add(route.fork);
      const f = root.TrackBuilder.frameAt(track, route.startS - 52);
      const sign = W.textPlane('3 WEGE · ↑ HAUPTSTRECKE', '#ffffff', '#29343b', 9, 1.4, true, { border: '#e4ece9', sizeK: 0.65 });
      sign.position.set(f.p.x + f.B.x * 10, f.p.y + 3.4, f.p.z + f.B.z * 10);
      sign.rotation.y = Math.atan2(-f.T.x, -f.T.z); group.add(sign);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), new THREE.MeshLambertMaterial({ color: 0xb5c7bc }));
      post.position.copy(sign.position); post.position.y -= 1.8; group.add(post);
    }
    if (positions.length) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
      const surface = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); surface.receiveShadow = true; group.add(surface);
    }
    return group;
  };
})(window);
