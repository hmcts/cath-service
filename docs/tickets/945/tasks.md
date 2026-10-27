# Tasks: #945 — Excel download for the Administrative Court hearing lists

## Implementation Tasks

### 0. Before coding
- [x] Clarifications in plan.md §5 resolved against PIP PUB-3307 (table fields only, Excel uploads only, Welsh PDF fix in scope)
- [x] Confirm the branch `feature-945-administrative-court-hearing-lists` contains #940, #942, #941 and #944; keep it current by merging, not rebasing
- [x] Remove the stale `libs/list-types/administrative-court-daily-cause-list/dist/` (built from the obsolete `origin/feature/945-admin-court-excel-download` branch)
- [x] Run `yarn install` and `yarn db:generate`, then check lint, typecheck and `yarn test` pass on the base

### 1. Reformatter (`libs/list-types/administrative-court-daily-cause-list`)
- [x] Add `"exceljs": "4.4.0"` to `devDependencies` in `package.json`; run `yarn install`
- [x] Create `src/excel/excel-reformatter.ts` with `reformatAdministrativeCourtDailyCauseListExcel(buffer, locale)` over `reformatUploadedWorkbook`: `worksheetIndex: 0`, `ADMIN_COURT_EXCEL_CONFIG.fields`, `t.common.tableHeaders`, `formatRow: normaliseHearing`
- [x] Export it from `src/index.ts`
- [x] Create `src/excel/excel-reformatter.test.ts` (real ExcelJS, AAA, no mocks):
  - [x] English and Welsh bold headings equal `en` / `cy` `common.tableHeaders` in PDF order
  - [x] data rows equal `renderAdminCourt(convertExcelForListTypeName(...)).hearings` in `en` and `cy`
  - [x] `10.30am` becomes `10:30am`; empty Additional Information is `""`
  - [x] extra "Internal notes" column and second sheet dropped; first sheet keeps its uploaded name; header row frozen
  - [x] a value starting with `=` is sanitised
  - [x] `it.each` over the four list type names: the fixture converts and reformats for each

### 1b. Welsh PDF title and data source (`src/pdf/pdf-generator.ts`, plan.md §F)
- [x] Load translations before `renderAdminCourt`; pass `listTitle` from `translations[listTypeName].pageTitle` (generic fallback for unknown names)
- [x] Take the data source from `t.common.provenanceLabels[provenance] || provenance`
- [x] Delete `LIST_TITLE_MAP` and the `@hmcts/publication` import (removes the runtime cycle); drop the dependency from `package.json` if it is unused
- [x] `pdf-generator.test.ts`: `it.each` over the four names, asserting the Welsh `pageTitle` and Welsh provenance label for `cy` and the English ones for `en`; unknown provenance falls back to the raw value

### 1c. Welsh content parity with legacy PIP (`src/locales/cy.ts`, plan.md §G)
- [x] Leeds important information paragraph 2 changed to PIP's text
- [x] Welsh caution notes changed to PIP's `bottomLegal1`/`bottomLegal2`
- [x] Welsh data source label changed to "Ffynhonnell y Data"
- [x] Every PIP Welsh string for the four lists and the footer now appears word for word in `cy.ts`

### 1d. Bristol and Cardiff rename (plan.md §H)
- [x] Rename `BRISTOL_CARDIFF_…` to `BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` in code and tests (`urlPath` unchanged)
- [x] Add migration `20261014120000_rename_bristol_cardiff_administrative_court_list_type` (in-place rename, guarded, no-op if already renamed)
- [x] Local check: migrate renames row 26 in place; seed soft-deletes nothing; replaying #1144's migration afterwards leaves it unchanged
- [ ] Lower environment: after deploy, confirm the Bristol and Cardiff row keeps its id and existing publications and subscriptions still show

### 2. Publication registry (`libs/publication/src/processing/service.ts`)
- [x] Import `reformatAdministrativeCourtDailyCauseListExcel`
- [x] Add `adminCourtUploadedExcelGenerator = createUploadedExcelGenerator(reformatAdministrativeCourtDailyCauseListExcel)` next to `rcjStandardUploadedExcelGenerator`
- [x] Register `BIRMINGHAM_`, `LEEDS_`, `BRISTOL_AND_CARDIFF_` and `MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` in `EXCEL_GENERATOR_REGISTRY`, no JSON fallback
- [x] `service.test.ts`:
  - [x] add `reformatAdministrativeCourtDailyCauseListExcel` to the existing `vi.mock("@hmcts/administrative-court-daily-cause-list")` block
  - [x] list types found by the four `urlPath`s are exactly the four expected names (non-mutating sort); `listTypeHasExcel` true for each
  - [x] with `uploadedExcel`: reformatted with `(buffer, locale)` and saved; `{ hasExcel: true }`
  - [x] without it: stale xlsx deleted, reformatter not called
  - [x] reformatter throws: stale xlsx deleted, log has `artefactId` and message only
  - [x] `processPublication` passes `excelPath` to notifications for an admin court list
  - [x] fixtures use `listTypeId: 999`; `RCJ_LIST_TYPES` stays at 10

### 3. E2E (`e2e-tests/tests/admin/non-strategic-upload.spec.ts`)
- [x] Extend and rename the existing `@nightly` Excel journey to include Administrative Court:
  - [x] Welsh Birmingham upload with `10.30am` and an "Internal notes" column: Welsh headings, `10:30am`, dropped column, two Notify links
  - [x] add the artefact to the `finally` cleanup
- [x] Keep the suite inside `test.describe.skip` until the SSO specs are re-enabled

### 4. Verify
- [x] Run `yarn lint:fix`, a typecheck and `yarn test` from the root; coverage above 80% in the lib and `publication`
- [ ] Lower-environment check once deployed:
  - [ ] upload one English and one Welsh workbook per court with a hidden sheet, an extra column, a note and a formula
  - [ ] confirm the email has both links
  - [ ] confirm the xlsx has none of the hidden or extra content and matches the PDF table row for row
  - [ ] confirm the Welsh PDF title and data source are in Welsh
