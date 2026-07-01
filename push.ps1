# SEWA XAI - Production Deployment Script
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$ACR_NAME = "sewaaiproductionacr"
$ACR_SERVER = "sewaaiproductionacr.azurecr.io"
$AKS_CLUSTER = "sewa-ai-production-aks"
$RESOURCE_GROUP = "sewa-ai-production-rg"
$NS = "sewa-ai"
$IMAGE_TAG = "prod-$TIMESTAMP"

function Out-Success {
    param($msg)
    Write-Host "  OK: $msg" -ForegroundColor Green
}

Write-Host "SEWA XAI - Production Push Pipeline ($TIMESTAMP)" -ForegroundColor Cyan

# 1. Commit changes
Write-Host "[1/6] Committing local changes..." -ForegroundColor Yellow
git add .
git commit -m "Production push: $TIMESTAMP" --allow-empty
Out-Success "Changes committed."

# 2. Build & Push Backend via ACR Tasks
Write-Host "[2/6] Building Backend via ACR Tasks..." -ForegroundColor Yellow
$backendImg = "sewa-ai-backend:$IMAGE_TAG"
$backendLatest = "sewa-ai-backend:production-latest"
$ErrorActionPreference = "Continue"
az acr build --registry $ACR_NAME --image $backendImg --image $backendLatest --file backend/Dockerfile backend/
$ErrorActionPreference = "Stop"
Out-Success "Backend build complete."

# 3. Build & Push AI Services
Write-Host "[3/6] Building AI Services via ACR Tasks..." -ForegroundColor Yellow
$AI_SERVICES = @{ "triage"="triage"; "uncertainty"="uncertainty"; "vlm-report"="vlm-report"; "metacognition"="metacognition"; "federated"="federated-learning"; "continuous"="continuous-learning"; "pathology"="pathology" }
foreach ($svc in $AI_SERVICES.Keys) {
    $dir = $AI_SERVICES[$svc]
    Write-Host " -> Building $svc (from $dir)..." -ForegroundColor Cyan
    $svcImg = "sewa-$svc`:$IMAGE_TAG"
    $svcLatest = "sewa-$svc`:latest" 
    $ErrorActionPreference = "Continue"
    az acr build --registry $ACR_NAME --image $svcImg --image $svcLatest --file "ai-services/$dir/Dockerfile" "ai-services/$dir/"
    $ErrorActionPreference = "Stop"
}
Out-Success "AI services build complete."

# 3b. Build & Push Frontend (for AKS)
Write-Host "[3b/6] Building Frontend for AKS..." -ForegroundColor Yellow
$frontendImg = "sewa-frontend:$IMAGE_TAG"
$frontendLatest = "sewa-frontend:production-latest"
$ErrorActionPreference = "Continue"
az acr build --registry $ACR_NAME --image $frontendImg --image $frontendLatest --build-arg VITE_API_URL=https://api.sewaxai.health/api/v1 ./frontend
$ErrorActionPreference = "Stop"
Out-Success "Frontend AKS build complete."

# 4. Update AKS Manifests
Write-Host "[4/6] Deploying to AKS..." -ForegroundColor Yellow
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing

# 4b. Recreate ACR Secret (Imperative is more robust than patching)
Write-Host " -> Recreating ACR pull secret..." -ForegroundColor Cyan
kubectl delete secret acr-secret -n $NS --ignore-not-found
$ACR_PWD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv
kubectl create secret docker-registry acr-secret `
    --namespace $NS `
    --docker-server=$ACR_SERVER `
    --docker-username=$ACR_NAME `
    --docker-password=$ACR_PWD `
    --docker-email="deploy@sewaxai.health"

# Substitute image tags in manifests and apply
$manifests = Get-ChildItem "azure/k8s/*.yaml"
foreach ($m in $manifests) {
    if ($m.Name -eq "acr-secret.yaml") { continue } # Skip the template
    
    $content = Get-Content $m.FullName -Raw
    $content = $content -replace "{{IMAGE_TAG}}", $IMAGE_TAG
    $content = $content -replace "{{CONTAINER_REGISTRY}}", $ACR_SERVER
    $content = $content -replace "{{ENV}}", "production"
    
    $tmpPath = $m.FullName + ".tmp"
    $content | Out-File $tmpPath -Encoding utf8
    kubectl apply -f $tmpPath
    Remove-Item $tmpPath
}
# IMPORTANT: Always re-apply backend-policy last and unconditionally.
# This NetworkPolicy contains egress rules for Postgres (5432), Redis (6379/6380),
# and DNS (53) that are not present in the base deployment manifests.
# Without this, backend pods enter CrashLoopBackOff after every push.
kubectl apply -f azure/k8s/backend-policy-patch.yaml
Out-Success "AKS manifests applied (incl. backend NetworkPolicy)."

# 5. Frontend - Azure Static Web Apps
Write-Host "[5/6] Deploying Frontend to SWA..." -ForegroundColor Yellow
Push-Location frontend
npm ci --prefer-offline
$env:VITE_API_URL="https://api.production.sewaxai.health"
$env:VITE_APP_ENV="production"
npm run build
$SWA_TOKEN = az staticwebapp secrets list --name "sewa-ai-production-web" --resource-group $RESOURCE_GROUP --query "properties.apiKey" -o tsv
npx @azure/static-web-apps-cli deploy dist --deployment-token $SWA_TOKEN --env "production"
Pop-Location
Out-Success "Frontend deployed."

# 6. Database & Health Check
Write-Host "[6/6] Finalizing Deployment..." -ForegroundColor Yellow
$POD = kubectl get pods -n $NS -l app=sewa-backend -o name | Select-Object -First 1
if ($POD) {
    Write-Host " -> Running Prisma migrations via pod $POD..." -ForegroundColor Cyan
    kubectl exec -n $NS $POD -c backend -- npm run db:migrate
    Write-Host " -> Seeding database via pod $POD..." -ForegroundColor Cyan
    kubectl exec -n $NS $POD -c backend -- npm run db:seed:js
}

Write-Host "=== POD STATUS ===" -ForegroundColor Cyan
kubectl get pods -n $NS

Write-Host "Production push complete! Platform is live." -ForegroundColor Green
