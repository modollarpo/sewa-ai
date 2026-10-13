# v2 feasibility report (amendment 2: label-integrity repair + wider unfreeze)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

**Parent pre-registrations:** `docs/evidence/preregistration_v2.md`, `docs/evidence/preregistration_v2_amendment1.md`, `docs/evidence/preregistration_v2_amendment2.md` (frozen before the formal test run).
**Branch:** `fix/patent-aligned`.

## Scope
- Public RSNA intracranial-haemorrhage data only; **no validated weights, no labelled clinical dataset**. All numbers are feasibility estimates on synthetic/demo-style public data.
- Grouping: `StudyInstanceUID`. Test A = fresh held-out scans; Test B = the same scans with 9 test-time corruptions; Test C (CQ500) is HELD.

## Model & training (frozen amendment)
- EfficientNet-B0; frozen early blocks (cached 160px), last-6 blocks + dropout head trained. val study-level AUROC **0.962** (epoch 6), temperature **0.798**.
- Per-slice labels from the authoritative RSNA `stage_2_train.csv` (amendment 2); study score = mean of the top-3 slice probabilities; n = val 120, Test A 120, Test B instances 1080.

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

## Primary comparison — D3 vs the better baseline (Test B)
**Baseline:** B2  **instances with D3:** 540

| review rate | rel. reduction | 95% CI | p (Holm) | passes success |
|---|---|---|---|---|
| 0.05 | 0.000 | [-0.037, 0.046] | 0.495 | False |
| 0.1 | 0.046 | [-0.015, 0.110] | 0.182 | False |
| 0.2 | 0.165 | [0.077, 0.263] | 0.003 | False |
| 0.3 | 0.205 | [0.107, 0.324] | 0.000 | True |

## Secondary comparison (Test A, clean)
**Baseline:** B1  **instances with D3:** 120

| review rate | rel. reduction | 95% CI | passes |
|---|---|---|---|
| 0.05 | 0.059 | [-0.091, 0.286] | False |
| 0.1 | 0.200 | [-0.134, 0.417] | False |
| 0.2 | 0.000 | [-0.500, 0.500] | False |
| 0.3 | 0.222 | [-0.333, 0.667] | False |

## Verdict: **INCONCLUSIVE**

Test B is underpowered (MDE 0.77 > 0.20); criterion NOT met and cannot be attributed to the gate failing.

## Limitations
- RSNA public data only; CQ500 (Test C) held and not evaluated.
- C3 (Grad-CAM coherence) is a **partial proxy** on a fixed subset of scans.
- Reduced-compute execution (amendment 1): 8 slices/scan, 160px, 1 seed — absolute metrics are lower bounds vs the full prereg.
- Amendment 2: per-slice labels taken from the authoritative `stage_2_train.csv` after the cached metadata label block was found decoupled; last-6 blocks trained at lr 1e-4.
- Grouping is by `StudyInstanceUID`, not patient (a patient with several studies could appear in more than one split).
- Not clinical evidence.
