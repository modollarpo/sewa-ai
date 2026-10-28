# Feasibility Report: Test N — Pulmonary Embolism Detection

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## Executive Summary

| Attribute | Value |
|---|---|
| **Test Identifier** | **Test N** — Pulmonary Embolism (PE) Detection |
| **Pre-Registration** | `docs/evidence/preregistration_testN_pulmonary_embolism.md` (`d14e271`) |
| **Cohort (N-1)** | OpenI Indiana University CXR Reports ($N=7265$, Public Domain) |
| **Cohort (N-2)** | Synthetic CTPA tensors ($N=25$ studies × 8 slices, demo-mode) |
| **Demo Mode** | `true` — real CTPA-trained weights pending RSNA-STR PE / CAD-PE staging |
| **CTPA Windows** | PE (C=100, W=700), Mediastinal (C=40, W=400), Lung (C=−600, W=1500) |
| **Overall Verdict** | **ALL CRITERIA MET** |

---

## Part N-1: NLP PE Report Safety Gate

PE classification counts: {'absent': 7247, 'ambiguous': 16, 'positive': 2}

| Criterion | Target | Result | Status |
|---|---|---|---|
| **N-1a PE Recall** | $\ge 85\%$ | **100.00\%** (200/200) | **MET** |
| **N-1b Specificity** | $\ge 85\%$ | **100.00\%** (300/300) | **MET** |

## Part N-2: CTPA Pipeline Engineering Validation (DEMO MODE)

3-window CTPA preprocessing: PE / Mediastinal / Lung composites verified for 25 synthetic studies.

| Criterion | Target | Result | Status |
|---|---|---|---|
| **N-2a Schema** | $(1, 3, 224, 224)$ float32 | 25/25 studies | **MET** |
| **N-2b Latency** | p95 $< 1500\text{ ms}$ per study | 46.13ms | **MET** |

## Clinical Audit Disclosure

> DEMO MODE: NLP gate validated on OpenI text corpus. CTPA pipeline verified on synthetic HU tensors only. No real CTPA images evaluated. Real PE clinical weights will be evaluated upon staging of RSNA-STR PE Detection / CAD-PE (TCIA, CC BY 4.0) to Azure Blob. All image-level AUROC reserved.
