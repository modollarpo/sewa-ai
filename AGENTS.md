# 🤖 AGENT.md - Universal AI Operating Manual

## 🎯 Project Context & Strategy
You are an expert full-stack engineer. Before writing code, analyze the root directory to identify the active stack (React, Python, or Go). 

- **Primary Goal**: Deliver type-safe, performant, and containerized code.
- **Workflow**: Plan -> Implement -> ACR (Automated Code Review) -> Deploy/CI.

---

## 🛠 Tech Stack Specializations

### ⚛️ React (Frontend)
- **Trigger**: `package.json` exists.
- **Standards**: Functional components, Tailwind CSS, TypeScript (Strict).
- **State**: Zustand for global, TanStack Query for server state.
- **Command**: `npm run dev` | `npm test` | `npm run lint`.

### 🐍 Python (Backend)
- **Trigger**: `requirements.txt` or `pyproject.toml` exists.
- **Standards**: PEP 8, Type Hints mandatory, FastAPI/Flask.
- **Async**: Use `async/await` for all I/O operations.
- **Command**: `pytest` | `black .` | `ruff check .`.

### 🐹 Go (Systems)
- **Trigger**: `go.mod` exists.
- **Standards**: Explicit error handling (`if err != nil`), `context.Context` for all IO.
- **Patterns**: Accept interfaces, return structs.
- **Command**: `go test ./...` | `go fmt` | `go vet`.

---

## 🔍 ACR (Automated Code Review) Protocol
Perform a self-review before submitting any code:
1. **Security**: Scan for hardcoded secrets/keys. Ensure `.env.template` is updated.
2. **Logic**: Check for N+1 queries, race conditions, or memory leaks.
3. **Quality**: No `any` types in TS; 100% type hint coverage in Python.
4. **DRY**: Consolidate duplicate logic into shared utilities/internal packages.

---

## 🚢 Azure Container Registry (ACR) & Docker
**Registry**: `${ACR_NAME}.azurecr.io`
**Naming**: `${IMAGE_NAME}:${GITHUB_SHA}` (Never use `:latest` for prod).

- **Multi-Stage Builds**: Mandated for all Dockerfiles to reduce attack surface.
- **Base Images**: Use `alpine` (Node/Go) or `slim` (Python).
- **ACR Build**: Use `az acr build --registry ${ACR_NAME} --image ${IMAGE_NAME}:${TAG} .` for remote builds.
- **Auth**: Verify login via `az acr login --name ${ACR_NAME}`.

---

## 🚀 CI/CD & Automation
### GitHub Actions / Azure DevOps
- **Triggers**: All PRs must trigger Lint -> Test -> Container Build.
- **Secrets**: Reference secrets via `${{ secrets.AZURE_CREDENTIALS }}` or variable groups.
- **Deployment**:
  - **Dev**: Auto-deploy on merge to `develop`.
  - **Prod**: Manual approval gate required.
- **Command**: If modifying CI/CD, validate YAML syntax with `actionlint` or equivalent.

---

## 📋 Work State (2026-07-23)

### ✅ Completed
- **Enterprise services deployed to AKS** — Voice-transcription (custom FastAPI) + LibreTranslate running 1/1 in namespace `sewa-ai`
- **Network policies created** — `voice-transcription-policy` + `translation-policy` for ingress/egress
- **Backend service clients created** — `translationService.ts` + `voiceTranscriptionService.ts` with circuit-breaker pattern
- **New API endpoints** — `/api/v1/ai/translate`, `/ai/detect-language`, `/ai/languages`, `/ai/enterprise-transcribe`
- **Frontend integration** — `ui/VoiceDictation.tsx` enhanced with enterprise transcription path (MediaRecorder → backend Azure Speech); `RadiologistWorkspace.tsx` now passes `scanId` + `enterprise=true`
- **Frontend API helpers** — `translateText()`, `detectLanguage()`, `listLanguages()`, `enterpriseTranscribe()` in `apiClient.ts`
- **Config updated** — `env.ts` now has `TRANSLATION_SERVICE_URL`, `VOICE_TRANSCRIPTION_SERVICE_URL`
- **Security fix** — Azure Speech key no longer leaked via `/health` endpoint
- **Bug fixes** — Pydantic v2 `regex`→`pattern`, missing `BaseModel`/`base64` imports, Prometheus worker conflict
- **VLM pipeline wired to LibreTranslate** — `vlmLanguageService.ts` now has `translateReportContent()` that translates VLM report body (technique/findings/impression/recommendation) after generation; `aiOrchestrator.ts` calls it for non-English report languages
- **Backend Docker image rebuilt & pushed** — `sewa-backend:prod-20260723` → ACR (build `db1dc`, includes VLM translation, service clients, AI controller endpoints)
- **Frontend Docker image rebuilt & pushed** — `sewa-frontend:prod-20260723` → ACR (build `db1de`, includes enterprise dictation in ui/VoiceDictation + RadiologistWorkspace)
- **Deployment manifest files updated** — `backend-deployment-prod.yaml` and `frontend-deployment.yaml` reference new images
- **Deploy script created** — `azure/k8s/deploy-update.ps1` one-command deploy

### 🔜 Next
- **Apply updated manifests to AKS** (blocked — cluster API endpoint unreachable from this machine; run `.\azure\k8s\deploy-update.ps1` from authorized network or Azure Cloud Shell)

### Architecture
```
Frontend → apiClient.ts → Backend (Express) → aiController.ts → Translation/Voice services → AKS microservices
                                                                  ↓
                                                             LibreTranslate (port 8080)
                                                             Voice-Transcription (port 8000)
```

## ⚠️ Critical Constraints
- **Zero Secrets**: Never commit `.env` or sensitive JSON keys.
- **Dependencies**: Explain any new library additions in the chat first.
- **Context**: If a file exceeds 300 lines, suggest a refactor/split.
- **Communication**: Summarize changes and ACR results after every task.
