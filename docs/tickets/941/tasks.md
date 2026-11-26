# Tasks: #941 — Excel download for the Rolls Building hearing lists

## Implementation Tasks

### 0. Before coding
- [ ] Record the resolved decisions in `plan.md` §5 on issue #941
- [x] Create the work branch `feature/941-rolls-building-excel` from `feature/942-sscs-excel-download` (`769fe63f`)
- [x] Run `yarn install` and `yarn db:generate`, then check that lint, typecheck and `yarn test` pass on the base before making changes

### 1. Shared reformatter (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`)
- [x] Add `matchByNameOnly?: boolean` to `ReformatSheetConfig`
- [x] Pass `sheet.matchByNameOnly` to `resolveWorksheet`
- [x] Tests in `uploaded-workbook-reformatter.test.ts`:
  - [x] with `matchByNameOnly`, a tab that does not match by name is not picked up by position
  - [x] the positional fallback still works without the flag

### 2. Business and Property Division Rolls Building
- [x] Optional: export a `BUSINESS_AND_PROPERTY_SHEETS` locator array from `src/conversion/business-and-property-division-rolls-building-daily-cause-list-config.ts` and use it in the converter
- [x] Create `src/excel/excel-reformatter.ts` with `reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(buffer, locale)`: 16 `SECTIONS` configs, `matchByNameOnly: true`, `STANDARD_CONFIG.fields`, `t.tableHeaders`, `normaliseHearing`
- [x] Export it from `src/index.ts`
- [x] Create `src/excel/excel-reformatter.test.ts` (real ExcelJS, no mocks):
  - [x] English and Welsh bold headings
  - [x] tab names and order follow `SECTIONS`, and only the uploaded section tabs are output
  - [x] the extra "Notes" tab and a hidden tab are dropped
  - [x] a header-only tab is kept
  - [x] for each section, the rows equal `normaliseHearings(convertExcelForListTypeName(...)[section.key])`
  - [x] the "Internal notes" column is dropped

### 3. Interim Applications Daily Cause List
- [x] Create `src/excel/excel-reformatter.ts` with `reformatInterimApplicationsDailyCauseListExcel(buffer, locale)`: "Hearing List" / index 0 only, the 7 hearing fields, `t.tableHeaders`, identity `formatRow`
- [x] Export it from `src/index.ts`
- [x] Create `src/excel/excel-reformatter.test.ts`:
  - [x] English and Welsh bold headings
  - [x] hearing rows equal the converter's `hearingList`, and time is not reformatted
  - [x] the "Open Justice Statement Details" tab is not in the output
  - [x] the extra column and the extra tab are dropped

### 4. Publication registry (`libs/publication/src/processing/service.ts`)
- [x] Import the two reformatters
- [x] Register `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` and `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` with `createUploadedExcelGenerator(...)`, with no JSON fallback
- [x] `service.test.ts`:
  - [x] add `vi.mock` blocks for both libs (the PDF generator and the reformatter)
  - [x] `listTypeHasExcel` is true for the matching `listTypeData` entries, found by `urlPath`
  - [x] with `uploadedExcel`, the file is reformatted and saved, and `excelPath` is passed to notifications
  - [x] without it, the stale xlsx is deleted and the email is PDF-only
  - [x] if the reformatter throws, the stale xlsx is deleted and the PDF and notifications still go out
  - [x] fixtures use `listTypeId: 999`

### 5. E2E
- [x] Extend the `@nightly` "RCJ and SSCS Excel uploads…" journey in `e2e-tests/tests/admin/non-strategic-upload.spec.ts`:
  - [x] an English Business and Property upload: tab names, headings, normalised time, dropped "Notes" tab and "Internal notes" column, two Notify links
  - [x] a Welsh Interim upload: Welsh headings and only the "Hearing List" tab
  - [x] clean up artefacts, notifications, subscriptions and users in `finally`
- [x] Note in the test that it stays skipped until the SSO specs are re-enabled

### 6. Verify
- [x] Run `yarn lint:fix`, a typecheck and `yarn test` from the root. Statement coverage must be above 80% in `list-types/common`, both Rolls Building libs and `publication`
- [ ] Lower-environment check, once #1122 and #1129 are deployed:
  - [ ] upload English and Welsh workbooks for both lists, with a hidden tab, an extra tab, a note, a formula and an extra column
  - [ ] confirm the email has both links
  - [ ] confirm the xlsx has none of the hidden or extra content and matches the PDF row for row
  - [ ] republish one list as JSON and confirm its xlsx is removed
