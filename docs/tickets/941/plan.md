# Plan: #941 — Excel download for the Rolls Building hearing lists

## 1. Technical Approach

### Goal
When either Rolls Building list is published through the non-strategic Excel upload, the subscription email carries a PDF link and an Excel link. The Excel is built from the uploaded workbook. The same file is served by the existing `GET /api/flat-file/:artefactId/download?format=excel`.

### Scope, checked against master (`a4a9ef4d`, #659/#966 merged)
The spec comment on the ticket guessed names and paths before #659 merged. Several of those guesses are wrong. The real values are:

| Ticket name | Real `listTypeName` (`libs/list-types/common/src/list-type-data.ts:751,761`) | Lib | Page | Upload sheets (converter) |
|---|---|---|---|---|
| Business and Property Division Rolls Building Daily Cause List | `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` | `libs/list-types/business-and-property-division-rolls-building-daily-cause-list` | `apps/web/src/pages/(list-types)/business-and-property-division-rolls-building-daily-cause-list/` | 16 tabs, one per `SECTIONS` entry (`src/sections.ts`), resolved **by name only** (`matchByNameOnly: true`) |
| Interim Applications (ChD) daily cause list | `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` (no "CHD") | `libs/list-types/interim-applications-daily-cause-list` | `apps/web/src/pages/(list-types)/interim-applications-daily-cause-list/` | "Hearing List" (falls back to index 0) and "Open Justice Statement Details" (falls back to index 1) |

Both entries are `isNonStrategic: true` and `defaultSensitivity: "Public"`. Both converters are registered under these names, and both PDF generators are in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:198-200`).

Not in scope: the older flat-file `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` (`list-type-data.ts:772`, `isNonStrategic: false`). It is a different list, and there is no uploaded workbook to reuse.

### Dependency and base branch
- **#941 depends on #940 (PR #1122) and on #942 (PR #1129).**
  - #940 adds the infrastructure: `uploadedExcel` passed from `non-strategic-upload-summary` through `processPublication` into `generatePublicationExcel`, the `createUploadedExcelGenerator` factory, `reformatUploadedWorkbook`, `findFieldForHeader`, `readCellValue`, `resolveWorksheet` and `normaliseHearing`.
  - #942 replaces #940's in-place reformatter with an allow-list copy into a new workbook. That fixes #940's CRITICAL review finding (hidden sheets, notes, metadata and unknown columns leaking) and HIGH 1 and 2 (live formulas, `[object Object]`). It also merges master (#966) and resolves the `readCellValue` and `resolveWorksheet` conflicts with the Rolls Building code.
- **Base the work on `feature/942-sscs-excel-download`** (`769fe63f`), not on #940 alone. Basing on #940 would bring back the data leak and duplicate #942's hardening. Keep the branch current by merging (no rebasing), the same way #942 does.
- **Merge order:** #1122, then #1129, then #941. If the team takes #942's option of merging only #1129 and closing #1122, #941 follows #1129.
- **Branch name:** `origin/feature/941-rolls-building-excel-download` already exists. It holds one obsolete docs commit (`c44efee1`) for the superseded SJP-style plan and is not based on #942. Either recreate it from `feature/942-sscs-excel-download` with a one-off `git push --force-with-lease` (needs the owner's OK), or use a new name such as `feature/941-rolls-building-excel`. `origin/feature/941-rolls-building-csv-download` is an older CSV plan and is also obsolete.

### Superseded parts of the ticket spec
- **No web download journey.** The spec copied SJP's disclaimer and download pages. #940 and #942 settled on the email plus the existing flat-file Excel endpoint, which already applies the display window and publication access rules (`libs/public-pages/src/flat-file/flat-file-service.ts:81-108`). #941 does the same. No `apps/web` changes.
- **No allow-list in `apps/`, and no raw `saveExcelToStorage(uploadData.file)`.** The `EXCEL_GENERATOR_REGISTRY` entry is the allow-list, as in #940.
- **The notification side needs no change** (confirmed): `buildEmailDataWithFiles` probes `${artefactId}.xlsx` (`libs/notifications/src/notification/notification-service.ts:513`), and `getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both files exist and are under 2MB (`libs/notifications/src/govnotify/template-config.ts:43`). Blob deletion already covers `.xlsx` (`libs/publication/src/repository/queries.ts:186`).

