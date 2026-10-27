"""Run the gating study and write a report.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

--model head : frozen EfficientNet-B0 features + trained dropout head (RSNA dev)
--model full : fully fine-tuned EfficientNet-B0 (MC-dropout over the whole net)

Scope: RSNA development data only (image-level). CQ500 external test not yet
available, so no external claim is made here.

Risk score = higher means more likely WRONG -> routed to human review.
Arms: B1 max-softmax ; B2 entropy ; C1 MC-dropout U ; C2 Mahalanobis OOD ;
      C4 confidence-U conflict ; D composite H (LR fitted on VALIDATION only).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from validation.study import data as datamod
from validation.study import signals
from validation.study.compare import relative_reduction, relative_reduction_ci
from validation.study.metrics import (auroc, brier, ece, risk_coverage,
                                      sensitivity_specificity, unsafe_accepted_per_1000)

FEATURES = Path("validation/data_cache/features_b0.npz")
HEAD = Path("validation/models/head.pt")
CLASSIFIER = Path("validation/models/classifier.pt")
REPORTS = Path("validation/reports")
REVIEW_RATES = [0.05, 0.10, 0.20, 0.30]


def _mc(model, xb, n=20):
    import torch
    from validation.study.model import _enable_dropout
    model.eval()
    _enable_dropout(model)
    ps = np.zeros((n, xb.shape[0]))
    with torch.no_grad():
        for k in range(n):
            ps[k] = torch.softmax(model(xb), dim=1)[:, 1].numpy()
    return ps.mean(0), ps.var(0), (ps * (1 - ps)).mean(0)


def _penult(model, xb):
    import torch
    model.eval()
    with torch.no_grad():
        f = model.avgpool(model.features(xb))
        return torch.flatten(f, 1).numpy()


def compute_head():
    import torch
    from validation.study.train_head import build_head
    d = np.load(FEATURES)
    feats, y, ids = d["feats"], d["y"], [str(s) for s in d["ids"]]
    ckpt = torch.load(HEAD, map_location="cpu", weights_only=False)
    head = build_head(ckpt["d"], ckpt["h"], ckpt["dropout"])
    head.load_state_dict(ckpt["state_dict"])
    head.eval()
    ft = torch.from_numpy(feats)
    with torch.no_grad():
        probs = torch.softmax(head(ft), dim=1)[:, 1].numpy()
    sp = datamod.load_splits()
    split = np.array([sp[i] for i in ids])
    out = {"y": y, "ids": ids, "split": split, "probs": probs, "feats": feats,
           "val_auroc": ckpt.get("val_auroc"),
           "kind": "frozen-EfficientNet-B0 features + trained dropout head"}
    for name, m in (("val", split == "val"), ("test", split == "test")):
        out[name] = _mc(head, ft[torch.from_numpy(np.where(m)[0])])
    return out


CACHE = Path("validation/data_cache/full_preds.npz")


def compute_full(batch=32):
    import torch
    from validation.study.model import build_model
    st = CLASSIFIER.stat()
    key = f"{st.st_mtime_ns}:{st.st_size}"
    if CACHE.exists():
        d = np.load(CACHE, allow_pickle=True)
        if str(d["key"]) == key:
            print("[cache] reusing fine-tuned predictions", flush=True)
            return {"y": d["y"], "ids": [str(s) for s in d["ids"]], "split": d["split"],
                    "probs": d["probs"], "feats": d["feats"], "val_auroc": float(d["val_auroc"]),
                    "kind": str(d["kind"]),
                    "val": (d["val_mp"], d["val_ep"], d["val_al"]),
                    "test": (d["test_mp"], d["test_ep"], d["test_al"])}
    ckpt = torch.load(CLASSIFIER, map_location="cpu", weights_only=False)
    model, _ = build_model(ckpt["args"].get("dropout", 0.3), pretrained=False)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    X, y, ids = datamod.load_npz()
    mean = np.array(ckpt["mean"], dtype=np.float32)
    std = np.array(ckpt["std"], dtype=np.float32)
    sp = datamod.load_splits()
    split = np.array([sp[str(i)] for i in ids])

    probs = np.zeros(len(X), dtype=np.float64)
    feats = np.zeros((len(X), 1280), dtype=np.float32)
    with torch.no_grad():
        for b in range(0, len(X), batch):
            j = min(b + batch, len(X))
            xb = datamod.tensors(np.arange(b, j), mean, std)[0]
            probs[b:j] = torch.softmax(model(xb), dim=1)[:, 1].numpy()
            feats[b:j] = _penult(model, xb)

    out = {"y": y, "ids": ids, "split": split, "probs": probs, "feats": feats,
           "val_auroc": ckpt.get("val_auroc"),
           "kind": "fully fine-tuned EfficientNet-B0"}
    for name, m in (("val", split == "val"), ("test", split == "test")):
        xb = datamod.tensors(np.where(m)[0], mean, std)[0]
        out[name] = _mc(model, xb)
    np.savez(CACHE, key=key, y=y, ids=np.array(ids, dtype=object), split=split,
             probs=probs, feats=feats, val_auroc=np.array(out["val_auroc"] or 0.0),
             kind=np.array(out["kind"], dtype=object),
             val_mp=out["val"][0], val_ep=out["val"][1], val_al=out["val"][2],
             test_mp=out["test"][0], test_ep=out["test"][1], test_al=out["test"][2])
    print("[cache] saved fine-tuned predictions", flush=True)
    return out


def _fit_temperature(p, y):
    from scipy.optimize import minimize_scalar
    p = np.clip(np.asarray(p, float), 1e-6, 1 - 1e-6)
    z = np.log(p / (1 - p))
    y = np.asarray(y, float)

    def nll(logT):
        q = 1.0 / (1.0 + np.exp(-z / np.exp(logT)))
        q = np.clip(q, 1e-9, 1 - 1e-9)
        return -np.mean(y * np.log(q) + (1 - y) * np.log(1 - q))

    return float(np.exp(minimize_scalar(nll, bounds=(-3.0, 3.0), method="bounded").x))


def _apply_temperature(p, T):
    p = np.clip(np.asarray(p, float), 1e-6, 1 - 1e-6)
    z = np.log(p / (1 - p))
    return 1.0 / (1.0 + np.exp(-z / T))


def evaluate(r, tag, keep_ood=False):
    from sklearn.linear_model import LogisticRegression
    y, split = r["y"], r["split"]
    y_va, y_te = y[split == "val"], y[split == "test"]

    p_va_raw, p_te_raw = r["probs"][split == "val"], r["probs"][split == "test"]
    T = _fit_temperature(p_va_raw, y_va)
    p_va, p_te = _apply_temperature(p_va_raw, T), _apply_temperature(p_te_raw, T)

    U_va = signals.normalized_U(r["val"][1], r["val"][2])
    U_te = signals.normalized_U(r["test"][1], r["test"][2])
    ood = signals.MahalanobisOOD().fit(r["feats"][split == "train"], y[split == "train"])

    arms_va = {"B1_maxsoftmax": signals.risk_max_softmax(p_va),
               "B2_entropy": signals.risk_entropy(p_va),
               "C1_uncertainty": U_va,
               "C4_conflict": signals.risk_conflict(p_va, r["val"][1], r["val"][2])}
    arms_te = {"B1_maxsoftmax": signals.risk_max_softmax(p_te),
               "B2_entropy": signals.risk_entropy(p_te),
               "C1_uncertainty": U_te,
               "C4_conflict": signals.risk_conflict(p_te, r["test"][1], r["test"][2])}
    if keep_ood:
        arms_va["C2_ood"] = ood.score(r["feats"][split == "val"])
        arms_te["C2_ood"] = ood.score(r["feats"][split == "test"])

    err_va = ((p_va >= 0.5).astype(int) != y_va)
    err_te = ((p_te >= 0.5).astype(int) != y_te)

    sig_names = [n for n in ("C1_uncertainty", "C2_ood", "C4_conflict") if n in arms_va]
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit(
        np.column_stack([arms_va[n] for n in sig_names]), err_va.astype(int))
    arms_te["D_composite_H"] = H.predict_proba(np.column_stack([arms_te[n] for n in sig_names]))[:, 1]

    report = {"model": r["kind"], "model_kind": tag, "model_val_auroc": r.get("val_auroc"),
              "temperature": T, "keep_ood": bool(keep_ood), "composite_signals": sig_names,
              "scope": "RSNA development set (image-level); NO external test",
              "n": {k: int((split == k).sum()) for k in ("train", "val", "test")},
              "test_error_rate": float(err_te.mean()), "review_rates": REVIEW_RATES,
              "evidence_marking": "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.",
              "arms": {}}
    for arm, risk in arms_te.items():
        _cov, _rc, aurc = risk_coverage(risk, err_te)
        entry = {"error_auroc": float(auroc(risk, err_te)), "aurc": float(aurc),
                 "brier": float(brier(p_te, y_te)), "ece": float(ece(p_te, y_te)),
                 "by_review_rate": {}}
        for rr in REVIEW_RATES:
            acc = risk <= np.quantile(risk, 1.0 - rr)
            sens, spec = sensitivity_specificity(p_te[acc], y_te[acc], 0.5)
            entry["by_review_rate"][str(rr)] = {
                "unsafe_accepted_per_1000": float(unsafe_accepted_per_1000(risk, err_te, rr)),
                "share_reviewed": float(rr),
                "accepted_sensitivity": float(sens), "accepted_specificity": float(spec)}
        report["arms"][arm] = entry

    b1 = relative_reduction(err_te, arms_te["D_composite_H"], arms_te["B1_maxsoftmax"], 0.10)
    b2 = relative_reduction(err_te, arms_te["D_composite_H"], arms_te["B2_entropy"], 0.10)
    better = "B1_maxsoftmax" if b1 >= b2 else "B2_entropy"
    cmp = {}
    for rr in REVIEW_RATES:
        ptv, ci = relative_reduction_ci(err_te, arms_te["D_composite_H"], arms_te[better], rr)
        cmp[str(rr)] = {"relative_reduction_vs_" + better: float(ptv),
                        "ci95": [float(ci[0]), float(ci[1])],
                        "passes_20pct_ci_excl_zero": bool(np.isfinite(ptv) and ptv >= 0.20 and ci[0] > 0)}
    report["composite_vs_better_baseline"] = {"baseline": better, "by_review_rate": cmp}

    sens_a, spec_a = sensitivity_specificity(p_te, y_te, 0.5)
    report["arm_A_no_gate"] = {"unsafe_accepted_per_1000": float(err_te.mean() * 1000),
                               "share_reviewed": 0.0, "accepted_sensitivity": float(sens_a),
                               "accepted_specificity": float(spec_a), "note": "accept-all; no gate"}

    abl = {}
    for drop in sig_names:
        keep = [n for n in sig_names if n != drop]
        Hk = LogisticRegression(max_iter=2000, class_weight="balanced").fit(
            np.column_stack([arms_va[n] for n in keep]), err_va.astype(int))
        risk = Hk.predict_proba(np.column_stack([arms_te[n] for n in keep]))[:, 1]
        rates = {}
        for rr in REVIEW_RATES:
            rates[str(rr)] = {"relative_reduction_vs_B1": float(
                relative_reduction(err_te, risk, arms_te["B1_maxsoftmax"], rr))}
        abl[f"without_{drop}"] = {"error_auroc": float(auroc(risk, err_te)), "by_review_rate": rates}
    report["ablations_leave_one_out"] = abl

    REPORTS.mkdir(parents=True, exist_ok=True)
    np.savez(REPORTS / f"study_curves_{tag}.npz", y_te=y_te, err_te=err_te,
             **{f"risk__{k}": v for k, v in arms_te.items()})
    (REPORTS / f"study_report_{tag}.json").write_text(json.dumps(report, indent=2))
    _write_md(report, tag)
    print(json.dumps({"model": report["model"], "temperature": round(T, 3),
                      "composite_signals": sig_names, "test_error_rate": report["test_error_rate"],
                      "arms": {k: round(v["error_auroc"], 3) for k, v in report["arms"].items()},
                      "criterion": {k: v["passes_20pct_ci_excl_zero"]
                                    for k, v in cmp.items()}}, indent=2))
    return report


def _write_md(report, tag):
    L = [f"# RSNA development-set gating study ({tag})", "",
         f"**Model:** {report['model']} (val AUROC {report['model_val_auroc']})",
         f"**Temperature (val-fitted):** {report.get('temperature')}  "
         f"**composite signals:** {report.get('composite_signals')}",
         f"**Scope:** {report['scope']}", f"**Marking:** {report['evidence_marking']}", "",
         f"- n: {report['n']}  test error rate: {report['test_error_rate']:.3f}", "",
         "| arm | error AUROC | AURC | Brier | ECE |", "|---|---|---|---|---|"]
    for arm, e in report["arms"].items():
        L.append(f"| {arm} | {e['error_auroc']:.3f} | {e['aurc']:.3f} | {e['brier']:.3f} | {e['ece']:.3f} |")
    cb = report["composite_vs_better_baseline"]
    L += ["", f"### Composite H vs better baseline (**{cb['baseline']}**)", "",
          "| review rate | rel. reduction | 95% CI | passes |", "|---|---|---|---|"]
    for rr, v in cb["by_review_rate"].items():
        k = "relative_reduction_vs_" + cb["baseline"]
        L.append(f"| {rr} | {v[k]:.3f} | [{v['ci95'][0]:.3f}, {v['ci95'][1]:.3f}] | {v['passes_20pct_ci_excl_zero']} |")
    a = report["arm_A_no_gate"]
    L += ["", "### Arm A (no gate)",
          f"- unsafe accepted per 1,000 = {a['unsafe_accepted_per_1000']:.1f}; "
          f"sens {a['accepted_sensitivity']:.3f}, spec {a['accepted_specificity']:.3f}"]
    abl = report.get("ablations_leave_one_out", {})
    if abl:
        L += ["", "### Ablations (leave-one-signal-out, LR refit on val)",
              "| variant | error AUROC | rel. reduction vs B1 @20% |", "|---|---|---|"]
        for k, v in abl.items():
            L.append(f"| {k} | {v['error_auroc']:.3f} | "
                     f"{v['by_review_rate']['0.2']['relative_reduction_vs_B1']:.3f} |")
    L += ["", "### Limitations", "- RSNA only; no external (CQ500) test yet.",
          "- RSNA has no patient id: image-level splits.",
          "- Not clinical evidence."]
    (REPORTS / f"study_report_{tag}.md").write_text("\n".join(L))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=["head", "full"], default="head")
    ap.add_argument("--keep-ood", action="store_true",
                    help="include the OOD signal in the composite (default: dropped per finding 3)")
    args = ap.parse_args()
    r = compute_head() if args.model == "head" else compute_full()
    evaluate(r, args.model, keep_ood=args.keep_ood)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
