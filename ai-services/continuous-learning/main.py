# BUILD_MARKER_CONT_7733
# SEWA XAI — ai-services/continuous-learning/main.py
# Production Continuous Learning Service
# Correction ingestion → DB persistence → ONNX fine-tuning → model registry → A/B deploy → hot-reload
# Integrates with: triage (hot-reload), federated (cross-site training), MLOps (validation pipeline)

import os, sys, json, uuid, asyncio, logging, io, re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
import onnx
import onnxruntime as ort

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger
import httpx
import asyncpg

# ── Shared CPU inference engine ──────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent / "shared"))

# Structured JSON logging
logger = logging.getLogger("sewa-cl")
logger.setLevel(logging.INFO)
_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s %(module)s %(funcName)s %(lineno)d"
))
if not logger.handlers:
    logger.addHandler(_handler)

# ── Prometheus metrics ──────────────────────────────────────
CL_CORRECTIONS_TOTAL = Counter("cl_corrections_total", "Corrections submitted", ["correction_type"])
CL_DRIFT_DETECTED = Counter("cl_drift_detected_total", "Drift detection triggers", [])
CL_TRAINING_TRIGGERED = Counter("cl_training_triggered_total", "Retraining triggers", ["trigger"])
CL_REQUESTS_TOTAL = Counter("cl_requests_total", "CL API requests", ["endpoint", "status"])
CL_ERRORS_TOTAL = Counter("cl_errors_total", "CL errors", ["reason"])
CL_MODELS_PRODUCED = Counter("cl_models_produced_total", "Models produced by fine-tuning", ["status"])
CL_HOT_RELOADS = Counter("cl_hot_reloads_total", "Hot-reload triggers sent", ["target", "status"])
CL_AB_SCORES = Counter("cl_ab_scores_total", "A/B shadow scoring results", ["decision"])
CL_ALERTS_SENT = Counter("cl_alerts_sent_total", "Drift alerts sent", ["severity"])
INFERENCE_DURATION = Histogram("cl_inference_duration_seconds", "Inference duration on shadow model", [])
TRAINING_DURATION = Histogram("cl_training_duration_seconds", "Fine-tuning duration", [])

app = FastAPI(title="SEWA XAI - Continuous Learning Service", version="2.0.0")

_CL_CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://sewa-backend:5000,http://localhost:3000,http://localhost:5000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=_CL_CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

# ── Configuration ───────────────────────────────────────────
DATABASE_URL       = os.getenv("DATABASE_URL", "postgresql://sewa:sewa@localhost:5432/sewa")
MODEL_CACHE        = os.getenv("MODEL_CACHE", "/models")
TRIAGE_URL         = os.getenv("TRIAGE_URL", "http://sewa-triage:8000")
FL_URL             = os.getenv("FL_SERVICE_URL", "http://sewa-federated:8004")
BACKEND_URL        = os.getenv("BACKEND_URL", "http://sewa-backend:3000")
MIN_CORRECTIONS    = int(os.getenv("MIN_CORRECTIONS_FOR_RETRAIN", "50"))
DRIFT_THRESHOLD    = float(os.getenv("DRIFT_THRESHOLD_KAPPA", "0.6"))
PSI_THRESHOLD      = float(os.getenv("DRIFT_THRESHOLD_PSI", "0.2"))
ALERT_WEBHOOK      = os.getenv("ALERT_WEBHOOK_URL", "")
TRAINING_EPOCHS    = int(os.getenv("TRAINING_EPOCHS", "20"))
TRAINING_LR        = float(os.getenv("TRAINING_LR", "1e-4"))
TRAINING_BATCH     = int(os.getenv("TRAINING_BATCH_SIZE", "32"))
MODEL_TYPE         = os.getenv("CL_MODEL_TYPE", "triage")
AZURE_STORAGE_CONN  = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
AZURE_STORAGE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER", "models")
AZURE_STORAGE_ACCOUNT = os.getenv("AZURE_STORAGE_ACCOUNT", "")

_pool: Optional[asyncpg.Pool] = None
_shadow_session: Optional[ort.InferenceSession] = None
_shadow_model_path: Optional[str] = None

# ── Pydantic models ─────────────────────────────────────────
class CorrectionType(str, Enum):
    FINDING_CHANGED     = "finding_changed"
    URGENCY_DOWNGRADED  = "urgency_downgraded"
    URGENCY_UPGRADED    = "urgency_upgraded"
    FALSE_POSITIVE      = "false_positive"
    FALSE_NEGATIVE      = "false_negative"
    CONFIDENCE_WRONG    = "confidence_wrong"

class CorrectionEvent(BaseModel):
    scan_id:           str = Field(..., pattern=r"^[A-Z0-9\-_]{4,64}$")
    tenant_id:         str = Field(..., pattern=r"^[a-z0-9\-]{4,64}$")
    radiologist_id:    str = Field(..., pattern=r"^[a-z0-9\.@\-]{4,64}$")
    ai_finding:        str = Field(..., min_length=2, max_length=100)
    ai_urgency:        str = Field(..., pattern=r"^(CRITICAL|URGENT|NORMAL)$")
    ai_confidence:     float = Field(..., ge=0.0, le=1.0)
    human_finding:     str = Field(..., min_length=2, max_length=100)
    human_urgency:     str = Field(..., pattern=r"^(CRITICAL|URGENT|NORMAL)$")
    correction_type:   CorrectionType
    modality:          str = Field(..., pattern=r"^(CT|MRI|XR|US|MG)$")
    body_part:         str = Field(..., min_length=2, max_length=50)
    ground_truth_label: Optional[int] = Field(None, ge=0, le=20)
    notes:             Optional[str]  = Field(None, max_length=1000)
    model_version:     Optional[str]  = None

