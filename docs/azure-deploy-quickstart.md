# SEWA AI — Azure Deployment Quickstart

## Prerequisites
- Azure CLI installed (`az --version`)
- Terraform installed (`terraform version`)
- Docker installed (`docker --version`)
- kubectl installed (`kubectl version`)

## Step 1: Authenticate

```powershell
# Interactive device code (recommended for security defaults)
az login --use-device-code

# OR if you have a service principal:
az login --service-principal \
  --username <SP_CLIENT_ID> \
  --password <SP_CLIENT_SECRET> \
  --tenant <TENANT_ID>
```

## Step 2: Set Subscription

```powershell
az account set --subscription "a14702a0-439b-42f5-b31a-8b898adfa965"
```

## Step 3: Deploy Infrastructure (Terraform)

```powershell
cd infrastructure/terraform-azure

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — fill in ALL dY"` values

terraform init
terraform plan -out tfplan
terraform apply tfplan
```

## Step 4: Generate .env

```powershell
cd C:\sewa_extract
bash scripts/generate-env-azure.sh --env production
cp backend/.env.azure backend/.env
```

## Step 5: Build & Push Docker Images

```powershell
# Get ACR login server
$ACR = terraform -chdir=infrastructure/terraform-azure output -raw acr_login_server

# Login to ACR
az acr login --name ($ACR.Split(".")[0])

# Build and push backend
docker build -t sewa-backend:prod-latest -f backend/Dockerfile.prod ./backend
docker tag sewa-backend:prod-latest "${ACR}/sewa-backend:prod-latest"
docker push "${ACR}/sewa-backend:prod-latest"

# Build and push frontend
docker build -t sewa-frontend:prod-latest -f frontend/Dockerfile.prod ./frontend
docker tag sewa-frontend:prod-latest "${ACR}/sewa-frontend:prod-latest"
docker push "${ACR}/sewa-frontend:prod-latest"
```

## Step 6: Deploy to AKS

```powershell
# Get AKS credentials
az aks get-credentials `
  --resource-group sewa-ai-production-rg `
  --name sewa-ai-production-aks `
  --overwrite-existing

# Deploy all manifests
kubectl apply -f azure/k8s/namespace.yaml
kubectl apply -f azure/k8s/configmap.yaml
kubectl apply -f azure/k8s/backend-deployment-prod.yaml
kubectl apply -f azure/k8s/frontend-deployment.yaml
kubectl apply -f azure/k8s/ingress.yaml
kubectl apply -f azure/k8s/hpa.yaml
kubectl apply -f azure/k8s/pdb.yaml

# Wait for rollout
kubectl rollout status deployment/sewa-backend -n sewa-ai --timeout=300s
kubectl rollout status deployment/sewa-frontend -n sewa-ai --timeout=300s
```

## Step 7: Verify

```powershell
# Check pods
kubectl get pods -n sewa-ai

# Check health
kubectl exec -n sewa-ai deploy/sewa-backend -- curl -s http://localhost:5000/health

# Check ACR images
kubectl get pods -n sewa-ai -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'
```

## Step 8: Post-Deploy — NHS CIS2 Setup

1. Register CIS2 app in Azure AD:
   - Name: `sewa-ai-production`
   - Redirect URI: `https://api.sewaxai.health/api/v1/auth/cis2/callback`
2. Note `CLIENT_ID` and `TENANT_ID`
3. Store in Key Vault:
   ```powershell
   az keyvault secret set --vault-name sewa-ai-production-kv --name sewa-cis2-client-id --value <CLIENT_ID>
   az keyvault secret set --vault-name sewa-ai-production-kv --name sewa-cis2-client-secret --value <SECRET>
   ```
4. Update `.env`:
   ```
   NHS_CIS2_ENABLED=true
   NHS_CIS2_CLIENT_ID=<from step 1>
   NHS_CIS2_CLIENT_SECRET=<from Key Vault>
   ```
5. Redeploy: `kubectl rollout restart deployment/sewa-backend -n sewa-ai`

## Step 9: HSCN Connectivity

```powershell
cd infrastructure/terraform

terraform init
terraform plan `
  -var="resource_group_name=sewa-ai-production-rg" `
  -var="hscn_vpn_gateway_ip=<NHS_Digital_IP>" `
  -var="hscn_psk=<NHS_Shared_Key>" `
  -var="aks_spoke_vnet_id=<from_terraform_azure_output>" `
  -out hscn.tfplan

terraform apply hscn.tfplan
```

Share the VPN Gateway public IP with NHS Digital / Trust N3 team for the Code of Connection.
