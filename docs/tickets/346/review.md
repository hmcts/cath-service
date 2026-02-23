# Code Review: Issue #346 - Complete Azure B2C Media User Creation Journey

## Summary

This PR integrates Azure AD B2C user creation into the media application approval workflow. When a CTSC admin approves a media application, the system now checks whether the user exists in Azure AD, creates them if not, creates a local user record, and sends the appropriate email (new account vs existing user). The overall structure is sound and follows the established patterns, but there are two critical issues and several high-priority items that need attention before deployment.

## CRITICAL Issues

### 1. OData Injection in `checkUserExists`

**File:** `/workspaces/cath-service/libs/auth/src/graph-api/client.ts`, line 115

```typescript
const result = await client.api("/users").filter(`mail eq '${email}'`).select("id").get();
```

The email address is interpolated directly into an OData filter expression without sanitisation. A malicious or malformed email containing single quotes (e.g., `O'Brien@example.com` or a crafted value like `' or 1 eq 1 or mail eq '`) could break the query or return unintended results from the Graph API. This is the OData equivalent of SQL injection.

**Impact:** An attacker or even a legitimate user with an apostrophe in their email could cause the user existence check to return incorrect results, potentially skipping Azure AD user creation or erroneously treating a new user as existing.

**Solution:** Escape single quotes in the email by replacing `'` with `''` (OData escaping convention):

```typescript
const sanitisedEmail = email.replace(/'/g, "''");
const result = await client.api("/users").filter(`mail eq '${sanitisedEmail}'`).select("id").get();
```

### 2. Existing User Email Missing Required Personalisation Fields

**File:** `/workspaces/cath-service/libs/notification/src/govuk-notify-service.ts`, lines 102-119

