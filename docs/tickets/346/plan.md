# Technical Plan: Complete Azure B2C Media User Creation Journey

## 1. Technical Approach

This ticket integrates Azure AD B2C user creation into the existing media application approval workflow. The implementation follows the established pattern in `libs/admin-pages/src/pages/media-applications/[id]/approve.ts` where email notification already occurs post-approval.

**Key Strategy:**
1. Extend the `approveApplication` service function to check user existence and create users in Azure AD B2C before updating the application status
2. Add Graph API client functions using **client credentials flow** to handle Azure AD B2C user operations
3. Add GOV.UK Notify service functions for the two new email templates (new account vs existing user)
4. Modify the approval POST handler to determine user existence and send appropriate email
5. Create a local `user` record with provenance `AZURE_B2C` and role `VERIFIED`
6. Maintain existing error handling pattern (block approval on Azure AD failure, log email failures, no retry)

**Architecture Decisions:**
- **Local user record creation**: Create a record in the local `user` table with `userProvenance: "AZURE_B2C"` and role `VERIFIED`
- **Client credentials flow**: Use OAuth2 client credentials grant for Graph API authentication (no caching required)
- **No update of existing users**: If a user already exists in Azure AD, do NOT update their properties. Detect existence and send the existing user email instead
- **Graph API client separation**: Keep Azure AD B2C user creation logic in `libs/auth/src/graph-api/` alongside existing Graph API functions
- **Email template IDs**: Use environment variables for template IDs (following existing pattern)
- **Azure AD user properties**: Set only `displayName`, `givenName`, `surname` (employer is NOT stored in Azure AD)
- **Password policy**: Force password change on first login (`forceChangePasswordNextSignIn: true`)
- **No Azure AD group**: Users are not added to any specific Azure AD B2C group
- **Environment-dependent links**: Forgot password, subscription page, and start page links are full URLs that differ per environment (stored in env vars)

## 2. Implementation Details

### File Structure

```
libs/
├── auth/src/graph-api/
│   ├── client.ts                          # Add: getGraphApiAccessToken, createMediaUser, checkUserExists
│   └── client.test.ts                     # Add: tests for new functions
│
├── notification/src/
│   ├── govuk-notify-service.ts            # Add: sendMediaNewAccountEmail, sendMediaExistingUserEmail
│   ├── govuk-notify-service.test.ts       # Add: tests for new email functions
│   └── index.ts                           # Export new email functions
│
└── admin-pages/src/
    ├── media-application/
    │   ├── service.ts                     # Modify: approveApplication to call Azure AD creation + local user creation
    │   └── service.test.ts                # Add: tests for Azure AD integration and local user creation
    │
    └── pages/media-applications/[id]/
        ├── approve.ts                     # Modify: POST handler to check user existence and send appropriate email
        ├── approve.test.ts                # Add: tests for updated approval logic (if doesn't exist)
        ├── approve-en.ts                  # Add: error message for Azure AD failure
        └── approve-cy.ts                  # Add: Welsh error message for Azure AD failure
```

### Graph API Client Functions

**Location:** `libs/auth/src/graph-api/client.ts`

**Authentication:** Use client credentials flow to obtain access token:
```typescript
/**
 * Get access token using client credentials flow
 * Uses AZURE_B2C_TENANT_ID, AZURE_B2C_CLIENT_ID, AZURE_B2C_CLIENT_SECRET env vars
 * No caching required - request fresh token per approval operation
 */
export async function getGraphApiAccessToken(): Promise<string>
```

**User operations:**
```typescript
/**
 * Check if a user exists in Azure AD B2C by email
 * @param accessToken - Access token from client credentials flow
 * @param email - User email address
 * @returns true if user exists, false otherwise
 */
export async function checkUserExists(
  accessToken: string,
  email: string
): Promise<boolean>

/**
 * Create a new media user in Azure AD B2C
 * Does NOT update existing users - call checkUserExists first
 * @param accessToken - Access token from client credentials flow
 * @param userData - User details from media application
 * @returns Azure AD user ID
 */
export async function createMediaUser(
  accessToken: string,
  userData: {
    email: string;
    displayName: string;
    givenName: string;
    surname: string;
  }
): Promise<{ azureAdUserId: string }>
```

