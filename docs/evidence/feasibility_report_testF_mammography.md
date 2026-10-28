# Feasibility Report — Test F: Mammography Pipeline (CBIS-DDSM)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> Mode: **ENGINEERING VALIDATED / DEMO MODE**  
> Date: 2026-10-28  
> Dataset licence: CC BY 3.0 (TCIA / CBIS-DDSM)

## Summary

| Criterion | Result | PASS? |
|---|---|---|
| 3a Metadata: CSV loads, all columns | 1872 rows, 753 patients | ✅ |
| 3b Preprocessing: shape & dtype | [3, 224, 224] float32 | ✅ |
| 3c Demo ONNX latency | 1.39 ± 0.30 ms | ✅ |
| 3c Schema validity | All 8 conditions present | ✅ |
| 3c demo_mode flag | True | ✅ |
| 3d BI-RADS mapping | 8/8 conditions mapped | ✅ |

**Overall Verdict: ENGINEERING VALIDATED / DEMO MODE**

## 3a. CBIS-DDSM Metadata Distribution

| Pathology | Count | % |
|---|---|---|
| MALIGNANT | 673 | 35.95% |
| BENIGN | 658 | 35.15% |
| BENIGN_WITHOUT_CALLBACK | 541 | 28.9% |

Assessment (BI-RADS): {0: 76, 2: 553, 3: 113, 4: 931, 5: 199}

Breast Density: {0: 2, 1: 199, 2: 616, 3: 654, 4: 401}

## 3b. Preprocessing

- Original image shape: [4728, 3064, 3]
- Output tensor shape: [3, 224, 224]
- Value range: [-2.1179, 2.64]

## 3c. Demo ONNX Inference

- Mean latency: **1.39 ms** ± 0.30 ms (n=10 timed runs)
- Backend: demo (random linear projection ONNX graph)
- demo_mode: True

## 3d. BI-RADS Mapping

All 8 mammography conditions correctly mapped to BI-RADS categories.

---
*Generated automatically by step12_mammography_feasibility.py*  
*FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.*