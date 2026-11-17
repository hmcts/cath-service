# Technical Plan: #1502 System Admin: hide and show a list type in CaTH

## 1. Technical Approach

### Strategy

Add a boolean `isHidden` (`is_hidden`, default `false`) to `ListType`. This is a separate flag from the existing `deletedAt` soft delete. A System Admin turns it on or off from the existing `manage-list-type` screen, via a new confirmation page. Every public read path then filters out artefacts whose list type is hidden. Admin and internal read paths stay as they are. Nothing is deleted or rewritten, so showing the list type again brings everything back unchanged.

### Architecture decisions

1. **Filter in the data layer, not in each controller.** Almost every public page that opens a publication by id goes through `getArtefactById` in `libs/publication/src/repository/queries.ts`:
   - `createListTypeHandler` and `createSimpleListTypeHandler` (all `(list-types)` pages)
   - `checkArtefactDataAccess` (SJP public list, SJP downloads and disclaimers)
   - `publication/[id]`
   - `flat-file-service` (`/hearing-lists/:locationId/:artefactId`, plus the PDF and Excel download API)

   Today `getArtefactById` has **no admin or internal callers**. Adding `listType: { isHidden: false }` to its `where` (switching `findUnique` to `findFirst`) makes every one of those paths return 404 through code they already have. A JSDoc comment on the function will say it is the public lookup and that hidden list types resolve to `null`.
2. **Fix the few public paths that skip `getArtefactById`:**
   - `apps/web/src/pages/(list-types)/sjp-press-list/index.ts` calls `prisma.artefact.findUnique` directly. Switch it to `getArtefactById`.
   - `libs/publication/src/authorisation/middleware.ts` `fetchArtefact` (`requirePublicationAccess`, used by `publication/[id]`). Add the same filter so it returns 404 and does not give a 403 first.
   - `libs/list-types/common/src/sjp/sjp-service.ts` `getSjpListById`. Add the filter. Its callers already check `checkArtefactDataAccess`, so this is defence in depth.
   - `apps/web/src/pages/(public)/summary-of-publications/index.ts` queries `prisma.artefact.findMany` inline. Add `listType: { isHidden: false }` to the `where`.
3. **Leave the list-type lookups used by admin and ingestion unchanged.** `findAllListTypes`, `findListTypeById`, `findStrategicListTypes` and `findNonStrategicListTypes` (`libs/system-admin-pages/src/list-type/queries.ts`) are used by manual upload, non-strategic upload, remove-list, third-party subscription management and blob-ingestion validation (`libs/api/src/blob-ingestion/validation.ts`). They must still return hidden types. The only change is adding `isHidden` to their `select`, so the admin screens can show the tag.
4. **Subscriptions.**
   - The list-type choice queries are inline and duplicated in `subscription-add-list` (twice) and `subscription-configure-list`. Move them into one query in `libs/subscriptions`, `findSubscribableListTypesBySubJurisdictionIds(ids)`, with `deletedAt: null, isHidden: false`. Use it from those pages.
   - `getListTypeIdsForLocation` (the allow-list used to validate POSTed ids in `subscription-confirmation-preview`) also excludes hidden types, so a crafted POST cannot subscribe to one.
   - `resolveListTypeNames` in both preview pages also excludes hidden types.
   - **Existing subscriptions must not change.** `replaceSubscriptionListTypes` overwrites `listTypeIds`. If the page leaves hidden ids off the form, saving the form would silently drop them, which breaks the AC. `replaceSubscriptionListTypes` will keep any of the user's existing ids that are currently hidden.
   - Case-name and case-number search (`libs/subscriptions/src/repository/queries.ts` `searchByCaseName`/`searchByCaseNumber`) reads `artefact_search` rows. Add `artefact: { listType: { isHidden: false } }` so hidden publications do not leak case names.
5. **Outbound pushes (assumption, see Clarifications).** `processPublication` (`libs/publication/src/processing/service.ts`) is the single place that triggers `sendPublicationNotificationsForArtefact` and `sendThirdPartyPublications` (legacy third-party push, including Courtel). When the list type is hidden, skip both steps and log why. Keep artefact creation, `artefact_search` extraction and PDF/Excel generation, so the publication is complete when the list type is shown again.
6. **Ingestion via API is unchanged; manual uploads are blocked.** The API (`libs/api/src/blob-ingestion`) still accepts publications for hidden list types. Manual upload and non-strategic upload no longer offer hidden list types: `findStrategicListTypes` / `findNonStrategicListTypes` filter `isHidden: false`, and `validateUploadForm` (`libs/admin-pages/src/manual-upload/validation.ts`) rejects a submitted hidden list type with the list type error (decided 2026-11-17).
7. **Seeding keeps `is_hidden`.**
   - `apps/postgres/prisma/generate-seed-sql.ts` `generateListTypesSql` neither inserts nor updates `is_hidden`. New rows get the DB default `false`, and `ON CONFLICT (name) DO UPDATE` leaves the column alone.
   - `libs/location/src/seed-list-types.ts` upsert `update` block does not set `isHidden` either.
   - Both stay that way. Add regression tests that fail if `is_hidden` or `isHidden` ever appears in the seed output or upsert payload.
   - The soft-delete reconciliation SQL only touches `deleted_at`, which is also fine.
8. **Audit uses the existing `auditLogMiddleware`.** The controller sets `req.auditMetadata = { shouldLog: true, action, entityInfo }` before redirecting, as `delete-court-publications` does. Add `HIDE_LIST_TYPE = "Hide list type"` and `SHOW_LIST_TYPE = "Show list type"` to `AuditLogAction` in `libs/system-admin-pages/src/audit-log/logger.ts`. Note: `delete-list-type` sets no `auditMetadata`, so it is **not** audited today. Do not copy that.

### Public surfaces: where filtering applies

| Surface | Path | Change |
|---|---|---|
| Summary of publications | `(public)/summary-of-publications/index.ts` | `where.listType.isHidden = false` |
| Court and tribunal lists, Search | `(public)/courts-tribunals-list`, `(public)/search` | None. These list locations, not list types. The hidden list type disappears on the summary page they lead to. |
| List type publication pages | `(list-types)/*` via `list-type-handler.ts` | Covered by `getArtefactById` |
| SJP public list, delta, downloads, disclaimers | `publication-access.ts`, `sjp-download-shared.ts` | Covered by `getArtefactById` |
| SJP press list | `(list-types)/sjp-press-list/index.ts` | Switch to `getArtefactById` |
| Flat file view and PDF/Excel download | `libs/public-pages/src/flat-file/flat-file-service.ts`, `routes/api/flat-file/[artefactId]/download.ts` | Covered by `getArtefactById` |
| Generic publication route | `(public)/publication/[id].ts`, `authorisation/middleware.ts` | `fetchArtefact` filter |
| Subscription list-type choices | `(verified)/subscription-add-list`, `subscription-configure-list`, both preview pages | New shared query; filtered allow-list |
| Case search for subscriptions | `libs/subscriptions/src/repository/queries.ts` | Filter `artefact.listType.isHidden` |
| Public API (`apps/api`) | `routes/publication.ts` (inbound POST only), `routes/locations.ts` (locations only); flat-file download comes from `@hmcts/public-pages` apiRoutes | No extra change. The flat-file route is covered by `getArtefactById`. There is no public endpoint that lists list types or publications. |

These stay unfiltered because they are admin or internal: blob explorer (`getArtefactSummariesByLocation`, `getArtefactMetadata`, `getLocationsWithPublicationCount`), remove-list (`getArtefactsByLocation`, `getArtefactsByIds`), MI report, third-party subscription management, and the `(system-admin)/files/[filename]` route. `getLatestSjpArtefacts`/`getLatestSjpLists` have no callers today and are left alone.

## 2. Implementation Details

TEMPLATE SOURCE: write fresh

### Database schema and migration

`libs/postgres-prisma/prisma/schema/location.prisma`, model `ListType`:

```prisma
isHidden                Boolean   @default(false) @map("is_hidden")
```

Generate the migration with `yarn db:migrate:dev --name add_is_hidden_to_list_types`. This writes `apps/postgres/prisma/migrations/<timestamp>_add_is_hidden_to_list_types/migration.sql`:

```sql
ALTER TABLE "list_types" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;
```

Existing rows become visible. No index is needed: `list_types` is small and the filter is a join on its primary key.

### Business logic (`libs/system-admin-pages/src/list-type/`)

- `queries.ts`
  - Add `isHidden: true` to the `select` of `findAllListTypes` and `findListTypeById`.
  - Add `updateListTypeVisibility(id, isHidden)`. It uses `prisma.listType.updateMany({ where: { id, deletedAt: null, isHidden: !isHidden }, data: { isHidden } })` and returns `count`. This is a conditional update, so two admins acting at once cannot double-apply or record a false change.
  - `createListType` restore path (re-creating a soft-deleted name): set `isHidden: false`. The admin is explicitly creating a live list type.
- `service.ts`: add `setListTypeVisibility(id, isHidden)`. It returns `"UPDATED" | "NOT_FOUND" | "ALREADY_IN_STATE"`, using `findListTypeById` and `updateListTypeVisibility`. A list type with `deletedAt` set counts as `NOT_FOUND`.
- `validation.ts`: add `validateVisibilityConfirmation(value)`, which accepts `"yes"`/`"no"`. It reuses the existing radio-validation style.
- `libs/system-admin-pages/src/audit-log/logger.ts`: add `HIDE_LIST_TYPE` and `SHOW_LIST_TYPE`.

### Publication lib (`libs/publication/src/`)

- `repository/queries.ts`
  - `getArtefactById`: change to `findFirst({ where: { artefactId, listType: { isHidden: false } } })` and add JSDoc.
  - Add `isListTypeHidden(listTypeId): Promise<boolean>`.
- `authorisation/middleware.ts` `fetchArtefact`: same `listType` filter.
- `processing/service.ts` `processPublication`: call `isListTypeHidden(listTypeId)` once. If it is true, skip the notification and third-party blocks and log `${logPrefix} List type hidden; notifications and third-party push skipped`. Everything else is unchanged.

### Subscriptions lib (`libs/subscriptions/src/repository/`)

- `subscription-list-type-queries.ts`
  - Add `findSubscribableListTypesBySubJurisdictionIds(ids)`, filtered on `deletedAt: null, isHidden: false`, ordered by `friendlyName`.
  - Add `findHiddenListTypeIds(ids)`.
  - `getListTypeIdsForLocation`: add `listType: { isHidden: false, deletedAt: null }`.
- `subscription-list-type-service.ts` `replaceSubscriptionListTypes`: merge in `existing.listTypeIds ∩ findHiddenListTypeIds(existing.listTypeIds)` before the upsert.
- `queries.ts`: add the `artefact.listType.isHidden: false` filter to `searchByCaseName` and `searchByCaseNumber`.
- Export the new query from `src/index.ts`.

### List types common

- `libs/list-types/common/src/sjp/sjp-service.ts` `getSjpListById`: use `findFirst` with the `listType` filter.

### Pages (`apps/web/src/pages/(system-admin)/`)

- `manage-list-types/`
  - Add a "Status" column using `govukTag`: `{ text: visibleTag, classes: "govuk-tag--green" }` or `{ text: hiddenTag, classes: "govuk-tag--grey" }`.
  - The controller maps `isHidden` onto each row.
  - Add a visually hidden caption/header for the action column, as it exists today.
  - New en/cy keys: `statusColumnHeading`, `visibleTag`, `hiddenTag`.
- `manage-list-type/`
  - Add a "Status" row with the tag.
  - Add a secondary button, "Hide list type" or "Show list type", linking to `/list-type-visibility?id={id}`.
  - New en/cy keys: `statusLabel`, `visibleTag`, `hiddenTag`, `hideButton`, `showButton`.
- **New** `list-type-visibility/` (`index.ts`, `index.njk`, `en.ts`, `cy.ts`, `index.test.ts`, `index.njk.test.ts`). It follows the `delete-list-type` conventions:
  - Error summary, `govukSummaryList` with the list type name and current status, `govukRadios` inline Yes/No (`name="confirmVisibility"`), a Confirm button and a Cancel link back to `manage-list-type`. It extends `layouts/base-template.njk`.
  - GET picks its wording from the current state. When visible it shows "Are you sure you want to hide this list type?", with a hint: "It will be removed from the public site. Its publications, configuration and subscriptions are kept." When hidden it shows the equivalent "show" question.
  - The form posts a hidden field `targetState=hidden|visible`, captured at GET, so a stale page cannot flip the state the wrong way.
  - POST flow:
    1. Parse `id`; return 400 if it is missing or not a number.
    2. Load the list type; return 404 if it is missing or deleted.
    3. Validate the radio: an error means re-render (the middleware audits this as `validation_error`).
    4. `no` redirects to `/manage-list-type?id=`.
    5. `yes` calls `setListTypeVisibility`.
    6. `ALREADY_IN_STATE` re-renders with the error "This list type is already hidden" or "already visible".
    7. `UPDATED` sets `req.auditMetadata = { shouldLog: true, action: HIDE_LIST_TYPE | SHOW_LIST_TYPE, entityInfo: "Name: <name>, ID: <id>" }` and redirects to `/list-type-visibility-success?state=hidden|visible` (keeping `lng=cy`).
  - The `state` query on the success page only picks static copy. It carries no data.
  - Uses `[requireRole([USER_ROLES.SYSTEM_ADMIN]), handler]` for both GET and POST.
- **New** `list-type-visibility-success/`
  - `govukPanel` with "List type hidden" or "List type shown", then a link back to "Manage list types".
  - Uses the same `no-store` headers as `delete-list-type-success`, and requires `SYSTEM_ADMIN`.
- `apps/web/src/pages/(public)/summary-of-publications/index.ts`: add the `where` filter (one line).
- `apps/web/src/pages/(list-types)/sjp-press-list/index.ts`: replace `prisma.artefact.findUnique` with `getArtefactById`.
- `apps/web/src/pages/(verified)/subscription-add-list/index.ts`, `subscription-configure-list/index.ts`: use `findSubscribableListTypesBySubJurisdictionIds`.
- `subscription-configure-list-preview/index.ts`, `subscription-confirmation-preview/index.ts`: add `isHidden: false` to `resolveListTypeNames`.

### Content (English; Welsh uses the repo's `[WELSH TRANSLATION REQUIRED: '...']` placeholder convention where no translation exists)

| Key | English |
|---|---|
| visibleTag / hiddenTag | Visible / Hidden |
| statusLabel / statusColumnHeading | Status |
| hideButton / showButton | Hide list type / Show list type |
| hideTitle | Are you sure you want to hide this list type? |
| showTitle | Are you sure you want to show this list type? |
| hideHint | It will be removed from the public site. Its publications, configuration and subscriptions are kept. |
| showHint | Its publications will be shown on the public site again. |
| errorConfirmationRequired | Select yes if you want to hide this list type / Select yes if you want to show this list type |
| errorAlreadyHidden / errorAlreadyVisible | This list type is already hidden / This list type is already visible |
| errorListTypeNotFound | List type not found |
| successHiddenTitle / successShownTitle | List type hidden / List type shown |
| Yes / No / Confirm / Cancel | Yes / No / Confirm / Cancel (cy: Ie / Na / Cadarnhau / Canslo, as in `delete-list-type/cy.ts`) |

### Seed

- `apps/postgres/prisma/generate-seed-sql.ts`: no code change.
- `libs/location/src/seed-list-types.ts`: no code change.
- Add tests in `apps/postgres/prisma/generate-seed-sql.test.ts` and `libs/location/src/seed-list-types.test.ts` (create it if missing) asserting that `is_hidden`/`isHidden` is never written.

### API endpoints

None new.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| `id` missing or not numeric (GET/POST) | 400 via `errors/common`, the same as `manage-list-type` |
| `id` not found, or list type soft-deleted | 404. Hide/show is not offered for deleted list types. |
| No radio selected | Re-render with error summary and inline error (`href: "#confirmVisibility"`) |
| "No" selected | Redirect to `manage-list-type?id=`, with no state change |
| Already in the target state (another admin acted, double submit, stale tab) | The conditional `updateMany` returns 0 and the page re-renders with "already hidden/visible". No false "success" audit entry is written. |
| Concurrent hide and show | Last write wins atomically. Each successful change is audited separately. |
| Direct URL to a hidden publication (list type page, flat file, PDF/Excel/SJP download, `/publication/:id`) | **404**, the same as a non-existent artefact, so its existence is not disclosed. Download JSON routes return `{ error: "Artefact not found" }` or `"File not found"`. Applies to every role on public routes, including System Admin (see Clarifications). |
| Hidden list type is soft-deleted later | The delete flow is unchanged. Re-creating the same name via admin clears `isHidden`. The seed re-activation (`deleted_at = NULL`) keeps whatever `is_hidden` the row had. |
| Redeploy / seed run | `is_hidden` is never written by either seed path, so hiding survives deploys (covered by regression tests) |
| User has an existing subscription to a now-hidden list type | Not shown as a choice. Saving the configure-list journey keeps the hidden id, so the subscription is unchanged. Not notified while hidden (per the assumption below). |
| Crafted POST to subscribe to a hidden list type | Rejected by the `getAllowedListTypeIdsForLocations` allow-list |
| New publication arrives while hidden | Stored, search rows extracted, PDF/Excel generated. Notifications and third-party/Courtel pushes are skipped. It becomes visible when the list type is shown, and no catch-up notifications are sent. |
| Audit log write fails | The existing middleware logs to console and does not block the action, as for other system-admin actions |
| Cached responses | Public publication responses already send `no-store`, and there is no list-type cache in the libs, so changes take effect on the next request |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| A System Admin can hide and show any list type. The list types page shows the current state. | `list-type-visibility` confirmation page; Status tag on `manage-list-types` and `manage-list-type`; `SYSTEM_ADMIN` role guard | Controller and njk unit tests; E2E journey |
| A hidden list type and its publications don't appear anywhere on the public site. Showing it again restores them unchanged. | Filter in `getArtefactById`, `fetchArtefact`, `getSjpListById`, the summary-of-publications query, sjp-press-list, subscription choice queries and case search | Query unit tests (`where` contains `listType.isHidden: false`); controller 404 tests; E2E: summary page and direct URL hidden, then visible again |
| Hiding doesn't delete or change any list type configuration, publications or subscriptions. | Only the `is_hidden` column is updated. `replaceSubscriptionListTypes` keeps hidden ids. The seed never writes `is_hidden`. | `updateListTypeVisibility` test asserts `data` is exactly `{ isHidden }`; subscription service test; seed regression tests; E2E publication reappears unchanged |
| The changes are audited, the text is in English and Welsh, and the page meets WCAG 2.2 AA. | `req.auditMetadata` with `HIDE_LIST_TYPE`/`SHOW_LIST_TYPE`; en/cy files with key parity; GOV.UK components (tag text, not colour alone; error summary; fieldset legend) | Controller test asserts `auditMetadata`; locale key-parity tests; E2E axe checks and audit log entry check |

## 5. Test Scenarios

### Unit and integration (Vitest)

1. **Visibility service and queries.** `updateListTypeVisibility` uses the conditional `where` and writes only `isHidden`. `setListTypeVisibility` returns `UPDATED`, `NOT_FOUND` (missing or deleted) and `ALREADY_IN_STATE`. The `findAllListTypes`/`findListTypeById` selects include `isHidden`. The `createListType` restore path resets `isHidden`.
2. **`list-type-visibility` controller.**
   - GET for a visible type shows hide copy; GET for a hidden type shows show copy.
   - Invalid id gives 400; unknown or deleted id gives 404.
   - POST with no selection gives an error; `no` redirects; `yes` updates, sets `auditMetadata` and redirects with `lng=cy` kept.
   - `ALREADY_IN_STATE` gives an error with no audit metadata.
