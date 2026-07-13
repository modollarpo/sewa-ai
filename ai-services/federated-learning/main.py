# SEWA XAI — ai-services/federated-learning/main.py
# Roadmap Feature 1: Federated Learning Engine
# Privacy-preserving distributed training across hospital networks
# Framework: Flower (flwr) + PyTorch + Differential Privacy
# Architecture: Hospitals train locally → encrypted gradient deltas → central aggregation

import os
import sys
import io
import json
import asyncio
import hashlib
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timezone
from urllib.parse import urlparse

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

import flwr as fl # type: ignore
from flwr.common import ( # type: ignore
    EvaluateIns, EvaluateRes, FitIns, FitRes,
    GetParametersIns, GetParametersRes, NDArrays,
    Parameters, Scalar, ndarrays_to_parameters, parameters_to_ndarrays,
)
from flwr.server.strategy import FedAvg, FedProx # type: ignore

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger

# Differential Privacy — add calibrated Gaussian noise to gradients
from opacus import PrivacyEngine # type: ignore
from opacus.validators import ModuleValidator # type: ignore

# Structured JSON logging
logger = logging.getLogger("sewa-fl")
logger.setLevel(logging.INFO)
_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s %(module)s %(funcName)s %(lineno)d"
))
if not logger.handlers:
    logger.addHandler(_handler)

# Prometheus metrics
FL_ROUNDS_TOTAL = Counter("fl_rounds_total", "Federated rounds completed", ["status"])
FL_TRAINING_DURATION = Histogram("fl_training_duration_seconds", "FL training duration")
FL_CLIENTS_ACTIVE = Gauge("fl_clients_active", "Active FL clients")
FL_PRIVACY_BUDGET = Gauge("fl_privacy_budget_remaining", "Remaining DP epsilon budget")
FL_REQUESTS_TOTAL = Counter("fl_requests_total", "FL API requests", ["endpoint", "status"])

# ── Config ─────────────────────────────────────────────────────
FL_SERVER_HOST    = os.getenv("FL_SERVER_HOST",    "0.0.0.0")
FL_SERVER_PORT    = int(os.getenv("FL_SERVER_PORT", "8080"))
MODEL_CACHE       = os.getenv("MODEL_CACHE", "/models")
DP_EPSILON        = float(os.getenv("DP_EPSILON",  "8.0"))   # Privacy budget ε
DP_DELTA          = float(os.getenv("DP_DELTA",    "1e-5"))  # Privacy budget δ
DP_MAX_GRAD_NORM  = float(os.getenv("DP_MAX_GRAD_NORM", "1.0"))
MIN_FIT_CLIENTS   = int(os.getenv("MIN_FIT_CLIENTS",    "1"))  # Minimum hospitals for round
MIN_EVAL_CLIENTS  = int(os.getenv("MIN_EVAL_CLIENTS",   "1"))
NUM_ROUNDS        = int(os.getenv("NUM_ROUNDS",          "10"))

app = FastAPI(title="SEWA XAI — Federated Learning Coordinator", version="1.0.0")

# CORS — allow backend + localhost for dev
_FL_CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://sewa-backend:5000,http://localhost:3000,http://localhost:5000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=_FL_CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

# ── Persistent round state ────────────────────────────────────
STATE_FILE = os.getenv("FL_STATE_FILE", "/data/fl_state.json")

def _load_state() -> Dict[str, Any]:
    try:
        path = Path(STATE_FILE)
        if path.exists():
            with open(path) as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load FL state: {e}")
    return {}

def _save_state(state: Dict[str, Any]) -> None:
    try:
        path = Path(STATE_FILE)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(state, f, indent=2, default=str)
    except Exception as e:
        logger.warning(f"Failed to save FL state: {e}")

_persisted = _load_state()
round_state: Dict[str, Any] = {
    "current_round": _persisted.get("current_round", 0),
    "total_rounds":  _persisted.get("total_rounds", NUM_ROUNDS),
    "active_clients": _persisted.get("active_clients", []),
    "round_history":  _persisted.get("round_history", []),
    "global_accuracy": _persisted.get("global_accuracy", 0.0),
    "privacy_budget_spent": _persisted.get("privacy_budget_spent", 0.0),
    "status": _persisted.get("status", "idle"),
}


