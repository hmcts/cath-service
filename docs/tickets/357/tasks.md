# Implementation Tasks: Crime IDAM Integration

## Implementation Tasks

### Configuration and Token Client
- [x] Create `libs/auth/src/config/crime-idam-config.ts` with `getCrimeIdamConfig()` and `isCrimeIdamConfigured()` functions
- [x] Create `libs/auth/src/config/crime-idam-config.test.ts` with unit tests
- [x] Create `libs/auth/src/crime-idam/token-client.ts` with `exchangeCodeForToken()` and `extractUserInfoFromToken()` functions
- [x] Create `libs/auth/src/crime-idam/token-client.test.ts` with unit tests

### Role Validation
- [x] Add `isRejectedCrimeRole()` function to `libs/auth/src/role-service/index.ts`
- [x] Add unit tests for `isRejectedCrimeRole()` in `libs/auth/src/role-service/index.test.ts`

### Page Controllers
- [x] Create `libs/auth/src/pages/crime-login/index.ts` controller for login initiation
- [x] Create `libs/auth/src/pages/crime-login/index.test.ts` unit tests
- [x] Create `libs/auth/src/pages/crime-callback/index.ts` controller for OAuth callback
- [x] Create `libs/auth/src/pages/crime-callback/index.test.ts` unit tests
- [x] Create `libs/auth/src/pages/crime-rejected/index.ts` controller
- [x] Create `libs/auth/src/pages/crime-rejected/index.njk` template
- [x] Create `libs/auth/src/pages/crime-rejected/en.ts` English content
- [x] Create `libs/auth/src/pages/crime-rejected/cy.ts` Welsh content
- [x] Create `libs/auth/src/pages/crime-rejected/index.test.ts` unit tests

### Sign-in Page Updates
- [x] Update `libs/public-pages/src/pages/sign-in/index.ts` to add Crime IDAM option
- [x] Update `libs/public-pages/src/pages/sign-in/index.njk` to add Crime IDAM radio option
- [x] Update `libs/public-pages/src/pages/sign-in/en.ts` with Crime IDAM label
- [x] Update `libs/public-pages/src/pages/sign-in/cy.ts` with Crime IDAM Welsh label
- [x] Update `libs/public-pages/src/pages/sign-in/index.test.ts` to test Crime IDAM redirect

### Exports and Registration
- [x] Export Crime IDAM callback handler from `libs/auth/src/index.ts`
- [x] Register Crime IDAM callback route in `apps/web/src/app.ts`

### Security Configuration
- [x] Update `libs/web-core/src/middleware/helmet/helmet-middleware.ts` to accept `crimeIdamUrl` option
- [x] Update `libs/web-core/src/middleware/helmet/helmet-middleware.test.ts` with Crime IDAM tests
- [x] Update `apps/web/src/app.ts` to pass Crime IDAM URL to helmet configuration

### Environment Configuration
- [x] Update `apps/web/.env.example` with Crime IDAM environment variables
- [x] Update `docs/GITHUB_SECRETS_SETUP.md` with Crime IDAM GitHub secrets
