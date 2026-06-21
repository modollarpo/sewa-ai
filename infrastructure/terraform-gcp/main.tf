# SEWA AI — infrastructure/terraform-gcp/main.tf
# GCP deployment: GKE Autopilot, Cloud SQL, Memorystore, Artifact Registry
# Region: europe-west2 (London) — for EU/UK data residency

terraform {
  required_version = ">= 1.6"
  required_providers {
    google      = { source = "hashicorp/google",      version = "~> 5.0" }
    google-beta = { source = "hashicorp/google-beta", version = "~> 5.0" }
    random      = { source = "hashicorp/random",      version = "~> 3.0" }
  }
  backend "gcs" {
    bucket = "sewa-ai-tf-state-eu"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ── Variables ──────────────────────────────────────────────────
variable "project_id"   { description = "GCP project ID" }
variable "region"       { default = "europe-west2" }
variable "zone"         { default = "europe-west2-a" }
variable "environment"  { default = "production" }
variable "db_password"  { sensitive = true }
variable "cluster_name" { default = "sewa-ai-prod-gke" }

locals {
  common_labels = {
    platform    = "sewa-ai"
    environment = var.environment
    managed_by  = "terraform"
    region      = var.region
  }
}

# ── APIs to enable ─────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "compute.googleapis.com",
    "dns.googleapis.com",
    "certificatemanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ── VPC ────────────────────────────────────────────────────────
resource "google_compute_network" "sewa" {
  name                    = "sewa-ai-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "gke" {
  name          = "sewa-ai-gke-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
  network       = google_compute_network.sewa.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.16.0.0/14"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.20.0.0/20"
  }

  private_ip_google_access = true
}

resource "google_compute_subnetwork" "data" {
  name          = "sewa-ai-data-subnet"
  ip_cidr_range = "10.1.0.0/24"
  region        = var.region
  network       = google_compute_network.sewa.id
  private_ip_google_access = true
}

# Private service access for Cloud SQL
resource "google_compute_global_address" "private_range" {
  name          = "sewa-ai-private-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.sewa.id
}

resource "google_service_networking_connection" "private" {
  network                 = google_compute_network.sewa.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_range.name]
  depends_on              = [google_project_service.apis]
}

# ── Artifact Registry ──────────────────────────────────────────
resource "google_artifact_registry_repository" "sewa" {
  location      = var.region
  repository_id = "sewa"
  description   = "SEWA AI container images"
  format        = "DOCKER"
  labels        = local.common_labels
  depends_on    = [google_project_service.apis]
}

# ── Cloud Storage Buckets ──────────────────────────────────────
resource "google_storage_bucket" "scans" {
  name          = "${var.project_id}-sewa-scans-eu"
  location      = var.region
  force_destroy = false
  storage_class = "STANDARD"
  labels        = local.common_labels

  uniform_bucket_level_access = true

  versioning { enabled = true }

  lifecycle_rule {
    condition { age = 365 }
    action    { type = "SetStorageClass"; storage_class = "NEARLINE" }
  }
  lifecycle_rule {
    condition { age = 2555 } # 7 years — NHS data retention
    action    { type = "Delete" }
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.sewa.id
  }
}

resource "google_storage_bucket" "reports" {
  name          = "${var.project_id}-sewa-reports-eu"
  location      = var.region
  storage_class = "STANDARD"
  labels        = local.common_labels
  uniform_bucket_level_access = true
  versioning { enabled = true }
  encryption { default_kms_key_name = google_kms_crypto_key.sewa.id }
}

