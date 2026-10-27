# Feasibility report: uncertainty-based safety gate & composite hallucination-risk score

**Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
**Evidence status: development-set (RSNA) feasibility run. No external test performed yet.**

- Branch: `fix/patent-aligned` (commit containing this report: `git log -1 -- docs/evidence/feasibility_report.md`)
- Environment: Python 3.14.2, numpy 2.4.1, scikit-learn 1.9.1, scipy, torch 2.10.0+cpu (CPU-only)
- Seeds: split seed 42; fixed seeds in metrics bootstrap
- Config: `validation/config/study.yaml`; signals in `validation/study/signals.py`
- Run artefacts: `validation/reports/study_report_full.{json,md}`, `study_curves_full.npz`,
  `fig_risk_coverage_full.svg`, `fig_error_auroc_full.svg`

## 1. Aim

Test whether an uncertainty-based safety gate and a **composite hallucination-risk score H**
reduce unsafe accepted outputs (wrong predictions passed without human review) compared with
named single-pass baselines (B1 max-softmax, B2 entropy), at matched human-review workloads
(5/10/20/30% routed to review).

## 2. Datasets

| Role | Dataset | Licence | Status |
|---|---|---|---|
| Development | RSNA 2019 Brain CT Hemorrhage (Kaggle) | Non-commercial (competition rules) | Used; 2,000-slice balanced subset |
| External test | CQ500 (Qure.ai) | CC BY-NC-SA 4.0 (non-commercial + share-alike) | **NOT obtained** (official host DNS-unreachable here) |
| Attribution | BHX boxes (PhysioNet) | Open access | Not obtained (localisation arm "not evaluated") |

RSNA releases no patient identifier, so **splits are image-level**, not patient-level: slices
from one patient may cross splits. This is a documented limitation, not a design choice.

## 3. Methods

- **Preprocessing:** DICOM -> Hounsfield Units (rescale slope/intercept); three-window tensor
  (brain 40/80, subdural 80/200, bone 600/2800); resize 224x224; normalised. 2,000 slices
  cached (`validation/data_cache/rsna_2000_224_3win.npz`).
- **Split:** 1400/300/300 (seed 42), balanced (700/150/150 positive), leakage test passing.
- **Model:** EfficientNet-B0 (ImageNet `IMAGENET1K_V1`), fully fine-tuned on CPU (batch 8,
  12 epochs, best epoch 10). Fitted dropout in the head -> genuine MC dropout. Best
  **val AUROC 0.9184**; test error rate 0.190.
- **Calibration:** temperature scaling fitted on the **validation set only** (T≈2.656),
  applied to single-pass probabilities before B1/B2/C4 thresholding. Cut test ECE 0.152 -> 0.066.
- **Signals (each a tested function):**
  1. Uncertainty C1: N=20 MC-dropout passes; epistemic = Var(p); aleatoric = mean p(1-p);
     U = 0.6*epistemic + 0.4*aleatoric (ceiling ~0.15); normalised by 0.15.
  2. OOD C2: class-conditional shared-covariance Mahalanobis, shrinkage 0.05, fit on train only.
     Reported standalone; **excluded from the composite (amendment 1)**.
  3. Attribution coherence C3: **not evaluated** (no BHX boxes).
  4. Conflict C4: confidence x normalised U.
  5. Report negation: **not evaluated** (needs generated reports); excluded.
- **Composite H:** logistic regression (class-balanced) over the **evaluated signals**
  (C1 + C4), fit on the **validation set only**, then frozen. (Baselines are comparators, not
  composite inputs.)
- **Thresholds:** validation-set score quantiles at the matched review rate.
- **Composite weights:** learned in this study (spec leaves them unspecified).

## 4. Results (RSNA dev, test n=300)

