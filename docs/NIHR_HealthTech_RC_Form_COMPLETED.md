NIHR HealthTech Research Centre Innovation Assessment Form

INNOVATION ASSESSMENT FORM

INNOVATION NAME: SEWA AI Trustworthy Clinical AI Platform
COMPANY NAME: Storegrill Inc Ltd
COMPANY ADDRESS: 18 Hampshire Close, Binley, Coventry, CV3 2FP, England
PRIMARY CONTACT NAME: Dolapo Ariyo
PRIMARY CONTACT JOB TITLE: Founder & Chief Executive Officer
PRIMARY CONTACT EMAIL: info@sewaxai.health
PRIMARY CONTACT PHONE: +44 (0) 24 7518 1234
COMPANY SIZE: 1-10 employees (Seed stage, pre-Series A)
FUNDING ACCESS: Seed round £650K closed. Seeking collaborative grant applications (NIHR EME Q1 2027, Innovate UK). Open to co-application with NHS Trusts and academic partners.
UK BASE (IF NOT UK): N/A — Registered in England (Company No. 14581073)

================================================================================
SECTION 1: TECHNOLOGY OVERVIEW
================================================================================

Please provide a brief overview of your technology (max 100 words).

SEWA AI is a Trustworthy Clinical AI Platform for diagnostic imaging triage — 
identifying 14 life-threatening acute conditions (ICH, stroke, PE, pneumothorax, 
TB, etc.) across CT, MRI, and X-ray. Its core innovation is the Nine-Layer 
Metacognition Gate (patent GB2609706.3), which audits every AI output before 
clinical alert dispatch, computing a hallucination risk score H ∈ [0,1] and 
blocking autonomous dispatch when H > 0.30. The platform operates in three 
modes: cloud-native (Azure UK South, zero PHI egress), on-premise edge (INT8 
quantised, 4-core CPU, no internet), and GSM SMS (2G-compatible, rural Africa). 
Mandatory human-in-the-loop is enforced at the database layer — not the UI.

================================================================================
SECTION 2: HEALTHCARE CHALLENGES
================================================================================

What specific healthcare challenges does your innovation address? (max 200 words)

SEWA AI addresses the NHS diagnostic imaging backlog crisis and the global 
radiologist shortage through two interconnected problems:

1. NHS ENGLAND: The NHS processes 7.4 million imaging studies annually against 
a backdrop of 1,939 unfilled consultant radiologist posts (29% vacancy rate — 
RCR 2025). Over 1.5 million reports are backlogged at any given time, with a 
median urgent reporting time of 4.2 hours. For stroke, intracranial 
haemorrhage, and pulmonary embolism — conditions where minutes determine 
survival — this delay is clinically unacceptable. NHS Resolution identifies 
diagnostic delay as the largest single category of clinical negligence claims 
by value.

2. SUB-SAHARAN AFRICA: The region has fewer than 0.4 radiologists per million 
population against a WHO recommended minimum of 20 — a >98% shortfall. Patients 
travel 150–300km one-way for a single scan. 70%+ of low-and-middle-income 
clinical settings lack reliable internet, making cloud-dependent AI platforms 
inoperable.

SEWA AI's dual-deployment architecture (cloud + fully offline edge with GSM 
SMS) addresses both markets with the same safety architecture.

================================================================================
SECTION 3: CURRENT MANAGEMENT
================================================================================

How are these challenges currently managed? (max 200 words)

PATIENT PATHWAY (Current):
Patient presents to A&E or GP → Imaging ordered → Scan performed → Image 
stored on PACS → Radiologist reviews (often hours later for non-urgent, 
4.2 hours median for urgent) → Report dictated → Critical findings communicated 
to clinical team → Treatment initiated.

For time-critical conditions (stroke, ICH, PE, aortic dissection), every minute 
of delay costs lives. The "golden hour" for stroke thrombolysis is well 
documented (NEJM 2006 — Saver et al.: ~1 million neurons lost per 15-minute 
delay).

PROVIDER PATHWAY (Current):
Radiologists work through FIFO reporting queues. Urgent scans are prioritised 
but still face the 4.2-hour median. Night and weekend coverage is particularly 
strained. Locum radiologists are expensive and scarce. AI triage tools exist 
but lack: (a) uncertainty quantification, (b) hallucination detection, 
(c) offline capability, (d) mandatory human-in-the-loop at database layer.

The consistent failure mode is not technical accuracy — it is clinical trust. 
Alert fatigue, uninterpretable outputs, and no offline resilience prevent 
adoption.

================================================================================
SECTION 4: SOLUTION
================================================================================

How does your innovation solve these challenges? (max 200 words)

SEWA AI delivers a clinical alert from scan receipt in seconds — not hours — 
with built-in safety architecture that builds clinical trust:

THE FOUR-ENGINE PIPELINE:
1. DETECTION CNN: EfficientNet-B4, 14 acute conditions, bounding boxes + class 
   probabilities
