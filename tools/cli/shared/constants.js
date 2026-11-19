'use strict';

const EXTENSION_TYPES = [
  'novel',
  'comic',
  'video',
  'audio',
  'news',
  'forum',
  'chinese_novel',
  'translate',
  'tts',
  'ai'
];

const EXTENSION_LOCALES = [
  'vi',
  'vi_VN',
  'zh',
  'zh_CN',
  'en',
  'en_US'
];

const REQUIRED_SCRIPTS_BY_TYPE = {
  novel: ['detail', 'toc', 'chap'],
  comic: ['detail', 'toc', 'chap'],
  chinese_novel: ['detail', 'toc', 'chap'],
  video: ['detail', 'toc', 'chap', 'track'],
  audio: ['detail', 'toc', 'chap', 'track'],
  news: ['article'],
  forum: ['posts'],
  tts: ['voice', 'tts'],
  translate: ['language', 'translate'],
  ai: ['chatStream']
};

const LIST_SCRIPTS = ['home', 'explore', 'genre', 'search'];

const CANONICAL_VBOOK_SCRIPT = '.agents/skills/vbook-extensions/scripts/vbook.js';

function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function ensureUrl(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function escapeRegexHost(hostname) {
  return hostname.replace(/\./g, '\\.');
}

function buildDefaultRegexp(sourceUrl) {
  try {
    const hostname = new URL(sourceUrl).hostname;
    const escaped = escapeRegexHost(hostname);
    return `${escaped}/[^/]+/?$`;
  } catch {
    return 'example\\.com/novel/[^/]+/?$';
  }
}

module.exports = {
  EXTENSION_TYPES,
  EXTENSION_LOCALES,
  REQUIRED_SCRIPTS_BY_TYPE,
  LIST_SCRIPTS,
  CANONICAL_VBOOK_SCRIPT,
  slugifyName,
  ensureUrl,
  escapeRegexHost,
  buildDefaultRegexp
};
