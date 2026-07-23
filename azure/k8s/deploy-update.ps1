# SEWA XAI — Deploy updated backend + frontend to AKS
# Run from an authorized network (one of the 5 IPs in apiServerAccessProfile.authorizedIpRanges)
# © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

param(
  [string]$ResourceGroup = "sewa-ai-production-rg",
  [string]$ClusterName  = "sewa-ai-production-aks",
  [string]$Namespace    = "sewa-ai"
)

Write-Host "=== SEWA XAI — Deploy Updated Images ===" -ForegroundColor Cyan

# Ensure AKS context
az aks get-credentials --resource-group $ResourceGroup --name $ClusterName --overwrite-existing
if (-not $?) { throw "Failed to get AKS credentials" }

# Apply backend deployment
Write-Host "`n--- Backend ---" -ForegroundColor Yellow
kubectl apply -f "$PSScriptRoot/backend-deployment-prod.yaml" --namespace $Namespace
if (-not $?) { throw "Failed to apply backend deployment" }
Write-Host "Waiting for backend rollout..." -ForegroundColor Gray
kubectl rollout status deployment/sewa-backend --namespace $Namespace --timeout=300s

# Apply frontend deployment
Write-Host "`n--- Frontend ---" -ForegroundColor Yellow
kubectl apply -f "$PSScriptRoot/frontend-deployment.yaml" --namespace $Namespace
if (-not $?) { throw "Failed to apply frontend deployment" }
Write-Host "Waiting for frontend rollout..." -ForegroundColor Gray
kubectl rollout status deployment/sewa-frontend --namespace $Namespace --timeout=300s

# Verify
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
kubectl get pods --namespace $Namespace -l "app in (sewa-backend, sewa-frontend)" -o wide
Write-Host "`nImages:" -ForegroundColor Cyan
kubectl get pods --namespace $Namespace -l "app in (sewa-backend, sewa-frontend)" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'

Write-Host "`n=== Done ===" -ForegroundColor Green
