'use strict';
// Claude Code side of the test lock (core: ~/.playbook/tools/test-lock.js).
//   PreToolUse  Edit|Write|MultiEdit|NotebookEdit   blocks locked tests
//   PreToolUse  Bash|PowerShell                     asks the human before the lock is removed
//   PostToolUse Bash|PowerShell                     reports locked tests changed by a command
//   SessionStart                                    names an active lock
// Without the core it still blocks the files of an existing lock. It catches mistakes, not intent.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const EDIT_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
const SHELL_TOOLS = ['Bash', 'PowerShell'];
const BROKEN = 'Die Sperrdatei der Tests ist defekt. Stoppen und den Menschen fragen.';

// Names come from files and end up in the agent context: only characters that cannot form a sentence.
const safe = (text) => String(text).replace(/[^\p{L}\p{N}._/-]/gu, '?').slice(0, 120);

function git(dir, ...args) {
  try {
    return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r?\n$/, '');
  } catch {
    return null;
  }
}

// Used when the core is missing: the files of an existing lock count as unchanged and active.
function checkWithoutCore(dir) {
  const root = git(dir, 'rev-parse', '--show-toplevel');
  if (!root) return { state: 'none' };
  const file = path.resolve(dir, git(dir, 'rev-parse', '--git-path', 'test-lock.json'));
  if (!fs.existsSync(file)) return { state: 'none' };
  try {
    const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
    const files = Object.keys(lock.files).map((rel) => ({ path: rel, status: 'ok' }));
    return { state: 'active', root: path.resolve(root), story: lock.story, files };
  } catch {
    return { state: 'broken', root: path.resolve(root) };
  }
}

function checkLock(dir) {
  const core = path.join(os.homedir(), '.playbook', 'tools', 'test-lock.js');
  return fs.existsSync(core) ? require(core).checkLock(dir) : checkWithoutCore(dir);
}

// Real spelling of a path whose last parts may not exist yet, with the closest existing folder.
function resolveReal(file) {
  const missing = [];
  let current = file;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return { full: file, folder: null };
    missing.unshift(path.basename(current));
    current = parent;
  }
  const real = fs.realpathSync.native(current);
  const folder = fs.statSync(real).isDirectory() ? real : path.dirname(real);
  return { full: path.join(real, ...missing), folder };
}

const key = (text) => (process.platform === 'win32' ? text.toLowerCase() : text);

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
}

function beforeEdit(input, cwd) {
  const target = input.file_path || input.notebook_path;
  if (typeof target !== 'string' || !target) return;
  const { full, folder } = resolveReal(path.resolve(cwd, target));
  if (path.basename(full).toLowerCase() === 'test-lock.json' && /[\\/]\.git[\\/]/.test(full)) {
    return block('Die Sperrdatei der Tests wird nicht von Hand geändert. Stoppen und den Menschen fragen.');
  }
  if (!folder) return;
  const lock = checkLock(folder);
  if (lock.state === 'broken') return block(BROKEN);
  if (lock.state !== 'active') return;
  const rel = path.relative(fs.realpathSync.native(lock.root), full).split(path.sep).join('/');
  const hit = lock.files.find((file) => key(file.path) === key(rel));
  if (hit) {
    block(`Gesperrter Test: ${safe(hit.path)} (Story ${safe(lock.story)}). Produktivcode anpassen statt Test. Wirkt der Test falsch: stoppen und den Menschen fragen.`);
  }
}

function beforeShell(input) {
  const command = typeof input.command === 'string' ? input.command : '';
  if (!/test-lock(\.js)?["']?\s+unlock\b/i.test(command) && !/test-lock\.json/i.test(command)) return;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: 'Hebt die Sperre der freigegebenen Tests auf oder greift in die Sperrdatei ein. Das entscheidet der Mensch.',
      },
    }),
  );
}

function afterShell(cwd) {
  const lock = checkLock(cwd);
  if (lock.state === 'broken') return block(BROKEN);
  if (lock.state !== 'active') return;
  const bad = lock.files.filter((file) => file.status !== 'ok');
  if (!bad.length) return;
  const list = bad.slice(0, 10).map((file) => `${file.status === 'deleted' ? 'gelöscht' : 'verändert'} ${safe(file.path)}`);
  block(`Gesperrte Tests der Story ${safe(lock.story)} weichen ab: ${list.join(', ')}. Stoppen und den Menschen fragen, nicht weiterarbeiten.`);
}

function sessionStart(cwd) {
  const lock = checkLock(cwd);
  let message = null;
  if (lock.state === 'broken') message = BROKEN;
  if (lock.state === 'active') message = `Testsperre aktiv: Story ${safe(lock.story)}, ${lock.files.length} Datei(en).`;
  if (message) {
    console.log(JSON.stringify({ systemMessage: message, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: message } }));
  }
}

function main(event) {
  const cwd = event.cwd || process.cwd();
  const input = event.tool_input || {};
  if (event.hook_event_name === 'SessionStart') return sessionStart(cwd);
  if (event.hook_event_name === 'PreToolUse' && EDIT_TOOLS.includes(event.tool_name)) return beforeEdit(input, cwd);
  if (event.hook_event_name === 'PreToolUse' && SHELL_TOOLS.includes(event.tool_name)) return beforeShell(input);
  if (event.hook_event_name === 'PostToolUse' && SHELL_TOOLS.includes(event.tool_name)) return afterShell(cwd);
  return undefined;
}

let text = '';
process.stdin.on('data', (chunk) => {
  text += chunk;
});
process.stdin.on('end', () => {
  try {
    main(JSON.parse(text) || {});
  } catch {
    // Errors of the hook itself must not get in the way of the work.
  }
});
