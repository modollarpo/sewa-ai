"""v4 Step 2c: apply extractor v2 to the 150 G1 reports ONCE, labelled EXPLORATORY.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

The 150 G1 reports are used to TUNE NOTHING. Extractor v2 was frozen on the separate
probability synthetic set (`v4_step2_negation_v2.py`). This script applies it once and
reports the result as EXPLORATORY, alongside the v1 extractor for comparison.

Output: validation/reports/v4_negation_v2_g1_exploratory.json
"""
from __future__ import annotations

import json
from pathlib import Path

from validation.scripts.v4_step2_negation import extract as extract_v1
from validation.scripts.v4_step2_negation_v2 import extract_v2
from validation.scripts.v4_g1_qwen import RATE_KEY, is_contradiction

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. EXPLORATORY (UNTUNED)."
SRC = Path("validation/reports/v4_g1_qwen.json")
OUT = Path("validation/reports/v4_negation_v2_g1_exploratory.json")


def _rate(recs, polarity_fn):
    ok = [r for r in recs if r.get("text")]
    c = 0
    pols: dict[str, int] = {}
    rows = []
    for r in ok:
        pol = polarity_fn(r["text"])["polarity"]
        pols[str(pol)] = pols.get(str(pol), 0) + 1
        con = bool(is_contradiction(pol, r["decision_present"]))
        c += con
        rows.append({"index": r["index"], "k": r["k"], "decision_present": r["decision_present"],
                     "polarity": pol, "contradiction": con})
    return {"n": len(ok), "rate": c / len(ok) if ok else None, "polarity_counts": pols, "rows": rows}


def main() -> int:
    if not SRC.exists():
        print(f"missing {SRC}", flush=True)
        return 2
    data = json.loads(SRC.read_text(encoding="utf-8"))
    recs = data.get("records", [])
    v1 = _rate(recs, extract_v1)
    v2 = _rate(recs, extract_v2)
    out = {
        "marking": MARK,
        "status": "exploratory",
        "note": "extractor v2 frozen on a separate probability synthetic set; applied to the "
                "150 G1 reports ONCE. No tuning on these reports. Extractor-flagged rates are "
                "UNVALIDATED (no clinician labels) and are upper bounds on the true rate.",
        "extractor_v2_needs_clinician_labels": True,
        "n_reports": v1["n"],
        "v1_extractor": {k: v1[k] for k in ("rate", "polarity_counts")},
        "v2_extractor": {k: v2[k] for k in ("rate", "polarity_counts")},
        "per_report_disagreement": [
            {"index": a["index"], "k": a["k"], "v1": a["polarity"], "v2": b["polarity"]}
            for a, b in zip(v1["rows"], v2["rows"]) if a["polarity"] != b["polarity"]
        ],
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"{MARK}\nreports={v1['n']}")
    print(f"  v1 extractor: rate={v1['rate']:.4f} polarity={v1['polarity_counts']}")
    print(f"  v2 extractor: rate={v2['rate']:.4f} polarity={v2['polarity_counts']}")
    print(f"  disagreement: {len(out['per_report_disagreement'])} reports")
    print("wrote", OUT, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