**Implementation Notes:**
- Client credentials flow: `POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` with `grant_type=client_credentials`
- Use Graph API endpoint: `GET /users?$filter=mail eq '{email}'` to check existence
- Use Graph API endpoint: `POST /users` to create new user
- **Do NOT update existing users** - if user exists, return early and proceed with existing user email flow
- New users should have:
  - `accountEnabled: true`
  - `displayName`: from application (full name)
  - `givenName`: from application
  - `surname`: from application
  - `mail: email`
  - `passwordProfile: { forceChangePasswordNextSignIn: true, password: auto-generated }`
- **Employer is NOT stored** in Azure AD B2C
- **No Azure AD group assignment** required
- Error handling: Throw descriptive errors if Graph API calls fail, no retry mechanism

### GOV.UK Notify Service Functions

**Location:** `libs/notification/src/govuk-notify-service.ts`

```typescript
/**
 * Send new account confirmation email to media user
 * Template ID: 689c0183-0461-423e-a542-de513a93a5b7
 */
export async function sendMediaNewAccountEmail(data: {
  email: string;
  full_name: string;
  forgot_password_link: string;
}): Promise<void>

/**
 * Send existing user confirmation email to media user
 * Template ID: cc1b744d-6aa1-4410-9f53-216f8bd3298f
 */
export async function sendMediaExistingUserEmail(data: {
  email: string;
  forgot_password_link: string;
  subscription_page_link: string;
  start_page_link: string;
}): Promise<void>
```

**Implementation Notes:**
- Follow existing pattern from `sendMediaApprovalEmail` and `sendMediaRejectionEmail`
- Read template IDs from environment variables
- **Personalisation field names use underscores** (e.g., `full_name`, `forgot_password_link`, `subscription_page_link`, `start_page_link`) to match GOV.UK Notify template configuration
- Use descriptive reference strings (e.g., `media-new-account-${Date.now()}`)

### Service Layer Changes

**Location:** `libs/admin-pages/src/media-application/service.ts`

Modify `approveApplication` function:

```typescript
export async function approveApplication(
  id: string,
  accessToken: string  // NEW: Access token from client credentials flow
): Promise<{ isNewUser: boolean }> {
  const application = await getApplicationById(id);

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new Error("Application has already been reviewed");
  }

  // NEW: Check if user exists in Azure AD B2C
  const userExists = await checkUserExists(accessToken, application.email);

  // NEW: Create user in Azure AD B2C only if they don't already exist
  if (!userExists) {
    await createMediaUser(accessToken, {
      email: application.email,
      displayName: application.name,
      givenName: application.givenName,  // Assumes these fields exist on application
      surname: application.surname
    });
  }
  // NOTE: Existing users are NOT updated in Azure AD

  // NEW: Create local user record
  await createLocalMediaUser({
    email: application.email,
    displayName: application.name,
    userProvenance: "AZURE_B2C",
    role: "VERIFIED"
  });

  // EXISTING: Update application status
  await updateApplicationStatus(id, APPLICATION_STATUS.APPROVED);

  // EXISTING: Delete proof of ID file
  if (application.proofOfIdPath) {
    await deleteProofOfIdFile(application.proofOfIdPath);
  }

  return { isNewUser: !userExists };
}
```

**Error Handling Strategy:**
- If `checkUserExists` or `createMediaUser` throws an error, the function exits early
- Application status remains PENDING
- Proof of ID file is NOT deleted
- Error bubbles up to controller to display to admin
- **No retry mechanism** - fail immediately on Azure AD errors

### Controller Changes

**Location:** `libs/admin-pages/src/pages/media-applications/[id]/approve.ts`

Modify POST handler to:
1. Get access token via client credentials flow
2. Call `approveApplication` with access token
3. Determine which email to send based on `isNewUser` flag
4. Send appropriate email using full URLs from environment variables
5. Handle Azure AD errors with user-friendly messages (no retry, no admin notification for email failures)

