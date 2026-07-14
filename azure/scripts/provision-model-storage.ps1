# Provision the shared SEWA AI model volume (Azure File) used by all ai-services
# at /models. Idempotent. Run from a machine with `az` logged in (Owner/Contributor
# on the RG + Microsoft.Storage/storageAccounts/write). No secrets are hardcoded.
#
# What it does:
#   1. Creates (if missing) a Storage Account + "models" file share.
#   2. Creates (if missing) the K8s secret `azure-model-file-secret` in the sewa-ai
#      namespace holding the storage account name + key.
# The deployment manifest azure/k8s/ai-services-deployment-prod.yaml mounts this
# share read-only at /models on every ai-service (replacing the old emptyDir).
#
# NOTE: this only provisions the VOLUME. The model WEIGHTS themselves (real trained
# ONNX files, e.g. triage_v2.4.1.onnx) must be uploaded to the share separately —
# e.g. `az storage file upload --account-name <sa> --share-name models --source <file>`
# or via AzCopy/Storage Explorer. Until then, services auto-generate demo ONNX
# (see ai-services/*/main.py _create_demo_onnx) so they stay healthy but are not
# clinically validated.

param(
    [string]$ResourceGroup   = "sewa-ai-production-rg",
    [string]$ClusterName     = "sewa-ai-production-aks",
    [string]$StorageAccount  = "sewamodelsprod",
    [string]$ShareName       = "models",
    [string]$Namespace       = "sewa-ai",
    [string]$SecretName      = "azure-model-file-secret",
    [string]$Region          = "uksouth",
    [string]$Sku             = "Standard_LRS"
)

$ErrorActionPreference = "Stop"

# 1. Storage account (idempotent)
$exists = az storage account show -g $ResourceGroup -n $StorageAccount -o none 2>$null
if (-not $exists) {
    Write-Host "Creating storage account $StorageAccount ..."
    az storage account create -g $ResourceGroup -n $StorageAccount -l $Region --sku $Sku --kind StorageV2 --output none
} else {
    Write-Host "Storage account $StorageAccount already exists."
}

# 2. File share (idempotent)
az storage share create --account-name $StorageAccount --name $ShareName --quota 10 --output none
Write-Host "File share '$ShareName' ready."

# 3. K8s secret holding the account key (idempotent)
$key = az storage account keys list -g $ResourceGroup -n $StorageAccount --query "[0].value" -o tsv
$cmd = "kubectl create secret generic $SecretName -n $Namespace " +
       "--from-literal=azurestorageaccountname=$StorageAccount " +
       "--from-literal=azurestorageaccountkey='$key' " +
       "--dry-run=client -o yaml | kubectl apply -f -"
az aks command invoke -g $ResourceGroup -n $ClusterName -o none -c $cmd
Write-Host "Secret '$SecretName' created/refreshed in namespace '$Namespace'."

Write-Host "Done. Model volume '$ShareName' is mounted read-only at /models by all ai-services."
