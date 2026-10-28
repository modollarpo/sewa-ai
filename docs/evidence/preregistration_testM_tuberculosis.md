# Pre-Registration: Test M — Tuberculosis (TB) Screening on Chest Radiography

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## 1. Registration Metadata

| Field | Value |
|---|---|
| Test ID | **Test M** |
| Title | Tuberculosis Detection: NLP Report Safety Gate & CXR Image Engineering Validation |
| Registered | 2026-10-28 (committed prior to evaluation) |
| Governing principle | Endpoints and thresholds frozen prior to evaluation |
| Datasets | (M-1) OpenI Indiana University CXR Reports (7,265 paired captions, Public Domain); (M-2) Shenzhen NLM / Montgomery County TB Dataset (pending Azure staging; Public Domain) |
| Modality | Frontal Chest X-Ray (CXR) — 2D grayscale PNG |
| Licences | OpenI: Public Domain; Shenzhen/Montgomery: Public Domain (US National Library of Medicine) |
| Marking | **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** |

---

## 2. Clinical Background & NHS Relevance

Pulmonary tuberculosis remains a **WHO priority condition** in the UK — incidence of 8–9 per 100,000 in England with disproportionate burden in urban West Midlands communities. CXR screening is WHO-recommended as the first-line triage tool for symptomatic TB assessment, and is routinely performed in NHS community chest clinics and refugee/migrant health screening programmes.

SEWA XAI's TB module targets:
1. **Screening triage**: Flag CXRs with cavitary lesions, upper lobe consolidation, hilar adenopathy, or miliary patterns for urgent TB specialist referral.
2. **Report safety gate**: Detect when a reporting radiologist mentions findings consistent with TB without raising it explicitly as a differential.

---

## 3. Two-Part Evaluation Protocol

### M-1: NLP Report-Level Safety Gate (Runnable immediately)
Using the OpenI corpus (`validation/data_subsets/cleaned_dataset.csv`):
- **TB feature extraction**: Identify reports mentioning key TB-associated radiological terms (cavitation, miliary pattern, hilar adenopathy, upper lobe infiltrate, mycobacterium, Koch's disease).
- **Safety gate test**: Inject contradictory TB statements (TB-positive findings with TB-negative conclusions) and measure metacognition recall.

**Pre-registered threshold**: Safety gate recall $\ge 85\%$, Specificity $\ge 90\%$.

### M-2: CXR Image Engineering Validation (Pending Shenzhen/Montgomery staging)
- Load 50 TB-positive and 50 normal frontal CXRs (800 total images in Shenzhen dataset, ~80 MB).
- Preprocess to `(1, 3, 224, 224)` float32.
- Verify inference latency through demo ONNX backbone.

---

## 4. Pre-Registered Success Criteria

| Criterion | Metric | Threshold | Category |
|---|---|---|---|
| **M-1a** | TB keyword safety gate recall | $\ge 85\%$ | Confirmatory |
| **M-1b** | TB keyword specificity | $\ge 90\%$ | Confirmatory |
| **M-2a** | CXR preprocessing pipeline verified | $(1, 3, 224, 224)$ float32 | Engineering-validated |
| **M-2b** | Inference latency | $< 50\text{ ms}$ (CPU) | Engineering-validated |

---

## 5. Execution Protocol

- Script: `validation/scripts/step21_tuberculosis_evaluation.py`
- Reports: `validation/reports/v2a1_testM_tuberculosis.json`, `docs/evidence/feasibility_report_testM_tuberculosis.md`
- Audit Rule: All results reported verbatim regardless of whether thresholds are met.
