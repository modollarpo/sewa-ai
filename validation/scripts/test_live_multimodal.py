"""Test live FastAPI endpoints for Mammography and Retinal services with real weights.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
import sys
import base64
from pathlib import Path
import numpy as np
import cv2
from fastapi.testclient import TestClient

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "ai-services" / "mammography"))

print("Testing Mammography service with real ONNX weights...")
from main import app as mammo_app, lifespan as mammo_lifespan

# Use TestClient with context manager to trigger lifespan
with TestClient(mammo_app) as client:
    health = client.get("/health").json()
    print("Mammography /health:", health)
    assert health["status"] == "healthy", "Expected healthy status"
    assert health["demo_mode"] is False, f"Expected demo_mode False, got {health['demo_mode']}"
    assert "onnx" in health["backend"], f"Expected onnx backend, got {health['backend']}"

    # Create synthetic test image
    img = np.full((224, 224, 3), 128, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)
    b64_img = base64.b64encode(buf).decode("utf-8")

    payload = {
        "scan_id": "MAMMO-001",
        "patient_id": "PT-MAMMO-001",
        "laterality": "LEFT",
        "view": "CC",
        "image_data": b64_img,
    }
    resp = client.post("/mammography/predict", json=payload)
    print("Mammography /predict status:", resp.status_code)
    assert resp.status_code == 200, f"Error: {resp.text}"
    body = resp.json()
    print("Mammography predict body:", {
        "scan_id": body["scan_id"],
        "primary_finding": body["primary_finding"],
        "confidence": body["confidence"],
        "birads_category": body["birads_category"],
        "urgency": body["urgency"],
        "backend": body["backend"],
        "demo_mode": body["demo_mode"],
    })
    assert body["demo_mode"] is False
    assert "onnx" in body["backend"]

print("\nTesting Retinal service with real ONNX weights...")
# Clean up sys.path and modules for retinal
for mod in list(sys.modules.keys()):
    if mod in ("main", "shared", "shared.cpu_inference_engine"):
        del sys.modules[mod]

sys.path.insert(0, str(ROOT / "ai-services" / "retinal"))
from main import app as retinal_app

with TestClient(retinal_app) as client_ret:
    health_ret = client_ret.get("/health").json()
    print("Retinal /health:", health_ret)
    assert health_ret["status"] == "healthy", "Expected healthy status"
    assert health_ret["demo_mode"] is False, f"Expected demo_mode False, got {health_ret['demo_mode']}"
    assert "onnx" in health_ret["backend"], f"Expected onnx backend, got {health_ret['backend']}"

    payload_ret = {
        "scan_id": "RETINAL-001",
        "patient_id": "PT-RETINAL-001",
        "eye": "LEFT",
        "image_data": b64_img,
    }
    resp_ret = client_ret.post("/retinal/predict", json=payload_ret)
    print("Retinal /predict status:", resp_ret.status_code)
    assert resp_ret.status_code == 200, f"Error: {resp_ret.text}"
    body_ret = resp_ret.json()
    print("Retinal predict body:", {
        "scan_id": body_ret["scan_id"],
        "primary_finding": body_ret["primary_finding"],
        "confidence": body_ret["confidence"],
        "dr_grade": body_ret["dr_grade"],
        "urgency": body_ret["urgency"],
        "backend": body_ret["backend"],
        "demo_mode": body_ret["demo_mode"],
    })
    assert body_ret["demo_mode"] is False
    assert "onnx" in body_ret["backend"]

print("\n=== ALL MULTIMODAL SERVICE TESTS PASSED ===")
