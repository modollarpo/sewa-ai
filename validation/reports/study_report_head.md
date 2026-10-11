# RSNA development-set gating study (head)

**Model:** frozen-EfficientNet-B0 features + trained dropout head (val AUROC 0.7450222222222221)
**Scope:** RSNA development set (image-level); NO external test
**Marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

- n: {'train': 1400, 'val': 300, 'test': 300}  test error rate: 0.273

| arm | error AUROC | AURC | Brier | ECE |
|---|---|---|---|---|
| B1_maxsoftmax | 0.597 | 0.216 | 0.198 | 0.056 |
| B2_entropy | 0.597 | 0.216 | 0.198 | 0.056 |
| C1_uncertainty | 0.609 | 0.206 | 0.198 | 0.056 |
| C2_ood | 0.593 | 0.219 | 0.198 | 0.056 |
| C4_conflict | 0.589 | 0.214 | 0.198 | 0.056 |
| D_composite_H | 0.620 | 0.199 | 0.198 | 0.056 |

### Composite H vs better baseline (**B1_maxsoftmax**)

| review rate | rel. reduction | 95% CI | passes |
|---|---|---|---|
| 0.05 | 0.025 | [-0.014, 0.076] | False |
| 0.1 | 0.014 | [-0.055, 0.057] | False |
| 0.2 | 0.000 | [-0.055, 0.083] | False |
| 0.3 | 0.040 | [-0.021, 0.113] | False |

### Limitations
- RSNA only; no external (CQ500) test yet.
- RSNA has no patient id: image-level splits.
- Not clinical evidence.