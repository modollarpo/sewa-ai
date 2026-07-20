import base64
from fastapi.testclient import TestClient


def test_invalid_modality_rejected(client):
    """Test that invalid modalities are rejected (Input Validation Gap)."""
    response = client.post(
        "/triage/predict",
        json={
            "scan_id": "TEST-123",
            "modality": "INVALID",
            "body_part": "head",
            "image_data": base64.b64encode(b"fake_image_data").decode('utf-8')
        }
    )
    assert response.status_code == 422
    assert "modality" in response.text
    assert "CT" in response.text


def test_ssrf_protection_http_scheme(client):
    """Test that non-HTTPS URLs are rejected (SSRF/Security Gap)."""
    response = client.post(
        "/triage/predict",
        json={
            "scan_id": "TEST-124",
            "modality": "CT",
            "body_part": "head",
            "storage_url": "http://example.com/dicom.dcm"
        }
    )
    assert response.status_code == 400
    assert "Only HTTPS is allowed" in response.json()["detail"]


def test_ssrf_protection_internal_ip(client):
    """Test that internal IPs are rejected (SSRF/Security Gap)."""
    response = client.post(
        "/triage/predict",
        json={
            "scan_id": "TEST-125",
            "modality": "CT",
            "body_part": "head",
            "storage_url": "https://169.254.169.254/latest/meta-data/"
        }
    )
    assert response.status_code == 400
    assert "SSRF protection active" in response.json()["detail"]


def test_missing_image_payload(client):
    """Test that empty payload without url or data is rejected (Logic Gap)."""
    response = client.post(
        "/triage/predict",
        json={
            "scan_id": "TEST-126",
            "modality": "CT",
            "body_part": "head"
        }
    )
    assert response.status_code == 400
    assert "Must provide either storage_url or image_data" in response.json()["detail"]


def test_invalid_base64_image_data(client):
    """Test that invalid image data raises a 400 rather than silently generating synthetic data (Logic Gap)."""
    response = client.post(
        "/triage/predict",
        json={
            "scan_id": "TEST-127",
            "modality": "CT",
            "body_part": "head",
            "image_data": base64.b64encode(b"not_an_image").decode('utf-8')
        }
    )
    assert response.status_code == 400
    assert "cv2 failed to decode image data" in response.json()["detail"]


def test_snomed_code_generation(svc):
    """Test that FHIR SNOMED codes are properly returned (Compliance Gap)."""
    assert svc._get_snomed_code("ICH") == "116288000"
    assert svc._get_snomed_code("Ischemic Stroke") == "422504002"
    assert svc._get_snomed_code("Unknown Finding") == "27313000"
