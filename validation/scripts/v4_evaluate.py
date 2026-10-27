"""v4 Step 6b: one-shot evaluation on the fresh disjoint val/test sets.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Implements docs/evidence/preregistration_v4.md:
  arms     : A (no gate), B2 (entropy), D2 (frozen classifier composite), N (NEG alone),
             D2N (D2 signals + NEG, weights fitted on the v4 validation set), + ablations
  primary  : D2N vs D2 at 20% review, O1 (unsafe accepted), shifted test, scan-cluster
             bootstrap; success = point >= 15% AND 95% CI excludes 0.
  generator: G0 (template + controlled injection); G1 (text LLM) reported separately.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression

from validation.study.compare import relative_reduction_ci
from validation.study.metrics import auroc, unsafe_accepted_per_1000
from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS
from validation.scripts import v4_lib as V

REPORTS = Path("validation/reports")
SIGC = ["C1", "C2", "C4"]
COND_ALL = ["clean"] + [f"{k}_{l}" for k, l in L.CORRUPTIONS]
COND_SHIFT = [f"{k}_{l}" for k, l in L.CORRUPTIONS]
MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
SUCCESS_THRESHOLD = 0.15


def build_instances(npz, split, conds):
    studies = [str(s) for s in npz["studies"]]
    y = npz["y"].astype(int)
    cols: dict = {k: [] for k in ("study", "cond", "y", "prob", "B1", "B2", "C1", "C2", "C4",
                                  "O1", "O2", "O3", "NEG", "URG", "injected", "polarity")}
    for cond in conds:
        p = npz[f"{cond}|prob"]
        for i, st in enumerate(studies):
            rec = V.gen_g0(p[i], split, cond, st)
            row = V.rows_for(p[i], y[i], rec["text"])
            cols["study"].append(st); cols["cond"].append(cond)
            cols["y"].append(y[i]); cols["prob"].append(p[i])
            for s in ("B1", "B2", "C1", "C2", "C4"):
                cols[s].append(float(npz[f"{cond}|{s}"][i]))
            for k in ("O1", "O2", "O3"):
                cols[k].append(row[k])
            cols["NEG"].append(row["NEG"]); cols["URG"].append(row["URG"])
            cols["polarity"].append(row["polarity"])
            cols["injected"].append(rec["injected"])
    return {k: np.array(v) for k, v in cols.items()}


def fit_D2_frozen():
    """Re-derive the frozen v2a1 D2 composite from the v2 validation cache (same as v3)."""
    model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")
    ood = VS.fit_ood(model, late, "train")
    feats, _ids, studies, labels = VS.load_cache("val")
    sig = VS.study_signals(studies, labels, VS.slice_signals(model, late, feats, T, ood))
    X = np.column_stack([sig[n] for n in SIGC])
    y = ((sig["prob"] >= 0.5).astype(int) != sig["y"]).astype(int)
    mu, sd = X.mean(0), X.std(0); sd[sd == 0] = 1.0
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit((X - mu) / sd, y)
    return {"model": H, "mu": mu, "sd": sd,
            "coef": [float(c) for c in H.coef_[0]], "intercept": float(H.intercept_[0])}


def risk_D2(inst, D2):
    X = np.column_stack([inst[n] for n in SIGC])
    ok = np.isfinite(X).all(1)
    r = np.full(len(inst["y"]), np.nan)
    r[ok] = D2["model"].decision_function((X[ok] - D2["mu"]) / D2["sd"])
    return r


def fit_lr(inst, feats, target="O1"):
    X = np.column_stack([inst[n] for n in feats])
    y = inst[target].astype(int)
    ok = np.isfinite(X).all(1)
    mu, sd = X[ok].mean(0), X[ok].std(0); sd[sd == 0] = 1.0
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit((X[ok] - mu) / sd, y[ok])

    def risk(inst2):
        X2 = np.column_stack([inst2[n] for n in feats])
        ok2 = np.isfinite(X2).all(1)
        r = np.full(len(inst2["y"]), np.nan)
        r[ok2] = H.decision_function((X2[ok2] - mu) / sd)
        return r
    return risk


def rate_block(err, risk_new, risk_base, clusters):
    out = {}
    for r in L.REVIEW_RATES:
        pt, ci = relative_reduction_ci(err, risk_new, risk_base, r, clusters=clusters)
        out[str(r)] = {"rel_reduction": float(pt), "ci95": [float(ci[0]), float(ci[1])]}
    return out


def paired_auroc(err, rA, rB, clusters, n_boot=2000, seed=42):
    err = np.asarray(err, bool); rA = np.asarray(rA, float); rB = np.asarray(rB, float)
    m = np.isfinite(rA) & np.isfinite(rB)
    pt = auroc(rA[m], err[m]) - auroc(rB[m], err[m])
    groups = np.unique(clusters); idx_by = {g: np.where(clusters == g)[0] for g in groups}
    rng = np.random.default_rng(seed); vals = []
    for _ in range(n_boot):
        pick = rng.integers(0, len(groups), len(groups))
        ix = np.concatenate([idx_by[groups[p]] for p in pick])
        mm = np.isfinite(rA[ix]) & np.isfinite(rB[ix])
        if mm.sum() < 4 or err[ix][mm].sum() in (0, mm.sum()):
            continue
        vals.append(auroc(rA[ix][mm], err[ix][mm]) - auroc(rB[ix][mm], err[ix][mm]))
    ci = [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))] if vals else [float("nan")] * 2
    return {"auroc_new": float(auroc(rA[m], err[m])), "auroc_base": float(auroc(rB[m], err[m])),
            "diff": float(pt), "ci95": ci, "n": int(m.sum())}


def arms_block(err, risks, clusters):
    block = {}
    for name, r in risks.items():
        block[name] = {
            "auroc_vs_error": float(auroc(r, err)),
            "unsafe_accepted_per_1000": {str(rr): float(unsafe_accepted_per_1000(r, err, rr))
                                         for rr in L.REVIEW_RATES},
            "vs_A_rates": rate_block(err, r, np.zeros(len(err)), clusters),
        }
    return block


def verdict(primary, power):
    p20 = primary["by_review_rate"]["0.2"]
    pt, lo = p20["rel_reduction"], p20["ci95"][0]
    if pt >= SUCCESS_THRESHOLD and lo > 0:
        return "SUCCESS"
    if lo > 0:
        return "NOT MET"
    if power and power.get("underpowered_at_20pct"):
        return "INCONCLUSIVE"
    return "INCONCLUSIVE"


def main() -> int:
    import torch
    torch.set_num_threads(2)
    REPORTS.mkdir(parents=True, exist_ok=True)

    val = np.load(REPORTS / "v4_signals_val.npz", allow_pickle=False)
    test = np.load(REPORTS / "v4_signals_test.npz", allow_pickle=False)

    vinst = build_instances(val, "val", COND_ALL)
    tshift = build_instances(test, "test", COND_SHIFT)
    tclean = build_instances(test, "test", ["clean"])

    print("fitting frozen D2 ...", flush=True)
    D2 = fit_D2_frozen()
    print("D2 std weights", [round(c, 3) for c in D2["coef"]], flush=True)

    d2n = fit_lr(vinst, SIGC + ["NEG"])
    abl = {
        "D2N_noNEG": fit_lr(vinst, SIGC),
        "D2N_noC1": fit_lr(vinst, ["C2", "C4", "NEG"]),
        "D2N_noC2": fit_lr(vinst, ["C1", "C4", "NEG"]),
        "D2N_noC4": fit_lr(vinst, ["C1", "C2", "NEG"]),
    }

    risks_shift = {"B2": tshift["B2"], "D2": risk_D2(tshift, D2), "N": tshift["NEG"],
                   "D2N": d2n(tshift)}
    risks_clean = {"B2": tclean["B2"], "D2": risk_D2(tclean, D2), "N": tclean["NEG"],
                   "D2N": d2n(tclean)}
    for name, fn in abl.items():
        risks_shift[name] = fn(tshift)
        risks_clean[name] = fn(tclean)

    err = tshift["O1"].astype(bool)
    clusters = tshift["study"]
    errc = tclean["O1"].astype(bool)
    cclusters = tclean["study"]

    primary = {
        "by_review_rate": rate_block(err, risks_shift["D2N"], risks_shift["D2"], clusters),
        "paired_auroc_diff_D2N_minus_D2": paired_auroc(err, risks_shift["D2N"], risks_shift["D2"], clusters),
        "n_scans": int(len(np.unique(clusters))), "n_instances": int(err.size),
        "base_unsafe_rate": float(err.mean()),
    }
    clean_block = {
        "by_review_rate": rate_block(errc, risks_clean["D2N"], risks_clean["D2"], cclusters),
        "paired_auroc_diff_D2N_minus_D2": paired_auroc(errc, risks_clean["D2N"], risks_clean["D2"], cclusters),
        "n_scans": int(len(np.unique(cclusters))), "n_instances": int(errc.size),
        "base_unsafe_rate": float(errc.mean()),
    }

    per_corr = {}
    for cond in COND_SHIFT:
        m = tshift["cond"] == cond
        if m.sum() == 0:
            continue
        pt, ci = relative_reduction_ci(err[m], risks_shift["D2N"][m], risks_shift["D2"][m], 0.2,
                                       clusters=clusters[m])
        per_corr[cond] = {"rel_reduction_20": float(pt), "ci95": [float(ci[0]), float(ci[1])],
                          "unsafe_D2": float(unsafe_accepted_per_1000(risks_shift["D2"][m], err[m], 0.2)),
                          "unsafe_D2N": float(unsafe_accepted_per_1000(risks_shift["D2N"][m], err[m], 0.2))}

    power = None
    ppath = REPORTS / "v4_power.json"
    if ppath.exists():
        power = json.loads(ppath.read_text(encoding="utf-8"))

    firing = {
        "O1_rate_shifted": float(tshift["O1"].mean()),
        "O2_rate_shifted": float(tshift["O2"].mean()),
        "O3_rate_shifted": float(tshift["O3"].mean()),
        "NEG_fire_rate_shifted": float((tshift["NEG"] > 0).mean()),
        "NEG_mean_shifted": float(tshift["NEG"].mean()),
        "URG_mismatch_rate_shifted": float(tshift["URG"].mean()),
        "injected_contradictions_G0": int(sum(1 for v in tshift["injected"] if v != "none")),
        "polarity_counts_shifted": {p: int((tshift["polarity"] == p).sum())
                                    for p in ("present", "absent", "uncertain", "historical", "resolved")},
    }

    v = verdict(primary, power)

    report = {
        "marking": MARK,
        "preregistration": "docs/evidence/preregistration_v4.md",
        "status": "v4 NEG signal study; generator G0 (template + controlled injection)",
        "generator": "G0 (synthetic injection, not model behaviour)",
        "data": {"val": "validation/scripts/step2_manifest_v4.json [val]",
                 "test": "validation/scripts/step2_manifest_v4.json (test)",
                 "shift_test_scans": int(len(np.unique(clusters))),
                 "shift_instances": int(err.size),
                 "disjoint_from": "v2 train/val/test and v3 set (leakage-tested)"},
        "composite_D2_standardised_weights": D2["coef"],
        "composite_D2_intercept": D2["intercept"],
        "primary_test_shifted_20pct_D2N_vs_D2": primary,
        "secondary_clean": clean_block,
        "secondary_per_corruption_D2N_vs_D2": per_corr,
        "firing_stats_shifted": firing,
        "power": power,
        "arms_shifted": arms_block(err, risks_shift, clusters),
        "secondary_clean_arms": arms_block(errc, risks_clean, cclusters),
        "success_criterion": "D2N vs D2 at 20% review: point >= 15% and 95% CI excludes 0 (O1)",
        "verdict": v,
    }
    (REPORTS / "v4_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"verdict": v, "primary_20pct": primary["by_review_rate"]["0.2"],
                      "paired_auroc": primary["paired_auroc_diff_D2N_minus_D2"]}, indent=2), flush=True)
    print("wrote", REPORTS / "v4_report.json", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
