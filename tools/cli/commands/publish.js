'use strict';

const { handleVerifyCommand } = require('./verify');
const { printHeading, printStatus, printJson } = require('../shared/output');

async function handlePublishCommand(options, workspaceRoot) {
  if (!options.json) {
    printHeading('VBook publish readiness check');
  }

  const verified = handleVerifyCommand({ ...options, json: false }, workspaceRoot);

  if (options.json) {
    printJson({
      success: verified,
      ready: verified,
      nextSteps: verified
        ? ['Review git diff and commit changes.', 'Push to GitHub after user confirmation.']
        : ['Rebuild outdated plugin.zip files and run `npm run build:catalog`.']
    });
    return verified;
  }

  if (!verified) {
    printStatus('error', 'Project verification failed. Fix all reported issues before publishing.');
    return false;
  }

  printStatus('ok', 'ZIP integrity and catalog alignment passed.');
  console.log('\nNext steps:');
  console.log('  1. Review changes with `git status` and `git diff`.');
  console.log('  2. Commit and push to GitHub after confirmation.');
  return true;
}

module.exports = {
  handlePublishCommand
};
