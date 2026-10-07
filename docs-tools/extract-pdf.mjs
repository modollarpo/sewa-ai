import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const name = process.argv[2] || 'SEWA_AI_Competitive_Landscape_and_Differentiation_Report';
const pdfPath = path.join(__dirname, '..', 'frontend', 'public', 'docs', `${name}.pdf`);
if (!fs.existsSync(pdfPath)) {
  console.error('Not found:', pdfPath);
  process.exit(1);
}
const pdfBytes = Array.from(new Uint8Array(fs.readFileSync(pdfPath)));

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.evaluate(async (bytes) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  document.head.appendChild(s);
  await new Promise((r) => (s.onload = r, s.onerror = r));
  window.__bytes = bytes;
}, pdfBytes);

const result = await page.evaluate(async () => {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) return { ok: false, reason: 'pdf.js failed' };
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc = await pdfjsLib.getDocument({ data: window.__bytes }).promise;
  const full = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i);
    const tc = await pg.getTextContent();
    full.push({ n: i, text: tc.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim() });
  }
  return { ok: true, pages: full };
});

if (!result.ok) { console.error('✗', result.reason); process.exit(1); }
for (const p of result.pages) {
  console.log(`\n===== PAGE ${p.n} (${p.text.length} chars) =====`);
  console.log(p.text.slice(0, 1200));
}
await browser.close();