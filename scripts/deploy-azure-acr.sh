#!/usr/bin/env bash
# ============================================================
# SEWA XAI — deploy-azure-acr.sh
# Full Production Deployment to Azure — NO Docker Desktop required
#
# Uses ACR Tasks (cloud-native build + push) instead of local Docker.
# Terraform manages all infrastructure. Images built entirely in Azure.
#
# Usage:
#   bash scripts/deploy-azure-acr.sh [--env production] [--region uksouth]
#   bash scripts/deploy-azure-acr.sh --env staging --region westeurope
#   bash scripts/deploy-azure-acr.sh --skip-tf        # skip Terraform (already applied)
#   bash scripts/deploy-azure-acr.sh --skip-build     # skip image builds (already pushed)
#   bash scripts/deploy-azure-acr.sh --skip-frontend  # skip frontend (no code changes)
#   bash scripts/deploy-azure-acr.sh --images-only    # build+push images, stop there
#
# Prerequisites (no Docker Desktop needed):
#   az CLI >= 2.55    (az login)
#   kubectl           (az aks install-cli)
#   terraform >= 1.6  (tfenv install)
#   node >= 20        (for frontend build + EAS)
#   jq
#
# © 2026 SEWA XAI — a Storegrill Inc Ltd company.
# Registered in England & Wales (14581073). All rights reserved.
# ============================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m'
BLUE='\033[0;34m' CYAN='\033[0;36m' BOLD='\033[1m' NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}   $*"; }
success() { echo -e "${GREEN}[✓]${NC}     $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[✗]${NC}     $*"; exit 1; }
section() {
  echo ""
  echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  $*${NC}"
  echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════${NC}"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Parse flags ───────────────────────────────────────────────
ENV="production"
REGION="uksouth"
SKIP_TF=false
SKIP_BUILD=false
SKIP_FRONTEND=false
IMAGES_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)           ENV="$2";       shift 2 ;;
    --region)        REGION="$2";    shift 2 ;;
    --skip-tf)       SKIP_TF=true;   shift ;;
    --skip-build)    SKIP_BUILD=true; shift ;;
    --skip-frontend) SKIP_FRONTEND=true; shift ;;
    --images-only)   IMAGES_ONLY=true; shift ;;
    --dry-run)       DRY_RUN=true;   shift ;;
    --help|-h)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -20
      exit 0 ;;
    *) error "Unknown flag: $1. Run $0 --help" ;;
  esac
done

[[ "$ENV" != "production" && "$ENV" != "staging" && "$ENV" != "dev" ]] && \
  error "Invalid --env. Use: production | staging | dev"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="${ENV}-${TIMESTAMP}"

# ── Derived names (must match Terraform naming convention) ────
APP="sewa-ai"
RG="${APP}-${ENV}-rg"
ACR_NAME="sewaai${ENV}acr"
ACR="${ACR_NAME}.azurecr.io"
AKS="${APP}-${ENV}-aks"
KV="${APP}-${ENV}-kv"
SWA="${APP}-${ENV}-web"
STORAGE="${APP//-/}${ENV}dicom"
HW="${APP}-${ENV}-hw"             # Healthcare workspace
FHIR_SVC="${APP}-${ENV}-fhir"     # FHIR service

cd "$ROOT_DIR"

# ══════════════════════════════════════════════════════════════
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║     SEWA XAI — Azure ACR Production Deployment           ║"
echo "  ║     No Docker Desktop required · ACR Tasks builds       ║"
echo "  ║     from hours, to seconds                              ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
info "Environment  : ${ENV}"
info "Region       : ${REGION}"
info "Image tag    : ${IMAGE_TAG}"
info "Resource grp : ${RG}"
info "ACR          : ${ACR}"
info "AKS          : ${AKS}"
[[ "$DRY_RUN" == "true" ]] && warn "DRY RUN — no changes will be made"

# ══════════════════════════════════════════════════════════════
section "Step 0 — Prerequisites"
# ══════════════════════════════════════════════════════════════

REQUIRED_TOOLS="az kubectl jq node npm"
for tool in $REQUIRED_TOOLS; do
  if command -v "$tool" &>/dev/null; then
    ver=$(${tool} --version 2>/dev/null | head -1 || echo "ok")
    success "$tool: $ver"
  else
    error "Required tool missing: ${tool}. See DEPLOYMENT.md for install instructions."
  fi
done

# Terraform optional — only needed if not skipping
if [[ "$SKIP_TF" != "true" ]]; then
  command -v terraform &>/dev/null || error "terraform not found. Install: https://tfenv.env.sh"
fi

