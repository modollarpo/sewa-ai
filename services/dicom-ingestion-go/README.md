# SEWA XAI — DICOM Ingestion Service (Go)

## Why Go?

| Concern | Node.js | Python | **Go** |
|---------|---------|--------|--------|
| RAM at rest | ~80MB | ~120MB | **<20MB** |
| Binary size | ~300MB (with deps) | ~400MB | **~10MB** |
| DICOM concurrency | Event loop | GIL limited | **Native goroutines** |
| Startup time | ~2s | ~3s | **<100ms** |
| Type safety | Partial (TS) | Partial | **Full** |

For Africa and edge deployments on low-resource hardware, Go is the only viable choice for a high-throughput DICOM listener.

## Architecture

```
PACS / Modality (C-STORE) → TCP :11112
         ↓
   Go DICOM Listener
         ↓
   Anonymise (PHI strip)
         ↓
   Validate (modality, size, integrity)
         ↓
   Upload (Azure Blob / S3 / GCS)
         ↓
   Redis Queue (sewa:scan:queue)
         ↓
   Node.js Backend → AI Pipeline
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DICOM_PORT` | `11112` | DICOM C-STORE listen port |
| `HTTP_PORT` | `8090` | Health/metrics HTTP port |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `DATABASE_URL` | — | PostgreSQL (for scan metadata writes) |
| `STORAGE_PROVIDER` | `azure` | `azure` \| `aws` \| `gcp` |
| `AE_TITLE` | `SEWA_INGESTION` | DICOM Application Entity Title |
| `MAX_WORKERS` | `20` | Concurrent processing goroutines |
| `REGION` | `uk` | Deployment region |
| `TENANT_ID` | — | Hospital tenant ID |
| `DICOM_ANON_SALT` | — | Secret salt for UID pseudonymisation |
| `AZURE_STORAGE_ACCOUNT` | — | Azure storage account name |
| `AWS_S3_BUCKET_SCANS` | `sewa-ai-scans-us` | S3 bucket for US |
| `GCP_BUCKET_SCANS` | `sewa-ai-scans-eu` | GCS bucket for EU |

## Build & Run

```bash
# Local development
go run main.go

# Build binary
CGO_ENABLED=0 go build -o dicom-ingestion .

# Docker
docker build -t sewa-dicom-ingestion .
docker run -p 11112:11112 -p 8090:8090 \
  -e REDIS_URL=redis://redis:6379/0 \
  -e STORAGE_PROVIDER=azure \
  -e TENANT_ID=your-tenant-id \
  sewa-dicom-ingestion
```

## Health Endpoints

- `GET :8090/health` — liveness check
- `GET :8090/ready` — readiness check  
- `GET :8090/stats` — queue depth and worker stats
- `GET :8090/metrics` — Prometheus metrics

## DICOM Anonymisation

PHI tags zeroed on ingestion (DICOM PS 3.15 Annex E compliant):
- Patient Name → `ANON^SEWA^{pseudoID}`
- Patient ID → SHA-256 pseudonym (deterministic)
- Patient Birth Date → zeroed
- Institution Name → `SEWA_AI`
- All dates offset by tenant-specific random delta (k-anonymity)

## Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `sewa_dicom_received_total` | Counter | Files received |
| `sewa_dicom_processed_total` | Counter | Successfully processed |
| `sewa_dicom_failed_total` | Counter | Processing failures |
| `sewa_dicom_processing_seconds` | Histogram | End-to-end latency |
| `sewa_dicom_queue_depth` | Gauge | Files awaiting processing |

## Kubernetes Deployment

Add to `infrastructure/kubernetes/deployment.yaml`:

```yaml
- name: sewa-dicom-ingestion
  image: sewaairegistry.azurecr.io/sewa-dicom-ingestion:latest
  ports:
    - containerPort: 11112  # DICOM C-STORE
    - containerPort: 8090   # HTTP health
  resources:
    requests: { memory: "20Mi", cpu: "50m" }
    limits:   { memory: "64Mi", cpu: "200m" }
  env:
    - { name: REDIS_URL,          valueFrom: { secretKeyRef: { name: sewa-secrets, key: REDIS_URL } } }
    - { name: STORAGE_PROVIDER,   value: "azure" }
    - { name: MAX_WORKERS,        value: "20" }
    - { name: DICOM_ANON_SALT,    valueFrom: { secretKeyRef: { name: sewa-secrets, key: DICOM_ANON_SALT } } }
```
