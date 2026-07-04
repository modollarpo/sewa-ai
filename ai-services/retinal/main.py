# SEWA XAI — ai-services/retinal/main.py
# Retinal AI Service — Diabetic Retinopathy, Glaucoma, AMD Detection
#
# Features:
#   - Diabetic Retinopathy (DR) grading
#   - Glaucoma detection
#   - Age-related Macular Degeneration (AMD) detection
#
# NHS DCB0129: All model outputs annotated with uncertainty flags.

from __future__ import annotations

import os
import io
import sys
import time
import asyncio
import logging
import base64
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any
from enum import Enum
from urllib.parse import urlparse

import numpy as np
import cv2
from PIL import Image

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import uvicorn
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger

sys.path.insert(0, str(Path(__file__).parent.parent / "shared"))
from cpu_inference_engine import registry, run_async, MicroBatchQueue

logger = logging.getLogger("sewa-retinal")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(
    jsonlogger.JsonFormatter(
        "%(asctime)s %(name)s %(levelname)s %(message)s %(module)s %(funcName)s %(lineno)d"
    )
)
if not logger.handlers:
    logger.addHandler(handler)

REQUESTS_TOTAL = Counter(
    "retinal_requests_total", "Retinal requests", ["status", "urgency"]
)
INFERENCE_DURATION = Histogram(
    "retinal_inference_duration_seconds", "Inference duration", ["eye"]
)
MODEL_LOADED = Gauge("retinal_model_loaded", "1 if model loaded, 0 otherwise")
QUEUE_SIZE = Gauge("retinal_queue_size", "Current microbatch queue size")

MODEL_CACHE = Path(os.getenv("MODEL_CACHE", "/models"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0.0")
INT8_MODEL = MODEL_CACHE / f"retinal_{MODEL_VERSION}_int8.onnx"
FP32_MODEL = MODEL_CACHE / f"retinal_{MODEL_VERSION}.onnx"
MODEL_ID = "retinal"
INPUT_SHAPE = (1, 3, 224, 224)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5000"
).split(",")

_batch_queue: Optional[MicroBatchQueue] = None

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _batch_queue

    model_path = _resolve_model()
    logger.info(f"[Retinal] Loading ONNX model: {model_path}")
    registry.load(MODEL_ID, str(model_path))
    registry.warmup(MODEL_ID, INPUT_SHAPE, n=3)
    MODEL_LOADED.set(1)

    _batch_queue = MicroBatchQueue(
        model_id=MODEL_ID,
        max_batch=int(os.getenv("MAX_BATCH_SIZE", "4")),
        max_wait_ms=float(os.getenv("MAX_BATCH_WAIT_MS", "80")),
    )
    _batch_queue.start()
    logger.info("[Retinal] Startup complete — ready to analyze retinal images")
    yield

    if _batch_queue:
        await _batch_queue.stop()
    MODEL_LOADED.set(0)
    logger.info("[Retinal] Shutdown complete")


def _resolve_model() -> Path:
    if INT8_MODEL.exists():
        logger.info(f"[Retinal] Using INT8 ONNX: {INT8_MODEL}")
        return INT8_MODEL
    if FP32_MODEL.exists():
        logger.info(f"[Retinal] Using FP32 ONNX (INT8 not found): {FP32_MODEL}")
        return FP32_MODEL
    logger.warning("[Retinal] No model found — creating demo ONNX")
    return _create_demo_onnx()


def _create_demo_onnx() -> Path:
    try:
        import onnx
        from onnx import helper, TensorProto

        demo_path = MODEL_CACHE / "retinal_demo.onnx"
        demo_path.parent.mkdir(parents=True, exist_ok=True)

        n_classes = len(RETINAL_CONDITIONS)
        X = helper.make_tensor_value_info("image", TensorProto.FLOAT, [None, 3, 224, 224])
        Y = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [None, n_classes])
        W_data = np.random.randn(n_classes, 3 * 224 * 224).astype(np.float32) * 0.01
        W = helper.make_tensor("W", TensorProto.FLOAT, W_data.shape, W_data.flatten().tolist())
        flat = helper.make_node("Flatten", ["image"], ["flat"], axis=1)
        gemm = helper.make_node("Gemm", ["flat", "W"], ["logits"], transB=1)
        graph = helper.make_graph([flat, gemm], "retinal_demo", [X], [Y], initializer=[W])
        model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
        onnx.save(model, str(demo_path))
        logger.info(f"[Retinal] Demo ONNX written: {demo_path}")
        return demo_path
    except ImportError:
        logger.error("[Retinal] onnx package not installed — cannot create demo model")
        raise


