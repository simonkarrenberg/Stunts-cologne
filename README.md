# STUNTS KÖLLE 4D — Chicago am Rhein Edition

Ein kleiner, browserbasierter **Stunts (4D Sports Driving)**-Klon im Pixel-Art-Look, nur eben in **Kölle**.
Loopings über der Zoobrücke, Sprünge über das Hafenbecken zwischen den Kranhäusern,
Nachtrennen in Kalk und der Rosenmontagszoch als Rennstrecke. Kommentiert vom
**Langen Tünn**, dem Boss von *Chicago am Rhein*.

Die Stadt ist aus Pixeln gebaut: Dom mit Doppelspitze und Strebepfeilern, Groß St. Martin,
Hohenzollernbrücke mit Liebesschlössern und ICE, Kranhäuser, KölnTriangle, Musical Dome,
Severinsbrücke, Severinstor, Colonius, Helios-Leuchtturm, Bahnbögen, Lanxess Arena,
Messeturm, Schlote in Kalk, Büdchen, Brauhäuser, KVB-Haltestellen und jede Menge Jecke.

Keine Installation, kein Build-Schritt: `index.html` öffnen und fahren.

## Spielen

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
| ← / → / A / D | Lenken |
| C | Kamera (Verfolger, Motorhaube, weit, TV-Kamera) |
| P | Pixelgröße (1–4) |
| R | Auto zurücksetzen |
| M | Ton an/aus |
| Enter | Rennen starten / nochmal |
| Esc | Menü |

## Strecken

| Strecke | Veedel | Besonderheiten |
|---|---|---|
| Domplatte-Runde | Altstadt / Deutz | Dom, Hbf, Hohenzollernbrücke, Steilkurven. Einsteiger. |
| Rheinufer-Sprung | Rheinauhafen / Südstadt | Zwei Sprünge übers Hafenbecken, Kranhäuser, Schokoladenmuseum. Zu kurz gesprungen = Rhing. |
| Zoobrücke-Looping | Riehl / Mülheim | Looping an der Flora, Seilbahn, Elefanten. Nicht bremsen im Looping! |
| Ehrenfelder Haken | Ehrenfeld | Enge Haken, Tunnel, Colonius, Helios-Turm, Graffiti, Lastenräder. |
| Kalker Klüngel-Nacht | Kalk / Deutz | Nacht, Neon, Arena, zwei Loopings, Sprung über die Gleise. Chicago am Rhein pur. |
| Rusenmondaach-Chaos | Severinsviertel | Konfetti, Hügel, Sprung, Severinstor, jeckes Volk am Straßenrand. |

## Karren

Ehrenfeld Capri (Ford, klar), Kranz-Kart, Klüngel-Limousine (Baujahr 1928, Chicago am Rhein),
KVB Linie 1, Chicago-Taxi und der Karnevalswagen. Jede Karre mit eigenem Speed, Antritt,
Grip und Lenkung.

## Rivalen (kölsche Archetypen)

Der Lange Tünn, Köbes Hermann, Oma Käthe aus Nippes, FC-Andi, Ehrenfeld-Finn,
Karnevalsjeck Jupp, Taxi-Ali, Klüngel-Klaus und Schäl. Jeder mit eigenem Fahrstil
(Können, Wackligkeit) und eigenen Sprüchen beim Start, Überholen, Crash und im Ziel.

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
- `js/data.js` — Strecken, Karren, Archetypen und alle kölschen Sprüche.

Three.js r128 liegt unter `vendor/` (MIT-Lizenz, siehe `vendor/THREE-LICENSE`).

## Debug

In der Browser-Konsole: `STUNTS_AUTOPILOT = true` lässt die KI das eigene Auto fahren,
`STUNTS_DEBUG()` gibt den aktuellen Rennzustand aus, `STUNTS_PROPS()` listet alle
platzierten Wahrzeichen und `STUNTS_FREECAM = { pos: [x,y,z], look: [x,y,z] }` setzt eine freie Kamera.

*Et hätt noch immer jot jejange.*
