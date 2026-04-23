#!/usr/bin/env bash
# ============================================================
# SEWA AI — scripts/setup-azure-fhir.sh
# Provision Azure Health Data Services (FHIR R4) end-to-end:
#   1. Healthcare workspace + FHIR service (idempotent)
#   2. Azure AD App Registration (service principal)
#   3. FHIR Data Contributor RBAC assignment
#   4. Secrets stored in Azure Key Vault
#   5. backend/.env updated automatically
#   6. Health check against the live FHIR endpoint
#
# Usage:
#   bash scripts/setup-azure-fhir.sh
#   bash scripts/setup-azure-fhir.sh --env staging
#   bash scripts/setup-azure-fhir.sh --env production --region uksouth
#   bash scripts/setup-azure-fhir.sh --skip-provision  # App Reg + RBAC only
#
# Requirements:
#   az CLI >= 2.55  (az login already done)
#   Contributor + User Access Administrator on the subscription
#   jq installed
#
# © 2026 SEWA AI — a Storegrill Inc Ltd company.
# Registered in England & Wales (14581073). All rights reserved.
# ============================================================
set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}── Step $* ─────────────────────────────────────────${NC}"; }

# ── Defaults (overridden by flags) ────────────────────────────
ENV="production"
REGION="uksouth"
SKIP_PROVISION=false
ENV_FILE="$(dirname "$0")/../backend/.env"
TF_DIR="$(dirname "$0")/../infrastructure/terraform-azure"

# ── Parse flags ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)             ENV="$2";       shift 2 ;;
    --region)          REGION="$2";    shift 2 ;;
    --env-file)        ENV_FILE="$2";  shift 2 ;;
    --skip-provision)  SKIP_PROVISION=true; shift ;;
    --help|-h)
      echo "Usage: $0 [--env production|staging] [--region uksouth] [--skip-provision]"
      exit 0 ;;
    *) error "Unknown flag: $1" ;;
  esac
done

# ── Derived names (must match Terraform naming convention) ────
RG_NAME="sewa-ai-${ENV}-rg"
WORKSPACE_NAME="sewa-ai-${ENV}-hw"
FHIR_SERVICE_NAME="sewa-ai-${ENV}-fhir"
KV_NAME="sewa-ai-${ENV}-kv"
SP_DISPLAY_NAME="sewa-ai-fhir-sp"   # consistent name for idempotency
FHIR_ENDPOINT="https://${WORKSPACE_NAME}-${FHIR_SERVICE_NAME}.fhir.azurehealthcareapis.com"

# ── Banner ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   SEWA AI — Azure Health Data Services (FHIR R4) Setup   ║${NC}"
echo -e "${BOLD}${CYAN}║   from hours, to seconds                                 ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Environment   : ${ENV}"
info "Region        : ${REGION}"
info "Resource Group: ${RG_NAME}"
info "FHIR Workspace: ${WORKSPACE_NAME}"
info "FHIR Service  : ${FHIR_SERVICE_NAME}"
info "Key Vault     : ${KV_NAME}"
info "FHIR Endpoint : ${FHIR_ENDPOINT}"
echo ""

# ── Step 0: Prerequisites ─────────────────────────────────────
step "0 — Prerequisites"

for cmd in az jq; do
  command -v "$cmd" &>/dev/null || error "'${cmd}' not found. Install: https://docs.microsoft.com/cli/azure/install-azure-cli"
done

az account show &>/dev/null || error "Not logged in to Azure. Run: az login"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
CURRENT_USER=$(az account show --query user.name -o tsv)

success "Logged in as: ${CURRENT_USER}"
success "Subscription: ${SUBSCRIPTION_ID}"
success "Tenant:       ${TENANT_ID}"

# ── Step 1: Healthcare Workspace ──────────────────────────────
step "1 — Healthcare Workspace"

if [[ "$SKIP_PROVISION" == "true" ]]; then
  warn "Skipping infrastructure provisioning (--skip-provision)"