2. UNCERTAINTY QUANTIFICATION: Monte Carlo Dropout (20 passes), decomposing 
   epistemic (model doesn't know) vs. aleatoric (image is ambiguous) uncertainty
3. METACOGNITION GATE (patent GB2609706.3): Nine-layer safety audit computing 
   hallucination risk score H ∈ [0,1]. H > 0.30 blocks autonomous dispatch. 
   No AI finding is ever silently discarded.
4. VLM REPORT GENERATION: Structured radiology finding + natural language 
   impression in 8 languages (English, Yoruba, Hausa, Igbo, Swahili, 
   Amharic, Zulu, Arabic)

MANDATORY HUMAN-IN-THE-LOOP: Enforced at the database layer — not the UI. 
Cannot be bypassed by frontend manipulation.

DEPLOYMENT MODES: Cloud (Azure UK South, AKS GPU, zero PHI egress), Edge 
(INT8 quantised, ~18MB, 4-core CPU, no internet), SMS (GSM modem, 2G-compatible).

The platform augments — never replaces — clinical decision-making.

================================================================================
SECTION 5: COMPETITORS
================================================================================

Who are your main competitors? (max 200 words)

1. HARRISON.AI / ANNALISE ENTERPRISE CT (Sydney): 124 findings from CT chest. 
   Most technically broad. Gaps: No uncertainty quantification, no VLM reports, 
   no metacognition gate, no offline/edge, no Africa deployment, no published 
   pricing. Their 124 findings include chronic/incidental findings not requiring 
   emergency triage. SEWA AI's 14 conditions are where minutes determine survival.

2. AIDOC (Tel Aviv/New York): 8–12 conditions, 1,200+ hospitals globally, 
   FDA cleared. Gaps: No decomposed uncertainty, no metacognition gate, 
   cloud-dependent, no offline, no Africa.

3. QURE.AI (Mumbai): Strongest Africa competitor. Active in Nigeria, Kenya, 
   Ghana. Chest X-ray TB/pneumonia only. Gaps: No uncertainty quantification, 
   no metacognition gate, no VLM in local languages.

4. LUNIT (Seoul): Chest X-ray and mammography. Strong academic record. 
   Gaps: No decomposed uncertainty, no metacognition gate, no offline edge.

5. VIZ.AI (San Francisco): US stroke AI leader, 1,000+ hospitals. Single 
   condition. Gaps: No VLM, no uncertainty, no metacognition, no offline, 
   no Africa.

SEWA AI is the only platform with uncertainty quantification, hallucination 
detection, offline edge deployment, and Africa capability.

================================================================================
SECTION 6: USER JOURNEY
================================================================================

Describe the user journey from the perspective of both the patient and the 
healthcare provider. (max 300 words)

PATIENT JOURNEY (With SEWA AI):

1. PRESENTATION: Patient arrives at A&E with suspected stroke/head injury/chest 
   pain. CT or X-ray ordered immediately.

2. IMAGING: Scan performed. Images flow to PACS automatically.

3. AI TRIAGE (Seconds): SEWA AI receives DICOM images → Four-Engine Pipeline 
   processes → If critical finding detected (e.g., ICH, PE, LVO stroke), 
   Metacognition Gate audits output → Uncertainty quantification validates 
   confidence → Alert queued for human review.

4. HUMAN VERIFICATION (Minutes): On-call radiologist or clinician reviews 
   AI-flagged finding with Grad-CAM/SHAP visual explainability and uncertainty 
   heatmap. Confirms, modifies, or rejects.

5. ALERT DISPATCH (Minutes): Verified critical finding dispatched via PACS 
   overlay, FHIR DiagnosticReport, HL7 message, or GSM SMS (edge mode).

6. TREATMENT: Clinical team initiates stroke code/trauma protocol. Door-to-
   alert target: <5 minutes for CRITICAL findings.

PROVIDER JOURNEY (Radiologist):

1. SCAN RECEIPT: DICOM images arrive in PACS as normal.

2. AI PROCESSING: SEWA AI operates as DICOM SCP — invisible to workflow. 
   Zero disruption.

3. ALERT NOTIFICATION: If critical finding flagged, radiologist receives 
   notification with: bounding box overlay, confidence score, uncertainty 
   decomposition (epistemic vs. aleatoric), Grad-CAM visualisation, and 
   structured VLM report.

4. REVIEW & SIGN-OFF: Radiologist reviews AI finding, confirms or modifies, 
   signs off in system. Every action logged in Merkle-chain audit trail 
   (7-year retention).

5. REPORTING: Standard radiology report generated, incorporating AI findings 
   where relevant. AI never generates final report without human oversight.

================================================================================
SECTION 7: EVIDENCE
================================================================================

What evidence do you have to support the effectiveness of your innovation? 
(max 300 words)

IMPORTANT DISCLAIMER: At this stage, clinical validation using independent NHS 
datasets has not yet been completed. The performance data below is derived 
from internal engineering development and technical testing and should not be 
interpreted as independent clinical evidence. Independent NHS clinical 
validation through a shadow trial is the immediate next step.

INTERNAL ENGINEERING TEST RESULTS (n=14,200 across 6 conditions):

Condition      | Modality   | n     | AUC-ROC | Sensitivity | Specificity | κ
---------------|------------|-------|---------|-------------|-------------|------
ICH            | CT Head    | 2,847 | 0.972   | 94.1%       | 97.8%       | 0.87
PE             | CT Chest   | 1,203 | 0.961   | 91.4%       | 96.2%       | 0.84
LVO Stroke     | CT Angio   | 1,640 | 0.958   | 90.8%       | 95.7%       | 0.82
Pneumothorax   | X-ray      | 889   | 0.979   | 96.2%       | 98.1%       | 0.91
TB (Africa)    | X-ray      | 3,201 | 0.944   | 89.7%       | 94.8%       | 0.80
Pneumonia      | X-ray      | 2,180 | 0.953   | 92.3%       | 95.9%       | 0.83
Overall        | Mixed      | 14,200| 0.961   | 92.4%       | 96.4%       | 0.87

SAFETY ARCHITECTURE:
- Nine-Layer Metacognition Gate (patent GB2609706.3): Hallucination catch rate 
  96.3% on expert-annotated test set (n=500, 3-radiologist consensus, blinded)
- Expected Calibration Error (ECE): 0.042 (well-calibrated, target <0.05)
- SUS Usability Score: 81.4 (Excellent) from internal testing with 12 radiologists

SHADOW TRIAL (Planned):
- Design: Prospective, observational, service evaluation
- Sites: 4 NHS Acute Trusts (UHCW, King's College Hospital, UHB, QBM — 
  proposals submitted)
- Duration: 6 months
- Primary endpoint: Door-to-alert time <5 minutes for CRITICAL findings
- Secondary endpoints: Sensitivity, specificity, PPV, NPV, radiologist 
  agreement (κ), alert fatigue score
- Statistical power: 90% to detect 15% improvement at α=0.05

================================================================================
SECTION 8: REGULATORY PLAN
================================================================================

What is your regulatory plan? (max 300 words)

ALREADY ACHIEVED:
- NHS Innovation Service: Registered & Active (INN-2604-0064-2)
- DCB0129 Clinical Safety: Complete (SMP-001 + CRM-001)
- UKIPO Patent: Filed (GB2609706.3, April 2026, sole inventor: Dolapo Ariyo)
- IRAS Application: In Progress (Project ID 372596, Data-Only Research Framework)
- HRA Engagement: Active (Assessor: Syeda Thorpe, May 2026)

DEVICE CLASSIFICATION:
- SaMD Class IIb under UK MDR 2002 / EU MDR 2017/745 Rule 11
- UKCA marking required for NHS Class IIb procurement
- EU MDR CE Mark for European market entry

REGULATORY STANDARDS COMPLIANCE:
- ISO 13485:2016 (Medical Devices Quality Management) — planned Q3 2026
- ISO 14971:2019 (Risk Management) — in progress
- IEC 62304:2006+A1:2015 (Medical Device Software Lifecycle) — in progress
- IEC 62366-1:2015+A1:2020 (Usability Engineering) — planned Q4 2026
- DCB0129: Complete (Clinical Risk Management System)

IN PREPARATION:
- MHRA Notice of No Objection: Q3 2026–Q1 2027 (required before prospective 
  NHS study)
- DTAC Assessment: Q4 2026 target (for G-Cloud 14 listing)
- UKCA Class IIb Certification: Q2 2027 (Notified Body pathway)
- EU MDR CE Mark Application: Q3 2027
- FDA 510(k) Pre-Submission: Q3 2027 (US market entry 2028–2029)

GOVERNANCE:
- Sponsor: Storegrill Inc Ltd
- Sponsor Representative/Co-Applicant: Dolapo Ariyo (confirmed)
- Chief Investigator: NHS/University-employed Consultant Radiologist 
  (actively recruiting — HRA mandatory requirement)
- Clinical Safety Officer: To be appointed on project commencement

================================================================================
SECTION 9: BENEFICIARIES
================================================================================

Who will benefit from your innovation? (max 200 words)

PRIMARY BENEFICIARIES:
- NHS patients: Faster diagnosis of life-threatening conditions (stroke, ICH, 
  PE, aortic dissection). Reduced diagnostic delay. Improved survival and 
  functional outcomes.
- NHS radiologists: Reduced reporting burden. Triage support for urgent cases. 
  Uncertainty quantification for clinical confidence. Protection from alert fatigue 
  via Metacognition Gate.
- NHS Trusts: Reduced locum costs. Faster patient throughput. Reduced 
  negligence liability. Improved A&E performance metrics.

SECONDARY BENEFICIARIES:
- African patients: Access to diagnostic AI in clinics with no radiologist 
  and no internet. 60–80% reduced cost via Africa Programme.
- Community diagnostic hubs: Offline edge deployment for variable 
  connectivity environments.
- NHS during outages: Edge mode maintains triage capability during 
  cyberattacks, power failures, or network disruptions.

EQUITY BENEFICIARIES:
- Rural and underserved populations: Offline edge + GSM SMS reaches clinics 
  with <50% internet uptime.
- Non-English speaking patients: VLM reports in 8 languages including 
  Yoruba, Swahili, Arabic.
- Low-resource settings: <£500 hardware requirement makes AI accessible 
  to clinics with minimal capital.

================================================================================
SECTION 10: SCALE
================================================================================

What is the scale of the problem your innovation addresses? (max 200 words)

NHS ENGLAND:
- 7.4 million imaging studies processed annually
- 300 NHS Trusts
- 1,939 unfilled consultant radiologist posts (29% vacancy rate — RCR 2025)
- 1.5 million reports backlogged at any given time
- 4.2 hours median urgent reporting time
- Diagnostic delay = largest NHS negligence category by value (NHS Resolution 2024)

GLOBAL:
- Global AI medical imaging market: $2.4B (2023) → $22B (2030), 26.2% CAGR
- Sub-Saharan Africa: <0.4 radiologists per million (WHO minimum: 20)
- 25,000+ African clinics with no diagnostic AI
- 70%+ of LMIC clinical settings lack reliable internet

ADDRESSABLE MARKET (SEWA AI):
- NHS England: 300 Trusts → £54.3M ARR at saturation (live pricing)
- Africa: 470 target clinics across 6 countries → £810K Year 1 revenue
- EU market entry: Q1 2028 (post-CE Mark)
- US market entry: 2028–2029 (post-FDA 510(k))

The platform's modular architecture (Pathology AI → Mammography AI → Retinal 
AI) expands the addressable market beyond the initial 14 conditions.

