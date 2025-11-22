# VIBE-221: Task Breakdown

## Overview

This document breaks down the implementation into specific, actionable tasks that can be tracked and completed sequentially. Each task includes clear acceptance criteria and estimated time.

---

## Phase 1: Database Schema (1.5 hours)

### Task 1.1: Create Notification Module Structure (15 min)

**Description**: Set up the basic directory structure for the notification module.

**Steps**:
1. Create `libs/notification/` directory
2. Create subdirectories: `src/{subscription,audit,notify,notification}`
3. Create `prisma/` directory for database schema

**Acceptance Criteria**:
- [ ] Directory structure matches plan
- [ ] All required directories exist

**Files Created**:
- `libs/notification/` (directory)
- `libs/notification/src/` (directory)
- `libs/notification/prisma/` (directory)

---

### Task 1.2: Create package.json and tsconfig.json (15 min)

**Description**: Configure the notification module as a workspace package.

**Steps**:
1. Create `libs/notification/package.json`
2. Create `libs/notification/tsconfig.json`
3. Add dependencies: `notifications-node-client@8.3.1`
4. Run `yarn install` from root

**Acceptance Criteria**:
- [ ] package.json has correct exports configuration
- [ ] tsconfig.json extends root config
- [ ] Dependencies installed successfully
- [ ] Module builds without errors

**Files Created**:
- `libs/notification/package.json`
- `libs/notification/tsconfig.json`

---

### Task 1.3: Define Prisma Schema (30 min)

**Description**: Create database schema for subscriptions and audit logs.

**Steps**:
1. Create `libs/notification/prisma/schema.prisma`
2. Define `Subscription` model with proper indexes
3. Define `NotificationAudit` model with proper indexes
4. Ensure all fields follow naming conventions (snake_case)

**Acceptance Criteria**:
- [ ] Schema file created with both models
- [ ] All fields use snake_case mapping
- [ ] Indexes defined for performance
- [ ] Unique constraints defined
- [ ] Schema follows HMCTS conventions

**Files Created**:
- `libs/notification/prisma/schema.prisma`

---

### Task 1.4: Register Module in Monorepo (15 min)

**Description**: Register the notification module in the monorepo configuration.

**Steps**:
1. Update `apps/postgres/src/schema-discovery.ts`
2. Update root `tsconfig.json` paths
3. Create `libs/notification/src/config.ts`

**Acceptance Criteria**:
- [ ] Module path added to root tsconfig.json
- [ ] config.ts exports prismaSchemas path
- [ ] schema-discovery.ts imports notification schemas

**Files Modified**:
- `tsconfig.json`
- `apps/postgres/src/schema-discovery.ts`

**Files Created**:
- `libs/notification/src/config.ts`

---

### Task 1.5: Run Database Migration (15 min)

**Description**: Apply the database migration to create new tables.

**Steps**:
1. Run `yarn db:migrate:dev`
2. Verify tables created in database
3. Run `yarn db:generate` to update Prisma client
4. Verify Prisma client has new models

**Acceptance Criteria**:
- [ ] Migration runs without errors
- [ ] `subscription` table exists in database
- [ ] `notification_audit` table exists in database
- [ ] Prisma client includes new models
- [ ] Can import models from @hmcts/postgres

**Commands**:
```bash
yarn db:migrate:dev
yarn db:generate
```

---

## Phase 2: GOV.UK Notify Integration (2 hours)

### Task 2.1: Create Notify Configuration (20 min)

**Description**: Set up configuration management for GOV.UK Notify credentials.

**Steps**:
1. Create `libs/notification/src/notify/notify-config.ts`
2. Implement `getNotifyConfig()` function
3. Update `apps/crons/config/default.json` with notify section
4. Add unit tests for configuration loading

**Acceptance Criteria**:
- [ ] Configuration function reads from config module
- [ ] Throws errors for missing required config
- [ ] Unit tests cover error cases
- [ ] Config file updated with notify section

