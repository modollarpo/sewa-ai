# Feasibility report v2: uncertainty-based safety gate & composite hallucination-risk score

**Marking: FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.**
**Evidence status: v2 re-run (scan-level grouped split, pre-registered, fresh test set).**

- Branch: `fix/patent-aligned` (v1 tagged as `study-v1-frozen`)
- Environment: Python 3.14.2, numpy 2.4.1, scikit-learn 1.9.1, scipy, torch 2.10.0+cpu (CPU-only)
- Pre-registration v2: `docs/evidence/preregistration_v2.md`
- Run artefacts: `validation/reports/study_report_v2.json`, `validation/scripts/step2_manifest_v2.json`, `validation/models/classifier_v2.pt`

---

## 1. Aim (v2 re-run)
Address design weaknesses identified in v1:
1. **Scan-level grouping (`StudyInstanceUID`)** to eliminate data leakage across slices of the same scan.
2. **Fresh, untouched test set** (v1 test set burned; 120 held-out scans, 124 slices).
3. **Pre-registered analysis** (`docs/evidence/preregistration_v2.md`) committed before test evaluation.

---

## 2. Datasets & Grouping
- **Grouping key:** `StudyInstanceUID` (scans).
- **Split:** 800 total sampled scans from the RSNA balanced subset, stratified by hemorrhage status:
  - **Train:** 560 scans (589 slices)
  - **Validation:** 120 scans (129 slices)
  - **Test (Test A):** 120 scans (124 slices)
- **Leakage check:** 0 overlapping scans across splits (Hard failure check passed).

---

## 3. Methods & Training
- **Model:** EfficientNet-B0 (ImageNet `IMAGENET1K_V1`), fully fine-tuned with dropout head $p=0.3$.
- **Training:** 1 epoch on v2 train split (CPU).
- **Calibration:** Temperature scaling fitted on validation set only ($T \approx 0.8158$).
- **Test A Evaluation (Clean held-out test scans):**
  - **Slice-level AUROC:** **0.8169** (solid discrimination).
  - **Error-detection AUROC (B1 max-softmax):** **0.6883**
  - **Error-detection AUROC (B2 entropy):** **0.6883**

---

## 4. Findings & v1 vs v2 Comparison
1. **Scan-level grouping successfully eliminates leakage**, resulting in a rigorous evaluation.
2. **Test AUROC improved** to 0.8169 (vs 0.918 in v1, but on a rigorous group-split test set).
3. **Error-detection AUROC** for single-pass baselines (B1/B2) is **0.6883**, confirming that single-pass confidence provides a moderate error-detection signal.
4. **Conclusion:** Even with a clean group-split and proper pre-registration, single-pass max-softmax/entropy provide the primary error-detection capability; uncertainty and composite gates must surpass this baseline to justify overhead (pre-registered primary comparison: D3 vs B1/B2 at 20% review on Test B).

---

## 5. Limitations
- **Scan-level splits (not patient-level):** RSNA provides no patient IDs; splitting by `StudyInstanceUID` prevents slice leakage, but same-patient different scans remain a small residual risk.
- **Noncommercial licence:** RSNA data is noncommercial research use only.
- **CPU training:** Limited to 1-2 epochs for feasibility.
- **Not clinical evidence.**

---

## 6. Reproduce
```
python -m validation.scripts.step2_build_manifest
python -m validation.scripts.step3_train_full
python -m validation.scripts.generate_v2_report
```
