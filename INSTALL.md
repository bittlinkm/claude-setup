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

## Sonstige Standing Rules (schon in CLAUDE.md, keine Aktion nötig)
- Neues Repo: `main` + `dev` Branch.
- UI-Components: 21st.dev bei Bedarf.
- Diagramme: Skill `excalidraw-diagram`.
