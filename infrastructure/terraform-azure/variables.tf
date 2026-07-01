# SEWA XAI — infrastructure/terraform-azure/variables.tf

# ── Deployment ─────────────────────────────────────────────────
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["production", "staging", "dev"], var.environment)
    error_message = "environment must be production, staging, or dev."
  }
}

variable "azure_region" {
  description = "Primary Azure region for all resources"
  type        = string
  default     = "uksouth"
  # Options:
  #   uksouth            → UK (NHS DSPT, GDPR)
  #   westeurope         → EU (GDPR, EU AI Act, MDR)
  #   eastus             → North America (HIPAA, FDA 510k)
  #   southafricanorth   → Africa (NDPR, POPIA, DPDP)
  #   centralindia       → India (DPDP 2023)
}

variable "region_code" {
  description = "Short region code used in env config (matches SEWA region logic)"
  type        = string
  default     = "uk"
  # uk | eu | us | ng | ke | za | gh | in
}

# ── Database ───────────────────────────────────────────────────
variable "db_admin_user" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "sewaadmin"
  sensitive   = true
}

variable "db_admin_password" {
  description = "PostgreSQL administrator password (min 8 chars, upper+lower+digit+symbol)"
  type        = string
  sensitive   = true
}

variable "db_sku" {
  description = "PostgreSQL Flexible Server SKU"
  type        = string
  default     = "GP_Standard_D4s_v3"
  # GP_Standard_D2s_v3  → dev/staging (2 vCores)
  # GP_Standard_D4s_v3  → production  (4 vCores)
  # GP_Standard_D8s_v3  → high-load   (8 vCores)
}

variable "db_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 131072  # 128 GB
}

# ── Redis ──────────────────────────────────────────────────────
variable "redis_capacity" {
  description = "Redis cache capacity (Premium tier: 1=6GB, 2=13GB, 3=26GB)"
  type        = number
  default     = 1
}

# ── AKS ───────────────────────────────────────────────────────
variable "aks_system_node_count" {
  description = "Initial AKS system node count"
  type        = number
  default     = 3
}

variable "aks_system_vm_size" {
  description = "VM size for AKS system nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "aks_gpu_vm_size" {
  description = "VM size for AKS GPU nodes (AI inference)"
  type        = string
  default     = "Standard_NC4as_T4_v3"  # NVIDIA T4 — cost-effective for inference
  # Standard_NC6s_v3  → NVIDIA V100 (higher perf, higher cost)
  # Standard_NC4as_T4_v3 → NVIDIA T4 (recommended for SEWA)
}

variable "kubernetes_version" {
  description = "AKS Kubernetes version"
  type        = string
  default     = "1.28.5"
}

# ── Security / Networking ─────────────────────────────────────
variable "allowed_ips" {
  description = "IP ranges allowed to access Key Vault and management endpoints"
  type        = list(string)
  default     = []
  # Add your office/VPN IP: ["203.0.113.0/24"]
}

variable "vnet_address_space" {
  description = "VNet CIDR block"
  type        = string
  default     = "10.10.0.0/16"
}

# ── Secrets — stored in Key Vault (populated after initial apply) ──
variable "jwt_secret" {
  description = "JWT signing secret (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "AES-256 encryption key (exactly 32 chars)"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "paystack_secret_key" {
  description = "Paystack secret key (Africa region)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "flutterwave_secret_key" {
  description = "Flutterwave secret key (Africa region)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "mpesa_consumer_key" {
  description = "M-Pesa consumer key (Kenya)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "mpesa_consumer_secret" {
  description = "M-Pesa consumer secret (Kenya)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "firebase_private_key" {
  description = "Firebase Admin SDK private key (for FCM push notifications)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "firebase_client_email" {
  description = "Firebase Admin SDK client email"
  type        = string
  default     = ""
}

variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
  default     = "sewa-ai-prod"
}

variable "smtp_host" {
  description = "SMTP server host (e.g. smtp.sendgrid.net)"
  type        = string
  default     = "smtp.sendgrid.net"
}

variable "smtp_user" {
  description = "SMTP username"
  type        = string
  default     = "apikey"
}

variable "smtp_pass" {
  description = "SMTP password / API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "email_from" {
  description = "Sender email address"
  type        = string
  default     = "info@sewaxai.health"
}

variable "sentry_dsn" {
  description = "Sentry DSN for error monitoring"
  type        = string
  default     = ""
  sensitive   = true
}

# ── App config ─────────────────────────────────────────────────
variable "app_url" {
  description = "Public API URL"
  type        = string
  default     = "https://api.sewaxai.health"
}

variable "cors_origins" {
  description = "Comma-separated CORS origins"
  type        = string
  default     = "https://app.sewaxai.health"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"
}

variable "sendgrid_api_key" {
  description = "SendGrid API key for transactional email"
  type        = string
  default     = ""
  sensitive   = true
}
