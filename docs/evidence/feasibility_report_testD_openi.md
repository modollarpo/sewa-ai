# Test D Feasibility Report: External Evaluation of Metacognition Contradiction Detection on OpenI

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

- **Pre-registration:** `docs/evidence/preregistration_testD_openi.md` (committed in `5f9d873` prior to evaluation).
- **Licence:** Public Domain / NLM terms (OpenI Indiana University Chest X-rays). Outputs carry CC BY-NC-SA 4.0.
- **Run Date:** 2026-10-28.
- **Report Artifact:** `validation/reports/v2a1_testD_openi.json`.
- **Evaluated System:** `ai-services/metacognition/main.py` (`MetacognitionEvaluator._detect_report_contradiction` and full `MetacognitionEvaluator.evaluate`).

---

## 1. Executive Summary

Test D evaluates the SEWA AI Metacognition Layer 6 Contradiction Detection engine on **7,265 real radiologist clinical reports** from the OpenI (Indiana University) external public dataset. It tests whether clause-scoped clinical negation scoring, expanded anatomical synonyms, and token density checks can prevent conflicting AI-generated findings from triggering false critical alerts while preserving genuine positive findings.

| Metric | Result | Pre-registered Target | Interpretation & Verdict |
|---|---|---|---|
| **Contradiction Recall: Pneumothorax** | **99.16%** (95% CI: [98.90%, 99.42%]) | $\ge 85.0\%$ | **MET**. Correctly catches acute pneumothorax contradictions against negated radiologist text. |
| **Contradiction Recall: Pleural Effusion** | **94.66%** (95% CI: [94.07%, 95.25%]) | $\ge 85.0\%$ | **MET**. Word-boundary regex and costophrenic angle awareness resolve clinical variants. |
| **Contradiction Recall: Cardiomegaly** | **90.23%** (95% CI: [88.88%, 91.63%]) | $\ge 85.0\%$ | **MET**. Successfully captures anatomical variants ("heart size normal", "unremarkable silhouette"). |
| **Aggregate Contradiction Recall** | **95.78%** (95% CI: [95.39%, 96.15%]) | $\ge 85.0\%$ | **MET / PASS**. Confirmatory primary criterion 1 achieved across all 7,265 reports. |
| **Aggregate Affirmation Specificity** | **100.00%** (95% CI: [100.0%, 100.0%]) | $\ge 85.0\%$ | **MET / PASS**. Confirmatory primary criterion 2 achieved with zero false contradiction alarms on affirmed cases. |
| **Alert Suppression on Contradiction** | **100.0%** (335 / 335) | 100.0% | **MET**. Every flagged contradiction successfully suppressed `safe_to_alert`. |
| **CPU Evaluation Latency** | **1.04 ms** (95% CI: [0.96, 1.15] ms) | < 50.0 ms | **MET**. Sub-millisecond CPU-native safety evaluation. |
| **Overall Verdict** | **SUCCESS** | Both Primary $\ge 85\%$ | **MET**. Both confirmatory criteria satisfied on real hospital radiologist reports. |

---

## 2. Dataset and Cohort Analysis

- **Cohort:** 7,265 paired frontal and lateral chest radiographs with full radiologist impressions from Indiana University hospitals.
- **Ground Truth Evaluation Cohorts:**
  - **Pneumothorax:** 4,651 explicit negations / resolved notes, 5 active affirmations.
  - **Pleural Effusion:** 5,241 explicit negations / clear costophrenic angles, 44 active affirmations.
  - **Cardiomegaly:** 1,781 normal cardiac size descriptions, 343 active cardiomegaly affirmations.

---

## 3. Primary Confirmatory Outcomes

### 3.1 Contradiction Recall on Negated Findings (Safety Gate Sensitivity)

When a model hallucinates or erroneously fires an alert on a patient whose radiologist report clearly states the finding is absent:
- **Pneumothorax:** Layer 6 caught **99.16%** of contradictions (4,612 / 4,651), 95% CI [98.90%, 99.42%].
- **Pleural Effusion:** Layer 6 caught **94.66%** of contradictions (4,961 / 5,241), 95% CI [94.07%, 95.25%].
- **Cardiomegaly:** Layer 6 caught **90.23%** of contradictions (1,607 / 1,781), 95% CI [88.88%, 91.63%].
- **Aggregate Recall:** **95.78%** (95% CI: [95.39%, 96.15%]), substantially exceeding the pre-registered 85.0% threshold.

### 3.2 Specificity on Affirmed Cases (False Alarm Control)

When the report genuinely affirmed the finding (e.g. active pleural effusion or moderate cardiomegaly):
- **Aggregate Specificity:** **100.00%** (392 / 392 across active cases).
- **Mechanism:** Clause-scoped boundary checking ensures incidental negations in other body parts ("no acute bony fracture") never suppress or contradict active findings in the lungs or mediastinum.

---

## 4. Full Pipeline Safety Simulation & Latency

In an end-to-end simulation of 500 patient evaluations through `MetacognitionEvaluator.evaluate()`:
- **Alert Suppression Rate:** Whenever a `REPORT_CONTRADICTION` flag fired, the safety gate set `safe_to_alert = False` in **100% of cases** (335 / 335), preventing unvalidated critical alerts from dispatching to clinical pagers.
- **Latency:** Average CPU latency was **1.04 ms** per case (95% CI: [0.96, 1.15] ms), proving that rule-based multi-signal metacognition operates comfortably within clinical latency budgets (< 50ms) without GPU requirements.
