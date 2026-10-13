"""Step 1b (v2 amendment 1): select up to 8 evenly-spaced slices per scan.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Reads the frozen v2 manifest (800 scans) and the stage-2 metadata, and for each
scan picks up to 8 slices evenly spaced by ImagePositionPatient_3 within the
scan's largest series. Writes the selection and the flat image-id list to fetch.
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pandas as pd

MANIFEST = Path("validation/scripts/step2_manifest_v2.json")
META = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
OUT = Path("validation/scripts/step1b_slices_v2.json")
IDS = Path("validation/data_cache/v2_selected_image_ids.txt")
N_SLICES = 8


def pick_indices(n: int, k: int) -> list[int]:
    if n <= k:
        return list(range(n))
    # evenly spaced including ends
    return sorted({round(i * (n - 1) / (k - 1)) for i in range(k)})


def main() -> int:
    man = json.loads(MANIFEST.read_text(encoding="utf-8"))
    with zipfile.ZipFile(META) as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            meta = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID",
                                           "SeriesInstanceUID", "ImagePositionPatient_3",
                                           "Label"])

    wanted = {s for sp in ("train", "val", "test") for s in man[sp]["study_uids"]}
    sub = meta[meta["StudyInstanceUID"].isin(wanted)].copy()
    print(f"metadata rows for the 800 scans: {len(sub)}")

    selection = {}
    all_ids = []
    for split in ("train", "val", "test"):
        entries = []
        for study in man[split]["study_uids"]:
            rows = sub[sub["StudyInstanceUID"] == study].dropna(subset=["SOPInstanceUID"])
            if rows.empty:
                continue
            # choose the largest series for a coherent axial stack
            series = rows.groupby("SeriesInstanceUID").size().sort_values(ascending=False)
            rows = rows[rows["SeriesInstanceUID"] == series.index[0]].drop_duplicates("SOPInstanceUID")
            rows = rows.assign(_z=pd.to_numeric(rows["ImagePositionPatient_3"], errors="coerce"))
            if rows["_z"].notna().sum() >= 2:
                rows = rows.sort_values("_z")
            else:
                rows = rows.sort_values("SOPInstanceUID")
            rows = rows.reset_index(drop=True)
            idx = pick_indices(len(rows), N_SLICES)
            for i in idx:
                r = rows.iloc[i]
                entries.append({"study": study, "series": r["SeriesInstanceUID"],
                                "image_id": r["SOPInstanceUID"], "label": int(r["Label"])})
                all_ids.append(r["SOPInstanceUID"])
        selection[split] = entries
        print(f"{split}: {len(man[split]['study_uids'])} scans -> {len(entries)} slices")

    OUT.write_text(json.dumps({"seed": man["seed"], "slices_per_scan": N_SLICES,
                               "splits": selection}, indent=2))
    IDS.write_text("\n".join(all_ids) + "\n")
    print(f"wrote {OUT} and {IDS} ({len(all_ids)} image ids, "
          f"{len(set(all_ids))} unique)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
