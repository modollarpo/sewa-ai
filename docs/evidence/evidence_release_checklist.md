# SEWA XAI — Final Evidence-Release Verification Checklist

> **MARKING: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**  
> **Status:** Public wording frozen at commit `80c136c`.  
> **Date:** 29 October 2026  
> **Governing Protocol:** Pre-clinical Feasibility Assessment & Regulatory Compliance Audit  

---

## 1. Executive Summary & Objective

This document establishes the **final evidence-release verification checklist** for SEWA XAI. In accordance with clinical governance guidelines, the user-facing text and public evidence pages are **frozen** at commit `80c136c`. 

The objective of this checklist is to separate public wording from technical verification:
1. Map every substantive claim to its underlying dataset, code artifact, and mathematical formulation.
2. Define the exact verification test required to close each open item.
3. Distinguish **achieved retrospective engineering feasibility (TRL 5)** from **planned prospective clinical evaluation (TRL 6)**.
4. Keep **statutory patent readiness** distinct from **scientific evidence readiness**.

---

## 2. Verification Checklist Matrix

| # | Domain / Claim | Underlying Artifact / Dataset | Target Metric / Result | Required Verification Test | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Conditional FNR Calibration Bound** | CQ500 Calibration ($n=100$, $n_{\text{pos}}=40$) | Bound $\frac{2}{41} \approx 4.88\% \le 0.05$ | Independent statistical peer-review of Bates et al. (2021) Theorem 1 applied to conditional positive subspace | **PROVISIONALLY REPORTED (CAVEAT ACTIVE)** |
| **2** | **Retrospective Holdout FNR** | CQ500 Holdout ($N=386$, $N_{\text{pos}}=162$) | Observed FNR $3.70\%$ (6/162) @ $\lambda=0.0298$; $6.79\%$ (11/162) @ $\lambda=0.0753$ | Reproducible study-level script `conformal_reconciliation_audit.py` | **VERIFIED & AUDITED** |
| **3** | **SAH Subtype Provenance & Protocol** | CQ500 External Cohort ($N=486$; $N_{\text{SAH}}=118$) | Recall $88.1\%$ (104/118) @ $\lambda=0.0298$ (Zero-Label AdaBN) | Audit of 4-question protocol (selection, overlap, threshold timing, decision rule) via `step18_ich_subtypes_evaluation.py` | **VERIFIED & DOCUMENTED** |
| **4** | **Classifier Gate Auto-Clear Routing** | CQ500 Holdout ($N=386$) | 33 auto-cleared (27 TNs, 6 FNs); 0 secondary interceptions measured | Full study routing audit via `conformal_routing_table.csv` | **DISCLOSED HONESTLY** |
| **5** | **Multi-Gate FN Safety Interception** | 6 missed positive scans (`CQ500-CT-385`, `415`, `278`, `426`, `196`, `43`) | Measure whether OOD (Layer 1) or Epistemic (Layer 2) intercept the 6 FNs | Execute multi-gate simulation script `audit_fn_safety_interception.py` | **PENDING EXECUTION** |
| **6** | **Transductive AdaBN Setting** | CQ500 ($N=486$ unlabelled CT scans) | Target AUROC $0.7596$ (+0.0105 gain) | Document that all 486 scans contributed unlabelled images to running BatchNorm moments | **DISCLOSED & LABELED** |
| **7** | **Maturity & TRL 5 vs TRL 6** | Frontend pages & API responses | TRL 5 Pre-clinical current; TRL 6 target prospective | Full-repo regex audit for stale claims of achieved TRL 6 or clinical validation | **VERIFIED & FROZEN** |
| **8** | **Patent Priority & Claims Boundaries** | GB2609706.3 (25 April 2026) vs Application 2 (Oct 2026) | Senior priority Claims 1–10; filing date priority Claims 11–20 | Patent attorney formal review under UK Patents Act 1977 s.5(2) and s.76(2) | **SUBMISSION-READY FOR COUNSEL** |

---

## 3. Detailed Verification Items

### Item 1: Conditional-Risk Calibration Bound (4.88%)
- **Mathematical Form:**
  $$\text{bound}_{\text{cond}} = \frac{n_{\text{pos}}}{n_{\text{pos}} + 1} R_{n_{\text{pos}}}(\lambda) + \frac{1}{n_{\text{pos}} + 1} = \frac{40}{41}\left(\frac{1}{40}\right) + \frac{1}{41} = \frac{2}{41} \approx 4.88\% \le 0.05$$