================================================================================
SECTION 11: IMPACT
================================================================================

What impact will your innovation have on the NHS? (max 300 words)

CLINICAL IMPACT:
- Door-to-alert time: Target <5 minutes for CRITICAL findings (vs. current 
  4.2-hour median urgent reporting time)
- Stroke thrombolysis: Every 15-minute reduction saves ~1 million neurons 
  (NEJM 2006 — Saver et al.)
- Diagnostic accuracy: Internal AUC-ROC 0.961 across 14 conditions 
  (independent validation pending)
- Reduced missed findings: Metacognition Gate prevents hallucinated outputs 
  from reaching clinical teams (96.3% catch rate internal)

OPERATIONAL IMPACT:
- Radiologist workload: Triage support for urgent cases, allowing 
  radiologists to focus on complex interpretations
- A&E throughput: Faster diagnosis → faster treatment → reduced 
  length of stay
- Night/weekend coverage: AI triage maintains safety during periods 
  of reduced staffing
- Negligence reduction: Faster identification of critical findings 
  reduces diagnostic delay claims

FINANCIAL IMPACT:
- Locum cost reduction: £2,000–£3,500/day for locum radiologists
- Negligence claim reduction: Diagnostic delay = largest NHS 
  negligence category
- Efficiency gains: Faster patient throughput improves A&E 
  performance metrics

