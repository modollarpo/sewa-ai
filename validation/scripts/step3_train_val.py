"""Step 3 (v2): Train / adapt model and fit temperature scaling on validation group.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Uses the v2 scan-level split manifest (step2_manifest_v2.json) to fine-tune
EfficientNet-B0 (or adapt v1 checkpoint) with scan-level batching / slice sampling,
then fits temperature scaling on validation scans only.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

MANIFEST = Path("validation/scripts/step2_manifest_v2.json")
TILES = Path("validation/data_cache/tiles")


class RSNASliceDataset(Dataset):
    def __init__(self, study_uids: list[str], manifest_data: dict, meta_path: Path):
        self.uids = set(study_uids)
        # load subset csv to map image_id -> label
        import csv
        self.image_labels = {}
        for row in csv.DictReader(open("validation/data_subsets/rsna_subset.csv", encoding="utf-8")):
            self.image_labels[row["image_id"]] = int(row["label_any"])

        # load metadata zip to map image_id -> StudyInstanceUID
        import zipfile, pandas as pd
        with zipfile.ZipFile(meta_path) as z:
            with z.open("stage_2_train_with_metadata.csv") as f:
                meta = pd.read_csv(f, usecols=["SOPInstanceUID", "StudyInstanceUID"])
        self.iid_to_study = dict(zip(meta["SOPInstanceUID"], meta["StudyInstanceUID"]))

        # filter tiles belonging to study_uids in this split
        self.samples = []
        for iid, label in self.image_labels.items():
            study = self.iid_to_study.get(iid)
            if study in self.uids:
                tile_path = TILES / f"{iid}.npy"
                if tile_path.exists():
                    self.samples.append((tile_path, label, study))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        tpath, label, study = self.samples[idx]
        arr = np.load(tpath)  # (224, 224, 3) uint8
        # to tensor (3, 224, 224) float [0, 1]
        t = torch.from_numpy(arr).permute(2, 0, 1).float() / 255.0
        return t, torch.tensor(label, dtype=torch.float32)


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    meta_path = Path("validation/data_cache/stage_2_train_with_metadata.csv.zip")

    print("Loading datasets...", flush=True)
    train_ds = RSNASliceDataset(manifest["train"]["study_uids"], manifest, meta_path)
    val_ds = RSNASliceDataset(manifest["val"]["study_uids"], manifest, meta_path)
    test_ds = RSNASliceDataset(manifest["test"]["study_uids"], manifest, meta_path)
    print(f"Loaded samples -> Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}", flush=True)

    # Verify we can build DataLoaders
    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False, num_workers=0)

    print("Step 3 dataset setup verified successfully.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
