
================================================================================
SEWA AI TRUSTWORTHY CLINICAL AI PLATFORM
NHS TRUST PACK — ABRIDGED DOSSIER FOR R&D COMMITTEES
Version 2.0 · July 2026 · CONFIDENTIAL
================================================================================

DOCUMENT PURPOSE
----------------
This pack is designed for NHS Trust Medical Directors, R&D Directors, CIOs, 
and Radiology Department Heads. It provides the essential information required 
to evaluate SEWA AI for pilot participation, shadow trial engagement, or 
procurement consideration.

Full technical and commercial detail is available in the Master Dossier 
(SEWA-AI-MASTER-002) on request.

================================================================================
SECTION 1: WHAT SEWA AI DOES (2 minutes)
================================================================================

SEWA AI is a Trustworthy Clinical AI Platform for diagnostic imaging triage.
It identifies life-threatening findings in medical images and alerts clinical 
teams in seconds — not hours.

THE FOUR-ENGINE PIPELINE

1. DETECTION CNN
   - 14 acute conditions across CT, MRI, and X-ray
   - ICH, LVO stroke, PE, aortic dissection, pneumothorax, pneumonia, TB, etc.
   - Internal AUC-ROC: 0.961 overall (n=14,200)

2. UNCERTAINTY QUANTIFICATION
   - Monte Carlo Dropout: 20 stochastic forward passes
   - Decomposes uncertainty into: "model doesn't know this" (epistemic) vs. 
     "image is inherently ambiguous" (aleatoric)
   - Mandatory human escalation when uncertainty exceeds threshold

3. METACOGNITION GATE (Patent GB2609706.3)
   - Nine-layer safety audit of every AI output
   - Hallucination risk score H ∈ [0,1]
   - H > 0.30: Autonomous dispatch BLOCKED. No silent discard.
   - Internal catch rate: 96.3% (n=500, 3-radiologist consensus)

4. VLM REPORT GENERATION
   - Structured radiology finding + natural language impression
   - Grad-CAM + SHAP visual explainability on every finding
   - 8 languages including Yoruba, Swahili, Arabic

KEY SAFETY FEATURE: Mandatory human-in-the-loop enforced at the DATABASE 
LAYER — not the UI. Cannot be bypassed by frontend manipulation.

================================================================================
SECTION 2: WHY THE NHS NEEDS THIS (2 minutes)
================================================================================

THE PROBLEM

| Metric | Current Position | Clinical Consequence |
|--------|-----------------|---------------------|
| Consultant vacancy rate | 29% (RCR 2025) | 1.5M backlogged reports |
| Median urgent report time | 4.2 hours | Preventable deterioration |
| Stroke: each 15-min delay | ~1M neurons lost | NEJM 2006 — Saver et al. |
| Diagnostic delay claims | Largest negligence category | NHS Resolution 2024 |
| Radiologist burnout | 67% unsustainable workload | BMA 2023 |

WHY EXISTING AI HASN'T SOLVED THIS

- Single confidence scores with no uncertainty decomposition
- No hallucination detection before alert dispatch
- No offline capability — inoperable during outages
- Alert fatigue from uninterpretable outputs
- No mandatory human-in-the-loop guarantee

THE NHS DOES NOT HAVE AN AI SHORTAGE. IT HAS A TRUSTWORTHY AI SHORTAGE.

================================================================================
SECTION 3: HOW SEWA AI DEPLOYS IN YOUR TRUST (3 minutes)
================================================================================

THREE MODES, SAME SAFETY ARCHITECTURE

MODE 1: CLOUD (Azure UK South)
- AKS GPU cluster, NVIDIA A100/V100
- Zero PHI egress — all data stays in UK sovereign cloud
- DICOM C-STORE / FHIR R4 / HL7 v2 integration
- PACS overlay — zero workflow disruption
- 99.9% uptime SLA (Hospital Pro) / 99.99% (Enterprise)

MODE 2: EDGE (On-premise)
- INT8-quantised model, ~18MB, runs on 4-core CPU
- No GPU. No internet required.
- Full triage capability during connectivity outages
- SQLite cache, AES-256-GCM encrypted
- Automatic sync when connectivity resumes

MODE 3: SMS (GSM Modem)
- For rural/community sites with no reliable internet
- Critical findings dispatched via GSM SMS
- 2G compatible — works on weakest signal
- Africa's Talking API

