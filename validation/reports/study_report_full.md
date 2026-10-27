# RSNA development-set gating study (full)

**Model:** fully fine-tuned EfficientNet-B0 (val AUROC 0.9184)
**Temperature (val-fitted):** 2.6559725839804784  **composite signals:** ['C1_uncertainty', 'C4_conflict']
**Scope:** RSNA development set (image-level); NO external test
**Marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

- n: {'train': 1400, 'val': 300, 'test': 300}  test error rate: 0.190

| arm | error AUROC | AURC | Brier | ECE |
|---|---|---|---|---|
| B1_maxsoftmax | 0.749 | 0.085 | 0.136 | 0.066 |
| B2_entropy | 0.749 | 0.085 | 0.136 | 0.066 |
| C1_uncertainty | 0.751 | 0.084 | 0.136 | 0.066 |
| C4_conflict | 0.751 | 0.084 | 0.136 | 0.066 |
| D_composite_H | 0.751 | 0.084 | 0.136 | 0.066 |

### Composite H vs better baseline (**B1_maxsoftmax**)

| review rate | rel. reduction | 95% CI | passes |
|---|---|---|---|
| 0.05 | 0.021 | [-0.018, 0.050] | False |
| 0.1 | 0.023 | [-0.049, 0.067] | False |
| 0.2 | 0.000 | [-0.059, 0.069] | False |
| 0.3 | 0.000 | [-0.031, 0.083] | False |

### Arm A (no gate)
- unsafe accepted per 1,000 = 190.0; sens 0.793, spec 0.827

### Ablations (leave-one-signal-out, LR refit on val)
| variant | error AUROC | rel. reduction vs B1 @20% |
|---|---|---|
| without_C1_uncertainty | 0.751 | 0.000 |
| without_C4_conflict | 0.751 | 0.000 |

### Limitations
- RSNA only; no external (CQ500) test yet.
- RSNA has no patient id: image-level splits.
- Not clinical evidence.