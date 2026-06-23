# Briefing für Codex: Offline-Spracherkennung mit Vosk in einer C# Blazor WASM/PWA

## 1. Ausgangslage

Es soll eine Smartphone-taugliche Webanwendung entstehen, bevorzugt als **C# Blazor WebAssembly PWA**. Sie muss auf einem Smartphone des Zauberers laufen und soll Sprache über das Mikrofon auswerten.

Wichtige Prämissen:

- Zielgerät: primär **iPhone / Safari**, zusätzlich Android/Chrome als Vergleich sinnvoll.
- Die Anwendung muss **offline** funktionieren.
- Keine Cloud-Spracherkennung.
- Kein Internet während der Vorführung voraussetzen.
- PWA muss nicht zwingend installierbar sein; eine normale HTTPS-Webseite in Safari ist akzeptabel, solange nach vorherigem Laden Offlinebetrieb möglich ist.
- Die App soll öffentlich / frei verteilbar sein.
- Keine Subscription, kein AccessKey, kein verstecktes Preismodell.
- Keine Beta-/Pre-Release-Abhängigkeiten verwenden.
- Speichergröße ist auf dem Smartphone nicht das Hauptproblem; aber Browser-Cache/Storage und iOS-Safari-Verhalten müssen beachtet werden.

Ausgeschlossene Ansätze:

- Rhino / Picovoice: technisch interessant, aber wegen AccessKey, Subscription-/MAU-Modell und nicht transparenter Preispolitik ausgeschlossen.
- Cloud Speech-to-Text: wegen Offline-Prämisse ausgeschlossen.
- Web Speech API: wegen iOS/PWA-Zuverlässigkeit und möglicher Serverabhängigkeit nicht Hauptansatz.

---

## 2. Fachliches Ziel des Prototyps

Die App wird vom Zauberer aktiv auf „Empfang“ gestellt. Danach hört sie im Vordergrund für einige Minuten mit und wartet auf einen bekannten Satz oder ein Schlüsselwort innerhalb eines Satzes.

Beispiel:

```text
Nasreddin suche Karte Kreuz 10
```

Oder natürlich gesprochen:

```text
Nasreddin suche Karte Kreuz zehn
Nasreddin finde Karte Pik Dame
Nasreddin Karte Herz Ass
Nasreddin Karo sieben
```

Die App soll daraus extrahieren:

```json
{
  "trigger": "nasreddin",
  "command": "suche",
  "object": "karte",
  "suit": "kreuz",
  "rank": "10"
}
```

Minimalziel des Prototyps:

- Mikrofon starten.
- Vosk-Modell lokal laden.
- Sprache offline erkennen.
- Teilresultate und Endresultate anzeigen.
- Einen Kartenbefehl erkennen.
- Erkannte Karte sichtbar ausgeben, z. B. `Kreuz 10`.
- Offline-Test bestehen: Seite vorher laden, danach Flugmodus, dann erneut starten und Befehl erkennen.

---

## 3. Technischer Hauptkandidat: Vosk / vosk-browser

### Warum Vosk?

Vosk ist ein offlinefähiges Open-Source-Speech-Recognition-Toolkit. Es unterstützt u. a. Deutsch, läuft auf kleinen Geräten und bietet Sprachbindungen für verschiedene Plattformen. Für den Browser gibt es `vosk-browser`, eine WebAssembly-basierte Browserbibliothek.

Vorteile für dieses Projekt:

- offline nutzbar
- Open Source
- Apache-2.0-Lizenz für Vosk und das empfohlene kleine deutsche Modell
- keine AccessKeys
- keine laufenden Lizenzkosten
- keine Cloud
- Browser/WASM-Ansatz vorhanden
- kleine Befehlswelt, daher keine perfekte Diktierqualität nötig

Nachteile / Risiken:

- `vosk-browser` muss auf iPhone/Safari praktisch getestet werden.
- Vosk liefert Text, keine Intents/Slots; Parser muss selbst gebaut werden.
- Das kleine deutsche Modell kann Fehler bei Namen/Kunstwörtern machen, z. B. „Nasreddin“.
- Das offizielle Modell liegt als ZIP vor; `vosk-browser`-Beispiele verwenden `model.tar.gz`. Format/Packaging muss geprüft werden.
- Audio-/Mikrofonverhalten auf iOS Safari ist immer ein eigener Testpunkt.

---

## 4. Relevante Quellen

### Primärquellen

- Vosk API GitHub  
  https://github.com/alphacep/vosk-api

