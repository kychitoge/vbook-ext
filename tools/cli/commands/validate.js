'use strict';

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const {
  EXTENSION_TYPES,
  REQUIRED_SCRIPTS_BY_TYPE,
  LIST_SCRIPTS
} = require('../shared/constants');
const { printHeading, printStatus, printJson } = require('../shared/output');

function walkAst(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item.type === 'string') walkAst(item, visitor);
      }
    } else if (child && typeof child.type === 'string') {
      walkAst(child, visitor);
    }
  }
}

function analyzeScriptAst(ast) {
  const findings = {
    hasExecute: false,
    loadedFiles: [],
    hasOptionalChaining: false,
    hasNullishCoalescing: false,
    hasAsyncAwait: false,
    declaresDomain: false,
    hasConst: false,
    callsParseWithoutOk: false
  };

  let callsResponseParse = false;
  let checksOk = false;

  walkAst(ast, (node) => {
    if (node.type === 'FunctionDeclaration' && node.id && node.id.name === 'execute') {
      findings.hasExecute = true;
    }
    if (node.type === 'VariableDeclarator' && node.id && node.id.name === 'execute') {
      findings.hasExecute = true;
    }
    if (node.type === 'ChainExpression') {
      findings.hasOptionalChaining = true;
    }
    if (node.type === 'LogicalExpression' && node.operator === '??') {
      findings.hasNullishCoalescing = true;
    }
    if (
      node.type === 'AwaitExpression' ||
      ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.async)
    ) {
      findings.hasAsyncAwait = true;
    }
    if (node.type === 'VariableDeclaration') {
      if (node.kind === 'const') findings.hasConst = true;
      for (const decl of node.declarations) {
        if (decl.id && decl.id.type === 'Identifier' && decl.id.name === 'DOMAIN') {
          findings.declaresDomain = true;
        }
      }
    }
    if (
      node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'load' &&
      node.arguments.length > 0 &&
      node.arguments[0].type === 'Literal' &&
      typeof node.arguments[0].value === 'string'
    ) {
      findings.loadedFiles.push(node.arguments[0].value);
    }
    if (
      node.type === 'MemberExpression' &&
      node.property &&
      node.property.type === 'Identifier'
    ) {
      if (node.property.name === 'ok') checksOk = true;
      if (node.property.name === 'html' || node.property.name === 'json' || node.property.name === 'text') {
        callsResponseParse = true;
      }
    }
  });

  findings.callsParseWithoutOk = callsResponseParse && !checksOk;
  return findings;
}

