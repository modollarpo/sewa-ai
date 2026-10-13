"""Step 7 (post-hoc, exploratory): D2 vs B2, standardised weights, and C3 investigation.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

POST-HOC, EXPLORATORY. Not pre-registered; does not change the frozen verdict.

Produces:
  validation/reports/v2a1_posthoc_d2.json       D2 vs B2 (Test B all 120) + paired AUROC diffs
  validation/reports/v2a1_posthoc_c3.json       C3 proxy characterisation (val + Test A)
  validation/reports/v2a1_posthoc_weights_std.json  z-scored composite weights
  validation/reports/v2a1_val_testA_slices_c3.npz    cached per-slice C3 (reuse)
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
COMPS = {"D1": ["C1", "C4"], "D2": ["C1", "C2", "C4"], "D3": ["C1", "C2", "C3", "C4"]}
MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."


# ---------------------------------------------------------------- grad-cam per slice
@torch.no_grad()
def _slice_core(model, late, feats, T, ood):
    return VS.slice_signals(model, late, feats, T, ood)


def gradcam_slices(model, ids, x_provider):
    """Return (c3_risk, c3_inside, predcls) per slice via L.gradcam_inside_fraction."""
    risk = np.full(len(ids), np.nan)
    inside = np.full(len(ids), np.nan)
    predcls = np.full(len(ids), -1, dtype=int)
    for j, iid in enumerate(ids):
        x = L.load_tile160(iid).unsqueeze(0) if x_provider is None else x_provider(iid).unsqueeze(0)
        model.eval()
        x = x.detach()
        feats = model.features(x)
        feats.retain_grad()
        penult = torch.flatten(model.avgpool(feats), 1)
        logits = model.classifier(penult)
        predcls[j] = int(logits.argmax(1).item())
        frac, _total = L.gradcam_inside_fraction(model, x)
        inside[j] = frac
        risk[j] = 1.0 - frac if np.isfinite(frac) else np.nan
    return risk, inside, predcls


# ---------------------------------------------------------------- paired AUROC diff
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
    vals = np.array(vals)
    ci = [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))] if len(vals) else [np.nan, np.nan]
    return {"auroc_diff": float(pt), "ci95": ci,
            "auroc_new": float(auroc(rA[m], err[m])), "auroc_base": float(auroc(rB[m], err[m])),
            "n": int(m.sum()), "n_boot_used": int(len(vals))}


def fit_comp(vsig, names, standardise=False):
    err = ((vsig["prob"] >= 0.5).astype(int) != vsig["y"]).astype(int)
    X = np.column_stack([vsig[n] for n in names])
    ok = np.isfinite(X).all(axis=1)
    mu = X[ok].mean(axis=0)
    sd = X[ok].std(axis=0)
    sd[sd == 0] = 1.0
    Xs = (X - mu) / sd
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit(Xs[ok], err[ok])
    return {"features": names, "coef_standardised": [float(c) for c in H.coef_[0]],
            "intercept": float(H.intercept_[0]), "mu": mu.tolist(), "sd": sd.tolist(),
            "coef_raw": [float(c / s) for c, s in zip(H.coef_[0], sd)],
            "err_n_val": int(err[ok].sum()), "n_val": int(ok.sum())}


def main() -> int:
    REPORTS.mkdir(parents=True, exist_ok=True)
    model, early, late, T = VS.load_model("validation/models/classifier_v2a1.pt")
    ood = VS.fit_ood(model, late, "train")

    # ---------------- validation ----------------
    vf, vids, vst, vy = VS.load_cache("val")
    vsl = _slice_core(model, late, vf, T, ood)
    vrisk, vinside, vpred = gradcam_slices(model, vids, lambda s: L.load_tile160(s))
    vsl["C3"] = vrisk
    vsig = VS.study_signals(vst, vy, vsl)
    vsig["C3_inside"] = L.aggregate_topk(vst, vsl["prob"], vinside)[1]
    vsig["C3_predpos"] = L.aggregate_topk(vst, vsl["prob"], (vpred == 1).astype(float))[1]
    print("val done", flush=True)

    # ---------------- Test A ----------------
    tf, tids, tst, ty = VS.load_cache("test")
    tsl = _slice_core(model, late, tf, T, ood)
    trisk, tinside, tpred = gradcam_slices(model, tids, lambda s: L.load_tile160(s))
    tsl["C3"] = trisk
    tsig = VS.study_signals(tst, ty, tsl)
    tsig["C3_inside"] = L.aggregate_topk(tst, tsl["prob"], tinside)[1]
    tsig["C3_predpos"] = L.aggregate_topk(tst, tsl["prob"], (tpred == 1).astype(float))[1]
    print("Test A done", flush=True)

    np.savez(REPORTS / "v2a1_val_testA_slices_c3.npz",
             val_ids=np.array(vids, dtype=object), val_c3=vrisk, val_inside=vinside,
             val_pred=vpred, test_ids=np.array(tids, dtype=object), test_c3=trisk,
             test_inside=tinside, test_pred=tpred)

    # ---------------- standardised composite weights ----------------
    weights_std = {name: fit_comp(vsig, [n for n in names], standardise=True)
                   for name, names in COMPS.items()}
    weights_std["note"] = ("z-scored on validation; coef_standardised comparable across features. "
                           "POST-HOC, EXPLORATORY.")
    weights_std["marking"] = MARK
    (REPORTS / "v2a1_posthoc_weights_std.json").write_text(
        json.dumps(weights_std, indent=2), encoding="utf-8")

    # ---------------- Test A: D2 vs B2 ----------------
    d2A = fit_comp(vsig, COMPS["D2"])
    XA = np.column_stack([tsig[n] for n in COMPS["D2"]])
    d2A_risk = LogisticRegression(max_iter=2000, class_weight="balanced")
    d2A_risk.fit((np.column_stack([vsig[n] for n in COMPS["D2"]]) - d2A["mu"]) / d2A["sd"],
                 ((vsig["prob"] >= 0.5).astype(int) != vsig["y"]).astype(int))
    tsig["D2"] = d2A_risk.decision_function((XA - d2A["mu"]) / d2A["sd"])
    tA_err = ((tsig["prob"] >= 0.5).astype(int) != tsig["y"]).astype(bool)
    testA_auroc_diff = paired_auroc_diff(tA_err, tsig["D2"], tsig["B2"], tsig["study"])

    # ---------------- Test B: D2 vs B2 (all 120 scans) ----------------
    z = np.load(REPORTS / "v2a1_testb_instances.npz", allow_pickle=True)
    b_err = z["err"].astype(bool)
    b_study = z["study"]
    b_D2, b_B2 = z["D2"].astype(float), z["B2"].astype(float)
    rates = {}
    for rr in L.REVIEW_RATES:
        pt, ci = relative_reduction_ci(b_err, b_D2, b_B2, rr, clusters=b_study)
        rates[str(rr)] = {"rel_reduction": float(pt), "ci95": [float(ci[0]), float(ci[1])]}
    testB_auroc_diff = paired_auroc_diff(b_err, b_D2, b_B2, b_study)
    n_scans_B = int(len(np.unique(b_study)))

    d2 = {
        "marking": MARK,
        "status": "POST-HOC, EXPLORATORY (not pre-registered; does not change the frozen verdict)",
        "comparison": "D2 (C1+C2+C4) vs B2 (predictive entropy)",
        "testB_all_scans": {"n_instances": int(len(b_err)), "n_scans": n_scans_B,
                            "by_review_rate": rates},
        "testB_paired_auroc_diff_D2_minus_B2": testB_auroc_diff,
        "testA_paired_auroc_diff_D2_minus_B2": testA_auroc_diff,
        "note": "Test A/Bootstrap clusters = StudyInstanceUID. D2 uses no C3.",
    }
    (REPORTS / "v2a1_posthoc_d2.json").write_text(json.dumps(d2, indent=2), encoding="utf-8")

    # ---------------- C3 characterisation ----------------
    def c3_block(sig, err):
        return {
            "error_auroc_C3": float(auroc(sig["C3"], err)),
            "by_class": {
                "where_model_predicts_negative": {
                    "n": int((sig["prob"] < 0.5).sum()),
                    "mean_C3_risk": float(np.nanmean(sig["C3"][sig["prob"] < 0.5])),
                    "mean_C3_inside": float(np.nanmean(sig["C3_inside"][sig["prob"] < 0.5]))},
                "where_model_predicts_positive": {
                    "n": int((sig["prob"] >= 0.5).sum()),
                    "mean_C3_risk": float(np.nanmean(sig["C3"][sig["prob"] >= 0.5])),
                    "mean_C3_inside": float(np.nanmean(sig["C3_inside"][sig["prob"] >= 0.5]))},
            },
            "by_truth_x_prediction": {
                "TN": c3_bucket(sig, (sig["y"] == 0) & (sig["prob"] < 0.5)),
                "FP": c3_bucket(sig, (sig["y"] == 0) & (sig["prob"] >= 0.5)),
                "FN": c3_bucket(sig, (sig["y"] == 1) & (sig["prob"] < 0.5)),
                "TP": c3_bucket(sig, (sig["y"] == 1) & (sig["prob"] >= 0.5)),
            },
        }

    def c3_bucket(sig, mask):
        if mask.sum() == 0:
            return {"n": 0}
        return {"n": int(mask.sum()),
                "mean_C3_risk": float(np.nanmean(sig["C3"][mask])),
                "mean_C3_inside": float(np.nanmean(sig["C3_inside"][mask])),
                "mean_GradCAM_targets_class1": float(np.nanmean(sig["C3_predpos"][mask]))}

    v_err = ((vsig["prob"] >= 0.5).astype(int) != vsig["y"]).astype(bool)
    c3 = {
        "marking": MARK,
        "status": "POST-HOC, EXPLORATORY",
        "definition": {
            "C3_risk": "1 - inside_fraction; HIGHER = more Grad-CAM mass outside the brain mask",
            "inside_fraction": "sum(cam*mask)/sum(cam); mask = brain-window channel 0 > 0.05 on the 160px tile",
            "gradcam_target": "argmax(logits) = the PREDICTED class (class 1=hemorrhage when predicted positive, else class 0)",
            "backbone": "model.features (full backbone) -> avgpool -> classifier",
        },
        "val": c3_block(vsig, v_err),
        "testA": c3_block(tsig, tA_err),
        "note": ("C3 targets the predicted class, so its target differs between predicted-positive and "
                 "predicted-negative scans. Its negative fitted weight in D3 is NOT evidence of value."),
    }
    (REPORTS / "v2a1_posthoc_c3.json").write_text(json.dumps(c3, indent=2), encoding="utf-8")

    print("wrote d2/c3/weights_std", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
