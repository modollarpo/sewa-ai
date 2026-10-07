import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const toolDir = path.dirname(__filename);
const baseDir = path.join(toolDir, '..');
const postsDir = path.join(baseDir, 'frontend', 'src', 'content', 'posts');

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.json'));

for (const f of files) {
  const fp = path.join(postsDir, f);
  const raw = fs.readFileSync(fp, 'utf8');
  try {
    JSON.parse(raw);
  } catch(e) {
    // Find all backslash characters and show context
    const badEscapes = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '\\' && i + 1 < raw.length) {
        const next = raw[i + 1];
        const validEscapes = 'nrt\"\\';
        if (!validEscapes.includes(next)) {
          badEscapes.push({ pos: i, char: next, context: raw.substring(Math.max(0, i-10), i+10) });
        }
      }
    }
    console.log(f + ': ' + badEscapes.length + ' bad escape(s)');
    if (badEscapes.length > 0) {
      badEscapes.slice(0, 3).forEach(b => {
        console.log('  pos ' + b.pos + ': char="' + b.char + '" context=' + JSON.stringify(b.context));
      });
    }
  }
}
