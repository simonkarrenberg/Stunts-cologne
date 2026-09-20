# KÖLLE 4D — Chicago am Rhein

## Mehr Kölle: Bauwerke und Abkürzungen

23 eigens modellierte Kölner Bauwerke verteilen sich inzwischen auf 46 Plätze in den zehn Karten. Dazu gehören St. Aposteln, St. Kunibert, St. Maria im Kapitol, St. Pantaleon, Gürzenich, Wallraf-Richartz-Museum, Kolumba, Oper am Offenbachplatz, Wasserturm Kaygasse, Fort X, Bahnhof Messe/Deutz, Palladium, E-Werk, Bastei, Neptunbad, Alt St. Maternus und das Hauptgebäude der Universität. Die Gebäude ergänzen die bisherigen Wahrzeichen und Veedelsdetails; ihre Architekturquellen stehen im Katalog in `js/landmarks.js`.

Der zweite Ausbau ergänzt St. Agnes mit ihrem Turm ohne Spitze, das große Zehneck von St. Gereon, die Synagoge an der Roonstraße, den Richmodisturm mit seinen beiden Pferdeköpfen, Melatens historisches Tor II an der Aachener Straße und die Bottmühle ohne Mühlenflügel. Zehn zusätzliche Standorte und ein gezielter Austausch machen die Stadt genauer: St. Gereon ersetzt dort die bisherige allgemeine Kirchenkulisse. Melaten bleibt eine Sehenswürdigkeit am Straßenrand; die Rennstrecke führt nicht durch den Friedhof.

Auf allen zehn Strecken gibt es zusammen 17 **fahrbare Abkürzungen**: unter anderem Sartory-Hinterhof, Hansaring-Schlupf und die Gassen rund um die Altstadt. Grüne Schilder kündigen die Einfahrt an, grüne Linien zeigen den Weg auf der Straße und der Minikarte. Vor dem Schild auf die angezeigte Straßenseite einordnen und in der schmalen Gasse vom Gas gehen. Keine zusätzliche Taste: Tastatur, Touch und Neigen funktionieren wie auf der Hauptstrecke. Die Gassen sparen je nach Kurve einige Meter; die weißen Straßen bleiben immer befahrbar. Einmal pro Gasse und Runde gibt es einen zusätzlichen Deckel-Strich. Rivalen bleiben auf der Hauptstrecke.

Das sind durchgehend fahrbare Nebenwege mit echten Ein- und Ausfahrten. Runden, Platzierung, Geister und Replays berücksichtigen den gewählten Weg. Ein Reset bringt dich vor die Einfahrt zurück. Gebäude und Wasser werden auch von diesen Fahrwegen ferngehalten. Die Stadt bleibt eine verdichtete Arcade-Kulisse: Die Abkürzungen sind Spielstrecken, keine realen Verkehrswege.

**JETZ FAHREN** bleibt im Menü auf Rechner und Handy erreichbar. Die 3D-Stadt wird erst beim Rennstart gebaut; Streckenwechsel im Menü laden nur die Vorschau. Geteilte Baukasten-Strecken unterstützen auch Haus-Sprünge und Korkenzieher.

### Entwicklung und Tests

Zum lokalen Spielen `python3 -m http.server 8000` im Projektordner starten und `http://localhost:8000` öffnen. Für die Tests:

```sh
npm install
npx playwright install chromium
npm test
```

Die Geometrieprüfungen kontrollieren kürzere, kontinuierliche Nebenwege und schließen Kreuzungen mit anderen Streckenabschnitten aus. Die Browserprüfungen lenken über echte Tastatureingaben in alle 17 Einfahrten, fahren jede Gasse vollständig ab und prüfen Wiedereinfahrt, Rundenstand, jeden Reset, Replay und gespeicherten Geist. Jeder geplante Wahrzeichen-Standort muss den Kulissenaufbau überstehen; Modelle werden auf gültige Geometrie, Bodenhöhe und Quellenangaben geprüft. Dazu kommen freie Fahrbahnen, getrennte Gebäudegrundrisse, Botengang, Rennen, Handy-Menü, Streckenlinks und Offline-Neustart. Pull Requests werden geprüft; Pages wird erst nach erfolgreichen Tests veröffentlicht.

Ein kleiner, browserbasierter **Stunts (4D Sports Driving)**-Klon im Pixel-Art-Look, nur eben in **Kölle**.
Loopings über der Zoobrücke, Sprünge über das Hafenbecken zwischen den Kranhäusern,
Nachtrennen in Kalk und der Rosenmontagszoch als Rennstrecke. Kommentiert vom
**Türsteher**, dem Boss von *Chicago am Rhein*.

