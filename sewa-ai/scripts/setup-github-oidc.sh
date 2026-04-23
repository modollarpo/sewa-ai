#!/usr/bin/env bash
# SEWA AI — scripts/setup-github-oidc.sh
# ─────────────────────────────────────────────────────────────────
# ONE-TIME SETUP: Connects GitHub Actions to Azure using OIDC
# Federated Identity — no passwords, no stored credentials.
#
# After this runs, GitHub Actions can deploy to Azure using only:
#   AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
# (no ACR_PASSWORD, no service principal secret)
#
# Usage:
#   bash scripts/setup-github-oidc.sh \
#     --github-org  your-org \
#     --github-repo sewa-ai \
#     --env         production
#
# Requirements:
#   - az CLI logged in as Owner on the subscription
#   - gh CLI installed (optional — for auto-setting repo secrets)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────
GITHUB_ORG=""
GITHUB_REPO="sewa-ai"
ENV_NAME="production"
APP_NAME="sewa-ai-github-actions"
RESOURCE_GROUP="sewa-ai-production-rg"
ACR_NAME="sewaaiproductionacr"
AKS_NAME="sewa-ai-production-aks"

# ── Parse flags ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --github-org)  GITHUB_ORG="$2";   shift 2 ;;
    --github-repo) GITHUB_REPO="$2";  shift 2 ;;
    --env)         ENV_NAME="$2";     shift 2 ;;
    --rg)          RESOURCE_GROUP="$2"; shift 2 ;;
    --acr)         ACR_NAME="$2";     shift 2 ;;
    --aks)         AKS_NAME="$2";     shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

if [[ -z "$GITHUB_ORG" ]]; then
  echo "Usage: bash scripts/setup-github-oidc.sh --github-org YOUR_ORG [options]"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   SEWA AI — GitHub Actions OIDC Setup                   ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  GitHub Repo  : ${GITHUB_ORG}/${GITHUB_REPO}"
echo "║  Environment  : ${ENV_NAME}"
echo "║  Resource Grp : ${RESOURCE_GROUP}"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Get subscription & tenant IDs ─────────────────────────────
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
ACR_RESOURCE_ID=$(az acr show --name "$ACR_NAME" --query id -o tsv 2>/dev/null || echo "")
AKS_RESOURCE_ID=$(az aks show --name "$AKS_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv 2>/dev/null || echo "")

echo "✅ Subscription : $SUBSCRIPTION_ID"
echo "✅ Tenant       : $TENANT_ID"
echo ""

# ── Step 1: Create App Registration ───────────────────────────
echo "▶  Step 1/5 — Creating App Registration: $APP_NAME ..."

# Check if it already exists
EXISTING_APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv 2>/dev/null || echo "")

if [[ -n "$EXISTING_APP_ID" ]]; then
  CLIENT_ID="$EXISTING_APP_ID"
  echo "   ℹ️  App Registration already exists: $CLIENT_ID"
else
  CLIENT_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --query appId \
    -o tsv)
  echo "   ✅ Created App Registration: $CLIENT_ID"
fi

# ── Step 2: Create Service Principal ──────────────────────────
echo "▶  Step 2/5 — Creating Service Principal ..."
SP_EXISTS=$(az ad sp list --filter "appId eq '$CLIENT_ID'" --query "[0].id" -o tsv 2>/dev/null || echo "")

if [[ -z "$SP_EXISTS" ]]; then
  az ad sp create --id "$CLIENT_ID" --output none
  echo "   ✅ Service Principal created"
  sleep 5   # wait for AAD propagation
else
  echo "   ℹ️  Service Principal already exists"
fi

SP_OBJECT_ID=$(az ad sp show --id "$CLIENT_ID" --query id -o tsv)

# ── Step 3: Assign RBAC roles ─────────────────────────────────
echo "▶  Step 3/5 — Assigning RBAC roles ..."

# AcrPush — push Docker images to ACR
if [[ -n "$ACR_RESOURCE_ID" ]]; then
  az role assignment create \
    --assignee    "$SP_OBJECT_ID" \
    --role        "AcrPush" \
    --scope       "$ACR_RESOURCE_ID" \
    --output      none 2>/dev/null || echo "   ℹ️  AcrPush already assigned"
  echo "   ✅ AcrPush → ACR"
fi

# Azure Kubernetes Service Cluster User — get credentials + deploy
if [[ -n "$AKS_RESOURCE_ID" ]]; then
  az role assignment create \
    --assignee    "$SP_OBJECT_ID" \
    --role        "Azure Kubernetes Service Cluster User Role" \
    --scope       "$AKS_RESOURCE_ID" \
    --output      none 2>/dev/null || echo "   ℹ️  AKS role already assigned"
  echo "   ✅ AKS Cluster User → AKS"
fi

# Key Vault Secrets User — read secrets during deploy
KV_RESOURCE_ID=$(az keyvault show \
  --name "${APP_NAME%-github-actions}-kv" \
  --resource-group "$RESOURCE_GROUP" \
  --query id -o tsv 2>/dev/null || echo "")

