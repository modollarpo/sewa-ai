# SEWA XAI — ai-services/uncertainty/window_coherence.py
# ─────────────────────────────────────────────────────────────────────────────
# Window-specific coherence (NEW FEATURE — off by default, NOT validated).
#
# What it does
#   1. Takes a per-channel input-attribution map for the 3 CT reconstruction
#      windows the service builds (brain / subdural / bone).
#   2. Uses a finding→sensitive-windows config (window_sensitivity.yaml) to
#      pick the windows a radiologist would read for that finding.
#   3. Sums attribution over those sensitive windows ONLY and measures the
#      fraction that falls inside the expected anatomical region (intracranial
#      mask, a documented heuristic; expert boxes are accepted for evaluation).
#      coherence ∈ [0,1]; deficit = 1 - coherence.
#   4. Flags when most attribution comes from NON-sensitive windows (e.g. bone
#      window driving a haemorrhage call).
#
# This module is pure (numpy + cv2 only) so it can be unit-tested with synthetic
# attribution maps. It makes NO claim of clinical validity — it is intended to
# be evaluated as an ablation against generic SHAP coherence in the validation
# study (docs/spec-vs-code-decisions.md).

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np

try:
    import cv2
except ImportError:  # pragma: no cover - cv2 is a hard dep of the service
    cv2 = None  # type: ignore

CHANNELS: Tuple[str, str, str] = ("brain", "subdural", "bone")
DEFAULT_CONFIG_PATH = Path(__file__).with_name("window_sensitivity.yaml")


# ── Config ───────────────────────────────────────────────────────────────────
@dataclass
class WindowSensitivityConfig:
    """finding → sensitive CT windows (loaded from window_sensitivity.yaml)."""

    sensitive_windows: Dict[str, List[str]] = field(default_factory=dict)
    keyword_rules: List[Dict[str, Any]] = field(default_factory=list)
    default: List[str] = field(default_factory=lambda: ["brain"])

    @staticmethod
    def _normalise(label: str) -> str:
        return (label or "").strip().lower().replace("-", " ").replace("_", " ")

    def channels_for(self, finding: str) -> List[str]:
        """Resolve sensitive channels: exact match → keyword fallback → default."""
        key = self._normalise(finding)
        for label, channels in self.sensitive_windows.items():
            if self._normalise(label) == key:
                return list(channels)
        for rule in self.keyword_rules:
            if any(kw in key for kw in rule.get("keywords", [])):
                return list(rule.get("channels", [])) or list(self.default)
        return list(self.default)


def load_window_sensitivity(path: Optional[str | Path] = None) -> WindowSensitivityConfig:
    """Load the finding→sensitive-windows config; fall back to safe defaults.

    A missing/invalid file must never crash the service — it disables the
    specific mapping but the caller still gets a usable (brain-only) config.
    """
    import yaml  # local import: service stays importable without PyYAML

    cfg_path = Path(path) if path else DEFAULT_CONFIG_PATH
    if not cfg_path.exists():
        return WindowSensitivityConfig()
    try:
        raw = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    except Exception:  # noqa: BLE001 - config is best-effort
        return WindowSensitivityConfig()

    sensitive = raw.get("sensitive_windows") or {}
    return WindowSensitivityConfig(
        sensitive_windows={str(k): [str(c) for c in v] for k, v in sensitive.items()},
        keyword_rules=list(raw.get("keyword_rules") or []),
        default=[str(c) for c in (raw.get("default") or ["brain"])],
    )


# ── Channel attribution maths ────────────────────────────────────────────────
def channel_shares(attr_maps: Mapping[str, np.ndarray]) -> Dict[str, float]:
    """Per-channel share of total |attribution|. Shares sum to 1 (or all 0)."""
    totals = {c: float(np.abs(np.asarray(m, dtype=np.float64)).sum()) for c, m in attr_maps.items()}
    grand = sum(totals.values())
    if grand <= 0:
        return {c: 0.0 for c in attr_maps}
    return {c: t / grand for c, t in totals.items()}


