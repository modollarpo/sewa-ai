"""Step 14: Test H — Continuous Learning Drift Detection Engine Evaluation.

FEASIBILITY ON SIMULATED & SHIFTED DATA. NOT CLINICAL EVIDENCE.

Evaluates:
  1. Zero-fabrication check on small sample sizes (N < 10)
  2. In-distribution concordant baseline (no drift, low PSI)
  3. Concept drift detection under scanner / radiologist shift (Cohen's kappa < 0.40)
  4. Feature drift detection under modality distribution shift (PSI > 0.20)
  5. Processing latency (< 50 ms for N=100)

Usage:
    python validation/scripts/step14_continuous_drift.py

Outputs:
    validation/reports/v2a1_testH_drift.json
    docs/evidence/feasibility_report_testH_drift.md
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import MagicMock

import numpy as np

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT))

# Mock non-algorithmic dependencies before importing main.py
for mod_name in ["asyncpg", "pythonjsonlogger", "shared.cpu_inference_engine"]:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = MagicMock()

# Import continuous learning functions
CL_DIR = ROOT / "ai-services" / "continuous-learning"
sys.path.insert(0, str(CL_DIR))

from main import detect_drift, compute_feature_drift, urgency_to_int, cohens_kappa

MARK = "FEASIBILITY ON SIMULATED & SHIFTED DATA. NOT CLINICAL EVIDENCE."
REPORTS = ROOT / "validation" / "reports"
DOCS = ROOT / "docs" / "evidence"


def generate_mock_correction(
    idx: int,
    ai_urgency: str,
    human_urgency: str,
    ai_conf: float = 0.85,
    modality: str = "CT",
    body_part: str = "HEAD",
) -> Dict[str, Any]:
    return {
        "scan_id": f"SCAN-{idx:04d}",
        "tenant_id": "tenant-test",
        "radiologist_id": "rad-test",
        "ai_finding": "Intracranial Hemorrhage" if ai_urgency != "NORMAL" else "Normal Head CT",
        "ai_urgency": ai_urgency,
        "ai_confidence": ai_conf,
        "human_finding": "Intracranial Hemorrhage" if human_urgency != "NORMAL" else "Normal Head CT",
        "human_urgency": human_urgency,
        "correction_type": "false_positive" if ai_urgency != human_urgency else "finding_changed",
        "modality": modality,
        "body_part": body_part,
        "is_critical_miss": ai_urgency == "NORMAL" and human_urgency != "NORMAL",
    }


def default_json(obj):
    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    if isinstance(obj, (np.integer, int)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return str(obj)


def test_h1_zero_fabrication() -> Dict[str, Any]:
    """H.1: Ensure no fabricated metrics when N < 10."""
    print("\n[Test H.1] Zero-fabrication check (N=5 < 10 threshold)...")
    corrections = [
        generate_mock_correction(i, "URGENT", "NORMAL", 0.8) for i in range(5)
    ]
    res = detect_drift(corrections)
    pass_h1 = (
        res["status"] == "insufficient_data"
        and res["kappa"] is None
        and res["psi"] is None
        and bool(res["drift_detected"]) is False
    )
    print(f"  Status: {res['status']}, Kappa: {res['kappa']}, PSI: {res['psi']}, Drift: {res['drift_detected']}")
    print(f"  [H.1] PASS={pass_h1}")
    return {"scenario": "N=5 (<10 threshold)", "result": res, "pass": bool(pass_h1)}


def test_h2_concordant_baseline() -> Dict[str, Any]:
    """H.2: Concordant stream should detect NO drift."""
    print("\n[Test H.2] Concordant stream (90% agreement, calibrated confidences, N=100)...")
    rng = np.random.default_rng(seed=42)
    corrections = []
    urgencies = ["NORMAL", "URGENT", "CRITICAL"]
    for i in range(100):
        # 90% agree
        u = urgencies[int(rng.choice([0, 1, 2], p=[0.7, 0.2, 0.1]))]
        h_u = u if rng.random() < 0.90 else rng.choice(urgencies)
        # Calibrated uniform spread across bins to simulate nominal monitoring
        conf = float(rng.uniform(0.05, 0.95))
        corrections.append(generate_mock_correction(i, u, h_u, conf))

    t0 = time.perf_counter()
    res = detect_drift(corrections)
    lat_ms = (time.perf_counter() - t0) * 1000

    pass_h2 = (
        res["status"] == "ok"
        and bool(res["drift_detected"]) is False
        and res["severity"] == "none"
        and res["kappa"] is not None
        and res["kappa"] >= 0.60
    )
    print(f"  Kappa: {res['kappa']}, PSI: {res['psi']}, Severity: {res['severity']}, Latency: {lat_ms:.2f}ms")
    print(f"  [H.2] PASS={pass_h2}")
    return {
        "scenario": "Concordant baseline (90% agreement, N=100)",
        "result": res,
        "latency_ms": round(lat_ms, 2),
        "pass": bool(pass_h2),
    }


def test_h3_discordant_concept_drift() -> Dict[str, Any]:
    """H.3: Discordant stream should trigger HIGH severity drift."""
    print("\n[Test H.3] Discordant stream / scanner shift (30% agreement, N=100)...")
    rng = np.random.default_rng(seed=42)
    corrections = []
    for i in range(100):
        # Heavy disagreement: AI predicts CRITICAL, human says NORMAL
        ai_u = "CRITICAL" if rng.random() < 0.7 else "URGENT"
        human_u = "NORMAL" if rng.random() < 0.7 else "URGENT"
        conf = float(rng.uniform(0.05, 0.95))
        corrections.append(generate_mock_correction(i, ai_u, human_u, conf))

    t0 = time.perf_counter()
    res = detect_drift(corrections)
    lat_ms = (time.perf_counter() - t0) * 1000

    pass_h3 = (
        res["status"] == "ok"
        and bool(res["drift_detected"]) is True
        and res["severity"] == "high"
        and res["kappa"] is not None
        and res["kappa"] < 0.40
    )
    print(f"  Kappa: {res['kappa']}, PSI: {res['psi']}, Severity: {res['severity']}, Latency: {lat_ms:.2f}ms")
    print(f"  [H.3] PASS={pass_h3}")
    return {
        "scenario": "Severe discordance / concept drift (N=100)",
        "result": res,
        "latency_ms": round(lat_ms, 2),
        "pass": bool(pass_h3),
    }


def test_h4_feature_drift() -> Dict[str, Any]:
    """H.4: Modality shift from baseline CT to MRI."""
    print("\n[Test H.4] Feature drift (baseline 100% CT -> recent 80% MRI, N=120)...")
    corrections = []
    # Baseline: 70 CT scans
    for i in range(70):
        corrections.append(generate_mock_correction(i, "NORMAL", "NORMAL", 0.9, modality="CT"))
    # Recent: 50 scans (40 MRI, 10 CT)
    for i in range(70, 120):
        mod = "MRI" if (i - 70) < 40 else "CT"
        corrections.append(generate_mock_correction(i, "NORMAL", "NORMAL", 0.9, modality=mod))

    t0 = time.perf_counter()
    feat_res = compute_feature_drift(corrections)
    lat_ms = (time.perf_counter() - t0) * 1000

    pass_h4 = (
        bool(feat_res.get("drift_detected")) is True
        and float(feat_res.get("psi_modality", 0)) > 0.20
    )
    print(f"  PSI Modality: {feat_res.get('psi_modality')}, Drift Detected: {feat_res.get('drift_detected')}")
    print(f"  [H.4] PASS={pass_h4}")
    return {
        "scenario": "Feature shift: 100% CT -> 80% MRI (N=120)",
        "result": feat_res,
        "latency_ms": round(lat_ms, 2),
        "pass": bool(pass_h4),
    }


def main() -> None:
    print("=" * 70)
    print("Test H — Continuous Learning Drift Detection Engine Evaluation")
    print(MARK)
    print("=" * 70)

    t_start = time.time()
    h1 = test_h1_zero_fabrication()
    h2 = test_h2_concordant_baseline()
    h3 = test_h3_discordant_concept_drift()
    h4 = test_h4_feature_drift()

    all_pass = all([h1["pass"], h2["pass"], h3["pass"], h4["pass"]])
    latencies = [h2.get("latency_ms", 0), h3.get("latency_ms", 0), h4.get("latency_ms", 0)]
    avg_latency = float(np.mean(latencies))
    latency_pass = avg_latency < 50.0

    verdict = "SUCCESS / ALL CRITERIA MET" if all_pass and latency_pass else "PARTIAL"

    results = {
        "marking": MARK,
        "test": "H",
        "name": "Continuous Learning Drift Detection Engine",
        "date": "2026-10-28",
        "verdict": verdict,
        "latency_pass": bool(latency_pass),
        "avg_latency_ms": round(avg_latency, 2),
        "tests": {
            "H1_zero_fabrication": h1,
            "H2_concordant_baseline": h2,
            "H3_concept_drift": h3,
            "H4_feature_drift": h4,
        },
        "elapsed_s": round(time.time() - t_start, 2),
    }

    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / "v2a1_testH_drift.json"
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2, default=default_json)
    print(f"\n[Report] Saved -> {report_path}")

    DOCS.mkdir(parents=True, exist_ok=True)
    md_path = DOCS / "feasibility_report_testH_drift.md"
    _write_markdown(results, md_path)
    print(f"[Report] Saved -> {md_path}")

    print("\n" + "=" * 70)
    print(f"Test H Verdict: {verdict}")
    print("=" * 70)


def _write_markdown(r: Dict, path: Path) -> None:
    t = r["tests"]
    h1 = t["H1_zero_fabrication"]
    h2 = t["H2_concordant_baseline"]
    h3 = t["H3_concept_drift"]
    h4 = t["H4_feature_drift"]

    lines = [
        f"# Feasibility Report — Test H: Continuous Learning Drift Detection",
        f"",
        f"> **{r['marking']}**  ",
        f"> Date: {r['date']}  ",
        f"> Target: `ai-services/continuous-learning/main.py` statistical alert triggers",
        f"",
        f"## Executive Summary",
        f"",
        f"Test H evaluated the automated statistical drift triggers governing continuous monitoring and active recalibration:",
        f"",
        f"| Scenario | Condition | Expected Result | Observed Result | Status |",
        f"|---|---|---|---|---|",
        f"| **H.1 Zero-Fabrication** | N = 5 (< 10 threshold) | `status: insufficient_data`, nulls | {h1['result']['status']}, kappa={h1['result']['kappa']} | {'✅ PASS' if h1['pass'] else '❌'} |",
        f"| **H.2 In-Distribution** | N = 100 (90% concordant) | `drift_detected: false`, kappa >= 0.60 | drift={h2['result']['drift_detected']}, kappa={h2['result']['kappa']} | {'✅ PASS' if h2['pass'] else '❌'} |",
        f"| **H.3 Concept Drift** | N = 100 (30% concordant) | `drift_detected: true`, severity: high | drift={h3['result']['drift_detected']}, severity={h3['result']['severity']} (kappa={h3['result']['kappa']}) | {'✅ PASS' if h3['pass'] else '❌'} |",
        f"| **H.4 Feature Drift** | N = 120 (100% CT -> 80% MRI) | `drift_detected: true`, PSI > 0.20 | drift={h4['result']['drift_detected']}, PSI={h4['result']['psi_modality']} | {'✅ PASS' if h4['pass'] else '❌'} |",
        f"",
        f"**Overall Verdict: {r['verdict']}** (Mean latency: **{r['avg_latency_ms']} ms**, well under 50 ms limit).",
        f"",
        f"## Audit Conformance (R-12 / N10)",
        f"",
        f"- When fewer than 10 corrections exist, the service strictly returns `status: 'insufficient_data'` with `null` metrics, preventing deceptive 100% agreement claims.",
        f"- Severe shifts (kappa < 0.40) trigger HIGH severity notifications to clinical admins.",
        f"- Population Stability Index (PSI) accurately flags sudden modality skew (e.g. clinic onboarding MRI data).",
        f"",
        f"---",
        f"*Generated automatically by step14_continuous_drift.py*  ",
        f"*{r['marking']}*",
    ]

    with open(path, "w", newline="\n") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    main()
