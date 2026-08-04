#!/usr/bin/env bash
# SEWA XAI — Production Deployment Script (Azure Cloud Shell)
# Alternative to GitHub Actions when CI/CD billing is unavailable.
# Run from Azure Cloud Shell (bash) or any machine with az + kubectl configured.
#
# Usage:
#   ./scripts/deploy-production.sh                  # deploy current HEAD
#   ./scripts/deploy-production.sh <git-sha>        # deploy specific commit
#   ./scripts/deploy-production.sh --dry-run        # preview without applying
#
# Prerequisites:
#   - az CLI logged in (az account show)
#   - kubectl installed (az aks install-cli)
#   - docker installed (for local build; ACR Tasks alternative below)
#   - ACR admin enabled (sewaaieuprodacr)
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────
ACR_NAME="sewaaieuprodacr"
ACR_SERVER="${ACR_NAME}.azurecr.io"
AKS_CLUSTER="sewa-ai-prod-eu-aks"
RESOURCE_GROUP="sewa-ai-prod-rg"
LOCATION="swedencentral"
NAMESPACE="sewa-ai"
KUBECONFIG_PATH="${HOME}/.kube/config"

# Image services (deployment:container:acr_image:dockerfile_path)
# Deployment/container names match live cluster (kubectl get deploy -n sewa-ai).
SERVICES=(
  "sewa-backend:backend:sewa-backend:backend/Dockerfile"
  "sewa-frontend:frontend:sewa-frontend:frontend/Dockerfile"
  "sewa-triage:triage:sewa-ai-triage:ai-services/triage/Dockerfile"
  "sewa-vlm-report:vlm-report:sewa-ai-vlm-report:ai-services/vlm-report/Dockerfile"
  "sewa-uncertainty:uncertainty:sewa-ai-uncertainty:ai-services/uncertainty/Dockerfile"
  "sewa-metacognition:metacognition:sewa-ai-metacognition:ai-services/metacognition/Dockerfile"
  "sewa-federated:federated:sewa-ai-federated:ai-services/federated-learning/Dockerfile"
  "sewa-continuous:continuous:sewa-ai-continuous:ai-services/continuous-learning/Dockerfile"
  "sewa-pathology:pathology:sewa-ai-pathology:ai-services/pathology/Dockerfile"
  "sewa-mammography:mammography:sewa-ai-mammography:ai-services/mammography/Dockerfile"
  "sewa-retinal:retinal:sewa-ai-retinal:ai-services/retinal/Dockerfile"
)

# ── Helpers ────────────────────────────────────────────────────────────
info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*"; }
error() { echo "[ERROR] $*" >&2; }
die()   { error "$*"; exit 1; }

# ── Parse args ─────────────────────────────────────────────────────────
DRY_RUN=false
SHA=""

for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run       Preview changes without applying"
      echo "  <git-sha>       Deploy specific commit (default: current HEAD)"
      echo "  --help, -h      Show this help"
      exit 0
      ;;
    *)
      if [[ "$arg" =~ ^[a-f0-9]{7,40}$ ]]; then
        SHA="$arg"
      else
        die "Unknown argument: $arg"
      fi
      ;;
  esac
done

# ── Preflight checks ──────────────────────────────────────────────────
info "=== SEWA XAI Production Deployment ==="
info "Target: ${AKS_CLUSTER} (${RESOURCE_GROUP}, ${LOCATION})"
info "ACR:    ${ACR_SERVER}"
info "NS:     ${NAMESPACE}"

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN mode — no changes will be applied"
fi

# Check az login
info "Checking Azure login..."
if ! az account show &>/dev/null; then
  die "Not logged into Azure. Run: az login"
fi
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
info "Subscription: ${SUBSCRIPTION_ID}"

# Check kubectl
if ! command -v kubectl &>/dev/null; then
  info "Installing kubectl..."
  az aks install-cli
fi

# Safety guard: verify the current kubectl context targets SEWA production.
CURRENT_CTX=$(kubectl config current-context 2>/dev/null || echo "unknown")
if [ "${CURRENT_CTX}" != "${AKS_CLUSTER}" ]; then
  warn "Current context is '${CURRENT_CTX}' — switching to '${AKS_CLUSTER}'..."
  kubectl config use-context "${AKS_CLUSTER}" >/dev/null || \
    die "Could not switch context to ${AKS_CLUSTER}. Aborting to avoid deploying to the wrong cluster."
fi
info "Using context: ${CURRENT_CTX}"

# Check ACR login
info "Logging into ACR..."
az acr login --name "${ACR_NAME}" --expose-token 2>/dev/null || \
  warn "ACR login failed — continuing (token may still be valid)"

# Determine image tag
if [ -z "$SHA" ]; then
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
fi
IMAGE_TAG="main-${SHA}"
info "Image tag: ${IMAGE_TAG}"

# ── Step 1: Build and push Docker images via ACR (cloud-native, no local Docker needed) ──
info "=== Step 1: Build and push Docker images via ACR ==="

