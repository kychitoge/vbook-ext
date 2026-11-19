'use strict';

const fs = require('fs');
const path = require('path');
const { runExtensionScript } = require('./sandbox');

function pickFirstFromExploreSections(absPluginDir, sections) {
  if (!Array.isArray(sections)) return null;
  for (const sec of sections) {
    if (sec && Array.isArray(sec.items) && sec.items.length > 0) {
      return { item: sec.items[0], count: sec.items.length, via: 'items' };
    }
  }
  for (const sec of sections) {
    if (sec && sec.script) {
      const r = runExtensionScript(absPluginDir, sec.script, [sec.input || '', '']);
      if (r.logs.length) console.log('    ' + r.logs.join('\n    '));
      if (r.result && r.result.code === 0 && Array.isArray(r.result.data) && r.result.data.length > 0) {
        return { item: r.result.data[0], count: r.result.data.length, via: sec.script };
      }
    }
  }
  return null;
}

function resolveItemUrl(item, key = 'link') {
  let targetUrl = item[key];
  if (item.host && targetUrl && !String(targetUrl).startsWith('http')) {
    const base = String(item.host).endsWith('/') ? item.host : `${item.host}/`;
    targetUrl = `${base}${String(targetUrl).startsWith('/') ? String(targetUrl).slice(1) : targetUrl}`;
  }
  return targetUrl;
}

