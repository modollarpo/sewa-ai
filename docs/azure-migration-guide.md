# SEWA AI — Azure Migration Guide

![SEWA AI](../assets/logo-horizontal.svg)

<div class="cover">
  <img src="../assets/logo-horizontal.svg" alt="SEWA AI" />
  <h1>Azure Migration Guide</h1>
  <p class="subtitle">Moving to a New Subscription · Multi-Region · Production</p>
  <p class="classification">OFFICIAL-SENSITIVE</p>
</div>

**Document Ref:** SEWA-AI-MIG-001  
**Version:** v1.0  
**Date:** July 2026  
**Sponsor:** Storegrill Inc Ltd (Companies House No. 14581073)

---

## 1. Overview

This guide covers migrating SEWA AI to a **new Azure subscription**. It applies when:

- The current subscription is being retired or consolidated
- A new subscription has been provisioned for the production workload
- The cluster is being moved to a different Azure tenant/AD

The migration is **zero-downtime** — the existing cluster remains live until the new one is verified.

---

## 2. Prerequisites

### 2.1 New Subscription Setup

| Item | Owner | Status |
|------|-------|--------|
| Azure subscription created | Cloud Ops | ✅ Done |
| Subscription added to Azure AD tenant | Cloud Ops | ✅ Done |
| Service Principal created with Owner role | Cloud Ops | ✅ Done |
| `az login --tenant <tenant-id>` configured | Cloud Ops | ✅ Done |
| Resource group created (`sewa-ai-production-rg`) | Cloud Ops | ✅ Done |

### 2.2 Required Azure RBAC Roles

The migration service principal needs:

| Role | Scope | Purpose |
|------|-------|---------|
| **Owner** | Subscription | Full provisioning |
| **Key Vault Administrator** | Resource Group | Secret management |
| **Network Contributor** | Resource Group | VNet, NSG, VPN |
| **Contributor** | Resource Group | AKS, ACR, resources |
| **DNS Zone Contributor** | Resource Group | Private DNS zones |

### 2.3 Required Tools

```bash
# Verify installed
az version          # Azure CLI >= 2.60
terraform version   # >= 1.6
kubectl version     # >= 1.28
docker version      # >= 24
jq                  # >= 1.7
```

---

## 3. Infrastructure Provisioning (New Subscription)

### 3.1 Step 1 — Terraform Init & Plan

```bash
cd infrastructure/terraform-azure

# Copy and fill in the tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with new subscription values:
#   - environment = "production"
#   - azure_region = "uksouth"  # or your preferred region
#   - All dY"` secrets

terraform init
terraform plan -out tfplan
```

### 3.2 Step 2 — Terraform Apply

```bash
terraform apply tfplan
```

This provisions:

| Resource | Purpose |
|----------|---------|
| Resource Group | `sewa-ai-production-rg` |
| VNet + Subnets | aks-subnet, db-subnet, redis-subnet, private-endpoints-subnet |
| AKS Cluster | `sewa-ai-production-aks` (system + GPU + spot pools) |
| ACR Premium | `sewaaiproductionacr` |
| PostgreSQL Flexible Server | `sewa-ai-production-pg` (Zone Redundant, geo-backup) |
| Redis Cache Premium | `sewa-ai-production-redis` |
| Azure Healthcare FHIR R4 | `sewa-ai-production-fhir` |
| Blob Storage (GRS) | DICOM scans, gradcam, reports (7yr lifecycle) |
| Service Bus Premium | Triage queue + HL7 queue + notifications |
| Key Vault Premium | All secrets, CIS2 keys, FHIR credentials |
| Azure Front Door Premium + WAF | Global entry point |
| SignalR Premium | WebSocket/Socket.IO |
| Log Analytics + Prometheus + Grafana | Observability |
| Confidential Ledger | Immutable audit trail |

### 3.3 Step 3 — Generate .env from Terraform

```bash
# This reads all Terraform outputs + Key Vault secrets
# and writes backend/.env.azure
bash ../../scripts/generate-env-azure.sh --env production
```

### 3.4 Step 4 — Switch to Azure .env

```bash
cp backend/.env.azure backend/.env
```

### 3.5 Step 5 — Build & Push Docker Images to ACR

```bash
# Login to ACR
az acr login --name sewaiproductionacr

# Build and push backend
docker build -t sewa-backend:prod-$(date +%Y%m%d) -f backend/Dockerfile.prod ./backend
docker tag sewa-backend:prod-$(date +%Y%m%d) sewaaiproductionacr.azurecr.io/sewa-backend:prod-$(date +%Y%m%d)
docker push sewaaiproductionacr.azurecr.io/sewa-backend:prod-$(date +%Y%m%d)

