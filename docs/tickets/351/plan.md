# Technical Plan: CaTH Cron Trigger - Automated Inactive Accounts (#351)

## 1. Technical Approach

The cron runner in `apps/crons/src/index.ts` dynamically imports a script by name from `SCRIPT_NAME`. A new script file `apps/crons/src/inactive-accounts.ts` will be the entry point. All business logic goes in a new library `libs/account-management`.

The script follows a single, ordered execution sequence per run:

1. Validate config on startup (abort if any threshold env var is missing or non-positive)
2. Run all deletions first, across all provenances, before any notifications
3. Run notifications for each provenance type
4. Log a summary of actions taken

Deletions are always processed before notifications to avoid sending a reminder email to a user that will be deleted in the same run.

### Key Decisions

**New library `libs/account-management`**: All query, service, and audit logic for this feature lives in a dedicated library rather than extending `@hmcts/account`. This keeps the account library minimal and avoids coupling the inactive-accounts domain into general account management. The crons app depends on this new library directly.

**Prisma schema lives in `libs/account-management/prisma`**: The `AccountActionAudit` model is owned by this library. It is added to `apps/postgres/src/schema-discovery.ts` alongside existing schemas.

**`sendEmail` is called directly from `@hmcts/notifications`**: The existing `sendEmail` function in `libs/notifications/src/govnotify/govnotify-client.ts` already has retry logic and returns a typed result. The account-management service will call it directly, passing template ID and personalisation fields specific to each provenance. The existing `getTemplateId()` function in `libs/notifications` is bound to the subscription template and cannot be reused — the inactive-accounts service will pass template IDs directly to the Notify client.

**No new GOV.UK Notify client wrapper**: Rather than creating a wrapper around the existing client, the service will construct `NotifyClient` calls through a thin helper in `libs/account-management` that accepts an explicit template ID.

**User delete via `@hmcts/account/repository/query`**: A new `deleteUserById` function will be added to `libs/account/src/repository/query.ts`. Subscriptions cascade-delete automatically per the existing schema foreign key constraint.

---

## 2. Implementation Details

### Files to Create

```
libs/account-management/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── config.ts                        # Module config (prismaSchemas export)
    ├── index.ts                         # Business logic exports
    ├── inactive-accounts/
    │   ├── config-validation.ts         # Validates all env var thresholds on startup
    │   ├── inactive-accounts-config.ts  # Reads and exposes threshold values
    │   ├── inactive-accounts-queries.ts # Prisma queries for user fetching and audit
    │   ├── inactive-accounts-service.ts # Orchestration: deletions then notifications
    │   ├── notify-client.ts             # Thin wrapper: sendEmail with explicit templateId
    │   ├── config-validation.test.ts
    │   ├── inactive-accounts-queries.test.ts
    │   └── inactive-accounts-service.test.ts
```

```
apps/crons/src/
└── inactive-accounts.ts                 # Entry point, calls the service, logs summary
```

### Files to Modify

| File | Change |
|---|---|
| `libs/account/src/repository/query.ts` | Add `deleteUserById(userId: string)` |
| `libs/account/src/repository/query.test.ts` | Add tests for `deleteUserById` |
| `libs/account/package.json` | No change needed — `deleteUserById` exported via existing `./repository/query` export path |
| `apps/postgres/src/schema-discovery.ts` | Import and include `prismaSchemas` from `@hmcts/account-management/config` |
| `apps/postgres/prisma/schema.prisma` | Add `AccountActionAudit` model |
| `apps/crons/package.json` | Add `@hmcts/account-management` and `@hmcts/notifications` as dependencies |
| `root tsconfig.json` | Add path alias for `@hmcts/account-management` |

### What Each File Does

**`libs/account-management/src/inactive-accounts/inactive-accounts-config.ts`**

Reads all threshold env vars and exposes them as named, typed constants. Called once at startup.

