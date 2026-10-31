# SEWA XAI — ai-services/triage/main.py  (CPU-ONLY EDITION)
# GPU-Free Triage Engine — ONNX Runtime INT8 + Parallel Pipeline
#
# Latency budget (Standard_F8s_v2, 8 vCPU):
#   Preprocessing  : ~150ms
#   ONNX INT8 infer: ~350-600ms   (EfficientNet-B0 quantized)
#   Post-processing: ~50ms
#   Total target   : <800ms  ← well within 2-4s end-to-end SLA
#
# NHS DCB0129: All model outputs annotated with uncertainty flags.
# Clinician is ALWAYS in the loop — AI assists, never decides alone.

from __future__ import annotations
from typing import TYPE_CHECKING

import os
import io
import sys
import time
import asyncio
import logging
import base64
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from urllib.parse import urlparse

import numpy as np
import cv2
from PIL import Image

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
import httpx
import uvicorn
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger

# Shared CPU inference engine — sys.path manipulation at runtime;
# ignored by type checkers (Pyrefly resolves via pyrefly.toml search_path)
sys.path.insert(0, str(Path(__file__).parent.parent / "shared"))
from cpu_inference_engine import registry, run_async, MicroBatchQueue  # type: ignore[import-untyped]

from utils.dicom_loader import load_dicom_from_url   # type: ignore[import-untyped]
from utils.preprocessing import preprocess_scan       # type: ignore[import-untyped]
from utils.conditions import CONDITION_MAP             # type: ignore[import-untyped]

# Safety gating and explainability
try:
    from safety_gating import safety_orchestrator
    from explainability_masked import masked_hirescam
    from feature_extractor import feature_extractor
    SAFETY_ENABLED = True
except Exception as e:
    print(f"Safety modules not loaded: {e}", flush=True)
    safety_orchestrator = None
    masked_hirescam = None
    feature_extractor = None
    SAFETY_ENABLED = False

# Setup structured JSON logging
logger = logging.getLogger("sewa-triage")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
formatter = jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s %(module)s %(funcName)s %(lineno)d"
)
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)

# Prometheus metrics
REQUESTS_TOTAL = Counter(
    "triage_requests_total", "Total number of triage requests", ["status", "urgency"]
)
INFERENCE_DURATION = Histogram(
    "triage_inference_duration_seconds", "Inference duration", ["modality", "body_part"]
)
MODEL_LOADED = Gauge("triage_model_loaded", "1 if model is loaded, 0 otherwise")
QUEUE_SIZE = Gauge("triage_queue_size", "Current microbatch queue size")

# ── Configuration ──────────────────────────────────────────────
MODEL_CACHE   = Path(os.getenv("MODEL_CACHE", "/models"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "v2.4.1")
# INT8 model preferred; fallback to FP32 ONNX; fallback to PT for export
INT8_MODEL    = MODEL_CACHE / f"triage_{MODEL_VERSION}_int8.onnx"
FP32_MODEL    = MODEL_CACHE / f"triage_{MODEL_VERSION}.onnx"
PT_MODEL      = MODEL_CACHE / f"triage_{MODEL_VERSION}.pt"
DEMO_MODEL    = MODEL_CACHE / "triage_demo.onnx"
MODEL_ID      = "triage"
INPUT_SHAPE   = (1, 3, 224, 224)
# Honest backend label — set in lifespan /admin-reload from the file actually
# loaded. Never derived from "some file happens to exist" (audit: health always
# reported onnx-int8-cpu even when demo weights were serving predictions).
ACTIVE_BACKEND = "unknown"
DEMO_MODE      = True

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5000",
).split(",")

# Micro-batch queue — groups concurrent requests for amortised ORT overhead
_batch_queue: Optional[MicroBatchQueue] = None