# Build and push frontend
docker build -t sewa-frontend:prod-$(date +%Y%m%d) -f frontend/Dockerfile.prod ./frontend
docker tag sewa-frontend:prod-$(date +%Y%m%d) sewaaiproductionacr.azurecr.io/sewa-frontend:prod-$(date +%Y%m%d)
docker push sewaaiproductionacr.azurecr.io/sewa-frontend:prod-$(date +%Y%m%d)
```

### 3.6 Step 6 — Deploy to AKS

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group sewa-ai-production-rg \
  --name sewa-ai-production-aks \
  --overwrite-existing

# Deploy (uses the deploy-update.ps1 script)
pwsh -File azure/k8s/deploy-update.ps1
```

### 3.7 Step 7 — Verify Deployment

```bash
# Check pods
kubectl get pods -n sewa-ai -l "app in (sewa-backend, sewa-frontend)" -o wide

# Check rollout status
kubectl rollout status deployment/sewa-backend -n sewa-ai --timeout=300s
kubectl rollout status deployment/sewa-frontend -n sewa-ai --timeout=300s

# Run health check
kubectl exec -n sewa-ai deploy/sewa-backend -- curl -s http://localhost:5000/health | jq .

# Check ACR images
kubectl get pods -n sewa-ai -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'
```

---

## 4. NHS CIS2 Configuration (New Subscription)

### 4.1 Register CIS2 Application

1. Go to **Azure AD** → **App registrations** → **New registration**
2. Name: `sewa-ai-production`
3. Supported account types: **Accounts in this organizational directory only**
4. Redirect URI: `https://api.sewaxai.health/api/v1/auth/cis2/callback`
5. Note the **Application (client) ID** and **Directory (tenant) ID**

### 4.2 Configure CIS2 API Permissions

Add the following API permissions:

| Permission | Type | Admin Consent Required |
|------------|------|----------------------|
| `NHS_CIS2/user_impersonation` | Delegated | Yes |
| `NHS_CIS2/access_as_application` | Application | Yes |

### 4.3 Create Client Secret

1. App registration → **Certificates & secrets** → **New client secret**
2. Note the secret value (expires after configurable period)
3. Store in Key Vault: `az keyvault secret set --vault-name sewa-ai-production-kv --name sewa-cis2-client-secret --value <secret>`

### 4.4 Update .env

```bash
# Set these in the .env (or Key Vault):
NHS_CIS2_ENABLED=true
NHS_CIS2_CLIENT_ID=<from step 4.1>
NHS_CIS2_CLIENT_SECRET=<from Key Vault>
```

---

## 5. HSCN Connectivity (New Subscription)

### 5.1 Provision VPN Gateway

The HSCN VPN Gateway Terraform is at `infrastructure/terraform/hscn-vpn-gateway.tf`.

```bash
cd infrastructure/terraform

# Initialize the HSCN module
terraform init

# Plan with HSCN-specific variables
terraform plan \
  -var="resource_group_name=sewa-ai-production-rg" \
  -var="hscn_vpn_gateway_ip=<NHS_Digital_provided_ip>" \
  -var="hscn_psk=<shared_key_from_NHS>" \
  -var="hscn_remote_networks=[\"10.0.0.0/8\",\"172.16.0.0/12\",\"192.168.0.0/16\"]" \
  -var="aks_spoke_vnet_id=<from_terraform_azure_output>" \
  -out hscn.tfplan

terraform apply hscn.tfplan
```

### 5.2 Share VPN Details with NHS Digital

After provisioning, share the following with the NHS Digital / Trust N3 team:

| Detail | Source |
|--------|--------|
| VPN Gateway Public IP | `terraform output vpn_gateway_public_ip` |
| Gateway Subnet ID | `terraform output gateway_subnet_id` |
| VNet Address Space | `10.0.0.0/16` (from hub VNet) |
| Private DNS Zone | `api.service.nhs.uk` (linked to hub VNet) |

### 5.3 Code of Connection

The HSCN Code of Connection document is at `infrastructure/hscn-code-of-connection.md`. This needs to be:
1. Completed with the actual Trust N3 connection details
2. Signed by the Trust's IG lead
3. Submitted to NHS Digital for approval

---

## 6. Data Migration (New Subscription)

### 6.1 Database Migration

