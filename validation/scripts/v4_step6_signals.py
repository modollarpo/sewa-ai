"""v4 Step 6a: cache study-level classifier signals for the v4 val/test sets.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

For each split (val, test) and each condition (clean + 9 frozen corruptions) computes
the v2a1 study-level signals (prob, B1, B2, C1, C2, C4) with the frozen temperature and
OOD scorer, and saves them to validation/reports/v4_signals_<split>.npz. Resumable: a
split already written is skipped.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch

from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS

SLICES = Path("validation/scripts/step1b_slices_v4.json")
OUT = Path("validation/reports")


def slice_signals_from_tiles(model, early, late, entries, T, ood, kind, level):
    feats = []
    for e in entries:
        x = L.load_tile160(e["image_id"]).unsqueeze(0)
        if kind is not None:
            x = L.corrupt(x[0], kind, level).unsqueeze(0)
        feats.append(L.early_features(early, x))
    return VS.slice_signals(model, late, torch.cat(feats, 0), T, ood)


def main() -> int:
    torch.set_num_threads(2)
    OUT.mkdir(parents=True, exist_ok=True)
    model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")
    ood = VS.fit_ood(model, late, "train")
    slices = json.loads(SLICES.read_text(encoding="utf-8"))["splits"]

    for split in ("val", "test"):
        dst = OUT / f"v4_signals_{split}.npz"
        if dst.exists():
            print(f"skip {split} (exists)", flush=True)
            continue
        entries = slices[split]
        studies = np.array([e["study"] for e in entries])
        labels = np.array([e["label"] for e in entries], dtype=int)
        store = {}
        order = None
        for name, kind, level in [("clean", None, None)] + [(f"{k}_{l}", k, l) for k, l in L.CORRUPTIONS]:
            sl = slice_signals_from_tiles(model, early, late, entries, T, ood, kind, level)
            sig = VS.study_signals(studies, labels, sl)
            order = list(sig["study"])
            for key in ("prob", "B1", "B2", "C1", "C2", "C4"):
                store[f"{name}|{key}"] = sig[key].astype(float)
            store["y"] = sig["y"].astype(int)
            print(f"{split} {name} done", flush=True)
        store["studies"] = np.array(order)
        np.savez(dst, **store)
        print(f"wrote {dst}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