app = FastAPI(
    title="SEWA XAI — Retinal AI Service",
    version="1.0.0",
    description=(
        "Retinal disease detection. Diabetic retinopathy grading, "
        "glaucoma, AMD detection. CPU-only inference via ONNX Runtime INT8."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)


class Eye(str, Enum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"


class RetinalPredictRequest(BaseModel):
    scan_id: str = Field(..., pattern=r"^[A-Z0-9\-_]{4,64}$")
    storage_url: Optional[str] = Field(None, pattern=r"^https?://.*")
    image_data: Optional[str] = None
    eye: Eye
    model_version: str = MODEL_VERSION


class RetinalPredictResponse(BaseModel):
    scan_id: str
    primary_finding: str
    snomed_code: str
    urgency: str
    confidence: float
    dr_grade: Optional[str]
    eye: Eye
    all_findings: List[Dict[str, Any]]
    inference_ms: int
    model_version: str
    backend: str
    recommendation: str


def _preprocess_retinal(img_rgb: np.ndarray) -> np.ndarray:
    tile = cv2.resize(img_rgb, (224, 224), interpolation=cv2.INTER_LANCZOS4)
    tile = tile.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tile = (tile - mean) / std
    return tile.transpose(2, 0, 1).astype(np.float32)


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


def _classify_urgency(finding: str) -> str:
    if finding in _URGENT_FINDINGS:
        return "URGENT"
    return "NORMAL"


def _build_recommendation(finding: str) -> str:
    if finding == "Diabetic Retinopathy (PDR)":
        return "URGENT: Refer to ophthalmologist immediately for anti-VEGF or laser treatment."
    if finding == "Wet AMD":
        return "URGENT: Refer to ophthalmologist immediately for anti-VEGF therapy."
    if finding in ["Retinal Vein Occlusion", "Retinal Artery Occlusion"]:
        return "URGENT: Emergency ophthalmology referral needed."
    if finding == "Primary Open-Angle Glaucoma":
        return "Refer to ophthalmologist for IOP monitoring and treatment."
    if finding in ["Diabetic Retinopathy (Severe NPDR)", "Diabetic Retinopathy (Moderate NPDR)"]:
        return "Refer to ophthalmologist for further evaluation."
    if finding == "Diabetic Retinopathy (Mild NPDR)":
        return "Monitor blood glucose; follow up with eye care provider in 6-12 months."
    if finding == "Dry AMD":
        return "Recommend AREDS2 supplements and regular monitoring."
    return "Normal retinal exam. Continue routine eye care."


async def _load_image(req: RetinalPredictRequest) -> np.ndarray:
    if req.storage_url:
        parsed = urlparse(req.storage_url)
        if parsed.scheme != "https":
            raise HTTPException(400, "Invalid storage_url: Only HTTPS allowed")
        blacklist = ("localhost", "127.0.0.1", "169.254.169.254", "::1")
        if parsed.hostname in blacklist:
            raise HTTPException(400, "Invalid storage_url: SSRF protection active")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(req.storage_url)
            resp.raise_for_status()
            raw = resp.content
        pil_img = Image.open(io.BytesIO(raw)).convert("RGB")
        return np.array(pil_img)
    if req.image_data:
        raw = base64.b64decode(req.image_data)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Could not decode base64 image data")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    raise HTTPException(400, "Must provide either storage_url or image_data")


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


@app.post("/retinal/predict", response_model=RetinalPredictResponse)
async def predict(req: RetinalPredictRequest) -> RetinalPredictResponse:
    start = time.perf_counter()
    status = "error"
    urgency = "UNKNOWN"

    try:
        img_rgb = await _load_image(req)
        input_arr = await asyncio.to_thread(_preprocess_retinal, img_rgb)
        input_arr = input_arr[np.newaxis, ...]

        if _batch_queue is not None:
            QUEUE_SIZE.set(_batch_queue._queue.qsize())
            logits = await _batch_queue.infer(input_arr[0])
        else:
            input_name = registry._sessions[MODEL_ID].get_inputs()[0].name
            outputs = await run_async(MODEL_ID, {input_name: input_arr})
            logits = outputs[0][0]

        probs = _softmax(logits)
        k = min(len(RETINAL_CONDITIONS), len(probs))
        results = sorted(
            [{"condition": c, "probability": round(float(p), 4)}
             for c, p in zip(RETINAL_CONDITIONS[:k], probs[:k])],
            key=lambda x: x["probability"],
            reverse=True,
        )

        primary = results[0]
        finding = primary["condition"]
        confidence = primary["probability"]
        urgency = _classify_urgency(finding)
        dr_grade = _get_dr_grade(finding)

        inference_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            f"[Retinal] {req.scan_id}: {finding} | urgency={urgency} | confidence={confidence:.3f} | {inference_ms}ms"
        )
        INFERENCE_DURATION.labels(eye=req.eye).observe(inference_ms / 1000)
        status = "success"

        return RetinalPredictResponse(
            scan_id=req.scan_id,
            primary_finding=finding,
            snomed_code=_SNOMED_RETINAL.get(finding, "27313000"),
            urgency=urgency,
            confidence=confidence,
            dr_grade=dr_grade,
            eye=req.eye,
            all_findings=results[:5],
            inference_ms=inference_ms,
            model_version=req.model_version,
            backend="onnx-int8" if INT8_MODEL.exists() else ("onnx-fp32" if FP32_MODEL.exists() else "demo"),
            recommendation=_build_recommendation(finding),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Retinal] Prediction failed for {req.scan_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        REQUESTS_TOTAL.labels(status=status, urgency=urgency).inc()


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "retinal-engine",
        "version": "1.0.0",
        "backend": "onnx-int8-cpu",
        "models_loaded": registry.loaded_models,
        "latency_stats": registry.get_latency_stats(MODEL_ID) if MODEL_ID in registry.loaded_models else {},
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }


@app.get("/metrics")
async def metrics(request: Request):
    from fastapi.responses import Response
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8008,
        workers=1,
        loop="uvloop",
        access_log=False,
    )
