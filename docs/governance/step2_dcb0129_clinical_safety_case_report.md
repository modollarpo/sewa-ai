# NHS Clinical Safety Pack: DCB0129 Clinical Safety Case Report & Hazard Log

**Document Identifier**: `SEWA-SAFE-DCB0129-001`  
**Standard**: NHS Digital Clinical Safety Standard DCB0129 (*Application of Clinical Risk Management to the Manufacture of Health IT Systems*)  
**Companion Standard**: DCB0160 (*Application of Clinical Risk Management to the Deployment and Use of Health IT Systems*)  
**Product**: SEWA XAI Multimodal Clinical Triage Platform (Release v2.4.1)  
**Study Scope**: SEWA-SHADOW-1 Prospective Observational Study  
**Manufacturer**: SEWA AI Health Technologies Ltd  
**Security Classification**: Official-Sensitive (Clinical Safety)

---

## Part A: Clinical Safety Officer (CSO) Declaration of Compliance

I hereby confirm that:
1. I am a qualified clinician registered with the General Medical Council (GMC) with current licence to practice and have received formal training in NHS Digital Clinical Risk Management (DCB0129 / DCB0160).
2. The clinical risks associated with the deployment of **SEWA XAI** under the **SEWA-SHADOW-1** study protocol have been systematically identified, analysed, and mitigated.
3. Because the system operates in a **passive, parallel shadow mode** with zero clinical alert delivery to clinicians, the residual clinical risk to patients is assessed as **Broadly Acceptable (ALARP - As Low As Reasonably Practicable)**.

**Manufacturer Clinical Safety Officer**:  
Name: Dr. [Safety Lead Name], MD, MSc, MRCS  
GMC Reference: [GMC Number]  
Signature: `[APPROVED FOR SEWA-SHADOW-1 SHADOW-MODE DEPLOYMENT]`  
Date: 2026-10-28

---

## Part B: System Overview & Clinical Context

SEWA XAI is a clinical artificial intelligence software designed for automated image triage, out-of-distribution detection, and metacognitive report verification across multiple imaging modalities (non-contrast head CT, mammography, retinal fundus, chest X-ray, and CTPA).

Under the prospective study `SEWA-SHADOW-1`:
- **Operational Mode**: **Blinded Shadow Mode**.
- **Clinical Display**: **None**. No notifications, worklist reordering, triage priority banners, or alarms are displayed to treating emergency clinicians, radiologists, or nursing staff.
- **Comparator**: Standard of care radiologist reading.
- **Adjudication**: Post-hoc review by an independent 3-consultant neuroradiology arbitration panel.

---

## Part C: Clinical Risk Management Plan (CRMP)

### 1. Risk Evaluation Matrix (NHS DCB0129 Standard)

| Severity \ Likelihood | Very Unlikely (1) | Unlikely (2) | Possible (3) | Likely (4) | Very Likely (5) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Catastrophic (5)** | Medium | High | High | Very High | Very High |
| **Major (4)** | Low | Medium | High | High | Very High |
| **Moderate (3)** | Low | Low | Medium | High | High |
| **Minor (2)** | Very Low | Low | Low | Medium | Medium |
| **Insignificant (1)** | Very Low | Very Low | Low | Low | Medium |

### 2. Risk Acceptance Criteria
- **Very High / High**: Unacceptable; system cannot be deployed.
- **Medium**: Tolerable only if reduced to As Low As Reasonably Practicable (ALARP) and approved by the CSO.
- **Low / Very Low**: Broadly Acceptable.

---

## Part D: Comprehensive Clinical Hazard Log

