# Code Review: Issue #830 - Third party subscriber status (Pending / Active / Suspended)

Scope: the uncommitted #830 work on `feature-830-update-status-for-third-party-subscriber`. The #1215 commits this branch is built on were not reviewed. The Courtel stack (`legacy_third_party_user`, `libs/legacy-third-party-fulfilment`) is out of scope by agreement, and is unchanged.

## Summary

The change is small and fits the code around it. It adds a `status` column to `ThirdPartyUser` (`VARCHAR(20) NOT NULL DEFAULT 'PENDING'`), a status type guard, and `updateThirdPartyUserStatus`. It adds a Status row with a Change link on the manage page, plus new `[id]/status` and `[id]/status/success` pages. An ACTIVE-only filter goes into the single shared `findSubscribers` helper.

I traced every OAuth third-party push through that helper:
- new and updated publications: `libs/publication/src/processing/service.ts:926`
- remove list: `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts:146`
- delete court: `libs/system-admin-pages/src/delete-court/service.ts:95`

So one filter covers all three delivery events.

Checks run:
- Typecheck is clean for all four libs.
- Biome is clean on the changed files. The only warning is at `e2e-tests/utils/test-support-api.ts:4`, which was already there before this change.
- All 877 unit tests in the four workspaces pass.

There are no code defects that would block release. The one partial AC is "Test connection works regardless of status". The #829 test-connection code is not on this branch, so that AC cannot be shown to work yet. That makes it NEEDS CHANGES under the review rules, but it is a dependency on another PR, not a mistake in this work.

### Correctness checks requested

| Question | Finding |
|---|---|
| Does every third-party push go through the ACTIVE filter? | Yes. `sendPublicationToThirdParties` (`service.ts:41`) and `sendPublicationDeletionToThirdParties` (`service.ts:80`) both call `findSubscribers`, which filters at `service.ts:107` and returns only active subscribers at `service.ts:116`. `findMatchingSubscriptions` has no other callers. Delete-court (`delete-court/service.ts:95`) and remove-list (`remove-list-confirmation/index.ts:146`) both call `sendPublicationDeletionToThirdParties`. |
| Is test connection unaffected? | Nothing in this change reads status outside `findSubscribers`. `testThirdPartyConnection` does not exist on this branch (grep finds nothing), so this cannot be tested here. See HIGH-1. |
| Does the POST reject tampered values? | Yes. `isThirdPartyUserStatus` (`libs/third-party-user/src/subscriber-status.ts:3-5`) needs a string that exactly matches one of the three values. Missing, empty, lowercase, unknown and array values all re-render with the error and no DB write (`status/index.ts:35-38`, tests at `status/index.test.ts:185-212`). The test-support POST uses the same guard (`third-party-users.ts:29-31`). |
| Is the before/after audit correct? | Yes. `user.status` is read before the update (`status/index.ts:30`), and `entityInfo` records `Before: ${user.status}, After: ${status}` (`status/index.ts:42-46`). The middleware picks it up through `extractEntityInfo` layer 1 (`audit-log/middleware.ts:238-240`). `auditMetadata` is set only after `updateThirdPartyUserStatus` succeeds, so a failed write records no "success" entry. |
| Does the GET view audit fail safely? | Yes. `logStatusView` wraps `logAction`, which re-throws (`logger.ts:51-54`), in a try/catch that logs and carries on (`status/index.ts:51-64`). This is tested at `status/index.test.ts:119-129`. |
| Does the non-UUID guard in `findThirdPartyUserById` break other pages? | No. On `[id]/manage`, `[id]/delete/confirmation` and `[id]/subscriptions/manage`, a malformed id now redirects to the list instead of raising a Postgres `invalid input syntax for type uuid` 500. This is an improvement. `[id]/oauth-config` and `[id]/oauth-config/summary` fall back to `prisma.legacyThirdPartyUser.findUnique` (`oauth-config/index.ts:26`, `summary/index.ts:52`). `LegacyThirdPartyUser.id` is also `@db.Uuid` (`base.prisma:97`), so a malformed id still throws there, which is the same 500 as before. Valid legacy UUIDs pass the regex and fall through as before. The `apps/web/(system-admin)` pages use a different `findThirdPartyUserById` (`libs/system-admin-pages/src/third-party-user/queries.ts:24`) and are unaffected. |
| Is the Prisma schema in sync with the migration? | Yes. `third-party-user.prisma:4` (`String @default("PENDING") @db.VarChar(20)`, required) matches `migration.sql:2` (`VARCHAR(20) NOT NULL DEFAULT 'PENDING'`). The migration is the latest by timestamp. The generated client includes `status` (`libs/postgres-prisma/generated/prisma/index.d.ts:29249`). |

