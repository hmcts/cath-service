# #943: Create additional file format for Download version of the First Tier Tribunal hearing list

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-08-12T13:21:31Z
**Updated:** 2026-08-18T12:15:20Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the excel download file for the First Tier Tribunal hearing lists.
 **First Tier Tribunal Hearing Lists:**
First Tier Tribunal (War Pensions and Armed Forces Compensation) Weekly hearing list
First Tier Tribunal (Tax Chamber) Weekly hearing list
First Tier Tribunal (Special Educational Needs and Disability) Daily hearing list
First Tier Tribunal (Land Registration Tribunal) Weekly hearing list
First Tier Tribunal (Property Chamber) - Residential Property Weekly hearing lists (for all regions)
 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from
 

**ACCEPTANCE CRITERIA**
- Excel and PDF downloadable files are made available as downloadable options for all the First Tier Tribunal hearing lists above
- The uploaded excel file will be re-used in providing the excel file for download
- All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-08-18T11:55:14Z

@spec 

### Comment by hmctsclaudecode on 2026-08-18T12:02:45Z

# Technical Specification — Issue #943: Excel download for First-tier Tribunal hearing lists

## 1. User Story
**As a** CaTH verified user subscribed to a First-tier Tribunal hearing list
**I want to** receive an Excel version of the list alongside the PDF
**So that** I can work with the hearing data in a spreadsheet instead of re-typing it out of a PDF

Supporting service-level story from the issue:

**As a** service
**I want to** provide additional download file options for hearing lists in CaTH
**So that** CaTH verified users have more options to choose from

## 2. Background

Today, when a publication is processed, `processPublication` (`libs/publication/src/processing/service.ts`) runs two registries:

* `PDF_GENERATOR_REGISTRY` — keyed by `listTypeName`, produces `<artefactId>.pdf` in the `publications` blob container.
* `EXCEL_GENERATOR_REGISTRY` — keyed by `listTypeName`, produces `<artefactId>.xlsx` in the same container.

All ten First-tier Tribunal list type names in scope are registered in the **PDF** registry but **not** in the Excel registry, so subscribers only ever get a PDF link.

The email side already supports two files and needs **no code change**. `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:465`) unconditionally attempts `downloadBlob("<artefactId>.xlsx")`, and `getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:37`) selects the `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` template whenever both files exist and both are under 2MB. That template ID is already populated in `apps/web/helm/values.yaml:25` and `apps/api/helm/values.yaml:12`. Once the `.xlsx` blob exists, both download links appear automatically.

The Excel *upload* path already exists for every list type in scope: each package registers an `ExcelConverterConfig` via `registerConverterByName` (e.g. `libs/list-types/wpafcc-weekly-hearing-list/src/conversion/wpafcc-config.ts:66`), which defines the exact column order and header text of the workbook courts upload. `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:136` currently discards the uploaded workbook after conversion:

```
// Store converted JSON in blob — original Excel is not stored (no value after conversion)
```

This ticket reverses that decision in effect, but not by storing the raw upload — see §14 for why.

**List types in scope** (10 names across 5 packages):

| Package | `listTypeName` |
|---|---|
| `wpafcc-weekly-hearing-list` | `WPAFCC_WEEKLY_HEARING_LIST` |
| `ftt-tax-chamber-weekly-hearing-list` | `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` |
| `send-daily-hearing-list` | `SEND_DAILY_HEARING_LIST` |
| `ftt-lands-registration-tribunal-weekly-hearing-list` | `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` |
| `ftt-rpt-weekly-hearing-list` | `FTT_RPT_EASTERN_WEEKLY_HEARING_LIST`, `FTT_RPT_LONDON_WEEKLY_HEARING_LIST`, `FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST`, `FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST`, `FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST`, `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` |

Reference implementations: `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` (renderer → ExcelJS → `saveExcelToStorage`) and `libs/excel-generation/src/excel/sjp-public-list-excel-generator.ts`.

## 3. Acceptance Criteria