**Files Created**:
- `libs/notification/src/notify/notify-config.ts`
- `libs/notification/src/notify/notify-config.test.ts`

**Files Modified**:
- `apps/crons/config/default.json`

---

### Task 2.2: Create Notify Client Wrapper (30 min)

**Description**: Implement wrapper around notifications-node-client SDK.

**Steps**:
1. Create `libs/notification/src/notify/client.ts`
2. Implement `getNotifyClient()` singleton
3. Implement `sendNotificationEmail()` function
4. Define `EmailPersonalisation` interface
5. Define `SendEmailResult` interface

**Acceptance Criteria**:
- [ ] Client initialization uses configuration
- [ ] sendNotificationEmail handles success case
- [ ] sendNotificationEmail handles error case
- [ ] Response includes GOV.UK Notify reference ID
- [ ] Errors are captured and returned

**Files Created**:
- `libs/notification/src/notify/client.ts`

---

### Task 2.3: Implement Retry Logic (40 min)

**Description**: Add exponential backoff retry logic for transient failures.

**Steps**:
1. Create `libs/notification/src/notify/retry-handler.ts`
2. Implement `withRetry()` function
3. Implement retry detection logic (429, 503, 5xx)
4. Implement exponential backoff calculation
5. Add unit tests for retry scenarios

**Acceptance Criteria**:
- [ ] Retries up to 3 times for transient errors
- [ ] Uses exponential backoff (1s, 2s, 4s)
- [ ] Stops retrying for permanent errors (4xx except 429)
- [ ] Unit tests cover all retry scenarios
- [ ] Maximum delay capped at 10 seconds

**Files Created**:
- `libs/notification/src/notify/retry-handler.ts`
- `libs/notification/src/notify/retry-handler.test.ts`

---

### Task 2.4: Add Notify Client Unit Tests (30 min)

**Description**: Write comprehensive unit tests for Notify client.

**Steps**:
1. Create `libs/notification/src/notify/client.test.ts`
2. Mock notifications-node-client
3. Test successful email sending
4. Test error handling
5. Test personalisation field passing

**Acceptance Criteria**:
- [ ] All success paths tested
- [ ] All error paths tested
- [ ] Mocks properly configured
- [ ] Tests pass with `yarn test`

**Files Created**:
- `libs/notification/src/notify/client.test.ts`

---

## Phase 3: Data Access Layer (1.5 hours)

### Task 3.1: Create Data Models (15 min)

**Description**: Define TypeScript interfaces for domain models.

**Steps**:
1. Create `libs/notification/src/subscription/model.ts`
2. Define `Subscription` interface
3. Define `SubscriptionWithEmail` interface

**Acceptance Criteria**:
- [ ] Interfaces match Prisma schema
- [ ] camelCase naming for TypeScript
- [ ] Proper date types

**Files Created**:
- `libs/notification/src/subscription/model.ts`

---

### Task 3.2: Implement Subscription Queries (30 min)

**Description**: Create database queries for subscription retrieval.

**Steps**:
1. Create `libs/notification/src/subscription/queries.ts`
2. Implement `getSubscriptionsForPublication()`
3. Include TODO comment for user table integration
4. Add proper SQL query with indexes
5. Add unit tests

**Acceptance Criteria**:
- [ ] Query returns subscriptions for location and list type
- [ ] Handles null list_type_id (all types)
- [ ] Returns distinct users (deduplication)
- [ ] Unit tests use mocked Prisma client
- [ ] TODO added for user table integration

**Files Created**:
- `libs/notification/src/subscription/queries.ts`
- `libs/notification/src/subscription/queries.test.ts`

---

### Task 3.3: Implement Audit Queries (30 min)

**Description**: Create database queries for audit logging.

**Steps**:
1. Create `libs/notification/src/audit/queries.ts`
2. Define `CreateAuditParams` interface
3. Implement `createNotificationAudit()`
4. Implement `getAuditsByArtefact()`
5. Add unit tests

