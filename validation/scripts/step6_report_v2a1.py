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
        return "SUCCESS", "D3 met the >=20% relative-reduction criterion on Test B (Holm-adjusted)."
    if mde > 0.20:
        return ("INCONCLUSIVE",
                f"Test B is underpowered (MDE {mde:.2f} > 0.20); criterion NOT met and cannot "
                "be attributed to the gate failing.")
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
        "clinical dataset**. All numbers are feasibility estimates on synthetic/demo-style public data.",
        "- Grouping: `StudyInstanceUID`. Test A = fresh held-out scans; Test B = the same scans with "
        "9 test-time corruptions; Test C (CQ500) is HELD.",
        "",
        "## Model & training (frozen amendment)",
        f"- EfficientNet-B0; frozen early blocks (cached 160px), last-6 blocks + dropout head trained. "
        f"val study-level AUROC **{fmt(tr['val_study_auc'])}** (epoch {tr['best_epoch']}), "
        f"temperature **{fmt(tr['temperature'])}**.",
        f"- Per-slice labels from the authoritative RSNA `stage_2_train.csv` (amendment 2); study score = "
        f"mean of the top-3 slice probabilities; n = val {report['n']['val']}, "
        f"Test A {report['n']['testA']}, Test B instances {report['n']['testB_instances']}.",
        "",
        "## Power (pre-registered 5b, computed before the formal run)",
        "| review rate | MDE (80% power, rel.) | underpowered vs 20% |",
        "|---|---|---|",
    ]
    for rr, e in power["by_review_rate"].items():
        L.append(f"| {rr} | {fmt(e['mde_80pct_power'])} | {e['underpowered_vs_20pct']} |")
    L += ["", f"_{power['note']}_", "",
          "## Test A (clean held-out scans)",
          "| arm | error AUROC | AURC | n |", "|---|---|---|---|"]
    L += arm_rows(report["testA"]["arms"])
    L += ["", "## Test B (pooled 9 corruptions)",
          "| arm | error AUROC | AURC | n |", "|---|---|---|---|"]
    L += arm_rows(report["testB_pooled"]["arms"])
    L += ["", "## Primary comparison — D3 vs the better baseline (Test B)",
          f"**Baseline:** {pr['baseline']}  **instances with D3:** {pr['n_instances_with_D3']}",
          "", "| review rate | rel. reduction | 95% CI | p (Holm) | passes success |",
          "|---|---|---|---|---|"]
    for rr, e in pr["by_review_rate"].items():
        L.append(f"| {rr} | {fmt(e['rel_reduction'])} | "
                 f"[{fmt(e['ci95'][0])}, {fmt(e['ci95'][1])}] | {fmt(e['p_holm'])} | "
                 f"{e['passes_success_criterion']} |")
    sa = report["secondary_testA_D3_vs_better"]
    L += ["", "## Secondary comparison (Test A, clean)",
          f"**Baseline:** {sa['baseline']}  **instances with D3:** {sa['n_instances_with_D3']}",
          "", "| review rate | rel. reduction | 95% CI | passes |", "|---|---|---|---|"]
    for rr, e in sa["by_review_rate"].items():
        L.append(f"| {rr} | {fmt(e['rel_reduction'])} | "
                 f"[{fmt(e['ci95'][0])}, {fmt(e['ci95'][1])}] | "
                 f"{e['passes_20pct_ci_excl_zero']} |")
    L += ["", f"## Verdict: **{v}**", "", vtext, "",
          "## Limitations",
          "- RSNA public data only; CQ500 (Test C) held and not evaluated.",
          "- C3 (Grad-CAM coherence) is a **partial proxy** on a fixed subset of scans.",
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
