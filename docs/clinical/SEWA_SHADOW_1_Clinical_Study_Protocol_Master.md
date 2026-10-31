# Clinical Study Protocol Master Specification: SEWA-SHADOW-1

**Document Identifier**: `SEWA-CLIN-PROT-001`  
**Full Study Title**: Multicenter Prospective Observational Shadow-Mode Clinical Validation of Multimodal Artificial Intelligence with Metacognitive Safety Gating for Acute Triage and Screening  
**Short Title / Acronym**: **SEWA-SHADOW-1**  
**Study Phase**: Pre-Market Prospective Observational Clinical Validation (TRL 6 / Non-Significant Risk)  
**Governing Principle**: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** (Transitioning to Prospective NHS Clinical Verification)  
**Version**: 2.0 (Master Release, 2026-10-28)  
**Target Sponsoring Institution**: SEWA AI a Storegrill Inc Ltd in partnership with West Midlands Academic Health Science Network / Health Innovation West Midlands (HIWM)  
**Target Clinical Sites**: Acute NHS Foundation Trusts across the West Midlands (e.g., University Hospitals Birmingham NHS Foundation Trust, University Hospitals Coventry & Warwickshire NHS Trust)

---

## Protocol Sign-Off & Investigator Declaration

By signing below, the undersigned confirm that they have read, understood, and agreed to conduct the study in accordance with this protocol, the Declaration of Helsinki, ICH Good Clinical Practice (E6 R2), UK Data Protection Act 2018 / UK GDPR, and applicable NHS Digital Clinical Safety Standards (DCB0129 / DCB0160).

| Role | Name, Credentials & Title | Institution / Department | Signature | Date |
|:---|:---|:---|:---:|:---:|
| **Chief Investigator (CI)** | Dr. [Lead Clinician Name], MD, FRCR<br>Consultant Neuroradiologist | Department of Clinical Radiology, Acute NHS Trust | `[PENDING TRUST REVIEW]` | — |
| **Co-Investigator (AI Lead)** | Dr. [Technical Lead Name], PhD<br>Chief AI Scientist | SEWA AI Research & Development | `[APPROVED v2.0]` | 2026-10-28 |
| **Clinical Safety Officer (CSO)** | Dr. [Safety Lead Name], MD, MSc<br>Manufacturer Clinical Safety Officer | SEWA AI Regulatory Affairs | `[PENDING CSO SIGNOFF]` | — |
| **Trust Clinical Safety Officer** | Dr. [Trust CCIO Name], MBChB, FRCR<br>Chief Clinical Information Officer | Participating NHS Trust | `[PENDING TRUST REVIEW]` | — |
| **Academic Innovation Lead** | Joanne Mewis / HIWM Partner<br>Senior Innovation Advisor | Health Innovation West Midlands | `[PENDING ADOPTION REVIEW]` | — |

---

## 1. Study Rationale & Clinical Background

### 1.1 The NHS Emergency Diagnostic Bottleneck
Diagnostic imaging services across NHS England face an unprecedented operational crisis:
1. **Demand Expansion**: Over 2.5 million emergency head CT examinations are performed annually (NHS Digital Diagnostic Imaging Dataset - DID), expanding at 7%–9% year-on-year.
2. **Workforce Shortfall**: The Royal College of Radiologists (RCR) 2023 Census identifies a 29% UK consultant radiologist shortfall (projected to reach 39% by 2030). In acute West Midlands trusts, emergency radiologist vacancy rates average 26%.
3. **Queue Latency**: Routine out-of-hours head CT queues delay acute intracranial haemorrhage (ICH) review by 120 to 240+ minutes, frequently breaching the NICE 60-minute imaging target for acute stroke and traumatic brain injury.
4. **Financial Burden**: Annual locum and outsourced teleradiology expenditures exceed £285 million in England, while acute neurological bed-days cost £450–£600 per day.

### 1.2 Technology Solution: SEWA XAI Shadow-Mode
SEWA XAI provides an automated, sub-1.5 second CPU-executable clinical triage and safety platform. Prior to clinical deployment, algorithm safety must be established without exposing patients to investigational diagnostic risk. 

