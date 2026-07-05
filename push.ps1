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

function Out-Error {
    param($msg)
    Write-Host "  ERR: $msg" -ForegroundColor Red
    exit 1
}

function Test-CommandExists {
    param($cmd)
    if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Out-Error "$cmd is not installed or not in PATH"
    }
}

function Test-AzureAuthentication {
    try {
        $null = az account show -o none 2>&1
    } catch {
        Out-Error "Azure CLI authentication failed. Run 'az login' first."
    }
}

Write-Host "SEWA XAI - Production Push Pipeline ($TIMESTAMP)" -ForegroundColor Cyan

# Pre-flight checks
Write-Host "[PRE] Running pre-flight checks..." -ForegroundColor Yellow
Test-CommandExists "git"
Test-CommandExists "az"
Test-CommandExists "kubectl"
Test-CommandExists "npm"
Test-AzureAuthentication
Out-Success "All pre-requisites verified."

# 1. Commit changes
Write-Host "[1/6] Committing local changes..." -ForegroundColor Yellow
try {
    git add .
    git commit -m "Production push: $TIMESTAMP" --allow-empty 2>&1
    Out-Success "Changes committed."
} catch {
    Write-Host " -> Git commit warning: $_ (continuing...)" -ForegroundColor Yellow
}

# 2. Build & Push Backend via ACR Tasks
Write-Host "[2/6] Building Backend via ACR Tasks..." -ForegroundColor Yellow
$backendImg = "sewa-ai-backend:$IMAGE_TAG"
$backendLatest = "sewa-ai-backend:production-latest"
try {
    az acr build `
        --registry $ACR_NAME `
        --image $backendImg `
        --image $backendLatest `
        --file backend/Dockerfile `
        backend/ `
        --output table
    Out-Success "Backend build complete."
} catch {
    Out-Error "Backend build failed: $_"
}

# 3. Build & Push AI Services
Write-Host "[3/6] Building AI Services via ACR Tasks..." -ForegroundColor Yellow
$AI_SERVICES = @{ "triage"="triage"; "uncertainty"="uncertainty"; "vlm-report"="vlm-report"; "metacognition"="metacognition"; "federated"="federated-learning"; "continuous"="continuous-learning"; "pathology"="pathology"; "mammography"="mammography"; "retinal"="retinal" }
foreach ($svc in $AI_SERVICES.Keys) {
    $dir = $AI_SERVICES[$svc]
    Write-Host " -> Building $svc (from $dir)..." -ForegroundColor Cyan
    $svcImg = "sewa-$svc`:$IMAGE_TAG"
    $svcLatest = "sewa-$svc`:latest" 
    try {
        az acr build `
            --registry $ACR_NAME `
            --image $svcImg `
            --image $svcLatest `
            --file "ai-services/$dir/Dockerfile" `
            "ai-services/$dir/" `
            --output table
    } catch {
        Out-Error "Failed to build $svc`: $_"
    }
}
Out-Success "AI services build complete."

# 3b. Build & Push Frontend (for AKS)
Write-Host "[3b/6] Building Frontend for AKS..." -ForegroundColor Yellow
$frontendImg = "sewa-frontend:$IMAGE_TAG"
$frontendLatest = "sewa-frontend:production-latest"
try {
    az acr build `
        --registry $ACR_NAME `
        --image $frontendImg `
        --image $frontendLatest `
        --build-arg VITE_API_URL=https://api.sewaxai.health/api/v1 `
        --file frontend/Dockerfile `
        ./frontend `
        --output table
    Out-Success "Frontend AKS build complete."
} catch {
    Out-Error "Frontend AKS build failed: $_"
}

# 4. Update AKS Manifests
Write-Host "[4/6] Deploying to AKS..." -ForegroundColor Yellow
try {
    az aks get-credentials `
        --resource-group $RESOURCE_GROUP `
        --name $AKS_CLUSTER `
        --overwrite-existing `
        --output none
    Out-Success "AKS credentials acquired."
} catch {
    Out-Error "Failed to get AKS credentials: $_"
}

