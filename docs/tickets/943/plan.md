# Technical Plan — Issue #943: Excel download for First-tier Tribunal hearing lists

## 1. Technical Approach

### What the issue actually needs

The email layer, the blob layer and the Notify templates already support a PDF + Excel pair.
The only thing missing for these list types is the `<artefactId>.xlsx` blob. Verified in code:

| Claim | Evidence |
|---|---|
| `processPublication` already calls an Excel step for every JSON publication | `libs/publication/src/processing/service.ts:637` |
| Excel is only produced for list types registered in `EXCEL_GENERATOR_REGISTRY` | `libs/publication/src/processing/service.ts:363-386` (SJP + magistrates only) |
| The notification layer unconditionally looks for `<artefactId>.xlsx` | `libs/notifications/src/notification/notification-service.ts:474` |
| Template selection already switches to PDF+Excel when both files exist and are <2MB | `libs/notifications/src/govnotify/template-config.ts:37-42` |
| The PDF+Excel template ID is already configured | `apps/api/helm/values.yaml:12`, `apps/web/helm/values.yaml:25` |

So the work is: **write the Excel generator for the 10 FTT list type names and register it.**
No changes to `libs/notifications`, no Helm/env changes, no Prisma/schema/`list-type-data.ts`
changes, no new routes or pages.

### List types in scope (10 names, 5 packages)

| Package | `listTypeName` |
|---|---|
| `wpafcc-weekly-hearing-list` | `WPAFCC_WEEKLY_HEARING_LIST` |
| `ftt-tax-chamber-weekly-hearing-list` | `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` |
| `send-daily-hearing-list` | `SEND_DAILY_HEARING_LIST` |
| `ftt-lands-registration-tribunal-weekly-hearing-list` | `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` |
| `ftt-rpt-weekly-hearing-list` | `FTT_RPT_EASTERN_…`, `FTT_RPT_LONDON_…`, `FTT_RPT_MIDLANDS_…`, `FTT_RPT_NORTHERN_…`, `FTT_RPT_SOUTHERN_…`, `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` |

All five are "non-strategic" flat-list packages with an identical shape, which is what makes a
shared builder worth having:

* the model is a **flat array** of hearing objects (`libs/list-types/*/src/models/types.ts`)
* the renderer returns `{ header, hearings }` where `hearings` is one object per PDF table row
* the PDF template renders exactly `t.tableHeaders` as `<th>` and the same fields as `<td>`
  (e.g. `libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-template.njk:29-49`)
* the registered `ExcelConverterConfig.fields` array has the **same field order** as both the
  model and the PDF table (e.g. `libs/list-types/wpafcc-weekly-hearing-list/src/conversion/wpafcc-config.ts:11`)

### Architecture decision 1 — regenerate from artefact JSON, do not store the raw upload

AC2 says "the uploaded excel file will be re-used in providing the excel file for download".
This is implemented as **re-using the uploaded workbook's own column definition**
(the registered `ExcelConverterConfig`) to regenerate the workbook from the artefact JSON —
not as a byte-for-byte copy of the upload. Rejected storing the raw upload because:

1. It would publish unvalidated bytes to subscribers — extra worksheets, hidden rows/columns,
   formulas, author metadata — none of which passed schema validation.
   `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:136` deliberately discards it today.
2. These list types can also be published as JSON through the publication API, with no workbook
   ever existing. Those publications would get a PDF and no Excel — inconsistent downloads for the
   same list type.
3. A Welsh publication would keep whatever headers the uploader happened to type.

Because the columns are derived from the converter config, the delivered workbook has the same
columns, in the same order, with the same header text as the file the court uploaded.
**This needs BA confirmation** — see Open Questions.

### Architecture decision 2 — columns derived from `*_EXCEL_CONFIG`, headers from `tableHeaders`

Each package already exports its converter config (`WPAFCC_EXCEL_CONFIG`, `FTT_TAX_EXCEL_CONFIG`,
`SEND_EXCEL_CONFIG`, `FTT_LRT_EXCEL_CONFIG`, `FTT_RPT_EXCEL_CONFIG`). Its `fields[].fieldName`
values are exactly the keys of `t.tableHeaders` (verified for all five packages), so:

