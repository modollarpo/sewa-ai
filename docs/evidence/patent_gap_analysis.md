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

## 3. UK Added-Matter Rules (Section 76(2) Patents Act 1977) — Critical Legal Reality

> [!CAUTION]
> **You CANNOT simply amend the existing GB2609706.3 description to add new inventions!**
> Under **Section 76(2) of the UK Patents Act 1977** (and European Patent Convention **Article 123(2)**):
> *"No amendment of an application for a patent shall be allowed... if it results in the application disclosing matter extending beyond that disclosed in the application as filed."*

### Why an Amendment or Divisional Cannot Add Post-Filing Inventions:
1. **The *Bonzel* Test (*Bonzel v Intervention Products [1991] RPC 553*)**:
   Under UK case law, an examiner or court compares the application as filed against the proposed amendment. If the amendment discloses technical information not **directly and unambiguously derivable** from the original 21-page specification, it is void for **added matter**.
2. **Text Audit of GB2609706.3**:
   A string audit of `Claims OPI.docx` confirms that the terms `conformal`, `adabn`, `adaptive batch`, `hirescam`, and `relative mahalanobis` appear **zero times** in the application as filed on 25 April 2026.
3. **Divisional Applications (Section 15(4))**:
   Section 76(1) applies equally to divisionals. A divisional cannot introduce subject-matter that extends beyond the parent application as filed.

---

## 4. The Legally Valid Pathway: Priority Under Section 5(2) & Paris Convention

Because Section 76(2) prohibits adding matter to GB2609706.3, the **only legally valid mechanism** to protect the post-April 2026 breakthroughs while retaining your April 2026 priority date is **filing a NEW application claiming priority under Section 5(2) / Paris Convention Art. 4**:

```
                       ┌──────────────────────────────────────────────┐
                       │ GB2609706.3 Filed: 25 April 2026             │
                       │ (Core: 4 Engines, 9-Layer Metacognition,     │
                       │  Sovereign Edge, MC Dropout, Claims 1-10)    │
                       └──────────────────────┬───────────────────────┘
                                              │
                      Within 12-Month Window  │ (Deadline: 25 April 2027)
                      Paris Convention Art. 4 │ Patents Act 1977 s.5(2)
                                              ▼
          ┌──────────────────────────────────────────────────────────────────┐
          │ NEW APPLICATION (PCT or 2nd UK Application) Filed by 25 Apr 2027  │
          │ Contains: GB2609706.3 Disclosure + New Inventions                │
          │ (Split Conformal Risk, Zero-Label AdaBN, Masked HiResCAM, RMD)   │
          └───────────────────────────────┬──────────────────────────────────┘
                                          │
            ┌─────────────────────────────┴─────────────────────────────┐
            ▼                                                           ▼
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│ Claims 1–10 (Foundational System)    │    │ Claims 11–15 (Post-Filing Additions) │
│ Priority Date: 25 April 2026         │    │ Priority Date: April 2027 (Filing)   │
│ Protected against post-2026 art      │    │ Protected under split-priority       │
└──────────────────────────────────────┘    └──────────────────────────────────────┘
```

### The Two Strategic Options Available:

#### Option 1: Dual UK Prosecution + International PCT (Recommended)
1. **Maintain GB2609706.3**: Pay the £130 application fee and £180 search fee before **25 April 2027**. Prosecute Claims 1–10 as filed to obtain an early granted UK patent on the foundational platform.
2. **File a 2nd UK Patent Application (or PCT)** before **25 April 2027**:
   * File a new patent application disclosing the complete system (GB2609706.3 disclosure **plus** the complete technical specifications and test evidence for Conformal Risk Control, Zero-Label AdaBN, and Masked HiResCAM).
   * Formally claim priority from GB2609706.3 under Section 5(2).
   * **Result under Partial Priority (s.5 / EPC Art. 88)**: The core system retains its senior priority date of **25 April 2026**, while the new statistical gating and adaptation methods receive their own filing priority date.

#### Option 2: Consolidate Directly into a PCT Application before 25 April 2027
* File a single international PCT application before **25 April 2027** claiming priority from GB2609706.3.
* The PCT specification includes both the original 21-page disclosure and the new technical chapters.
* GB2609706.3 can either be kept alive to grant in the UK or allowed to lapse once the PCT enters the UK national phase at 30/31 months.

---

## 5. Public Disclosure & Novelty Warning

> [!WARNING]
> **Prior Public Disclosure Destroys Patentability for New Matter!**
> Because the new matter (Conformal Risk Control $\lambda = 0.0298$, Zero-Label AdaBN, Masked HiResCAM) will have an **April 2027 priority date**, any enabling public disclosure made **before that new filing** is novelty-destroying under **Section 2(2) Patents Act 1977**:
> - Public git repositories with full mathematical formulas or open-source implementations.
> - Published academic papers or preprints (arXiv/medRxiv) detailing the exact algorithms.
> - Unprotected conference presentations or marketing materials disclosing the technical mechanism.
>
> **Action**: Ensure all code, test reports, and technical descriptions of the post-April 2026 algorithms remain protected by confidentiality/commercial terms or file the second UK application **immediately** before publishing any research paper.

---

## 6. Draft New Claims (To Provide to Your Patent Attorney)

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
