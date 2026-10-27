# SEWA XAI — tests/unit/test_window_coherence.py
# Unit tests for the (off-by-default, NOT validated) window-specific coherence
# feature. All inputs are synthetic attribution maps/masks built by the test;
# assertions check structural relationships between the construction and the
# output (not magic constants), so the tests survive threshold/param changes.

import sys
from pathlib import Path

import numpy as np
import pytest

SERVICE_DIR = Path(__file__).resolve().parents[2] / "ai-services" / "uncertainty"
sys.path.insert(0, str(SERVICE_DIR))

from window_coherence import (  # noqa: E402
    CHANNELS,
    boxes_mask,
    channel_check,
    channel_shares,
    evaluate_window_coherence,
    intracranial_mask,
    load_window_sensitivity,
    window_specific_coherence,
)


def _map(shape=(32, 32), inside_rows=None, inside_cols=None, value=1.0):
    """Attribution map that is `value` over a rectangular sub-region, else 0."""
    m = np.zeros(shape, dtype=np.float64)
    r = inside_rows or slice(0, shape[0])
    c = inside_cols or slice(0, shape[1])
    m[r, c] = value
    return m


# ── channel_shares ───────────────────────────────────────────────────────────
def test_channel_shares_sum_to_one():
    maps = {"brain": _map(value=2.0), "subdural": _map(value=1.0), "bone": _map(value=1.0)}
    shares = channel_shares(maps)
    assert set(shares) == set(CHANNELS)
    assert sum(shares.values()) == pytest.approx(1.0)
    # brain carries half the total mass (2 of 4 units)
    assert shares["brain"] == pytest.approx(0.5)


def test_channel_shares_zero_maps_are_all_zero():
    shares = channel_shares({c: np.zeros((4, 4)) for c in CHANNELS})
    assert all(v == 0.0 for v in shares.values())


# ── window_specific_coherence ────────────────────────────────────────────────
def test_coherence_one_when_sensitive_attribution_fully_inside():
    mask = np.zeros((32, 32), dtype=bool)
    mask[8:24, 8:24] = True
    maps = {"brain": _map(inside_rows=slice(8, 24), inside_cols=slice(8, 24)),
            "subdural": np.zeros((32, 32))}
    out = window_specific_coherence(maps, ["brain", "subdural"], mask)
    assert out["coherence"] == pytest.approx(1.0)
    assert out["deficit"] == pytest.approx(0.0)


def test_coherence_zero_when_sensitive_attribution_fully_outside():
    mask = np.zeros((32, 32), dtype=bool)
    mask[8:24, 8:24] = True
    maps = {"brain": _map(inside_rows=slice(0, 6), inside_cols=slice(0, 6)),
            "subdural": np.zeros((32, 32))}
    out = window_specific_coherence(maps, ["brain", "subdural"], mask)
    assert out["coherence"] == pytest.approx(0.0)
    assert out["deficit"] == pytest.approx(1.0)


def test_coherence_reflects_inside_fraction():
    mask = np.zeros((10, 10), dtype=bool)
    mask[:, :5] = True  # left half is "inside"
    maps = {"brain": np.ones((10, 10))}  # uniform → half inside
    out = window_specific_coherence(maps, ["brain"], mask)
    assert out["coherence"] == pytest.approx(0.5)
    assert out["deficit"] == pytest.approx(0.5)


def test_coherence_none_when_no_sensitive_channel_present():
    maps = {"bone": np.ones((8, 8))}
    out = window_specific_coherence(maps, ["brain", "subdural"], np.ones((8, 8), dtype=bool))
    assert out["coherence"] is None
    assert out["deficit"] is None


def test_coherence_none_when_sensitive_attribution_is_zero():
    mask = np.ones((8, 8), dtype=bool)
    maps = {"brain": np.zeros((8, 8)), "subdural": np.zeros((8, 8))}
    out = window_specific_coherence(maps, ["brain", "subdural"], mask)
    assert out["coherence"] is None


def test_coherence_uses_only_sensitive_channels():
    mask = np.ones((8, 8), dtype=bool)
    maps = {"brain": np.ones((8, 8)), "bone": np.ones((8, 8))}
    # brain-only sensitivity: all brain inside → coherence 1 regardless of bone
    out = window_specific_coherence(maps, ["brain"], mask)
    assert out["coherence"] == pytest.approx(1.0)


# ── channel_check ────────────────────────────────────────────────────────────
def test_channel_check_flags_nonsensitive_dominance():
    shares = {"brain": 0.1, "subdural": 0.1, "bone": 0.8}
    out = channel_check(shares, ["brain", "subdural"])
    assert out["flag"] is True
    assert out["dominant_channel"] == "bone"