```typescript
const MEDIA_VERIFICATION_REMINDER_DAYS = Number(process.env.MEDIA_VERIFICATION_REMINDER_DAYS ?? "350");
const MEDIA_VERIFICATION_DELETE_DAYS = Number(process.env.MEDIA_VERIFICATION_DELETE_DAYS ?? "365");
// ... etc for all thresholds
```

**`libs/account-management/src/inactive-accounts/config-validation.ts`**

Validates that all threshold values are finite, positive integers and that deletion thresholds are strictly greater than notification thresholds for each provenance. Throws an error with a clear message listing all violations if any are found.

**`libs/account-management/src/inactive-accounts/inactive-accounts-queries.ts`**

Contains all Prisma queries for this feature:
- `findUsersForDeletion(provenance, thresholdDate)` — finds users where `lastSignedInDate < thresholdDate` (or `createdDate` for B2C unverified) and `userProvenance = provenance`
- `findUsersForNotification(provenance, thresholdDate)` — finds users due a reminder
- `findAuditEntry(userId, actionType)` — checks if an audit record exists (deduplication)
- `createAuditEntry(userId, actionType)` — inserts a new `AccountActionAudit` row

**`libs/account-management/src/inactive-accounts/notify-client.ts`**

A thin wrapper that calls the GOV.UK Notify API directly using `NotifyClient` from `notifications-node-client`, accepting an explicit `templateId` and `personalisation` object. This is needed because the existing `sendEmail` in `@hmcts/notifications` is coupled to the subscription template ID via `getTemplateId()`.

```typescript
export async function sendAccountEmail(params: {
  emailAddress: string;
  templateId: string;
  personalisation: Record<string, string>;
}): Promise<{ success: boolean; error?: string }>
```

**`libs/account-management/src/inactive-accounts/inactive-accounts-service.ts`**

Orchestrates the full inactive accounts run:
1. Fetch and delete SSO accounts inactive for ≥ 90 days (no email)
2. Fetch and delete B2C accounts unverified for ≥ 365 days (no email on delete)
3. Fetch and delete CFT_IDAM accounts inactive for ≥ 132 days
4. Fetch and delete CRIME_IDAM accounts inactive for ≥ 208 days
5. Fetch B2C accounts unverified for ≥ 350 days, deduplicate via audit, send verification reminder
6. Fetch CFT_IDAM accounts inactive for ≥ 118 days, deduplicate, send inactivity reminder
7. Fetch CRIME_IDAM accounts inactive for ≥ 180 days, deduplicate, send inactivity reminder

Returns a summary object:
```typescript
interface InactiveAccountsSummary {
  deleted: { sso: number; b2c: number; cftIdam: number; crimeIdam: number };
  notified: { b2c: number; cftIdam: number; crimeIdam: number };
  notificationFailures: { b2c: number; cftIdam: number; crimeIdam: number };
}
```

**`apps/crons/src/inactive-accounts.ts`**

The cron entry point. Calls `validateConfig()`, then calls the service, then logs the summary. Exports a `default` async function as required by the cron runner.

---

## 3. Database Changes

### New Prisma Model

Added to `apps/postgres/prisma/schema.prisma`:

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

`actionType` values (defined as constants in the service):
- `MEDIA_VERIFICATION_REMINDER`
- `CFT_IDAM_INACTIVITY_REMINDER`
- `CRIME_IDAM_INACTIVITY_REMINDER`
- `ACCOUNT_DELETED`

No relation to `User` is declared in Prisma — the user may have been deleted by the time the audit row is queried, and a foreign key would prevent the delete-then-audit pattern. `userId` is stored as a plain UUID string for historical record-keeping.

### Migration

Run `yarn db:migrate:dev` to generate the migration after updating the schema. Migration name should be `add_account_action_audit`.

The `libs/account-management/prisma/schema.prisma` file contains only the `AccountActionAudit` model (no generator/datasource blocks — those live in `apps/postgres`). `schema-discovery.ts` merges all lib schemas into the main schema at build time using the existing pattern.

---

## 4. Environment Variables

All variables should have sensible defaults so the script is runnable in development without configuration, but config validation will warn if defaults look misconfigured.

