import numpy as np
import pytest

from validation.study import signals


def test_composite_U_formula():
    ep = np.array([0.1, 0.0])
    al = np.array([0.0, 0.2])
    assert signals.composite_U(ep, al)[0] == pytest.approx(0.06)
    assert signals.composite_U(ep, al)[1] == pytest.approx(0.08)


def test_normalized_U_ceiling():
    # raw U = 0.6*0.15 + 0.4*0.15 = 0.15 -> normalized 1.0
    assert signals.normalized_U(np.array([0.15]), np.array([0.15]))[0] == pytest.approx(1.0)
    # linear scaling: raw 0.075 -> 0.5
    assert signals.normalized_U(np.array([0.075]), np.array([0.075]))[0] == pytest.approx(0.5)


def test_entropy_bounds():
    assert signals.entropy(np.array([0.5]))[0] == pytest.approx(np.log(2))
    assert signals.entropy(np.array([1.0]))[0] == pytest.approx(0.0, abs=1e-6)


def test_risk_orientation():
    # confident correct -> low risk ; uncertain -> high risk
    p = np.array([0.99, 0.5])
    assert signals.risk_max_softmax(p)[0] < signals.risk_max_softmax(p)[1]
    assert signals.risk_entropy(p)[0] < signals.risk_entropy(p)[1]


def test_mahalanobis_flags_outlier():
    rng = np.random.default_rng(0)
    f0 = rng.normal(0, 1, (100, 8))
    f1 = rng.normal(3, 1, (100, 8))
    feats = np.vstack([f0, f1])
    y = np.array([0] * 100 + [1] * 100)
    ood = signals.MahalanobisOOD().fit(feats, y)
    inlier = ood.score(np.zeros((1, 8)))[0]
    outlier = ood.score(np.full((1, 8), 30.0))[0]
    assert outlier > inlier
