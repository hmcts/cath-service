# VIBE-221: Implementation Tasks

## Setup & Configuration
- [x] Create `libs/notifications` module structure with package.json and tsconfig.json
- [x] Register module in root tsconfig.json paths
- [x] Add Gov.Notify Node.js client dependency (`notifications-node-client`)
- [x] Create Prisma schema with subscription and notification_audit_log models
- [x] Add database migration for new tables
- [ ] Configure environment variables for Gov.Notify (API key, template ID, service URL)

## Database Layer
- [x] Create Subscription model in Prisma schema
  - `subscription_id` (cuid, primary key, mapped to snake_case)
  - `user_id` (String, required, mapped)
  - `location_id` (String, required, mapped)
  - `date_added` (DateTime, default now, mapped)
  - Add indexes on `location_id` and `user_id`
- [x] Create NotificationAuditLog model in Prisma schema
  - `notification_id` (cuid, primary key, mapped)
  - `subscription_id` (String, required, foreign key, mapped)
  - `user_id` (String, required, mapped)
  - `publication_id` (String, required, mapped)
  - `status` (String, required, default "Pending")
  - `error_message` (String, optional, mapped)
  - `created_at` (DateTime, default now, mapped)
  - `sent_at` (DateTime, optional, mapped)
  - Add unique constraint on `(user_id, publication_id)`
  - Add indexes on `publication_id` and `status`
- [x] Implement subscription queries (findActiveSubscriptionsByLocation)
- [x] Implement notification audit log queries (createNotificationAuditLog, updateNotificationStatus, findExistingNotification)
- [x] Run database migration to create tables
- [x] Write unit tests for database queries

## Gov.Notify Integration
- [x] Create Gov.Notify client wrapper (sendEmail function)
- [x] Implement retry logic (retry once on failure)
- [x] Add timeout handling for API calls (10 second timeout)
- [x] Create template configuration module (getTemplateId, buildTemplateParameters)
- [x] Implement date formatting for publication_date (DD MMMM YYYY format)
- [x] Write unit tests for Gov.Notify client (mocked)
- [x] Write unit tests for template configuration

## Validation & Utilities
- [x] Implement email validation (RFC2822 format check)
- [x] Implement notification data validation (all required fields present)
- [x] Write unit tests for validation functions

## Core Notification Service
- [x] Implement sendPublicationNotifications main function
- [x] Implement processUserNotification for individual users
- [x] Add deduplication check logic (query existing notifications)
- [x] Implement error handling for all failure scenarios (Gov.Notify, invalid users, network)
- [x] Add logging for all notification attempts (console and audit log)
- [x] Handle partial success scenarios (Promise.allSettled pattern)
- [x] Implement status tracking ("Sent", "Failed", "Skipped", "Duplicate filtered")
- [x] Write unit tests for notification service

## Integration
- [x] Export notification service functions in config.ts (prismaSchemas)
- [x] Export notification service functions in index.ts (sendPublicationNotifications)
- [x] Create integration point in hearing list publication flow
- [x] Add notification trigger after successful publication (fire-and-forget pattern)

## Testing
- [ ] Write integration tests for end-to-end notification flow
- [ ] Test TS1: Trigger notification on publication
- [ ] Test TS2: Multiple triggers same publication (deduplication)
- [ ] Test TS7: Gov.Notify fails once (retry succeeds)
- [ ] Test TS8: Gov.Notify fails persistently (logged as "Failed to send")
- [ ] Test TS9: Partial success scenarios (some users fail)
- [ ] Test TS10: Audit log verification (all statuses and timestamps)
- [ ] Test deduplication with concurrent triggers
- [ ] Test Gov.Notify sandbox integration
- [ ] Test validation of invalid emails
- [ ] Test validation of missing user data
- [ ] Test error handling and retry logic
- [ ] Test audit log entries for all statuses

## Documentation
- [ ] Document Gov.Notify template requirements and parameters
- [ ] Document environment variable configuration
- [ ] Add inline code comments for complex logic
- [ ] Document deduplication strategy (database unique constraint)
- [ ] Document error handling strategy
- [ ] Document retry policy (retry once)

## Gov.Notify Template
- [ ] Create Gov.Notify email template in dashboard
- [ ] Configure subject line: "New hearing list published: ((hearing_list_name))"
- [ ] Add GOV.UK banner (automatic via Gov.Notify)
- [ ] Add Section 1: Special Category Data notice (exact wording from spec)
- [ ] Add Section 2: Notification message with dynamic parameters
- [ ] Add Section 3: Service link section with manage subscriptions URL
- [ ] Configure template with personalisation fields (user_name, hearing_list_name, publication_date, location_name, manage_link)
- [ ] Test template rendering with sample data
- [ ] Get template ID from Gov.Notify dashboard
- [ ] Add template ID to environment configuration

## Final Verification
- [ ] Manual test: Publish hearing list and verify emails received
- [ ] Verify email content matches specification exactly (all three sections)
- [ ] Verify Section 1: Special Category Data notice is present and correct
- [ ] Verify Section 2: Notification message with correct parameters
- [ ] Verify Section 3: Service link works correctly
- [ ] Verify all template parameters populated correctly (user_name, hearing_list_name, publication_date, location_name, manage_link)
- [ ] Verify manage subscriptions link: https://www.court-tribunal-hearings.service.gov.uk/
- [ ] Check audit logs for all notification attempts
- [ ] Verify deduplication works (no duplicate emails for same user + publication)
- [ ] Test error scenarios and verify appropriate logging
- [ ] Verify retry logic works (Gov.Notify fails once, retries successfully)
- [ ] Verify persistent failures logged as "Failed"
- [ ] Verify partial success (some users succeed, some fail)
- [ ] Verify accessibility of email template (text-only version from Gov.Notify)
- [ ] Run all automated tests and verify passing
- [ ] Verify no PII in console logs (only user IDs, not emails)

## Open Questions to Resolve Before Implementation
- [ ] Get user profile table structure (email and name fields)
- [ ] Get location table structure (location name field)
- [ ] Get publication/hearing list table structure (publication data fields)
- [ ] Confirm Gov.Notify template ID (after template created)
- [ ] Confirm Gov.Notify API key for all environments
- [ ] Confirm if bilingual templates required (EN/CY)
- [ ] Confirm if trigger should be synchronous or async (recommendation: sync fire-and-forget)
- [ ] Confirm deduplication approach (recommendation: database unique constraint)
- [ ] Confirm retry policy details (recommendation: retry once immediately)
- [ ] Confirm exact location of publication flow in codebase
- [ ] Confirm expected number of subscriptions per location (performance planning)