```typescript
const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? approveCy : approveEn;
  const { id } = req.params;
  const { confirm } = req.body;

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).render("errors/404", {
        error: lang.errorMessages.notFound
      });
    }

    // Existing validation logic...

    // NEW: Get access token via client credentials flow and approve with Azure AD creation
    const accessToken = await getGraphApiAccessToken();
    const { isNewUser } = await approveApplication(id, accessToken);

    // NEW: Send appropriate email based on user status
    // Links are full URLs, environment-dependent (configured via env vars)
    try {
      if (isNewUser) {
        await sendMediaNewAccountEmail({
          email: application.email,
          full_name: application.name,
          forgot_password_link: process.env.MEDIA_FORGOT_PASSWORD_LINK || ""
        });
      } else {
        await sendMediaExistingUserEmail({
          email: application.email,
          forgot_password_link: process.env.MEDIA_FORGOT_PASSWORD_LINK || "",
          subscription_page_link: process.env.MEDIA_SUBSCRIPTION_PAGE_LINK || "",
          start_page_link: process.env.MEDIA_START_PAGE_LINK || ""
        });
      }
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
      // Don't fail the approval if email fails - no admin notification required
    }

    res.redirect(`/media-applications/${id}/approved`);
  } catch (error) {
    console.error("Failed to approve application:", error);
    res.render("media-applications/[id]/approve", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.azureAdFailed,
      application,
      hideLanguageToggle: true
    });
  }
};
```

### Content Changes

**Location:** `libs/admin-pages/src/pages/media-applications/[id]/approve-en.ts`

Add error message:
```typescript
azureAdFailed: "Unable to create user account in Azure AD. Please try again later."
```

**Location:** `libs/admin-pages/src/pages/media-applications/[id]/approve-cy.ts`

Add error message:
```typescript
azureAdFailed: "Methu creu cyfrif defnyddiwr yn Azure AD. Ceisiwch eto'n hwyrach."
```

### Environment Variables

**Location:** `apps/web/.env.example`

Add:
```
# GOV.UK Notify Templates for Media Users
GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT=689c0183-0461-423e-a542-de513a93a5b7
GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER=cc1b744d-6aa1-4410-9f53-216f8bd3298f

# Media User Links (full URLs, environment-dependent)
# These are deep links - the host varies per environment
# Staging example: https://sign-in.pip-frontend.staging.platform.hmcts.net/pip-frontend.staging.platform.hmcts.net/oauth2/v2.0/authorize?p=B2C_1A_PASSWORD_RESET&client_id=cae650ba-431b-4fc8-be14-22d476ebd31b&nonce=defaultNonce&redirect_uri=https://pip-frontend.staging.platform.hmcts.net/password-change-confirmation&scope=openid&response_type=code&prompt=login&ui_locales=en
MEDIA_FORGOT_PASSWORD_LINK=

# Staging example: https://pip-frontend.staging.platform.hmcts.net/subscription-management
MEDIA_SUBSCRIPTION_PAGE_LINK=

# Staging example: https://pip-frontend.staging.platform.hmcts.net/
MEDIA_START_PAGE_LINK=

# Azure AD B2C Service Principal (client credentials flow)
AZURE_B2C_TENANT_ID=your-b2c-tenant-id
AZURE_B2C_CLIENT_ID=your-service-principal-client-id
AZURE_B2C_CLIENT_SECRET=your-service-principal-client-secret
```

**Note:** All media user links are full absolute URLs (not relative paths). The host portion differs per environment (staging, production, etc.). Each environment must configure its own values.

## 3. Error Handling & Edge Cases

### Azure AD Errors

**Scenario:** Graph API is unavailable or returns error
- **Handling:** Catch error in `approveApplication`, throw descriptive error. **No retry mechanism.**
- **User Impact:** Admin sees error message, application stays PENDING, proof of ID retained
- **Logging:** Log full error details to console/Application Insights

**Scenario:** User already exists in Azure AD
- **Handling:** `checkUserExists` returns true. **Do NOT attempt to update the user.** Proceed with existing user email flow.
- **User Impact:** User receives existing user email. Their Azure AD profile is NOT modified.
- **Logging:** Log that existing user was detected

**Scenario:** Service principal lacks permissions
- **Handling:** Graph API returns 403, function throws error. No retry.
- **User Impact:** Admin sees error message
- **Logging:** Log permission error with details

**Scenario:** Client credentials token request fails
- **Handling:** `getGraphApiAccessToken` throws error, bubbles up to controller. No retry.
- **User Impact:** Admin sees error message, application stays PENDING
- **Logging:** Log auth error

### Email Errors

**Scenario:** GOV.UK Notify API is unavailable
- **Handling:** Log error but complete approval process. **No admin notification required.**
- **User Impact:** Application is approved, proof of ID deleted, but user doesn't receive email
- **Logging:** Log email failure with recipient details

