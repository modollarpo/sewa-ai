"""Step 8 (v3): one-shot evaluation of D2 vs B2 on the fresh, shifted scan set.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Implements docs/evidence/preregistration_v3.md:
  primary   : D2 (C1+C2+C4) vs B2 at 20% review, scan-cluster bootstrap CI,
              success = point estimate >= 15% AND CI excludes 0.
  secondary : 5/10/30% rates, paired error-AUROC diff, clean set (exploratory).
No tuning on the v3 set. Composite fitted only on the v2 validation set.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression

from validation.study.compare import relative_reduction_ci
from validation.study.metrics import auroc
from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS

REPORTS = Path("validation/reports")
SLICES = Path("validation/scripts/step1b_slices_v3.json")
OUT = REPORTS / "v3_report.json"
D2_FEATS = ["C1", "C2", "C4"]
MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
SUCCESS_THRESHOLD = 0.15
PRIMARY_RATE = 0.20


def slice_signals_from_tiles(model, early, late, entries, T, ood, kind=None, level=0):
    feats = []
    for i in range(0, len(entries), 32):
        xs = []
        for j in range(i, min(i + 32, len(entries))):
            x = L.load_tile160(entries[j]["image_id"])
            if kind is not None:
                x = L.corrupt(x, kind, level)
            xs.append(x)
        with torch.no_grad():
            feats.append(L.early_features(early, torch.stack(xs)))
    return VS.slice_signals(model, late, torch.cat(feats), T, ood)


def evaluate(model, early, late, entries, D2, T, ood, kind=None, level=0):
    sl = slice_signals_from_tiles(model, early, late, entries, T, ood, kind, level)
    sig = VS.study_signals([e["study"] for e in entries], [e["label"] for e in entries], sl)
    X = np.column_stack([sig[n] for n in D2_FEATS])
    ok = np.isfinite(X).all(axis=1)
    sig["D2"] = np.full(len(sig["y"]), np.nan)
    sig["D2"][ok] = D2["model"].decision_function(D2["scaler"](X[ok]))
    err = ((sig["prob"] >= 0.5).astype(int) != sig["y"]).astype(bool)
    return sig, err


def paired_auroc_diff(err, rA, rB, clusters, n_boot=2000, seed=42):
    err = np.asarray(err, bool)
    rA, rB = np.asarray(rA, float), np.asarray(rB, float)
    clusters = np.asarray(clusters)
    m = np.isfinite(rA) & np.isfinite(rB)
    pt = auroc(rA[m], err[m]) - auroc(rB[m], err[m])
    groups = np.unique(clusters)
    idx_by = {g: np.where(clusters == g)[0] for g in groups}
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n_boot):
        pick = rng.integers(0, len(groups), len(groups))
        ix = np.concatenate([idx_by[groups[p]] for p in pick])
        mm = np.isfinite(rA[ix]) & np.isfinite(rB[ix])
        if mm.sum() < 4 or err[ix][mm].sum() in (0, mm.sum()):
            continue
        vals.append(auroc(rA[ix][mm], err[ix][mm]) - auroc(rB[ix][mm], err[ix][mm]))
    ci = [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))] if vals else [np.nan, np.nan]
    return {"auroc_diff": float(pt), "ci95": ci,
            "auroc_D2": float(auroc(rA[m], err[m])), "auroc_B2": float(auroc(rB[m], err[m])),
            "n": int(m.sum())}


def rates_block(err, rD2, rB2, clusters):
    return {str(rr): dict(zip(("rel_reduction", "ci95"),
                              (lambda pt, ci: (float(pt), [float(ci[0]), float(ci[1])]))(
                                  *relative_reduction_ci(err, rD2, rB2, rr, clusters=clusters))))
            for rr in L.REVIEW_RATES}


def verdict(primary):
    p20 = primary["by_review_rate"]["0.2"]
    pt, lo = p20["rel_reduction"], p20["ci95"][0]
    if pt >= 0.15 and lo > 0:
        return "SUCCESS"
    if lo > 0:
        return "NOT MET"
    return "INCONCLUSIVE"


def main() -> int:
    torch.set_num_threads(2)
    REPORTS.mkdir(parents=True, exist_ok=True)
    model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")
    ood = VS.fit_ood(model, late, "train")

    vf, vids, vst, vy = VS.load_cache("val")
    vsig = VS.study_signals(vst, vy, VS.slice_signals(model, late, vf, T, ood))
    verr = ((vsig["prob"] >= 0.5).astype(int) != vsig["y"]).astype(int)
    Xv = np.column_stack([vsig[n] for n in D2_FEATS])
    mu, sd = Xv.mean(axis=0), Xv.std(axis=0)
    sd[sd == 0] = 1.0
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit((Xv - mu) / sd, verr)
    D2 = {"model": H, "scaler": lambda X: (X - mu) / sd,
          "coef_standardised": [float(c) for c in H.coef_[0]],
          "intercept": float(H.intercept_[0]), "mu": mu.tolist(), "sd": sd.tolist(),
          "n_val": int(len(verr)), "n_val_err": int(verr.sum())}
    print("D2 on v2 val: std", [round(c, 3) for c in D2["coef_standardised"]],
          "int", round(D2["intercept"], 3), flush=True)

    entries = json.loads(SLICES.read_text(encoding="utf-8"))["splits"]["test"]
    n_scans = len({e["study"] for e in entries})
    print(f"v3 fresh scans={n_scans} slices={len(entries)}", flush=True)

    clean, clean_err = evaluate(model, early, late, entries, D2, T, ood)
    print("clean done", flush=True)

    pool = {k: [] for k in ("study", "prob", "y", "B2", "D2")}
    per_corr = {}
    for kind, level in L.CORRUPTIONS:
        sig, err = evaluate(model, early, late, entries, D2, T, ood, kind, level)
        for k in ("study", "prob", "y", "B2", "D2"):
            pool[k].append(sig[k])
        r = rates_block(err, sig["D2"], sig["B2"], sig["study"])["0.2"]
        per_corr[f"{kind}_{level}"] = {"rel_reduction_20": r["rel_reduction"], "ci95": r["ci95"]}
        print(f"shift {kind}_{level} done", flush=True)

    ps = {k: np.concatenate(v) for k, v in pool.items()}
    perr = ((ps["prob"] >= 0.5).astype(int) != ps["y"]).astype(bool)

    primary = {"by_review_rate": rates_block(perr, ps["D2"], ps["B2"], ps["study"]),
               "paired_auroc_diff_D2_minus_B2": paired_auroc_diff(perr, ps["D2"], ps["B2"], ps["study"]),
               "n_scans": int(len(np.unique(ps["study"]))), "n_instances": int(len(perr)),
               "base_error_rate": float(perr.mean())}
    clean_block = {"by_review_rate": rates_block(clean_err, clean["D2"], clean["B2"], clean["study"]),
                   "paired_auroc_diff_D2_minus_B2": paired_auroc_diff(
                       clean_err, clean["D2"], clean["B2"], clean["study"]),
                   "n_scans": int(len(clean["y"])),
                   "base_error_rate": float(clean_err.mean())}
    v = verdict(primary)

    report = {
        "marking": MARK,
        "preregistration": "docs/evidence/preregistration_v3.md",
        "status": "ONE-SHOT confirmatory feasibility test (fresh disjoint scans + shift)",
        "data": {"manifest": "validation/scripts/step2_manifest_v3.json",
                 "fresh_scans": int(len(np.unique(ps["study"]))),
                 "disjoint_from": "v2 train/val/test and tile/feature cache"},
        "model": "v2a1 EfficientNet-B0 (reused; not retrained)", "temperature": T,
        "composite_D2_standardised_weights": D2["coef_standardised"],
        "composite_D2_intercept": D2["intercept"],
        "primary_test20_D2_vs_B2": primary,
        "secondary_clean": clean_block,
        "secondary_per_corruption": per_corr,
        "success_criterion": "point estimate >= 15% and 95% CI excludes 0 at 20% review",
        "verdict": v,
    }
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"verdict": v,
                      "primary_20pct": primary["by_review_rate"]["0.2"],
                      "paired_auroc": primary["paired_auroc_diff_D2_minus_B2"]}, indent=2), flush=True)
    print("wrote", OUT, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
