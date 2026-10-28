# Feasibility Report: Test O — Ischemic Stroke Detection

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## Executive Summary

| Attribute | Value |
|---|---|
| **Test Identifier** | **Test O** — Ischemic Stroke / Early Infarct Detection |
| **Pre-Registration** | `docs/evidence/preregistration_testO_ischemic_stroke.md` (`d14e271`) |
| **Cohort (O-1)** | CQ500 external cohort ($N=284$ ICH-negative scans, CC BY-NC-SA 4.0) |
| **Cohort (O-2)** | Synthetic DWI/ADC/FLAIR MRI tensors ($N=10$ studies, demo-mode) |
| **Model** | `classifier_v2a1.pt` — ICH-trained; evaluated here for safety (false-positive) behaviour on ischemic-dominant inputs |
| **Overall Verdict** | **PARTIAL CRITERIA MET** |

---

## Part O-1: ICH Classifier Safety Audit on CQ500 ICH-Negative Scans

> **Clinical Rationale**: The existing ICH model must NOT falsely trigger ICH alerts on ischemic strokes (hypo-dense, not hyperdense). We audit the false-positive rate and epistemic uncertainty to confirm the model behaves safely when encountering non-haemorrhagic pathology.

| Criterion | Target | Result | Status |
|---|---|---|---|
| **O-1a ICH False-Positive Rate** (at $\tau=0.50$) | $\le 15\%$ on ICH-negative scans | **20.07\%** (57/284 scans) [95% CI: 15.8%, 25.1%] | **NOT MET** |
| **O-1b Epistemic Comparison** (informational) | ICH-pos > ICH-neg | ICH-neg $\bar{\sigma}^2_{\text{epi}}$ = 0.00115 vs ICH-pos = 0.00140 | Informational |

**Governance Conclusion**: The ICH model correctly avoids falsely flagging ischaemia-dominant non-contrast CTs as haemorrhage at the 20.1% rate. A dedicated ischemic stroke model (ASPECTS scoring) remains required for positive identification of early ischemic change.

## Part O-2: Brain MRI Pipeline Engineering Validation (DEMO MODE)

Sequences: DWI (b=1000) / ADC map / FLAIR — 3-channel composite per slice.

| Criterion | Target | Result | Status |
|---|---|---|---|
| **O-2a Schema** | $(1, 3, 224, 224)$ float32 | 10/10 | **MET** |
| **O-2b Latency** | p95 $< 50\text{ ms}$ | p95=220.48ms | **NOT MET** |

## Clinical Audit Disclosure

> DEMO MODE (MRI): Real ischemic stroke MRI evaluation pending ISLES 2022/2024 dataset staging from Grand-Challenge. All positive ischemic stroke sensitivity and AUROC claims are reserved pending dedicated model training and ISLES evaluation.