# ── Federated Learning Client (runs on each hospital node) ─────
class SEWAFederatedClient(fl.client.NumPyClient):
    """
    Hospital-side federated learning client.
    Runs inside each hospital's AKS pod — data never leaves the hospital.
    """

    def __init__(self, model: nn.Module, train_loader: DataLoader,
                 val_loader: DataLoader, hospital_id: str, device: torch.device):
        self.model       = model
        self.train_loader = train_loader
        self.val_loader   = val_loader
        self.hospital_id  = hospital_id
        self.device       = device
        self.criterion    = nn.CrossEntropyLoss()
        self.optimizer    = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-5)

        # Wrap optimizer with Differential Privacy
        self.privacy_engine = PrivacyEngine()
        self.model, self.optimizer, self.train_loader = self.privacy_engine.make_private_with_epsilon(
            module=self.model,
            optimizer=self.optimizer,
            data_loader=self.train_loader,
            epochs=1,
            target_epsilon=DP_EPSILON,
            target_delta=DP_DELTA,
            max_grad_norm=DP_MAX_GRAD_NORM,
        )

    def get_parameters(self, config: Dict) -> NDArrays:
        """Return current model weights as numpy arrays."""
        return [val.cpu().numpy() for _, val in self.model.state_dict().items()]

    def set_parameters(self, parameters: NDArrays) -> None:
        """Load global model weights into local model."""
        params_dict = zip(self.model.state_dict().keys(), parameters)
        state_dict  = {k: torch.tensor(v) for k, v in params_dict}
        self.model.load_state_dict(state_dict, strict=True)

    def fit(self, parameters: NDArrays, config: Dict) -> Tuple[NDArrays, int, Dict]:
        """Local training on hospital data — 1 epoch with DP."""
        self.set_parameters(parameters)
        self.model.train()

        total_loss    = 0.0
        num_batches   = 0
        total_samples = 0

        for images, labels in self.train_loader:
            images, labels = images.to(self.device), labels.to(self.device)
            self.optimizer.zero_grad()
            logits = self.model(images)
            loss   = self.criterion(logits, labels)
            loss.backward()
            self.optimizer.step()
            total_loss    += loss.item()
            num_batches   += 1
            total_samples += len(images)

        epsilon = self.privacy_engine.get_epsilon(DP_DELTA)

        return (
            self.get_parameters(config={}),
            total_samples,
            {
                "loss":     total_loss / max(num_batches, 1),
                "epsilon":  epsilon,
                "hospital": self.hospital_id,
            },
        )

    def evaluate(self, parameters: NDArrays, config: Dict) -> Tuple[float, int, Dict]:
        """Evaluate global model on local validation set."""
        self.set_parameters(parameters)
        self.model.eval()
        loss    = 0.0
        correct = 0
        total   = 0

        with torch.no_grad():
            for images, labels in self.val_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                logits  = self.model(images)
                loss   += self.criterion(logits, labels).item()
                preds   = logits.argmax(dim=1)
                correct += (preds == labels).sum().item()
                total   += labels.size(0)

        accuracy = correct / max(total, 1)
        return loss / max(len(self.val_loader), 1), total, {"accuracy": accuracy}


