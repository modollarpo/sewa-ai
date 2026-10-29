# SEWA AI — Four-Case False Negative In-Depth Failure Analysis

**Statutory Marking**: `FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.`  
**Cohort**: CQ500 External Validation Dataset ($N=486$ studies, $3,884$ slices)  
**Classifier Checkpoint**: `classifier_v2a1.pt` (Base model, no AdaBN)  
**Conformal Threshold**: $\lambda = 0.0298$ (Conservative operating point)  
**OOD Gate Threshold**: $\tau_{\text{ood}} = 52.05$ (Relative Mahalanobis, 95th pctl within-sample TNs)  
**Epistemic Gate Threshold**: $\tau_{\text{epi}} = 3.50e-04$ (MC-Dropout $N=30$ variance, 95th pctl within-sample TNs)  

---

## 1. Executive Summary & Required Governance Marking

> **Governing Audit Finding** (Approved Phrasing):  
> *"In this exploratory evaluation, four of six classifier false negatives were not flagged by either evaluated secondary gate. These results show that the tested gates did not intercept every observed false negative and require further evaluation on independent data."*

In the single-gate classifier threshold evaluation at $\lambda = 0.0298$, the classifier achieved an observed holdout False Negative Rate (FNR) of **3.70%** ($6/162$ positive studies, $96.3\%$ sensitivity). A secondary safety interception audit was subsequently conducted across all 6 false-negative studies to evaluate whether Out-of-Distribution (OOD) representation anomaly detection or Epistemic Uncertainty estimation would trigger escalation:
- **2 studies** (`CQ500-CT-415`, `CQ500-CT-43`) exceeded $\tau_{\text{ood}}$ and were successfully intercepted.
- **4 studies** (`CQ500-CT-196`, `CQ500-CT-385`, `CQ500-CT-278`, `CQ500-CT-426`) remained strictly below all secondary gate thresholds and were **not intercepted**.

This report presents an in-depth clinical and technical failure analysis of these four unintercepted cases to establish failure modes and guide engineering countermeasures.

---

## 2. Quantitative Summary of the Four Missed Cases

| Study ID | Subtype Profile | BHX Annotations | MAX Slice Score | TOP-3 MEAN Score | OOD Score ($RMD$) | Epistemic Var ($\sigma^2_{\text{mc}}$) | Gate Disposition |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **CQ500-CT-196** | Intraparenchymal (focal/low volume) | Intraparenchymal: 6 | `0.001659` | `0.001212` | `47.40` (thresh: `52.05`) | `8.29e-07` (thresh: `3.50e-04`) | **NOT INTERCEPTED** |
| **CQ500-CT-385** | Subarachnoid Haemorrhage (SAH) | Subarachnoid: 14 | `0.009621` | `0.005078` | `32.43` (thresh: `52.05`) | `1.79e-05` (thresh: `3.50e-04`) | **NOT INTERCEPTED** |
| **CQ500-CT-278** | Multi-compartment Complex Trauma (IPH + SAH + SDH) | Intraparenchymal: 54, Subarachnoid: 132, Subdural: 143 | `0.002455` | `0.001166` | `41.01` (thresh: `52.05`) | `1.32e-06` (thresh: `3.50e-04`) | **NOT INTERCEPTED** |
| **CQ500-CT-426** | Intraparenchymal (subacute / petechial) | Intraparenchymal: 14 | `0.006272` | `0.003299` | `46.58` (thresh: `52.05`) | `4.97e-06` (thresh: `3.50e-04`) | **NOT INTERCEPTED** |

> [!IMPORTANT]
> Under **both** MAX slice probability and TOP-3 MEAN probability aggregation, **every single slice** across all four studies scores strictly below $\lambda = 0.0298$. The false-negative disposition is not an artifact of score aggregation; the convolutional feature extractor produced low activation values across the entire slice stack.

---

## 3. Detailed Per-Case Failure Analysis

### Case 1: `CQ500-CT-196` (Intraparenchymal (focal/low volume))

