'use strict';
// Run: node --test hooks/node-hook.test.js
// Without Node every hook fails and Claude Code goes on anyway. node-hook.sh starts the hooks
// and stops risky tool calls when Node is missing. No hook command is ever executed for real.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const WRAPPER = path.join(__dirname, 'node-hook.sh');
const SETTINGS = path.join(__dirname, '..', 'settings.json');
const windows = process.platform === 'win32';

// A PATH that has sh, cat and grep but no node.
const shPath = spawnSync('sh', ['-c', windows ? 'cygpath -w "$(command -v sh)"' : 'command -v sh'], { encoding: 'utf8' }).stdout.trim();
const withoutNode = path.dirname(shPath);

const fake = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'node hook-')), 'fake.js');
fs.writeFileSync(fake, "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{process.stdout.write(JSON.stringify({args:process.argv.slice(2),input:s}));process.exitCode=Number(process.argv[3]||0)});");
process.on('exit', () => fs.rmSync(path.dirname(fake), { recursive: true, force: true }));

function run(args, event, { node = false } = {}) {
  const env = { ...process.env, PATH: node ? process.env.PATH : withoutNode };
  return spawnSync('sh', [WRAPPER, ...args], { input: JSON.stringify(event), encoding: 'utf8', env, timeout: 20000 });
}

const pre = (tool_name, tool_input, cwd = 'C:/repos/app') => ({ hook_event_name: 'PreToolUse', tool_name, cwd, tool_input });
const bash = (command, cwd) => pre('Bash', { command }, cwd);

test('test setup: the shell without Node really has no node, but sh and grep', () => {
  const r = spawnSync('sh', ['-c', 'command -v node; command -v grep'], { encoding: 'utf8', env: { ...process.env, PATH: withoutNode } });
  assert.doesNotMatch(r.stdout, /node/);
  assert.match(r.stdout, /grep/);
});

test('with Node: runs the hook with its arguments and input, and passes its exit code on', () => {
  const event = bash('git push');
  const ok = run(['commands', fake, 'x'], event, { node: true });
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(JSON.parse(ok.stdout), { args: ['x'], input: JSON.stringify(event) });
  assert.equal(run(['commands', fake, 'x', '2'], event, { node: true }).status, 2);
});

const stopsCommands = ['git push origin dev', 'git push --force', 'gh pr merge 3', 'npx wrangler deploy', 'pnpm run deploy', 'npm publish', 'node tools/test-lock.js unlock', 'git merge feature/x'];
for (const command of stopsCommands) {
  test(`without Node: stops "${command}"`, () => {
    const r = run(['commands', fake], bash(command));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Node fehlt/);
    assert.equal(r.stdout, '');
  });
}

test('without Node: stops a PowerShell push too', () => {
  assert.equal(run(['commands', fake], pre('PowerShell', { command: 'git push origin main' })).status, 2);
});

for (const command of ['git status', 'ls', 'npm test', 'git log --oneline -3']) {
  test(`without Node: lets "${command}" through`, () => {
    const r = run(['commands', fake], bash(command));
    assert.equal(r.status, 0, r.stderr);
  });
}

test('without Node: only the tool input counts, not the folder', () => {
  assert.equal(run(['commands', fake], bash('git status', 'C:/repos/cloudflare-workers-deploy')).status, 0);
  assert.equal(run(['secrets', fake], pre('Read', { file_path: 'C:/repos/app/src/a.ts' }, 'C:/repos/.env-tools')).status, 0);
});

const stopsSecrets = [
  pre('Read', { file_path: 'C:/repos/app/.env' }),
  pre('Read', { file_path: 'C:/repos/app/.env.production' }),
  pre('Read', { file_path: 'C:/repos/app/.dev.vars' }),
  pre('Edit', { file_path: 'C:/Users/x/.ssh/id_ed25519' }),
  pre('Read', { file_path: 'C:/certs/site.pem' }),
  pre('Grep', { pattern: 'TOKEN', glob: '**/.env*' }),
  bash('cat .env'),
];
for (const event of stopsSecrets) {
  test(`without Node: stops ${event.tool_name} ${JSON.stringify(event.tool_input)}`, () => {
    const r = run(['secrets', fake], event);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Node fehlt/);
  });
}

for (const event of [pre('Read', { file_path: 'C:/repos/app/src/env.ts' }), pre('Write', { file_path: 'C:/repos/app/README.md', content: 'x' }), bash('git status')]) {
  test(`without Node: secrets lets ${event.tool_name} ${JSON.stringify(event.tool_input)} through`, () => {
    assert.equal(run(['secrets', fake], event).status, 0);
  });
}

test('without Node: warns at session start, visibly and for the agent', () => {
  const r = run(['start', fake], { hook_event_name: 'SessionStart', source: 'startup' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.match(out.systemMessage, /Node fehlt/);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(out.hookSpecificOutput.additionalContext, out.systemMessage);
});

test('without Node: other hooks report the problem without blocking', () => {
  for (const mode of ['other', 'unknown']) {
    const r = run([mode, fake], pre('Edit', { file_path: 'C:/repos/app/.env' }));
    assert.equal(r.status, 1, mode);
    assert.match(r.stderr, /Node fehlt/);
  }
});

test('Git checks the script out with LF, sh cannot run CRLF', () => {
  const r = spawnSync('git', ['check-attr', 'eol', '--', 'hooks/node-hook.sh'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  assert.match(r.stdout, /eol: lf$/m);
  assert.doesNotMatch(fs.readFileSync(WRAPPER, 'utf8'), /\r/);
});

test('every hook in settings.json that needs Node starts through node-hook.sh', () => {
  const commands = [];
  for (const entries of Object.values(JSON.parse(fs.readFileSync(SETTINGS, 'utf8')).hooks)) {
    for (const entry of entries) for (const hook of entry.hooks) commands.push(hook.command);
  }
  const node = commands.filter((c) => /\.js\b/.test(c));
  assert.ok(node.length >= 7);
  for (const command of node) assert.match(command, /^sh ~\/\.claude\/hooks\/node-hook\.sh (commands|secrets|start|other) ~\/\.claude\/hooks\/[a-z-]+\.js( [a-z-]+)?$/, command);
  const has = (mode, script) => node.some((c) => c.includes(`node-hook.sh ${mode} ~/.claude/hooks/${script}`));
  assert.ok(has('commands', 'playbook-hook.js command-guard'));
  assert.ok(has('secrets', 'playbook-hook.js secret-guard'));
  assert.ok(has('start', 'playbook-status.js'));
});
