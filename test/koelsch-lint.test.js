// Kölsch proofreading: one AkuSK-style sheet for every game text (js/*.js strings and index.html).
//   der/d'r = masculine article, dä only for emphasis, de = feminine and plural, et = neuter;
//   do küss / hä kütt, bränge, ich hann, es, emmer. Klüngel Tom keeps his stiff Hochdeutsch ('Ich habe').
// Each rule is a slip a play-tester found; the test fails when one comes back.
const path = require('path');
const { gameStrings } = require('./helpers');

const END = '(?![A-Za-zÄÖÜäöüß])'; // \b does not see umlauts and ß
const FEMININE = '(?:[A-Za-zÄÖÜäöüß-]*?(?:stroß|strooß|bröck|brück|gass|ampel|kurv|bahn|muur|kirch|werft|wiss|mess|pooz|stadt|sick|platte|linie|theke|kneip|schicht|session)|eck|kass|kripo|dür|tür|zülpicher|venloer|aachener)(?:e|n)?';
const RULES = [
  { re: new RegExp(`(?:^|[^A-Za-zÄÖÜäöüß])(?:op|an|en|vum|zom|zor|vun|met|us|bei|hinger|unger|üvver|för|vür|vör|vor|durch|noh|nevve)\\s+dä\\s+${FEMININE}${END}`, 'i'), why: "dä before a feminine noun after a preposition: op d'r / op der Stroß" },
  { re: new RegExp(`(?:^|[^A-Za-zÄÖÜäöüß])de (?:Rhing|Motor|Hafen?|Erzbischof|Looping|Pokal)${END}`, 'i'), why: "masculine noun with de: der Rhing, der Motor, der Hafe" },
  { re: /\bDu kütts\b|\bkütts\b/i, why: 'second person is küss: do küss' },
  { re: /\bIch hab /i, why: "ich hann (Klüngel Tom says 'Ich habe')" },
  { re: /Kellner/, why: 'in Kölle he is dä Köbes' },
  { re: /\bGrantig\b/i, why: 'the Köbes is brummelig' },
  { re: /\bbring(?:k|t|e)?\b/i, why: 'bränge: ich bränge, hä brängk, bräng et!' },
  { re: /\bKein Ampel\b/i, why: 'kei Ampel (feminine)' },
  { re: /\bDräi\b/i, why: 'drei' },
  { re: /noch i[m]mer jot/i, why: 'Kölsches Grundgesetz § 3: Et hätt noch emmer jot jejange' },
  { re: /\bet Pokal\b|\bder Hantel\b|Der jecke Herz|\bder linke Auge\b/i, why: 'wrong gender: der Pokal, de Hantel, et Hätz, et Aug' }
];

module.exports = async function () {
  const lines = [], hits = [], strings = gameStrings();
  for (const s of strings) for (const r of RULES) if (r.re.test(s.text)) hits.push(`${s.file}:${s.line} ${r.why}: "${s.text.slice(0, 100)}"`);
  // the rules must bite: each one has to flag its own bad example
  const bad = ['Op dä Hohenzollernbröck', 'an de Rhing', 'Du kütts hee nit rein', 'Ich hab dich', 'Der Kellner jewinnt', 'Grantig, schnell', 'Hä bringk Kölsch', 'Kein Ampel', 'Dräi Stunts', 'ET HÄTT NOCH ' + 'IMMER JOT JEJANGE', 'hät et Pokal'];
  const good = ["Op der Hohenzollernbröck", "an d'r Rhing", 'Do küss hee nit eren', 'Ich hann dich', 'Ich habe Sie gewinnen lassen.', 'Der Köbes jewinnt', 'Hä brängk Kölsch', 'Kei Ampel', 'Drei Stunts', 'Et hätt noch emmer jot jejange', 'Dä Lange verzällt', 'en Dä Schnelle'];
  bad.forEach((t, i) => { if (!RULES[i].re.test(t)) hits.push(`rule ${i} misses "${t}"`); });
  for (const t of good) for (const r of RULES) if (r.re.test(t)) hits.push(`rule flags good Kölsch "${t}" (${r.why})`);
  // Alaaf belongs to carnival tracks and wins, not to every loop
  const T = require(path.join(__dirname, '..', 'js', 'data.js')).GameData.TUENN;
  for (const t of T.loopOk) if (/Alaaf/i.test(t)) hits.push(`loopOk is said on every track, Alaaf only in loopJeck: "${t}"`);
  if (!(T.loopJeck || []).some((t) => /Alaaf/.test(t))) hits.push('loopJeck (carnival tracks) lost its Alaaf');
  // the marquee quote is the Grundgesetz, signed by Dä Lange
  const html = require('fs').readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  if (!/class="q">„ET HÄTT NOCH EMMER<br>JOT JEJANGE!“<span>– Kölsches Grundgesetz, § 3<\/span>/.test(html)) hits.push('index.html marquee: quote must be credited to the Kölsches Grundgesetz, § 3');
  lines.push(`${strings.length} strings checked against ${RULES.length} rules`);
  for (const h of hits.slice(0, 50)) lines.push(h);
  if (hits.length > 50) lines.push(`… ${hits.length - 50} more`);
  return { name: 'koelsch-lint', ok: !hits.length, lines };
};