**SEWA-SHADOW-1** deploys an isolated, non-interfering **shadow-mode architecture**:
- Mirrored DICOM C-STORE network ingestion directly from hospital PACS.
- Real-time zero-label scanner domain adaptation (AdaBN, ADR 004).
- 7-layer defense against hallucination and out-of-distribution failure.
- Statistically guaranteed False Negative Rate ($\text{FNR} \le 5.0\%$) using Split Conformal Risk Control.
- **Zero display** of AI predictions to clinicians during active patient care.
- Post-hoc arbitration by a 3-consultant expert neuroradiology panel to establish clinical ground truth.

---

## 2. Regulatory & Ethical Framework

### 2.1 UK MHRA & NHS Health Research Authority (HRA) Status
- **Non-Interventional Study**: Under the UK Medical Devices Regulations 2002 (SI 2002 No 618), software operating in pure shadow mode without influencing clinical diagnosis or treatment does not constitute an interventional clinical investigation.
- **Service Evaluation vs Research**:
  - *Primary Pathway*: Approved by participating Trust Caldicott Guardians, Information Governance leads, and R&D Directors as a **Clinical Service Evaluation & Quality Improvement Project**.
  - *Secondary Pathway*: If deemed multi-centre research by Trust R&D, protocol submitted through the UK **Integrated Research Application System (IRAS)** to an NHS Research Ethics Committee (REC).

### 2.2 Informed Consent Waiver Justification
A waiver of individual patient informed consent is requested and justified under:
1. **Zero Patient Risk**: The investigational software operates in a strictly passive, read-only mode. No patient treatment, triage priority, or clinical decision is altered by the software.
2. **Impracticability**: In emergency trauma and acute stroke populations, obtaining prior prospective consent is clinically impossible without introducing selection bias.
3. **Data Anonymisation**: All imaging data undergo automated de-identification at the hospital edge gateway in compliance with DICOM PS 3.15 Annex E Basic Profile before transmission.

### 2.3 NHS Digital Clinical Safety Standards (DCB0129 / DCB0160)
- **DCB0129**: Manufacturer Clinical Safety Case Report (CSCR) and Hazard Log maintained by SEWA AI.
- **DCB0160**: Trust-level deployment safety case signed by the participating Trust Clinical Safety Officer.

---

## 3. Study Objectives & Endpoints

```
[Hospital Imaging Scanners] (GE / Siemens / Philips / Canon)
             │
             ▼
   [Hospital PACS / VNA]
             │
     ┌───────┴─────────────────────────────────────────┐
     ▼ (Standard Care - Active)                        ▼ (Mirrored C-STORE - Passive)
[NHS Consultant Radiologist]                   [SEWA Edge De-ID Gateway]
     │                                                 │ (PS 3.15 Annex E)
     ▼                                                 ▼
[Final Signed NHS Report]                      [SEWA XAI Cloud Engine]
     │                                                 │ (Sub-1.5s CPU Triage)
     │                                                 ▼
     │                                         [Immutable Audit DB]
     │                                                 │
     └─────────────────────────┬───────────────────────┘
                               ▼
            [Discordance Detection & Arbitration]
             • Concordant (AI = Report): Confirmed
             • Discordant (AI ≠ Report): 3-Consultant Panel
```

### 3.1 Primary Confirmatory Endpoints (Tier 1: Emergency Head CT ICH Triage)
1. **Diagnostic Accuracy**: Overall non-contrast head CT study AUROC $\ge 0.80$ against panel gold standard.
2. **Subtype Diagnostic Sensitivity (Test J Confirmatory)**:
   - Epidural Haematoma (EDH — surgical emergency): Sensitivity $\ge 95.0\%$ (Target 100.0%).
   - Subarachnoid Haemorrhage (SAH — aneurysmal bleed): Sensitivity $\ge 90.0\%$.
   - Subdural Haematoma (SDH — acute/subacute): Sensitivity $\ge 90.0\%$.
   - Intraparenchymal Haemorrhage (IPH — intralobar): Sensitivity $\ge 90.0\%$.
