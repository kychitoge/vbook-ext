'use strict';

const path = require('path');
const cp = require('child_process');
const { parseHtml } = require('./cheerio-adapter');

const WORKER_SCRIPT = path.join(__dirname, 'sync-fetch-worker.js');

function syncFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  const body = options.body;

  if (options.queries && typeof options.queries === 'object') {
    try {
      const parsedUrl = new URL(url);
      for (const [k, v] of Object.entries(options.queries)) {
        parsedUrl.searchParams.set(k, String(v));
      }
      url = parsedUrl.toString();
    } catch {
      // Preserve raw URL if parsing fails.
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
    const errMsg = child.stderr || (child.error && child.error.message) || 'Process error';
    return {
      status: 500,
      statusText: 'Internal Error',
      ok: false,
      headers: {},
      url,
      header: () => '',
      text: () => errMsg,
      json: () => ({ error: errMsg }),
      html: () => parseHtml(''),
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
        const found = Object.keys(raw.headers).find((k) => k.toLowerCase() === String(key).toLowerCase());
        return found ? raw.headers[found] : '';
      },
      text: () => buf.toString('utf8'),
      json: () => JSON.parse(buf.toString('utf8')),
      html: () => parseHtml(buf.toString('utf8')),
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
      url,
      header: () => '',
      text: () => child.stdout,
      json: () => ({ error: err.message }),
      html: () => parseHtml(''),
      base64: () => ''
    };
  }
}

module.exports = {
  syncFetch
};
