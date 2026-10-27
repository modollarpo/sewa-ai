"""Classifier + Monte-Carlo dropout for the feasibility study.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Backbone: EfficientNet-B0 (torchvision). ImageNet weights are frozen in config; if
they cannot be downloaded (offline), we fall back to random init and RECORD that in
the run metadata (never silently claim pretrained).

MC dropout: keep Dropout layers in train() mode during inference and average N passes.
"""
from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn


def build_model(dropout: float = 0.3, pretrained: bool = True):
    import torchvision
    meta = {"pretrained": False, "weights": "random"}
    if pretrained:
        try:
            w = torchvision.models.EfficientNet_B0_Weights.IMAGENET1K_V1
            model = torchvision.models.efficientnet_b0(weights=w)
            meta = {"pretrained": True, "weights": "IMAGENET1K_V1"}
        except Exception as exc:  # noqa: BLE001
            model = torchvision.models.efficientnet_b0(weights=None)
            meta = {"pretrained": False, "weights": "random",
                    "reason": str(exc)[:120]}
    else:
        model = torchvision.models.efficientnet_b0(weights=None)
    in_f = model.classifier[1].in_features
    model.classifier = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_f, 2))
    return model, meta


def _enable_dropout(model):
    for m in model.modules():
        if isinstance(m, nn.Dropout):
            m.train()


@torch.no_grad()
def mc_predict(model, x, n_passes: int = 20):
    """Return per-sample (mean_p1, epistemic, aleatoric) from N stochastic passes.

    epistemic = variance of predicted P(class=1) across passes (prompt formula).
    aleatoric = mean of p(1-p) across passes (prompt formula).
    """
    model.eval()
    _enable_dropout(model)
    ps = np.zeros((n_passes, x.shape[0]), dtype=np.float64)
    for k in range(n_passes):
        logits = model(x)
        ps[k] = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
    mean_p = ps.mean(axis=0)
    epistemic = ps.var(axis=0)
    aleatoric = (ps * (1.0 - ps)).mean(axis=0)
    return mean_p, epistemic, aleatoric


@torch.no_grad()
def single_pass(model, x):
    model.eval()
    probs = torch.softmax(model(x), dim=1)[:, 1].cpu().numpy()
    return probs


@torch.no_grad()
def features(model, x):
    """Penultimate features (pre-classifier) for OOD distance."""
    model.eval()
    feats = model.features(x)
    feats = model.avgpool(feats)
    return torch.flatten(feats, 1).cpu().numpy()
