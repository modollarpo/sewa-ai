# Pre-registration v3 — shift test on a fresh scan set (D2 vs B2, 20% review)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

**Status:** written and frozen BEFORE any evaluation of the v3 set. Branch `fix/patent-aligned`. Local only, unpushed.

**Parent documents:** `docs/evidence/preregistration_v2.md`, `..._amendment1.md`, `..._amendment2.md`, and the v2 feasibility report `feasibility_report_v2a1.md`. The v2 verdict (INCONCLUSIVE) stands and is **not** revisited here.

---

## 1. Rationale
The v2 primary comparison (D3 = C1+C2+C3+C4 vs B2 at 20% review) did not meet the pre-registered >=20% bar (16.5%, CI [7.7,26.3]); the post-hoc design-based MDE for that design is 0.13, so the shortfall is the point estimate, not power. The C3 (Grad-CAM) term was found to be confounded with the predicted class and anti-predictive, and contributes a large negative fitted weight. This v3 test therefore:
- **drops C3** (primary composite = **D2 = C1+C2+C4**), and
- tests on a **fresh, previously unseen scan set** disjoint from all v2 splits and from the tile/feature cache.

This is a **single, one-shot, pre-specified** feasibility test. It is not a clinical validation and must not be cited as one.

## 2. Data (drawn before this document)
- Source pool: the 1,893-study RSNA `stage_2_train_with_metadata.csv` subset used in v2.
- The 800 scans of v2 (train/val/test) are **excluded**; the fresh set is drawn from the remaining **1,093 studies** (542 positive / 551 negative by the subset label).
- Draw: **120 scans**, 60 positive / 60 negative by the subset label, seed **43**, via `validation/scripts/step8_build_manifest_v3.py` → `step2_manifest_v3.json`.
- Slices: up to **8** evenly spaced slices/scan from the scan's largest series; per-slice labels from the authoritative `stage_2_train.csv`; for a truly-positive scan with no positive selected slice, the most peripheral slice is swapped for the nearest-in-z positive slice. → `step1b_slices_v3.json`, `v3_selected_image_ids.txt`.
- **Disjointness (verified):** no v3 StudyInstanceUID appears in `step2_manifest_v2.json`; none of the v3 image ids is in `v2_selected_image_ids_b.txt`; none of the v3 tiles are in the v2 tile cache. The set is disjoint from train, val, test **and** the cache.

## 3. Model and signals (frozen; no retraining, no tuning on v3)
- Classifier: the v2a1 model `validation/models/classifier_v2a1.pt` (EfficientNet-B0, last-6 blocks + head), temperature from the checkpoint. **Not retrained.**
- C1 = normalised MC-dropout uncertainty (N=20, head-only), `composite_U / 0.15`.
- C2 = Mahalanobis OOD distance on penultimate features, fitted on the **v2 train** features.
- C4 = conflict x uncertainty = `confidence * normalized_U`.
- Baseline **B2** = predictive entropy of the temperature-scaled probability.
- Composite **D2 = C1+C2+C4**, fitted once on the **v2 validation** scan-level signals with `LogisticRegression(max_iter=2000, class_weight="balanced")` (expected coefficients C1 ~ +1.46, C2 ~ +0.09, C4 ~ +1.10, intercept ~ -3.53). **No refit on v3.** C3 is not used.

## 3b. Test-time shift (frozen)
The fresh scans are evaluated under the **same 9 test-time corruptions** used in v2 Test B:
- Gaussian noise sigma in {0.05, 0.10, 0.20};
- Gaussian blur sigma in {1.0, 2.0, 4.0} px (160px domain);
- low-dose Poisson with photon scale kappa in {0.5, 0.25, 0.125} x 4096.
RNG seeds fixed as in `v2_lib.corrupt` (`SEED + level`). Clean (uncorrupted) results are also reported as secondary.

## 4. Primary comparison (confirmatory)
**D2 vs B2** on the shifted v3 set at the **20% review rate**.
- Estimand: relative reduction in unsafe-accepted studies, `(U_B2 - U_D2)/U_B2`, where `U` is wrong predictions passing the gate per 1000 studies at 20% review.
- Inference: **scan-cluster bootstrap** (resample the 120 `StudyInstanceUID` clusters; each carries its 9 corruptions together), 95% percentile CI.
- **Success:** point estimate **>= 15%** AND the 95% CI **excludes 0**.

## 5. Secondary (exploratory, not pass/fail)
- Relative reduction at 5% / 10% / 30% review (scan-cluster CI).
- Paired error-AUROC difference (D2 - B2), scan-cluster bootstrap CI.
- Clean-set (no corruption) relative reduction and paired AUROC difference.
These are reported for completeness and are **not** the success criterion.

## 6. Verdict rules
- **SUCCESS**: primary criterion met (>=15% and CI excludes 0).
- **NOT MET**: primary CI excludes 0 but point estimate < 15%, or clear evidence of no benefit.
- **INCONCLUSIVE**: primary CI includes 0 (underpowered / no clear effect).

## 7. Execution discipline
- **Run once. No tuning, threshold changes, or model changes after seeing the v3 result.**
- Report the result whatever it is. If a bug is found after the run, it must be documented as a deviation in an amendment; the original numbers are kept.
- Test C (CQ500) remains **HELD** and is not evaluated.
- All artifacts local; nothing pushed.
