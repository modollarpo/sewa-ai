# SEWA XAI — Deep Patent Claims Audit & Gap Analysis
## Document Audit: `Claims OPI.docx` vs. Current Platform State (GB2609706.3)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
> *For internal IP strategy and patent counsel consultation. Not formal legal advice.*

---

## 1. Document Verified: `Claims OPI.docx`

The document **`Claims OPI.docx`** contains the exact 10 claims filed with the UK Intellectual Property Office (UKIPO) for Application **GB2609706.3** (*"Sovereign Multi-Engine Clinical AI Platform for Automated Diagnostic Triage and Safety Assurance"*), dated March/April 2026.

### Summary of Filed Claims (1–10)
* **Claim 1 (Independent Method)**: Multi-engine orchestration — Ingestion (DICOM/FHIR/HL7), HU windowing, CNN triage (multi-condition + urgency), MC Dropout stochastic forward passes (epistemic uncertainty), VLM 4-section report, 9-layer metacognition engine, multi-channel alert dispatch, and database-level clinician digital signature constraint.
* **Claim 2 (Independent Method)**: 9-layer metacognition safety architecture (Layer 1: Modality plausibility; Layer 2: Urgency consistency; Layer 3: Confidence floors; Layer 4: SHAP coherence; Layer 5: Confidence-uncertainty conflict; Layer 6: Negation detection; Layer 7: Demographic priors; Layer 8: Hallucination risk $\le 0.30$; Layer 9: Binary safe-to-alert).
* **Claim 3 (Independent System)**: Federated learning with differential privacy gradient updates and human approval gate.
* **Claim 4 (Independent Method)**: Automated stroke code activation workflow with simultaneous multi-channel dispatch (Push, WebSocket, HL7 ADT/ORM/ORU) and Grad-CAM/SHAP presentation.
* **Claim 5 (Independent Device)**: Sovereign dual-path deployment — Cloud-native GPU container path + Offline edge INT8 path with Merkle-chained audit log and GSM SMS fallback.
* **Claim 6 (Independent Method)**: Uncertainty-gated mandatory clinical escalation based on epistemic/aleatoric variance independent of confidence and metacognition.
* **Claim 7 (Dependent Method)**: Three-channel CT preprocessing window presets (brain/subdural for head; lung/mediastinal for chest).
* **Claim 8 (Dependent System)**: Immutable audit trail with SHA-256 hash chaining and periodic Merkle tree batch verification across cloud and edge.
* **Claim 9 (Dependent Method)**: Multi-language VLM report generation (English, French, Arabic, Swahili).
* **Claim 10 (Dependent Method)**: Composite hallucination risk score formula (combining SHAP coherence, uncertainty conflict, composite uncertainty, Mahalanobis OOD, and negation detection).

---

## 2. Gap Analysis: Where the Current Codebase Outgrows `Claims OPI.docx`

`Claims OPI.docx` provides strong coverage for the foundational system. However, empirical stress-testing (Tests A through O) and architectural evolution (ADR 004) produced **four major scientific breakthroughs** that are **absent** from the 10 claims:

| Current Claim Element in `Claims OPI.docx` | Empirical Discovery in Codebase | The Unprotected Novel Invention |
|---|---|---|
| **Claim 2 & 6: Heuristic gating** ("minimum confidence floors", "hallucination score $\le 0.30$", "configurable uncertainty threshold") | **Tests B, C, J**: Heuristic thresholds fail on external domain shift (CQ500 FPR was 20.07% at $\tau=0.50$). Only **Split Conformal Risk Control** provides a mathematical guarantee. | **Split Conformal Risk Control with Bounded Clinical Risk ($\text{FNR} \le \alpha$)**: A calibration procedure ($\lambda = 0.0298$) that guarantees the false-negative rate cannot exceed a clinical bound while auto-clearing low-risk studies. |
| **Claim 5 & 7: Static preprocessing & INT8 quantization** (window presets and INT8 inference) | **ADR 004 / Test C.2**: Deploying frozen weights across hospitals causes miscalibration. Feature z-scoring collapses activations. | **Zero-Label AdaBN Domain Adaptation**: Updating *only* batch normalization running statistics ($\mu, \sigma^2$) directly on target scanner distributions without model fine-tuning or annotations. |
| **Claim 4: Grad-CAM spatial attribution** ("presenting AI findings with Grad-CAM, SHAP") | **Test E & E.2**: Standard Grad-CAM has an 11.20% pointing hit rate because high-density skull bone captures activations. | **Masked HiResCAM Attribution**: Element-wise activation mapping constrained by anatomical soft-tissue masks, boosting pointing accuracy from 11.20% to 43.83%–62.16%. |
| **Claim 10: Generic Mahalanobis OOD distance** ("a Mahalanobis out-of-distribution distance") | **ADR 004 / Step 16**: Standard Mahalanobis distance fails ($AUROC = 0.5256$). | **Relative Mahalanobis Distance (RMD)**: Contrasting foreground feature representations against background scanner noise, boosting OOD AUROC to 0.5798. |

