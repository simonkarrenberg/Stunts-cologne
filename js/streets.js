/* Optional local alleys. One batched road surface, reflective green edges and named entry signs. */
(function (root) {
  'use strict';
  const W = root.World;
  W.buildShortcutRoads = function (track, theme) {
    const group = new THREE.Group(), positions = [], colors = [];
    const asphalt = new THREE.Color(theme.night ? 0x42564e : 0x657b69);
    const green = new THREE.Color(0x83e7b3);
    const edge = (f, lat, h) => [f.p.x + f.B.x * lat, f.p.y + h, f.p.z + f.B.z * lat];
    const quad = (a, b, c, d, color) => {
      for (const v of [a, c, b, b, c, d]) { positions.push(...v); colors.push(color.r, color.g, color.b); }
    };
    for (const route of track.shortcuts || []) {
      const samples = route.samples, w = route.halfWidth;
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        const ah = root.Shortcuts.surfaceOffset(route, a.s), bh = root.Shortcuts.surfaceOffset(route, b.s);
        // Slightly above the city pavement at both junctions, with a narrow green edge.
        quad(edge(a, -w, ah), edge(a, w, ah), edge(b, -w, bh), edge(b, w, bh), asphalt);
        for (const side of [-1, 1]) quad(edge(a, side * w, ah + 0.02), edge(a, side * (w - 0.18), ah + 0.02), edge(b, side * w, bh + 0.02), edge(b, side * (w - 0.18), bh + 0.02), green);
      }
      for (const distance of [12, 28]) {
        const f = root.TrackBuilder.frameAt(track, route.startS - distance);
        const sign = W.textPlane(`${route.side < 0 ? '←' : '→'} ${route.name.toUpperCase()} · −${Math.round(route.saved)} M`, '#baffd8', '#123c30', 10, 1.6, true, { border: '#83e7b3', sizeK: 0.52 });
        sign.position.set(f.p.x + f.B.x * route.side * 9.5, f.p.y + 3.4, f.p.z + f.B.z * route.side * 9.5);
        sign.rotation.y = Math.atan2(-f.T.x, -f.T.z); group.add(sign);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), new THREE.MeshLambertMaterial({ color: 0xb5c7bc }));
        post.position.copy(sign.position); post.position.y -= 1.8; group.add(post);
      }
    }
    if (positions.length) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
      const surface = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); surface.receiveShadow = true; group.add(surface);
    }
    return group;
  };
})(window);
