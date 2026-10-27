"""v4 Step 4: draw FRESH scans disjoint from v2 train/val/test AND the v3 set.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Pool = 1,893-study RSNA subset minus v2's 800 minus v3's 120. Draws 300 new scans
(150 pos / 150 neg by subset label), split 120 val (fit D2N weights) / 180 test.
Grouping key = StudyInstanceUID. Writes validation/scripts/step2_manifest_v4.json.
"""
from __future__ import annotations

import json
import random
import zipfile
from collections import defaultdict
from pathlib import Path

import pandas as pd

SEED = 44
N_VAL, N_TEST = 120, 180
V2 = Path("validation/scripts/step2_manifest_v2.json")
V3 = Path("validation/scripts/step2_manifest_v3.json")
OUT = Path("validation/scripts/step2_manifest_v4.json")


def main() -> int:
    used = set()
    v2 = json.loads(V2.read_text(encoding="utf-8"))
    for sp in ("train", "val", "test"):
        used |= set(v2[sp]["study_uids"])
    v3 = json.loads(V3.read_text(encoding="utf-8"))
    used |= set(v3["study_uids"])

    sub = pd.read_csv("validation/data_subsets/rsna_subset.csv")
    with zipfile.ZipFile("validation/data_cache/stage_2_train_with_metadata.csv.zip") as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            meta = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID"])
    m = sub.merge(meta, left_on="image_id", right_on="SOPInstanceUID", how="inner")
    lab: dict[str, list[int]] = defaultdict(list)
    for s, l in zip(m["StudyInstanceUID"], m["label_any"]):
        lab[s].append(int(l))
    scan_pos = {s: any(v == 1 for v in vs) for s, vs in lab.items()}

    remain = [s for s in scan_pos if s not in used]
    pos = sorted(s for s in remain if scan_pos[s])
    neg = sorted(s for s in remain if not scan_pos[s])

    rng = random.Random(SEED)
    rng.shuffle(pos)
    rng.shuffle(neg)
    vp, tp = pos[:60], pos[60:150]
    vn, tn = neg[:60], neg[60:150]
    val, test = vp + vn, tp + tn
    assert len(val) == N_VAL and len(test) == N_TEST, (len(val), len(test))
    assert not (set(val) & used) and not (set(test) & used), "leakage"
    assert not (set(val) & set(test))

    man = {
        "seed": SEED, "grouping_key": "StudyInstanceUID",
        "disjoint_from": "step2_manifest_v2.json (train/val/test) and step2_manifest_v3.json",
        "pool": {"available": len(remain), "pos": len(pos), "neg": len(neg)},
        "val": {"study_uids": sorted(val), "positive_scans": len(vp), "negative_scans": len(vn)},
        "test": {"study_uids": sorted(test), "positive_scans": len(tp), "negative_scans": len(tn)},
    }
    OUT.write_text(json.dumps(man, indent=2), encoding="utf-8")
    print(f"pool available={len(remain)} (pos={len(pos)}, neg={len(neg)})")
    print(f"val={len(val)} (pos {len(vp)}/neg {len(vn)})  test={len(test)} (pos {len(tp)}/neg {len(tn)})")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
