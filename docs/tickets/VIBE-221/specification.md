# VIBE-221: Backend - Subscription Fulfilment (Email notifications)

## Overview
Implement a trigger-based mechanism to automatically send email notifications to subscribed users when new hearing lists are published in CaTH.

## Problem Statement
Verified users in CaTH can subscribe to receive email notifications about newly published hearing lists. This functionality requires a trigger-based mechanism in the CaTH back end to automatically send email notifications to subscribed users through Gov.Notify when a hearing list relevant to their subscriptions is published.

## User Story
**As a** System
**I want to** send out email notifications to users who are subscribed to receive publication notifications from CaTH
**So that** they can be informed whenever a new list they subscribed to is published

## Pre-Conditions
- User has an approved and verified CaTH account
- User has subscribed to receive notifications for one or more specific venues
- A valid Subscriptions table exists linking user IDs to court or tribunal venues
- A new hearing list publication event occurs for a venue with active subscribers

## Technical Requirements

### Trigger Flow
1. **Event source:** Hearing list publication in CaTH
2. **Trigger action:** Emits a message (e.g. via message queue or direct event call) to the Notification Service
3. **Notification Service:**
   - Retrieves subscription data from database
   - Validates channel type and details
   - Sends notifications via Gov.Notify
   - Writes audit log entry to track status and errors

### Subscriptions Data Retrieval
- Query Subscriptions table where `location_id = <publication location ID>` and `status = active`
- Result set provides `user_id`, `channel`, and corresponding destination (email or API endpoint)

### Email Sending (via Gov.Notify)
- CaTH integrates with Gov.Notify service using a defined template
- Dynamic template parameters:
  - `{user_name}`
  - `{hearing_list_name}`
  - `{publication_date}`
  - `{location_name}`
  - `{manage_link}` (link to CaTH service)
- Gov.Notify responses logged for each send (success or failure)

## Data Model - Subscriptions Table

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscription_id` | UUID | Yes | Unique identifier for each subscription |
| `user_id` | String | Yes | ID of the verified user |
| `location_id` | String | Yes | Linked venue ID |
| `date_added` | DateTime | Yes | Subscription creation date |

## Notification Audit Log

**Purpose:** Track notifications sent and manage delivery outcomes.

| Field | Type | Description |
|-------|------|-------------|
| `notification_id` | UUID | Unique ID for notification event |
| `subscription_id` | UUID | Link to Subscriptions table |
| `user_id` | String | User identifier |
| `publication_id` | String | Identifier of published hearing list |
| `status` | String | "Sent", "Failed", "Skipped", "Duplicate filtered" |
| `error_message` | String | Error reason if applicable |
| `created_at` | DateTime | Notification created timestamp |
| `sent_at` | DateTime | When message successfully sent |

## Notification Email Template (Gov.Notify)

### Email Structure (Mandatory for MVP)

1. **Header:** GOV.UK banner

2. **Section 1 - Opening notice:**
   ```
   Note this email contains Special Category Data as defined by the Data Protection Act 2018,
   formerly known as Sensitive Personal Data, and should be handled appropriately.

   This email contains information intended to assist the accurate reporting of court proceedings.
   It is vital you ensure that you safeguard the Special Category Data included and abide by reporting
   restrictions (for example on victims and children). HMCTS will stop sending the data if there is
   concern about how it will be used.
   ```

3. **Section 2 - Notification message:**
   ```
   Your subscription to get updates about the below has been triggered based on a
   [Hearing List name] being published for the [date].
   ```

4. **Section 3 - Service link:**
   ```
   Manage your subscriptions, view lists and additional case information
   within the Court and tribunal hearings service.
   ```
   Link URL: https://www.court-tribunal-hearings.service.gov.uk/

## Validation Rules

### Email Channel
- Must pass format validation (regex for RFC2822)
- Must exist in user profile table
- Gov.Notify template ID must exist in configuration

### Deduplication
- Trigger must not send duplicate emails for the same `user_id` + `publication_id`

## Error Handling

| Scenario | Description | System Behaviour |
|----------|-------------|------------------|
| Gov.Notify send fails | Network issue, invalid template, or rejection | Retry once → log error → mark status as "Failed to send" |
| Invalid user ID | Missing or invalid user record | Log error, skip notification |
| Invalid email | Malformed or inactive email address | Mark record "Invalid channel" |
| API endpoint unreachable | API fails health check or returns 500 | Log warning; no retry |
| Duplicate triggers | Multiple publication triggers | Deduplicate by `publication_id + user_id` |
| Blob or DB write failure | Cannot update audit record | Retry write once, then log failure |
| Partial success | Some sends fail | Log per-user success/failure result |

## Acceptance Criteria

1. When a new hearing list is published in CaTH, a trigger is raised automatically in the CaTH back end
2. The trigger retrieves all active subscriptions from the Subscriptions table that match the publication's venue (court ID)
3. Only one email notification should be sent to each user ID per publication, even if multiple triggers are raised simultaneously
4. All subscription channel details are validated before sending:
   - Email addresses are validated for format and existence
5. Error handling is implemented to manage:
   - Gov.Notify delivery failures
   - Invalid or missing user IDs
6. If multiple triggers are raised for the same publication, deduplication ensures only one notification per user
7. Gov.Notify is used to send email notifications, following HMCTS branding and accessibility standards
8. This story covers only the basic notification functionality — it does NOT include PDF attachments or email summaries (to be implemented in later iterations)

## Accessibility & Compliance

- **Emails:** Must follow GOV.UK Notify branding and layout guidelines
- **Data security:** All notifications comply with GDPR and DPA 2018
- **Storage:** Audit and subscription data stored in encrypted blob storage
- **Accessibility:** Text-only version provided by Gov.Notify (no HTML formatting reliance)
- **Logging:** All sends and failures recorded for review by HMCTS technical admins

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Trigger notification on publication | Publish new hearing list | Email trigger raised, all subscribed users receive notification |
| TS2 | Multiple triggers same publication | Publish same list twice | One email per user (deduplicated) |
| TS7 | Gov.Notify fails once | Temporary issue | Retry once; success logged |
| TS8 | Gov.Notify fails persistently | Second attempt fails | Logged as "Failed to send" |
| TS9 | Partial success | Some users valid, others not | Success/failure logged per user |
| TS10 | Audit log | Query audit endpoint | Shows all sends with timestamps and statuses |

## Risks & Clarifications

- Confirm how deduplication is implemented (DB flag or in-memory cache)
- Confirm Gov.Notify template ID and configuration location
- Confirm retry policy (number and interval of retries)
- Confirm if bilingual templates (EN/CY) are required for notifications
- Confirm if the trigger runs synchronously or via queue (recommended: async queue processing)

## Scope Note

This ticket only covers the basic email notifications requirements and does NOT include:
- PDF attachments
- Email summaries

These features will be implemented in later iterations.
