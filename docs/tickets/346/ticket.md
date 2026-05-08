# #346: Complete Azure B2C media user creation journey

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-11T16:36:19Z
**Updated:** 2026-02-12T14:01:09Z

## Description

As part of this ticket, once CTSC Admin approves the media application, we need to make that user has been created in Azure AD using graph api and relevant emails will be sent to the user.

If it is a new user, we need to send Media New Account Confirmation & Setup
Template Id: 689c0183-0461-423e-a542-de513a93a5b7
Personalisation list:

- Full name
- forgot password process link

if user already exists, we need to send Existing User Confirmation Email
Personalisation list:
Template Id: cc1b744d-6aa1-4410-9f53-216f8bd3298f
- forgot password process link
- subscription_page_link
- start_page_link


**Acceptance criteria**

- User created in Azure AD once admin approves
- User receive Confirmation & setup email if a new user otherwise receive Existing User Confirmation Email

## Comments

### Comment by OgechiOkelu on 2026-02-12T13:58:31Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-12T14:00:50Z
## 1. User Story
**As a** CTSC Admin
**I want to** complete the media user creation journey after approval
**So that** media users receive their accounts in Azure AD and get appropriate confirmation emails

## 2. Background
This completes the media application approval workflow (issue #346) by:
- Creating or updating the user in Azure AD B2C via Microsoft Graph API
- Sending appropriate email notifications based on whether the user is new or existing
- Following the existing approval flow pattern established in VIBE-228

Related documentation:
- Existing approval flow: libs/admin-pages/src/pages/media-applications/[id]/approve.ts
- GOV Notify service: libs/notification/src/govuk-notify-service.ts
- Graph API client: libs/auth/src/graph-api/client.ts

## 3. Acceptance Criteria

* **Scenario:** New media user approved by CTSC Admin
    * **Given** a media application is in PENDING status with a user email that does not exist in Azure AD
    * **When** the CTSC Admin approves the application
    * **Then** a new user is created in Azure AD B2C with the applicant's details
    * **And** the user receives "Media New Account Confirmation & Setup" email (template: 689c0183-0461-423e-a542-de513a93a5b7)
    * **And** the application status is updated to APPROVED
    * **And** the proof of ID file is deleted

* **Scenario:** Existing media user re-approved by CTSC Admin
    * **Given** a media application is in PENDING status with a user email that already exists in Azure AD
    * **When** the CTSC Admin approves the application
    * **Then** the existing user account is updated in Azure AD B2C (if needed)
    * **And** the user receives "Existing User Confirmation Email" (template: cc1b744d-6aa1-4410-9f53-216f8bd3298f)
    * **And** the application status is updated to APPROVED
    * **And** the proof of ID file is deleted

* **Scenario:** Azure AD creation fails
    * **Given** a media application is being approved
    * **When** the Azure AD user creation/update fails
    * **Then** the approval process fails
    * **And** the application remains in PENDING status
    * **And** an error message is logged
    * **And** the CTSC Admin sees an error message
    * **And** the proof of ID file is NOT deleted

## 4. User Journey Flow

```
CTSC Admin clicks "Approve"
    ↓
Admin confirms approval (selects "Yes" radio button)
    ↓
System checks if user exists in Azure AD B2C
    ↓
    ├─→ User does NOT exist
    │       ↓
    │   Create new user in Azure AD B2C
    │       ↓
    │   Send "New Account Confirmation" email
    │       ↓
    │   Update application status to APPROVED
    │       ↓
    │   Delete proof of ID file
    │       ↓
    │   Show "Application approved" confirmation page
    │
    └─→ User DOES exist
            ↓
        Update user in Azure AD B2C (if needed)
            ↓
        Send "Existing User Confirmation" email
            ↓
        Update application status to APPROVED
            ↓
        Delete proof of ID file
            ↓
        Show "Application approved" confirmation page

Error handling:
- If Azure AD operation fails: Show error, keep status as PENDING, retain proof of ID
- If email fails: Log error but complete approval (don't block on email failure)
```

## 5. Low Fidelity Wireframe

No UI changes required - all changes are backend logic integrated into existing approval flow.

## 6. Page Specifications

No new pages required. The existing approval flow pages remain unchanged:
- /media-applications/:id/approve - Confirmation page (existing)
- /media-applications/:id/approved - Success page (existing)

## 7. Content

### Email Templates

**Media New Account Confirmation & Setup**
- Template ID: `689c0183-0461-423e-a542-de513a93a5b7`
- Personalisation:
  - `full_name`: Full name from application
  - `forgot_password_link`: Link to password reset process

**Existing User Confirmation Email**
- Template ID: `cc1b744d-6aa1-4410-9f53-216f8bd3298f`
- Personalisation:
  - `forgot_password_link`: Link to password reset process
  - `subscription_page_link`: Link to subscription management
  - `start_page_link`: Link to service start page

### Error Messages (English)
- "Unable to create user account in Azure AD. Please try again later."
- "Unable to approve application. Please try again later."

### Error Messages (Welsh)
- "Methu creu cyfrif defnyddiwr yn Azure AD. Ceisiwch eto'n hwyrach."
- "Methu cymeradwyo cais. Ceisiwch eto'n hwyrach."

## 8. URL

No URL changes - uses existing approval endpoints:
- POST /media-applications/:id/approve
- GET /media-applications/:id/approved

## 9. Validation

N/A - No new form inputs. Validation occurs at the service layer:
- Application must exist
- Application must be in PENDING status
- Email address must be valid (already validated during application creation)
- Azure AD response must be successful

## 10. Error Messages

Handled at service layer and displayed on approval confirmation page if Azure AD operations fail.

## 11. Navigation

No changes to navigation - follows existing approval flow pattern.

## 12. Accessibility

No UI changes, therefore no new accessibility requirements. Existing pages already comply with WCAG 2.2 AA.

## 13. Test Scenarios

### Unit Tests

* **Test:** `createMediaUserInAzureAd` creates new user when user does not exist
* **Test:** `createMediaUserInAzureAd` returns existing user when user already exists
* **Test:** `createMediaUserInAzureAd` throws error when Graph API fails
* **Test:** `sendMediaNewAccountEmail` sends email with correct template and personalisation
* **Test:** `sendMediaExistingUserEmail` sends email with correct template and personalisation
* **Test:** Approval handler creates Azure AD user before sending email
* **Test:** Approval handler sends new account email for new users
* **Test:** Approval handler sends existing user email for existing users
* **Test:** Approval handler completes approval even if email fails (logs error only)
* **Test:** Approval handler fails and keeps PENDING status if Azure AD creation fails
* **Test:** Approval handler does not delete proof of ID if Azure AD operation fails

### Integration Tests

* **Scenario:** End-to-end approval flow for new user creates Azure AD account and sends email
* **Scenario:** End-to-end approval flow for existing user updates Azure AD and sends appropriate email
* **Scenario:** Approval fails gracefully when Azure AD is unavailable

### E2E Tests (if applicable)

No new E2E tests required - existing approval E2E tests cover the user journey. The Azure AD and email operations will be mocked in test environments.

## 14. Assumptions & Open Questions

### Assumptions
- Azure AD B2C tenant is already configured and accessible via Graph API
- Service principal/app registration has permissions to create users in Azure AD B2C (`User.ReadWrite.All`)
- GOV.UK Notify templates (689c0183-0461-423e-a542-de513a93a5b7 and cc1b744d-6aa1-4410-9f53-216f8bd3298f) are already created
- Forgot password link URL is available as environment variable or configuration
- Subscription page link and start page link URLs are available

### Open Questions
1. What should the initial password policy be for new Azure AD B2C users? (Typically: force password reset on first login)
2. Should new users be added to a specific Azure AD group for media users?
3. What is the exact format/URL for the forgot password process link?
4. What are the exact URLs for subscription_page_link and start_page_link?
5. Should we create a user record in the local `user` table in addition to Azure AD? (Likely yes, for consistency)
6. What should be the `userProvenance` value for media users in the local database? (Suggest: "AZURE_B2C_MEDIA")
7. Should we retry Azure AD operations if they fail, or fail immediately?
8. What user properties should be set in Azure AD (displayName, givenName, surname, etc.)?

---

## Implementation Notes

### New Functions Required

**libs/auth/src/graph-api/client.ts:**
```typescript
// Create or update media user in Azure AD B2C
export async function createMediaUserInAzureAd(
  accessToken: string,
  userData: { email: string; fullName: string; employer: string }
): Promise<{ id: string; isNewUser: boolean }>

// Check if user exists in Azure AD
export async function checkUserExistsByEmail(
  accessToken: string,
  email: string
): Promise<boolean>
```

**libs/notification/src/govuk-notify-service.ts:**
```typescript
// Send new media account confirmation email
export async function sendMediaNewAccountEmail(data: {
  email: string;
  fullName: string;
  forgotPasswordLink: string;
}): Promise<void>

// Send existing user confirmation email
export async function sendMediaExistingUserEmail(data: {
  email: string;
  forgotPasswordLink: string;
  subscriptionPageLink: string;
  startPageLink: string;
}): Promise<void>
```

**libs/admin-pages/src/media-application/service.ts:**
```typescript
// Enhanced approveApplication to include Azure AD user creation
// and email notification logic
```

### Environment Variables Required

Add to apps/web/.env.example:
```
# GOV.UK Notify Templates for Media Users
GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT=689c0183-0461-423e-a542-de513a93a5b7
GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER=cc1b744d-6aa1-4410-9f53-216f8bd3298f

# Media User Links
MEDIA_FORGOT_PASSWORD_LINK=https://[b2c-tenant].b2clogin.com/[tenant]/oauth2/v2.0/authorize?...
MEDIA_SUBSCRIPTION_PAGE_LINK=/subscriptions
MEDIA_START_PAGE_LINK=/
```

### Database Considerations

Consider whether to create a record in the local `user` table when creating Azure AD user. This would maintain consistency with other user types and enable local subscription management.

### Error Handling Strategy

1. **Azure AD failures**: Block approval, show error to admin, keep status as PENDING
2. **Email failures**: Log error but complete approval (email is notification only, not critical)
3. **File deletion failures**: Log error but complete approval (cleanup can happen later)

### Security Considerations

- Ensure service principal has minimum required permissions (`User.ReadWrite.All` in specific B2C directory only)
- Log all Azure AD user creation/update operations for audit trail
- Sanitize email addresses before Azure AD API calls
- Use secure token storage for Graph API access tokens

### Comment by OgechiOkelu on 2026-02-12T14:01:09Z
@plan
