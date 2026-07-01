#!/usr/bin/env bash
# SEWA XAI — scripts/bootstrap-tfstate.sh
# ─────────────────────────────────────────────────────────────────
# Run ONCE before your first `terraform init`.
# Creates the Azure Storage Account that holds Terraform remote state.
#
# Usage:
#   bash scripts/bootstrap-tfstate.sh
#   bash scripts/bootstrap-tfstate.sh --location westeurope   # EU region
#
# Requirements: az CLI logged in  (az login)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Defaults (override via flags) ────────────────────────────
LOCATION="uksouth"
RG_NAME="sewa-ai-tfstate-rg"
SA_NAME="sewaaitfstate"          # must be globally unique, lowercase, 3-24 chars
CONTAINER="tfstate"

# ── Parse flags ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --location)  LOCATION="$2"; shift 2 ;;
    --rg)        RG_NAME="$2";  shift 2 ;;
    --sa)        SA_NAME="$2";  shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     SEWA XAI — Bootstrap Terraform Remote State       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Location   : $LOCATION"
echo "  Resource Grp: $RG_NAME"
echo "  Storage Acct: $SA_NAME"
echo "  Container  : $CONTAINER"
echo ""

# ── Check az login ────────────────────────────────────────────
if ! az account show &>/dev/null; then
  echo "❌  Not logged in. Run: az login"
  exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "✅  Logged in — Subscription: $SUBSCRIPTION_ID"
echo ""

# ── Resource Group ────────────────────────────────────────────
echo "▶  Creating resource group: $RG_NAME ..."
az group create \
  --name     "$RG_NAME" \
  --location "$LOCATION" \
  --tags     "Purpose=TerraformState" "Project=SEWA-AI" \
  --output   none
echo "   ✅ Resource group ready"

# ── Storage Account ───────────────────────────────────────────
echo "▶  Creating storage account: $SA_NAME ..."
az storage account create \
  --name                   "$SA_NAME" \
  --resource-group         "$RG_NAME" \
  --location               "$LOCATION" \
  --sku                    Standard_GRS \
  --encryption-services    blob \
  --min-tls-version        TLS1_2 \
  --allow-blob-public-access false \
  --tags "Purpose=TerraformState" "Project=SEWA-AI" \
  --output none
echo "   ✅ Storage account ready"

# ── Blob Container ────────────────────────────────────────────
echo "▶  Creating blob container: $CONTAINER ..."
az storage container create \
  --name               "$CONTAINER" \
  --account-name       "$SA_NAME" \
  --auth-mode          login \
  --output             none
echo "   ✅ Container ready"

# ── Enable versioning (protects tfstate from accidental delete) ─
echo "▶  Enabling blob versioning ..."
az storage account blob-service-properties update \
  --account-name          "$SA_NAME" \
  --resource-group        "$RG_NAME" \
  --enable-versioning     true \
  --enable-delete-retention true \
  --delete-retention-days 30 \
  --output none
echo "   ✅ Versioning enabled"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Bootstrap complete — you can now run:           ║"
echo "║                                                      ║"
echo "║   cd infrastructure/terraform-azure                 ║"
echo "║   cp terraform.tfvars.example terraform.tfvars      ║"
echo "║   # fill in your secrets in terraform.tfvars        ║"
echo "║   terraform init                                     ║"
echo "║   terraform plan                                     ║"
echo "║   terraform apply                                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
