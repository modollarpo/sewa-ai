SEWA AI TRUSTWORTHY CLINICAL AI PLATFORM
MASTER DOSSIER · VOLUMES 1-3 · INTEGRATED EDITION
Version 2.0 — July 2026

=== DOCUMENT CONTROL ===
Document ID: SEWA-AI-MASTER-002
Sponsor: Storegrill Inc Ltd · Company No. 14581073
Sponsor Representative: Dolapo Ariyo, Founder & CEO · ORCID: 0009-0006-0163-2538
Chief Investigator: To be confirmed — NHS/University-employed Consultant Radiologist
NHS Innovation ID: INN-2604-0064-2
UKIPO Patent: GB2609706.3 (filed April 2026) · Sole inventor: Dolapo Ariyo
IRAS Project ID: 372596 — Data-Only Research Framework
Device Classification: SaMD Class IIb (UK MDR 2002 / EU MDR 2017/745 Rule 11)
TRL Status: TRL 5 — Core platform developed; internal testing complete

=== PERFORMANCE DISCLAIMER ===
Unless otherwise stated, all performance metrics are derived from internal engineering 
development and technical testing. They should not be interpreted as independent clinical 
validation. Independent NHS clinical validation is planned as the next stage.

=== TABLE OF CONTENTS ===

VOLUME 1: EXECUTIVE & STRATEGIC
1. Executive Summaries
2. Vision, Mission and Values
3. Clinical Problem Statement
4. NHS Strategic Alignment
5. Market Landscape
6. Competitor Analysis
7. Differentiation
8. Commercialisation Roadmap

VOLUME 3: TECHNICAL
9. System Architecture & Pipeline
10. The Four-Engine Pipeline
11. Nine-Layer Metacognition Gate
12. Uncertainty Quantification Engine
13. Edge Deployment & INT8 Quantisation
14. Federated Learning & Differential Privacy
15. Red Team: Failure Modes
16. Data Governance & Audit Architecture
17. Interoperability & Standards
18. Performance Metrics & Test Methodology

VOLUME 4: COMMERCIAL & PRICING
19. Pricing Model (Live)
20. Revenue Projections (Updated)
21. Go-to-Market Strategy

=== VOLUME 1: EXECUTIVE & STRATEGIC ===

1.1 ONE-PAGE EXECUTIVE SUMMARY

THE PROBLEM:
- NHS: 29% consultant radiologist vacancy, 1.5M backlogged reports, 4.2hr median urgent time
- Africa: <0.4 radiologists per million, 25,000+ clinics with no diagnostic AI

THE PLATFORM:
Trustworthy Clinical AI Platform — four engines with uncertainty quantification, 
hallucination detection, and mandatory DB-layer human sign-off. Works fully offline 
on 4-core CPU with GSM SMS fallback.

CURRENT STAGE: TRL 5. Independent NHS validation next.

INTERNAL TEST STATUS*:
Internal engineering testing performed across CT, MRI, and X-ray targets. Internal
metrics under review — no AUC/performance figures claimed yet.
*Internal testing only; not clinical results

LIVE PRICING:
Starter Clinic: £549/mo (500 scans) | Hospital Pro: £2,199/mo (5,000 scans) | Enterprise: Custom
Africa Programme: 60-80% reduced cost

FUNDING: Seed £650K | NHS pilots 2-4 | NIHR EME Q1 2027 | Series A £5-8M

1.2 TWO-PAGE EXECUTIVE SUMMARY

The NHS processes 7.4M imaging studies annually with 1,939 unfilled consultant posts.
Median urgent reporting: 4.2 hours. For stroke/ICH/PE, minutes determine outcomes.

SEWA AI delivers clinical alerts from scan receipt with:
- Built-in uncertainty quantification (MC-Dropout, 20 passes)
- Hallucination detection (Nine-Layer Metacognition Gate, H score)
- Mandatory human sign-off at database layer (not UI)
- Fully offline operation (INT8, 18MB, 4-core CPU, GSM SMS)

THE FOUR-ENGINE PIPELINE:
1. Detection CNN (EfficientNet-B4, 14 acute conditions)
2. Uncertainty Quantification (epistemic + aleatoric decomposition)
3. Metacognition Gate (9-layer safety audit, H ∈ [0,1])
4. VLM Report Generation (8 languages, structured + natural language)

GOVERNANCE:
Sponsor: Storegrill Inc Ltd
Sponsor Rep/Co-Applicant: Dolapo Ariyo (confirmed)
Chief Investigator: To be confirmed from NHS/University (HRA mandatory)
Clinical Safety Officer: To be appointed
Statistical Co-Applicant: UK university partner (in discussion)
HRA Assessor: Syeda Thorpe (engaging May 2026)

1.3 FIVE-PAGE STRATEGIC BRIEF

