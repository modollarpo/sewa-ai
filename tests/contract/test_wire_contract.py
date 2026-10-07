"""Live wire-contract tests: the real FastAPI services over HTTP.

This is the leg the audit found missing (E-01…E-04 / N29): every orchestrator
call was mocked, so the backend tests stayed green while the real pipeline
422'd on every stage. These tests read backend/src/services/wire-contract.json
— the single source of truth consumed by the TypeScript side (wireContract.ts)
— and check it against running services.

Run (CI does this for you):

    MODEL_CACHE=/tmp/models uvicorn main:app --port 8000 &   # ai-services/triage
    MODEL_CACHE=/tmp/models uvicorn main:app --port 8002 &   # ai-services/uncertainty
    uvicorn main:app --port 8003 &                            # ai-services/metacognition
    pytest tests/contract/test_wire_contract.py -v

`vlm` is included: CI installs its requirements (audit N19: `openai` at module
scope) and the service runs in cpu-template mode without Azure credentials. The
Azure generation path itself needs credentials and is not exercised here.
"""

from __future__ import annotations

import base64
import json
import os
import struct
import zlib
from pathlib import Path
from typing import Any

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = json.loads(
    (ROOT / "backend" / "src" / "services" / "wire-contract.json").read_text(encoding="utf-8")
)
SERVICES: dict[str, Any] = CONTRACT["services"]
LIVE = [name for name, svc in SERVICES.items() if svc["live"]]
IMAGE_PLACEHOLDER = "@synthetic_png_b64"

TRIAGE_BACKENDS = {"onnx-int8-cpu", "onnx-fp32-cpu", "demo"}
ATTRIBUTION_METHODS = {"demo-random-attribution", "onnx-occlusion-finite-difference"}


# ── helpers ──────────────────────────────────────────────────────────────────
def base_url(service: str) -> str:
    svc = SERVICES[service]
    return os.environ.get(svc["baseUrlEnv"], svc["defaultBaseUrl"])


