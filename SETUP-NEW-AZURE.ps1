# ═════════════════════════════════════════════════════════════════════════════
# SEWA XAI — Fresh Azure Account Setup
# Deploy to NEW Azure subscription from scratch
# ═════════════════════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SEWA XAI — Fresh Azure Deployment                           ║" -ForegroundColor Cyan
Write-Host "║  Setup new AKS cluster + infrastructure                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ────────────────────────────────────────────────────────────────────────────
# STEP 1: Clear old credentials + login to new account
# ────────────────────────────────────────────────────────────────────────────
Write-Host "STEP 1: Clear old Azure credentials" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "Removing old kubeconfig..." -NoNewline
Remove-Item "$env:USERPROFILE\.kube\config" -Force -ErrorAction SilentlyContinue
Write-Host " ✓" -ForegroundColor Green

Write-Host "Clearing Azure CLI cache..." -NoNewline
& az account clear 2>&1 | Out-Null
Write-Host " ✓" -ForegroundColor Green

Write-Host ""
Write-Host "STEP 2: Login to NEW Azure Account" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Your browser will open. Sign in with your NEW Azure account credentials." -ForegroundColor Cyan
Write-Host ""

& az login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Azure login failed" -ForegroundColor Red
    exit 1
}

$subscriptions = & az account list --output json | ConvertFrom-Json
Write-Host ""
Write-Host "Available subscriptions:" -ForegroundColor Cyan
$subscriptions | ForEach-Object { Write-Host "  • $($_.name) ($_id)" -ForegroundColor Gray }
Write-Host ""

if ($subscriptions.Count -eq 1) {
    $selectedSub = $subscriptions[0]
    Write-Host "Auto-selected subscription: $($selectedSub.name)" -ForegroundColor Green
} else {
    Write-Host "Enter subscription name or ID (or press Enter for default):" -ForegroundColor Cyan
    $subInput = Read-Host "Subscription"
    $selectedSub = $subscriptions | Where-Object { $_.name -eq $subInput -or $_.id -eq $subInput } | Select-Object -First 1
    if (-not $selectedSub) {
        $selectedSub = $subscriptions[0]
        Write-Host "Using first subscription: $($selectedSub.name)" -ForegroundColor Yellow
    }
}

& az account set --subscription $selectedSub.id
Write-Host "✓ Using subscription: $($selectedSub.name)" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# STEP 3: Configure Terraform variables
# ────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "STEP 3: Configure Infrastructure" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

$tfvarsPath = "infrastructure\terraform-azure\terraform.tfvars"

if (Test-Path $tfvarsPath) {
    Write-Host "✓ terraform.tfvars already exists" -ForegroundColor Green
    Write-Host "  Location: $tfvarsPath" -ForegroundColor Gray
} else {
    Write-Host "Creating terraform.tfvars from template..." -NoNewline
    
    $examplePath = "infrastructure\terraform-azure\terraform.tfvars.example"
    if (Test-Path $examplePath) {
        Copy-Item $examplePath $tfvarsPath
        Write-Host " ✓" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Edit terraform.tfvars with your configuration:" -ForegroundColor Red
        Write-Host ""
        Write-Host "   1. Set database password (db_admin_password)" -ForegroundColor White
        Write-Host "   2. Set JWT secrets (jwt_secret, jwt_refresh_secret)" -ForegroundColor White
        Write-Host "   3. Set encryption key (encryption_key)" -ForegroundColor White
        Write-Host "   4. Add payment keys if needed (Stripe, PayStack, etc.)" -ForegroundColor White
        Write-Host "   5. Add Firebase credentials" -ForegroundColor White
        Write-Host "   6. Add SendGrid API key" -ForegroundColor White
        Write-Host "   7. Add Sentry DSN for error tracking" -ForegroundColor White
        Write-Host ""
        Write-Host "   Edit: $tfvarsPath" -ForegroundColor Cyan
        Write-Host ""
        
        $editNow = Read-Host "Open terraform.tfvars in editor now? (y/n)"
        if ($editNow -eq 'y') {
            & code $tfvarsPath
            Read-Host "Press Enter after editing to continue"
        }
    } else {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "Template not found: $examplePath" -ForegroundColor Red
        exit 1
    }
}

