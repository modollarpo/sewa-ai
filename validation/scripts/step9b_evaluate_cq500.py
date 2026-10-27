"""Step 9b (Test C): Evaluate v2a1 model on CQ500 — external held-out test set.

Licence: CC BY-NC-SA 4.0 — non-commercial use confirmed by user (2026-10-14).
Share-alike: study outputs must carry the same licence.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Pre-registration: docs/evidence/preregistration_testC.md (to be written before running)

Inputs (local, downloaded from blob after step9a job completes):
  validation/data_cache/v2_early_cq500.npz  (~200 MB — pull with az storage blob download)
  validation/models/classifier_v2a1.pt

Metrics reported (no tuning on CQ500, model frozen from v2a1):
  Primary  : study-level AUROC (ICH detection)
  Secondary: error-detection AUROC (D2 composite vs B2 baseline)
             unsafe-accepted rate per 1,000 studies at review rates [5,10,20,30]%
             relative reduction vs B2 at 20% review (same criterion as v2 Test B)

Usage:
  python -m validation.scripts.step9b_evaluate_cq500
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

CACHE = Path("validation/data_cache")
REPORTS = Path("validation/reports")
MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
D2_FEATS = ["C1", "C2", "C4"]
PRIMARY_RATE = 0.20
SUCCESS_THRESHOLD = 0.15


def load_cq500_cache():
    z = np.load(CACHE / "v2_early_cq500.npz", allow_pickle=False)
    return (torch.from_numpy(z["feats"]),
            [str(s) for s in z["ids"]],
            [str(s) for s in z["studies"]],
            z["labels"].astype(int))


def fit_d2_on_val(model, late, T, ood) -> dict:
    """Fit D2 composite on v2 validation set (same as step8_evaluate_v3)."""
    vf, _ids, vst, vy = VS.load_cache("val")
    vsig = VS.study_signals(vst, vy, VS.slice_signals(model, late, vf, T, ood))
    verr = ((vsig["prob"] >= 0.5).astype(int) != vsig["y"]).astype(int)
    Xv = np.column_stack([vsig[n] for n in D2_FEATS])
    mu, sd = Xv.mean(axis=0), Xv.std(axis=0)
    sd[sd == 0] = 1.0
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit((Xv - mu) / sd, verr)
    return {"model": H, "scaler": lambda X: (X - mu) / sd,
            "coef": [float(c) for c in H.coef_[0]],
            "intercept": float(H.intercept_[0]),
            "mu": mu.tolist(), "sd": sd.tolist()}


def rates_block(err, rD2, rB2, clusters):
    result = {}
    for rr in L.REVIEW_RATES:
        pt, ci = relative_reduction_ci(err, rD2, rB2, rr, clusters=clusters)
        result[str(rr)] = {
            "rel_reduction": float(pt),
            "ci95": [float(ci[0]), float(ci[1])],
            "passes": float(pt) >= SUCCESS_THRESHOLD and float(ci[0]) > 0,
        }
    return result


def verdict(rates: dict) -> str:
    p20 = rates[str(PRIMARY_RATE)]
    if p20["passes"]:
        return "SUCCESS"
    if p20["ci95"][0] > 0:
        return "NOT MET"
    return "INCONCLUSIVE"


def main() -> int:
    REPORTS.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE / "v2_early_cq500.npz"
    if not cache_path.exists():
        print(f"ERROR: {cache_path} not found.")
        print("Run step9a AKS job first, then:")
        print("  az storage blob download --account-name sewavalidationdata "
              "--container-name processed --name v2_early_cq500.npz "
              f"--file {cache_path} --auth-mode login")
        return 1

    torch.set_num_threads(2)

    # Load model (frozen v2a1 weights — no retraining on CQ500)
    model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")
    ood = VS.fit_ood(model, late, "train")
    D2 = fit_d2_on_val(model, late, T, ood)
    print(f"D2 coef={[round(c,3) for c in D2['coef']]} intercept={D2['intercept']:.3f}",
          flush=True)

    # Load CQ500 features
    feats, _ids, studies, labels = load_cq500_cache()
    print(f"CQ500: {len(set(studies))} scans, {len(feats)} slices, "
          f"{int(labels.max()==1)} positive-label scans", flush=True)

    # Study-level signals
    sl = VS.slice_signals(model, late, feats, T, ood)
    sig = VS.study_signals(studies, labels.tolist(), sl)

    n_studies = len(sig["y"])
    n_pos = int(sig["y"].sum())
    print(f"Study-level: n={n_studies}, positive={n_pos}", flush=True)

    # Primary: study-level AUROC (ICH detection)
    primary_auroc = float(auroc(sig["prob"], sig["y"]))
    print(f"Study AUROC (ICH): {primary_auroc:.4f}", flush=True)

    # D2 composite score
    Xtest = np.column_stack([sig[n] for n in D2_FEATS])
    ok = np.isfinite(Xtest).all(axis=1)
    d2_scores = np.full(n_studies, np.nan)
    d2_scores[ok] = D2["model"].decision_function(D2["scaler"](Xtest[ok]))

    # Error-detection AUROC
    err = ((sig["prob"] >= 0.5).astype(int) != sig["y"]).astype(bool)
    error_auroc_d2 = float(auroc(d2_scores[ok], err[ok]))
    error_auroc_b2 = float(auroc(sig["B2"][ok], err[ok]))
    print(f"Error-AUROC D2={error_auroc_d2:.4f}  B2={error_auroc_b2:.4f}", flush=True)

    # Safety reduction rates
    clusters = np.array(sig["study"])
    rates = rates_block(err, d2_scores, sig["B2"], clusters)
    v = verdict(rates)
    print(f"Primary (20% review): rel_reduction={rates[str(PRIMARY_RATE)]['rel_reduction']:.3f} "
          f"CI={rates[str(PRIMARY_RATE)]['ci95']}  verdict={v}", flush=True)

    report = {
        "marking": MARK,
        "licence": "CC BY-NC-SA 4.0",
        "status": "Test C — external held-out evaluation on CQ500",
        "model": "v2a1 EfficientNet-B0 (frozen; not retrained on CQ500)",
        "temperature": T,
        "n_scans": n_studies,
        "n_positive": n_pos,
        "primary_study_auroc_ICH": primary_auroc,
        "error_auroc": {"D2": error_auroc_d2, "B2": error_auroc_b2},
        "composite_D2_coef": D2["coef"],
        "composite_D2_intercept": D2["intercept"],
        "rates_D2_vs_B2": rates,
        "success_criterion": (
            f"point estimate >= {SUCCESS_THRESHOLD*100:.0f}% AND 95% CI excludes 0 "
            f"at {PRIMARY_RATE*100:.0f}% review"
        ),
        "verdict": v,
    }
    out = REPORTS / "v2a1_testC_cq500.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report written: {out}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