- **Reference Label**: Confirmed positive ICH by majority consensus of 3 senior radiologists (`reads.csv`).
- **BHX Radiologist Annotations**: {"Chronic": 0, "Epidural": 0, "Intraparenchymal": 6, "Intraventricular": 0, "Subarachnoid": 0, "Subdural": 0}
- **Slice Probabilities (sl00 to sl07)**:
| Slice ID | Probability | Disposition vs $\lambda$ |
| :--- | :---: | :---: |
| `CQ500-CT-196_sl00` | `0.000000` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-196_sl01` | `0.000301` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-196_sl02` | `0.000422` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-196_sl03` | `0.000308` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-196_sl04` | `0.001119` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-196_sl05` | `0.000060` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-196_sl06` | `0.001659` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-196_sl07` | `0.000857` | `< 0.0298` (Sub-threshold) |

- **Secondary Gate Diagnostics**:
  - Relative Mahalanobis OOD: `47.40` (Threshold: `52.05` — Margin: `+4.65` below trigger)
  - Epistemic Uncertainty Variance: `8.29e-07` (Threshold: `3.50e-04`)
- **Radiological Finding**: Focal deep parenchymal petechial hyperdensity (6 BHX annotations). Attenuation contrast against gray matter was insufficient to trigger high feature activations.
- **Computer Vision Failure Mode**: Low feature norm; slice representations clustered in central in-distribution normal parenchyma subspace, escaping OOD distance threshold (RMD=47.40 < 52.05). Low MC-Dropout variance (8.29e-7) indicates strong certainty in background prediction.

---

### Case 2: `CQ500-CT-385` (Subarachnoid Haemorrhage (SAH))

- **Reference Label**: Confirmed positive ICH by majority consensus of 3 senior radiologists (`reads.csv`).
- **BHX Radiologist Annotations**: {"Chronic": 0, "Epidural": 0, "Intraparenchymal": 0, "Intraventricular": 0, "Subarachnoid": 14, "Subdural": 0}
- **Slice Probabilities (sl00 to sl07)**:
| Slice ID | Probability | Disposition vs $\lambda$ |
| :--- | :---: | :---: |
| `CQ500-CT-385_sl00` | `0.009621` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-385_sl01` | `0.000010` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-385_sl02` | `0.000000` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-385_sl03` | `0.000472` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-385_sl04` | `0.000727` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-385_sl05` | `0.004886` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-385_sl06` | `0.000334` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-385_sl07` | `0.000001` | `< 0.0298` (Sub-threshold) |

- **Secondary Gate Diagnostics**:
  - Relative Mahalanobis OOD: `32.43` (Threshold: `52.05` — Margin: `+19.62` below trigger)
  - Epistemic Uncertainty Variance: `1.79e-05` (Threshold: `3.50e-04`)
- **Radiological Finding**: Subarachnoid blood distributed along cortical sulci (14 BHX annotations). Thin layering of blood in sulci with partial volume averaging against adjacent cortical bone and CSF.
- **Computer Vision Failure Mode**: Sulcal effacement without discrete large intraparenchymal mass effect. Consistent with known external challenge on SAH recall (88.1% vs 96.3% overall). Feature vector remained close to in-distribution baseline (RMD=32.43).

---

### Case 3: `CQ500-CT-278` (Multi-compartment Complex Trauma (IPH + SAH + SDH))

