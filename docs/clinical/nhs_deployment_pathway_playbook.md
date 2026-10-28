# The 4-Step NHS Deployment Pathway: Turnkey Adoption Playbook

**Document Identifier**: `SEWA-NHS-DEPLOY-001`  
**Target Audience**: NHS Trust Medical Directors, Chief Clinical Information Officers (CCIO), R&D Directors, Caldicott Guardians, Lead Radiologists, and Health Innovation West Midlands (HIWM) Leadership  
**Governing Software**: SEWA XAI Multimodal Clinical Triage Platform  
**Target Study**: SEWA-SHADOW-1 Prospective Observational Study  
**Marking**: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** (Operational Deployment Blueprint)

---

## Executive Overview: The Pathway from Lab to NHS Trust

Adopting automated medical imaging AI in an NHS acute trust requires navigating regulatory, clinical safety, information governance, and IT infrastructure gates. 

The **4-Step NHS Deployment Pathway** provides a structured, de-risked methodology designed specifically for **SEWA-SHADOW-1**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE 4-STEP NHS DEPLOYMENT PATHWAY                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐   • Service Evaluation vs IRAS Research determination
│ STEP 1: GOVERNANCE & APPROVALS  │   • Caldicott Guardian Section 251 consent waiver
│ (Months 1–2)                    │   • Data Protection Impact Assessment (DPIA) & DSA
└─────────────────────────────────┘   • NHS DSPT & Cyber Essentials Plus sign-off
          │
          ▼
┌─────────────────────────────────┐   • Manufacturer DCB0129 Clinical Safety Case & Hazard Log
│ STEP 2: CLINICAL SAFETY GATE    │   • Trust DCB0160 Deployment Safety Plan & Sign-Off
│ (Months 2–3)                    │   • CSO Declaration: Zero Clinical Alert / Zero Patient Risk
└─────────────────────────────────┘   • Trust Clinical Risk Management Plan (CRMP)
          │
          ▼
┌─────────────────────────────────┐   • Innovation Academy Module Completion (Joanne Mewis)
│ STEP 3: HIWM ADOPTION & SPREAD  │   • NICE Evidence Standards Framework (ESF) Tier C mapping
│ (Months 3–4)                    │   • SBRI Healthcare Phase 1 / NHS AI Award funding
└─────────────────────────────────┘   • HIN Adoption & Spread Planning Playbook alignment
          │
          ▼
