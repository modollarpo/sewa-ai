# Pre-Registration: Test K — Acquisition Noise, Motion Blur & Physics Perturbation Robustness

**FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**

---

## 1. Registration Metadata

| Field | Value |
|---|---|
| Test ID | **Test K** |
| Title | Acquisition Noise, Motion Blur & Physics Perturbation Robustness Stress-Test |
| Registered | 2026-10-28 (committed prior to evaluation) |
| Governing principle | Perturbation levels, statistical endpoints, and thresholds frozen prior to evaluation |
| Model under evaluation | `classifier_v2a1.pt` (frozen EfficientNet-B0 with temperature scaling $T=0.7984$) |
| Dataset | RSNA 2019 Brain CT Challenge Held-Out Test Set ($N=300$ slices, with $N=300$ validation split) |
| Image Data | 3-window composite CT slices ($224 \times 224 \times 3$, Brain/Subdural/Bone windows) |
| Licences | RSNA Research Use / Kaggle Terms |
| Marking | **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.** |

---

## 2. Background and Clinical Motivation

In routine NHS emergency practice, non-contrast head CTs are frequently degraded by:
1. **Patient Movement / Agitation**: Trauma patients, stroke victims, and elderly patients with delirium frequently move during gantry rotation, causing linear and rotational motion blur.
2. **Radiation Dose Noise / Photon Starvation**: Ultra-low-dose emergency protocols or obese patient habitus induce high-frequency Poisson and Gaussian quantum mottle.
3. **Contrast & Windowing Discrepancies**: Subtle differences in scanner reconstruction filters.

Under **NHS DCB0129 Clinical Safety Standards**, an automated clinical AI tool must never fail "silently" on degraded inputs. When image quality deteriorates, two properties are clinically mandatory:
- **Graceful Degradation**: Performance must not collapse catastrophically under mild to moderate artifacts.
- **Epistemic Uncertainty Calibration**: Monte Carlo epistemic uncertainty ($\sigma^2_{\text{epi}}$) must spike monotonically in the presence of noise, safely escalating degraded scans to human consultant review.

---

## 3. Perturbation Protocol & Stress Testing

We apply controlled synthetic perturbations directly to normalized float32 pixel arrays $[0, 1]$ on the held-out test cohort ($N=300$ slices):

### 1. Gaussian Radiation Dose Noise Stress
Simulating photon-starvation quantum mottle across 5 standard deviations:
$$\sigma_{\text{noise}} \in \{0.00, 0.05, 0.10, 0.20, 0.35\}$$
Noise is sampled from $\mathcal{N}(0, \sigma^2)$ and clipped to $[0, 1]$.

### 2. Patient Motion Blur Stress
Simulating directional patient tremor/head movement using horizontal linear convolution kernels of lengths:
$$L_{\text{blur}} \in \{1\text{ (none)}, 3\text{ (mild)}, 7\text{ (moderate)}, 11\text{ (severe)}, 15\text{ (extreme)}\}$$

### 3. Window Scale & Contrast Invariance
Simulating intensity shifts across window ranges:
$$\Delta_{\text{contrast}} \in \{0.70, 0.85, 1.00, 1.15, 1.30\}$$

---

## 4. Pre-Registered Statistical Hypotheses & Success Criteria

| Criterion | Metric | Pre-registered Threshold | Category |
|---|---|---|---|
| **K-1** | **Noise Graceful Degradation** | AUROC remains $\ge 0.75$ at mild noise ($\sigma = 0.05$) and $\ge 0.65$ at moderate noise ($\sigma = 0.10$) | Confirmatory |
| **K-2** | **Motion Blur Tolerance** | AUROC remains $\ge 0.70$ at moderate motion blur ($L = 7\text{ px}$) | Confirmatory |
| **K-3** | **Epistemic Uncertainty Monotonicity** | Mean epistemic variance $\bar{\sigma}^2_{\text{epi}}$ increases monotonically with noise ($r_s \ge 0.85$ Spearman correlation) | Confirmatory |
| **K-4** | **Safety Gate Escalation Rate** | Conformal / uncertainty safety gate routes $\ge 90.0\%$ of severely degraded scans ($\sigma = 0.35$) to radiologist review | Confirmatory |

---

## 5. Execution Protocol

- Script: `validation/scripts/step19_robustness_perturbation.py`
- Report: `validation/reports/v2a1_testK_robustness.json`
- Markdown Deliverable: `docs/evidence/feasibility_report_testK_robustness.md`
- Audit Rule: All results reported verbatim regardless of whether thresholds are met.
