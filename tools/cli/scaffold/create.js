'use strict';

const fs = require('fs');
const path = require('path');
const {
  EXTENSION_TYPES,
  EXTENSION_LOCALES,
  slugifyName,
  ensureUrl,
  buildDefaultRegexp
} = require('../shared/constants');
const { copyTemplateToExtension, resolveDefaultTemplateDir } = require('./template-copy');

function parseAndNormalizeOptions(workspaceRoot, options = {}) {
  const source = ensureUrl(options.source);
  const name = String(options.name || '').trim();
  const type = String(options.type || 'novel').trim();
  const locale = String(options.locale || 'vi_VN').trim();
  const author = String(options.author || process.env.VBOOK_AUTHOR || 'kychi').trim();

  const rawSlug = slugifyName(name).replace(/-/g, '_');
  const authorPrefix = `${slugifyName(author)}_`;
  const defaultFolder = rawSlug.startsWith(authorPrefix) ? rawSlug : `${authorPrefix}${rawSlug}`;
  const folderName = options.folder ? slugifyName(options.folder) : defaultFolder;

  const templateDir = path.resolve(
    options.template || resolveDefaultTemplateDir(workspaceRoot, type)
  );
  const outputDir = path.resolve(
    options.output || path.join(workspaceRoot, 'extensions', type, folderName)
  );
  const description = String(options.description || `Generated extension for ${source}`).trim();
  const regexp = String(options.regexp || buildDefaultRegexp(source)).trim();

  if (!name) throw new Error('Enter an extension name using --name.');
  if (!source) throw new Error('Enter a source URL using --source.');
  if (!folderName) throw new Error('Could not build a target folder slug from the extension name. Pass --folder explicitly.');
  if (!EXTENSION_TYPES.includes(type)) {
    throw new Error(`Unsupported type "${type}". Choose one of: ${EXTENSION_TYPES.join(', ')}.`);
  }
  if (!EXTENSION_LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale "${locale}". Choose one of: ${EXTENSION_LOCALES.join(', ')}.`);
  }

  return {
    name,
    folderName,
    source,
    type,
    locale,
    author,
    description,
    regexp,
    templateDir,
    outputDir,
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force)
  };
}

function updateGeneratedPluginJson(config, outputDir) {
  const pluginPath = path.join(outputDir, 'plugin.json');
  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Template plugin.json not found in ${outputDir}.`);
  }

  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  plugin.metadata = plugin.metadata || {};
  plugin.script = plugin.script || {};

  plugin.metadata.name = config.name;
  plugin.metadata.author = config.author;
  plugin.metadata.version = 1;
  plugin.metadata.source = config.source;
  plugin.metadata.regexp = config.regexp;
  plugin.metadata.description = config.description;
  plugin.metadata.locale = config.locale;
  plugin.metadata.language = 'javascript';
  plugin.metadata.type = config.type;

  if (plugin.config && plugin.config.DOMAIN && typeof plugin.config.DOMAIN === 'object') {
    plugin.config.DOMAIN.default = config.source;
  }

  fs.writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`, 'utf8');

  const configJsPath = path.join(outputDir, 'src', 'config.js');
  if (fs.existsSync(configJsPath)) {
    const configJs = fs.readFileSync(configJsPath, 'utf8');
    if (configJs.includes('SELECTOR_BASE_URL')) {
      fs.writeFileSync(configJsPath, configJs.split('SELECTOR_BASE_URL').join(config.source), 'utf8');
    }
  }
}

function scaffoldExtension(workspaceRoot, options = {}) {
  const config = parseAndNormalizeOptions(workspaceRoot, options);

  if (!fs.existsSync(config.templateDir)) {
    throw new Error(`Template directory not found at ${config.templateDir}. Run \`npm run skill:sync\` or pass --from-reference.`);
  }

  if (fs.existsSync(config.outputDir) && !config.force) {
    throw new Error(`Output directory already exists at ${config.outputDir}. Pass --force to replace it.`);
  }

  const planned = {
    name: config.name,
    outputDir: path.relative(workspaceRoot, config.outputDir),
    templateDir: path.relative(workspaceRoot, config.templateDir),
    metadata: {
      source: config.source,
      type: config.type,
      locale: config.locale,
      author: config.author,
      regexp: config.regexp
    },
    dryRun: config.dryRun
  };

  if (config.dryRun) {
    return {
      success: true,
      generated: false,
      ...planned
    };
  }

  if (fs.existsSync(config.outputDir) && config.force) {
    fs.rmSync(config.outputDir, { recursive: true, force: true });
  }

  copyTemplateToExtension(config.templateDir, config.outputDir);
  updateGeneratedPluginJson(config, config.outputDir);

  return {
    success: true,
    generated: true,
    ...planned
  };
}

module.exports = {
  scaffoldExtension,
  parseAndNormalizeOptions,
  updateGeneratedPluginJson
};