# ────────────────────────────────────────────────────────────────────────────
# STEP 4: Initialize Terraform
# ────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "STEP 4: Initialize Terraform" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

Push-Location "infrastructure\terraform-azure"

Write-Host "Running: terraform init" -NoNewline
& terraform init -upgrade
if ($LASTEXITCODE -ne 0) {
    Write-Host " ❌" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host " ✓" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# STEP 5: Plan deployment
# ────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "STEP 5: Preview Infrastructure Changes" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "Running: terraform plan" -NoNewline
& terraform plan -out=tfplan
if ($LASTEXITCODE -ne 0) {
    Write-Host " ❌" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host " ✓" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# STEP 6: Deploy infrastructure
# ────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "STEP 6: Deploy Infrastructure to Azure" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  This will create:" -ForegroundColor Cyan
Write-Host "   • AKS Kubernetes cluster" -ForegroundColor White
Write-Host "   • Azure PostgreSQL (geo-replicated)" -ForegroundColor White
Write-Host "   • Azure Container Registry" -ForegroundColor White
Write-Host "   • Virtual Networks + Security" -ForegroundColor White
Write-Host "   • Load balancers + Front Door" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Deploy to Azure? (yes/no)"
if ($confirm -ne 'yes') {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    Pop-Location
    exit 0
}

Write-Host ""
Write-Host "Deploying... This will take 15-25 minutes." -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
& terraform apply tfplan
$deployResult = $LASTEXITCODE
$duration = $(Get-Date) - $startTime

if ($deployResult -eq 0) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ Infrastructure Deployed Successfully!                      ║" -ForegroundColor Green
    Write-Host "║  Duration: $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Terraform Outputs:" -ForegroundColor Cyan
    & terraform output -json | ConvertFrom-Json | Get-Member -MemberType NoteProperty | ForEach-Object {
        $value = (& terraform output $_.Name 2>$null) -join ', '
        Write-Host "  $($_.Name): $value" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# STEP 7: Get AKS credentials
# ────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "STEP 7: Configure kubectl" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

$rg = & terraform output -raw resource_group_name
$cluster = & terraform output -raw aks_cluster_name

Write-Host "Getting AKS credentials..." -NoNewline
& az aks get-credentials --resource-group $rg --name $cluster --overwrite-existing
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
}

Write-Host "Testing kubectl connection..." -NoNewline
$pods = & kubectl get nodes 2>&1
if ($?) {
    Write-Host " ✓" -ForegroundColor Green
    Write-Host ""
    Write-Host "Cluster nodes:" -ForegroundColor Cyan
    & kubectl get nodes
} else {
    Write-Host " ⚠️" -ForegroundColor Yellow
}

Pop-Location

# ────────────────────────────────────────────────────────────────────────────
# STEP 8: Next steps
# ────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Next Steps                                                   ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "1. Deploy Kubernetes applications:" -ForegroundColor Cyan
Write-Host "   .\azure\k8s\setup\01-namespaces.ps1" -ForegroundColor White
Write-Host "   .\azure\k8s\setup\02-secrets.ps1" -ForegroundColor White
Write-Host "   .\azure\k8s\setup\03-helm-charts.ps1" -ForegroundColor White
Write-Host ""
Write-Host "2. Deploy SEWA services:" -ForegroundColor Cyan
Write-Host "   kubectl apply -f azure/k8s/backend-deployment-prod.yaml" -ForegroundColor White
Write-Host "   kubectl apply -f azure/k8s/frontend-deployment.yaml" -ForegroundColor White
Write-Host ""
Write-Host "3. Monitor deployment:" -ForegroundColor Cyan
Write-Host "   kubectl get pods -n sewa-ai" -ForegroundColor White
Write-Host "   kubectl logs -n sewa-ai -l app=sewa-backend --tail=50" -ForegroundColor White
Write-Host ""
Write-Host "4. Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: https://app.sewaxai.health (configure in DNS)" -ForegroundColor White
Write-Host "   API: https://api.sewaxai.health (configure in DNS)" -ForegroundColor White
Write-Host ""

Write-Host "Done! ✓" -ForegroundColor Green
