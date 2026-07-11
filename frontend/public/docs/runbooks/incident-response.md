# SEWA XAI Incident Response Runbook

## Severity Levels
- **SEV 1**: Total platform outage, critical AI failures, patient safety risk
- **SEV 2**: Partial outage, degraded performance, major feature failure
- **SEV 3**: Minor issues, bugs, feature requests, non-critical errors
- **SEV 4**: Documentation, questions, low-impact tweaks

## SEV 1: Total Platform Outage / Critical AI Failures
### Response Steps
1. **Acknowledge**: Page on-call engineer within 5 minutes
2. **Assess**: Check Grafana dashboards, Prometheus alerts, Application Insights, AKS pod status
3. **Mitigate**:
   - Roll back last deployment
   - Scale resources
   - Fail over to secondary region
   - Restart critical services
4. **Communicate**:
   - Update status page immediately
   - Notify affected tenants via email/SMS
   - Post internal Slack update every 30 minutes
5. **Resolve**: Fix root cause, verify recovery end-to-end
6. **Retrospective**: Hold post-incident review within 48 hours

### Useful Commands
```bash
kubectl get pods -n sewa-ai
kubectl rollout undo deployment/sewa-backend -n sewa-ai
az aks get-credentials --resource-group sewa-ai-prod-rg --name sewa-ai-prod-aks
```

---

## SEV 2: Partial Outage / Degraded Performance / Major Feature Failure
### Incident Subtypes
1. **Database Issues**: High CPU, slow queries, connection timeouts
2. **AI Service Failures**: Triage/VLM/Uncertainty/Metacognition errors
3. **Network Issues**: Ingress failures, latency spikes
4. **Storage Issues**: Blob storage errors, upload failures

### Response Steps
1. **Acknowledge**: Respond within 15 minutes
2. **Assess**:
   - Database: Check Azure PostgreSQL metrics, slow query logs
   - AI: Check service-specific health endpoints and logs
   - Network: Check Azure Front Door, AKS ingress, network policies
3. **Mitigate**:
   - Scale database read replicas
   - Restart affected AI service deployments
   - Roll back problematic AI model versions
   - Enable caching or reduce load
4. **Communicate**: Update status page and internal channels hourly
5. **Resolve**: Fix root cause, verify performance
6. **Retrospective**: Hold post-incident review within 72 hours

---

## SEV 3: Minor Issues / Bugs / Feature Requests
### Incident Subtypes
1. **UI/UX Bugs**: Frontend rendering issues, broken links
2. **API Errors**: 4xx/5xx responses for non-critical endpoints
3. **Feature Requests**: Customer requests for new capabilities
4. **Documentation Gaps**: Missing or outdated docs

### Response Steps
1. **Acknowledge**: Respond within 2 business hours
2. **Triage**: Assign priority and owner
3. **Investigate**: Reproduce the issue if possible
4. **Fix/Implement**: Code fix or documentation update
5. **Communicate**: Update ticket, notify requester
6. **Deploy**: Release fix in next scheduled deployment

---

## SEV 4: Documentation / Questions / Low-Impact Tweaks
### Response Steps
1. **Acknowledge**: Respond within 3 business days
2. **Address**: Update docs, answer questions, make small tweaks
3. **Close**: Mark issue as complete

---

## Useful Links & Tools
- **Grafana**: https://monitoring.sewaxai.health
- **Azure Portal**: https://portal.azure.com
- **Status Page**: https://status.sewaxai.health
- **Support Ticketing**: https://support.sewaxai.health (Zendesk)
- **Slack Alerts**: #sewa-ai-incidents
- **On-Call Rotation**: https://oncall.sewaxai.health
- **Prisma DB Access**: https://sewa-prisma-admin.azurewebsites.net
- **Key Vault Secrets**: Azure Portal → Key Vault

---

## Escalation Path
- SEV 1/2: Page on-call engineer immediately → escalate to Director of Engineering if no response in 10 mins
- SEV 3/4: Assign to engineering team → escalate to team lead if not addressed in 2 business days
