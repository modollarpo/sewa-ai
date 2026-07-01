#!/usr/bin/env bash
# SEWA XAI — scripts/generate-env-azure.sh
# ─────────────────────────────────────────────────────────────────
# After `terraform apply` completes, run this script to
# automatically build backend/.env from Terraform outputs.
#
# This is the "switch to Azure" script — it reads all provisioned
# resource endpoints and secrets directly from Azure / Key Vault
# and writes a complete, ready-to-use .env file.
#
# Usage:
#   bash scripts/generate-env-azure.sh
#   bash scripts/generate-env-azure.sh --env staging
#   bash scripts/generate-env-azure.sh --out backend/.env.azure
#
# Requirements:
#   - az CLI logged in  (az login)
#   - terraform state available in infrastructure/terraform-azure/
#   - jq installed (brew install jq  /  apt-get install jq)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────
TF_DIR="$(dirname "$0")/../infrastructure/terraform-azure"
OUT_FILE="$(dirname "$0")/../backend/.env"
ENV_NAME="production"

# ── Parse flags ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="$2"; shift 2 ;;
    --out) OUT_FILE="$2"; shift 2 ;;
    --tf-dir) TF_DIR="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

OUT_FILE="$(realpath "$OUT_FILE" 2>/dev/null || echo "$OUT_FILE")"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   SEWA XAI — Generate .env from Azure Terraform       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Terraform dir : $TF_DIR"
echo "  Output file   : $OUT_FILE"
echo "  Environment   : $ENV_NAME"
echo ""

# ── Prerequisite checks ───────────────────────────────────────
for cmd in az terraform jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌  Missing required tool: $cmd"
    echo "   Install with: brew install $cmd  OR  apt-get install $cmd"
    exit 1
  fi
done

if ! az account show &>/dev/null; then
  echo "❌  Not logged in to Azure. Run: az login"
  exit 1
fi

if [[ ! -f "$TF_DIR/terraform.tfstate" ]] && [[ ! -d "$TF_DIR/.terraform" ]]; then
  echo "❌  No Terraform state found in $TF_DIR"
  echo "   Run: cd $TF_DIR && terraform init && terraform apply"
  exit 1
fi

echo "▶  Reading Terraform outputs ..."
cd "$TF_DIR"

# Read all outputs at once (faster than individual calls)
TF_OUTPUT=$(terraform output -json 2>/dev/null)

get_tf() {
  echo "$TF_OUTPUT" | jq -r ".${1}.value // empty" 2>/dev/null || echo ""
}

# Read sensitive outputs individually (they need -raw flag)
DATABASE_URL=$(terraform output -raw database_url          2>/dev/null || echo "")
REDIS_URL=$(terraform output -raw redis_url                2>/dev/null || echo "")
STORAGE_CONN=$(terraform output -raw storage_connection_string 2>/dev/null || echo "")
SIGNALR_CONN=$(terraform output -raw signalr_connection_string 2>/dev/null || echo "")

# Non-sensitive outputs
AKS_NAME=$(get_tf "aks_cluster_name")
ACR_SERVER=$(get_tf "acr_login_server")
PG_FQDN=$(get_tf "postgres_fqdn")
REDIS_HOST=$(get_tf "redis_hostname")
REDIS_PORT=$(get_tf "redis_ssl_port")
FHIR_ENDPOINT=$(get_tf "fhir_endpoint")
STORAGE_ACCOUNT=$(get_tf "storage_account_name")
SB_ENDPOINT=$(get_tf "servicebus_endpoint")
SB_NAMESPACE=$(get_tf "servicebus_namespace")
KV_URI=$(get_tf "key_vault_uri")
KV_NAME=$(get_tf "key_vault_name")
SIGNALR_HOST=$(get_tf "signalr_hostname")
TENANT_ID=$(get_tf "tenant_id")
SUBSCRIPTION_ID=$(get_tf "subscription_id")
RG_NAME=$(get_tf "resource_group_name")
AZ_LOCATION=$(get_tf "location")
LOG_WORKSPACE=$(get_tf "log_analytics_workspace_id")

echo "   ✅ Terraform outputs read"

# ── Read secrets from Key Vault ───────────────────────────────
echo "▶  Reading secrets from Key Vault: $KV_NAME ..."

kv_secret() {
  local name="$1"
  local default="${2:-}"
  az keyvault secret show \
    --vault-name "$KV_NAME" \
    --name       "$name" \
    --query      "value" \
    --output     tsv 2>/dev/null || echo "$default"
}

