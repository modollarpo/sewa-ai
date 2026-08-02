variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod)"
  type        = string
  default     = "prod"
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

variable "aks_spoke_vnet_id" {
  description = "Resource ID of the AKS spoke VNet"
  type        = string
}
