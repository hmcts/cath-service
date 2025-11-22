# VIBE-221: Implementation Tasks

## Phase 1: Database Schema & Migrations

### Task 1.1: Add Subscription Model to Prisma Schema
**File:** `apps/postgres/prisma/schema.prisma`
- [ ] Add `Subscription` model with fields:
  - `subscriptionId` (UUID, primary key, @default(uuid()))
  - `userId` (String, @map("user_id"))
  - `locationId` (String, @map("location_id"))
  - `dateAdded` (DateTime, @default(now()), @map("date_added"))
- [ ] Add relation to Notification model
- [ ] Add table mapping: `@@map("subscription")`

### Task 1.2: Add Notification Model to Prisma Schema
**File:** `apps/postgres/prisma/schema.prisma`
- [ ] Add `Notification` model with fields:
  - `notificationId` (UUID, primary key, @default(uuid()))
  - `subscriptionId` (UUID, @map("subscription_id"))
  - `userId` (String, @map("user_id"))
  - `artefactId` (UUID, @map("artefact_id"))
  - `status` (String)
  - `errorMessage` (String?, @map("error_message"))
  - `createdAt` (DateTime, @default(now()), @map("created_at"))
  - `sentAt` (DateTime?, @map("sent_at"))
- [ ] Add unique constraint: `@@unique([artefactId, userId])`
- [ ] Add indexes: `@@index([artefactId])`, `@@index([userId])`
- [ ] Add relation to Subscription model
- [ ] Add table mapping: `@@map("notification")`

### Task 1.3: Generate and Apply Migration
**Commands:**
- [ ] Run `yarn db:migrate:dev` to create migration
- [ ] Verify migration file created in `apps/postgres/prisma/migrations/`
- [ ] Run `yarn db:generate` to generate Prisma client
- [ ] Verify TypeScript types generated correctly

### Task 1.4: Manual Testing of Schema
- [ ] Start database: `yarn dev:up`
- [ ] Open Prisma Studio: `yarn db:studio`
- [ ] Verify `subscription` table exists
- [ ] Verify `notification` table exists
- [ ] Verify unique constraint on `notification(artefact_id, user_id)`
- [ ] Create test subscription record manually
- [ ] Create test notification record manually
- [ ] Verify constraint prevents duplicate notification

---

## Phase 2: Notification Module Setup

### Task 2.1: Create Module Directory Structure
**Commands:**
- [ ] Create directory: `libs/notification/src/`
- [ ] Create directory: `libs/notification/src/notification/`
- [ ] Create directory: `libs/notification/src/govnotify/`

### Task 2.2: Create package.json
**File:** `libs/notification/package.json`
- [ ] Set `name` to `"@hmcts/notification"`
- [ ] Set `version` to `"1.0.0"`
- [ ] Set `type` to `"module"`
- [ ] Add exports configuration (production and default)
- [ ] Add scripts: build, dev, test, test:watch, format, lint, lint:fix
- [ ] Add dependencies:
  - `"@hmcts/postgres": "workspace:*"`
  - `"@hmcts/location": "workspace:*"`
  - `"notifications-node-client": "8.0.0"`
- [ ] Add peerDependencies: `"express": "^5.1.0"`

### Task 2.3: Create tsconfig.json
**File:** `libs/notification/tsconfig.json`
- [ ] Extend `"../../tsconfig.json"`
- [ ] Set `outDir` to `"./dist"`
- [ ] Set `rootDir` to `"./src"`
- [ ] Enable `declaration` and `declarationMap`
- [ ] Include `["src/**/*"]`
- [ ] Exclude test files and dist

### Task 2.4: Create index.ts
**File:** `libs/notification/src/index.ts`
- [ ] Export `sendPublicationNotifications` from notification-service
- [ ] Export types: `NotificationResult`

### Task 2.5: Register Module in Root tsconfig
**File:** `tsconfig.json` (root)
- [ ] Add `"@hmcts/notification": ["libs/notification/src"]` to paths

### Task 2.6: Install Dependencies
**Commands:**
- [ ] Add `notifications-node-client` to root package.json dependencies
- [ ] Run `yarn install` to install dependencies
- [ ] Verify package installed: `yarn why notifications-node-client`