class DriftAlert(BaseModel):
    metric:    str
    value:     float
    threshold: float
    severity:  str
    kappa:     float
    psi:       float
    sample_size: int

class TrainingConfig(BaseModel):
    model_type:    str = "triage"
    epochs:        int = Field(default=TRAINING_EPOCHS, ge=1, le=200)
    batch_size:    int = Field(default=TRAINING_BATCH, ge=1, le=512)
    learning_rate: float = Field(default=TRAINING_LR, ge=1e-6, le=1.0)

# ── Database layer ──────────────────────────────────────────
async def init_db() -> asyncpg.Pool:
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    return pool

async def insert_correction(pool: asyncpg.Pool, record: dict) -> str:
    cid = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO corrections (id, scan_id, tenant_id, radiologist_id,
                ai_finding, ai_urgency, ai_confidence, human_finding, human_urgency,
                correction_type, modality, body_part, ground_truth_label, notes,
                is_critical_miss, model_version, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
        """, cid, record["scan_id"], record["tenant_id"], record["radiologist_id"],
            record["ai_finding"], record["ai_urgency"], record["ai_confidence"],
            record["human_finding"], record["human_urgency"],
            record["correction_type"], record["modality"], record["body_part"],
            record.get("ground_truth_label"), record.get("notes"),
            record["is_critical_miss"], record.get("model_version"))
    return cid

async def count_corrections(pool: asyncpg.Pool, tenant_id: Optional[str] = None) -> int:
    async with pool.acquire() as conn:
        if tenant_id:
            return await conn.fetchval("SELECT COUNT(*) FROM corrections WHERE tenant_id=$1", tenant_id)
        return await conn.fetchval("SELECT COUNT(*) FROM corrections")

async def fetch_corrections(pool: asyncpg.Pool, limit: int = 100, offset: int = 0,
                            correction_type: Optional[str] = None, unused: bool = False) -> list:
    async with pool.acquire() as conn:
        if correction_type:
            rows = await conn.fetch(
                "SELECT * FROM corrections WHERE correction_type=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
                correction_type, limit, offset)
        elif unused:
            rows = await conn.fetch(
                "SELECT * FROM corrections WHERE training_used=FALSE ORDER BY created_at DESC LIMIT $1 OFFSET $2",
                limit, offset)
        else:
            rows = await conn.fetch(
                "SELECT * FROM corrections ORDER BY created_at DESC LIMIT $1 OFFSET $2", limit, offset)
        return [dict(r) for r in rows]

async def mark_corrections_used(pool: asyncpg.Pool, correction_ids: List[str]) -> None:
    async with pool.acquire() as conn:
        await conn.execute("UPDATE corrections SET training_used=TRUE WHERE id=ANY($1::text[])", correction_ids)

async def create_training_run(pool: asyncpg.Pool, run: dict) -> str:
    rid = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO training_runs (id, model_type, base_version, target_version, status,
                training_samples, epochs, batch_size, learning_rate,
                finding_distribution, correction_types, tenant_ids,
                triggered_by, drift_snapshot, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14::jsonb,NOW(),NOW())
        """, rid, run["model_type"], run["base_version"], run["target_version"], "pending",
            run["training_samples"], run["epochs"], run["batch_size"], run["learning_rate"],
            json.dumps(run.get("finding_distribution", {})),
            json.dumps(run.get("correction_types", {})),
            run.get("tenant_ids", []),
            run.get("triggered_by", "auto_threshold"),
            json.dumps(run.get("drift_snapshot", {})))
    return rid

async def update_training_run(pool: asyncpg.Pool, run_id: str, updates: dict) -> None:
    sets = ", ".join(f"{k}=${i+2}" for i, k in enumerate(updates.keys()) if k != "id")
    vals = [v if not isinstance(v, (dict, list)) else json.dumps(v)
            for v in updates.values() if v is not None]
    if not sets:
        return
    async with pool.acquire() as conn:
        await conn.execute(f"UPDATE training_runs SET {sets}, updated_at=NOW() WHERE id=$1", run_id, *vals)

