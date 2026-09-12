# KÖLLE 4D — Chicago am Rhein

Ein kleiner, browserbasierter **Stunts (4D Sports Driving)**-Klon im Pixel-Art-Look, nur eben in **Kölle**.
Loopings über der Zoobrücke, Sprünge über das Hafenbecken zwischen den Kranhäusern,
Nachtrennen in Kalk und der Rosenmontagszoch als Rennstrecke. Kommentiert vom
**Langen Tünn**, dem Boss von *Chicago am Rhein*.

Die Stadt ist aus Pixeln gebaut: Dom mit Doppelspitze und Strebepfeilern, Groß St. Martin,
Hohenzollernbrücke mit Liebesschlössern und ICE, Kranhäuser, KölnTriangle, Musical Dome,
Severinsbrücke, Severinstor, Colonius, Helios-Leuchtturm, Bahnbögen, Lanxess Arena,
Messeturm, Schlote in Kalk, Büdchen, Brauhäuser, KVB-Haltestellen und jede Menge Jecke.

Keine Installation, kein Build-Schritt: `index.html` öffnen und fahren.

## Spielen (auch auf dem Handy)

Die fertige Version läuft als Web-App auf GitHub Pages und lässt sich einfach als Link
per WhatsApp teilen. Einmalig in den Repo-Einstellungen aktivieren:
**Settings → Pages → Build and deployment → Source: „GitHub Actions“**. Der Workflow in
`.github/workflows/pages.yml` veröffentlicht danach bei jedem Push automatisch unter

    https://simonkarrenberg.github.io/stunts-cologne/

Auf dem iPhone/Android: Link öffnen, Handy quer halten, Touch-Buttons benutzen. Über
„Zum Home-Bildschirm“ wird es eine Vollbild-App und läuft dank Service Worker auch offline.


