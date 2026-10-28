# Pre-Registration: Test I — Multimodal Clinical Weight Realization (Mammography & Retinal)

> **REGULATORY NOTICE**  
> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> Pre-registration frozen before model export and evaluation execution.

---

## 1. Context & Rationale

In the baseline SEWA AI audit, Mammography and Retinal microservices (`ai-services/mammography` and `ai-services/retinal`) operated in **DEMO MODE** (`demo_mode: true`), falling back to a synthetic single-layer linear projection (`Gemm`) with random normal weights when no ONNX weights were present in `/models`. 

While Tests F and G verified pipeline ingestion, JSON schema conformance, and BI-RADS / ICDR mapping, both services lacked functional deep convolutional backbones with real feature representation.

To prepare the multimodal suite for shadow-mode observational clinical pilots, Test I specifies the transition of both services to production-grade deep learning backbones with INT8 quantization.

---

## 2. Hypothesis & Objectives

1. **Backbone Realization**: Replace synthetic linear fallbacks with deep EfficientNet-B0 architectures initialized with pre-trained visual feature representations and calibrated multi-class heads.
2. **Edge CPU Feasibility**: Dynamically quantize both models to INT8 to achieve inference latency $\le 50\text{ ms}$ on single-core vCPUs without GPU acceleration.
3. **Honest Backend Transition**: Ensure `/health` and `/predict` endpoints truthfully report `demo_mode: false` and `backend: "onnx-int8"` (or `"onnx-fp32"`).
4. **Pipeline & Schema Verification**: Ensure 100% schema compliance across:
   - Mammography: 8 diagnostic conditions mapped to BI-RADS 0–5 and SNOMED-CT concepts.
   - Retinal: 5 diabetic retinopathy stages mapped to ICDR Grades 0–4 and urgent clinical alerts.

---

## 3. Pre-Registered Success Criteria

| ID | Criterion | Target Threshold | Validation Method |
|:---|:---|:---|:---|
| **I.1** | **Model Integrity & Footprint** | FP32 $< 25\text{ MB}$, INT8 $< 10\text{ MB}$ | Disk serialization inspection |
| **I.2** | **Inference Latency** | Mean latency $< 50\text{ ms}$ on CPU | 20 consecutive inference passes |
| **I.3** | **Truthful Backend Reporting** | `demo_mode == False`, `backend in ["onnx-int8", "onnx-fp32"]` | Live FastAPI response inspection |
| **I.4** | **Probability Calibration** | $\sum p_i = 1.0 \pm 10^{-4}$, non-degenerate distribution | Softmax validation on benchmark samples |
| **I.5** | **Dataset Pipeline Verification** | 100% successful inference on CBIS-DDSM & EyePACS samples | End-to-end execution on test subsets |

---

## 4. Datasets & Ground Truth

1. **Mammography**: CBIS-DDSM calcification benchmark (`calc_case(with_jpg_img).csv`, 1,872 cases, CC BY 3.0, TCIA) and mammogram images.
2. **Retinal**: EyePACS fundus image series (`10000_left.jpeg`, `10000_right.jpeg`, `10001_left.jpeg`, `10001_right.jpeg`, research use).

---

## 5. Scope & Caveat

The models deployed in Test I represent transfer-learned deep feature extractors adapted for multimodal triage. They are validated for software integrity and algorithmic feasibility under shadow-mode observational protocols. They do not constitute cleared medical devices for autonomous diagnosis.
