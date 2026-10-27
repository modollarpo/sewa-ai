"""v4 Step 8b: analyse returned clinician labels vs the extractor.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Input: a FILLED blinded labelling sheet (CSV) exported by
`v4_g1_export_blinded.py`, and the G1 run JSON it was exported from.

Label column must be one of: consistent | contradicts | ambiguous
  - contradicts : the report asserts the opposite of the triage decision (a TRUE contradiction)
  - consistent  : the report agrees with / does not contradict the triage decision
  - ambiguous   : cannot be adjudicated (excluded from the binary rate, counted separately)

Outputs:
  - confusion matrix between the extractor contradiction flag and the clinician label,
  - the TRUE contradiction rate with a scan-cluster bootstrap 95% CI (resampling the
    50 scans / StudyInstanceUID clusters),
  - examples of each failure type.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

import numpy as np

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
POS = "contradicts"
NEG = "consistent"
AMB = "ambiguous"


def _label_to_bool(lab: str):
    lab = (lab or "").strip().lower()
    if lab in ("contradicts", "contradict", "true", "1", "yes", "y"):
        return True
    if lab in ("consistent", "agree", "false", "0", "no", "n"):
        return False
    if lab in ("ambiguous", "unsure", "unclear", "?", ""):
        return None
    return None


def load_joined(labels_csv: Path, run_json: Path, extractor: str = "v1"):
    data = json.loads(run_json.read_text(encoding="utf-8"))
    recs = [r for r in data.get("records", []) if r.get("text")]
    if extractor == "v2":
        from validation.scripts.v4_step2_negation_v2 import extract_v2
        for r in recs:
            r["polarity"] = extract_v2(r["text"])["polarity"]
    rows = []
    with labels_csv.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                rid = int(row["row_id"])
            except (KeyError, ValueError, TypeError):
                continue
            if rid < 0 or rid >= len(recs):
                continue
            rec = recs[rid]
            con = bool(((rec.get("polarity") == "present" and not rec.get("decision_present"))
                        or (rec.get("polarity") == "absent" and rec.get("decision_present"))))
            rows.append({
                "row_id": rid, "study": rec.get("study"),
                "decision_present": rec.get("decision_present"),
                "extractor_contradiction": con,
                "extractor_polarity": rec.get("polarity"),
                "label_raw": row.get("label", ""),
                "label": _label_to_bool(row.get("label", "")),
                "notes": row.get("notes", ""),
                "text": rec.get("text"),
            })
    return rows


def cluster_bootstrap(rows, n_boot: int = 5000, seed: int = 20261014) -> dict:
    """Scan-cluster bootstrap CI for the true (label) contradiction rate."""
    by_scan: dict[str, dict] = {}
    for r in rows:
        if r["label"] is None:
            continue
        d = by_scan.setdefault(str(r["study"]), {"n": 0, "k": 0})
        d["n"] += 1
        d["k"] += int(r["label"])
    scans = list(by_scan)
    if not scans:
        return {"rate": None, "ci_low": None, "ci_high": None, "n_scans": 0, "n_reports": 0}
    pooled = sum(by_scan[s]["k"] for s in scans) / sum(by_scan[s]["n"] for s in scans)
    rng = np.random.default_rng(seed)
    boots = np.empty(n_boot)
    for b in range(n_boot):
        pick = rng.choice(len(scans), size=len(scans), replace=True)
        num = sum(by_scan[scans[i]]["k"] for i in pick)
        den = sum(by_scan[scans[i]]["n"] for i in pick)
        boots[b] = num / den if den else np.nan
    lo, hi = np.nanpercentile(boots, [2.5, 97.5])
    return {"rate": pooled, "ci_low": float(lo), "ci_high": float(hi),
            "n_scans": len(scans), "n_reports": int(sum(by_scan[s]["n"] for s in scans)),
            "n_boot": n_boot}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--labels", required=True)
    ap.add_argument("--json", default="validation/reports/v4_g1_qwen.json")
    ap.add_argument("--extractor", choices=["v1", "v2"], default="v1")
    ap.add_argument("--out", default="")
    ap.add_argument("--boot", type=int, default=5000)
    args = ap.parse_args(argv)

    labels_csv = Path(args.labels)
    if not labels_csv.exists():
        print(f"missing {labels_csv}", flush=True)
        return 2
    rows = load_joined(labels_csv, Path(args.json), args.extractor)
    labelled = [r for r in rows if r["label"] is not None]
    if not labelled:
        print("no usable labels (label column empty?)", flush=True)
        return 2

    tp = sum(1 for r in labelled if r["extractor_contradiction"] and r["label"])
    fp = sum(1 for r in labelled if r["extractor_contradiction"] and not r["label"])
    fn = sum(1 for r in labelled if not r["extractor_contradiction"] and r["label"])
    tn = sum(1 for r in labelled if not r["extractor_contradiction"] and not r["label"])
    n_amb = sum(1 for r in rows if r["label"] is None)

    def rate(c, n):
        return c / n if n else None

    prec = rate(tp, tp + fp)
    rec = rate(tp, tp + fn)
    f1 = (2 * prec * rec / (prec + rec)) if (prec and rec) else None

    boot = cluster_bootstrap(labelled, n_boot=args.boot)
    ext_rate = rate(tp + fp, len(labelled))

    def ex(cond, k=6):
        out = [{"row_id": r["row_id"], "study": r["study"], "decision": "present" if r["decision_present"] else "absent",
                "extractor": "contradiction" if r["extractor_contradiction"] else "consistent",
                "label": r["label_raw"], "polarity": r["extractor_polarity"], "text": r["text"]}
               for r in rows if cond(r)][:k]
        return out

    out = {
        "marking": MARK, "extractor": args.extractor, "labels_file": str(labels_csv),
        "n_reports": len(rows), "n_labelled": len(labelled), "n_ambiguous": n_amb,
        "label_counts": dict(Counter(r["label_raw"].strip().lower() for r in rows)),
        "confusion_matrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn,
                             "positive": POS, "negative": NEG},
        "extractor_summary": {"precision": prec, "recall": rec, "f1": f1,
                              "extractor_flagged_rate_all_labelled": ext_rate,
                              "note": "extractor-flagged rate is UNVALIDATED / upper bound; "
                                      "true rate below uses clinician labels"},
        "true_contradiction_rate": boot,
        "failure_examples": {
            "extractor_flag_label_consistent (false positive)": ex(
                lambda r: r["extractor_contradiction"] and not r["label"]),
            "extractor_clear_label_contradicts (false negative)": ex(
                lambda r: not r["extractor_contradiction"] and r["label"]),
            "ambiguous": ex(lambda r: r["label"] is None),
        },
    }
    if args.out:
        Path(args.out).write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"{MARK}  extractor={args.extractor}  labels={labels_csv.name}")
    print(f"labelled={len(labelled)} ambiguous={n_amb} of {len(rows)}")
    print(f"confusion  TP={tp} FP={fp} FN={fn} TN={tn}")
    print(f"extractor  precision={prec} recall={rec} f1={f1}")
    print(f"extractor-flagged rate (upper bound) = {ext_rate:.4f}")
    print(f"TRUE contradiction rate = {boot['rate']:.4f} "
          f"95% CI [{boot['ci_low']:.4f}, {boot['ci_high']:.4f}] over {boot['n_scans']} scans")
    if args.out:
        print("wrote", args.out, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