else
  # Create resource group if it doesn't exist
  if ! az group show --name "$RG_NAME" &>/dev/null; then
    info "Creating resource group ${RG_NAME}..."
    az group create --name "$RG_NAME" --location "$REGION" \
      --tags Project=SEWA-AI Environment="${ENV}" ManagedBy=SEWA-Script
    success "Resource group created"
  else
    success "Resource group already exists"
  fi

  # Create Healthcare Workspace (idempotent)
  if ! az healthcareapis workspace show \
    --name "$WORKSPACE_NAME" --resource-group "$RG_NAME" &>/dev/null 2>&1; then
    info "Creating Azure Healthcare workspace: ${WORKSPACE_NAME}..."
    info "  (This typically takes 2–3 minutes)"
    az healthcareapis workspace create \
      --name             "$WORKSPACE_NAME" \
      --resource-group   "$RG_NAME" \
      --location         "$REGION" \
      --tags             Project=SEWA-AI Environment="${ENV}" Service=FHIR
    success "Healthcare workspace created: ${WORKSPACE_NAME}"
  else
    success "Healthcare workspace already exists: ${WORKSPACE_NAME}"
  fi

  # Create FHIR R4 Service (idempotent)
  if ! az healthcareapis workspace fhir-service show \
    --name "$FHIR_SERVICE_NAME" \
    --workspace-name "$WORKSPACE_NAME" \
    --resource-group "$RG_NAME" &>/dev/null 2>&1; then
    info "Creating FHIR R4 service: ${FHIR_SERVICE_NAME}..."
    info "  (This typically takes 3–5 minutes)"
    az healthcareapis workspace fhir-service create \
      --name              "$FHIR_SERVICE_NAME" \
      --workspace-name    "$WORKSPACE_NAME" \
      --resource-group    "$RG_NAME" \
      --kind              "fhir-R4" \
      --location          "$REGION" \
      --authentication    "{\"authority\":\"https://login.microsoftonline.com/${TENANT_ID}\",\"audience\":\"${FHIR_ENDPOINT}\"}" \
      --tags              Project=SEWA-AI Environment="${ENV}" Service=FHIR
    success "FHIR R4 service created: ${FHIR_SERVICE_NAME}"
  else
    success "FHIR R4 service already exists: ${FHIR_SERVICE_NAME}"
  fi

  # Capture the actual endpoint from Azure
  FHIR_ENDPOINT=$(az healthcareapis workspace fhir-service show \
    --name             "$FHIR_SERVICE_NAME" \
    --workspace-name   "$WORKSPACE_NAME" \
    --resource-group   "$RG_NAME" \
    --query            "properties.serviceUrl" \
    --output           tsv 2>/dev/null || echo "$FHIR_ENDPOINT")
  success "FHIR endpoint: ${FHIR_ENDPOINT}"
fi

# ── Step 2: App Registration (Service Principal) ──────────────
step "2 — Azure AD App Registration"

# Check if App Registration already exists
APP_ID=$(az ad app list \
  --display-name "$SP_DISPLAY_NAME" \
  --query "[0].appId" -o tsv 2>/dev/null || echo "")

if [[ -z "$APP_ID" || "$APP_ID" == "null" ]]; then
  info "Creating App Registration: ${SP_DISPLAY_NAME}..."
  APP_ID=$(az ad app create \
    --display-name "$SP_DISPLAY_NAME" \
    --query        "appId" \
    --output       tsv)
  success "App Registration created: ${APP_ID}"
  CREATED_NEW_APP=true
else
  success "App Registration already exists: ${APP_ID}"
  CREATED_NEW_APP=false
fi

# Create/reset client secret
info "Generating client secret (valid 2 years)..."
SECRET_OUTPUT=$(az ad app credential reset \
  --id                 "$APP_ID" \
  --display-name       "sewa-ai-fhir-secret-$(date +%Y)" \
  --years              2 \
  --output             json)

CLIENT_SECRET=$(echo "$SECRET_OUTPUT" | jq -r ".password")

if [[ -z "$CLIENT_SECRET" || "$CLIENT_SECRET" == "null" ]]; then
  error "Failed to generate client secret"
fi
success "Client secret generated (expires: $(date -d '+2 years' '+%Y-%m-%d' 2>/dev/null || date -v +2y '+%Y-%m-%d'))"

# Create Service Principal if it doesn't exist
SP_OBJECT_ID=$(az ad sp show --id "$APP_ID" --query "id" -o tsv 2>/dev/null || echo "")

if [[ -z "$SP_OBJECT_ID" || "$SP_OBJECT_ID" == "null" ]]; then
  info "Creating Service Principal for App Registration..."
  SP_OBJECT_ID=$(az ad sp create --id "$APP_ID" --query "id" -o tsv)
  success "Service Principal created: ${SP_OBJECT_ID}"
  # Brief pause for AAD propagation
  info "Waiting 20 seconds for AAD propagation..."
  sleep 20
else
  success "Service Principal already exists: ${SP_OBJECT_ID}"
fi

# ── Step 3: RBAC Role Assignment ──────────────────────────────
step "3 — FHIR Data Contributor Role Assignment"

# Build the full FHIR service resource ID
FHIR_RESOURCE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.HealthcareApis/workspaces/${WORKSPACE_NAME}/fhirservices/${FHIR_SERVICE_NAME}"

info "Assigning 'FHIR Data Contributor' role..."
info "  Principal: ${SP_OBJECT_ID} (${SP_DISPLAY_NAME})"
info "  Scope:     ${FHIR_RESOURCE_ID}"

