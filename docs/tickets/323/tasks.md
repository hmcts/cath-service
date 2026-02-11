# Implementation Tasks - Third Party Subscription Fulfilment

## Prerequisites
- [ ] Clarify open questions in plan.md with stakeholders

## Module Setup
- [ ] Create `libs/third-party-fulfilment` directory structure
- [ ] Add `package.json` with module configuration
- [ ] Add `tsconfig.json` with proper compiler options
- [ ] Register module in root `tsconfig.json` paths as `@hmcts/third-party-fulfilment`
- [ ] Create `src/config.ts` with prismaSchemas export
- [ ] Create `src/index.ts` for business logic exports

## Database Schema
- [ ] Create `libs/third-party-fulfilment/prisma/schema.prisma`
- [ ] Define `ThirdPartySubscription` model
- [ ] Define `ThirdPartyPushLog` model
- [ ] Define `ThirdPartyConfig` model
- [ ] Register schema in `apps/postgres/src/schema-discovery.ts`
- [ ] Run `yarn db:generate` to generate Prisma client
- [ ] Create and apply migration with `yarn db:migrate:dev`

## Subscription Management
- [ ] Implement `src/subscription/queries.ts` with Prisma queries
- [ ] Write unit tests for `queries.ts`
- [ ] Implement `src/subscription/service.ts` with business logic
- [ ] Write unit tests for `service.ts`

## Push Infrastructure
- [ ] Implement `src/push/headers.ts` to build custom headers
- [ ] Write unit tests for `headers.ts`
- [ ] Implement `src/push/http-client.ts` with HTTPS client and certificate auth
- [ ] Write unit tests for `http-client.ts`
- [ ] Implement `src/push/retry.ts` with exponential backoff
- [ ] Write unit tests for `retry.ts`
- [ ] Implement `src/push/service.ts` as main orchestration layer
- [ ] Write unit tests for `service.ts`

## Certificate Management
- [ ] Implement `src/certificate/keyvault.ts` to retrieve credentials from Key Vault
- [ ] Write unit tests for `keyvault.ts` with mocked Key Vault client

## Audit Logging
- [ ] Implement `src/audit/queries.ts` for push log database operations
- [ ] Write unit tests for `queries.ts`
- [ ] Implement `src/audit/service.ts` for audit trail management
- [ ] Write unit tests for `service.ts`

## Integration Points
- [ ] Update `libs/api/src/blob-ingestion/repository/service.ts` to trigger third-party push
- [ ] Update manual upload success handler to trigger third-party push
- [ ] Add third-party push trigger to publication deletion flow (if applicable)
- [ ] Ensure all triggers use fire-and-forget pattern with error logging

## Location Metadata
- [ ] Extend location queries to include jurisdiction and region data
- [ ] Add helper function to retrieve location with all required metadata
- [ ] Write unit tests for location metadata retrieval

## Testing
- [ ] Run all unit tests: `yarn test libs/third-party-fulfilment`
- [ ] Verify test coverage >80% for business logic
- [ ] Manual testing with mock third-party endpoint
- [ ] Test retry logic with simulated failures
- [ ] Test certificate authentication with test certificate
- [ ] Verify audit logs are created correctly
- [ ] Test DELETE action sends empty body
- [ ] Test multiple subscriptions for same publication

## Documentation
- [ ] Add inline code documentation for public functions
- [ ] Document third-party credential Key Vault naming convention
- [ ] Document expected HTTP status codes from third parties
- [ ] Update main README if needed with third-party fulfilment overview
