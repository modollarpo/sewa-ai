# SEWA XAI — Clinical Intelligence Platform
## Smart Early Warning Assistant for Doctors
### *from hours, to seconds*

> © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
> **Contact:** info@sewaxai.health · www.sewaxai.health

---

## What is SEWA XAI?

SEWA XAI is an enterprise-grade clinical diagnostic AI architecture designed as an engineering target to reduce the time from medical scan acquisition to clinician alert from **4–8 hours to under 2 seconds** (engineering target / mock benchmark — not independently measured as a clinical outcome; see Technical Specifications & Evidence Matrix).

Built for NHS hospitals and African clinics — the same architecture, designed for environments from Azure clusters to offline ARM devices with no internet.

> **⚠️ Scope statement & Evidence Audit (Model Outputs & Claims).** 
> This repository contains **no clinically validated model weights and no patient datasets**. Every AI microservice defaults to demo/synthetic execution mode: predictions, Grad-CAM/SHAP attributions, uncertainty estimates, report text, and reliability metrics are produced by a **demo fallback pipeline** and are explicitly tagged in API responses (`demo_mode: true`, `backend: "demo"`). 
> 
> - **Evaluated Scope:** Only intracranial haemorrhage (ICH) triage on non-contrast head CT has been evaluated on public datasets (RSNA internal AUROC **0.807**, CQ500 external generalisation AUROC **0.7468** across $n=486$). 
> - **Inconclusive Findings:** Pre-registered metacognition evaluation showed a **0.0% safety error reduction** at a 20% review rate (95% CI [-8.1%, +6.5%], **inconclusive**); no hallucination-detection or safety-gating benefit is claimed.
> - **Certifications:** All regulatory certifications (UKCA, CE, ISO 13485/27001, DCB0129 compliance, DSPT) are in preparation, aligned, or planned — none are currently held or claimed as certified in this repository.
> - **Traceability:** See `docs/CLAIMS_EVIDENCE_MATRIX.md` for a complete audit of every claim across the project.

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FOUR-ENGINE AI PIPELINE                       │
│                                                                   │
│  DICOM / FHIR R4 / HL7v2 / Upload                               │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 1: Triage (ONNX INT8 / Demo Fallback, target ~380ms)│   │
│  │ ICH Triage evaluated · CT Head · prediction + urgency     │   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 2: Uncertainty (MC-Dropout target ~280ms)          │   │
│  │ Epistemic + aleatoric decomposition · Mandatory escalation│   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 3: VLM Report Generator (Target ~900ms)            │   │
│  │ Structured report template generation                     │   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  ┌──────▼────────────────────────────────────────────────────┐   │
│  │ Engine 4: Metacognition (Research-stage, target ~120ms)    │   │
│  │ Self-evaluation harness · Inconclusive safety gain        │   │
│  └──────┬────────────────────────────────────────────────────┘   │
│         │                                                         │
│  Door-to-alert: Engineering Target (~1.84s simulated)            │
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
│       │   ├── public/         18 public pages (landing, pricing, careers, whitepaper...)
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

| Metric | Value | Status |
|--------|-------|--------|
| Door-to-alert (median) | <2s (target ~1.84s) | Engineering target (not measured as clinical outcome) |
| Conditions / Modalities | ICH triage on non-contrast head CT | Evaluated scope; multi-condition/modality modules are planned |
| ICH AUC-ROC (Internal) | 0.807 | Verified on RSNA ICH public dataset (research-only) |
| ICH AUC-ROC (External) | 0.7468 | Verified on CQ500 external dataset ($n=486$, 3-rad majority) |
| Metacognition safety gain | 0.0% (95% CI [-8.1%, +6.5%]) | Pre-registered evaluation: **Inconclusive** (no safety-gating claim) |
| Deployments | Pre-clinical (TRL 5) | No live hospital deployments |
| Report languages | 8 | Supported by VLM language templates |
| API uptime SLA | 99.9% | Target |
| Encryption | AES-256 at rest, TLS 1.3 in transit | Azure best-practice defaults |

> **Honesty note:** Quantitative clinical-performance figures are restricted to pre-registered evaluations on public benchmark datasets (RSNA and CQ500) for ICH head CT triage. All other modules and claims are exploratory, research-stage, or planned. See `docs/CLAIMS_EVIDENCE_MATRIX.md`.

---

## Certifications & Compliance

| Certification | Status |
|---------------|--------|
| CE Mark IIb (EU MDR) | Not claimed — not evidenced in this repository |
| UKCA | Not claimed — not evidenced in this repository |
| ISO 13485:2016 | Not claimed — not evidenced in this repository |
| ISO 27001:2022 | Not claimed — not evidenced in this repository |
| NHS DSPT | Not claimed — not evidenced in this repository |
| DCB0129 | Not claimed — not evidenced in this repository |
| G-Cloud 14 | Not claimed — not evidenced in this repository |
| SOC 2 Type II | Not claimed — not evidenced in this repository |
| EU AI Act Art. 14 | By design (human-review gate implemented) |
| FDA 510(k) | Not claimed — not evidenced in this repository |

---

## Regulatory Lead

**Dr. Michelle Gomes** (Co-Founder, Head of Global Public Health)  
Leads all regulatory submissions: CE/UKCA renewal, FDA 510(k), NICE HTA, NAFDAC (Nigeria), PPB (Kenya).  
Clinical Safety Officer under DCB0129 v3.0.

---

## Inventor

The SEWA XAI multi-engine architecture, metacognition safety layer, federated learning subsystem, and sovereign deployment architecture are the sole invention of **Dolapo Ariyo**, protected by UK Provisional Patent Application (UKIPO, March 2026).

---

*SEWA XAI — from hours, to seconds*  
*© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.*
