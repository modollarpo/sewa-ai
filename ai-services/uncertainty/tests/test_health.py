import os
import sys
import tempfile

# conftest.py owns MODEL_CACHE + the shared TestClient, so this test just
# reuses the fixture. Kept self-contained for backwards compatibility.
os.environ.setdefault("MODEL_CACHE", tempfile.mkdtemp(prefix="sewa_unc_models_"))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert "status" in r.json()
