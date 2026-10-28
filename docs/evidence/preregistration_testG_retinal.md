# Pre-registration: Test G — Retinal Pipeline Feasibility (EyePACS Samples)

**Status:** FROZEN BEFORE EVALUATION  
**Date:** 2026-10-28  
**Branch:** main  
**Author:** SEWA AI Validation Team  
**Licence (dataset):** Research use (EyePACS Kaggle competition subset, 4 images)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> All model weights are demo ONNX (random linear projection). Results reflect  
> software/pipeline engineering QA only and make no clinical accuracy claims.

---

## 1. Objective

Evaluate whether the SEWA retinal AI pipeline:
1. Correctly loads and preprocesses EyePACS fundus images (JPEG, variable resolution)
2. Produces valid JSON inference output conforming to the `RetinalPredictResponse` schema
3. Returns inference within ≤ 100 ms CPU latency per eye (demo ONNX baseline)
4. Assigns valid DR grade labels (0–4) for all 4 sample fundus images
5. Correctly assigns urgency tiers for PDR, Wet AMD, RVO, RAO findings

## 2. Dataset

| Field | Value |
|---|---|
| Source | EyePACS (Kaggle Diabetic Retinopathy Detection Competition) |
| Format | JPEG fundus photographs |
| Images available locally | 4 (patients 10000 and 10001, left and right eyes each) |
| Ground-truth DR grade | Not available locally (labels not included in sample subset) |
| Licence | Research use (Kaggle competition dataset) |
| Split | N/A — engineering QA only (4 images) |

## 3. Evaluation Design

### 3a. Image loading QA
- Load all 4 JPEG fundus images via PIL
- Verify each loads without error; check image dimensions and colour mode
- **Pass criterion:** All 4 images load successfully; RGB mode confirmed

### 3b. Preprocessing pipeline QA
- Run `_preprocess_retinal()` on all 4 images:
  - Resize to 224×224 via Lanczos interpolation
  - Normalize: ImageNet mean/std
  - NCHW transpose to (1, 3, 224, 224)
- Verify output shape, dtype, value range for each image
- **Pass criterion:** All 4 → shape (1,3,224,224), dtype float32, values in [-3.0, 3.5]

### 3c. Demo ONNX inference QA
- Build demo ONNX (same architecture as production fallback: 13 retinal conditions)
- Run inference on all 4 preprocessed tensors
- Measure per-image inference latency (5 warmup + 10 timed runs each, report mean ± std)
- **Pass criterion:** Per-image inference latency < 100 ms CPU; `demo_mode=True`

### 3d. JSON schema validation
- For each of the 4 images, verify the response contains all required fields:
  `scan_id, primary_finding, snomed_code, urgency, confidence, dr_grade, eye,`
  `all_findings, inference_ms, model_version, backend, demo_mode, recommendation`
- Verify `all_findings` contains all 13 retinal condition entries
- **Pass criterion:** 4/4 responses schema-valid

### 3e. DR grade and urgency mapping QA
- Exercise `_get_dr_grade()` for all 13 RETINAL_CONDITIONS
- Verify urgency tier assignments for all 5 urgent conditions
- **Pass criterion:** All 13 conditions return valid DR grade (or null for non-DR); all 5 urgent conditions flagged URGENT

## 4. Primary Success Criteria

| Criterion | Threshold | Type |
|---|---|---|
| Image load success | 4/4 | ENGINEERING QA |
| Preprocessing shape | (1,3,224,224) each | ENGINEERING QA |
| Demo inference latency (mean) | ≤ 100 ms | ENGINEERING QA |
| JSON schema validity | 4/4 responses | ENGINEERING QA |
| demo_mode flag | True | ENGINEERING QA |
| DR grade mapping coverage | 13/13 conditions | ENGINEERING QA |
| Urgency mapping coverage | 5/5 urgent conditions | ENGINEERING QA |

**Overall verdict:** ENGINEERING VALIDATED / DEMO MODE if all 7 criteria pass.

## 5. Constraints

- No retraining; frozen demo ONNX
- No AUROC, sensitivity, specificity, or clinical accuracy claims
- No ground-truth DR grading available — purely pipeline validation
- Results marked: `ENGINEERING VALIDATED / DEMO MODE. NOT CLINICAL EVIDENCE.`

## 6. Outputs

- `validation/reports/v2a1_testG_retinal.json`
- `docs/evidence/feasibility_report_testG_retinal.md`
