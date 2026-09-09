# SEWA AI — Executive Investment Summary
**Storegrill Inc Ltd (Company No. 14581073)**
*Seed Round: £650,000 · May 2026*

---

## 1. Executive Overview
SEWA AI is the clinical intelligence and safety-assurance layer for AI-assisted medical diagnosis, starting with acute radiology across the UK and Sub-Saharan Africa. Operating as a core healthcare AI venture within Storegrill Inc Ltd (registered in England & Wales No. 14581073), SEWA AI addresses the severe radiology capacity bottleneck through an innovative four-engine architecture that combines multi-condition triage, rigorous uncertainty quantification, VLM-generated structured reporting, and a 9-layer metacognitive safety gate.

## 2. The Problem
- **NHS England**: Facing a 29% consultant radiologist vacancy rate, 1.5 million backlogged annual imaging reports, and a median urgent reporting time of 4.2 hours. The annual backlog cost stands at £1.9B across 7.4M scans.
- **Sub-Saharan Africa**: Crippled by a radiologist density of <0.4 per million population (a 98%+ deficit against WHO minimums). Patients travel 300km+ for a scan read; preventable deaths result from diagnostic delays.
- **Existing AI**: Fragmented single-condition tools lacking uncertainty decomposition, hallucination screening, offline edge execution, and sovereign data protection.

## 3. The SEWA AI Solution
SEWA AI integrates four proprietary engines into a sub-2-second pipeline (1.84s median door-to-alert):
1. **Triage Engine**: EfficientNet-B4 detecting 14 acute conditions across CT, MRI, and X-ray with Grad-CAM and SHAP attribution (AUC-ROC 0.972 for ICH).
2. **Uncertainty Engine**: MC-Dropout ($\times 20$) quantifying epistemic and aleatoric uncertainty. Mandatory human escalation if composite score exceeds 0.25.
3. **VLM Report Generator**: BioMedCLIP + Llama-3 LoRA producing structured 4-section radiology reports in 8 languages, capturing radiologist edits for continuous learning.
4. **Metacognition Gate**: 9-layer safety system evaluating hallucination risk ($H \in [0,1]$). $H > 0.30 \rightarrow$ BLOCK. No finding ever silently discarded.

## 4. Defensible IP & Technology Moat
- **UK Patent Filed**: GB2609706.3 (March 2026; Sole Inventor: Dolapo Ariyo; 10 claims covering 4-engine orchestration, metacognition, and federated learning). FTO search completed in April 2026 with no blocking prior art.
- **Sovereign & Offline-First**: Operates entirely within Azure UK South (zero PHI egress) and features an 18MB INT8-quantised edge model running on 4-core CPUs without internet in rural African clinics (GSM SMS fallback).

## 5. Traction & Validation
- **NHS Innovation Service Registered**: Ref INN-2604-0064-2 (Active).
- **HRA Engagement**: Engaging with assessor Syeda Thorpe (May 2026).
- **Safety Cases**: DCB0129 Clinical Safety Case complete (SMP-001 + CRM-001); IRAS application in progress; Shadow trial protocol ready for non-interventional evaluation at zero NHS cost; formal proposals submitted to UHCW, King's College, UHB, and MFT.

## 6. Market Opportunity & Business Model
- **TAM / SAM / SOM**: $22B global medical imaging AI market by 2030; £4.1B addressable acute radiology market; £28M initial NHS beachhead.
- **Monetization**: B2B SaaS subscription model ranging from £149/mo (Africa Edge) to £3,499/mo (Enterprise), supplemented by per-scan overages (£1.29–£3.49/scan), referral network commissions, and future EMR API licensing.

## 7. Financial Outlook & Use of Funds (£650k Seed)
- **5-Year ARR Projections**: £120K (Year 1) $\rightarrow$ £820K (Year 2) $\rightarrow$ £3.4M (Year 3) $\rightarrow$ £7.1M (Year 4) $\rightarrow$ £14.6M (Year 5).
- **Use of Funds (£650k / 18-month runway)**:
  - Direct Labour (£403K / 62%): CMO, CSO, 2× ML Engineers, Africa Lead.
  - Cloud Infrastructure (£94K / 14%): Azure AKS, GPU nodes, FHIR, monitoring.
  - Clinical Validation (£109K / 17%): NHS datasets, REC, DTAC, DCB0129, UKCA Class IIb prep.
  - Africa Deployment (£34K / 5%): Edge devices, GSM, 3 clinic deployments.
  - Legal & IP (£38K / 6%): PCT patent filing, trademarks, FTO.
  - *Match Funding*: £331,220 from seed investment + early revenue.
- **Key Metrics at Scale**: LTV:CAC 9.7–13.7×, Gross Margin 78–85%, Payback Period 2.4–5.2 months, EBITDA positive in Year 3 H2, Series A target Q1 2027 (£5–8M).
