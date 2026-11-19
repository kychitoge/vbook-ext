'use strict';

const fs = require('fs');
const path = require('path');

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyTemplateToExtension(templateDir, outputDir) {
  if (fs.existsSync(path.join(templateDir, 'src'))) {
    copyDirRecursive(templateDir, outputDir);
    return;
  }

  const srcDir = path.join(outputDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, path.join(outputDir, entry.name));
    } else if (entry.name.endsWith('.js')) {
      fs.copyFileSync(srcPath, path.join(srcDir, entry.name));
    } else {
      fs.copyFileSync(srcPath, path.join(outputDir, entry.name));
    }
  }
}

function resolveDefaultTemplateDir(workspaceRoot, type) {
  const templateType = type === 'chinese_novel' ? 'novel' : type;
  const candidates = [
    path.join(workspaceRoot, 'templates', templateType),
    path.join(workspaceRoot, '.agents', 'skills', 'vbook-extensions', 'templates', templateType),
    path.join(workspaceRoot, '.private', 'code-reference', '_unknown', 'example')
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

module.exports = {
  copyDirRecursive,
  copyTemplateToExtension,
  resolveDefaultTemplateDir
};
