# Feasibility Report — Test G: Retinal Pipeline (EyePACS)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> Mode: **ENGINEERING VALIDATED / DEMO MODE**  
> Date: 2026-10-28  
> Dataset licence: Research use (EyePACS / Kaggle)

## Summary

| Criterion | Result | PASS? |
|---|---|---|
| 3a Loading: 4 sample fundus images | 4/4 images loaded | ✅ |
| 3b Preprocessing: shape & dtype | 4/4 tensors (3, 224, 224) float32 | ✅ |
| 3c Demo ONNX latency | 1.68 ms (avg across 4 images) | ✅ |
| 3c Schema validity | All 13 retinal conditions in all_findings | ✅ |
| 3c demo_mode flag | True | ✅ |
| 3d DR grade mapping | All 5 DR stages mapped (Grade 0–4) | ✅ |

**Overall Verdict: ENGINEERING VALIDATED / DEMO MODE**

## 3a. EyePACS Fundus Samples

| Filename | Shape | Mode |
|---|---|---|
| 10000_left.jpeg | [2448, 3264, 3] | RGB |
| 10000_right.jpeg | [2448, 3264, 3] | RGB |
| 10001_left.jpeg | [3168, 4752, 3] | RGB |
| 10001_right.jpeg | [3168, 4752, 3] | RGB |

## 3b. Preprocessing QA

All 4 retinal images transformed to `(3, 224, 224)` with ImageNet normalization.

## 3c. Demo ONNX Inference Latency

- Mean latency: **1.68 ms**
- Individual runs: [1.6, 1.83, 1.83, 1.44] ms
- demo_mode: True

## 3d. Diabetic Retinopathy Grading

All 5 DR stages correctly mapped to ICDR grades:
- No DR -> Grade 0
- Mild NPDR -> Grade 1
- Moderate NPDR -> Grade 2
- Severe NPDR -> Grade 3
- PDR -> Grade 4

---
*Generated automatically by step13_retinal_feasibility.py*  
*FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.*