# SEWA AI — Recommended Features & Roadmap

> © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.

---

## Immediate (Next Sprint — Q2 2026)

### 1. Ambient Clinical Intelligence (Voice Dictation)
**Impact:** Radiologists spend 40% of time on documentation. ACI cuts report time from 15 min to 90 seconds.
**Implementation:** Azure Cognitive Services Speech → real-time STT with medical vocabulary → correlate with DICOM viewer timestamps → auto-populate Technique/Findings/Impression sections.
**Files to create:** `ai-services/ambient-voice/`, `frontend/src/components/radiologist/VoiceDictation.tsx`
**Revenue:** £500/seat/month add-on for Enterprise.

### 2. Longitudinal Patient Tracking
**Impact:** Quantify disease progression for cancer, TB, MS without manual comparison.
**Implementation:** Deformable image registration (SimpleElastix/ANTs) → 3D U-Net segmentation → RECIST 1.1 auto-measurement → timeline in patient portal.
**Files to create:** `ai-services/longitudinal/`, `frontend/src/pages/patient/ProgressionTimeline.tsx`

### 3. Stripe Connect — Referral Marketplace Commission
**Impact:** Unlocks Revenue Stream 3 (10% commission on referral fees). Infrastructure already built.
**Implementation:** Stripe Connect for specialist payouts → `referralNetworkService.ts` charge split.
**Gap:** `paymentService.ts` has `chargePerScan()` but no `splitReferralFee()`.

### 4. Invoice PDF Generation
**Impact:** Required for NHS procurement and enterprise billing compliance.
**Implementation:** `@react-pdf/renderer` → auto-generate invoice on each billing cycle → email via SendGrid + store in Azure Blob.
**Files to create:** `backend/src/services/invoiceService.ts`, `backend/src/templates/invoice.tsx`

### 5. Dunning Management (Failed Payment Recovery)
**Impact:** Reduces churn from involuntary payment failures (estimated 15-20% of churned SaaS revenue).
**Implementation:** Stripe dunning schedules → retry D+1, D+3, D+7 → grace period → suspension → `past_due` tenant status already wired.

---

## Near-term (Q3 2026)

### 6. Multimodal Clinical Fusion
**Impact:** ICH risk dramatically higher in patients on anticoagulants. Fusing lab+vitals+imaging gives richer context.
**Implementation:** FHIR R4 ingestion of Observation (labs), Medication, Condition resources → FLAVA cross-attention fusion → `contextual_adjustment_factor` on confidence score.

### 7. Universal Health ID Integration
**Impact:** Patient records portable across facilities — critical for Africa use case.
**Implementation:** FHIR Patient with NHS Number/Ghana NHIA/Kenya NHIF cross-references → QR code in patient portal → offline NFC summary card.

### 8. Grafana Dashboard Provisioning
**Impact:** Production observability is incomplete — Grafana is deployed but empty.
**Implementation:** JSON dashboard definitions in `infrastructure/observability/grafana/` → Terraform `azurerm_dashboard_grafana_dashboard` resource.
**Files to create:** `infrastructure/observability/grafana/sewa-overview.json`, `sewa-ai-performance.json`, `sewa-clinical-safety.json`

### 9. DICOM Worklist (MWL) Server
**Impact:** Hospitals send modality worklists to scanners. Without MWL, manual patient data entry at scanner.
**Implementation:** Extend `services/dicom-ingestion-go/` with C-FIND SCP for MWL queries → pull scheduled procedures from Prisma `Scan` table.

### 10. Automated DB Backup Verification
**Impact:** HIPAA/NHS DSP Toolkit requires tested backup restoration — currently untested.
**Implementation:** Weekly CronJob in K8s → restore last backup to temp DB → run schema validation → alert if mismatch.
**Files to create:** `azure/k8s/backup-verification-cronjob.yaml`

---

## Medium-term (Q4 2026)

### 11. Zero-Knowledge Proof Patient Consent
**Impact:** EU AI Act Article 22 compliance; makes consent mathematically verifiable.
**Implementation:** Circom/snarkjs ZK circuits → patient mobile app generates proof → hospital smart contract verifies.

### 12. Radiology Training Platform
**Impact:** Addresses African radiologist shortage long-term; Revenue Stream 4 (B2C + B2B).
**Implementation:** Anonymised scan library with AI+expert labels → trainee diagnosis → AI feedback → CME credit integration.
**Revenue:** £15/month B2C; £5,000/year per medical school.

### 13. Population Health Dashboard — WHO/Government Export
**Impact:** Revenue Stream 5 — public health API for governments and NGOs.
**Implementation:** Differential privacy aggregation already in `populationHealthService.ts` → add export API → OpenMRS/DHIS2 integration → WHO reporting format.

### 14. k6 Load Testing Suite
**Impact:** No validated throughput numbers — needed for NHS procurement and enterprise SLAs.
**Implementation:** `tests/load/` with k6 scripts for: scan upload, AI pipeline, report signing, concurrent WebSocket connections.
**Target:** 1,000 concurrent scans, P95 < 2.5s door-to-alert.

### 15. FDA 510(k) Pre-Submission Package
**Impact:** US market entry — HIPAA-compliant, FDA cleared.
**Leader:** Dr. Michelle Gomes (Clinical Safety Officer)
**Timeline:** Pre-submission Q2 2026; submission Q3 2026.

---

## Technical Debt (Ongoing)

| Item | Priority | Effort |
|------|----------|--------|
| Replace hardcoded FX rates with live FX API | High | 1 day |
| Add `axios` instance with retry logic to AI service calls | High | 0.5 days |
| Implement Stripe webhook signature validation (currently checks but logs warning) | Critical | 0.5 days |
| Add structured logging (JSON) to all Python AI services | Medium | 2 days |
| AI service `/metrics` Prometheus endpoint (currently `/health` only) | Medium | 1 day per service |
| Mobile: replace `console.error` with Sentry crash reporting | Medium | 1 day |
| Frontend: add React error boundaries around radiologist workspace | High | 1 day |
| Backend: add request correlation ID (X-Request-ID) across all services | High | 1 day |

---

*© 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.*
*info@sewaxai.health · sewaxai.health · from hours, to seconds*
