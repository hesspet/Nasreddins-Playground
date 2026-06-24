# Aufgabe

Erstelle eine PWA C# Client-only Anwendung die fähig ist deutschen gesprochen Text via Mikrofon aufzunehmen und als transkribierten Text wiederzugeben.

# Festlegungen

* die Anwendung soll, wenn technisch, in sinnvollen Rahmen möglich, offline betreibbar sein. Alternativ kann auch in Internet Service, LLM oder ähnliches genutzt werden. Dies aber nur wenn es sich als unüberwindlich darstellt eine Transkription "smartphone only" zu realisieren. Ggf. kann auch über ein Blazor Server Backend nachgedacht werden.

* Zielplatformen: iOS(zwingend,Prämisse,keine Kompromisse!), Android, Windows (nur für Integrationstest). 

* Speicherverbrauch als PWA max. 500 MB um eine noch aktzeptable Ladezeit zu erreichen

* Baue ein GUI zum Testen

  * mit Audiokontrolle "Levelmeter"
  * Sprachanleitung oder spezielle Informationen bitte direkt als Führungstext
  * Layout Smartphone, responsive, freie Gestaltung, die Anwendung ist ein Prototype um die Technologie zu erforschen

* Sprachen Deutsch und Englisch, kein Mischbetrieb

* Transkription von kurzen Sätzen (ca. 10 Worte) unter 2 Sekunden

* Lösung soll kostenfrei, nur mit geringen Kosten verbunden sein, da es eine Public Domain Anwendung wird. LLM Kosten für Key etc. können unberücksichtigt bleiben

* c# Projekt/.net10 Framework

* Freie Libs sowohl JS als auch C# möglichst minimal

  * Ein eigenes Dokument OpenSource.md anlegen und kurz die verwendeten Biblothenken beschreiben

* Pflege "PROJEKTUEBERSICHT.md"

* Transkription für verschiedene Sprecher. Nicht gleichzeitig. Immer nur ein Sprecher. Aber verschiedene Anwender

* Kein oder nur sehr geringes Training

* Beschreibe in PROJEKTUEBERSICHT.md die Gründe für die Technologiewahl

* Wenn ein Client Only Betrieb als nicht darstellbar gilt, bitte weitere Entscheidungen durch Rückfragen klären.

* Typische Sätze die transkribiert werden sollen, betreffen Spielkarten, Zauberrei. 

* Dauerhafte Aufnahmesituation nicht notwendig.  Start Transkritpion per button. Transkirption on user request

  

Rückfragen für unklare Punkte!