```typescript
const columns = CONFIG.fields.map((field) => ({
  fieldName: field.fieldName,
  header: t.tableHeaders[field.fieldName]
}));
```

This is the DRY option and it makes AC3 (field parity with the PDF) true *by construction* rather
than by a hand-maintained column list: a field added to the model must be added to the converter
config to be uploadable and to `tableHeaders` to appear in the PDF, and it then appears in the
Excel automatically. Do **not** introduce a per-package `COLUMN_FIELDS` constant — it would be a
third copy of the same ordering to keep in sync.

### Architecture decision 3 — register each name explicitly

Add 10 explicit entries to `EXCEL_GENERATOR_REGISTRY`. Do not make the registry fall back to
"any list type with a registered converter" — that would silently ship Excel downloads for
roughly 30 out-of-scope list types.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No rendered page or list-type view is added; the deliverable is a generated `.xlsx` blob. No
`.njk` migration from `pip-frontend` is involved.

### 2.1 New shared workbook builder

`libs/list-types/common/src/excel/non-strategic-excel-generator.ts`

```typescript
interface NonStrategicExcelColumn {
  fieldName: string;
  header: string;
}

interface NonStrategicExcelOptions {
  artefactId: string;
  sheetName: string;
  columns: NonStrategicExcelColumn[];
  rows: Record<string, string>[];
  errorLabel: string;
}

export async function generateNonStrategicExcel(
  options: NonStrategicExcelOptions
): Promise<{ success: boolean; excelPath?: string; error?: string }>;
```

Behaviour:

* One worksheet, name sanitised: strip `* ? : / \ [ ]` then truncate to 31 characters.
  **This is required, not defensive polish** — `node_modules/exceljs/lib/doc/worksheet.js:155`
  throws on those characters, and the FTT RPT list titles contain a colon.
* Row 1 = `columns[].header`, `font = { bold: true }`. No fill, no borders — matches
  `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts:62`.
* Rows 2..n = one row per `rows` entry, cells resolved by `fieldName` in `columns` order.
* Each cell coerced to a string **before** `sanitiseCellValue`.
  `sanitiseCellValue` (`libs/list-types/common/src/excel/excel-utilities.ts:11`) indexes
  `value[0]` and throws a `TypeError` on `undefined` — optional fields such as
  `additionalInformation` will be `undefined`, so `String(value ?? "")` first.
* `autoFitColumns(worksheet)` for widths.
* Persist with the existing `saveExcelToStorage(artefactId, buffer)` →
  `<artefactId>.xlsx` in `CONTAINER.PUBLICATIONS`.
* Never throws: `try/catch` returning `{ success: false, error: "Failed to generate ${errorLabel} Excel: ${message}" }`.

Exported from `libs/list-types/common/src/index.ts` alongside the existing
`autoFitColumns, sanitiseCellValue, saveExcelToStorage` export (line 30).

### 2.2 Five thin per-package generators

`libs/list-types/<package>/src/excel/excel-generator.ts` — one per package, each:

1. picks the locale object (`cy` when `locale === "cy"`, else `en`);
2. calls the package's existing renderer so rows are **identical** to the PDF's rows — this is
   what guarantees the `dd/MM/yyyy` date parity in AC3, since `formatDdMmYyyyDate` lives in the
   renderer, not the template;
3. derives `columns` from the package's `*_EXCEL_CONFIG.fields` + `t.tableHeaders`;
4. delegates to `generateNonStrategicExcel`.

Example (`wpafcc-weekly-hearing-list`):

```typescript
export async function generateWpafccWeeklyHearingListExcel(
  options: ExcelGenerationOptions
): Promise<ExcelGenerationResult> {
  const t = options.locale === "cy" ? cyLocale : enLocale;

  const { hearings } = renderWpafccWeeklyHearingListData(options.jsonData, {
    locale: options.locale,
    courtName: t.courtName,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.pageTitle
  });

  return generateNonStrategicExcel({
    artefactId: options.artefactId,
    sheetName: t.excelSheetName,
    columns: WPAFCC_EXCEL_CONFIG.fields.map((field) => ({
      fieldName: field.fieldName,
      header: t.tableHeaders[field.fieldName as keyof typeof t.tableHeaders]
    })),
    rows: hearings as unknown as Record<string, string>[],
    errorLabel: "WPAFCC weekly hearing list"
  });
}
```

