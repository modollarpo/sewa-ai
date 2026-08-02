# SEWA AI — Data Sharing Agreement (DSA)

![SEWA AI](../assets/logo-horizontal.svg)

<div class="cover">
  <img src="../assets/logo-horizontal.svg" alt="SEWA AI" />
  <h1>Data Sharing Agreement</h1>
  <p class="subtitle">Multi-Site Clinical Validation Study · IRAS 372596</p>
  <p class="classification">OFFICIAL-SENSITIVE</p>
</div>

**Document Ref:** SEWA-AI-GOV-DSA-001  
**Version:** v1.0  
**Date:** July 2026  
**Sponsor:** Storegrill Inc Ltd (Companies House No. 14581073)

---

## Participating Organisations

| Role | Organisation | Data Controller |
|------|-------------|----------------|
| **Lead Sponsor** | Storegrill Inc Ltd t/a SEWA AI | Yes (pseudonymised data) |
| **NHS Trust Site A** | [Trust Name] | Yes (source DICOM/RIS data) |
| **NHS Trust Site B** | [Trust Name] | Yes (source DICOM/RIS data) |
| **NHS Trust Site C** | [Trust Name] | Yes (source DICOM/RIS data) |

---

## Legal Basis for Data Sharing

- **UK GDPR Art. 6(1)(e)** — Processing necessary for the performance of a task carried out in the public interest (NHS health research);
- **UK GDPR Art. 9(2)(j)** — Processing of special category data necessary for archiving, scientific/historical research, or statistical purposes;
- **DPA 2018, Schedule 1, Part 1** — Substantial public interest conditions;
- **Health Service (Control of Patient Information) Regulations 2002, Reg. 5** — Section 251 support (applied via IRAS);
- **Common Law Duty of Confidentiality** — Managed via Patient Information Leaflet and opt-out mechanism (Type 1 + National Data Opt-Out).

---

## Data to Be Shared

### From NHS Trust → SEWA AI

| Dataset | Format | Volume (per site) | Pseudonymisation |
|---------|--------|-------------------|------------------|
| CT Head DICOM Studies | DICOM | ~5,000 studies (retrospective) | NHS Number → SHA-256 hash; DOB → year only |
| Radiology Reports (corresponding) | HL7/FHIR | ~5,000 reports | Same hash; no patient-identifiable text |
| Examination metadata (date, modality, body part) | FHIR | ~5,000 records | No direct identifiers |

### From SEWA AI → NHS Trust

| Output | Format | Content |
|--------|--------|---------|
| AI Triage Report | FHIR DiagnosticReport | Finding codes, urgency flag, confidence score, VLM narrative |
| Performance Dashboard | JSON/CSV | Aggregate sensitivity/specificity per site (no patient-level) |
| Audit Trail | Confidential Ledger | Immutable timestamped log of all processing events |

---

## Data Flows

```
NHS Trust PACS ────┐
                   ├──> HSCN/PDN ──> SEWA AI (AKS, UK West)
NHS Trust RIS ─────┘                       |
                                           ├──> VLM Engine (GPU)
                                           ├──> Azure Confidential Ledger
                                           ├──> LibreTranslate (NHS instance)
                                           └──> Azure Speech (transcription)
                                                    |
NHS Trust EPR <── FHIR / HL7 ──────────────────────┘
```

All data at rest within **Azure UK West** region. No data leaves the UK. HSCN/PDN connectivity via Azure ExpressRoute + VPN Gateway.

---

## Data Minimisation & Retention

1. **Pseudonymisation at source:** NHS Trust strips all direct identifiers before transmission (NHS number, name, address, DOB → year only);
2. **Retrospective data:** Retained for duration of study + 90 days for verification, then securely deleted;
3. **Prospective data:** Deleted after AI processing is complete (target < 24h);
4. **Audit logs:** Retained for 7 years per NHS Records Management Code of Practice;
5. **ML training data:** No patient data used for model training — only synthetic or publicly-available datasets.

---

## Governance & Sign-Off

### Approvals Required

| Approval | Status | Date |
|----------|--------|------|
| IRAS (HRA) | Submitted (ID 372596) | [Date] |
| NHS Trust R&D (each site) | Pending | — |
| Section 251 (CAG) | Not required — retrospective audit/development study | — |
| DSP Toolkit (SEWA AI) | In progress | — |
| Data Protection Impact Assessment | DPIA-001 v1.0 | March 2026 |

### Caldicott Guardian Sign-Off

Each participating NHS Trust's Caldicott Guardian must confirm:

- The data sharing is justified by a clear patient/clinical benefit;
- The minimum necessary data is shared;
- Patients have been informed via the PIL and opt-out mechanisms are respected;
- The arrangement complies with the Caldicott Principles.

---

## Security Controls

| Domain | Control | Owner |
|--------|---------|-------|
| Network | HSCN/PDN boundary via Azure VPN Gateway + ExpressRoute | SEWA AI |
| Encryption | TLS 1.3 in-transit; AES-256 at-rest with HSM keys | SEWA AI |
| Access | RBAC + JIT (Just-In-Time) via Azure PIM | SEWA AI |
| Audit | Immutable Confidential Ledger + Sentinel SIEM | SEWA AI |
| Breach | 24h notification to Trust DPO + IG team | Both |

---

## Termination & Exit

1. Either party may terminate with **90 days' notice** in writing;
2. On termination, SEWA AI will delete all Trust data within **30 days** and provide written confirmation;
3. The Trust may request earlier deletion at any time;
4. Audit logs will be retained per the 7-year retention schedule.

---

## Signatures

| Role | Organisation | Name | Signature | Date |
|------|-------------|------|-----------|------|
| Chief Investigator | Storegrill Inc Ltd | Dolapo Olaitan Ariyo | | |
| R&D Director | [NHS Trust A] | | | |
| R&D Director | [NHS Trust B] | | | |
| R&D Director | [NHS Trust C] | | | |
| Caldicott Guardian | [NHS Trust A] | | | |
| Data Protection Officer | [NHS Trust A] | | | |

---

<div class="page-footer">
  SEWA AI — Confidential · © Storegrill Inc Ltd 2026 · SEWA-AI-GOV-DSA-001 v1.0
</div>
