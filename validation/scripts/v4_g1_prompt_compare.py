"""v4 Step 8c: compare the two G1 prompt variants (a: triage line, b: explicit decision).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Compares the extractor-flagged contradiction rate for variants a and b, and - once the
clinician labels are returned - the TRUE (label-based) contradiction rate for each with a
scan-cluster bootstrap 95% CI, plus their PAIRED difference (same 50 scans, so the
difference is bootstrapped over scans).

Both variants use the same scans, seeds and sampling settings; only the prompt differs
(variant b includes the explicit decision string).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from validation.scripts.v4_g1_label_analysis import cluster_bootstrap, load_joined

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
RATE_KEY = "extractor_flagged_contradiction_rate_unvalidated_upper_bound"


def _flagged(path: Path) -> dict:
    d = json.loads(path.read_text(encoding="utf-8"))
    return {"rate": d.get(RATE_KEY), "n_parsed": d.get("n_parsed"),
            "polarity_counts": d.get("polarity_counts"), "prompt_variant": d.get("prompt_variant")}


def _paired_diff(rows_a, rows_b, n_boot=5000, seed=20261015) -> dict:
    """Paired scan-cluster bootstrap of rate_a - rate_b (same scans)."""
    def by_scan(rows):
        d: dict[str, list] = {}
        for r in rows:
            if r["label"] is None:
                continue
            d.setdefault(str(r["study"]), []).append(int(r["label"]))
        return d
    a, b = by_scan(rows_a), by_scan(rows_b)
    scans = sorted(set(a) & set(b))
    if not scans:
        return {"diff": None, "ci_low": None, "ci_high": None, "n_scans": 0}
    def pooled(d):
        num = sum(sum(d[s]) for s in scans)
        den = sum(len(d[s]) for s in scans)
        return num / den if den else np.nan
    point = pooled(a) - pooled(b)
    rng = np.random.default_rng(seed)
    boots = np.empty(n_boot)
    for i in range(n_boot):
        pick = rng.choice(len(scans), size=len(scans), replace=True)
        ss = [scans[j] for j in pick]
        na = sum(sum(a[s]) for s in ss); da = sum(len(a[s]) for s in ss)
        nb = sum(sum(b[s]) for s in ss); db = sum(len(b[s]) for s in ss)
        boots[i] = (na / da if da else np.nan) - (nb / db if db else np.nan)
    lo, hi = np.nanpercentile(boots, [2.5, 97.5])
    return {"diff": point, "ci_low": float(lo), "ci_high": float(hi), "n_scans": len(scans)}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--a-json", default="validation/reports/v4_g1_qwen.json")
    ap.add_argument("--b-json", default="validation/reports/v4_g1_qwen_b.json")
    ap.add_argument("--a-labels", default="validation/reports/v4_g1_blinded_labelling_sheet.csv")
    ap.add_argument("--b-labels", default="validation/reports/v4_g1b_blinded_labelling_sheet.csv")
    ap.add_argument("--extractor", choices=["v1", "v2"], default="v1")
    ap.add_argument("--out", default="validation/reports/v4_g1_prompt_compare.json")
    args = ap.parse_args(argv)

    a_json, b_json = Path(args.a_json), Path(args.b_json)
    if not a_json.exists() or not b_json.exists():
        print(f"need both runs: a={a_json.exists()} b={b_json.exists()}", flush=True)
        return 2
    out = {"marking": MARK, "extractor": args.extractor,
           "variant_a": {"extractor_flagged": _flagged(a_json)},
           "variant_b": {"extractor_flagged": _flagged(b_json)}}

    a_lab, b_lab = Path(args.a_labels), Path(args.b_labels)
    if a_lab.exists() and b_lab.exists():
        rows_a = load_joined(a_lab, a_json, args.extractor)
        rows_b = load_joined(b_lab, b_json, args.extractor)
        if any(r["label"] is not None for r in rows_a) and any(r["label"] is not None for r in rows_b):
            out["variant_a"]["true_rate"] = cluster_bootstrap(
                [r for r in rows_a if r["label"] is not None])
            out["variant_b"]["true_rate"] = cluster_bootstrap(
                [r for r in rows_b if r["label"] is not None])
            out["paired_true_rate_difference_a_minus_b"] = _paired_diff(rows_a, rows_b)
        else:
            out["labels_note"] = "label columns empty; only extractor-flagged rates compared"
    else:
        out["labels_note"] = "clinician label sheets not present yet; only extractor-flagged rates compared"

    Path(args.out).write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"{MARK}  extractor={args.extractor}")
    print(f"variant a extractor-flagged rate = {out['variant_a']['extractor_flagged']['rate']}")
    print(f"variant b extractor-flagged rate = {out['variant_b']['extractor_flagged']['rate']}")
    if "paired_true_rate_difference_a_minus_b" in out:
        d = out["paired_true_rate_difference_a_minus_b"]
        print(f"paired TRUE rate diff (a-b) = {d['diff']:.4f} "
              f"95% CI [{d['ci_low']:.4f}, {d['ci_high']:.4f}] over {d['n_scans']} scans")
    else:
        print(out.get("labels_note"))
    print("wrote", args.out, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