### Task 2.7: Verify Module Builds
**Commands:**
- [ ] Run `yarn workspace @hmcts/notification run build`
- [ ] Verify `dist/` directory created
- [ ] Verify no TypeScript errors

---

## Phase 3: Gov.Notify Client Integration

### Task 3.1: Create Gov.Notify Client
**File:** `libs/notification/src/govnotify/govnotify-client.ts`
- [ ] Import `NotifyClient` from `notifications-node-client`
- [ ] Create `createGovNotifyClient()` function to initialize client with API key
- [ ] Create `sendEmail()` function with signature:
  ```typescript
  async function sendEmail(params: EmailParams): Promise<SendResult>
  ```
- [ ] Implement single retry logic on network failures
- [ ] Add error handling for 4xx (no retry) and 5xx (retry once)
- [ ] Add logging for sends, retries, failures
- [ ] Define interfaces: `EmailParams`, `SendResult`

### Task 3.2: Add Configuration Validation
**File:** `libs/notification/src/govnotify/govnotify-client.ts`
- [ ] Validate `GOV_NOTIFY_API_KEY` environment variable
- [ ] Validate `GOV_NOTIFY_TEMPLATE_ID` environment variable
- [ ] Validate `CATH_SERVICE_URL` environment variable
- [ ] Throw clear error if variables missing
- [ ] Add configuration getter functions

### Task 3.3: Create Unit Tests
**File:** `libs/notification/src/govnotify/govnotify-client.test.ts`
- [ ] Mock `NotifyClient` using Vitest
- [ ] Test successful email send
- [ ] Test network failure with successful retry
- [ ] Test persistent failure (retry exhausted)
- [ ] Test 4xx error (no retry)
- [ ] Test missing configuration
- [ ] Verify logging calls
- [ ] Target: 100% coverage for this module

### Task 3.4: Manual Testing with Gov.Notify
- [ ] Obtain test API key from Gov.Notify (or use test mode)
- [ ] Create test template in Gov.Notify console
- [ ] Set environment variables
- [ ] Write manual test script to send test email
- [ ] Verify email received
- [ ] Verify Gov.Notify dashboard shows send

---

## Phase 4: Database Queries

### Task 4.1: Create Notification Queries
**File:** `libs/notification/src/notification/notification-queries.ts`
- [ ] Import `prisma` from `@hmcts/postgres`
- [ ] Implement `getActiveSubscriptionsByLocation(locationId: string)`
  - Query `subscription` table where `locationId` matches
  - Return array of subscriptions
- [ ] Implement `createNotificationRecord(data: CreateNotificationData)`
  - Insert into `notification` table
  - Handle unique constraint violations gracefully
  - Return notificationId or null if duplicate
- [ ] Implement `updateNotificationStatus(notificationId, status, sentAt?, errorMessage?)`
  - Update notification record with status and timestamps
- [ ] Define interfaces at bottom of file

### Task 4.2: Create Unit Tests
**File:** `libs/notification/src/notification/notification-queries.test.ts`
- [ ] Mock Prisma client using Vitest
- [ ] Test `getActiveSubscriptionsByLocation()` returns subscriptions
- [ ] Test `getActiveSubscriptionsByLocation()` returns empty array
- [ ] Test `createNotificationRecord()` creates record
- [ ] Test `createNotificationRecord()` handles duplicate constraint
- [ ] Test `updateNotificationStatus()` updates record
- [ ] Target: 100% coverage

### Task 4.3: Integration Testing with Database
- [ ] Write integration test using real database (test DB)
- [ ] Create test subscription
- [ ] Query subscriptions by location
- [ ] Create notification record
- [ ] Verify duplicate constraint works
- [ ] Update notification status
- [ ] Verify all operations work end-to-end
- [ ] Clean up test data

---

## Phase 5: Email Validation

### Task 5.1: Create Email Validation Function
**File:** `libs/notification/src/notification/email-validation.ts`
- [ ] Implement RFC2822 email regex pattern
- [ ] Create `validateEmail(email: string): boolean` function
- [ ] Handle empty/null inputs
- [ ] Handle edge cases (special characters, multiple @, etc.)

