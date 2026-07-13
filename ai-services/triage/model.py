# SEWA XAI — ai-services/triage/model.py  (CPU Edition)
# SEWATriageModel definition for PyTorch → ONNX export ONLY.
# At inference time this file is NOT imported — the ONNX model is used directly.
#
# This file is used by:
#   1. scripts/export_models_to_onnx.py  (one-time model export pipeline)
#   2. _export_and_quantize() in main.py  (first-boot auto-export fallback)
#
# Uses EfficientNet-B0 (CPU-optimised, ~5.3M params, 224×224 input)
# instead of B4 (GPU-intended, 19M params) — identical clinical utility
# at 3× lower FLOP count on AVX-512 CPUs.

from __future__ import annotations

import os
import logging
from typing import Optional

logger = logging.getLogger("sewa-triage-model")

# ── Lazy torch import — only needed for export, not inference ──
def _get_torch():
    try:
        import torch
        return torch
    except ImportError as e:
        raise RuntimeError(
            "PyTorch not installed. Install it with:\n"
            "  pip install torch --extra-index-url https://download.pytorch.org/whl/cpu"
        ) from e


def _get_torchvision():
    try:
        import torchvision.models as models
        import torch.nn as nn
        return models, nn
    except ImportError as e:
        raise RuntimeError("torchvision not installed") from e


class SEWATriageModel:
    """
    Thin wrapper that builds an EfficientNet-B0 for export.
    Import torch lazily so this file can be parsed by IDE without torch installed.

    Backbone: EfficientNet-B0 (pretrained on ImageNet)
    Head:     Dropout(0.3) → Linear(1280, 512) → ReLU → Dropout(0.2) → Linear(512, num_classes)
    """

    def __new__(cls, num_classes: int = 14, backbone: str = "efficientnet_b0", pretrained: bool = True):
        torch = _get_torch()
        models, nn = _get_torchvision()

        class _Model(torch.nn.Module):
            def __init__(self):
                super().__init__()
                weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
                self.backbone = models.efficientnet_b0(weights=weights)
                # classifier[1] is a Linear layer — cast in_features to int explicitly
                # (type checkers can't infer Sequential index types)
                last_linear = self.backbone.classifier[-1]  # type: ignore[index]
                in_features = int(getattr(last_linear, "in_features", 1280))
                # Replace classifier with clinical head
                self.backbone.classifier = nn.Sequential(
                    nn.Dropout(p=0.3, inplace=True),
                    nn.Linear(in_features, 512),
                    nn.ReLU(inplace=True),
                    nn.Dropout(p=0.2),
                    nn.Linear(512, num_classes),
                )
                self.num_classes = num_classes

            def forward(self, x):
                return self.backbone(x)

        return _Model()


# Convenience alias for the export script
def build_model(num_classes: int = 14, backbone: str = "efficientnet_b0") -> "torch.nn.Module":  # type: ignore[name-defined]
    """Build model for ONNX export. Requires torch + torchvision installed."""
    return SEWATriageModel(num_classes=num_classes, backbone=backbone, pretrained=True)


def load_model_checkpoint(
    version: str = "v2.4.1",
    num_classes: int = 14,
    model_cache: Optional[str] = None,
) -> "torch.nn.Module":  # type: ignore[name-defined]
    """
    Load a saved PyTorch checkpoint for ONNX export.
    This is only called during the one-time model export pipeline.
    Normal inference uses the ONNX model directly (no torch needed).
    """
    torch = _get_torch()
    cache = model_cache or os.getenv("MODEL_CACHE", "/models")
    pt_path = os.path.join(cache, f"triage_{version}.pt")

    model = build_model(num_classes=num_classes)

    if os.path.exists(pt_path):
        logger.info(f"[Model] Loading checkpoint: {pt_path}")
        state = torch.load(pt_path, map_location="cpu", weights_only=True)
        # Handle DataParallel-wrapped checkpoints
        if any(k.startswith("module.") for k in state):
            state = {k.replace("module.", ""): v for k, v in state.items()}
        model.load_state_dict(state, strict=False)
        logger.info(f"[Model] Checkpoint loaded: {version}")
    else:
        logger.warning(f"[Model] No checkpoint found at {pt_path} — using pretrained ImageNet weights")

    model.eval()
    return model
