// Route discoveries are awarded only after a real traversal, persist across
// sessions, and use the existing records/save-code buttons (no new controls).
const assert = require('assert');
const { serve, launch, waitFor } = require('./helpers');

module.exports = async function () {
  const server = serve(0), browser = await launch(), errors = [], lines = [];
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 500 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.STUNTS_IDLE = 99999; window.STUNTS_SIMSTEPS = 8;
      localStorage.setItem('stuntskoelle.pixel', '3');
      localStorage.setItem('stuntskoelle.voice', 'off');
    });
    await page.goto('http://localhost:' + server.address().port);
    await page.waitForFunction(() => window.STUNTS_ROUTES);
    await page.evaluate(() => {
      localStorage.setItem('stuntskoelle.routes.dom', '{"not":"an array"}');
      document.querySelectorAll('.trackRow')[1].click();
    });
    assert((await page.locator('#trackRoutes').textContent()).includes('VEEDELS-PASS 0/4'), 'malformed saved passport must not break menu');
    await page.locator('#startBtn').click();
    assert(await waitFor(page, () => STUNTS_DEBUG().phase === 'race', 120000), 'race must start');
    await page.evaluate(() => { STUNTS_MANUAL_STEP = true; });
    const routes = await page.evaluate(() => STUNTS_ROUTES());
    const [cut, scenic] = routes.filter((r) => r.fork);
    async function enter(r) {
      const state = await page.evaluate((route) => {
        STUNTS_TELEPORT(route.startS - 6, 15, 0);
        return STUNTS_DRIVE_STEPS(24, { gas: 1, brake: 0, steer: route.side, turbo: 0 });
      }, r);
      assert.strictEqual(state.player.shortcut, r.index, 'steering must enter selected road');
    }
    async function complete(r) {
      await enter(r);
      const result = await page.evaluate((route) => {
        STUNTS_AUTOPILOT = true;
        let state = STUNTS_DEBUG(), n = 0;
        while (state.player.shortcut === route.index && !state.player.crashed && n++ < 2400) state = STUNTS_DRIVE_STEPS(1);
        STUNTS_AUTOPILOT = false;
        return state;
      }, r);
      assert(!result.player.crashed && result.player.shortcut === -1 && result.player.s >= r.endS, 'stamp requires successful rejoin');
      return result.deckel;
    }
    await enter(cut);
    assert(!await page.evaluate(() => Array.isArray(JSON.parse(localStorage.getItem('stuntskoelle.routes.dom')))), 'entering without finishing must not stamp a route');
    await page.keyboard.press('KeyR');
    await page.evaluate(() => STUNTS_DRIVE_STEPS(80, { gas: 0, brake: 0, steer: 0, turbo: 0 }));
    const firstDeckel = await complete(cut);
    const secondDeckel = await complete(scenic);
    assert.strictEqual(secondDeckel, firstDeckel, 'two arms of one fork must not farm extra lap rewards');
    await complete(cut);
    const saved = await page.evaluate(() => ({ ids: JSON.parse(localStorage.getItem('stuntskoelle.routes.dom')), stats: STUNTS_ORDEN().stats }));
    assert.deepStrictEqual(saved.ids.slice().sort(), [cut.id, scenic.id].sort(), 'passport must store unique completed routes including scenic alternatives');
    assert.strictEqual(saved.stats.streetsFound, 2, 'repeat traversal must not increase discovery count');
    lines.push('Actual cut/scenic traversals: two unique stamps; no entry/reset stamp or repeat/fork reward farming');

    await page.keyboard.press('Escape');
    await page.locator('#recordsBtn').click();
    await page.locator('#saveExport').click();
    const code = await page.locator('#saveCode').inputValue();
    const exported = JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8'));
    assert.strictEqual(exported['stuntskoelle.routes.dom'], JSON.stringify(saved.ids), 'existing save code must carry route passport');
    await page.evaluate(() => { localStorage.removeItem('stuntskoelle.routes.dom'); localStorage.removeItem('stuntskoelle.stats'); });
    await page.locator('#saveCode').fill(code);
    await page.locator('#saveImport').click();
    await page.reload();
    await page.waitForFunction(() => window.STUNTS_ROUTES);
    assert((await page.locator('#trackRoutes').textContent()).includes('VEEDELS-PASS 2/4'), 'passport must survive export/import and reload');
    lines.push('Existing record buttons export/import stamps; reload restores menu progress');

    // Seed nine valid discoveries as a saved-game fixture, then earn the
    // tenth through physics. The medal itself is granted at normal results.
    await page.evaluate((next) => {
      localStorage.removeItem('stuntskoelle.veedel');
      let remaining = 9;
      for (const def of GameData.TRACKS) {
        const ids = [...(def.shortcuts || []), ...(def.branches || [])].map((r) => r.id).filter((id) => id !== next).slice(0, remaining);
        remaining -= ids.length;
        localStorage.setItem('stuntskoelle.routes.' + def.id, JSON.stringify(ids));
      }
      document.getElementById('startBtn').click();
    }, routes[0].id);
    assert(await waitFor(page, () => STUNTS_DEBUG().phase === 'race', 120000), 'second race must start');
    await page.evaluate(() => { STUNTS_MANUAL_STEP = true; });
    await complete(routes[0]);
    assert.strictEqual(await page.evaluate(() => STUNTS_ORDEN().stats.streetsFound), 10, 'discovery total must be derived from unique valid saved route IDs');
    await page.evaluate(() => { STUNTS_MANUAL_STEP = false; STUNTS_FINISH(); });
    assert(await waitFor(page, () => !document.getElementById('results').hidden, 15000), 'race must reach normal result handling');
    assert((await page.evaluate(() => STUNTS_ORDEN().orden)).includes('veedel'), 'ten distinct roads must award the existing Veedelskenner medal');
    lines.push('Tenth distinct route awards VEEDELSKENNER through normal race results');
    await page.evaluate((id) => {
      for (const def of GameData.TRACKS) localStorage.removeItem('stuntskoelle.routes.' + def.id);
      localStorage.setItem('stuntskoelle.veedel', JSON.stringify([id, id, 'unknown-route', null]));
    }, cut.id);
    await page.keyboard.press('Escape');
    assert((await page.locator('#trackRoutes').textContent()).includes('VEEDELS-PASS 1/4'), 'older shared Veedel saves must migrate without duplicate or unknown stamps');
    await page.evaluate(() => localStorage.setItem('stuntskoelle.veedel', '{"invalid":true}'));
    await page.reload();
    await page.waitForFunction(() => window.STUNTS_ROUTES);
    assert((await page.locator('#trackRoutes').textContent()).includes('VEEDELS-PASS 0/4'), 'malformed older Veedel saves must not break the menu');
    lines.push('Legacy Veedel discoveries migrate safely; malformed, duplicate and unknown IDs are ignored');
    assert.deepStrictEqual(errors, [], 'no browser errors');
    return { name: 'passport', ok: true, lines };
  } finally {
    await browser.close(); await new Promise((resolve) => server.close(resolve));
  }
};
