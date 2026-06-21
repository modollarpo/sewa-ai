# SEWA AI — NHS Deployment & Integration Blueprint

This document outlines the technical architecture, security requirements, and integration specifications required to deploy the SEWA AI Clinical Intelligence Platform within an NHS Trust. It is intended for NHS IT Directors, Information Governance (IG) Leads, and PACS Administrators.

---

## 1. Infrastructure & Data Residency
SEWA AI operates a zero-trust, multi-tenant architecture designed explicitly for statutory compliance with the **NHS Data Security and Protection Toolkit (DSPT)** and the **UK General Data Protection Regulation (UK GDPR)**.

* **Primary Hosting Environment**: Microsoft Azure `UK South` (London)
* **Disaster Recovery / Failover**: Microsoft Azure `UK West` (Cardiff)
* **Data Residency Guarantee**: 100% of patient data (DICOM imaging, FHIR records, and AI inferences) remains physically within the borders of the United Kingdom at all times.
* **Tenant Isolation**: Each NHS Trust is provisioned with a logically isolated database schema and dedicated object storage blob containers. Cross-tenant data contamination is mathematically prevented at the ORM (Prisma) level.

---

## 2. Network Connectivity & Security
To ensure Protected Health Information (PHI) is never exposed to the public internet, SEWA supports direct integration with the **Health and Social Care Network (HSCN)**.

### Encryption Standards
* **In Transit**: All network traffic is encrypted using TLS 1.3.
* **At Rest**: All databases and Blob storage containers are encrypted using AES-256.

### Connectivity Options
For a production deployment, NHS Trusts may choose one of two secure connectivity paradigms:
1. **Azure ExpressRoute / HSCN Peering**: Direct private peering between the Trust's VNet and the SEWA Azure VNet.
2. **Site-to-Site IPsec VPN**: An encrypted tunnel between the hospital's edge router and the SEWA Azure VPN Gateway.

---

## 3. PACS / DICOM Integration
SEWA AI ingests imaging studies via standard DICOM C-STORE protocols. The SEWA DICOM Receiver node operates as a highly available service within the Azure Kubernetes Service (AKS) cluster.

### DICOM Configuration Specifications
To route anonymised or live studies to SEWA, the local PACS administrator must configure a new DICOM destination node with the following parameters:

* **Target IP Address**: `[Provided Post-VPN Setup - e.g., 10.x.x.x]`
* **Target Port**: `11112` (Default SEWA DICOM Port)
* **Target AE Title**: `SEWA_AI_UK`
* **Source AE Title**: Must be explicitly whitelisted in the SEWA Admin Dashboard.
* **Anonymisation Preference**: For "Audit/Retrospective" mode, the Trust's PACS router should ideally strip PHI (tags 0010,0010 / 0010,0020) prior to transmission, or rely on SEWA's edge-anonymiser.

---

## 4. EHR / PAS Integration (FHIR R4)
To provide multimodal clinical context and write reports back into the Trust's Electronic Patient Record (EPR), SEWA exposes a secure FHIR R4 webhook interface.

### Patient Identification (NHS Number)
SEWA maps the 10-digit **NHS Number** as the primary patient identifier. 
All inbound FHIR resources (`Patient`, `ImagingStudy`, `DiagnosticReport`) must include the NHS identifier system:
`https://fhir.nhs.uk/Id/nhs-number`

### Webhook Authentication
The NHS Trust’s integration engine (e.g., Rhapsody, Mirth Connect, Ensembles) will authenticate with the SEWA FHIR listener via a static, cryptographically secure API Key generated during onboarding.

* **Endpoint**: `https://api.sewaxai.health/api/v1/fhir/webhook`
* **Header Required**: `X-API-Key: sk_live_...`

---

## 5. Regulatory Status (MHRA)
SEWA AI incorporates advanced Deep Learning for triage, uncertainty quantification, and Vision-Language Model (VLM) reporting.

* **Classification**: Software as a Medical Device (SaMD) Class IIa/IIb (Pending MHRA / UKCA Mark).
* **Current Operational Mode**: Until formal clinical certification is complete, SEWA AI is deployed in **"Clinical Audit / Research Mode"**. 
* **Implication**: AI outputs are strictly separated from front-line clinical decision-making. The platform runs passively on historical data to build localized validation cohorts, allowing the Trust to evaluate accuracy and workflow impact safely.

---

## 6. Next Steps for Onboarding
To initiate the pilot program, the following sequence of events is required:

1. **Information Governance (IG) Approval**: Sign the Data Processing Agreement (DPA) and review the SEWA DPIA (Data Protection Impact Assessment).
2. **Network Handshake**: Exchange VPN / HSCN parameters between SEWA cloud engineers and the Trust network team.
3. **Provisioning**: SEWA issues the `Tenant API Key` and Admin credentials.
4. **DICOM Ping Test**: Trust PACS admin sends a test DICOM C-ECHO and subsequent C-STORE of an anonymised phantom scan.
5. **Historical Ingestion**: Bulk routing of 6-12 months of historical (anonymised) imaging for local AI accuracy validation.