- Vosk Website  
  https://alphacephei.com/vosk/

- Vosk Modelle  
  https://alphacephei.com/vosk/models

- Deutsches kleines Modell: `vosk-model-small-de-0.15`  
  https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip

- vosk-browser GitHub  
  https://github.com/ccoreilly/vosk-browser

- vosk-browser Demo  
  https://ccoreilly.github.io/vosk-browser/

- Blazor JS Interop  
  https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/

- MDN `getUserMedia()`  
  https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

- MDN Service Worker / Offline PWA  
  https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers

- MDN Using Service Workers  
  https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

- MDN Web Audio API  
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

- MDN AudioWorklet  
  https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet

- WebKit Storage Policy / Safari Storage  
  https://webkit.org/blog/14403/updates-to-storage-policy/

- MDN Storage Quotas / Eviction Criteria  
  https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

### Sekundär / optional anzusehen

- Vosk-Browser Demo als schnellster Funktionstest  
  https://ccoreilly.github.io/vosk-browser/

- Vosklet, alternativer Browser/Vosk-ähnlicher Ansatz; nur prüfen, nicht als Hauptweg setzen  
  https://github.com/msqr1/Vosklet

- Sherpa-ONNX als spätere Alternative, falls Vosk nicht reicht  
  https://github.com/k2-fsa/sherpa-onnx

- Whisper.cpp als Qualitätsfallback, aber größer/schwerer  
  https://github.com/ggml-org/whisper.cpp

---

## 5. Vosk-Modellauswahl

Für den ersten Prototypen:

```text
vosk-model-small-de-0.15
Größe: ca. 45 MB
Lizenz: Apache 2.0
Beschreibung: Lightweight wideband model for Android and RPi
```

Quelle: Vosk Model List, Bereich German.

Nicht zuerst verwenden:

```text
vosk-model-de-0.21
Größe: ca. 1.9 GB
Lizenz: Apache 2.0
Beschreibung: Big German model for telephony and server
```

Begründung: Für eine kleine bekannte Befehlswelt ist das kleine Modell wahrscheinlich ausreichend und wesentlich handlicher.

Hinweis für Codex:

- Prüfen, welches Modellformat `vosk-browser` tatsächlich erwartet.
- Die Beispiele nutzen `model.tar.gz`.
- Das offizielle Modell wird als ZIP angeboten.
- Falls nötig: ZIP lokal entpacken und als `model.tar.gz` neu packen.
- Das Modell muss als statisches Asset ausgeliefert und offline gecacht werden.

---

## 6. Zielarchitektur

Empfohlene Architektur:

```text
Blazor WASM / PWA
    |
    | JS Interop
    v
VoiceService.js
    |
    | Mikrofon über getUserMedia
    | AudioContext / ScriptProcessor oder AudioWorklet
    | Vosk-Browser WebWorker/WASM
    v
Rohtext / PartialResult / FinalResult
    |
    | Callback nach C#
    v
C# CommandParser
    |
    v
CardCommand erkannt: Suit + Rank
```

Wichtig: Die Spracherkennung soll in JavaScript gekapselt werden. Blazor/C# soll nur die Ergebnisse erhalten und die Effektlogik / UI steuern.

---

## 7. Empfohlene Projektstruktur

Beispiel für eine Blazor-WASM-Struktur:

```text
/src
  /NasreddinVoicePoc
    Program.cs
    App.razor
    Pages/
      VoiceTest.razor
    Services/
      VoiceInteropService.cs
      CardCommandParser.cs
      CardCommand.cs
    wwwroot/
      index.html
      service-worker.js
      manifest.webmanifest
      js/
        voiceService.js
      models/
        vosk-model-small-de-0.15.tar.gz
      css/
        app.css
    THIRD_PARTY_NOTICES.md
    README.md
```

Alternative für die allererste Machbarkeit:

```text
/plain-js-poc
  index.html
  voiceService.js
  model.tar.gz
```

Wenn Codex schnell prüfen soll, ob Vosk auf iPhone/Safari läuft, ist ein minimaler Plain-JS-Prototyp als erster Zwischenschritt erlaubt. Danach Integration in Blazor WASM.

---

## 8. Aufgaben für Codex

### Milestone 1: Minimaler Vosk-Browser-Test

Ziel:

- Webseite startet im Browser.
- Modell wird geladen.
- Mikrofonberechtigung wird angefragt.
- Erkannter Text wird angezeigt.
- Partial und Final Results werden sichtbar protokolliert.