Die Stadt ist aus Pixeln gebaut: Dom mit Doppelspitze und Strebepfeilern, Groß St. Martin,
Hohenzollernbrücke mit Liebesschlössern und ICE, Kranhäuser, KölnTriangle, Musical Dome,
Severinsbrücke, Severinstor, Colonius, Helios-Leuchtturm, Bahnbögen, Deutzer Arena,
Messeturm, Schlote in Kalk, Büdchen, Brauhäuser, KVK-Haltestellen und jede Menge Jecke.

Keine Installation, kein Build-Schritt: `index.html` öffnen und fahren.

Das Startmenü ist eine Arcade-Kiste der 80er: Marquee mit Lauflicht, Neonüberschriften, genietete
Pixel-Rahmen, Pixel-Icons auf allen Knöpfen, zwei Pixel-Joysticks um den roten Start-Knopf und eine
blinkende Münze für „Insert Coin“. Wie am Automaten gibt es oben die Zeile „1UP · HI-SCORE · CREDIT“
(gefüttert aus dem Bierdeckel), ein blinkendes „PRESS START“ und unten das Kleingedruckte von
Klüngel Amusements. Fahrer, Wagen und Strecken haben schwarze Namensschilder, auf denen jeder Name
vollständig steht (lange Namen brechen um, nichts wird abgeschnitten) – auch auf dem Handy, wo die
Karten in drei Spalten größer sind. Alle Knöpfe und Tasten sind dieselben wie vorher.

## Spielen (auch auf dem Handy)

**Auf dem Handy:** Das Spiel liegt als GitHub-Pages-Seite unter
`https://simonkarrenberg.github.io/Stunts-cologne/` (der Workflow `.github/workflows/pages.yml`
veröffentlicht jeden Push auf `main` oder einen `claude/**`-Branch; falls Pages im Repo noch nicht
aktiv ist: Settings → Pages → Source „GitHub Actions“, danach den Workflow einmal neu starten).
Link im Handy-Browser öffnen, quer halten, „Zum Home-Bildschirm“ – dann läuft es als App, auch offline.
Auf dem Handy läuft das Spiel **nur im Querformat**: hochkant zeigt jede Seite nur den Hinweis,
das Handy zu drehen (auf Android wird die Ausrichtung beim Start zusätzlich verriegelt).
Den Link einfach per WhatsApp weiterschicken; das Vorschaubild kommt aus `og.png`.
Touch-Steuerung: ◀ ▶ lenken, ▲ Gas, ■ Bremse, N Nitro, ☎ Klüngel-Telefon. Mit **NEIGEN: AN** im Menü lenkst du
durch Kippen des Handys wie mit einem Lenkrad (iPhone fragt einmal nach Erlaubnis); die Haltung beim
Start gilt als geradeaus, ein weiterer Tipp dreht die Richtung um. Falls beim ersten Start kein
Ton kommt: einmal auf den Bildschirm tippen (Autoplay-Regel von iOS/Android).
Läuft das Handy zu langsam (unter 24 Bildern pro Sekunde), regelt Heinzel die Grafik selbst herunter:
erst die Auflösung, dann auf Pixel-Modus. Der HD-Knopf im Rennen schaltet jederzeit zurück.

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

## Der Türsteher und Chicago am Rhein

Der Gastgeber des Spiels ist **der Türsteher**, eine erfundene Figur von den Kölner Ringen: seit den
60ern an der Tür, Zocker, Kölsch-Philosoph, zwei Meter zehn. **Chicago am Rhein** nannte die
Boulevardpresse Köln in den 60ern und 70ern: rund 50.000 Straftaten im Jahr, Zuhälter, Zocker,
Hehler, Spielclubs, Boxer im „Klein Köln“ (Friesenstraße, seit 1926 mit Nachtlizenz und
Wiegestation für Profiboxer), die Sartory-Säle, das Residenz-Kino an der Christophstraße, der
Banküberfall am Dom und der Einbruch in die Domschatzkammer.

Im Spiel: Die Strecke **Chicago am Rhein** führt als Nachttour über die Ringe (Residenz-Kino,
Friesenstraße, Klein Köln, Sartory, Lovers Club, Hansaring). An jedem Ort **verzällt** der Türsteher
eine Anekdote. Er steht als Türsteher vor dem Lovers Club, sagt „Du kütts hee nit rein!“,
kommentiert das Rennen, und mit dem **Klüngel-Telefon** (K) ruft man einmal pro Runde seine
Türsteher, die das Feld sechs Sekunden aufhalten. Dazu „Dä Schnelle“-Schlagzeilen, das Kölsche
Grundgesetz, Boxnacht am Ring, Spiel-Club, Kripo Köln im 60er-Jahre-Streifenwagen.

Die Charaktere sind gerundete Figuren mit Hüten, Bärten, Schals und Kölschgläsern, die
Wagen echte 60er/70er-Karosserien aus Kölner Produktion (erfundene Namen, echte Silhouetten) plus Coupé und dem
schwarzen Milieu-Benz.

