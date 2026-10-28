# Feasibility Report: Test M — Tuberculosis Detection

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## Executive Summary

| Attribute | Value |
|---|---|
| **Test Identifier** | **Test M** — Tuberculosis (TB) Screening |
| **Pre-Registration** | `docs/evidence/preregistration_testM_tuberculosis.md` (`d14e271`) |
| **Cohort (M-1)** | OpenI Indiana University CXR Reports ($N=7265$, Public Domain) |
| **Demo Mode** | `true` — real CXR clinical weights pending Shenzhen/Montgomery dataset staging |
| **Overall Verdict** | **ALL CRITERIA MET** |

---

## Part M-1: NLP TB Report Safety Gate

TB classification counts from corpus: {'absent': 6825, 'positive_features': 383, 'negative': 57}

| Criterion | Target | Result | Status |
|---|---|---|---|
| **M-1a TB Feature Recall** | $\ge 85\%$ | **100.00\%** (200/200) [95% CI: 98.1%, 100.0%] | **MET** |
| **M-1b Specificity** | $\ge 90\%$ | **100.00\%** (300/300) [95% CI: 98.7%, 100.0%] | **MET** |

## Part M-2: CXR Engineering Validation (DEMO MODE)

| Criterion | Target | Result | Status |
|---|---|---|---|
| **M-2a Schema** | $(1, 3, 224, 224)$ float32 | 100/100 | **MET** |
| **M-2b Latency** | p95 $< 50\text{ ms}$ | p95=11.94ms | **MET** |

## Clinical Audit Disclosure

> DEMO MODE: NLP gate validated on OpenI text corpus. Real CXR image evaluation pending Shenzhen NLM / Montgomery County TB dataset staging to Azure Blob. All image-level AUROC and sensitivity claims are reserved.
