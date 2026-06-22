# Implementation Tasks: Issue #699

## Database & Schema
- [ ] Add `caseNumberJsonFieldName` and `caseNameJsonFieldName` nullable VarChar(255) columns to `ListType` in `libs/postgres-prisma/prisma/schema/location.prisma`
- [ ] Add `ListTypeRegion` junction model to `location.prisma` with cascade delete and unique constraint
- [ ] Add `regions ListTypeRegion[]` back-reference to `ListType` model
- [ ] Add `listTypes ListTypeRegion[]` back-reference to `Region` model
- [ ] Run `yarn db:migrate:dev` to generate and apply migration
- [ ] Run `yarn db:generate` to regenerate Prisma client

## Service Layer (`libs/system-admin-pages/src/list-type/`)
- [ ] Add `caseNumberJsonFieldName`, `caseNameJsonFieldName`, `regionIds` to `ListTypeFormData` in `types.ts`
- [ ] Add `findAllRegions()` query in `queries.ts`
- [ ] Add `findAllSubJurisdictionsGrouped()` query in `queries.ts` (returns jurisdictions with nested sub-jurisdictions)
- [ ] Update `findAllListTypes()` to include `regions` relation in select
- [ ] Update `findListTypeById()` to include `regions` relation in select
- [ ] Update `createListType()` to accept and write new fields and region links
- [ ] Update `updateListType()` to cascade-delete and re-create region links alongside sub-jurisdiction links
- [ ] Update `validateListTypeDetails()` to add optional max-length checks for the two new JSON field name fields
- [ ] Update `ListTypeDetailsInput` interface in `validation.ts` to include new fields
- [ ] Export `findAllRegions` and `findAllSubJurisdictionsGrouped` from `libs/system-admin-pages/src/index.ts`

## Dashboard Tile
- [ ] Remove "Configure List Type" tile from `system-admin-dashboard/en.ts`
- [ ] Update "Manage List Types" tile description to "View, create, update and delete list type configurations" in `en.ts`
- [ ] Apply the same changes in `system-admin-dashboard/cy.ts`

## [1] Repurpose `manage-list-types` (Select list type screen)
- [ ] Update GET handler to map list types to `manageUrl: '/manage-list-type?id=<id>'` instead of `configureUrl`
- [ ] Update `manage-list-types/en.ts` and `cy.ts` with new content keys (action column label, manage link text, add button text)
- [ ] Update `manage-list-types/index.njk`: change table link to "Manage", add "Add new list type" `govukButton`

## [2] NEW `manage-list-type` (Manage list type screen)
- [ ] Create `apps/web/src/pages/(system-admin)/manage-list-type/index.ts` — GET handler loading list type by id with 400/404 handling
- [ ] Create `manage-list-type/en.ts` and `cy.ts` with all content keys
- [ ] Create `manage-list-type/index.njk` with `govukSummaryList` and Edit/Delete buttons

## [3] NEW `edit-list-type` (Edit list type form)
- [ ] Create `apps/web/src/pages/(system-admin)/edit-list-type/index.ts` — GET pre-populates from DB into session; POST validates and stores with `editId`, redirects to select sub-jurisdictions
- [ ] Create `edit-list-type/en.ts` and `cy.ts`
- [ ] Create `edit-list-type/index.njk` with all 9 form fields including the two new JSON field name inputs

## [3b] NEW `add-list-type` (Add list type form)
- [ ] Create `apps/web/src/pages/(system-admin)/add-list-type/index.ts` — GET clears session and shows empty form; POST validates, stores in session (no `editId`), redirects to select sub-jurisdictions
- [ ] Create `add-list-type/en.ts` and `cy.ts`
- [ ] Create `add-list-type/index.njk` (can share template structure with `edit-list-type`)

## [4] Extend `configure-list-type-select-sub-jurisdictions`
- [ ] Update GET handler to call `findAllSubJurisdictionsGrouped()` and `findAllRegions()`; build accordion sections and pre-check region IDs from session
- [ ] Update POST handler to parse `regionIds` from body; store in session; redirect guard updated to redirect to `/manage-list-types` instead of `/configure-list-type-enter-details`
- [ ] Update `en.ts` and `cy.ts` with regions section heading and description
- [ ] Update `index.njk`: replace flat checkboxes with `govukAccordion` (expanded by default) + separate regions `govukCheckboxes`

## [5] Extend `configure-list-type-preview`
- [ ] Update GET handler to render new fields and regions from session
- [ ] Update POST handler to pass new fields and `regionIds` to `saveListType()`
- [ ] Update `en.ts` and `cy.ts` with new row labels
- [ ] Update `index.njk` summary list to include new rows

## Cleanup
- [ ] Add redirect from `view-list-types/index.ts` GET to `/manage-list-types`
- [ ] Remove or redirect `configure-list-type-enter-details` (replace with `add-list-type` / `edit-list-type`)
- [ ] Update back-link target in `delete-list-type/index.ts` to `/manage-list-type?id=<id>`

## Tests
- [ ] Update unit tests for `queries.ts` to cover new fields and region queries
- [ ] Update unit tests for `validation.ts` to cover new JSON field name length checks
- [ ] Update/add controller unit tests for the three new pages (`manage-list-type`, `edit-list-type`, `add-list-type`)
- [ ] Update `configure-list-type-select-sub-jurisdictions` unit tests for grouped accordion and region handling
- [ ] Update `configure-list-type-preview` unit tests for new fields
- [ ] Update E2E test in `e2e-tests/tests/system-admin/` to cover full add and edit journeys including region selection
