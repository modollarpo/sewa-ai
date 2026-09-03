import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const toolDir = path.dirname(__filename);
const baseDir = path.join(toolDir, '..');
const COVERS_DIR = path.join(baseDir, 'frontend', 'public', 'blog', 'covers');

const args = process.argv.slice(2);
const list = args.filter(a => !a.startsWith('--'));

const brand = { green: '#408D7B', greenDark: '#2E6B5E', greenLight: '#52B09A', text: '#1A1A1A', muted: '#6B7B76', bg: '#FFFFFF' };

const templates = {
  feature: (title, subtitle) => `
    <div style="width:1280px;height:720px;background:#FFFFFF;font-family:'IBM Plex Sans',Inter,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:72px 80px;box-sizing:border-box;">
      <div style="position:absolute;top:0;left:0;width:1280px;height:10px;background:linear-gradient(90deg,#408D7B,#2E6B5E);"></div>
      <div style="margin-bottom:28px;">
        <span style="background:#408D7B;color:#FFFFFF;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">SEWA AI</span>
      </div>
      <h1 style="font-size:52px;font-weight:800;color:#1A1A1A;margin:0 0 18px;line-height:1.15;">${title}</h1>
      <p style="font-size:22px;color:#6B7B76;margin:0;line-height:1.5;">${subtitle}</p>
      <div style="margin-top:40px;padding-top:24px;border-top:2px solid #E8F0EE;">
        <span style="font-size:14px;color:#408D7B;font-weight:600;">sewaxai.health</span>
      </div>
    </div>`,
  nhs: (title, subtitle) => `
    <div style="width:1280px;height:720px;background:#FFFFFF;font-family:'IBM Plex Sans',Inter,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:72px 80px;box-sizing:border-box;">
      <div style="position:absolute;top:0;left:0;width:1280px;height:10px;background:linear-gradient(90deg,#2E6B5E,#408D7B);"></div>
      <div style="margin-bottom:28px;">
        <span style="background:#2E6B5E;color:#FFFFFF;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">NHS & Regulatory</span>
      </div>
      <h1 style="font-size:50px;font-weight:800;color:#2E6B5E;margin:0 0 18px;line-height:1.15;">${title}</h1>
      <p style="font-size:22px;color:#6B7B76;margin:0;line-height:1.5;">${subtitle}</p>
      <div style="margin-top:40px;padding-top:24px;border-top:2px solid #E8F0EE;">
        <span style="font-size:14px;color:#408D7B;font-weight:600;">sewaxai.health</span>
      </div>
    </div>`,
  market: (title, subtitle) => `
    <div style="width:1280px;height:720px;background:#FFFFFF;font-family:'IBM Plex Sans',Inter,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:72px 80px;box-sizing:border-box;">
      <div style="position:absolute;top:0;left:0;width:1280px;height:10px;background:linear-gradient(90deg,#408D7B,#52B09A);"></div>
      <div style="margin-bottom:28px;">
        <span style="background:#408D7B;color:#FFFFFF;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Market Positioning</span>
      </div>
      <h1 style="font-size:50px;font-weight:800;color:#1A1A1A;margin:0 0 18px;line-height:1.15;">${title}</h1>
      <p style="font-size:22px;color:#6B7B76;margin:0;line-height:1.5;">${subtitle}</p>
      <div style="margin-top:40px;padding-top:24px;border-top:2px solid #E8F0EE;">
        <span style="font-size:14px;color:#408D7B;font-weight:600;">sewaxai.health</span>
      </div>
    </div>`,
  vision: (title, subtitle) => `
    <div style="width:1280px;height:720px;background:#FFFFFF;font-family:'IBM Plex Sans',Inter,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:72px 80px;box-sizing:border-box;">
      <div style="position:absolute;top:0;left:0;width:1280px;height:10px;background:linear-gradient(90deg,#2E6B5E,#52B09A);"></div>
      <div style="margin-bottom:28px;">
        <span style="background:#2E6B5E;color:#FFFFFF;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Vision & Partnerships</span>
      </div>
      <h1 style="font-size:50px;font-weight:800;color:#2E6B5E;margin:0 0 18px;line-height:1.15;">${title}</h1>
      <p style="font-size:22px;color:#6B7B76;margin:0;line-height:1.5;">${subtitle}</p>
      <div style="margin-top:40px;padding-top:24px;border-top:2px solid #E8F0EE;">
        <span style="font-size:14px;color:#408D7B;font-weight:600;">sewaxai.health</span>
      </div>
    </div>`,
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Conservative cleaner: keep the calendar basename verbatim, strip only Windows-illegal chars.
const cleanName = (s) => String(s ?? '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim() || 'cover.png';

async function build(imagePath, sequence, title, subtitle) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const type = (sequence >= 1 && sequence <= 2) ? 'feature' : (sequence >= 3 && sequence <= 5) ? 'nhs' : (sequence >= 6 && sequence <= 8) ? 'market' : 'vision';
  const body = templates[type](esc(title), esc(subtitle));
  const html = `<html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;">${body}</body></html>`;
  await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
  await page.screenshot({ path: imagePath, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await browser.close();
}

async function main() {
  if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
  const cal = JSON.parse(fs.readFileSync(path.join(baseDir, 'frontend', 'src', 'content', 'content-calendar.json'), 'utf8'));
  const posts = cal.posts || [];
  const targets = list.length ? list.map(id => posts.find(p => p.id === id)) : posts;
  let n = 0;
  for (const p of targets) {
    if (!p) { console.warn(`⚠ requested id not found in calendar`); continue; }
    // File name must match the scheduler/BlogPage convention: calendar `cover` field.
    const base = p.cover ? cleanName(path.basename(p.cover)) : cleanName(`${p.id}.png`);
    const out = path.join(COVERS_DIR, base.toLowerCase().endsWith('.png') ? base : base + '.png');
    await build(out, p.sequence, p.title, p.subtitle);
    console.log(`✓ ${out}`);
    n++;
  }
  console.log(`Done: ${n} cover(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });