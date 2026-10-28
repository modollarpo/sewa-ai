# Pre-registration: Test C.2 — Scanner-Adaptive Recalibration (CQ500)

**Status:** FROZEN BEFORE EVALUATION  
**Date:** 2026-10-28  
**Branch:** main  
**Author:** SEWA AI Validation Team  
**Licence (dataset):** CC BY-NC-SA 4.0 (CQ500, non-commercial confirmed)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> Marking: **CC BY-NC-SA 4.0** (CQ500 dataset). Non-commercial use confirmed.

---

## 1. Motivation

Test C (primary) found an ICH AUROC of **0.7468** (vs 0.8070 internal) and a safety  
reduction of **0.0%** (95% CI [-8.1%, +6.5%]) at 20% review rate — primary criterion NOT MET.

The domain shift from RSNA training distribution to CQ500 (different scanner vendors,  
HU distributions, slice thickness) is the likely driver. This test evaluates whether  
**scanner-adaptive normalization** of the early feature maps can partially close the gap.

## 2. Objective

Apply scanner-invariant standardization to the pre-extracted CQ500 early features  
(`v2_early_cq500.npz`) and re-evaluate:
1. **Study-level ICH AUROC** — does it improve over the 0.7468 baseline?
2. **Metacognitive safety reduction at 20% review rate** — does it exceed 0.0%?
3. **Calibration** — does re-fitting temperature scaling on recalibrated logits improve ECE?

## 3. Method

### 3a. Feature-level scanner-adaptive normalization
- Load `validation/data_cache/v2_early_cq500.npz` (shape: N_tiles × 24 × 40 × 40)
- Apply **channel-wise z-score normalization** across all CQ500 tiles:
  - Per channel (dim=0 of 24 channels): compute global mean and std across all tiles × spatial positions
  - Subtract mean, divide by (std + ε), ε = 1e-6
  - This simulates scanner-invariant whitening of the feature space
- Re-run the late network on normalized features to obtain recalibrated logits

### 3b. Study-level aggregation
- Use the same study manifest (`cq500_manifest.json`) as Test C
- Aggregate tile logits per study (max pooling over ICH logit column)
- Apply sigmoid to obtain study-level ICH probability

### 3c. Temperature re-scaling
- Re-fit temperature `T` on the recalibrated CQ500 study predictions using a held-out 20% split (seeded: 42)
- Minimize NLL on the calibration split
- Apply `T` to all study predictions; compute AUROC, ECE, and Brier score

### 3d. Safety reduction re-evaluation
- Compute composite uncertainty `D2 = 0.5*(entropy + 1 - max_prob)` on recalibrated logits
- Sort studies by D2 descending (highest uncertainty first = flagged for review)
- At 20% review rate:
  - `baseline_err = FP + FN` on un-reviewed cases (all N studies)
  - `gate_err = FP + FN` after removing top 20% uncertain studies from denominator
  - `safety_reduction = (baseline_err - gate_err) / baseline_err`
- Bootstrap CI (N=1000, seed=42) on safety reduction

## 4. Primary Success Criteria

| Criterion | Baseline (Test C) | Threshold | Type |
|---|---|---|---|
| Study-level ICH AUROC | 0.7468 | > 0.7468 (improvement) | EXPLORATORY |
| Safety reduction at 20% | 0.0% [-8.1%, +6.5%] | CI lower bound > 0% | EXPLORATORY |
| ECE (post-T scaling) | Not reported in Test C | < 0.10 | EXPLORATORY |

**Note:** These are exploratory comparisons to Test C baseline. No confirmatory  
claims are made — all findings are descriptive only.

## 5. Constraints

- Use locally available `v2_early_cq500.npz` only — no raw DICOM re-extraction
- Frozen model weights (`classifier_v2a1.pt`) — no retraining of late network
- No post-hoc optimization loop: normalization params computed once across all tiles
- Results marked: `FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.`

## 6. Outputs

- `validation/reports/v2a1_testC2_recalibration.json`
- `docs/evidence/feasibility_report_testC2_recalibration.md`