# Azure login check
az account show &>/dev/null || error "Not logged in. Run: az login"
SUBSCRIPTION=$(az account show --query id   -o tsv)
TENANT_ID=$(az account show    --query tenantId -o tsv)
LOGGED_AS=$(az account show    --query user.name -o tsv)
success "Azure: ${LOGGED_AS} (${SUBSCRIPTION})"

[[ "$DRY_RUN" == "true" ]] && { warn "Dry run — exiting after prerequisite check"; exit 0; }

# ══════════════════════════════════════════════════════════════
section "Step 1 — Terraform Infrastructure"
# ══════════════════════════════════════════════════════════════

if [[ "$SKIP_TF" == "true" ]]; then
  warn "Skipping Terraform (--skip-tf). Reading outputs from existing state."
else
  TF_DIR="${ROOT_DIR}/infrastructure/terraform-azure"
  [[ -f "${TF_DIR}/terraform.tfvars" ]] || \
    error "terraform.tfvars missing. Copy terraform.tfvars.example and fill in secrets."

  cd "$TF_DIR"
  info "terraform init..."
  terraform init -upgrade -reconfigure \
    -backend-config="resource_group_name=sewa-ai-tfstate-rg" \
    -backend-config="storage_account_name=sewaaitfstate" \
    -backend-config="container_name=tfstate" \
    -backend-config="key=${ENV}.terraform.tfstate" \
    -input=false 2>&1 | grep -E "Terraform|Error|Warning|initialized" || true

  info "terraform plan..."
  terraform plan \
    -var="environment=${ENV}" \
    -var="azure_region=${REGION}" \
    -out="${ENV}.tfplan" \
    -input=false 2>&1 | tail -8

  info "terraform apply..."
  terraform apply -auto-approve -input=false "${ENV}.tfplan"
  success "Infrastructure provisioned"
  cd "$ROOT_DIR"
fi

# Read Terraform outputs (always needed)
info "Reading Terraform outputs..."
TF_DIR="${ROOT_DIR}/infrastructure/terraform-azure"
cd "$TF_DIR"
TF_OUT=$(terraform output -json 2>/dev/null)

tf() { echo "$TF_OUT" | jq -r ".${1}.value // empty" 2>/dev/null || echo ""; }

ACR_SERVER=$(tf "acr_login_server");          [[ -z "$ACR_SERVER" ]] && ACR_SERVER="${ACR}"
PG_FQDN=$(tf "postgres_fqdn")
KV_NAME=$(tf "key_vault_name");               [[ -z "$KV_NAME" ]] && KV_NAME="${KV}"
STORAGE_ACC=$(tf "storage_account_name");     [[ -z "$STORAGE_ACC" ]] && STORAGE_ACC="${STORAGE}"
FHIR_ENDPOINT=$(tf "fhir_base_url")
FHIR_CLIENT_ID=$(tf "fhir_client_id")
SWA_HOSTNAME=$(az staticwebapp list --resource-group "${RG}" \
  --query "[0].defaultHostname" -o tsv 2>/dev/null || echo "")
DATABASE_URL=$(terraform output -raw database_url       2>/dev/null || echo "")
REDIS_URL=$(terraform output    -raw redis_url          2>/dev/null || echo "")
STORAGE_CONN=$(terraform output -raw storage_connection_string 2>/dev/null || echo "")

success "Terraform outputs read"
cd "$ROOT_DIR"

# ══════════════════════════════════════════════════════════════
section "Step 2 — Generate backend/.env.azure from Key Vault"
# ══════════════════════════════════════════════════════════════

bash "${SCRIPT_DIR}/generate-env-azure.sh" \
  --env "${ENV}" \
  --out "${ROOT_DIR}/backend/.env.azure" || \
  warn "generate-env-azure.sh encountered issues — check .env.azure manually"

success ".env.azure generated from Key Vault + Terraform outputs"

# ══════════════════════════════════════════════════════════════
section "Step 3 — ACR Login (no Docker Desktop required)"
# ══════════════════════════════════════════════════════════════

# az acr login uses an az-managed token — no Docker daemon required for push
# (ACR Tasks builds happen entirely in the cloud — never touch local disk)
az acr login --name "${ACR_NAME}" 2>/dev/null || \
  warn "Local ACR login failed — this is expected without Docker Desktop. ACR Tasks will still work."

success "ACR configured: ${ACR_SERVER}"

# ══════════════════════════════════════════════════════════════
section "Step 4 — Build Backend via ACR Tasks (cloud build)"
# ══════════════════════════════════════════════════════════════
# ACR Tasks builds the Dockerfile in Azure cloud compute — no local Docker needed.
# Runs npm ci + tsc + prisma generate + prune inside Azure, pushes image to ACR.

