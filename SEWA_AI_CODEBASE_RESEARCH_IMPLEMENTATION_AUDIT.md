# SEWA AI — Codebase Research & Implementation Audit

**Repository:** `C:\sewa_extract` (1,038 git-tracked files, audited work tree unmodified by this audit)
**Audit date:** 2026-10-06
**Auditor method:** static inspection + executable probes (services booted locally, payloads replayed, model artefacts parsed) + repository-wide greps
**Governing rule (prompt §39):** *Do not tell us what SEWA is supposed to be. Tell us what the code proves SEWA is.*

---

## Required Executive Answers (prompt §33)

### What does SEWA actually implement today?

Substantial **software engineering** around medical-imaging workflow, plus **three small Python inference services that execute for real**, plus an orchestration layer whose **service contracts do not match the services it calls** (proven by executing them during this audit):

- Real Express/Prisma backend (`backend/src`, 142 TypeScript files, 15 test files), React frontend (`frontend/src`, 132 TS/TSX files), React Native mobile (`mobile`, 39 TS/TSX files), 11 Python service directories (`ai-services/`, 51 Python files), Go DICOM ingestion, Docker Compose stack, AKS/Terraform/GitHub-Actions deployment scaffolding (17 Kubernetes `Deployment` manifests in `azure/k8s/`).
- A real four-stage pipeline function: `backend/src/services/aiOrchestrator.ts:279` `runAIPipeline` — stage 1 parallel triage+uncertainty (lines 673–703), stage 2 VLM report (line 722), stage 3 metacognition (line 765), stage 4 persist/alert (lines 793–851).
- A real rule-based metacognition engine (`ai-services/metacognition/main.py`, 9 self-evaluation layers, lines 156–420) that executes deterministically.
- A real (input-noise-based) MC-Dropout-style uncertainty computation (`ai-services/uncertainty/main.py:170–222`) with explicit epistemic/aleatoric decomposition and thresholds.
- **No model weights, no training scripts, no clinical datasets anywhere in the 1,038 tracked files** (verified: `git ls-files` matched zero `.onnx/.pt/.pth/.ckpt/.safetensors` files).
- A **reproducible request/response contract break** between `aiOrchestrator.ts` and `metacognition`, `uncertainty`, `triage` — the pipeline as written cannot complete a scan: every replayed stage returns HTTP 422 (Appendix F, E-01…E-04).
- The ONNX "model" exercised during this audit's live proofs was **auto-generated with `np.random.randn` weights** by `ai-services/uncertainty/main.py:74–98` (`_create_demo_onnx`, verified by parsing the artefact: graph `uncertainty_demo`, `Flatten+Gemm`, `W [10, 150528]`) — i.e. **no trained model has ever been run in this repository's default path** (Appendix F, E-05).

### What is genuinely working?

(State A/B in the engineering sense only — not clinical sense.)

1. **Backend service skeleton**: routing, JWT auth/RBAC, Prisma schema (1,300+ lines), audit logging, tenant isolation — 15 test files exist and CI runs them (`backend/package.json` `test: jest`; `.github/workflows/ci-cd.yml:77`).
2. **Individual AI services boot and answer HTTP** — proven live in this audit for `metacognition`, `uncertainty`, `triage` (E-02, E-03, E-04).
3. **Metacognition rule engine** executes all layers on a valid payload and returns `passed`, `safe_to_alert`, `hallucination_risk`, `flags`, `calibration_score` (E-02; `ai-services/metacognition/main.py:426`).
4. **Uncertainty engine** runs N=10 passes (`MC_DROPOUT_PASSES`, `uncertainty/main.py:69`) and returns `uncertainty_score=0.1877`, `epistemic_uncertainty=0.0124`, `is_uncertain=True`, `inference_ms=1012` (E-03).
5. **Human-review surfaces**: `requiresHumanReview` flag is set in the orchestrator (`aiOrchestrator.ts:433,534,631,850`) and consumed by the learning loop queue (`backend/src/routes/learningLoop.ts:19–82`) and peer-review UI (`frontend/src/pages/radiologist/PeerReviewWorkspace.tsx:101`).
6. **CI/CD**: lint/typecheck/jest + a `safety-gate` job that boots metacognition and runs `npm run metacognition-benchmark` + `npm run safety-validation` (`.github/workflows/deploy.yml:166–199`). (Both scripts are materially flawed — §19, §21.)
7. **Deployment tooling**: `az acr build` + `deploy-quick.sh` flow documented as having shipped 11 images (AGENTS.md work state; not independently re-run in this audit — status B).

### What is implemented but unvalidated?

- **The end-to-end pipeline** (`runAIPipeline`): code exists, but every cross-service field it reads (`triage.primaryFinding`, `uncertainty.compositeScore`, `uncertainty.highUncertaintyFlag`, `metacog.layer9_safe_to_alert`, `metacog.layer8_hallucination_risk`) is **absent from the actual responses** (proven live, E-01–E-04). No test exercises the real contract; all axios calls in tests are mocked.
- **Calibration**: `backend/src/services/calibrationService.ts` computes ECE/Brier (lines 118–183, 419) but `recordPrediction` (line 78) has **zero callers** — no prediction ever enters the calibration window.
- **Safety benchmark**: `backend/src/validation/metacognition-benchmark.ts` and `safety-validation.ts` send `shap_values: {}` (an object) to a service that requires a list → 422; both scripts count **service errors as "blocked/safe"** (`metacognition-benchmark.ts:59–61`, `safety-validation.ts:94–96`) and read a non-existent response field `layer9_safe_to_alert` (service returns `safe_to_alert`). The reported "96.3% hallucination catch rate" (README.md:157) is therefore **not reproducible and structurally inflated**.
- **GC/SHAP explanations**: `triage` returns no `gradCamUrl`/`shapValues` (E-04) yet the orchestrator persists `gradcamUrl: triage.gradCamUrl` (`aiOrchestrator.ts:826`).
- **Monitoring endpoints**: `backend/src/routes/ai-monitoring.ts` `/drift` (lines 164–175) and `/bias` (lines 181–201) return **hard-coded, time-bucket-jittered fabrications**; AUC/sensitivity fall back to synthetic baselines when real data is insufficient (lines 132–138).

### What is only conceptual?

- **Confidence Integrity Score (CIS)**: claimed in marketing (`frontend/src/pages/public/products/MetacognitionAI.tsx:60` — "12 safety metrics"; `LandingPage.tsx:12`; `TechnicalWhitepaperPage.tsx:221`) but **zero occurrences** of "confidence integrity" / `integrityScore` in `backend/` or `ai-services/` source (grep, E-09). **State E — not found in code.**
- **Trained models** for triage/uncertainty/pathology/mammography/retinal: proposed only. `scripts/export_models_to_onnx.py` expects `.pt` checkpoints that do not exist; services fall back to random-weight demo ONNX (E-05).
- **Federated learning** (`ai-services/federated-learning`, imports `flwr` which is not installed) and **continuous learning** (`ai-services/continuous-learning`, imports `asyncpg` which is not installed): cannot even import in the provided environment (E-06).
- **Deployment/scale claims** (README.md:159–160 "47+ hospitals, 7 countries, 2.1M+ scans", README.md:171–173 "CE Mark IIb / UKCA / ISO 13485"): no evidence in repository — **UNKNOWN — insufficient evidence in the repository**; must not be repeated in any research document.
- **OOD/distribution-shift detection**: none. Only the fabricated `/drift` endpoint (§17).
- **Risk-coverage / selective-risk / conformal evaluation**: zero occurrences in backend/ai-services (grep, §19).

### Does an explicit metacognitive reliability mechanism already exist?

**No.** There is metacognitive reliability state g-v1 is now implemented (ackend/src/evaluation/reliabilityState.ts) but was absent at audit time — no structured object that fuses prediction, uncertainty, calibration, agreement, and validity into an explicit reliability state with an action policy (§14).

What exists is: (a) a **rule-based self-evaluation layer** in `ai-services/metacognition/main.py` that emits `passed`, `safe_to_alert`, `hallucination_risk`, `flags`, `calibration_score`, `corrected_confidence`, `corrected_urgency` (E-02); (b) **component signals** produced elsewhere: `uncertainty_score`/`epistemic`/`aleatoric` (uncertainty service), `confidence` (triage softmax), drift/bias fabrications (monitoring routes); (c) **dead stores**: `AIResult.metacognitionPassed`, `metacognitionScore`, `hallucinationRisk`, `inferenceMs` columns and `MetacognitionAuditLog` table exist in `backend/prisma/schema.prisma` (≈lines 299–303, 1245) with **zero writers** (E-09).

That is a **precursor assembly of raw ingredients**, not a coherent state — and the ingredients are not currently connected (contract break) nor fed by any real trained model (random-weight demo) nor calibrated (zero callers).

### If not, what existing components could form its basis?

1. `metacognition/main.py` layers 1–9 (deterministic rules over finding/urgency/confidence/SHAP/report text) — the only executable self-evaluation.
2. `uncertainty/main.py` epistemic/aleatoric decomposition (`:209–212`) and `is_uncertain` decision (`:412`).
3. Triage `confidence` (softmax max-probability, `triage/main.py:276`) — currently uncalibrated.
4. `calibrationService.ts` ECE/Brier machinery (`:118–183`) — implemented, uninvoked.
5. The `requiresHumanReview`/`humanReviewReason` action channel (`aiOrchestrator.ts:850–851`) + learning-loop adjudication (`routes/learningLoop.ts`) — a real human-in-the-loop sink for a future reliability state.
6. `MetacognitionAuditLog` schema (empty) — a ready-made provenance store.

### What is the strongest defensible research question?

> **Can a formalised, explicit reliability state — constructed from uncertainty decomposition, calibration, engine agreement and input-validity signals already present in a real clinical imaging pipeline — predict consequential AI errors and safely drive abstention/escalation better than any single constituent signal, under distribution shift?**

Why it is defensible: the codebase demonstrably *produces* the constituent signals (E-02, E-03), demonstrably *lacks* their unification, calibration and evaluation (§10, §11, §14), and contains a ready instrument (human-review queue) against which error-detection can be measured. The question is falsifiable and the missing work is instrumentation, not marketing.

### What is the smallest credible experiment?

Freeze one task (e.g. CT-head urgency from triage + uncertainty + metacognition outputs), fix the contracts so the three services exchange typed fields, obtain real trained weights **or** explicitly scope to rule-level evaluation on labelled fixtures, log per-case: `confidence`, `epistemic`, `aleatoric`, metacognition `flags`/`hallucination_risk`, ground-truth correctness, and the human-review decision. Then compare: (i) each single signal vs (ii) a pre-registered combination (the reliability state) on **error-detection AUROC + risk-coverage curves + false-abstention rate**, with calibration (ECE/Brier) measured on a held-out set. ~300–500 labelled cases suffice for first-cut AUROC with CIs. Detailed in §30.

### What is the strongest potential contribution to explainable AI?

A **metacognitive explanation**: not "why did the model classify X" (SHAP/Grad-CAM — largely absent here anyway) but *"why the system chose to act / abstain / escalate on this case"* — a faithful, auditable mapping from reliability-state signals to action, evaluated for faithfulness (does the stated reason match the actual gating computation?) and usefulness (does it improve human reliance?). Potential research novelty requiring literature verification.

### What must not be claimed?

- Do not claim working end-to-end AI pipeline, trained-model performance, CIS, "12 safety metrics", 96.3% catch rate, ECE 0.042, AUC 0.972, "independently validated and peer-reviewed" (TechnicalWhitepaperPage.tsx:300), "47+ hospitals / 2.1M scans", certifications, or any "first/novel metacognitive AI" — **none are supported by this repository** (§32, §35).
- Do not claim uncertainty is "calibrated" — nothing ever feeds `calibrationService`.
- Do not claim MC-Dropout on a trained model — the executed model is random-weight demo (E-05) and "dropout" is simulated by input Gaussian noise (`uncertainty/main.py:185–190`).

---

## 1. Executive Summary

SEWA is, on the evidence of this repository, **three things at once**:

1. **A credible full-stack clinical platform skeleton** — backend, frontend, mobile, auth/RBAC, Prisma data model, FHIR/DICOM/Storage/Service-Bus plumbing, Docker/AKS/Terraform/CI. This is real, mostly conventional, engineering (State A/B). Roughly 1,038 tracked files.

2. **Three genuinely executing AI microservices** — `triage`, `uncertainty`, `metacognition` (plus 7 more service directories) with real FastAPI apps, Prometheus metrics, pydantic contracts, ONNX runtime integration. Booted and probed live during this audit (Appendix F).

3. **An orchestration and assurance narrative that does not hold**: the TypeScript orchestrator and the Python services disagree on field names at every stage boundary; the safety benchmark scripts encode the same wrong contract and score service *failures* as safety *successes*; the calibration, self-audit and metacognition-audit code paths have zero callers; the "model" behind the live outputs has random weights; datasets, weights and evaluation outputs do not exist in the repository.

**The single most important technical finding** is the contract break, because it converts every downstream claim ("pipeline", "safety gate acts on uncertainty", "CIS", "human review triggered by metacognition") from *implemented* into *not demonstrated*:

| Boundary | Orchestrator reads/sends (`aiOrchestrator.ts`) | Service actually returns/sends | Live result |
|---|---|---|---|
| triage → VLM | `triage.primaryFinding` (:732) | `primary_finding` (E-04) | `ai_finding: undefined` → VLM 422 (`vlm-report/main.py:90`) |
| uncertainty → orchestrator | `uncertainty.compositeScore` (:773), `highUncertaintyFlag` (:801), `epistemicUncertainty` (:810) | `uncertainty_score`, `is_uncertain`, `epistemic_uncertainty` (E-03) | undefined reads |
| orchestrator → metacognition | sends `shap_values: triage.shapValues \|\| {}` (:774) | requires `List[Dict]` (`metacognition/main.py:137` field is a list) | **422** `list_type` + missing `uncertainty_score` (E-01) |
| metacognition → orchestrator | reads `metacog.layer9_safe_to_alert` (:785, :850), `layer8_hallucination_risk` (:786) | returns `safe_to_alert`, `hallucination_risk` (E-02) | undefined reads; `.toFixed(3)` would throw |
| uncertainty modality | orchestrator forwards `scan.modality` `CT\|MRI\|XR\|US\|PET\|PETCT` | pattern `^(CT\|MRI\|XR)$` (`uncertainty/main.py:142`, `vlm-report/main.py:85`) | US/PET scans 422 at stage 1 |

Consequences (proven): a scan that reaches stage 1 either 422s immediately (US/PET) or reaches stage 2 and 422s there; `safePOST` retries only 503/429/timeout (`aiOrchestrator.ts:234`) so 422 throws at once; the catch path enqueues the scan to the DLQ (`:924–925`). **No scan completes the pipeline.** Accordingly, every quantity that would be produced downstream (persisted `AIResult`, `requiresHumanReview` from metacognition, `MetacognitionAuditLog`, calibration feedback) is **unreachable in the current code path** — status C/D, not A.

**Research framing**: the repository is a rich, honest source of *component signals* and a *real human-review instrument*, but the scientific object implied by the SEWA narrative — an explicit, validated metacognitive reliability state — does not exist yet. That gap is the opportunity: it is real, it is falsifiable, and it is cheap to instrument (§30). Nothing here supports clinical-performance or novelty claims (§32, §35).


## 2. Audit Scope and Method

### Scope

- Whole repository at `C:\sewa_extract` (1,038 tracked files), commit state: working tree used as given; **no repository file was modified, no commit made, no model trained** (prompt §36).
- Not in scope: running the full Docker/AKS stack; regenerating the Azure infrastructure; clinical/regulatory certification (explicitly excluded — only engineering evidence reported).

### Method

1. **Static mapping** — directory inventory, file counts, dependency manifests (`backend/package.json`, service `requirements.txt`), CI workflows, Terraform/K8s manifests.
2. **Targeted source inspection** — every file material to the claims: `aiOrchestrator.ts`, all 10 `ai-services/*/main.py`, `calibrationService.ts`, `selfAuditService.ts`, `aiService.ts`, `ai-monitoring.ts`, `v2Router.ts`, `reports.ts`, `learningLoop.ts`, `prisma/schema.prisma`, `validation/*.ts`, marketing pages carrying quantitative claims.
3. **Executable probes (live, local, disposable)** — Python venv at `.venv` (Python 3.14.2, fastapi 0.136.1, uvicorn 0.46.0). Booted `metacognition`, `uncertainty`, `triage` on localhost; replayed orchestrator-shaped payloads and valid payloads; captured raw JSON (Appendix F). Temporary model cache at `%TEMP%\opencode\audit\models` — the ONNX artefact written there was then **parsed with `onnx.load` to identify graph structure and weights origin** (E-05).
4. **Import probe** — each `ai-services/*/main.py` executed via `importlib` under the project venv (E-06).
5. **Exhaustive greps** for every mechanism named in the prompt (MC-dropout, deep ensembles, conformal, Platt/isotonic, ECE/Brier, risk-coverage, OOD, Mahalanobis, abstention, CIS, etc.) across `backend/src`, `ai-services`, `frontend/src`, docs.
6. **Claim provenance** — quantitative marketing/README claims traced to any producing code (result: no producing code found for any of them — §32).

### What was deliberately NOT done

- No refactor, no code fix (the contract break is *reported*, not patched — fixing it would alter evidence).
- No `terraform apply`, no cluster access, no `az acr build`.
- No secret values read or printed; `.env` files present locally were not opened. Tracked files containing secret *structure* are listed in §24 by path only.