**Scenario:** Invalid template ID or personalisation
- **Handling:** GOV.UK Notify client throws error, caught in POST handler
- **User Impact:** Same as above - approval completes, email failure logged
- **Logging:** Log full error including template ID and personalisation data

### Edge Cases

**Scenario:** Application status is already APPROVED
- **Handling:** Existing validation in `approveApplication` catches this
- **User Impact:** Error thrown, caught in controller, error displayed to admin

**Scenario:** Proof of ID file doesn't exist on filesystem
- **Handling:** Existing `deleteProofOfIdFile` function handles ENOENT gracefully
- **User Impact:** Approval completes successfully

**Scenario:** Admin clicks approve multiple times quickly
- **Handling:** First request creates user and updates status to APPROVED, subsequent requests fail status check
- **User Impact:** Error message on second request

## 4. Acceptance Criteria Mapping

### AC1: User created in Azure AD once admin approves

**Implementation:**
- `approveApplication` calls `checkUserExists` then `createMediaUser` (only for new users) before updating status
- Graph API creates user with `accountEnabled: true`, `displayName`, `givenName`, `surname`, `mail`
- Password set with `forceChangePasswordNextSignIn: true`
- Employer is NOT stored in Azure AD
- Local user record created with `userProvenance: "AZURE_B2C"`, role `VERIFIED`
- Function throws error if creation fails, blocking approval (no retry)

**Verification:**
- Unit test: Mock Graph API, verify POST /users called with correct data (displayName, givenName, surname)
- Unit test: Verify local user record created with correct provenance and role
- Integration test: Verify user exists in Azure AD B2C after approval
- E2E test: Mock Graph API in test environment

### AC2: User receives Confirmation & setup email if new user

**Implementation:**
- `approveApplication` returns `isNewUser: true` flag
- POST handler calls `sendMediaNewAccountEmail` with correct template ID
- Personalisation uses underscores: `full_name`, `forgot_password_link`

**Verification:**
- Unit test: Verify `sendMediaNewAccountEmail` called when `isNewUser === true`
- Unit test: Verify GOV.UK Notify client called with template 689c0183-0461-423e-a542-de513a93a5b7
- Unit test: Verify personalisation field names use underscores
- Integration test: Verify email sent to correct recipient

### AC3: User receives Existing User Confirmation Email if user already exists

**Implementation:**
- `checkUserExists` returns true, `createMediaUser` is NOT called
- Existing user is NOT updated in Azure AD (remains unchanged)
- Returns `isNewUser: false`
- POST handler calls `sendMediaExistingUserEmail` with correct template ID
- Personalisation uses underscores: `forgot_password_link`, `subscription_page_link`, `start_page_link`
- All links are full absolute URLs from environment variables

**Verification:**
- Unit test: Verify `sendMediaExistingUserEmail` called when `isNewUser === false`
- Unit test: Verify `createMediaUser` is NOT called for existing users
- Unit test: Verify GOV.UK Notify client called with template cc1b744d-6aa1-4410-9f53-216f8bd3298f
- Integration test: Verify email sent with all required links

### Additional Verification from Spec

**AC: Application status updated to APPROVED**
- Already implemented in existing `approveApplication` function
- Occurs after Azure AD user creation succeeds

**AC: Proof of ID file deleted**
- Already implemented in existing `approveApplication` function
- Occurs after status update

**AC: Approval fails if Azure AD creation fails**
- Error thrown by `createOrUpdateMediaUser` prevents status update
- Application remains PENDING
- Proof of ID file NOT deleted
- Verified by unit test with mocked Graph API error

**AC: Email failure doesn't block approval**
- Email operations wrapped in try-catch in POST handler
- Errors logged but not re-thrown
- Verified by unit test with mocked GOV.UK Notify error

## 5. Testing Strategy

### Unit Tests

**libs/auth/src/graph-api/client.test.ts:**
- `getGraphApiAccessToken` obtains token via client credentials flow
- `getGraphApiAccessToken` throws error when credentials are missing
- `checkUserExists` returns true when user found
- `checkUserExists` returns false when user not found
- `createMediaUser` creates new user with displayName, givenName, surname
- `createMediaUser` sets `forceChangePasswordNextSignIn: true`
- `createMediaUser` does NOT include employer in user properties
- `createMediaUser` throws error when Graph API fails (no retry)

