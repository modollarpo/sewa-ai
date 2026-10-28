# Pre-registration: Test H — Continuous Learning Drift Detection Engine

**Status:** FROZEN BEFORE EVALUATION  
**Date:** 2026-10-28  
**Branch:** main  
**Author:** SEWA AI Validation Team  
**Licence:** Internal validation test harness

> **FEASIBILITY ON SIMULATED & SHIFTED DATA. NOT CLINICAL EVIDENCE.**  
> Tests the automated statistical drift alert triggers in `ai-services/continuous-learning/main.py`.

---

## 1. Objective

Validate that the Continuous Learning Service's drift detection engine (`detect_drift` and `compute_feature_drift`):
1. Returns `status: "insufficient_data"` and null metrics when sample size N < 10 (confirming audit requirement R-12/N10 against fabricated metrics).
2. Correctly detects **no drift** (drift_detected=False, severity="none") under an in-distribution simulated stream where AI and human agree (Cohen's kappa > 0.6, PSI < 0.2).
3. Correctly triggers **HIGH severity drift alerts** when scanner or clinician disagreement shifts Cohen's kappa < 0.40.
4. Correctly triggers **feature drift** (modality / body part shift) when PSI exceeds the 0.20 threshold.
5. Processes 100 corrections in < 50 ms CPU latency.

## 2. Test Cases

| Case | Scenario | Expected Outcome |
|---|---|---|
| H.1 | N = 5 corrections (< 10 threshold) | `status: "insufficient_data"`, `kappa: null`, `psi: null`, `drift_detected: false` |
| H.2 | N = 100 concordant corrections (90% agreement) | `drift_detected: false`, `severity: "none"`, `kappa >= 0.70` |
| H.3 | N = 100 discordant corrections (scanner distribution shift, 30% agreement) | `drift_detected: true`, `severity: "high"`, `kappa < 0.40` |
| H.4 | Feature distribution shift (100% CT in baseline -> 80% MRI in recent stream) | `drift_detected: true`, `psi_modality > 0.20` |

## 3. Primary Success Criteria

| Criterion | Target | Type |
|---|---|---|
| Zero-fabrication check (N<10) | Exact `insufficient_data` status + nulls | PASS/FAIL |
| Concordance sensitivity (H.2) | `drift_detected == False` | PASS/FAIL |
| Discordance detection (H.3) | `drift_detected == True`, severity == "high" | PASS/FAIL |
| Feature drift detection (H.4) | `drift_detected == True`, PSI > 0.20 | PASS/FAIL |
| Processing latency | < 50 ms for N=100 | PASS/FAIL |

## 4. Outputs

- `validation/reports/v2a1_testH_drift.json`
- `docs/evidence/feasibility_report_testH_drift.md`
