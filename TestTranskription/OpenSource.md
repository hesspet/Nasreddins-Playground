# Open Source

Dieses Projekt nutzt die folgenden frei verfugbaren Komponenten:

- .NET 10 / ASP.NET Core Blazor WebAssembly: Microsoft Open-Source-Framework fur die clientseitige C# PWA.
- Bootstrap: vom Blazor Template mitgelieferte statische Assets; die aktuelle Test-GUI referenziert sie nicht aktiv.
- Browser Web APIs: Web Speech API fur SpeechRecognition und MediaDevices/Web Audio API fur Mikrofonzugriff und Levelmeter.

Es wurde kein externer Speech-to-Text-Dienst, kein LLM und kein eigener Server integriert. Die Web Speech API ist eine Browserfunktion; Verfugbarkeit, Qualitat und Offline-Fahigkeit hangen vom Browser, Betriebssystem und Gerat ab.