ZERO WORKFLOW DISRUPTION

Images flow: Modality → PACS → SEWA AI → PACS with overlay
No clinician workflow change. SUS score: 81.4 (Excellent).

================================================================================
SECTION 4: REGULATORY STATUS & GOVERNANCE (3 minutes)
================================================================================

WHERE WE ARE

| Body / Instrument | Status | What This Means for Your Trust |
|-------------------|--------|-------------------------------|
| NHS Innovation Service | ✅ Active (INN-2604-0064-2) | Listed on NHS innovation pathway |
| DCB0129 Clinical Safety | ✅ Complete (SMP-001+CRM-001) | Clinical safety management system in place |
| DPIA-001 (GDPR Art. 35) | ✅ Complete | Data protection impact assessed |
| UKIPO Patent | ✅ Filed (GB2609706.3) | IP protection for safety architecture |
| IRAS Application | 🔄 In Progress (372596) | Data-only research framework |
| HRA Engagement | 🔄 Engaging (Assessor: Syeda Thorpe) | Regulatory pathway open |
| Shadow Trial Protocol | ✅ Ready | 4 NHS Trust proposals submitted |
| DTAC Assessment | 🔄 In Progress | Q4 2026 target for G-Cloud 14 |
| MHRA Notice of No Objection | ⏳ In Preparation | Required before prospective study |
| UKCA Class IIb | ⏳ Planned Q2 2027 | Full regulatory certification pathway |

WHAT WE NEED FROM YOUR TRUST

1. Chief Investigator — NHS or university-employed Consultant Radiologist 
   with research governance experience. This is an HRA/IRAS mandatory 
   requirement and the single blocking item.

2. Shadow trial participation — Prospective observational service evaluation, 
   zero cost to NHS, 6-month duration, generates real-world performance data.

3. R&D approval — Standard NHS R&D governance for service evaluation.

GOVERNANCE STRUCTURE

| Role | Person / Organisation | Status |
|------|----------------------|--------|
| Sponsor | Storegrill Inc Ltd | Confirmed |
| Sponsor Rep / Co-Applicant | Dolapo Ariyo (CEO) | Confirmed |
| Chief Investigator | NHS/University clinician | **To be confirmed** |
| Clinical Safety Officer | TBC on project commencement | Strategic hire |
| Statistical Co-Applicant | UK university partner | In discussion |

================================================================================
SECTION 5: PRICING & PROCUREMENT (2 minutes)
================================================================================

LIVE PRICING (sewaxai.health)

| Tier | Monthly | Annual (15% off) | Scans/Month | Best For |
|------|---------|------------------|-------------|----------|
| Starter Clinic (Annual Only) | £549 | £459/mo (total £5,508) | Up to 500 | Independent clinics |
| Hospital Pro | £2,199 | £1,899/mo (total £22,788) | Up to 5,000 | NHS Trusts, DGHs |
| Enterprise | £4,999+ | £4,299+/mo | Unlimited | NHS ICBs, national programmes |

NHS PROCUREMENT PATHWAY

- G-Cloud 14 listing: Q4 2026 target
- Framework advantage: No full OJEU tender; 3-year call-off contracts
- DTAC assessment in progress: Q4 2026 completion
- Pilot-to-production pathway: Free pilot (3–6 months) → Departmental 
  subscription → Enterprise contract

WHAT'S INCLUDED IN HOSPITAL PRO

✓ Full Four-Engine Pipeline (detection + uncertainty + metacognition + VLM)
✓ Uncertainty Engine (confidence quantification)
✓ Metacognition Engine (hallucination detection)
✓ Native PACS & HL7v2 integration
✓ Automated referral routing & payments
✓ Grad-CAM & SHAP visual explainability
✓ WhatsApp, SMS & EHR critical alerts
✓ Multi-department / multi-site support
✓ SSO / SAML 2.0 (NHS Care Identity Service)
✓ Audit logs (HIPAA & NHS DSPT aligned)
✓ 99.9% uptime SLA target
✓ Priority 4-hour technical support
✓ Dedicated Customer Success Manager

================================================================================
SECTION 6: CLINICAL EVIDENCE & NEXT STEPS (2 minutes)
================================================================================

INTERNAL TEST RESULTS (Engineering Testing Only — Not Clinically Validated)

