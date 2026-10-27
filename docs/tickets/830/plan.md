# Technical Plan: #830 — Third party subscriber status (Pending / Active / Suspended)

## 1. Technical Approach

### How legacy CaTH resolves the two-model problem

Legacy CaTH ran two third-party models side by side and never merged them. AI CaTH mirrors both:

| | Legacy CaTH | AI CaTH equivalent | Status in legacy |
|---|---|---|---|
| Old Courtel path | `pi_user` with `THIRD_PARTY` role and `API_COURTEL` channel subscriptions. Every push goes to one configured Courtel URL (`pip-subscription-management` `SubscriptionChannelService.userIdToApiValueSwitcher`) | `legacy_third_party_user` / `legacy_third_party_subscription`, pushed by `libs/legacy-third-party-fulfilment` to `COURTEL_API_URL` | **None.** Never gated. |
| New subscriber path | `api_user`, `api_subscription`, `api_oauth_configuration` (pip-account-management), delivered per subscriber over OAuth | `third_party_user`, `third_party_subscription`, `third_party_secret`, managed by the `/third-party-subscribers/*` pages | `api_user.status`, default `PENDING` |

How the AI CaTH tickets map onto the two paths:

| | Courtel ("Current") | OAuth subscribers ("Future") |
|---|---|---|
| Admin UI | #322: `apps/web/src/pages/(system-admin)/manage-third-party-users` etc., writing `legacy_third_party_*` through `libs/system-admin-pages/src/third-party-user/queries.ts` | #301: `libs/system-admin-pages/src/pages/third-party-subscribers`, writing `third_party_user` |
| Delivery | #323: `libs/legacy-third-party-fulfilment`, called from `libs/publication/src/processing/service.ts` and `remove-list-confirmation` | Being built in a separate ticket (not merged yet) |
| Test connection | n/a | #829 |
| Status | none, as in legacy | **#830** |

