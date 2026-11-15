'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const vm = require('vm');
const cheerio = require('cheerio');
const CryptoJS = require('crypto-js');

const WORKER_SCRIPT = path.join(__dirname, 'sync-fetch-worker.js');

function createCheerioWrapper(cheerioObj) {
  return {
    select: (sel) => {
      const found = cheerioObj.find ? cheerioObj.find(sel) : cheerioObj(sel);
      return createCheerioWrapper(found);
    },
    first: () => createCheerioWrapper(cheerioObj.first()),
    last: () => createCheerioWrapper(cheerioObj.last()),
    get: (idx) => createCheerioWrapper(cheerioObj.eq(idx)),
    text: () => cheerioObj.text().trim(),
    html: () => cheerioObj.html() || '',
    attr: (name) => cheerioObj.attr(name) || '',
    attributes: () => {
      const el = cheerioObj[0];
      return el && el.attribs ? { ...el.attribs } : {};
    },
    size: () => cheerioObj.length,
    isEmpty: () => cheerioObj.length === 0,
    map: (fn) => {
      const res = [];
      cheerioObj.each((i, el) => {
        res.push(fn(createCheerioWrapper(cheerio(el)), i));
      });
      return res;
    },
    forEach: (fn) => {
      cheerioObj.each((i, el) => {
        fn(createCheerioWrapper(cheerio(el)), i);
      });
    },
    remove: () => {
      cheerioObj.remove();
      return createCheerioWrapper(cheerioObj);
    }
  };
}

function syncFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  let body = options.body;
  
  if (options.queries && typeof options.queries === 'object') {
    try {
      const parsedUrl = new URL(url);
      for (const [k, v] of Object.entries(options.queries)) {
        parsedUrl.searchParams.set(k, String(v));
      }
      url = parsedUrl.toString();
    } catch (e) {
      // ignore
    }
  }

  const child = cp.spawnSync(process.execPath, [
    WORKER_SCRIPT,
    url,
    JSON.stringify({
      method,
      headers,
      body,
      timeout: options.timeout || 30000
    })
  ], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  if (child.status !== 0 || child.error) {
    const errMsg = child.stderr || child.error?.message || 'Process error';
    return {
      status: 500,
      statusText: 'Internal Error',
      ok: false,
      headers: {},
      url: url,
      header: () => '',
      text: () => errMsg,
      json: () => ({ error: errMsg }),
      html: () => createCheerioWrapper(cheerio.load('')),
      base64: () => '',
      blob: () => ({ size: 0, type: '', base64: () => '' })
    };
  }

  try {
    const raw = JSON.parse(child.stdout);
    const buf = Buffer.from(raw.data || '', 'base64');

    return {
      status: raw.status,
      statusText: raw.statusText,
      ok: raw.status >= 200 && raw.status < 300,
      headers: raw.headers || {},
      url: raw.url || url,
      header: (key) => {
        if (!raw.headers) return '';
        const found = Object.keys(raw.headers).find(k => k.toLowerCase() === String(key).toLowerCase());
        return found ? raw.headers[found] : '';
      },
      text: (charset) => buf.toString('utf8'),
      json: () => JSON.parse(buf.toString('utf8')),
      html: (charset) => {
        const $ = cheerio.load(buf.toString('utf8'));
        return createCheerioWrapper($.root());
      },
      base64: () => raw.data,
      blob: () => ({
        size: buf.length,
        type: raw.headers ? (raw.headers['content-type'] || '') : '',
        base64: () => raw.data
      })
    };
  } catch (err) {
    return {
      status: 500,
      statusText: 'Parse Error',
      ok: false,
      headers: {},
      url: url,
      header: () => '',
      text: () => child.stdout,
      json: () => ({ error: err.message }),
      html: () => createCheerioWrapper(cheerio.load('')),
      base64: () => ''
    };
  }
}

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
    } catch (e) {}
  }

  const logs = [];

  const sandbox = {
    console: {
      log: (...a) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
      warn: (...a) => logs.push('[WARN] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
      error: (...a) => logs.push('[ERROR] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '))
    },
    fetch: syncFetch,
    Html: {
      parse: (content) => {
        const $ = cheerio.load(content || '');
        return createCheerioWrapper($.root());
      }
    },
    Response: {
      success: (data, data2) => ({ code: 0, data, data2 }),
      error: (message) => ({ code: 1, data: message })
    },
    Http: {
      get: (url, opts) => syncFetch(url, { ...(opts || {}), method: 'GET' }),
      post: (url, opts) => syncFetch(url, { ...(opts || {}), method: 'POST' })
    },
    CryptoJS: CryptoJS,
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
      if (fs.existsSync(loadPath)) {
        const fileCode = fs.readFileSync(loadPath, 'utf8');
        vm.runInContext(fileCode, context, { filename: fileName });
      } else {
        throw new Error(`load(): File not found: ${fileName}`);
      }
    }
  };

  // Inject plugin.json.config keys as global constants (like VBook app does)
  for (const [key, conf] of Object.entries(pluginConfig)) {
    if (typeof sandbox[key] === 'undefined') {
      sandbox[key] = conf.default || '';
    }
  }

  // Common fallbacks
  if (!sandbox.BASE_URL && pluginMeta.source) {
    sandbox.BASE_URL = pluginMeta.source;
  }

  const context = vm.createContext(sandbox);

  const scriptSource = fs.readFileSync(absScriptFile, 'utf8');
  vm.runInContext(scriptSource, context, { filename: absScriptFile });

  if (typeof context.execute !== 'function') {
    throw new Error(`Script ${path.basename(absScriptFile)} does not export execute() function`);
  }

  const stringArgs = args.map(a => a === null || a === undefined ? '' : String(a));
  const res = context.execute(...stringArgs);

  return {
    result: res,
    logs: logs
  };
}

