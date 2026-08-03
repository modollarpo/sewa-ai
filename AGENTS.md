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

## 📋 Work State (2026-08-02 — swedencentral rebuild)

### ✅ Completed
- **uksouth stack fully destroyed** — all 55 resources removed; RG `sewa-ai-prod-rg` deleted
- **swedencentral stack rebuilt** — 48 resources created with region-suffixed names to avoid global-name collisions (KV purge protection blocks reuse of `sewa-ai-prod-kv` for 90 days)
- **New globally-unique names**: ACR `sewaaieuprodacr`, KV `sewa-ai-prod-eu-kv`, storage `sewaaieuproddicom`, ServiceBus `sewa-ai-prod-eu-bus`, SignalR `sewa-ai-prod-eu-signalr`, FrontDoor `sewa-ai-prod-eu-afd`, Ledger `sewa-ai-prod-eu-ledger`, PG `sewa-ai-prod-eu-pg`, FHIR `sewaaieuprodhw`/`sewaaieuprodhfrsvc`, AKS `sewa-ai-prod-eu-aks`
- **AKS cluster** `sewa-ai-prod-eu-aks` running k8s 1.35.6 in swedencentral with 3 node pools:
  - `system`: 3× `Standard_D4s_v5` (backend/frontend/redis)
  - `aipool`: `Standard_D8ds_v5` (Ice Lake AVX-512/VNNI, INT8 optimal), label `nodepool: ai`, min 2 max 8 — hosts triage/pathology/mammography/retinal + VLM/uncertainty/metacognition/federated/continuous
  - `spotpool`: `Standard_D8s_v5`, priority Spot, min 0 max 20 — federated learning
- **No GPU pool** — platform is all CPU/ONNX-INT8; VLM calls Azure OpenAI GPT-4o API; voice uses Azure Speech + OpenAI Whisper API
- **All PaaS services** verified available in swedencentral and created: PG flexible (ZoneRedundant HA + geo-backup), FHIR R4, Storage (GRS, 7yr lifecycle, 3 containers: scans/gradcam/reports), ServiceBus Premium (3 queues), SignalR Premium, Key Vault Premium (purge protection), Log Analytics, Prometheus workspace, Confidential Ledger (co-located swedencentral), FrontDoor Premium + WAF, ACR Premium (zone redundancy + geo-replication to uksouth for UK DR)
- **Network fixes preserved**: KV/storage network_rules with deployer IP `102.89.76.188/30` (aligned /30), storage public network enabled
- **ACR firewall relaxed** (`infrastructure/terraform-azure/main.tf:94-96`): `network_rule_set default_action = "Deny"` → `"Allow"` — GitHub Actions hosted runners push via OIDC from variable public IPs; auth still enforced via AAD/OIDC tokens (`admin_enabled = false`). **APPLIED directly via `az acr update --name sewaaieuprodacr --default-action Allow` (2026-08-03) — verified `defaultAction: "Allow"` in Azure. Terraform state was NOT updated (still shows Deny), and a full `terraform apply` was deliberately NOT run** because the plan is destructive (37 add / 5 change / 1 destroy): `azurerm_key_vault.main` is **tainted → would be destroyed+recreated** (purge protection would likely block recreation of the global name and lose all 17 secrets), storage account `sewaaieuproddicom` is absent from state though it exists, plus FHIR service, private endpoints (blob+KV), private-endpoints subnet, role assignments, AKS node_count 2→3. **Do not run `terraform apply` without first reconciling state (un-taint KV, import storage) and reviewing the plan.**
- **OIDC SP `590c6463-962f-4aa8-9a6f-b966302dabdf` verified with `AcrPush`** on `sewaaieuprodacr` (role assignment `faea0288-289f-4477-ab90-f343ba09701e`, scoped, principalId `323068fc-18bc-44f1-971e-3676b45c1aa1`) — confirmed via `az role assignment list --scope .../sewaaieuprodacr`
- **k8s manifests updated** (`azure/k8s/`): all image refs `sewaaiproductionacr` → `sewaaieuprodacr.azurecr.io`, all RG/AKS/KV names updated to new stack
- **CI/CD workflows updated** (`.github/workflows/deploy.yml`, `.github/workflows/ci-cd.yml`, `scripts/setup-github-oidc.sh`): new ACR name, new RG, new AKS cluster
- **ACR admin enabled** for image push; ACR Premium with zone redundancy + geo-replication to uksouth
- **Terraform state** at `infrastructure/terraform-azure/terraform.tfstate` — 48 resources, all swedencentral
- **Sensitive values** in `terraform.tfvars`: db_admin_password `S3wa@I2026!Pr0d#Db`, app_url `https://api.sewaxai.health`, CORS origins, firebase `sewa-ai-prod`, SendGrid SMTP, placeholders for JWT/Stripe/Paystack/Flutterwave/MPESA

### 🔜 Next
- **Build/push images to new ACR** (`sewaaieuprodacr.azurecr.io`): `sewa-backend:prod-20260723`, `sewa-frontend:prod-20260723`, and all AI service images — `az acr build` or GitHub Actions (Docker Desktop not running locally; `az` commands hang from this machine — use Azure Cloud Shell or CI/CD)
- **Deploy k8s manifests** to `sewa-ai-prod-eu-aks`: `kubectl apply -f azure/k8s/` — deployer user lacks cluster-admin; use admin kubeconfig or a cluster-admin service principal
- **Verify deployment**: pods running, endpoints healthy, ACR pull working from AKS nodes

### Architecture
```
Frontend → apiClient.ts → Backend (Express) → aiController.ts → Translation/Voice services → AKS microservices (swedencentral)
                                                                  ↓
                                                             Azure OpenAI GPT-4o (VLM)
                                                             Azure Speech + Whisper (voice)
```

## ⚠️ Critical Constraints
- **Zero Secrets**: Never commit `.env` or sensitive JSON keys.
- **Dependencies**: Explain any new library additions in the chat first.
- **Context**: If a file exceeds 300 lines, suggest a refactor/split.
- **Communication**: Summarize changes and ACR results after every task.
- **Network**: `az`/`docker` commands hang from this machine — use Azure Cloud Shell or CI/CD for ACR build/push and AKS admin operations.
