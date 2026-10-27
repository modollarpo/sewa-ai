# Pre-registration: external evaluation of the composite hallucination-risk gate on CQ500

**Status:** FROZEN before any CQ500 data is read, processed, scored, or evaluated.
**Evidence marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

This document fixes the external-test analysis *before* the CQ500 set is touched, so
the test cannot be tuned on. Any deviation must be recorded as an amendment with a
date and reason, and reported as such.

---

## 1. Question

At a matched human-review workload, does the full composite gate **H** reduce the
number of *unsafe accepted* outputs (wrong and passed without review) reaching
clinicians, compared with the better of two single-pass baselines (B1 max-softmax,
B2 entropy), on an external dataset never used for development?

Secondary: does any **single** signal match H (relevant to claim strategy)?

## 2. Data (external test only)

- **Dataset:** CQ500 (Qure.ai), `http://headctstudy.qure.ai/dataset`. Licence
  CC BY-NC-SA 4.0 (non-commercial + share-alike) — verification pending; no
  CQ500-derived output leaves this study or enters any commercial artefact.
- **Role:** external test. **Never** used for training, threshold selection,
  calibration, or model selection.
- **Unit:** exam/study. Ground truth = majority of the three radiologist reads.
- **Known defects:** CQ500CT19, 22, 25, 52, 120 flagged corrupt by MD.ai; excluded
  and the exclusion logged.
- **Labels used:** binary *any intracranial haemorrhage* vs none, from the official
  reads. Subtypes are recorded but the headline uses the binary label.

## 3. Model (frozen before test)

- Classifier trained/selected on RSNA development data only (public feasibility run).
- One image = one *slice* for RSNA; for CQ500, a study aggregates slices.
- **Study score** = mean of the model's slice probabilities for the top-3 highest-
  scoring slices of the study (frozen rule; config `evaluation`/`study.yaml`).
- **Calibration:** temperature scaling fitted on the RSNA **validation** set only
  (T≈2.656), applied to all single-pass probabilities before B1/B2/C4 thresholding.
- No fine-tuning, recalibration, or threshold change may use CQ500 labels.

## 4. Signals (frozen definitions)

- **Uncertainty (C1):** N=20 MC-dropout passes; epistemic = Var(p); aleatoric =
  mean p(1-p); U = 0.6*epistemic + 0.4*aleatoric; ceiling 0.15; normalised by 0.15.
- **OOD (C2):** shared-covariance Mahalanobis on penultimate features, shrinkage
  0.05, fit on TRAINING features only. **DROPPED from the composite** (amendment 1);
  still reported standalone as arm C2.
- **Conflict (C4):** confidence * normalised-U.
- **Attribution (C3):** Grad-CAM overlap vs BHX boxes; **"not evaluated"** unless the
  BHX annotations are available and licences verified. If unavailable, C3 is omitted
  and the composite excludes it (reported).
- **Negation:** not evaluated (requires generated reports) — stated in every report.

## 5. Gate and thresholds

- A case is **routed to review** if its risk score exceeds the threshold.
- Thresholds are **quantiles of the validation (RSNA) score distribution** calibrated
  to the matched review rate. The SAME thresholds are applied to CQ500. No CQ500
  quantiles are used for gating.
- **Composite H:** logistic regression (class-balanced) over the **evaluated signals**
  (C1 uncertainty + C4 conflict; OOD excluded — amendment 1; attrib/negation not
  evaluated), fitted on the **RSNA validation split only**, then frozen.

## 6. Evaluation

For each arm and each review rate in {5%, 10%, 20%, 30%}:
- error-detection AUROC (risk vs wrong) with mid-rank ties;
- risk–coverage curve + AURC;
- **unsafe-accepted rate** (wrong & accepted) per 1,000 studies;
- missed haemorrhage among accepted studies;
- sensitivity / specificity of the final (accepted) decision;
- share routed to human review (== review rate by construction).

**Headline comparison:** relative reduction in *unsafe accepted per 1000* for H vs the
**better** of B1/B2 at the matched review rate.

## 7. Success criterion (pre-registered, do not move)

Success = **>= 20% relative reduction** in unsafe-accepted at each of 5/10/20/30%
review versus the better baseline, with a **95% bootstrap CI excluding zero**
(1000 resamples, fixed seed, cluster = study where available). Every rate must pass.
If some rates pass and others do not, the result is reported as **partial / not met**,
never as success.

## 7a. Falsification / stop rules

- If CQ500 study count < 100 after exclusions, report `insufficient_data` (metrics
  null) and stop; do not report point estimates.
- If the better baseline matches H within the CI at every rate, report "no benefit"
  — a negative result — and surface it early (claim strategy depends on it).
- Any single signal statistically matching H must be reported explicitly.

## 7b. Sample-size and power note

RSNA dev used 300 test images. CQ500 has 491 studies (~ up to that many usable). The
bootstrap CI (1000 resamples) is reported for every rate; we do not claim power we
have not demonstrated.

## 8. Reporting rules

- Headline only after the pre-registered analysis; exploratory analyses are labelled
  *post hoc*.
- Report negative and null results.
- Every artefact carries: "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
- No CQ500-derived model weight or artefact is redistributed (share-alike).

## 9. Amendments log

- **Amendment 1 (2026-10-12):** OOD signal (C2) excluded from composite H; H = LR over
  C1 and C4 only. Reason: on RSNA dev, C2 error-detection AUROC = 0.502 (chance) and it
  was the only component that degraded the composite (leave-one-out: dropping C2 restored
  H to the baseline). Recorded **before** any CQ500 data was touched.
- **Amendment 2 (2026-10-12):** temperature scaling (fitted on RSNA validation only,
  T≈2.656) applied to single-pass probabilities before B1/B2/C4 thresholding, per Step 3.
  Recorded **before** CQ500.

- (none yet)