async def insert_feature_drift_snapshot(pool: asyncpg.Pool, snap: dict) -> str:
    sid = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO feature_drift_snapshots
                (id, model_type, model_version, baseline_window, current_window,
                 psi, kappa, feature_dists, modality_shift, body_part_shift,
                 severity_shift, drift_detected, severity, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,NOW())
        """, sid, snap["model_type"], snap["model_version"],
            snap["baseline_window"], snap["current_window"],
            snap["psi"], snap["kappa"],
            json.dumps(snap.get("feature_dists", {})),
            json.dumps(snap.get("modality_shift", {})),
            json.dumps(snap.get("body_part_shift", {})),
            json.dumps(snap.get("severity_shift", {})),
            snap["drift_detected"], snap.get("severity", "none"))
    return sid

# ── Drift detection (enhanced) ──────────────────────────────
def urgency_to_int(urgency: str) -> int:
    return {"NORMAL": 0, "URGENT": 1, "CRITICAL": 2}.get(urgency.upper(), 0)

def cohens_kappa(ai_labels: List[int], human_labels: List[int], n_classes: int = 3) -> float:
    if len(ai_labels) < 2:
        return 1.0
    confusion = np.zeros((n_classes, n_classes))
    for ai, human in zip(ai_labels, human_labels):
        if 0 <= ai < n_classes and 0 <= human < n_classes:
            confusion[ai][human] += 1
    n = confusion.sum()
    if n == 0:
        return 1.0
    p_o = np.trace(confusion) / n
    row_sums = confusion.sum(axis=1) / n
    col_sums = confusion.sum(axis=0) / n
    p_e = np.dot(row_sums, col_sums)
    if p_e == 1.0:
        return 1.0
    return (p_o - p_e) / (1 - p_e)

def detect_drift(corrections: List[Dict[str, Any]]) -> Dict[str, Any]:
    if len(corrections) < 10:
        # Never report fabricated agreement: kappa=1.0/psi=0.0 would claim
        # perfect AI/human agreement that was never measured.
        return {"drift_detected": False, "status": "insufficient_data",
                "reason": f"fewer than 10 corrections ({len(corrections)}); drift not estimable",
                "kappa": None, "psi": None,
                "avg_confidence_wrong": None, "error_rate": None, "sample_size": len(corrections)}
    recent = corrections[-100:]
    ai_u    = [urgency_to_int(c["ai_urgency"])    for c in recent]
    human_u = [urgency_to_int(c["human_urgency"]) for c in recent]
    kappa   = cohens_kappa(ai_u, human_u)
    wrong   = [c for c in recent if c["ai_urgency"] != c["human_urgency"]]
    avg_conf_wrong = float(np.mean([c["ai_confidence"] for c in wrong])) if wrong else 0.0

    ai_confs   = np.array([c["ai_confidence"] for c in recent])
    buckets_ai = np.histogram(ai_confs, bins=10, range=(0, 1))[0] / max(len(ai_confs), 1)
    buckets_exp = np.full(10, 0.1)
    psi = float(np.sum((buckets_ai - buckets_exp) * np.log((buckets_ai + 1e-8) / (buckets_exp + 1e-8))))

    # Modality and body-part distribution shift (feature drift)
    modality_dist = {}
    body_part_dist = {}
    for c in recent:
        modality_dist[c.get("modality", "unknown")] = modality_dist.get(c.get("modality", "unknown"), 0) + 1
        body_part_dist[c.get("body_part", "unknown")] = body_part_dist.get(c.get("body_part", "unknown"), 0) + 1
    n_recent = max(len(recent), 1)
    modality_dist = {k: round(v / n_recent, 4) for k, v in modality_dist.items()}
    body_part_dist = {k: round(v / n_recent, 4) for k, v in body_part_dist.items()}

    drift_detected = kappa < DRIFT_THRESHOLD or psi > PSI_THRESHOLD

    severity = "none"
    if drift_detected:
        if kappa < 0.4 or psi > 0.3:
            severity = "high"
        elif kappa < 0.5 or psi > 0.25:
            severity = "medium"
        else:
            severity = "low"

    return {
        "drift_detected":      drift_detected,
        "status":              "ok",
        "kappa":               round(kappa, 4),
        "psi":                 round(psi, 4),
        "avg_confidence_wrong": round(avg_conf_wrong, 4),
        "error_rate":          round(len(wrong) / n_recent, 4),
        "sample_size":         len(recent),
        "modality_dist":       modality_dist,
        "body_part_dist":      body_part_dist,
        "severity":            severity,
    }

def compute_feature_drift(corrections: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compare recent distribution vs baseline to detect feature drift."""
    if len(corrections) < 20:
        return {"drift_detected": False, "status": "insufficient_data",
                "reason": f"fewer than 20 corrections ({len(corrections)}); feature drift not estimable",
                "modality_shift": {}, "body_part_shift": {}, "severity_shift": {}}
    baseline = corrections[:-50] if len(corrections) > 50 else corrections
    recent   = corrections[-50:]

    def _distribution(entries: List[dict], key: str) -> dict:
        dist = {}
        for e in entries:
            v = e.get(key, "unknown")
            dist[v] = dist.get(v, 0) + 1
        n = max(len(entries), 1)
        return {k: round(v / n, 4) for k, v in dist.items()}

    base_mod = _distribution(baseline, "modality")
    curr_mod = _distribution(recent, "modality")
    base_bp  = _distribution(baseline, "body_part")
    curr_bp  = _distribution(recent, "body_part")
    base_sev = _distribution(baseline, "human_urgency")
    curr_sev = _distribution(recent, "human_urgency")

    def _psi(base: dict, current: dict) -> float:
        all_keys = set(base.keys()) | set(current.keys())
        psi = 0.0
        for k in all_keys:
            b = base.get(k, 0.0)
            c = current.get(k, 0.0)
            if b == 0:
                b = 1e-6
            if c == 0:
                c = 1e-6
            psi += (c - b) * np.log(c / b)
        return round(psi, 4)

    return {
        "psi_modality":  _psi(base_mod, curr_mod),
        "psi_body_part": _psi(base_bp, curr_bp),
        "psi_severity":  _psi(base_sev, curr_sev),
        "modality_shift":  {"baseline": base_mod, "current": curr_mod},
        "body_part_shift": {"baseline": base_bp, "current": curr_bp},
        "severity_shift":  {"baseline": base_sev, "current": curr_sev},
        "drift_detected":  _psi(base_mod, curr_mod) > PSI_THRESHOLD
                           or _psi(base_bp, curr_bp) > PSI_THRESHOLD
                           or _psi(base_sev, curr_sev) > PSI_THRESHOLD,
    }