resource "google_storage_bucket" "gradcam" {
  name          = "${var.project_id}-sewa-gradcam-eu"
  location      = var.region
  storage_class = "STANDARD"
  labels        = local.common_labels
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "models" {
  name          = "${var.project_id}-sewa-models-eu"
  location      = var.region
  storage_class = "STANDARD"
  labels        = local.common_labels
  uniform_bucket_level_access = true
  versioning { enabled = true }
}

resource "google_storage_bucket" "tf_state" {
  name          = "sewa-ai-tf-state-eu"
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false
  uniform_bucket_level_access = true
  versioning { enabled = true }
}

# ── KMS for encryption ─────────────────────────────────────────
resource "google_kms_key_ring" "sewa" {
  name     = "sewa-ai-keyring"
  location = var.region
  depends_on = [google_project_service.apis]
}

resource "google_kms_crypto_key" "sewa" {
  name            = "sewa-ai-key"
  key_ring        = google_kms_key_ring.sewa.id
  rotation_period = "7776000s" # 90 days
}

# ── GKE Autopilot Cluster ──────────────────────────────────────
resource "google_container_cluster" "sewa" {
  provider = google-beta
  name     = var.cluster_name
  location = var.region

  enable_autopilot = true

  network    = google_compute_network.sewa.id
  subnetwork = google_compute_subnetwork.gke.id

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "all"
    }
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  cluster_autoscaling {
    auto_provisioning_defaults {
      service_account = google_service_account.gke_nodes.email
    }
  }

  release_channel { channel = "STABLE" }

  labels = local.common_labels
  depends_on = [google_project_service.apis, google_service_networking_connection.private]
}

# ── Service Accounts ───────────────────────────────────────────
resource "google_service_account" "gke_nodes" {
  account_id   = "sewa-ai-gke-nodes"
  display_name = "SEWA AI GKE Nodes"
}

resource "google_project_iam_member" "gke_node_roles" {
  for_each = toset([
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
    "roles/cloudtrace.agent",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter",
    "roles/artifactregistry.reader",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# GitHub Actions Workload Identity
resource "google_service_account" "github_actions" {
  account_id   = "sewa-ai-github-actions"
  display_name = "SEWA AI GitHub Actions"
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/container.developer",
    "roles/artifactregistry.writer",
    "roles/iam.workloadIdentityUser",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
}

# ── Cloud SQL — PostgreSQL 15 ──────────────────────────────────
resource "google_sql_database_instance" "sewa" {
  name             = "sewa-ai-postgres-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region
  deletion_protection = true

  settings {
    tier              = "db-n1-standard-4"
    availability_type = "REGIONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.sewa.id
      require_ssl     = true
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 4096
    }
  }

  depends_on = [google_service_networking_connection.private]
}

resource "google_sql_database" "sewa" {
  name     = "sewa_ai"
  instance = google_sql_database_instance.sewa.name
}

resource "google_sql_user" "sewa" {
  name     = "sewa"
  instance = google_sql_database_instance.sewa.name
  password = var.db_password
}

# ── Memorystore Redis ──────────────────────────────────────────
resource "google_redis_instance" "sewa" {
  name           = "sewa-ai-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 4
  region         = var.region

  authorized_network = google_compute_network.sewa.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version      = "REDIS_7_0"
  display_name       = "SEWA AI Redis"
  reserved_ip_range  = "10.2.0.0/29"

  auth_enabled = true

  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }

  labels     = local.common_labels
  depends_on = [google_service_networking_connection.private]
}

# ── Secret Manager ─────────────────────────────────────────────
locals {
  secrets = {
    "sewa-db-password"       = var.db_password
    "sewa-jwt-secret"        = random_password.jwt.result
    "sewa-encryption-key"    = random_password.enc.result
  }
}

resource "random_password" "jwt" { length = 64; special = true }
resource "random_password" "enc" { length = 32; special = false }

resource "google_secret_manager_secret" "sewa" {
  for_each  = local.secrets
  secret_id = each.key
  replication { auto {} }
  labels    = local.common_labels
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "sewa" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.sewa[each.key].id
  secret_data = each.value
}

# ── Outputs ────────────────────────────────────────────────────
output "gke_cluster_name"     { value = google_container_cluster.sewa.name }
output "gke_cluster_endpoint" { value = google_container_cluster.sewa.endpoint; sensitive = true }
output "db_connection_name"   { value = google_sql_database_instance.sewa.connection_name }
output "db_private_ip"        { value = google_sql_database_instance.sewa.private_ip_address; sensitive = true }
output "redis_host"           { value = google_redis_instance.sewa.host; sensitive = true }
output "artifact_registry"    { value = "${var.region}-docker.pkg.dev/${var.project_id}/sewa" }
output "workload_identity_provider" {
  value = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github.workload_identity_pool_provider_id}"
}
output "github_sa_email" { value = google_service_account.github_actions.email }

data "google_project" "current" { project_id = var.project_id }