**Acceptance Criteria**:
- [ ] Can create audit records with all fields
- [ ] Can query audits by artefact ID
- [ ] Unit tests cover all functions
- [ ] Proper error handling

**Files Created**:
- `libs/notification/src/audit/queries.ts`
- `libs/notification/src/audit/queries.test.ts`

---

### Task 3.4: Add Data Layer Tests (15 min)

**Description**: Ensure all data access functions have test coverage.

**Steps**:
1. Review test coverage for subscription queries
2. Review test coverage for audit queries
3. Add missing test cases
4. Run `yarn test:coverage`

**Acceptance Criteria**:
- [ ] Test coverage >80% for queries
- [ ] All error cases tested
- [ ] All success cases tested

---

## Phase 4: Notification Service (2 hours)

### Task 4.1: Create Personalisation Builder (30 min)

**Description**: Build email personalisation data from domain models.

**Steps**:
1. Create `libs/notification/src/notification/personalisation-builder.ts`
2. Implement `buildEmailPersonalisation()`
3. Implement date formatting with ordinal suffixes
4. Add unit tests for all date formats

**Acceptance Criteria**:
- [ ] Converts artefact data to email personalisation
- [ ] Date formatted correctly (e.g., "25th September 2025")
- [ ] All personalisation fields populated
- [ ] Unit tests cover edge cases (1st, 2nd, 3rd, 11th, etc.)

**Files Created**:
- `libs/notification/src/notification/personalisation-builder.ts`
- `libs/notification/src/notification/personalisation-builder.test.ts`

---

### Task 4.2: Implement Main Notification Service (60 min)

**Description**: Create the core service that orchestrates notification sending.

**Steps**:
1. Create `libs/notification/src/notification/service.ts`
2. Implement `sendPublicationNotifications()`
3. Coordinate: fetch artefact, location, list type
4. Coordinate: get subscriptions
5. Coordinate: build personalisation
6. Coordinate: send emails and create audits
7. Implement result aggregation
8. Implement email masking for logs

**Acceptance Criteria**:
- [ ] Function returns detailed results
- [ ] All subscriptions processed
- [ ] Audit records created for each attempt
- [ ] Errors captured but don't stop processing
- [ ] Email addresses masked in error logs

**Files Created**:
- `libs/notification/src/notification/service.ts`

---

### Task 4.3: Add Notification Service Tests (30 min)

**Description**: Write unit tests for notification service.

**Steps**:
1. Create `libs/notification/src/notification/service.test.ts`
2. Mock all dependencies
3. Test successful notification flow
4. Test error handling
5. Test partial failures (some succeed, some fail)
6. Test audit logging

**Acceptance Criteria**:
- [ ] All code paths tested
- [ ] Mocks properly configured
- [ ] Edge cases covered
- [ ] Tests pass

**Files Created**:
- `libs/notification/src/notification/service.test.ts`

---

### Task 4.4: Create Module Exports (10 min)

**Description**: Define public API for notification module.

**Steps**:
1. Create `libs/notification/src/index.ts`
2. Export main service function
3. Export query functions
4. Export type definitions
5. Verify exports work from external modules

**Acceptance Criteria**:
- [ ] index.ts exports all public functions
- [ ] Types exported for external use
- [ ] Can import from @hmcts/notification
- [ ] No internal implementation details exposed

**Files Created**:
- `libs/notification/src/index.ts`

---

## Phase 5: Event Trigger (1.5 hours)

### Task 5.1: Create Cron Job Script (30 min)

**Description**: Implement the cron job entry point.

**Steps**:
1. Create `apps/crons/src/send-publication-notifications.ts`
2. Read environment variables (ARTEFACT_ID, LOCATION_ID, LIST_TYPE_ID)
3. Call notification service
4. Log results
5. Handle errors
6. Export as default function