def test_channel_check_passes_when_sensitive_dominates():
    shares = {"brain": 0.7, "subdural": 0.2, "bone": 0.1}
    out = channel_check(shares, ["brain", "subdural"])
    assert out["flag"] is False


def test_channel_check_empty_shares():
    out = channel_check({}, ["brain"])
    assert out["flag"] is False and out["dominant_channel"] is None


# ── intracranial_mask heuristic ──────────────────────────────────────────────
def test_intracranial_mask_hu_path_keeps_soft_tissue_excludes_air_and_bone():
    img = np.full((64, 64), -1000.0, dtype=np.float32)   # air/background
    img[16:48, 16:48] = 40.0                              # brain soft tissue (HU)
    img[16, 16:48] = 1200.0                               # a bone (calvarium) strip
    mask = intracranial_mask(img)  # is_hu auto-detected (has <0 and >255 values)
    assert mask[32, 32]           # deep soft tissue inside
    assert not mask[0, 0]         # air outside
    assert not mask[16, 32]       # high-attenuation bone excluded


def test_intracranial_mask_8bit_fallback_keeps_largest_region():
    img = np.zeros((64, 64), dtype=np.uint8)   # dark background
    img[20:44, 20:44] = 120                     # mid-intensity head
    img[20, 20:44] = 255                        # bright bone edge
    mask = intracranial_mask(img)  # 8-bit → non-HU path
    assert mask[32, 32]
    assert not mask[2, 2]


def test_intracranial_mask_rejects_non_2d():
    with pytest.raises(ValueError):
        intracranial_mask(np.zeros((4, 4, 3)))


# ── boxes_mask (evaluation-only) ─────────────────────────────────────────────
def test_boxes_mask_marks_fractional_boxes():
    mask = boxes_mask((10, 10), [(0.0, 0.0, 0.5, 0.5)])
    assert mask[1, 1]
    assert not mask[9, 9]
    assert mask.sum() == 25  # half of each dimension


# ── evaluate_window_coherence: mask precedence + fallbacks ───────────────────
def test_evaluate_uses_provided_mask():
    maps = {"brain": np.ones((8, 8)), "subdural": np.ones((8, 8)), "bone": np.ones((8, 8))}
    res = evaluate_window_coherence(
        maps, "Subdural Hematoma", region_mask=np.ones((8, 8), dtype=bool)
    )
    assert res.mask_source == "provided"
    assert res.coherence == pytest.approx(1.0)
    assert res.sensitive_windows == ["brain", "subdural"]
    assert res.deficit == pytest.approx(0.0)


def test_evaluate_uses_boxes():
    maps = {"brain": np.ones((10, 10))}
    res = evaluate_window_coherence(maps, "Fracture", boxes=[(0.0, 0.0, 1.0, 1.0)])
    assert res.mask_source == "boxes"
    assert res.sensitive_windows == ["bone"]  # fracture → bone
    assert res.coherence is None  # no bone attribution present


def test_evaluate_none_mask_yields_none_coherence():
    maps = {"brain": np.ones((8, 8))}
    res = evaluate_window_coherence(maps, "ICH")
    assert res.mask_source == "none"
    assert res.coherence is None and res.deficit is None


def test_evaluate_heuristic_path_with_brain_channel():
    brain = np.full((32, 32), -1000.0, dtype=np.float32)
    brain[8:24, 8:24] = 40.0
    maps = {"brain": _map(shape=(32, 32), inside_rows=slice(8, 24), inside_cols=slice(8, 24))}
    res = evaluate_window_coherence(maps, "ICH", brain_channel=brain)
    assert res.mask_source == "hu-heuristic"
    assert res.coherence == pytest.approx(1.0)


# ── config loading ───────────────────────────────────────────────────────────
def test_config_maps_findings_to_windows():
    cfg = load_window_sensitivity()
    assert cfg.channels_for("Subdural Hematoma") == ["brain", "subdural"]
    assert cfg.channels_for("subdural hematoma") == ["brain", "subdural"]  # case-insensitive
    assert cfg.channels_for("Rib Fracture") == ["bone"]


def test_config_keyword_fallback_for_unseen_label():
    cfg = load_window_sensitivity()
    # not an exact key, but contains a haemorrhage keyword
    assert cfg.channels_for("Acute Intracranial Haemorrhage") == ["brain", "subdural"]


def test_config_unknown_finding_uses_default():
    cfg = load_window_sensitivity()
    assert cfg.channels_for("Totally Unmapped Finding") == cfg.default


def test_config_missing_file_falls_back_to_defaults(tmp_path):
    cfg = load_window_sensitivity(tmp_path / "does-not-exist.yaml")
    assert cfg.default == ["brain"]
    assert cfg.channels_for("anything") == ["brain"]
