// Botengang places: every track sends the courier to its own Veedel (no Rheinauhafen job at the Ring's Sartory),
// each place name gets its article from TUENN.placeGender, and a track's own cargo comes with its short HUD name.
const assert = require('assert');
const { GameData: D } = require('../js/data');

module.exports = async function () {
  const lines = [], B = D.TUENN.botengang, generic = new Set(B.where), owner = new Map();
  const NAME = /^[A-ZÄÖÜ][A-ZÄÖÜ0-9É&,' -]*[A-ZÄÖÜ0-9É]$/; // what placeArticles in game.js can find inside a sentence
  for (const def of D.TRACKS) {
    const M = def.mission;
    assert(M && Array.isArray(M.where) && M.where.length >= 4, `${def.id}: needs mission.where with at least 4 places of its own`);
    for (const w of M.where) {
      assert(NAME.test(w), `${def.id}: "${w}" must be an upper-case place name`);
      assert(D.placeGender(w).known, `${def.id}: "${w}" has no noun in TUENN.placeGender (article unknown)`);
      if (generic.has(w)) continue;
      assert(!owner.has(w), `"${w}" is used on ${owner.get(w)} and ${def.id}`);
      owner.set(w, def.id);
    }
    assert.strictEqual(new Set(M.where).size, M.where.length, `${def.id}: a place twice in its own list`);
    if (M.what) assert(Array.isArray(M.whatShort) && M.whatShort.length === M.what.length && M.whatShort.every((s) => NAME.test(s)), `${def.id}: own cargo needs a whatShort for each entry`);
  }
  for (const w of B.where.concat(D.TUENN.auftrag.where)) assert(D.placeGender(w).known, `generic place "${w}" has no known article`);
  assert.strictEqual(B.what.length, B.whatShort.length, 'generic cargo and its short names must pair up');
  // the article data must bite: the cases a play-tester heard wrong
  const g = (w) => D.placeGender(w).g;
  assert.deepStrictEqual(['WAGENBAUHALLE', 'KAMELLE-LAGER', 'TAXISTAND EBERTPLATZ', 'HEHLER & SÖHNE', 'SARTORY', 'SARTORY-HINTEREINGANG', 'BOOTSHAUS AM BAYENTURM', 'LIEFERRAMPE AM SCHOKOLADENMUSEUM'].map(g), ['f', 'n', 'm', 'p', 'n', 'm', 'n', 'f']);
  // and game.js applies it, also at the start of a sentence ('Zum {drop}, un kein Kratzer.')
  const src = require('fs').readFileSync(require('path').join(__dirname, '../js/game.js'), 'utf8'), i0 = src.indexOf('  function placeArticles'), i1 = src.indexOf('\n  }\n', i0) + 4;
  const placeArticles = new Function('D', src.slice(i0, i1) + '; return placeArticles;')(D);
  assert.strictEqual(placeArticles('Fahr zum LIEFERRAMPE AM SCHOKOLADENMUSEUM. Zum HINTERTÜR GÜRZENICH, un kein Kratzer. Der BOOTSHAUS AM BAYENTURM hät zujemacht. Am PFANDLEIHE liegt et. Zum HEHLER & SÖHNE.'),
    'Fahr zur LIEFERRAMPE AM SCHOKOLADENMUSEUM. Zur HINTERTÜR GÜRZENICH, un kein Kratzer. Dat BOOTSHAUS AM BAYENTURM hät zujemacht. Bei d\'r PFANDLEIHE liegt et. Zu HEHLER & SÖHNE.');
  lines.push(`${D.TRACKS.length} tracks, ${owner.size} own Botengang places, all with an article`);
  return { name: 'botengang', ok: true, lines };
};
