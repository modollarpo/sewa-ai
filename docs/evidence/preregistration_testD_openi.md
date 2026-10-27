# Pre-registration Test D — External Evaluation of Metacognition Contradiction Detection on OpenI Reports

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

**Status:** Written and frozen BEFORE running the full evaluation on the OpenI dataset. Committed before `step10_evaluate_openi.py` is executed.

**Licence:** OpenI (Indiana University Chest X-ray collection) metadata and captions are Public Domain / NLM. All outputs of this feasibility study carry the CC BY-NC-SA 4.0 or Open Domain marking.

**Parent documents:** `preregistration_v4.md`, `preregistration_testC_cq500.md`. Prior study verdicts stand and are not rewritten.

---

## 1. Rationale and Objective

In clinical deployment, generative VLM components or multi-modal triage pipelines can hallucinate, hedge, or generate findings that directly contradict the imaging evidence or radiologist impression. SEWA AI uses a dedicated CPU-native clinical safety gate (`ai-services/metacognition/main.py`), specifically Layer 6 (Multi-signal contradiction detection), to verify finding-to-report consistency using token Jaccard overlap, clinical negation phrase scoring, and keyword density.

Previous validation phases (v4) used synthetic impression sentences generated from fixed templates with artificial contradiction injection. While informative for mechanism verification, synthetic sentences do not represent the syntactic diversity, hedging, and complex compound negations used by practicing radiologists.

Test D provides the first **external evaluation on real-world radiologist prose** using the OpenI Indiana University hospital dataset (7,265 paired radiologist impression captions).

---

## 2. Dataset

- **Source:** OpenI Indiana University Chest X-Ray collection (`validation/data_subsets/cleaned_dataset.csv`).
- **Sample size:** N = 7,265 clinical report captions.
- **Fields:** `image_id`, `projection` (Frontal/Lateral), `org_caption`.
- **Target clinical conditions evaluated:**
  1. **Pneumothorax** (acute emergency finding; high urgency)
  2. **Pleural Effusion** (acute / subacute finding; urgent priority)
  3. **Cardiomegaly / Heart Size** (structural / cardiothoracic finding)
- **Annotation definition:**
  - *Negated Ground Truth*: Explicit negation clauses ("no evidence of...", "no pneumothorax", "without pleural effusion", "lungs clear", "no acute cardiopulmonary abnormality").
  - *Affirmed Ground Truth*: Explicit positive assertion of the finding without negation triggers.

---

## 3. Evaluated System (Frozen)

- **Engine:** `ai-services/metacognition/main.py` (`MetacognitionEvaluator._detect_report_contradiction` and full `MetacognitionEvaluator.evaluate`).
- **Frozen parameters:**
  - Jaccard token threshold: length > 3.
  - Negation templates: 11 clinical templates (`"no evidence of"`, `"no acute"`, `"unremarkable"`, `"normal study"`, `"no significant"`, `"excluded"`, `"not identified"`, `"absent"`, `"no {finding}"`, `"without {finding}"`, `"normal scan"`).
  - Decision threshold: `contradiction_score > 0.50` OR `negation_score >= 0.80`.
  - No retraining, parameter tuning, or prompt modification is performed on OpenI.

---

## 4. Confirmatory Outcomes & Pre-specified Success Criteria

### Primary Outcome 1: Contradiction Recall on Negated Findings (Safety Gate Sensitivity)
- **Estimand:** The proportion of contradictory finding-report pairs where the report negates finding $F$, but the AI model asserts finding $F$, that are successfully identified by Layer 6 (`REPORT_CONTRADICTION` triggered).
- **Success Criterion:** Contradiction Recall $\ge 85.0\%$ across all negated mentions for both Pneumothorax and Pleural Effusion.

### Primary Outcome 2: Specificity on Affirmed Findings (False Alarm Control)
- **Estimand:** The proportion of concordant finding-report pairs where the report genuinely affirms finding $F$ and the AI model asserts finding $F$, that pass through Layer 6 without raising a false `REPORT_CONTRADICTION` flag.
- **Success Criterion:** Specificity $\ge 85.0\%$ across affirmed mentions.

### Secondary Descriptive Outcomes:
- **Full Metacognition Pipeline Safety:** For all cases with flagged contradictions, measure the proportion where `hallucination_risk` is elevated and `safe_to_alert` is correctly set to `False`.
- **Processing Latency:** Measure per-report CPU evaluation latency (target < 50ms per report).

---

## 5. Reporting Protocol

Results will be compiled in:
- `validation/reports/v2a1_testD_openi.json` (machine-readable metrics with 95% bootstrap confidence intervals)
- `docs/evidence/feasibility_report_testD_openi.md` (formal clinical-technical report)

Every output file must state: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
