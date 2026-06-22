# SEWA AI Disaster Recovery Plan (NHS Clinical Study Pilot)

## 1. Overview
This document outlines the disaster recovery (DR) procedures for SEWA AI during the NHS clinical study pilot, with RTO (Recovery Time Objective) < 4 hours and RPO (Recovery Point Objective) < 15 minutes.

## 2. Infrastructure Setup
- **Primary Region**: UK South
- **Secondary Region**: UK West

## 3. DR Steps
1. **Failover Database**: Promote Azure PostgreSQL read replica in secondary region to primary
2. **Redirect Traffic**: Update Azure Front Door to route traffic to secondary region AKS
3. **Restore Storage**: Failover Azure Storage (GRS) to secondary region
4. **Verify Services**: Ensure all SEWA AI services are healthy in secondary region
5. **Communicate**: Notify NHS trust study team of failover status

## 4. Failback
1. **Restore Primary Region**: Recreate services in UK South once healthy
2. **Sync Data**: Replicate database and storage back to UK South
3. **Redirect Traffic**: Switch Front Door back to primary region

## 5. Testing
- Quarterly DR drills
- Monthly backup verification
