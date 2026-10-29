# SEWA AI — Prospective Evaluation Protocol Freeze (v2a1)

**Statutory Marking**: `FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.`  
**Protocol Version**: 1.0.0 (Pre-Trial Freeze)  
**Effective Date**: 2026-10-29  
**Governance Framework**: SEWA-SHADOW-1 Prospective Observational Study Preparation  
**Target Milestone**: Progression from Pre-Clinical (TRL 5) to Clinical Validation (TRL 6)  

---

## 1. Purpose & Scope

This protocol establishes a strictly pre-registered, frozen evaluation standard for SEWA AI's intracranial haemorrhage (ICH) detection pipeline prior to any prospective observational or genuinely independent external validation. 

In accordance with good clinical evaluation practice and to prevent post-hoc metric tuning, all model checkpoints, preprocessing transforms, aggregation rules, decision thresholds, reference distributions, and primary endpoints are frozen herein.

---

## 2. Frozen Model Architecture & Weights

1. **Architecture**: EfficientNet-B0 backbone (modified 3-channel CT input, 1280 penultimate feature dimensions, binary classification linear head with dropout rate $p = 0.30$).
2. **Checkpoint File**: `validation/models/classifier_v2a1.pt`
3. **Weight State**:
   - Frozen feature extractor weights (`early` + `late`).
   - Frozen classification head weights (`clf`).
   - Temperature scaling: Fixed at $T = 0.7984$ (validation set calibrated). Temperature scaling applies to raw logits; study-level score aggregation applies to calibrated probabilities.
4. **Adaptation Policy**:
   - Baseline validation mode: **Base model (Zero AdaBN)**. Running batch normalization moments are frozen at training-set values.
   - Exploratory transductive mode (when reported): Zero-Label AdaBN with explicit disclosure that target clinical site distribution batch normalization moments were updated. Must be reported as a separate secondary arm.

---

## 3. Preprocessing & Input Standardization

1. **Input Format**: Axial non-contrast head CT series.
2. **Volumetric Windowing (3-Channel Composite)**:
   - **Channel 0 (Brain Window)**: Window Level (WL) = +40 HU, Window Width (WW) = 80 HU (range: 0 to +80 HU).
   - **Channel 1 (Subdural / Blood Window)**: Window Level (WL) = +75 HU, Window Width (WW) = 130 HU (range: +10 to +140 HU).
   - **Channel 2 (Bone Window)**: Window Level (WL) = +600 HU, Window Width (WW) = 2000 HU (range: -400 to +1600 HU).
3. **Spatial Normalization**:
   - Resized to $224 \times 224$ pixels via bilinear interpolation.
   - Normalization using training set channel-wise mean and standard deviation.
4. **Slice Sampling Strategy**:
   - Standard 8-slice uniform volumetric subsampling spanning the supratentorial and infratentorial brain parenchyma, excluding slices inferior to the foramen magnum and superior to the vertex.

---

## 4. Score Aggregation & Primary Decision Gating

1. **Study-Level Score Aggregation**:
   - Primary metric: **TOP-3 Slice MEAN Probability**.
   - Formula: Given slice probabilities $p_1, p_2, \dots, p_8$, sort descending $p_{(1)} \ge p_{(2)} \ge \dots \ge p_{(8)}$. Study score $S = \frac{1}{3} \sum_{i=1}^3 p_{(i)}$.
   - Sensitivity reporting: MAX slice probability ($p_{(1)}$) must also be computed and reported side-by-side to ensure full transparent traceability.
2. **Operating Decision Thresholds**:
   - **Conservative Threshold**: $\lambda_{\text{cons}} = 0.0298$ (Derived from conformal calibration targeting $\alpha \le 5\%$ FNR).
   - **Calibrated Threshold**: $\lambda_{\text{cal}} = 0.0753$ (Exact empirical conditional threshold).
3. **Triage Routing Rule**:
   - If $S \ge \lambda$: **ESCALATE / CLINICAL REVIEW** (Priority worklist).
   - If $S < \lambda$: Forward to Secondary Safety Gates (OOD & Epistemic). Auto-clear only if both secondary gates pass.

---

## 5. Secondary Safety Gates (Anomaly Interception)

1. **Out-of-Distribution (OOD) Gate**:
   - Metric: **Relative Mahalanobis Distance ($RMD$)** computed over penultimate feature vectors (1280-D).
   - Covariance estimator: Ledoit-Wolf shrinkage ($\text{shrinkage} = 0.05$) fitted strictly on in-distribution training data.
   - Operating Threshold: Pre-registered candidate threshold $\tau_{\text{ood}} = 52.05$. (Note: Evaluated as exploratory within-sample; future independent validation will evaluate whether external site calibration shifts this threshold).
2. **Epistemic Uncertainty Gate**:
   - Metric: **Monte Carlo Dropout Predictive Variance ($\sigma^2_{\text{mc}}$)**.
   - Inference passes: $N = 30$ stochastic forward passes with dropout active ($p = 0.30$).
   - Reproducibility constraint: The pseudo-random number generator seed must be fixed (`torch.manual_seed(42)`) before commencing stochastic inference on any study.
   - Operating Threshold: Pre-registered candidate threshold $\tau_{\text{epi}} = 3.50 \times 10^{-4}$.

---

## 6. Study Endpoints & Success Criteria

1. **Primary Clinical Safety Endpoint**:
   - **Conditional False Negative Rate (FNR)** among confirmed positive ICH studies at $\lambda = 0.0298$: Target $\le 5.0\%$ ($95\%$ sensitivity).
2. **Subtype Separation Endpoint**:
   - Subarachnoid Haemorrhage (SAH) specific sensitivity reported separately. Overall FNR must never be conflated with SAH recall.
3. **Secondary Safety Interception Endpoint**:
   - Proportion of classifier false negatives flagged by secondary OOD or Epistemic gates.
4. **Missing or Corrupted Study Handling**:
   - Strict Fail-Closed Policy: Any scan with corrupted DICOM headers, missing slices ($< 8$ valid slices), out-of-range HU values, or network timeout must fail directly to **HUMAN REVIEW** (`requiresHumanReview: true`). Auto-clearing is strictly forbidden for non-passing technical checks.

---

## 7. Consultant Radiologist Verification Requirement

Software routing and safety gates serve purely to prioritize human attention. In production deployment, all clinical findings, whether auto-cleared or escalated, require final sign-off by a licensed consultant radiologist through authenticated server-side RBAC and database-constrained approval workflows.

---

**Protocol Sign-Off**: 2026-10-29  
**Status**: FROZEN FOR INDEPENDENT VALIDATION
