# SEWA AI — Investor Pitch Deck (12 Slides)
**Clinical intelligence and safety assurance for AI-assisted medical diagnosis**
*“From hours, to seconds.”*
Starting with radiology across the UK and Sub-Saharan Africa.

---

## Slide 1: Cover / Title
- **Company**: Storegrill Inc Ltd (trading as SEWA AI) — Registered in England & Wales (No. 14581073)
- **Founder & CEO**: Dolapo Ariyo (Sole Inventor, UK Patent Application GB2609706.3)
- **Contact**: sewaxai.health | info@sewaxai.health | May 2026
- **Key Metrics Highlight**: 1.84s door-to-alert | 14 conditions detected | 0.972 ICH AUC-ROC | GB2609706.3 UK Patent Filed
- **Confidentiality Notice**: Strictly Confidential · For Qualified Investors Only

---

## Slide 2: The Clinical Problem
**Radiology is the bottleneck of modern medicine — and it is getting worse.**

- **NHS — A System at Breaking Point**:
  - 29% consultant radiologist vacancy rate (RCR, 2025)
  - 1.5 million imaging reports backlogged annually
  - Median urgent scan reporting time: 4.2 hours
  - 1 in 20 urgent scans delayed or missed
  - Stroke survival: every 15-minute delay = 1 million neurons lost
  - £1.9B annual NHS diagnostic backlog cost across 7.4M annual scans
- **Africa — A Crisis at Scale**:
  - < 0.4 radiologists per million population (WHO minimum: 20 per million — a 98%+ deficit)
  - Patients travel 300km+ for a single scan read
  - TB, pneumonia, fractures undetected for days or weeks; preventable deaths from diagnostic delay
  - 25,000+ African clinics lacking AI access; M-Pesa / Paystack payment rails ready
- **Existing AI — Inadequate**:
  - Single-condition tools (stroke only, or chest only)
  - No uncertainty quantification — uninterpretable outputs
  - No hallucination detection before alert dispatch
  - Cloud-dependent — offline environments unsupported
  - No structured report generation in local languages

---

## Slide 3: The SEWA AI Solution
**A safety-first clinical intelligence layer between AI inference and clinical action.**
The world’s first sovereign, multi-engine clinical AI platform with built-in uncertainty quantification and metacognitive safety gating.

- **Engine 01: Triage Engine** (EfficientNet-B4 · 380–620ms): Detects 14 acute conditions across CT, MRI, and X-ray. Produces Grad-CAM heatmaps and SHAP feature attribution alongside every finding. AUC-ROC 0.972 for ICH.
- **Engine 02: Uncertainty Engine** (MC-Dropout ×20 · 280ms): Quantifies epistemic and aleatoric uncertainty via 20 stochastic forward passes. Mandatory human escalation if composite score exceeds 0.25 — regardless of stated confidence.
- **Engine 03: VLM Report Generator** (BioMedCLIP + Llama-3 LoRA · 900ms): Generates structured 4-section radiology reports in 8 languages. Radiologist-editable. Every edit captured as a training signal for continuous learning.
- **Engine 04: Metacognition Gate** (9-layer safety system · 120ms): Autonomous safety audit of every AI output before clinical alert dispatch. Hallucination risk score $H \in [0,1]$. $H > 0.30 \rightarrow$ BLOCK. No finding ever silently discarded.

*Pipeline metrics: Total door-to-alert: 1.84 seconds median · All processing within Azure UK South · Zero PHI egress · Mandatory radiologist sign-off enforced at database layer.*

---

## Slide 4: Why SEWA AI Is Different (Comprehensive Capability Matrix)
No competitor combines multi-condition triage, uncertainty quantification, metacognition, VLM reports, and offline edge.

| Capability | SEWA AI | Annalise.ai | Viz.AI | Aidoc | Qure.ai |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Conditions detected** | **14** | 12 | 3 | 8 | 2 |
| **Uncertainty quantification** | **✓ MC-Dropout** | ✗ | ✗ | Partial | ✗ |
| **Metacognition / safety gate** | **✓ 9-layer** | ✗ | ✗ | ✗ | ✗ |
| **VLM report generation** | **✓ 8 languages** | ✗ | ✗ | ✗ | ✗ |
| **Hallucination detection** | **✓ 96% catch** | ✗ | ✗ | ✗ | ✗ |
| **Offline / edge deployment** | **✓ INT8 CPU** | ✗ | ✗ | ✗ | ✗ |
| **Africa deployment** | **✓ GSM SMS** | ✗ | ✗ | ✗ | Partial |
| **Federated learning (DP)** | **✓ $\varepsilon=1.0$** | ✗ | ✗ | ✗ | ✗ |
| **FHIR R4 native** | **✓** | Partial | Partial | ✗ | ✗ |
| **Zero PHI egress** | **✓ Signed** | ✗ | ✗ | ✗ | ✗ |
| **UK Patent filed** | **✓ GB2609706.3** | ✗ | US only | EP only | IN only |
| **Price transparency** | **✓ Published** | ✗ | ✗ | ✗ | ✗ |

