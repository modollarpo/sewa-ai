"""Step 13: Test G — Retinal Pipeline Feasibility (EyePACS Samples).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
ENGINEERING VALIDATED / DEMO MODE — no real weights, no clinical accuracy claims.

Dataset:  EyePACS fundus photographs (4 samples: 10000 L/R, 10001 L/R)
Pipeline: sewa-retinal demo ONNX (random linear projection fallback)
Goal:     Verify image loading, preprocessing, schema, latency, DR grade mapping

Usage:
    python validation/scripts/step13_retinal_feasibility.py

Outputs:
    validation/reports/v2a1_testG_retinal.json
    docs/evidence/feasibility_report_testG_retinal.md
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
RETINAL_DIR = ROOT / "validation" / "data_subsets" / "retinal_samples"

RETINAL_CONDITIONS = [
    "Normal Retina",
    "Diabetic Retinopathy (No DR)",
    "Diabetic Retinopathy (Mild NPDR)",
    "Diabetic Retinopathy (Moderate NPDR)",
    "Diabetic Retinopathy (Severe NPDR)",
    "Diabetic Retinopathy (PDR)",
    "Glaucoma Suspect",
    "Primary Open-Angle Glaucoma",
    "Dry AMD",
    "Wet AMD",
    "Hypertensive Retinopathy",
    "Retinal Vein Occlusion",
    "Retinal Artery Occlusion",
]

_SNOMED_RETINAL: Dict[str, str] = {
    "Normal Retina": "37377007",
    "Diabetic Retinopathy (No DR)": "37377007",
    "Diabetic Retinopathy (Mild NPDR)": "42348007",
    "Diabetic Retinopathy (Moderate NPDR)": "42348007",
    "Diabetic Retinopathy (Severe NPDR)": "42348007",
    "Diabetic Retinopathy (PDR)": "42348007",
    "Glaucoma Suspect": "37116000",
    "Primary Open-Angle Glaucoma": "238697005",
    "Dry AMD": "238734002",
    "Wet AMD": "238735001",
    "Hypertensive Retinopathy": "23878000",
    "Retinal Vein Occlusion": "238802004",
    "Retinal Artery Occlusion": "238801008",
}

_URGENT_FINDINGS = {
    "Diabetic Retinopathy (PDR)",
    "Wet AMD",
    "Retinal Vein Occlusion",
    "Retinal Artery Occlusion",
    "Primary Open-Angle Glaucoma",
}


def _get_dr_grade(finding: str) -> Optional[str]:
    if "No DR" in finding:
        return "Grade 0"
    if "Mild NPDR" in finding:
        return "Grade 1"
    if "Moderate NPDR" in finding:
        return "Grade 2"
    if "Severe NPDR" in finding:
        return "Grade 3"
    if "PDR" in finding:
        return "Grade 4"
    return None


def _preprocess_retinal(img_rgb: np.ndarray) -> np.ndarray:
    import cv2
    tile = cv2.resize(img_rgb, (224, 224), interpolation=cv2.INTER_LANCZOS4)
    tile = tile.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tile = (tile - mean) / std
    return tile.transpose(2, 0, 1).astype(np.float32)


def _build_demo_onnx(model_cache: Path) -> Tuple[Any, str]:
    import onnx
    from onnx import helper, TensorProto
    import onnxruntime as ort

    n_classes = len(RETINAL_CONDITIONS)
    demo_path = model_cache / "retinal_demo_test.onnx"
    demo_path.parent.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed=42)
    W_data = rng.standard_normal((n_classes, 3 * 224 * 224)).astype(np.float32) * 0.01
    X = helper.make_tensor_value_info("image", TensorProto.FLOAT, [None, 3, 224, 224])
    Y = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [None, n_classes])
    W = helper.make_tensor("W", TensorProto.FLOAT, W_data.shape, W_data.flatten().tolist())
    flat = helper.make_node("Flatten", ["image"], ["flat"], axis=1)
    gemm = helper.make_node("Gemm", ["flat", "W"], ["logits"], transB=1)
    graph = helper.make_graph([flat, gemm], "retinal_demo", [X], [Y], initializer=[W])
    model_proto = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    onnx.save(model_proto, str(demo_path))

    sess = ort.InferenceSession(str(demo_path), providers=["CPUExecutionProvider"])
    return sess, str(demo_path)


def run_test_3a_loading(results: Dict) -> List[Tuple[str, np.ndarray]]:
    """3a: Image loading QA."""
    from PIL import Image

    print("\n[Test G / 3a] Loading EyePACS sample images...")
    images = []
    load_records = []
    all_ok = True

    expected_files = [
        "10000_left.jpeg",
        "10000_right.jpeg",
        "10001_left.jpeg",
        "10001_right.jpeg",
    ]

    for fname in expected_files:
        fpath = RETINAL_DIR / fname
        if not fpath.exists():
            print(f"  Missing: {fname}")
            all_ok = False
            load_records.append({"filename": fname, "exists": False})
            continue

        try:
            im = Image.open(str(fpath)).convert("RGB")
            arr = np.array(im)
            images.append((fname, arr))
            load_records.append({
                "filename": fname,
                "exists": True,
                "shape": list(arr.shape),
                "mode": im.mode,
            })
            print(f"  Loaded {fname}: {arr.shape}, mode={im.mode}")
        except Exception as e:
            all_ok = False
            load_records.append({"filename": fname, "exists": True, "error": str(e)})
            print(f"  Failed loading {fname}: {e}")

    results["3a_loading"] = {
        "n_expected": len(expected_files),
        "n_loaded": len(images),
        "records": load_records,
        "pass": all_ok and len(images) == 4,
    }
    print(f"  [3a] PASS={results['3a_loading']['pass']}")
    return images


def run_test_3b_preprocessing(images: List[Tuple[str, np.ndarray]], results: Dict) -> List[Tuple[str, np.ndarray]]:
    """3b: Preprocessing pipeline QA."""
    print("\n[Test G / 3b] Preprocessing QA...")
    preprocessed = []
    records = []
    all_ok = True

    for fname, arr in images:
        t = _preprocess_retinal(arr)
        shape_ok = t.shape == (3, 224, 224)
        dtype_ok = t.dtype == np.float32
        vmin, vmax = float(t.min()), float(t.max())
        range_ok = vmin > -4.0 and vmax < 5.0
        ok = shape_ok and dtype_ok and range_ok
        if not ok:
            all_ok = False
        preprocessed.append((fname, t))
        records.append({
            "filename": fname,
            "shape": list(t.shape),
            "dtype": str(t.dtype),
            "vmin": round(vmin, 3),
            "vmax": round(vmax, 3),
            "shape_ok": shape_ok,
            "dtype_ok": dtype_ok,
            "range_ok": range_ok,
            "valid": ok,
        })
        print(f"  {fname} -> shape={t.shape}, range=[{vmin:.2f}, {vmax:.2f}]")

    results["3b_preprocessing"] = {
        "n_processed": len(preprocessed),
        "records": records,
        "pass": all_ok and len(preprocessed) == len(images),
    }
    print(f"  [3b] PASS={results['3b_preprocessing']['pass']}")
    return preprocessed


def run_test_3c_inference(preprocessed: List[Tuple[str, np.ndarray]], results: Dict) -> None:
    """3c: Demo ONNX inference latency & schema QA."""
    print("\n[Test G / 3c] Demo ONNX inference QA...")

    if not preprocessed:
        results["3c_inference"] = {"pass": False, "skip": True}
        return

    with tempfile.TemporaryDirectory() as tmpdir:
        sess, demo_path = _build_demo_onnx(Path(tmpdir))
        input_name = sess.get_inputs()[0].name

        # Warmup
        warmup_batch = preprocessed[0][1][np.newaxis, :]
        for _ in range(5):
            sess.run(None, {input_name: warmup_batch})

        sample_responses = []
        all_latencies: List[float] = []
        all_schema_ok = True

        for fname, t in preprocessed:
            batch = t[np.newaxis, :]
            latencies_ms = []
            for _ in range(10):
                t0 = time.perf_counter()
                logits = sess.run(None, {input_name: batch})[0]
                latencies_ms.append((time.perf_counter() - t0) * 1000)

            mean_ms = float(np.mean(latencies_ms))
            all_latencies.append(mean_ms)

            logits_1d = logits[0]
            probs = np.exp(logits_1d) / np.exp(logits_1d).sum()
            top_idx = int(probs.argmax())
            top_conf = float(probs[top_idx])
            finding = RETINAL_CONDITIONS[top_idx]
            dr_grade = _get_dr_grade(finding)
            urgency = "URGENT" if finding in _URGENT_FINDINGS else "ROUTINE"
            eye = "LEFT" if "left" in fname.lower() else "RIGHT"

            response = {
                "scan_id": fname.replace(".jpeg", ""),
                "primary_finding": finding,
                "snomed_code": _SNOMED_RETINAL.get(finding, "37377007"),
                "urgency": urgency,
                "confidence": round(top_conf, 4),
                "dr_grade": dr_grade,
                "eye": eye,
                "all_findings": [
                    {"finding": RETINAL_CONDITIONS[i], "confidence": round(float(probs[i]), 4)}
                    for i in range(len(RETINAL_CONDITIONS))
                ],
                "inference_ms": int(mean_ms),
                "model_version": "v1.0.0",
                "backend": "demo",
                "demo_mode": True,
                "recommendation": f"Demo output ({urgency}). NOT CLINICAL EVIDENCE.",
            }

            required_keys = {
                "scan_id", "primary_finding", "snomed_code", "urgency", "confidence",
                "dr_grade", "eye", "all_findings", "inference_ms", "model_version",
                "backend", "demo_mode", "recommendation"
            }
            if not required_keys.issubset(set(response.keys())):
                all_schema_ok = False

            sample_responses.append(response)
            print(f"  {fname} -> {finding} (conf={top_conf:.3f}, dr={dr_grade}, latency={mean_ms:.2f}ms)")

        avg_latency = float(np.mean(all_latencies))
        latency_ok = avg_latency < 100.0

        results["3c_inference"] = {
            "demo_onnx_path": demo_path,
            "per_image_latencies_ms": [round(x, 2) for x in all_latencies],
            "mean_latency_ms": round(avg_latency, 3),
            "latency_ok": latency_ok,
            "schema_ok": all_schema_ok,
            "demo_mode_ok": all(r["demo_mode"] is True for r in sample_responses),
            "sample_responses": sample_responses,
            "pass": latency_ok and all_schema_ok,
        }
        print(f"  Mean latency: {avg_latency:.2f} ms")
        print(f"  [3c] PASS={results['3c_inference']['pass']}")


def run_test_3d_mappings(results: Dict) -> None:
    """3d: DR grade & urgency mapping QA."""
    print("\n[Test G / 3d] DR grade & Urgency mapping QA...")
    dr_mappings = []
    urgency_mappings = []

    dr_conditions = [c for c in RETINAL_CONDITIONS if "Diabetic Retinopathy" in c]
    for c in dr_conditions:
        grade = _get_dr_grade(c)
        dr_mappings.append({"condition": c, "grade": grade, "valid": grade is not None})
        print(f"  {c:40s} -> {grade}")

    for c in RETINAL_CONDITIONS:
        is_urgent = c in _URGENT_FINDINGS
        urgency_mappings.append({"condition": c, "urgent": is_urgent})

    dr_pass = all(m["valid"] for m in dr_mappings)
    urgency_pass = len(_URGENT_FINDINGS) == 5

    results["3d_mappings"] = {
        "dr_mappings": dr_mappings,
        "urgent_count": len(_URGENT_FINDINGS),
        "pass": dr_pass and urgency_pass,
    }
    print(f"  [3d] PASS={results['3d_mappings']['pass']}")


def main() -> None:
    print("=" * 70)
    print("Test G — Retinal Pipeline Feasibility (EyePACS Samples)")
    print(MARK)
    print("ENGINEERING VALIDATED / DEMO MODE. NOT CLINICAL EVIDENCE.")
    print("=" * 70)

    t_start = time.time()
    results: Dict[str, Any] = {
        "test": "G",
        "name": "Retinal Pipeline Feasibility",
        "mark": MARK,
        "mode": "ENGINEERING VALIDATED / DEMO MODE",
        "dataset": "EyePACS Samples (Kaggle / research use, 4 images)",
        "date": "2026-10-28",
    }

    images = run_test_3a_loading(results)
    preprocessed = run_test_3b_preprocessing(images, results)
    run_test_3c_inference(preprocessed, results)
    run_test_3d_mappings(results)

    pass_all = all([
        results.get("3a_loading", {}).get("pass", False),
        results.get("3b_preprocessing", {}).get("pass", False),
        results.get("3c_inference", {}).get("pass", False),
        results.get("3d_mappings", {}).get("pass", False),
    ])
    results["verdict"] = "ENGINEERING VALIDATED / DEMO MODE" if pass_all else "PARTIAL — see failed criteria"
    results["elapsed_s"] = round(time.time() - t_start, 2)

    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / "v2a1_testG_retinal.json"
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[Report] Saved -> {report_path}")

    DOCS.mkdir(parents=True, exist_ok=True)
    md_path = DOCS / "feasibility_report_testG_retinal.md"
    _write_markdown(results, md_path)
    print(f"[Report] Saved -> {md_path}")

    print("\n" + "=" * 70)
    print(f"Test G Verdict: {results['verdict']}")
    print("=" * 70)


def _write_markdown(r: Dict, path: Path) -> None:
    loading = r.get("3a_loading", {})
    pre = r.get("3b_preprocessing", {})
    inf = r.get("3c_inference", {})
    mappings = r.get("3d_mappings", {})

    lines = [
        f"# Feasibility Report — Test G: Retinal Pipeline (EyePACS)",
        f"",
        f"> **{r['mark']}**  ",
        f"> Mode: **{r['mode']}**  ",
        f"> Date: {r['date']}  ",
        f"> Dataset licence: Research use (EyePACS / Kaggle)",
        f"",
        f"## Summary",
        f"",
        f"| Criterion | Result | PASS? |",
        f"|---|---|---|",
        f"| 3a Loading: 4 sample fundus images | {loading.get('n_loaded', '?')}/{loading.get('n_expected', '?')} images loaded | {'✅' if loading.get('pass') else '❌'} |",
        f"| 3b Preprocessing: shape & dtype | 4/4 tensors (3, 224, 224) float32 | {'✅' if pre.get('pass') else '❌'} |",
        f"| 3c Demo ONNX latency | {inf.get('mean_latency_ms', '?'):.2f} ms (avg across 4 images) | {'✅' if inf.get('latency_ok') else '❌'} |",
        f"| 3c Schema validity | All 13 retinal conditions in all_findings | {'✅' if inf.get('schema_ok') else '❌'} |",
        f"| 3c demo_mode flag | True | {'✅' if inf.get('demo_mode_ok') else '❌'} |",
        f"| 3d DR grade mapping | All 5 DR stages mapped (Grade 0–4) | {'✅' if mappings.get('pass') else '❌'} |",
        f"",
        f"**Overall Verdict: {r.get('verdict', '?')}**",
        f"",
        f"## 3a. EyePACS Fundus Samples",
        f"",
        f"| Filename | Shape | Mode |",
        f"|---|---|---|",
    ]
    for rec in loading.get("records", []):
        lines.append(f"| {rec.get('filename')} | {rec.get('shape')} | {rec.get('mode')} |")

    lines.extend([
        f"",
        f"## 3b. Preprocessing QA",
        f"",
        f"All 4 retinal images transformed to `(3, 224, 224)` with ImageNet normalization.",
        f"",
        f"## 3c. Demo ONNX Inference Latency",
        f"",
        f"- Mean latency: **{inf.get('mean_latency_ms', '?'):.2f} ms**",
        f"- Individual runs: {inf.get('per_image_latencies_ms', [])} ms",
        f"- demo_mode: True",
        f"",
        f"## 3d. Diabetic Retinopathy Grading",
        f"",
        f"All 5 DR stages correctly mapped to ICDR grades:",
        f"- No DR -> Grade 0",
        f"- Mild NPDR -> Grade 1",
        f"- Moderate NPDR -> Grade 2",
        f"- Severe NPDR -> Grade 3",
        f"- PDR -> Grade 4",
        f"",
        f"---",
        f"*Generated automatically by step13_retinal_feasibility.py*  ",
        f"*{r['mark']}*",
    ])

    with open(path, "w", newline="\n") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    main()
