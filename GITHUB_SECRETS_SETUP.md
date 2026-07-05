# GitHub Actions Secrets Configuration for SEWA XAI Production Push

## Overview

The `push.ps1` script requires Azure credentials to authenticate with Azure services. These must be configured as **GitHub repository secrets**.

---

## Required Secrets

### 1. **AZURE_CREDENTIALS** (Recommended - Single Secret)

A JSON object containing all necessary Azure authentication information.

**Location in GitHub:**

- Settings → Secrets and variables → Actions → New repository secret

**Secret Name:** `AZURE_CREDENTIALS`

**Secret Value (JSON):**

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "subscriptionId": "YOUR_SUBSCRIPTION_ID",
  "tenantId": "YOUR_TENANT_ID"
}
```

---

## How to Generate Azure Credentials

### Step 1: Create a Service Principal

```powershell
$SUBSCRIPTION_ID = "your-subscription-id"
$SERVICE_PRINCIPAL_NAME = "github-actions-sewa-xai"

az ad sp create-for-rbac `
    --name $SERVICE_PRINCIPAL_NAME `
    --role Owner `
    --scopes /subscriptions/$SUBSCRIPTION_ID
```

**Output will include:**

- `appId` → Use as `clientId`
- `password` → Use as `clientSecret`
- `tenant` → Use as `tenantId`

### Step 2: Get Subscription ID

```powershell
az account show --query id -o tsv
```

### Step 3: Create the JSON Secret

Combine the values into this format:

```json
{
  "clientId": "12345678-1234-1234-1234-123456789012",
  "clientSecret": "your_generated_password_here",
  "subscriptionId": "87654321-4321-4321-4321-210987654321",
  "tenantId": "11111111-2222-3333-4444-555555555555"
}
```

### Step 4: Add to GitHub

1. Navigate to: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `AZURE_CREDENTIALS`
4. Value: Paste the entire JSON object
5. Click **Add secret**

---

## Alternative: Individual Secrets (Optional)

If you prefer separate secrets instead of `AZURE_CREDENTIALS`:

| Secret Name | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | Service principal AppId |
| `AZURE_CLIENT_SECRET` | Service principal password |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |

---

## Required Azure Service Principal Permissions

The service principal needs permissions for:

1. **Azure Container Registry (ACR)**
   - Read/write images: `AcrPush`
   - List credentials: Built-in

2. **Azure Kubernetes Service (AKS)**
   - Get cluster credentials: `Azure Kubernetes Service Cluster Admin Role`
   - Apply manifests via kubectl: Cluster admin

3. **Azure Static Web Apps (SWA)**
   - Deploy frontend: `Static Web App Contributor`

4. **Resource Group**
   - Full access to resources: `Contributor`

**Simplified Role Assignment (Owner):**

```powershell
az role assignment create `
    --assignee "your-service-principal-id" `
    --role "Owner" `
    --scope "/subscriptions/your-subscription-id"
```

---

## GitHub Actions Workflow Integration

To use these secrets in GitHub Actions, reference them with `${{ secrets.AZURE_CREDENTIALS }}`:

```yaml
name: SEWA XAI Production Deployment

on:
  push:
    branches: [main, production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Run Deployment Script
        shell: pwsh
        run: ./push.ps1
```

---

## Troubleshooting

### Error: "Azure CLI authentication failed"

**Cause:** `AZURE_CREDENTIALS` not set or malformed JSON

**Fix:**

1. Verify secret name is exactly `AZURE_CREDENTIALS`
2. Validate JSON format (use [JSON Lint](https://jsonlint.com/))
3. Ensure `az login` works locally before committing to GitHub

### Error: "Service principal does not have sufficient permissions"

**Cause:** Service principal lacks required roles

**Fix:** Assign broader roles or check role assignments:

```powershell
az role assignment list --assignee "your-sp-id" --include-inherited
```

### Error: "Failed to retrieve SWA deployment token"

**Cause:** SWA resource doesn't exist or SP lacks access

**Fix:**

```powershell
az staticwebapp show --name sewa-ai-production-web --resource-group sewa-ai-production-rg
```

### Error: "ACR build failed" midway

**Cause:** Docker build timeout or Dockerfile issues

**Fix:**

1. Check Dockerfile syntax
2. Increase ACR build timeout: `--timeout 3600` (seconds)
3. Try building locally first: `docker build -f backend/Dockerfile backend/`

### Error: "kubectl cannot connect to cluster"

**Cause:** AKS credentials not acquired

**Fix:** Verify cluster exists and SP has access:

```powershell
az aks list --resource-group sewa-ai-production-rg
```

---

## Security Best Practices

✅ **DO:**

- Use a dedicated service principal per environment (dev/staging/prod)
- Rotate `clientSecret` every 90 days
- Use `AZURE_CREDENTIALS` as a single secret (easier to rotate)
- Regularly audit role assignments
- Use GitHub environment secrets for per-environment configs

❌ **DON'T:**

- Commit secrets to Git (use `.gitignore`)
- Use Owner role in production (use least privilege)
- Share `AZURE_CREDENTIALS` in plain text
- Hardcode subscription IDs in scripts
- Reuse credentials across environments

---

## Verifying Secrets Are Accessible

In the GitHub Actions workflow, secrets are available but masked in logs:

```yaml
- name: Test Secret Access
  run: |
    if [ -z "${{ secrets.AZURE_CREDENTIALS }}" ]; then
      echo "ERROR: AZURE_CREDENTIALS secret not set"
      exit 1
    else
      echo "Secret is accessible (contents masked in logs)"
    fi
```

---

## Support References

- [Azure Service Principal Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Azure CLI Authentication](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli)
- [Azure Container Registry Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview)
- [Azure Static Web Apps CLI](https://github.com/Azure/static-web-apps-cli)
