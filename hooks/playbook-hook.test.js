'use strict';
// Run: node --test hooks/playbook-hook.test.js
// The starter runs a hook of the playbook and stays out of the way when there is none.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function setup(t, hooks = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook hook ü-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  for (const [rel, text] of Object.entries(hooks)) {
    const file = path.join(home, '.playbook', 'claude', rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return home;
}

function run(home, ...args) {
  return spawnSync(process.execPath, [path.join(__dirname, 'playbook-hook.js'), ...args], {
    input: '{"tool_name":"Bash"}',
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

const ECHO = "let t='';process.stdin.on('data',(c)=>{t+=c});process.stdin.on('end',()=>{console.log('got '+t);process.stderr.write('err');process.exitCode=2});";

test('passes input, output and exit code through', (t) => {
  const r = run(setup(t, { 'hooks/echo-hook.js': ECHO }), 'echo-hook');
  assert.equal(r.status, 2);
  assert.equal(r.stdout.trim(), 'got {"tool_name":"Bash"}');
  assert.equal(r.stderr, 'err');
});

test('is silent without playbook or without this hook', (t) => {
  for (const home of [setup(t), setup(t, { 'hooks/other.js': ECHO })]) {
    const r = run(home, 'echo-hook');
    assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', '']);
  }
});

test('a damaged hook is reported without blocking', (t) => {
  for (const text of ['function (', 'throw new Error("x");', "require('./missing.js');"]) {
    const r = run(setup(t, { 'hooks/bad.js': text }), 'bad');
    assert.deepEqual([r.status, r.stdout], [1, ''], text); // 1 is a visible, non-blocking error
    assert.match(r.stderr, /Playbook-Hook bad ist defekt/);
  }
});

test('only accepts plain hook names', (t) => {
  const home = setup(t, { 'evil.js': ECHO, 'hooks/echo-hook.js': ECHO });
  for (const args of [[], [''], ['../evil'], ['hooks/echo-hook'], ['echo-hook.js'], ['..\evil']]) {
    const r = run(home, ...args);
    assert.deepEqual([r.status, r.stdout], [0, ''], String(args));
  }
});

test('hooks can use their own modules', (t) => {
  const r = run(setup(t, { 'hooks/with-lib.js': "console.log(require('./lib/x.js'));", 'hooks/lib/x.js': "module.exports='lib';" }), 'with-lib');
  assert.equal(r.stdout.trim(), 'lib');
});