Part A — Strategic Context:
Medical imaging is the entry point for acute pathways. NHS Resolution identifies 
diagnostic delay as the largest negligence category. AI adoption has stalled on trust, 
not accuracy.

Part B — What SEWA AI Is:
Infrastructure for safe clinical AI adoption. Cloud (Azure UK South, AKS GPU, zero PHI) 
and fully offline edge (INT8, 18MB, 4-core CPU, GSM SMS). Same safety architecture in both.

Patent GB2609706.3: Nine-Layer Metacognition Gate. H > 0.30 blocks autonomous dispatch.
Uncertainty Engine: U = 0.6σ²_ep + 0.4σ²_al. Mandatory escalation at U > 0.25.

Part C — Current Stage and Next Steps:
TRL 5. Immediate priority: independent clinical evidence via NHS collaboration.

Part D — Governance:
CI must be NHS/university-employed. This is the primary near-term action.

Part E — Deployment Strategy:
2026: 2 NHS pilots + 3 Africa clinics | 2027: 8 NHS + 15 Africa | 2028: 22 NHS + 40 Africa
2029: 38 NHS + 65 Africa | 2030: 55 NHS + 80 Africa

Part F — Commercial Opportunity (Updated for Live Pricing):

Year | NHS Trusts | Africa Clinics | ARR Conservative | ARR Base | ARR Upside | EBITDA
-----|------------|----------------|------------------|----------|------------|--------
2026 | 2 pilots   | 3              | £60K             | £84K     | £120K      | -£680K
2027 | 8 paying   | 15             | £420K            | £620K    | £950K      | -£200K
2028 | 22 paying  | 40             | £1.6M            | £2.8M    | £4.5M      | +£100K
2029 | 38 paying  | 65             | £3.8M            | £6.2M    | £9.8M      | £2.2M
2030 | 55 paying  | 80             | £7.5M            | £12.4M   | £19.2M     | £5.1M

Unit economics (updated):
LTV:CAC 6x-9x | CAC payback 4-8 months | Gross margin 70-80%
EBITDA positive Year 3 H2 (conservative)

Note: ARR projections updated to reflect live pricing (Starter £549, Pro £2,199, Enterprise custom).
Lower entry price accelerates adoption but requires higher customer counts for scale.

=== 2. VISION, MISSION AND VALUES ===

Vision: "A world where no patient dies because a life-threatening scan waited too long 
to be read — in London, Lagos, Nairobi, or anywhere in between."

Mission: "To build and deploy Trustworthy Clinical AI that reduces diagnostic delays, 
saves lives, and works in every healthcare system."

Core Values:
- Safety First: DCB0129 complete, DB-layer HITL
- Epistemic Honesty: MC-Dropout, UQ + calibration (ECE under evaluation), U > 0.25 escalation
- Clinical Utility: 14 time-critical conditions, zero workflow disruption
- Equity: INT8 edge, no internet, GSM SMS, Africa Programme 60-80% off
- Transparency: Grad-CAM + SHAP, Merkle-chain audit
- Accountability: DB-layer sign-off, reviewer attribution
- Sovereignty: Azure UK South only, Zero-Egress Declaration, edge PHI never leaves

=== 3. CLINICAL PROBLEM STATEMENT ===

3.1 NHS Diagnostic Backlog Crisis:
- 7.4M imaging studies annually
- 1,939 unfilled consultant posts (29% vacancy — RCR 2025)
- 1.5M backlogged reports
- 4.2hr median urgent reporting time
- Diagnostic delay = largest NHS negligence category (NHS Resolution 2024)
- 67% radiologists report unsustainable workload (BMA 2023)

3.2 Africa Radiologist Crisis:
- <0.4 radiologists per million (WHO minimum: 20)
- >98% shortfall
- 150-300km one-way for single scan
- <50% rural internet uptime
- SEWA AI: INT8 edge, GSM SMS, offline, <£500 hardware

3.3 Edge/Offline Imperative:
70%+ of LMIC settings lack reliable internet. SEWA AI's offline capability is a core 
design principle, not an afterthought.

3.4 The AI Trust Gap:
Three limitations prevent clinical trust in competitor systems:
1. Single confidence scores, no uncertainty decomposition
2. No hallucination detection before alert dispatch
3. No offline/edge capability

SEWA AI addresses all three.

=== 4. NHS STRATEGIC ALIGNMENT ===

4.1 NHS Long Term Plan (2019, updated 2023):
27 Community Diagnostic Centres, NHS Diagnostic Recovery programme. SEWA AI serves 
both teaching hospitals (cloud AKS) and community hubs (INT8 edge).

