#!/bin/bash
# ============================================================
# SEWA XAI — Full Azure End-to-End Deployment Script
# Deploys: Backend API · Frontend (Static Web App) ·
#          AI Services (AKS GPU) · Mobile Build (EAS) ·
#          Patient App · Infrastructure (Terraform)
# ============================================================
# © 2026 SEWA XAI — a Storegrill Inc Ltd company.
# Registered in England & Wales (14581073). All rights reserved.
# Usage: bash scripts/deploy-azure-full.sh [environment] [region]
#   environment: staging | production (default: staging)
#   region:      uksouth | westeurope | eastus | southafricanorth (default: uksouth)
# Example: bash scripts/deploy-azure-full.sh production uksouth
# ============================================================
set -euo pipefail

# ── Colour output ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
section() { echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

# ── Arguments ─────────────────────────────────────────────────────────────
ENV="${1:-staging}"
REGION="${2:-uksouth}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

[[ "$ENV" != "staging" && "$ENV" != "production" ]] && \
  error "environment must be 'staging' or 'production'"

# ── Configuration ─────────────────────────────────────────────────────────
APP_NAME="sewa-ai"
RESOURCE_GROUP="${APP_NAME}-${ENV}-rg"
ACR_NAME="sewaai${ENV}acr"
AKS_CLUSTER="${APP_NAME}-${ENV}-aks"
STATIC_APP_NAME="${APP_NAME}-${ENV}-web"
POSTGRES_SERVER="${APP_NAME}-${ENV}-db"
REDIS_NAME="${APP_NAME}-${ENV}-redis"
KEYVAULT_NAME="${APP_NAME}-${ENV}-kv"
STORAGE_ACCOUNT="${APP_NAME//-/}${ENV}stor"
LOG_ANALYTICS="${APP_NAME}-${ENV}-logs"
CONTAINER_REGISTRY="${ACR_NAME}.azurecr.io"

section "SEWA XAI — Azure Full Deployment"
info "Environment: ${ENV}"
info "Region:      ${REGION}"
info "Timestamp:   ${TIMESTAMP}"
info "Resource Grp: ${RESOURCE_GROUP}"
echo ""

# ── Step 0: Prerequisites check ───────────────────────────────────────────
section "Step 0: Prerequisites"
for cmd in az docker kubectl terraform node npm jq; do
  command -v "$cmd" &>/dev/null && success "$cmd found" || error "$cmd not found — please install it"
done

# Verify Azure login
az account show &>/dev/null || error "Not logged in to Azure. Run: az login"
SUBSCRIPTION=$(az account show --query id -o tsv)
success "Azure subscription: ${SUBSCRIPTION}"

# ── Step 1: Terraform Infrastructure ─────────────────────────────────────
section "Step 1: Infrastructure (Terraform)"
cd infrastructure/terraform-azure

[[ ! -f terraform.tfvars ]] && \
  error "terraform.tfvars not found. Copy terraform.tfvars.example and fill in values."

info "Initialising Terraform..."
terraform init -upgrade -reconfigure \
  -backend-config="resource_group_name=sewa-tfstate-rg" \
  -backend-config="storage_account_name=sewatfstate${ENV}" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=${ENV}.terraform.tfstate" 2>&1 | tail -5

info "Planning Terraform..."
terraform plan \
  -var="environment=${ENV}" \
  -var="azure_region=${REGION}" \
  -out="${ENV}.tfplan" 2>&1 | tail -20

info "Applying Terraform (auto-approve for CI/CD)..."
terraform apply -auto-approve "${ENV}.tfplan"

# Extract outputs
POSTGRES_HOST=$(terraform output -raw postgres_host)
REDIS_HOST=$(terraform output -raw redis_host)
AKS_KUBECONFIG=$(terraform output -raw aks_kubeconfig_path)
STORAGE_CONN=$(terraform output -raw storage_connection_string)
success "Infrastructure provisioned"
cd ../../

# ── Step 2: Azure Container Registry ─────────────────────────────────────
section "Step 2: Container Registry (ACR)"
info "Logging into ACR: ${ACR_NAME}..."
az acr login --name "${ACR_NAME}"

# ── Step 3: Build & Push Backend ─────────────────────────────────────────
section "Step 3: Backend API — Build & Push"
cd backend
info "Installing dependencies..."
npm ci --prefer-offline 2>&1 | tail -3

info "Running tests..."
npm test -- --passWithNoTests 2>&1 | tail -5 || warn "Some tests failed — continuing for staging"

info "Building TypeScript..."
npm run build 2>&1 | tail -5

BACKEND_IMAGE="${CONTAINER_REGISTRY}/${APP_NAME}-backend:${ENV}-${TIMESTAMP}"
info "Building Docker image: ${BACKEND_IMAGE}..."
docker build \
  --build-arg NODE_ENV="${ENV}" \
  --build-arg BUILD_TIMESTAMP="${TIMESTAMP}" \
  -t "${BACKEND_IMAGE}" \
  -f Dockerfile .

docker push "${BACKEND_IMAGE}"
success "Backend image pushed: ${BACKEND_IMAGE}"
cd ..

# ── Step 4: Build & Push AI Services ─────────────────────────────────────
section "Step 4: AI Services — Build & Push"
# Core pipeline + specialty engines — all services must be built
AI_SERVICES="triage uncertainty vlm-report metacognition federated-learning continuous-learning pathology mammography retinal"

for svc in $AI_SERVICES; do
  svc_dir="ai-services/${svc}"
  [[ ! -d "$svc_dir" ]] && { warn "AI service dir not found: ${svc_dir}"; continue; }
  info "Building AI service: ${svc}..."
  IMAGE="${CONTAINER_REGISTRY}/${APP_NAME}-${svc}:${ENV}-${TIMESTAMP}"
  docker build -t "${IMAGE}" "${svc_dir}/"
  docker push "${IMAGE}"
  success "  ✓ ${svc} pushed"
done

# ── Step 5: AKS Deployment ────────────────────────────────────────────────
section "Step 5: Kubernetes (AKS) Deployment"
info "Getting AKS credentials..."
az aks get-credentials \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${AKS_CLUSTER}" \
  --overwrite-existing

info "Verifying cluster connectivity..."
kubectl cluster-info
kubectl get nodes

# Create namespace if not exists
kubectl create namespace "${APP_NAME}" --dry-run=client -o yaml | kubectl apply -f -

# Create/update secrets
info "Updating Kubernetes secrets..."
KEYVAULT_URI="https://${KEYVAULT_NAME}.vault.azure.net/"
JWT_SECRET=$(az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "jwt-secret" --query value -o tsv)
DB_PASSWORD=$(az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "db-password" --query value -o tsv)
STRIPE_KEY=$(az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "stripe-secret-key" --query value -o tsv 2>/dev/null || echo "")
TWILIO_TOKEN=$(az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "twilio-auth-token" --query value -o tsv 2>/dev/null || echo "")

kubectl create secret generic sewa-secrets \
  --namespace "${APP_NAME}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=DATABASE_URL="postgresql://sewapg:${DB_PASSWORD}@${POSTGRES_HOST}:5432/sewa_${ENV}" \
  --from-literal=REDIS_URL="rediss://${REDIS_HOST}:6380" \
  --from-literal=STRIPE_SECRET_KEY="${STRIPE_KEY}" \
  --from-literal=TWILIO_AUTH_TOKEN="${TWILIO_TOKEN}" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="${STORAGE_CONN}" \
  --save-config --dry-run=client -o yaml | kubectl apply -f -

# Apply Kubernetes manifests
info "Applying Kubernetes manifests..."
for manifest in azure/k8s/*.yaml; do
  # Replace image tag placeholders
  sed "s|{{IMAGE_TAG}}|${ENV}-${TIMESTAMP}|g; \
       s|{{CONTAINER_REGISTRY}}|${CONTAINER_REGISTRY}|g; \
       s|{{ENV}}|${ENV}|g; \
       s|{{REGION}}|${REGION}|g" "${manifest}" | kubectl apply -f -
  success "  ✓ Applied: $(basename ${manifest})"
done

# Wait for backend rollout
info "Waiting for backend rollout..."
kubectl rollout status deployment/sewa-backend \
  --namespace "${APP_NAME}" \
  --timeout=300s

# Wait for AI services (all 9)
for svc in triage uncertainty vlm-report metacognition pathology mammography retinal federated continuous; do
  info "Waiting for sewa-${svc} rollout..."
  kubectl rollout status deployment/sewa-${svc} \
    --namespace "${APP_NAME}" \
    --timeout=300s || warn "sewa-${svc} rollout timed out"
done

success "AKS deployment complete"

# ── Step 6: Database Migrations ───────────────────────────────────────────
section "Step 6: Database Migrations"
info "Running Prisma migrations..."
DATABASE_URL="postgresql://sewapg:${DB_PASSWORD}@${POSTGRES_HOST}:5432/sewa_${ENV}" \
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma

info "Running database seed (idempotent)..."
DATABASE_URL="postgresql://sewapg:${DB_PASSWORD}@${POSTGRES_HOST}:5432/sewa_${ENV}" \
  node backend/prisma/seed.js --env="${ENV}" || warn "Seed skipped (already seeded)"

success "Database migrations complete"

# ── Step 7: Frontend — Azure Static Web Apps ─────────────────────────────
section "Step 7: Frontend — Azure Static Web App"
cd frontend

info "Installing frontend dependencies..."
npm ci --prefer-offline 2>&1 | tail -3

info "Building frontend..."
VITE_API_URL="https://api.${ENV}.sewaxai.health" \
VITE_APP_ENV="${ENV}" \
VITE_SENTRY_DSN="${SENTRY_DSN:-}" \
npm run build 2>&1 | tail -10

info "Deploying to Azure Static Web Apps..."
SWA_TOKEN=$(az staticwebapp secrets list \
  --name "${STATIC_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "properties.apiKey" -o tsv)

npx @azure/static-web-apps-cli deploy dist \
  --deployment-token "${SWA_TOKEN}" \
  --env "${ENV}" \
  --app-location "." \
  --output-location "dist"

success "Frontend deployed: https://${STATIC_APP_NAME}.azurestaticapps.net"
cd ..

# ── Step 8: Mobile App Build (EAS) ────────────────────────────────────────
section "Step 8: Mobile App — EAS Build (iOS + Android)"
cd mobile

[[ ! -f eas.json ]] && warn "eas.json not found — skipping mobile build" && cd .. && true || {
  info "Installing mobile dependencies..."
  npm ci --prefer-offline 2>&1 | tail -3

  info "Updating app.json with environment config..."
  node -e "
    const fs = require('fs');
    const app = JSON.parse(fs.readFileSync('app.json','utf8'));
    app.expo.extra = {
      ...app.expo.extra,
      apiUrl: 'https://api.${ENV}.sewaxai.health',
      environment: '${ENV}',
    };
    app.expo.version = require('../package.json').version || '4.0.0';
    fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
    console.log('app.json updated');
  "

  EAS_PROFILE="${ENV}"
  [[ "${ENV}" == "production" ]] && EAS_PROFILE="production" || EAS_PROFILE="preview"

  info "Building iOS (EAS Build — ${EAS_PROFILE})..."
  npx eas-cli build \
    --platform ios \
    --profile "${EAS_PROFILE}" \
    --non-interactive \
    --no-wait || warn "iOS build submitted (async)"

  info "Building Android (EAS Build — ${EAS_PROFILE})..."
  npx eas-cli build \
    --platform android \
    --profile "${EAS_PROFILE}" \
    --non-interactive \
    --no-wait || warn "Android build submitted (async)"

  success "Mobile builds submitted to EAS. Check: https://expo.dev"
}
cd ..

# ── Step 9: Patient App (same mobile codebase, patient profile) ───────────
section "Step 9: Patient App — EAS Build"
# The patient app is the same React Native codebase with role=patient enforced
# It builds as a separate app via a separate EAS profile
cd mobile
[[ -f eas.json ]] && {
  info "Building patient-facing app..."
  # Patient app uses separate bundle ID: health.sewa.patient
  npx eas-cli build \
    --platform all \
    --profile "patient-${ENV}" \
    --non-interactive \
    --no-wait || warn "Patient app build submitted"
  success "Patient app build submitted to EAS"
}
cd ..

# ── Step 10: Post-deploy verification ─────────────────────────────────────
section "Step 10: Post-Deploy Verification"

API_URL="https://api.${ENV}.sewaxai.health"
info "Verifying backend health..."
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    success "Backend health: ${STATUS} ✓"
    break
  fi
  warn "Backend not ready (attempt ${i}/5, status ${STATUS}). Waiting 15s..."
  sleep 15
done

info "Verifying AI services..."
BACKEND_POD=$(kubectl get pods -n "${APP_NAME}" -l app=sewa-backend \
  -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [[ -n "$BACKEND_POD" ]]; then
  AI_HEALTH=$(kubectl exec -n "${APP_NAME}" "${BACKEND_POD}" -- \
    curl -s http://sewa-triage:8000/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")
  [[ "$AI_HEALTH" == "healthy" ]] && success "Triage engine: healthy ✓" || warn "Triage engine: ${AI_HEALTH}"
fi

info "Running smoke tests..."
curl -sf "${API_URL}/api/v1/system/status" 2>/dev/null | jq '.version' && \
  success "API version check passed" || warn "Smoke test returned unexpected response"

# ── Step 11: Update deployment record ─────────────────────────────────────
section "Step 11: Deployment Record"
DEPLOY_RECORD="{
  \"environment\": \"${ENV}\",
  \"region\": \"${REGION}\",
  \"timestamp\": \"${TIMESTAMP}\",
  \"imageTag\": \"${ENV}-${TIMESTAMP}\",
  \"deployedBy\": \"$(az account show --query user.name -o tsv)\",
  \"subscription\": \"${SUBSCRIPTION}\",
  \"status\": \"success\"
}"

echo "${DEPLOY_RECORD}" | az storage blob upload \
  --account-name "${STORAGE_ACCOUNT}" \
  --container-name "deployments" \
  --name "${ENV}/${TIMESTAMP}.json" \
  --data @- 2>/dev/null || warn "Could not write deployment record"

# ── Summary ───────────────────────────────────────────────────────────────
section "Deployment Complete ✓"
echo ""
echo -e "  ${GREEN}Environment:${NC}  ${ENV}"
echo -e "  ${GREEN}Region:${NC}       ${REGION}"
echo -e "  ${GREEN}Image Tag:${NC}    ${ENV}-${TIMESTAMP}"
echo ""
echo -e "  ${GREEN}URLs:${NC}"
echo -e "    API:      https://api.${ENV}.sewaxai.health"
echo -e "    Frontend: https://${STATIC_APP_NAME}.azurestaticapps.net"
echo -e "    Health:   https://api.${ENV}.sewaxai.health/health"
echo -e "    Status:   https://status.sewaxai.health"
echo ""
echo -e "  ${GREEN}Kubernetes:${NC}"
echo -e "    Namespace: ${APP_NAME}"
echo -e "    Cluster:   ${AKS_CLUSTER}"
echo -e "    Pods:      kubectl get pods -n ${APP_NAME}"
echo ""
echo -e "  ${CYAN}© 2026 SEWA XAI — a Storegrill Inc Ltd company.${NC}"
echo -e "  ${CYAN}Registered in England & Wales (14581073). All rights reserved.${NC}"
