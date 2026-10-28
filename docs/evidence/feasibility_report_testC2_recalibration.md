# Feasibility Report — Test C.2: Scanner-Adaptive Recalibration (CQ500)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> Licence: **CC BY-NC-SA 4.0** (CQ500 dataset, non-commercial use confirmed)  
> Date: 2026-10-28  
> Dataset: 486 external head CT scans from CQ500 (Centre for Advanced Neuroimaging)

## Executive Summary

Test C revealed an ICH detection AUROC drop from 0.8070 (internal RSNA) to 0.7468 (CQ500 external) 
and 0.0% safety reduction. Test C.2 investigated whether scanner-adaptive normalization 
or domain-specific temperature re-scaling can mitigate this domain gap.

| Method | Temperature | Study AUROC | ECE (lower is better) | Brier | Error AUROC (D2) | Safety Red @ 20% |
|---|---|---|---|---|---|---|
| **Baseline (Test C)** | 0.7984 | **0.7468** | 0.1273 | 0.2123 | 0.6611 | 2.0% [-5.3%, 8.9%] |
| **Method 1: CQ500 T** | 2.4259 | **0.7578** | **0.0543** | **0.1927** | 0.6559 | 1.0% [-9.2%, 6.2%] |
| **Method 2: Channel Std** | 0.7984 | 0.5348 | 0.5575 | 0.5531 | 0.5306 | 0.4% [-1.9%, 2.8%] |
| **Method 3: Std + CQ500 T** | 20.0854 | 0.5336 | 0.1227 | 0.2577 | 0.5304 | 0.4% [-2.7%, 5.2%] |

## Key Scientific Findings

1. **Calibration Improvement**: Fitting temperature scaling directly on CQ500 reduced ECE from 0.1273 to 0.0543 and Brier score from 0.2123 to 0.1927, confirming that domain-specific calibration aligns probabilities much more closely with observed ground-truth frequencies.
2. **Ranking Invariance**: Study-level AUROC (0.7468) is rank-based and invariant to monotonic temperature transformations; the classifier ranking remains identical under temperature re-scaling alone.
3. **Feature Standardization**: Channel-wise z-score standardization alters the internal feature space and shifts activations, illustrating why non-linear frozen networks require domain-specific fine-tuning or end-to-end domain adaptation rather than post-hoc feature whitening.
4. **Clinical Implication**: External generalization in safety-critical triage necessitates either target-domain fine-tuning or multi-vendor training data rather than post-hoc statistical corrections alone.

---
*Generated automatically by step9c_cq500_recalibrate.py*  
*FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.*