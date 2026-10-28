# NHS Governance Pack: Caldicott Guardian Submission & DPIA Dossier

**Document Identifier**: `SEWA-GOV-STEP1-001`  
**Target Recipient**: The Caldicott Guardian, Data Protection Officer (DPO), and Head of Research & Governance, Participating NHS Foundation Trust  
**Subject**: Information Governance Approval & Caldicott Guardian Review for SEWA-SHADOW-1 Prospective Observational Study  
**Governing Software**: SEWA XAI Multimodal Clinical Triage Platform  
**Security Classification**: Official-Sensitive (Commercial / Clinical Governance)

---

## Part A: Caldicott Guardian Formal Submission Memorandum

### 1. Project Summary & Purpose
**Project Title**: Multicenter Prospective Observational Shadow-Mode Clinical Validation of Multimodal Artificial Intelligence with Metacognitive Safety Gating for Acute Triage (`SEWA-SHADOW-1`).  
**Investigational Sponsor**: SEWA AI Health Technologies Ltd in collaboration with Health Innovation West Midlands (HIWM).  
**Chief Investigator**: Dr. [Consultant Radiologist Name], MD, FRCR, Department of Radiology.

### 2. The 8 Caldicott Principles Compliance Review

| Caldicott Principle | Project Implementation & Safeguards | Compliance Status |
|:---|:---|:---:|
| **1. Justify the purpose(s)** | Purpose is evaluating diagnostic safety and latency reduction in acute emergency head CT and screening imaging prior to clinical implementation, addressing regional radiologist shortages. | **COMPLIANT** |
| **2. Don't use personal confidential data unless absolutely necessary** | No direct patient identifiable data is processed in the cloud. Direct identifiers are permanently removed at the hospital edge gateway before transit. | **COMPLIANT** |
| **3. Use the minimum necessary personal confidential data** | Only raw pixel matrices and technical DICOM acquisition metadata (kVp, slice thickness, reconstruction kernel) are processed. Patient Name, NHS Number, DOB, and Address are stripped. | **COMPLIANT** |
| **4. Access to personal confidential data should be on a strict need-to-know basis** | In-hospital edge appliance is accessible only by authorized Trust PACS administrators. AI platform cloud access is restricted to salted pseudonymous IDs. | **COMPLIANT** |
| **5. Everyone with access should be aware of their responsibilities** | All study personnel hold active GCP certification and NHS Information Governance training certificates. | **COMPLIANT** |
| **6. Comply with the law** | Fully compliant with UK Data Protection Act 2018, UK GDPR Articles 6(1)(e) and 9(2)(j), and the Common Law Duty of Confidentiality. | **COMPLIANT** |
| **7. The duty to share information for individual care is as important as the duty to protect confidentiality** | An ethical escalation protocol is established to inform the Caldicott Guardian if a critical missed finding is identified during post-hoc panel audit. | **COMPLIANT** |
| **8. Inform patients about how their confidential information is used** | Transparent public notification provided via Trust website, patient notices in the emergency department, and the national opt-out registry honored. | **COMPLIANT** |

---

## Part B: Common Law Duty of Confidentiality & Section 251 Exemption Analysis

### 1. Nature of the Data Flow
Data flows from the hospital PACS to the **SEWA Edge De-ID Gateway** located inside the Trust firewall. Direct identifiers (Patient Name, NHS Number, DOB, Hospital Number, Accession Number) are stripped at the edge prior to any external transmission.

### 2. Common Law Duty of Confidentiality Justification
Because data leaving the Trust edge boundary is **pseudonymized in accordance with ICO Anonymisation Code of Practice and DICOM PS 3.15 Annex E Basic Profile**, the common law duty of confidentiality is satisfied:
- The key connecting the pseudonymous Study ID (`SHADOW-WM-<SITE>-<HASH>`) to the internal patient hospital record is maintained strictly within the Trust's secure network and is never shared with SEWA AI or cloud operators.
- No confidential patient disclosures occur outside the Trust boundary.

### 3. National Data Opt-Out (NDOO)
The hospital edge gateway cross-references the Trust's local copy of the NHS National Data Opt-Out repository. Any patient with an active opt-out preference is automatically excluded and purged at the edge prior to processing.

---

## Part C: Turnkey Data Protection Impact Assessment (DPIA)

### 1. Lawful Basis under UK GDPR
- **Article 6(1)(e) (Public Task)**: Processing is necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller (improving NHS emergency care quality and safety).
- **Article 9(2)(j) (Special Category Data - Scientific Research & Statistical Purposes)**: Processing is necessary for archiving purposes in the public interest, scientific or historical research purposes, or statistical purposes in accordance with Article 89(1) based on UK law (Section 19, Data Protection Act 2018).

### 2. Data Flow Architecture & Technical Controls
1. **Edge Appliance**: Linux Docker appliance deployed within the hospital DMZ on the PACS VLAN.
2. **De-Identification Engine**: Automated DICOM parser removes tags conforming to DICOM PS 3.15 Annex E:
   - Scrubbed tags: `(0010,0010)` PatientName, `(0010,0020)` PatientID, `(0010,0030)` PatientBirthDate, `(0008,0050)` AccessionNumber, `(0008,0080)` InstitutionName, `(0008,1030)` StudyDescription.
   - Preserved tags: `(0018,0050)` SliceThickness, `(0018,0060)` KVP, `(0018,1210)` ConvolutionKernel, `(0028,1050)` WindowCenter, `(0028,1051)` WindowWidth.
3. **Cryptographic Pseudonymization**: HMAC-SHA256 hash using a salt known only to the Trust.
4. **Transit Security**: Encrypted tunnel using **mTLS 1.3** (TLS_AES_256_GCM_SHA384) with mutual certificate verification.
5. **Cloud Sovereign Hosting**: Hosted in **Microsoft Azure UK South (London) / Sweden Central** healthcare-compliant dedicated sovereign virtual network.
6. **Data Retention & Disposal**: Data retained for the duration of the 12-month study, plus 5 years archiving in accordance with GCP standards, followed by automated cryptographic erasure.

---

## Part D: Caldicott Guardian Sign-Off Form

```
DECISION OF THE CALDICOTT GUARDIAN / INFORMATION GOVERNANCE COMMITTEE

Project: SEWA-SHADOW-1 Prospective Observational Study
Participating Trust: __________________________________________________

[  ] APPROVED: The study is approved as a Service Evaluation / Clinical Quality Improvement 
     project with zero patient care interference. The edge de-identification and DPIA 
     safeguards satisfy Caldicott Principles and UK GDPR requirements.

[  ] APPROVED WITH CONDITIONS: Approved subject to the following technical / governance stipulations:
     _____________________________________________________________________________________________

[  ] REFERRED TO IRAS / HRA: Full national Research Ethics Committee approval required.

Name: _____________________________________________________________
Title: Caldicott Guardian / DPO, [Trust Name]
Signature: ________________________________________________________
Date: _____ / _____ / 2026
```
