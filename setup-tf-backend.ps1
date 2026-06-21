# ───────────────────────────────
# SEWA AI Terraform Backend Setup
# ───────────────────────────────

# Variables — update if needed
$rgName       = "sewa-ai-tfstate-rg"
$location     = "uksouth"
$storageName  = "sewaaitfstate"      # must be globally unique
$containerName = "tfstate"

# ───────────────────────────────
# Step 1: Log in to Azure CLI
# ───────────────────────────────
Write-Host "`nLogging in to Azure..."
az login

# Optionally set the subscription (choose your number from az login)
# az account set --subscription "15178061-4b15-46ed-9c4a-38ce0b485428"

# ───────────────────────────────
# Step 2: Create Resource Group
# ───────────────────────────────
Write-Host "`nCreating Resource Group..."
az group create `
  --name $rgName `
  --location $location

# ───────────────────────────────
# Step 3: Create Storage Account
# ───────────────────────────────
Write-Host "`nCreating Storage Account..."
az storage account create `
  --name $storageName `
  --resource-group $rgName `
  --location $location `
  --sku Standard_LRS `
  --kind StorageV2 `
  --encryption-services blob

# ───────────────────────────────
# Step 4: Create Blob Container
# ───────────────────────────────
Write-Host "`nCreating Blob Container for Terraform state..."
az storage container create `
  --name $containerName `
  --account-name $storageName

Write-Host "`n✅ Terraform backend is ready!"
Write-Host "Resource Group: $rgName"
Write-Host "Storage Account: $storageName"
Write-Host "Container: $containerName"