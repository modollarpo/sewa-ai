"""Deterministic image-level train/val/test split for the RSNA subset.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

IMPORTANT LIMITATION (recorded in every report):
  RSNA-2019 released filenames by IMAGE, with no patient identifier. A true
  patient-level split is therefore IMPOSSIBLE for RSNA. These splits are grouped by
  image id, which can place slices from the same patient in different splits. This
  is a known limitation of the public dataset, not a design choice; external test on
  CQ500 (study-level) is the mitigation for the headline claim.

Split rule: stratified by binary label (any ICH), seed frozen in config/study.yaml
(split.seed = 42), ratios train/val/test = 0.70/0.15/0.15.

Outputs validation/data_subsets/splits.csv: image_id,label_any,split
Runs a leakage test (splits disjoint; every id appears exactly once) and exits
non-zero if it fails.
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

import numpy as np

MANIFEST = Path("validation/data_subsets/rsna_subset.csv")
OUT = Path("validation/data_subsets/splits.csv")
SEED = 42
RATIOS = (0.70, 0.15, 0.15)


def main() -> int:
    rows = list(csv.DictReader(open(MANIFEST, encoding="utf-8")))
    ids = np.array([r["image_id"] for r in rows])
    y = np.array([int(r["label_any"]) for r in rows], dtype=np.int64)
    rng = np.random.default_rng(SEED)

    split = np.empty(len(rows), dtype=object)
    for label in (0, 1):
        idx = np.where(y == label)[0]
        rng.shuffle(idx)
        n = len(idx)
        n_train = int(round(RATIOS[0] * n))
        n_val = int(round(RATIOS[1] * n))
        split[idx[:n_train]] = "train"
        split[idx[n_train:n_train + n_val]] = "val"
        split[idx[n_train + n_val:]] = "test"

    # leakage test
    sets = {s: set(ids[split == s]) for s in ("train", "val", "test")}
    total = sum(len(v) for v in sets.values())
    assert total == len(ids), f"coverage {total} != {len(ids)}"
    for a in sets:
        for b in sets:
            if a < b:
                assert not (sets[a] & sets[b]), f"LEAK: {a} & {b} overlap"
    assert len(set(ids)) == len(ids), "duplicate image ids in manifest"

    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["image_id", "label_any", "split"])
        for i, iid in enumerate(ids):
            w.writerow([iid, int(y[i]), split[i]])

    counts = {s: int((split == s).sum()) for s in ("train", "val", "test")}
    pos = {s: int(((split == s) & (y == 1)).sum()) for s in ("train", "val", "test")}
    print(f"wrote {OUT}")
    print(f"  sizes : {counts}")
    print(f"  pos(1): {pos}")
    print("  leakage test: PASS (disjoint, full coverage, unique ids)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