Akzeptanz:

- Auf Desktop-Chrome funktioniert die Erkennung.
- Auf Android-Chrome funktioniert die Erkennung.
- Auf iPhone-Safari wird mindestens Modell + Mikrofon erfolgreich getestet oder ein sauberer Fehler angezeigt.

### Milestone 2: Offline-Caching

Ziel:

- App-Shell, JS, WASM, Modell und statische Assets werden gecacht.
- Nach erstem Laden kann im Flugmodus neu gestartet werden.

Akzeptanz:

- Vorher online laden.
- Safari schließen.
- Flugmodus aktivieren.
- Seite öffnen.
- Modell lokal laden.
- Sprache erkennen.

### Milestone 3: C#-Integration

Ziel:

- Blazor WASM erhält Speech Results aus JS.
- UI zeigt Status: `idle`, `loadingModel`, `ready`, `listening`, `error`.
- Start/Stop-Buttons.
- Debug-Log für erkannte Texte.

Akzeptanz:

- JS ruft C# Callback auf.
- C# zeigt Partial/Final Result.
- Keine Cloudaufrufe während des Erkennens.

### Milestone 4: Kartenparser

Ziel:

- Aus deutschem Erkennungstext wird eine Karte extrahiert.
- Triggerwort `nasreddin` oder phonetische Varianten werden erkannt.
- Farben und Werte werden normalisiert.

Akzeptanz:

Diese Sätze sollen erkannt werden:

```text
Nasreddin Karte Kreuz zehn
Nasreddin suche Karte Pik Dame
Nasreddin finde Herz Ass
Nasreddin Karo sieben
```

Ergebnisbeispiele:

```text
Kreuz 10
Pik Dame
Herz Ass
Karo 7
```

---

## 9. Parser-Konzept

Die Spracherkennung muss nicht perfekt sein. Der Parser soll fehlertolerant arbeiten und nur bekannte Begriffe extrahieren.

### Grundprinzip

```text
1. Text normalisieren
2. Trigger suchen
3. Text nach Trigger betrachten
4. Suit/Farbe suchen
5. Rank/Wert suchen
6. Nur gültige Kombination akzeptieren
```

### Vokabular

Trigger:

```text
nasreddin
nassreddin
nas redin
nas red din
nass red din
nas reden
```

Aktionen:

```text
suche
such
finde
zeig
zeige
```

Objekt:

```text
karte
spielkarte
```

Farben:

```text
kreuz -> kreuz
kreutz -> kreuz
treff -> kreuz
club -> kreuz
clubs -> kreuz

pik -> pik
pick -> pik
spaten -> pik
spades -> pik

herz -> herz
hertz -> herz
hearts -> herz

karo -> karo
karro -> karo
diamant -> karo
diamond -> karo
diamonds -> karo
```

Werte:

```text
ass -> ass
ace -> ass
as -> ass

zwei -> 2
zwo -> 2

 drei -> 3
vier -> 4
fünf -> 5
fuenf -> 5
sechs -> 6
sieben -> 7
acht -> 8
neun -> 9
zehn -> 10
10 -> 10

bube -> bube
junge -> bube
jack -> bube

 dame -> dame
queen -> dame

könig -> könig
koenig -> könig
king -> könig
```

Werte mit führenden/versehentlichen Leerzeichen in der Tabelle oben sollen bei der Implementierung natürlich bereinigt werden.

---

## 10. Pseudocode: Voice-Service

### JS-Schicht

```text
state = "idle"
model = null
recognizer = null
mediaStream = null
audioContext = null

async function initVoice(modelUrl, dotNetCallback) {
    state = "loadingModel"
    emitStatus(state)

    model = await Vosk.createModel(modelUrl)
    recognizer = new model.KaldiRecognizer(sampleRate = 16000)

    recognizer.on("partialresult", message => {
        dotNetCallback.invoke("OnPartialSpeech", message.result.partial)
    })

    recognizer.on("result", message => {
        dotNetCallback.invoke("OnFinalSpeech", message.result.text)
    })

    state = "ready"
    emitStatus(state)
}

async function startListening() {
    if (!model || !recognizer) throw "not initialized"

    mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate: 16000
        }
    })

    audioContext = new AudioContext()
    source = audioContext.createMediaStreamSource(mediaStream)

    // Für PoC ScriptProcessor verwenden, falls vosk-browser-Beispiel so arbeitet.
    // Später AudioWorklet prüfen, weil ScriptProcessor veraltet ist.
    processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = event => {
        recognizer.acceptWaveform(event.inputBuffer)
    }

    source.connect(processor)
    processor.connect(audioContext.destination) // ggf. vermeiden/testen

    state = "listening"
    emitStatus(state)
}

function stopListening() {
    if (mediaStream) {
        for each track in mediaStream.getTracks():
            track.stop()
    }

    if (audioContext) audioContext.close()

    state = "ready"
    emitStatus(state)
}
```

