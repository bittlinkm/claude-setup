'use strict';
// Starts a hook of the playbook: node playbook-hook.js <name> runs ~/.playbook/claude/hooks/<name>.js.
// Without playbook it does nothing, playbook-status.js reports that at session start.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const name = process.argv[2] || '';
const file = path.join(os.homedir(), '.playbook', 'claude', 'hooks', `${name}.js`);

if (/^[a-z]+(-[a-z]+)*$/.test(name) && fs.existsSync(file)) {
  try {
    require(file);
  } catch {
    // A damaged hook must not get in the way of the work.
  }
}
