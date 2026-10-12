# RSNA development-set gating study (full)

**Model:** fully fine-tuned EfficientNet-B0 (val AUROC 0.9184)
**Scope:** RSNA development set (image-level); NO external test
**Marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

- n: {'train': 1400, 'val': 300, 'test': 300}  test error rate: 0.190

| arm | error AUROC | AURC | Brier | ECE |
|---|---|---|---|---|
| B1_maxsoftmax | 0.751 | 0.084 | 0.155 | 0.152 |
| B2_entropy | 0.751 | 0.084 | 0.155 | 0.152 |
| C1_uncertainty | 0.751 | 0.084 | 0.155 | 0.152 |
| C2_ood | 0.502 | 0.189 | 0.155 | 0.152 |
| C4_conflict | 0.748 | 0.085 | 0.155 | 0.152 |
| D_composite_H | 0.685 | 0.132 | 0.155 | 0.152 |

### Composite H vs better baseline (**B1_maxsoftmax**)

| review rate | rel. reduction | 95% CI | passes |
|---|---|---|---|
| 0.05 | -0.021 | [-0.093, 0.043] | False |
| 0.1 | 0.024 | [-0.089, 0.059] | False |
| 0.2 | -0.031 | [-0.098, 0.080] | False |
| 0.3 | 0.077 | [-0.136, 0.200] | False |

### Limitations
- RSNA only; no external (CQ500) test yet.
- RSNA has no patient id: image-level splits.
- Not clinical evidence.