# 4b. Recreate ACR Secret (Imperative is more robust than patching)
Write-Host " -> Recreating ACR pull secret..." -ForegroundColor Cyan
try {
    $null = kubectl delete secret acr-secret -n $NS --ignore-not-found 2>&1
    
    $ACR_PWD = az acr credential show `
        --name $ACR_NAME `
        --query "passwords[0].value" `
        -o tsv
    
    if (-not $ACR_PWD) {
        Out-Error "Failed to retrieve ACR password"
    }
    
    kubectl create secret docker-registry acr-secret `
        --namespace=$NS `
        --docker-server=$ACR_SERVER `
        --docker-username=$ACR_NAME `
        --docker-password=$ACR_PWD `
        --docker-email="deploy@sewaxai.health" `
        --output=json | Out-Null
    
    Out-Success "ACR secret created."
} catch {
    Out-Error "Failed to create ACR secret: $_"
}

# Substitute image tags in manifests and apply
try {
    $manifests = Get-ChildItem "azure/k8s/*.yaml" -ErrorAction SilentlyContinue
    if (-not $manifests) {
        Out-Error "No manifest files found in azure/k8s/"
    }
    
    foreach ($m in $manifests) {
        if ($m.Name -eq "acr-secret.yaml") { continue }
        
        $content = Get-Content $m.FullName -Raw
        $content = $content -replace "{{IMAGE_TAG}}", $IMAGE_TAG
        $content = $content -replace "{{CONTAINER_REGISTRY}}", $ACR_SERVER
        $content = $content -replace "{{ENV}}", "production"
        
        $tmpPath = $m.FullName + ".tmp"
        $content | Out-File $tmpPath -Encoding utf8 -NoNewline
        
        kubectl apply -f $tmpPath
        if ($LASTEXITCODE -ne 0) {
            Remove-Item $tmpPath -ErrorAction SilentlyContinue
            Out-Error "kubectl apply failed for $($m.Name)"
        }
        Remove-Item $tmpPath
    }
    
    # IMPORTANT: Always re-apply backend-policy last and unconditionally.
    Write-Host " -> Applying backend network policy..." -ForegroundColor Cyan
    kubectl apply -f azure/k8s/backend-policy-patch.yaml
    if ($LASTEXITCODE -ne 0) {
        Out-Error "Failed to apply backend-policy-patch.yaml"
    }
    
    Out-Success "AKS manifests applied (incl. backend NetworkPolicy)."
} catch {
    Out-Error "Manifest deployment failed: $_"
}

# 5. Frontend - Azure Static Web Apps
Write-Host "[5/6] Deploying Frontend to SWA..." -ForegroundColor Yellow
try {
    Push-Location frontend
    
    Write-Host " -> Installing dependencies..." -ForegroundColor Cyan
    npm ci --prefer-offline
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Out-Error "npm ci failed"
    }
    
    Write-Host " -> Building frontend..." -ForegroundColor Cyan
    $env:VITE_API_URL = "https://api.production.sewaxai.health"
    $env:VITE_APP_ENV = "production"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Out-Error "npm run build failed"
    }
    
    Write-Host " -> Deploying to SWA..." -ForegroundColor Cyan
    $SWA_TOKEN = az staticwebapp secrets list `
        --name "sewa-ai-production-web" `
        --resource-group $RESOURCE_GROUP `
        --query "properties.apiKey" `
        -o tsv
    
    if (-not $SWA_TOKEN) {
        Pop-Location
        Out-Error "Failed to retrieve SWA deployment token"
    }
    
    npx @azure/static-web-apps-cli deploy dist `
        --deployment-token $SWA_TOKEN `
        --env production
    
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Out-Error "SWA deployment failed"
    }
    
    Pop-Location
    Out-Success "Frontend deployed."
} catch {
    Pop-Location
    Out-Error "Frontend deployment failed: $_"
}

# 6. Database & Health Check
Write-Host "[6/6] Finalizing Deployment..." -ForegroundColor Yellow
try {
    $POD = kubectl get pods -n $NS -l app=sewa-backend -o name | Select-Object -First 1
    
    if ($POD) {
        $POD = $POD -replace "^pod/", ""  # Remove "pod/" prefix if present
        Write-Host " -> Running Prisma migrations via pod $POD..." -ForegroundColor Cyan
        kubectl exec -n $NS $POD -c backend -- npm run db:migrate
        if ($LASTEXITCODE -ne 0) {
            Write-Host " -> (Migration warning, continuing...)" -ForegroundColor Yellow
        }
        
        Write-Host " -> Seeding database via pod $POD..." -ForegroundColor Cyan
        kubectl exec -n $NS $POD -c backend -- npm run db:seed:js
        if ($LASTEXITCODE -ne 0) {
            Write-Host " -> (Seed warning, continuing...)" -ForegroundColor Yellow
        }
    } else {
        Write-Host " -> No backend pod found; skipping migrations" -ForegroundColor Yellow
    }
} catch {
    Write-Host " -> Database finalization warning: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== POD STATUS ===" -ForegroundColor Cyan
kubectl get pods -n $NS

Write-Host ""
Write-Host "Production push complete! Platform is live." -ForegroundColor Green
Write-Host "  Image tag: $IMAGE_TAG" -ForegroundColor Cyan
Write-Host ""
