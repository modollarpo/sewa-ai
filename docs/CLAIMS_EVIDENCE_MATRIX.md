# SEWA XAI — Claims & Evidence Matrix

This document provides a rigorous traceability audit of performance, latency, dataset, regulatory, certification, and deployment claims made across the repository, cross-referenced against producing evidence in the codebase.

| Claim | Where Stated | Evidence Location | Status | Action Needed |
| :--- | :--- | :--- | :--- | :--- |
| **ICH AUROC 0.807 (RSNA internal)** | `AGENTS.md`, `validation/reports/v2a1_report.json` | `validation/reports/v2a1_report.json`, python evaluation scripts | **Verified (reproduced)** | Maintain in research documentation. |
| **ICH AUROC 0.7468 (CQ500 external, n=486)** | `AGENTS.md`, `docs/evidence/feasibility_report_testC_cq500.md` | `validation/reports/v2a1_testC_cq500.json`, test scripts | **Verified (reproduced)** | Maintain as primary external generalisation benchmark. |
| **Metacognition safety reduction 0.0% (95% CI [-8.1%, +6.5%], INCONCLUSIVE)** | `AGENTS.md`, `docs/evidence/feasibility_report_testC_cq500.md` | `validation/reports/v2a1_testC_cq500.json` | **Verified (reproduced)** | Explicitly cite as inconclusive; no safety-gating claim. |
| **ICH AUC-ROC 0.972 (n=2,847)** | `README.md` (historical), Investor Deck, `claims_register.csv` (C-04), Master Dossier | None in repo (audit confirmed no producing code, dataset, or evaluation output) | **Contradicted / No evidence found** | Remove from README; treat as external management planning figure or source outside repo. |
| **14,200 retrospective scans evaluated** | `sewa_source_of_truth.yaml`, `claims_register.csv` (C-03), Clinical Dossier | None in repo (upper-bound retrospective pool without reproducible evaluation output) | **Contradicted / No evidence found** | Reframed in clinical dossier as planning pool; remove absolute counts from public marketing. |
| **Median door-to-alert latency 1.84s / <2s** | `README.md`, Investor Deck (`claims_register.csv` C-08) | Benchmark suite documentation / mock target in code | **Present but not reproduced (engineering target)** | Clearly label as an engineering target in public collateral. |
| **EfficientNet-B4 vs ONNX INT8 Triage Engine** | `README.md` architecture diagram vs `ai-services/triage/` | ONNX inference harness in `ai-services/shared/`, demo fallbacks at runtime | **Present but not reproduced (demo fallback)** | Align README architecture text with actual runtime fallback / ONNX inference state. |
| **DCB0129 Clinical Safety Case complete (SMP-001 + CRM-001)** | `claims_register.csv` (C-07), `docs/clinical-dossier/04_Clinical_Risk_Management.md` | Markdown hazard log / risk management documentation in dossier | **Present but unverified externally** | Reconcile repository compliance table (which states "Not claimed") with internal safety dossier documents. |
| **NHS Innovation Service Registration Ref INN-2604-0064-2** | `README.md`, `PressPage.tsx`, `claims_register.csv` (C-05) | Referenced in documentation and email logs (`docs/email_to_emma.md`) | **Verified (reference present)** | Maintain accurate reference. |
| **UK Patent Application GB2609706.3** | `README.md`, `claims_register.csv` (C-02), `sewa_source_of_truth.yaml` | Referenced in IP and corporate documentation | **Verified (IP reference)** | Maintain accurate reference. |
| **EU MDR Class IIb / UKCA / ISO 13485 / ISO 27001 / DSPT certifications** | Historically in `RegulatoryPage.tsx` and marketing collateral | None in repo | **Contradicted / No evidence found (corrected)** | Ensure all marketing/regulatory pages strictly state "Not claimed / in preparation". |

---
*Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. PRE-CLINICAL R&D (TRL 5).*
