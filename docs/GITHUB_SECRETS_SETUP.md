# GitHub Secrets Configuration

This document describes the GitHub Secrets required for running E2E tests in CI/CD pipelines, and the Azure credentials used for deploys and Terraform.

## Required Secrets

The following secrets must be configured in your GitHub repository settings (`Settings` > `Secrets and variables` > `Actions`):

### API Authentication (Blob Ingestion & Notifications)

| Secret Name | Description | Used By |
|------------|-------------|---------|
| `APP_TENANT_ID` | Azure AD Tenant ID | API authentication |
| `CATH_SERVICE_API_CLIENT_ID` | Azure AD Application Client ID | API authentication |
| `CATH_SERVICE_API_CLIENT_SECRET` | Azure AD Application Client Secret | API authentication |
| `CATH_SERVICE_API_CLIENT_SCOPE` | Azure AD Application Scope | API authentication |

### GOV.UK Notify (Email Notifications)

| Secret Name | Description | Used By |
|------------|-------------|---------|
| `GOVUK_NOTIFY_API_KEY` | GOV.UK Notify API Key | Notification E2E tests |

### SSO Authentication

| Secret Name | Description |
|------------|-------------|
| `SESSION_SECRET` | Session encryption secret |
| `SSO_CLIENT_ID` | SSO Client ID |
| `SSO_CLIENT_SECRET` | SSO Client Secret |
| `SSO_ISSUER_URL` | SSO issuer URL (Azure AD v2.0 endpoint) |
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

### Test User Credentials (Crime IDAM)

| Secret Name | Description |
|------------|-------------|
| `CRIME_IDAM_BASE_URL` | Crime IDAM base URL |
| `CRIME_IDAM_CLIENT_ID` | Crime IDAM Client ID |
| `CRIME_IDAM_CLIENT_SECRET` | Crime IDAM Client Secret |
| `CRIME_IDAM_SCOPE` | Crime IDAM OAuth scope (defaults to "openid profile roles") |
| `CRIME_VALID_TEST_ACCOUNT` | Crime IDAM valid test account email |
| `CRIME_VALID_TEST_ACCOUNT_PASSWORD` | Crime IDAM valid test account password |
| `CRIME_INVALID_TEST_ACCOUNT` | Crime IDAM invalid test account email |
| `CRIME_INVALID_TEST_ACCOUNT_PASSWORD` | Crime IDAM invalid test account password |

## Azure deploy and Terraform credentials

Service principal JSON secrets used to log in to Azure for Helm deploys and Terraform. Each value is a JSON object (`clientId`, `clientSecret`, `tenantId`, `subscriptionId`).

- Only a repository admin adds or rotates these secrets, through the GitHub UI or `gh secret set` reading from stdin.
- Values come from Platform Operations through their secure handover. Never paste a value into Slack, Jira, an issue, a PR or a workflow log.
- This register records names, scopes and ownership only. Never add a client secret here.

