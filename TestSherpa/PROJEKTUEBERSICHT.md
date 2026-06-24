# Projektuebersicht - TestSherpa

## Kurzprofil

`TestSherpa` ist ein Blazor-WebAssembly-PWA-Prototyp fuer offlinefaehige Spracherkennung im Browser mit `sherpa-onnx`. Die App uebernimmt Bedienung, Kartenparser, Diagnoseanzeigen und Tests aus `TestVosk`, enthaelt aber keine Vosk-Codepfade und keine `vosk-browser`-Abhaengigkeit.

Ziel ist ein fairer Vergleich der gleichen Kartenbefehle wie im Vosk-Prototyp, z. B. `Hase Karte Kreuz zehn`, unter Desktop-, Android- und iOS-PWA-Bedingungen.

## Projektstand

| Bereich | Stand |
|---|---|
| App/UI | Blazor WebAssembly PWA |
| Target Framework | `net10.0` |
| Speech Backend | `sherpa-onnx` Browser/WASM-Runtime |
| JS-Build | `esbuild` ueber `js-src/build.mjs` |
| Modellpfad | im Runtime-Datenpaket `wwwroot/js/sherpa-onnx-wasm-main-vad-asr.data` |
| Runtimepfad | `wwwroot/js/sherpa-onnx-asr.js`, `sherpa-onnx-vad.js`, `sherpa-onnx-wasm-main-vad-asr.js`, `.wasm`, `.data` |
| Audiozugriff | `getUserMedia`, `AudioContext`, `ScriptProcessorNode` |
| C#-Integration | `IVoiceService`, `VoiceService`, JS-Interop Callbacks |
| Parser | `Services/CommandParser.cs`, reines C# |
| Tests | xUnit in `TestSherpa.Tests` |
| IIS Express | HTTP `54817`, HTTPS `44382` |

## Wichtige Dateien

```text
TestSherpa/
|-- TestSherpa.csproj                 Blazor WASM PWA, fuehrt JS-Build vor .NET-Build aus
|-- Program.cs                        DI-Registrierung fuer IVoiceService
|-- Pages/Home.razor                  Hauptseite: Status, Testanleitung, Audio-Diagnose, Karte, Debug-Log
|-- Layout/MainLayout.razor           App-Rahmen, sichtbare Version v0.17.0
|-- Models/                           Parser- und Sprachstatusmodelle
|-- Services/                         Parser und C#-JS-Interop-Wrapper
|-- js-src/voiceService.js            Sherpa-ONNX, Mikrofon, Audio-Pipeline, Diagnose, Callbacks
|-- Tools/Install-SherpaAssets.ps1    Download/Installation des mehrsprachigen Sherpa VAD+ASR Pakets
|-- Tools/Start-Lokaler-Test.ps1      IISExpress-Start fuer lokale/mobile Tests
|-- wwwroot/js/                       JS-Bundle, Sherpa-WASM-Runtime und Modell-Datenpaket
`-- PROJEKTUEBERSICHT.md              diese Kontextdatei
```

Testprojekt:

```text
TestSherpa.Tests/
`-- CommandParserTests.cs             xUnit-Tests fuer positive/negative Kartenbefehle
```

## Sherpa-ONNX-Asset-Setup

Die App nutzt die offizielle Sherpa-ONNX VAD+ASR Browser-Runtime und erzeugt daraus ein deutschfaehiges Whisper-Tiny-Datenpaket. `Tools/Install-SherpaAssets.ps1` kombiniert die VAD+ASR-WASM-Runtime mit dem offiziellen multilingualen Whisper-Tiny-Modell:

```text
wwwroot/js/sherpa-onnx-asr.js
wwwroot/js/sherpa-onnx-vad.js
wwwroot/js/sherpa-onnx-wasm-main-vad-asr.js
wwwroot/js/sherpa-onnx-wasm-main-vad-asr.wasm
wwwroot/js/sherpa-onnx-wasm-main-vad-asr.data
```

`Tools/Install-SherpaAssets.ps1` laedt dieses Paket ohne weitere Parameter herunter und kopiert die benoetigten Dateien nach `wwwroot/js`.

Beispiel:

```powershell
.\Tools\Install-SherpaAssets.ps1
```

## Testphrasen

Positive Beispiele:

```text
Hase Karte Kreuz zehn
Hase suche Karte Kreuz zehn
Hase finde Karte Pik Dame
Hase zeige Karte Herz Ass
Hase Karo sieben
Hase suche Herz Bube
```

Negative Kontrollsaetze:

```text
Kreuz zehn
Ich suche eine Karte
Das ist die Herz Dame
Hase erzaehle etwas
Nasreddin Karte Kreuz zehn
```

## Bekannte Risiken

- Die offizielle Sherpa-ONNX-Browser-ASR-Demo nutzt separat gebaute WASM-Runtime-Dateien; die npm-Pakete sind nicht 1:1 als Browser-Bundle verwendbar.
- iOS Safari bleibt kritisch bei WASM, Speicher, Audio und PWA-Cache-Limits.
- `ScriptProcessorNode` ist deprecated, aber fuer den fairen Vergleich zur Vosk-Referenz vorerst beibehalten.
- Ein deutsches oder multilingual geeignetes kleines Streaming-Modell muss fuer echte Qualitaetstests bewusst ausgewaehlt werden.
- Service Worker und IIS-MIME-Typen sind fuer `.wasm`, `.onnx`, `.dat` und `tokens.txt` vorbereitet; Offline-Tests muessen nach Asset-Installation auf echten Geraeten erfolgen.
