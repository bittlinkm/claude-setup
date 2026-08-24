# Setup auf neuem Rechner

Checkliste für frischen PC. Keine Keys hier eintragen — nur Befehle, Keys
werden pro Maschine neu erzeugt/eingegeben.

## Voraussetzungen
- Claude Code installiert, mit eigenem Account eingeloggt.
- Python 3.10+ mit pip.
- Node.js mit npx.
- Git.

## Repo
Dieses `~/.claude` ist ein Git-Repo (public) — klonen bzw. pullen, dann
enthält CLAUDE.md/Skills/Settings direkt alle Standing Rules.

## claude.ai Connectors (Notion, Make, Netlify)
Laufen als OAuth-Connector über den claude.ai-Account, nicht lokal
installiert. Nach Login mit demselben Account i.d.R. schon verfügbar.
Falls nicht: claude.ai → Settings → Connectors → jeweils verbinden.
Check: `claude mcp list`

## NotebookLM (MCP)
```
pip install "notebooklm-py[mcp]"
notebooklm login                       # interaktiv, Google-Login im Browser
notebooklm mcp install claude-code     # schreibt MCP-Config in ~/.claude.json
```
Verifizieren: `notebooklm auth check --test --json`

Falls `uvx` nicht installiert ist, schlägt der generierte MCP-Server-Start
fehl (Config nutzt `uvx` als Command). Fix: in `~/.claude.json` unter
`mcpServers.notebooklm` `command` auf `notebooklm-mcp` (den von pip
installierten Entrypoint) ändern.

### NotebookLM-Login auf headless Server (VPS, keine GUI)
`notebooklm login` öffnet echtes Chromium für Google-OAuth — auf einer
Maschine ohne Display schlägt das auf mehreren Ebenen fehl. Alle drei Fixes
nötig, in dieser Reihenfolge:

1. **X-Server bereitstellen** (Windows-OpenSSH kann kein X11-Forwarding,
   `xauth` fehlt im Lieferumfang — `-X`/`-Y` wird still ignoriert statt zu
   fehlern). Robuster als lokalen X-Server + Forwarding: Xvfb + VNC direkt
   auf dem Server, durch SSH-Tunnel angeschaut:
   ```
   sudo apt install xauth x11vnc                    # xauth nur falls X11Forwarding doch genutzt wird
   sudo /pfad/zu/notebooklm-py/bin/playwright install-deps chromium
   Xvfb :99 -screen 0 1440x900x24 &
   x11vnc -display :99 -localhost -rfbport 5900 -nopw -forever &
   ```
   `-localhost` ist Pflicht (VNC nur über Tunnel erreichbar, sonst offenes
   Scheunentor). Vom Client:
   ```
   ssh -L 5900:localhost:5900 <host>
   ```
   und mit einem VNC-Viewer auf `localhost:5900` verbinden.
2. **AppArmor-Sandbox-Block umgehen.** Ubuntu 23.10+ setzt
   `kernel.apparmor_restrict_unprivileged_userns=1` — Chromiums Sandbox
   crasht sofort (`FATAL: No usable sandbox!`), das Tool meldet das
   irreführend als "browser window was closed". Fix, nur während des Logins:
   ```
   sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
   export DISPLAY=:99
   notebooklm login --fresh
   sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=1   # danach zurückstellen!
   ```
3. **Aufräumen:** `pkill x11vnc; pkill Xvfb`, Tunnel schließen.

Alternative ohne das Ganze: `notebooklm login` auf einem Rechner mit
echtem Browser (z.B. Windows-Client) ausführen, dann
`storage_state.json` (liegt unter `~/.notebooklm/profiles/<profil>/`)
per `scp` auf den Server kopieren. Datei enthält Session-Cookies — wie
ein Passwort behandeln, nie in Chat/Ticket einfügen.

## Context7 (CLI + Skill, kein MCP — spart Tokens)
```
npx skills add upstash/context7@context7-cli -g -y
npx ctx7@latest login                  # Browser-Login, Key landet lokal in
                                        # ~/.config/context7/credentials.json
```
Alternativ mit vorhandenem Key (Key nur selbst im eigenen Terminal eintippen,
nie über Claude/Chat laufen lassen — landet sonst im Transcript):
```
npx ctx7@latest setup --claude --cli --api-key DEIN_KEY
```
Neuer Key: https://context7.com/dashboard
Verifizieren: `npx ctx7@latest whoami`

## dotnet-webapi Skill (nur falls ASP.NET-Core-Projekte anstehen)
```
npx skills add dotnet/skills@dotnet-webapi -g -y
```

## Firecrawl (CLI + Skills, kein MCP — spart Tokens)
```
npm install -g firecrawl-cli
firecrawl setup core -g -y             # installiert Skills global
firecrawl login                        # Browser-Login oder --api-key DEIN_KEY
```
Neuer Key: Firecrawl-Dashboard.
Verifizieren: `firecrawl --status`

Hinweis: `.firecrawl`-Cache-Ordner (falls in einem Projekt gescraped wird)
in dessen `.gitignore` aufnehmen, sonst droht versehentlicher Commit.

Achtung: `firecrawl setup core -g -y` installiert Skills über das
`skills`-CLI-Tool, das global registrierte Skills (auch fremde, z.B.
context7-cli) auf `~/.agents/skills/...` umbiegt und per Symlink zurück
nach `~/.claude/skills/...` verlinkt — überschreibt dabei bereits per
Git getrackte reguläre Dateien. Danach `git status` prüfen; im
Konfliktfall die Symlinks löschen und `git checkout -- <pfade>` um die
versionierten Originale wiederherzustellen.

## Sonstige Standing Rules (schon in CLAUDE.md, keine Aktion nötig)
- Neues Repo: `main` + `dev` Branch.
- UI-Components: 21st.dev bei Bedarf.
- Diagramme: Skill `excalidraw-diagram`.
