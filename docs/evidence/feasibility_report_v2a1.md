# v2 feasibility report (amendment 2: label-integrity repair + wider unfreeze)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

**Parent pre-registrations:** `docs/evidence/preregistration_v2.md`, `docs/evidence/preregistration_v2_amendment1.md`, `docs/evidence/preregistration_v2_amendment2.md` (frozen before the formal test run).
**Branch:** `fix/patent-aligned`.

## Scope
- Public RSNA intracranial-haemorrhage data only; **no validated weights, no labelled clinical dataset**. All numbers are feasibility estimates on **real public RSNA data**.
- Grouping: `StudyInstanceUID`. Test A = fresh held-out scans; Test B = the same scans with 9 test-time corruptions; Test C (CQ500) is HELD.

## Model & training (frozen amendment)
- EfficientNet-B0; frozen early blocks (cached 160px), last-6 blocks + dropout head trained. val study-level AUROC **0.962** (epoch 6), temperature **0.798**.
- Per-slice labels from the authoritative RSNA `stage_2_train.csv` (amendment 2); study score = mean of the top-3 slice probabilities.

## Effective sample size and clustering (verified)
All paired bootstrap CIs and Holm p-values resample **scans (StudyInstanceUID) as clusters**, not corrupted instances: `validation/study/compare.py::relative_reduction_ci` builds one group per unique cluster value and resamples whole clusters with replacement, and every call passes `clusters = sig["study"]` (the StudyInstanceUID). Corrupted instances of a scan are always resampled together (paired).

| comparison | instances | corrupted copies / scan | clusters (scans) |
|---|---|---|---|
| Power / MDE (validation) | 120 studies | 1 | **120** |
| Test A primary (D3 vs baseline) | 120 | 1 | **120** |
| Test B pooled, D3/C3 subset | 540 | 9 | **60** |
| Test B pooled, all arms | 1080 | 9 | 120 |

## Power (pre-registered 5b, computed before the formal run)
| review rate | MDE (80% power, rel.) | underpowered vs 20% |
|---|---|---|
| 0.05 | 0.173 | False |
| 0.1 | 0.304 | True |
| 0.2 | 0.768 | True |
| 0.3 | 1.366 | True |

_MDE from paired cluster bootstrap on validation; composite is fitted in-sample so MDE is optimistic (true MDE likely larger). If the 20% review MDE > 0.20 a null Test-B result is reported as INCONCLUSIVE._

## Test A (clean held-out scans)
| arm | error AUROC | AURC | n |
|---|---|---|---|
| B1 | 0.706 | 0.102 | 120 |
| B2 | 0.720 | 0.099 | 120 |
| C1 | 0.726 | 0.094 | 120 |
| C2 | 0.720 | 0.070 | 120 |
| C3 | 0.316 | 0.259 | 120 |
| C4 | 0.740 | 0.091 | 120 |
| D1 | 0.730 | 0.093 | 120 |
| D2 | 0.793 | 0.055 | 120 |
| D3 | 0.807 | 0.053 | 120 |

_C3 (Grad-CAM inside-mask coherence) is **anti-predictive** here, not merely weak: error-AUROC **0.316** (<0.5), i.e. its risk score runs opposite to error. It is reported with its true sign; the sign is not flipped to make it look useful._

## Test B (pooled 9 corruptions)
| arm | error AUROC | AURC | n |
|---|---|---|---|
| B1 | 0.711 | 0.173 | 1080 |
| B2 | 0.716 | 0.170 | 1080 |
| C1 | 0.719 | 0.169 | 1080 |
| C2 | 0.729 | 0.170 | 1080 |
| C3 | 0.343 | 0.401 | 540 |
| C4 | 0.718 | 0.169 | 1080 |
| D1 | n/a | n/a | n/a |
| D2 | n/a | n/a | n/a |
| D3 | n/a | n/a | n/a |

_C3 (Grad-CAM coherence) is **anti-predictive** on Test B too: error-AUROC **0.343** (<0.5), reported without sign flipping. D3 pooled error-AUROC = **0.782** on the 540 instances (60 scans x 9 corruptions) where C3 is defined._

## Primary comparison — D3 vs the better baseline (Test B)
**Baseline:** B2  **instances with D3:** 540 (= 60 scans x 9 corruptions; cluster unit = **60 scans**)

| review rate | rel. reduction | 95% CI | p (Holm) | passes success |
|---|---|---|---|---|
| 0.05 | 0.000 | [-0.037, 0.046] | 0.495 | False |
| 0.1 | 0.046 | [-0.015, 0.110] | 0.182 | False |
| 0.2 | 0.165 | [0.077, 0.263] | 0.003 | False |
| 0.3 | 0.205 | [0.107, 0.324] | 0.000 | True |