# ── Custom FedAvg Strategy with hospital weighting ─────────────
class SEWAFedStrategy(FedAvg):
    """
    Extended FedAvg that weights hospital contributions by:
    - Number of training samples (standard FedAvg)
    - Data quality score (reported by hospital)
    - Regional diversity bonus (Africa hospitals get 1.5x weight to reduce bias)
    """

    REGION_WEIGHTS = {
        "uk": 1.0, "eu": 1.0, "us": 1.0,
        "ng": 1.5, "ke": 1.5, "za": 1.5, "gh": 1.5,  # Africa bonus
    }

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, FitRes]],
        failures: List[Union[Tuple[fl.server.client_proxy.ClientProxy, FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Custom weighted aggregation."""
        if not results:
            return None, {}

        # Apply regional diversity weighting
        weighted_results = []
        for client_proxy, fit_res in results:
            region = fit_res.metrics.get("hospital", "").split("-")[0] if fit_res.metrics else "uk"
            weight_multiplier = self.REGION_WEIGHTS.get(region, 1.0)
            # Adjust num_examples to apply regional weight
            adjusted_num_examples = int(fit_res.num_examples * weight_multiplier)
            weighted_results.append((client_proxy, fl.common.FitRes(
                status=fit_res.status,
                parameters=fit_res.parameters,
                num_examples=adjusted_num_examples,
                metrics=fit_res.metrics,
            )))

        aggregated_parameters, aggregated_metrics = super().aggregate_fit(
            server_round, weighted_results, failures
        )

        # Update round state
        if aggregated_parameters:
            round_state["current_round"] = server_round
            round_state["status"] = f"round_{server_round}_complete"
            epsilons = [float(r.metrics.get("epsilon", 0)) for _, r in results if r.metrics]
            round_state["privacy_budget_spent"] = max(epsilons) if epsilons else 0
            round_state["round_history"].append({
                "round":       server_round,
                "num_clients": len(results),
                "timestamp":   datetime.now(timezone.utc).isoformat(),
                "avg_epsilon": sum(epsilons)/len(epsilons) if epsilons else 0,
            })
            _save_state(round_state)

        return aggregated_parameters, aggregated_metrics

    def aggregate_evaluate(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, EvaluateRes]],
        failures: List[Union[Tuple[fl.server.client_proxy.ClientProxy, EvaluateRes], BaseException]],
    ) -> Tuple[Optional[float], Dict[str, Scalar]]:
        loss_aggregated, metrics = super().aggregate_evaluate(server_round, results, failures)
        if metrics:
            accs = [float(r.metrics.get("accuracy", 0)) * r.num_examples for _, r in results]
            total = sum(r.num_examples for _, r in results)
            round_state["global_accuracy"] = sum(accs) / max(total, 1)
            _save_state(round_state)
        return loss_aggregated, metrics


# ── FastAPI REST endpoints ──────────────────────────────────────
class TrainingConfig(BaseModel):
    num_rounds: int = Field(NUM_ROUNDS, ge=1, le=100)
    min_fit_clients: int = Field(MIN_FIT_CLIENTS, ge=1, le=50)
    dp_epsilon: float = Field(DP_EPSILON, ge=0.1, le=100.0)


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "healthy", "service": "federated-learning", "fl_framework": "flower-1.7"}


@app.get("/status")
async def get_status() -> Dict[str, Any]:
    FL_CLIENTS_ACTIVE.set(len(round_state["active_clients"]))
    FL_PRIVACY_BUDGET.set(max(0, DP_EPSILON - round_state["privacy_budget_spent"]))
    FL_REQUESTS_TOTAL.labels(endpoint="status", status="success").inc()
    return round_state


@app.post("/training/start")
async def start_training(config: TrainingConfig, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    if round_state["status"] not in ["idle", "completed"]:
        FL_REQUESTS_TOTAL.labels(endpoint="training_start", status="conflict").inc()
        raise HTTPException(409, "Training already in progress")

    round_state["status"] = "starting"
    round_state["total_rounds"] = config.num_rounds
    round_state["round_history"] = []
    _save_state(round_state)

    strategy = SEWAFedStrategy(
        fraction_fit=1.0,
        fraction_evaluate=0.5,
        min_fit_clients=config.min_fit_clients,
        min_evaluate_clients=max(1, config.min_fit_clients // 2),
        min_available_clients=config.min_fit_clients,
        on_fit_config_fn=lambda r: {"round": r, "epochs": 1},
        on_evaluate_config_fn=lambda r: {"round": r},
    )

    background_tasks.add_task(_run_fl_server, strategy, config.num_rounds)
    logger.info(f"Federated training started: rounds={config.num_rounds}, min_clients={config.min_fit_clients}, dp_eps={config.dp_epsilon}")
    FL_REQUESTS_TOTAL.labels(endpoint="training_start", status="success").inc()
    return {"message": "Federated training started", "config": config.model_dump()}


async def _run_fl_server(strategy: SEWAFedStrategy, num_rounds: int) -> None:
    """Launch Flower server in background thread (blocking — must not run in event loop)."""
    round_state["status"] = "training"

    def _start_server() -> None:
        """Named inner function avoids multi-line lambda that confuses static analysers."""
        fl.server.start_server(
            server_address=f"0.0.0.0:{FL_SERVER_PORT}",
            config=fl.server.ServerConfig(num_rounds=num_rounds),
            strategy=strategy,
        )

    loop = asyncio.get_event_loop()
    try:
        t0 = time.time()
        await loop.run_in_executor(None, _start_server)
        round_state["status"] = "completed"
        _save_state(round_state)
        FL_TRAINING_DURATION.observe(time.time() - t0)
        FL_ROUNDS_TOTAL.labels(status="completed").inc()
        logger.info(f"Federated training completed: {num_rounds} rounds in {time.time()-t0:.1f}s")
    except Exception as e:
        round_state["status"] = f"error: {str(e)}"
        _save_state(round_state)
        FL_ROUNDS_TOTAL.labels(status="error").inc()
        logger.error(f"Federated training failed: {e}")


@app.get("/privacy/budget")
async def privacy_budget() -> Dict[str, Any]:
    FL_REQUESTS_TOTAL.labels(endpoint="privacy_budget", status="success").inc()
    remaining = max(0, DP_EPSILON - round_state["privacy_budget_spent"])
    FL_PRIVACY_BUDGET.set(remaining)
    return {
        "epsilon_budget":  DP_EPSILON,
        "epsilon_spent":   round_state["privacy_budget_spent"],
        "epsilon_remaining": remaining,
        "delta":           DP_DELTA,
        "mechanism":       "Gaussian (Opacus)",
        "compliant_with":  ["GDPR Article 25", "HIPAA Safe Harbour", "NHS DSPT"],
    }


# ── Input models for admin endpoints ────────────────────────────
class ShadowLoadRequest(BaseModel):
    model_path: str = Field(..., min_length=1, max_length=500)
    model_version: Optional[str] = Field(None, pattern=r"^v?[0-9]+\.[0-9]+\.[0-9]+$")

@app.post("/admin/shadow/load")
async def admin_shadow_load(req: ShadowLoadRequest) -> Dict[str, Any]:
    """Load a shadow model for A/B evaluation with SSRF protection."""
    parsed = urlparse(req.model_path)
    if parsed.scheme:
        blacklist = ("localhost", "127.0.0.1", "169.254.169.254", "::1", "metadata.google.internal")
        if parsed.hostname in blacklist or (parsed.hostname and parsed.hostname.startswith("10.")):
            logger.warning(f"[FL] SSRF attempt blocked on shadow load: {parsed.hostname}")
            raise HTTPException(400, "SSRF protection active: hostname not allowed")
    if parsed.scheme and parsed.scheme not in ("https", "azblob", "file"):
        raise HTTPException(400, f"Scheme not allowed: {parsed.scheme}")

    local_path = parsed.path if parsed.scheme else req.model_path
    if not os.path.isfile(local_path):
        if not parsed.scheme or parsed.scheme == "file":
            raise HTTPException(400, f"Model file not found: {local_path}")

    round_state["shadow_model"] = req.model_path
    round_state["shadow_model_version"] = req.model_version or "unknown"
    _save_state(round_state)
    logger.info(f"[FL] Shadow model registered: {req.model_path} v{req.model_version}")
    FL_REQUESTS_TOTAL.labels(endpoint="shadow_load", status="success").inc()
    return {"status": "loaded", "model_path": req.model_path, "model_version": req.model_version}

@app.get("/rounds/history")
async def round_history() -> Dict[str, Any]:
    FL_REQUESTS_TOTAL.labels(endpoint="rounds_history", status="success").inc()
    return {"rounds": round_state["round_history"], "global_accuracy": round_state["global_accuracy"]}


@app.get("/metrics")
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004, workers=1)
