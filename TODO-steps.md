# AI Microservices Deployment Steps

- [x] 1. Confirm ACR images: sewa-triage, vlm-report, uncertainty, metacognition, federated-learning exist ✅
- [x] 2. Created sewa-ai1/azure/k8s/ai-services-deployment-prod.yaml with prod images (sewa-triage:latest etc.) ✅ (note: image names sewa-triage not sewa-ai-triage)
- [x] 3. kubectl apply -f sewa-ai1/azure/k8s/ai-services-deployment-prod.yaml → metacognition/federated-learning deploying, triage/vlm/uncertainty ImagePullBackOff (image names mismatch? sewa-ai- vs sewa- ; auth 401) 🔄
- [ ] 4. kubectl rollout status deployment/sewa-triage deployment/sewa-vlm-report etc. -n sewa-ai
- [ ] 5. kubectl get pods -n sewa-ai -l app=sewa-triage (check GPU)
- [ ] 6. Backend connectivity test (via port-forward)