IMPACT MEASUREMENT (Shadow Trial):
- Primary endpoint: Door-to-alert time <5 minutes for CRITICAL findings
- Secondary endpoints: Sensitivity, specificity, PPV, NPV, radiologist 
  agreement (κ), alert fatigue score
- Safety endpoint: No unanticipated serious adverse device effects
- Statistical power: 90% to detect 15% improvement at α=0.05

================================================================================
SECTION 12: ENVIRONMENTAL SUSTAINABILITY
================================================================================

How does your innovation support environmental sustainability? (max 200 words)

SEWA AI embeds environmental sustainability in its platform architecture:

CARBON REDUCTION:
- Offline edge deployment eliminates patient transport: 9.5 tCO2e saved 
  per African clinic per year (patients no longer travel 150–300km for scans)
- Cloud-native architecture: 38.9 tCO2e per 10,000 scans (efficient Azure 
  UK South data centres vs. on-premise server farms)
- INT8 quantisation reduces compute energy by 77% vs. FP32 full-precision 
  models (18MB vs. 78MB, CPU-only vs. GPU-required)

RESOURCE EFFICIENCY:
- Digital-first: No paper reports, no physical film, no courier transport 
  of images
- Modular platform: Single platform for 14 conditions vs. multiple 
  standalone AI systems (reduced hardware duplication)
- Federated learning: Model improvement without centralised data 
  collection (reduced data centre load)

CIRCULAR ECONOMY:
- Edge hardware: <£500, runs on refurbished laptops, 5+ year lifespan
- No proprietary hardware lock-in: Standard USB GSM modems, commodity 
  CPUs
- Software updates: Over-the-air, no physical replacement required

NHS NET ZERO ALIGNMENT:
- Supports NHS commitment to net zero by 2040
- Reduces patient transport emissions (particularly relevant for 
  community diagnostic hubs)
- Efficient cloud computing vs. energy-intensive on-premise alternatives

================================================================================
SECTION 13: HEALTH INEQUALITIES
================================================================================

How does your innovation address health inequalities? (max 300 words)

SEWA AI addresses health inequalities through its architecture, deployment 
models, and commercial strategy:

GEOGRAPHIC INEQUALITY:
- Offline edge deployment: INT8 model on 4-core CPU, no internet required. 
  Reaches rural clinics with <50% internet uptime — the 70%+ of LMIC 
  settings that current cloud-dependent AI cannot serve.
- GSM SMS alerts: 2G-compatible. Critical findings reach any mobile phone 
  on the weakest signal.
- Community diagnostic hubs: Edge mode maintains triage during NHS 
  connectivity disruptions.

ECONOMIC INEQUALITY:
- Africa Programme: 60–80% reduced cost for low-and-middle-income countries. 
  Partnership model with governments, NGOs, and donor agencies.
- Hardware accessibility: <£500 edge device (refurbished laptop + USB modem). 
  No GPU, no specialist equipment.
- NHS procurement: Volume-capped subscription (Starter Clinic £549/month, 
  Hospital Pro £2,199/month) with annual discount (15%). Predictable 
  budgeting for resource-limited Trusts.

LINGUISTIC INEQUALITY:
- VLM reports in 8 languages: English, Yoruba, Hausa, Igbo, Swahili, 
  Amharic, Zulu, Arabic.
