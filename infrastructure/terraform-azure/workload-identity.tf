# SEWA XAI — Workload Identity (User-Assigned Managed Identities)
# For Kubernetes service accounts to authenticate to Azure services (Key Vault, etc.)

# Backend Workload Identity
resource "azurerm_user_assigned_identity" "backend" {
  name                = "${local.name}-${local.env}-backend-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = local.location
  tags                = local.tags
}

# AI Services Workload Identity
resource "azurerm_user_assigned_identity" "ai_services" {
  name                = "${local.name}-${local.env}-ai-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = local.location
  tags                = local.tags
}

# Federated identity credentials for Kubernetes service accounts
resource "azurerm_federated_identity_credential" "backend" {
  name                = "${local.name}-backend-sa"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.backend.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.aks.oidc_issuer_url
  subject             = "system:serviceaccount:sewa-ai:sewa-backend-sa"
}

resource "azurerm_federated_identity_credential" "ai_services" {
  name                = "${local.name}-ai-sa"
  resource_group_name = azurerm_resource_group.main.name
  parent_id           = azurerm_user_assigned_identity.ai_services.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.aks.oidc_issuer_url
  subject             = "system:serviceaccount:sewa-ai:sewa-ai-sa"
}

# Role assignments for Key Vault access
resource "azurerm_role_assignment" "backend_keyvault_secrets_user" {
  principal_id                     = azurerm_user_assigned_identity.backend.principal_id
  role_definition_name             = "Key Vault Secrets User"
  scope                            = azurerm_key_vault.main.id
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "ai_services_keyvault_secrets_user" {
  principal_id                     = azurerm_user_assigned_identity.ai_services.principal_id
  role_definition_name             = "Key Vault Secrets User"
  scope                            = azurerm_key_vault.main.id
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "backend_storage_blob_data_contributor" {
  principal_id                     = azurerm_user_assigned_identity.backend.principal_id
  role_definition_name             = "Storage Blob Data Contributor"
  scope                            = azurerm_storage_account.dicom.id
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "ai_services_storage_blob_data_contributor" {
  principal_id                     = azurerm_user_assigned_identity.ai_services.principal_id
  role_definition_name             = "Storage Blob Data Contributor"
  scope                            = azurerm_storage_account.dicom.id
  skip_service_principal_aad_check = true
}