**Acceptance Criteria**:
- [ ] Reads required environment variables
- [ ] Throws error if variables missing
- [ ] Calls sendPublicationNotifications with correct params
- [ ] Logs comprehensive information
- [ ] Errors properly propagated

**Files Created**:
- `apps/crons/src/send-publication-notifications.ts`

---

### Task 5.2: Add Cron Dependencies (10 min)

**Description**: Update cron app to depend on notification module.

**Steps**:
1. Update `apps/crons/package.json`
2. Add `@hmcts/notification` dependency
3. Run `yarn install`

**Acceptance Criteria**:
- [ ] Dependency added to package.json
- [ ] Install completes successfully
- [ ] Can import from @hmcts/notification in cron app

**Files Modified**:
- `apps/crons/package.json`

---

### Task 5.3: Create Kubernetes CronJob Configuration (30 min)

**Description**: Define Kubernetes CronJob for scheduled execution.

**Steps**:
1. Create `apps/crons/helm/templates/send-publication-notifications-cronjob.yaml`
2. Configure schedule (every 5 minutes)
3. Add environment variables
4. Configure secret mounts for API key
5. Add resource limits

**Acceptance Criteria**:
- [ ] CronJob runs every 5 minutes
- [ ] Environment variables configured
- [ ] Secrets properly mounted
- [ ] Restart policy set to Never
- [ ] Job history limits configured

**Files Created**:
- `apps/crons/helm/templates/send-publication-notifications-cronjob.yaml`

---

### Task 5.4: Add Cron Job Tests (20 min)

**Description**: Write unit tests for cron job script.

**Steps**:
1. Create `apps/crons/src/send-publication-notifications.test.ts`
2. Mock notification service
3. Test with valid environment variables
4. Test with missing environment variables
5. Test error handling

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] Environment variable validation tested
- [ ] Error cases covered

**Files Created**:
- `apps/crons/src/send-publication-notifications.test.ts`

---

## Phase 6: Integration & Testing (2 hours)

### Task 6.1: End-to-End Integration Test (45 min)

**Description**: Create integration test for complete workflow.

**Steps**:
1. Create `libs/notification/src/notification/integration.test.ts`
2. Set up test database with subscriptions
3. Create test artefact
4. Run notification service
5. Verify audit records created
6. Clean up test data

**Acceptance Criteria**:
- [ ] Test creates real database records
- [ ] Notification service runs end-to-end
- [ ] Audit records verified
- [ ] Test cleanup successful
- [ ] Test passes in CI environment

**Files Created**:
- `libs/notification/src/notification/integration.test.ts`

---

### Task 6.2: Create Test Data Seeds (30 min)

**Description**: Create scripts to populate test subscriptions.

**Steps**:
1. Create `libs/notification/prisma/seeds/test-subscriptions.ts`
2. Define test subscription data
3. Implement seed function
4. Test seed script execution

**Acceptance Criteria**:
- [ ] Seed script creates subscriptions
- [ ] Script is idempotent (can run multiple times)
- [ ] Test data is realistic
- [ ] Documented in comments

**Files Created**:
- `libs/notification/prisma/seeds/test-subscriptions.ts`

---

### Task 6.3: Manual Testing (45 min)

**Description**: Perform manual testing of complete workflow.

**Test Scenarios**:

1. **Happy Path**:
   - [ ] Create test subscription in database
   - [ ] Set environment variables
   - [ ] Run cron job manually
   - [ ] Verify email sent (check GOV.UK Notify dashboard)
   - [ ] Verify audit record created

2. **Error Handling**:
   - [ ] Test with invalid email address
   - [ ] Test with missing artefact
   - [ ] Test with missing location
   - [ ] Verify errors logged appropriately

3. **Deduplication**:
   - [ ] Create multiple subscriptions for same user
   - [ ] Verify only one email sent
   - [ ] Verify multiple audits created

