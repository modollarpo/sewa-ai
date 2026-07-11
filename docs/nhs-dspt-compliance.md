# SEWA XAI NHS DSPT Compliance Checklist (Clinical Study Pilot)

## 1. Governance
- ✅ Data Protection Officer appointed
- ✅ Privacy Impact Assessment (PIA) completed
- ✅ IRAS form submission in progress

## 2. Data Security
- ✅ Encryption at rest (Azure Storage, Azure PostgreSQL)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Azure Key Vault for secret management
- ✅ Role-Based Access Control (RBAC)
- ✅ Network segmentation (Kubernetes NetworkPolicies)

## 3. Monitoring & Auditing
- ✅ Azure Monitor logs
- ✅ Prometheus metrics
- ✅ Audit logging enabled for all services
- ✅ Alerting for suspicious activity

## 4. Incident Management
- ✅ Incident response plan (see docs/runbooks/incident-response.md)
- ✅ 24/7 on-call rota
- ✅ NHS trust incident reporting process

## 5. Business Continuity
- ✅ Disaster recovery plan (see docs/disaster-recovery-plan.md)
- ✅ RTO < 4 hours, RPO < 15 minutes
