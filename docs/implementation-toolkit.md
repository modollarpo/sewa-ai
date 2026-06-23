# SEWA AI Implementation Toolkit
---
## Overview

This IT toolkit helps you integrate SEWA AI with your existing systems!

---
## 1. Prerequisites
- Azure/AWS/GCP subscription (depending on your region)
- Existing PACS/EMR (optional but recommended
- Internet connectivity (or edge deployment option for offline)
---
## 2. Deployment Steps (Azure AKS)
1. Complete prereq check (from `DEPLOYMENT.md`
2. Run `scripts/deploy-azure-full.sh production <region>`
3. Verify all pods are healthy
4. Configure domain and DNS
5. Test integrations
---
## 3. Integration Options
### 3.1 DICOM C-STORE
- Configure your PACS to push DICOM files to SEWA DICOM listener
- Listener runs on port 11112 by default
- Uses TLS in production
---
### 3.2 HL7v2
- Supported messages: ADT^A01, ORM^O01, ORU^R01
- Configure your EMR/HIS to send to SEWA HL7 MLLP endpoint
---
### 3.3 FHIR R4
- Use SEWA's FHIR API for modern EHR integration
- See `docs/fhir-api.md` for full spec
---
## 4. Security Configuration
- Set up Key Vault access policies
- Configure RBAC roles
- Set up MFA for all clinical users
---
## 5. Training & Go-Live
- Use our training content
- Plan go-live with pilot users first
- Have support on standby for first week
---
