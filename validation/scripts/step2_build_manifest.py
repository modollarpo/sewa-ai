"""Step 2 (v2): Rebuild sample and splits by group (StudyInstanceUID).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Using the cached RSNA stage_2_train_with_metadata.csv (which contains SOPInstanceUID,
StudyInstanceUID, and Label), we:
  1. Map each image_id in the 2,000 RSNA subset to its StudyInstanceUID.
  2. Group slices by StudyInstanceUID (1,893 unique scans).
  3. Determine scan positive status (any slice Label == 1).
  4. Sample K scans (default 800 scans, stratified by hemorrhage status).
  5. Split 70% train (560), 15% val (120), 15% test (120) by group (seed 42).
  6. Cap at up to 32 slices per scan.
  7. Run leakage checks (no StudyInstanceUID appears in >1 split).
  8. Output validation/scripts/step2_manifest_v2.json.
"""
from __future__ import annotations

import csv
import json
import math
import random
import zipfile
from collections import defaultdict
from pathlib import Path

import pandas as pd

SPLIT_SEED = 42
TARGET_SCANS = 800
MAX_SLICES_PER_SCAN = 32


def main() -> int:
    # 1. Load subset image ids and labels
    subset_csv = Path("validation/data_subsets/rsna_subset.csv")
    subset_df = pd.read_csv(subset_csv)
    print(f"Loaded subset: {len(subset_df)} images", flush=True)

    # 2. Load metadata CSV containing SOPInstanceUID -> StudyInstanceUID mapping
    meta_zip = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")
    print(f"Loading metadata from {meta_zip}...", flush=True)
    with zipfile.ZipFile(meta_zip) as z:
        with z.open("stage_2_train_with_metadata.csv") as f:
            meta_df = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID"])

    # Merge subset with metadata to get StudyInstanceUID per subset image
    merged = subset_df.merge(meta_df, left_on="image_id", right_on="SOPInstanceUID", how="inner")
    print(f"Merged subset with metadata: {len(merged)} rows, {merged['StudyInstanceUID'].nunique()} unique studies", flush=True)

    # 3. Group by StudyInstanceUID
    study_to_images = defaultdict(list)
    study_to_labels = defaultdict(list)
    for _, row in merged.iterrows():
        siuid = row["StudyInstanceUID"]
        iid = row["image_id"]
        lab = int(row["label_any"])
        study_to_images[siuid].append(iid)
        study_to_labels[siuid].append(lab)

    # Determine scan positive status: scan is positive if any slice is positive
    scan_positive = {
        siuid: any(lbl == 1 for lbl in lbls)
        for siuid, lbls in study_to_labels.items()
    }

    positive_scans = [s for s, pos in scan_positive.items() if pos]
    negative_scans = [s for s, pos in scan_positive.items() if not pos]
    print(f"Total available scans in subset: positive={len(positive_scans)}, negative={len(negative_scans)}, total={len(scan_positive)}", flush=True)

    # 4. Stratified sample of TARGET_SCANS (800)
    rng = random.Random(SPLIT_SEED)
    rng.shuffle(positive_scans)
    rng.shuffle(negative_scans)

    pos_n = min(TARGET_SCANS // 2, len(positive_scans))
    neg_n = TARGET_SCANS - pos_n
    sampled_pos = positive_scans[:pos_n]
    sampled_neg = negative_scans[:neg_n]

    sampled_scans = sampled_pos + sampled_neg
    rng.shuffle(sampled_scans)
    print(f"Sampled {len(sampled_scans)} scans (positive={len(sampled_pos)}, negative={len(sampled_neg)})", flush=True)

    # 5. Split 70% train, 15% val, 15% test by group
    n_train = math.floor(0.7 * TARGET_SCANS)
    n_val = math.floor(0.15 * TARGET_SCANS)
    n_test = TARGET_SCANS - n_train - n_val

    train_scans = sampled_scans[:n_train]
    val_scans = sampled_scans[n_train:n_train + n_val]
    test_scans = sampled_scans[n_train + n_val:]

    # Leakage check: verify no overlap between splits
    train_set = set(train_scans)
    val_set = set(val_scans)
    test_set = set(test_scans)
    assert len(train_set & val_set) == 0, "Leakage train-val!"
    assert len(train_set & test_set) == 0, "Leakage train-test!"
    assert len(val_set & test_set) == 0, "Leakage val-test!"
    print("Leakage test PASSED: 0 overlapping scans across splits.", flush=True)

    def stats(scans_list):
        pos = sum(1 for s in scans_list if scan_positive[s])
        neg = len(scans_list) - pos
        # count total slices capped at MAX_SLICES_PER_SCAN
        total_slices = sum(min(len(study_to_images[s]), MAX_SLICES_PER_SCAN) for s in scans_list)
        return {"scans": len(scans_list), "positive_scans": pos, "negative_scans": neg, "total_slices": total_slices}

    train_st = stats(train_scans)
    val_st = stats(val_scans)
    test_st = stats(test_scans)

    print(f"Split stats:\n  Train: {train_st}\n  Val:   {val_st}\n  Test:  {test_st}", flush=True)

    # 6. Build manifest
    manifest = {
        "seed": SPLIT_SEED,
        "grouping_key": "StudyInstanceUID",
        "slice_limit_per_scan": MAX_SLICES_PER_SCAN,
        "positive_definition": "any slice with label_any==1 within the scan",
        "train": {**train_st, "study_uids": sorted(train_scans)},
        "val": {**val_st, "study_uids": sorted(val_scans)},
        "test": {**test_st, "study_uids": sorted(test_scans)},
    }

    out_path = Path("validation/scripts/step2_manifest_v2.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest written to {out_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