```bash
# beliebiger statischer Webserver, z.B.
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Oder einfach `index.html` per Doppelklick im Browser öffnen (Three.js liegt in `vendor/`,
es wird nichts nachgeladen). Läuft auch auf dem Handy (Touch-Buttons).

### Steuerung

| Taste | Funktion |
|---|---|
| ↑ / W | Gas |
| ↓ / S / Leertaste | Bremse / Rückwärts |
| Shift / N / X | Turbo (Nitro) |
| ← / → / A / D | Lenken |
| C | Kamera (Verfolger, Motorhaube, weit, TV-Kamera) |
| P | Grafik: HD (Standard, mit Schatten) oder Pixel-Modus in drei Stufen |
| R | Auto zurücksetzen |
| M | Ton an/aus |
| Enter | Rennen starten / nochmal |
| Esc | Menü |

## Der Lange Tünn und Chicago am Rhein

Das Spiel ist eine Hommage an den echten **Langen Tünn**, Anton Claaßen: ab 1961 Türsteher im
Lovers Club, Zocker-Legende vom Kölner Milieu, heute EXPRESS-Kolumnist, Autor („Wenn es Nacht
wird in Köln – Der Lange Tünn verzällt“) und Stadtführer über die Ringe. **Chicago am Rhein**
nannte die Boulevardpresse Köln in den 60ern und 70ern: rund 50.000 Straftaten im Jahr,
Zuhälter, Zocker, Hehler, Spielclubs, Boxer im „Klein Köln“ (Friesenstraße, seit 1926 mit
Nachtlizenz und Wiegestation für Profiboxer), die Sartory-Säle, das Residenz-Kino an der
Christophstraße, der Banküberfall am Dom und der Einbruch in die Domschatzkammer.

Im Spiel: Die Strecke **Chicago am Rhein** folgt der Tour vom Langen Tünn (Residenz-Kino,
Friesenstraße, Klein Köln, Sartory, Lovers Club, Hansaring). An jedem Ort **verzällt** er
eine Anekdote. Er steht als Türsteher vor dem Lovers Club, sagt „Du kütts hee nit rein!“,
kommentiert das Rennen, und mit **Tünn’s Telefon** (K) ruft man einmal pro Runde seine
Türsteher, die das Feld sechs Sekunden aufhalten. Dazu EXPRESS-Schlagzeilen, das Kölsche
Grundgesetz, Boxnacht am Ring, Spiel-Club, Kripo Köln im 60er-Jahre-Streifenwagen.

Die Charaktere sind jetzt gerundete Figuren mit Hüten, Bärten, Schals und Kölschgläsern, die
Wagen echte 60er/70er-Karosserien aus Kölner Produktion (Taunus, Capri) plus Coupé und dem
schwarzen Milieu-Benz.

Quellen: [Der Lange Tünn](https://derlangetuenn.de/), [Stadtführung](https://nachtwaechter-tour.de/stadtfuehrung-koeln-lange-tuenn/),
[Klein Köln](https://de.wikipedia.org/wiki/Klein_K%C3%B6ln), [Chicago am Rhein (Doku)](https://www.fernsehserien.de/filme/chicago-am-rhein),
[Buch](https://www.rheinspirits.com/produkt/buch-wenn-es-nacht-wird-in-koeln/).

## Musik

Beim Rennen läuft ein Song in Schleife. Drei Wege:

1. Im Menü **🎵 Musik laden** tippen und die Datei auswählen. Auf dem iPhone öffnet sich die
   Dateien-App, dort **iCloud Drive** wählen und z.B. *Lamborghina* antippen. Der Song wird im
   Browser (IndexedDB) gespeichert und bei jedem Start wieder benutzt.
2. Die Datei als `music/lamborghina.mp3` ins Repo legen, dann lädt das Spiel sie automatisch.
3. Nichts tun: dann spielt ein kleiner Chiptune-Loop.

M schaltet Motor und Musik stumm.

## Strecken

| # | Strecke | Route | Besonderheiten |
|---|---|---|---|
| 1 | Chicago am Rhein | Friesenplatz – Rudolfplatz – Hansaring – Eigelsteintor | Nacht, Neon, nasse Straßen, Hansahochhaus, Hahnentor, zwei Loopings, Sprung über die Gleise. |
| 2 | Domblitz 4D | Dom – Heumarkt – Hohenzollernbrücke – Rheinsprung | Dom, Rathaus, Altstadt, über die Brücke nach Deutz, mit Rheinsprung zurück. |
| 3 | Schäl Sick Schraube | Deutzer Freiheit – Messe – Rheinpark – Mülheimer Hafen | Looping (die Schraube), Zoobrücke, Seilbahn, Hafenkräne, Mülheimer Brücke. |
| 4 | Ehrenfeld Tape Run | Venloer – Odonien – Bahnbögen – Subbelrath – Köln West | Enge Haken, Tunnel, Colonius, Moschee, Kassettenladen, Graffiti. |
| 5 | Karneval Krawall | Heumarkt – Alter Markt – Rathaus – Schmitzengasse | Tribünen, Zochwagen, Konfetti, Severinstor, Hügel und Sprung. |
| 6 | Rheinauhafen 4D | Agrippinawerft – Holzmarkt – Kranhäuser – Rheinsprung | Sonnenuntergang, zwei Sprünge übers Hafenbecken, Kranhäuser, Severinsbrücke. |


## Fahrer, Wagen, Rennen

Vier Fahrer zur Wahl, die auch den Schwierigkeitsgrad bestimmen: **Tünnes** (leicht), **Schäl**
(mittel), **Heinzel** (schwer) und **Langer T.** (Experte). Gegen dich fahren sieben weitere:
Fräulein Anna, Klüngel Tom, Taxi Willi, Köbes Hermann und die drei Fahrer, die du nicht genommen hast.

Vier Wagen mit Tempo, Beschleunigung, Handling und Nitro: Kölnie GTI, Ehrenfeld Turbo,
Rheinland Rocket, Langer T. Special.

Im Rennen: **TURBO** lädt beim Fahren und Driften auf, Shift/N zündet ihn. **SCHADEN** steigt
bei Crashs und Rempeleien und kostet Topspeed; bei 100 % ist der Wagen kurz hin. Vier Kameras
(C), darunter das Cockpit mit Lenkrad und Armaturen.

**Klüngel-Baukasten:** eigener Streckeneditor im Menü. Teile aneinanderreihen (Gerade, Kurven,
Steilkurven, Hügel, Senke, Looping, Sprung, Brücke, Tunnel), Kulisse wählen, speichern, fahren.
Die Kurven müssen sich zu 360° ergänzen, die Geraden passt der Klüngel automatisch an.

**Rekorde:** die fünf besten Zeiten pro Strecke bleiben im Browser gespeichert.

**Replay:** nach dem Rennen 📼 REPLAY drücken. Streckenkameras wie im alten Stunts, Leertaste
Pause, → schneller, ← fünf Sekunden zurück, C für Verfolger/Cockpit, Esc zurück.

**Geist:** deine beste Runde fährt beim nächsten Rennen als durchsichtiger Geisterwagen mit.

**2 Spieler** an einer Tastatur (nicht am Handy): im Menü 👥 2 SPIELER einschalten. Oben P1
mit Pfeiltasten + Shift, unten P2 mit W/A/S/D + Q. V wechselt die Kamera von P2. Das Feld
bleibt bei acht Wagen.

**Strecken teilen:** im Klüngel-Baukasten 🔗 LINK TEILEN. Am Handy öffnet sich das Teilen-Menü
(WhatsApp), am Rechner landet der Link in der Zwischenablage. Wer den Link öffnet, hat die
Strecke sofort in seiner Liste.

**Stimme:** Langer T., Radio Kölle und die Fahrer sprechen ihre Sprüche über die Sprachausgabe
des Browsers (deutsche Stimme, tief für den Langen T., hoch für Heinzel). 🗣 STIMME im Menü
schaltet sie aus.

**Chicago am Rhein mit Miami-Vice-Touch:** Neonkanten an den Dächern, Palmen und der
Rheinstrand km 689 am Rheinauhafen, Speedboote, Riesenrad, Kölner Lichter über dem Rhein,
der Kölsch-Zeppelin, Polizei Köln mit Blaulicht. Dazu **Blitzer** (ab 120 km/h gibt es ein
Knöllchen, Klüngel Tom regelt dat), **Radio Kölle** mit Verkehrsmeldungen aus der Hölle,
zufällige Ereignisse (Taube, Köbes mit Kölsch = Turbo-Bonus) und der Tipp des Tages vom Langen T.

## Wie es funktioniert

- `js/track.js` — Streckenbau aus Stunts-artigen Segmenten (Gerade, Kurve mit Überhöhung,
  Hügel, Senke, Looping, Sprungschanze, Brücke, Tunnel). Ein bewegtes Koordinatensystem
  (vorwärts / oben / rechts) wird integriert; die Strecke wird automatisch geschlossen,
  indem die Geraden per Least-Squares nachjustiert werden.
- `js/pixel.js` — Pixel-Art-Pipeline: die Szene wird in ein kleines Render-Target gezeichnet
  (z.B. 427×240), dann mit Farbreduktion und Bayer-Dithering hochskaliert. Außerdem alle
  prozedural gezeichneten Texturen (Fassaden, Kopfsteinpflaster, Ziegel, Maßwerk für den Dom,
  Wasser, Himmel mit Pixelwolken bzw. Sternen).
- `js/world.js` — Straßenmesh (Kopfsteinpflaster in der Altstadt, Kerbs, Bürgersteige, Geländer,
  Tunnelringe, Looping-Stützen) und das Pixel-Köln: Wahrzeichen, Altstadt-Giebelhäuser,
  Gründerzeit-Zeilen, Industrie in Kalk, Straßenlaternen, Fahnen, Rhein mit Schiffen, Skyline-Ring
  im Hintergrund. Requisiten werden relativ zur Strecke platziert (Segment + Seite + Abstand).
- `js/game.js` — Arcade-Physik relativ zur Strecke (Längsposition + Querversatz), Fliehkraft
  vs. Grip, Schwerkraft im Looping, Flugphase bei Sprüngen und Hügelkuppen, KI-Rivale,
  Kollisionen, Kameras, HUD, Minimap, WebAudio-Motor, Bestzeiten im `localStorage`.
- `js/data.js` — Strecken, Karren, Archetypen, Straßennamen, Ladenschilder und alle kölschen Sprüche.
- Alle statischen Requisiten werden pro Material zu einem Mesh zusammengefasst (ein paar Dutzend
  Draw Calls statt tausenden), damit es auch auf dem Handy flüssig läuft.
- `manifest.json` + `sw.js` machen das Spiel installierbar und offline-fähig; `og.png` ist das
  Vorschaubild für WhatsApp & Co.

Three.js r128 liegt unter `vendor/` (MIT-Lizenz, siehe `vendor/THREE-LICENSE`).

## Debug

In der Browser-Konsole: `STUNTS_AUTOPILOT = true` lässt die KI das eigene Auto fahren,
`STUNTS_DEBUG()` gibt den aktuellen Rennzustand aus, `STUNTS_PROPS()` listet alle
platzierten Wahrzeichen und `STUNTS_FREECAM = { pos: [x,y,z], look: [x,y,z] }` setzt eine freie Kamera.

*Et hätt noch immer jot jejange.*