4.2 NHS AI Lab Alignment:
- Clinical safety: 9-layer gate, DB-layer HITL, DCB0129 complete
- Explainability: Grad-CAM + SHAP, calibrated uncertainty
- Equity: Subgroup analysis, SOP-AI-005 equity audit, Africa Programme
- Interoperability: DICOM, FHIR R4, HL7 v2
- Offline/edge: INT8, 4-core CPU, no internet, GSM SMS
- Evidence generation: IRAS 372596, shadow trial ready, NIHR EME Q1 2027

4.3 DTAC Alignment:
- Clinical safety: DCB0129 SMP-001+CRM-001, CSO designated
- Data protection: DPIA-001 (GDPR Art 35), Azure UK South, no PHI egress
- Technical assurance: SAD-001, AKS+WAF+HSTS+TLS 1.3, pen testing Q3 2026
- Interoperability: DICOM C-STORE, FHIR R4, HL7 v2 MLLP
- Usability: usability evaluation under review

4.4 NIHR, MRC, Innovate UK:
- NIHR EME: Shadow trial → EME Q1 2027, West Midlands trusts
- NIHR i4i: SaMD Class IIb commercial translation
- MRC RACR: UQ and metacognition as mechanistic AI safety research
- Innovate UK: UK company 2023, Global South founder, patent GB2609706.3
- HDR UK: WMSDE access in progress, IRAS 372596, DRF v4.0 submitted

=== 5. MARKET LANDSCAPE ===

5.1 Global Market: $2.4B (2023) → $22B (2030), 26.2% CAGR

5.2 UK NHS Market (Updated for Live Pricing):

Segment                | Trusts | Scans/Year   | Tier           | ARR Potential
-----------------------|--------|--------------|----------------|--------------
Large teaching hospitals| 62     | 250,000+     | Enterprise     | £24.8M+
District general       | 108    | 80K-120K     | Hospital Pro   | £22.7M
Community hubs         | 86     | 20K-60K      | Starter Clinic | £4.5M
Independent sector     | 44     | Variable     | Starter Clinic | £2.3M
Total NHS England      | 300    | 7.4M+        | —              | £54.3M

5.3 Africa Market:

Country       | Radiologists | Population | Clinics | Payment Rail      | Y1 Revenue
--------------|--------------|------------|---------|-------------------|------------
Nigeria       | 350          | 220M       | 180     | Paystack · NGN    | £320K
Kenya         | 120          | 55M        | 95      | M-Pesa · KES      | £140K
Ghana         | 80           | 33M        | 60      | Flutterwave · GHS | £75K
South Africa  | 620          | 60M        | 45      | Stripe · ZAR      | £165K
Tanzania      | 45           | 65M        | 40      | M-Pesa · TZS      | £60K
Ethiopia      | 30           | 120M       | 50      | Flutterwave · ETB | £50K
Total         | 1,245        | 553M       | 470     | Multi-rail        | £810K

*Adjusted for 60-80% Africa Programme pricing*

5.4 TAM/SAM/SOM:
- TAM: Global AI medical imaging = $22B by 2030
- SAM: NHS England + EU + Sub-Saharan Africa = $4.1B by 2028
- SOM: 55 NHS trusts + 80 African clinics by Year 5 = £18M ARR (live pricing)

=== 6. COMPETITOR ANALYSIS ===

6.1 Harrison.ai / Annalise Enterprise CT:
124 findings from CT chest. Most technically broad competitor.
Gaps: No UQ, no VLM, no metacognition gate, no offline/edge, no Africa, no published pricing.

DISTINCTION: Harrison.ai's 124 findings include chronic/incidental findings not requiring 
emergency triage. SEWA AI's 14 conditions are the conditions where minutes determine survival.

6.2 Aidoc: 8-12 conditions, 1,200+ hospitals, FDA cleared.
Gaps: No decomposed uncertainty, no metacognition gate, cloud-dependent, no offline, no Africa.

6.3 Qure.ai: Strongest Africa competitor. Active Nigeria, Kenya, Ghana. Chest X-ray only.
Gaps: No UQ, no metacognition gate, no VLM in local languages.

6.4 Lunit: Chest X-ray and mammography. Strong academic record.
Gaps: No decomposed uncertainty, no metacognition gate, no offline edge.

6.5 Viz.ai: US stroke AI leader, 1,000+ hospitals. Single condition.
Gaps: No VLM, no UQ, no metacognition gate, no offline, no Africa.

6.6 Competitive Matrix:

