/* ============================================================
   STUNTS KÖLLE 4D — Data: tracks, cars, archetypes, quotes
   ============================================================ */
(function (root) {
  'use strict';

  // ---------------- CARS ----------------
  const CARS = [
    {
      id: 'capri', name: 'Ehrenfeld Capri', sub: 'Ford Capri, Baujahr Ehrenfeld',
      desc: 'Der Klassiker aus dem Kölner Ford-Werk. Ausgewogen, laut, rot.',
      color: 0xd62828, accel: 14, top: 62, brake: 30, grip: 1.0, steer: 1.0, shape: 'coupe'
    },
    {
      id: 'kranz', name: 'Kranz-Kart', sub: 'Kölschkranz auf Rädern',
      desc: 'Zwölf Stangen Kölsch als Spoiler. Geht ab wie Schmitz\' Katz, aber der Top-Speed is\' bei 0,2 Liter Schluss.',
      color: 0xf4c430, accel: 22, top: 50, brake: 34, grip: 1.15, steer: 1.25, shape: 'kart'
    },
    {
      id: 'kluengel', name: 'Klüngel-Limousine', sub: 'Chicago am Rhein, 1928',
      desc: 'Schwarz, lang, tiefergelegt. Beschleunigt wie ein Ratsbeschluss, aber wenn se läuft, läuft se.',
      color: 0x111111, accel: 9, top: 78, brake: 22, grip: 0.85, steer: 0.8, shape: 'limo'
    },
    {
      id: 'kvb', name: 'KVB Linie 1', sub: 'Schienenersatzverkehr',
      desc: 'Fährt nie pünktlich, aber wer im Weg steht, wird Teil des Fahrplans. Bremst schlecht, hält alles aus.',
      color: 0xe30613, accel: 8, top: 55, brake: 18, grip: 1.3, steer: 0.6, shape: 'tram', heavy: true
    },
    {
      id: 'taxi', name: 'Chicago-Taxi', sub: 'Hellelfenbein, 1,2 Mio km',
      desc: 'Kennt jede Abkürzung zwischen Chorweiler und Porz. Bremse quietscht, Taxameter läuft.',
      color: 0xf2e6b1, accel: 13, top: 60, brake: 32, grip: 1.05, steer: 1.1, shape: 'sedan'
    },
    {
      id: 'wagen', name: 'Karnevalswagen', sub: 'Rosenmontagszoch Spezial',
      desc: 'Kamelle-Kanone, Konfetti-Auspuff. Kurven sind ein Gerücht, aber Alaaf!',
      color: 0xff5fa2, accel: 10, top: 52, brake: 20, grip: 0.9, steer: 0.7, shape: 'float', heavy: true
    }
  ];

  // ---------------- ARCHETYPES (rivals) ----------------
  const RIVALS = [
    {
      id: 'tuenn', name: 'Der Lange Tünn', emoji: '🎩', home: 'Altstadt',
      tag: 'Boss von Chicago am Rhein',
      desc: 'Zwei Meter zehn, Hut, Zigarre, Kölsch. Ihm gehört die halbe Stadt und die ganze Rennstrecke.',
      skill: 0.97, wobble: 0.15, color: 0x111111, car: 'kluengel',
      lines: {
        start: ['Jung, dat is ming Stadt. Un ming Rennstreck.', 'Chicago am Rhein, Jung. Hee jilt nur eins: schneller sin.'],
        overtake: ['Du fährs wie en Ratssitzung: lang un ohne Ergebnis.', 'Ich schick dir de Rechnung för de Bremsspur.'],
        overtaken: ['Dat wor Klüngel, dat zählt nit!', 'Jenieß et, Jung. Dat hält nit lang.'],
        crash: ['Et hätt noch immer jot jejange. Bes jetz.', 'Ich kenn ne juten Blechschmied. Ming Schwager.'],
        win: ['Wie immer. Der Lange Tünn verliert nit in singer Stadt.', 'Kumm, ich jeb dir ene us. Zum Tröste.'],
        lose: ['Dat wor Zufall. Ich hatt den Zylinder im Auge.', 'Jut. Du kriss en Job. Fahrer. Bei mir.']
      }
    },
    {
      id: 'koebes', name: 'Köbes Hermann', emoji: '🍺', home: 'Altstadt',
      tag: 'Brauhaus-Kellner',
      desc: 'Grantig, schnell, bringt ungefragt Nachschub. Fährt einen Lieferwagen voll Kölsch.',
      skill: 0.9, wobble: 0.35, color: 0x3a6ea5, car: 'kranz',
      lines: {
        start: ['Wat willste? Kölsch oder Pokal?', 'Trink doch ene met. Nach dem Rennen.'],
        overtake: ['Ich bring dir jleich ene Kranz Rückspiejel.', 'Dat is kein Bier, dat is Beschleunigung.'],
        overtaken: ['Do verdiens dir keine Deckel bei mir.', 'Ich hab noch drei Tische. Wart ab.'],
        crash: ['Einer jeht noch. Einer jeht noch rein.', 'Dat jibt Bierdeckel-Striche för dich.'],
        win: ['Der Kellner jewinnt. Trinkgeld optional.', 'Dat macht 23,50. Plus Sieg.'],
        lose: ['Ich wor nur Deckel holen.', 'Bei mir jab et Stau am Tresen.']
      }
    },
    {
      id: 'oma', name: 'Oma Käthe', emoji: '👵', home: 'Nippes',
      tag: 'Kölsche Oma',
      desc: 'Seit 1961 ohne Führerschein unterwegs. Der Kadett hat mehr Kilometer als die KVB.',
      skill: 0.8, wobble: 0.6, color: 0x7fb069, car: 'taxi',
      lines: {
        start: ['Ich fahr seit 1961 ohne Führerschein, Jung.', 'Wat is dat för ne Lärm? Ach so, ming Auto.'],
        overtake: ['Ming Rollator hät mieh PS als du.', 'Hasse Hunger? Ich hab Rievkooche im Handschuhfach.'],
        overtaken: ['Nit so wild, Jung. Ich hab Zeit.', 'Früher wor hee alles Wiese.'],
        crash: ['Dat hät der Opa och immer jemaat.', 'Kein Wunder, bei dä Straßen.'],
        win: ['Ja wat, dat wor doch nur ne Spazierfahrt.', 'Un jetz jibt et Kaffee un Tünn-Kuchen.'],
        lose: ['Dat wor ming Einparkrunde.', 'Nächste Woche fahr ich wieder. Zum Aldi.']
      }
    },
    {
      id: 'fcfan', name: 'FC-Andi', emoji: '🐐', home: 'Müngersdorf',
      tag: 'Effzeh-Ultra',
      desc: 'Rot-weißer Schal am Rückspiegel, Hennes-Aufkleber auf der Haube. Abstiegsangst als Antrieb.',
      skill: 0.88, wobble: 0.5, color: 0xffffff, car: 'capri',
      lines: {
        start: ['Mer stonn zo dir, FC Kölle! Un zo minger Karre!', 'Hennes hät jesaat: ich jewinn.'],
        overtake: ['Zweite Liga, Jung, zweite Liga!', 'Dat is wie jejen Gladbach: du hass keine Chance.'],
        overtaken: ['Schiri! Abseits!', 'Dat wor Foul, dat hät der VAR jesehn!'],
        crash: ['Typisch. Wie beim Effzeh in der Nachspielzeit.', 'Trainerwechsel! Sofort!'],
        win: ['Aufstieg! Feiern in der Südkurve!', 'Kölle Alaaf, FC Kölle, drei Punkte!'],
        lose: ['Wir kommen wieder, keine Frage.', 'Immerhin nit abjestiegen.']
      }
    },
    {
      id: 'finn', name: 'Ehrenfeld-Finn', emoji: '🧔', home: 'Ehrenfeld',
      tag: 'Hipster mit Lastenrad-Ersatz',
      desc: 'Fährt nur Auto, weil das Lastenrad in der Werkstatt ist. Hafermilch im Kühler, Podcast läuft.',
      skill: 0.85, wobble: 0.4, color: 0x9b5de5, car: 'kranz',
      lines: {
        start: ['Fahr ich nur, weil mein Lastenrad in der Werkstatt ist.', 'Ehrenfeld ist das neue Belgische Viertel. Und ich das neue Vettel.'],
        overtake: ['Das war eine bewusste Entschleunigung deinerseits, oder?', 'Ich überhole nur klimaneutral.'],
        overtaken: ['Okay, Boomer-Move.', 'Ich fahr halt achtsam.'],
        crash: ['Das ist ein Pop-up-Unfall. Sehr temporär.', 'Kein Problem, ich hab eine Versicherung auf Vinyl.'],
        win: ['Erster! Das kommt in meinen Podcast.', 'Sieg, aber ohne Stolz. Stolz ist so 2019.'],
        lose: ['Ich wollt nicht gewinnen. Gewinnen ist Kapitalismus.', 'Beim nächsten Mal mit Rad.']
      }
    },
    {
      id: 'jupp', name: 'Karnevalsjeck Jupp', emoji: '🤡', home: 'Südstadt',
      tag: 'Drei Tage wach',
      desc: 'Seit Weiberfastnacht nicht geschlafen. Fährt den Karnevalswagen wie einen Zoch mit Motor.',
      skill: 0.84, wobble: 0.8, color: 0xff5fa2, car: 'wagen',
      lines: {
        start: ['ALAAF!!!', 'Drei Tage wach, jetzt Rennen. Kamelle!!!'],
        overtake: ['Kamelle! Strüßjer! Überholt!', 'Do bes ne Bützje wert, Jung!'],
        overtaken: ['Wo is der Zoch hin?', 'Ich hab mich verfahren, wo is Severinstor?'],
        crash: ['Dat wor kein Unfall, dat wor ne Zochstopp.', 'Alles jot, ich hab Konfetti im Airbag.'],
        win: ['Alaaf! Un jetz weiter zum Tanzbrunnen!', 'Der Jeck jewinnt! Rosenmontag för immer!'],
        lose: ['Aschermittwoch is alles vorbei.', 'Ich fahr nochmal. Nach dem Dom-Kölsch.']
      }
    },
    {
      id: 'ali', name: 'Taxi-Ali', emoji: '🚕', home: 'Kalk',
      tag: 'Chicago-Taxi Veteran',
      desc: '30 Jahre Nachtschicht in Chicago am Rhein. Zoobrücke gesperrt? Er kennt drei Abkürzungen.',
      skill: 0.93, wobble: 0.25, color: 0xf2e6b1, car: 'taxi',
      lines: {
        start: ['Zoobrücke gesperrt, ich kenn ne Abkürzung.', 'Chicago am Rhein? Ich fahr da seit 30 Jahren, Kollege.'],
        overtake: ['Taxameter läuft, Kollege.', 'Kurzstrecke. Sieben Euro.'],
        overtaken: ['Nachtzuschlag kommt noch dazu.', 'Ich lass dich vor. Trinkgeld?'],
        crash: ['Das war der Fahrgast, nicht ich.', 'Kein Problem, Bruder, alles Blech.'],
        win: ['Ziel erreicht. Zahlen bitte.', 'Sieg. Und die Rückfahrt kostet extra.'],
        lose: ['Ich hatte noch Fahrgast drin.', 'Nächstes Mal ohne Taxameter.']
      }
    },
    {
      id: 'klaus', name: 'Klüngel-Klaus', emoji: '🤝', home: 'Rathaus',
      tag: 'Man kennt sich, man hilft sich',
      desc: 'Ratsherr, Aufsichtsrat, Karnevalsprinz a.D. Die Pole Position hatte er schon vor dem Rennen.',
      skill: 0.91, wobble: 0.2, color: 0x444444, car: 'kluengel',
      lines: {
        start: ['Man kennt sich, man hilft sich.', 'Die Pole Position hab ich schon vorm Rennen gewonnen.'],
        overtake: ['Das wurde im Ausschuss so beschlossen.', 'Nicht persönlich nehmen. Rein geschäftlich.'],
        overtaken: ['Dazu gibt es einen Untersuchungsausschuss.', 'Das Protokoll wird angepasst.'],
        crash: ['Das war ein Bauprojekt. Wie die Oper.', 'Wir haben das Ergebnis schon vorher gekannt.'],
        win: ['Wie vereinbart. Danke, Tünn.', 'Ein Sieg für die Stadt. Also für mich.'],
        lose: ['Wir lassen das Ergebnis prüfen.', 'Die Kosten für dieses Rennen explodieren übrigens.']
      }
    },
    {
      id: 'schael', name: 'Schäl', emoji: '👀', home: 'Hänneschen-Theater',
      tag: 'Tünnes\' schielender Kumpel',
      desc: 'Guckt schäl, fährt gerade. Meistens. Hat dem Langen Tünn schon oft die Schlüssel geklaut.',
      skill: 0.87, wobble: 0.55, color: 0x2d6a4f, car: 'capri',
      lines: {
        start: ['Tünnes, du bes zo lang för dat Auto.', 'Ich guck schäl, aber ich fahr jerade.'],
        overtake: ['Do hab ich jar nit hinjeguckt.', 'Links oder rechts, för mich is dat ejal.'],
        overtaken: ['Dat wor ne optische Täuschung.', 'Ich seh zwei von dir. Un beide sin langsam.'],
        crash: ['Wor dat de Wand oder de Rhing?', 'Ich hab de Kurve doppelt jesehn.'],
        win: ['Hänneschen, mer han jewonne!', 'Schäl jewinnt. Tünnes zahlt.'],
        lose: ['Ich hab de Ziellinie zweimal jesehn un die falsche jenomme.', 'Nächstes Mol mit Brille.']
      }
    }
  ];

  // ---------------- TRACKS ----------------
  // All angles: + = left. Distances in metres. Each track closes on itself.
  const TRACKS = [
    {
      id: 'dom', name: 'Domplatte-Runde', district: 'Altstadt / Deutz',
      diff: 1, laps: 3, scale: 1.45,
      desc: 'Über die Domplatte, am Hbf und Museum Ludwig vorbei, durch die Altstadt an Groß St. Martin, über die Hohenzollernbrücke nach Deutz und zurück. Einsteigerfreundlich. Tauben inklusive.',
      theme: { sky: 0x6fb2ff, fog: 0xcfe4ff, ground: 0xb9b0a2, sun: 0xfff2d0, road: [0x6a6a70, 0x5c5c62], night: false, water: 0x3f7fc0, street: 'altstadt',
        streets: ['HOHE STRASSE', 'AM HOF', 'TRANKGASSE', 'UNTER FETTENHENNEN', 'FRANKENWERFT', 'DEUTZER FREIHEIT', 'ALTER MARKT', 'HEUMARKT'],
        shops: ['BRAUHAUS', 'HALVE HAHN', 'RIEVKOOCHE', 'EAU DE COLOGNE', 'KÖLSCH', 'FC FANSHOP', 'DOM-SOUVENIRS'],
        far: [{ type: 'colonius', angle: 200, dist: 260 }, { type: 'triangle', angle: 20, dist: 80 }, { type: 'archbridge', angle: 300, dist: 60 }, { type: 'flatbridge', angle: 330, dist: 80 }] },
      // seg: 0 start straight, 1 L, 2 str, 3 hill, 4 str, 5 L, 6 str, 7 R, 8 str, 9 L, 10 bridge, 11 L, 12 str, 13 L, 14 str
      segments: [
        { t: 'straight', len: 140 },
        { t: 'curve', angle: 90, r: 45 },
        { t: 'straight', len: 60 },
        { t: 'hill', len: 70, pitch: 12 },
        { t: 'straight', len: 40 },
        { t: 'curve', angle: 90, r: 45, bank: 10 },
        { t: 'straight', len: 80 },
        { t: 'curve', angle: -90, r: 35 },
        { t: 'straight', len: 50 },
        { t: 'curve', angle: 90, r: 35 },
        { t: 'bridge', len: 160 },
        { t: 'curve', angle: 90, r: 50, bank: 12 },
        { t: 'straight', len: 90 },
        { t: 'curve', angle: 90, r: 50, bank: 12 },
        { t: 'straight', len: 80 }
      ],
      props: [
        { type: 'tuenn', seg: 0, u: 0.02, side: 1, dist: 9 },
        { type: 'schael', seg: 0, u: 0.02, side: -1, dist: 9 },
        { type: 'crowd', seg: 0, u: 0.06, side: 1, dist: 10 },
        { type: 'crowd', seg: 0, u: 0.06, side: -1, dist: 10 },
        { type: 'dom', seg: 0, u: 0.5, side: -1, dist: 78, keep: 120 },
        { type: 'hbf', seg: 1, u: 0.5, side: -1, dist: 95, keep: 90 },
        { type: 'museum', seg: 0, u: 0.85, side: 1, dist: 42 },
        { type: 'musicaldome', seg: 2, u: 0.3, side: 1, dist: 70 },
        { type: 'stmartin', seg: 4, u: 0.5, side: -1, dist: 48, keep: 70 },
        { type: 'altstadt', seg: 3, u: 0.5, side: 1, dist: 24, seed: 3, n: 8 },
        { type: 'altstadt', seg: 6, u: 0.4, side: -1, dist: 24, seed: 8, n: 8 },
        { type: 'buedchen', seg: 6, u: 0.8, side: 1, dist: 11 },
        { type: 'haltestelle', seg: 8, u: 0.4, side: 1, dist: 10 },
        { type: 'tram', seg: 8, u: 0.7, side: 1, dist: 12 },
        { type: 'billboard', seg: 2, u: 0.7, side: -1, dist: 14, text: 'TÜNN KÖLSCH – ET LÄUFT' },
        { type: 'rgm', seg: 0, u: 0.7, side: -1, dist: 40, keep: 60 },
        { type: 'eaudecologne', seg: 2, u: 0.75, side: -1, dist: 28, keep: 40 },
        { type: 'rathaus', seg: 4, u: 0.5, side: 1, dist: 42, keep: 70 },
        { type: 'reiter', seg: 6, u: 0.15, side: -1, dist: 16 },
        { type: 'cafe', seg: 3, u: 0.2, side: 1, dist: 13 },
        { type: 'cafe', seg: 6, u: 0.55, side: -1, dist: 13 },
        { type: 'tramline', seg: 0, u: 0.5, side: -1, dist: 14, len: 180, face: false },
        { type: 'rhineSide', seg: 6, u: 0.5, side: 1, dist: 170, l: 700, w: 240 },
        { type: 'promenade', seg: 6, u: 0.5, side: 1, dist: 44 },
        { type: 'rhine', seg: 10, u: 0.5, side: 0, dist: 0 },
        { type: 'hbarch', seg: 10, u: 0.5, side: 0, dist: 0 },
        { type: 'boat', seg: 10, u: 0.3, side: 1, dist: 60 },
        { type: 'barge', seg: 10, u: 0.7, side: -1, dist: 70 },
        { type: 'triangle', seg: 11, u: 0.6, side: -1, dist: 75, keep: 60 },
        { type: 'hyatt', seg: 11, u: 0.9, side: -1, dist: 60, keep: 50 },
        { type: 'messeturm', seg: 12, u: 0.5, side: 1, dist: 70 },
        { type: 'tanzbrunnen', seg: 12, u: 0.15, side: -1, dist: 45, keep: 40 },
        { type: 'tramline', seg: 12, u: 0.5, side: 1, dist: 14, len: 120, face: false },
        { type: 'row', seg: 12, u: 0.3, side: -1, dist: 24, style: 'concrete', seed: 4, n: 5 },
        { type: 'koelsch', seg: 12, u: 0.9, side: 1, dist: 18 },
        { type: 'billboard', seg: 14, u: 0.3, side: -1, dist: 14, text: 'CHICAGO AM RHEIN – MAN KENNT SICH' },
        { type: 'flag', seg: 14, u: 0.6, side: 1, dist: 9 }
      ]
    },
    {
      id: 'rheinauhafen', name: 'Rheinufer-Sprung', district: 'Rheinauhafen / Südstadt',
      diff: 2, laps: 3, scale: 1.45,
      desc: 'Volle Pulle die Rheinuferstraße runter, Sprung über das Hafenbecken zwischen den Kranhäusern, Schokoladenmuseum, Severinsbrücke, dann durch die Südstadt zurück. Wer zu kurz springt, badet im Rhing.',
      theme: { sky: 0xf0a070, fog: 0xe6cbb4, ground: 0x8f9088, sun: 0xffd7a0, road: [0x5f5a5a, 0x514c4c], night: false, sunset: true, water: 0x3f6f9f, street: 'modern',
        streets: ['RHEINUFERSTR.', 'IM ZOLLHAFEN', 'AGRIPPINAWERFT', 'BAYENSTRASSE', 'HOLZMARKT', 'SEVERINSTRASSE', 'CHLODWIGPLATZ'],
        shops: ['HAFENBAR', 'SCHOKOLADE', 'CAFÉ AM HAFEN', 'KÖLSCH', 'SUSHI', 'GALERIE', 'YACHTSERVICE'],
        far: [{ type: 'dom', angle: 100, dist: 160 }, { type: 'colonius', angle: 140, dist: 200 }, { type: 'archbridge', angle: 60, dist: 40 }, { type: 'stmartin', angle: 90, dist: 120 }] },
      // 0 str,1 R,2 str,3 jump,4 str,5 R,6 str,7 L,8 str,9 R,10 hill,11 str,12 R,13 str,14 jump,15 str,16 R,17 str
      segments: [
        { t: 'straight', len: 120 },
        { t: 'curve', angle: -90, r: 40 },
        { t: 'straight', len: 40 },
        { t: 'jump', ramp: 30, angle: 16, gap: 32 },
        { t: 'straight', len: 60 },
        { t: 'curve', angle: -90, r: 40, bank: 10 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: 90, r: 30 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: -90, r: 30 },
        { t: 'hill', len: 60, pitch: 14 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: -90, r: 40, bank: 12 },
        { t: 'straight', len: 45 },
        { t: 'jump', ramp: 24, angle: 14, gap: 24 },
        { t: 'straight', len: 60 },
        { t: 'curve', angle: -90, r: 40 },
        { t: 'straight', len: 12 }
      ],
      props: [
        { type: 'tuenn', seg: 0, u: 0.02, side: 1, dist: 9 },
        { type: 'crowd', seg: 0, u: 0.06, side: -1, dist: 10 },
        { type: 'kranhaus', seg: 0, u: 0.3, side: 1, dist: 42, keep: 40 },
        { type: 'kranhaus', seg: 0, u: 0.55, side: 1, dist: 42, keep: 40 },
        { type: 'kranhaus', seg: 0, u: 0.8, side: 1, dist: 42, keep: 40 },
        { type: 'rhineSide', seg: 0, u: 0.25, side: 1, dist: 200, l: 300, w: 280 },
        { type: 'promenade', seg: 0, u: 0.4, side: 1, dist: 62 },
        { type: 'barge', seg: 0, u: 0.4, side: 1, dist: 120 },
        { type: 'boat', seg: 0, u: 0.9, side: 1, dist: 100 },
        { type: 'rhine', seg: 3, u: 0.55, side: 0, dist: 0 },
        { type: 'boat', seg: 3, u: 0.5, side: 1, dist: 45 },
        { type: 'schoko', seg: 4, u: 0.5, side: 1, dist: 40, keep: 50 },
        { type: 'severinsbruecke', seg: 4, u: 0.9, side: 1, dist: 150, face: false },
        { type: 'billboard', seg: 6, u: 0.5, side: 1, dist: 14, text: 'HALVE HAHN GRILL – SEIT 1928' },
        { type: 'severinstor', seg: 8, u: 0.5, side: 1, dist: 30 },
        { type: 'kirche', seg: 9, u: 0.5, side: -1, dist: 40, h: 45, color: 0xb9a184 },
        { type: 'row', seg: 11, u: 0.5, side: -1, dist: 24, style: 'gruenderzeit', seed: 12, n: 5 },
        { type: 'tramline', seg: 11, u: 0.5, side: 1, dist: 14, len: 90, face: false },
        { type: 'cafe', seg: 10, u: 0.8, side: 1, dist: 13 },
        { type: 'buedchen', seg: 11, u: 0.2, side: 1, dist: 11 },
        { type: 'koelsch', seg: 13, u: 0.5, side: -1, dist: 18 },
        { type: 'rhine', seg: 14, u: 0.55, side: 0, dist: 0 },
        { type: 'barge', seg: 14, u: 0.5, side: -1, dist: 60 },
        { type: 'row', seg: 15, u: 0.5, side: -1, dist: 24, style: 'modern', seed: 2, n: 4 },
        { type: 'billboard', seg: 15, u: 0.8, side: 1, dist: 14, text: 'LANGE TÜNN – KÖLSCH & KREDIT' },
        { type: 'haltestelle', seg: 17, u: 0.4, side: -1, dist: 10 }
      ]
    },
    {
      id: 'zoo', name: 'Zoobrücke-Looping', district: 'Riehl / Mülheim',
      diff: 3, laps: 3, scale: 1.45,
      desc: 'Durch den Rheinpark, Looping an der Flora, über die Zoobrücke unter der Seilbahn durch, Mülheimer Brücke im Blick, zurück am Zoo vorbei. Nicht bremsen im Looping, sonst fällst du auf die Elefanten.',
      theme: { sky: 0x5fa8ff, fog: 0xcfe6ff, ground: 0x5e9a4a, sun: 0xffffff, road: [0x585858, 0x4a4a4a], night: false, water: 0x3f7fc0, street: 'park',
        streets: ['RIEHLER STRASSE', 'ZOOBRÜCKE', 'AUENWEG', 'MÜLHEIMER FREIHEIT', 'AM BOTANISCHEN GARTEN'],
        far: [{ type: 'dom', angle: 230, dist: 140 }, { type: 'colonius', angle: 260, dist: 220 }, { type: 'triangle', angle: 210, dist: 80 }, { type: 'flatbridge', angle: 180, dist: 60 }] },
      // 0 str,1 L,2 str,3 loop,4 str,5 L,6 bridge,7 R,8 str,9 L,10 hill,11 L,12 str,13 R,14 str,15 L,16 str,17 L,18 str
      segments: [
        { t: 'straight', len: 150 },
        { t: 'curve', angle: 90, r: 50, bank: 15 },
        { t: 'straight', len: 50 },
        { t: 'loop', r: 14, shift: 14 },
        { t: 'straight', len: 60 },
        { t: 'curve', angle: 90, r: 40 },
        { t: 'bridge', len: 130 },
        { t: 'curve', angle: -90, r: 35 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: 90, r: 35 },
        { t: 'hill', len: 60, pitch: 16 },
        { t: 'curve', angle: 90, r: 45, bank: 15 },
        { t: 'straight', len: 100 },
        { t: 'curve', angle: -90, r: 30 },
        { t: 'straight', len: 20 },
        { t: 'curve', angle: 90, r: 30 },
        { t: 'straight', len: 20 },
        { t: 'curve', angle: 90, r: 30 },
        { t: 'straight', len: 30 }
      ],
      props: [
        { type: 'tuenn', seg: 0, u: 0.02, side: -1, dist: 9 },
        { type: 'zootor', seg: 0, u: 0.22, side: 1, dist: 18, keep: 40 },
        { type: 'giraffe', seg: 0, u: 0.32, side: 1, dist: 30 },
        { type: 'elephant', seg: 0, u: 0.4, side: 1, dist: 26 },
        { type: 'elephant', seg: 0, u: 0.5, side: 1, dist: 34 },
        { type: 'elephant', seg: 0, u: 0.6, side: 1, dist: 24 },
        { type: 'row', seg: 0, u: 0.7, side: -1, dist: 26, style: 'gruenderzeit', seed: 5, n: 4 },
        { type: 'flora', seg: 2, u: 0.5, side: -1, dist: 40, keep: 50 },
        { type: 'crowd', seg: 4, u: 0.3, side: 1, dist: 12 },
        { type: 'rhine', seg: 6, u: 0.5, side: 0, dist: 0 },
        { type: 'seilbahn', seg: 6, u: 0.15, side: 0, dist: 0 },
        { type: 'suspension', seg: 6, u: 0.5, side: 1, dist: 170, face: false },
        { type: 'boat', seg: 6, u: 0.35, side: -1, dist: 50 },
        { type: 'barge', seg: 6, u: 0.7, side: 1, dist: 70 },
        { type: 'messeturm', seg: 8, u: 0.5, side: -1, dist: 60 },
        { type: 'tanzbrunnen', seg: 7, u: 0.5, side: 1, dist: 50, keep: 40 },
        { type: 'kirche', seg: 12, u: 0.2, side: -1, dist: 50, h: 32 },
        { type: 'koelsch', seg: 12, u: 0.3, side: 1, dist: 20 },
        { type: 'billboard', seg: 12, u: 0.7, side: -1, dist: 14, text: 'MÜLHEIM – HEE FÄNGT DER OSTEN AN' },
        { type: 'row', seg: 12, u: 0.6, side: 1, dist: 26, style: 'concrete', seed: 7, n: 5 },
        { type: 'buedchen', seg: 16, u: 0.5, side: -1, dist: 11 },
        { type: 'crowd', seg: 18, u: 0.5, side: 1, dist: 10 }
      ]
    },
    {
      id: 'ehrenfeld', name: 'Ehrenfelder Haken', district: 'Ehrenfeld',
      diff: 2, laps: 3, scale: 1.45,
      desc: 'Enge Haken durch die Venloer Straße, an den Bahnbögen und dem Colonius vorbei, Helios-Leuchtturm, Graffiti, Lastenräder, Büdchen. Die Hipster winken, der Lange Tünn kassiert.',
      theme: { sky: 0x9fbfe0, fog: 0xd8e2ea, ground: 0x8a8a84, sun: 0xfff6e0, road: [0x4e4e4e, 0x424242], night: false, water: 0x3f7fc0, street: 'gruenderzeit',
        streets: ['VENLOER STRASSE', 'KÖRNERSTRASSE', 'SUBBELRATHER STR.', 'VOGELSANGER STR.', 'EHRENFELDGÜRTEL', 'HELIOSSTRASSE', 'LEYENDECKERSTR.'],
        shops: ['DÖNER', 'CAFÉ HAFERMILCH', 'PLATTENLADEN', 'BARBIER', 'LASTENRAD-VERLEIH', 'KIOSK', 'FALAFEL', 'TATTOO', 'BÜDCHE'],
        far: [{ type: 'dom', angle: 30, dist: 200 }, { type: 'triangle', angle: 15, dist: 300 }] },
      // 0 str,1 R,2 str,3 L,4 str,5 L,6 str,7 R,8 hill,9 R,10 str,11 R,12 str,13 L,14 str,15 R,16 tunnel,17 R,18 str,19 R,20 str
      segments: [
        { t: 'straight', len: 90 },
        { t: 'curve', angle: -90, r: 25 },
        { t: 'straight', len: 20 },
        { t: 'curve', angle: 90, r: 25 },
        { t: 'straight', len: 20 },
        { t: 'curve', angle: 90, r: 25 },
        { t: 'straight', len: 20 },
        { t: 'curve', angle: -90, r: 25 },
        { t: 'hill', len: 50, pitch: 12 },
        { t: 'curve', angle: -90, r: 30, bank: 8 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: -90, r: 30, bank: 8 },
        { t: 'straight', len: 60 },
        { t: 'curve', angle: 90, r: 22 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: -90, r: 22 },
        { t: 'tunnel', len: 60 },
        { t: 'curve', angle: -90, r: 35, bank: 10 },
        { t: 'straight', len: 90 },
        { t: 'curve', angle: -90, r: 35, bank: 10 },
        { t: 'straight', len: 14 }
      ],
      props: [
        { type: 'tuenn', seg: 0, u: 0.02, side: 1, dist: 9 },
        { type: 'colonius', seg: 0, u: 0.5, side: -1, dist: 90, keep: 40 },
        { type: 'billboard', seg: 0, u: 0.25, side: 1, dist: 14, text: 'VENLOER STR. – HAFERMILCH TO GO' },
        { type: 'haltestelle', seg: 0, u: 0.6, side: 1, dist: 10 },
        { type: 'tram', seg: 0, u: 0.8, side: 1, dist: 12 },
        { type: 'graffiti', seg: 2, u: 0.5, side: 1, dist: 12, text: 'EHRENFELD' },
        { type: 'lastenrad', seg: 4, u: 0.5, side: 1, dist: 10 },
        { type: 'buedchen', seg: 6, u: 0.5, side: -1, dist: 11 },
        { type: 'viaduct', seg: 12, u: 0.5, side: 1, dist: 26, keep: 90 },
        { type: 'moschee', seg: 8, u: 0.5, side: 1, dist: 60, keep: 60 },
        { type: 'vulkanhalle', seg: 16, u: 0.5, side: -1, dist: 45, keep: 60 },
        { type: 'tramline', seg: 0, u: 0.5, side: -1, dist: 14, len: 120, face: false },
        { type: 'cafe', seg: 2, u: 0.5, side: -1, dist: 13 },
        { type: 'graffiti', seg: 10, u: 0.5, side: -1, dist: 12, text: 'CHICAGO AM RHEIN', color: '#00e5ff' },
        { type: 'row', seg: 12, u: 0.5, side: -1, dist: 24, style: 'industrial', seed: 21, n: 5 },
        { type: 'koelsch', seg: 14, u: 0.5, side: 1, dist: 18 },
        { type: 'lastenrad', seg: 14, u: 0.2, side: -1, dist: 10 },
        { type: 'helios', seg: 17, u: 0.5, side: 1, dist: 34 },
        { type: 'billboard', seg: 18, u: 0.3, side: 1, dist: 14, text: 'HELIOS-TURM – NUR ECHT MIT LEUCHTTURM' },
        { type: 'graffiti', seg: 18, u: 0.7, side: -1, dist: 12, text: 'TÜNN WAS HERE', color: '#7fff00' },
        { type: 'buedchen', seg: 18, u: 0.9, side: 1, dist: 11 },
        { type: 'crowd', seg: 20, u: 0.5, side: 1, dist: 10 }
      ]
    },
    {
      id: 'kalk', name: 'Kalker Klüngel-Nacht', district: 'Kalk / Deutz — Chicago am Rhein',
      diff: 4, laps: 3, scale: 1.45,
      desc: 'Nachts in Kalk. Neonlicht, Lanxess Arena, Messeturm, Chemiefabrik-Schlote, zwei Loopings und ein Sprung über die Gleise. Der Lange Tünn hat die Streckenposten bestochen.',
      theme: { sky: 0x0a1030, fog: 0x1c2448, ground: 0x2e3040, sun: 0x9fb4ff, road: [0x33363f, 0x2b2e37], night: true, water: 0x102040, street: 'industrial',
        streets: ['KALKER HAUPTSTR.', 'DEUTZER FREIHEIT', 'DILLENBURGER STR.', 'GOTTFRIED-HAGEN-STR.', 'KALK-MÜLHEIMER STR.', 'TRIMBORNSTRASSE'],
        shops: ['KALK-POST', 'SPÄTI', 'BILLARD', 'WETTBÜRO', 'KLÜNGEL-BAR', 'NACHTCAFÉ', 'CASINO', 'IMBISS', 'TÜNN’S SPEAKEASY'],
        far: [{ type: 'dom', angle: 200, dist: 220 }, { type: 'triangle', angle: 190, dist: 120 }, { type: 'colonius', angle: 215, dist: 300 }, { type: 'flatbridge', angle: 170, dist: 60 }] },
      // 0 str,1 L,2 str,3 loop,4 str,5 L,6 str,7 jump,8 str,9 R,10 str,11 L,12 loop,13 str,14 L,15 tunnel,16 L,17 str,18 R,19 str,20 L,21 str
      segments: [
        { t: 'straight', len: 130 },
        { t: 'curve', angle: 90, r: 40, bank: 12 },
        { t: 'straight', len: 30 },
        { t: 'loop', r: 13, shift: 14 },
        { t: 'straight', len: 40 },
        { t: 'curve', angle: 90, r: 40, bank: 12 },
        { t: 'straight', len: 30 },
        { t: 'jump', ramp: 28, angle: 15, gap: 28 },
        { t: 'straight', len: 40 },
        { t: 'curve', angle: -90, r: 30 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: 90, r: 30 },
        { t: 'loop', r: 13, shift: 14 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: 90, r: 45, bank: 15 },
        { t: 'tunnel', len: 80 },
        { t: 'curve', angle: 90, r: 45, bank: 15 },
        { t: 'straight', len: 40 },
        { t: 'curve', angle: -90, r: 30 },
        { t: 'straight', len: 30 },
        { t: 'curve', angle: 90, r: 30 },
        { t: 'straight', len: 35 }
      ],
      props: [
        { type: 'tuenn', seg: 0, u: 0.02, side: 1, dist: 9 },
        { type: 'neon', seg: 0, u: 0.1, side: -1, dist: 14, text: 'CHICAGO AM RHEIN', color: '#ff2d95' },
        { type: 'arena', seg: 0, u: 0.6, side: 1, dist: 85, keep: 70 },
        { type: 'messeturm', seg: 1, u: 0.5, side: -1, dist: 80 },
        { type: 'neon', seg: 0, u: 0.8, side: -1, dist: 14, text: 'TÜNN’S BAR – KÖLSCH & KREDIT', color: '#ffd400' },
        { type: 'gangster', seg: 0, u: 0.85, side: -1, dist: 9 },
        { type: 'gangster', seg: 0, u: 0.87, side: -1, dist: 11 },
        { type: 'chimney', seg: 4, u: 0.5, side: -1, dist: 50, keep: 70 },
        { type: 'halle', seg: 5, u: 0.5, side: 1, dist: 50, keep: 60, text: 'HALLEN KALK · CHEMIEFABRIK' },
        { type: 'kirche', seg: 9, u: 0.5, side: 1, dist: 45, h: 36, color: 0x8a7a6a },
        { type: 'tramline', seg: 17, u: 0.5, side: 1, dist: 14, len: 100, face: false },
        { type: 'rails', seg: 7, u: 0.55, side: 0, dist: 0 },
        { type: 'tram', seg: 8, u: 0.5, side: 1, dist: 14 },
        { type: 'neon', seg: 8, u: 0.6, side: -1, dist: 14, text: 'KLÜNGEL & SÖHNE – BAU · RAT · ZOCH', color: '#00e5ff' },
        { type: 'chimney', seg: 10, u: 0.5, side: 1, dist: 50, keep: 70 },
        { type: 'koelsch', seg: 13, u: 0.5, side: 1, dist: 20 },
        { type: 'neon', seg: 17, u: 0.5, side: 1, dist: 14, text: 'MAN KENNT SICH · MAN HILFT SICH', color: '#ff2d95' },
        { type: 'buedchen', seg: 17, u: 0.8, side: -1, dist: 11 },
        { type: 'gangster', seg: 19, u: 0.5, side: 1, dist: 9 },
        { type: 'neon', seg: 21, u: 0.4, side: -1, dist: 14, text: 'ET HÄTT NOCH IMMER JOT JEJANGE', color: '#7fff00', light: false },
        { type: 'crowd', seg: 21, u: 0.8, side: -1, dist: 10 }
      ]
    },
    {
      id: 'zoch', name: 'Rusenmondaach-Chaos', district: 'Severinsviertel / Neumarkt',
      diff: 3, laps: 3, scale: 1.45,
      desc: 'Der Zochweg als Rennstrecke: Chlodwigplatz, durchs Severinstor, die Severinstraße hoch, Hügel, Sprung, Konfetti, Kamelle. Alaaf! Die Bahn ist gesperrt, die Jecken nicht.',
      theme: { sky: 0x8fc0ff, fog: 0xffe6f5, ground: 0xb5ada0, sun: 0xfff0ff, road: [0x5a5a5a, 0x4c4c4c], night: false, water: 0x3f7fc0, confetti: true, street: 'gruenderzeit',
        streets: ['SEVERINSTRASSE', 'CHLODWIGPLATZ', 'NEUMARKT', 'SCHILDERGASSE', 'HOHE STRASSE', 'RUDOLFPLATZ', 'ZOCHWEG'],
        shops: ['KAMELLE', 'KOSTÜME', 'STRÜSSJER', 'KÖLSCH', 'BÜTZJE-BAR', 'FUNKENMARIECHEN', 'ALAAF-SHOP', 'BRAUHAUS'],
        far: [{ type: 'dom', angle: 80, dist: 160 }, { type: 'colonius', angle: 150, dist: 260 }] },
      // 0 str,1 hill,2 L,3 str,4 jump,5 str,6 L,7 hill,8 R,9 str,10 L,11 hill,12 L,13 str,14 R,15 dip,16 L,17 str,18 L,19 str
      segments: [
        { t: 'straight', len: 100 },
        { t: 'hill', len: 50, pitch: 14 },
        { t: 'curve', angle: 90, r: 40, bank: 10 },
        { t: 'straight', len: 30 },
        { t: 'jump', ramp: 26, angle: 15, gap: 26 },
        { t: 'straight', len: 40 },
        { t: 'curve', angle: 90, r: 40, bank: 10 },
        { t: 'hill', len: 50, pitch: 14 },
        { t: 'curve', angle: -90, r: 30 },
        { t: 'straight', len: 40 },
        { t: 'curve', angle: 90, r: 30 },
        { t: 'hill', len: 40, pitch: 12 },
        { t: 'curve', angle: 90, r: 30 },
        { t: 'straight', len: 40 },
        { t: 'curve', angle: -90, r: 30 },
        { t: 'dip', len: 40, pitch: 12 },
        { t: 'curve', angle: 90, r: 40, bank: 10 },
        { t: 'straight', len: 80 },
        { t: 'curve', angle: 90, r: 40, bank: 10 },
        { t: 'straight', len: 40 }
      ],
      props: [
        { type: 'tuenn', seg: 0, u: 0.02, side: 1, dist: 9 },
        { type: 'crowd', seg: 0, u: 0.15, side: -1, dist: 10 },
        { type: 'tribuene', seg: 0, u: 0.3, side: 1, dist: 12, keep: 30 },
        { type: 'zochwagen', seg: 0, u: 0.5, side: -1, dist: 13 },
        { type: 'tribuene', seg: 9, u: 0.3, side: -1, dist: 12, keep: 30 },
        { type: 'zochwagen', seg: 13, u: 0.6, side: 1, dist: 13 },
        { type: 'tribuene', seg: 17, u: 0.5, side: -1, dist: 12, keep: 30 },
        { type: 'kirche', seg: 8, u: 0.5, side: 1, dist: 45, h: 40 },
        { type: 'bunting', seg: 0, u: 0.4, side: 0, dist: 0 },
        { type: 'billboard', seg: 0, u: 0.6, side: -1, dist: 14, text: 'KÖLLE ALAAF – KAMELLE!' },
        { type: 'haltestelle', seg: 0, u: 0.8, side: 1, dist: 10 },
        { type: 'severinstor', seg: 3, u: 0.5, side: 0, dist: 0, face: false },
        { type: 'crowd', seg: 5, u: 0.4, side: 1, dist: 10 },
        { type: 'crowd', seg: 5, u: 0.7, side: -1, dist: 10 },
        { type: 'bunting', seg: 5, u: 0.55, side: 0, dist: 0 },
        { type: 'altstadt', seg: 9, u: 0.5, side: 1, dist: 24, seed: 11, n: 6 },
        { type: 'koelsch', seg: 9, u: 0.5, side: -1, dist: 18 },
        { type: 'bunting', seg: 9, u: 0.5, side: 0, dist: 0 },
        { type: 'billboard', seg: 13, u: 0.5, side: 1, dist: 14, text: 'D’R ZOCH KÜTT!' },
        { type: 'crowd', seg: 13, u: 0.3, side: -1, dist: 10 },
        { type: 'crowd', seg: 13, u: 0.7, side: 1, dist: 10 },
        { type: 'bunting', seg: 13, u: 0.5, side: 0, dist: 0 },
        { type: 'hahnentor', seg: 17, u: 0.5, side: 1, dist: 30 },
        { type: 'billboard', seg: 17, u: 0.3, side: -1, dist: 14, text: 'TÜNN KÖLSCH – DRINK DOCH ENE MET' },
        { type: 'bunting', seg: 17, u: 0.7, side: 0, dist: 0 },
        { type: 'crowd', seg: 17, u: 0.8, side: 1, dist: 10 },
        { type: 'crowd', seg: 19, u: 0.5, side: -1, dist: 10 },
        { type: 'bunting', seg: 19, u: 0.4, side: 0, dist: 0 }
      ]
    }
  ];

  // ---------------- LANGE TÜNN commentary (host) ----------------
  const TUENN = {
    name: 'Der Lange Tünn', emoji: '🎩',
    intro: [
      'Willkomme in Chicago am Rhein, Jung. Hee jilt nur eins: schneller sin als ich.',
      'Ich bin der Lange Tünn. Mir jehört die Streck, der Asphalt un dat Kölsch danach.',
      'Reejel Nummer eins: Et hätt noch immer jot jejange. Reejel Nummer zwei: meistens.'
    ],
    countdown: ['Drei…', 'Zwei…', 'Eins…', 'FOTT DOMET!'],
    crash: [
      'Jung, dat wor nix.',
      'Do fährs wie ne Kamellebüggel im Wind.',
      'Ich kenn ne juten Blechschmied. Ming Schwager. Kost extra.',
      'Dat Auto wor jeliehen, wa? Von mir. Rechnung kütt.',
      'Mer nennt dat Klüngel-Kurve: alle wissen et, keiner fährt se richtig.',
      'Schäl hätt dat besser jemaat. Un der sieht doppelt.'
    ],
    water: [
      'Un plumps in der Rhing. Der Schokoladenmuseum-Kapitän fischt dich raus.',
      'Dat wor kein Sprung, dat wor ne Taufe.',
      'Du solls über de Rhing, nit in de Rhing, Jung!'
    ],
    loopFall: [
      'Vom Looping jefalle wie ne Kamellebüggel. Jas jeben, Jung!',
      'Im Looping bremst mer nit. Dat is wie Kölsch ohne Deckel.',
      'Die Elefanten im Zoo han jelacht. Beide.'
    ],
    loopOk: ['Sauber durch de Looping! Dat kriegt en Deckelstrich.', 'Alaaf! Kopfüber un trotzdem jerade.'],
    jumpOk: ['Dat wor ne Sprung! Chicago am Rhein hat en neuen Stuntman.', 'Jeflogen wie ne Taube vum Dom. Nur mit mieh Stil.'],
    lap: ['Noch en Rund, Jung. Kölsch is kalt jestellt.', 'Rund vorbei. Der Köbes zählt mit.', 'Letzte Rund! Fott domet!'],
    win: [
      'Jewonne! Do bes jetz offiziell en Kölsche Jung. Oder Mädche. Ejal, Kölsch is för alle.',
      'Ne Sieg in Chicago am Rhein. Ich hätt mich fast jefreut.',
      'Alaaf, Jung! Dat kütt in de Express. Un ich kassier de Wette.'
    ],
    lose: [
      'Verlore. Aber et hätt noch immer jot jejange. Meistens.',
      'Dat wor nix. Aber ene Kölsch kriss du trotzdem. Der is aber uff Deckel.',
      'Nächstes Mol, Jung. Ming Streck läuft nit fott.'
    ],
    overtake: ['Do bes vorbei! Jetz nit einschlofe.', 'Überholt wie de KVB am Ebertplatz.'],
    overtaken: ['Un fott is er. Wie ming Steuererklärung.', 'Der zieht an dir vorbei wie de Rhing bei Hochwasser.'],
    record: ['NEUE BESTZEIT! Dat schreib ich uff de Deckel.', 'Streckenrekord! Ich lass dich uff ne Bierdeckel drucke.']
  };

  root.GameData = { CARS, RIVALS, TRACKS, TUENN };
})(typeof window !== 'undefined' ? window : module.exports);
