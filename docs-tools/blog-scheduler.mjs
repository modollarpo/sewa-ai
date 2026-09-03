import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const toolDir = path.dirname(__filename);
const baseDir = path.join(toolDir, '..');

const CALENDAR_PATH = path.join(baseDir, 'frontend', 'src', 'content', 'content-calendar.json');
const POSTS_DIR = path.join(baseDir, 'frontend', 'src', 'content', 'posts');
const OUT_PATH = path.join(baseDir, 'frontend', 'src', 'content', 'generated', 'published-posts.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const publishPast = args.includes('--publish-past');

function today() { return new Date().toISOString().split('T')[0]; }

function run() {
  const cal = JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8'));
  const posts = cal.posts || [];
  const now = today();
  const toPublish = publishPast
    ? posts.filter(p => p.status === 'scheduled')
    : posts.filter(p => p.status === 'scheduled' && p.publishDate <= now);

  const published = [];
  for (const p of toPublish) {
    const file = path.join(POSTS_DIR, p.contentRef.replace('.md', '.json').replace('posts/', ''));
    if (!fs.existsSync(file)) { console.warn(`⚠ missing ${file}`); continue; }
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    published.push({ ...p, ...content, publishedAt: now, status: 'published' });
  }

  if (dryRun) {
    console.log(`[dry-run] ${published.length} post(s) would be published on/around ${now}:`);
    published.forEach(p => console.log(`  - ${p.id}  ${p.publishDate}  ${p.title}`));
    return;
  }

  const dir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify({ meta: { generated: now, total: published.length }, posts: published }, null, 2));
  console.log(`✓ Published ${published.length} post(s) → ${OUT_PATH}`);
}

run();