_Only the **20%** row is the pre-registered primary comparison. The 30% row is a secondary/exploratory review rate and is **not** reported as a pass; the 5%/10% rows are part of the Holm family but are not the primary gate._

## Secondary comparison (Test A, clean)
**Baseline:** B1  **instances with D3:** 120 (cluster unit = **120 scans**)

| review rate | rel. reduction | 95% CI | passes |
|---|---|---|---|
| 0.05 | 0.059 | [-0.091, 0.286] | False |
| 0.1 | 0.200 | [-0.134, 0.417] | False |
| 0.2 | 0.000 | [-0.500, 0.500] | False |
| 0.3 | 0.222 | [-0.333, 0.667] | False |

---

# POST-HOC, EXPLORATORY (not pre-registered)

_These analyses were added after the pre-registered run. They do not change the pre-registered primary comparison or the verdict above._

## How the 60-scan C3/D3 subset was chosen (outcome-independent)
`select_gradcam_studies(studies, labels, frac=0.5)`: studies are sorted by `StudyInstanceUID`, grouped by **ground-truth study label**, and a deterministic stride sample of `frac=0.5` of each class is taken. It uses only the StudyInstanceUID ordering and the labels — never the model's scores, predictions, probabilities, or errors — so the selection cannot be biased by outcomes. Result: **60 scans** (42 positive / 18 negative; overall Test B is 83/120 positive).

## Test B D1/D2 across all 120 scans, and fitted composite weights
D1 and D2 use no C3, so they are defined on all 120 scans (1080 scan x corruption instances):

| arm | error AUROC (all 120 scans) |
|---|---|
| B1 | 0.711 |
| B2 | 0.716 |
| C1 | 0.717 |
| C2 | 0.729 |
| C4 | 0.716 |
| D1 | 0.718 |
| D2 | 0.752 |

On the 60-scan subset where C3 is defined (540 instances), arm error-AUROC is:

| arm | error AUROC (60-scan subset) |
|---|---|
| B1 | 0.709 |
| B2 | 0.721 |
| C1 | 0.726 |
| C2 | 0.753 |
| C3 | 0.343 |
| C4 | 0.729 |
| D1 | 0.728 |
| D2 | 0.774 |
| D3 | 0.782 |

### Fitted composite weights (logistic regression on validation only)
- **D1** (C1+C4), intercept -0.507: C1=+1.482, C4=+1.101
- **D2** (C1+C2+C4), intercept -3.527: C1=+1.464, C2=+0.092, C4=+1.100
- **D3** (C1+C2+C3+C4), intercept -2.550: C1=+1.520, C2=+0.077, C3=-1.038, C4=+1.132

**C3 weight in D3 is negative (-1.038)** — the fitted model uses the anti-predictive Grad-CAM proxy with a negative sign, consistent with its below-chance error-AUROC. This is reported as-is; the sign is not flipped.

## Design-based power analysis for the actual Test B design (post-hoc)
- Effective **scans = 60** (540 instances = 60 scans x 9 corruptions), baseline B2, review rate 20%.
- Design-based bootstrap SE = **0.048**; 95% CI half-width = **0.092** (reproduces the pre-registered CI half-width ~0.09).
- MDE at 80% power (CI-excludes-0) = **0.133**.
- Power under the **full pre-registered success rule** (point estimate >= 20% AND CI excludes 0): 0.49 at a true 20% effect; 0.85 at 25%; 0.14 at 15%.
- _Reason the earlier validation-based MDE (0.77) differs from this CI half-width (~0.09): they are different designs. Section 5b bootstrapped the **validation** set (120 uncorrupted scans, composite fitted in-sample, baseline B1), where the relative-reduction ratio at 20% review has a heavy tail (SD 0.27). The design-based analysis uses the **actual Test B design** (60 scan-clusters, each averaging 9 corruptions, baseline B2), whose SE is ~5.8x smaller (0.05). Part of the ratio (1.43x) is just the z-constant (MDE uses z_0.975+z_0.8 = 2.8 x SD; a CI half-width is ~1.96 x SD). Note that reaching a >=20% *point estimate* at a true 20% effect is ~a coin flip by construction, so power under the full rule is ~0.49 even though the CI-exclusion MDE is 0.13._

## D2 vs B2 on Test B, all 120 scans (post-hoc exploratory)
D2 (C1+C2+C4) uses no C3, so it is defined on all 120 scans (1080 instances). Relative reduction in unsafe-accepted vs B2 (predictive entropy), scan-cluster bootstrap:

| review | relative reduction | 95% CI |
|---|---|---|
| 5% | 0.0% | [-2.7%, 3.1%] |
| 10% | 5.2% | [1.4%, 9.5%] |
| 20% | 8.4% | [2.7%, 13.2%] |
| 30% | 9.4% | [2.7%, 15.7%] |

