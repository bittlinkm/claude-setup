# Definition of Done (DoD)

The Definition of Done describes the binding criteria that must be satisfied for a User Story to count as **"Done."** "Done" means **releasable** (technically shippable), even if the actual release happens later for organizational reasons. The DoD is the official quality gate between *In Arbeit* and *Erledigt* and is applied consistently. This is the org-wide baseline; a project may extend it — check for project-specific additions before treating this list as exhaustive.

There are three levels: **User Story**, **Sprint**, and **Release**. Check whichever level the user is actually asking about — most requests will be about a single User Story or PR; only check Sprint/Release criteria if that's what's being closed out.

## DoD — User Story

### 1. Funktion & Akzeptanz
- Alle Akzeptanzkriterien der User Story sind erfüllt
- Die fachliche Umsetzung entspricht der Story-Beschreibung
- Die User Story wurde vom Product Owner abgenommen

### 2. Code-Qualität & Standards
- Coding Guidelines des Projekts wurden eingehalten
- Alle geänderten Dateien sind formatiert (IDE-/Projektstandard)
- Code Style Regeln: Warnings im geänderten Code wurden behoben; Suggestions wurden – soweit sinnvoll – berücksichtigt
- Der Source Code kompiliert/buildet ohne Fehler und ohne Warnungen

### 3. Tests
- Für alle Änderungen wurden – soweit sinnvoll – Unit Tests geschrieben
- Alle Unit Tests laufen erfolgreich
- Funktionale Tests für betroffene Features wurden durchgeführt
- Relevante Integrations- und Regressionstests wurden erfolgreich abgeschlossen

### 4. CI / Build & Prüfung
- Alle CI-Pipelines laufen erfolgreich ohne Errors und Warnings
- Es bestehen keine offenen statischen Analyse-Fehler (z. B. Issues in SonarQube)

### 5. Pull Request & Review
- Ein Pull Request wurde erstellt
- Code Review durch mindestens einen anderen Entwickler wurde durchgeführt
- Review-Feedback wurde umgesetzt oder begründet kommentiert
- Der Pull-Request-Titel entspricht den Commit Message Regeln
- Im Pull Request ist bestätigt, dass die DoD erfüllt ist

### 6. Dokumentation
- Technische Dokumentation wurde – falls notwendig – aktualisiert
- Betriebs- bzw. Konfigurationsänderungen sind dokumentiert

### 7. Branch- & Deployment-Status
- Feature-Branch ist gemerged
- Veraltete Branches sind geschlossen oder gelöscht
- Features wurden – falls sinnvoll – nach Merge manuell überprüft

### 8. Compliance & Security
- Secure-Coding-Vorgaben wurden eingehalten
- Sicherheitsanforderungen aus Akzeptanzkriterien sind umgesetzt
- Keine bekannten Security- oder Compliance-Verstöße vorhanden
- Änderungen sind nachvollziehbar dokumentiert (Ticket / PR / Doku)

## DoD — Sprint

Ein Sprint gilt als **Done**, wenn:
- Die DoD aller im Sprint enthaltenen User Stories erfüllt ist
- Alle "TODOs" und technischen Schulden aus dem Sprint erledigt sind
- Der Product Backlog aktualisiert wurde
- Das Inkrement in einer Testumgebung bereitgestellt ist
- Der Sprint vom Product Owner als **abnahmefähig** markiert wurde

## DoD — Release

Ein Release gilt als **Done**, wenn zusätzlich:
- Alle Unit-, Integrations- und Systemtests grün sind
- QA abgeschlossen ist und keine offenen Blocker bestehen
- Alle beteiligten Rollen zustimmen (PO, Dev, QA, ggf. Architekt)
- Keine unfertigen Arbeiten in Dev- oder Staging-Umgebungen verbleiben

## What Claude can and can't verify from text alone

Many DoD items describe **system state**, not something visible in a story description or diff — e.g. "CI-Pipelines laufen erfolgreich," "Code Review wurde durchgeführt," "Alle Unit Tests laufen erfolgreich," "Feature-Branch ist gemerged." Don't mark these ✅ just because nothing contradicts them in the text you were given — that's a false pass. Mark them **❓ nicht prüfbar** and say what would need to be checked (e.g. "check the PR's CI status page," "confirm the review was actually approved, not just requested") rather than assuming compliance.

Items that describe **content** you were actually given — the story text, the diff, the PR description — can genuinely be evaluated: whether acceptance criteria are met by the described change, whether the PR title follows the commit convention, whether docs were updated in the diff, etc. Be honest about the difference between "I can see this is true" and "I have no way to know."