Hinweis: Der echte Code soll sich am aktuellen `vosk-browser` API-Beispiel orientieren. Das obige ist nur Pseudocode.

---

## 11. Pseudocode: Blazor-Interop

```text
class VoiceInteropService
    jsRuntime
    dotNetObjectReference

    event OnPartialText(string text)
    event OnFinalText(string text)
    event OnStatusChanged(string status)

    async InitAsync()
        dotNetObjectReference = DotNetObjectReference.Create(this)
        await js.InvokeVoidAsync("voiceService.init", "/models/model.tar.gz", dotNetObjectReference)

    async StartAsync()
        await js.InvokeVoidAsync("voiceService.start")

    async StopAsync()
        await js.InvokeVoidAsync("voiceService.stop")

    [JSInvokable]
    Task OnPartialSpeech(string text)
        OnPartialText(text)

    [JSInvokable]
    Task OnFinalSpeech(string text)
        OnFinalText(text)
        command = CardCommandParser.TryParse(text)
        if command.valid:
            RaiseCardCommand(command)
```

---

## 12. Pseudocode: Kartenparser

```text
function TryParseCardCommand(rawText):
    text = normalize(rawText)
    tokens = tokenize(text)

    triggerIndex = findFirstTrigger(tokens)
    if triggerIndex < 0:
        return invalid

    commandTokens = tokens after triggerIndex

    suit = findFirstSuit(commandTokens)
    rank = findFirstRank(commandTokens)

    if suit == null or rank == null:
        return invalid

    return CardCommand(
        IsValid = true,
        Suit = suit,
        Rank = rank,
        RawText = rawText
    )
```

Normalisierung:

```text
function normalize(text):
    text = lowercase(text)
    text = replaceUmlauts(text)
    text = removePunctuation(text)
    text = collapseWhitespace(text)
    return text
```

Trigger-Suche:

```text
function findFirstTrigger(tokens):
    candidates = [
        ["nasreddin"],
        ["nassreddin"],
        ["nas", "reddin"],
        ["nas", "redin"],
        ["nass", "red", "din"],
        ["nas", "reden"]
    ]

    for i in token positions:
        for candidate in candidates:
            if tokens at i match candidate:
                return i + candidate.length - 1

    return -1
```

Farben/Werte:

```text
function findFirstSuit(tokens):
    for token in tokens:
        if token in suitDictionary:
            return suitDictionary[token]
    return null

function findFirstRank(tokens):
    for token in tokens:
        if token in rankDictionary:
            return rankDictionary[token]
    return null
```

---

## 13. UI-Konzept für den Prototyp

Eine einzige Testseite reicht:

```text
Titel: Nasreddin Voice PoC

[Modell laden]
[Empfang starten]
[Empfang stoppen]

Status: ready/listening/error
Offline-Status: online/offline
Modell: geladen/nicht geladen
Mikrofon: erlaubt/nicht erlaubt

Partial:
> ...

Final:
> nasreddin karte kreuz zehn

Erkannter Befehl:
> Kreuz 10

Log:
Zeit | Typ | Text | Parser-Ergebnis
```

Für iPhone-Test wichtig:

- Große Buttons.
- Kein kleines Debug-UI.
- Klarer Status „BEREIT“.
- Fehler sichtbar ausgeben.
- Eine Prüfroutine „Offline-Check“ einbauen.

---

## 14. Offline-/Caching-Konzept

Assets, die offline verfügbar sein müssen:

```text
/index.html
/_framework/*          Blazor WASM Dateien
/js/voiceService.js
/service-worker.js
/manifest.webmanifest
/models/model.tar.gz   Vosk-Modell
/css/*
```

Anforderungen:

- Das Modell darf nicht erst während der Vorführung aus dem Netz geladen werden.
- Service Worker muss das Modell explizit cachen.
- Optional: Modell zusätzlich in Cache Storage oder IndexedDB ablegen.
- Beim Start prüfen, ob Modell offline verfügbar ist.
- Bei fehlendem Modell klare Fehlermeldung anzeigen: „Modell nicht lokal verfügbar. App einmal online vollständig starten.“

