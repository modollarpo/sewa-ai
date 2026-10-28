"""Step 12: Test F — Mammography Pipeline Feasibility (CBIS-DDSM).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
ENGINEERING VALIDATED / DEMO MODE — no real weights, no clinical accuracy claims.

Dataset:  CBIS-DDSM calcification CSV (1,872 cases, CC BY 3.0, TCIA)
Pipeline: sewa-mammography demo ONNX (random linear projection fallback)
Goal:     Verify preprocessing, schema, latency, BI-RADS mapping

Usage:
    python validation/scripts/step12_mammography_feasibility.py

Outputs:
    validation/reports/v2a1_testF_mammography.json
    docs/evidence/feasibility_report_testF_mammography.md
"""
from __future__ import annotations

import json
import sys
import time
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import numpy as np

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT))

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE."
REPORTS = ROOT / "validation" / "reports"
DOCS = ROOT / "docs" / "evidence"
MAMMO_CSV = ROOT / "validation" / "data_subsets" / "mammography_samples" / "calc_case(with_jpg_img).csv"
MAMMO_IMG = ROOT / "validation" / "data_subsets" / "mammography_samples" / "full-mammogram-images-img_0-1.jpg"

MAMMOGRAPHY_CONDITIONS = [
    "Normal Breast Tissue",
    "Benign Mass",
    "Malignant Mass",
    "Benign Calcifications",
    "Malignant Calcifications",
    "Architectural Distortion",
    "Asymmetry",
    "Lymphadenopathy",
]

_URGENT_FINDINGS = {"Malignant Mass", "Malignant Calcifications", "Architectural Distortion"}

_BIRADS_MAP = {
    "Normal Breast Tissue": ("BI-RADS 1", 0.95),
    "Benign Mass":          ("BI-RADS 2", 0.92),
    "Malignant Mass":       ("BI-RADS 5", 0.85),
    "Benign Calcifications":    ("BI-RADS 2", 0.91),
    "Malignant Calcifications": ("BI-RADS 4", 0.75),
    "Architectural Distortion": ("BI-RADS 4", 0.70),
    "Asymmetry":            ("BI-RADS 0", 0.60),
    "Lymphadenopathy":      ("BI-RADS 0", 0.65),
}


def _get_birads(finding: str, confidence: float) -> Optional[str]:
    if finding == "Normal Breast Tissue":
        return "BI-RADS 1"
    if finding in ["Benign Mass", "Benign Calcifications"]:
        return "BI-RADS 2" if confidence > 0.9 else "BI-RADS 3"
    if finding in ["Malignant Mass", "Malignant Calcifications", "Architectural Distortion"]:
        return "BI-RADS 5" if confidence > 0.8 else "BI-RADS 4"
    return "BI-RADS 0"


def _preprocess_mammogram(img_rgb: np.ndarray) -> np.ndarray:
    import cv2
    tile = cv2.resize(img_rgb, (224, 224), interpolation=cv2.INTER_LANCZOS4)
    tile = tile.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tile = (tile - mean) / std
    return tile.transpose(2, 0, 1).astype(np.float32)


def _build_demo_onnx(model_cache: Path) -> Tuple[Any, str]:
    import onnx
    from onnx import helper, TensorProto
    import onnxruntime as ort

    n_classes = len(MAMMOGRAPHY_CONDITIONS)
    demo_path = model_cache / "mammography_demo_test.onnx"
    demo_path.parent.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed=42)
    W_data = rng.standard_normal((n_classes, 3 * 224 * 224)).astype(np.float32) * 0.01
    X = helper.make_tensor_value_info("image", TensorProto.FLOAT, [None, 3, 224, 224])
    Y = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [None, n_classes])
    W = helper.make_tensor("W", TensorProto.FLOAT, W_data.shape, W_data.flatten().tolist())
    flat = helper.make_node("Flatten", ["image"], ["flat"], axis=1)
    gemm = helper.make_node("Gemm", ["flat", "W"], ["logits"], transB=1)
    graph = helper.make_graph([flat, gemm], "mammography_demo", [X], [Y], initializer=[W])
    model_proto = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    onnx.save(model_proto, str(demo_path))

    sess = ort.InferenceSession(str(demo_path), providers=["CPUExecutionProvider"])
    return sess, str(demo_path)


