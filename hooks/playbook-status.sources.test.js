'use strict';
// Run: node --test hooks/playbook-status.sources.test.js
// Findings from the review of the branch: configured sources, shells, empty files, wording.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DAY = 24 * 60 * 60 * 1000;
const fresh = { syncedAt: new Date(Date.now() - 60 * 1000).toISOString() };
const old = { syncedAt: new Date(Date.now() - 30 * DAY).toISOString() };

function hint(t, { sources, state = {}, agents = '# Playbook\n' }) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook sources-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const put = (rel, text) => {
    const file = path.join(home, '.playbook', rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  put('AGENTS.md', agents);
  put('.git/HEAD', 'ref: refs/heads/dev\n');
  put('guidelines/.state.json', JSON.stringify(state));
  if (sources !== undefined) put('guidelines/sources.json', typeof sources === 'string' ? sources : JSON.stringify({ sources }));
  const r = spawnSync(process.execPath, [path.join(__dirname, 'playbook-status.js')], {
    input: '{}',
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim() === '' ? null : JSON.parse(r.stdout).systemMessage;
}

test('ignores state of sources that are no longer configured', (t) => {
  assert.equal(hint(t, { sources: [{ name: 'a' }], state: { a: fresh, removed: old } }), null);
});

test('reports a configured source that was never synced', (t) => {
  const msg = hint(t, { sources: [{ name: 'a' }, { name: 'b' }], state: { a: fresh } });
  assert.match(msg, /b: Stand unbekannt/);
  assert.doesNotMatch(msg, /a: /);
});

test('does not mistake inherited object keys for a state', (t) => {
  assert.match(hint(t, { sources: [{ name: 'constructor' }], state: { a: fresh } }), /constructor: Stand unbekannt/);
});

for (const [name, sources] of Object.entries({ 'broken JSON': '{', 'no list': '{"sources":{}}', 'empty list': [], 'entries without name': [{}, null] })) {
  test(`falls back to the recorded state for ${name}`, (t) => {
    assert.match(hint(t, { sources, state: { one: old } }), /one: 30 Tage/);
  });
}

test('the sync command works in PowerShell and bash', (t) => {
  const msg = hint(t, { state: { one: old } });
  assert.match(msg, /node \$HOME\/\.playbook\/guidelines\/sync\.js/);
  assert.doesNotMatch(msg, /node ~/);
});

test('a blank AGENTS.md counts as missing', (t) => {
  assert.match(hint(t, { agents: ' \n', state: { a: fresh } }), /Playbook fehlt/);
});

test('does not call an unknown state outdated', (t) => {
  const msg = hint(t, { state: { one: {} } });
  assert.match(msg, /one: Stand unbekannt/);
  assert.doesNotMatch(msg, /veraltet/);
});
