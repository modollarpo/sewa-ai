"""Run the gating study on the RSNA development set and write a report.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Scope of THIS run: RSNA development data only (image-level). CQ500 external test is
NOT available yet, so no external claim is made here. Every number is labelled
accordingly in the report.

Arms (risk score = higher means more likely WRONG -> routed to review):
  B1 single-pass max-softmax ; B2 single-pass entropy
  C1 MC-dropout U ; C2 Mahalanobis OOD ; C4 confidence-U conflict
  D  composite H (logistic regression fitted on VALIDATION ONLY, then frozen)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from validation.study import data as datamod
from validation.study import signals
from validation.study.compare import relative_reduction, relative_reduction_ci
from validation.study.metrics import (auroc, brier, ece, risk_coverage,
                                      sensitivity_specificity, unsafe_accepted_per_1000)
from validation.study.train_head import build_head

CACHE = Path("validation/data_cache/features_b0.npz")
HEAD = Path("validation/models/head.pt")
REPORTS = Path("validation/reports")
REVIEW_RATES = [0.05, 0.10, 0.20, 0.30]


def _load():
    import torch
    d = np.load(CACHE)
    feats, y, ids = d["feats"], d["y"], [str(s) for s in d["ids"]]
    ckpt = torch.load(HEAD, map_location="cpu", weights_only=False)
    head = build_head(ckpt["d"], ckpt["h"], ckpt["dropout"])
    head.load_state_dict(ckpt["state_dict"])
    head.eval()
    sp = datamod.load_splits()
    split = np.array([sp[i] for i in ids])
    return feats, y, ids, split, head, ckpt


def main() -> int:
    import torch
    from sklearn.linear_model import LogisticRegression
    torch.set_num_threads(4)

    feats, y, ids, split, head, ckpt = _load()
    tr = split == "train"
    va = split == "val"
    te = split == "test"

    ft = torch.from_numpy(feats)

    # single-pass probs (all splits)
    with torch.no_grad():
        p_all = torch.softmax(head(ft), dim=1)[:, 1].numpy()

    # MC-dropout on head -> epistemic/aleatoric (val + test)
    mean_p, ep, al = {}, {}, {}
    for name, m in (("val", va), ("test", te)):
        xb = ft[torch.from_numpy(np.where(m)[0])]
        mp, e, a = _mc(head, xb, n=20)
        mean_p[name], ep[name], al[name] = mp, e, a

    # OOD: fit on TRAIN features only
    ood = signals.MahalanobisOOD().fit(feats[tr], y[tr])
    ood_va = ood.score(feats[va])
    ood_te = ood.score(feats[te])

    # per-split label + error (pred = p>=0.5)
    y_va, y_te = y[va], y[te]
    err_va = (mean_p["val"] >= 0.5).astype(int) != y_va
    err_te = (mean_p["test"] >= 0.5).astype(int) != y_te

    # --- arm risk scores ---
    U_va = signals.normalized_U(ep["val"], al["val"])
    U_te = signals.normalized_U(ep["test"], al["test"])

    arms_va = {
        "B1_maxsoftmax": signals.risk_max_softmax(mean_p["val"]),
        "B2_entropy": signals.risk_entropy(mean_p["val"]),
        "C1_uncertainty": U_va,
        "C2_ood": ood_va,
        "C4_conflict": signals.risk_conflict(mean_p["val"], ep["val"], al["val"]),
    }
    arms_te = {
        "B1_maxsoftmax": signals.risk_max_softmax(mean_p["test"]),
        "B2_entropy": signals.risk_entropy(mean_p["test"]),
        "C1_uncertainty": U_te,
        "C2_ood": ood_te,
        "C4_conflict": signals.risk_conflict(mean_p["test"], ep["test"], al["test"]),
    }

    # --- composite H: logistic regression on VALIDATION only, frozen ---
    names = ["B1_maxsoftmax", "B2_entropy", "C1_uncertainty", "C2_ood", "C4_conflict"]
    Xva = np.column_stack([arms_va[n] for n in names])
    Xte = np.column_stack([arms_te[n] for n in names])
    H = LogisticRegression(max_iter=2000, class_weight="balanced").fit(Xva, err_va.astype(int))
    arms_va["D_composite_H"] = H.predict_proba(Xva)[:, 1]
    arms_te["D_composite_H"] = H.predict_proba(Xte)[:, 1]

    # --- metrics per arm on TEST ---
    report = {"scope": "RSNA development set (image-level); NO external test",
              "head_val_auroc": ckpt.get("val_auroc"),
              "n": {"train": int(tr.sum()), "val": int(va.sum()), "test": int(te.sum())},
              "test_error_rate": float(err_te.mean()),
              "review_rates": REVIEW_RATES, "arms": {}}
    for arm, risk in arms_te.items():
        cov, rc, aurc = risk_coverage(risk, err_te)
        entry = {"error_auroc": float(auroc(risk, err_te)), "aurc": float(aurc),
                 "brier": float(brier(mean_p["test"], y_te)),
                 "ece": float(ece(mean_p["test"], y_te)),
                 "by_review_rate": {}}
        for r in REVIEW_RATES:
            thr = np.quantile(risk, 1.0 - r)
            accepted = risk <= thr
            sens, spec = sensitivity_specificity(mean_p["test"][accepted], y_te[accepted], 0.5)
            entry["by_review_rate"][str(r)] = {
                "unsafe_accepted_per_1000": float(unsafe_accepted_per_1000(risk, err_te, r)),
                "share_reviewed": float(r),
                "accepted_sensitivity": float(sens),
                "accepted_specificity": float(spec),
            }
        report["arms"][arm] = entry

    # --- headline comparison: H vs better of B1/B2 ---
    base_b1 = relative_reduction(err_te, arms_te["D_composite_H"], arms_te["B1_maxsoftmax"], 0.10)
    base_b2 = relative_reduction(err_te, arms_te["D_composite_H"], arms_te["B2_entropy"], 0.10)
    better = "B1_maxsoftmax" if base_b1 >= base_b2 else "B2_entropy"
    cmp = {}
    for r in REVIEW_RATES:
        pt, ci = relative_reduction_ci(err_te, arms_te["D_composite_H"], arms_te[better], r)
        cmp[str(r)] = {"relative_reduction_vs_" + better: float(pt),
                       "ci95": [float(ci[0]), float(ci[1])],
                       "passes_20pct_ci_excl_zero": bool(np.isfinite(pt) and pt >= 0.20 and ci[0] > 0)}
    report["composite_vs_better_baseline"] = {"baseline": better, "by_review_rate": cmp}
    report["evidence_marking"] = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "study_report.json").write_text(json.dumps(report, indent=2))
    _write_md(report)
    print(json.dumps({k: report[k] for k in ("test_error_rate", "composite_vs_better_baseline")},
                     indent=2))
    print(f"wrote {REPORTS/'study_report.json'}")
    return 0


def _mc(head, xb, n=20):
    import numpy as np
    import torch
    from validation.study.model import _enable_dropout
    head.eval()
    _enable_dropout(head)
    ps = np.zeros((n, xb.shape[0]))
    with torch.no_grad():
        for k in range(n):
            ps[k] = torch.softmax(head(xb), dim=1)[:, 1].numpy()
    return ps.mean(0), ps.var(0), (ps * (1 - ps)).mean(0)


def _write_md(report: dict):
    L = ["# RSNA development-set gating study", "",
         f"**Scope:** {report['scope']}", "",
         f"**Evidence marking:** {report['evidence_marking']}", "",
         f"- n: {report['n']}", f"- head val AUROC: {report['head_val_auroc']:.3f}",
         f"- test error rate: {report['test_error_rate']:.3f}", "",
         "## Arms (test)", "",
         "| arm | error AUROC | AURC |", "|---|---|---|"]
    for arm, e in report["arms"].items():
        L.append(f"| {arm} | {e['error_auroc']:.3f} | {e['aurc']:.3f} |")
    L += ["", "## Composite H vs better baseline at matched review rate", ""]
    cb = report["composite_vs_better_baseline"]
    L.append(f"Baseline = **{cb['baseline']}**")
    L += ["", "| review rate | rel. reduction | 95% CI | passes |", "|---|---|---|---|"]
    for r, v in cb["by_review_rate"].items():
        k = "relative_reduction_vs_" + cb["baseline"]
        L.append(f"| {r} | {v[k]:.3f} | [{v['ci95'][0]:.3f}, {v['ci95'][1]:.3f}] | "
                 f"{v['passes_20pct_ci_excl_zero']} |")
    L += ["", "## Limitations", "- RSNA only; no external (CQ500) test yet.",
          "- RSNA has no patient id: splits are image-level (slices from one patient may"
          " cross splits).",
          "- Backbone is FROZEN pretrained EfficientNet-B0; head is trained (CPU limit).",
          "- Not clinical evidence."]
    (REPORTS / "study_report.md").write_text("\n".join(L))


if __name__ == "__main__":
    raise SystemExit(main())
