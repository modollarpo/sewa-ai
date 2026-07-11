import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory paths
const docsDir = path.join(__dirname, '..', 'docs');
const publicDocsDir = path.join(__dirname, '..', 'frontend', 'public', 'docs');

// Read template and styles
const htmlTemplate = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const cssStyles = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

async function convertMarkdownToPdf(mdFilePath) {
  const fileName = path.basename(mdFilePath, '.md');
  const pdfFileName = `${fileName}.pdf`;
  const outputPathPublic = path.join(publicDocsDir, pdfFileName);
  const outputPathDocs = path.join(docsDir, pdfFileName);

  try {
    // Read markdown file
    const markdown = fs.readFileSync(mdFilePath, 'utf8');
    
    // Convert to HTML
    const content = marked.parse(markdown);

    // Build full HTML
    const fullHtml = htmlTemplate
      .replace('{{ title }}', fileName.replace(/_/g, ' '))
      .replace('{{ css }}', cssStyles)
      .replace('{{ content }}', content);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    // Generate PDF
    await page.pdf({
      path: outputPathPublic,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '30mm', left: '20mm' },
      printBackground: true
    });

    await browser.close();
    
    // Copy to docs directory
    fs.copyFileSync(outputPathPublic, outputPathDocs);

    console.log(`✓ Done: ${pdfFileName}`);
  } catch (error) {
    console.error(`✗ Error converting ${mdFilePath}:`, error);
  }
}

async function main() {
  // Ensure output directories exist
  if (!fs.existsSync(publicDocsDir)) {
    fs.mkdirSync(publicDocsDir, { recursive: true });
  }
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Get all markdown files in root docs directory
  const files = fs.readdirSync(docsDir);
  const mdFiles = files.filter(file => 
    path.extname(file).toLowerCase() === '.md'
  );

  console.log(`Found ${mdFiles.length} markdown file(s) to convert.`);

  for (const mdFile of mdFiles) {
    await convertMarkdownToPdf(path.join(docsDir, mdFile));
  }

  console.log('\nAll conversions complete!');
}

main();
