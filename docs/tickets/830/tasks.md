## Implementation Tasks

### Phase 1: status pages (implement now)

- [x] Add `status String @default("PENDING") @db.VarChar(20)` to `ThirdPartyUser` in `libs/postgres-prisma/prisma/schema/third-party-user.prisma`
- [x] Run `yarn db:migrate:dev` to generate `apps/postgres/prisma/migrations/<timestamp>_add_third_party_user_status/migration.sql`, then `yarn db:generate`. Verify that existing and new rows are `PENDING`, the legacy tables are untouched, and there is no drift (scenario 8)
- [x] Add `libs/third-party-user/src/third-party-user-status.ts` (`THIRD_PARTY_USER_STATUSES`, `ThirdPartyUserStatus`, `isThirdPartyUserStatus`) with tests (scenario 6)
- [x] Add `updateThirdPartyUserStatus(id, status)` to `third-party-user-service.ts`, export it from `index.ts`, and add tests (scenario 6)
- [x] Add `VIEW_THIRD_PARTY_SUBSCRIBER_STATUS` and `UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS` to `AuditLogAction` in `libs/system-admin-pages/src/audit-log/logger.ts`
- [x] Create `third-party-subscribers/[id]/status/en.ts` and `cy.ts` with full Welsh content
- [x] Create `third-party-subscribers/[id]/status/index.ts`:
  - [x] role-guarded GET: look up the subscriber, redirect if missing, write the view audit in try/catch, render with the current status pre-selected
  - [x] POST: look up the subscriber, validate, update, set `auditMetadata`, redirect to the success page
- [x] Create `third-party-subscribers/[id]/status/index.njk`:
  - [x] back link, error summary and H1
  - [x] `govukRadios` with `idPrefix` and `name` "status"
  - [x] Confirm button, and a Cancel secondary button linking to the Manage page
- [x] Write `status/index.test.ts` (scenarios 2, 3, 4, 5), covering:
  - [x] render and pre-selection
  - [x] validation errors, in en and cy: missing, invalid, lowercase, array
  - [x] unknown id on GET and POST
  - [x] role guard
  - [x] view audit, including audit failure
  - [x] update audit
- [x] Write `status/index.njk.test.ts` (scenario 7), covering:
  - [x] three radios with the current one checked
  - [x] no `<select>`
  - [x] Cancel and back hrefs
  - [x] error states present and absent
  - [x] Welsh render
  - [x] en/cy key parity
- [x] Create `third-party-subscribers/[id]/status/success/{index.ts,index.njk,en.ts,cy.ts}` with the role guard, panel, next message and a link to `/third-party-subscribers`
- [x] Write `status/success/index.test.ts` and `index.njk.test.ts` covering English and Welsh render, the role guard and key parity (scenarios 4, 7)
- [x] Update the Manage page (`[id]/manage/index.ts`, `index.njk`, `en.ts`, `cy.ts`) with a Status row showing the localised label and a Change link to `/third-party-subscribers/:id/status`. Update `index.test.ts` (scenario 7)
- [x] Add `e2e-tests/tests/system-admin/third-party-subscriber-status.spec.ts`, a running journey "admin can change a third party subscriber status" (scenario 1), covering:
  - [x] the subscriber is Pending by default, and Pending is pre-selected on the status page
  - [x] Cancel leaves the status unchanged
  - [x] changing to Active, then the success page
  - [x] Welsh and axe checks
  - [x] the Manage page shows Active
  - [x] cleanup
- [ ] Run `yarn lint:fix`, `yarn test` and the new e2e test from the root. Fix all failures and warnings

### Checkpoint: stop and check in with the user

- [ ] **STOP.** Do not start Phase 2 until the user confirms:
  - [ ] the OAuth delivery ticket has merged
  - [ ] which files and functions send new, updated and deleted publications to `third_party_user` subscribers
  - [ ] whether skipped subscribers should be logged (Clarification 1)
  - [ ] that test connection (#829) does not read status

### Phase 2: delivery gating (after the checkpoint)

- [ ] Read the merged delivery code and update the "Phase 2 design" section of plan.md if anything differs
- [ ] Export `ACTIVE_STATUS` from `@hmcts/third-party-user` and add the `ACTIVE` check to every send path (new, updated, deleted). Put the check in the service if skips are logged, otherwise in the query. Do not touch `libs/legacy-third-party-fulfilment`
- [ ] Add unit tests for each send path: only active, only inactive, and mixed subscribers, with no throw. Assert one skip log per subscriber id if logging was confirmed (scenario 9)
- [ ] If the delivery ticket added an e2e journey, extend it so a `SUSPENDED` subscriber receives nothing (scenario 9)
- [ ] Run `yarn lint:fix`, `yarn test` and the affected e2e tests from the root. Fix all failures and warnings
