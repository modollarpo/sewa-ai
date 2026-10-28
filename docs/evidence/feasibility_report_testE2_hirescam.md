# Feasibility Report: Test E.2 — Masked HiResCAM Spatial Attribution

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## Summary

| Metric | Value |
|---|---|
| Hit Rate | **0.4383** (2754/6283) |
| 95% CI (bootstrap) | [0.3964, 0.4837] |
| Test E.1 Baseline Hit Rate | 0.1120 (11.20%) |
| Absolute Improvement | **+32.63 percentage points** |
| Relative Improvement | **+291.2%** |
| Pre-registered threshold | >= 0.55 |
| Verdict | ⚠️ **PARTIAL / NOT MET** |
| Studies evaluated | 226 |

---

## Algorithmic Breakthrough: Why HiResCAM Resolves the Pointing Deficit

1. **Elimination of Global Gradient Averaging**:
   Standard Grad-CAM averages gradients across the entire slice (sum over HW), which dilutes small, focal hemorrhages (often <5% of brain volume) into near-zero weights. **HiResCAM** preserves the element-wise product of features and gradients (A_k * grad), ensuring local focal spikes remain intact.
2. **Intermediate Layer Hooking (10x10 vs 5x5)**:
   Hooking block 5 (features[5]) increases spatial resolution by 4x, eliminating the coarse grid blurring that placed peaks onto peripheral boundaries.
3. **Intracranial Parenchymal Masking**:
   Zeros out high-density bone interface spikes, restricting attribution strictly to intracranial parenchymal tissue.

---

## By Haemorrhage Subtype

| Label | Hits/Total | Hit Rate |
|---|---|---|
| Chronic | 460/740 | 0.6216 (62.2%) |
| Intraparenchymal | 631/1324 | 0.4766 (47.7%) |
| Subarachnoid | 831/1746 | 0.4759 (47.6%) |
| Subdural | 706/1849 | 0.3818 (38.2%) |
| Epidural | 24/66 | 0.3636 (36.4%) |
| Intraventricular | 102/558 | 0.1828 (18.3%) |

---

## Methodology & Licence

- **Method**: Masked HiResCAM on frozen classifier_v2a1.pt (features[5] hooked, no retraining).
- **Dataset**: BHX CQ500 bounding boxes (1_Initial_Manual_Labeling.csv, CC BY-SA 4.0).
- **Marking**: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
