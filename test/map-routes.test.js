// Drive every signed road through normal controls. Teleport only positions
// the car on the main road before a gate; route selection is never injected.
const assert = require('assert');
const { serve, launch, waitFor } = require('./helpers');

module.exports = async function () {
  const port = 8900 + Math.floor(Math.random() * 90), server = serve(port);
  let browser;
  const errors = [], lines = [], landmarks = new Set();
  let landmarkPlacements = 0, clearanceTotal = 0, mainRoadClearanceTotal = 0, supportClearanceTotal = 0;
  try {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('stuntskoelle.pixel', '3');
      localStorage.setItem('stuntskoelle.voice', '0');
      localStorage.setItem('stuntskoelle.music', '0');
      window.STUNTS_IDLE = 99999;
      window.STUNTS_SIMSTEPS = 8;
      window.__mapAudit = {};
      window.__roadDetailAudit = {};
      const auditGroup = (group, track) => {
        // Inspect the visible scene before batching, independently of the
        // world's placement flags and clearance routines. A retained model
        // must have its own footprint and an alley must be physically clear.
        group.updateMatrixWorld(true);
        const ids = [], footprints = [], overlaps = [], obstructions = [], mainRoadObstructions = [];
        const authoredCounts = {}, retainedCounts = {};
        for (const prop of track.def.props || []) if (World.landmarkCatalog[prop.type]) {
          authoredCounts[prop.type] = (authoredCounts[prop.type] || 0) + 1;
        }
        const point = new THREE.Vector3(), corner = new THREE.Vector3();
        group.traverse((obj) => {
          if (!obj.userData.landmarkId) return;
          ids.push(obj.userData.landmarkId);
          retainedCounts[obj.userData.landmarkId] = (retainedCounts[obj.userData.landmarkId] || 0) + 1;
          const inverse = new THREE.Matrix4().copy(obj.matrixWorld).invert();
          const bounds = new THREE.Box3();
          obj.traverse((mesh) => {
            if (!mesh.isMesh || !mesh.geometry) return;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const b = mesh.geometry.boundingBox;
            for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
              corner.set(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
              bounds.expandByPoint(corner);
            }
          });
          if (bounds.isEmpty()) return;
          const corners = [[bounds.min.x, bounds.min.z], [bounds.max.x, bounds.min.z], [bounds.max.x, bounds.max.z], [bounds.min.x, bounds.max.z]]
            .map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(obj.matrixWorld));
          footprints.push({ id: obj.userData.landmarkId, corners });
        });
        // Separating-axis test on each rotated rectangle, rather than their
        // oversized world-axis boxes (which overlap at many harmless turns).
        const intersects = (a, b) => {
          for (const shape of [a, b]) for (let i = 0; i < 2; i++) {
            const p = shape[i], q = shape[i + 1], dx = q.x - p.x, dz = q.z - p.z;
            const length = Math.hypot(dx, dz), axis = { x: -dz / length, z: dx / length };
            const ap = a.map((v) => v.x * axis.x + v.z * axis.z), bp = b.map((v) => v.x * axis.x + v.z * axis.z);
            if (Math.min(Math.max(...ap), Math.max(...bp)) - Math.max(Math.min(...ap), Math.min(...bp)) <= 0.01) return false;
          }
          return true;
        };
        for (let i = 0; i < footprints.length; i++) for (let j = i + 1; j < footprints.length; j++) {
          if (intersects(footprints[i].corners, footprints[j].corners)) overlaps.push(footprints[i].id + ' / ' + footprints[j].id);
        }

        const routes = track.shortcuts || [], grid = new Map(), cell = 12;
        const routeHeights = routes.flatMap((r) => r.samples.map((s) => s.p.y));
        const minY = Math.min(...routeHeights) + 0.45, maxY = Math.max(...routeHeights) + 1.15;
        for (const child of group.children) {
          child.traverse((mesh) => {
            if (!mesh.isMesh || !mesh.geometry || !mesh.visible) return;
            // Crossing pedestrians are intentional moving gameplay scenery;
            // static furniture, buses, walls and support posts are not.
            for (let p = mesh; p && p !== group; p = p.parent) {
              const u = p.userData;
              if (u.sky || u.water || u.walker || u.human || u.crowd || u.wave || !p.visible) return;
            }
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const local = mesh.geometry.boundingBox;
            const world = local.clone().applyMatrix4(mesh.matrixWorld);
            const landmark = child.userData.landmarkId;
            // Keep upper landmark geometry too: the main track also contains
            // raised roads, not just the ground-level shortcut corridors.
            if (!landmark && (world.max.y < minY || world.min.y > maxY)) return;
            const entry = { local, world, inverse: new THREE.Matrix4().copy(mesh.matrixWorld).invert(),
              label: child.userData.landmarkId || child.userData.kind || child.userData.type || mesh.geometry.type,
              owner: child.uuid, landmark };
            for (let x = Math.floor(world.min.x / cell); x <= Math.floor(world.max.x / cell); x++) {
              for (let z = Math.floor(world.min.z / cell); z <= Math.floor(world.max.z / cell); z++) {
                const key = x + ',' + z;
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key).push(entry);
              }
            }
          });
        }
        const seen = new Set();
        let clearanceProbes = 0;
        for (const route of routes) for (const sample of route.samples)
          for (const lat of [...new Set([-(route.halfWidth - 1), -2, 0, 2, route.halfWidth - 1])]) for (const height of [0.45, 1.15]) {
          point.set(sample.p.x + sample.B.x * lat, sample.p.y + height, sample.p.z + sample.B.z * lat);
          clearanceProbes++;
          const nearby = grid.get(Math.floor(point.x / cell) + ',' + Math.floor(point.z / cell)) || [];
          for (const entry of nearby) {
            if (!entry.world.containsPoint(point)) continue;
            corner.copy(point).applyMatrix4(entry.inverse);
            if (!entry.local.containsPoint(corner)) continue;
            const key = route.id + ':' + entry.owner;
            if (seen.has(key)) continue;
            seen.add(key);
            obstructions.push({ route: route.id, object: entry.label, metre: Math.round(sample.s), lat, height });
          }
        }
        const mainSeen = new Set();
        let mainRoadClearanceProbes = 0;
        for (let i = 0; i < track.samples.length; i += 2) {
          const sample = track.samples[i];
          for (const lat of [-4, 0, 4]) for (const height of [0.45, 1.15]) {
            point.set(sample.p.x + sample.B.x * lat + sample.N.x * height,
              sample.p.y + sample.B.y * lat + sample.N.y * height,
              sample.p.z + sample.B.z * lat + sample.N.z * height);
            mainRoadClearanceProbes++;
            const nearby = grid.get(Math.floor(point.x / cell) + ',' + Math.floor(point.z / cell)) || [];
            for (const entry of nearby) {
              if (!entry.landmark || !entry.world.containsPoint(point)) continue;
              corner.copy(point).applyMatrix4(entry.inverse);
              if (!entry.local.containsPoint(corner) || mainSeen.has(entry.owner)) continue;
              mainSeen.add(entry.owner);
              mainRoadObstructions.push({ object: entry.landmark, metre: Math.round(sample.s), lat, height });
            }
          }
        }
        return { ids: [...new Set(ids)], authoredCounts, retainedCounts,
          placements: ids.length, overlaps, obstructions, clearanceProbes, mainRoadObstructions, mainRoadClearanceProbes };
      };
      window.STUNTS_AUDIT = (group, track) => { window.__mapAudit[track.def.id] = auditGroup(group, track); };
      // Structural columns and tunnel/bridge details belong to the road
      // group, not the scenery. Probe them before batching as well, so a
      // clear building footprint cannot hide a support through an alley.
      window.STUNTS_AUDIT_DETAILS = (group, track) => { window.__roadDetailAudit[track.def.id] = auditGroup(group, track); };
    });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_ROUTES === 'function' && typeof window.STUNTS_DRIVE_STEPS === 'function', undefined, { timeout: 60000 });
    const tracks = await page.evaluate(() => window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((d) => ({
      id: d.id, name: d.name, routes: (d.shortcuts || []).length + (d.branches || []).length,
      authoredRoutes: [...(d.shortcuts || []), ...(d.branches || [])].map((r) => r.id)
    })));
    const authoredIds = await page.evaluate(() => [...new Set(GameData.TRACKS.flatMap((d) => d.props || [])
      .filter((p) => World.landmarkCatalog[p.type]).map((p) => p.type))].sort());
    const which = process.env.TRACKS ? process.env.TRACKS.split(',').map(Number) : tracks.map((_, i) => i);
    let resetChecks = 0, replayChecks = 0, forkChecks = 0, shortcutChecks = 0, alternateChecks = 0, aiForkChecks = 0;

    async function enter(route) {
      await page.evaluate(() => { window.STUNTS_AUTOPILOT = false; });
      const key = route.side < 0 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down('ArrowUp');
      await page.keyboard.down(key);
      const state = await page.evaluate((r) => {
        window.STUNTS_TELEPORT(r.startS - 6, 15, 0);
        return window.STUNTS_DRIVE_STEPS(24);
      }, route);
      await page.keyboard.up(key);
      await page.keyboard.up('ArrowUp');
      assert.strictEqual(state.player.shortcut, route.index, route.name + ': keyboard steering must enter the signed branch');
      assert.strictEqual(state.player.crashed > 0, false, route.name + ': entry must not crash');
      return state;
    }

    for (const index of which) {
      const track = tracks[index];
      assert(track, 'valid built-in track index');
      await page.evaluate((i) => {
        window.STUNTS_MANUAL_STEP = false;
        document.querySelectorAll('.trackRow')[i].click();
        window.STUNTS_AUTOPILOT = false;
        document.getElementById('startBtn').click();
      }, index);
      assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000), track.name + ': scene and countdown must finish');
      await page.evaluate(() => { window.STUNTS_MANUAL_STEP = true; });
      const routes = await page.evaluate(() => window.STUNTS_ROUTES());
      assert.strictEqual(routes.length, track.routes, track.name + ': all advertised roads must be available in the race');
      assert.deepStrictEqual(routes.map((r) => r.id), track.authoredRoutes, track.name + ': route identities and existing replay indices must remain stable');
      const audit = await page.evaluate((id) => window.__mapAudit[id], track.id);
      const ids = audit && audit.ids;
      assert(ids && ids.length, track.name + ': a new real Cologne landmark must survive scenery placement');
      assert.deepStrictEqual(audit.retainedCounts, audit.authoredCounts, track.name + ': every authored landmark placement must survive, including repeated models');
      assert.deepStrictEqual(audit.overlaps, [], track.name + ': real landmark footprints must not overlap');
      assert.deepStrictEqual(audit.obstructions, [], track.name + ': route centers, narrow lanes and wide-road shoulders must clear static scenery at car height');
      assert.deepStrictEqual(audit.mainRoadObstructions, [], track.name + ': real landmarks must not obstruct the main road at car height');
      const structural = await page.evaluate((id) => window.__roadDetailAudit[id], track.id);
      assert(structural && structural.clearanceProbes >= 100, track.name + ': each branch must also be checked against road structures');
      assert.deepStrictEqual(structural.obstructions, [], track.name + ': branch lanes must clear stunt supports, bridge rails and tunnel walls');
      assert(audit.clearanceProbes >= 100, track.name + ': clearance must be inspected throughout every alley');
      assert(audit.mainRoadClearanceProbes >= 1000, track.name + ': landmark clearance must be inspected throughout the main road');
      ids.forEach((id) => landmarks.add(id));
      landmarkPlacements += audit.placements; clearanceTotal += audit.clearanceProbes;
      mainRoadClearanceTotal += audit.mainRoadClearanceProbes;
      supportClearanceTotal += structural.clearanceProbes;
      // At a real fork both sides must work, but staying centered must keep
      // the main course. Opposing routes intentionally share race progress.
      const forks = new Map();
      for (const route of routes) if (route.fork) {
        if (!forks.has(route.fork)) forks.set(route.fork, []);
        forks.get(route.fork).push(route);
      }
      for (const [name, branches] of forks) {
        if (branches.length < 2) continue;
        assert.deepStrictEqual(branches.map((r) => r.side).sort(), [-1, 1], name + ': the shared fork must offer an unambiguous left and right choice');
        const route = branches[0];
        assert(branches.every((r) => Math.abs(r.startS - route.startS) < 0.001 && Math.abs(r.endS - route.endS) < 0.001), name + ': alternatives must share an entrance and rejoin');
        const center = await page.evaluate((r) => {
          window.STUNTS_AUTOPILOT = false;
          window.STUNTS_TELEPORT(r.startS - 6, 15, 0);
          return window.STUNTS_DRIVE_STEPS(24, { gas: 1, brake: 0, steer: 0, turbo: 0 });
        }, route);
        assert.strictEqual(center.player.shortcut, -1, name + ': centered driving must stay on the main course');
        assert(center.player.s > route.startS && !center.player.crashed, name + ': the main route must cross the fork normally: ' + JSON.stringify(center.player));
        forkChecks++;
      }
      for (const branches of forks.values()) {
        if (branches.length === 2) {
          const route = branches[0];
          const ai = await page.evaluate((r) => {
            // Begin on the normal starting straight: some forks follow a
            // stunt, so spawning a whole staggered grid just before the gate
            // would put the rear cars inside a jump gap instead of on road.
            window.STUNTS_FIELD_SETUP(70, 15);
            const initial = window.STUNTS_FIELD().filter((c) => c.ai);
            const laps = new Map(initial.map((car) => [car.name, car.lap]));
            const paths = new Set(), seen = new Set(), crashes = new Set(), exited = new Set();
            const choices = [], mismatches = [];
            let steps = 0;
            for (; steps < 6000; steps += 6) {
              window.STUNTS_FIELD_STEPS(6);
              for (const car of window.STUNTS_FIELD().filter((c) => c.ai)) {
                // A fast rival can pass the finish before a slower car
                // rejoins. Remember individual exits, and never count a
                // different choice on a later lap as first-lap coverage.
                if (car.lap > laps.get(car.name) || car.s > r.endS + 8) exited.add(car.name);
                if (car.lap !== laps.get(car.name)) continue;
                if (car.s < r.startS || car.s > r.endS) continue;
                if (car.crashed) crashes.add(car.name);
                if (car.s <= r.startS + 8 || car.s >= r.endS - 8) continue;
                const path = car.routeId || 'main';
                if (car.shortcut < 0 && path !== 'main' || car.shortcut >= 0 && path === 'main') mismatches.push(car.name);
                paths.add(path);
                if (!seen.has(car.name)) { choices.push(car.name + ': ' + path); seen.add(car.name); }
              }
              if (initial.length && exited.size === initial.length) break;
            }
            return { paths: [...paths], choices, crashes: [...crashes], mismatches, steps,
              missing: initial.filter((car) => !exited.has(car.name)).map((car) => car.name) };
          }, route);
          assert.deepStrictEqual(ai.missing, [], 'every rival must finish its first traversal of the fork');
          assert.deepStrictEqual(ai.mismatches, [], 'AI route identity must agree with its physical road');
          assert.deepStrictEqual(ai.crashes, [], 'AI must negotiate the shared fork without crashing');
          assert.deepStrictEqual(ai.paths.sort(), ['main', ...branches.map((r) => r.id)].sort(), 'rivals must naturally choose the main course and both side roads: ' + ai.choices.join(', '));
          lines.push('AI fork choices: ' + ai.choices.join('; '));
          aiForkChecks++;
        }
      }
      const replaySamples = [];
      for (const route of routes) {
        const entry = await enter(route);
        const result = await page.evaluate((r) => {
          window.STUNTS_AUTOPILOT = true;
          const start = window.STUNTS_DEBUG();
          let prev = start, steps = 0, distance = 0, maxJump = 0, sample = null, state = start;
          while (state.player.shortcut === r.index && state.player.crashed <= 0 && steps < 1800) {
            state = window.STUNTS_DRIVE_STEPS(1);
            const a = prev.player.pos, b = state.player.pos;
            const moved = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
            distance += moved; maxJump = Math.max(maxJump, moved);
            if (!sample && state.player.s >= (r.startS + r.endS) / 2 && state.player.shortcut === r.index) sample = { time: state.raceTime, pos: b, shortcut: state.player.shortcut };
            prev = state; steps++;
          }
          window.STUNTS_AUTOPILOT = false;
          return { state, steps, distance, maxJump, sample };
        }, route);
        assert.strictEqual(result.state.player.crashed > 0, false, route.name + ': the entire selected route must be drivable');
        assert.strictEqual(result.state.player.shortcut, -1, route.name + ': must rejoin the main road');
        assert(result.state.player.s >= route.endS && result.state.player.s < route.endS + 3, route.name + ': rejoins at the correct distance');
        assert.strictEqual(result.state.player.lap, entry.player.lap, route.name + ': a shortcut must not award an extra lap');
        assert(result.maxJump < 2, route.name + ': movement must remain continuous, without teleporting to the exit');
        assert(Math.abs(route.saved - (route.endS - route.startS - route.length)) < 0.01, route.name + ': signed distance saving must match the physical road');
        assert(['shortcut', 'alternate'].includes(route.kind), route.name + ': roads must declare their advertised type');
        assert.strictEqual(route.type, route.kind, route.name + ': public route type aliases must agree');
        if (route.kind === 'shortcut') assert(route.saved >= 3, route.name + ': advertised shortcuts must genuinely save distance');
        if (route.saved > 0) {
          assert(result.distance < route.endS - entry.player.s, route.name + ': a shortcut must actually drive fewer metres');
          shortcutChecks++;
        } else {
          assert.strictEqual(route.kind, 'alternate', route.name + ': a longer road must be labeled an alternative, never a shortcut');
          assert(result.distance > route.endS - entry.player.s, route.name + ': a longer alternative must actually drive the extra distance');
          alternateChecks++;
        }
        assert(result.sample, route.name + ': route must contain actual intermediate driving frames');
        replaySamples.push({ ...result.sample, name: route.name });

        // Every gate needs its own recovery check: some begin shortly after
        // a jump, where a fixed backwards offset can respawn into the gap.
        const resetEntry = await enter(route);
        await page.keyboard.press('KeyR');
        const recovery = await page.evaluate(() => {
          const ctl = { gas: 0, brake: 0, steer: 0, turbo: 0 };
          const reset = window.STUNTS_DRIVE_STEPS(70, ctl);
          let state = reset, unstable = state.player.air || state.player.crashed > 0;
          for (let i = 0; i < 60; i++) {
            state = window.STUNTS_DRIVE_STEPS(1, ctl);
            unstable = unstable || state.player.air || state.player.crashed > 0;
          }
          return { reset, state, unstable };
        });
        assert.strictEqual(recovery.reset.player.shortcut, -1, route.name + ': reset must leave the branch');
        assert(recovery.reset.player.s < route.startS, route.name + ': reset must return to the main road before the entry');
        assert.strictEqual(recovery.reset.player.lap, resetEntry.player.lap, route.name + ': reset must preserve lap number');
        assert.strictEqual(recovery.unstable, false, route.name + ': respawn must remain grounded and crash-free for a full stationary second');
        assert(Math.abs(recovery.state.player.v) < 0.1, route.name + ': respawn must be on a stable road surface');
        resetChecks++;
      }
      if (replaySamples.length) {
        const canSeek = await page.evaluate(() => typeof window.STUNTS_REPLAY_AT === 'function');
        if (canSeek) {
          await page.evaluate(() => { window.STUNTS_MANUAL_STEP = false; window.STUNTS_FINISH(); });
          assert(await waitFor(page, () => !document.getElementById('results').hidden, 15000), 'race must reach results');
          const ghost = await page.evaluate((id) => JSON.parse(localStorage.getItem('stuntskoelle.ghost.' + id) || 'null'), track.id);
          assert(ghost && ghost.routes && ghost.routes.length === ghost.t.length, 'saved lap ghost must preserve a branch value for each frame');
          for (const sample of replaySamples) assert(ghost.routes.includes(sample.shortcut), sample.name + ': saved lap ghost must remember every selected route');
          await page.evaluate(() => { window.STUNTS_MANUAL_STEP = true; document.getElementById('replayBtn').click(); });
          for (const sample of replaySamples) {
            const replay = await page.evaluate((time) => window.STUNTS_REPLAY_AT(time), sample.time);
            assert.strictEqual(replay.player.shortcut, sample.shortcut, sample.name + ': replay must preserve the selected branch');
            assert(Math.hypot(...replay.player.pos.map((n, i) => n - sample.pos[i])) < 2, sample.name + ': replay must place the car on the same road');
            replayChecks++;
          }
          await page.keyboard.press('Escape');
        }
      }
      lines.push(track.name + ': ' + routes.length + ' keyboard entries, complete traversals, rejoins and replays; ' + audit.placements + ' retained landmark placements; ' + audit.clearanceProbes + ' branch, ' + structural.clearanceProbes + ' support and ' + audit.mainRoadClearanceProbes + ' main-road clear car-height probes');
      console.log('   ' + lines[lines.length - 1]);
      await page.keyboard.press('Escape');
      assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'menu', 10000), 'return to menu');
    }
    if (!process.env.TRACKS) assert.deepStrictEqual([...landmarks].sort(), authoredIds, 'every authored landmark model must remain present across the maps');
    if (!process.env.TRACKS) {
      assert(forkChecks >= 6, 'the maps must include at least six shared left/main/right junctions');
      assert(alternateChecks >= 6, 'each new fork must include a genuinely longer alternative road');
      assert(resetChecks >= 29, 'all original shortcuts and twelve new branching streets must remain drivable');
      assert.strictEqual(aiForkChecks, forkChecks, 'rival route choices must be tested at every shared fork');
    }
    assert.strictEqual(replayChecks, resetChecks, 'every driven route must preserve ghost and replay positions');
    lines.push(landmarks.size + ' distinct Cologne landmarks in ' + landmarkPlacements + ' separate placements; ' + clearanceTotal + ' branch, ' + supportClearanceTotal + ' support and ' + mainRoadClearanceTotal + ' main-road clear car-height probes; ' + resetChecks + ' stable branch resets; ' + replayChecks + ' saved ghost routes and recorded replays; ' + forkChecks + ' left/main/right forks; ' + shortcutChecks + ' shortcuts and ' + alternateChecks + ' longer alternatives');
    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'map-routes', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
