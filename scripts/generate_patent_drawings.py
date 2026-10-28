"""
UKIPO Formal Patent Drawings Generator (Figures 1 through 8)
Generates publication-standard black-and-white patent drawings with reference numerals.
Adheres to UKIPO Patents Rules 2007 Schedule 2 (Formalities for Drawings).
Outputs:
- docs/patent/figures/fig1_architecture.png
- docs/patent/figures/fig2_conformal_calibration.png
- docs/patent/figures/fig3_adabn_mechanism.png
- docs/patent/figures/fig4_masked_hirescam.png
- docs/patent/figures/fig5_uncertainty_monotonicity.png
- docs/patent/figures/fig6_stroke_code_dispatch.png
- docs/patent/figures/fig7_sovereign_deployment.png
- docs/patent/figures/fig8_multimodal_expansion.png
- docs/patent/UK_Patent_Application_2_Formal_Drawings.pdf
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, PageBreak
from reportlab.lib import colors

FIG_DIR = 'docs/patent/figures'
os.makedirs(FIG_DIR, exist_ok=True)

# Patent styling helper
def setup_patent_fig(title_text=""):
    fig, ax = plt.subplots(figsize=(8.5, 11), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 130)
    ax.axis('off')
    # Sheet header
    ax.text(50, 126, "UK INTELLECTUAL PROPERTY OFFICE", ha='center', va='center', fontsize=9, fontfamily='sans-serif', fontweight='bold')
    ax.text(50, 123, "APPLICATION GB2609706.3 PRIORITY — SECOND UK NATIONAL APPLICATION", ha='center', va='center', fontsize=7.5, fontfamily='sans-serif')
    if title_text:
        ax.text(50, 6, title_text, ha='center', va='center', fontsize=11, fontfamily='sans-serif', fontweight='bold')
    return fig, ax

def add_box(ax, x, y, w, h, text, numeral="", box_style='round,pad=0.5', lw=1.2, fs=8):
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle=box_style, linewidth=lw, edgecolor='black', facecolor='white')
    ax.add_patch(box)
    lines = text.split('\n')
    line_y = y + h/2.0
    ax.text(x + w/2.0, line_y, text, ha='center', va='center', fontsize=fs, fontfamily='sans-serif', color='black')
    if numeral:
        ax.text(x + w + 1.2, y + h - 1.0, str(numeral), fontsize=9, fontweight='bold', fontfamily='sans-serif', color='black')

def add_arrow(ax, x1, y1, x2, y2, label=""):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->", color="black", lw=1.2, shrinkA=2, shrinkB=2))
    if label:
        ax.text((x1+x2)/2.0 + 1.5, (y1+y2)/2.0, label, fontsize=7, fontfamily='sans-serif', color='black')

# ==========================================
# FIG. 1: HIGH-LEVEL ARCHITECTURE
# ==========================================
def draw_fig1():
    fig, ax = setup_patent_fig("FIG. 1 — HIGH-LEVEL SYSTEM ARCHITECTURE & 7-LAYER SAFETY PIPELINE")
    
    # Ingestion
    add_box(ax, 32, 112, 36, 6, "CLINICAL IMAGING SOURCE\n(DICOM C-STORE / FHIR R4 / HL7)", "100")
    add_arrow(ax, 50, 112, 50, 105)

    add_box(ax, 32, 99, 36, 6, "3-CHANNEL HOUNSFIELD WINDOWING\n(Brain: +40/80, Subdural: +75/150, Bone: +35/35)", "102")
    add_arrow(ax, 50, 99, 50, 92)

    # Core deep extractor + AdaBN
    add_box(ax, 20, 83, 60, 9, "DEEP CNN FEATURE EXTRACTOR (EfficientNet-B0/B4)\nFrozen Convolutional Filters & Linear Classification Head", "104")
    
    # AdaBN loop
    add_box(ax, 66, 69, 28, 9, "ZERO-LABEL AdaBN\nTarget Hospital Running\nMoments (μ_t, σ_t²)", "106", lw=1.5)
    add_arrow(ax, 70, 83, 75, 78)
    add_arrow(ax, 80, 78, 70, 83, "Moment Align")

    add_arrow(ax, 40, 83, 40, 73)

    # Parallel Gating & Attribution
    add_box(ax, 8, 62, 26, 8, "RELATIVE MAHALANOBIS\nOOD GATING\n(RMD > τ_OOD Escalation)", "108")
    add_box(ax, 37, 62, 26, 8, "SPLIT CONFORMAL\nRISK CONTROL GATE\n(λ = 0.0298, FNR ≤ 5%)", "110", lw=1.5)
    add_box(ax, 66, 52, 28, 8, "EPISTEMIC UNCERTAINTY\nMC Dropout Decomp.\n(ρ ≥ 0.85 Monotonicity)", "112")

    add_arrow(ax, 40, 73, 21, 70)
    add_arrow(ax, 50, 73, 50, 70)
    add_arrow(ax, 60, 73, 80, 60)

    # Explainability
    add_box(ax, 20, 48, 42, 9, "MASKED HiResCAM EXPLAINABILITY\n(Element-wise Gradients ⊙ Parenchymal Mask [0–85 HU]\nSuppresses Calvarial Bone Activations)", "114")
    add_arrow(ax, 50, 62, 50, 57)

    # Metacognition
    add_box(ax, 20, 34, 60, 9, "9-LAYER METACOGNITION SAFETY ENGINE\n(Layers 1-9: Plausibility, Coherence, Negation Check,\nHallucination Risk H ≤ 0.30 Safe-to-Alert Decision)", "116")
    add_arrow(ax, 41, 48, 50, 43)

    # Sign-off constraint
    add_box(ax, 20, 20, 60, 9, "MANDATORY CLINICAL GOVERNANCE GATE\nDatabase-Level Foreign Key Constraint & Cryptographic\nConsultant Radiologist Digital Sign-Off", "118", lw=1.8)
    add_arrow(ax, 50, 34, 50, 29)

    # Output
    add_box(ax, 25, 9, 50, 6, "PACS WORKLIST & MULTI-CHANNEL DISPATCH\n(Push, WebSocket, HL7 ADT/ORM/ORU, Stroke Code)", "120")
    add_arrow(ax, 50, 20, 50, 15)

    path = os.path.join(FIG_DIR, 'fig1_architecture.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

# ==========================================
# FIG. 2: CONFORMAL RISK CALIBRATION
# ==========================================
def draw_fig2():
    fig, ax = setup_patent_fig("FIG. 2 — SPLIT CONFORMAL RISK CONTROL CALIBRATION & INFERENCE")
    
    add_box(ax, 25, 112, 50, 6, "HISTORICAL LABELED CLINICAL COHORT\n{(X_i, Y_i)} from Multi-Centre Studies", "200")
    add_arrow(ax, 50, 112, 50, 105)

    add_box(ax, 25, 98, 50, 7, "SPLIT CALIBRATION PARTITION (D_cal, n=100)\nIndependent from Model Training Cohort", "202")
    add_arrow(ax, 50, 98, 50, 91)

    add_box(ax, 15, 80, 70, 11, "EMPIRICAL FALSE NEGATIVE RISK EVALUATOR\nR_n(λ') = (1/n) * Σ I(Y_i = 1 ∧ S(X_i) < λ')\nEvaluated over Grid λ' ∈ [0, 1]", "204")
    add_arrow(ax, 50, 80, 50, 72)

    add_box(ax, 15, 60, 70, 12, "QUANTILE THRESHOLD SOLVER\nλ* = sup { λ' ∈ [0, 1] : (n/(n+1)) * R_n(λ') + 1/(n+1) ≤ α }\nCalibrated to Target Ceiling α = 0.05 (λ* = 0.0298)", "206", lw=1.5)
    add_arrow(ax, 50, 60, 50, 52)

    add_box(ax, 20, 42, 60, 10, "INCOMING UNSEEN CLINICAL SCAN S(X)\nPredictive Score S(X) ∈ [0, 1] from Triage Backbone", "208")
    add_arrow(ax, 50, 42, 50, 34)

    # Branching
    add_box(ax, 10, 22, 35, 12, "SAFE AUTO-CLEARING QUEUE\n(S(X) < λ*)\n12.7% Studies Safely Deprioritised\nGuaranteed FNR ≤ 5%", "210")
    add_box(ax, 55, 22, 35, 12, "MANDATORY ESCALATION QUEUE\n(S(X) ≥ λ*)\nEmergency Worklist Prioritisation\nStroke Code & Alert Dispatch", "212", lw=1.5)

    add_arrow(ax, 40, 34, 27, 34, "No")
    add_arrow(ax, 60, 34, 72, 34, "Yes")

    path = os.path.join(FIG_DIR, 'fig2_conformal_calibration.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

# ==========================================
# FIG. 3: ZERO-LABEL AdaBN MECHANISM
# ==========================================
def draw_fig3():
    fig, ax = setup_patent_fig("FIG. 3 — ZERO-LABEL ADAPTIVE BATCH NORMALISATION (AdaBN)")
    
    add_box(ax, 25, 112, 50, 6, "UNANNOTATED TARGET SITE IMAGES (B_t)\nStreaming from New Scanner Installation", "300")
    add_arrow(ax, 50, 112, 50, 104)

    # Large container
    outer = patches.FancyBboxPatch((10, 30), 80, 74, boxstyle='round,pad=1', linewidth=1.5, edgecolor='black', facecolor='white', linestyle='--')
    ax.add_patch(outer)
    ax.text(50, 101, "DEEP CONVOLUTIONAL FEATURE EXTRACTOR f_θ", ha='center', fontsize=9, fontweight='bold')

    add_box(ax, 20, 88, 60, 7, "CONVOLUTIONAL FILTERS W^(l) — STRICTLY FROZEN", "302", lw=1.8)
    add_arrow(ax, 50, 88, 50, 81)

    add_box(ax, 15, 68, 70, 13, "BATCH STATISTIC COMPUTATION (Channel c)\nμ_Bt,c = (1 / m·H·W) Σ x_i,c,h,w\nσ²_Bt,c = (1 / m·H·W) Σ (x_i,c,h,w - μ_Bt,c)²", "304")
    add_arrow(ax, 50, 68, 50, 60)

    add_box(ax, 15, 46, 70, 14, "MOMENTUM RUNNING STATISTIC UPDATE (η = 0.1)\nμ_t,c^(l) ← (1 - η) μ_t,c^(l) + η μ_Bt,c\n(σ_t,c^(l))² ← (1 - η) (σ_t,c^(l))² + η σ²_Bt,c", "306", lw=1.5)
    add_arrow(ax, 50, 46, 50, 38)

    add_box(ax, 20, 33, 60, 6, "AFFINE PARAMETERS (γ_l, β_l) & CLASSIFIER W_head — FROZEN", "308", lw=1.8)

    add_arrow(ax, 50, 30, 50, 20)
    add_box(ax, 25, 11, 50, 9, "CALIBRATED FEATURE REPRESENTATION\n(Eliminates Scanner Covariate Shift; AUROC: 0.7491 → 0.7596\nWithout Labels or Backpropagation)", "310")

    path = os.path.join(FIG_DIR, 'fig3_adabn_mechanism.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

# ==========================================
# FIG. 4: MASKED HiResCAM VS GRAD-CAM
# ==========================================
def draw_fig4():
    fig, ax = setup_patent_fig("FIG. 4 — ANATOMICALLY MASKED HiResCAM ATTRIBUTION")
    
    add_box(ax, 30, 112, 40, 6, "HEAD CT INPUT SLICE X", "400")
    
    # Left: Prior Art Grad-CAM
    add_box(ax, 8, 98, 38, 8, "PRIOR ART: GRAD-CAM\nSpatial Global Average of Gradients\nα_k^c = (1/Z) Σ_u Σ_v ∂Y_c / ∂A_k(u, v)", "402")
    add_arrow(ax, 35, 112, 27, 98)
    
    add_box(ax, 8, 72, 38, 18, "FAILURE MODE:\nDense Cortical Calvarial Bone (+1000 HU)\nHijacks Convolutional Gradients\n\nResult:\n11.20% Pointing Hit Rate\nArtifactual Ring Surrounding Skull", "404", lw=1.5)
    add_arrow(ax, 27, 98, 27, 90)

    # Right: Present Invention Masked HiResCAM
    add_box(ax, 54, 98, 38, 8, "ELEMENT-WISE GRADIENT PRODUCT\n(HiResCAM: Preserves Local Spatial Detail)\nH_c(u, v) = Σ_k [ (∂Y_c / ∂A_k(u, v)) · A_k(u, v) ]", "406")
    add_arrow(ax, 65, 112, 73, 98)

    add_box(ax, 54, 76, 38, 14, "AUTOMATED ANATOMICAL MASK M_brain\nDual HU Window (0 ≤ HU ≤ +85)\nIsolates Brain Soft Tissue & Fluid;\nMorphological Hole-Filling", "408", lw=1.5)
    add_arrow(ax, 73, 98, 73, 90)

    add_box(ax, 54, 52, 38, 16, "MASKED HiResCAM MULTIPLICATION\nA_final(u, v) = ReLU(H_c(u, v)) ⊙ M_brain(u, v)\n\nComplete Skull Bone Suppression;\nPointing Hit Rate: 43.83% – 62.16%", "410", lw=1.8)
    add_arrow(ax, 73, 76, 73, 68)

    # Comparison summary box
    add_box(ax, 15, 16, 70, 24, "DIAGNOSTIC EXPLAINABILITY COMPARISON\n\nConventional Grad-CAM (Prior Art): Activation energy concentrated along bone borders.\nAnatomically Masked HiResCAM (Invention): Activation energy strictly bounded within\nparenchymal, subdural, and epidural spaces, matching radiologist diagnostic criteria.", "412")

    path = os.path.join(FIG_DIR, 'fig4_masked_hirescam.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

# ==========================================
# FIG. 5: UNCERTAINTY MONOTONICITY
# ==========================================
def draw_fig5():
    fig, ax = setup_patent_fig("FIG. 5 — EPISTEMIC UNCERTAINTY VARIANCE MONOTONICITY")
    
    # Draw graph inside axes
    rect = patches.Rectangle((15, 45), 70, 65, fill=False, edgecolor='black', linewidth=1.5)
    ax.add_patch(rect)

    # Plot axes lines
    ax.plot([22, 80], [52, 52], color='black', lw=1.2) # X
    ax.plot([22, 22], [52, 102], color='black', lw=1.2) # Y

    # Plot monotonic curve (MC Dropout Epistemic Variance)
    x_pts = np.linspace(22, 78, 50)
    y_epi = 54 + 42 * ((x_pts - 22) / 56.0)**1.8
    ax.plot(x_pts, y_epi, color='black', lw=2.2, label='Epistemic Variance σ²_epi (Spearman ρ = 0.9000)')

    # Plot confidence collapse curve (Prior Art)
    y_prior = 96 - 38 * ((x_pts - 22) / 56.0)**0.8
    ax.plot(x_pts, y_prior, color='black', lw=1.5, linestyle='--', label='Prior Art Confidence (Erratic / Overconfident)')

    ax.text(50, 48, "Image Acquisition Perturbation Severity (Noise σ, Blur Kernel w)", ha='center', fontsize=8)
    ax.text(18, 77, "Uncertainty / Confidence", ha='center', va='center', rotation=90, fontsize=8)

    ax.text(62, 98, "EPISTEMIC VARIANCE σ²_epi\n(Monotonic ρ ≥ 0.85)", fontsize=8, fontweight='bold')
    ax.text(58, 62, "PRIOR ART CONFIDENCE\n(Uncertainty Blind)", fontsize=7.5)

    add_box(ax, 15, 14, 70, 22, "PHYSICS ROBUSTNESS AUDIT (Test K Evidence)\n\n• Baseline AUROC 0.9072 gracefully preserved (0.8739 at σ=0.05, 0.8013 at σ=0.10)\n• Monotonic rank correlation between noise and epistemic variance: ρ = 0.9000, p = 0.0374\n• Neural representation explicitly signals its own ignorance under scanner degradation", "500")

    path = os.path.join(FIG_DIR, 'fig5_uncertainty_monotonicity.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

# ==========================================
# FIG. 6: STROKE CODE MULTI-CHANNEL DISPATCH
# ==========================================
def draw_fig6():
    fig, ax = setup_patent_fig("FIG. 6 — STROKE CODE AUTOMATED MULTI-CHANNEL ALERT DISPATCH")
    
    add_box(ax, 25, 112, 50, 6, "ACUTE SURGICAL EMERGENCY DETECTED\n(ICH / LVO Stroke / Tension Pneumothorax)", "600")
    add_arrow(ax, 50, 112, 50, 105)

    add_box(ax, 20, 96, 60, 9, "9-LAYER METACOGNITION PASS VALIDATION\n(Verification of Plausibility, SHAP Coherence, Negation Check,\nHallucination Score H ≤ 0.30)", "602", lw=1.5)
    add_arrow(ax, 50, 96, 50, 88)

    add_box(ax, 25, 80, 50, 8, "STROKE CODE DISPATCH CONTROLLER\nLatency Budget: Door-to-Alert < 2000 ms", "604", lw=1.8)

    # 5 Parallel channels
    chans = [
        ("MOBILE PUSH GATEWAY\n(FCM Notification to\nOn-Call Stroke Team)", "606"),
        ("WEBSOCKET EVENT BUS\n(Real-Time Hospital\nWorklist Priority Jump)", "608"),
        ("HL7v2 ADT^A02\n(Patient Immediate\nBed Transfer Message)", "610"),
        ("HL7v2 ORM^O01\n(Automated Urgent\nCT Angiography Order)", "612"),
        ("HL7v2 ORU^R01\n(Preliminary AI Result\nDispatch to PACS)", "614")
    ]

    for i, (text, num) in enumerate(chans):
        cx = 6 + i * 18
        add_box(ax, cx, 48, 16, 24, text, num, fs=6.5)
        add_arrow(ax, 50, 80, cx + 8, 72)
        add_arrow(ax, cx + 8, 48, cx + 8, 38)

    add_box(ax, 15, 15, 70, 18, "IMMUTABLE AUDIT TRAIL PERSISTENCE\nSHA-256 Hash Chaining across all Event Timestamps & Delivery Receipts;\nPeriodic Merkle Tree Root Hash Signed to Ledger; Mandatory Clinician Sign-off Required.", "616", lw=1.5)

    path = os.path.join(FIG_DIR, 'fig6_stroke_code_dispatch.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

# ==========================================
# FIG. 7: SOVEREIGN DUAL-PATH DEPLOYMENT
# ==========================================
def draw_fig7():
    fig, ax = setup_patent_fig("FIG. 7 — SOVEREIGN DUAL-PATH CLOUD AND OFFLINE EDGE DEPLOYMENT")
    
    add_box(ax, 30, 114, 40, 6, "HOSPITAL LOCAL AREA NETWORK", "700")

    # Cloud Box
    cloud = patches.FancyBboxPatch((8, 52), 40, 56, boxstyle='round,pad=1', linewidth=1.5, edgecolor='black', facecolor='white')
    ax.add_patch(cloud)
    ax.text(28, 104, "SOVEREIGN CLOUD PATH (AKS)", ha='center', fontsize=8.5, fontweight='bold')
    add_arrow(ax, 40, 114, 28, 108)

    add_box(ax, 11, 88, 34, 10, "GPU CONTAINER POOL\n(Kubernetes Standard_NC4as_T4)\nMulti-Engine High-Throughput", "702", fs=7)
    add_box(ax, 11, 72, 34, 10, "TENANT-ISOLATED ENCRYPTED DB\n(PostgreSQL Flexible Server HA\nRow-Level Clinical Security)", "704", fs=7)
    add_box(ax, 11, 56, 34, 10, "WEB APPLICATION FIREWALL\n(Zero PHI Transmission Outside\nSovereign National Boundary)", "706", fs=7)

    # Edge Box
    edge = patches.FancyBboxPatch((52, 52), 40, 56, boxstyle='round,pad=1', linewidth=1.5, edgecolor='black', facecolor='white', linestyle='--')
    ax.add_patch(edge)
    ax.text(72, 104, "OFFLINE EDGE GATEWAY PATH", ha='center', fontsize=8.5, fontweight='bold')
    add_arrow(ax, 60, 114, 72, 108)

    add_box(ax, 55, 88, 34, 10, "INT8-QUANTISED ENGINE\n(EfficientNet-B0 ONNX INT8, 4.1MB\nOperable without Internet)", "708", fs=7)
    add_box(ax, 55, 72, 34, 10, "LOCAL MERKLE-CHAIN AUDIT LOG\n(Cryptographic Integrity Preserved\nacross Disconnected Periods)", "710", fs=7)
    add_box(ax, 55, 56, 34, 10, "CELLULAR GSM MODEM\n(Direct SMS Emergency Fallback\nwhen LAN / Fiber Disrupted)", "712", fs=7)

    add_box(ax, 15, 18, 70, 24, "UNIFIED CLINICAL OPERATION & SYNC PROTOCOL\n\n• Connected Mode: Cloud AKS cluster processes multi-center hospital workflows.\n• Disconnected Mode: Local edge gateway performs full INT8 inference and dispatches SMS alerts.\n• Automatic reconciliation: Merkle audit tree synchronises upon connectivity restoration.", "714")

    path = os.path.join(FIG_DIR, 'fig7_sovereign_deployment.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

# ==========================================
# FIG. 8: MULTI-MODAL EXPANSION
# ==========================================
def draw_fig8():
    fig, ax = setup_patent_fig("FIG. 8 — MULTI-MODAL EMERGENCY RADIOLOGY TRIAGE PIPELINE")
    
    add_box(ax, 25, 112, 50, 6, "UNIFIED MULTI-MODAL INGESTION GATEWAY\nDICOM Modality Routing Header Tag Analysis", "800")

    mods = [
        ("NCCT HEAD CT ENGINE\n(EfficientNet-B0 / B4)\nAcute ICH & Subtypes\n(IPH, EDH, SDH, SAH, IVH)", "802"),
        ("CHEST X-RAY (CXR) ENGINE\n(Standardised 1,3,224,224)\nTension Pneumothorax (PTX)\nActive Tuberculosis (TB)", "804"),
        ("CTPA PULMONARY ENGINE\n(3-Window Tensor)\nPulmonary Embolism (PE)\nRight Heart Strain Gating", "806"),
        ("BRAIN MRI ENGINE\n(DWI / ADC / FLAIR Channels)\nAcute Ischemic Stroke (LVO)\nvs Non-Haemorrhagic Mimics", "808")
    ]

    for i, (text, num) in enumerate(mods):
        cx = 6 + i * 23
        add_box(ax, cx, 66, 21, 28, text, num, fs=6.5)
        add_arrow(ax, 50, 112, cx + 10.5, 94)
        add_arrow(ax, cx + 10.5, 66, cx + 10.5, 52)

    add_box(ax, 15, 34, 70, 18, "COMMON MULTI-MODAL SAFETY ENFORCEMENT BUS\n(Split Conformal Risk Bounding FNR ≤ 5% ⊙ Zero-Label AdaBN Domain Adaptation\n⊙ Epistemic Monte Carlo Dropout Uncertainty ⊙ Masked Spatial Attribution)", "810", lw=1.5)
    add_arrow(ax, 50, 34, 50, 24)

    add_box(ax, 20, 12, 60, 12, "UNIFIED EMERGENCY WORKLIST PRIORITISATION\n(PACS Worklist Color-Coded Triage Queue with Bounded Risk\nMandatory Consultant Radiologist Cryptographic Sign-Off)", "812", lw=1.8)

    path = os.path.join(FIG_DIR, 'fig8_multimodal_expansion.png')
    plt.savefig(path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Generated: {path}")

def compile_drawings_pdf(out_pdf):
    doc = SimpleDocTemplate(out_pdf, pagesize=A4, rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
    styles = getSampleStyleSheet()
    story = []
    
    header_style = ParagraphStyle('Head', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=13, alignment=1, textColor=colors.HexColor('#050f0c'))

    figures = [
        ('fig1_architecture.png', 'FIG. 1: HIGH-LEVEL SYSTEM ARCHITECTURE & 7-LAYER SAFETY PIPELINE'),
        ('fig2_conformal_calibration.png', 'FIG. 2: SPLIT CONFORMAL RISK CONTROL CALIBRATION & INFERENCE'),
        ('fig3_adabn_mechanism.png', 'FIG. 3: ZERO-LABEL ADAPTIVE BATCH NORMALISATION (AdaBN)'),
        ('fig4_masked_hirescam.png', 'FIG. 4: ANATOMICALLY MASKED HiResCAM ATTRIBUTION'),
        ('fig5_uncertainty_monotonicity.png', 'FIG. 5: EPISTEMIC UNCERTAINTY VARIANCE MONOTONICITY'),
        ('fig6_stroke_code_dispatch.png', 'FIG. 6: STROKE CODE AUTOMATED MULTI-CHANNEL DISPATCH'),
        ('fig7_sovereign_deployment.png', 'FIG. 7: SOVEREIGN DUAL-PATH DEPLOYMENT ARCHITECTURE'),
        ('fig8_multimodal_expansion.png', 'FIG. 8: MULTI-MODAL EMERGENCY RADIOLOGY TRIAGE PIPELINE')
    ]

    for idx, (fname, caption) in enumerate(figures):
        story.append(Paragraph(f"PATENT DRAWINGS SHEET {idx+1}/{len(figures)} — {caption}", header_style))
        story.append(Spacer(1, 10))
        img_path = os.path.join(FIG_DIR, fname)
        story.append(RLImage(img_path, width=540, height=700))
        if idx < len(figures) - 1:
            story.append(PageBreak())

    doc.build(story)
    print(f"Successfully generated Master Formal Patent Drawings PDF: {out_pdf}")

if __name__ == '__main__':
    draw_fig1()
    draw_fig2()
    draw_fig3()
    draw_fig4()
    draw_fig5()
    draw_fig6()
    draw_fig7()
    draw_fig8()
    compile_drawings_pdf('docs/patent/UK_Patent_Application_2_Formal_Drawings.pdf')
    print("All 8 patent drawings generated and compiled successfully.")