---

## Slide 5: Technology & Intellectual Property
**Defensible architecture. Filed patent. No competitor combines all four innovations.**

- **UK Patent Filed**: GB2609706.3 · UKIPO · March 2026 · Sole Inventor: Dolapo Ariyo
  - *Title*: Sovereign Multi-Engine Clinical AI Platform for Automated Diagnostic Triage and Safety Assurance
  - *Claims*: 10 claims covering 4-engine orchestration, metacognition gate, Federated Learning with Differential Privacy, sovereign deployment, and stroke code activation.
- **FTO Search**: April 2026 — no blocking prior art identified in 4 comparator patent families.
- **Software Copyright**: ~82,200 lines of original code protected under CDPA 1988 (Storegrill Inc Ltd).
- **Trade Secrets**: 2,400-pattern hallucination lexicon, MC-Dropout calibration methodology, FL DP parameters.
- **Trademarks**: SEWA AI — UK + EU applications pending Q3 2026.
- **PCT Filing**: Planned Q3 2026 — 153 countries within 12-month priority window.

---

## Slide 6: Validation & Clinical Pathway
**Pre-revenue. Post-validation. NHS system engaged. Patent filed. HRA actively supporting.**

- **Engineering & Retrospective Evaluation** (All 14,200 scans):
  - ICH Detection (CT Head, $n=2,847$): AUC-ROC 0.972
  - PE Detection (CT Chest, $n=1,203$): AUC-ROC 0.961
  - LVO Stroke (CT Angio, $n=1,640$): AUC-ROC 0.958
  - Pneumothorax (X-ray, $n=889$): AUC-ROC 0.979
  - TB (Africa cohort, $n=3,201$): AUC-ROC 0.944
  - Cohen's $\kappa$ (AI vs Radiologist 1): 0.87 (Radiologist 1 vs 2: 0.84)
- **Clinical Validation Pathway (Regulatory & Governance)**:
  - NHS Innovation Service registered (INN-2604-0064-2 — Active)
  - Health Research Authority (HRA) — Engaging (Assessor: Syeda Thorpe, May 2026)
  - DCB0129 Clinical Safety Case complete (SMP-001 + CRM-001; CSO role designated)
  - IRAS Application — in progress (Device clinical investigation category; MHRA Devices included)
  - Shadow Trial Protocol ready (Non-interventional, Service Evaluation classification, zero NHS cost)
  - NHS Trust site proposals submitted (UHCW, King’s College, UHB, MFT)
  - MHRA Notice of No Objection — Application in preparation (required before prospective study)

---

## Slide 7: Market Opportunity & Beachhead
**Two massive, underserved markets. One platform. Entirely different entry barriers.**
- **TAM**: $22B global medical imaging AI market by 2030.
- **SAM**: £4.1B addressable acute radiology triage & reporting market across UK and Commonwealth.
- **SOM**: £28M initial NHS acute trust beachhead (Year 1–3 ARR targets).
- **NHS England Segment**: 220 NHS trusts with radiology departments, 7.4M annual imaging studies, 29% radiologist vacancy rate, £1.9B backlog cost, G-Cloud 14 and DTAC procurement routes mapped.
- **Sub-Saharan Africa Segment**: 1.4B population, <2,000 radiologists (0.4 per million density), 25,000+ clinics lacking AI access, edge-first offline model, M-Pesa / Paystack payment rails ready.

---

## Slide 8: Business Model & Pricing Tiers
**Three revenue streams. SaaS subscription core. Per-scan transactional. Referral network commission.**

- **Stream 1: SaaS Subscription Core**:
  - *Africa Edge*: £149/mo (£1,490/yr) — 1,200 scans, INT8 offline triage, GSM SMS alerts, SQLite cache.
  - *Starter*: £499/mo (£4,990/yr) — 2,400 scans, Triage + Uncertainty, basic reports, email alerts.
  - *Professional* (Most Popular): £1,299/mo (£12,990/yr) — 15,000 scans, all 4 engines, VLM reports, FHIR R4 + HL7, WhatsApp alerts.
  - *Enterprise*: £3,499/mo (£34,990/yr) — 60,000 scans, Federated learning, custom SLA, dedicated CSM, on-prem option.
  - *Enterprise+*: Custom — Unlimited scans, white-label, NHS G-Cloud, dedicated SRE, national rollout.
- **Stream 2: Per-Scan Transactional**: £1.29–£3.49/scan overage and pay-as-you-go volume.
- **Stream 3: Referral Network Commission**: 10% commission on teleradiology network handoffs.
- **Stream 4: API Licensing**: EMR and hospital information system integration licensing (Year 3 onwards).

---

## Slide 9: Go-To-Market Strategy
**UK as global HQ. NHS as clinical proof engine. Africa as scale multiplier. Series A unlocks US.**

