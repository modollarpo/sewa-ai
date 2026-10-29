# Multi-Gate Safety Interception Audit

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

**Date**: 2026-10-29  
**Script**: `validation/scripts/audit_fn_safety_interception.py`  
**Output JSON**: `validation/reports/v2a1_fn_safety_interception.json`

---

## Purpose

The conformal classifier gate at λ = 0.0298 auto-cleared **33 CQ500 studies** (score < λ). Of these, **6 were false negatives** (ground-truth ICH, `conditional_fnr_observed = 3.70%`). This audit retrospectively assesses whether the secondary Relative Mahalanobis OOD gate (C2) or the MC-Dropout epistemic-uncertainty gate (C1) would have escalated any of the 6 FN studies to human review.

> **Scope constraint**: This is a SEPARATE retrospective analysis performed after the classifier-gate evaluation. The reported **3.70% FNR remains unchanged**. This audit characterises the theoretical multi-gate coverage and does not constitute a jointly calibrated multi-gate FNR guarantee.

---

## Methodology

| Step | Detail |
|---|---|
| Model | `classifier_v2a1.pt` (frozen EfficientNet-B0, temperature T = 0.7984) |
| OOD method | Relative Mahalanobis Distance, shrinkage = 0.05, fitted on train penultimate features |
| Epistemic method | MC-Dropout variance, 30 forward passes through classifier head |
| Study aggregation | Mean of top-3 slices by classifier probability (TopK = 3) |
| Threshold derivation | 95th percentile of OOD / epistemic scores over the 49 confirmed-TN auto-cleared studies |

**OOD threshold (τ_ood)**: 52.0463  
**Epistemic threshold (τ_epi)**: 0.00034963

---

## TN Auto-Cleared Distribution (Threshold Reference)

| Metric | OOD Score | Epistemic Variance |
|---|---|---|
| Mean | 40.0423 | 0.00008991 |
| Median | 39.2459 | 0.00001714 |
| **95th pctl (τ)** | **52.0463** | **0.00034963** |

---

## Per-Study Results

| Study ID | Classifier Score | OOD Score | OOD > τ | Epi Variance | Epi > τ | Escalated? |
|---|---|---|---|---|---|---|
| CQ500-CT-385 | 0.005078 | 32.4312 | ❌ no | 0.00001790 | ❌ no | ❌ no |
| CQ500-CT-415 | 0.003669 | 55.5438 | ✅ YES | 0.00001121 | ❌ no | ⚠️ **YES** |
| CQ500-CT-278 | 0.001166 | 41.0085 | ❌ no | 0.00000132 | ❌ no | ❌ no |
| CQ500-CT-426 | 0.003299 | 46.5780 | ❌ no | 0.00000497 | ❌ no | ❌ no |
| CQ500-CT-196 | 0.001212 | 47.3995 | ❌ no | 0.00000083 | ❌ no | ❌ no |
| CQ500-CT-43 | 0.009593 | 64.3073 | ✅ YES | 0.00011974 | ❌ no | ⚠️ **YES** |

---

## Summary

| Metric | Count | Fraction |
|---|---|---|
| FN studies evaluated | 6 | 6/162 = 3.70% of positive holdout |
| Escalated by OOD gate | 2 | 2/6 |
| Escalated by Epistemic gate | 0 | 0/6 |
| **Escalated by EITHER gate** | **2** | **2/6** |
| NOT escalated by any gate | 4 | 4/6 |

95% Wilson CI on catch fraction: [9.7%, 70.0%] (n = 6, very wide — treat as indicative only).

---

## Governance Note

> Even if all 6 FN studies had been escalated by secondary gates, this would not retroactively change the reported classifier-gate FNR of 3.70% (6/162). Any prospective multi-gate evaluation must be **pre-registered**, use **independent calibration** for gate thresholds, and report the **joint gate FNR** as a separate metric. The current audit is exploratory and does not constitute a clinical safety claim.

---

*Elapsed: 329.4s*