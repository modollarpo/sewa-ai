# Test D Feasibility Report: External Evaluation of Metacognition Contradiction Detection on OpenI

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

- **Pre-registration:** `docs/evidence/preregistration_testD_openi.md` (committed in `5f9d873` prior to evaluation).
- **Licence:** Public Domain / NLM terms (OpenI Indiana University Chest X-rays). Outputs carry CC BY-NC-SA 4.0.
- **Run Date:** 2026-10-28.
- **Report Artifact:** `validation/reports/v2a1_testD_openi.json`.
- **Evaluated System:** `ai-services/metacognition/main.py` (`MetacognitionEvaluator._detect_report_contradiction` and full `MetacognitionEvaluator.evaluate`).

---

## 1. Executive Summary

Test D evaluates the frozen SEWA AI Metacognition Layer 6 Contradiction Detection engine on **7,265 real radiologist clinical reports** from the OpenI (Indiana University) external dataset. It tests whether rule-based clinical negation scoring and token density checks can prevent conflicting AI-generated findings from triggering false critical alerts.

| Metric | Result | Pre-registered Target | Interpretation & Verdict |
|---|---|---|---|
| **Contradiction Recall: Pneumothorax** | **89.25%** (95% CI: [88.10%, 90.51%]) | $\ge 85.0\%$ | **MET**. Correctly catches acute pneumothorax contradictions against negated radiologist text. |
| **Contradiction Recall: Pleural Effusion** | **94.46%** (95% CI: [93.43%, 95.50%]) | $\ge 85.0\%$ | **MET**. High sensitivity to negated effusion expressions in clinical text. |
| **Contradiction Recall: Cardiomegaly** | **52.94%** (95% CI: [50.12%, 55.84%]) | $\ge 85.0\%$ | **NOT MET**. Radiologist prose uses anatomical variants ("heart size normal", "unremarkable silhouette") without explicit "cardiomegaly" keyword. |
| **Aggregate Contradiction Recall** | **82.90%** (95% CI: [81.96%, 83.82%]) | $\ge 85.0\%$ | **PARTIAL**. Pulled down by non-acute structural phrasing (cardiomegaly); acute findings exceed target. |
| **Aggregate Affirmation Specificity** | **47.08%** (95% CI: [44.67%, 49.49%]) | $\ge 85.0\%$ | **NOT MET**. Over-flagging on positive reports due to low Jaccard token overlap in concise impressions. |
| **Alert Suppression on Contradiction** | **100.0%** (367 / 367) | 100.0% | **MET**. Every flagged contradiction successfully suppressed `safe_to_alert`. |
| **CPU Evaluation Latency** | **0.97 ms** (95% CI: [0.75, 1.32] ms) | < 50.0 ms | **MET**. Sub-millisecond CPU-native safety evaluation. |
| **Overall Verdict** | **PARTIAL / NOT MET** | Both Primary $\ge 85\%$ | Sensitivity for acute emergencies is high ($\ge 89\%$), but keyword vocabulary limits specificity and non-acute recall. |

---

## 2. Dataset and Cohort Analysis

- **Cohort:** 7,265 paired frontal and lateral chest radiographs with full radiologist impressions from Indiana University hospitals.
- **Ground Truth Evaluation Cohorts:**
  - **Pneumothorax:** 2,857 explicit negations ("no evidence of pneumothorax", "no pneumothorax", "free of pneumothorax"), 86 positive affirmations.
  - **Pleural Effusion:** 1,644 explicit negations ("no pleural effusion", "without effusion"), 980 positive affirmations.
  - **Cardiomegaly:** 1,241 normal cardiac size descriptions, 510 cardiomegaly affirmations.

---

## 3. Primary Outcomes

### 3.1 Contradiction Recall on Negated Findings (Safety Gate Sensitivity)

When a model hallucinates or erroneously fires an alert on a patient whose radiologist report clearly states the finding is absent:
- **Pneumothorax:** Layer 6 caught **89.25%** of contradictions (2,550 / 2,857), 95% CI [88.10%, 90.51%].
- **Pleural Effusion:** Layer 6 caught **94.46%** of contradictions (1,553 / 1,644), 95% CI [93.43%, 95.50%].
- **Cardiomegaly:** Layer 6 caught **52.94%** of contradictions (657 / 1,241), 95% CI [50.12%, 55.84%].

**Key Finding:** For acute, life-threatening and urgent findings (pneumothorax and pleural effusion), the contradiction detector reliably flags conflicting findings ($\ge 89.2\%$). For structural conditions, the failure to match "heart size normal" as a negation of "Cardiomegaly" highlights a clear vocabulary synonym requirement.

### 3.2 Specificity on Affirmed Cases (False Positive Control)

When the report genuinely affirmed the finding (e.g. "small right pleural effusion" or "moderate cardiomegaly"):
- **Specificity:** **47.08%** (95% CI: [44.67%, 49.49%]).
- **Mechanism Analysis:** In short 1–2 sentence radiologist impressions, the non-finding tokens dominate the report, driving down the token Jaccard similarity ($< 0.10$). Because the composite formula adds $(1 - \text{jaccard}) \times 0.2$, this baseline term elevates the score near the 0.50 threshold, causing false positive contradiction alerts when incidental negation phrases ("no acute bony fracture") appear elsewhere in the same report.

---

## 4. Full Pipeline Safety Simulation & Latency

In an end-to-end simulation of 500 patient evaluations through `MetacognitionEvaluator.evaluate()`:
- **Alert Suppression Rate:** Whenever a `REPORT_CONTRADICTION` flag fired, the safety gate set `safe_to_alert = False` in **100% of cases** (367 / 367), preventing unvalidated critical alerts from dispatching to clinical pagers.
- **Latency:** Average CPU latency was **0.97 ms** per case (95% CI: [0.75, 1.32] ms), proving that rule-based multi-signal metacognition operates comfortably within clinical latency budgets (< 50ms) without GPU requirements.

---

## 5. Architectural Recommendations

1. **Expanded Synonym Mapping:** Introduce bidirectional synonym mappings for anatomical findings (e.g. mapping `Cardiomegaly` $\leftrightarrow$ `["enlarged heart", "cardiac enlargement", "heart size"]`).
2. **Context-Gated Negation Scope:** Limit negation template matching to the clause containing the target finding rather than whole-report keyword scanning to prevent incidental negations ("no rib fracture") from triggering false alarms on concordant pulmonary findings.
3. **Calibrated Jaccard Weighting:** Re-weight token Jaccard penalty when explicit finding keywords are present with positive polarity.
