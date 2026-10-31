"""
SEWA XAI — ai-services/triage/model_registry.py
Model registry with versioning, rollback, and A/B capability
"""
from __future__ import annotations

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib

logger = logging.getLogger("sewa-triage-registry")

MODEL_CACHE = Path(os.getenv("MODEL_CACHE", "/models"))
REGISTRY_DIR = MODEL_CACHE / "registry"
REGISTRY_DIR.mkdir(parents=True, exist_ok=True)


class ModelRegistry:
    def __init__(self):
        self.registry_file = REGISTRY_DIR / "model_registry.json"
        self._load_registry()
    
    def _load_registry(self):
        if self.registry_file.exists():
            try:
                with open(self.registry_file) as f:
                    self.registry = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load registry: {e}")
                self.registry = self._default_registry()
        else:
            self.registry = self._default_registry()
            self._save_registry()
    
    def _default_registry(self):
        return {
            "active_version": "v2.4.1",
            "versions": {
                "v2.4.1": {
                    "status": "active",
                    "backend": "onnx-int8-cpu",
                    "deployed_at": datetime.utcnow().isoformat(),
                    "traffic_percentage": 100,
                    "metrics": {"accuracy": 0.807, "auroc": 0.807}
                }
            },
            "ab_tests": [],
            "rollback_history": []
        }
    
    def _save_registry(self):
        try:
            with open(self.registry_file, 'w') as f:
                json.dump(self.registry, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save registry: {e}")
    
    def register_version(self, version: str, model_path: str, metadata: Dict[str, Any] = None):
        """Register a new model version."""
        if not os.path.exists(model_path):
            raise ValueError(f"Model file not found: {model_path}")
        
        # Compute checksum
        sha256_hash = hashlib.sha256()
        with open(model_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        checksum = sha256_hash.hexdigest()
        
        self.registry["versions"][version] = {
            "status": "registered",
            "model_path": model_path,
            "checksum": checksum,
            "registered_at": datetime.utcnow().isoformat(),
            "traffic_percentage": 0,
            "metadata": metadata or {}
        }
        self._save_registry()
        logger.info(f"Registered model version {version} with checksum {checksum[:8]}")
        return self.registry["versions"][version]
    
    def promote_version(self, version: str, traffic_percentage: int = 100):
        """Promote a version to active/production."""
        if version not in self.registry["versions"]:
            raise ValueError(f"Version {version} not registered")
        
        # If promoting to 100%, demote current active
        if traffic_percentage == 100:
            current = self.registry["active_version"]
            if current in self.registry["versions"]:
                self.registry["versions"][current]["status"] = "archived"
                self.registry["versions"][current]["traffic_percentage"] = 0
            self.registry["active_version"] = version
            self.registry["versions"][version]["status"] = "active"
        else:
            self.registry["versions"][version]["status"] = "canary"
        
        self.registry["versions"][version]["traffic_percentage"] = traffic_percentage
        self.registry["versions"][version]["promoted_at"] = datetime.utcnow().isoformat()
        self._save_registry()
        logger.info(f"Promoted {version} to {traffic_percentage}% traffic")
        return True
    
    def rollback(self, to_version: str = None):
        """Rollback to previous version."""
        if to_version is None:
            # Rollback to most recent non-current active
            history = self.registry.get("rollback_history", [])
            if not history:
                raise ValueError("No rollback history available")
            to_version = history[-1]
        
        if to_version not in self.registry["versions"]:
            raise ValueError(f"Version {to_version} not found")
        
        current = self.registry["active_version"]
        self.registry["rollback_history"].append(current)
        
        # Deactivate current
        if current in self.registry["versions"]:
            self.registry["versions"][current]["status"] = "rolled_back"
            self.registry["versions"][current]["traffic_percentage"] = 0
        
        # Activate rollback target
        self.registry["active_version"] = to_version
        self.registry["versions"][to_version]["status"] = "active"
        self.registry["versions"][to_version]["traffic_percentage"] = 100
        self.registry["versions"][to_version]["rolled_back_at"] = datetime.utcnow().isoformat()
        
        self._save_registry()
        logger.info(f"Rolled back from {current} to {to_version}")
        return {"status": "rolled_back", "from": current, "to": to_version}
    
    def start_ab_test(self, champion: str, challenger: str, traffic_split: int = 10):
        """Start A/B test between champion and challenger."""
        if champion not in self.registry["versions"] or challenger not in self.registry["versions"]:
            raise ValueError("Both versions must be registered")
        
        ab_test = {
            "id": f"ab_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "champion": champion,
            "challenger": challenger,
            "traffic_split": traffic_split,  # % to challenger
            "started_at": datetime.utcnow().isoformat(),
            "status": "running",
            "metrics": {"champion": {}, "challenger": {}}
        }
        self.registry["ab_tests"].append(ab_test)
        self.registry["versions"][challenger]["traffic_percentage"] = traffic_split
        self.registry["versions"][challenger]["status"] = "canary"
        self._save_registry()
        logger.info(f"Started A/B test {ab_test['id']}: {challenger} gets {traffic_split}%")
        return ab_test
    
    def get_routing_decision(self):
        """Get routing decision for this request."""
        active = self.registry["active_version"]
        # Check for running A/B tests
        for ab in self.registry.get("ab_tests", []):
            if ab["status"] == "running":
                # Simple random split - in production would use consistent hashing
                import random
                if random.randint(1, 100) <= ab["traffic_split"]:
                    return ab["challenger"]
        return active
    
    def list_versions(self):
        return self.registry


model_registry = ModelRegistry()
