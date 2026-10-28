"""Step 10 (Test D): External Evaluation of Metacognition Contradiction Detection on OpenI.

Licence: OpenI (Indiana University) metadata and captions are Public Domain / NLM.
FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Parent pre-registration: docs/evidence/preregistration_testD_openi.md (frozen in commit 5f9d873).

Evaluates:
  1. Contradiction Recall on negated clinical findings (Pneumothorax, Pleural Effusion)
  2. Specificity on affirmed clinical findings
  3. Full Metacognition pipeline alert-suppression behaviour and latency
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
import numpy as np
import pandas as pd

# Add metacognition service path
sys.path.insert(0, str(Path("ai-services/metacognition").resolve()))
from main import MetacognitionEvaluator, MetacognitionRequest  # noqa: E402

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
DATA_PATH = Path("validation/data_subsets/cleaned_dataset.csv")
REPORT_PATH = Path("validation/reports/v2a1_testD_openi.json")

SEED = 42
N_BOOTSTRAP = 1000


def bootstrap_ci(arr: np.ndarray, n_boot: int = N_BOOTSTRAP, seed: int = SEED) -> tuple[float, float, float]:
    """Return (mean, ci_lower, ci_upper) from bootstrap resamples."""
    rng = np.random.default_rng(seed)
    arr = np.asarray(arr, dtype=float)
    if len(arr) == 0:
        return float("nan"), float("nan"), float("nan")
    point = float(np.mean(arr))
    boot_means = [float(np.mean(rng.choice(arr, size=len(arr), replace=True))) for _ in range(n_boot)]
    lo, hi = float(np.percentile(boot_means, 2.5)), float(np.percentile(boot_means, 97.5))
    return point, lo, hi


def parse_ground_truth(caption: str, finding: str) -> str | None:
    """Classify caption as 'negated', 'affirmed', or None for the given finding."""
    t = caption.lower()
    
    if finding == "Pneumothorax":
        if "pneumothorax" not in t and "pneumothoraces" not in t and "ptx" not in t:
            return None
        # Check resolved
        if "resolved" in t or "resolution" in t:
            return "negated"
        # Check negation
        neg_patterns = [
            r"no\s+.*?pneumothorax",
            r"no\s+pneumothoraces",
            r"without\s+.*?pneumothorax",
            r"negative\s+for\s+.*?pneumothorax",
            r"free\s+of\s+.*?pneumothorax",
            r"pneumothorax\s+is\s+not\s+(?:seen|identified|present|detected)",
            r"clear\s+bilaterally",
        ]
        if any(re.search(p, t) for p in neg_patterns):
            return "negated"
        # Affirmation check (must not be preceded by negation cues in the same clause)
        pos_patterns = [
            r"(?:acute|small|large|tension|apical|left|right|bilateral)\s+pneumothorax",
            r"evidence\s+of\s+pneumothorax",
            r"pneumothorax\s+is\s+(?:seen|present|noted|identified)",
        ]
        if any(re.search(p, t) for p in pos_patterns):
            # double check it wasn't inside a 'without' or 'no' context
            clauses = [c for c in re.split(r'[.;\n]+', t) if "pneumothorax" in c]
            if any(("no" in c or "without" in c or "free" in c or "not" in c) for c in clauses):
                return "negated"
            return "affirmed"
        return None

    if finding == "Pleural Effusion":
        if "effusion" not in t and "costophrenic" not in t:
            return None
        if "resolved" in t or "resolution" in t:
            return "negated"
        neg_patterns = [
            r"no\s+.*?effusion",
            r"no\s+effusions",
            r"without\s+.*?effusion",
            r"negative\s+for\s+.*?effusion",
            r"free\s+of\s+.*?effusion",
            r"effusion\s+is\s+not\s+(?:seen|identified|present|detected)",
            r"costophrenic\s+angles\s+are\s+(?:sharp|clear|normal)",
        ]
        if any(re.search(p, t) for p in neg_patterns):
            return "negated"
        pos_patterns = [
            r"(?:small|moderate|large|left|right|bilateral|trace|subtle)\s+(?:pleural\s+)?effusion",
            r"evidence\s+of\s+(?:pleural\s+)?effusion",
            r"effusion\s+is\s+(?:seen|present|noted|identified|visualized)",
            r"blunting\s+of\s+(?:the\s+)?(?:costophrenic|cp)\s+angle",
        ]
        if any(re.search(p, t) for p in pos_patterns):
            clauses = [c for c in re.split(r'[.;\n]+', t) if "effusion" in c or "costophrenic" in c]
            if any(("no" in c or "without" in c or "free" in c or "not" in c) for c in clauses):
                return "negated"
            return "affirmed"
        return None

    if finding == "Cardiomegaly":
        if "cardiomegaly" not in t and "heart size" not in t and "cardiac size" not in t and "cardiac silhouette" not in t:
            return None
        neg_patterns = [
            r"no\s+cardiomegaly",
            r"heart\s+size\s+(?:is\s+)?normal",
            r"cardiac\s+size\s+(?:is\s+)?normal",
            r"heart\s+size\s+within\s+normal\s+limits",
            r"cardiac\s+size\s+within\s+normal\s+limits",
            r"normal\s+cardiac\s+size",
            r"normal\s+heart\s+size",
            r"heart\s+is\s+normal\s+in\s+size",
            r"cardiac\s+silhouette\s+is\s+unremarkable",
            r"cardiomediastinal\s+silhouette\s+is\s+unremarkable",
            r"cardiomediastinal\s+contours\s+are\s+within\s+normal\s+limits",
        ]
        if any(re.search(p, t) for p in neg_patterns):
            return "negated"
        pos_patterns = [
            r"(?:mild|moderate|severe|borderline)?\s*cardiomegaly",
            r"enlarged\s+heart",
            r"enlarged\s+cardiac\s+silhouette",
            r"cardiomegaly\s+is\s+(?:seen|present|noted)",
            r"heart\s+is\s+enlarged",
        ]
        if any(re.search(p, t) for p in pos_patterns):
            clauses = [c for c in re.split(r'[.;\n]+', t) if "cardiomegaly" in c or "heart" in c or "cardiac" in c]
            if any(("no" in c or "without" in c or "not" in c or "normal" in c) for c in clauses):
                return "negated"
            return "affirmed"
        return None

    return None

def run_evaluation():
    print(f"[{time.strftime('%X')}] Loading OpenI dataset from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    print(f"[{time.strftime('%X')}] Total records: {len(df)}")

    evaluator = MetacognitionEvaluator()
    findings = ["Pneumothorax", "Pleural Effusion", "Cardiomegaly"]

    results = {
        "marking": MARK,
        "evaluation": "Test D — OpenI External Validation of Metacognition Contradiction Detection",
        "date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "dataset": {
            "source": "OpenI Indiana University Chest X-rays",
            "n_total_reports": len(df),
            "licence": "Public Domain / NLM terms",
        },
        "findings": {},
        "pipeline_simulation": {},
    }

    # Evaluate each finding
    all_neg_correct = []
    all_pos_correct = []

    for f in findings:
        print(f"\n--- Evaluating Finding: {f} ---")
        neg_reports = []
        pos_reports = []

        for idx, row in df.iterrows():
            cap = str(row["org_caption"])
            status = parse_ground_truth(cap, f)
            if status == "negated":
                neg_reports.append(cap)
            elif status == "affirmed":
                pos_reports.append(cap)

        print(f"  Negated cases: {len(neg_reports)} | Affirmed cases: {len(pos_reports)}")

        # 1. Contradiction Recall on Negated cases
        neg_detections = []
        t0 = time.time()
        for cap in neg_reports:
            det = evaluator._detect_report_contradiction(cap, f)
            neg_detections.append(1 if det is not None else 0)
        t_neg = time.time() - t0

        recall, rec_lo, rec_hi = bootstrap_ci(np.array(neg_detections))
        all_neg_correct.extend(neg_detections)

        # 2. Specificity on Affirmed cases
        pos_detections = []
        t0 = time.time()
        for cap in pos_reports:
            det = evaluator._detect_report_contradiction(cap, f)
            # Correct if NO contradiction flagged (passed through)
            pos_detections.append(1 if det is None else 0)
        t_pos = time.time() - t0

        spec, spec_lo, spec_hi = bootstrap_ci(np.array(pos_detections))
        all_pos_correct.extend(pos_detections)

        print(f"  Contradiction Recall: {recall*100:.2f}% (95% CI: [{rec_lo*100:.2f}%, {rec_hi*100:.2f}%])")
        print(f"  Affirmation Specificity: {spec*100:.2f}% (95% CI: [{spec_lo*100:.2f}%, {spec_hi*100:.2f}%])")

        results["findings"][f] = {
            "n_negated": len(neg_reports),
            "n_affirmed": len(pos_reports),
            "contradiction_recall": {
                "point": round(recall, 4),
                "ci_lower": round(rec_lo, 4),
                "ci_upper": round(rec_hi, 4),
            },
            "specificity": {
                "point": round(spec, 4),
                "ci_lower": round(spec_lo, 4),
                "ci_upper": round(spec_hi, 4),
            },
            "eval_duration_sec": round(t_neg + t_pos, 3),
        }

    # Aggregate primary outcomes
    agg_rec, agg_rec_lo, agg_rec_hi = bootstrap_ci(np.array(all_neg_correct))
    agg_spec, agg_spec_lo, agg_spec_hi = bootstrap_ci(np.array(all_pos_correct))

    results["primary_outcomes"] = {
        "aggregate_contradiction_recall": {
            "point": round(agg_rec, 4),
            "ci_lower": round(agg_rec_lo, 4),
            "ci_upper": round(agg_rec_hi, 4),
            "target": 0.85,
            "met": bool(agg_rec >= 0.85),
        },
        "aggregate_specificity": {
            "point": round(agg_spec, 4),
            "ci_lower": round(agg_spec_lo, 4),
            "ci_upper": round(agg_spec_hi, 4),
            "target": 0.85,
            "met": bool(agg_spec >= 0.85),
        },
    }

    # Pipeline Simulation: test full MetacognitionEvaluator on 500 cases
    print("\n--- Running Full Metacognition Pipeline Simulation (N=500) ---")
    pipe_samples = df.sample(n=min(500, len(df)), random_state=SEED)
    latencies = []
    contradictions_blocked = 0
    safe_to_alert_false = 0

    for idx, row in pipe_samples.iterrows():
        cap = str(row["org_caption"])
        # Simulate AI asserting Pneumothorax with high confidence
        req = MetacognitionRequest(
            scan_id=f"OPENI-SIM-{idx:04d}",
            primary_finding="Pneumothorax",
            urgency="CRITICAL",
            confidence=0.88,
            uncertainty_score=0.12,
            modality="XR",
            body_part="Chest",
            report_text=cap,
        )
        t_start = time.time()
        resp = evaluator.evaluate(req)
        latencies.append((time.time() - t_start) * 1000.0)

        has_contradiction = any(f.code == "REPORT_CONTRADICTION" for f in resp.flags)
        if has_contradiction:
            contradictions_blocked += 1
            if not resp.safe_to_alert:
                safe_to_alert_false += 1

    mean_lat, lat_lo, lat_hi = bootstrap_ci(np.array(latencies))
    print(f"  Mean latency: {mean_lat:.2f} ms per report (target: < 50ms)")
    print(f"  Contradictions flagged in random sample: {contradictions_blocked}/500")
    print(f"  Unsafe alerts suppressed: {safe_to_alert_false}/{contradictions_blocked}")

    results["pipeline_simulation"] = {
        "n_simulated": len(pipe_samples),
        "mean_latency_ms": round(mean_lat, 2),
        "latency_ci": [round(lat_lo, 2), round(lat_hi, 2)],
        "contradictions_flagged": contradictions_blocked,
        "alerts_properly_blocked": safe_to_alert_false,
        "alert_block_rate_on_contradiction": (
            safe_to_alert_false / contradictions_blocked if contradictions_blocked > 0 else 1.0
        ),
    }

    # Pre-registered success evaluation
    rec_pass = results["primary_outcomes"]["aggregate_contradiction_recall"]["met"]
    spec_pass = results["primary_outcomes"]["aggregate_specificity"]["met"]
    verdict = "SUCCESS" if (rec_pass and spec_pass) else "PARTIAL / NOT MET"
    results["verdict"] = verdict

    print(f"\n==========================================")
    print(f"VERDICT: {verdict}")
    print(f"Aggregate Contradiction Recall: {agg_rec*100:.2f}% (Target: >=85%) -> {'PASS' if rec_pass else 'FAIL'}")
    print(f"Aggregate Specificity: {agg_spec*100:.2f}% (Target: >=85%) -> {'PASS' if spec_pass else 'FAIL'}")
    print(f"==========================================")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved report to {REPORT_PATH}")


if __name__ == "__main__":
    run_evaluation()
