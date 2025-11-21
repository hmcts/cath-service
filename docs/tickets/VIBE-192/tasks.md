# VIBE-192: Verified User – Email subscriptions - Implementation Tasks

## Phase 1: Infrastructure and Database Setup

### 1.1 Create Email Subscriptions Module
- [ ] Create `libs/email-subscriptions/` directory structure
- [ ] Create `libs/email-subscriptions/package.json` with module metadata
- [ ] Create `libs/email-subscriptions/tsconfig.json`
- [ ] Create `libs/email-subscriptions/src/config.ts` with module exports
- [ ] Create `libs/email-subscriptions/src/index.ts` for business logic exports
- [ ] Register module in root `tsconfig.json` paths as `@hmcts/email-subscriptions`

### 1.2 Database Schema
- [ ] Create `libs/email-subscriptions/prisma/schema.prisma`
- [ ] Define `Subscription` model with fields:
  - subscriptionId (UUID, primary key)
  - userId (string, indexed)
  - locationId (string, indexed)
  - emailFrequency (enum: IMMEDIATE, DAILY, WEEKLY)
  - subscribedAt (DateTime)
  - unsubscribedAt (DateTime, nullable)
  - isActive (Boolean, indexed)
  - Unique constraint on (userId, locationId)
- [ ] Define `NotificationQueue` model with fields:
  - queueId (UUID, primary key)
  - subscriptionId (UUID)
  - artefactId (UUID)
  - status (enum: PENDING, SENT, FAILED, indexed)
  - attemptCount (integer)
  - createdAt (DateTime, indexed)
  - sentAt (DateTime, nullable)
  - errorMessage (string, nullable)
- [ ] Define `EmailLog` model with fields:
  - logId (UUID, primary key)
  - userId (string, indexed)
  - emailAddress (string)
  - subject (string)
  - templateId (string)
  - status (enum: SENT, FAILED, BOUNCED)
  - sentAt (DateTime, indexed)
  - errorMessage (string, nullable)
- [ ] Register schema in `apps/postgres/src/schema-discovery.ts`
- [ ] Run `yarn db:migrate:dev` to create migration
- [ ] Run `yarn db:generate` to generate Prisma client

### 1.3 Module Registration
- [ ] Import module config in `apps/web/src/app.ts`
- [ ] Register page routes with `createSimpleRouter()`
- [ ] Register assets in `apps/web/vite.config.ts`
- [ ] Add module dependency to `apps/web/package.json`

## Phase 2: Core Business Logic

### 2.1 Subscription Service
- [ ] Create `libs/email-subscriptions/src/subscription/service.ts`
- [ ] Implement `createSubscription(userId, locationId, emailFrequency)` function
  - Validate user and location IDs
  - Check for duplicate subscriptions
  - Enforce 50 subscription limit
  - Create subscription record
  - Return subscription or error
- [ ] Implement `getSubscriptionsByUserId(userId)` function
  - Query active subscriptions for user
  - Join with location data
  - Return sorted list (most recent first)
- [ ] Implement `removeSubscription(subscriptionId, userId)` function
  - Validate user owns subscription
  - Set isActive to false
  - Set unsubscribedAt timestamp
  - Return success/error
- [ ] Implement `updateEmailFrequency(userId, frequency)` function
  - Validate frequency value
  - Update all user subscriptions
  - Return success/error
- [ ] Implement `getSubscriptionCount(userId)` function
  - Count active subscriptions for user

### 2.2 Subscription Queries
- [ ] Create `libs/email-subscriptions/src/subscription/queries.ts`
- [ ] Implement `findSubscriptionById(subscriptionId)` query
- [ ] Implement `findSubscriptionByUserAndLocation(userId, locationId)` query
- [ ] Implement `findActiveSubscriptionsByUserId(userId)` query
- [ ] Implement `findSubscriptionsByLocationId(locationId)` query
- [ ] Implement `countActiveSubscriptionsByUserId(userId)` query
- [ ] Implement `deactivateSubscription(subscriptionId)` mutation

