'use strict';
// Run: node --test hooks/test-lock-hook.guard.test.js
// The lock must not be switched off by a damaged core or by editing its own code.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, 'test-lock-hook.js');
const CORE = path.join(os.homedir(), '.playbook', 'tools', 'test-lock.js');
const skip = !fs.existsSync(CORE) && 'lock core not installed (~/.playbook)';
const ID = ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid'];
const git = (cwd, ...args) => execFileSync('git', [...ID, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();

function setup(t, { core, lock = true } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lock guard-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const home = path.join(base, 'home');
  const root = path.join(base, 'repo');
  fs.mkdirSync(path.join(home, '.playbook', 'tools'), { recursive: true });
  fs.mkdirSync(path.join(home, '.claude', 'hooks'), { recursive: true });
  fs.mkdirSync(root);
  git(root, 'init', '-q', '-b', 'feature/x');
  fs.writeFileSync(path.join(root, 'a.test.ts'), 'x\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  if (lock) execFileSync(process.execPath, [CORE, 'lock', 's', 'a.test.ts'], { cwd: root, stdio: 'pipe' });
  const coreFile = path.join(home, '.playbook', 'tools', 'test-lock.js');
  fs.writeFileSync(coreFile, core === undefined ? fs.readFileSync(CORE) : core);
  const hookFile = path.join(home, '.claude', 'hooks', 'test-lock-hook.js');
  fs.writeFileSync(hookFile, '// hook\n');
  return { home, root, coreFile, hookFile };
}

function edit(env, file) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd: env.root, tool_input: { file_path: file } }),
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, HOME: env.home, USERPROFILE: env.home },
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const damaged = {
  'a syntax error': 'function (',
  'an exception': 'throw new Error("x");',
  'no export': 'module.exports = {};',
  'a useless result': 'module.exports = { checkLock: () => undefined };',
  'an unknown state': 'module.exports = { checkLock: () => ({ state: "off" }) };',
  'an incomplete result': 'module.exports = { checkLock: () => ({ state: "active" }) };',
};
for (const [name, core] of Object.entries(damaged)) {
  test(`a core with ${name} does not switch the lock off`, { skip }, (t) => {
    const env = setup(t, { core });
    const r = edit(env, path.join(env.root, 'a.test.ts'));
    assert.equal(r.code, 2, r.out + r.err);
    assert.match(r.err, /a\.test\.ts/);
  });
}

test('asks before the core or the hook is edited while a lock is active', { skip }, (t) => {
  const env = setup(t);
  for (const file of [env.coreFile, env.hookFile]) {
    const r = edit(env, file);
    assert.equal(r.code, 0, r.err);
    assert.equal(JSON.parse(r.out).hookSpecificOutput.permissionDecision, 'ask');
  }
});

test('does not ask for them without a lock', { skip }, (t) => {
  const env = setup(t, { lock: false });
  for (const file of [env.coreFile, env.hookFile]) {
    const r = edit(env, file);
    assert.equal(r.code, 0);
    assert.equal(r.out, '');
  }
});

test('an internal error does not switch the lock off', { skip }, (t) => {
  const env = setup(t, { core: 'module.exports = { checkLock: (d) => ({ state: "active", root: d, story: "s", files: [{}] }) };' });
  const r = edit(env, path.join(env.root, 'a.test.ts'));
  assert.equal(r.code, 2, r.out + r.err);
});

test('an internal error without a lock stays out of the way', { skip }, (t) => {
  const env = setup(t, { lock: false, core: 'module.exports = { checkLock: (d) => ({ state: "active", root: d, story: "s", files: [{}] }) };' });
  const r = edit(env, path.join(env.root, 'a.test.ts'));
  assert.equal(r.code, 0, r.err);
});

test('protects the lock file in a separate git directory', { skip }, (t) => {
  const env = setup(t, { lock: false });
  const root = path.join(path.dirname(env.root), 'separate');
  const gitDir = path.join(path.dirname(env.root), 'gitdata');
  fs.mkdirSync(root);
  git(root, 'init', '-q', '-b', 'feature/x', `--separate-git-dir=${gitDir}`);
  fs.writeFileSync(path.join(root, 'a.test.ts'), 'x\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  execFileSync(process.execPath, [CORE, 'lock', 's', 'a.test.ts'], { cwd: root, stdio: 'pipe' });
  const r = edit({ ...env, root }, path.join(gitDir, 'test-lock.json'));
  assert.equal(r.code, 2, r.out + r.err);
  assert.match(r.err, /Sperrdatei/);
});

test('a project file that is only named test-lock.json can be edited', { skip }, (t) => {
  const env = setup(t);
  assert.equal(edit(env, path.join(env.root, 'test-lock.json')).code, 0);
});

function raw(env, tool_name, tool_input, extra = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name, cwd: extra.cwd || env.root, tool_input }),
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, HOME: env.home, USERPROFILE: env.home, ...extra.vars },
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

test('inherited git variables do not switch the lock off', { skip }, (t) => {
  const env = setup(t);
  for (const vars of [{ GIT_DIR: path.join(env.home, 'nowhere') }, { GIT_WORK_TREE: env.home }, { GIT_CEILING_DIRECTORIES: path.dirname(env.root), GIT_DIR: env.home }]) {
    const r = raw(env, 'Edit', { file_path: path.join(env.root, 'a.test.ts') }, { vars });
    assert.equal(r.code, 2, JSON.stringify(vars) + r.out + r.err);
  }
  const lock = raw(env, 'Write', { file_path: path.join(env.root, '.git', 'test-lock.json') }, { vars: { GIT_DIR: path.join(env.home, 'nowhere') } });
  assert.equal(lock.code, 2, lock.out + lock.err);
});

test('an internal error while a notebook is edited does not switch the lock off', { skip }, (t) => {
  const env = setup(t, { core: 'module.exports = { checkLock: (d) => ({ state: "active", root: d, story: "s", files: [{}] }) };' });
  const r = raw(env, 'NotebookEdit', { notebook_path: path.join(env.root, 'a.test.ts') }, { cwd: env.home });
  assert.equal(r.code, 2, r.out + r.err);
});

test('a file named test-lock.json outside of any repository can be edited', { skip }, (t) => {
  const env = setup(t);
  assert.equal(raw(env, 'Write', { file_path: path.join(env.home, 'test-lock.json') }, { cwd: env.home }).code, 0);
});
