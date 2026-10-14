"""v4 Step 8e: analyse the RETURNED merged label sheet (variants a+b).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Inputs:
  --sheet  the filled merged sheet (v4_g1_merged_labelling_sheet.csv)
  --key    the private key (v4_g1_merged_key_PRIVATE.json)
Run JSONs (variant a: v4_g1_qwen.json, variant b: v4_g1_qwen_b.json) give the extractor
polarity per report.

Computes:
  - inter-labeller agreement on the second-labeller subset: Cohen's kappa (label vs label_2),
  - the extractor-vs-clinician confusion matrix (TP/FP/FN/TN) + precision/recall/F1,
  - the TRUE contradiction rate per prompt variant, each with a scan-cluster bootstrap
    95% CI (resampling the 50 StudyInstanceUID clusters),
  - examples of each failure type.

No tuning on the 150 reports; labels only.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

import numpy as np

from validation.scripts.v4_g1_label_analysis import _label_to_bool, cluster_bootstrap

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
RUN_JSONS = {"a": Path("validation/reports/v4_g1_qwen.json"),
             "b": Path("validation/reports/v4_g1_qwen_b.json")}
RATE_KEY = "extractor_flagged_contradiction_rate_unvalidated_upper_bound"


def cohen_kappa(a: list, b: list, labels=("consistent", "contradicts", "ambiguous")) -> dict:
    """Cohen's kappa over paired categorical labels."""
    pairs = [(x, y) for x, y in zip(a, b) if x is not None and y is not None]
    n = len(pairs)
    if n == 0:
        return {"kappa": None, "n": 0, "po": None, "pe": None}
    po = sum(1 for x, y in pairs if x == y) / n
    cx = Counter(x for x, _ in pairs)
    cy = Counter(y for _, y in pairs)
    pe = sum((cx[l] / n) * (cy[l] / n) for l in labels)
    kappa = (po - pe) / (1 - pe) if pe != 1 else None
    return {"kappa": kappa, "n": n, "po": po, "pe": pe}


