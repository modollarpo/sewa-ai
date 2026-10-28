# Pre-Registration: Test E — Grad-CAM Spatial Attribution Pointing Game

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## 1. Registration Metadata

| Field | Value |
|---|---|
| Test ID | Test E |
| Title | Grad-CAM Spatial Attribution Pointing Game on CQ500 / BHX Bounding Boxes |
| Registered | 2026-10-28 (before any evaluation run) |
| Governing principles | Pre-registration frozen before any results are computed |
| Dataset licence | CC BY-NC-SA 4.0 (BHX CQ500 bounding boxes); CC BY-NC-SA 4.0 (CQ500 preprocessing) |
| Model | `classifier_v2a1.pt` (frozen; no retraining permitted) |
| Marking | FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. |

---

## 2. Background and Motivation

The SEWA AI triage system uses an EfficientNet-B0 model (`v2a1`) to generate per-study ICH risk scores
and slice-level Grad-CAM heatmaps to aid clinician review. The model was trained on RSNA 2019 ICH
data and evaluated on external CQ500 scans (Test C, AUROC 0.7468). Grad-CAM outputs are surfaced in
the DoctorDashboard for human-readable attribution.

This test evaluates whether the **spatial attribution** produced by Grad-CAM is coherent — specifically,
whether the peak activation location falls within the radiologist-annotated haemorrhage bounding box on
ICH-positive slices (the classic "pointing game" protocol, [Zhang et al. 2018]).

This is a **feasibility study on public data** only. A positive result provides evidence that the
attribution is spatially coherent but does NOT constitute clinical validation of the system.

---

## 3. Dataset

| Attribute | Value |
|---|---|
| Name | BHX — Brain Haemorrhage eXtended (CQ500 bounding-box annotations) |
| Source file | `validation/data_subsets/1_Initial_Manual_Labeling.csv` |
| Records | 6,283 slice-level bounding boxes |
| Studies | 226 unique StudyInstanceUIDs |
| Label types | Subdural, Subarachnoid, Intraparenchymal, Intraventricular, Epidural, Chronic |
| Licence | CC BY-SA 4.0 |
| Coordinate space | DICOM pixel coordinates (x, y, width, height), reference resolution 512×512 |

---

## 4. Model and Feature Cache

| Attribute | Value |
|---|---|
| Checkpoint | `validation/models/classifier_v2a1.pt` (frozen, SHA verified at run time) |
| Architecture | EfficientNet-B0; features[0:3] = early (frozen cache), features[3:9] = late (fine-tuned) |
| Early features | `validation/data_cache/v2_early_cq500.npz` — shape (3884, 24, 40×40) |
| Late output | shape (1, 1280, 5×5) before avgpool |
| Grad-CAM target layer | Final `Conv2dNormActivation` block of `late` network (features[8]) |
| Temperature | T = 0.7984 (calibration; not used in Grad-CAM computation) |

---

## 5. Primary Metric (Pre-Registered)

**Hit Rate** — fraction of annotated slices for which the **peak Grad-CAM activation pixel** (argmax
of the 5×5 CAM interpolated to bbox coordinate space) falls **within** the radiologist bounding box.

$$\text{Hit Rate} = \frac{\sum_{i=1}^{N} \mathbf{1}[\hat{p}_i \in \text{bbox}_i]}{N}$$

where:
- $N$ = number of matched, annotated positive slices
- $\hat{p}_i$ = pixel coordinates of argmax of the Grad-CAM heatmap (resized to 512×512)
- $\text{bbox}_i$ = radiologist bounding box from BHX (x, y, width, height in 512×512 space)

**Pre-registered success criterion: Hit Rate ≥ 55%**

Rationale: Random chance on a 512×512 image with typical bbox area ~5–15% would give ~10% hit rate.
55% represents meaningful spatial coherence while acknowledging the model was trained for classification
(not localisation), uses 8 uniform slices (not all DICOM slices), and the pointing game resolution
is limited to 5×5 (interpolated to 512×512). This threshold is set conservatively to be achievable
on a classification-only model.

---

## 6. Secondary Metrics

| Metric | Description |
|---|---|
| Hit Rate by label type | Breakdown: Subdural, Subarachnoid, Intraparenchymal, Intraventricular, Epidural |
| Mean CAM–bbox IoU | Intersection-over-Union of thresholded CAM (≥50% max) with bbox |
| Hit Rate on positive studies only | Studies with label=1 in manifest |
| 95% CI | Bootstrapped (10,000 resamples, seed=42) on Hit Rate |

---

## 7. Analysis Plan

### 7.1 Slice Matching

CQ500 tile IDs in the feature cache follow the pattern `CQ500-CT-N_slXX` (8 uniform slices per study).
BHX bounding boxes are identified by `SOPInstanceUID` and `StudyInstanceUID` (DICOM UIDs).

**Matching approach:**
- Group BHX bboxes by `StudyInstanceUID` (226 unique studies)
- Sort BHX `StudyInstanceUID` values ascending (by UID string, as emitted by acquisition order)
- Sort CQ500 manifest scan names numerically by scan number (CQ500-CT-N, N ascending)
- **Rank-align**: BHX study rank $k$ → manifest scan rank $k$ (rank-based UID→scan mapping)

This is a best-effort approximation: the BHX dataset was annotated on the same 226 CQ500 studies
that overlap the manifest. No reads.csv is available locally to perform exact UID matching.

**Limitation (pre-registered):** Rank-based matching may misalign a subset of studies. This is
acknowledged in the final report and is a known limitation of the local feasibility evaluation.

### 7.2 Grad-CAM Computation

For each matched slice (tile_id `CQ500-CT-N_slXX`):
1. Load early feature `feats[i]` from `v2_early_cq500.npz` (shape 24×40×40)
2. Forward through `late` with gradient tracking on the last Conv2dNormActivation output
3. Compute class score for ICH class (class 1)
4. Backpropagate to last conv layer features
5. Global-average-pool gradients → channel weights
6. Weighted sum of feature channels → ReLU → 5×5 CAM
7. Bilinear interpolate to 512×512
8. Argmax → peak pixel (x_peak, y_peak)

### 7.3 Hit Rate Computation

For each study's matched slices:
- For each annotated BHX bbox, check if (x_peak, y_peak) falls within (x, y, x+w, y+h)
- Aggregate across all bbox-slice pairs in the matched study set

### 7.4 Confidence Interval

Bootstrap 95% CI (10,000 resamples, seed=42) at the **study level** to account for
within-study correlation of slice annotations.

---

## 8. Exclusions

- Slices from studies not in the BHX dataset → excluded
- Slices where Grad-CAM total activation mass = 0 → excluded (model uninformative)
- BHX bboxes with labelType not in ['handDrawn', 'selectedThinSlices'] → excluded

---

## 9. Model Integrity Constraints

- Checkpoint `classifier_v2a1.pt` MUST NOT be modified before or during evaluation
- No hyperparameter tuning permitted during evaluation
- Temperature calibration (T=0.7984) is NOT applied in Grad-CAM computation

---

## 10. Reporting

Results will be saved to:
- `validation/reports/v2a1_testE_gradcam.json` (machine-readable)
- `docs/evidence/feasibility_report_testE_gradcam.md` (human-readable)

Both documents will carry the marking: **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
