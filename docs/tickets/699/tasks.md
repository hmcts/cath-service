# Implementation Tasks

## Schema & Database

- [x] Add `caseNumberJsonFieldName` and `caseNameJsonFieldName` nullable columns to `ListType` in `libs/postgres-prisma/prisma/schema/location.prisma`
- [ ] Run `yarn db:migrate:dev` to generate and apply the migration (blocked: local DB out of sync with migration history — needs `prisma migrate reset` or manual resolution)
- [x] Run `yarn db:generate` to refresh the Prisma client

## Service / Query Layer

- [x] Extend `ListTypeFormData` in `libs/system-admin-pages/src/list-type/types.ts` with `caseNumberJsonFieldName` and `caseNameJsonFieldName`
- [x] Extend `CreateListTypeData` and `createListType` in `libs/system-admin-pages/src/list-type/queries.ts` to persist the two new columns
- [x] Extend `UpdateListTypeData` and `updateListType` in `libs/system-admin-pages/src/list-type/queries.ts` to persist the two new columns
- [x] Extend `SaveListTypeData` and `saveListType` in `libs/system-admin-pages/src/list-type/service.ts` to pass through `caseNumberJsonFieldName` and `caseNameJsonFieldName`
- [x] Add optional max-length validators for `caseNumberJsonFieldName` and `caseNameJsonFieldName` in `libs/system-admin-pages/src/list-type/validation.ts`; extend `ListTypeDetailsInput` interface accordingly
- [x] Write / update unit tests for the extended query functions
- [x] Write / update unit tests for the extended `saveListType`
- [x] Write / update unit tests for the two new optional field validators

## Dashboard Tile

- [x] Remove the "Configure List Type" tile from `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts`
- [x] Update the "Manage List Types" tile description in `en.ts` to "View, create, update and delete list type configuration"
- [x] Apply the same changes to `apps/web/src/pages/(system-admin)/system-admin-dashboard/cy.ts`

## Pages to Redirect

- [x] Replace the `configure-list-type-enter-details/index.ts` GET handler with a 301 redirect to `/manage-list-types`; remove the POST handler
- [x] Replace the `view-list-types/index.ts` GET handler with a 301 redirect to `/manage-list-types`

## Screen 1 — `manage-list-types/` (repurpose)

- [x] Update `manage-list-types/index.ts` GET handler: change the "Manage" link from `/list-search-config/${id}` to `/manage-list-type?id=${id}`
- [x] Add `addNewButton` key to `manage-list-types/en.ts`
- [x] Add Welsh stub for `addNewButton` to `manage-list-types/cy.ts`
- [x] Update `manage-list-types/index.njk`: update table "Manage" link href; add "Add new list type" button below the table
- [x] Write unit tests for the updated `manage-list-types` GET handler

## Screen 2 — `manage-list-type/` (new)

- [x] Create `apps/web/src/pages/(system-admin)/manage-list-type/en.ts`
- [x] Create `apps/web/src/pages/(system-admin)/manage-list-type/cy.ts` (Welsh stubs)
- [x] Create `apps/web/src/pages/(system-admin)/manage-list-type/index.ts` controller (GET: load by id, render with all fields and sub-jurisdictions; 400 on non-numeric id, 404 if not found)
- [x] Create `apps/web/src/pages/(system-admin)/manage-list-type/index.njk` template (summary list, "Edit list type" and "Delete list type" buttons)
- [x] Write unit tests for `manage-list-type/index.ts`

## Screen 3a — `add-list-type/` (new)

- [x] Create `apps/web/src/pages/(system-admin)/add-list-type/en.ts`
- [x] Create `apps/web/src/pages/(system-admin)/add-list-type/cy.ts` (Welsh stubs)
- [x] Create `apps/web/src/pages/(system-admin)/add-list-type/index.ts` controller (GET: clear session and render form; POST: validate, check name uniqueness, store in session, redirect to sub-jurisdictions)
- [x] Create `apps/web/src/pages/(system-admin)/add-list-type/index.njk` template (form with all fields including `caseNumberJsonFieldName` and `caseNameJsonFieldName`)
- [x] Write unit tests for `add-list-type/index.ts`

## Screen 3b — `edit-list-type/` (new)

- [x] Create `apps/web/src/pages/(system-admin)/edit-list-type/en.ts`
- [x] Create `apps/web/src/pages/(system-admin)/edit-list-type/cy.ts` (Welsh stubs)
- [x] Create `apps/web/src/pages/(system-admin)/edit-list-type/index.ts` controller (GET: load from session or DB; POST: validate, update session preserving `editId`, redirect to sub-jurisdictions)
- [x] Create `apps/web/src/pages/(system-admin)/edit-list-type/index.njk` template (same form structure as `add-list-type`, heading "Edit list type")
- [x] Write unit tests for `edit-list-type/index.ts`

## Screen 4 — `configure-list-type-select-sub-jurisdictions/` (fix redirects)

- [x] Update `configure-list-type-select-sub-jurisdictions/index.ts` GET and POST session guard redirect from `/configure-list-type-enter-details` to `/manage-list-types`
- [x] Write unit tests for the updated GET and POST handlers

## Screen 5 — `configure-list-type-preview/` (extend)

- [x] Add `caseNumberJsonFieldNameRow` and `caseNameJsonFieldNameRow` keys to `configure-list-type-preview/en.ts`
- [x] Add Welsh stubs for those keys to `configure-list-type-preview/cy.ts`
- [x] Update `configure-list-type-preview/index.ts` GET handler: fix session guard redirect to `/manage-list-types`; derive `changeDetailsHref` from session `editId` (add flow → `/add-list-type`, edit flow → `/edit-list-type?id=<editId>`)
- [x] Update `configure-list-type-preview/index.ts` POST handler: fix session guard redirect; pass `caseNumberJsonFieldName` and `caseNameJsonFieldName` to `saveListType`
- [x] Update `configure-list-type-preview/index.njk`: add summary rows for `caseNumberJsonFieldName` and `caseNameJsonFieldName`; update all details-section "Change" hrefs from hardcoded `/configure-list-type-enter-details` to `changeDetailsHref`
- [x] Write unit tests for the updated GET and POST handlers

## Screen 6 — `configure-list-type-success/` (minor)

- [x] Update `configure-list-type-success/en.ts`: confirm `title` and `banner` read "List type updated"
- [x] Update `configure-list-type-success/cy.ts` accordingly

## Screen 7 — `delete-list-type/` (minor fix)

- [x] Update `delete-list-type/index.ts` POST handler: change the "no" redirect from `/view-list-types` to `/manage-list-type?id=<id>`
- [x] Update `delete-list-type/index.njk`: change the cancel link href to `/manage-list-type?id=<id>`

## Screen 8 — `delete-list-type-success/` (verify)

- [x] Verify the "View all list types" link in `delete-list-type-success/index.njk` points to `/manage-list-types`; update if needed

## E2E Tests

- [x] Replace the skipped tests in `e2e-tests/tests/system-admin/manage-list-types.spec.ts` with a single `@nightly` test covering the full "add new list type" journey (dashboard → manage-list-types → add-list-type → select sub-jurisdictions → preview → success), including inline validation checks, Welsh switch, and accessibility scan
- [x] Add a second `@nightly` test covering the "edit list type" journey (manage-list-types → manage-list-type → edit-list-type → select sub-jurisdictions → preview → success)
- [x] Add a third `@nightly` test covering the "delete list type" journey (manage-list-type → delete-list-type → delete-list-type-success)
- [x] Delete or clear the now-redundant `e2e-tests/tests/system-admin/configure-list-type.spec.ts`
