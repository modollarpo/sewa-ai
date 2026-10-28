# Pre-Registration: Test O — Ischemic Stroke & Early Infarct Detection on Non-Contrast CT

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## 1. Registration Metadata

| Field | Value |
|---|---|
| Test ID | **Test O** |
| Title | Ischemic Stroke / Early Infarct Detection on Non-Contrast Head CT |
| Registered | 2026-10-28 (committed prior to evaluation) |
| Governing principle | Endpoints and thresholds frozen prior to evaluation |
| Datasets | (O-1) CQ500 scans with ischemic/infarct annotations (CC BY-NC-SA 4.0, locally cached); (O-2) ISLES 2022/2024 DWI/ADC MRI cohort (pending Grand-Challenge staging; CC BY-NC-SA 4.0) |
| Modality | Non-Contrast Head CT (primary); DWI/ADC Brain MRI (secondary) |
| Licences | CQ500: CC BY-NC-SA 4.0; ISLES: CC BY-NC-SA 4.0 |
| Marking | **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** |

---

## 2. Clinical Background & NHS Relevance

**Ischemic stroke** accounts for ~85% of all stroke presentations to NHS emergency departments (~90,000 strokes/year in England). The key triage decisions on non-contrast CT (NCCT) are:

1. **Rule out haemorrhage** (already covered by SEWA XAI ICH module, Tests A–K).
2. **Detect early ischemic change**: Subtle hypoattenuation, cortical ribbon sign, insular ribbon loss, and loss of grey-white differentiation in the MCA territory — quantified by the **Alberta Stroke Programme Early CT Score (ASPECTS)**.
3. **ASPECTS scoring**: ASPECTS ≤ 5 (large infarct core, >1/3 MCA territory) is a contraindication for mechanical thrombectomy under NICE NG128.

**Critical gap**: The existing `classifier_v2a1.pt` was trained exclusively on ICH detection. Early ischemic changes on NCCT are characterised by *hypodensity* (not hyperdensity as in haemorrhage) — the model may identify or misidentify these as noise or normal variants.

This test characterises:
- **Out-of-distribution behaviour**: Does the model produce appropriately high epistemic uncertainty on early ischemic NCCT, triggering escalation to radiologist?
- **False positive safety**: Does the model avoid falsely flagging ischaemia-dominant scans as ICH?

---

## 3. Evaluation Protocol

### O-1: CQ500 Ischemia Safety Audit (Runnable immediately)
The CQ500 manifest already identifies 486 scans. The `reads.csv` from Qure.ai includes multi-condition labels beyond ICH, including "Infarcts". We check whether the existing ICH model produces:
- Appropriately **low** ICH probability on ischemic-dominant scans (avoiding false ICH flags).
- Appropriately **high** epistemic uncertainty on ischemic scans (triggering human review).

### O-2: ISLES MRI Engineering Validation (Pending staging)
- Load multi-modal brain MRI volumes (DWI, ADC, FLAIR).
- Preprocess each sequence to `(1, 3, 224, 224)` — use DWI/ADC/FLAIR as 3-channel composite.
- Verify pipeline and latency on CPU for 10 representative cases.

---

## 4. Pre-Registered Success Criteria

| Criterion | Metric | Threshold | Category |
|---|---|---|---|
| **O-1a** | ICH false-positive rate on ischemic CQ500 scans | $\le 15\%$ at $\tau=0.50$ | Safety-confirmatory |
| **O-1b** | Epistemic uncertainty on ischemic scans vs baseline | Mean $\bar{\sigma}^2_{\text{epi}}$ higher on ischemic vs normal | Safety-confirmatory |
| **O-2a** | MRI preprocessing pipeline verified | $(1, 3, 224, 224)$ float32 | Engineering-validated |
| **O-2b** | demo_mode flag (ischemic stroke) | `true` (pending real ischemia-trained weights) | Governance marker |

---

## 5. Execution Protocol

- Script: `validation/scripts/step23_ischemic_stroke_evaluation.py`
- Reports: `validation/reports/v2a1_testO_stroke.json`, `docs/evidence/feasibility_report_testO_stroke.md`
