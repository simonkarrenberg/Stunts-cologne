// every built-in track: the autopilot must finish a shortened race without a script error
const { serve, launch, waitFor } = require('./helpers');
module.exports = async function () {
  const port = 8700 + Math.floor(Math.random() * 90); const srv = serve(port); const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('stuntskoelle.pixel', '3'); } catch (e) {} window.STUNTS_IDLE = 99999; });
  await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(1000);
  const n = await page.evaluate(() => document.querySelectorAll('.trackRow').length); const results = [];
  const which = process.env.TRACKS ? process.env.TRACKS.split(',').map(Number) : [...Array(n).keys()]; // TRACKS=0,3 for a quick run
  for (const t of which) {
    await page.evaluate((i) => { document.querySelectorAll('.trackRow')[i].click(); window.STUNTS_AUTOPILOT = true; window.STUNTS_SIMSTEPS = 4; document.getElementById('startBtn').click(); }, t);
    const raced = await waitFor(page, () => { const d = window.STUNTS_DEBUG(); return d.phase === 'race' && d.player.s > 120; }, 120000);
    await page.evaluate(() => window.STUNTS_FINISH());
    const done = await waitFor(page, () => !document.getElementById('results').hidden, 30000);
    const name = await page.evaluate(() => document.getElementById('hudTrack').textContent);
    results.push(`${name}: ${raced && done ? 'ok' : 'FAILED'}`); console.log('   ' + results[results.length - 1]); if (!(raced && done)) errors.push('track ' + t + ' did not finish');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }
  await browser.close(); srv.close();
  return { name: 'race', ok: !errors.length, lines: results.concat(errors) };
};