def _fill_holes(mask: np.ndarray) -> np.ndarray:
    """Flood-fill background from the border; invert to fill interior holes."""
    h, w = mask.shape
    flood = mask.astype(np.uint8).copy()
    ff = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(flood, ff, (0, 0), 1)
    holes = (flood == 0).astype(np.uint8)
    return ((mask.astype(np.uint8) | holes) > 0).astype(np.uint8)


def intracranial_mask(
    channel_2d: np.ndarray,
    *,
    is_hu: Optional[bool] = None,
    hu_low: float = -100.0,
    hu_high: float = 300.0,
    fallback_lo_pct: float = 20.0,
    fallback_hi_pct: float = 99.5,
) -> np.ndarray:
    """Heuristic intracranial mask (bool, same H×W as input).

    NOT a validated brain mask. Two documented paths:

    * HU path (``is_hu`` True, or auto-detected when the array holds values
      outside the 8-bit range): keep soft-tissue attenuation — ``hu_low < v <
      hu_high`` — retaining brain parenchyma and blood while excluding air and
      the high-attenuation calvarium.
    * 8-bit fallback: keep intensities between a low and high percentile (drops
      air and the brightest bone), then retain the largest connected component.

    Evaluation should prefer expert boxes over this mask.
    """
    img = np.asarray(channel_2d, dtype=np.float64)
    if img.ndim != 2:
        raise ValueError("intracranial_mask expects a 2-D channel")

    if is_hu is None:
        is_hu = bool(img.min() < 0 or img.max() > 255)

    if is_hu:
        mask = (img > hu_low) & (img < hu_high)
    else:
        lo = np.percentile(img, fallback_lo_pct)
        hi = np.percentile(img, fallback_hi_pct)
        mask = (img > lo) & (img < hi)

    mask_u8 = mask.astype(np.uint8)
    if cv2 is not None and mask_u8.any():
        # Keep the largest connected component (the head) and fill holes so the
        # mask is a single solid intracranial region rather than speckle.
        n, labels, stats, _ = cv2.connectedComponentsWithStats(mask_u8, connectivity=8)
        if n > 1:
            largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            mask_u8 = (labels == largest).astype(np.uint8)
        mask_u8 = _fill_holes(mask_u8)
    return mask_u8.astype(bool)


def boxes_mask(shape: Tuple[int, int], boxes: Sequence[Sequence[float]]) -> np.ndarray:
    """Union of boxes → bool mask. Boxes are (x0, y0, x1, y1) in [0,1] coords.

    Evaluation-only: compares the heuristic mask against expert localisation.
    """
    h, w = shape
    mask = np.zeros((h, w), dtype=bool)
    for box in boxes:
        x0, y0, x1, y1 = box
        c0 = int(round(min(x0, x1) * w))
        c1 = int(round(max(x0, x1) * w))
        r0 = int(round(min(y0, y1) * h))
        r1 = int(round(max(y0, y1) * h))
        mask[max(0, r0):min(h, r1), max(0, c0):min(w, c1)] = True
    return mask


def window_specific_coherence(
    attr_maps: Mapping[str, np.ndarray],
    sensitive_channels: Sequence[str],
    region_mask: np.ndarray,
) -> Dict[str, Any]:
    """Coherence = fraction of sensitive-window attribution inside the region.

    Returns ``coherence=None`` when there is no sensitive-channel attribution at
    all (the caller must then fall back to generic coherence). ``deficit`` is
    ``1 - coherence`` when coherence is defined, else ``None``.
    """
    mask = np.asarray(region_mask, dtype=bool)
    sens = [c for c in sensitive_channels if c in attr_maps]
    if not sens:
        return {"coherence": None, "deficit": None, "sensitive_attribution": 0.0, "windows_used": []}

    total = 0.0
    inside = 0.0
    for c in sens:
        a = np.abs(np.asarray(attr_maps[c], dtype=np.float64))
        if a.shape != mask.shape:
            raise ValueError(f"attribution map {c} shape {a.shape} != mask {mask.shape}")
        total += float(a.sum())
        inside += float(a[mask].sum())

    if total <= 0:
        return {"coherence": None, "deficit": None, "sensitive_attribution": 0.0, "windows_used": sens}

    coherence = float(np.clip(inside / total, 0.0, 1.0))
    return {
        "coherence": coherence,
        "deficit": float(1.0 - coherence),
        "sensitive_attribution": total,
        "windows_used": sens,
    }