* **Scenario:** Excel is generated when an FTT list is published from an uploaded workbook
    * **Given** an internal admin uploads a valid `.xlsx` for `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` and confirms the upload
    * **When** background publication processing completes
    * **Then** both `<artefactId>.pdf` and `<artefactId>.xlsx` exist in the `publications` blob container

* **Scenario:** Excel is generated when the same list is published as JSON via the API
    * **Given** a `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` payload is published through the publication API as JSON (no workbook was ever uploaded)
    * **When** `processPublication` runs
    * **Then** `<artefactId>.xlsx` is still produced, because the Excel is generated from the artefact JSON, not copied from an upload

* **Scenario:** Field parity with the PDF
    * **Given** a published FTT list with one hearing row per list type in scope
    * **When** the generated `.xlsx` is opened
    * **Then** row 1 contains one column per column shown in that list type's PDF table, in the same left-to-right order, and row 2 contains the same rendered values as the PDF row (including `dd/MM/yyyy` date formatting produced by the list type's renderer)

* **Scenario:** Subscription email shows both download links
    * **Given** a verified user is subscribed to `SEND_DAILY_HEARING_LIST` for a court
    * **And** the generated PDF and Excel are each under 2MB
    * **When** the list is published
    * **Then** the email uses the `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` template and contains both a "Download PDF version" link and a "Download Excel version" link

* **Scenario:** Welsh publication produces Welsh column headers
    * **Given** an FTT list is published with `language: WELSH` (`locale = "cy"`)
    * **When** the `.xlsx` is opened
    * **Then** the header row uses that list type's `cy.tableHeaders` values, matching the Welsh PDF

* **Scenario:** Excel generation failure does not block publication
    * **Given** Excel generation throws (e.g. blob upload failure)
    * **When** `processPublication` runs
    * **Then** the artefact, its search data and its PDF are unaffected, the error is logged, and the subscription email is sent with the PDF-only template

* **Scenario:** File too large for Notify
    * **Given** a generated `.xlsx` is 2MB or larger
    * **When** notifications are sent
    * **Then** the existing size guard applies and the no-links template is used (unchanged behaviour)

## 4. User Journey Flow

```
COURT / ADMIN                     CaTH                                  SUBSCRIBER
     |                              |                                        |
     |-- upload .xlsx ------------->|                                        |
     |                              | validate against JSON schema           |
     |                              | convertExcelForListTypeName()          |
     |                              |   -> rows JSON, stored as <id> blob    |
     |                              |                                        |
     |<-- upload success ---------- | processPublication() [background]      |
     |                              |   1. extractAndStoreArtefactSearch     |
     |                              |   2. generatePublicationPdf  -> <id>.pdf
     |                              |   3. generatePublicationExcel-> <id>.xlsx   <-- NEW for FTT
     |                              |   4. sendPublicationNotifications      |
     |                              |        - downloadBlob <id>.pdf         |
     |                              |        - downloadBlob <id>.xlsx        |
     |                              |        - template = PDF+EXCEL          |
     |                              |        - Notify prepareUpload x2 ----->| email with 2 links
     |                              |                                        |
     |                              |                                        |-- click "Download
     |                              |                                        |    Excel version"
     |                              |                                        |-- Notify document
     |                              |                                        |   service serves .xlsx
```

No new page, route or user-facing screen is introduced. The web list pages for these list types (`apps/web/src/pages/(list-types)/ftt-*`, `send-*`, `wpafcc-*`) stay as they are — see §11 and §14.

## 5. Low Fidelity Wireframe

**Subscription email as rendered by the existing PDF+Excel Notify template**

```
+--------------------------------------------------------------+
| GOV.UK Notify                                                |
+--------------------------------------------------------------+
|                                                              |
|  Court and tribunal hearings                                 |
|                                                              |
|  A hearing list you subscribed to has been published.        |
|                                                              |
|  Court or tribunal: Field House                              |
|  Hearing list:      First-tier Tribunal (Tax Chamber)        |
|                     Weekly Hearing List                      |
|  List date:         12 January 2026                          |
|                                                              |
|  Download PDF version      <- pdf_link_to_file               |
|  Download Excel version    <- excel_link_to_file    (NEW)    |
|                                                              |
|  Links expire after 1 week.                                  |
|                                                              |
|  Sign in to CaTH        Manage your subscriptions            |
+--------------------------------------------------------------+
```

