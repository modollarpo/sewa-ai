"""Step 1b-b (v2 amendment 2): repair the slice labels with the real RSNA labels.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Keeps the frozen 8-slice selection (step1b_slices_v2.json) but:
  * replaces the corrupt metadata per-slice labels with the authoritative
    stage_2_train.csv labels (keyed by image id); and
  - for a truly-positive scan whose 8 selected slices contain no positive slice,
    swaps the most peripheral selected slice for the nearest-in-z positive slice.

Writes validation/scripts/step1b_slices_v2b.json and v2_selected_image_ids_b.txt.
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pandas as pd

from validation.scripts.step1c_extract_labels import load_labels

META = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
SRC = Path("validation/scripts/step1b_slices_v2.json")
OUT = Path("validation/scripts/step1b_slices_v2b.json")
IDS = Path("validation/data_cache/v2_selected_image_ids_b.txt")


def main() -> int:
    labels = load_labels()
    with zipfile.ZipFile(META) as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            d = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID", "ImagePositionPatient_3"])
    d = d.drop_duplicates("SOPInstanceUID")
    pos_of = dict(zip(d["SOPInstanceUID"], pd.to_numeric(d["ImagePositionPatient_3"], errors="coerce")))
    study_of = dict(zip(d["SOPInstanceUID"], d["StudyInstanceUID"]))
    ids_by_study: dict[str, list[str]] = {}
    for s, st in zip(d["SOPInstanceUID"], d["StudyInstanceUID"]):
        ids_by_study.setdefault(st, []).append(s)

    sel = json.loads(SRC.read_text(encoding="utf-8"))
    out = {"seed": sel["seed"], "slices_per_scan": sel["slices_per_scan"],
           "provenance": "labels from real stage_2_train.csv (amendment 2)", "splits": {}}
    all_ids = []
    swaps = 0
    for split in ("train", "val", "test"):
        entries = []
        for e in sel["splits"][split]:
            sid, study = e["image_id"], e["study"]
            lab = int(labels.get(sid, 0))
            entries.append({"study": study, "image_id": sid, "label": lab})
        by_study: dict[str, list[dict]] = {}
        for e in entries:
            by_study.setdefault(e["study"], []).append(e)
        for study, es in by_study.items():
            if any(x["label"] == 1 for x in es):
                continue
            candidates = [i for i in ids_by_study.get(study, []) if labels.get(i, 0) == 1]
            if not candidates:
                continue  # truly negative scan
            positions = [pos_of.get(x["image_id"]) for x in es]
            positions = [p for p in positions if p is not None and p == p]
            center = sorted(positions)[len(positions) // 2] if positions else 0.0
            # drop the most peripheral selected slice
            victim = max(es, key=lambda x: abs((pos_of.get(x["image_id"]) or center) - center))
            pos = min(candidates, key=lambda c: abs((pos_of.get(c) or center) - center))
            victim["image_id"] = pos
            victim["label"] = 1
            swaps += 1
        out["splits"][split] = entries
        pos_studies = sum(1 for s, xs in by_study.items() if any(x["label"] == 1 for x in xs))
        print(f"{split}: scans={len(by_study)} slices={len(entries)} "
              f"pos_slices={sum(e['label'] for e in entries)} pos_studies={pos_studies}/{len(by_study)}")
        all_ids.extend(e["image_id"] for e in entries)

    assert len(set(all_ids)) == len(all_ids), "duplicate ids!"

    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    IDS.write_text("\n".join(dict.fromkeys(all_ids)) + "\n")
    print(f"swaps={swaps} wrote {OUT} and {IDS} ({len(set(all_ids))} unique ids)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
