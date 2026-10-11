"""Evaluation metrics for the public-data feasibility study.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Pure numpy. No dataset needed to unit-test. Semantics:
  * scores are "risk" scores: HIGHER = more likely the prediction is WRONG
    (that is the orientation a review gate uses: route high-risk cases to a human).
  * probs are the model's probability of the positive class (hemorrhage).
"""
from __future__ import annotations

import numpy as np


def auroc(risk: np.ndarray, is_error: np.ndarray) -> float:
    """AUROC of risk score detecting errors, with mid-rank tie handling.

    Equals P(risk[error] > risk[correct]) + 0.5*P(tie). Returns nan if one class
    is empty.
    """
    risk = np.asarray(risk, dtype=float)
    is_error = np.asarray(is_error, dtype=bool)
    n_pos = int(is_error.sum())
    n_neg = int((~is_error).sum())
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    order = np.argsort(risk, kind="mergesort")
    ranks = np.empty(len(risk), dtype=float)
    sr = risk[order]
    i = 0
    while i < len(sr):
        j = i
        while j + 1 < len(sr) and sr[j + 1] == sr[i]:
            j += 1
        avg_rank = (i + j) / 2.0 + 1.0  # 1-based average rank
        ranks[order[i:j + 1]] = avg_rank
        i = j + 1
    sum_pos = ranks[is_error].sum()
    return (sum_pos - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg)


def risk_coverage(risk: np.ndarray, is_error: np.ndarray):
    """Return (coverage, risk) curves when abstaining on the highest-risk cases.

    coverage = fraction kept; risk = error rate among kept. Also returns AURC.
    """
    risk = np.asarray(risk, dtype=float)
    is_error = np.asarray(is_error, dtype=bool)
    order = np.argsort(risk, kind="stable")  # keep lowest risk first
    err = is_error[order]
    n = len(err)
    kept = np.arange(1, n + 1)
    errs_kept = np.cumsum(err)
    coverage = kept / n
    risk_curve = errs_kept / kept
    aurc = float(np.trapezoid(risk_curve, coverage))
    return coverage, risk_curve, aurc


def review_threshold(risk: np.ndarray, review_rate: float) -> float:
    """Risk value at the given review rate: top `review_rate` fraction flagged."""
    risk = np.asarray(risk, dtype=float)
    q = np.quantile(risk, 1.0 - review_rate)
    return float(q)


def unsafe_accepted_per_1000(risk: np.ndarray, is_error: np.ndarray,
                             review_rate: float) -> float:
    """Wrong predictions that pass the gate, per 1000 studies, at a review rate."""
    risk = np.asarray(risk, dtype=float)
    is_error = np.asarray(is_error, dtype=bool)
    thr = review_threshold(risk, review_rate)
    accepted = risk <= thr
    if accepted.sum() == 0:
        return float("nan")
    errors_accepted = int((is_error & accepted).sum())
    return errors_accepted / len(risk) * 1000.0


def brier(probs: np.ndarray, y: np.ndarray) -> float:
    probs = np.asarray(probs, dtype=float)
    y = np.asarray(y, dtype=float)
    return float(np.mean((probs - y) ** 2))


def ece(probs: np.ndarray, y: np.ndarray, n_bins: int = 15) -> float:
    probs = np.asarray(probs, dtype=float)
    y = np.asarray(y, dtype=float)
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    total = 0.0
    for i in range(n_bins):
        lo, hi = edges[i], edges[i + 1]
        m = (probs > lo) & (probs <= hi) if i > 0 else (probs >= lo) & (probs <= hi)
        if m.sum() == 0:
            continue
        conf = probs[m].mean()
        acc = y[m].mean()
        total += m.mean() * abs(acc - conf)
    return float(total)


def sensitivity_specificity(probs: np.ndarray, y: np.ndarray, threshold: float = 0.5):
    probs = np.asarray(probs, dtype=float)
    y = np.asarray(y, dtype=bool)
    pred = probs >= threshold
    tp = int((pred & y).sum())
    fn = int((~pred & y).sum())
    tn = int((~pred & ~y).sum())
    fp = int((pred & ~y).sum())
    sens = tp / (tp + fn) if (tp + fn) else float("nan")
    spec = tn / (tn + fp) if (tn + fp) else float("nan")
    return sens, spec
