# Tasks — #957: Changes to Crown Warned list (Crown Advance List)

## Implementation Tasks

### Database & reference data
- [ ] Edit the `CROWN_WARNED_LIST` entry in `libs/list-types/common/src/list-type-data.ts:44-53` **in place**: `name: "CROWN_ADVANCED_PDDA_LIST"`, `englishFriendlyName: "Crown Advance List"`, `welshFriendlyName: "Rhestr Ymlaen Llaw Llys y Goron"`, `urlPath: "crown-advance-list"`
- [ ] Add `apps/postgres/prisma/migrations/<timestamp>_rename_crown_warned_list_to_crown_advance/migration.sql` — in-place `UPDATE` of `name`, `friendly_name`, `welsh_friendly_name`, `shortened_friendly_name`, `url`, `deleted_at = NULL`, guarded by `NOT EXISTS` (plan §2.2)
- [ ] Update `e2e-tests/utils/seed-list-types.ts:31-39` (`name`, `friendlyName`, `welshFriendlyName`, `url`)
- [ ] Run `yarn db:migrate:dev` then `yarn db:seed` locally; verify with `yarn db:studio` that `list_types.id` is unchanged and there is exactly one row with `deleted_at IS NULL`

### Package rename
- [ ] `git mv libs/list-types/crown-warned-list libs/list-types/crown-advanced-pdda-list`
- [ ] `git mv .../src/schemas/crown-warned-list.json .../src/schemas/crown-advanced-pdda-list.json` (contents unchanged)
- [ ] Set `name` to `@hmcts/crown-advanced-pdda-list` in the lib's `package.json`
- [ ] Rename path aliases in `tsconfig.json:81,84`
- [ ] Rename the workspace dependency in `libs/publication/package.json:35` and `libs/notifications/package.json:33`
- [ ] Rename exported symbols: `CrownWarnedListData`→`CrownAdvanceListData`, `CrownWarnedCaseRow`→`CrownAdvanceCaseRow`, `crownWarnedListEn/Cy`→`crownAdvanceListEn/Cy`, `renderCrownWarnedListData`→`renderCrownAdvanceListData`, `validateCrownWarnedList`→`validateCrownAdvanceList`, `generateCrownWarnedListPdf`→`generateCrownAdvanceListPdf`
- [ ] Add a one-line comment on `CrownAdvanceListData` explaining the `WarnedList` root key is the unchanged PDDA payload contract
- [ ] Run `yarn install` to regenerate `yarn.lock`

### Content changes
- [ ] `src/locales/en.ts`: `title` → "Crown Advance List", `pageTitle` → "Crown Advance List for", **delete** `preStatementPrefix`
- [ ] `src/locales/cy.ts`: `title` → "Rhestr Ymlaen Llaw Llys y Goron", `pageTitle` → "Rhestr Ymlaen Llaw Llys y Goron ar gyfer", **delete** `preStatementPrefix`
- [ ] Leave `preStatementSuffix2/3/4` (keys and text, en and cy) untouched — existing Welsh is correct

### Renderer & templates
- [ ] `src/rendering/renderer.ts`: remove `weekCommencing` from the `header` object, delete the `toStartOfWeek()` helper and the now-unused `formatContentDate` import
- [ ] `src/pdf/pdf-template.njk:49-54`: remove the `{% if header.weekCommencing | length %}` wrapper and the prefix line; render the three statements unconditionally
- [ ] `git mv "apps/web/src/pages/(list-types)/crown-warned-list" "apps/web/src/pages/(list-types)/crown-advance-list"` and rename `crown-warned-list.njk` / `crown-warned-list.njk.test.ts` to `crown-advance-list.*`
- [ ] `crown-advance-list.njk:54-59`: remove the `{% if header.weekCommencing | length %}` wrapper and the prefix line
- [ ] Controller: renamed imports, `logPrefix: "crown-advance-list"`, `res.render("crown-advance-list", …)`

### Registration & registries
- [ ] `apps/web/src/app.ts:16,153`: rename the `moduleRoot` import and its `modulePaths` entry
- [ ] `libs/publication/src/processing/service.ts:12,203`: rename the import; `PDF_GENERATOR_REGISTRY` key → `CROWN_ADVANCED_PDDA_LIST`
- [ ] `libs/notifications/src/notification/notification-service.ts:28,214`: rename the import; summary registry key → `CROWN_ADVANCED_PDDA_LIST`

### Legacy redirect
- [ ] Create `apps/web/src/pages/(list-types)/crown-warned-list/index.ts` with a `301` redirect to `/crown-advance-list`, preserving `artefactId` (pattern: `(core)/cookies/index.ts`)

### Tests
- [ ] `renderer.test.ts`: delete the three `weekCommencing` Monday-rounding tests (lines 59, 69, 79); add a test asserting `header` has no `weekCommencing`
- [ ] `renderer.test.ts`: add a test that an unseen `HearingDescription` produces a new accordion group
- [ ] `crown-advance-list.njk.test.ts`: **invert** the "should not render the pre-statement when weekCommencing is empty" test (line 163) — statements must now always render; assert the removed prefix string appears nowhere in the HTML; assert the three statements in document order; keep locale-key parity and Welsh assertions
- [ ] Controller `index.test.ts`: drop `weekCommencing` from the fixture (line 65); assert the renamed template name and `pageTitle` in en and cy
- [ ] `pdf-generator.test.ts`: drop `weekCommencing` from the fixture (line 44); assert the PDF HTML omits the removed sentence
- [ ] `json-validator.test.ts`: rename the import to `validateCrownAdvanceList`; suite otherwise unchanged
- [ ] `summary-builder.test.ts`: renamed types only
- [ ] `libs/publication/src/processing/service.test.ts`: rename the mocked module/function and the `CROWN_WARNED_LIST` registry key (lines 117, 118, 193, 530-543)
- [ ] Add a test for the legacy redirect stub (with and without `artefactId`)
- [ ] Seed-SQL generator test: asserts the upsert carries the new friendly names and URL, and no soft-delete is emitted for `CROWN_ADVANCED_PDDA_LIST`
- [ ] Extend the E2E journey (`@nightly`): dropdown name, upload, published-page `h1`, three statements, absent removed sentence, Welsh, inline Axe, accordion keyboard nav, legacy URL redirect

### Verification
- [ ] `grep -rI -e 'crown-warned' -e 'CrownWarned' -e 'CROWN_WARNED' -e 'crownWarned' --exclude-dir=node_modules --exclude-dir=dist .` returns only `docs/`, `requirements/migrations/`, `templates/tech-spec-references/`, the new migration SQL, and the redirect stub's directory name
- [ ] `yarn lint:fix` and `yarn format` clean
- [ ] `yarn test` passes across all workspaces
- [ ] `yarn test:e2e` passes
- [ ] Re-run `prisma migrate deploy` + generated seed against the local DB and confirm idempotency (one row, same `id`, `deleted_at` still `NULL`)
- [ ] Manual STG verification before merge: `list_types.id` preserved, a subscription referencing that `id` still matches, an artefact published pre-rename resolves to `/crown-advance-list`
- [ ] PR description notes that local developers need `yarn db:migrate:dev` before `yarn db:seed`
- [ ] Answer the open questions in `plan.md` §5 (especially the Xhibit hearing-type list) before merge
