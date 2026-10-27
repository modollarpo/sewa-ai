"""Throwaway: how many of the 8 selected slices capture a positive scan (real labels)?

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pandas as pd

from validation.scripts.rsna_subset import TRAIN_CSV_CSIZE, TRAIN_CSV_OFF, _load_url
from validation.scripts.rsna_zipfetch import RemoteZip

META = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
SEL = Path("validation/scripts/step1b_slices_v2.json")


def main() -> int:
    url = _load_url(None)
    raw = RemoteZip(url).read_member(TRAIN_CSV_OFF, TRAIN_CSV_CSIZE, 8)
    labels = {}
    for line in raw.decode("utf-8", "replace").splitlines()[1:]:
        if not line:
            continue
        iid, lab = line.rsplit(",", 1)
        if iid.endswith("_any"):
            labels[iid[:-4]] = int(lab)

    sel = json.loads(SEL.read_text(encoding="utf-8"))["splits"]
    with zipfile.ZipFile(META) as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            d = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID"])
    d = d.drop_duplicates("SOPInstanceUID")
    study_of = dict(zip(d["SOPInstanceUID"], d["StudyInstanceUID"]))
    ids_by_study = {}
    for s, st in zip(d["SOPInstanceUID"], d["StudyInstanceUID"]):
        ids_by_study.setdefault(st, []).append(s)

    grand = [0, 0, 0]
    for split in ("train", "val", "test"):
        sel_ids = {}
        for e in sel[split]:
            sel_ids.setdefault(e["study"], set()).add(e["image_id"])
        true_pos = cap_pos = 0
        for st, chosen in sel_ids.items():
            all_ids = ids_by_study.get(st, [])
            tpos = any(labels.get(i, 0) == 1 for i in all_ids)
            cpos = any(labels.get(i, 0) == 1 for i in chosen)
            if tpos:
                true_pos += 1
                if cpos:
                    cap_pos += 1
        n = len(sel_ids)
        print(f"{split}: studies={n} true_pos={true_pos} captured={cap_pos} "
              f"miss={true_pos - cap_pos}")
        grand[0] += n
        grand[1] += true_pos
        grand[2] += cap_pos
    print(f"TOTAL studies={grand[0]} true_pos={grand[1]} captured={grand[2]} "
          f"missed_positive_scans={grand[1] - grand[2]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
