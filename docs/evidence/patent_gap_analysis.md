# SEWA XAI — Patent Gap Analysis & IP Strategy Assessment
## Existing Filing vs. Novel Technical Contributions (GB2609706.3)

> **FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
> *For internal IP strategy discussion only. Not legal advice — consult a qualified UK patent attorney.*

---

## 1. Existing Filing Overview: GB2609706.3

| Parameter | Detail |
|---|---|
| **Application Number** | GB2609706.3 |
| **Title** | Sovereign Multi-Engine Clinical AI Platform for Automated Diagnostic Triage and Safety Assurance |
| **Filing Date** | 25 April 2026 |
| **Applicant** | STOREGRILL INC LTD |
| **Inventor** | Dolapo Ariyo |
| **Description** | 21 pages |
| **Claims** | 10 claims |
| **Drawings** | Yes |
| **Application Fee Paid** | **No** (Deadline: 25 April 2027) |
| **Request for Search** | **No** (Deadline: 25 April 2027) |
| **Priority Claimed** | None (Initial national UK filing) |
| **WIPO Digital Access Service (DAS)** | Yes (`omodolatan@gmail.com`) |

> [!WARNING]
> **Critical 12-Month Priority & UKIPO Deadlines: 25 April 2027**
> 1. **UKIPO Prosecution**: Under Section 17 of the Patents Act 1977, if the application fee (£130 online) and search request fee (£180 online, Form 9A) are not paid within 12 months (by **25 April 2027**), the application is deemed withdrawn.
> 2. **International PCT / Paris Convention Window**: 25 April 2027 is also the absolute 12-month cutoff to file a PCT (Patent Cooperation Treaty) application or foreign filings (e.g. US, EP) claiming priority from GB2609706.3.

---

## 2. Core Coverage of the April 2026 Filing

The existing provisional filing covers the high-level architecture established up to April 2026:
- Multi-engine diagnostic triage architecture (EfficientNet-B0/B4 backbones for CT Head ICH triage).
- Natural Language Processing (NLP) / metacognition negation engine for radiologist report contradiction detection.
- Sovereign cloud infrastructure (UK South / Sweden Central Azure AKS containerized microservices).
- Multi-modal support design (Head CT, CXR, CTPA, Mammography, Retinal).
- Mandatory database-layer human-in-the-loop sign-off enforcement.

---

## 3. High-Priority Novel Additions (Post-April 2026)

Since April 2026, rigorous empirical evaluations (Tests A through O) and architectural innovations (ADR 004) produced novel methods that may sit outside the scope of the original 10 claims:

| Novel Innovation | First Evaluated | Technical Distinction & Patentability |
|---|---|---|
| **Split Conformal Risk Control with Guaranteed FNR $\le 5\%$** | Tests B, C, J | Novel statistical calibration procedure ($\lambda = 0.0298$) guaranteeing bounded clinical risk with auto-clearing of true normals. |
| **Zero-Label AdaBN Domain Adaptation** | ADR 004, Test C.2 | Site-adaptive moment alignment updating frozen BatchNorm running statistics on target NHS scanner distributions with 0 annotations. |
| **Relative Mahalanobis Distance (RMD) OOD Detection** | ADR 004, Test C.2 | Background-relative Mahalanobis distance scoring out-of-distribution scanner artifacts and foreign bodies. |
| **Masked HiResCAM Attribution** | Test E.2 | Anatomically masked class activation mapping eliminating calvarial bone artifacts in acute neuroimaging. |
| **Physics-Informed Dual Uncertainty Monotonicity** | Test K | Epistemic vs. aleatoric Monte Carlo uncertainty decomposition with guaranteed monotonicity under noise/motion blur perturbations. |

---

## 4. Direct Answer: Do We Need to File Another Patent?

**Short Answer: You do NOT necessarily need an entirely disconnected new patent right now, BUT you MUST take immediate action on GB2609706.3 to protect your post-filing innovations:**

1. **Option 1 (Recommended — Consolidate via Rule 19 & PCT)**:
   - **Step 1**: Pay the UKIPO application fee (£130) and search request (£180) for GB2609706.3 prior to **25 April 2027**.
   - **Step 2**: File an amendment/supplement under Rule 19 / s.117 incorporating the formal mathematical descriptions of Split Conformal Risk Control, Zero-Label AdaBN, and Masked HiResCAM before the 18-month publication date (~October 2027).
   - **Step 3**: File a single **PCT International Application** on or before **25 April 2027** claiming priority from GB2609706.3, incorporating the full 7-layer defense claim structure.
2. **Option 2 (Divisional or Standalone Improvement Patent)**:
   - If the original specification of GB2609706.3 does not contain sufficient basis for conformal prediction or adaptive batch norm, file a **Patent of Addition or Second Standalone UK Patent Application** specifically claiming:
     *"A computer-implemented method for statistical risk bounding and zero-label domain adaptation in emergency radiological triage."*

---

## 5. Strongest Integrated Method Claim (For Patent Counsel Review)

```text
1. A computer-implemented method for safe triage of medical diagnostic imaging studies, comprising:
   (a) receiving an unannotated digital medical image from an edge acquisition device at a clinical site;
   (b) adapting batch normalisation running statistics of a deep neural network feature extractor using 
       the unannotated digital medical image without updating trained model weights;
   (c) computing an out-of-distribution (OOD) score using a relative Mahalanobis distance against a pre-computed 
       target-site foreground representation;
   (d) calculating a split conformal risk control prediction set using an empirical quantile threshold (λ) 
       calibrated to enforce a guaranteed upper bound on the false negative rate (FNR ≤ α);
   (e) decomposing prediction uncertainty into epistemic uncertainty via Monte Carlo dropout and aleatoric 
       uncertainty via predictive entropy;
   (f) generating an explainable spatial saliency map via feature-weighted activation mapping bounded by 
       an automated anatomical soft tissue mask; and
   (g) dispatching a prioritised clinical alert to a PACS worklist only upon satisfaction of the conformal risk bound, 
       wherein confirmation of a diagnostic finding requires cryptographic consultant radiologist sign-off 
       persisted in a tamper-evident audit ledger.
```

---

*Document: `docs/evidence/patent_gap_analysis.md` · Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.*