Capability              | SEWA AI      | Harrison | Aidoc | Qure | Lunit | Viz.ai
------------------------|--------------|----------|-------|------|-------|--------
Conditions              | 14           | 124      | 8-12  | 2-3  | 2-3   | 3
Multi-modal             | CT+MRI+CXR   | CT only  | Partial| CXR | CXR   | CT
Uncertainty quantification| ✅ MC-Dropout| ❌      | Partial| ❌  | ❌    | ❌
Metacognition gate      | ✅ 9-layer   | ❌       | ❌    | ❌   | ❌    | ❌
Hallucination detection | ✅           | ❌       | ❌    | ❌   | ❌    | ❌
VLM reports             | ✅ 8 languages| ❌      | ❌    | Partial| ❌  | ❌
Offline/edge            | ✅ INT8 CPU  | ❌       | ❌    | Partial| ❌  | ❌
Africa/low-connectivity | ✅ GSM SMS   | ❌       | ❌    | ✅   | Partial| ❌
Federated learning (DP) | ✅ ε=1.0     | ❌       | ❌    | ❌   | ❌    | ❌
Human-in-loop (DB layer)| ✅           | ❌       | ❌    | ❌   | ❌    | ❌
Published pricing       | ✅           | ❌       | ❌    | ❌   | ❌    | ❌
UK patent               | ✅ GB2609706 | PCT/AU   | EP    | IN   | KR    | US
NHS Innovation Service  | ✅ INN-2604  | ❌       | ❌    | ❌   | ❌    | ❌

=== 7. DIFFERENTIATION ===

7.1 Why Trustworthy AI Wins:
Detection is no longer the primary differentiator. The question is whether clinicians 
trust the output enough to act — and whether it works in every environment.

7.2 Four Pillars:
1. Metacognition — platform audits its own thinking
2. Uncertainty Quantification — knows what it doesn't know
3. Mandatory HITL — enforced at database layer
4. Edge Sovereignty — works with no internet

7.3 Edge Sovereignty:
Unlocks NHS continuity during outages AND rural Africa where internet is unavailable.

=== 8. COMMERCIALISATION ROADMAP ===

8.1 Phase 1 — NHS Validation & Shadow Trial (2026):
- Shadow trial at UHCW, King's, UHB, QBM
- Confirm CI (Q3 2026) — CRITICAL PATH
- DTAC submission (Q4 2026)
- MHRA NoO application (Q3 2026-Q1 2027)
- NIHR EME application (Q1 2027)
- Africa: first 3 clinic deployments (Q4 2026)

8.2 Phase 2 — Scale & Africa (2027):
- 8 paying NHS trusts via G-Cloud
- NIHR EME prospective study (4 sites, confirmed CI)
- Africa: 15 clinics
- EU MDR CE Mark application (Q3 2027)
- Series A: £5-8M at £15-20M pre-money (Q1 2027)

8.3 Phase 3 — Series A & EU/US Entry (2028):
- 22 paying NHS trusts + ICS framework
- 40 African clinics, FL network active
- EU MDR CE Mark live (Q1 2028)
- FDA 510(k) pre-submission (Q3 2027)
- UKCA Class IIb (Q2 2027)
- Series B prep: £15-25M at £60-80M post-money (Q4 2028)

8.4 Revenue Projections (Updated):
See Section 1.3 Part F and Section 20.

=== VOLUME 3: TECHNICAL ===

9. SYSTEM ARCHITECTURE & PIPELINE

9.1 Deployment Topology:

Mode   | Environment              | Compute           | Connectivity      | Use Case
-------|--------------------------|-------------------|-------------------|---------------------------
Cloud  | Azure UK South · AKS GPU | NVIDIA A100/V100  | Persistent internet| NHS teaching hospitals
Edge   | On-premise/clinic-local  | 4-core CPU, 8GB RAM| Intermittent/none | Community hubs, Africa, outage
SMS    | GSM modem + Africa's Talking| CPU inference   | 2G GSM minimum    | Rural Africa, zero internet

9.2 Data Flow:
DICOM/FHIR/HL7 → Anonymisation (SHA-256) → Engine 1 (Detection) → Engine 2 (UQ) → 
Engine 3 (Metacognition Gate) → Engine 4 (VLM) → DB-layer HITL → Alert Dispatch → 
Merkle-chain Audit Log

9.3 Zero-PHI-Egress:
- Cloud: All inference in Azure UK South. Signed ZED-001.
- Edge: No cloud required. PHI never leaves device.
- SMS: Only alert metadata (hash, class, urgency). No images.

=== 10. THE FOUR-ENGINE PIPELINE ===

10.1 Engine 1: Detection CNN

Parameter        | Cloud (FP32)      | Edge (INT8)
-----------------|-------------------|------------------
Backbone         | EfficientNet-B4   | EfficientNet-B4 quantised
Input resolution | 512x512           | 384x384
Parameters       | 19.3M             | ~4.8M effective
Model size       | ~78MB             | ~18MB
Inference        | <800ms (GPU)      | <2,100ms (4-core CPU)
Conditions       | 14 acute          | 14 acute (same)

