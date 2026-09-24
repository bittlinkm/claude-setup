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
- TDD als Standard: erst Test (rot), dann Code (grün).
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
  syncen (s. CMS-Regel unten), dann von `dev` abzweigen.

## Deployment (Cloudflare Workers Builds)
- Standard-Hosting: Cloudflare Worker, Auto-Deploy über die Git-Integration
  (Workers Builds), keine eigene GitHub Action.
- Zwei Worker-Services, je einer pro Branch:
  - `<projekt>-dev` ← Production-Branch `dev` (Staging, `*.workers.dev`).
  - `<projekt>` ← Production-Branch `main` (Live).
- Deploy passiert automatisch beim Merge auf den jeweiligen Branch. Status
  prüfen über die GitHub Check-Runs "Workers Builds: <service>"
  (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`).
- Kein manuelles `wrangler deploy` / `npm run deploy` ohne Go (No-Go
  Deployment); Merge nach `main` = Live-Deploy → nur mit Go.
- Stolperfallen:
  - Jeder Service bekommt im Dashboard einen eigenen Deploy-Command
    `npx wrangler deploy --name <service>`. Ohne `--name` muss `name` in
    `wrangler.jsonc` zum Service passen, sonst schlägt der Build fehl.
  - Dashboard-Warnung "Update wrangler.jsonc … name" ist bei zwei Services
    unvermeidbar → ignorieren. Cloudflares Auto-PR, der `name` ändert, nie
    mergen (Risiko: `dev`-Deploys landen auf Live).
  - Deploy überschreibt Plain-Text-`vars` mit dem Stand aus `wrangler.jsonc`
    → öffentliche Werte (z. B. OAuth Client-ID) in `wrangler.jsonc` pflegen,
    nicht im Dashboard. Secrets (`wrangler secret put` / Dashboard) bleiben
    erhalten, lokal in `.dev.vars` (gitignored, `.dev.vars.example` committen).
  - Neue Secrets greifen erst nach dem nächsten Deploy (ggf. leerer
    `chore: redeploy`-Commit).
  - Beide Services bauen aus demselben `wrangler.jsonc`; welcher Worker
    getroffen wird, steuert `npx wrangler deploy --name <service>` im
    Deploy-Command des Services. `--name` = exakter Service-Name halten
    (Tippfehler fallen nicht auf — Check-Run "Script: <service>" zeigt das
    tatsächliche Ziel).
- CMS (z. B. Sveltia) darf direkt auf `main` committen (Content geht sofort
  live). Dann `main` regelmäßig nach `dev` zurückholen: Fast-Forward, wenn
  `dev` nichts Eigenes hat
  (`git push origin origin/main:refs/heads/dev`, einzige erlaubte Ausnahme
  vom Direkt-Push auf `dev`), sonst PR `main` → `dev`. Konflikte sind bei
  reinem Content selten, möglich aber, wenn `dev` dieselben Content-Dateien
  oder das Schema (Felder) geändert hat.

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
