# #945: Create additional file format for Download version of the administrative court hearing lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-08-12T13:32:01Z
**Updated:** 2026-08-18T12:49:42Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the excel download file for the administrative court hearing lists.
**Administrative Court Hearing Lists:**
Birmingham Administrative Court Daily Cause List
Leeds Administrative Court Daily Cause List
Bristol and Cardiff Administrative Court Daily Cause List
Manchester Administrative Court Daily Cause List

 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from

 

**ACCEPTANCE CRITERIA**
- Excel and PDF downloadable files are made available as downloadable options for all the administrative court hearing lists above
- The uploaded excel file will be re-used in providing the excel file for download
- All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-08-18T12:41:47Z

@spec 

### Comment by hmctsclaudecode on 2026-08-18T12:49:10Z

# Technical Specification — Issue #945: Excel download for Administrative Court hearing lists

## 1. User Story
**As a** verified CaTH user subscribed to an Administrative Court hearing list
**I want to** receive both a PDF and an Excel version of the published list in my subscription email
**So that** I can choose the format that suits how I work with the hearing data (reading vs. filtering, sorting and re-using the data)

Secondary (service) story from the ticket:

**As a** service
**I want to** provide additional download file options for hearing lists in CaTH
**So that** CaTH verified users have more options to choose from

## 2. Background

### Lists in scope
Four non-strategic list types, all sharing the same 7-field shape (`RCJ_EXCEL_CONFIG`) and the same lib (`libs/list-types/administrative-court-daily-cause-list`):

| `list_type.name` (stable key) | Friendly name |
|---|---|
| `BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | Birmingham Administrative Court Daily Cause List |
| `LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | Leeds Administrative Court Daily Cause List |
| `BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | Bristol and Cardiff Administrative Court Daily Cause List |
| `MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | Manchester Administrative Court Daily Cause List |

The **London** Administrative Court Daily Cause List is a separate lib/list type and is **not** named in this ticket — out of scope (see §14).

### Current behaviour
1. An internal user uploads an `.xlsx` via `/non-strategic-upload`. On confirm, `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` converts it to JSON with `convertExcelForListTypeName(...)`, stores **only the converted JSON** blob (`saveUploadedFile(artefactId, artefactId, …)` → `CONTAINER.ARTEFACT`), and records the original file name in `artefact.source_artefact_id`. The comment on that line is explicit: *"original Excel is not stored (no value after conversion)"*.
2. `processPublication` (`libs/publication/src/processing/service.ts`) then generates a PDF via `PDF_GENERATOR_REGISTRY` (admin court is registered) and attempts Excel via `EXCEL_GENERATOR_REGISTRY` (admin court is **not** registered → skipped), then sends notifications.
3. `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:465`) unconditionally probes `downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS)`. Because no `.xlsx` exists, `hasExcel` is `false` and `getSubscriptionTemplateId` selects `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` — the PDF-only email.

