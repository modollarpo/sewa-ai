"""Shared library for the v2 (amendment 1) reduced-compute feasibility run.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Everything here implements the frozen amendment:
docs/evidence/preregistration_v2_amendment1.md
- 160x160 inputs (downsampled from cached 224 3-window tiles)
- EfficientNet-B0; early feature blocks frozen (cached), last `K_LATE` blocks + head trained
- study score = mean of top-3 slice probabilities; signals aggregated over the same top-3
- MC dropout N=20 on the head (dropout lives only in the classifier)
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

TILES = Path(os.environ.get("SEWA_TILES_DIR", "validation/data_cache/tiles"))
SLICES_JSON = Path(os.environ.get("SEWA_SLICES_JSON", "validation/scripts/step1b_slices_v2.json"))
SIZE = 160
K_LATE = 6
TOPK = 3
SEED = 42
REVIEW_RATES = [0.05, 0.10, 0.20, 0.30]
U_MAX = 0.15
K_NOMINAL = 4096.0  # nominal photons/pixel for simulated low-dose Poisson (kappa scales this)


# ---------------------------------------------------------------- data
def load_splits():
    return json.loads(SLICES_JSON.read_text(encoding="utf-8"))["splits"]


def load_tile160(image_id: str) -> torch.Tensor:
    """Load cached 224 tile, downsample to 160, return float CHW in [0,1]."""
    arr = np.load(TILES / f"{image_id}.npy")
    t = torch.from_numpy(arr).permute(2, 0, 1).float().unsqueeze(0) / 255.0
    t = F.interpolate(t, size=(SIZE, SIZE), mode="bilinear", align_corners=False)
    return t[0]


def tiles_present(entries) -> bool:
    return all((TILES / f"{e['image_id']}.npy").exists() for e in entries)


# ---------------------------------------------------------------- model split
def split_model(model, k: int = K_LATE):
    n = len(model.features)
    early = nn.Sequential(*[model.features[i] for i in range(n - k)])
    late = nn.Sequential(*[model.features[i] for i in range(n - k, n)])
    return early, late


@torch.no_grad()
def early_features(early, x: torch.Tensor) -> torch.Tensor:
    return early(x)


@torch.no_grad()
def late_outputs(model, late, early_out: torch.Tensor):
    """Return (penult[1280], logits[2]) for eval given cached early features."""
    model.eval()
    f = late(early_out)
    penult = torch.flatten(model.avgpool(f), 1)
    logits = model.classifier(penult)
    return penult, logits


@torch.no_grad()
def mc_head(classifier, penult: torch.Tensor, n: int = 20):
    """MC dropout over the HEAD only (dropout lives only in the classifier).

    Returns (mean_p1, epistemic, aleatoric) per row of penult.
    """
    classifier.train()  # dropout on
    ps = np.zeros((n, penult.shape[0]), dtype=np.float64)
    for k in range(n):
        ps[k] = torch.softmax(classifier(penult), dim=1)[:, 1].cpu().numpy()
    classifier.eval()
    mean_p = ps.mean(axis=0)
    epistemic = ps.var(axis=0)
    aleatoric = (ps * (1.0 - ps)).mean(axis=0)
    return mean_p, epistemic, aleatoric


# ---------------------------------------------------------------- corruptions (test-time)
def corrupt(x: torch.Tensor, kind: str, level: int) -> torch.Tensor:
    """Apply a test-time corruption to a CHW float tensor in [0,1].

    noise: Gaussian sigma in {0.05,0.10,0.20}
    blur : gaussian sigma in {1.0,2.0,4.0} (pixels, 160px domain)
    lowdose: Poisson with effective photon scale k in {1000,400,150}
    """
    if kind == "noise":
        sigma = (0.05, 0.10, 0.20)[level]
        g = torch.Generator().manual_seed(SEED + level)
        return (x + torch.randn(x.shape, generator=g) * sigma).clamp(0, 1)
    if kind == "blur":
        from scipy.ndimage import gaussian_filter
        sigma = (1.0, 2.0, 4.0)[level]
        arr = x.numpy()
        out = np.stack([gaussian_filter(arr[c], sigma=sigma) for c in range(arr.shape[0])])
        return torch.from_numpy(out).float().clamp(0, 1)
    if kind == "lowdose":
        # kappa in {0.5,0.25,0.125} of nominal photons (frozen amendment A: kappa, not absolute k)
        kappa = (0.5, 0.25, 0.125)[level]
        k = K_NOMINAL * kappa
        rng = np.random.default_rng(SEED + level)
        arr = x.numpy()
        out = rng.poisson(np.clip(arr, 0, None) * k) / k
        return torch.from_numpy(out).float().clamp(0, 1)
    raise ValueError(kind)


CORRUPTIONS = [("noise", i) for i in range(3)] + \
              [("blur", i) for i in range(3)] + \
              [("lowdose", i) for i in range(3)]


# ---------------------------------------------------------------- aggregation
def aggregate_topk(study_ids, probs, values, topk: int = TOPK):
    """Per-study mean of `values` over the `topk` slices by prob (descending)."""
    study_ids = np.asarray(study_ids)
    probs = np.asarray(probs, dtype=float)
    values = np.asarray(values, dtype=float)
    out_studies, out_vals = [], []
    for s in dict.fromkeys(study_ids.tolist()):
        m = study_ids == s
        idx = np.where(m)[0]
        order = idx[np.argsort(-probs[idx])][:topk]
        out_studies.append(s)
        out_vals.append(float(values[order].mean()))
    return out_studies, np.array(out_vals, dtype=float)


def study_labels(study_ids, labels):
    study_ids = np.asarray(study_ids)
    labels = np.asarray(labels, dtype=int)
    out = {}
    for s, l in zip(study_ids, labels):
        out[s] = max(out.get(s, 0), int(l))
    return out


# ---------------------------------------------------------------- temperature
def fit_temperature(probs, y):
    from scipy.optimize import minimize_scalar
    p = np.clip(np.asarray(probs, float), 1e-6, 1 - 1e-6)
    z = np.log(p / (1 - p))
    y = np.asarray(y, float)

    def nll(logT):
        q = 1.0 / (1.0 + np.exp(-z / np.exp(logT)))
        q = np.clip(q, 1e-9, 1 - 1e-9)
        return -np.mean(y * np.log(q) + (1 - y) * np.log(1 - q))

    return float(np.exp(minimize_scalar(nll, bounds=(-3.0, 3.0), method="bounded").x))


def apply_temperature(probs, T):
    p = np.clip(np.asarray(probs, float), 1e-6, 1 - 1e-6)
    z = np.log(p / (1 - p))
    return 1.0 / (1.0 + np.exp(-z / T))


# ---------------------------------------------------------------- Grad-CAM (C3 proxy)
def gradcam_inside_fraction(model, x: torch.Tensor, brain_thresh: float = 0.05):
    """Grad-CAM mass inside the intracranial mask for a single CHW tensor.

    x: (1,3,160,160) float in [0,1]; channel 0 is the brain window, used as a
    coarse intracranial mask. Returns (inside_fraction, raw_mass). PARTIAL proxy.
    """
    model.eval()
    x = x.detach()
    feats = model.features(x)
    feats.retain_grad()
    penult = torch.flatten(model.avgpool(feats), 1)
    logits = model.classifier(penult)
    cls = int(logits.argmax(1).item())
    grads = torch.autograd.grad(logits[0, cls], feats)[0]
    w = grads.mean(dim=(2, 3), keepdim=True)
    cam = F.relu((w * feats).sum(1, keepdim=True))
    cam = F.interpolate(cam, size=x.shape[-2:], mode="bilinear", align_corners=False)[0, 0]
    mask = (x[0, 0] > brain_thresh).float()
    total = float(cam.sum())
    inside = float((cam * mask).sum())
    frac = inside / total if total > 0 else float("nan")
    return frac, total
