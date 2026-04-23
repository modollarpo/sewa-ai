# SEWA AI — ai-services/triage/utils/preprocessing.py  (CPU Edition)
# Pure numpy/opencv preprocessing — NO torch dependency at inference time.
# torchvision.transforms replaced with equivalent numpy operations.
# Saves ~50ms startup latency (no transform JIT compilation on cold start).

import numpy as np
import cv2
from typing import Tuple

# HU window presets for CT (Hounsfield Units)
WINDOW_PRESETS: dict = {
    "CT_Head":    {"ww": 80,   "wc": 40},     # Brain window
    "CT_Chest":   {"ww": 1500, "wc": -600},   # Lung window
    "CT_Abdomen": {"ww": 400,  "wc": 40},     # Abdominal window
    "CT_Bone":    {"ww": 2000, "wc": 400},    # Bone window
    "MRI_Brain":  {"ww": 300,  "wc": 150},    # MRI soft tissue
    "MRI_Spine":  {"ww": 500,  "wc": 250},
    "XR_Chest":   {"ww": 2048, "wc": 1024},   # X-ray full range
    "default":    {"ww": 400,  "wc": 40},
}

# ImageNet normalisation constants
_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def apply_window(image: np.ndarray, ww: float, wc: float) -> np.ndarray:
    """Apply HU windowing to CT image, returning uint8 [0-255]."""
    lower = wc - ww / 2.0
    upper = wc + ww / 2.0
    windowed = np.clip(image.astype(np.float32), lower, upper)
    if upper > lower:
        windowed = (windowed - lower) / (upper - lower) * 255.0
    return windowed.astype(np.uint8)


def preprocess_scan(
    image: np.ndarray,
    modality: str,
    body_part: str,
    target_size: int = 224,
) -> np.ndarray:
    """
    Preprocess a medical image for ONNX inference.
    Returns a float32 CHW numpy array (C, H, W), normalised with ImageNet stats.
    Shape: (3, 224, 224) — ready for np.newaxis batching before ORT.run().

    No torch dependency — pure numpy + OpenCV implementation.
    Equivalent to torchvision.transforms: ToTensor() + Normalize(ImageNet).
    """
    key = f"{modality}_{body_part}"
    preset = WINDOW_PRESETS.get(key, WINDOW_PRESETS["default"])

    # 1. Apply modality-specific windowing / normalisation
    if modality == "CT":
        image = apply_window(image.astype(np.float32), preset["ww"], preset["wc"])
    else:
        img_f = image.astype(np.float32)
        lo, hi = img_f.min(), img_f.max()
        if hi > lo:
            image = ((img_f - lo) / (hi - lo) * 255.0).astype(np.uint8)
        else:
            image = np.zeros_like(image, dtype=np.uint8)

    # 2. Resize to model input size
    resized = cv2.resize(image, (target_size, target_size), interpolation=cv2.INTER_LINEAR)
    # cv2.resize returns None if input is invalid — guard defensively
    image = resized if resized is not None else np.zeros((target_size, target_size), dtype=np.uint8)

    # 3. Ensure 3-channel RGB
    if image.ndim == 2:
        image = np.stack([image, image, image], axis=-1)          # (H, W) → (H, W, 3)
    elif image.ndim == 3 and image.shape[-1] == 1:
        image = np.repeat(image, 3, axis=-1)                      # (H, W, 1) → (H, W, 3)
    elif image.ndim == 3 and image.shape[-1] > 3:
        image = image[:, :, :3]                                    # drop alpha / extra channels

    # 4. HWC uint8 → CHW float32 in [0, 1], then ImageNet-normalise
    chw = image.transpose(2, 0, 1).astype(np.float32) / 255.0    # (3, H, W)
    chw = (chw - _MEAN[:, None, None]) / _STD[:, None, None]     # normalise each channel

    return chw.astype(np.float32)                                  # (3, 224, 224)


def batch_preprocess(
    images: list,
    modality: str,
    body_part: str,
    target_size: int = 224,
) -> np.ndarray:
    """Stack a list of images into a batch tensor (N, 3, H, W) for micro-batching."""
    processed = [preprocess_scan(img, modality, body_part, target_size) for img in images]
    return np.stack(processed, axis=0)
