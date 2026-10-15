"""Step 9a (Test C): Preprocess CQ500 entirely in-region on Azure.

Licence: CC BY-NC-SA 4.0 — non-commercial use confirmed by user (2026-10-14).
Share-alike: outputs of this feasibility study must carry the same licence.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Design: runs as an AKS job in swedencentral, co-located with the blob storage.
  - Reads each CQ500-CT-<N>.zip from blob into memory (~60 MB each, no local disk)
  - Extracts DICOMs in memory → 3-window tiles → selects 8 uniform slices
  - Builds early-feature cache (v2_early_cq500.npz, ~200 MB)
  - Uploads the cache back to blob container 'processed'
  - Writes manifest + report to blob
  Locally you only need to pull: v2_early_cq500.npz (~200 MB) after the job completes.

Known corrupt scans (skipped): CQ500CT19, CQ500CT22, CQ500CT25, CQ500CT52, CQ500CT120

Usage (local test, limit=5):
  python -m validation.scripts.step9a_cq500_preprocess --limit 5 --no-upload

Usage (AKS job):
  See azure/k8s/cq500-preprocess-job.yaml

Env vars:
  AZURE_STORAGE_CONNECTION_STRING  — full connection string (from Key Vault via pod secret)
  SEWA_CACHE_DIR                   — defaults to /cache inside the container
"""
from __future__ import annotations

import argparse
import io
import json
import os
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
import pydicom
import torch
import torch.nn.functional as F

from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS

# ---------------------------------------------------------------- constants
ACCOUNT = "sewavalidationdata"
CONTAINER_IN = "cq500"       # source: CQ500 zips + reads.csv
CONTAINER_OUT = "processed"  # destination: feature cache, manifest, report

CACHE_DIR = Path(os.environ.get("SEWA_CACHE_DIR", "validation/data_cache"))
N_SLICES = 8          # uniform-spaced slices per scan (matches RSNA pipeline)
SIZE_TILE = 224       # tile size before 160px downsample in v2_lib

CORRUPT_SCANS = frozenset({"CQ500CT19", "CQ500CT22", "CQ500CT25", "CQ500CT52", "CQ500CT120"})
MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
WINDOWS = [("brain", 40, 80), ("subdural", 80, 200), ("bone", 600, 2800)]


# ---------------------------------------------------------------- blob client
def _container(name: str):
    from azure.storage.blob import BlobServiceClient
    conn = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not conn:
        # fallback: key file (local dev only)
        key = (Path(os.environ.get("TEMP", "/tmp")) / "azkey.txt").read_text().strip()
        conn = (
            f"DefaultEndpointsProtocol=https;AccountName={ACCOUNT};"
            f"AccountKey={key};EndpointSuffix=core.windows.net"
        )
    return BlobServiceClient.from_connection_string(conn).get_container_client(name)


def _read_blob(container, name: str) -> bytes:
    """Stream blob entirely into memory — no local file written."""
    return container.download_blob(name).readall()


def _upload_blob(container, name: str, data: bytes) -> None:
    container.get_blob_client(name).upload_blob(data, overwrite=True)


# ---------------------------------------------------------------- labels
def load_labels(reads_csv_bytes: bytes) -> dict[str, int]:
    """reads.csv → {scan_name: label}.  Ground truth = majority of 3 radiologist ICH reads."""
    import csv
    text = reads_csv_bytes.decode("utf-8-sig", errors="replace")
    labels: dict[str, int] = {}
    for row in csv.DictReader(io.StringIO(text)):
        row = {k.strip(): v.strip() for k, v in row.items()}
        name = row.get("name", "").strip()
        if not name:
            continue
        votes = [int(row[c]) for c in ("R1:ICH", "R2:ICH", "R3:ICH")
                 if row.get(c, "").strip() in ("1", "0")]
        if len(votes) >= 2:
            labels[name] = 1 if sum(votes) >= 2 else 0
    return labels


# ---------------------------------------------------------------- DICOM → tile (same as RSNA)
def _apply_window(hu: np.ndarray, center: float, width: float) -> np.ndarray:
    lo, hi = center - width / 2.0, center + width / 2.0
    return ((np.clip(hu, lo, hi) - lo) / (hi - lo) * 255.0).astype(np.uint8)