- **Reference Label**: Confirmed positive ICH by majority consensus of 3 senior radiologists (`reads.csv`).
- **BHX Radiologist Annotations**: {"Chronic": 0, "Epidural": 0, "Intraparenchymal": 54, "Intraventricular": 0, "Subarachnoid": 132, "Subdural": 143}
- **Slice Probabilities (sl00 to sl07)**:
| Slice ID | Probability | Disposition vs $\lambda$ |
| :--- | :---: | :---: |
| `CQ500-CT-278_sl00` | `0.000034` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-278_sl01` | `0.000002` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-278_sl02` | `0.000782` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-278_sl03` | `0.000010` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-278_sl04` | `0.000260` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-278_sl05` | `0.000142` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-278_sl06` | `0.002455` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-278_sl07` | `0.000000` | `< 0.0298` (Sub-threshold) |

- **Secondary Gate Diagnostics**:
  - Relative Mahalanobis OOD: `41.01` (Threshold: `52.05` — Margin: `+11.04` below trigger)
  - Epistemic Uncertainty Variance: `1.32e-06` (Threshold: `3.50e-04`)
- **Radiological Finding**: Dispersed polytrauma haemorrhage (54 IPH, 132 SAH, 143 SDH annotations). Extensive multi-compartment blood spread across convexities and sulci.
- **Computer Vision Failure Mode**: Dispersed diffuse distribution without a single dominant hyperdense contiguous focus. The 8 selected slices sampled regions where partial voluming diluted the max slice probability (max=0.00246, top-3 mean=0.00117). Epistemic variance (1.32e-6) was suppressed.

---

### Case 4: `CQ500-CT-426` (Intraparenchymal (subacute / petechial))

- **Reference Label**: Confirmed positive ICH by majority consensus of 3 senior radiologists (`reads.csv`).
- **BHX Radiologist Annotations**: {"Chronic": 0, "Epidural": 0, "Intraparenchymal": 14, "Intraventricular": 0, "Subarachnoid": 0, "Subdural": 0}
- **Slice Probabilities (sl00 to sl07)**:
| Slice ID | Probability | Disposition vs $\lambda$ |
| :--- | :---: | :---: |
| `CQ500-CT-426_sl00` | `0.000034` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-426_sl01` | `0.000000` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-426_sl02` | `0.000000` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-426_sl03` | `0.002345` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-426_sl04` | `0.006272` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-426_sl05` | `0.001279` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-426_sl06` | `0.000006` | `< 0.0298` (Sub-threshold) |
| `CQ500-CT-426_sl07` | `0.000356` | `< 0.0298` (Sub-threshold) |

- **Secondary Gate Diagnostics**:
  - Relative Mahalanobis OOD: `46.58` (Threshold: `52.05` — Margin: `+5.47` below trigger)
  - Epistemic Uncertainty Variance: `4.97e-06` (Threshold: `3.50e-04`)
- **Radiological Finding**: Intraparenchymal haemorrhagic focus (14 BHX annotations). Borderline attenuation (+50 to +60 HU) typical of subacute or small contusion.
- **Computer Vision Failure Mode**: Attenuated gradient activation. Classifier logits were suppressed below zero across all slices (max slice prob=0.00627). Secondary gates found representations typical of standard head CT scans (RMD=46.58, epi=4.97e-6).

---

## 4. Key Failure Themes & Architectural Root Causes

### A. The 2D Slice Independence Trap
In 2D CNN slice-based architectures, each axial slice is processed independently without volumetric inter-slice context. When haemorrhages are thin, petechial, or diffuse (as in sulcal SAH in `CQ500-CT-385` and multi-compartment blood in `CQ500-CT-278`), partial-volume averaging dilutes the 2D feature norm. Without 3D axial context, the network treats subtle density elevations as parenchymal tissue variations rather than pooling continuous volumetric evidence across consecutive slices.

### B. Subtype Specificity: Subarachnoid Haemorrhage (SAH)
As documented in Test J (`step18_ich_subtypes_evaluation.py`), SAH exhibits the lowest baseline sensitivity among all subtypes ($88.1\%$ recall vs. $96.3\%$ overall). Case `CQ500-CT-385` directly embodies this vulnerability. The blood is confined to narrow subarachnoid sulcal spaces without mass effect or intraparenchymal hematoma. Dedicated spatial attention to the basal cisterns and sulcal spaces is necessary.

### C. OOD and Epistemic Metric Limitations on In-Distribution Misses
Both evaluated secondary gates rely on representation divergence:
1. **Relative Mahalanobis Distance** measures deviation from training feature centroids.
2. **MC-Dropout Variance** measures predictive instability across stochastic weight perturbations.

When an image contains a subtle lesion that produces almost zero activation in the feature maps, its latent representation is mathematically indistinguishable from a normal, non-haemorrhagic brain CT. Consequently, the network is *confidently wrong*: the OOD distance is small (in-distribution normal), and epistemic variance is nearly zero ($10^{-7}$ to $10^{-5}$). Representation-based gates alone cannot intercept false negatives that fail to produce latent divergence.

---

## 5. Engineering Action Plan for Next Model Iteration (TRL 5 -> TRL 6)

1. **Volumetric Sequence Modeling**: Implement a 2.5D or 3D sequence aggregator (e.g. 8-slice Bi-Directional GRU or axial Transformer) over EfficientNet slice features to aggregate continuity of subtle blood across consecutive slices.
2. **Dedicated SAH Subtype Branch**: Integrate an explicit sulcal hyperattenuation detection head calibrated on high-risk cistern and sulcal anatomies.
3. **Gradient-Based Saliency Monitoring**: Augment Mahalanobis OOD with activation-gradient norm monitoring in high-density Hounsfield zones (+50 to +90 HU).
4. **Preservation of Mandatory Consultant Sign-Off**: The failure of secondary statistical gates to intercept 4 of 6 false negatives confirms the absolute clinical necessity of SEWA's mandatory consultant radiologist sign-off workflow. AI suggestions must never auto-release reports without authorized clinician verification.

---

**Report Generated**: 2026-10-29  
**Governance Status**: Failure analysis complete. Cases frozen as regression benchmarks for v2b/v3 development.