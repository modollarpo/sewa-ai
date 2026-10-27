"""Step 4 (v2 amendment 1), section 5b: power / minimum detectable effect.

Runs BEFORE the formal Test A / Test B evaluation. Bootstrap on validation study-level
scores. If MDE > 20% relative, Test B is underpowered and a null result is INCONCLUSIVE.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression

from validation.study.compare import relative_reduction
from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS

REPORT = Path(os.environ.get("SEWA_REPORT_DIR", "validation/reports")) / "v2a1_power.json"
SIG = ["C1", "C2", "C3", "C4"]
N_BOOT = 2000
Z_A = 1.959964
Z_POWER = 0.841621


def fit_composite(sig, names=SIG):
    X = np.column_stack([sig[n] for n in names])
    y = ((sig["prob"] >= 0.5).astype(int) != sig["y"]).astype(int)
    ok = np.isfinite(X).all(axis=1)
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit(X[ok], y[ok])
    risk = np.full(len(y), np.nan)
    risk[ok] = H.predict_proba(X[ok])[:, 1]
    return risk, y, ok, names


def boot_rel_reduction(y, risk_new, risk_base, rate, n_boot=N_BOOT, seed=L.SEED):
    n = len(y)
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        v = relative_reduction(y[idx], risk_new[idx], risk_base[idx], rate)
        if np.isfinite(v):
            vals.append(v)
    vals = np.array(vals)
    return float(np.mean(vals)), float(np.std(vals, ddof=1)), vals


def main() -> int:
    import torch
    torch.set_num_threads(2)
    ckpt = Path("validation/models/classifier_v2a1.pt")
    model, early, late, T = VS.load_model(ckpt)
    ood = VS.fit_ood(model, late, "train")

    feats, ids, studies, labels = VS.load_cache("val")
    sl = VS.slice_signals(model, late, feats, T, ood)
    sl["C3"] = VS.compute_gradcam_risk(model, ids, L.load_tile160)
    sig = VS.study_signals(studies, labels, sl)

    risk, y, ok, names = fit_composite(sig)
    err = y.astype(bool)
    report = {"signals": names, "n_val_studies": int(len(y)), "n_complete": int(ok.sum()),
              "temperature": T, "review_rates": L.REVIEW_RATES, "by_review_rate": {}}
    for r in L.REVIEW_RATES:
        pt, se, _vals = boot_rel_reduction(err, risk, sig["B1"], r)
        mde = (Z_A + Z_POWER) * se
        report["by_review_rate"][str(r)] = {
            "obs_rel_reduction_vs_B1": pt, "boot_se": se,
            "mde_80pct_power": mde, "underpowered_vs_20pct": bool(mde > 0.20)}
    report["marking"] = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
    report["note"] = ("MDE from paired cluster bootstrap on validation; composite is fitted "
                      "in-sample so MDE is optimistic (true MDE likely larger). If the 20% "
                      "review MDE > 0.20 a null Test-B result is reported as INCONCLUSIVE.")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["by_review_rate"], indent=2), flush=True)
    print("wrote", REPORT, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