### 2.3 Validation
- [ ] Create `libs/email-subscriptions/src/subscription/validation.ts`
- [ ] Implement `validateLocationId(locationId)` function
- [ ] Implement `validateEmailFrequency(frequency)` function
- [ ] Implement `validateSubscriptionLimit(userId)` function
- [ ] Implement `validateDuplicateSubscription(userId, locationId)` function

### 2.4 Unit Tests for Business Logic
- [ ] Create `subscription/service.test.ts`
- [ ] Test `createSubscription()` - successful creation
- [ ] Test `createSubscription()` - duplicate prevention
- [ ] Test `createSubscription()` - subscription limit enforcement
- [ ] Test `getSubscriptionsByUserId()` - returns correct data
- [ ] Test `removeSubscription()` - successful removal
- [ ] Test `removeSubscription()` - validation of ownership
- [ ] Create `subscription/validation.test.ts`
- [ ] Test all validation functions with valid/invalid inputs
- [ ] Aim for >80% code coverage

## Phase 3: Web Interface - Subscriptions Dashboard

### 3.1 Dashboard Page
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/index.ts`
- [ ] Implement GET handler:
  - Require auth with `requireAuth()` and `blockUserAccess()`
  - Fetch user's subscriptions via service
  - Build verified user navigation
  - Render dashboard template
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/en.ts`
  - Page title and heading
  - Empty state message
  - Button labels
  - Subscription list labels
  - Email preference labels
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/cy.ts`
  - Welsh translations for all en.ts content
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/index.njk`
  - Extend base template
  - Show subscription count
  - "Add subscription" button
  - List of subscriptions with remove links
  - Email frequency radio buttons
  - "Save preferences" button
  - Empty state conditional
- [ ] Create `libs/email-subscriptions/src/assets/css/email-subscriptions.scss`
  - Subscription list card styling
  - Empty state styling
  - Button positioning
- [ ] Update account home to link to subscriptions page

### 3.2 Add Subscription Page
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/add/index.ts`
- [ ] Implement GET handler:
  - Require auth
  - Render add subscription template
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/add/en.ts`
  - Page title
  - Search input label
  - Browse region options
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/add/cy.ts`
  - Welsh translations
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/add/index.njk`
  - Extend base template
  - Search form with input and button
  - Region links (England/Wales, Scotland, NI)

### 3.3 Search Results Page
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/search/index.ts`
- [ ] Implement GET handler:
  - Get search query from request
  - Fetch matching locations from @hmcts/location
  - Filter out already subscribed locations
  - Render results template
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/search/en.ts`
  - Results heading
  - No results message
  - Subscribe button text
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/search/cy.ts`
  - Welsh translations
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/search/index.njk`
  - Results list
  - Location cards with subscribe buttons
  - No results state

