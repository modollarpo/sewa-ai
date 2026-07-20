# SEWA AI — Statistical Analysis Plan (SAP)

**Document Ref:** SEWA-AI-DOC-03 · **Version:** 1.0 · **July 2026**
**Companion to:** SEWA-AI-DOC-02 (Clinical Investigation Plan)

---

## 1. Principles

This SAP is **pre-specified and locked before any dataset is unblinded**. It is authored by an
independent academic statistician (to be appointed) and supersedes any internal engineering
analysis. All thresholds are fixed to avoid multiplicity and reporting bias.

- Significance level: two-sided **alpha = 0.05**.
- No interim efficacy analysis; one pre-planned interim safety review at 50% enrolment.
- Analysis language: R (>=4.3) / Python (>=3.11); reproducible scripts under version control.

---

## 2. Analysis Populations

| Population | Definition |
|---|---|
| Full Analysis Set (FAS) | All records meeting inclusion with complete AI output and ground-truth |
| Per-Protocol Set (PPS) | FAS excluding protocol deviations (e.g., corrupted DICOM found post-inclusion) |
| Safety Gate Set | All records with valid U and H scores, regardless of triage outcome |

---

## 3. Primary Endpoint & Analysis

**Primary endpoint:** concordance between SEWA AI triage decision and consultant ground-truth,
summarised by sensitivity, specificity, PPV, NPV and AUC-ROC (with 95% confidence intervals).

| Method | Technique |
|---|---|
| Contingency tables | Exact binomial 95% CI (Clopper-Pearson) |
| AUC-ROC | DeLong's test for comparison vs. reference |
| Calibration | Reliability diagrams; Expected Calibration Error (ECE) |
| CIs | Bootstrap resampling (n=1,000) |

---

## 4. Secondary Endpoint Methods

| Endpoint | Method |
|---|---|
| Uncertainty gate performance | Escalation rate; false-negative rate among escalated; Spearman correlation U vs error |
| Metacognition gate | BLOCK rate; association with override rate (logistic regression) |
| Subgroup performance | Chi-squared / Fisher exact; logistic regression with interaction terms |
| Inter-engine agreement | Fleiss' kappa (multi-rater) |
| Door-to-alert time | Mann-Whitney U vs. historical 4.2h baseline; descriptive |
| Alert fatigue | Linear mixed model on repeated clinician ratings |

---

## 5. Sample Size & Power (Precision-Based)

Sample size is justified on the number of **positive (critical) cases**, which drive the precision of
the primary sensitivity estimate — not on total scan volume. For a two-sided 95% CI, the required
positive count is:

`n_pos = z^2 x p(1-p) / d^2`   (z = 1.96; p = expected sensitivity; d = CI half-width)

| Expected sensitivity | CI precision (d) | Positive cases required |
|---|---|---|
| 0.90 | +/-5% | ~138 |
| 0.90 | +/-3% | ~384 |
| 0.95 | +/-5% | ~73 |

At realistic acute prevalences (5-8% for ICH / PE / LVO / pneumothorax; higher for TB), achieving
~150-400 positives per critical condition requires only a few thousand total studies per condition.

### 5.1 Retrospective diagnostic-accuracy cohort (powers the CER)
Target: **~6,000-8,000 studies**, focused on the four highest-risk conditions (ICH, PE, LVO stroke,
pneumothorax), yielding ~150-400 positive cases each — sufficient for +/-5% sensitivity CIs and
precise specificity / AUC estimates. Rarer conditions are reported with wider CIs or pooled.

### 5.2 Prospective real-world validation (clinical utility & safety)
Target: **~2,500-4,000 studies across 5 NHS sites over 6-12 months**, supporting the door-to-alert
(time-to-triage) and safety endpoints, with sensitivity precision pre-specified.

### 5.3 Note on the 14,200 figure
The 14,200-study figure used in earlier planning was an upper-bound retrospective *pool* across six
conditions, not a regulatory minimum. It remains acceptable if available, but is larger than required;
the targets above are sufficient and more feasible to curate and analyse. The exact N is finalised by
the independent statistician before database lock.

---

## 6. Missing Data

- Primary: complete-case (FAS) with sensitivity analysis under MAR and MNAR.
- Missing DICOM metadata: excluded from subgroup only, retained for global metrics (per DQ-004).
- No imputation of the primary label; ground truth never imputed.

---

## 7. Multiplicity

Primary endpoint analysed once. Secondary/exploratory endpoints reported with point estimates and
CIs; no formal adjustment (clearly labelled hypothesis-generating) except pre-specified subgroup
interaction test (alpha preserved via single pre-planned interaction term).

---

## 8. Adverse Event & Device-Effect Analysis

- Define **adverse device effect (ADE)** as a critical finding missed by the AI and not escalated that reaches the clinical team.
- Monitor ADE rate; stopping rule if ADE rate exceeds 5% (per internal KPI alert threshold).
- Report per MDCG 2020-6 / ISO 14155 safety reporting.

---

## 9. Reproducibility & Audit

- Analysis scripts, frozen data snapshot, and environment locked in the WMSDE TRE.
- Audit trail: SHA-256 Merkle-chained (7-year retention) per SEWA architecture.
- Pre-registration: ISRCTN to be registered prior to study commencement.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · info@sewaxai.health
