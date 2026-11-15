#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function buildVsix() {
  const rootDir = path.resolve(__dirname, '..');
  const testerDir = path.join(rootDir, 'vbook-vscode-tester');
  const pkgPath = path.join(testerDir, 'extension', 'package.json');
  
  if (!fs.existsSync(pkgPath)) {
    throw new Error('package.json not found in ' + pkgPath);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version || '0.1.0';
  const outFileName = `vbook-vscode-tester-${version}.vsix`;
  const outFile = path.join(rootDir, outFileName);

  console.log(`Packaging ${outFileName}...`);

  const zip = new AdmZip();

  // 1. Add [Content_Types].xml to root of zip
  const contentTypesPath = path.join(testerDir, '[Content_Types].xml');
  if (fs.existsSync(contentTypesPath)) {
    zip.addLocalFile(contentTypesPath, '');
  } else {
    throw new Error('[Content_Types].xml not found');
  }

  // 2. Add extension.vsixmanifest to root of zip
  const manifestPath = path.join(testerDir, 'extension.vsixmanifest');
  if (fs.existsSync(manifestPath)) {
    zip.addLocalFile(manifestPath, '');
  } else {
    throw new Error('extension.vsixmanifest not found');
  }

  // 3. Add all files inside extension directory
  const extDir = path.join(testerDir, 'extension');
  function addDirectoryRecursively(currentPath, zipSubDir) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentPath, item.name);
      if (item.isDirectory()) {
        const nextZipDir = zipSubDir ? `${zipSubDir}/${item.name}` : item.name;
        addDirectoryRecursively(fullPath, nextZipDir);
      } else {
        const content = fs.readFileSync(fullPath);
        const zipEntryPath = zipSubDir ? `${zipSubDir}/${item.name}` : item.name;
        zip.addFile(zipEntryPath, content);
      }
    }
  }

  addDirectoryRecursively(extDir, 'extension');

  zip.writeZip(outFile);

  const stats = fs.statSync(outFile);
  console.log(`[SUCCESS] Built ${outFileName} (${(stats.size / 1024).toFixed(2)} KB) at ${outFile}`);
  return outFile;
}

if (require.main === module) {
  try {
    buildVsix();
  } catch (err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  }
}

module.exports = { buildVsix };
