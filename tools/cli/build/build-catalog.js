const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { EXTENSION_TYPES } = require('../shared/constants');

const DEFAULT_RAW_BASE = 'https://raw.githubusercontent.com/kychitoge/vbook-ext/main';

function safeReadJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function detectRawBase(existingData) {
    for (const item of existingData) {
        if (item && typeof item.path === 'string') {
            const idx = item.path.indexOf('/extensions/');
            if (idx > 0) return item.path.slice(0, idx);
        }
    }
    return DEFAULT_RAW_BASE;
}

function extractRelKey(itemPath) {
    if (!itemPath || typeof itemPath !== 'string') return '';
    const match = itemPath.match(/extensions\/([^/]+\/[^/]+)\//);
    return match ? match[1] : '';
}

function isGitIgnored(workspaceRoot, relPath) {
    try {
        execFileSync('git', ['check-ignore', '-q', relPath], { cwd: workspaceRoot, stdio: 'ignore' });
        return true;
    } catch (err) {
        return false;
    }
}

function formatSourceLink(source) {
    if (!source) return '';
    const label = String(source).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
    return `[${label}](${source})`;
}

function buildReadmeTable(data) {
    const lines = [
        '| Icon | Tên | Nguồn | Phiên bản | Loại | Ngôn ngữ |',
        '| :---: | :--- | :--- | :---: | :---: | :---: |'
    ];
    for (const item of data) {
        const relKey = extractRelKey(item.path);
        const dirType = relKey ? relKey.split('/')[0] : (item.type || 'novel');
        const iconHtml = item.icon ? `<img src="${item.icon}" width="40">` : '';
        const sourceLink = formatSourceLink(item.source);
        lines.push(`| ${iconHtml} | **${item.name}** | ${sourceLink} | ${item.version} | ${dirType} | ${item.locale || 'vi_VN'} |`);
    }
    return lines.join('\n');
}

function updateReadme(readmePath, data) {
    if (!fs.existsSync(readmePath)) return false;
    const content = fs.readFileSync(readmePath, 'utf8');
    const tableHeader = '| Icon | Tên | Nguồn | Phiên bản | Loại | Ngôn ngữ |';
    const startIdx = content.indexOf(tableHeader);
    if (startIdx === -1) return false;

    const afterHeader = content.slice(startIdx);
    const nextSectionMatch = afterHeader.match(/\r?\n\r?\n/);
    const endIdx = nextSectionMatch ? startIdx + nextSectionMatch.index : content.length;

    const newTable = buildReadmeTable(data);
    const updated = content.slice(0, startIdx) + newTable + content.slice(endIdx);
    fs.writeFileSync(readmePath, updated, 'utf8');
    return true;
}

function removeLegacyExtensionCatalogs(extRoot) {
    const removed = [];
    const candidates = [
        path.join(extRoot, 'plugin.json'),
        ...EXTENSION_TYPES.map(t => path.join(extRoot, t, 'plugin.json'))
    ];
    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            removed.push(filePath);
        }
    }
    return removed;
}

function buildCatalog(workspaceRoot) {
    const extRoot = path.join(workspaceRoot, 'extensions');
    const rootPluginPath = path.join(workspaceRoot, 'plugin.json');
    const readmePath = path.join(workspaceRoot, 'README.md');

    const removedLegacy = removeLegacyExtensionCatalogs(extRoot);

    const existingRoot = safeReadJson(rootPluginPath) || {};
    const existingData = Array.isArray(existingRoot.data) ? existingRoot.data : [];
    const rawBase = detectRawBase(existingData);

    const diskEntriesByKey = new Map();
    const typeDirs = fs.existsSync(extRoot)
        ? fs.readdirSync(extRoot, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
        : [];
    const orderedTypes = [
        ...EXTENSION_TYPES.filter(t => typeDirs.includes(t)),
        ...typeDirs.filter(t => !EXTENSION_TYPES.includes(t)).sort((a, b) => a.localeCompare(b))
    ];

    for (const type of orderedTypes) {
        if (isGitIgnored(workspaceRoot, `extensions/${type}/`)) continue;
        const typeDir = path.join(extRoot, type);
        if (!fs.existsSync(typeDir)) continue;

        const folders = fs.readdirSync(typeDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort((a, b) => a.localeCompare(b));

        for (const folder of folders) {
            const relKey = `${type}/${folder}`;
            if (isGitIgnored(workspaceRoot, `extensions/${relKey}/`)) continue;
            const pluginPath = path.join(typeDir, folder, 'plugin.json');
            const plugin = safeReadJson(pluginPath);
            if (!plugin || typeof plugin !== 'object') continue;
            const metadata = plugin.metadata && typeof plugin.metadata === 'object' ? plugin.metadata : {};

            diskEntriesByKey.set(relKey, {
                name: metadata.name || folder,
                author: metadata.author || '',
                path: `${rawBase}/extensions/${relKey}/plugin.zip`,
                version: Number(metadata.version || 1),
                source: metadata.source || '',
                icon: `${rawBase}/extensions/${relKey}/icon.png`,
                description: metadata.description || '',
                type: metadata.type || type,
                locale: metadata.locale || 'vi_VN'
            });
        }
    }

    const updatedData = [];
    const seenKeys = new Set();

    for (const item of existingData) {
        const key = extractRelKey(item.path);
        if (key && diskEntriesByKey.has(key) && !seenKeys.has(key)) {
            updatedData.push(diskEntriesByKey.get(key));
            seenKeys.add(key);
        }
    }

    for (const [key, entry] of diskEntriesByKey.entries()) {
        if (!seenKeys.has(key)) {
            updatedData.push(entry);
        }
    }

    const nextRootPlugin = {
        metadata: existingRoot.metadata || { author: 'kychi', description: '' },
        data: updatedData
    };
    fs.writeFileSync(rootPluginPath, JSON.stringify(nextRootPlugin, null, 2) + '\n', 'utf8');

    const readmeUpdated = updateReadme(readmePath, updatedData);

    const files = [
        { type: 'root-plugin', count: updatedData.length, path: 'plugin.json' }
    ];
    if (readmeUpdated) {
        files.push({ type: 'readme', count: updatedData.length, path: 'README.md' });
    }

    return {
        success: true,
        rebuilt: true,
        removedLegacy: removedLegacy.length,
        files,
        total: updatedData.length,
        message: `Updated root plugin.json (${updatedData.length} entries)${readmeUpdated ? ' and README.md' : ''}`
    };
}

module.exports = {
    buildCatalog
};
