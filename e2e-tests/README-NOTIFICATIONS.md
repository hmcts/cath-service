# Notification E2E Tests

This document describes the end-to-end tests for the notification functionality.

## Overview

The notification E2E tests verify that:
- GOV.UK Notify emails are sent to subscribed users
- Notification IDs from GOV.UK Notify are stored in the database
- Email content can be verified via GOV.UK Notify API
- Error cases are handled correctly (no email, invalid email, etc.)

## Test Suites

### 1. Blob Ingestion Notification Tests
**File**: `e2e-tests/tests/api/blob-ingestion-notifications.spec.ts`

Tests notification functionality when publications are created via the API (`POST /v1/publication`).

**Tests:**
- ✅ Sends notification and stores GOV.UK Notify ID
- ✅ Verifies email content via GOV.UK Notify API
- ✅ Sends to multiple subscribers
- ✅ Skips users without email addresses
- ✅ Skips users with invalid email addresses
- ✅ No notifications when no subscriptions exist

### 2. Manual Upload Notification Tests
**File**: `e2e-tests/tests/manual-upload.spec.ts`

Tests notification functionality when publications are created via manual upload UI.

**Tests:**
- ✅ Sends notification after upload confirmation
- ✅ Sends to multiple subscribers

## Running the Tests

### Prerequisites

1. **Azure Key Vault Access**: Tests fetch OAuth credentials from Azure Key Vault
2. **Azure CLI Login**: Run `az login` before running tests
3. **GOV.UK Notify API Key** (optional): For email content verification tests

### Run with Azure Key Vault Credentials

```bash
# Automatically fetches credentials from Azure Key Vault
node run-with-credentials.js blob-ingestion-notifications
node run-with-credentials.js manual-upload
```

### Environment Variables

The following credentials are automatically fetched from Azure Key Vault (`pip-bootstrap-stg-kv`):

| Secret Name | Environment Variable | Purpose |
|-------------|---------------------|---------|
| `app-tenant-id` | `AZURE_TENANT_ID` | Azure AD tenant ID |
| `app-pip-data-management-id` | `AZURE_API_CLIENT_ID` | API client ID |
| `app-pip-data-management-pwd` | `AZURE_API_CLIENT_SECRET` | API client secret |

### Optional: GOV.UK Notify Email Verification

To enable email content verification tests, set:

```bash
export GOVUK_NOTIFY_API_KEY=your-govuk-notify-api-key
```

Without this, the email content verification test will be skipped.

## Implementation Details

### OAuth Token Generation

Tests use the **client credentials flow** to generate OAuth tokens:

1. `api-auth-helpers.ts` provides `getApiAuthToken()` function
2. Tokens are cached and reused until expiry
3. Fetches from `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`

### Database Schema

The `notification_audit_log` table includes:

```sql
notification_id UUID PRIMARY KEY
subscription_id UUID NOT NULL
user_id UUID NOT NULL
publication_id UUID NOT NULL
gov_notify_id TEXT                    -- NEW: Stores GOV.UK Notify notification ID
status TEXT DEFAULT 'Pending'
error_message TEXT
created_at TIMESTAMP DEFAULT NOW()
sent_at TIMESTAMP
```

### Notification Flow

1. **Publication Created** → Trigger notification service
2. **Notification Service** → Calls `sendEmail()` from `govnotify-client`
3. **GOV.UK Notify Returns** → Notification ID (e.g., `"abc-123-def"`)
4. **Store in Database** → `gov_notify_id` field updated
5. **Tests Query** → Can retrieve email content via GOV.UK Notify API

## Troubleshooting

### "Missing Azure AD credentials" Error

**Cause**: OAuth credentials not loaded from Key Vault

**Solution**: Run tests with `node run-with-credentials.js` instead of direct `npx playwright test`

### "Failed to get OAuth token" Error

**Cause**: Invalid Azure AD credentials or insufficient permissions

**Solution**:
1. Verify `az login` is successful
2. Check access to `pip-bootstrap-stg-kv` Key Vault
3. Verify secrets `app-pip-data-management-id` and `app-pip-data-management-pwd` exist

### "401 Unauthorized" on API Tests

**Cause**: OAuth token is invalid or missing required role

**Solution**: The API requires the `api.publisher.user` role. Verify the service principal has this role assigned.

### Notification Tests Timing Out

**Cause**: Notifications are processed asynchronously

**Solution**: Tests include 2-second wait. Increase if needed:
```typescript
await new Promise(resolve => setTimeout(resolve, 3000)); // Increase to 3 seconds
```

## Test Data Cleanup

All tests use proper cleanup in `afterEach` hooks:

1. Delete notification audit logs
2. Delete test subscriptions
3. Delete test users

This ensures no test data pollution between test runs.
