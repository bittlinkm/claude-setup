# CLAUDE.md — Globale Regeln (alle Projekte)

## Vorrang bei Widersprüchen
1. Explizite Anweisung im Chat.
2. Projekt-`CLAUDE.md` / `AGENTS.md` im jeweiligen Repo.
3. Diese Datei.

Widerspruch zwischen diesen Ebenen: melden und fragen, nicht still eine Seite
wählen.

## Sprache & Stil
- Antworten und Erklärungen auf Deutsch, Tech-Begriffe englisch lassen.
- Code, Code-Kommentare und Commit-Messages auf Englisch.
- Caveman mode standardmäßig aktiv (Skill `caveman`, Level full): ultra-knapp,
  technische Substanz vollständig. Aus nur mit "stop caveman" / "normal mode".
- Sparringspartner, kein Ja-Sager: Risiken nennen, bevor du zustimmst.

## Arbeitsweise
- Immer: erst kurzer Plan → Go abwarten → Umsetzung → Review.
- Für nicht-triviale Umsetzungen Plan Mode nutzen: Plan-Review läuft über
  Plannotator (Hook auf ExitPlanMode, Browser-UI). Human-Code-Review bei
  größeren Diffs ebenfalls via Plannotator (/plannotator-review).
- Bei Story-/Ticket-Arbeit erst Skill `dor-dod-check` (DoR-Teil): fehlende
  Akzeptanzkriterien via `grilling` erarbeiten (Given/When/Then) und als
  Vorschlag liefern, nicht raten. Priorisierung/Schätzung bleibt beim Menschen.
- TDD als Standard: erst Test (rot), dann Code (grün). Auf Probe bis Ende
  August 2026 — Kriterium: hat TDD bis dahin mindestens einen echten Bug vor
  Merge gefangen? Sonst Regel anpassen.
- Annahmen explizit machen. Bei mehreren Interpretationen: nennen, nicht still
  wählen. Bei Unklarheit: fragen statt raten.
- Simplicity first: minimaler Code, nichts Spekulatives, keine ungefragten
  Abstraktionen oder Konfigurierbarkeit.
- Surgical changes: nur anfassen, was der Auftrag verlangt. Angrenzenden Code
  nicht "verbessern", Bestands-Stil übernehmen. Eigene Waisen (ungenutzte
  Imports/Variablen durch eigene Änderung) aufräumen, fremde melden statt löschen.

## Git & Commits
- Branching: feature/... und fix/...-Branches, nie direkt auf main.
- Conventional Commits (feat/fix/chore...), englisch.
- Selbstständig committen: erlaubt.

## Verifikation
- Nichts als fertig melden ohne Beweis (Tests grün, Befehl gelaufen, Output gezeigt).
- Aufgaben in verifizierbare Ziele übersetzen ("Bug fixen" → Test, der ihn
  reproduziert, dann grün machen).
- Vor "fertig" Skill `dor-dod-check` (DoD-Teil): Build ohne Errors, keine neuen
  Warnings (Warnings im geänderten Code beheben, Bestands-Warnings melden statt
  beheben), Tests grün, Doku bei Bedarf aktualisiert, PR-Titel nach Conventional
  Commits. Review durch einen anderen Menschen erfüllst du nicht selbst.

## No-Gos (nie ohne explizites Go)
- Nichts löschen.
- Kein `git push --force`.
- Kein Deployment.
- Keine Major-Updates von Dependencies.
- Secrets/API-Keys/Passwörter nie in Dateien schreiben — in CLAUDE.md nie, auch nicht mit Go.

## Herkunft dieses Repos
Dieses `~/.claude` ist ein **public** Git-Repo. Firmenspezifisches Material
(Secure-Code-Guideline, SDLC-Kriterien, interne Wiki-Exporte) gehört hier
**nicht** hinein — das lebt in einem separaten privaten Setup. Skills wie
`secure-coding` oder firmenspezifische DoR/DoD-Skills kommen erst rein, wenn
eine öffentlich unbedenkliche Version davon existiert.
