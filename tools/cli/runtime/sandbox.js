'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const CryptoJS = require('crypto-js');
const { parseHtml } = require('./cheerio-adapter');
const { syncFetch } = require('./sync-fetch');

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, val) {
    this.store.set(key, String(val));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

function runExtensionScript(pluginDir, scriptPath, args = []) {
  const absPluginDir = path.resolve(pluginDir);
  const absSrcDir = path.join(absPluginDir, 'src');
  const absScriptFile = path.isAbsolute(scriptPath) ? scriptPath : path.join(absSrcDir, scriptPath);

  if (!fs.existsSync(absScriptFile)) {
    throw new Error(`Script file not found: ${absScriptFile}`);
  }

  const pluginJsonFile = path.join(absPluginDir, 'plugin.json');
  let pluginMeta = {};
  let pluginConfig = {};
  if (fs.existsSync(pluginJsonFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(pluginJsonFile, 'utf8'));
      pluginMeta = parsed.metadata || {};
      pluginConfig = parsed.config || {};
    } catch {
      // Ignore malformed manifest; caller handles validation.
    }
  }

  const logs = [];
  let context;

  const sandbox = {
    console: {
      log: (...a) => logs.push(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
      warn: (...a) => logs.push('[WARN] ' + a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
      error: (...a) => logs.push('[ERROR] ' + a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' '))
    },
    fetch: syncFetch,
    Html: {
      parse: (content) => parseHtml(content)
    },
    Response: {
      success: (data, data2) => ({ code: 0, data, data2 }),
      error: (message) => ({ code: 1, data: message })
    },
    Http: {
      get: (url, opts) => syncFetch(url, { ...(opts || {}), method: 'GET' }),
      post: (url, opts) => syncFetch(url, { ...(opts || {}), method: 'POST' })
    },
    CryptoJS,
    Crypto: {
      md5: (str) => CryptoJS.MD5(str).toString(),
      sha256: (str) => CryptoJS.SHA256(str).toString()
    },
    localStorage: new MemoryStorage(),
    cacheStorage: new MemoryStorage(),
    localConfig: new MemoryStorage(),
    localCookie: {
      setCookie: () => {},
      getCookie: () => ''
    },
    load: (fileName) => {
      const loadPath = path.join(absSrcDir, fileName);
      if (!fs.existsSync(loadPath)) {
        throw new Error(`load(): File not found: ${fileName}`);
      }
      const fileCode = fs.readFileSync(loadPath, 'utf8');
      vm.runInContext(fileCode, context, { filename: fileName });
    }
  };

  for (const [key, conf] of Object.entries(pluginConfig)) {
    if (typeof sandbox[key] === 'undefined') {
      sandbox[key] = conf && typeof conf === 'object' ? (conf.default || '') : conf;
    }
  }

  if (!sandbox.BASE_URL && pluginMeta.source) {
    sandbox.BASE_URL = pluginMeta.source;
  }

  context = vm.createContext(sandbox);

  const scriptSource = fs.readFileSync(absScriptFile, 'utf8');
  vm.runInContext(scriptSource, context, { filename: absScriptFile });

  if (typeof context.execute !== 'function') {
    throw new Error(`Script ${path.basename(absScriptFile)} does not define an execute() function.`);
  }

  const stringArgs = args.map((a) => (a === null || a === undefined ? '' : String(a)));
  const result = context.execute(...stringArgs);

  return { result, logs };
}

module.exports = {
  MemoryStorage,
  runExtensionScript
};
