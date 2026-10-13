"""Step 1b-fetch (v2): fetch selected slices and build 224px 3-window tiles.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Resumable: skips tiles that already exist. Uses one keep-alive HTTP range reader
per worker. Reads the flat image-id list produced by step1b_select_slices_v2.py.
"""
from __future__ import annotations

import argparse
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np

from validation.preprocessing.build_tensors import (
    CENTRAL_DIR,
    PREFIX,
    TILES,
    _load_central_dir,
    _process_bytes,
)
from validation.scripts.inspect_dicom_headers import PersistentRangeReader
from validation.scripts.rsna_zipfetch import bundle_url

IDS = Path(os.environ.get("SEWA_IDS_FILE", "validation/data_cache/v2_selected_image_ids.txt"))
LOG = Path("C:/Users/USER/AppData/Local/Temp/opencode/fetch_v2.log")
_local = threading.local()


def log(msg):
    print(msg, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def _reader(url):
    r = getattr(_local, "reader", None)
    if r is None:
        r = PersistentRangeReader(url)
        _local.reader = r
    return r


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    ids = [l.strip() for l in IDS.read_text().splitlines() if l.strip()]
    table = _load_central_dir(CENTRAL_DIR)
    TILES.mkdir(parents=True, exist_ok=True)
    todo = [i for i in ids if not (TILES / f"{i}.npy").exists()]
    if args.limit:
        todo = todo[:args.limit]
    log(f"selected={len(ids)} pending={len(todo)} workers={args.workers}")
    if not todo:
        return 0

    url = bundle_url()
    t0 = time.time()
    done = [0]
    failed = []

    def work(iid):
        name = PREFIX + iid + ".dcm"
        ent = table.get(name)
        if ent is None:
            raise KeyError(f"not in bundle: {name}")
        _u, c, m, o = ent
        try:
            raw = _reader(url).member(o, c, m)
        except Exception:  # noqa: BLE001
            r = getattr(_local, "reader", None)
            if r is not None:
                try:
                    r.close()
                except Exception:  # noqa: BLE001
                    pass
            _local.reader = None
            raw = _reader(url).member(o, c, m)
        tile = _process_bytes(raw)
        np.save(TILES / f"{iid}.npy", tile)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(work, r): r for r in todo}
        for fut in as_completed(futs):
            iid = futs[fut]
            try:
                fut.result()
            except Exception as exc:  # noqa: BLE001
                failed.append((iid, str(exc)[:100]))
            done[0] += 1
            if done[0] % 200 == 0 or done[0] == len(todo):
                rate = done[0] / max(time.time() - t0, 1e-9)
                left = (len(todo) - done[0]) / rate if rate > 0 else 0
                log(f"{done[0]}/{len(todo)}  {rate:.1f}/s  eta {left/60:.1f} min  failed={len(failed)}")

    if failed:
        log(f"FAILED {len(failed)}; first 5: {failed[:5]}")
    log("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