## 🚨 CRITICAL Issues

None. No ACs are unmet, and there are no security, accessibility or data-integrity defects.

## ⚠️ HIGH PRIORITY Issues

1. **AC "Test connection (#829) works regardless of status" is only partly shown** (see the AC list below).
   - **What's done:** the only status check is in `libs/third-party-subscription-fulfilment/src/fulfilment/service.ts:107-109`, which is on the push path only. No status check was added anywhere a connection test could reach.
   - **What's missing:** #829's `testThirdPartyConnection` is not on this branch, so no test runs a connection test for a PENDING subscriber. This is the unchecked task "Once #1324 is merged: add a test showing the connection test runs for a PENDING subscriber".
   - **Impact:** someone could later add a status check to the connection path (or #1324 could include one) and break onboarding without any test failing.
   - **Recommendation:** after rebasing onto #1324, add a unit test that calls the test-connection handler or service with a `status: "PENDING"` user and checks the request is sent. Also confirm #1324's code has no status check.

## 💡 SUGGESTIONS

1. **Use the type guard, not an `as` assertion, on the manage page.** `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/manage/index.ts:28` uses `user.status as keyof typeof t.statuses`. `isThirdPartyUserStatus` is already exported. This avoids the assertion, which CLAUDE.md lists as an anti-pattern:
   ```ts
   statusLabel: isThirdPartyUserStatus(user.status) ? t.statuses[user.status] : user.status
   ```
2. **Keep the current status selected when re-rendering after an error.** `status/index.ts:37` passes `undefined` as `selectedStatus`. A select with no `selected` option shows its first option (Pending), so after a tampered POST the page suggests the subscriber is Pending, and pressing Confirm would set Pending. Passing `user.status` keeps the page truthful. The error path can only be reached by tampering, so the impact is low. The test at `status/index.test.ts:191-212` and the njk test at `status/index.njk.test.ts:138` would need updating.
3. **Name the validation-failure audit entry properly.** On a validation failure, `auditMetadata` is not set before `res.render`. The middleware's completion entry then falls back to a path-based action name, `THIRD_PARTY_SUBSCRIBERS_<uuid>_STATUS` (`middleware.ts:159-175`), so the UUID ends up in the action. Setting `req.auditMetadata = { action: AuditLogAction.UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS, entityInfo: ... }` before the validation check at `status/index.ts:36` would group failures under the right action. The sibling pages have the same gap, so this is optional.
4. **The view audit stores a different action format.** `logStatusView` stores the raw enum value "View third party subscriber status" (`status/index.ts:58`). Middleware entries are normalised to `UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS` (`middleware.ts:155`), so the audit log shows two formats for one feature. `jurisdiction-management/service.ts:103-148` already does the same, so this follows precedent. Worth a follow-up if anyone filters the audit log by action.
5. **Guard against a missing `req.body`.** In Express 5, `req.body` is `undefined` when no body parser matches (for example, a POST with no content type). `status/index.ts:35` would then throw a TypeError and return a 500 instead of the validation error. `req.body?.status` fixes it. Sibling handlers have the same pattern (`create/index.ts:37`, `delete/confirmation/index.ts:53`).
6. **Misleading log when every subscriber is skipped.** When all matching subscribers are non-active, `service.ts:112-114` still logs "no matching subscribers", even though there were matches that were skipped. Something like "no ACTIVE subscribers" would make the logs clearer during onboarding.
7. **Cancel styled as a warning button.** `status/index.njk:41-45` gives Cancel `govuk-button--warning`. The Design System reserves warning (red) buttons for destructive actions, and a red Cancel next to a green Confirm reverses the usual signal. This was agreed for pip parity (plan.md section 1), so it is noted, not raised. A `govuk-button--secondary` or a plain `govuk-link` would match GOV.UK guidance if the decision is revisited.
8. **No "Error: " prefix in the page title on validation failure.** GOV.UK validation guidance asks for "Error: " at the start of `<title>` when errors are shown, so screen-reader users hear about the failure on page load. `components/page-title.njk` does not do this, and neither do any of the sibling pages, so this is a site-wide gap and not specific to this ticket.
9. **E2E gaps.** The journey runs Axe on the status page (en and cy) and the success page, but not on the manage page with the new Status row and Change link. It also does not check the Welsh success page. Adding `axeCheck` after the first manage-page load (`third-party-subscriber-status.spec.ts:23`) costs very little.
10. **`statusLabel` name clash between pages.** On the manage page, `statusLabel` is the translated status value (`manage/index.ts:28`). On the status page, `statusLabel` is the select's label text "Status" (`status/en.ts:3`). Different pages, so they cannot collide, but it is confusing when reading both. `statusText` or `statusValueLabel` on the manage page would be clearer.

## ✅ Positive Feedback

- The filter lives in one shared place (`findSubscribers`), with a clear reason for filtering in code rather than SQL: each skip has to be logged with the subscriber id. The skip log contains only `userId`, `status` and `artefactId`, with no sensitive data (`service.ts:109`).
- The status values are defined once (`THIRD_PARTY_USER_STATUSES`) and reused by the domain guard, the page's select items (`status/index.ts:81`), the fulfilment constant (`service.ts:12`) and the test-support route. This avoids scattered string literals.
- The non-UUID guard fixes a real 500 on every `[id]` page and is tested with injection-style input (`third-party-user-service.test.ts:73-81`).
- Strong tests:
  - `service.test.ts:437-509` uses one `it.each` over POST/PUT/DELETE to cover mixed, all-active and all-inactive sets, so all three delivery events are proven.
  - The njk tests assert on structure, not strings: select options, `selected`, error summary `href="#status"`, `govuk-select--error`, the visually hidden Change text, the Welsh `lngParam` on every link, and en/cy key parity at nested depth.
- Accessibility:
  - the select has a `<label for="status">` (tested at `status/index.njk.test.ts:57`)
  - the error summary links to the select id
  - the Change link has visually hidden context ("Change Status")
  - the form works without JavaScript (`method="post" novalidate`, plain link for Cancel)
  - output is autoescaped (`configure-govuk.ts:32`), and the success page back link uses `urlencode` on an unvalidated param (`success/index.njk:5`, tested at `success/index.njk.test.ts:63-67`)
- Every handler is `[requireRole([SYSTEM_ADMIN]), handler]`, and the tests check the middleware array.
- The E2E spec is one `@nightly` journey that covers:
  - the default Pending status
  - the Change link and pre-selection
  - Cancel with no save
  - Welsh
  - Axe
  - submitting with the keyboard
  - the success page and its link
  - checking the stored value through the API
  - cleanup in `finally`

  It follows `.claude/rules` closely.
- There is no circular dependency: `test-support` → `third-party-user` is one-way, and `system-admin-pages` only takes `test-support` as a dev dependency.

## Test Coverage Assessment

**Unit tests:** comprehensive.
- `subscriber-status.test.ts` covers the accepted and rejected values.
- `third-party-user-service.test.ts` covers the update and the UUID guard.
- `queries.test.ts` checks that `status` is selected.
- `service.test.ts` covers all three delivery events with mixed, all-active and all-inactive sets, plus an unknown status value.
- `status/index.test.ts` has 17 tests, covering role guard, pre-selection, en/cy, view audit and its failure, unknown id, update with before/after audit, same-status resubmit, five tampered values, and the Welsh error.
- `success/index.test.ts` and `manage/index.test.ts` cover the status label for each status in en/cy, the raw fallback, and the Welsh redirect.
- `test-support/third-party-users.test.ts` covers status passthrough and rejection.

The only gap is HIGH-1, the test-connection test.

**Template tests:** `manage/index.njk.test.ts` (10), `status/index.njk.test.ts` (15) and `status/success/index.njk.test.ts` (7). All use `createTestEnvironment` and Cheerio and include locale parity, as `.claude/rules/testing.md` requires.

**E2E tests:** `e2e-tests/tests/system-admin/third-party-subscriber-status.spec.ts` was assessed by reading it, because Playwright's global setup fails on this machine with `module is not linked` (existing specs fail the same way).
- Selectors are role- and label-based. `getByLabel("Status", { exact: true })` avoids matching "Manage User Status".
- The `**${statusUrl}/success` and `**/third-party-subscribers` waits are correct, because the English path adds no `lngParam`.
- The Cancel locator `getByRole("button", { name: "Cancel" })` works because `govukButton` with `href` renders `role="button"`.
- As planned, the spec does not reach the "Select a status" error through the UI, because the select has no empty option. The unit and template tests cover it.

**Accessibility tests:** inline Axe (WCAG 2.2 AA tags, `axe-helper.ts:9`) on the status page in en and cy, and on the success page. Keyboard submit is covered. Axe is not run on the updated manage page (suggestion 9).

**Statement coverage per changed workspace** (vitest `--coverage`, `Statements :` line):

| Workspace | Statements | Branches | Status |
|---|---|---|---|
| `@hmcts/third-party-user` | 98.46% (64/65) | 100% | OK |
| `@hmcts/third-party-subscription-fulfilment` | 100% (189/189) | 97.43% | OK |
| `@hmcts/system-admin-pages` | 93.66% (1302/1390) | 84.47% | OK |
| `@hmcts/test-support` | 98.55% (545/553) | 95.42% | OK |

New pages: `[id]/status` has 100% statements and 76.92% branches. The uncovered branches are the `req.user?.x || fallback` defaults in `logStatusView`, which `requireRole` makes unreachable. `[id]/status/success` has 100% statements and 83.33% branches. No workspace is below 80%.

## Acceptance Criteria Verification

Status values and defaults
- [x] A third-party subscriber has one of three statuses: `PENDING`, `ACTIVE`, `SUSPENDED`. See `libs/third-party-user/src/subscriber-status.ts:1-7` and `libs/postgres-prisma/prisma/schema/third-party-user.prisma:4`. The values are enforced in the app because there is no Prisma enum, following the `MediaApplication.status` precedent.
- [x] A newly created subscriber defaults to `PENDING`. See `apps/postgres/prisma/migrations/20261109115311_add_third_party_user_status/migration.sql:2` and `third-party-user.prisma:4`. `createThirdPartyUser` does not set status (`third-party-user-service.ts:38`), and the E2E test checks "Pending" on a newly created subscriber (`third-party-subscriber-status.spec.ts:23`).
- [x] (changed by agreement — plan.md section 1) Existing subscribers already receiving pushes are set to `ACTIVE` when this is released. **Agreed behaviour:** no backfill, matching pip `V1.15`, because there are no existing subscribers. Verified: the migration is a single `ADD COLUMN ... DEFAULT 'PENDING'` with no `UPDATE` (`migration.sql:1-2`). **Deviation:** any row that already exists becomes PENDING and stops receiving pushes until an admin activates it.

Manage subscriber page (`/third-party-subscribers/:id/manage`)
- [x] The summary list shows a **Status** row (Pending / Active / Suspended) with a **Change** link. See `manage/index.njk:29-41`, `manage/index.ts:28`, `manage/en.ts:7,13-14` and `manage/cy.ts:7,13-14`. Tested at `manage/index.njk.test.ts:47-92`.

Change status page (`/third-party-subscribers/:id/status`)
- [x] Only System Admins can access it. See `status/index.ts:85-86` (`requireRole([USER_ROLES.SYSTEM_ADMIN])` on GET and POST) and `status/success/index.ts:20`.
- [x] (changed by agreement — plan.md section 1) The page title and H1 are "Manage subscriber status". **Agreed behaviour:** pip wording, "Manage User Status", for both `<title>` and the H1. Verified at `status/en.ts:2`, `status/index.njk:21` and `components/page-title.njk` (`pageTitle`). Tested at `status/index.njk.test.ts:41-47`. **Deviation:** the wording differs and is in title case, not GOV.UK sentence case.
- [x] The current status is pre-selected. See `status/index.ts:21` (`user.status`) and `status/index.ts:81` (`selected: value === selectedStatus`). Tested at `status/index.test.ts:57-80` and `status/index.njk.test.ts:64-70`, and in E2E at `spec.ts:31`.
- [x] The admin chooses one status and selects **Confirm**, and **Cancel** returns to the Manage subscriber page without saving. Confirm is at `status/index.njk:38-40`, and the POST updates and redirects at `status/index.ts:40-48`. Cancel is a GET link to `/third-party-subscribers/{id}/manage{lngParam}` (`status/index.njk:41-45`), so nothing is saved. The E2E test checks the value is still "Pending" after Cancel (`spec.ts:36-39`).
- [x] (changed by agreement — plan.md section 1) Use GOV.UK radios rather than the legacy `<select>`. **Agreed behaviour:** `govukSelect`, matching legacy pip. Verified at `status/index.njk:3,26-35`, with three options and no empty option. Tests check that one `select#status` and no radios render (`status/index.njk.test.ts:51-77`, `spec.ts:32`). **Deviation:** a select is used even though the Design System says to use selects only as a last resort.
- [x] If no status is submitted or the value is invalid, show an error summary and an inline error: "Select a status". See `status/index.ts:35-38`, `status/index.njk:14-19,23,34` and `status/en.ts:8`. The error summary links to `#status`, which matches the select id. Tested at `status/index.test.ts:185-223` and `status/index.njk.test.ts:127-139,160-165`.
- [x] An unknown subscriber id redirects to `/third-party-subscribers`. See `status/index.ts:15-17` (GET) and `status/index.ts:31-33` (POST). Malformed ids return `null` from `third-party-user-service.ts:16-18`. Tested at `status/index.test.ts:131-146,225-236`.

Success page (`/third-party-subscribers/:id/status/success`)
- [x] (changed by agreement — plan.md section 1) A GOV.UK confirmation panel: "Third party account status updated" / "Third party account status has been successfully updated." **Agreed behaviour:** pip wording, with panel title "Third Party Account Status Updated", rendered full width outside the two-thirds column as pip does. Verified at `status/success/index.njk:9-12` and `status/success/en.ts:3-4`. Tested at `status/success/index.njk.test.ts:34-43`, and in E2E at `spec.ts:58-59`. **Deviation:** title case, and the panel is not in a grid column.
- [x] (changed by agreement — plan.md section 1) Followed by "To further update third party account, you can go to:" with a link to **Manage third party subscribers**. **Agreed behaviour:** pip link text "Manage third party subscriber" (singular), pointing at the `/third-party-subscribers` list. Verified at `status/success/index.njk:14-17` and `status/success/en.ts:5-6`. Tested at `status/success/index.njk.test.ts:45-55`, and in E2E at `spec.ts:60,64-65`. **Deviation:** the link text is singular, while the AC has it plural.

Delivery
- [x] Only `ACTIVE` subscribers receive publication pushes (new, updated and deleted publications). See `libs/third-party-subscription-fulfilment/src/fulfilment/service.ts:107,116`, used by `service.ts:41` (new and updated) and `service.ts:80` (deleted). `queries.ts:38` selects `status`. All three push callers go through it (`publication/src/processing/service.ts:926`, `remove-list-confirmation/index.ts:146`, `delete-court/service.ts:95`). Tested at `service.test.ts:444-467`.
- [x] `PENDING` and `SUSPENDED` subscribers are skipped without error, and the skip is logged with the subscriber id. See `service.ts:108-110` (`console.info(..., { userId, status, artefactId })`). Tested at `service.test.ts:482-497`, which checks no fetch, no throw and no `console.error`.
- [~] Test connection (#829) works regardless of status, so a Pending subscriber can be verified before activation. **What's done:** the only status check is on the push path (`service.ts:107-109`), and no status check exists anywhere a connection test could reach. **What's missing:** #829's connection test is not on this branch, so there is no test with a PENDING subscriber (tasks.md section 8 is unchecked, and #1324 is pending). See HIGH-1.

Audit
- [x] Viewing the status page and updating the status are both written to the audit log, following the other third-party subscriber pages. The view is logged at `status/index.ts:19,51-64` (`VIEW_THIRD_PARTY_SUBSCRIBER_STATUS`, fail-safe). The update is logged at `status/index.ts:42-46` (`UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS`, with before/after), and is written by `auditLogMiddleware` (`middleware.ts:68-79`). The enum entries are at `audit-log/logger.ts:25,27`. Tested at `status/index.test.ts:104-129,150-170`.

Welsh
- [x] All content on the new pages is available in Welsh. See `status/cy.ts:1-10`, `status/success/cy.ts:1-8` and `manage/cy.ts:7,13-14`. Key-parity and no-placeholder tests are at `status/index.njk.test.ts:168-176`, `status/success/index.njk.test.ts:80-88` and `manage/index.njk.test.ts:106-114`. Welsh rendering is tested and checked in E2E at `spec.ts:44-49`. Translator sign-off (C5) is still outstanding as a release task, not a code gap.

**Tally:** 17 met (5 of them changed by agreement), 1 partial, 0 unmet, out of 18.

## Next Steps

- [ ] Rebase onto #1324 when it merges, and resolve the conflicts in `[id]/manage/index.ts`, `index.njk`, `en.ts`, `cy.ts` and `index.njk.test.ts`.
- [ ] Add the test that a PENDING subscriber's connection test runs (HIGH-1), and confirm #1324 has no status check.
- [ ] Optional: suggestions 1, 2 and 5 are one-line fixes. Suggestion 9 adds Axe on the manage page.
- [ ] Get the Welsh content signed off (C5).
- [ ] Ask the ticket author to update the ACs for the agreed changes: no ACTIVE backfill, select instead of radios, and pip wording.
- [ ] Do a manual keyboard-only and `?lng=cy` check of the status and success pages.

## Overall Assessment: NEEDS CHANGES

The code is correct, secure, accessible, and well tested at both unit and template level. All four workspaces have more than 93% statement coverage. The only thing holding back approval is the partial "test connection works regardless of status" AC, which depends on #1324 merging. Once the rebase is done and the PENDING-subscriber connection test is added, this should be ready to approve without further changes.
