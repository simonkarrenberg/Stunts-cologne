// Every playable branch gets an honest signed wayfinder, and shared gates get
// a three-way warning without sacrificing the street's textured sidewalks.
const assert = require('assert');
const { serve, launch } = require('./helpers');

module.exports = async function () {
  const server = serve(9400 + Math.floor(Math.random() * 90));
  let browser;
  try {
    browser = await launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => { window.STUNTS_IDLE = 999999; });
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => window.World && World.buildShortcutRoads && window.GameData);
    const result = await page.evaluate(() => {
      const audits = [];
      window.STUNTS_AUDIT_STREETS = (group, track) => {
        audits.push({ id: track.def.id,
          routes: track.shortcuts.map(({ id, kind, saved, side, street, fork }) => ({ id, kind, saved, side, street, fork })),
          signs: group.children.filter((c) => c.userData.kind === 'routeWayfinder').map((c) => c.userData),
          forks: group.children.filter((c) => c.userData.kind === 'forkWayfinder').map((c) => c.userData),
          keepouts: track.wayfinderKeepouts.map(({ routeId, fork, bounds }) =>
            ({ id: routeId || fork, min: bounds.min.toArray(), max: bounds.max.toArray() })),
          surfaces: group.children.filter((c) => c.userData.kind === 'streetSurface')
            .map((c) => ({ type: c.userData.surface, quads: c.geometry.attributes.position.count / 4 })) });
      };
      for (const def of GameData.TRACKS) {
        const track = TrackBuilder.buildTrack(def); track.shortcuts = Shortcuts.buildRoutes(track);
        World.buildShortcutRoads(track, def.theme);
      }
      const track = TrackBuilder.buildTrack(GameData.TRACKS.find((d) => d.id === 'dom'));
      track.shortcuts = Shortcuts.buildRoutes(track);
      World.buildShortcutRoads(track, track.def.theme);
      track.shortcuts[0].surface = 'cobble';
      World.buildShortcutRoads(track, track.def.theme);
      return { audits: audits.slice(0, -2), before: audits.at(-2), mixed: audits.at(-1) };
    });
    let routeSigns = 0, forkSigns = 0;
    for (const audit of result.audits) {
      assert.deepStrictEqual(audit.signs.map((s) => s.routeId).sort(), audit.routes.map((r) => r.id).sort(), audit.id + ': every route needs exactly one wayfinder');
      for (const route of audit.routes) {
        const sign = audit.signs.find((s) => s.routeId === route.id);
        const delta = `${route.saved >= 0 ? '−' : '+'}${Math.round(Math.abs(route.saved))} M`;
        assert(sign.signText.includes(delta), route.id + ': distance saving or detour must have the correct sign');
        assert(sign.signText.includes(route.street), route.id + ': the real street name must appear');
        assert(sign.signText.startsWith(route.side < 0 ? '←' : '→'), route.id + ': arrow must match the steering choice');
        assert(sign.beforeFork > 0 && sign.beforeFork <= 78, route.id + ': sign must precede its junction');
        assert.strictEqual(sign.routeKind, route.kind, route.id + ': green/blue classification must match gameplay');
      }
      const forks = [...new Set(audit.routes.map((r) => r.fork).filter(Boolean))].sort();
      assert.deepStrictEqual(audit.forks.map((f) => f.fork).sort(), forks, audit.id + ': every shared gate needs a warning');
      assert.deepStrictEqual(audit.keepouts.map((k) => k.id).sort(), audit.routes.map((r) => r.id).concat(forks).sort(),
        audit.id + ': every sign must reserve a scenery-free sightline');
      for (const keepout of audit.keepouts) {
        assert(keepout.min.concat(keepout.max).every(Number.isFinite), keepout.id + ': sightline bounds are finite');
        assert(keepout.max.every((v, axis) => v > keepout.min[axis]), keepout.id + ': sightline has positive extent');
      }
      for (const fork of audit.forks) {
        assert(fork.signText.includes('3 WEGE') && fork.signText.includes('↑ HAUPTSTRECKE'), fork.fork + ': main lane remains an explicit third choice');
        assert.deepStrictEqual(fork.routeIds.slice().sort(), audit.routes.filter((r) => r.fork === fork.fork).map((r) => r.id).sort());
        assert(fork.beforeFork > 0, fork.fork + ': warning precedes the steering gate');
      }
      routeSigns += audit.signs.length; forkSigns += audit.forks.length;
    }
    assert.strictEqual(routeSigns, 29, 'all 29 playable routes are signed');
    assert.strictEqual(forkSigns, 6, 'all six three-way junctions are signed');
    assert.deepStrictEqual(result.mixed.surfaces.map((s) => s.type).sort(), ['asphalt', 'cobble']);
    assert.deepStrictEqual(result.mixed.keepouts, result.before.keepouts, 'rebuilding the same track resets sign reservations');
    const quads = (a) => a.surfaces.reduce((n, s) => n + s.quads, 0);
    assert.strictEqual(quads(result.mixed), quads(result.before), 'mixing surface textures must retain all sidewalk and roadbed quads');
    assert.deepStrictEqual(errors, [], 'street rendering must not throw browser errors');
    return { name: 'streets', ok: true, lines: [`${routeSigns} correctly signed route wayfinders; ${forkSigns} three-way warnings; mixed-surface sidewalks retained`] };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