- Paired error-AUROC difference (D2 - B2) on **Test B** (1080 instances): **+0.035** (95% CI [+0.011, +0.060]; D2 0.752 vs B2 0.716).
- Paired error-AUROC difference (D2 - B2) on **Test A** (120 scans): **+0.076** (95% CI [+0.013, +0.148]; D2 0.796 vs B2 0.720).
- Note: D2's relative reduction is far below the D3 result and was **not** a pre-registered comparison; it is reported for completeness only.

## C3 (Grad-CAM) proxy investigation (post-hoc exploratory)
**Sign convention.** `C3 risk = 1 - inside_fraction`, where `inside_fraction = sum(cam*mask)/sum(cam)` and the mask is the brain-window channel (`x[0,0] > 0.05` on the 160px tile; `v2_lib.py:189`). Higher C3 risk = more Grad-CAM mass **outside** the brain mask.
**Target class.** Grad-CAM differentiates `argmax(logits)` — the **predicted** class (`v2_lib.py:184`), not a fixed class. A scan the model calls positive explains class 1; one it calls negative explains class 0.

**Behaviour on positives vs negatives (Test A, 120 scans).** Mean C3 risk tracks the *predicted* label, not correctness:

| scan group | n | mean C3 risk | mean inside | Grad-CAM target = class 1 |
|---|---|---|---|---|
| TN | 36 | 0.460 | 0.540 | 0.08 |
| FP | 1 | 0.665 | 0.335 | 0.67 |
| FN | 18 | 0.438 | 0.562 | 0.19 |
| TP | 65 | 0.605 | 0.395 | 0.92 |

- C3 risk is ~0.60 whenever the model predicts **positive** (TP 0.605, and the one FP 0.665) and ~0.45 when it predicts **negative** (TN 0.452, FN 0.438) — Test A. It separates the *predicted label*, not correct-vs-incorrect.
- Grad-CAM targets class 1 in 92% of top-3 slices for TP scans but only 8% for TN scans, confirming the predicted-class confound.
- Consequence: C3's error-AUROC is below chance (val 0.354, Test A 0.316), because most positives are classified correctly, so 'high C3' coincides with 'correct'. **The negative fitted weight on C3 in D3 is a symptom of this confound, not evidence of value.**

## Standardised composite weights (post-hoc exploratory)
Features z-scored on validation, so coefficients are comparable across signals:

| composite | standardised weights (z-scored) |
|---|---|
| D1 | C1=+0.390, C4=+0.320 |
| D2 | C1=+0.403, C2=+0.470, C4=+0.317 |
| D3 | C1=+0.553, C2=+0.140, C3=-0.739, C4=+0.316 |

- C4 (conflict x uncertainty) and C1 (normalised MC-dropout uncertainty) carry the largest positive standardised weights in every composite; C2 (Mahalanobis OOD) contributes little.
- In D3, **C3 receives the largest-magnitude standardised weight but with a negative sign** (-0.74) — consistent with the C3 confound above, not with a useful signal.


## Verdict: **INCONCLUSIVE**

At the primary 20% review rate the **pre-registered criterion is NOT met** (16.5%, CI [7.7%, 26.3%]) — below the pre-registered >=20% bar. A **post-hoc design-based power analysis** for this exact Test B design (60 scan clusters, 9 corruptions/scan, baseline B2) gives an MDE of **0.13**, so the shortfall is the **point estimate, not power**. The validation-based MDE (0.77) is not the MDE for this design and is not used here. The verdict is kept **INCONCLUSIVE** as pre-registered (only a single exploratory test run has been done; no confirmatory replication). The 30% review rate is secondary/exploratory and is not counted as a pass.

## Limitations
- Real public RSNA data only; CQ500 (Test C) held and not evaluated.
- C3 (Grad-CAM inside-mask coherence) is a **partial proxy** on a fixed subset of scans and is **anti-predictive** (error-AUROC 0.316 Test A / 0.343 Test B, below chance); reported with its true sign, never flipped.
- Primary Test B comparison rests on **60 scans** (the C3/D3 subset) x 9 corruptions = 540 instances; the bootstrap clusters by scan, so power is driven by 60 clusters, not 540.
- Reduced-compute execution (amendment 1): 8 slices/scan, 160px, 1 seed — absolute metrics are lower bounds vs the full prereg.
- Amendment 2: per-slice labels taken from the authoritative `stage_2_train.csv` after the cached metadata label block was found decoupled; last-6 blocks trained at lr 1e-4.
- Grouping is by `StudyInstanceUID`, not patient (a patient with several studies could appear in more than one split).
- Not clinical evidence.
