"""Data access for the RSNA feasibility subset.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Loads the cached tensor npz + split csv and yields torch tensors. Normalisation
uses per-channel mean/std fitted on the TRAIN split only (recorded), applied to all
splits. Channels are the three windowed views (brain/subdural/bone), not RGB.
"""
from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

NPZ = Path("validation/data_cache/rsna_2000_224_3win.npz")
SPLITS = Path("validation/data_subsets/splits.csv")


def load_npz():
    d = np.load(NPZ)
    return d["X"], d["y"], np.array([str(s) for s in d["ids"]])


def load_splits() -> dict:
    return {r["image_id"]: r["split"]
            for r in csv.DictReader(open(SPLITS, encoding="utf-8"))}


def split_indices():
    _X, _y, ids = load_npz()
    sp = load_splits()
    out = {"train": [], "val": [], "test": []}
    for i, iid in enumerate(ids):
        out[sp[iid]].append(i)
    return {k: np.array(v) for k, v in out.items()}


def channel_stats(train_idx):
    X, _y, _ids = load_npz()
    x = X[train_idx].astype(np.float32) / 255.0
    mean = x.reshape(-1, 3).mean(axis=0)
    std = x.reshape(-1, 3).std(axis=0)
    std[std == 0] = 1.0
    return mean.astype(np.float32), std.astype(np.float32)


def tensors(idx, mean, std):
    import torch
    X, y, _ids = load_npz()
    x = X[idx].astype(np.float32) / 255.0
    x = (x - mean) / std
    x = np.transpose(x, (0, 3, 1, 2)).copy()  # NCHW
    return torch.from_numpy(x), torch.from_numpy(y[idx]).long()
