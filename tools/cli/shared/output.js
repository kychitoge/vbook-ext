'use strict';

function printHeading(title) {
  console.log('');
  console.log(title);
  console.log('='.repeat(title.length));
}

function printStatus(level, message) {
  const prefixes = {
    ok: '  ✓',
    warn: '  !',
    error: '  ✗',
    info: '  -'
  };
  const prefix = prefixes[level] || '  -';
  if (level === 'error' || level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function formatError(what, why, action) {
  const parts = [what];
  if (why) parts.push(why);
  if (action) parts.push(action);
  return parts.join(' ');
}

module.exports = {
  printHeading,
  printStatus,
  printJson,
  formatError
};