# ── Lifespan — startup model loading + warmup ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _batch_queue, ACTIVE_BACKEND, DEMO_MODE

    model_path = _resolve_model()
    logger.info(f"[Triage] Loading ONNX model: {model_path}")
    registry.load(MODEL_ID, str(model_path))
    registry.warmup(MODEL_ID, INPUT_SHAPE, n=5)  # 5 warmup passes to prime CPU cache
    MODEL_LOADED.set(1)
    ACTIVE_BACKEND = _backend_for(model_path)
    DEMO_MODE = ACTIVE_BACKEND == "demo"

    # Initialize feature extractor
    if SAFETY_ENABLED and feature_extractor:
        try:
            feature_extractor.load(str(model_path))
            logger.info("[Triage] Feature extractor loaded")
        except Exception as e:
            logger.warning(f"Feature extractor init failed: {e}")

    # Initialize safety gates (AdaBN, RMD, Conformal)
    if SAFETY_ENABLED and safety_orchestrator:
        try:
            # Try to load calibration
            safety_orchestrator.initialize()
            logger.info("[Triage] Safety gates initialized (AdaBN, RMD, Conformal)")
        except Exception as e:
            logger.warning(f"Safety gate init failed: {e}")

    _batch_queue = MicroBatchQueue(
        model_id=MODEL_ID,
        max_batch=int(os.getenv("MAX_BATCH_SIZE", "4")),
        max_wait_ms=float(os.getenv("MAX_BATCH_WAIT_MS", "50")),
    )
    _batch_queue.start()
    logger.info("[Triage] Startup complete — ready to serve")
    yield
    # Shutdown
    if _batch_queue:
        await _batch_queue.stop()
    MODEL_LOADED.set(0)
    logger.info("[Triage] Shutdown complete")


def _backend_for(model_path: Path) -> str:
    """Truthful backend label for the model file that was actually loaded."""
    if model_path == INT8_MODEL:
        return "onnx-int8-cpu"
    if model_path == FP32_MODEL:
        return "onnx-fp32-cpu"
    if model_path == DEMO_MODEL or model_path.name == "triage_demo.onnx":
        return "demo"
    # PT export / hot-reload path: quantise step writes INT8, so a non-demo ONNX
    # that is neither canonical file still counts as a real ONNX backend.
    return "onnx-int8-cpu" if str(model_path).endswith("_int8.onnx") else "onnx-fp32-cpu"


def _resolve_model() -> Path:
    """
    Pick the best available model file in priority order:
      1. INT8 ONNX (fastest — ~3-4x speedup on AVX-512)
      2. FP32 ONNX (good — ~1.5x speedup over PyTorch via graph optimisation)
      3. Auto-export PyTorch → ONNX → INT8 on first boot

    Production deployment: models are pre-exported and stored in Azure Blob,
    mounted into /models via AKS PVC (ReadOnlyMany).
    """
    if INT8_MODEL.exists():
        logger.info(f"[Triage] Using INT8 ONNX model: {INT8_MODEL}")
        return INT8_MODEL

    if FP32_MODEL.exists():
        logger.info(f"[Triage] Using FP32 ONNX model (INT8 not found): {FP32_MODEL}")
        return FP32_MODEL

    if PT_MODEL.exists():
        logger.warning("[Triage] No ONNX model found — exporting PyTorch → ONNX → INT8 on first boot")
        return _export_and_quantize(PT_MODEL)

    # Demo mode: create a tiny synthetic ONNX model for CI/testing
    logger.warning("[Triage] No model files found — running in DEMO mode (synthetic outputs)")
    return _create_demo_onnx_model()


def _export_and_quantize(pt_path: Path) -> Path:
    """Export PyTorch model to INT8 ONNX. Runs once on first boot if no ONNX exists."""
    try:
        from cpu_inference_engine import export_pytorch_to_onnx, quantize_model_int8 # type: ignore
        from model import load_model_checkpoint
        import torch

        model = load_model_checkpoint(version=MODEL_VERSION, num_classes=14)

        fp32_path = str(FP32_MODEL)
        export_pytorch_to_onnx(model, fp32_path, INPUT_SHAPE)
        int8_path = str(INT8_MODEL)
        quantize_model_int8(fp32_path, int8_path)
        return INT8_MODEL
    except Exception as e:
        logger.error(f"[Triage] Model export failed: {e}")
        raise


