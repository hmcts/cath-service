# #351: CaTH Cron Trigger - Automated Inactive Accounts

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-12T13:26:10Z
**Updated:** 2026-02-20T11:23:45Z

## Description

I want the system to automatically identify inactive user accounts, notify users before action is taken, and delete accounts that exceed inactivity thresholds,

so that the platform remains secure, compliant, and free of stale or unused accounts.

A scheduled (cron-triggered) background service evaluates user activity and verification status against configurable inactivity thresholds. Based on account type and inactivity duration, the system performs one of the following actions:

- Sends verification reminders to media users
- Notifies IDAM users to sign in before deletion
- Deletes inactive media, admin, or IDAM accounts

All thresholds are configurable via application properties to support policy changes without code updates.

**Media accounts**

- Media users who have not verified their account for 350 days receive a verification email.
Email template Id: 1dea6b4b-48b6-4eb1-8b86-7031de5502d9
Personalisation list:
full_name
verification_page_link

- Media users who remain unverified for 365 days are automatically deleted.

**Admin accounts**

- AAD and SSO admin accounts inactive for 90 days are deleted. No notification email will be sent in this case.

**IDAM accounts**

- CFT users inactive for:
118 days → receive a sign-in notification
132 days → are deleted
Email template Id: cca7ea18-4e6f-406f-b4d3-9e017cb53ee9
Personalisation list:
full name
last_signed_in_date
cft_sign_in_link


- Crime users inactive for:
180 days → receive a sign-in notification
208 days → are deleted
Email template Id: cca7ea18-4e6f-406f-b4d3-9e017cb53ee9
Personalisation list:
full name
last_signed_in_date
crime_sign_in_link

## Comments

### Comment by OgechiOkelu on 2026-02-20T11:12:21Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-20T11:18:42Z
## 1. User Story

**As a** platform administrator
**I want** the system to automatically identify inactive user accounts, send notification emails before taking action, and delete accounts that have exceeded inactivity thresholds
**So that** the platform remains secure, compliant, and free of stale or unused accounts

## 2. Background

The CaTH service hosts users across multiple account types backed by different identity providers. Without automated lifecycle management, inactive accounts accumulate over time, creating security and compliance risks.

A scheduled background cron job evaluates user activity against configurable inactivity thresholds and takes one of the following actions depending on account type and duration of inactivity:

- Sends verification reminders to unverified media users
- Notifies IDAM users to sign in before their accounts are removed
- Deletes inactive media, admin, or IDAM accounts

Account types and their identity provenances:

| Account Type | userProvenance | Inactivity Measured From |
|---|---|---|
| Media | `B2C_IDAM` | `createdDate` (never signed in = unverified) |
| Admin | `SSO` | `lastSignedInDate` |
| CFT IDAM | `CFT_IDAM` | `lastSignedInDate` |
| Crime IDAM | `CRIME_IDAM` | `lastSignedInDate` |

All thresholds are configurable via environment variables to support policy changes without code updates.

## 3. Acceptance Criteria

* **Scenario:** Media user receives verification reminder at 350 days
    * **Given** a media user (`B2C_IDAM`) whose account has been unverified for 350 or more days but fewer than 365 days, and who has not previously received a verification reminder
    * **When** the inactive accounts cron job runs
    * **Then** a verification reminder email is sent using template `1dea6b4b-48b6-4eb1-8b86-7031de5502d9` with personalisation `full_name` and `verification_page_link`, and the action is recorded in the `account_action_audit` table

* **Scenario:** Media user does not receive a duplicate verification reminder
    * **Given** a media user (`B2C_IDAM`) who already has a `MEDIA_VERIFICATION_REMINDER` entry in `account_action_audit`
    * **When** the inactive accounts cron job runs again
    * **Then** no further verification reminder email is sent

* **Scenario:** Unverified media user is deleted at 365 days
    * **Given** a media user (`B2C_IDAM`) whose account has been unverified for 365 or more days
    * **When** the inactive accounts cron job runs
    * **Then** the user account and all associated subscriptions are permanently deleted, and the action is recorded in `account_action_audit`

* **Scenario:** Admin account is deleted at 90 days with no prior notification
    * **Given** an admin user (`SSO` provenance) whose `lastSignedInDate` is 90 or more days ago
    * **When** the inactive accounts cron job runs
    * **Then** the user account and all associated subscriptions are permanently deleted without any notification email being sent

* **Scenario:** CFT IDAM user receives sign-in reminder at 118 days
    * **Given** a CFT IDAM user (`CFT_IDAM`) whose `lastSignedInDate` is 118 or more days ago but fewer than 132 days, and who has not previously received an inactivity reminder
    * **When** the inactive accounts cron job runs
    * **Then** an inactivity notification email is sent using template `cca7ea18-4e6f-406f-b4d3-9e017cb53ee9` with personalisation `full name`, `last_signed_in_date`, and `cft_sign_in_link`, and the action is recorded in `account_action_audit`