---

## 3. Repository Map

| Area | Path | Scale | Nature |
|---|---|---|---|
| Backend API | `backend/src` | 142 `.ts`; 15 test files | Express + Prisma + TS; business logic, routes, services |
| Prisma schema | `backend/prisma/schema.prisma` | ~1,300+ lines | Data model incl. `AIResult`, `MetacognitionAuditLog` (schema ≈:1245) |
| Safety validation | `backend/src/validation/` | 3 scripts + 5 fixture dirs (`pass/fail/hallucination/uncertainty/contradiction_cases`, JSON fixtures + `generate_cases.ts`) | Benchmark harnesses (flawed — §19) |
| Frontend | `frontend/src` | 132 TS/TSX | React app incl. radiologist/peer-review workspaces + public marketing pages |
| Mobile | `mobile` | 39 TS/TSX | React Native client |
| AI services | `ai-services/` | 11 dirs, 51 `.py`: `triage`, `uncertainty`, `metacognition`, `vlm-report`, `pathology`, `mammography`, `retinal`, `voice-transcription`, `federated-learning`, `continuous-learning`, `shared` | FastAPI microservices |
| Edge / imaging | `edge-ai`, `dicom-ingestion` (Go; `dicom-ingestion-test.exe` binary tracked) | — | DICOM handling |
| Validation data | `ai-services/triage/sample_data/` | 8 synthetic DICOMs + `generate_test_dicoms.py` + JSON manifests | Synthetic only |
| Deployment | `docker-compose.yml` (top-level services incl. `postgres`, `redis`, `backend`, `frontend`, `voice-transcription`, `translation`, `nginx`, `ai-triage`, `ai-vlm`, `ai-uncertainty`, `ai-pathology`, `ai-mammography`, `ai-retinal`, `ai-metacognition`, `ai-federated`, `ai-continuous`, `edge`), `azure/k8s/` (17 Deployments), `infrastructure/terraform-azure/`, `.github/workflows/{ci-cd,deploy}.yml` | — | Executable scaffolding |
| Docs/claims | `README.md`, `HOW_SEWA_WORKS.md`, `docs/clinical-dossier/` (02 Clinical Investigation Plan, 03 Statistical Analysis Plan, 11 Regulation Readiness), `frontend/src/pages/public/*` | — | Contains unreproducible quantitative claims (§32, §35) |
| Investor material | `investor-submission/` incl. `claims_register.csv` | — | Not evidence; marketing/business |
| Tooling | `scripts/` incl. `export_models_to_onnx.py`, `deploy-production.sh`, `deploy-quick.sh`, `setup-github-oidc.sh` | — | Assumes absent `.pt` weights |
| Excluded from evidence | `.venv/` (local), `node_modules`, `dist/`, `.kilo/worktrees/*` (two stale worktrees mirror `e2e/`), tracked binaries `SEWA_AI.mp4`, `dicom-ingestion-test.exe` | — | Not counted as implementation |

**Negative-space findings in the map:** no `experiments/`, `notebooks/`, `results/`, `eval/`, `benchmarks/` directories with outputs; no dataset directories; no model registry.

---

## 4. Evidence Classification Framework

Per prompt §5. Every material statement in this report carries one state:

| State | Meaning | Typical evidence in this audit |
|---|---|---|
| **A** | Implemented **and** reproducible here | Service booted + payload replayed + response captured (E-01…E-05); greps with zero/false results (E-09); artefact parsed (E-05) |
| **B** | Implemented but **unvalidated** (no test/eval proves behaviour) | Calibration ECE/Brier code with zero callers; CI safety job (runs but measures wrong thing) |
| **C** | Partial / prototype / **mocked / disconnected** | Orchestrator↔service contract break (E-01…E-04); `/drift`+`/bias` fabrications; benchmark scripts that score errors as blocked; demo random-weight ONNX (E-05) |
| **D** | Proposed only (docs/marketing/comments) | CIS "12 safety metrics"; AUC 0.972; ECE 0.042; 96.3% catch rate; 47+ hospitals; OOD detection; federated/continuous learning claims |
| **E** | Not found in the repository | Risk-coverage/selective-risk/conformal evaluation; trained weights; datasets; CIS implementation; writers for `MetacognitionAuditLog` |

**State separation discipline (prompt §3):** "implemented", "working", "validated", "reproducible" are never collapsed. Where the repository cannot answer, the literal string **UNKNOWN — insufficient evidence in the repository** is used (e.g. deployment/scale/certification claims, §32).

**Confidence labels** used in Appendix F: *high* = directly executed or exact-match grep; *medium* = static trace across ≥2 files; *low* = inference from absence (absence greps are themselves executed and recorded).


## 5. Actual System Architecture

### As traced in code (not as described in docs)

```
                       ┌────────────────────────────────────────────────┐
 upload / worklist     │ backend/src (Express + Prisma)                 │
 Frontend ────────────▶│  routes/*.ts (auth/JWT/RBAC, tenant scoping)   │
 Mobile ───────────────▶│  prisma (PostgreSQL; AIResult, Report, Scan…) │
                        └───────────────┬────────────────────────────────┘
                                        │ runAIPipeline(scanId, tenantId)
                                        │ backend/src/services/aiOrchestrator.ts:279
                        ┌───────────────▼────────────────────────────────┐
                        │ STAGE 1 (parallel, :673-703)                   │
                        │  POST {TRIAGE_URL}/triage/predict              │
                        │  POST {UNCERTAINTY_URL}/uncertainty/explain     │
                        ├────────────────────────────────────────────────┤
                        │ STAGE 2 (:722) POST {VLM_URL}/vlm/generate-report
                        │ STAGE 3 (:765) POST {METACOGNITION_URL}/metacognition/evaluate
                        │ STAGE 4 (:793-851) Zod parse → prisma.aIResult.create
                        │          → report.create → requiresHumanReview flag
                        │ catch → dlq.enqueue (:924-925)                 │
                        └───────────────┬────────────────────────────────┘
                                        │ (all boundaries broken: §1 table)
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   ai-services/triage          ai-services/uncertainty    ai-services/metacognition
   main.py:241 /predict        main.py:363 /explain       main.py:426 /evaluate
   ONNX (INT8→FP32→demo)       MC passes (noise-injected)  9 deterministic rule layers
   main.py:117-183             main.py:74-98,170-222       main.py:156-420
             │                          │                          │
             └── ai-services/vlm-report main.py:132 /vlm/generate-report (template + optional Azure OpenAI)
                                        │
   Legacy/dead path: backend/src/services/aiService.ts:16 posts to {VLM_URL}/generate → route does not exist (service route is /vlm/generate-report)
```

### Supporting planes (verified present)

- **Async**: Service Bus queues + `dlqService` (DLQ retry, `aiOrchestrator.ts:28,925`).
- **Monitoring**: Prometheus metrics in each Python service (`/metrics`), plus Express routes `backend/src/routes/ai-monitoring.ts` (`/drift`, `/bias`, `/latency`) — drift/bias are fabricated (§19).
- **Human loop**: `requiresHumanReview` → `routes/learningLoop.ts` queue → peer review UI → flag reset (`learningLoop.ts:79–82`).
- **Storage**: Azure Blob (`storage_url` fields), DICOM ingestion service, FHIR service (`fhirService.test.ts` exists).
- **Infra**: Terraform (`infrastructure/terraform-azure/`), AKS manifests (`azure/k8s/`), ACR build scripts (`scripts/`), GitHub OIDC (`scripts/setup-github-oidc.sh`).
- **V2 API**: `backend/src/routes/v2Router.ts` mounted but **frontend contains zero references to `api/v2`** (grep, E-09); endpoints unauthenticated with empty backing tables per prior trace — treated as dead surface.

### Architecture verdict

The architecture is a **conventional, well-structured microservice pipeline** (State A as structure). Its *dynamic behaviour* is broken at every service boundary (State C as execution). Nothing in the architecture is itself novel (§29): request → parallel inference → report → rules-gate → persist → human-review queue is standard medical-AI integration.

---

## 6. Component Inventory

Legend: **Status** = A/B/C/D/E per §4. **Live?** = exercised in this audit.

| Component | Path | Status | Live? | Notes |
|---|---|---:|:-:|---|
| Pipeline orchestrator | `backend/src/services/aiOrchestrator.ts` (`runAIPipeline:279`) | C | partially (stages replayed) | Contract broken at every boundary (§1) |
| Triage service | `ai-services/triage/main.py` | A (runs) / C (integration) | yes (E-04) | Returns `primary_finding`; no `gradCamUrl`/`shapValues`; `backend` label = file-existence check (`:308`) |
| Uncertainty service | `ai-services/uncertainty/main.py` | A (runs) / C (model) | yes (E-03) | `backend="onnx-int8-cpu"` **hard-coded** (`:445`) regardless of actual model; model = random demo (E-05) |
| Metacognition service | `ai-services/metacognition/main.py` | A | yes (E-01, E-02) | Deterministic 9-layer rule engine; default port 8003 (`:478`) |
| VLM report service | `ai-services/vlm-report/main.py` | B | import fails (E-06) | Route `/vlm/generate-report:132`; requires `openai` package (not installed); template-based on CPU |
| Pathology / Mammography / Retinal | `ai-services/{pathology,mammography,retinal}/main.py` | B | import OK | Same triage-style contract; orchestrator stages for them at `:364,473,571` |
| Voice transcription | `ai-services/voice-transcription/main.py` | B | import OK | Azure Speech/Whisper integration per AGENTS.md |
| Federated learning | `ai-services/federated-learning/main.py` | D→C | **import fails** (`flwr` missing, E-06) | Not runnable as shipped |
| Continuous learning | `ai-services/continuous-learning/main.py` | D→C | **import fails** (`asyncpg` missing, E-06) | Not runnable as shipped |
| Calibration service | `backend/src/services/calibrationService.ts` | B | n/a | ECE/Brier implemented; `recordPrediction:78` zero callers (E-09) |
| Self-audit service | `backend/src/services/selfAuditService.ts` | B | n/a | `runSelfAudit:278` zero callers (E-09) |
| AI monitoring routes | `backend/src/routes/ai-monitoring.ts` | C | n/a | `/drift:164-175`, `/bias:181-201` fabricated; AUC fallback synthetic (`:132-138`) |
| Safety benchmark | `backend/src/validation/metacognition-benchmark.ts` | C | n/a | Wrong contract + errors counted as blocked (`:59-61`) |
| Safety validation | `backend/src/validation/safety-validation.ts` | C | n/a | Triage/VLM/uncertainty **mocked by design** (`:53-72`); errors → FAIL (`:94-96`) |
| Golden dataset test | `backend/src/__tests__/golden-dataset.test.ts` | C | n/a | 100 hand-written fixtures asserting themselves; zero model output |
| E2E test | `e2e/tests/clinical-workflow.spec.ts` | C | n/a | Login-page render + login nav only; skips without `E2E_TEST_PASSWORD` |
| Human review loop | `backend/src/routes/learningLoop.ts`, `frontend/src/pages/radiologist/PeerReviewWorkspace.tsx` | A | n/a | Flag set (`aiOrchestrator.ts:850`) → queue → adjudication → flag reset |
| Reports/signing | `backend/src/routes/reports.ts` | B | n/a | **No `requiresHumanReview` gate in this file** (grep 0 matches) — signing path not gated by the flag here |
| V2 router | `backend/src/routes/v2Router.ts` | C/E | n/a | No frontend callers (E-09); unauthenticated surface |
| DICOM ingestion | `dicom-ingestion/` (Go) | B | n/a | Tracked prebuilt `dicom-ingestion-test.exe` (binary — not evidence) |
| Edge preprocessing | `edge-ai/` | B | n/a | — |
| Frontend app | `frontend/src` | A | n/a | Includes peer-review UI; **marketing pages carry unsupported claims (§32)** |
| Mobile app | `mobile` | B | n/a | 39 TS/TSX files |
| Deployment | `docker-compose.yml`, `azure/k8s/`, `infrastructure/terraform-azure/`, `.github/workflows/` | A (scaffolding) | n/a | 17 K8s Deployments; CI runs tests + safety-gate job |
| ONNX export tooling | `scripts/export_models_to_onnx.py` | D | n/a | Expects `.pt` checkpoints that do not exist (E-09 weights grep) |

---

## 7. AI/ML Model Inventory

### What the repository claims vs contains

| Claimed engine | Claimed model (code/comments) | Artefact in repo | What actually executes (verified) |
|---|---|---|---|
| Triage | "ONNX INT8 EfficientNet-B0", `MODEL_VERSION=v2.4.1` (`triage/main.py:6,74–78`) | **none** (`git ls-files` → 0 weights) | `_resolve_model:117–141`: INT8→FP32→PT-export→**`_create_demo_onnx_model:163` random weights**. In the audit's live run it loaded `triage_v2.4.1.onnx` — which had been written minutes earlier by the *uncertainty* service's demo generator with `np.random.randn` (E-05) |
| Uncertainty | "Calibrated MC-Dropout (10 passes) + ONNX gradient attribution" (`uncertainty/main.py:127`) | none | Demo generator `:74–98` (`n_classes=10`, `np.random.randn`); "MC-Dropout" = **additive Gaussian input noise** σ=0.05 (`:185–190`, `MC_NOISE_STD`), not stochastic layers; SHAP = finite-difference region perturbation (`:231+`) or random Dirichlet in demo (`:241–245`) |
| Metacognition | "CPU-native clinical safety gate, rule-based" (`metacognition/main.py:53`) | n/a (no model) | Pure deterministic rules — **the only component whose behaviour is model-independent and fully reproducible** |
| VLM report | "TEMPLATE-BASED on CPU… Azure OpenAI is the production LLM path" (`vlm-report/requirements.txt` header) | templates in code (`:109+`) | Import fails without `openai` (E-06); orchestrator calls it synchronously with `VLM_TIMEOUT` |
| Pathology / Mammography / Retinal | same triage pattern (ONNX + demo fallback) | none | Not booted in this audit; same structural risk as triage |
| Federated | Flower (`flwr`) | none | Cannot import (E-06) |
| Voice | Azure Speech / Whisper API | n/a (external) | Not exercised |

### Model-usage verdict

- **Trained weights in repository: 0** (State E; verified by `git ls-files` extension grep — E-09).
- **Consequence**: every numerical output observed in this audit (confidence, uncertainty, findings, urgencies) came from either (a) **random-weight linear models** or (b) **hand-written rules**. No claim of model performance (AUC, sensitivity, ECE) can be evaluated from this repository (§19, §32).
- **`modelId: 'sewa-cpu-onnx-int8-v2'`** is written to `AIResult` unconditionally (`aiOrchestrator.ts:821`) regardless of what model (or demo) actually served the request — a provenance integrity issue.
- **Live labels are unreliable**: uncertainty's `backend="onnx-int8-cpu"` is a constant (`uncertainty/main.py:445`) even when serving the random demo (E-03+E-05). Triage's label (`:308`) reflects file *existence*, not weight *provenance*.


## 8. Multi-Engine Orchestration

### Engine-by-engine (prompt §7 fields)

| Engine | Role | Input | Output (actual keys, live) | Model | Order | Confidence | Uncertainty | Failure handling |
|---|---|---|---|---|---|---|---|---|
| **Triage** (`triage/main.py:241`) | finding + urgency classification | `scan_id, storage_url, modality, body_part, clinical_context` | `all_findings, backend, confidence, inference_ms, location, midline_shift, model_version, primary_finding, scan_id, size, snomed_code, urgency` (E-04) | ONNX INT8/FP32/demo (§7) | stage-1, parallel | `confidence` = softmax max prob (`:276`) | none | 4xx/5xx → `safePOST` retry only 503/429/timeout (`aiOrchestrator.ts:234`) else throw → DLQ (`:924-925`) |
| **Uncertainty** (`uncertainty/main.py:363`) | N-pass uncertainty decomposition | same + `primary_finding, confidence` (orchestrator sends placeholders `'unknown'`/`0.5`, `aiOrchestrator.ts:697-698`) | `aleatoric_uncertainty, backend, epistemic_uncertainty, explanation, gradcam_base64, gradcam_url, inference_ms, is_uncertain, mc_dropout_mean, mc_dropout_std, mc_passes_used, scan_id, shap_values, uncertainty_score` (E-03) | same ONNX family (random demo in audit) | stage-1, parallel | n/a | `uncertainty_score`, `epistemic`, `aleatoric`, `is_uncertain` | modality regex `^(CT\|MRI\|XR)$` (`:142`) rejects US/PET with 422 → DLQ |
| **VLM report** (`vlm-report/main.py:132`) | report text | triage+context fields incl. **required** `ai_finding`, `urgency` (`:90-91`) | `scan_id, technique, findings, impression, full_text, generated_at, model_version, generation_ms` | templates; Azure OpenAI optional | stage-2 sequential | `confidence` passthrough | n/a | 422 on undefined `ai_finding` (live-proven failure chain, E-04+§1) |
| **Metacognition** (`metacognition/main.py:426`) | rule-based self-evaluation | requires `uncertainty_score`, `shap_values: List` | `calibration_score, corrected_confidence, corrected_urgency, evaluated_at, evaluation_ms, flags, hallucination_risk, passed, safe_to_alert, scan_id, self_eval_notes` (E-02) | none (rules) | stage-3 sequential | `confidence` in, `corrected_confidence` out | reads `uncertainty_score` | 422 if `shap_values` not a list / `uncertainty_score` missing (E-01) |
| Pathology/Mammography/Retinal | condition-specific triage | own stage paths (`:364,473,571`) | camelCase per interface (`:119-163`) | ONNX demo-fallback family | branch by modality/finding | `confidence` | none | same DLQ path |
| **Dead engines** | — | — | — | — | — | — | — | `aiService.ts` legacy VLM call to non-existent `/generate` (`:16`); `v2Router` unreachable from frontend (E-09); `selfAuditService.runSelfAudit` zero callers; `calibrationService.recordPrediction` zero callers |

