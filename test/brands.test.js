// Hard limit: no real brands, clubs, companies or bands in the game's texts. Every string literal in js/*.js
// and the visible text of index.html is checked against a denylist. The fictional stand-ins stay allowed:
// KVK (tram livery), DÄ SCHNELLE (newspaper), Krachkeller (Tango's club), LamboGina, Klüngelkasse.
const { gameStrings } = require('./helpers');

const DENY = [
  // transport, newspapers, energy, media, retail
  /\bKVB\b/, /\bKD\b/, /Köln-Düsseldorfer/i, /\bExpress\b/, /\bEXPRESS\b/, /Rhein-?Energie/i, /\bWDR\b/, /Kaufhof/, /\bGaleria\b/, /\bREWE\b/i,
  /Lanxess/i, /Telekom/i, /Lufthansa/i, /Stollwerck/i, /Haribo/i, /\bFord\b/, /Mercedes/i, /\bBenz\b/, /Porsche/i, /Ferrari/i, /Lamborghini/i,
  /\bOpel\b/, /Volkswagen/i, /\bBMW\b/, /\bAudi\b/, /\bHyatt\b/, /\bKHD\b/, /Klöckner/i, /Deutz AG/,
  // football and sports clubs
  /1\.\s?FC\b/, /FC Köln/i, /Effzeh/i, /Fortuna Köln/i, /Viktoria Köln/i, /Kölner Haie/i, /\bKEC\b/, /Bayer 04/, /Borussia/i, /Schalke/i,
  // real clubs and venues that are businesses
  /\bLuxor\b/i, /\bUnderground\b/, /Odonien/, /Artheater/i, /Gebäude 9/, /Bootshaus Deutz/i, /Gloria-?Theater/i,
  // breweries and brewery taps
  /Früh Kölsch|Früh am Dom|Cölner Hofbräu/, /Gaffel/i, /Reissdorf/i, /\bSion\b/, /Päffgen/i, /Malzmühle/i, /Mühlen Kölsch/i, /Sünner/i, /\bGilden\b/i,
  /Küppers/i, /Peters Kölsch/i, /Schreckenskammer/i, /\bHellers\b/i, /Dom Kölsch/i, /Richmodis Kölsch/i, /Zunft Kölsch/i, /Brauhaus Quetsch/i,
  // carnival bands
  /Bläck Fööss/i, /Cat Ballou/i, /Kasalla/i, /Paveier/i, /Domstürmer/i, /\bBAP\b/
];

module.exports = async function () {
  const lines = [], hits = [], strings = gameStrings();
  for (const s of strings) for (const re of DENY) if (re.test(s.text)) hits.push(`${s.file}:${s.line} ${re} in "${s.text.slice(0, 90)}"`);
  // the check itself must see the texts: a known line of each kind has to be found
  const seen = (re) => strings.some((s) => re.test(s.text));
  const probe = [/BAHNGLEISE/, /Kölsches Grundgesetz/, /Dä Lange/].filter((re) => !seen(re)).map(String);
  lines.push(`${strings.length} strings checked against ${DENY.length} names`);
  if (probe.length) lines.push('string scan missed known texts: ' + probe.join(', '));
  for (const h of hits.slice(0, 40)) lines.push(h);
  return { name: 'brands', ok: !hits.length && !probe.length, lines };
};
