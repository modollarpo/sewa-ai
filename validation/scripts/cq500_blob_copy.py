"""Stage the CQ500 dataset into the Azure validation blob container via server-side
copy from the Academic Torrents S3 webseed (public HTTP source).

No local download, no VM: Azure Storage fetches each object from S3 server-side.
Idempotent + resumable - re-running skips blobs that already copied successfully.

Source: https://s3.ap-south-1.amazonaws.com/qure.headct.study/<file>
  - CQ500-CT-0.zip .. CQ500-CT-490.zip  (491 scans, anonymized DICOMs)
  - reads.csv                            (3 radiologist reads x 13 findings, incl. ICH)
  - prediction_probabilities.csv         (Qure model probs; not used by the study)
Licence: CC BY-NC-SA 4.0 (noncommercial) - use approved by the user.
"""

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from azure.storage.blob import BlobServiceClient

ACCOUNT = "sewavalidationdata"
CONTAINER = "cq500"
S3_BASE = "https://s3.ap-south-1.amazonaws.com/qure.headct.study/"
FILES = [f"CQ500-CT-{i}.zip" for i in range(491)] + [
    "reads.csv",
    "prediction_probabilities.csv",
]


def clients():
    # Shared-key auth via connection string: no Azure CLI / token refresh
    # (avoids the Windows az.cmd shell=False failure). Key comes from
    # AZURE_STORAGE_KEY or a temp file - never committed.
    key = os.environ.get("AZURE_STORAGE_KEY")
    if not key:
        key = (Path(os.environ["TEMP"]) / "azkey.txt").read_text().strip()
    conn = (
        f"DefaultEndpointsProtocol=https;AccountName={ACCOUNT};"
        f"AccountKey={key};EndpointSuffix=core.windows.net"
    )
    svc = BlobServiceClient.from_connection_string(conn)
    return svc.get_container_client(CONTAINER)


def start_one(container, name):
    bc = container.get_blob_client(name)
    try:
        props = bc.get_blob_properties()
        if props.copy and props.copy.status == "success" and props.size and props.size > 0:
            return name, "exists", props.size
    except Exception:
        pass
    bc.start_copy_from_url(S3_BASE + name)
    return name, "started", None


def main():
    container = clients()
    print(f"starting server-side copy for {len(FILES)} files into {CONTAINER}...", flush=True)
    with ThreadPoolExecutor(max_workers=16) as pool:
        for name, status, size in pool.map(lambda n: start_one(container, n), FILES):
            if status == "started":
                print(f"  started {name}", flush=True)

    print("polling until all copies finish...", flush=True)
    pending = set(FILES)
    done = 0
    failed = []
    while pending:
        time.sleep(20)
        for name in list(pending):
            try:
                props = container.get_blob_client(name).get_blob_properties()
                st = props.copy.status if props.copy else None
                if st == "success":
                    done += 1
                    pending.discard(name)
                    print(f"  [{done}/{len(FILES)}] {name} ({props.size} bytes)", flush=True)
                elif st in ("aborted", "failed"):
                    failed.append(name)
                    pending.discard(name)
                    print(f"  FAILED {name}: {st}", flush=True)
            except Exception as exc:
                print(f"  poll error {name}: {exc}", flush=True)

    print(f"\ncopies complete: {done}/{len(FILES)} success, {len(failed)} failed", flush=True)
    if failed:
        print("failed files:", failed, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
