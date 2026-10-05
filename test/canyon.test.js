// B29: the 1968 Ring (track 'kalk') is a canyon of façades, not a suburban park. Along the main straights (every straight
// of 40 m or more) the plot-sized scenery within 30 m of the road edge (2.5 m high or more, 6 m² or more of ground; lamps,
// people, cars and signs on posts do not count) is at least 80 % houses, façades and buildings and under 10 % lawn, park or
// trees. Cinemas ('LICHTSPIELE', 'HEUTE: WESTERN') and bars with their SPERRSTUNDE plate stand in the row. Every neon colour
// the scene asks for lies in the theme's period list (red, warm white, yellow, blue), and no scene of a later decade
// (LamboGina, parcel vans) is set on the Ring.
const assert = require('assert');
const { once } = require('events');
const { serve, launch, waitFor } = require('./helpers');
const { GameData: D } = require('../js/data');

const PERIOD = ['#ff3b30', '#ffe7b0', '#ffd400', '#4da3ff'];
const FURNITURE = /^(ampel|zebrasign|walker|searchlight|paint|prop:(gantry|rain|zeppelin|blitzer|schild|rails|tuenn|gangster|kripo|crowd|koelsch))$/;
const BUILDING = /^(house|backdrop|prop:(jumphouse|residenz|kleinkoeln|loversclub|sartory|spielclub|boxring|hansahochhaus|buedchen|expresskiosk|bude|hahnentor|eigelsteintor|kirche|neon))$/;

