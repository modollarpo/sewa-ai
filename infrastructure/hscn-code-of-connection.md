# HSCN VPN Gateway — SEWA AI Infrastructure

## Overview

Connects SEWA AI's Azure AKS cluster to NHS HSCN (Health and Social Care Network) for:
- PACS/RIS data ingestion from NHS Trust sites
- Spine (PDS, SDS) lookups
- FHIR API consumption via NHS Digital APIs

## Architecture

```
[ NHS Trust Site ]
        |
  [ HSCN/PDN ]
        |
  [ Azure ExpressRoute (Microsoft UK) ]
        |
  [ VPN Gateway ] -- IPSec S2S Tunnel
        |
  [ SEWA AI VNet ]
        |
  [ AKS Cluster ] -- Private Endpoints
```

## Terraform

File: `infrastructure/terraform/hscn-vpn-gateway.tf`
