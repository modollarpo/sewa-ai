# Pre-registration: Test F — Mammography Pipeline Feasibility (CBIS-DDSM)

**Status:** FROZEN BEFORE EVALUATION  
**Date:** 2026-10-28  
**Branch:** main  
**Author:** SEWA AI Validation Team  
**Licence (dataset):** CC BY 3.0 (CBIS-DDSM, The Cancer Imaging Archive)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> All model weights are demo ONNX (random linear projection). Results reflect  
> software/pipeline engineering QA only and make no clinical accuracy claims.

---

## 1. Objective

Evaluate whether the SEWA mammography AI pipeline:
1. Correctly preprocesses CBIS-DDSM mammogram images to the expected 224×224 input tensor
2. Produces valid JSON inference output conforming to the `MammographyPredictResponse` schema
3. Returns inference within ≤ 100 ms CPU latency (demo ONNX baseline)
4. Correctly labels all BI-RADS categories (1–5) based on the CBIS-DDSM pathology metadata
5. Correctly maps CBIS-DDSM `pathology` labels (MALIGNANT / BENIGN / BENIGN_WITHOUT_CALLBACK) to model urgency tiers

## 2. Dataset

| Field | Value |
|---|---|
| Source | CBIS-DDSM (Curated Breast Imaging Subset of DDSM) |
| Format | CSV metadata (calc_case with JPG paths) |
| Cases | 1,872 calcification cases (rows in CSV) |
| Images available locally | 1 full mammogram sample image |
| Licence | CC BY 3.0 (The Cancer Imaging Archive) |
| Split | No train/test split — engineering QA only |

## 3. Evaluation Design

### 3a. Metadata distribution audit
- Load CBIS-DDSM CSV (all 1,872 rows)
- Compute label distribution: MALIGNANT / BENIGN / BENIGN_WITHOUT_CALLBACK counts and fractions
- Compute BI-RADS assessment distribution (assessment 0–5) from CSV ground truth
- Compute breast density distribution (1–4) from CSV
- Compute calc type frequency distribution (top 10)
- **Pass criterion:** No category with 0 cases; all expected columns present

### 3b. Preprocessing pipeline QA
- Load the 1 available local mammogram JPEG
- Run the `_preprocess_mammogram()` pipeline:
  - Resize to 224×224 via Lanczos interpolation
  - Normalize: ImageNet mean/std subtraction
  - NCHW transpose to (1, 3, 224, 224)
- Verify output shape, dtype (float32), value range
- **Pass criterion:** Output shape `(1, 3, 224, 224)`, dtype `float32`, value range `[-3.0, 3.5]`

### 3c. Demo ONNX inference QA
- Build a demo ONNX (linear projection, same architecture as production fallback)
- Run inference on the preprocessed mammogram tensor
- Measure inference latency (5 warmup + 10 timed runs, report mean ± std)
- Verify JSON response schema completeness
- **Pass criterion:** Inference latency < 100 ms CPU; JSON schema valid; `demo_mode=True`

### 3d. BI-RADS mapping QA
- For each of the 8 MAMMOGRAPHY_CONDITIONS labels, exercise the `_get_birads()` logic
- Verify correct BI-RADS category assignment per condition
- **Pass criterion:** All 8 conditions return a valid BI-RADS string (0–5)

## 4. Primary Success Criteria

| Criterion | Threshold | Type |
|---|---|---|
| Preprocessing shape | (1, 3, 224, 224) | ENGINEERING QA |
| Preprocessing dtype | float32 | ENGINEERING QA |
| Demo inference latency (mean) | ≤ 100 ms | ENGINEERING QA |
| JSON schema validity | All required fields present | ENGINEERING QA |
| demo_mode flag | True | ENGINEERING QA |
| BI-RADS mapping coverage | 8/8 conditions mapped | ENGINEERING QA |

**Overall verdict:** ENGINEERING VALIDATED / DEMO MODE if all 6 criteria pass.

## 5. Constraints

- No retraining; frozen demo ONNX
- No AUROC, sensitivity, specificity, or clinical accuracy claims
- No claims about the production mammography model (not deployed with real weights)
- Results marked: `ENGINEERING VALIDATED / DEMO MODE. NOT CLINICAL EVIDENCE.`

## 6. Outputs

- `validation/reports/v2a1_testF_mammography.json`
- `docs/evidence/feasibility_report_testF_mammography.md`
