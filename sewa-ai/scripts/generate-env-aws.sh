#!/usr/bin/env bash
# SEWA AI — scripts/generate-env-aws.sh
# Reads Terraform AWS outputs and generates backend/.env.aws

set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; NC='\033[0m'
info()    { echo -e "${CYAN}[SEWA]${NC} $*"; }
success() { echo -e "${GREEN}[SEWA ✓]${NC} $*"; }

TF_DIR="infrastructure/terraform-aws"
OUT="backend/.env.aws"

[[ -d "$TF_DIR" ]] || { echo "Run from project root"; exit 1; }

info "Reading Terraform AWS outputs…"
cd "$TF_DIR"

DB_ENDPOINT=$(terraform output -raw db_endpoint  2>/dev/null | sed 's/:5432//' || echo "CHANGE_ME")
DB_PASS=$(terraform output -raw db_password       2>/dev/null || echo "CHANGE_ME")
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint 2>/dev/null | sed 's/:6379//' || echo "CHANGE_ME")
REGION=$(terraform output -raw aws_region         2>/dev/null || echo "us-east-1")
ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "CHANGE_ME")

cd - >/dev/null

cat > "$OUT" << EOF
# SEWA AI — backend/.env.aws (auto-generated $(date -u +"%Y-%m-%dT%H:%M:%SZ"))

DEPLOY_TARGET=aws
NODE_ENV=production
PORT=3000
REGION=us
APP_URL=https://us.sewaxai.health
CORS_ORIGINS=https://us.sewaxai.health,https://app.sewaxai.health
LOG_LEVEL=info

DATABASE_URL=postgresql://sewa:${DB_PASS}@${DB_ENDPOINT}:5432/sewa_ai?sslmode=require

REDIS_URL=rediss://:CHANGE_ME@${REDIS_ENDPOINT}:6379/0

JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 16)

AI_SERVICE_URL=http://sewa-ai-triage:8000
VLM_SERVICE_URL=http://sewa-ai-vlm:8001
UNCERTAINTY_SERVICE_URL=http://sewa-ai-uncertainty:8002
METACOGNITION_SERVICE_URL=http://sewa-ai-metacognition:8003
FL_SERVICE_URL=http://sewa-ai-federated:8004
CL_SERVICE_URL=http://sewa-ai-continuous:8005

STORAGE_PROVIDER=aws
AWS_REGION=${REGION}
AWS_S3_BUCKET_SCANS=sewa-ai-scans-us
AWS_S3_BUCKET_REPORTS=sewa-ai-reports-us
AWS_S3_BUCKET_GRADCAM=sewa-ai-gradcam-us
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY not needed on EKS with IRSA

# ── Fill these manually ──────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_CHANGE_ME
STRIPE_WEBHOOK_SECRET=whsec_CHANGE_ME
FIREBASE_PROJECT_ID=CHANGE_ME
FIREBASE_PRIVATE_KEY=CHANGE_ME
FIREBASE_CLIENT_EMAIL=CHANGE_ME
TWILIO_ACCOUNT_SID=CHANGE_ME
TWILIO_AUTH_TOKEN=CHANGE_ME
TWILIO_WHATSAPP_NUMBER=+14155238886
SENDGRID_API_KEY=CHANGE_ME
EMAIL_FROM=info@sewaxai.health
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=\${SENDGRID_API_KEY}
DAILY_API_KEY=CHANGE_ME
PAYSTACK_SECRET_KEY=sk_live_CHANGE_ME
EOF

success "Generated ${OUT}"
info "Next: cp backend/.env.aws backend/.env && bash scripts/deploy.sh aws"