def dicom_bytes_to_tile(dcm_bytes: bytes, size: int = SIZE_TILE) -> np.ndarray:
    """DICOM bytes → (size, size, 3) uint8  — identical pipeline to RSNA."""
    ds = pydicom.dcmread(io.BytesIO(dcm_bytes), force=True)
    arr = ds.pixel_array.astype(np.float32)
    slope = float(getattr(ds, "RescaleSlope", 1) or 1)
    intercept = float(getattr(ds, "RescaleIntercept", 0) or 0)
    hu = arr * slope + intercept
    chans = []
    for _, c, w in WINDOWS:
        win = _apply_window(hu, c, w).astype(np.float32)
        t = torch.from_numpy(win).unsqueeze(0).unsqueeze(0)
        out = F.interpolate(t, size=(size, size), mode="bilinear", align_corners=False)
        chans.append(out.squeeze().numpy().round().clip(0, 255).astype(np.uint8))
    return np.stack(chans, axis=-1)


def _z_pos(ds) -> float:
    try:
        return float(ds.ImagePositionPatient[2])
    except Exception:
        try:
            return float(ds.InstanceNumber)
        except Exception:
            return 0.0


def select_uniform(members: list[tuple[float, str, bytes]], n: int) -> list[tuple[str, bytes]]:
    """Select n uniformly-spaced slices sorted by z-position."""
    members = sorted(members, key=lambda x: x[0])
    if len(members) <= n:
        return [(name, b) for _, name, b in members]
    step = (len(members) - 1) / (n - 1)
    idx = [round(i * step) for i in range(n)]
    return [(members[i][1], members[i][2]) for i in idx]


# ---------------------------------------------------------------- per-scan processing (in memory)
def process_scan_bytes(zip_bytes: bytes, scan_name: str) -> list[tuple[str, np.ndarray]]:
    """Zip bytes (in memory) → list of (tile_id, tile_array). No local zip file written."""
    members: list[tuple[float, str, bytes]] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for member in zf.namelist():
            if not member.lower().endswith(".dcm"):
                continue
            dcm_bytes = zf.read(member)
            try:
                ds = pydicom.dcmread(io.BytesIO(dcm_bytes), force=True,
                                     stop_before_pixels=True)
                z = _z_pos(ds)
            except Exception:
                z = float(len(members))
            members.append((z, member, dcm_bytes))

    if not members:
        return []

    selected = select_uniform(members, N_SLICES)
    tiles = []
    for i, (_, dcm_bytes) in enumerate(selected):
        try:
            tile = dicom_bytes_to_tile(dcm_bytes)
            tiles.append((f"{scan_name}_sl{i:02d}", tile))
        except Exception as exc:
            print(f"  WARN tile {scan_name}_sl{i:02d}: {exc}", flush=True)
    return tiles


# ---------------------------------------------------------------- tile → 160px tensor
def tile_to_tensor160(tile: np.ndarray) -> torch.Tensor:
    t = torch.from_numpy(tile).permute(2, 0, 1).float().unsqueeze(0) / 255.0
    t = F.interpolate(t, size=(L.SIZE, L.SIZE), mode="bilinear", align_corners=False)
    return t[0]


