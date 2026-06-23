# Briefing: Offline-Spracherkennung mit Vosk in einer C# Blazor WASM/PWA

## 1. Ausgangslage

Es soll eine Smartphone-taugliche Webanwendung entstehen, als **C# Blazor WebAssembly PWA**. Sie muss auf einem Smartphone laufen und soll Sprache über das Mikrofon auswerten.

Wichtige Prämissen:

- Zielgerät: primär **iPhone / Safari**, zusätzlich Android/Chrome als Vergleich sinnvoll.
- Die Anwendung muss **offline** funktionieren.
- Keine Cloud-Spracherkennung.
- Kein Internet während der Nutzung voraussetzen.
- PWA muss nicht zwingend installierbar sein; eine normale HTTPS-Webseite in Safari ist akzeptabel, solange nach vorherigem Laden Offlinebetrieb möglich ist.
- Die App soll öffentlich / frei verteilbar sein.
- Keine Beta-/Pre-Release-Abhängigkeiten verwenden.
- Speichergröße ist auf dem Smartphone nicht das Hauptproblem; aber Browser-Cache/Storage und iOS-Safari-Verhalten müssen beachtet werden.

---

## 2. Fachliches Ziel des Prototyps

Die App wird vom Anwender aktiv auf „Empfang“ gestellt. Danach hört sie im Vordergrund für einige Minuten mit und wartet auf einen bekannten Satz oder ein Schlüsselwort innerhalb eines Satzes.

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

Die App soll z.B. daraus extrahieren:

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
- Erkannte Karte sichtbar ausgeben, z. B. `Kreuz 10`. Nur Text!
- Offline-Test bestehen: Seite vorher laden, danach Flugmodus, dann erneut starten und Befehl erkennen.

---

## 3. Vosk / vosk-browser

---

- soll genutzt werden
  

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

Begründung: Für eine kleine bekannte Befehlswelt ist das kleine Modell ausreichend und wesentlich handlicher.

Hinweis zur Implementation

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

## 8. Aufgaben

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

---

## 19. Wichtige technische Entscheidungen

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

## 20. Prompt

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

## 22. Deployment

* Die Anwendung soll unter Githup Pages via Actions deployed werden können
* Testdeployment zum Teste wie IIsExpress lokal mit https
