# SEWA AI — HSCN VPN Gateway Module
# Connects the SEWA AI Azure VNet to NHS HSCN/PDN for PACS/RIS/Spine access.
#
# This module is designed to be called from the main terraform-azure/ setup
# using a source reference, or run standalone with explicit variable inputs.
#
# Usage (as module):
#   module "hscn_vpn" {
#     source = "../../terraform"
#
#     resource_group_name = azurerm_resource_group.main.name
#     hub_vnet_id         = azurerm_virtual_network.main.id
#     gateway_subnet_id   = azurerm_subnet.private_endpoints.id
#     aks_spoke_vnet_id   = azurerm_virtual_network.main.id
#
#     hscn_vpn_gateway_ip = var.hscn_vpn_gateway_ip
#     hscn_psk            = var.hscn_psk
#     environment         = var.environment
#   }
#
# Usage (standalone):
#   terraform init
#   terraform apply -var="resource_group_name=sewa-ai-production-rg" \
#                    -var="hscn_vpn_gateway_ip=<NHS_Digital_ip>" \
#                    -var="hscn_psk=<shared_key>"
#
# Author: SEWA AI Infrastructure Team
# Version: v1.0

# ── Variables ──────────────────────────────────────────────────────────────
variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
}

variable "environment" {
  description = "Deployment environment (production | staging | dev)"
  type        = string
  default     = "production"
}

variable "hub_vnet_id" {
  description = "ID of the existing hub VNet (from terraform-azure). If empty, a new hub VNet is created."
  type        = string
  default     = ""
}

variable "gateway_subnet_id" {
  description = "ID of the GatewaySubnet within the hub VNet. Required when hub_vnet_id is set."
  type        = string
  default     = ""
}

variable "aks_spoke_vnet_id" {
  description = "ID of the AKS spoke VNet for VNet peering"
  type        = string
  default     = ""
}

variable "hscn_vpn_gateway_ip" {
  description = "NHS HSCN VPN gateway public IP (provided by NHS Digital / Trust N3 team)"
  type        = string
  sensitive   = true
}

variable "hscn_psk" {
  description = "Pre-shared key for HSCN IPSec tunnel"
  type        = string
  sensitive   = true
}

variable "hscn_remote_networks" {
  description = "Remote network CIDRs reachable via HSCN"
  type        = list(string)
  default     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

variable "vnet_address_space" {
  description = "Address space for the hub VNet (used only when creating a new VNet)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "uksouth"
}

# ── Local Values ───────────────────────────────────────────────────────────
locals {
  name      = "sewa-ai"
  env       = var.environment
  prefix    = "${local.name}-${local.env}"
  has_existing_vnet = var.hub_vnet_id != ""
}

# ── Hub VNet (only created if no existing VNet provided) ──────────────────
resource "azurerm_virtual_network" "hub" {
  count               = local.has_existing_vnet ? 0 : 1
  name                = "${local.prefix}-hscn-hub-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = [var.vnet_address_space]

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Service     = "SEWA-AI"
    Compliance  = "HSCN"
  }
}

# ── Gateway Subnet (only created if no existing subnet provided) ──────────
resource "azurerm_subnet" "gateway" {
  count                = local.has_existing_vnet ? 0 : 1
  name                 = "GatewaySubnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.hub[0].name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "gateway-delegation"
    service_delegation {
      name    = "Microsoft.Network/virtualNetworkGateways"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# ── Resolve which VNet and subnet to use ──────────────────────────────────
locals {
  effective_vnet_id = local.has_existing_vnet ? var.hub_vnet_id : (length(azurerm_virtual_network.hub) > 0 ? azurerm_virtual_network.hub[0].id : null)
  effective_gw_subnet_id = local.has_existing_vnet ? var.gateway_subnet_id : (length(azurerm_subnet.gateway) > 0 ? azurerm_subnet.gateway[0].id : null)
}

# ── Local Network Gateway (NHS HSCN) ──────────────────────────────────────
resource "azurerm_local_network_gateway" "nhs_hscn" {
  name                = "${local.prefix}-nhs-hscn-gateway"
  resource_group_name = var.resource_group_name
  location            = var.location
  gateway_address     = var.hscn_vpn_gateway_ip

  address_space = var.hscn_remote_networks

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Service     = "SEWA-AI"
    Compliance  = "HSCN"
  }
}

# ── Public IP for VPN Gateway ─────────────────────────────────────────────
resource "azurerm_public_ip" "vpn_gateway_pip" {
  name                = "${local.prefix}-hscn-vpn-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Dynamic"
  sku                 = "Basic"

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Service     = "SEWA-AI"
    Compliance  = "HSCN"
  }
}

