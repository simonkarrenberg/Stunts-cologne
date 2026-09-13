// a whole Botengang: stop at the pickup, get out, fetch the package on foot, get in, deliver with the Kripo behind
const { serve, launch, waitFor } = require('./helpers');
module.exports = async function () {
  const port = 8800 + Math.floor(Math.random() * 90); const srv = serve(port); const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); const lines = [];
  await page.addInitScript(() => { try { localStorage.setItem('stuntskoelle.pixel', '3'); } catch (e) {} window.STUNTS_IDLE = 99999; });
  await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(1000);
  await page.evaluate(() => { window.STUNTS_SIMSTEPS = 4; window.STUNTS_MISSION(0); });
  const st = () => page.evaluate(() => window.STUNTS_MISSION_STATE());
  if (!await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 120000)) errors.push('mission never reached the race phase');
  await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_TELEPORT(m.pickS - 2, 0); });
  if (!await waitFor(page, () => !document.getElementById('hudPrompt').hidden, 15000)) errors.push('no get-out prompt at the pickup');
  await page.evaluate(() => window.STUNTS_ACT()); await page.waitForTimeout(500); let m = await st(); lines.push('stage after getting out: ' + m.stage); if (m.stage !== 'walk') errors.push('did not get out');
  await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_WALK(m.door[0] - 1, m.door[1]); }); await page.waitForTimeout(700); m = await st(); lines.push('stage at the door: ' + m.stage); if (m.stage !== 'walkback') errors.push('package not picked up');
  await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_WALK(m.car[0] + 1, m.car[2]); });
  if (!await waitFor(page, () => !document.getElementById('hudPrompt').hidden, 15000)) errors.push('no get-in prompt at the car');
  await page.evaluate(() => window.STUNTS_ACT()); await page.waitForTimeout(800); m = await st(); lines.push('stage back in the car: ' + m.stage + ', timer ' + m.timer); if (m.stage !== 'drive2') errors.push('did not get back in');
  if (!await page.evaluate(() => document.getElementById('hudKripo').textContent.includes('HINTER'))) errors.push('Kripo did not show up');
  await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_TELEPORT(m.dropS - 3, 0); });
  if (!await waitFor(page, () => !document.getElementById('results').hidden, 30000)) errors.push('mission did not end at the drop-off');
  lines.push(await page.evaluate(() => document.getElementById('resTitle').textContent));
  await browser.close(); srv.close();
  return { name: 'mission', ok: !errors.length, lines: lines.concat(errors) };
};
