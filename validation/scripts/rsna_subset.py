"""Fetch only the RSNA members we need, straight into Azure Blob.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

The competition bundle is a single ~194 GB zip with no per-file API. This script
reads the central directory (cached locally / downloaded once) and range-fetches
only the chosen DICOM members, uploading each to the study blob container.

RSNA has no patient identifiers in the released data: filenames are per-image
(`ID_<hex>.dcm`). Selection is therefore per image, balanced on the `any`
haemorrhage label, and that limitation is recorded in the subset manifest.

Usage
-----
  python -m validation.scripts.rsna_subset --n 40 --seed 42 \
      --container rsna-subset --cd-cache <path-to-rsna_cd.bin> --url-file <path>
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import random
import sys
import time
from pathlib import Path

from validation.scripts.rsna_zipfetch import RemoteZip
from validation.scripts.kaggle_to_blob import _blob_container

ROOT = "rsna-intracranial-hemorrhage-detection/"
TRAIN_CSV_OFF = 27058617395
TRAIN_CSV_CSIZE = 16970302
TRAIN_CSV_USIZE = 119696322


def _load_url(url_file: str | None) -> str:
    import urllib.request
    if url_file and Path(url_file).exists():
        return Path(url_file).read_text().strip()
    from kaggle.api.kaggle_api_extended import KaggleApi
    from kagglesdk.competitions.types.competition_api_service import ApiDownloadDataFilesRequest
    api = KaggleApi(); api.authenticate()
    with api.build_kaggle_client() as k:
        req = ApiDownloadDataFilesRequest(); req.competition_name = "rsna-intracranial-hemorrhage-detection"
        return k.competitions.competition_api_client.download_data_files(req).url


def _parse_central_dir(buf: bytes):
    """Yield (name, usize, csize, method, local_header_offset)."""
    import struct
    i = 0
    n = len(buf)
    while i <= n - 46:
        if buf[i:i + 4] != b"PK\x01\x02":
            i += 1
            continue
        (_vm, _vn, _f, method, _mt, _md, _crc, csize, usize,
         nlen, elen, clen, _d, _ia, _ea, lho) = struct.unpack("<HHHHHHIIIHHHHHII", buf[i + 4:i + 46])
        name = buf[i + 46:i + 46 + nlen].decode("utf-8", "replace")
        extra = buf[i + 46 + nlen:i + 46 + nlen + elen]
        if usize == 0xFFFFFFFF or csize == 0xFFFFFFFF or lho == 0xFFFFFFFF:
            k = 0
            while k + 4 <= len(extra):
                hid, hsz = struct.unpack("<HH", extra[k:k + 4])
                if hid == 0x0001:
                    body = extra[k + 4:k + 4 + hsz]
                    p = 0
                    if usize == 0xFFFFFFFF:
                        usize = struct.unpack("<Q", body[p:p + 8])[0]; p += 8
                    if csize == 0xFFFFFFFF:
                        csize = struct.unpack("<Q", body[p:p + 8])[0]; p += 8
                    if lho == 0xFFFFFFFF:
                        lho = struct.unpack("<Q", body[p:p + 8])[0]; p += 8
                    break
                k += 4 + hsz
        yield name, usize, csize, method, lho
        i += 46 + nlen + elen + clen


def _ensure_cd(url: str, cd_cache: str) -> bytes:
    import urllib.request
    p = Path(cd_cache)
    if p.exists() and p.stat().st_size > 1_000_000:
        return p.read_bytes()
    rz = RemoteZip(url)
    _, cdsize, cdofs = rz._zip64_eocd()
    CHUNK = 8 * 1024 * 1024
    pos, end = cdofs, cdofs + cdsize
    with open(p, "wb") as f:
        while pos < end:
            want = min(CHUNK, end - pos)
            for attempt in range(5):
                try:
                    req = urllib.request.Request(url, headers={"Range": f"bytes={pos}-{pos+want-1}"})
                    data = urllib.request.urlopen(req, timeout=60).read()
                    break
                except Exception:
                    if attempt == 4:
                        raise
                    import time as _t; _t.sleep(2)
            f.write(data); pos += len(data)
    return p.read_bytes()


def cmd_fetch(args) -> int:
    url = _load_url(args.url_file)
    cd = _ensure_cd(url, args.cd_cache)
    print(f"central dir: {len(cd)/1e6:.1f} MB")

    train = {}
    for name, usize, csize, method, lho in _parse_central_dir(cd):
        if name.startswith(ROOT + "stage_2_train/"):
            iid = Path(name).stem
            train[iid] = (lho, csize, method)
    print(f"train dicoms: {len(train)}")

    # labels
    rz = RemoteZip(url)
    csv_bytes = rz.read_member(27058617395, 16970302, 8)
    labels = {}
    for line in csv_bytes.decode("utf-8", "replace").splitlines()[1:]:
        if not line:
            continue
        iid, lab = line.split(",")
        if iid.endswith("_any"):
            labels[iid[:-4]] = int(lab)
    pos_ids = [i for i, v in labels.items() if v == 1 and i in train]
    neg_ids = [i for i, v in labels.items() if v == 0 and i in train]
    print(f"labelled train: pos={len(pos_ids)} neg={len(neg_ids)}")

    import random as _r
    rng = _r.Random(args.seed)
    rng.shuffle(pos_ids); rng.shuffle(neg_ids)
    n_each = args.n // 2
    chosen = [(i, 1) for i in pos_ids[:n_each]] + [(i, 0) for i in neg_ids[:args.n - n_each]]
    print(f"selected {len(chosen)} studies (pos={n_each})")

    container = _container(args.container)
    manifest = []
    for iid, lab in chosen:
        lho, csize, method = train[iid]
        raw = rz.read_member(lho, csize, method)
        blob_name = f"dicom/{iid}.dcm"
        container.get_blob_client(blob_name).upload_blob(raw, overwrite=True)
        manifest.append({"image_id": iid, "label_any": lab, "bytes": len(raw), "blob": f"{args.container}/{blob_name}"})
        print(f"  {iid} label={lab} {len(raw)//1024}KB -> {blob_name}")

    out = Path(args.manifest)
    out.parent.mkdir(parents=True, exist_ok=True)
    import csv as _csv
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = _csv.DictWriter(f, fieldnames=["image_id", "label_any", "bytes", "blob"])
        w.writeheader(); w.writerows(manifest)
    print(f"manifest -> {out}")
    return 0


def _container(name: str):
    from validation.scripts.kaggle_to_blob import _blob_container
    return _blob_container(name)


def build_parser():
    import argparse
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--n", type=int, default=40)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--container", default="rsna-subset")
    p.add_argument("--cd-cache", default="C:/Users/USER/AppData/Local/Temp/opencode/rsna_cd.bin")
    p.add_argument("--url-file", default="C:/Users/USER/AppData/Local/Temp/opencode/rsna_url.txt")
    p.add_argument("--manifest", default="validation/data_subsets/rsna_subset.csv")
    return p


if __name__ == "__main__":
    raise SystemExit(cmd_fetch(build_parser().parse_args()))