**Generated workbook — `<artefactId>.xlsx`, single worksheet**

```
 Sheet name: "FTT Tax Chamber Weekly Hearing List"

     A          B             C            D                E          F           G
  +----------+-------------+------------+-----------------+----------+-----------+----------------+
1 | Date     | Hearing     | Case name  | Case reference  | Judge(s) | Member(s) | Venue/Platform |   <- bold header row
  |          | time        |            | number          |          |           |                |
  +----------+-------------+------------+-----------------+----------+-----------+----------------+
2 | 12/01/26 | 10:30am     | Smith v    | TC/2026/00123   | Judge A  | Mr B      | Taylor House   |
  +----------+-------------+------------+-----------------+----------+-----------+----------------+
3 | 12/01/26 | 2:00pm      | Jones v    | TC/2026/00124   | Judge C  |           | Video          |
  +----------+-------------+------------+-----------------+----------+-----------+----------------+
     ^ one row per hearing, same order as the PDF table
     ^ column widths auto-fitted (autoFitColumns), min 10 / max 60 chars
```

## 6. Page Specifications

No page changes. The work is three code changes plus tests.

### 6.1 Shared workbook builder (new)

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
}

export async function generateNonStrategicExcel(options: NonStrategicExcelOptions): Promise<{ success: boolean; excelPath?: string; error?: string }>
```

Behaviour:

* Creates one worksheet named `sheetName`, truncated to Excel's 31-character sheet-name limit with `[]:*?/\` stripped.
* Row 1 = `columns[].header`, bold (matches `magistrates-standard-list` styling; no fills or borders, keeping the file plain and screen-reader friendly).
* Rows 2..n = one row per entry in `rows`, cells taken by `fieldName`, missing/undefined rendered as `""`.
* Every cell value passed through the existing `sanitiseCellValue` (CSV/formula injection guard for leading `=`, `+`, `-`, `@`).
* `autoFitColumns(worksheet)` for widths.
* Persisted via the existing `saveExcelToStorage(artefactId, buffer)` → `<artefactId>.xlsx` in `CONTAINER.PUBLICATIONS`.
* Never throws: wraps in `try/catch` and returns `{ success: false, error }`.

Exported from `libs/list-types/common/src/index.ts`.

### 6.2 Per-package Excel generator (5 new thin files)

`libs/list-types/<package>/src/excel/excel-generator.ts`, one per package in scope. Each:

1. Loads the locale object (`cy` when `locale === "cy"`, else `en`).
2. Calls the package's existing renderer (e.g. `renderWpafccWeeklyHearingListData`) so the rows are **identical** to the ones the PDF renders — this is what guarantees date formatting parity.
3. Builds `columns` from the package's model field order (the same order as the registered `ExcelConverterConfig` and the PDF table), taking each `header` from `t.tableHeaders[fieldName]`.
4. Delegates to `generateNonStrategicExcel`.

Example (`wpafcc-weekly-hearing-list`):

```typescript
const COLUMN_FIELDS = ["date", "hearingTime", "caseReferenceNumber", "caseName", "panel", "modeOfHearing", "venue", "additionalInformation"] as const;