3. **Conformal Risk Bound Guarantee**: Empirical False Negative Rate $\text{FNR} \le 5.0\%$ across all enrolled studies using site-calibrated threshold $\lambda$.
4. **Autonomous Normal Clearing**: Safe routing of $\ge 10.0\%$ true-normal scans without human review with $\text{FNR} \le 5.0\%$.
5. **Metacognitive Contradiction Suppression**: $\ge 95.0\%$ suppression of false AI alerts contradicted by the signed radiologist report.

### 3.2 Secondary Screening Endpoints (Tier 2: Outpatient Screening)
1. **Screening Mammography**: Microcalcification and soft-tissue mass AUROC $\ge 0.85$; BI-RADS concordance $\ge 80.0\%$.
2. **Retinal Fundus Photography**: Referable diabetic retinopathy (Moderate NPDR or worse) sensitivity $\ge 90.0\%$; urgent macular oedema alert accuracy $\ge 95.0\%$.

### 3.3 Exploratory Acute Endpoints (Tier 3: Acute Multimodal Expansion)
1. **Chest Radiography (Pneumothorax)**: Tension pneumothorax sensitivity $\ge 95.0\%$; NLP report contradiction recall $\ge 95.0\%$.
2. **Chest Radiography (Tuberculosis)**: Cavitary and miliary TB feature sensitivity $\ge 85.0\%$; specificity $\ge 90.0\%$.
3. **CTPA (Pulmonary Embolism)**: Acute central/bilateral PE sensitivity $\ge 90.0\%$; RV/LV strain ratio $\ge 1.0$ concordance $\ge 85.0\%$.
4. **Acute Ischemic Stroke (NCCT/DWI)**: Specificity on non-haemorrhagic ischemic CT scans (ICH False Positive Rate $\le 15.0\%$).

---

## 4. Cohort Selection & Statistical Power

### 4.1 Eligibility Criteria

#### Inclusion Criteria
1. Patients aged $\ge 18$ years undergoing diagnostic imaging at participating emergency or outpatient departments.
2. Examinations belonging to target study modalities:
   - Non-contrast axial head CT (slice thickness $\le 5\text{ mm}$).
   - Full-field digital mammography (FFDM, MLO and CC views).
   - Digital retinal fundus photography (macula- and optic disc-centred).
   - Frontal chest radiography (AP/PA).
   - Contrast-enhanced CT pulmonary angiography (CTPA).
3. Complete DICOM metadata and successfully reconstructed pixel arrays.

#### Exclusion Criteria
1. Corrupted DICOM files or incomplete transfer series ($< 80\%$ slices received).
2. Catastrophic patient motion rendering images clinically uninterpretable by the reporting radiologist.
3. Severe post-surgical hardware artifact completely obscuring relevant anatomical structures.

### 4.2 Sample Size & Statistical Power
- **Tier 1 Head CT Cohort ($N = 1,200$)**:
  - Based on historical NHS emergency prevalence of $15\%$ acute ICH ($N_{\text{pos}} \approx 180$).
  - For an expected sensitivity of $92.0\%$, a sample of 180 positive cases yields a 95% Wilson score confidence interval of $[87.1\%, 95.3\%]$, providing $>90\%$ power to confirm sensitivity exceeding the pre-registered $85.0\%$ lower bound ($\alpha = 0.05$, two-tailed).
- **Tier 2 Screening Cohorts**:
  - Mammography: $N = 800$ bilateral examinations.
  - Retinal Photography: $N = 600$ diabetic patient visits.
- **Tier 3 Exploratory Cohorts**:
  - Pneumothorax CXR: $N = 300$ emergency cases.
  - Tuberculosis CXR: $N = 300$ screening cases.
  - Pulmonary Embolism CTPA: $N = 200$ acute scans.
  - Ischemic Stroke: $N = 300$ acute stroke code presentations.

---

## 5. Site Onboarding & Scanner Adaptation Protocol (ADR 004)

Prior to initiating prospective data collection at any NHS trust, the local scanner hardware undergoes the **3-Phase Adaptive Calibration Protocol**:

```
[Phase 1: Zero-Label AdaBN Warm-Up]
• Ingest 50–100 historical anonymised scans per scanner model (GE, Siemens, Philips, Canon).
• Update frozen BatchNorm running statistics (μ, σ²) to eliminate vendor reconstruction bias.
• Zero clinician annotation required.
          │
          ▼
[Phase 2: Split Conformal Risk Calibration]
• Ingest 100 locally audited historical studies (50 positive, 50 confirmed normal).
• Derive trust-specific non-conformity threshold λ guaranteeing empirical FNR ≤ 5.0%.
          │
          ▼
[Phase 3: Active Prospective Shadow-Mode Ingestion]
• Real-time DICOM C-STORE parallel streaming.
• Continuous modality population stability index (PSI) and Kolmogorov-Smirnov drift monitoring.
```

---

## 6. Discrepancy Adjudication & Safety Governance

### 6.1 Independent 3-Consultant Adjudication Panel
1. The study database automatically flags any case exhibiting discordance between the official signed NHS radiologist report and the SEWA XAI output:
   - **Type A Discordance**: SEWA AI positive (high probability / urgent triage) vs NHS Report negative.
   - **Type B Discordance**: SEWA AI negative vs NHS Report positive.
2. Discordant cases are stripped of all AI outputs and original reports, and presented in randomised order to a panel of **three independent consultant radiologists**.
3. Each panelist performs an independent, blinded re-read. The consensus diagnosis (agreement of $\ge 2$ of 3 consultants) constitutes the definitive ground truth for statistical analysis.

### 6.2 Incidental Finding & Escaped Pathology Protocol
While SEWA-SHADOW-1 operates strictly non-interferingly without live clinician alerts, patient safety remains paramount:
- If post-hoc adjudication identifies a critical, life-threatening finding (e.g., expanding acute epidural haematoma or missed tension pneumothorax) that was **omitted entirely** in standard-of-care reporting and where the patient may remain at imminent acute risk:
  1. The Chief Investigator will immediately inform the Trust Caldicott Guardian and Clinical Governance Director via secure NHSmail.
  2. The hospital clinical team will evaluate the finding in accordance with standard NHS Duty of Candour and clinical governance procedures.

---

## 7. Data Privacy, Architecture & Security

1. **Hospital Edge De-Identification**:
   - The SEWA Edge Gateway executes automated de-identification adhering to **DICOM PS 3.15 Annex E Basic Profile**.
   - Direct patient identifiers (PatientName, PatientID, PatientBirthDate, AccessionNumber) are scrubbed and replaced with an irreversible cryptographically salted pseudonymous study ID (`SHADOW-WM-<SITE>-<HASH>`).
2. **Sovereign Cloud Transit & Storage**:
   - De-identified arrays transmitted via mTLS 1.3 encrypted tunnels to the sovereign **UK South (London) / Sweden Central Azure Healthcare Cloud**.
   - Immutable audit logging into Azure PostgreSQL with row-level encryption (AES-256).
3. **Information Governance Compliance**:
   - NHS Data Security and Protection Toolkit (DSPT) status: Standards Exceeded.
   - Data Protection Impact Assessment (DPIA) and Data Sharing Agreement (DSA) executed prior to network connection.

---

## 8. Statistical Analysis Plan (SAP)

1. **Primary Analysis**:
   - Non-parametric AUROC with 95% DeLong confidence intervals.
   - Sensitivity, Specificity, PPV, and NPV calculated against panel consensus gold standard with exact 95% Wilson score confidence intervals.
2. **Conformal Risk Verification**:
   - Test empirical coverage $1 - \alpha$: Confirm that $\text{FNR} = \frac{\text{False Negatives}}{\text{True Positives}} \le 0.050$.
3. **Subtype Stratification**:
   - Sensitivity evaluated individually for each ICH subtype (EDH, SAH, SDH, IPH).
4. **Health Economic Discrete Event Simulation**:
   - Model door-to-read reduction (minutes saved) by simulating queue reprioritisation under SEWA AI triage vs FIFO standard of care.
   - Model potential out-of-hours outsourced reporting cost reductions.
