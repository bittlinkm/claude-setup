'use strict';
// SessionStart hook: reports a missing or outdated playbook.
// Reads local files only: no network, no writes. Silent when everything is fine, exit code always 0.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_AGE_DAYS = 7;
const MAX_LISTED = 5;
const MAX_NAME = 40;
const DAY = 24 * 60 * 60 * 1000;
const SYNC = 'node ~/.playbook/guidelines/sync.js';

// Names come from files and end up in the agent context: only characters that cannot form a sentence.
const printable = (text) => text.replace(/[^A-Za-z0-9._/-]/g, '?').slice(0, MAX_NAME);

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function branchHint(root) {
  const head = read(path.join(root, '.git', 'HEAD'));
  if (head === null) return null;
  const ref = head.match(/^ref: refs\/heads\/(.+)/);
  if (!ref) return 'Playbook steht auf keinem Branch.';
  const branch = ref[1].trimEnd();
  if (branch === 'dev' || branch === 'main') return null;
  return `Playbook steht auf Branch ${printable(branch)}, nicht auf dev oder main.`;
}

function guidelineHint(root) {
  const unknown = [];
  const stale = [];
  let state;
  try {
    state = JSON.parse(read(path.join(root, 'guidelines', '.state.json')));
  } catch {
    state = null;
  }
  const entries = state && typeof state === 'object' && !Array.isArray(state) ? Object.entries(state) : [];
  if (!entries.length) return `Guidelines: Stand unbekannt. Der Mensch muss das selbst starten, nicht der Agent: ${SYNC}`;

  for (const [name, entry] of entries) {
    const age = Date.now() - Date.parse(entry && entry.syncedAt);
    if (!(age >= 0)) unknown.push(`${printable(name)}: Stand unbekannt`);
    else if (age > MAX_AGE_DAYS * DAY) stale.push(`${printable(name)}: ${Math.floor(age / DAY)} Tage alt`);
  }
  const items = [...unknown, ...stale];
  if (!items.length) return null;
  const more = items.length > MAX_LISTED ? `, und ${items.length - MAX_LISTED} weitere` : '';
  return `Guidelines veraltet (${items.slice(0, MAX_LISTED).join(', ')}${more}). Der Mensch muss das selbst starten, nicht der Agent: ${SYNC}`;
}

function status() {
  const root = path.join(os.homedir(), '.playbook');
  if (read(path.join(root, 'AGENTS.md')) === null) {
    return 'Playbook fehlt (~/.playbook), es gelten nur die Regeln aus CLAUDE.md.';
  }
  return [branchHint(root), guidelineHint(root)].filter(Boolean).join('\n');
}

try {
  const message = status();
  if (message) {
    console.log(
      JSON.stringify({
        systemMessage: message,
        hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: message },
      }),
    );
  }
} catch {
  // A status hint must never get in the way of a session.
}