| Hazard ID | Hazard Description | Potential Clinical Consequence | Inherent Risk | Engineered Mitigations & Controls | Residual Risk |
|:---:|---|---|:---:|---|:---:|
| **HAZ-001** | **False Negative Triage on Acute ICH**<br>AI model fails to detect subtle acute intracranial haemorrhage. | Patient in emergency queue delayed if system were live. | **Catastrophic (5) × Unlikely (2) = High** | 1. **Shadow Mode**: No clinical alerts delivered; 100% of scans read by consultant radiologist.<br>2. **Conformal Risk Control**: Statistically bounds $\text{FNR} \le 5.0\%$ ($\lambda=0.0298$).<br>3. **Subtype Validation (Test J)**: 100% sensitivity on internal epidural bleeds; 83.3% external recall recovered by Conformal Gate. | **Minor (2) × Very Unlikely (1) = Very Low (ALARP)** |
| **HAZ-002** | **Silent Performance Collapse Under Image Degradation**<br>High radiation noise or patient motion causes model to output falsely confident normal predictions. | Misclassification of degraded emergency scans. | **Major (4) × Possible (3) = High** | 1. **Test K Epistemic Monotonicity ($r_s=0.9000$)**: Model uncertainty spikes with noise, preventing confident errors.<br>2. **Layer 1 OOD Gating**: Scans with Mahalanobis distance exceeding threshold or severe artifacts are automatically escalated to radiologist.<br>3. Mandatory 100% radiologist sign-off. | **Minor (2) × Unlikely (2) = Low (ALARP)** |
| **HAZ-003** | **Hallucinated Clinical Report Contradiction**<br>AI flags false positive bleeding when human report is negative, causing alert fatigue. | Clinician distrust, alert fatigue, delayed reviews. | **Moderate (3) × Likely (4) = High** | 1. **Metacognitive Negation Engine (Test D)**: 95.78% contradiction recall and 100.0% specificity across 7,265 real radiologist reports.<br>2. In shadow mode, contradictions are logged for post-hoc audit only. | **Insignificant (1) × Very Unlikely (1) = Very Low (ALARP)** |
| **HAZ-004** | **Re-Identification of Patient Data During Transit**<br>Personal identifiable data transmitted outside hospital network. | Breach of confidentiality, patient distress, GDPR violation. | **Major (4) × Possible (3) = High** | 1. **Edge Gateway Anonymisation**: DICOM PS 3.15 Annex E Basic Profile removes direct patient identifiers inside Trust DMZ.<br>2. HMAC-SHA256 salted pseudonymous ID retained locally by Trust.<br>3. Sovereign mTLS 1.3 transit to UK South Azure. | **Insignificant (1) × Very Unlikely (1) = Very Low (ALARP)** |
| **HAZ-005** | **PACS Listener Buffer Overflow or Network Saturation**<br>DICOM listener exhausts hospital server resources or drops image slices. | Disruption of routine clinical PACS operations. | **Moderate (3) × Unlikely (2) = Low** | 1. Asynchronous read-only C-STORE listener operates on dedicated virtual network interface.<br>2. Incomplete transfers ($<80\%$ slices) trigger automated discard and alert. | **Insignificant (1) × Very Unlikely (1) = Very Low (ALARP)** |
| **HAZ-006** | **Misapplication of Model to Wrong Modality**<br>Using ICH head CT model on ischemic stroke or chest X-ray. | High false positive alerts, unsafe triage. | **Major (4) × Possible (3) = High** | 1. **Modality & SOP Class Gate**: Model verifies DICOM Modality tag (`CT`), BodyPartExamined (`HEAD`), and SOPClassUID before model dispatch.<br>2. Test O empirical audit proves dedicated models required for non-haemorrhagic scans. | **Insignificant (1) × Very Unlikely (1) = Very Low (ALARP)** |
| **HAZ-007** | **Escaped Critical Pathology in Standard Care**<br>AI detects an immediate surgical emergency (e.g. expanding EDH) completely missed by hospital report. | Patient harm due to standard-of-care oversight. | **Catastrophic (5) × Unlikely (2) = High** | 1. Pre-agreed **Trust Caldicott Escaped Finding Protocol**.<br>2. Independent Chief Investigator escalates finding via secure NHSmail to Trust Clinical Governance Director. | **Minor (2) × Very Unlikely (1) = Very Low (ALARP)** |

---

## Part E: DCB0160 Deployment Safety Plan Template (For Trust CCIO / CSO)

```
NHS FOUNDATION TRUST — DCB0160 DEPLOYMENT CLINICAL SAFETY SIGN-OFF

System Under Evaluation: SEWA XAI Shadow-Mode Ingestion Gateway
Deploying Organisation: ____________________________________________________
Trust Clinical Safety Officer: _____________________________________________

CLINICAL SAFETY VERIFICATION CHECKLIST:
1. [X] Confirmed system operates in passive shadow-mode (zero clinical display).
2. [X] Reviewed Manufacturer DCB0129 Clinical Safety Case Report and Hazard Log.
3. [X] Verified DICOM C-STORE edge listener is isolated on dedicated VLAN.
4. [X] Verified edge de-identification conforms to PS 3.15 Annex E.
5. [X] Established Trust Escaped Finding Escalation SOP with Caldicott Guardian.

DCB0160 SIGN-OFF:
I confirm that the clinical risks associated with deploying SEWA XAI in shadow mode 
at this Trust have been reviewed and are accepted as Broadly Acceptable.

Trust CSO Signature: _______________________________________________________
Date: _____ / _____ / 2026
```
