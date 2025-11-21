# VIBE-221: Implementation Tasks

## Database Changes
- [ ] Create/update Subscriptions table schema in Prisma
  - `subscription_id` (UUID, primary key)
  - `user_id` (String, required)
  - `location_id` (String, required)
  - `date_added` (DateTime, required)
  - `status` (String, required, default: 'active')
- [ ] Create Notification Audit Log table in Prisma
  - `notification_id` (UUID, primary key)
  - `subscription_id` (UUID, foreign key)
  - `user_id` (String, required)
  - `publication_id` (String, required)
  - `status` (String, required)
  - `error_message` (String, optional)
  - `created_at` (DateTime, required)
  - `sent_at` (DateTime, optional)
- [ ] Run migrations to create tables

## Gov.Notify Integration
- [ ] Set up Gov.Notify service integration
  - Configure API key in environment variables
  - Set up Gov.Notify client library
- [ ] Create Gov.Notify email template
  - Include GOV.UK banner
  - Add Special Category Data notice section
  - Add notification message section with dynamic parameters
  - Add service link section
  - Configure template ID in application config
- [ ] Confirm if bilingual (EN/CY) templates are needed

## Notification Service Implementation
- [ ] Create notification service module
- [ ] Implement subscription query logic
  - Query by location_id and status = 'active'
  - Retrieve user_id and email from user profile
- [ ] Implement email validation
  - RFC2822 format validation
  - Check email exists in user profile
- [ ] Implement deduplication logic
  - Check for existing notification by `publication_id + user_id`
  - Use DB flag or in-memory cache (confirm approach)
- [ ] Implement Gov.Notify email sending
  - Map template parameters (user_name, hearing_list_name, publication_date, location_name, manage_link)
  - Handle Gov.Notify responses
  - Implement retry logic (retry once on failure)
- [ ] Implement audit logging
  - Log all notification attempts
  - Track success/failure status
  - Log error messages for failures
  - Record timestamps (created_at, sent_at)

## Publication Event Trigger
- [ ] Implement publication event handler
  - Trigger on hearing list publication
  - Extract publication metadata (publication_id, location_id, hearing_list_name, publication_date)
  - Call notification service
- [ ] Determine if trigger should be synchronous or asynchronous (recommended: async queue)
- [ ] Implement message queue integration (if async approach chosen)

## Error Handling
- [ ] Handle Gov.Notify send failures
  - Retry once on failure
  - Log error and mark status as "Failed to send"
- [ ] Handle invalid user ID scenarios
  - Log error and skip notification
- [ ] Handle invalid email addresses
  - Mark record as "Invalid channel"
- [ ] Handle duplicate triggers
  - Implement deduplication by publication_id + user_id
- [ ] Handle partial success scenarios
  - Log per-user success/failure results
- [ ] Handle audit log write failures
  - Retry write once, then log failure

## Configuration
- [ ] Add Gov.Notify configuration
  - API key
  - Template ID
  - Retry policy settings
- [ ] Add CaTH service URL configuration for email links
- [ ] Add notification settings (retry count, timeout, etc.)

## Testing
- [ ] Unit tests for notification service
  - Test subscription retrieval
  - Test email validation
  - Test deduplication logic
  - Test Gov.Notify integration
  - Test error handling scenarios
- [ ] Integration tests for publication trigger
  - TS1: Trigger notification on publication
  - TS2: Multiple triggers same publication (deduplication)
  - TS7: Gov.Notify fails once (retry)
  - TS8: Gov.Notify fails persistently
  - TS9: Partial success scenarios
  - TS10: Audit log verification
- [ ] E2E tests for complete notification flow

## Documentation
- [ ] Document Gov.Notify template configuration
- [ ] Document notification service API
- [ ] Document error handling and retry policies
- [ ] Document audit log structure and query methods
- [ ] Add deployment notes for Gov.Notify setup

## Open Questions to Resolve
- [ ] Confirm deduplication implementation approach (DB flag vs in-memory cache)
- [ ] Confirm Gov.Notify template ID and configuration location
- [ ] Confirm retry policy (number and interval of retries)
- [ ] Confirm if bilingual templates (EN/CY) are required
- [ ] Confirm if trigger should be synchronous or async queue-based (recommend async)
- [ ] Confirm service URL for email links
