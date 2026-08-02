# deploy-azure.ps1 - SEWA XAI Full Azure Deployment (New Subscription)
# Preserves cross-subscription keys, creates all new Azure infra
# Prereq: .\RUN-FIRST.ps1 completed successfully

param(
  [string]$Location = "uksouth",
  [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

# ============================================================
# PRE-FLIGHT: BACKUP EXISTING .ENV.AZURE (timestamped, preserved)
# ============================================================
$OldEnvPathRaw = "backend\.env.azure"
if (Test-Path $OldEnvPathRaw) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = ".env.azure.OLD_SECRETS_$stamp"
    Copy-Item -Path $OldEnvPathRaw -Destination "backend\$backupName" -ErrorAction SilentlyContinue
    Write-Host ("[BACKUP] Preserved current .env.azure -> backend\{0}" -f $backupName) -ForegroundColor DarkGreen
    # Prune old backups (keep last 10)
    $backups = Get-ChildItem backend\*.env.azure.OLD_SECRETS_* -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($backups -and $backups.Count -gt 10) {
        Write-Host ("[CLEANUP] Pruning {0} oldest backups, keeping latest 10" -f ($backups.Count - 10)) -ForegroundColor DarkGray
        $backups | Select-Object -Skip 10 | Remove-Item -Force -ErrorAction SilentlyContinue
    }
    Write-Host ""
}

# ============================================================
# LOAD PRESERVED SECRETS FROM LATEST BACKUP
# ============================================================
$AllBackups = @(Get-ChildItem backend\*.env.azure.OLD_SECRETS_* -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
$OldEnvPath = $null
if ($AllBackups.Count -gt 0) {
    $OldEnvPath = $AllBackups[0].FullName
}
$Preserved = @{}

if ($OldEnvPath -and (Test-Path $OldEnvPath)) {
    Write-Host "[PREP] Loading preserved keys from latest backup: $(Split-Path $OldEnvPath -Leaf)..." -ForegroundColor Cyan
    $rawContent = Get-Content $OldEnvPath -Raw
    $pattern = '(?m)^([A-Z0-9_]+)=(.*?)(?=\n[A-Z0-9_]+=|\Z)'
    $matches = [regex]::Matches($rawContent, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($m in $matches) {
        $k = $m.Groups[1].Value
        $v = $m.Groups[2].Value.Trim()
        $keep = @(
            'STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PUBLISHABLE_KEY',
            'PAYSTACK_SECRET_KEY','PAYSTACK_PUBLIC_KEY',
            'FLUTTERWAVE_SECRET_KEY','FLUTTERWAVE_PUBLIC_KEY',
            'MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_SHORTCODE','MPESA_PASSKEY',
            'SENDGRID_API_KEY','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','EMAIL_FROM',
            'HUBSPOT_ACCESS_TOKEN','SUPPORT_SLACK_WEBHOOK',
            'ZENDESK_SUBDOMAIN','ZENDESK_EMAIL','ZENDESK_API_TOKEN',
            'TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER',
            'FCM_SERVER_KEY','FIREBASE_PROJECT_ID','FIREBASE_PRIVATE_KEY','FIREBASE_CLIENT_EMAIL',
            'SENTRY_DSN','APPLICATIONINSIGHTS_CONNECTION_STRING',
            'NHS_TERMINOLOGY_API_KEY','NHS_PDS_API_KEY',
            'AZURE_CONFIDENTIAL_LEDGER_URL'
        )
        if ($keep -contains $k) {
            $Preserved[$k] = $v
        }
    }
    Write-Host ("   Loaded {0} preserved keys" -f $Preserved.Count) -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[WARN] No .env.azure.OLD_SECRETS_* backup found - preserved keys will be blank" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# CONFIGURATION
# ============================================================
$RgName = "sewa-ai-{0}-rg" -f $Environment
$BaseName = "sewaai{0}" -f $Environment.Substring(0,3)
$SubId = & az account show --query id -o tsv 2>$null
$TenantId = & az account show --query tenantId -o tsv 2>$null

if (-not $SubId) {
    Write-Host "[ERROR] Not logged into Azure. Run first: .\RUN-FIRST.ps1" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== SEWA XAI: New Azure Subscription Deployment ===" -ForegroundColor Cyan
Write-Host ("Subscription ID: {0}" -f $SubId)
Write-Host ("Tenant ID:       {0}" -f $TenantId)
Write-Host ("Resource Group:  {0}" -f $RgName)
Write-Host ("Location:        {0}" -f $Location)
Write-Host ""

function Write-Step($num, $total, $msg) {
    Write-Host ("[{0}/{1}] {2}" -f $num, $total, $msg) -ForegroundColor Green
}

# ============================================================
# 1. RESOURCE GROUP
# ============================================================
Write-Step 1 13 ("Creating Resource Group: {0}" -f $RgName)
& az group create -n $RgName -l $Location --output none | Out-Null
Write-Host "   Done." -ForegroundColor Green

# ============================================================
# 2. ACR
# ============================================================
Write-Step 2 13 "Creating Azure Container Registry..."
$AcrName = "{0}acr" -f $BaseName
& az acr create -g $RgName -n $AcrName --sku Premium --admin-enabled true -l $Location --output none 2>$null | Out-Null
$AcrLogin = & az acr show -g $RgName -n $AcrName --query loginServer -o tsv
Write-Host ("   ACR: {0}" -f $AcrLogin) -ForegroundColor Green

# ============================================================
# 3. POSTGRESQL FLEXIBLE SERVER
# ============================================================
Write-Step 3 13 "Creating PostgreSQL Flexible Server..."
$PgName = "{0}-pg" -f $BaseName
$PgUser = "sewaadmin"
$chars = (48..57) + (65..90) + (97..122)
$PgPass = (-join ($chars | Get-Random -Count 24 | ForEach-Object { [char]$_ })) + "!A1"
Write-Host ("   [SAVE] PostgreSQL Admin USER: {0}" -f $PgUser) -ForegroundColor Yellow
Write-Host ("   [SAVE] PostgreSQL Admin PASS: {0}" -f $PgPass) -ForegroundColor Red
Write-Host "   [IMPORTANT] SAVE THE PASSWORD ABOVE - required for migrations later!" -ForegroundColor Red

& az postgres flexible-server create -g $RgName -n $PgName -l $Location `
    --admin-user $PgUser --admin-password $PgPass `
    --sku-name Standard_B2s --tier Burstable --storage-size 64 --version 15 `
    --public-access 0.0.0.0-255.255.255.255 --output none 2>$null | Out-Null
$PgHost = & az postgres flexible-server show -g $RgName -n $PgName --query fullyQualifiedDomainName -o tsv
& az postgres flexible-server db create -g $RgName --server-name $PgName --database-name sewa_ai --output none | Out-Null
Write-Host ("   PG Host: {0}" -f $PgHost) -ForegroundColor Green

# ============================================================
# 4. REDIS
# ============================================================
Write-Step 4 13 "Creating Azure Cache for Redis..."
$RedisName = "{0}-redis" -f $BaseName
& az redis create -g $RgName -n $RedisName -l $Location --sku Basic --vm-size c0 --output none 2>$null | Out-Null
$RedisKey  = & az redis list-keys -g $RgName -n $RedisName --query primaryKey -o tsv
$RedisHost = & az redis show -g $RgName -n $RedisName --query hostName -o tsv
Write-Host ("   Redis: {0}" -f $RedisHost) -ForegroundColor Green

# ============================================================
# 5. STORAGE ACCOUNT (DICOM)
# ============================================================
Write-Step 5 13 "Creating Storage Account (DICOM/Scans)..."
$StorageName = "{0}dicom" -f $BaseName
& az storage account create -g $RgName -n $StorageName -l $Location --sku Standard_LRS --kind StorageV2 --output none 2>$null | Out-Null
$StorageKey  = & az storage account keys list -g $RgName --account-name $StorageName --query "[0].value" -o tsv
$StorageConn = "DefaultEndpointsProtocol=https;AccountName={0};AccountKey={1};EndpointSuffix=core.windows.net" -f $StorageName, $StorageKey
@('scans','gradcam','reports') | ForEach-Object {
    & az storage container create -n $_ --account-name $StorageName --account-key $StorageKey --output none | Out-Null
}
Write-Host ("   Storage: {0}" -f $StorageName) -ForegroundColor Green

# ============================================================
# 6. KEY VAULT
# ============================================================
Write-Step 6 13 "Creating Azure Key Vault..."
$KVName = "{0}-kv" -f $BaseName
& az keyvault create -g $RgName -n $KVName -l $Location --sku standard --enable-rbac-authorization false --output none 2>$null | Out-Null
Write-Host ("   Key Vault: {0}" -f $KVName) -ForegroundColor Green

# ============================================================
# 7. SERVICE BUS
# ============================================================
Write-Step 7 13 "Creating Azure Service Bus..."
$SbName = "{0}-bus" -f $BaseName
& az servicebus namespace create -g $RgName -n $SbName -l $Location --sku Standard --output none 2>$null | Out-Null
@('sewa-scan-triage','sewa-hl7-messages') | ForEach-Object {
    & az servicebus queue create -g $RgName --namespace-name $SbName -n $_ --output none | Out-Null
}
$SbConn = & az servicebus namespace authorization-rule keys list -g $RgName --namespace-name $SbName --name RootManageSharedAccessKey --query primaryConnectionString -o tsv
Write-Host ("   Service Bus: {0}" -f $SbName) -ForegroundColor Green

# ============================================================
# 8. SIGNALR
# ============================================================
Write-Step 8 13 "Creating Azure SignalR..."
$SignalrName = "{0}-signalr" -f $BaseName
& az signalr create -g $RgName -n $SignalrName --sku Free_F1 --unit-count 1 --service-mode Default -l $Location --output none 2>$null | Out-Null
$SignalrConn = & az signalr key list -g $RgName -n $SignalrName --query primaryConnectionString -o tsv
Write-Host ("   SignalR: {0}" -f $SignalrName) -ForegroundColor Green

# ============================================================
# 9. LOG ANALYTICS WORKSPACE
# ============================================================
Write-Step 9 13 "Creating Log Analytics Workspace..."
$LawName = "{0}-law" -f $BaseName
& az monitor log-analytics workspace create -g $RgName -n $LawName -l $Location --output none 2>$null | Out-Null
$LawId = & az monitor log-analytics workspace show -g $RgName -n $LawName --query customerId -o tsv
Write-Host ("   Law ID: {0}" -f $LawId) -ForegroundColor Green

# ============================================================
# 10. STATIC WEB APP (FRONTEND) - skipped; push.ps1 handles or manual
# ============================================================
Write-Step 10 13 "Skipping Static Web App auto-create (handled by push.ps1 or manual later)" -ForegroundColor Yellow

# ============================================================
# 11. AKS CLUSTER - provisioned in background
# ============================================================
Write-Step 11 13 "Starting AKS Cluster provisioning (3x D4s_v5) in background..."
$AksName = "{0}-aks" -f $BaseName
& az aks create -g $RgName -n $AksName -l $Location `
    --node-count 3 --node-vm-size Standard_D4s_v5 --kubernetes-version 1.30.4 `
    --generate-ssh-keys --enable-addons monitoring --enable-managed-identity --attach-acr $AcrName `
    --no-wait
Write-Host ("   AKS '{0}' provisioning started (~10 mins)." -f $AksName) -ForegroundColor Green

# ============================================================
# 12. GENERATE NEW backend/.env.azure (new infra + preserved keys)
# ============================================================
Write-Step 12 13 "Generating NEW backend/.env.azure..."

function New-RandomHex($len=32) {
    $bytes = New-Object byte[] $len
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { "{0:x2}" -f $_ }) -join ""
}
$JwtSecret        = New-RandomHex 32
$JwtRefreshSecret = New-RandomHex 32
$EncryptionKey    = New-RandomHex 32

function P($k, $def='') {
    if ($Preserved.ContainsKey($k) -and $Preserved[$k]) {
        return $Preserved[$k]
    } else {
        return $def
    }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# ============================================================")
[void]$sb.AppendLine("# SEWA XAI - Azure Backend Environment")
[void]$sb.AppendLine(("# Deployment: NEW AZURE SUBSCRIPTION ({0})" -f $SubId))
[void]$sb.AppendLine(("# Generated: {0}" -f (Get-Date -Format s)))
[void]$sb.AppendLine("# ============================================================")
[void]$sb.AppendLine("DEPLOY_TARGET=azure")
[void]$sb.AppendLine("NODE_ENV=production")
[void]$sb.AppendLine("PORT=3000")
[void]$sb.AppendLine("REGION=uk")
[void]$sb.AppendLine("APP_URL=https://api.sewaxai.health")
[void]$sb.AppendLine("CORS_ORIGINS=https://app.sewaxai.health,https://superadmin.sewaxai.health")
[void]$sb.AppendLine("LOG_LEVEL=info")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- AZURE IDENTITY (NEW) --------------------------")
[void]$sb.AppendLine(("AZURE_SUBSCRIPTION_ID={0}" -f $SubId))
[void]$sb.AppendLine(("AZURE_TENANT_ID={0}" -f $TenantId))
[void]$sb.AppendLine(("AZURE_RESOURCE_GROUP={0}" -f $RgName))
[void]$sb.AppendLine(("AZURE_LOCATION={0}" -f $Location))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- DATABASE (NEW) --------------------------------")
[void]$sb.AppendLine(("DATABASE_URL=postgresql://{0}:`{1}@{2}:5432/sewa_ai?sslmode=require" -f $PgUser, $PgPass, $PgHost))
[void]$sb.AppendLine(("AZURE_PG_HOST={0}" -f $PgHost))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- CACHE (NEW) -----------------------------------")
[void]$sb.AppendLine(("REDIS_URL=rediss://:`{0}@{1}:6380/0" -f $RedisKey, $RedisHost))
[void]$sb.AppendLine(("AZURE_REDIS_HOST={0}" -f $RedisHost))
[void]$sb.AppendLine("AZURE_REDIS_PORT=6380")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- SECURITY KEYS (NEW RANDOM) --------------------")
[void]$sb.AppendLine(("JWT_SECRET={0}" -f $JwtSecret))
[void]$sb.AppendLine(("JWT_REFRESH_SECRET={0}" -f $JwtRefreshSecret))
[void]$sb.AppendLine(("ENCRYPTION_KEY={0}" -f $EncryptionKey))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- AI SERVICES (AKS INTERNAL DNS) ----------------")
[void]$sb.AppendLine("AI_SERVICE_URL=http://ai-triage:8000")
[void]$sb.AppendLine("VLM_SERVICE_URL=http://ai-vlm:8001")
[void]$sb.AppendLine("PATHOLOGY_SERVICE_URL=http://ai-pathology:8002")
[void]$sb.AppendLine("METACOGNITION_SERVICE_URL=http://ai-metacognition:8003")
[void]$sb.AppendLine("FL_SERVICE_URL=http://ai-federated:8004")
[void]$sb.AppendLine("CL_SERVICE_URL=http://ai-continuous:8005")
[void]$sb.AppendLine("MAMMOGRAPHY_SERVICE_URL=http://ai-mammography:8007")
[void]$sb.AppendLine("RETINAL_SERVICE_URL=http://ai-retinal:8008")
[void]$sb.AppendLine("UNCERTAINTY_SERVICE_URL=http://ai-uncertainty:8009")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- STORAGE (NEW) ---------------------------------")
[void]$sb.AppendLine(("AZURE_STORAGE_CONNECTION_STRING={0}" -f $StorageConn))
[void]$sb.AppendLine("AZURE_STORAGE_CONTAINER=scans")
[void]$sb.AppendLine("AZURE_GRADCAM_CONTAINER=gradcam")
[void]$sb.AppendLine("AZURE_REPORTS_CONTAINER=reports")
[void]$sb.AppendLine(("AZURE_STORAGE_ACCOUNT={0}" -f $StorageName))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- SERVICE BUS (NEW) -----------------------------")
[void]$sb.AppendLine(("AZURE_SERVICEBUS_CONNECTION_STRING={0}" -f $SbConn))
[void]$sb.AppendLine("AZURE_SERVICEBUS_TRIAGE_QUEUE=sewa-scan-triage")
[void]$sb.AppendLine("AZURE_SERVICEBUS_HL7_QUEUE=sewa-hl7-messages")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- KEY VAULT (NEW) -------------------------------")
[void]$sb.AppendLine(("AZURE_KEY_VAULT_URI=https://{0}.vault.azure.net/" -f $KVName))
[void]$sb.AppendLine(("AZURE_KEY_VAULT_NAME={0}" -f $KVName))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- SIGNALR (NEW) ---------------------------------")
[void]$sb.AppendLine(("AZURE_SIGNALR_CONNECTION_STRING={0}" -f $SignalrConn))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- AKS / ACR (NEW) -------------------------------")
[void]$sb.AppendLine(("AKS_CLUSTER_NAME={0}" -f $AksName))
[void]$sb.AppendLine(("ACR_LOGIN_SERVER={0}" -f $AcrLogin))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- LOG ANALYTICS (NEW) ---------------------------")
[void]$sb.AppendLine(("AZURE_LOG_ANALYTICS_WORKSPACE_ID={0}" -f $LawId))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- PAYMENTS (PRESERVED) --------------------------")
[void]$sb.AppendLine(("STRIPE_SECRET_KEY={0}" -f (P STRIPE_SECRET_KEY)))
[void]$sb.AppendLine(("STRIPE_WEBHOOK_SECRET={0}" -f (P STRIPE_WEBHOOK_SECRET)))
[void]$sb.AppendLine(("STRIPE_PUBLISHABLE_KEY={0}" -f (P STRIPE_PUBLISHABLE_KEY)))
[void]$sb.AppendLine(("PAYSTACK_SECRET_KEY={0}" -f (P PAYSTACK_SECRET_KEY)))
[void]$sb.AppendLine(("PAYSTACK_PUBLIC_KEY={0}" -f (P PAYSTACK_PUBLIC_KEY)))
[void]$sb.AppendLine(("FLUTTERWAVE_SECRET_KEY={0}" -f (P FLUTTERWAVE_SECRET_KEY)))
[void]$sb.AppendLine(("FLUTTERWAVE_PUBLIC_KEY={0}" -f (P FLUTTERWAVE_PUBLIC_KEY)))
[void]$sb.AppendLine(("MPESA_CONSUMER_KEY={0}" -f (P MPESA_CONSUMER_KEY)))
[void]$sb.AppendLine(("MPESA_CONSUMER_SECRET={0}" -f (P MPESA_CONSUMER_SECRET)))
[void]$sb.AppendLine(("MPESA_SHORTCODE={0}" -f (P MPESA_SHORTCODE)))
[void]$sb.AppendLine(("MPESA_PASSKEY={0}" -f (P MPESA_PASSKEY)))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- CRM / SUPPORT (PRESERVED) ---------------------")
[void]$sb.AppendLine(("HUBSPOT_ACCESS_TOKEN={0}" -f (P HUBSPOT_ACCESS_TOKEN)))
[void]$sb.AppendLine(("SUPPORT_SLACK_WEBHOOK={0}" -f (P SUPPORT_SLACK_WEBHOOK)))
[void]$sb.AppendLine(("ZENDESK_SUBDOMAIN={0}" -f (P ZENDESK_SUBDOMAIN)))
[void]$sb.AppendLine(("ZENDESK_EMAIL={0}" -f (P ZENDESK_EMAIL)))
[void]$sb.AppendLine(("ZENDESK_API_TOKEN={0}" -f (P ZENDESK_API_TOKEN)))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- FIREBASE / PUSH (PRESERVED) -------------------")
[void]$sb.AppendLine(("FIREBASE_PROJECT_ID={0}" -f (P FIREBASE_PROJECT_ID)))
$fireKey = P FIREBASE_PRIVATE_KEY
[void]$sb.AppendLine(("FIREBASE_PRIVATE_KEY={0}" -f $fireKey))
[void]$sb.AppendLine(("FIREBASE_CLIENT_EMAIL={0}" -f (P FIREBASE_CLIENT_EMAIL)))
[void]$sb.AppendLine(("FCM_SERVER_KEY={0}" -f (P FCM_SERVER_KEY)))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- EMAIL (PRESERVED) -----------------------------")
[void]$sb.AppendLine(("SENDGRID_API_KEY={0}" -f (P SENDGRID_API_KEY)))
[void]$sb.AppendLine(("SMTP_HOST={0}" -f (P SMTP_HOST "smtp.sendgrid.net")))
[void]$sb.AppendLine(("SMTP_PORT={0}" -f (P SMTP_PORT "587")))
[void]$sb.AppendLine(("SMTP_USER={0}" -f (P SMTP_USER "apikey")))
[void]$sb.AppendLine(("SMTP_PASS={0}" -f (P SMTP_PASS)))
[void]$sb.AppendLine(("EMAIL_FROM={0}" -f (P EMAIL_FROM "info@sewaxai.health")))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- TWILIO (PRESERVED) ----------------------------")
[void]$sb.AppendLine(("TWILIO_ACCOUNT_SID={0}" -f (P TWILIO_ACCOUNT_SID)))
[void]$sb.AppendLine(("TWILIO_AUTH_TOKEN={0}" -f (P TWILIO_AUTH_TOKEN)))
[void]$sb.AppendLine(("TWILIO_FROM_NUMBER={0}" -f (P TWILIO_FROM_NUMBER)))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- MONITORING (PRESERVED) ------------------------")
[void]$sb.AppendLine(("SENTRY_DSN={0}" -f (P SENTRY_DSN)))
[void]$sb.AppendLine(("APPLICATIONINSIGHTS_CONNECTION_STRING={0}" -f (P APPLICATIONINSIGHTS_CONNECTION_STRING)))
[void]$sb.AppendLine(("AZURE_CONFIDENTIAL_LEDGER_URL={0}" -f (P AZURE_CONFIDENTIAL_LEDGER_URL)))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("# -- NHS SERVICES (PRESERVED) -----------------------")
[void]$sb.AppendLine(("NHS_TERMINOLOGY_API_KEY={0}" -f (P NHS_TERMINOLOGY_API_KEY)))
[void]$sb.AppendLine(("NHS_PDS_API_KEY={0}" -f (P NHS_PDS_API_KEY)))
[void]$sb.AppendLine("")

$targetEnvPath = Join-Path $PWD "backend\.env.azure"
[System.IO.File]::WriteAllText($targetEnvPath, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host ("   Done. Written backend\.env.azure ({0} preserved keys + new infra config)" -f $Preserved.Count) -ForegroundColor Green

# ============================================================
# 13. WAIT FOR AKS -> RUN push.ps1 (application deployment)
# ============================================================
Write-Step 13 13 ("Waiting for AKS cluster {0} (~5-12 mins)..." -f $AksName)
& az aks wait -g $RgName -n $AksName --created --interval 30 --timeout 1800

Write-Host "   AKS Ready! Fetching kubeconfig..." -ForegroundColor Green
& az aks get-credentials -g $RgName -n $AksName --overwrite-existing --admin

Write-Host ""
Write-Host "=== INFRASTRUCTURE PROVISIONING COMPLETE ===" -ForegroundColor Cyan
Write-Host ("  AKS Cluster:    {0}" -f $AksName)
Write-Host ("  ACR:            {0}" -f $AcrLogin)
Write-Host ("  PostgreSQL:     {0}" -f $PgHost)
Write-Host ("  Redis:          {0}" -f $RedisHost)
Write-Host ("  Storage Acct:   {0}" -f $StorageName)
Write-Host ("  Key Vault:      {0}" -f $KVName)
Write-Host ("  Service Bus:    {0}" -f $SbName)
Write-Host ("  SignalR:        {0}" -f $SignalrName)
Write-Host ("  Log Analytics:  {0}" -f $LawName)
Write-Host ""

# Run main app deployment script
if (Test-Path ".\push.ps1") {
    Write-Host "=== Running push.ps1: Build images & deploy application to AKS ===" -ForegroundColor Cyan
    .\push.ps1
} else {
    Write-Host "[WARN] push.ps1 not found in c:\sewa_extract. Run it manually after this finishes." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== [DONE] DEPLOYMENT SCRIPT FINISHED ===" -ForegroundColor Green
Write-Host "[REMINDER] PostgreSQL Admin password from Step 3 is required for DB access."
Write-Host "[SAFE]   Old env retained as: backend\.env.azure.OLD_SECRETS_* (timestamped backups). Delete once new platform verified for 48h."
Write-Host ""