JWT_SECRET=$(kv_secret      "sewa-jwt-secret")
JWT_REFRESH=$(kv_secret     "sewa-jwt-refresh-secret")
ENC_KEY=$(kv_secret         "sewa-encryption-key")
STRIPE_KEY=$(kv_secret      "sewa-stripe-secret-key"       "")
PAYSTACK_KEY=$(kv_secret    "sewa-paystack-secret-key"      "")
FLUTTERWAVE_KEY=$(kv_secret "sewa-flutterwave-secret-key"   "")
MPESA_KEY=$(kv_secret       "sewa-mpesa-consumer-key"       "")
MPESA_SECRET=$(kv_secret    "sewa-mpesa-consumer-secret"    "")
FIREBASE_KEY=$(kv_secret    "sewa-firebase-private-key"     "")
SMTP_PASS=$(kv_secret       "sewa-smtp-pass"                "")
SENTRY_DSN=$(kv_secret      "sewa-sentry-dsn"               "")

echo "   ✅ Secrets read from Key Vault"

# ── Read FHIR credentials from Key Vault ──────────────────────
echo "▶  Reading FHIR credentials from Key Vault ..."
FHIR_BASE_URL=$(kv_secret  "sewa-fhir-base-url"      "${FHIR_ENDPOINT}")
FHIR_CLIENT_ID=$(kv_secret "sewa-fhir-client-id"     "")
FHIR_CLIENT_SECRET=$(kv_secret "sewa-fhir-client-secret" "")
FHIR_TENANT_ID_KV=$(kv_secret "sewa-fhir-tenant-id"  "${TENANT_ID}")
[ -n "$FHIR_TENANT_ID_KV" ] && TENANT_ID_FHIR="$FHIR_TENANT_ID_KV" || TENANT_ID_FHIR="$TENANT_ID"
[ -z "$FHIR_BASE_URL" ] && FHIR_BASE_URL="${FHIR_ENDPOINT}" 

# ── Read SignalR connection string from Azure (backup) ────────
if [[ -z "$SIGNALR_CONN" ]]; then
  SIGNALR_CONN=$(az signalr key list \
    --name           "${ENV_NAME}-signalr" \
    --resource-group "$RG_NAME" \
    --query          "primaryConnectionString" \
    --output         tsv 2>/dev/null || echo "")
fi

# ── Get Service Bus connection string ─────────────────────────
SB_CONN=$(az servicebus namespace authorization-rule keys list \
  --resource-group   "$RG_NAME" \
  --namespace-name   "$SB_NAMESPACE" \
  --name             "RootManageSharedAccessKey" \
  --query            "primaryConnectionString" \
  --output           tsv 2>/dev/null || echo "")

# ── Get ACR credentials for CI/CD ─────────────────────────────
ACR_TOKEN=$(az acr login --name "${ACR_SERVER%%.*}" --expose-token \
  --query accessToken -o tsv 2>/dev/null || echo "")

echo "   ✅ Azure resource details collected"

# ── Write .env file ───────────────────────────────────────────
echo "▶  Writing $OUT_FILE ..."

# Backup existing .env if present
if [[ -f "$OUT_FILE" ]]; then
  cp "$OUT_FILE" "${OUT_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
  echo "   📁 Backed up existing .env"
fi

cat > "$OUT_FILE" <<ENV
# ============================================================
# SEWA XAI — Azure Backend Environment
# AUTO-GENERATED by scripts/generate-env-azure.sh
# Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# Environment: ${ENV_NAME}
# Azure Region: ${AZ_LOCATION}
#
# ⚠  DO NOT COMMIT THIS FILE — it contains secrets
# ============================================================

# ── Deployment Target ──────────────────────────────────────────
# Change this line to switch between local and Azure:
DEPLOY_TARGET=azure

# ── Server ────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000
REGION=uk
APP_URL=https://api.sewaxai.health
CORS_ORIGINS=https://app.sewaxai.health,https://superadmin.sewaxai.health
LOG_LEVEL=info

# ── Azure Identity ─────────────────────────────────────────────
AZURE_SUBSCRIPTION_ID=${SUBSCRIPTION_ID}
AZURE_TENANT_ID=${TENANT_ID}
AZURE_RESOURCE_GROUP=${RG_NAME}
AZURE_LOCATION=${AZ_LOCATION}

# ── Database — Azure PostgreSQL 15 Flexible Server ────────────
DATABASE_URL=${DATABASE_URL}
AZURE_PG_HOST=${PG_FQDN}

# ── Cache — Azure Cache for Redis 7 ───────────────────────────
REDIS_URL=${REDIS_URL}
AZURE_REDIS_HOST=${REDIS_HOST}
AZURE_REDIS_PORT=${REDIS_PORT}

# ── Security (from Key Vault) ──────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
ENCRYPTION_KEY=${ENC_KEY}

# ── AI Services (internal AKS service DNS) ────────────────────
AI_SERVICE_URL=http://ai-triage:8000
VLM_SERVICE_URL=http://ai-vlm:8001
UNCERTAINTY_SERVICE_URL=http://ai-uncertainty:8002
METACOGNITION_SERVICE_URL=http://ai-metacognition:8003
FL_SERVICE_URL=http://ai-federated:8004
CL_SERVICE_URL=http://ai-continuous:8005

