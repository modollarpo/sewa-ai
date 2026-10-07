# SEWA XAI — ai-services/uncertainty/tests/test_shadow_predict.py
#
# INTERNAL SHADOW TEST (non-clinical, engineering verification only).
#
# Exercises the uncertainty engine end-to-end against the built-in DEMO model
# (random weights) to confirm: MC-Dropout -> epistemic/aleatoric estimate ->
# SHAP attribution -> Grad-CAM (ONNX saliency) render -> is_uncertain decision.
# Outputs are SYNTHETIC and must NEVER be used for clinical decision-making
# or as validation evidence.
#
# The DICOM-via-storage_url path is intentionally NOT covered here: the SSRF
# guard (localhost/127.0.0.1/10.x/192.168.x blocked) prevents local testing
# and must only be exercised against a secured store under REC/HRA approval.
import base64
import io

import numpy as np
import cv2
from PIL import Image
import pytest

def _synthetic_scan(size: int = 512) -> str:
    img = np.full((size, size), 30, dtype=np.uint8)
    cv2.circle(img, (size // 2, size // 2), size // 6, 200, -1)
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


@pytest.mark.parametrize(
    "modality,body_part,primary_finding",
    [
        ("CT", "Head", "ICH"),
        ("XR", "Chest", "Pneumothorax"),
    ],
)
def test_shadow_explain_positive_path(client, modality, body_part, primary_finding):
    """Full uncertainty pipeline: image -> MC-Dropout + SHAP + heatmap + decision."""
    resp = client.post(
        "/uncertainty/explain",
        json={
            "scan_id": f"USHADOW-{modality}-{body_part}".upper(),
            "modality": modality,
            "body_part": body_part,
            "primary_finding": primary_finding,
            "confidence": 0.91,
            "image_data": _synthetic_scan(),
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body["uncertainty_score"], float) and 0.0 <= body["uncertainty_score"] <= 1.0
    assert isinstance(body["epistemic_uncertainty"], float)
    assert isinstance(body["aleatoric_uncertainty"], float)
    assert isinstance(body["shap_values"], list) and len(body["shap_values"]) > 0
    assert body["gradcam_base64"]  # heatmap rendered
    assert isinstance(body["is_uncertain"], bool)
    assert isinstance(body["mc_passes_used"], int) and body["mc_passes_used"] > 0
    assert isinstance(body["inference_ms"], int)
    assert body["backend"] in {"demo", "onnx-fp32-cpu", "onnx-int8-cpu"}
    print(
        f"[shadow-unc] {modality}/{body_part}: epistemic={body['epistemic_uncertainty']:.3f} "
        f"aleatoric={body['aleatoric_uncertainty']:.3f} uncertain={body['is_uncertain']} "
        f"({body['inference_ms']}ms)"
    )


def test_shadow_health_reports_model_loaded(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["model_loaded"] is True
    assert data["status"] == "healthy"
    print(f"[shadow-unc] /health: {data['status']}, model_loaded={data['model_loaded']}")


def test_shadow_metrics_endpoint(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "uncertainty_" in r.text
    print(f"[shadow-unc] /metrics: {len(r.text)} bytes of prometheus exposition")
