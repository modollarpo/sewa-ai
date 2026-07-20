# SEWA AI — Regulatory Strategy & Conformity Assessment

**Document Ref:** SEWA-AI-DOC-01 · **Version:** 1.0 · **July 2026**
**Sponsor:** Storegrill Inc Ltd (No. 14581073) · **Device:** SEWA AI — SaMD Class IIb

---

## 1. Executive Summary

SEWA AI is a Software as a Medical Device (SaMD) intended to provide automated triage and
prioritisation of adult thoracic and acute radiology studies (chest X-ray, CT head, CT chest, CT
angiography) as **decision support for consultant radiologists**. It is **not** intended to replace
the clinician, to autonomously diagnose, or to issue a final report without mandatory human
sign-off enforced at the database layer.

On the basis of its intended use — driving clinical management of time-critical conditions — SEWA AI
is classified as **Class IIb** under the UK Medical Devices Regulations 2002 (as amended) and under
EU MDR 2017/745 **Rule 11** (software intended to provide information used to make decisions
regarding diagnosis or therapeutic purposes). This document sets out the phased regulatory strategy
(Phases 1–3) and the conformity-assessment route to UKCA marking (UK) and CE marking (EU).

> **Current status.** The platform is at **TRL 5**. No UKCA or CE marking has been obtained. All
> performance figures to date derive from internal engineering testing and are **not** independent
> clinical validation.

---

## 2. Intended Use Statement (Locked for Conformity Assessment)

| Element | Statement |
|---|---|
| Target population | Adults (>=18 years) undergoing diagnostic imaging (CXR/CR/DX, CT head, CT chest, CT angiography) |
| Indication | Decision-support triage and prioritisation of studies with suspected acute findings |
| User | Qualified radiology professionals (consultant radiologists, reporting radiographers under governance) |
| Intended use | Highlight and prioritise potentially urgent studies; surface uncertainty; require radiologist sign-off |
| Out of scope | Autonomous diagnosis; final report generation without human review; paediatric (<18y); non-thoracic modalities in current scope |
| Deployment | Cloud (Azure UK South) and offline edge; all modes share the same safety gate |

---

## 3. Device Classification & Rule Basis

| Regime | Instrument | Classification | Rule |
|---|---|---|---|
| United Kingdom | UK MDR 2002 (as amended) | **Class IIb** | Software for diagnosis/therapeutic decision support |
| European Union | EU MDR 2017/745 | **Class IIb** | **Rule 11** — software providing information used to make decisions on diagnosis/therapy |
| United States (future) | FDA 21 CFR 892 | Likely Class II (510(k)) | Computer-assisted triage (CADt) predicate pathway |

---

## 4. Phased Regulatory Roadmap

### Phase 1 — Innovation & Design (COMPLETED)
| Work stream | Standard / Instrument | Status |
|---|---|---|
| Clinical risk management | **DCB0129** (NHS clinical safety) | Complete — SMP-001 + CRM-001 |
| Software lifecycle | **IEC 62304** (2006+A1:2015) | Documentation drafted; verification ongoing |
| Risk management | **ISO 14971** (2019) | Risk file in progress |
| Innovation support | NHS Innovation Service | Active — INN-2604-0064-2 |
| Patent protection | UKIPO GB2609706.3 | Filed 25 Apr 2026 (sole inventor D. Ariyo) |
| Data protection | DPIA-001 (GDPR Art. 35) | Complete (v1.0, Mar 2026) |

### Phase 2 — Technical & Clinical Validation (IN PROGRESS)
| Work stream | Standard / Instrument | Status |
|---|---|---|
| Engineering validation | Internal functional testing (TRL 5) | Complete |
| Prospective clinical validation | IRAS 372596 + REC + MHRA NoO | Protocol ready; approvals pending |
| Statistical analysis | Pre-specified SAP (this dossier) | Authored |
| Quality management | **ISO 13485** (2016) | Implementation Q3 2026 (planned) |
| Usability engineering | **IEC 62366-1** (2015+A1:2020) | In progress |
| DTAC assessment | NHS Digital Technology Assessment Criteria | Q4 2026 target |
| MHRA Notice of No Objection | Pre-market (SaMD) | Q3 2026–Q1 2027 (planned) |

### Phase 3 — Conformity Assessment, Certification & Post-Market
| Work stream | Standard / Instrument | Target |
|---|---|---|
| UKCA Class IIb | UK Approved Body audit | Q2 2027 |
| EU MDR CE Mark | EU Notified Body | Q3 2027 application; Q1 2028 live |
| Clinical Evaluation Report | MEDDEV / MDCG 2019-2 | Precedes certification |
| Post-market surveillance | **ISO 13485** + **ISO 14971** PMS/PMCF | Continuous post-certification |
| US pathway | FDA 510(k) pre-submission | Q3 2027 |

---

## 5. Conformity Assessment Route (Class IIb)

For Class IIb SaMD, the conformity assessment requires **Notified Body / UK Approved Body**
involvement (Annex IX or X of EU MDR; UK equivalent). The route comprises:

1. A documented **Quality Management System** (ISO 13485) covering design, development and manufacture of the software.
2. A **Technical Documentation** file including the device description, intended use, design, risk management (ISO 14971), software lifecycle (IEC 62304), usability (IEC 62366-1), and clinical evaluation.
3. A **Clinical Evaluation Report (CER)** demonstrating conformity with the general safety and performance requirements, supported by the clinical investigation described in SEWA-AI-DOC-02.
4. **Type testing / verification** of the software build and the safety architecture (metacognition gate, uncertainty engine).
5. Issuance of the **EU Technical Documentation Assessment Certificate / UKCA certificate** by the Approved Body.

---

## 6. Standards Conformance Matrix

| Standard | Relevance | Current state |
|---|---|---|
| ISO 13485:2016 | QMS | Implementation planned Q3 2026 |
| ISO 14971:2019 | Risk management | File in progress (SEWA-AI-DOC-05) |
| IEC 62304:2006+A1:2015 | Software lifecycle | File in progress (SEWA-AI-DOC-06) |
| IEC 62366-1:2015+A1:2020 | Usability engineering | File in progress (SEWA-AI-DOC-07) |
| DCB0129 | NHS clinical safety | Complete (SEWA-AI-DOC-04) |
| ISO/IEC 27001 | Information security | Planned (penetration testing Q3 2026) |
| GDPR / DPA 2018 | Data protection | DPIA-001 complete |

---

## 7. Critical Path Dependencies

- **Chief Investigator (CI):** must be an NHS- or university-employed consultant radiologist (HRA
  mandatory). This is the single most important near-term blocker.
- **Independent statistician:** to lock the SAP before unblinding any data.
- **REC / HRA approval** via IRAS 372596 before any patient data is accessed.
- **ISO 13485 QMS** in place before Approved Body audit.

---

## 8. Future Modules — Regulatory Scope

Pathology AI, Mammography AI and Retinal AI are **planned future modules** and are **explicitly out
of scope** of the current Class IIb submission and the current clinical investigation. They are
described only in SEWA-AI-DOC-09 as intended future development and carry **no current clinical
claims and no regulatory status**.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · info@sewaxai.health