def png_b64(width: int = 96, height: int = 96) -> str:
    """Deterministic grayscale PNG (no Pillow dependency in the test env)."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    row = b"\x00" + bytes((x * 255 // max(width - 1, 1)) for x in range(width))
    raw = row * height
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    return base64.b64encode(png).decode("ascii")


def sample_payload(service: str, image_b64: str) -> dict[str, Any]:
    payload = dict(SERVICES[service]["request"]["pipelineSample"])
    for key, value in list(payload.items()):
        if value == IMAGE_PLACEHOLDER:
            payload[key] = image_b64
    return payload


def type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    return "object"


def assert_declared_fields(service: str, data: Any) -> None:
    """Every declared field present with a compatible type, and nothing else."""
    assert isinstance(data, dict), f"{service}: response is not an object: {data!r}"
    fields: dict[str, str] = SERVICES[service]["response"]["fields"]
    missing = sorted(set(fields) - set(data))
    extra = sorted(set(data) - set(fields))
    assert not missing, f"{service}: response missing declared fields {missing}"
    assert not extra, f"{service}: response returned undeclared fields {extra} (contract drift)"

    for key, declared in fields.items():
        value = data[key]
        nullable = "null" in declared.split("|")
        if value is None:
            assert nullable, f"{service}.{key} is null but contract declares {declared}"
            continue
        base = declared.replace("|null", "")
        actual = type_name(value)
        assert actual == base, f"{service}.{key}: contract says {declared}, got {actual} ({value!r})"


def health_payload(service: str) -> dict[str, Any]:
    url = base_url(service) + SERVICES[service]["healthPath"]
    try:
        response = httpx.get(url, timeout=10.0)
    except httpx.HTTPError as exc:  # pragma: no cover - environment problem
        pytest.fail(
            f"{service} is not reachable at {url} ({exc}). Start it first, e.g.\n"
            f"  cd ai-services/{service} && MODEL_CACHE=/tmp/models "
            f"python -m uvicorn main:app --port <port>"
        )
    assert response.status_code == 200, f"{service} health returned {response.status_code}"
    return response.json()


def post_ok(service: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = base_url(service) + SERVICES[service]["request"]["path"]
    response = httpx.post(url, json=payload, timeout=60.0)
    assert response.status_code == 200, (
        f"{service} rejected the documented pipeline sample with "
        f"{response.status_code}: {response.text[:500]}"
    )
    return response.json()


def assert_rejected(service: str, payload: dict[str, Any], why: str) -> None:
    url = base_url(service) + SERVICES[service]["request"]["path"]
    response = httpx.post(url, json=payload, timeout=60.0)
    # 422 = pydantic request-model rejection, 400 = handler-level validation
    # (missing image, bad storage_url). Anything else means the service either
    # accepted the bad payload (200) or failed (5xx).
    assert response.status_code in {400, 422}, (
        f"{service} ACCEPTED {why} (HTTP {response.status_code}) — {url} no longer "
        f"rejects payloads the contract forbids: {response.text[:300]}"
    )


@pytest.fixture(scope="session")
def image_b64() -> str:
    return png_b64()


# ── health ───────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("service", LIVE)
def test_health_is_reachable(service: str) -> None:
    payload = health_payload(service)
    assert payload.get("status") in {"healthy", "degraded"}
    if service in {"triage", "uncertainty"}:
        assert payload.get("model_loaded") is True, f"{service} health: {payload}"


@pytest.mark.parametrize("service", ["triage", "uncertainty"])
def test_health_backend_label_is_truthful(service: str) -> None:
    """Health must not claim onnx-int8 while demo weights are serving."""
    payload = health_payload(service)
    backend = payload.get("backend")
    assert backend in TRIAGE_BACKENDS, f"{service} health backend={backend!r}"
    assert payload.get("demo_mode") is (backend == "demo"), f"{service} health: {payload}"


# ── documented sample round-trip ─────────────────────────────────────────────
@pytest.mark.parametrize("service", LIVE)
def test_pipeline_sample_is_accepted(service: str, image_b64: str) -> None:
    data = post_ok(service, sample_payload(service, image_b64))
    assert_declared_fields(service, data)


@pytest.mark.parametrize("service", ["triage", "uncertainty"])
def test_response_backend_matches_health(service: str, image_b64: str) -> None:
    data = post_ok(service, sample_payload(service, image_b64))
    health = health_payload(service)
    assert data["backend"] == health["backend"], (
        f"{service}: /health says {health['backend']}, /predict says {data['backend']}"
    )
    assert data["demo_mode"] is (data["backend"] == "demo")


def test_uncertainty_attribution_labels_are_meaningful(image_b64: str) -> None:
    data = post_ok("uncertainty", sample_payload("uncertainty", image_b64))
    assert data["attribution_method"] in ATTRIBUTION_METHODS, data["attribution_method"]
    if data["demo_mode"]:
        assert data["backend"] == "demo"
        assert data["attribution_method"] == "demo-random-attribution"
    else:
        assert data["attribution_method"] == "onnx-occlusion-finite-difference"
    assert isinstance(data["shap_values"], list)
    for item in data["shap_values"]:
        assert set(item) == {"f", "v"}
        assert isinstance(item["f"], str) and isinstance(item["v"], float)


# ── rejection behaviour ──────────────────────────────────────────────────────
def test_missing_required_field_is_rejected(image_b64: str) -> None:
    for service in LIVE:
        payload = sample_payload(service, image_b64)
        required = [k for k, v in SERVICES[service]["request"]["schema"].items() if v == "required"]
        # storage_url/image_data alternatives: drop the first required field
        # that is not the image fallback.
        target = next(k for k in required if k != "image_data")
        payload.pop(target, None)
        assert_rejected(service, payload, f"a payload without required field {target!r}")


def test_lowercase_scan_id_is_rejected(image_b64: str) -> None:
    """Guards the harness-side pattern: `^[A-Z0-9\\-_]{4,64}$`."""
    for service in LIVE:
        payload = sample_payload(service, image_b64)
        payload["scan_id"] = "scan-abc123"
        assert_rejected(service, payload, "a lowercase scan_id")


def test_out_of_range_confidence_is_rejected(image_b64: str) -> None:
    for service in ("uncertainty", "vlm", "metacognition"):
        payload = sample_payload(service, image_b64)
        payload["confidence"] = 1.5
        assert_rejected(service, payload, "confidence=1.5")


def test_invalid_modality_is_rejected(image_b64: str) -> None:
    for service in LIVE:
        payload = sample_payload(service, image_b64)
        payload["modality"] = "ULTRASOUND-X"
        assert_rejected(service, payload, "modality='ULTRASOUND-X'")


def test_payload_without_any_image_is_rejected() -> None:
    """`storage_url` and `image_data` are alternatives; neither may be absent."""
    for service in ("triage", "uncertainty"):
        payload = sample_payload(service, png_b64())
        payload.pop("image_data", None)
        payload.pop("storage_url", None)
        assert_rejected(service, payload, "a payload with no image at all")


# ── the real chain the orchestrator performs ─────────────────────────────────
def test_triage_uncertainty_metacognition_chain(image_b64: str) -> None:
    triage_payload = sample_payload("triage", image_b64)
    triage = post_ok("triage", triage_payload)
    assert_declared_fields("triage", triage)
    assert triage["urgency"] in {"CRITICAL", "URGENT", "NORMAL"}

    uncertainty_payload = sample_payload("uncertainty", image_b64)
    uncertainty_payload["primary_finding"] = triage["primary_finding"]
    uncertainty_payload["confidence"] = triage["confidence"]
    uncertainty = post_ok("uncertainty", uncertainty_payload)
    assert_declared_fields("uncertainty", uncertainty)
    assert uncertainty["mc_passes_used"] >= 1

    vlm_payload = sample_payload("vlm", image_b64)
    vlm_payload["ai_finding"] = triage["primary_finding"]
    vlm_payload["urgency"] = triage["urgency"]
    vlm_payload["confidence"] = triage["confidence"]
    vlm = post_ok("vlm", vlm_payload)
    assert_declared_fields("vlm", vlm)
    assert vlm["findings"].strip() and vlm["impression"].strip()

    metacog_payload = sample_payload("metacognition", image_b64)
    metacog_payload.update(
        {
            "scan_id": triage["scan_id"],
            "primary_finding": triage["primary_finding"],
            "urgency": triage["urgency"],
            "confidence": triage["confidence"],
            "uncertainty_score": uncertainty["uncertainty_score"],
            "shap_values": uncertainty["shap_values"],
            "report_text": f"Contract chain: {vlm['findings']} {vlm['impression']}",
        }
    )
    metacog = post_ok("metacognition", metacog_payload)
    assert_declared_fields("metacognition", metacog)
    assert metacog["scan_id"] == triage["scan_id"]
    assert isinstance(metacog["flags"], list)
    assert 0.0 <= metacog["hallucination_risk"] <= 1.0
    assert 0.0 <= metacog["calibration_score"] <= 1.0


# ── static expectations for the contract itself ──────────────────────────────
def test_vlm_leg_is_live_with_documented_scope() -> None:
    vlm = SERVICES["vlm"]
    assert vlm["live"] is True
    assert "cpu-template" in vlm.get("liveNote", "")
    assert "openai" in vlm.get("liveNote", "")
