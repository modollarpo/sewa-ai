# Test C Feasibility Report: External Evaluation on CQ500 (Qure.ai)

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

- **Pre-registration:** `docs/evidence/preregistration_testC_cq500.md` (committed before evaluation).
- **Branch:** `fix/patent-aligned`.
- **Licence:** CC BY-NC-SA 4.0 (CQ500). Non-commercial feasibility research use confirmed 2026-10-14.
- **Run Date:** 2026-10-15.
- **Report Artifact:** `validation/reports/v2a1_testC_cq500.json`.

---

## 1. Executive Summary

Test C evaluates the frozen EfficientNet-B0 model (`validation/models/classifier_v2a1.pt`, trained on RSNA) on the independent external **CQ500** head CT dataset (486 evaluable scans, majority read of 3 radiologists).

| Metric | Result | Target / Baseline | Interpretation & Verdict |
|---|---|---|---|
| **Study-level ICH AUROC (Primary Descriptive)** | **0.7468** | Reference: 0.807 (RSNA Test A) | Domain generalisation drop from RSNA to CQ500 (external site/scanner shift; confounded by slice sampling). |
| **Error AUROC: D2 Composite** | **0.6583** | B2 baseline: 0.6578 | D2 error discrimination is virtually identical to predictive entropy ($\Delta = +0.0005$). |
| **Safety Reduction at 20% Review (Primary Confirmatory)** | **0.0%** | **$\ge 15.0\%$** | **Criterion NOT MET**. 95% CI excludes the 15% threshold. |
| **95% Clustered Bootstrap CI (20% Review)** | **[-8.1%, +6.5%]** | Must exclude 0 & reach $\ge 15\%$ | Upper bound (+6.5%) falls far short of +15.0%. |
| **Verdict** | **Primary criterion NOT MET** | See Verdict & Power Analysis (§4) | The 95% CI upper bound (+6.5%) strictly excludes the 15% threshold; study was adequately powered. |

---

## 2. Dataset and Preprocessing Execution

- **Source:** CQ500 (Centre for Advanced Research in Imaging, New Delhi / Qure.ai).
- **Staging & Processing:** 491 scans streamed in-memory via an Azure Kubernetes Service (AKS) preprocessing job (`cq500-preprocess`) in `swedencentral` directly against Azure Blob Storage (`sewavalidationdata`).
- **Exclusions:** 5 documented corrupt scans (`CQ500-CT-19`, `CQ500-CT-22`, `CQ500-CT-25`, `CQ500-CT-52`, `CQ500-CT-120`) excluded prior to evaluation.
- **Evaluable Cohort:** 486 scans (202 ICH positive by majority of 3 radiologists, 284 negative; 41.6% prevalence).
- **Slice Extraction:** 8 uniformly spaced slices along the z-axis (matching the base RSNA pipeline), 3-window HU mapping (brain, subdural, bone), resized to 224px, and passed through frozen early convolutional layers to form `v2_early_cq500.npz` (3,884 slices, 372.3 MB).
- **Zero scan dropouts:** All 486 target scans completed successfully (`failed_scans: []`).

---

## 3. Primary Outcomes

### 3.1 Study-Level ICH Detection AUROC (Descriptive)

The study-level probability was computed as the average of the top-3 slice probabilities with temperature scaling ($T = 0.7984$, fitted on RSNA validation).

$$\text{External ICH AUROC} = \mathbf{0.7468}$$

- Compared to the internal RSNA Test A benchmark (AUROC 0.807), the model experiences an observed performance gap of ~0.060 AUROC points on external multi-scanner clinical data.

### 3.2 Safety Reduction (Confirmatory Review Gate)

The pre-registered primary hypothesis evaluated whether routing scans by composite metacognition score ($D_2$: MC-dropout uncertainty $C_1$ + Mahalanobis OOD distance $C_2$ + conflict $C_4$, weights fitted on RSNA validation) reduces unsafe-accepted errors compared to standard predictive entropy ($B_2$) at a 20% review budget.

