# Pre-registration amendment 1 to v2: reduced-compute execution (no GPU)

**Status:** FROZEN before the **formal** v2 test evaluation (Test A / Test B).
**Parent:** `docs/evidence/preregistration_v2.md` (unchanged in aim, arms, signals, primary comparison).
**Branch:** `fix/patent-aligned`. **Marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

## 0. Why this amendment
The machine has **no GPU** and only **2 physical cores / 4 logical, 7.87 GB RAM**. Smoke-test
timings (evidence: `validation/reports/step0_smoke_timings.json`) show training is the bottleneck
and that inference, MC dropout and corruptions are cheap. This amendment cuts **training cost**
only, **without changing the science**: same signals (C1–C4), same arms (A, B1, B2, D1–D3, E),
same primary comparison (D3 vs better of B1/B2 at 20% review on Test B), same success criterion,
same test corruptions. Everything below is pre-registered **before** the formal test run.

### Smoke-test timings that justify the choices (2 threads)
| operation | 160px | 224px |
|---|---|---|
| full forward | 82 ms/slice | 225 ms/slice |
| backbone features | 84 ms/slice | 164 ms/slice |
| full-net train step | 304 ms/slice | 554 ms/slice |
| **train last-3-blocks + head** | **153 ms/slice** | — |
| head-only (MC 20×) on cached feats | ~free (12 µs/feat-pass) | — |
| Grad-CAM backward (1 slice) | ~320 ms | 647 ms |

Because model dropout lives **only in the classifier head**, Monte-Carlo dropout is evaluated by
running the **backbone once** and the **head N=20 times** on cached features (mathematically
identical to `model.py`'s MC over the whole net, as the backbone has no other stochastic layer and
no batch-norm momentum update in eval mode).

## 1. Data (unchanged grouping; deeper slices)
- **Grouping:** `StudyInstanceUID` (unchanged). Splits unchanged (`step2_manifest_v2.json`): train 560 / val 120 / test 120 scans, seed 42, 0 leakage.
- **Slice depth:** **8 slices per scan**, chosen **evenly spread by `ImagePositionPatient_3`** (slice z-position) from the scan's full slice list in `stage_2_train_with_metadata.csv`. *(Supersedes "up to 32 slices/scan".)*
- **Resolution:** **160×160** (downsampled from the cached 224×224 3-window tiles). Same 3 frozen windows (brain/subdural/bone).
- **No data augmentation** (required by the cached-early-layer recipe).
- Per-slice `Label` (any hemorrhage finding) from the metadata; study label = any positive slice (unchanged).

## 1b. Deviation log (recorded)
| # | Change vs prereg v2 | Reason |
|---|---|---|
| A1 | ≤32 slices/scan → **8 slices/scan**, evenly spaced by z | Training/inference budget on 2 cores |
| A2 | 224px → **160px** | ~2.7× cheaper forward |
| A3 | full fine-tune → **last 3 blocks + head** fine-tune, **frozen early layers cached** | ~2× cheaper training step; enables resumable cache |
| A4 | 12 epochs → **≤8 epochs with val-AUROC early stop** | budget |
| A5 | one seed only | budget |
| A6 | Grad-CAM (C3) → **fixed subset** of test scans, marked **partial** | Grad-CAM needs backward |

## 2. Frozen model & calibration (unchanged rules except A2–A4)
- Backbone EfficientNet-B0 (ImageNet `IMAGENET1K_V1`); early feature blocks **frozen**; last 3 blocks + dropout(0.3)+Linear head **trained**. Seed 42.
- Training input 160px, batches of 32, AdamW (lr 1e-3 head / 3e-4 late blocks), early stop on **validation study-level AUROC**, ≤8 epochs.
- **Study-level aggregation score = mean of the top-3 slice probabilities** (frozen).
- **Temperature scaling** fitted on the **validation study-level scores** (minimising study-label NLL), applied before thresholding. *(Clarifies parent §3: the gate is a study-level decision.)*

## 3. Signals & arms (unchanged)
- C1 MC-dropout uncertainty, N=20 (epistemic Var($p$), aleatoric mean $p(1{-}p)$, $U=0.6\text{epi}+0.4\text{ale}$, ceiling 0.15).
- C2 class-conditional Mahalanobis on the penultimate embedding (shrinkage γ=0.05), fit on **train** only.
- C3 Grad-CAM mass inside an intracranial mask (brain-window HU threshold) — **partial** (fixed subset).
- C4 conflict = confidence × normalized $U$.
- Per-slice signals aggregated to study level by the **mean over the same top-3 slices** used for the classification score.
- Arms: A (no gate), B1 max-softmax, B2 entropy, C1–C4, D1=C1+C4, D2=C1+C2+C4, D3=C1+C2+C3+C4, E leave-one-out. Composite weights = class-balanced logistic regression on **validation** only.

## 4. Test corruptions (Test B) — unchanged, test-time only
Gaussian noise σ∈{0.05,0.10,0.20}; Gaussian blur σ∈{1,2,4}; simulated low-dose Poisson
(scale factor κ∈{0.5,0.25,0.125}, i.e. 50%/25%/12.5% of nominal photons) on the 0–1 tensor.
All corruptions applied to the **same 120 test scans** at test time; never used for training.

## 5. Primary comparison & success (unchanged)
D3 vs the better of B1/B2 at the **20% review rate on Test B**, success = **≥20% relative reduction**
in wrongly-accepted studies with **95% bootstrap CI (clustered by scan) excluding zero**; Holm
correction across review rates {5,10,20,30%}.

## 5b. Power (NEW, per instruction)
Before the formal test evaluation, compute the **minimum detectable effect (MDE)** for a 20% relative
reduction at 80% power / α=0.05 by bootstrap on **validation** study-level scores. If the MDE exceeds
20% relative, the test set is **underpowered**, and a null result is reported as **inconclusive**
(not as evidence that the gate fails); a positive result is reported with the power caveat.

## 5c. Test C (CQ500) — HELD
Not evaluated. Checksums to be verified against the official source before any use.

## 6. Freeze rule
This amendment is committed **before** the formal Test A / Test B evaluation. Any later change is logged as "post-hoc, exploratory".
