"""Build preprocessed 3-window tensors for the RSNA subset.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Source is the Kaggle GCS competition bundle (read via HTTP ranges), NOT the Azure
blob copy: this machine's egress to Azure Blob is intermittently ~8 KB/s, whereas
range reads from GCS are stable. The Azure copy remains the durable raw archive.

Pipeline per image:
  DICOM -> Hounsfield Units (RescaleSlope/Intercept)
        -> 3 frozen clinical window presets (brain/subdural/bone)
        -> resize 224x224
        -> stack (224,224,3) uint8

Per-image tiles are cached under validation/data_cache/tiles/<id>.npy so the run is
resumable (re-runs skip finished tiles). Final tensors are assembled into one .npz
and uploaded to the 'processed' blob container.
"""
from __future__ import annotations

import argparse
import csv
import io
import struct
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np

WINDOWS = [("brain", 40, 80), ("subdural", 80, 200), ("bone", 600, 2800)]
SIZE = 224
CENTRAL_DIR = Path("C:/Users/USER/AppData/Local/Temp/opencode/rsna_cd.bin")
PROGRESS_LOG = Path("C:/Users/USER/AppData/Local/Temp/opencode/preprocess_progress.log")
TILES = Path("validation/data_cache/tiles")
PREFIX = "rsna-intracranial-hemorrhage-detection/stage_2_train/"


def _load_central_dir(path: Path) -> dict:
    from validation.scripts.rsna_zipfetch import _zip64_extra
    buf = path.read_bytes()
    table: dict = {}
    off = 0
    while True:
        i = buf.find(b"PK\x01\x02", off)
        if i == -1:
            break
        h = buf[i + 4:i + 46]
        (_vm, _vn, _flags, method, _mt, _md, _crc, csize, usize,
         nlen, elen, clen, _disk, _ia, _ea, lho) = struct.unpack("<HHHHHHIIIHHHHHII", h)
        name = buf[i + 46:i + 46 + nlen].decode("utf-8", "replace")
        extra = buf[i + 46 + nlen:i + 46 + nlen + elen]
        u, c, o = _zip64_extra(usize, csize, lho, extra)
        table[name] = (u, c, method, o)
        off = i + 46 + nlen + elen + clen
    return table


def _apply_window(hu: np.ndarray, center: float, width: float) -> np.ndarray:
    lo = center - width / 2.0
    hi = center + width / 2.0
    clipped = np.clip(hu, lo, hi)
    return ((clipped - lo) / (hi - lo) * 255.0).astype(np.uint8)


def _resize_torch(img: np.ndarray, size: int) -> np.ndarray:
    import torch
    import torch.nn.functional as F
    t = torch.from_numpy(img).float().unsqueeze(0).unsqueeze(0)
    out = F.interpolate(t, size=(size, size), mode="bilinear", align_corners=False)
    return out.squeeze().numpy()


def _process_bytes(data: bytes) -> np.ndarray:
    import pydicom
    ds = pydicom.dcmread(io.BytesIO(data), force=True)
    arr = ds.pixel_array.astype(np.float32)
    slope = float(getattr(ds, "RescaleSlope", 1) or 1)
    intercept = float(getattr(ds, "RescaleIntercept", 0) or 0)
    hu = arr * slope + intercept
    chans = [_resize_torch(_apply_window(hu, c, w), SIZE) for _n, c, w in WINDOWS]
    return np.stack(chans, axis=-1).round().clip(0, 255).astype(np.uint8)


def _log(msg: str) -> None:
    print(msg, flush=True)
    with open(PROGRESS_LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=16)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--no-upload", action="store_true")
    args = ap.parse_args()

    rows = list(csv.DictReader(open("validation/data_subsets/rsna_subset.csv", encoding="utf-8")))
    if args.limit:
        rows = rows[:args.limit]
    todo = [r for r in rows if not (TILES / f"{r['image_id']}.npy").exists()]
    _log(f"images: {len(rows)}  pending: {len(todo)}  workers: {args.workers}")

    if todo:
        from validation.scripts.rsna_zipfetch import RemoteZip, bundle_url
        TILES.mkdir(parents=True, exist_ok=True)
        table = _load_central_dir(CENTRAL_DIR)
        url = bundle_url()
        z = RemoteZip(url)
        t0 = time.time()
        done = 0

        def work(r):
            iid = r["image_id"]
            name = PREFIX + iid + ".dcm"
            _u, c, m, o = table[name]
            raw = z.read_member(o, c, m)
            tile = _process_bytes(raw)
            np.save(TILES / f"{iid}.npy", tile)
            return iid

        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = {ex.submit(work, r): r["image_id"] for r in todo}
            failed = []
            for fut in as_completed(futs):
                iid = futs[fut]
                try:
                    fut.result()
                except Exception as exc:  # noqa: BLE001
                    failed.append((iid, str(exc)[:120]))
                done += 1
                if done % 50 == 0 or done == len(todo):
                    rate = done / (time.time() - t0)
                    _log(f"processed {done}/{len(todo)}  ({rate:.2f}/s)")
            if failed:
                _log(f"WARNING {len(failed)} failed, retrying once: {failed[:3]}")
                for iid, _err in failed:
                    try:
                        work({"image_id": iid})
                    except Exception as exc:  # noqa: BLE001
                        _log(f"RETRY FAILED {iid}: {str(exc)[:120]}")

    ids = [r["image_id"] for r in rows]
    missing = [i for i in ids if not (TILES / f"{i}.npy").exists()]
    if missing:
        _log(f"ABORT: {len(missing)} tiles missing (e.g. {missing[:3]}); re-run to retry")
        return 1
    y = np.array([int(r["label_any"]) for r in rows], dtype=np.int64)
    X = np.zeros((len(ids), SIZE, SIZE, 3), dtype=np.uint8)
    for i, iid in enumerate(ids):
        X[i] = np.load(TILES / f"{iid}.npy")
    out = Path("validation/data_cache/rsna_2000_224_3win.npz")
    np.savez_compressed(out, X=X, y=y, ids=np.array(ids))
    _log(f"wrote {out} ({out.stat().st_size/1e6:.1f} MB)")

    if not args.no_upload:
        from validation.scripts.kaggle_to_blob import _blob_container
        with open(out, "rb") as fh:
            _blob_container("processed").get_blob_client(out.name).upload_blob(fh, overwrite=True)
        _log("uploaded -> processed/" + out.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
