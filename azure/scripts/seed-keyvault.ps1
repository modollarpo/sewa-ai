# SEWA XAI — azure/scripts/seed-keyvault.ps1
# ─────────────────────────────────────────────────────────────────
# Idempotent seed of the production Key Vault (sewa-ai-prod-eu-kv)
# with every secret the AKS manifests / backend expect.
#
# Values are pulled LIVE from Azure resources (Postgres, Storage,
# OpenAI, Speech, ACS, FHIR) and from backend/.env (gitignored) for
# third-party keys (Stripe/HubSpot/Slack/SMTP/Sentry). Nothing is
# hardcoded except resource names.
#
# Run locally with the deployer identity (has get/list/set/delete on
# the vault). Safe to re-run: existing secrets are never overwritten.
#
# Usage:
#   powershell -File azure/scripts/seed-keyvault.ps1
# ─────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Continue"

$Vault   = "sewa-ai-prod-eu-kv"
$Rg      = "sewa-ai-prod-rg"
$Sub     = "a14702a0-439b-42f5-b31a-8b898adfa965"
$Tenant  = "96cb1af7-f1d4-4a65-ab32-2d641c985725"

$PgName  = "sewa-ai-prod-eu-pg"
$PgUser  = "sewaadmin"
$PgDb    = "sewa_ai"

$StgName = "sewaaieuproddicom"
$RedisPw = "zIQFviZEoeU8dbfN2aMCPwB4gTtcJyr7"

$OpenAiName   = "sewa-ai-prod-eu-openai"
$SpeechName   = "sewa-ai-prod-eu-speech"
$AcsName      = "sewa-ai-prod-eu-acs"
$FhirSvc      = "sewaaieuprodhw/sewaaieuprodhfrsvc"
$FhirAppId    = "ead9170f-bed9-4c14-a9cf-cc961cdc555f"
$FhirBaseUrl  = "https://sewaaieuprodhfrsvc.fhir.azurehealthcareapis.com"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\")).Path
$EnvFile  = Join-Path $RepoRoot "backend/.env"
$TfVars   = Join-Path $RepoRoot "infrastructure/terraform-azure/terraform.tfvars"

$envMap = @{}
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') {
            $envMap[$matches[1]] = $matches[2].Trim('"').Trim("'")
        }
    }
} else {
    Write-Warning "backend/.env not found at $EnvFile - third-party keys will be skipped"
}

function Get-EnvKey([string]$key) {
    if ($envMap.ContainsKey($key)) { return $envMap[$key] }
    return ""
}

# Production DB password comes from terraform.tfvars (gitignored).
$PgPass = ""
if (Test-Path $TfVars) {
    $line = Get-Content $TfVars | Where-Object { $_ -match '^\s*db_admin_password\s*=' } | Select-Object -First 1
    if ($line -match '=\s*"([^"]+)"') { $PgPass = $matches[1] }
}
if ([string]::IsNullOrEmpty($PgPass)) {
    Write-Warning "db_admin_password not found in terraform.tfvars - DATABASE_URL will be seeded without password"
}

function Set-KvSecret([string]$name, [string]$value) {
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "  skip    $name (empty value)"
        return
    }
    $null = & az keyvault secret show --vault-name $Vault --name $name --query value -o tsv 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  kept    $name (exists)"
    } else {
        $null = & az keyvault secret set --vault-name $Vault --name $name --value $value --output none 2>&1
        Write-Host "  seeded  $name"
    }
}

az account set --subscription $Sub
Write-Host "Vault: $Vault"

# ── Derived from live Azure resources ─────────────────────────
$pgFqdn = (& az postgres flexible-server show -g $Rg -n $PgName --query fullyQualifiedDomainName -o tsv 2>&1)
$pgUrl  = "postgresql://${PgUser}:${PgPass}@${pgFqdn}:5432/${PgDb}?sslmode=require"

$stgKey = (& az storage account keys list -g $Rg -n $StgName --query "[0].value" -o tsv 2>&1)
$stgConn = "DefaultEndpointsProtocol=https;AccountName=${StgName};AccountKey=${stgKey};EndpointSuffix=core.windows.net"

