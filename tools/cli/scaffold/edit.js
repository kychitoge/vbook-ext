'use strict';

const fs = require('fs');
const path = require('path');
const { EXTENSION_TYPES, EXTENSION_LOCALES, ensureUrl } = require('../shared/constants');

function resolvePluginJsonPath(workspaceRoot, pluginOption) {
  const rawPath = String(pluginOption || '').trim();
  if (!rawPath) {
    throw new Error('Specify a target extension with --plugin <path> when using edit mode.');
  }

  const candidate = path.resolve(workspaceRoot, rawPath);
  if (!fs.existsSync(candidate)) {
    throw new Error(`Plugin path not found: ${candidate}.`);
  }

  const stat = fs.statSync(candidate);
  if (stat.isFile()) {
    if (path.basename(candidate) !== 'plugin.json') {
      throw new Error('Pass an extension directory or a plugin.json file to --plugin.');
    }
    return candidate;
  }

  const pluginPath = path.join(candidate, 'plugin.json');
  if (!fs.existsSync(pluginPath)) {
    throw new Error(`plugin.json not found in ${candidate}.`);
  }
  return pluginPath;
}

function updateExistingExtension(workspaceRoot, options = {}) {
  const pluginPath = resolvePluginJsonPath(workspaceRoot, options.plugin);
  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  const metadata = plugin.metadata || {};

  const next = { ...metadata };
  const updates = [];

  function applyField(field, value, transform) {
    if (value === undefined || value === null || value === '') return;
    const nextValue = transform ? transform(value) : String(value).trim();
    if (String(next[field] || '') !== String(nextValue || '')) {
      next[field] = nextValue;
      updates.push(field);
    }
  }

  applyField('name', options.name);
  applyField('source', options.source, ensureUrl);
  applyField('author', options.author);
  applyField('description', options.description);
  applyField('regexp', options.regexp);

  if (options.type) {
    const type = String(options.type).trim();
    if (!EXTENSION_TYPES.includes(type)) {
      throw new Error(`Unsupported type "${type}". Choose one of: ${EXTENSION_TYPES.join(', ')}.`);
    }
    applyField('type', type);
  }

  if (options.locale) {
    const locale = String(options.locale).trim();
    if (!EXTENSION_LOCALES.includes(locale)) {
      throw new Error(`Unsupported locale "${locale}". Choose one of: ${EXTENSION_LOCALES.join(', ')}.`);
    }
    applyField('locale', locale);
  }

  if (options.version !== undefined) {
    const version = parseInt(options.version, 10);
    if (!Number.isInteger(version) || version < 1) {
      throw new Error('Enter a whole number greater than or equal to 1 for --version.');
    }
    if (Number(next.version || 0) !== version) {
      next.version = version;
      updates.push('version');
    }
  }

  if (options.bumpVersion) {
    const currentVersion = Number(next.version || 0);
    next.version = currentVersion + 1;
    updates.push('version');
  }

  const dryRun = Boolean(options.dryRun);
  if (!updates.length) {
    return {
      success: true,
      updated: false,
      dryRun,
      pluginPath: path.relative(workspaceRoot, pluginPath),
      metadata: next,
      message: 'No metadata changes detected.'
    };
  }

  if (!dryRun) {
    plugin.metadata = next;
    fs.writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`, 'utf8');
  }

  return {
    success: true,
    updated: !dryRun,
    dryRun,
    pluginPath: path.relative(workspaceRoot, pluginPath),
    changedFields: Array.from(new Set(updates)),
    metadata: next
  };
}

module.exports = {
  resolvePluginJsonPath,
  updateExistingExtension
};