export async function generateWpafccWeeklyHearingListExcel(options: ExcelGenerationOptions) {
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
    sheetName: t.shortSheetName,
    columns: COLUMN_FIELDS.map((fieldName) => ({ fieldName, header: t.tableHeaders[fieldName] })),
    rows: hearings as unknown as Record<string, string>[]
  });
}
```

`ftt-rpt-weekly-hearing-list` exports a single generator used by all six region names — the columns are identical across regions; only the `sheetName`/list title differs, which is passed in from the registry entry (same shape as the existing `FTT_RPT_*` PDF registrations).

Each generator is exported from its package `index.ts`.

### 6.3 Registry wiring

`libs/publication/src/processing/service.ts` — add ten entries to `EXCEL_GENERATOR_REGISTRY`:

```typescript
const EXCEL_GENERATOR_REGISTRY: Partial<Record<string, ExcelGenerator>> = {
  // ...existing SJP + magistrates entries...
  WPAFCC_WEEKLY_HEARING_LIST: (p) => generateWpafccWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as WpafccWeeklyHearingList }),
  FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST: (p) => generateFttTaxChamberWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as FttTaxChamberHearingList }),
  SEND_DAILY_HEARING_LIST: (p) => generateSendDailyHearingListExcel({ ...p, jsonData: p.jsonData as SendDailyHearingList }),
  FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST: (p) => generateFttLrtWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as FttLrtHearingList }),
  FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: fttRptExcelGenerator("Eastern region"),
  FTT_RPT_LONDON_WEEKLY_HEARING_LIST: fttRptExcelGenerator("London region"),
  FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: fttRptExcelGenerator("Midlands region"),
  FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: fttRptExcelGenerator("Northern region"),
  FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: fttRptExcelGenerator("Southern region"),
  FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST: fttRptExcelGenerator("Market Rents")
};
```

Registration is explicit per name — do **not** switch the registry to "any non-strategic list type", which would silently ship Excel for ~30 out-of-scope list types.

No changes to `libs/notifications`, no changes to Helm values, no new environment variables, no database or Prisma changes, no `list-type-data.ts` changes.

### 6.4 Column mapping (PDF table → Excel columns)

| List type | Excel columns, in order |
|---|---|
| `WPAFCC_WEEKLY_HEARING_LIST` | Date, Hearing time, Case reference number, Case name, Panel, Mode of hearing, Venue, Additional information |
| `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | Date, Hearing time, Case name, Case reference number, Judge(s), Member(s), Venue/Platform |
| `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` | Date, Hearing time, Case name, Case reference number, Judge, Venue/Platform |
| `SEND_DAILY_HEARING_LIST` | Time, Case reference number, Respondent, Hearing type, Venue, Time estimate |
| `FTT_RPT_*_WEEKLY_HEARING_LIST` (6 regions) | Date, Time, Venue, Case type, Case reference number, Judge(s), Member(s), Hearing method, Additional information |

Each row above is the full set of fields in that package's `models/types.ts` and its PDF table — so AC "all data fields in the PDF are in the Excel" holds by construction, and a future field addition to a model that is not added to `COLUMN_FIELDS` is caught by the parity test in §13.

## 7. Content

All Excel header text comes from the existing `tableHeaders` objects in each package's `locales/en.ts` and `locales/cy.ts`. No new content keys are needed for the columns.

**New content key per package** — a short worksheet name (Excel caps sheet names at 31 characters, so the full list title cannot be used):

| Package | `en.shortSheetName` | `cy.shortSheetName` |
|---|---|---|
| `wpafcc-weekly-hearing-list` | `WPAFCC Weekly Hearing List` | [WELSH TRANSLATION REQUIRED: "WPAFCC Weekly Hearing List"] |
| `ftt-tax-chamber-weekly-hearing-list` | `FTT Tax Weekly Hearing List` | [WELSH TRANSLATION REQUIRED: "FTT Tax Weekly Hearing List"] |
| `ftt-lands-registration-tribunal-weekly-hearing-list` | `FTT LR Weekly Hearing List` | [WELSH TRANSLATION REQUIRED: "FTT LR Weekly Hearing List"] |
| `send-daily-hearing-list` | `SEND Daily Hearing List` | [WELSH TRANSLATION REQUIRED: "SEND Daily Hearing List"] |
| `ftt-rpt-weekly-hearing-list` | `FTT RPT Weekly Hearing List` | [WELSH TRANSLATION REQUIRED: "FTT RPT Weekly Hearing List"] |

