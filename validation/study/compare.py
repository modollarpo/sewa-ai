"""Paired bootstrap comparison of gating strategies.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Compares composite-H against a baseline at a matched review rate. The bootstrap
resamples clusters (patient/study ids) when available; for RSNA there is no patient
id, so clusters = individual images (documented limitation). Seeds are fixed.
"""
from __future__ import annotations

import numpy as np

from validation.study.metrics import unsafe_accepted_per_1000


def _u(risk, is_error, review_rate):
    return unsafe_accepted_per_1000(risk, is_error, review_rate)


def relative_reduction(is_error, risk_new, risk_base, review_rate):
    ub = _u(risk_base, is_error, review_rate)
    un = _u(risk_new, is_error, review_rate)
    if not np.isfinite(ub) or ub == 0:
        return float("nan")
    return (ub - un) / ub


def relative_reduction_ci(is_error, risk_new, risk_base, review_rate,
                          n_boot=1000, seed=42, clusters=None):
    """Point estimate + 95% bootstrap CI for relative reduction in unsafe-accepted.

    clusters: optional array of group labels; resampling is done at the cluster
    level (patient/study). None -> image-level resampling.
    """
    is_error = np.asarray(is_error, dtype=bool)
    risk_new = np.asarray(risk_new, dtype=float)
    risk_base = np.asarray(risk_base, dtype=float)
    n = len(is_error)

    point = relative_reduction(is_error, risk_new, risk_base, review_rate)

    if clusters is None:
        groups = [np.array([i]) for i in range(n)]
    else:
        clusters = np.asarray(clusters)
        groups = [np.where(clusters == c)[0] for c in np.unique(clusters)]

    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n_boot):
        pick = rng.integers(0, len(groups), size=len(groups))
        idx = np.concatenate([groups[p] for p in pick])
        v = relative_reduction(is_error[idx], risk_new[idx], risk_base[idx], review_rate)
        if np.isfinite(v):
            vals.append(v)
    if not vals:
        return point, (float("nan"), float("nan"))
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return point, (float(lo), float(hi))


def meets_success_criterion(is_error, risk_new, risk_base, review_rates,
                            n_boot=1000, seed=42, clusters=None):
    """Success = >=20% relative reduction vs the BETTER baseline at a matched rate,
    with 95% CI excluding zero, at every reported review rate."""
    risk_base = np.asarray(risk_base, dtype=float)
    out = {}
    for r in review_rates:
        pt, ci = relative_reduction_ci(is_error, risk_new, risk_base, r,
                                       n_boot=n_boot, seed=seed, clusters=clusters)
        out[r] = {"relative_reduction": pt, "ci95": ci,
                  "passes": bool(np.isfinite(pt) and pt >= 0.20 and ci[0] > 0.0)}
    return out
