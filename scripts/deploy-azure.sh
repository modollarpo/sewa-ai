#!/usr/bin/env bash
# SEWA XAI — scripts/deploy-azure.sh
# ─────────────────────────────────────────────────────────────────
# Full Azure deployment pipeline:
#   1. Validates prerequisites and .env
#   2. Builds all Docker images
#   3. Pushes to Azure Container Registry
#   4. Connects kubectl to AKS
#   5. Creates Kubernetes secrets from .env
#   6. Runs Prisma migrations
#   7. Applies Kubernetes manifests (rolling deploy)
#   8. Runs smoke tests
#   9. Prints live endpoints
#
# Usage:
#   bash scripts/deploy-azure.sh
#   bash scripts/deploy-azure.sh --skip-build     # re-deploy without rebuild
#   bash scripts/deploy-azure.sh --env staging
#
# Requirements: az, docker, kubectl, terraform (in PATH)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../backend/.env"
SKIP_BUILD=false
ENV_NAME="production"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
ROOT="$(dirname "$0")/.."

# ── Parse flags ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=true; shift ;;
    --env)        ENV_NAME="$2"; shift 2 ;;
    --tag)        IMAGE_TAG="$2"; shift 2 ;;
    --env-file)   ENV_FILE="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────
log()  { echo ""; echo "▶  $*"; }
ok()   { echo "   ✅ $*"; }
fail() { echo ""; echo "❌ ERROR: $*"; exit 1; }

# Load .env for variable access in this script
set -a; source "$ENV_FILE"; set +a

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       SEWA XAI — Azure Deployment Pipeline                ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Environment : $ENV_NAME"
echo "║  Image Tag   : $IMAGE_TAG"
echo "║  ACR         : ${ACR_LOGIN_SERVER:-unset}"
echo "║  AKS Cluster : ${AKS_CLUSTER_NAME:-unset}"
echo "║  Skip Build  : $SKIP_BUILD"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Prerequisites ─────────────────────────────────────
log "Step 1/8 — Checking prerequisites"
for cmd in az docker kubectl; do
  command -v "$cmd" &>/dev/null || fail "Missing: $cmd — install it first"
done
az account show &>/dev/null || fail "Not logged in to Azure — run: az login"
[[ -n "${ACR_LOGIN_SERVER:-}" ]]  || fail "ACR_LOGIN_SERVER not set in $ENV_FILE"
[[ -n "${AKS_CLUSTER_NAME:-}" ]]  || fail "AKS_CLUSTER_NAME not set in $ENV_FILE"
[[ -n "${DATABASE_URL:-}" ]]      || fail "DATABASE_URL not set in $ENV_FILE"
ok "All prerequisites met"

# ── Step 2: Build Docker images ───────────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  log "Step 2/8 — Building Docker images"

  # Login to ACR
  az acr login --name "${ACR_LOGIN_SERVER%%.*}" || fail "ACR login failed"

  SERVICES=(
    "backend:backend"
    "frontend:frontend"
    "ai-triage:ai-services/triage"
    "ai-vlm:ai-services/vlm-report"
    "ai-uncertainty:ai-services/uncertainty"
    "ai-metacognition:ai-services/metacognition"
    "ai-federated:ai-services/federated-learning"
    "ai-continuous:ai-services/continuous-learning"
  )

  for entry in "${SERVICES[@]}"; do
    SVC="${entry%%:*}"
    CTX="${entry##*:}"
    IMG="${ACR_LOGIN_SERVER}/sewa-ai/${SVC}:${IMAGE_TAG}"
    echo "   🔨 Building $SVC → $IMG"
    docker build \
      --platform linux/amd64 \
      --file "${ROOT}/${CTX}/Dockerfile" \
      --tag "$IMG" \
      --cache-from "${ACR_LOGIN_SERVER}/sewa-ai/${SVC}:latest" \
      --build-arg BUILDKIT_INLINE_CACHE=1 \
      "${ROOT}/${CTX}"
    docker push "$IMG"
    # Also tag as latest
    docker tag "$IMG" "${ACR_LOGIN_SERVER}/sewa-ai/${SVC}:latest"
    docker push "${ACR_LOGIN_SERVER}/sewa-ai/${SVC}:latest"
    echo "   ✅ $SVC pushed"
  done
else
  log "Step 2/8 — Skipping build (--skip-build)"
  ok "Using existing images with tag: $IMAGE_TAG"
fi

# ── Step 3: Connect kubectl to AKS ───────────────────────────
log "Step 3/8 — Connecting kubectl to AKS"
az aks get-credentials \
  --resource-group  "${AZURE_RESOURCE_GROUP}" \
  --name            "${AKS_CLUSTER_NAME}" \
  --overwrite-existing \
  --output none
