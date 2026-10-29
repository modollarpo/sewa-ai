"""Multi-Gate Safety Interception Audit for the 6 False-Negative Studies.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Purpose
-------
The classifier-only conformal gate at lambda=0.0298 auto-cleared 33 CQ500
studies, of which 6 were false negatives (ground-truth ICH, score < 0.0298).
This script asks: would the secondary safety gates — Relative Mahalanobis OOD
scoring (C2) and MC-Dropout epistemic uncertainty (C1) — have escalated any
of those 6 studies to human review?

The evaluation is a SEPARATE, retrospective analysis performed AFTER the
classifier gate evaluation. It does NOT change the reported classifier-gate
FNR of 3.70% (6/162). It is intended to characterise the multi-gate
architecture's theoretical coverage, not to claim a lower FNR.

Methodology
-----------
1. Load the frozen classifier_v2a1.pt checkpoint.
2. Fit the Relative Mahalanobis OOD detector on train features (same
   procedure as step16_test_adabn_relmahal.py).
3. Compute per-slice penultimate features for all CQ500 slices using the
   late sub-network (no AdaBN — using the base model as the OOD reference).
4. Compute study-level OOD score (mean of top-3 slices by classifier prob).
5. Compute per-slice epistemic variance via MC-Dropout (N=30 passes).
6. Compute study-level epistemic score (mean of top-3 slices).
7. Determine escalation thresholds:
   - OOD threshold tau_ood: 95th percentile of OOD scores on the 27
     true-negative auto-cleared studies (conservative: any score exceeding
     the distribution of confirmed TN auto-cleared scans triggers review).
   - Epistemic threshold tau_epi: 95th percentile of epistemic variance on
     the same 27 TN auto-cleared studies.
8. For each of the 6 FN studies, report:
   - Classifier score s(X)
   - OOD score and whether it exceeds tau_ood
   - Epistemic variance and whether it exceeds tau_epi
   - Whether the study would have been escalated by either gate
9. Write results to:
   - validation/reports/v2a1_fn_safety_interception.json
   - docs/evidence/feasibility_report_fn_safety_interception.md
"""
from __future__ import annotations

import copy
import json
import math
import sys
import time
from pathlib import Path
from typing import Dict, List, Any

import numpy as np
import torch
import torch.nn as nn

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "validation" / "scripts"))

import v2_study as VS
import v2_lib as L

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
CKPT = ROOT / "validation" / "models" / "classifier_v2a1.pt"
REPORTS = ROOT / "validation" / "reports"
DOCS = ROOT / "docs" / "evidence"
LAMBDA_CRC = 0.0298
MC_PASSES = 30
TOPK = 3

# The 6 FN study IDs confirmed from conformal_routing_table.csv at lambda=0.0298
FN_STUDY_IDS = [
    "CQ500-CT-385",  # score=0.009621
    "CQ500-CT-415",  # score=0.004481
    "CQ500-CT-278",  # score=0.002455
    "CQ500-CT-426",  # score=0.006272
    "CQ500-CT-196",  # score=0.001659
    "CQ500-CT-43",   # score=0.021809
]

# Classifier scores for the 6 FN studies (from routing table)
FN_CLASSIFIER_SCORES = {
    "CQ500-CT-385": 0.009621,
    "CQ500-CT-415": 0.004481,
    "CQ500-CT-278": 0.002455,
    "CQ500-CT-426": 0.006272,
    "CQ500-CT-196": 0.001659,
    "CQ500-CT-43":  0.021809,
}


def wilson_ci(k: int, n: int) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    z = 1.95996
    p = k / n
    denom = 1.0 + z**2 / n
    centre = (p + z**2 / (2 * n)) / denom
    spread = z * math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n) / denom
    return max(0.0, centre - spread), min(1.0, centre + spread)