- Local-language support enables non-English speaking clinicians to 
  interpret AI findings accurately.
- Reduces reliance on English-speaking radiologists in non-English 
  majority settings.

CLINICAL INEQUALITY:
- 14 time-critical conditions: Focuses on conditions where minutes 
  determine survival — the conditions most likely to be missed in 
  resource-constrained settings.
- Uncertainty quantification: Flags cases where AI confidence is low, 
  ensuring high-risk patients are escalated regardless of setting.
- Subgroup monitoring: Age, sex, ethnicity, modality, and scanner type 
  are tracked to detect algorithmic bias (SOP-AI-005 equity audit).

EQUITY GOVERNANCE:
- SOP-AI-005: Standard operating procedure for equity auditing
- DPIA-001: Data Protection Impact Assessment includes equity considerations
- DCB0129: Clinical safety management includes equity risk assessment

================================================================================
SECTION 14: IMPLEMENTATION
================================================================================

How will your innovation be implemented in the NHS? (max 300 words)

PHASE 1: PILOT & SHADOW TRIAL (Q3 2026–Q1 2027)
- 4 NHS Acute Trusts: UHCW, King's College Hospital, UHB, QBM 
  (proposals submitted)
- Prospective observational service evaluation, zero cost to NHS
- 6-month duration
- Primary endpoint: Door-to-alert time <5 minutes for CRITICAL findings
- Chief Investigator: Actively recruiting NHS/University-employed 
  Consultant Radiologist (HRA mandatory requirement)
- WMSDE (West Midlands Secure Data Environment): Access request in 
  progress (IRAS 372596) for retrospective multi-site validation

PHASE 2: G-CLOUD PROCUREMENT & SCALE (Q2–Q4 2027)
- G-Cloud 14 listing: Q4 2026 target (via DTAC assessment)
- 8 paying NHS Trusts via framework
- NIHR EME grant application: Q1 2027 (independent clinical 
  effectiveness study)
- PACS integration: Zero workflow disruption (DICOM SCP, images flow 
  Modality → PACS → SEWA AI → PACS with overlay)

PHASE 3: ICS FRAMEWORK & NATIONAL SCALE (2028+)
- 22+ paying NHS Trusts
- ICS-wide framework contracts
- EU MDR CE Mark live (Q1 2028)
- FDA 510(k) pre-submission (Q3 2027)

IMPLEMENTATION SUPPORT:
- Training: On-site and remote for radiologists, radiographers, 
  IT teams, and clinical leads
- Change management: Dedicated Customer Success Manager (Hospital Pro 
  and Enterprise tiers)
- Technical support: 4-hour priority response (Hospital Pro), 
  24/7 dedicated (Enterprise)
- Ongoing optimisation: Federated learning improves model performance 
  without PHI leaving the device

