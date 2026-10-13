"""Step 8 (v3): select 8 slices/scan for the fresh shift-test set (real labels).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Mirrors step1b_select_slices_v2.py + step1b_select_slices_v2b.py but for the v3
manifest: up to 8 evenly-spaced slices from the scan's largest series, per-slice
labels from the authoritative stage_2_train.csv, and (for a truly-positive scan with
no selected positive slice) swap the most peripheral slice for the nearest-in-z
positive slice. Writes step1b_slices_v3.json + v3_selected_image_ids.txt.
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pandas as pd

from validation.scripts.step1c_extract_labels import load_labels

MANIFEST = Path("validation/scripts/step2_manifest_v3.json")
META = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
OUT = Path("validation/scripts/step1b_slices_v3.json")
IDS = Path("validation/data_cache/v3_selected_image_ids.txt")
N_SLICES = 8


def pick_indices(n: int, k: int) -> list[int]:
    if n <= k:
        return list(range(n))
    return sorted({round(i * (n - 1) / (k - 1)) for i in range(k)})


def main() -> int:
    man = json.loads(MANIFEST.read_text(encoding="utf-8"))
    labels = load_labels()
    with zipfile.ZipFile(META) as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            d = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID",
                                        "SeriesInstanceUID", "ImagePositionPatient_3"])
    d = d.drop_duplicates("SOPInstanceUID")
    pos_of = dict(zip(d["SOPInstanceUID"], pd.to_numeric(d["ImagePositionPatient_3"], errors="coerce")))
    by_study: dict[str, list[str]] = {}
    for s, st in zip(d["SOPInstanceUID"], d["StudyInstanceUID"]):
        d.at[0, "SOPInstanceUID"]  # no-op to keep pandas imported structure explicit
    for s, st in zip(d["SOPInstanceUID"], d["StudyInstanceUID"]):
        d2 = None
        del d2
    # rows-by-study index
    entries = []
    for study in man["study_uids"]:
        rows = d[d["StudyInstanceUID"] == study].dropna(subset=["SOPInstanceUID"])
        if rows.empty:
            continue
        series = d[d["StudyInstanceUID"] == study].groupby("SeriesInstanceUID").size() \
            .sort_values(ascending=False)
        rows = d[(d["StudyInstanceUID"] == study) & (d["SeriesInstanceUID"] == series.index[0])]
        rows = rows.drop_duplicates("SOPInstanceUID")
        rows = rows.assign(_z=pd.to_numeric(rows["ImagePositionPatient_3"], errors="coerce"))
        rows = rows.sort_values("_z") if rows["_z"].notna().sum() >= 2 else rows.sort_values("SOPInstanceUID")
        rows = rows.reset_index(drop=True)
        idx = pick_indices(len(rows), N_SLICES)
        entries.extend({"study": study, "image_id": rows.iloc[i]["SOPInstanceUID"],
                        "label": int(labels.get(rows.iloc[i]["SOPInstanceUID"], 0))} for i in idx)

    by_study: dict[str, list[dict]] = {}
    for e in entries:
        by_study.setdefault(e["study"], []).append(e)
    swaps = 0
    for study, es in by_study.items():
        if any(x["label"] == 1 for x in es):
            continue
        # nearest-in-z positive slice of the same study (if the scan is truly positive)
        st_ids = [r.SOPInstanceUID for r in d[d["StudyInstanceUID"] == study].itertuples()]
        pos_ids = [i for i in st_ids if int(labels.get(i, 0)) == 1]
        if not pos_ids:
            continue
        z_of = dict(zip(d["SOPInstanceUID"], pd.to_numeric(d["ImagePositionPatient_3"], errors="coerce")))
        zs = [z_of.get(e["image_id"]) for e in es]
        zs = [float(z) for z in zs if z == z]
        zc = sorted(zs)[len(zs) // 2] if zs else 0.0
        worst = max(es, key=lambda e: abs((z_of.get(e["image_id"]) if z_of.get(e["image_id"]) == z_of.get(e["image_id"]) else zc) - zc))
        best = min(pos_ids, key=lambda i: abs((z_of.get(i) if z_of.get(i) == z_of.get(i) else zc) - zc))
        worst["image_id"], worst["label"] = best, 1
        swaps += 1

    all_ids = [e["image_id"] for e in entries]
    assert len(set(all_ids)) == len(all_ids), "duplicate ids!"
    OUT.write_text(json.dumps({"seed": man["seed"], "slices_per_scan": N_SLICES,
                               "source": "v3 fresh shift set", "splits": {"test": entries},
                               "swaps": swaps}, indent=2), encoding="utf-8")
    IDS.write_text("\n".join(dict.fromkeys(all_ids)) + "\n")
    n_pos_slices = sum(e["label"] for e in entries)
    n_pos_scans = sum(1 for es in by_study.values() if any(x["label"] == 1 for x in es))
    print(f"scans={len(by_study)} slices={len(entries)} pos_slices={n_pos_slices} "
          f"pos_scans={n_pos_scans}/{len(by_study)} swaps={swaps}")
    print(f"wrote {OUT} and {IDS} ({len(set(all_ids))} unique ids)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