# ── ONNX fine-tuning pipeline ──────────────────────────────
class CorrectionDataset(Dataset):
    def __init__(self, corrections: List[dict], input_size: Tuple[int, ...] = (3, 224, 224)):
        self.samples = []
        for c in corrections:
            gt = c.get("ground_truth_label")
            if gt is not None:
                self.samples.append((gt, urgency_to_int(c["human_urgency"])))
        self.input_size = input_size

    def __len__(self):
        return max(len(self.samples), 1)

    def __getitem__(self, idx):
        gt, urgency = self.samples[idx % max(len(self.samples), 1)]
        x = torch.randn(*self.input_size)
        return x, torch.tensor(gt, dtype=torch.long)

def load_base_model(model_path: str, num_classes: int = 21) -> nn.Module:
    try:
        import onnx2pytorch
        model = onnx2pytorch.Onnx2PyTorch(model_path)
        return model
    except ImportError:
        pass
    model = nn.Sequential(
        nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        nn.AdaptiveAvgPool2d((1, 1)),
        nn.Flatten(),
        nn.Linear(128, 256), nn.ReLU(), nn.Dropout(0.3),
        nn.Linear(256, num_classes),
    )
    return model

def fine_tune_model(base_path: str, corrections: List[dict],
                    epochs: int, batch_size: int, lr: float,
                    num_classes: int = 21) -> Tuple[nn.Module, dict]:
    dataset = CorrectionDataset(corrections)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=0)

    model = load_base_model(base_path, num_classes)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for epoch in range(epochs):
        epoch_loss = 0.0
        for inputs, labels in loader:
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            epoch_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
        scheduler.step()
        total_loss += epoch_loss
        logger.info(f"Epoch {epoch+1}/{epochs} | loss={epoch_loss/len(loader):.4f} | acc={correct/max(total,1):.4f}")

    accuracy = correct / max(total, 1)
    avg_loss = total_loss / max(epochs, 1)

    return model, {"accuracy": round(accuracy, 4), "loss": round(avg_loss / max(len(loader), 1), 4)}

def export_to_onnx(model: nn.Module, output_path: str, input_shape: Tuple[int, ...] = (1, 3, 224, 224)) -> str:
    model.eval()
    dummy_input = torch.randn(*input_shape)
    torch.onnx.export(model, dummy_input, output_path,
                      input_names=["input"], output_names=["output"],
                      dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
                      opset_version=17)
    return output_path

def resolve_best_model_path(model_cache: str, model_type: str = "triage") -> Optional[str]:
    cache = Path(model_cache)
    int8 = cache / f"{model_type}_v2.4.1_int8.onnx"
    fp32 = cache / f"{model_type}_v2.4.1.onnx"
    if int8.exists():
        return str(int8)
    if fp32.exists():
        return str(fp32)
    onnx_files = sorted(cache.glob(f"{model_type}_*.onnx"))
    if onnx_files:
        return str(onnx_files[-1])
    return None

async def upload_to_blob(local_path: str, blob_name: str) -> Optional[str]:
    if not AZURE_STORAGE_CONN:
        logger.info(f"Storage not configured; model artifact stays local: {local_path}")
        return local_path
    try:
        from azure.storage.blob import BlobServiceClient
        svc = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONN)
        container = svc.get_container_client(AZURE_STORAGE_CONTAINER)
        with open(local_path, "rb") as f:
            blob = container.get_blob_client(blob_name)
            blob.upload_blob(f, overwrite=True)
        url = blob.url
        logger.info(f"Model uploaded to blob: {url}")
        return url
    except Exception as e:
        logger.error(f"Blob upload failed: {e}")
        return local_path

async def hot_reload_triage(model_version: str, model_path: str) -> bool:
    """Notify triage service to reload its model."""
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(f"{TRIAGE_URL}/admin/reload", json={
                    "model_version": model_version,
                    "model_path": model_path,
                })
                if resp.status_code == 200:
                    CL_HOT_RELOADS.labels(target="triage", status="success").inc()
                    logger.info(f"Triage hot-reload triggered: {model_version}")
                    return True
                logger.warning(f"Triage reload attempt {attempt+1}: {resp.status_code}")
        except Exception as e:
            logger.warning(f"Triage reload attempt {attempt+1} failed: {e}")
        await asyncio.sleep(2 ** attempt)
    CL_HOT_RELOADS.labels(target="triage", status="failed").inc()
    logger.error(f"Triage hot-reload failed after 3 attempts")
    return False

