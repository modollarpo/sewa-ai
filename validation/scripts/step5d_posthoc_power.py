"""POST-HOC, EXPLORATORY: design-based power analysis for the actual Test B design.

Matches the pre-registered primary comparison (D3 vs the better baseline B2 at the 20%
review rate) but estimates sampling variance by cluster-resampling SCANS (9 corruptions
per scan), not by the validation proxy used in pre-registration section 5b.

NOT pre-registered. Does not change the pre-registered primary comparison or verdict.
FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from validation.study.compare import relative_reduction

REPORTS = Path("validation/reports")
NPZ = REPORTS / "v2a1_testb_instances.npz"
RATE = 0.20
Z_A, Z_P = 1.959964, 0.841621
N_BOOT = 4000
SEED = 42


def main() -> int:
    z = np.load(NPZ, allow_pickle=True)
    err = z["err"].astype(bool)
    base = z["B2"].astype(float)
    new = z["D3"].astype(float)
    study = np.asarray(z["study"], dtype=object)
    m = np.isfinite(base) & np.isfinite(new)
    err, base, new, study = err[m], base[m], new[m], study[m]
    groups = list(dict.fromkeys(study.tolist()))
    idx_by = {g: np.where(study == g)[0] for g in groups}
    G = len(groups)
    obs = relative_reduction(err, new, base, RATE)

    rng = np.random.default_rng(SEED)
    T = np.empty(N_BOOT)
    for b in range(N_BOOT):
        pick = rng.integers(0, G, G)
        ix = np.concatenate([idx_by[groups[p]] for p in pick])
        T[b] = relative_reduction(err[ix], new[ix], base[ix], RATE)

    se = float(np.std(T, ddof=1))
    lo, hi = np.percentile(T, [2.5, 97.5])
    mde = (Z_A + Z_P) * se
    half = float((hi - lo) / 2.0)
    zt = T - T.mean()

    def power(delta):
        tshift = zt + delta
        ok = (tshift >= 0.20) & ((tshift - Z_A * se) > 0.0)
        return float(ok.mean())

    power_curve = {str(d): round(power(d), 4) for d in (0.0, 0.10, 0.15, 0.20, 0.25, 0.30)}

    out = {
        "marking": "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.",
        "status": "POST-HOC, EXPLORATORY (not pre-registered; does not change the frozen verdict)",
        "estimand": "relative reduction in wrongly-accepted studies, D3 vs B2, 20% review",
        "design": {"instances": int(len(err)), "scans": int(G), "corruptions_per_scan": int(len(err) / G),
                   "effective_scan_clusters": int(G), "n_boot": N_BOOT},
        "observed_rel_reduction": float(obs),
        "bootstrap_se": se,
        "bootstrap_ci95_percentile": [float(lo), float(hi)],
        "ci_half_width": half,
        "mde_80pct_power_design_based": float(mde),
        "power_by_true_effect": power_curve,
        "note": ("Cluster bootstrap resamples the 60 scans (each carrying its 9 corruptions). "
                 "MDE = (z_0.975+z_0.8)*SE. Power uses an additive-shift bootstrap with a normal-approx "
                 "CI; exploratory."),
    }
    (REPORTS / "v2a1_posthoc_power_design.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
