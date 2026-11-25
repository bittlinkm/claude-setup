'use strict';
// Run: node --test hooks/playbook-status.test.js
// Every test uses its own temp home directory and runs the hook as a process.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, 'playbook-status.js');
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

// A healthy playbook: rules present, branch dev, one source synced an hour ago.
function setup(t, { agents = true, head = 'ref: refs/heads/dev\n', state = { one: { syncedAt: ago(60 * MINUTE) } } } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook status-')); // space in path on purpose
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const put = (rel, text) => {
    const file = path.join(home, '.playbook', rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  if (agents) put('AGENTS.md', '# Playbook\n');
  if (head !== null) put('.git/HEAD', head);
  if (state !== null) put('guidelines/.state.json', typeof state === 'string' ? state : JSON.stringify(state));
  return home;
}

function run(home, input = '{"hook_event_name":"SessionStart","source":"startup"}') {
  const r = spawnSync(process.execPath, [HOOK], {
    input,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  if (r.stdout.trim() === '') return null;
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(out.hookSpecificOutput.additionalContext, out.systemMessage, 'agent and user get the same text');
  return out.systemMessage;
}

// AC1
test('AC1: silent when everything is present and fresh', (t) => {
  assert.equal(run(setup(t)), null);
});

test('AC1: silent on branch main', (t) => {
  assert.equal(run(setup(t, { head: 'ref: refs/heads/main\n' })), null);
});

test('AC1: silent just below seven days', (t) => {
  assert.equal(run(setup(t, { state: { one: { syncedAt: ago(7 * DAY - MINUTE) } } })), null);
});

// AC2
test('AC2: reports only the stale source with its age and the sync command', (t) => {
  const msg = run(setup(t, { state: { fresh: { syncedAt: ago(DAY) }, stale: { syncedAt: ago(12 * DAY + MINUTE) } } }));
  assert.match(msg, /stale/);
  assert.match(msg, /12 Tage/);
  assert.match(msg, /guidelines[\\/]sync\.js/);
  assert.doesNotMatch(msg, /fresh/);
});

test('AC2: reports just above seven days', (t) => {
  assert.match(run(setup(t, { state: { one: { syncedAt: ago(7 * DAY + MINUTE) } } })), /one.*7 Tage/s);
});

test('AC2: reports every stale source', (t) => {
  const msg = run(setup(t, { state: { a1: { syncedAt: ago(8 * DAY + MINUTE) }, b2: { syncedAt: ago(30 * DAY + MINUTE) } } }));
  assert.match(msg, /a1.*8 Tage/s);
  assert.match(msg, /b2.*30 Tage/s);
});

test('AC2: tells the human, not the agent, to run the sync', (t) => {
  assert.match(run(setup(t, { state: { one: { syncedAt: ago(9 * DAY) } } })), /selbst starten/);
});

// AC3
const unknownStates = {
  'missing file': null,
  'broken JSON': '{ not json',
  'empty file': '',
  'empty object': {},
  'null': 'null',
  'array': '[]',
  'entry without date': { one: { commit: 'abc' } },
  'entry is null': { one: null },
  'invalid date': { one: { syncedAt: 'gestern' } },
  'date in the future': { one: { syncedAt: ago(-2 * DAY) } },
};
for (const [name, state] of Object.entries(unknownStates)) {
  test(`AC3: state unknown for ${name}`, (t) => {
    const msg = run(setup(t, { state }));
    assert.match(msg, /Stand unbekannt/);
    assert.match(msg, /guidelines[\\/]sync\.js/);
  });
}

// AC4
test('AC4: reports a missing playbook folder and nothing else', (t) => {
  const msg = run(setup(t, { agents: false, head: null, state: null }));
  assert.match(msg, /Playbook fehlt/);
  assert.match(msg, /CLAUDE\.md/);
  assert.doesNotMatch(msg, /Stand unbekannt/);
});

test('AC4: reports a playbook folder without AGENTS.md', (t) => {
  assert.match(run(setup(t, { agents: false })), /Playbook fehlt/);
});

// AC5
test('AC5: reports another branch', (t) => {
  assert.match(run(setup(t, { head: 'ref: refs/heads/feature/some-topic\n' })), /feature\/some-topic/);
});

test('AC5: a branch that only ends like main is reported', (t) => {
  assert.match(run(setup(t, { head: 'ref: refs/heads/fix/main\n' })), /fix\/main/);
});

test('AC5: reports a detached checkout', (t) => {
  assert.match(run(setup(t, { head: '27d23a3e03b8428d665eae9bde394a083c7c6f10\n' })), /keinem Branch/);
});

test('AC5: no branch hint without git folder', (t) => {
  assert.equal(run(setup(t, { head: null })), null);
});

test('AC2 and AC5: both hints appear together', (t) => {
  const msg = run(setup(t, { head: 'ref: refs/heads/feature/x\n', state: { one: { syncedAt: ago(9 * DAY) } } }));
  assert.match(msg, /feature\/x/);
  assert.match(msg, /9 Tage/);
});

// AC6
test('AC6: survives folders where files are expected', (t) => {
  const home = setup(t, { head: null, state: null });
  fs.mkdirSync(path.join(home, '.playbook', '.git', 'HEAD'), { recursive: true });
  fs.mkdirSync(path.join(home, '.playbook', 'guidelines', '.state.json'), { recursive: true });
  assert.match(run(home), /Stand unbekannt/);
});

test('AC6: ignores broken or missing hook input', (t) => {
  const home = setup(t);
  assert.equal(run(home, 'not json'), null);
  assert.equal(run(home, ''), null);
});

// Not in scope: no writes
test('does not write anything', (t) => {
  const home = setup(t, { state: { one: { syncedAt: ago(9 * DAY) } } });
  const list = () => fs.readdirSync(home, { recursive: true }).sort();
  const before = list();
  const stateFile = path.join(home, '.playbook', 'guidelines', '.state.json');
  const content = fs.readFileSync(stateFile, 'utf8');
  assert.ok(run(home));
  assert.deepEqual(list(), before);
  assert.equal(fs.readFileSync(stateFile, 'utf8'), content);
});

// Security: names come from a file and end up in the agent context
test('removes control and bidi characters from names', (t) => {
  const bad = 'a\u001b[2J\nb‮c';
  const msg = run(setup(t, { state: { [bad]: { syncedAt: ago(9 * DAY) } }, head: 'ref: refs/heads/x\u001b]y\n' }));
  assert.match(msg, /9 Tage/);
  assert.doesNotMatch(msg, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/);
  assert.doesNotMatch(msg, /\nb/);
});

test('limits long names and many entries', (t) => {
  const state = {};
  for (let i = 0; i < 200; i += 1) state[`${i}-${'x'.repeat(500)}`] = { syncedAt: ago(9 * DAY) };
  const msg = run(setup(t, { state }));
  assert.match(msg, /9 Tage/);
  assert.ok(msg.length <= 1000, `length ${msg.length}`);
});
