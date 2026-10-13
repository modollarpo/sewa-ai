"""v4 Step 5b: power / minimum detectable effect (MDE), run BEFORE the test evaluation.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Uses the v4 validation set only. Fits D2N on validation, then bootstraps (scan-cluster)
the relative reduction of D2N vs D2 in O1 at the 20% review rate to get a standard
error, and reports MDE = (z_{0.975} + z_{0.80}) * SE. If MDE > 0.15 the test is
underpowered and a null result is INCONCLUSIVE, not a gate failure.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from validation.study.compare import relative_reduction
from validation.scripts import v2_lib as L
from validation.scripts import v4_evaluate as E

REPORTS = Path("validation/reports")
Z_A = 1.959964
Z_POWER = 0.841621
N_BOOT = 2000


def main() -> int:
    import torch
    torch.set_num_threads(2)
    val = np.load(REPORTS / "v4_signals_val.npz", allow_pickle=False)
    vinst = E.build_instances(val, "val", E.COND_ALL)

    D2 = E.fit_D2_frozen()
    rD2 = E.risk_D2(vinst, D2)
    rD2N = E.fit_lr(vinst, E.SIGC + ["NEG"])(vinst)
    err = vinst["O1"].astype(bool)
    clusters = np.asarray(vinst["study"])

    groups = np.unique(clusters)
    idx_by = {g: np.where(clusters == g)[0] for g in groups}
    rng = np.random.default_rng(42)
    report = {"marking": "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.",
              "n_val_scans": int(len(groups)), "n_val_instances": int(len(err)),
              "base_O1_rate": float(err.mean()), "by_review_rate": {}}
    for rate in L.REVIEW_RATES:
        vals = []
        for _ in range(N_BOOT):
            pick = rng.integers(0, len(groups), len(groups))
            ix = np.concatenate([idx_by[groups[p]] for p in pick])
            v = relative_reduction(err[ix], rD2N[ix], rD2[ix], rate)
            if np.isfinite(v):
                vals.append(v)
        se = float(np.std(vals)) if vals else float("nan")
        mde = (Z_A + Z_POWER) * se
        report["by_review_rate"][str(rate)] = {
            "obs_rel_reduction_D2N_vs_D2": float(relative_reduction(err, rD2N, rD2, rate)),
            "boot_se": se, "mde_80pct_power": float(mde), "underpowered_vs_15pct": bool(mde > 0.15)}
    report["underpowered_at_20pct"] = report["by_review_rate"]["0.2"]["underpowered_vs_15pct"]
    report["note"] = ("MDE from scan-cluster bootstrap on the validation set; D2N is fitted "
                      "in-sample so MDE is optimistic (true MDE likely larger).")
    (REPORTS / "v4_power.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["by_review_rate"], indent=2), flush=True)
    print("underpowered_at_20pct =", report["underpowered_at_20pct"], flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
