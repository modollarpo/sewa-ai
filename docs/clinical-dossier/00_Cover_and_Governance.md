# ![SEWA AI](../assets/logo-horizontal.svg)

<div class="cover">
  <img src="../assets/logo-horizontal.svg" alt="SEWA AI" />
  <h1>Clinical Research & Regulatory Validation Dossier</h1>
  <p class="subtitle">Smart Early Warning Assistant · SaMD Class IIb · TRL 5</p>
  <p class="meta">
    <strong>Sponsor:</strong> Storegrill Inc Ltd (Companies House No. 14581073)<br/>
    <strong>Registered Address:</strong> 18 Hampshire Close, Binley, Coventry, CV3 2FP, England<br/>
    <strong>Email:</strong> info@sewaxai.health · <strong>Web:</strong> www.sewaxai.health<br/>
    <strong>Chief Investigator:</strong> Dolapo Olaitan Ariyo (Founder, MD & CTO) · ORCID 0009-0006-0163-2538<br/>
    <strong>NHS Innovation Service ID:</strong> INN-2604-0064-2<br/>
    <strong>UKIPO Patent:</strong> GB2609706.3 (filed 25 April 2026 · WIPO DAS 53DA)<br/>
    <strong>IRAS Project ID:</strong> 372596 — Data-Only Research Framework<br/>
    <strong>DPIA Reference:</strong> DPIA-001 (GDPR Art. 35, v1.0, March 2026)<br/>
    <strong>Device Classification:</strong> SaMD Class IIb — UK MDR 2002 / EU MDR 2017/745 Rule 11<br/>
    <strong>Document Set Version:</strong> v1.0 — July 2026
  </p>
  <p class="classification">OFFICIAL-SENSITIVE</p>
</div>

<!-- ============================================================ -->
## Purpose of This Dossier
<!-- ============================================================ -->

This dossier consolidates the clinical research, validation and regulatory documentation required to
support the path of **SEWA AI** — a sovereign multi-engine Vision-Language Model (VLM) system for
automated diagnostic radiology triage — from Technology Readiness Level (TRL) 5 engineering
platform to regulated Software as a Medical Device (SaMD).

It assembles, in a single coherent evidence package:

- The prospective clinical validation study design (building on IRAS protocol SG-SEWA-AI-2026-V1 v4.0);
- The Statistical Analysis Plan (SAP);
- The clinical risk management file (DCB0129) and ISO 14971 risk management file;
- The IEC 62304 software lifecycle file and IEC 62366-1 usability engineering file;
- NICE evidence-standards alignment;
- Patient and public involvement (PPIE) and health-inequalities provisions;
- A **future-services pipeline appendix** that explicitly reframes Pathology AI, Mammography AI and
  Retinal AI as **planned, not-yet-deployed modules**; and
- A regulation-readiness assessment identifying what evidence is sufficient and what remains outstanding.

> **Performance disclaimer (applies throughout this dossier).** All performance metrics quoted from
> internal engineering and functional testing are *not* independent clinical validation. Independent
> NHS clinical validation is the immediate next stage of development and is the subject of the study
> described in this dossier.

<!-- ============================================================ -->
## Document Register
<!-- ============================================================ -->

<div class="callout-note">
  <strong>Document Status Key:</strong>
  <span class="badge badge-approved">Approved</span>
  <span class="badge badge-review">Under Review</span>
  <span class="badge badge-draft">Draft</span>
</div>

| Ref | Document | Status |
|-----|----------|--------|
| SEWA-AI-DOC-00 | Cover, Governance & Document Register (this file) | Issued v1.0 |
| SEWA-AI-DOC-01 | Regulatory Strategy & Conformity Assessment (Phases 1–3) | Issued v1.0 |
| SEWA-AI-DOC-02 | Clinical Investigation Plan — Prospective Validation | Issued v1.0 |
| SEWA-AI-DOC-03 | Statistical Analysis Plan | Issued v1.0 |
| SEWA-AI-DOC-04 | Clinical Risk Management File (DCB0129) | Issued v1.0 |
| SEWA-AI-DOC-05 | Risk Management File (ISO 14971) | Issued v1.0 |
| SEWA-AI-DOC-06 | Software Lifecycle File (IEC 62304) | Issued v1.0 |
| SEWA-AI-DOC-07 | Usability Engineering File (IEC 62366-1) | Issued v1.0 |
| SEWA-AI-DOC-08 | NICE Evidence Standards Alignment | Issued v1.0 |
| SEWA-AI-DOC-09 | Future Services Pipeline (Pathology / Mammography / Retinal — PLANNED) | Issued v1.0 |
| SEWA-AI-DOC-10 | PPIE & Health Inequalities Assessment | Issued v1.0 |
| SEWA-AI-DOC-11 | Regulation Readiness Assessment (outstanding-evidence tracker) | Issued v1.0 |
| SEWA-AI-DOC-12 | Internal Engineering Verification Report | Issued v1.0 |
| SEWA-AI-DOC-13 | Evidence Index & Bibliography | Issued v1.0 |

<!-- ============================================================ -->
## Governance Framework
<!-- ============================================================ -->

This dossier is governed by the following quality management framework:

<table>
  <thead>
    <tr>
      <th>Domain</th>
      <th>Standard / Regulation</th>
      <th>Accountable Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Clinical Risk Management</td>
      <td>DCB0129 (NHS DSP Toolkit) + ISO 14971:2019</td>
      <td>Chief Clinical Safety Officer</td>
    </tr>
    <tr>
      <td>Software Lifecycle</td>
      <td>IEC 62304:2006 + Amd.1</td>
      <td>Head of Software Engineering</td>
    </tr>
    <tr>
      <td>Usability Engineering</td>
      <td>IEC 62366-1:2015 + Amd.1</td>
      <td>Head of UX / Human Factors</td>
    </tr>
    <tr>
      <td>Data Protection</td>
      <td>UK GDPR + Data Protection Act 2018</td>
      <td>Data Protection Officer (DPO)</td>
    </tr>
    <tr>
      <td>Information Governance</td>
      <td>NHS DSP Toolkit (IGSoDN)</td>
      <td>Caldicott Guardian / SIRO</td>
    </tr>
    <tr>
      <td>Clinical Safety</td>
      <td>DCB0160 (Clinical Safety Officer)</td>
      <td>Qualified CSO</td>
    </tr>
  </tbody>
</table>

### Key Governance Contacts

| Role | Name / Organisation | Contact |
|------|-------------------|---------|
| Data Protection Officer | TBC — NHS Trust Partner | dpo@sewaxai.health |
| Caldicott Guardian | TBC — NHS Trust Partner | caldicott@sewaxai.health |
| Clinical Safety Officer | TBC — NHS Trust Partner | cso@sewaxai.health |

<!-- ============================================================ -->
## Change History
<!-- ============================================================ -->

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v0.1 | 2026-03-01 | D. Ariyo | Initial draft — regulatory strategy outline |
| v0.2 | 2026-04-15 | D. Ariyo | Full dossier structure with 13 documents |
| v0.3 | 2026-06-01 | D. Ariyo | IRAS submission integration, NICE alignment |
| v1.0 | 2026-07-23 | D. Ariyo | First issue — complete regulatory submission pack |

---

<div class="page-footer">
  SEWA AI — Confidential · © Storegrill Inc Ltd 2026 · Document Ref: SEWA-AI-DOC-00 v1.0
</div>
