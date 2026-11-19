#!/usr/bin/env node
'use strict';

const path = require('path');
const { Command } = require('commander');
const { EXTENSION_TYPES, EXTENSION_LOCALES } = require('./shared/constants');
const { runCanonicalVbookCli } = require('./commands/vbook-proxy');
const { handleExtCommand } = require('./commands/ext');
const { handleBuildCommand } = require('./commands/build');
const { handleCatalogCommand } = require('./commands/catalog');
const { handleVerifyCommand } = require('./commands/verify');
const { handleValidateCommand } = require('./commands/validate');
const { handleAnalyzeCommand } = require('./commands/analyze');
const { handlePublishCommand } = require('./commands/publish');
const { handleCheckEnvCommand } = require('./commands/check-env');
const { handleSyncRefCommand } = require('./commands/sync-ref');
const { handleSyncSkillCommand } = require('./commands/sync-skill');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
require('dotenv').config({ path: path.join(WORKSPACE_ROOT, '.env') });

if (!process.env.VBOOK_AUTHOR && process.env.author) {
  process.env.VBOOK_AUTHOR = process.env.author;
}

const program = new Command();

program
  .name('vbook')
  .description('VBook CLI - Modular tools for extension developers')
  .version('3.1.0');

// Official REST-API CLI proxy commands (delegates to canonical .agents/skills/.../vbook.js)
program.command('connect')
  .description('Connect and probe local VBook REST-API server')
  .option('--server <url>', 'VBook server URL')
  .action(() => runCanonicalVbookCli(WORKSPACE_ROOT));

program.command('test')
  .description('Test an extension script via official REST-API server')
  .argument('<ext-dir>', 'Extension directory')
  .argument('<script>', 'Script file name (for example, detail.js)')
  .argument('[args...]', 'Arguments passed to execute()')
  .option('--server <url>', 'VBook server URL')
  .action(() => runCanonicalVbookCli(WORKSPACE_ROOT));

program.command('install')
  .description('Install an extension directly into the connected VBook app')
  .argument('<ext-dir>', 'Extension directory')
  .option('--server <url>', 'VBook server URL')
  .option('--no-icon', 'Omit icon.png')
  .action(() => runCanonicalVbookCli(WORKSPACE_ROOT));

program.command('testall')
  .description('Batch triage extensions via official REST-API server')
  .argument('[ext...]', 'Extension directories')
  .option('--server <url>', 'VBook server URL')
  .option('--query <kw>', 'Search keyword')
  .option('--timeout <ms>', 'Per-script timeout in ms')
  .option('--json <file>', 'Write JSON report file')
  .action(() => runCanonicalVbookCli(WORKSPACE_ROOT));

// Extension authoring and validation commands
program.command('ext')
  .description('Create a new extension or edit existing metadata')
  .option('--mode <mode>', 'create|edit', 'create')
  .option('--from-reference <path>', 'Custom template or reference directory')
  .option('--name <name>', 'Extension display name')
  .option('--folder <folder>', 'Output folder slug')
  .option('--source <url>', 'Source website URL')
  .option('--type <type>', EXTENSION_TYPES.join('|'), 'novel')
  .option('--locale <locale>', EXTENSION_LOCALES.join('|'), 'vi_VN')
  .option('--author <author>', 'Metadata author')
  .option('--description <text>', 'Metadata description')
  .option('--regexp <regex>', 'Metadata regexp')
  .option('--plugin <path>', 'Extension folder or plugin.json')
  .option('--version <n>', 'Set metadata.version')
  .option('--bump-version', 'Increment metadata.version by 1')
  .option('--dry-run', 'Preview changes without writing files')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const success = await handleExtCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('validate')
  .description('Validate extension manifest and Rhino ES6 compatibility via AST')
  .option('--plugin <path>', 'Extension folder or plugin.json path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const success = await handleValidateCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('analyze')
  .description('Analyze a webpage URL and suggest starter detail.js selectors')
  .argument('[url]', 'Target webpage URL')
  .option('--json', 'Output as JSON')
  .action(async (url, options) => {
    const success = await handleAnalyzeCommand({ ...options, url }, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('test-local')
  .description('Run an offline local simulation test for an extension')
  .argument('<plugin-path>', 'Extension folder path')
  .action(async (pluginPath) => {
    const { runLocalTestAll } = require('./runtime/local-test-runner');
    try {
      await runLocalTestAll(pluginPath);
    } catch (err) {
      console.error('\nError:', err.message);
      process.exitCode = 1;
    }
  });

// Build, catalog, sync, and project maintenance commands
program.command('build')
  .description('Package an extension folder into plugin.zip')
  .option('--plugin <path>', 'Extension folder or plugin.json path')
  .option('--verify', 'Check whether plugin.zip is up to date with src/')
  .option('--dry-run', 'Preview without writing plugin.zip')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const success = await handleBuildCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('build-catalog')
  .description('Rebuild root plugin.json catalog and README extension table')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const success = handleCatalogCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('verify')
  .description('Verify catalog synchronization and plugin.zip integrity')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const success = handleVerifyCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('publish')
  .description('Run project readiness checks before publishing')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const success = await handlePublishCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('check-env')
  .description('Verify local .env configuration without exposing secret values')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const success = await handleCheckEnvCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('sync-skill')
  .description('Sync canonical vbook-extensions skill, templates, and API docs from upstream')
  .option('--branch <ref>', 'Upstream branch or commit SHA', 'master')
  .option('--dry-run', 'Preview files that would be updated')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const success = await handleSyncSkillCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.command('sync-ref')
  .description('Sync community reference repositories into .private/code-reference')
  .option('--manifest <path>', 'Path to remote-sources.json manifest')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const success = await handleSyncRefCommand(options, WORKSPACE_ROOT);
    if (!success) process.exitCode = 1;
  });

program.parse(process.argv);