# ── Virtual Network Gateway ───────────────────────────────────────────────
resource "azurerm_virtual_network_gateway" "vpn_gateway" {
  name                = "${local.prefix}-hscn-vpn-gateway"
  location            = var.location
  resource_group_name = var.resource_group_name

  type     = "Vpn"
  vpn_type = "RouteBased"
  sku      = "VpnGw1"

  enable_bgp = true

  ip_configuration {
    name                          = "vpn-gw-ip-config"
    public_ip_address_id          = azurerm_public_ip.vpn_gateway_pip.id
    subnet_id                     = local.effective_gw_subnet_id
    private_ip_address_allocation = "Dynamic"
  }

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Service     = "SEWA-AI"
    Compliance  = "HSCN"
  }
}

# ── S2S VPN Connection to HSCN ────────────────────────────────────────────
resource "azurerm_virtual_network_gateway_connection" "hscn_s2s" {
  name                = "${local.prefix}-hscn-s2s-connection"
  location            = var.location
  resource_group_name = var.resource_group_name

  type                       = "IPsec"
  virtual_network_gateway_id = azurerm_virtual_network_gateway.vpn_gateway.id
  local_network_gateway_id   = azurerm_local_network_gateway.nhs_hscn.id

  shared_key = var.hscn_psk

  ipsec_policy {
    dh_group             = "DHGroup2"
    ike_encryption       = "AES256"
    ike_integrity        = "SHA256"
    ipsec_encryption     = "AES256"
    ipsec_integrity      = "SHA256"
    pfs_group            = "PFS24"
    sa_datasize          = 1024
    sa_lifetime          = 28800
  }

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Service     = "SEWA-AI"
    Compliance  = "HSCN"
  }
}

# ── Private DNS Zone for NHS APIs ─────────────────────────────────────────
resource "azurerm_private_dns_zone" "nhs_api" {
  name                = "api.service.nhs.uk"
  resource_group_name = var.resource_group_name

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Service     = "SEWA-AI"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "nhs_api_link" {
  name                  = "${local.prefix}-hub-nhs-api-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.nhs_api.name
  virtual_network_id    = local.effective_vnet_id
  registration_enabled  = false
}

# ── VNet Peering (hub ↔ AKS spoke) ────────────────────────────────────────
resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  count                   = var.aks_spoke_vnet_id != "" ? 1 : 0
  name                    = "${local.prefix}-hub-to-aks-spoke"
  resource_group_name     = var.resource_group_name
  virtual_network_name    = split("/", local.effective_vnet_id)[8]
  remote_virtual_network_id = var.aks_spoke_vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = true

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Service     = "SEWA-AI"
  }
}

# ── Outputs ────────────────────────────────────────────────────────────────
output "vpn_gateway_public_ip" {
  description = "Public IP of the HSCN VPN Gateway (share with NHS Digital / Trust N3 team)"
  value       = azurerm_public_ip.vpn_gateway_pip.ip_address
}

output "gateway_subnet_id" {
  description = "Gateway subnet ID"
  value       = local.effective_gw_subnet_id
}

output "hub_vnet_id" {
  description = "Hub VNet ID (created or referenced)"
  value       = local.effective_vnet_id
}

output "vpn_gateway_id" {
  description = "VPN Gateway resource ID"
  value       = azurerm_virtual_network_gateway.vpn_gateway.id
}

output "hscn_connection_id" {
  description = "HSCN S2S VPN connection ID"
  value       = azurerm_virtual_network_gateway_connection.hscn_s2s.id
}

output "nhs_private_dns_zone_id" {
  description = "Private DNS zone ID for NHS APIs"
  value       = azurerm_private_dns_zone.nhs_api.id
}
