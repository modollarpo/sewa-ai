# SEWA XAI — Deployment Guide
*from hours, to seconds*

© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.

---

## Quick Reference

| Target | Command | Time |
|--------|---------|------|
| Local dev | `docker-compose up -d` | ~3 min |
| Azure full | `bash scripts/deploy-azure-full.sh production uksouth` | ~25 min |
| Edge node | `bash edge/setup-edge-node.sh --tenant-id=X --api-key=Y` | ~10 min |
| Patient app (EAS) | `npx eas build --platform all --profile patient-production` | ~20 min |

---

## 1. Local Development

### Prerequisites
- Docker 24+ and Docker Compose v2
- Node.js 20+
- (Optional) NVIDIA GPU for full AI inference — CPU fallback active without GPU

### Start Everything

```bash
# 1. Clone and enter
git clone https://github.com/storegrill/sewa-ai && cd sewa-ai

# 2. Copy local env
cp backend/.env.local backend/.env

# 3. Start all 13 services
docker-compose up -d

# 4. Run DB migrations
cd backend && npx prisma migrate dev

# 5. Start backend in dev mode (hot reload)
npm run dev

# 6. Start frontend (separate terminal)
cd ../frontend && npm run dev
```

### Local Service URLs

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Nginx (proxy) | http://localhost:80 |
| Triage Engine | http://localhost:8000 |
| VLM Report | http://localhost:8001 |
| Uncertainty | http://localhost:8002 |
| Metacognition | http://localhost:8003 |
| Federated Learning | http://localhost:8004 |
| Continuous Learning | http://localhost:8005 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / sewa_grafana_dev) |
| MailHog (email) | http://localhost:8025 |

### Default Test Credentials

| Role | Email | Password |
|------|-------|---------|
| Super Admin | superadmin@sewa.local | sewa_dev_2026 |
| Radiologist | radiologist@demo.local | sewa_dev_2026 |
| Doctor | doctor@demo.local | sewa_dev_2026 |
| Patient | patient@demo.local | sewa_dev_2026 |
| Technician | technician@demo.local | sewa_dev_2026 |

---

## 2. Azure Production Deployment

### Prerequisites
- `az` CLI (`az login`)
- `terraform` >= 1.6
- `docker` running
- `kubectl`, `jq`, `node 20+`

### Bootstrap (first time only)

```bash
bash scripts/bootstrap-tfstate.sh
cd infrastructure/terraform-azure
cp terraform.tfvars.example terraform.tfvars
# Fill in all 🔑 values in terraform.tfvars
```

### Full Deploy

```bash
# Deploy to production UK South
bash scripts/deploy-azure-full.sh production uksouth

# Deploy to staging
bash scripts/deploy-azure-full.sh staging uksouth

# Deploy to EU West
bash scripts/deploy-azure-full.sh production westeurope
```

### What the deployment script does (11 steps)

| Step | Action |
|------|--------|
| 0 | Prerequisites check |
| 1 | Terraform: AKS, PostgreSQL, Redis, Key Vault, Storage, Log Analytics |
| 2 | ACR login |
| 3 | Backend: build TypeScript, Docker image, push to ACR |
| 4 | AI services: build + push all 6 Python FastAPI containers |
| 5 | AKS: apply K8s manifests, inject secrets from Key Vault, wait for rollout |
| 6 | Database: Prisma migrate + seed |
| 7 | Frontend: Vite build + Azure Static Web Apps deploy |
| 8 | Mobile: EAS Build submit (iOS + Android) |
| 9 | Patient app: EAS Build patient-production profile |
| 10 | Post-deploy health verification |
| 11 | Deployment record saved to Azure Blob |

### Azure Infrastructure

| Component | Azure Resource | Size |
|-----------|---------------|------|
| AKS | Azure Kubernetes Service | CPU: D4s_v3 ×3 |
| GPU Pool | AKS node pool | NC4as_T4_v3 ×2 (T4 GPU) |
| Database | Azure Database for PostgreSQL Flexible | General Purpose |
| Cache | Azure Cache for Redis | Standard C1 |
| Storage | Azure Blob Storage | LRS, lifecycle managed |
| CDN | Azure Front Door | WAF enabled |
| Secrets | Azure Key Vault | Standard |
| Monitoring | Log Analytics + Application Insights | Per-workspace |

