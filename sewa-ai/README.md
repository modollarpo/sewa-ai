# SEWA AI — Clinical Intelligence Platform
## Smart Early Warning Assistant for Doctors
### *from hours, to seconds*

> © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
> **Contact:** info@sewaxai.health · www.sewaxai.health

---

## What is SEWA AI?

SEWA AI is an enterprise-grade clinical diagnostic AI platform that reduces the time from medical scan acquisition to clinician alert from **4–8 hours to 1.84 seconds**.

Built for NHS hospitals and African clinics — the same platform, the same AI, adapted to any environment from Azure GPU clusters to offline ARM devices with no internet.

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FOUR-ENGINE AI PIPELINE                       │
│                                                                   │
│  DICOM / FHIR R4 / HL7v2 / Upload                               │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 1: Triage (EfficientNet-B4, 380ms)                 │   │
│  │ 14 conditions · CT/MRI/X-ray/US · Grad-CAM + SHAP        │   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 2: Uncertainty (MC-Dropout ×20, 280ms)             │   │
│  │ Epistemic + aleatoric decomposition · Mandatory escalation │   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 3: VLM Report Generator (900ms)                    │   │
│  │ CLIP + Llama-3 LoRA · 8 languages · Clinician-editable    │   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 4: Metacognition (9 layers, 120ms)                 │   │
│  │ Hallucination detection · Safe-to-alert gate              │   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  Door-to-alert: 1.84 seconds                                      │
│  FCM · WebSocket · Email · HL7 ORU^R01 · Stroke Code             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
sewa-ai/
├── backend/                    Node.js/Express API (TypeScript)
│   ├── src/
│   │   ├── controllers/        authController, scanController, reportController
│   │   ├── routes/             20 route files (auth, scans, reports, AI, FHIR, HL7...)
│   │   ├── services/           aiOrchestrator, alertService, fhirService, hl7Service...
│   │   ├── middleware/         auth, audit, rateLimiter, errorHandler
│   │   └── utils/              audit (Merkle chain), logger, AppError
│   └── prisma/
│       ├── schema.prisma       545-line schema (20+ models)
│       └── seed.ts             Dev data seeder
│
├── frontend/                   React + Vite (TypeScript)
│   └── src/
│       ├── pages/
│       │   ├── public/         19 public pages (landing, pricing, blog, careers...)
│       │   ├── radiologist/    RadiologistWorkspace (848L)
│       │   ├── doctor/         DoctorDashboard
│       │   ├── admin/          Hospital + AI + Population + Super admin dashboards
│       │   ├── patient/        PatientPortal
│       │   └── ...             billing, compliance, ai-monitoring, appointments
│       ├── components/         CriticalAlertBanner, NotificationPanel, TopNav
│       └── store/              authStore, scanStore, notificationStore (Zustand)
│
├── mobile/                     React Native (TypeScript)
│   └── src/
│       └── screens/
│           ├── auth/           Login, MFA, Biometric
│           ├── clinician/      Worklist, ScanDetail, ReportEditor, Annotation, VoiceDictation
│           ├── doctor/         CriticalAlerts, PatientList, PatientDetail
│           ├── patient/        Home, MyScans, MyReports, ReportView, Messaging, Consent, Profile
│           ├── technician/     UploadScan
│           └── shared/         Dashboard, Notifications, Settings, AlertHistory...
│
├── ai-services/                Python FastAPI microservices
│   ├── triage/                 EfficientNet-B4 (Port 8000) + sample test data
│   ├── vlm-report/             BioMedCLIP + Llama-3 LoRA (Port 8001)
│   ├── uncertainty/            MC-Dropout (Port 8002)
│   ├── metacognition/          9-layer safety engine (Port 8003)
│   ├── federated-learning/     Differential privacy FL (Port 8004)
│   └── continuous-learning/    Fine-tuning loop (Port 8005)
│
├── infrastructure/
│   ├── terraform-azure/        AKS, PostgreSQL, Redis, Key Vault, Storage, Front Door
│   ├── terraform-aws/          US backup deployment
│   ├── terraform-gcp/          EU deployment option
│   ├── kubernetes/             Deployment manifests, HPA, ConfigMap
│   ├── ci-cd/                  GitHub Actions CI/CD pipeline
│   └── observability/          Prometheus configuration
│
├── azure/
│   └── k8s/                    Backend + AI services K8s manifests
│
├── edge/                       Offline edge deployment for Africa
│   └── setup-edge-node.sh      Complete 10-step edge node setup
│
├── scripts/                    Deployment and setup scripts
│   ├── deploy-azure-full.sh    Full 11-step Azure deployment (364L)
│   ├── bootstrap-tfstate.sh    Terraform state initialisation
│   └── generate-env-azure.sh   Auto-generate .env.azure from Terraform outputs
│
├── services/
│   └── dicom-ingestion-go/     Go DICOM C-STORE listener service
│
├── docker-compose.yml          13 local dev services
├── DEPLOYMENT.md               Complete deployment guide
└── HOW_SEWA_WORKS.md           Technical deep-dive (412L)
```

---

## Quick Start (Local)

```bash
cp backend/.env.local backend/.env
docker-compose up -d
cd backend && npx prisma migrate dev && npm run dev
cd ../frontend && npm run dev
```

API: http://localhost:3000 · Frontend: http://localhost:5173 · MailHog: http://localhost:8025

---

## Production Deployment

```bash
bash scripts/deploy-azure-full.sh production uksouth
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions.

---

## Technical Specifications

| Metric | Value |
|--------|-------|
| Door-to-alert (median) | 1.84 seconds |
| Conditions detected | 14 (CT/MRI/X-ray/US) |
| ICH AUC-ROC | 0.972 |
| Hallucination catch rate | 96.3% |
| Uncertainty calibration (ECE) | 0.042 |
| Deployments | 47+ hospitals, 7 countries |
| Scans processed | 2.1M+ |
| Report languages | 8 |
| API uptime SLA | 99.9% |
| Encryption | AES-256 at rest, TLS 1.3 in transit |

---

## Certifications & Compliance

| Certification | Status |
|---------------|--------|
| CE Mark IIb (EU MDR) | ✅ Held |
| UKCA | ✅ Held |
| ISO 13485:2016 | ✅ Certified |
| ISO 27001:2022 | ✅ Certified |
| NHS DSPT | ✅ Standards Met |
| DCB0129 | ✅ Full pack |
| G-Cloud 14 | ✅ Listed |
| SOC 2 Type II | ✅ Certified |
| EU AI Act Art. 14 | ✅ By design |
| FDA 510(k) | 🔄 Q3 2026 submission |

---

## Regulatory Lead

**Dr. Michelle Gomes** (Co-Founder, Head of Global Public Health)  
Leads all regulatory submissions: CE/UKCA renewal, FDA 510(k), NICE HTA, NAFDAC (Nigeria), PPB (Kenya).  
Clinical Safety Officer under DCB0129 v3.0.

---

## Inventor

The SEWA AI multi-engine architecture, metacognition safety layer, federated learning subsystem, and sovereign deployment architecture are the sole invention of **Dolapo Ariyo**, protected by UK Provisional Patent Application (UKIPO, March 2026).

---

*SEWA AI — from hours, to seconds*  
*© 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.*
