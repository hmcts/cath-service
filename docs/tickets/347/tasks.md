# Implementation Tasks

## Phase 1: Setup and Configuration

- [x] Update `libs/auth/package.json` to add `openid-client: 6.3.3` dependency
- [x] Remove `passport-azure-ad: 4.3.5` from `libs/auth/package.json`
- [x] Run `yarn install` to update dependencies
- [x] Update `libs/auth/src/config/sso-config.ts` interface to replace `identityMetadata` with `issuerUrl`
- [x] Update `getSsoConfig()` to read `SSO_ISSUER_URL` environment variable instead of `SSO_IDENTITY_METADATA`
- [x] Remove `appendOpenIdConfigPath()` helper function from `sso-config.ts`
- [x] Update `isSsoConfigured()` to check `issuerUrl` instead of `identityMetadata`

## Phase 2: Custom Passport Strategy Implementation

- [x] Create `libs/auth/src/openid-connect-strategy/` directory
- [x] Create `libs/auth/src/openid-connect-strategy/openid-connect-strategy.ts` with base strategy class
- [x] Implement OIDC discovery using openid-client v6 `discovery()` with caching
- [x] Implement authorization URL generation with PKCE support (delegated to openid-client/passport built-in Strategy)
- [x] Implement code_verifier storage in session during authorization (delegated to openid-client/passport built-in Strategy)
- [x] Implement token exchange with authorization code (delegated to openid-client/passport built-in Strategy)
- [x] Implement ID token validation and claims extraction
- [x] Implement verify callback invocation with extracted profile data
- [x] Add error handling for all OIDC flow failure scenarios

## Phase 3: Integration with Passport Configuration

- [x] Update `libs/auth/src/config/passport-config.ts` imports to use `OpenIdConnectStrategy`
- [x] Update strategy instantiation to use new `OpenIdConnectStrategy` class
- [x] Update configuration mapping to use `issuerUrl` instead of `identityMetadata`
- [x] Update configuration validation checks to use new config structure
- [x] Verify `verifyOidcCallback()` remains unchanged (adapted for new token-based callback signature)
- [x] Update `libs/auth/src/pages/logout/index.ts` to use `issuerUrl` instead of `identityMetadata`

## Phase 4: Testing - Unit Tests

- [x] Create `libs/auth/src/openid-connect-strategy/openid-connect-strategy.test.ts`
- [x] Write tests for OIDC discovery success and failure
- [x] Write tests for authorization URL generation
- [x] Write tests for PKCE code_verifier generation and storage
- [x] Write tests for token exchange success and failure
- [x] Write tests for ID token validation
- [x] Write tests for claims extraction and profile construction
- [x] Write tests for error handling scenarios
- [x] Update `libs/auth/src/config/passport-config.test.ts` to mock `OpenIdConnectStrategy`
- [x] Update test assertions for new config structure
- [x] Verify all existing test scenarios still pass
- [x] Update `libs/auth/src/config/sso-config.test.ts` to test `issuerUrl` instead of `identityMetadata`
- [x] Update `libs/auth/src/pages/logout/index.test.ts` to use `issuerUrl` instead of `identityMetadata`
- [x] Update `libs/auth/src/role-service/index.test.ts` to use `issuerUrl` instead of `identityMetadata`

## Phase 5: Testing - Integration Tests

- [ ] Create integration test for complete SSO authentication flow
- [ ] Test session regeneration and user persistence
- [ ] Test database user creation/update with SSO provenance
- [ ] Test role-based redirects after successful authentication
- [ ] Test error handling with misconfigured SSO
- [x] Verify CFT IDAM integration tests still pass (no regression)

## Phase 6: Testing - E2E Tests

- [ ] Create or update E2E test for SSO login journey (system admin user) - tag with `@nightly`
- [ ] Create or update E2E test for SSO login journey (CTSC admin user) - tag with `@nightly`
- [ ] Create or update E2E test for SSO login journey (local admin user) - tag with `@nightly`
- [ ] Create or update E2E test for SSO rejection (user without required groups) - tag with `@nightly`
- [ ] Verify existing CFT IDAM E2E tests still pass (regression check)
- [ ] Run full E2E test suite to verify no unintended side effects

## Phase 7: Environment Configuration

- [ ] Verify `SSO_ISSUER_URL` format in local `.env` files
- [ ] Document required environment variable change for deployment team
- [ ] Verify Azure Key Vault has `SSO_ISSUER_URL` configured correctly
- [ ] Verify GitHub Secrets has `SSO_ISSUER_URL` configured correctly

## Phase 8: Manual Testing

- [ ] Test SSO login in local development environment
- [ ] Test CFT IDAM login in local development environment (regression)
- [ ] Test SSO login with system admin account
- [ ] Test SSO login with CTSC admin account
- [ ] Test SSO login with local admin account
- [ ] Test SSO rejection with non-admin account
- [ ] Verify error pages display correctly for auth failures
- [ ] Verify session cookies are set correctly
- [ ] Verify role-based access control works correctly

## Phase 9: Documentation and Cleanup

- [ ] Update any documentation referencing `SSO_IDENTITY_METADATA`
- [ ] Document the new `SSO_ISSUER_URL` configuration format
- [ ] Add inline code comments explaining PKCE flow in strategy
- [x] Verify all TypeScript types are properly exported
- [x] Run `yarn lint:fix` to ensure code quality
- [x] Run `yarn format` to ensure consistent formatting

## Phase 10: Deployment Preparation

- [ ] Create deployment runbook with rollback steps
- [ ] Prepare communication for deployment (if user-facing downtime expected)
- [ ] Schedule deployment window (if required)
- [ ] Verify CI/CD pipeline passes with all tests
- [ ] Create pull request with comprehensive description of changes
