const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const React = require("react");
const { renderToFile } = require("@react-pdf/renderer");
const { PDFDocument } = require("./components/PDFDocument");
const { markdownToReact } = require("./utils/markdownToReact");

const DOCS_DIR = path.resolve(__dirname, "../../docs");
const OUTPUT_DIR = path.resolve(__dirname, "../../docs");
const FRONTEND_OUTPUT_DIR = path.resolve(__dirname, "../../frontend/public/docs");

// List of files to process
const files = [
  "disaster-recovery-plan.md",
  "implementation-toolkit.md",
  "nhs-dspt-compliance.md",
  "NIHR_Form_Review_and_Revision_Guide.md",
  "NIHR_HealthTech_RC_Form_COMPLETED.md",
  "SEWA_AI_Enterprise_v2.0_Vision.md",
  "SEWA_AI_Master_Dossier_v2.0_Integrated.md",
  "SEWA_AI_NHS_Trust_Pack_v2.0.md",
];

// Ensure output directories exist
[OUTPUT_DIR, FRONTEND_OUTPUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function convertFile(filename) {
  const inputPath = path.join(DOCS_DIR, filename);
  if (!fs.existsSync(inputPath)) {
    console.log(`Skipping ${filename}: File not found`);
    return;
  }

  console.log(`Processing ${filename}...`);
  const fileContent = fs.readFileSync(inputPath, "utf-8");
  const { data, content } = matter(fileContent);

  // Get title from frontmatter or filename
  const title =
    data.title ||
    filename.replace(".md", "").replace(/_/g, " ").replace(/SEWA AI /i, "");

  // Create PDF
  const pdfElement = React.createElement(
    PDFDocument,
    {
      title,
      subtitle: data.subtitle,
      confidential: data.confidential !== false,
    },
    markdownToReact(content)
  );

  // Save to both output directories
  const outputFilename = filename.replace(".md", ".pdf");
  const outputPath1 = path.join(OUTPUT_DIR, outputFilename);
  const outputPath2 = path.join(FRONTEND_OUTPUT_DIR, outputFilename);

  // Render PDF
  await renderToFile(pdfElement, outputPath1);
  fs.copyFileSync(outputPath1, outputPath2);

  console.log(`Generated ${outputFilename} successfully!`);
}

async function main() {
  console.log("Starting enterprise PDF generation...");
  for (const file of files) {
    try {
      await convertFile(file);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
  console.log("All PDFs generated successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
