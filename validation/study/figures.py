"""Generate report figures as SVG (no matplotlib dependency).

Reads validation/reports/study_curves_<tag>.npz (written by run_study.py) and
validation/reports/study_report_<tag>.json.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

REPORTS = Path("validation/reports")
W, H, PAD = 640, 440, 56
COLORS = {"B1_maxsoftmax": "#888", "B2_entropy": "#555", "C1_uncertainty": "#1f77b4",
          "C2_ood": "#2ca02c", "C4_conflict": "#9467bd", "D_composite_H": "#d62728"}


def _axes(title, xlab, ylab):
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="sans-serif">',
        f'<rect width="{W}" height="{H}" fill="white"/>',
        f'<text x="{W/2}" y="24" text-anchor="middle" font-size="15">{title}</text>',
        f'<line x1="{PAD}" y1="{H-PAD}" x2="{W-24}" y2="{H-PAD}" stroke="black"/>',
        f'<line x1="{PAD}" y1="40" x2="{PAD}" y2="{H-PAD}" stroke="black"/>',
        f'<text x="{(PAD+W-24)/2}" y="{H-18}" text-anchor="middle" font-size="12">{xlab}</text>',
        f'<text x="16" y="{(40+H-PAD)/2}" text-anchor="middle" font-size="12" transform="rotate(-90 16 {(40+H-PAD)/2})">{ylab}</text>',
    ]


def risk_coverage_svg(tag):
    d = np.load(REPORTS / f"study_curves_{tag}.npz")
    err = d["err_te"].astype(bool)
    n = len(err)
    lines = _axes("Risk-coverage (RSNA dev test)",
                  "coverage (fraction accepted)", "error rate among accepted")
    arms = [k[len("risk__"):] for k in d.files if k.startswith("risk__")]
    for arm in sorted(arms):
        r = d[f"risk__{arm}"]
        order = np.argsort(r)  # accept lowest-risk first
        cov, risk = [], []
        for k in range(1, n + 1):
            idx = order[:k]
            cov.append(k / n)
            risk.append(err[idx].mean())
        pts = " ".join(f"{PAD + c*(W-24-PAD):.1f},{H-PAD - v*(H-PAD-40):.1f}"
                       for c, v in zip(cov, risk))
        col = COLORS.get(arm, "#000")
        lines.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2"/>')
    y = 54
    for arm in sorted(arms):
        lines.append(f'<rect x="{W-150}" y="{y-9}" width="12" height="12" fill="{COLORS.get(arm,"#000")}"/>')
        lines.append(f'<text x="{W-132}" y="{y}" font-size="11">{arm}</text>')
        y += 16
    lines.append("</svg>")
    out = REPORTS / f"fig_risk_coverage_{tag}.svg"
    out.write_text("\n".join(lines))
    return out


def auroc_svg(tag):
    rep = json.loads((REPORTS / f"study_report_{tag}.json").read_text())
    arms = {k: v["error_auroc"] for k, v in rep["arms"].items()}
    lines = _axes("Error-detection AUROC (higher = better)", "", "")
    bw = (W - 24 - PAD) / (len(arms) + 1)
    for i, (arm, v) in enumerate(sorted(arms.items())):
        x = PAD + (i + 0.5) * bw
        h = v * (H - PAD - 40)
        lines.append(f'<rect x="{x-bw/3:.1f}" y="{H-PAD-h:.1f}" width="{2*bw/3:.1f}" height="{h:.1f}" fill="{COLORS.get(arm,"#333")}"/>')
        lines.append(f'<text x="{x:.1f}" y="{H-PAD-h-6:.1f}" text-anchor="middle" font-size="10">{v:.3f}</text>')
        lbl = arm.split("_")[0]
        lines.append(f'<text x="{x:.1f}" y="{H-PAD+14:.1f}" text-anchor="middle" font-size="10">{lbl}</text>')
    lines.append(f'<line x1="{PAD}" y1="{H-PAD - 0.5*(H-PAD-40):.1f}" x2="{W-24}" y2="{H-PAD - 0.5*(H-PAD-40):.1f}" stroke="red" stroke-dasharray="4" stroke-width="1"/>')
    lines.append("</svg>")
    out = REPORTS / f"fig_error_auroc_{tag}.svg"
    out.write_text("\n".join(lines))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", default="full")
    args = ap.parse_args()
    print(risk_coverage_svg(args.tag))
    print(auroc_svg(args.tag))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