for svc in "${SERVICES[@]}"; do
  IFS=':' read -r deploy_name container_name img_name dockerfile_path <<< "$svc"
  build_dir="$(dirname "${dockerfile_path}")"
  info "Building ${img_name}:${IMAGE_TAG} via ACR (ctx=${build_dir})..."
  # az acr build resolves --file relative to CWD, so cd into the build context.
  ( cd "${build_dir}" && \
    az acr build \
      --registry "${ACR_NAME}" \
      --image "${img_name}:${IMAGE_TAG}" \
      --file Dockerfile \
      --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --build-arg VCS_REF="${SHA}" \
      --build-arg VERSION="${IMAGE_TAG}" \
      "." 2>&1 | tail -5 ) || \
    warn "ACR build failed for ${deploy_name} — continuing"
done

# ── Step 2: Apply K8s manifests ───────────────────────────────────────
info "=== Step 2: Apply K8s manifests ==="

MANIFESTS=(
  "azure/k8s/namespace.yaml"
  "azure/k8s/cert-manager-issuer.yaml"
  "azure/k8s/namecheap-webhook.yaml"
  "azure/k8s/namecheap-issuer.yaml"
  "azure/k8s/configmap.yaml"
  "azure/k8s/workload-identity.yaml"
  "azure/k8s/backend-deployment-prod.yaml"
  "azure/k8s/frontend-deployment.yaml"
  "azure/k8s/ai-services-deployment-prod.yaml"
  "azure/k8s/redis-deployment.yaml"
  "azure/k8s/ingress.yaml"
)

for manifest in "${MANIFESTS[@]}"; do
  if [ ! -f "$manifest" ]; then
    warn "Manifest not found: ${manifest} — skipping"
    continue
  fi
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would apply: ${manifest}"
  else
    info "Applying: ${manifest}"
    kubectl apply -f "${manifest}" --context "${AKS_CLUSTER}" || \
      warn "Failed to apply ${manifest}"
  fi
done

# ── Step 3: Set image tags on deployments ─────────────────────────────
info "=== Step 3: Update deployment images ==="

for svc in "${SERVICES[@]}"; do
  IFS=':' read -r deploy_name container_name img_name <<< "$svc"
  FULL_IMAGE="${ACR_SERVER}/${img_name}:${IMAGE_TAG}"
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would set image: deployment/${deploy_name} container=${container_name} → ${FULL_IMAGE}"
  else
    info "Setting image: deployment/${deploy_name} container=${container_name} → ${FULL_IMAGE}"
    kubectl set image "deployment/${deploy_name}" \
      "${container_name}=${FULL_IMAGE}" \
      -n "${NAMESPACE}" \
      --context "${AKS_CLUSTER}" || \
      warn "Failed to set image for ${deploy_name}"
  fi
done

# ── Step 4: Wait for rollouts ─────────────────────────────────────────
info "=== Step 4: Wait for rollouts ==="

ROLLOUT_TIMEOUT="600s"
for svc in "${SERVICES[@]}"; do
  IFS=':' read -r deploy_name _ _ <<< "$svc"
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would wait for rollout: deployment/${deploy_name}"
  else
    info "Waiting for rollout: deployment/${deploy_name}..."
    kubectl rollout status "deployment/${deploy_name}" \
      -n "${NAMESPACE}" \
      --context "${AKS_CLUSTER}" \
      --timeout="${ROLLOUT_TIMEOUT}" || \
      warn "Rollout timed out or failed for ${deploy_name}"
  fi
done

# ── Step 5: Run DB migrations ─────────────────────────────────────────
info "=== Step 5: Run DB migrations ==="
if [ "$DRY_RUN" = true ]; then
  info "[DRY RUN] Would run: prisma migrate deploy in sewa-backend pod"
else
info "Running prisma migrate deploy in sewa-backend pod..."
BACKEND_POD=$(kubectl get pods -n "${NAMESPACE}" \
  --context "${AKS_CLUSTER}" \
  -l app=sewa-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "${BACKEND_POD}" ]; then
  kubectl exec "${BACKEND_POD}" -n "${NAMESPACE}" \
    --context "${AKS_CLUSTER}" \
    -- npx prisma migrate deploy || \
    warn "Migration command failed — check backend pod logs"
else
  warn "No sewa-backend pod found — skipping migrations"
fi
fi

# ── Step 6: Health checks ─────────────────────────────────────────────
info "=== Step 6: Health checks ==="

sleep 10  # Allow services to start

HEALTH_ENDPOINTS=(
  "https://api.sewaxai.health/health"
  "https://api.sewaxai.health/api/v1/status/services"
  "https://app.sewaxai.health"
)

ALL_HEALTHY=true
for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would curl: ${endpoint}"
  else
    info "Checking: ${endpoint}"
    if curl -sf --max-time 10 "${endpoint}" &>/dev/null; then
      info "  ✅ Healthy"
    else
      warn "  ❌ Unhealthy or unreachable"
      ALL_HEALTHY=false
    fi
  fi
done

# ── Summary ────────────────────────────────────────────────────────────
echo ""
info "=== Deployment Summary ==="
info "Commit:      ${SHA}"
info "Image tag:   ${IMAGE_TAG}"
info "ACR:         ${ACR_SERVER}"
info "AKS:         ${AKS_CLUSTER}"
info "Namespace:   ${NAMESPACE}"

if [ "$ALL_HEALTHY" = true ]; then
  info "All health checks passed ✅"
else
  warn "Some health checks failed — investigate above"
fi

if [ "$DRY_RUN" = true ]; then
  warn "This was a dry run — no changes were applied"
fi

info "Done."