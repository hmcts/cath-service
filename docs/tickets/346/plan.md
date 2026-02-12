# Technical Plan: Complete Azure B2C Media User Creation Journey

## 1. Technical Approach

This ticket integrates Azure AD B2C user creation into the existing media application approval workflow. The implementation follows the established pattern in `libs/admin-pages/src/pages/media-applications/[id]/approve.ts` where email notification already occurs post-approval.

**Key Strategy:**
1. Extend the `approveApplication` service function to create/update users in Azure AD B2C before updating the application status
2. Add Graph API client functions to handle Azure AD B2C user operations
3. Add GOV.UK Notify service functions for the two new email templates (new account vs existing user)
4. Modify the approval POST handler to determine user existence and send appropriate email
5. Maintain existing error handling pattern (block approval on Azure AD failure, log email failures)

**Architecture Decisions:**
- **No local user record creation**: The spec doesn't require creating a local `user` table record. Media users will exist only in Azure AD B2C for authentication
- **Graph API client separation**: Keep Azure AD B2C user creation logic in `libs/auth/src/graph-api/` alongside existing Graph API functions
- **Email template IDs**: Use environment variables for template IDs (following existing pattern)
- **Idempotent user creation**: Check if user exists before creating to avoid conflicts

## 2. Implementation Details

### File Structure

```
libs/
├── auth/src/graph-api/
│   ├── client.ts                          # Add: createOrUpdateMediaUser, checkUserExists
│   └── client.test.ts                     # Add: tests for new functions
│
├── notification/src/
│   ├── govuk-notify-service.ts            # Add: sendMediaNewAccountEmail, sendMediaExistingUserEmail
│   ├── govuk-notify-service.test.ts       # Add: tests for new email functions
│   └── index.ts                           # Export new email functions
│
└── admin-pages/src/
    ├── media-application/
    │   ├── service.ts                     # Modify: approveApplication to call Azure AD creation
    │   └── service.test.ts                # Add: tests for Azure AD integration
    │
    └── pages/media-applications/[id]/
        ├── approve.ts                     # Modify: POST handler to check user existence and send appropriate email
        ├── approve.test.ts                # Add: tests for updated approval logic (if doesn't exist)
        ├── approve-en.ts                  # Add: error message for Azure AD failure
        └── approve-cy.ts                  # Add: Welsh error message for Azure AD failure
```

### Graph API Client Functions

**Location:** `libs/auth/src/graph-api/client.ts`

```typescript
/**
 * Check if a user exists in Azure AD B2C by email
 * @param accessToken - Service principal access token
 * @param email - User email address
 * @returns true if user exists, false otherwise
 */
export async function checkUserExists(
  accessToken: string,
  email: string
): Promise<boolean>

/**
 * Create or update a media user in Azure AD B2C
 * @param accessToken - Service principal access token
 * @param userData - User details from media application
 * @returns Azure AD user ID and whether user is new
 */
export async function createOrUpdateMediaUser(
  accessToken: string,
  userData: {
    email: string;
    fullName: string;
    employer: string;
  }
): Promise<{ azureAdUserId: string; isNewUser: boolean }>
```

**Implementation Notes:**
- Use Graph API endpoint: `GET /users?$filter=mail eq '{email}'` to check existence
- Use Graph API endpoint: `POST /users` to create new user
- Use Graph API endpoint: `PATCH /users/{id}` to update existing user (if needed)
- New users should have:
  - `accountEnabled: true`
  - `displayName: fullName`
  - `mail: email`
  - `passwordProfile: { forceChangePasswordNextSignIn: true, password: auto-generated }`
  - Custom attribute for employer (if B2C custom attributes are configured)
- Error handling: Throw descriptive errors if Graph API calls fail

### GOV.UK Notify Service Functions

**Location:** `libs/notification/src/govuk-notify-service.ts`

```typescript
/**
 * Send new account confirmation email to media user
 * Template ID: 689c0183-0461-423e-a542-de513a93a5b7
 */
export async function sendMediaNewAccountEmail(data: {
  email: string;
  fullName: string;
  forgotPasswordLink: string;
}): Promise<void>

/**
 * Send existing user confirmation email to media user
 * Template ID: cc1b744d-6aa1-4410-9f53-216f8bd3298f
 */
export async function sendMediaExistingUserEmail(data: {
  email: string;
  forgotPasswordLink: string;
  subscriptionPageLink: string;
  startPageLink: string;
}): Promise<void>
```

**Implementation Notes:**
- Follow existing pattern from `sendMediaApprovalEmail` and `sendMediaRejectionEmail`
- Read template IDs from environment variables
- Personalisation field names must match GOV.UK Notify template configuration
- Use descriptive reference strings (e.g., `media-new-account-${Date.now()}`)

### Service Layer Changes

**Location:** `libs/admin-pages/src/media-application/service.ts`