# Check if role assignment already exists
EXISTING_ROLE=$(az role assignment list \
  --assignee   "$APP_ID" \
  --role       "FHIR Data Contributor" \
  --scope      "$FHIR_RESOURCE_ID" \
  --query      "[0].id" -o tsv 2>/dev/null || echo "")

if [[ -z "$EXISTING_ROLE" || "$EXISTING_ROLE" == "null" ]]; then
  az role assignment create \
    --role       "FHIR Data Contributor" \
    --assignee   "$APP_ID" \
    --scope      "$FHIR_RESOURCE_ID" \
    --output     none
  success "Role 'FHIR Data Contributor' assigned"
else
  success "Role 'FHIR Data Contributor' already assigned"
fi

# Also grant FHIR Data Reader for read-only operations
EXISTING_READER=$(az role assignment list \
  --assignee   "$APP_ID" \
  --role       "FHIR Data Reader" \
  --scope      "$FHIR_RESOURCE_ID" \
  --query      "[0].id" -o tsv 2>/dev/null || echo "")

if [[ -z "$EXISTING_READER" || "$EXISTING_READER" == "null" ]]; then
  az role assignment create \
    --role       "FHIR Data Reader" \
    --assignee   "$APP_ID" \
    --scope      "$FHIR_RESOURCE_ID" \
    --output     none
  success "Role 'FHIR Data Reader' assigned"
fi

# ── Step 4: Store Secrets in Key Vault ───────────────────────
step "4 — Store Credentials in Key Vault"

# Check Key Vault exists
if ! az keyvault show --name "$KV_NAME" --resource-group "$RG_NAME" &>/dev/null 2>&1; then
  warn "Key Vault '${KV_NAME}' not found."
  warn "  If Terraform hasn't run yet: cd infrastructure/terraform-azure && terraform apply"
  warn "  Skipping Key Vault storage — credentials shown below instead."
  KV_AVAILABLE=false
else
  KV_AVAILABLE=true
  success "Key Vault found: ${KV_NAME}"
fi

if [[ "$KV_AVAILABLE" == "true" ]]; then
  info "Storing FHIR credentials in Key Vault..."

  az keyvault secret set \
    --vault-name "$KV_NAME" \
    --name       "sewa-fhir-client-id" \
    --value      "$APP_ID" \
    --output     none
  success "Stored: sewa-fhir-client-id → ${APP_ID}"

  az keyvault secret set \
    --vault-name "$KV_NAME" \
    --name       "sewa-fhir-client-secret" \
    --value      "$CLIENT_SECRET" \
    --output     none
  success "Stored: sewa-fhir-client-secret → [redacted]"

  az keyvault secret set \
    --vault-name "$KV_NAME" \
    --name       "sewa-fhir-base-url" \
    --value      "$FHIR_ENDPOINT" \
    --output     none
  success "Stored: sewa-fhir-base-url → ${FHIR_ENDPOINT}"

  az keyvault secret set \
    --vault-name "$KV_NAME" \
    --name       "sewa-fhir-tenant-id" \
    --value      "$TENANT_ID" \
    --output     none
  success "Stored: sewa-fhir-tenant-id → ${TENANT_ID}"
fi

# ── Step 5: Update backend/.env ───────────────────────────────
step "5 — Update backend/.env"

# Resolve the actual .env file path
ENV_FILE_RESOLVED="$(cd "$(dirname "$0")/.." && realpath backend/.env 2>/dev/null || echo "backend/.env")"
ENV_AZURE_FILE="$(cd "$(dirname "$0")/.." && pwd)/backend/.env.azure"

update_env_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    warn "File not found, skipping: $file"
    return
  fi

  # Backup
  cp "$file" "${file}.bak.$(date +%Y%m%d_%H%M%S)"

  python3 - "$file" "$FHIR_ENDPOINT" "$TENANT_ID" "$APP_ID" "$CLIENT_SECRET" << 'PYEOF'
import sys, re

fpath, fhir_url, tenant_id, client_id, client_secret = sys.argv[1:]

with open(fpath) as f:
    text = f.read()

replacements = {
    r'^FHIR_BASE_URL=.*$':    f'FHIR_BASE_URL={fhir_url}',
    r'^FHIR_TENANT_ID=.*$':   f'FHIR_TENANT_ID={tenant_id}',
    r'^FHIR_CLIENT_ID=.*$':   f'FHIR_CLIENT_ID={client_id}',
    r'^FHIR_CLIENT_SECRET=.*$': f'FHIR_CLIENT_SECRET={client_secret}',
}

for pattern, replacement in replacements.items():
    if re.search(pattern, text, re.MULTILINE):
        text = re.sub(pattern, replacement, text, flags=re.MULTILINE)
    else:
        # Append if variable doesn't exist
        text += f'\n{replacement}\n'

