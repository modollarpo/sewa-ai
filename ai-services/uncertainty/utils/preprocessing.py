# SEWA XAI — ai-services/triage/utils/preprocessing.py
import numpy as np
import torch
import torchvision.transforms as T
import cv2
from typing import Optional

# HU window presets for CT (Hounsfield Units)
WINDOW_PRESETS = {
    "CT_Head":    {"ww": 80,   "wc": 40},    # Brain window
    "CT_Chest":   {"ww": 1500, "wc": -600},  # Lung window
    "CT_Abdomen": {"ww": 400,  "wc": 40},    # Abdominal window
    "CT_Bone":    {"ww": 2000, "wc": 400},   # Bone window
    "MRI_Brain":  {"ww": 300,  "wc": 150},   # MRI soft tissue
    "MRI_Spine":  {"ww": 500,  "wc": 250},
    "XR_Chest":   {"ww": 2048, "wc": 1024},  # X-ray full range
    "default":    {"ww": 400,  "wc": 40},
}

# ── Multi-window CT channels (window-specific coherence) ─────────────────────
# Three reconstruction windows a radiologist reads, in tensor order. Used ONLY
# by the (off-by-default) window-specific coherence ablation: the classifier was
# trained on a single window replicated to RGB, so attributing a genuine
# brain/subdural/bone tensor is deliberately out-of-distribution and is a
# documented limitation of that experiment. See docs/spec-vs-code-decisions.md.
CT_MULTIWINDOW_PRESETS = {
    "brain":    {"ww": 80,   "wc": 40},    # soft-tissue brain window
    "subdural": {"ww": 130,  "wc": 50},    # subdural / acute blood window
    "bone":     {"ww": 2000, "wc": 400},   # bone window
}
CT_WINDOW_ORDER = ("brain", "subdural", "bone")


def _pseudo_windows_8bit(img: np.ndarray) -> dict:
    """Approximate the three CT windows from an 8-bit (non-HU) image.

    Displayed 8-bit CT has already been windowed, so true HU reconstruction is
    impossible. We apply monotone level curves as a documented heuristic.
    """
    p2, p98 = np.percentile(img, 2), np.percentile(img, 98)
    span = max(1.0, float(p98 - p2))
    n = np.clip((img - p2) / span, 0.0, 1.0)
    return {
        "brain": n,
        "subdural": np.clip((n - 0.15) / 0.5, 0.0, 1.0),
        "bone": np.clip((n - 0.5) / 0.5, 0.0, 1.0),
    }


def build_ct_window_channels(
    image: np.ndarray,
    target_size: int = 224,
) -> tuple:
    """Return ``(channels, is_hu)`` — brain/subdural/bone maps in [0,1].

    ``is_hu`` is True when the input carries true Hounsfield values (DICOM path)
    and False for an already-windowed 8-bit image (PNG path). Each channel is
    resized to ``target_size``². Heuristic; not validated.
    """
    img = np.asarray(image, dtype=np.float32)
    is_hu = bool(img.min() < 0 or img.max() > 255)

    channels: dict = {}
    if is_hu:
        for name in CT_WINDOW_ORDER:
            preset = CT_MULTIWINDOW_PRESETS[name]
            w = apply_window(img, preset["ww"], preset["wc"]).astype(np.float32) / 255.0
            channels[name] = w
    else:
        channels = _pseudo_windows_8bit(img)

    for name in CT_WINDOW_ORDER:
        channels[name] = cv2.resize(
            channels[name], (target_size, target_size), interpolation=cv2.INTER_LINEAR
        ).astype(np.float32)
    return channels, is_hu


def stack_ct_windows(channels: dict, target_size: int = 224) -> torch.Tensor:
    """Stack brain/subdural/bone channels into an ImageNet-normalised (3,H,W)."""
    arr = np.stack([channels[n] for n in CT_WINDOW_ORDER], axis=-1)  # HWC in [0,1]
    transform = T.Compose([
        T.ToTensor(),  # HWC → CHW (values already 0–1; ToTensor keeps them)
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return transform(arr)

def apply_window(image: np.ndarray, ww: float, wc: float) -> np.ndarray:
    """Apply HU windowing to CT image."""
    lower = wc - ww / 2
    upper = wc + ww / 2
    windowed = np.clip(image, lower, upper)
    # Normalise to 0–255
    if upper > lower:
        windowed = (windowed - lower) / (upper - lower) * 255.0
    return windowed.astype(np.uint8)

def preprocess_scan(
    image: np.ndarray,
    modality: str,
    body_part: str,
    target_size: int = 224,
) -> torch.Tensor:
    """
    Preprocess a medical image for model inference.
    Applies windowing, normalisation, channel expansion, and resizing.
    """
    key = f"{modality}_{body_part}"
    preset = WINDOW_PRESETS.get(key, WINDOW_PRESETS["default"])

    # Apply windowing for CT
    if modality == "CT":
        image = apply_window(image.astype(np.float32), preset["ww"], preset["wc"])
    else:
        # Normalise other modalities to 0–255
        if image.max() > image.min():
            image = ((image - image.min()) / (image.max() - image.min()) * 255).astype(np.uint8)

    # Resize to model input size
    image = cv2.resize(image, (target_size, target_size), interpolation=cv2.INTER_LINEAR)

    # Convert grayscale to 3-channel RGB (EfficientNet expects 3 channels)
    if image.ndim == 2:
        image = np.stack([image, image, image], axis=-1)
    elif image.shape[-1] == 1:
        image = np.repeat(image, 3, axis=-1)

    # ImageNet normalisation
    transform = T.Compose([
        T.ToTensor(),  # HWC → CHW, 0–255 → 0.0–1.0
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return transform(image)
