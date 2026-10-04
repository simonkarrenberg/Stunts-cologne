// Klüngel-Baukasten: only a truly closed layout counts as closed (gap under 2 m, heading under 5°), an open one names
// the gap and the missing piece, and closeLoop never leaves the grip physics (curv) behind the bent tangents.
const assert = require('assert');
const path = require('path');
const { once } = require('events');
const { serve, launch } = require('./helpers');

const TB = require(path.join(__dirname, '..', 'js', 'track.js')).TrackBuilder;
const D = require(path.join(__dirname, '..', 'js', 'data.js')).GameData;
const P = { straight: { t: 'straight', len: 60 }, lcurve: { t: 'curve', angle: 90, r: 35 }, rcurve: { t: 'curve', angle: -90, r: 35 }, loop: { t: 'loop', r: 14, shift: 14 },
  jump: { t: 'jump', ramp: 28, angle: 15, gap: 28 }, hill: { t: 'hill', len: 60, pitch: 14 }, dip: { t: 'dip', len: 40, pitch: 12 }, lbank: { t: 'curve', angle: 90, r: 45, bank: 15 } };
const layout = (ids) => ({ segments: ids.map((i) => Object.assign({}, P[i])), scale: 1 });
// dθ/ds: the turn of the tangent in the ground plane per metre of track (a loop turns about its right axis: no curv;
// the step into a loop is its sideways shift, not a bend)
function curvError(track) {
  const S = track.samples, n = S.length; let worst = 0, at = -1;
  for (let i = 0; i < n; i++) {
    if (S[i].kind === 'loop' || S[(i + 1) % n].kind === 'loop') continue;
    const a = S[i].T, b = S[(i + 1) % n].T, d = Math.atan2(a.z * b.x - a.x * b.z, a.x * b.x + a.y * b.y + a.z * b.z) / TB.DS, e = Math.abs((S[i].curv || 0) - d);
    if (e > worst) { worst = e; at = i; }
  }
  return { worst, at };
}

module.exports = async function () {
  const lines = [], errors = []; let server, browser;
  try {
    // 1) the closing check itself
    const square = layout(['straight', 'straight', 'straight', 'straight', 'lcurve', 'lcurve', 'lcurve', 'lcurve']);
    const open = TB.closure(square);
    assert(!open.closed && open.gap > 2, `4× GERADE + 4× KURVE L must be open with a gap over 2 m (gap ${open.gap.toFixed(1)} m)`);
    lines.push(`4× GERADE + 4× KURVE L: open, gap ${open.gap.toFixed(1)} m`);
    const twelve = layout(['straight', 'lcurve', 'straight', 'loop', 'lcurve', 'straight', 'jump', 'lcurve', 'straight', 'hill', 'lbank', 'straight']);
    const shut = TB.closure(twelve);
    assert(shut.closed && shut.gap < TB.CLOSE_GAP && shut.headingErr < TB.CLOSE_HEADING, `the 12-piece loop must count as closed (gap ${shut.gap.toFixed(2)} m, ${shut.headingErr.toFixed(2)}°)`);
    lines.push(`12-piece loop: closed, gap ${shut.gap.toFixed(2)} m, heading ${shut.headingErr.toFixed(2)}°`);
    const turned = TB.closure(layout(['straight', 'lcurve', 'straight', 'lcurve', 'straight', 'lcurve']));
    assert(!turned.closed && turned.headingErr > 5, 'three quarter turns are not closed');

    // 2) after closeLoop curv follows the corrected tangents: the editor loop and every built-in track
    for (const def of [Object.assign({ name: 'twelve' }, twelve)].concat(D.TRACKS)) {
      const t = TB.buildTrack(def), c = curvError(t);
      assert(c.worst < 1e-3, `${def.id || def.name}: |curv − dθ/ds| = ${c.worst.toFixed(4)} at sample ${c.at} (${t.samples[c.at] && t.samples[c.at].kind})`);
    }
    lines.push(`curv matches dθ/ds within 1e-3 on the editor loop and all ${D.TRACKS.length} tracks`);

    // 3) the editor in the browser: an open layout is not drivable and names the gap and a piece
    server = serve(0); if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await page.addInitScript(() => { window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off'); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length > 0);
    await page.click('#editorBtn');
    const build = async (labels) => { await page.click('#edClear'); for (const l of labels) await page.locator('#edPalette button', { hasText: new RegExp('^' + l + '$') }).click(); return page.evaluate(() => ({ text: document.getElementById('edWarn').textContent, drive: !document.getElementById('edDrive').disabled })); };
    const a = await build(['GERADE', 'GERADE', 'GERADE', 'GERADE', 'KURVE L', 'KURVE L', 'KURVE L', 'KURVE L']);
    assert(!a.drive && /NOCH \d+ M AFF/.test(a.text) && /GERADE/.test(a.text), `an open layout must name the gap and a piece: "${a.text}"`);
    lines.push(`editor, open: "${a.text}"`);
    const b = await build(['GERADE', 'KURVE L', 'GERADE', 'KURVE L', 'GERADE', 'KURVE L', 'GERADE', 'KURVE L']);
    assert(b.drive && /zo/.test(b.text), `a closed square must be drivable: "${b.text}"`);
    const c = await build(['GERADE', 'KURVE L', 'GERADE', 'KURVE L', 'GERADE', 'KURVE L', 'KURVE L']);
    assert(!c.drive && /NOCH \d+ M AFF/.test(c.text), `one straight short: "${c.text}"`);
    lines.push(`editor, one straight short: "${c.text}"`);
    const daily = await page.evaluate(() => { const out = []; for (let d = -30; d < 30; d++) { const def = window.STUNTS_DAILY(d); out.push(def ? window.TrackBuilder.closure(def).closed : false); } return out; });
    assert(daily.every(Boolean), `every Streck des Tages must be closed: ${daily.filter((x) => !x).length} of 60 days are not`);
    lines.push('60 days of Streck des Tages: all closed');
    assert.deepStrictEqual(errors, [], 'no page errors');
    return { name: 'baukasten', ok: true, lines };
  } catch (e) {
    lines.push(String(e && e.message || e)); return { name: 'baukasten', ok: false, lines };
  } finally { if (browser) await browser.close(); if (server) server.close(); }
};