async function runLocalTestAll(pluginDir) {
  const absPluginDir = path.resolve(pluginDir);
  const pluginJsonFile = path.join(absPluginDir, 'plugin.json');
  if (!fs.existsSync(pluginJsonFile)) {
    throw new Error(`plugin.json not found in ${absPluginDir}. Pass a valid extension folder path.`);
  }

  const plugin = JSON.parse(fs.readFileSync(pluginJsonFile, 'utf8'));
  const meta = plugin.metadata || {};
  const scripts = plugin.script || {};
  const extType = meta.type || 'novel';

  console.log('\n======================================================');
  console.log(`Local test: ${meta.name || path.basename(absPluginDir)} (type: ${extType})`);
  console.log(`Source: ${meta.source || '(unset)'}`);
  console.log('Mode: Offline local runner');
  console.log('======================================================\n');

  const summary = {
    plugin: meta.name,
    type: extType,
    steps: []
  };

  let firstBook = null;
  if (scripts.home) {
    console.log(`--> Executing ${scripts.home}...`);
    const r = runExtensionScript(absPluginDir, scripts.home, []);
    if (r.logs.length) console.log('    ' + r.logs.join('\n    '));
    if (!r.result || r.result.code !== 0 || !Array.isArray(r.result.data) || r.result.data.length === 0) {
      throw new Error(`${scripts.home} returned empty or failed: ${JSON.stringify(r.result)}`);
    }
    console.log(`    OK: Home returned ${r.result.data.length} tabs.`);
    summary.steps.push({ name: 'home', count: r.result.data.length });

    const firstTab = r.result.data[0];
    const tabScript = firstTab.script || 'gen.js';
    const tabInput = firstTab.input || '';
    if (firstTab.type === 'explore') {
      console.log(`--> Executing explore tab ${tabScript} with input "${tabInput}"...`);
      const er = runExtensionScript(absPluginDir, tabScript, [tabInput]);
      if (er.logs.length) console.log('    ' + er.logs.join('\n    '));
      if (!er.result || er.result.code !== 0 || !Array.isArray(er.result.data)) {
        throw new Error(`${tabScript} returned empty or failed: ${JSON.stringify(er.result)}`);
      }
      const picked = pickFirstFromExploreSections(absPluginDir, er.result.data);
      if (!picked) throw new Error(`Explore tab ${tabScript} produced no items.`);
      console.log(`    OK: Explore tab (${picked.via}) returned ${picked.count} items.`);
      summary.steps.push({ name: 'explore_tab', count: picked.count });
      firstBook = picked.item;
    } else {
      console.log(`--> Executing ${tabScript} with input "${tabInput}"...`);
      const gr = runExtensionScript(absPluginDir, tabScript, [tabInput]);
      if (gr.logs.length) console.log('    ' + gr.logs.join('\n    '));
      if (!gr.result || gr.result.code !== 0 || !Array.isArray(gr.result.data) || gr.result.data.length === 0) {
        throw new Error(`${tabScript} returned empty or failed: ${JSON.stringify(gr.result)}`);
      }
      console.log(`    OK: Listing returned ${gr.result.data.length} items.`);
      summary.steps.push({ name: 'listing', count: gr.result.data.length });
      firstBook = gr.result.data[0];
    }
  } else if (scripts.explore) {
    console.log(`--> Executing ${scripts.explore}...`);
    const er = runExtensionScript(absPluginDir, scripts.explore, []);
    if (er.logs.length) console.log('    ' + er.logs.join('\n    '));
    if (!er.result || er.result.code !== 0 || !Array.isArray(er.result.data) || er.result.data.length === 0) {
      throw new Error(`${scripts.explore} returned empty or failed: ${JSON.stringify(er.result)}`);
    }
    console.log(`    OK: Explore returned ${er.result.data.length} sections.`);
    summary.steps.push({ name: 'explore', count: er.result.data.length });
    const picked = pickFirstFromExploreSections(absPluginDir, er.result.data);
    if (!picked) throw new Error(`${scripts.explore} sections produced no items.`);
    console.log(`    OK: Explore section (${picked.via}) returned ${picked.count} items.`);
    summary.steps.push({ name: 'explore_section', count: picked.count });
    firstBook = picked.item;
  } else if (scripts.search) {
    console.log(`--> Executing ${scripts.search} (no home or explore declared)...`);
    const sr = runExtensionScript(absPluginDir, scripts.search, ['', '1']);
    if (sr.logs.length) console.log('    ' + sr.logs.join('\n    '));
    if (!sr.result || sr.result.code !== 0 || !Array.isArray(sr.result.data) || sr.result.data.length === 0) {
      throw new Error(`${scripts.search} returned empty or failed: ${JSON.stringify(sr.result)}`);
    }
    console.log(`    OK: Search returned ${sr.result.data.length} items.`);
    summary.steps.push({ name: 'search_listing', count: sr.result.data.length });
    firstBook = sr.result.data[0];
  }

  if (!firstBook) {
    throw new Error('No item returned from home, explore, or search to continue the test.');
  }

  const detailUrl = resolveItemUrl(firstBook, 'link');
  let bookName = firstBook.name || '';

  if (extType === 'news') {
    const articleScript = scripts.article || 'article.js';
    console.log(`--> Executing ${articleScript} with link "${detailUrl}"...`);
    const articleRun = runExtensionScript(absPluginDir, articleScript, [detailUrl]);
    const articleRes = articleRun.result;
    if (articleRun.logs.length) console.log('    ' + articleRun.logs.join('\n    '));
    if (!articleRes || articleRes.code !== 0 || !articleRes.data || !articleRes.data.content) {
      throw new Error(`${articleScript} failed or returned empty content: ${JSON.stringify(articleRes)}`);
    }
    bookName = articleRes.data.name || bookName;
    const contentLen = String(articleRes.data.content).length;
    console.log(`    OK: Article fetched "${bookName}" (${contentLen} chars).`);
    summary.steps.push({ name: 'article', title: bookName, length: contentLen });
  } else if (extType === 'forum') {
    const postsScript = scripts.posts || 'posts.js';
    console.log(`--> Executing ${postsScript} with thread "${detailUrl}"...`);
    const postsRun = runExtensionScript(absPluginDir, postsScript, [detailUrl, '']);
    const postsRes = postsRun.result;
    if (postsRun.logs.length) console.log('    ' + postsRun.logs.join('\n    '));
    if (!postsRes || postsRes.code !== 0 || !postsRes.data) {
      throw new Error(`${postsScript} failed: ${JSON.stringify(postsRes)}`);
    }
    const postList = Array.isArray(postsRes.data)
      ? postsRes.data
      : (Array.isArray(postsRes.data.posts) ? postsRes.data.posts : null);
    if (!postList || postList.length === 0) {
      throw new Error(`${postsScript} returned 0 posts: ${JSON.stringify(postsRes)}`);
    }
    const pageInfo = !Array.isArray(postsRes.data) && postsRes.data.total_pages
      ? ` (page ${postsRes.data.page || 1}/${postsRes.data.total_pages})`
      : '';
    console.log(`    OK: Posts fetched (${postList.length} posts${pageInfo}).`);
    summary.steps.push({ name: 'posts', count: postList.length });
  } else {
    const detailScript = scripts.detail || 'detail.js';
    console.log(`--> Executing ${detailScript} with link "${detailUrl}"...`);
    const detailRun = runExtensionScript(absPluginDir, detailScript, [detailUrl]);
    const detailRes = detailRun.result;
    if (detailRun.logs.length) console.log('    ' + detailRun.logs.join('\n    '));
    if (!detailRes || detailRes.code !== 0 || !detailRes.data) {
      throw new Error(`${detailScript} failed: ${JSON.stringify(detailRes)}`);
    }
    bookName = detailRes.data.name || firstBook.name;
    console.log(`    OK: Detail fetched "${bookName}" (author: ${detailRes.data.author || 'N/A'}).`);
    summary.steps.push({ name: 'detail', book: bookName });

    const tocScript = scripts.toc || 'toc.js';
    console.log(`--> Executing ${tocScript} with link "${detailUrl}"...`);
    const tocRun = runExtensionScript(absPluginDir, tocScript, [detailUrl]);
    const tocRes = tocRun.result;
    if (tocRun.logs.length) console.log('    ' + tocRun.logs.join('\n    '));
    if (!tocRes || tocRes.code !== 0 || !Array.isArray(tocRes.data) || tocRes.data.length === 0) {
      throw new Error(`${tocScript} failed or returned 0 chapters: ${JSON.stringify(tocRes)}`);
    }
    console.log(`    OK: TOC returned ${tocRes.data.length} chapters (first: "${tocRes.data[0].name}").`);
    summary.steps.push({ name: 'toc', chaptersCount: tocRes.data.length });

    const chapUrl = resolveItemUrl(tocRes.data[0], 'url');
    const chapScript = scripts.chap || 'chap.js';
    console.log(`--> Executing ${chapScript} with chapter "${chapUrl}"...`);
    const chapRun = runExtensionScript(absPluginDir, chapScript, [chapUrl]);
    const chapRes = chapRun.result;
    if (chapRun.logs.length) console.log('    ' + chapRun.logs.join('\n    '));
    if (!chapRes || chapRes.code !== 0) {
      throw new Error(`${chapScript} failed: ${JSON.stringify(chapRes)}`);
    }
    const content = chapRes.data;
    const contentLen = content ? (Array.isArray(content) ? content.length : String(content).length) : 0;
    console.log(`    OK: Chap loaded (${contentLen} chars or items).`);
    summary.steps.push({ name: 'chap', length: contentLen });
  }

  if (scripts.search) {
    const query = (bookName || 'a').slice(0, 8);
    console.log(`--> Executing ${scripts.search} with keyword "${query}"...`);
    try {
      const searchRun = runExtensionScript(absPluginDir, scripts.search, [query, '1']);
      if (searchRun.result && searchRun.result.code === 0) {
        const list = Array.isArray(searchRun.result.data) ? searchRun.result.data : [];
        console.log(`    OK: Search returned ${list.length} matches.`);
        summary.steps.push({ name: 'search', count: list.length });
      }
    } catch (e) {
      console.log(`    Skipped search check: ${e.message}`);
    }
  }

  console.log('\nLocal test completed successfully.\n');
  return summary;
}

module.exports = {
  pickFirstFromExploreSections,
  runLocalTestAll
};
