# SEWA XAI — infrastructure/terraform-azure/keyvault-secrets.tf
# Stores all SEWA secrets in Azure Key Vault.
# AKS pods read these at runtime via the Azure Key Vault Provider for Secrets Store CSI Driver.
# No secrets ever touch the filesystem or environment variables in plaintext in production.

# ── Key Vault Access Policy — AKS Workload Identity ──────────
resource "azurerm_key_vault_access_policy" "aks" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id

  secret_permissions      = ["Get", "List"]
  certificate_permissions = ["Get", "List"]
}

# ── Key Vault Access Policy — Terraform Deployer ─────────────
resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Purge", "Recover", "Backup", "Restore"
  ]
}

# ── Database Secret ────────────────────────────────────────────
# NOTE: Secret values are seeded out-of-band (azure/scripts/seed-keyvault.ps1)
# and lifecycle-protected so `terraform apply` can NEVER overwrite a live value
# with a tfvars placeholder. Only the resource's existence is managed here.
resource "azurerm_key_vault_secret" "db_url" {
  name         = "sewa-database-url"
  value        = "postgresql://${var.db_admin_user}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/sewa_ai?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "database" }

  depends_on = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "sewa-db-password"
  value        = var.db_admin_password
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "database" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

# ── JWT Secrets ────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "sewa-jwt-secret"
  value        = var.jwt_secret
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "auth" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "jwt_refresh_secret" {
  name         = "sewa-jwt-refresh-secret"
  value        = var.jwt_refresh_secret
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "auth" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "encryption_key" {
  name         = "sewa-encryption-key"
  value        = var.encryption_key
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "auth" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

# ── Azure Storage ──────────────────────────────────────────────
resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "sewa-storage-connection-string"
  value        = azurerm_storage_account.dicom.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "storage" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

# ── Payments ───────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "stripe_secret" {
  name         = "sewa-stripe-secret-key"
  value        = var.stripe_secret_key
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "payments" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

# ── Email ──────────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "smtp_pass" {
  name         = "sewa-smtp-pass"
  value        = var.smtp_pass
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "email" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

# ── FHIR Service Principal (App Registration) ─────────────────
# Creates the Azure AD App Registration used by the SEWA XAI backend
# to authenticate against Azure Health Data Services (FHIR R4).
# The App Registration is granted "FHIR Data Contributor" on the FHIR service.

resource "azuread_application" "fhir_client" {
  display_name = "sewa-ai-fhir-sp"
  tags         = ["sewa-ai", "fhir", var.environment]

  required_resource_access {
    # Azure Healthcare APIs
    resource_app_id = "4f6778d8-5aef-43dc-a1ff-b073724b9495"
    resource_access {
      id   = "52f1f54c-0bf7-4a6b-a89e-f07f19b44d6b" # user_impersonation
      type = "Scope"
    }
  }
}

resource "azuread_service_principal" "fhir_client" {
  client_id    = azuread_application.fhir_client.client_id
  use_existing = true
}

resource "azuread_application_password" "fhir_client" {
  application_id    = azuread_application.fhir_client.id
  display_name      = "sewa-ai-fhir-secret"
  end_date_relative = "17520h" # 2 years
}

resource "azurerm_role_assignment" "fhir_data_contributor" {
  principal_id         = azuread_service_principal.fhir_client.object_id
  role_definition_name = "FHIR Data Contributor"
  scope                = azurerm_healthcare_fhir_service.fhir.id
}

resource "azurerm_role_assignment" "fhir_data_reader" {
  principal_id         = azuread_service_principal.fhir_client.object_id
  role_definition_name = "FHIR Data Reader"
  scope                = azurerm_healthcare_fhir_service.fhir.id
}

# Store FHIR credentials in Key Vault
resource "azurerm_key_vault_secret" "fhir_client_id" {
  name         = "sewa-fhir-client-id"
  value        = azuread_application.fhir_client.client_id
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "fhir" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "fhir_client_secret" {
  name         = "sewa-fhir-client-secret"
  value        = azuread_application_password.fhir_client.value
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "fhir" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "fhir_base_url" {
  name         = "sewa-fhir-base-url"
  value        = "https://${azurerm_healthcare_fhir_service.fhir.name}.fhir.azurehealthcareapis.com"
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "fhir" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "fhir_tenant_id" {
  name         = "sewa-fhir-tenant-id"
  value        = data.azurerm_client_config.current.tenant_id
  key_vault_id = azurerm_key_vault.main.id
  tags         = { category = "fhir" }
  depends_on   = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}

# ── SendGrid API Key (deferred — no live key yet) ──────────────
# Add back once SendGrid is onboarded with a real API key.