| Secret Name | Principal | Used By | Scopes | Credential Expiry | Rotation Owner | Rotation Route |
|------------|-----------|---------|--------|-------------------|----------------|----------------|
| `AZURE_CREDENTIALS_CFT_PROD` | `cath-service-prod` (hmcts/central-app-registration#262) | PROD Helm deploy (#1099) and PROD Terraform (#1096); `one-shot.verify-prod-credentials.yml` | See [PROD scopes](#azure_credentials_cft_prod-scopes) below | TBC (ask PlatOps on DTSPO-35946) | TBC (ask PlatOps on DTSPO-35946) | DTSPO Jira ticket to Platform Operations (original request: DTSPO-35946) |
| `AZURE_CREDENTIALS_CFT_PREVIEW` | TBC (ask PlatOps on DTSPO-35946) | `job.helm-deploy.yml` (preview); every non-prod Terraform leg and `state-store-init` in `stage.infrastructure.yml` / `job.terraform.yml` | AKS cluster admin on `cft-preview-*-aks`; Terraform scopes in `DCD-CNP-DEV` / `DCD-CNP-QA` and the matching `DCD-CFTAPPS-*` subscriptions; listKeys on `mgmtstatestorenonprod` and `mgmtstatestoreqa` | TBC (ask PlatOps on DTSPO-35946) | TBC (ask PlatOps on DTSPO-35946) | DTSPO Jira ticket to Platform Operations |
| `AZURE_CREDENTIALS_CFT_AAT` | TBC (ask PlatOps on DTSPO-35946) | `job.helm-deploy.yml` (aat) | AKS cluster admin on `cft-aat-*-aks` (`DCD-CFTAPPS-STG`); Private DNS Zone Contributor on `aat.platform.hmcts.net` (`core-infra-intsvc-rg`, `DTS-CFTPTL-INTSVC`) | TBC (ask PlatOps on DTSPO-35946) | TBC (ask PlatOps on DTSPO-35946) | DTSPO Jira ticket to Platform Operations |
| `AZURE_CREDENTIALS_CFT_DEMO` | TBC (ask PlatOps on DTSPO-35946) | `job.helm-deploy.yml` (demo) | AKS cluster admin on `cft-demo-*-aks` (`DCD-CFTAPPS-DEMO`); Private DNS Zone Contributor on `demo.platform.hmcts.net` (`core-infra-intsvc-rg`, `DTS-CFTPTL-INTSVC`) | TBC (ask PlatOps on DTSPO-35946) | TBC (ask PlatOps on DTSPO-35946) | DTSPO Jira ticket to Platform Operations |
| `AZURE_CREDENTIALS_CFT_ITHC` | TBC (ask PlatOps on DTSPO-35946) | `job.helm-deploy.yml` (ithc) | AKS cluster admin on `cft-ithc-*-aks` (`DCD-CFTAPPS-ITHC`); Private DNS Zone Contributor on `ithc.platform.hmcts.net` (`core-infra-intsvc-rg`, `DTS-CFTPTL-INTSVC`) | TBC (ask PlatOps on DTSPO-35946) | TBC (ask PlatOps on DTSPO-35946) | DTSPO Jira ticket to Platform Operations |
| `AZURE_CREDENTIALS_CFT_PERFTEST` | TBC (ask PlatOps on DTSPO-35946) | `job.helm-deploy.yml` (perftest) | AKS cluster admin on `cft-perftest-*-aks` (`DCD-CFTAPPS-TEST`); Private DNS Zone Contributor on `perftest.platform.hmcts.net` (`core-infra-intsvc-rg`, `DTS-CFTPTL-INTSVC`) | TBC (ask PlatOps on DTSPO-35946) | TBC (ask PlatOps on DTSPO-35946) | DTSPO Jira ticket to Platform Operations |

The non-prod scopes above are what the workflows need, not a confirmed list of grants. Confirm them against `az role assignment list` when the expiry and owner are filled in.

### `AZURE_CREDENTIALS_CFT_PROD` scopes

One principal is used for both deploy and Terraform. The JSON's `subscriptionId` must be `DCD-CFTAPPS-PROD`, because `aks-set-context` in the deploy uses the subscription that `azure/login` leaves active.

**Deploy**
- Azure Kubernetes Service Cluster Admin Role on `cft-prod-00-aks` and `cft-prod-01-aks` (`DCD-CFTAPPS-PROD`)
- Private DNS Zone Contributor on the PROD private zone (`prod.platform.hmcts.net`; resource group and subscription TBC, ask PlatOps on DTSPO-35946)
- No Key Vault read. Secrets are mounted in the cluster through the `cath` workload identity

**Terraform**
- Contributor on the cath resource groups in `DCD-CNP-PROD`, plus rights to create them
- Network read and `subnets/join` on the PROD vnets in `DCD-CFTAPPS-PROD`
- listKeys on the state store `mgmtstatestoreprod` (`mgmt-state-store-prod`, `DCD-CNP-PROD`)
- Key Vault management for `cath-prod`, `cath-bootstrap-prod` and `cath-tp-prod`
- Graph read on its own service principal (`az ad sp show`)

Terraform makes this principal the Postgres Entra admin and gives it Key Vault access policies, so it is the data-plane admin of PROD. Treat a leak as a PROD incident and ask Platform Operations to rotate immediately.

### Rotating a credential

1. Raise a DTSPO Jira ticket with Platform Operations, naming the secret and principal from the table above.
2. Platform Operations issue the new client secret through their secure handover.
3. A repository admin updates the GitHub secret.
4. Re-run a workflow that uses the secret and check it logs in.
5. Update the expiry date in the table above, and set a reminder about 30 days before the new expiry.

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
CATH_SERVICE_API_CLIENT_ID: ${{ secrets.CATH_SERVICE_API_CLIENT_ID }}
CATH_SERVICE_API_CLIENT_SECRET: ${{ secrets.CATH_SERVICE_API_CLIENT_SECRET }}
CATH_SERVICE_API_CLIENT_SCOPE: ${{ secrets.CATH_SERVICE_API_CLIENT_SCOPE }}

# GOV.UK Notify
GOVUK_NOTIFY_API_KEY: ${{ secrets.GOVUK_NOTIFY_API_KEY }}
```

## Notification E2E Tests

The notification E2E tests (`blob-ingestion-notifications.spec.ts`) will:
- **Skip** the "verify GOV.UK Notify email content" test if `GOVUK_NOTIFY_API_KEY` is not set
- **Run** all other notification tests (email validation, skipped notifications, etc.)

To enable the full test suite in CI, ensure the `GOVUK_NOTIFY_API_KEY` secret is configured.

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
