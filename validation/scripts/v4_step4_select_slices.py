"""v4 Step 4: select 8 slices/scan for the fresh val+test sets (real labels).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Up to 8 evenly-spaced slices from each scan's largest series; per-slice labels from
the authoritative stage_2_train.csv; for a truly-positive scan with no positive
selected slice, swap the most peripheral slice for the nearest-in-z positive slice.
Writes step1b_slices_v4.json + v4_selected_image_ids.txt.
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pandas as pd

from validation.scripts.step1c_extract_labels import load_labels

MANIFEST = Path("validation/scripts/step2_manifest_v4.json")
META = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
OUT = Path("validation/scripts/step1b_slices_v4.json")
IDS = Path("validation/data_cache/v4_selected_image_ids.txt")
N_SLICES = 8


def pick_indices(n: int, k: int) -> list[int]:
    if n <= k:
        return list(range(n))
    return sorted({round(i * (n - 1) / (k - 1)) for i in range(k)})


def select_study(study: str, g: pd.DataFrame, labels: dict) -> list[dict]:
    rows = g.dropna(subset=["SOPInstanceUID"])
    if rows.empty:
        return []
    series = rows.groupby("SeriesInstanceUID").size().sort_values(ascending=False)
    rows = rows[rows["SeriesInstanceUID"] == series.index[0]]
    rows = rows.drop_duplicates("SOPInstanceUID")
    rows = rows.assign(_z=pd.to_numeric(rows["ImagePositionPatient_3"], errors="coerce"))
    rows = rows.sort_values("_z") if rows["_z"].notna().sum() >= 2 else rows.sort_values("SOPInstanceUID")
    rows = rows.reset_index(drop=True)
    return [{"study": study, "image_id": rows.iloc[i]["SOPInstanceUID"],
             "label": int(labels.get(rows.iloc[i]["SOPInstanceUID"], 0))}
            for i in pick_indices(len(rows), N_SLICES)]


def main() -> int:
    man = json.loads(MANIFEST.read_text(encoding="utf-8"))
    labels = load_labels()
    with zipfile.ZipFile(META) as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            d = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID",
                                        "SeriesInstanceUID", "ImagePositionPatient_3"])
    d = d.drop_duplicates("SOPInstanceUID")
    z_of = dict(zip(d["SOPInstanceUID"], pd.to_numeric(d["ImagePositionPatient_3"], errors="coerce")))
    wanted = set(man["val"]["study_uids"]) | set(man["test"]["study_uids"])
    groups = {k: v for k, v in d[d["StudyInstanceUID"].isin(wanted)].groupby("StudyInstanceUID")}

    out = {"seed": man["seed"], "slices_per_scan": N_SLICES, "source": "v4 fresh val+test", "splits": {}}
    swaps = 0
    all_ids: list[str] = []
    for split in ("val", "test"):
        entries: list[dict] = []
        for study in man[split]["study_uids"]:
            entries.extend(select_study(study, groups[study], labels))
        by_study: dict[str, list[dict]] = {}
        for e in entries:
            by_study.setdefault(e["study"], []).append(e)
        for study, es in by_study.items():
            if any(x["label"] == 1 for x in es):
                continue
            st_ids = [r.SOPInstanceUID for r in groups[study].itertuples()]
            pos_ids = [i for i in st_ids if int(labels.get(i, 0)) == 1]
            if not pos_ids:
                continue
            zs = [float(z_of[e["image_id"]]) for e in es if z_of.get(e["image_id"]) == z_of.get(e["image_id"])]
            zc = sorted(zs)[len(zs) // 2] if zs else 0.0
            za = lambda i: z_of.get(i) if z_of.get(i) == z_of.get(i) else zc  # noqa: E731
            worst = max(es, key=lambda e: abs(za(e["image_id"]) - zc))
            best = min(pos_ids, key=lambda i: abs(za(i) - zc))
            worst["image_id"], worst["label"] = best, 1
            swaps += 1
        out["splits"][split] = entries
        all_ids.extend(e["image_id"] for e in entries)
        n_ps = sum(e["label"] for e in entries)
        n_sc = sum(1 for es in by_study.values() if any(x["label"] == 1 for x in es))
        print(f"{split}: scans={len(by_study)} slices={len(entries)} pos_slices={n_ps} pos_scans={n_sc}")

    assert len(set(all_ids)) == len(all_ids), "duplicate ids!"
    out["swaps"] = swaps
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    IDS.write_text("\n".join(dict.fromkeys(all_ids)) + "\n")
    print(f"swaps={swaps}; wrote {OUT} and {IDS} ({len(set(all_ids))} unique ids)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
