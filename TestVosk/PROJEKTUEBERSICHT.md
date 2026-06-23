# Projektuebersicht - TestVosk

## Zweck Dieses Dokuments

Diese Datei ist die zentrale Kontextuebergabe fuer neue Chats oder neue Arbeitskontexte. Sie beschreibt den bestehenden Vosk-Prototyp, die bisherigen Erkenntnisse und den geplanten Aufbau eines vergleichbaren Schwesterprojekts mit `sherpa-onnx`.

## Kurzprofil

`TestVosk` ist der bestehende Prototyp fuer offlinefaehige deutsche Spracherkennung im Browser mit `vosk-browser`. Die App ist eine Blazor WebAssembly PWA und dient als Referenzimplementierung fuer einfache Kartenbefehle wie `Hase Karte Kreuz zehn`.

Das Projekt soll nicht zu `sherpa-onnx` umgebaut werden. Stattdessen soll auf gleicher Verzeichnisebene ein neues Schwesterprojekt entstehen, empfohlen unter dem Namen `TestSherpaOnnx`. Dieses neue Projekt soll moeglichst dieselbe Struktur, dieselbe UI, dieselben Testsaetze, dieselbe Parserlogik und dieselben Diagnosemetriken verwenden. Ziel ist ein fairer Vergleich zwischen Vosk und `sherpa-onnx` unter PWA-Bedingungen auf Desktop, Android und iOS.

## Projektfamilie

Geplante Struktur auf Repository-Ebene:

```text
C:\dev\Nasreddins-Playground\
|-- TestVosk\                 bestehender Vosk-/vosk-browser-Prototyp
|-- TestVosk.Tests\           bestehende xUnit-Tests fuer Parserlogik
|-- TestSherpaOnnx\           geplantes Schwesterprojekt fuer sherpa-onnx
|-- TestSherpaOnnx.Tests\     geplante Tests, moeglichst analog zu TestVosk.Tests
`-- TestVosk.slnx             bestehende Solution-Datei, spaeter ggf. erweitern
```

## Aktueller Stand Von TestVosk

| Bereich | Stand |
|---|---|
| App/UI | Blazor WebAssembly PWA |
| Target Framework | `net10.0` |
| Speech Backend | `vosk-browser` v0.0.8 |
| JS-Build | `esbuild` ueber `js-src/build.mjs` |
| Vosk-Modell | `vosk-model-small-de-0.15`, lokal als `wwwroot/models/model.tar.gz` |
| Modellgroesse | ca. 45-46 MB Download/Asset, Vosk dokumentiert fuer Small Models ca. 300 MB RAM zur Laufzeit |
| Audiozugriff | `getUserMedia`, `AudioContext`, `ScriptProcessorNode` |
| C#-Integration | `IVoiceService`, `VoiceService`, JS-Interop Callbacks |
| Parser | `Services/CommandParser.cs`, reines C# |
| Tests | xUnit in `TestVosk.Tests` |
| Deployment | GitHub Pages Workflow vorhanden |

Aktueller Trigger fuer den Prototyp ist `Hase`. Der urspruengliche Trigger `Nasreddin` wurde verworfen, weil er als erstes Wort im Satz fuer die Spracherkennung zu schwer und damit fuer den Prototyp nicht zielfuehrend war.

## Implementierte Funktionen

`TestVosk` kann aktuell:

- Vosk-Modell im Browser laden.
- Mikrofon per Browser-Berechtigung starten und stoppen.
- Audioframes an Vosk weitergeben.
- Partial- und Final-Ergebnisse in die Blazor-App melden.
- Audio-Diagnosewerte anzeigen, darunter AudioContext-Status, Audioframes, RMS und Peak.
- Diagnosemeldungen im Debug-Log anzeigen.
- erkannte Final-Texte mit `CommandParser` auf Kartenbefehle auswerten.
- erkannte Karte als Text anzeigen.
- positive und negative Testphrasen direkt auf der Oberflaeche anzeigen.
- Parserlogik per xUnit testen.

## Wichtige Dateien

```text
TestVosk/
|-- TestVosk.csproj                    Blazor WASM PWA, fuehrt JS-Build vor .NET-Build aus
|-- Program.cs                         DI-Registrierung fuer IVoiceService
|-- Pages/
|   |-- Home.razor                     Hauptseite: Status, Testanleitung, Audio-Diagnose, Karte, Debug-Log
|   `-- Home.razor.css                 Seitenspezifisches Styling
|-- Layout/
|   |-- MainLayout.razor               App-Rahmen, Titel, sichtbare Prototyp-Version
|   `-- MainLayout.razor.css           Layout-Styling
|-- Models/
|   |-- CardCommand.cs                 Parser-Ergebnis: Trigger, Action, Object, Suit, Rank
|   `-- VoiceState.cs                  Idle, LoadingModel, Ready, Listening, Error
|-- Services/
|   |-- IVoiceService.cs               austauschbare Speech-Service-Abstraktion
|   |-- VoiceService.cs                C#-Wrapper fuer JS-Interop
|   `-- CommandParser.cs               Kartenbefehl-Parser
|-- js-src/
|   |-- package.json                   JS-Abhaengigkeiten, u. a. vosk-browser
|   |-- voiceService.js                Vosk, Mikrofon, Audio-Pipeline, Diagnose, Callbacks
|   `-- build.mjs                      esbuild-Konfiguration
|-- scripts/
|   `-- download-model.ps1             Download und Packen von vosk-model-small-de-0.15
|-- wwwroot/
|   |-- index.html                     App-Einstieg, JS-Bundle, Service Worker Registrierung
|   |-- manifest.webmanifest           PWA-Manifest
|   |-- service-worker.published.js    Offline-Caching, inkl. model.tar.gz
|   |-- js/                            gebautes JS-Bundle, gitignoriert
|   `-- models/                        Vosk-Modell, gitignoriert
`-- PROJEKTUEBERSICHT.md               diese Kontextdatei
```

Testprojekt:

```text
TestVosk.Tests/
`-- CommandParserTests.cs              xUnit-Tests fuer positive/negative Kartenbefehle
```