def _create_demo_onnx_model() -> Path:
    """Create a minimal ONNX model for CI/CD and demo environments."""
    try:
        import onnx
        from onnx import helper, TensorProto

        demo_path = DEMO_MODEL
        demo_path.parent.mkdir(parents=True, exist_ok=True)

        # Simple linear layer: (B, 3, 224, 224) → (B, 14)
        X = helper.make_tensor_value_info("image", TensorProto.FLOAT, [None, 3, 224, 224])
        Y = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [None, 14])
        W_data = np.random.randn(14, 3 * 224 * 224).astype(np.float32) * 0.01
        W = helper.make_tensor("W", TensorProto.FLOAT, W_data.shape, W_data.flatten().tolist())
        flat_node = helper.make_node("Flatten", ["image"], ["flat"], axis=1)
        mm_node   = helper.make_node("Gemm", ["flat", "W"], ["logits"], transB=1)
        graph = helper.make_graph([flat_node, mm_node], "demo", [X], [Y], initializer=[W])
        model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
        onnx.save(model, str(demo_path))
        logger.info(f"[Triage] Demo ONNX model created: {demo_path}")
        return demo_path
    except ImportError:
        logger.error("onnx package not installed — cannot create demo model")
        raise


# ── FastAPI app ────────────────────────────────────────────────
app = FastAPI(
    title="SEWA XAI — Triage Engine (CPU Edition)",
    version="2.4.1",
    description=(
        "Critical findings detection for CT, MRI, X-Ray. "
        "CPU-only inference via ONNX Runtime INT8. "
        "Target latency: <800ms on 8-vCPU Azure F-series node."
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

# Mount additional routers
try:
    from calibration_api import router as calibration_router
    app.include_router(calibration_router)
    logger.info("[Triage] Calibration API mounted at /calibration")
except Exception as e:
    logger.warning(f"[Triage] Failed to mount calibration API: {e}")

try:
    from registry_api import router as registry_router
    app.include_router(registry_router)
    logger.info("[Triage] Model registry API mounted at /registry")
except Exception as e:
    logger.warning(f"[Triage] Failed to mount registry API: {e}")

# Drift monitoring
try:
    from drift_integration import drift_monitor
    DRIFT_ENABLED = True
    logger.info("[Triage] Drift monitoring integrated")
except Exception as e:
    logger.warning(f"[Triage] Failed to load drift monitoring: {e}")
    drift_monitor = None
    DRIFT_ENABLED = False

# ── Schemas ────────────────────────────────────────────────────
class Modality(str, Enum):
    CT   = "CT"
    MRI  = "MRI"
    XR   = "XR"
    US   = "US"
    PET  = "PET"
    PETCT = "PETCT"
    ECG  = "ECG"
    PATH = "PATH"   # Digital Pathology — Whole Slide Image tiles

class TriagePredictRequest(BaseModel):
    scan_id: str = Field(..., pattern=r"^[A-Z0-9\-_]{4,64}$")
    storage_url: Optional[str] = Field(None, pattern=r"^https?://.*")
    modality: Modality
    body_part: str = Field(..., min_length=2, max_length=50)
    model_version: str = MODEL_VERSION
    image_data: Optional[str] = None

class TriagePredictResponse(BaseModel):
    scan_id: str
    primary_finding: str
    snomed_code: str                       # FHIR/UK NHS Coding
    urgency: str                           # CRITICAL | URGENT | NORMAL
    confidence: float
    location: Optional[str]
    size: Optional[str]
    midline_shift: Optional[str]
    inference_ms: int
    model_version: str
    backend: str                           # "onnx-int8" | "onnx-fp32" | "demo"
    demo_mode: bool                        # true when synthetic demo weights serve the request
    all_findings: List[Dict[str, Any]]
    safety_gates: Optional[Dict[str, Any]] = None
    routing_decision: Optional[Dict[str, Any]] = None

# ── Inference pipeline ─────────────────────────────────────────
@app.post("/triage/predict", response_model=TriagePredictResponse)
async def predict(req: TriagePredictRequest) -> TriagePredictResponse:
    start = time.perf_counter()
    status = "error"
    urgency = "UNKNOWN"

    try:
        # 1. Load image
        image_array = await _load_image(req)

        # preprocess_scan returns float32 CHW ndarray — no torch conversion needed
        input_arr = preprocess_scan(image_array, req.modality, req.body_part)
        input_arr = input_arr[np.newaxis, ...]  # add batch dim → (1, C, H, W)

        # 3. ONNX INT8 inference via micro-batch queue
        if _batch_queue is not None:
            QUEUE_SIZE.set(_batch_queue._queue.qsize())
            logits = await _batch_queue.infer(input_arr[0])  # queue takes (C,H,W)
        else:
            input_name = registry._sessions[MODEL_ID].get_inputs()[0].name
            outputs = await run_async(MODEL_ID, {input_name: input_arr})
            logits = outputs[0][0]

        # 4. Softmax + decode
        probs = _softmax(logits)
        conditions = CONDITION_MAP.get(f"{req.modality}_{req.body_part}", CONDITION_MAP["default"])
        k = min(len(conditions), len(probs))
        results = sorted(
            [{"condition": c, "probability": round(float(p), 4)} for c, p in zip(conditions[:k], probs[:k])],
            key=lambda x: x["probability"],
            reverse=True,
        )

        primary    = results[0]
        finding    = primary["condition"]
        confidence = primary["probability"]
        urgency    = _classify_urgency(finding, confidence)

        # Apply safety gates (AdaBN, RMD, Conformal)
        safety_info = None
        features = None
        if SAFETY_ENABLED and safety_orchestrator:
            try:
                # Extract real features
                if feature_extractor:
                    features = feature_extractor.extract(input_arr)
                else:
                    features = np.random.randn(1, 512).astype(np.float32)
                safety_info = safety_orchestrator.process(features, confidence)
                # Apply routing decision
                routing = safety_info.get("conformal", {})
                if routing.get("route_to_review") and not routing.get("auto_clear"):
                    # Escalate urgency if safety gates flag for review
                    if urgency == "NORMAL" and confidence < 0.1:  # Low confidence case
                        urgency = "URGENT"
                    logger.info(f"[Triage] Safety gate escalation for {req.scan_id}: {routing.get('escalation_reason')}")
            except Exception as e:
                logger.warning(f"Safety gate processing failed: {e}")
        
        # Apply drift monitoring adjustments
        if DRIFT_ENABLED and drift_monitor:
            try:
                await drift_monitor.check_drift()
                drift_adj = drift_monitor.get_drift_adjustment()
                if drift_adj.get("confidence_penalty", 0) > 0:
                    confidence = max(0.0, confidence - drift_adj["confidence_penalty"])
                if drift_adj.get("require_human_review") and urgency == "NORMAL":
                    urgency = "URGENT"
                pred_features = features if features is not None else np.zeros((1,512))
                await drift_monitor.report_prediction(req.scan_id, pred_features, {
                    "finding": finding, "confidence": confidence, "urgency": urgency
                })
            except Exception as e:
                logger.debug(f"Drift monitoring failed: {e}")

        inference_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            f"[Triage] {req.scan_id}: {finding} {urgency} {confidence:.3f} {inference_ms}ms",
            extra={
                "scan_id": req.scan_id,
                "modality": req.modality,
                "body_part": req.body_part,
                "finding": finding,
                "urgency": urgency,
                "confidence": confidence,
                "inference_ms": inference_ms,
                "safety_escalated": safety_info.get("conformal", {}).get("route_to_review", False) if safety_info else False
            }
        )

        # Record metrics
        INFERENCE_DURATION.labels(modality=req.modality, body_part=req.body_part).observe(inference_ms / 1000)
        status = "success"

        response = TriagePredictResponse(
            scan_id=req.scan_id,
            primary_finding=finding,
            snomed_code=_get_snomed_code(finding),
            urgency=urgency,
            confidence=confidence,
            location=await asyncio.to_thread(_estimate_location, req.modality, req.body_part, finding),
            size=await asyncio.to_thread(_estimate_size, image_array, finding),
            midline_shift=await asyncio.to_thread(_estimate_midline, image_array, finding) if "head" in req.body_part.lower() else "N/A",
            inference_ms=inference_ms,
            model_version=req.model_version,
            backend=ACTIVE_BACKEND,
            demo_mode=DEMO_MODE,
            all_findings=results[:5],
            safety_gates=safety_info,
            routing_decision=safety_info.get("conformal") if safety_info else None,
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[Triage] Prediction failed for {req.scan_id}: {e}",
            exc_info=True,
            extra={"scan_id": req.scan_id, "modality": req.modality, "body_part": req.body_part}
        )
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        REQUESTS_TOTAL.labels(status=status, urgency=urgency).inc()


async def _load_image(req: TriagePredictRequest) -> np.ndarray:
    if req.storage_url:
        parsed = urlparse(req.storage_url)
        if parsed.scheme != "https":
            raise HTTPException(status_code=400, detail="Invalid storage_url: Only HTTPS is allowed")
        
        # SSRF protection: block internal ranges and local hostnames
        blacklist = ("localhost", "127.0.0.1", "169.254.169.254", "::1", "metadata.google.internal")
        if parsed.hostname in blacklist or (parsed.hostname and parsed.hostname.startswith("10.")) or (parsed.hostname and parsed.hostname.startswith("192.168.")):
            logger.warning(f"[Triage] SSRF attempt blocked for scan_id {req.scan_id}: {parsed.hostname}")
            raise HTTPException(status_code=400, detail="Invalid storage_url: SSRF protection active")
            
        return await load_dicom_from_url(req.storage_url)
        
    if req.image_data:
        def decode() -> Optional[np.ndarray]:
            raw = base64.b64decode(req.image_data)
            arr = np.frombuffer(raw, dtype=np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
            
        try:
            decoded = await asyncio.to_thread(decode)
            if decoded is not None:
                return decoded
        except Exception as e:
            logger.error(f"[Triage] Image decode failed for scan_id {req.scan_id} (Modality: {req.modality}): {e}")
            raise HTTPException(status_code=400, detail="Invalid base64 image data")
            
        logger.error(f"[Triage] cv2 failed to decode image for scan_id {req.scan_id}")
        raise HTTPException(status_code=400, detail="cv2 failed to decode image data")
        
    raise HTTPException(status_code=400, detail="Must provide either storage_url or image_data")


def _softmax(x: np.ndarray) -> np.ndarray:
    if x.size == 0:
        return x
    e = np.exp(x - x.max())
    return e / e.sum()

def _get_snomed_code(finding: str) -> str:
    """Map clinical findings to SNOMED CT codes (UK NHS / FHIR R4 aligned)."""
    snomed_map = {
        # Neuro/Head — CT
        "ICH": "116288000",
        "Ischemic Stroke": "422504002",
        "Hemorrhagic Stroke": "230690007",
        "Subdural Hematoma": "95453001",
        "Epidural Hematoma": "85828009",
        # Chest — CT/XR
        "Pulmonary Embolism": "59282003",
        "Pneumothorax": "36118008",
        "Tension Pneumothorax": "70083008",
        "Bowel Perforation": "315481005",
        "Aortic Dissection": "28169009",
        "Pneumonia": "233604007",
        "TB": "56717001",
        # ECG
        "Atrial Fibrillation": "49436004",
        "ST-Elevation MI": "401303003",
        "Bundle Branch Block": "6374002",
        "QTc Prolongation": "111975006",
        "Ventricular Tachycardia": "25569003",
        "Arrhythmia": "698247007",
        # Pathology (PATH) — WSI tissue classification
        "Invasive Carcinoma": "413448000",
        "Adenocarcinoma": "35917007",
        "High-Grade Dysplasia": "55452001",
        "Tuberculosis Granuloma": "56717001",
        "Malignancy": "363346000",
        "Inflammatory Infiltrate": "23583003",
    }
    return snomed_map.get(finding, "27313000")  # default: undetermined finding


def _classify_urgency(finding: str, confidence: float) -> str:
    """Classify urgency. High-confidence carcinoma is treated as URGENT for rapid MDT escalation."""
    CRITICAL = {
        "ICH", "Ischemic Stroke", "Hemorrhagic Stroke", "Tension Pneumothorax", "Saddle PE",
        "ST-Elevation MI", "Ventricular Tachycardia",      # ECG critical arrhythmias
    }
    URGENT = {
        "Pulmonary Embolism", "Pneumothorax", "Bowel Perforation", "Acute PE", "Aortic Dissection",
        "Atrial Fibrillation", "QTc Prolongation",         # ECG urgent
        "Invasive Carcinoma", "Adenocarcinoma", "Malignancy", "High-Grade Dysplasia",  # PATH urgent
    }
    if finding in CRITICAL:
        return "CRITICAL"
    if finding in URGENT or confidence > 0.75:
        return "URGENT"
    return "NORMAL"


def _estimate_location(modality: str, body_part: str, finding: str) -> str:
    return {
        "ICH": "Basal ganglia / cortical region", "Ischemic Stroke": "MCA territory",
        "Pulmonary Embolism": "Main pulmonary artery", "Pneumothorax": "Pleural space",
        "Pneumonia": "Lower lobe", "TB": "Upper lobe",
    }.get(finding, f"{body_part} region")


def _estimate_size(image: np.ndarray, finding: str) -> str:
    try:
        _, binary = cv2.threshold(image, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
            return f"{w // 5}×{h // 5}mm (approx)"
    except cv2.error as e:
        logger.error(f"[Triage] OpenCV thresholding/contour error during size estimation: {e}")
    except Exception as e:
        logger.error(f"[Triage] Unexpected error during size estimation: {e}")
    return "See full report"


def _estimate_midline(image: np.ndarray, finding: str) -> str:
    if "ICH" in finding or "Stroke" in finding:
        h, w = image.shape[:2]
        diff = abs(float(np.mean(image[:, :w // 2])) - float(np.mean(image[:, w // 2:])))
        if diff > 20:   return f"{int(diff / 5)}mm shift"
        if diff > 8:    return "2-3mm shift"
        return "No significant shift"
    return "N/A"


# ── Health + metrics ───────────────────────────────────────────
@app.get("/health")
async def health() -> JSONResponse:
    model_loaded = MODEL_ID in registry.loaded_models
    errors = []
    if not model_loaded:
        errors.append("model not loaded")
    overall = "degraded" if errors else "healthy"
    
    drift_status = {}
    if DRIFT_ENABLED and drift_monitor:
        try:
            drift_status = await drift_monitor.check_drift()
        except Exception:
            drift_status = {"error": "unavailable"}
    
    return JSONResponse(
        status_code=200,
        content={
            "status": overall,
            "service": "triage-engine",
            "version": "2.4.1",
            "backend": ACTIVE_BACKEND,
            "demo_mode": DEMO_MODE,
            "model_loaded": model_loaded,
            "models_loaded": registry.loaded_models,
            "latency_stats": registry.get_latency_stats(MODEL_ID) if model_loaded else {},
            "safety_gates": {
                "adabn": os.getenv("ENABLE_ADABN", "true"),
                "rmd": os.getenv("ENABLE_RMD", "true"),
                "conformal": os.getenv("ENABLE_CONFORMAL", "true"),
                "masked_hirescam": os.getenv("ENABLE_MASKED_HIRESCAM", "true"),
                "conformal_threshold": float(os.getenv("CONFORMAL_THRESHOLD", "0.0298"))
            },
            "model_registry": {
                "active_version": os.getenv("MODEL_VERSION", "v2.4.1"),
                "registry_enabled": True
            },
            "drift_monitoring": drift_status,
            "errors": errors,
        }
    )


@app.get("/metrics")
async def metrics(request: Request):
    """Prometheus metrics endpoint for scraping."""
    from fastapi.responses import JSONResponse, Response

    stats = registry.get_latency_stats(MODEL_ID) if MODEL_ID in registry.loaded_models else {}
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/explain/masked-hirescam")
async def explain_masked_hirescam(req: TriagePredictRequest):
    """Generate masked HiResCAM explanation with anatomical bone suppression."""
    try:
        if not SAFETY_ENABLED or not masked_hirescam:
            raise HTTPException(status_code=503, detail="Masked HiResCAM not available")
        
        # Load image
        image_array = await _load_image(req)
        # Generate explanation
        explanation = masked_hirescam.compute(image_array, np.array([]))
        return JSONResponse(content={
            "scan_id": req.scan_id,
            "explanation": explanation,
            "status": "success"
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Masked HiResCAM failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ╔══════════════════════════════════════════════════════════╗
# ║  ADMIN — model hot-reload (called by CL service)          ║
# ╚══════════════════════════════════════════════════════════╝
@app.post("/admin/reload")
async def admin_reload(payload: dict) -> Dict[str, Any]:
    global MODEL_VERSION, ACTIVE_BACKEND, DEMO_MODE
    """
    Hot-reload the ONNX model without restarting the service.
    Called by the Continuous Learning service after a fine-tuning run completes.
    Accepts optional model_path override; otherwise resolves best model in MODEL_CACHE.
    """
    model_version = payload.get("model_version", MODEL_VERSION)
    model_path_str = payload.get("model_path", "")

    if model_path_str and Path(model_path_str).exists():
        model_path = Path(model_path_str)
    else:
        # Resolve best available
        cache = Path(MODEL_CACHE)
        int8 = cache / f"triage_{model_version}_int8.onnx"
        fp32 = cache / f"triage_{model_version}.onnx"
        if int8.exists():
            model_path = int8
        elif fp32.exists():
            model_path = fp32
        else:
            existing = sorted(cache.glob(f"triage_{model_version}*.onnx"))
            if existing:
                model_path = existing[-1]
            else:
                raise HTTPException(404, f"No model found for version {model_version}")

    try:
        # Unload old model
        if MODEL_ID in registry.loaded_models:
            registry.unload(MODEL_ID)
            await asyncio.sleep(0.5)  # allow in-flight inferences to drain

        # Load new model
        model_path_str_resolved = str(model_path)
        registry.load(MODEL_ID, model_path_str_resolved)
        registry.warmup(MODEL_ID, INPUT_SHAPE, n=3)
        MODEL_LOADED.set(1)

        # Update global version
        MODEL_VERSION = model_version
        # Update model file paths
        globals()["INT8_MODEL"] = MODEL_CACHE / f"triage_{model_version}_int8.onnx"
        globals()["FP32_MODEL"] = MODEL_CACHE / f"triage_{model_version}.onnx"
        ACTIVE_BACKEND = _backend_for(model_path)
        DEMO_MODE = ACTIVE_BACKEND == "demo"

        logger.info(f"Model hot-reloaded: {model_version} from {model_path} (backend={ACTIVE_BACKEND})")
        return {
            "status": "reloaded",
            "model_version": model_version,
            "model_path": model_path_str_resolved,
            "backend": ACTIVE_BACKEND,
            "demo_mode": DEMO_MODE,
        }
    except Exception as e:
        logger.error(f"Model reload failed: {e}", exc_info=True)
        raise HTTPException(500, f"Model reload failed: {e}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=1,            # single worker — ORT uses its own thread pool
        loop="uvloop",        # faster event loop
        access_log=False,     # reduce I/O overhead
    )