4. **No Subscriptions**:
   - [ ] Run with location that has no subscriptions
   - [ ] Verify graceful handling

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] Emails received in test inbox
- [ ] Audit logs accurate
- [ ] No unexpected errors

---

## Phase 7: Documentation (1 hour)

### Task 7.1: Create GOV.UK Notify Template Guide (20 min)

**Description**: Document how to set up the email template in GOV.UK Notify.

**Steps**:
1. Create `docs/VIBE-221/notify-template-setup.md`
2. Include step-by-step instructions
3. Include template body from mockups
4. List all personalisation fields
5. Include subject line format

**Acceptance Criteria**:
- [ ] Complete template body included
- [ ] All personalisation fields documented
- [ ] Instructions clear and actionable
- [ ] Subject line format specified

**Files Created**:
- `docs/VIBE-221/notify-template-setup.md`

---

### Task 7.2: Create Deployment Guide (20 min)

**Description**: Document deployment process and configuration.

**Steps**:
1. Create `docs/VIBE-221/deployment.md`
2. List prerequisites
3. Document configuration steps
4. Include Azure Key Vault setup
5. Include Kubernetes deployment steps
6. Add verification steps

**Acceptance Criteria**:
- [ ] All deployment steps documented
- [ ] Configuration examples included
- [ ] Troubleshooting section added
- [ ] Rollback procedure documented

**Files Created**:
- `docs/VIBE-221/deployment.md`

---

### Task 7.3: Update README and Add Code Comments (20 min)

**Description**: Update project documentation and ensure code is well-commented.

**Steps**:
1. Update main `README.md` with notification feature
2. Review all source files for comment quality
3. Add JSDoc comments to public functions
4. Add inline comments for complex logic
5. Ensure all TODOs are tracked

**Acceptance Criteria**:
- [ ] README mentions notification feature
- [ ] All public functions have JSDoc
- [ ] Complex logic explained
- [ ] No unexplained TODOs

**Files Modified**:
- `README.md`
- Various source files (add comments)

---

## Phase 8: Configuration & Deployment Prep (30 min)

### Task 8.1: Configure Azure Key Vault (15 min)

**Description**: Set up secure storage for GOV.UK Notify API key.

**Steps**:
1. Create secret in Azure Key Vault: `notify-api-key`
2. Grant access to cron app service principal
3. Update Helm values to reference secret
4. Test secret retrieval in dev environment

**Acceptance Criteria**:
- [ ] Secret created in Key Vault
- [ ] Access granted to application
- [ ] Helm chart references secret correctly
- [ ] Secret can be retrieved at runtime

---

### Task 8.2: Configure GOV.UK Notify Template (15 min)

**Description**: Create the email template in GOV.UK Notify dashboard.

**Steps**:
1. Log in to GOV.UK Notify
2. Create new email template
3. Add template name and subject
4. Add template body from mockups
5. Configure personalisation fields
6. Copy template ID
7. Add template ID to configuration

**Acceptance Criteria**:
- [ ] Template created in GOV.UK Notify
- [ ] All personalisation fields configured
- [ ] Template ID added to config
- [ ] Test email sent successfully

---

## Acceptance Testing

### Final Verification Checklist

Before marking the ticket complete, verify:

**Functionality**:
- [ ] Notifications sent when hearing lists published
- [ ] All subscribed users receive emails
- [ ] Email content matches mockups
- [ ] Data protection notices visible
- [ ] Links work correctly

**Technical**:
- [ ] All unit tests pass (`yarn test`)
- [ ] All integration tests pass
- [ ] No TypeScript errors (`yarn build`)
- [ ] Code passes linting (`yarn lint`)
- [ ] Test coverage >80%

**Database**:
- [ ] Subscription table created
- [ ] NotificationAudit table created
- [ ] Indexes properly configured
- [ ] Migration reversible

