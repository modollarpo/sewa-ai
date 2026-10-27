"""Remote (HTTP range) reader for the RSNA competition bundle zip.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

The Kaggle competition is served as ONE ~194 GB zip on GCS (`archive.zip`). It has
no per-file API, so this module reads the ZIP64 central directory over HTTP range
requests and can stream only the chosen members (no full-archive download).

Layout inside the bundle:
  rsna-intracranial-hemorrhage-detection/stage_2_train/<ID>.dcm   (per-slice)
  rsna-intracranial-hemorrhage-detection/stage_2_test/<ID>.dcm
  rsna-intracranial-hemorrhage-detection/stage_2_train.csv        (per-slice labels)
  rsna-intracranial-hemorrhage-detection/stage_2_detailed_class_info.csv
  rsna-intracranial-hemorrhage-detection/stage_2_sample_submission.csv

Honesty notes:
  * RSNA filenames are per-IMAGE, not per-patient. There is no patient id in the
    released data, so a true patient-level split is impossible for RSNA; splits are
    by image id. Recorded in the manifest + every report.
  * Members are deflate-compressed (method 8) inside the zip.
"""
from __future__ import annotations

import struct
import urllib.request
import zlib

COMPETITION = "rsna-intracranial-hemorrhage-detection"
PREFIX = "rsna-intracranial-hemorrhage-detection/"


def _http_range(url: str, start: int, end: int, retries: int = 4) -> bytes:
    last = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
    raise RuntimeError(f"range {start}-{end} failed: {last}")


def bundle_url() -> str:
    """Fresh signed download URL for the competition bundle."""
    from kaggle.api.kaggle_api_extended import KaggleApi
    from kagglesdk.competitions.types.competition_api_service import (
        ApiDownloadDataFilesRequest,
    )

    api = KaggleApi()
    api.authenticate()
    with api.build_kaggle_client() as k:
        req = ApiDownloadDataFilesRequest()
        req.competition_name = "rsna-intracranial-hemorrhage-detection"
        resp = k.competitions.competition_api_client.download_data_files(req)
        return resp.url


def _zip64_extra(usize: int, csize: int, lho: int, extra: bytes):
    """Resolve 0xFFFFFFFF sentinels from the ZIP64 extra field (id 0x0001).

    Order inside the field: uncompressed, compressed, local-header-offset, disk.
    Only members whose 32-bit value saturated are present.
    """
    if usize != 0xFFFFFFFF and csize != 0xFFFFFFFF and lho != 0xFFFFFFFF:
        return usize, csize, lho
    i = 0
    while i + 4 <= len(extra):
        hid, hsz = struct.unpack("<HH", extra[i:i + 4])
        body = extra[i + 4:i + 4 + hsz]
        if hid == 0x0001:
            j = 0
            if usize == 0xFFFFFFFF:
                usize = struct.unpack("<Q", body[j:j + 8])[0]
                j += 8
            if csize == 0xFFFFFFFF:
                csize = struct.unpack("<Q", body[j:j + 8])[0]
                j += 8
            if lho == 0xFFFFFFFF:
                lho = struct.unpack("<Q", body[j:j + 8])[0]
                j += 8
            return usize, csize, lho
        i += 4 + hsz
    return usize, csize, lho


class RemoteZip:
    """Seek-by-range reader over a remote ZIP64 archive."""

    def __init__(self, url: str):
        self.url = url
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=30) as r:
            self.size = int(r.headers["Content-Length"])

    def _read_range(self, start: int, end: int) -> bytes:
        last = None
        for _ in range(4):
            try:
                req = urllib.request.Request(self.url, headers={"Range": f"bytes={start}-{end}"})
                with urllib.request.urlopen(req, timeout=120) as r:
                    return r.read()
            except Exception as e:  # noqa: BLE001
                last = e
        raise RuntimeError(f"range {start}-{end} failed: {last}")

    def _zip64_eocd(self):
        tail = self._read_range(self.size - 100000, self.size - 1)
        loc = tail.rfind(b"PK\x06\x07")
        if loc == -1:
            raise ValueError("no ZIP64 EOCD locator (not a zip64 archive)")
        _, z64ofs, _ndisks = struct.unpack("<IQI", tail[loc + 4:loc + 20])
        z64 = self._read_range(z64ofs, z64ofs + 55)
        if z64[:4] != b"PK\x06\x06":
            raise ValueError("bad ZIP64 EOCD signature")
        vals = struct.unpack("<QHHIIQQQQ", z64[4:4 + 52])
        _rec, _vm, _vn, _d, _ds, _nthis, ntotal, cdsize, cdofs = vals
        return ntotal, cdsize, cdofs

    def entries(self):
        """Yield (name, usize, csize, method, header_offset) for every member."""
        ntotal, cdsize, cdofs = self._zip64_eocd()
        CHUNK = 8 * 1024 * 1024
        got = 0
        pos = cdofs
        buf = b""
        while got < ntotal:
            if len(buf) < CHUNK:
                want = min(CHUNK, (cdofs + cdsize) - pos)
                if want > 0:
                    buf += self._read_range(pos, pos + want - 1)
                    pos += want
            i = 0
            progressed = False
            while got < ntotal:
                if i + 46 > len(buf):
                    break
                if buf[i:i + 4] != b"PK\x01\x02":
                    i += 1
                    continue
                h = buf[i + 4:i + 46]
                (_vm, _vn, _flags, method, _mt, _md, _crc, csize, usize,
                 nlen, elen, clen, _disk, _ia, _ea, lho) = struct.unpack("<HHHHHHIIIHHHHHII", h)
                rec_end = i + 46 + nlen + elen + clen
                if rec_end > len(buf):
                    break  # record spans the chunk boundary; refill below
                name = buf[i + 46:i + 46 + nlen].decode("utf-8", "replace")
                extra = buf[i + 46 + nlen:i + 46 + nlen + elen]
                u, c, o = _zip64_extra(usize, csize, lho, extra)
                yield name, u, c, method, o
                got += 1
                i = rec_end
                progressed = True
            buf = buf[i:]
            if not progressed and len(buf) >= CHUNK:
                raise RuntimeError(f"central directory parse stalled at {got}/{ntotal}")

    def read_member(self, header_offset: int, csize: int, method: int) -> bytes:
        """Read + decompress a single member by its local-header offset."""
        lh = self._read_range(header_offset, header_offset + 29)
        if lh[:4] != b"PK\x03\x04":
            raise ValueError("bad local file header")
        nlen, elen = struct.unpack("<HH", lh[26:30])
        data_start = header_offset + 30 + nlen + elen
        raw = self._read_range(data_start, data_start + csize - 1)
        if method == 0:
            return raw
        if method == 8:
            return zlib.decompress(raw, -15)
        raise ValueError(f"unsupported compression method {method}")
