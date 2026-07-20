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

For the primary sensitivity estimate with assumed true sensitivity p=0.90 and desired half-width
d=0.05 at alpha=0.05:

n_pos >= (1.96^2 x p x (1-p)) / d^2 = (3.8416 x 0.09) / 0.0025 ≈ 138 req. positive cases.

The prospective cohort targets ~1,400 positive (critical) cases, giving >90% power and tight CIs.
Total target ~14,200 studies (overall prevalence ~10%). Final calculation confirmed by statistician.

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
