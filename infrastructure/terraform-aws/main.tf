# SEWA XAI — infrastructure/terraform-aws/main.tf
# AWS EKS deployment for North America region
# Mirrors Azure architecture with AWS equivalents

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "sewa-ai-tf-state-us"
    key    = "aws/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Platform    = "SEWA-AI"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

variable "aws_region"   { default = "us-east-1" }
variable "environment"  { default = "production" }
variable "cluster_name" { default = "sewa-ai-us" }
variable "db_password"  { sensitive = true }

# ── VPC ────────────────────────────────────────────────────────
resource "aws_vpc" "sewa" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "sewa-ai-vpc-us" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.sewa.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = "${var.aws_region}${["a","b"][count.index]}"
  tags = { Name = "sewa-private-${count.index}", "kubernetes.io/role/internal-elb" = "1" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.sewa.id
  cidr_block              = "10.0.${count.index + 10}.0/24"
  availability_zone       = "${var.aws_region}${["a","b"][count.index]}"
  map_public_ip_on_launch = true
  tags = { Name = "sewa-public-${count.index}", "kubernetes.io/role/elb" = "1" }
}

resource "aws_internet_gateway" "sewa" {
  vpc_id = aws_vpc.sewa.id
}

resource "aws_nat_gateway" "sewa" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
}

resource "aws_eip" "nat" { domain = "vpc" }

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.sewa.id
  route { cidr_block = "0.0.0.0/0"; nat_gateway_id = aws_nat_gateway.sewa.id }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ── EKS Cluster ────────────────────────────────────────────────
resource "aws_eks_cluster" "sewa" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = false  # Private cluster — API only via VPN
    security_group_ids      = [aws_security_group.eks.id]
  }

  encryption_config {
    resources = ["secrets"]
    provider  { key_arn = aws_kms_key.sewa.arn }
  }

  enabled_cluster_log_types = ["api","audit","authenticator","controllerManager","scheduler"]
}

resource "aws_eks_node_group" "backend" {
  cluster_name    = aws_eks_cluster.sewa.name
  node_group_name = "backend-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = ["m6i.xlarge"]

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 10
  }

  update_config { max_unavailable = 1 }

  labels = { workload = "backend" }
}

resource "aws_eks_node_group" "ai_gpu" {
  cluster_name    = aws_eks_cluster.sewa.name
  node_group_name = "ai-gpu-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = ["g4dn.xlarge"]  # NVIDIA T4 GPU

  scaling_config {
    desired_size = 2
    min_size     = 1
    max_size     = 6
  }

  labels  = { workload = "ai-inference" }
  taints  = [{ key = "gpu", value = "true", effect = "NO_SCHEDULE" }]
}

# ── RDS PostgreSQL 15 ──────────────────────────────────────────
resource "aws_db_subnet_group" "sewa" {
  name       = "sewa-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_rds_cluster" "sewa" {
  cluster_identifier      = "sewa-ai-postgres"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "sewa_ai"
  master_username         = "sewa"
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.sewa.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  backup_retention_period = 35      # 35-day HIPAA backup
  deletion_protection     = true
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.sewa.arn
  enabled_cloudwatch_logs_exports = ["postgresql"]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
}

resource "aws_rds_cluster_instance" "sewa" {
  count               = 2   # 1 writer + 1 reader
  identifier          = "sewa-ai-${count.index}"
  cluster_identifier  = aws_rds_cluster.sewa.id
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.sewa.engine
  engine_version      = aws_rds_cluster.sewa.engine_version
  publicly_accessible = false
}

# ── ElastiCache Redis 7 ────────────────────────────────────────
resource "aws_elasticache_subnet_group" "sewa" {
  name       = "sewa-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "sewa" {
  replication_group_id       = "sewa-ai-redis"
  description                = "SEWA XAI Redis — session + AI queue"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2   # Primary + replica
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.sewa.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.db_password
  automatic_failover_enabled = true
  multi_az_enabled           = true
}

# ── S3 — DICOM storage + Grad-CAM ─────────────────────────────
resource "aws_s3_bucket" "dicom" {
  bucket        = "sewa-ai-dicom-us-${var.environment}"
  force_destroy = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dicom" {
  bucket = aws_s3_bucket.dicom.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.sewa.arn
    }
  }
}