* **Scenario:** CFT IDAM user is deleted at 132 days
    * **Given** a CFT IDAM user (`CFT_IDAM`) whose `lastSignedInDate` is 132 or more days ago
    * **When** the inactive accounts cron job runs
    * **Then** the user account and all associated subscriptions are permanently deleted

* **Scenario:** Crime IDAM user receives sign-in reminder at 180 days
    * **Given** a Crime IDAM user (`CRIME_IDAM`) whose `lastSignedInDate` is 180 or more days ago but fewer than 208 days, and who has not previously received an inactivity reminder
    * **When** the inactive accounts cron job runs
    * **Then** an inactivity notification email is sent using template `cca7ea18-4e6f-406f-b4d3-9e017cb53ee9` with personalisation `full name`, `last_signed_in_date`, and `crime_sign_in_link`, and the action is recorded in `account_action_audit`

* **Scenario:** Crime IDAM user is deleted at 208 days
    * **Given** a Crime IDAM user (`CRIME_IDAM`) whose `lastSignedInDate` is 208 or more days ago
    * **When** the inactive accounts cron job runs
    * **Then** the user account and all associated subscriptions are permanently deleted

* **Scenario:** Thresholds are configurable without code changes
    * **Given** the environment variables for inactivity thresholds are set to non-default values
    * **When** the inactive accounts cron job runs
    * **Then** the overridden threshold values are used in place of the defaults

* **Scenario:** Email delivery failure does not stop the job
    * **Given** GOV.UK Notify returns an error for one user's notification
    * **When** the inactive accounts cron job processes that user
    * **Then** the failure is logged, no audit entry is written for that user, and the job continues processing remaining users

* **Scenario:** No accounts meet any threshold
    * **Given** no users are inactive beyond any configured threshold
    * **When** the inactive accounts cron job runs
    * **Then** the job completes successfully with zero actions taken and logs a summary

## 4. User Journey Flow

This is a background service with no user-facing journey. The system flow is:

```
Cron Trigger (daily at 2 AM UTC, configurable)
       │
       ▼
Load and validate configuration
(thresholds, template IDs, sign-in links, API key)
       │
       ├─ Invalid config ──► Log error, exit 1
       │
       ▼
┌──────────────────────────────────────────────────┐
│               Process Media Users                │
│            (userProvenance = B2C_IDAM)           │
│                                                  │
│  Step 1: Query unverified accounts               │
│          createdDate <= now - 365 days           │
│          → Delete accounts + subscriptions       │
│          → Write ACCOUNT_DELETED audit entry     │
│                                                  │
│  Step 2: Query unverified accounts               │
│          createdDate between 350 and 364 days    │
│          → Exclude: already have audit entry     │
│            MEDIA_VERIFICATION_REMINDER           │
│          → Send verification reminder email      │
│          → Write MEDIA_VERIFICATION_REMINDER     │
│            audit entry on success                │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│               Process Admin Users                │
│              (userProvenance = SSO)              │
│                                                  │
│  Step 1: Query accounts where                    │
│          lastSignedInDate <= now - 90 days       │
│          (or null and createdDate <= now - 90d)  │
│          → Delete accounts + subscriptions       │
│          → Write ACCOUNT_DELETED audit entry     │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│             Process CFT IDAM Users               │
│            (userProvenance = CFT_IDAM)           │
│                                                  │
│  Step 1: Query accounts where                    │
│          lastSignedInDate <= now - 132 days      │
│          → Delete accounts + subscriptions       │
│          → Write ACCOUNT_DELETED audit entry     │
│                                                  │
│  Step 2: Query accounts where                    │
│          lastSignedInDate between 118 and 131d   │
│          → Exclude: already have audit entry     │
│            CFT_IDAM_INACTIVITY_REMINDER          │
│          → Send inactivity notification email    │
│          → Write CFT_IDAM_INACTIVITY_REMINDER    │
│            audit entry on success                │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│            Process Crime IDAM Users              │
│           (userProvenance = CRIME_IDAM)          │
│                                                  │
│  Step 1: Query accounts where                    │
│          lastSignedInDate <= now - 208 days      │
│          → Delete accounts + subscriptions       │
│          → Write ACCOUNT_DELETED audit entry     │
│                                                  │
│  Step 2: Query accounts where                    │
│          lastSignedInDate between 180 and 207d   │
│          → Exclude: already have audit entry     │
│            CRIME_IDAM_INACTIVITY_REMINDER        │
│          → Send inactivity notification email    │
│          → Write CRIME_IDAM_INACTIVITY_REMINDER  │
│            audit entry on success                │
└──────────────────────────────────────────────────┘
       │
       ▼
Log job summary (counts of notifications sent,
deletions performed, and errors encountered)
       │
       ▼
  Exit 0 (success) or exit 1 (fatal error)
```

