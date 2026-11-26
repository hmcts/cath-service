## Implementation Tasks

### Database
- [x] Add `isHidden Boolean @default(false) @map("is_hidden")` to `ListType` in `libs/postgres-prisma/prisma/schema/location.prisma`
- [x] Run `yarn db:migrate:dev --name add_is_hidden_to_list_types` and check that `apps/postgres/prisma/migrations/<timestamp>_add_is_hidden_to_list_types/migration.sql` only adds the column with `NOT NULL DEFAULT false`
- [x] Run `yarn db:generate`

### Seed keeps hiding (scenario 7)
- [x] Confirm `generateListTypesSql` in `apps/postgres/prisma/generate-seed-sql.ts` and the upsert in `libs/location/src/seed-list-types.ts` do not write `is_hidden`/`isHidden` (no code change)
- [x] Add a regression test in `apps/postgres/prisma/generate-seed-sql.test.ts` asserting the output does not contain `is_hidden`
- [x] Add a regression test for `seedListTypes` asserting the upsert `create`/`update` payloads have no `isHidden`

### Business logic: system-admin-pages (scenario 1)
- [x] Add `isHidden` to the `findAllListTypes` and `findListTypeById` selects in `libs/system-admin-pages/src/list-type/queries.ts`
- [x] Add `updateListTypeVisibility(id, isHidden)`, a conditional `updateMany` on `deletedAt: null, isHidden: !isHidden` that returns the count
- [x] Reset `isHidden: false` in the `createListType` soft-deleted restore path
- [x] Add `setListTypeVisibility(id, isHidden)` to `service.ts`, returning `UPDATED | NOT_FOUND | ALREADY_IN_STATE`
- [x] Add a radio confirmation validator to `validation.ts`
- [x] Add `HIDE_LIST_TYPE` and `SHOW_LIST_TYPE` to `AuditLogAction` in `libs/system-admin-pages/src/audit-log/logger.ts`
- [x] Unit tests for the queries, the service and the validator

### Public filtering: publication lib (scenario 4)
- [x] `getArtefactById`: switch to `findFirst` with `listType: { isHidden: false }`, and add JSDoc saying it is the public lookup
- [x] Add `isListTypeHidden(listTypeId)` to `libs/publication/src/repository/queries.ts` and export it
- [x] Add the same filter to `fetchArtefact` in `libs/publication/src/authorisation/middleware.ts`
- [x] Add the filter to `getSjpListById` in `libs/list-types/common/src/sjp/sjp-service.ts`
- [x] Add `listType: { isHidden: false }` to the artefact query in `apps/web/src/pages/(public)/summary-of-publications/index.ts`
- [x] Replace `prisma.artefact.findUnique` with `getArtefactById` in `apps/web/src/pages/(list-types)/sjp-press-list/index.ts`
- [x] Update or add unit tests for each of the above, including the 404 path for hidden artefacts in `sjp-press-list`, `list-type-handler`, `publication-access` and `flat-file-service`

### Outbound gating (scenario 5)
- [x] In `processPublication` (`libs/publication/src/processing/service.ts`), skip notifications and `sendThirdPartyPublications` when `isListTypeHidden`, and log why
- [x] Unit tests for hidden (both skipped, PDF still generated) and visible (both run)

### Subscriptions (scenario 6)
- [x] Add `findSubscribableListTypesBySubJurisdictionIds` and `findHiddenListTypeIds` to `libs/subscriptions/src/repository/subscription-list-type-queries.ts`, and export them
- [x] Filter out hidden and deleted list types in `getListTypeIdsForLocation`
- [x] Keep existing hidden ids in `replaceSubscriptionListTypes`
- [x] Filter hidden publications in `searchByCaseName` and `searchByCaseNumber` (`libs/subscriptions/src/repository/queries.ts`)
- [x] Use the new query in `(verified)/subscription-add-list/index.ts` (both places) and `(verified)/subscription-configure-list/index.ts`
- [x] Add `isHidden: false` to `resolveListTypeNames` in `subscription-configure-list-preview` and `subscription-confirmation-preview`
- [x] Update or add unit tests for the queries, the service and the affected controllers

### Admin pages (scenarios 2, 3)
- [x] `manage-list-types`: add a Status column with `govukTag` (green Visible, grey Hidden), map `isHidden` in the controller, add en/cy keys, and update `index.test.ts` and `index.njk.test.ts`
- [x] `manage-list-type`: add a Status row with the tag and a Hide/Show button linking to `/list-type-visibility?id=`, add en/cy keys, and update the tests
- [x] Create `apps/web/src/pages/(system-admin)/list-type-visibility/` (`index.ts`, `index.njk`, `en.ts`, `cy.ts`) with state-dependent copy, a `targetState` hidden field, the radio confirmation, the already-in-state error, `req.auditMetadata` and a `SYSTEM_ADMIN` guard
- [x] `list-type-visibility/index.test.ts`: GET in both states, 400/404, no selection, No, Yes with audit metadata and `lng=cy`, already-in-state
- [x] `list-type-visibility/index.njk.test.ts`: both states, error summary, Welsh, locale key parity
- [x] Create `apps/web/src/pages/(system-admin)/list-type-visibility-success/` with a hidden/shown panel, `no-store` headers, en/cy content and tests

### E2E (scenario 8)
- [x] Add `admin can hide and show a list type @nightly` to `e2e-tests/tests/system-admin/manage-list-types.spec.ts`. It should cover: the tag, hide with validation, Welsh, axe, the No path, the summary-of-publications page without the publication, a direct URL giving 404, the audit log entry, and showing again with the publication restored.

### Quality
- [x] Run `yarn lint:fix` and `yarn test` from the root; fix any failures
