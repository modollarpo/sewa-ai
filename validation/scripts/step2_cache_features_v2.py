"""Step 2 (v2 amendment 1): cache frozen early-layer features for train/val/test.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import torch

from validation.study.model import build_model
from validation.scripts import v2_lib as L


def main() -> int:
    torch.set_num_threads(2)
    model, meta = build_model(dropout=0.3, pretrained=True)
    model.eval()
    early, _late = L.split_model(model)
    print("pretrained:", meta, flush=True)

    splits = L.load_splits()
    outdir = Path(os.environ.get("SEWA_CACHE_DIR", "validation/data_cache"))
    for split in ("train", "val", "test"):
        entries = splits[split]
        missing = [e["image_id"] for e in entries if not (L.TILES / f"{e['image_id']}.npy").exists()]
        if missing:
            print(f"[{split}] MISSING {len(missing)} tiles, e.g. {missing[:3]} -> abort", flush=True)
            return 1
        feats, ids, studies, labels = [], [], [], []
        for n, e in enumerate(entries):
            x = L.load_tile160(e["image_id"]).unsqueeze(0)
            f = L.early_features(early, x)[0].numpy().astype(np.float32)
            feats.append(f)
            ids.append(e["image_id"])
            studies.append(e["study"])
            labels.append(e["label"])
            if (n + 1) % 1000 == 0:
                print(f"  {split} {n+1}/{len(entries)}", flush=True)
        A = np.stack(feats)
        np.savez(outdir / f"v2_early_{split}.npz", feats=A, ids=np.array(ids),
                 studies=np.array(studies), labels=np.array(labels))
        print(f"[{split}] cached {A.shape} -> v2_early_{split}.npz", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