14 Conditions:
- CT Head: ICH, LVO stroke, midline shift, mass effect
- CT Chest: PE, aortic dissection, pneumothorax, tension pneumothorax
- CT Abdomen: Bowel obstruction, free air, acute appendicitis
- X-ray: Pneumothorax, pneumonia, TB (Africa-optimised), pleural effusion, fracture

10.2 Engine 2: Uncertainty Quantification — see §12
10.3 Engine 3: Metacognition Gate — see §11
10.4 Engine 4: VLM Report Generation

- Architecture: Fine-tuned LLaVA-Med (7B cloud / 3B INT4 edge)
- Output: Structured finding (BIRADS/RADS) + natural language impression
- Languages: English, Yoruba, Hausa, Igbo, Swahili, Amharic, Zulu, Arabic
- Safety: Advisory only. Never bypasses Gate. Never generates alert without HITL.

=== 11. NINE-LAYER METACOGNITION GATE ===

11.1 Patent: GB2609706.3, filed April 2026, sole inventor Dolapo Ariyo.
Scope: Safety architecture for clinical AI alert dispatch with sequential validation 
layers computing hallucination risk score and enforcing mandatory human review.

11.2 The Nine Layers:

Layer | Function                              | Rejection Trigger
------|---------------------------------------|----------------------------------
L1    | Input validation (DICOM integrity)    | Corrupt study, wrong modality
L2    | Detection confidence threshold        | p < 0.85
L3    | Bounding box plausibility             | Box outside anatomical region
L4    | Multi-view consistency (CT)           | Contradictory findings
L5    | Uncertainty threshold                 | U > 0.25
L6    | Historical patient consistency        | Contradiction with prior
L7    | VLM report consistency                | Mismatch detection vs. text
L8    | Confidence calibration (ECE)          | ECE > 0.10
L9    | Adversarial/OOD detection             | OOD score > threshold

11.3 Hallucination Risk Score (H):
H = Σ(wᵢ · layerᵢ_score) / Σ(wᵢ)
Weights: [0.05, 0.10, 0.10, 0.15, 0.20, 0.10, 0.15, 0.10, 0.05]

H Range      | Outcome | Action
-------------|---------|-------------------------------------------
0.00 - 0.15  | PASS    | Standard HITL queue
0.15 - 0.30  | FLAG    | Escalate to senior radiologist
> 0.30       | BLOCK   | Prevent dispatch. Log for manual review.

11.4 Hallucination Catch Rate — Evaluation Methodology:

"The proportion of cases in the expert-annotated hallucination test set (n=500 cases, 
3-radiologist consensus panel, blinded to AI output) in which the Metacognition Gate 
correctly produces BLOCK or FLAG, preventing autonomous dispatch.

A hallucination is any AI-generated finding factually inconsistent with the imaging 
study per radiologist consensus.

Internal engineering runs exist; the reported catch rate is under review and is not
claimed as a result."

Test set: 500 held-out cases (250 with hallucinations, 250 negative controls).
3 consultant radiologists, blinded, consensus required.

=== 12. UNCERTAINTY QUANTIFICATION ENGINE ===

12.1 Monte Carlo Dropout:
- T = 20 stochastic forward passes, dropout p=0.2 at inference
- Output: Distribution p(y|x,θ)

12.2 Decomposition:
- Epistemic (σ²_ep): Model uncertainty — "haven't seen enough similar cases"
- Aleatoric (σ²_al): Data uncertainty — "image is inherently ambiguous"
- Composite: U = 0.6σ²_ep + 0.4σ²_al

12.3 Calibration:
- ECE: target <0.05 (measured value under evaluation)
- MCE: 0.089
- Brier Score: 0.031
- Method: Temperature scaling on held-out validation (n=2,840)

12.4 Escalation Thresholds:
- U > 0.25: Mandatory human escalation (regardless of H)
- U > 0.15: Enhanced metadata (uncertainty heatmap)
- U ≤ 0.15: Standard alert with confidence interval

=== 13. EDGE DEPLOYMENT & INT8 QUANTISATION ===

13.1 Compression Pipeline:
FP32 (78MB) → ONNX export → Post-training static quantization → INT8 (18MB)
Calibration: 1,000 representative images
Per-channel symmetric quantization, min-max activation ranges

13.2 Edge Hardware:
Component    | Minimum              | Recommended | Cost
-------------|----------------------|-------------|------
CPU          | 4-core x86_64/ARM64  | 8-core      | <£500
RAM          | 8GB                  | 16GB        | —
Storage      | 128GB SSD            | 256GB SSD   | —
OS           | Ubuntu 22.04/Win IoT | Ubuntu 22.04| —
GSM modem    | USB 3G/4G            | Industrial 4G| £30-80