| Condition | Modality | n | AUC-ROC | Sensitivity | Specificity | κ vs Radiologist |
|-----------|----------|---|---------|-------------|-------------|------------------|
| ICH | CT Head | 2,847 | 0.972 | 94.1% | 97.8% | 0.87 |
| PE | CT Chest | 1,203 | 0.961 | 91.4% | 96.2% | 0.84 |
| LVO Stroke | CT Angio | 1,640 | 0.958 | 90.8% | 95.7% | 0.82 |
| Pneumothorax | X-ray | 889 | 0.979 | 96.2% | 98.1% | 0.91 |
| TB (Africa) | X-ray | 3,201 | 0.944 | 89.7% | 94.8% | 0.80 |
| Pneumonia | X-ray | 2,180 | 0.953 | 92.3% | 95.9% | 0.83 |
| **Overall** | **Mixed** | **14,200** | **0.961** | **92.4%** | **96.4%** | **0.87** |

SHADOW TRIAL DESIGN (Planned)

- Design: Prospective, observational, service evaluation
- Duration: 6 months
- Primary endpoint: Door-to-alert time (<5 minutes for CRITICAL findings)
- Secondary endpoints: Sensitivity, specificity, PPV, NPV, radiologist 
  agreement (κ), alert fatigue score
- Safety endpoint: No unanticipated serious adverse device effects
- Power: 90% to detect 15% improvement at α=0.05

VALIDATION ROADMAP

| Stage | Timeline | Purpose |
|-------|----------|---------|
| Shadow trial | Q3 2026–Q1 2027 | Real-world NHS performance |
| NIHR EME | Q1 2027 | Independent clinical effectiveness |
| UKCA Class IIb | Q2 2027 | Regulatory certification |
| Post-market surveillance | Ongoing | Continuous safety monitoring |

IMMEDIATE NEXT STEPS FOR YOUR TRUST

1. Review this pack with Radiology Department Head and R&D Director
2. Confirm interest in shadow trial participation
3. Identify potential Chief Investigator (Consultant Radiologist with 
   research governance experience)
4. Contact: info@sewaxai.health · Reference: NHS Trust Pack v2.0

================================================================================
SECTION 7: COMPETITIVE POSITION (1 minute)
================================================================================

SEWA AI vs. KEY COMPETITORS

| Capability | SEWA AI | Harrison.ai | Aidoc | Qure.ai | Viz.ai |
|------------|---------|-------------|-------|---------|--------|
| Conditions in scope | 14 (time-critical) | 124 (CT chest) | 8–12 | 2–3 | 3 (stroke) |
| Uncertainty quantification | ✅ | ❌ | Partial | ❌ | ❌ |
| Hallucination detection | ✅ | ❌ | ❌ | ❌ | ❌ |
| Offline/edge deployment | ✅ | ❌ | ❌ | Partial | ❌ |
| Mandatory DB-layer HITL | ✅ | ❌ | ❌ | ❌ | ❌ |
| Africa/low-connectivity | ✅ | ❌ | ❌ | ✅ | ❌ |
| Published pricing | ✅ | ❌ | ❌ | ❌ | ❌ |
| NHS Innovation Service | ✅ | ❌ | ❌ | ❌ | ❌ |

DISTINCTION: Harrison.ai's 124 findings include chronic and incidental 
findings not requiring emergency triage. SEWA AI's 14 conditions are the 
conditions where minutes determine survival — a deliberate strategic choice.

================================================================================
SECTION 8: CONTACT & DOCUMENT CONTROL
================================================================================

SEWA AI Trustworthy Clinical AI Platform
A Storegrill Inc Ltd company · Company No. 14581073
18 Hampshire Close, Binley, Coventry, CV3 2FP, England
info@sewaxai.health · www.sewaxai.health

| Field | Detail |
|-------|--------|
| Document ID | SEWA-AI-NHS-PACK-002 |
| Version | 2.1 |
| Date | 11 July 2026 |
| Author | Dolapo Ariyo, Founder & CEO |
| Classification | CONFIDENTIAL — Not for distribution without written consent |
| Next Review | Upon CI confirmation or shadow trial commencement |

© 2026 Storegrill Inc Ltd · INN-2604-0064-2 · GB2609706.3 · CONFIDENTIAL
================================================================================
