# Implementation Tasks: Complete Azure B2C Media User Creation Journey

## Implementation Tasks

### Environment Configuration
- [ ] Add new environment variables to `apps/web/.env.example`:
  - `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT`
  - `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER`
  - `MEDIA_FORGOT_PASSWORD_LINK`
  - `MEDIA_SUBSCRIPTION_PAGE_LINK`
  - `MEDIA_START_PAGE_LINK`
  - `AZURE_B2C_TENANT_ID`
  - `AZURE_B2C_CLIENT_ID`
  - `AZURE_B2C_CLIENT_SECRET`

### Graph API Client Functions
- [ ] Add `checkUserExists` function to `libs/auth/src/graph-api/client.ts`
- [ ] Add `createOrUpdateMediaUser` function to `libs/auth/src/graph-api/client.ts`
- [ ] Add unit tests for `checkUserExists` in `libs/auth/src/graph-api/client.test.ts`
- [ ] Add unit tests for `createOrUpdateMediaUser` in `libs/auth/src/graph-api/client.test.ts`
- [ ] Export new functions from appropriate index file (if needed)

### GOV.UK Notify Email Functions
- [ ] Add `sendMediaNewAccountEmail` function to `libs/notification/src/govuk-notify-service.ts`
- [ ] Add `sendMediaExistingUserEmail` function to `libs/notification/src/govuk-notify-service.ts`
- [ ] Add unit tests for `sendMediaNewAccountEmail` in `libs/notification/src/govuk-notify-service.test.ts`
- [ ] Add unit tests for `sendMediaExistingUserEmail` in `libs/notification/src/govuk-notify-service.test.ts`
- [ ] Export new email functions from `libs/notification/src/index.ts`

### Service Layer Integration
- [ ] Modify `approveApplication` function in `libs/admin-pages/src/media-application/service.ts` to:
  - Accept `accessToken` parameter
  - Call `createOrUpdateMediaUser` before status update
  - Return `isNewUser` flag
- [ ] Add unit tests for Azure AD integration in `libs/admin-pages/src/media-application/service.test.ts`
- [ ] Add error handling tests (Azure AD failure scenarios)

### Controller Updates
- [ ] Implement service principal token retrieval function (or identify existing implementation)
- [ ] Modify POST handler in `libs/admin-pages/src/pages/media-applications/[id]/approve.ts` to:
  - Get service principal access token
  - Pass token to `approveApplication`
  - Conditionally call `sendMediaNewAccountEmail` or `sendMediaExistingUserEmail` based on `isNewUser`
  - Handle Azure AD errors with appropriate error message
- [ ] Add Azure AD error messages to `libs/admin-pages/src/pages/media-applications/[id]/approve-en.ts`
- [ ] Add Welsh Azure AD error messages to `libs/admin-pages/src/pages/media-applications/[id]/approve-cy.ts`
- [ ] Add/update unit tests in `libs/admin-pages/src/pages/media-applications/[id]/approve.test.ts`

### Testing
- [ ] Run all unit tests: `yarn test`
- [ ] Verify test coverage meets >80% threshold
- [ ] Manual testing:
  - Test approval with new user email (verify Azure AD user created and new account email sent)
  - Test approval with existing user email (verify existing user email sent)
  - Test Azure AD failure scenario (verify approval blocked, status stays PENDING)
  - Test email failure scenario (verify approval completes, error logged)

### Documentation
- [ ] Update relevant documentation if needed
- [ ] Ensure environment variables are documented in deployment guides

### Code Quality
- [ ] Run `yarn lint:fix` and resolve all linting issues
- [ ] Run `yarn format` to ensure consistent code formatting
- [ ] Review code for adherence to HMCTS standards in CLAUDE.md