Notes per package:

* `send-daily-hearing-list` — its `RenderOptions` has no `courtName`
  (`libs/list-types/send-daily-hearing-list/src/rendering/renderer.ts:9`); pass only
  `locale`, `contentDate`, `lastReceivedDate`, `listTitle`.
* `ftt-rpt-weekly-hearing-list` — one exported generator used by all six region names. Region
  differs only in the worksheet name, so the generator takes a `sheetName` argument supplied by
  the registry entry, mirroring how the PDF registry already supplies `listTitle`/`courtName`
  per region (`libs/publication/src/processing/service.ts:234-275`). Keep the region strings in
  the registry, in one place, rather than adding a second region map to the locale files.
* The renderers only need `lastReceivedDate`/`listTitle` for the header block, which the Excel
  discards. Pass `new Date().toISOString()` and `t.pageTitle` (RPT: the supplied sheet name);
  do not add a new renderer signature for this.

Each generator is exported from its package `index.ts`.

### 2.3 New content key: `excelSheetName`

Excel caps worksheet names at 31 characters, so the full list title cannot be used
(`First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List`).
Add `excelSheetName` to `en.ts` and `cy.ts` for the four single-name packages:

| Package | `en.excelSheetName` |
|---|---|
| `wpafcc-weekly-hearing-list` | `WPAFCC Weekly Hearing List` |
| `ftt-tax-chamber-weekly-hearing-list` | `FTT Tax Weekly Hearing List` |
| `ftt-lands-registration-tribunal-weekly-hearing-list` | `FTT LR Weekly Hearing List` |
| `send-daily-hearing-list` | `SEND Daily Hearing List` |

`ftt-rpt-weekly-hearing-list` needs no key — the registry supplies e.g.
`FTT RPT Eastern Weekly List` (27 chars) per region.

**Deliberate deviation from the `[WELSH TRANSLATION REQUIRED: '…']` convention for this one key.**
The marker cannot be used as a worksheet name: it contains `[` and `]`, which ExcelJS rejects
outright, and after sanitising and truncation to 31 characters the Welsh workbook's tab would read
`WELSH TRANSLATION REQUIRED: 'F`. For `cy.excelSheetName`, set the English string until a
translation is supplied. An untranslated-but-correct tab name is better than a broken one, and
unlike body text there is no way to render the marker harmlessly. The missing Welsh strings are
raised in Open Questions.

### 2.4 Registry wiring

`libs/publication/src/processing/service.ts` — add to `EXCEL_GENERATOR_REGISTRY` (line 363):

```typescript
WPAFCC_WEEKLY_HEARING_LIST: (p) =>
  generateWpafccWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as WpafccWeeklyHearingList }),
FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST: (p) =>
  generateFttTaxChamberWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as FttTaxChamberHearingList }),
SEND_DAILY_HEARING_LIST: (p) =>
  generateSendDailyHearingListExcel({ ...p, jsonData: p.jsonData as SendDailyHearingList }),
FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST: (p) =>
  generateFttLrtWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as FttLrtHearingList }),
FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: fttRptExcelGenerator("FTT RPT Eastern Weekly List"),
FTT_RPT_LONDON_WEEKLY_HEARING_LIST: fttRptExcelGenerator("FTT RPT London Weekly List"),
FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: fttRptExcelGenerator("FTT RPT Midlands Weekly List"),
FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: fttRptExcelGenerator("FTT RPT Northern Weekly List"),
FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: fttRptExcelGenerator("FTT RPT Southern Weekly List"),
FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST: fttRptExcelGenerator("FTT RPT Market Rents Weekly")
```

with a local helper next to the existing `sscsGeneratorForListType` (line 133):

```typescript
const fttRptExcelGenerator =
  (sheetName: string): ExcelGenerator =>
  (p) =>
    generateFttRptWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as FttRptHearingList, sheetName });
```

`GenerateExcelParams` (line 340) already carries `artefactId`, `listTypeName`, `contentDate`,
`locale`, `locationId`, `jsonData` — no signature change needed.
Imports for the five generators go on the existing `@hmcts/<package>` import lines
(lines 18-20, 34, and the wpafcc import), so no new package dependency is introduced —
`libs/publication` already depends on all five.