┌─────────────────────────────────┐   • Edge Gateway deployment (DICOM C-STORE passive listener)
│ STEP 4: TECHNICAL ONBOARDING    │   • PS 3.15 Annex E Basic Profile de-identification
│ (Month 4 – Onward)              │   • Phase 1 Zero-Label AdaBN scanner calibration (ADR 004)
└─────────────────────────────────┘   • Active prospective 1,200-scan shadow-mode enrollment
```

---

## Step 1: Trust Governance, Ethics & Information Governance (Months 1–2)

### 1.1 Classification: Service Evaluation vs Research
- **Classification Objective**: Establish whether the prospective shadow-mode evaluation constitutes a **Clinical Service Evaluation / Quality Improvement Project** or a **Formal Research Study**.
- **Assessment Against NHS Health Research Authority (HRA) Criteria**:
  - *Intervention*: Does the software introduce a new treatment, protocol, or live alert? **No.** (Passive shadow mode).
  - *Randomisation*: Are patients randomised to different treatment arms? **No.**
  - *Clinical Care*: Is standard of care altered in any way? **No.** (100% of scans read by NHS radiologists as normal).
- **Result**: Under HRA guidance (*Defining Research*, NRES/HRA), shadow-mode validation meets the criteria for a **Clinical Quality Improvement & Pre-Market Service Evaluation**, allowing rapid local Trust R&D and Caldicott Guardian approval without full 12-month National Research Ethics Service (NRES) review.
- *Fallback Pathway*: If multi-site aggregation requires formal research classification, submission is routed via the **Integrated Research Application System (IRAS)** with an informed consent waiver under 45 CFR 46.116(f).

### 1.2 Information Governance (DPIA, DSA & DSPT)
- **Data Protection Impact Assessment (DPIA)**: Pre-completed DPIA (`docs/governance/step1_caldicott_guardian_submission_pack.md`) covering:
  - Lawful basis under UK GDPR: Article 6(1)(e) *Public Task* and Article 9(2)(j) *Scientific Research and Statistical Purposes*.
  - Edge de-identification ensuring no direct identifiers leave the NHS network.
- **Data Sharing Agreement (DSA)**: Model agreement covering data custody, deletion covenants, and cloud boundaries.
- **NHS Data Security and Protection Toolkit (DSPT)**: Status verified as *Standards Exceeded*; Cyber Essentials Plus certification active.

---

## Step 2: Digital Clinical Safety Compliance — DCB0129 & DCB0160 (Months 2–3)

NHS Digital mandates that both the software manufacturer and the healthcare organisation comply with clinical risk management standards:

```
┌──────────────────────────────────────────────┐       ┌──────────────────────────────────────────────┐
│       MANUFACTURER OBLIGATION: DCB0129       │       │        HEALTHCARE TRUST OBLIGATION: DCB0160  │
│                                              │       │                                              │
│ • SEWA AI Clinical Safety Officer (CSO)      │       │ • Trust Clinical Safety Officer (CCIO/Lead)  │
│ • Clinical Risk Management Plan (CRMP)       │ ────► │ • Trust Deployment Safety Case Report        │
│ • Comprehensive Product Hazard Log           │       │ • Site-specific clinical mitigation check    │
│ • Clinical Safety Case Report (CSCR)         │       │ • Trust CSO sign-off prior to network deploy │
└──────────────────────────────────────────────┘       └──────────────────────────────────────────────┘
```

### 2.1 Key Hazards Identified & Addressed in Hazard Log
| Hazard ID | Clinical Hazard Description | Inherent Risk | Engineered Safety Mitigation | Residual Risk |
|---|---|:---:|---|:---:|
| **HAZ-001** | False negative triage on subtle acute haemorrhage | **High** | Split Conformal Risk Control ($\lambda=0.0298$) guarantees $\text{FNR} \le 5.0\%$; pure shadow-mode prevents patient impact | **Low / Acceptable** |
| **HAZ-002** | False positive alert causing clinical distraction | **Medium** | Zero display in shadow mode; Layer 6 Negation Engine suppresses 100% of report contradictions | **Very Low** |
| **HAZ-003** | Silent degradation under severe noise / motion | **High** | Layer 1 OOD detector & Test K Epistemic Uncertainty Monotonicity ($r_s=0.9000$) escalates noisy scans | **Low / Acceptable** |
| **HAZ-004** | Accidental patient re-identification via metadata | **High** | Edge gateway applies DICOM PS 3.15 Annex E Basic Profile before cloud transit | **Negligible** |
| **HAZ-005** | PACS listener network saturation or buffer overflow | **Medium** | Asynchronous queuing, read-only C-STORE mirror, dedicated edge network isolation | **Negligible** |

---

## Step 3: Health Innovation West Midlands (HIWM) Adoption, Spread & Funding (Months 3–4)

Aligned directly with the directives from Joanne Mewis (Senior Innovation Advisor, HIWM) and the national Health Innovation Network (HIN) framework.

### 3.1 Alignment with the 5 HIN Pillars
1. **Scene Setting**: Non-contrast head CT in acute stroke/trauma; 24/7 out-of-hours coverage; mandatory 100% consultant sign-off.
2. **Unmet Need**: FIFO worklist backlogs causing 120–240+ min delays, breaching NICE 60-min stroke imaging guidelines; £285M locum spend.
3. **Consequence**: Delays in identifying expanding subdural/epidural bleeds; £450–£600 per bed-day acute stroke care cost.
4. **Intervention**: SEWA XAI 7-layer sub-1.5s CPU platform, UK South sovereign hosting, zero expensive GPU requirements.
5. **Impact & Outcomes**: Pre-registered clinical targets: door-to-read reduced to $<30\text{ min}$, critical escalation reduced to $<45\text{ min}$, out-of-hours spend reduced by 15%–25%.

### 3.2 NICE Evidence Standards Framework (ESF) Tier C Mapping
- SEWA XAI is classified under **Tier C: Interventions with a direct health outcome (Clinical Triage & Risk Stratification)**.
- Full evidence dossier mapped across:
  - Clinical effectiveness (Tests A–O).
  - Economic modeling (Discrete event simulation).
  - Algorithmic fairness and technical auditability.

### 3.3 Active Funding Acquisition
- **SBRI Healthcare Phase 1 (Stroke & Urgent Care Triage)**: Target grant application for £100,000 feasibility and pilot funding.
- **Artificial Intelligence in Health and Care Award / Health Innovation Network Pipelines**: Leveraging HIWM sponsorship for regional multi-trust deployment.

---

## Step 4: Technical Onboarding, Edge Gateway & Scanner Calibration (Month 4 – Onward)

### 4.1 Technical Architecture at the Hospital Edge
```
[Scanner Gantry] (GE / Siemens / Philips)
       │
       ▼
