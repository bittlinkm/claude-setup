'use strict';
// Run: node --test hooks/playbook-status.agents.test.js
// The status hook reports when Claude Code cannot load the agents of the playbook.
// Every test uses its own temp home directory and runs the hook as a process.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, 'playbook-status.js');
const HINT = /Playbook-Agents/;

// A healthy playbook, with one agent unless told otherwise, not linked yet.
function setup(t, { agent = true } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook agents-')); // space in path on purpose
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const put = (rel, text) => {
    const file = path.join(home, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  put('.playbook/AGENTS.md', '# Playbook\n');
  put('.playbook/.git/HEAD', 'ref: refs/heads/dev\n');
  put('.playbook/guidelines/.state.json', JSON.stringify({ one: { syncedAt: new Date().toISOString() } }));
  fs.mkdirSync(path.join(home, '.claude', 'agents'), { recursive: true });
  const source = path.join(home, '.playbook', 'claude', 'agents');
  if (agent) put('.playbook/claude/agents/one.md', '---\nname: one\n---\n');
  // a junction needs no extra rights on Windows, elsewhere the type is ignored
  const link = (target = source, as = 'ext-playbook') => fs.symlinkSync(target, path.join(home, '.claude', 'agents', as), 'junction');
  return { home, put, source, link };
}

function run(home) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: '{"hook_event_name":"SessionStart","source":"startup"}',
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  if (r.stdout.trim() === '') return null;
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.additionalContext, out.systemMessage, 'agent and user get the same text');
  return out.systemMessage;
}

test('silent when the agents are linked', (t) => {
  const s = setup(t);
  s.link();
  assert.equal(run(s.home), null);
});

test('silent when the playbook has no agents', (t) => {
  assert.equal(run(setup(t, { agent: false }).home), null);
});

test('reports agents that are not linked and where the command is', (t) => {
  const msg = run(setup(t).home);
  assert.match(msg, HINT);
  assert.match(msg, /~\/\.playbook\/claude\/README\.md/);
});

test('reports it when Claude Code has no agents folder', (t) => {
  const s = setup(t);
  fs.rmdirSync(path.join(s.home, '.claude', 'agents'));
  assert.match(run(s.home), HINT);
});

test('a copy instead of a link is reported, it would go stale', (t) => {
  const s = setup(t);
  s.put('.claude/agents/ext-playbook/one.md', '---\nname: one\n---\n');
  assert.match(run(s.home), HINT);
});

test('a link to somewhere else is reported', (t) => {
  const s = setup(t);
  s.put('elsewhere/one.md', '---\nname: one\n---\n');
  s.link(path.join(s.home, 'elsewhere'));
  assert.match(run(s.home), HINT);
});

test('reports a link whose folder is gone, for example on an old playbook branch', (t) => {
  const s = setup(t);
  s.link();
  fs.rmSync(path.join(s.home, '.playbook', 'claude'), { recursive: true });
  assert.match(run(s.home), HINT);
});

test('ignores other entries: foreign links, dangling foreign links, plain agents', (t) => {
  const s = setup(t);
  s.link();
  s.put('foreign/x.md', 'x');
  s.link(path.join(s.home, 'foreign'), 'ext-foreign');
  s.link(path.join(s.home, 'not-there'), 'ext-gone');
  s.put('.claude/agents/plain.md', 'x');
  assert.equal(run(s.home), null);
});

test('a folder without agents needs no link', (t) => {
  const s = setup(t, { agent: false });
  s.put('.playbook/claude/agents/.gitkeep', '');
  assert.equal(run(s.home), null);
});

test('survives a file where the agents folder is expected', (t) => {
  const s = setup(t, { agent: false });
  s.put('.playbook/claude/agents', 'x');
  assert.equal(run(s.home), null);
});

test('appears together with the skills hint', (t) => {
  const s = setup(t);
  s.put('.playbook/skills/some-skill/SKILL.md', 'x');
  const msg = run(s.home);
  assert.match(msg, HINT);
  assert.match(msg, /some-skill/);
});

test('a missing playbook is still the only hint', (t) => {
  const s = setup(t);
  fs.rmSync(path.join(s.home, '.playbook', 'AGENTS.md'));
  const msg = run(s.home);
  assert.match(msg, /Playbook fehlt/);
  assert.doesNotMatch(msg, HINT);
});

test('does not change anything', (t) => {
  const s = setup(t);
  const list = () => fs.readdirSync(s.home, { recursive: true }).sort();
  const before = list();
  assert.match(run(s.home), HINT);
  assert.deepEqual(list(), before);
});

// The repository is public: linked private content must never be added.
test('git ignores the link but not the other agents', () => {
  const ignored = (rel) => spawnSync('git', ['check-ignore', '-q', '--no-index', rel], { cwd: path.join(__dirname, '..') }).status === 0;
  assert.ok(ignored('agents/ext-playbook'));
  assert.ok(ignored('agents/ext-playbook/site-blueprint.md'));
  assert.ok(!ignored('agents/impeccable-documenter.md'));
});
