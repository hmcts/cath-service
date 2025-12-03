# GitHub Secrets Configuration

This document describes the GitHub Secrets required for running E2E tests in CI/CD pipelines.

## Required Secrets

The following secrets must be configured in your GitHub repository settings (`Settings` > `Secrets and variables` > `Actions`):

### API Authentication (Blob Ingestion & Notifications)

| Secret Name | Description | Used By |
|------------|-------------|---------|
| `APP_TENANT_ID` | Azure AD Tenant ID | API authentication |
| `APP_PIP_DATA_MANAGEMENT_ID` | Azure AD Application Client ID | API authentication |
| `APP_PIP_DATA_MANAGEMENT_PWD` | Azure AD Application Client Secret | API authentication |
| `APP_PIP_DATA_MANAGEMENT_SCOPE` | Azure AD Application Scope | API authentication |

### GOV.UK Notify (Email Notifications)

| Secret Name | Description | Used By |
|------------|-------------|---------|
| `GOVUK_NOTIFY_API_KEY` | GOV.UK Notify API Key | Notification E2E tests |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` | GOV.UK Notify Template ID for subscription notifications | Notification E2E tests |

### SSO Authentication

| Secret Name | Description |
|------------|-------------|
| `SESSION_SECRET` | Session encryption secret |
| `SSO_CLIENT_ID` | SSO Client ID |
| `SSO_CLIENT_SECRET` | SSO Client Secret |
| `SSO_CONFIG_ENDPOINT` | SSO configuration endpoint |
| `SSO_SG_SYSTEM_ADMIN` | SSO System Admin Group ID |
| `SSO_SG_ADMIN_CTSC` | SSO CTSC Admin Group ID |
| `SSO_SG_ADMIN_LOCAL` | SSO Local Admin Group ID |

### Test User Credentials (SSO)

| Secret Name | Description |
|------------|-------------|
| `SSO_TEST_SYSTEM_ADMIN_ACCOUNT_USER` | System Admin test user email |
| `SSO_TEST_SYSTEM_ADMIN_ACCOUNT_PWD` | System Admin test user password |
| `SSO_TEST_ADMIN_LOCAL_ACCOUNT_USER` | Local Admin test user email |
| `SSO_TEST_ADMIN_LOCAL_ACCOUNT_PWD` | Local Admin test user password |
| `SSO_TEST_ADMIN_ACCOUNT_CTSC_USER` | CTSC Admin test user email |
| `SSO_TEST_ADMIN_ACCOUNT_CTSC_PWD` | CTSC Admin test user password |
| `SSO_TEST_NO_ROLES_ACCOUNT_USER` | No roles test user email |
| `SSO_TEST_NO_ROLES_ACCOUNT_PWD` | No roles test user password |

### Test User Credentials (CFT IDAM)

| Secret Name | Description |
|------------|-------------|
| `CFT_IDAM_CLIENT_SECRET` | CFT IDAM Client Secret |
| `CFT_VALID_TEST_ACCOUNT` | CFT IDAM valid test account email |
| `CFT_VALID_TEST_ACCOUNT_PASSWORD` | CFT IDAM valid test account password |
| `CFT_INVALID_TEST_ACCOUNT` | CFT IDAM invalid test account email |
| `CFT_INVALID_TEST_ACCOUNT_PASSWORD` | CFT IDAM invalid test account password |

## Workflow Configuration

The E2E tests workflow (`.github/workflows/e2e.yml`) automatically uses these secrets when running tests on:
- Pull requests to `master` or `main` branches
- Direct pushes to `master` or `main` branches

## Local Development

For local E2E test execution, the `run-with-credentials.js` script loads secrets from Azure Key Vault using Azure CLI authentication:

```bash
# Authenticate with Azure
az login

# Run E2E tests with Azure Key Vault credentials
cd e2e-tests
node run-with-credentials.js blob-ingestion-notifications
```

The script automatically detects if running in CI (via `CI=true` environment variable) and uses GitHub Secrets instead of Azure Key Vault.

## Environment Variables Mapping

The secrets are mapped to the following environment variables in the GitHub Actions workflow:

```yaml
# API Authentication
AZURE_TENANT_ID: ${{ secrets.APP_TENANT_ID }}
AZURE_API_CLIENT_ID: ${{ secrets.APP_PIP_DATA_MANAGEMENT_ID }}
AZURE_API_CLIENT_SECRET: ${{ secrets.APP_PIP_DATA_MANAGEMENT_PWD }}
APP_PIP_DATA_MANAGEMENT_SCOPE: ${{ secrets.APP_PIP_DATA_MANAGEMENT_SCOPE }}

# GOV.UK Notify
GOVUK_NOTIFY_API_KEY: ${{ secrets.GOVUK_NOTIFY_API_KEY }}
GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION: ${{ secrets.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION }}
```

## Notification E2E Tests

The notification E2E tests (`blob-ingestion-notifications.spec.ts`) will:
- **Skip** the "verify GOV.UK Notify email content" test if `GOVUK_NOTIFY_API_KEY` is not set
- **Run** all other notification tests (email validation, skipped notifications, etc.)

To enable the full test suite in CI, ensure both `GOVUK_NOTIFY_API_KEY` and `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` secrets are configured.

## Troubleshooting

### Tests are skipped in CI
- Verify all required secrets are configured in GitHub repository settings
- Check the GitHub Actions workflow logs for missing environment variables

### Local tests fail to authenticate
- Ensure you're logged in to Azure CLI: `az login`
- Verify you have access to the `pip-bootstrap-stg-kv` Key Vault
- Check your Azure subscription is set correctly: `az account show`

### API authentication errors
- Verify the Azure AD application credentials are correct
- Ensure the application has the required permissions/scopes
- Check the tenant ID matches your Azure AD tenant