### Consequence
The **only** missing piece is an `.xlsx` blob at `{artefactId}.xlsx` in `CONTAINER.PUBLICATIONS`. The notification layer, the dual-link Notify template (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`, already set in `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml`), the 2 MB guard and the `excel_link_to_file` personalisation all exist and are list-type agnostic. **No notification, Helm, env-var or Notify-template changes are required.**

### On AC 2 — "the uploaded excel file will be re-used"
Taken literally this means persisting the admin's uploaded workbook and serving that byte-for-byte. This spec deliberately does **not** do that, because it conflicts with AC 3 and with existing service behaviour:

* The uploaded template contains only the 7 data columns — no list title, list date, last-updated stamp, important information, judgments text, data source or Special Category Data caution. AC 3 ("all the data fields available in the current downloadable PDF file should also be available on the excel downloadable file") cannot be met by the raw upload.
* The uploaded workbook is untrusted admin input: arbitrary extra sheets, hidden rows/columns, formulas, macros and author metadata would be republished verbatim to subscribers. Every other Excel download in CaTH (SJP, Magistrates Public, Magistrates Standard) is generated server-side and sanitised via `sanitiseCellValue` (CSV-injection guard).
* Welsh publications would ship English-only column headers.

**Approach taken:** re-use the uploaded Excel's *data* — the converted JSON derived from it, which is the canonical, schema-validated representation — and regenerate a clean, localised workbook using the established `saveExcelToStorage` pattern. This satisfies the intent of AC 2 (no second data source; no re-keying) while meeting AC 3. If the business genuinely requires the original bytes, that is a different (and larger) change — see §14.

### Reference implementations
* `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` — canonical per-lib Excel generator using `@hmcts/list-types-common` helpers.
* `libs/list-types/common/src/excel/excel-utilities.ts` — `sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage`.
* `libs/publication/src/processing/service.ts:363` — `EXCEL_GENERATOR_REGISTRY`.

## 3. Acceptance Criteria

* **Scenario:** Excel is generated when an Administrative Court list is published
    * **Given** an internal user has uploaded a valid Birmingham, Leeds, Bristol and Cardiff, or Manchester Administrative Court Daily Cause List `.xlsx`
    * **When** the upload is confirmed and `processPublication` runs
    * **Then** an `.xlsx` blob is written to `{artefactId}.xlsx` in `CONTAINER.PUBLICATIONS` alongside the existing `{artefactId}.pdf`

* **Scenario:** Excel contains every field present in the PDF
    * **Given** a published Administrative Court list with at least one hearing
    * **When** the generated workbook is opened
    * **Then** the hearings sheet has the 7 columns Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information in that order, one row per hearing
    * **And** an "Important information" sheet carries the list title, list date, last-updated date/time, court-specific important information, judgments heading and text, data source and both Special Category Data caution paragraphs

* **Scenario:** Subscription email offers both formats
    * **Given** a verified user is subscribed to a location or list type covering the published Administrative Court list
    * **When** the publication notification is sent
    * **Then** `getSubscriptionTemplateId` resolves to `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`
    * **And** the email renders both a PDF download link and an Excel download link

* **Scenario:** Welsh publication produces a Welsh workbook
    * **Given** an Administrative Court list uploaded with language `WELSH`
    * **When** the Excel is generated (`locale === "cy"`)
    * **Then** the sheet names, column headers, list title, labels and caution text are the Welsh strings from `libs/list-types/administrative-court-daily-cause-list/src/locales/cy.ts`

* **Scenario:** Republished list replaces the previous Excel
    * **Given** a list already published for a location, list type, content date and language
    * **When** the same combination is uploaded again (`createArtefact` returns `isUpdate: true`, reusing the `artefactId`)
    * **Then** `{artefactId}.xlsx` is overwritten with the new data and no stale workbook is retained

* **Scenario:** List with no hearings
    * **Given** a published Administrative Court list whose JSON array is empty
    * **When** the Excel is generated
    * **Then** the workbook is still produced with the header row and the "Important information" sheet, and zero data rows

* **Scenario:** Excel failure does not block publication
    * **Given** Excel generation throws (for example a blob-storage outage)
    * **When** `generatePublicationExcel` runs
    * **Then** the error is logged, `hasExcel` is falsy, the artefact and PDF remain published, and the PDF-only email is sent

* **Scenario:** Oversized files fall back safely
    * **Given** the generated Excel is 2 MB or larger
    * **When** the notification is built
    * **Then** the existing `filesUnder2MB` guard selects the no-links template rather than failing the send

## 4. User Journey Flow

```
INTERNAL USER (publisher)
┌──────────────────────┐   ┌───────────────────────┐   ┌────────────────────────┐
│ /non-strategic-      │──▶│ /non-strategic-       │──▶│ /non-strategic-upload- │
│ upload  (choose      │   │ upload-summary        │   │ success                │
│ court, list type,    │   │ (check answers)       │   │                        │
│ .xlsx file, dates)   │   │        POST confirm   │   │                        │
└──────────────────────┘   └───────────┬───────────┘   └────────────────────────┘
                                       │ (synchronous)
                          convertExcelForListTypeName()
                          saveUploadedFile()  -> {artefactId}          (JSON, ARTEFACT)
                          updateSourceArtefactId(original .xlsx name)
                                       │
                                       ▼ (background, fire-and-forget)
                              processPublication()
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
        generatePublicationPdf   generatePublicationExcel   sendPublicationNotifications…
          -> {artefactId}.pdf      -> {artefactId}.xlsx            │
             (PUBLICATIONS)           (PUBLICATIONS)   ◀── NEW ────┘
                                                                   │
VERIFIED USER (subscriber)                                         ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK Notify email (template …SUBSCRIPTION_PDF_EXCEL)                        │
│   • "Download PDF version"   -> Notify document link (1 week retention)       │
│   • "Download Excel version" -> Notify document link (1 week retention)  NEW  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Where the change lands (only two packages):

```
libs/list-types/administrative-court-daily-cause-list
  src/excel/excel-generator.ts        NEW  generateAdministrativeCourtDailyCauseListExcel()
  src/excel/excel-generator.test.ts   NEW
  src/locales/{en,cy}.ts              EDIT add common.excelSheetName
  src/index.ts                        EDIT export the generator
  package.json                        EDIT add exceljs 4.4.0

libs/publication
  src/processing/service.ts           EDIT 4 EXCEL_GENERATOR_REGISTRY entries + provenance passthrough
  src/processing/service.test.ts      EDIT
```

## 5. Low Fidelity Wireframe

### Subscription email (after the change)

```
┌──────────────────────────────────────────────────────────────────┐
│  GOV.UK Notify                                                   │
│                                                                  │
│  Court and tribunal hearings: new publication                    │
│  ──────────────────────────────────────────────────────────────  │
│  Dear Alex Smith,                                                │
│                                                                  │
│  A hearing list you subscribe to has been published.             │
│                                                                  │
│  Court or tribunal: Birmingham Civil and Family Justice Centre    │
│  Hearing list:      Birmingham Administrative Court Daily         │
│                     Cause List                                   │
│  List for:          18 August 2026                               │
│                                                                  │
│  Download the hearing list                                       │
│    • Download PDF version                       (existing)       │
│    • Download Excel version                     ◀── NEW          │
│                                                                  │
│  Links expire after 1 week.                                      │
│                                                                  │
│  Manage your subscriptions | Court and tribunal hearings         │
└──────────────────────────────────────────────────────────────────┘
```

### Generated workbook — Sheet 1: "Hearings"

```
     A            B         C       D             E              F              G
 1 ┌───────────┬─────────┬───────┬─────────────┬──────────────┬──────────────┬───────────────────────┐
   │ Venue     │ Judge   │ Time  │ Case Number │ Case Details │ Hearing Type │ Additional Information│  ← bold, frozen
 2 ├───────────┼─────────┼───────┼─────────────┼──────────────┼──────────────┼───────────────────────┤
   │ Court 1   │ HHJ Doe │ 10:30am│ CO/1234/2026│ R v Smith   │ Judicial Rev.│ Remote attendance     │
 3 │ Court 2   │ HHJ Roe │ 2pm   │ CO/5678/2026│ R v Jones   │ Directions   │                       │
   └───────────┴─────────┴───────┴─────────────┴──────────────┴──────────────┴───────────────────────┘
   Header row frozen (freeze pane at A2). Column widths auto-fitted (10–60 chars).
```

### Generated workbook — Sheet 2: "Important information"

```
     A
 1 │ Birmingham Administrative Court Daily Cause List            (bold)
 2 │ List for 18 August 2026
 3 │ Last updated 18 August 2026 at 09:15am
 4 │
 5 │ Important information                                       (bold)
 6 │ Hearings take place in public unless otherwise indicated. …
 7 │ Judgments                                                   (bold)
 8 │ Judgments handed down by the judge remotely will be …
 9 │
10 │ Data source: Manual upload
11 │ Note this document contains Special Category Data as …
12 │ This document contains information intended to assist …
```

## 6. Page Specifications

No new or changed web pages. The deliverables are a document generator and a registry entry.

### 6.1 `generateAdministrativeCourtDailyCauseListExcel`
`libs/list-types/administrative-court-daily-cause-list/src/excel/excel-generator.ts` (new)

Signature mirrors `generateMagistratesStandardListExcel` so it drops straight into the registry:

```ts
interface ExcelGenerationOptions {
  artefactId: string;
  listTypeName: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  provenance?: string;
  jsonData: AdministrativeCourtHearingList;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}
```

Behaviour:

1. Load translations with `loadTranslations(locale, () => import("../locales/en.js"), () => import("../locales/cy.js"))` — same helper the PDF generator uses.
2. Resolve `court = translations[listTypeName]`. If the key is absent (unknown `listTypeName`), return `{ success: false, error: … }` rather than throwing — the caller logs and continues.
3. Build the rendered view model with the **existing** `renderAdminCourt(jsonData, { locale, listTypeName, listTitle, contentDate, lastReceivedDate: new Date().toISOString() })`, where `listTitle = court.pageTitle`. This reuses `normaliseHearings` and the shared date formatters, so the Excel header metadata is identical to the PDF's.
   * Note: the PDF generator resolves its title from an English-only `LIST_TITLE_MAP`. The Excel uses the locale's `pageTitle`, which is correctly translated. Do **not** copy the English map; the PDF's behaviour is a pre-existing inconsistency (see §14).
4. Sheet 1, named `t.common.excelSheetName`:
   * Row 1 — header row from `t.common.tableHeaders` in fixed order: `venue`, `judge`, `time`, `caseNumber`, `caseDetails`, `hearingType`, `additionalInformation`. `headerRow.font = { bold: true }`.
   * `worksheet.views = [{ state: "frozen", ySplit: 1 }]` so the header stays visible.
   * One row per hearing, every cell passed through `sanitiseCellValue(...)` and coerced to a string (`?? ""`) so a missing optional field yields an empty cell rather than `undefined`.
   * `autoFitColumns(worksheet)`.
5. Sheet 2, named `t.common.importantInfoTitle` (17 chars in both locales — within Excel's 31-character sheet-name limit): the rows shown in §5. All values `sanitiseCellValue`d; label rows bold. Column A width capped by `autoFitColumns`. `provenance` is mapped through `PROVENANCE_LABELS` exactly as the PDF generator does; the "Data source" row is omitted when `provenance` is absent.
6. `const buffer = await workbook.xlsx.writeBuffer();` then `const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));` → writes `{artefactId}.xlsx` to `CONTAINER.PUBLICATIONS` with the correct `xlsx` content type, overwriting any previous blob for the same artefact.
7. Wrap the whole body in `try/catch`; on error return `{ success: false, error: `Failed to generate Administrative Court Excel: ${message}` }`.

**Sheet-name constraint:** ExcelJS rejects sheet names over 31 characters and the characters `* ? : \ / [ ]`. The court page titles are far longer than 31 characters, so the sheet names **must** be the short localised constants above, never `court.pageTitle`.

### 6.2 Registry wiring
`libs/publication/src/processing/service.ts`

```ts
const adminCourtExcelGenerator: ExcelGenerator = (p) =>
  generateAdministrativeCourtDailyCauseListExcel({ ...p, jsonData: p.jsonData as AdministrativeCourtHearingList });

const EXCEL_GENERATOR_REGISTRY: Partial<Record<string, ExcelGenerator>> = {
  // …existing entries…
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtExcelGenerator,
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtExcelGenerator,
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtExcelGenerator,
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtExcelGenerator
};
```

Keys are the stable `list_type.name` strings. **Never** key on `listTypeId` — the column is autoincrement and differs per environment.

Two supporting edits in the same file:

* Add `provenance?: string;` to `GenerateExcelParams` and pass `provenance` through from `processPublication`'s existing `params` when calling `generatePublicationExcel` (currently it is only threaded into the PDF path). Without it the "Data source" row cannot be populated.
* No change to `listTypeHasExcel`, `generatePublicationExcel` error handling, or the notification call — `result.excelPath` is already set from `hasExcel`.

**Ordering note:** `generatePublicationExcel` is called with `listTypeName: pdfResult.listTypeName ?? ""`. `generatePublicationPdf` returns `listTypeName` on the success path, on the "no generator" path and on the "generator returned failure" path, but returns `{}` if the list-type lookup itself throws. In that case Excel is skipped too. That is acceptable (a DB failure means the publication is already degraded) but should be understood rather than discovered.

### 6.3 Package changes
* `libs/list-types/administrative-court-daily-cause-list/package.json` — add `"exceljs": "4.4.0"` to `dependencies` (pinned, matching the other Excel-producing libs).
* `libs/list-types/administrative-court-daily-cause-list/src/index.ts` — add `export * from "./excel/excel-generator.js";`.
* No `libs/publication/package.json` change: `@hmcts/administrative-court-daily-cause-list` is already a dependency (the PDF generator is imported from it).

## 7. Content

### 7.1 New locale keys
Only one new key is needed in each locale file — the column headers, list-title, labels and caution text already exist under `common` and per-court keys and are reused verbatim.

`libs/list-types/administrative-court-daily-cause-list/src/locales/en.ts` (inside `common`):
```ts
excelSheetName: "Hearings"
```

`libs/list-types/administrative-court-daily-cause-list/src/locales/cy.ts` (inside `common`):
```ts
excelSheetName: "[TRANSLATE: \"Hearings\"]"
```

### 7.2 Reused content (no new translation work)

| Purpose | Key | English | Welsh (already present) |
|---|---|---|---|
| Column 1 | `common.tableHeaders.venue` | Venue | Lleoliad |
| Column 2 | `common.tableHeaders.judge` | Judge | Barnwr |
| Column 3 | `common.tableHeaders.time` | Time | Amser |
| Column 4 | `common.tableHeaders.caseNumber` | Case Number | Rhif yr achos |
| Column 5 | `common.tableHeaders.caseDetails` | Case Details | Manylion yr achos |
| Column 6 | `common.tableHeaders.hearingType` | Hearing Type | Math o wrandawiad |
| Column 7 | `common.tableHeaders.additionalInformation` | Additional Information | Gwybodaeth ychwanegol |
| Sheet 2 name / heading | `common.importantInfoTitle` | Important information | Gwybodaeth bwysig |
| List date label | `common.listFor` | List for | Rhestr ar gyfer |
| Last updated label | `common.lastUpdated` / `common.at` | Last updated / at | Diweddarwyd ddiwethaf / am |
| Data source label | `common.dataSource` | Data source | Ffynhonnell data |
| Caution paragraphs | `common.cautionNote`, `common.cautionReporting` | (as in `en.ts`) | (as in `cy.ts`) |
| List title | `<LIST_TYPE_NAME>.pageTitle` | e.g. Leeds Administrative Court Daily Cause List | e.g. Rhestr Achosion Dyddiol Llys Gweinyddol Leeds |
| Court important info | `<LIST_TYPE_NAME>.importantInfoText` | (as in `en.ts`) | (as in `cy.ts`) |
| Judgments | `<LIST_TYPE_NAME>.judgmentsTitle`, `.judgmentsText` | (as in `en.ts`) | (as in `cy.ts`) |

Locale-key parity must hold: `expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort())`.

### 7.3 Email link text
`link text` for both attachments is set in `libs/notifications/src/govnotify/govnotify-client.ts` and is currently hardcoded English for **every** list type:

* `pdf_link_text` → "Download PDF version"
* `excel_link_text` → "Download Excel version"

No change is made here. The English-only link text on Welsh publications is a pre-existing, service-wide defect and is called out in §14 rather than fixed under this ticket.

## 8. URL

No new HTTP routes.

| Artefact | Location | Container |
|---|---|---|
| Converted JSON (source of truth) | `{artefactId}` | `CONTAINER.ARTEFACT` |
| PDF (existing) | `{artefactId}.pdf` | `CONTAINER.PUBLICATIONS` |
| **Excel (new)** | `{artefactId}.xlsx` | `CONTAINER.PUBLICATIONS` |

Download URLs in the email are ephemeral GOV.UK Notify document-service links created by `prepareUpload(buffer, { confirmEmailBeforeDownload: false, retentionPeriod: "1 week" })`.

Existing public pages are unchanged:
* `/birmingham-administrative-court-daily-cause-list?artefactId=…`
* `/leeds-administrative-court-daily-cause-list?artefactId=…`
* `/bristol-cardiff-administrative-court-daily-cause-list?artefactId=…`
* `/manchester-administrative-court-daily-cause-list?artefactId=…`

## 9. Validation

No user-facing validation changes. Existing upload-time validation is the only gate and is unchanged:

* `ADMIN_COURT_EXCEL_CONFIG` (= `RCJ_EXCEL_CONFIG`) — all 7 columns required, `validateTimeFormat` on `time`, `validateNoHtmlTags` on the free-text fields. A missing column or empty required cell rejects the upload before any artefact is stored.
* `validateAdministrativeCourtDailyCauseList` — JSON Schema check on the converted data.

Generator-level rules:

| Input condition | Behaviour |
|---|---|
| `jsonData` is an empty array | Workbook produced with header row and Sheet 2 only, zero data rows. Success. |
| `listTypeName` not in the locale object | `{ success: false, error }`; publication and PDF unaffected. |
| Cell value starts with `=`, `+`, `-` or `@` | Prefixed with `'` by `sanitiseCellValue` (CSV/formula-injection guard). |
| Optional field `undefined`/`null` | Written as an empty string, never `"undefined"`. |
| Generated file ≥ 2 MB | Excluded from the email by the existing `MAX_PDF_SIZE_BYTES` check in `buildEmailDataWithFiles`; the no-links template is used. The blob is still written. |

## 10. Error Messages

No user-facing error messages — generation is a background step with no UI surface. Log messages only:

| Condition | Where | Message |
|---|---|---|
| Generator returns failure | `generatePublicationExcel` (existing) | `[Non-Strategic Upload] Excel generation failed: { artefactId, error }` (`console.warn`) |
| Generator throws | `generatePublicationExcel` (existing) | `[Non-Strategic Upload] Excel generation error: { artefactId, error }` (`console.error`) |
| Unknown `listTypeName` | new generator return value | `Failed to generate Administrative Court Excel: unsupported list type '<name>'` |
| Blob write / ExcelJS failure | new generator return value | `Failed to generate Administrative Court Excel: <message>` |

Do not log hearing data, case numbers or subscriber email addresses. Notification errors are already email-redacted in `sendPublicationNotificationsForArtefact`.

## 11. Navigation

* Internal-user journey is unchanged: upload → check answers → success. Excel generation happens in the background `processPublication` call after the success page renders, so it never blocks or times out the admin request.
* Subscriber navigation: the email contains two document links plus the existing "Manage your subscriptions" and start-page links. Both document links open/download directly; neither routes back into CaTH, so no in-service navigation changes.
* The public HTML list pages gain no download links under this ticket (see §14).

## 12. Accessibility

The web UI is untouched, so WCAG 2.2 AA compliance of the service is unaffected. Document-level accessibility requirements for the new workbook:

* **Single header row, first row.** Sheet 1 begins its table at A1 with exactly one header row — no merged cells, no title rows above the table, no blank spacer rows. This is what lets screen readers and Excel's own navigation announce column context.
* **No merged cells anywhere.** Merged cells break screen-reader row/column association.
* **Meaningful sheet names.** `Hearings` / `Important information` (localised) rather than `Sheet1` / `Sheet2`, so the sheet tabs are self-describing.
* **Frozen header row** rather than a repeated header, so assistive technology sees one header per column.
* **No colour-only meaning.** Bold is used for headings only, always alongside position/structure. No fills or font colours carry information.
* **Text alternatives not required** — the workbook contains no images, charts or shapes.
* **Explanatory text is real text**, not comments or notes: the important-information and caution content lives in cells on Sheet 2 so it is reachable by keyboard and screen reader.
* **Email links have descriptive text** — "Download PDF version" / "Download Excel version" state both action and format, not "click here". (Welsh-locale link text is a known pre-existing gap, §14.)
* Both formats remain available, which is itself an accessibility win: users who cannot work with PDF tables get a machine-readable alternative of the same data.

## 13. Test Scenarios

Unit — `libs/list-types/administrative-court-daily-cause-list/src/excel/excel-generator.test.ts` (new; mock `@hmcts/list-types-common`'s `saveExcelToStorage` only, read back the generated buffer with ExcelJS and assert on the parsed workbook):

* Generates a workbook with two sheets, named `Hearings` and `Important information`, for a valid Birmingham list.
* Sheet 1 row 1 contains the 7 English column headers in the specified order and is bold.
* One data row per hearing, with each of the 7 fields in the correct column for a multi-hearing fixture.
* A hearing with an empty `additionalInformation` produces an empty cell, not `"undefined"`.
* A cell value beginning with `=` is written with a leading apostrophe (formula-injection guard).
* Sheet 2 contains the list title, "List for <date>", "Last updated <date> at <time>", the court-specific important-information text, the judgments heading and text, and both caution paragraphs.
* Sheet 2 includes a "Data source" row when `provenance` is supplied and omits it when it is not.
* Welsh locale (`locale: "cy"`) produces Welsh sheet names, Welsh column headers, the Welsh `pageTitle` and Welsh caution text.
* Each of the four list-type names resolves to its own court title and important-information text.
* An unrecognised `listTypeName` returns `{ success: false }` with an error and does not call `saveExcelToStorage`.
* An empty hearings array still returns success with a header-only Sheet 1.
* A `saveExcelToStorage` rejection is caught and returned as `{ success: false, error }` — no throw escapes.
* `saveExcelToStorage` is called with the `artefactId` so the blob key is `{artefactId}.xlsx`.

Unit — `libs/publication/src/processing/service.test.ts` (extend):

* `listTypeHasExcel` returns `true` for all four Administrative Court list-type names.
* `generatePublicationExcel` invokes the Administrative Court generator and reports `hasExcel: true` for each of the four names.
* `processPublication` sets `result.excelPath` to `{artefactId}.xlsx` and forwards it to `sendPublicationNotificationsForArtefact` for an Administrative Court list.
* `processPublication` forwards `provenance` into `generatePublicationExcel`.
* A generator failure leaves `excelPath` undefined while the PDF path and notification call still proceed.
* Test fixtures use an arbitrary `listTypeId` (e.g. `999`) to prove routing is driven solely by `listTypeName`.

Unit — `libs/notifications` (extend existing tests, no new behaviour):

* Confirms the `PDF_EXCEL` template is selected when both a `.pdf` and a `.xlsx` exist for the artefact, and the no-links template when the Excel exceeds 2 MB. Covers the AC-4 outcome without duplicating notification logic per list type.

Locale parity:

* `common` key sets of `en.ts` and `cy.ts` are identical after adding `excelSheetName`.

E2E — extend the existing non-strategic upload journey in `e2e-tests/tests/admin/` rather than adding a new spec (one test per journey):

* An internal user uploads a Birmingham Administrative Court Daily Cause List `.xlsx`, confirms, sees the success page, and the published list renders at its public URL; the journey also covers the Welsh toggle and an inline Axe scan on the pages visited. Email delivery and Notify document links are not assertable from Playwright — verified manually against staging.

Manual verification on staging (record in the ticket):

* Publish one list per court, in English and in Welsh; confirm both links appear in the received email, that the Excel opens in Excel and LibreOffice, that headers and title are in the expected language, and that the downloaded file has a usable `.xlsx` filename.

## 14. Assumptions & Open Questions

* **AC 2 is interpreted as "re-use the uploaded list's data, not the uploaded file's bytes."** The workbook is regenerated from the converted JSON that the upload produced. Rationale in §2. If the business insists on serving the original uploaded workbook verbatim, that requires storing a second blob at upload time, a sanitisation/virus-scan decision for admin-supplied files, and an accepted failure of AC 3 — raise as a separate ticket before implementing.
* **AC 1's "downloadable options" is read as the email attachments**, consistent with the ticket's own problem statement ("only the PDF download file is available … in the email notification"). No PDF/Excel download links are added to the public HTML list pages. Only SJP has such a page today (`list-download-files`, `list-download-disclaimer`); adding it for Administrative Court lists would need design input on whether the SJP data-handling disclaimer applies. **Open question for the BA: is an on-page download panel expected as well?**
* **London Administrative Court Daily Cause List is excluded** — it is a separate list type and lib and is not named in the ticket. It has the same shape, so the work is a near-copy if it is wanted. **Open question: should it be included now?**
* **Sheet 2 is the chosen home for the PDF's non-tabular content.** The alternative (metadata rows above the table on Sheet 1) was rejected because it breaks the single-header-row accessibility rule and defeats sorting/filtering. Confirm with the BA that a second sheet is acceptable presentation.
* **The PDF's list title is English-only for Welsh publications** (`LIST_TITLE_MAP` in `pdf/pdf-generator.ts`), whereas the new Excel uses the localised `pageTitle`. The two documents will therefore disagree on the title for Welsh publications. This is a pre-existing PDF defect; fixing it is a one-line change but is out of scope here. Raise separately.
* **`excel_link_text` / `pdf_link_text` are hardcoded English** in `govnotify-client.ts` for all list types, and the Notify templates themselves are English. Welsh subscribers get English link text today. Pre-existing and service-wide — out of scope, flagged for a dedicated ticket.
* **The Notify document filename is not set.** `prepareUpload` is called without a `filename` option. Verify on staging that the downloaded Excel arrives with a `.xlsx` extension; if it does not, pass a `filename` to `prepareUpload` (this would affect the PDF link too, so treat as a shared fix).
* **No migration or backfill.** Artefacts published before this change have no `.xlsx` blob and their emails have already been sent. Republishing a list (same location, list type, content date and language) regenerates both files and re-notifies, which is the existing mechanism if a backfill is ever requested.
* **No database, Prisma schema, Helm, or env-var changes.** `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is already populated in both `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml`; local development needs it in `.env` (it is present in `.env.example`). If it were unset, `getSubscriptionTemplateId` would throw for these lists once an Excel exists — worth a smoke test on the first deployed environment.
* **Performance:** these are daily cause lists of tens to low hundreds of rows; workbook generation is negligible next to Chromium PDF rendering and runs in the same background task, so no timeout or queueing changes are needed.


### Comment by OgechiOkelu on 2026-08-18T12:49:42Z

@plan 

