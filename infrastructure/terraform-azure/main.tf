# SEWA XAI — infrastructure/terraform-azure/main.tf
# Complete Azure infrastructure for SEWA XAI Clinical Intelligence Platform
#
# Resources provisioned:
#   - Resource Group
#   - VNet + Subnets + NSGs + Private DNS  (see networking.tf)
#   - AKS (system + GPU + spot node pools)
#   - Azure Container Registry Premium
#   - PostgreSQL 15 Flexible Server (private, ZoneRedundant HA, geo-backup)
#   - Azure Cache for Redis 7 Premium (private)
#   - Azure Healthcare FHIR R4 Service
#   - Azure Blob Storage (DICOM — GRS, 7-year lifecycle)
#   - Azure Service Bus Premium (triage queue + HL7 queue + notifications queue)
#   - Azure Key Vault Premium (all secrets — see keyvault-secrets.tf)
#   - Azure Front Door Premium + WAF
#   - Azure SignalR Premium (Socket.IO / WebSocket)
#   - Log Analytics + Azure Monitor Prometheus + Grafana
#   - Azure Confidential Ledger (HIPAA blockchain audit trail)
#
# Quick start:
#   cp terraform.tfvars.example terraform.tfvars   # fill in 🔑 secrets
#   terraform init
#   terraform plan -out tfplan
#   terraform apply tfplan
#   bash ../../scripts/generate-env-azure.sh       # auto-build backend/.env

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.85" }
    azuread = { source = "hashicorp/azuread",  version = "~> 2.47" }
    random  = { source = "hashicorp/random",   version = "~> 3.6"  }
  }

  # Remote state — bootstrapped by scripts/bootstrap-tfstate.sh
  backend "azurerm" {
    resource_group_name  = "sewa-ai-tfstate-rg"
    storage_account_name = "sewaaitfstate"
    container_name       = "tfstate"
    key                  = "sewa-ai.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

data "azurerm_client_config" "current" {}

locals {
  name     = "sewa-ai"
  env      = var.environment
  location = var.azure_region
  tags = {
    Project    = "SEWA-AI"
    Env        = var.environment
    Region     = var.region_code
    Compliance = "HIPAA GDPR NHS-DSPT ISO-13485 EU-AI-Act"
    ManagedBy  = "Terraform"
  }
}

# ─────────────────────────────────────────────────────────────────
# RESOURCE GROUP
# ─────────────────────────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = "${local.name}-${local.env}-rg"
  location = local.location
  tags     = local.tags
}

# ─────────────────────────────────────────────────────────────────
# AZURE CONTAINER REGISTRY
# ─────────────────────────────────────────────────────────────────
resource "azurerm_container_registry" "acr" {
  name                          = "sewaai${local.env}acr"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = local.location
  sku                           = "Premium"
  admin_enabled                 = false
  public_network_access_enabled = false
  zone_redundancy_enabled       = true
  tags                          = local.tags

  georeplications {
    location                = var.azure_region == "uksouth" ? "westeurope" : "uksouth"
    zone_redundancy_enabled = true
    tags                    = local.tags
  }
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.acr.id
  skip_service_principal_aad_check = true
}

# ─────────────────────────────────────────────────────────────────
# AKS CLUSTER
# ─────────────────────────────────────────────────────────────────
resource "azurerm_kubernetes_cluster" "aks" {
  name                              = "${local.name}-${local.env}-aks"
  location                          = local.location
  resource_group_name               = azurerm_resource_group.main.name
  dns_prefix                        = "${local.name}-${local.env}"
  kubernetes_version                = var.kubernetes_version
  role_based_access_control_enabled = true
  oidc_issuer_enabled               = true
  workload_identity_enabled         = true
  azure_policy_enabled              = true
  local_account_disabled            = true
  tags                              = local.tags

  default_node_pool {
    name                        = "system"
    node_count                  = var.aks_system_node_count
    vm_size                     = var.aks_system_vm_size
    os_disk_size_gb             = 128
    os_disk_type                = "Managed"
    enable_auto_scaling         = true
    min_count                   = 2
    max_count                   = 10
    vnet_subnet_id              = azurerm_subnet.aks.id
    temporary_name_for_rotation = "systemtemp"
    node_labels = { "role" = "system", "workload" = "backend" }
  }

  identity { type = "SystemAssigned" }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
    service_cidr      = "10.20.0.0/16"
    dns_service_ip    = "10.20.0.10"
  }

  oms_agent {
    log_analytics_workspace_id      = azurerm_log_analytics_workspace.main.id
    msi_auth_for_monitoring_enabled = true
  }

  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  auto_scaler_profile {
    balance_similar_node_groups = true
    expander                    = "least-waste"
    scale_down_unneeded         = "10m"
    scale_down_delay_after_add  = "5m"
  }
}

# GPU node pool — AI inference (EfficientNet-B4, VLM, MC-Dropout)
resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpupool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = var.aks_gpu_vm_size
  node_count            = 2
  enable_auto_scaling   = true
  min_count             = 1
  max_count             = 8
  vnet_subnet_id        = azurerm_subnet.aks.id
  os_disk_size_gb       = 256
  tags                  = local.tags
  node_labels = { "accelerator" = "nvidia-gpu", "role" = "ai-inference" }
  node_taints = ["nvidia.com/gpu=true:NoSchedule"]
}

