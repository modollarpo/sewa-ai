# SEWA AI — Internal Shadow Test (Engineering Verification)

> **NOT CLINICAL VALIDATION. NOT REGULATORY EVIDENCE.**
> This harness is a non-clinical, engineering smoke test that proves the
> inference services **boot and the request pipeline works end-to-end**. It
> uses the built-in **demo model (random weights)**, so every prediction is
> **synthetic** and must never be used for diagnosis, triage, or as validation
> data in any regulatory submission. Genuine clinical shadow testing requires
> trained weights, de-identified DICOM, and REC/HRA/MHRA approval (see
> `docs/clinical-dossier/11_Regulation_Readiness_Assessment.md`).

## Scope

| Service | Status | What is exercised |
|---|---|---|
| `ai-services/triage` | In scope (radiology triage) | `/health`, `/metrics`, `load -> preprocess -> ONNX infer -> decode -> response` across CT/Head, CT/Chest, XR/Chest, MRI/Brain, ECG/Heart; SSRF + input-validation rejection paths |
| `ai-services/uncertainty` | In scope (safety mechanism) | `/health`, `/metrics`, `/uncertainty/explain` -> MC-Dropout -> epistemic/aleatoric -> SHAP -> Grad-CAM (ONNX saliency) -> `is_uncertain` |
| Pathology / Mammography / Retinal | **Future / pipeline only** | Not tested — out of current scope per `09_Future_Services_Pipeline.md` |

## What is deliberately NOT covered here

- **DICOM via `storage_url`**: blocked by the SSRF guard (localhost / 127.0.0.1 /
  10.x / 192.168.x refused by design). Can only be exercised against a secured
  store under REC/HRA approval, not on a developer machine.
- **Diagnostic accuracy**: demo weights are random. No sensitivity/specificity
  claim is possible or implied.

## How to run

```powershell
cd C:\sewa_extract
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install fastapi uvicorn "uvicorn[standard]" `
    onnxruntime onnx numpy opencv-python-headless Pillow pydicom httpx `
    prometheus-client python-json-logger pytest

# One service (typical):
.venv\Scripts\python.exe -m pytest ai-services/triage/tests -v
.venv\Scripts\python.exe -m pytest ai-services/uncertainty/tests -v

# Whole repo (pytest.ini sets --import-mode=importlib to avoid the
# duplicate test-filename collision across ai-services/*/tests):
.venv\Scripts\python.exe -m pytest ai-services/triage/tests ai-services/uncertainty/tests -v
```

> **Dependency note:** the repo's pinned `requirements.txt` targets older
> releases that have no wheels for Python 3.14. On a 3.14 interpreter, install
> the latest-compatible versions (as above). CI runners use the pinned files.
> The `conftest.py` in each service writes the demo model to a temp dir, so it
> never touches `/models`.

## Bugs found and fixed during shadow testing

1. **Triage `predict()` swallowed intended 4xx.** A broad `except Exception`
   caught the `HTTPException(400)` raised for invalid input / SSRF / bad base64
   and re-raised it as **500**. Fixed in `ai-services/triage/main.py` with
   `except HTTPException: raise` before the generic handler. Correct failure
   signalling matters for DCB0129.
2. **Pre-existing tests used lowercase `scan_id`.** The schema requires
   `^[A-Z0-9\-_]{4,64}$` (uppercase), so those payloads were rejected by pydantic
   at 422 and never reached the security checks they claimed to test. Made the
   test `scan_id`s uppercase so the SSRF / validation paths are actually
   exercised.
3. **Cross-service `main` module collision.** Triage and uncertainty both name
   their entry module `main`; running both suites in one process made
   `import main` resolve to the wrong app (404s). Each `conftest.py` now loads
   its `main` under a unique module name (`sewa_triage_main`,
   `sewa_uncertainty_main`).

## To graduate this into real clinical shadow testing

1. Drop **trained weights** into `MODEL_CACHE` (e.g. `triage_v2.4.1_int8.onnx`).
2. Feed **de-identified DICOM** via `storage_url` against a secured store.
3. Appoint the **Chief Investigator** + independent statistician; obtain
   **REC / HRA / MHRA** approval before any output is clinician-reviewed.
4. Record results as prospective/retrospective evidence per
   `02_Clinical_Investigation_Plan.md` / `03_Statistical_Analysis_Plan.md`.