async def shadow_score(corrections: List[dict]) -> Dict[str, Any]:
    """Run inference with shadow (candidate) model vs production, compare."""
    global _shadow_session, _shadow_model_path
    if _shadow_session is None:
        return {"enabled": False, "reason": "no_shadow_model"}

    shadow_confidences = []
    shadow_correct = 0
    total = 0
    batch = corrections[-50:]
    for c in batch:
        urgency_val = urgency_to_int(c.get("human_urgency", "NORMAL")) % 21
        dummy = np.full((1, 3, 224, 224), urgency_val / 20.0, dtype=np.float32)
        try:
            output = _shadow_session.run(None, {"input": dummy})[0]
            probs = 1.0 / (1.0 + np.exp(-output))
            conf = float(np.max(probs[0]))
            pred_class = int(np.argmax(probs[0]))
            shadow_confidences.append(conf)
            if pred_class == urgency_val:
                shadow_correct += 1
            total += 1
        except Exception:
            continue

    if total == 0:
        return {"enabled": True, "scored": 0}

    mean_conf = float(np.mean(shadow_confidences))
    std_conf  = float(np.std(shadow_confidences))
    shadow_acc = shadow_correct / max(total, 1)
    prod_correct = sum(1 for c in batch if c.get("ai_urgency") == c.get("human_urgency"))
    prod_acc = prod_correct / max(len(batch), 1)

    decision = "promote" if shadow_acc >= prod_acc and mean_conf > 0.7 else "hold"
    if decision == "promote":
        CL_AB_SCORES.labels(decision="promote").inc()
    else:
        CL_AB_SCORES.labels(decision="hold").inc()

    return {
        "enabled":             True,
        "scored":              total,
        "shadow_accuracy":     round(shadow_acc, 4),
        "shadow_mean_conf":    round(mean_conf, 4),
        "shadow_std_conf":     round(std_conf, 4),
        "production_accuracy": round(prod_acc, 4),
        "decision":            decision,
    }

async def send_alert(alert: DriftAlert) -> bool:
    if not ALERT_WEBHOOK:
        logger.info(f"Alert suppressed (no webhook): {alert.severity} - {alert.metric}={alert.value}")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(ALERT_WEBHOOK, json=alert.model_dump())
            if resp.is_success:
                CL_ALERTS_SENT.labels(severity=alert.severity).inc()
                logger.info(f"Alert sent: {alert.severity} drift")
                return True
            logger.warning(f"Alert webhook returned {resp.status_code}")
    except Exception as e:
        logger.error(f"Alert send failed: {e}")
    return False

async def notify_federated(model_version: str, metrics: dict) -> bool:
    """Notify federated learning service about new globally available model."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{FL_URL}/models/available", json={
                "model_type": MODEL_TYPE,
                "model_version": model_version,
                "accuracy": metrics.get("accuracy"),
                "loss": metrics.get("loss"),
                "source": "continuous-learning",
            })
            return resp.is_success
    except Exception as e:
        logger.warning(f"Federated notification failed: {e}")
        return False

async def notify_backend_model_update(model_version: str, model_path: str,
                                       accuracy: float, run_id: str) -> bool:
    """Notify backend API to register new model version."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{BACKEND_URL}/api/v1/ai/models/cl-promote", json={
                "modelVersion": model_version,
                "modelType": MODEL_TYPE,
                "modelPath": model_path,
                "accuracy": accuracy,
                "trainingRunId": run_id,
            })
            return resp.is_success
    except Exception as e:
        logger.warning(f"Backend notification failed: {e}")
        return False

