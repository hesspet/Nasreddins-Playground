# Aufgabe

Erstelle eine PWA C# Client-only Anwendung die fähig ist deutschen gesprochen Text via Mikrofon aufzunehmen und als transkribierten Text wiederzugeben.

# Festlegungen

* die Anwendung soll, wenn technisch, in sinnvollen Rahmen möglich, offline betreibbar sein. Alternativ kann auch in Internet Service, LLM oder ähnliches genutzt werden. Dies aber nur wenn es sich als unüberwindlich darstellt eine Transkription "smartphone only" zu realisieren. Ggf. kann auch über ein Blazor Server Backend nachgedacht werden.

* Zielplatformen: iOS, Android, Windows (nur für Integrationstest). iOS ist der wichtigste Aspekt

* Speicherverbrauch als PWA max. 500 MB um eine noch aktzeptable Ladezeit zu erreichen

* Baue ein GUI zum Testen

  * mit Audiokontrolle "Levelmeter"
  * Sprachanleitung oder spezielle Informationen bitte direkt als Führungstext
  * Layout Smartphone, responsive, freie Gestaltung, die Anwendung ist ein Prototype um die Technologie zu erforschen

* Erfassungssprachen Deutsch und Englisch, kein Mischbetrieb

* Erfassung/Transkription von kurzen Sätzen unter 1-2 Sekunden

* Lösung soll kostenfrei oder nur mit geringen Kosten verbunden sein, da es eine Public Domain Anwendung später werden soll. Ggf. LLM Kosten für Key etc. können unberücksichtigt bleiben

* c# Projekt basis .net10 Framework, Visual Studio 2026 tauglich

* Freie Libs sowohl JS als auch C# sollen nach bedarf gewählt werden

  * Ein eigenes Dokument OpenSource.md anlegen und kurz die verwendeten Biblothenken beschreiben

* Pflege "PROJEKTUEBERSICHT.md"

* Das Transkriptionssystem soll mit verschiedenen Sprechern umgehen können. Kein oder nur sehr geringes Training

* Beschreibe in PROJEKTUEBERSICHT.md die Gründe für die Technologiewahl

* Wenn ein Client Only Betrieb als nicht darstellbar gilt, bitte weitere Entscheidungen durch Rückfragen klären.

* Typische Sätze die transkribiert werden sollen, betreffen Spielkarten, Zauberrei. 

* Aktivierungswörter für den Start können genutzt werden

* Es ist nicht notwendig eine dauerhafte Aufnahmesituation zu schaffen.  Ein Start Transkritpionsbutton ist gewünscht. Es muss also nicht ständig der Audiostrom überwacht werden, sondern nur auf Aufforderung.

  

Stelle Rückfragen für unklare Punkte im Promt