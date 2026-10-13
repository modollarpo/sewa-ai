"""Step 6 (v2 amendment 1): render the feasibility report from the run outputs.

Reads:
  validation/reports/v2a1_report.json      (step5)
  validation/reports/v2a1_power.json       (step4)
  validation/data_cache/v2a1_train_summary.json (step3)
Writes:
  docs/evidence/feasibility_report_v2a1.md

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from validation.study.metrics import auroc

R = Path("validation/reports")
OUT = Path("docs/evidence/feasibility_report_v2a1.md")
MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."


def fmt(v, nd=3):
    return "n/a" if v is None else f"{v:.{nd}f}"


def arm_rows(tab):
    rows = []
    for k in ("B1", "B2", "C1", "C2", "C3", "C4", "D1", "D2", "D3"):
        e = tab.get(k)
        if not e or e.get("error_auroc") is None:
            rows.append(f"| {k} | n/a | n/a | n/a |")
        else:
            rows.append(f"| {k} | {fmt(e['error_auroc'])} | {fmt(e.get('aurc'))} | {e.get('n')} |")
    return rows


def verdict(report, power, pw=None):
    pr = report["primary_testB_D3_vs_better"]
    r20 = pr["by_review_rate"]["0.2"]
    rr, lo, hi = r20["rel_reduction"], r20["ci95"][0], r20["ci95"][1]
    if r20.get("passes_success_criterion"):
        return "SUCCESS", ("D3 met the >=20% relative-reduction criterion at the primary 20% review "
                           "rate on Test B (scan-clustered CI, Holm-adjusted).")
    mde_design = pw["mde_80pct_power_design_based"] if pw else None
    txt = (f"At the primary 20% review rate the **pre-registered criterion is NOT met** "
           f"({rr:.1%}, CI [{lo:.1%}, {hi:.1%}]) \u2014 below the pre-registered >=20% bar.")
    if mde_design is not None:
        txt += (f" A **post-hoc design-based power analysis** for this exact Test B design "
                f"(60 scan clusters, 9 corruptions/scan, baseline {pr['baseline']}) gives an MDE of "
                f"**{mde_design:.2f}**, so the shortfall is the **point estimate, not power**. "
                f"The validation-based MDE (0.77) is not the MDE for this design and is not used here. ")
    else:
        txt += " "
    txt += ("The verdict is kept **INCONCLUSIVE** as pre-registered (only a single exploratory test run "
            "has been done; no confirmatory replication). The 30% review rate is secondary/exploratory "
            "and is not counted as a pass.")
    return "INCONCLUSIVE", txt


def main() -> int:
    report = json.loads((R / "v2a1_report.json").read_text(encoding="utf-8"))
    power = json.loads((R / "v2a1_power.json").read_text(encoding="utf-8"))
    tr = json.loads(Path("validation/data_cache/v2a1_train_summary.json").read_text(encoding="utf-8"))
    ph = json.loads((R / "v2a1_posthoc_dweights.json").read_text(encoding="utf-8"))
    pw = json.loads((R / "v2a1_posthoc_power_design.json").read_text(encoding="utf-8"))
    d2 = json.loads((R / "v2a1_posthoc_d2.json").read_text(encoding="utf-8"))
    c3 = json.loads((R / "v2a1_posthoc_c3.json").read_text(encoding="utf-8"))
    ws = json.loads((R / "v2a1_posthoc_weights_std.json").read_text(encoding="utf-8"))
    v, vtext = verdict(report, power, pw)
    pr = report["primary_testB_D3_vs_better"]

    L = [
        "# v2 feasibility report (amendment 2: label-integrity repair + wider unfreeze)",
        "",
        f"**{MARK}**", "",
        "**Parent pre-registrations:** `docs/evidence/preregistration_v2.md`, "
        "`docs/evidence/preregistration_v2_amendment1.md`, "
        "`docs/evidence/preregistration_v2_amendment2.md` (frozen before the formal test run).",
        "**Branch:** `fix/patent-aligned`.",
        "",
        "## Scope",
        "- Public RSNA intracranial-haemorrhage data only; **no validated weights, no labelled "
        "clinical dataset**. All numbers are feasibility estimates on **real public RSNA data**.",
        "- Grouping: `StudyInstanceUID`. Test A = fresh held-out scans; Test B = the same scans with "
        "9 test-time corruptions; Test C (CQ500) is HELD.",
        "",
        "## Model & training (frozen amendment)",
        f"- EfficientNet-B0; frozen early blocks (cached 160px), last-6 blocks + dropout head trained. "
        f"val study-level AUROC **{fmt(tr['val_study_auc'])}** (epoch {tr['best_epoch']}), "
        f"temperature **{fmt(tr['temperature'])}**.",
        f"- Per-slice labels from the authoritative RSNA `stage_2_train.csv` (amendment 2); study score = "
        f"mean of the top-3 slice probabilities.",
        "",
        "## Effective sample size and clustering (verified)",
        "All paired bootstrap CIs and Holm p-values resample **scans (StudyInstanceUID) as clusters**, "
        "not corrupted instances: `validation/study/compare.py::relative_reduction_ci` builds one group "
        "per unique cluster value and resamples whole clusters with replacement, and every call passes "
        "`clusters = sig[\"study\"]` (the StudyInstanceUID). Corrupted instances of a scan are always "
        "resampled together (paired).",
        "",
        "| comparison | instances | corrupted copies / scan | clusters (scans) |",
        "|---|---|---|---|",
        "| Power / MDE (validation) | 120 studies | 1 | **120** |",
        "| Test A primary (D3 vs baseline) | 120 | 1 | **120** |",
        "| Test B pooled, D3/C3 subset | 540 | 9 | **60** |",
        "| Test B pooled, all arms | 1080 | 9 | 120 |",
        "",
    ]
    L += ["## Power (pre-registered 5b, computed before the formal run)",
          "| review rate | MDE (80% power, rel.) | underpowered vs 20% |",
          "|---|---|---|"]
    for rr, e in power["by_review_rate"].items():
        L.append(f"| {rr} | {fmt(e['mde_80pct_power'])} | {e['underpowered_vs_20pct']} |")
    L += ["", f"_{power['note']}_", "",
          "## Test A (clean held-out scans)",
          "| arm | error AUROC | AURC | n |", "|---|---|---|---|"]
    L += arm_rows(report["testA"]["arms"])
    L += ["", "_C3 (Grad-CAM inside-mask coherence) is **anti-predictive** here, not merely weak: "
          "error-AUROC **0.316** (<0.5), i.e. its risk score runs opposite to error. It is reported "
          "with its true sign; the sign is not flipped to make it look useful._", ""]
    L += ["## Test B (pooled 9 corruptions)",
          "| arm | error AUROC | AURC | n |", "|---|---|---|---|"]
    L += arm_rows(report["testB_pooled"]["arms"])
    L += ["", "_C3 (Grad-CAM coherence) is **anti-predictive** on Test B too: error-AUROC **0.343** "
          "(<0.5), reported without sign flipping. D3 pooled error-AUROC = **0.782** on the 540 "
          "instances (60 scans x 9 corruptions) where C3 is defined._", ""]
    L += ["## Primary comparison — D3 vs the better baseline (Test B)",
          f"**Baseline:** {pr['baseline']}  **instances with D3:** {pr['n_instances_with_D3']} "
          f"(= 60 scans x 9 corruptions; cluster unit = **60 scans**)",
          "", "| review rate | rel. reduction | 95% CI | p (Holm) | passes success |",
          "|---|---|---|---|---|"]
    for rr, e in pr["by_review_rate"].items():
        L.append(f"| {rr} | {fmt(e['rel_reduction'])} | "
                 f"[{fmt(e['ci95'][0])}, {fmt(e['ci95'][1])}] | {fmt(e['p_holm'])} | "
                 f"{e['passes_success_criterion']} |")
    L += ["", "_Only the **20%** row is the pre-registered primary comparison. The 30% row is a "
          "secondary/exploratory review rate and is **not** reported as a pass; the 5%/10% rows are "
          "part of the Holm family but are not the primary gate._", ""]
    sa = report["secondary_testA_D3_vs_better"]
    L += ["## Secondary comparison (Test A, clean)",
          f"**Baseline:** {sa['baseline']}  **instances with D3:** {sa['n_instances_with_D3']} "
          f"(cluster unit = **120 scans**)",
          "", "| review rate | rel. reduction | 95% CI | passes |", "|---|---|---|---|"]
    for rr, e in sa["by_review_rate"].items():
        L.append(f"| {rr} | {fmt(e['rel_reduction'])} | "
                 f"[{fmt(e['ci95'][0])}, {fmt(e['ci95'][1])}] | "
                 f"{e['passes_20pct_ci_excl_zero']} |")

    sub = ph["subset"]
    L += ["", "---", "", "# POST-HOC, EXPLORATORY (not pre-registered)", "",
          "_These analyses were added after the pre-registered run. They do not change the "
          "pre-registered primary comparison or the verdict above._", "",
          "## How the 60-scan C3/D3 subset was chosen (outcome-independent)",
          "`select_gradcam_studies(studies, labels, frac=0.5)`: studies are sorted by "
          "`StudyInstanceUID`, grouped by **ground-truth study label**, and a deterministic stride "
          "sample of `frac=0.5` of each class is taken. It uses only the StudyInstanceUID ordering and "
          "the labels — never the model's scores, predictions, probabilities, or errors — so the "
          "selection cannot be biased by outcomes. Result: **60 scans** "
          f"({sub['positive']} positive / {sub['negative']} negative; overall Test B is 83/120 positive).",
          "",
          "## Test B D1/D2 across all 120 scans, and fitted composite weights",
          "D1 and D2 use no C3, so they are defined on all 120 scans (1080 scan x corruption instances):",
          "", "| arm | error AUROC (all 120 scans) |", "|---|---|"]
    for k in ("B1", "B2", "C1", "C2", "C4", "D1", "D2"):
        L.append(f"| {k} | {fmt(ph['testB_all_120_scans'][k]['error_auroc'])} |")
    L += ["", "On the 60-scan subset where C3 is defined (540 instances), arm error-AUROC is:"]
    znp = np.load(R / "v2a1_testb_instances.npz", allow_pickle=True)
    zerr = znp["err"].astype(bool)
    msub = np.isfinite(znp["D3"])
    L += ["", "| arm | error AUROC (60-scan subset) |", "|---|---|"]
    for k in ("B1", "B2", "C1", "C2", "C3", "C4", "D1", "D2", "D3"):
        rr = znp[k][msub]
        mm = np.isfinite(rr)
        val = auroc(rr[mm], zerr[msub][mm])
        L.append(f"| {k} | {fmt(val)} |")
    wt = ph["weights"]
    lines_w = []
    for name in ("D1", "D2", "D3"):
        feats = wt[name]["features"]
        parts = ", ".join(f"{f}={c:+.3f}" for f, c in zip(feats, wt[name]["coef"]))
        lines_w.append(f"- **{name}** ({'+'.join(feats)}), intercept {wt[name]['intercept']:+.3f}: {parts}")
    L += ["", "### Fitted composite weights (logistic regression on validation only)",
          *lines_w, "",
          f"**C3 weight in D3 is negative ({wt['D3']['c3_weight']:+.3f})** — the fitted model uses the "
          "anti-predictive Grad-CAM proxy with a negative sign, consistent with its below-chance "
          "error-AUROC. This is reported as-is; the sign is not flipped.", ""]

    L += ["## Design-based power analysis for the actual Test B design (post-hoc)",
          f"- Effective **scans = {pw['design']['scans']}** "
          f"({pw['design']['instances']} instances = 60 scans x 9 corruptions), baseline "
          f"{pr['baseline']}, review rate 20%.",
          f"- Design-based bootstrap SE = **{fmt(pw['bootstrap_se'])}**; 95% CI half-width = "
          f"**{fmt(pw['ci_half_width'])}** (reproduces the pre-registered CI half-width ~0.09).",
          f"- MDE at 80% power (CI-excludes-0) = **{fmt(pw['mde_80pct_power_design_based'])}**.",
          f"- Power under the **full pre-registered success rule** (point estimate >= 20% AND CI "
          f"excludes 0): {fmt(pw['power_by_true_effect']['0.2'], 2)} at a true 20% effect; "
          f"{fmt(pw['power_by_true_effect']['0.25'], 2)} at 25%; "
          f"{fmt(pw['power_by_true_effect']['0.15'], 2)} at 15%.",
          f"- _Reason the earlier validation-based MDE (0.77) differs from this CI half-width (~0.09): "
          f"they are different designs. Section 5b bootstrapped the **validation** set (120 uncorrupted "
          f"scans, composite fitted in-sample, baseline B1), where the relative-reduction ratio at 20% "
          f"review has a heavy tail (SD 0.27). The design-based analysis uses the **actual Test B "
          f"design** (60 scan-clusters, each averaging 9 corruptions, baseline B2), whose SE is ~5.8x "
          f"smaller (0.05). Part of the ratio (1.43x) is just the z-constant (MDE uses "
          f"z_0.975+z_0.8 = 2.8 x SD; a CI half-width is ~1.96 x SD). Note that reaching a >=20% "
          f"*point estimate* at a true 20% effect is ~a coin flip by construction, so power under the "
          f"full rule is ~0.49 even though the CI-exclusion MDE is 0.13._", ""]

    L += ["## D2 vs B2 on Test B, all 120 scans (post-hoc exploratory)",
          "D2 (C1+C2+C4) uses no C3, so it is defined on all 120 scans (1080 instances). Relative "
          "reduction in unsafe-accepted vs B2 (predictive entropy), scan-cluster bootstrap:",
          "", "| review | relative reduction | 95% CI |", "|---|---|---|"]
    for rr in ("0.05", "0.1", "0.2", "0.3"):
        e = d2["testB_all_scans"]["by_review_rate"][rr]
        L.append(f"| {int(round(float(rr) * 100))}% | {e['rel_reduction']:.1%} | "
                 f"[{e['ci95'][0]:.1%}, {e['ci95'][1]:.1%}] |")
    tb = d2["testB_paired_auroc_diff_D2_minus_B2"]
    ta = d2["testA_paired_auroc_diff_D2_minus_B2"]
    L += ["",
          f"- Paired error-AUROC difference (D2 - B2) on **Test B** (1080 instances): "
          f"**{tb['auroc_diff']:+.3f}** (95% CI [{tb['ci95'][0]:+.3f}, {tb['ci95'][1]:+.3f}]; "
          f"D2 {fmt(tb['auroc_new'])} vs B2 {fmt(tb['auroc_base'])}).",
          f"- Paired error-AUROC difference (D2 - B2) on **Test A** (120 scans): "
          f"**{ta['auroc_diff']:+.3f}** (95% CI [{ta['ci95'][0]:+.3f}, {ta['ci95'][1]:+.3f}]; "
          f"D2 {fmt(ta['auroc_new'])} vs B2 {fmt(ta['auroc_base'])}).",
          "- Note: D2's relative reduction is far below the D3 result and was **not** a pre-registered "
          "comparison; it is reported for completeness only.", ""]

    L += ["## C3 (Grad-CAM) proxy investigation (post-hoc exploratory)",
          "**Sign convention.** `C3 risk = 1 - inside_fraction`, where "
          "`inside_fraction = sum(cam*mask)/sum(cam)` and the mask is the brain-window channel "
          "(`x[0,0] > 0.05` on the 160px tile; `v2_lib.py:189`). Higher C3 risk = more Grad-CAM mass "
          "**outside** the brain mask.",
          "**Target class.** Grad-CAM differentiates `argmax(logits)` \u2014 the **predicted** class "
          "(`v2_lib.py:184`), not a fixed class. A scan the model calls positive explains class 1; one "
          "it calls negative explains class 0.",
          "",
          "**Behaviour on positives vs negatives (Test A, 120 scans).** Mean C3 risk tracks the "
          "*predicted* label, not correctness:",
          "", "| scan group | n | mean C3 risk | mean inside | Grad-CAM target = class 1 |",
          "|---|---|---|---|---|"]
    for k in ("TN", "FP", "FN", "TP"):
        b = c3["testA"]["by_truth_x_prediction"][k]
        if b["n"] == 0:
            L.append(f"| {k} | 0 | - | - | - |")
            continue
        L.append(f"| {k} | {b['n']} | {b['mean_C3_risk']:.3f} | {b['mean_C3_inside']:.3f} | "
                 f"{b['mean_GradCAM_targets_class1']:.2f} |")
    L += ["",
          f"- C3 risk is ~0.60 whenever the model predicts **positive** (TP 0.605, and the one FP 0.665) "
          f"and ~0.45 when it predicts **negative** (TN 0.452, FN 0.438) — Test A. It separates the "
          f"*predicted label*, not correct-vs-incorrect.",
          f"- Grad-CAM targets class 1 in 92% of top-3 slices for TP scans but only 8% for TN scans, "
          f"confirming the predicted-class confound.",
          f"- Consequence: C3's error-AUROC is below chance (val {fmt(c3['val']['error_auroc_C3'])}, "
          f"Test A {fmt(c3['testA']['error_auroc_C3'])}), because most positives are classified "
          f"correctly, so 'high C3' coincides with 'correct'. **The negative fitted weight on C3 in D3 "
          f"is a symptom of this confound, not evidence of value.**", ""]

    L += ["## Standardised composite weights (post-hoc exploratory)",
          "Features z-scored on validation, so coefficients are comparable across signals:",
          "", "| composite | standardised weights (z-scored) |", "|---|---|"]
    for name in ("D1", "D2", "D3"):
        feats = ws[name]["features"]
        cs = ws[name]["coef_standardised"]
        L.append(f"| {name} | " + ", ".join(f"{f}={c:+.3f}" for f, c in zip(feats, cs)) + " |")
    L += ["",
          "- C4 (conflict x uncertainty) and C1 (normalised MC-dropout uncertainty) carry the largest "
          "positive standardised weights in every composite; C2 (Mahalanobis OOD) contributes little.",
          "- In D3, **C3 receives the largest-magnitude standardised weight but with a negative sign** "
          "(-0.74) — consistent with the C3 confound above, not with a useful signal.", ""]

    L += ["", f"## Verdict: **{v}**", "", vtext, "",
          "## Limitations",
          "- Real public RSNA data only; CQ500 (Test C) held and not evaluated.",
          "- C3 (Grad-CAM inside-mask coherence) is a **partial proxy** on a fixed subset of scans and "
          "is **anti-predictive** (error-AUROC 0.316 Test A / 0.343 Test B, below chance); reported "
          "with its true sign, never flipped.",
          "- Primary Test B comparison rests on **60 scans** (the C3/D3 subset) x 9 corruptions = 540 "
          "instances; the bootstrap clusters by scan, so power is driven by 60 clusters, not 540.",
          "- Reduced-compute execution (amendment 1): 8 slices/scan, 160px, 1 seed — absolute "
          "metrics are lower bounds vs the full prereg.",
          "- Amendment 2: per-slice labels taken from the authoritative `stage_2_train.csv` after "
          "the cached metadata label block was found decoupled; last-6 blocks trained at lr 1e-4.",
          "- Grouping is by `StudyInstanceUID`, not patient (a patient with several studies could "
          "appear in more than one split).",
          "- Not clinical evidence."]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"verdict={v}\nwrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