# ── FHIR R4 — Azure Health Data Services ─────────────────────
# Set automatically from Key Vault by setup-azure-fhir.sh
# Re-run: bash scripts/setup-azure-fhir.sh to refresh
FHIR_BASE_URL=${FHIR_BASE_URL:-$FHIR_ENDPOINT}
FHIR_TENANT_ID=${TENANT_ID}
FHIR_CLIENT_ID=${FHIR_CLIENT_ID}
FHIR_CLIENT_SECRET=${FHIR_CLIENT_SECRET}

# ── HL7v2 ─────────────────────────────────────────────────────
HL7_HOST=hl7.sewaxai.health
HL7_PORT=2575
HL7_FACILITY=SEWA_AI

# ── PACS / DICOM ──────────────────────────────────────────────
PACS_HOST=pacs.sewaxai.health
PACS_PORT=104
PACS_AE_TITLE=SEWA_PACS

# ── Azure Blob Storage — DICOM ─────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=${STORAGE_CONN}
AZURE_STORAGE_CONTAINER=scans
AZURE_GRADCAM_CONTAINER=gradcam
AZURE_REPORTS_CONTAINER=reports
AZURE_STORAGE_ACCOUNT=${STORAGE_ACCOUNT}

# ── Azure Service Bus ──────────────────────────────────────────
AZURE_SERVICEBUS_CONNECTION_STRING=${SB_CONN}
AZURE_SERVICEBUS_TRIAGE_QUEUE=sewa-scan-triage
AZURE_SERVICEBUS_HL7_QUEUE=sewa-hl7-messages

# ── Azure Key Vault ────────────────────────────────────────────
AZURE_KEY_VAULT_URI=${KV_URI}
AZURE_KEY_VAULT_NAME=${KV_NAME}

# ── Azure SignalR ──────────────────────────────────────────────
AZURE_SIGNALR_CONNECTION_STRING=${SIGNALR_CONN}

# ── AKS / Container Registry ──────────────────────────────────
AKS_CLUSTER_NAME=${AKS_NAME}
ACR_LOGIN_SERVER=${ACR_SERVER}

# ── Log Analytics ──────────────────────────────────────────────
AZURE_LOG_ANALYTICS_WORKSPACE_ID=${LOG_WORKSPACE}

# ── Payments (from Key Vault) ──────────────────────────────────
STRIPE_SECRET_KEY=${STRIPE_KEY}
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
PAYSTACK_SECRET_KEY=${PAYSTACK_KEY}
PAYSTACK_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=${FLUTTERWAVE_KEY}
FLUTTERWAVE_PUBLIC_KEY=
MPESA_CONSUMER_KEY=${MPESA_KEY}
MPESA_CONSUMER_SECRET=${MPESA_SECRET}
MPESA_SHORTCODE=
MPESA_PASSKEY=

# ── Firebase / FCM Push ────────────────────────────────────────
FIREBASE_PROJECT_ID=sewa-ai-prod
FIREBASE_PRIVATE_KEY=${FIREBASE_KEY}
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@sewa-ai-prod.iam.gserviceaccount.com

# ── Email / SMTP ───────────────────────────────────────────────
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=${SMTP_PASS}
EMAIL_FROM=info@sewaxai.health

# ── Monitoring ─────────────────────────────────────────────────
SENTRY_DSN=${SENTRY_DSN}

# ── Azure Confidential Ledger ──────────────────────────────────
AZURE_CONFIDENTIAL_LEDGER_URL=https://sewa-ai-${ENV_NAME}-ledger.confidential-ledger.azure.com

ENV

echo "   ✅ .env written to $OUT_FILE"

# ── Validate: check no blank required values ──────────────────
echo ""
echo "▶  Validating required values ..."
MISSING=0
check_var() {
  local line
  line=$(grep "^${1}=" "$OUT_FILE" | head -1)
  local val="${line#*=}"
  if [[ -z "$val" ]]; then
    echo "   ⚠  $1 is empty — fill in manually"
    MISSING=$((MISSING+1))
  fi
}

check_var "DATABASE_URL"
check_var "REDIS_URL"
check_var "JWT_SECRET"
check_var "JWT_REFRESH_SECRET"
check_var "ENCRYPTION_KEY"
check_var "AZURE_STORAGE_CONNECTION_STRING"

if [[ $MISSING -eq 0 ]]; then
  echo "   ✅ All required values present"
else
  echo "   ⚠  $MISSING value(s) need manual filling — check $OUT_FILE"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Azure .env generated successfully               ║"
echo "║                                                      ║"
echo "║  File: $OUT_FILE"
echo "║                                                      ║"
echo "║  Next steps:                                         ║"
echo "║   1. Review the file and fill any ⚠ empty values    ║"
echo "║   2. Deploy: bash scripts/deploy-azure.sh            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
