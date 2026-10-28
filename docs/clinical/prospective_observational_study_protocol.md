# Clinical Study Protocol: SEWA-SHADOW-1

**Full Title**: Multicenter Prospective Observational Validation of Multimodal Artificial Intelligence for Clinical Triage and Metacognitive Safety Gating in Acute Care  
**Short Title**: SEWA-SHADOW-1  
**Study Phase**: Pre-Market Prospective Observational Validation (TRL 6 / IDE Non-Significant Risk)  
**Governing Principle**: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** (Transitioning to Real-World Clinical Verification)  
**Version**: 1.0 (2026-10-28)

---

## 1. Administrative Structure & Ethical Governance

### 1.1 Regulatory Classification (FDA / EU MDR)
- **United States**: Investigational Device Exemption (IDE) **Non-Significant Risk (NSR)** study under 21 CFR 812.2(b).
- **European Union**: Post-market clinical follow-up / pre-market observational study under EU MDR 2017/745 Article 62.
- **UK**: MHRA observational research study in accordance with NHS Health Research Authority (HRA) guidelines.

### 1.2 Ethics Review & Informed Consent
- Conducted in full compliance with the Declaration of Helsinki and ICH-GCP (E6 R2).
- **Blinded Shadow-Mode Design**: Because the investigational software operates strictly in parallel without altering clinical patient management or delivering live alerts to treating clinicians, an Institutional Review Board (IRB) / Independent Ethics Committee (IEC) **waiver of individual informed consent** is requested under 45 CFR 46.116(f).

---

## 2. Study Objectives & Endpoints

```
[Hospital PACS / VNA]
          │
          ├─────────────────────────────────────────┐
          ▼ (Standard of Care)                      ▼ (DICOM C-STORE Mirror)
   [Radiologist / Clinician]                [SEWA AI Edge Listener]
          │ (Signs Diagnostic Report)               │ (Zero Clinical Feedback)
          │                                         ▼
          │                                 [Multimodal Inference Engine]
          │                                  • Head CT (EfficientNet-B0)
          │                                  • Mammography (EfficientNet-B0 INT8)
          │                                  • Retinal (EfficientNet-B0 INT8)
          │                                         │
          │                                         ▼
          │                                 [Metacognitive Safety Gate]
          │                                  • Layer 6 Negation Engine
          │                                  • Split Conformal Bound (FNR ≤ 5%)
          │                                         │
          └─────────────────┬───────────────────────┘
                            ▼
              [Post-Hoc Study Adjudication]
               (learningLoop.ts Evaluation)
```

### 2.1 Primary Diagnostic Endpoints
1. **Acute Head CT (ICH Triage)**:
   - Study-level AUROC $\ge 0.80$ against multi-reader ground truth (3 board-certified neuroradiologists).
   - Sensitivity $\ge 90.0\%$ at fixed specificity $\ge 85.0\%$.
2. **Screening Mammography**:
   - Microcalcification and soft-tissue mass AUROC $\ge 0.85$.
   - Concordance with ground truth BI-RADS assessment $\ge 80.0\%$.
3. **Retinal Fundus Photography**:
   - Referable Diabetic Retinopathy (Moderate NPDR or worse) Sensitivity $\ge 90.0\%$.
   - Urgent sight-threatening retinopathy alert accuracy $\ge 95.0\%$.

### 2.2 Primary Safety Endpoints (Metacognition & Risk Control)
1. **Contradiction Alert Suppression (Metacognition Layer 6)**:
   - $\ge 95.0\%$ suppression of false AI alerts contradicted by the signed radiologist report.
2. **Conformal Risk Bound Guarantee**:
   - Empirical False Negative Rate $\text{FNR} \le 5.0\%$ across all enrolled patient studies using site-calibrated threshold $\lambda$.

### 2.3 Secondary Operational Endpoints
1. Simulated turnaround time reduction in emergency triage queues (modeled door-to-read delta).
2. Rate of safe autonomous clearing of normal non-contrast CT scans ($\ge 10.0\%$).

---

## 3. Site Onboarding & Scanner Calibration (ADR 004 Protocol)

Before activating shadow-mode ingestion at any participating clinical site, the site engineering team executes the **3-Phase Calibration Protocol**:

```
[Phase 1: Zero-Label AdaBN Warm-Up]
• Ingest 50–100 historical anonymized scans from local scanner hardware.
• Recalibrate BatchNorm running moments (μ, σ²) to local reconstruction kernels.
          │
          ▼
[Phase 2: Split Conformal Calibration]
• Ingest 100 locally adjudicated historical scans.
• Derive optimal risk threshold λ guaranteeing FNR ≤ 5.0%.
          │
          ▼
[Phase 3: Active Shadow-Mode Enrollment]
• Begin prospective parallel ingestion.
```

---

## 4. Patient Eligibility & Sample Size

### 4.1 Inclusion Criteria
1. Patients aged $\ge 18$ years undergoing diagnostic imaging at participating emergency or outpatient departments:
   - Non-contrast axial head CT for suspected trauma, stroke, or headache.
   - Bilateral full-field digital mammography (FFDM) screening.
   - 2-field digital retinal fundus photography for diabetic retinopathy screening.
2. Complete DICOM metadata and valid image reconstruction.

### 4.2 Exclusion Criteria
1. Substantial motion artifacts rendering scan clinically uninterpretable by radiologist.
2. Contrast-enhanced initial scans (for non-contrast triage arm).
3. Previous neurosurgical intervention with massive hardware distortion.

### 4.3 Statistical Power & Sample Size Calculation
Based on empirical variance observed in Tests A, C, D, and I:
- **Head CT Cohort**: $N = 1,200$ consecutive scans (expected ICH prevalence $\sim 15\%$, $N_{\text{pos}} \approx 180$). Provides $80\%$ power at two-sided $\alpha = 0.05$ to detect sensitivity $\ge 90\%$ (lower bound $> 85\%$).
- **Mammography Cohort**: $N = 800$ bilateral examinations.
- **Retinal Cohort**: $N = 600$ diabetic patient evaluations.

---

## 5. Data Privacy, Governance & Audit Trail

1. **De-Identification**: All DICOM instances undergo automated de-identification (PS 3.15 Annex E Basic Profile) at the hospital edge gateway prior to TLS 1.3 transmission to the Azure Sweden Central environment.
2. **Immutable Audit Logging**:
   - Inferences logged immediately to Azure PostgreSQL (`MetacognitionAuditLog`, `ExplainabilityReport`, `CalibrationRecord`).
   - Zero-fabrication enforcement: Sites with $N < 10$ studies report metrics as `null` with audit flag `insufficient_data`.
3. **Data Protection Agreements**: BAA / DPA executed between sponsor institution and Azure healthcare tenant.

---

## 6. Investigator Sign-Off & Approvals

| Role | Name & Title | Affiliation | Date | Signature |
|:---|:---|:---|:---:|:---:|
| **Principal Investigator** | Dr. [PI Name], MD, FRCR | Emergency Radiology Dept | — | `[PENDING IRB]` |
| **Co-Investigator (AI/Bioeng)** | Dr. [AI Lead], PhD | Biomedical Engineering | — | `[PENDING IRB]` |
| **Clinical Safety Officer** | Dr. [Safety Lead], MD | Medical Device Regulatory | — | `[PENDING IRB]` |
