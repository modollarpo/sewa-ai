#!/usr/bin/env bash
# SEWA XAI — scripts/deploy.sh
# Master deployment orchestrator for Azure | AWS | GCP | all
#
# Usage:
#   bash scripts/deploy.sh azure          # deploy to Azure AKS
#   bash scripts/deploy.sh aws            # deploy to AWS EKS
#   bash scripts/deploy.sh gcp            # deploy to GCP GKE
#   bash scripts/deploy.sh all            # deploy to all three
#   bash scripts/deploy.sh azure --build  # build images first then deploy

set -euo pipefail

# ── Colours ────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[SEWA]${NC} $*"; }
success() { echo -e "${GREEN}[SEWA ✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[SEWA !]${NC} $*"; }
error()   { echo -e "${RED}[SEWA ✗]${NC} $*"; exit 1; }

TARGET="${1:-help}"
BUILD=false
[[ "${2:-}" == "--build" ]] && BUILD=true

# ── Config ─────────────────────────────────────────────────────
IMAGE_TAG="${IMAGE_TAG:-main-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')}"
SERVICES="backend frontend ai-triage ai-vlm ai-uncertainty ai-metacognition ai-federated ai-continuous"
K8S_NAMESPACE="sewa-ai"

# ── Azure config ───────────────────────────────────────────────
AZURE_RG="${AZURE_RG:-sewa-ai-prod-rg}"
AZURE_CLUSTER="${AZURE_CLUSTER:-sewa-ai-prod-aks}"
AZURE_REGISTRY="${AZURE_REGISTRY:-sewaairegistry.azurecr.io}"

# ── AWS config ─────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_CLUSTER="${AWS_CLUSTER:-sewa-ai-prod-eks}"
AWS_ECR_REGISTRY="${AWS_ECR_REGISTRY:-}"  # set to your ECR URI

# ── GCP config ─────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:-}"            # set to your GCP project ID
GCP_REGION="${GCP_REGION:-europe-west2}"
GCP_CLUSTER="${GCP_CLUSTER:-sewa-ai-prod-gke}"
GCP_REGISTRY="${GCP_REGISTRY:-europe-west2-docker.pkg.dev/${GCP_PROJECT}/sewa}"

# ══════════════════════════════════════════════════════════════
# BUILD IMAGES
# ══════════════════════════════════════════════════════════════
build_images() {
  info "Building Docker images (tag: ${IMAGE_TAG})…"

  for svc in $SERVICES; do
    local context dockerfile
    case $svc in
      backend)         context="backend";                         dockerfile="backend/Dockerfile" ;;
      frontend)        context="frontend";                        dockerfile="frontend/Dockerfile" ;;
      ai-triage)       context="ai-services/triage";              dockerfile="ai-services/triage/Dockerfile" ;;
      ai-vlm)          context="ai-services/vlm-report";          dockerfile="ai-services/vlm-report/Dockerfile" ;;
      ai-uncertainty)  context="ai-services/uncertainty";         dockerfile="ai-services/uncertainty/Dockerfile" ;;
      ai-metacognition)context="ai-services/metacognition";       dockerfile="ai-services/metacognition/Dockerfile" ;;
      ai-federated)    context="ai-services/federated-learning";  dockerfile="ai-services/federated-learning/Dockerfile" ;;
      ai-continuous)   context="ai-services/continuous-learning"; dockerfile="ai-services/continuous-learning/Dockerfile" ;;
    esac

    info "  Building sewa-${svc}…"
    docker build \
      --file "$dockerfile" \
      --tag "sewa-${svc}:${IMAGE_TAG}" \
      --tag "sewa-${svc}:latest" \
      --cache-from "sewa-${svc}:latest" \
      "$context"
  done

  success "All images built"
}

