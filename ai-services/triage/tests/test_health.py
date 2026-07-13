import os
import sys
import tempfile

# Point demo model creation at a writable temp dir so startup never touches /models.
os.environ["MODEL_CACHE"] = tempfile.mkdtemp()

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import importlib
import main
importlib.reload(main)  # re-read MODEL_CACHE so the demo model lands in the temp dir

from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert "status" in r.json()
