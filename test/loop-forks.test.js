// A fork that follows a loop within 150 m gets announced before the loop: an overhead gantry prop
// ('NOH DÄM LOOPING:' with one panel per arm), on level road, with its posts clear of every branch street.
const assert = require('assert');
const { TrackBuilder: TB } = require('../js/track');
const { Shortcuts: SC } = require('../js/shortcuts');
const { GameData: D } = require('../js/data');

module.exports = async function () {
  const lines = []; let forks = 0;
  for (const def of D.TRACKS) {
    const track = TB.buildTrack(def), routes = SC.buildRoutes(track), S = track.samples, n = S.length, ds = track.ds, L = track.length;
    const segAt = (seg, u) => { let i0 = -1, i1 = -1; for (let i = 0; i < n; i++) if (S[i].seg === seg) { if (i0 < 0) i0 = i; i1 = i; } return (i0 + (u == null ? 0.5 : u) * (i1 - i0)) * ds; }; // as world.js places props
    const gantries = (def.props || []).filter((p) => p.type === 'gantry');
    const used = new Set();
    for (let i = 0; i < n; i++) {
      if (S[i].kind !== 'loop' || S[(i + 1) % n].kind === 'loop') continue;
      let j = i; while (S[(j - 1 + n) % n].kind === 'loop') j--;
      const loopStart = j * ds, loopEnd = i * ds;
      for (const startS of [...new Set(routes.map((r) => r.startS))]) {
        const gap = ((startS - loopEnd) % L + L) % L; if (gap >= 150) continue;
        const arms = routes.filter((r) => r.startS === startS); forks++;
        const g = gantries.find((p) => arms.every((r) => (p.fork || []).includes(r.id)));
        assert(g, `${def.id}: fork ${arms.map((r) => r.id).join('+')} comes ${Math.round(gap)} m after the loop at ${Math.round(loopStart)} m: it needs a gantry before the loop`);
        used.add(g);
        const s = segAt(g.seg, g.u), before = ((loopStart - s) % L + L) % L;
        assert(before > 15 && before < 120, `${def.id}: the gantry must stand 15–120 m before the loop (is ${Math.round(before)} m)`);
        assert(g.side != null && g.dist === 0, `${def.id}: the gantry spans the road centre`);
        for (const r of arms) assert(g.dirs.some((d) => d.startsWith(r.side < 0 ? '←' : '→')), `${def.id}: the gantry needs a ${r.side < 0 ? 'left' : 'right'} panel for ${r.id}`);
        assert(g.dirs.includes('↑'), `${def.id}: the gantry shows the main road too`);
        const f = TB.frameAt(track, s), bl = Math.hypot(f.B.x, f.B.z), k = Math.round(s / ds);
        for (let m = -6; m <= 6; m++) { const q = S[((k + m) % n + n) % n]; assert(['straight', 'curve'].includes(q.kind) && Math.abs(q.p.y) < 0.3, `${def.id}: the gantry needs level road (${q.kind})`); }
        for (const side of [-1, 1]) {
          const px = f.p.x + f.B.x / bl * side * 8.4, pz = f.p.z + f.B.z / bl * side * 8.4; // the posts (world.js P.gantry: ROAD_W + 2.4)
          const clear = (r) => r.halfWidth + ((r.perks || []).includes('parked') ? 2.2 : 0) + 3.5; // world.js clearTheStreets: branch half width + parking lane + 3 m, plus the post
          for (const r of routes) for (const q of r.samples) assert(Math.hypot(q.p.x - px, q.p.z - pz) > clear(r), `${def.id}: a gantry post stands in ${r.id} (the street clearing would push it off the road)`);
        }
      }
    }
    for (const g of gantries) assert(used.has(g), `${def.id}: gantry ${g.fork} has no loop-then-fork to announce`);
  }
  lines.push(`${forks} forks within 150 m after a loop, each with its gantry`);
  return { name: 'loop-forks', ok: true, lines };
};
