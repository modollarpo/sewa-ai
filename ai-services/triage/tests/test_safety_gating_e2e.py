"""
SEWA XAI — ai-services/triage/tests/test_safety_gating_e2e.py
End-to-end integration tests for AdaBN → RMD → Conformal → Routing flow
"""
import pytest
import numpy as np
from fastapi.testclient import TestClient
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from main import app

client = TestClient(app)


class TestSafetyGatingE2E:
    """End-to-end tests for the complete safety gating pipeline."""
    
    def test_health_shows_safety_gates(self):
        """Health endpoint should report all safety gates."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "safety_gates" in data
        assert "adabn" in data["safety_gates"]
        assert "rmd" in data["safety_gates"]
        assert "conformal" in data["safety_gates"]
        assert "masked_hirescam" in data["safety_gates"]
        assert data["safety_gates"]["conformal_threshold"] == 0.0298
    
    def test_calibration_status_endpoint(self):
        """Calibration status endpoint should be accessible."""
        response = client.get("/calibration/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    def test_calibration_requires_minimum_cases(self):
        """Calibration should reject if fewer than 50 cases."""
        response = client.post("/calibration/site", json={
            "site_id": "test_site",
            "cases": [
                {"scan_id": f"TEST{i}", "features": [0.1]*512, "label": 0, "adjudicated_by": "dr_test"}
                for i in range(10)
            ]
        })
        assert response.status_code == 400
        assert "50 cases" in response.json()["detail"]
    
    def test_calibration_requires_positive_cases(self):
        """Calibration should reject if fewer than 10 positive cases."""
        cases = []
        for i in range(50):
            cases.append({
                "scan_id": f"TEST{i}", 
                "features": [0.1]*512, 
                "label": 0 if i < 45 else 1, 
                "adjudicated_by": "dr_test"
            })
        response = client.post("/calibration/site", json={
            "site_id": "test_site",
            "cases": cases
        })
        assert response.status_code == 400
        assert "10 positive" in response.json()["detail"]
    
    def test_calibration_success(self):
        """Successful calibration with sufficient cases."""
        cases = []
        for i in range(60):
            cases.append({
                "scan_id": f"TEST{i}", 
                "features": [np.random.randn() for _ in range(512)], 
                "label": 1 if i < 15 else 0, 
                "adjudicated_by": "dr_test"
            })
        response = client.post("/calibration/site", json={
            "site_id": "test_site_e2e",
            "cases": cases,
            "target_alpha": 0.05
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "calibrated"
        assert data["conformal_threshold"] == 0.0298
        assert data["conformal_threshold_supremum"] == 0.0753
        assert data["rmd_threshold"] == 52.05
    
    def test_masked_hirescam_endpoint_exists(self):
        """Masked HiResCAM endpoint should exist."""
        # Try without proper image data - should get validation error, not 404
        response = client.post("/explain/masked-hirescam", json={
            "scan_id": "TEST123",
            "modality": "CT",
            "body_part": "head"
        })
        assert response.status_code != 404
    
    def test_safety_gating_flow_integration(self):
        """Test the full flow components are integrated."""
        from safety_gating import safety_orchestrator, AdaptiveBatchNorm, RelativeMahalanobis, ConformalRiskControl
        
        # Test AdaBN
        adabn = AdaptiveBatchNorm()
        adabn.warmup(None)
        assert adabn.stats_updated == True
        
        # Test RMD
        rmd = RelativeMahalanobis()
        feats = np.random.randn(100, 512)
        labels = np.random.randint(0, 2, 100)
        rmd.fit(feats, labels)
        assert rmd.fitted == True
        is_ood, score = rmd.is_ood(np.random.randn(1, 512))
        assert isinstance(is_ood, bool)
        assert isinstance(score, float)
        
        # Test Conformal
        conformal = ConformalRiskControl()
        scores = np.random.rand(100)
        labels_cal = np.random.randint(0, 2, 100)
        conformal.calibrate(scores, labels_cal)
        assert conformal.calibrated == True
        auto_clear, reason = conformal.should_auto_clear(0.01)  # Below threshold
        assert auto_clear == True
        auto_clear2, reason2 = conformal.should_auto_clear(0.5)  # Above threshold
        assert auto_clear2 == False
        
        # Test orchestrator
        result = safety_orchestrator.process(np.random.randn(1, 512), 0.01)
        assert "rmd" in result
        assert "conformal" in result
        assert "safety_gates" in result
        assert set(result["safety_gates"]) == {"adabn", "rmd", "conformal"}
    
    def test_conformal_routing_logic(self):
        """Test conformal routing follows expected logic."""
        from safety_gating import ConformalRiskControl
        conformal = ConformalRiskControl()
        
        # Low score, no OOD -> auto clear
        routing = conformal.get_routing_decision(0.01, 10.0, False)
        assert routing["auto_clear"] == True
        assert routing["route_to_review"] == False
        
        # Low score but OOD -> escalate
        routing = conformal.get_routing_decision(0.01, 60.0, True)
        assert routing["auto_clear"] == False
        assert routing["route_to_review"] == True
        assert any("ood" in r.lower() for r in routing["escalation_reason"])
        
        # High score -> review
        routing = conformal.get_routing_decision(0.5, 10.0, False)
        assert routing["auto_clear"] == False
        assert routing["route_to_review"] == True
