# SEWA AI Incident Response Runbook

## Severity Levels
- **SEV 1**: Total platform outage, critical AI failures
- **SEV 2**: Partial outage, degraded performance
- **SEV 3**: Minor issues, bugs, feature requests

## SEV 1 Response Steps
1. **Acknowledge**: Page on-call engineer within 5 minutes
2. **Assess**: Check Grafana dashboards, Prometheus alerts, Application Insights
3. **Mitigate**: Roll back last deployment, scale resources, fail over to secondary region
4. **Communicate**: Update status page, notify affected tenants
5. **Resolve**: Fix root cause, verify recovery
6. **Retrospective**: Hold post-incident review within 48 hours

## Useful Links
- Grafana: https://monitoring.sewaxai.health
- Azure Portal: https://portal.azure.com
- Status Page: https://status.sewaxai.health