| Variable | Default | Description |
|---|---|---|
| `GOVUK_NOTIFY_API_KEY` | (required) | GOV.UK Notify API key |
| `MEDIA_VERIFICATION_REMINDER_DAYS` | `350` | Days unverified before B2C reminder email |
| `MEDIA_VERIFICATION_DELETE_DAYS` | `365` | Days unverified before B2C account deletion |
| `MEDIA_VERIFICATION_REMINDER_TEMPLATE_ID` | `1dea6b4b-48b6-4eb1-8b86-7031de5502d9` | GOV.UK Notify template ID for B2C reminder |
| `MEDIA_VERIFICATION_PAGE_LINK` | (required) | Full URL of the verification page |
| `SSO_INACTIVE_DELETE_DAYS` | `90` | Days inactive before SSO account deletion |
| `CFT_IDAM_REMINDER_DAYS` | `118` | Days inactive before CFT_IDAM reminder email |
| `CFT_IDAM_DELETE_DAYS` | `132` | Days inactive before CFT_IDAM account deletion |
| `CFT_IDAM_REMINDER_TEMPLATE_ID` | `cca7ea18-4e6f-406f-b4d3-9e017cb53ee9` | GOV.UK Notify template ID for CFT_IDAM reminder |
| `CFT_SIGN_IN_LINK` | (required) | Full URL of the CFT sign-in page |
| `CRIME_IDAM_REMINDER_DAYS` | `180` | Days inactive before CRIME_IDAM reminder email |
| `CRIME_IDAM_DELETE_DAYS` | `208` | Days inactive before CRIME_IDAM account deletion |
| `CRIME_IDAM_REMINDER_TEMPLATE_ID` | `cca7ea18-4e6f-406f-b4d3-9e017cb53ee9` | GOV.UK Notify template ID for CRIME_IDAM reminder (same template, different link field) |
| `CRIME_SIGN_IN_LINK` | (required) | Full URL of the Crime sign-in page |

Config validation aborts the script if any of the following are true:
- A required env var (API key, link URLs) is empty
- Any threshold is not a positive integer
- Notification threshold >= deletion threshold for the same provenance

---

## 5. Error Handling and Edge Cases

### Email Failures
If `sendAccountEmail` returns `{ success: false }`, log the error (including `userId` and provenance) and continue processing remaining users. Do not write an `AccountActionAudit` entry for failed sends — the absence of an audit entry means the user will be retried on the next cron run.

### User Has No Email
B2C users should always have an email in practice (it is required at registration). If `email` is empty, log a warning and skip that user for notifications. This is a data integrity issue and should not crash the job.

### Null `lastSignedInDate`
- For B2C accounts: a null `lastSignedInDate` means the account is unverified (never signed in). The threshold is calculated against `createdDate`. Query filters on `lastSignedInDate IS NULL AND createdDate < thresholdDate`.
- For SSO, CFT_IDAM, CRIME_IDAM: a null `lastSignedInDate` means the user has never signed in. They should be included in deletion queries using `createdDate` as the fallback. This is an explicit decision — accounts that have never been used for the threshold period are treated as inactive.

### Deduplication
Before sending a notification, query `account_action_audit` for an existing row matching `(userId, actionType)`. If found, skip — the notification was already sent in a previous run. This prevents duplicate emails across multiple cron executions.

### Partial Failures
Each deletion and notification is processed individually. A failure for one user does not abort processing for subsequent users. The summary is logged at the end regardless of individual failures.

### User Deleted Between Query and Notification
The delete phase runs before the notify phase. A user deleted in the same run will not appear in the notification query because they no longer exist. No special handling needed.

### Large User Sets
Queries use `findMany` with no artificial limit. If the number of affected users could be large in practice, a future iteration should add batching. For now, YAGNI — process all results in one pass.

---

## 6. Testing Strategy

### Unit Tests

**`config-validation.test.ts`**
- Valid config passes without throwing
- Throws with descriptive message when a threshold is zero or negative
- Throws when notification threshold >= deletion threshold
- Throws when required env var (API key, link URL) is empty
- Lists all violations in a single error rather than failing on the first

