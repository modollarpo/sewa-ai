# Clinical Study Protocol: SEWA-SHADOW-1 (Version 2.0)

**Full Title**: Multicenter Prospective Observational Shadow-Mode Validation of Multimodal Artificial Intelligence with Metacognitive Safety Gating for Acute Clinical Triage  
**Short Title**: SEWA-SHADOW-1  
**Study Phase**: Pre-Market Prospective Observational Clinical Validation (TRL 6 / Non-Significant Risk)  
**Governing Principle**: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** (Transitioning to Prospective Clinical Verification)  
**Version**: 2.0 (2026-10-28) — Expanded with Subtype Specificity (Test J), Physics Stress Resilience (Test K), and Multimodal Cohorts (Tests L–O)  
**Target Sites**: Acute NHS Trusts within the West Midlands (e.g., University Hospitals Birmingham NHS Foundation Trust, University Hospitals Coventry & Warwickshire)

---

## Executive Summary & Study Rationale

In acute emergency care across NHS England, over 2.5 million emergency head CTs and millions of chest radiographs and CTPAs are performed annually. A 29% national shortage in consultant radiologists produces out-of-hours triage queues of 120–240+ minutes, frequently breaching the NICE 60-minute target for acute stroke and trauma imaging.

While artificial intelligence offers high triage throughput, commercial AI tools suffer from domain shift across scanner vendors, silent cliff-edge failure under acquisition noise, and lack of rigorous statistical guarantees.

**SEWA-SHADOW-1** is a prospective, multicentre, non-interventional **shadow-mode** clinical study. The SEWA XAI platform will operate strictly in parallel to standard NHS emergency workflows:
- **Zero Clinical Disruption**: Ingests mirrored DICOM C-STORE instances from hospital PACS/VNA.
- **Zero Diagnostic Interference**: Inferences, uncertainty estimates, and explainability maps are logged to an immutable sovereign audit ledger with zero display to treating clinicians.
- **Rigorous Verification**: Standard-of-care radiologist reports serve as clinical comparator, arbitrated by a 3-consultant adjudication panel for discordant cases.

---

## 1. Regulatory Classification, Ethics & Governance

### 1.1 UK & International Regulatory Classification
- **UK MHRA**: Observational research / non-interventional medical device evaluation under the UK Medical Devices Regulations 2002 (SI 2002 No 618, as amended).
- **NHS Health Research Authority (HRA)**: Dual-pathway eligible:
  - *Pathway A (Recommended for rapid multi-site onboarding)*: Trust-level **Clinical Quality Improvement & Service Evaluation** approved by Trust Caldicott Guardians, Information Governance leads, and R&D Directors.
  - *Pathway B*: Multi-centre research protocol submitted via the **Integrated Research Application System (IRAS)**.
- **US FDA**: Investigational Device Exemption (IDE) **Non-Significant Risk (NSR)** under 21 CFR 812.2(b).
- **EU MDR**: Post-market clinical follow-up / pre-market observational study under EU MDR 2017/745 Article 62.

### 1.2 Informed Consent Waiver & Section 251 Exemption
- **Waiver of Individual Consent**: Because the software operates in parallel without altering clinical care, diagnostics, or patient pathways, an Institutional Review Board (IRB) / Research Ethics Committee (REC) **waiver of individual informed consent** is requested under 45 CFR 46.116(f) and NHS HRA Standard Operating Procedures.
- **Confidentiality**: De-identification executed at the hospital edge gateway in accordance with DICOM PS 3.15 Annex E Basic Profile prior to any transmission.

### 1.3 Digital Clinical Safety Compliance (DCB0129 & DCB0160)
- **DCB0129**: Manufacturer Clinical Safety Case Report (CSCR) and Hazard Log maintained by SEWA AI Clinical Safety Officer.
- **DCB0160**: Trust-level deployment safety case signed by the participating Trust Clinical Safety Officer (CCIO / Consultant Radiologist).

---

