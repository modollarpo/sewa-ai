# deploy-azure-quick-check.ps1 - Quick validation of new Azure resources + K8s state
param(
  [string]$RgName = "sewa-ai-production-rg",
  [string]$Location = "uksouth"
)

$ErrorActionPreference = "Continue"

Write-Host "=== SEWA XAI - Azure Resource + Cluster Validation ===" -ForegroundColor Cyan
Write-Host ("Resource Group: {0} | Location: {1}" -f $RgName, $Location)
Write-Host ""

function Check($name, $cmd) {
    Write-Host ("{0,-34}" -f ("Checking {0}" -f $name)) -NoNewline
    try {
        $r = Invoke-Expression $cmd 2>$null
        if ($r -and $r -notmatch '^\s*$') {
            Write-Host " [OK]" -ForegroundColor Green
            return $true
        } else {
            Write-Host " [WARN] Missing/Empty" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host " [FAIL]" -ForegroundColor Red
        return $false
    }
}

# -- ARM Resources --------------------------------------------
Check "Resource Group exists"      "az group exists -n $RgName"
Check "ACR Registry"               "az acr list -g $RgName --query [0].loginServer -o tsv"
Check "PostgreSQL Flexible Server" "az postgres flexible-server list -g $RgName --query [0].fullyQualifiedDomainName -o tsv"
Check "Redis Cache"                "az redis list -g $RgName --query [0].hostName -o tsv"
Check "Storage Account"            "az storage account list -g $RgName --query [0].name -o tsv"
Check "Key Vault"                  "az keyvault list -g $RgName --query [0].name -o tsv"
Check "Service Bus Namespace"      "az servicebus namespace list -g $RgName --query [0].name -o tsv"
Check "SignalR Service"            "az signalr list -g $RgName --query [0].name -o tsv"
Check "Log Analytics Workspace"    "az monitor log-analytics workspace list -g $RgName --query [0].customerId -o tsv"
$aksOK = Check "AKS Cluster"       "az aks list -g $RgName --query [0].name -o tsv"

Write-Host ""

# -- AKS / Kubernetes -----------------------------------------
if ($aksOK) {
    $aksName = & az aks list -g $RgName --query '[0].name' -o tsv
    Write-Host ("AKS Cluster Name: {0}" -f $aksName) -ForegroundColor Yellow
    & az aks get-credentials -g $RgName -n $aksName --overwrite-existing --admin 2>$null | Out-Null

    Write-Host ""
    Write-Host "--- Kubernetes Nodes ---" -ForegroundColor Yellow
    & kubectl get nodes -o wide 2>$null
    Write-Host ""

    Write-Host "--- All Pods (sewa-ai namespace) ---" -ForegroundColor Yellow
    & kubectl get pods -n sewa-ai -o wide 2>$null
    Write-Host ""

    Write-Host "--- All Services ---" -ForegroundColor Yellow
    & kubectl get svc -n sewa-ai 2>$null
    Write-Host ""
} else {
    Write-Host "AKS not ready yet - re-run this script in ~5 minutes." -ForegroundColor Yellow
}