**`inactive-accounts-queries.test.ts`**
- `findUsersForDeletion` calls `prisma.user.findMany` with correct `where` clause for each provenance
- `findUsersForDeletion` for B2C uses `createdDate` when `lastSignedInDate` is null
- `findAuditEntry` calls `prisma.accountActionAudit.findFirst` with correct `userId` and `actionType`
- `createAuditEntry` calls `prisma.accountActionAudit.create` with correct data
- Mock `@hmcts/postgres` with `vi.mock`

**`inactive-accounts-service.test.ts`**
- Deletions run before notifications (verify call order with `vi.fn` spies)
- A user found in the delete query is deleted and an audit entry is created
- A user already in the audit table for a given `actionType` is skipped (deduplication)
- A failed email does not create an audit entry
- A successful email creates an audit entry with the correct `actionType`
- Summary counts are accurate (deleted, notified, failed)
- Mock `deleteUserById`, `sendAccountEmail`, and the query functions

**`libs/account/src/repository/query.test.ts`** (extend existing)
- `deleteUserById` calls `prisma.user.delete` with `where: { userId }`

### What Not to Test
- The GOV.UK Notify API itself — tested via integration/E2E
- The cron runner (`apps/crons/src/index.ts`) — already tested
- `apps/crons/src/inactive-accounts.ts` entry point — it is thin glue code with no logic

---

## 7. Open Questions and Clarifications Needed

**Q1: B2C deletion threshold interpretation**
The issue says "365 days unverified" using `lastSignedInDate` being null. Does "365 days" mean 365 days since account creation (`createdDate`), or 365 calendar days from "today minus 365"? The plan assumes `createdDate < today - 365 days` with `lastSignedInDate IS NULL`.

**Q2: SSO inactive threshold uses `lastSignedInDate` only**
The issue says 90 days inactive for SSO. Does this apply to SSO admins who have never signed in (null `lastSignedInDate`)? If yes, what is the baseline — `createdDate`? The plan treats null as "never signed in" and falls back to `createdDate`, consistent with the approach for other provenances.

**Q3: `last_signed_in_date` field in CFT/Crime email templates**
The template field is `last_signed_in_date`. What format should the date be sent in? The existing `formatPublicationDate` in notifications produces `"20 February 2026"`. Is that the expected format, or ISO 8601?

**Q4: `full_name` vs `full name` field names in Notify templates**
The issue lists `full_name` (underscore) for the B2C template and `full name` (space) for CFT/Crime. Which is correct? This must match the GOV.UK Notify template personalisation key exactly.

**Q5: CRIME_IDAM template ID**
The issue uses the same template ID (`cca7ea18-4e6f-406f-b4d3-9e017cb53ee9`) for both CFT_IDAM and CRIME_IDAM reminders. Is this intentional? The distinguishing factor appears to be whether `cft_sign_in_link` or `crime_sign_in_link` is used. Confirm that both provenances use the same Notify template with different link personalisation fields.

**Q6: `ACCOUNT_DELETED` audit entries**
Should a `ACCOUNT_DELETED` audit entry be written before or after the Prisma delete call? Writing before the delete means the audit survives even if the delete fails. Writing after means it only exists if deletion succeeded. The plan writes the audit entry only on successful deletion (after the delete call) to avoid orphaned audit records for accounts that still exist. Confirm this is the desired behaviour.

**Q7: SSO accounts — no audit entry on delete?**
The issue does not mention writing an audit entry for SSO deletions. The plan writes a `ACCOUNT_DELETED` audit entry for all deletions including SSO for consistency and traceability. Confirm whether SSO deletions should be audited.

**Q8: Notification for CFT/Crime users with null `lastSignedInDate`**
If a CFT_IDAM or CRIME_IDAM user has never signed in (null), the `last_signed_in_date` template field would be empty. Should these users receive a notification at all, or is the reminder only for users who have a sign-in date on record? The plan currently includes them with an empty string for `last_signed_in_date` and falls back to `createdDate` for threshold calculation.
