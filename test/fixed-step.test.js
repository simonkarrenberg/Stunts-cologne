// Fixed-timestep physics: with a stubbed requestAnimationFrame clock (and timers that follow it) the race runs the
// same on a 30 Hz phone and a 144 Hz screen: one autopilot lap of the Poller Wiesen within 0.05 s, the flight over
// the Rhine on the Schäl Sick within 2 % of its height, and at a forced 15 fps 10 s of wall time are 10 s of race.
// From the countdown on every random draw returns the same value, so frame timing cannot reorder the rivals' dice.
const assert = require('assert');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');

function fakeClock() {
  const realTimeout = window.setTimeout.bind(window), realRandom = Math.random;
  let now = 1000, seq = 1, rafs = [], timers = [];
  const c = window.__clock = { fps: 60, budget: Infinity, frames: 0, constRandom: false, phase: '', seed: 0 };
  // seeded from the click on START (the grid, the rivals' moods), a constant from the countdown on
  Math.random = () => { if (c.constRandom) return 0.5; if (!c.seed) return realRandom(); c.seed = (c.seed + 0x6D2B79F5) | 0; let t = c.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.requestAnimationFrame = (cb) => { rafs.push(cb); return seq++; };
  window.cancelAnimationFrame = () => {};
  window.setTimeout = (fn, ms, ...args) => { const id = seq++; timers.push({ id, due: now + (+ms || 0), fn, args }); return id; };
  window.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); };
  const run = (fn, args) => { try { if (typeof fn === 'function') fn(...args); } catch (e) { realTimeout(() => { throw e; }, 0); } };
  const step = () => {
    now += 1000 / c.fps; c.frames++;
    const due = timers.filter((t) => t.due <= now).sort((a, b) => a.due - b.due || a.id - b.id); timers = timers.filter((t) => t.due > now);
    for (const t of due) run(t.fn, t.args);
    const list = rafs; rafs = []; for (const cb of list) run(cb, [now]);
    const phase = window.STUNTS_DEBUG ? window.STUNTS_DEBUG().phase : '';
    if (phase === 'countdown' && c.phase !== 'countdown') c.constRandom = true;
    c.phase = phase;
  };
  const pump = () => { for (let k = 0; k < 60 && c.budget > 0; k++) { c.budget--; step(); } realTimeout(pump, 0); };
  realTimeout(pump, 0);
}

module.exports = async function () {
  const server = serve(0), errors = [], lines = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const run = async (trackId, fps, until) => {
      const context = await browser.newContext({ viewport: { width: 480, height: 270 }, serviceWorkers: 'block' });
      await context.addInitScript(() => { window.STUNTS_IDLE = 99999; window.STUNTS_NORENDER = true; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
      await context.addInitScript(fakeClock);
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`${trackId}@${fps}: ${e.message}`));
      await page.goto(`http://localhost:${server.address().port}/`);
      assert(await waitFor(page, () => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length > 0, 60000), 'menu must load');
      await page.evaluate(({ id, fps }) => {
        const order = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map((t) => t.id);
        window.__clock.fps = fps; window.__clock.seed = 4711; window.STUNTS_AUTOPILOT = true;
        document.querySelectorAll('.trackRow')[order.indexOf(id)].click(); document.getElementById('startBtn').click();
      }, { id: trackId, fps });
      assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 180000), `${trackId}@${fps}: the race must start`);
      const result = await until(page);
      await context.close();
      return result;
    };

    // 1) one autopilot lap of the Poller Wiesen (three loops, a jump) at 30 and at 144 fps
    const lap = async (page) => {
      assert(await waitFor(page, () => window.STUNTS_DEBUG().player.laps.length >= 1, 900000), 'the autopilot must finish a lap');
      return page.evaluate(() => { const d = window.STUNTS_DEBUG(); return { lap: d.player.laps[0], frames: window.__clock.frames }; });
    };
    const lap30 = await run('poller', 30, lap), lap144 = await run('poller', 144, lap);
    lines.push(`Poller lap: ${lap30.lap.toFixed(3)} s at 30 fps, ${lap144.lap.toFixed(3)} s at 144 fps`);
    assert(Math.abs(lap30.lap - lap144.lap) < 0.05, 'lap times must not depend on the frame rate: ' + lines[lines.length - 1]);

    // 2) the jump over the Rhine on the Schäl Sick: the same height at 30 and at 144 fps
    const jump = async (page) => {
      const gap = await page.evaluate(() => { const L = window.STUNTS_DEBUG().trackLen; for (let s = 0; s < L; s++) if (window.STUNTS_FRAME(s + 0.01).kind === 'gap') return (window.__gap = s); return -1; });
      assert(gap > 0, 'the Schäl Sick has a jump');
      assert(await waitFor(page, () => window.STUNTS_DEBUG().player.jumps.some((j) => Math.abs(j.s - window.__gap) < 40 && j.h > 1), 600000), 'the autopilot must fly over the Rhine');
      return page.evaluate(() => window.STUNTS_DEBUG().player.jumps.find((j) => Math.abs(j.s - window.__gap) < 40 && j.h > 1).h);
    };
    const h30 = await run('zoo', 30, jump), h144 = await run('zoo', 144, jump);
    lines.push(`Rhine jump: ${h30.toFixed(3)} m at 30 fps, ${h144.toFixed(3)} m at 144 fps`);
    assert(Math.abs(h30 - h144) / Math.max(h30, h144) < 0.02, 'the jump arc must not depend on the frame rate: ' + lines[lines.length - 1]);

    // 3) a forced 15 fps: 150 frames are 10 s of wall time and must be 10 s of race time (no slow motion)
    const slow = await run('poller', 60, async (page) => {
      await page.evaluate(() => { window.__clock.budget = 0; });
      await page.waitForTimeout(300);
      const t0 = await page.evaluate(() => { window.__clock.fps = 15; window.__clock.budget = 150; return window.STUNTS_DEBUG().raceTime; });
      assert(await waitFor(page, () => window.__clock.budget === 0, 120000), '150 frames must run');
      return (await page.evaluate(() => window.STUNTS_DEBUG().raceTime)) - t0;
    });
    lines.push(`15 fps: 10 s of wall time = ${slow.toFixed(3)} s of race time`);
    assert(Math.abs(slow - 10) <= 0.1, 'below 20 fps the race must not run in slow motion: ' + lines[lines.length - 1]);
    assert.deepStrictEqual(errors, [], 'no script errors');
    return { name: 'fixed-step', ok: true, lines };
  } catch (error) {
    return { name: 'fixed-step', ok: false, lines: lines.concat(errors, [String(error && error.stack || error)]) };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};
