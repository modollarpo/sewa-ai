"""v4 Step 8: export a BLINDED clinician labelling sheet from a G1 run.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

One row per generated report, in random order with a fixed seed. The sheet shows the
triage decision, probability and urgency, plus the report text, but NOT the extractor
polarity and NOT the contradiction flag (so the extractor is not leaked to the labeller).

Columns: row_id, study, index, k, seed, decision, probability, urgency, report_text,
         label (consistent|contradicts|ambiguous), notes, clinician_signoff.

Usage:
  python -m validation.scripts.v4_g1_export_blinded \
      --json validation/reports/v4_g1_qwen.json \
      --out validation/reports/v4_g1_blinded_labelling_sheet.csv [--seed 20251014]
"""
from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
LABEL_GUIDE = "consistent|contradicts|ambiguous"
FIELDS = ["row_id", "study", "index", "k", "seed", "decision", "probability", "urgency",
          "report_text", "label", "notes", "clinician_signoff"]


def build_rows(records: list[dict], seed: int) -> list[dict]:
    recs = [r for r in records if r.get("text")]
    order = list(range(len(recs)))
    random.Random(seed).shuffle(order)
    rows = []
    for j in order:
        r = recs[j]
        rows.append({
            "row_id": j,
            "study": r.get("study"),
            "index": r.get("index"),
            "k": r.get("k"),
            "seed": r.get("seed"),
            "decision": "present" if r.get("decision_present") else "absent",
            "probability": r.get("prob"),
            "urgency": r.get("urgency"),
            "report_text": r.get("text"),
            "label": "",
            "notes": "",
            "clinician_signoff": "",
        })
    return rows


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", default="validation/reports/v4_g1_qwen.json")
    ap.add_argument("--out", default="validation/reports/v4_g1_blinded_labelling_sheet.csv")
    ap.add_argument("--seed", type=int, default=20251014)
    args = ap.parse_args(argv)

    src = Path(args.json)
    if not src.exists():
        print(f"missing {src}", flush=True)
        return 2
    data = json.loads(src.read_text(encoding="utf-8"))
    rows = build_rows(data.get("records", []), args.seed)
    if not rows:
        print("no generated reports in source", flush=True)
        return 2

    out = Path(args.out)
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"{MARK}\nwrote {out} ({len(rows)} rows; label column = {LABEL_GUIDE})",
          flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
