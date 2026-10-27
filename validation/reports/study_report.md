# RSNA development-set gating study

**Scope:** RSNA development set (image-level); NO external test

**Evidence marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

- n: {'train': 1400, 'val': 300, 'test': 300}
- head val AUROC: 0.745
- test error rate: 0.283

## Arms (test)

| arm | error AUROC | AURC |
|---|---|---|
| B1_maxsoftmax | 0.614 | 0.223 |
| B2_entropy | 0.614 | 0.223 |
| C1_uncertainty | 0.626 | 0.216 |
| C2_ood | 0.605 | 0.221 |
| C4_conflict | 0.582 | 0.236 |
| D_composite_H | 0.636 | 0.204 |

## Composite H vs better baseline at matched review rate

Baseline = **B1_maxsoftmax**

| review rate | rel. reduction | 95% CI | passes |
|---|---|---|---|
| 0.05 | 0.025 | [-0.027, 0.069] | False |
| 0.1 | 0.000 | [-0.048, 0.046] | False |
| 0.2 | 0.016 | [-0.034, 0.094] | False |
| 0.3 | 0.020 | [-0.038, 0.118] | False |

## Limitations
- RSNA only; no external (CQ500) test yet.
- RSNA has no patient id: splits are image-level (slices from one patient may cross splits).
- Backbone is FROZEN pretrained EfficientNet-B0; head is trained (CPU limit).
- Not clinical evidence.