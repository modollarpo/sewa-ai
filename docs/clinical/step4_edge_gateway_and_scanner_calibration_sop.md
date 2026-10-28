# NHS Technical Standard Operating Procedure: Edge Gateway & Scanner Calibration

**Document Identifier**: `SEWA-TECH-SOP-STEP4-001`  
**Target Audience**: NHS Trust PACS Managers, Hospital Network Engineers, Lead Medical Physicists, and SEWA Field Deployment Engineers  
**Governing Context**: Step 4 of the NHS Deployment Pathway for SEWA-SHADOW-1  
**Security Classification**: Official-Sensitive (Technical Configuration)

---

## 1. Network Architecture & Prerequisites

The SEWA Edge Gateway is deployed as an on-premises virtual appliance or lightweight Docker container within the hospital DMZ on the local PACS network.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              HOSPITAL TRUST NETWORK (DMZ)                              │
│                                                                                        │
│   [CT / MR / X-Ray Scanners]                                                           │
│          │                                                                             │
│          ▼ (DICOM C-STORE)                                                             │
│   [Hospital PACS Archive] (Sectra / Agfa / GE / Philips)                               │
│          │                                                                             │
│          ▼ (Auto-Forwarding Rule / DICOM C-STORE SCP)                                  │
│   ┌──────────────────────────────────────────────────────────────────┐                 │
│   │               SEWA EDGE GATEWAY APPLIANCE                        │                 │
│   │               (Docker Container / Ubuntu LTS)                    │                 │
│   │                                                                  │                 │
│   │   • DICOM Port: 11112 (TCP)                                      │                 │
│   │   • Calling AETitle: SEWA_EDGE                                   │                 │
│   │   • Called AETitle: HOSPITAL_PACS                                │                 │
│   │   • Anonymisation: DICOM PS 3.15 Annex E Basic Profile           │                 │
│   │   • Hashing: HMAC-SHA256 Salted Pseudonymization                 │                 │
│   └──────────────────────────────────┬───────────────────────────────┘                 │
└──────────────────────────────────────┼─────────────────────────────────────────────────┘
                                       │
                                       ▼ (Outbound Only: TLS 1.3 Port 443)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  SEWA SOVEREIGN HEALTHCARE CLOUD (AZURE UK SOUTH)                      │
│                                                                                        │
│   • API Endpoint: https://api.sewaxai.health:443                                       │
│   • Dashboard: https://app.sewaxai.health                                             │
│   • Dedicated Virtual Network (VNet) with mTLS 256-bit encryption                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Technical Prerequisites Checklist
| Requirement | Specification | Hospital Sign-Off |
|:---|:---|:---:|
| **Server Hardware / VM** | 4 vCPU, 8 GB RAM, 100 GB SSD storage (Ubuntu 22.04 LTS or RHEL 8+) | `[  ]` |
| **Network Interface** | Single virtual NIC on Hospital PACS VLAN (Static IP assigned) | `[  ]` |
| **Inbound Firewall** | TCP Port 11112 open from Hospital PACS IP only | `[  ]` |
| **Outbound Firewall** | TCP Port 443 open to `api.sewaxai.health` (IP whitelisted, mTLS 1.3) | `[  ]` |
| **PACS Rule** | Auto-forward rule configured on PACS for emergency non-contrast head CT series | `[  ]` |

---

## 2. Edge Gateway Deployment SOP

### 2.1 Docker Compose Appliance Configuration
Create `/opt/sewa-gateway/docker-compose.yml`:

```yaml
version: '3.8'

services:
  sewa-edge-gateway:
    image: sewaxai.azurecr.io/sewa-edge-gateway:2.4.1
    container_name: sewa_edge_gateway
    restart: unless-stopped
    ports:
      - "11112:11112"
    environment:
      - DICOM_AETITLE=SEWA_EDGE
      - DICOM_PORT=11112
      - CLOUD_ENDPOINT=https://api.sewaxai.health/v1/ingest
      - TRUST_ID=NHS_TRUST_UHB_01
      - SALT_KEY_FILE=/run/secrets/trust_salt.key
      - LOG_LEVEL=INFO
      - PURGE_LOCAL_DICOM_AFTER_SECONDS=300
    volumes:
      - /opt/sewa-gateway/data:/var/sewa/buffer
      - /opt/sewa-gateway/logs:/var/sewa/logs
      - /opt/sewa-gateway/certs:/etc/sewa/certs:ro
    secrets:
      - trust_salt.key

secrets:
  trust_salt.key:
    file: /opt/sewa-gateway/secrets/salt.key
```

### 2.2 DICOM PS 3.15 Annex E Anonymisation Rules
The gateway scrubs direct patient identifiers prior to writing any data to temporary disk:
- **Direct Identifiers Cleared / Hashed**:
  - `(0010,0010)` PatientName $\rightarrow$ Pseudonymized (`SHADOW-UHB-XXXXX`)
  - `(0010,0020)` PatientID $\rightarrow$ Pseudonymized hash
  - `(0010,0030)` PatientBirthDate $\rightarrow$ Blanked
  - `(0008,0050)` AccessionNumber $\rightarrow$ Salted Hash
  - `(0008,0080)` InstitutionName $\rightarrow$ Stripped
  - `(0008,1030)` StudyDescription $\rightarrow$ Standardized ("NON-CONTRAST HEAD CT")
- **Technical Acquisition Attributes Preserved**:
  - `(0018,0050)` SliceThickness, `(0018,0060)` KVP, `(0018,1150)` ExposureTime
  - `(0018,1210)` ConvolutionKernel, `(0028,1050)` WindowCenter, `(0028,1051)` WindowWidth

---

## 3. The 3-Phase Scanner Calibration SOP (ADR 004)

### Phase 1: Zero-Label Adaptive Batch Normalization (AdaBN) SOP
**Purpose**: Update frozen BatchNorm running statistics ($\mu, \sigma^2$) to eliminate vendor reconstruction bias between GE, Siemens, and Philips scanners without requiring manual clinician labels.

1. **Extraction**: Pull 50–100 historical anonymised head CT scans from the specific local scanner gantry.
2. **Execute AdaBN Python Script**:
   ```bash
   python -m validation.scripts.adabn_scanner_calibrate \
       --input-dir /var/sewa/calibration/scanner_01 \
       --output-ckpt /opt/sewa-gateway/models/classifier_v2a1_calibrated.pt \
       --batch-size 32
   ```
3. **Verification**: Confirm that target domain study AUROC improves by $>+0.010$ (benchmarked +0.0105 gain on CQ500 in Test C.2).

### Phase 2: Split Conformal Risk Control Calibration SOP
**Purpose**: Derive the exact non-conformity threshold $\lambda$ to guarantee an empirical False Negative Rate $\text{FNR} \le 5.0\%$.

1. **Calibration Cohort**: Ingest 100 historical audited scans from the hospital archive (50 confirmed acute ICH positive, 50 confirmed normal).
2. **Compute Threshold $\lambda$**:
   ```bash
   python -m validation.scripts.conformal_calibrate \
       --labels /var/sewa/calibration/audited_labels.csv \
       --alpha 0.05 \
       --output-config /opt/sewa-gateway/config/conformal_risk.json
   ```
3. **Verification Check**: Verify that empirical FNR on the calibration cohort is $\le 5.0\%$ with safety clearance rate $\ge 10.0\%$.

### Phase 3: Live Prospective Shadow-Mode Activation
1. Activate PACS auto-forwarding rule to `SEWA_EDGE` on port 11112.
2. Confirm active incoming stream in SEWA Cloud Audit Dashboard (`https://app.sewaxai.health/admin/stream-monitor`).
3. Verify that zero notifications or alerts reach hospital PACS or radiology worklists.