**Pre-existing Welsh gap to close as part of this ticket.** `cy.tableHeaders` in `ftt-tax-chamber-weekly-hearing-list` and `ftt-lands-registration-tribunal-weekly-hearing-list` currently hold English strings, so a Welsh publication would produce English Excel headers (and already produces English PDF headers). Required Welsh values:

`libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/locales/cy.ts`

| Key | Welsh |
|---|---|
| `date` | Dyddiad |
| `hearingTime` | [WELSH TRANSLATION REQUIRED: "Hearing time"] |
| `caseName` | Enw'r Achos |
| `caseReferenceNumber` | [WELSH TRANSLATION REQUIRED: "Case reference number"] |
| `judges` | [WELSH TRANSLATION REQUIRED: "Judge(s)"] |
| `members` | Aelod(au) |
| `venuePlatform` | Lleoliad/ Platfform |

`libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/cy.ts`

| Key | Welsh |
|---|---|
| `date` | Dyddiad |
| `hearingTime` | [WELSH TRANSLATION REQUIRED: "Hearing time"] |
| `caseName` | Enw'r Achos |
| `caseReferenceNumber` | [WELSH TRANSLATION REQUIRED: "Case reference number"] |
| `judge` | [WELSH TRANSLATION REQUIRED: "Judge"] |
| `venuePlatform` | Lleoliad/ Platfform |

**Notify link text.** `libs/notifications/src/govnotify/govnotify-client.ts:79,89` hardcodes English link text for both files:

| Personalisation | Current value | Welsh needed |
|---|---|---|
| `pdf_link_text` | `Download PDF version` | [WELSH TRANSLATION REQUIRED: "Download PDF version"] |
| `excel_link_text` | `Download Excel version` | [WELSH TRANSLATION REQUIRED: "Download Excel version"] |

This is a pre-existing defect that this ticket makes more visible (a Welsh FTT publication would now show two English link labels instead of one). Localising it requires the publication `locale` to be threaded into `sendEmail`. Recommendation: raise as a separate ticket rather than expanding this one — flagged in §14.

## 8. URL

No new routes.

| Surface | Path | Change |
|---|---|---|
| Excel blob | `publications/<artefactId>.xlsx` | now written for the 10 FTT list type names |
| Excel delivery to users | GOV.UK Notify document service link, generated by `prepareUpload`, 1-week retention | no change |
| FTT list web pages | `/<urlPath>?artefactId=<uuid>` (e.g. `/ftt-tax-chamber-weekly-hearing-list`) | no change |
| SJP-style on-page download pages | `/<listType>/list-download-disclaimer`, `/<listType>/list-download-files`, `/<listType>/download?artefactId=&type=xlsx` | **not** extended to FTT lists in this ticket (see §14) |

## 9. Validation

No new user input, so no new form validation. Data-integrity rules for the generated workbook:

| Rule | Behaviour |
|---|---|
| Publication has no `jsonData` (flat file) | No Excel generated; `generatePublicationExcel` is only called inside the `if (jsonData)` branch of `processPublication` |
| `listTypeName` not in `EXCEL_GENERATOR_REGISTRY` | `generatePublicationExcel` returns `{}`, no blob written (unchanged) |
| `jsonData` is not an array of hearing rows | Generator returns `{ success: false, error }`; publication continues with PDF only |
| Zero hearing rows | Workbook is still written with the header row only, matching the PDF which renders an empty table |
| Cell value starts with `=`, `+`, `-` or `@` | Prefixed with `'` by `sanitiseCellValue` — formula-injection guard, already used by the magistrates generators |
| Cell value is `undefined`/`null` (optional field such as `additionalInformation`) | Written as an empty string, never `"undefined"` |
| Generated file ≥ 2MB | Blob is still written and downloadable; the notification layer falls back to the no-links template (existing `MAX_PDF_SIZE_BYTES` guard) |
| Excel generation throws | Caught, logged as `[<logPrefix>] Excel generation error`, publication and PDF unaffected |

Upload-side validation is unchanged: the workbook is still validated against the JSON schema and the `ExcelConverterConfig` validators before an artefact is created.

## 10. Error Messages

