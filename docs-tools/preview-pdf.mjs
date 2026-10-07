import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPath = path.join(__dirname, '..', 'frontend', 'public', 'docs', 'SEWA_AI_Competitive_Landscape_and_Differentiation_Report.pdf');
const outDir = path.join(__dirname, '..', 'docs', 'assets', 'qa-preview');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const pdfBytes = Array.from(new Uint8Array(fs.readFileSync(pdfPath)));

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.evaluate(async (bytes) => {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  document.head.appendChild(script);
  await new Promise((r) => (script.onload = r, script.onerror = r));
  window.__bytes = bytes;
}, pdfBytes);

const result = await page.evaluate(async () => {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) return { ok: false, reason: 'pdf.js failed to load' };
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc = await pdfjsLib.getDocument({ data: window.__bytes }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i);
    const viewport = pg.getViewport({ scale: 1.3 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await pg.render({ canvasContext: ctx, viewport }).promise;
    out.push({ n: i, data: canvas.toDataURL('image/jpeg', 0.7) });
  }
  return { ok: true, pages: out };
});

if (!result.ok) {
  console.error('✗', result.reason);
  await browser.close();
  process.exit(1);
}

result.pages.forEach(({ n, data }) => {
  const base64 = data.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync(path.join(outDir, `page-${String(n).padStart(2, '0')}.jpg`), Buffer.from(base64, 'base64'));
});

console.log(`✓ Rendered ${result.pages.length} pages to ${outDir}`);
await browser.close();