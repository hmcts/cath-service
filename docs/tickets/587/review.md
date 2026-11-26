# Code Review: Issue #587

## Summary

Issue #587 completes the System Admin "delete court" journey: it unblocks the has-subscriptions / has-publications dead ends with dedicated confirmation pages, reverses the validation order so the publication error precedes the subscription error, redirects "No" back to `/delete-court`, sends best-effort System Admin notification emails on court/publication/subscription deletion, switches the location delete from soft to hard delete (dropping the `deleted_at` column), and deletes location metadata before the location.

The implementation is well structured and closely follows the plan. Business logic sits in `libs/` service/repository layers, controllers stay thin, content is co-located with the correct Welsh translations, and the test suite (unit + template + controller) is thorough. All seven acceptance criteria are met. All changed workspaces are comfortably above the 80% statement-coverage threshold.

Counts: 0 critical, 2 high priority, 6 suggestions. Acceptance criteria: 7 met, 0 partial, 0 unmet.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **E2E journey test is entirely skipped** — `e2e-tests/tests/system-admin/delete-court.spec.ts:74-75`
   - **Problem**: The whole `test.describe.skip("Delete Court Journey", ...)` block is skipped, including the new "user can clear blocking publications and subscriptions then delete the court" journey (lines 192-296). The E2E coverage for #587 therefore never runs in CI.
   - **Impact**: The most important integration path (blocked-state links → dedicated pages → success → continue → hard delete) has no executed end-to-end verification. Regressions in the multi-page session flow would go undetected.
   - **Solution**: Confirm whether the `.skip` is intentional (the task note allows that E2E requires infra and may not have been executed). If it is a temporary infra gate, add a tracked follow-up to re-enable it; if it can run, remove `.skip`. Do not leave a permanently skipped journey as the only E2E coverage.

2. **`@hmcts/web` coverage summary not produced because the workspace test run failed** — `apps/web/src/app.test.ts` ("should create an Express application")
   - **Problem**: `yarn test:coverage` exited non-zero on `@hmcts/web` due to a 10-second timeout in `app.test.ts > should create an Express application` (10003 ms). Because the run failed, the web workspace `All files` coverage table was not emitted. All #587 page tests themselves pass (delete-court-confirm 12, delete-court-publications 5, delete-court-subscriptions 5, both success pages 4 each).
   - **Impact**: The failing test appears to be a pre-existing flaky bootstrap timeout unrelated to #587 (every other app.test assertion passed), but it prevents a clean coverage measurement for the web workspace and would fail CI as-is.
   - **Solution**: Re-run `yarn workspace @hmcts/web test --coverage` in isolation to confirm the timeout is flaky and to capture the web statement %. If it reproduces, raise/track it separately since it is not caused by this ticket.

## 💡 SUGGESTIONS

1. **`deleteArtefactsByLocationId` deletes ALL artefacts; `hasActiveArtefacts` only counts non-expired ones** — `libs/publication/src/repository/queries.ts:206-215` vs `libs/location/src/repository/queries.ts:251-262`
   - The guard blocks deletion only when `displayTo > now` (active), but the cleanup removes every artefact for the location regardless of expiry. This is defensible (you want no orphaned artefacts before a hard delete) and matches the intent, but the asymmetry is worth a one-line comment so a future reader does not assume the two operate on the same set.

2. **Blob deletion in `deleteArtefacts` is fire-and-forget and swallows errors** — `libs/publication/src/repository/queries.ts:180-195`
   - Plan §3 stated a blob-store failure should "surface the error and abort the court deletion rather than half-completing." The current pre-existing code does not `await` the `deleteBlob` calls and catches/ignores failures, so the DB rows are deleted even if blob deletion fails, potentially leaving orphaned blobs. This is existing behaviour, not introduced by #587, but since #587 now composes it into a court-deletion flow it is worth confirming the divergence from the plan is accepted.

3. **`sendSystemAdminNotification` casts personalisation via `as unknown as TemplateParameters`** — `libs/notifications/src/notification/notification-service.ts:389`
   - The double cast defeats type checking on the personalisation object. Consider widening `TemplateParameters` or adding a dedicated system-admin parameter type so the five fields (`requester_email`, `attempted/succeeded`, `change-type`, `Additional_change_detail`, `env_name`) are type-checked rather than cast.

4. **`requester email` falls back to the literal string `"unknown"`** — `delete-court-confirm/index.ts:168`, `delete-court-publications/index.ts:95`, `delete-court-subscriptions/index.ts:95`
   - `req.user?.email ?? "unknown"` is acceptable given these routes are `requireRole([USER_ROLES.SYSTEM_ADMIN])`-guarded so `req.user` is effectively always present. The fallback is a reasonable defensive default; no change required, just flagging it is intentional.

5. **Repository/service naming inconsistency for the by-location subscription delete** — `libs/subscriptions/src/repository/queries.ts:184` (`deleteSubscriptionsByLocationIdRecord`) vs `service.ts:88` (`deleteSubscriptionsByLocationId`)
   - The `...Record` suffix on the query and the bare name on the service is a fine convention, but the service `deleteSubscriptionsByLocationId` first calls `findSubscriptionsByLocationId` only to early-return 0 and then calls a `deleteMany` that would itself return 0 anyway. The pre-fetch is a redundant round-trip; `deleteSubscriptionsByLocationIdRecord` alone already returns `count`. Minor performance/simplicity nit.

6. **Unrelated changes bundled into this branch (from a repo-wide `lint:fix`)** — the following are incidental Biome `!x || !x.y` → `!x?.y` optional-chaining rewrites and are NOT part of #587:
   - `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts`, `remove-list-search-results/index.ts`
   - `apps/web/src/pages/(list-types)/sjp-press-list/list-download-disclaimer.ts`, `require-verified-with-provenance.ts`
   - `libs/admin-pages/src/manual-upload/validation.ts`
   - `libs/api/src/middleware/oauth-middleware.ts`
   - `libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.ts`
   - `libs/system-admin-pages/src/audit-log/middleware.ts`

   These are behaviour-preserving and low-risk, but they broaden the diff. By contrast, the `deletedAt` filter removals in `libs/system-admin-pages/src/jurisdiction-management/queries.ts`, `reference-data-upload/repository/upload-repository.ts`, `reference-data-upload/services/download-service.ts`, and `libs/location/src/repository/location-reference-queries.ts` ARE legitimately in scope for requirement 6 (they must be removed or Prisma errors after the column drop). Consider splitting the pure lint churn into its own commit so the #587 diff stays focused.

## ✅ Positive Feedback

- **Validation reordering is clean and short-circuits correctly**: `validateLocationForDeletion` (`service.ts:29-61`) checks artefacts before subscriptions and does not even call `hasActiveSubscriptions` when artefacts exist. There is an explicit test asserting this (`service.test.ts:113-122`).
- **Hard delete + column drop done thoroughly**: the migration uses `DROP COLUMN IF EXISTS` (`migration.sql:2`), every `deletedAt: null` Location filter was removed (queries.ts, location-reference-queries.ts, jurisdiction-management/queries.ts, upload-repository.ts, download-service.ts), and no source file (only gitignored generated Prisma output) still references the dropped column. The `Location` model in `location.prisma` no longer has `deletedAt` while `ListType.deletedAt` is correctly retained.
- **Metadata-first delete is guarded**: `performLocationDeletion` (`service.ts:67-81`) only calls `deleteLocationMetadataRecord` when metadata exists, so it is a no-op when absent, with the cascade FK as backstop. Both branches are unit-tested (`service.test.ts:126-149`).
- **Notifications are genuinely best-effort**: `sendSystemAdminNotification` uses `Promise.allSettled`, logs per-recipient failures, and never throws (`notification-service.ts:370-401`), so a Notify outage cannot roll back a completed delete. Verified by the "should not throw when an email send fails" test.
- **Deletion link placement matches the requirement**: rendered as a plain `govuk-body` paragraph above the `<h1>` and outside the error summary, with the court name appended (`delete-court-confirm/index.njk:18-22`), and asserted for DOM order and non-membership of the error summary (`index.njk.test.ts`).
- **Welsh translations are present and real** (not placeholders) across all new/changed content files, with locale-key parity tests.
- **Session handling is correct**: success pages intentionally keep `session.deleteCourt` so "Continue deletion of {court}" works, while `delete-court-success` clears it (`delete-court-success/index.ts:19`). No stale-session path observed.
- **`listTypeName` vs `listTypeId` rule respected**: no numeric list-type IDs introduced in the #587 code paths.

## Test Coverage Assessment

- **Unit tests**: Strong. Service (`service.test.ts`) covers reversed order, artefact-before-subscription short-circuit, hard delete (delete not update), metadata present/absent, and per-flow notification payloads. Repository additions (`deleteArtefactsByLocationId`, `deleteSubscriptionsByLocationId(Record)`, `findSystemAdminEmails`, `deleteLocation`) and notification (`sendSystemAdminNotification`) all have targeted tests including the empty/no-admins and failure cases.
- **Template tests**: Excellent. `delete-court-confirm/index.njk.test.ts` asserts link text with appended court name, DOM placement above h1, exclusion from the error summary, Welsh link, absent-when-not-provided, and locale-key parity. New pages have their own `.njk.test.ts` and `index.test.ts`.
- **E2E / accessibility**: A complete blocked-state journey test exists (publications-first, then subscriptions, then delete) with inline `axeCheck` and Welsh checks — but the entire describe block is `.skip`-ped (see HIGH #1), so it does not execute.

Per-workspace statement coverage (from `yarn test:coverage`):

| Workspace | Statements % | Status |
|-----------|-------------|--------|
| @hmcts/system-admin-pages | 93.04 | OK (src/delete-court = 100%) |
| @hmcts/location | 92.19 | OK |
| @hmcts/subscriptions | 96.63 | OK |
| @hmcts/publication | 95.41 | OK |
| @hmcts/account | 100 | OK |
| @hmcts/notifications | 90.58 | OK |
| @hmcts/web | not emitted | ⚠️ run failed on flaky `app.test.ts` timeout unrelated to #587; all #587 page tests passed. Re-measure in isolation. |

No changed workspace with an emitted summary is below 80%.

## Acceptance Criteria Verification

- [x] **1. Court with subscriptions → link to delete subscriptions (not a dead end)** — `delete-court-confirm/index.ts:57-66,119-120` builds a `/delete-court-subscriptions` link on `ACTIVE_SUBSCRIPTIONS`; rendered at `index.njk:18-22`; dedicated page at `delete-court-subscriptions/index.ts`.
- [x] **2. Court with publications → link to delete publications** — `delete-court-confirm/index.ts:59-61` builds a `/delete-court-publications` link on `ACTIVE_ARTEFACTS`; dedicated page at `delete-court-publications/index.ts`; deletion composed via `deleteArtefactsByLocationId` (`libs/publication/src/repository/queries.ts:206-215`).
- [x] **3. When both exist, publication error before subscription error** — `service.ts:39-55` checks `hasActiveArtefacts` and returns before evaluating `hasActiveSubscriptions`; asserted at `service.test.ts:113-122`.
- [x] **4. "No" on delete-court-confirm → go to delete-court page** — `delete-court-confirm/index.ts:157-160` redirects to `/delete-court` (with `?lng=cy` preserved); E2E step 7 (`delete-court.spec.ts:134-138`) also asserts it.
- [x] **5. Send System Admin notification emails on court/publication/subscription deletion** — `performLocationDeletion`/`performLocationPublicationsDeletion`/`performLocationSubscriptionsDeletion` each call `findSystemAdminEmails` then `sendSystemAdminNotification` (`service.ts:75-103`); send implementation at `notification-service.ts:370-401`; template id via `getSystemAdminTemplateId` (`template-config.ts:51-53`).
- [x] **6. Hard-delete the court (not soft delete); remove the deleted_at column** — `deleteLocation` uses `prisma.location.delete` in a transaction (`libs/location/src/repository/queries.ts:264-270`); `deleted_at` removed from `location.prisma` Location model; migration `DROP COLUMN IF EXISTS "deleted_at"` (`migration.sql:2`); all Location `deletedAt: null` filters removed.
- [x] **7. Delete location metadata before deleting the location (don't leave orphan; don't block)** — `performLocationDeletion` (`service.ts:68-73`) deletes metadata (guarded no-op when absent) before `deleteLocation`; cascade FK (`location.prisma:129`) is a backstop; both branches tested (`service.test.ts:126-149`).

## Next Steps

- [ ] Decide the fate of the skipped E2E block (`delete-court.spec.ts:74`): re-enable, or record a tracked follow-up if infra-gated.
- [ ] Re-run `yarn workspace @hmcts/web test --coverage` in isolation to confirm the `app.test.ts` timeout is flaky and capture the web statement %.
- [ ] (Optional) Split the repo-wide `lint:fix` optional-chaining churn out of the #587 diff.
- [ ] (Optional) Add a comment clarifying that `deleteArtefactsByLocationId` clears all artefacts while `hasActiveArtefacts` guards only on active ones.
- [ ] Supply the real `GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN` value in each environment (accepted outstanding item; defaults to `""`).

## Overall Assessment

**NEEDS CHANGES** (advisory).

All seven acceptance criteria are fully met with strong unit/template coverage, sound hard-delete and notification design, correct session handling, and proper Welsh support. The verdict is NEEDS CHANGES only because the #587 end-to-end journey is entirely `.skip`-ped and the web workspace coverage could not be measured due to a (likely pre-existing, unrelated) flaky bootstrap timeout. Neither is a correctness defect in the feature code; once the E2E skip is resolved (or explicitly deferred with a tracked ticket) and the web test run is confirmed clean, this is ready to approve. Accepted non-blockers: real Notify template ID via env var, E2E requiring infra, and the deliberately out-of-scope subscriber-facing email.