No user-facing error text is added — this feature is invisible when it fails, by design. Log messages only:

| Condition | Output |
|---|---|
| Generator returned `success: false` | `console.warn("[Non-Strategic Upload] Excel generation failed:", { artefactId, error })` (existing line in `generatePublicationExcel`) |
| Generator threw | `console.error("[Non-Strategic Upload] Excel generation error:", { artefactId, error })` (existing) |
| Workbook build failed inside the shared builder | Returned as `error: "Failed to generate <list type> Excel: <message>"`, mirroring `generateMagistratesStandardListExcel` |

No artefact ID, court name or hearing data beyond the artefact ID is logged, and no email addresses can reach these logs.

## 11. Navigation

* Admin upload journey: unchanged. Admin still lands on `/non-strategic-upload-success` immediately; Excel generation happens in the same background `processPublication` call as the PDF.
* Subscriber journey: the email gains a second link. Both links point at GOV.UK Notify's document service, not at CaTH, so no CaTH route or auth check is involved.
* FTT list pages: unchanged — no download link, disclaimer page or file-list page is added. This matches every other non-SJP list type, including `MAGISTRATES_STANDARD_LIST` and `MAGISTRATES_PUBLIC_LIST` which generate Excel but expose no on-page download. Only SJP has the `list-download-disclaimer` → `list-download-files` → `download` journey.

## 12. Accessibility

The deliverable is a spreadsheet attachment, so WCAG 2.2 AA applies to the document, not to a new page.

* **Single header row, row 1, no merged cells** — screen readers and `Ctrl+Home` navigation both work; no metadata preamble above the headers that would break the "first row is headings" assumption.
* **Header text identical to the PDF table headings** so a user comparing the two files sees the same labels.
* **Bold weight only** for the header row — no colour fill, so no information is carried by colour alone and contrast is unaffected.
* **Meaningful worksheet name** rather than the ExcelJS default `Sheet1`, announced by screen readers when the workbook opens.
* **One hearing per row, one field per column, no blank spacer rows or columns** — keeps the region a single contiguous table for assistive-technology table navigation.
* **Auto-fitted column widths** (capped at 60 characters) so values are not visually truncated at default zoom.
* **Email link text is descriptive** — "Download PDF version" / "Download Excel version" state both action and format; they are not "click here". The Welsh gap in that text is recorded in §7 and §14.
* No change to any rendered HTML page, so no new page-level accessibility surface. Existing Axe checks on the FTT list pages continue to apply.

## 13. Test Scenarios

**Unit — shared builder (`non-strategic-excel-generator.test.ts`)**

* Writes a bold header row from the supplied columns, in the supplied order
* Writes one data row per input row, cells resolved by `fieldName`
* Renders a missing or `undefined` field as an empty cell, not `"undefined"`
* Prefixes a value beginning with `=` so it is not treated as a formula
* Truncates a worksheet name longer than 31 characters and strips characters Excel forbids
* Writes a header-row-only workbook when given zero rows
* Uploads to `<artefactId>.xlsx` in the publications container and returns that path
* Returns `{ success: false, error }` instead of throwing when the blob upload rejects

**Unit — each of the five package generators (`excel/excel-generator.test.ts`)**

* Produces the expected column headers in English for `locale: "en"`
* Produces the Welsh headers from `cy.tableHeaders` for `locale: "cy"`
* Formats dates the same way the PDF does (rows come from the shared renderer, e.g. `12/01/2026`)
* Column parity guard: the generator's column field list equals the key set of the package's `tableHeaders`, so adding a model field without adding a column fails the build
* Locale parity guard: `Object.keys(en.tableHeaders).sort()` equals `Object.keys(cy.tableHeaders).sort()`
* `ftt-rpt`: the same generator is used for all six region names and the worksheet name reflects the region passed in

**Unit — publication service (`libs/publication/src/processing/service.test.ts`)**

* `listTypeHasExcel` returns true for all ten FTT list type names
* `processPublication` sets `result.excelPath` to `<artefactId>.xlsx` for an FTT list type
* `processPublication` still returns a `pdfPath` and sends notifications when the Excel generator rejects
* `sendPublicationNotificationsForArtefact` receives the `excelPath` it was given

