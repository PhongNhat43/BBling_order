#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'docs', '.vscode', '.idea', '.system']);

const TARGETS = [
  {dir: 'docs/guides', keywords: ['guide', 'howto', 'proposal', 'tutorial', 'getting-started']},
  {dir: 'docs/reference', keywords: ['reference', 'spec', 'architecture', 'api', 'design']},
  {dir: 'docs/reviews', keywords: ['review', 'code_review', 'improvements', 'audit', 'analysis', 'summary']},
  {dir: 'docs/tests', keywords: ['test', 'testcase', 'testing', 'qa']},
  {dir: 'docs/archives', keywords: []}
];

function titleFromFilename(name) {
  const base = path.basename(name, path.extname(name));
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      files.push(...await walk(path.join(dir, ent.name)));
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
      files.push(path.join(dir, ent.name));
    }
  }
  return files;
}

function chooseTarget(filePath) {
  const name = path.basename(filePath).toLowerCase();
  for (const t of TARGETS) {
    for (const k of t.keywords) {
      if (name.includes(k)) return t.dir;
    }
  }
  return 'docs/archives';
}

function ensureDir(p) {
  return fs.mkdir(p, { recursive: true });
}

function addFrontMatterIfMissing(content, filePath) {
  if (content.startsWith('---')) return content;
  const title = titleFromFilename(filePath);
  const date = new Date().toISOString().split('T')[0];
  const fm = `---\ntitle: "${title}"\ndate: ${date}\ntags: []\n---\n\n`;
  return fm + content;
}

function replaceLinks(content, map, fromPath, toPath) {
  // Matches markdown links to .md files: [text](path/to/file.md#anchor)
  return content.replace(/\[([^\]]+)\]\(([^)]+?\.md)(#[^)]+)?\)/g, (m, text, link, hash) => {
    const normalized = path.normalize(path.join(path.dirname(fromPath), link));
    const key = path.normalize(normalized);
    if (map[key]) {
      const rel = path.relative(path.dirname(toPath), map[key]).replace(/\\/g, '/');
      return `[${text}](${rel}${hash||''})`;
    }
    return m;
  });
}

async function buildMap(files) {
  const map = {};
  for (const f of files) {
    const targetDir = chooseTarget(f);
    const destDir = path.join(ROOT, targetDir);
    const destPath = path.join(destDir, path.basename(f));
    map[path.normalize(f)] = path.normalize(destPath);
  }
  return map;
}

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const files = await walk(ROOT);
  const map = await buildMap(files);

  console.log('Found', files.length, '.md files (excluding docs/ and .system/)');

  for (const [src, dest] of Object.entries(map)) {
    console.log('\n-- File --');
    console.log('Source:', path.relative(ROOT, src));
    console.log('Target:', path.relative(ROOT, dest));
  }

  console.log('\nThis is a DRY RUN. To apply changes run: node scripts/migrate-md.js --apply');

  if (!apply) return;

  // Apply moves / updates
  const createdDirs = new Set();
  for (const [src, dest] of Object.entries(map)) {
    const destDir = path.dirname(dest);
    if (!createdDirs.has(destDir)) {
      await ensureDir(destDir);
      createdDirs.add(destDir);
    }
    let content = await fs.readFile(src, 'utf8');
    content = addFrontMatterIfMissing(content, src);
    content = replaceLinks(content, map, src, dest);
    await fs.writeFile(dest, content, 'utf8');
    if (src !== dest) {
      await fs.unlink(src);
    }
    console.log('Moved:', path.relative(ROOT, src), '→', path.relative(ROOT, dest));
  }

  console.log('\nMigration complete.');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
