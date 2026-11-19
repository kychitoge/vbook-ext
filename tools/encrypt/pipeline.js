#!/usr/bin/env node
/**
 * Full encryption pipeline: Obfuscate -> Encrypt -> Build ZIP
 * Usage: node tools/encrypt/pipeline.js <extPath>
 */
'use strict';

const path = require('path');
const { obfuscateExtension } = require('./obfuscate');
const { encryptExtension } = require('./encrypt');
const { buildExtensionZip } = require('../cli/build/build');

async function fullEncryptionPipeline(extPath) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const absPath = path.resolve(extPath);

  console.log('\nFull encryption pipeline');
  console.log('========================');

  console.log('\nStep 1: Obfuscate source scripts');
  const obfOk = obfuscateExtension(absPath);
  if (!obfOk) {
    console.error('Obfuscation failed. Fix syntax errors in src/*.js and try again.');
    return false;
  }

  console.log('\nStep 2: Encrypt bundled scripts');
  const encOk = encryptExtension(absPath);
  if (!encOk) {
    console.error('Encryption failed. Verify plugin.json metadata and try again.');
    return false;
  }

  console.log('\nStep 3: Package plugin.zip');
  const buildResult = await buildExtensionZip(workspaceRoot, absPath, false);
  if (!buildResult || !buildResult.success) {
    console.error('Packaging plugin.zip failed.');
    return false;
  }

  console.log(`\nPipeline complete: ${buildResult.zipPath} (${buildResult.size} bytes, metadata.encrypt = true).`);
  return true;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const extPath = args.find((a) => !a.startsWith('-'));

  if (!extPath) {
    console.error('Usage: node tools/encrypt/pipeline.js <extPath>');
    console.error('Example: node tools/encrypt/pipeline.js extensions/novel/kychi_truyencv');
    process.exit(1);
  }

  fullEncryptionPipeline(extPath)
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  fullEncryptionPipeline
};
