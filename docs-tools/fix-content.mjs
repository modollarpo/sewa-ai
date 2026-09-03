import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const toolDir = path.dirname(__filename);
const baseDir = path.join(toolDir, '..');
const postsDir = path.join(baseDir, 'frontend', 'src', 'content', 'posts');

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.json'));
let fixed = 0;

for (const f of files) {
  const fp = path.join(postsDir, f);
  const raw = fs.readFileSync(fp, 'utf8');

  let valid = false;
  try { valid = JSON.parse(raw); } catch (e) { /* needs fix */ }
  if (valid) { console.log('OK: ' + f); continue; }

  // Step 1: close the unclosed content string before the "tags" key.
  // Type B: lone backslash + real newline before "tags" -> close + comma + newline
  let s = raw.replace(/\\\n(\s*)"tags"\s*:/, '",\n  "tags":');
  // Type A: backslash-n escape + spaces before "tags" -> close + comma + newline
  // (matches the LAST \n before tags, e.g. the 2nd of \n\n, keeping earlier ones as content)
  s = s.replace(/\\n(\s*)"tags"\s*:/, '",\n  "tags":');

  // Step 2: single correct state-machine pass:
  // - preserve/fix escapes inside strings, escape real control chars inside strings
  // - convert structural backslash-n (outside strings) to real newlines
  let out = '';
  let inStr = false;
  let i = 0;
  const VALID_ESC = '"\\/bfnrtu';
  while (i < s.length) {
    const ch = s[i];
    if (inStr && ch === '\\' && i + 1 < s.length) {
      const nx = s[i + 1];
      if (VALID_ESC.includes(nx)) { out += ch + nx; i += 2; continue; }
      if (nx === '\n') { out += '\\n'; i += 2; continue; }
      out += '\\\\' + nx; i += 2; continue; // bad escape -> escape the backslash
    }
    if (ch === '"') { inStr = !inStr; out += ch; i += 1; continue; }
    if (inStr && ch === '\n') { out += '\\n'; i += 1; continue; }
    if (inStr && ch === '\r') { out += '\\r'; i += 1; continue; }
    if (inStr && ch === '\t') { out += '\\t'; i += 1; continue; }
    if (!inStr && ch === '\\' && i + 1 < s.length && s[i + 1] === 'n') {
      out += '\n'; i += 2; continue;
    }
    out += ch; i += 1;
  }

  try {
    const parsed = JSON.parse(out);
    fs.writeFileSync(fp, JSON.stringify(parsed, null, 2));
    console.log('Fixed: ' + f);
    fixed++;
  } catch (e3) {
    console.log('Still broken: ' + f + ' - ' + e3.message.slice(0, 150));
  }
}
console.log('Fixed ' + fixed + ' file(s)');