def channel_check(shares: Mapping[str, float], sensitive_channels: Sequence[str]) -> Dict[str, Any]:
    """Flag when attribution is dominated by non-sensitive windows.

    e.g. a haemorrhage call whose attribution sits mostly in the bone window.
    """
    if not shares:
        return {"flag": False, "dominant_channel": None, "sensitive_share": 0.0}
    dominant = max(shares, key=lambda c: shares[c])
    sensitive_share = float(sum(shares.get(c, 0.0) for c in sensitive_channels))
    flag = bool(dominant not in sensitive_channels and sensitive_share < 0.5)
    return {
        "flag": flag,
        "dominant_channel": dominant,
        "sensitive_share": sensitive_share,
    }


@dataclass
class WindowCoherenceResult:
    finding: str
    sensitive_windows: List[str]
    channel_shares: Dict[str, float]
    dominant_channel: Optional[str]
    channel_flag: bool
    coherence: Optional[float]
    deficit: Optional[float]
    mask_source: str
    windows_used: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding": self.finding,
            "sensitive_windows": self.sensitive_windows,
            "channel_shares": self.channel_shares,
            "dominant_channel": self.dominant_channel,
            "channel_flag": self.channel_flag,
            "coherence": self.coherence,
            "deficit": self.deficit,
            "mask_source": self.mask_source,
            "windows_used": self.windows_used,
        }


def evaluate_window_coherence(
    attr_maps: Mapping[str, np.ndarray],
    finding: str,
    *,
    brain_channel: Optional[np.ndarray] = None,
    is_hu: Optional[bool] = None,
    region_mask: Optional[np.ndarray] = None,
    boxes: Optional[Sequence[Sequence[float]]] = None,
    sensitivity: Optional[WindowSensitivityConfig] = None,
) -> WindowCoherenceResult:
    """Top-level: resolve windows, build the region mask, score coherence.

    Mask precedence: explicit ``region_mask`` → union of ``boxes`` (evaluation)
    → heuristic from ``brain_channel``. If none is available, coherence/deficit
    are ``None`` and the caller must fall back to generic coherence.
    """
    cfg = sensitivity or load_window_sensitivity()
    sens = cfg.channels_for(finding)
    shares = channel_shares(attr_maps)
    check = channel_check(shares, sens)

    mask: Optional[np.ndarray] = None
    mask_source = "none"
    if region_mask is not None:
        mask, mask_source = np.asarray(region_mask, dtype=bool), "provided"
    elif boxes:
        ref = np.asarray(next(iter(attr_maps.values())))
        mask, mask_source = boxes_mask(ref.shape, boxes), "boxes"
    elif brain_channel is not None:
        mask, mask_source = intracranial_mask(brain_channel, is_hu=is_hu), "hu-heuristic"

    if mask is None:
        return WindowCoherenceResult(
            finding=finding, sensitive_windows=sens, channel_shares=shares,
            dominant_channel=check["dominant_channel"], channel_flag=check["flag"],
            coherence=None, deficit=None, mask_source=mask_source, windows_used=[],
        )

    coh = window_specific_coherence(attr_maps, sens, mask)
    return WindowCoherenceResult(
        finding=finding,
        sensitive_windows=sens,
        channel_shares=shares,
        dominant_channel=check["dominant_channel"],
        channel_flag=check["flag"],
        coherence=coh["coherence"],
        deficit=coh["deficit"],
        mask_source=mask_source,
        windows_used=coh["windows_used"],
    )
