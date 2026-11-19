'use strict';

const fs = require('fs');
const path = require('path');
const { EXTENSION_TYPES } = require('../shared/constants');
const { printHeading, printStatus, printJson } = require('../shared/output');
const { checkExtensionZipIntegrity } = require('../build/build');

function handleVerifyCommand(options, workspaceRoot) {
  const extRoot = path.join(workspaceRoot, 'extensions');
  const rootPluginPath = path.join(workspaceRoot, 'plugin.json');

  const hasRootPlugin = fs.existsSync(rootPluginPath);
  const rootPlugin = hasRootPlugin ? JSON.parse(fs.readFileSync(rootPluginPath, 'utf8')) : {};
  const rootData = Array.isArray(rootPlugin.data) ? rootPlugin.data : [];

  const entries = [];
  let overallSuccess = hasRootPlugin;
  let totalExts = 0;
  let syncedExts = 0;

  if (!options.json) {
    printHeading('VBook project verification');
    if (!hasRootPlugin) {
      printStatus('warn', 'Root plugin.json is missing. Run `npm run build:catalog` to generate it.');
    }
    console.log('\nChecking extensions alignment...');
  }

  for (const type of EXTENSION_TYPES) {
    const typeDir = path.join(extRoot, type);
    if (!fs.existsSync(typeDir)) continue;

    const folders = fs.readdirSync(typeDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const folder of folders) {
      totalExts++;
      const relPath = `extensions/${type}/${folder}`;
      const inRoot = rootData.some((e) => e.path && e.path.includes(relPath));
      const integrity = checkExtensionZipIntegrity(workspaceRoot, relPath);

      const issues = [];
      if (!inRoot) issues.push('NOT_IN_ROOT');
      if (!integrity.exists) issues.push('MISSING_ZIP');
      else if (!integrity.upToDate) issues.push('OUTDATED_ZIP');

      entries.push({ path: relPath, ok: issues.length === 0, issues });
      if (issues.length > 0) {
        overallSuccess = false;
        if (!options.json) printStatus('error', `${relPath} -> [${issues.join(', ')}]`);
      } else {
        syncedExts++;
        if (!options.json) printStatus('ok', relPath);
      }
    }
  }

  const summary = {
    success: overallSuccess,
    hasRootCatalog: hasRootPlugin,
    synced: syncedExts,
    total: totalExts,
    entries
  };

  if (options.json) {
    printJson(summary);
  } else {
    console.log(`\nSynchronized: ${syncedExts}/${totalExts} extensions.`);
    if (overallSuccess) {
      console.log('All public extensions are built, zipped, and cataloged.');
    } else {
      console.warn('Action needed: Rebuild outdated ZIP files or run `npm run build:catalog`.');
    }
  }

  return overallSuccess;
}

module.exports = {
  handleVerifyCommand
};
