"""Step 1c (v2 amendment 2): extract the REAL RSNA per-image labels from the zip.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

The cached `stage_2_train_with_metadata.csv` has a corrupt Label block (its ID/Label
columns are decoupled from the SOPInstanceUID/StudyInstanceUID columns). We therefore
read the authoritative `stage_2_train.csv` straight from the RSNA zip (known central
directory offset) and cache the per-image any-hemorrhage label keyed by image id.

Writes validation/data_cache/rsna_image_labels.csv (image_id,label_any).  Resumable:
skips if the output already exists and is non-empty.
"""
from __future__ import annotations

import csv
import os
from pathlib import Path

from validation.scripts.rsna_subset import TRAIN_CSV_CSIZE, TRAIN_CSV_OFF, _load_url
from validation.scripts.rsna_zipfetch import RemoteZip

OUT = Path(os.environ.get("SEWA_LABELS_CSV", "validation/data_cache/rsna_image_labels.csv"))


def load_labels() -> dict[str, int]:
    if OUT.exists() and OUT.stat().st_size > 1_000_000:
        out = {}
        with open(OUT, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                out[row["image_id"]] = int(row["label_any"])
        return out
    url = _load_url(None)
    raw = RemoteZip(url).read_member(TRAIN_CSV_OFF, TRAIN_CSV_CSIZE, 8)
    labels = {}
    for line in raw.decode("utf-8", "replace").splitlines()[1:]:
        if not line:
            continue
        iid, lab = line.rsplit(",", 1)
        if iid.endswith("_any"):
            labels[iid[:-4]] = int(lab)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["image_id", "label_any"])
        for k in sorted(labels):
            w.writerow([k, labels[k]])
    return labels


def main() -> int:
    labels = load_labels()
    pos = sum(labels.values())
    print(f"labels={len(labels)} positive={pos} rate={pos/len(labels):.4f} -> {OUT}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