- **Point Estimate:** **0.0%** relative reduction.
- **95% Clustered Bootstrap Confidence Interval:** **[-0.081, +0.065]** (1,000 scan-cluster resamples).
- **Pre-registered Success Threshold:** Point estimate $\ge 15.0\%$ AND 95% CI excludes 0.
- **Result:** **Primary criterion NOT MET.** The upper bound of the 95% confidence interval (+6.5%) strictly excludes the pre-registered 15% threshold.

---

## 4. Verdict & Observed-SE Statistical Power Analysis

### 4.1 Verdict Justification: Why "INCONCLUSIVE" Was Too Weak

Under the provisional decision tree in §7 of the pre-registration, any confidence interval that crossed zero was categorised as "INCONCLUSIVE." That rule was originally conceived to handle severely underpowered cohorts (such as RSNA Test B with $N=120$ scan clusters, where the standard error was $0.274$ and MDE was $76.8\%$).

For Test C, however, labeling the result "INCONCLUSIVE" is scientifically inaccurate and misleadingly weak:
1. **The upper bound (+6.5%) strictly excludes the 15% threshold.** The data conclusively rejects the hypothesis that metacognitive gating provides a $\ge 15\%$ safety benefit.
2. **The study was well-powered.** As demonstrated below, the sample size ($N = 486$ scans) was sufficient to detect a 15% reduction.

Therefore, the verdict is unambiguously: **Primary criterion NOT MET; the 95% CI upper bound (+6.5%) excludes the 15% threshold.**

### 4.2 Observed-SE Minimum Detectable Effect (MDE)

In the empirical scan-cluster bootstrap ($N = 486$ clusters, 1,000 resamples), the observed 95% confidence interval for relative reduction at the 20% review rate is $[-0.0808, +0.0652]$.

The observed standard error from this bootstrap distribution is:

$$\widehat{SE} = \frac{\text{CI}_{\text{upper}} - \text{CI}_{\text{lower}}}{2 \times z_{0.975}} = \frac{0.0652 - (-0.0808)}{2 \times 1.960} \approx \mathbf{0.0373} \quad (3.73\%)$$

Using this observed standard error, the minimum detectable effect (MDE) at standard statistical power levels is:

- **At 80% Power ($\alpha = 0.05$, two-sided):**
  $$\text{MDE}_{80} = (z_{0.975} + z_{0.80}) \times \widehat{SE} = (1.960 + 0.842) \times 0.0373 = \mathbf{0.1044} \quad (\mathbf{10.4\%})$$
- **At 90% Power ($\alpha = 0.05$, two-sided):**
  $$\text{MDE}_{90} = (z_{0.975} + z_{0.90}) \times \widehat{SE} = (1.960 + 1.282) \times 0.0373 = \mathbf{0.1208} \quad (\mathbf{12.1\%})$$

Because the study's $\text{MDE}_{80}$ of **10.4%** is well below the pre-registered **15.0%** threshold, Test C was adequately powered to detect the target effect size. The failure to show an advantage is an informative negative finding on external data, not an artifact of insufficient sample size.

---

## 5. Secondary Review Rates

The table below reports relative reductions in unsafe-accepted studies across all pre-registered review fractions:

| Review Rate | Relative Reduction ($D_2$ vs $B_2$) | 95% Clustered Bootstrap CI | Passes $\ge 15\%$ & CI > 0 |
|---|---|---|---|
| **5%** | -1.5% | [-5.9%, +1.5%] | False |
| **10%** | -3.3% | [-8.4%, +1.6%] | False |
| **20% (Primary)** | **0.0%** | **[-8.1%, +6.5%]** | **False** |
| **30%** | -8.0% | [-19.4%, +3.7%] | False |

Across all operating budgets, point estimates remain near zero or negative, with confidence intervals spanning zero.

---

## 6. Composite Weights and Specification Audit

### 6.1 Weight Comparison vs v3 / v4 Specifications

