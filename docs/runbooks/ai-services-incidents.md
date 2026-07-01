# AI Services Incident Runbook
---
## 1. Overview
This runbook covers incidents with SEWA XAI's microservices:
- Triage (port 8000)
- VLM Report Generator (port 8001)
- Uncertainty Engine (port 8002)
- Metacognition (port 8003)
---
## 2. Incident Severity
Same as general incident response:
- CRITICAL: AI down for multiple tenants, critical alerts failing
- URGENT: One AI service down for single tenant
- LOW: Degraded performance but still operational
---
## 3. Triage Service Down
Steps:
1. Check pod status: `kubectl get pods -l app=triage-ai -n sewa-ai`
2. Check logs: `kubectl logs <pod-name> -l app=triage-ai`
3. Check health endpoint: `curl http://<triage-service>:8000/health`
4. Restart pods if needed: `kubectl rollout restart deployment/triage-ai`
5. Verify recovery
---
## 4. VLM Report Generation Failures
Possible causes:
- Model weights missing
- GPU memory issues
- DICOM parsing errors
Steps:
- Check logs for errors
- Verify model storage (Azure Blob/AWS S3) access
- Restart vlm-report deployment if needed
---
## 5. Metacognition False Positives/Negatives
- Review metacognition logs in Application Insights
- Check model drift metrics
- If drift, consider rollback to previous model version
---
## 6. AI Model Rollback
1. Update AKS deployment to use previous model version tag
2. Verify health
3. Update `AIModelVersion` table in DB to mark new version inactive, previous active
---
