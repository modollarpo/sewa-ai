# Test C Feasibility Report: External Evaluation on CQ500 (Qure.ai)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

- **Pre-registration:** `docs/evidence/preregistration_testC_cq500.md` (committed before evaluation).
- **Branch:** `fix/patent-aligned`.
- **Licence:** CC BY-NC-SA 4.0 (CQ500). Non-commercial feasibility use confirmed 2026-10-14.
- **Run Date:** 2026-10-15.
- **Report Artifact:** `validation/reports/v2a1_testC_cq500.json`.

---

## 1. Executive Summary

Test C evaluates the frozen EfficientNet-B0 model (`validation/models/classifier_v2a1.pt`, trained on RSNA) on the independent external **CQ500** head CT dataset (486 evaluable scans, majority read of 3 radiologists).

| Metric | Result | Target / Baseline | Interpretation |
|---|---|---|---|
| **Study-level ICH AUROC (Primary Descriptive)** | **0.7468** | Reference: 0.807 (RSNA Test A) | Domain generalization drop from RSNA to CQ500 (external site/scanner shift). |
| **Error AUROC: D2 Composite** | **0.6583** | B2 baseline: 0.6578 | D2 error discrimination is virtually identical to predictive entropy (+0.0005). |
| **Safety Reduction at 20% Review (Primary Confirmatory)** | **0.0%** | **≥ 15.0%** | **Not met.** 95% CI includes 0. |
| **95% Clustered Bootstrap CI (20% Review)** | **[-8.1%, +6.5%]** | Must exclude 0 | Spans zero; no statistically detectable benefit over B2. |
| **Verdict** | **INCONCLUSIVE** | Pre-registered rules (§7) | Fails primary efficacy criterion; CI includes 0. |

---

## 2. Dataset and Preprocessing Execution

- **Source:** CQ500 (Centre for Advanced Research in Imaging, New Delhi / Qure.ai).
- **Staging & Processing:** 491 scans streamed in-memory via an Azure Kubernetes Service (AKS) preprocessing job (`cq500-preprocess`) in `swedencentral` directly against Azure Blob Storage (`sewavalidationdata`).
- **Exclusions:** 5 documented corrupt scans (`CQ500-CT-19`, `CQ500-CT-22`, `CQ500-CT-25`, `CQ500-CT-52`, `CQ500-CT-120`) excluded prior to evaluation.
- **Evaluable Cohort:** 486 scans (202 ICH positive by majority of 3 radiologists, 284 negative; 41.6% prevalence).
- **Slice Extraction:** 8 uniformly spaced slices along the z-axis (matching the RSNA pipeline), 3-window HU mapping (brain, subdural, bone), resized to 224px, and passed through frozen early convolutional layers to form `v2_early_cq500.npz` (3,884 slices, 372.3 MB).
- **Zero scan dropouts:** All 486 target scans completed successfully (`failed_scans: []`).

---

## 3. Primary Outcomes

### 3.1 Study-Level ICH Detection AUROC (Descriptive)

The study-level probability was computed as the average of the top-3 slice probabilities with temperature scaling ($T = 0.7984$, fitted on RSNA validation).

$$\text{External ICH AUROC} = \mathbf{0.7468}$$

- Compared to the internal RSNA Test A benchmark (AUROC 0.807), the model experiences an expected performance drop of ~0.060 AUROC points when generalized to an unseen external clinical cohort with different scanners and slice protocols.

### 3.2 Safety Reduction (Confirmatory Review Gate)

The pre-registered primary hypothesis evaluated whether routing scans by composite metacognition score ($D_2$: MC-dropout uncertainty $C_1$ + Mahalanobis OOD distance $C_2$ + conflict $C_4$, weights fitted on RSNA validation) reduces unsafe-accepted errors compared to standard predictive entropy ($B_2$) at a 20% review budget.

- **Point Estimate:** **0.0%** relative reduction.
- **95% Bootstrap Confidence Interval:** **[-0.081, +0.065]** (1,000 scan-cluster resamples).
- **Pre-registered Success Threshold:** $\ge 15.0\%$ and CI lower bound $> 0.0$.
- **Outcome:** **Criteria NOT MET.** The confidence interval covers zero and the point estimate is 0.0%, indicating that $D_2$ provides no measurable gating advantage over baseline entropy $B_2$ on this external dataset.

---

## 4. Secondary Review Rates

The table below reports relative reductions in unsafe-accepted studies across all pre-registered review fractions:

| Review Rate | Relative Reduction ($D_2$ vs $B_2$) | 95% Clustered Bootstrap CI | Passes $\ge 15\%$ & CI > 0 |
|---|---|---|---|
| **5%** | -1.5% | [-5.9%, +1.5%] | False |
| **10%** | -3.3% | [-8.4%, +1.6%] | False |
| **20% (Primary)** | **0.0%** | **[-8.1%, +6.5%]** | **False** |
| **30%** | -8.0% | [-19.4%, +3.7%] | False |

At every review operating point, the confidence intervals cross zero and point estimates remain near zero or slightly negative.

---

## 5. Composite Weights and Error Discrimination

- **$D_2$ Logistic Regression Coefficients (fitted on RSNA Val):**
  - $C_1$ (Normalized MC-Dropout Uncertainty): $+0.436$
  - $C_2$ (Mahalanobis OOD Penultimate Distance): $+0.463$
  - $C_4$ (Confidence $\times$ Uncertainty Conflict): $+0.287$
  - Intercept: $-0.229$
- **Error-Detection AUROC:**
  - $D_2$ Composite: **0.6583**
  - $B_2$ Predictive Entropy: **0.6578**
  - Difference: $+0.0005$

---

## 6. Scientific and Methodological Conclusions

1. **Pre-registration Adherence**:
   - The test was executed in accordance with `docs/evidence/preregistration_testC_cq500.md` without post-hoc tuning, metric cherry-picking, or retraining.
   - Evaluated once against authoritative majority radiologist reads.
2. **Honest Appraisal of Prototype Metacognition**:
   - Across RSNA Test B (v2: inconclusive, underpowered), RSNA fresh corruptions (v3: not met), and now CQ500 external held-out scans (Test C: inconclusive/0.0% reduction), multi-signal metacognitive gating ($D_2$) does not demonstrably improve triage safety over simpler predictive entropy ($B_2$).
   - The primary classifier achieves modest external discrimination (AUROC 0.747) on CQ500, confirming functioning prototype capabilities on non-contrast head CT, but below the standard required for standalone or autonomous clinical deployment.
3. **Regulatory & Documentation Alignment**:
   - These findings reinforce the truthful public framing established in PR #2: SEWA AI is an early-stage research prototype evaluated on public datasets, with no clinical clearance or evidence of autonomous diagnostic efficacy.