- **Phase 1 (2026) — NHS Validation**: Shadow trials at 2 NHS Trusts (UHCW, King's, UHB, MFT); DTAC assessment & G-Cloud 14 listing; MHRA NoO + REC approval; NIHR EME grant submission; 2 paying NHS pilots (£84K–£180K ARR).
- **Phase 2 (2027) — NHS Scale + Africa**: 8 paying NHS trusts via G-Cloud; 3 African clinic deployments via M-Pesa/Paystack; NIHR EME award (if successful); UKCA Class IIb certification; ARR target £820K–£1.2M.
- **Phase 3 (2028) — Series A + EU/US**: 22 NHS trusts + ICS framework contracts; 25 African clinics with live federated learning network; EU MDR CE Mark & FDA 510(k) pre-submission; Series A fundraise (£5–8M); ARR target £3.4M–£5.2M.
- **Phase 4 (2029–30) — Global Scale**: US market entry via FDA 510(k); 40+ NHS trusts; 65 African clinics; EMR API licensing; WHO/Government export API; ARR target £7.1M–£10.8M.

---

## Slide 10: The Team & Governance
**Deep clinical AI expertise. Regulatory-first. Mission-driven. Built for the NHS and Africa.**

- **Dolapo Ariyo — Founder & CEO** (Sole Inventor, GB2609706.3):
  - Architect of SEWA AI's four-engine pipeline, federated learning subsystem, metacognition gate, and sovereign deployment architecture.
  - Full-stack technical lead (Node.js, React Native, Python FastAPI, PyTorch, Azure AKS, Terraform).
  - Founded Storegrill Inc Ltd (2023) — UK-registered, Nigeria-operating, globally-minded.
  - Direct relationships with NHS Innovation Service (INN-2604-0064-2) and HRA (Syeda Thorpe).
- **Andrew Metcalfe — Strategic Clinical Research Advisor**:
  - Clinical investigation strategy, NHS research pathways, evidence generation, health technology evaluation, clinical trial strategy.
- **Planned Post-Funding Leadership (Target Q2 2026)**:
  - Chief Medical Officer (£120–160K): Consultant Radiologist with NHS leadership experience (FRCR + MD, former MHRA clinical reviewer/NHS CIO).
  - Clinical Safety Officer (£90–120K): 10+ years medical device regulatory experience (EU MDR, ISO 13485, IEC 62304, DCB0129).
  - ML Engineers (Triage & VLM/NLP) (£70–95K).
  - Africa Programme Lead (£65–85K): Deep knowledge of sub-Saharan healthcare systems and NGO partnerships (AMREF, MSF, PIH).

---

## Slide 11: Financial Projections (5-Year Summary)
**Conservative base case. EBITDA positive Year 3 H2. Series A at Year 3. 5-year ARR target: £14.6M.**

| Metric | Year 1 (2026) | Year 2 (2027) | Year 3 (2028) | Year 4 (2029) | Year 5 (2030) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **NHS Trusts (paying)** | 2 pilots | 8 | 22 | 38 | 55 |
| **African Clinics** | 3 | 15 | 40 | 65 | 80 |
| **ARR (Conservative)** | £84K | £560K | £2.1M | £4.8M | £9.2M |
| **ARR (Base Case)** | **£120K** | **£820K** | **£3.4M** | **£7.1M** | **£14.6M** |
| **ARR (Upside)** | £180K | £1.2M | £5.2M | £10.8M | £22.4M |
| **Total Costs** | £800K | £980K | £3.2M | £4.2M | £7.8M |
| **EBITDA** | **-£680K** | **-£160K** | **+£200K** | **+£2.9M** | **+£6.8M** |

*Key Scale Metrics*: LTV:CAC 9.7–13.7× | Gross Margin 78–85% | Payback Period 2.4–5.2 months | EBITDA positive in Year 3 H2 | Series A target Q1 2027 (£5–8M).

---

## Slide 12: The Ask & GEP Alignment
**Seed round: £650,000. UK as global HQ. GEP as the bridge from Lagos to London.**

- **Use of Funds (£650,000 Seed / 18-month runway)**:
  - Staff (direct labour) — £403,000 (62%): CMO, CSO, 2× ML Engineers, Africa Lead
  - Cloud infrastructure — £94,000 (14%): Azure AKS, GPU nodes, FHIR, monitoring
  - Clinical validation — £109,000 (17%): NHS datasets, REC, DTAC, DCB0129, UKCA
  - Africa deployment — £34,000 (5%): Edge devices, GSM, 3 clinic deployments
  - Legal / IP — £38,000 (6%): PCT patent, trademarks, FTO, NDAs
  - *Match funding*: £331,220 from seed investment + early revenue.
- **UK Global Entrepreneur Programme (GEP) Alignment**:
  - *Talent outside UK*: Dolapo Ariyo operating from Lagos, Nigeria, with active UK NHS innovation engagement.
  - *Genuine Innovation*: First-in-class metacognitive safety gate and uncertainty quantification.
  - *UK as Base*: Storegrill Inc Ltd registered in England (No. 14581073); NHS clinical proof engine; UK South Azure data sovereignty.
  - *Impact*: Reduces diagnostic delays from 4.2 hours to 1.84 seconds; addresses 98% radiologist deficit in Africa; 38.9 $tCO_2e$ saved per NHS trust per year.
