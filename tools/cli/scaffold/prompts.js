'use strict';

const readline = require('readline/promises');

async function askIfMissing(config, key, prompt, fallback = '') {
  if (config[key]) return;
  if (!process.stdin.isTTY) {
    const flag = `--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
    throw new Error(`Missing required option ${flag}. Pass ${flag} <value> when running non-interactively.`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${prompt}${fallback ? ` (${fallback})` : ''}: `);
    config[key] = (answer || fallback || '').trim();
  } finally {
    rl.close();
  }
}

module.exports = {
  askIfMissing
};
