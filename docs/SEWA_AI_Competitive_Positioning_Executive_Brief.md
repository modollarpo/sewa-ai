# SEWA AI — Competitive Positioning Executive Brief

**Document Ref:** SEWA-AI-REPORT-CLD-001-EB · **Version:** 1.0 · **Date:** 20 August 2026

---

## 1. The Situation

The clinical imaging AI market is crowded, well-funded, and increasingly evidenced — but it is crowded with **detection tools, not trust architectures**. Incumbents have won at scale on three axes: **breadth of findings** (Harrison.ai/Annalise.ai: 124 CXR / 130 CT brain findings, 45+ NHS Trusts, >35% of NHS England CXRs), **pathway-specific evidence** (Brainomix: Lancet Digital Health 2025, 452,952 patients across 107 NHS hospitals, EVT rates doubled; DeepHealth/Kheiron: GEMINI study in Nature Cancer 2026, +10.4% breast-cancer detection), and **workflow orchestration** (Viz.ai: profitable, ~2,000 hospitals).

None has publicly delivered the combination of capabilities SEWA AI is architected around.

## 2. Why NHS Adoption Stalls

The NHS already uses AI at scale (RCR 2023 census: ≥54% of radiology departments), and has funded it (NHS AI Lab, £123M AI in Health and Care Award, AI Diagnostic Fund). The documented reasons adoption stalls are:

- **Alert fatigue** from high false-positive rates and uninterpretable outputs.
- **Opacity** — single confidence scores with no decomposition of *why* the model is uncertain.
- **No guaranteed human oversight** — oversight enforced in the UI (bypassable), not the architecture.
- **No continuity** — cloud-only tools fail during connectivity or cloud outages.
- **Evidence lag** — NICE EVA repeatedly calls for more real-world evidence (e.g., stroke decision-support DG57 judged "insufficient evidence" for routine use).

The NHS does not have an AI shortage. It has a **trustworthy AI shortage**.

## 3. SEWA AI's Differentiation

SEWA AI is a Software-as-a-Medical-Device (SaMD, Class IIb planned) providing automated triage and prioritisation of adult thoracic and acute radiology (CXR, CT head, CT chest, CTA) as decision support for consultant radiologists, with mandatory human sign-off enforced at the database layer.

| Differentiator | What SEWA does | Why it matters |
|---|---|---|
| **Uncertainty quantification** | Monte-Carlo Dropout (20 passes) decomposes uncertainty into *epistemic* ("model doesn't know — escalate") vs *aleatoric* ("image ambiguous — flag for human review") | Converts a blind confidence score into an actionable escalation signal; answers the "uninterpretable single score" objection |
| **Metacognition Gate (patent GB2609706.3)** | Nine-layer safety audit of every output; hallucination-risk score H∈[0,1]; H>0.30 blocks autonomous dispatch — no silent discard | Prevents over-confident misses reaching the clinical team before a human |
| **Non-bypassable human-in-the-loop** | Sign-off enforced at the **database layer**, not the UI | Cannot be defeated by frontend manipulation; a verifiable safety guarantee for governance |
| **Offline continuity** | INT8-quantised ~18MB edge model on a 4-core CPU (no internet) + GSM/SMS mode; AES-256-GCM encrypted cache; auto-sync | Keeps triaging during outages; enables low-connectivity and equity settings |
| **Zero-PHI-egress UK sovereign cloud** | All data stays in Azure UK South | Aligns with NHS data-governance expectations at a time when large data partnerships are contested |
| **Explainability on every finding** | Grad-CAM + SHAP visual explanation; VLM structured report + natural-language impression in 8 languages | Clinicians see *why*; supports DCB0129 clinical safety case |
| **Transparent pricing** | Published £549–£4,999+/month; Africa Programme at 60–80% discount | De-risks procurement; no incumbent publishes pricing |

## 4. The Honest Boundary

SEWA AI is at **TRL 5**: **no UKCA/CE/FDA mark, no independent clinical validation, no NHS production deployment yet**. All current performance figures are internal engineering tests (e.g., internal AUC-ROC 0.961 overall, n=14,200) and are not clinical evidence. Pathology, mammography and retinal modules are roadmap-only and carry no claims. This report is deliberately conservative: competitor gaps are stated as "no published evidence," not "no capability."

## 5. What SEWA Must Do (and Is Doing)

1. **Race to evidence, not finding-count.** The differentiators mean nothing without independent validation. Path in motion: shadow trial (prospective, 6-month, primary endpoint door-to-alert <5 min) → NIHR EME → UKCA Class IIb (Q2 2027). Brainomix's Lancet study and DeepHealth's GEMINI study are the evidence-bar templates.
2. **Publish the safety architecture** as peer-reviewed science. No competitor has published uncertainty decomposition + hallucination gate + DB-layer sign-off; it is the single most defensible differentiation.
3. **Lead with the "trustworthy AI shortage" narrative** in every NHS/NIHR conversation.
4. **Align to the regulatory trajectory**: MHRA's 2025 reforms reserve the UKCA route for "first-in-market innovative AI" and build on Good Machine Learning Practices, PCCPs and transparency — exactly what SEWA was designed to demonstrate. DTAC Q4 2026, MHRA Notice of No Objection Q3 2026–Q1 2027.

## 6. Bottom Line

The market's winners won on breadth, workflow, or evidence. **None won on trust.** SEWA's differentiation is architectural and safety-led — designed from first principles to answer the documented reasons NHS AI adoption fails. Its challenge is not identity; it is proof. The evidence pathway is designed, powered, and in motion.

---

*Full evidence base, competitive deep-dives, comparative matrices, references and the source dataset are in the parent report: SEWA-AI-REPORT-CLD-001. © 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · INN-2604-0064-2 · GB2609706.3 · info@sewaxai.health*