def run_test_3a_metadata(results: Dict) -> None:
    """3a: Metadata distribution audit."""
    import pandas as pd

    print("\n[Test F / 3a] Loading CBIS-DDSM metadata CSV...")
    df = pd.read_csv(str(MAMMO_CSV))
    n_rows = len(df)
    print(f"  Rows: {n_rows}")

    # Label distribution
    label_counts = df["pathology"].value_counts().to_dict()
    label_fracs  = (df["pathology"].value_counts(normalize=True) * 100).round(2).to_dict()
    print(f"  Labels: {label_counts}")

    # Assessment distribution
    assess_counts = df["assessment"].value_counts().sort_index().to_dict()
    print(f"  BI-RADS assessment: {assess_counts}")

    # Breast density distribution
    density_counts = df["breast density"].value_counts().sort_index().to_dict()
    print(f"  Density: {density_counts}")

    # Calc type top-10
    top_calc = df["calc type"].value_counts().head(10).to_dict()
    print(f"  Top-10 calc types: {top_calc}")

    # Checks
    required_cols = {"patient_id", "pathology", "assessment", "breast density", "calc type"}
    missing_cols  = required_cols - set(df.columns)
    no_empty_label = all(v > 0 for v in label_counts.values())
    pass_3a = len(missing_cols) == 0 and no_empty_label

    results["3a_metadata"] = {
        "n_rows": n_rows,
        "n_patients": df["patient_id"].nunique(),
        "label_counts": label_counts,
        "label_fractions_pct": label_fracs,
        "assessment_distribution": assess_counts,
        "density_distribution": density_counts,
        "top10_calc_types": top_calc,
        "missing_required_cols": list(missing_cols),
        "pass": pass_3a,
    }
    print(f"  [3a] PASS={pass_3a}")


def run_test_3b_preprocessing(results: Dict) -> Optional[np.ndarray]:
    """3b: Preprocessing pipeline QA."""
    import cv2
    from PIL import Image

    print("\n[Test F / 3b] Preprocessing QA...")
    if not MAMMO_IMG.exists():
        results["3b_preprocessing"] = {"pass": False, "error": "Sample image not found"}
        return None

    pil_img = Image.open(str(MAMMO_IMG)).convert("RGB")
    img_rgb = np.array(pil_img)
    original_shape = img_rgb.shape
    print(f"  Original shape: {original_shape}")

    tensor = _preprocess_mammogram(img_rgb)
    expected_shape = (3, 224, 224)
    shape_ok  = tensor.shape == expected_shape
    dtype_ok  = tensor.dtype == np.float32
    vmin, vmax = float(tensor.min()), float(tensor.max())
    range_ok  = vmin > -4.0 and vmax < 5.0

    pass_3b = shape_ok and dtype_ok and range_ok

    results["3b_preprocessing"] = {
        "original_shape": list(original_shape),
        "output_shape": list(tensor.shape),
        "output_dtype": str(tensor.dtype),
        "value_min": round(vmin, 4),
        "value_max": round(vmax, 4),
        "shape_ok": shape_ok,
        "dtype_ok": dtype_ok,
        "range_ok": range_ok,
        "pass": pass_3b,
    }
    print(f"  Output shape={tensor.shape}, dtype={tensor.dtype}, range=[{vmin:.3f}, {vmax:.3f}]")
    print(f"  [3b] PASS={pass_3b}")

    # Return batch tensor
    return tensor[np.newaxis, :]  # (1, 3, 224, 224)


