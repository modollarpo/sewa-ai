# SEWA AI — Data Protection Impact Assessment (DPIA-001)

![SEWA AI](../assets/logo-horizontal.svg)

<div class="cover">
  <img src="../assets/logo-horizontal.svg" alt="SEWA AI" />
  <h1>Data Protection Impact Assessment</h1>
  <p class="subtitle">UK GDPR Art. 35 · SaMD Clinical Validation Study</p>
  <p class="classification">OFFICIAL-SENSITIVE</p>
</div>

**Document Ref:** DPIA-001  
**Version:** v1.0  
**Date:** March 2026 (Revised July 2026)  
**Controller:** Storegrill Inc Ltd t/a SEWA AI  
**DPO:** dpo@sewaxai.health

---

## 1. Need for a DPIA

Processing of **special category data** (health data — DICOM medical images, radiology reports) for AI model validation meets the Article 35 threshold. The processing involves systematic evaluation of personal aspects (automated triage scoring) and processing of sensitive data on a **large scale** (5,000+ studies per NHS Trust site).

---

## 2. Processing Description

| Domain | Detail |
|--------|--------|
| **Purpose** | Clinical validation of SEWA AI VLM for automated CT head triage |
| **Data subjects** | Adult patients (≥18) presenting for CT head at participating NHS Trusts |
| **Data categories** | Pseudonymised DICOM images, structured radiology reports, examination metadata |
| **Sources** | NHS Trust PACS / RIS (retrospective cohort) |
| **Volume** | ~15,000 studies across 3 Trusts |
| **Retention** | 90 days post-study; audit logs 7 years |
| **Recipients** | SEWA AI (processor), Azure UK West (sub-processor, HSCN-connected) |
| **International transfer** | None — all processing within UK |

---

## 3. Necessity & Proportionality

| Principle | Assessment |
|-----------|-----------|
| **Lawfulness** | Art. 6(1)(e) public task + Art. 9(2)(j) research + DPA 2018 Sch. 1 Part 1 |
| **Fairness** | Patients informed via PIL; opt-out mechanism (Type 1 + National Data Opt-Out) respected |
| **Purpose limitation** | Data used only for validation study — not for model training or marketing |
| **Data minimisation** | Only CT head studies + corresponding reports; no direct identifiers beyond imaging |
| **Storage limitation** | 90-day retention with automated secure deletion |
| **Accuracy** | AI output is triage-only; always verified by consultant radiologist |
| **Security** | AES-256, TLS 1.3, RBAC + JIT, Confidential Ledger, HSCN boundary |

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|-----------|--------|-----------|----------|
| Re-identification via DICOM metadata | Low | High | DICOM tag scrubbing at source (removes PatientName, PatientID, etc.) | Low |
| Data breach via HSCN | Very Low | High | HSCN/PDN VPN Gateway + ExpressRoute; private endpoints only | Very Low |
| Insider access to pseudonymised data | Low | Medium | JIT access, PIM approval, full audit trail; no direct identifiers stored | Low |
| AI output misattribution causing clinical harm | Low | High | Consultant radiologist always in loop; VLM as co-pilot only | Low |
| Section 251 non-compliance | Low | Medium | IRAS submission includes Reg. 5 support application | Low |

---

## 5. Data Subject Rights

Data subjects may exercise their rights (access, rectification, erasure, restriction, portability, objection) by contacting their Trust's PALS/DPO. SEWA AI will action any valid request through the Trust as Data Controller within **one calendar month**.

---

## 6. Consultation

| Stakeholder | Status |
|------------|--------|
| ICO | Pre-consultation not required — processing is low-risk per ICO criteria |
| NHS Trust DPO (each site) | Pending — part of site initiation |
| PPIE representatives | Completed — see SEWA-AI-DOC-10 |

---

## 7. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Data Protection Officer | | | |
| Chief Investigator | Dolapo Olaitan Ariyo | | |
| Caldicott Guardian | | | |

---

<div class="page-footer">
  SEWA AI — Confidential · © Storegrill Inc Ltd 2026 · DPIA-001 v1.0
</div>
