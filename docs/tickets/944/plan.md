# Plan: #944 — Excel download for the remaining Tribunal hearing lists

## 1. Technical Approach

### Goal
When any of the eight Tribunal lists below is published through the non-strategic Excel upload, the subscription email carries a PDF link and an Excel link. The Excel is a cleaned copy of the uploaded workbook, built by the shared allow-list reformatter that #940, #942 and #941 use. The same file is served by the existing `GET /api/flat-file/:artefactId/download?format=excel`.

### Scope, checked against the working tree (`f1521ded`, #941 on top of #942 and #940)

| Ticket name | `listTypeName` (`libs/list-types/common/src/list-type-data.ts`) | Lib (`libs/list-types/…`) | Converter config (fields) | PDF registered | Excel registered today |
|---|---|---|---|---|---|
| Primary Health Tribunal Weekly Hearing List | `PHT_WEEKLY_HEARING_LIST` (:699) | `pht-weekly-hearing-list` | `PHT_EXCEL_CONFIG`: date, caseName, hearingLength, hearingType, venue, additionalInformation | yes (`service.ts:350`) | no |
| Care Standards Tribunal Weekly Hearing List | `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` (:128) | `care-standards-tribunal-weekly-hearing-list` | `CST_EXCEL_CONFIG`: same 6 as PHT | yes (`:186`) | no |
| Special Immigration Appeals Commission weekly hearing list | `SIAC_WEEKLY_HEARING_LIST` (:336) | `siac-poac-paac-weekly-hearing-list` | `SIAC_POAC_PAAC_EXCEL_CONFIG`: date, time, appellant, caseReferenceNumber, hearingType, courtroom, additionalInformation | yes (`:242`) | no |
| Proscribed Organisations Appeal Commission weekly hearing list | `POAC_WEEKLY_HEARING_LIST` (:347) | same | same | yes (`:249`) | no |
| Pathogens Access Appeal Commission weekly hearing list | `PAAC_WEEKLY_HEARING_LIST` (:358) | same | same | yes (`:256`) | no |
| General Regulatory Chamber weekly hearing list | `GRC_WEEKLY_HEARING_LIST` (:490) | `grc-weekly-hearing-list` | `GRC_EXCEL_CONFIG`: date, hearingTime, caseReferenceNumber, caseName, judges, members (optional), modeOfHearing, venue, additionalInformation (optional) | yes (`:307`) | no |
| Criminal Injuries Compensation weekly hearing list | `CIC_WEEKLY_HEARING_LIST` (:468) | `cic-weekly-hearing-list` | `CIC_EXCEL_CONFIG`: date, hearingTime, caseReferenceNumber, caseName, **`venue/platform`**, judges, members, additionalInformation | yes (`:196`) | no |
| Asylum Support Tribunal Daily hearing list | `AST_DAILY_HEARING_LIST` (:479) | `ast-daily-hearing-list` | `AST_EXCEL_CONFIG`: appellant, appealReferenceNumber, caseType, hearingType, hearingTime, additionalInformation | yes (`:202`) | no |

All eight are `isNonStrategic: true`, all have a converter registered by name (`registerConverterByName`), and all converters read only the first worksheet (`createConverter` → `convertExcelToJson`, `excel-to-json.ts:90`). Each PDF is a single table preceded by list-level header text.

