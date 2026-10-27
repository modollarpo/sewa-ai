# SEWA XAI — tests/unit/test_metacognition_window.py
# Verifies the metacognition service consults the experimental window deficit
# for the hallucination-risk SHAP check only when WINDOW_SPECIFIC_COHERENCE is
# enabled and a window deficit is supplied, always falling back to the generic
# SHAP coherence otherwise. Both coherence measures are always reported.

import sys
from pathlib import Path

import pytest

SERVICE_DIR = Path(__file__).resolve().parents[2] / "ai-services" / "metacognition"
sys.path.insert(0, str(SERVICE_DIR))

import main as met  # noqa: E402

# Two weak, diffuse attributions → generic SHAP coherence 0.23 (< 0.4).
WEAK_SHAP = [{"f": "a", "v": 0.05}, {"f": "b", "v": 0.05}]


def _req(**overrides):
    base = dict(
        scan_id="WINDOW-1",
        primary_finding="ICH",
        urgency="CRITICAL",
        confidence=0.95,
        uncertainty_score=0.05,
        shap_values=[{"f": "a", "v": 0.05}, {"f": "b", "v": 0.05}],  # weak → generic incoherence
        modality="CT",
        body_part="Head",
        report_text=None,
    )
    base.update(overrides)
    return met.MetacognitionRequest(**base)


def _codes(resp):
    return {f.code for f in resp.flags}


@pytest.fixture
def window_on(monkeypatch):
    monkeypatch.setattr(met, "WINDOW_SPECIFIC_COHERENCE", True)


def test_flag_off_uses_generic_coherence_only():
    met.WINDOW_SPECIFIC_COHERENCE = False
    resp = met.evaluator.evaluate(_req(window_coherence=1.0, window_deficit=0.0,
                                       sensitive_windows=["brain", "subdural"]))
    # Generic SHAP is weak → generic incoherence flag; window deficit ignored.
    assert "SHAP_INCOHERENCE" in _codes(resp)
    assert "WINDOW_INCOHERENCE" not in _codes(resp)
    assert resp.window_flag_used is False
    # Both measures still reported for the audit trail.
    assert resp.window_coherence == 1.0
    assert resp.shap_coherence is not None


def test_flag_on_uses_window_deficit(window_on):
    # Strong generic coherence (empty shap = neutral 0.5, no flag) but a high
    # window deficit must still trigger incoherence via the window path.
    resp = met.evaluator.evaluate(
        _req(shap_values=[], window_coherence=0.1, window_deficit=0.9,
             sensitive_windows=["brain", "subdural"])
    )
    assert "WINDOW_INCOHERENCE" in _codes(resp)
    assert "SHAP_INCOHERENCE" not in _codes(resp)
    assert resp.window_flag_used is True
    assert resp.window_deficit == pytest.approx(0.9)
    assert resp.sensitive_windows == ["brain", "subdural"]


def test_flag_on_falls_back_when_no_window_deficit(window_on):
    resp = _evaluate_weak_generic(window_on)
    assert "SHAP_INCOHERENCE" in _codes(resp)
    assert resp.window_flag_used is False


def _evaluate_weak_generic(_window_on):
    return met.evaluator.evaluate(_req(shap_values=WEAK_SHAP))


def test_channel_mismatch_is_flagged_but_does_not_move_risk(window_on):
    strong = [{"f": "density", "v": 0.9}]
    clean = met.evaluator.evaluate(_req(shap_values=strong))
    mismatched = met.evaluator.evaluate(_req(
        shap_values=strong,
        window_coherence=0.9, window_deficit=0.1, window_channel_flag=True,
        sensitive_windows=["brain", "subdural"],
    ))
    assert "WINDOW_CHANNEL_MISMATCH" in _codes(mismatched)
    assert mismatched.hallucination_risk == pytest.approx(clean.hallucination_risk)


def test_channel_mismatch_ignored_when_flag_off():
    resp = met.evaluator.evaluate(_req(
        shap_values=[{"f": "density", "v": 0.9}],
        window_coherence=0.9, window_deficit=0.1, window_channel_flag=True,
    ))
    assert "WINDOW_CHANNEL_MISMATCH" not in _codes(resp)


def test_both_coherences_are_reported_when_off():
    resp = met.evaluator.evaluate(_req(shap_values=[{"f": "density", "v": 0.5}]))
    assert resp.shap_coherence is not None
    assert resp.window_flag_used is False
    assert resp.shap_coherence is not None
    assert resp.window_flag_used is False
