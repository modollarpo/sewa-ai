# v3 feasibility report — fresh disjoint scans, shifted test (D2 vs B2)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

**Pre-registration:** `docs/evidence/preregistration_v3.md` (written and frozen before this evaluation).
**Run:** one-shot, no tuning. Branches/artifacts local and unpushed.
**Verdict: NOT MET.**

---

## Scope
A fresh **120-scan** set drawn from the 1,093 studies of the RSNA 2000-image subset **not** used in v2 (seed 43), disjoint from v2 train/val/test and from the tile/feature cache. Evaluated clean and under the frozen 9 test-time corruptions (noise/blur/low-dose). Primary composite **D2 = C1+C2+C4** (no C3); the v2a1 model is reused, **not retrained**; the composite is fitted only on the v2 validation set.

| item | value |
|---|---|
| fresh scans | 120 (78 positive / 42 negative after authoritative labels) |
| shifted instances | 1080 (120 scans x 9 corruptions) |
| base error rate (shifted) | 0.313 |
| base error rate (clean) | 0.192 |
| D2 standardised weights (fitted on v2 val) | C1 +0.373, C2 +0.469, C4 +0.354; intercept -0.233 |

## Primary result (confirmatory): D2 vs B2, 20% review, shifted
| estimand | value | 95% CI (scan-cluster) |
|---|---|---|
| relative reduction in unsafe-accepted | **7.9%** | **[1.5%, 14.1%]** |

The 95% CI excludes 0 but the point estimate (7.9%) is **below the pre-registered >=15%** ⇒ **criterion NOT met**.

## Secondary (exploratory, not pass/fail)
Shifted set, D2 vs B2 relative reduction by review rate:

| review | rel. reduction | 95% CI |
|---|---|---|
| 5% | 1.3% | [-1.4%, 4.2%] |
| 10% | 2.1% | [-1.9%, 6.3%] |
| 20% (primary) | 7.9% | [1.5%, 14.1%] |
| 30% | 3.8% | [-2.2%, 11.5%] |

- Paired error-AUROC difference (D2 - B2) on the shifted set: **+0.025** (95% CI [+0.006, +0.044]; D2 0.714 vs B2 0.689; 1080 instances).
- Clean (uncorrupted, 120 scans): relative reduction at 20% = **-14.3%** (CI [-42.9%, +5.9%]); paired AUROC difference +0.039 (CI [-0.130, +0.130]). No benefit on clean scans.

## Interpretation
On a fresh, unseen, shifted scan set, D2 improves scan-level error detection (paired AUROC +0.025, CI excluding 0) but delivers only a **~8% relative reduction** in unsafe-accepted studies at 20% review — **below the pre-registered 15% bar**. Consistent with the v2 finding, the uncertainty/OOD gate helps less when the accepted-error base rate is already low and the shift is mild-to-moderate. This is a null-on-threshold confirmatory result under the pre-specified rule.

## Limitations
- Feasibility only, public RSNA data, no clinical weighting; **not clinical evidence**.
- 120 scans / 120 scan-clusters (1080 shifted instances); grouping by `StudyInstanceUID`, not patient.
- Same 8-slice/scan, 160px, single-seed reduced-compute pipeline as v2; absolute values are lower bounds.
- C3 (Grad-CAM) is excluded from D2 (found confounded/anti-predictive; see the v2 report).
- Test C (CQ500) remains **HELD** and was not evaluated.
