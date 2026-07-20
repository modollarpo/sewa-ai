# SEWA AI — Annex 12: Internal Engineering Verification (Non-Clinical Shadow Test)

> ## ⚠ NOT CLINICAL EVIDENCE — NOT VALIDATION DATA
> This annex is a **software engineering smoke test**. It verifies that the
> inference services **boot and the request pipeline executes end-to-end**. It
> was run against the built-in **demo model (random weights)**, so **every
> prediction is synthetic** and must **never** be used for diagnosis, triage
> prioritisation, or as data in the Clinical Evaluation Report (CER), SAP, or
> any regulatory submission as if it were clinical performance.
>
> It supports the **IEC 62304 / IEC 62366 software-verification** file (proof
> the build runs), **not** the clinical investigation. No sensitivity,
> specificity, or time-to-triage claim is made or implied.

## 1. Purpose

Provide a repeatable, non-clinical check — runnable on a developer machine or
CI — that the SEWA AI radiology triage and uncertainty services start cleanly
and process a request through the full path:
`load -> preprocess -> ONNX infer -> decode -> response` (triage) and
`MC-Dropout -> epistemic/aleatoric -> SHAP -> Grad-CAM -> is_uncertain` (uncertainty).

## 2. Scope

| Service | In current scope? | Exercised |
|---|---|---|
| `ai-services/triage` | Yes (radiology triage) | `/health`, `/metrics`, inference across CT/Head, CT/Chest, XR/Chest, MRI/Brain, ECG/Heart; SSRF + input-validation rejection paths |
| `ai-services/uncertainty` | Yes (safety mechanism) | `/health`, `/metrics`, `/uncertainty/explain` for CT/Head and XR/Chest |
| Pathology / Mammography / Retinal | **Future / pipeline only** | Not tested — out of scope per `09_Future_Services_Pipeline.md` |

**Deliberately excluded:** DICOM via `storage_url` (blocked by the SSRF guard:
localhost / 127.0.0.1 / 10.x / 192.168.x refused by design) and any diagnostic
accuracy claim (demo weights are random).

## 3. Method

- Local Python venv; services run via FastAPI `TestClient` (no network, no GPU).
- Model cache pointed at a temp dir; the services auto-generate a structural
  **demo ONNX** so the pipeline runs without trained weights.
- A synthetic grayscale "scan" (base64 PNG) is posted; assertions check response
  structure, urgency/uncertainty fields, and backend (`demo` / `onnx-int8-cpu`).
- Full procedure and commands: `ai-services/INTERNAL_SHADOW_TEST.md`.

## 4. Result (observed latency — engineering only)

| Service | Modality | `inference_ms` |
|---|---|---|
| Triage | CT/Head | 80 ms |
| Triage | CT/Chest | 63 ms |
| Triage | XR/Chest | 63 ms |
| Triage | MRI/Brain | 61 ms |
| Triage | ECG/Heart | 69 ms |
| Uncertainty | CT/Head | 765 ms |
| Uncertainty | XR/Chest | 675 ms |

All requests returned well-formed responses; all security/validation rejection
paths (SSRF, missing payload, malformed image, invalid modality) behaved
correctly. **These timings are demo-model, CPU, dev-box figures and are not a
performance guarantee for the deployed INT8 model on production hardware.**

## 5. Defects found and fixed during verification

1. **Triage `predict()` swallowed intended 4xx.** A broad `except Exception`
   caught the `HTTPException(400)` raised for invalid input / SSRF / bad base64
   and re-raised it as **500**. Fixed with `except HTTPException: raise` in
   `ai-services/triage/main.py` — correct failure signalling is a DCB0129
   requirement.
2. **Pre-existing tests used lowercase `scan_id`.** The schema requires
   `^[A-Z0-9\-_]{4,64}$`; those payloads were rejected by pydantic at 422 and
   never reached the security checks. Made the test `scan_id`s uppercase so the
   SSRF/validation paths are genuinely exercised.
3. **Cross-service `main` module collision.** Triage and uncertainty both name
   their entry module `main`; running both suites in one process made
   `import main` resolve to the wrong app (404s). Each `conftest.py` now loads
   its `main` under a unique name.

## 6. Relationship to the clinical evidence package

| Artifact | This annex | Clinical submission (DOC-02/03/11) |
|---|---|---|
| Model | Demo (random weights) | Trained, locked weights under change control |
| Data | Synthetic image | De-identified DICOM, prospective + retrospective |
| Outputs | Meaningless | Measured sensitivity/specificity, door-to-alert |
| Status | Engineering smoke test | Regulated clinical investigation (REC/HRA/MHRA) |
| File it belongs in | IEC 62304 software verification / Technical File | Clinical Evaluation Report |

To graduate this into **clinical** shadow testing: (1) place trained weights in
`MODEL_CACHE`; (2) feed de-identified DICOM via `storage_url` to a secured
store; (3) appoint the Chief Investigator + independent statistician and obtain
REC/HRA/MHRA approval before any output is clinician-reviewed; (4) record
results per `02_Clinical_Investigation_Plan.md` / `03_Statistical_Analysis_Plan.md`.
