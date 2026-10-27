"""Step 5 (v2 amendment 1): formal Test A / Test B evaluation of all gating arms.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Test A  = clean held-out scans (cached early features).
Test B  = same scans with 9 test-time corruptions (early features recomputed on the fly).
Primary = D3 (C1+C2+C3+C4) vs the better of B1/B2 at the 20% review rate on Test B,
          success = >=20% relative reduction with 95% clustered-bootstrap CI excluding 0
          and Holm correction across review rates {5,10,20,30%}.
C3 (Grad-CAM) is a PARTIAL proxy computed on a fixed subset of test scans (Test B) and on
all validation/Test-A scans.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression

from validation.study.compare import relative_reduction, relative_reduction_ci
from validation.study.metrics import auroc, brier, ece, risk_coverage, unsafe_accepted_per_1000
from validation.scripts import v2_lib as L
from validation.scripts import v2_study as VS

REPORTS = Path(os.environ.get("SEWA_REPORT_DIR", "validation/reports"))
ARMS = ["B1", "B2", "C1", "C2", "C3", "C4"]
COMPS = {"D1": ["C1", "C4"], "D2": ["C1", "C2", "C4"], "D3": ["C1", "C2", "C3", "C4"]}


def select_gradcam_studies(studies, labels, frac=0.5):
    """Deterministic, label-balanced subset of studies for the partial C3 signal."""
    lab = L.study_labels(studies, labels)
    by = {0: [], 1: []}
    for s in sorted(lab):
        by[lab[s]].append(s)
    out = set()
    for c in (0, 1):
        ss = by[c]
        k = max(1, int(round(len(ss) * frac)))
        out.update(ss[:: max(1, len(ss) // k)][:k])
    return out


def fit_arms(val_sig, use_c3):
    """Fit composites on validation study-level; return dict name -> (risk_fn, signals)."""
    err = ((val_sig["prob"] >= 0.5).astype(int) != val_sig["y"]).astype(int)
    models = {}
    for name, names in COMPS.items():
        nn = [n for n in names if n != "C3" or use_c3]
        X = np.column_stack([val_sig[n] for n in nn])
        ok = np.isfinite(X).all(axis=1)
        H = LogisticRegression(max_iter=2000, class_weight="balanced").fit(X[ok], err[ok])
        models[name] = (H, nn)
    return models


def apply_comp(risk_models, sig):
    out = {}
    for name, (H, nn) in risk_models.items():
        X = np.column_stack([sig[n] for n in nn])
        ok = np.isfinite(X).all(axis=1)
        r = np.full(len(sig["y"]), np.nan)
        if ok.any():
            r[ok] = H.predict_proba(X[ok])[:, 1]
        out[name] = r
    return out


def arm_table(sig, risks, y):
    err = (((sig["prob"] >= 0.5).astype(int) != y).astype(bool))
    tab = {}
    for k, r in risks.items():
        m = np.isfinite(r)
        if m.sum() < 5 or err[m].sum() == 0 or (~err[m]).sum() == 0:
            tab[k] = {"error_auroc": None, "n": int(m.sum())}
            continue
        _c, _rc, aurc = risk_coverage(r[m], err[m])
        tab[k] = {"error_auroc": float(auroc(r[m], err[m])), "aurc": float(aurc),
                  "n": int(m.sum()), "by_review_rate": {
                      str(rr): float(unsafe_accepted_per_1000(r[m], err[m], rr))
                      for rr in L.REVIEW_RATES}}
    tab["A_no_gate"] = {"unsafe_accepted_per_1000": float(err.mean() * 1000),
                        "n": int(len(err))}
    tab["calibration"] = {"brier": float(brier(sig["prob"], y)),
                          "ece": float(ece(sig["prob"], y))}
    return tab


def holm(pvals):
    items = sorted(pvals.items(), key=lambda kv: kv[1])
    m = len(items)
    out, prev = {}, 0.0
    for i, (k, p) in enumerate(items):
        adj = min(1.0, max(prev, p * (m - i)))
        out[k] = adj
        prev = adj
    return out


def primary(risks, sig, y, base_candidates=("B1", "B2")):
    """D3 vs the better baseline. Restricted to rows where D3 is defined (C3 subset)."""
    err = ((sig["prob"] >= 0.5).astype(int) != y).astype(bool)
    clusters = np.asarray(sig["study"])
    mask = np.isfinite(risks["D3"])
    for b in base_candidates:
        mask &= np.isfinite(risks[b])
    err, clusters = err[mask], clusters[mask]
    rD3 = risks["D3"][mask]
    rbase = {b: risks[b][mask] for b in base_candidates}
    r20 = L.REVIEW_RATES[2]
    reds = {b: relative_reduction_ci(err, rD3, rbase[b], r20, clusters=clusters)[0]
            for b in base_candidates}
    better = max(reds, key=lambda b: (reds[b] if np.isfinite(reds[b]) else -9))
    rb = rbase[better]
    groups = np.unique(clusters)
    idx_by = {g: np.where(clusters == g)[0] for g in groups}
    res, pvals = {}, {}
    for rr in L.REVIEW_RATES:
        pt, ci = relative_reduction_ci(err, rD3, rb, rr, clusters=clusters)
        rng = np.random.default_rng(L.SEED)
        vals = []
        for _ in range(1000):
            pick = rng.integers(0, len(groups), len(groups))
            ix = np.concatenate([idx_by[groups[p]] for p in pick])
            v = relative_reduction(err[ix], rD3[ix], rb[ix], rr)
            if np.isfinite(v):
                vals.append(v)
        vals = np.array(vals)
        res[str(rr)] = {"rel_reduction": pt, "ci95": [ci[0], ci[1]]}
        pvals[str(rr)] = float((vals <= 0).mean()) if len(vals) else 1.0
    adj = holm(pvals)
    for rr in res:
        res[rr]["p_one_sided"] = pvals[rr]
        res[rr]["p_holm"] = adj[rr]
        res[rr]["passes_20pct_ci_excl_zero"] = bool(
            np.isfinite(res[rr]["rel_reduction"]) and res[rr]["rel_reduction"] >= 0.20
            and res[rr]["ci95"][0] > 0.0)
        res[rr]["passes_success_criterion"] = bool(
            res[rr]["passes_20pct_ci_excl_zero"] and adj[rr] < 0.05)
    return {"baseline": better, "n_instances_with_D3": int(mask.sum()), "by_review_rate": res}


def eval_split(model, early, late, ood, T, sl, studies, labels, risk_models, tag,
               subset=None):
    sig = VS.study_signals(studies, labels, sl)
    risks = {k: sig[k] for k in ARMS if k in sig}
    risks.update(apply_comp(risk_models, sig))
    return {"tag": tag, "n_studies": int(len(sig["y"])), "signals": sig,
            "risks": risks, "table": arm_table(sig, {**{k: sig[k] for k in ARMS if k in sig},
                                                      **apply_comp(risk_models, sig)}, sig["y"])}


def main() -> int:
    torch.set_num_threads(2)
    ckpt = Path("validation/models/classifier_v2a1.pt")
    model, early, late, T = VS.load_model(ckpt)
    ood = VS.fit_ood(model, late, "train")

    # ---- validation (fit composites) ----
    vf, vids, vs, vy = VS.load_cache("val")
    vsl = VS.slice_signals(model, late, vf, T, ood)
    vsl["C3"] = VS.compute_gradcam_risk(model, vids, L.load_tile160)
    vsig = VS.study_signals(vs, vy, vsl)
    risk_models = fit_arms(vsig, use_c3=True)
    val = dict(vsig)
    val.update(apply_comp(risk_models, vsig))
    print("val done; composites fitted", flush=True)

    # ---- Test A (cached) ----
    tf, tids, ts, ty = VS.load_cache("test")
    tsl = VS.slice_signals(model, late, tf, T, ood)
    tsl["C3"] = VS.compute_gradcam_risk(model, tids, L.load_tile160)
    tsig = VS.study_signals(ts, ty, tsl)
    testA_risks = {k: tsig[k] for k in ARMS if k in tsig}
    testA_risks.update(apply_comp(risk_models, tsig))
    print("Test A done", flush=True)

    # ---- Test B (corrupted; early features recomputed per corruption) ----
    gc_studies = select_gradcam_studies(ts, ty, frac=0.5)
    pool = {k: [] for k in ARMS + list(COMPS) + ["study", "prob", "y"]}
    per_corr = {}
    for kind, level in L.CORRUPTIONS:
        feats = []
        for i in range(0, len(tids), 32):
            xs = torch.stack([L.corrupt(L.load_tile160(tids[j]), kind, level)
                              for j in range(i, min(i + 32, len(tids)))])
            with torch.no_grad():
                feats.append(L.early_features(early, xs))
        f = torch.cat(feats)
        sl = VS.slice_signals(model, late, f, T, ood)
        order = [i for i in range(len(tids)) if ts[i] in gc_studies]
        c3_arr = VS.compute_gradcam_risk(
            model, [tids[j] for j in order],
            lambda sid, kk=kind, ll=level: L.corrupt(L.load_tile160(sid), kk, ll))
        c3_full = np.full(len(tids), np.nan)
        for n, j in enumerate(order):
            c3_full[j] = c3_arr[n]
        sl["C3"] = c3_full
        ssig = VS.study_signals(ts, ty, sl)
        rr = apply_comp(risk_models, ssig)
        per_corr[f"{kind}_{level}"] = arm_table(ssig, {**{k: ssig[k] for k in ARMS if k in ssig}, **rr}, ssig["y"])
        for k in ARMS:
            if k in ssig:
                pool[k].append(ssig[k])
        for name in COMPS:
            pool[name].append(rr[name])
        pool["study"].append(ssig["study"])
        pool["prob"].append(ssig["prob"])
        pool["y"].append(ssig["y"])
        print(f"Test B {kind}_{level} done", flush=True)

    psig = {k: np.concatenate(v) for k, v in pool.items()}
    testB_risks = {k: psig[k] for k in ARMS + list(COMPS)}

    report = {
        "marking": "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.",
        "model": "EfficientNet-B0; last-3-blocks+head trained on cached 160px early features",
        "temperature": T, "gradcam_subset_studies": int(len(gc_studies)),
        "n": {"val": int(len(vsig["y"])), "testA": int(len(tsig["y"])),
              "testB_instances": int(len(psig["y"]))},
        "testA": {"arms": arm_table(tsig, testA_risks, tsig["y"])},
        "testB_per_corruption": per_corr,
        "testB_pooled": {"arms": arm_table(psig, {k: psig[k] for k in ARMS if k in psig}, psig["y"])},
    }
    report["primary_testB_D3_vs_better"] = primary(testB_risks, psig, psig["y"])
    report["secondary_testA_D3_vs_better"] = primary(testA_risks, tsig, tsig["y"])

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "v2a1_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    np.savez(REPORTS / "v2a1_curves.npz",
             val_y=val["y"], val_prob=val["prob"], val_D3=val["D3"],
             testA_y=tsig["y"], testA_prob=tsig["prob"], testA_D3=testA_risks["D3"],
             testB_y=psig["y"], testB_prob=psig["prob"], testB_D3=psig["D3"],
             testB_study=psig["study"].astype(object))
    pr = report["primary_testB_D3_vs_better"]
    print(json.dumps({"primary_baseline": pr["baseline"],
                      "n_instances_with_D3": pr["n_instances_with_D3"],
                      "by_review_rate": pr["by_review_rate"]},
                     indent=2, default=str), flush=True)
    print("wrote", REPORTS / "v2a1_report.json", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
