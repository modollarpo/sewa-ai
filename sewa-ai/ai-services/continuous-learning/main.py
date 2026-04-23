# SEWA AI — ai-services/continuous-learning/main.py
# Roadmap Feature 7: AI-Assisted Peer Review & Continuous Learning Loop
# Captures radiologist corrections → fine-tuning pipeline → A/B deployment

import os
import json
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from enum import Enum

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(title="SEWA AI — Continuous Learning Service", version="1.0.0")

# Restrict CORS to trusted origins — configurable via env for AKS internal service mesh
_CL_CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://sewa-backend:5000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=_CL_CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

MODEL_CACHE    = os.getenv("MODEL_CACHE", "/models")
TRIAGE_URL     = os.getenv("TRIAGE_URL",  "http://ai-triage:8000")
MIN_CORRECTIONS = int(os.getenv("MIN_CORRECTIONS_FOR_RETRAIN", "50"))

# ── In-memory correction store (production: PostgreSQL) ─────────
correction_store: List[Dict[str, Any]] = []
drift_metrics: Dict[str, Any]          = {"mse": 0.0, "kappa": 1.0, "drift_detected": False}
training_state: Dict[str, Any]         = {"status": "idle", "last_trained": None, "model_version": "v2.4.1"}


class CorrectionType(str, Enum):
    FINDING_CHANGED     = "finding_changed"
    URGENCY_DOWNGRADED  = "urgency_downgraded"
    URGENCY_UPGRADED    = "urgency_upgraded"
    FALSE_POSITIVE      = "false_positive"
    FALSE_NEGATIVE      = "false_negative"
    CONFIDENCE_WRONG    = "confidence_wrong"


class CorrectionEvent(BaseModel):
    scan_id:           str
    tenant_id:         str
    radiologist_id:    str
    ai_finding:        str
    ai_urgency:        str
    ai_confidence:     float
    human_finding:     str
    human_urgency:     str
    correction_type:   CorrectionType
    modality:          str
    body_part:         str
    ground_truth_label: Optional[int] = None
    notes:             Optional[str]  = None


class DriftAlert(BaseModel):
    metric:    str
    value:     float
    threshold: float
    severity:  str


# ── Cohen's Kappa for inter-rater agreement ─────────────────────
def cohens_kappa(ai_labels: List[int], human_labels: List[int], n_classes: int = 3) -> float:
    """
    Compute Cohen's Kappa between AI and radiologist labels.
    κ = (P_o - P_e) / (1 - P_e)
    κ=1: perfect, κ=0: chance, κ<0: worse than chance
    """
    if len(ai_labels) < 2:
        return 1.0

    confusion = np.zeros((n_classes, n_classes))
    for ai, human in zip(ai_labels, human_labels):
        if 0 <= ai < n_classes and 0 <= human < n_classes:
            confusion[ai][human] += 1

    n = confusion.sum()
    if n == 0:
        return 1.0

    p_o = np.trace(confusion) / n   # Observed agreement
    row_sums = confusion.sum(axis=1) / n
    col_sums = confusion.sum(axis=0) / n
    p_e = np.dot(row_sums, col_sums)  # Expected agreement by chance

    if p_e == 1.0:
        return 1.0
    return (p_o - p_e) / (1 - p_e)


def urgency_to_int(urgency: str) -> int:
    return {"NORMAL": 0, "URGENT": 1, "CRITICAL": 2}.get(urgency.upper(), 0)


