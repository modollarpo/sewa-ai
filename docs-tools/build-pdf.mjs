import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const toolDir = path.dirname(__filename);

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node build-pdf.mjs <input.md> <output-name> [subtitle] [ref] [--nocover]');
  process.exit(1);
}
const inputMd = path.resolve(args[0]);
const outputName = args[1];
const subtitle = args[2] || '';
const ref = args[3] || '';
const noCover = args.includes('--nocover');
const compact = args.includes('--compact');

const logoHorizontal = fs.readFileSync(
  path.join(toolDir, '..', 'docs', 'assets', 'logo-horizontal-light.svg'),
  'utf8'
).replace(/fill="none"/, 'fill="none" preserveAspectRatio="xMidYMid meet"');

const OUT_PUBLIC = path.join(toolDir, '..', 'frontend', 'public', 'docs', `${outputName}.pdf`);
const OUT_DOCS = path.join(toolDir, '..', 'docs', `${outputName}.pdf`);

const coverHtml = noCover ? '' : `
<section class="cover">
  <div class="cover-logo">${logoHorizontal}</div>
  <h1 class="cover-title">SEWA AI</h1>
  <p class="cover-subtitle">${subtitle}</p>
  <div class="cover-meta">${ref}</div>
  <div class="classification">Confidential — Not for distribution without written consent</div>
  <div class="cover-org">
    A Storegrill Inc Ltd company · Company No. 14581073<br/>
    NHS Innovation Service INN-2604-0064-2 · Patent GB2609706.3 · info@sewaxai.health
  </div>
</section>
`;

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SEWA AI — ${outputName.replace(/_/g, ' ')}</title>
<style>
${fs.readFileSync(path.join(toolDir, '..', 'docs-tools', 'report-light.css'), 'utf8')}
@page {
  size: A4;
  margin: ${compact ? '10mm 11mm 12mm 11mm' : '18mm 16mm 20mm 16mm'};
  @bottom-center {
    content: "SEWA AI — Confidential";
    font-size: 8pt;
    color: #6B7B76;
  }
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 8pt;
    color: #6B7B76;
  }
  @top-right { content: none; }
}
.compact-page {
  margin: 12mm 12mm 14mm 12mm;
}
.cover {
  min-height: 0;
  height: 235mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  border-bottom: 4px solid #408D7B;
  padding: 1rem 2rem;
  margin: 0 0 1rem;
  page-break-after: always;
}
.cover-logo { width: 280px; margin-bottom: 1.5rem; }
.cover-logo svg { width: 100%; height: auto; }
.cover-title { font-size: 26pt; font-weight: 800; color: #2E6B5E; margin: 0 0 0.4rem; }
.cover-subtitle { font-size: 13pt; color: #52B09A; margin-bottom: 1rem; max-width: 90%; line-height: 1.5; font-weight: 600; }
.cover-meta { font-size: 10pt; color: #5A6B66; margin-bottom: 2rem; }
.cover-org { font-size: 9pt; color: #6B7B76; margin-top: 2rem; line-height: 1.6; }
.cover .classification {
  display: inline-block;
  border: 2px solid #408D7B;
  padding: 0.25rem 1rem;
  border-radius: 4px;
  font-size: 9pt;
  font-weight: 700;
  color: #2E6B5E;
  margin-top: 2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  max-width: 80%;
}
.content h1 { page-break-before: always; }
.content h1:first-of-type { page-break-before: avoid; }
.content h2 { border-bottom: 1px solid #D9E5E1; padding-bottom: 4px; }
.content { font-size: 10.5pt; }
.compact { font-size: 9pt; }
.compact table { font-size: 6.5pt; }
.compact td, .compact th { padding: 1px 2px; }
.compact h1 { font-size: 14pt; margin-top: 0.8rem; }
.compact h2 { font-size: 11pt; margin-top: 0.5rem; }
.compact p { margin: 0.25rem 0; }
.compact ul, .compact ol { margin: 0.25rem 0; }
.compact li { margin: 0.1rem 0; }
.cover + .content h1:first-of-type { page-break-before: always; }
</style>
</head>
<body>
${coverHtml}
<main class="content${noCover ? ' compact' : ''}">
{{ content }}
</main>
</body>
</html>`;

async function build() {
  const markdown = fs.readFileSync(inputMd, 'utf8');
  const content = marked.parse(markdown);
  const fullHtml = htmlTemplate.replace('{{ content }}', content);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'load', timeout: 120000 });

  await page.pdf({
    path: OUT_PUBLIC,
    format: 'A4',
    margin: { top: '18mm', right: '16mm', bottom: '20mm', left: '16mm' },
    printBackground: true,
    preferCSSPageSize: true
  });

  fs.copyFileSync(OUT_PUBLIC, OUT_DOCS);
  await browser.close();
  console.log(`✓ Generated: ${OUT_PUBLIC}`);
}

build().catch((err) => {
  console.error('✗ Failed:', err);
  process.exit(1);
});