# ══════════════════════════════════════════════════════════════
# AZURE DEPLOYMENT
# ══════════════════════════════════════════════════════════════
deploy_azure() {
  info "═══ Deploying to Azure AKS (${AZURE_CLUSTER}) ═══"

  # Prerequisites
  command -v az    >/dev/null || error "Azure CLI not installed"
  command -v kubectl >/dev/null || error "kubectl not installed"

  # Login
  if ! az account show &>/dev/null; then
    warn "Not logged in to Azure. Running az login…"
    az login
  fi

  # Push images to ACR
  info "Logging in to Azure Container Registry…"
  az acr login --name "${AZURE_REGISTRY%%.*}"

  for svc in $SERVICES; do
    info "  Pushing sewa-${svc}:${IMAGE_TAG} to ACR…"
    docker tag "sewa-${svc}:${IMAGE_TAG}" "${AZURE_REGISTRY}/sewa-${svc}:${IMAGE_TAG}"
    docker push "${AZURE_REGISTRY}/sewa-${svc}:${IMAGE_TAG}"
  done

  # Get kubeconfig
  info "Getting AKS credentials…"
  az aks get-credentials --resource-group "$AZURE_RG" --name "$AZURE_CLUSTER" --overwrite-existing

  # Apply namespace
  kubectl get namespace "$K8S_NAMESPACE" &>/dev/null || kubectl create namespace "$K8S_NAMESPACE"

  # Apply base manifests
  kubectl apply -f infrastructure/kubernetes/deployment.yaml

  # Rolling update — set image for each service
  for svc in $SERVICES; do
    info "  Updating sewa-${svc} to ${IMAGE_TAG}…"
    kubectl set image "deployment/sewa-${svc}" \
      "sewa-${svc}=${AZURE_REGISTRY}/sewa-${svc}:${IMAGE_TAG}" \
      -n "$K8S_NAMESPACE" 2>/dev/null || \
    warn "  Deployment sewa-${svc} not found — skipping image update"
  done

  # Wait for rollout
  info "Waiting for rollout…"
  kubectl rollout status deployment/sewa-backend   -n "$K8S_NAMESPACE" --timeout=600s
  kubectl rollout status deployment/sewa-frontend  -n "$K8S_NAMESPACE" --timeout=300s

  # Run migrations
  info "Running Prisma migrations…"
  kubectl exec -n "$K8S_NAMESPACE" \
    "$(kubectl get pod -n "$K8S_NAMESPACE" -l app=sewa-backend -o jsonpath='{.items[0].metadata.name}')" \
    -- npx prisma migrate deploy || warn "Migration failed — check manually"

  success "Azure deployment complete ✓"
}

# ══════════════════════════════════════════════════════════════
# AWS DEPLOYMENT
# ══════════════════════════════════════════════════════════════
deploy_aws() {
  info "═══ Deploying to AWS EKS (${AWS_CLUSTER}) ═══"

  command -v aws     >/dev/null || error "AWS CLI not installed"
  command -v kubectl >/dev/null || error "kubectl not installed"

  if [[ -z "$AWS_ECR_REGISTRY" ]]; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    info "ECR registry: ${AWS_ECR_REGISTRY}"
  fi

  # Authenticate to ECR
  info "Authenticating to ECR…"
  aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$AWS_ECR_REGISTRY"

  # Create ECR repos if needed
  for svc in $SERVICES; do
    aws ecr describe-repositories --repository-names "sewa-${svc}" --region "$AWS_REGION" &>/dev/null || \
      aws ecr create-repository --repository-name "sewa-${svc}" --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 &>/dev/null
  done

  # Push images
  for svc in $SERVICES; do
    info "  Pushing sewa-${svc}:${IMAGE_TAG} to ECR…"
    docker tag "sewa-${svc}:${IMAGE_TAG}" "${AWS_ECR_REGISTRY}/sewa-${svc}:${IMAGE_TAG}"
    docker push "${AWS_ECR_REGISTRY}/sewa-${svc}:${IMAGE_TAG}"
  done

  # Get kubeconfig
  info "Getting EKS credentials…"
  aws eks update-kubeconfig --name "$AWS_CLUSTER" --region "$AWS_REGION"

  kubectl get namespace "$K8S_NAMESPACE" &>/dev/null || kubectl create namespace "$K8S_NAMESPACE"

  # Rolling update
  for svc in $SERVICES; do
    info "  Updating sewa-${svc}…"
    kubectl set image "deployment/sewa-${svc}" \
      "sewa-${svc}=${AWS_ECR_REGISTRY}/sewa-${svc}:${IMAGE_TAG}" \
      -n "$K8S_NAMESPACE" 2>/dev/null || warn "  sewa-${svc} not found"
  done

  kubectl rollout status deployment/sewa-backend  -n "$K8S_NAMESPACE" --timeout=600s
  kubectl rollout status deployment/sewa-frontend -n "$K8S_NAMESPACE" --timeout=300s

  success "AWS deployment complete ✓"
}