def detect_drift(corrections: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Population Stability Index (PSI) + confidence drift detection.
    Drift detected if PSI > 0.2 or kappa drops below 0.6.
    """
    if len(corrections) < 10:
        return {"drift_detected": False, "kappa": 1.0, "psi": 0.0}

    recent   = corrections[-50:]
    ai_u     = [urgency_to_int(c["ai_urgency"])    for c in recent]
    human_u  = [urgency_to_int(c["human_urgency"]) for c in recent]
    kappa    = cohens_kappa(ai_u, human_u)

    # Mean confidence of wrong predictions
    wrong = [c for c in recent if c["ai_urgency"] != c["human_urgency"]]
    avg_conf_wrong = np.mean([c["ai_confidence"] for c in wrong]) if wrong else 0.0

    # PSI on confidence distribution
    ai_confs    = np.array([c["ai_confidence"] for c in recent])
    buckets_ai  = np.histogram(ai_confs, bins=10, range=(0,1))[0] / len(ai_confs)
    buckets_exp = np.full(10, 0.1)  # Expected uniform
    psi = np.sum((buckets_ai - buckets_exp) * np.log((buckets_ai + 1e-8) / (buckets_exp + 1e-8)))

    drift_detected = kappa < 0.6 or psi > 0.2

    return {
        "drift_detected":      drift_detected,
        "kappa":               round(kappa, 4),
        "psi":                 round(float(psi), 4),
        "avg_confidence_wrong": round(float(avg_conf_wrong), 4),
        "error_rate":          round(len(wrong) / max(len(recent), 1), 4),
        "sample_size":         len(recent),
    }


async def trigger_retraining(corrections: List[Dict[str, Any]]) -> None:
    """
    Build fine-tuning dataset from corrections and kick off retraining.
    Production: submits Azure ML Pipeline job.
    """
    training_state["status"] = "preparing_dataset"

    # Build dataset from corrections with ground truth
    labeled = [c for c in corrections if c.get("ground_truth_label") is not None]
    if len(labeled) < MIN_CORRECTIONS:
        training_state["status"] = f"insufficient_data: {len(labeled)}/{MIN_CORRECTIONS}"
        return

    training_state["status"] = "fine_tuning"

    # Simulate fine-tuning epochs (production: Azure ML job)
    await asyncio.sleep(2)  # Placeholder for actual training

    # Version bump
    current = training_state["model_version"]
    parts   = current.lstrip("v").split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    new_version = "v" + ".".join(parts)

    training_state.update({
        "status":           "completed",
        "model_version":    new_version,
        "last_trained":     datetime.utcnow().isoformat(),
        "training_samples": len(labeled),
        "prev_version":     current,
    })


# ── API endpoints ───────────────────────────────────────────────
@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "healthy", "service": "continuous-learning"}


@app.post("/corrections")
async def submit_correction(correction: CorrectionEvent, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Radiologist submits a correction to an AI finding."""
    record = correction.dict()
    record["id"]         = str(uuid.uuid4())  # cryptographically random, not MD5
    record["timestamp"]  = datetime.utcnow().isoformat()
    record["is_critical_miss"] = (
        correction.ai_urgency != "CRITICAL" and correction.human_urgency == "CRITICAL"
    )
    correction_store.append(record)

    # Recalculate drift metrics
    drift = detect_drift(correction_store)
    drift_metrics.update(drift)

    # Auto-trigger retraining if enough corrections and drift detected
    if len(correction_store) % MIN_CORRECTIONS == 0 or drift["drift_detected"]:
        background_tasks.add_task(trigger_retraining, correction_store.copy())

    return {
        "correction_id":  record["id"],
        "is_critical_miss": record["is_critical_miss"],
        "drift_metrics":  drift_metrics,
        "total_corrections": len(correction_store),
    }


@app.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """Return model performance and drift metrics."""
    recent     = correction_store[-100:] if correction_store else []
    correct    = [c for c in recent if c["ai_urgency"] == c["human_urgency"]]
    fp         = [c for c in recent if c["correction_type"] == "false_positive"]
    fn         = [c for c in recent if c["correction_type"] == "false_negative"]
    crit_miss  = [c for c in recent if c.get("is_critical_miss")]

    return {
        "model_version":       training_state["model_version"],
        "total_corrections":   len(correction_store),
        "accuracy_recent_100": round(len(correct) / max(len(recent), 1), 4),
        "false_positive_rate": round(len(fp) / max(len(recent), 1), 4),
        "false_negative_rate": round(len(fn) / max(len(recent), 1), 4),
        "critical_miss_rate":  round(len(crit_miss) / max(len(recent), 1), 4),
        "drift":               drift_metrics,
        "training_state":      training_state,
        "last_trained":        training_state.get("last_trained"),
        "cohens_kappa":        drift_metrics.get("kappa", 1.0),
        "kappa_interpretation": (
            "Excellent (>0.8)" if drift_metrics.get("kappa", 1.0) > 0.8 else
            "Good (0.6–0.8)"   if drift_metrics.get("kappa", 1.0) > 0.6 else
            "⚠ Fair — retrain recommended"
        ),
    }


@app.get("/corrections")
async def list_corrections(limit: int = 50, correction_type: Optional[str] = None) -> Dict[str, Any]:
    results = correction_store[-limit:]
    if correction_type:
        results = [c for c in results if c["correction_type"] == correction_type]
    return {"corrections": results, "total": len(correction_store)}


@app.post("/training/trigger")
async def manual_retrain(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    if training_state["status"] == "fine_tuning":
        raise HTTPException(409, "Training already running")
    background_tasks.add_task(trigger_retraining, correction_store.copy())
    return {"message": "Retraining triggered", "corrections_available": len(correction_store)}


@app.get("/training/status")
async def training_status() -> Dict[str, Any]:
    return training_state


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005, workers=1)
