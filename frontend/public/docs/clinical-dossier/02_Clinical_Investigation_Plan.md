# SEWA AI — Clinical Investigation Plan (Prospective Validation)

**Document Ref:** SEWA-AI-DOC-02 · **Version:** 1.0 · **July 2026**
**Builds on:** IRAS Protocol SG-SEWA-AI-2026-V1 v4.0

---

## 1. Study Title

*Prospective, Multi-Centre Clinical Validation of SEWA AI — a Sovereign Multi-Engine Vision-Language
Model System — for Automated Diagnostic Radiology Triage in NHS Acute Services.*

---

## 2. Objectives

### 2.1 Primary Objective
To evaluate the **diagnostic accuracy** of SEWA AI triage decisions against consultant radiologist
ground-truth, measured by sensitivity, specificity, PPV, NPV and AUC-ROC, within a prospective NHS
workflow.

### 2.2 Secondary Objectives
1. Evaluate the **uncertainty quantification safety gate** (U = 0.6 x sigma2_ep + 0.4 x sigma2_al): escalation trigger rate; false-negative rate among escalated cases; correlation between uncertainty and error.
2. Evaluate the **Nine-Layer Metacognition Gate** hallucination-risk score H: BLOCK rate and its relationship to clinician-override rate.
3. Subgroup performance by age band, sex, modality (CXR/CR/DX, CT head, CT chest, CT angiography), and scanner manufacturer.
4. Inter-engine agreement (Fleiss' kappa) and its relationship to composite uncertainty.
5. **Workflow impact:** time from scan acquisition to radiologist notification (door-to-alert), compared with the 4.2-hour median urgent-report baseline.

### 2.3 Exploratory Objectives
1. Benchmark against published performance of deployed radiology AI.
2. Clinician cognitive-load and alert-fatigue assessment (e.g., NASA-TLX, alert-fatigue score).

---

## 3. Study Design

| Element | Specification |
|---|---|
| Type | Prospective, multi-centre, non-interventional service-evaluation / clinical investigation |
| Blinding | Single-blind (AI output generated without access to ground-truth report) |
| Control | Consultant radiologist report as ground truth |
| Randomisation | Not applicable |
| Sites | 4 NHS Acute Trusts (UHCW, King's College Hospital, UHB, QBM) — proposals submitted |
| Duration | 6 months data collection + 6 months analysis (12 months total) |
| Countries | United Kingdom (England) |

> **Non-interventional justification.** SEWA AI operates as decision support behind the radiologist.
> No change to patient management is imposed by the device; the AI output is advisory and
> human-sign-off is mandatory. The study uses routinely acquired imaging and reports.

---

## 4. Study Population & Eligibility

### 4.1 Inclusion
- Adults >=18 years at imaging.
- Modality: CXR/CR/DX, CT head, CT chest, CT angiography.
- Finalised consultant radiologist report available.
- DICOM with valid Modality and Body Part (CHEST/HEAD/THORAX) tags.
- Imaging between 01 Jan 2018 and study end.

### 4.2 Exclusion
- Paediatric (<18y).
- Corrupted/unreadable DICOM.
- Missing finalised report.
- Missing age/sex metadata.
- Duplicate records.
- Out-of-range acquisition dates.

---

## 5. Sample Size & Justification

**Target:** up to 14,200 historical + prospective thoracic imaging records across 4 sites.

**Power calculation (primary endpoint).** Assuming a hypothesized sensitivity >=0.90 for critical
findings and a two-sided alpha = 0.05, a sample providing ~1,400 positive (critical) cases yields
>90% power to estimate sensitivity within +/-5% absolute. With an expected critical-positive
prevalence of ~10% across 14,200 studies, the positive-event count comfortably exceeds this
threshold. Formal precision-based calculation to be finalised by the independent statistician in the
locked SAP (SEWA-AI-DOC-03).

---

## 6. Procedures

| Step | Activity | Responsible |
|---|---|---|
| 1 | Extract imaging + reports from Trust PACS/RIS | NHS IT / TRE Data Manager |
| 2 | Pseudonymise within WMSDE TRE; scrub direct identifiers | WMSDE Data Manager |
| 3 | Run SEWA AI four-engine pipeline; compute U and H | SEWA AI System |
| 4 | Apply escalation rule (U>0.25 escalate; H>0.30 BLOCK) | SEWA AI System |
| 5 | Clinician reviews AI-flagged studies; signs off | Consultant radiologist |
| 6 | Compare AI triage vs ground-truth; adjudicate discordances | 3-radiologist panel (blinded) |
| 7 | Statistical analysis per locked SAP | Independent statistician |

---

## 7. Safety & Risk Controls

- Mandatory human-in-the-loop at the **database layer** (SIGNED=true required before DELIVERED) — cannot be bypassed by any UI or API.
- Uncertainty escalation (U>0.25) and hallucination BLOCK (H>0.30) operate independently of confidence.
- All critical scans require radiologist sign-off; the device never auto-dispatches a final diagnosis.
- Adverse device effects (e.g., missed critical finding that reaches clinical team) logged and reported per serious-breach governance.

---

## 8. Governance & Approvals

| Approval | Mechanism | Status |
|---|---|---|
| Ethics | REC via IRAS 372596 | In progress |
| HRA | HRA Approval | Engaging (Assessor S. Thorpe) |
| R&D | NHS Trust R&D offices x4 | Proposals submitted |
| MHRA | Notice of No Objection (pre-prospective) | Q3 2026–Q1 2027 |
| Data | WMSDE REC 24/YH/0022 + CAG 24/CAG/0025 | Umbrella sought |

---

## 9. Critical Path

1. Confirm **Chief Investigator** (NHS/University consultant radiologist) — HRA mandatory blocker.
2. Lock SAP with independent statistician.
3. Obtain REC/HRA/MHRA approvals.
4. Commence prospective data collection.

---

## 10. Dissemination

Results submitted to peer-reviewed journals (npj Digital Medicine; Radiology: AI) regardless of
outcome; reported per TRIPOD-AI and DECIDE-AI; lay summary on sewaxai.health.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · info@sewaxai.health