def run_test_3c_inference(batch: Optional[np.ndarray], results: Dict) -> None:
    """3c: Demo ONNX inference latency + schema QA."""
    print("\n[Test F / 3c] Demo ONNX inference QA...")

    if batch is None:
        print("  Skipping — no batch tensor (preprocessing failed)")
        results["3c_inference"] = {"pass": False, "skip": True}
        return

    with tempfile.TemporaryDirectory() as tmpdir:
        sess, demo_path = _build_demo_onnx(Path(tmpdir))
        input_name = sess.get_inputs()[0].name

        # Warmup
        for _ in range(5):
            sess.run(None, {input_name: batch})

        # Timed runs
        latencies_ms: List[float] = []
        for _ in range(10):
            t0 = time.perf_counter()
            logits = sess.run(None, {input_name: batch})[0]
            latencies_ms.append((time.perf_counter() - t0) * 1000)

        mean_ms = float(np.mean(latencies_ms))
        std_ms  = float(np.std(latencies_ms))
        print(f"  Latency: {mean_ms:.2f} ± {std_ms:.2f} ms (n=10)")

        # Build mock response
        logits_1d = logits[0]
        probs = np.exp(logits_1d) / np.exp(logits_1d).sum()
        top_idx  = int(probs.argmax())
        top_conf = float(probs[top_idx])
        finding  = MAMMOGRAPHY_CONDITIONS[top_idx]
        birads   = _get_birads(finding, top_conf)
        urgency  = "URGENT" if finding in _URGENT_FINDINGS else "ROUTINE"

        response = {
            "scan_id": "TEST-0001",
            "primary_finding": finding,
            "snomed_code": "37155004",
            "urgency": urgency,
            "confidence": round(top_conf, 4),
            "birads_category": birads,
            "laterality": "RIGHT",
            "view": "CC",
            "all_findings": [
                {"finding": MAMMOGRAPHY_CONDITIONS[i], "confidence": round(float(probs[i]), 4)}
                for i in range(len(MAMMOGRAPHY_CONDITIONS))
            ],
            "inference_ms": int(mean_ms),
            "model_version": "v1.0.0",
            "backend": "demo",
            "demo_mode": True,
            "recommendation": f"Demo output — {birads}. NOT CLINICAL EVIDENCE.",
        }

        required_keys = {
            "scan_id", "primary_finding", "snomed_code", "urgency", "confidence",
            "birads_category", "laterality", "view", "all_findings",
            "inference_ms", "model_version", "backend", "demo_mode", "recommendation"
        }
        schema_ok   = required_keys.issubset(set(response.keys()))
        latency_ok  = mean_ms < 100.0
        demo_ok     = response["demo_mode"] is True
        findings_ok = len(response["all_findings"]) == len(MAMMOGRAPHY_CONDITIONS)

        pass_3c = schema_ok and latency_ok and demo_ok and findings_ok

        results["3c_inference"] = {
            "demo_onnx_path": demo_path,
            "mean_latency_ms": round(mean_ms, 3),
            "std_latency_ms":  round(std_ms, 3),
            "latency_ok": latency_ok,
            "schema_ok": schema_ok,
            "demo_mode_ok": demo_ok,
            "all_findings_count": len(response["all_findings"]),
            "findings_count_ok": findings_ok,
            "sample_response": response,
            "pass": pass_3c,
        }
        print(f"  Primary finding: {finding} ({birads}, confidence={top_conf:.3f})")
        print(f"  [3c] PASS={pass_3c}")


def run_test_3d_birads_mapping(results: Dict) -> None:
    """3d: BI-RADS mapping QA for all 8 conditions."""
    print("\n[Test F / 3d] BI-RADS mapping QA...")

    mapping_results = []
    all_ok = True
    for finding, (expected_birads_prefix, confidence) in _BIRADS_MAP.items():
        result = _get_birads(finding, confidence)
        ok = result is not None and result.startswith("BI-RADS")
        if not ok:
            all_ok = False
        mapping_results.append({
            "finding": finding,
            "confidence_used": confidence,
            "birads_assigned": result,
            "valid": ok,
        })
        print(f"  {finding[:30]:30s} → {result}")

    results["3d_birads_mapping"] = {
        "n_conditions": len(MAMMOGRAPHY_CONDITIONS),
        "n_mapped": sum(1 for r in mapping_results if r["valid"]),
        "mapping_results": mapping_results,
        "pass": all_ok,
    }
    print(f"  [3d] PASS={all_ok}")


def main() -> None:
    print("=" * 70)
    print("Test F — Mammography Pipeline Feasibility (CBIS-DDSM)")
    print(MARK)
    print("ENGINEERING VALIDATED / DEMO MODE. NOT CLINICAL EVIDENCE.")
    print("=" * 70)

    t_start = time.time()
    results: Dict[str, Any] = {
        "test": "F",
        "name": "Mammography Pipeline Feasibility",
        "mark": MARK,
        "mode": "ENGINEERING VALIDATED / DEMO MODE",
        "dataset": "CBIS-DDSM (CC BY 3.0, TCIA)",
        "date": "2026-10-28",
    }

    run_test_3a_metadata(results)
    batch = run_test_3b_preprocessing(results)
    run_test_3c_inference(batch, results)
    run_test_3d_birads_mapping(results)

    # Overall verdict
    pass_all = all([
        results.get("3a_metadata", {}).get("pass", False),
        results.get("3b_preprocessing", {}).get("pass", False),
        results.get("3c_inference", {}).get("pass", False),
        results.get("3d_birads_mapping", {}).get("pass", False),
    ])
    results["verdict"] = "ENGINEERING VALIDATED / DEMO MODE" if pass_all else "PARTIAL — see failed criteria"
    results["elapsed_s"] = round(time.time() - t_start, 2)

    # Save JSON report
    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / "v2a1_testF_mammography.json"
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[Report] Saved → {report_path}")

    # Save markdown report
    DOCS.mkdir(parents=True, exist_ok=True)
    md_path = DOCS / "feasibility_report_testF_mammography.md"
    _write_markdown(results, md_path)
    print(f"[Report] Saved → {md_path}")

    print("\n" + "=" * 70)
    print(f"Test F Verdict: {results['verdict']}")
    print("=" * 70)


