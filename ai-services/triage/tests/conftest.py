# SEWA XAI — ai-services/triage/tests/conftest.py
# Ensures the demo model is created in a writable temp dir (never /models),
# puts the triage package root on the path, and loads this service's `main`
# under a UNIQUE module name so it never collides with ai-services/uncertainty
# (which also names its module `main`) when both suites run in one process.
import os
import sys
import tempfile
import importlib.util
import pytest

os.environ.setdefault("MODEL_CACHE", tempfile.mkdtemp(prefix="sewa_models_"))
SVC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, SVC_DIR)

_spec = importlib.util.spec_from_file_location("sewa_triage_main", os.path.join(SVC_DIR, "main.py"))
main = importlib.util.module_from_spec(_spec)
sys.modules["sewa_triage_main"] = main
_spec.loader.exec_module(main)

from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c


@pytest.fixture(scope="module")
def svc():
    return main