class RelativeMahalanobis:
    """Relative Mahalanobis OOD detector (identical to step16 implementation)."""

    def __init__(self, shrinkage: float = 0.05):
        self.shrinkage = shrinkage

    def fit(self, feats: np.ndarray, y: np.ndarray) -> "RelativeMahalanobis":
        feats = np.asarray(feats, float)
        y = np.asarray(y)
        d = feats.shape[1]
        self.means = {c: feats[y == c].mean(axis=0) for c in (0, 1)}
        self.mean_bg = feats.mean(axis=0)

        cov = np.zeros((d, d), dtype=float)
        for c in (0, 1):
            f = feats[y == c]
            fc = f - self.means[c]
            cov += fc.T @ fc
        cov /= max(len(feats) - 2, 1)
        cov = (1 - self.shrinkage) * cov + self.shrinkage * np.trace(cov) / d * np.eye(d)
        self.prec = np.linalg.pinv(cov)

        diff_bg = feats - self.mean_bg
        cov_bg = (diff_bg.T @ diff_bg) / max(len(feats) - 1, 1)
        cov_bg = (1 - self.shrinkage) * cov_bg + self.shrinkage * np.trace(cov_bg) / d * np.eye(d)
        self.prec_bg = np.linalg.pinv(cov_bg)
        return self

    def score(self, feats: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Returns (standard_mahal, relative_mahal) per row."""
        feats = np.asarray(feats, float)
        dist_c = np.full(len(feats), np.inf)
        for c in (0, 1):
            diff = feats - self.means[c]
            m = np.sum((diff @ self.prec) * diff, axis=1)
            dist_c = np.minimum(dist_c, m)
        diff_bg = feats - self.mean_bg
        dist_bg = np.sum((diff_bg @ self.prec_bg) * diff_bg, axis=1)
        return np.sqrt(np.clip(dist_c, 0, None)), dist_c - dist_bg


def run_audit() -> None:
    print(MARK)
    print("=" * 80)
    print("Multi-Gate Safety Interception Audit — 6 False-Negative Studies")
    print(f"Lambda = {LAMBDA_CRC}  |  MC Passes = {MC_PASSES}")
    print("=" * 80)
    t0 = time.time()

    # ------------------------------------------------------------------ [1] Load model
    print("\n[1/6] Loading classifier_v2a1.pt ...")
    model, early, late, T = VS.load_model(str(CKPT))
    print(f"      Temperature T = {T:.4f}")

    # ------------------------------------------------------------------ [2] Load caches
    print("\n[2/6] Loading feature caches ...")
    train_feats, train_ids, train_studies, train_labels = VS.load_cache("train")
    cq_feats, cq_ids, cq_studies, cq_labels = VS.load_cache("cq500")
    print(f"      Train: {train_feats.shape} slices  |  CQ500: {cq_feats.shape} slices")

    # ------------------------------------------------------------------ [3] Penultimate features
    print("\n[3/6] Computing penultimate features ...")
    pen_train, log_train = VS._penult_logits(model, late, train_feats)
    pen_cq, log_cq = VS._penult_logits(model, late, cq_feats)
    f_train = pen_train.numpy()
    f_cq = pen_cq.numpy()

    p_cq_raw = torch.softmax(log_cq, 1)[:, 1].numpy()
    print(f"      CQ500 slice probs computed. Shape: {p_cq_raw.shape}")

    # Study-level classifier scores (top-3 aggregation)
    study_list, study_probs = L.aggregate_topk(cq_studies, p_cq_raw, p_cq_raw)
    study_labels_dict = L.study_labels(cq_studies, cq_labels)
    study_y = np.array([study_labels_dict[s] for s in study_list])
    study_idx = {s: i for i, s in enumerate(study_list)}

    # ------------------------------------------------------------------ [4] OOD scoring
    print("\n[4/6] Fitting Relative Mahalanobis OOD detector on train set ...")
    rm = RelativeMahalanobis(shrinkage=0.05).fit(f_train, train_labels)
    print("      OOD detector fitted.")

    _, rel_ood_slice = rm.score(f_cq)  # per-slice relative Mahalanobis distance
    # Study-level: mean of top-3 slices by classifier prob
    _, study_rel_ood = L.aggregate_topk(cq_studies, p_cq_raw, rel_ood_slice)

    # ------------------------------------------------------------------ [5] Epistemic uncertainty
    print(f"\n[5/6] Computing MC-Dropout epistemic variance ({MC_PASSES} passes) ...")
    _, epi_cq, _ = L.mc_head(model.classifier, pen_cq, n=MC_PASSES)
    # Study-level: mean of top-3 slices by classifier prob
    _, study_epi = L.aggregate_topk(cq_studies, p_cq_raw, epi_cq)
    print(f"      Epistemic variance computed for {len(study_epi)} studies.")

    # ------------------------------------------------------------------ [6] Thresholds
    print("\n[6/6] Determining escalation thresholds from TN auto-cleared studies ...")

    # Identify auto-cleared studies at lambda=0.0298: score < lambda
    auto_cleared_mask = study_probs < LAMBDA_CRC
    tn_auto_cleared_mask = auto_cleared_mask & (study_y == 0)
    fn_auto_cleared_mask = auto_cleared_mask & (study_y == 1)

    n_auto_cleared = int(np.sum(auto_cleared_mask))
    n_tn_auto = int(np.sum(tn_auto_cleared_mask))
    n_fn_auto = int(np.sum(fn_auto_cleared_mask))

    print(f"      Auto-cleared studies at lambda={LAMBDA_CRC}: {n_auto_cleared} "
          f"({n_tn_auto} TN, {n_fn_auto} FN)")

    tn_ood_scores = study_rel_ood[tn_auto_cleared_mask]
    tn_epi_scores = study_epi[tn_auto_cleared_mask]

    # Conservative threshold: 95th percentile of TN auto-cleared distribution
    # Any FN study scoring above this is flagged as anomalously high risk
    tau_ood_p95 = float(np.percentile(tn_ood_scores, 95)) if len(tn_ood_scores) > 0 else np.inf
    tau_epi_p95 = float(np.percentile(tn_epi_scores, 95)) if len(tn_epi_scores) > 0 else np.inf

    # Also record median and mean of TN distribution for context
    tn_ood_median = float(np.median(tn_ood_scores)) if len(tn_ood_scores) > 0 else np.nan
    tn_ood_mean = float(np.mean(tn_ood_scores)) if len(tn_ood_scores) > 0 else np.nan
    tn_epi_median = float(np.median(tn_epi_scores)) if len(tn_epi_scores) > 0 else np.nan
    tn_epi_mean = float(np.mean(tn_epi_scores)) if len(tn_epi_scores) > 0 else np.nan

    print(f"      OOD threshold (95th pctl of {n_tn_auto} TN auto-cleared): tau_ood = {tau_ood_p95:.4f}")
    print(f"      Epi threshold (95th pctl of {n_tn_auto} TN auto-cleared): tau_epi = {tau_epi_p95:.6f}")

    # ------------------------------------------------------------------ [7] Per-FN audit
    print("\n" + "-" * 80)
    print("PER-STUDY AUDIT RESULTS")
    print("-" * 80)
    print(f"{'Study ID':<20} {'Score':>8} {'OOD':>10} {'OOD>τ':>6} {'Epi':>12} {'Epi>τ':>6} {'Escalated':>10}")
    print("-" * 80)

    fn_results: List[Dict[str, Any]] = []
    n_escalated_by_ood = 0
    n_escalated_by_epi = 0
    n_escalated_by_either = 0
    n_escalated_by_both = 0

    for sid in FN_STUDY_IDS:
        if sid not in study_idx:
            print(f"WARNING: {sid} not found in study list — skipping")
            continue
        i = study_idx[sid]
        clf_score = float(study_probs[i])
        ood_score = float(study_rel_ood[i])
        epi_score = float(study_epi[i])

        ood_flagged = ood_score > tau_ood_p95
        epi_flagged = epi_score > tau_epi_p95
        escalated = ood_flagged or epi_flagged

        if ood_flagged:
            n_escalated_by_ood += 1
        if epi_flagged:
            n_escalated_by_epi += 1
        if escalated:
            n_escalated_by_either += 1
        if ood_flagged and epi_flagged:
            n_escalated_by_both += 1

        flag_str = "YES" if escalated else "no"
        print(f"{sid:<20} {clf_score:>8.6f} {ood_score:>10.4f} {str(ood_flagged):>6} "
              f"{epi_score:>12.8f} {str(epi_flagged):>6} {flag_str:>10}")

        fn_results.append({
            "study_id": sid,
            "ground_truth_y": 1,
            "classifier_score_s": clf_score,
            "classifier_below_lambda": clf_score < LAMBDA_CRC,
            "ood_score_relative_mahal": ood_score,
            "ood_threshold_tau_p95": tau_ood_p95,
            "ood_flagged": bool(ood_flagged),
            "epistemic_variance": epi_score,
            "epistemic_threshold_tau_p95": tau_epi_p95,
            "epistemic_flagged": bool(epi_flagged),
            "would_escalate_by_either_gate": bool(escalated),
            "would_escalate_by_both_gates": bool(ood_flagged and epi_flagged),
        })

    print("-" * 80)
    print(f"\nSUMMARY:")
    print(f"  FN studies evaluated:        {len(fn_results)}")
    print(f"  Escalated by OOD gate only:  {n_escalated_by_ood}")
    print(f"  Escalated by Epi gate only:  {n_escalated_by_epi}")
    print(f"  Escalated by EITHER gate:    {n_escalated_by_either} / {len(fn_results)}")
    print(f"  Escalated by BOTH gates:     {n_escalated_by_both} / {len(fn_results)}")
    print(f"  NOT escalated by any gate:   {len(fn_results) - n_escalated_by_either} / {len(fn_results)}")

    # ------------------------------------------------------------------ [8] Save JSON
    output = {
        "marking": MARK,
        "title": "Multi-Gate Safety Interception Audit — 6 FN Studies at lambda=0.0298",
        "audit_scope": (
            "This is a SEPARATE retrospective analysis. The classifier-gate FNR of "
            "3.70% (6/162 positive holdout studies) is unchanged. This audit assesses "
            "whether secondary OOD and epistemic gates would have escalated the 6 FN "
            "studies in a hypothetical multi-gate evaluation. The two gates were NOT "
            "evaluated jointly in the original conformal calibration."
        ),
        "lambda_crc": LAMBDA_CRC,
        "mc_dropout_passes": MC_PASSES,
        "ood_method": "Relative Mahalanobis Distance (shrinkage=0.05, fitted on train set)",
        "epistemic_method": f"MC-Dropout variance ({MC_PASSES} forward passes through classifier head)",
        "threshold_derivation": (
            f"tau_ood and tau_epi are the 95th percentile of the OOD and epistemic "
            f"scores over the {n_tn_auto} confirmed-TN auto-cleared studies. "
            "This is a conservative threshold: any score exceeding the 95th percentile "
            "of confirmed true-negative auto-clears would trigger escalation."
        ),
        "tn_auto_cleared_distribution": {
            "n_tn_auto_cleared": n_tn_auto,
            "ood_mean": tn_ood_mean,
            "ood_median": tn_ood_median,
            "ood_p95": tau_ood_p95,
            "epi_mean": tn_epi_mean,
            "epi_median": tn_epi_median,
            "epi_p95": tau_epi_p95,
        },
        "fn_study_results": fn_results,
        "summary": {
            "n_fn_evaluated": len(fn_results),
            "n_escalated_by_ood": n_escalated_by_ood,
            "n_escalated_by_epi": n_escalated_by_epi,
            "n_escalated_by_either": n_escalated_by_either,
            "n_escalated_by_both": n_escalated_by_both,
            "n_not_escalated_by_any_gate": len(fn_results) - n_escalated_by_either,
        },
        "governance_note": (
            "Even if all 6 FN studies had been escalated by secondary gates, this would "
            "not retroactively change the reported classifier-gate FNR. Any multi-gate "
            "evaluation must be pre-registered, use independent thresholds fitted on a "
            "held-out calibration subset, and report the joint gate FNR as a separate metric."
        ),
        "elapsed_seconds": round(time.time() - t0, 2),
    }

    out_json = REPORTS / "v2a1_fn_safety_interception.json"
    out_json.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\nJSON saved to: {out_json}")

    # ------------------------------------------------------------------ [9] Markdown report
    n_caught = n_escalated_by_either
    n_missed = len(fn_results) - n_caught

    lines = [
        f"# Multi-Gate Safety Interception Audit",
        f"",
        f"> **{MARK}**",
        f"",
        f"**Date**: {time.strftime('%Y-%m-%d')}  ",
        f"**Script**: `validation/scripts/audit_fn_safety_interception.py`  ",
        f"**Output JSON**: `validation/reports/v2a1_fn_safety_interception.json`",
        f"",
        f"---",
        f"",
        f"## Purpose",
        f"",
        f"The conformal classifier gate at λ = {LAMBDA_CRC} auto-cleared **33 CQ500 studies** "
        f"(score < λ). Of these, **6 were false negatives** (ground-truth ICH, "
        f"`conditional_fnr_observed = 3.70%`). This audit retrospectively assesses "
        f"whether the secondary Relative Mahalanobis OOD gate (C2) or the MC-Dropout "
        f"epistemic-uncertainty gate (C1) would have escalated any of the 6 FN studies "
        f"to human review.",
        f"",
        f"> **Scope constraint**: This is a SEPARATE retrospective analysis performed "
        f"after the classifier-gate evaluation. The reported **3.70% FNR remains unchanged**. "
        f"This audit characterises the theoretical multi-gate coverage and does not "
        f"constitute a jointly calibrated multi-gate FNR guarantee.",
        f"",
        f"---",
        f"",
        f"## Methodology",
        f"",
        f"| Step | Detail |",
        f"|---|---|",
        f"| Model | `classifier_v2a1.pt` (frozen EfficientNet-B0, temperature T = {T:.4f}) |",
        f"| OOD method | Relative Mahalanobis Distance, shrinkage = 0.05, fitted on train penultimate features |",
        f"| Epistemic method | MC-Dropout variance, {MC_PASSES} forward passes through classifier head |",
        f"| Study aggregation | Mean of top-3 slices by classifier probability (TopK = 3) |",
        f"| Threshold derivation | 95th percentile of OOD / epistemic scores over the {n_tn_auto} confirmed-TN auto-cleared studies |",
        f"",
        f"**OOD threshold (τ_ood)**: {tau_ood_p95:.4f}  ",
        f"**Epistemic threshold (τ_epi)**: {tau_epi_p95:.8f}",
        f"",
        f"---",
        f"",
        f"## TN Auto-Cleared Distribution (Threshold Reference)",
        f"",
        f"| Metric | OOD Score | Epistemic Variance |",
        f"|---|---|---|",
        f"| Mean | {tn_ood_mean:.4f} | {tn_epi_mean:.8f} |",
        f"| Median | {tn_ood_median:.4f} | {tn_epi_median:.8f} |",
        f"| **95th pctl (τ)** | **{tau_ood_p95:.4f}** | **{tau_epi_p95:.8f}** |",
        f"",
        f"---",
        f"",
        f"## Per-Study Results",
        f"",
        f"| Study ID | Classifier Score | OOD Score | OOD > τ | Epi Variance | Epi > τ | Escalated? |",
        f"|---|---|---|---|---|---|---|",
    ]

    for r in fn_results:
        ood_flag = "✅ YES" if r["ood_flagged"] else "❌ no"
        epi_flag = "✅ YES" if r["epistemic_flagged"] else "❌ no"
        esc_flag = "⚠️ **YES**" if r["would_escalate_by_either_gate"] else "❌ no"
        lines.append(
            f"| {r['study_id']} "
            f"| {r['classifier_score_s']:.6f} "
            f"| {r['ood_score_relative_mahal']:.4f} "
            f"| {ood_flag} "
            f"| {r['epistemic_variance']:.8f} "
            f"| {epi_flag} "
            f"| {esc_flag} |"
        )

    ci_lo, ci_hi = wilson_ci(n_caught, len(fn_results))
    lines += [
        f"",
        f"---",
        f"",
        f"## Summary",
        f"",
        f"| Metric | Count | Fraction |",
        f"|---|---|---|",
        f"| FN studies evaluated | {len(fn_results)} | 6/162 = 3.70% of positive holdout |",
        f"| Escalated by OOD gate | {n_escalated_by_ood} | {n_escalated_by_ood}/{len(fn_results)} |",
        f"| Escalated by Epistemic gate | {n_escalated_by_epi} | {n_escalated_by_epi}/{len(fn_results)} |",
        f"| **Escalated by EITHER gate** | **{n_caught}** | **{n_caught}/{len(fn_results)}** |",
        f"| NOT escalated by any gate | {n_missed} | {n_missed}/{len(fn_results)} |",
        f"",
        f"95% Wilson CI on catch fraction: [{ci_lo:.1%}, {ci_hi:.1%}] (n = {len(fn_results)}, very wide — treat as indicative only).",
        f"",
        f"---",
        f"",
        f"## Governance Note",
        f"",
        f"> Even if all 6 FN studies had been escalated by secondary gates, this would "
        f"not retroactively change the reported classifier-gate FNR of 3.70% (6/162). "
        f"Any prospective multi-gate evaluation must be **pre-registered**, use "
        f"**independent calibration** for gate thresholds, and report the **joint gate FNR** "
        f"as a separate metric. The current audit is exploratory and does not constitute "
        f"a clinical safety claim.",
        f"",
        f"---",
        f"",
        f"*Elapsed: {round(time.time() - t0, 1)}s*",
    ]

    out_md = DOCS / "feasibility_report_fn_safety_interception.md"
    out_md.write_text("\n".join(lines), encoding="utf-8")
    print(f"Markdown report saved to: {out_md}")
    print(f"\nTotal elapsed: {round(time.time() - t0, 1)}s")
    print(MARK)


if __name__ == "__main__":
    run_audit()
