# SEWA XAI — ai-services/triage/tests/test_shadow_predict.py
#
# INTERNAL SHADOW TEST (non-clinical, engineering verification only).
#
# This exercises the full inference pipeline end-to-end against the built-in
# DEMO model (random weights) to confirm the service boots and the
# load -> preprocess -> infer -> decode -> response path works for every
# in-scope radiology modality. Outputs are SYNTHETIC and must NEVER be used
# for clinical decision-making or as validation evidence.
#
# For real clinical shadow testing, replace MODEL_CACHE with a directory
# holding trained weights and feed de-identified DICOM via storage_url.
import base64
import io

import numpy as np
import cv2
from PIL import Image
import pytest

def _synthetic_scan(size: int = 512) -> str:
    """Build a deterministic synthetic grayscale 'scan' and return base64 PNG."""
    img = np.full((size, size), 30, dtype=np.uint8)
    cv2.circle(img, (size // 2, size // 2), size // 6, 200, -1)
    cv2.rectangle(img, (size // 4, size // 4), (size * 3 // 4, size * 3 // 4), 120, 3)
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


VALID_URGENCY = {"CRITICAL", "URGENT", "NORMAL"}


@pytest.mark.parametrize(
    "modality,body_part",
    [
        ("CT", "Head"),
        ("CT", "Chest"),
        ("XR", "Chest"),
        ("MRI", "Brain"),
        ("ECG", "Heart"),
    ],
)
def test_shadow_predict_positive_path(client, modality, body_part):
    """Full pipeline: synthetic image -> prediction with valid structure."""
    resp = client.post(
        "/triage/predict",
        json={
            "scan_id": f"SHADOW-{modality}-{body_part}".upper(),
            "modality": modality,
            "body_part": body_part,
            "image_data": _synthetic_scan(),
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["scan_id"] == f"SHADOW-{modality}-{body_part}".upper()
    assert body["primary_finding"]
    assert body["urgency"] in VALID_URGENCY
    assert isinstance(body["confidence"], float) and 0.0 <= body["confidence"] <= 1.0
    assert isinstance(body["all_findings"], list) and len(body["all_findings"]) > 0
    assert body["backend"] in {"demo", "onnx-fp32", "onnx-int8"}
    assert isinstance(body["inference_ms"], int)
    print(
        f"[shadow] {modality}/{body_part}: {body['primary_finding']} "
        f"({body['urgency']}, conf={body['confidence']:.3f}, "
        f"{body['inference_ms']}ms, backend={body['backend']})"
    )


def test_shadow_health_reports_model_loaded(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["model_loaded"] is True
    assert data["status"] == "healthy"
    print(f"[shadow] /health: {data['status']}, backend={data['backend']}, "
          f"model_loaded={data['model_loaded']}")


def test_shadow_metrics_endpoint(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "triage_" in r.text
    print(f"[shadow] /metrics: {len(r.text)} bytes of prometheus exposition")
