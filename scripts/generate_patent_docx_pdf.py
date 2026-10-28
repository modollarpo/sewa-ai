"""
Generate Word .docx and PDF from docs/patent/UK_Patent_Application_2_Specification_and_Claims.md
Embeds Figures 1 through 8 in both Word and PDF.
Handles file lock gracefully by outputting to _With_Drawings files.
"""

import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as RLImage
from reportlab.lib import colors

MD_PATH = 'docs/patent/UK_Patent_Application_2_Specification_and_Claims.md'
DOCX_PATH = 'docs/patent/UK_Patent_Application_2_With_Drawings.docx'
PDF_PATH = 'docs/patent/UK_Patent_Application_2_With_Drawings.pdf'
FIG_DIR = 'docs/patent/figures'

FIGURES = [
    ('fig1_architecture.png', 'FIG. 1: HIGH-LEVEL SYSTEM ARCHITECTURE & 7-LAYER SAFETY PIPELINE'),
    ('fig2_conformal_calibration.png', 'FIG. 2: SPLIT CONFORMAL RISK CONTROL CALIBRATION & INFERENCE'),
    ('fig3_adabn_mechanism.png', 'FIG. 3: ZERO-LABEL ADAPTIVE BATCH NORMALISATION (AdaBN)'),
    ('fig4_masked_hirescam.png', 'FIG. 4: ANATOMICALLY MASKED HiResCAM ATTRIBUTION'),
    ('fig5_uncertainty_monotonicity.png', 'FIG. 5: EPISTEMIC UNCERTAINTY VARIANCE MONOTONICITY'),
    ('fig6_stroke_code_dispatch.png', 'FIG. 6: STROKE CODE AUTOMATED MULTI-CHANNEL DISPATCH'),
    ('fig7_sovereign_deployment.png', 'FIG. 7: SOVEREIGN DUAL-PATH DEPLOYMENT ARCHITECTURE'),
    ('fig8_multimodal_expansion.png', 'FIG. 8: MULTI-MODAL EMERGENCY RADIOLOGY TRIAGE PIPELINE')
]

def parse_markdown(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    return text

def build_docx(md_text, out_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(1)
        s.bottom_margin = Inches(1)
        s.left_margin = Inches(1)
        s.right_margin = Inches(1)

    lines = md_text.split('\n')
    in_claims = False

    for line in lines:
        line_s = line.strip()
        if not line_s:
            continue
        if line_s.startswith('# '):
            p = doc.add_paragraph()
            r = p.add_run(line_s[2:].strip())
            r.bold = True
            r.font.size = Pt(14)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif line_s.startswith('## '):
            heading_text = line_s[3:].strip()
            if 'CLAIMS' in heading_text.upper():
                in_claims = True
            doc.add_heading(heading_text, level=1)
        elif line_s.startswith('### '):
            doc.add_heading(line_s[4:].strip(), level=2)
        elif line_s.startswith('---'):
            continue
        elif in_claims and re.match(r'^\d+\.', line_s):
            p = doc.add_paragraph(line_s)
            p.paragraph_format.left_indent = Inches(0.25)
            p.paragraph_format.space_after = Pt(4)
        elif line_s.startswith('- '):
            p = doc.add_paragraph(line_s[2:], style='List Bullet')
        else:
            p = doc.add_paragraph(line_s)
            p.paragraph_format.space_after = Pt(3)

    # Append Drawings Section to DOCX
    doc.add_page_break()
    doc.add_heading("9. FORMAL PATENT DRAWINGS (FIGURES 1 TO 8)", level=1)
    for fname, caption in FIGURES:
        img_path = os.path.join(FIG_DIR, fname)
        if os.path.exists(img_path):
            p_cap = doc.add_paragraph()
            r_cap = p_cap.add_run(caption)
            r_cap.bold = True
            r_cap.font.size = Pt(10)
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            doc.add_picture(img_path, width=Inches(6.0))
            p_space = doc.add_paragraph()
            p_space.paragraph_format.space_after = Pt(12)

    doc.save(out_path)
    print(f"Generated DOCX with embedded figures: {out_path}")

def build_pdf(md_text, out_path):
    doc = SimpleDocTemplate(out_path, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, leading=15, alignment=1, textColor=colors.HexColor('#050f0c'))
    h1_style = ParagraphStyle('H1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=13, spaceBefore=8, spaceAfter=3, textColor=colors.HexColor('#050f0c'))
    h2_style = ParagraphStyle('H2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, leading=12, spaceBefore=6, spaceAfter=2, textColor=colors.HexColor('#374151'))
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, spaceBefore=2, spaceAfter=3, textColor=colors.HexColor('#1f2937'))
    claim_style = ParagraphStyle('Claim', parent=styles['Normal'], fontName='Helvetica', fontSize=7.8, leading=10.5, leftIndent=12, spaceBefore=2, spaceAfter=3, textColor=colors.HexColor('#111827'))
    fig_head_style = ParagraphStyle('FigHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=12, alignment=1, textColor=colors.HexColor('#050f0c'))

    story = []
    lines = md_text.split('\n')
    in_claims = False

    for line in lines:
        line_s = line.strip()
        if not line_s:
            continue
        if line_s.startswith('# '):
            story.append(Paragraph(line_s[2:].strip(), title_style))
            story.append(Spacer(1, 4))
        elif line_s.startswith('## '):
            heading_text = line_s[3:].strip()
            if 'CLAIMS' in heading_text.upper():
                in_claims = True
                story.append(PageBreak())
            story.append(Paragraph(heading_text, h1_style))
        elif line_s.startswith('### '):
            story.append(Paragraph(line_s[4:].strip(), h2_style))
        elif line_s.startswith('---'):
            story.append(Spacer(1, 4))
        elif in_claims and re.match(r'^\d+\.', line_s):
            clean = line_s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(clean, claim_style))
        else:
            clean = line_s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(clean, body_style))

    # Append Drawings to PDF
    story.append(PageBreak())
    story.append(Paragraph("9. FORMAL PATENT DRAWINGS (FIGURES 1 TO 8)", h1_style))
    story.append(Spacer(1, 8))

    for idx, (fname, caption) in enumerate(FIGURES):
        img_path = os.path.join(FIG_DIR, fname)
        if os.path.exists(img_path):
            story.append(Paragraph(f"<b>PATENT DRAWINGS SHEET {idx+1}/{len(FIGURES)}</b> — {caption}", fig_head_style))
            story.append(Spacer(1, 6))
            story.append(RLImage(img_path, width=500, height=640))
            if idx < len(FIGURES) - 1:
                story.append(PageBreak())

    doc.build(story)
    print(f"Generated PDF with embedded figures: {out_path}")

if __name__ == '__main__':
    md = parse_markdown(MD_PATH)
    build_docx(md, DOCX_PATH)
    build_pdf(md, PDF_PATH)
    print("Patent generation complete.")