### 2.5 Column mapping (source of truth: `*_EXCEL_CONFIG.fields`)

| List type | Columns, in order |
|---|---|
| `WPAFCC_WEEKLY_HEARING_LIST` | Date, Hearing time, Case reference number, Case name, Panel, Mode of hearing, Venue, Additional information |
| `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | Date, Hearing time, Case name, Case reference number, Judge(s), Member(s), Venue/Platform |
| `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` | Date, Hearing time, Case name, Case reference number, Judge, Venue/Platform |
| `SEND_DAILY_HEARING_LIST` | Time, Case reference number, Respondent, Hearing type, Venue, Time estimate |
| `FTT_RPT_*_WEEKLY_HEARING_LIST` (6 regions) | Date, Time, Venue, Case type, Case reference number, Judge(s), Member(s), Hearing method, Additional information |

### 2.6 Files touched

**New (7):**
```
libs/list-types/common/src/excel/non-strategic-excel-generator.ts
libs/list-types/common/src/excel/non-strategic-excel-generator.test.ts
libs/list-types/wpafcc-weekly-hearing-list/src/excel/excel-generator.ts
libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/excel/excel-generator.ts
libs/list-types/send-daily-hearing-list/src/excel/excel-generator.ts
libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/excel/excel-generator.ts
libs/list-types/ftt-rpt-weekly-hearing-list/src/excel/excel-generator.ts
```
plus one `excel-generator.test.ts` per package (5).

**Modified:**
```
libs/list-types/common/src/index.ts                       # export generateNonStrategicExcel
libs/list-types/<5 packages>/src/index.ts                 # export the generator
libs/list-types/<4 packages>/src/locales/{en,cy}.ts       # excelSheetName
libs/publication/src/processing/service.ts                # 10 registry entries + imports + helper
libs/publication/src/processing/service.test.ts            # listTypeHasExcel / excelPath coverage
e2e-tests/tests/api/subscription-notifications.spec.ts     # extend existing journey
e2e-tests/tests/admin/non-strategic-upload.spec.ts         # assert .xlsx alongside .pdf
```

**Not touched:** `libs/notifications/*`, `apps/*/helm/values.yaml`, `.env.example`,
`libs/postgres-prisma/*`, `libs/list-types/common/src/list-type-data.ts`,
`apps/web/src/pages/**`, any `.njk`.

### 2.7 API endpoints / database

None. No new endpoint, no schema change, no migration, no seed data change.

---

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Flat-file publication (no `jsonData`) | No Excel — the Excel step sits inside the `if (jsonData)` branch (`service.ts:610`) |
| `listTypeName` not in the registry | `generatePublicationExcel` returns `{}`, no blob written (unchanged) |
| Excel generation throws | Caught at `service.ts:412`; artefact, search data, PDF and notifications all unaffected; PDF-only template is used |
| Generator returns `success: false` | `console.warn` at `service.ts:408`; publication continues |
| Zero hearings | Header-row-only workbook is still written. The PDF renders "No hearings scheduled." instead of a table, so this is a deliberate divergence: an empty spreadsheet with headers is more useful than an empty one |
| Optional field `undefined` (e.g. `additionalInformation`) | `String(value ?? "")` → empty cell, never the literal `"undefined"`. Guards the `TypeError` in `sanitiseCellValue` |
| Cell begins `=`, `+`, `-` or `@` | Prefixed with `'` by `sanitiseCellValue` — formula-injection guard |
| Sheet name >31 chars or contains `* ? : / \ [ ]` | Sanitised then truncated; without this ExcelJS **throws** for the RPT titles |
| Two worksheets with the same name | Not possible — one worksheet per workbook |
| Generated file ≥2MB | Blob still written; the existing `MAX_PDF_SIZE_BYTES` guard makes notifications fall back to the no-links template (unchanged) |
| `jsonData` is not an array of hearing rows | The renderer's `.map` throws; caught, `{ success: false, error }`, publication continues with PDF only |

Validation of user input is unchanged — the workbook is still validated against the JSON schema
and the converter's field validators before an artefact exists. No new user input is introduced,
so there is no new form validation and no new user-facing error message. Logs carry the artefact
ID only; no hearing data or email addresses.

---

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| Excel **and** PDF available for all the FTT lists listed | 10 explicit `EXCEL_GENERATOR_REGISTRY` entries; PDF entries already exist | Unit: `listTypeHasExcel` returns true for all 10 names. E2E: `waitForFileGeneration(artefactId, [".pdf", ".xlsx"])` (helper already at `e2e-tests/tests/api/subscription-notifications.spec.ts:49`) |
| The uploaded Excel is re-used | Columns, order and header text come from the registered `ExcelConverterConfig` — the uploaded workbook's own definition — regenerated from validated JSON rather than copying raw bytes | Unit: generator's column list equals `*_EXCEL_CONFIG.fields` order. **BA confirmation required** — see Open Questions |
| All PDF data fields present in the Excel | Rows come from the same renderer the PDF template consumes, and headers from the same `t.tableHeaders` the template renders as `<th>` | Unit per package: header row equals `Object.values(t.tableHeaders)` in config order; a row's cells equal the rendered hearing values including `dd/MM/yyyy` dates |
| Both download links in the email notification | No code change: `buildEmailDataWithFiles` downloads `<artefactId>.xlsx` (`notification-service.ts:474`) and `getSubscriptionTemplateId` selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both files exist under 2MB (`template-config.ts:37`) | Unit: template selection for an FTT publication with both files. E2E: assert two document-download links in the Notify email body |

---

## 5. Test Scenarios

**Unit — shared builder** (`libs/list-types/common/src/excel/non-strategic-excel-generator.test.ts`)

* bold header row from the supplied columns, in the supplied order
* one data row per input row, cells resolved by `fieldName`
* missing/`undefined` field → empty cell, not `"undefined"` (and does not throw)
* value beginning `=` is prefixed so Excel does not treat it as a formula
* worksheet name longer than 31 chars is truncated; `:` and `[ ]` are stripped rather than throwing
* zero rows → header-row-only workbook
* uploads to `<artefactId>.xlsx` in the publications container and returns that path
* returns `{ success: false, error }` instead of throwing when the blob upload rejects

**Unit — each of the five package generators** (`src/excel/excel-generator.test.ts`)

* English headers for `locale: "en"`; `cy.tableHeaders` values for `locale: "cy"`
* dates formatted as the PDF formats them (`12/01/2026`) because rows come from the shared renderer
* **column parity guard:** the header row equals `*_EXCEL_CONFIG.fields.map(f => en.tableHeaders[f.fieldName])`,
  so a field added to the model/config but not to `tableHeaders` fails the build
* **locale parity guard:** `Object.keys(en.tableHeaders).sort()` equals `Object.keys(cy.tableHeaders).sort()`
* `ftt-rpt`: the same generator serves all six names and the worksheet name reflects the supplied region

**Unit — publication service** (`libs/publication/src/processing/service.test.ts`)

* `listTypeHasExcel` true for all 10 FTT names
* `processPublication` sets `result.excelPath` to `<artefactId>.xlsx` for an FTT list type
* `processPublication` still returns `pdfPath` and sends notifications when the Excel generator rejects
* `sendPublicationNotificationsForArtefact` receives the `excelPath`

**Unit — notification template selection** (extend the existing suite)

* FTT publication, both files <2MB → `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`
* FTT publication, 3MB Excel → no-links template

**E2E** — extend, do not add spec files (one journey per spec, per `.claude/rules/e2e-testing.md`)

* `e2e-tests/tests/api/subscription-notifications.spec.ts` — publish one representative FTT list
  for a subscribed verified user, `waitForFileGeneration(artefactId, [".pdf", ".xlsx"])`, assert
  both files exist non-empty and the email body contains two document-download links
* `e2e-tests/tests/admin/non-strategic-upload.spec.ts` — extend the existing FTT upload journey to
  assert the `.xlsx` appears alongside the `.pdf`

**Not tested:** cell fonts, widths, fills, or any other visual styling of the workbook.

---

## 6. Accessibility

The deliverable is a spreadsheet, so WCAG 2.2 AA applies to the document, not to a new page.

* single header row in row 1, no merged cells and no metadata preamble — `Ctrl+Home` and screen
  reader table navigation both behave
* header text identical to the PDF table headings
* bold weight only for headers — no information carried by colour, contrast unaffected
* meaningful worksheet name rather than ExcelJS's default `Sheet1`
* one hearing per row, one field per column, no spacer rows/columns — a single contiguous table
* auto-fitted column widths (capped at 60 chars) so values are not visually truncated
* email link text is descriptive: "Download PDF version" / "Download Excel version"

No rendered HTML changes, so no new page-level accessibility surface; existing Axe checks on the
FTT list pages still apply.

---

## 7. CLARIFICATIONS NEEDED

1. **Does "the uploaded excel file will be re-used" mean the original bytes must be preserved?**
   This plan re-uses the uploaded workbook's *column definition* and regenerates the file from the
   validated JSON. Storing the raw upload would mean publishing unvalidated content (extra sheets,
   hidden rows, formulas, author metadata), would leave JSON-published lists with no Excel at all,
   and would keep whatever headers the uploader typed. If the BA specifically wants the original
   bytes, that is a different and smaller change in `non-strategic-upload-summary/index.ts` and
   needs a decision on those three consequences first.

2. **Is an on-page download journey expected, or is the email enough?** This plan assumes
   "downloadable options" means the two files exist and are linked from the subscription email.
   No non-SJP list type has on-page download links today — `MAGISTRATES_STANDARD_LIST` and
   `MAGISTRATES_PUBLIC_LIST` generate Excel with no on-page download. Adding the SJP
   disclaimer → file-list → download journey for 10 list types is a separate design and product
   decision (verified-user gating, disclaimer copy, page layout).

3. **Should PDF document-level metadata be in the workbook?** The PDF header carries the list
   title, "list for week commencing" and "last updated"; the footer carries the data source and the
   reporting-restrictions caution. This plan emits table columns only, consistent with the SJP and
   magistrates workbooks. If "all the data fields available in the current downloadable PDF" is
   meant to include that metadata and the caution notice, a preamble block or second worksheet is
   needed — which breaks the "row 1 is headers" contract that spreadsheet users and screen readers
   rely on.

4. **Welsh translations needed for four new `excelSheetName` values** (worksheet tab names,
   ≤31 characters): `WPAFCC Weekly Hearing List`, `FTT Tax Weekly Hearing List`,
   `FTT LR Weekly Hearing List`, `SEND Daily Hearing List`, plus the six RPT region names.
   Until supplied, `cy.excelSheetName` will hold the English string — see §2.3 for why the
   `[WELSH TRANSLATION REQUIRED: …]` marker cannot be used for a worksheet name.

5. **Pre-existing Welsh gap, flagged not fixed:** `cy.tableHeaders` in
   `ftt-tax-chamber-weekly-hearing-list` and
   `ftt-lands-registration-tribunal-weekly-hearing-list` currently hold **English** strings, and
   `wpafcc-weekly-hearing-list` holds `[WELSH TRANSLATION REQUIRED: …]` markers. A Welsh
   publication therefore already produces English/marker PDF headers, and the Excel will match it.
   Out of scope here because fixing it changes PDF output too — should it be raised as its own
   ticket, or folded into this one? (Note: `date`, `caseReferenceNumber`, `judges`, `members`,
   `venue` and `time` already have approved Welsh in `ftt-rpt` and `send`, so those are copyable.)

6. **Welsh Notify link text is out of scope.** `pdf_link_text` and `excel_link_text` are hardcoded
   English at `libs/notifications/src/govnotify/govnotify-client.ts:79,89`. A Welsh FTT publication
   will now show two English link labels instead of one. Localising them means threading the
   publication `locale` through `sendEmail` and adding Welsh Notify templates (Notify-side
   configuration). Recommend a separate ticket.

7. **Backfill:** assumption is that existing artefacts are not backfilled — only publications
   processed after release get an Excel; republishing regenerates both files. Confirm no backfill
   of in-window FTT publications is expected.

8. **To confirm during implementation:** that the live
   `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` template renders `excel_link_to_file` for
   non-SJP list names — it is currently only exercised by SJP and magistrates traffic. The ID is
   already configured (`apps/api/helm/values.yaml:12`, `apps/web/helm/values.yaml:25`), so this is
   a verification step, not a change.

9. **Third-party fulfilment unchanged:** `sendThirdPartyPublications` receives `pdfPath` only. No
   third-party consumer has asked for the Excel, so it is not added (YAGNI). Confirm that is correct.