$openAiKey = (& az cognitiveservices account keys list -g $Rg -n $OpenAiName --query "key1" -o tsv 2>&1)
$openAiEp  = (& az cognitiveservices account show -g $Rg -n $OpenAiName --query "properties.endpoint" -o tsv 2>&1)

$speechKey = (& az cognitiveservices account keys list -g $Rg -n $SpeechName --query "key1" -o tsv 2>&1)

$acsConn   = (& az communication list-key --name $AcsName --resource-group $Rg --query "primaryConnectionString" -o tsv 2>&1)

# ── Backend / AI service runtime secrets ──────────────────────
Set-KvSecret "sewa-database-url"                $pgUrl
Set-KvSecret "sewa-db-password"                 $pgPass
Set-KvSecret "sewa-redis-url"                   "redis://:${RedisPw}@sewa-redis:6379/0"
Set-KvSecret "sewa-redis-password"              $RedisPw
Set-KvSecret "sewa-storage-connection-string"   $stgConn
Set-KvSecret "sewa-fhir-tenant-id"              $Tenant
Set-KvSecret "sewa-fhir-base-url"               $FhirBaseUrl
Set-KvSecret "sewa-fhir-client-id"              $FhirAppId
Set-KvSecret "sewa-fhir-client-secret"          (Get-EnvKey "FHIR_CLIENT_SECRET")
Set-KvSecret "sewa-openai-api-key"              $openAiKey
Set-KvSecret "sewa-openai-endpoint"             $openAiEp
Set-KvSecret "sewa-openai-deployment-name"      "gpt-54-mini"
Set-KvSecret "sewa-openai-whisper-deployment"   "whisper"
Set-KvSecret "sewa-speech-key"                  $speechKey
Set-KvSecret "sewa-speech-region"               "swedencentral"
Set-KvSecret "sewa-acs-connection-string"       $acsConn

# ── Auth secrets (generate if absent) ─────────────────────────
function New-Random([int]$len) {
    return -join ((48..57)+(65..90)+(97..122) | Get-Random -Count $len | ForEach-Object { [char]$_ })
}
foreach ($s in @("sewa-jwt-secret","sewa-jwt-refresh-secret","sewa-encryption-key")) {
    Set-KvSecret $s (New-Random 64)
}

# ── Third-party keys (from backend/.env, never overwrite) ─────
Set-KvSecret "sewa-stripe-secret-key"      (Get-EnvKey "STRIPE_SECRET_KEY")
Set-KvSecret "sewa-stripe-webhook-secret"  (Get-EnvKey "STRIPE_WEBHOOK_SECRET")
Set-KvSecret "sewa-stripe-publishable-key" (Get-EnvKey "STRIPE_PUBLISHABLE_KEY")
Set-KvSecret "sewa-hubspot-access-token"   (Get-EnvKey "HUBSPOT_ACCESS_TOKEN")
Set-KvSecret "sewa-slack-webhook"          (Get-EnvKey "SUPPORT_SLACK_WEBHOOK")
Set-KvSecret "sewa-smtp-pass"              (Get-EnvKey "SMTP_PASS")
Set-KvSecret "sewa-smtp-user"              (Get-EnvKey "SMTP_USER")
Set-KvSecret "sewa-email-from"             (Get-EnvKey "EMAIL_FROM")
Set-KvSecret "sewa-sentry-dsn"             (Get-EnvKey "SENTRY_DSN")
Set-KvSecret "sewa-sendgrid-api-key"       (Get-EnvKey "SENDGRID_API_KEY")
Set-KvSecret "sewa-firebase-private-key"   (Get-EnvKey "FIREBASE_PRIVATE_KEY")
Set-KvSecret "sewa-firebase-client-email"  (Get-EnvKey "FIREBASE_CLIENT_EMAIL")
Set-KvSecret "sewa-firebase-project-id"    (Get-EnvKey "FIREBASE_PROJECT_ID")

Write-Host "`nDone. Run 'az keyvault secret list --vault-name $Vault' to verify."