**libs/notification/src/govuk-notify-service.test.ts:**
- `sendMediaNewAccountEmail` calls GOV.UK Notify with correct template ID
- `sendMediaNewAccountEmail` passes personalisation with underscores (`full_name`, `forgot_password_link`)
- `sendMediaExistingUserEmail` calls GOV.UK Notify with correct template ID
- `sendMediaExistingUserEmail` passes all required links with underscores (`forgot_password_link`, `subscription_page_link`, `start_page_link`)
- Both functions throw error when GOV.UK Notify API key missing

**libs/admin-pages/src/media-application/service.test.ts:**
- `approveApplication` creates Azure AD user before updating status for new users
- `approveApplication` does NOT call `createMediaUser` when user already exists
- `approveApplication` returns `isNewUser: true` for new users
- `approveApplication` returns `isNewUser: false` for existing users
- `approveApplication` creates local user record with provenance `AZURE_B2C` and role `VERIFIED`
- `approveApplication` throws error and doesn't update status when Azure AD fails
- `approveApplication` doesn't delete proof of ID when Azure AD fails

**libs/admin-pages/src/pages/media-applications/[id]/approve.test.ts:**
- POST handler sends new account email when user is new
- POST handler sends existing user email when user already exists
- POST handler completes approval even if email fails
- POST handler shows error and keeps PENDING status when Azure AD fails

### Integration Tests

**Graph API Integration:**
- Can authenticate with client credentials flow
- Can create user in test Azure AD B2C tenant
- Can check user existence

**GOV.UK Notify Integration:**
- Can send email with new account template
- Can send email with existing user template
- Email contains correct personalisation with underscore field names

### E2E Tests

Not required - the existing approval E2E tests cover the user journey. Azure AD and email operations will be mocked in test environments.

## 6. RESOLVED DECISIONS

All open questions and clarifications have been answered:

1. **Service Principal Authentication:**
   - Use **client credentials flow** (OAuth2 `grant_type=client_credentials`)
   - No existing flow to reuse - implement `getGraphApiAccessToken` function
   - **No caching required** - request fresh token per approval operation

2. **Azure AD B2C User Properties:**
   - Set **DisplayName, GivenName, Surname** only
   - **Employer is NOT stored** in Azure AD B2C
   - Password policy: **force password change on first login** (`forceChangePasswordNextSignIn: true`)
   - **No specific Azure AD B2C group** - users are not added to any group

3. **Forgot Password Link:**
   - This is a **deep link** to the B2C password reset policy
   - URL is **environment-dependent** (different per environment)
   - Staging example: `https://sign-in.pip-frontend.staging.platform.hmcts.net/pip-frontend.staging.platform.hmcts.net/oauth2/v2.0/authorize?p=B2C_1A_PASSWORD_RESET&client_id=cae650ba-431b-4fc8-be14-22d476ebd31b&nonce=defaultNonce&redirect_uri=https://pip-frontend.staging.platform.hmcts.net/password-change-confirmation&scope=openid&response_type=code&prompt=login&ui_locales=en`
   - Stored as full URL in `MEDIA_FORGOT_PASSWORD_LINK` env var

4. **Subscription and Start Page Links:**
   - **Not relative paths** - full absolute URLs where the host is environment-dependent
   - Staging subscription: `https://pip-frontend.staging.platform.hmcts.net/subscription-management`
   - Staging start page: `https://pip-frontend.staging.platform.hmcts.net/`
   - Stored as full URLs in `MEDIA_SUBSCRIPTION_PAGE_LINK` and `MEDIA_START_PAGE_LINK` env vars

5. **Local User Record:**
   - **Yes**, create a local user record
   - `userProvenance`: **`AZURE_B2C`**
   - Role: **`VERIFIED`**

6. **Azure AD B2C Update Strategy:**
   - **Existing users remain unchanged** - do NOT update their Azure AD properties
   - Only check existence, then proceed with existing user email flow

7. **Error Recovery:**
   - **No retry mechanism** - fail immediately on Azure AD errors
   - **No admin notification required** for email failures at present

8. **GOV.UK Notify Personalisation:**
   - Field names use **underscores** (e.g., `full_name`, `forgot_password_link`, `subscription_page_link`, `start_page_link`)
