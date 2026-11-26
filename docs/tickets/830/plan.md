# Technical Plan: #830 Third party subscriber status (Pending / Active / Suspended)

## 1. Technical Approach

### Model resolution: the ticket's premise is partly wrong

The ticket says the system-admin pages write `third_party_user` but the push path reads `legacy_third_party_user`. The code does not support that. There are two separate stacks, each with its own admin UI and its own push path:

| | OAuth subscriber stack (current, pip-account-management parity) | Courtel stack (interim, #322 / #323 "Current") |
|---|---|---|
| Model / table | `ThirdPartyUser` / `third_party_user`, `ThirdPartySubscription` (per list type **and sensitivity**), `ThirdPartySecret` (`libs/postgres-prisma/prisma/schema/third-party-user.prisma`) | `LegacyThirdPartyUser` / `legacy_third_party_user`, `LegacyThirdPartySubscription` (`base.prisma`) |
| Admin UI | `/third-party-subscribers/*` in `libs/system-admin-pages/src/pages/third-party-subscribers` via `@hmcts/third-party-user` | `/manage-third-party-users` etc. in `apps/web/src/pages/(system-admin)/*third-party*` via `libs/system-admin-pages/src/third-party-user/queries.ts` |
| Push path | `libs/third-party-subscription-fulfilment`: `findMatchingSubscriptions` → `sendPublicationToThirdParties` / `sendPublicationDeletionToThirdParties`. One OAuth request **per subscriber**, sent to that subscriber's configured destination URL | `libs/legacy-third-party-fulfilment`: `findSubscribersByListType` → `sendThirdPartyPublications` / `sendThirdPartyDeletion`. **One** mTLS request to the single `COURTEL_API_URL`, sent if *any* legacy subscriber exists for the list type |
| Callers | `libs/publication/src/processing/service.ts` (publish / update), `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts`, `libs/system-admin-pages/src/delete-court/service.ts` (delete) | `libs/publication/src/processing/service.ts`, `remove-list-confirmation` (delete-court does not call it) |

The two models have no FK or other link. Rows are created independently by their own create journeys. Neither is soft-deleted, and nothing in the code marks either as retired. The two push paths run side by side for every publication.

**Recommendation: `ThirdPartyUser` (`third_party_user`) is the source of truth for status. Leave the Courtel stack alone.**

- The `/third-party-subscribers` pages that this ticket extends already read and write `third_party_user`.
- `third-party-subscription-fulfilment` already gates delivery on `third_party_subscription`, and it is the direct port of `ThirdPartySubscriptionNotificationService`, the legacy service where the `ACTIVE` filter lives. One column on `third_party_user` therefore covers both "editable" and "gates delivery".
- The Courtel path sends one request per publication to a single fixed endpoint. A per-subscriber status cannot map onto it cleanly ("skip Courtel if all legacy subscribers are suspended" is not a legacy behaviour). Putting status there too would duplicate the column across unlinked models.
- Test connection (#829, branch `feature/829-Add-third-party-test-connection`, not yet merged) is built on `ThirdPartyUser` too (`testThirdPartyConnection(userId)` reads the OAuth config from `third_party_secret`). It does not check status, so "works regardless of status" holds as long as we do not add a check.

Agreed on 2026-11-09 after the pip comparison (see below).

### Strategy

1. Schema: add `status` to `ThirdPartyUser`, defaulting to `PENDING`. No backfill (pip parity, and there are no existing subscribers).
2. Domain (`libs/third-party-user`): add the status constants, a type guard and `updateThirdPartyUserStatus`. Return `null` from `findThirdPartyUserById` for non-UUID ids, so unknown or malformed ids redirect instead of throwing.
3. Delivery (`libs/third-party-subscription-fulfilment`): `findMatchingSubscriptions` also selects `status`. The shared `findSubscribers` helper, which both send functions use, drops anything not `ACTIVE` and logs each skip with the subscriber id. The filter lives in one place, not in each caller. See section 3 for why the filter is not in the SQL `where`.
4. Pages: add a Status row with a Change link to the manage page, plus new `[id]/status` and `[id]/status/success` pages in `libs/system-admin-pages`, following the local third-party-subscribers conventions.
5. Audit: a direct `logAction` on GET (pip audits the view as `VIEW_THIRD_PARTY_SUBSCRIBERS_STATUS`) and an explicit `req.auditMetadata` on POST, as the subscriptions, delete and OAuth pages already do. Pip does not audit the update, so that part goes beyond pip because the ticket's AC asks for it.

### Decisions agreed after comparing with pip (2026-11-09)

Checked against pip-frontend (`ManageThirdPartySubscriberStatusController`, `manage-third-party-subscriber-status(-success).njk` and their locales) and pip-account-management (`V1.15__add_status_column_to_api_user.sql`, `ThirdPartyUserController` `PATCH /{userId}/status`, `ThirdPartySubscriptionNotificationService`).

| Topic | Pip behaviour | Decision |
|---|---|---|
| Source of truth | Status lives on `api_user` and gates only the per-subscriber third-party path. The legacy path runs alongside it with no status check | `third_party_user` owns status. The Courtel stack (`legacy_third_party_user`, `legacy-third-party-fulfilment`) is untouched |
| Default / backfill | `ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING'`, no backfill | Match pip: default `PENDING`, no backfill. There are no existing subscribers, so delivery is not interrupted. **This overrides the ticket AC "existing subscribers set to ACTIVE".** |
| Input control | `<select>` with PENDING/ACTIVE/SUSPENDED, title-cased | Match pip: `govukSelect`. **This overrides the ticket AC "use radios".** |
| Wording | See content table below | Match pip wording (trimmed of pip's leading spaces) |
| Validation | None, because a select always submits a value | Keep the server-side check: a missing or tampered value re-renders with "Select a status" |
| Unknown id | Renders the generic error page | Follow the ticket: redirect to `/third-party-subscribers` |
| Cancel | `govuk-button--warning` link back to the subscriber view page | Match pip: warning-styled link button to the manage page |
| Audit | View audited in frontend; update not audited anywhere | Audit both (ticket AC) |
| Delivery filter | Filtered in code per subscriber, after the subscription lookup. Skips are silent | Filter in the shared `findSubscribers` helper and log each skip with the subscriber id (ticket AC) |
| Test connection | `handleThirdPartyHealthCheck` never checks status | No status check in #829's connection test |

### Branching and sequencing

- Build on **PR #1215** (`feature-568-cache-oauth-access-tokens`). `libs/third-party-subscription-fulfilment`, where the delivery filter goes, only exists there and not on master. The current branch `feature-830-update-status-for-third-party-subscriber` already contains #1215.
- **PR #1324** (#829 test connection) is not a base. It does not contain the fulfilment lib. It edits `[id]/manage/index.ts`, `index.njk`, `en.ts` and `cy.ts` and adds `index.njk.test.ts`, the same files this ticket touches. Whichever of #1324 and this branch merges second rebases and resolves the manage-page conflicts.

### Key considerations

- **Behaviour change on release:** every subscriber, new or existing, gets nothing until an admin sets it to Active. There are no subscribers today, so nothing stops.
- String column, not a Prisma enum. The repo has no Prisma `enum` anywhere, and the closest precedent is `MediaApplication.status String @default("PENDING") @db.VarChar(20)`. Allowed values are enforced in the application by a single `THIRD_PARTY_USER_STATUSES` constant.

## 2. Implementation Details

### TEMPLATE SOURCE

> TEMPLATE SOURCE: migrate from pip-frontend src/main/views/system-admin/manage-third-party-subscriber-status.njk and src/main/views/system-admin/manage-third-party-subscriber-status-success.njk (controllers: src/main/controllers/system-admin/ManageThirdPartySubscriberStatusController.ts, ManageThirdPartySubscriberStatusSuccessController.ts). Note: ticket requires GOV.UK radios instead of the legacy `<select>`.

Superseded after the pip comparison: keep pip's `<select>` (rendered with `govukSelect`) and pip's wording.

### Prisma schema

`libs/postgres-prisma/prisma/schema/third-party-user.prisma`:

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

The column is `status`, which is already singular snake_case, so no `@map` is needed. No index: the table is tiny and the fulfilment query joins from `third_party_subscription`.

### Migration

`apps/postgres/prisma/migrations/<timestamp>_add_third_party_user_status/migration.sql`, generated by `yarn db:migrate:dev` and used as-is. Same as pip `V1.15`:

```sql
ALTER TABLE "third_party_user" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
```

No backfill. Any row that exists becomes PENDING, which is acceptable because there are no subscribers today.

### Domain: `libs/third-party-user`

- New `src/subscriber-status.ts`:
  - `export const THIRD_PARTY_USER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;`
  - `export type ThirdPartyUserStatus = (typeof THIRD_PARTY_USER_STATUSES)[number];`
  - `export function isThirdPartyUserStatus(value: unknown): value is ThirdPartyUserStatus`
  - Co-located `subscriber-status.test.ts`.
- `src/third-party-user-service.ts`:
  - `updateThirdPartyUserStatus(id: string, status: ThirdPartyUserStatus)` → `prisma.thirdPartyUser.update({ where: { id }, data: { status } })`
  - `findThirdPartyUserById`: return `null` without querying when `id` is not a UUID. Today Postgres raises `invalid input syntax for type uuid` and every `[id]` page returns a 500.
  - `findThirdPartyUserById` uses `include`, so `status` comes back automatically. No select change.
- `src/index.ts`: export the new functions, constant and type.

### Delivery: `libs/third-party-subscription-fulfilment/src/fulfilment`

- `queries.ts`, `findMatchingSubscriptions`: select `thirdPartyUser: { select: { id: true, name: true, status: true } }`, and add `status: string` to `Subscriber`.
- `service.ts`, `findSubscribers`:
  - Partition the subscribers by `status === "ACTIVE"`.
  - For each non-active subscriber, call `console.info(\`${logPrefix} Third-party subscriber skipped: status is not ACTIVE\`, { userId, status, artefactId })`.
  - Return only the active ones.
  - Keep the existing "no matching subscribers" log for an empty active list.
- `sendPublicationToThirdParties` (new and updated) and `sendPublicationDeletionToThirdParties` (deleted) both go through `findSubscribers`, so all three AC delivery events are covered by one change. Compare against the literal `"ACTIVE"` from `@hmcts/third-party-user` (already a dependency) so the value is defined once.
- `libs/legacy-third-party-fulfilment`: no change (Courtel stack out of scope).

### Pages: `libs/system-admin-pages/src/pages/third-party-subscribers`

| Route | Directory | Methods |
|---|---|---|
| `/third-party-subscribers/:id/manage` | `[id]/manage/` (existing) | GET (POST added by #829) |
| `/third-party-subscribers/:id/status` | `[id]/status/` (new) | GET, POST |
| `/third-party-subscribers/:id/status/success` | `[id]/status/success/` (new) | GET |

Every handler is exported as `[requireRole([USER_ROLES.SYSTEM_ADMIN]), handler]`. Each page uses co-located `en.ts`/`cy.ts`, `...t` spread into render, and `lngParam` for Welsh, the same as the sibling pages. Render paths are `third-party-subscribers/[id]/status/index` and `third-party-subscribers/[id]/status/success/index`.

**Manage page (`[id]/manage`):**

- Controller: pass `status` and `statusLabel: t.statuses[user.status]`, with a fallback to the raw value if the stored status is unknown.
- Template: add a Status row to the summary list after Created date:
  ```
  { key: { text: tableHeadings.status }, value: { text: statusLabel },
    actions: { items: [{ href: "/third-party-subscribers/" + userId + "/status" + lngParam,
                         text: change, visuallyHiddenText: tableHeadings.status }] } }
  ```
- `en.ts`/`cy.ts`: add `tableHeadings.status` ("Status" / "Statws"), `change` ("Change" / "Newid"), and `statuses: { PENDING, ACTIVE, SUSPENDED }`.

**Status page (`[id]/status`):**

- GET:
  - Look up the user. If not found, redirect to `/third-party-subscribers${lngParam}`.
  - Render the select with `selectedStatus = user.status`.
  - Write the view audit entry with `VIEW_THIRD_PARTY_SUBSCRIBER_STATUS`.
- POST:
  - Look up the user. If not found, redirect to the list.
  - If `isThirdPartyUserStatus(req.body.status)` is false, re-render with `errors = [{ text: t.errorSelectStatus, href: "#status" }]` and nothing selected. The audit middleware records this automatically as `validation_error`.
  - Otherwise:
    - call `updateThirdPartyUserStatus`
    - set `req.auditMetadata = { shouldLog: true, action: AuditLogAction.UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS, entityInfo: \`Name: ${user.name}, ID: ${id}, Before: ${user.status}, After: ${status}\` }`
    - redirect to `/third-party-subscribers/${id}/status/success${lngParam}`.
- Template, modelled on `[id]/delete/confirmation/index.njk`:
  - back link to the manage page
  - `govukErrorSummary` when errors exist
  - `<h1 class="govuk-heading-l">{{ pageTitle }}</h1>` ("Manage User Status", from pip).
  - `<form method="post" novalidate>` containing a `govukSelect` with `id: "status"`, `name: "status"`, `label: { text: statusLabel }` ("Status"). The three items are PENDING / ACTIVE / SUSPENDED with the title-cased labels (as pip's `titleCase` filter renders them), and `selected` is driven by `selectedStatus`. No empty option, matching pip. `errorMessage` is the inline "Select a status".
  - `govuk-button-group` containing a `govukButton` "Confirm" and a "Cancel" link styled `govuk-button govuk-button--warning` with `role="button"` (pip markup), pointing at `/third-party-subscribers/{{ userId }}/manage{{ lngParam }}`. Cancel is a plain GET link, so nothing is saved and nothing is audited.
- `pageTitle` is "Manage User Status", used for both `<title>` and the H1, as the sibling pages do. Pip's `<title>` reads "Manage party subscriber status", which does not match its own H1; we use the H1 text for both. Content is in the table below.

**Success page (`[id]/status/success`):**

- GET renders a `govukPanel` (`titleText: panelTitle`, `text: panelBody`). It is followed by `<p class="govuk-body">{{ furtherUpdateText }}</p>` and a link to `/third-party-subscribers{{ lngParam }}`. Same pattern as `[id]/subscriptions/success`.
- No user lookup is needed. It mirrors the subscriptions success page, which also does not look up the user.

**Content.** English is pip's wording (pip's leading spaces trimmed). Pip's `cy` files are English copies, so the Welsh is new and needs translator sign-off (C5):

| Key | en (pip) | cy (proposed) |
|---|---|---|
| status.pageTitle | Manage User Status | Rheoli Statws Defnyddiwr |
| status.statusLabel | Status | Statws |
| statuses.PENDING / ACTIVE / SUSPENDED | Pending / Active / Suspended | Yn yr arfaeth / Gweithredol / Wedi'i atal |
| confirmButton / cancelLink | Confirm / Cancel | Cadarnhau / Canslo |
| back | Back | Yn ôl |
| errorSummaryTitle | There is a problem (not in pip, no validation there) | Mae yna broblem |
| errorSelectStatus | Select a status (not in pip) | Dewiswch statws |
| success.pageTitle / panelTitle | Third Party Account Status Updated | Statws Cyfrif Trydydd Parti wedi'i Ddiweddaru |
| success.panelBody | Third party account status has been successfully updated. | Mae statws y cyfrif trydydd parti wedi'i ddiweddaru'n llwyddiannus. |
| success.furtherUpdateText | To further update third party account, you can go to: | I ddiweddaru'r cyfrif trydydd parti ymhellach, gallwch fynd i: |
| success.manageSubscriberLink | Manage third party subscriber | Rheoli tanysgrifiwr trydydd parti |

The success link points at `/third-party-subscribers{{ lngParam }}`, the subscriber list. Pip links to `manage-third-party-subscribers`, the list, even though the text is singular.

### Audit

- `libs/system-admin-pages/src/audit-log/logger.ts`: add `UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS = "Update third party subscriber status"`, plus `VIEW_THIRD_PARTY_SUBSCRIBER_STATUS = "View third party subscriber status"` if C2 confirms view auditing.
- `auditLogMiddleware` skips GET by design, and no page in the repo audits a view today. To meet the AC, the GET handler calls `logAction({ userId, userEmail, userRole, userProvenance, action, details: \`Name: ${user.name}, ID: ${id}\` })` directly, using `req.user` the same way the middleware does. Wrap it in try/catch with `console.error`, so an audit write failure does not block the page. That matches how the middleware treats completion-log failures.

### Test support

- `libs/test-support/src/routes/test-support/third-party-users.ts`, POST: accept an optional `status` validated by `isThirdPartyUserStatus`, so E2E can seed a known status. With no status, the DB default (PENDING) applies.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| No `status` in body | Re-render with error summary and inline "Select a status" (href `#status`). Nothing selected. No DB write. Middleware logs `validation_error` |
| `status` not one of the three values (tampered, lowercase, array) | Same as above. `isThirdPartyUserStatus` rejects non-strings and wrong case |
| Unknown subscriber id (GET or POST, status or success) | Redirect to `/third-party-subscribers` (with `?lng=cy` when Welsh). Success page: no lookup, matching siblings |
| Malformed (non-UUID) id | `findThirdPartyUserById` returns `null` → same redirect, not a 500 |
| Subscriber deleted between POST lookup and update | `prisma.update` throws P2025 → global error page. Rare admin race, accepted. No silent success |
| Same status resubmitted | Treated as a valid update: success page, audit shows `Before: X, After: X` (legacy parity) |
| Stored status outside the three values (manual DB edit) | Manage page shows the raw value. Status page select falls back to its first option (Pending), as any select with no match does. Delivery skips it because it is not `ACTIVE` |
| Non-system-admin | `requireRole` handles it (existing behaviour) |
| Welsh | All redirects keep `lngParam`. Cancel and back links keep `lngParam` |
| Delivery: all matching subscribers non-active | Each skip is logged with `userId`, then the existing "no matching subscribers" log fires. No request is sent and no error is raised |
| Delivery: subscriber suspended mid-flight | Status is read once per publication by the query. In-flight retries for that publication complete. Acceptable |
| Test connection | `testThirdPartyConnection` does not read status, so it is unaffected |

**Why the ACTIVE filter is not in the SQL `where`:** the ticket asks for the filter in the subscriber query, but it also requires each skip to be logged with the subscriber id. A `where: { thirdPartyUser: { status: "ACTIVE" } }` hides the skipped rows, so they cannot be logged. The query returns `status`, and the single shared `findSubscribers` helper filters and logs. That is still one place, not per caller. Agreed after the pip comparison: pip also filters in code, not SQL.

## 4. Acceptance Criteria Mapping

| AC | Implementation | Verified by |
|---|---|---|
| Three statuses PENDING / ACTIVE / SUSPENDED | `THIRD_PARTY_USER_STATUSES`, `isThirdPartyUserStatus` | `subscriber-status.test.ts` |
| New subscriber defaults to PENDING | Column default `'PENDING'` | Migration review. E2E creates a user and sees "Pending" on the manage page |
| ~~Existing subscribers set to ACTIVE on release~~ | **Dropped:** no backfill, matching pip. There are no existing subscribers | Migration SQL review: a single `ADD COLUMN ... DEFAULT 'PENDING'` |
| Manage page Status row with Change link | Summary list row + actions | `manage/index.test.ts` (statusLabel passed), manage njk test (row, label, href, visually hidden text, cy) |
| Status page: System Admin only | `requireRole([SYSTEM_ADMIN])` on GET and POST | Controller tests assert middleware array |
| Title and H1 (pip wording: "Manage User Status") | `pageTitle` used for `<title>` and H1 | njk test, E2E |
| Current status pre-selected | `selectedStatus = user.status` | Controller and njk tests (selected option), E2E |
| Confirm saves; Cancel returns without saving | POST → update + redirect; Cancel link → manage | Controller test. E2E clicks Cancel and checks status unchanged |
| ~~GOV.UK radios not select~~ | **Changed:** `govukSelect`, matching pip | njk test asserts one `select#status` with 3 options and no radios |
| No / invalid value → error summary + inline "Select a status" | `isThirdPartyUserStatus` guard | Controller tests (missing, invalid), njk test (summary + inline) |
| Unknown id → `/third-party-subscribers` | Lookup null → redirect | Controller tests (GET, POST, malformed UUID) |
| Success panel and further-update link (pip wording) | `govukPanel` + paragraph + link to `/third-party-subscribers` | Success controller and njk tests, E2E |
| Only ACTIVE subscribers receive pushes (new, updated, deleted) | `findSubscribers` filter | `fulfilment/service.test.ts` for publish, update and delete |
| PENDING / SUSPENDED skipped without error, logged with id | `console.info` per skip | Service tests assert no request sent, no throw, log called with `userId` |
| Test connection works regardless of status | No status check in `testThirdPartyConnection` (pip's health check does not check status either) | Once #1324 merges, add a test running the connection test for a PENDING subscriber |
| View and update audited | Direct `logAction` on GET, `auditMetadata` on POST | Controller tests assert `logAction` call and `req.auditMetadata` |
| Welsh for all new content | `cy.ts` for every page | Locale key parity tests, cy njk tests, E2E `?lng=cy` |

## 5. Test Scenarios

### Unit / integration (Vitest)

1. `subscriber-status.test.ts`: accepts each of the three values; rejects `undefined`, `""`, `"active"`, `"DELETED"`, arrays and numbers.
2. `third-party-user-service.test.ts`:
   - `updateThirdPartyUserStatus` calls `prisma.thirdPartyUser.update` with id and status
   - `findThirdPartyUserById` returns `null` without querying for a non-UUID id
3. `fulfilment/queries.test.ts`: `findMatchingSubscriptions` selects `status` and maps it onto `Subscriber`.
4. `fulfilment/service.test.ts`:
   - publish, update and delete each deliver only to ACTIVE subscribers
   - a mixed set sends one request per ACTIVE subscriber and logs a skip for each PENDING / SUSPENDED one with `userId`
   - if every subscriber is non-active, no request is sent and nothing throws
5. `[id]/manage/index.test.ts`: passes `statusLabel` for each status, in en and cy, and falls back to the raw value for an unknown status.
6. `[id]/manage/index.njk.test.ts`: Status row value, Change link href with and without `?lng=cy`, visually hidden "Status", Welsh labels. Create this file if #1324 has not merged, otherwise extend it.
7. `[id]/status/index.test.ts`:
   - GET renders with the current status selected
   - GET writes the view audit, and an audit failure still renders the page
   - GET with an unknown or malformed id redirects (en and cy)
   - POST with a valid status updates, sets `auditMetadata` with before/after, and redirects to success (en and cy)
   - POST with a missing status re-renders with the error and does not update
   - POST with an invalid status re-renders with the error and does not update
   - POST with an unknown id redirects to the list and does not update
   - POST with the same status succeeds
   - both GET and POST are wrapped by `requireRole`
8. `[id]/status/index.njk.test.ts`:
   - H1 "Manage User Status" and the "Status" label
   - one `select#status` with three options (Pending, Active, Suspended) and the correct one `selected`
   - no radios
   - error summary and inline error present when there are errors and absent when not
   - Confirm button, and Cancel as a warning-styled link to the manage page
   - back link
   - Welsh render
   - en/cy key parity
9. `[id]/status/success/index.test.ts` and `index.njk.test.ts`: panel title "Third Party Account Status Updated" and body, further-update text, "Manage third party subscriber" link to `/third-party-subscribers` with `lngParam`, Welsh, key parity.
10. `audit-log/logger.test.ts`: new enum values exist (only if the existing tests enumerate the actions).

### E2E (Playwright): one journey

New spec `e2e-tests/tests/system-admin/third-party-subscriber-status.spec.ts`, not the existing `third-party-user-management.spec.ts`. That file's `describe` block was set to `.skip` in #669 (an unrelated UT publishing PR) with no reason given, so a test added there would never run. This follows #1324, which also put test connection in its own spec.

**"system admin can change a third party subscriber's status @nightly"**:

1. Seed a subscriber through test-support with no status, so the default PENDING applies.
2. Open `/third-party-subscribers/:id/manage` and check the Status row shows "Pending".
3. Click Change. Check the H1 "Manage User Status", that Pending is selected in the Status select, and run Axe.
4. Select Suspended and click Cancel. Check you are back on the manage page and it still shows "Pending".
5. Change again and switch to Welsh (`?lng=cy`). Check the Welsh H1 and labels, then switch back.
6. Select Active and click Confirm. On the success page check the panel text "Third Party Account Status Updated" and run Axe. Follow the "Manage third party subscriber" link to the subscriber list.
7. Reopen the manage page and check it shows "Active". Clean up the subscriber.

The "Select a status" error cannot be reached through the UI, because the select has no empty option. Controller and template tests cover it.

## 6. CLARIFICATIONS NEEDED

Resolved on 2026-11-09 after comparing with pip (see "Decisions agreed after comparing with pip" in section 1):

- C1 source of truth: `third_party_user`. The Courtel stack is out of scope.
- C2 auditing: audit both the view (as pip does) and the update (ticket AC).
- C3 filter location: in the shared `findSubscribers` helper, as pip filters in code. Skips are logged.
- C4 sequencing: build on PR #1215. Whichever of #1324 and this branch merges second rebases the manage-page changes.
- C6 E2E: new spec file, not the skipped block.
- C7 backfill: none. Default PENDING, matching pip. There are no existing subscribers.
- Also decided: use a select (pip) instead of radios, and use pip's wording. The ticket AC should be updated for the backfill, radios and wording changes.

Still open:

1. **C5, Welsh.** Pip's `cy` files are English copies, so the proposed Welsh strings in section 2 are new and need sign-off from the Welsh translation team before release.