Hintergrund: [Klein Köln](https://de.wikipedia.org/wiki/Klein_K%C3%B6ln),
[Chicago am Rhein (Doku)](https://www.fernsehserien.de/filme/chicago-am-rhein).

## Chicago am Rhein: Deckel, Kripo, Wette, Cup

- **Kölsch unterwegs:** Auf jeder Strecke stehen Kölsch-Gläser auf der Straße. Durchfahren gibt
  Turbo, einen Strich auf dem Bierdeckel und einen Spruch vom Köbes. Jede Runde stehen sie wieder da.
- **Bierdeckel:** Striche für Kölsch, saubere Loopings, gelandete Sprünge und Überholmanöver. Der
  Deckel wird über alle Rennen gezählt: Laufkundschaft → Stammgast → Deckelkönig → Ehrenmitglied vum
  Ring → Legende vum Ring.
- **Kripo Kölle:** Beim dritten Knöllchen kommt der grün-weiße Peterwagen mit Blaulicht und Sirene
  hinter dir her und rammt, was er kriegt. Das **Klüngel-Telefon** (K) ruft den Kommissar an – die
  Kripo dreht ab. Sonst gibt sie nach einer Weile auf. Oder sie kriegt dich.
- **Zocker-Wette:** Kurz nach dem Start wettet der Türsteher ein paar Kölsch, dass du vor einem bestimmten
  Rivalen ins Ziel kommst. Gewonnen: doppelte Striche. Verloren: du schuldest ihm Kölsch.
- **„Dä Schnelle“-Schlagzeile:** Kölns schnellstes Blatt (frei erfunden, wie alles hier) druckt eine Schlagzeile über dich – Rekord, Kripo,
  Rheinbad, Knöllchen-Rekord oder Blechschmied-Umsatz.
- **Kölsch-Kurve:** Fünf Kölsch in einer Runde und das Auto fährt sieben Sekunden Schlangenlinie.
- **Klüngel-Auftrag:** Zwei-, dreimal pro Rennen braucht der Türsteher einen Kurier: „Dä Umschlag
  zum SARTORY“, „de Zockerkasse zum KLEIN KÖLN“, „dä Hut vum Kommissar zum BOXRING“. Der Umschlag
  liegt mit gelbem Lichtkegel auf der Straße, das Ziel ist ein pinker Ring mit Schild ein paar hundert
  Meter weiter, die Uhr läuft in der HUD-Zeile AUFTRAG. Heil und pünktlich abgeliefert: fünf Striche
  und voller Turbo. Zu spät oder mit Crash: zwei Striche weg und ein Spruch, den man nicht vergisst.
  Auf dem Domschatz-Raub gibt es keine Aufträge – da hat man schon genug im Kofferraum.
- **„Dä Schnelle“-Titelseite:** Im Ergebnis liegt die Zeitung von morgen: Schlagzeile, Foto vom Zieleinlauf,
  Polizeibericht (Platz, Zeit, Knöllchen, Kölsch, Klüngel-Aufträge, Kripo), Wetter und ein Zitat des
  Türstehers („Ich hab nix jesehe.“). „TITELSEITE TEILEN“ schickt sie als Bild – per Teilen-Dialog auf
  dem Handy, sonst als Download.
- **Vorspann / Attract Mode:** Wer im Menü eine Minute nichts tut, sieht die Arcade-Kiste selbst
  spielen: ein Demo-Rennen aus der Fernsehkamera, dazu rollt die Geschichte von Chicago am Rhein über
  das Bild („KÖLN, 1968. Die Ringe glühen…“), oben blinkt „INSERT COIN“. Jede Taste oder ein Tipp
  holt zurück ins Menü; der Knopf „VORSPANN“ startet ihn sofort.
- **Streck des Tages:** Unter den zehn Strecken steht jeden Tag eine elfte, die der Klüngel aus dem
  Datum würfelt: 15 bis 25 Baukasten-Teile durch ein zufälliges Veedel (Nippes, Sülz, Kalk, Porz…),
  mindestens ein Stunt, Kulisse von einer der festen Strecken. Sie schließt sich garantiert (der
  Generator prüft das) und hat eigene Bestzeiten, die nur heute gelten. Wer auf allen Geräten dieselbe
  Streck fährt, kann Zeiten vergleichen.
- **Orden:** Zwölf Orden hängen unter REKORDE hinter der Theke – Loopingkönig, Sprungkönig, Kurier vum
  Klüngel, Rheinbader, Blitzer-Abo, Durstlöscher, Abjehängt, Rekordhalter, Cup-Sieger, Nachtschwärmer,
  Dat Dach, Tagesstreck. Die Zähler laufen über alle Rennen; ein neuer Orden wird im Ergebnis mit
  Fanfare verkündet.
- **Vorstellung der Strecke:** Vor dem Countdown fliegt die Kamera vier Sekunden von hoch über der
  ersten Kurve hinunter hinter die Startaufstellung, mit Streckenname, Veedel, Runden und Kilometern
  groß im Bild. Enter oder Leertaste überspringt sie.
- **Hupe:** H (oder der 📯-Knopf) hupt zweistimmig. Ein Rivale direkt vor dir macht zweieinhalb Sekunden
  Platz und meckert; sonst kommentiert der Türsteher.
- **Regen:** Auf nassen Strecken (Domschatz-Raub) fällt Regen.
- **Siegerehrung:** Nach der letzten Cup-Strecke stehen die ersten drei auf dem Podest, mit Portrait und Punkten.
- **Karriere „Nachtschicht“:** Zwölf Kapitel, die der Türsteher aneinanderreiht – vom Neuen auf den
  Ringen („unter die ersten fünf“) über Kölsch am Dom, Podium in Ehrenfeld, einen Auftrag im Zoch,
  Siege im Hafen und auf der Zülpicher bis zur letzten Nacht auf den Poller Wiesen. Drei Kapitel sind
  Botengänge. Jedes Kapitel hat ein Ziel (Platz, Sieg, Kölsch, Auftrag), das im Streckentitel und in
  der Vorstellung steht; geschafft heißt weiter, sonst nochmal. Der Fortschritt wird gespeichert. Der
  weiße LamboGina Contessa ist bis zum Ende der Nachtschicht gesperrt (🔒 im Menü) und wird mit dem
  letzten Kapitel freigeschaltet, zusammen mit dem Orden LEGENDE VUM RING.
- **Botengang (vielleicht kriminell, vielleicht nicht):** Auf jeder Strecke startbar, ohne Rivalen.
  Dä Lange sagt, wo etwas liegt („e Paket. Frag nit, wat drin is.“, „ne Koffer. Schwer. Vielleicht
  Kamelle.“) und wo es hin soll. Fahr zum Abhol-Ring, halt an, steig aus (E oder der gelbe Knopf) und
  lauf zu Fuß über den Bürgersteig zur markierten Tür – Pfeile/WASD bzw. die Touch-Knöpfe lenken den
  Fahrer, die Kamera hängt hinter ihm, zu weit vom Auto geht es nicht. Paket holen, zurück zum Wagen,
  einsteigen. Zu Fuß bleibt man auf Straße und Bürgersteigen und höchstens 70 m vom Wagen weg. Ab da: Blaulicht. Die Kripo hängt dran und gibt auf einem Botengang nicht auf, die Uhr
  läuft. Pünktlich im Ablieferungs-Ring anhalten ohne erwischt zu werden: acht Striche, Schlagzeile
  „Kurier liefert Paket – Inhalt unbekannt“. Zu spät oder erwischt: drei Striche weg. Drei abgelieferte
  Botengänge geben den Orden BOTE VUM RING.
- **Fußgänger am Zebrastreifen:** An jedem Übergang gehen ein bis zwei Kölner tatsächlich über die
  Straße. Kommt ein Auto näher, hüpfen sie zurück an den Bordstein, warten, bis es vorbei ist, und
  gehen dann weiter – vor jedem Auto, auch vor den Rivalen und dem Peterwagen. Das Klüngel-Telefon macht
  die Ampeln grün, die Fußgänger nicht.
- **Deckel mitnehmen:** Unter REKORDE erzeugt „CODE ERZEUGEN“ einen Text-Code mit Strichen, Orden,
  Statistiken, Karriere, Rekorden und eigenen Strecken (ohne die großen Geisterrunden). Am anderen
  Gerät einfügen, „ÜBERNEHMEN“, fertig. Beim Start einer Strecke zeigt ein Ladebild mit dem Türsteher
  an, dass gerade Köln gebaut wird.
- **Dat Hinterzimmer (zweiter Eingang):** Der grüne Knopf unter dem Start führt durch den Vorhang mit
  dem PRIVAT-Schild in den Raum, in dem Chicago am Rhein um Bierdeckel-Striche spielt: grüner Filz,
  Lampe, Kölsch-Kiste, „KEIN KREDIT“ an der Wand. Vier Spiele, alle um deine Striche vom Deckel
  (Schulden beim Türsteher sind möglich, er vergisst nix):
  **Skat** gegen Klüngel Tom und Schäl – du reizt immer am höchsten (Klüngel), nimmst den Skat auf,
  drückst zwei Karten, sagst Farbe, Grand oder Null an; Buben sind Trumpf, Bedienzwang, 61 Augen zum
  Gewinnen, Spielwert mit/ohne Spitzen, Schneider und Schwarz, verloren zählt doppelt.
  **Rommé** gegen Klüngel Tom mit zwei Blatt ohne Joker – Sets und Reihen, erste Auslage ab 30 Punkten,
  dann anlegen an alles auf dem Tisch; wer leer ist, kassiert die Punkte in der Hand des anderen.
  **Siebzehn un Vier** gegen die Bank (dä Lange) mit einem bis fünf Strichen Einsatz, die Bank zieht bis 17.
  **Knobeln** mit drei Würfeln und zwei Nachwürfen gegen Tom, Schäl und Täsch – Schock aus, Schock, General,
  Straße; der Letzte zahlt. Zehn Spiele im Hinterzimmer geben den Orden ZOCKER.
- **Razzia:** Ab und zu kommt die Kripo ins Klein Köln – Blaulicht, Sirene, alle Rivalen ducken sich
  und fahren langsam. Du nicht.
- **Zocker-Tisch:** Auf den Ringen und im Hafen sitzen die Zocker unter der Lampe und spielen um dein Auto.
- **Sprüche:** Rivalen lästern, wenn du crashst; der Türsteher begrüßt dich je nach Uhrzeit; im Menü steht
  dein Bierdeckel-Rang, und der Spruch des Tages wechselt täglich.
- **Teilen:** Im Ergebnis ein Knopf „TEILEN“ – schickt Platz, Zeit und „Dä Schnelle“-Schlagzeile samt Link
  per WhatsApp & Co. (Web Share API, sonst Zwischenablage).
- **Kölsch-Cup:** Alle zehn Strecken nacheinander, Punkte 12-10-8-6-5-4-3-2-1-1 für alle zehn Fahrer,
  Cup-Tabelle im Ergebnis, Siegerehrung vom Türsteher.

## Musik

Beim Rennen läuft ein Song in Schleife. Drei Wege:

1. Im Menü **🎵 Musik laden** tippen und die Datei auswählen. Auf dem iPhone öffnet sich die
   Dateien-App, dort **iCloud Drive** wählen und z.B. *Lamborghina* antippen. Der Song wird im
   Browser (IndexedDB) gespeichert und bei jedem Start wieder benutzt.
2. Die Datei als `music/lamborghina.mp3` ins Repo legen, dann lädt das Spiel sie automatisch.
3. Nichts tun: dann spielt ein kleiner Chiptune-Loop.

M schaltet Motor und Musik stumm.

## Strecken

| # | Strecke | Tageszeit | Route | Besonderheiten |
|---|---|---|---|---|
| 1 | Chicago am Rhein | Nacht | Residenz-Kino – Rudolfplatz (Hahnentor) – Friesenstraße (Klein Köln, Sartory) – Hansaring (Hansahochhaus) – Ebertplatz (Eigelsteintor) – Mediapark (Kölnturm) – St. Gereon | Neon, nasse Straßen, Zocker, Kripo, zwei Loopings, Sprung über die Gleise. |
| 2 | Domblitz 4D | Morgengrauen | Dom – Heinzelmännchenbrunnen (Brauhaus am Dom) – Alter Markt (Rathaus, Groß St. Martin, Tünnes un Schäl) – Hohenzollernbrücke – Deutz (Hotel am Rhein, LVR-Turm, Tanzbrunnen, Messe) – Rheinsprung | Tiefe Sonne, lange Schatten, Hauptbahnhof, Museum Ludwig, 4711-Haus. |
| 3 | Schäl Sick Schraube | Tag | Zoo & Flora – Zoobrücke (unter der Seilbahn) – Rheinpark – Messe – Deutzer Arena – Mülheimer Hafen – Mülheimer Brücke | Der Rhein wird zweimal gequert, Looping (die Schraube), Hafenkräne. |
| 4 | Ehrenfeld Tape Run | Blaue Stunde | Venloer Straße – Moschee – St. Joseph – Ottonien – Bahnbögen (Bahnhof Ehrenfeld) – Helios-Turm – Vulkan | Enge Haken, Tunnel, Colonius, Kassettenladen, Neptunbad, Graffiti, beleuchtete Fenster. |
| 5 | Karneval Krawall | Rosenmontag | Chlodwigplatz – Severinstor – Heumarkt (Reiterdenkmal) – Alter Markt (Rathaus, Groß St. Martin) – Rudolfplatz (Hahnentor) | Tribünen, Zochwagen, Konfetti, Hügel, Sprung, eine Unterführung. |
| 6 | Rheinauhafen 4D | Sonnenuntergang | Kranhäuser – Lagerhaus Siebengebirge – Schokoladenmuseum (Malakoffturm) – Severinsbrücke – Chlodwigplatz (Severinstor, St. Severin) – Bayenturm – Rheinsprung | Zwei Sprünge übers Hafenbecken, Rheinstrand, Riesenrad, Looping. |
| 7 | Poller Wiesen Stunt-Park | Nacht | Poller Wiesen – Deutzer Arena – Deutzer Werft – Südbrücke – Rheinpark | Kölner Lichter über dem Rhein, drei Loopings, zwei Sprünge, Tunnel unter der Deutzer Brücke, Tribünen, Kölsch-Stände. |
| 8 | Domschatz-Raub 1975 | Nacht, Regen | Domschatzkammer – Hauptbahnhof (Sprung über die Gleise) – Eigelstein – Ebertplatz (Looping) – Zoobrücke – Rheinpark (Korkenzieher) – Hohenzollernbrücke | Die Kripo hängt ab der ersten Sekunde im Rückspiegel; Fluchtfahrt durch Chicago am Rhein mit Pfandleihe, Hehler und Zockern. |
| 9 | Zülpicher 11.11. | Tag, Konfetti | Zülpicher Platz – Barbarossaplatz – Luxemburger Straße (Sprung über die Kneipen) – Uni (Mensa-Looping) – Aachener Weiher – Unterführung – Hohenstaufenring | Elfter im Elften im Kwartier Latäng: doppelt so viele Kölsch auf der Strecke, also Schlangenlinie für alle. |
| 10 | Rodenkirchen Rheinbad | Sommertag | Rheinuferweg – Rheinarm (Sprung) – Rheinstrand (Looping) – Rodenkirchener Brücke – Weiß (Sprung) – Sürther Bootshaus (Korkenzieher) | Drei Sprünge übers Wasser, Strandbar, Fähre, Villen in Weiß. Wer zu kurz springt, badet. |

Die Reihenfolge der Wahrzeichen folgt der echten Stadt: auf den Ringen von Süd nach Nord, am Dom
über die Hohenzollernbrücke nach Deutz, auf der Schäl Sick über die Zoobrücke hin und die
Mülheimer Brücke zurück, im Rheinauhafen vom Lagerhaus bis zum Bayenturm. Loopings und Sprünge
sind natürlich Stunts, keine Kölner Verkehrsplanung. Fünf der zehn Strecken spielen abends,
nachts oder im Morgengrauen; der Türsteher hat zu jeder Tageszeit einen Spruch.

Straßen sehen aus wie in Köln: rot-weiße Bordsteine auf voller Länge (als eigenes, ungetextes
Mesh, damit das Weiß auf Kopfsteinpflaster nicht im Pflaster verschwindet), weiße gestrichelte
Mittellinie statt der amerikanischen gelben, alle 170 m ein Zebrastreifen mit Ampeln, blauem
Schild und wartendem Kölner, orange AWB-Abfalleimer auf den Bürgersteigen, KVK-Oberleitungsmasten
hinter dem Bordstein, Ladenschilder mit erfundenen Marken (Hätz Kölsch, Ringe Kölsch, Bäckerei Jüpp,
Eau de Kölle, KVK, Klüngelkasse Köln – nichts davon gibt es wirklich). Nichts steht mehr auf dem
Bordstein: die Freiräum-Prüfung schiebt jede Kulisse bis hinter den Bordstein.

Tunnel sind echte Röhren mit Backsteingewölbe, Lampen und Portalen. Alle Stadtstrecken haben
mindestens einen Looping oder Sprung im Stunts-Stil. Dazu kommen wie in
Stunts 4D **Korkenzieher** (die Straße dreht sich einmal um die eigene Achse; Chicago am Rhein an
St. Gereon, Schäl Sick an der Flora, Rheinauhafen, Poller Wiesen) und **Sprünge über Gebäude**:
in Chicago über zwei Büdchen, im Karneval und in Ehrenfeld über ein Haus, auf den Poller Wiesen
über ein Brauhaus. Wer zu langsam springt, landet auf dem Dach (unter 70 km/h an der Rampe wird
es knapp). Die Verfolgerkamera folgt im Looping und Korkenzieher dem Band, statt durch die
Außenhaut zu schauen.

## Fahrer, Wagen, Rennen

Vier Fahrer zur Wahl, die auch den Schwierigkeitsgrad bestimmen (die Gegner fahren auf LEICHT mit
rund drei Vierteln ihres Könnens und nehmen vorne den Fuß vom Gas, wenn du hinten hängst; auf
EXPERTE fahren sie fast voll und lassen dich kaum ran): **Tünnes** (leicht), **Schäl**
(mittel), **Heinzel** (schwer), **der Türsteher** (Experte) und die beiden Rocker von den Ringen:
**Tango** (mittel; dünn, schwarze Mähne, Kajal, Lederjacke, seit 1984 in der ersten Reihe) und
**Täsch** (schwer; Muskeln, blonde Lockenmähne, Stirnband, Kutte, Türsteher vom Rose Club). Gegen dich
fahren neun weitere: Fräulein Anna, Klüngel Tom, Taxi Willi, Köbes Hermann und die fünf Fahrer, die du
nicht genommen hast – ein Feld von zehn.

Vier Wagen mit Tempo, Beschleunigung, Handling und Nitro: Niehl GT, Kapri 2.8i,
Rheinland Rocket, Milieu-Benz 280 SE und der weiße LamboGina Contessa (Keil, Klappscheinwerfer,
Heckflügel, das Poster aus dem Kinderzimmer) — echte Karosserien mit Klarlack, Chrom und
Himmelsspiegelung.

Im Rennen: **TURBO** lädt beim Fahren und Driften auf, Shift/N zündet ihn. **SCHADEN** steigt
bei Crashs und Rempeleien und kostet Topspeed; bei 100 % ist der Wagen kurz hin. Vier Kameras
(C), darunter das Cockpit mit Lenkrad und Armaturen.

**Klüngel-Baukasten:** eigener Streckeneditor im Menü. Teile aneinanderreihen (Gerade, Kurven,
Steilkurven, Hügel, Senke, Looping, Korkenzieher, Sprung, Sprung übers Haus, Brücke, Tunnel),
Kulisse wählen, speichern, fahren.
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

**Stimme:** Der Türsteher und die Fahrer sprechen ihre Sprüche über die Sprachausgabe
des Browsers (tief für den Türsteher, hoch für Heinzel). Browser haben keine kölsche Stimme, also
wird nachgeholfen: von den deutschen Stimmen des Geräts nimmt das Spiel zuerst eine tiefe
männliche, und jeder Text geht vor dem Sprechen durch eine kölsche Lautschrift („isch“ statt
„ich“, „-isch“ statt „-ig“, dat/wat/et, „je-“ statt „ge-“, eine kleine Pause nach „Jung“) und wird
etwas langsamer gesprochen, weil Kölsch gesungen wird, nicht gelesen. Der Türsteher selbst ist ein
Mann Mitte fünfzig nach dem vierten Kölsch: tiefe Stimme, das „s“ wird zum „sch“, Vokale ziehen sich
(„Juuung“), dazwischen ein „Ähh“, ein „Hicks“ oder ein „ne?“, und jeder Satz kommt mit eigenem
Schwanken in Tonhöhe und Tempo. Der Köbes und Klüngel Tom haben auch einen sitzen, nur weniger.
STIMME im Menü schaltet sie
aus, SPRECHER wechselt durch alle deutschen Stimmen des Geräts (mit Hörprobe); die Wahl bleibt
gespeichert. Welche Stimme am kölschesten klingt, hängt vom Gerät ab – auf dem iPhone lohnt es sich,
unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte eine zusätzliche deutsche Stimme zu laden.

**Chicago am Rhein mit Miami-Vice-Touch:** Neonkanten an den Dächern, Palmen und der
Rheinstrand km 689 am Rheinauhafen, Speedboote, Riesenrad, Kölner Lichter über dem Rhein,
der Kölsch-Zeppelin, Polizei Köln mit Blaulicht. Dazu **Blitzer** (ab 120 km/h gibt es ein
Knöllchen, Klüngel Tom regelt dat), ab und zu eine „Dä Schnelle“-Schlagzeile oder ein Paragraph
aus dem Kölschen Grundgesetz, zufällige Ereignisse (Taube, Köbes mit Kölsch = Turbo-Bonus)
und der Tipp des Tages vom Türsteher.

## Wie es funktioniert

- `js/track.js` — Streckenbau aus Stunts-artigen Segmenten (Gerade, Kurve mit Überhöhung,
  Hügel, Senke, Looping, Sprungschanze, Brücke, Tunnel). Ein bewegtes Koordinatensystem
  (vorwärts / oben / rechts) wird integriert; die Strecke wird automatisch geschlossen,
  indem die Geraden per Least-Squares nachjustiert werden.
- `js/pixel.js` — Pixel-Art-Pipeline: die Szene wird in ein kleines Render-Target gezeichnet
  (z.B. 427×240), dann mit Farbreduktion und Bayer-Dithering hochskaliert. Außerdem alle
  prozedural gezeichneten Texturen (Fassaden, Kopfsteinpflaster, Ziegel, Maßwerk für den Dom,
  Wasser, Himmel mit Pixelwolken bzw. Sternen).
- `js/cars.js` — die Karren: jede Karosserie wird aus abgerundeten Querschnitten (Superellipsen)
  entlang einer Seitenlinie „geloftet“ — Niehler Steilheck, Kapri-Fließheck, Bayern-Coupé, flacher
  Sportwagen, der lange W108-Benz. Klarlack-Lack (`MeshPhysicalMaterial`) mit Himmelsspiegelung
  über eine PMREM-Environment-Map, Chrom, getöntes Glas mit A/B/C-Säulen, Scheinwerfer je nach
  Typ (Doppelrund, Rechteck, Benz-Vertikal, Klappscheinwerfer), drehende Räder mit Lenkeinschlag,
  Kölner Kennzeichen. Geparkte Autos, Taxis (hellelfenbein mit Dachschild) und der grün-weiße
  Peterwagen der 70er nutzen eine leichte Variante derselben Bauweise.
- `js/world.js` — Straßenmesh (Kopfsteinpflaster in der Altstadt, rot-weiße Bordsteine, Zebrastreifen, Bürgersteige, Geländer,
  Tunnelringe, Looping-Stützen) und das Köln: Wahrzeichen, Altstadt-Giebelhäuser, geschlossene
  Blockrandbebauung entlang jeder Straße (Gründerzeit-Stuck, 50er-Jahre-Wiederaufbau, Ehrenfelder
  Backstein, Altstadt-Giebel), Brauhäuser mit hängendem Kölsch-Schild, KVK-Bahnen in Weiß-Rot mit
  Oberleitung auf den Ringen, Straßenschilder, Hinterhof-Blöcke und Kirchtürme hinter der ersten
  Reihe, Skyline-Ring im Hintergrund. Die Figuren (der Türsteher, Schäl, Tünnes, Heinzelmännchen, Köbes,
  Anna, Zocker, Polizist, Passanten) haben Gelenke, Hände, Mäntel mit Revers und Krawatte und ein
  gezeichnetes Gesicht (Augen, Brauen, Mund, Schnauzer, Bart) als Textur auf dem Kopf.
  Zwischen den Häuserzeilen liegen Parks (Rasen, Hecken, Platanen, Bänke, Spielplatz oder Brunnen),
  kleine Plätze in den Seitenstraßen (Marktstand, Kölsch-Stand, Denkmal, Litfaßsäule), Graffiti-Wände
  und Plakate mit Türsteher-Weisheiten, Rasenstreifen am Rheinufer, Alleebäume und Kölsch-Trinker
  vor jedem Brauhaus. Der Türsteher verzällt an Brauhäusern, Büdchen, Blitzern, Kirchen,
  Haltestellen, Parks, Loopings und Sprüngen – ohne dass ein echter Name fällt.
  Requisiten werden relativ zur Strecke platziert (Segment + Seite + Abstand).
- `js/game.js` — Arcade-Physik relativ zur Strecke (Längsposition + Querversatz), Fliehkraft
  vs. Grip, Schwerkraft im Looping, Flugphase bei Sprüngen und Hügelkuppen, KI-Rivale,
  Kollisionen, Kameras, HUD, Minimap, WebAudio-Motor, Bestzeiten im `localStorage`.
- `js/data.js` — Strecken, Karren, Archetypen, Straßennamen, Ladenschilder und alle kölschen Sprüche.
- Alle statischen Requisiten werden pro Material zu einem Mesh zusammengefasst, alle einfarbigen
  Teile sogar zu einem einzigen vertex-gefärbten Mesh; Schilder mit gleichem Text teilen sich eine
  Textur, jede Karre besteht aus einer Handvoll Meshes. So bleibt es auch auf dem Handy flüssig.
- `manifest.json` + `sw.js` machen das Spiel installierbar und offline-fähig; `og.png` ist das
  Vorschaubild für WhatsApp & Co.

Three.js r128 liegt unter `vendor/` (MIT-Lizenz, siehe `vendor/THREE-LICENSE`). Die Pixelschrift
„Press Start 2P“ liegt unter `fonts/` (SIL Open Font License 1.1, siehe `fonts/OFL.txt`) und wird von
dort geladen – die Seite baut beim Spielen keine Verbindung zu Google Fonts oder anderen Dritten auf.

## Rechtliches

`rechtliches.html` (verlinkt im Menü-Fuß) enthält Impressum und Datenschutzerklärung.
Alle Marken, Läden, Zeitungen, Autos und Personen im Spiel sind erfunden; die Kölner Orte und
Wahrzeichen sind echt. Die Musik ist eine eigene Aufnahme.

## Tests

`npm install` holt Playwright, `npm test` fährt dann headless durch alle Strecken (Autopilot bis 200 m,
dann erzwungenes Ziel, Ergebnis muss erscheinen) und einen kompletten Botengang (Abholring, aussteigen,
Paket zu Fuß, einsteigen, Kripo da, abliefern). `CHROME=/pfad/zu/chromium npm test` nimmt einen
eigenen Browser. Die Skripte liegen in `test/`, jede Datei liefert `{ ok, lines }` zurück.

## Debug

In der Browser-Konsole: `STUNTS_AUTOPILOT = true` lässt die KI das eigene Auto fahren,
`STUNTS_DEBUG()` gibt den aktuellen Rennzustand aus, `STUNTS_PROPS()` listet alle
platzierten Wahrzeichen und `STUNTS_FREECAM = { pos: [x,y,z], look: [x,y,z] }` setzt eine freie Kamera.
`STUNTS_SIMSTEPS = 60` lässt die Physik 60 Schritte pro gerendertem Bild laufen (für Autopilot-Tests
auf langsamen Maschinen), `STUNTS_FIELD()` liefert Position, Runde und Zustand aller acht Wagen,
`STUNTS_FRAME(s)` das Streckenkoordinatensystem samt Segmentart an Position s.

*Et hätt noch immer jot jejange.*