# Spot pool — federated learning training (80% cost saving)
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  name                  = "spotpool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = "Standard_D8s_v3"
  priority              = "Spot"
  eviction_policy       = "Delete"
  spot_max_price        = -1
  node_count            = 0
  enable_auto_scaling   = true
  min_count             = 0
  max_count             = 20
  vnet_subnet_id        = azurerm_subnet.aks.id
  tags                  = local.tags
  node_labels = { "role" = "batch-training", "workload" = "federated-learning" }
  node_taints = ["kubernetes.azure.com/scalesetpriority=spot:NoSchedule"]
}

# ─────────────────────────────────────────────────────────────────
# POSTGRESQL 15 FLEXIBLE SERVER
# ─────────────────────────────────────────────────────────────────
resource "azurerm_postgresql_flexible_server" "db" {
  name                          = "${local.name}-${local.env}-pg"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = local.location
  version                       = "15"
  administrator_login           = var.db_admin_user
  administrator_password        = var.db_admin_password
  sku_name                      = var.db_sku
  storage_mb                    = var.db_storage_mb
  backup_retention_days         = 35
  geo_redundant_backup_enabled  = true
  zone                          = "1"
  delegated_subnet_id           = azurerm_subnet.db.id
  private_dns_zone_id           = azurerm_private_dns_zone.db.id
  public_network_access_enabled = false
  tags                          = local.tags

  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 2
    start_minute = 0
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.db]
}

resource "azurerm_postgresql_flexible_server_configuration" "require_ssl" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.db.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_connections" {
  name      = "log_connections"
  server_id = azurerm_postgresql_flexible_server.db.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_database" "sewa" {
  name      = "sewa_ai"
  server_id = azurerm_postgresql_flexible_server.db.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# ─────────────────────────────────────────────────────────────────
# AZURE CACHE FOR REDIS 7 PREMIUM
# ─────────────────────────────────────────────────────────────────
resource "azurerm_redis_cache" "redis" {
  name                          = "${local.name}-${local.env}-redis"
  location                      = local.location
  resource_group_name           = azurerm_resource_group.main.name
  capacity                      = var.redis_capacity
  family                        = "P"
  sku_name                      = "Premium"
  enable_non_ssl_port           = false
  minimum_tls_version           = "1.2"
  redis_version                 = "7"
  subnet_id                     = azurerm_subnet.redis.id
  public_network_access_enabled = false
  tags                          = local.tags

  redis_configuration {
    enable_authentication         = true
    maxmemory_policy              = "allkeys-lru"
    rdb_backup_enabled            = true
    rdb_backup_frequency          = 60
    rdb_backup_max_snapshot_count = 1
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
  }
}

# ─────────────────────────────────────────────────────────────────
# AZURE HEALTHCARE API — FHIR R4
# ─────────────────────────────────────────────────────────────────
resource "azurerm_healthcare_workspace" "fhir" {
  name                = "${local.name}-${local.env}-hw"
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

resource "azurerm_healthcare_fhir_service" "fhir" {
  name                = "${local.name}-${local.env}-fhir"
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_healthcare_workspace.fhir.id
  kind                = "fhir-R4"
  tags                = local.tags

  authentication {
    authority = "https://login.microsoftonline.com/${data.azurerm_client_config.current.tenant_id}"
    audience  = "https://${local.name}-${local.env}-fhir.fhir.azurehealthcareapis.com"
  }

  cors {
    allowed_origins    = ["https://app.sewaxai.health", var.app_url]
    allowed_methods    = ["GET", "POST", "PUT", "DELETE"]
    allowed_headers    = ["*"]
    max_age_in_seconds = 600
  }
}

# ─────────────────────────────────────────────────────────────────
# AZURE BLOB STORAGE — DICOM + GRADCAM + REPORTS
# ─────────────────────────────────────────────────────────────────
resource "azurerm_storage_account" "dicom" {
  name                            = "sewaai${local.env}dicom"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = local.location
  account_tier                    = "Standard"
  account_replication_type        = "GRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  public_network_access_enabled   = false
  tags                            = local.tags

  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true
    delete_retention_policy      { days = 30 }
    container_delete_retention_policy { days = 30 }
  }
}

resource "azurerm_storage_management_policy" "dicom_lifecycle" {
  storage_account_id = azurerm_storage_account.dicom.id
  rule {
    name    = "hipaa-retention"
    enabled = true
    filters { blob_types = ["blockBlob"] }
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 365
        delete_after_days_since_modification_greater_than          = 2555
      }
      snapshot { delete_after_days_since_creation_greater_than = 90 }
    }
  }
}

resource "azurerm_storage_container" "scans" {
  name                  = "scans"
  storage_account_name  = azurerm_storage_account.dicom.name
  container_access_type = "private"
}
resource "azurerm_storage_container" "gradcam" {
  name                  = "gradcam"
  storage_account_name  = azurerm_storage_account.dicom.name
  container_access_type = "private"
}
resource "azurerm_storage_container" "reports" {
  name                  = "reports"
  storage_account_name  = azurerm_storage_account.dicom.name
  container_access_type = "private"
}