The ticket (issue #346) specifies the existing user email template (cc1b744d-6aa1-4410-9f53-216f8bd3298f) requires three personalisation fields:
- `forgot_password_link` (or equivalent)
- `subscription_page_link`
- `start_page_link`

The implementation only sends two fields: `"Full name"` and `"sign in page link"`. The `subscription_page_link` and `start_page_link` fields are completely missing from both the `MediaAccountEmailData` interface and the `sendMediaExistingUserEmail` function. The plan at `/workspaces/cath-service/docs/tickets/346/plan.md` lines 133-138 and 252-255 explicitly calls for these fields, and the `.env.example` in the plan included `MEDIA_SUBSCRIPTION_PAGE_LINK` and `MEDIA_START_PAGE_LINK` env vars.

**Impact:** The GOV.UK Notify API will reject the email send with a `400 Bad Request` error for missing personalisation, or the template will render with blank/missing links. Either way, existing users will not receive a functional confirmation email.

**Solution:** Update the `MediaAccountEmailData` interface to include separate fields for the existing user email, and pass the additional env vars from the controller:

```typescript
// In govuk-notify-service.ts - new interface for existing user emails
interface MediaExistingUserEmailData {
  email: string;
  fullName: string;
  signInPageLink: string;
  subscriptionPageLink: string;
  startPageLink: string;
}

// In the sendMediaExistingUserEmail personalisation:
personalisation: {
  "Full name": data.fullName,
  "sign in page link": data.signInPageLink,
  "subscription_page_link": data.subscriptionPageLink,
  "start_page_link": data.startPageLink
}
```

And in the approve controller, pass the additional env vars:

```typescript
await sendMediaExistingUserEmail({
  email: application.email,
  fullName: application.name,
  signInPageLink: process.env.MEDIA_FORGOT_PASSWORD_LINK || "",
  subscriptionPageLink: process.env.MEDIA_SUBSCRIPTION_PAGE_LINK || "",
  startPageLink: process.env.MEDIA_START_PAGE_LINK || ""
});
```

The `MEDIA_SUBSCRIPTION_PAGE_LINK` and `MEDIA_START_PAGE_LINK` env vars must also be added to `apps/web/.env.example` and the Helm values files.

## HIGH PRIORITY Issues

### 1. Missing Environment Variables in Helm Configuration

**Files:** `/workspaces/cath-service/apps/web/helm/values.yaml` and `values.dev.yaml`

The `MEDIA_FORGOT_PASSWORD_LINK`, `MEDIA_SUBSCRIPTION_PAGE_LINK`, and `MEDIA_START_PAGE_LINK` environment variables are not configured in the Helm values. The Azure B2C secrets are correctly mapped from Key Vault, but these link variables (which are not secrets -- they are URLs) need to be set in the `environment` section of the Helm config. Without them, the email personalisation will contain empty strings.

**Impact:** All confirmation emails sent to media users will contain blank links, rendering the forgot-password, subscription, and start-page links non-functional.

**Solution:** Add the link variables to the `environment` section in both `values.yaml` and `values.dev.yaml`.

### 2. `splitName` is Exported Only for Testing

**File:** `/workspaces/cath-service/libs/admin-pages/src/media-application/service.ts`, line 72

The `splitName` function is exported and directly tested in `service.test.ts`, but it is only used internally within the same file (called by `approveApplication` on line 22 and `createLocalMediaUser` on line 87). The CLAUDE.md guidelines state: "Don't export functions in order to test them - Only export functions that are intended to be used outside the module."

**Impact:** Code style violation. Minor, but sets a precedent against the project conventions.

**Solution:** Remove the `export` keyword from `splitName` and remove the direct `splitName` tests. The function is already indirectly tested through the `approveApplication` tests that verify the correct `givenName`/`surname` values are passed to `createMediaUser`.

### 3. Inconsistent Personalisation Field Names Across Email Templates

**File:** `/workspaces/cath-service/libs/notification/src/govuk-notify-service.ts`

The personalisation field names are inconsistent across the four email functions and also deviate from the plan:

| Function | Field names used |
|----------|-----------------|
| `sendMediaApprovalEmail` | `"full name"`, `"Employer"` |
| `sendMediaRejectionEmail` | `"full-name"`, `"reject-reasons"`, `"link-to-service"` |
| `sendMediaNewAccountEmail` | `full_name`, `"forgot password process link"` |
| `sendMediaExistingUserEmail` | `"Full name"`, `"sign in page link"` |

Three different casings for "full name" (`"full name"`, `"full-name"`, `full_name`, `"Full name"`). While these must match the GOV.UK Notify template configuration exactly, the inconsistency suggests that at least some of these may be wrong. The plan specified underscore-delimited names (`full_name`, `forgot_password_link`, `subscription_page_link`, `start_page_link`).

**Impact:** If the field names do not exactly match what the GOV.UK Notify templates expect, the emails will fail to send or will render with missing data.

**Solution:** Verify each personalisation field name against the actual GOV.UK Notify template configuration. Document the expected field names in a comment above each function.

### 4. Error Response in POST Handler May Throw Unhandled Error

**File:** `/workspaces/cath-service/libs/admin-pages/src/pages/media-applications/[id]/approve.ts`, lines 105-124

In the outer `catch` block, when approval fails, the handler calls `getApplicationById(id).catch(() => null)` to re-fetch the application for re-rendering. If `getApplicationById` succeeds but then `res.render` fails (e.g., template error), there is no outer error handler. More importantly, if the `id` is undefined or malformed at this point, the second database call could mask the original error.

This is a minor resilience concern, but worth noting.

### 5. GOV.UK Notify API Key is Not Present in Helm Dev Values

**File:** `/workspaces/cath-service/apps/web/helm/values.dev.yaml`

The `gov-uk-notify-test-api-key` Key Vault secret mapping was added, which is good. However, the Notify template ID env vars (`GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT`, `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER`) are not present in either Helm values file. They need to be configured in the `environment` section alongside the other template IDs.

### 6. Removal of `lastSignedInDate` from `createUser`

**File:** `/workspaces/cath-service/libs/account/src/repository/query.ts`, lines 4-14

The `lastSignedInDate: new Date()` was removed from the `createUser` function. This is a shared function used beyond just media user creation. If other callers relied on `lastSignedInDate` being set on creation, this could cause regressions.

**Impact:** Any code that expects `lastSignedInDate` to be populated after `createUser` will now see `null`.

**Solution:** Verify no other callers depend on this behaviour. If the field has a database default, this may be fine. Otherwise, consider making it an optional parameter rather than removing it entirely.

## SUGGESTIONS

- **Token caching:** The plan says no caching is required, but each approval triggers a fresh token request. If approvals are batched, consider adding a short-lived cache (e.g., 5 minutes) to reduce token endpoint calls.
- **`splitName` edge cases:** When a user has a single name, both `givenName` and `surname` are set to the same value. Azure AD may display this oddly (e.g., "Madonna Madonna"). Consider setting `surname` to an empty string or a placeholder.
- **Duplicate `Client.init` calls:** The `Client.init` pattern with `authProvider` callback is repeated in `checkUserExists`, `createMediaUser`, and `fetchUserProfile`. Extract a helper function like `createGraphClient(accessToken)` to reduce duplication.
- **`console.error` usage:** The codebase logs errors via `console.error` in multiple places. Consider using a structured logger (if one exists in the project) for consistency and to enable better filtering in Application Insights.

## Positive Feedback

- **Clean separation of concerns:** Azure AD operations live in `libs/auth`, notification logic in `libs/notification`, and the service layer in `libs/admin-pages`. This follows the project's module structure well.
- **Error handling strategy is correct:** Azure AD failures block approval (keeping PENDING status), while email failures are logged but do not block. This matches the ticket requirements exactly.
- **Good test coverage in service.test.ts:** The service layer tests cover new user creation, existing user detection, Azure AD failure scenarios, file deletion edge cases, and local user creation. The AAA pattern is followed throughout.
- **Proof of ID file not deleted on failure:** The implementation correctly orders operations so that file deletion only happens after successful Azure AD creation and status update.
- **Path traversal protection in `deleteProofOfIdFile`:** The `..` check and `path.normalize` usage is a sensible security measure.
- **Welsh language support:** Error messages for the new Azure AD failure scenario are provided in both English and Welsh.

## Test Coverage Assessment

- **Unit tests:** Good. The service layer has 11 tests covering all key scenarios. The Graph API client has 14 tests. The notification service has 12 tests for the new functions. The approve controller has 8 tests covering the updated flow.
- **Missing test:** No test for the OData injection scenario in `checkUserExists`. No test verifying the existing user email includes `subscription_page_link` and `start_page_link` (because the implementation is missing these fields).
- **E2E tests:** Not required per the plan (Azure AD and email are mocked in test environments). This is acceptable.
- **Accessibility tests:** Not applicable -- no UI changes.

## Acceptance Criteria Verification

- [x] **User created in Azure AD once admin approves:** Implemented in `approveApplication` via `checkUserExists` and `createMediaUser`. Local user record also created with provenance `B2C_IDAM` and role `VERIFIED`.
- [x] **New user receives Confirmation & Setup email:** `sendMediaNewAccountEmail` called with template ID from env var, personalisation includes `full_name` and `forgot password process link`.
- [ ] **Existing user receives Existing User Confirmation Email:** PARTIALLY MET. The email function exists and is called, but it is missing the `subscription_page_link` and `start_page_link` personalisation fields required by the ticket. The env vars for these links are also missing from `.env.example` and Helm config.
- [x] **Application remains PENDING if Azure AD fails:** Tested and confirmed -- errors thrown before `updateApplicationStatus` is called.
- [x] **Proof of ID file NOT deleted if Azure AD fails:** Tested and confirmed -- file deletion occurs after status update.
- [x] **Email failure does not block approval:** Wrapped in inner try-catch, errors logged only.

## Next Steps

- [ ] Fix CRITICAL #1: Sanitise email in OData filter to prevent injection
- [ ] Fix CRITICAL #2: Add missing `subscription_page_link` and `start_page_link` to existing user email
- [ ] Add `MEDIA_SUBSCRIPTION_PAGE_LINK` and `MEDIA_START_PAGE_LINK` to `.env.example` and Helm values
- [ ] Add `MEDIA_FORGOT_PASSWORD_LINK` and Notify template IDs to Helm `environment` sections
- [ ] Verify personalisation field names against actual GOV.UK Notify templates
- [ ] Verify `lastSignedInDate` removal from `createUser` does not cause regressions
- [ ] Un-export `splitName` (or justify the export)
- [ ] Re-run `yarn test` after fixes

## Overall Assessment

**NEEDS CHANGES**

The implementation is well-structured and covers most of the acceptance criteria, but the two critical issues (OData injection and missing email personalisation fields) must be resolved before deployment. The OData injection is a security vulnerability, and the missing personalisation fields mean the existing user email flow will fail at runtime. Once these are addressed along with the Helm configuration gaps, the PR should be ready for a second review.
