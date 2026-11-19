'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { printHeading, printStatus, printJson, formatError } = require('../shared/output');

const UPSTREAM_REPO = 'Darkrai9x/vbook-extensions';
const SKILL_PREFIX = '.agents/skills/vbook-extensions/';

const LOCAL_SKILL_RHINO_BULLET =
  '- Pure JS only (no Node packages / `require` / `import` in `src/*.js`), and **always use `let` or `var` — never `const`** (Rhino JS engine frequently throws errors on `const`).';

const LOCAL_RUNTIME_RHINO_SECTION = [
  '## Rhino ES6 limits',
  '',
  '- **Pure JS only — NO Node packages**: Extension scripts (`src/*.js`) run inside vBook\'s Rhino JS engine, not Node.js. Never `require()`, `import`, or install/use npm/node packages in extension code.',
  '- **Use `let` or `var` — NEVER use `const`**: In Rhino JS engine, `const` frequently causes runtime/syntax errors (especially across `load()`, loops, or re-evaluated scopes). Always declare variables with `let` or `var`.',
  '- Do not use `const`, `async`/`await`, arrow functions, template literals, optional chaining,',
  '  nullish coalescing, object/array spread, `flat`/`flatMap`, default params (`function f(a = 1)`), `String.matchAll`, numeric separators, named',
  '  regex groups, lookbehind, or Java interop. Use `let`/`var`, ordinary functions, string concatenation,',
  '  loops, `Object.assign`, `arr.slice()`, and plain capture groups.',
  '- Always close browser instances in `try { ... } finally { browser.close(); }`, and avoid unverified jsoup helpers like `tagName()`, `is()`, `tag()`, `doc.body()` (use `doc.select("body")` instead).',
  '- Coerce bridge/Java values explicitly: append `+ ""` after `.text()`, `.attr()`, `.html()`, or use `String`, `Number`, or `parseInt`; do not rely on `typeof`',
  '  across the host boundary. A failing iOS bridge may return `undefined`. WebSocket binary',
  '  messages are unavailable on iOS, and actions cannot be interrupted there.'
].join('\n');

function httpsGetBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'vbook-tool/3.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpsGetBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function gitBlobSha(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha1');
  hash.update(`blob ${buf.length}\0`);
  hash.update(buf);
  return hash.digest('hex');
}

function applyLocalRhinoPatches(relPath, content) {
  if (relPath === 'SKILL.md') {
    if (!content.includes('never `const`')) {
      return content.replace(
        '- Scripts sit directly under `src/`;',
        `${LOCAL_SKILL_RHINO_BULLET}\n- Scripts sit directly under \`src/\`;`
      );
    }
    return content;
  }
  if (relPath === 'reference/runtime.md') {
    const startMarker = '## Rhino ES6 limits';
    const endMarker = '\n## Fetching and parsing';
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      return content.slice(0, startIdx) + LOCAL_RUNTIME_RHINO_SECTION + '\n' + content.slice(endIdx);
    }
  }
  return content;
}

function syncDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) syncDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function handleSyncSkillCommand(options, workspaceRoot) {
  const ref = options.branch || 'master';
  const dryRun = Boolean(options.dryRun);
  const skillRoot = path.join(workspaceRoot, '.agents', 'skills', 'vbook-extensions');

  if (!options.json) {
    printHeading(`VBook upstream skill sync (${UPSTREAM_REPO}@${ref})`);
  }

  try {
    const treeUrl = `https://api.github.com/repos/${UPSTREAM_REPO}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
    const treeJson = JSON.parse((await httpsGetBuffer(treeUrl)).toString('utf8'));
    const blobs = (treeJson.tree || []).filter(
      (item) => item.type === 'blob' && item.path.startsWith(SKILL_PREFIX)
    );

    const updated = [];
    const unchanged = [];

    for (const blob of blobs) {
      const rel = blob.path.slice(SKILL_PREFIX.length);
      if (rel.endsWith('servers.json')) continue;
      const localPath = path.join(skillRoot, rel);
      const localSha = gitBlobSha(localPath);

      const isPatchedDoc = rel === 'SKILL.md' || rel === 'reference/runtime.md';
      if (!isPatchedDoc && localSha === blob.sha) {
        unchanged.push(rel);
        continue;
      }

      const rawUrl = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/${encodeURIComponent(ref)}/${blob.path}`;
      if (!isPatchedDoc && dryRun) {
        updated.push(rel);
        continue;
      }

      let buf = await httpsGetBuffer(rawUrl);
      if (isPatchedDoc) {
        const patched = applyLocalRhinoPatches(rel, buf.toString('utf8'));
        buf = Buffer.from(patched, 'utf8');
        if (fs.existsSync(localPath) && fs.readFileSync(localPath).equals(buf)) {
          unchanged.push(rel);
          continue;
        }
        if (dryRun) {
          updated.push(rel);
          continue;
        }
      }

      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, buf);
      updated.push(rel);
    }

    if (!dryRun) {
      syncDir(path.join(skillRoot, 'templates'), path.join(workspaceRoot, 'templates'));
      fs.copyFileSync(
        path.join(skillRoot, 'reference', 'extension-api.md'),
        path.join(workspaceRoot, 'docs', 'extension-api.md')
      );
      fs.copyFileSync(
        path.join(skillRoot, 'reference', 'verify-checklist.md'),
        path.join(workspaceRoot, 'docs', 'verify-checklist.md')
      );
    }

    const result = {
      success: true,
      repo: UPSTREAM_REPO,
      ref,
      dryRun,
      totalFiles: blobs.length,
      updatedCount: updated.length,
      unchangedCount: unchanged.length,
      updated
    };

    if (options.json) {
      printJson(result);
    } else {
      printStatus('ok', `Checked ${blobs.length} upstream skill files (${updated.length} updated, ${unchanged.length} unchanged).`);
      if (dryRun) {
        printStatus('info', 'Dry run complete. No files were written.');
      } else {
        printStatus('ok', 'Synchronized templates/, docs/extension-api.md, and docs/verify-checklist.md.');
      }
    }

    return true;
  } catch (err) {
    const message = formatError(
      `Could not sync skill from ${UPSTREAM_REPO}@${ref}.`,
      err.message,
      'Check network access to GitHub and try again.'
    );
    if (options.json) {
      printJson({ success: false, error: message });
    } else {
      printStatus('error', message);
    }
    return false;
  }
}

module.exports = {
  handleSyncSkillCommand,
  applyLocalRhinoPatches
};
