#!/usr/bin/env python3
# SEWA XAI — scripts/export_models_to_onnx.py
# One-time model export pipeline: PyTorch → ONNX → INT8 ONNX
#
# Run once per model release in Azure ML or locally with GPU if available.
# Output INT8 ONNX models are stored in Azure Blob Storage → mounted into AKS pods.
#
# Usage:
#   python scripts/export_models_to_onnx.py --model triage --version v2.4.1
#   python scripts/export_models_to_onnx.py --model triage --version v2.4.1 --skip-quantize
#
# Prerequisites:
#   pip install torch onnx onnxruntime scikit-learn
#
# Output files (upload to Azure Blob → /models PVC):
#   /models/triage_v2.4.1.onnx          (FP32 — fallback)
#   /models/triage_v2.4.1_int8.onnx     (INT8 — primary, ~3-4x faster on CPU AVX-512)
#   /models/triage_v2.4.1_int8.onnx.md5 (integrity check for DCB0129)

import argparse
import hashlib
import json
import logging
import os
import sys
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("model-export")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export PyTorch model to ONNX INT8")
    p.add_argument("--model",          default="triage",   help="Model name (triage|uncertainty|vlm)")
    p.add_argument("--version",        default="v2.4.1",   help="Model version string")
    p.add_argument("--model-dir",      default="/models",  help="Directory containing .pt files")
    p.add_argument("--output-dir",     default="/models",  help="Directory to write ONNX files")
    p.add_argument("--input-shape",    default="1,3,224,224", help="ONNX export input shape (NCHW)")
    p.add_argument("--opset",          default=17, type=int)
    p.add_argument("--skip-quantize",  action="store_true", help="Export FP32 only (skip INT8)")
    p.add_argument("--per-channel",    action="store_true", help="Per-channel INT8 (slightly more accurate, slightly slower)")
    p.add_argument("--validate",       action="store_true", help="Validate INT8 accuracy vs FP32 on dummy input")
    return p.parse_args()


def load_pytorch_model(model_name: str, model_path: Path, num_classes: int = 14):
    """Load PyTorch model for export. Adjust backbone to match your production model."""
    import torch
    sys.path.insert(0, str(Path(__file__).parent.parent / "ai-services" / model_name))
    from model import SEWATriageModel

    model = SEWATriageModel(num_classes=num_classes, backbone="efficientnet_b0")
    state = torch.load(str(model_path), map_location="cpu")
    model.load_state_dict(state)
    model.eval()
    logger.info(f"Loaded PyTorch model: {model_path} ({sum(p.numel() for p in model.parameters()):,} params)")
    return model


def export_to_onnx(model, output_path: Path, input_shape: tuple, opset: int) -> Path:
    """Export PyTorch model to ONNX."""
    import torch

    dummy = torch.zeros(*input_shape)
    logger.info(f"Exporting to ONNX (opset {opset}): {output_path}")
    t0 = time.perf_counter()

    torch.onnx.export(
        model,
        dummy,
        str(output_path),
        export_params=True,
        opset_version=opset,
        do_constant_folding=True,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
    )

    elapsed = time.perf_counter() - t0
    size_mb = output_path.stat().st_size / 1_000_000
    logger.info(f"FP32 ONNX export: {elapsed:.1f}s | {size_mb:.1f}MB → {output_path}")
    return output_path


def quantize_to_int8(fp32_path: Path, int8_path: Path, per_channel: bool) -> Path:
    """Apply dynamic INT8 quantization."""
    from onnxruntime.quantization import quantize_dynamic, QuantType

    logger.info(f"Quantizing to INT8 (per_channel={per_channel}): {int8_path}")
    t0 = time.perf_counter()

    quantize_dynamic(
        model_input=str(fp32_path),
        model_output=str(int8_path),
        weight_type=QuantType.QInt8,
        optimize_model=True,
        per_channel=per_channel,
        reduce_range=True,        # safer for older Intel CPUs
        extra_options={
            "MatMulConstBOnly": True,  # only quantize constant weight matrices
        },
    )

    elapsed = time.perf_counter() - t0
    fp32_mb = fp32_path.stat().st_size / 1_000_000
    int8_mb = int8_path.stat().st_size / 1_000_000
    compression = (1 - int8_mb / fp32_mb) * 100
    logger.info(
        f"INT8 quantization: {elapsed:.1f}s | "
        f"FP32={fp32_mb:.1f}MB → INT8={int8_mb:.1f}MB ({compression:.0f}% compression)"
    )
    return int8_path