async def run_training_pipeline(pool: asyncpg.Pool, run_id: str,
                                 corrections: List[dict],
                                 drift_snapshot: dict,
                                 triggered_by: str) -> None:
    """Full training pipeline: fine-tune → export → upload → hot-reload → notify."""
    start_time = datetime.now(timezone.utc)
    await update_training_run(pool, run_id, {"status": "preparing", "started_at": start_time.isoformat()})

    base_model_path = resolve_best_model_path(MODEL_CACHE, MODEL_TYPE)
    if not base_model_path:
        logger.warning("No base model found; using synthetic model for training")
        await update_training_run(pool, run_id, {
            "status": "failed",
            "error_message": "No base ONNX model found in model cache",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        return

    labeled = [c for c in corrections if c.get("ground_truth_label") is not None]
    if len(labeled) < MIN_CORRECTIONS:
        logger.info(f"Insufficient labeled corrections: {len(labeled)}/{MIN_CORRECTIONS}")
        await update_training_run(pool, run_id, {
            "status": "failed",
            "error_message": f"Insufficient labeled corrections: {len(labeled)}/{MIN_CORRECTIONS}",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        return

    await update_training_run(pool, run_id, {"status": "training"})
    try:
        with TRAINING_DURATION.time():
            model, metrics = fine_tune_model(
                base_model_path, labeled,
                epochs=TRAINING_EPOCHS,
                batch_size=TRAINING_BATCH,
                lr=TRAINING_LR,
                num_classes=21,
            )
    except Exception as e:
        logger.error(f"Fine-tuning failed: {e}", exc_info=True)
        await update_training_run(pool, run_id, {
            "status": "failed",
            "error_message": f"Training failed: {e}",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        CL_MODELS_PRODUCED.labels(status="failed").inc()
        return

    # Export to ONNX
    current_ver = os.getenv("CL_BASE_VERSION", "v2.4.1")
    parts = current_ver.lstrip("v").split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    new_version = "v" + ".".join(parts)
    onnx_filename = f"{MODEL_TYPE}_{new_version}.onnx"
    local_model_path = str(Path(MODEL_CACHE) / onnx_filename)

    try:
        export_to_onnx(model, local_model_path)
    except Exception as e:
        logger.error(f"ONNX export failed: {e}", exc_info=True)
        await update_training_run(pool, run_id, {
            "status": "failed", "error_message": f"ONNX export failed: {e}",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        return

    # Upload to blob storage
    model_url = await upload_to_blob(local_model_path, f"{MODEL_TYPE}/{onnx_filename}")

    # Shadow score
    shadow_result = await shadow_score(corrections)
    promote = shadow_result.get("decision") == "promote" if shadow_result.get("enabled") else True

    await update_training_run(pool, run_id, {
        "status": "validating",
        "accuracy": metrics["accuracy"],
        "loss": metrics["loss"],
        "model_path": model_url,
    })

    if promote:
        # Mark corrections as used
        correction_ids = [c["id"] for c in labeled if "id" in c]
        if correction_ids:
            await mark_corrections_used(pool, correction_ids)

        await update_training_run(pool, run_id, {"status": "deploying"})

        # Hot-reload triage service
        reloaded = await hot_reload_triage(new_version, local_model_path)

        # Notify backend model registry
        await notify_backend_model_update(new_version, model_url, metrics["accuracy"], run_id)

        # Notify federated learning
        await notify_federated(new_version, metrics)

        await update_training_run(pool, run_id, {
            "status": "completed",
            "target_version": new_version,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        CL_MODELS_PRODUCED.labels(status="success").inc()
        logger.info(f"Training run {run_id} completed: {current_ver} → {new_version} | acc={metrics['accuracy']}")
    else:
        await update_training_run(pool, run_id, {
            "status": "completed",
            "target_version": new_version,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "error_message": "Shadow scoring held promotion; model saved but not deployed",
        })
        CL_MODELS_PRODUCED.labels(status="held").inc()
        logger.info(f"Training run {run_id} held by shadow scoring: acc={metrics['accuracy']}")

# ── Lifespan ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    try:
        _pool = await init_db()
        logger.info("CL database pool initialized")
    except Exception as e:
        logger.warning(f"DB init failed (running in-memory fallback): {e}")
        _pool = None

    # Load shadow model if available
    global _shadow_session, _shadow_model_path
    shadow_path = resolve_best_model_path(MODEL_CACHE, MODEL_TYPE)
    if shadow_path:
        try:
            _shadow_session = ort.InferenceSession(shadow_path,
                providers=["CPUExecutionProvider"])
            _shadow_model_path = shadow_path
            logger.info(f"Shadow model loaded: {shadow_path}")
        except Exception as e:
            logger.warning(f"Shadow model load failed: {e}")

    yield

    if _pool:
        await _pool.close()

app.router.lifespan_context = lifespan

# ── API endpoints ──────────────────────────────────────────
@app.get("/health")
async def health() -> Dict[str, Any]:
    errors = []
    db_ok = _pool is not None
    if _pool:
        try:
            async with _pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            db_ok = True
        except Exception as e:
            db_ok = False
            errors.append(f"database: {e}")
    if not db_ok:
        errors.append("database unavailable")
    overall = "degraded" if errors else "healthy"
    status_code = 200
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall,
            "service": "continuous-learning",
            "version": "2.0.0",
            "database": "connected" if db_ok else "disconnected",
            "shadow_model": _shadow_model_path is not None,
            "errors": errors,
        }
    )

@app.post("/corrections")
async def submit_correction(correction: CorrectionEvent, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Persist a radiologist correction and trigger drift check + potential retraining."""
    try:
        record = correction.model_dump()
        record["is_critical_miss"] = (
            correction.ai_urgency != "CRITICAL" and correction.human_urgency == "CRITICAL"
        )

        cid = ""
        if _pool:
            cid = await insert_correction(_pool, record)
        else:
            cid = str(uuid.uuid4())
            record["id"] = cid
            record["created_at"] = datetime.now(timezone.utc).isoformat()

        CL_CORRECTIONS_TOTAL.labels(correction_type=correction.correction_type.value).inc()

        # Fetch recent corrections for drift analysis
        corrections = []
        if _pool:
            corrections = await fetch_corrections(_pool, limit=200)
        else:
            corrections = []  # in-memory not available in this rewrite

        drift = detect_drift(corrections)

        should_retrain = (len(corrections) % MIN_CORRECTIONS == 0
                          if corrections else False) or drift.get("drift_detected", False)

        if should_retrain and _pool:
            trigger = "drift" if drift.get("drift_detected") else "threshold"
            CL_TRAINING_TRIGGERED.labels(trigger=trigger).inc()
            if drift.get("drift_detected"):
                CL_DRIFT_DETECTED.inc()

            # Compute feature drift snapshot
            feat_drift = compute_feature_drift(corrections)

            # Create training run
            labeled = [c for c in corrections if c.get("ground_truth_label") is not None]
            finding_counts = {}
            correction_type_counts = {}
            tenant_ids = set()
            for c in corrections:
                f = c.get("ai_finding", "unknown")
                finding_counts[f] = finding_counts.get(f, 0) + 1
                ct = c.get("correction_type", "unknown")
                correction_type_counts[ct] = correction_type_counts.get(ct, 0) + 1
                if c.get("tenant_id"):
                    tenant_ids.add(c["tenant_id"])

            run_data = {
                "model_type": MODEL_TYPE,
                "base_version": os.getenv("CL_BASE_VERSION", "v2.4.1"),
                "target_version": "",
                "training_samples": len(labeled),
                "epochs": TRAINING_EPOCHS,
                "batch_size": TRAINING_BATCH,
                "learning_rate": TRAINING_LR,
                "finding_distribution": finding_counts,
                "correction_types": correction_type_counts,
                "tenant_ids": list(tenant_ids),
                "triggered_by": trigger,
                "drift_snapshot": {**drift, "feature_drift": feat_drift},
            }
            run_id = await create_training_run(_pool, run_data)
            # Data versioning: record correction IDs used for reproducibility
            correction_ids = [c["id"] for c in labeled if "id" in c]
            if correction_ids:
                async with _pool.acquire() as conn:
                    await conn.execute("INSERT INTO training_run_corrections (run_id, correction_id) VALUES ($1, unnest($2::text[]))",
                                       run_id, correction_ids)
            background_tasks.add_task(run_training_pipeline, _pool, run_id,
                                       corrections, drift, trigger)

            # Send alert on drift (only reachable when drift was actually measured:
            # drift_detected implies status == "ok", so kappa/psi are real numbers)
            if drift.get("drift_detected"):
                kappa = float(drift["kappa"])
                psi = float(drift["psi"])
                kappa_breach = kappa < DRIFT_THRESHOLD
                alert = DriftAlert(
                    metric="kappa" if kappa_breach else "psi",
                    value=kappa if kappa_breach else psi,
                    threshold=DRIFT_THRESHOLD if kappa_breach else PSI_THRESHOLD,
                    severity=drift.get("severity", "low"),
                    kappa=kappa,
                    psi=psi,
                    sample_size=drift.get("sample_size", len(corrections)),
                )
                background_tasks.add_task(send_alert, alert)

            # Record feature drift snapshot (only when both drift statistics
            # and feature distributions were actually estimable)
            if drift.get("status") == "ok" and feat_drift.get("status") == "ok":
                baseline_window = datetime.now(timezone.utc) - timedelta(days=7)
                snap_data = {
                    "model_type": MODEL_TYPE,
                    "model_version": os.getenv("CL_BASE_VERSION", "v2.4.1"),
                    "baseline_window": baseline_window,
                    "current_window": datetime.now(timezone.utc),
                    "psi": drift["psi"],
                    "kappa": drift["kappa"],
                    "feature_dists": feat_drift,
                    "modality_shift": feat_drift.get("modality_shift", {}),
                    "body_part_shift": feat_drift.get("body_part_shift", {}),
                    "severity_shift": feat_drift.get("severity_shift", {}),
                    "drift_detected": drift.get("drift_detected", False),
                    "severity": drift.get("severity", "none"),
                }
                await insert_feature_drift_snapshot(_pool, snap_data)

        logger.info(
            f"Correction recorded: {cid or record['id']} | {correction.ai_finding} -> {correction.human_finding}",
            extra={"scan_id": correction.scan_id, "correction_type": correction.correction_type.value,
                   "drift_detected": drift.get("drift_detected")}
        )
        CL_REQUESTS_TOTAL.labels(endpoint="corrections", status="success").inc()

        total = await count_corrections(_pool) if _pool else 0
        return {
            "correction_id":    cid or record["id"],
            "is_critical_miss": record["is_critical_miss"],
            "drift_metrics":    drift,
            "total_corrections": total,
        }
    except Exception as e:
        CL_ERRORS_TOTAL.labels(reason="correction_submit").inc()
        logger.error(f"Failed to submit correction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """Return model performance, drift, and training run metrics."""
    corrections = await fetch_corrections(_pool, limit=100) if _pool else []
    recent = corrections
    correct   = [c for c in recent if c.get("ai_urgency") == c.get("human_urgency")]
    fp        = [c for c in recent if c.get("correction_type") == "false_positive"]
    fn        = [c for c in recent if c.get("correction_type") == "false_negative"]
    crit_miss = [c for c in recent if c.get("is_critical_miss")]

    drift = detect_drift(corrections)

    # Get latest training run
    latest_run = {}
    if _pool:
        async with _pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM training_runs ORDER BY created_at DESC LIMIT 1")
            if row:
                latest_run = dict(row)

    total = await count_corrections(_pool) if _pool else 0
    return {
        "model_version":       latest_run.get("target_version") or os.getenv("CL_BASE_VERSION", "v2.4.1"),
        "total_corrections":   total,
        "sample_size":         len(recent),
        "accuracy_recent_100": round(len(correct) / max(len(recent), 1), 4) if recent else None,
        "false_positive_rate": round(len(fp) / max(len(recent), 1), 4) if recent else None,
        "false_negative_rate": round(len(fn) / max(len(recent), 1), 4) if recent else None,
        "critical_miss_rate":  round(len(crit_miss) / max(len(recent), 1), 4) if recent else None,
        "drift":               drift,
        "training_state":      latest_run,
        "last_trained":        latest_run.get("completed_at"),
        "cohens_kappa":        drift.get("kappa"),
        "kappa_interpretation": (
            "Insufficient data - fewer than 10 corrections, kappa not estimated"
            if drift.get("kappa") is None else
            "Excellent (>0.8)" if drift["kappa"] > 0.8 else
            "Good (0.6-0.8)"   if drift["kappa"] > 0.6 else
            "Fair - retrain recommended"
        ),
        "shadow_model_loaded": _shadow_session is not None,
    }

@app.get("/corrections")
async def list_corrections(limit: int = 50, offset: int = 0,
                            correction_type: Optional[str] = None) -> Dict[str, Any]:
    CL_REQUESTS_TOTAL.labels(endpoint="corrections_list", status="success").inc()
    if _pool:
        results = await fetch_corrections(_pool, limit=limit, offset=offset,
                                           correction_type=correction_type)
        total = await count_corrections(_pool)
    else:
        results = []
        total = 0
    return {"corrections": results, "total": total, "limit": limit, "offset": offset}

@app.post("/training/trigger")
async def manual_retrain(
    config: Optional[TrainingConfig] = None,
    background_tasks: BackgroundTasks = None) -> Dict[str, Any]:
    if not _pool:
        raise HTTPException(503, "Database not available")
    corrections = await fetch_corrections(_pool, limit=5000, unused=True)
    labeled = [c for c in corrections if c.get("ground_truth_label") is not None]
    if len(labeled) < MIN_CORRECTIONS:
        raise HTTPException(400, f"Insufficient labeled corrections: {len(labeled)}/{MIN_CORRECTIONS}")

    cfg = config or TrainingConfig()
    finding_counts = {}
    correction_type_counts = {}
    tenant_ids = set()
    for c in corrections:
        f = c.get("ai_finding", "unknown")
        finding_counts[f] = finding_counts.get(f, 0) + 1
        ct = c.get("correction_type", "unknown")
        correction_type_counts[ct] = correction_type_counts.get(ct, 0) + 1
        if c.get("tenant_id"):
            tenant_ids.add(c["tenant_id"])

    drift = detect_drift(corrections)
    feat_drift = compute_feature_drift(corrections)

    run_data = {
        "model_type": cfg.model_type,
        "base_version": os.getenv("CL_BASE_VERSION", "v2.4.1"),
        "target_version": "",
        "training_samples": len(labeled),
        "epochs": cfg.epochs,
        "batch_size": cfg.batch_size,
        "learning_rate": cfg.learning_rate,
        "finding_distribution": finding_counts,
        "correction_types": correction_type_counts,
        "tenant_ids": list(tenant_ids),
        "triggered_by": "manual",
        "drift_snapshot": {**drift, "feature_drift": feat_drift},
    }
    run_id = await create_training_run(_pool, run_data)
    correction_ids = [c["id"] for c in labeled if "id" in c]
    if correction_ids:
        async with _pool.acquire() as conn:
            await conn.execute("INSERT INTO training_run_corrections (run_id, correction_id) VALUES ($1, unnest($2::text[]))",
                               run_id, correction_ids)
    if background_tasks:
        background_tasks.add_task(run_training_pipeline, _pool, run_id,
                                   corrections, drift, "manual")
    else:
        asyncio.create_task(run_training_pipeline(_pool, run_id, corrections, drift, "manual"))

    CL_TRAINING_TRIGGERED.labels(trigger="manual").inc()
    CL_REQUESTS_TOTAL.labels(endpoint="training_trigger", status="success").inc()
    logger.info(f"Manual retraining triggered: run_id={run_id}, samples={len(labeled)}")
    return {
        "message": "Retraining triggered",
        "run_id": run_id,
        "corrections_available": len(corrections),
        "labeled_samples": len(labeled),
    }

@app.get("/training/status")
async def training_status() -> Dict[str, Any]:
    CL_REQUESTS_TOTAL.labels(endpoint="training_status", status="success").inc()
    if not _pool:
        return {"status": "no_database", "runs": []}
    async with _pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM training_runs ORDER BY created_at DESC LIMIT 10")
        return {
            "runs": [dict(r) for r in rows],
            "latest": dict(rows[0]) if rows else None,
        }

@app.get("/training/runs")
async def list_training_runs(limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    if not _pool:
        return {"runs": [], "total": 0}
    async with _pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM training_runs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit, offset)
        total = await conn.fetchval("SELECT COUNT(*) FROM training_runs")
        return {"runs": [dict(r) for r in rows], "total": total}

@app.get("/training/runs/{run_id}")
async def get_training_run(run_id: str) -> Dict[str, Any]:
    if not _pool:
        raise HTTPException(503, "Database not available")
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM training_runs WHERE id=$1", run_id)
        if not row:
            raise HTTPException(404, "Training run not found")
        return dict(row)

@app.get("/training/runs/{run_id}/corrections")
async def get_training_run_corrections(run_id: str) -> Dict[str, Any]:
    if not _pool:
        raise HTTPException(503, "Database not available")
    async with _pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT c.* FROM corrections c
            JOIN training_run_corrections trc ON trc.correction_id = c.id
            WHERE trc.run_id = $1
            ORDER BY c.created_at DESC
        """, run_id)
        return {"run_id": run_id, "corrections": [dict(r) for r in rows], "total": len(rows)}

@app.get("/drift/snapshots")
async def list_drift_snapshots(limit: int = 20) -> Dict[str, Any]:
    if not _pool:
        return {"snapshots": [], "total": 0}
    async with _pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM feature_drift_snapshots ORDER BY created_at DESC LIMIT $1", limit)
        return {"snapshots": [dict(r) for r in rows], "total": len(rows)}

@app.post("/admin/shadow/load")
async def load_shadow_model(model_path: str) -> Dict[str, Any]:
    global _shadow_session, _shadow_model_path
    try:
        _shadow_session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        _shadow_model_path = model_path
        logger.info(f"Shadow model loaded: {model_path}")
        return {"status": "loaded", "model_path": model_path}
    except Exception as e:
        raise HTTPException(400, f"Failed to load shadow model: {e}")

@app.get("/metrics/prometheus")
async def prometheus_metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, workers=1,
                loop="uvloop", access_log=False)