### Task 5.2: Create Unit Tests
**File:** `libs/notification/src/notification/email-validation.test.ts`
- [ ] Test valid email addresses (various formats)
- [ ] Test invalid email addresses (various patterns)
- [ ] Test edge cases: empty string, null, undefined
- [ ] Test special characters
- [ ] Test extremely long emails
- [ ] Target: 100% coverage

---

## Phase 6: Notification Service Core Logic

### Task 6.1: Create Notification Service
**File:** `libs/notification/src/notification/notification-service.ts`
- [ ] Import dependencies: queries, gov notify client, email validation, location
- [ ] Create `sendPublicationNotifications()` main function with signature:
  ```typescript
  async function sendPublicationNotifications(params: NotificationParams): Promise<NotificationResult>
  ```
- [ ] Define `NotificationParams` interface with: artefactId, locationId, listTypeName, contentDate
- [ ] Define `NotificationResult` interface with: totalSubscriptions, sent, failed, skipped, errors

### Task 6.2: Implement Business Logic
**File:** `libs/notification/src/notification/notification-service.ts`
- [ ] Step 1: Retrieve active subscriptions by locationId
- [ ] Step 2: If no subscriptions, return early with zero counts
- [ ] Step 3: Get location name from location service
- [ ] Step 4: Format content date for email template
- [ ] Step 5: Loop through each subscription:
  - [ ] Validate email address (if available, else skip)
  - [ ] Create notification record (handle duplicate)
  - [ ] If duplicate, skip and log
  - [ ] Prepare email parameters (location_name, hearing_list_name, publication_date, manage_link)
  - [ ] Send email via Gov.Notify client
  - [ ] If success, update notification status to "sent"
  - [ ] If failure, update status to "failed" with error
  - [ ] Catch errors, log, and continue to next subscription
- [ ] Step 6: Return summary result with counts

### Task 6.3: Add Logging
**File:** `libs/notification/src/notification/notification-service.ts`
- [ ] Log INFO: Start of notification processing with artefactId, locationId
- [ ] Log INFO: Subscription count retrieved
- [ ] Log INFO: Each successful email send
- [ ] Log WARN: Skipped notifications (invalid email, duplicate)
- [ ] Log ERROR: Failed notifications after retry
- [ ] Log INFO: Summary result

### Task 6.4: Create Unit Tests
**File:** `libs/notification/src/notification/notification-service.test.ts`
- [ ] Mock all dependencies (queries, gov notify, location, validation)
- [ ] Test happy path: subscriptions exist, all emails sent
- [ ] Test no subscriptions: return zeros
- [ ] Test invalid emails: skip and count
- [ ] Test Gov.Notify failures: count as failed
- [ ] Test duplicates: skip and count
- [ ] Test partial failure: some succeed, some fail
- [ ] Test database errors: handle gracefully
- [ ] Verify logging calls
- [ ] Target: >90% coverage

### Task 6.5: Integration Testing
**File:** `libs/notification/src/notification/notification-service.test.ts` (integration section)
- [ ] Test full flow with real database (test DB)
- [ ] Create test subscriptions
- [ ] Mock Gov.Notify client
- [ ] Call `sendPublicationNotifications()`
- [ ] Verify notifications created in database
- [ ] Verify email sends called
- [ ] Verify counts accurate
- [ ] Clean up test data

---

## Phase 7: Integration with Publication Flow

### Task 7.1: Add Dependency to Admin Pages
**File:** `libs/admin-pages/package.json`
- [ ] Add `"@hmcts/notification": "workspace:*"` to dependencies

