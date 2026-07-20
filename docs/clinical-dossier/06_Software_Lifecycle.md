# SEWA AI — Software Lifecycle File (IEC 62304)

**Document Ref:** SEWA-AI-DOC-06 · **Version:** 1.0 · **July 2026**
**Standard:** IEC 62304:2006+A1:2015 (Medical device software — software lifecycle processes)

---

## 1. Software Safety Classification

| Criterion | Determination |
|---|---|
| Drives clinical management? | Yes (triage of critical findings) |
| Failure could lead to death/serious injury? | Yes, if critical finding missed |
| **Software safety class** | **Class C** (highest) |

Class C mandates the most rigorous IEC 62304 processes: detailed planning, risk-control to the
software level, rigorous verification, and problem-resolution with trend analysis.

---

## 2. Lifecycle Processes Implemented

| Process | IEC 62304 clause | Status |
|---|---|---|
| Software development planning | 5.1 | SOP-SW-001 |
| Requirements analysis | 5.2 | SRS-SEWA-001 (triage, gates, HITL) |
| Architectural design | 5.3 | ADD-SEWA-001 (four-engine + DB-layer) |
| Detailed design | 5.4 | Module specs |
| Implementation | 5.5 | Python 3.11 / PyTorch / ONNX |
| Integration & verification | 5.6 | Unit + integration tests |
| System testing | 5.7 | Functional + safety-gate tests |
| Release | 5.8 | Versioned, signed builds |
| Problem resolution | 6 | PR-SEWA-001 |
| Change management | 6.3 | Git; peer review; traceability |
| Configuration management | 7 | Git + CI; build provenance |

---

## 3. Software Architecture (for lifecycle traceability)

| Engine | Role | SOUP / Library |
|---|---|---|
| 1 — Detection CNN | EfficientNet-B4; 14 acute conditions; Grad-CAM/SHAP | PyTorch, OpenCLIP |
| 2 — Uncertainty QE | MC-Dropout x20; U = 0.6 sigma2_ep + 0.4 sigma2_al | PyTorch |
| 3 — Metacognition | Nine-layer hallucination gate; H>0.30 BLOCK | Custom + scikit-learn |
| 4 — VLM Report | LLaVA-Med LoRA; 8 languages | HuggingFace Transformers |
| DB-layer HITL | SIGNED=true before DELIVERED | Custom (enforced) |

---

## 4. SOUP (Software of Unknown Provenance) List

| SOUP | Version | Risk | Mitigation |
|---|---|---|---|
| PyTorch | 2.0+ | Known CVEs | Pinned; scanned; air-gapped build |
| ONNX Runtime | 17+ | Inference integrity | Static quant verification |
| HuggingFace Transformers | current | Model provenance | Model hash pinning |
| Python | 3.11 | Lang CVEs | Patch policy |

---

## 5. Verification & Validation

- Unit tests per engine; integration tests for the four-engine pipeline.
- Safety-gate tests: inject seeded hallucinations; confirm BLOCK rate (internal 96.3%).
- Calibration tests: ECE target <0.05; Brier <0.05.
- Independent V&V planned pre-certification by a recognised test house.

---

## 6. Problem Resolution & Trend Analysis

- All deviations, incidents and overrides logged to the Merkle audit trail.
- Monthly trend review; corrective/preventive action (CAPA) if error rate trends upward.

---

## 7. Maintenance & Retirement

- Defined maintenance plan; backward-compatible model updates with re-validation.
- Retirement plan: 90-day notice, data export, model-retire procedure.

© 2026 SEWA AI — a Storegrill Inc Ltd company · No. 14581073 · info@sewaxai.health
