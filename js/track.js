/* ============================================================
   STUNTS KÖLLE 4D — Track builder
   Builds a 3D centerline with a moving frame (T = forward,
   N = up, B = right) from a list of Stunts-like segments.
   Pure math, no THREE dependency -> testable in node.
   ============================================================ */
(function (root) {
  'use strict';

  const DS = 1.0; // metres per sample

  // --- tiny vector helpers ---------------------------------
  const v3 = (x, y, z) => ({ x, y, z });
  const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
  const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
  const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  const len = (a) => Math.sqrt(dot(a, a));
  const norm = (a) => { const l = len(a) || 1; return mul(a, 1 / l); };
  // rotate vector v around unit axis k by angle a (Rodrigues)
  function rot(v, k, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
  }
  const smooth = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const DEG = Math.PI / 180;

  /**
   * Segment types:
   *  { t:'straight', len }
   *  { t:'bridge',   len }                      straight with rails
   *  { t:'curve', angle(+left/-right, deg), r, bank(deg, optional) }
   *  { t:'hill', len, pitch(deg) }              symmetric bump
   *  { t:'dip',  len, pitch(deg) }              symmetric dip
   *  { t:'loop', r, shift }                     vertical loop (corkscrew shift sideways)
   *  { t:'jump', ramp, angle(deg), gap }        ramp -> gap -> lower landing
   *  { t:'tunnel', len }                        straight inside a tunnel
   */
  function buildCenterline(segments) {
    let p = v3(0, 0, 0);
    let T = v3(0, 0, 1), N = v3(0, 1, 0);
    let B = cross(T, N); // right (visually right when looking along T)
    const samples = [];
    let s = 0;
    let segIndex = 0;

    function push(kind, roll, extra) {
      // apply roll to output frame
      const No = rot(N, T, roll), Bo = rot(B, T, roll);
      samples.push(Object.assign({ p: { ...p }, T: { ...T }, N: No, B: Bo, s, kind, seg: segIndex, roll }, extra || {}));
    }
    function stepForward(d) { p = add(p, mul(T, d)); s += d; }
    function flatten() {
      T = norm(v3(T.x, 0, T.z)); N = v3(0, 1, 0); B = cross(T, N);
    }

    for (const seg of segments) {
      switch (seg.t) {
        case 'straight':
        case 'bridge':
        case 'tunnel': {
          const n = Math.round(seg.len / DS);
          for (let i = 0; i < n; i++) { push(seg.t, 0); stepForward(DS); }
          break;
        }
        case 'curve': {
          const A = seg.angle * DEG, R = seg.r;
          const L = Math.abs(A) * R, n = Math.round(L / DS), dA = A / n;
          const bank = -(seg.bank || 0) * DEG * Math.sign(A); // inside edge down
          for (let i = 0; i < n; i++) {
            const u = i / n;
            const rollAmt = bank * (smooth(u / 0.25) - smooth((u - 0.75) / 0.25));
            push('curve', rollAmt, { curv: A / L });
            stepForward(DS);
            T = rot(T, N, dA); B = cross(T, N);
          }
          break;
        }
        case 'hill':
        case 'dip': {
          const n = Math.round(seg.len / DS), P = seg.pitch * DEG * (seg.t === 'hill' ? 1 : -1);
          let prev = 0;
          for (let i = 0; i < n; i++) {
            const u = i / n;
            const pitch = P * Math.sin(2 * Math.PI * u);
            const d = pitch - prev; prev = pitch;
            T = rot(T, B, d); N = rot(N, B, d);
            push(seg.t, 0);
            stepForward(DS);
          }
          // restore exactly flat
          T = rot(T, B, -prev); N = rot(N, B, -prev);
          flatten();
          break;
        }
        case 'loop': {
          const R = seg.r, L = 2 * Math.PI * R, n = Math.round(L / DS), dA = 2 * Math.PI / n;
          const shift = (seg.shift == null ? 14 : seg.shift) / n;
          for (let i = 0; i < n; i++) {
            push('loop', 0, { loopU: i / n });
            stepForward(DS);
            p = add(p, mul(B, shift));
            T = rot(T, B, dA); N = rot(N, B, dA);
          }
          flatten();
          break;
        }
        case 'jump': {
          const startY = p.y;
          const n = Math.round(seg.ramp / DS), a = seg.angle * DEG;
          for (let i = 0; i < n; i++) {
            push('ramp', 0, { rampAngle: a * (i / n) });
            stepForward(DS);
            T = rot(T, B, a / n); N = rot(N, B, a / n);
          }
          // gap: flat frame, back down to base height
          flatten();
          p = v3(p.x, startY, p.z);
          const g = Math.round(seg.gap / DS);
          for (let i = 0; i < g; i++) { push('gap', 0, { rampAngle: a }); stepForward(DS); }
          break;
        }
        default:
          throw new Error('unknown segment ' + seg.t);
      }
      segIndex++;
    }
    return samples;
  }

  // Close the loop: spread the residual error over the last 45% of samples.
  function closeLoop(samples) {
    const n = samples.length;
    const last = samples[n - 1];
    const endP = add(last.p, mul(last.T, DS));
    const err = sub(samples[0].p, endP);
    const errLen = len(err);
    const from = Math.floor(n * 0.55);
    for (let i = from; i < n; i++) {
      const u = smooth((i - from) / (n - from));
      samples[i].p = add(samples[i].p, mul(err, u));
    }
    // recompute tangents from positions for the corrected region
    for (let i = from; i < n; i++) {
      const nx = samples[(i + 1) % n].p, cur = samples[i].p;
      const t = norm(sub(nx, cur));
      if (len(sub(nx, cur)) > 0.01) {
        samples[i].T = t;
        samples[i].B = norm(cross(t, samples[i].N));
      }
    }
    const headingErr = Math.acos(Math.max(-1, Math.min(1, dot(last.T, samples[0].T)))) / DEG;
    return { errLen, headingErr, length: n * DS };
  }

  // Auto-closure: adjust lengths of straight-type segments (min-norm least squares)
  // so the loop closes in XZ. Heading closure is the designer's job (sum of curves = 360).
  function autoClose(segments) {
    const segs = segments.map((s) => Object.assign({}, s));
    const adjustable = ['straight', 'bridge', 'tunnel'];
    for (let iter = 0; iter < 4; iter++) {
      const samples = buildCenterline(segs);
      const last = samples[samples.length - 1];
      const endP = add(last.p, mul(last.T, DS));
      const e = sub(samples[0].p, endP);
      if (Math.hypot(e.x, e.z) < 0.5) break;
      // heading direction of each adjustable segment
      const dirs = [];
      for (let i = 0; i < segs.length; i++) {
        if (!adjustable.includes(segs[i].t)) continue;
        const smp = samples.find((q) => q.seg === i);
        if (!smp) continue;
        const d = norm(v3(smp.T.x, 0, smp.T.z));
        dirs.push({ i, dx: d.x, dz: d.z });
      }
      if (dirs.length < 2) break;
      // D (2 x m); solve D D^T y = e ; delta = D^T y
      let a = 0, b = 0, c = 0;
      for (const d of dirs) { a += d.dx * d.dx; b += d.dx * d.dz; c += d.dz * d.dz; }
      const det = a * c - b * b;
      if (Math.abs(det) < 1e-6) break;
      const y1 = (c * e.x - b * e.z) / det, y2 = (-b * e.x + a * e.z) / det;
      for (const d of dirs) {
        const delta = d.dx * y1 + d.dz * y2;
        segs[d.i].len = Math.max(8, segs[d.i].len + delta);
      }
    }
    return segs;
  }

  function scaleSegments(segments, k) {
    if (!k || k === 1) return segments;
    return segments.map((s) => {
      const o = Object.assign({}, s);
      if (o.len != null && (o.t === 'straight' || o.t === 'bridge' || o.t === 'tunnel')) o.len *= k;
      if (o.t === 'curve') o.r *= Math.sqrt(k);
      return o;
    });
  }

  function buildTrack(def) {
    const segments = autoClose(scaleSegments(def.segments, def.scale));
    const samples = buildCenterline(segments);
    const info = closeLoop(samples);
    // AI: safe speed per sample from curvature (looking ahead)
    const n = samples.length;
    const safe = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const c = Math.abs(samples[i].curv || 0);
      let v = c > 1e-4 ? Math.sqrt(120 / c) : 999;
      if (samples[i].kind === 'loop') v = Math.max(v, 34);
      if (samples[i].kind === 'ramp' || samples[i].kind === 'gap') v = Math.max(v, 40);
      safe[i] = v;
    }
    // smooth backwards so AI brakes before the curve
    for (let k = 0; k < 2; k++) for (let i = n - 1; i >= 0; i--) {
      const nx = safe[(i + 1) % n];
      safe[i] = Math.min(safe[i], nx + 0.35);
    }
    return { def, segments, samples, safe, length: info.length, info, ds: DS };
  }

  // frame at arbitrary distance (wraps)
  function frameAt(track, s) {
    const n = track.samples.length;
    const L = track.length;
    let u = ((s % L) + L) % L;
    const i = Math.floor(u / DS) % n, f = u / DS - Math.floor(u / DS);
    const a = track.samples[i], b = track.samples[(i + 1) % n];
    const lerp = (x, y) => v3(x.x + (y.x - x.x) * f, x.y + (y.y - x.y) * f, x.z + (y.z - x.z) * f);
    return {
      p: lerp(a.p, b.p), T: norm(lerp(a.T, b.T)), N: norm(lerp(a.N, b.N)), B: norm(lerp(a.B, b.B)),
      kind: a.kind, curv: a.curv || 0, rampAngle: a.rampAngle || 0, roll: a.roll, index: i, loopU: a.loopU
    };
  }

  root.TrackBuilder = { buildTrack, frameAt, v3, add, sub, mul, dot, cross, len, norm, rot, DS };
})(typeof window !== 'undefined' ? window : module.exports);
