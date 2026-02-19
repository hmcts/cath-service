# Environment Variables Setup Guide

## Overview
This guide explains where to find the values for the environment variables in `.env` required for E2E tests.

## Quick Start (TL;DR)

If you have Azure CLI access to `pip-bootstrap-stg-kv`:

```bash
# Authenticate to Azure
az login

# Verify access
az keyvault secret list --vault-name pip-bootstrap-stg-kv

# Run E2E tests (automatically fetches credentials)
yarn test:e2e
```

If the above works, you're all set! If not, continue reading for manual configuration.

## Azure AD / SSO Configuration

### Required Variables
```bash
AZURE_TENANT_ID=<your-azure-tenant-id>
AZURE_CLIENT_ID=<your-azure-client-id>
AZURE_CLIENT_SECRET=<your-azure-client-secret>
AZURE_API_CLIENT_ID=<your-azure-api-client-id>
AZURE_API_CLIENT_SECRET=<your-azure-api-client-secret>
```

### Where to Find These Values

#### Option 1: Azure Portal (if you have access)
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find your app registration (e.g., "cath-service" or similar)
4. Get the values:
   - **AZURE_TENANT_ID**: Overview page > "Directory (tenant) ID"
   - **AZURE_CLIENT_ID**: Overview page > "Application (client) ID"
   - **AZURE_CLIENT_SECRET**: Certificates & secrets > Client secrets > Create new or copy existing

#### Option 2: Azure Key Vault (recommended for teams)
The E2E tests try to fetch credentials from: `pip-bootstrap-stg-kv`

**Using Azure CLI:**
```bash
# Login to Azure
az login

# Get tenant ID
az account show --query tenantId -o tsv

# Get secrets from Key Vault (requires permissions)
az keyvault secret show --vault-name pip-bootstrap-stg-kv --name app-tenant
az keyvault secret show --vault-name pip-bootstrap-stg-kv --name app-registration-id
az keyvault secret show --vault-name pip-bootstrap-stg-kv --name app-registration-secret
```

#### Option 3: Ask Your Team
If you don't have Azure access, ask:
- Platform/DevOps team for Azure AD app registration details
- Team lead or senior developer who has run E2E tests locally

## CFT IDAM Configuration

### Required Variables
```bash
CFT_IDAM_CLIENT_ID=<your-cft-idam-client-id>
CFT_IDAM_CLIENT_SECRET=<your-cft-idam-client-secret>
CFT_VALID_TEST_ACCOUNT=<valid-test-account@hmcts.net>
CFT_VALID_TEST_ACCOUNT_PASSWORD=<valid-test-password>
CFT_INVALID_TEST_ACCOUNT=<invalid-test-account@hmcts.net>
CFT_INVALID_TEST_ACCOUNT_PASSWORD=<invalid-test-password>
```

### Where to Find These Values

#### From Azure Key Vault
```bash
az keyvault secret show --vault-name pip-bootstrap-stg-kv --name cft-idam-api-secret
az keyvault secret show --vault-name pip-bootstrap-stg-kv --name cft-valid-test-account
az keyvault secret show --vault-name pip-bootstrap-stg-kv --name cft-valid-test-account-password
```

#### From HMCTS IDAM Team
- Contact the HMCTS IDAM support team
- Request test credentials for AAT (pre-production) environment
- Specify you need credentials for automated E2E testing

## Test Credential Requirements

### System Admin (SSO)
- **Already set in .env**: `SSO_TEST_SYSTEM_ADMIN_EMAIL` and password
- These authenticate via Azure AD SSO
- Required for: System admin dashboard, reference data upload, etc.

### CFT IDAM (HMCTS Account)
- **Needs to be set**: `CFT_VALID_TEST_ACCOUNT` credentials
- These authenticate via CFT IDAM service
- Required for: Verified user features, subscriptions, account home

## Quick Start

### 1. Check Azure Key Vault Access
```bash
# Test if you can access the Key Vault
az keyvault secret list --vault-name pip-bootstrap-stg-kv
```

If this works, run the E2E credential fetcher:
```bash
# The E2E tests automatically fetch from Key Vault
yarn test:e2e
```

### 2. If Key Vault Access Fails
You'll need to populate `.env` manually with values from:
- Azure Portal (Azure AD app registration)
- Your team's secure credential store
- Team lead or DevOps engineer

## Verification

After adding credentials:

1. **Restart dev servers** (environment variables are loaded on startup):
   ```bash
   # Stop current servers (Ctrl+C if running in terminal)
   yarn dev
   ```

2. **Run E2E tests**:
   ```bash
   yarn test:e2e
   ```

3. **Expected result**:
   - SSO tests should now pass (System Admin dashboard, admin features)
   - CFT IDAM tests should pass (account home, subscriptions)
   - Currently: 105 passing → should increase to ~248 passing

## Security Notes

⚠️ **IMPORTANT:**
- **Never commit** `.env` file with real credentials to git (it's in `.gitignore`)
- Rotate secrets regularly
- Use Azure Key Vault for production environments
- Test credentials should only work in dev/test environments

## Troubleshooting

### Tests Still Failing After Adding Credentials

**Issue**: "Failed to redirect to Azure AD login page"
**Solutions**:
1. Verify `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` are all set
2. Check Azure app registration has correct redirect URIs: `https://localhost:8080/auth/azure/callback`
3. Restart dev servers after changing `.env`

**Issue**: CFT IDAM authentication fails
**Solutions**:
1. Verify CFT IDAM URL is correct: `https://idam-web-public.aat.platform.hmcts.net`
2. Check test account is active in IDAM system
3. Ensure credentials match the AAT environment (not production)

## Contact

For credential access issues, contact:
- **Azure AD**: Platform/DevOps team
- **CFT IDAM**: HMCTS IDAM support team
- **Key Vault access**: Your team's Azure subscription owner