### 3.4 Confirm Subscription
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/confirm/index.ts`
- [ ] Implement GET handler:
  - Get locationId from query
  - Fetch location details
  - Render confirmation template
- [ ] Implement POST handler:
  - Get locationId from form
  - Create subscription via service
  - Handle validation errors
  - Redirect to dashboard with success message
  - Show errors if creation fails
- [ ] Create confirmation page templates and content (en.ts, cy.ts, index.njk)

### 3.5 Remove Subscription
- [ ] Create `libs/email-subscriptions/src/pages/account/email-subscriptions/remove/index.ts`
- [ ] Implement GET handler:
  - Get subscriptionId from query
  - Fetch subscription details
  - Render removal confirmation template
- [ ] Implement POST handler:
  - Get subscriptionId from form
  - Remove subscription via service
  - Redirect to dashboard with success message
- [ ] Create removal confirmation templates and content

### 3.6 Update Preferences
- [ ] Add POST handler to dashboard page for preference updates
- [ ] Validate email frequency selection
- [ ] Update user preferences via service
- [ ] Show success/error messages
- [ ] Preserve form state on errors

### 3.7 Unit Tests for Page Controllers
- [ ] Test dashboard GET handler
- [ ] Test add subscription GET handler
- [ ] Test search GET handler with various queries
- [ ] Test confirm POST handler - success case
- [ ] Test confirm POST handler - validation errors
- [ ] Test remove POST handler
- [ ] Test preferences POST handler

## Phase 4: Email Notification System

### 4.1 Email Service
- [ ] Create `libs/email-subscriptions/src/email/service.ts`
- [ ] Implement `queueNotification(subscriptionId, artefactId)` function
  - Create NotificationQueue record
  - Set status to PENDING
- [ ] Implement `processNotificationQueue()` function
  - Query pending notifications
  - Batch process (max 100 at a time)
  - Send emails via GOV Notify
  - Update status and log results
  - Handle retries (max 3 attempts)
- [ ] Implement `sendNotificationEmail(userId, subscription, artefact)` function
  - Get user profile (email, locale)
  - Build email content
  - Send via GOV Notify API
  - Create EmailLog record
  - Return success/error
- [ ] Implement `generateUnsubscribeToken(subscriptionId)` function
  - Create time-limited secure token
  - Store in Redis with 7 day expiry
  - Return token
- [ ] Implement error handling and retry logic

### 4.2 Email Templates
- [ ] Create email template for immediate notifications (English)
- [ ] Create email template for immediate notifications (Welsh)
- [ ] Create email template for daily digest (English)
- [ ] Create email template for daily digest (Welsh)
- [ ] Create email template for weekly digest (English)
- [ ] Create email template for weekly digest (Welsh)
- [ ] Include unsubscribe link in all templates
- [ ] Test templates in GOV Notify dashboard

### 4.3 Notification Trigger
- [ ] Create `libs/email-subscriptions/src/notification/trigger.ts`
- [ ] Implement `onPublicationCreated(artefact)` function
  - Query subscriptions for artefact location
  - Filter by emailFrequency (IMMEDIATE only for now)
  - Queue notifications for each subscription
- [ ] Hook into publication creation flow
- [ ] Add appropriate logging

### 4.4 Scheduled Jobs
- [ ] Create `libs/email-subscriptions/src/jobs/process-notifications.ts`
- [ ] Implement job to process notification queue
- [ ] Create `libs/email-subscriptions/src/jobs/send-daily-digest.ts`
- [ ] Implement job to send daily digest emails
- [ ] Create `libs/email-subscriptions/src/jobs/send-weekly-digest.ts`
- [ ] Implement job to send weekly digest emails
- [ ] Configure cron schedules (5 min for queue, 8am for digests)

### 4.5 Unsubscribe Flow
- [ ] Create `libs/email-subscriptions/src/pages/unsubscribe/[token]/index.ts`
- [ ] Implement GET handler:
  - Validate unsubscribe token
  - Get subscription from token
  - Render confirmation page
- [ ] Implement POST handler:
  - Remove subscription
  - Clear token from Redis
  - Show success message
- [ ] Create unsubscribe page templates and content

### 4.6 Unit Tests for Email System
- [ ] Test `queueNotification()` function
- [ ] Test `processNotificationQueue()` - success case
- [ ] Test `processNotificationQueue()` - retry logic
- [ ] Test `sendNotificationEmail()` - success case
- [ ] Test `sendNotificationEmail()` - failure handling
- [ ] Test `generateUnsubscribeToken()` function
- [ ] Test `onPublicationCreated()` trigger
- [ ] Mock GOV Notify API responses

## Phase 5: Integration and Testing

### 5.1 Integration Testing
- [ ] Test complete subscription flow end-to-end
- [ ] Test notification trigger when publication created
- [ ] Test email sending with GOV Notify sandbox
- [ ] Test unsubscribe flow from email link
- [ ] Test Welsh language throughout
- [ ] Test error handling and recovery

### 5.2 E2E Tests (Playwright)
- [ ] Create `e2e-tests/tests/email-subscriptions.spec.ts`
- [ ] Test: User can view subscriptions dashboard
- [ ] Test: User can search for courts
- [ ] Test: User can add subscription
- [ ] Test: User cannot add duplicate subscription
- [ ] Test: User can remove subscription
- [ ] Test: User can update email frequency
- [ ] Test: Dashboard shows empty state when no subscriptions
- [ ] Test: Error shown when subscription limit reached
- [ ] Test: All pages are accessible (Axe checks)
- [ ] Test: Keyboard navigation works throughout
- [ ] Test: Welsh language content displays correctly

### 5.3 Accessibility Testing
- [ ] Run Axe accessibility checker on all pages
- [ ] Test keyboard-only navigation
- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Verify color contrast ratios
- [ ] Verify focus indicators visible
- [ ] Verify form labels properly associated
- [ ] Verify error messages properly linked
- [ ] Test with 200% text zoom

### 5.4 Performance Testing
- [ ] Load test subscriptions dashboard with 50 subscriptions
- [ ] Load test search with large result sets
- [ ] Measure notification queue processing time
- [ ] Measure email sending latency
- [ ] Verify database query performance with indexes

### 5.5 Security Testing
- [ ] Verify authentication required on all pages
- [ ] Verify CSRF tokens on all forms
- [ ] Verify users can only remove their own subscriptions
- [ ] Verify unsubscribe tokens expire after 7 days
- [ ] Verify rate limiting works
- [ ] Verify SQL injection prevention
- [ ] Verify no sensitive data in logs
- [ ] Verify email addresses not exposed

## Phase 6: Documentation and Deployment

### 6.1 Documentation
- [ ] Update README with email subscriptions feature
- [ ] Document email notification setup
- [ ] Document GOV Notify integration
- [ ] Document scheduled job configuration
- [ ] Add ADR (Architecture Decision Record) for email system design

### 6.2 Configuration
- [ ] Add GOV_NOTIFY_API_KEY environment variable
- [ ] Add GOV_NOTIFY_TEMPLATE_IDS for all templates
- [ ] Add SUBSCRIPTION_LIMIT environment variable
- [ ] Add EMAIL_RATE_LIMIT configuration
- [ ] Update properties volume configuration

### 6.3 Monitoring Setup
- [ ] Add Application Insights custom metrics for:
  - Subscription additions/removals
  - Email sends (success/failure)
  - Notification queue depth
  - Processing time
- [ ] Set up alerts for email delivery failures
- [ ] Set up alerts for queue processing delays
- [ ] Set up dashboard for subscription metrics

### 6.4 Deployment
- [ ] Run database migrations in staging
- [ ] Deploy to staging environment
- [ ] Smoke test all functionality in staging
- [ ] Verify email sending works in staging
- [ ] Run full E2E test suite
- [ ] Get sign-off from product owner
- [ ] Deploy to production
- [ ] Monitor for errors in first 24 hours

## Success Criteria

- [ ] All unit tests passing with >80% coverage
- [ ] All E2E tests passing
- [ ] All accessibility tests passing (WCAG 2.2 AA)
- [ ] Welsh translations complete and tested
- [ ] Performance targets met (page load < 2s, operations < 1s)
- [ ] Email notifications sent within 15 minutes
- [ ] Subscriptions persist across sessions
- [ ] Rate limiting enforced
- [ ] Monitoring and alerts configured
- [ ] Documentation complete
- [ ] Code reviewed and approved

## Estimated Effort

- Phase 1 (Infrastructure): 1-2 days
- Phase 2 (Business Logic): 2-3 days
- Phase 3 (Web Interface): 3-4 days
- Phase 4 (Email System): 3-4 days
- Phase 5 (Testing): 2-3 days
- Phase 6 (Docs & Deploy): 1 day

**Total: 12-17 days (2.5-3.5 weeks)**

## Dependencies

- `@hmcts/auth` module for authentication
- `@hmcts/location` module for court data
- `@hmcts/publication` module for publication data
- GOV Notify API account and templates
- Redis for rate limiting and token storage
- PostgreSQL database with Prisma ORM

## Risks and Mitigation

1. **GOV Notify API Limits**
   - Risk: May hit API rate limits with many users
   - Mitigation: Implement batching and queue processing

2. **Email Deliverability**
   - Risk: Emails marked as spam
   - Mitigation: Proper SPF/DKIM/DMARC configuration, GOV Notify handles this

3. **Performance with Large Subscription Lists**
   - Risk: Dashboard slow with many subscriptions
   - Mitigation: Database indexes, pagination if needed

4. **Notification Queue Backlog**
   - Risk: Queue grows faster than processing
   - Mitigation: Horizontal scaling of job processing, alerting

5. **Duplicate Notifications**
   - Risk: Users receive multiple emails for same publication
   - Mitigation: Unique constraints, idempotent processing
