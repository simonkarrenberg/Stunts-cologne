/* ============================================================
   STUNTS KÖLLE 4D — Real side streets and multi-way courses.
   Open, arc-length sampled routes; lap distance stays on the main
   circuit and is mapped by the game while a racer takes a branch.
   No renderer dependency, so geometry can be checked in Node.

   Route definitions (track.def.shortcuts):
     { seg }                     legacy: chord across the inside of one flat curve
     { type: 'cut', from, to }   chord across a span of segments (shorter)
     { type: 'parallel', from, to, side, offset }
                                 a street one block over, running beside the circuit
     { type: 'bypass', from, to, side, offset }
                                 a street around a stunt (loop, jump over a house, hill)
   from/to: a segment index (start of `from`, end of `to`), { seg, u } with
   u in 0..1 inside that segment, or { s } in metres.
   Common fields: id, street (the real street name), toward (where it leads),
   halfWidth, surface ('asphalt' | 'cobble'), perks: ['koelsch', 'market',
   'parked', 'shakeKripo', 'tram', 'trees', 'narrow'].
   Authored forks (track.def.branches): { id, name, fork, from: {seg,u},
   to: {seg,u}, via: [{x,z}], halfWidth, style: 'shortcut'|'scenic' }.
   Siblings share fork/from/to and offer opposite steering choices.
   type describes construction; kind is the shortcut/alternate HUD label.
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

  function samplePath(points, firstT, lastT) {
    // Every authored street goes through its waypoints. A shared tangent at
    // each waypoint joins cubic pieces smoothly, including the two mouths.
    const directions = points.map((p, i) => i === 0 ? firstT : i === points.length - 1 ? lastT : norm(sub(points[i + 1], points[i - 1])));
    const dense = [{ p: points[0], T: firstT, s: 0 }];
    for (let i = 0; i < points.length - 1; i++) {
      const span = len(sub(points[i + 1], points[i]));
      const before = i ? len(sub(points[i], points[i - 1])) : span;
      const after = i + 2 < points.length ? len(sub(points[i + 2], points[i + 1])) : span;
      const control = [points[i], add(points[i], mul(directions[i], Math.min(before, span) / 3)),
        sub(points[i + 1], mul(directions[i + 1], Math.min(after, span) / 3)), points[i + 1]];
      const n = Math.max(80, Math.ceil(span * 5));
      for (let j = 1; j <= n; j++) {
        const p = bezier(control, j / n), prev = dense[dense.length - 1];
        dense.push({ p, T: tangent(control, j / n), s: prev.s + len(sub(p, prev.p)) });
      }
    }
    const length = dense[dense.length - 1].s, steps = Math.ceil(length), samples = [];
    let j = 1;
    for (let i = 0; i <= steps; i++) {
      const s = length * i / steps;
      while (j < dense.length - 1 && dense[j].s < s) j++;
      const a = dense[j - 1], b = dense[j], u = (s - a.s) / Math.max(1e-9, b.s - a.s), T = norm(mix(a.T, b.T, u));
      samples.push({ p: mix(a.p, b.p, u), T, N: { ...UP }, B: cross(T, UP), s,
        kind: 'straight', curv: 0, roll: 0, index: i, rampAngle: 0, over: 0 });
    }
    for (let i = 0; i < samples.length; i++) {
      const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
      samples[i].curv = Math.atan2(a.T.z * b.T.x - a.T.x * b.T.z, dot(a.T, b.T)) / Math.max(1e-9, b.s - a.s);
    }
    return { length, samples };
  }

  const FLAT = ['straight', 'curve', 'bridge', 'tunnel'];

  // Resample an XZ(+y) polyline to one-metre steps with a smooth moving frame.
  function samplePolyline(points) {
    const cum = [0];
    for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + len(sub(points[i], points[i - 1])));
    const length = cum[cum.length - 1], steps = Math.max(2, Math.ceil(length)), samples = [];
    let j = 1;
    const at = (s) => { while (j < points.length - 1 && cum[j] < s) j++; while (j > 1 && cum[j - 1] > s) j--; const f = (s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]); return mix(points[j - 1], points[j], clamp(f, 0, 1)); };
    const pos = []; for (let i = 0; i <= steps; i++) { j = 1; pos.push(at(length * i / steps)); }
    for (let i = 0; i <= steps; i++) {
      const a = pos[Math.max(0, i - 1)], b = pos[Math.min(steps, i + 1)];
      let T = sub(b, a); T = norm(v3(T.x, 0, T.z));
      samples.push({ p: pos[i], T, N: { ...UP }, B: cross(T, UP), s: length * i / steps, kind: 'straight', curv: 0, roll: 0, index: i, rampAngle: 0, over: 0 });
    }
    for (let i = 0; i < samples.length; i++) {
      const a = samples[Math.max(0, i - 2)], b = samples[Math.min(samples.length - 1, i + 2)];
      samples[i].curv = Math.atan2(a.T.z * b.T.x - a.T.x * b.T.z, dot(a.T, b.T)) / Math.max(1e-9, b.s - a.s);
    }
    return { length, samples };
  }

  function endpointDistance(track, def) {
    if (!def || !Number.isInteger(def.seg) || !Number.isFinite(def.u) || def.u < 0 || def.u > 1) return null;
    const start = track.samples.findIndex((q) => q.seg === def.seg);
    if (start < 0) return null;
    let end = start + 1;
    while (end < track.samples.length && track.samples[end].seg === def.seg) end++;
    return (start + (end - start) * def.u) * track.ds;
  }

  function resetBefore(track, startS) {
    for (let s = startS - 8; s >= 6; s -= 2) {
      if ([-5, 0, 5].every((offset) => {
        const q = TB.frameAt(track, s + offset);
        return ['straight', 'curve', 'bridge', 'tunnel'].includes(q.kind) && q.N.y > 0.995 && Math.abs(q.T.y) < 0.02;
      })) return s;
    }
    return null;
  }

  function sameFork(a, b) {
    return !!a.fork && a.fork === b.fork && Math.abs(a.startS - b.startS) < 1e-6 && Math.abs(a.endS - b.endS) < 1e-6;
  }

  function approachIsClear(track, startS) {
    // Steering choices need an open, level 20 m approach. A jump or hill
    // additionally needs a 45 m landing run: checking the mouth alone can
    // advertise a fork that ordinary racing cars pass while still airborne.
    // Closed loops may precede the clear 20 m tail because they rejoin road;
    // those approaches are also driven from the grid in the browser tests.
    const steeringRun = 20, landingRun = 45;
    for (let d = 0; d <= landingRun; d += track.ds) {
      const q = TB.frameAt(track, startS - d);
      if (['gap', 'ramp', 'hill', 'dip'].includes(q.kind)) return false;
      if (d <= steeringRun && (!['straight', 'curve'].includes(q.kind) || Math.abs(q.p.y) > 0.15 || q.N.y < 0.995 || Math.abs(q.T.y) > 0.02)) return false;
    }
    return true;
  }

  function pathIsClear(track, route, routes) {
    const S = route.samples, width = route.halfWidth;
    for (let i = 0; i < S.length; i += 2) {
      const q = S[i];
      for (let j = 0; j < track.samples.length; j += 2) {
        const s = j * track.ds, p = track.samples[j].p;
        const related = s >= route.startS - 50 && s <= route.endS + 50;
        // Main/branch pavement deliberately overlaps at each smooth fork.
        // In the middle, these are independent streets, never a crossroads.
        if (related && (q.s < 35 || q.s > route.length - 35)) continue;
        if (Math.hypot(q.p.x - p.x, q.p.z - p.z) < (related ? width + 6 : 12)) return false;
      }
      for (let j = i + 26; j < S.length; j += 2) {
        if (Math.hypot(q.p.x - S[j].p.x, q.p.z - S[j].p.z) < width * 2 + 1) return false;
      }
      for (const other of routes) {
        for (let j = 0; j < other.samples.length; j += 2) {
          const p = other.samples[j];
          if (sameFork(route, other) && ((q.s < 35 && p.s < 35) || (q.s > route.length - 35 && p.s > other.length - 35))) continue;
          if (Math.hypot(q.p.x - p.p.x, q.p.z - p.p.z) < width + other.halfWidth + 1) return false;
        }
      }
    }
    return true;
  }

  function appendBranches(track, routes) {
    for (const def of track.def.branches || []) {
      const startS = endpointDistance(track, def.from), endS = endpointDistance(track, def.to);
      if (startS == null || endS == null || startS < 40 || endS > track.length - 40 || endS - startS < 45) continue;
      const id = def.id, fork = typeof def.fork === 'string' && def.fork ? def.fork : null;
      if (typeof id !== 'string' || !id || routes.some((r) => r.id === id)) continue;
      if (!Array.isArray(def.via) || def.via.length < 1 || def.via.length > 16 || def.via.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.z))) continue;
      if (def.halfWidth != null && (!Number.isFinite(def.halfWidth) || def.halfWidth < 3.4 || def.halfWidth > 5.2)) continue;
      const first = TB.frameAt(track, startS), last = TB.frameAt(track, endS);
      // A flat bridge/tunnel frame is not an open intersection: its rails
      // or wall still occupy the fork. Authored streets need open, grounded
      // mouths until structural portals can be built for enclosed sections.
      if ([first, last].some((q) => !['straight', 'curve'].includes(q.kind) || Math.abs(q.p.y) > 0.15 || q.N.y < 0.995 || Math.abs(q.T.y) > 0.02) || Math.abs(first.p.y - last.p.y) > 0.1) continue;
      if (!approachIsClear(track, startS)) continue;
      const route = { id, name: def.street || def.name || 'Kölner Nebenstrecke', street: def.street || def.name || 'Kölner Nebenstrecke',
        toward: def.toward || '', note: def.note || '', surface: def.surface || 'asphalt', perks: def.perks || [], offset: 0,
        index: routes.length, seg: def.from.seg, fork, startS, endS, resetS: resetBefore(track, startS), halfWidth: def.halfWidth || 3.8 };
      if (fork && routes.some((r) => r.fork === fork && !sameFork(route, r))) continue;
      if (route.resetS == null || routes.some((r) => startS < r.endS + 20 && endS > r.startS - 20 && !sameFork(route, r))) continue;
      const points = [first.p, ...def.via.map((p) => v3(p.x, first.p.y, p.z)), last.p];
      const spans = points.slice(1).map((p, i) => len(sub(p, points[i])));
      if (spans.some((d) => d < 8 || d > 800) || spans.reduce((sum, d) => sum + d, 0) > 1600) continue;
      const shape = samplePath(points, first.T, last.T);
      if (!Number.isFinite(shape.length) || shape.length < 45 || shape.length > 1800 || shape.samples.some((q) => !Number.isFinite(q.curv) || Math.abs(q.curv) > 0.12 || len(q.T) < 0.99)) continue;
      Object.assign(route, shape, { saved: endS - startS - shape.length });
      route.style = def.style === 'scenic' ? 'scenic' : 'shortcut';
      route.kind = route.style === 'shortcut' && route.saved >= 3 ? 'shortcut' : 'alternate';
      route.type = 'authored';
      // Look near the mouth, not at the midpoint: a scenic street can wind
      // back across the inside of a bend without changing its entry choice.
      let side = 0;
      for (let d = 8; d <= Math.min(40, route.length / 3); d += 4) {
        const q = frameAt(route, d), main = TB.frameAt(track, startS + d);
        const offset = dot(sub(q.p, main.p), main.B);
        if (Math.abs(offset) > 0.15) { side = Math.sign(offset); break; }
      }
      route.side = side;
      if (!side || routes.some((r) => sameFork(route, r) && r.side === side) || !pathIsClear(track, route, routes)) continue;
      junctions(track, route); routes.push(route);
    }
  }

  // Resolve a from/to reference to a main-circuit distance.
  function resolveS(track, ref, isEnd) {
    const S = track.samples;
    if (ref == null) return null;
    if (typeof ref === 'object' && Number.isFinite(ref.s)) return ref.s;
    const seg = typeof ref === 'number' ? ref : ref.seg;
    let i0 = -1, i1 = -1;
    for (let i = 0; i < S.length; i++) if (S[i].seg === seg) { if (i0 < 0) i0 = i; i1 = i; }
    if (i0 < 0) return null;
    const u = typeof ref === 'object' && Number.isFinite(ref.u) ? clamp(ref.u, 0, 1) : (isEnd ? 1 : 0);
    return (i0 + (i1 + 1 - i0) * u) * track.ds;
  }

  // Why a definition was rejected; kept on the result for the checker tool.
  function reject(def, why, out) { if (out) out.push({ id: def.id, street: def.street, reason: why }); return null; }

  // The reference line a side street follows: the circuit's ground plan, with
  // every stunt (loop, jump, corkscrew, hill, dip) replaced by a straight run,
  // then smoothed so the offset street never inherits a kink.
  function referencePath(track, startS, endS) {
    const S = track.samples, n = S.length, ds = track.ds;
    const i0 = Math.round(startS / ds), i1 = Math.round(endS / ds), y0 = S[i0 % n].p.y;
    const pts = [], good = [];
    for (let i = i0; i <= i1; i++) { const q = S[i % n]; pts.push(v3(q.p.x, y0, q.p.z)); good.push(FLAT.includes(q.kind) && Math.abs(q.p.y - y0) < 0.3); }
    // Each stunt run becomes one straight, gentle line from 15 m before it to
    // 30 m after it: a loop exits sideways of its entry, a street does not.
    const runs = []; for (let k = 0; k < pts.length; k++) if (!good[k]) { const a = k; while (k < pts.length && !good[k]) k++; runs.push([a, k - 1]); }
    for (const [a0, b0] of runs) {
      const a = Math.max(0, a0 - 15), b = Math.min(pts.length - 1, b0 + 30), pa = pts[a], pb = pts[b];
      for (let k = a + 1; k < b; k++) pts[k] = mix(pa, pb, (k - a) / (b - a));
    }
    // A loop ends where it began (its exit even lies behind its entry): after
    // flattening, many points share one spot. Keep one point per metre so the
    // street runs straight past the stunt instead of turning on the spot.
    const thin = [pts[0]];
    for (let k = 1; k < pts.length - 1; k++) if (len(sub(pts[k], thin[thin.length - 1])) >= 1) thin.push(pts[k]);
    if (len(sub(pts[pts.length - 1], thin[thin.length - 1])) < 1 && thin.length > 1) thin.pop();
    thin.push(pts[pts.length - 1]);
    const fixed = Math.min(8, Math.floor(thin.length / 4));
    for (let pass = 0; pass < 6; pass++) {
      const copy = thin.map((p) => ({ ...p }));
      for (let k = fixed; k < thin.length - fixed; k++) { let x = 0, z = 0, c = 0; for (let d = -5; d <= 5; d++) { const q = copy[clamp(k + d, 0, thin.length - 1)]; x += q.x; z += q.z; c++; } thin[k] = v3(x / c, y0, z / c); }
    }
    return thin;
  }

  // A side street leaves the circuit like a real one: a corner of radius R,
  // a straight diagonal at angle theta, and a corner back onto the parallel
  // street. Returns the lateral offset y as a function of along-distance x.
  function entryProfile(D, R, theta) {
    const pts = [[0, 0]], step = 0.25; let x = 0, y = 0, h = 0;
    const arc = R * theta, diag = Math.max(0, (D - 2 * R * (1 - Math.cos(theta))) / Math.sin(theta));
    const total = 2 * arc + diag;
    for (let t = step; t <= total + 1e-9; t += step) {
      const k = t <= arc ? 1 / R : t <= arc + diag ? 0 : -1 / R;
      h += k * step; x += Math.cos(h) * step; y += Math.sin(h) * step; pts.push([x, y]);
    }
    const scale = D / Math.max(1e-6, y); // absorb the integration error so the plateau is exact
    const at = (xx) => { if (xx <= 0) return 0; if (xx >= x) return D; let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] < xx) lo = m; else hi = m; } const a = pts[lo], b = pts[hi], f = (xx - a[0]) / Math.max(1e-9, b[0] - a[0]); return (a[1] + (b[1] - a[1]) * f) * scale; };
    return { length: x, at };
  }

  // Build one span route (cut, parallel or bypass). Returns null with a reason.
  function buildSpan(track, def, routes, why) {
    const S = track.samples, L = track.length, type = def.type;
    const startS = resolveS(track, def.from, false), endS = resolveS(track, def.to, true);
    if (startS == null || endS == null) return reject(def, 'from/to not found', why);
    if (!(endS - startS > 30)) return reject(def, 'span shorter than 30 m or reversed', why);
    if (startS < 40 || endS > L - 40) return reject(def, 'branch would straddle the finish line', why);
    const first = TB.frameAt(track, startS), last = TB.frameAt(track, endS);
    const flatAt = (f) => FLAT.includes(f.kind) && f.N.y > 0.995 && Math.abs(f.T.y) < 0.02;
    if (!flatAt(first) || !flatAt(last)) return reject(def, 'junction on a stunt, slope or banked curve', why);
    if (Math.abs(first.p.y) > 0.25 || Math.abs(last.p.y) > 0.25) return reject(def, 'junction not at street level (bridge or ramp)', why);
    if (routes.some((r) => startS < r.endS + 25 && endS > r.startS - 25)) return reject(def, 'overlaps another branch', why);
    // Water jumps have no street around them: a detour would drain the Rhine.
    let stunts = 0;
    for (let i = Math.floor(startS / track.ds); i < Math.ceil(endS / track.ds); i++) {
      const q = S[i];
      // a water jump (the Rhine, a harbour mouth) is a gap whose segment has nothing built under it; a jump over
      // a Büdchen or a house only marks the middle of its gap, so ask the segment, not the sample
      if (q.kind === 'gap' && !(track.segments[q.seg] && track.segments[q.seg].over)) return reject(def, 'span contains a water jump', why);
      if (!FLAT.includes(q.kind)) stunts++;
    }
    if (type === 'bypass' && !stunts) return reject(def, 'bypass needs a stunt to go around', why);
    const halfWidth = def.halfWidth || (type === 'cut' ? 3.8 : type === 'parallel' ? 4.6 : 4.2);
    let shape;
    if (type === 'cut') {
      const chord = len(sub(last.p, first.p)), handle = chord / 3;
      shape = sampleCurve([first.p, add(first.p, mul(first.T, handle)), sub(last.p, mul(last.T, handle)), last.p], endS - startS);
    } else {
      const side = def.side === 1 || def.side === -1 ? def.side : null;
      if (!side) return reject(def, 'parallel/bypass needs side 1 or -1', why);
      const offset = clamp(def.offset || 44, 24, 90);
      const ref = referencePath(track, startS, endS);
      const refCum = [0]; for (let k = 1; k < ref.length; k++) refCum.push(refCum[k - 1] + len(sub(ref[k], ref[k - 1])));
      const total = refCum[refCum.length - 1];
      const R = clamp(def.radius || 16, 13, 40), theta = clamp((def.angle || 55) * Math.PI / 180, 0.5, 1.4);
      const prof = entryProfile(offset, R, theta);
      if (total < 2 * prof.length + 12) return reject(def, `span too short: side streets need ${Math.round(2 * prof.length + 12)} m of circuit for a ${offset} m offset (have ${Math.round(total)} m); lower the offset or widen the span`, why);
      const lateral = (x) => Math.min(prof.at(x), prof.at(total - x));
      const pts = ref.map((p, k) => {
        const a = ref[Math.max(0, k - 2)], b = ref[Math.min(ref.length - 1, k + 2)]; const T = norm(v3(b.x - a.x, 0, b.z - a.z)); const B = cross(T, UP);
        return add(p, mul(B, side * lateral(refCum[k])));
      });
      pts[0] = { ...first.p }; pts[pts.length - 1] = { ...last.p };
      shape = samplePolyline(pts);
      // the street leaves and joins exactly along the circuit's heading (no kink at the junction)
      for (const [q, m] of [[shape.samples[0], first], [shape.samples[shape.samples.length - 1], last]]) { q.T = norm(v3(m.T.x, 0, m.T.z)); q.B = cross(q.T, UP); }
      shape.weight = (d) => lateral(d * total / shape.length) / offset;
      shape.offset = offset;
    }
    // Drivable: no corner tighter than 13 m radius (a Kölner street, not a hairpin car park).
    let maxCurv = 0; for (const q of shape.samples) maxCurv = Math.max(maxCurv, Math.abs(q.curv));
    if (maxCurv > 1 / 13) return reject(def, `corner too tight (radius ${Math.round(1 / maxCurv)} m)`, why);
    const saved = endS - startS - shape.length;
    if (type === 'cut' && !(saved >= 3)) return reject(def, 'cut is not shorter than the circuit', why);
    // Never cross or crowd another part of the circuit, and leave room for the houses of a real street.
    const circ = (a, b) => { let d = Math.abs(a - b) % L; return Math.min(d, L - d); };
    const clearOther = def.clearance || (type === 'cut' ? 12 : 17);
    for (let k = 0; k < shape.samples.length; k += 2) {
      const q = shape.samples[k], w = shape.weight ? shape.weight(q.s) : 1;
      for (let i = 0; i < S.length; i += 2) {
        const p = S[i].p, d = Math.hypot(p.x - q.p.x, p.z - q.p.z), s = i * track.ds;
        const related = s >= startS - 50 && s <= endS + 50;
        if (!related && circ(s, (startS + endS) / 2) > (endS - startS) / 2 + 50 && d < clearOther) return reject(def, `crosses the circuit near ${Math.round(s)} m`, why);
        if (related && type !== 'cut' && w > 0.97 && d < Math.max(20, shape.offset * 0.6)) return reject(def, `swings back onto the circuit near ${Math.round(s)} m`, why);
      }
      for (const r of routes) for (let m = 0; m < r.samples.length; m += 3) { const o = r.samples[m].p; if (Math.hypot(o.x - q.p.x, o.z - q.p.z) < 14) return reject(def, 'too close to branch ' + r.id, why); }
    }
    return { startS, endS, shape, saved, halfWidth, first, last };
  }

  // Where a branch surface meets the circuit's curb and sidewalk, and which of
  // its own edges lie outside the circuit's corridor (only those get a curb).
  function junctions(track, route) {
    const S = track.samples, n = S.length, mouth = [];
    const nearestMain = (p, hint) => { let best = 1e18, bi = hint; for (let k = -90; k <= 90; k++) { const i = ((hint + k) % n + n) % n, q = S[i].p, d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < best) { best = d; bi = i; } } return bi; };
    const edges = { '-1': [], '1': [] };
    let hint = Math.round(route.startS / track.ds);
    for (const q of route.samples) {
      const mapped = route.startS + q.s * (route.endS - route.startS) / route.length;
      hint = nearestMain(q.p, Math.round(mapped / track.ds));
      const m = S[hint], bl = Math.hypot(m.B.x, m.B.z) || 1, lat = ((q.p.x - m.p.x) * m.B.x + (q.p.z - m.p.z) * m.B.z) / bl;
      const inner = Math.abs(lat) - route.halfWidth, outer = Math.abs(lat) + route.halfWidth;
      if (inner < 10.6 && outer > 6) mouth.push({ i: hint, side: Math.sign(lat) || route.side });
      for (const e of [-1, 1]) { const eLat = lat + e * route.halfWidth * Math.sign(dot(q.B, m.B) || 1); edges[e].push(Math.abs(eLat) > 7.2); }
    }
    // Collapse to per-side index sets (with a metre of slack) for the road builder.
    const cut = { '-1': new Set(), '1': new Set() };
    for (const m of mouth) for (let d = -2; d <= 2; d++) cut[m.side].add(((m.i + d) % n + n) % n);
    route.mouthCut = { '-1': [...cut['-1']], '1': [...cut['1']] };
    route.edgeOutside = edges;
  }

  function buildRoutes(track, why) {
    const routes = [], defs = track.def.shortcuts || [], S = track.samples;
    for (const def of defs) {
      if (def.type || def.from != null) {
        const b = buildSpan(track, def, routes, why); if (!b) continue;
        const id = def.id || track.def.id + '-' + (def.street || 'street').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (routes.some((r) => r.id === id)) { reject(def, 'duplicate id', why); continue; }
        let resetS = null;
        for (let s = b.startS - 8; s >= 6; s -= 2) if ([-5, 0, 5].every((o) => { const q = TB.frameAt(track, s + o); return FLAT.includes(q.kind) && q.N.y > 0.995 && Math.abs(q.T.y) < 0.02; })) { resetS = s; break; }
        if (resetS == null) { reject(def, 'no level reset plot before the junction', why); continue; }
        const mid = b.shape.samples[Math.floor(b.shape.samples.length / 2)], mainMid = TB.frameAt(track, (b.startS + b.endS) / 2);
        const side = def.side || Math.sign(dot(sub(mid.p, mainMid.p), mainMid.B)) || 1;
        const route = { id, name: def.street || def.name || 'Seitenstraße', street: def.street || def.name || 'Seitenstraße', type: def.type || 'cut', toward: def.toward || '', note: def.note || '',
          kind: b.saved >= 3 ? 'shortcut' : 'alternate', style: b.saved >= 3 ? 'shortcut' : 'scenic', fork: null,
          surface: def.surface || 'asphalt', perks: def.perks || [], index: routes.length, startS: b.startS, endS: b.endS, resetS, length: b.shape.length, saved: b.saved, side,
          halfWidth: b.halfWidth, samples: b.shape.samples, offset: b.shape.offset || 0 };
        junctions(track, route); routes.push(route); continue;
      }
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
      const legacy = { id, name: def.street || def.name || 'Klüngel-Abkürzung', street: def.street || def.name || 'Klüngel-Abkürzung', type: 'cut', toward: def.toward || '', note: def.note || '',
        kind: 'shortcut', style: 'shortcut', fork: null,
        surface: def.surface || 'asphalt', perks: def.perks || [], index: routes.length, seg: def.seg,
        startS, endS, resetS, length: shape.length, saved, side, halfWidth: def.halfWidth || 3.8, samples: shape.samples, offset: 0 };
      junctions(track, legacy); routes.push(legacy);
    }
    appendBranches(track, routes);
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

  root.Shortcuts = { buildRoutes, frameAt, surfaceOffset, resolveS };
})(typeof window !== 'undefined' ? window : module.exports);
