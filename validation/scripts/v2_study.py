"""Shared v2 (amendment 1) pipeline: load checkpoint, per-slice signals, study aggregation.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
Study-level everything: score = mean of top-3 slice probs; signals aggregated over the
same top-3 slices; temperature fitted on validation study-level scores.
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import torch

from validation.study import signals as S
from validation.study.model import build_model
from validation.scripts import v2_lib as L

CACHE = Path(os.environ.get("SEWA_CACHE_DIR", "validation/data_cache"))


def load_model(ckpt_path):
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    model, _ = build_model(dropout=0.3, pretrained=True)
    early, late = L.split_model(model)
    late.load_state_dict(ckpt["late"])
    model.classifier.load_state_dict(ckpt["clf"])
    model.eval()
    early.eval()
    late.eval()
    return model, early, late, float(ckpt["temperature"])


def load_cache(split):
    z = np.load(CACHE / f"v2_early_{split}.npz", allow_pickle=False)
    return (torch.from_numpy(z["feats"]), [str(s) for s in z["ids"]],
            [str(s) for s in z["studies"]], z["labels"].astype(int))


@torch.no_grad()
def _penult_logits(model, late, feats):
    pen, log = [], []
    for i in range(0, feats.shape[0], 256):
        f = late(feats[i:i + 256])
        pn = torch.flatten(model.avgpool(f), 1)
        pen.append(pn)
        log.append(model.classifier(pn))
    return torch.cat(pen), torch.cat(log)


def fit_ood(model, late, split="train"):
    feats, _ids, _st, y = load_cache(split)
    pen, _ = _penult_logits(model, late, feats)
    return S.MahalanobisOOD().fit(pen.numpy(), y)


def slice_signals(model, late, feats, T, ood):
    """Return per-slice dict of numpy arrays (len = n slices)."""
    pen, log = _penult_logits(model, late, feats)
    p_raw = torch.softmax(log, 1)[:, 1].numpy()
    p = L.apply_temperature(p_raw, T)
    mp, epi, ale = L.mc_head(model.classifier, pen, n=20)
    out = {
        "prob": p,
        "B1": S.risk_max_softmax(p),
        "B2": S.risk_entropy(p),
        "C1": S.normalized_U(epi, ale),
        "C2": ood.score(pen.numpy()),
        "C4": S.risk_conflict(p, epi, ale),
    }
    return out


def compute_gradcam_risk(model, ids, x_provider, progress_every=200):
    """Per-slice C3 risk = 1 - (Grad-CAM mass inside brain mask). Partial proxy."""
    frac = np.full(len(ids), np.nan, dtype=float)
    for n, sid in enumerate(ids):
        x = x_provider(sid).unsqueeze(0)
        f, mass = L.gradcam_inside_fraction(model, x)
        if mass > 0:
            frac[n] = f
        if (n + 1) % progress_every == 0:
            print(f"    gradcam {n+1}/{len(ids)}", flush=True)
    return 1.0 - frac


def study_signals(p_studies, p_labels, sl):
    """sl: dict of per-slice arrays keyed by signal name. Returns study-level dict."""
    keys = [k for k in ("B1", "B2", "C1", "C2", "C4", "C3") if k in sl]
    lab = L.study_labels(p_studies, p_labels)
    study, prob = L.aggregate_topk(p_studies, sl["prob"], sl["prob"])
    sig = {"study": study, "prob": prob, "y": np.array([lab[s] for s in study])}
    for k in keys:
        _s, v = L.aggregate_topk(p_studies, sl["prob"], sl[k])
        sig[k] = v
    return sig

