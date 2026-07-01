# SEWA XAI — ai-services/shared/cpu_inference_engine.py
# GPU-Free CPU Inference Engine — ONNX Runtime + INT8 Quantization
#
# Design goals:
#   1. Sub-800ms triage inference on a Standard_F8s_v2 (8 vCPU, 16GB)
#   2. Thread-safe model registry (one session per model, shared across requests)
#   3. INT8 dynamic quantization for ~3-4x speedup over FP32 on AVX-512 CPUs
#   4. Warm-up on startup to eliminate cold-start latency in the SLA window
#   5. Async-friendly: run_in_executor wraps all blocking ORT calls
#
# Azure VM recommendations for clinical SLA:
#   - Standard_F8s_v2  (8 vCPU / 16GB)  — triage + uncertainty (single node)
#   - Standard_F16s_v2 (16 vCPU / 32GB) — triage + uncertainty + VLM (co-located)
#   - Standard_D8ds_v5 (Ice Lake AVX-512) — optimal for INT8 VNNI instructions

import os
import time
import asyncio
import logging
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import numpy as np

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ORT_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

# Type alias for ORT execution provider entries
# Each entry is either a plain string ("CPUExecutionProvider")
# or a tuple of (provider_name, options_dict)
_Provider = Union[str, Tuple[str, Dict[str, Any]]]

logger = logging.getLogger("sewa-cpu-engine")