---

## 3. Direct Recommendation: Do We Need a Second Patent?

### ⚠️ Critical Finding
Because **GB2609706.3 has not yet been searched or examined**, and the **18-month publication date has not passed** (~October 2027), you have a rare window under UK and international patent law:

1. **You DO NOT need to spend money on a completely separate initial UK patent application today.**
   Filing a completely separate patent would give your new inventions a **priority date of late 2026/2027**, losing the advantage of the **March/April 2026 priority date** established by GB2609706.3.
2. **Instead, you should FILE AN AMENDMENT / ADDITION to GB2609706.3**:
   * Under UKIPO Rules (Rule 19 / s.117 before publication), update the specification to formally incorporate the mathematics and results of Split Conformal Risk Control, Zero-Label AdaBN, and Masked HiResCAM.
   * Add new dependent claims (Claims 11–16).
3. **Consolidate Everything into the PCT International Application before 25 April 2027**:
   * File your international PCT patent application on or before **25 April 2027** claiming priority back to **GB2609706.3**.
   * In the PCT application, include the 10 original claims **plus** the 5 new post-April 2026 claims as an integrated portfolio.

---

## 4. Draft New Claims (To Provide to Your Patent Attorney)

Add these proposed claims as Claims 11–15 to your application:

```text
Claim 11 — Dependent: Split Conformal Risk Control Safety Gate
The method of Claim 1 or Claim 2, wherein the safe-to-alert decision or human escalation 
routing is determined by a split conformal prediction algorithm wherein a risk-controlling 
threshold (λ) is calibrated on a calibration dataset to guarantee that the expected false-negative 
rate (FNR) does not exceed a pre-specified clinical risk tolerance (α), wherein cases falling 
outside the conformal prediction set are mandatorily escalated to qualified human review.

Claim 12 — Dependent: Zero-Label Adaptive Batch Normalisation
The method of Claim 1, further comprising a zero-label domain adaptation step wherein, upon 
deployment to a target clinical imaging environment, running mean and variance statistics of 
batch normalisation layers within the triage engine are updated using unannotated imaging studies 
from the target environment while convolutional weights and linear classification weights remain 
strictly frozen.

Claim 13 — Dependent: Anatomically-Masked HiResCAM Attribution
The method of Claim 4, wherein the spatial attribution is computed using High-Resolution Class 
Activation Mapping (HiResCAM) multiplied element-wise with an automated anatomical parenchymal 
mask, thereby suppressing out-of-tissue calvarial bone activations.

Claim 14 — Dependent: Relative Mahalanobis Distance Out-of-Distribution Gating
The method of Claim 10, wherein the Mahalanobis out-of-distribution distance comprises a 
relative Mahalanobis score computed as the difference between a class-conditional feature 
Mahalanobis distance and a background unconditioned feature Mahalanobis distance.

Claim 15 — Dependent: Physics Perturbation Uncertainty Monotonicity
The method of Claim 6, wherein epistemic uncertainty variance computed across stochastic forward 
passes is constrained to exhibit monotonic non-decreasing behavior with respect to increasing 
high-frequency image acquisition noise or motion blur convolution.
```

---

*Audited against `Claims OPI.docx` · Date: 2026-10-28 · FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.*
