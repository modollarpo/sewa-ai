# AI Microservices Deployment Steps

- [x] 1. Confirm ACR images: sewa-triage, vlm-report, uncertainty, metacognition, federated-learning exist ✅
- [x] 2. Created sewa-ai1/azure/k8s/ai-services-deployment-prod.yaml with prod images (sewa-triage:latest etc.) ✅ (note: image names sewa-triage not sewa-ai-triage)
- [x] 3. kubectl apply -f sewa-ai1/azure/k8s/ai-services-deployment-prod.yaml → metacognition/federated-learning deploying, triage/vlm/uncertainty ImagePullBackOff (image names mismatch? sewa-ai- vs sewa- ; auth 401) ✅ Fixed image names to sewa-ai-* in yaml.
- [x] 4. kubectl rollout status deployment/sewa-triage deployment/sewa-vlm-report etc. -n sewa-ai ✅ Rolled out successfully
- [x] 5. kubectl get pods -n sewa-ai -l app=sewa-triage (check GPU) ✅ Patched CPU tolerations instead of GPU since cluster nodes had insufficient GPUs
- [x] 6. Backend connectivity test (via port-forward) ✅ Completed successfully; triage health returned healthy status and confirmed CPU backend usage
- [x] 7. **Commercialisation Audit GAPS Resolved** ✅ (DLQ Redis Retry, PACS C-ECHO connectivity, Startup Audit Validation, Layer 6 NLP upgraded, and SuperAdmin Dashboard diagnostics wired up).
- [x] 8. **Invitation Email (C5/BG4) Wired** ✅ The invite endpoint now generates a secure token and attempts to send a branded email via Azure Communication Services.
- [x] **Azure Communication Services (ACS) Connection String**: ✅ Provisioned the `sewa-ai-production-acs` resource in Azure, extracted the connection string, and patched it into the live `sewa-secrets` secret in the AKS cluster. The backend deployment has been rolled out and is now actively sending branded staff-invite emails.

