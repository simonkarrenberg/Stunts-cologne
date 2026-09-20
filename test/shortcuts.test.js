const assert = require('assert');
const { TrackBuilder: TB } = require('../js/track');
const { Shortcuts: SC } = require('../js/shortcuts');
const { GameData: D } = require('../js/data');

module.exports = async function () {
  const lines = [];
  let count = 0;
  function check(track, route) {
    count++;
    assert(route.length > 0 && route.saved >= 3, 'shortcut must save real distance');
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
    assert(shortcutTime < mainTime, 'taking the branch actually saves driving time');
  }
  for (const def of D.TRACKS) {
    const track = TB.buildTrack(def), routes = SC.buildRoutes(track);
    for (const route of routes) check(track, route);
    if (def.shortcuts && def.shortcuts.length) {
      assert.strictEqual(routes.length, def.shortcuts.length, def.id + ': each advertised route must be buildable');
      lines.push(def.id + ': ' + routes.length + ' continuous, shorter routes');
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
  lines.push(count + ' route geometries checked; invalid, overlap, stunt, and crossing guards passed');
  return { name: 'shortcuts', ok: true, lines };
};