3. **Templates.** `list-type-visibility/index.njk.test.ts` checks both states, the error summary, Welsh, and en/cy key parity. `manage-list-types/index.njk.test.ts` and `manage-list-type` render the green Visible and grey Hidden tags and the correct button. `list-type-visibility-success` renders both panels.
4. **Public filtering.**
   - `getArtefactById`, `fetchArtefact` and `getSjpListById` include `listType: { isHidden: false }`.
   - The summary-of-publications query includes the filter.
   - `sjp-press-list` returns 404 when `getArtefactById` returns null.
   - `isListTypeHidden` returns true and false correctly.
5. **Outbound gating.** `processPublication` with a hidden list type skips `sendPublicationNotificationsForArtefact` and `sendThirdPartyPublications` but still generates the PDF. With a visible list type, both still run.
6. **Subscriptions.**
   - `findSubscribableListTypesBySubJurisdictionIds` and `getListTypeIdsForLocation` exclude hidden types.
   - `replaceSubscriptionListTypes` keeps existing hidden ids.
   - Case search excludes hidden publications.
   - The `subscription-add-list` and `subscription-configure-list` tests are updated for the new query.
7. **Seed keeps hiding.** The `generateSeedSql` output contains no `is_hidden`. The `seedListTypes` upsert `update`/`create` payloads contain no `isHidden`.

### E2E (Playwright), one journey

8. **`admin can hide and show a list type @nightly`**, added to `e2e-tests/tests/system-admin/manage-list-types.spec.ts`. It uses the existing `createOwnListType()` and `createTestArtefact` for a test location.
   1. Check the Visible tag on manage-list-types.
   2. Open manage-list-type, click "Hide list type", and run axe on the confirmation page.
   3. Check the Welsh heading.
   4. Submit with no selection: check the error, run axe.
   5. Choose No: you return to the manage page with the state unchanged.
   6. Hide (Yes): check the success panel and the Hidden tag.
   7. Check the public summary of publications for the location: the publication is absent.
   8. Open the publication URL directly: 404.
   9. Check the audit log list has a "HIDE_LIST_TYPE" entry.
   10. Show it again: check the Visible tag, and that the summary lists the publication again with the same name and date.

## 6. CLARIFICATIONS NEEDED

1. **Accept new publications for a hidden list type?** *Recommended and assumed:* yes. Keep accepting and storing them (API, manual and non-strategic upload), including PDF/Excel generation and search extraction. Rejecting them would break upstream senders during migration and lose data. *Trade-off:* storage keeps growing for a list type nobody can see. If rejection is wanted, add a check in `libs/api/src/blob-ingestion/validation.ts` and the upload validators.
2. **Pause subscription notifications, third-party pushes and Courtel while hidden?** *Recommended and assumed:* pause all three in `processPublication`, so hidden content does not leak by email or to third parties. *Trade-off:* subscribers and third parties miss publications received while hidden, and nothing is sent when the list type is shown again. Need confirmation that this is acceptable, or whether showing it should replay notifications (not planned; it risks a flood of stale emails). Also confirm whether third-party **deletions** (`sendThirdPartyDeletion` in remove-list) should still be sent for hidden list types. The plan leaves deletions unchanged.
3. **Should System Admins (or other signed-in admin roles) still see hidden publications on public pages, for example to preview a fix?** *Assumed:* no. Public routes return 404 for everyone, and admins can inspect content via Blob Explorer. If preview is needed, add a role bypass in `getArtefactById` callers. That would be a wider change.
4. **Should a verified user's subscription management page show their existing subscription to a hidden list type?** *Assumed:* the subscription is kept but is not offered as a choice in configure-list. The `subscription-management` summary (`getSubscriptionListTypesByUserId`) still names it, because the user owns that data. Confirm, or filter it from display too.
5. **Welsh copy.** New strings use the `[WELSH TRANSLATION REQUIRED: '...']` placeholder, as `manage-list-type/cy.ts` does today. The Welsh Language Unit needs to supply translations before release.
6. **Should hide and show also appear as a column action on `manage-list-types`?** *Assumed:* no. The action lives on `manage-list-type` only (one action per page). The list page only shows the tag.
