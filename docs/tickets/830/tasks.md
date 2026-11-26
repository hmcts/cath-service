## Implementation Tasks

### 0. Prerequisites
- [x] Work on `feature-830-update-status-for-third-party-subscriber`, which is built on PR #1215 (`feature-568-cache-oauth-access-tokens`). Merge master and #1215 updates in as they land
- [ ] If PR #1324 (#829 test connection) merges first, rebase and resolve the manage-page conflicts (`[id]/manage/index.ts`, `index.njk`, `en.ts`, `cy.ts`, `index.njk.test.ts`)

### 1. Schema and migration
- [x] Add `status String @default("PENDING") @db.VarChar(20)` to `ThirdPartyUser` in `libs/postgres-prisma/prisma/schema/third-party-user.prisma`
- [x] Generate `apps/postgres/prisma/migrations/<timestamp>_add_third_party_user_status/migration.sql` with `yarn db:migrate:dev`. Check it is a single `ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING'`, with no backfill (pip `V1.15` parity)
- [x] Run `yarn db:generate`. Confirm a new insert is PENDING and `prisma migrate diff` is clean

### 2. Domain: `libs/third-party-user`
- [x] Create `src/subscriber-status.ts` with `THIRD_PARTY_USER_STATUSES`, `ThirdPartyUserStatus` and `isThirdPartyUserStatus`, plus `subscriber-status.test.ts` (scenario 1)
- [x] Add `updateThirdPartyUserStatus` to `src/third-party-user-service.ts`
- [x] Make `findThirdPartyUserById` return `null` for non-UUID ids
- [x] Extend `third-party-user-service.test.ts` (scenario 2)
- [x] Export the new function, constant and type from `src/index.ts`

### 3. Delivery: `libs/third-party-subscription-fulfilment`
- [x] `fulfilment/queries.ts`: select `status` in `findMatchingSubscriptions` and add it to `Subscriber`. Update `queries.test.ts` (scenario 3)
- [x] `fulfilment/service.ts`: filter non-ACTIVE subscribers in `findSubscribers` and log each skip with `userId`, `status` and `artefactId`
- [x] Extend `fulfilment/service.test.ts` for publish, update and delete with mixed, all-active and all-inactive sets (scenario 4)
- [x] Leave `libs/legacy-third-party-fulfilment` unchanged (the Courtel stack is out of scope)

### 4. Audit
- [x] Add `VIEW_THIRD_PARTY_SUBSCRIBER_STATUS` and `UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS` to `AuditLogAction` in `libs/system-admin-pages/src/audit-log/logger.ts`. Update `logger.test.ts` if it enumerates actions (scenario 10)

### 5. Manage page: `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/manage`
- [x] Add `tableHeadings.status`, `change` and `statuses` to `en.ts` and `cy.ts`
- [x] Pass `statusLabel` from `index.ts`, falling back to the raw value. Extend `index.test.ts` (scenario 5)
- [x] Add the Status summary row with the Change action (href with `lngParam`, visually hidden text) to `index.njk`
- [x] Create or extend `index.njk.test.ts` (scenario 6)

### 6. Status page: `[id]/status`
- [x] Create `en.ts` / `cy.ts` using pip's wording from the plan's content table ("Manage User Status", "Status", "Confirm", "Cancel", "Back"), plus "There is a problem" / "Select a status"
- [x] Create `index.ts`:
  - GET: lookup, redirect if not found, pre-select the current status, view audit via `logAction` in a try/catch
  - POST: lookup, validate, update, `auditMetadata` with before/after, redirect to success
  - Wrap both in `requireRole([SYSTEM_ADMIN])`
- [x] Create `index.njk` (migrated from pip): back link, error summary, H1, `govukSelect` labelled "Status" with Pending / Active / Suspended and no empty option, Confirm button, and Cancel as a `govuk-button--warning` link to the manage page
- [x] Create `index.test.ts` (scenario 7)
- [x] Create `index.njk.test.ts` including en/cy key parity (scenario 8)

### 7. Success page: `[id]/status/success`
- [x] Create `en.ts` / `cy.ts` with pip's wording ("Third Party Account Status Updated", "Third party account status has been successfully updated.", "To further update third party account, you can go to:", "Manage third party subscriber")
- [x] Create `index.ts` (system admin only) and `index.njk` (panel, further-update text, link to `/third-party-subscribers`)
- [x] Create `index.test.ts` and `index.njk.test.ts` including key parity (scenario 9)

### 8. Test support and E2E
- [x] Accept an optional validated `status` in `libs/test-support/src/routes/test-support/third-party-users.ts` POST
- [x] Create `e2e-tests/tests/system-admin/third-party-subscriber-status.spec.ts` with the "system admin can change a third party subscriber's status @nightly" journey: Pending shown, Cancel path, Welsh, Axe on the status and success pages, Confirm Active, manage page shows Active
- [ ] Once #1324 is merged: add a test showing the connection test runs for a PENDING subscriber

### 9. Finish
- [ ] Get Welsh content signed off (C5)
- [ ] Ask the ticket author to update the AC: no ACTIVE backfill, select instead of radios, pip wording
- [ ] `yarn lint:fix`, `yarn test`, and a manual check with `?lng=cy` and keyboard-only navigation of the status page
