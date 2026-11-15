#!/usr/bin/env node
/**
 * REMOTE-ENCRYPT.JS - Online Encryption Tool via https://linhlung.cc API
 * Usage: node tools/encrypt/remote-encrypt.js <extFolder|plugin.zip> [--output <dest>] [--replace]
 * 
 * Inspired by vbook-vscode-tester implementation
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const API_URL = 'https://linhlung.cc/i/vbook/api/plugin-encrypt.php';

function buildZipBufferFromFolder(folderPath) {
  const zip = new AdmZip();
  const pluginJson = path.join(folderPath, 'plugin.json');
  if (!fs.existsSync(pluginJson)) {
    throw new Error('plugin.json not found in ' + folderPath);
  }
  zip.addLocalFile(pluginJson, '');

  const iconPath = path.join(folderPath, 'icon.png');
  if (fs.existsSync(iconPath)) {
    zip.addLocalFile(iconPath, '');
  }

  const srcDir = path.join(folderPath, 'src');
  if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir);
    for (const f of files) {
      const full = path.join(srcDir, f);
      if (fs.statSync(full).isFile()) {
        zip.addLocalFile(full, 'src');
      }
    }
  }

  return zip.toBuffer();
}

async function remoteEncrypt(targetPath, options = {}) {
  const absTarget = path.resolve(targetPath);
  if (!fs.existsSync(absTarget)) {
    throw new Error(`Target not found: ${absTarget}`);
  }

  let zipBuffer;
  let outDir;

  const stat = fs.statSync(absTarget);
  if (stat.isDirectory()) {
    outDir = absTarget;
    const existingZip = path.join(absTarget, 'plugin.zip');
    if (fs.existsSync(existingZip) && !options.rebuild) {
      console.log(`[ENCRYPT] Using existing zip: ${existingZip}`);
      zipBuffer = fs.readFileSync(existingZip);
    } else {
      console.log(`[ENCRYPT] Packaging extension folder: ${absTarget}`);
      zipBuffer = buildZipBufferFromFolder(absTarget);
    }
  } else if (absTarget.endsWith('.zip')) {
    outDir = path.dirname(absTarget);
    zipBuffer = fs.readFileSync(absTarget);
  } else {
    throw new Error('Target must be an extension folder or a .zip file');
  }

  const boundary = '----vBookFormBoundary' + Math.random().toString(36).substring(2);
  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="act"\r\n\r\nencrypt\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="plugin.zip"\r\nContent-Type: application/zip\r\n\r\n`),
    zipBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  console.log(`[ENCRYPT] Uploading ${(zipBuffer.length / 1024).toFixed(2)} KB to ${API_URL}...`);

  const u = new URL(API_URL);
  const responseText = await new Promise((resolve, reject) => {
    const req = https.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
        'User-Agent': 'vBook-Tool/3.0.1'
      },
      timeout: 45000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out to ' + API_URL));
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });

  let json;
  try {
    json = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid JSON from API (${responseText.substring(0, 200)})`);
  }

  if (!json || json.status !== true) {
    throw new Error(`API Encryption failed: ${json ? json.msg : 'Unknown error'}`);
  }

  if (typeof json.data !== 'string' || !json.data) {
    throw new Error('API returned invalid base64 data');
  }

  const outBuffer = Buffer.from(json.data, 'base64');
  const outFile = options.output
    ? path.resolve(options.output)
    : path.join(outDir, options.replace ? 'plugin.zip' : 'encrypt.zip');

  fs.writeFileSync(outFile, outBuffer);
  const sizeKb = (outBuffer.length / 1024).toFixed(2);
  console.log(`[SUCCESS] Encrypted extension saved to: ${outFile} (${sizeKb} KB)`);

  return { success: true, outFile, sizeKb };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node tools/encrypt/remote-encrypt.js <extFolder|plugin.zip> [--output <dest>] [--replace] [--rebuild]');
    process.exit(0);
  }

  const target = args[0];
  const replace = args.includes('--replace');
  const rebuild = args.includes('--rebuild');
  let output = null;
  const outIdx = args.indexOf('--output');
  if (outIdx !== -1 && args[outIdx + 1]) {
    output = args[outIdx + 1];
  }

  remoteEncrypt(target, { replace, rebuild, output })
    .catch(err => {
      console.error('[ERROR]', err.message);
      process.exit(1);
    });
}

module.exports = { remoteEncrypt, buildZipBufferFromFolder };
