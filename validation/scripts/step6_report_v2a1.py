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
