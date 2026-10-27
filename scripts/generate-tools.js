
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'tools.json');

const EXCLUDED = new Set([
  '.git', '.github', '.wrangler', 'node_modules',
  'scripts', 'tests', 'assets', 'dist', 'build',
  'coverage', 'outputs', 'transcripts'
]);

function parseAttributes(tag) {
  const attrs = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = re.exec(tag))) {
    attrs[match[1].toLowerCase()] =
      match[2] ?? match[3] ?? match[4] ?? '';
  }

  return attrs;
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function metadata(html, key) {
  const re = /<meta\b[^>]*>/gi;
  let match;

  while ((match = re.exec(html))) {
    const attrs = parseAttributes(match[0]);

    if ((attrs.name || '').toLowerCase() === key.toLowerCase()) {
      return decodeEntities(attrs.content || '');
    }
  }

  return '';
}

function htmlTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);

  return match
    ? decodeEntities(match[1].replace(/<[^>]*>/g, '').trim())
    : '';
}

function safeSegment(value) {
  return encodeURIComponent(value).replace(/%2F/gi, '');
}

function resolveAsset(folder, value) {
  const asset = (value || '').trim();

  if (!asset) return '';

  if (/^https?:\/\//i.test(asset) || asset.startsWith('data:')) {
    return asset;
  }

  const relative = asset
    .replace(/^\.\//, '')
    .split('/')
    .map(safeSegment)
    .join('/');

  return `/${safeSegment(folder)}/${relative}`;
}

function buildTool(folderName) {
  const folderPath = path.join(ROOT, folderName);
  const indexPath = path.join(folderPath, 'index.html');

  if (!fs.existsSync(indexPath) || !fs.statSync(indexPath).isFile()) {
    return null;
  }

  const html = fs.readFileSync(indexPath, 'utf8');

  if ((metadata(html, 'toolspace:visible') || 'true').toLowerCase() === 'false') {
    return null;
  }

  const status =
    metadata(html, 'toolspace:status').trim().toLowerCase() === 'ready'
      ? 'ready'
      : 'building';

  const name =
    metadata(html, 'toolspace:title') ||
    htmlTitle(html) ||
    folderName.replace(/[_-]+/g, ' ');

  const thumbnail =
    metadata(html, 'toolspace:thumbnail') ||
    metadata(html, 'og:image');

  return {
    id: folderName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    folder: folderName,
    name,
    category: metadata(html, 'toolspace:category') || 'Lainnya',
    description:
      metadata(html, 'description') ||
      metadata(html, 'toolspace:description') ||
      'Buka untuk mengetahui fungsi tools ini.',
    status,
    statusLabel:
      metadata(html, 'toolspace:status-label') ||
      (status === 'ready' ? 'Siap digunakan' : 'Dalam pengembangan'),
    tag: metadata(html, 'toolspace:tag') || 'HTML · CSS · JavaScript',
    symbol: metadata(html, 'toolspace:symbol') || '✳',
    art: metadata(html, 'toolspace:art') || 'default',
    thumbnail: resolveAsset(folderName, thumbnail),
    url: metadata(html, 'toolspace:url') || `/${safeSegment(folderName)}/`
  };
}

function main() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });

  const tools = entries
    .filter(entry =>
      entry.isDirectory() &&
      !EXCLUDED.has(entry.name) &&
      !entry.name.startsWith('.')
    )
    .map(entry => buildTool(entry.name))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'Tool folders in the repository root.',
    tools
  };

  fs.writeFileSync(
    OUTPUT,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  console.log(
    `Generated tools.json with ${tools.length} tool(s): ` +
    (tools.map(tool => tool.folder).join(', ') || '(none)')
  );
}

main();