async function runLocalTestAll(pluginDir) {
  const absPluginDir = path.resolve(pluginDir);
  const pluginJsonFile = path.join(absPluginDir, 'plugin.json');
  if (!fs.existsSync(pluginJsonFile)) {
    throw new Error(`plugin.json not found in ${absPluginDir}`);
  }

  const plugin = JSON.parse(fs.readFileSync(pluginJsonFile, 'utf8'));
  const meta = plugin.metadata || {};
  const scripts = plugin.script || {};

  console.log(`\n======================================================`);
  console.log(`[TEST-LOCAL] Testing ${meta.name || path.basename(absPluginDir)} (Type: ${meta.type || 'novel'})`);
  console.log(`[TEST-LOCAL] Source: ${meta.source}`);
  console.log(`[TEST-LOCAL] Mode: Offline Local Execution (No Device Connection Required)`);
  console.log(`======================================================\n`);

  const summary = {
    plugin: meta.name,
    steps: []
  };

  // 1. Home
  let homeResult;
  if (scripts.home) {
    console.log(`--> [1/5] Executing ${scripts.home}...`);
    const r = runExtensionScript(absPluginDir, scripts.home, []);
    homeResult = r.result;
    if (r.logs.length) console.log('    ' + r.logs.join('\n    '));
    if (!homeResult || homeResult.code !== 0 || !Array.isArray(homeResult.data) || homeResult.data.length === 0) {
      throw new Error(`[FAIL] ${scripts.home} returned empty or failed: ${JSON.stringify(homeResult)}`);
    }
    console.log(`    [OK] Home returned ${homeResult.data.length} categories/items.`);
    summary.steps.push({ name: 'home', count: homeResult.data.length });
  }

  // 2. Gen (First category from home)
  let genResult;
  let firstBook;
  if (homeResult && homeResult.data && homeResult.data.length > 0) {
    const firstCat = homeResult.data[0];
    const genScript = firstCat.script || 'gen.js';
    const genInput = firstCat.input || '';
    console.log(`--> [2/5] Executing ${genScript} with input "${genInput}"...`);
    const r = runExtensionScript(absPluginDir, genScript, [genInput]);
    genResult = r.result;
    if (r.logs.length) console.log('    ' + r.logs.join('\n    '));
    if (!genResult || genResult.code !== 0 || !Array.isArray(genResult.data) || genResult.data.length === 0) {
      throw new Error(`[FAIL] ${genScript} returned empty or failed: ${JSON.stringify(genResult)}`);
    }
    console.log(`    [OK] Gen returned ${genResult.data.length} books.`);
    summary.steps.push({ name: 'gen', count: genResult.data.length });
    firstBook = genResult.data[0];
  }

  if (!firstBook) {
    throw new Error('[FAIL] No novel/item found from home/gen to continue detail test');
  }

  let detailUrl = firstBook.link;
  if (firstBook.host && detailUrl && !String(detailUrl).startsWith('http')) {
    const base = String(firstBook.host).endsWith('/') ? firstBook.host : `${firstBook.host}/`;
    detailUrl = `${base}${String(detailUrl).startsWith('/') ? String(detailUrl).slice(1) : detailUrl}`;
  }

  // 3. Detail
  const detailScript = scripts.detail || 'detail.js';
  console.log(`--> [3/5] Executing ${detailScript} with link "${detailUrl}"...`);
  const detailRun = runExtensionScript(absPluginDir, detailScript, [detailUrl]);
  const detailRes = detailRun.result;
  if (detailRun.logs.length) console.log('    ' + detailRun.logs.join('\n    '));
  if (!detailRes || detailRes.code !== 0 || !detailRes.data) {
    throw new Error(`[FAIL] ${detailScript} failed: ${JSON.stringify(detailRes)}`);
  }
  const bookName = detailRes.data.name || firstBook.name;
  console.log(`    [OK] Detail fetched: "${bookName}" (Author: ${detailRes.data.author || 'N/A'})`);
  summary.steps.push({ name: 'detail', book: bookName });

  // 4. TOC
  const tocScript = scripts.toc || 'toc.js';
  console.log(`--> [4/5] Executing ${tocScript} with link "${detailUrl}"...`);
  const tocRun = runExtensionScript(absPluginDir, tocScript, [detailUrl]);
  const tocRes = tocRun.result;
  if (tocRun.logs.length) console.log('    ' + tocRun.logs.join('\n    '));
  if (!tocRes || tocRes.code !== 0 || !Array.isArray(tocRes.data) || tocRes.data.length === 0) {
    throw new Error(`[FAIL] ${tocScript} failed or returned 0 chapters: ${JSON.stringify(tocRes)}`);
  }
  console.log(`    [OK] TOC returned ${tocRes.data.length} chapters. (First: "${tocRes.data[0].name}")`);
  summary.steps.push({ name: 'toc', chaptersCount: tocRes.data.length });

  // 5. Chap
  const firstChap = tocRes.data[0];
  let chapUrl = firstChap.url;
  if (firstChap.host && chapUrl && !String(chapUrl).startsWith('http')) {
    const base = String(firstChap.host).endsWith('/') ? firstChap.host : `${firstChap.host}/`;
    chapUrl = `${base}${String(chapUrl).startsWith('/') ? String(chapUrl).slice(1) : chapUrl}`;
  }
  const chapScript = scripts.chap || 'chap.js';
  console.log(`--> [5/5] Executing ${chapScript} with chapter "${chapUrl}"...`);
  const chapRun = runExtensionScript(absPluginDir, chapScript, [chapUrl]);
  const chapRes = chapRun.result;
  if (chapRun.logs.length) console.log('    ' + chapRun.logs.join('\n    '));
  if (!chapRes || chapRes.code !== 0) {
    throw new Error(`[FAIL] ${chapScript} failed: ${JSON.stringify(chapRes)}`);
  }
  const content = chapRes.data;
  const contentLen = content ? (Array.isArray(content) ? content.length : String(content).length) : 0;
  console.log(`    [OK] Chap content loaded: ${contentLen} chars/elements. Title: "${chapRes.data2 || ''}"`);
  summary.steps.push({ name: 'chap', length: contentLen });

  // Optional: Search
  if (scripts.search) {
    const query = bookName.slice(0, 8);
    console.log(`--> [BONUS] Testing ${scripts.search} with keyword "${query}"...`);
    try {
      const searchRun = runExtensionScript(absPluginDir, scripts.search, [query, '1']);
      if (searchRun.result && searchRun.result.code === 0) {
        const list = Array.isArray(searchRun.result.data) ? searchRun.result.data : [];
        console.log(`    [OK] Search returned ${list.length} matches.`);
        summary.steps.push({ name: 'search', count: list.length });
      }
    } catch (e) {
      console.log(`    [WARN] Search check skipped: ${e.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`[PASS] ALL TESTS COMPLETED SUCCESSFULLY WITHOUT DEVICE!`);
  console.log(`======================================================\n`);
  return summary;
}

module.exports = {
  syncFetch,
  runExtensionScript,
  runLocalTestAll
};

if (require.main === module) {
  const target = process.argv[2] || 'extensions/novel/kychi_lilyhub';
  runLocalTestAll(target).catch(err => {
    console.error('\n[ERROR]', err.message);
    process.exit(1);
  });
}
