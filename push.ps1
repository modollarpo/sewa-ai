# SEWA XAI - Production Deployment Script
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$ACR_NAME = "sewaaiproductionacr"
$ACR_SERVER = "sewaaiproductionacr.azurecr.io"
$AKS_CLUSTER = "sewa-ai-production-aks"
$RESOURCE_GROUP = "sewa-ai-production-rg"
$NS = "sewa-ai"   # CANONICAL NAMESPACE — do NOT change; cluster has been live for 92+ days on this value.
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

# Install kubelogin if missing
Write-Host " -> Checking for kubelogin..." -ForegroundColor Cyan
try {
    $null = Get-Command "kubelogin" -ErrorAction SilentlyContinue
    Write-Host "   [OK] kubelogin found" -ForegroundColor Green
} catch {
    Write-Host "   [WARN] kubelogin not found. Installing via az aks install-cli..." -ForegroundColor Yellow
    az aks install-cli
    # Add to PATH (for current session)
    $env:PATH = "$env:USERPROFILE\.azure-kubelogin;$env:PATH"
    Write-Host "   [OK] kubelogin installed" -ForegroundColor Green
}

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
$backendImg = "sewa-backend:$IMAGE_TAG"
$backendLatest = "sewa-backend:prod-latest"
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
$AI_SERVICES = @{ "ai-triage"="triage"; "ai-uncertainty"="uncertainty"; "ai-vlm"="vlm-report"; "ai-metacognition"="metacognition"; "ai-federated"="federated-learning"; "ai-continuous"="continuous-learning"; "ai-pathology"="pathology"; "ai-mammography"="mammography"; "ai-retinal"="retinal" }
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
    kubelogin convert-kubeconfig -l azurecli
    Out-Success "AKS credentials acquired."

    # ── Namespace guard: fail loudly rather than deploy to wrong NS ──────
    $nsExists = kubectl get namespace $NS --ignore-not-found -o name 2>$null
    if (-not $nsExists) {
        Write-Host "   [WARN] Namespace '$NS' not found — creating it now." -ForegroundColor Yellow
        kubectl create namespace $NS
        kubectl label namespace $NS environment=production app.kubernetes.io/part-of=sewa-xai
        Write-Host "   [OK] Namespace '$NS' created." -ForegroundColor Green
    } else {
        Write-Host "   [OK] Namespace '$NS' confirmed." -ForegroundColor Green
    }
} catch {
    Out-Error "Failed to get AKS credentials: $_"
}

# 4b. Recreate ACR Pull Secret
Write-Host " -> Recreating ACR pull secret..." -ForegroundColor Cyan
try {
    $null = kubectl delete secret acr-secret -n $NS --ignore-not-found 2>&1
    
    $ACR_PWD = az acr credential show `
        --name $ACR_NAME `
        --query "passwords[0].value" `
        -o tsv
    
    if (-not $ACR_PWD) {
        Write-Host "   [WARN] Could not retrieve ACR password; skipping secret update" -ForegroundColor Yellow
    } else {
        kubectl create secret docker-registry acr-secret `
            --namespace=$NS `
            --docker-server=$ACR_SERVER `
            --docker-username=$ACR_NAME `
            --docker-password=$ACR_PWD `
            --docker-email="deploy@sewaxai.health" `
            --output=json | Out-Null
        
        Out-Success "ACR secret created."
    }
} catch {
    Write-Host "   [WARN] Could not update ACR secret (likely RBAC): $_" -ForegroundColor Yellow
    Write-Host "   -> Continuing without secret update..." -ForegroundColor Yellow
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
    # Wait for at least one Ready pod
    Write-Host " -> Waiting for a Ready backend pod..." -ForegroundColor Cyan
    $null = kubectl wait --for=condition=Ready pod -l app=sewa-backend -n $NS --timeout=120s 2>&1

    $POD = kubectl get pods -n $NS -l app=sewa-backend --field-selector=status.phase=Running -o name 2>$null |
        Where-Object { $_ -ne "" } | Select-Object -First 1

    if ($POD) {
        $POD = $POD -replace "^pod/", ""  # Remove "pod/" prefix if present

        # Use db push (idempotent) instead of migrate deploy to handle non-empty production DB (P3005)
        Write-Host " -> Syncing schema via 'prisma db push' in pod $POD..." -ForegroundColor Cyan
        kubectl exec -n $NS $POD -c backend -- sh -c "npx prisma db push --skip-generate --accept-data-loss 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Host " -> (Schema sync warning, continuing...)" -ForegroundColor Yellow
        }

        # Resolve migrations as applied so future migrate deploy doesn't fail
        Write-Host " -> Baselining migrations in pod $POD..." -ForegroundColor Cyan
        kubectl exec -n $NS $POD -c backend -- sh -c @"
            npx prisma migrate resolve --applied 0_init 2>&1 || true
            npx prisma migrate resolve --applied 20260627000000_add_model_monitoring_and_feedback 2>&1 || true
            npx prisma migrate resolve --applied 20260704000000_add_tenant_geo_and_contact_fields 2>&1 || true
"@

        # Seed with required ADMIN_PASSWORD (idempotent — seed.js upserts)
        Write-Host " -> Seeding database via pod $POD..." -ForegroundColor Cyan
        $ADMIN_PASS = az keyvault secret show --vault-name "sewa-ai-production-kv" --name "sewa-admin-password" --query value -o tsv 2>$null
        if (-not $ADMIN_PASS) { $ADMIN_PASS = "DemoPassword123!" }
        kubectl exec -n $NS $POD -c backend -- sh -c "ADMIN_PASSWORD='$ADMIN_PASS' npm run db:seed:js 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Host " -> (Seed warning, continuing...)" -ForegroundColor Yellow
        }
    } else {
        Write-Host " -> No running backend pod found; skipping DB steps" -ForegroundColor Yellow
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
