# Implementation Tasks: CaTH Cron Trigger - Automated Inactive Accounts (#351)

## Implementation Tasks

### Database

- [ ] Add `AccountActionAudit` model to `apps/postgres/prisma/schema.prisma`
- [ ] Create `libs/account-management/prisma/schema.prisma` with the `AccountActionAudit` model (model only, no generator/datasource blocks)
- [ ] Run `yarn db:migrate:dev` to generate migration `add_account_action_audit`

### New Library: `libs/account-management`

- [ ] Create `libs/account-management/package.json` with name `@hmcts/account-management`, type `module`, correct exports for `.` and `./config`, scripts matching other libs
- [ ] Create `libs/account-management/tsconfig.json` extending root tsconfig with correct `outDir`, `rootDir`, `include`, `exclude`
- [ ] Add `@hmcts/account-management` path alias to root `tsconfig.json` paths pointing to `libs/account-management/src`

### Module Config and Exports

- [ ] Create `libs/account-management/src/config.ts` exporting `prismaSchemas` pointing to `../prisma`
- [ ] Create `libs/account-management/src/index.ts` exporting public business logic (service function and summary type)
- [ ] Update `apps/postgres/src/schema-discovery.ts` to import and include `prismaSchemas` from `@hmcts/account-management/config`

### Inactive Accounts Config

- [ ] Create `libs/account-management/src/inactive-accounts/inactive-accounts-config.ts` reading all threshold env vars with defaults and exporting them as named constants
- [ ] Create `libs/account-management/src/inactive-accounts/config-validation.ts` that validates all thresholds are positive integers, notification thresholds are strictly less than deletion thresholds, and required env vars (API key, link URLs) are non-empty; throws with a list of all violations
- [ ] Write unit tests in `config-validation.test.ts` covering: valid config passes, zero/negative threshold rejected, notification >= deletion threshold rejected, missing required env vars rejected, all violations reported in one error

### Notify Client

- [ ] Create `libs/account-management/src/inactive-accounts/notify-client.ts` with `sendAccountEmail` accepting `{ emailAddress, templateId, personalisation }`, using `NotifyClient` from `notifications-node-client` directly, returning `{ success: boolean; error?: string }`

### Queries

- [ ] Add `deleteUserById(userId: string)` to `libs/account/src/repository/query.ts`
- [ ] Add tests for `deleteUserById` to `libs/account/src/repository/query.test.ts`
- [ ] Create `libs/account-management/src/inactive-accounts/inactive-accounts-queries.ts` with:
  - `findB2CUnverifiedUsersOlderThan(thresholdDate)` — `userProvenance = B2C_IDAM`, `lastSignedInDate IS NULL`, `createdDate < thresholdDate`
  - `findInactiveUsersByProvenance(provenance, thresholdDate)` — `userProvenance = provenance`, `lastSignedInDate < thresholdDate` OR (`lastSignedInDate IS NULL AND createdDate < thresholdDate`)
  - `findAuditEntry(userId, actionType)` — returns existing `AccountActionAudit` row or null
  - `createAuditEntry(userId, actionType)` — inserts a new `AccountActionAudit` row
- [ ] Write unit tests in `inactive-accounts-queries.test.ts` covering each query function including correct `where` clause shapes and null `lastSignedInDate` handling

### Service

- [ ] Create `libs/account-management/src/inactive-accounts/inactive-accounts-service.ts` with `runInactiveAccountsJob(config)` that:
  1. Deletes SSO accounts inactive ≥ threshold days (using `deleteUserById`, writes `ACCOUNT_DELETED` audit entry per deletion)
  2. Deletes B2C unverified accounts ≥ threshold days (using `deleteUserById`, writes `ACCOUNT_DELETED` audit entry)
  3. Deletes CFT_IDAM accounts inactive ≥ threshold days (using `deleteUserById`, writes `ACCOUNT_DELETED` audit entry)
  4. Deletes CRIME_IDAM accounts inactive ≥ threshold days (using `deleteUserById`, writes `ACCOUNT_DELETED` audit entry)
  5. Sends B2C verification reminder emails (skips users with existing `MEDIA_VERIFICATION_REMINDER` audit entry, writes audit entry only on success)
  6. Sends CFT_IDAM inactivity reminder emails (skips users with existing `CFT_IDAM_INACTIVITY_REMINDER` audit entry, writes audit entry only on success)
  7. Sends CRIME_IDAM inactivity reminder emails (skips users with existing `CRIME_IDAM_INACTIVITY_REMINDER` audit entry, writes audit entry only on success)
  - Returns `InactiveAccountsSummary` with counts per provenance for deleted, notified, and notification failures
- [ ] Write unit tests in `inactive-accounts-service.test.ts` covering:
  - Deletion runs before notifications (verified via spy call order)
  - Successful deletion creates audit entry
  - Deduplication: user with existing audit entry is skipped
  - Email failure: no audit entry created, failure counted in summary
  - Email success: audit entry created, success counted in summary
  - Summary counts are accurate across all provenances
  - User with no email address is skipped and logged

### Cron Entry Point

- [ ] Add `@hmcts/account-management` and `notifications-node-client` as dependencies in `apps/crons/package.json`
- [ ] Create `apps/crons/src/inactive-accounts.ts` that: reads config, calls `validateConfig()`, calls `runInactiveAccountsJob()`, logs the summary, exports a `default` async function

### Registration and Build

- [ ] Run `yarn db:generate` to regenerate the Prisma client after schema changes
- [ ] Run `yarn lint:fix` across affected packages
- [ ] Run `yarn test` to confirm all unit tests pass
