"""POST-HOC, EXPLORATORY: Test B D1/D2 across all 120 scans, fitted composite weights,
and per-instance risks for a design-based (scan-clustered) power analysis.

NOT pre-registered. Does not change the pre-registered primary comparison or verdict.
FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression

from validation.study.metrics import auroc, risk_coverage, unsafe_accepted_per_1000
from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS
from validation.scripts.step5_evaluate_v2a1 import COMPS, select_gradcam_studies

REPORTS = Path("validation/reports")
CKPT = Path("validation/models/classifier_v2a1.pt")
MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
SIGNALS = ["B1", "B2", "C1", "C2", "C4"]


def fit_models(sig):
    err = ((sig["prob"] >= 0.5).astype(int) != sig["y"]).astype(int)
    models, weights = {}, {}
    for name, names in COMPS.items():
        X = np.column_stack([sig[n] for n in names])
        ok = np.isfinite(X).all(axis=1)
        H = LogisticRegression(max_iter=2000, class_weight="balanced").fit(X[ok], err[ok])
        models[name] = (H, names)
        weights[name] = {
            "features": names,
            "coef": [float(c) for c in H.coef_[0]],
            "intercept": float(H.intercept_[0]),
            "c3_weight": (float(H.coef_[0][names.index("C3")]) if "C3" in names else None),
            "c3_weight_negative": (bool(H.coef_[0][names.index("C3")] < 0) if "C3" in names else None),
        }
    return models, weights


def comp_risk(pair, sig):
    H, names = pair
    X = np.column_stack([sig[n] for n in names])
    ok = np.isfinite(X).all(axis=1)
    r = np.full(len(sig["y"]), np.nan)
    r[ok] = H.predict_proba(X[ok])[:, 1]
    return r


def metrics(risk, err):
    m = np.isfinite(risk)
    if m.sum() < 5 or err[m].sum() == 0 or (~err[m]).sum() == 0:
        return {"n": int(m.sum()), "error_auroc": None}
    _c, _rc, aurc = risk_coverage(risk[m], err[m])
    return {"n": int(m.sum()), "error_auroc": float(auroc(risk[m], err[m])), "aurc": float(aurc),
            "base_error_rate": float(err[m].mean()),
            "unsafe_per_1000": {str(r): float(unsafe_accepted_per_1000(risk[m], err[m], r))
                                for r in L.REVIEW_RATES}}


def main() -> int:
    torch.set_num_threads(2)
    model, early, late, T = VS.load_model(CKPT)
    ood = VS.fit_ood(model, late, "train")

    # ---- validation: fit composites -> weights/signs ----
    vf, vids, vstud, vy = VS.load_cache("val")
    vsl = VS.slice_signals(model, late, vf, T, ood)
    vsl["C3"] = VS.compute_gradcam_risk(model, vids, L.load_tile160)
    vsig = VS.study_signals(vstud, vy, vsl)
    models, weights = fit_models(vsig)

    # ---- Test B ----
    tf, tids, tstud, ty = VS.load_cache("test")
    gc = select_gradcam_studies(tstud, ty, frac=0.5)
    subset_idx = [j for j in range(len(tids)) if tstud[j] in gc]

    acc = {k: [] for k in ["y", "prob", "study"] + SIGNALS + ["C3", "D1", "D2", "D3"]}
    for kind, level in L.CORRUPTIONS:
        feats = []
        for i in range(0, len(tids), 32):
            xs = torch.stack([L.corrupt(L.load_tile160(tids[j]), kind, level)
                              for j in range(i, min(i + 32, len(tids)))])
            with torch.no_grad():
                feats.append(L.early_features(early, xs))
        sl = VS.slice_signals(model, late, torch.cat(feats), T, ood)
        ssig = VS.study_signals(tstud, ty, sl)
        c3_arr = VS.compute_gradcam_risk(
            model, [tids[j] for j in subset_idx],
            lambda sid, kk=kind, ll=level: L.corrupt(L.load_tile160(sid), kk, ll))
        c3_full = np.full(len(tids), np.nan)
        for n, j in enumerate(subset_idx):
            c3_full[j] = c3_arr[n]
        sl["C3"] = c3_full
        ssig3 = VS.study_signals(tstud, ty, sl)
        acc["y"].append(ssig["y"])
        acc["prob"].append(ssig["prob"])
        acc["study"].append(np.asarray(ssig["study"]))
        for k in SIGNALS:
            acc[k].append(ssig[k])
        acc["C3"].append(ssig3["C3"])
        acc["D1"].append(comp_risk(models["D1"], ssig))
        acc["D2"].append(comp_risk(models["D2"], ssig))
        acc["D3"].append(comp_risk(models["D3"], ssig3))
        print(f"Test B {kind}_{level}: done", flush=True)

    pooled = {k: np.concatenate(v) for k, v in acc.items()}
    err = ((acc["prob"][0] >= 0.5).astype(int) != np.concatenate(acc["y"])) if False else None
    y = acc["y"][0].astype(int)  # same 120 each corruption
    err_full = ((np.concatenate(acc["prob"]) >= 0.5).astype(int) != np.concatenate(acc["y"]).astype(int)).astype(bool)
    m_sub = np.isfinite(pooled["D3"])
    all_rows = {k: metrics(pooled[k], err_full) for k in SIGNALS + ["D1", "D2"]}
    sub_rows = {k: metrics(pooled[k], err_full) for k in SIGNALS + ["C3", "D1", "D2", "D3"]}

    np.savez(REPORTS / "v2a1_testb_instances.npz",
             y=np.concatenate(acc["y"]), err=err_full, study=np.asarray(pooled["study"], dtype=object),
             **{k: pooled[k] for k in SIGNALS + ["C3", "D1", "D2", "D3"]})
    sl_lab = L.study_labels(tstud, ty)
    n_pos = int(sum(sl_lab[s] for s in gc))
    out = {
        "marking": MARK,
        "status": "POST-HOC, EXPLORATORY (not pre-registered)",
        "subset_rule": ("select_gradcam_studies: sort StudyInstanceUID, group by ground-truth study "
                        "label, deterministic stride sample frac=0.5 per class; depends only on "
                        "StudyInstanceUID order + labels, never on model outputs/errors."),
        "subset": {"scans": len(gc), "positive": n_pos, "negative": int(len(gc) - n_pos)},
        "design": {"test_b_instances": int(len(err_full)), "scans": 120,
                   "corruptions_per_scan": 9, "d3_subset_scans": int(len(np.unique(pooled["study"][m_sub])))},
        "weights": weights,
        "testB_all_120_scans": all_rows,
        "testB_d3_subset_60_scans": sub_rows,
    }
    (REPORTS / "v2a1_posthoc_dweights.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"weights": weights, "subset": out["subset"]}, indent=2), flush=True)
    print("wrote", REPORTS / "v2a1_posthoc_dweights.json", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