# ─────────────────────────────────────────────────────────────────
# AZURE SERVICE BUS PREMIUM
# ─────────────────────────────────────────────────────────────────
resource "azurerm_servicebus_namespace" "main" {
  name                         = "${local.name}-${local.env}-sb"
  location                     = local.location
  resource_group_name          = azurerm_resource_group.main.name
  sku                          = "Premium"
  capacity                     = 1
  premium_messaging_partitions = 1
  local_auth_enabled           = false
  tags                         = local.tags
}

resource "azurerm_servicebus_queue" "triage" {
  name         = "sewa-scan-triage"
  namespace_id = azurerm_servicebus_namespace.main.id
  max_delivery_count                   = 10
  dead_lettering_on_message_expiration = true
  message_ttl                          = "P7D"
  lock_duration                        = "PT5M"
}

resource "azurerm_servicebus_queue" "hl7" {
  name         = "sewa-hl7-messages"
  namespace_id = azurerm_servicebus_namespace.main.id
  max_delivery_count                   = 5
  dead_lettering_on_message_expiration = true
  message_ttl                          = "P3D"
}

resource "azurerm_servicebus_queue" "notifications" {
  name         = "sewa-notifications"
  namespace_id = azurerm_servicebus_namespace.main.id
  max_delivery_count = 3
  message_ttl        = "PT1H"
}

# ─────────────────────────────────────────────────────────────────
# AZURE KEY VAULT PREMIUM
# ─────────────────────────────────────────────────────────────────
resource "azurerm_key_vault" "main" {
  name                          = "${local.name}-${local.env}-kv"
  location                      = local.location
  resource_group_name           = azurerm_resource_group.main.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "premium"
  purge_protection_enabled      = true
  soft_delete_retention_days    = 90
  enable_rbac_authorization     = false
  public_network_access_enabled = false
  tags                          = local.tags

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    ip_rules                   = var.allowed_ips
    virtual_network_subnet_ids = [azurerm_subnet.aks.id]
  }
}

# ─────────────────────────────────────────────────────────────────
# AZURE FRONT DOOR PREMIUM + WAF
# ─────────────────────────────────────────────────────────────────
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${local.name}-${local.env}-afd"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Premium_AzureFrontDoor"
  tags                = local.tags
}

resource "azurerm_cdn_frontdoor_endpoint" "api" {
  name                     = "sewa-api"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  tags                     = local.tags
}

resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = "sewafirewallpolicy"
  resource_group_name               = azurerm_resource_group.main.name
  sku_name                          = "Premium_AzureFrontDoor"
  enabled                           = true
  mode                              = "Prevention"
  custom_block_response_status_code = 403
  tags                              = local.tags

  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }
}

resource "azurerm_cdn_frontdoor_security_policy" "waf" {
  name                     = "sewa-waf-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id
      association {
        patterns_to_match = ["/*"]
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.api.id
        }
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────
# AZURE SIGNALR PREMIUM — WebSocket / Socket.IO
# ─────────────────────────────────────────────────────────────────
resource "azurerm_signalr_service" "main" {
  name                = "${local.name}-${local.env}-signalr"
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags

  sku {
    name     = "Premium_P1"
    capacity = 2
  }

  cors { allowed_origins = ["https://app.sewaxai.health", var.app_url] }

  service_mode              = "Default"
  connectivity_logs_enabled = true
  messaging_logs_enabled    = true
}

# ─────────────────────────────────────────────────────────────────
# LOG ANALYTICS + PROMETHEUS + GRAFANA
# ─────────────────────────────────────────────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.name}-${local.env}-law"
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = local.tags
}

resource "azurerm_monitor_workspace" "prometheus" {
  name                = "${local.name}-${local.env}-prometheus"
  resource_group_name = azurerm_resource_group.main.name
  location            = local.location
  tags                = local.tags
}

resource "azurerm_dashboard_grafana" "main" {
  name                              = "${local.name}-${local.env}-grafana"
  resource_group_name               = azurerm_resource_group.main.name
  location                          = local.location
  grafana_major_version             = 10
  api_key_enabled                   = true
  deterministic_outbound_ip_enabled = true
  public_network_access_enabled     = true
  tags                              = local.tags

  azure_monitor_workspace_integrations {
    resource_id = azurerm_monitor_workspace.prometheus.id
  }
}

# ─────────────────────────────────────────────────────────────────
# AZURE CONFIDENTIAL LEDGER — HIPAA blockchain audit trail
# ─────────────────────────────────────────────────────────────────
resource "azurerm_confidential_ledger" "audit" {
  name                = "${local.name}-${local.env}-ledger"
  resource_group_name = azurerm_resource_group.main.name
  location            = local.location
  ledger_type         = "Public"
  tags                = local.tags

  azuread_based_service_principal {
    principal_id     = data.azurerm_client_config.current.object_id
    tenant_id        = data.azurerm_client_config.current.tenant_id
    ledger_role_name = "Administrator"
  }
}