---

## 3. Mobile App Deployment

### Prerequisites

```bash
cd mobile
npm install
npm install -g @expo/eas-cli
eas login
```

### Clinician / Doctor App

```bash
# iOS + Android preview (internal distribution)
npx eas build --platform all --profile preview

# iOS + Android production (App Store / Play Store)
npx eas build --platform all --profile production
```

### Patient App (separate bundle ID)

```bash
# Patient staging build (internal testing)
npx eas build --platform all --profile patient-preview

# Patient production build (App Store / Play Store)
npx eas build --platform all --profile patient-production
```

The patient app uses:
- **iOS bundle ID:** `health.sewaxai.patient`
- **Android application ID:** `health.sewaxai.patient`
- **7 tabs:** Home · My Scans · Reports · Messages · Schedule · Privacy · Profile
- **API:** `https://api.sewaxai.health/api/v1`

### Environment Config

Edit `mobile/app.json` → `extra.apiUrl` for the API endpoint:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.sewaxai.health/api/v1",
      "environment": "production"
    }
  }
}
```

---

## 4. Edge Node Deployment (Africa / Offline)

For hospitals with limited or no internet connectivity.

### Requirements
- Ubuntu 22.04 LTS
- 4-core CPU, 8GB RAM, 128GB SSD
- Optional: GSM modem for SMS alerts (Africa's Talking SIM)

### Setup

```bash
# With internet at first (to download INT8 model)
bash edge/setup-edge-node.sh \
  --tenant-id=YOUR_TENANT_ID \
  --api-key=YOUR_API_KEY \
  --region=africa \
  --sms-key=YOUR_AFRICASTALKING_KEY

# Verify
curl http://localhost:8000/health
# → {"status":"healthy","mode":"int8_onnx"}
```

### Offline Operation

Once set up, the edge node operates **fully offline**:
- INT8 quantised EfficientNet-B4 model runs on CPU (~2100ms/scan)
- SQLite local database stores up to 500 scans
- SMS alerts via GSM modem for CRITICAL findings
- Auto-syncs to cloud every 5 minutes when connectivity resumes
- Merkle-chained audit log preserved across offline periods

### Edge Manual Sync

```bash
/opt/sewa-edge/sync_to_cloud.sh
```

---

## 5. AI Pipeline Testing

### Run Sample Data Tests

```bash
cd ai-services/triage/sample_data
python3 generate_test_dicoms.py  # generates 8 synthetic test cases

# Test against running triage service
curl -X POST http://localhost:8000/predict \
  -F "scan_id=TEST-ICH-001" \
  -F "modality=CT" \
  -F "body_part=HEAD"
```

### Test Cases

| Case | Tests |
|------|-------|
| TEST-ICH-001 | High-confidence ICH detection |
| TEST-PE-001 | Pulmonary embolism |
| TEST-TB-001 | Tuberculosis CXR (Africa use case) |
| TEST-PNEU-001 | Tension pneumothorax → CRITICAL |
| TEST-NORMAL-001 | Normal study (specificity) |
| TEST-UNCERTAIN-001 | Uncertainty engine escalation |
| TEST-META-001 | Metacognition Layer 1 rejection |
| TEST-STROKE-001 | Stroke code activation |

---

## 6. Switching Between Local ↔ Azure

Controlled by a single line in `backend/.env`:

```bash
DEPLOY_TARGET=local   # uses docker-compose
DEPLOY_TARGET=azure   # uses Azure managed services
```

```bash
# Switch to Azure
cp backend/.env.azure backend/.env

# Switch back to local
cp backend/.env.local backend/.env
```

---

## 7. Health Checks

```bash
# Backend API
curl https://api.sewaxai.health/health

# All AI services
for port in 8000 8001 8002 8003 8004 8005; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r .status)"
done

# K8s pods (production)
kubectl get pods -n sewa-ai

# View logs
kubectl logs -n sewa-ai -l app=sewa-backend --tail=50 -f
```

---

## 8. Monitoring

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | https://monitoring.sewaxai.health | Set in Key Vault |
| Prometheus | Internal only | K8s service |
| Application Insights | Azure Portal | Azure credentials |
| Sentry | https://sentry.io | Configure SENTRY_DSN |

---

*© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.*
*info@sewaxai.health · www.sewaxai.health · from hours, to seconds*