async function handleValidateCommand(options, workspaceRoot) {
  const pluginPath = options.plugin;
  if (!pluginPath) {
    const message = 'Missing required option --plugin <path>. Run `npm run ext:validate -- --plugin extensions/<type>/<slug>`.';
    if (options.json) {
      printJson({ success: false, errors: [message], warnings: [] });
    } else {
      console.error(`Error: ${message}`);
    }
    return false;
  }
  const resolvedPath = path.resolve(workspaceRoot, pluginPath);
  const srcDir = path.join(resolvedPath, 'src');

  if (!fs.existsSync(srcDir)) {
    const message = `src/ directory not found in ${pluginPath}. Pass an extension folder that contains src/.`;
    if (options.json) {
      printJson({ success: false, plugin: pluginPath, errors: [message], warnings: [] });
    } else {
      console.error(`Error: ${message}`);
    }
    return false;
  }

  const report = {
    success: true,
    plugin: pluginPath,
    manifest: { errors: [], warnings: [] },
    files: {}
  };

  if (!options.json) {
    printHeading(`VBook extension validation: ${pluginPath}`);
  }

  // 1. Validate plugin.json manifest
  const pluginJsonPath = path.join(resolvedPath, 'plugin.json');
  const declaredScripts = new Set();
  if (fs.existsSync(pluginJsonPath)) {
    if (!options.json) console.log('\nChecking plugin.json...');
    try {
      const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
      const metadata = plugin.metadata || {};
      const scripts = plugin.script || {};
      const extType = metadata.type;

      for (const scriptFile of Object.values(scripts)) {
        if (typeof scriptFile === 'string') declaredScripts.add(scriptFile);
      }

      if (!extType || !EXTENSION_TYPES.includes(extType)) {
        const msg = `Unsupported or missing metadata.type "${extType || ''}". Choose one of: ${EXTENSION_TYPES.join(', ')}.`;
        report.manifest.errors.push(msg);
        report.success = false;
        if (!options.json) printStatus('error', msg);
      } else {
        if (!options.json) printStatus('ok', `Manifest metadata.type: ${extType}`);
        const required = REQUIRED_SCRIPTS_BY_TYPE[extType] || [];
        for (const key of required) {
          if (!scripts[key]) {
            const msg = `Missing required script entry "${key}" in plugin.json.`;
            report.manifest.errors.push(msg);
            report.success = false;
            if (!options.json) printStatus('error', msg);
          } else if (!fs.existsSync(path.join(srcDir, scripts[key]))) {
            const msg = `Required script "${key}" points to missing file "src/${scripts[key]}".`;
            report.manifest.errors.push(msg);
            report.success = false;
            if (!options.json) printStatus('error', msg);
          } else if (!options.json) {
            printStatus('ok', `Required script "${key}": ${scripts[key]}`);
          }
        }
        if (extType === 'news' || extType === 'forum') {
          const hasListSource = LIST_SCRIPTS.some((k) => scripts[k] && fs.existsSync(path.join(srcDir, scripts[k])));
          if (!hasListSource) {
            const msg = `Type "${extType}" requires at least one listing script (home, explore, genre, or search).`;
            report.manifest.errors.push(msg);
            report.success = false;
            if (!options.json) printStatus('error', msg);
          } else if (!options.json) {
            printStatus('ok', 'Found listing source script.');
          }
        }
      }

      const metaSource = metadata.source ? String(metadata.source).trim().replace(/\/+$/, '') : '';
      const domainDefault = plugin.config && plugin.config.DOMAIN && plugin.config.DOMAIN.default
        ? String(plugin.config.DOMAIN.default).trim().replace(/\/+$/, '')
        : '';
      if (metaSource && domainDefault && metaSource !== domainDefault) {
        const warn = `config.DOMAIN.default (${plugin.config.DOMAIN.default}) differs from metadata.source (${metadata.source}).`;
        report.manifest.warnings.push(warn);
        if (!options.json) printStatus('warn', warn);
      }
    } catch (err) {
      const msg = `Could not parse plugin.json: ${err.message}`;
      report.manifest.errors.push(msg);
      report.success = false;
      if (!options.json) printStatus('error', msg);
    }
  }

  // 2. Parse all src/*.js files and discover loaded helper libraries
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
  const parsedFiles = new Map();
  const helperLibs = new Set(['config.js']);

  for (const file of files) {
    const code = fs.readFileSync(path.join(srcDir, file), 'utf8');
    try {
      const ast = acorn.parse(code, { ecmaVersion: 2020 });
      const findings = analyzeScriptAst(ast);
      parsedFiles.set(file, { ok: true, findings });
      for (const lib of findings.loadedFiles) {
        if (!declaredScripts.has(lib)) helperLibs.add(lib);
      }
    } catch (err) {
      parsedFiles.set(file, { ok: false, error: err });
    }
  }

  // 3. Evaluate each script
  for (const file of files) {
    const fileReport = { errors: [], warnings: [], helper: helperLibs.has(file) };
    report.files[file] = fileReport;
    if (!options.json) console.log(`\nChecking ${file}...`);

    const parsed = parsedFiles.get(file);
    if (!parsed.ok) {
      const loc = parsed.error.loc ? `${parsed.error.loc.line}:${parsed.error.loc.column}` : 'unknown';
      const msg = `Syntax error at ${loc}: ${parsed.error.message}`;
      fileReport.errors.push(msg);
      report.success = false;
      if (!options.json) printStatus('error', msg);
      continue;
    }

    if (!options.json) printStatus('ok', 'Valid JavaScript syntax.');
    const f = parsed.findings;

    if (helperLibs.has(file)) {
      if (!options.json) printStatus('info', 'Helper library loaded via load(); execute() not required.');
    } else if (!f.hasExecute) {
      const msg = 'Missing execute() entry point.';
      fileReport.errors.push(msg);
      report.success = false;
      if (!options.json) printStatus('error', msg);
    } else if (!options.json) {
      printStatus('ok', 'Found execute() function.');
    }

    if (!helperLibs.has(file) && f.callsParseWithoutOk) {
      const warn = 'Calls .html(), .json(), or .text() without checking response.ok.';
      fileReport.warnings.push(warn);
      if (!options.json) printStatus('warn', warn);
    }
    if (f.declaresDomain) {
      const msg = 'Redeclares DOMAIN. Remove the declaration and read BASE_URL from config.js.';
      fileReport.errors.push(msg);
      report.success = false;
      if (!options.json) printStatus('error', msg);
    }
    if (f.hasAsyncAwait) {
      const msg = 'Unsupported on Rhino: async/await detected. Use synchronous fetch() instead.';
      fileReport.errors.push(msg);
      report.success = false;
      if (!options.json) printStatus('error', msg);
    }
    if (f.hasOptionalChaining) {
      const msg = 'Unsupported on Rhino: optional chaining (?.) detected. Use explicit guards instead.';
      fileReport.errors.push(msg);
      report.success = false;
      if (!options.json) printStatus('error', msg);
    }
    if (f.hasNullishCoalescing) {
      const msg = 'Unsupported on Rhino: nullish coalescing (??) detected. Use || or explicit checks instead.';
      fileReport.errors.push(msg);
      report.success = false;
      if (!options.json) printStatus('error', msg);
    }
    if (f.hasConst) {
      const warn = 'Uses const; prefer let or var on the Rhino JavaScript engine.';
      fileReport.warnings.push(warn);
      if (!options.json) printStatus('warn', warn);
    }
  }

  if (options.json) {
    printJson(report);
  } else if (report.success) {
    console.log('\nValidation passed.');
  } else {
    console.warn('\nValidation failed. Resolve the reported issues and run validate again.');
  }

  return report.success;
}

module.exports = {
  handleValidateCommand,
  analyzeScriptAst
};
