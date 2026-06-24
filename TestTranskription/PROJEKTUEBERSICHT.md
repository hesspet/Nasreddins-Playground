# Projektübersicht - TestTranskription

## Ziel

Client-only Blazor WebAssembly PWA als Prototyp zur Transkription kurzer gesprochener Satze uber das Smartphone-Mikrofon. Fokus ist ein schneller Technologietest fur Deutsch und Englisch ohne Mischbetrieb.

## Technologiewahl

- .NET 10 Blazor WebAssembly PWA, damit die Anwendung als C# Client-only App in Visual Studio 2026 nutzbar ist.
- Browser Web Speech API via JS-Interop als kostenfreie SpeechRecognition-Losung ohne eigenes Backend und ohne API-Key.
- MediaDevices und Web Audio API fur Mikrofonfreigabe und ein browserseitiges Levelmeter.
- PWA Service Worker aus dem Blazor Template fur eine offline startbare App-Shell.

## Wichtige Einschrankung

Die PWA-App-Shell kann nach Installation offline funktionieren. Die eigentliche SpeechRecognition-Engine ist jedoch browser- und plattformabhangig. Viele Browser verwenden dafur Online-Dienste oder schalten die Funktion auf bestimmten Plattformen gar nicht frei. Offline-Transkription ist mit dieser Web-Speech-Variante daher nicht garantiert.

## GUI

- Smartphone-responsive Startseite mit Start/Stop-Transkriptionsbutton.
- Sprachwahl Deutsch (`de-DE`) oder Englisch (`en-US`), gesperrt wahrend einer laufenden Aufnahme.
- Mikrofon-Levelmeter uber den aktiven Audiostream.
- Anzeige finaler Transkripte und laufender Zwischenergebnisse.
- Fuhrungstext mit Beispielinhalten aus Spielkarten/Zauberei.

## Annahmen

- Kurze Satze von 1 bis 2 Sekunden sind der primare Testfall.
- Es wird kein permanentes Aktivierungswort umgesetzt; die Aufnahme startet bewusst per Button.
- Die App speichert keine Transkripte dauerhaft und sendet keine Daten an ein eigenes Backend.
- Aktuelle Projektversion ist `0.2.0`.

## Tools

- `../Tools/Start-Lokaler-Test.ps1` veroffentlicht `TestTranskription` lokal fur IIS Express und optionale ngrok-Tests auf Smartphones.
- `../Tools/Build-GitHubPagesRelease.ps1` erzeugt einen GitHub-Pages-Releasebuild mit Base-Href `/TestTranskription/`, Service-Worker-Base und SPA-404-Fallback.
- `../Tools/GenerateBuildInfo.ps1` erzeugt Buildinformationen im Namespace `TestTranskription`.

## Offene Rückfragen

- Soll fur iOS ein Fallback auf eine native/hybride Losung gepruft werden, falls Safari/WebKit SpeechRecognition im Zielsetup nicht zuverlassig arbeitet?
- Sollen erkannte Zauber-/Kartensatze spater strukturiert normalisiert werden, z. B. Karte, Farbe, Aktion?
- Wird eine vollstandig offline fahige STT-Engine akzeptiert, wenn dadurch Modell-Downloads und Speicherbedarf deutlich steigen?
