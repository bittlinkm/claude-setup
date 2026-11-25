'use strict';
// Run: node --test hooks/playbook-status.skills.test.js
// The status hook reports playbook skills that Claude Code cannot load.
// Every test uses its own temp home directory and runs the hook as a process.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, 'playbook-status.js');

// A healthy playbook with the given skills, none of them linked yet.
function setup(t, skills = []) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook skills-')); // space in path on purpose
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const put = (rel, text) => {
    const file = path.join(home, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  put('.playbook/AGENTS.md', '# Playbook\n');
  put('.playbook/.git/HEAD', 'ref: refs/heads/dev\n');
  put('.playbook/guidelines/.state.json', JSON.stringify({ one: { syncedAt: new Date().toISOString() } }));
  fs.mkdirSync(path.join(home, '.claude', 'skills'), { recursive: true });
  for (const name of skills) put(`.playbook/skills/${name}/SKILL.md`, `---\nname: ${name}\n---\n`);
  const skill = (name) => path.join(home, '.playbook', 'skills', name);
  const entry = (name) => path.join(home, '.claude', 'skills', name);
  // a junction needs no extra rights on Windows, elsewhere the type is ignored
  const link = (name, as = `ext-${name}`, target = skill(name)) => fs.symlinkSync(target, entry(as), 'junction');
  return { home, put, skill, entry, link };
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

test('silent when every skill is linked', (t) => {
  const s = setup(t, ['one', 'two']);
  s.link('one');
  s.link('two');
  assert.equal(run(s.home), null);
});

test('silent when the playbook has no skills', (t) => {
  assert.equal(run(setup(t).home), null);
});

test('reports only the skill that is not linked and where the command is', (t) => {
  const s = setup(t, ['linked', 'missing']);
  s.link('linked');
  const msg = run(s.home);
  assert.match(msg, /\bmissing\b/);
  assert.doesNotMatch(msg, /\blinked\b/);
  assert.match(msg, /~\/\.playbook\/claude\/README\.md/);
});

test('reports all skills when nothing is linked', (t) => {
  const msg = run(setup(t, ['one', 'two']).home);
  assert.match(msg, /\bone\b/);
  assert.match(msg, /\btwo\b/);
});

test('reports all skills when Claude Code has no skills folder', (t) => {
  const s = setup(t, ['one']);
  fs.rmdirSync(path.join(s.home, '.claude', 'skills'));
  assert.match(run(s.home), /\bone\b/);
});

test('a link under the plain name does not count', (t) => {
  const s = setup(t, ['one']);
  s.link('one', 'one');
  assert.match(run(s.home), /\bone\b/);
});

test('a copy instead of a link is reported, it would go stale', (t) => {
  const s = setup(t, ['one']);
  s.put('.claude/skills/ext-one/SKILL.md', '---\nname: one\n---\n');
  assert.match(run(s.home), /\bone\b/);
});

test('a link to somewhere else is reported', (t) => {
  const s = setup(t, ['one']);
  s.put('elsewhere/SKILL.md', '---\nname: one\n---\n');
  s.link('one', 'ext-one', path.join(s.home, 'elsewhere'));
  assert.match(run(s.home), /\bone\b/);
});

test('reports a link whose skill is gone, for example on an old playbook branch', (t) => {
  const s = setup(t, ['one']);
  s.link('one');
  fs.rmSync(path.join(s.home, '.playbook', 'skills'), { recursive: true });
  assert.match(run(s.home), /\bone\b/);
});

test('ignores other entries: foreign links, dangling foreign links, plain skills', (t) => {
  const s = setup(t);
  s.put('foreign/SKILL.md', 'x');
  s.link('a', 'ext-foreign', path.join(s.home, 'foreign'));
  s.link('b', 'ext-gone', path.join(s.home, 'not-there'));
  s.put('.claude/skills/plain/SKILL.md', 'x');
  assert.equal(run(s.home), null);
});

test('ignores files and folders without SKILL.md in the playbook', (t) => {
  const s = setup(t);
  s.put('.playbook/skills/README.md', 'x');
  s.put('.playbook/skills/draft/notes.md', 'x');
  assert.equal(run(s.home), null);
});

test('appears together with the other hints', (t) => {
  const s = setup(t, ['one']);
  s.put('.playbook/.git/HEAD', 'ref: refs/heads/feature/x\n');
  const msg = run(s.home);
  assert.match(msg, /feature\/x/);
  assert.match(msg, /\bone\b/);
});

test('a missing playbook is still the only hint', (t) => {
  const s = setup(t, ['one']);
  fs.rmSync(path.join(s.home, '.playbook', 'AGENTS.md'));
  const msg = run(s.home);
  assert.match(msg, /Playbook fehlt/);
  assert.doesNotMatch(msg, /\bone\b/);
});

test('survives a file where the skills folder is expected', (t) => {
  const s = setup(t);
  s.put('.playbook/skills', 'x');
  assert.equal(run(s.home), null);
});

// Names end up in the agent context.
test('names are limited in characters, length and number', (t) => {
  const names = Array.from({ length: 30 }, (_, i) => `${i}-${'x'.repeat(60)}`);
  const msg = run(setup(t, ['!bad name\u202e', ...names]).home); // sorts first, so it is listed
  assert.match(msg, /bad.name/);
  assert.doesNotMatch(msg, /bad name|\u202e/);
  assert.ok(msg.length <= 600, `length ${msg.length}`);
});

test('does not change anything', (t) => {
  const s = setup(t, ['one', 'two']);
  s.link('one');
  const list = () => fs.readdirSync(s.home, { recursive: true }).sort();
  const before = list();
  assert.ok(run(s.home));
  assert.deepEqual(list(), before);
});
