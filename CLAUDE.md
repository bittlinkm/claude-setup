# CLAUDE.md — Globale Regeln (alle Projekte)

## Vorrang bei Widersprüchen
1. Explizite Anweisung im Chat.
2. Projekt-`AGENTS.md` im jeweiligen Repo.
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
- TDD Pflicht in jedem Projekt, keine Ausnahme: erst Test (rot), dann Code
  (grün). Keine Code-Änderung ohne zugehörigen Test. Projekt ohne Test-Setup:
  Test-Setup zuerst einrichten (Framework-Standard, z. B. Vitest/Jest bzw. xUnit).
- Jedes Projekt braucht eine `AGENTS.md` im Repo-Root für projektspezifisches
  Wissen (Stack, Befehle, Konventionen, Stolperfallen, Entscheidungen). Fehlt
  sie: anlegen (Vorschlag zeigen, dann committen). Neues Projektwissen dort
  festhalten, nicht in dieser globalen Datei. Im Projekt nur `AGENTS.md`, keine
  `CLAUDE.md`/`CLAUDE.local.md` (würde das Laden der `AGENTS.md` verhindern).
  `CLAUDE.md` ist nur für das globale Claude-Setup in `~/.claude`.
- Annahmen explizit machen. Bei mehreren Interpretationen: nennen, nicht still
  wählen. Bei Unklarheit: fragen statt raten.
- Simplicity first: minimaler Code, nichts Spekulatives, keine ungefragten
  Abstraktionen oder Konfigurierbarkeit.
- Surgical changes: nur anfassen, was der Auftrag verlangt. Angrenzenden Code
  nicht "verbessern", Bestands-Stil übernehmen. Eigene Waisen (ungenutzte
  Imports/Variablen durch eigene Änderung) aufräumen, fremde melden statt löschen.

## Tech Stack
- Frontend: Angular oder Astro.
- Backend: nur wenn nötig, dann C#.

## Tools & Ressourcen
- UI-Components bei Bedarf über 21st.dev (https://21st.dev/) laden oder
  als Component-Inspiration nutzen, statt selbst zu bauen.
- Bei Frontend-Design-Arbeit: Skill `impeccable` nutzen (deckt Bold/
  Distinctive Design, keine generischen AI-Aesthetics ab).
- Vor Design-Umsetzung: User-Vorstellungen klären via Skill
  `superpowers:brainstorming` (+ ggf. AskUserQuestion-Tool), nicht raten.
- Performance-optimiert bauen (Core Web Vitals im Blick behalten).
- Diagramme: immer via Skill `excalidraw-diagram` erstellen.
- NotebookLM (MCP `notebooklm`) für Recherche/Doku-Q&A mit Quellenangaben
  nutzen — nicht für Code-Generierung.

## Git & Commits
- Neues Repo: immer `main` + `dev` anlegen, `dev` als Default-Branch.
- Branching: feature/... und fix/...-Branches von `dev`, nie direkt auf main
  oder dev.
- Bestandsrepo ohne `dev`-Branch: kurzer Hinweis, dass `dev` nachgezogen
  werden sollte — nicht selbstständig anlegen.
- Conventional Commits (feat/fix/chore...), englisch.
- Selbstständig committen: erlaubt.
- Flow: `feature/...`/`fix/...` → PR nach `dev` → PR `dev` → `main`. Kein
  direkter Push auf `dev`/`main`. PRs öffnen ja, mergen erst nach Go des Users
  (außer Batch explizit freigegeben) — Merge löst Deployment aus (s. u.).
- Vor jedem neuen Branch: `git fetch`, dann prüfen, ob `main` Commits hat,
  die `dev` fehlen (`git log origin/dev..origin/main`). Falls ja, erst `dev`
  syncen (s. Deployment), dann von `dev` abzweigen.

## Deployment (Cloudflare Workers Builds)
- Standard-Hosting: Cloudflare Worker je Branch (`<projekt>-dev` ← `dev`,
  `<projekt>` ← `main`), Auto-Deploy über Workers Builds. Setup, Stolperfallen,
  Deploy-Status, CMS-Sync → Skill `cloudflare-workers-deploy`.
- Kein manuelles `wrangler deploy` / `npm run deploy` ohne Go; Merge nach
  `main` = Live-Deploy → nur mit Go.
- CMS darf direkt auf `main` committen; dann `main` → `dev` syncen
  (Fast-Forward-Push auf `dev` = einzige erlaubte Direkt-Push-Ausnahme).

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

Bei jedem Sessionstart (egal auf welcher Maschine) prüft ein `SessionStart`-
Hook in `settings.json` automatisch per `git fetch`, ob `~/.claude` hinter
`origin/main` hängt, und warnt falls ja — kein automatischer Pull, nur
Hinweis. Kommt via Git-Pull auf jede Maschine mit, auf der dieses Repo liegt.
