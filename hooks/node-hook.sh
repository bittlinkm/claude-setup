#!/bin/sh
# Starts a Node hook: sh node-hook.sh <commands|secrets|start|other> <script> [args...]
# Without Node every hook would fail and Claude Code would go on unguarded.
# Then this stops risky tool calls, warns at session start and reports the rest.

mode=$1
shift
if command -v node >/dev/null 2>&1; then
  exec node "$@"
fi

say='Node fehlt, die Playbook-Waechter laufen nicht. Der Mensch muss Node wiederherstellen (nvm).'
# Only the tool input counts, not the folder or the session data before it.
input=$(cat | sed 's/.*"tool_input"://')

case $mode in
  commands) risky='push|merge|deploy|publish|unlock' ;;
  secrets) risky='\.env|\.dev\.vars|\.pem|\.p12|\.pfx|\.key([^a-z]|$)|id_rsa|id_ed25519|id_ecdsa' ;;
  start)
    printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$say" "$say"
    exit 0
    ;;
  *)
    echo "$say" >&2
    exit 1
    ;;
esac

if printf '%s' "$input" | grep -qiE "$risky"; then
  echo "$say Gestoppt, weil der Aufruf riskant aussieht." >&2
  exit 2
fi
exit 0
