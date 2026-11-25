'use strict';
// SessionStart hook: reports a missing or outdated playbook and skills that are not linked.
// Reads local files only: no network, no writes. Silent when everything is fine, exit code always 0.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_AGE_DAYS = 7;
const MAX_LISTED = 5;
const MAX_NAME = 40;
const DAY = 24 * 60 * 60 * 1000;
// $HOME works in PowerShell and bash, ~ does not expand for native commands in PowerShell.
const SYNC = 'node $HOME/.playbook/guidelines/sync.js';

// Names come from files and end up in the agent context: only characters that cannot form a sentence.
const printable = (text) => text.replace(/[^A-Za-z0-9._/-]/g, '?').slice(0, MAX_NAME);

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
}

// Configured sources decide what is checked; without a usable config the recorded ones do.
function sourceNames(root, state) {
  const config = readJson(path.join(root, 'guidelines', 'sources.json'));
  const listed = config && Array.isArray(config.sources) ? config.sources : [];
  const names = listed.map((source) => source && source.name).filter((name) => typeof name === 'string' && name);
  return names.length ? names : Object.keys(state);
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
  const raw = readJson(path.join(root, 'guidelines', '.state.json'));
  const state = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  if (!Object.keys(state).length) return `Guidelines: Stand unbekannt. Der Mensch muss das selbst starten, nicht der Agent: ${SYNC}`;

  for (const name of sourceNames(root, state)) {
    const entry = Object.hasOwn(state, name) ? state[name] : null;
    const age = Date.now() - Date.parse(entry && entry.syncedAt);
    if (!(age >= 0)) unknown.push(`${printable(name)}: Stand unbekannt`);
    else if (age > MAX_AGE_DAYS * DAY) stale.push(`${printable(name)}: ${Math.floor(age / DAY)} Tage alt`);
  }
  const items = [...unknown, ...stale];
  if (!items.length) return null;
  const more = items.length > MAX_LISTED ? `, und ${items.length - MAX_LISTED} weitere` : '';
  return `Guidelines bitte prüfen (${items.slice(0, MAX_LISTED).join(', ')}${more}). Der Mensch muss das selbst starten, nicht der Agent: ${SYNC}`;
}

// Result of a file system call, or the fallback when the path does not allow it.
function attempt(call, fallback = null) {
  try {
    return call();
  } catch {
    return fallback;
  }
}

// Skills that are not linked as ext-<name>, and links whose skill is gone.
function skillHint(root) {
  const source = path.join(root, 'skills');
  const target = path.join(os.homedir(), '.claude', 'skills');
  const entries = (dir) => attempt(() => fs.readdirSync(dir), []);
  const real = (...parts) => attempt(() => fs.realpathSync(path.join(...parts)));
  const unlinked = entries(source).filter((name) => real(source, name, 'SKILL.md') !== real(target, `ext-${name}`, 'SKILL.md'));
  const dangling = entries(target)
    .filter((name) => name.startsWith('ext-') && real(target, name) === null)
    .filter((name) => path.dirname(attempt(() => path.resolve(target, fs.readlinkSync(path.join(target, name))), '')) === source)
    .map((name) => name.slice('ext-'.length));
  const names = [...new Set([...unlinked, ...dangling])];
  if (!names.length) return null;
  const more = names.length > MAX_LISTED ? `, und ${names.length - MAX_LISTED} weitere` : '';
  return `Playbook-Skills nicht verknüpft: ${names.slice(0, MAX_LISTED).map(printable).join(', ')}${more}. Befehl: ~/.playbook/claude/README.md, Abschnitt Skills.`;
}

function status() {
  const root = path.join(os.homedir(), '.playbook');
  if (!(read(path.join(root, 'AGENTS.md')) || '').trim()) {
    return 'Playbook fehlt (~/.playbook), es gelten nur die Regeln aus CLAUDE.md.';
  }
  return [branchHint(root), guidelineHint(root), skillHint(root)].filter(Boolean).join('\n');
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
