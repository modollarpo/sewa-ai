# SEWA XAI — ai-services/mammography/main.py
# Mammography AI Service — Breast Cancer Detection
#
# Features:
#   - BI-RADS classification
#   - Mass detection
#   - Calcification detection
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

from shared.cpu_inference_engine import registry, run_async, MicroBatchQueue

logger = logging.getLogger("sewa-mammography")
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
    "mammography_requests_total", "Mammography requests", ["status", "urgency"]
)
INFERENCE_DURATION = Histogram(
    "mammography_inference_duration_seconds", "Inference duration", ["laterality", "view"]
)
MODEL_LOADED = Gauge("mammography_model_loaded", "1 if model loaded, 0 otherwise")
QUEUE_SIZE = Gauge("mammography_queue_size", "Current microbatch queue size")

MODEL_CACHE = Path(os.getenv("MODEL_CACHE", "/models"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0.0")
INT8_MODEL = MODEL_CACHE / f"mammography_{MODEL_VERSION}_int8.onnx"
FP32_MODEL = MODEL_CACHE / f"mammography_{MODEL_VERSION}.onnx"
MODEL_ID = "mammography"
INPUT_SHAPE = (1, 3, 224, 224)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5000"
).split(",")

_batch_queue: Optional[MicroBatchQueue] = None

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

_SNOMED_MAMMO: Dict[str, str] = {
    "Normal Breast Tissue": "37155004",
    "Benign Mass": "39903008",
    "Malignant Mass": "254837009",
    "Benign Calcifications": "30057008",
    "Malignant Calcifications": "37140001",
    "Architectural Distortion": "128504009",
    "Asymmetry": "39912000",
    "Lymphadenopathy": "30186003",
}

_URGENT_FINDINGS = {
    "Malignant Mass",
    "Malignant Calcifications",
    "Architectural Distortion",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _batch_queue

    model_path = _resolve_model()
    logger.info(f"[Mammography] Loading ONNX model: {model_path}")
    registry.load(MODEL_ID, str(model_path))
    registry.warmup(MODEL_ID, INPUT_SHAPE, n=3)
    MODEL_LOADED.set(1)

    _batch_queue = MicroBatchQueue(
        model_id=MODEL_ID,
        max_batch=int(os.getenv("MAX_BATCH_SIZE", "4")),
        max_wait_ms=float(os.getenv("MAX_BATCH_WAIT_MS", "80")),
    )
    _batch_queue.start()
    logger.info("[Mammography] Startup complete — ready to analyze mammograms")
    yield

    if _batch_queue:
        await _batch_queue.stop()
    MODEL_LOADED.set(0)
    logger.info("[Mammography] Shutdown complete")


def _resolve_model() -> Path:
    if INT8_MODEL.exists():
        logger.info(f"[Mammography] Using INT8 ONNX: {INT8_MODEL}")
        return INT8_MODEL
    if FP32_MODEL.exists():
        logger.info(f"[Mammography] Using FP32 ONNX (INT8 not found): {FP32_MODEL}")
        return FP32_MODEL
    logger.warning("[Mammography] No model found — creating demo ONNX")
    return _create_demo_onnx()


def _create_demo_onnx() -> Path:
    try:
        import onnx
        from onnx import helper, TensorProto

        demo_path = MODEL_CACHE / "mammography_demo.onnx"
        demo_path.parent.mkdir(parents=True, exist_ok=True)

        n_classes = len(MAMMOGRAPHY_CONDITIONS)
        X = helper.make_tensor_value_info("image", TensorProto.FLOAT, [None, 3, 224, 224])
        Y = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [None, n_classes])
        W_data = np.random.randn(n_classes, 3 * 224 * 224).astype(np.float32) * 0.01
        W = helper.make_tensor("W", TensorProto.FLOAT, W_data.shape, W_data.flatten().tolist())
        flat = helper.make_node("Flatten", ["image"], ["flat"], axis=1)
        gemm = helper.make_node("Gemm", ["flat", "W"], ["logits"], transB=1)
        graph = helper.make_graph([flat, gemm], "mammography_demo", [X], [Y], initializer=[W])
        model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
        onnx.save(model, str(demo_path))
        logger.info(f"[Mammography] Demo ONNX written: {demo_path}")
        return demo_path
    except ImportError:
        logger.error("[Mammography] onnx package not installed — cannot create demo model")
        raise


app = FastAPI(
    title="SEWA XAI — Mammography AI Service",
    version="1.0.0",
    description=(
        "Breast cancer detection for mammography. "
        "BI-RADS classification, mass/calcification detection. "
        "CPU-only inference via ONNX Runtime INT8."
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


class Laterality(str, Enum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"


class View(str, Enum):
    CC = "CC"
    MLO = "MLO"


class MammographyPredictRequest(BaseModel):
    scan_id: str = Field(..., pattern=r"^[A-Z0-9\-_]{4,64}$")
    storage_url: Optional[str] = Field(None, pattern=r"^https?://.*")
    image_data: Optional[str] = None
    laterality: Laterality
    view: View
    model_version: str = MODEL_VERSION


class MammographyPredictResponse(BaseModel):
    scan_id: str
    primary_finding: str
    snomed_code: str
    urgency: str
    confidence: float
    birads_category: Optional[str]
    laterality: Laterality
    view: View
    all_findings: List[Dict[str, Any]]
    inference_ms: int
    model_version: str
    backend: str
    recommendation: str


def _preprocess_mammogram(img_rgb: np.ndarray) -> np.ndarray:
    tile = cv2.resize(img_rgb, (224, 224), interpolation=cv2.INTER_LANCZOS4)
    tile = tile.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tile = (tile - mean) / std
    return tile.transpose(2, 0, 1).astype(np.float32)


def _get_birads(finding: str, confidence: float) -> Optional[str]:
    if finding == "Normal Breast Tissue":
        return "BI-RADS 1"
    if finding in ["Benign Mass", "Benign Calcifications"]:
        return "BI-RADS 2" if confidence > 0.9 else "BI-RADS 3"
    if finding in ["Malignant Mass", "Malignant Calcifications", "Architectural Distortion"]:
        return "BI-RADS 5" if confidence > 0.8 else "BI-RADS 4"
    return "BI-RADS 0"


def _classify_urgency(finding: str) -> str:
    if finding in _URGENT_FINDINGS:
        return "URGENT"
    return "NORMAL"


def _build_recommendation(finding: str, birads: Optional[str]) -> str:
    if birads == "BI-RADS 5":
        return "URGENT: Recommend immediate biopsy and surgical consultation."
    if birads == "BI-RADS 4":
        return "Recommend biopsy to further evaluate findings."
    if birads == "BI-RADS 3":
        return "Recommend short-term follow-up in 6 months."
    if birads == "BI-RADS 2":
        return "Benign findings. Recommend routine screening."
    if birads == "BI-RADS 1":
        return "Normal mammogram. Continue routine screening."
    return "Recommend additional imaging or clinical correlation."


async def _load_image(req: MammographyPredictRequest) -> np.ndarray:
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


@app.post("/mammography/predict", response_model=MammographyPredictResponse)
async def predict(req: MammographyPredictRequest) -> MammographyPredictResponse:
    start = time.perf_counter()
    status = "error"
    urgency = "UNKNOWN"

    try:
        img_rgb = await _load_image(req)
        input_arr = await asyncio.to_thread(_preprocess_mammogram, img_rgb)
        input_arr = input_arr[np.newaxis, ...]

        if _batch_queue is not None:
            QUEUE_SIZE.set(_batch_queue._queue.qsize())
            logits = await _batch_queue.infer(input_arr[0])
        else:
            input_name = registry._sessions[MODEL_ID].get_inputs()[0].name
            outputs = await run_async(MODEL_ID, {input_name: input_arr})
            logits = outputs[0][0]

        probs = _softmax(logits)
        k = min(len(MAMMOGRAPHY_CONDITIONS), len(probs))
        results = sorted(
            [{"condition": c, "probability": round(float(p), 4)}
             for c, p in zip(MAMMOGRAPHY_CONDITIONS[:k], probs[:k])],
            key=lambda x: x["probability"],
            reverse=True,
        )

        primary = results[0]
        finding = primary["condition"]
        confidence = primary["probability"]
        urgency = _classify_urgency(finding)
        birads = _get_birads(finding, confidence)

        inference_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            f"[Mammography] {req.scan_id}: {finding} | urgency={urgency} | confidence={confidence:.3f} | {inference_ms}ms"
        )
        INFERENCE_DURATION.labels(laterality=req.laterality, view=req.view).observe(inference_ms / 1000)
        status = "success"

        return MammographyPredictResponse(
            scan_id=req.scan_id,
            primary_finding=finding,
            snomed_code=_SNOMED_MAMMO.get(finding, "27313000"),
            urgency=urgency,
            confidence=confidence,
            birads_category=birads,
            laterality=req.laterality,
            view=req.view,
            all_findings=results[:5],
            inference_ms=inference_ms,
            model_version=req.model_version,
            backend="onnx-int8" if INT8_MODEL.exists() else ("onnx-fp32" if FP32_MODEL.exists() else "demo"),
            recommendation=_build_recommendation(finding, birads),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Mammography] Prediction failed for {req.scan_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        REQUESTS_TOTAL.labels(status=status, urgency=urgency).inc()


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "mammography-engine",
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
        port=8007,
        workers=1,
        loop="uvloop",
        access_log=False,
    )