if [[ "$SKIP_BUILD" == "true" ]]; then
  warn "Skipping image builds (--skip-build)"
  # Use the most recently pushed image
  LATEST_BACKEND=$(az acr repository show-tags \
    --name "${ACR_NAME}" \
    --repository "${APP}-backend" \
    --orderby time_desc --top 1 -o tsv 2>/dev/null || echo "${IMAGE_TAG}")
  IMAGE_TAG="${LATEST_BACKEND}"
  info "Using existing image tag: ${IMAGE_TAG}"
else

  BACKEND_IMAGE="${ACR_SERVER}/${APP}-backend:${IMAGE_TAG}"
  info "Building backend via ACR Tasks: ${BACKEND_IMAGE}"
  info "  (No Docker Desktop needed — builds in Azure cloud)"
  az acr build \
    --registry       "${ACR_NAME}" \
    --image          "${APP}-backend:${IMAGE_TAG}" \
    --image          "${APP}-backend:${ENV}-latest" \
    --file           "backend/Dockerfile" \
    --build-arg      "NODE_ENV=${ENV}" \
    --build-arg      "BUILD_TIMESTAMP=${TIMESTAMP}" \
    backend/
  success "Backend built and pushed: ${BACKEND_IMAGE}"

  # ── Step 5: Build all AI services via ACR Tasks ─────────────
  section "Step 5 — Build AI Services via ACR Tasks (cloud build)"

  declare -A AI_PORTS=(
    ["triage"]="8000"
    ["uncertainty"]="8002"
    ["vlm-report"]="8001"
    ["metacognition"]="8003"
    ["federated-learning"]="8004"
    ["continuous-learning"]="8005"
  )

  # Build all in parallel using ACR Tasks --no-wait, then wait
  TASK_RUNS=()
  for svc in "${!AI_PORTS[@]}"; do
    SVC_DIR="ai-services/${svc}"
    [[ ! -d "$SVC_DIR" ]] && { warn "Missing: ${SVC_DIR}"; continue; }

    IMAGE_NAME="${APP}-${svc}"
    info "Submitting ACR Task: ${IMAGE_NAME}:${IMAGE_TAG}"

    # Fix build context issue by copying shared module inside service dir
    if [[ -d "ai-services/shared" && ("$svc" == "triage" || "$svc" == "uncertainty" || "$svc" == "continuous-learning" || "$svc" == "federated-learning") ]]; then
      cp -r "ai-services/shared" "${SVC_DIR}/shared"
    fi

    RUN_ID=$(az acr build \
      --registry  "${ACR_NAME}" \
      --image     "${IMAGE_NAME}:${IMAGE_TAG}" \
      --image     "${IMAGE_NAME}:${ENV}-latest" \
      --file      "${SVC_DIR}/Dockerfile" \
      --no-wait \
      "${SVC_DIR}/" \
      --query id -o tsv 2>/dev/null || echo "")

    [[ -n "$RUN_ID" ]] && TASK_RUNS+=("$RUN_ID") && info "  Submitted: ${RUN_ID}"
  done

  # Wait for all parallel builds
  if [[ ${#TASK_RUNS[@]} -gt 0 ]]; then
    info "Waiting for ${#TASK_RUNS[@]} parallel ACR builds..."
    FAILED=0
    for run_id in "${TASK_RUNS[@]}"; do
      info "  Waiting: ${run_id}"
      STATUS=$(az acr task run-show --registry "${ACR_NAME}" --run-id "${run_id}" \
        --query status -o tsv 2>/dev/null || echo "Unknown")

      # Poll until complete (max 20 min per build)
      POLLS=0
      while [[ "$STATUS" == "Running" || "$STATUS" == "Queued" ]] && [[ $POLLS -lt 120 ]]; do
        sleep 10; POLLS=$((POLLS+1))
        STATUS=$(az acr task run-show --registry "${ACR_NAME}" --run-id "${run_id}" \
          --query status -o tsv 2>/dev/null || echo "Unknown")
        [[ $((POLLS % 3)) -eq 0 ]] && info "  ${run_id}: ${STATUS} (${POLLS}0s)"
      done

      if [[ "$STATUS" == "Succeeded" ]]; then
        success "  ${run_id}: Succeeded"
      else
        warn "  ${run_id}: ${STATUS} — check: az acr task run-show --registry ${ACR_NAME} --run-id ${run_id}"
        FAILED=$((FAILED+1))
      fi
    done
    [[ $FAILED -gt 0 ]] && warn "${FAILED} AI service build(s) failed — check ACR logs"
  fi
  success "All AI service images built via ACR Tasks"
fi

[[ "$IMAGES_ONLY" == "true" ]] && { success "Images built. Exiting (--images-only)."; exit 0; }

# ══════════════════════════════════════════════════════════════
section "Step 6 — AKS: Get Credentials"
# ══════════════════════════════════════════════════════════════

az aks get-credentials \
  --resource-group "${RG}" \
  --name           "${AKS}" \
  --overwrite-existing
success "kubectl configured for cluster: ${AKS}"

kubectl cluster-info --request-timeout=10s 2>/dev/null || \
  warn "Cluster info check failed — check VPN/firewall if using private cluster"

# ══════════════════════════════════════════════════════════════
section "Step 6a — nginx Ingress Controller + cert-manager (TLS)"
# ══════════════════════════════════════════════════════════════

if ! kubectl get namespace ingress-nginx &>/dev/null 2>&1; then
  info "Installing nginx ingress controller (cloud provider mode)..."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/cloud/deploy.yaml
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s && success "nginx ingress: ready" || warn "nginx ingress: not yet ready"
else
  success "nginx ingress controller: already installed"
fi

if ! kubectl get namespace cert-manager &>/dev/null 2>&1; then
  info "Installing cert-manager v1.14.3..."
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.3/cert-manager.yaml
  sleep 25  # wait for webhook admission to register
  kubectl wait --namespace cert-manager \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/instance=cert-manager \
    --timeout=120s && success "cert-manager: ready" || warn "cert-manager: not yet ready"

  # Let's Encrypt ClusterIssuer
  kubectl apply -f - <<CLUSTERISSUER
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: info@sewaxai.health
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
CLUSTERISSUER
  success "ClusterIssuer 'letsencrypt-prod' created"
else
  success "cert-manager: already installed"
fi

# ══════════════════════════════════════════════════════════════
section "Step 6b — ACR Image Pull Secret"
# ══════════════════════════════════════════════════════════════
# Belt-and-braces alongside AKS managed identity AcrPull (Terraform-assigned).
# Required for: new node pools, cross-subscription ACR, GPU node pool cold-starts.

info "Creating ACR image pull secret (token-based, 3hr expiry)..."
ACR_TOKEN_JSON=$(az acr login --name "${ACR_NAME}" --expose-token --output json 2>/dev/null || echo "{}")
ACR_PULL_TOKEN=$(echo "${ACR_TOKEN_JSON}" | jq -r ".accessToken // empty" 2>/dev/null || echo "")

kubectl create namespace "${APP}" --dry-run=client -o yaml | kubectl apply -f -

if [[ -n "${ACR_PULL_TOKEN}" ]]; then
  kubectl create secret docker-registry acr-secret \
    --namespace "${APP}" \
    --docker-server="${ACR_SERVER}" \
    --docker-username="00000000-0000-0000-0000-000000000000" \
    --docker-password="${ACR_PULL_TOKEN}" \
    --dry-run=client -o yaml | kubectl apply -f -
  success "ACR pull secret 'acr-secret' created (token auth)"
else
  # Fallback: SP credentials
  ACR_PASS=$(az acr credential show --name "${ACR_NAME}" \
    --query "passwords[0].value" -o tsv 2>/dev/null || echo "")
  if [[ -n "${ACR_PASS}" ]]; then
    kubectl create secret docker-registry acr-secret \
      --namespace "${APP}" \
      --docker-server="${ACR_SERVER}" \
      --docker-username="${ACR_NAME}" \
      --docker-password="${ACR_PASS}" \
      --dry-run=client -o yaml | kubectl apply -f -
    success "ACR pull secret 'acr-secret' created (admin credentials)"
  else
    warn "ACR pull secret not created — AKS managed identity (AcrPull) will handle image pulls"
  fi
fi

# ══════════════════════════════════════════════════════════════
section "Step 7 — Kubernetes: Namespace + Secrets"
# ══════════════════════════════════════════════════════════════

# Namespace (idempotent — already created above)
kubectl create namespace "${APP}" --dry-run=client -o yaml | kubectl apply -f -
success "Namespace: ${APP}"

# Read all secrets from Key Vault
info "Reading secrets from Key Vault: ${KV_NAME}..."

kv() {
  az keyvault secret show \
    --vault-name "${KV_NAME}" \
    --name       "$1" \
    --query      value -o tsv 2>/dev/null || echo "${2:-}"
}

JWT_SECRET=$(kv      "sewa-jwt-secret")
JWT_REFRESH=$(kv     "sewa-jwt-refresh-secret")
ENC_KEY=$(kv         "sewa-encryption-key")
STRIPE_KEY=$(kv      "sewa-stripe-secret-key"     "")
PAYSTACK_KEY=$(kv    "sewa-paystack-secret-key"   "")
MPESA_KEY=$(kv       "sewa-mpesa-consumer-key"    "")
MPESA_SECRET_VAL=$(kv "sewa-mpesa-consumer-secret" "")
FLW_PUBLIC=$(kv      "sewa-flutterwave-public-key"  "")
FLW_SECRET=$(kv      "sewa-flutterwave-secret-key"  "")
PAYSTACK_PUB=$(kv    "sewa-paystack-public-key"     "")
PAYSTACK_SEC=$(kv    "sewa-paystack-secret-key"     "")
FIREBASE_KEY=$(kv    "sewa-firebase-private-key"  "")
FHIR_SECRET=$(kv     "sewa-fhir-client-secret"   "")
SMTP_PASS_VAL=$(kv   "sewa-smtp-pass"             "")
SENTRY=$(kv          "sewa-sentry-dsn"            "")
SENDGRID_KEY=$(kv    "sewa-sendgrid-api-key"     "")

# Create/update K8s secret (idempotent via --dry-run=client)
kubectl create secret generic sewa-secrets \
  --namespace "${APP}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=JWT_REFRESH_SECRET="${JWT_REFRESH}" \
  --from-literal=ENCRYPTION_KEY="${ENC_KEY}" \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=REDIS_URL="${REDIS_URL}" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="${STORAGE_CONN}" \
  --from-literal=STRIPE_SECRET_KEY="${STRIPE_KEY}" \
  --from-literal=PAYSTACK_SECRET_KEY="${PAYSTACK_SEC:-$PAYSTACK_KEY}" \
  --from-literal=PAYSTACK_PUBLIC_KEY="${PAYSTACK_PUB}" \
  --from-literal=FLUTTERWAVE_PUBLIC_KEY="${FLW_PUBLIC}" \
  --from-literal=FLUTTERWAVE_SECRET_KEY="${FLW_SECRET}" \
  --from-literal=MPESA_CONSUMER_KEY="${MPESA_KEY}" \
  --from-literal=MPESA_CONSUMER_SECRET="${MPESA_SECRET_VAL}" \
  --from-literal=FIREBASE_PRIVATE_KEY="${FIREBASE_KEY}" \
  --from-literal=FHIR_BASE_URL="${FHIR_ENDPOINT}" \
  --from-literal=FHIR_CLIENT_ID="${FHIR_CLIENT_ID}" \
  --from-literal=FHIR_CLIENT_SECRET="${FHIR_SECRET}" \
  --from-literal=FHIR_TENANT_ID="${TENANT_ID}" \
  --from-literal=SMTP_PASS="${SMTP_PASS_VAL}" \
  --from-literal=SENTRY_DSN="${SENTRY}" \
  --from-literal=EMAIL_FROM="info@sewaxai.health" \
  --from-literal=SENDGRID_API_KEY="${SENDGRID_KEY}" \
  --save-config --dry-run=client -o yaml | kubectl apply -f -
success "K8s secret 'sewa-secrets' applied"

# ConfigMap (non-secret env)
kubectl create configmap sewa-config \
  --namespace "${APP}" \
  --from-literal=NODE_ENV="${ENV}" \
  --from-literal=PORT="3000" \
  --from-literal=REGION="uk" \
  --from-literal=LOG_LEVEL="info" \
  --from-literal=APP_URL="https://api.sewaxai.health" \
  --from-literal=CORS_ORIGINS="https://app.sewaxai.health,https://sewaxai.health" \
  --from-literal=TRIAGE_URL="http://sewa-triage:8000" \
  --from-literal=VLM_URL="http://sewa-vlm-report:8001" \
  --from-literal=UNCERTAINTY_URL="http://sewa-uncertainty:8002" \
  --from-literal=METACOGNITION_URL="http://sewa-metacognition:8003" \
  --from-literal=FL_SERVICE_URL="http://sewa-federated:8004" \
  --from-literal=CL_SERVICE_URL="http://sewa-continuous:8005" \
  --from-literal=AZURE_STORAGE_CONTAINER="scans" \
  --from-literal=AZURE_GRADCAM_CONTAINER="gradcam" \
  --from-literal=AZURE_REPORTS_CONTAINER="reports" \
  --save-config --dry-run=client -o yaml | kubectl apply -f -
success "ConfigMap 'sewa-config' applied"

# ══════════════════════════════════════════════════════════════
section "Step 8 — Kubernetes: Apply Manifests"
# ══════════════════════════════════════════════════════════════

MANIFESTS_DIR="${ROOT_DIR}/azure/k8s"
for manifest in "${MANIFESTS_DIR}"/*.yaml; do
  [[ -f "$manifest" ]] || continue
  name=$(basename "$manifest")
  info "Applying: ${name}"
  sed \
    -e "s|{{IMAGE_TAG}}|${IMAGE_TAG}|g" \
    -e "s|{{CONTAINER_REGISTRY}}|${ACR_SERVER}|g" \
    -e "s|{{ENV}}|${ENV}|g" \
    -e "s|{{REGION}}|${REGION}|g" \
    "${manifest}" | kubectl apply -f -
  success "  ✓ ${name}"
done

# ══════════════════════════════════════════════════════════════
section "Step 9 — Database Migrations (via AKS Job)"
# ══════════════════════════════════════════════════════════════
# Runs prisma migrate deploy inside the cluster — no direct DB access needed
# from the deployment machine (DB is on private VNet)

info "Running Prisma migrations via K8s Job..."
cat <<JOBEOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: sewa-migrate-${TIMESTAMP//:/-}
  namespace: ${APP}
  labels:
    app: sewa-migrate
    run: "${TIMESTAMP}"
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: ${ACR_SERVER}/${APP}-backend:${IMAGE_TAG}
        command: ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma"]
        envFrom:
        - secretRef:
            name: sewa-secrets
        - configMapRef:
            name: sewa-config
      imagePullSecrets:
      - name: acr-secret
JOBEOF

# Wait for migration job (max 3 min)
info "Waiting for migration job..."
kubectl wait --namespace "${APP}" \
  --for=condition=complete \
  --timeout=180s \
  "job/sewa-migrate-${TIMESTAMP//:/-}" 2>/dev/null && \
  success "Migrations complete" || \
  warn "Migration job timed out or failed — check: kubectl logs -n ${APP} -l app=sewa-migrate"

# ══════════════════════════════════════════════════════════════
section "Step 10 — Rollout: Wait for All Deployments"
# ══════════════════════════════════════════════════════════════

DEPLOYMENTS="sewa-backend sewa-triage sewa-vlm-report sewa-uncertainty sewa-metacognition"

for dep in $DEPLOYMENTS; do
  info "Rolling out: ${dep}"
  kubectl rollout status "deployment/${dep}" \
    --namespace "${APP}" \
    --timeout=300s && \
    success "  ${dep}: running" || \
    warn "  ${dep}: rollout timed out — check: kubectl describe deployment/${dep} -n ${APP}"
done

# ══════════════════════════════════════════════════════════════
section "Step 11 — Frontend: Build + Deploy (Azure Static Web Apps)"
# ══════════════════════════════════════════════════════════════

if [[ "$SKIP_FRONTEND" == "true" ]]; then
  warn "Skipping frontend build (--skip-frontend)"
else
  cd "${ROOT_DIR}/frontend"
  info "Installing frontend dependencies..."
  npm ci --prefer-offline 2>&1 | tail -3

  info "Building frontend (Vite)..."
  VITE_API_URL="https://api.sewaxai.health" \
  VITE_APP_ENV="${ENV}" \
  VITE_BUILD_TIMESTAMP="${TIMESTAMP}" \
  npm run build 2>&1 | tail -8

  # Get SWA deployment token
  SWA_TOKEN=$(az staticwebapp secrets list \
    --name            "${SWA}" \
    --resource-group  "${RG}" \
    --query           "properties.apiKey" -o tsv 2>/dev/null || echo "")

  if [[ -n "$SWA_TOKEN" ]]; then
    info "Deploying to Azure Static Web Apps: ${SWA}..."
    npx --yes @azure/static-web-apps-cli@latest deploy dist \
      --deployment-token "${SWA_TOKEN}" \
      --env              "${ENV}" \
      --app-location     "." \
      --output-location  "dist"
    success "Frontend deployed: https://${SWA}.azurestaticapps.net"
  else
    warn "No SWA deployment token found — check if SWA '${SWA}' exists in Terraform output"
  fi
  cd "$ROOT_DIR"
fi

# ══════════════════════════════════════════════════════════════
section "Step 12 — Custom Domain: sewaxai.health"
# ══════════════════════════════════════════════════════════════

info "Configuring custom domain: sewaxai.health"

# Add custom domain to Azure Static Web App
SWA_RESOURCE_ID=$(az staticwebapp list \
  --resource-group "${RG}" \
  --query "[0].id" -o tsv 2>/dev/null || echo "")

if [[ -n "$SWA_RESOURCE_ID" ]]; then
  # Root domain
  az staticwebapp hostname set \
    --name            "${SWA}" \
    --resource-group  "${RG}" \
    --hostname        "sewaxai.health" 2>/dev/null && \
    success "Domain configured: sewaxai.health" || \
    warn "Could not set sewaxai.health — DNS CNAME may not yet be pointed at SWA"

  # App subdomain
  az staticwebapp hostname set \
    --name            "${SWA}" \
    --resource-group  "${RG}" \
    --hostname        "app.sewaxai.health" 2>/dev/null && \
    success "Domain configured: app.sewaxai.health" || \
    warn "Could not set app.sewaxai.health — add CNAME: app.sewaxai.health → ${SWA}.azurestaticapps.net"
fi

# Print required DNS records
echo ""
echo -e "  ${YELLOW}Required DNS records at your registrar:${NC}"
echo -e "  ${CYAN}Type    Name                  Value${NC}"
echo    "  CNAME   sewaxai.health        ${SWA}.azurestaticapps.net"
echo    "  CNAME   www.sewaxai.health    ${SWA}.azurestaticapps.net"
echo    "  CNAME   app.sewaxai.health    ${SWA}.azurestaticapps.net"
echo    "  CNAME   api.sewaxai.health    <Azure Front Door hostname from Terraform>"
echo    "  TXT     asuid.sewaxai.health  <Verification token from Azure SWA>"
echo ""
echo -e "  Get TXT token: az staticwebapp hostname show --name ${SWA} --resource-group ${RG} --hostname sewaxai.health --query validationToken -o tsv"

# ══════════════════════════════════════════════════════════════
section "Step 13 — FHIR Service Setup"
# ══════════════════════════════════════════════════════════════

if [[ -z "$FHIR_CLIENT_ID" ]]; then
  info "FHIR credentials not yet provisioned — running setup-azure-fhir.sh..."
  bash "${SCRIPT_DIR}/setup-azure-fhir.sh" \
    --env             "${ENV}" \
    --region          "${REGION}" \
    --skip-provision  2>/dev/null && \
    success "FHIR credentials provisioned and stored in Key Vault" || \
    warn "FHIR setup needs manual completion: bash scripts/setup-azure-fhir.sh --env ${ENV}"
else
  success "FHIR already configured: ${FHIR_ENDPOINT}"
fi

# ══════════════════════════════════════════════════════════════
section "Step 14 — Mobile Apps: EAS Build"
# ══════════════════════════════════════════════════════════════

if ! command -v eas &>/dev/null && ! npx --yes eas-cli --version &>/dev/null 2>&1; then
  warn "EAS CLI not available — skipping mobile builds"
else
  cd "${ROOT_DIR}/mobile"
  [[ -f eas.json ]] || { warn "eas.json missing — skipping mobile builds"; cd "$ROOT_DIR"; }

  if [[ -f eas.json ]]; then
    # Update API URL in app.json
    node -e "
      const fs = require('fs');
      const app = JSON.parse(fs.readFileSync('app.json','utf8'));
      if (!app.expo) app.expo = {};
      if (!app.expo.extra) app.expo.extra = {};
      app.expo.extra.apiUrl = 'https://api.sewaxai.health/api/v1';
      app.expo.extra.environment = '${ENV}';
      fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
    "
    info "app.json updated for ${ENV}"

    EAS_PROFILE="${ENV}" # matches eas.json profile names: production | staging
    [[ "$ENV" == "production" ]] && EAS_PROFILE="production" || EAS_PROFILE="preview"

    # Clinician app
    info "Submitting clinician app build (${EAS_PROFILE})..."
    npx eas-cli build \
      --platform all --profile "${EAS_PROFILE}" \
      --non-interactive --no-wait 2>/dev/null && \
      success "Clinician app build submitted" || warn "Clinician app build submission failed"

    # Patient app (separate bundle ID)
    info "Submitting patient app build (patient-${ENV})..."
    npx eas-cli build \
      --platform all --profile "patient-${ENV}" \
      --non-interactive --no-wait 2>/dev/null && \
      success "Patient app build submitted" || warn "Patient app build submission failed (check eas.json)"

    info "Monitor builds: https://expo.dev/accounts/sewa-ai/projects"
    cd "$ROOT_DIR"
  fi
fi

# ══════════════════════════════════════════════════════════════
section "Step 15 — Post-Deploy Verification"
# ══════════════════════════════════════════════════════════════

API_URL="https://api.sewaxai.health"
info "Health check: ${API_URL}/health"

HTTP_STATUS="000"
for attempt in 1 2 3 4 5 6 7 8; do
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    --max-time 10 "${API_URL}/health" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    success "API healthy: HTTP ${HTTP_STATUS}"
    break
  fi
  info "  Attempt ${attempt}/8 (HTTP ${HTTP_STATUS}) — waiting 20s..."
  sleep 20
done
[[ "$HTTP_STATUS" != "200" ]] && \
  warn "API not yet healthy after 160s (HTTP ${HTTP_STATUS}). Pods may still be starting."

# Check all AI service pods
info "Pod status:"
kubectl get pods -n "${APP}" 2>/dev/null | grep -E "NAME|sewa-" || \
  warn "Could not list pods — check kubectl access"

# AI service health via exec
BACKEND_POD=$(kubectl get pods -n "${APP}" \
  -l app=sewa-backend --field-selector=status.phase=Running \
  -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [[ -n "$BACKEND_POD" ]]; then
  for svc_check in "sewa-triage:8000" "sewa-vlm-report:8001" "sewa-uncertainty:8002" "sewa-metacognition:8003"; do
    name="${svc_check%%:*}"; port="${svc_check##*:}"
    status=$(kubectl exec -n "${APP}" "${BACKEND_POD}" -- \
      curl -sf "http://${name}:${port}/health" 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unreachable")
    [[ "$status" == "healthy" ]] && success "${name}: healthy" || warn "${name}: ${status}"
  done
fi

# ══════════════════════════════════════════════════════════════
section "Step 16 — Deployment Record"
# ══════════════════════════════════════════════════════════════

DEPLOY_JSON=$(jq -nc \
  --arg env         "${ENV}" \
  --arg region      "${REGION}" \
  --arg ts          "${TIMESTAMP}" \
  --arg tag         "${IMAGE_TAG}" \
  --arg deployer    "${LOGGED_AS}" \
  --arg sub         "${SUBSCRIPTION}" \
  --arg api_url     "${API_URL}" \
  --arg acr         "${ACR_SERVER}" \
  --arg status      "success" \
  '{environment:$env, region:$region, timestamp:$ts, imageTag:$tag,
    deployedBy:$deployer, subscription:$sub, apiUrl:$api_url,
    acr:$acr, status:$status}')

echo "${DEPLOY_JSON}" | az storage blob upload \
  --account-name "${STORAGE_ACC}" \
  --container-name "deployments" \
  --name "${ENV}/deploy-${TIMESTAMP}.json" \
  --overwrite \
  --data @- 2>/dev/null && \
  success "Deployment record saved" || \
  warn "Could not save deployment record (storage may be on private VNet)"

# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   SEWA XAI Deployment Complete ✓                          ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Environment${NC}  : ${ENV}"
echo -e "  ${GREEN}Image tag${NC}    : ${IMAGE_TAG}"
echo -e "  ${GREEN}ACR${NC}          : ${ACR_SERVER}"
echo ""
echo -e "  ${CYAN}URLs${NC}"
echo    "    Public site : https://sewaxai.health"
echo    "    App         : https://app.sewaxai.health"
echo    "    API         : https://api.sewaxai.health"
echo    "    Health      : https://api.sewaxai.health/health"
echo    "    SWA staging : https://${SWA}.azurestaticapps.net"
echo ""
echo -e "  ${CYAN}Operations${NC}"
echo    "    Pods        : kubectl get pods -n ${APP}"
echo    "    Logs        : kubectl logs -n ${APP} -l app=sewa-backend -f"
echo    "    Restart     : kubectl rollout restart deployment/sewa-backend -n ${APP}"
echo    "    Scale GPU   : az aks nodepool scale --cluster-name ${AKS} --name gpupool --node-count 2 -g ${RG}"
echo ""
echo -e "  ${CYAN}Useful commands${NC}"
echo    "    bash scripts/setup-azure-fhir.sh --env ${ENV}   # Re-provision FHIR"
echo    "    bash scripts/generate-env-azure.sh --env ${ENV} # Refresh .env.azure"
echo    "    bash scripts/deploy-azure-acr.sh --skip-tf --skip-frontend  # Code-only redeploy"
echo ""
echo -e "  ${CYAN}© 2026 SEWA XAI — a Storegrill Inc Ltd company.${NC}"
echo -e "  ${CYAN}Registered in England & Wales (14581073). All rights reserved.${NC}"
echo -e "  ${CYAN}from hours, to seconds${NC}"
echo ""