if [[ -n "$KV_RESOURCE_ID" ]]; then
  az role assignment create \
    --assignee    "$SP_OBJECT_ID" \
    --role        "Key Vault Secrets User" \
    --scope       "$KV_RESOURCE_ID" \
    --output      none 2>/dev/null || echo "   ℹ️  KV role already assigned"
  echo "   ✅ Key Vault Secrets User → Key Vault"
fi

# ── Step 4: Create Federated Credentials ─────────────────────
echo "▶  Step 4/5 — Creating Federated Identity Credentials ..."

# Federated credential for main branch (production)
az ad app federated-credential create \
  --id           "$CLIENT_ID" \
  --parameters "{
    \"name\":        \"github-main\",
    \"issuer\":      \"https://token.actions.githubusercontent.com\",
    \"subject\":     \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main\",
    \"audiences\":   [\"api://AzureADTokenExchange\"],
    \"description\": \"GitHub Actions — main branch (production)\"
  }" --output none 2>/dev/null || echo "   ℹ️  main credential already exists"
echo "   ✅ Federated credential: main → production"

# Federated credential for staging branch
az ad app federated-credential create \
  --id           "$CLIENT_ID" \
  --parameters "{
    \"name\":        \"github-staging\",
    \"issuer\":      \"https://token.actions.githubusercontent.com\",
    \"subject\":     \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/staging\",
    \"audiences\":   [\"api://AzureADTokenExchange\"],
    \"description\": \"GitHub Actions — staging branch\"
  }" --output none 2>/dev/null || echo "   ℹ️  staging credential already exists"
echo "   ✅ Federated credential: staging"

# Federated credential for pull requests (for lint/test/scan jobs)
az ad app federated-credential create \
  --id           "$CLIENT_ID" \
  --parameters "{
    \"name\":        \"github-prs\",
    \"issuer\":      \"https://token.actions.githubusercontent.com\",
    \"subject\":     \"repo:${GITHUB_ORG}/${GITHUB_REPO}:pull_request\",
    \"audiences\":   [\"api://AzureADTokenExchange\"],
    \"description\": \"GitHub Actions — pull requests\"
  }" --output none 2>/dev/null || echo "   ℹ️  PR credential already exists"
echo "   ✅ Federated credential: pull_request"

# ── Step 5: Set GitHub repository secrets and variables ───────
echo "▶  Step 5/5 — Configuring GitHub repository ..."

if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  echo "   GitHub CLI detected — setting secrets and variables automatically..."

  # Set secrets (sensitive)
  gh secret set AZURE_CLIENT_ID       --body "$CLIENT_ID"       --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set AZURE_TENANT_ID       --body "$TENANT_ID"       --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID" --repo "${GITHUB_ORG}/${GITHUB_REPO}"

  # Set variables (non-sensitive)
  ACR_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv 2>/dev/null || echo "${ACR_NAME}.azurecr.io")
  gh variable set ACR_LOGIN_SERVER   --body "$ACR_SERVER"      --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh variable set AKS_CLUSTER_NAME   --body "$AKS_NAME"        --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh variable set AKS_RESOURCE_GROUP --body "$RESOURCE_GROUP"  --repo "${GITHUB_ORG}/${GITHUB_REPO}"

  echo "   ✅ GitHub secrets and variables set automatically"
else
  echo ""
  echo "   ⚠  GitHub CLI not found. Set these manually in:"
  echo "      GitHub → ${GITHUB_ORG}/${GITHUB_REPO} → Settings → Secrets and variables"
  echo ""
  echo "   ┌─── SECRETS (Settings → Secrets → Actions) ──────────────────┐"
  echo "   │  AZURE_CLIENT_ID        = $CLIENT_ID"
  echo "   │  AZURE_TENANT_ID        = $TENANT_ID"
  echo "   │  AZURE_SUBSCRIPTION_ID  = $SUBSCRIPTION_ID"
  echo "   └──────────────────────────────────────────────────────────────┘"
  echo ""
  ACR_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv 2>/dev/null || echo "${ACR_NAME}.azurecr.io")
  echo "   ┌─── VARIABLES (Settings → Secrets → Variables → Actions) ────┐"
  echo "   │  ACR_LOGIN_SERVER   = $ACR_SERVER"
  echo "   │  AKS_CLUSTER_NAME   = $AKS_NAME"
  echo "   │  AKS_RESOURCE_GROUP = $RESOURCE_GROUP"
  echo "   └──────────────────────────────────────────────────────────────┘"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  OIDC Setup Complete — NO passwords stored           ║"
echo "║                                                          ║"
echo "║  GitHub Actions can now authenticate to Azure via        ║"
echo "║  federated identity on every push to main or staging.    ║"
echo "║                                                          ║"
echo "║  Push to main    → deploys to production AKS             ║"
echo "║  Push to staging → deploys to staging AKS                ║"
echo "║  Pull Request    → lint + test + security scan only      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
