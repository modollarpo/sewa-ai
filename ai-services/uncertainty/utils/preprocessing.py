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