Legacy built OAuth delivery (10 Feb 2026), then test connection (17 Feb), then status with its delivery check (PR #594, PUB-3147). #830 follows the same order, which is why the delivery check waits for Phase 2.

Legacy facts this plan relies on:
- **Migration** (`V1.15__add_status_column_to_api_user.sql`): `ALTER TABLE api_user ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';`. There is no backfill, so every existing `api_user` became `PENDING`.
- **Delivery gate** (`ThirdPartySubscriptionNotificationService.collectThirdPartySubscriberConfigurationList`): it loads subscriptions by list type and sensitivity, then checks `ApiUserStatus.ACTIVE` per user **in code**. Non-active subscribers are skipped silently. It only logs a missing user or a missing OAuth config.
- **Health check** (`handleThirdPartyHealthCheck`): it builds the OAuth config directly and never reads status.
- **Audit**: the status page GET audits `VIEW_THIRD_PARTY_SUBSCRIBERS_STATUS` explicitly.
- **Welsh**: the legacy `cy` locale files contain English text. Nothing can be reused.

### Decision

`status` goes on `ThirdPartyUser` (`third_party_user`) only, as in legacy:

- `legacy_third_party_*` and `libs/legacy-third-party-fulfilment` are not changed. The Courtel path stays ungated, as it was in legacy, so current delivery is not interrupted.
- No legacy data is copied into `third_party_user`. Migrating third-party data belongs to epic #836, not this ticket.
- New and existing `third_party_user` rows default to `PENDING`, as in legacy. These rows receive no pushes today, so nothing is interrupted, and nothing starts delivering once OAuth delivery lands until an admin activates the subscriber.

### Phasing

OAuth delivery for `third_party_user` is being built in a separate ticket that has not merged yet. Today nothing reads `third_party_user` / `third_party_subscription` to send anything, so the delivery ACs have no code to attach to. #830 is split:

- **Phase 1 (implement now):** the status column, the domain helpers, the status and success pages, the Manage page row, audit, Welsh, and tests.
- **Checkpoint (stop and check in with the user):** before any Phase 2 work, `/qk-implement` must stop and ask the user whether the OAuth delivery ticket has merged, and which files and functions it added. Do not guess at or stub the delivery code.
- **Phase 2 (after the user confirms delivery has merged):** add the `ACTIVE` check to the new delivery code, for new, updated and deleted publications. Add skip logging if Clarification 1 says so. Add the tests.

Phase 1 is safe to merge on its own. Status is stored and editable but has no effect on delivery until Phase 2, and the Courtel path is never affected.

### Phase 2 design (to confirm against the merged delivery code)

- **Where the check goes:** in the service, after loading subscribers by list type, as legacy `collectThirdPartySubscriberConfigurationList` did, not in the Prisma query. This keeps skipped subscribers visible to code so they can be logged (Clarification 1). If the user decides not to log skips, a query-level `where: { thirdPartyUser: { status: "ACTIVE" } }` is simpler and is acceptable.
- **Coverage:** every send path the delivery ticket adds (new, updated and deleted publication) uses the same check. Use `ACTIVE_STATUS` / `isThirdPartyUserStatus` from `@hmcts/third-party-user`, never a string literal.
- **Test connection (#829)** must not read status. Confirm this when checking in.
- **Courtel** (`libs/legacy-third-party-fulfilment`) is not touched.

### Other key decisions

- **Status type:** `String @db.VarChar(20)`, matching existing schema conventions (no Prisma enums). Allowed values live in a TS constant in `@hmcts/third-party-user`, and the POST handler validates against it.
- **Audit:** `auditLogMiddleware` only logs POST/PUT/PATCH/DELETE. The update is audited like the sibling delete and OAuth pages (`req.auditMetadata` with `shouldLog: true`). The view needs an explicit `logAction` in the GET handler, following legacy `VIEW_THIRD_PARTY_SUBSCRIBERS_STATUS`. This applies to the status page only. Sibling pages are not changed.
- **Radios, not select:** use `govukRadios`, following the radios already used on the delete confirmation page.

## 2. Implementation Details

### TEMPLATE SOURCE

migrate from pip-frontend src/main/views/system-admin/manage-third-party-subscriber-status.njk and src/main/views/system-admin/manage-third-party-subscriber-status-success.njk (controllers: src/main/controllers/system-admin/ManageThirdPartySubscriberStatusController.ts and ManageThirdPartySubscriberStatusSuccessController.ts; locales: src/main/resources/locales/{en,cy}/manage-third-party-subscriber-status(-success).json)

The ticket requires these departures from legacy:
- Use GOV.UK radios instead of the legacy `<select>`.
- Write real Welsh. Legacy `cy` is English text.
- The H1 is "Manage subscriber status". Legacy says "Manage User Status".
- The id comes from the `:id` route param. Legacy posts `userId` in a hidden field to a flat URL.
- An unknown id redirects to `/third-party-subscribers`. Legacy renders the generic error page.
- Add a "Select a status" error. Legacy has no validation.

### File structure (Phase 1)

```
libs/postgres-prisma/prisma/schema/
└── third-party-user.prisma                      # MODIFY: add status to ThirdPartyUser

apps/postgres/prisma/migrations/
└── <timestamp>_add_third_party_user_status/
    └── migration.sql                            # NEW (generated)

libs/third-party-user/src/
├── third-party-user-status.ts                   # NEW: THIRD_PARTY_USER_STATUSES, ThirdPartyUserStatus, isThirdPartyUserStatus
├── third-party-user-status.test.ts              # NEW
├── third-party-user-service.ts                  # MODIFY: add updateThirdPartyUserStatus(id, status)
├── third-party-user-service.test.ts             # MODIFY
└── index.ts                                     # MODIFY: export the above

libs/system-admin-pages/src/
├── audit-log/logger.ts                          # MODIFY: add VIEW_/UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS
└── pages/third-party-subscribers/[id]/
    ├── manage/{index.ts,index.njk,en.ts,cy.ts,index.test.ts}   # MODIFY: Status row + Change link
    └── status/                                  # NEW → /third-party-subscribers/:id/status
        ├── index.ts / index.njk / en.ts / cy.ts
        ├── index.test.ts / index.njk.test.ts
        └── success/                             # NEW → /third-party-subscribers/:id/status/success
            ├── index.ts / index.njk / en.ts / cy.ts
            └── index.test.ts / index.njk.test.ts

e2e-tests/tests/system-admin/third-party-subscriber-status.spec.ts  # NEW: runs (not in the skipped suite)
```

Phase 2 files depend on the delivery ticket and are confirmed at the checkpoint. `libs/legacy-third-party-fulfilment` is not touched in either phase. The pages are auto-discovered from the existing `system-admin-pages` page routes, so no change to `apps/` is needed.

### Database schema and migration

```prisma
model ThirdPartyUser {
  id            String                   @id @default(uuid()) @db.Uuid
  name          String                   @db.VarChar(255)
  status        String                   @default("PENDING") @db.VarChar(20)
  createdAt     DateTime                 @default(now()) @map("created_at")
  subscriptions ThirdPartySubscription[]

  @@map("third_party_user")
}
```

`yarn db:migrate:dev` generates the migration in `apps/postgres/prisma/migrations/`. No hand-editing is needed, and the result matches legacy `V1.15`:

```sql
ALTER TABLE "third_party_user" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
```

### Domain module (`@hmcts/third-party-user`)

- `third-party-user-status.ts` contains `THIRD_PARTY_USER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const`, a `ThirdPartyUserStatus` type, and `isThirdPartyUserStatus(value: unknown): value is ThirdPartyUserStatus`. Export `ACTIVE_STATUS` only in Phase 2, when the delivery check uses it.
- `updateThirdPartyUserStatus(id: string, status: ThirdPartyUserStatus)` calls `prisma.thirdPartyUser.update({ where: { id }, data: { status } })`.
- `createThirdPartyUser` stays as it is. The DB default sets `PENDING`.

### Routes and controllers

Every handler is exported as `[requireRole([USER_ROLES.SYSTEM_ADMIN]), handler]` and uses the `lngParam` and `...t, en, cy` render shape of the sibling pages.

**`GET /third-party-subscribers/:id/status`**
1. Call `findThirdPartyUserById(id)`. If no subscriber is found, redirect to `/third-party-subscribers${lngParam}`.
2. Call `logAction({ ..., action: AuditLogAction.VIEW_THIRD_PARTY_SUBSCRIBER_STATUS, details: "ID: <id>" })`. Wrap it in try/catch with `console.error`, because `logAction` rethrows and an audit failure should not block viewing.
3. Render `third-party-subscribers/[id]/status/index` with `userId`, `selectedStatus: user.status`, and `statusItems` built from `THIRD_PARTY_USER_STATUSES` and `t.statusLabels`.

**`POST /third-party-subscribers/:id/status`**
1. Re-fetch the subscriber. If it is not found, redirect to the list.
2. If `!isThirdPartyUserStatus(req.body.status)`, re-render with `errors: [{ text: t.statusRequired, href: "#status" }]` and `selectedStatus: user.status`.
3. Otherwise:
   - call `updateThirdPartyUserStatus`;
   - set `req.auditMetadata = { shouldLog: true, action: AuditLogAction.UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS, entityInfo: "Name: <name>, ID: <id>, Status: <OLD> -> <NEW>" }`;
   - redirect to `/third-party-subscribers/${id}/status/success${lngParam}`.

**`GET /third-party-subscribers/:id/status/success`**
- Render the panel, the "To further update…" message and a link to `/third-party-subscribers${lngParam}`.

**Manage page**
- Add `status: t.statusLabels[user.status]` to the render context.
- Add a summary list row: `{ key: Status, value: <label>, actions: { items: [{ href: "/third-party-subscribers/<id>/status<lngParam>", text: t.change, visuallyHiddenText: t.tableHeadings.status }] } }`.

### Template (status page)

- A back link to `/third-party-subscribers/<id>/manage<lngParam>`.
- The error summary above the H1, following the sibling pattern.
- The H1 is `pageTitle`, "Manage subscriber status".
- `<form method="post" novalidate>` contains `govukRadios`:
  - `idPrefix: "status"` and `name: "status"`;
  - legend `statusLegend` ("Status", `govuk-fieldset__legend--m`);
  - each item has `checked: item.value == selectedStatus`;
  - the inline error is matched on `href == "#status"`.
- A `govuk-button-group` contains `govukButton({ text: confirmButton })` and `govukButton({ text: cancelButton, href: manage URL, classes: "govuk-button--secondary" })`. Cancel is a link, so nothing is posted.

### Content

| Key | en | cy (draft) |
|---|---|---|
| pageTitle | Manage subscriber status | Rheoli statws tanysgrifwr |
| statusLegend | Status | Statws |
| statusLabels.PENDING | Pending | Yn yr arfaeth |
| statusLabels.ACTIVE | Active | Gweithredol |
| statusLabels.SUSPENDED | Suspended | Wedi'i atal |
| confirmButton | Confirm | Cadarnhau |
| cancelButton | Cancel | Canslo |
| errorSummaryTitle | There is a problem | Mae problem wedi codi |
| statusRequired | Select a status | Dewiswch statws |
| back | Back | Yn ôl |
| success.pageTitle / panelTitle | Third party account status updated | Statws cyfrif trydydd parti wedi'i ddiweddaru |
| success.panelBody | Third party account status has been successfully updated. | Mae statws y cyfrif trydydd parti wedi'i ddiweddaru'n llwyddiannus. |
| success.nextMessage | To further update third party account, you can go to: | I ddiweddaru'r cyfrif trydydd parti ymhellach, gallwch fynd i: |
| success.manageLink | Manage third party subscribers | Rheoli tanysgrifwyr trydydd parti |
| manage.tableHeadings.status | Status | Statws |
| manage.change | Change | Newid |
| manage.statusLabels | (as above) | (as above) |

`statusLabels` is co-located in each page's `en.ts`/`cy.ts`, matching how sibling pages duplicate small strings.

## 3. Error Handling and Edge Cases

| Case | Behaviour |
|---|---|
| `status` missing from the body, or not an allowed value (for example `"DELETED"`, an array, lowercase `"active"`) | Re-render with the error summary and the inline "Select a status". The current status stays pre-selected. Nothing is saved. |
| Unknown `:id` on GET or POST | Redirect to `/third-party-subscribers`. The success page needs no lookup and renders statically, like the sibling success pages. |
| Non-UUID `:id` | Prisma throws on the `@db.Uuid` column. Match what sibling pages do today. If they return a 500, raise that separately rather than adding a one-off fix here. |
| Subscriber deleted between GET and POST | The POST re-fetch finds nothing and redirects to the list. `update` is never called. |
| The same status submitted again | The update succeeds and the success page shows (legacy behaviour). The audit entry records `OLD -> NEW` with equal values. |
| Non-system-admin user | `requireRole` blocks access, as on sibling pages. |
| Writing the view audit fails | Log the error and still render the page. |
| Writing the update audit fails | The middleware already catches and logs the failure. The update stands. |
| Courtel (legacy) push | Unchanged and ungated, as in legacy. |
| Test connection (#829) | Look up the subscriber with `findThirdPartyUserById`, which has no status filter, and never read status. This matches legacy `handleThirdPartyHealthCheck`. |
| Phase 2: all subscribers for a list type inactive | No push and no error. Each one is logged as skipped, if Clarification 1 says to log. |
| Phase 2: mix of active and inactive subscribers | Send only to the active ones. Inactive ones are skipped. |
| Phase 2: status changed while a push is in flight | The push uses the status read when subscribers were loaded. The next publication picks up the change. No locking. |
| Null `status` | Cannot happen: the column is `NOT NULL` with a default. |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| Three statuses PENDING/ACTIVE/SUSPENDED | `THIRD_PARTY_USER_STATUSES` and POST validation | Unit tests: `third-party-user-status.test.ts`, status page POST |
| New subscriber defaults to PENDING | Column `DEFAULT 'PENDING'` | Create a subscriber through the UI, then check the Manage page shows Pending; e2e journey |
| Existing subscribers already receiving pushes are set to ACTIVE | **Does not apply.** The only subscribers receiving pushes are on the Courtel path, which stays ungated. `third_party_user` rows receive no pushes, so they get `PENDING` as in legacy | Clarification 2: reword the AC |
| Manage page has a Status row with a Change link | Summary list row with `actions` | Manage `index.test.ts`, e2e |
| Only System Admins can access the status page | `requireRole([SYSTEM_ADMIN])` | Unit test: the handler arrays include the role guard |
| Title and H1 are "Manage subscriber status" | `pageTitle` in en and cy | Template test, e2e |
| Current status is pre-selected | `checked: value == selectedStatus` | Template test, e2e |
| Confirm saves; Cancel returns without saving | POST updates; Cancel links to the manage page | Unit tests; e2e |
| GOV.UK radios | `govukRadios` | Template test: three `input[type=radio][name=status]` and no `select` |
| Missing or invalid status shows the summary and the inline "Select a status" | POST validation and error wiring | Unit tests; template test |
| Unknown id redirects to the list | Lookup, then redirect | Unit tests |
| Success panel and follow-up link | Success template | Template test, e2e |
| Only ACTIVE subscribers receive pushes | **Phase 2.** `ACTIVE` check in the OAuth delivery service, on every send path | Unit tests on the delivery service (scenario 9) |
| PENDING/SUSPENDED skipped without error and logged with id | **Phase 2.** Skip without throwing; log per id if Clarification 1 confirms it | Unit tests on the delivery service (scenario 9) |
| Test connection ignores status | #829 does not read status (legacy `handleThirdPartyHealthCheck`) | Confirm at the checkpoint; the test belongs in #829 |
| View and update are audited | Explicit `logAction` on GET; `auditMetadata` on POST | Unit tests |
| Welsh for all new content | `cy.ts` for the status and success pages, plus the manage page additions | Template tests in cy; key parity; e2e Cymraeg check |

## 5. Test Scenarios

Each scenario has a matching task in `tasks.md`.

1. **Admin changes a subscriber's status (e2e journey).**
   - Create a subscriber through the test-support API.
   - The Manage page shows "Pending" with a Change link.
   - On the status page, the H1 is correct, Pending is pre-selected, and axe passes. Switch to Welsh, check the heading and labels, then switch back.
   - Select Cancel. The Manage page still shows Pending.
   - Return, choose Active and select Confirm. The success panel and link show; run the axe and Welsh checks.
   - Follow the link to the list, then open Manage, which shows Active.
   - Clean up in `finally`.
2. **Validation errors (unit and template).** POST with no status, `"DELETED"`, `"active"` and an array. Each one re-renders with:
   - the error summary linking to `#status`;
   - the inline "Select a status", or "Dewiswch statws" under `cy`;
   - the original status pre-selected;
   - no call to `updateThirdPartyUserStatus`.
3. **Unknown or removed subscriber (unit).** GET and POST with a missing id redirect to `/third-party-subscribers`, or with `?lng=cy` under Welsh. POST does not update or audit.
4. **Access control (unit).** GET, POST and success export `requireRole([SYSTEM_ADMIN])` as the first middleware.
5. **Audit (unit).**
   - GET calls `logAction` with `VIEW_THIRD_PARTY_SUBSCRIBER_STATUS`.
   - GET still renders when `logAction` rejects.
   - A successful POST sets `auditMetadata` with `UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS` and `OLD -> NEW`.
6. **Status domain (unit).** `isThirdPartyUserStatus` accepts the three values and rejects anything else. `updateThirdPartyUserStatus` calls Prisma with the correct `where`/`data`.
7. **Templates (template tests).**
   - Status page: three radios with the current one checked, no `<select>`, Cancel and back links, and error states both present and absent, in English and Welsh.
   - Success page: the panel, the next message and the link, in English and Welsh.
   - Manage page: the context includes the status label and the Change href.
   - en/cy key parity for every new locale file.
8. **Migration (local).** After `yarn db:migrate:dev`, existing and new `third_party_user` rows are `PENDING`, the legacy tables are untouched, and `prisma migrate diff` reports no drift.
9. **Delivery gating (Phase 2, unit).** For each send path the delivery ticket adds (new, updated, deleted):
   - only `ACTIVE` subscribers → sent;
   - only `PENDING`/`SUSPENDED` → nothing sent, no throw (plus one skip log per id, if Clarification 1 says to log);
   - mixed → only the active ones are sent.

   If the delivery ticket adds an e2e journey, extend it so that a `SUSPENDED` subscriber receives nothing. This follows legacy, which covers test connection and status in one running scenario.

## CLARIFICATIONS NEEDED

### Checkpoint before Phase 2 (ask the user)

- Has the OAuth delivery ticket merged? Which files and functions send new, updated and deleted publications to `third_party_user` subscribers, and does it add an e2e journey?
- Does test connection (#829) stay status-agnostic in the merged code?

### Open (do not block Phase 1)

1. **Skip logging.** The ticket says to log each skip with the subscriber id. Legacy added that log, then removed it the next day (pip-account-management commit "remove extra log"). Confirm with the ticket author whether to keep it. This decides where the Phase 2 check goes (service vs query).
2. **Reword the backfill AC.** "Existing subscribers already receiving pushes are set to ACTIVE" doesn't fit, because no `third_party_user` subscriber receives pushes. The plan defaults all rows to `PENDING`, as legacy `V1.15` did. The ticket author needs to agree.
3. **Welsh sign-off.** The draft Welsh in the content table needs Welsh Language Unit sign-off, especially "Yn yr arfaeth" (Pending) and "Wedi'i atal" (Suspended). Legacy `cy` files are English.

### Resolved by legacy CaTH

- Status lives on `third_party_user` only. The Courtel side (#322/#323) is not gated.
- No legacy data is copied across (epic #836).
- Test connection ignores status (#829, legacy `handleThirdPartyHealthCheck`).
- Only the status page audits views (legacy `VIEW_THIRD_PARTY_SUBSCRIBERS_STATUS`).
- The e2e journey runs; it is not added to the skipped `third-party-user-management.spec.ts`.
- The unique-name constraint (legacy `V1.14`) is out of scope.