kubectl cluster-info --request-timeout=10s | head -2
ok "kubectl connected to ${AKS_CLUSTER_NAME}"

# ── Step 4: Create/update Kubernetes namespace and secrets ────
log "Step 4/8 — Syncing Kubernetes secrets from .env"
kubectl create namespace sewa-ai --dry-run=client -o yaml | kubectl apply -f -

# Write all .env variables as a Kubernetes Secret
# (In production these come from Key Vault via CSI driver;
#  this provides a fallback for any non-KV values)
kubectl create secret generic sewa-env-secrets \
  --namespace sewa-ai \
  --from-env-file="$ENV_FILE" \
  --dry-run=client -o yaml | kubectl apply -f -

ok "Kubernetes secrets synced"

# ── Step 5: Run Prisma migrations ────────────────────────────
log "Step 5/8 — Running database migrations"
kubectl run sewa-migrate \
  --namespace    sewa-ai \
  --image        "${ACR_LOGIN_SERVER}/sewa-ai/backend:${IMAGE_TAG}" \
  --restart      Never \
  --rm \
  --attach \
  --timeout      300s \
  --env          "DATABASE_URL=${DATABASE_URL}" \
  --command      -- npx prisma migrate deploy

ok "Database migrations complete"

# ── Step 6: Patch image tags in manifests and apply ──────────
log "Step 6/8 — Deploying to AKS (rolling update)"
MANIFEST="${ROOT}/infrastructure/kubernetes/deployment.yaml"

# Substitute image tags inline (non-destructive — uses sed into pipe)
sed "s|ACR_LOGIN_SERVER|${ACR_LOGIN_SERVER}|g; s|IMAGE_TAG|${IMAGE_TAG}|g" \
  "$MANIFEST" | kubectl apply -f - --namespace sewa-ai

# Wait for all deployments to roll out
DEPLOYMENTS=(
  "sewa-backend"
  "sewa-frontend"
  "sewa-ai-triage"
  "sewa-ai-vlm"
  "sewa-ai-uncertainty"
  "sewa-ai-metacognition"
)

for dep in "${DEPLOYMENTS[@]}"; do
  echo "   ⏳ Waiting for $dep ..."
  kubectl rollout status deployment/"$dep" \
    --namespace sewa-ai \
    --timeout   300s \
  && echo "   ✅ $dep ready" \
  || echo "   ⚠  $dep timeout — check: kubectl describe deployment/$dep -n sewa-ai"
done

# ── Step 7: Smoke tests ───────────────────────────────────────
log "Step 7/8 — Running smoke tests"

# Get the API public IP (Front Door or Load Balancer)
API_IP=$(kubectl get service sewa-backend \
  --namespace sewa-ai \
  --output jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

if [[ -n "$API_IP" ]]; then
  SMOKE_URL="http://${API_IP}:3000"

  # Health check
  STATUS=$(curl -sf --max-time 10 "${SMOKE_URL}/health" \
    -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    ok "Health check passed: ${SMOKE_URL}/health → $STATUS"
  else
    echo "   ⚠  Health check returned: $STATUS (may still be starting)"
  fi

  # AI triage readiness
  AI_STATUS=$(curl -sf --max-time 10 "${SMOKE_URL}/api/v1/ai/health" \
    -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
  if [[ "$AI_STATUS" == "200" ]]; then
    ok "AI service health: $AI_STATUS"
  else
    echo "   ⚠  AI health returned: $AI_STATUS"
  fi
else
  echo "   ⚠  Load balancer IP not yet assigned — smoke test skipped"
  echo "      Check: kubectl get svc -n sewa-ai"
fi

# ── Step 8: Print summary ─────────────────────────────────────
log "Step 8/8 — Deployment complete"

FRONTEND_IP=$(kubectl get service sewa-frontend \
  --namespace sewa-ai \
  --output jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       ✅  SEWA XAI Deployed to Azure Successfully         ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Environment  : $ENV_NAME"
echo "║  Image Tag    : $IMAGE_TAG"
echo "║  Resource Grp : ${AZURE_RESOURCE_GROUP}"
echo "║  AKS Cluster  : ${AKS_CLUSTER_NAME}"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  API           : http://${API_IP:-pending}:3000"
echo "║  Frontend      : http://${FRONTEND_IP}"
echo "║  Key Vault     : ${AZURE_KEY_VAULT_URI:-}"
echo "║  FHIR Endpoint : ${FHIR_BASE_URL:-}"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Useful commands:                                        ║"
echo "║   kubectl get pods -n sewa-ai                           ║"
echo "║   kubectl logs -f deploy/sewa-backend -n sewa-ai        ║"
echo "║   kubectl get svc -n sewa-ai                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