**How they are uploaded.** Only through the non-strategic upload, which accepts `.xlsx`/`.xls` only (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts:142`, `libs/admin-pages/src/manual-upload/validation.test.ts:665`). The summary page converts the workbook to JSON and passes the original buffer as `uploadedExcel` for every list with a converter (`non-strategic-upload-summary/index.ts:128-138,175`). So no `apps/` change is needed. `POST /publication` would technically accept JSON for these names (`libs/api/src/blob-ingestion/validation.ts` does not restrict list types by provenance), but no source system publishes them; their list-type provenance is `CFT_IDAM` (admin upload).

**What each PDF shows, per column** (`src/pdf/pdf-template.njk` + `src/rendering/renderer.ts` in each lib):

| Lib | PDF columns in order | Value formatting applied by the renderer |
|---|---|---|
| PHT, CST | date, caseName, hearingLength, hearingType, venue, additionalInformation | `date` → `formatDdMmYyyyDate(date, locale)` (long form: "2 January 2025", Welsh "2 Ionawr 2025") |
| SIAC/POAC/PAAC | date, time, appellant, caseReferenceNumber, hearingType, courtroom, additionalInformation | `date` long form |
| GRC | date, hearingTime, caseReferenceNumber, caseName, judges, members, modeOfHearing, venue, additionalInformation | `date` long form |
| CIC | date, hearingTime, caseReferenceNumber, caseName, venuePlatform, judges, members, additionalInformation | `date` long form; `"venue/platform"` renamed to `venuePlatform` |
| AST | appellant, appealReferenceNumber, caseType, hearingType, hearingTime, additionalInformation | none (`{ ...hearing }`) |

Every converter's field list equals its PDF's column list. Nothing the PDF table shows is missing from the converter, and the converter has no field the PDF hides.

### Dependency and base branch
- Builds on the shared code from #940 (PR #1122), #942 (PR #1129) and #941: `uploadedExcel` passthrough, `createUploadedExcelGenerator` (`libs/publication/src/processing/service.ts:399-422`), allow-list `reformatUploadedWorkbook` (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`), `readCellValue`, `deleteStaleExcel`.
- Work branch: `feature-944-tribunals-hearing-list`, already at `f1521ded` (#941). Keep it current by merging, not rebasing, as #941 and #942 do. Merge order: #1122, #1129, #941, then #944.
- `origin/feature/944-tribunal-excel-download` (`33861a43`, the JSON-generated plan from the ticket comment) and `origin/feature/944-tribunal-hearing-list-csv-download` are obsolete and not based on #941. Leave them alone.

### Decision: reuse the upload through the shared reformatter, not a JSON-built workbook
The ticket spec proposes a new `buildTabularListExcel` that builds every workbook from JSON. That is superseded:

| Option | Verdict |
|---|---|
| Raw upload, byte for byte | **Rejected.** #940's CRITICAL finding: hidden sheets, notes, metadata, formulas and staff working columns would go to every subscriber |
| New JSON-built workbook (`buildTabularListExcel`, the spec) | **Not chosen.** It does not reuse the upload (AC2), adds a second shared Excel builder next to the reformatter, and needs provenance plumbing and new locale keys the reformatter avoids |
| `reformatUploadedWorkbook` with a thin per-lib config | **Chosen.** Same mechanism as RCJ, SSCS and Rolls Building. The PDF's field list is the allow-list |

### Corrections to the ticket spec (verified against the code)
1. **Dates are not `dd/MM/yyyy` in the PDF.** All five dated renderers call `formatDdMmYyyyDate`, which returns a long-form, locale-aware date (`libs/list-types/common/src/rendering/date-formatting.ts:62-72`). The Excel must apply the same formatting to match the PDF.
2. **CIC heading key mismatch.** The reformatter looks headings up as `headers[fieldName]` and falls back to the uploaded text (`uploaded-workbook-reformatter.ts:87-89`). CIC's field is `"venue/platform"` but the locale key is `venuePlatform`, so passing `t.tableHeaders` as is would leave the uploaded English heading in a Welsh workbook. The CIC config must alias the key.
3. **No provenance plumbing and no new sheet-name locale keys.** Not needed: the reformatter keeps the uploaded sheet name and copies table data only.
4. **Line numbers in the spec are stale** (the registry is now `service.ts:429-481`, the factory `:399-422`, the notification probe `notification-service.ts:513`).
5. **GRC Welsh debt is wider than the title.** `grc-weekly-hearing-list/src/locales/cy.ts:23-30` has `[WELSH TRANSLATION REQUIRED: …]` placeholders for 8 of 9 table headings. **Fixed in #944** from legacy Welsh (pip-frontend / pip-data-management `cy` resources).
6. **SIAC/POAC/PAAC Welsh debt.** `cy.tableHeaders` holds English strings, **Fixed in #944** from legacy Welsh, together with the page titles and important information. The court-name keys are unchanged (never displayed).
7. The notification side needs no change (confirmed, same as #941): `buildEmailDataWithFiles` probes `${artefactId}.xlsx` (`libs/notifications/src/notification/notification-service.ts:513`) and `getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both files exist under 2MB (`libs/notifications/src/govnotify/template-config.ts:38-43`).

### Legacy behaviour (hmcts/pip-data-management PR #939, PUB-3306, open and unmerged as of 2026-10-08)
Legacy's `NonStrategicListFileConverter.convertToExcel` opens the uploaded workbook, replaces the header row with the list type's translated `tableHeaders` in bold, and reformats cell values with `NonStrategicListFormatter`, the same formatter its PDF uses. It covers all eight lists here.
- JSON publications: `POST /publication` passes `null` for the workbook and the converter returns an empty file, so there is no Excel.
- Nothing is added: no title, list date, "Last updated" or important information.
- Every sheet is processed, but all eight lists map one header set to `Sheet1`, so in practice only one sheet is used.
- Every uploaded column is kept and headers are replaced by position. An extra column throws an index error. We map headers by name and drop unknown columns, which is safer. This difference is deliberate.
- Welsh headings come from legacy's Welsh resource files, so translation gaps show in its Welsh Excel too.
- Dates are written back as text in `d MMMM yyyy` form, English only.

Legacy and our PDF format different fields:

| List | Legacy formatter | Our PDF (`renderer.ts`) |
|---|---|---|
| PHT, CST | date | date |
| GRC | date, `hearingTime` "." → ":" | date |
| SIAC/POAC/PAAC | date, `time` "." → ":" | date |
| CIC | none | date |
| AST | `hearingTime` "." → ":" | none |

The Excel follows **our PDF**, because AC3 requires its fields to match the PDF. **Times now match legacy:** the GRC, SIAC/POAC/PAAC and AST renderers and Excel reformatters change "." to ":" using `normalizeTime` from `@hmcts/list-types-common`, which is the same as legacy's `formatTimeField` (pip-data-management) and `timeFormatter` (pip-frontend). So the PDF, web page and Excel all show "10:30am". **CIC dates and Welsh dates are kept as they are:** pip-frontend's `dateFormatter` gives a long, locale-aware date on legacy's web page (including CIC and Welsh), so ours matches legacy's web page, though not legacy's PDF/Excel. CIC times are not changed.

### Resolved decisions (confirmed 2026-10-08 against legacy PR #939)
- **Excel uploads only.** With no `uploadedExcel` (JSON via the API) the factory deletes any stale xlsx and the email is PDF-only. No JSON fallback. Same as legacy and #941.
- **Table fields only.** List title, "List for (week commencing)", "Last updated", important information, venue address (AST), caution notes and data source are not copied. Same as legacy, #941 and #942.
- **Welsh content gaps** (GRC placeholders, SIAC/POAC/PAAC English `cy` content) are fixed in #944 by copying legacy's approved Welsh. The search label stays as it is, because legacy has no translation for it. The SIAC/POAC/PAAC court-name keys are kept as they were (never displayed; legacy has none). The SIAC/POAC/PAAC PDF title now comes from the locale by `listTypeName`, so the Welsh PDF gets the legacy Welsh title (it was previously hard-coded English in `service.ts`). Welsh text uses straight apostrophes for now (e.g. "Enw'r achos"); legacy uses curly ’, so headings match legacy apart from apostrophe style. Switch once confirmed. The PHT, CST, CIC, AST and GRC PDF generators also hard-coded their English title; they now use `pageTitle` from the locale, so every Welsh PDF has the legacy Welsh title. The PDF data source label now comes from the locale's `provenanceLabels` as on the web page, matching legacy's `convertDataSourceName` (Welsh "Lanlwytho â Llaw" for manual uploads; "ListAssist"/"Libra" instead of the old English-only "SNL"/"CP-CaTH"). Titles, table headings, row values, data source and body text now match across the PDF, Excel (table data only) and web page for all eight lists, and titles and headings match legacy in English and Welsh.
- **Dates are written as text** in the PDF's long form. They do not sort as Excel dates, the same as legacy.
- **Headings come from the locale files** (`t.tableHeaders`) in both English and Welsh, as in legacy. The shared reformatter already does this; it falls back to the uploaded text only when a key is missing (hence the CIC alias).
- **Sheet:** first worksheet only (`worksheetIndex: 0`, no name), matching the converters and, in practice, legacy. Sheet name kept as uploaded.
- **Columns** are packed in the uploaded order. The upload template order matches the PDF order; a reordered upload keeps its own order (existing reformatter behaviour for every list).

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No new pages, templates, routes, API endpoints, Prisma schema, migrations, or `list-type-data.ts` entries. No changes to `libs/notifications`, `libs/public-pages` or `libs/list-types/common`. The only `apps/web` change is the SIAC/POAC/PAAC page test, which adds Welsh-title cases.

### File structure
```
libs/list-types/pht-weekly-hearing-list/
├── package.json                               CHANGED  devDependencies: "exceljs": "4.4.0" (test fixtures)
└── src/
    ├── index.ts                               CHANGED  export the reformatter
    └── excel/
        ├── excel-reformatter.ts               NEW
        └── excel-reformatter.test.ts          NEW
libs/list-types/care-standards-tribunal-weekly-hearing-list/   same four changes
libs/list-types/siac-poac-paac-weekly-hearing-list/            same four changes (one reformatter, three list types)
libs/list-types/grc-weekly-hearing-list/                       same four changes
libs/list-types/cic-weekly-hearing-list/                       same four changes
libs/list-types/ast-daily-hearing-list/                        same four changes

libs/publication/src/processing/
├── service.ts                                 CHANGED  6 imports, 8 registry entries
└── service.test.ts                            CHANGED  mocks + registry/flow tests

e2e-tests/tests/admin/non-strategic-upload.spec.ts   CHANGED  tribunal steps in the existing @nightly Excel journey
yarn.lock                                      CHANGED
```

### A. Reformatters (one per lib)
Shape, PHT shown. CST, SIAC/POAC/PAAC and GRC differ only in the config import:
```ts
// libs/list-types/pht-weekly-hearing-list/src/excel/excel-reformatter.ts
import { formatDdMmYyyyDate, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { PHT_EXCEL_CONFIG } from "../conversion/pht-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatPhtWeeklyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF shows the hearing date in long form, so the Excel formats it the same way
  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: PHT_EXCEL_CONFIG.fields,
      headers: t.tableHeaders,
      formatRow: (row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale) })
    }
  ]);
}
```

| Lib | Function | Config | `headers` | `formatRow` |
|---|---|---|---|---|
| PHT | `reformatPhtWeeklyHearingListExcel` | `PHT_EXCEL_CONFIG` | `t.tableHeaders` | long-form `date` |
| CST | `reformatCareStandardsTribunalWeeklyHearingListExcel` | `CST_EXCEL_CONFIG` | `t.tableHeaders` | long-form `date` |
| SIAC/POAC/PAAC | `reformatSiacPoacPaacWeeklyHearingListExcel` | `SIAC_POAC_PAAC_EXCEL_CONFIG` | `t.tableHeaders` | long-form `date` |
| GRC | `reformatGrcWeeklyHearingListExcel` | `GRC_EXCEL_CONFIG` | `t.tableHeaders` | long-form `date` |
| CIC | `reformatCicWeeklyHearingListExcel` | `CIC_EXCEL_CONFIG` | `{ ...t.tableHeaders, "venue/platform": t.tableHeaders.venuePlatform }` | long-form `date` |
| AST | `reformatAstDailyHearingListExcel` | `AST_EXCEL_CONFIG` | `t.tableHeaders` | `hearingTime` via `normalizeTime`, matching the AST PDF |

- The SIAC reformatter needs no `listTypeName`: all three list types share one config and one set of headings. List titles are not in the Excel.
- Each is exported from its lib's `src/index.ts`: `export { reformatXExcel } from "./excel/excel-reformatter.js";`.
- The date formatter is a one-line closure per lib. A shared helper would save five lines and is not worth a new export in `list-types-common`.
- Do not import anything at runtime from `@hmcts/publication` in these libs (it depends on all six; several already have a type-only re-export from it).

### B. `libs/publication/src/processing/service.ts`
- Add the six reformatters to the existing imports from each lib.
- Add to `EXCEL_GENERATOR_REGISTRY` (`:429`), no JSON fallback, matching RCJ and Rolls Building:
  ```ts
  const siacPoacPaacUploadedExcelGenerator = createUploadedExcelGenerator(reformatSiacPoacPaacWeeklyHearingListExcel);

  PHT_WEEKLY_HEARING_LIST: createUploadedExcelGenerator(reformatPhtWeeklyHearingListExcel),
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: createUploadedExcelGenerator(reformatCareStandardsTribunalWeeklyHearingListExcel),
  SIAC_WEEKLY_HEARING_LIST: siacPoacPaacUploadedExcelGenerator,
  POAC_WEEKLY_HEARING_LIST: siacPoacPaacUploadedExcelGenerator,
  PAAC_WEEKLY_HEARING_LIST: siacPoacPaacUploadedExcelGenerator,
  GRC_WEEKLY_HEARING_LIST: createUploadedExcelGenerator(reformatGrcWeeklyHearingListExcel),
  CIC_WEEKLY_HEARING_LIST: createUploadedExcelGenerator(reformatCicWeeklyHearingListExcel),
  AST_DAILY_HEARING_LIST: createUploadedExcelGenerator(reformatAstDailyHearingListExcel)
  ```
  Put `siacPoacPaacUploadedExcelGenerator` next to `rcjStandardUploadedExcelGenerator` (`:424`).
- `listTypeHasExcel` reads the registry, so it becomes true for these names with no further change.
- `generatePublicationExcel` receives `listTypeName` from `generatePublicationPdf`; all eight have PDF generators, so the name is resolved.

### C. Unit tests per lib: `src/excel/excel-reformatter.test.ts`
Real ExcelJS round trips, AAA, no mocks of `@hmcts/list-types-common`. Fixture: a workbook whose first sheet has the template headers, two data rows, an extra "Internal notes" column, plus a second sheet (hidden or not) repeating the headers.
- English headings equal `en.tableHeaders` in PDF order, bold; Welsh headings equal `cy.tableHeaders`.
- **Parity (AC3):** the data rows equal the renderer's output for the converter's JSON, i.e. `renderXData(await convertExcelForListTypeName(NAME, upload), opts).hearings`, mapped to the PDF column order. Run for `en` and `cy` so the Welsh long-form date is covered.
- The "Internal notes" column and the second sheet are absent; the sheet keeps its uploaded name.
- Per-lib specifics:
  - CIC: the Welsh heading for the venue column is `cy.tableHeaders.venuePlatform` ("Lleoliad/Platfform"), not the uploaded "Venue/platform".
  - GRC: empty optional `members` / `additionalInformation` give `""` cells.
  - AST: `hearingTime` and all values are unchanged (no date column).
  - SIAC: the fixture is accepted by the converter for each of the three names (shared config).

### D. `libs/publication/src/processing/service.test.ts`
- Extend the existing `vi.mock` blocks for the six libs (`:6,10,27,31,86,157`) with the new reformatter export.
- `TRIBUNAL_LIST_TYPES = listTypeData.filter((l) => TRIBUNAL_URL_PATHS.includes(l.urlPath)).map((l) => l.name)` for the six `urlPath`s. Assert it has exactly the 8 expected names (use `[...x].sort()`, not in-place sort — #941 review suggestion 6), and `it.each` that `listTypeHasExcel(name)` is true.
- With `uploadedExcel`: the reformatter is called with `(buffer, locale)`, `saveExcelToStorage` stores the result, `processPublication` passes `excelPath` to notifications. One case per lib is enough; SIAC is checked for all three names.
- Without `uploadedExcel`: `deleteBlob("<id>.xlsx", PUBLICATIONS)` is called, the reformatter is not, the email is PDF-only.
- Reformatter throws: stale xlsx deleted, PDF and notifications still go ahead, the logged payload is `artefactId` + message only.
- Fixtures use `listTypeId: 999`.

### E. E2E: `e2e-tests/tests/admin/non-strategic-upload.spec.ts`
Extend the existing `@nightly` journey "RCJ, SSCS and Rolls Building Excel uploads…" (rename to include Tribunal) rather than adding a test:
- English GRC upload with an "Internal notes" column: download `?format=excel`, assert English headings, the long-form date, the dropped column, and two Notify links (`expectPdfAndExcelLinksInEmail`).
- Welsh CIC upload: assert Welsh headings including "Lleoliad/Platfform", the Welsh long-form date, and two Notify links.
- The suite stays inside `test.describe.skip` until the SSO specs are re-enabled, as for #940, #941 and #942.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Upload fails conversion (missing required column, bad date format, HTML) | Rejected on the upload page by the existing converter. Nothing is published |
| Workbook has extra sheets | Only the first sheet is copied, as only it feeds the PDF. Others dropped |
| First sheet hidden | Copied as a visible sheet (the converter used it) |
| Extra/unknown columns, notes, formulas, hidden rows/columns, metadata, header/footer, defined names | Handled by the shared allow-list copy (#942). Mapped hidden rows/columns are copied unhidden, because the PDF includes them |
| Date cell typed as an Excel date rather than text | `readCellValue` gives `dd/mm/yyyy` (same as the converter), then `formatDdMmYyyyDate` gives the PDF's long form |
| Excel time-only cells | Read as `"10:30am"` by the shared `readCellValue`, same as the PDF data |
| GRC optional `members` / `additionalInformation` empty | Empty cell; the PDF shows an empty cell |
| Values starting `=`, `+`, `-`, `@` | Escaped by `sanitiseCellValue` |
| No recognised header row | The reformatter throws "No recognised worksheet to reformat"; the factory deletes any stale xlsx and returns `success: false`; PDF and PDF-only email still go out. Cannot normally happen because the converter rejects it first |
| JSON publication via `POST /publication` | No `uploadedExcel`: stale xlsx deleted, PDF-only email |
| Republish by Excel (same `artefactId`) | xlsx overwritten |
| Republish where the blob delete or list-type lookup fails | Inherited #942 review HIGH 3; a stale xlsx can survive. To be fixed in #942, not duplicated here |
| Duplicate mapped header | Inherited #942 review HIGH 5 (PDF uses the last, Excel the first). Not worked around here |
| Welsh upload | Headings from `cy.tableHeaders`; dates in Welsh long form; sheet name as uploaded. GRC and SIAC/POAC/PAAC show the legacy Welsh headings, matching their Welsh PDFs |
| Excel 2MB or larger | No-links Notify template (existing). Unlikely: uploads are capped at 2MB and the output is a subset |
| Notify link text | English-only `excel_link_text` (`govnotify-client.ts:89`); existing, already raised by #940/#942 |
| Logging | `artefactId` and the error message only; no cell content |

## 4. Acceptance Criteria Mapping

| AC | How it is met | Verification |
|---|---|---|
| Excel and PDF for all eight Tribunal lists | PDFs already registered. Eight new `EXCEL_GENERATOR_REGISTRY` entries keyed on the real `listTypeName`s. Served by email and by `?format=excel` | `service.test.ts`: the 8 names found by `urlPath` all have `listTypeHasExcel === true`; generator flow tests. E2E (skipped until SSO). Lower-environment check |
| The uploaded Excel is re-used | `uploadedExcel` (already passed by the summary page) is reloaded and its first sheet's mapped columns, sheet name, widths, row heights and cell styles are copied | Per-lib reformatter tests (sheet name kept, unknown content dropped). E2E download assertions |
| All PDF data fields are in the Excel | Every PDF table column is a converter field and is mapped. Headings come from the same `t.tableHeaders` the PDF uses (CIC aliased). Dates use the PDF's `formatDdMmYyyyDate`. Table fields only | Per-lib parity tests against the renderer output in `en` and `cy`. UAT row-by-row comparison with the PDF |
| Links to both files in the email | No change: the xlsx exists, so `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is used with both links | Existing `template-config` tests; `processPublication` passes `excelPath` (`service.test.ts`); E2E link assertions (skipped until SSO) |

## 5. CLARIFICATIONS NEEDED

None. All four earlier questions were settled against legacy PR #939; see "Resolved decisions" in §1.

Follow-ups outside this ticket:
- Welsh search labels for GRC and SIAC/POAC/PAAC (legacy has none to copy).
