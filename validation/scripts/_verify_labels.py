"""Throwaway: prove/disprove the metadata label corruption.

Fetch the REAL RSNA stage_2_train.csv (ID,label long format) from the zip and compare
the per-image 'any' label against the Label stored in stage_2_train_with_metadata.csv
for the same image id (SOPInstanceUID).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import zipfile
from pathlib import Path

import pandas as pd

from validation.scripts.rsna_subset import TRAIN_CSV_CSIZE, TRAIN_CSV_OFF, _load_url
from validation.scripts.rsna_zipfetch import RemoteZip

META = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
IDS = Path("validation/data_cache/v2_selected_image_ids.txt")


def main() -> int:
    url = _load_url(None)
    rz = RemoteZip(url)
    raw = rz.read_member(TRAIN_CSV_OFF, TRAIN_CSV_CSIZE, 8)
    labels = {}
    for line in raw.decode("utf-8", "replace").splitlines()[1:]:
        if not line:
            continue
        iid, lab = line.rsplit(",", 1)
        if iid.endswith("_any"):
            labels[iid[:-4]] = int(lab)
    print(f"real train.csv: {len(labels)} images, pos_rate={sum(labels.values())/len(labels):.3f}")

    sel = [l.strip() for l in IDS.read_text().splitlines() if l.strip()]
    with zipfile.ZipFile(META) as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            d = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID", "Label"])
    d = d.drop_duplicates("SOPInstanceUID")
    meta_lab = dict(zip(d["SOPInstanceUID"], d["Label"].astype(int)))

    have = [s for s in sel if s in labels and s in meta_lab]
    if not have:
        print("no overlap between selected SOP ids and real train.csv keys")
        return 1
    agree = sum(1 for s in have if labels[s] == meta_lab[s])
    real_pos = sum(labels[s] for s in have)
    meta_pos = sum(meta_lab[s] for s in have)
    print(f"selected={len(sel)} comparable={len(have)}")
    print(f"agree={agree}/{len(have)} ({agree/len(have):.3f})  real_pos={real_pos}  meta_pos={meta_pos}")

    st = dict(zip(d["SOPInstanceUID"], d["StudyInstanceUID"]))
    per = {}
    for s in have:
        k = st[s]
        per.setdefault(k, [0, 0])
        per[k][0] = max(per[k][0], labels[s])
        per[k][1] = max(per[k][1], meta_lab[s])
    rp = sum(v[0] for v in per.values())
    mp = sum(v[1] for v in per.values())
    print(f"study-level (real-label max): studies={len(per)} real_pos={rp} meta_pos={mp}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
