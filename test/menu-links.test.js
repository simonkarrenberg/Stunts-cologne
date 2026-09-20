// Menu performance, complete shared tracks, and offline availability of the new city modules.
const assert = require('assert');
const { once } = require('events');
const { serve, launch } = require('./helpers');

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    const url = `http://localhost:${server.address().port}/`;
    browser = await launch();
    async function context(options) {
      const ctx = await browser.newContext(options);
      await ctx.addInitScript(() => {
        window.STUNTS_IDLE = 99999;
        localStorage.setItem('stuntskoelle.pixel', '3');
      });
      const page = await ctx.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      return { ctx, page };
    }
    async function ready(page) {
      await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.deepStrictEqual(await page.evaluate(() => ({ scene: !!window.STUNTS_SCENE(), calls: window.STUNTS_STATS().calls, phase: window.STUNTS_DEBUG().phase })),
        { scene: false, calls: 0, phase: 'menu' }, 'the menu must not build or render a race');
    }
    async function quickStartVisible(page) {
      assert(await page.locator('#quickStartBtn').isVisible(), 'quick start must be visible');
      assert(await page.locator('#quickStartBtn').evaluate((button) => {
        const r = button.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
          && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === button;
      }), 'quick start must fit on screen and be unobstructed');
    }
    const desktop = await context({ viewport: { width: 1440, height: 900 } });
    await desktop.page.goto(url);
    await ready(desktop.page);
    await quickStartVisible(desktop.page);
    await desktop.page.locator('.trackRow').nth(8).click();
    await ready(desktop.page);
    await quickStartVisible(desktop.page);
    lines.push('Desktop: no scene or draw calls before/after track selection; quick start stays visible');

    const phone = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
    await phone.page.goto(url);
    await ready(phone.page);
    assert(await phone.page.locator('body').evaluate((body) => body.classList.contains('mobile')), 'phone must use the actual mobile layout');
    await quickStartVisible(phone.page);
    await phone.page.locator('.trackRow').nth(3).click();
    await ready(phone.page);
    await quickStartVisible(phone.page);
    await phone.ctx.close();
    lines.push('Landscape phone: mobile/touch layout, unobstructed quick start, lazy track selection');

    const page = desktop.page;
    const code = 'glJlclgl'; // Four left turns, a house jump and a corkscrew.
    await page.goto(url + '?case=complete#s=' + code + '&k=1&n=Haus%20und%20Schraube');
    await ready(page);
    const linked = await page.evaluate(() => JSON.parse(localStorage.getItem('stuntskoelle.custom')).find((t) => t.name === 'Haus und Schraube'));
    assert(linked && linked.fromLink, 'shared track must be saved in the custom-track list');
    assert.deepStrictEqual(linked.segments.map((s) => s.t), ['straight', 'curve', 'jump', 'curve', 'corkscrew', 'curve', 'straight', 'curve']);
    assert.strictEqual(linked.segments[2].over, 'house', 'capital J must remain the house jump');
    assert.strictEqual(linked.segments[4].turns, 1, 'lowercase c must remain a complete corkscrew');
    await page.goto(url + '?case=bad-scenery#s=' + code + '&k=nope&n=Fallback');
    await ready(page);
    assert(await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('stuntskoelle.custom')).find((t) => t.name === 'Fallback');
      const base = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9))[4];
      return !!saved && JSON.stringify(saved.theme) === JSON.stringify(base.theme);
    }), 'invalid scenery indices must safely fall back');
    await page.evaluate(() => localStorage.removeItem('stuntskoelle.custom'));
    await page.goto(url + '?case=invalid#s=glJl!clgl&k=1&n=Rejected');
    await ready(page);
    assert.deepStrictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('stuntskoelle.custom') || '[]')), [], 'an invalid code must not create a partial track');
    lines.push('Shared links: full J/c sequence preserved, invalid scenery falls back, invalid codes rejected whole');

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    const modules = ['./js/shortcuts.js', './js/landmarks.js', './js/streets.js'];
    assert(await page.evaluate(async (paths) => (await Promise.all(paths.map((path) => caches.match(path)))).every(Boolean), modules), 'new city modules must be precached');
    await desktop.ctx.setOffline(true);
    await page.goto(url, { waitUntil: 'load' });
    await ready(page);
    assert(await page.evaluate(() => typeof window.Shortcuts.buildRoutes === 'function' && typeof window.World.buildShortcutRoads === 'function'
      && ['aposteln', 'guerzenich', 'deutzbahnhof', 'altstmaternus', 'neptunbad', 'unikoeln', 'agnes', 'gereon', 'synagoge', 'richmodisturm', 'melaten', 'bottmuehle'].every((id) => typeof window.World.P[id] === 'function')), 'offline reload must initialize shortcut and landmark constructors, including the latest heritage expansion');
    lines.push('Offline reload: service worker serves the menu and all new city modules');
    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'menu-links', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
