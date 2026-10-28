# Pre-Registration: Test J — Acute ICH Subtype Diagnostic Sensitivity & Critical-Negative Safety Audit

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## 1. Registration Metadata

| Field | Value |
|---|---|
| Test ID | **Test J** |
| Title | Acute Intracranial Haemorrhage (ICH) Subtype Diagnostic Sensitivity, Subgroup Specificity & Critical-Negative Safety Audit |
| Registered | 2026-10-28 (committed prior to evaluation) |
| Governing principle | Statistical endpoints and thresholds frozen prior to evaluation |
| Model under evaluation | `classifier_v2a1.pt` (frozen EfficientNet-B0 with temperature scaling $T=0.7984$ / $T=2.426$) |
| Datasets | RSNA 2019 Brain CT Challenge (N=2,000 multi-label slices) & CQ500 / BHX External Validation Cohort (N=226 studies, 6,283 slice annotations) |
| Licences | RSNA Research Use / Kaggle Terms; CC BY-SA 4.0 (BHX CQ500 annotations); CC BY-NC-SA 4.0 (CQ500) |
| Marking | **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** |

---

## 2. Background and Clinical Motivation

Acute intracranial haemorrhage (ICH) encompasses distinct anatomical and pathophysiological entities with starkly different clinical management pathways:
1. **Epidural Haemorrhage (EDH)**: Typically arterial (middle meningeal artery); rapid progression with "lucid interval" followed by catastrophic herniation; neurosurgical emergency.
2. **Subdural Haematoma (SDH)**: Venous shearing; high prevalence in trauma and elderly patients; crescentic shape along dural convexity.
3. **Subarachnoid Haemorrhage (SAH)**: Aneurysmal rupture or trauma; hyperdense blood tracking into basal cisterns and sulci; notoriously subtle on non-contrast CT and catastrophic if missed.
4. **Intraparenchymal Haemorrhage (IPH)**: Hypertensive or amyloid; parenchymal hematoma with peri-lesional edema; rapid expansion risk.
5. **Intraventricular Haemorrhage (IVH)**: Ventricular casting and obstructive hydrocephalus; high mortality.
6. **Chronic Subdural (Chronic)**: Hypodense/isodense collection; diagnostic challenge due to lower attenuation approaching CSF.

While Tests A, C, and C.2 evaluated aggregate binary detection of "any ICH" (AUROC 0.807 internal / 0.7596 external), acute clinicians and NICE/MHRA evaluators require granular evidence on **subtype-specific sensitivity**:
- Does the model miss subtle, sulcal subarachnoid blood?
- What is the recall on life-threatening arterial epidural haematomas?
- Does the **Split Conformal Risk Control gate** ($\lambda = 0.0298$, target $\text{FNR} \le 5\%$) safely protect against false negatives across all six individual subtypes?

---

## 3. Datasets & Ground Truth Definition

### Cohort 1: RSNA Multi-Label Benchmark (Internal / In-Distribution)
- **Source**: `validation/data_cache/rsna_2000_224_3win.npz` and `stage_2_train_with_metadata.csv.zip`.
- **Sample Size**: 2,000 slices (1,400 train, 300 validation, 300 test).
- **Ground Truth**: Consensus radiologist binary flags for each of the 5 canonical subtypes:
  `['epidural', 'intraparenchymal', 'intraventricular', 'subarachnoid', 'subdural', 'any']`.

### Cohort 2: CQ500 / BHX External Cohort (Out-of-Distribution Generalisation)
- **Source**: `validation/data_cache/v2_early_cq500.npz` (486 scans, 3,884 uniform 8-slice feature sets) and `validation/data_subsets/1_Initial_Manual_Labeling.csv`.
- **Sample Size**: 226 uniquely annotated positive studies with 6,283 slice-bbox annotations.
- **Ground Truth**: Subtypes mapped from manual radiologist bounding boxes:
  - Intraparenchymal: 127 studies (1,324 slice bboxes)
  - Subarachnoid: 118 studies (1,746 slice bboxes)
  - Subdural: 90 studies (1,849 slice bboxes)
  - Intraventricular: 43 studies (558 slice bboxes)
  - Chronic: 32 studies (740 slice bboxes)
  - Epidural: 6 studies (66 slice bboxes)

---

## 4. Pre-Registered Statistical Hypotheses & Endpoints

### Primary Endpoints
1. **Subtype Sensitivity @ Default Threshold ($\tau = 0.50$)**:
   $$\text{Sensitivity}_k = \frac{\text{TP}_k}{\text{TP}_k + \text{FN}_k}$$
   Reported with 95% Wilson score confidence intervals for each subtype $k$.
2. **Subtype Sensitivity @ Acute Triage Threshold ($\tau = 0.30$)**:
   Evaluates clinical sensitivity when worklist prioritisation is tuned for higher recall.
3. **Critical Negative Risk under Conformal Risk Control ($\lambda = 0.0298$)**:
   Evaluates whether the split conformal gate ($\text{FNR} \le 5\%$) safely maintains high recall on all critical subtypes:
   $$\text{Recall}_{\text{CRC}, k} = \frac{\sum_{i \in \text{Pos}_k} \mathbb{I}(p_i \ge 0.0298)}{N_k}$$
4. **Subtype Discrimination AUROC**:
   ROC area under the curve for detecting positive cases of each subtype vs true negatives.
5. **Epistemic Uncertainty Stratification**:
   Mean Monte Carlo epistemic variance $\sigma^2_{\text{epi}}$ compared across subtypes.

---

## 5. Success Criteria

| Criterion | Metric | Pre-registered Threshold | Category |
|---|---|---|---|
| **C-1** | Acute Triage Sensitivity ($\tau = 0.30$) on Major Subtypes (IPH, SAH, SDH) | $\ge 80.0\%$ | Confirmatory |
| **C-2** | Conformal Risk Gate ($\lambda = 0.0298$) Recall on Surgical Emergencies (EDH, SAH) | $\ge 90.0\%$ | Confirmatory |
| **C-3** | Epistemic Uncertainty Awareness | $\sigma^2_{\text{epi}}$ on False Negatives $>$ $\sigma^2_{\text{epi}}$ on True Negatives | Confirmatory |
| **C-4** | Comprehensive Reporting | 95% Wilson CIs for all 6 subtypes reported without omission | Descriptive |

---

## 6. Execution Protocol

- Script: `validation/scripts/step18_ich_subtypes_evaluation.py`
- Report: `validation/reports/v2a1_testJ_subtypes.json`
- Markdown Deliverable: `docs/evidence/feasibility_report_testJ_subtypes.md`
- Audit Rule: All results reported verbatim regardless of whether thresholds are met.