# ── vCPU detection ─────────────────────────────────────────────
_VCPU_COUNT = int(os.getenv("VCPU_COUNT", str(os.cpu_count() or 4)))
# Reserve 1 thread for FastAPI event loop, rest for inference
_INTRA_THREADS = max(1, _VCPU_COUNT - 1)
_INTER_THREADS = min(4, max(1, _VCPU_COUNT // 2))

logger.info(f"[CpuEngine] vCPUs={_VCPU_COUNT} intra={_INTRA_THREADS} inter={_INTER_THREADS}")

# ── Thread pool for blocking ORT calls ────────────────────────
# Size = vCPU count — handles concurrent requests without GIL blocking
_EXECUTOR = ThreadPoolExecutor(
    max_workers=_VCPU_COUNT,
    thread_name_prefix="sewa-ort",
)


def _build_ort_session_options() -> "ort.SessionOptions":
    """Build optimised ORT session options for CPU inference."""
    opts = ort.SessionOptions()

    # Thread allocation
    opts.intra_op_num_threads = _INTRA_THREADS   # parallelism within a single op
    opts.inter_op_num_threads = _INTER_THREADS   # parallelism between independent ops

    # Graph optimisations — Level 3 = all optimisations including layout transforms
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    # Enable memory pattern optimisation (reuse buffers)
    opts.enable_mem_pattern = True
    opts.enable_mem_reuse = True

    # Disable profiling in production (adds ~5ms overhead)
    opts.enable_profiling = os.getenv("ORT_PROFILING", "0") == "1"

    # Log level — WARNING in prod
    opts.log_severity_level = 2  # 0=verbose, 1=info, 2=warning, 3=error

    return opts


def _get_execution_providers() -> List[_Provider]:
    """Return ordered list of ORT execution providers for this CPU environment."""
    providers: List[_Provider] = []

    if not ORT_AVAILABLE:
        return ["CPUExecutionProvider"]

    available = ort.get_available_providers()

    # OpenVINO EP — for Intel Ice Lake / Sapphire Rapids on Azure D/F-series v5
    if "OpenVINOExecutionProvider" in available:
        providers.append(("OpenVINOExecutionProvider", {
            "device_type": "CPU_FP32",
            "num_of_threads": _INTRA_THREADS,
            "enable_dynamic_shapes": True,
        }))
        logger.info("[CpuEngine] OpenVINO EP available — using for Intel CPU acceleration")

    # DNNL/oneDNN EP — for general x86 AVX2/AVX-512
    if "DnnlExecutionProvider" in available:
        providers.append(("DnnlExecutionProvider", {"use_arena": 1}))
        logger.info("[CpuEngine] DNNL EP available — using oneDNN AVX kernels")

    # Always fall back to vanilla CPU EP
    providers.append("CPUExecutionProvider")
    return providers


# ── Model registry ─────────────────────────────────────────────
class _ModelRegistry:
    """Thread-safe singleton registry for ONNX Runtime sessions."""

    def __init__(self) -> None:
        self._sessions: Dict[str, "ort.InferenceSession"] = {}
        self._lock = threading.Lock()
        self._latencies: Dict[str, List[float]] = {}

    def load(self, model_id: str, model_path: str) -> "ort.InferenceSession":
        """Load or return cached ORT session. Thread-safe."""
        with self._lock:
            if model_id in self._sessions:
                return self._sessions[model_id]

            if not ORT_AVAILABLE:
                raise RuntimeError("onnxruntime not installed — run: pip install onnxruntime")

            if not Path(model_path).exists():
                raise FileNotFoundError(f"ONNX model not found: {model_path}")

            logger.info(f"[CpuEngine] Loading {model_id} from {model_path}")
            t0 = time.perf_counter()

            session = ort.InferenceSession(
                model_path,
                sess_options=_build_ort_session_options(),
                providers=_get_execution_providers(),
            )

            elapsed = (time.perf_counter() - t0) * 1000
            logger.info(f"[CpuEngine] {model_id} loaded in {elapsed:.0f}ms "
                        f"| input: {session.get_inputs()[0].name} "
                        f"| shape: {session.get_inputs()[0].shape}")

            self._sessions[model_id] = session
            self._latencies[model_id] = []
            return session

    def run(self, model_id: str, input_feed: Dict[str, np.ndarray]) -> List[np.ndarray]:
        """Run synchronous inference. Call via run_async in async context."""
        if model_id not in self._sessions:
            raise RuntimeError(f"Model {model_id!r} not loaded. Call load() first.")

        session = self._sessions[model_id]
        t0 = time.perf_counter()
        raw_outputs = session.run(None, input_feed)
        outputs: List[np.ndarray] = [np.asarray(o) for o in raw_outputs]
        elapsed_ms = (time.perf_counter() - t0) * 1000

        # Track p50/p95 latency
        lats = self._latencies[model_id]
        lats.append(elapsed_ms)
        if len(lats) > 500:
            lats.pop(0)

        return outputs

    def get_latency_stats(self, model_id: str) -> Dict[str, float]:
        """Return p50, p95, p99 latency stats (ms) for a model."""
        lats = self._latencies.get(model_id, [])
        if not lats:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "count": 0}
        arr = np.array(lats)
        return {
            "p50": round(float(np.percentile(arr, 50)), 1),
            "p95": round(float(np.percentile(arr, 95)), 1),
            "p99": round(float(np.percentile(arr, 99)), 1),
            "count": len(lats),
        }

    def warmup(self, model_id: str, input_shape: Tuple[int, ...], n: int = 3) -> None:
        """Run N warmup passes to prime CPU caches and ORT kernels."""
        dummy = {
            self._sessions[model_id].get_inputs()[0].name: np.zeros(input_shape, dtype=np.float32)
        }
        for _ in range(n):
            self.run(model_id, dummy)
        logger.info(f"[CpuEngine] {model_id} warmup complete ({n} passes)")

    @property
    def loaded_models(self) -> List[str]:
        return list(self._sessions.keys())


# Module-level singleton
registry = _ModelRegistry()


# ── Async wrapper ──────────────────────────────────────────────
async def run_async(model_id: str, input_feed: Dict[str, np.ndarray]) -> List[np.ndarray]:
    """Run ORT inference in thread pool — non-blocking for FastAPI event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_EXECUTOR, registry.run, model_id, input_feed)


# ── INT8 Quantization helper ───────────────────────────────────
def quantize_model_int8(fp32_onnx_path: str, int8_onnx_path: str) -> str:
    """
    Apply dynamic INT8 quantization to an FP32 ONNX model.
    Dynamic quantization: weights INT8, activations quantized at runtime.
    ~3-4x faster than FP32 on CPUs with AVX-512 VNNI (Azure D/F v5 series).

    Usage (run once during model export, not at inference time):
        from shared.cpu_inference_engine import quantize_model_int8
        quantize_model_int8("/models/triage_v2.4.1.onnx", "/models/triage_v2.4.1_int8.onnx")
    """
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
        quantize_dynamic(
            model_input=fp32_onnx_path,
            model_output=int8_onnx_path,
            weight_type=QuantType.QInt8,
            per_channel=False,    # per-tensor: faster on CPU, slightly less accurate
            reduce_range=True,    # avoids saturation on older Intel hardware
        )
        logger.info(f"[CpuEngine] INT8 quantized model saved: {int8_onnx_path}")
        return int8_onnx_path
    except ImportError:
        logger.error("onnxruntime.quantization not available — install onnxruntime>=1.17")
        raise


# ── PyTorch → ONNX export helper ──────────────────────────────
def export_pytorch_to_onnx(
    model: Any,
    output_path: str,
    input_shape: Tuple[int, ...] = (1, 3, 224, 224),
    opset: int = 17,
) -> str:
    """
    Export a PyTorch model to ONNX format.
    Run this once during the model release pipeline, not at inference time.
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError("PyTorch not available for ONNX export")

    import torch

    model.eval()
    dummy = torch.zeros(*input_shape)  # (1, 3, H, W)

    torch.onnx.export(
        model,
        args=(dummy,),   # PyTorch 2.x: args must be a tuple
        f=output_path,
        export_params=True,
        opset_version=opset,
        do_constant_folding=True,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={
            "image":  {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
    )
    logger.info(f"[CpuEngine] ONNX model exported: {output_path} (opset {opset})")
    return output_path


# ── Micro-batching queue ───────────────────────────────────────
class MicroBatchQueue:
    """
    Async queue that accumulates requests and flushes as a batch.
    Improves CPU utilisation by amortising ORT session overhead.

    Target batch size: 4 (empirically optimal for 8-vCPU nodes).
    Max wait: 50ms (keeps within 2-4s SLA budget).
    """

    def __init__(
        self,
        model_id: str,
        max_batch: int = 4,
        max_wait_ms: float = 50.0,
    ) -> None:
        self.model_id = model_id
        self.max_batch = max_batch
        self.max_wait_s = max_wait_ms / 1000.0
        self._queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None

    def start(self) -> None:
        """Start background flush loop. Call from FastAPI lifespan."""
        self._task = asyncio.ensure_future(self._flush_loop())

    async def stop(self) -> None:
        """Graceful shutdown."""
        if self._task:
            self._task.cancel()

    async def infer(self, image: np.ndarray) -> np.ndarray:
        """Submit image for batched inference. Returns logits."""
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        await self._queue.put((image, future))
        return await future

    async def _flush_loop(self) -> None:
        """Drain queue and run batched ORT inference."""
        while True:
            batch: List[Tuple[np.ndarray, asyncio.Future]] = []

            # Block until first item arrives
            try:
                item = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                batch.append(item)
            except asyncio.TimeoutError:
                continue

            # Accumulate up to max_batch within max_wait window
            deadline = time.monotonic() + self.max_wait_s
            while len(batch) < self.max_batch:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(self._queue.get(), timeout=remaining)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            # Build batched numpy array
            images = np.stack([img for img, _ in batch], axis=0)  # (N, C, H, W)
            input_name = registry._sessions[self.model_id].get_inputs()[0].name

            try:
                results = await run_async(self.model_id, {input_name: images})
                logits = results[0]  # (N, num_classes)
                for i, (_, future) in enumerate(batch):
                    if not future.done():
                        future.set_result(logits[i])
            except Exception as exc:
                for _, future in batch:
                    if not future.done():
                        future.set_exception(exc)