## 2. Study Architecture: Blinded Shadow-Mode Workflow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                HOSPITAL NETWORK (EDGE)                                 │
│                                                                                        │
│   [Emergency / Inpatient / Screening Scanner] (GE / Siemens / Philips / Canon)         │
│                                 │                                                      │
│                                 ▼                                                      │
│                       [Hospital PACS / VNA]                                            │
│                                 │                                                      │
│          ┌──────────────────────┴──────────────────────┐                               │
│          ▼ (Standard of Care)                          ▼ (DICOM C-STORE Mirror)        │
│   [Consultant Radiologist]                     [SEWA Edge De-ID Gateway]               │
│          │                                             │ (PS 3.15 Annex E De-ID)       │
│          ▼                                             ▼ (TLS 1.3 Sovereign Pipe)      │
│   [Final Signed Report]                        [SEWA Ingestion Microservice]           │
└──────────┼─────────────────────────────────────────────┼───────────────────────────────┘
           │                                             │
           │                                             ▼
           │                             ┌───────────────────────────────┐
           │                             │   SEWA XAI SOVEREIGN CLUSTER  │
           │                             │   (UK South / Sweden Central) │
           │                             │                               │
           │                             │   • Layer 1: OOD / Noise Gate │
           │                             │   • Layer 2: Preprocessing    │
           │                             │   • Layer 3: INT8 Inference   │
           │                             │   • Layer 4: Temp Scaling     │
           │                             │   • Layer 5: MC Dropout Epist │
           │                             │   • Layer 6: Conformal Gate   │
           │                             │   • Layer 7: Masked HiResCAM  │
           │                             └───────────────┬───────────────┘
           │                                             │
           ▼                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          INDEPENDENT POST-HOC ADJUDICATION                             │
│                                                                                        │
│   [Automated Metacognition Negation Engine] ◄──────────┘                               │
│      • Compare Signed Radiologist Report vs SEWA AI Prediction                         │
│      • Calculate Concordance, Sensitivity, and Split Conformal Bound                   │
│                                                                                        │
│   [3-Consultant Neuroradiology Adjudication Panel]                                     │
│      • Blinded review of all discordant cases (AI+ / Report- or AI- / Report+)         │
│      • Establishes Gold-Standard Truth for Final Statistical Analysis                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Cohort Structure & Primary/Secondary Endpoints

The study comprises **three tiers of prospective clinical evaluation**:

### Tier 1: Acute Head CT Intracranial Haemorrhage (ICH) Triage (Primary Arm)
- **Target Sample Size**: $N = 1,200$ consecutive emergency non-contrast head CTs.
- **Power Calculation**: Assuming 15% prevalence ($N_{\text{pos}} \approx 180$), provides $>90\%$ power at two-sided $\alpha = 0.05$ to detect sensitivity $\ge 90.0\%$ (lower 95% Wilson CI bound $> 85.0\%$).
- **Primary Endpoints**:
  1. **Overall ICH AUROC**: $\ge 0.80$ against panel ground truth.
  2. **Emergency Subtype Sensitivity (Test J Refinement)**:
     - Epidural Haematoma (EDH): Sensitivity $\ge 95.0\%$ (Target 100%).
     - Subarachnoid Haemorrhage (SAH): Sensitivity $\ge 90.0\%$.
     - Subdural Haematoma (SDH): Sensitivity $\ge 90.0\%$.
     - Intraparenchymal Haemorrhage (IPH): Sensitivity $\ge 90.0\%$.
  3. **Conformal Risk Bound Guarantee**: Empirical False Negative Rate $\text{FNR} \le 5.0\%$ at site-calibrated threshold $\lambda$.
  4. **Autonomous Safe Normal Clearing**: Safe routing of $\ge 10.0\%$ true-normal scans without human review with $\text{FNR} \le 5.0\%$.

### Tier 2: Screening Modalities (Secondary Confirmatory Arms)
- **Mammography Screening Arm**: $N = 800$ bilateral full-field digital mammograms (FFDM).
  - Primary Endpoints: Soft tissue mass / microcalcification AUROC $\ge 0.85$; BI-RADS concordance $\ge 80.0\%$.
- **Retinal Fundus Screening Arm**: $N = 600$ 2-field digital retinal photographs in diabetic patients.
  - Primary Endpoints: Referable diabetic retinopathy (Moderate NPDR or worse) sensitivity $\ge 90.0\%$; Urgent macular oedema alert accuracy $\ge 95.0\%$.

### Tier 3: Multimodal Acute Expansion (Exploratory / Discovery Arms)
- **CXR Pneumothorax (PTX) Arm**: $N = 300$ portable emergency AP chest radiographs.
  - Endpoints: Tension PTX recall $\ge 95.0\%$; Contradiction safety gate recall $\ge 95.0\%$.
- **CXR Tuberculosis (TB) Arm**: $N = 300$ community/refugee clinic frontal chest radiographs.
  - Endpoints: Cavitary/miliary TB feature sensitivity $\ge 85.0\%$; Specificity $\ge 90.0\%$.
- **CTPA Pulmonary Embolism (PE) Arm**: $N = 200$ contrast-enhanced CT pulmonary angiograms.
  - Endpoints: Central/acute saddle PE sensitivity $\ge 90.0\%$; RV/LV strain detection concordance $\ge 85.0\%$.
- **Early Ischemic Stroke (NCCT/DWI) Arm**: $N = 300$ acute stroke code presentations.
  - Endpoints: Prevention of inappropriate ICH alerting (ICH FPR $\le 15.0\%$); Early ischemic change detection.

