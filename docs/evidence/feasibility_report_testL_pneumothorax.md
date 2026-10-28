# Feasibility Report: Test L — Pneumothorax Detection

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## Executive Summary

| Attribute | Value |
|---|---|
| **Test Identifier** | **Test L** — Pneumothorax (PTX) Detection |
| **Pre-Registration** | `docs/evidence/preregistration_testL_pneumothorax.md` (`d14e271`) |
| **Cohort (L-1)** | OpenI Indiana University CXR Reports ($N=7265$ paired radiology captions, Public Domain) |
| **Cohort (L-2)** | Synthetic CXR tensors ($N=100$, demo-mode engineering validation) |
| **Demo Mode** | `true` — real CXR clinical weights pending dataset staging |
| **Overall Verdict** | **PARTIAL CRITERIA MET** |

---

## Part L-1: NLP PTX Report Safety Gate

Report corpus classification breakdown:
{
  "ambiguous": 2437,
  "absent": 2313,
  "negative": 1858,
  "positive": 657
}

| Criterion | Target | Result | Status |
|---|---|---|---|
| **L-1a Contradiction Recall** | $\ge 90\%$ | **100.00\%** (200/200) [95% CI: 98.1%, 100.0%] | **MET** |
| **L-1b Specificity** | $\ge 95\%$ | **100.00\%** (300/300) [95% CI: 98.7%, 100.0%] | **MET** |

## Part L-2: CXR Image Engineering Validation (DEMO MODE)

| Criterion | Target | Result | Status |
|---|---|---|---|
| **L-2a Schema** | $(1, 3, 224, 224)$ float32 verified | 100/100 | **MET** |
| **L-2b Latency** | p95 $< 50\text{ ms}$ | mean=21.11ms, p95=73.23ms | **NOT MET** |

## Clinical Audit Disclosure

> DEMO MODE: This report covers NLP safety gate performance (using existing OpenI text corpus) and engineering preprocessing validation using synthetic tensors. No real pneumothorax CXR images were evaluated. Real CXR clinical weights will be trained and evaluated in a follow-up study upon staging of the NIH ChestX-ray14 / SIIM-ACR PTX dataset to Azure Blob. All image-level sensitivity and AUROC claims are reserved pending that evaluation.
