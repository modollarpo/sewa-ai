"""
SEWA XAI — ai-services/triage/registry_api.py
API endpoints for model registry, versioning, rollback, and A/B testing
"""
from __future__ import annotations

import os
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from model_registry import model_registry

logger = logging.getLogger("sewa-triage-registry-api")

router = APIRouter(prefix="/registry", tags=["model-registry"])


class RegisterVersionRequest(BaseModel):
    version: str
    model_path: str
    metadata: Optional[Dict[str, Any]] = None


class PromoteRequest(BaseModel):
    version: str
    traffic_percentage: int = Field(default=100, ge=0, le=100)


class RollbackRequest(BaseModel):
    to_version: Optional[str] = None


class ABTestRequest(BaseModel):
    champion: str
    challenger: str
    traffic_split: int = Field(default=10, ge=1, le=50)


@router.get("/versions")
async def list_versions():
    """List all registered model versions."""
    return model_registry.list_versions()


@router.post("/register")
async def register_version(req: RegisterVersionRequest):
    """Register a new model version."""
    try:
        result = model_registry.register_version(req.version, req.model_path, req.metadata)
        return {"status": "registered", "version": req.version, **result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/promote")
async def promote_version(req: PromoteRequest):
    """Promote a version to production."""
    try:
        model_registry.promote_version(req.version, req.traffic_percentage)
        return {"status": "promoted", "version": req.version, "traffic_percentage": req.traffic_percentage}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rollback")
async def rollback(req: RollbackRequest):
    """Rollback to previous or specified version."""
    try:
        result = model_registry.rollback(req.to_version)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ab-test/start")
async def start_ab_test(req: ABTestRequest):
    """Start A/B test between champion and challenger."""
    try:
        result = model_registry.start_ab_test(req.champion, req.challenger, req.traffic_split)
        return {"status": "started", **result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/routing")
async def get_routing():
    """Get current routing decision."""
    version = model_registry.get_routing_decision()
    return {"routed_version": version}
