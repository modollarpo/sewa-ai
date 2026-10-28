"""Risk signals for gating.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Every function returns a RISK score: HIGHER = more likely the prediction is WRONG,
so the gate routes high-risk cases to human review.

Uncertainty uses the FROZEN prompt formula
    epistemic = Var(p) across MC passes
    aleatoric  = mean p(1-p) across MC passes
    U          = 0.6*epistemic + 0.4*aleatoric      (ceiling ~0.15)
and thresholds come from validation quantiles (see docs/spec-vs-code-decisions.md).
"""
from __future__ import annotations

import numpy as np

U_MAX = 0.15  # frozen ceiling for the given U formula (do NOT use 0.25)


def entropy(p_pos: np.ndarray) -> np.ndarray:
    p = np.clip(np.asarray(p_pos, dtype=float), 1e-12, 1 - 1e-12)
    return -(p * np.log(p) + (1 - p) * np.log(1 - p))


def risk_max_softmax(p_pos: np.ndarray) -> np.ndarray:
    """B1 risk: 1 - max softmax (confident -> low risk)."""
    p = np.asarray(p_pos, dtype=float)
    return 1.0 - np.maximum(p, 1.0 - p)


def risk_entropy(p_pos: np.ndarray) -> np.ndarray:
    """B2 risk: predictive entropy (high entropy -> high risk)."""
    return entropy(p_pos)


def composite_U(epistemic: np.ndarray, aleatoric: np.ndarray) -> np.ndarray:
    return 0.6 * np.asarray(epistemic, float) + 0.4 * np.asarray(aleatoric, float)


def normalized_U(epistemic: np.ndarray, aleatoric: np.ndarray) -> np.ndarray:
    return np.clip(composite_U(epistemic, aleatoric) / U_MAX, 0.0, None)


def risk_conflict(p_pos: np.ndarray, epistemic: np.ndarray, aleatoric: np.ndarray) -> np.ndarray:
    """C4: high confidence AND high U -> risk. Continuous surrogate
    = confidence * normalized_U."""
    conf = np.maximum(np.asarray(p_pos, float), 1.0 - np.asarray(p_pos, float))
    return conf * normalized_U(epistemic, aleatoric)


class MahalanobisOOD:
    """Shared-covariance Mahalanobis distance, fit on TRAINING features only.

    distance(f) = min_c sqrt((f - mu_c)^T Sigma^-1 (f - mu_c)), Sigma pooled with
    shrinkage toward the scaled identity for numerical stability.
    """

    def __init__(self, shrinkage: float = 0.05):
        self.shrinkage = shrinkage
        self.means_ = None
        self.prec_ = None

    def fit(self, feats: np.ndarray, y: np.ndarray):
        feats = np.asarray(feats, float)
        y = np.asarray(y)
        d = feats.shape[1]
        means = {c: feats[y == c].mean(axis=0) for c in (0, 1)}
        cov = np.zeros((d, d), dtype=float)
        for c in (0, 1):
            f = feats[y == c]
            fc = f - means[c]
            cov += fc.T @ fc
        cov /= max(len(feats) - 2, 1)
        cov = (1 - self.shrinkage) * cov + self.shrinkage * np.trace(cov) / d * np.eye(d)
        self.means_ = means
        self.prec_ = np.linalg.pinv(cov)
        return self

    def score(self, feats: np.ndarray) -> np.ndarray:
        feats = np.asarray(feats, float)
        out = np.full(len(feats), np.inf)
        for c in (0, 1):
            diff = feats - self.means_[c]
            m = np.sum((diff @ self.prec_) * diff, axis=1)
            out = np.minimum(out, m)
        return np.sqrt(np.clip(out, 0, None))
