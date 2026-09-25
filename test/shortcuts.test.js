const assert = require('assert');
const { TrackBuilder: TB } = require('../js/track');
const { Shortcuts: SC } = require('../js/shortcuts');
const { GameData: D } = require('../js/data');

module.exports = async function () {
  const lines = [];
  let count = 0;
  function check(track, route) {
    count++;
    assert(route.length > 0 && Number.isFinite(route.saved), 'route must have a real signed distance difference');
    assert.strictEqual(route.type, route.kind, 'route type and renderer kind agree');
    if (route.kind === 'shortcut') assert(route.saved >= 3, 'shortcut must save real distance');
    else assert.strictEqual(route.kind, 'alternate', 'longer paths are explicitly marked alternate');
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
    assert([-1, 1].includes(route.side), 'each entrance has a physical steering side');
    if ((track.def.shortcuts || []).some((d) => d.seg === route.seg && (!d.id || d.id === route.id))) {
      const mid = SC.frameAt(route, route.length / 2), main = TB.frameAt(track, (route.startS + route.endS) / 2);
      assert.strictEqual(Math.sign(TB.dot(TB.sub(mid.p, main.p), main.B)), route.side, 'legacy sign must point toward the physical branch');
    }
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
    assert.strictEqual(Math.sign(mainTime - shortcutTime), Math.sign(route.saved), 'signed saving matches actual driving distance');
  }
  for (const def of D.TRACKS) {
    const track = TB.buildTrack(def), routes = SC.buildRoutes(track);
    for (const route of routes) check(track, route);
    if (def.shortcuts && def.shortcuts.length || def.branches && def.branches.length) {
      assert.strictEqual(routes.length, (def.shortcuts || []).length + (def.branches || []).length, def.id + ': each advertised route must be buildable');
      lines.push(def.id + ': ' + routes.length + ' continuous roads (' + routes.filter((r) => r.kind === 'alternate').length + ' scenic alternatives)');
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

  // A pair of side streets makes a real three-way fork: the unmodified main
  // road plus two independent routes, with exact shared entry/exit frames.
  const multi = { id: 'multiway-fixture', segments: [
    { t: 'straight', len: 240 }, { t: 'curve', r: 80, angle: 90 },
    { t: 'straight', len: 240 }, { t: 'curve', r: 80, angle: 90 },
    { t: 'straight', len: 240 }, { t: 'curve', r: 80, angle: 90 },
    { t: 'straight', len: 240 }, { t: 'curve', r: 80, angle: 90 }
  ], branches: [-1, 1].map((side) => ({ id: 'side-' + side, name: 'Nebenstraße ' + side, fork: 'three-way',
    from: { seg: 0, u: 0.25 }, to: { seg: 0, u: 0.9 }, style: 'scenic',
    via: [{ x: side * 32, z: 115 }, { x: side * 32, z: 160 }] })) };
  const multiTrack = TB.buildTrack(multi), multiRoutes = SC.buildRoutes(multiTrack);
  assert.strictEqual(multiRoutes.length, 2, 'left and right routes must coexist at one fork');
  assert.strictEqual(multiRoutes[0].side, -multiRoutes[1].side, 'steering left/right must select different siblings');
  assert.strictEqual(multiRoutes[0].startS, multiRoutes[1].startS, 'fork mouths align');
  assert.strictEqual(multiRoutes[0].endS, multiRoutes[1].endS, 'fork rejoins align');
  for (const route of multiRoutes) {
    check(multiTrack, route);
    assert(route.saved < -10 && route.kind === 'alternate', 'scenic streets may be honestly longer than the main road');
  }
  const crossDistrict = { id: 'district-cut', name: 'Real multi-segment cut', from: { seg: 0, u: 0.5 }, to: { seg: 2, u: 0.5 },
    via: [{ x: 32, z: 175 }, { x: 65, z: 250 }, { x: 140, z: 289 }] };
  const districtTrack = TB.buildTrack({ ...multi, branches: [crossDistrict] }), districtRoutes = SC.buildRoutes(districtTrack);
  assert.strictEqual(districtRoutes.length, 1, 'a route may bypass several main-road segments');
  assert(districtRoutes[0].saved > 50, 'cross-district route saves meaningful real distance');
  check(districtTrack, districtRoutes[0]);
  for (const via of crossDistrict.via) assert(Math.min(...districtRoutes[0].samples.map((s) => Math.hypot(s.p.x - via.x, s.p.z - via.z))) < 0.6, 'rendered street follows each authored waypoint');

  function buildInvalid(branches) { return SC.buildRoutes(TB.buildTrack({ ...multi, branches })); }
  assert.strictEqual(buildInvalid([multi.branches[0], { ...multi.branches[1], fork: 'different' }]).length, 1, 'overlapping intervals require the same fork');
  assert.strictEqual(buildInvalid([multi.branches[0], { ...multi.branches[0], id: 'same-side' }]).length, 1, 'two roads cannot claim the same steering choice');
  assert.strictEqual(buildInvalid([multi.branches[0], { ...multi.branches[1], to: { seg: 0, u: 0.95 } }]).length, 1, 'same-fork siblings require the exact same rejoin');
  const secondStreet = TB.frameAt(multiTrack, multiTrack.samples.findIndex((s) => s.seg === 2));
  const reusedFork = { ...multi.branches[1], id: 'duplicate-fork', from: { seg: 2, u: 0.25 }, to: { seg: 2, u: 0.9 },
    via: [{ x: secondStreet.p.x + 115, z: secondStreet.p.z + 32 }, { x: secondStreet.p.x + 160, z: secondStreet.p.z + 32 }] };
  assert.strictEqual(buildInvalid([multi.branches[0], reusedFork]).length, 1, 'one fork identifier cannot silently name two different intersections');
  for (const broken of [
    { from: { seg: -1, u: 0.5 } }, { to: { seg: 0, u: 2 } }, { from: { seg: 0, u: 0.01 } },
    { from: { seg: 2, u: 0.5 }, to: { seg: 0, u: 0.5 } }, { via: [] },
    { via: [{ x: NaN, z: 150 }] }, { via: [{ x: 1e100, z: 150 }] }, { halfWidth: 0.2 },
    { via: [{ x: 0, z: 115 }, { x: 0, z: 160 }] },
    { via: [{ x: -100, z: 115 }, { x: -50, z: 200 }, { x: -100, z: 200 }, { x: -50, z: 115 }] }
  ]) assert.deepStrictEqual(buildInvalid([{ ...multi.branches[0], ...broken }]), [], 'invalid, overlapping-main or self-crossing authored branch is rejected');
  const intersecting = TB.buildTrack(multi);
  intersecting.samples[700].p = { ...SC.frameAt(multiRoutes[0], multiRoutes[0].length / 2).p };
  assert(!SC.buildRoutes(intersecting).some((r) => r.id === multiRoutes[0].id), 'authored route cannot cross an unrelated main-road section');
  for (const kind of ['bridge', 'tunnel']) {
    const enclosed = TB.buildTrack({ ...multi, segments: multi.segments.map((s, i) => i === 0 ? { ...s, t: kind } : s) });
    assert.deepStrictEqual(SC.buildRoutes(enclosed), [], 'fork mouths cannot intersect ' + kind + ' walls or railings');
  }
  const floating = TB.buildTrack(multi);
  for (const q of floating.samples) q.p.y += 5;
  assert.deepStrictEqual(SC.buildRoutes(floating), [], 'authored streets must meet the ground, not float between elevated endpoints');
  for (const distance of [3, 35, 45]) {
    const landing = TB.buildTrack(multi), gate = multiRoutes[0].startS;
    landing.samples[gate - distance].kind = 'gap';
    landing.samples[gate - distance - 1].kind = 'ramp';
    assert.deepStrictEqual(SC.buildRoutes(landing), [], 'a fork only ' + distance + ' m after a jump must not admit an airborne approach');
  }
  const recoveredLanding = TB.buildTrack(multi);
  recoveredLanding.samples[multiRoutes[0].startS - 48].kind = 'gap';
  recoveredLanding.samples[multiRoutes[0].startS - 49].kind = 'ramp';
  assert.strictEqual(SC.buildRoutes(recoveredLanding).length, 2, 'a sufficient grounded landing run keeps both choices accessible');
  const recoveredLoop = TB.buildTrack(multi);
  recoveredLoop.samples[multiRoutes[0].startS - 22].kind = 'loop';
  assert.strictEqual(SC.buildRoutes(recoveredLoop).length, 2, 'a grounded loop exit may precede the 20 m clear steering approach');
  recoveredLoop.samples[multiRoutes[0].startS - 12].kind = 'loop';
  assert.deepStrictEqual(SC.buildRoutes(recoveredLoop), [], 'fork steering cannot begin while still inside a loop');

  // Recording files refer to numeric route indices, so the original route
  // catalogue must keep its exact path geometry and order when forks grow.
  const crypto = require('crypto');
  const legacy = D.TRACKS.map((def) => SC.buildRoutes(TB.buildTrack(def)).slice(0, (def.shortcuts || []).length).map((r) => ({ id: r.id, startS: r.startS, endS: r.endS, resetS: r.resetS, samples: r.samples })));
  // Round only sub-micrometre noise so CI's Node/CPU math implementation
  // does not turn an unchanged street into a floating-point snapshot diff.
  const legacySnapshot = JSON.stringify(legacy, (_key, value) => typeof value === 'number' ? Math.round(value * 1e7) / 1e7 : value);
  assert.strictEqual(crypto.createHash('sha256').update(legacySnapshot).digest('hex'), 'e922326dde4af05228b066135c5b56df4414a5a0541370f0b73f3625c7fbf7ea', 'old ghost route indices and paths must remain stable');
  lines.push(count + ' route geometries checked; multi-way, legacy replay stability, invalid, overlap, stunt, and crossing guards passed');
  return { name: 'shortcuts', ok: true, lines };
};
