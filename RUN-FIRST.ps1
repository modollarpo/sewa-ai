# RUN-FIRST.ps1 - PRE-DEPLOYMENT: Rename old env, login to new Azure subscription
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== SEWA XAI - New Azure Sub: Pre-Flight Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Backup existing .env.azure with timestamp
$oldEnv = "backend\.env.azure"
if (Test-Path $oldEnv) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = ".env.azure.OLD_SECRETS_$stamp"
    Copy-Item -Path $oldEnv -Destination "backend\$backupName"
    Write-Host "[OK] Backed up backend\.env.azure -> backend\$backupName (keys preserved)" -ForegroundColor Green
    $backups = Get-ChildItem backend\*.env.azure.OLD_SECRETS_* -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($backups.Count -gt 5) {
        Write-Host "[INFO] Pruning oldest .env.azure backups (keeping last 5)" -ForegroundColor Cyan
        $backups | Select-Object -Skip 5 | Remove-Item -Force
    }
} else {
    Write-Host "[WARN] No existing backend\.env.azure found (continuing)" -ForegroundColor Yellow
}
Write-Host ""

# 2. Confirm Azure CLI installed
Write-Host "Checking Azure CLI..." -NoNewline
try {
    $azv = & az --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        throw
    }
} catch {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "Azure CLI not installed. Install from: https://aka.ms/installazurecliwindows" -ForegroundColor Red
    exit 1
}

# 3. Login with device code
Write-Host ""
Write-Host "--- Azure Login (Device Code Flow) ---" -ForegroundColor Yellow
& az login --use-device-code
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Azure login failed" -ForegroundColor Red
    exit 1
}

# 4. Select new subscription
$targetSub = "a14702a0-439b-42f5-b31a-8b898adfa965"
Write-Host ""
Write-Host "Setting subscription to: $targetSub" -ForegroundColor Yellow
& az account set --subscription $targetSub
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Could not set subscription" -ForegroundColor Red
    exit 1
}

$selected = & az account show --query '{id:id,name:name}' -o json 2>$null | ConvertFrom-Json
Write-Host ""
Write-Host "[OK] ACTIVE SUBSCRIPTION:" -ForegroundColor Green
Write-Host ("   ID:   {0}" -f $selected.id)
Write-Host ("   Name: {0}" -f $selected.name)

# 5. Confirm
Write-Host ""
$ans = Read-Host "Is this the CORRECT NEW subscription? (y/N)"
if ($ans -notmatch "^[Yy]$") {
    Write-Host "Aborted. Correct subscription with: az account list -o table; az account set -s <ID>" -ForegroundColor Red
    exit 0
}

# 6. Enable execution policy (if needed)
Write-Host ""
Write-Host "Setting PS ExecutionPolicy: RemoteSigned (CurrentUser)..." -NoNewline
try {
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction SilentlyContinue
    Write-Host " [OK]" -ForegroundColor Green
} catch {
    Write-Host " [INFO] Execution policy unchanged (non-admin?)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== PRE-FLIGHT COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEP - Run the infrastructure + deploy script:"
Write-Host "  .\deploy-azure.ps1"
Write-Host ""