**Processing order within each account type:** Deletions are always processed before notifications. This ensures no reminder email is sent to a user whose account is being deleted in the same job run.

## 5. Service Architecture

**New cron script:** `apps/crons/src/inactive-accounts.ts`

Registered with the existing cron runner via `SCRIPT_NAME=inactive-accounts`. Must export a default async function matching the pattern established by `apps/crons/src/example.ts`.

**New library module:** `libs/inactive-accounts/`

```
libs/inactive-accounts/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                        # Exports (for external use if needed)
    ├── config.ts                       # Module config exports
    ├── inactive-accounts-service.ts    # Orchestrates all account type processors
    ├── media-accounts.ts               # Media account queries and actions
    ├── admin-accounts.ts               # Admin account queries and deletion
    ├── idam-accounts.ts                # CFT and Crime IDAM queries and actions
    ├── account-action-queries.ts       # Prisma queries for account_action_audit
    ├── govnotify.ts                    # GOV.UK Notify wrapper for this module
    └── *.test.ts                       # Co-located unit tests
```

## 6. Prisma Schema

New table to track actions and prevent duplicate notifications:

```prisma
model AccountActionAudit {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  actionType String   @map("action_type") @db.VarChar(50)
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([userId, actionType])
  @@map("account_action_audit")
}
```

**actionType values:** `MEDIA_VERIFICATION_REMINDER`, `CFT_IDAM_INACTIVITY_REMINDER`, `CRIME_IDAM_INACTIVITY_REMINDER`, `ACCOUNT_DELETED`

## 7. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MEDIA_VERIFICATION_REMINDER_DAYS` | `350` | Days until media verification reminder |
| `MEDIA_DELETION_DAYS` | `365` | Days until unverified media deletion |
| `ADMIN_DELETION_DAYS` | `90` | Days of inactivity before admin deletion |
| `CFT_IDAM_REMINDER_DAYS` | `118` | Days until CFT IDAM inactivity reminder |
| `CFT_IDAM_DELETION_DAYS` | `132` | Days until CFT IDAM deletion |
| `CRIME_IDAM_REMINDER_DAYS` | `180` | Days until Crime IDAM inactivity reminder |
| `CRIME_IDAM_DELETION_DAYS` | `208` | Days until Crime IDAM deletion |
| `GOVUK_NOTIFY_API_KEY` | (required) | GOV.UK Notify API key |
| `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_VERIFICATION` | `1dea6b4b-48b6-4eb1-8b86-7031de5502d9` | Media verification template |
| `GOVUK_NOTIFY_TEMPLATE_ID_IDAM_INACTIVITY` | `cca7ea18-4e6f-406f-b4d3-9e017cb53ee9` | IDAM inactivity template |
| `VERIFICATION_PAGE_LINK` | (required) | Media verification page URL |
| `CFT_SIGN_IN_LINK` | (required) | CFT IDAM sign-in URL |
| `CRIME_SIGN_IN_LINK` | (required) | Crime IDAM sign-in URL |

## 8. Assumptions & Open Questions

* **Media user "unverified" definition**: A media user with null `lastSignedInDate` has never signed in and is unverified. Inactivity measured from `createdDate`.
* **Media user identification**: All `B2C_IDAM` users are assumed to be media users.
* **Admin account scope**: Admin accounts are `SSO` provenance. Confirm whether `SYSTEM_ADMIN` accounts should be excluded from automated deletion.
* **AAD provenance**: The issue refers to "AAD and SSO admin accounts". Confirm whether AAD accounts use a distinct `userProvenance` value or are represented as `SSO`.
* **IDAM null `lastSignedInDate`**: For CFT/Crime IDAM users with null `lastSignedInDate`, `createdDate` is used as the inactivity baseline.
* **Template personalisation field naming**: `full_name` (underscore) for media template vs `full name` (space) for IDAM template — confirm this reflects actual GOV.UK Notify template field names.
* **CFT and Crime IDAM shared template**: Confirm how GOV.UK Notify handles the unused link field (e.g. `crime_sign_in_link` for a CFT user) — omit or set to empty string.
* **Actual values for sign-in links**: `CFT_SIGN_IN_LINK`, `CRIME_SIGN_IN_LINK`, and `VERIFICATION_PAGE_LINK` URLs need to be confirmed.

### Comment by OgechiOkelu on 2026-02-20T11:23:45Z
@plan
