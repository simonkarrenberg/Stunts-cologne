/* ============================================================
   STUNTS KÖLLE 4D — Signed side streets with real, shorter paths.
   Open, arc-length sampled routes; lap distance stays on the main
   circuit and is mapped by the game while a racer takes a branch.
   No renderer dependency, so geometry can be checked in Node.
   ============================================================ */
(function (root) {
  'use strict';
  const TB = root.TrackBuilder || (typeof require === 'function' ? require('./track.js').TrackBuilder : null);
  const { v3, add, sub, mul, dot, cross, len, norm } = TB;
  const UP = v3(0, 1, 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, u) => add(a, mul(sub(b, a), u));

  function bezier(p, u) {
    const v = 1 - u;
    return add(add(mul(p[0], v * v * v), mul(p[1], 3 * v * v * u)), add(mul(p[2], 3 * v * u * u), mul(p[3], u * u * u)));
  }
  function tangent(p, u) {
    const v = 1 - u;
    return norm(add(add(mul(sub(p[1], p[0]), 3 * v * v), mul(sub(p[2], p[1]), 6 * v * u)), mul(sub(p[3], p[2]), 3 * u * u)));
  }

  function sampleCurve(control, span) {
    // Oversample before assigning distance: equal parameter increments are
    // not equal metres, especially at the mouths of a narrow side street.
    const count = Math.max(80, Math.ceil(span * 4));
    const dense = [{ p: control[0], u: 0, s: 0 }];
    for (let i = 1; i <= count; i++) {
      const u = i / count, p = bezier(control, u), prev = dense[i - 1];
      dense.push({ p, u, s: prev.s + len(sub(p, prev.p)) });
    }
    const length = dense[count].s, steps = Math.ceil(length), samples = [];
    let j = 1;
    for (let i = 0; i <= steps; i++) {
      const s = length * i / steps;
      while (j < dense.length - 1 && dense[j].s < s) j++;
      const a = dense[j - 1], b = dense[j], f = (s - a.s) / Math.max(1e-9, b.s - a.s);
      const u = a.u + (b.u - a.u) * f, T = tangent(control, u);
      samples.push({ p: bezier(control, u), T, N: { ...UP }, B: cross(T, UP), s,
        kind: 'straight', curv: 0, roll: 0, index: i, rampAngle: 0, over: 0 });
    }
    for (let i = 0; i < samples.length; i++) {
      const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
      samples[i].curv = Math.atan2(a.T.z * b.T.x - a.T.x * b.T.z, dot(a.T, b.T)) / Math.max(1e-9, b.s - a.s);
    }
    return { length, samples };
  }

  function buildRoutes(track) {
    const routes = [], defs = track.def.shortcuts || [], S = track.samples;
    for (const def of defs) {
      const seg = track.segments[def.seg];
      if (!seg || seg.t !== 'curve' || !Number.isFinite(seg.angle) || Math.abs(seg.angle) > 150) continue;
      const i0 = S.findIndex((q) => q.seg === def.seg);
      if (i0 < 0) continue;
      let i1 = i0;
      while (i1 + 1 < S.length && S[i1 + 1].seg === def.seg) i1++;
      // Use up to 24 m of the adjacent straight, but never consume a hill,
      // launch ramp or loop. Some stunt-heavy circuits join turns directly
      // to stunts, so their branch starts or ends at the flat turn boundary.
      let before = 0, after = 0;
      while (before < 24 && i0 - before - 1 >= 0 && S[i0 - before - 1].kind === 'straight') before++;
      while (after < 24 && i1 + after + 1 < S.length && S[i1 + after + 1].kind === 'straight') after++;
      const startS = (i0 - before) * track.ds, endS = (i1 + 1 + after) * track.ds;
      // Keep the finish line and both stunts and their approaches untouched.
      if (startS < 40 || endS > track.length - 40) continue;
      const first = TB.frameAt(track, startS), last = TB.frameAt(track, endS);
      if (Math.abs(first.p.y - last.p.y) > 0.1 || first.N.y < 0.995 || last.N.y < 0.995) continue;
      let safe = true;
      for (let i = Math.floor(startS / track.ds); i < Math.ceil(endS / track.ds); i++) {
        const q = S[i];
        if (!q || !['straight', 'curve'].includes(q.kind) || Math.abs(q.p.y - first.p.y) > 0.1) { safe = false; break; }
      }
      if (!safe || routes.some((r) => startS < r.endS + 20 && endS > r.startS - 20)) continue;
      // A branch immediately after a jump must not reset into that gap.
      // Reserve a level main-road plot with room for the whole car, before
      // the entrance; never infer it from a fixed distance behind the gate.
      let resetS = null;
      for (let s = startS - 8; s >= 6; s -= 2) {
        if ([-5, 0, 5].every((offset) => {
          const q = TB.frameAt(track, s + offset);
          return ['straight', 'curve', 'bridge', 'tunnel'].includes(q.kind) && q.N.y > 0.995 && Math.abs(q.T.y) < 0.02;
        })) { resetS = s; break; }
      }
      if (resetS == null) continue;
      const chord = len(sub(last.p, first.p)), handle = chord / 3;
      const control = [first.p, add(first.p, mul(first.T, handle)), sub(last.p, mul(last.T, handle)), last.p];
      const shape = sampleCurve(control, endS - startS);
      const saved = endS - startS - shape.length;
      if (!Number.isFinite(saved) || saved < 3) continue;
      // A shortcut cannot silently cross another part of the circuit. Check
      // all of its metres against the unrelated road corridor, including
      // stunts: a crossing might otherwise meet a support or water feature.
      for (const q of shape.samples) {
        for (let i = 0; i < S.length; i += 2) {
          const s = i * track.ds;
          if (s >= startS - 50 && s <= endS + 50) continue;
          const p = S[i].p;
          if (Math.hypot(p.x - q.p.x, p.z - q.p.z) < 12) { safe = false; break; }
        }
        if (!safe) break;
      }
      if (!safe) continue;
      const mid = shape.samples[Math.floor(shape.samples.length / 2)], mainMid = TB.frameAt(track, (startS + endS) / 2);
      const side = Math.sign(dot(sub(mid.p, mainMid.p), mainMid.B)) || -Math.sign(seg.angle);
      const id = def.id || track.def.id + '-shortcut-' + def.seg;
      if (routes.some((r) => r.id === id)) continue;
      routes.push({ id, name: def.name || 'Klüngel-Abkürzung', index: routes.length, seg: def.seg,
        startS, endS, resetS, length: shape.length, saved, side, halfWidth: 3.8, samples: shape.samples });
    }
    return routes;
  }

  function surfaceOffset(route, distance) {
    const u = clamp(Math.min(distance, route.length - distance) / 8, 0, 1);
    return 0.1 + 0.16 * u * u * (3 - 2 * u);
  }

  function frameAt(route, distance) {
    const S = route.samples, last = S.length - 1, d = clamp(Number.isFinite(distance) ? distance : 0, 0, route.length);
    const u = d / route.length * last, i = Math.min(last - 1, Math.floor(u)), f = u - i;
    const a = S[i], b = S[i + 1], T = norm(mix(a.T, b.T, f));
    return { p: mix(a.p, b.p, f), T, N: { ...UP }, B: cross(T, UP),
      kind: 'straight', curv: a.curv + (b.curv - a.curv) * f, roll: 0,
      index: i, rampAngle: 0, over: 0, s: d, surfaceOffset: surfaceOffset(route, d) };
  }

  root.Shortcuts = { buildRoutes, frameAt, surfaceOffset };
})(typeof window !== 'undefined' ? window : module.exports);
