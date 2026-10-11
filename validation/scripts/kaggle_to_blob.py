"""Kaggle -> Azure Blob fetcher for the validation study.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Downloads competition files from Kaggle into the dedicated study blob account.
Each file is fetched into a per-file temp dir and that temp dir is deleted on
exit, so no full-dataset residue is left on the local machine.

Auth
----
Kaggle : token at ~/.kaggle/access_token (or KAGGLE_API_TOKEN env var).
Azure  : DefaultAzureCredential (az login) against
         https://sewavalidationdata.blob.core.windows.net
         Requires 'Storage Blob Data Contributor' on the account and the
         machine's egress IP allowed by the storage firewall.

Usage
-----
  python -m validation.scripts.kaggle_to_blob ip
  python -m validation.scripts.kaggle_to_blob list --competition rsna-intracranial-hemorrhage-detection
  python -m validation.scripts.kaggle_to_blob get  --competition <c> --container rsna-subset --file stage_2_train.csv
  python -m validation.scripts.kaggle_to_blob whole --competition <c> --container rsna-subset --yes
"""
from __future__ import annotations

import argparse
import os
import sys
import tempfile
from pathlib import Path

ACCOUNT_URL = os.environ.get(
    "VALIDATION_BLOB_ACCOUNT_URL",
    "https://sewavalidationdata.blob.core.windows.net",
)


def _kaggle_api():
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
    except ImportError:
        sys.exit("kaggle not installed: python -m pip install kaggle")
    api = KaggleApi()
    api.authenticate()
    return api


def _iter_competition_files(api, competition: str):
    page = ""
    while True:
        resp = api.competition_list_files(competition, page_token=page)
        for f in getattr(resp, "files", []) or []:
            yield f
        page = getattr(resp, "nextPageToken", "") or ""
        if not page:
            break


def _blob_container(container: str):
    try:
        from azure.identity import DefaultAzureCredential
        from azure.storage.blob import BlobServiceClient
    except ImportError:
        sys.exit("azure-storage-blob not installed: "
                 "python -m pip install azure-storage-blob azure-identity")
    svc = BlobServiceClient(account_url=ACCOUNT_URL, credential=DefaultAzureCredential())
    return svc.get_container_client(container)


def _download_and_store(api, competition: str, file_name: str, container: str) -> None:
    """Fetch one Kaggle file into a temp dir, upload to blob, drop the temp dir."""
    with tempfile.TemporaryDirectory(prefix="sewa_val_") as td:
        api.competition_download_file(competition, file_name, path=td, force=True)
        local = Path(td) / Path(file_name).name
        if not local.exists():
            raise FileNotFoundError(f"download did not produce {local}")
        size_mb = local.stat().st_size / 1e6
        print(f"  downloaded {local.name} ({size_mb:.1f} MB) -> uploading")
        with open(local, "rb") as fh:
            _blob_container(container).get_blob_client(local.name).upload_blob(fh, overwrite=True)
        print(f"  uploaded -> {container}/{local.name}")


def cmd_ip(_: argparse.Namespace) -> int:
    import urllib.request
    ip = urllib.request.urlopen("https://api.ipify.org", timeout=15).read().decode()
    print(f"egress IP = {ip}\nAdd if missing:\n"
          f"  az storage account network-rule add --account-name sewavalidationdata "
          f"--resource-group sewa-validation-rg --ip-address {ip}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    api = _kaggle_api()
    files = list(_iter_competition_files(api, args.competition))
    if not files:
        print("No files returned. Usual cause: the competition rules/terms are not "
              "yet accepted on this Kaggle account. Open the competition page in a "
              "browser and click 'I Understand and Accept', then retry.")
        return 2
    total = 0
    for f in files:
        size = getattr(f, "totalBytes", 0) or 0
        total += size
        print(f"{size/1e9:10.3f} GB  {f.fileName}")
    print(f"\n{len(files)} files, ~{total/1e9:.1f} GB total")
    return 0


def cmd_get(args: argparse.Namespace) -> int:
    api = _kaggle_api()
    for name in args.file:
        print(f"[{name}]")
        _download_and_store(api, args.competition, name, args.container)
    return 0


def cmd_whole(args: argparse.Namespace) -> int:
    api = _kaggle_api()
    files = list(_iter_competition_files(api, args.competition))
    if not files:
        sys.exit("no files (accept the competition rules in the browser first)")
    total = sum(getattr(f, "totalBytes", 0) or 0 for f in files)
    print(f"{len(files)} files, ~{total/1e9:.1f} GB")
    if not args.yes:
        sys.exit("refusing without --yes (large download)")
    for f in files:
        print(f"[{f.fileName}]")
        _download_and_store(api, args.competition, f.fileName, args.container)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("ip", help="show egress IP + firewall command")
    sp.set_defaults(func=cmd_ip)

    sp = sub.add_parser("list", help="list competition files (no download)")
    sp.add_argument("--competition", required=True)
    sp.set_defaults(func=cmd_list)

    sp = sub.add_parser("get", help="download named files and upload to blob")
    sp.add_argument("--competition", required=True)
    sp.add_argument("--file", action="append", required=True)
    sp.add_argument("--container", required=True)
    sp.set_defaults(func=cmd_get)

    sp = sub.add_parser("whole", help="download every file (large) and upload")
    sp.add_argument("--competition", required=True)
    sp.add_argument("--container", required=True)
    sp.add_argument("--yes", action="store_true")
    sp.set_defaults(func=cmd_whole)
    return p


if __name__ == "__main__":
    _args = build_parser().parse_args()
    raise SystemExit(_args.func(_args))
