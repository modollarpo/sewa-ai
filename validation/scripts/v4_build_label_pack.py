"""v4 Step 8d: build the unlabelled clinician labelling pack + private key + hashes.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Produces (does not modify any input):
  1. a clinician copy of `v4_extractor_clinician_review.csv` WITHOUT `proposed_label`
     (the original is kept unchanged as the answer key),
  2. one merged 300-row sheet combining the variant-a and variant-b blinded G1 sheets,
     shuffled with a fixed seed and re-numbered, with NO column revealing the prompt
     variant, plus a `second_labeller_subset` flag on a random 50 rows,
  3. a PRIVATE key mapping new row id -> (source sheet, original row_id, variant, scan),
  4. SHA-256 hashes of all unlabelled files -> docs/evidence/label_hashes.txt.

Usage: python -m validation.scripts.v4_build_label_pack
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
from pathlib import Path

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
INSTRUCTIONS = ("If a report both asserts and denies the finding, label it ambiguous and add "
                "a note. label = consistent | contradicts | ambiguous. contradicts = the "
                "report asserts the opposite of the triage decision.")

ORIG_REVIEW = Path("validation/reports/v4_extractor_clinician_review.csv")
CLIN_COPY = Path("validation/reports/v4_extractor_clinician_review_clinician.csv")
SHEET_A = Path("validation/reports/v4_g1_blinded_labelling_sheet.csv")
SHEET_B = Path("validation/reports/v4_g1b_blinded_labelling_sheet.csv")
MERGED = Path("validation/reports/v4_g1_merged_labelling_sheet.csv")
KEY = Path("validation/reports/v4_g1_merged_key_PRIVATE.json")
HASHES = Path("docs/evidence/label_hashes.txt")

MERGED_FIELDS = ["new_id", "decision", "probability", "urgency", "report_text",
                 "second_labeller_subset", "label", "label_2", "notes",
                 "clinician_signoff", "instructions"]


def clinician_copy() -> None:
    with ORIG_REVIEW.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    with CLIN_COPY.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id", "sentence", "clinician_label", "comment"])
        w.writeheader()
        for r in rows:
            w.writerow({"id": r.get("id", ""), "sentence": r.get("sentence", ""),
                        "clinician_label": r.get("clinician_label", ""),
                        "comment": r.get("comment", "")})
    print(f"  clinician copy (no proposed_label): {CLIN_COPY} ({len(rows)} rows)")


def _read_sheet(path: Path, variant: str) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [{**row, "_variant": variant} for row in csv.DictReader(f)]


def merge(seed: int, n_second: int) -> None:
    rows = _read_sheet(SHEET_A, "a") + _read_sheet(SHEET_B, "b")
    random.Random(seed).shuffle(rows)
    subset_idx = set(random.Random(seed + 1).sample(range(len(rows)), n_second))
    out_rows, key = [], {}
    for i, r in enumerate(rows):
        new_id = f"R{i + 1:03d}"
        out_rows.append({
            "new_id": new_id,
            "decision": r.get("decision", ""),
            "probability": r.get("probability", ""),
            "urgency": r.get("urgency", ""),
            "report_text": r.get("report_text", ""),
            "second_labeller_subset": "TRUE" if i in subset_idx else "",
            "label": "", "label_2": "", "notes": "", "clinician_signoff": "",
            "instructions": INSTRUCTIONS,
        })
        key[new_id] = {"variant": r["_variant"], "source_row_id": int(r["row_id"]),
                       "study": r.get("study"), "index": r.get("index"), "k": r.get("k"),
                       "seed": r.get("seed")}
    with MERGED.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=MERGED_FIELDS)
        w.writeheader()
        w.writerows(out_rows)
    KEY.write_text(json.dumps({"marking": MARK, "seed": seed,
                               "n_second_labeller": n_second, "key": key}, indent=2),
                   encoding="utf-8")
    print(f"  merged sheet: {MERGED} ({len(out_rows)} rows; "
          f"{n_second} marked for a second labeller)")
    print(f"  private key:  {KEY}")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def write_hashes(files: list[Path]) -> None:
    lines = [f"# {MARK}", "# SHA-256 of unlabelled labelling artefacts", ""]
    for p in files:
        if p.exists():
            lines.append(f"{sha256(p)}  {p.as_posix()}")
        else:
            lines.append(f"{'MISSING':<64}  {p.as_posix()}")
    HASHES.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  hashes: {HASHES}")
    for ln in lines[2:]:
        print("   ", ln)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=20261101)
    ap.add_argument("--second-labeller", type=int, default=50)
    args = ap.parse_args(argv)
    print(f"{MARK}\nbuilding label pack")
    clinician_copy()
    merge(args.seed, args.second_labeller)
    write_hashes([CLIN_COPY, SHEET_A, SHEET_B, MERGED])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
