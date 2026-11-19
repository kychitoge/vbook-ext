#!/usr/bin/env node
'use strict';

const { syncFetch } = require('./runtime/sync-fetch');
const { runExtensionScript } = require('./runtime/sandbox');
const { runLocalTestAll } = require('./runtime/local-test-runner');

module.exports = {
  syncFetch,
  runExtensionScript,
  runLocalTestAll
};

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Specify an extension directory path. Example: node tools/cli/local-runner.js extensions/novel/kychi_ntruyen');
    process.exit(1);
  }
  runLocalTestAll(target).catch((err) => {
    console.error('\nError:', err.message);
    process.exit(1);
  });
}
