"""Download CQ500 feature cache from Azure Blob Storage with streaming chunk progress."""
import os
import sys
import time
from pathlib import Path
from azure.storage.blob import BlobServiceClient

ACCOUNT = "sewavalidationdata"
CONTAINER = "processed"
BLOB_NAME = "v2_early_cq500.npz"
DEST_DIR = Path("validation/data_cache")

def main():
    conn = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not conn:
        print("ERROR: AZURE_STORAGE_CONNECTION_STRING not set in environment", flush=True)
        return 1

    DEST_DIR.mkdir(parents=True, exist_ok=True)
    dest_file = DEST_DIR / BLOB_NAME

    print(f"Connecting to {ACCOUNT}/{CONTAINER}...", flush=True)
    service = BlobServiceClient.from_connection_string(conn)
    container = service.get_container_client(CONTAINER)
    blob_client = container.get_blob_client(BLOB_NAME)

    props = blob_client.get_blob_properties()
    total_bytes = props.size
    print(f"Blob size: {total_bytes / 1e6:.1f} MB", flush=True)

    # Download with parallel threads into file
    t0 = time.time()
    print("Starting parallel multi-threaded download (max_concurrency=8)...", flush=True)
    with open(dest_file, "wb") as f:
        blob_client.download_blob(max_concurrency=8).readinto(f)

    print(f"\nDownload complete in {time.time() - t0:.1f}s -> {dest_file} ({dest_file.stat().st_size / 1e6:.1f} MB)", flush=True)

    # Also download manifest and report
    for extra in ["cq500_manifest.json", "step9a_cq500_preprocess.json"]:
        try:
            b = container.get_blob_client(extra).download_blob().readall()
            (DEST_DIR / extra).write_bytes(b)
            if extra.endswith(".json") and "step9a" in extra:
                Path("validation/reports/step9a_cq500_preprocess.json").write_bytes(b)
            print(f"Saved {extra} ({len(b)} bytes)", flush=True)
        except Exception as exc:
            print(f"Warning: could not download {extra}: {exc}", flush=True)

    return 0

if __name__ == "__main__":
    sys.exit(main())
