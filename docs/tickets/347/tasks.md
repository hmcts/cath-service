# Implementation Tasks

## Phase 1: Setup and Configuration

- [ ] Update `libs/auth/package.json` to add `openid-client: 6.1.3` dependency
- [ ] Remove `passport-azure-ad: 4.3.5` from `libs/auth/package.json`
- [ ] Run `yarn install` to update dependencies
- [ ] Update `libs/auth/src/config/sso-config.ts` interface to replace `identityMetadata` with `issuerUrl`
- [ ] Update `getSsoConfig()` to read `SSO_ISSUER_URL` environment variable instead of `SSO_IDENTITY_METADATA`
- [ ] Remove `appendOpenIdConfigPath()` helper function from `sso-config.ts`
- [ ] Update `isSsoConfigured()` to check `issuerUrl` instead of `identityMetadata`

## Phase 2: Custom Passport Strategy Implementation

- [ ] Create `libs/auth/src/openid-connect-strategy/` directory
- [ ] Create `libs/auth/src/openid-connect-strategy/openid-connect-strategy.ts` with base strategy class
- [ ] Implement OIDC discovery using `Issuer.discover()` with caching
- [ ] Implement authorization URL generation with PKCE support
- [ ] Implement code_verifier storage in session during authorization
- [ ] Implement token exchange with authorization code
- [ ] Implement ID token validation and claims extraction
- [ ] Implement verify callback invocation with extracted profile data
- [ ] Add error handling for all OIDC flow failure scenarios

## Phase 3: Integration with Passport Configuration

- [ ] Update `libs/auth/src/config/passport-config.ts` imports to use `OpenIdConnectStrategy`
- [ ] Update strategy instantiation to use new `OpenIdConnectStrategy` class
- [ ] Update configuration mapping to use `issuerUrl` instead of `identityMetadata`
- [ ] Update configuration validation checks to use new config structure
- [ ] Verify `verifyOidcCallback()` remains unchanged

## Phase 4: Testing - Unit Tests

- [ ] Create `libs/auth/src/openid-connect-strategy/openid-connect-strategy.test.ts`
- [ ] Write tests for OIDC discovery success and failure
- [ ] Write tests for authorization URL generation
- [ ] Write tests for PKCE code_verifier generation and storage
- [ ] Write tests for token exchange success and failure
- [ ] Write tests for ID token validation
- [ ] Write tests for claims extraction and profile construction
- [ ] Write tests for error handling scenarios
- [ ] Update `libs/auth/src/config/passport-config.test.ts` to mock `OpenIdConnectStrategy`
- [ ] Update test assertions for new config structure
- [ ] Verify all existing test scenarios still pass
- [ ] Update `libs/auth/src/config/sso-config.test.ts` to test `issuerUrl` instead of `identityMetadata`

## Phase 5: Testing - Integration Tests

- [ ] Create integration test for complete SSO authentication flow
- [ ] Test session regeneration and user persistence
- [ ] Test database user creation/update with SSO provenance
- [ ] Test role-based redirects after successful authentication
- [ ] Test error handling with misconfigured SSO
- [ ] Verify CFT IDAM integration tests still pass (no regression)

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
- [ ] Verify all TypeScript types are properly exported
- [ ] Run `yarn lint:fix` to ensure code quality
- [ ] Run `yarn format` to ensure consistent formatting

## Phase 10: Deployment Preparation

- [ ] Create deployment runbook with rollback steps
- [ ] Prepare communication for deployment (if user-facing downtime expected)
- [ ] Schedule deployment window (if required)
- [ ] Verify CI/CD pipeline passes with all tests
- [ ] Create pull request with comprehensive description of changes