module.exports = async function () {
  const lines = [], def = D.TRACKS.find((t) => t.id === 'kalk'), th = def.theme;
  // 1) the data: the period palette, every neon prop and venue in it, the venues the Ring had
  assert.deepStrictEqual(th.neon, PERIOD, 'kalk: theme.neon is the 1968 palette (red, warm white, yellow, blue)');
  assert(th.era === 1968 && th.canyon, 'kalk: an era track built as a canyon');
  for (const p of def.props.filter((q) => q.type === 'neon')) assert(PERIOD.includes(p.color), `kalk neon "${p.text}" is ${p.color}, outside the period palette`);
  for (const v of th.venues) assert(PERIOD.includes(v.color), `kalk venue ${v.text} is ${v.color}`);
  const vt = th.venues.map((v) => v.text + ' ' + (v.sub || ''));
  for (const want of ['LICHTSPIELE HEUTE: WESTERN', 'TANZ-BAR', 'BAR · DANCING', 'WEINSTUBE', 'KÖLSCH VOM FASS']) assert(vt.some((t) => t.startsWith(want)), 'kalk venues need ' + want);
  assert(!def.props.some((p) => p.type === 'fireworks' || p.type === 'palm'), 'kalk: no Kölner Lichter (2001) and no palms on the 1968 Ring');

  // 2) the scene: what stands along the main straights
  const server = serve(0); let browser; const errors = [];
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(([FUR, BLD]) => {
      window.STUNTS_IDLE = 99999; localStorage.setItem('stuntskoelle.pixel', '3'); localStorage.setItem('stuntskoelle.voice', 'off'); localStorage.setItem('stuntskoelle.jukebox', 'off');
      const fur = new RegExp(FUR), bld = new RegExp(BLD);
      window.STUNTS_AUDIT = (g, track, k) => { // before the batching: every placed object with its kind
        const S = track.samples, n = S.length, edge = k.ROAD_W + 1.6, segLen = {}; S.forEach((q) => { segLen[q.seg] = (segLen[q.seg] || 0) + track.ds; });
        const main = new Set(track.segments.map((sg, i) => (sg.t === 'straight' && segLen[i] >= 40 ? i : -1)).filter((i) => i >= 0)), out = { building: 0, green: 0, other: 0, kinds: {}, venues: { kino: 0, bar: 0 }, scenes: [] };
        for (const ch of g.children) {
          const u = ch.userData; if (u.sky || u.keep || u.water) continue;
          if (u.venue) out.venues[u.venue]++; if ((u.kind || '').startsWith('veedel:')) out.scenes.push(u.kind.slice(7));
          let best = Infinity, bi = 0; for (let i = 0; i < n; i += 2) { const d = (S[i].p.x - ch.position.x) ** 2 + (S[i].p.z - ch.position.z) ** 2; if (d < best) { best = d; bi = i; } }
          if (!main.has(S[bi].seg) || S[bi].kind !== 'straight' || Math.sqrt(best) > edge + 30) continue;
          if (!u.green && (!(u.kind || u.w) || fur.test(u.kind || ''))) continue; // street furniture, people, cars
          const sz = new THREE.Box3().setFromObject(ch).getSize(new THREE.Vector3()); if (sz.x * sz.z < 6 || sz.y < 2.5) continue;
          const cls = u.green ? 'green' : (u.w || u.landmarkName || bld.test(u.kind || '')) ? 'building' : 'other'; out[cls]++; out.kinds[cls + ':' + (u.kind || 'w')] = (out.kinds[cls + ':' + (u.kind || 'w')] || 0) + 1;
        }
        window.__canyon = out;
      };
    }, [FURNITURE.source, BUILDING.source]);
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_DEBUG === 'function' && document.querySelectorAll('.trackRow').length >= 10, undefined, { timeout: 120000 });
    await page.evaluate(() => { const i = window.GameData.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).findIndex((t) => t.id === 'kalk'); document.querySelectorAll('.trackRow')[i].click(); window.STUNTS_SIMSTEPS = 4; document.getElementById('startBtn').click(); });
    assert(await waitFor(page, () => window.__canyon && /intro|countdown|race/.test(window.STUNTS_DEBUG().phase), 150000), 'the Ring must be built');
    const c = await page.evaluate(() => window.__canyon), neon = await page.evaluate(() => window.World.neonUsed());
    // and what actually glows in the built scene (lit sign colours, additive glows, coloured lights): no Miami pink, violet or cyan,
    // also from props that colour their own neon (Lovers Club, Residenz, Klein Köln, the Herrenclub)
    const miami = await page.evaluate(() => { const out = new Set(), hsl = {}; const look = (col, what) => { col.getHSL(hsl); const h = hsl.h * 360; if (hsl.s > 0.5 && hsl.l > 0.3 && hsl.l < 0.9 && ((h > 165 && h < 200) || (h > 265 && h < 345))) out.add(what + ' #' + col.getHexString()); };
      for (const r of window.STUNTS_STATIC()) r.traverse((o) => { if (o.isPointLight) look(o.color, 'light'); for (const m of [].concat(o.material || [])) if (m.color && m.type === 'MeshBasicMaterial' && !m.map) look(m.color, m.blending === THREE.AdditiveBlending ? 'glow' : 'lit'); });
      return [...out]; });
    lines.push('Miami colours in the scene: ' + (miami.join(', ') || 'none'));
    assert.deepStrictEqual(miami, [], 'no pink, violet or cyan neon glows on the 1968 Ring');
    const total = c.building + c.green + c.other;
    lines.push(`main straights: ${c.building} buildings, ${c.green} green, ${c.other} other of ${total} (${Object.entries(c.kinds).filter(([k]) => !k.startsWith('building')).map(([k, v]) => k + ' ' + v).join(', ')})`);
    lines.push(`venues: ${c.venues.kino} cinemas, ${c.venues.bar} bars; neon used: ${neon.join(' ')}`);
    assert(total >= 40, 'the main straights must be lined (found ' + total + ')');
    assert(c.building / total >= 0.8, `at least 80 % façades and buildings (${Math.round(c.building / total * 100)} %)`);
    assert(c.green / total < 0.1, `under 10 % lawn and park (${Math.round(c.green / total * 100)} %)`);
    assert(c.venues.kino >= 1 && c.venues.bar >= 2, 'cinemas and bars stand in the row');
    assert(neon.length >= 2 && neon.every((x) => PERIOD.includes(x)), 'every neon on the Ring is a period colour: ' + neon.join(' '));
    assert(!c.scenes.some((sc) => ['lamboposter', 'musikwagen', 'autohausgina', 'paketdienst', 'jga'].includes(sc)), 'no scene of a later decade on the 1968 Ring: ' + c.scenes.join(', '));
    assert.deepStrictEqual(errors, [], 'no browser errors');
    return { name: 'canyon', ok: true, lines };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
