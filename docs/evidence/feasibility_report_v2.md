# Feasibility report v2: uncertainty-based safety gate & composite hallucination-risk score

> # ⚠️ STATUS: PARTIAL — NOT A RESULT
> This v2 study is **INCOMPLETE**. The numbers below are a **preliminary smoke-run only**
> and must **not** be cited as study results. Outstanding work:
> 1. ❌ Multi-slice sampling (up to 32 slices/scan) — current run uses ~1 slice/scan (deviation logged in §7).
> 2. ❌ Minimum-detectable-effect / power analysis on validation (required *before* test evaluation).
> 3. ❌ Full arm evaluation C1–C4, D1–D3, ablations E on Test A **and** Test B (corruptions).
> 4. ❌ Test C (CQ500) — held; checksum verification vs official source not yet done.
>
> A run is only the *official v2 result* once every ❌ above is done and this banner is removed.

**Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
**Evidence status: v2 re-run, PARTIAL (scan-level grouped split, pre-registered; plumbing smoke-test only).**

- Branch: `fix/patent-aligned` (v1 tagged as `study-v1-frozen`)
- Environment: Python 3.14.2, numpy 2.4.1, scikit-learn 1.9.1, scipy, torch 2.10.0+cpu (**CPU-only; 2 physical cores / 4 logical, 7.87 GB RAM**)
- Pre-registration v2: `docs/evidence/preregistration_v2.md`
- Run artefacts: `validation/reports/study_report_v2.json` (preliminary), `validation/scripts/step2_manifest_v2.json`, `validation/models/classifier_v2.pt`

---

## 1. Aim (v2 re-run)
Address design weaknesses identified in v1:
1. **Scan-level grouping (`StudyInstanceUID`)** to eliminate data leakage across slices of the same scan.
2. **Fresh, untouched test set** (v1 test set burned; 120 held-out scans).
3. **Pre-registered analysis** (`docs/evidence/preregistration_v2.md`) committed before test evaluation.

---

## 2. Datasets & Grouping
- **Grouping key:** `StudyInstanceUID` (scans).
- **Split:** 800 total sampled scans, stratified by hemorrhage status:
  - **Train:** 560 scans · **Validation:** 120 scans · **Test (Test A):** 120 scans
- **Leakage check:** 0 overlapping scans across splits (hard-failure check passed).
- **Slice depth:** ⚠️ **~1 slice/scan in this preliminary run**, not the pre-registered "up to 32 slices/scan" (see §7). This is a **material deviation** that limits scan-level aggregation and must be corrected.

---

## 3. Methods & Training (preliminary)
- **Model:** EfficientNet-B0 (ImageNet `IMAGENET1K_V1`), dropout head $p=0.3$.
- **Training:** **1 epoch** on the v2 train split (CPU) — deliberately shallow, smoke-test only.
- **Calibration:** Temperature scaling fitted on validation (slice-level, eval-mode logits) → **$T \approx 0.8158$**.
- **Test A (clean) preliminary numbers** — slice-level, single-pass, MC dropout *not* applied:
  - Slice AUROC: **0.8169**
  - Error-detection AUROC (B1 max-softmax): **0.6883**
  - Error-detection AUROC (B2 entropy): **0.6883**

These are **internal plumbing checks only**; they are not the study and do not use the pre-registered aggregation (mean of top-3 slice probabilities).

---

## 4. Temperature reconciliation: v2 $T=0.8158$ vs v1 $T=2.656$

$T$ is a property of the **model's calibration state**, not of the dataset, so the two studies are not expected to agree:

| | v1 | v2 (preliminary) |
|---|---|---|
| Backbone | EfficientNet-B0 (fine-tuned) | EfficientNet-B0 (fine-tuned) |
| Training | **12 epochs** to convergence (val AUROC 0.918) | **1 epoch** (val AUROC ~0.79) |
| Pre-calibration ECE | ECE of raw model = 0.152 (**over**confident) | raw probabilities shrunk toward 0.5 (**under**confident) |
| Fitted $T$ | **2.656 (> 1)** → softens | **0.8158 (< 1)** → sharpens |
| Meaning | logits too peaked; needs flattening | logits too flat; needs sharpening |

**Why:** A 1-epoch model has not yet sharpened its decision boundary — its validation probabilities sit (relatively) close to 0.5 given how accurate it already is, so the calibration optimum pushes $T<1$ to *increase* confidence. v1's converged model was overconfident, so its optimum pushed $T>1$ to *decrease* confidence. Both are fixable by training longer; **v2's $T<1$ is a symptom of under-training and is itself a reason the preliminary numbers are not citable.** (NB: a healthy, well-trained, well-calibrated model typically lands near $T\approx1$.)

---

## 5. Findings so far
- Scan-level grouping removes slice leakage; the leakage check passes.
- Pipeline (manifest → train → calibrate → evaluate) runs end-to-end on CPU.
- **No scientific finding is claimed.** The preliminary error-detection AUROCs (~0.69) are single-pass only and computed on ~1 slice/scan; the pre-registered comparison (D3 vs B1/B2 at 20% review on Test B) has not been run.

---

## 6. Limitations
- **PARTIAL** — see banner.
- **Slice depth deviation** (~1 slice/scan vs ≤32) — invalidates scan-level aggregation as designed.
- **Under-trained model** (1 epoch) — $T<1$; AUROC below v1.
- **CPU-only, 2 cores** — full pre-registered scope is ~3–4 days of continuous compute here.
- **Scan-level splits, not patient-level:** RSNA has no patient id; same-patient different scans remain a residual risk.
- **Noncommercial licence** (RSNA). **Not clinical evidence.**

---

## 7. Deviation log
| # | Deviation from pre-registration v2 | Reason | Status |
|---|---|---|---|
| D1 | ~1 slice/scan used instead of "up to 32 slices/scan" | Only 1 preprocessed slice/scan existed; multi-slice fetch not yet run | **To be corrected** |
| D2 | Test A evaluated before the power analysis | Plumbing smoke-test; not a study result | **To be corrected** (Test A will be re-evaluated under the pre-registered protocol) |

---

## 8. Reproduce (preliminary pipeline only)
```
python -m validation.scripts.step2_build_manifest
python -m validation.scripts.step3_train_full
python -m validation.scripts.generate_v2_report
```