### Task 7.2: Modify Manual Upload Summary Handler
**File:** `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
- [ ] Import `sendPublicationNotifications` from `@hmcts/notification`
- [ ] After line 104 (after `createArtefact()` succeeds), add notification call
- [ ] Wrap in try-catch to prevent blocking
- [ ] Pass parameters: artefactId, locationId, listTypeName, contentDate
- [ ] Log result (INFO level)
- [ ] Log errors (ERROR level) but continue
- [ ] Ensure publication flow continues regardless

### Task 7.3: Update Unit Tests
**File:** `libs/admin-pages/src/pages/manual-upload-summary/index.test.ts`
- [ ] Mock `sendPublicationNotifications` using Vitest
- [ ] Verify it's called with correct parameters
- [ ] Test notification success: publication succeeds
- [ ] Test notification failure: publication still succeeds
- [ ] Verify error logged but doesn't throw

### Task 7.4: Build and Verify
**Commands:**
- [ ] Run `yarn workspace @hmcts/admin-pages run build`
- [ ] Verify no TypeScript errors
- [ ] Verify tests pass: `yarn workspace @hmcts/admin-pages run test`

---

## Phase 8: Environment Configuration

### Task 8.1: Document Environment Variables
**File:** `.env.example`
- [ ] Add section: "# Gov.Notify Configuration"
- [ ] Add `GOV_NOTIFY_API_KEY=your-api-key-here`
- [ ] Add `GOV_NOTIFY_TEMPLATE_ID=your-template-id-here`
- [ ] Add `CATH_SERVICE_URL=https://www.court-tribunal-hearings.service.gov.uk`
- [ ] Add comments explaining each variable

### Task 8.2: Create Gov.Notify Template
**Manual Task (Gov.Notify Console):**
- [ ] Log into Gov.Notify console
- [ ] Create new email template
- [ ] Set subject: "New hearing list published for ((location_name))"
- [ ] Add body with three sections (see specification.md)
- [ ] Add template variables: location_name, hearing_list_name, publication_date, manage_link
- [ ] Save template and copy Template ID
- [ ] Add Template ID to environment configuration

### Task 8.3: Set Environment Variables Locally
**Local .env file:**
- [ ] Create `.env` file (if not exists)
- [ ] Add `GOV_NOTIFY_API_KEY` with test key
- [ ] Add `GOV_NOTIFY_TEMPLATE_ID` with template ID from console
- [ ] Add `CATH_SERVICE_URL` with local or production URL
- [ ] Verify variables loaded: restart dev server and check logs

### Task 8.4: Update Deployment Documentation
**File:** Create `libs/notification/README.md`
- [ ] Document required environment variables
- [ ] Document Gov.Notify setup process
- [ ] Document template creation steps
- [ ] Add troubleshooting section

---

## Phase 9: Testing & Quality Assurance

### Task 9.1: Run All Unit Tests
**Commands:**
- [ ] Run `yarn test` from root
- [ ] Verify all tests pass
- [ ] Run `yarn test:coverage` to check coverage
- [ ] Verify >80% coverage overall
- [ ] Fix any failing tests

### Task 9.2: Create Test Subscriptions
**Manual Task (Database):**
- [ ] Open Prisma Studio: `yarn db:studio`
- [ ] Create test subscriptions for various locations
- [ ] Include valid and invalid email addresses
- [ ] Create duplicate subscriptions for same location
- [ ] Note subscription IDs for testing

### Task 9.3: Manual End-to-End Testing
**Manual Test Steps:**
- [ ] Start dev environment: `yarn dev`
- [ ] Log in as admin user
- [ ] Navigate to manual upload page
- [ ] Upload test hearing list for location with subscriptions
- [ ] Complete upload flow
- [ ] Verify publication succeeds
- [ ] Check logs for notification processing
- [ ] Check email inbox for received notifications
- [ ] Open Prisma Studio and verify notification records created
- [ ] Verify notification status is "sent"

### Task 9.4: Test Error Scenarios
**Manual Test Steps:**
- [ ] Test with invalid email: Verify skipped, logged
- [ ] Test with no subscriptions: Verify no emails sent
- [ ] Test duplicate publication: Verify deduplication works
- [ ] Test with Gov.Notify API error (mock): Verify retry and failure handling
- [ ] Test with missing environment variables: Verify graceful failure

### Task 9.5: Verify Email Content
**Manual Test:**
- [ ] Inspect received test email
- [ ] Verify GOV.UK branding present
- [ ] Verify all three sections present
- [ ] Verify dynamic content correct (location name, list type, date)
- [ ] Verify manage link correct
- [ ] Verify accessibility (text-only version)

### Task 9.6: Performance Testing
**Manual Test:**
- [ ] Create 20 test subscriptions for same location
- [ ] Publish hearing list
- [ ] Measure time to process all notifications
- [ ] Verify <5 seconds total processing time
- [ ] Check for any performance issues

