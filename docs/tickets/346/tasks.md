# Implementation Tasks: Complete Azure B2C Media User Creation Journey

## Implementation Tasks

### Environment Configuration
- [x] Add new environment variables to `apps/web/.env.example`:
  - `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT`
  - `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER`
  - `MEDIA_FORGOT_PASSWORD_LINK` (full URL, environment-dependent deep link to B2C password reset)
  - `MEDIA_SUBSCRIPTION_PAGE_LINK` (full URL, environment-dependent)
  - `MEDIA_START_PAGE_LINK` (full URL, environment-dependent)
  - `AZURE_B2C_TENANT_ID`
  - `AZURE_B2C_CLIENT_ID`
  - `AZURE_B2C_CLIENT_SECRET`

### Graph API Client Functions
- [x] Add `getGraphApiAccessToken` function using client credentials flow to `libs/auth/src/graph-api/client.ts`
- [x] Add `checkUserExists` function to `libs/auth/src/graph-api/client.ts`
- [x] Add `createMediaUser` function to `libs/auth/src/graph-api/client.ts` (creates user with displayName, givenName, surname; no employer; forceChangePasswordNextSignIn: true)
- [x] Add unit tests for `getGraphApiAccessToken` in `libs/auth/src/graph-api/client.test.ts`
- [x] Add unit tests for `checkUserExists` in `libs/auth/src/graph-api/client.test.ts`
- [x] Add unit tests for `createMediaUser` in `libs/auth/src/graph-api/client.test.ts`
- [x] Export new functions from appropriate index file (if needed)

### GOV.UK Notify Email Functions
- [x] Add `sendMediaNewAccountEmail` function to `libs/notification/src/govuk-notify-service.ts` (personalisation: `full_name`, `forgot_password_link`)
- [x] Add `sendMediaExistingUserEmail` function to `libs/notification/src/govuk-notify-service.ts` (personalisation: `forgot_password_link`, `subscription_page_link`, `start_page_link`)
- [x] Add unit tests for `sendMediaNewAccountEmail` in `libs/notification/src/govuk-notify-service.test.ts`
- [x] Add unit tests for `sendMediaExistingUserEmail` in `libs/notification/src/govuk-notify-service.test.ts`
- [x] Export new email functions from `libs/notification/src/index.ts`

### Service Layer Integration
- [x] Modify `approveApplication` function in `libs/admin-pages/src/media-application/service.ts` to:
  - Accept `accessToken` parameter
  - Call `checkUserExists` to determine if user is new
  - Call `createMediaUser` only for new users (do NOT update existing users)
  - Create local user record with `userProvenance: "B2C_IDAM"` and role `VERIFIED`
  - Return `isNewUser` flag
- [x] Add unit tests for Azure AD integration in `libs/admin-pages/src/media-application/service.test.ts`
- [x] Add error handling tests (Azure AD failure scenarios, no retry)
- [x] Add tests verifying existing users are NOT modified in Azure AD

### Controller Updates
- [x] Modify POST handler in `libs/admin-pages/src/pages/media-applications/[id]/approve.ts` to:
  - Get access token via `getGraphApiAccessToken` (client credentials flow)
  - Pass token to `approveApplication`
  - Conditionally call `sendMediaNewAccountEmail` or `sendMediaExistingUserEmail` based on `isNewUser`
  - Use full URLs from env vars for all links (forgot password, subscription, start page)
  - Handle Azure AD errors with appropriate error message (no retry)
  - Log email failures without admin notification
- [x] Add Azure AD error messages to `libs/admin-pages/src/pages/media-applications/[id]/approve-en.ts`
- [x] Add Welsh Azure AD error messages to `libs/admin-pages/src/pages/media-applications/[id]/approve-cy.ts`
- [x] Add/update unit tests in `libs/admin-pages/src/pages/media-applications/[id]/approve.test.ts`

### Testing
- [x] Run all unit tests: `yarn test`
- [x] Verify test coverage meets >80% threshold
- [ ] Manual testing:
  - Test approval with new user email (verify Azure AD user created with displayName/givenName/surname, local user created, new account email sent)
  - Test approval with existing user email (verify Azure AD NOT modified, existing user email sent)
  - Test Azure AD failure scenario (verify approval blocked, status stays PENDING, no retry)
  - Test email failure scenario (verify approval completes, error logged, no admin notification)

### Code Quality
- [x] Run `yarn lint:fix` and resolve all linting issues
- [x] Run `yarn format` to ensure consistent code formatting
- [x] Review code for adherence to HMCTS standards in CLAUDE.md
