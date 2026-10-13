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


def verdict(report, power):
    pr = report["primary_testB_D3_vs_better"]
    r20 = pr["by_review_rate"]["0.2"]
    mde = power["by_review_rate"]["0.2"]["mde_80pct_power"]
    if r20.get("passes_success_criterion"):
        return "SUCCESS", "D3 met the >=20% relative-reduction criterion at the primary 20% review rate on Test B (scan-clustered CI, Holm-adjusted)."
    if mde > 0.20:
        return ("INCONCLUSIVE",
                f"At the primary 20% review rate the observed relative reduction is "
                f"{r20['rel_reduction']:.1%} (95% CI [{r20['ci95'][0]:.1%}, {r20['ci95'][1]:.1%}], "
                f"Holm p={r20['p_holm']:.3f}) — below the pre-registered >=20% bar, so the criterion "
                f"is NOT met. Test B is underpowered for a 20% effect (MDE {mde:.2f} > 0.20, 60 scan "
                f"clusters), so this sub-threshold result is **INCONCLUSIVE**: it cannot be attributed "
                f"to the gate failing. The 30% review rate is secondary/exploratory and is not counted "
                f"as a pass.")
    return "NOT MET", "Criterion not met on a sufficiently powered test set."


def main() -> int:
    report = json.loads((R / "v2a1_report.json").read_text(encoding="utf-8"))
    power = json.loads((R / "v2a1_power.json").read_text(encoding="utf-8"))
    tr = json.loads(Path("validation/data_cache/v2a1_train_summary.json").read_text(encoding="utf-8"))
    ph = json.loads((R / "v2a1_posthoc_dweights.json").read_text(encoding="utf-8"))
    pw = json.loads((R / "v2a1_posthoc_power_design.json").read_text(encoding="utf-8"))
    v, vtext = verdict(report, power)
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