| arm | error AUROC | AURC | Brier | ECE |
|---|---|---|---|---|
| B1 max-softmax | 0.749 | 0.085 | 0.136 | 0.066 |
| B2 entropy | 0.749 | 0.085 | 0.136 | 0.066 |
| C1 uncertainty | 0.751 | 0.084 | 0.136 | 0.066 |
| C2 OOD (standalone) | 0.502 | 0.189 | — | — |
| C4 conflict | 0.751 | 0.084 | 0.136 | 0.066 |
| **D composite H** | **0.751** | 0.084 | 0.136 | 0.066 |

Arm A (no gate): unsafe accepted 190.0 per 1,000; sensitivity 0.793, specificity 0.827.

**Composite H vs better baseline (B1):**

| review rate | rel. reduction in unsafe-accepted | 95% CI | passes >=20% & CI>0 |
|---|---|---|---|
| 5%  | 0.021 | [-0.018, 0.050] | no |
| 10% | 0.023 | [-0.049, 0.067] | no |
| 20% | 0.000 | [-0.059, 0.069] | no |
| 30% | 0.000 | [-0.031, 0.083] | no |

**Ablations (leave-one-signal-out, LR refit on validation):**

| variant | error AUROC | rel. reduction vs B1 @20% |
|---|---|---|
| without C1 uncertainty | 0.751 | 0.000 |
| without C4 conflict | 0.751 | 0.000 |

Figures: `fig_risk_coverage_full.svg`, `fig_error_auroc_full.svg`.

## 4a. One-sentence effect statement

**Omitted: the pre-registered success criterion was not met**, so no effect is claimed.

## 5. Findings

1. **The composite risk score H does not beat single-pass confidence.** Composite error AUROC
   0.751, statistically indistinguishable from max-softmax/entropy (0.749) and the signals
   themselves (0.751); relative reduction in unsafe-accepted never approaches the pre-registered
   20%, and the 95% CI includes zero at every review rate.
2. **The signals are collinear.** Max-softmax, entropy, MC-uncertainty and conflict rank errors
   almost identically (~0.75); leave-one-out changes nothing. The composite reduces to its own
   inputs.
3. **The OOD component is uninformative here.** C2 error AUROC 0.502 (chance); it was the only
   component that degraded the composite (earlier run: including it gave 0.685 vs 0.751 without).
   It is therefore **dropped from the composite** (pre-registration amendment 1).
4. **A stronger classifier did not help the gate.** The composite was worse at val AUROC 0.918
   than at 0.745 because a better single-pass score leaves less for a composite to add.
5. **Calibration helps the raw probabilities, not the ranking.** Temperature scaling cut ECE
   ~2.3x but left error-detection AUROC essentially unchanged.

## 6. Limitations

- Development set only; **no external (CQ500) test yet**.
- Image-level splits (RSNA has no patient id) — leakage risk documented.
- Non-commercial data licences (RSNA non-commercial) — non-commercial research use only.
- 2D slices; study-level aggregation rule fixed but untested.
- Negation and attribution signals not evaluated.
- Composite weights learned in this study.
- Single task (haemorrhage vs none); small n (300 test slices).
- **Not clinical evidence.**

## 7. Reproduce

```
python -u -m validation.preprocessing.build_tensors --workers 16
python -u -m validation.preprocessing.make_splits
python -u -m validation.study.train --epochs 12 --batch 8
python -u -m validation.study.run_study --model full          # cached -> fast
python -u -m validation.study.figures --tag full
python -m pytest validation/study/tests -q
```

## 8. Decisions / approvals needed

1. **CQ500 access** (external test): licence CC BY-NC-SA; official host unreachable here.
   Approve a route (mirror/partner) or accept development-only reporting for now.
2. **RSNA non-commercial approval** before any commercial use of the model.
3. **Weights note:** composite weights are learned; confirm this is acceptable for the filing.
4. Confirm the default success criterion (>=20% relative reduction, CI excluding zero) stands.
5. Confirm dropping the OOD signal (finding 3 / amendment 1) — **done by instruction**; flag any objection.
