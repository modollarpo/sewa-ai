# SEWA XAI — ai-services/uncertainty/model.py
# SEWATriageModel — EfficientNet-B0 backbone + clinical head, with MC-Dropout.
#
# ARCHITECTURE DECISION (spec-vs-code-decisions.md #5): the platform is CPU-only
# / ONNX-INT8 with no GPU node pool, and the triage service already exports
# EfficientNet-B0. Uncertainty therefore standardises on B0 (≈5.3M params, 224²)
# rather than B4 (≈19M, GPU-intended) so the same trained weights can back both
# stages and MC-Dropout stays affordable on CPU. B4 remains available for
# explicit experiments; nothing defaults to it.

import os
from pathlib import Path
from typing import List, Tuple

import torch
import torch.nn as nn
from torchvision import models

DEFAULT_BACKBONE = "efficientnet_b0"
_model_cache: dict = {}


class SEWATriageModel(nn.Module):
    """
    Clinical triage classification model.

    Backbone: EfficientNet-B0 (ImageNet-pretrained by default).
    Head: dropout → linear → ReLU → dropout → linear (num_classes findings).

    The two Dropout layers are what MC-Dropout samples over: at inference we
    re-enable them (and keep BatchNorm in eval) to draw stochastic forward
    passes, which yields a real epistemic estimate instead of an input-noise
    approximation.
    """

    def __init__(self, num_classes: int = 10, backbone: str = DEFAULT_BACKBONE, pretrained: bool = True):
        super().__init__()
        self.num_classes = num_classes
        self.backbone_name = backbone
        self._pool = nn.AdaptiveAvgPool2d(1)

        if backbone == "efficientnet_b0":
            weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
            self.backbone = models.efficientnet_b0(weights=weights)
            in_features = self.backbone.classifier[1].in_features
        elif backbone == "efficientnet_b4":
            weights = models.EfficientNet_B4_Weights.IMAGENET1K_V1 if pretrained else None
            self.backbone = models.efficientnet_b4(weights=weights)
            in_features = self.backbone.classifier[1].in_features
        elif backbone == "resnet50":
            weights = models.ResNet50_Weights.IMAGENET1K_V2 if pretrained else None
            self.backbone = models.resnet50(weights=weights)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = self._clinical_head(in_features, num_classes)
            return
        else:
            raise ValueError(f"Unsupported backbone: {backbone}")

        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.3),
            nn.Linear(512, num_classes),
        )

    @staticmethod
    def _head(in_features: int, num_classes: int) -> nn.Sequential:
        return nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def embed(self, x: torch.Tensor) -> torch.Tensor:
        """Penultimate feature vector — the pooled output before the classifier.

        Uses a forward hook on the backbone's own avgpool so it works for both
        EfficientNet and ResNet without hard-coding their feature extractors.
        """
        captured: dict = {}

        def _capture(_module, _inp, out):
            captured["f"] = out

        handle = self.backbone.avgpool.register_forward_hook(_capture)  # type: ignore[attr-defined]
        try:
            with torch.no_grad():
                self.backbone(x)
        finally:
            handle.remove()
        return torch.flatten(captured["f"], 1)

    def enable_mc_dropout(self) -> None:
        """Dropout active, BatchNorm frozen — the correct MC-Dropout regime."""
        self.eval()
        for module in self.modules():
            if isinstance(module, nn.Dropout):
                module.train()


def mc_dropout_predict(
    model: SEWATriageModel, x: torch.Tensor, passes: int
) -> Tuple[torch.Tensor, torch.Tensor]:
    """Real MC-Dropout: `passes` stochastic forward passes with dropout active.

    Returns (mean_probs, std_probs), each shape (num_classes,).
    """
    model.enable_mc_dropout()
    preds: List[torch.Tensor] = []
    with torch.no_grad():
        for _ in range(max(1, passes)):
            preds.append(torch.softmax(model(x), dim=1)[0])
    stacked = torch.stack(preds, dim=0)  # (passes, num_classes)
    return stacked.mean(dim=0), stacked.std(dim=0)


def load_model(
    version: str,
    backbone: str = DEFAULT_BACKBONE,
    num_classes: int = 10,
) -> Tuple[SEWATriageModel, bool]:
    """Load (or build) the uncertainty model.

    Returns (model, weights_loaded). weights_loaded is False when no checkpoint
    was found, i.e. the model is on random/backbone-initialised weights and the
    caller must treat its outputs as demo.
    """
    key = f"{backbone}:{num_classes}:{version}"
    if key in _model_cache:
        return _model_cache[key]

    # pretrained=False: never fetch ImageNet weights at boot. If a checkpoint
    # exists it supplies every weight; if not, the random-init model is an
    # honest demo scaffold (caller sees weights_loaded=False and labels demo).
    model = SEWATriageModel(num_classes=num_classes, backbone=backbone, pretrained=False)
    checkpoint = Path(os.getenv("MODEL_CACHE", "/models")) / f"triage_{version}_{backbone}.pt"
    weights_loaded = False
    if checkpoint.exists():
        state = torch.load(str(checkpoint), map_location="cpu")
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        state = {k.replace("module.", ""): v for k, v in state.items()}
        model.load_state_dict(state, strict=False)
        weights_loaded = True

    model.eval()
    model.to("cpu")
    _model_cache[key] = (model, weights_loaded)
    return _model_cache[key]