## Testphrasen Im Aktuellen Prototyp

Positive Beispiele, die eine Karte erkennen sollen:

```text
Hase Karte Kreuz zehn
Hase suche Karte Kreuz zehn
Hase finde Karte Pik Dame
Hase zeige Karte Herz Ass
Hase Karo sieben
Hase suche Herz Bube
```

Negative Kontrollsaetze, die keine Karte ausloesen sollen:

```text
Kreuz zehn
Ich suche eine Karte
Das ist die Herz Dame
Hase erzaehle etwas
Nasreddin Karte Kreuz zehn
```

## Erkenntnisse Aus Dem Vosk-Prototyp

- Der Wechsel von `Nasreddin` zu `Hase` war notwendig, weil das schwere Triggerwort die eigentliche Backend-Bewertung verfaelscht hat.
- Vosk erkennt in laufender Umgebung teils spaete oder unerwartete Woerter. Das deutet auf Nachlauf, interne Queues, Halluzinationen bei Stille oder verzögerte Partial-/Final-Ergebnisse hin.
- Vosk Small German ist fuer mobile/offline Nutzung leicht genug, aber die Erkennungsqualitaet bei freier Rede und Eigennamen ist begrenzt.
- `vosk-browser` v0.0.8 ist alt. Safari/iOS bleibt ein technisches Risiko.
- Die Audio-Pipeline nutzt `ScriptProcessorNode`. Das funktioniert fuer den Prototyp, ist aber deprecated. Ein neues Projekt sollte pruefen, ob `AudioWorklet` sinnvoller ist.
- Das grosse deutsche Vosk-Modell ist fuer PWA nicht realistisch:
  - `vosk-model-de-0.21`: ca. 1.9 GB, eher Server-Modell.
  - `vosk-model-de-tuda-0.6-900k`: ca. 4.4 GB, klar ungeeignet fuer PWA.
- Fuer den Zielzustand ist nicht reine Transkription entscheidend, sondern robuste Extraktion von Schluesselwoertern aus laufender Rede mit Ziel-Latenz unter 1-2 Sekunden.

## Ziel Fuer Das Schwesterprojekt TestSherpaOnnx

`TestSherpaOnnx` soll ein eigenstaendiges Schwesterprojekt auf gleicher Ebene wie `TestVosk` werden. Es soll keine Migration von `TestVosk` sein, sondern ein paralleler, vergleichbarer Prototyp.

Ziele:

- gleiche Projektstruktur wie `TestVosk`.
- gleiche Blazor WebAssembly PWA-Basis.
- gleiche UI-Struktur und Bedienung.
- gleiche Testphrasen und Kontrollsaetze.
- gleiche Kartenparserlogik oder bewusst kopierte Parserlogik.
- gleiche Diagnoseanzeigen fuer Audio und Erkennung.
- gleiche Offline-/PWA-Testmethodik.
- gleicher Test auf Desktop/Chrome, Android/Chrome und iOS/Safari.
- keine Cloud-Abhaengigkeit, keine Web Speech API, keine API Keys.

## Anforderungen An TestSherpaOnnx

Das neue Projekt soll insbesondere pruefen:

- Kann `sherpa-onnx` in einer PWA auf iOS und Android lokal im Browser laufen?
- Gibt es ein geeignetes deutsches oder brauchbar multilingual nutzbares Modell fuer WASM?
- Sind Streaming- oder Partial-Ergebnisse verfuegbar?
- Liegt die nutzbare Erkennungslatenz fuer Schluesselwoerter unter 1-2 Sekunden?
- Wie gross sind Modell- und Runtime-Assets?
- Welche Assets muessen offline gecacht werden?
- Benoetigt die WASM-Variante SIMD, Threads oder SharedArrayBuffer?
- Funktioniert das unter iOS/Safari ohne spezielle HTTP-Header wie COOP/COEP?
- Wie stabil ist wiederholtes Start/Stop ohne Reload?
- Wie viele False Positives entstehen bei Stille oder laufender Rede ohne Kommando?

Zu pruefende Asset-Typen fuer sherpa-onnx:

```text
*.onnx
tokens.txt / vocab Dateien
Konfigurationsdateien
WASM-Dateien
Worker-Dateien
ggf. VAD-Modelle
ggf. Keyword-Spotting-Modelle
```

## Vorgeschlagene Struktur Fuer TestSherpaOnnx

```text
TestSherpaOnnx/
|-- TestSherpaOnnx.csproj
|-- Program.cs
|-- Pages/
|   |-- Home.razor
|   `-- Home.razor.css
|-- Layout/
|   |-- MainLayout.razor
|   `-- MainLayout.razor.css
|-- Models/
|   |-- CardCommand.cs
|   `-- VoiceState.cs
|-- Services/
|   |-- IVoiceService.cs
|   |-- VoiceService.cs
|   `-- CommandParser.cs
|-- js-src/
|   |-- package.json
|   |-- voiceService.js              sherpa-onnx statt vosk-browser
|   `-- build.mjs
|-- scripts/
|   `-- download-model.ps1           oder spezifisches sherpa-onnx Modellskript
|-- wwwroot/
|   |-- index.html
|   |-- manifest.webmanifest
|   |-- service-worker.published.js
|   |-- js/
|   `-- models/
`-- PROJEKTUEBERSICHT.md
```

Testprojekt:

```text
TestSherpaOnnx.Tests/
`-- CommandParserTests.cs
```

## Wiederverwendbare Bausteine

Aus `TestVosk` koennen fuer `TestSherpaOnnx` uebernommen oder kopiert werden:

- `Models/CardCommand.cs`
- `Models/VoiceState.cs`
- `Services/CommandParser.cs`
- `Services/IVoiceService.cs`
- `Pages/Home.razor` als UI- und Diagnosevorlage
- `Pages/Home.razor.css`
- `Layout/*`
- xUnit-Tests aus `TestVosk.Tests`
- PWA-Grundstruktur
- Service-Worker-Caching-Ansatz
- GitHub-Pages-Workflow als Vorlage, aber mit Modell-/Base-Href-Pruefung

Nicht 1:1 uebernehmen:

- `js-src/voiceService.js`, weil dort Vosk-spezifische APIs genutzt werden.
- `scripts/download-model.ps1`, weil sherpa-onnx andere Modellassets benoetigt.
- Modellpfad und Service-Worker-Include-Patterns, weil sherpa-onnx mehrere Asset-Dateien haben kann.

## Vergleichsmatrix

Fuer beide Projekte sollen identische Messwerte erhoben werden:

| Kriterium | TestVosk | TestSherpaOnnx |
|---|---:|---:|
| Modellgroesse gesamt | messen | messen |
| Anzahl Modell-/Runtime-Assets | messen | messen |
| Erstes Laden online | messen | messen |
| Start im Flugmodus | testen | testen |
| iPhone/Safari Modell laedt | testen | testen |
| Android/Chrome Modell laedt | testen | testen |
| Mikrofonberechtigung funktioniert | testen | testen |
| Partial Results verfuegbar | ja/nein | ja/nein |
| Final Result Latenz | messen | messen |
| Schluesselwort-Latenz | messen | messen |
| Trefferquote positive Testphrasen | messen | messen |
| False Positives Negativtests | messen | messen |
| False Positives bei Stille | messen | messen |
| 3 Minuten Zuhoeren stabil | testen | testen |
| Wiederholtes Start/Stop ohne Reload | testen | testen |
| PWA Offline-Cache vollstaendig | testen | testen |

## Bekannte Risiken Fuer PWA/iOS

- Grosse Modelle koennen an Speicher, Downloadzeit oder PWA-Cache-Limits scheitern.
- iOS Safari ist bei WASM, Speicher und Audio restriktiver als Desktop-Browser.
- `getUserMedia` benoetigt HTTPS oder lokalen sicheren Kontext.
- WASM-Threads und SharedArrayBuffer brauchen oft COOP/COEP-Header, die auf GitHub Pages und in iOS-PWA-Kontexten problematisch sein koennen.
- Service Worker muessen alle Modell- und Runtime-Dateien korrekt cachen, sonst scheitert der Flugmodus-Test.
- Ein lokaler Browser-Prototyp darf nicht versehentlich Web Speech API oder Cloud-ASR nutzen, sonst ist der Vergleich unbrauchbar.

## Naechste Schritte

1. `TestSherpaOnnx` als neues Schwesterprojekt auf gleicher Ebene wie `TestVosk` anlegen.
2. Blazor-WASM-PWA-Struktur aus `TestVosk` uebernehmen.
3. Gemeinsame Parserlogik und Tests kopieren.
4. UI und Diagnoseanzeige moeglichst identisch halten.
5. Geeignete `sherpa-onnx` WASM-Integration recherchieren und minimal integrieren.
6. Erstes deutsches oder multilingual geeignetes Modell auswaehlen und Modellgroesse dokumentieren.
7. Service Worker fuer alle sherpa-onnx Assets anpassen.
8. Vergleichstests mit denselben Phrasen auf Desktop, Android und iOS durchfuehren.