The composite weights used in Test C were:
- **$C_1$ (Normalized MC-Dropout Uncertainty):** $+0.4357$
- **$C_2$ (Mahalanobis OOD Penultimate Distance):** $+0.4634$
- **$C_4$ (Confidence $\times$ Uncertainty Conflict):** $+0.2870$
- **Intercept:** $-0.2292$

**Source of Weights & Fitting Discipline:**
- **Code implementation:** `fit_d2_on_val()` in `validation/scripts/step9b_evaluate_cq500.py` (and identical function in `validation/scripts/step8_evaluate_v3.py`).
- **Data source:** Fitted dynamically on the frozen RSNA v2 validation feature cache (`validation/data_cache/v2_early_val.npz`, produced during the v2a1 training run in commit `d7c34fa`).
- **Was there any refit on CQ500?** **NO.** Absolutely zero training or fitting occurred on CQ500. CQ500 was evaluated strictly out-of-sample using weights derived solely from the RSNA validation set.

**Explanation of the Discrepancy vs Pre-registration Quoted Numbers:**
In `docs/evidence/preregistration_testC_cq500.md` §3, the expected weights were described as $(C_1 \approx +1.46, C_2 \approx +0.09, C_4 \approx +1.10, \text{intercept} \approx -3.53)$. 
- Those numbers were the **unstandardised raw feature weights** from the exploratory post-hoc analysis in `validation/reports/v2a1_posthoc_dweights.json` (commit `d7c34fa`), where LogisticRegression was fit directly on raw scale inputs without feature scaling.
- In contrast, the formal evaluation pipeline in `step8_evaluate_v3.py` and `step9b_evaluate_cq500.py` applies z-score standardization:
  $$\widetilde{X} = \frac{X - \mu}{\sigma}$$
  Standardizing the features before fitting yields standardized coefficients ($\beta_j \cdot \sigma_j$), balancing the contribution of features with different native scales ($C_2$ Mahalanobis distance has a wide raw spread compared to $C_1$).
- In `validation/reports/v3_report.json`, standardized weights were $[0.3729, 0.4692, 0.3543]$ with intercept $-0.2331$. In Test C, fitting directly on `v2_early_val.npz` gave $[0.4357, 0.4634, 0.2870]$ with intercept $-0.2292$.

### 6.2 Error-Detection AUROC Comparison
- $D_2$ Composite: **0.6583**
- $B_2$ Predictive Entropy: **0.6578**
- Paired Difference: $+0.0005$

---

## 7. Methodological Limitations & Pre-registration Addenda

### 7.1 Confounding in Slice Selection: Label-Informed Swaps vs Uniform Sampling
In the RSNA development pipeline (`validation/scripts/step1b_select_slices_v2b.py`), 16 scans that were ground-truth positive for ICH but had no positive slice in the initial uniform 8-slice spacing underwent **label-informed slice swaps** (replacing the most peripheral slice with the nearest positive slice in $z$). This ensured that 97% of positive scans contained a positive slice in the evaluated 8-slice set.

On CQ500, however, no slice-level ground truth labels exist in the public release (only 3-radiologist study-level majority reads). As a result, CQ500 slice selection was strictly uniform based on $z$-axis physical position without label-informed swaps. Consequently, the observed AUROC drop from **0.807** (RSNA Test A) to **0.747** (CQ500) is **confounded**: a portion of this gap may be driven by missing positive slices in small or focal hemorrhages under uniform sampling rather than scanner or biological domain shift alone.

### 7.2 Pre-registration Rationale Addendum: StudyInstanceUID Grouping
Section 1 of `preregistration_testC_cq500.md` stated that the RSNA dataset had "No patient ID $\rightarrow$ study-level splits are approximate (image-level only)." This description reflected an earlier historical limitation from the initial audit. In the subsequent v2 amendment work (`docs/evidence/feasibility_report_v2a1.md`), scan-level clustering was rigorously implemented using `StudyInstanceUID`. The pre-registration's rationale regarding image-level splits was therefore superseded prior to the Test C execution; all evaluations here use proper scan clustering.