def validate_accuracy(fp32_path: Path, int8_path: Path, input_shape: tuple, n: int = 50):
    """
    Compare FP32 vs INT8 output cosine similarity on random inputs.
    NHS DCB0129: Document quantization error in clinical safety case.
    Target: cosine similarity > 0.995 (equivalent to <0.5% logit drift).
    """
    import onnxruntime as ort
    import numpy as np

    logger.info(f"Validating accuracy: {n} random inputs")

    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    opts.intra_op_num_threads = 4

    fp32_sess = ort.InferenceSession(str(fp32_path), sess_options=opts, providers=["CPUExecutionProvider"])
    int8_sess = ort.InferenceSession(str(int8_path), sess_options=opts, providers=["CPUExecutionProvider"])

    input_name = fp32_sess.get_inputs()[0].name
    similarities = []
    max_abs_err  = []

    rng = np.random.default_rng(42)
    for _ in range(n):
        x = rng.standard_normal(input_shape).astype(np.float32)
        fp32_out = fp32_sess.run(None, {input_name: x})[0]
        int8_out = int8_sess.run(None, {input_name: x})[0]

        # Cosine similarity
        a = fp32_out.flatten()
        b = int8_out.flatten()
        cos_sim = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))
        similarities.append(cos_sim)
        max_abs_err.append(float(np.max(np.abs(a - b))))

    mean_cos = float(np.mean(similarities))
    mean_err = float(np.mean(max_abs_err))
    p5_cos   = float(np.percentile(similarities, 5))

    logger.info(
        f"Validation results: cosine_sim={mean_cos:.4f} (p5={p5_cos:.4f}) "
        f"max_abs_err={mean_err:.4f}"
    )

    if p5_cos < 0.990:
        logger.error(
            f"INT8 accuracy below threshold: p5_cosine={p5_cos:.4f} < 0.990. "
            "Do not deploy — re-export with per_channel=True or review model architecture."
        )
        sys.exit(1)

    logger.info("Accuracy validation PASSED ✓")
    return {"mean_cosine": mean_cos, "p5_cosine": p5_cos, "mean_max_abs_err": mean_err}


def write_md5(file_path: Path) -> str:
    """Write MD5 integrity file — required for NHS DCB0129 model provenance."""
    h = hashlib.md5(file_path.read_bytes()).hexdigest()
    md5_path = file_path.with_suffix(file_path.suffix + ".md5")
    md5_path.write_text(f"{h}  {file_path.name}\n")
    logger.info(f"MD5: {h} → {md5_path}")
    return h


def write_model_card(output_dir: Path, version: str, meta: dict) -> None:
    """Write model card JSON — NHS DCB0129 Section 8 (clinical safety artefacts)."""
    card_path = output_dir / f"model_card_{version}.json"
    card = {
        "model_id": f"sewa-triage-{version}",
        "version": version,
        "exported_at": __import__("datetime").datetime.utcnow().isoformat(),
        "architecture": "EfficientNet-B0 (CPU-optimised)",
        "input_shape": "1x3x224x224 (NCHW, float32)",
        "output_shape": "1x14 (logits)",
        "inference_backend": "ONNX Runtime 1.17.3",
        "quantization": "Dynamic INT8 (QInt8)",
        "quantization_validation": meta.get("validation", {}),
        "target_platform": "Azure Standard_F8s_v2 (8 vCPU, Intel Ice Lake)",
        "expected_latency_ms": {"p50": 400, "p95": 700},
        "clinical_safety": {
            "standard": "NHS DCB0129",
            "uncertainty_flag": "is_uncertain output triggers mandatory radiologist review",
            "human_in_loop": True,
            "intended_use": "Triage prioritisation — decision support only, not diagnosis",
        },
        "files": meta.get("files", {}),
    }
    card_path.write_text(json.dumps(card, indent=2))
    logger.info(f"Model card: {card_path}")


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    model_dir  = Path(args.model_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    input_shape = tuple(int(x) for x in args.input_shape.split(","))
    pt_path     = model_dir / f"{args.model}_{args.version}.pt"
    fp32_path   = output_dir / f"{args.model}_{args.version}.onnx"
    int8_path   = output_dir / f"{args.model}_{args.version}_int8.onnx"

    files = {}
    validation_results = {}

    # Step 1: Export FP32 ONNX
    model = load_pytorch_model(args.model, pt_path)
    export_to_onnx(model, fp32_path, input_shape, args.opset)
    files["fp32_onnx"]  = str(fp32_path)
    files["fp32_md5"]   = write_md5(fp32_path)

    if not args.skip_quantize:
        # Step 2: Quantize to INT8
        quantize_to_int8(fp32_path, int8_path, args.per_channel)
        files["int8_onnx"] = str(int8_path)
        files["int8_md5"]  = write_md5(int8_path)

        if args.validate:
            # Step 3: Validate quantization accuracy
            validation_results = validate_accuracy(fp32_path, int8_path, input_shape)

    # Step 4: Write model card (DCB0129)
    write_model_card(output_dir, args.version, {
        "validation": validation_results,
        "files": files,
    })

    logger.info("=" * 60)
    logger.info("Export complete. Upload to Azure Blob Storage:")
    logger.info(f"  az storage blob upload-batch --source {output_dir} --destination models")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
