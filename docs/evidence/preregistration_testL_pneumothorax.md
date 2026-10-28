# Pre-Registration: Test L — Pneumothorax (PTX) Detection on Chest Radiography

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## 1. Registration Metadata

| Field | Value |
|---|---|
| Test ID | **Test L** |
| Title | Pneumothorax Detection: CXR Image Engineering Validation & NLP Report Safety Gate |
| Registered | 2026-10-28 (committed prior to evaluation) |
| Governing principle | Perturbation levels, endpoints, and thresholds frozen prior to evaluation |
| Datasets | (L-1) OpenI Indiana University CXR Reports (7,265 paired captions, Public Domain); (L-2) NIH ChestX-ray14 / SIIM-ACR PTX Subset (pending Azure staging) |
| Modality | Frontal Chest X-Ray (CXR) — 2D grayscale PNG |
| Licences | OpenI: Public Domain (NLM/NIH terms); NIH ChestX-ray14: CC0 Public Domain; SIIM-ACR: Research Use |
| Marking | **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** |

---

## 2. Clinical Background & NHS Relevance

Tension pneumothorax is a **Category 1 life-threatening emergency** requiring immediate needle thoracocentesis within minutes. Occult pneumothoraces are frequently missed on portable AP CXR in trauma bays — studies report a 30–40% miss rate by non-specialist reviewers on plain films.

SEWA XAI's pneumothorax module is designed to:
1. **Triage flagging**: Alert on-call radiologists to urgent PTX findings across 24/7 ED CXR backlogs.
2. **Report safety gate**: Scan outgoing radiology reports for contradictory PTX statements (e.g., a report declaring "no pneumothorax" when the image probability is high).

---

## 3. Two-Part Evaluation Protocol

### L-1: NLP Report-Level Contradiction Detection (Runnable on existing data)
Using the existing OpenI Indiana University radiology report corpus (7,265 paired captions already staged locally in `validation/data_subsets/cleaned_dataset.csv`):

- **Positive cases**: Reports containing explicit PTX affirmation without negation (e.g., "pneumothorax is present", "there is a pneumothorax").
- **Negative cases**: Reports containing explicit PTX negation (e.g., "no pneumothorax", "without pneumothorax").
- **Injection protocol**: Inject contradictory PTX statements into reports and measure whether the Metacognition Negation Engine (Test D) correctly flags them.

**Pre-registered threshold**: Contradiction recall $\ge 90\%$, Specificity $\ge 95\%$.

### L-2: CXR Image Engineering Validation (Pending image staging)
- Load 100 PTX-positive and 100 PTX-negative frontal CXR images.
- Preprocess to `(1, 1, 224, 224)` float32 grayscale tensor, then expand to `(1, 3, 224, 224)` (replicate channel — standard for ImageNet-pretrained models on grayscale inputs).
- Pass through the CXR EfficientNet-B0 backbone (to be trained; currently **demo mode**).
- Compute AUROC, sensitivity at $\tau=0.30$, and Split Conformal FNR.

---

## 4. Pre-Registered Success Criteria

| Criterion | Metric | Threshold | Category |
|---|---|---|---|
| **L-1a** | PTX contradiction recall | $\ge 90\%$ | Confirmatory |
| **L-1b** | PTX contradiction specificity | $\ge 95\%$ | Confirmatory |
| **L-2a** | CXR image preprocessing pipeline | Verified $(1, 3, 224, 224)$ float32 | Engineering-validated |
| **L-2b** | Inference latency | $< 50\text{ ms}$ (CPU) | Engineering-validated |

---

## 5. Execution Protocol

- Script: `validation/scripts/step20_pneumothorax_evaluation.py`
- Reports: `validation/reports/v2a1_testL_pneumothorax.json`, `docs/evidence/feasibility_report_testL_pneumothorax.md`
- Audit Rule: All results reported verbatim regardless of whether thresholds are met.
