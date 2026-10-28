# Pre-Registration: Test N — Pulmonary Embolism (PE) Detection on CTPA

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## 1. Registration Metadata

| Field | Value |
|---|---|
| Test ID | **Test N** |
| Title | Pulmonary Embolism Triage: CTPA Engineering Validation & NLP Safety Gate |
| Registered | 2026-10-28 (committed prior to evaluation) |
| Governing principle | Endpoints and thresholds frozen prior to evaluation |
| Datasets | (N-1) OpenI CXR Reports for pulmonary vascular mentions (Public Domain); (N-2) RSNA-STR PE Detection / CAD-PE TCIA (pending Azure staging; Research Use / CC BY 4.0) |
| Modality | Contrast-Enhanced CT Pulmonary Angiography (CTPA) — 3D axial volume |
| Licences | OpenI: Public Domain; RSNA-STR PE: RSNA Research Use; CAD-PE: CC BY 4.0 |
| Marking | **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** |

---

## 2. Clinical Background & NHS Relevance

Pulmonary embolism (PE) has an **annual incidence of ~70 per 100,000** in the UK and carries 30-day all-cause mortality of 10–15% for acute high-risk (massive) PE. CTPA is the diagnostic gold standard, but acute CTPA reading queues in NHS emergency settings regularly exceed 2–4 hours out-of-hours — delays that increase mortality for high-risk PE with right ventricular (RV) strain.

SEWA XAI's PE module targets:
1. **CTPA triage**: Flag acute central/bilateral PE with RV/LV strain (requiring urgent anticoagulation or embolectomy).
2. **Incidental/chronic PE**: Identify chronic thromboembolic disease requiring anticoagulation review.
3. **NLP safety gate**: Detect when PE-compatible radiological findings are reported without clinical escalation recommendation.

**Key distinction from ICH module**: CTPA uses contrast enhancement; Hounsfield unit windowing is different (PE window: centre ~100 HU, width ~700 HU; Mediastinal window: centre ~40 HU, width ~400 HU). A new preprocessing pipeline and dedicated EfficientNet-B0 backbone are required.

---

## 3. Evaluation Protocol

### N-1: NLP Report-Level Safety Gate (Runnable immediately)
Using OpenI reports: extract mentions of "pulmonary embolism", "PE", "filling defect", "pulmonary artery", "thrombus" and test the Metacognition Negation Engine.

### N-2: CTPA Engineering Validation (Pending dataset staging)
- Load axial CTPA DICOM slices; apply PE/Mediastinal windows.
- Select 8 uniform axial slices per study (matching RSNA head CT pipeline).
- Preprocess to `(1, 3, 224, 224)` float32 (3-window composite: PE, Mediastinal, Lung).
- Verify full pipeline latency $< 1.5\text{ s}$ per study on CPU.
- **Demo mode**: `demo_mode: true` until real CTPA-trained weights are available.

---

## 4. Pre-Registered Success Criteria

| Criterion | Metric | Threshold | Category |
|---|---|---|---|
| **N-1a** | PE/vascular contradiction recall | $\ge 85\%$ | Confirmatory |
| **N-2a** | CTPA preprocessing pipeline verified | $(1, 3, 224, 224)$ float32 | Engineering-validated |
| **N-2b** | Study-level latency ($N=25$ CTPA exams) | $< 1.5\text{ s}$ | Engineering-validated |
| **N-2c** | demo_mode flag | `true` (pending real weights) | Governance marker |

---

## 5. Execution Protocol

- Script: `validation/scripts/step22_pulmonary_embolism_evaluation.py`
- Reports: `validation/reports/v2a1_testN_pe.json`, `docs/evidence/feasibility_report_testN_pe.md`