### What orchestration actually is

- **Declared**: multi-model reasoning ensemble. **Actual**: a **sequential pipeline with parallel stage-1 fan-out** over *complementary* (not ensemble) models — triage classifies, uncertainty quantifies *its own separate pass*, VLM renders text, metacognition applies rules. There is **no aggregation of independent predictions of the same target**, hence no ensemble in the statistical sense.
- **Conflict handling: none.** Triage and uncertainty never predict the same label; no voting, no weighted combination, no learned fusion (§11).
- **Aggregation**: only the trivial composition of fields into `AIResult` (`:793-829`) — and that composition reads undefined fields (§1).
- **Status of the pipeline as a whole: State C** — implemented as code, disconnected by contract mismatch, unvalidated by any non-mocked test.

### Failure handling (reconstructed exactly)

1. `safePOST` (`:222-247`): retry on `503 | 429 | ECONNABORTED | ECONNRESET` with backoff 300ms/900ms (2 retries); **any other status (incl. 422) throws immediately**.
2. `runAIPipeline` catch → `dlq.enqueue(scanId, tenantId, err.message, 0)` (`:924-925`) → exponential-backoff replay service.
3. Comment `:249`: "No mock/fallback logic in production builds — failures route to DLQ." **Consequence: a deterministic contract mismatch means every scan loops DLQ↔422 forever — the failure is permanent, not transient.** No alert surfaces this in the inspected code (UNKNOWN whether DLQ depth is alarmed — no DLQ monitoring route found).

---

## 9. Uncertainty Quantification

### Inventory (prompt §8 search list)

| Mechanism | Found? | Where | Executed in real inference path? |
|---|:-:|---|:-:|
| MC Dropout | **simulated** | `uncertainty/main.py:69` (`MC_DROPOUT_PASSES=10`), `:170-203` | yes (E-03) — but noise is added to the **input tensor**, not dropout layers: `noisy = input_arr + rng.normal(0, 0.05, shape)` (`:186-190`); model has no dropout (demo is `Flatten+Gemm`) |
| Deep ensembles / ensemble variance | no | — | — (State E) |
| Epistemic uncertainty | yes | `:209` `epistemic = float(std.mean())` | yes (E-03: 0.0124) |
| Aleatoric uncertainty | yes (mislabelled) | `:211` `aleatoric = float(-np.sum(mean * np.log(mean+eps)))` | yes (E-03) — this is the **entropy of the mean predictive distribution** (total predictive entropy), not aleatoric (expected entropy); decomposition is therefore mathematically non-standard |
| Predictive entropy | yes (as above) | `:211` | yes |
| Mutual information / evidential / Bayesian NN | no | — | State E |
| Conformal prediction / prediction sets | no | — | State E (grep `conformal` → 0 in backend/ai-services) |
| Confidence intervals | docs only | `docs/clinical-dossier/03_Statistical_Analysis_Plan.md:40,76-77` (bootstrap CI *plans*) | n/a — planned, not implemented |
| Uncertainty decomposition | yes | `:214-222` dict with `mean, std, mc_mean, mc_std, epistemic, aleatoric, total_uncertainty` | yes |
| Uncertainty score | yes | `:212` `total = min(1.0, epistemic + aleatoric * 0.3)` → response `uncertainty_score` (E-03: 0.1877) | yes |
| Uncertainty → Grad-CAM/SHAP | partial | `compute_onnx_attribution:231+` finite-difference regions; demo fallback `np.random.dirichlet` (`:241-245`) | yes, but demo path random |

### Reconstructed mathematics (from code)

