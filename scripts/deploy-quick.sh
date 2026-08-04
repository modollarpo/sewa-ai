#!/usr/bin/env bash
# SEWA XAI — Quick Production Deploy (image tag update only)
# Use when Docker images are already built and pushed to ACR.
# Run from Azure Cloud Shell or any machine with kubectl configured.
#
# Usage:
#   ./scripts/deploy-quick.sh <tag>              # e.g. main-2a2645f
#   ./scripts/deploy-quick.sh                    # defaults to latest git SHA
#   ./scripts/deploy-quick.sh --dry-run          # preview without applying
set -euo pipefail

ACR_SERVER="sewaaieuprodacr.azurecr.io"
AKS_CLUSTER="sewa-ai-prod-eu-aks"
RESOURCE_GROUP="sewa-ai-prod-rg"
NAMESPACE="sewa-ai"

DRY_RUN=false
TAG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS] [TAG]"
      echo ""
      echo "Deploy existing ACR images to production AKS."
      echo ""
      echo "Arguments:"
      echo "  TAG            Image tag to deploy (default: main-<git-sha>)"
      echo "  --dry-run      Preview without applying"
      echo "  --help, -h     Show this help"
      exit 0
      ;;
    *)
      if [[ "$arg" =~ ^main-[a-f0-9]{7,40}$ ]]; then
        TAG="$arg"
      else
        echo "[ERROR] Invalid tag format: $arg (expected main-<sha>)" >&2
        exit 1
      fi
      ;;
  esac
done

if [ -z "$TAG" ]; then
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  TAG="main-${SHA}"
fi

info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }

info "=== SEWA XAI Quick Production Deploy ==="
info "Tag:     ${TAG}"
info "AKS:     ${AKS_CLUSTER}"
info "NS:      ${NAMESPACE}"

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN — no changes will be applied"
fi

# Ensure kubectl context is set
if ! kubectl cluster-info --context "${AKS_CLUSTER}" &>/dev/null; then
  info "Setting AKS context..."
  az aks get-credentials --resource-group "${RESOURCE_GROUP}" \
    --name "${AKS_CLUSTER}" --overwrite-existing
fi

# Services to update (deployment name : ACR image name)
declare -A SERVICE_IMAGES=(
  ["sewa-backend"]="sewa-backend"
  ["sewa-frontend"]="sewa-frontend"
  ["sewa-triage"]="sewa-ai-triage"
  ["sewa-vlm-report"]="sewa-ai-vlm-report"
  ["sewa-uncertainty"]="sewa-ai-uncertainty"
  ["sewa-metacognition"]="sewa-ai-metacognition"
  ["sewa-federated"]="sewa-ai-federated"
  ["sewa-continuous"]="sewa-ai-continuous"
  ["sewa-pathology"]="sewa-ai-pathology"
  ["sewa-mammography"]="sewa-ai-mammography"
  ["sewa-retinal"]="sewa-ai-retinal"
)

info "=== Updating deployment images ==="
for deploy_name in "${!SERVICE_IMAGES[@]}"; do
  img_name="${SERVICE_IMAGES[$deploy_name]}"
  full_image="${ACR_SERVER}/${img_name}:${TAG}"
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] deployment/${deploy_name} → ${full_image}"
  else
    info "Updating deployment/${deploy_name} → ${full_image}"
    kubectl set image "deployment/${deploy_name}" \
      "${deploy_name}=${full_image}" \
      -n "${NAMESPACE}" \
      --context "${AKS_CLUSTER}" || \
      warn "Failed to update ${deploy_name}"
  fi
done

info "=== Waiting for rollouts ==="
for deploy_name in "${!SERVICE_IMAGES[@]}"; do
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would wait for rollout: deployment/${deploy_name}"
  else
    info "Waiting for deployment/${deploy_name}..."
    kubectl rollout status "deployment/${deploy_name}" \
      -n "${NAMESPACE}" \
      --context "${AKS_CLUSTER}" \
      --timeout=300s || \
      warn "Rollout failed or timed out for ${deploy_name}"
  fi
done

info "=== Health checks ==="
sleep 5
for endpoint in "https://api.sewaxai.health/health" "https://api.sewaxai.health/v1/ai/health"; do
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would curl: ${endpoint}"
  else
    if curl -sf --max-time 10 "${endpoint}" &>/dev/null; then
      info "✅ ${endpoint}"
    else
      warn "❌ ${endpoint}"
    fi
  fi
done

info "Done. Tag: ${TAG}"