**Configuration**:
- [ ] API key in Azure Key Vault
- [ ] Template ID in configuration
- [ ] Environment variables documented
- [ ] Secrets not in code

**Documentation**:
- [ ] Specification complete
- [ ] Plan complete
- [ ] Tasks complete
- [ ] Deployment guide complete
- [ ] Template setup guide complete

**Operations**:
- [ ] CronJob deployed
- [ ] Monitoring configured
- [ ] Logs accessible
- [ ] Alerts configured
- [ ] Runbook created

**Security**:
- [ ] API key secured
- [ ] Email addresses masked in logs
- [ ] Data protection notices included
- [ ] Security review passed

---

## Dependencies Tracking

### Blockers

These must be resolved before starting:
- [ ] GOV.UK Notify account access
- [ ] Azure Key Vault access
- [ ] Database migration permissions

### External Dependencies

These are needed by other teams/systems:
- **User Table**: Need to confirm structure and email field location
  - **Status**: TODO - needs investigation
  - **Blocker For**: Task 3.2 (Subscription Queries)

- **Subscription Management UI** (VIBE-220):
  - **Status**: Not started
  - **Note**: Users need a way to create subscriptions

### Internal Dependencies

These tasks depend on earlier tasks:
- Task 1.5 depends on Task 1.3 (schema before migration)
- Task 3.2 depends on Task 1.5 (migration before queries)
- Task 4.2 depends on Tasks 3.2, 3.3, 4.1 (all dependencies ready)
- Task 5.1 depends on Task 4.2 (service before trigger)
- Task 6.1 depends on all Phase 1-5 tasks (complete implementation)

---

## Progress Tracking

Use this section to track progress:

**Phase 1: Database Schema**
- [ ] Task 1.1: Create module structure
- [ ] Task 1.2: Configure package
- [ ] Task 1.3: Define schema
- [ ] Task 1.4: Register module
- [ ] Task 1.5: Run migration

**Phase 2: GOV.UK Notify Integration**
- [ ] Task 2.1: Configuration
- [ ] Task 2.2: Client wrapper
- [ ] Task 2.3: Retry logic
- [ ] Task 2.4: Unit tests

**Phase 3: Data Access Layer**
- [ ] Task 3.1: Data models
- [ ] Task 3.2: Subscription queries
- [ ] Task 3.3: Audit queries
- [ ] Task 3.4: Tests

**Phase 4: Notification Service**
- [ ] Task 4.1: Personalisation builder
- [ ] Task 4.2: Main service
- [ ] Task 4.3: Unit tests
- [ ] Task 4.4: Module exports

**Phase 5: Event Trigger**
- [ ] Task 5.1: Cron script
- [ ] Task 5.2: Dependencies
- [ ] Task 5.3: Kubernetes config
- [ ] Task 5.4: Tests

**Phase 6: Integration & Testing**
- [ ] Task 6.1: Integration test
- [ ] Task 6.2: Test data seeds
- [ ] Task 6.3: Manual testing

**Phase 7: Documentation**
- [ ] Task 7.1: Template guide
- [ ] Task 7.2: Deployment guide
- [ ] Task 7.3: README and comments

**Phase 8: Configuration & Deployment**
- [ ] Task 8.1: Azure Key Vault
- [ ] Task 8.2: GOV.UK Notify template

---

## Notes and Issues

Use this section to track issues encountered during implementation:

**Issue Log**:
- [Date] [Issue description] - [Resolution]

**Open Questions**:
- User table structure - needs clarification
- Welsh language support - separate template or conditional content?
- Notification frequency limits - per-user throttling needed?

**Risks**:
- GOV.UK Notify rate limits - monitor closely
- User table structure unknown - may need schema adjustments

---

## Definition of Done

This ticket is complete when:

1. All tasks marked as complete
2. All tests passing
3. Code merged to main branch
4. Deployed to dev environment
5. Manual testing successful
6. Documentation complete
7. Security review passed
8. Product owner approval received