Given input \(x\), N=10 passes with \(x' = x + \mathcal{N}(0, \sigma^2 I)\), \(\sigma = 0.05\) (`MC_NOISE_STD`):

- \(p_n = \mathrm{softmax}(f_\theta(x'_n))\); \(\bar p = \frac{1}{N}\sum_n p_n\)
- **epistemic** \(= \frac{1}{C}\sum_c \mathrm{std}_n[p_{n,c}]\) (`:209`)
- **aleatoric** \(= -\sum_c \bar p_c \log(\bar p_c + \epsilon)\) (`:211`) ← actually total entropy \(H[\bar p]\)
- **uncertainty\_score** \(= \min(1,\; \text{ep} + 0.3 \cdot \text{al})\) (`:212`)
- **is\_uncertain** \(= [\text{ep} > 0.25] \lor [\text{al} > 0.5]\) (`:412`) — hard-coded thresholds, provenance UNKNOWN (not tuned by any eval in repo)

### Answers to the 11 required questions

1. **Implemented?** Yes — as executed (State A for the code, State C for scientific validity given random weights + input-noise approximation).
2. **File/function** `ai-services/uncertainty/main.py: mc_dropout_onnx:170`, route `:363`.
3. **In real inference path?** Yes — stage 1 of the pipeline (`aiOrchestrator.ts:689-701`).
4. **Formula** — above; exactly reconstructable.
5. **Inputs** image array (from `storage_url` or synthetic), `modality`, `body_part`, placeholder `primary_finding/confidence`.
6. **Outputs** 16 keys (E-03). Note: orchestrator reads *different* keys (§1) — the uncertainty result reaches the DB only inside `rawJson` (`:814-817`), while `epistemicUncertainty`/`aleatoricUncertainty` columns read `uncertainty.epistemicUncertainty` (`:810-811`) — **also undefined** (actual names are `epistemic_uncertainty`/`aleatoric_uncertainty`) → columns would be null even if pipeline completed.
7. **Calibration?** None. Nothing calibrates uncertainty against correctness; `calibrationService` never invoked (§10). The word "Calibrated MC-Dropout" in the service description (`:127`) and the comment "Gaussian noise σ=0.05 is tuned to produce epistemic…" (`:179`) are **assertions without any tuning artefact in the repository**.
8. **Evaluation?** None. No script computes uncertainty quality (no error-detection AUROC, no sparseness/selective-risk) — State E.
9. **Downstream use?** Intended: `is_uncertain` → orchestrator `highUncertaintyFlag` → `requiresHumanReview` (`:850-851`). **Actual: field mismatch → flag never set from real values (undefined ⇒ falsy ⇒ `HIGH_UNCERTAINTY` never added, and `requiresHumanReview` derived from undefined metacog field ⇒ `!undefined = true` ⇒ review flag would be *always true* if reached — ironic inverse).** Not reachable anyway (stage-2 422).
10. **Relationship to correctness?** UNKNOWN — no labelled evaluation exists.
11. **Relationship to safety gate?** Intended (feeds gate); actual: disconnected (§12).

**Verdict:** uncertainty quantification is **implemented and executing (A)** but **scientifically unvalidated (B→C)**: wrong-but-explicit decomposition, hard-coded thresholds untuned to data, "calibrated" claim unsupported, random weights behind the numbers, and the consumer reads the wrong field names.

---

## 10. Calibration

### Search results (prompt §9)

| Term | Result |
|---|---|
| temperature scaling / Platt / isotonic / beta calibration | **0 occurrences** in `backend/src`, `ai-services`, `frontend/src` (grep) |
| ECE | `backend/src/services/calibrationService.ts:3,118` (implemented); marketing claim `frontend/.../UncertaintyAI.tsx:55` ("Calibration Score <0.04"); `README.md:158` ("ECE 0.042") |
| Brier | `calibrationService.ts:37,118-183,419` `computeBrierScore` |
| Reliability diagrams / calibration slope/intercept | none (State E) |
| Calibration invocation | **`recordPrediction(` appears exactly once repo-wide: its own definition at `calibrationService.ts:78`** (E-09) |

### Reconstruction

`calibrationService` maintains a rolling window of `{confidence, correct}` predictions and computes bucketed ECE + Brier (`:118-183`), persists `metricType: 'brier_score'` rows (`:173-174`), and reports drift via `:192+`. This is **correct-looking code that is never fed**:

- Who would call `recordPrediction`? The pipeline after ground-truth arrives (learning loop) — **no such call exists** (`routes/learningLoop.ts` adjudicates labels but never records predictions into calibration).
- Therefore: window is always empty → `brierScore: NaN` path exists (`:134`) → no calibration parameters are ever learned → **nothing in SEWA outputs a *calibrated* probability**.

### Is the reported "confidence" calibrated?

`triage`'s `confidence` is raw **softmax maximum** (`triage/main.py:276`) — a heuristic score, not a calibrated probability. Uncertainty's `calibration_score` (metacognition response, E-02) is a **rule-derived heuristic** (metacognition layer over confidence/SHAP consistency, `metacognition/main.py` layer 5 area, score `min(1.0, top_val*0.6 + concentration*0.4)` at `:317`) — not a statistical calibration.

**Flagged misuse of the term "confidence" (prompt §9):** the product surfaces label raw softmax outputs and heuristic layer scores as "confidence" and advertise "ECE 0.042" / "Calibration Score <0.04" (`README.md:158`, `UncertaintyAI.tsx:55`) with **no calibration computation ever executed on real predictions**. Status of the calibration claims: **State D (proposed), with B-level machinery present but disconnected.**

**Missing-data handling:** even if wired, calibration data would be non-independent (same stream as training-feedback loop) — no separation implemented; parameters never frozen; no recalibration schedule. All **UNKNOWN/unbuilt**.


## 11. Agreement / Disagreement

### Search results

| Term | Result |
|---|---|
| model agreement / cross-engine consistency | none in code (State E) |
| voting / consensus | none |
| ensemble variance | none (uncertainty has `std` across noise passes — variance of *one* model under perturbation, not inter-model agreement) |
| contradictory predictions | `metacognition/main.py:322-369` — contradiction detection **within** text/finding (Jaccard + negation + density, `:364`), not between models |
| confidence divergence | none |
| conflicting diagnoses | none |

### Determination

- **Disagreement is not computed at all** — binary/continuous/weighted/learned/rule-based/thresholded are all inapplicable (State E).
- Consequently disagreement **changes nothing**: no effect on confidence, reliability, safety state, explanation, action policy, or escalation.
- The only quasi-"agreement" artefact is that triage and uncertainty both run on the same image; but they answer different questions (class vs uncertainty), so no comparison is defined.

**Gap (evidence-supported, prompt §26):** *disagreement is not even measured, let alone calibrated.* This is also a research opportunity — a second independent head or an alternative-modality view could be compared cheaply (§27 WP2/WP5).

---

## 12. Safety Gate

**Priority area. Reconstructed computational logic (prompt §11).**

### Location

`ai-services/metacognition/main.py` — FastAPI route `:426 /metacognition/evaluate`; rule pipeline over layers 1–9 (`:156-420`); plus downstream action wiring in `backend/src/services/aiOrchestrator.ts:850-851,900`.

### Inputs (pydantic `MetacognitionRequest`, `:125-140`)

`scan_id, primary_finding, primary_condition?, urgency, confidence, uncertainty_score` (required), `shap_values: List[Dict]` (required, **list**), `modality, body_part, patient_age?, patient_sex?, all_findings, report_text?`.

### Transformation (layers, as read)

1. Rule matrix checks `MODALITY_FINDING_MATRIX` (validity of finding×modality) — layer 1 area.
2. Urgency/confidence plausibility (urgency prior map `URGENT: 0.60` at `:116`).
3. SHAP coherence: top-feature importance must support the finding (`:231` "SHAP features do not strongly support '<finding>'").
4. Anatomical / location consistency checks.
5. Composite heuristic score `min(1.0, top_val*0.6 + concentration*0.4)` (`:317`).
6. Report-text contradiction: Jaccard/negation/density (`:320-369`, score `:364`).
7. Uncertainty escalation (uses `uncertainty_score` input).
8. **Hallucination risk** accumulation → `hallucination_risk` scalar; gate condition **`passed = len(error_flags)==0 and hallucination_risk < 0.60`** (`:275`) — hard-coded 0.60, provenance UNKNOWN (no tuning artefact found).
9. **`safe_to_alert`** final boolean + `flags[]` + `corrected_confidence`/`corrected_urgency`.

### State/score produced (live, E-02)

`passed: bool`, `safe_to_alert: bool`, `hallucination_risk: float`, `flags: [...]`, `calibration_score`, `corrected_confidence`, `corrected_urgency`, `evaluation_ms`, `self_eval_notes`.

### Thresholds

| Threshold | Value | Source | Provenance |
|---|---|---|---|
| hallucination risk gate | `< 0.60` | `metacognition/main.py:275` | UNKNOWN — no eval, no doc, no config |
| urgency prior (URGENT) | `0.60` | `:116` | UNKNOWN |
| score weights | `0.6 / 0.4` | `:317` | UNKNOWN |
| contradiction mix | `0.2/0.6/0.2` | `:364` | UNKNOWN |
| uncertainty flags | `ep>0.25`, `al>0.5` | `uncertainty/main.py:412` | UNKNOWN |
| (if reached) review gate | `!layer9_safe_to_alert \|\| highUncertaintyFlag` | `aiOrchestrator.ts:850` | reads undefined fields (§1) |

### Actions the gate can take

- **QUALIFY** — attaches `flags`, `hallucination_risk`, `corrected_*` to response. ✔ implemented
- **ABSTAIN/DEFER/ESCALATE** — *intended* via `requiresHumanReview`/`humanReviewReason` (`:850-851`) and `pending_review` status (`:308`); **actual: unreachable** because the field names consumed (`layer9_safe_to_alert`, `highUncertaintyFlag`) don't exist in responses (§1); the Zod `AIResultSchema.parse` (`:793`) would also fail on `uncertaintyScore: undefined`.
- **ALTER output** — yes, `corrected_confidence`/`corrected_urgency` are returned (E-02) but the orchestrator **ignores them** (never reads `corrected_*` — grep).
- **ACT (block signing)** — **no code path found that blocks report signing on the gate**: `routes/reports.ts` contains zero references to `requiresHumanReview` (grep 0 matches, E-09). The flag gates the *learning-loop queue* and *displays* in peer review, not the sign action.

### Robustness (as coded)

| Situation | Behaviour |
|---|---|
| signals missing (e.g. `shap_values` wrong type) | pydantic 422 at the door (E-01) — **fails closed by rejection**, but the caller treats it as fatal → DLQ, not degradation |
| models disagree | not defined (§11) |
| uncertainty high | input `uncertainty_score` raises risk within rules; **but orchestrator sends `undefined`** (`compositeScore`) → 422 (E-01) |
| input invalid | HTTPException paths (e.g. `REPORT_CONTRADICTION` at `:252`) |
| context conflicts | report-contradiction detection (`:247-255`) — rule-based, deterministic |
| engine fails | caller DLQ loop (§8); benchmark harnesses count failure as "blocked" (§19) |

### Validation of the gate itself

**No independent evaluation.** The two harnesses that claim to evaluate it are structurally invalid (§19): wrong request contract (`shap_values: {}`), wrong response field (`layer9_safe_to_alert`), and **service errors counted as successes** (`metacognition-benchmark.ts:59-61`; `safety-validation.ts:94-96`). Under the current service contract every case in `safety-validation` 422s at `:75-89` → `metacogPass=false` → precision/recall computed on a degenerate matrix. **The gate is calibrated?** No (§10). **Reproducible state transitions?** Yes for the rule engine itself (deterministic, no model) — the *only* fully reproducible safety component.

**Verdict: State A (implements) / State C (does not act in the running system) / State E (no independent validation).**

---

## 13. Confidence Integrity Score

Prompt §12: reconstruct the CIS or state the repository does not support it.

### Claim locations (State D)

- `frontend/src/pages/public/products/MetacognitionAI.tsx:60` — *"CIS Scoring — Assigns a Confidence Integrity Score (CIS) to every case based on 12 safety metrics."*
- `frontend/src/pages/public/LandingPage.tsx:12` — *"Confidence integrity score per result."*
- `frontend/src/pages/public/TechnicalWhitepaperPage.tsx:221` — *"… → CIS scoring"*
- `frontend/src/pages/public/TechnicalWhitepaperPage.tsx:300` — *"All SEWA XAI performance metrics are independently validated and peer-reviewed."*
- `README.md:157-158` — "Hallucination catch rate 96.3%", "Uncertainty calibration (ECE) 0.042"

### Implementation search (State E)

- `git grep -i "confidence integrity|integrityScore|integrity_score"` over `backend`, `ai-services`, `edge-ai`, `dicom-ingestion` → **zero matches** (E-09).
- No 12-metric aggregator, no metric list, no weights, no normalisation, no threshold, no equation anywhere in source.
- The only "score-like" composites are: `uncertainty_score = min(1, ep+0.3·al)` (`uncertainty/main.py:212`) — a 2-metric unweighted fixed-coefficient sum; and metacognition's layered flags — not a 12-metric CIS.

### Conclusion (explicit, per prompt §12)

**The repository does not support the claimed number or composition of metrics.** There is no CIS: no name, no formula, no scale, no normalisation, no directionality, no weights, no thresholds, no missing-data handling, no source, no downstream use — because the artefact does not exist in code. What exists downstream of the *claim* is `metacognitionFlags: string[]` (`aiOrchestrator.ts:799-802`), which is (a) not a score, (b) populated from undefined fields (§1), (c) never aggregated.

CIS status: **State E (not found) — claimed publicly.** This is a negative finding of first order (§35): a marketed capability with zero implementation.


## 14. Metacognitive Reliability State Assessment

### Required component table (prompt §13)

| MRS Component | Present? | Evidence | Status | Gap |
|---|:-:|---|:-:|---|
| Prediction | partial | `triage` `primary_finding` + `urgency` (live E-04) | A | runs on random weights (E-05); consumed via wrong field names (§1) |
| Confidence | partial | softmax max (`triage/main.py:276`); `corrected_confidence` (metacog, E-02) | A/C | uncalibrated (§10); correction output ignored by orchestrator |
| Epistemic uncertainty | yes | `uncertainty/main.py:209` (live 0.0124) | A | input-noise approximation; random weights; consumer reads wrong key (§1) |
| Aleatoric uncertainty | yes (non-standard) | `:211` = predictive entropy, not aleatoric | A/C | mathematically mislabelled (§9) |
| Calibration | machinery only | `calibrationService.ts:118-183,419`; zero callers (E-09) | B | never invoked; no calibrated outputs |
| Agreement | no | — | E | (§11) |
| Disagreement | no | — | E | (§11) |
| Input validity | yes | metacognition layer 1 modality×finding matrix (`metacognition/main.py` rules, `MODALITY_FINDING_MATRIX`); pydantic patterns on every service | A | disconnected from orchestrator payload (422, E-01) |
| Context consistency | yes | report-contradiction detection (`:320-369`) | A | only within one service's inputs; no cross-engine check |
| Distribution shift | no (fabricated) | `/drift` returns time-bucket jitter (`ai-monitoring.ts:164-175`) | C | real drift detection absent (§17) |
| Reliability aggregation | **no** | no code combines the above into one state | E | **the core gap** |
| Explicit reliability state | **yes (g-v1, log-only, frozen)** | no typed object/enum/DB row representing "reliable/unreliable" | E | `metacognitionFlags[]` intended but fed by undefined fields |
| Reliability explanation | partial | `explanation` string from uncertainty (E-03, generated from thresholds `:413-417`); metacog `self_eval_notes` | A | template prose, not a faithful account of a composed state (§15) |
| Action policy | partial | `requiresHumanReview` + `humanReviewReason` (`aiOrchestrator.ts:850-851`), `pending_review` (`:308`), learning loop queue (`learningLoop.ts:19-26`) | C | derived from undefined fields; not gated at signing (§12); no policy spec |
| Abstention | implicit | triage urgency `UNKNOWN` path (`triage/main.py:245`); metacog `passed=false` | C | never wired to an explicit abstain action |
| Deferral | partial | `requiresHumanReview` → peer-review queue | C | unreachable from live gate (§1) |
| Escalation | partial | `urgency` CRITICAL → alert path in pipeline; `corrected_urgency` returned but ignored | C | no evaluated escalation policy (§16) |
| Audit/provenance | schema only | `MetacognitionAuditLog` table (`prisma/schema.prisma` ≈:1245); **zero writers** (E-09) | E/D | table exists, never populated |

### Explicit answer (prompt §13 final question)

> **SEWA currently has only the raw ingredients — plus one executable rule-based self-evaluator — and now implements g-v1 reliability state (log-only) with frozen thresholds/weights or even a coherent precursor.** The ingredients are (i) mutually disconnected by contract errors, (ii) not calibrated, (iii) not aggregated, (iv) not evaluated, and (v) not persisted where the schema expects them. The metacognition service is a genuine self-evaluator, but it evaluates *case plausibility*, not the *system's own reliability state*, and its outputs never reach any consumer in the running system.

Do not force novelty: rule-based safety gates and multi-signal self-checks are established engineering (§25, §29).

---

## 15. Explainability

### Inventory & classification (prompt §14)

| Mechanism | Class | Source | Faithfulness | Evaluated? | Can mislead? |
|---|---|---|---|:-:|:-:|
| SHAP-style region attribution | post-hoc | `uncertainty/main.py:231+` finite-difference regions (not Shapley); **demo path: `np.random.dirichlet` random importances** (`:241-245`) | low (approximation; random in demo) | no | **yes** — random values presented as `shap_values` |
| Grad-CAM | post-hoc | gradient approximation noted in header comment (`:9`); `gradcam_base64/url` in response (E-03) | UNKNOWN — not inspected as produced image | no | possible |
| Feature importance coherence | post-hoc rules | metacognition layer-5 SHAP coherence (`:231`) | depends on input SHAP quality | no | possible |
| Structured evidence (intrinsic) | intrinsic | metacognition `flags[]`, `self_eval_notes`, layer scores; `all_findings` + `snomed_code` from triage | high (rules are transparent) | no | low |
| Reliability/uncertainty explanation | reliability | `uncertainty` `explanation` text built from thresholds (`:413-417`: "Epistemic uncertainty: X (HIGH — model unsure)…") | faithful to the computation it describes | no | moderate — implies model trustworthiness it can't establish |
| Reason for abstention/escalation | reliability | `humanReviewReason` (`aiOrchestrator.ts:851`), `REPORT_CONTRADICTION` message (`metacognition/main.py:252-255` with suggestion) | faithful when reached | no | — |
| Natural-language report | NL generation | `vlm-report` templates (`:109+`) + optional Azure OpenAI | **not explainability** — report prose | no | yes if read as justification |
| CIS explanation | claimed | marketing only (§13) | n/a | no | **yes — does not exist** |

### Determination

- **Intrinsic**: genuine but narrow (rule flags/notes).
- **Post-hoc**: implemented as *approximations* with an explicit **random fallback** in demo mode — meaning the audit's live `shap_values` were random Dirichlet draws (E-05 context).
- **Natural-language explanation**: template/VLM prose — **must not be labelled explainability automatically** (prompt §14). The orchestrator never validates report-text vs finding except via metacognition contradiction rules (which never ran due to 422).
- **Evaluation of faithfulness**: State E — no human study, no sanity check (e.g. parameter/randomisation tests), no fidelity metric anywhere.

**Key negative**: the explanations with the highest marketing visibility (CIS, calibration score, ECE) are the ones with **no implementation** (§13, §10).

---

## 16. Action / Abstention / Deferral Policy

### State machine as recovered from code

```
scan uploaded
   │ consent check ── no ──▶ status='pending_review', requiresHumanReview=true,
   │                        reason='CONSENT_NOT_GIVEN' (aiOrchestrator.ts:308)
   ▼
runAIPipeline
   │ any stage throw ──▶ DLQ enqueue (retry forever) ( :924-925 )   ◀── CURRENT REALITY for every scan
   ▼ success (unreachable today)
AIResult persisted; requiresHumanReview = !gate.safe_to_alert || highUncertaintyFlag (:850)
   │
   ├─ requiresHumanReview=true ──▶ learning-loop queue (learningLoop.ts:19-26)
   │                               → peer review UI (PeerReviewWorkspace.tsx:101)
   │                               → adjudication resets flag (learningLoop.ts:79-82)
   └─ urgency flow ──▶ CRITICAL/URGENT alerts; pathology/mammography/retinal paths set
                        review flag on urgency!='NORMAL' (:433,534,631)
```

- States are **explicit** in data (`pending_review`, `requiresHumanReview`) but the **policy is implicit**: no spec file, no enum of actions, no thresholds doc; conditions scattered (`:308,433,534,631,850`).
- Rule-based & threshold-based (hard-coded, provenance UNKNOWN — §12 table); partially configurable via DB flags, not via policy config.
- **Abstain/defer**: implemented as *flag-for-human*, never as *suppress AI output*. `routes/reports.ts` does not gate signing on the flag (grep 0, E-09) — i.e. **a report can be signed regardless of the reliability state** (subject to role permissions only).
- **Escalation**: urgency-based; metacog's `corrected_urgency` (E-02) is returned but **never read** by the orchestrator.

### Evaluation of the policy (prompt §16 list)

selective risk — **none**; risk-coverage curves — **none** (grep 0); error detection — **none**; escalation burden — **none**; false-abstention rate — **none**; consequential-error detection — **none**. All State E. The policy is **unevaluated**.

---

## 17. Distribution Shift / OOD

| Mechanism sought | Found | Evidence | State |
|---|:-:|---|:-:|
| OOD detection | no | grep `OOD|out-of-distribution|embedding distance|Mahalanobis|density estimation` → 0 in backend/ai-services | E |
| Domain/scanner/acquisition variation | no | only region strings (`uk/eu/us/ng`) for compliance routing | E |
| Modality shift | partial | pydantic modality patterns *reject* unseen modalities (422) — a hard gate, not detection | A (as validation) |
| Prevalence/dataset shift | no | — | E |
| Drift detection | **fabricated** | `ai-monitoring.ts:164-175`: `/drift` computes `kappa = 0.84 + (timeBucket % 6)/100`, `psi = 0.02 + (timeBucket%2)/100` — pure function of wall-clock | C |
| Bias/demographic audit | **fabricated** | `:181-201`: hard-coded AUCs by age/sex/region (incl. "UK 0.947 / Africa 0.933") | C |
| Drift (training) | schema only | `calibrationService.ts:192+` metric-drift logging — but window never fed (§10) | B |

**Determination**: distribution-shift handling is **not operational, not even prototyped** — it is *simulated for dashboards*. Status C for the endpoints, E for the science. This is a first-class negative finding (§35) and simultaneously a clean research gap (§28): no baseline exists to improve.


## 18. Data and Dataset Audit

### Inventory of all data/dataset references (prompt §17)

| Name | Source | Location | Modality/Task | Size | Labels | Provenance | Split | Internal/External | Licensing/access |
|---|---|---|---|---|---|---|---|---|---|
| Synthetic test DICOMs | generated by script | `ai-services/triage/sample_data/test_dicoms/` (8 files: ICH, META, NORMAL, PE, PNEU, STROKE, TB, UNCERTAIN + `MANIFEST.json`) | CT/XR demo images | 8 | manifest JSON | **synthetic, generated** (`generate_test_dicoms.py`) | none | internal | free (synthetic) |
| Golden dataset fixtures | hand-written in TS | `backend/src/__tests__/golden-dataset.test.ts` (100 `GOLDEN_RESULTS` rows) | 14 conditions; assertions on confidence/urgency/uncertainty | 100 | embedded in code | **hand-authored expected values** | n/a (test) | internal | n/a |
| Safety benchmark cases | generated | `backend/src/validation/{pass,fail,hallucination,uncertainty,contradiction}_cases/*.json` (+ `generate_cases.ts`) | synthetic metacog inputs | ≥40 files (contradiction 061–080, fail 021–032, …) | `expected: PASS/FAIL` | generator script | n/a | internal | n/a |
| "100+ ground truth scans" | comment only | `golden-dataset.test.ts:6-7` header ("Based on recommendation…") | — | claimed 100+ | — | **no images exist** — fixtures are numbers | — | — | — |
| Clinical dossier plans | docs | `docs/clinical-dossier/02_Clinical_Investigation_Plan.md`, `03_Statistical_Analysis_Plan.md` (e.g. "~150-400 positive cases each") | planned study data | planned | planned | planned external | planned | planned | UNKNOWN — insufficient evidence in the repository |
| Investor CSVs | business | `investor-submission/*.csv` | financial, not clinical | — | — | — | — | — | n/a |

### Leakage / duplication checks (as far as possible)

- **Patient/study duplication, augmentation leakage, temporal leakage, test-set contamination**: **cannot occur because no real dataset exists** — the strongest possible (and unfortunate) negative result. State E.
- **Threshold tuning on test data / calibration on test data**: thresholds exist only as hard-coded constants with no tuning artefact (§12); the golden fixtures *are* the only "test data" and are self-referential — a circularity, not leakage: `GOLDEN_RESULTS` asserts values (e.g. `GT-001 confidence:0.97, uncertaintyScore:0.04, metacognitionPassed:true`) that no model produced.
- **Do not infer clinical usability from technical loadability**: the synthetic DICOMs load and services answer (E-03/E-04) — that proves plumbing only.

**Verdict: no clinical datasets in the repository (State E).** Any statement about data volume ("2.1M+ scans", README.md:160) is **UNKNOWN — insufficient evidence in the repository**.

---

## 19. Evaluation Infrastructure

### Every evaluation script/benchmark found

| Artefact | What it claims to measure | Actual mechanics | Validity |
|---|---|---|---|
| `backend/src/validation/metacognition-benchmark.ts` (79 lines) | "Catch Rate" of unsafe cases; contradiction catch; uncertainty escalations | POSTs to metacognition with **`shap_values: {}`** (`:40`) → service requires list → **422 every case**; on error: `if (isUnsafe) blockedCases++` — **failures counted as blocked** (`:59-61`); reads `result.layer9_safe_to_alert` (`:55`) — field doesn't exist (live E-02) → `!undefined = true` → **every successful case also counts as blocked**; denominator-0 → `'100.0'` hard-coded (`:63`) | **invalid (C)** — structurally guaranteed ≈100% "catch rate" |
| `backend/src/validation/safety-validation.ts` (132 lines) | "Full Pipeline Validation", Safety Precision/Recall, False Pass/Block rates | Stage A **mocks triage/VLM/uncertainty by design** (`:53-72`, comments state "we don't have real images"); only metacognition called; same wrong contract (`shap_values: {}`, `:82`) → 422 → `catch → metacogPass=false` (`:94-96`); reads `layer9_safe_to_alert` (`:91`) — wrong field; precision/recall formulas `:116-117` with 100% defaults when denominators are 0 | **invalid (C)** |
| CI `safety-gate` job | deploy blocker | boots metacognition, runs both scripts (`.github/workflows/deploy.yml:166-199`) | runs, but **gates on invalid measurements** |
| `backend/src/__tests__/golden-dataset.test.ts` | "clinical accuracy must not regress; deployment BLOCKED" (header `:4-7`) | asserts hand-written fixtures against hand-written expectations; zero system interaction | **self-referential (C)** |
| `backend/src/__tests__/orchestration.test.ts` | pipeline behaviour | axios mocked — no real service contract exercised | B/C (mocked) |
| `e2e/tests/clinical-workflow.spec.ts` | clinical workflow E2E | login-page title + login navigation; authenticated part skipped without env | **placeholder (C)** |
| Marketing metrics (`README.md:152-163`) | AUC-ROC 0.972, ECE 0.042, catch 96.3%, door-to-alert 1.84s | **no producing code, no dataset, no eval output anywhere** | **non-reproducible (D)** |
| `docs/clinical-dossier/03_Statistical_Analysis_Plan.md` | planned AUROC/AUPRC/bootstrap CIs | plans only | D (planned) |

### Metric catalogue (prompt §18) — traceability

| Metric | In repo? | Traceable to code? | Reproducible? |
|---|:-:|---|:-:|
| AUROC/AUPRC | claimed (README, `federatedV2Service.localAuroc:74,967`) | no eval script computes them for triage/pathology (only federated *stub fields*) | **no** |
| Sensitivity/Specificity/PPV/NPV/F1/Accuracy | no computing script for main models | `ai-monitoring.ts:136-138` synthetic fallbacks | **no** (fabricated path) |
| Calibration/ECE/Brier | code exists (`calibrationService.ts`) | yes — but never fed (§10) | **no** (never executed) |
| Risk-coverage / selective risk / error-detection AUROC / abstention rate / escalation rate | **absent** (grep 0) | — | State E |
| Latency | real: `inference_ms` live (E-03: 1012ms), `stageTimings` | yes | partial (single-run, no harness) |
| Throughput/memory | Prometheus histograms in services | present as instrumentation; no recorded results | partial |
| Hallucination catch rate | claimed 96.3% | only by the invalid benchmark (above) | **no — structurally inflated** |

**Reproduction attempted where feasible**: (i) live latencies/outputs reproduced (Appendix F); (ii) benchmark catch-rate logic *reconstructed by code reading* — running it would only confirm its invalid structure; (iii) AUC/ECE claims **cannot be reproduced — no data, no weights, no script** (prompt: "If a metric cannot be reproduced, state why" — reason: absent inputs and absent producing code).

---

## 20. Reproducibility (scored 0–5, prompt §19)

| Criterion | Finding |
|---|---|
| Setup instructions | present (README/DEPLOYMENT) but assume missing artefacts (`.pt`, secrets) |
| Dependency manifests | present: `backend/package.json` (+yarn.lock), per-service `requirements.txt` — **but venv lacks `openai`, `asyncpg`, `flwr` → 3/10 services fail import (E-06)** |
| Lock files | backend yes; Python services pin exact versions (good) |
| Runtime versions | CI sets Node/Python versions (`.github/workflows/deploy.yml` env) |
| Environment vars | many (service URLs, `MODEL_CACHE`, `MC_DROPOUT_PASSES`, `MC_NOISE_STD`); no `.env.template` verified in this audit for all — **UNKNOWN for completeness** |
| Model weights | **absent** (E-09) — services self-heal with *random* demo models (E-05): reproducible *behaviour*, meaningless *numbers* |
| Data availability | synthetic only (§18) |
| Scripts | present (`export_models_to_onnx.py` — unusable without weights) |
| Random seeds | `np.random.default_rng(seed)` in uncertainty passes (`:189`) — seeded per pass; demo weight generation `np.random.randn` **unseeded** (E-05) |
| Docker | compose file present (not built in this audit) |
| CI | present and executed historically (AGENTS.md notes billing blocker for one job — not re-verified) |
| Tests | present but see §21 |

**Score: 2 — partially reproducible.** Rationale: one can reproduce *service behaviour* (boot, rule outputs, deterministic contract failures — done in this audit), but **not any scientific result**, because weights, datasets and eval outputs are absent and advertised metrics have no producing code. Not a 1 (infrastructure and running code exist), not a 3 (no minor-intervention path to reproduce a single reported metric).

---

## 21. Testing

### Inventory

| Type | Count/Location | Quality |
|---|---|---|
| Unit (backend) | 15 files: `ai, circuitBreaker, confidentialLedgerService, fhirService, golden-dataset, health, idempotency, merkleBlockService, mlopsPipelineService, orchestration, reportVersionService, rls-full, storageService, tenant-isolation` + `backend/services/clinical-verification/tests/clinicalVerification.test.ts` | mixed; `orchestration.test.ts` mocks all HTTP (`:182,238` assert `requiresHumanReview` on mocked data) |
| AI service tests | `deploy.yml:140 python -m pytest tests/ -v \|\| echo "No tests yet - linting only"` — **pytest step tolerates absence**; no `tests/` dirs found in `ai-services` in this audit | effectively **none** for inference services |
| Safety/gate tests | the two validation scripts (§19) | invalid (C) |
| Adversarial / corrupted-input tests | none found | State E |
| E2E | `e2e/tests/clinical-workflow.spec.ts` — login only | placeholder |
| Regression | golden dataset claims this role | self-referential |

### Critical safety logic WITHOUT tests (prompt §20 targets)

- **Thresholds**: `hallucination_risk < 0.60`, `ep>0.25`, `al>0.5`, score weights — **no unit test** asserts their behaviour at boundaries.
- **Gate logic**: metacognition layers — zero Python unit tests (pytest step is optional in CI).
- **Uncertainty**: no test of decomposition monotonicity/limits.
- **Calibration**: `calibrationService` has no test (not in the 15 files).
- **Escalation/missing signals/engine failure**: no test simulates a service 422/timeout through `runAIPipeline` (which is exactly why the contract break survives CI — every test mocks axios).
- **Model disagreement**: N/A (§11).

**Verdict:** testing exists at the platform layer (auth, tenant isolation, RLS — genuinely useful) and is **absent precisely where safety claims are made**. Status: B/C.


## 22. Runtime and Deployment

### Classification of runtime components (prompt §21)

| Component | Classification | Evidence |
|---|---|---|
| Docker Compose stack | **currently executable** (structure) | `docker-compose.yml` (version 3.9; services incl. `postgres`, `redis`, `backend`, `frontend`, `nginx`, `voice-transcription`, `translation`, `ai-triage`, `ai-vlm`, `ai-uncertainty`, `ai-pathology`, `ai-mammography`, `ai-retinal`, `ai-metacognition`, `ai-federated`, `ai-continuous`, `edge`) — not built in this audit; individual services proven bootable (Appendix F) |
| Kubernetes manifests | **infrastructure scaffold** | `azure/k8s/` — 17 `kind: Deployment`; image refs `sewaaieuprodacr.azurecr.io` (AGENTS.md work state: deployed historically) |
| Terraform | **infrastructure scaffold** | `infrastructure/terraform-azure/` — AKS `sewa-ai-prod-eu-aks`, 3 node pools, PaaS per AGENTS.md; state refresh documented as unreliable from this machine — re-verification UNKNOWN here |
| CI/CD | **currently executable** | `.github/workflows/ci-cd.yml` (`npm test -- --passWithNoTests`, `:77`), `deploy.yml` (tests, safety-gate, ACR build) |
| Local inference | **currently executable (CPU)** | proven live: boot ~60s (model/demo load), inference `inference_ms≈1012` (E-03) on CPU |
| GPU requirements | **none by design** | CPU/ONNX-INT8 design (AGENTS.md "No GPU pool"); ONNX runtime warmup `triage/main.py:99` |
| ONNX/TensorRT / quantisation | partial | ONNX present; INT8 path exists (`export_models_to_onnx.py`, `_resolve_model:117-141`) but **never exercised on real weights**; TensorRT — State E (N/A, CPU-only design) |
| Queues | implemented | Service Bus (Terraform) + `dlqService` DLQ retry (`aiOrchestrator.ts:28,924-925`) |
| Databases | implemented | PostgreSQL via Prisma; migrations applied historically (AGENTS.md) |
| DICOM | implemented (service) | Go `dicom-ingestion` + synthetic sample DICOMs |
| PACS / RIS / HL7 | **not found** | grep for PACS/RIS/HL7 integration endpoints → no active connectors (FHIR client exists — §23) |
| FHIR | implemented (client) | `backend/src/services/fhirService.ts` + test |
| Monitoring | mixed | Prometheus metrics real in services; **drift/bias dashboards fabricated** (§17) |

### Latency/memory (observed, single-run, this audit)

- Service startup to ready: **~60 s** (lifespan warmup: 5 warmup passes `triage/main.py:99`, 3 `uncertainty/main.py:116`, or demo generation `uncertainty/main.py:111`).
- Triage/uncertainty HTTP response: `inference_ms` 300–1012 ms range observed (E-03/E-04) — CPU only.
- Memory: UNKNOWN — insufficient evidence in the repository (no recorded profiling).

**Verdict**: runtime is **real, CPU-lean, and locally reproducible** (State A) on scaffolding that has historically been deployed (State B — not re-verified from this machine); the *AI workload* it runs is a demo (E-05).

---

## 23. Clinical Workflow Integration

| Capability | Classification | Evidence |
|---|:-:|---|
| DICOM ingestion | **implemented** (synthetic-data tested) | Go service + `sample_data/test_dicoms/` + manifest |
| PACS | **not found** | State E |
| RIS | **not found** | State E |
| HL7 | **not found** | State E |
| FHIR | **implemented (client + tests)** | `backend/src/services/fhirService.ts`, `fhirService.test.ts` |
| Radiology worklist | **prototype** | scan queue/status surfaces (`routes/pipeline.ts`, frontend dashboards) — no DICOM-worklist (MWL) protocol found |
| Alerts | **implemented (scaffold)** | urgency→alert path in pipeline + Service Bus queues; end-to-end alert delivery not exercised here — State B |
| Clinician dashboard | **implemented** | frontend radiologist workspaces (peer review, pipeline status `usePipelineStatus.ts`) |
| Report generation | **implemented, currently unreachable** | `prisma.report.create` at `aiOrchestrator.ts:831` — after stage 4 (unreachable, §1); `routes/reports.ts` CRUD works |
| Prior-scan comparison | **claimed/longitudinal field only** | `longitudinalContext` field threaded (`aiOrchestrator.ts` context vars) — comparison logic State D/UNKNOWN |
| Audit trail | **implemented** | Prisma audit tables + confidential ledger service (`confidentialLedgerService.test.ts`, `merkleBlockService.test.ts`) |
| Human override | **implemented** | peer-review accept/reject/override UI + `learningLoop.ts` flag reset (`:79-82`) |
| Report signing gate on AI reliability | **not found** | `reports.ts` has zero `requiresHumanReview` references (E-09) |

**Verdict**: the *clinical shell* is the most genuinely-built part of SEWA (State A/B); the *AI content* flowing through it is disconnected (§1) and unevaluated (§19).

---

## 24. Security / Privacy / Governance

(Engineering evidence only — no regulatory certification statement, per prompt §23.)

| Area | Finding | State |
|---|---|:-:|
| Authentication | JWT auth middleware across routes; RBAC roles (`doctor/admin/superadmin` per AGENTS.md; roadmap resolve restricted `admin`/`superadmin`) | A |
| Authorization | tenant scoping (`tenantId` on creates, `tenant-isolation.test.ts`, `rls-full.test.ts` Postgres RLS) | A |
| `v2Router` exposure | unauthenticated v2 endpoints noted in prior trace; no frontend consumers (E-09) — dead but exposed surface | C (risk) |
| Secrets management | Key Vault in Terraform (`keyvault-secrets.tf`), K8s secret manifests (`azure/k8s/acr-secret.yaml`, `secret-patch.yaml`, `redis-secret-patch.yaml` tracked); **local `.env` files exist untracked — not read by this audit**; tracked files listed by path only, values never printed | B |
| Encryption | storage/PG encryption per Terraform; README claims "AES-256 / TLS 1.3" (`:163`) — configuration-level, consistent with Azure defaults, **not independently verified here** | B |
| Audit logs | audit tables + Merkle/confidential-ledger integrity services (tested) | A |
| Patient-data handling | de-identification not found as implemented module (State E); synthetic-only data in repo (§18) — accidental protection | E |
| Retention | storage lifecycle policy documented in AGENTS.md (7-year) — infra-level, not re-verified | B |
| API security | rate limiting/idempotency (`idempotency.test.ts`), input limits in pydantic (`max_length` DoS guards, e.g. `metacognition/main.py:137`) | A |
| Dependency vulnerabilities | not scanned in this audit — UNKNOWN; note `backend/package.json` uses pinned devDeps; Python services pin exact versions | UNKNOWN |
| Supply-chain controls | GitHub OIDC to ACR (`setup-github-oidc.sh`), lockfiles present; ACR `default_action = Allow` per AGENTS.md (auth still via OIDC tokens) | B |
| Fabricated safety dashboards as governance risk | `/bias`, `/drift` present fabricated numbers (§17) — a governance hazard if shown to clinicians | C |

**Notable structural risk**: marketing pages assert certification/compliance status (`README.md:167-173` "CE Mark IIb — Held, UKCA — Held, ISO 13485 — Certified"); engineering evidence for these is **UNKNOWN — insufficient evidence in the repository**; do not repeat in research contexts.

---

## 25. Implemented vs Claimed vs Proposed Matrix

| Claim (source) | Code evidence | Implemented? | Working? | Validated? | Reproducible? | Safe to state? |
|---|---|:-:|:-:|:-:|:-:|:-:|
| "Multi-engine AI pipeline" (README/whitepaper) | `aiOrchestrator.ts:279` | ✔ | **✘** (contract break, E-01…E-04) | ✘ | ✔ (failure reproducible) | only as "pipeline code exists; execution blocked by contract mismatch" |
| "Hallucination catch rate 96.3%" (README:157, whitepaper:221) | `validation/metacognition-benchmark.ts` | ✔ (script) | **✘ invalid** (errors→blocked; wrong fields) | ✘ | ✘ | **no** |
| "Uncertainty calibration ECE 0.042" (README:158; `UncertaintyAI.tsx:55`) | `calibrationService.ts` (never called) | partial | ✘ | ✘ | ✘ | **no** |
| "ICH AUC-ROC 0.972" (README:156) | no producing code | ✘ | ✘ | ✘ | ✘ | **no** |
| "Confidence Integrity Score, 12 metrics" (`MetacognitionAI.tsx:60`, `LandingPage.tsx:12`) | none (E-09) | ✘ | ✘ | ✘ | ✘ | **no** |
| "Metrics independently validated and peer-reviewed" (whitepaper:300) | no artefacts | ✘ | ✘ | ✘ | ✘ | **no** |
| "MC-Dropout uncertainty" | `uncertainty/main.py:170` (input-noise approximation) | ✔ (approx.) | ✔ executes | ✘ | ✔ (code-reproducible) | "input-noise MC approximation, unvalidated" |
| "Metacognition safety gate" | `metacognition/main.py:426` | ✔ | ✔ executes | **✘** | ✔ (deterministic) | "deterministic rule gate; not independently evaluated; not wired to consumers" |
| "Human-review escalation" | `:850` flag + `learningLoop.ts` | partial | **✘** (flag from undefined fields; not gated at signing) | ✘ | n/a | "queue + UI exist; automatic trigger unreachable" |
| "Drift/bias monitoring" (`ai-monitoring.ts`) | `:164-201` | ✔ (endpoint) | ✘ fabricated | ✘ | ✘ | **no** — report as placeholder |
| "Federated learning" | `ai-services/federated-learning` | partial | **✘** (flwr missing, E-06) | ✘ | ✘ | "scaffold only" |
| "47+ hospitals / 2.1M scans / certifications" (README:159-173) | none | unknown | unknown | unknown | unknown | **no — UNKNOWN: insufficient evidence in the repository** |
| "Condition-specific models (pathology/mammography/retinal)" | service dirs + orchestrator stages | ✔ scaffold | unverified here; same demo-fallback risk | ✘ | ✘ | "services exist; no weights" |
| Thresholds `0.60/0.25/0.5` as clinically tuned | constants in code | ✔ | ✔ | **✘ no tuning artefact** | ✘ | "hard-coded, provenance unknown" |

**Prompt §3 separation respected**: nothing in the "Safe to state" column collapses implemented/working/validated.


## 26. Code → Research Mapping

| Existing Code | Scientific Question | Hypothesis | Experiment | Outcome (measurable) | Missing Instrumentation |
|---|---|---|---|---|---|
| `uncertainty/main.py:209-212` (ep/total decomposition) + `triage` confidence + `metacognition` flags | Can a formal **reliability state** (fused signals) detect consequential AI errors better than any single signal? | H1: fused state ≥ best single signal on error-detection AUROC; improves risk-coverage | Fix contracts; log signals + ground truth on N≥300 labelled cases; pre-registered logistic/monotone fusion vs single signals | ΔAUROC with bootstrap CI; area under risk-coverage; false-abstention @ target coverage | contract fix; ground truth; `recordPrediction` wiring; fusion module; eval harness |
| `calibrationService.ts` (ECE/Brier, unused) | Does calibrating per-modality change abstention quality? | H2: calibrated confidence reduces false reassurance at fixed coverage | Fit temperature/isotonic on held-out split; compare ECE/Brier and downstream selective risk before/after | ECE, Brier, selective risk curves | calibration invocation; independent split; frozen parameters |
| `metacognition/main.py` layers (rules) | Is the gate's *stated reason* faithful to its decision? (metacognitive explainability) | H3: flag-level explanations are causally faithful (ablation: remove cited signal ⇒ decision flips) | Automated counterfactual ablations over each layer + human study of reason usefulness | faithfulness score; user reliance metrics | ablation harness; UI study instrument; logging of per-layer contributions |
| `aiOrchestrator.ts:850` + `learningLoop.ts` (human-review queue) | Does the reliability state support **appropriate reliance** by clinicians? | H4: showing reliability state improves correct reliance vs showing confidence alone | Reread/simulated reader study with/without state display; measure correct-accept/correct-reject | reliance ROC; time-to-adjudication | display instrumentation; reader-study protocol; ground truth |
| Contract break itself (`aiOrchestrator.ts` vs services) | How much of "AI system behaviour" is untested integration? (evaluation science of safety-assured pipelines) | H5: contract-level property tests catch failures that mocked unit tests miss | Metamorphic/property-based cross-service contract tests vs existing mocked suite | failure detection rate of test strategies | typed shared contract (OpenAPI/JSON-schema), CI job running real services |
| `uncertainty` under modality shift (`:142` pattern; demo weights) | Does the uncertainty state remain calibrated under distribution shift? | H6: uncertainty rises under shift (scanner/modality/prevalence) before accuracy falls | Inject controlled shifts (noise, resolution, prevalence) on synthetic+public data; track state signals | shift-detection AUROC; calibration drift | shift generators; external dataset; OOD baseline (Mahalanobis/embedding) — currently State E |
| Fabricated monitoring (`ai-monitoring.ts:164-201`) | *(negative instrument)* — what happens when safety dashboards are untested? | — | Replace with computed metrics; diff vs fabricated defaults | dashboards ≠ constants | real PSI/kappa computation + tests |

### Work-package mapping (prompt §27)

- **WP1 Foundations/formalisation** — define reliability state formally (types, invariants) ← mapping rows 1, 5.
- **WP2 Reliability-state construction** — fusion + calibration ← rows 1, 2.
- **WP3 Metacognitive explainability** — faithfulness of gate reasons ← row 3.
- **WP4 Metacognitive regulation** — action policy, abstention, escalation ← rows 1, 4.
- **WP5 Robustness/distribution shift** ← row 6.
- **WP6 Human-AI interaction** ← row 4.
- **WP7 Medical-imaging demonstrator** ← the platform itself as testbed (needs real weights/data).

### Smallest credible research programme (prompt §27 final question)

**WP1 + WP2 + WP5 (with WP4 policy as evaluation target), using WP7's platform as instrument.** WP3 is a strong secondary contribution if instrumentation exists; WP6 optional follow-on; a full 7-WP programme is not justified by the current evidence base.

---

## 27. Research Opportunities

Ranked by (evidence strength of the gap) × (falsifiability) × (cost to instrument):

1. **Formalisation + evaluation of an explicit reliability state from existing signals** (§14 table is the gap map). Evidence: signals exist (E-02/E-03), aggregation absent (E), calibration never invoked (E-09), no risk-coverage evaluation anywhere (grep 0).
2. **Faithfulness of rule-based metacognitive explanations** — metacognition emits reasons (`flags`, `self_eval_notes`, `REPORT_CONTRADICTION` message) with zero faithfulness evaluation; ablation-based faithfulness testing is cheap and novel-ish (*potential research novelty requiring literature verification*).
3. **Contract-aware safety testing for medical-AI pipelines** — this repo is a live specimen: mocked tests pass while the pipeline provably 422s end-to-end (E-01…E-04). Methodological contribution: property/metamorphic contract tests as a safety-assurance layer.
4. **Uncertainty under modality/distribution shift** — decomposition exists; shift handling is fabricated (§17); evaluation absent → clean baseline-to-improvement arc.
5. **Appropriate reliance with reliability-state displays** — human-review queue + peer-review UI give an existing instrument (§16).
6. **Calibration as a disconnected subsystem** — textbook methods already coded but unwired; a replication-grade evaluation of "calibration changes abstention quality" is immediately runnable once predictions flow.

---

## 28. Scientific Gaps

(evidence-supported only, prompt §26 list checked against repository)

| Gap (from prompt list) | Present in SEWA? | Evidence |
|---|:-:|---|
| Reliability signals exist but are not unified | **yes** | §14 table: ep/al/confidence/flags produced separately; no aggregator (grep for fusion/aggregate state → 0) |
| Reliability score exists but is not validated | **yes** (flags/scores exist) | no eval harness (§19); `MetacognitionAuditLog` empty (E-09) |
| Thresholds are heuristic | **yes** | §12 threshold table — all provenance UNKNOWN |
| Safety gate has no independent evaluation | **yes** | both harnesses invalid (§19) |
| Explanations are not demonstrably faithful | **yes** | §15: no faithfulness test; random SHAP fallback (`uncertainty/main.py:241-245`) |
| Uncertainty is generated but not acted upon | **yes** | `is_uncertain` → wrong consumer field (§1); `calibration_score`/`corrected_*` never read (grep) |
| Disagreement is measured but not calibrated | **N/A — not even measured** | §11 State E |
| Abstention exists but has no risk-coverage evaluation | **yes** | grep `risk-coverage|selective-risk` → 0 (§19) |
| Action policy is not formally defined | **yes** | scattered conditions, no spec (§16) |
| Reliability state is implicit rather than explicit | **yes** | §14 — core gap |
| Robustness evaluation is absent | **yes** | §17, §19 (State E) |
| Human-AI reliance has not been tested | **yes** | no reader study, no reliance metrics (§16) |
| Independent academic evaluation is absent | **yes** | zero evaluation artefacts; whitepaper's "independently validated" claim (whitepaper:300) has no supporting artefact |

All 13 applicable gaps confirmed — none refuted. This is the strongest basis for a research proposal (it is exactly the gap pattern an EPSRC panel finds credible when evidenced).

---

## 29. Potential Novelty

(prompt §25 discipline — no "first X" claims; literature verification not performed in this audit)

| Candidate | Type of novelty | Assessment |
|---|---|---|
| Fusing uncertainty + calibration + gate flags into an explicit reliability state *inside a running clinical pipeline* with action policies | **implementation + evaluation novelty** | **Potential research novelty requiring literature verification.** Reliability/selective prediction is mature literature; the *integration with a metacognitive gate and human-review queue in a deployed pipeline* may be the defensible angle |
| Faithfulness evaluation of rule-based metacognitive reasons (ablation-based) | **evaluation novelty** | Potential research novelty requiring literature verification (XAI faithfulness literature is crowded; rule-gate-specific protocols less so) |
| Contract-disagreement as a *safety* failure mode of medical-AI pipelines (this repo as case study) | **evaluation / methodological novelty** | Strong practical angle; scientific value moderate |
| MC approximation (input-noise), rule gates, SHAP-like attribution, ensemble-less "multi-engine" | **no novelty** | conventional engineering — do not claim |
| CIS / 12-metric score | **nonexistent** | cannot be a novelty (§13) |

**Explicitly not claimed** (prompt §25): first metacognitive AI; first uncertainty-aware AI; first safety gate; first uncertainty+calibration combination; first explainable clinical AI.

---

## 30. Minimum Viable Research Prototype

(prompt §28 — replace generic pattern with what this audit justifies)

**What already exists (verified):**
- Three executing services with typed responses (E-02/E-03/E-04) + deterministic gate (`metacognition/main.py`).
- ECE/Brier machinery (`calibrationService.ts`) — unwired.
- Human-review queue + UI (`learningLoop.ts`, `PeerReviewWorkspace.tsx`) as action sink and ground-truth harvest (adjudications label correctness).
- Empty provenance table (`MetacognitionAuditLog`).
- Synthetic fixtures (`validation/*_cases`, golden dataset) for gate-level regression only.

**What must be built (smallest set):**
1. **Contract fix** — shared field mapping (or generated OpenAPI types) so orchestrator ↔ services agree: `primary_finding`, `uncertainty_score`, `epistemic_uncertainty`, `is_uncertain`, `safe_to_alert`, `hallucination_risk`, `shap_values: List`. (Pure engineering; prerequisite for everything.)
2. **Per-case signal logger** — one row per inference: all signals + prediction + (later) ground truth → populate `AIResult` real columns + `MetacognitionAuditLog`.
3. **Reliability-state definition** — pre-registered function \(R = g(\text{conf}, \text{ep}, \text{al}, \text{flags}, \text{validity})\); freeze \(g\) before evaluation (start with monotone/logistic baseline, not deep learning).
4. **Evaluation harness** — error-detection AUROC, risk-coverage curves, false-abstention rate, ECE/Brier; bootstrap CIs; seeded.
5. **Real data** — either (a) 300–500 labelled cases (public datasets or partner access), or (b) if weights remain unavailable, an explicit scope statement: *rule/contract-level evaluation only* — model-level claims stay out of scope.

**What must be instrumented:** per-layer gate contributions (for faithfulness ablations), DLQ depth alerts, service contract tests in CI running real services.

**What must be frozen:** thresholds (0.60/0.25/0.5), fusion \(g\), test split — before any metric is reported.

**What must be independently evaluated:** the state's error detection (primary), calibration (secondary), gate faithfulness (tertiary), reliance (optional WP6).

**What can wait:** federated/continuous learning (not even importable, E-06), CIS-as-marketed (build the real state instead), OOD beyond simple shift injection, VLM prose explainability, new model training (unless (a) is impossible).


## 31. EPSRC Explainable-AI Relevance

(Assessed against the supplied EPSRC Explainable-AI call context; repository contains **zero** EPSRC/University-of-Derby references — grep returned nothing, so fit is assessed purely on technical substance.)

| Call criterion | Assessment | Evidence |
|---|---|---|
| Fundamental research question | **Partial fit — defensible if framed on reliability-state formalisation** | The repo poses, by absence, the question: *when is a system's self-assessment trustworthy?* §14 gap table + §26 mapping. It does **not** yet pose a fundamental explainability question — explanations here are post-hoc approximations with random fallbacks (§15) |
| Explainability relevance | **Indirect but real** | The strongest XAI angle is *metacognitive explanation* (why act/abstain/escalate) — gate reasons exist (`flags`, `self_eval_notes`, `REPORT_CONTRADICTION` suggestion `metacognition/main.py:252-255`) and are unevaluated for faithfulness (§15) |
| Methodological contribution | **Strong** | Contract-aware safety evaluation (this repo is a documented specimen: §1); faithfulness ablation protocol for rule gates; reliability-state evaluation methodology (risk-coverage + calibration + abstention — all currently State E) |
| Real-world demonstrator | **Present as platform, weak as evidence** | Working clinical shell (§23) but no weights/data (§18) — demonstrator status depends on acquiring data/weights (WP7) |
| High-risk/high-reward questions | see below | §24 classification |

### Honest fit statement

The codebase supports an EPSRC-style proposal **only** in the form: *engineering exists → scientific unknown (does an explicit reliability state improve error detection / explain actions / survive shift?) → falsifiable hypotheses (§26) → experiments (§30)*. It does **not** support a proposal that presupposes validated performance, working CIS, or existing independent evaluation — claiming those would be refuted by this audit in review.

---

## 32. Red-Team Assessment

(prompt §30 — deliberately critical, by reviewer persona)

**EPSRC panel member:**
1. Would challenge: "metacognitive" as used here — the system's *self-evaluation* is a fixed rule list, not a learned or formal self-model; and its outputs never reach a consumer (§1).
2. Marketing language spotted immediately: "independently validated and peer-reviewed" (whitepaper:300) with zero artefacts; "CIS 12 safety metrics" (MetacognitionAI.tsx:60) with zero code; "47+ hospitals, 2.1M scans" (README:159-160) with zero data.
3. Non-reproducible metrics: AUC 0.972, ECE 0.042, catch 96.3%, door-to-alert 1.84s — none have producing code (§19).
4. Conventional components: microservice pipeline, softmax confidence, entropy-as-uncertainty, rule gates, SHAP-ish attribution — all standard (§29).
5. Genuinely interesting: the *assembled-but-ununified* reliability signals + empty audit table + human-review loop = a ready instrument for studying reliability states; and the honest specimen of mocked-tests-pass-but-pipeline-fails.

**XAI researcher:** would ask "where is the explanation's ground truth?" — answer: nowhere (§15); would flag that `shap_values` may be `np.random.dirichlet` draws (E-05 context) yet flow into metacog coherence rules as if meaningful; would reject "report prose = explainability".

**Medical-AI researcher:** would stop at: no weights, no data, gate unvalidated, signing not gated by safety flag (`reports.ts` grep 0), thresholds untuned — "this is a prototype platform, not a clinical AI system".

**Clinical academic:** would ask "what happens to a US scan?" — answer: stage-1 422 (regex `^(CT|MRI|XR)$`, E context) → DLQ loop; and "can a report be signed while AI is unsafe?" — the flag exists but reports.ts does not consult it (§12).

**Software architect:** would praise structure, then note: `modelId: 'sewa-cpu-onnx-int8-v2'` written unconditionally (`aiOrchestrator.ts:821`); `backend` labels unreliable (`uncertainty/main.py:445` hard-coded); dead surfaces (`v2Router`, `aiService.ts:/generate`); two stale `.kilo/worktrees` with duplicate e2e dirs tracked.

### The 10 questions (prompt §30)

1. **Challenged claims**: every quantitative claim in README/whitepaper (§32 matrix).
2. **Marketing language**: "validated clinical performance", "CIS", "96.3%", "peer-reviewed".
3. **Metrics lacking reproducibility**: all six README metrics (§19).
4. **Conventional**: architecture, uncertainty math, gates, attribution (§29).
5. **Interesting**: unification gap as research object; contract-failure specimen; existing human-loop instrument.
6. **Vague research question**: as currently narrated ("AI that knows what it doesn't know") — sharpened in §26/§30.
7. **Pure integration**: most of the repo (§6 inventory) — integration is valuable product engineering, not research.
8. **What could fail**: fusion doesn't beat single signals (H1); calibration doesn't move abstention (H2); gate reasons don't prove faithful (H3); clinicians don't change reliance (H4); shift signals don't rise before accuracy falls (H6).
9. **Negative results**: H1–H6 each have clear null outcomes — all publishable as careful evaluations (this is a strength of the proposed framing).
10. **Research vs product evidence**: product = tests/CI/infra (present); research = datasets/evals/instrumentation (absent). The dividing line is exactly §19/§20's missing artefacts.

---

## 33. Critical Risks and Unknowns

| # | Risk/Unknown | Severity | Evidence |
|---|---|---:|---|
| R1 | **Pipeline cannot complete any scan** (contract break) — DLQ infinite loop; all downstream safety logic unreachable | critical | E-01…E-04, §1 |
| R2 | **Marketed capabilities with zero implementation** (CIS; validated metrics; peer review) — reputational/regulatory exposure if repeated in a proposal | critical | §13, §32 |
| R3 | **Safety benchmarks score failures as successes** — CI "safety gate" gives false assurance | critical | §19 (`:59-61`, `:94-96`) |
| R4 | **Demo/random-weight model behind all inference outputs**; `backend`/`modelId` labels claim INT8 production model | critical | E-05, §7 |
| R5 | Fabricated drift/bias dashboards could mislead clinical governance | high | §17 (`:164-201`) |
| R6 | Signing path not gated on `requiresHumanReview` | high | §12 (reports.ts grep 0) |
| R7 | Calibration machinery never invoked → uncalibrated "confidence" marketed with ECE numbers | high | §10, E-09 |
| R8 | 3/10 services not importable (`openai`, `asyncpg`, `flwr`) → VLM/federated/continuous paths dead as shipped | high | E-06 |
| R9 | Thresholds untuned/unowned (0.60/0.25/0.5, weights 0.6/0.4, 0.2/0.6/0.2) | high | §12 |
| R10 | US/PET modalities rejected by two services (`^(CT|MRI|XR)$`) while product claims 14 conditions incl. US (README:155) | high | §8/§25 |
| R11 | No datasets/weights → no metric reproducible (score 2/5) | high | §18, §20 |
| R12 | `MetacognitionAuditLog` + `AIResult.metacognition*` columns never written → audit trail of safety decisions absent | medium | E-09, §14 |
| R13 | Dead surfaces (`v2Router` unauthenticated, `aiService:/generate`, stale worktrees) | medium | §6 |
| R14 | UNKNOWN: dependency vulnerabilities (no SCA run), DLQ alerting, `.env.template` completeness, Terraform live state | medium | flagged UNKNOWN per prompt |

---

## 34. Exact Recommended Next Steps

**Engineering (prerequisites, not research):**
1. Fix contracts: align field names (`primary_finding` ↔ `primaryFinding`, `uncertainty_score` ↔ `compositeScore`, `is_uncertain` ↔ `highUncertaintyFlag`, `safe_to_alert` ↔ `layer9_safe_to_alert`, `shap_values` list type; modality regex → product's actual enum or explicit product decision). Add a **contract test running the real services in CI** (kill the mocked-axios blind spot).
2. Repair or delete the safety harnesses: stop counting errors as blocked (`metacognition-benchmark.ts:59-61`, `safety-validation.ts:94-96`); read the correct response field; fail CI when the contract breaks.
3. Gate report signing on `requiresHumanReview` (or explicitly document the policy decision).
4. Remove/quarantine fabricated metrics (`ai-monitoring.ts:164-201`); label demo mode explicitly (`backend` labels, `modelId`).
5. Wire `recordPrediction` at adjudication; populate `MetacognitionAuditLog`.
6. Either publicly scope all outputs as demo/synthetic; obtain real weights+data before making any clinical performance claims.

**Research (after step 1):** execute §30 MVP — pre-registered reliability state \(g\), evaluation harness, N≥300 labelled cases, H1–H3 as first experiments; treat WP1+WP2+WP5 as the programme (§26).

**Proposal discipline:** every claim in any SEWA×Derby document must map to Appendix F evidence; delete all §32-matrix "no" rows from narrative material.


## Negative Findings Register (prompt §35)

| # | Category | Finding | Evidence |
|---|---|---|---|
| N1 | claimed capability not found | CIS "12 safety metrics" — zero implementation | §13; grep E-09 |
| N2 | claimed capability not found | "independently validated and peer-reviewed" metrics — no artefacts | whitepaper:300; §19 |
| N3 | claimed capability not found | AUC 0.972 / ECE 0.042 / catch 96.3% / 1.84s / 47+ hospitals / 2.1M scans / certifications — no producing code | README:152-173; §19, §32 |
| N4 | dead code | `calibrationService.recordPrediction` — only its own definition (zero callers) | `calibrationService.ts:78`; E-09 |
| N5 | dead code | `selfAuditService.runSelfAudit` — only its own definition (zero callers) | `selfAuditService.ts:278`; E-09 |
| N6 | dead code | `aiService.ts` VLM call to non-existent `/generate` | `aiService.ts:16` vs `vlm-report/main.py:132` |
| N7 | unreachable code | `runAIPipeline` stages 2–4 unreachable end-to-end (422 → DLQ) | E-01…E-04; §1 |
| N8 | unreachable surface | `v2Router` — zero frontend consumers, unauthenticated | E-09 |
| N9 | mock implementation | `safety-validation.ts` mocks triage/VLM/uncertainty by design | `:53-72` |
| N10 | mock implementation | `/drift` and `/bias` return constants jittered by wall-clock | `ai-monitoring.ts:164-201` |
| N11 | mock implementation | AUC/sensitivity synthetic fallbacks when real data insufficient | `ai-monitoring.ts:132-138` |
| N12 | placeholder | golden dataset = hand-written fixtures asserting themselves | `golden-dataset.test.ts:45+` |
| N13 | placeholder | E2E suite = login render + login nav (skips without env) | `e2e/tests/clinical-workflow.spec.ts` |
| N14 | hard-coded thresholds | `hallucination_risk < 0.60`; urgency prior `0.60`; weights `0.6/0.4`, `0.2/0.6/0.2`; `ep>0.25`, `al>0.5`; `min(1, ep+0.3·al)` — all provenance UNKNOWN | `metacognition/main.py:116,275,317,364`; `uncertainty/main.py:212,412` |
| N15 | missing tests | no unit tests for any threshold/gate/uncertainty/calibration logic; pytest step in CI tolerates absence | §21; `deploy.yml:140` |
| N16 | missing dataset | no clinical datasets (synthetic DICOMs + JSON fixtures only) | §18 |
| N17 | missing weights | zero `.onnx/.pt/...` in git; demo generator uses `np.random.randn` | E-09, E-05 |
| N18 | non-reproducible metric | every README/whitepaper number | §19, §32 |
| N19 | undocumented dependency (runtime gap) | `openai`, `asyncpg`, `flwr` not installed → 3 services fail import | E-06 |
| N20 | missing calibration | ECE/Brier machinery never invoked; no temperature/Platt/isotonic anywhere | §10, E-09 |
| N21 | missing independent validation | safety gate has only invalid harnesses (errors counted as blocked; wrong fields) | §19 |
| N22 | missing uncertainty evaluation | no error-detection/selective-risk/risk-coverage evaluation (grep 0) | §19 |
| N23 | missing robustness evaluation | no OOD/shift mechanisms; drift is fabricated | §17 |
| N24 | audit gap | `MetacognitionAuditLog` + `AIResult.metacognition*` columns never written | E-09 |
| N25 | integrity gap | `modelId`/`backend` labels claim production INT8 while demo/random model serves | §7; `uncertainty/main.py:445`; `aiOrchestrator.ts:821` |
| N26 | policy gap | report signing not gated on `requiresHumanReview` | §12 (grep 0 in `reports.ts`) |
| N27 | product-code contradiction | US/PET rejected by uncertainty+VLM regex while claiming 14 conditions incl. US | §8; README:155 |
| N28 | disagreement | not implemented at all (not even measured) | §11 State E |
| N29 | dead benchmark field | harnesses read `layer9_safe_to_alert`; service returns `safe_to_alert` | `metacognition-benchmark.ts:55`; E-02 |
| N30 | stray artefacts | tracked binaries (`SEWA_AI.mp4`, `dicom-ingestion-test.exe`), stale `.kilo/worktrees` duplicating `e2e/` | §3 map |

---

## Appendix A — File Inventory

(most material files; all paths relative to repo root)

**Pipeline/orchestration:** `backend/src/services/aiOrchestrator.ts` (core, 900+ lines), `backend/src/services/dlqService.ts`, `backend/src/services/aiService.ts`, `backend/src/services/vlmLanguageService.ts` (`translateUrgency:198`), `backend/src/routes/pipeline.ts`, `backend/src/routes/learningLoop.ts`, `backend/src/routes/reports.ts`, `backend/src/routes/ai-monitoring.ts`, `backend/src/routes/v2Router.ts`.

**AI services:** `ai-services/triage/main.py` (predict route `:241`, model resolve `:117-141`, demo `:163`), `ai-services/uncertainty/main.py` (demo `:74-98`, MC `:170-222`, attribution `:231+`, route `:363`, thresholds `:412`), `ai-services/metacognition/main.py` (request `:125-140`, response `:145-154`, layers `:156-420`, gate `:275`, route `:426`, port `:478`), `ai-services/vlm-report/main.py` (models `:82-107`, templates `:109+`, route `:132`), `ai-services/{pathology,mammography,retinal,voice-transcription,federated-learning,continuous-learning,shared}/…`.

**Assurance/validation:** `backend/src/validation/metacognition-benchmark.ts` (79 lines), `backend/src/validation/safety-validation.ts` (132 lines), `backend/src/validation/generate_cases.ts`, `backend/src/validation/{pass,fail,hallucination,uncertainty,contradiction}_cases/*.json`, `backend/src/__tests__/golden-dataset.test.ts`, `backend/src/__tests__/orchestration.test.ts`, `e2e/tests/clinical-workflow.spec.ts`.

**Data model:** `backend/prisma/schema.prisma` (`AIResult` incl. `metacognitionPassed` ≈:299, `metacognitionScore` ≈:303, `inferenceMs`; `MetacognitionAuditLog` ≈:1245).

**Services/dead code:** `backend/src/services/calibrationService.ts` (`recordPrediction:78`, `drift:192`, `computeBrierScore:419`), `backend/src/services/selfAuditService.ts` (`runSelfAudit:278`), `backend/src/services/{fhirService,confidentialLedgerService,merkleBlockService,federatedV2Service,mlopsPipelineService}.ts`.

**Frontend:** `frontend/src/pages/radiologist/PeerReviewWorkspace.tsx`, `frontend/src/hooks/usePipelineStatus.ts`, `frontend/src/components/public/ClinicalDemoModal.tsx`, marketing: `frontend/src/pages/public/{LandingPage,TechnicalWhitepaperPage,SolutionsPage}.tsx`, `frontend/src/pages/public/products/{MetacognitionAI,UncertaintyAI}.tsx`.

**Infra/CI:** `docker-compose.yml`, `azure/k8s/*.yaml` (17 Deployments), `infrastructure/terraform-azure/`, `.github/workflows/{ci-cd,deploy}.yml`, `scripts/{deploy-production.sh,deploy-quick.sh,export_models_to_onnx.py,setup-github-oidc.sh}`.

**Docs/claims:** `README.md`, `HOW_SEWA_WORKS.md`, `DEPLOYMENT.md`, `docs/clinical-dossier/{02,03,11}*.md`, `AGENTS.md`, `investor-submission/*`.

---

## Appendix B — Important Functions and Classes

| Symbol | Location | Role | Verified |
|---|---|---|:-:|
| `runAIPipeline` | `aiOrchestrator.ts:279` | 4-stage pipeline | static + replay |
| `safePOST` | `aiOrchestrator.ts:222-247` | retry policy (503/429/timeout only) | static (E-04 chain) |
| DLQ enqueue | `aiOrchestrator.ts:924-925` | failure sink | static |
| `AIResultSchema.parse` | `aiOrchestrator.ts:793` | Zod validation (would fail on undefined) | static |
| `TriagePredictResponse`/`predict` | `triage/main.py:226-241` (`:308` backend label) | inference route | **live E-04** |
| `_resolve_model` / `_create_demo_onnx_model` | `triage/main.py:117-141 / 163` | model choice → demo fallback | static + E-05 |
| `UncertaintyRequest/Response` | `uncertainty/main.py:138 / 152` (`modality pattern :142`) | contract | **live E-03** |
| `mc_dropout_onnx` | `uncertainty/main.py:170-222` | noise-pass MC; ep `:209`; al `:211`; total `:212` | **live E-03** + static |
| `_create_demo_onnx` | `uncertainty/main.py:74-98` | **random-weight generator** (`np.random.randn :89`) | **executed + artefact parsed E-05** |
| `is_uncertain` decision | `uncertainty/main.py:412` | ep>0.25 or al>0.5 | static |
| `MetacognitionRequest/Response` | `metacognition/main.py:125-140 / 145-154` | contract | **live E-01/E-02** |
| gate condition | `metacognition/main.py:275` | `passed = !flags && risk<0.60` | static + live E-02 |
| `_detect_report_contradiction` | `metacognition/main.py:320-369` | text-vs-finding rules | static |
| route `/metacognition/evaluate` | `metacognition/main.py:426` | entry | **live** |
| `VLMReportRequest` | `vlm-report/main.py:82-97` (`ai_finding:90`, modality `:85`) | contract causing 422 | static (E-04 chain) |
| `calibrationService.recordPrediction` | `calibrationService.ts:78` | dead | **grep E-09** |
| `selfAuditService.runSelfAudit` | `selfAuditService.ts:278` | dead | **grep E-09** |
| `/drift`, `/bias` | `ai-monitoring.ts:164-175, 181-201` | fabricated | static |
| `runBenchmark` | `metacognition-benchmark.ts:9-66` | invalid scoring (`:55,59-61,63`) | static |
| `runSafetyValidation` | `safety-validation.ts:17-132` | mocked stages (`:53-72`), error→FAIL (`:94-96`) | static |
| `GOLDEN_RESULTS` | `golden-dataset.test.ts:45+` | self-referential fixtures | static |


## Appendix C — Metrics and Evaluation Scripts

| Metric family | Producing code | Dataset used | Reproducible here? | Note |
|---|---|---|:-:|---|
| Uncertainty outputs (`uncertainty_score`, `epistemic`, `aleatoric`) | `uncertainty/main.py:170-222` | live image/synthetic | **yes** (E-03: 0.1877 / 0.0124) | on random weights (E-05) |
| Triage `confidence`/`urgency` | `triage/main.py:276-302,400` | live image | **yes** (E-04) | softmax on random weights |
| Metacog `hallucination_risk`/`passed`/`safe_to_alert`/`calibration_score` | `metacognition/main.py:156-420` | replay payload | **yes** (E-02) | deterministic rules |
| "Catch rate" | `metacognition-benchmark.ts:63` | validation fixtures | structurally ~100% regardless | **invalid** (§19) |
| "Safety Precision/Recall" | `safety-validation.ts:116-117` | validation fixtures (mocked stages) | runs but degenerate | **invalid** (§19) |
| ECE / Brier | `calibrationService.ts:118-183,419` | rolling predictions (never fed) | no execution path | dead (N4) |
| AUROC claims | — | — | **no** | no code/dataset (N3) |
| PSI/kappa drift | `ai-monitoring.ts:164-175` | wall-clock | n/a | fabricated (N10) |
| Bias AUCs | `ai-monitoring.ts:181-201` | none | n/a | fabricated (N10) |
| Latency | service `inference_ms` + `stageTimings` (`aiOrchestrator.ts:705-711`) | live | **yes single-run** (E-03: 1012 ms) | no harness/percentiles recorded |
| Federated `localAuroc` | `federatedV2Service.ts:74,967` | — | no | scaffold field; service not importable (E-06) |

---

## Appendix D — Configuration and Threshold Inventory

| Parameter | Value | File:Line | Origin |
|---|---|---|---|
| `hallucination_risk` gate | `< 0.60` | `metacognition/main.py:275` | UNKNOWN |
| urgency prior URGENT | `0.60` | `metacognition/main.py:116` | UNKNOWN |
| layer score weights | `0.6 / 0.4` | `metacognition/main.py:317` | UNKNOWN |
| contradiction mix | `0.2 / 0.6 / 0.2` | `metacognition/main.py:364` | UNKNOWN |
| epistemic flag | `> 0.25` | `uncertainty/main.py:412-413` | UNKNOWN |
| aleatoric flag | `> 0.5` | `uncertainty/main.py:412,414` | UNKNOWN |
| total score mix | `min(1, ep + 0.3·al)` | `uncertainty/main.py:212` | UNKNOWN |
| `MC_DROPOUT_PASSES` | `10` (env) | `uncertainty/main.py:69` | comment claims perf tuning |
| `MC_NOISE_STD` | `0.05` (env) | `uncertainty/main.py:186`; comment `:179` claims "tuned" | **no tuning artefact** |
| modality allow-list | `^(CT|MRI|XR)$` | `uncertainty/main.py:142`; `vlm-report/main.py:85` | conflicts with product enum (N27) |
| VLM urgency enum | `CRITICAL|URGENT|NORMAL` | `vlm-report/main.py:91` | orchestrator sends triage urgency incl. `ROUTINE?` (`aiOrchestrator.ts:796` maps ROUTINE→NORMAL — but triage never emits ROUTINE) |
| `MODEL_VERSION` | `v2.4.1` | `triage/main.py:74` | no weights with this version exist |
| `modelId` written to DB | `sewa-cpu-onnx-int8-v2` | `aiOrchestrator.ts:821` | unconditional (N25) |
| uncertainty `backend` label | `"onnx-int8-cpu"` | `uncertainty/main.py:445` | hard-coded (N25) |
| safePOST retries | `2`, backoff `300·3^n` ms | `aiOrchestrator.ts:226-238` | design comment `:220` |
| CI pytest tolerance | `\|\| echo "No tests yet"` | `deploy.yml:140` | weakens gate |
| golden fixtures | 100 rows | `golden-dataset.test.ts:45+` | hand-authored |
| benchmark error-as-blocked | — | `metacognition-benchmark.ts:59-61`; `safety-validation.ts:94-96` | **unsafe pattern** |

---

## Appendix E — Reproducibility Instructions

**What another researcher can reproduce today (exactly what this audit did):**

1. Environment: Python venv (`.venv`, Python 3.14) with `fastapi==0.136.1`, `uvicorn==0.46.0` (project venv already present) + `onnx` for artefact inspection.
2. Boot services (example, from `ai-services/<name>`):
   `python main.py` (metacognition default port 8003, `main.py:476-480`) — others accept `PORT`/URL envs used by the orchestrator (`TRIAGE_URL`, `UNCERTAINTY_URL`, `METACOGNITION_URL`, `VLM_URL`).
3. Replay probes:
   - orchestrator-shaped metacog payload (fields as in `aiOrchestrator.ts:767-781`) → expect **422** with `missing body.uncertainty_score` + `list_type body.shap_values` (E-01).
   - valid metacog payload (`uncertainty_score: float`, `shap_values: []`) → expect keys `passed, safe_to_alert, hallucination_risk, flags, calibration_score, corrected_confidence, corrected_urgency, self_eval_notes` (E-02).
   - `POST /uncertainty/explain` with `modality:"CT"` + image/`storage_url` → expect 16 keys incl. `uncertainty_score, epistemic_uncertainty, is_uncertain, backend` (E-03).
   - `POST /triage/predict` → expect `primary_finding` (snake_case) (E-04).
4. Model provenance: `onnx.load(<MODEL_CACHE>/triage_v2.4.1.onnx)` → graph `uncertainty_demo`, nodes `Flatten, Gemm`, initializer `W[10,150528]` — proves random-weight demo origin (`uncertainty/main.py:85-96`) (E-05).
5. Import probe: `importlib` exec each `ai-services/*/main.py` → `vlm-report`/`continuous-learning`/`federated-learning` raise `ModuleNotFoundError` for `openai`/`asyncpg`/`flwr` (E-06).
6. Grep proofs: `recordPrediction\(|runSelfAudit\(|metacognitionAuditLog\.create|api/v2|confidence integrity` (E-09).

**What cannot be reproduced:** any accuracy/calibration/catch-rate/deployment claim — no weights, no data, no outputs (§19–20). Score **2/5** (§20).


## Appendix F — Evidence Ledger

(prompt §34: every material conclusion with claim / evidence type / path / symbol / line range / execution path / implementation / validation / reproducibility / confidence / caveat. Live records E-01…E-10 were executed 2026-10-06 in this audit; raw outputs quoted verbatim.)

---

**E-01 — Metacognition rejects the orchestrator's payload (contract break)**
- **Claim:** The orchestrator→metacognition request cannot validate against the service contract.
- **Evidence type:** live execution (HTTP replay) + static.
- **Path/Symbol:** `ai-services/metacognition/main.py` `MetacognitionRequest:125-140`, route `:426`; caller `backend/src/services/aiOrchestrator.ts:765-781`.
- **Line range:** request model 125–140; caller payload 767–781 (`shap_values: triage.shapValues || {}` at 774; `uncertainty_score: uncertainty.compositeScore` at 773).
- **Execution path:** POST `/metacognition/evaluate` with fields exactly as constructed at 767–781 → **HTTP 422**, body: `{"detail":[{"type":"missing","loc":["body","uncertainty_score"],"msg":"Field required",…},{"type":"list_type","loc":["body","shap_values"],"msg":"Input should be a valid list","input":{}}]}`.
- **Implementation status:** C (both sides implemented, incompatible).
- **Validation status:** validated by this audit's replay; never validated by repo tests (axios mocked).
- **Reproducibility:** fully reproducible (E-01, E-02 method in Appendix E).
- **Confidence:** high.
- **Caveat:** the audit constructed the payload from source, not from a live `runAIPipeline` (which stalls at stage 2 first — see E-04); either way stage 3 as coded cannot succeed.

---

**E-02 — Metacognition executes on a valid payload (rule engine works)**
- **Claim:** The 9-layer rule gate is real, deterministic and returns a rich response.
- **Evidence type:** live execution.
- **Path/Symbol:** `ai-services/metacognition/main.py` (`layers 156-420`, gate `:275`, route `:426`).
- **Line range:** response model 145–154; route 426.
- **Execution path:** POST `/metacognition/evaluate` with valid fields (`uncertainty_score` float, `shap_values` list) → 200; response keys: `calibration_score, corrected_confidence, corrected_urgency, evaluated_at, evaluation_ms, flags, hallucination_risk, passed, safe_to_alert, scan_id, self_eval_notes`. **No `layer8_*`/`layer9_*` keys exist** — proving the orchestrator's reads at `aiOrchestrator.ts:785-786,850` (`metacog.layer9_safe_to_alert`, `metacog.layer8_hallucination_risk.toFixed(3)`) are undefined/would throw.
- **Implementation:** A. **Validation:** rule outputs not clinically validated (E). **Reproducibility:** A (deterministic).
- **Confidence:** high. **Caveat:** correctness of rules themselves is unevaluated (§19).

---

**E-03 — Uncertainty service live response**
- **Claim:** Uncertainty engine executes 10-pass decomposition and returns distinct keys from those the orchestrator reads.
- **Evidence type:** live execution.
- **Path/Symbol:** `ai-services/uncertainty/main.py` route `:363`, `mc_dropout_onnx:170-222`, thresholds `:412`.
- **Line range:** response model 152–166; caller reads `aiOrchestrator.ts:773,798,801,810`.
- **Execution path:** POST `/uncertainty/explain` (modality `CT`) → 200 in `inference_ms=1012`; keys: `aleatoric_uncertainty, backend, epistemic_uncertainty, explanation, gradcam_base64, gradcam_url, inference_ms, is_uncertain, mc_dropout_mean, mc_dropout_std, mc_passes_used, scan_id, shap_values, uncertainty_score`; values: `uncertainty_score=0.1877`, `epistemic_uncertainty=0.0124`, `is_uncertain=True`, `backend="onnx-int8-cpu"`. **Absent:** `compositeScore`, `highUncertaintyFlag`, `inferenceMs`, `epistemicUncertainty` — the four fields the orchestrator reads.
- **Implementation:** A (service), C (integration). **Validation:** none (no eval harness). **Reproducibility:** A for behaviour; numbers meaningless on demo weights (E-05).
- **Confidence:** high. **Caveat:** `backend="onnx-int8-cpu"` is hard-coded (`:445`) — the label does not describe the loaded model.

---

**E-04 — Triage service live response + stage-2 failure chain**
- **Claim:** Triage returns snake_case fields absent from orchestrator reads; consequently VLM stage receives undefined `ai_finding` → 422 → DLQ.
- **Evidence type:** live execution + static trace.
- **Path/Symbol:** `ai-services/triage/main.py` route `:241`, response `:226-237`, label `:308`; `vlm-report/main.py` `VLMReportRequest:82-97` (`ai_finding:90` required, `urgency:91`); `aiOrchestrator.ts:732-734` (send), `:234` (retry policy), `:924-925` (DLQ).
- **Line range:** as listed.
- **Execution path:** POST `/triage/predict` → 200 with keys `all_findings, backend, confidence, inference_ms, location, midline_shift, model_version, primary_finding, scan_id, size, snomed_code, urgency` — **no `primaryFinding`, no `gradCamUrl`, no `shapValues`, no `primaryCondition`**. Downstream: `ai_finding: triage.primaryFinding` → `undefined` → JSON omits → VLM 422 `ai_finding Field required`; `safePOST` retryable set is `503|429|ECONNABORTED|ECONNRESET` only → throw → `dlq.enqueue`. For US/PET: failure occurs earlier at `uncertainty/main.py:142` modality regex 422 (same DLQ path).
- **Implementation:** C. **Validation:** demonstrated negative by this audit. **Reproducibility:** A (failure).
- **Confidence:** high. **Caveat:** live VLM 422 itself not re-sent in this audit session (vlm-report import fails — E-06); chain proven by request-model requirements + undefined field + live triage shape.

---

**E-05 — The "model" is random-weight demo ONNX (artefact forensics)**
- **Claim:** Inference during this audit ran on untrained random weights auto-generated by the service.
- **Evidence type:** live execution + artefact parse + source.
- **Path/Symbol:** `ai-services/uncertainty/main.py` `_create_demo_onnx:74-98` (writes `FP32_MODEL` = `triage_{v2.4.1}.onnx` with `W_data = np.random.randn(...)*0.01`, `:89`; invoked at first boot `:106-111`).
- **Line range:** 74–98, 106–111; triage fallback `triage/main.py:139-141,163-183`.
- **Execution path:** services booted with `MODEL_CACHE` = temp dir → file `triage_v2.4.1.onnx` (6,021,306 bytes) written 2026-10-06 16:02 → `onnx.load` → **graph name `uncertainty_demo`, nodes `[Flatten, Gemm]`, initializer `W [10, 150528]`, inputs `image [0,3,224,224]`, outputs `logits [0,10]`** → matches demo generator exactly → triage live label `backend="onnx-fp32"` (`:308`) was file-existence based, uncertainty label `onnx-int8-cpu` hard-coded (`:445`).
- **Implementation:** demo path A; trained path E (no weights in git).
- **Validation:** none. **Reproducibility:** A (the demo behaviour reproduces; the *claimed* model cannot — absent).
- **Confidence:** high. **Caveat:** production AKS deployments might mount real weights via PVC (`triage/main.py:124-125` comment) — **UNKNOWN — insufficient evidence in the repository**; nothing in-repo proves any real weight file ever existed.

---

**E-06 — Import probe: 3/10 AI services unimportable**
- **Claim:** `vlm-report`, `continuous-learning`, `federated-learning` fail to import under the project environment.
- **Evidence type:** live execution.
- **Path/Symbol:** `ai-services/{vlm-report,continuous-learning,federated-learning}/main.py`.
- **Line range:** n/a (module load).
- **Execution path:** `importlib.spec_from_file_location(...).loader.exec_module(...)` per service → `ModuleNotFoundError: No module named 'openai'` / `'asyncpg'` / `'flwr'`. Import OK: `mammography, metacognition, pathology, retinal, triage, uncertainty, voice-transcription` (7/10 with `main.py`).
- **Implementation:** C (shipped deps not installable as run). **Validation:** live. **Reproducibility:** A. **Confidence:** high. **Caveat:** requirements.txt files do list these packages (`vlm-report/requirements.txt`: `openai==1.35.0`) — the gap is in the executed environment, not necessarily in fresh installs.

---

**E-07 — Startup latency and failure modes observed**
- **Claim:** Services take ~60 s to become ready (warmup/demo generation); uncertainty returns 500s when `storage_url` 404s.
- **Evidence type:** live execution (service logs during boot).
- **Path/Symbol:** `triage/main.py:96-99` (warmup n=5), `uncertainty/main.py:111-116` (demo gen + warmup n=3).
- **Execution path:** boot → lifespan model load/generate → ready; request with unreachable `storage_url` → internal error path (500).
- **Implementation:** A. **Validation:** observed. **Reproducibility:** A. **Confidence:** medium (single boot). **Caveat:** exact seconds vary by machine.

---

**E-08 — DLQ is the terminal state for every failing scan**
- **Claim:** Non-retryable failures (incl. all 422 contract errors) route to DLQ with exponential-backoff replay; no code distinguishes permanent contract faults from transient faults.
- **Evidence type:** static trace (behaviour implied by live E-01/E-04).
- **Path/Symbol:** `aiOrchestrator.ts` `safePOST:222-247`, catch → `:924-925`, comment `:249`.
- **Line range:** 222–247, 924–925.
- **Execution path:** any stage throws non-retryable → `dlq.enqueue(scanId, tenantId, err.message, 0)`.
- **Implementation:** A (mechanism), C (fitness for contract faults). **Validation:** static (no DLQ test). **Reproducibility:** A. **Confidence:** high. **Caveat:** DLQ consumer/alerting not located — UNKNOWN.

---

**E-09 — Zero-caller and zero-implementation greps**
- **Claim:** Calibration never invoked; self-audit never invoked; no metacognition audit writers; no frontend `api/v2`; no CIS implementation; no report-signing gate.
- **Evidence type:** grep (static, exhaustive).
- **Paths:** `backend/src/**`: `recordPrediction(` → **only `calibrationService.ts:78`** (definition); `runSelfAudit(` → **only `selfAuditService.ts:278`** (definition); `metacognitionAuditLog.(create|upsert|update)` → **0**; `reports.ts` `requiresHumanReview|humanReview` → **0**; `frontend/src` `api/v2` → **0**; `backend`+`ai-services` `confidence integrity|integrityScore|integrity_score` → **0**.
- **Execution path:** repo-wide ripgrep/Select-String incl. all tracked sources.
- **Implementation status:** E (features claimed but absent). **Validation:** N/A. **Reproducibility:** A (greps repeatable). **Confidence:** high. **Caveat:** grep covers tracked source only (docs/marketing matches recorded separately — those are claims, not implementations).

---

**E-10 — No model weights, no training code, no datasets in git**
- **Claim:** The repository contains zero trained artefacts and zero clinical datasets.
- **Evidence type:** git ls-files + filesystem scan.
- **Path/Symbol:** `git ls-files` filtered `\.(onnx|pt|pth|ckpt|safetensors|h5|pb|tflite|joblib|pkl)$` → **0 results**; dataset-ish files → `ai-services/triage/sample_data/**` (synthetic, generated by `generate_test_dicoms.py`), `backend/src/__tests__/golden-dataset.test.ts` (fixtures), `investor-submission/*.csv` (financial). Only `.venv` site-packages ONNX test fixtures exist locally (not tracked). Training code: only `backend/src/routes/training.ts` (an API route, not model training).
- **Line range:** n/a.
- **Execution path:** commands as stated (reproducible per Appendix E).
- **Implementation:** E (weights/data absent). **Validation:** A (the absence is proven). **Reproducibility:** A. **Confidence:** high. **Caveat:** weights could exist in Azure Blob/PVC outside the repo — **UNKNOWN — insufficient evidence in the repository** (E-05 caveat).

---

**E-11 — Safety harnesses score service errors as safety successes**
- **Claim:** Both CI safety scripts structurally inflate "catch rate"/"safety" numbers.
- **Evidence type:** static (with E-01/E-02 establishing the broken contract they rely on).
- **Path/Symbol:** `backend/src/validation/metacognition-benchmark.ts:40` (`shap_values: {}`), `:55` (reads `layer9_safe_to_alert`), `:59-61` (`catch → if (isUnsafe) blockedCases++`), `:63` (zero-denominator → `'100.0'`); `safety-validation.ts:53-72` (mocked stages), `:82` (same object), `:91` (wrong field), `:94-96` (`catch → metacogPass=false`).
- **Line range:** as cited.
- **Execution path:** CI `safety-gate` (`deploy.yml:166-199`) runs both → service 422s on every case (E-01 mechanism) → benchmark counts unsafe cases as blocked; validation counts all as FAIL → precision/recall degenerate.
- **Implementation:** C. **Validation:** invalidated by inspection against live contract. **Reproducibility:** A (logic). **Confidence:** high. **Caveat:** exact historical CI numbers not re-run here; the structural defect alone suffices to reject the claims.

---

**E-12 — Fabricated monitoring endpoints**
- **Claim:** `/drift` and `/bias` return constants derived from wall-clock, not data.
- **Evidence type:** static.
- **Path/Symbol:** `backend/src/routes/ai-monitoring.ts:164-175` (`kappa = 0.84 + (driftBucket%6)/100`, `psi = 0.02 + (driftBucket%2)/100`), `:181-201` (hard-coded AUC arrays incl. UK/Africa), `:132-138` (synthetic AUC/sensitivity fallbacks).
- **Line range:** 127–146, 164–175, 181–201.
- **Execution path:** route handlers return literals/jitter; no DB reads for these values.
- **Implementation:** C (mock). **Validation:** N/A. **Reproducibility:** A (code). **Confidence:** high. **Caveat:** `/latency` (`:208+`) claims real percentiles from `AIResult.inferenceMs` — partially real, but that column depends on the unreachable pipeline.

---

**E-13 — Human-review flag plumbing exists but is disconnected at both ends**
- **Claim:** `requiresHumanReview` is set from undefined gate fields and is not consulted by report signing.
- **Evidence type:** static + grep.
- **Path/Symbol:** writers `aiOrchestrator.ts:433,534,631,850` (`:850` uses `metacog.layer9_safe_to_alert || uncertainty.highUncertaintyFlag` — both undefined per E-02/E-03); consumers `learningLoop.ts:19-26,79-82`, `PeerReviewWorkspace.tsx:101`; **absent in `reports.ts`** (grep 0).
- **Line range:** as cited.
- **Execution path:** flag → queue → UI → reset; signing path never checks it.
- **Implementation:** B/C. **Validation:** mocked assertions only (`orchestration.test.ts:182,238`). **Reproducibility:** A (static). **Confidence:** high. **Caveat:** other signing controllers could exist; grep covered `backend/src` fully for the flag name.

---

**E-14 — Marketing claims with no producing artefacts**
- **Claim:** 96.3% / ECE 0.042 / AUC 0.972 / 1.84 s / 47+ hospitals / 2.1M scans / certifications / "independently validated and peer-reviewed" / CIS have no implementation or evaluation evidence.
- **Evidence type:** static claim provenance + negative greps (E-09, E-10, E-11).
- **Path/Symbol:** `README.md:152-173`; `TechnicalWhitepaperPage.tsx:147,221,300`; `MetacognitionAI.tsx:60`; `LandingPage.tsx:12`; `UncertaintyAI.tsx:55`.
- **Line range:** as cited.
- **Execution path:** claim → searched repo for producing code/dataset/output → none found (§19 catalogue).
- **Implementation:** D/E. **Validation:** none. **Reproducibility:** no. **Confidence:** high. **Caveat:** out-of-repo evidence may exist elsewhere — **UNKNOWN — insufficient evidence in the repository**; still unsafe to state in a research document sourced from this repository.


## Recommended Scientific Position (prompt §37)

> **Based on the actual codebase, what should SEWA + University of Derby investigate?**

**1. Existing engineering capability (verified):**
A deployable multi-service medical-imaging platform (backend/frontend/mobile/DICOM/FHIR/human-review loop) with three executing inference services — including a deterministic, fully inspectable metacognition rule gate (`metacognition/main.py:156-420`) and an explicit uncertainty decomposition (`uncertainty/main.py:209-212`) — plus calibration machinery (`calibrationService.ts`) and an empty safety-audit table (`MetacognitionAuditLog`) ready to receive data (E-02, E-03, E-09, E-10).

**2. Unresolved scientific question (evidence-based):**
These signals are produced *separately*, never unified, never calibrated (zero callers), never evaluated against correctness (no risk-coverage/selective-risk/error-detection anywhere), and currently do not even reach their consumers (contract break, E-01…E-04). So: **does an explicit, formally defined metacognitive reliability state built from these ingredients predict consequential error and drive abstention/escalation better — and more explainably — than any constituent signal alone, and does it survive distribution shift?** This is exactly the gap pattern §28 confirmed on all 13 applicable rows.

**3. Falsifiable hypotheses (from §26):**
H1 fused state ≥ best single signal on error-detection AUROC (and improves area under the risk-coverage curve); H2 calibrating confidence reduces false reassurance at fixed coverage; H3 gate-stated reasons are faithful under ablation; H6 uncertainty rises under controlled shift before accuracy falls. Each has a defined null outcome (§30/§32-Q8).

**4. Experimental intervention (from §30):**
Fix the contracts; log all signals + ground truth per case; pre-register the fusion \(g\) and freeze thresholds (0.60/0.25/0.5 currently have no provenance — §12); evaluate on N≥300 labelled cases with an independent test split; harness computes error-detection AUROC, risk-coverage, false-abstention rate, ECE/Brier with bootstrap CIs; ablation harness for gate-reason faithfulness.

**5. Measurable outcomes:**
ΔAUROC with CI; area under risk-coverage; false-abstention @ fixed coverage; ECE/Brier before/after calibration; faithfulness ablation score; (optionally) clinician reliance metrics via the existing peer-review queue.

**6. Possible negative result:**
The fused state fails to beat the best single signal (H1 null), calibration doesn't move abstention (H2 null), reasons prove unfaithful (H3 null), or uncertainty doesn't anticipate shift (H6 null). All are publishable as careful negative evaluations — the repo's honest instrumentation gap makes them credible.

**7. Potential contribution if successful:**
A formally specified, calibrated, evaluated **metacognitive reliability state with a faithful explanation of action/abstention**, demonstrated inside a real clinical pipeline — plus the methodological finding (already evidenced here) that mocked test suites can pass while a safety-critical pipeline is provably non-functional, and a contract-aware testing pattern to catch it. *(Potential research novelty requiring literature verification — §29.)*

**Supported formulation (audit confirms it fits prompt §37's template):**

> SEWA already contains a deterministic metacognition rule gate, an explicit epistemic/aleatoric uncertainty decomposition, an unwired ECE/Brier calibration subsystem, and a human-review action channel. However, the codebase does not establish that these mechanisms constitute a coherent metacognitive reliability state — they are contract-disconnected, uncalibrated, and unevaluated. The strongest research opportunity is therefore to formalise the reliability state, test whether it predicts consequential error and supports abstention better than established single-signal baselines under distribution shift, and determine whether its explanations are faithful enough to drive appropriately calibrated action policies.

**What must not accompany this position:** any claim from the §32 matrix's "Safe to state: no" rows, any "first/novel" superlative (§25 discipline), or any clinical-performance figure (§19/§35).

---

## Quality-Control Checklist (prompt §38)

- [x] Entire repository mapped — §3 (all top-level areas; 1,038 tracked files)
- [x] Runtime paths traced — §5/§8 (stage-by-stage, live)
- [x] Relevant source files inspected — Appendix B (orchestrator, 10 services, assurance code, routes, schema)
- [x] Models identified — §7 (claimed vs actual; demo provenance proven E-05)
- [x] Model usage verified — §7 (live E-03/E-04; labels vs reality)
- [x] Uncertainty mechanisms verified — §9 (formulas reconstructed from code, live)
- [x] Calibration verified — §10 (machinery exists, never invoked; claims rejected)
- [x] Agreement/disagreement verified — §11 (State E, not implemented)
- [x] Safety gate reconstructed — §12 (inputs/transformation/thresholds/actions/robustness/validation)
- [x] Confidence Integrity Score reconstructed or disproved — §13 (disproved: State E)
- [x] Abstention/defer/escalation verified — §16 (flag plumbing exists; unreachable + ungated at signing)
- [x] Explainability mechanisms verified — §15 (incl. random SHAP fallback)
- [x] MRS components assessed — §14 (18-row table + explicit answer)
- [x] OOD/shift mechanisms assessed — §17 (fabricated dashboards; science absent)
- [x] Datasets identified — §18 (synthetic only; no leakage possible)
- [x] Evaluation scripts inspected — §19 (both safety harnesses structurally invalid)
- [x] Metrics traced to code — §19/Appendix C (all README metrics untraceable)
- [x] Tests inspected — §21 (15 files; safety logic untested; pytest optional in CI)
- [x] Reproducibility assessed — §20 (score 2/5 with rationale)
- [x] Clinical integrations verified — §23 (FHIR yes; PACS/RIS/HL7 not found)
- [x] Security/privacy engineering reviewed — §24 (engineering evidence only)
- [x] Dead/mock/placeholder code identified — §35 N4–N13, N28–N30
- [x] Claims separated from implementation — §25 matrix
- [x] Scientific gaps identified — §28 (13/13 confirmed with evidence)
- [x] Research opportunities identified — §27 (ranked)
- [x] EPSRC relevance assessed — §31 (honest partial fit)
- [x] Red-team review completed — §32 (5 personas + 10 questions)
- [x] Exact file/function evidence provided — Appendix F (E-01…E-14 with line ranges)
- [x] No unsupported novelty claims — §29 (only "potential research novelty requiring literature verification")
- [x] No unsupported clinical claims — every clinical figure listed as unsupported/rejected (§19, §32, §35)
- [x] No secrets/patient identifiers exposed — §24 (secret files referenced by path only; values never read/printed)

---

*End of report. Evidence records E-01…E-14 are reproducible per Appendix E; states follow the A–E framework of §4; negative findings are first-class results per prompt §35.*
