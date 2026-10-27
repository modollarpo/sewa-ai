# Pre-registration Test C — External evaluation on CQ500 (study-level ICH AUROC + safety reduction)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

**Status:** written and frozen BEFORE any evaluation of CQ500. Committed before step9a or step9b are run.

**Licence:** CQ500 is CC BY-NC-SA 4.0. Non-commercial use confirmed by user (2026-10-14). All outputs of this study carry the same licence.

**Parent documents:** `preregistration_v2.md`, `..._amendment1.md`, `..._amendment2.md`, `preregistration_v3.md` and their feasibility reports. The v2 verdict (INCONCLUSIVE) and v3 verdict (NOT MET) stand and are not revisited here.

---

## 1. Rationale

Tests v2a1 and v3 both used the RSNA public dataset (development set), which has three known limitations:
- No patient ID → study-level splits are approximate (image-level only)
- Single annotator source (per-slice crowd labels, not radiologist reads)
- Same distribution as training data

CQ500 addresses all three: it is a fully independent dataset with per-study reads from **three radiologists**, never seen during training, from a different clinical setting (Qure.ai, India). Evaluation on CQ500 provides the first **externally validated** AUROC for the v2a1 classifier and the first out-of-distribution safety signal measurement.

This is a **single, one-shot, pre-specified** feasibility test. It is not a clinical validation and must not be cited as one.

---

## 2. Data

- **Source:** CQ500 (Qure.ai) — 491 head CT studies; per-study reads from 3 radiologists.
- **Staging:** CQ500-CT-0.zip … CQ500-CT-490.zip + reads.csv staged in Azure blob container `cq500` (account `sewavalidationdata`, swedencentral). Verified by `step5b_verify_cq500.py`.
- **Ground truth:** majority of 3 radiologist reads for ICH (R1:ICH, R2:ICH, R3:ICH). Positive = 2 or 3 reads positive.
- **Known corrupt scans excluded:** CQ500CT19, CQ500CT22, CQ500CT25, CQ500CT52, CQ500CT120 (corrupt zip — documented in MD.ai notes). These are removed before any evaluation.
- **Expected N:** 486 evaluable scans (491 − 5 corrupt), of which approximately 200 positive (per paper: 205/491 = 41.8% positive rate).
- **Slice selection:** 8 uniformly-spaced slices per scan by ImagePositionPatient[2] (z-position); InstanceNumber used as fallback. Same rule as RSNA pipeline (N_SLICES = 8).
- **No data is used for training or tuning.** CQ500 is a pure held-out test set.

---

## 3. Model and signals (all frozen; no retraining, no tuning on CQ500)

- **Classifier:** `validation/models/classifier_v2a1.pt` — EfficientNet-B0, last-6 blocks + head, trained on RSNA only. Temperature from checkpoint. **Not retrained.**
- **C1** = normalised MC-dropout uncertainty (N=20, head-only).
- **C2** = Mahalanobis OOD distance on penultimate features, fitted on the v2 RSNA **train** split.
- **C4** = confidence × uncertainty conflict.
- **B2** = predictive entropy (baseline comparator).
- **D2 composite** = LogisticRegression(C1, C2, C4) fitted once on the v2 RSNA **validation** scan-level error labels. **No refit on CQ500.** Coefficients fixed from the v3 run (C1 ≈ +1.46, C2 ≈ +0.09, C4 ≈ +1.10, intercept ≈ −3.53).

---

## 4. Primary outcome — study-level ICH AUROC

**Estimand:** Area under the ROC curve for the temperature-scaled study-level probability (`sig["prob"]`) against the majority-radiologist ICH ground truth, across all evaluable CQ500 scans.

**Inference:** No hypothesis test on AUROC alone. Reported with 95% bootstrap CI (scan-cluster, 1 000 resamples, seed 42).

**Reference:** v2a1 RSNA test-set AUROC = 0.807 (corrected splits). CQ500 AUROC is reported descriptively alongside this figure. There is no pre-specified pass/fail threshold on AUROC (this is exploratory context for the safety comparison).

---

## 5. Primary outcome — safety reduction (confirmatory)

**Estimand:** Relative reduction in unsafe-accepted studies at the **20% review rate**:

```
rel_reduction = (U_B2 − U_D2) / U_B2
```

where `U` = wrong predictions (error = 1) that pass the gate per 1,000 studies at the specified review rate, using the D2 or B2 score to order cases for review.

**Inference:** Scan-cluster bootstrap (resample the `CQ500CT*` study IDs; N ≈ 486 clusters), 1,000 resamples, seed 42. 95% percentile CI.

**Success criterion:** point estimate **≥ 15%** AND 95% CI **excludes 0** at the 20% review rate.

This criterion is deliberately set at 15% (not 20%) to acknowledge that CQ500 is a harder, out-of-distribution test and that the v2 and v3 results were 16.5% and below respectively.

---

## 6. Secondary outcomes (exploratory, not pass/fail)

- Relative reduction at 5% / 10% / 30% review rates (scan-cluster CI).
- Paired error-AUROC difference (D2 − B2) with scan-cluster CI.
- Unsafe-accepted count per 1,000 studies for each arm and rate.
- Per-subtype breakdown if CQ500 reads.csv includes subtype columns (ICH subtypes).

---

## 7. Verdict rules

- **SUCCESS:** primary safety criterion met (≥ 15% and CI excludes 0 at 20% review).
- **NOT MET:** CI excludes 0 but point estimate < 15%.
- **INCONCLUSIVE:** CI includes 0 (underpowered or no clear effect).

---

## 8. Power note

With N ≈ 486 scan clusters, the study is better powered than the v2 Test B (120 clusters). The RSNA v2 bootstrap SE at 20% review was 0.274 (MDE 0.768 — severely underpowered). With 4× the clusters the SE is expected to halve, giving MDE ≈ 0.38 at 80% power — still exploratory, but substantially more informative. A null result here is more credible than in v2.

Power will be reported post-hoc using the same bootstrap SE method as `step4_power_v2a1.py`.

---

## 9. Execution discipline

- **Step9a and step9b are run once.** No model changes, no threshold changes, no signal changes after seeing CQ500 results.
- Results reported whatever they are. Bugs found after the run documented as deviations in an amendment; original numbers kept.
- This document is committed to git **before** the AKS job is submitted.
- No other test sets (Hemorica, site data) are evaluated in this run.

---

## 10. Scripts

| Script | Purpose |
|---|---|
| `validation/scripts/step9a_cq500_preprocess.py` | AKS job: stream CQ500 zips from blob in-region, build tiles, cache early features → `processed/v2_early_cq500.npz` |
| `validation/scripts/step9b_evaluate_cq500.py` | Local: load feature cache, compute signals, report AUROC + safety reduction |
| `azure/k8s/cq500-preprocess-job.yaml` | AKS Job manifest for step9a |
| `validation/Dockerfile` | Container image for the AKS job |

**Marking on all outputs:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
