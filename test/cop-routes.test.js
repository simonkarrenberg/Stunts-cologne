// Cop collision distances and mission repositioning must use the same branch
// geometry/state rules as the racers. Instrument the served copy only: no test
// mutation hooks or private cop state are exposed by the production game.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

const hook = `
  window.STUNTS_COP_ROUTE_TEST = (scenario, gap) => {
    const q = track.shortcuts.find((route) => route.kind === 'alternate');
    if (!q) throw new Error('test track needs a longer authored branch');
    mission = null;
    if (kripo) { scene.remove(kripo.mesh); kripo = null; }
    const middle = (q.startS + q.endS) / 2;
    window.STUNTS_TELEPORT(middle, 0, 0);
    player.shortcut = q.index; player.damage = 0;
    startKripo();
    Object.assign(kripo, { s: middle - gap, shortcut: q.index, lat: 0, v: 0,
      air: false, vy: 0, prevRoadVy: 0, crashed: 0, routePlan: q.index });
    kripoHitCool = 0;
    placeRacer(player, 0); placeRacer(kripo, 0);
    if (scenario === 'collision') {
      const separation = player.mesh.position.distanceTo(kripo.mesh.position);
      updateKripo(0);
      return { route: q.id, separation, damage: player.damage };
    }
    mission = {};
    kripoHitCool = 10;
    if (scenario === 'rubber-band') {
      player.shortcut = -1; player.s = q.endS + 300;
      updateKripo(0);
    } else if (scenario === 'lost') {
      player.s = q.startS;
      kripo.prevRoadVy = 7;
      enterRoute(q);
    } else throw new Error('unknown cop test scenario');
    const result = { shortcut: kripo.shortcut, routePlan: kripo.routePlan,
      prevRoadVy: kripo.prevRoadVy, s: kripo.s, endS: q.endS };
    // The next fixed step must advance on the main road, not remap a stale
    // branch coordinate and jump backwards after the mission teleport.
    const before = kripo.s;
    updateRacer(kripo, 1 / 60, { gas: 0, brake: 0, steer: 0, turbo: 0 });
    result.nextStepDistance = Math.abs(kripo.s - before);
    mission = null;
    return result;
  };
`;

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const context = await browser.newContext({ viewport: { width: 844, height: 500 }, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.STUNTS_IDLE = 99999; window.STUNTS_SIMSTEPS = 8;
      localStorage.setItem('stuntskoelle.pixel', '3');
      localStorage.setItem('stuntskoelle.voice', 'off');
      localStorage.setItem('stuntskoelle.jukebox', 'off');
    });
    const source = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');
    const marker = 'window.STUNTS_FIELD =';
    assert.strictEqual(source.split(marker).length, 2, 'private test hook must have exactly one insertion point');
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/js/game.js', (route) => route.fulfill({ contentType: 'text/javascript', body: source.replace(marker, hook + marker) }));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_COP_ROUTE_TEST === 'function');
    await page.locator('.trackRow').nth(1).click(); // Domblitz: Trankgasse is longer than the main road.
    await page.locator('#quickStartBtn').click();
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000), 'test race must start');
    await page.evaluate(() => { window.STUNTS_MANUAL_STEP = true; });

    const far = await page.evaluate(() => STUNTS_COP_ROUTE_TEST('collision', 4.7));
    assert(far.separation > 6.5, 'fixture must separate cars by real branch metres, not just canonical progress');
    assert.strictEqual(far.damage, 0, 'cop must not hit a player nearly seven physical metres away on a long branch');
    const close = await page.evaluate(() => STUNTS_COP_ROUTE_TEST('collision', 2));
    assert(close.separation < 4.8 && close.damage > 0, 'real close contact on the same branch must still cause a cop hit');
    lines.push(`${far.route}: no ghost hit at ${far.separation.toFixed(2)} m; actual close contact still registers`);

    for (const scenario of ['rubber-band', 'lost']) {
      const state = await page.evaluate((s) => STUNTS_COP_ROUTE_TEST(s, 0), scenario);
      assert.strictEqual(state.shortcut, -1, `${scenario} must clear the active branch`);
      assert.strictEqual(state.routePlan, null, `${scenario} must clear the pending cop branch`);
      assert.strictEqual(state.prevRoadVy, 0, `${scenario} must clear stale road vertical velocity`);
      assert(state.nextStepDistance < 1, `${scenario} must not remap a stale branch position on the following frame`);
      if (scenario === 'rubber-band') assert(state.s > state.endS, 'rubber-band fixture must reposition outside the old branch interval');
    }
    lines.push('Mission rubber-band and lost-in-the-Veedel teleports clear branch plans; next step has no route-position jump');
    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'cop-routes', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
