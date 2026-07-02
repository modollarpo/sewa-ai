import os

services = [
    ("triage", 8000, "6Gi", "2Gi", "1000m"),
    ("vlm-report", 8001, "16Gi", "8Gi", "1000m"),
    ("pathology", 8002, "8Gi", "2Gi", "1000m"),
    ("uncertainty", 8002, "8Gi", "2Gi", "1000m"),  # Dockerfile hardcodes 8002
    ("federated", 8004, "4Gi", "1Gi", "500m"),
    ("continuous", 8005, "4Gi", "1Gi", "500m"),
]

yaml = """# SEWA XAI — AI Services Deployment
apiVersion: v1
kind: ServiceAccount
metadata:
  annotations:
    azure.workload.identity/client-id: "${AI_SERVICES_WORKLOAD_IDENTITY_CLIENT_ID}"
  name: sewa-ai-sa
  namespace: sewa-ai
"""

for svc, port, lim, req, cpu in services:
    yaml += f"""---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sewa-{svc}
  namespace: sewa-ai
  labels:
    app: sewa-{svc}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sewa-{svc}
  template:
    metadata:
      labels:
        app: sewa-{svc}
    spec:
      serviceAccountName: sewa-ai-sa
      imagePullSecrets:
      - name: acr-secret
      containers:
      - name: {svc}
        image: "{{{{CONTAINER_REGISTRY}}}}/sewa-{svc}:{{{{IMAGE_TAG}}}}"
        imagePullPolicy: Always
        ports:
        - containerPort: {port}
        resources:
          limits:
            memory: "{lim}"
          requests:
            memory: "{req}"
            cpu: "{cpu}"
        envFrom:
        - configMapRef:
            name: sewa-config
        - secretRef:
            name: sewa-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: {port}
          initialDelaySeconds: 60
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: sewa-{svc}
  namespace: sewa-ai
spec:
  selector:
    app: sewa-{svc}
  ports:
  - port: {port}
    targetPort: {port}
"""

with open('azure/k8s/ai-services-deployment-prod.yaml', 'w') as f:
    f.write(yaml)

# Substitute and apply
sub_yaml = yaml.replace('{{CONTAINER_REGISTRY}}', 'sewaaiproductionacr.azurecr.io').replace('{{IMAGE_TAG}}', 'production-latest')
with open('temp.yaml', 'w') as f:
    f.write(sub_yaml)

os.system('kubectl apply -f temp.yaml')
