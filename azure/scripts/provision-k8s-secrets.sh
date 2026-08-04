#!/usr/bin/env bash
# SEWA XAI — azure/scripts/provision-k8s-secrets.sh
# ─────────────────────────────────────────────────────────────────
# Idempotently provision the Kubernetes secrets that the sewa-ai
# manifests expect, sourcing values from Key Vault (sewa-ai-prod-eu-kv)
# and from CI-provided ACR credentials.
#
# Creates (never blindly overwrites) the four manual secrets:
#   acr-secret                  (docker-registry pull secret)
#   azure-model-file-secret     (AzureFile CSI creds for the `models` share)
#   sewa-secrets                (env-style runtime secrets for AI services)
#   sewa-redis-url              (REDIS_URL consumed by redis/backend)
#
# `sewa-secrets-store` is NOT created here: it is synced by the
# secrets-store-csi-driver from the SecretProviderClass when the
# backend deployment mounts `kv-secrets`.
#
# Prereqs (CI or local):
#   - az logged in with an identity having Key Vault get/list
#   - kubectl context pointed at sewa-ai-prod-eu-aks
#   - env: ACR_USERNAME, ACR_PASSWORD (only for acr-secret)
#
# Usage:
#   ACR_USERNAME=... ACR_PASSWORD=... bash azure/scripts/provision-k8s-secrets.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

NS="sewa-ai"
VAULT="sewa-ai-prod-eu-kv"
STG_NAME="sewaaieuproddicom"
STG_CONTAINER="scans"

kv() { az keyvault secret show --vault-name "$VAULT" --name "$1" --query value -o tsv; }

apply() { kubectl apply -f - >/dev/null; }

echo ">> Creating secrets in namespace '$NS'"

# ── 1. acr-secret (docker-registry) ─────────────────────────────
if [[ -n "${ACR_USERNAME:-}" && -n "${ACR_PASSWORD:-}" ]]; then
  if kubectl get secret acr-secret -n "$NS" >/dev/null 2>&1; then
    echo "   kept    acr-secret (exists)"
  else
    kubectl create secret docker-registry acr-secret \
      --namespace "$NS" \
      --docker-server="sewaaieuprodacr.azurecr.io" \
      --docker-username="$ACR_USERNAME" \
      --docker-password="$ACR_PASSWORD" >/dev/null
    echo "   created acr-secret"
  fi
else
  echo "   skip    acr-secret (ACR_USERNAME/ACR_PASSWORD not set)"
fi

# ── 2. azure-model-file-secret (AzureFile CSI) ──────────────────
if kubectl get secret azure-model-file-secret -n "$NS" >/dev/null 2>&1; then
  echo "   kept    azure-model-file-secret (exists)"
else
  STG_CONN="$(kv sewa-storage-connection-string)"
  STG_KEY="$(echo "$STG_CONN" | tr ';' '\n' | sed -n 's/^AccountKey=//p')"
  cat <<EOF | apply
apiVersion: v1
kind: Secret
metadata:
  name: azure-model-file-secret
  namespace: $NS
type: Opaque
data:
  azurestorageaccountname: $(printf '%s' "$STG_NAME" | base64 -w0)
  azurestorageaccountkey:  $(printf '%s' "$STG_KEY"  | base64 -w0)
EOF
  echo "   created azure-model-file-secret"
fi

# ── 3. sewa-secrets (env-style for AI services) ─────────────────
if kubectl get secret sewa-secrets -n "$NS" >/dev/null 2>&1; then
  echo "   kept    sewa-secrets (exists)"
else
  cat <<EOF | apply
apiVersion: v1
kind: Secret
metadata:
  name: sewa-secrets
  namespace: $NS
type: Opaque
data:
  AZURE_OPENAI_API_KEY:            $(kv sewa-openai-api-key | base64 -w0)
  AZURE_OPENAI_DEPLOYMENT:         $(kv sewa-openai-deployment-name | base64 -w0)
  AZURE_OPENAI_ENDPOINT:           $(kv sewa-openai-endpoint | base64 -w0)
  AZURE_OPENAI_WHISPER_DEPLOYMENT: $(kv sewa-openai-whisper-deployment | base64 -w0)
  AZURE_SPEECH_KEY:                $(kv sewa-speech-key | base64 -w0)
  AZURE_SPEECH_REGION:             $(kv sewa-speech-region | base64 -w0)
  AZURE_STORAGE_ACCOUNT:           $(printf '%s' "$STG_NAME" | base64 -w0)
  AZURE_STORAGE_CONNECTION_STRING: $(kv sewa-storage-connection-string | base64 -w0)
  AZURE_STORAGE_CONTAINER:         $(printf '%s' "$STG_CONTAINER" | base64 -w0)
  DATABASE_URL:                    $(kv sewa-database-url | base64 -w0)
  REDIS_PASSWORD:                  $(kv sewa-redis-password | base64 -w0)
  REDIS_URL:                       $(kv sewa-redis-url | base64 -w0)
EOF
  echo "   created sewa-secrets"
fi

# ── 4. sewa-redis-url ───────────────────────────────────────────
if kubectl get secret sewa-redis-url -n "$NS" >/dev/null 2>&1; then
  echo "   kept    sewa-redis-url (exists)"
else
  cat <<EOF | apply
apiVersion: v1
kind: Secret
metadata:
  name: sewa-redis-url
  namespace: $NS
type: Opaque
data:
  REDIS_URL: $(kv sewa-redis-url | base64 -w0)
EOF
  echo "   created sewa-redis-url"
fi

# ── 5. namecheap-credentials (cert-manager DNS-01 webhook) ──────
# Secret must live in the cert-manager namespace: it is referenced by the
# `namecheap` ClusterIssuer (azure/k8s/namecheap-issuer.yaml) via secretRef.
if kubectl get secret namecheap-credentials -n cert-manager >/dev/null 2>&1; then
  echo "   kept    namecheap-credentials (cert-manager)"
else
  cat <<EOF | apply
apiVersion: v1
kind: Secret
metadata:
  name: namecheap-credentials
  namespace: cert-manager
type: Opaque
data:
  apiUser:  $(kv sewa-namecheap-api-user  | base64 -w0)
  username: $(kv sewa-namecheap-username | base64 -w0)
  apiKey:   $(kv sewa-namecheap-api-key   | base64 -w0)
EOF
  echo "   created namecheap-credentials (cert-manager)"
fi

echo ">> Done. Verify: kubectl get secrets -n $NS"
