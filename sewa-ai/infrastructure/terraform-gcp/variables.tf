variable "project_id"   { type = string; description = "GCP project ID" }
variable "region"       { type = string; default = "europe-west2" }
variable "zone"         { type = string; default = "europe-west2-a" }
variable "environment"  { type = string; default = "production" }
variable "db_password"  { type = string; sensitive = true; description = "PostgreSQL password" }
variable "cluster_name" { type = string; default = "sewa-ai-prod-gke" }