Modify `approveApplication` function:

```typescript
export async function approveApplication(
  id: string,
  accessToken: string  // NEW: Service principal token for Graph API
): Promise<{ isNewUser: boolean }> {
  const application = await getApplicationById(id);

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new Error("Application has already been reviewed");
  }

  // NEW: Create or update user in Azure AD B2C
  const { isNewUser } = await createOrUpdateMediaUser(accessToken, {
    email: application.email,
    fullName: application.name,
    employer: application.employer
  });

  // EXISTING: Update application status
  await updateApplicationStatus(id, APPLICATION_STATUS.APPROVED);

  // EXISTING: Delete proof of ID file
  if (application.proofOfIdPath) {
    await deleteProofOfIdFile(application.proofOfIdPath);
  }

  return { isNewUser };
}
```

**Error Handling Strategy:**
- If `createOrUpdateMediaUser` throws an error, the function exits early
- Application status remains PENDING
- Proof of ID file is NOT deleted
- Error bubbles up to controller to display to admin

### Controller Changes

**Location:** `libs/admin-pages/src/pages/media-applications/[id]/approve.ts`

Modify POST handler to:
1. Get service principal access token (implementation depends on auth setup)
2. Call `approveApplication` with access token
3. Determine which email to send based on `isNewUser` flag
4. Send appropriate email
5. Handle Azure AD errors with user-friendly messages

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

    // NEW: Get service principal token and approve with Azure AD creation
    const accessToken = await getServicePrincipalToken();
    const { isNewUser } = await approveApplication(id, accessToken);

    // NEW: Send appropriate email based on user status
    try {
      if (isNewUser) {
        await sendMediaNewAccountEmail({
          email: application.email,
          fullName: application.name,
          forgotPasswordLink: process.env.MEDIA_FORGOT_PASSWORD_LINK || ""
        });
      } else {
        await sendMediaExistingUserEmail({
          email: application.email,
          forgotPasswordLink: process.env.MEDIA_FORGOT_PASSWORD_LINK || "",
          subscriptionPageLink: process.env.MEDIA_SUBSCRIPTION_PAGE_LINK || "",
          startPageLink: process.env.MEDIA_START_PAGE_LINK || ""
        });
      }
    } catch (error) {
      console.error("❌ Failed to send confirmation email:", error);
      // Don't fail the approval if email fails
    }

    res.redirect(`/media-applications/${id}/approved`);
  } catch (error) {
    console.error("❌ Failed to approve application:", error);
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

# Media User Links
MEDIA_FORGOT_PASSWORD_LINK=https://[b2c-tenant].b2clogin.com/[tenant]/oauth2/v2.0/authorize?p=B2C_1_PasswordReset&client_id=[client-id]&nonce=defaultNonce&redirect_uri=[redirect]&scope=openid&response_type=code&prompt=login
MEDIA_SUBSCRIPTION_PAGE_LINK=/subscriptions
MEDIA_START_PAGE_LINK=/

# Azure AD B2C Service Principal (for creating users)
AZURE_B2C_TENANT_ID=your-b2c-tenant-id
AZURE_B2C_CLIENT_ID=your-service-principal-client-id
AZURE_B2C_CLIENT_SECRET=your-service-principal-client-secret
```

## 3. Error Handling & Edge Cases

### Azure AD Errors

**Scenario:** Graph API is unavailable or returns error
- **Handling:** Catch error in `approveApplication`, throw descriptive error
- **User Impact:** Admin sees error message, application stays PENDING, proof of ID retained
- **Logging:** Log full error details to console/Application Insights

**Scenario:** User already exists with different details
- **Handling:** Update user details in Azure AD B2C (PATCH request)
- **User Impact:** User receives existing user email, their Azure AD profile is updated
- **Logging:** Log that existing user was updated

**Scenario:** Service principal lacks permissions
- **Handling:** Graph API returns 403, function throws error
- **User Impact:** Admin sees error message
- **Logging:** Log permission error with details

### Email Errors

**Scenario:** GOV.UK Notify API is unavailable
- **Handling:** Log error but complete approval process
- **User Impact:** Application is approved, proof of ID deleted, but user doesn't receive email
- **Logging:** Log email failure with recipient details for manual follow-up

**Scenario:** Invalid template ID or personalisation
- **Handling:** GOV.UK Notify client throws error, caught in POST handler
- **User Impact:** Same as above - approval completes, email failure logged
- **Logging:** Log full error including template ID and personalisation data

### Validation Errors

**Scenario:** Email address is invalid
- **Handling:** Should not occur as email is validated during application creation
- **Mitigation:** Add email format validation before Graph API call

**Scenario:** Access token is missing or invalid
- **Handling:** `createOrUpdateMediaUser` throws error immediately
- **User Impact:** Admin sees error, approval fails
- **Logging:** Log auth error

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
- `approveApplication` calls `createOrUpdateMediaUser` before updating status
- Graph API creates user with `accountEnabled: true`, email, displayName
- Function throws error if creation fails, blocking approval

**Verification:**
- Unit test: Mock Graph API, verify POST /users called with correct data
- Integration test: Verify user exists in Azure AD B2C after approval
- E2E test: Mock Graph API in test environment

### AC2: User receives Confirmation & setup email if new user

**Implementation:**
- `approveApplication` returns `isNewUser: true` flag
- POST handler calls `sendMediaNewAccountEmail` with correct template ID
- Personalisation includes full name and forgot password link

**Verification:**
- Unit test: Verify `sendMediaNewAccountEmail` called when `isNewUser === true`
- Unit test: Verify GOV.UK Notify client called with template 689c0183-0461-423e-a542-de513a93a5b7
- Integration test: Verify email sent to correct recipient

### AC3: User receives Existing User Confirmation Email if user already exists

**Implementation:**
- `createOrUpdateMediaUser` checks user existence first
- Returns `isNewUser: false` if user found
- POST handler calls `sendMediaExistingUserEmail` with correct template ID
- Personalisation includes forgot password link, subscription link, start link

**Verification:**
- Unit test: Verify `sendMediaExistingUserEmail` called when `isNewUser === false`
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
- `checkUserExists` returns true when user found
- `checkUserExists` returns false when user not found
- `createOrUpdateMediaUser` creates new user when doesn't exist
- `createOrUpdateMediaUser` returns `isNewUser: true` for new users
- `createOrUpdateMediaUser` updates user when exists
- `createOrUpdateMediaUser` returns `isNewUser: false` for existing users
- `createOrUpdateMediaUser` throws error when Graph API fails

**libs/notification/src/govuk-notify-service.test.ts:**
- `sendMediaNewAccountEmail` calls GOV.UK Notify with correct template ID
- `sendMediaNewAccountEmail` passes correct personalisation
- `sendMediaExistingUserEmail` calls GOV.UK Notify with correct template ID
- `sendMediaExistingUserEmail` passes all required links
- Both functions throw error when GOV.UK Notify API key missing

**libs/admin-pages/src/media-application/service.test.ts:**
- `approveApplication` creates Azure AD user before updating status
- `approveApplication` returns `isNewUser: true` for new users
- `approveApplication` returns `isNewUser: false` for existing users
- `approveApplication` throws error and doesn't update status when Azure AD fails
- `approveApplication` doesn't delete proof of ID when Azure AD fails

**libs/admin-pages/src/pages/media-applications/[id]/approve.test.ts:**
- POST handler sends new account email when user is new
- POST handler sends existing user email when user already exists
- POST handler completes approval even if email fails
- POST handler shows error and keeps PENDING status when Azure AD fails

### Integration Tests

**Graph API Integration:**
- Can authenticate with service principal
- Can create user in test Azure AD B2C tenant
- Can check user existence
- Can update existing user

**GOV.UK Notify Integration:**
- Can send email with new account template
- Can send email with existing user template
- Email contains correct personalisation

### E2E Tests

Not required - the existing approval E2E tests cover the user journey. Azure AD and email operations will be mocked in test environments.

## 6. CLARIFICATIONS NEEDED

1. **Service Principal Authentication:**
   - How should the controller obtain the service principal access token?
   - Is there an existing token service/middleware, or should this be implemented?
   - Should token be cached or requested per approval operation?

2. **Azure AD B2C User Properties:**
   - What specific properties should be set on the user object?
   - Should employer be stored as a custom attribute? If so, what is the attribute name?
   - What password policy should be applied? (Recommend: force password reset on first login)
   - Should users be added to a specific Azure AD B2C group?

3. **Forgot Password Link:**
   - What is the exact URL format for the Azure AD B2C password reset flow?
   - Should this be a deep link to B2C policy or a service page?

4. **Subscription and Start Page Links:**
   - What are the exact paths for `MEDIA_SUBSCRIPTION_PAGE_LINK` and `MEDIA_START_PAGE_LINK`?
   - Are these relative paths on the same domain?

5. **Local User Record:**
   - The spec mentions considering creating a local `user` table record. Should this be implemented?
   - If yes, what should the `userProvenance` value be? (Suggest: "B2C_MEDIA" or similar)
   - If yes, what role should media users have?

6. **Azure AD B2C Update Strategy:**
   - When user already exists, which fields should be updated? (displayName, employer custom attribute?)
   - Or should existing users remain unchanged?

7. **Error Recovery:**
   - Should there be a retry mechanism for transient Azure AD failures?
   - How should admins be notified if email fails but approval succeeds?

8. **GOV.UK Notify Personalisation:**
   - Are the personalisation field names in the ticket correct as shown in the GOV.UK Notify templates?
   - The spec shows different naming conventions (underscores vs hyphens) - which is correct?
