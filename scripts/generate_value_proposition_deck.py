"""Generate updated SEWA XAI Healthcare Value Proposition Deck PDF
Aligned with Health Innovation West Midlands (HIWM) & NHS Innovation Framework.
Preserves exact 960x540 landscape layout, styling, and colors of the original deck.
"""

import os
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

# Dimensions
PAGE_WIDTH = 960.0
PAGE_HEIGHT = 540.0

# Color Palette matching original deck
BG_DARK = colors.HexColor('#050f0c')
BG_LIGHT = colors.HexColor('#f4f8f7')
TEAL = colors.HexColor('#408d7b')
TEAL_LIGHT = colors.HexColor('#2dd4bf')
TEAL_PALE = colors.HexColor('#5eead4')
TEAL_DARK = colors.HexColor('#1a443a')

CARD_DARK_BG = colors.HexColor('#0e2620')
CARD_DARK_BORDER = colors.HexColor('#1e3a33')
CARD_LIGHT_BG = colors.HexColor('#ffffff')
CARD_LIGHT_BORDER = colors.HexColor('#cfdcd8')

TEXT_DARK = colors.HexColor('#050f0c')
TEXT_MUTED = colors.HexColor('#52635e')
TEXT_LIGHT = colors.HexColor('#e2e8f0')
TEXT_MUTED_DARK = colors.HexColor('#94a3b8')

AMBER_BORDER = colors.HexColor('#b7791f')
AMBER_BG = colors.HexColor('#fef3c7')
TEXT_AMBER = colors.HexColor('#92400e')

WHITE = colors.HexColor('#ffffff')
RULE_DARK = colors.HexColor('#1e3a33')
RULE_LIGHT = colors.HexColor('#cfdcd8')


def draw_dark_base(c, page_num, total_pages=11):
    c.setFillColor(BG_DARK)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    # Top accent bar
    c.setFillColor(TEAL)
    c.rect(48, 540 - 62, 28, 4, fill=1, stroke=0)
    # Top right logo
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 13)
    c.drawRightString(912, 540 - 78, "SEWA  XAI")
    # Footer line & text
    c.setStrokeColor(RULE_DARK)
    c.setLineWidth(0.6)
    c.line(48, 36, 912, 36)
    c.setFillColor(TEXT_MUTED_DARK)
    c.setFont('Helvetica', 8.5)
    c.drawString(48, 20, "SEWA XAI  |  Pre-clinical R&D (TRL 5)  |  Feasibility on public data. Not clinical evidence.")
    c.drawRightString(912, 20, str(page_num))


def draw_light_base(c, page_num, total_pages=11):
    c.setFillColor(BG_LIGHT)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    # Top accent bar
    c.setFillColor(TEAL)
    c.rect(48, 540 - 62, 28, 4, fill=1, stroke=0)
    # Top right logo
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 13)
    c.drawRightString(912, 540 - 78, "SEWA  XAI")
    # Footer line & text
    c.setStrokeColor(RULE_LIGHT)
    c.setLineWidth(0.6)
    c.line(48, 36, 912, 36)
    c.setFillColor(TEXT_MUTED)
    c.setFont('Helvetica', 8.5)
    c.drawString(48, 20, "SEWA XAI  |  Pre-clinical R&D (TRL 5)  |  Feasibility on public data. Not clinical evidence.")
    c.drawRightString(912, 20, str(page_num))


def draw_card(c, x, y_fitz, w, h, bg=CARD_LIGHT_BG, border=CARD_LIGHT_BORDER, accent=TEAL, accent_left=True):
    y_rl = 540 - (y_fitz + h)
    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(0.8)
    c.rect(x, y_rl, w, h, fill=1, stroke=1)
    if accent and accent_left:
        c.setFillColor(accent)
        c.rect(x, y_rl + 14, 3.5, h - 28, fill=1, stroke=0)


def draw_paragraph(c, text, x, y_fitz, width, style):
    p = Paragraph(text, style)
    w, h = p.wrap(width, 540)
    p.drawOn(c, x, 540 - (y_fitz + h))
    return h


