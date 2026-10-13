"""Step 2 (v2): fetch DICOM headers for all 2000 RSNA images.

Output: validation/scripts/header_manifest.csv  (image_id,StudyInstanceUID,label_any)
Uses persistent HTTP connection (1.75 s/file via keep-alive, vs 37 s/file without).
"""
from __future__ import annotations

import csv
import io
import struct
from pathlib import Path

import pydicom

from validation.scripts.inspect_dicom_headers import PersistentRangeReader
from validation.scripts.rsna_zipfetch import bundle_url
from validation.preprocessing.build_tensors import (
    CENTRAL_DIR,
    PREFIX,
    _load_central_dir,
)


def main() -> int:
    rows = list(csv.DictReader(open("validation/data_subsets/rsna_subset.csv", encoding="utf-8")))
    ids = [r["image_id"] for r in rows]
    labels = {r["image_id"]: int(r["label_any"]) for r in rows}
    n_total = len(ids)
    print(f"subset: {n_total} images, {sum(labels.values())} positive, {n_total - sum(labels.values())} negative", flush=True)

    table = _load_central_dir(CENTRAL_DIR)
    url = bundle_url()
    reader = PersistentRangeReader(url)

    results = []
    for iid in ids:
        name = PREFIX + iid + ".dcm"
        ent = table.get(name)
        if ent is None:
            continue
        _u, c, m, o = ent
        raw = reader.member(o, c, m)
        ds = pydicom.dcmread(io.BytesIO(raw), force=True)
        suid = str(getattr(ds, "StudyInstanceUID", ""))
        lid = labels.get(iid, 0)
        results.append(f"{iid},{suid},{lid}")
        if len(results) % 200 == 0:
            print(f"  fetched {len(results)}/{len(ids)}", flush=True)

    with open("validation/scripts/header_manifest.csv", "w") as f:
        f.write("image_id,StudyInstanceUID,label_any\n")
        for r in results:
            f.write(r + "\n")

    print(f"\nwrote header_manifest.csv with {len(results)} entries", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())