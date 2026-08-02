# SEWA AI — Data Processing Agreement (DPA)

![SEWA AI](../assets/logo-horizontal.svg)

<div class="cover">
  <img src="../assets/logo-horizontal.svg" alt="SEWA AI" />
  <h1>Data Processing Agreement</h1>
  <p class="subtitle">UK GDPR Art. 28 · Data Processor to Data Controller</p>
  <p class="classification">OFFICIAL-SENSITIVE</p>
</div>

**Document Ref:** SEWA-AI-GOV-DPA-001  
**Version:** v1.0  
**Date:** July 2026  
**Sponsor:** Storegrill Inc Ltd (Companies House No. 14581073)

---

## Parties

| Role | Organisation | Contact |
|------|-------------|---------|
| **Data Controller** | [NHS Trust Name] | [Trust DPO email] |
| **Data Processor** | Storegrill Inc Ltd t/a SEWA AI | dpo@sewaxai.health |
| **Sub-Processor(s)** | Microsoft Azure UK (West/South) — HSCN/PDN connected | — |

---

## Purpose of Processing

SEWA AI processes pseudonymised DICOM medical images and structured radiology report text to:

1. Generate automated triage scores (Flags and Urgency) for CT head studies;
2. Provide dictation transcription via Azure Speech Services (NHS-procured instance);
3. Enable translation of reports via NHS-procured LibreTranslate instance;
4. Maintain an immutable audit trail via Azure Confidential Ledger.

---

## Data Categories

| Category | Sources | Retention |
|----------|---------|-----------|
| **Pseudonymised DICOM Images** | PACS via NHS Network (HSCN/PDN) | 90 days post-study |
| **Pseudonymised Structured Reports** | RIS integration | 90 days post-study |
| **Audit Logs** | Application + Confidential Ledger | 7 years (legal hold) |
| **Operational Metrics** | Prometheus / Azure Monitor | 90 days rolling |
| **Transcription Audio** | Azure Speech (real-time, not stored) | Not retained |

---

## Data Subject Rights

As data processor, SEWA AI will:

- Notify the Controller within 48 hours of any Data Subject Request (DSR);
- Provide technical means for the Controller to export, rectify, or erase pseudonymised data;
- Never respond directly to a DSR without Controller authorisation.

---

## Technical & Organisational Measures

### Organisational

- All personnel with data access complete NHS DSP Toolkit IG training annually;
- SEWA AI holds valid DSP Toolkit assessment (awaiting toolkit submission);
- Data Processing Register maintained and reviewed quarterly;
- DPO appointed (see coversheet) and contactable for data breach notification.

### Technical

| Control | Implementation |
|---------|---------------|
| Encryption at rest | AES-256 (Azure Managed HSM keys) |
| Encryption in transit | TLS 1.3 mandatory |
| Access control | RBAC + JIT (Just-In-Time) via Azure PIM |
| Audit trail | Immutable — Azure Confidential Ledger |
| Network isolation | HSCN/PDN boundary + private endpoints |
| Pseudonymisation | FHIR-compliant (NHS Number → pseudonym hash, DOB → year) |
| Breach detection | Azure Sentinel + SIEM alerts |

---

## Sub-Processing

Approved sub-processors:

| Sub-Processor | Service | Location |
|--------------|---------|----------|
| Microsoft Azure | Compute (AKS), Storage, Confidential Ledger, Speech Services | UK West / UK South |
| NHS England | Spine (PDS, SDS), NRLS | NHS N3/HSCN |

Notification of any new sub-processor will be provided 30 days in advance.

---

## Data Breach Notification

SEWA AI will:

1. Notify the Controller within **24 hours** of becoming aware of a personal data breach;
2. Provide initial assessment within **48 hours** (nature, categories, volume);
3. Provide full root-cause analysis and remediation plan within **5 business days**.

---

## Liability & Indemnity

- SEWA AI's liability under this DPA is limited to **direct damages** as set out in the Master Services Agreement;
- Neither party excludes liability for death, personal injury, or fraud;
- The Controller bears responsibility for the lawfulness of the data-sharing arrangement under the Health Service Control of Patient Information Regulations 2002 (Section 251, if applicable).

---

## Governing Law

This DPA is governed by the laws of England and Wales.

---

## Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Data Controller (NHS Trust) | | | |
| Data Processor (Storegrill Inc Ltd) | Dolapo Olaitan Ariyo | | |
| DPO (NHS Trust) | | | |

---

<div class="page-footer">
  SEWA AI — Confidential · © Storegrill Inc Ltd 2026 · SEWA-AI-GOV-DPA-001 v1.0
</div>