Pseudocode:

```text
onAppStart:
    show online/offline state
    check cache contains model
    if model missing:
        show "Nicht showbereit"
    else:
        show "Modell lokal verfügbar"
```

Offline-Testablauf:

```text
1. Webseite online über HTTPS öffnen.
2. Modell laden.
3. Erfolgreichen Mikrofontest durchführen.
4. Safari schließen.
5. Flugmodus aktivieren.
6. Webseite erneut öffnen.
7. Modell muss aus Cache laden.
8. Befehl sprechen.
9. Karte muss erkannt werden.
```

---

## 15. iPhone/Safari-Risiken

Diese Punkte sind im Prototypen aktiv zu testen:

1. Lädt Safari das Vosk-WASM korrekt?
2. Funktioniert `getUserMedia()` im normalen Safari-Tab?
3. Funktioniert es auch, wenn die Seite als Home-Screen-Web-App gespeichert wird? Das ist optional, aber interessant.
4. Wird das große Modell zuverlässig im Browser-Cache gehalten?
5. Wird das Modell nach einiger Zeit oder Speicherdruck gelöscht?
6. Stoppt Audio, wenn der Bildschirm ausgeht? Erwartung: Ja oder zumindest unsicher. Die App muss im Vordergrund bleiben.
7. Funktioniert längeres Zuhören von 3 bis 5 Minuten?
8. Wird das AudioContext-Starten nur nach User-Geste erlaubt? Erwartung: Start über Button auslösen.

Empfehlung:

- Für die Vorführung Bildschirm aktiv halten.
- App im Vordergrund lassen.
- Vor der Show einen Systemcheck durchführen.
- Nicht darauf verlassen, dass Hintergrundbetrieb funktioniert.

---

## 16. Testphrasen

### Positive Tests

```text
Nasreddin Karte Kreuz zehn
Nasreddin suche Karte Kreuz zehn
Nasreddin finde Karte Pik Dame
Nasreddin zeige Karte Herz Ass
Nasreddin Karo sieben
Nasreddin Karte Karo König
Nasreddin suche Herz Bube
Nasreddin Pik neun
```

### Negative Tests

Diese sollen keine Aktion auslösen:

```text
Kreuz zehn
Ich suche eine Karte
Das ist die Herz Dame
Nasreddin erzähle etwas
Karo König liegt auf dem Tisch
Zeige mir irgendeine Karte
```

### Fehlhörer beobachten

Bei jedem Test speichern:

```text
Gesprochener Satz
Erkannter Rohtext
Parser-Ergebnis
korrekt? ja/nein
Latenz geschätzt
Gerät/Browser
Umgebung laut/leise
```

---

## 17. Akzeptanzkriterien für den ersten brauchbaren Prototyp

Der Prototyp gilt als erfolgreich, wenn:

```text
1. iPhone Safari kann das Modell laden.
2. iPhone Safari kann Mikrofon-Audio an Vosk liefern.
3. Offline-Start nach vorherigem Online-Laden funktioniert.
4. Mindestens 4 Testkarten werden zuverlässig erkannt.
5. Keine Cloud-/Netzwerkanfrage ist während der Erkennung nötig.
6. Es gibt sichtbare Debug-Ausgaben.
7. Der Parser löst nicht bei negativen Tests aus.
8. Start/Stop funktioniert wiederholt ohne Reload.
```

Optionales Ziel:

```text
9. 3 Minuten Zuhören ohne Absturz oder merkliche Degradation.
10. Trefferquote > 80 % in ruhiger Umgebung.
```

---

## 18. Lizenz- und Veröffentlichungsnotizen

Eigener Anwendungscode kann z. B. unter CC0/Public Domain gestellt werden.

Drittkomponenten behalten ihre Lizenz:

```text
Vosk API: Apache-2.0
vosk-browser: Apache-2.0
vosk-model-small-de-0.15: Apache-2.0
```

Empfehlung:

- `LICENSE` für eigenen Code.
- `THIRD_PARTY_NOTICES.md` für Vosk, vosk-browser und Modell.
- Keine proprietären Dienste oder AccessKeys einbauen.
- Keine Beta-/Preview-Versionen verwenden.

---

## 19. Wichtige technische Entscheidungen für Codex

Codex soll Folgendes bevorzugen:

```text
- stabile Releases / stabile npm-Pakete
- einfache Architektur
- JS-Spracherkennung gekapselt
- C# Parser getrennt testbar
- Debugbarkeit vor Schönheit
- kein Cloudzugriff
- keine Secrets
- keine Anbieter-Keys
- keine Web Speech API als Hauptpfad
```

Codex soll Folgendes vermeiden:

```text
- Rhino/Picovoice
- Cloud Speech-to-Text
- OpenAI API
- Azure/Google/Deepgram
- native iOS-App
- React Native/Expo für diesen Prototyp
- Beta-Pakete
- komplexe KI/NLP-Logik
```

---

## 20. Empfohlener Prompt für Codex

```text
Du sollst einen Prototypen für eine offlinefähige C# Blazor WebAssembly PWA bauen.

Ziel:
Eine Smartphone-Webapp, primär iPhone/Safari, erkennt offline über das Mikrofon einfache deutsche Kartenbefehle wie „Nasreddin Karte Kreuz zehn“.

Technischer Hauptansatz:
- Vosk / vosk-browser im Browser über WebAssembly.
- Deutsches Modell: vosk-model-small-de-0.15.
- Keine Cloud, keine Web Speech API als Hauptlösung, keine Picovoice/Rhino, keine AccessKeys.
- Alle Assets inklusive Modell müssen offline cachebar sein.
- C# erhält Speech Results über JS Interop.
- Der Parser in C# extrahiert Triggerwort, Kartenfarbe und Kartenwert.

Bitte arbeite in Milestones:
1. Minimaler Vosk-Browser-Test mit Mikrofon und Anzeige von Partial/Final Results.
2. Blazor WASM Integration über JS Interop.
3. Offline-Caching von App und Modell.
4. Kartenparser mit Testphrasen.
5. iPhone/Safari-Testhinweise und Debug-UI.

Randbedingungen:
- Nur stabile Pakete verwenden.
- Keine Secrets, keine kommerziellen Dienste.
- Saubere Fehlermeldungen, wenn Modell/Mikrofon/Offline-Cache nicht funktionieren.
- Der Code soll einfach und nachvollziehbar sein, nicht maximal abstrakt.

Erzeuge zuerst eine Projektstruktur und eine kurze technische Begründung. Danach implementiere den kleinsten lauffähigen Prototypen.
```

---

## 21. Offene Fragen, die der Prototyp beantworten soll

```text
1. Funktioniert vosk-browser praktisch auf iPhone Safari?
2. Ist die Performance mit vosk-model-small-de-0.15 ausreichend?
3. Wird „Nasreddin“ brauchbar erkannt, oder brauchen wir ein anderes Triggerwort?
4. Reicht normale Textauswertung oder brauchen wir eingeschränktes Vokabular/Grammar?
5. Funktioniert Offline-Caching des Modells zuverlässig?
6. Wie groß ist die Latenz auf iPhone?
7. Funktioniert längeres Zuhören über mehrere Minuten?
8. Wie häufig entstehen gefährliche False Positives?
```

---

## 22. Mögliche Fallbacks

Wenn Vosk nicht reicht:

1. Whisper.cpp WASM prüfen  
   Vorteil: bessere Erkennungsqualität möglich.  
   Nachteil: größere Modelle, mehr CPU/RAM, eventuell höhere Latenz.

2. Sherpa-ONNX WASM prüfen  
   Vorteil: Offline, ASR/VAD/KWS, Apache-2.0.  
   Nachteil: komplexere Modellwahl und Integration.

3. Triggerwort ändern  
   Statt „Nasreddin“ ein phonetisch robusteres Wort verwenden.

4. Ritualisierte Sprache verwenden  
   Zum Beispiel nur: `Nasreddin Karte Kreuz zehn`.  
   Weniger natürliche Sprache, dafür technisch stabiler und im Zauberkontext sogar plausibel.

---

## 23. Zusammenfassung

Vosk/`vosk-browser` ist der aktuell beste Kandidat für diesen Prototypen, weil es zur Lizenz-, Offline- und Public-Domain-nahen Veröffentlichungsstrategie passt. Der technische Kern ist nicht freie perfekte Transkription, sondern eine lokale Erkennung plus sehr robuster Parser für eine kleine bekannte Befehlswelt.

Der wichtigste erste Test ist nicht der Parser, sondern:

```text
Kann iPhone Safari Vosk-Browser + deutsches Modell + Mikrofon + Offline-Cache zuverlässig ausführen?
```

Wenn ja, ist die weitere Anwendung relativ klar: Vosk liefert Text, C# extrahiert daraus Kartenbefehle.