### Decision: rebuild from the upload (#942's reformatter), not the raw file and not a JSON-generated workbook
The AC says "the uploaded excel file will be re-used". There are three ways to read that:

| Option | Verdict |
|---|---|
| **Raw upload, byte for byte** (the ticket spec's approach) | **Rejected.** This is exactly #940's CRITICAL finding. Hidden tabs, hidden columns, cell notes, author metadata, live formulas and staff working columns would go to every subscriber. Both lists are PUBLIC, so the flat-file endpoint would also serve them to anyone. The Business and Property workbook has 16 tabs, so it has more places for this content than any list so far. |
| **Workbook regenerated from the converted JSON** | **Not chosen.** It does not reuse the upload, so it goes against AC2. For these lists it gives no data the upload route lacks. |
| **#942's `reformatUploadedWorkbook`**: the upload is reloaded, and only the resolved sheets and mapped columns are copied into a new workbook, with localised bold headers, PDF-formatted values, sanitised cells and a frozen header row | **Chosen.** It reuses the upload (sheet names, sheet contents, column order, widths, row heights, cell styling) and keeps the PDF as the allow-list. It is the shared mechanism #940 and #942 use. |

**Why nothing in the PDF is lost.** The converter fields match the PDF columns exactly for both lists:

| List | Converter fields | PDF table columns (`pdf-template.njk`) | PDF value formatting |
|---|---|---|---|
| Business and Property | `STANDARD_CONFIG`: judge, time, venue, type, caseNumber, caseName, additionalInformation | the same 7, `t.tableHeaders.*` | `normaliseHearings` (renderer): time normalised, empty additional information becomes `""` |
| Interim Applications, "Hearing List" tab | `INTERIM_APPLICATIONS_HEARINGS_CONFIG`: the same 7 | the same 7, `t.tableHeaders.*` | none: `hearingList.map((h) => ({ ...h }))` |
| Interim Applications, "Open Justice Statement Details" tab | `OPEN_JUSTICE_CONFIG`: nameToBeDisplayed, email | not a table. **Only row 1** (`openJusticeStatementDetails[0]`) is put into the "Important information" paragraph | none |

Dropping unknown columns and unmatched tabs only removes content the PDF never showed.

### Things specific to these lists that the shared code does not handle yet
1. **The reformatter ignores `matchByNameOnly` (this blocks Business and Property).** On #942, `reformatUploadedWorkbook` calls `resolveWorksheet(upload, sheet)` without the third argument, so a tab that is not found by name falls back to its position. The Business and Property converter turns that fallback off. Example: an upload with "Appeal List" and a second tab "Notes" that repeats the same headers. The converter gives `businessList: []`. The reformatter would resolve "Business List" (index 1) to "Notes" and publish it, even though it never appeared in the PDF. **Fix:** add `matchByNameOnly?: boolean` to `ReformatSheetConfig` and pass it to `resolveWorksheet`. #942's review HIGH 4 asked for this, but the #942 code does not do it.

### Decisions and defaults
- **Excel uploads only.** If no `uploadedExcel` is passed (a JSON publication through `POST /publication` or the JSON upload branch), no xlsx is produced, any stale one is deleted, and the email is PDF-only. This is #940's RCJ behaviour. #942 added a JSON fallback for SSCS only because the user asked for it.
- **Decided: a cleaned copy of the upload, following #940 and #942.** The upload is reused through #942's allow-list reformatter, and unknown tabs and columns are dropped. The raw file is not attached.
- **Decided: table fields only.** The Excel contains the PDF's table columns only. The Interim "Open Justice Statement Details" tab is left out, and so are list-level header data (list title, "List for", "Last updated", important information, contacts, data source).

## 2. Implementation Details

TEMPLATE SOURCE: n/a (no new rendered page — this ticket adds an Excel download file to existing Rolls Building list types and their email notifications)

No new pages, templates, routes, API endpoints, Prisma schema, migrations or `list-type-data.ts` entries. No changes to `apps/web`, `libs/notifications` or `libs/public-pages`. The non-strategic summary page already passes `uploadedExcel` for every list with a registered converter (`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`, #940), and both Rolls Building lists have one.

### File structure
```
libs/list-types/common/src/excel/
├── uploaded-workbook-reformatter.ts        CHANGED  matchByNameOnly on ReformatSheetConfig
└── uploaded-workbook-reformatter.test.ts   CHANGED

libs/list-types/business-and-property-division-rolls-building-daily-cause-list/src/
├── index.ts                                CHANGED  export the reformatter
└── excel/
    ├── excel-reformatter.ts                NEW
    └── excel-reformatter.test.ts           NEW

libs/list-types/interim-applications-daily-cause-list/src/
├── index.ts                                CHANGED  export the reformatter
└── excel/
    ├── excel-reformatter.ts                NEW
    └── excel-reformatter.test.ts           NEW

libs/publication/src/processing/
├── service.ts                              CHANGED  2 registry entries
└── service.test.ts                         CHANGED

e2e-tests/tests/admin/non-strategic-upload.spec.ts   CHANGED  Rolls Building steps in the existing @nightly Excel journey
```
Both list-type libs already depend on `exceljs` 4.4.0 and `@hmcts/list-types-common`, so no `package.json` changes are needed.

### A. `libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`
- `ReformatSheetConfig` gets one optional field (types stay at the bottom of the file):
  ```ts
  export interface ReformatSheetConfig extends WorksheetLocator {
    fields: FieldConfig[];
    headers: Readonly<Record<string, string>>;
    formatRow: (row: Record<string, string>) => Record<string, string>;
    matchByNameOnly?: boolean; // must match the converter's option, so the Excel uses the same tab as the PDF
  }
  ```
- In `reformatUploadedWorkbook`, call `resolveWorksheet(upload, sheet, sheet.matchByNameOnly)`.
- When the option is not set, the behaviour is the same as before for RCJ, London Admin, CoA Civil and SSCS.
- **Tests** (real ExcelJS round trips, AAA, no mocks):
  - `matchByNameOnly: true`: a tab that does not match by name is **not** picked up by position, and is absent from the output.
  - Without `matchByNameOnly`, the positional fallback still works (existing test).

### B. NEW `libs/list-types/business-and-property-division-rolls-building-daily-cause-list/src/excel/excel-reformatter.ts`
```ts
import { normaliseHearing, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { STANDARD_CONFIG } from "../conversion/business-and-property-division-rolls-building-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { SECTIONS } from "../sections.js";

export async function reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  return reformatUploadedWorkbook(
    buffer,
    SECTIONS.map((section, index) => ({
      worksheetName: section.worksheetName,
      worksheetIndex: index,
      matchByNameOnly: true,
      fields: STANDARD_CONFIG.fields,
      headers: t.tableHeaders,
      formatRow: normaliseHearing
    }))
  );
}
```
- Optional, to keep the converter and the reformatter in step: export a `BUSINESS_AND_PROPERTY_SHEETS` locator array from the converter config, and use it in both places. This is the same pattern as `LONDON_ADMIN_SHEETS` in #940.
- Export from `src/index.ts`: `export { reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel } from "./excel/excel-reformatter.js";`.
- **Multi-sheet behaviour:**
  - The output has one tab per section tab that is present in the upload and has a recognised header row. Tabs keep their uploaded names ("Insolvency & Companies Court", and so on). The order follows `SECTIONS`, which is the PDF order.
  - A header-only tab stays as a header-only tab.
  - A section with no tab in the upload has no tab in the Excel. The PDF still shows its heading and "No hearings scheduled for this day."
  - Extra tabs (notes, working copies) are dropped.
- **Test** (`excel-reformatter.test.ts`, real ExcelJS, no mocks of `@hmcts/list-types-common`). Fixture: "Appeal List" and "Insolvency & Companies Court" with data, "Commercial Court" with a header only, plus an extra "Notes" tab that repeats the headers, an "Internal notes" column and a hidden tab:
  - English and Welsh headings (`t.tableHeaders`), in bold.
  - The output tab names and order are `["Appeal List", "Commercial Court", "Insolvency & Companies Court"]`. "Notes" and the hidden tab are absent.
  - For each section present, the data rows equal `convertExcelForListTypeName("BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST", upload)[section.key]` after `normaliseHearings`. This is the parity test for AC3.
  - Time is normalised the same way the PDF normalises it, and an empty additional information gives `""`.
  - The "Internal notes" column is dropped.

### C. Interim Applications
**NEW `src/excel/excel-reformatter.ts`:**
```ts
export async function reformatInterimApplicationsDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF prints hearings as uploaded. The open justice tab is not a table in the PDF, so it is left out
  return reformatUploadedWorkbook(buffer, [
    { worksheetName: "Hearing List", worksheetIndex: 0, fields: INTERIM_APPLICATIONS_HEARINGS_CONFIG.fields, headers: t.tableHeaders, formatRow: (row) => row }
  ]);
}
```
- Export the reformatter from `src/index.ts`.
- No locale changes: the headings reuse `t.tableHeaders`.
- **Test:**
  - English and Welsh bold headings.
  - Hearing rows equal `convertExcelForListTypeName("INTERIM_APPLICATIONS_DAILY_CAUSE_LIST", upload).hearingList`.
  - Time is **not** reformatted, because the PDF does not reformat it.
  - The "Open Justice Statement Details" tab is not in the output.
  - An extra column and an extra tab are dropped.

### D. `libs/publication/src/processing/service.ts`
- Add `reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel` and `reformatInterimApplicationsDailyCauseListExcel` to the existing imports from the two libs.
- Add to `EXCEL_GENERATOR_REGISTRY`, with no JSON fallback (same as RCJ):
  ```ts
  BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST: createUploadedExcelGenerator(reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel),
  INTERIM_APPLICATIONS_DAILY_CAUSE_LIST: createUploadedExcelGenerator(reformatInterimApplicationsDailyCauseListExcel)
  ```
- Nothing else changes. The stale-xlsx delete (no upload, or a failure) and the no-`jsonData` republish delete (`deleteStaleExcel`) come from #942.

### E. `libs/publication/src/processing/service.test.ts`
- Add `vi.mock` blocks for both libs. They are not mocked today, so the real modules load. Each mock must provide every export `service.ts` imports from that lib: the PDF generator and the new reformatter.
- Tests (fixtures use `listTypeId: 999`):
  - For every `listTypeData` entry whose `urlPath` is `business-and-property-division-rolls-building-daily-cause-list` or `interim-applications-daily-cause-list`, `listTypeHasExcel(name)` is true. This catches a wrong registry key, which would otherwise fail silently.
  - With `uploadedExcel`, the reformatter is called with `(buffer, locale)`, `saveExcelToStorage` stores the result, and `processPublication` passes `excelPath` to notifications.
  - Without it, `deleteBlob("<id>.xlsx", PUBLICATIONS)` is called, the reformatter is not called, and the email is PDF-only.
  - If the reformatter throws, the stale xlsx is deleted, and the PDF and notifications still go ahead.

### F. E2E: `e2e-tests/tests/admin/non-strategic-upload.spec.ts`
- Add Rolls Building steps to the existing `@nightly` test "RCJ and SSCS Excel uploads send reformatted Excel and PDF links in email", rather than adding a new test (one journey).
  - Upload an English Business and Property workbook: two section tabs, an extra "Notes" tab and an "Internal notes" column. Download `?format=excel`. Assert the tab names, the English headings, a normalised time, that "Notes" and "Internal notes" are absent, and that the Notify email has two document links.
  - Upload a Welsh Interim Applications workbook. Assert the Welsh headings and that the output has only the "Hearing List" tab.
- The suite stays inside `test.describe.skip` until the SSO specs are re-enabled (`087ded39c`), the same as #940 and #942. The unit tests and a lower-environment check are the real verification until then.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Upload fails conversion (for example, no Business and Property tab name matches) | Rejected on the upload page by the existing converter. Nothing is published |
| A Business and Property section tab is missing | Absent from the Excel. The PDF shows the section with "No hearings scheduled for this day." |
| A tab with a mis-spelt name, or an extra tab with the same headers | Not picked up (`matchByNameOnly`), so it is in neither the PDF nor the Excel |
| Every matched tab has no header row | The reformatter throws "No recognised worksheet to reformat". The factory deletes any stale xlsx and returns `success: false`. The PDF and the PDF-only email still go out |
| Header-only section tab | Kept as a header-only tab |
| Interim open justice tab present | Not copied (table fields only). The PDF still uses it for its "Important information" paragraph |
| Hidden tabs, rows or columns, notes, metadata, formulas, header/footer text, defined names | Handled by #942's allow-list copy. Hidden mapped rows and columns are copied unhidden, because the PDF includes them. Everything else is dropped |
| Rich text, hyperlinks, formulas or time-only cells in mapped columns | Read by the shared `readCellValue` (#942 merged with #966's `formatExcelTime`), so the Excel shows the same value as the PDF |
| Values starting with `=`, `+`, `-` or `@` | Written through `sanitiseCellValue` (#942) |
| Duplicate mapped header in a tab | Inherited #942 review HIGH 5: the PDF uses the last such column and the Excel uses the first. To be fixed in #942 (rejecting duplicates at upload). #941 adds no workaround |
| JSON publication (API or the JSON upload branch) | No `uploadedExcel`: any stale xlsx is deleted, and the email is PDF-only (decided: no JSON route exists for these lists) |
| Republish by Excel with the same `artefactId` | The xlsx is overwritten with the new reformatted file |
| Republish where the blob delete or the list type lookup fails | Inherited #942 review HIGH 3: a stale xlsx can survive. To be fixed in #942 (a guarded delete, or only attaching when `excelPath` is set). Not duplicated here |
| Welsh upload | Headings from `cy.tableHeaders`. Tab names stay as uploaded. The Business and Property tab names must be the English `worksheetName`s for the converter to accept the file, so Welsh section titles do not appear in the Excel |
| Excel 2MB or larger | The no-links Notify template (existing behaviour). Unlikely, since uploads are capped at 2MB and the output only contains a subset of the upload |
| Notify link text | `excel_link_text` is hard-coded English (`govnotify-client.ts:89`). Existing behaviour for every list; follow-up already raised by #940 and #942 |
| Logging | `artefactId` and the error message only. No cell content |

## 4. Acceptance Criteria Mapping

| AC | How it is met | Verification |
|---|---|---|
| Excel and PDF downloadable files for both Rolls Building lists | The PDF is already registered (`service.ts:198-200`). The Excel comes from two new `EXCEL_GENERATOR_REGISTRY` entries keyed on the real `listTypeName`s. It is served by email and by `/api/flat-file/:artefactId/download?format=excel` | `service.test.ts`: `listTypeHasExcel` is true for the `listTypeData` entries, plus the generator tests. E2E (skipped until SSO). Lower-environment check |
| The uploaded Excel file is re-used | `uploadData.file` is passed through `uploadedExcel` (#940). The reformatter reloads it and copies its section tabs, tab names, column order, widths, heights and styling | Per-lib reformatter tests (tab names and order, styling kept). E2E tab-name assertions |
| All data fields in the PDF are in the Excel | All 7 table fields are mapped from the same converter `FieldConfig`s the PDF JSON came from. Values use the same formatting the PDF uses (`normaliseHearing` for Business and Property, none for Interim). Headings come from the same `t.tableHeaders` as each `pdf-template.njk`. Only table fields are included (decided): the Interim open justice tab and list-level header text are not | Parity tests: the reformatted rows equal the converter output for each Business and Property section, and the Interim `hearingList`. Interim test that the open justice tab is absent. UAT comparison with the PDF |
| Links to both file types in the email | No change. The xlsx blob exists, so `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is used with `pdf_link_to_file` and `excel_link_to_file` | Existing `template-config` and notification tests. `processPublication` passes `excelPath` (`service.test.ts`). E2E email-link assertion (skipped until SSO). Lower-environment check |

## 5. CLARIFICATIONS NEEDED

### Resolved
- **Reuse of the upload:** a cleaned copy, following the same logic as #940 and #942. Unknown tabs and columns are dropped; the raw file is not attached.
- **AC3 scope:** table fields only. List-level header data and the Interim open justice tab are left out. This also removes the need for a Welsh "Name to be displayed" translation.

- **JSON publications:** no Excel. Neither list can be published as JSON through any normal route. The non-strategic upload only accepts `.xlsx`, and the manual upload (the only page that accepts JSON) lists strategic list types only. No source system publishes these lists through the API. JSON-generated Excel is only needed if that changes.
- **Missing Business and Property sections:** acceptable. The Excel contains only the uploaded section tabs.
- **List naming:** "Interim Applications (ChD)" is `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`. The flat-file `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` is out of scope.
- **Branch:** new branch `feature/941-rolls-building-excel`, created from `feature/942-sscs-excel-download` (`769fe63f`). It merges after #1122 and #1129. The old `feature/941-rolls-building-excel-download` and `feature/941-rolls-building-csv-download` remote branches are left alone. The `matchByNameOnly` addition to `ReformatSheetConfig` goes in #941; tell the #942 owner, since it was #942 review HIGH 4.

No open clarifications remain.