def _norm(lab: str) -> str | None:
    lab = (lab or "").strip().lower()
    if lab in ("contradicts", "contradict"):
        return "contradicts"
    if lab in ("consistent", "agree"):
        return "consistent"
    if lab in ("ambiguous", "unsure", "unclear"):
        return "ambiguous"
    return None


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheet", default="validation/reports/v4_g1_merged_labelling_sheet.csv")
    ap.add_argument("--key", default="validation/reports/v4_g1_merged_key_PRIVATE.json")
    ap.add_argument("--out", default="validation/reports/v4_merged_label_analysis.json")
    ap.add_argument("--boot", type=int, default=5000)
    args = ap.parse_args(argv)

    sheet, key_path = Path(args.sheet), Path(args.key)
    if not sheet.exists() or not key_path.exists():
        print(f"missing sheet/key: sheet={sheet.exists()} key={key_path.exists()}", flush=True)
        return 2
    key = json.loads(key_path.read_text(encoding="utf-8"))["key"]
    runs = {v: json.loads(p.read_text(encoding="utf-8")) for v, p in RUN_JSONS.items()
            if p.exists()}
    recs = {v: [r for r in d.get("records", []) if r.get("text")] for v, d in runs.items()}

    rows = []
    with sheet.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            nid = (row.get("new_id") or "").strip()
            if nid not in key:
                continue
            meta = key[nid]
            variant = meta["variant"]
            rec = recs.get(variant, [])[meta["source_row_id"]] if meta["source_row_id"] < len(
                recs.get(variant, [])) else None
            if rec is None:
                continue
            con = bool((rec.get("polarity") == "present" and not rec.get("decision_present"))
                       or (rec.get("polarity") == "absent" and rec.get("decision_present")))
            rows.append({
                "new_id": nid, "variant": variant, "study": meta.get("study"),
                "extractor_contradiction": con, "extractor_polarity": rec.get("polarity"),
                "label_raw": row.get("label", ""), "label": _label_to_bool(row.get("label", "")),
                "label_norm": _norm(row.get("label", "")),
                "label2_norm": _norm(row.get("label_2", "")),
                "subset": (row.get("second_labeller_subset", "").strip().upper() == "TRUE"),
                "text": rec.get("text"),
            })

    labelled = [r for r in rows if r["label"] is not None]
    if not labelled:
        print("no usable labels (label column empty?)", flush=True)
        return 2

    # 1. inter-labeller agreement (Cohen's kappa) on the subset
    sub = [r for r in rows if r["subset"] and r["label_norm"] and r["label2_norm"]]
    kappa = cohen_kappa([r["label_norm"] for r in sub], [r["label2_norm"] for r in sub])

    # 2. confusion matrix vs extractor (primary labeller)
    tp = sum(1 for r in labelled if r["extractor_contradiction"] and r["label"])
    fp = sum(1 for r in labelled if r["extractor_contradiction"] and not r["label"])
    fn = sum(1 for r in labelled if not r["extractor_contradiction"] and r["label"])
    tn = sum(1 for r in labelled if not r["extractor_contradiction"] and not r["label"])
    prec = tp / (tp + fp) if (tp + fp) else None
    rec_ = tp / (tp + fn) if (tp + fn) else None
    f1 = (2 * prec * rec_ / (prec + rec_)) if (prec and rec_) else None

    # 3. true contradiction rate per variant + cluster bootstrap
    by_variant = {}
    for v in ("a", "b"):
        vr = [r for r in labelled if r["variant"] == v]
        by_variant[v] = cluster_bootstrap(vr, n_boot=args.boot)
        by_variant[v]["extractor_flagged_rate"] = (
            sum(1 for r in vr if r["extractor_contradiction"]) / len(vr) if vr else None)
        by_variant[v]["n_ambiguous"] = sum(1 for r in rows if r["variant"] == v and r["label"] is None)

    def ex(cond, k=6):
        return [{"new_id": r["new_id"], "variant": r["variant"], "decision": r["extractor_polarity"],
                 "extractor": "contradiction" if r["extractor_contradiction"] else "consistent",
                 "label": r["label_raw"], "text": r["text"]}
                for r in rows if cond(r)][:k]

    out = {
        "marking": MARK,
        "n_rows": len(rows), "n_labelled": len(labelled),
        "n_ambiguous": sum(1 for r in rows if r["label"] is None),
        "label_counts": dict(Counter(r["label_raw"].strip().lower() for r in rows)),
        "inter_labeller_kappa": kappa,
        "confusion_matrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "extractor_summary": {"precision": prec, "recall": rec_, "f1": f1},
        "contradiction_rate_by_variant": by_variant,
        "failure_examples": {
            "extractor_flag_label_consistent (false positive)": ex(
                lambda r: r["extractor_contradiction"] and not r["label"]),
            "extractor_clear_label_contradicts (false negative)": ex(
                lambda r: not r["extractor_contradiction"] and r["label"]),
            "ambiguous": ex(lambda r: r["label"] is None),
        },
    }
    Path(args.out).write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"{MARK}")
    print(f"labelled={len(labelled)} ambiguous={out['n_ambiguous']} of {len(rows)}")
    print(f"inter-labeller Cohen's kappa = {kappa['kappa']} (n={kappa['n']})")
    print(f"confusion TP={tp} FP={fp} FN={fn} TN={tn}; P={prec} R={rec_} F1={f1}")
    for v in ("a", "b"):
        d = by_variant[v]
        print(f"variant {v}: TRUE rate={d['rate']} 95% CI [{d['ci_low']}, {d['ci_high']}] "
              f"over {d['n_scans']} scans (extractor-flagged {d['extractor_flagged_rate']})")
    print("wrote", args.out, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