```bash
# Option A: pg_dump/pg_restore (minimal downtime)
pg_dump -h <old-pg-host> -U sewaadmin sewa_i | \
  psql -h <new-pg-host> -U sewaadmin sewa_i

# Option B: Azure Database Migration Service (zero downtime)
# Use Azure DMS for online migration with minimal lock time
```

### 6.2 Blob Storage Migration

```bash
# AzCopy for DICOM scans (large binary files)
azcopy copy \
  "https://<old-storage>.blob.core.windows.net/scans" \
  "https://sewaaiproductiondicom.blob.core.windows.net/scans" \
  --recursive --s2s-preserve-access-tier
```

### 6.3 Redis Migration

```bash
# RDB snapshot restore
# 1. Trigger RDB save on old Redis
# 2. Copy RDB file to new Redis
# 3. Restart new Redis with RDB file
```

---

## 7. DNS Cutover

### 7.1 Update Azure Front Door

1. Azure Portal → Front Door → `sewa-ai-production-frontdoor`
2. Update backend pool to point to new AKS ingress IP
3. Health probe path: `/health`
4. Traffic routing: Weighted (100% new, 0% old during cutover)

### 7.2 Update DNS Records

```
api.sewaxai.health     → A record → Front Door IP
app.sewaxai.health     → CNAME → Front Door
superadmin.sewaxai.health → CNAME → Front Door
```

### 7.3 TTL Reduction (Pre-Cutover)

Reduce DNS TTL to 60 seconds **24 hours before cutover**:
```
api.sewaxai.health  TTL  60
app.sewaxai.health  TTL  60
```

---

## 8. Post-Migration Validation

### 8.1 Smoke Tests

```bash
# Health check
curl -s https://api.sewaxai.health/health | jq .

# Auth test
curl -s https://api.sewaxai.health/api/v1/auth/me \
  -H "Authorization: Bearer <test-token>" | jq .

# Scan creation test
curl -s -X POST https://api.sewaxai.health/api/v1/scans \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{"modality":"CT","bodyPart":"head","tenantId":"<test-tenant>"}' | jq .
```

### 8.2 CIS2 Auth Test

```bash
# Test CIS2 OIDC flow
curl -s https://api.sewaxai.health/api/v1/auth/cis2/callback \
  -G --data-urlencode "code=<test-code>" | jq .
```

### 8.3 PDS/Spine Test

```bash
# Test PDS lookup (requires production PDS access)
curl -s https://api.sewaxai.health/api/v1/fhir/Patient/<nhs-number> \
  -H "Authorization: Bearer <cis2-token>" | jq .
```

### 8.4 HSCN Connectivity Test

```bash
# Test PACS connectivity (from AKS pod)
kubectl exec -n sewa-ai deploy/sewa-backend -- \
  nc -zv pacs.sewaxai.health 104

# Test Spine connectivity
kubectl exec -n sewa-ai deploy/sewa-backend -- \
  nc -zv spineservice.nhs.net 443
```

---

## 9. Rollback Plan

If the new subscription deployment fails:

1. **Revert DNS**: Point Front Door back to old AKS
2. **Keep old infrastructure running**: Do not destroy until new is verified for 48h
3. **Database**: If migration failed, old DB is still accessible
4. **Rollback time**: < 15 minutes (DNS TTL = 60s)

---

## 10. Checklist

| # | Item | Owner | Done |
|---|------|-------|------|
| 1 | New subscription provisioned | Cloud Ops | ☐ |
| 2 | Service Principal created with Owner role | Cloud Ops | ☐ |
| 3 | Terraform applied successfully | Infra | ☐ |
| 4 | .env.azure generated and validated | Infra | ☐ |
| 5 | Docker images built and pushed to ACR | DevOps | ☐ |
| 6 | K8s deployment successful | DevOps | ☐ |
| 7 | Health check passes | QA | ☐ |
| 8 | CIS2 auth flow tested | Security | ☐ |
| 9 | PDS/Spine connectivity tested | Clinical | ☐ |
| 10 | HSCN VPN connected and tested | Infra | ☐ |
| 11 | DNS cutover completed | DevOps | ☐ |
| 12 | Smoke tests pass | QA | ☐ |
| 13 | Monitoring dashboards green | SRE | ☐ |
| 14 | Old infrastructure kept for 48h | Infra | ☐ |
| 15 | Old infrastructure decommissioned | Infra | ☐ |

---

<div class="page-footer">
  SEWA AI — Confidential · © Storegrill Inc Ltd 2026 · SEWA-AI-MIG-001 v1.0
</div>
