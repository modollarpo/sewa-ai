# SEWA XAI — infrastructure/terraform-azure/outputs.tf
# These outputs are consumed by scripts/generate-env-azure.sh
# to automatically produce a ready-to-use backend/.env file.

# ── Identity ───────────────────────────────────────────────────
output "subscription_id" {
  description = "Azure subscription ID"
  value       = data.azurerm_client_config.current.subscription_id
}

output "tenant_id" {
  description = "Azure tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}

output "resource_group_name" {
  description = "Main resource group name"
  value       = azurerm_resource_group.main.name
}

output "location" {
  description = "Azure region"
  value       = azurerm_resource_group.main.location
}

# ── AKS ───────────────────────────────────────────────────────
output "aks_cluster_name" {
  description = "AKS cluster name — use with: az aks get-credentials --name <value> --resource-group <rg>"
  value       = azurerm_kubernetes_cluster.aks.name
}

output "aks_oidc_issuer_url" {
  description = "AKS OIDC issuer URL for Workload Identity"
  value       = azurerm_kubernetes_cluster.aks.oidc_issuer_url
}

# ── Container Registry ─────────────────────────────────────────
output "acr_login_server" {
  description = "ACR login server — use with: docker login <value>"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_name" {
  description = "ACR resource name"
  value       = azurerm_container_registry.acr.name
}

# ── Database ───────────────────────────────────────────────────
output "postgres_fqdn" {
  description = "PostgreSQL fully qualified domain name"
  value       = azurerm_postgresql_flexible_server.db.fqdn
}

output "postgres_server_name" {
  description = "PostgreSQL server name"
  value       = azurerm_postgresql_flexible_server.db.name
}

output "database_url" {
  description = "Full DATABASE_URL connection string (sensitive)"
  value       = "postgresql://${var.db_admin_user}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/sewa_ai?sslmode=require"
  sensitive   = true
}

# ── FHIR ──────────────────────────────────────────────────────
output "fhir_endpoint" {
  description = "Azure Healthcare FHIR R4 endpoint URL"
  value       = "https://${azurerm_healthcare_fhir_service.fhir.name}.fhir.azurehealthcareapis.com"
}

output "fhir_service_name" {
  description = "FHIR service name"
  value       = azurerm_healthcare_fhir_service.fhir.name
}

# ── Storage ────────────────────────────────────────────────────
output "storage_account_name" {
  description = "Azure Blob Storage account name"
  value       = azurerm_storage_account.dicom.name
}

output "storage_connection_string" {
  description = "Azure Storage connection string (sensitive)"
  value       = azurerm_storage_account.dicom.primary_connection_string
  sensitive   = true
}

output "storage_container_scans" {
  description = "Blob container name for DICOM scans"
  value       = azurerm_storage_container.scans.name
}

# ── Service Bus ────────────────────────────────────────────────
output "servicebus_endpoint" {
  description = "Service Bus namespace endpoint"
  value       = azurerm_servicebus_namespace.main.endpoint
}

output "servicebus_namespace" {
  description = "Service Bus namespace name"
  value       = azurerm_servicebus_namespace.main.name
}

# ── Key Vault ──────────────────────────────────────────────────
output "key_vault_uri" {
  description = "Key Vault URI — secrets accessible at <uri>/secrets/<name>"
  value       = azurerm_key_vault.main.vault_uri
}

output "key_vault_name" {
  description = "Key Vault resource name"
  value       = azurerm_key_vault.main.name
}

# ── SignalR ────────────────────────────────────────────────────
output "signalr_hostname" {
  description = "SignalR service hostname"
  value       = azurerm_signalr_service.main.hostname
}

output "signalr_connection_string" {
  description = "SignalR primary connection string (sensitive)"
  value       = azurerm_signalr_service.main.primary_connection_string
  sensitive   = true
}

# ── Log Analytics ──────────────────────────────────────────────
output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.main.workspace_id
}

# ── Deployment summary ─────────────────────────────────────────
output "deployment_summary" {
  description = "Human-readable deployment summary"
  value       = <<-EOT
    ╔══════════════════════════════════════════════════════════════╗
    ║           SEWA XAI — Azure Deployment Complete                ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Environment  : ${var.environment}
    ║  Region       : ${var.azure_region} (${var.region_code})
    ║  Resource Group: ${azurerm_resource_group.main.name}
    ╠══════════════════════════════════════════════════════════════╣
    ║  AKS Cluster  : ${azurerm_kubernetes_cluster.aks.name}
    ║  ACR Registry : ${azurerm_container_registry.acr.login_server}
    ║  PostgreSQL   : ${azurerm_postgresql_flexible_server.db.fqdn}
    ║  Key Vault    : ${azurerm_key_vault.main.vault_uri}
    ╠══════════════════════════════════════════════════════════════╣
    ║  Next: run scripts/generate-env-azure.sh to build .env      ║
    ╚══════════════════════════════════════════════════════════════╝
  EOT
}

# ── Workload Identity ──────────────────────────────────────────
output "backend_workload_identity_client_id" {
  description = "Backend Workload Identity client ID"
  value       = azurerm_user_assigned_identity.backend.client_id
}

output "ai_services_workload_identity_client_id" {
  description = "AI Services Workload Identity client ID"
  value       = azurerm_user_assigned_identity.ai_services.client_id
}

# ── FHIR App Registration ──────────────────────────────────────
output "fhir_client_id" {
  description = "FHIR App Registration client ID (FHIR_CLIENT_ID)"
  value       = azuread_application.fhir_client.client_id
}

output "fhir_client_secret" {
  description = "FHIR App Registration client secret (FHIR_CLIENT_SECRET) — stored in Key Vault"
  value       = azuread_application_password.fhir_client.value
  sensitive   = true
}

output "fhir_base_url" {
  description = "Full FHIR R4 base URL"
  value       = "https://${azurerm_healthcare_fhir_service.fhir.name}.fhir.azurehealthcareapis.com"
}

output "fhir_scope" {
  description = "OAuth2 scope for FHIR token requests"
  value       = "https://${azurerm_healthcare_fhir_service.fhir.name}.fhir.azurehealthcareapis.com/.default"
}