**Unit — notification template selection (existing suite, extend)**

* An FTT publication with both files under 2MB selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`
* An FTT publication with a 3MB Excel selects the no-links template

**E2E (`@nightly`, extend `e2e-tests/tests/api/subscription-notifications.spec.ts`)**

* One journey per representative list type — publish an FTT list via the API for a subscribed verified user, poll `waitForFileGeneration(artefactId, [".pdf", ".xlsx"])`, assert both files exist with non-zero size, then assert the Notify email body contains two document-download links. Follow the existing SJP test in that file; do not add separate tests for size, Welsh and links.
* Extend the existing `e2e-tests/tests/admin/non-strategic-upload.spec.ts` FTT upload journey to assert the `.xlsx` appears alongside the `.pdf` after upload, rather than adding a new spec file.

**Not tested:** cell fonts, widths, fills or any other visual styling of the workbook.

## 14. Assumptions & Open Questions

* **AC "the uploaded excel file will be re-used" is implemented as regeneration from the artefact JSON using the uploaded workbook's own column definition, not as a byte-for-byte copy of the upload.** The registered `ExcelConverterConfig` *is* the uploaded file's schema, so users get the same columns, headers and values. Storing the raw upload was rejected because: (a) it would publish unvalidated content — extra worksheets, hidden rows/columns, formulas and author metadata that never passed schema validation — straight to subscribers; (b) roughly half of these publications arrive as JSON via the API, which would then have a PDF but no Excel, so the download options would be inconsistent for the same list type; (c) a Welsh publication would keep whatever headers the uploader typed. If the BA specifically wants the original bytes preserved, that is a different (smaller) change in `non-strategic-upload-summary/index.ts` and needs a decision on (a)–(c) first.
* **Assumption: "downloadable options" means the two files exist and are linked from the email, not that new download links are added to the FTT list web pages.** No non-SJP list type has on-page download links today; adding them for ten list types is a design and product decision (verified-user gating, disclaimer copy, page layout) well beyond this ticket. **Open question for the BA: is an on-page download journey expected for FTT lists, and if so should it reuse the SJP disclaimer → file-list pattern?**
* **Open question: should document-level PDF metadata be in the workbook?** The PDF header carries list title, "list for week commencing", "last updated" and "data source"; the PDF footer carries the reporting-restrictions caution text. The spec currently emits table columns only, consistent with the SJP and magistrates workbooks. If the AC "all the data fields available in the current downloadable PDF" is meant to include that metadata and the caution notice, a preamble block or a second worksheet is needed — flagging because it changes the "row 1 is headers" contract that spreadsheet users and screen readers rely on.
* **Welsh Notify link text is out of scope and should be raised separately.** `pdf_link_text` and `excel_link_text` are hardcoded English in `govnotify-client.ts`; localising them means threading publication `locale` through `sendEmail` and adding Welsh variants of the Notify templates themselves, which is Notify-side configuration work.
* **Assumption: no infrastructure change is required.** `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is already set in both `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml`, and the PDF+Excel Notify template already renders both link personalisations. To confirm during implementation: that the live template renders `excel_link_to_file` for non-SJP list names (it is currently only exercised by SJP and magistrates traffic).
* **Assumption: third-party fulfilment is unchanged.** `sendThirdPartyPublications` receives `pdfPath` only; no third-party consumer has asked for the Excel, so it is not added (YAGNI).
* **Assumption: the 2MB Notify limit is not a practical problem for these lists.** They are flat weekly/daily lists of tens to low hundreds of rows; an equivalent SJP Excel with thousands of rows stays well under the limit. No pagination or splitting is specified.
* **Assumption: existing artefacts are not backfilled.** Only publications processed after release get an Excel. Republishing an affected list regenerates both files. Confirm with the BA that no backfill of in-window FTT publications is expected.


### Comment by OgechiOkelu on 2026-08-18T12:15:20Z

@plan 
