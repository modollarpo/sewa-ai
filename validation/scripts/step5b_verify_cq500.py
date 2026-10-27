"""Step 5b (v2 amendment 1 §5c): verify the staged CQ500 (Test C) — HELD.

Test C is NOT evaluated. This script only verifies integrity of the staged copy in the
Azure blob container before any future use: it lists blob names + sizes, checks the
expected file set (CQ500-CT-<N>.zip for N=0..490 plus reads.csv) and totals, and
reports any missing/extra/blob-size anomalies.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ACCOUNT = "sewavalidationdata"
CONTAINER = "cq500"
EXPECTED = {"reads.csv"}
EXPECTED |= {f"CQ500-CT-{n}.zip" for n in range(491)}
EXPECTED_BYTES = 28_660_285_880  # 493 files, from the staged manifest
REPORT = Path("validation/reports/v2a1_cq500_verify.json")


def _az(*args):
    return subprocess.run(["az", *args], shell=True, capture_output=True, text=True, check=True).stdout


def main() -> int:
    raw = _az("storage", "blob", "list", "--account-name", ACCOUNT,
              "--container-name", CONTAINER, "--auth-mode", "key",
              "--query", "[].{n:name,s:properties.contentLength}", "-o", "json")
    blobs = json.loads(raw) if raw.strip() else []
    names = {b["n"] for b in blobs}
    total = sum(int(b["s"]) for b in blobs)
    report = {
        "account": ACCOUNT, "container": CONTAINER, "n_files": len(blobs), "total_bytes": total,
        "expected_files": len(EXPECTED), "expected_bytes": EXPECTED_BYTES,
        "missing": sorted(EXPECTED - names), "extra": sorted(names - EXPECTED),
        "size_match": total == EXPECTED_BYTES, "n_match": len(blobs) == len(EXPECTED),
        "status": "HELD - not evaluated; checksums to be verified before any use",
        "marking": "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.",
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    return 0 if (report["size_match"] and report["n_match"] and not report["missing"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