---

## 8. Licence & Legal Scoping

- **Dataset Licence:** CQ500 is distributed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.
- **Permitted Use:** Research feasibility evaluation only. Non-commercial use was confirmed on 2026-10-14.
- **Commercial Restrictions:** The CQ500 data, features, and derivative metrics must **NOT** be used for commercial claims, product marketing, promotional representations, or regulatory submissions.
- **Data Privacy:** Raw CT scans, extracted tiles, and intermediate tensors remain strictly private and co-located in protected cloud storage; no re-distribution has occurred.

---

## 9. Infrastructure Inventory & Teardown Commands

All resources created across Azure Kubernetes Service (AKS) and Azure Blob Storage for the Test C execution are inventoried below.

| Resource Type | Resource Identifier | Location / Scope | Status |
|---|---|---|---|
| **AKS Job** | `cq500-preprocess` | Namespace `sewa-ai`, Cluster `sewa-ai-prod-eu-aks` | **Deleted** (cleaned up post-run) |
| **AKS Secret** | `validation-storage-secret` | Namespace `sewa-ai` (contains storage connection string) | Active in cluster |
| **ACR Image Repository** | `sewa-validation` | Registry `sewaaieuprodacr.azurecr.io` (tags `main-ad14b9b1`, `testc-latest`, `cache`) | Active in registry |
| **Blob Output Files** | `v2_early_cq500.npz` (372 MB), `cq500_manifest.json`, `step9a_cq500_preprocess.json` | Account `sewavalidationdata`, Container `processed` | Stored in blob |
| **Storage Account Firewall** | `sewavalidationdata` (`defaultAction: Allow`) | Resource Group `sewa-validation-rg` | Relaxed for in-region job |
| **Entra ID Federated Credential** | `github-fix-patent-aligned` | App `590c6463-962f-4aa8-9a6f-b966302dabdf` | Active for CI builds |

### Teardown Commands

To delete remaining validation infrastructure and re-lock storage security, execute:

```powershell
# 1. Remove AKS secret from namespace sewa-ai
kubectl delete secret validation-storage-secret -n sewa-ai --context sewa-ai-prod-eu-aks --ignore-not-found

# 2. Delete the validation Docker image repository from Azure Container Registry
az acr repository delete --name sewaaieuprodacr --image sewa-validation --yes

# 3. Re-lock Azure Storage Account firewall to default Deny
az storage account update `
  --name sewavalidationdata `
  --resource-group sewa-validation-rg `
  --default-action Deny

# 4. (Optional) Clean up generated feature cache and report blobs in the processed container
az storage blob delete --account-name sewavalidationdata --container-name processed --name v2_early_cq500.npz --auth-mode login
az storage blob delete --account-name sewavalidationdata --container-name processed --name cq500_manifest.json --auth-mode login
az storage blob delete --account-name sewavalidationdata --container-name processed --name step9a_cq500_preprocess.json --auth-mode login

# 5. (Optional) Remove the GitHub Actions federated credential for fix/patent-aligned
az ad app federated-credential delete `
  --id 590c6463-962f-4aa8-9a6f-b966302dabdf `
  --federated-credential-id d144f6e5-d8be-4ebc-a5a7-e76493f5729d
```

---

## 10. Summary Verdict

The pre-registered primary hypothesis of Test C is **NOT MET**:
- The observed relative safety reduction at the 20% review rate is **0.0%**, with a 95% clustered bootstrap confidence interval of **[-8.1%, +6.5%]**.
- The study was well-powered ($\text{MDE}_{80} = 10.4\%$). The upper confidence limit of $+6.5\%$ strictly excludes the pre-registered $+15.0\%$ threshold.
- Metacognitive gating using $D_2$ provides no measurable safety advantage over baseline predictive entropy on unseen external head CT data.