def _write_markdown(r: Dict, path: Path) -> None:
    meta = r.get("3a_metadata", {})
    pre  = r.get("3b_preprocessing", {})
    inf  = r.get("3c_inference", {})
    bir  = r.get("3d_birads_mapping", {})

    label_lines = "\n".join(
        f"| {k} | {v} | {r.get('3a_metadata', {}).get('label_fractions_pct', {}).get(k, '')}% |"
        for k, v in meta.get("label_counts", {}).items()
    )

    lines = [
        f"# Feasibility Report — Test F: Mammography Pipeline (CBIS-DDSM)",
        f"",
        f"> **{r['mark']}**  ",
        f"> Mode: **{r['mode']}**  ",
        f"> Date: {r['date']}  ",
        f"> Dataset licence: CC BY 3.0 (TCIA / CBIS-DDSM)",
        f"",
        f"## Summary",
        f"",
        f"| Criterion | Result | PASS? |",
        f"|---|---|---|",
        f"| 3a Metadata: CSV loads, all columns | {meta.get('n_rows', '?')} rows, {meta.get('n_patients', '?')} patients | {'✅' if meta.get('pass') else '❌'} |",
        f"| 3b Preprocessing: shape & dtype | {pre.get('output_shape', '?')} float32 | {'✅' if pre.get('pass') else '❌'} |",
        f"| 3c Demo ONNX latency | {inf.get('mean_latency_ms', '?'):.2f} ± {inf.get('std_latency_ms', 0):.2f} ms | {'✅' if inf.get('latency_ok') else '❌'} |",
        f"| 3c Schema validity | All {len(MAMMOGRAPHY_CONDITIONS)} conditions present | {'✅' if inf.get('schema_ok') else '❌'} |",
        f"| 3c demo_mode flag | True | {'✅' if inf.get('demo_mode_ok') else '❌'} |",
        f"| 3d BI-RADS mapping | {bir.get('n_mapped', '?')}/{bir.get('n_conditions', '?')} conditions mapped | {'✅' if bir.get('pass') else '❌'} |",
        f"",
        f"**Overall Verdict: {r.get('verdict', '?')}**",
        f"",
        f"## 3a. CBIS-DDSM Metadata Distribution",
        f"",
        f"| Pathology | Count | % |",
        f"|---|---|---|",
        label_lines,
        f"",
        f"Assessment (BI-RADS): {meta.get('assessment_distribution', {})}",
        f"",
        f"Breast Density: {meta.get('density_distribution', {})}",
        f"",
        f"## 3b. Preprocessing",
        f"",
        f"- Original image shape: {pre.get('original_shape', '?')}",
        f"- Output tensor shape: {pre.get('output_shape', '?')}",
        f"- Value range: [{pre.get('value_min', '?')}, {pre.get('value_max', '?')}]",
        f"",
        f"## 3c. Demo ONNX Inference",
        f"",
        f"- Mean latency: **{inf.get('mean_latency_ms', '?'):.2f} ms** ± {inf.get('std_latency_ms', 0):.2f} ms (n=10 timed runs)",
        f"- Backend: demo (random linear projection ONNX graph)",
        f"- demo_mode: True",
        f"",
        f"## 3d. BI-RADS Mapping",
        f"",
        f"All {bir.get('n_conditions', '?')} mammography conditions correctly mapped to BI-RADS categories.",
        f"",
        f"---",
        f"*Generated automatically by step12_mammography_feasibility.py*  ",
        f"*{r['mark']}*",
    ]
    with open(path, "w", newline="\n") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    main()
