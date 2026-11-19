'use strict';

const fs = require('fs');
const path = require('path');
const { printHeading, printStatus, printJson } = require('../shared/output');

const REQUIRED_KEYS = ['VBOOK_AUTHOR'];
const OPTIONAL_KEYS = ['VBOOK_SERVER', 'VBOOK_IP', 'VBOOK_PORT', 'LOCAL_PORT'];

async function handleCheckEnvCommand(options, workspaceRoot) {
  const envPath = path.join(workspaceRoot, '.env');
  const exists = fs.existsSync(envPath);

  if (!exists) {
    const payload = {
      success: false,
      envFile: false,
      keys: {},
      message: '.env file not found at repository root. Create .env with VBOOK_AUTHOR to configure defaults.'
    };
    if (options.json) {
      printJson(payload);
    } else {
      printHeading('VBook environment check');
      printStatus('warn', payload.message);
    }
    return false;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const configured = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      configured[key] = val.length > 0;
    }
  }

  const keys = {};
  let allRequiredOk = true;
  for (const key of REQUIRED_KEYS) {
    const present = Boolean(configured[key]);
    keys[key] = present ? 'configured' : 'missing';
    if (!present) allRequiredOk = false;
  }
  for (const key of OPTIONAL_KEYS) {
    keys[key] = configured[key] ? 'configured' : 'unset';
  }

  const payload = {
    success: allRequiredOk,
    envFile: true,
    keys
  };

  if (options.json) {
    printJson(payload);
  } else {
    printHeading('VBook environment check');
    for (const [key, state] of Object.entries(keys)) {
      const level = state === 'configured' ? 'ok' : (state === 'missing' ? 'error' : 'info');
      printStatus(level, `${key}: ${state}`);
    }
    if (allRequiredOk) {
      console.log('\nEnvironment check passed.');
    } else {
      console.warn('\nSome required variables are missing. Add them to .env and run check-env again.');
    }
  }

  return allRequiredOk;
}

module.exports = {
  handleCheckEnvCommand
};
