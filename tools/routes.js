#!/usr/bin/env node
// Route checker for Kölle 4D. Prints a track's segment plan with the real places
// placed along it, and tries branch definitions against the geometry.
//   node tools/routes.js <trackId>                 segment plan + current branches
//   node tools/routes.js <trackId> defs.json       try the definitions in defs.json
//   node tools/routes.js <trackId> '<json array>'  same, inline
//   node tools/routes.js <trackId> '{"shortcuts":[...],"branches":[...]}'   replace both lists
// A definition passes when it appears under BUILT; otherwise REJECTED lists why.
// Authored forks (def.branches) are built after the shortcuts: a shortcut that overlaps a
// fork knocks the fork out silently in the game, so DROPPED lists every fork arm that failed.
const fs = require('fs'), path = require('path');
const TB = require('../js/track.js').TrackBuilder, D = require('../js/data.js').GameData, SC = require('../js/shortcuts.js').Shortcuts;
const id = process.argv[2], arg = process.argv[3];
const def = D.TRACKS.find((t) => t.id === id);
if (!def) { console.log('tracks:', D.TRACKS.map((t) => t.id).join(', ')); process.exit(1); }
let defs = null, branches = def.branches || [];
if (arg) {
  const raw = JSON.parse(/^\s*[\[{]/.test(arg) ? arg : fs.readFileSync(path.resolve(arg), 'utf8'));
  if (Array.isArray(raw)) defs = raw; else { defs = raw.shortcuts || def.shortcuts || []; if (raw.branches) branches = raw.branches; }
}
const track = TB.buildTrack(Object.assign({}, def, defs ? { shortcuts: defs } : {}, { branches }));
const S = track.samples, n = S.length, L = track.length;
// the circuit's ground plan as a polygon, to tell the outer side of each segment
const poly = S.filter((_, i) => i % 4 === 0).map((q) => [q.p.x, q.p.z]);
const inside = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
if (!defs) {
  console.log(`# ${def.id} · ${def.name} · ${Math.round(L)} m per lap · waypoints: ${(def.waypoints || []).join(' → ')}`);
  console.log('seg  type        start   end    len  flat  outside-circuit  inside-of-turn  places (props with seg, side, dist)');
  const rng = {}; S.forEach((q, i) => { (rng[q.seg] = rng[q.seg] || [i, i])[1] = i; });
  track.segments.forEach((sg, k) => {
    const r = rng[k]; if (!r) return; const a = r[0] * track.ds, b = (r[1] + 1) * track.ds, mid = S[Math.floor((r[0] + r[1]) / 2)];
    const flat = S.slice(r[0], r[1] + 1).every((q) => ['straight', 'curve', 'bridge', 'tunnel'].includes(q.kind) && Math.abs(q.p.y) < 0.25 && q.N.y > 0.995);
    const bl = Math.hypot(mid.B.x, mid.B.z) || 1; const out = [1, -1].filter((sd) => !inside(mid.p.x + mid.B.x / bl * sd * 44, mid.p.z + mid.B.z / bl * sd * 44));
    const places = (def.props || []).filter((p) => p.seg === k && !/^(neon|tram|tramline|crowd|koelsch|palm|cafe|lamp|bank|tree|row|altstadt|billboard|graffiti|litfass|buedchen|platz|rails|bunting|banner|flag)$/.test(p.type)).map((p) => `${p.type}(${p.side > 0 ? '+' : p.side < 0 ? '-' : '0'}${p.dist})`);
    const desc = sg.t + (sg.angle ? `(${sg.angle > 0 ? 'L' : 'R'}${Math.abs(Math.round(sg.angle))} r${Math.round(sg.r)})` : '');
    const turnIn = sg.t === 'curve' ? (sg.angle > 0 ? '-1' : '+1') : '   ';
    console.log(`${String(k).padStart(3)}  ${desc.padEnd(11)} ${String(Math.round(a)).padStart(5)} ${String(Math.round(b)).padStart(5)} ${String(Math.round(b - a)).padStart(5)}   ${flat ? 'yes' : ' - '}  ${(out.length === 2 ? 'both' : out.length ? (out[0] > 0 ? '+1' : '-1') : 'none').padEnd(15)}  ${turnIn.padEnd(14)}  ${places.join(' ')}`);
  });
  console.log('\nside +1 = the B (right-hand) direction of the circuit; props use the same sign convention.\nA parallel street or bypass must pass curves on their OUTSIDE (the side that is not inside-of-turn),\nor stay on straights; offset 40-55 m leaves room for a block of houses between the two streets.');
}
const why = [], routes = SC.buildRoutes(track, why);
console.log('\nBUILT');
for (const r of routes) {
  const segAt = (sPos) => { const q = TB.frameAt(track, sPos); return q.seg != null ? q.seg : S[Math.min(n - 1, Math.floor(sPos / track.ds))].seg; };
  const mid = r.samples[Math.floor(r.samples.length / 2)];
  console.log(`  ${r.id} · ${r.street} · ${r.type}${r.fork ? ' fork ' + r.fork : ''} · ${Math.round(r.startS)}–${Math.round(r.endS)} m (seg ${segAt(r.startS)}–${segAt(r.endS)}) · branch ${Math.round(r.length)} m vs circuit ${Math.round(r.endS - r.startS)} m (${r.saved >= 0 ? 'saves ' + Math.round(r.saved) : 'detour +' + Math.round(-r.saved)} m) · side ${r.side} · width ${(r.halfWidth * 2).toFixed(1)} m · midpoint x ${Math.round(mid.p.x)} z ${Math.round(mid.p.z)}`);
}
const dropped = branches.filter((b) => !routes.some((r) => r.id === b.id));
if (dropped.length) { console.log('DROPPED authored fork arms (overlap with a shortcut, a crossing or a changed mouth):'); for (const b of dropped) console.log(`  ${b.id} · ${b.street || b.name} · fork ${b.fork}`); }
if (why.length) { console.log('REJECTED'); for (const w of why) console.log(`  ${w.id || w.street}: ${w.reason}`); }
if (defs && routes.length !== defs.length && !why.length) console.log('(legacy { seg } definitions are rejected silently when the curve is not eligible)');
