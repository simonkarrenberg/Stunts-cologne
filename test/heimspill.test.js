// B30: Heimspill, the matchday track out to Müngersdorf. The data: real streets in the right order on the signs, the
// stadium bowl inside a banked curve, a jump over the Jahnwiese parking, a loop between two floodlight masts, a three-way
// fork at the stadium and real side streets that all build; plain red and white, no club name, crest or sponsor in its texts.
// In the browser: the autopilot drives three whole laps, and the scripted Botengang 'ANSTOSS EN ZEHN MINUTTE' (the season
// ticket from a Büdchen in Sülz to the stadium gate) ends at the gate with time left and the headline on the front page.
const assert = require('assert');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');
const { GameData: D } = require('../js/data');
const { TrackBuilder: TB } = require('../js/track');
const { Shortcuts: SC } = require('../js/shortcuts');

module.exports = async function () {
  const lines = [], def = D.TRACKS.find((t) => t.id === 'heimspill');
  assert(def, 'the Heimspill track exists');
  // 1) the route: Aachener Straße out, the stadium, the Stadtwald, Lindenthal and Sülz back, the Ring to the Rudolfplatz
  assert.deepStrictEqual(def.signs.map((s) => s[1]), ['AACHENER STRASSE', 'JAHNWIESE', 'STADTWALD', 'DÜRENER STRASSE', 'LINDENTHALGÜRTEL', 'SÜLZGÜRTEL', 'BERRENRATHER STRASSE', 'ZÜLPICHER STRASSE', 'HABSBURGERRING', 'RUDOLFPLATZ'], 'the real streets in their order');
  const segOf = (type) => (def.props.find((p) => p.type === type) || {}).seg, sg = def.segments;
  const stad = def.props.find((p) => p.type === 'stadion');
  assert(stad && sg[stad.seg].t === 'curve' && sg[stad.seg].bank >= 15 && Math.sign(sg[stad.seg].angle) === -stad.side, 'the stadium stands inside a banked curve');
  const jump = sg.findIndex((s) => s.t === 'jump'), loop = sg.findIndex((s) => s.t === 'loop');
  assert(jump > stad.seg && sg[jump].over === 'parkplatz' && loop > jump, 'after the stadium: a jump over the Jahnwiese parking, then the loop');
  assert(def.props.filter((p) => p.type === 'flutmast' && p.seg === loop).length === 2, 'the loop stands between two floodlight masts');
  assert(segOf('melaten') < stad.seg && segOf('pond') < segOf('melaten') && segOf('hahnentor') === 0, 'Hahnentor, Aachener Weiher and Melaten come before the stadium');
  for (const t of ['stadiontor', 'geissbock', 'bahnbruecke']) assert(segOf(t) != null, t + ' is on the track');
  assert(def.props.some((p) => p.type === 'bude' && p.text === 'BRATWURSCH · KÖLSCH'), 'the Bierbud');
  assert(def.props.some((p) => /tram/.test(p.type) && /SONDERZUG STADION/.test(p.line || '')), 'a tram SONDERZUG STADION');
  assert(def.props.some((p) => p.type === 'tuenn' && /Du küss hee nit eren – ohne Dauerkaat!/.test(p.story || '')), 'Dä Lange at the gate');
  assert(def.theme.matchday && def.parkSegs.includes(stad.seg), 'matchday theme; the stadium, the meadow and the wood have no street walls');
  const text = JSON.stringify(def);
  for (const re of [/\bFC\b/, /Effzeh/i, /Hennes/i, /Rhein-?Energie/i, /Wappen/i, /Bundesliga/i]) assert(!re.test(text), 'no club name, crest or sponsor: ' + re);
  // 2) the side streets and the three-way fork build as authored (tools/routes.js: no REJECTED, no DROPPED)
  const track = TB.buildTrack(def), why = [], routes = SC.buildRoutes(track, why);
  assert.deepStrictEqual(why, [], 'no rejected side street');
  assert.deepStrictEqual(routes.map((r) => r.id).sort(), def.shortcuts.concat(def.branches).map((r) => r.id).sort(), 'every side street and fork arm is built');
  const fork = routes.filter((r) => r.fork === 'heimspill-dreiwege');
  assert(fork.length === 2 && fork.some((r) => r.side < 0) && fork.some((r) => r.side > 0) && fork.some((r) => r.kind === 'shortcut') && fork.some((r) => r.kind === 'alternate'), 'the stadium fork: a shorter left, the main road and a longer right');
  assert(TB.closure(def).closed, 'the circuit closes');
  lines.push(`${Math.round(track.length)} m per lap; ${routes.length} side streets (${routes.map((r) => r.street).join(', ')})`);

  // 3) the browser: three autopilot laps, then the Botengang to the gate
  const server = serve(0); let browser; const errors = [];
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 11, undefined, { timeout: 120000 });
    await page.evaluate(() => { const i = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).findIndex((t) => t.id === 'heimspill'); document.querySelectorAll('.trackRow')[i].click(); window.STUNTS_SIMSTEPS = 4; document.getElementById('startBtn').click(); });
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race', 150000), 'the race starts');
    const laps = await page.evaluate(() => { window.STUNTS_SIMSTEPS = 0; window.STUNTS_MANUAL_STEP = true; window.STUNTS_AUTOPILOT = true; let d = window.STUNTS_DEBUG(); for (let k = 0; k < 40 && !d.player.finished; k++) d = window.STUNTS_DRIVE_STEPS(1800); return { finished: d.player.finished, lap: d.player.lap, laps: d.player.laps, t: d.raceTime }; });
    lines.push(`autopilot: ${laps.finished ? 'finished' : 'NOT finished'} after ${Math.round(laps.t)} s, laps ${laps.laps.map((x) => x.toFixed ? x.toFixed(1) : x).join(' / ')}`);
    assert(laps.finished, 'the autopilot finishes three laps');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.evaluate(() => { window.STUNTS_MANUAL_STEP = false; window.STUNTS_AUTOPILOT = false; window.STUNTS_SIMSTEPS = 4; window.STUNTS_MISSION(window.GameData.TRACKS.findIndex((t) => t.id === 'heimspill')); });
    assert(await waitFor(page, () => window.STUNTS_DEBUG().phase === 'race' && window.STUNTS_MISSION_STATE(), 150000), 'the Botengang starts');
    const st = () => page.evaluate(() => window.STUNTS_MISSION_STATE());
    let m = await st();
    await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_TELEPORT(m.pickS - 2, 0); });
    assert(await waitFor(page, () => !document.getElementById('hudPrompt').hidden, 15000), 'the get-out prompt at the Büdchen in Sülz');
    await page.evaluate(() => window.STUNTS_ACT()); await page.waitForTimeout(400);
    await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_WALK(m.door[0] - 1, m.door[1]); }); await page.waitForTimeout(600);
    m = await st(); assert.strictEqual(m.stage, 'walkback', 'the season ticket is picked up');
    await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_WALK(m.car[0] + 1, m.car[2]); });
    assert(await waitFor(page, () => !document.getElementById('hudPrompt').hidden, 15000), 'the get-in prompt');
    await page.evaluate(() => window.STUNTS_ACT()); await page.waitForTimeout(600); m = await st();
    assert.strictEqual(m.stage, 'drive2', 'back in the car');
    const dropSeg = await page.evaluate((s) => window.STUNTS_FRAME(s), m.dropS);
    lines.push(`Botengang: pick at ${Math.round(m.pickS)} m, drop at ${Math.round(m.dropS)} m, ${m.timer} s on the clock`);
    // the drop is the stadium gate: on the Aachener Straße just before the stadium curve
    const L = dropSeg.len; assert(m.dropS > 0 && m.dropS < L * 0.3, 'the drop lies at the stadium gate on the Aachener Straße');
    // really drive it: the autopilot takes the car from the Büdchen in Sülz round to the stadium gate in race time (stepped by hand,
    // so neither the clock nor the Kripo run meanwhile), and that drive must take less than the clock gave; only stopping on the
    // mark (which the autopilot does not do) is a teleport, back on the running clock
    const drive = await page.evaluate((L) => { window.STUNTS_MANUAL_STEP = true; window.STUNTS_AUTOPILOT = true; let d = window.STUNTS_DEBUG(); const t0 = d.raceTime, m = window.STUNTS_MISSION_STATE();
      const ahead = () => { let x = m.dropS - d.player.s; if (x < 0) x += L; return x; }; let left = ahead(), k = 0;
      while (left > 25 && k++ < 400) { d = window.STUNTS_DRIVE_STEPS(15); const a = ahead(); if (a > left + 60) break; left = a; } // stop just before the gate (and never wrap past it)
      window.STUNTS_AUTOPILOT = false; window.STUNTS_MANUAL_STEP = false; return { t: d.raceTime - t0, left, crashed: d.player.crashed }; }, L);
    lines.push(`autopilot from Sülz to ${Math.round(drive.left)} m before the gate in ${drive.t.toFixed(1)} s of the ${m.timer} s on the clock`);
    assert(drive.left <= 25, `the autopilot reaches the gate (${Math.round(drive.left)} m to go)`);
    assert(drive.t < m.timer - 5, `the drive from Sülz to the stadium fits the clock (${drive.t.toFixed(1)} s of ${m.timer} s)`);
    await page.evaluate(() => { const m = window.STUNTS_MISSION_STATE(); window.STUNTS_TELEPORT(m.dropS - 3, 0); });
    assert(await waitFor(page, () => !document.getElementById('results').hidden, 30000), 'the Botengang ends at the gate');
    const log = await page.evaluate(() => window.STUNTS_MISSION_LOG()), res = await page.evaluate(() => ({ title: document.getElementById('resTitle').textContent, express: document.getElementById('resExpress').textContent }));
    lines.push(`${res.title} · ${res.express} · ${log.timer} s left`);
    assert(log.ok && log.timer > 0, 'delivered before kick-off, with time left');
    assert.strictEqual(log.title, 'ANSTOSS EN ZEHN MINUTTE');
    assert(/KURIER RETTET ANSTOSS – SÜDKURV KOMPLETT/.test(log.headline) && /KURIER RETTET ANSTOSS – SÜDKURV KOMPLETT/.test(res.express), 'the headline on the front page');
    assert(/ANSTOSS EN ZEHN MINUTTE/.test(res.title), 'the result names the Botengang');
    assert.deepStrictEqual(errors, [], 'no browser errors');
    return { name: 'heimspill', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