resource "aws_s3_bucket_versioning" "dicom" {
  bucket = aws_s3_bucket.dicom.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "dicom" {
  bucket = aws_s3_bucket.dicom.id
  rule {
    id     = "transition-to-ia"
    status = "Enabled"
    transition { days = 30;  storage_class = "STANDARD_IA" }
    transition { days = 365; storage_class = "GLACIER" }
    expiration { days = 2555 }  # 7-year HIPAA retention
  }
}

resource "aws_s3_bucket_public_access_block" "dicom" {
  bucket                  = aws_s3_bucket.dicom.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── AWS HealthLake (FHIR R4) ──────────────────────────────────
resource "aws_healthlake_fhir_datastore" "sewa" {
  datastore_name          = "sewa-ai-fhir-us"
  datastore_type_version  = "R4"

  sse_configuration {
    kms_encryption_config {
      cmk_type   = "CUSTOMER_MANAGED_KMS_KEY"
      kms_key_id = aws_kms_key.sewa.arn
    }
  }

  tags = { Compliance = "HIPAA", Purpose = "FHIR-R4" }
}

# ── KMS Key for encryption at rest ────────────────────────────
resource "aws_kms_key" "sewa" {
  description             = "SEWA XAI encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "Enable IAM User Permissions"
      Effect = "Allow"
      Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
      Action = "kms:*"
      Resource = "*"
    }]
  })
}

resource "aws_kms_alias" "sewa" {
  name          = "alias/sewa-ai"
  target_key_id = aws_kms_key.sewa.key_id
}

# ── Security Groups ────────────────────────────────────────────
resource "aws_security_group" "eks" {
  name   = "sewa-eks-sg"
  vpc_id = aws_vpc.sewa.id
  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["10.0.0.0/16"] }
  egress  { from_port = 0;   to_port = 0;   protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "rds" {
  name   = "sewa-rds-sg"
  vpc_id = aws_vpc.sewa.id
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.eks.id] }
}

resource "aws_security_group" "redis" {
  name   = "sewa-redis-sg"
  vpc_id = aws_vpc.sewa.id
  ingress { from_port = 6379; to_port = 6379; protocol = "tcp"; security_groups = [aws_security_group.eks.id] }
}

# ── IAM Roles ──────────────────────────────────────────────────
resource "aws_iam_role" "eks_cluster" {
  name               = "sewa-eks-cluster-role"
  assume_role_policy = jsonencode({ Version="2012-10-17", Statement=[{ Effect="Allow", Principal={ Service="eks.amazonaws.com" }, Action="sts:AssumeRole" }] })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role" "eks_node" {
  name               = "sewa-eks-node-role"
  assume_role_policy = jsonencode({ Version="2012-10-17", Statement=[{ Effect="Allow", Principal={ Service="ec2.amazonaws.com" }, Action="sts:AssumeRole" }] })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node" {
  for_each = toset(["arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy", "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy", "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"])
  role       = aws_iam_role.eks_node.name
  policy_arn = each.key
}

data "aws_caller_identity" "current" {}

# ── Outputs ────────────────────────────────────────────────────
output "eks_cluster_endpoint"  { value = aws_eks_cluster.sewa.endpoint }
output "rds_cluster_endpoint"  { value = aws_rds_cluster.sewa.endpoint }
output "redis_endpoint"        { value = aws_elasticache_replication_group.sewa.primary_endpoint_address }
output "dicom_bucket"          { value = aws_s3_bucket.dicom.id }
output "fhir_datastore_id"     { value = aws_healthlake_fhir_datastore.sewa.id }
output "fhir_datastore_endpoint" { value = aws_healthlake_fhir_datastore.sewa.datastore_endpoint }
