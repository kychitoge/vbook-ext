'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { printHeading, printJson, formatError } = require('../shared/output');

async function handleAnalyzeCommand(options) {
  const url = options.url || options.plugin;
  if (!url || !url.startsWith('http')) {
    const message = formatError(
      'A valid HTTP or HTTPS URL is required.',
      'No URL was provided or the scheme is missing.',
      'Run `node tools/cli/index.js analyze https://example.com/item`.'
    );
    if (options.json) {
      printJson({ success: false, error: message });
    } else {
      console.error(`Error: ${message}`);
    }
    return false;
  }

  if (!options.json) {
    printHeading(`VBook extension analyzer: ${url}`);
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      },
      timeout: 20000
    });

    const $ = cheerio.load(response.data);
    const host = new URL(url).origin;

    const title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || $('title').text().trim();
    const titleSelector = $('h1').length ? 'h1' : ($('meta[property="og:title"]').length ? 'meta[property="og:title"]' : 'title');

    let author = '';
    let authorSelector = '';
    $('*').each((_, el) => {
      const text = $(el).text();
      if (text.includes('Tác giả') || text.includes('Author')) {
        author = text.split(':').pop().trim();
        authorSelector = String($(el).prop('tagName') || '').toLowerCase();
        return false;
      }
      return undefined;
    });

    const chapterLinks = [];
    $('a').each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes('chương') || text.includes('chapter') || /^\d+$/.test(text.trim())) {
        chapterLinks.push({
          text: $(el).text().trim(),
          href: $(el).attr('href'),
          selector: 'a'
        });
      }
    });

    const result = {
      success: true,
      url,
      host,
      title,
      titleSelector,
      author: author || null,
      authorSelector: authorSelector || '.author',
      chapterLinkCount: chapterLinks.length
    };

    if (options.json) {
      printJson(result);
    } else {
      console.log(`Title: ${title || '(not detected)'}`);
      console.log(`Author: ${author || '(not detected)'}`);
      console.log(`Potential chapter links: ${chapterLinks.length}`);
      console.log('\nSuggested detail.js starter:');
      console.log('```javascript');
      console.log('load("config.js");');
      console.log('function execute(url) {');
      console.log('    let response = fetch(normalizeUrl(url));');
      console.log('    if (!response.ok) return Response.error("HTTP " + response.status);');
      console.log('    let doc = response.html();');
      console.log('    return Response.success({');
      console.log(`        name: doc.select("${titleSelector}").text() + "",`);
      console.log(`        author: doc.select("${authorSelector || '.author'}").text() + "",`);
      console.log(`        host: "${host}"`);
      console.log('    });');
      console.log('}');
      console.log('```');
    }

    return true;
  } catch (err) {
    const message = formatError(
      `Could not fetch ${url}.`,
      err.message,
      'Check the URL and network connection, and then try again.'
    );
    if (options.json) {
      printJson({ success: false, url, error: message });
    } else {
      console.error(`Error: ${message}`);
    }
    return false;
  }
}

module.exports = {
  handleAnalyzeCommand
};
