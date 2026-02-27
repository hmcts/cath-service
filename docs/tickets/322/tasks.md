# Implementation Tasks

## Database Schema
- [x] Create `legacy_third_party_user` table (id, name, created_date)
- [x] Create `legacy_third_party_subscription` table (id, user_id, list_type_id, channel, sensitivity, created_date)
- [x] Add indexes for performance (user_id, list_type_id)
- [x] Run database migration

## Create Third Party User Flow
- [x] Create `manage-third-party-users` page (list view with table)
- [x] Create `create-third-party-user` page (name input form)
- [x] Create `create-third-party-user-summary` page (review and change)
- [x] Create `third-party-user-created` confirmation page
- [x] Implement session storage for create flow data
- [x] Add validation (name required, no whitespace-only, length/character rules)
- [x] Implement idempotency check on confirm (prevent duplicate creation on refresh)

## Manage Third Party User Flow
- [x] Create `manage-third-party-user` page (view details with manage/delete buttons)
- [x] Create `manage-third-party-subscriptions` page (channel radio + list type checkboxes)
- [x] Create `third-party-subscriptions-updated` confirmation page
- [x] Load all available list types from database
- [x] Implement subscription update logic
- [x] Handle back navigation without data loss

## Delete Third Party User Flow
- [x] Create `delete-third-party-user` page (yes/no confirmation)
- [x] Create `third-party-user-deleted` confirmation page
- [x] Implement cascade deletion (user and associated subscriptions)
- [x] Add dependency check if applicable

## Business Logic
- [x] Create service layer for third-party user operations (create, update, delete)
- [x] Create database queries module (findAll, findById, create, update, delete)
- [x] Implement subscription management service

## Audit Logging
- [x] Add audit log entry on third-party user creation
- [x] Add audit log entry on subscription updates (capture before/after)
- [x] Add audit log entry on third-party user deletion
- [x] Include admin user, timestamp, action type in all audit logs

## Welsh Translations
- [x] Add Welsh translations to all create flow pages (en.ts/cy.ts)
- [x] Add Welsh translations to all manage flow pages (en.ts/cy.ts)
- [x] Add Welsh translations to all delete flow pages (en.ts/cy.ts)
- [x] Verify all provided Welsh translations are implemented

## Authorization & Navigation
- [x] Add `requireRole([USER_ROLES.SYSTEM_ADMIN])` middleware to all routes
- [x] Add "Manage Third Party Users" link to system-admin-dashboard page

## Testing
- [x] Unit tests for service layer (create, update, delete)
- [x] Unit tests for validation logic
- [x] Unit tests for database queries
- [x] E2E test for complete create flow (including Welsh and validation)
- [x] E2E test for manage subscriptions flow
- [x] E2E test for delete flow
- [x] Test idempotency on create confirm
- [x] Test back navigation preserves data
