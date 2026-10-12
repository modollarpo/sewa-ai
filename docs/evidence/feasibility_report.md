# Feasibility report: uncertainty-based safety gate & composite hallucination-risk score

**Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
**Evidence status: development-set (RSNA) feasibility run. No external test performed yet.**

- Commit: `c7297b5921b1329b2612956e987c97baa80e71ad` (branch `fix/patent-aligned`)
- Environment: Python 3.14.2, numpy 2.4.1, scikit-learn 1.9.1, torch 2.10.0+cpu (CPU-only)
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
- **Split:** 1400/300/300 (seed 42), balanced (700/150/150 positive), leakage test passing
  (disjoint, full coverage, unique ids).
- **Model:** EfficientNet-B0 (ImageNet `IMAGENET1K_V1`), fully fine-tuned on CPU (batch 8,
  12 epochs, best epoch 10). Fitted dropout in the head -> genuine MC dropout. Best
  **val AUROC 0.9184**; test error rate 0.190.
- **Signals (each a tested function, `validation/study/signals.py`):**
  1. Uncertainty C1: N=20 MC-dropout passes; epistemic = Var(p); aleatoric = mean p(1-p);
     U = 0.6*epistemic + 0.4*aleatoric (ceiling ~0.15); normalised by 0.15.
  2. OOD C2: class-conditional shared-covariance Mahalanobis on penultimate features,
     shrinkage 0.05, fit on train only.
  3. Attribution coherence C3: **not evaluated** (no BHX boxes).
  4. Conflict C4: confidence x normalised U.
  5. Report negation: **not evaluated** (needs generated reports); excluded.
- **Composite H:** logistic regression (class-balanced) over the evaluated signals, fit on the
  **validation set only**, then frozen and applied to test.
- **Thresholds:** validation-set score quantiles at each review rate (no hand-set thresholds).
- **Aggregation:** binary slice task here; study-level rule (mean of top-3 slice probabilities)
  is frozen for CQ500 but untested (RSNA has no study ids).
- **Metrics:** error-detection AUROC (mid-rank ties), risk-coverage + AURC, unsafe-accepted
  per 1,000, sensitivity/specificity, share reviewed; 95% bootstrap CI (1000 resamples, fixed seed).
- **Not done (pending):** temperature scaling on validation (Step 3) — baselines use raw softmax.

## 4. Results (RSNA dev set, test n=300)

Error-detection AUROC (higher = better):

| arm | error AUROC | AURC | Brier | ECE |
|---|---|---|---|---|
| B1 max-softmax | 0.751 | 0.084 | 0.155 | 0.152 |
| B2 entropy | 0.751 | 0.084 | 0.155 | 0.152 |
| C1 uncertainty | 0.751 | 0.084 | 0.155 | 0.152 |
| C2 OOD | 0.502 | 0.189 | 0.155 | 0.152 |
| C4 conflict | 0.748 | 0.085 | 0.155 | 0.152 |
| **D composite H** | **0.685** | 0.132 | 0.155 | 0.152 |

Arm A (no gate): unsafe accepted 190.0 per 1,000; sensitivity 0.793, specificity 0.827.

**Composite H vs better baseline (B1):**

| review rate | rel. reduction in unsafe-accepted | 95% CI | passes >=20% & CI>0 |
|---|---|---|---|
| 5%  | -0.021 | [-0.093, 0.043] | no |
| 10% |  0.024 | [-0.089, 0.059] | no |
| 20% | -0.031 | [-0.098, 0.080] | no |
| 30% |  0.077 | [-0.136, 0.200] | no |

**Ablations (leave-one-signal-out, LR refit on validation):**

| variant | error AUROC | rel. reduction vs B1 @20% |
|---|---|---|
| without B1 max-softmax | 0.685 | -0.031 |
| without B2 entropy | 0.678 | -0.031 |
| without C1 uncertainty | 0.686 | -0.031 |
| **without C2 OOD** | **0.751** | 0.000 |
| without C4 conflict | 0.684 | -0.031 |

Figures: `fig_risk_coverage_full.svg`, `fig_error_auroc_full.svg`.

## 4a. One-sentence effect statement

**Omitted: the pre-registered success criterion was not met**, so no effect is claimed.

## 5. Findings

1. **The composite risk score H does not beat single-pass confidence.** Composite error AUROC
   0.685 vs 0.751 for max-softmax/entropy; relative reduction in unsafe-accepted never reaches
   the pre-registered 20% and the 95% CI includes zero at every review rate.
2. **The single-pass signals are collinear.** Max-softmax, entropy, MC-uncertainty and
   confidence-uncertainty conflict are effectively the same ranking (all ~0.75); removing any
   one barely changes the result.
3. **The OOD component is uninformative and harmful here.** C2 error AUROC 0.502 (chance); it
   is the *only* component that drags the composite down — dropping it restores H to exactly the
   baseline (0.751). This is expected: in-distribution errors on RSNA are ambiguous positives,
   not out-of-distribution inputs.
4. A stronger classifier did not help the gate: the composite was *worse* at val AUROC 0.918
   than at 0.745, because a better single-pass score leaves less for a composite to add.

## 6. Limitations

- Development set only; **no external (CQ500) test yet**.
- Image-level splits (RSNA has no patient id) — leakage risk documented.
- Non-commercial data licences (RSNA non-commercial; CQ500 NC-SA). Models are for
  non-commercial research use only.
- 2D slices; study-level aggregation rule fixed but untested.
- Negation and attribution signals not evaluated.
- Composite weights learned in this study (spec leaves them unspecified).
- No temperature-scaling calibration yet.
- Single task (haemorrhage vs none); small n (300 test slices).
- **Not clinical evidence.**

## 7. Reproduce

```
python -u -m validation.preprocessing.build_tensors --workers 16   # GCS-sourced, resumable
python -u -m validation.preprocessing.make_splits
python -u -m validation.study.train --epochs 12 --batch 8           # CPU, ~excluded h
python -u -m validation.study.run_study --model full                # arms A,B1,B2,C1,C2,C4,D,E
python -u -m validation.study.figures --tag full
pytest validation/study/tests -q
```

## 8. Decisions / approvals needed

1. **CQ500 access** (external test): licence CC BY-NC-SA; official host unreachable here.
   Approve a route (mirror/partner) or accept development-only reporting for now.
2. **RSNA non-commercial approval** before any commercial use of the model.
3. **Weights note:** composite weights are learned; confirm this is acceptable for the filing.
4. Confirm the default success criterion (>=20% relative reduction, CI excluding zero) stands.
5. Confirm whether to drop the OOD signal from the composite (finding 3) before the external test.