[Hospital PACS (Sectra / Agfa / GE)]
       │
       ▼ (DICOM C-STORE Mirror / C-MOVE)
┌─────────────────────────────────────────────────────────────┐
│                 SEWA EDGE GATEWAY APPLIANCE                 │
│                 (Linux / Docker Container)                  │
│                                                             │
│  1. Orthanc / DCM4CHEE C-STORE SCP Listener                 │
│  2. Metadata Scrubbing (DICOM PS 3.15 Annex E)              │
│  3. Cryptographic Pseudonymization (HMAC-SHA256)            │
│  4. Sovereign TLS 1.3 Pipe to UK South Azure                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
            [Sovereign Azure Healthcare Tenant]
            • API Endpoint: https://api.sewaxai.health
            • Web Dashboard: https://app.sewaxai.health
```

### 4.2 The 3-Phase Calibration Protocol (ADR 004 Execution)
1. **Phase 1: Zero-Label AdaBN Warm-Up**:
   - Ingest 50–100 historical anonymised scans per local scanner hardware.
   - Batch normalization running moments $(\mu, \sigma^2)$ are recalibrated to the hospital's specific slice thickness, reconstruction kernels, and beam hardness.
   - Requires zero radiologist annotations.
2. **Phase 2: Split Conformal Risk Control Calibration**:
   - Ingest 100 locally audited historical studies (50 positive, 50 normal).
   - Compute non-conformity scores and calibrate the local $\lambda$ threshold guaranteeing $\text{FNR} \le 5.0\%$.
3. **Phase 3: Active Blinded Shadow-Mode Enrollment**:
   - Parallel stream initiates; consecutive enrollment toward the $N = 1,200$ target.
   - Continuous streaming drift monitoring (modality PSI, Kolmogorov-Smirnov drift test).

---

## Stakeholder RACI Matrix

| Activity | Trust R&D | Caldicott Guardian | Trust CCIO / CSO | Lead Radiologist | SEWA AI Lead | HIWM Advisor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Study Protocol Sign-Off** | **A** | **C** | **C** | **R** | **R** | **I** |
| **DPIA & DSA Approval** | **C** | **A** | **C** | **I** | **R** | **I** |
| **DCB0129 / DCB0160 Safety Case** | **I** | **I** | **A** | **C** | **R** | **I** |
| **Edge Gateway IT Deployment** | **I** | **I** | **A** | **C** | **R** | **I** |
| **AdaBN Scanner Calibration** | **I** | **I** | **I** | **C** | **R** | **I** |
| **Shadow-Mode Parallel Ingestion** | **I** | **I** | **I** | **R** | **A** | **I** |
| **Discrepancy 3-Reader Arbitration**| **I** | **I** | **I** | **A / R** | **R** | **I** |
| **SBRI / HIN Adoption Submission** | **C** | **I** | **C** | **C** | **R** | **A** |

*Legend: R = Responsible for doing; A = Accountable / Sign-off; C = Consulted; I = Informed.*

---

## 12-Month Deployment Schedule

```
Month:     1   2   3   4   5   6   7   8   9   10  11  12
Step 1:    [=======]
Step 2:        [=======]
Step 3:            [=======]
Step 4:                [==============================]
Analysis:                                         [======]
Reporting:                                            [==]
```

- **Months 1–2**: Step 1 Governance, Caldicott sign-off, DPIA & DSA execution.
- **Months 2–3**: Step 2 DCB0129 / DCB0160 clinical safety sign-off.
- **Months 3–4**: Step 3 HIWM Innovation Academy completion & SBRI funding application.
- **Month 4**: Step 4 Edge Gateway deployment & Phase 1 AdaBN calibration.
- **Months 4–9**: Active prospective shadow-mode data collection ($N=1,200$).
- **Months 10–11**: 3-consultant panel arbitration of discordant cases & SAP execution.
- **Month 12**: Final Clinical Study Report (CSR), NICE Tier C submission, MHRA SaMD pre-submission.