CRITICAL PATH ITEM:
Chief Investigator confirmation is the single blocking item. UHCW, 
King's, UHB, and QBM proposals are submitted. If NHS Trust engagement 
stalls, a university-employed clinical academic (Warwick, Birmingham, 
King's College London) will satisfy HRA requirements.

================================================================================
SECTION 15: IT REQUIREMENTS
================================================================================

What are the IT requirements for your innovation? (max 200 words)

SEWA AI supports three deployment modes from a single codebase:

1. CLOUD (Azure UK South):
   - Infrastructure: AKS GPU cluster (NVIDIA A100/V100)
   - Connectivity: Persistent internet, TLS 1.3, WAF, HSTS
   - Integration: DICOM C-STORE, FHIR R4 STOW-RS, HL7 v2 MLLP
   - Data governance: Zero PHI egress (signed ZED-001). All inference 
     within UK sovereign cloud.
   - Uptime: 99.9% SLA (Hospital Pro), 99.99% (Enterprise)

2. EDGE (On-premise / Clinic-local):
   - Hardware: 4-core CPU, 8GB RAM, 128GB SSD, <£500
   - Model: INT8-quantised EfficientNet-B4, ~18MB
   - Connectivity: Optional (intermittent or none)
   - Cache: SQLite, 500-study capacity, AES-256-GCM encrypted
   - Sync: Automatic on reconnect, Merkle-chain verified

3. SMS (GSM Modem):
   - Hardware: USB 3G/4G modem or industrial 4G gateway (£30–80)
   - Connectivity: 2G GSM minimum
   - API: Africa's Talking API
   - Data: Alert metadata only (study hash, condition class, urgency). 
     No images transmitted.

ALL MODES SHARE:
- Same Four-Engine Pipeline
- Same safety architecture (Metacognition Gate, uncertainty quantification)
- Same audit trail (Merkle-chained, 7-year retention)
- Same interoperability (DICOM, FHIR, HL7)

================================================================================
SECTION 16: TRAINING
================================================================================

What training is required for healthcare professionals to use your 
innovation? (max 200 words)

TRAINING IS MINIMAL due to zero-workflow-disruption design:

RADIOLOGISTS (2–4 hours):
- Platform overview: Four-Engine Pipeline, alert types, escalation pathways
- XAI interpretation: Reading Grad-CAM and SHAP visualisations
- Uncertainty estimates: Understanding epistemic vs. aleatoric uncertainty
- Alert review workflow: Confirming, modifying, or rejecting AI findings
- Audit and compliance: Understanding the Merkle-chain audit trail

RADIOGRAPHERS (1 hour):
- Image quality requirements: DICOM integrity, resolution standards
- Alert acknowledgement: Understanding CRITICAL vs. URGENT vs. ROUTINE

IT TEAMS (2–3 hours):
- Deployment: Cloud AKS, edge installation, or SMS modem setup
- Integration: PACS/RIS/DICOM configuration
- Security: Zero-PHI-egress architecture, TLS 1.3, WAF
- Troubleshooting: Common issues and escalation pathways

CLINICAL LEADS (1 hour):
- Governance: DCB0129 compliance, clinical safety reporting
- Performance monitoring: Dashboard metrics, alert fatigue indicators
- Continuous improvement: Feedback mechanisms, model update cycles

TRAINING DELIVERY:
- On-site: Dedicated training session at Trust go-live
- Remote: Live webinars, recorded modules, documentation portal
- Ongoing: Quarterly refresher sessions, new staff onboarding

SUS USABILITY SCORE: 81.4 (Excellent) from internal testing with 12 radiologists.

================================================================================
SECTION 17: 5-YEAR VISION
================================================================================

What is your 5-year vision for your innovation? (max 300 words)

YEAR 1 (2026): FOUNDATION
- Confirm Chief Investigator and commence shadow trial (4 NHS Trusts)
- DTAC assessment complete, G-Cloud 14 listed
- First 3 African clinic deployments (offline edge, GSM SMS)
- Seed round £650K deployed, grant applications submitted

YEAR 2 (2027): VALIDATION & SCALE
- 8 paying NHS Trusts via G-Cloud framework
- NIHR EME prospective study complete (independent clinical effectiveness)
- 15 African clinics, federated learning network established
- Series A: £5–8M at £15–20M pre-money (headcount to 16)
- UKCA Class IIb certification, EU MDR CE Mark application

YEAR 3 (2028): COMMERCIALISATION
- 22 paying NHS Trusts + ICS framework contracts
- 40 African clinics, multi-country expansion
- EU market entry (CE Mark live)
- FDA 510(k) pre-submission
- EBITDA positive (conservative scenario)
- Series B preparation: £15–25M at £60–80M post-money

YEAR 4 (2029): EXPANSION
- 38 paying NHS Trusts
- 65 African clinics
- US market entry (FDA 510(k) clearance)
- API licensing to third-party healthcare platforms
- Pathology AI module (microscopy, histopathology)

YEAR 5 (2030): MARKET LEADERSHIP
- 55 paying NHS Trusts (UK saturation approach)
- 80 African clinics
- £12.4M ARR base (conservative: £7.5M)
- Mammography AI and Retinal AI modules launched
- Global partnerships: WHO, UNICEF, Gates Foundation
- Platform API: White-label licensing to national health systems

FINANCIAL TARGETS:
- LTV:CAC: 6×–9×
- Gross margin: 70–80%
- EBITDA positive: Year 3 H2 (conservative)

================================================================================
SECTION 18: MILESTONES
================================================================================

What are the key milestones for your innovation? (max 300 words)

COMPLETED MILESTONES:
✓ Core platform development (TRL 5)
✓ Internal engineering testing (n=14,200)
✓ DCB0129 Clinical Safety (SMP-001 + CRM-001)
✓ DPIA-001 Data Protection Impact Assessment (GDPR Article 35)
✓ NHS Innovation Service registration (INN-2604-0064-2)
✓ UKIPO Patent filing (GB2609706.3, April 2026)
✓ IRAS application submission (Project ID 372596)
✓ Shadow trial protocol development
✓ 4 NHS Trust proposals submitted (UHCW, King's, UHB, QBM)

Q3 2026 MILESTONES:
□ Confirm Chief Investigator (NHS/University-employed Consultant Radiologist)
□ Commence shadow trial (4 NHS Trusts, 6 months)
□ HRA approval for shadow trial
□ WMSDE data access agreement (West Midlands Secure Data Environment)
□ Penetration testing completion (for DTAC)

Q4 2026 MILESTONES:
□ DTAC assessment submission
□ G-Cloud 14 listing
□ First 3 African clinic deployments (Kenya, Nigeria, Ghana)
□ Seed round £650K fully deployed

Q1 2027 MILESTONES:
□ NIHR EME grant application
□ Series A fundraise: £5–8M at £15–20M pre-money
□ MHRA Notice of No Objection
□ Shadow trial interim analysis

Q2 2027 MILESTONES:
□ UKCA Class IIb certification
□ 8 paying NHS Trusts
□ EU MDR CE Mark application

Q3 2027 MILESTONES:
□ FDA 510(k) pre-submission
□ 15 African clinics
□ Pathology AI module development commenced

Q4 2027 MILESTONES:
□ Series A close
□ Headcount expansion to 16
□ EU MDR CE Mark live (Q1 2028)

2028 MILESTONES:
□ 22 paying NHS Trusts
□ 40 African clinics
□ EBITDA positive
□ Series B preparation

================================================================================
SECTION 19: PATIENT AND PUBLIC INVOLVEMENT AND ENGAGEMENT (PPIE)
================================================================================

How have you involved patients and the public in the development of your 
innovation? (max 300 words)

CURRENT STATUS:
Formal PPIE activities are yet to commence. SEWA AI is at TRL 5 (internal 
engineering testing complete) and is now transitioning to clinical validation 
where PPIE becomes essential.

PLANNED PPIE ACTIVITIES:

Q3 2026: ESTABLISH PPIE ADVISORY GROUP
- Recruit 6–8 patient representatives with lived experience of diagnostic 
  delay (stroke survivors, PE patients, families of missed ICH diagnoses)
- Include representatives from underserved communities (rural, ethnic minority, 
  low-income)
- Partner with: Stroke Association, British Lung Foundation, patient advocacy 
  networks

Q4 2026: PATIENT FOCUS GROUPS
- 3 focus groups (8–10 participants each) on AI acceptability in diagnostic 
  imaging
- Topics: Trust in AI, explainability preferences, alert fatigue concerns, 
  data privacy
- Outputs: Co-designed patient information materials for shadow trial

Q1 2027: CO-DESIGN SHADOW TRIAL MATERIALS
- Patient information sheets and consent forms reviewed by PPIE advisory group
- Plain-language summaries of AI findings for patient communication
- Feedback mechanisms: Patient surveys on trust, transparency, and satisfaction

Q2 2027: ONGOING PATIENT SURVEYS
- Post-alert patient surveys: Did you feel informed? Was the explanation clear?
- Quarterly PPIE advisory group meetings
- Annual public engagement event: "AI in Radiology: What Patients Need to Know"

Q3 2027: EXPAND TO AFRICA PPIE
- Partner with AMREF Health Africa and local patient groups
- Community engagement on AI acceptability in low-resource settings
- Co-design Africa-specific patient communication materials

GOVERNANCE:
- PPIE Lead: To be appointed (part-time, 0.2 FTE)
- Budget: £15K annually (focus groups, travel, materials, advisory group 
  honoraria)
- Reporting: Quarterly to Chief Investigator and Sponsor

================================================================================
SECTION 20: FEEDBACK
================================================================================

How will you gather feedback from healthcare professionals and patients? 
(max 300 words)

HEALTHCARE PROFESSIONAL FEEDBACK:

1. SYSTEMATIC USABILITY EVALUATION (SUS):
   - Baseline: SUS 81.4 (Excellent) from internal testing (n=12 radiologists)
   - Shadow trial: SUS evaluation at 1-month, 3-month, and 6-month intervals
   - Target: Maintain SUS >80 throughout trial

2. ALERT FATIGUE MONITORING:
   - Metric: Alerts per shift, override rate, time-to-review
   - Dashboard: Real-time alert fatigue indicators for clinical leads
   - Threshold: If override rate >20%, trigger workflow review

3. STRUCTURED FEEDBACK SESSIONS:
   - Monthly: Radiologist focus groups (30 minutes, structured questionnaire)
   - Quarterly: Multi-disciplinary team feedback (radiologists, radiographers, 
     A&E clinicians, IT teams)
   - Ad-hoc: 24/7 feedback channel (dedicated email, Slack channel)

4. CLINICAL OUTCOME TRACKING:
   - Door-to-alert time (primary endpoint)
   - Time-to-treatment initiation
   - Diagnostic accuracy (vs. final radiologist report)
   - Patient length of stay

PATIENT FEEDBACK:

1. POST-ALERT SURVEYS:
   - Did you understand the AI's role in your diagnosis?
   - Was the explanation of findings clear?
   - Did you feel appropriately informed?
   - Would you trust AI-assisted diagnosis in the future?

2. PATIENT EXPERIENCE:
   - Waiting time satisfaction
   - Communication quality
   - Overall care experience (NHS Friends and Family Test)

3. PUBLIC ENGAGEMENT:
   - Annual "AI in Radiology" public event
   - Social media sentiment monitoring
   - Patient advocacy group feedback

FEEDBACK INTEGRATION:
- Monthly review by Clinical Safety Officer
- Quarterly report to Chief Investigator and Sponsor
- Continuous model improvement via federated learning (privacy-preserving)
- Annual public report on SEWA AI website

================================================================================
SECTION 21: CURRENT PARTNERSHIPS
================================================================================

What partnerships do you currently have? (max 300 words)

NHS & REGULATORY PARTNERSHIPS:
- NHS Innovation Service: Active registration (INN-2604-0064-2)
- Health Research Authority: Engaging (Assessor: Syeda Thorpe, May 2026)
- IRAS: Application in progress (Project ID 372596, Data-Only Framework)

NHS TRUST ENGAGEMENT:
- University Hospitals Coventry and Warwickshire (UHCW): Shadow trial 
  proposal submitted
- King's College Hospital NHS Foundation Trust: Shadow trial proposal submitted
- University Hospitals Birmingham NHS Foundation Trust (UHB): Shadow trial 
  proposal submitted
- Queen's Hospital Burton (QBM): Shadow trial proposal submitted

COMMERCIAL PARTNERSHIPS:
- MedConnect: HealthTech market access and NHS procurement advisory
- VeriQ Ltd: Discussions ongoing for regulatory submission support and 
  QMS implementation

ACADEMIC ENGAGEMENT:
- University of Warwick: Informal discussions for statistical co-applicant 
  and Chief Investigator support
- University of Birmingham: Informal discussions for radiology research 
  collaboration
- King's College London: Informal discussions for stroke research partnership

TECHNOLOGY PARTNERSHIPS:
- Microsoft Azure: Cloud infrastructure (UK South sovereign cloud)
- Africa's Talking: GSM SMS API for Africa Programme
- Paystack / Flutterwave / M-Pesa: Africa payment rail integration

PATIENT ORGANISATIONS:
- Stroke Association: Initial contact for PPIE partnership
- British Lung Foundation: Initial contact for respiratory PPIE

================================================================================
SECTION 22: SOUGHT PARTNERSHIPS
================================================================================

What partnerships are you seeking? (max 300 words)

NHS TRUSTS (Immediate Priority):
- Chief Investigator: NHS or university-employed Consultant Radiologist 
  with research governance experience (HRA mandatory requirement)
- Shadow trial sites: 4 NHS Acute Trusts for prospective observational 
  service evaluation
- WMSDE access: West Midlands Secure Data Environment for retrospective 
  multi-site validation

ACADEMIC PARTNERSHIPS:
- Statistical co-applicant: UK university biostatistician for NIHR EME 
  grant application (Q1 2027)
- Clinical academic: NHS/university-employed for Chief Investigator role
- Research collaboration: Stroke research (King's College London), 
  respiratory imaging (Imperial), radiology AI safety (Warwick)

REGULATORY & COMPLIANCE:
- Notified Body: UKCA Class IIb certification (Q2 2027)
- EU Authorised Representative: For MDR CE Mark (Q1 2028)
- US regulatory consultant: FDA 510(k) pathway (2028–2029)

COMMERCIAL & MARKET ACCESS:
- G-Cloud 14 framework: NHS procurement listing (Q4 2026)
- NHS Supply Chain: National framework contract (2028)
- Distribution partner: EU market entry (2028)
- US commercial partner: FDA clearance and market entry (2029)

AFRICA PROGRAMME:
- Government partnerships: Kenya Ministry of Health, Nigeria Federal 
  Ministry of Health, Ghana Health Service
- NGO partnerships: MSF (Médecins Sans Frontières), AMREF Health Africa
- Donor agencies: USAID, Gates Foundation, Wellcome Trust
- Local implementation: Community health worker networks, clinic chains

PATIENT & PUBLIC:
- Patient advocacy groups: Stroke Association, British Lung Foundation, 
  TB Alert
- PPIE organisations: INVOLVE, NIHR PPIE centres
- Community groups: BAME health forums, rural health networks

TECHNOLOGY:
- PACS vendors: Integration partnerships (Sectra, Philips, GE, Agfa)
- EHR vendors: FHIR/HL7 integration (Epic, Cerner, Meditech)
- Edge hardware: Ruggedised device manufacturers for Africa deployment

================================================================================
SECTION 23: SUPPORT FROM HealthTech RC
================================================================================

What support are you seeking from the HealthTech Research Centre? (max 300 words)

SEWA AI seeks the following support from the NIHR HealthTech Research Centre 
to accelerate NHS clinical validation and regulatory certification:

1. CLINICAL VALIDATION SUPPORT:
   - Chief Investigator identification and recruitment from NHS/university 
     network
   - Shadow trial design review and statistical input
   - NHS Trust site identification beyond the 4 currently engaged
   - WMSDE (West Midlands Secure Data Environment) access facilitation

2. REGULATORY NAVIGATION:
   - DTAC assessment preparation and review
   - MHRA pre-submission meeting facilitation
   - UKCA Class IIb Notified Body identification and engagement
   - ISO 13485 QMS implementation guidance

3. HEALTH ECONOMICS & REIMBURSEMENT:
   - Health technology assessment (HTA) preparation for NICE
   - NHS tariff/HRG code alignment analysis
   - Cost-effectiveness modelling for NHS commissioning
   - Business case development for ICS procurement

4. GRANT CO-APPLICATION:
   - NIHR EME grant application (Q1 2027): Co-application with HealthTech RC 
     as academic partner
   - Innovate UK: Collaborative grant applications for AI safety research
   - MRC: Mechanistic AI safety research (uncertainty quantification, 
     metacognition)

5. PATIENT & PUBLIC INVOLVEMENT:
   - PPIE advisory group establishment support
   - Patient organisation introductions (Stroke Association, British Lung 
     Foundation)
   - Public engagement event facilitation

6. COMMERCIALISATION & MARKET ACCESS:
   - G-Cloud 14 listing support
   - NHS procurement strategy advice
   - Investor introduction (Series A, Q1 2027)
   - EU market entry strategy (CE Mark, authorised representative)

7. TRAINING & CAPACITY BUILDING:
   - Radiologist training programme development
   - IT team technical training
   - Change management support for NHS Trust adoption

TIMELINE: Immediate (Q3 2026) through Q2 2027
FUNDING ASK: In-kind support for CI identification, study design, and 
regulatory navigation. Potential co-application for NIHR EME (Q1 2027).

================================================================================
END OF FORM
================================================================================

DOCUMENT CONTROL
----------------
Form Version: v2.0-1 (NIHR HealthTech Research Centre template)
Completed Date: 10 July 2026
Completed By: Dolapo Ariyo, Founder & CEO, Storegrill Inc Ltd
Cross-Reference: SEWA-AI-MASTER-002 (Master Dossier v2.0)
Classification: CONFIDENTIAL — Not for distribution without written consent

© 2026 Storegrill Inc Ltd · Company No. 14581073 · INN-2604-0064-2 · GB2609706.3
info@sewaxai.health · sewaxai.health
