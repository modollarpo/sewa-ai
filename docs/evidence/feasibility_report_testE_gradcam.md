# Feasibility Report: Test E — Grad-CAM Pointing Game

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## Summary

| Metric | Value |
|---|---|
| Hit Rate | **0.1120** (704/6283) |
| 95% CI (bootstrap) | [0.0784, 0.1508] |
| Pre-registered threshold | ≥ 0.55 |
| Verdict | ❌ **PARTIAL / NOT MET** |
| Studies matched | 226 |
| Pre-registration commit | `8cb5b72` |

---

## Why it "PARTIAL / NOT MET"

The Grad-CAM peak activation fell within the radiologist bounding box in 11.2% of annotated slice-bbox pairs, below the pre-registered 55% threshold. This is expected for a classification-only model: Grad-CAM without spatial supervision does not guarantee precise localisation.

---

## By Haemorrhage Type

| Label | Hits/Total | Hit Rate |
|---|---|---|
| Chronic | 110/740 | 0.1486 |
| Subarachnoid | 250/1746 | 0.1432 |
| Subdural | 192/1849 | 0.1038 |
| Intraparenchymal | 134/1324 | 0.1012 |
| Intraventricular | 17/558 | 0.0305 |
| Epidural | 1/66 | 0.0152 |

---

## Methodology

- **Dataset**: BHX CQ500 bounding boxes (`1_Initial_Manual_Labeling.csv`), 6283 valid annotations
- **Model**: EfficientNet-B0 `classifier_v2a1.pt` (frozen)
- **Grad-CAM layer**: Last `Conv2dNormActivation` block of `late` network (features[8])
- **Spatial resolution**: 5×5 CAM interpolated bilinearly to 512×512 DICOM space
- **UID mapping**: Rank-based approximation (pre-registered limitation — no reads.csv locally)
- **Hit criterion**: Any of 8 uniform slices has argmax inside the bbox

## Exclusions

- Slices with zero Grad-CAM mass: 0
- BHX studies with no UID match: 0

---

## Licence

BHX dataset: CC BY-SA 4.0. CQ500 preprocessing: CC BY-NC-SA 4.0.
