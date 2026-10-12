# Pre-registration v2: external evaluation of the composite hallucination-risk gate (RSNA v2 + CQ500 Test C)

**Status:** FROZEN before any v2 test evaluation.
**Branch:** `fix/patent-aligned` (commit containing this prereg: `git log -1 -- docs/evidence/preregistration_v2.md`)
**Marking:** FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

---

## 1. Aim
Fix the methodological weaknesses of v1 (which used slice-level splits rather than scan-level grouping, tested OOD on in-distribution data, and made post-hoc amendments) by pre-registering a rigorous v2 re-run with:
1. **Scan-level grouping (`StudyInstanceUID`)** to prevent data leakage between slices of the same CT scan.
2. **Fresh test set discipline** (v1 test set burned; fresh held-out test set A).
3. **Shifted test set (Test B)** with synthetic corruptions (Gaussian noise, blur, simulated low-dose) to properly evaluate the OOD signal.
4. **Comprehensive arm comparisons** (baselines B1/B2, signals C1-C4, composite variants D1-D3, leave-one-out ablations E).

---

## 2. Datasets & Grouping
- **Development / Train / Val / Test (Test A):** RSNA 2019 Brain CT Hemorrhage (Kaggle). 
  - **Grouping key:** `StudyInstanceUID` (extracted from DICOM headers via cached stage metadata).
  - **Sample size:** 800 scans sampled from the 2,000-image balanced subset, stratified by whether any slice is hemorrhage-positive (`label_any == 1`).
  - **Splits:** 70% train (560 scans), 15% validation (120 scans), 15% test (120 scans), seed 42. Up to 32 slices per scan.
  - **Leakage verification:** Hard failure if any `StudyInstanceUID` appears in more than one split (0 overlapping scans verified).
- **Test B (Synthetic Shift):** The held-out test set (120 scans) corrupted at test time across three severity levels:
  - Gaussian noise ($\sigma \in \{0.05, 0.10, 0.20\}$)
  - Gaussian blur ($\sigma \in \{1.0, 2.0, 4.0\}$)
  - Simulated low-dose (Poisson noise injection)
- **Test C (External Validation - Optional):** CQ500 (Qure.ai), 491 scans staged in Azure blob container `cq500` under licence CC BY-NC-SA 4.0 (noncommercial + share-alike). Evaluated only if approved.

---

## 3. Frozen Model & Calibration
- **Model:** EfficientNet-B0 (ImageNet `IMAGENET1K_V1`), fully fine-tuned on CPU (batch 8, 12 epochs). Genuine MC dropout in the head.
- **Study-level aggregation score:** Mean of the model's slice probabilities for the top-3 highest-scoring slices of the scan (frozen rule).
- **Calibration:** Temperature scaling fitted on the **validation set only**, applied to single-pass probabilities before thresholding.

---

## 4. Evaluated Signals & Arms
- **C1 uncertainty:** MC dropout ($N=20$), epistemic = $\text{Var}(p)$, aleatoric = mean $p(1-p)$, $U = 0.6\text{epistemic} + 0.4\text{aleatoric}$.
- **C2 OOD:** Class-conditional Mahalanobis distance on the penultimate embedding, shrinkage covariance ($\gamma=0.05$), fit on training data only.
- **C3 attribution coherence (proxy):** Grad-CAM mass inside an intracranial mask built from the brain window with an HU threshold.
- **C4 conflict:** Confidence $\times$ normalized uncertainty $U$.
- **Arms:**
  - A: No gate
  - B1: Max-softmax baseline
  - B2: Entropy baseline
  - C1, C2, C3 (proxy), C4 alone
  - D1: Composite of C1 + C4
  - D2: Composite of C1 + C2 + C4 (including OOD)
  - D3: Composite of all evaluated signals (C1 + C2 + C3 + C4)
  - E: Leave-one-out ablations (e.g., D3 without C2, etc.)
- **Composite weights:** Learned via logistic regression (class-balanced) on the **validation set only**, then frozen.
- **Review rates:** 5%, 10%, 20%, 30%.

---

## 5. Primary Comparison & Success Criteria
- **Primary comparison:** Composite D3 versus the better of baselines B1 and B2, at the **20% review rate**, on **Test B (Shifted data)**, measuring the rate of wrong predictions accepted without review (unsafe-accepted).
- **Success criterion:** At least **20% relative reduction** in unsafe-accepted outputs compared to the better baseline, with the **95% bootstrap confidence interval excluding zero**.
- **Multiple comparison correction:** Holm correction applied across review rates for the primary comparison.
- **Power analysis:** Bootstrap on validation data confirms sufficient power for detecting a 20% reduction at $N=120$ test scans.

---

## 6. Pre-registration Commit Rule
This pre-registration (`docs/evidence/preregistration_v2.md`) is committed to the repository **before** any evaluation on the test sets A, B, or C. Any subsequent metric tuning, formula modification, or post-hoc arm addition will be explicitly logged as "post-hoc, exploratory".
