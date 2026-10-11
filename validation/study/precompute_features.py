"""Precompute frozen EfficientNet-B0 features for the RSNA subset.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

CPU-ONLY DEVIATION (documented in docs/spec-vs-code-decisions.md): fine-tuning the
whole EfficientNet-B0 backbone costs ~13 min/epoch on this 4-core box. Instead we use
the pretrained backbone as a FROZEN feature extractor and train a small dropout head
(validation/study/train_head.py). This is a standard transfer-learning probe; it is
recorded as such and never described as full fine-tuning.
"""
from __future__ import annotations

import time
from pathlib import Path

import numpy as np

from validation.study import data as datamod
from validation.study.model import build_model

CACHE = Path("validation/data_cache/features_b0.npz")


def main() -> int:
    import torch
    torch.set_num_threads(4)
    X, y, ids = datamod.load_npz()
    idx = datamod.split_indices()
    mean, std = datamod.channel_stats(idx["train"])

    model, meta = build_model(dropout=0.3, pretrained=True)
    model.eval()
    print(f"backbone meta: {meta}; images {len(X)}", flush=True)

    feats = np.zeros((len(X), 1280), dtype=np.float32)
    t0 = time.time()
    bs = 64
    with torch.no_grad():
        for b in range(0, len(X), bs):
            xb = datamod.tensors(np.arange(b, min(b + bs, len(X))), mean, std)[0]
            f = model.features(xb)
            f = model.avgpool(f)
            feats[b:b + len(xb)] = torch.flatten(f, 1).numpy()
            if (b // bs) % 5 == 0:
                print(f"  {b+len(xb)}/{len(X)} ({time.time()-t0:.0f}s)", flush=True)

    CACHE.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(CACHE, feats=feats, y=y, ids=ids,
                        mean=np.array(mean), std=np.array(std), meta=np.array([str(meta)]))
    print(f"wrote {CACHE} ({CACHE.stat().st_size/1e6:.1f} MB) in {time.time()-t0:.0f}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
