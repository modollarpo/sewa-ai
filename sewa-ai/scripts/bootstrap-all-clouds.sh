#!/usr/bin/env bash
# SEWA AI — scripts/bootstrap-all-clouds.sh
# Creates Terraform remote state backends for Azure, AWS, and GCP
# Run ONCE before first terraform apply on each cloud

set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${CYAN}[SEWA]${NC} $*"; }
success() { echo -e "${GREEN}[SEWA ✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[SEWA !]${NC} $*"; }
error()   { echo -e "${RED}[SEWA ✗]${NC} $*"; exit 1; }

TARGETS="${1:-all}"

# ── Azure ──────────────────────────────────────────────────────
bootstrap_azure() {
  info "Bootstrapping Azure Terraform state…"
  command -v az >/dev/null || error "Azure CLI required"

  LOCATION="${AZURE_LOCATION:-uksouth}"
  RG="${AZURE_TF_RG:-sewa-ai-tf-state-rg}"
  SA="${AZURE_TF_SA:-sewaaiterraformstate}"
  CONTAINER="tfstate"

  az group create --name "$RG" --location "$LOCATION" --output none 2>/dev/null || true
  az storage account create \
    --name "$SA" --resource-group "$RG" \
    --sku Standard_ZRS --kind StorageV2 \
    --https-only true --allow-blob-public-access false \
    --min-tls-version TLS1_2 --output none 2>/dev/null || true
  az storage container create \
    --name "$CONTAINER" --account-name "$SA" \
    --auth-mode login --output none 2>/dev/null || true

  success "Azure state: ${SA}/${CONTAINER}"
  info "  Update infrastructure/terraform-azure/main.tf backend with:"
  info "    storage_account_name = \"${SA}\""
  info "    container_name       = \"${CONTAINER}\""
}

# ── AWS ────────────────────────────────────────────────────────
bootstrap_aws() {
  info "Bootstrapping AWS Terraform state…"
  command -v aws >/dev/null || error "AWS CLI required"

  REGION="${AWS_REGION:-us-east-1}"
  BUCKET="sewa-ai-tf-state-us"
  TABLE="sewa-ai-tf-locks"

  # S3 bucket
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null || \
    warn "Bucket may already exist"

  aws s3api put-bucket-versioning --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption --bucket "$BUCKET" \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

  # DynamoDB for state locking
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" 2>/dev/null || warn "DynamoDB table may already exist"

  success "AWS state: s3://${BUCKET} + DynamoDB ${TABLE}"
}

# ── GCP ────────────────────────────────────────────────────────
bootstrap_gcp() {
  info "Bootstrapping GCP Terraform state…"
  command -v gcloud >/dev/null || error "gcloud CLI required"

  PROJECT="${GCP_PROJECT:-}"
  [[ -z "$PROJECT" ]] && error "GCP_PROJECT env var required"

  BUCKET="sewa-ai-tf-state-eu"
  REGION="${GCP_REGION:-europe-west2}"

  gcloud storage buckets create "gs://${BUCKET}" \
    --project="$PROJECT" \
    --location="$REGION" \
    --uniform-bucket-level-access \
    --public-access-prevention 2>/dev/null || warn "Bucket may already exist"

  gcloud storage buckets update "gs://${BUCKET}" \
    --versioning 2>/dev/null || true

  success "GCP state: gs://${BUCKET}"
}

case "$TARGETS" in
  azure) bootstrap_azure ;;
  aws)   bootstrap_aws ;;
  gcp)   bootstrap_gcp ;;
  all)
    bootstrap_azure
    bootstrap_aws
    bootstrap_gcp
    ;;
  *)
    echo "Usage: bash scripts/bootstrap-all-clouds.sh [azure|aws|gcp|all]"
    exit 1
    ;;
esac

success "Bootstrap complete. Now run terraform init in each infrastructure directory."