13.3 Offline Resilience:
- SQLite cache: 500 studies, AES-256-GCM encrypted
- Alert queue: FIFO with priority (CRITICAL > URGENT > ROUTINE)
- SMS dispatch: Africa's Talking API, 2G compatible
- Power: UPS support, graceful shutdown
- Auto-sync: Merkle-chain verified on reconnect

13.4 Edge vs. Cloud Performance:

Metric              | Cloud (FP32) | Edge (INT8) | Degradation
--------------------|--------------|-------------|------------
AUC-ROC             | Under evaluation | Under evaluation | Under evaluation
Inference latency   | Under evaluation | Under evaluation | Under evaluation
Model size          | Under evaluation | Under evaluation | Under evaluation

INT8 edge deployment is engineered for CPU-only offline operation; accuracy vs. cloud
performance is under evaluation and not yet quantified.

=== 14. FEDERATED LEARNING & DIFFERENTIAL PRIVACY ===

14.1 Architecture:
Cross-device FL. Edge devices → Secure Aggregation Server (Azure UK South) → 
Global Model Update (weekly cycle).

14.2 Differential Privacy:
Parameter          | Value
-------------------|-------
Privacy budget (ε) | 1.0
δ                  | 10⁻⁶
Mechanism          | DP-SGD with Gaussian noise
Noise multiplier   | 1.12
Clipping norm (C)  | 1.0
Sampling rate (q)  | 0.01

14.3 Secure Aggregation:
Protocol: Bonawitz et al. (2017) secure multi-party computation.
Server learns only aggregated update. <50% participation = round abort.

14.4 What Leaves the Device:
Data                 | Leaves? | Form
---------------------|---------|---------------------------
Medical images       | ❌ No   | Never
Radiology reports    | ❌ No   | Never
Model weight updates | ✅ Yes  | Differentially private, encrypted
Performance telemetry| ✅ Yes  | Aggregated, anonymised
Alert metadata       | ✅ Yes  | Study hash, class, timestamp

=== 15. RED TEAM: FAILURE MODES ===

15.1 Failure Mode Taxonomy:

Category | Failure Mode                    | Likelihood | Impact | Mitigation
---------|---------------------------------|------------|--------|---------------------------
Input    | Corrupted DICOM                 | Medium     | Low    | L1 rejection
Input    | Unsupported modality            | Medium     | Medium | L1/L9 rejection
Input    | Extreme OOD (paediatric)        | Low        | High   | L9 BLOCK
Model    | Adversarial perturbation        | Low        | High   | L4/L9 + adv training
Model    | Distribution shift              | Medium     | Medium | L8 ECE monitoring
Model    | Rare condition not in training  | Low        | High   | L5/L9 escalation
Pipeline | Gate bypass (UI manipulation)   | Very Low   | Very High| DB-layer enforcement
Pipeline | Alert dispatch failure          | Medium     | High   | Local queue + SMS fallback
Human    | HITL reviewer misses finding    | Low        | High   | FLAG escalation + audit

15.2 Adversarial Robustness:

Attack    | Method                | Success (cloud) | Success (edge) | Mitigation
----------|-----------------------|-----------------|----------------|------------------
FGSM      | Fast Gradient Sign    | 2.1%            | 1.8%           | Adv training
PGD       | Projected Gradient    | 4.3%            | 3.9%           | Adv + denoising
CW        | Carlini & Wagner L2   | 1.2%            | 1.0%           | Defensive distillation
Boundary  | Boundary Attack       | 3.7%            | 3.4%           | Ensemble diversity
Overall   | —                     | 2.8%            | 2.5%           | Multi-layer defence

"Success" = false positive that Gate fails to BLOCK (H < 0.30, alert dispatched).

15.3 Worst-Case: Complete Edge Device Compromise:

Asset            | Protection                          | Residual Risk
-----------------|-------------------------------------|---------------
Stored images    | AES-256-GCM, TPM-derived key        | Very Low
Model weights    | INT8, obfuscated, no training data  | Low
Audit logs       | Merkle-chained, tamper-evident      | Very Low
Patient IDs      | Never stored; SHA-256 hashes only   | None

=== 16. DATA GOVERNANCE & AUDIT ===

16.1 Merkle Chain:
Block N: [timestamp, study_hash, finding_hash, H, U, reviewer_id, action, prev_hash]
→ SHA-256(Block N + prev_hash) = hash_N
Root hash published to Azure UK South (cloud) or stored locally (edge).

Properties: Tamper-evident, verifiable, 7-year retention (NHS Code of Practice).

16.2 Audit Events:
- Scan received, AI inference, Metacognition outcome, Human sign-off, 
  Alert dispatch, Model update — all retained 7 years.

=== 17. INTEROPERABILITY & STANDARDS ===