- **Verification Question:** Does the finite-sample expectation bound from Bates et al. (2021) Theorem 1 hold identically when the sample space is conditioned on the positive label $Y=1$, and does it cover the data-dependent threshold selection $\lambda = \sup\{\lambda' : \text{bound} \le \alpha\}$ without union-bound or PAC-style $(1-\delta)$ probability penalty?
- **Action Required:** Commission a dedicated statistical review note by a qualified statistician. Until that review is completed, maintain the public disclaimer that the bound is evaluated under specified exchangeability assumptions and is under formal review.

---

### Item 2: SAH Subtype Provenance & Evaluation Protocol
The reported $88.1\%$ sensitivity ($104/118$ studies) on Subarachnoid Haemorrhage is closed against the following four provenance criteria:
1. **Cohort Selection & Labeling:** The 118 cases originate from the 486-scan CQ500 dataset where consensus expert radiologist annotations (BHX dataset) identified acute subarachnoid blood.
2. **Overlap with AdaBN Cohort:** The 118 SAH scans are an exact subset of the 486 scans whose unlabelled pixel streams were used to re-estimate running batch normalization statistics ($\mu, \sigma^2$).
3. **Threshold Selection Timing:** The escalation threshold $\lambda = 0.0298$ was fixed *a priori* from the binary ICH calibration split ($n=100$) and was **not** fit or tuned on the SAH cohort.
4. **Decision Rule & Configuration:** Evaluated using frozen `classifier_v2a1.pt` with top-k slice-to-study max pooling under transductive AdaBN adaptation:
   - At $\tau = 0.50$: Sensitivity $= 41.5\%$ ($49/118$).
   - At $\tau = 0.30$: Sensitivity $= 66.1\%$ ($78/118$).
   - At $\lambda = 0.0298$: Sensitivity $= 88.1\%$ ($104/118$ studies, 95% CI: $[81.1\%, 92.8\%]$).

---

### Item 3: Operational Routing of the Six False Negatives
- **Single-Gate Classifier Outcome:** In the retrospective single-gate threshold evaluation at $\lambda = 0.0298$, all 33 scans scoring $< 0.0298$ (27 true negatives, 6 false negatives) were marked for auto-clearing.
- **Specific Study IDs of False Negatives:**
  1. `CQ500-CT-385` (score $0.009621$)
  2. `CQ500-CT-415` (score $0.004481$)
  3. `CQ500-CT-278` (score $0.002455$)
  4. `CQ500-CT-426` (score $0.006272$)
  5. `CQ500-CT-196` (score $0.001659$)
  6. `CQ500-CT-43`  (score $0.021809$)
- **Action Required:** Author and run `validation/scripts/audit_fn_safety_interception.py` to test whether Layer 1 (Relative Mahalanobis OOD distance $> \tau_{\text{ood}}$) or Layer 2 (Monte Carlo Dropout epistemic variance $> \tau_{\text{epi}}$) would have escalated these 6 specific cases. Disclose the empirical catch count transparently.

---

### Item 4: Repository & Deployed Public Page Consistency
- **Audit Findings:**
  - `ClinicalEvidencePage.tsx`: Conformal calibration bound qualified, 6 false negatives explicitly disclosed as passed by classifier gate, SAH metrics separated, transductive AdaBN disclosed.
  - `LandingPage.tsx`: Phase 2 marked as `Technical Benchmarking (Tests A–O) — Completed (TRL 5)`; Phase 3 marked as `Prospective NHS Shadow-Mode — Planned (Target: TRL 6)`.
  - `DoctorDashboard.tsx`: Attributions explicitly marked as demo/synthetic path without clinically validated weights.
  - `build`: Verified clean production build via Vite (`npm --prefix frontend run build` exited with code 0).
- **Status:** **FROZEN & CONSISTENT**.

---

### Item 5: Patent Readiness vs. Scientific Evidence Ledger
- **Legal Priority Separation:**
  - **GB2609706.3 (Filing Date: 25 April 2026):** Establishes senior priority for core multi-engine platform architecture, 9-layer metacognition, and radiologist sign-off workflow (Claims 1–10).
  - **Second Application (Filing Target: on or before 25 April 2027):** Claims priority under Patents Act 1977 s.5(2) / Paris Convention Art 4. Split priority applies to Claims 11–20 covering empirical innovations (Split Conformal Risk Control FNR $\le \alpha$, Zero-Label AdaBN, Relative Mahalanobis OOD, Masked HiResCAM).
- **Formal Submission Assets Generated:**
  - Specification & Claims DOCX: `docs/patent/UK_Patent_Application_2_Specification_and_Claims.docx`
  - Specification & Claims PDF: `docs/patent/UK_Patent_Application_2_Specification_and_Claims.pdf`
  - Master Consolidated PDF with Drawings FIG 1–8: `docs/patent/UK_Patent_Application_2_With_Drawings.pdf`
- **Action Required:** Transmit formal portfolio to patent attorney for added-matter and priority-claim sign-off.
