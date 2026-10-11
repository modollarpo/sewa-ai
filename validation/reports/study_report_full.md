# RSNA development-set gating study (full)

**Model:** fully fine-tuned EfficientNet-B0 (val AUROC 0.9148444444444446)
**Scope:** RSNA development set (image-level); NO external test
**Marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

- n: {'train': 1400, 'val': 300, 'test': 300}  test error rate: 0.190

| arm | error AUROC | AURC | Brier | ECE |
|---|---|---|---|---|
| B1_maxsoftmax | 0.756 | 0.082 | 0.145 | 0.110 |
| B2_entropy | 0.756 | 0.082 | 0.145 | 0.110 |
| C1_uncertainty | 0.756 | 0.082 | 0.145 | 0.110 |
| C2_ood | 0.401 | 0.258 | 0.145 | 0.110 |
| C4_conflict | 0.756 | 0.082 | 0.145 | 0.110 |
| D_composite_H | 0.738 | 0.104 | 0.145 | 0.110 |

### Composite H vs better baseline (**B1_maxsoftmax**)

| review rate | rel. reduction | 95% CI | passes |
|---|---|---|---|
| 0.05 | 0.020 | [-0.038, 0.123] | False |
| 0.1 | 0.000 | [-0.107, 0.073] | False |
| 0.2 | 0.031 | [-0.088, 0.122] | False |
| 0.3 | -0.087 | [-0.176, 0.080] | False |

### Limitations
- RSNA only; no external (CQ500) test yet.
- RSNA has no patient id: image-level splits.
- Not clinical evidence.