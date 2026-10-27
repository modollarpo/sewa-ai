"""Step 8 (v3): draw a FRESH shift-test scan set disjoint from train/val/test.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

The v2 study used 800 scans from the 1,893-study RSNA 2000-image subset. This draws
120 NEW scans (60 positive / 60 negative by the subset label) from the 1,093 studies
NOT used in v2 (disjoint from train/val/test and from the feature/tile cache), with a
different seed. Writes validation/scripts/step2_manifest_v3.json.
"""
from __future__ import annotations

import json
import random
import zipfile
from collections import defaultdict
from pathlib import Path

import pandas as pd

SPLIT_SEED = 43
TARGET_SCANS = 120
V2_MANIFEST = Path("validation/scripts/step2_manifest_v2.json")
OUT = Path("validation/scripts/step2_manifest_v3.json")


def main() -> int:
    used = set()
    v2 = json.loads(V2_MANIFEST.read_text(encoding="utf-8"))
    for sp in ("train", "val", "test"):
        used |= set(v2[sp]["study_uids"])

    sub = pd.read_csv("validation/data_subsets/rsna_subset.csv")
    with zipfile.ZipFile("validation/data_cache/stage_2_train_with_metadata.csv.zip") as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            meta = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID"])
    merged = sub.merge(meta, left_on="image_id", right_on="SOPInstanceUID", how="inner")
    study_lab: dict[str, list[int]] = defaultdict(list)
    for s, l in zip(merged["StudyInstanceUID"], merged["label_any"]):
        study_lab[s].append(int(l))
    scan_pos = {s: any(v == 1 for v in vs) for s, vs in study_lab.items()}

    remain = [s for s in scan_pos if s not in used]
    pos = sorted(s for s in remain if scan_pos[s])
    neg = sorted(s for s in remain if not scan_pos[s])

    rng = random.Random(SPLIT_SEED)
    rng.shuffle(pos)
    rng.shuffle(neg)
    pos_n = min(TARGET_SCANS // 2, len(pos))
    sampled = pos[:pos_n] + neg[: TARGET_SCANS - pos_n]
    rng.shuffle(sampled)

    assert len(set(sampled)) == len(sampled)
    assert not (set(sampled) & used), "leakage: a v3 scan is in a v2 split"

    n_pos = sum(1 for s in sampled if scan_pos[s])
    manifest = {
        "seed": SPLIT_SEED,
        "grouping_key": "StudyInstanceUID",
        "disjoint_from": "step2_manifest_v2.json (train/val/test) and the feature/tile cache",
        "pool": {"available": len(remain), "pos": len(pos), "neg": len(neg)},
        "shift": {"scans": len(sampled), "positive_scans": n_pos,
                  "negative_scans": len(sampled) - n_pos},
        "study_uids": sorted(sampled),
    }
    OUT.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"available pool={len(remain)} (pos={len(pos)}, neg={len(neg)})")
    print(f"wrote {OUT}: {len(sampled)} scans (pos={n_pos}, neg={len(sampled) - n_pos})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