# ══════════════════════════════════════════════════════════════
# GCP DEPLOYMENT
# ══════════════════════════════════════════════════════════════
deploy_gcp() {
  info "═══ Deploying to GCP GKE (${GCP_CLUSTER}) ═══"

  command -v gcloud  >/dev/null || error "gcloud CLI not installed"
  command -v kubectl >/dev/null || error "kubectl not installed"

  [[ -z "$GCP_PROJECT" ]] && error "GCP_PROJECT environment variable not set"

  # Configure docker auth
  info "Configuring Docker auth for Artifact Registry…"
  gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

  # Ensure Artifact Registry repo exists
  gcloud artifacts repositories describe sewa \
    --location="$GCP_REGION" --project="$GCP_PROJECT" &>/dev/null || \
  gcloud artifacts repositories create sewa \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --project="$GCP_PROJECT" \
    --description="SEWA XAI containers"

  # Push images
  local gar="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/sewa"
  for svc in $SERVICES; do
    info "  Pushing sewa-${svc}:${IMAGE_TAG} to GAR…"
    docker tag "sewa-${svc}:${IMAGE_TAG}" "${gar}/sewa-${svc}:${IMAGE_TAG}"
    docker push "${gar}/sewa-${svc}:${IMAGE_TAG}"
  done

  # Get kubeconfig
  info "Getting GKE credentials…"
  gcloud container clusters get-credentials "$GCP_CLUSTER" \
    --region "$GCP_REGION" --project "$GCP_PROJECT"

  kubectl get namespace "$K8S_NAMESPACE" &>/dev/null || kubectl create namespace "$K8S_NAMESPACE"

  # Rolling update
  for svc in $SERVICES; do
    info "  Updating sewa-${svc}…"
    kubectl set image "deployment/sewa-${svc}" \
      "sewa-${svc}=${gar}/sewa-${svc}:${IMAGE_TAG}" \
      -n "$K8S_NAMESPACE" 2>/dev/null || warn "  sewa-${svc} not found"
  done

  kubectl rollout status deployment/sewa-backend  -n "$K8S_NAMESPACE" --timeout=600s
  kubectl rollout status deployment/sewa-frontend -n "$K8S_NAMESPACE" --timeout=300s

  success "GCP deployment complete ✓"
}

# ══════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════
health_check() {
  local url="${1}"
  info "Health check: ${url}…"
  local max_attempts=20
  local attempt=0
  while [[ $attempt -lt $max_attempts ]]; do
    if curl -sf "${url}/health" &>/dev/null; then
      success "Health check passed: ${url}"
      return 0
    fi
    attempt=$((attempt+1))
    warn "  Attempt ${attempt}/${max_attempts} — waiting 15s…"
    sleep 15
  done
  error "Health check failed after ${max_attempts} attempts: ${url}"
}

# ══════════════════════════════════════════════════════════════
# HELP
# ══════════════════════════════════════════════════════════════
show_help() {
  echo ""
  echo -e "${CYAN}SEWA XAI — Deployment Script${NC}"
  echo ""
  echo "Usage:"
  echo "  bash scripts/deploy.sh <target> [--build]"
  echo ""
  echo "Targets:"
  echo "  azure    Deploy to Azure AKS"
  echo "  aws      Deploy to AWS EKS"
  echo "  gcp      Deploy to GCP GKE (Autopilot)"
  echo "  all      Deploy to all three clouds"
  echo ""
  echo "Flags:"
  echo "  --build  Build Docker images before deploying"
  echo ""
  echo "Env vars:"
  echo "  IMAGE_TAG         Docker image tag (default: git short SHA)"
  echo "  AZURE_RG          Azure Resource Group"
  echo "  AZURE_CLUSTER     AKS cluster name"
  echo "  AZURE_REGISTRY    ACR login server"
  echo "  AWS_REGION        AWS region (default: us-east-1)"
  echo "  AWS_CLUSTER       EKS cluster name"
  echo "  GCP_PROJECT       GCP project ID (required for GCP)"
  echo "  GCP_CLUSTER       GKE cluster name"
  echo "  GCP_REGION        GCP region (default: europe-west2)"
  echo ""
  echo "Examples:"
  echo "  IMAGE_TAG=v2.5.0 bash scripts/deploy.sh azure"
  echo "  bash scripts/deploy.sh all --build"
  echo ""
}

# ══════════════════════════════════════════════════════════════
# ENTRYPOINT
# ══════════════════════════════════════════════════════════════
info "SEWA XAI Deployment | Target: ${TARGET} | Tag: ${IMAGE_TAG}"

[[ "$BUILD" == "true" ]] && build_images

case "$TARGET" in
  azure) deploy_azure ;;
  aws)   deploy_aws ;;
  gcp)   deploy_gcp ;;
  all)
    deploy_azure &
    PID_AZURE=$!
    deploy_aws &
    PID_AWS=$!
    deploy_gcp &
    PID_GCP=$!
    wait $PID_AZURE && success "Azure: done" || warn "Azure: failed"
    wait $PID_AWS   && success "AWS: done"   || warn "AWS: failed"
    wait $PID_GCP   && success "GCP: done"   || warn "GCP: failed"
    ;;
  help|--help|-h) show_help ;;
  *) error "Unknown target: ${TARGET}. Run: bash scripts/deploy.sh help" ;;
esac

success "Deployment script finished."
