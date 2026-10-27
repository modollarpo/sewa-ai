"""v4 Step 7 helper: failure analysis for the report (shifted test, G0).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Samples 20 (scan, condition) instances deterministically, lists the report polarity, NEG
and O1 outcome, and breaks O1 down by cause: synthetic generator injection, classifier
error (faithful report mirrors a wrong decision), or extractor/rule error.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np

from validation.scripts import v4_evaluate as E

REPORTS = Path("validation/reports")
SAMPLE_N = 20
SEED = 12345


def cause(row, injected, faithful_present):
    if injected != "none":
        return "generator_injection"
    if row["O3"] == 1:
        return "classifier_error"
    return "extractor_or_rule"


def main() -> int:
    import torch
    torch.set_num_threads(2)
    test = np.load(REPORTS / "v4_signals_test.npz", allow_pickle=False)
    inst = E.build_instances(test, "test", E.COND_SHIFT)

    n = len(inst["y"])
    causes = {"generator_injection": 0, "classifier_error": 0, "extractor_or_rule": 0}
    o1_total = 0
    for i in range(n):
        if inst["O1"][i] == 1:
            o1_total += 1
            fp = bool(inst["prob"][i] >= 0.5)
            causes[cause({k: int(inst[k][i]) for k in ("O3",)}, inst["injected"][i], fp)] += 1

    rng = random.Random(SEED)
    idx = sorted(rng.sample(range(n), SAMPLE_N))
    sample = []
    for i in idx:
        from validation.scripts import v4_lib as V
        rec = V.gen_g0(inst["prob"][i], "test", inst["cond"][i], inst["study"][i])
        sample.append({
            "study": inst["study"][i], "condition": inst["cond"][i],
            "prob": float(inst["prob"][i]), "gt": int(inst["y"][i]),
            "report": rec["text"], "injected": rec["injected"],
            "polarity": inst["polarity"][i], "NEG": float(inst["NEG"][i]),
            "O1": int(inst["O1"][i]), "O2": int(inst["O2"][i]), "O3": int(inst["O3"][i]),
        })

    out = {"marking": "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.",
           "n_instances": n, "O1_total": o1_total, "O1_by_cause": causes,
           "sample_20": sample}
    (REPORTS / "v4_failure_analysis.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"O1_total": o1_total, "O1_by_cause": causes}, indent=2), flush=True)
    print("wrote", REPORTS / "v4_failure_analysis.json", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