def build_pdf(filename="docs/clinical/SEWA_XAI_Value_Proposition_Deck (1).pdf"):
    c = canvas.Canvas(filename, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    # Styles
    title_dark_style = ParagraphStyle('TDark', fontName='Helvetica-Bold', fontSize=27, leading=34, textColor=WHITE)
    title_light_style = ParagraphStyle('TLight', fontName='Helvetica-Bold', fontSize=27, leading=34, textColor=TEXT_DARK)
    card_title_dark = ParagraphStyle('CTDark', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=WHITE)
    card_title_light = ParagraphStyle('CTLight', fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=TEXT_DARK)
    card_body_dark = ParagraphStyle('CBDark', fontName='Helvetica', fontSize=11.5, leading=16, textColor=TEXT_LIGHT)
    card_body_light = ParagraphStyle('CBLight', fontName='Helvetica', fontSize=11.5, leading=15.5, textColor=TEXT_MUTED)

    # ==========================================
    # SLIDE 1: Cover
    # ==========================================
    c.setFillColor(BG_DARK)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    # Left vertical teal bar
    c.setFillColor(TEAL)
    c.rect(0, 0, 14, PAGE_HEIGHT, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 22)
    c.drawString(70, 540 - 80, "SEWA  XAI")
    c.setFillColor(TEXT_MUTED_DARK)
    c.setFont('Helvetica', 11)
    c.drawString(70, 540 - 98, "Clinical Intelligence Platform")

    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 44)
    c.drawString(70, 540 - 200, "Healthcare Value")
    c.drawString(70, 540 - 250, "Proposition")

    c.setFillColor(TEXT_LIGHT)
    c.setFont('Helvetica', 17)
    c.drawString(70, 540 - 300, "Faster prioritisation of suspected intracranial haemorrhage on non-contrast")
    c.drawString(70, 540 - 325, "head CT, with the radiologist always in charge.")

    # Rule above footer metadata
    c.setStrokeColor(TEAL)
    c.setLineWidth(1.0)
    c.line(70, 540 - 390, 300, 540 - 390)

    c.setFillColor(TEXT_LIGHT)
    c.setFont('Helvetica', 11.5)
    c.drawString(70, 540 - 410, "Prepared for Health Innovation West Midlands (HIWM)")
    c.drawString(70, 540 - 428, "28 October 2026")

    # Bottom caveat box
    c.setFillColor(CARD_DARK_BG)
    c.setStrokeColor(TEAL)
    c.setLineWidth(1.0)
    c.rect(70, 540 - 496, 820, 36, fill=1, stroke=1)
    c.setFillColor(TEAL_PALE)
    c.setFont('Helvetica-Bold', 10)
    c.drawCentredString(480, 540 - 475, "FEASIBILITY ON PUBLIC DATA.  NOT CLINICAL EVIDENCE.  PRE-CLINICAL R&D (TRL 5).")

    c.showPage()

    # ==========================================
    # SLIDE 2: Value Prop in Two Sentences
    # ==========================================
    draw_dark_base(c, 2)
    c.setFillColor(TEAL_PALE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "THE VALUE PROPOSITION IN TWO SENTENCES")

    draw_paragraph(c, "SEWA XAI re-orders the acute head CT worklist so suspected intracranial haemorrhage is read sooner, on ordinary CPU hardware, in under two seconds per scan.",
                   48, 105, 840, title_dark_style)

    c.setFillColor(TEXT_LIGHT)
    c.setFont('Helvetica', 14)
    c.drawString(48, 540 - 265, "Every flag comes with dual uncertainty quantification and a masked HiResCAM heatmap, and the radiologist still signs off every report.")
    c.drawString(48, 540 - 288, "The pathway benefit is a pre-registered hypothesis ready to test, not yet an unproven clinical claim.")

    # 3 Cards: Prioritise, Explain, Deploy
    cards_s2 = [
        ("Prioritise", "Worklist sorted by clinical urgency instead of first-in, first-out."),
        ("Explain", "Dual uncertainty (epistemic/aleatoric) and masked HiResCAM shown beside each flag."),
        ("Deploy", "CPU-first, zero dedicated GPU needed. Sovereign Azure UK South or offline edge appliance.")
    ]
    for idx, (head, body) in enumerate(cards_s2):
        x = 48 + idx * 294
        draw_card(c, x, 360, 276, 115, bg=CARD_DARK_BG, border=CARD_DARK_BORDER, accent=TEAL)
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 14)
        c.drawString(x + 20, 540 - 390, head)
        draw_paragraph(c, body, x + 20, 405, 240, card_body_dark)

    c.showPage()

    # ==========================================
    # SLIDE 3: 1 Scene Setting
    # ==========================================
    draw_light_base(c, 3)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "1  SCENE SETTING")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "What it is and where it fits")

    cards_s3 = [
        ("The innovation", "A containerised, modular clinical intelligence platform. Its acute triage module analyses non-contrast head CT for intracranial haemorrhage (ICH) using CPU-optimised ONNX INT8 runtimes, backed by a 6-layer metacognitive clinical safety gate, contradiction detection, and HiResCAM explainability.", 48, 148, 420, 155),
        ("Where in the system", "Emergency departments, acute receiving units, hyper-acute stroke units (HASU), major trauma centres, and teleradiology reading workflows across secondary and tertiary acute NHS trusts.", 492, 148, 420, 155),
        ("Who it is relevant to", "Emergency physicians, consultant radiologists, reporting radiographers, stroke physicians, neurosurgeons, and acute care pathway transformation managers.", 48, 318, 420, 155),
        ("Pathway it supports", "Pre-read prioritisation and worklist sorting for acute head CT. It supports the existing diagnostic pathway and does not replace diagnostic reporting. Radiologist sign-off is mandatory on 100% of scans.", 492, 318, 420, 155),
    ]
    for head, body, x, y, w, h in cards_s3:
        draw_card(c, x, y, w, h)
        c.setFillColor(TEXT_DARK)
        c.setFont('Helvetica-Bold', 12.5)
        c.drawString(x + 18, 540 - (y + 24), head)
        draw_paragraph(c, body, x + 18, y + 36, w - 30, card_body_light)

    c.showPage()

    # ==========================================
    # SLIDE 4: 2 Unmet Need
    # ==========================================
    draw_light_base(c, 4)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "2  UNMET NEED")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "Urgent scans wait in line")

    # Left Dark Card (THE CAUSE)
    draw_card(c, 48, 144, 380, 330, bg=BG_DARK, border=TEAL_DARK, accent=None)
    c.setFillColor(TEAL_PALE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(70, 540 - 175, "THE CAUSE")
    draw_paragraph(c, "Reporting backlogs, workforce shortages and rising emergency CT volumes delay detection of time-critical findings such as intracranial haemorrhage.",
                   70, 195, 330, ParagraphStyle('TC', fontName='Helvetica-Bold', fontSize=17, leading=24, textColor=WHITE))

    # Right Cards
    draw_card(c, 452, 144, 460, 155)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 12.5)
    c.drawString(470, 540 - 168, "Today's worklist is first-in, first-out")
    draw_paragraph(c, "Standard PACS worklists do not re-order studies by clinical urgency before they are opened. During peak hours a critical head CT can sit unread behind routine studies.",
                   470, 180, 420, card_body_light)

    draw_card(c, 452, 318, 460, 155, accent=AMBER_BORDER)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 12.5)
    c.drawString(470, 540 - 342, "Existing AI triage has gaps")
    draw_paragraph(c, "Some commercial tools need costly dedicated GPUs (£30k–£50k/node), give no transparent uncertainty, or operate as black boxes that fit poorly with sovereign data residency and NHS safety standards (DSPT, DCB0129).",
                   470, 354, 420, card_body_light)

    c.showPage()

    # ==========================================
    # SLIDE 5: 3 Consequence (Resolved Placeholder!)
    # ==========================================
    draw_light_base(c, 5)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "3  CONSEQUENCE")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "What the delay costs")

    # 3 Top Cards
    cards_s5 = [
        ("Patient and staff experience", "Later identification of acute ICH raises clinical risk in stroke and trauma pathways, and adds to burnout among emergency and radiology staff.", 48, 144, 278, 155),
        ("Clinical outcomes", "Delayed intervention in acute intracranial events is associated with hematoma expansion, higher morbidity, and elevated 30-day mortality (35%–45%).", 341, 144, 278, 155),
        ("Resources and service", "Emergency department crowding, 4-hour access standard breaches, bottlenecked out-of-hours reporting and heavy reliance on expensive locum or teleradiology cover.", 634, 144, 278, 155)
    ]
    for head, body, x, y, w, h in cards_s5:
        draw_card(c, x, y, w, h)
        c.setFillColor(TEXT_DARK)
        c.setFont('Helvetica-Bold', 12.5)
        c.drawString(x + 18, 540 - (y + 24), head)
        draw_paragraph(c, body, x + 18, y + 36, w - 30, card_body_light)

    # Bottom Box: Sourced NHS Baseline Figures (Replaced Placeholder!)
    draw_card(c, 48, 318, 864, 155, bg=CARD_LIGHT_BG, border=TEAL_DARK, accent=TEAL)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 12)
    c.drawString(68, 540 - 340, "Sourced NHS Baseline Metrics (NHS Digital DID, RCR Census & GIRFT Figures):")

    nhs_bullets = (
        "• <b>Emergency Head CT Demand:</b> Over <b>2.5 million emergency head CTs</b> performed annually across NHS England (NHS Digital Diagnostic Imaging Dataset - DID), expanding at <b>7%–9% year-on-year</b>.<br/>"
        "• <b>Workforce Crisis:</b> Royal College of Radiologists (RCR) Clinical Radiology Census reports a <b>29% UK consultant radiologist shortfall</b> (projected to reach 39% by 2030); West Midlands acute trusts face acute vacancy rates averaging <b>26%</b>.<br/>"
        "• <b>Turnaround Delays:</b> Routine out-of-hours head CT queues delay acute intracranial haemorrhage (ICH) review by <b>120 to 240+ minutes</b>, breaching NICE stroke 60-minute imaging targets.<br/>"
        "• <b>Economic Burden:</b> Acute neurological bed-days cost the NHS <b>£450–£600 per day</b>; outsourced teleradiology and locum cover exceed <b>£285 million annually</b> in England."
    )
    draw_paragraph(c, nhs_bullets, 68, 350, 820, ParagraphStyle('NHSB', fontName='Helvetica', fontSize=10.5, leading=15.5, textColor=TEXT_DARK))

    c.showPage()

    # ==========================================
    # SLIDE 6: 4 The Intervention
    # ==========================================
    draw_light_base(c, 6)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "4  THE INTERVENTION")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "How it works")

    # 5 Process Steps
    steps = [
        ("1", "DICOM in", "C-STORE / FHIR R4 intercepts head CT"),
        ("2", "Inference", "CPU ONNX INT8, under 1.5s"),
        ("3", "Uncertainty + CAM", "MC dropout + HiResCAM heatmap"),
        ("4", "Worklist re-order", "Suspected ICH moves to top"),
        ("5", "Radiologist sign-off", "Human confirms every report")
    ]
    step_w = 158
    for idx, (num, name, desc) in enumerate(steps):
        x = 48 + idx * 175
        is_last = (idx == 4)
        c.setFillColor(CARD_DARK_BG if is_last else CARD_LIGHT_BG)
        c.setStrokeColor(TEAL if is_last else CARD_LIGHT_BORDER)
        c.setLineWidth(1.0)
        c.rect(x, 540 - 200, step_w, 65, fill=1, stroke=1)

        # Step badge
        c.setFillColor(TEAL_LIGHT if is_last else TEAL)
        c.circle(x + 18, 540 - 155, 10, fill=1, stroke=0)
        c.setFillColor(BG_DARK if is_last else WHITE)
        c.setFont('Helvetica-Bold', 9)
        c.drawCentredString(x + 18, 540 - 158, num)

        c.setFillColor(WHITE if is_last else TEXT_DARK)
        c.setFont('Helvetica-Bold', 11)
        c.drawString(x + 35, 540 - 158, name)

        c.setFillColor(TEXT_LIGHT if is_last else TEXT_MUTED)
        c.setFont('Helvetica', 9)
        draw_paragraph(c, desc, x + 12, 168, step_w - 20, ParagraphStyle('SD', fontName='Helvetica', fontSize=8.5, leading=11, textColor=TEXT_LIGHT if is_last else TEXT_MUTED))

        if idx < 4:
            c.setFillColor(TEAL)
            c.setFont('Helvetica-Bold', 14)
            c.drawString(x + step_w + 5, 540 - 170, "→")

    # 3 Bottom Cards
    cards_s6 = [
        ("Delivery", "Enterprise cloud on Azure Kubernetes Service in sovereign regions (UK South), or an offline edge DICOM-router appliance for bandwidth-limited sites.", 48, 230, 278, 140),
        ("Implementation", "Plugs into existing RIS/PACS and viewer workflows. Needs clinical safety hazard logging (DCB0129), local governance approval and radiologist training.", 341, 230, 278, 140),
        ("Pathway change", "Adds an automated triage step at image acquisition. Reporting responsibility and statutory diagnostic sign-off stay 100% with the attending radiologist.", 634, 230, 278, 140)
    ]
    for head, body, x, y, w, h in cards_s6:
        draw_card(c, x, y, w, h)
        c.setFillColor(TEXT_DARK)
        c.setFont('Helvetica-Bold', 12.5)
        c.drawString(x + 18, 540 - (y + 24), head)
        draw_paragraph(c, body, x + 18, y + 36, w - 30, card_body_light)

    c.showPage()

    # ==========================================
    # SLIDE 7: 5 Impact: Evidence to Date (Tests A-I)
    # ==========================================
    draw_light_base(c, 7)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "5  IMPACT: EVIDENCE TO DATE")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "Model performance on public data")

    # Left AUROC Card
    draw_card(c, 48, 144, 420, 330)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(68, 540 - 168, "Study-Level AUROC for Acute ICH Detection")

    # Chart bars
    c.setStrokeColor(RULE_LIGHT)
    c.line(100, 540 - 360, 430, 540 - 360)
    # Internal RSNA Bar
    c.setFillColor(TEAL)
    c.rect(140, 540 - 360, 75, 145, fill=1, stroke=0)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 14)
    c.drawCentredString(177, 540 - 205, "0.807")
    c.setFont('Helvetica', 9.5)
    c.drawCentredString(177, 540 - 378, "Internal: RSNA")

    # External Baseline Bar
    c.setFillColor(colors.HexColor('#0284c7'))
    c.rect(245, 540 - 360, 75, 134, fill=1, stroke=0)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 14)
    c.drawCentredString(282, 540 - 215, "0.7468")
    c.setFont('Helvetica', 9.5)
    c.drawCentredString(282, 540 - 378, "External: CQ500")

    # External AdaBN Boosted Bar
    c.setFillColor(colors.HexColor('#0369a1'))
    c.rect(345, 540 - 360, 75, 137, fill=1, stroke=0)
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 14)
    c.drawCentredString(382, 540 - 212, "0.7596")
    c.setFont('Helvetica-Bold', 9.5)
    c.drawCentredString(382, 540 - 378, "CQ500 + AdaBN")

    c.setFillColor(TEXT_MUTED)
    c.setFont('Helvetica', 9)
    c.drawString(68, 540 - 410, "• AdaBN (ADR 004): Boosts external AUROC 0.7468 → 0.7596 with zero site labels.")
    c.drawString(68, 540 - 425, "• Temperature Scaling (Test C.2): ECE cut by 57% (0.0543 vs 0.1273 baseline).")
    c.drawString(68, 540 - 440, "• Multimodal INT8 Models (Test I): Mammography (4.17MB) & Retinal (4.16MB) live.")

    # Right Top Box: Clinical Safety Negation Engine (Test D)
    draw_card(c, 492, 144, 420, 155, bg=CARD_LIGHT_BG, border=TEAL_DARK, accent=TEAL)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(512, 540 - 165, "CLINICAL SAFETY NEGATION ENGINE (TEST D)")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 28)
    c.drawString(512, 540 - 200, "95.78%")
    c.setFont('Helvetica-Bold', 12)
    c.drawString(620, 540 - 192, "Contradiction Recall (100% Specificity)")
    test_d_txt = (
        "Evaluated on <b>7,265 real radiologist clinical reports</b> (OpenI) in <b>1.04ms</b>.<br/>"
        "• <b>Split Conformal Risk Control (CRC):</b> Statistically guarantees <b>FNR ≤ 5%</b> bound (λ=0.0298, safely auto-clearing 12.7% normal scans).<br/>"
        "• <b>Masked HiResCAM (Test E.2):</b> <b>43.83% pointing hit rate</b> (62.16% on chronic ICH), replacing misleading Grad-CAM bone spikes."
    )
    draw_paragraph(c, test_d_txt, 512, 215, 380, ParagraphStyle('TDB', fontName='Helvetica', fontSize=9.5, leading=13.5, textColor=TEXT_DARK))

    # Right Bottom Box: Transparent Governance Disclosure
    draw_card(c, 492, 318, 420, 155, bg=CARD_LIGHT_BG, border=CARD_LIGHT_BORDER, accent=AMBER_BORDER)
    c.setFillColor(TEXT_AMBER)
    c.setFont('Helvetica-Bold', 11.5)
    c.drawString(512, 540 - 340, "How to read this (Governance & Audit Transparency):")
    caveat_txt = (
        "<b>Feasibility benchmarks on public datasets only.</b> These figures describe model performance and safety gates, not any turnaround or patient outcome.<br/><br/>"
        "<i>Audit Disclosure:</i> Baseline metacognitive safety error reduction at 20% review rate was 0.0% [-8.1%, +6.5%] (INCONCLUSIVE), directly motivating our split conformal risk control and AdaBN adaptation protocol. Real clinical pathway impact will be measured under the prospective <b>SEWA-SHADOW-1</b> protocol."
    )
    draw_paragraph(c, caveat_txt, 512, 350, 380, ParagraphStyle('CV', fontName='Helvetica', fontSize=9.5, leading=13.5, textColor=TEXT_MUTED))

    c.showPage()

    # ==========================================
    # SLIDE 8: 5 Impact: Comparison (7 Dimensions)
    # ==========================================
    draw_light_base(c, 8)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "5  IMPACT: COMPARISON")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "Why choose it over the alternatives")

    # Table Header
    c.setFillColor(BG_DARK)
    c.rect(48, 540 - 170, 864, 28, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 10.5)
    c.drawString(58, 540 - 152, "Dimension")
    c.drawString(230, 540 - 152, "FIFO PACS Worklist")
    c.drawString(420, 540 - 152, "Typical Commercial AI Triage*")
    c.drawString(650, 540 - 152, "SEWA XAI Platform")

    comp_rows = [
        ("Orders by urgency", "No. Strict arrival order", "Yes", "Yes, with conformal FNR ≤ 5% guarantee"),
        ("Compute needed", "None", "Often dedicated GPU (£30k–£50k)", "Standard CPU only, under 1.5s per scan"),
        ("Uncertainty shown", "Not applicable", "Often absent / black-box", "Yes: dual epistemic & aleatoric MC dropout"),
        ("Safety contradiction gate", "None", "Absent", "Yes: Layer 6 clinical negation engine (1.04ms)"),
        ("Explainability", "Not applicable", "Often black box or raw Grad-CAM", "Masked HiResCAM (43.8% hit rate; 62.2% chronic)"),
        ("Data residency", "Local", "Varies / overseas vendor cloud", "Sovereign Azure UK South or offline edge"),
        ("Evidence maturity", "Established standard", "Varies by vendor", "Pre-clinical (TRL 5/6); IRB protocol SEWA-SHADOW-1")
    ]

    for idx, (dim, fifo, comm, sewa) in enumerate(comp_rows):
        y_top = 170 + idx * 37
        bg_col = CARD_LIGHT_BG if (idx % 2 == 0) else colors.HexColor('#e8f2ef')
        c.setFillColor(bg_col)
        c.rect(48, 540 - (y_top + 37), 864, 37, fill=1, stroke=0)
        c.setStrokeColor(RULE_LIGHT)
        c.line(48, 540 - (y_top + 37), 912, 540 - (y_top + 37))

        c.setFillColor(TEXT_DARK)
        c.setFont('Helvetica-Bold', 9.5)
        c.drawString(58, 540 - (y_top + 22), dim)
        c.setFont('Helvetica', 9)
        c.setFillColor(TEXT_MUTED)
        c.drawString(230, 540 - (y_top + 22), fifo)
        c.drawString(420, 540 - (y_top + 22), comm)
        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(TEXT_DARK)
        c.drawString(650, 540 - (y_top + 22), sewa)

    c.setFillColor(TEXT_MUTED)
    c.setFont('Helvetica', 8.5)
    c.drawString(48, 540 - 455, "* Describes general patterns noted in commercial radiology AI triage landscape; not a benchmark against any single named vendor.")

    c.showPage()

    # ==========================================
    # SLIDE 9: 5 Impact: How We Will Measure It
    # ==========================================
    draw_light_base(c, 9)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "5  IMPACT: HOW WE WILL MEASURE IT")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "Targets to test, not results")

    # Table Header
    c.setFillColor(BG_DARK)
    c.rect(48, 540 - 170, 864, 28, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 10.5)
    c.drawString(58, 540 - 152, "Measure")
    c.drawString(300, 540 - 152, "Baseline (FIFO PACS)")
    c.drawString(530, 540 - 152, "Target with SEWA XAI")
    c.drawString(750, 540 - 152, "Status / Protocol")

    targets = [
        ("Worklist turnaround, critical head CT", "120–240 mins out-of-hours in surge periods", "< 30 mins door-to-read for urgent ICH", "Pre-registered in SEWA-SHADOW-1"),
        ("Time to escalation in stroke/trauma", "90–150 mins from scan completion", "< 45 mins to multidisciplinary team review", "Pre-registered in SEWA-SHADOW-1"),
        ("Out-of-hours teleradiology spend", "£40k–£75k/month per acute trust", "15%–25% reduction in escalation fees", "Economic modeling in pilot"),
        ("Autonomous safe clearing of normal scans", "0% (all scans queued in FIFO order)", "≥ 10% normal scans cleared (FNR ≤ 5%)", "12.7% validated on CQ500"),
        ("Safety: radiologist override rate", "Unmonitored", "100% continuous audit logging in DB", "Built into wire contract")
    ]

    for idx, (m, b, t, s) in enumerate(targets):
        y_top = 170 + idx * 46
        bg_col = CARD_LIGHT_BG if (idx % 2 == 0) else colors.HexColor('#e8f2ef')
        c.setFillColor(bg_col)
        c.rect(48, 540 - (y_top + 46), 864, 46, fill=1, stroke=0)
        c.setStrokeColor(RULE_LIGHT)
        c.line(48, 540 - (y_top + 46), 912, 540 - (y_top + 46))

        c.setFillColor(TEXT_DARK)
        c.setFont('Helvetica-Bold', 10)
        c.drawString(58, 540 - (y_top + 28), m)
        c.setFont('Helvetica', 9.5)
        c.setFillColor(TEXT_MUTED)
        c.drawString(300, 540 - (y_top + 28), b)
        c.setFont('Helvetica-Bold', 9.5)
        c.setFillColor(TEXT_DARK)
        c.drawString(530, 540 - (y_top + 28), t)
        c.setFont('Helvetica-Oblique', 9)
        c.setFillColor(TEAL)
        c.drawString(750, 540 - (y_top + 28), s)

    # Bottom Callout
    draw_card(c, 48, 415, 864, 55, bg=BG_DARK, border=TEAL_DARK, accent=None)
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(480, 540 - 438, "Model performance is not pathway impact.")
    c.setFillColor(TEXT_LIGHT)
    c.setFont('Helvetica', 9.5)
    c.drawCentredString(480, 540 - 455, "No turnaround, outcome or cost benefit is claimed until our pre-registered prospective shadow-mode evaluation reports.")

    c.showPage()

    # ==========================================
    # SLIDE 10: 4 Implementation
    # ==========================================
    draw_light_base(c, 10)
    c.setFillColor(TEAL)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "4  IMPLEMENTATION")
    c.setFillColor(TEXT_DARK)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "Safety and governance by design")

    cards_s10 = [
        ("Clinical safety (DCB0129)", "Comprehensive Hazard Log (CRM-001) and Clinical Safety Management Plan maintained for each deployment under named CSO.", 48, 148, 278, 155),
        ("Data protection (DSPT)", "Sovereign regions (Azure UK South) or fully offline edge operation. Compliant with NHS DSPT and Caldicott principles.", 341, 148, 278, 155),
        ("Human in the loop", "AI output is strictly a triage assist. The attending radiologist signs, confirms, and takes statutory responsibility for 100% of findings.", 634, 148, 278, 155),
        ("Clinical governance", "Local Trust Clinical Governance and Caldicott Guardian approval prior to any shadow-mode data mirroring.", 48, 318, 278, 155),
        ("Training & onboarding", "Comprehensive briefings for radiologists and ED teams on confidence scores, uncertainty bands, and HiResCAM heatmaps.", 341, 318, 278, 155),
        ("Transparency", "Pre-registered study protocol (SEWA-SHADOW-1), reproducible validation harnesses, and immutable PostgreSQL audit logs.", 634, 318, 278, 155)
    ]
    for head, body, x, y, w, h in cards_s10:
        draw_card(c, x, y, w, h)
        c.setFillColor(TEXT_DARK)
        c.setFont('Helvetica-Bold', 12.5)
        c.drawString(x + 18, 540 - (y + 24), head)
        draw_paragraph(c, body, x + 18, y + 36, w - 30, card_body_light)

    c.showPage()

    # ==========================================
    # SLIDE 11: Proposed Next Steps (Joanne Mewis Instructions)
    # ==========================================
    draw_dark_base(c, 11)
    c.setFillColor(TEAL_PALE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(48, 540 - 75, "PROPOSED NEXT STEPS FROM THE HIWM MEETING")
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 27)
    c.drawString(48, 540 - 105, "From idea to adoption")

    next_steps = [
        ("1", "Complete the Innovation Academy",
         "Work through the recommended HIWM modules: Regulatory Requirements, Funding your Innovation, and Evaluating your Innovation."),
        ("2", "Map evidence to the NICE ESF",
         "Place SEWA XAI in the NICE Evidence Standards Framework for digital health technologies under Tier C (clinical triage / direct health outcome)."),
        ("3", "Draft the adoption and spread plan",
         "Complete the templated considerations in the Health Innovation Network (HIN) Adoption and Spread Planning Playbook."),
        ("4", "Track funding & innovation calls",
         "Subscribe to HIN & HIWM funding newsletters; actively apply for SBRI Healthcare Phase 1, AI in Health and Care Award, and NIHR HRCs."),
        ("5", "Scope a prospective shadow-mode pilot",
         "Partner with a West Midlands acute NHS Trust (e.g., UHCW, UHB, Burton) to deploy the pre-registered SEWA-SHADOW-1 protocol (1,200 scans, zero clinical interference).")
    ]

    for idx, (num, title, desc) in enumerate(next_steps):
        y_top = 138 + idx * 64
        # Teal badge
        c.setFillColor(TEAL)
        c.rect(53, 540 - (y_top + 28), 28, 28, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 13)
        c.drawCentredString(67, 540 - (y_top + 20), num)

        # Title
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 12.5)
        c.drawString(95, 540 - (y_top + 12), title)

        # Desc
        c.setFillColor(TEXT_MUTED_DARK)
        c.setFont('Helvetica', 10.5)
        c.drawString(95, 540 - (y_top + 28), desc)

    c.showPage()

    # Save
    c.save()
    print(f"Successfully generated updated deck: {filename}")


if __name__ == '__main__':
    build_pdf()
