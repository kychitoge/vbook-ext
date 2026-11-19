'use strict';

const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const { CANONICAL_VBOOK_SCRIPT } = require('../shared/constants');
const { formatError } = require('../shared/output');

function runCanonicalVbookCli(workspaceRoot, args = process.argv.slice(2)) {
  const scriptPath = path.join(workspaceRoot, CANONICAL_VBOOK_SCRIPT);
  if (!fs.existsSync(scriptPath)) {
    console.error(formatError(
      `Canonical vBook CLI not found at ${CANONICAL_VBOOK_SCRIPT}.`,
      'The skill directory may be missing or out of sync.',
      'Run `npm run skill:sync` to restore the canonical skill files.'
    ));
    process.exitCode = 1;
    return null;
  }

  const child = fork(scriptPath, args, { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (typeof code === 'number' && code !== 0) {
      process.exitCode = code;
    }
  });
  return child;
}

module.exports = {
  runCanonicalVbookCli
};