---

## Phase 10: Documentation

### Task 10.1: Create Module Documentation
**File:** `libs/notification/README.md`
- [ ] Add overview section
- [ ] Document API: `sendPublicationNotifications()`
- [ ] Document return type: `NotificationResult`
- [ ] Add usage example
- [ ] Document configuration requirements
- [ ] Add troubleshooting guide
- [ ] Document database schema
- [ ] Add Gov.Notify setup instructions

### Task 10.2: Update Architecture Documentation
**File:** Project architecture docs (if exists)
- [ ] Add notification module to architecture diagram
- [ ] Document integration with publication flow
- [ ] Document Gov.Notify integration

### Task 10.3: Create Runbook
**File:** `libs/notification/RUNBOOK.md`
- [ ] Document how to monitor notification system
- [ ] Document common error scenarios and fixes
- [ ] Document how to query audit logs
- [ ] Document how to manually retry failed notifications
- [ ] Add Gov.Notify rate limits and troubleshooting

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing
- [ ] Test coverage >80%
- [ ] No TypeScript errors
- [ ] Biome linting passing: `yarn lint`
- [ ] Code formatted: `yarn format`

### Functionality
- [ ] Manual end-to-end test completed successfully
- [ ] Email notifications received correctly
- [ ] Audit log accurate
- [ ] Error handling verified
- [ ] Deduplication working

### Configuration
- [ ] Gov.Notify template created in console
- [ ] Template ID documented
- [ ] Environment variables documented
- [ ] API key obtained (production key for prod)

### Documentation
- [ ] Module README complete
- [ ] API documentation complete
- [ ] Runbook complete
- [ ] Environment variables documented

### Security
- [ ] API key stored securely (environment variables)
- [ ] No secrets in code
- [ ] Email validation implemented
- [ ] Input sanitization verified
- [ ] Security review completed (if required)

### Database
- [ ] Migrations applied: `yarn db:migrate`
- [ ] Prisma client generated: `yarn db:generate`
- [ ] Schema verified in database
- [ ] Indexes created correctly
- [ ] Constraints working

---

## Deployment Tasks

### Task D.1: Apply Database Migration (Staging)
**Commands:**
- [ ] Connect to staging database
- [ ] Run `yarn db:migrate` on staging
- [ ] Verify migration applied successfully
- [ ] Verify tables created: `subscription`, `notification`
- [ ] Verify constraints and indexes

### Task D.2: Set Environment Variables (Staging)
**Configuration:**
- [ ] Set `GOV_NOTIFY_API_KEY` (staging key)
- [ ] Set `GOV_NOTIFY_TEMPLATE_ID`
- [ ] Set `CATH_SERVICE_URL` (staging URL)
- [ ] Restart application
- [ ] Verify configuration loaded

### Task D.3: Deploy to Staging
**Commands:**
- [ ] Build all modules: `yarn build`
- [ ] Deploy to staging environment
- [ ] Run health checks
- [ ] Verify application starts successfully
- [ ] Check logs for startup errors

### Task D.4: Smoke Testing (Staging)
**Manual Tests:**
- [ ] Create test subscription in staging database
- [ ] Perform manual upload
- [ ] Verify notification sent
- [ ] Check email received
- [ ] Verify audit log entry
- [ ] Test error scenarios

### Task D.5: Production Deployment
**Tasks:**
- [ ] Apply database migration to production
- [ ] Set production environment variables (production API key)
- [ ] Deploy to production
- [ ] Run health checks
- [ ] Monitor logs for 1 hour
- [ ] Perform smoke test with real publication

### Task D.6: Post-Deployment Monitoring
**Monitoring:**
- [ ] Monitor error logs for 24 hours
- [ ] Check notification success rate
- [ ] Verify Gov.Notify delivery status
- [ ] Monitor database for issues
- [ ] Check application performance

---

## Post-Deployment Tasks

### Task P.1: Create Monitoring Dashboard
- [ ] Set up metrics tracking (if available)
- [ ] Create alerts for high failure rates
- [ ] Create alerts for Gov.Notify errors
- [ ] Document monitoring process