# ---------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=4,
                    help="parallel scan downloads (each ~60 MB in-region, fast)")
    ap.add_argument("--limit", type=int, default=0,
                    help="process only first N scans (0=all; use for smoke-test)")
    ap.add_argument("--no-upload", action="store_true",
                    help="skip uploading outputs to blob (local dev)")
    args = ap.parse_args()

    src = _container(CONTAINER_IN)
    dst = _container(CONTAINER_OUT)

    # Step 1: labels
    print("Reading reads.csv from blob...", flush=True)
    labels = load_labels(_read_blob(src, "reads.csv"))
    print(f"  {len(labels)} scans labelled, {sum(labels.values())} positive", flush=True)

    # Step 2: build scan list
    scan_list: list[tuple[str, int]] = []
    for i in range(491):
        name = f"CQ500CT{i}"
        if name in CORRUPT_SCANS:
            continue
        if name not in labels:
            print(f"  warn: {name} not in reads.csv", flush=True)
            continue
        scan_list.append((name, i))

    if args.limit:
        scan_list = scan_list[:args.limit]
    print(f"\nScans to process: {len(scan_list)}", flush=True)

    # Step 3: stream + preprocess (in memory — no local zip storage)
    all_tile_ids: list[str] = []
    all_scan_ids: list[str] = []
    all_labels_list: list[int] = []
    # hold tiles in memory until we build the feature cache
    tile_store: dict[str, np.ndarray] = {}
    failed: list[str] = []

    def work(item: tuple[str, int]) -> tuple[str, list[tuple[str, np.ndarray]]]:
        scan_name, scan_idx = item
        zip_bytes = _read_blob(src, f"CQ500-CT-{scan_idx}.zip")
        tiles = process_scan_bytes(zip_bytes, scan_name)
        return scan_name, tiles

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(work, item): item[0] for item in scan_list}
        done = 0
        for fut in as_completed(futs):
            scan_name = futs[fut]
            try:
                sn, tiles = fut.result()
                if tiles:
                    for tid, arr in tiles:
                        tile_store[tid] = arr
                        all_tile_ids.append(tid)
                        all_scan_ids.append(sn)
                        all_labels_list.append(labels[sn])
                    done += 1
                    print(f"  [{done}/{len(scan_list)}] {sn}: {len(tiles)} slices", flush=True)
                else:
                    failed.append(sn)
            except Exception as exc:
                print(f"  FAILED {scan_name}: {exc}", flush=True)
                failed.append(scan_name)

    print(f"\nTotal slices: {len(all_tile_ids)}  failed scans: {len(failed)}", flush=True)

    # Step 4: early-feature cache
    print("Building early-feature cache...", flush=True)
    model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")

    feats_list = []
    bs = 32
    for i in range(0, len(all_tile_ids), bs):
        batch = [tile_to_tensor160(tile_store[tid])
                 for tid in all_tile_ids[i:i + bs]]
        with torch.no_grad():
            feats_list.append(L.early_features(early, torch.stack(batch)).numpy())
        if (i // bs + 1) % 20 == 0:
            print(f"  features {i + len(batch)}/{len(all_tile_ids)}", flush=True)

    feats = np.concatenate(feats_list, axis=0)

    # Serialise cache to bytes (no intermediate local file needed)
    buf = io.BytesIO()
    np.savez_compressed(buf,
                        feats=feats,
                        ids=np.array(all_tile_ids),
                        studies=np.array(all_scan_ids),
                        labels=np.array(all_labels_list, dtype=np.int64))
    cache_bytes = buf.getvalue()
    print(f"Feature cache: {len(cache_bytes) / 1e6:.1f} MB", flush=True)

    # Step 5: manifest + report
    scan_slice_map: dict[str, list[str]] = {}
    for tid, sn in zip(all_tile_ids, all_scan_ids):
        scan_slice_map.setdefault(sn, []).append(tid)

    manifest = {
        "licence": "CC BY-NC-SA 4.0",
        "use": "non-commercial confirmed 2026-10-14",
        "marking": MARK,
        "corrupt_skipped": sorted(CORRUPT_SCANS),
        "failed_scans": failed,
        "n_scans": len(scan_slice_map),
        "n_positive": sum(labels[sn] for sn in scan_slice_map),
        "n_slices": len(all_tile_ids),
        "n_slices_per_scan": N_SLICES,
        "temperature_from_v2a1": T,
        "entries": [
            {"scan": sn, "label": labels[sn], "tile_ids": sorted(tids)}
            for sn, tids in scan_slice_map.items()
        ],
    }
    manifest_bytes = json.dumps(manifest, indent=2).encode()
    report = {
        "marking": MARK,
        "status": "preprocessing complete",
        "n_scans": manifest["n_scans"],
        "n_positive": manifest["n_positive"],
        "n_slices": len(all_tile_ids),
        "failed_scans": failed,
        "feature_cache_blob": f"{CONTAINER_OUT}/v2_early_cq500.npz",
        "manifest_blob": f"{CONTAINER_OUT}/cq500_manifest.json",
    }
    report_bytes = json.dumps(report, indent=2).encode()

    # Step 6: upload outputs (or save locally)
    if args.no_upload:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        (CACHE_DIR / "v2_early_cq500.npz").write_bytes(cache_bytes)
        (CACHE_DIR / "cq500_manifest.json").write_bytes(manifest_bytes)
        Path("validation/reports/step9a_cq500_preprocess.json").write_bytes(report_bytes)
        print("Saved locally (--no-upload)", flush=True)
    else:
        print("Uploading to blob...", flush=True)
        _upload_blob(dst, "v2_early_cq500.npz", cache_bytes)
        _upload_blob(dst, "cq500_manifest.json", manifest_bytes)
        _upload_blob(dst, "step9a_cq500_preprocess.json", report_bytes)
        print(f"Uploaded to {CONTAINER_OUT}/", flush=True)

    print(json.dumps(report, indent=2), flush=True)
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
