const assert = require('assert');
const { TrackBuilder: TB } = require('../js/track');
const { Shortcuts: SC } = require('../js/shortcuts');
const { GameData: D } = require('../js/data');

module.exports = async function () {
  const lines = [];
  let count = 0;
  function check(track, route) {
    count++;
    const kind = route.type || 'cut';
    assert(['cut', 'parallel', 'bypass'].includes(kind), 'known branch type');
    assert(typeof route.street === 'string' && route.street.length > 1, 'every branch carries its street name');
    if (kind === 'cut') assert(route.length > 0 && route.saved >= 3, 'a cut must save real distance');
    else assert(route.length > 0 && route.length < (route.endS - route.startS) + 150, 'a parallel street or bypass stays a sensible detour');
    assert(route.startS > 0 && route.endS < track.length, 'branch must not straddle the finish line');
    assert(route.startS < route.endS, 'race progress must increase monotonically');
    assert(route.resetS < route.startS - 5, 'reset plot must precede the branch');
    for (const offset of [-5, 0, 5]) {
      const reset = TB.frameAt(track, route.resetS + offset);
      assert(['straight', 'curve', 'bridge', 'tunnel'].includes(reset.kind) && reset.N.y > 0.995 && Math.abs(reset.T.y) < 0.02, 'the complete reset plot must be level main road, never a jump gap');
    }
    assert.strictEqual(SC.surfaceOffset(route, 0), 0.1, 'entrance surface must meet the main-road car pose');
    assert.strictEqual(SC.surfaceOffset(route, route.length), 0.1, 'exit surface must meet the main-road car pose');
    assert.strictEqual(SC.surfaceOffset(route, route.length / 2), 0.26, 'alley car pose and raised pavement must align');
    const a = SC.frameAt(route, 0), b = SC.frameAt(route, route.length);
    const ma = TB.frameAt(track, route.startS), mb = TB.frameAt(track, route.endS);
    assert(TB.len(TB.sub(a.p, ma.p)) < 1e-6 && TB.len(TB.sub(b.p, mb.p)) < 1e-6, 'junction positions must be continuous');
    assert(TB.dot(a.T, ma.T) > 0.9999 && TB.dot(b.T, mb.T) > 0.9999, 'junction headings must be continuous');
    assert.deepStrictEqual(SC.frameAt(route, -100).p, a.p, 'reverse travel clamps to the entry');
    assert.deepStrictEqual(SC.frameAt(route, route.length + 100).p, b.p, 'open branches must not wrap');
    const mid = SC.frameAt(route, route.length / 2), main = TB.frameAt(track, (route.startS + route.endS) / 2);
    assert.strictEqual(Math.sign(TB.dot(TB.sub(mid.p, main.p), main.B)), route.side, 'sign must point toward the physical branch');
    let travelled = 0;
    for (let i = 0; i < route.samples.length; i++) {
      const f = route.samples[i];
      for (const v of [f.p, f.T, f.N, f.B]) for (const key of ['x', 'y', 'z']) assert(Number.isFinite(v[key]), 'finite geometry');
      assert(Number.isFinite(f.curv), 'finite curvature');
      assert(Math.abs(TB.len(f.T) - 1) < 1e-6 && Math.abs(TB.dot(f.T, f.B)) < 1e-6, 'orthonormal moving frame');
      if (i) {
        const prev = route.samples[i - 1], step = TB.len(TB.sub(f.p, prev.p));
        assert(step <= 1.01 && step > 0.8, 'route samples represent about one actual metre');
        assert(f.s > prev.s, 'sample distances must increase');
        travelled += step;
      }
    }
    assert(Math.abs(travelled - route.length) < 0.1, 'reported distance matches rendered path');
    const speed = 25, shortcutTime = route.length / speed, mainTime = (route.endS - route.startS) / speed;
    if (kind === 'cut') assert(shortcutTime < mainTime, 'taking the cut actually saves driving time');
    if (kind === 'bypass') {
      let stunt = false; for (let s = route.startS; s <= route.endS; s += 1) { const q = TB.frameAt(track, s); if (!['straight', 'curve', 'bridge', 'tunnel'].includes(q.kind) || Math.abs(q.p.y - route.samples[0].p.y) > 0.3) stunt = true; }
      assert(stunt, 'a bypass must go round a stunt on the circuit');
    }
    const y0 = route.samples[0].p.y; assert(route.samples.every((q) => Math.abs(q.p.y - y0) < 0.05), 'a side street runs at street level');
    // curb and sidewalk open only where the street meets the circuit
    assert(route.mouthCut && Array.isArray(route.mouthCut['-1']) && Array.isArray(route.mouthCut['1']), 'junction mouths are known to the road builder');
    assert(route.mouthCut['-1'].length + route.mouthCut['1'].length > 0 && route.mouthCut['-1'].length + route.mouthCut['1'].length < 120, 'the mouths are short openings, not a missing curb');
  }
  for (const def of D.TRACKS) {
    const track = TB.buildTrack(def), routes = SC.buildRoutes(track);
    for (const route of routes) check(track, route);
    if (def.shortcuts && def.shortcuts.length) {
      assert.strictEqual(routes.length, def.shortcuts.length, def.id + ': each advertised route must be buildable');
      lines.push(def.id + ': ' + routes.length + ' real streets (' + routes.map((r) => r.street + ' ' + (r.type || 'cut')).join(', ') + ')');
    }
  }
  // A stable fixture exercises the module independently of the built-in map
  // catalog, including rejected data and overlap safety.
  const fixture = { id: 'shortcut-fixture', segments: [
    { t: 'straight', len: 120 }, { t: 'curve', r: 40, angle: 90 },
    { t: 'straight', len: 120 }, { t: 'curve', r: 40, angle: 90 },
    { t: 'straight', len: 120 }, { t: 'curve', r: 40, angle: 90 },
    { t: 'straight', len: 120 }, { t: 'curve', r: 40, angle: 90 }
  ], shortcuts: [{ id: 'alley', name: 'Test alley', seg: 1 }] };
  const track = TB.buildTrack(fixture), routes = SC.buildRoutes(track);
  assert.strictEqual(routes.length, 1, 'flat curve must support a usable branch');
  check(track, routes[0]);
  const invalid = TB.buildTrack({ ...fixture, shortcuts: [{ seg: -1 }, { seg: 0 }, { seg: 99 }] });
  assert.deepStrictEqual(SC.buildRoutes(invalid), [], 'invalid and straight segments cannot become shortcuts');
  const overlap = TB.buildTrack({ ...fixture, shortcuts: [{ id: 'a', seg: 1 }, { id: 'b', seg: 1 }] });
  assert.strictEqual(SC.buildRoutes(overlap).length, 1, 'overlapping branches are rejected');
  const stunt = TB.buildTrack({ ...fixture, segments: fixture.segments.map((s, i) => i === 2 ? { t: 'hill', len: 120, pitch: 10 } : s) });
  const besideStunt = SC.buildRoutes(stunt);
  assert.strictEqual(besideStunt.length, 1, 'curve beside a stunt can still have a branch');
  const hillStart = stunt.samples.findIndex((s) => s.seg === 2) * stunt.ds;
  assert.strictEqual(besideStunt[0].endS, hillStart, 'branch must rejoin before the hill starts');
  check(stunt, besideStunt[0]);
  const elevated = TB.buildTrack(fixture);
  elevated.samples[Math.floor(routes[0].startS + 30)].p.y = 5;
  assert.deepStrictEqual(SC.buildRoutes(elevated), [], 'elevated route portions must be rejected');
  // Insert an unrelated main-road sample directly across the alley.
  const crossing = TB.buildTrack(fixture), mid = SC.frameAt(routes[0], routes[0].length / 2).p;
  crossing.samples[400].p = { ...mid };
  assert.deepStrictEqual(SC.buildRoutes(crossing), [], 'unrelated road crossings must be rejected');
  // v2 branch types: a parallel street one block over, and a street round a jump over a Büdchen
  const blocks = [{ t: 'straight', len: 160 }, { t: 'curve', r: 40, angle: 90 }, { t: 'straight', len: 160 }, { t: 'curve', r: 40, angle: 90 }, { t: 'straight', len: 160 }, { t: 'curve', r: 40, angle: 90 }, { t: 'straight', len: 160 }, { t: 'curve', r: 40, angle: 90 }];
  const par = TB.buildTrack({ id: 'fx-par', segments: blocks, shortcuts: [{ id: 'p', street: 'Teststraße', type: 'parallel', from: { seg: 0, u: 0.5 }, to: { seg: 2, u: 0.5 }, side: 1, offset: 40 }] });
  const parRoutes = SC.buildRoutes(par); assert.strictEqual(parRoutes.length, 1, 'a parallel street round the outside of a corner builds'); check(par, parRoutes[0]);
  const why = []; SC.buildRoutes(TB.buildTrack({ id: 'fx-in', segments: blocks, shortcuts: [{ id: 'p', street: 'Teststraße', type: 'parallel', from: { seg: 0, u: 0.5 }, to: { seg: 2, u: 0.5 }, side: -1, offset: 40 }] }), why);
  assert(why.length === 1 && /corner too tight|crosses/.test(why[0].reason), 'a parallel street on the inside of a tight corner is rejected with a reason');
  const jumpy = blocks.slice(0, 2).concat([{ t: 'straight', len: 110 }, { t: 'jump', ramp: 30, angle: 16, gap: 34, over: 'buedchen' }, { t: 'straight', len: 150 }], blocks.slice(3));
  const byp = TB.buildTrack({ id: 'fx-byp', segments: jumpy, shortcuts: [{ id: 'b', street: 'Umweg', type: 'bypass', from: { seg: 2, u: 0.15 }, to: { seg: 4, u: 0.6 }, side: 1, offset: 40 }] });
  const bypRoutes = SC.buildRoutes(byp); assert.strictEqual(bypRoutes.length, 1, 'a bypass round a jump over a Büdchen builds (only water jumps are refused)'); check(byp, bypRoutes[0]);
  const noStunt = []; SC.buildRoutes(TB.buildTrack({ id: 'fx-ns', segments: blocks, shortcuts: [{ id: 'b', street: 'Umweg', type: 'bypass', from: { seg: 0, u: 0.5 }, to: { seg: 2, u: 0.5 }, side: 1, offset: 40 }] }), noStunt);
  assert(noStunt.length === 1, 'a bypass needs a stunt to go round');
  lines.push(count + ' route geometries checked; invalid, overlap, stunt, crossing, parallel and bypass guards passed');
  return { name: 'shortcuts', ok: true, lines };
};
