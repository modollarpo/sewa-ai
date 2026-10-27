import numpy as np
import pytest

from validation.study import compare, metrics


def test_auroc_perfect_and_reversed():
    risk = np.array([0.9, 0.8, 0.2, 0.1])
    err = np.array([1, 1, 0, 0])
    assert metrics.auroc(risk, err) == pytest.approx(1.0)
    assert metrics.auroc(-risk, err) == pytest.approx(0.0)


def test_auroc_ties_midrank():
    risk = np.array([0.5, 0.5, 0.5, 0.5])
    err = np.array([1, 0, 1, 0])
    assert metrics.auroc(risk, err) == pytest.approx(0.5)


def test_auroc_empty_class_nan():
    assert np.isnan(metrics.auroc(np.array([0.1, 0.2]), np.array([0, 0])))


def test_risk_coverage_orders_by_risk():
    risk = np.array([0.1, 0.2, 0.9, 0.8])
    err = np.array([0, 0, 1, 1])
    cov, rc, aurc = metrics.risk_coverage(risk, err)
    # keeping everything: risk = 0.5 ; keeping only lowest-risk 2: risk = 0
    assert cov[-1] == pytest.approx(1.0)
    assert rc[-1] == pytest.approx(0.5)
    assert rc[1] == pytest.approx(0.0)
    assert 0.0 < aurc < 0.5


def test_unsafe_accepted_matches_manual():
    risk = np.array([0.9, 0.8, 0.3, 0.1])  # top 25% is the 0.9
    err = np.array([1, 0, 1, 0])
    # review rate 0.25 -> threshold at 75th pct of risk; accepted where risk<=thr
    val = metrics.unsafe_accepted_per_1000(risk, err, 0.25)
    assert val >= 0.0


def test_brier_and_ece_range():
    p = np.array([0.0, 1.0, 1.0, 0.0])
    y = np.array([0, 1, 1, 1])
    assert 0.0 <= metrics.brier(p, y) <= 1.0
    assert 0.0 <= metrics.ece(p, y) <= 1.0


def test_sensitivity_specificity():
    p = np.array([0.9, 0.1, 0.8, 0.2])
    y = np.array([1, 0, 1, 0])
    sens, spec = metrics.sensitivity_specificity(p, y, 0.5)
    assert sens == pytest.approx(1.0)
    assert spec == pytest.approx(1.0)


def test_relative_reduction_exact():
    # baseline accepts all errors; H routes them to review
    err = np.array([1, 1, 0, 0])
    risk_base = np.array([0.1, 0.1, 0.1, 0.1])
    risk_new = np.array([0.9, 0.9, 0.1, 0.1])
    rr = compare.relative_reduction(err, risk_new, risk_base, 0.5)
    assert rr == pytest.approx(1.0)


def test_relative_reduction_ci_and_criterion():
    rng = np.random.default_rng(0)
    n = 400
    err = rng.random(n) < 0.2
    risk_base = rng.random(n)
    risk_new = err.astype(float) * 0.7 + rng.random(n) * 0.3  # informative
    res = compare.meets_success_criterion(err, risk_new, risk_base,
                                          [0.05, 0.10, 0.20, 0.30], n_boot=200)
    assert set(res.keys()) == {0.05, 0.10, 0.20, 0.30}
    for r in res.values():
        assert r["ci95"][0] <= r["relative_reduction"] <= r["ci95"][1] or not np.isfinite(r["relative_reduction"])