---

## 4. Site Onboarding & Scanner Calibration (ADR 004 Protocol)

Before activating active shadow-mode ingestion at any participating hospital site, the local engineering team executes the **3-Phase Site Calibration Protocol**:

```
[Phase 1: Zero-Label AdaBN Warm-Up]
• Ingest 50–100 historical anonymized scans from each local scanner (GE, Siemens, Philips).
• Update batch normalization running statistics (μ, σ²) to eliminate vendor reconstruction drift.
• Zero manual labels required.
          │
          ▼
[Phase 2: Split Conformal Calibration]
• Ingest 100 locally audited historical studies (50 positive, 50 normal).
• Compute non-conformity scores and calibrate λ to guarantee FNR ≤ 5.0%.
          │
          ▼
[Phase 3: Active Blinded Shadow-Mode Enrollment]
• Activate real-time parallel C-STORE ingestion.
• Continuous streaming drift monitoring (modality PSI, Kolmogorov-Smirnov drift test).
```

---

## 5. Discrepancy Adjudication & Safety Governance

### 5.1 Three-Member Independent Adjudication Panel
- Any scan demonstrating a discrepancy between the original hospital signed radiologist report and the SEWA XAI output (AI+ / Report- or AI- / Report+) is flagged automatically for blinded expert review.
- Three consultant radiologists (independent of the reporting site) independently review the scan without knowing the AI prediction or original report.
- The majority consensus (2 of 3) establishes the definitive ground truth.

### 5.2 Ethical Action on Critical Clinical Findings (Escalation Rule)
- Because the study is strictly observational, the software does not produce live alerts.
- **However**, if post-hoc audit reveals an immediate, life-threatening finding (e.g., expanding tension pneumothorax or acute subdural haematoma with midline shift) that was **completely missed** in the official hospital report and where the patient may still be at acute risk, the study Principal Investigator will follow the pre-agreed **Trust Caldicott Escaped Finding Protocol** to notify the hospital Clinical Governance Director.

---

## 6. Statistical Analysis Plan (SAP)

1. **Diagnostic Accuracy**:
   - Area Under the Receiver Operating Characteristic curve (AUROC) calculated non-parametrically with 95% DeLong confidence intervals.
   - Sensitivity, Specificity, Positive Predictive Value (PPV), and Negative Predictive Value (NPV) reported with exact two-sided 95% Wilson score confidence intervals.
2. **Subtype Stratification**:
   - Diagnostic sensitivity evaluated individually across all 5 ICH subtypes (IPH, SAH, SDH, IVH, EDH).
3. **Robustness & Noise Stratification**:
   - Scans audited against acquisition noise ($\sigma$) and motion blur artifacts ($L$), validating the preservation of discrimination observed in Test K.
4. **Health Economic & Queue Modeling**:
   - Discrete event simulation modeling door-to-read reduction (minutes saved) and modeled out-of-hours locum cost reductions.

---

## 7. Study Schedule & Milestones

| Milestone | Target Horizon | Deliverables |
|---|---|---|
| **M1: Governance & Approvals** | Months 1–2 | Caldicott Guardian approval, DPIA signed, Trust CSO sign-off under DCB0160. |
| **M2: Edge Gateway Deployment** | Month 3 | DICOM C-STORE listener configured; Phase 1 & 2 AdaBN calibration complete. |
| **M3: Shadow-Mode Ingestion** | Months 4–9 | Consecutive enrollment of $N=1,200$ head CTs and multimodal cohorts. |
| **M4: Panel Adjudication** | Month 10 | 3-consultant adjudication of all discordant studies. |
| **M5: Final Study Report** | Month 11–12 | Formal Clinical Study Report (CSR), NICE ESF Tier C submission, MHRA SaMD dossier. |

---

## 8. Investigator Sign-Off & Approvals

| Role | Name & Title | Affiliation | Date | Status |
|:---|:---|:---|:---:|:---:|
| **Chief Investigator** | Dr. [Lead Clinician], MD, FRCR | Consultant Radiologist, NHS Trust | — | `[PENDING TRUST SIGNOFF]` |
| **AI Technical Lead** | Dr. [Technical Director], PhD | Chief AI Architect, SEWA XAI | 2026-10-28 | `[APPROVED v2.0]` |
| **Clinical Safety Officer** | Dr. [CSO Name], MD | Medical Device Regulatory Lead | — | `[PENDING CSO SIGNOFF]` |
| **Health Innovation Lead** | Joanne Mewis / HIWM Partner | Health Innovation West Midlands | — | `[PENDING ADOPTION REVIEW]` |