### Task P.2: User Communication
- [ ] Notify stakeholders of successful deployment
- [ ] Document any known limitations
- [ ] Provide support contact information

### Task P.3: Technical Debt Review
- [ ] Identify areas for optimization
- [ ] Document future enhancements (async queue, batch sending)
- [ ] Create follow-up tickets if needed

---

## Known Limitations & Future Enhancements

### Current Limitations
- Synchronous processing (may slow down publication for high subscription counts)
- Single retry only (could be more robust)
- No batch sending (one API call per email)
- English-only template (no Welsh support in MVP)
- No subscription management UI (manual database edits required)

### Future Enhancements
- [ ] Async queue processing (Redis + Bull) for better scalability
- [ ] Batch email sending via Gov.Notify bulk API
- [ ] Bilingual email templates (EN/CY)
- [ ] Subscription management UI for users
- [ ] Email preference settings (daily digest vs immediate)
- [ ] Webhook/API endpoint notifications for third-party systems
- [ ] Advanced retry logic with exponential backoff
- [ ] Notification history page for users
- [ ] Admin dashboard for monitoring notifications

---

## Open Questions & Blockers

### Questions Requiring Answers
1. **Gov.Notify Template:** Who will create the template in the Gov.Notify console?
2. **API Keys:** Who provides production API key and staging API key?
3. **User Model:** Where is user email address stored? Need to integrate with user service
4. **Bilingual Requirement:** Is Welsh language template required for MVP or can it wait?
5. **Service URL:** Confirm production URL for email links
6. **Subscription UI:** When will subscription management UI be built? Need manual testing workaround

### Potential Blockers
- Access to Gov.Notify console required
- Production API key required before production deployment
- User email address field may not exist yet (needs investigation)
- If subscription UI doesn't exist, need way to create test subscriptions

---

## Success Criteria

Implementation is considered complete and successful when:

### Technical Success
- [ ] All unit tests pass with >80% coverage
- [ ] Integration tests pass
- [ ] No TypeScript errors
- [ ] Code quality checks pass (lint, format)
- [ ] Database migrations applied successfully

### Functional Success
- [ ] Email notifications sent successfully on publication
- [ ] Audit log captures all notification attempts accurately
- [ ] Deduplication prevents duplicate notifications
- [ ] Error handling prevents publication blocking
- [ ] Email content matches specification
- [ ] Gov.Notify integration working correctly

### Quality Success
- [ ] Code review completed and approved
- [ ] Security review completed (if required)
- [ ] Documentation complete and accurate
- [ ] Manual testing completed successfully
- [ ] All test scenarios pass

### Deployment Success
- [ ] Deployed to staging without issues
- [ ] Smoke tests pass in staging
- [ ] Deployed to production without issues
- [ ] Post-deployment monitoring shows no errors
- [ ] Stakeholders notified and satisfied

---

## Estimated Effort

### Development Phases
- **Phase 1** (Database): 2-3 hours
- **Phase 2** (Module Setup): 1-2 hours
- **Phase 3** (Gov.Notify Client): 3-4 hours
- **Phase 4** (Database Queries): 2-3 hours
- **Phase 5** (Email Validation): 1-2 hours
- **Phase 6** (Notification Service): 4-6 hours
- **Phase 7** (Integration): 2-3 hours
- **Phase 8** (Configuration): 1-2 hours
- **Phase 9** (Testing): 4-6 hours
- **Phase 10** (Documentation): 2-3 hours

**Total Development:** 22-34 hours (3-5 days)

### Additional Time
- Code review and revisions: 2-4 hours
- Gov.Notify setup: 1-2 hours
- Deployment and monitoring: 2-3 hours

**Total Project Time:** 27-43 hours (4-6 days)

This estimate assumes:
- Developer familiar with the codebase
- No major blockers
- Access to required services (Gov.Notify, database)
- Standard code review cycle

---

## Next Steps

1. Review and approve this task breakdown
2. Resolve open questions (user model, Gov.Notify access, etc.)
3. Assign developer(s)
4. Set up Gov.Notify account/template
5. Begin Phase 1 (Database Schema)
6. Daily standups to track progress
7. Code review after Phase 6
8. Final review before deployment
