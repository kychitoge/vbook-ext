'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { printHeading, printStatus, printJson, formatError } = require('../shared/output');

function parseRepoInfo(url) {
  const githubRawRegex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//;
  const match = String(url || '').match(githubRawRegex);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}.git`
  };
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function handleSyncRefCommand(options, workspaceRoot) {
  const reposDir = path.join(workspaceRoot, '.private', 'references', 'repos');
  const codeRefDir = path.join(workspaceRoot, '.private', 'code-reference');
  const manifestPath = path.resolve(
    workspaceRoot,
    options.manifest || path.join('.private', 'references', 'remote-sources.json')
  );

  if (!fs.existsSync(manifestPath)) {
    const message = formatError(
      `Remote sources manifest not found at ${path.relative(workspaceRoot, manifestPath)}.`,
      'sync-ref requires a JSON manifest listing community source URLs.',
      'Pass --manifest <path> pointing to a valid remote-sources.json file.'
    );
    if (options.json) {
      printJson({ success: false, error: message });
    } else {
      printHeading('VBook reference sync');
      printStatus('error', message);
    }
    return false;
  }

  fs.mkdirSync(reposDir, { recursive: true });
  fs.mkdirSync(codeRefDir, { recursive: true });

  const remoteSources = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sources = Array.isArray(remoteSources.sources) ? remoteSources.sources : [];

  if (!options.json) {
    printHeading('VBook reference sync');
    console.log(`Found ${sources.length} sources in manifest.`);
  }

  let syncedRepos = 0;
  for (const source of sources) {
    const repoInfo = parseRepoInfo(source.url);
    if (!repoInfo) continue;

    const targetRepoDir = path.join(reposDir, repoInfo.repo);
    try {
      if (fs.existsSync(path.join(targetRepoDir, '.git'))) {
        execSync('git pull', { cwd: targetRepoDir, stdio: 'ignore' });
      } else if (!fs.existsSync(targetRepoDir)) {
        execSync(`git clone ${repoInfo.url} "${repoInfo.repo}"`, { cwd: reposDir, stdio: 'ignore' });
      }
      syncedRepos++;
    } catch {
      if (!options.json) printStatus('warn', `Could not sync ${repoInfo.owner}/${repoInfo.repo}. Keeping local copy if present.`);
    }
  }

  const repoFolders = fs.readdirSync(reposDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_remote_raw')
    .map((d) => d.name);

  let mergeCount = 0;
  for (const repoName of repoFolders) {
    const repoPath = path.join(reposDir, repoName);
    for (const item of fs.readdirSync(repoPath, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const extPath = path.join(repoPath, item.name);
      const pluginJsonPath = path.join(extPath, 'plugin.json');
      if (!fs.existsSync(pluginJsonPath)) continue;
      try {
        const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
        const type = (plugin.metadata && plugin.metadata.type) || 'novel';
        const targetDir = path.join(codeRefDir, type, item.name);
        copyDirRecursive(extPath, targetDir);
        mergeCount++;
      } catch {
        // Skip invalid plugin.json entries in third-party repos.
      }
    }
  }

  const result = { success: true, syncedRepos, mergedExtensions: mergeCount };
  if (options.json) {
    printJson(result);
  } else {
    printStatus('ok', `Synced ${syncedRepos} repositories and merged ${mergeCount} extensions into .private/code-reference.`);
  }
  return true;
}

module.exports = {
  handleSyncRefCommand,
  parseRepoInfo
};