with open(fpath, 'w') as f:
    f.write(text)

print(f'  Updated: {fpath}')
PYEOF
}

# Update .env.azure
update_env_file "$ENV_AZURE_FILE"
success ".env.azure updated with FHIR credentials"

# Also update the active .env if it's azure mode
if [[ -f "$ENV_FILE_RESOLVED" ]]; then
  DEPLOY_TARGET=$(grep "^DEPLOY_TARGET=" "$ENV_FILE_RESOLVED" | cut -d= -f2 | tr -d '[:space:]' || echo "")
  if [[ "$DEPLOY_TARGET" == "azure" ]]; then
    update_env_file "$ENV_FILE_RESOLVED"
    success ".env updated (DEPLOY_TARGET=azure detected)"
  else
    info ".env is in '${DEPLOY_TARGET}' mode — only .env.azure updated"
    info "To apply: cp backend/.env.azure backend/.env"
  fi
fi

# ── Step 6: Health Check ──────────────────────────────────────
step "6 — FHIR Endpoint Health Check"

info "Testing FHIR metadata endpoint..."
info "  URL: ${FHIR_ENDPOINT}/metadata"
info "  (Requesting token via client credentials...)"

# Get a token and test the FHIR endpoint
TOKEN_RESPONSE=$(curl -s -X POST \
  "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=${APP_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "scope=${FHIR_ENDPOINT}/.default" \
  --max-time 15 2>/dev/null || echo "{}")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r ".access_token // empty" 2>/dev/null || echo "")

if [[ -z "$ACCESS_TOKEN" ]]; then
  OAUTH_ERROR=$(echo "$TOKEN_RESPONSE" | jq -r ".error_description // .error // \"unknown error\"" 2>/dev/null || echo "token request failed")
  warn "Could not obtain access token: ${OAUTH_ERROR}"
  warn "  This may be normal immediately after creating the App Registration."
  warn "  AAD propagation can take up to 5 minutes."
  warn "  Re-run this script after 5 minutes to verify."
else
  # Test FHIR metadata endpoint
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Accept: application/fhir+json" \
    "${FHIR_ENDPOINT}/metadata" \
    --max-time 15 2>/dev/null || echo "000")

  if [[ "$HTTP_STATUS" == "200" ]]; then
    success "FHIR endpoint is HEALTHY (HTTP ${HTTP_STATUS})"

    # Get FHIR server version
    FHIR_VERSION=$(curl -s \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Accept: application/fhir+json" \
      "${FHIR_ENDPOINT}/metadata" \
      --max-time 10 2>/dev/null | jq -r ".fhirVersion // \"R4\"" 2>/dev/null || echo "R4")
    success "FHIR version: ${FHIR_VERSION}"
  else
    warn "FHIR endpoint returned HTTP ${HTTP_STATUS}"
    warn "  This may be normal — RBAC propagation can take 5–10 minutes."
    warn "  Try: curl -H 'Authorization: Bearer <token>' ${FHIR_ENDPOINT}/metadata"
  fi
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   SEWA AI FHIR Setup Complete ✓                          ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}FHIR_BASE_URL${NC}    = ${FHIR_ENDPOINT}"
echo -e "  ${CYAN}FHIR_TENANT_ID${NC}   = ${TENANT_ID}"
echo -e "  ${CYAN}FHIR_CLIENT_ID${NC}   = ${APP_ID}"
echo -e "  ${CYAN}FHIR_CLIENT_SECRET${NC}= [stored in Key Vault: sewa-fhir-client-secret]"
echo ""
echo -e "  ${YELLOW}Key Vault${NC}: ${KV_NAME}"
echo -e "  ${YELLOW}FHIR scope${NC}: ${FHIR_ENDPOINT}/.default"
echo ""
echo "  Credentials written to:"
echo "    backend/.env.azure"
if [[ "$KV_AVAILABLE" == "true" ]]; then
echo "    Azure Key Vault: ${KV_NAME}"
fi
echo ""
echo "  Next steps:"
echo "    1. Verify: curl \$(az keyvault secret show --vault-name ${KV_NAME} \\"
echo "         --name sewa-fhir-base-url --query value -o tsv)/metadata"
echo "    2. Deploy: bash scripts/deploy-azure-full.sh ${ENV} ${REGION}"
echo "    3. Monitor: az healthcareapis workspace fhir-service show \\"
echo "         --name ${FHIR_SERVICE_NAME} \\"
echo "         --workspace-name ${WORKSPACE_NAME} \\"
echo "         --resource-group ${RG_NAME}"
echo ""
echo -e "  ${CYAN}© 2026 SEWA AI — a Storegrill Inc Ltd company.${NC}"
echo -e "  ${CYAN}Registered in England & Wales (14581073). All rights reserved.${NC}"
echo ""
