# SEWA AI — ai-services/triage/model.py
# SEWATriageModel — EfficientNet-B4 backbone + custom clinical head
# Supports multi-label classification across 8 condition categories per modality

import os
import torch
import torch.nn as nn
from torchvision import models
from typing import Optional

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model_cache: dict = {}

class SEWATriageModel(nn.Module):
    """
    Clinical triage classification model.
    Backbone: EfficientNet-B4 (pretrained on ImageNet).
    Head: dropout + linear → num_classes conditions.
    
    In production, the backbone is fine-tuned on:
    - CheXpert (chest X-ray)
    - RSNA Intracranial Hemorrhage
    - LUNA16 (CT lung)
    - BraTS (brain MRI)
    - Custom NHS/Africa datasets
    """

    def __init__(self, num_classes: int = 10, backbone: str = "efficientnet_b4", pretrained: bool = True):
        super().__init__()
        self.num_classes = num_classes
        self.backbone_name = backbone

        if backbone == "efficientnet_b4":
            weights = models.EfficientNet_B4_Weights.IMAGENET1K_V1 if pretrained else None
            self.backbone = models.efficientnet_b4(weights=weights)
            in_features = self.backbone.classifier[1].in_features
            # Replace classifier with clinical head
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=0.4, inplace=True),
                nn.Linear(in_features, 512),
                nn.ReLU(inplace=True),
                nn.Dropout(p=0.3),
                nn.Linear(512, num_classes),
            )
        elif backbone == "resnet50":
            weights = models.ResNet50_Weights.IMAGENET1K_V2 if pretrained else None
            self.backbone = models.resnet50(weights=weights)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Sequential(
                nn.Dropout(p=0.4),
                nn.Linear(in_features, num_classes),
            )
        else:
            raise ValueError(f"Unsupported backbone: {backbone}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        with torch.no_grad():
            logits = self.forward(x)
            return torch.softmax(logits, dim=1)


def load_model(version: str = "v2.4.1", num_classes: int = 10) -> SEWATriageModel:
    """Load model from cache or disk."""
    if version in _model_cache:
        return _model_cache[version]

    model = SEWATriageModel(num_classes=num_classes, backbone="efficientnet_b4", pretrained=True)
    model_path = os.path.join(os.getenv("MODEL_CACHE", "/models"), f"triage_{version}.pt")

    if os.path.exists(model_path):
        state = torch.load(model_path, map_location=DEVICE)
        # Handle DataParallel wrapped checkpoints
        if any(k.startswith("module.") for k in state.keys()):
            state = {k.replace("module.", ""): v for k, v in state.items()}
        model.load_state_dict(state, strict=False)

    model.eval()
    model.to(DEVICE)
    _model_cache[version] = model
    return model
