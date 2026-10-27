"""Step 1 (v2): inspect DICOM headers of an RSNA sample to find a grouping key.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

RSNA releases per-IMAGE filenames with no patient id in the filename, but the
DICOM *headers* carry StudyInstanceUID / SeriesInstanceUID / StudyID etc.
(anonymised as ``ID_<hex>``). This script reads a sample of DICOMs from the
competition bundle (GCS HTTP range reads over a persistent keep-alive
connection) and reports which candidate identifiers exist and how many unique
values they have, so we can choose a scan-level grouping key.

Candidate order (v2 prompt): PatientID > StudyInstanceUID > SeriesInstanceUID
> proxy clusters.
"""
from __future__ import annotations

import csv
import http.client
import io
import struct
import time
import urllib.parse
import zlib
from collections import Counter

import pydicom

from validation.preprocessing.build_tensors import (
    CENTRAL_DIR,
    PREFIX,
    _load_central_dir,
)
from validation.scripts.rsna_zipfetch import bundle_url

SAMPLE_N = 120
FIELDS = [
    "PatientID",
    "StudyInstanceUID",
    "SeriesInstanceUID",
    "StudyID",
    "SOPInstanceUID",
    "ImagePositionPatient",
    "ImageOrientationPatient",
    "InstanceNumber",
    "SliceThickness",
    "SpacingBetweenSlices",
    "KVP",
    "Manufacturer",
    "ManufacturerModelName",
    "StationName",
    "Rows",
    "Columns",
]


class PersistentRangeReader:
    """Keep-alive HTTP range reader with reconnect-on-failure (avoids per-request TLS)."""

    def __init__(self, url: str, timeout: int = 60, retries: int = 6):
        p = urllib.parse.urlparse(url)
        self.host = p.netloc
        self.path = p.path + ("?" + p.query if p.query else "")
        self.timeout = timeout
        self.retries = retries
        self.conn = None
        self._connect()

    def _connect(self) -> None:
        self.conn = http.client.HTTPSConnection(self.host, timeout=self.timeout)

    def range(self, start: int, end: int) -> bytes:
        last = None
        for attempt in range(self.retries):
            try:
                self.conn.request(
                    "GET", self.path,
                    headers={"Range": f"bytes={start}-{end}", "Connection": "keep-alive"},
                )
                r = self.conn.getresponse()
                data = r.read()
                if r.status not in (200, 206):
                    raise IOError(f"HTTP {r.status}")
                return data
            except Exception as exc:  # noqa: BLE001
                last = exc
                try:
                    self.conn.close()
                except Exception:  # noqa: BLE001
                    pass
                self._connect()
                time.sleep(0.4 * (attempt + 1))
        raise RuntimeError(f"range {start}-{end} failed after {self.retries}: {last}")

    def member(self, header_offset: int, csize: int, method: int) -> bytes:
        lh = self.range(header_offset, header_offset + 29)
        if lh[:4] != b"PK\x03\x04":
            raise ValueError("bad local file header")
        nlen, elen = struct.unpack("<HH", lh[26:30])
        data_start = header_offset + 30 + nlen + elen
        raw = self.range(data_start, data_start + csize - 1)
        if method == 0:
            return raw
        if method == 8:
            return zlib.decompress(raw, -15)
        raise ValueError(f"unsupported compression method {method}")

    def close(self) -> None:
        self.conn.close()


def main() -> int:
    rows = list(csv.DictReader(open("validation/data_subsets/rsna_subset.csv", encoding="utf-8")))
    ids = [r["image_id"] for r in rows]
    step = max(1, len(ids) // SAMPLE_N)
    sample = ids[::step][:SAMPLE_N]
    print(f"subset images: {len(ids)}  sampling: {len(sample)} (every {step}th)", flush=True)

    table = _load_central_dir(CENTRAL_DIR)
    url = bundle_url()
    reader = PersistentRangeReader(url)

    seen: dict[str, Counter] = {f: Counter() for f in FIELDS}
    n_read = 0
    try:
        for iid in sample:
            name = PREFIX + iid + ".dcm"
            ent = table.get(name)
            if ent is None:
                print(f"  MISSING in bundle: {name}", flush=True)
                continue
            _u, c, m, o = ent
            raw = reader.member(o, c, m)
            ds = pydicom.dcmread(io.BytesIO(raw), force=True)
            n_read += 1
            for f in FIELDS:
                v = getattr(ds, f, None)
                if v is not None:
                    seen[f][str(v)] += 1
    finally:
        reader.close()

    print(f"\nread {n_read}/{len(sample)} DICOMs\n", flush=True)
    print(f"{'field':<26}{'present':>8}{'unique':>8}  example", flush=True)
    for f in FIELDS:
        c = seen[f]
        present = sum(c.values())
        uniq = len(c)
        ex = next(iter(c), "-")
        ex = (ex[:40] + "...") if len(ex) > 40 else ex
        print(f"{f:<26}{present:>8}{uniq:>8}  {ex}", flush=True)

    print("\n--- grouping-key decision ---", flush=True)
    for f in ("PatientID", "StudyInstanceUID", "SeriesInstanceUID", "StudyID"):
        c = seen[f]
        present = sum(c.values())
        uniq = len(c)
        if present == 0:
            print(f"{f}: ABSENT in all sampled files", flush=True)
        else:
            print(f"{f}: present in {present}/{n_read}, {uniq} unique -> "
                  f"{'candidate key' if uniq > 1 else 'constant (not a key)'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
