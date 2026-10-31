"""
SEWA XAI — ai-services/triage/drift_integration.py
Integration between triage service and continuous learning drift monitoring
"""
from __future__ import annotations

import os
import json
import logging
import time
from typing import Dict, Any, List
import numpy as np
import httpx

logger = logging.getLogger("sewa-triage-drift")

CL_SERVICE_URL = os.getenv("CL_SERVICE_URL", "http://continuous-learning:8000")


class DriftMonitor:
    def __init__(self):
        self.enabled = os.getenv("ENABLE_DRIFT_MONITORING", "true").lower() == "true"
        self.check_interval = int(os.getenv("DRIFT_CHECK_INTERVAL", "300"))  # 5 minutes
        self.last_check = 0
        self.drift_status = {"drift_detected": False, "severity": "none"}
        
    async def check_drift(self):
        """Check drift status from continuous learning service."""
        if not self.enabled:
            return self.drift_status
        if time.time() - self.last_check < self.check_interval:
            return self.drift_status
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{CL_SERVICE_URL}/drift/status")
                if resp.status_code == 200:
                    data = resp.json()
                    self.drift_status = {
                        "drift_detected": data.get("drift_detected", False),
                        "severity": data.get("severity", "none"),
                        "last_checked": time.time()
                    }
                    self.last_check = time.time()
                    if self.drift_status["drift_detected"]:
                        logger.warning(f"Drift detected: severity={self.drift_status['severity']}")
        except Exception as e:
            logger.debug(f"Drift check failed: {e}")
        return self.drift_status
    
    async def report_prediction(self, scan_id: str, features: np.ndarray, prediction: Dict[str, Any]):
        """Report prediction to continuous learning for drift monitoring."""
        if not self.enabled:
            return
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(f"{CL_SERVICE_URL}/predictions/report", json={
                    "scan_id": scan_id,
                    "features_summary": features.flatten()[:10].tolist(),  # Sample features
                    "prediction": prediction,
                    "timestamp": time.time()
                })
        except Exception as e:
            logger.debug(f"Prediction reporting failed: {e}")
    
    def get_drift_adjustment(self) -> Dict[str, Any]:
        """Get adjustments to apply based on drift status."""
        if self.drift_status.get("drift_detected"):
            severity = self.drift_status.get("severity", "medium")
            if severity == "high":
                return {
                    "increase_review_threshold": True,
                    "require_human_review": True,
                    "confidence_penalty": 0.1
                }
            elif severity == "medium":
                return {
                    "increase_review_threshold": True,
                    "require_human_review": False,
                    "confidence_penalty": 0.05
                }
        return {"increase_review_threshold": False, "require_human_review": False, "confidence_penalty": 0.0}


drift_monitor = DriftMonitor()