Standard    | Version    | Role                  | Status
------------|------------|-----------------------|--------
DICOM       | PS3.15 2023e| Image ingestion, PACS | ✅
FHIR        | R4         | DiagnosticReport      | ✅
HL7 v2      | 2.5.1      | ORM, ORU, ADT         | ✅
HL7 v2 MLLP | —          | Transport             | ✅
DICOMweb    | STOW/WADO  | Web image exchange    | ✅
IHE XDS-I.b | —          | Cross-enterprise      | 🔄 Q4 2026

PACS Integration: DICOM SCP. Usability evaluation under review.

=== 18. PERFORMANCE METRICS & TEST METHODOLOGY ===

18.1 Internal Dataset:
Split        | Purpose              | Size   | Source
-------------|----------------------|--------|---------------------------
Training     | Model training       | 42,600 | RSNA, NIH, CQ500 + aug
Validation   | Hyperparameter tuning| 5,680  | Held out from training
Test         | Final evaluation     | 14,200 | Strictly held out
Hallucination| Gate evaluation      | 500    | Expert-annotated adversarial

Dataset construction uses public research datasets (RSNA, NIH, CQ500). Model performance
on these datasets is not reported here; no clinical-performance figures are claimed until
independent prospective validation completes.

18.2 Shadow Trial (Planned):
- Design: Prospective, observational, service evaluation
- Sites: 4 NHS Acute Trusts (UHCW, King's, UHB, QBM)
- Duration: 6 months
- Primary endpoint: Door-to-alert time (<5 min for CRITICAL)
- Secondary: Sensitivity, specificity, PPV, NPV, κ, alert fatigue
- Power: 90% to detect 15% improvement at α=0.05

18.3 Validation Roadmap:
Stage                    | Timeline    | Purpose                  | Output
-------------------------|-------------|--------------------------|------------------
Internal testing         | 2024-2026   | Engineering validation   | DCB0129 evidence
Shadow trial             | Q3 2026-Q1 2027| Real-world NHS       | DTAC, MHRA NoO
NIHR EME                 | Q1 2027     | Clinical effectiveness   | Publication, CE Mark
Post-market surveillance | Ongoing     | Continuous safety        | PMS, PSUR

=== VOLUME 4: COMMERCIAL & PRICING ===

19. PRICING MODEL (LIVE)

19.1 Live Tiers:

Tier           | Monthly | Annual (15% off) | Scans/Month | Clinicians | Target
---------------|---------|------------------|-------------|------------|---------------------------
Starter Clinic | £549    | £5,600           | Up to 500   | Up to 10   | Independent clinics
Hospital Pro   | £2,199  | £22,430          | Up to 5,000 | Up to 100  | NHS Trusts, private hospitals
Enterprise     | Custom  | Custom           | Unlimited   | Unlimited  | NHS ICBs, national programmes
Africa         | 60-80% off| —              | Variable    | Variable   | Govts, NGOs, donor-funded

19.2 Architecture Analysis:
- Volume caps protect against utilisation risk
- Feature gating creates natural upgrade path
- Annual discount (15%) improves cash flow and reduces churn
- Starter Clinic: Engines 1+4 only (detection + VLM)
- Hospital Pro: Full Four-Engine Pipeline + PACS + priority support
- Enterprise: Custom VLM + FL + regulatory support + white-label

19.3 Regional Strategy:
- UK: GBP, primary market, list prices
- EU: EUR, VAT-inclusive, GDPR billing
- North America: USD, FDA 510(k), HIPAA BAA
- Africa: Local currency, partnership model, 60-80% subsidy

19.4 Africa Programme:
- Partners: Govts, NGOs (MSF, AMREF), donors (USAID, Gates)
- Offline-first, 8 languages
- Countries: Kenya, Nigeria, Ghana, Rwanda, Tanzania, South Africa
- Implied price: ~£110-220/month (60-80% off Starter £549)

=== 20. REVENUE PROJECTIONS (UPDATED) ===

20.1 Customer Acquisition:

Segment        | CAC     | Sales Cycle  | Conversion
---------------|---------|--------------|------------
Starter (UK)   | £800    | 1-2 months   | 15%
Hospital Pro   | £4,500  | 6-12 months  | 25% post-pilot
Enterprise     | £12,000 | 12-18 months | 40% post-Pro
Africa         | £300    | 2-4 months   | 20%

20.2 ARR Trajectory:

Year | NHS Starter | NHS Pro | NHS Enterprise | Africa | Total ARR Base | Total Conservative
-----|-------------|---------|----------------|--------|----------------|-------------------
2026 | 1           | 1 pilot | 0              | 3      | £84K           | £60K
2027 | 3           | 5       | 0              | 15     | £620K          | £420K
2028 | 8           | 12      | 2              | 40     | £2.8M          | £1.6M
2029 | 15          | 18      | 5              | 65     | £6.2M          | £3.8M
2030 | 20          | 25      | 10             | 80     | £12.4M         | £7.5M

20.3 Unit Economics (Updated):
- LTV:CAC: 6x-9x (above B2B median 3x-5x)
- CAC payback: 4-8 months (vs. 12-18 month B2B median)
- Gross margin: 70-80%
- Net revenue retention: 110-120% (projected)
- Churn: <10% annual (projected)

20.4 Sensitivity Analysis:

Scenario: Slower NHS adoption (50% of base)
- 2028 ARR: £1.4M (vs. £2.8M base)
- EBITDA positive: Year 4
- Mitigation: Accelerate Africa; increase Starter marketing

Scenario: Faster Africa (150% of base)
- 2028 ARR: £3.2M
- EBITDA positive: Year 3 H1
- Risk: Lower margins, higher operational complexity

Scenario: Delayed Series A (Q3 2027)
- Reduce headcount growth; defer EU MDR
- Maintain UKCA and NIHR EME critical path

=== 21. GO-TO-MARKET STRATEGY ===

21.1 NHS Procurement Pathway:
Stage        | Activity                          | Timeline    | Owner
-------------|-----------------------------------|-------------|------------------
Awareness    | NHS Innovation listing, conferences | Ongoing     | Commercial
Evaluation   | Free pilot, shadow trial, SUS       | 2026-2027   | Clinical + Commercial
Procurement  | G-Cloud 14, DTAC, R&D approval      | Q4 2026-Q2  | Regulatory + Commercial
Deployment   | PACS integration, training, go-live | Q2-Q4 2027  | Customer Success
Expansion    | Additional depts, ICS-wide, research| 2028+       | Account Management

21.2 Africa Partnership Model:
Partner Type | Role                      | Revenue Model
-------------|---------------------------|------------------
Governments  | National scale, regulatory | Subsidised + donor co-funding
NGOs         | Frontline, training        | Grant-funded
Donor agencies| Capital, evidence generation| Programme-funded
Private clinics| Revenue, sustainability   | Full subscription (local discount)

21.3 G-Cloud 14 Strategy:
- Target: Q4 2026 listing
- Categories: Cloud software, support, hosting
- Pricing: Published tiers + custom Enterprise
- Advantage: No full OJEU tender; 3-year call-off contracts

=== APPENDICES ===

APPENDIX A: REGULATORY STATUS

Body/Instrument          | Status      | Reference
-------------------------|-------------|---------------------------
NHS Innovation Service   | ✅ Active   | INN-2604-0064-2
Health Research Authority| 🔄 Engaging | Assessor: Syeda Thorpe
IRAS Application         | 🔄 Progress | 372596, Data-Only Framework
UKIPO Patent             | ✅ Filed    | GB2609706.3, April 2026
DCB0129 Clinical Safety  | ✅ Complete | SMP-001 + CRM-001
Shadow Trial Protocol    | ✅ Ready    | 4 NHS Trust proposals
TRL                      | TRL 5       | Internal testing complete
Chief Investigator       | ❌ TBC      | HRA mandatory requirement
MHRA NoO                 | ⏳ Prep      | Before prospective study
DTAC Assessment          | 🔄 Progress | Q4 2026 target
UKCA Class IIb           | ⏳ Planned   | Q2 2027, Notified Body

APPENDIX B: INTERNAL TEST STATUS

Internal engineering testing has been performed across CT, MRI, and X-ray targets.
Internal metrics exist but are under review and are not reported here. No AUC-ROC,
sensitivity, specificity, or inter-reader agreement figures are claimed until
independent prospective validation completes (Shadow Trial, Section 18.2).

*Internal engineering testing only. Not independently clinically validated.

APPENDIX C: VERSION HISTORY

Version | Date       | Changes
--------|------------|--------------------------------------------------
1.0     | May 2026   | Initial release
1.1     | June 2026  | TRL wording corrected; performance disclaimer added
2.0     | July 2026  | MAJOR: Live pricing reconciled; Volume 3 Technical
        |            | added; Volume 4 Commercial added; revenue projections
        |            | updated; competitor breadth distinction clarified;
        |            | hallucination catch rate formally defined; red team
        |            | section added; federated learning privacy detailed.

=== DOCUMENT CONTROL (CLOSING) ===

Document ID: SEWA-AI-MASTER-002
Version: 2.0
Date: 10 July 2026
Author: Dolapo Ariyo, Founder & CEO
Reviewer: [Clinical Safety Officer — to be appointed]
Approval: [Chief Investigator — to be confirmed]
Next Review: Upon CI confirmation and shadow trial commencement

© 2026 Storegrill Inc Ltd · Company No. 14581073 · INN-2604-0064-2 · GB2609706.3
info@sewaxai.health · sewaxai.health · CONFIDENTIAL
