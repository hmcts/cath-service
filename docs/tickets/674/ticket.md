# #674: Excel - Crown hearing lists

**State:** OPEN
**Assignees:** 
**Author:** OgechiOkelu
**Labels:** enhancement, status:new, type:story
**Created:** 2026-06-04T13:29:20Z
**Updated:** 2026-08-20T11:54:10Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the Excel downloadable version of the Crown hearing lists.

**AS A** service

**I WANT** to provide additional download file options for hearing lists in CaTH

**SO THAT** CaTH verified users have more options to choose from


**ACCEPTANCE CRITERIA**

- Excel and PDF downloadable files are made available as downloadable options for the Crown hearing lists

- Links to download both file types are displayed in the email notifications

- The data fields / columns should be uniform on both the Excel and PDF downloadable files for all the Crown hearing lists

- The following fields are provided for the Crown Daily List: Court House, Court Room, Judge, Sitting at, Hearing Time, Case Reference, Defendant Name(s), Hearing Type, Prosecuting Authority, Listing Notes
-  The following fields are provided for the Crown Firm List: Date, Court House, Court Room, Judge, Sitting at, Hearing Time, Case Number, Defendant Name(s), Hearing Type, Representative, Prosecuting Authority, Listing Notes
- The following fields are provided for the Crown Advance List: Hearing, Fixed For, Case Reference, Defendant Name(s), Prosecuting Authority, Linked Cases, Listing Notes
- This ticket is dependent on the completion of #957 

## Comments

### Comment by OgechiOkelu on 2026-08-20T11:43:16Z

@spec 

---

### Comment by hmctsclaudecode on 2026-08-20T11:52:46Z

# Technical Specification — Issue #674: Excel — Crown hearing lists

## 1. User Story

**As a** verified user of the Court and Tribunal Hearings service (CaTH)
**I want to** download the Crown Daily List, Crown Firm List and Crown Warned List as a Microsoft Excel spreadsheet as well as a PDF
**So that** I can filter, sort and re-use the hearing data in my own tools instead of re-typing it out of a PDF

---

## 2. Background

### What already exists

The three Crown hearing list types are fully implemented for on-screen rendering and PDF generation:

| List type name (stable, `@unique`) | Lib | Renderer | PDF generator |
|---|---|---|---|
| `CROWN_DAILY_LIST` | `libs/list-types/crown-daily-list` | `renderCrownDailyListData` | `generateCrownDailyListPdf` |
| `CROWN_FIRM_LIST` | `libs/list-types/crown-firm-list` | `renderCrownFirmListData` | `generateCrownFirmListPdf` |
| `CROWN_WARNED_LIST` | `libs/list-types/crown-warned-list` | `renderCrownWarnedListData` | `generateCrownWarnedListPdf` |

All three are already registered in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:201-203`). **No PDF work is required by this ticket** — the PDF half of the acceptance criteria is already satisfied.

Excel download generation is an established pattern used by five list types today:

- `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` — the closest reference implementation (reuses the renderer, flattens nested data to rows, uses `exceljs`).
- `libs/list-types/magistrates-public-list/src/excel/excel-generator.ts`
- `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts` / `sjp-public-list-excel-generator.ts`

Shared helpers live in `libs/list-types/common/src/excel/excel-utilities.ts`:
- `sanitiseCellValue(value)` — prefixes `=`, `+`, `-`, `@` with `'` to prevent CSV/formula injection.
- `autoFitColumns(worksheet)` — measures the longest line per column, clamped to 10–60 characters.
- `saveExcelToStorage(artefactId, buffer)` — uploads `{artefactId}.xlsx` to the `PUBLICATIONS` blob container with the correct content type.

Generation is dispatched from `EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:363-386`), keyed by the stable `listTypeName` string. `processPublication` calls `generatePublicationExcel` immediately after `generatePublicationPdf`, then passes `result.excelPath` into `sendPublicationNotificationsForArtefact`.

### Email notifications are already generic

`buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:465-497`) unconditionally attempts `downloadBlob(`${artefactId}.xlsx`)`. When both a PDF and an Excel file exist and both are under 2MB, `getSubscriptionTemplateId` selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` and `govnotify-client.ts` sets `excel_link_to_file` / `excel_link_text` personalisation.

**Consequence:** acceptance criterion 2 ("links to download both file types are displayed in the email notifications") requires **no new notification code** — it is satisfied the moment the `.xlsx` blob exists for a Crown artefact. It does need explicit test coverage and a confirmation that the PDF+Excel Notify template is configured in every environment.

### Naming discrepancy — "Crown Advance List"

The issue names a "Crown Advance List". No such list type exists in `libs/list-types/common/src/list-type-data.ts`; the only Crown entries are `CROWN_WARNED_LIST`, `CROWN_DAILY_LIST`, `CROWN_FIRM_LIST`. The field set the issue specifies for the "Advance List" (Hearing, Fixed For, Case Reference, Defendant Name(s), Prosecuting Authority, Linked Cases, Listing Notes) is an exact match for the Crown Warned List's rendered row shape (`CrownWarnedCaseRow` plus the hearing-category grouping key). **This spec treats "Crown Advance List" as `CROWN_WARNED_LIST`.** See §14.

### Dependency

The issue states it depends on **#957**. This spec assumes #957 lands the upstream PDDA data/field work for the Crown lists. If #957 changes the shape of `CrownDailyListData`, `CrownFirmListData` or `CrownWarnedListData`, or changes the rendered row objects, the column mappings in §6 must be re-checked against the updated renderers before implementation.

### Related docs

- `.claude/rules/design.md` — GOV.UK Design System patterns (Table, Button, Checkboxes, Error summary).
- `CLAUDE.md` § *List Type Implementation* — never key on numeric `listTypeId`; register by `listTypeName`.

---

## 3. Acceptance Criteria

* **Scenario:** Excel file is generated when a Crown Daily List is published
    * **Given** an admin publishes a JSON artefact with `listTypeName` `CROWN_DAILY_LIST`
    * **When** `processPublication` runs
    * **Then** an `.xlsx` blob named `{artefactId}.xlsx` exists in the `PUBLICATIONS` container, containing one worksheet with a bold header row and one data row per case

* **Scenario:** Excel file is generated when a Crown Firm List is published
    * **Given** an admin publishes a JSON artefact with `listTypeName` `CROWN_FIRM_LIST`
    * **When** `processPublication` runs
    * **Then** an `.xlsx` blob exists with one data row per case, and every row repeats its sitting date, court house, court room, judge and sitting time

* **Scenario:** Excel file is generated when a Crown Warned List is published
    * **Given** an admin publishes a JSON artefact with `listTypeName` `CROWN_WARNED_LIST`
    * **When** `processPublication` runs
    * **Then** an `.xlsx` blob exists with one data row per case, and every row repeats its hearing category, with cases that have no fixed date carrying the "To be allocated" category label

* **Scenario:** Excel columns match the PDF fields exactly
    * **Given** a published Crown list artefact with both a PDF and an Excel file
    * **When** a user compares the two files
    * **Then** every data field shown in the PDF (whether as a table column or as a grouping heading) appears as a column in the Excel file, with the same header text and the same formatted values, and no extra fields appear in either

* **Scenario:** Verified user downloads the Excel version from the list page
    * **Given** a signed-in verified user viewing a Crown Daily List, Crown Firm List or Crown Warned List whose artefact has a generated `.pdf` and `.xlsx`
    * **When** they select "Download a copy", tick the terms-and-conditions checkbox and continue
    * **Then** the download page lists both "Download this PDF (…)" and "Download this Microsoft Excel spreadsheet (…)" with file sizes, and selecting either returns the file as an attachment

* **Scenario:** Unverified user cannot see or reach the download journey
    * **Given** a user who is not signed in, or is signed in without the `VERIFIED` role
    * **When** they view a Crown list page
    * **Then** no "Download a copy" button is rendered, and a direct request to `/crown-daily-cause-list/list-download-disclaimer?artefactId=…` redirects to `/sign-in`

* **Scenario:** Download journey is hidden when no files exist
    * **Given** a verified user viewing a Crown list artefact for which neither a `.pdf` nor an `.xlsx` blob exists
    * **When** the page renders
    * **Then** no "Download a copy" button is shown, and a direct request to the download files page returns 404

* **Scenario:** Subscription email contains links to both file types
    * **Given** a subscriber to a location that publishes a `CROWN_DAILY_LIST`, and both generated files are under 2MB
    * **When** publication notifications are sent
    * **Then** GOV.UK Notify is called with the PDF+Excel template ID, and personalisation containing both `pdf_link_to_file` and `excel_link_to_file`

* **Scenario:** Excel generation failure does not block publication
    * **Given** Excel generation throws for a Crown artefact (for example a malformed sitting record)
    * **When** `processPublication` runs
    * **Then** the error is logged, the publication still completes, the PDF is still stored, and the notification email falls back to the PDF-only Notify template

* **Scenario:** Welsh Excel file uses Welsh column headers
    * **Given** a Crown list artefact published with `locale` `cy`
    * **When** the Excel file is generated
    * **Then** the worksheet name and every column header use the Welsh strings from the list type's `cy.ts`

* **Scenario:** Cell values that could be read as formulas are neutralised
    * **Given** a case whose defendant name or listing note begins with `=`, `+`, `-` or `@`
    * **When** the Excel file is generated
    * **Then** the cell value is prefixed with an apostrophe so the spreadsheet application treats it as text

---

## 4. User Journey Flow

### 4.1 Publication (system journey, no UI)

```
Admin uploads Crown JSON (manual upload or API)
        │
        ▼
processPublication(artefactId, listTypeId, contentDate, locale, jsonData, …)
        │
        ├──► extractAndStoreArtefactSearch()
        │
        ├──► generatePublicationPdf()
        │       └─ PDF_GENERATOR_REGISTRY[listTypeName]  ── already wired ──►  {artefactId}.pdf
        │            returns { pdfPath, sizeBytes, listTypeName }
        │
        ├──► generatePublicationExcel({ listTypeName: pdfResult.listTypeName, … })
        │       └─ EXCEL_GENERATOR_REGISTRY[listTypeName]  ── NEW ──►  {artefactId}.xlsx
        │            │
        │            ├─ CROWN_DAILY_LIST  → generateCrownDailyListExcel()
        │            ├─ CROWN_FIRM_LIST   → generateCrownFirmListExcel()
        │            └─ CROWN_WARNED_LIST → generateCrownWarnedListExcel()
        │                   │
        │                   ├─ render<List>Data(jsonData, { locale, locationId, contentDate })
        │                   ├─ flatten nested tree → one row per case
        │                   ├─ sanitiseCellValue() every cell
        │                   ├─ autoFitColumns()
        │                   └─ saveExcelToStorage(artefactId, buffer)
        │
        └──► sendPublicationNotificationsForArtefact({ pdfFilePath, excelPath, … })
                └─ buildEmailDataWithFiles()
                     ├─ downloadBlob({artefactId}.pdf)   → hasPdf,   pdfUnder2MB
                     ├─ downloadBlob({artefactId}.xlsx)  → hasExcel, excelUnder2MB
                     └─ getSubscriptionTemplateId({ isSjp:false, hasPdf, hasExcel, filesUnder2MB })
                            ├─ hasPdf && hasExcel → GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL
                            ├─ hasPdf only        → GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF
                            └─ neither / >2MB     → GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS
```

Failure behaviour: `generatePublicationExcel` swallows generator errors (logs `Excel generation failed` / `Excel generation error`) and returns `{}`, so `result.excelPath` stays `undefined` and the journey continues on the PDF-only path.

### 4.2 On-page download (verified user journey)

```
     ┌──────────────────────────────────────────────────┐
     │  /crown-daily-cause-list?artefactId=<uuid>       │
     │  (or /crown-firm-list, /crown-warned-list)       │
     │                                                  │
     │  [ Download a copy ]   ◄── shown only when       │
     │                            role === VERIFIED     │
     │                            AND (.pdf OR .xlsx)   │
     └───────────────────────┬──────────────────────────┘
                             │ click
                             ▼
     ┌──────────────────────────────────────────────────┐
     │  …/list-download-disclaimer?artefactId=<uuid>    │
     │  Terms and conditions                            │
     │  [ ] I agree …            [ Continue ]           │
     └───────────┬──────────────────────┬───────────────┘
                 │ not ticked           │ ticked (POST)
                 ▼                      ▼
     re-render with error       …/list-download-files?artefactId=<uuid>
     summary "You must         ┌──────────────────────────────────────┐
     agree to the terms…"      │  Download your file                  │
                               │  • Download this PDF (412.3KB) …     │
                               │  • Download this Microsoft Excel     │
                               │    spreadsheet (38.4KB) …            │
                               └───────────────┬──────────────────────┘
                                               │ click a link
                                               ▼
                               …/download?artefactId=<uuid>&type=pdf|xlsx
                               Content-Disposition: attachment
```

Guard on every step of the download journey: `requireVerifiedWithProvenance` — the user must have role `VERIFIED` and a `provenance`, the artefact must exist, and the user's provenance must appear in the list type's `allowedProvenance`. Any failure stores `req.session.returnTo` and redirects to `/sign-in`.

---

## 5. Low Fidelity Wireframe

### 5.1 Crown list page — download entry point

```
┌────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings                          Cymraeg       │
├────────────────────────────────────────────────────────────────────────────┤
│  BETA  This is a new service – your feedback will help us improve it.      │
├────────────────────────────────────────────────────────────────────────────┤
│ ← Back                                                                     │
│                                                                            │
│ Crown Daily List for Manchester Crown Court (Crown Square)                 │
│                                                                            │
│ Find contact details and other information about courts and tribunals in   │
│ England and Wales, and some non-devolved tribunals in Scotland.            │
│                                                                            │
│ List for 20 August 2026                                                    │
│ Last updated 20 August 2026 at 9:01am                                      │
│                                                                            │
│  ┌──────────────────────┐                                                  │
│  │  Download a copy     │   ◄── govukButton, VERIFIED users only           │
│  └──────────────────────┘                                                  │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Restrictions on publishing or writing about these cases                │ │
│ │ …                                                                      │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ COURT 1: District Judge A Smith                                            │
│ Sitting at 10:00am                                                         │
│ ┌───────────┬───────────┬─────────────┬────────────┬──────────────┬──────┐ │
│ │ Hearing   │ Case      │ Defendant   │ Hearing    │ Prosecuting  │ List │ │
│ │ Time      │ Reference │ Name(s)     │ Type       │ Authority    │ Note │ │
│ ├───────────┼───────────┼─────────────┼────────────┼──────────────┼──────┤ │
│ │ 10:30am   │ T2026123  │ SMITH John  │ Trial      │ CPS          │ …    │ │
│ └───────────┴───────────┴─────────────┴────────────┴──────────────┴──────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Terms and conditions page (`list-download-disclaimer`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Back                                                                     │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ There is a problem                              ◄── only on error      │ │
│ │  • You must agree to the terms and conditions   ──► links to #agreed   │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ Terms and conditions                                          (h1)         │
│                                                                            │
│ As a verified user of the court and tribunal hearings service you are      │
│ authorised to download this file containing personal protected data.      │
│                                                                            │
│ It is your responsibility to ensure you comply with any GDPR and/or        │
│ reporting restrictions regarding the content of this file.                 │
│                                                                            │
│  [ ] Please tick this box to agree to the above terms and conditions      │
│                                                                            │
│  ┌──────────────┐                                                          │
│  │  Continue    │                                                          │
│  └──────────────┘                                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Download your file page (`list-download-files`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Back                                                                     │
│                                                                            │
│ Download your file                                            (h1)         │
│                                                                            │
│ Save your file somewhere you can find it. You may need to print it or      │
│ show it to someone later.                                                  │
│                                                                            │
│ Download this PDF (412.3KB) to your device                                 │
│                                                                            │
│ Download this Microsoft Excel spreadsheet (38.4KB) to your device          │
│                                                                            │
│ If you have any questions, call 0300 303 0656.                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Excel layout — Crown Daily List (`CROWN_DAILY_LIST`)

Worksheet name: `Crown Daily List` (Welsh: `Rhestr Ddyddiol y Goron`). Single sheet, row 1 bold.

```
    A            B          C         D          E        F         G         H       I            J
 1 ┌───────────┬──────────┬─────────┬──────────┬────────┬─────────┬─────────┬───────┬────────────┬─────────┐
   │Court House│Court Room│ Judge   │Sitting at│Hearing │Case     │Defendant│Hearing│Prosecuting │Listing  │  ← bold
   │           │          │         │          │Time    │Reference│Name(s)  │Type   │Authority   │Notes    │
 2 ├───────────┼──────────┼─────────┼──────────┼────────┼─────────┼─────────┼───────┼────────────┼─────────┤
   │Crown Sq   │1         │DJ Smith │10:00am   │10:30am │T2026123 │SMITH J  │Trial  │CPS         │Interp.  │
 3 │Crown Sq   │1         │DJ Smith │10:00am   │11:15am │T2026124 │JONES A, │PTPH   │CPS         │         │
   │           │          │         │          │        │         │BROWN B  │       │            │         │
 4 │Crown Sq   │2         │HHJ Patel│2:00pm    │        │T2026125 │DOE J    │Sent.  │RSPCA       │         │
   └───────────┴──────────┴─────────┴──────────┴────────┴─────────┴─────────┴───────┴────────────┴─────────┘
```

### 5.5 Excel layout — Crown Firm List (`CROWN_FIRM_LIST`)

Worksheet name: `Crown Firm List` (Welsh: `Rhestr Gadarn y Goron`).

```
    A         B          C         D       E        F      G      H        I       J        K       L
 1 ┌────────┬──────────┬────────┬───────┬────────┬──────┬─────┬────────┬──────┬───────┬──────────┬──────┐
   │Date    │Court     │Court   │Judge  │Sitting │Hear- │Case │Defend- │Hear- │Repre- │Prosecut- │List- │  ← bold
   │        │House     │Room    │       │at      │ing   │Num- │ant     │ing   │senta- │ing       │ing   │
   │        │          │        │       │        │Time  │ber  │Name(s) │Type  │tive   │Authority │Notes │
 2 ├────────┼──────────┼────────┼───────┼────────┼──────┼─────┼────────┼──────┼───────┼──────────┼──────┤
   │Monday  │Crown Sq  │1       │DJ     │10:00am │10:30 │T202 │SMITH J │Trial │Acme   │CPS       │      │
   │24 Aug… │          │        │Smith  │        │am    │6123 │        │      │Solic. │          │      │
 3 │Tuesday │Crown Sq  │3       │HHJ    │10:00am │      │T202 │JONES A │PTPH  │       │CPS       │Video │
   │25 Aug… │          │        │Patel  │        │      │6124 │        │      │       │          │link  │
   └────────┴──────────┴────────┴───────┴────────┴──────┴─────┴────────┴──────┴───────┴──────────┴──────┘
```

### 5.6 Excel layout — Crown Warned List (`CROWN_WARNED_LIST`, the issue's "Crown Advance List")

Worksheet name: `Crown Warned List` (Welsh: `Rhestr Rybuddiol y Goron`).

```
    A                B          C          D          E             F        G
 1 ┌───────────────┬──────────┬──────────┬──────────┬─────────────┬────────┬─────────┐
   │Hearing        │Fixed For │Case      │Defendant │Prosecuting  │Linked  │Listing  │  ← bold
   │               │          │Reference │Name(s)   │Authority    │Cases   │Notes    │
 2 ├───────────────┼──────────┼──────────┼──────────┼─────────────┼────────┼─────────┤
   │Trial          │24/08/2026│T2026123  │*SMITH J  │CPS          │T202611 │         │
 3 │Trial          │26/08/2026│T2026124  │JONES A   │CPS          │        │Interp.  │
 4 │To be allocated│          │T2026130  │*DOE J    │RSPCA        │T202612,│         │
   │               │          │          │          │             │T202613 │         │
   └───────────────┴──────────┴──────────┴──────────┴─────────────┴────────┴─────────┘
```

`*` prefixes a defendant name when any defendant on the case is in custody (`isInCustody`), matching the PDF and on-screen behaviour.

---

## 6. Page Specifications

### 6.1 Files to add and change

**New files**

| Path | Purpose |
|---|---|
| `libs/list-types/crown-daily-list/src/excel/excel-generator.ts` | `generateCrownDailyListExcel` |
| `libs/list-types/crown-daily-list/src/excel/excel-generator.test.ts` | Unit tests |
| `libs/list-types/crown-firm-list/src/excel/excel-generator.ts` | `generateCrownFirmListExcel` |
| `libs/list-types/crown-firm-list/src/excel/excel-generator.test.ts` | Unit tests |
| `libs/list-types/crown-warned-list/src/excel/excel-generator.ts` | `generateCrownWarnedListExcel` |
| `libs/list-types/crown-warned-list/src/excel/excel-generator.test.ts` | Unit tests |
| `apps/web/src/pages/(list-types)/list-download-shared.ts` | Renamed/promoted from `sjp-download-shared.ts` (see 6.5) |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/require-verified-with-provenance.ts` | Guard (shared helper re-export, see 6.5) |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/list-download-disclaimer.ts` + `.njk` | Terms page |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/list-download-files.ts` + `.njk` | File list page |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/download.ts` | Blob download route |
| …identical trio under `crown-firm-list/` and `crown-warned-list/` | Terms / files / download |
| Co-located `*.test.ts` and `*.njk.test.ts` for each new page | Tests |

**Changed files**

| Path | Change |
|---|---|
| `libs/list-types/crown-daily-list/src/locales/en.ts` / `cy.ts` | Add `excelColumns`, `downloadCopy`, `disclaimer`, `downloadFiles` blocks |
| `libs/list-types/crown-firm-list/src/locales/en.ts` / `cy.ts` | Same |
| `libs/list-types/crown-warned-list/src/locales/en.ts` / `cy.ts` | Same |
| `libs/list-types/crown-*/src/index.ts` (×3) | Export `generateCrown*Excel` |
| `libs/list-types/crown-*/package.json` (×3) | Add `exceljs: 4.4.0` and `@hmcts/azure-blob: workspace:*` dependencies |
| `libs/publication/src/processing/service.ts` | Add three entries to `EXCEL_GENERATOR_REGISTRY` + imports |
| `libs/publication/package.json` | Already depends on the three crown libs for PDF — no change expected; verify |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/index.ts` | Compute and pass `downloadDisclaimerUrl` |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk` | Render the "Download a copy" button |
| …same two changes for `crown-firm-list` and `crown-warned-list` | |
| `apps/web/src/pages/(list-types)/sjp-press-list/*.ts`, `sjp-public-list/*.ts` | Update imports to `list-download-shared.js` |
| `e2e-tests/tests/…` | One journey spec per Crown list type (or extend existing Crown specs) |

### 6.2 Excel generator contract

All three generators follow `magistrates-standard-list/src/excel/excel-generator.ts` exactly:

```typescript
interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: CrownDailyListData;   // per list type
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}
```

Body, in order:

1. `const t = locale === "cy" ? cyLocale : enLocale;` then `const cols = t.excelColumns;`
2. Call the existing renderer — **do not re-implement any formatting**. The renderer already applies `formatPddaSittingTime`, `formatPddaDefendantName`, `formatShortDate`, judiciary joining and locale-aware date formatting, which is what guarantees Excel/PDF uniformity.
3. `const workbook = new ExcelJS.Workbook(); const worksheet = workbook.addWorksheet(t.title);`
4. `const headerRow = worksheet.addRow([...]); headerRow.font = { bold: true };`
5. Nested loops flattening to one row per case; every cell wrapped in `sanitiseCellValue(value ?? "")`.
6. `autoFitColumns(worksheet)`
7. `const buffer = await workbook.xlsx.writeBuffer(); const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));`
8. `return { success: true, excelPath }` / `catch` → `{ success: false, error: "Failed to generate Crown Daily List Excel: …" }`

Guard: `sanitiseCellValue` indexes `value[0]`, so it throws on `undefined`. Coalesce with `?? ""` at every call site — several rendered fields (`timeMarkingNote`, `listingNotes`, `representative`, `linkedCases`) are legitimately empty strings, and `formattedJudiciaries` can be empty.

### 6.3 Column mappings

Every column value comes from the already-rendered object graph. Row cardinality is **one row per rendered case**; ancestor values are repeated on each row.

**`CROWN_DAILY_LIST`** — loop `listData.courtLists[] → courtHouse.courtRoom[] → session[] → sittings[] → hearing[] → case[]`

| # | Column header (`cols.*`) | Source expression |
|---|---|---|
| A | `courtHouse` | `courtList.courtHouse.courtHouseName` |
| B | `courtRoom` | `courtRoom.courtRoomName` |
| C | `judge` | `session.formattedJudiciaries` |
| D | `sittingAt` | `sitting.time` |
| E | `hearingTime` | `case.timeMarkingNote` |
| F | `caseRef` | `case.caseNumber` |
| G | `defendant` | `case.defendants` |
| H | `hearingType` | `hearing.displayHearingType` |
| I | `prosecutingAuthority` | `case.prosecutingAuthority` |
| J | `listingNotes` | `case.listingNotes` |

The PDF shows A–D as section headings and E–J as table columns; the Excel promotes all ten to columns. `session.hasListingNotes` controls whether the *PDF* renders the Listing Notes column — the Excel **always** emits column J so the shape is stable across artefacts.

**`CROWN_FIRM_LIST`** — loop `groupedListData[] → sittings[] → hearing[] → case[]`

| # | Column header (`cols.*`) | Source expression |
|---|---|---|
| A | `date` | `dayGroup.day` (e.g. "Monday 24 August 2026") |
| B | `courtHouse` | `dayGroup.courtHouseInfo.name` |
| C | `courtRoom` | `sitting.courtRoomName` |
| D | `judge` | `sitting.formattedJudiciaries` |
| E | `sittingAt` | `sitting.time` |
| F | `hearingTime` | `case.timeMarkingNote` |
| G | `caseNumber` | `case.caseNumber` |
| H | `defendant` | `case.defendants` |
| I | `hearingType` | `hearing.displayHearingType` |
| J | `representative` | `case.representative` |
| K | `prosecutingAuthority` | `case.prosecutingAuthority` |
| L | `listingNotes` | `case.listingNotes` |

Note `renderCrownFirmListData` returns `{ header, openJustice, listData: null, groupedListData }` — use `groupedListData`, not `listData`.

**`CROWN_WARNED_LIST`** — loop `groupedCategories[] → cases[]`

| # | Column header (`cols.*`) | Source expression |
|---|---|---|
| A | `hearing` | `group.category === TO_BE_ALLOCATED_KEY ? t.toBeAllocated : group.category` |
| B | `fixedFor` | `row.fixedFor` |
| C | `caseRef` | `row.caseNumber` |
| D | `defendant` | `` `${row.isInCustody ? "*" : ""}${row.defendants}` `` |
| E | `prosecutingAuthority` | `row.prosecutingAuthority` |
| F | `linkedCases` | `row.linkedCases` |
| G | `listingNotes` | `row.listingNotes` |

`TO_BE_ALLOCATED_KEY` is already exported from `libs/list-types/crown-warned-list/src/rendering/renderer.ts`. Import it rather than re-declaring the string.

### 6.4 Registry wiring

In `libs/publication/src/processing/service.ts`, add to the existing imports and to `EXCEL_GENERATOR_REGISTRY` (keyed by stable `listTypeName`, never a numeric id):

```typescript
const EXCEL_GENERATOR_REGISTRY: Partial<Record<string, ExcelGenerator>> = {
  CROWN_DAILY_LIST: (p) => generateCrownDailyListExcel({ ...p, jsonData: p.jsonData as CrownDailyListData }),
  CROWN_FIRM_LIST: (p) => generateCrownFirmListExcel({ ...p, jsonData: p.jsonData as CrownFirmListData }),
  CROWN_WARNED_LIST: (p) => generateCrownWarnedListExcel({ ...p, jsonData: p.jsonData as CrownWarnedListData }),
  MAGISTRATES_PUBLIC_LIST: …,
  // …existing entries unchanged
};
```

No change to `listTypeHasExcel`, `generatePublicationExcel` or `processPublication` — registration alone activates generation for these list types.

**Pre-existing coupling to flag during implementation:** `processPublication` passes `listTypeName: pdfResult.listTypeName ?? ""` into `generatePublicationExcel`. If PDF generation throws before resolving the list type name, `listTypeName` is `""`, no Excel generator is found, and Excel is silently skipped. This is existing behaviour affecting all Excel list types; it is out of scope to fix here but should be noted in the PR so it is not mistaken for a Crown-specific bug.

### 6.5 Promoting the SJP download journey to shared code

`apps/web/src/pages/(list-types)/sjp-download-shared.ts` is already list-type-agnostic: `handleBlobDownload`, `getAvailableFiles`, `formatFileSize` and `createListDownloadFilesHandler(en, cy, downloadFilesKey)` contain no SJP-specific logic. Rename the file to `list-download-shared.ts` and update the four SJP importers. Do not fork or copy it.

The per-list-type verified-user guard is currently duplicated in each SJP directory (`sjp-press-list/require-verified-with-provenance.ts`, `sjp-public-list/…`). Add a single factory in `list-download-shared.ts`:

```typescript
export function createRequireVerifiedDownload(en: object, cy: object): RequestHandler
```

…implementing the existing logic (role `VERIFIED`, `provenance` present, artefact exists, provenance in `listType.allowedProvenance`, otherwise store `returnTo` and redirect to `/sign-in`), and have the three Crown download trios use it. Refactoring the SJP guards onto the factory is desirable but optional; if it is skipped, say so in the PR.

Each Crown list type gets three thin page modules, following `sjp-press-list/list-download-*.ts` verbatim apart from the locale import:

```typescript
// apps/web/src/pages/(list-types)/crown-daily-cause-list/list-download-files.ts
import { crownDailyListCy as cy, crownDailyListEn as en } from "@hmcts/crown-daily-list";
import type { RequestHandler } from "express";
import { createListDownloadFilesHandler, createRequireVerifiedDownload } from "../list-download-shared.js";

const requireVerifiedDownload = createRequireVerifiedDownload(en, cy);
const getHandler = createListDownloadFilesHandler(en, cy, "downloadFiles");

export const GET: RequestHandler[] = [requireVerifiedDownload, getHandler];
```

```typescript
// apps/web/src/pages/(list-types)/crown-daily-cause-list/download.ts
export const GET: RequestHandler[] = [requireVerifiedDownload, handleBlobDownload];
```

The `.njk` templates for `list-download-disclaimer` and `list-download-files` are byte-identical to the SJP versions (they read only from `t`). Copy them per directory — the page auto-discovery mechanism resolves templates by directory, so a shared template would need to move into `libs/web-core/src/views`; copying matches the existing precedent and keeps this change small.

### 6.6 Crown list page changes

In each of the three Crown controllers (`crown-daily-cause-list/index.ts`, `crown-firm-list/index.ts`, `crown-warned-list/index.ts`), inside the `render` callback:

```typescript
const isVerifiedUser = req.user?.role === "VERIFIED";
const [pdfProps, excelProps] = await Promise.all([
  getBlobProperties(`${artefact.artefactId}.pdf`),
  getBlobProperties(`${artefact.artefactId}.xlsx`)
]);
const downloadDisclaimerUrl =
  isVerifiedUser && (pdfProps || excelProps)
    ? `${req.path}/list-download-disclaimer?artefactId=${artefact.artefactId}`
    : null;
```

`createListTypeHandler` / `createSimpleListTypeHandler` currently pass only `{ artefact, jsonData, locale, res }` to the render callback. Extend `RenderCallback` to include `req` so the controllers can read `req.user` and `req.path`. This is a one-line type change plus threading `req` through both handler factories; all existing callbacks ignore the extra property and are unaffected.

Template addition, immediately after the header block and before the reporting-restrictions info box, mirroring `sjp-press-list.njk:45-48`:

```njk
{% if downloadDisclaimerUrl %}
  <a href="{{ downloadDisclaimerUrl }}" role="button" draggable="false" class="govuk-button" data-module="govuk-button">
    {{ t.downloadCopy }}
  </a>
{% endif %}
```

### 6.7 Non-functional notes

- **Worksheet naming:** ExcelJS rejects sheet names over 31 characters and the characters `* ? : \ / [ ]`. All six English/Welsh titles are within limits (longest: `Rhestr Rybuddiol y Goron`, 24 chars). No sanitisation needed, but the tests should assert the sheet name so a future title change that breaks the limit is caught.
- **Column widths:** `autoFitColumns` clamps to 10–60 characters. Long listing notes and multi-defendant cells will be truncated visually (not in data) — acceptable and consistent with the magistrates lists.
- **Size:** a large Crown Firm List (a week of sittings) is expected in the tens of KB, well under the 2MB Notify attachment threshold. No streaming or pagination required.
- **Blob lifecycle:** `libs/publication/src/repository/queries.ts:189` already deletes `{artefactId}.xlsx` on artefact deletion. No change needed.

---

## 7. Content

All new strings are added to the existing locale files in each Crown lib (`src/locales/en.ts` and `src/locales/cy.ts`). Column headers **reuse the exact strings already used by the PDF and on-screen tables** wherever they exist (`sittingAt`, `hearingTime`, `caseRef`, `caseNumber`, `defendant`, `hearingType`, `prosecutingAuthority`, `listingNotes`, `representative`, `fixedFor`, `linkedCases`, `toBeAllocated`). Referencing the existing keys inside `excelColumns` — rather than re-typing the text — is what mechanically guarantees the "uniform fields" acceptance criterion; a future copy change to the PDF header propagates to the Excel automatically.

`courtHouse`, `courtRoom`, `judge` and `date` are new keys, because in the PDF they appear as section headings rather than column headers.

### 7.1 `libs/list-types/crown-daily-list/src/locales/en.ts`

```typescript
export const en = {
  // …existing keys unchanged…
  downloadCopy: "Download a copy",
  excelColumns: {
    courtHouse: "Court House",
    courtRoom: "Court Room",
    judge: "Judge",
    sittingAt: "Sitting at",
    hearingTime: "Hearing Time",
    caseRef: "Case Reference",
    defendant: "Defendant Name(s)",
    hearingType: "Hearing Type",
    prosecutingAuthority: "Prosecuting Authority",
    listingNotes: "Listing Notes"
  },
  disclaimer: {
    pageTitle: "Terms and conditions",
    disclaimerText:
      "As a verified user of the court and tribunal hearings service you are authorised to download this file containing personal protected data.",
    responsibility:
      "It is your responsibility to ensure you comply with any GDPR and/or reporting restrictions regarding the content of this file.",
    checkboxLabel: "Please tick this box to agree to the above terms and conditions",
    continueButton: "Continue",
    errorTitle: "There is a problem",
    errorCheckbox: "You must agree to the terms and conditions"
  },
  downloadFiles: {
    pageTitle: "Download your file",
    saveInstructions: "Save your file somewhere you can find it. You may need to print it or show it to someone later.",
    downloadPdfLink: "Download this PDF",
    downloadExcelLink: "Download this Microsoft Excel spreadsheet",
    toDevice: "to your device",
    contactInfo: "If you have any questions, call 0300 303 0656."
  }
};
```

### 7.2 `libs/list-types/crown-daily-list/src/locales/cy.ts`

```typescript
export const cy = {
  // …existing keys unchanged…
  downloadCopy: "Lawrlwytho copi",
  excelColumns: {
    courtHouse: [WELSH TRANSLATION REQUIRED: "Court House"],
    courtRoom: [WELSH TRANSLATION REQUIRED: "Court Room"],
    judge: [WELSH TRANSLATION REQUIRED: "Judge"],
    sittingAt: Yn eistedd yn,
    hearingTime: Amser y Gwrandawiad,
    caseRef: Cyfeirnod yr Achos,
    defendant: Enw(au)'r Diffynydd(ion),
    hearingType: Math o wrandawiad,
    prosecutingAuthority: Yr Awdurdod sy'n Erlyn,
    listingNotes: [WELSH TRANSLATION REQUIRED: "Listing Notes"]
  },
  disclaimer: {
    pageTitle: Telerau ac amodau,
    disclaimerText: [WELSH TRANSLATION REQUIRED: "As a verified user of the court and tribunal hearings service you are authorised to download this file containing personal protected data."],
    responsibility: Eich cyfrifoldeb chi yw sicrhau eich bod yn cydymffurfio ag unrhyw gyfyngiadau GDPR a/neu gyfyngiadau riportio gyda golwg ar gynnwys y ffeil hon.,
    checkboxLabel: [WELSH TRANSLATION REQUIRED: "Please tick this box to agree to the above terms and conditions"],
    continueButton: Parhau,
    errorTitle: Mae problem,
    errorCheckbox: Rhaid ichi gytuno 'r telerau a'r amodau
  },
  downloadFiles: {
    pageTitle: Llwytho eich ffeil i lawr,
    saveInstructions: Arbedwch eich ffeil yn rhywle y gellir cael hyd iddi. Efallai y bydd arnoch angen ei hargraffu neu ei dangos i rywun yn nes ymlaen.,
    downloadPdfLink: [WELSH TRANSLATION REQUIRED: "Download this PDF"],
    downloadExcelLink: [WELSH TRANSLATION REQUIRED: "Download this Microsoft Excel spreadsheet"],
    toDevice: [WELSH TRANSLATION REQUIRED: "to your device"],
    contactInfo: Os oes gennych gwestiwn, ffoniwch 0300 303 0656.
  }
};
```

Note: the SJP libs already hold approved Welsh for `downloadCopy` (`"Lawrlwytho copi"`), the disclaimer block and the downloadFiles block — reuse those exact strings rather than commissioning new translations where the English is identical.

### 7.3 `libs/list-types/crown-firm-list/src/locales/*.ts`

`excelColumns` adds a `date` key and reuses the existing `caseNumber` / `representative` keys:

```typescript
// en.ts
excelColumns: {
  date: "Date",
  courtHouse: "Court House",
  courtRoom: "Court Room",
  judge: "Judge",
  sittingAt: "Sitting at",
  hearingTime: "Hearing Time",
  caseNumber: "Case Number",
  defendant: "Defendant Name(s)",
  hearingType: "Hearing Type",
  representative: "Representative",
  prosecutingAuthority: "Prosecuting Authority",
  listingNotes: "Listing Notes"
}
```

```typescript
// cy.ts
excelColumns: {
  date: Dyddiad,
  courtHouse: [WELSH TRANSLATION REQUIRED: "Court House"],
  courtRoom: [WELSH TRANSLATION REQUIRED: "Court Room"],
  judge: [WELSH TRANSLATION REQUIRED: "Judge"],
  sittingAt: Yn eistedd yn,
  hearingTime: Amser y Gwrandawiad,
  caseNumber: Rhif yr Achos,
  defendant: Enw(au)'r Diffynydd(ion),
  hearingType: Math o wrandawiad,
  representative: [WELSH TRANSLATION REQUIRED: "Representative"],
  prosecutingAuthority: Yr Awdurdod sy'n Erlyn,
  listingNotes: [WELSH TRANSLATION REQUIRED: "Listing Notes"]
}
```

Plus the same `downloadCopy`, `disclaimer` and `downloadFiles` blocks as 7.1/7.2.

### 7.4 `libs/list-types/crown-warned-list/src/locales/*.ts`

```typescript
// en.ts
excelColumns: {
  hearing: "Hearing",
  fixedFor: "Fixed For",
  caseRef: "Case Reference",
  defendant: "Defendant Name(s)",
  prosecutingAuthority: "Prosecuting Authority",
  linkedCases: "Linked Cases",
  listingNotes: "Listing Notes"
}
```

```typescript
// cy.ts
excelColumns: {
  hearing: [WELSH TRANSLATION REQUIRED: "Hearing"],
  fixedFor: Pennu ar gyfer,
  caseRef: Cyfeirnod yr Achos,
  defendant: Enw(au)'r Diffynydd(ion),
  prosecutingAuthority: Yr Awdurdod sy'n Erlyn,
  linkedCases: Achosion cysylltiedig,
  listingNotes: [WELSH TRANSLATION REQUIRED: "Listing Notes"]
}
```

`hearing` is a new key; `fixedFor`, `caseRef`, `defendant`, `prosecutingAuthority`, `linkedCases`, `listingNotes` and `toBeAllocated` already exist in both locale files. Plus the same `downloadCopy`, `disclaimer` and `downloadFiles` blocks.

### 7.5 Email content

No new content. The GOV.UK Notify template referenced by `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` already renders both links using `pdf_link_to_file` / `pdf_link_text` and `excel_link_to_file` / `excel_link_text`. `excel_link_text` is hardcoded to `"Download Excel version"` in `libs/notifications/src/govnotify/govnotify-client.ts:89` — English only, matching current behaviour for the SJP and magistrates lists. Welsh email content is a pre-existing gap in the notification layer and is out of scope here (see §14).

### 7.6 Locale key parity

Every locale change must keep `Object.keys(en)` and `Object.keys(cy)` identical, including inside the nested `excelColumns`, `disclaimer` and `downloadFiles` objects. Assert this in the template/locale tests:

```typescript
expect(Object.keys(en.excelColumns).sort()).toEqual(Object.keys(cy.excelColumns).sort());
```

---

## 8. URL

Routes are auto-discovered from directory structure under `apps/web/src/pages/`. `(list-types)` is a route group, so it contributes no URL segment.

### Existing (unchanged)

| Method | URL | Page module |
|---|---|---|
| GET | `/crown-daily-cause-list?artefactId=<uuid>` | `(list-types)/crown-daily-cause-list/index.ts` |
| GET | `/crown-firm-list?artefactId=<uuid>` | `(list-types)/crown-firm-list/index.ts` |
| GET | `/crown-warned-list?artefactId=<uuid>` | `(list-types)/crown-warned-list/index.ts` |

### New

| Method | URL | Page module |
|---|---|---|
| GET | `/crown-daily-cause-list/list-download-disclaimer?artefactId=<uuid>` | `crown-daily-cause-list/list-download-disclaimer.ts` |
| POST | `/crown-daily-cause-list/list-download-disclaimer` | same (body: `artefactId`, `agreed`) |
| GET | `/crown-daily-cause-list/list-download-files?artefactId=<uuid>` | `crown-daily-cause-list/list-download-files.ts` |
| GET | `/crown-daily-cause-list/download?artefactId=<uuid>&type=pdf\|xlsx` | `crown-daily-cause-list/download.ts` |
| GET/POST | `/crown-firm-list/list-download-disclaimer` | `crown-firm-list/list-download-disclaimer.ts` |
| GET | `/crown-firm-list/list-download-files?artefactId=<uuid>` | `crown-firm-list/list-download-files.ts` |
| GET | `/crown-firm-list/download?artefactId=<uuid>&type=pdf\|xlsx` | `crown-firm-list/download.ts` |
| GET/POST | `/crown-warned-list/list-download-disclaimer` | `crown-warned-list/list-download-disclaimer.ts` |
| GET | `/crown-warned-list/list-download-files?artefactId=<uuid>` | `crown-warned-list/list-download-files.ts` |
| GET | `/crown-warned-list/download?artefactId=<uuid>&type=pdf\|xlsx` | `crown-warned-list/download.ts` |

`createListDownloadFilesHandler` and the disclaimer POST derive the sibling URL prefix from `req.path` (`req.path.replace("/list-download-files", "")`), so the same shared handlers work under all three directories without configuration.

### Blob storage keys (not URLs)

| Key | Container |
|---|---|
| `{artefactId}.pdf` | `PUBLICATIONS` |
| `{artefactId}.xlsx` | `PUBLICATIONS` |

Welsh is served on the same URLs via `?lng=cy`.

---

## 9. Validation

### Excel generation (server-side, no user input)

| Rule | Behaviour |
|---|---|
| JSON must pass the list type's schema validator | Already enforced upstream at publication; `processPublication` is only reached with validated JSON. No new validation. |
| Missing optional string fields | Coalesce to `""` before `sanitiseCellValue` — never emit `undefined`/`null` into a cell. |
| Cell starting with `=`, `+`, `-` or `@` | `sanitiseCellValue` prefixes `'`. Applies to every cell without exception, including case references and dates. |
| Empty list (no court lists / no cases) | Emit a workbook containing only the bold header row. Do not fail, and do not skip upload — a header-only file is a valid answer to "there are no hearings". |
| Generator throws | Caught inside the generator; returns `{ success: false, error }`. `generatePublicationExcel` logs and returns `{}`. Publication proceeds. |

### Download journey (user input)

| Input | Rule | Failure |
|---|---|---|
| `artefactId` query/body param | Required; must match `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | Guard → redirect `/sign-in`; handler → `400` render `errors/400` |
| `type` query param on `/download` | Required; must be exactly `pdf` or `xlsx` | `400 { error: "Invalid request" }` |
| `agreed` checkbox on disclaimer POST | Required (any truthy value) | Re-render the disclaimer with an error summary; do not redirect |
| Artefact exists in `artefact` table | Required | Redirect `/sign-in` |
| `req.user.role === "VERIFIED"` and `req.user.provenance` set | Required | Store `req.session.returnTo`, redirect `/sign-in` |
| User provenance ∈ `listType.allowedProvenance` (comma-separated) | Required | Redirect `/sign-in` |
| Requested blob exists | Required | `404 { error: "File not found" }` |
| At least one of `.pdf` / `.xlsx` exists | Required for the files page | `404` render `errors/404` |

The `type` allow-list is what prevents path traversal into other blobs — the extension is never taken from user input verbatim beyond that set, and the blob key is rebuilt as `${artefactId}${extension}` from the validated UUID.

---

## 10. Error Messages

### User-facing

| Trigger | Location | English | Welsh |
|---|---|---|---|
| Continue pressed without ticking the checkbox | Error summary + inline on `#agreed` | "You must agree to the terms and conditions" (summary title: "There is a problem") | Rhaid ichi gytuno 'r telerau a'r amodau |
| Missing/malformed `artefactId` on a download page | `errors/400` | Existing 400 page content | Existing |
| No files available for the artefact | `errors/404` | Existing 404 page content | Existing |
| Not a verified user / provenance not allowed | Redirect to `/sign-in` (no message) | — | — |
| Artefact JSON unavailable or invalid on the list page | `errors/common` | "Publication not available" / "This publication cannot be viewed at the moment. Please check again later. If the problem persists, contact the court directly for assistance." (existing `errorTitle` / `errorMessage`) | Existing |
| Verified user lacks permission for the publication | `errors/403` | "Access Denied" / "You do not have permission to view this publication." (existing `error403Title` / `error403Message`) | Existing |

`/download` returns JSON (`{ "error": "Invalid request" }`, `{ "error": "File not found" }`) rather than a rendered page — it is a file endpoint reached only from a generated link, and this matches the existing SJP behaviour. Do not change it.

### Log messages (not user-facing)

| Condition | Message |
|---|---|
| Generator returns `{ success: false }` | `[Publication] Excel generation failed: { artefactId, error }` (existing, `console.warn`) |
| Generator throws | `[Publication] Excel generation error: { artefactId, error }` (existing, `console.error`) |
| Generator internal catch | `Failed to generate Crown Daily List Excel: <message>` / `…Crown Firm List…` / `…Crown Warned List…` |

No case data, defendant name or artefact JSON may appear in any log line — only `artefactId` and the error message.

---

## 11. Navigation

| From | Action | To |
|---|---|---|
| Crown list page | "Download a copy" button | `…/list-download-disclaimer?artefactId=<uuid>` |
| Disclaimer page | Back link | Browser history (the Crown list page) |
| Disclaimer page | Continue with checkbox ticked | `303`-style `res.redirect` to `…/list-download-files?artefactId=<uuid>` |
| Disclaimer page | Continue without ticking | Re-render the same URL with an error summary; error summary link focuses `#agreed` |
| Download files page | PDF link | `…/download?artefactId=<uuid>&type=pdf` → file attachment, page stays put |
| Download files page | Excel link | `…/download?artefactId=<uuid>&type=xlsx` → file attachment, page stays put |
| Any download step, unauthenticated | — | `/sign-in`, with `req.session.returnTo` set so the user lands back on the step after signing in |
| Subscription email | "Download Excel version" link | GOV.UK Notify pre-signed file link (bypasses the service entirely; Notify enforces its own expiry) |

The "Download a copy" button is absent — not disabled — when the user is not verified or no files exist. There is no interstitial telling users the download exists but is unavailable to them.

Response headers on `/download`: `Content-Type` from `getContentType(extension)`, `Content-Disposition: attachment; filename="{artefactId}.xlsx"`, and `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate` so protected data is not cached by intermediaries.

---

## 12. Accessibility

Target: **WCAG 2.2 AA** (legal requirement). The new web pages are copies of already-assessed SJP pages, so the accessibility work is mostly about not regressing.

### Web pages

| Requirement | Implementation |
|---|---|
| Page title matches `h1` | Disclaimer: "Terms and conditions"; files page: "Download your file". Set via the layout's title block from `t.pageTitle`. |
| Heading hierarchy | Single `h1` per page, no skipped levels. |
| Error summary (2.4.3, 3.3.1) | `govukErrorSummary` rendered before the `h1`, `titleText` = "There is a problem", each entry `href="#agreed"`; receives focus on page load. |
| Checkbox label association (1.3.1, 4.1.2) | `govukCheckboxes` macro — label bound via `for`/`id`; `aria-describedby` wired to the error message when present. |
| Error identification (3.3.1) | Inline error message rendered adjacent to the checkbox in addition to the summary, with `aria-invalid` on the input. |
| Link purpose in context (2.4.4) | Download link text includes file type, size and destination: "Download this Microsoft Excel spreadsheet (38.4KB) to your device". Never "click here" or a bare "Excel". |
| "Download a copy" as a button-styled link (4.1.2) | `role="button"`, `draggable="false"`, `data-module="govuk-button"` — matches the existing SJP markup, activatable by both Enter and Space. |
| Target size (2.5.8) | GOV.UK button and checkbox defaults exceed 24×24 CSS px. |
| Focus visible (2.4.7) / focus not obscured (2.4.11) | GOV.UK Frontend default focus styles; no sticky headers on these pages. |
| Keyboard-only journey | Tab to "Download a copy" → Enter → Tab to checkbox → Space → Tab to Continue → Enter → Tab to a download link → Enter. No keyboard traps, no JS dependency. |
| Progressive enhancement | The disclaimer is a plain `<form method="post" novalidate>`; validation is server-side. Everything works with JavaScript disabled. |
| Colour not sole carrier (1.4.1) | Errors are conveyed by text, not just the red border. |
| Language attribute (3.1.1) | Handled by the base layout from `res.locals.locale`. |

### The Excel file itself

Spreadsheets are downloadable documents, so WCAG applies to them too. Practical, verifiable measures for a generated `.xlsx`:

- **Single header row, row 1, bold** — gives screen readers and spreadsheet software a recognisable header. Consider `worksheet.views = [{ state: "frozen", ySplit: 1 }]` so the headers stay visible while scrolling; this is a small addition beyond the magistrates precedent and is worth including.
- **No merged cells and no blank spacer rows** — the flattened one-row-per-case shape (repeating court house / court room / judge on every row) is deliberately chosen over visual grouping precisely because merged cells and gaps break assistive-technology table navigation. This is also why the Excel differs structurally from the PDF while carrying identical data.
- **Every column has a non-empty header** — including columns that may be entirely empty for a given artefact (for example Listing Notes).
- **No information conveyed by cell colour or formatting** — the only formatting applied is bold on row 1 and column widths.
- **Meaningful worksheet name** — the list title, not `Sheet1`.
- **Custody indicator** — the `*` prefix carries meaning that is explained only in the PDF preamble ("*denotes a defendant in custody"). Because that legend does not exist in the Excel, either the legend is added or the asterisk is replaced by an explicit value. See §14 — this needs a content decision.

---

## 13. Test Scenarios

### Unit — Excel generators (`libs/list-types/crown-*/src/excel/excel-generator.test.ts`)

Mock `@hmcts/list-types-common` (`saveExcelToStorage`) and `@hmcts/location` (`getLocationById`); read the produced rows back off the ExcelJS worksheet rather than asserting on the buffer.

* Generates a workbook whose worksheet name is the list title, with the expected number of columns in the expected order
* Header row is bold and uses the English column labels from `en.excelColumns`
* Header row uses the Welsh labels and Welsh worksheet name when `locale` is `"cy"`
* Emits one row per case, repeating court house, court room, judge and sitting time across every row of the same session
* Crown Firm List repeats the sitting date on every row belonging to that day, and groups multiple court rooms under one day
* Crown Warned List maps the `TO_BE_ALLOCATED` category key to the translated "To be allocated" label
* Crown Warned List prefixes the defendant cell with `*` when `isInCustody` is true, and does not when false
* Crown Warned List joins multiple linked case numbers with a comma
* Multiple defendants on one case are joined into a single cell, matching the PDF
* Empty optional fields (listing notes, hearing time, representative, judiciary) produce empty cells rather than `undefined`
* A value beginning with `=`, `+`, `-` or `@` is prefixed with an apostrophe
* An artefact with no court lists produces a header-only workbook and still reports success
* Returns `{ success: true, excelPath: "<artefactId>.xlsx" }` and calls `saveExcelToStorage` once with the artefact id
* Returns `{ success: false, error }` — without throwing — when the renderer or the blob upload rejects

### Unit — registry and pipeline (`libs/publication/src/processing/service.test.ts`)

* `listTypeHasExcel` returns true for all three Crown list type names
* `generatePublicationExcel` dispatches `CROWN_DAILY_LIST` / `CROWN_FIRM_LIST` / `CROWN_WARNED_LIST` to the corresponding generator and returns `{ hasExcel: true }`
* `generatePublicationExcel` returns `{}` and logs a warning when a Crown generator reports failure, and `processPublication` still resolves with the PDF path
* `processPublication` sets `result.excelPath` to `{artefactId}.xlsx` for a Crown artefact and passes it into `sendPublicationNotificationsForArtefact`
* No registry entry is keyed by a numeric `listTypeId` (guards the environment-drift rule)

### Unit — notifications (`libs/notifications/src/**/*.test.ts`)

* `getSubscriptionTemplateId` returns the PDF+Excel template for a non-SJP list type when both files exist and are under 2MB
* `buildEmailDataWithFiles` returns both `pdfBuffer` and `excelBuffer` for a Crown artefact that has both blobs
* Falls back to the PDF-only template when the Excel blob is absent, and to the no-links template when either file is 2MB or larger
* `sendEmail` personalisation includes `excel_link_to_file` and `excel_link_text` when an Excel buffer is present

### Unit — page controllers (`apps/web/src/pages/(list-types)/crown-*/**.test.ts`)

* Crown list page passes a non-null `downloadDisclaimerUrl` for a `VERIFIED` user when the `.xlsx` blob exists
* Passes `null` when the user is unauthenticated, when the role is not `VERIFIED`, and when neither blob exists
* Disclaimer GET renders the terms page with `errors: null`
* Disclaimer POST without `agreed` re-renders with an error linking to `#agreed` and does not redirect
* Disclaimer POST with `agreed` redirects to `…/list-download-files?artefactId=<uuid>`
* Files page lists both file types with formatted sizes when both blobs exist, and only the PDF when the Excel is missing
* Files page returns 404 when neither blob exists
* `/download?type=xlsx` sets the spreadsheet content type, an attachment disposition and no-store cache headers
* `/download` rejects a `type` outside `pdf`/`xlsx`, and a malformed `artefactId`, with 400
* Unverified access to each of the three new routes redirects to `/sign-in` and sets `session.returnTo`

### Template (`*.njk.test.ts`, Cheerio structural assertions)

* Crown list template renders exactly one `a.govuk-button` with the download text when `downloadDisclaimerUrl` is set, and none when it is null
* Disclaimer template renders the checkbox, its label and the Continue button; renders the error summary only when `errors` is populated
* Files page renders one link per file with the correct `href`, and the Excel link text differs from the PDF link text
* Welsh render (`cy` locale object) shows the translated headings on all three templates
* Locale key parity for `excelColumns`, `disclaimer` and `downloadFiles` across `en` and `cy` in all three libs

### E2E (`e2e-tests/`, one journey per list type, tagged `@nightly`)

Each spec is a single complete journey covering validation, Welsh and accessibility inline — not separate tests per concern.

* **Crown Daily List download journey:** sign in as a verified user → open a seeded Crown Daily List → assert the "Download a copy" button → press Continue without ticking and assert the error summary → switch to Welsh and assert the translated terms heading → run Axe → tick and continue via keyboard → assert both PDF and Excel links with sizes → download the Excel and assert the response content type and a non-zero body
* **Crown Firm List download journey:** as above, additionally asserting the Excel contains a Date column value for each seeded sitting day
* **Crown Warned List download journey:** as above, additionally asserting a "To be allocated" row is present for a case with no fixed date
* **Unverified user:** open a seeded Crown list without signing in, assert no download button, then request the disclaimer URL directly and assert the redirect to `/sign-in`

---

## 14. Assumptions & Open Questions

**Assumptions**

* "Crown Advance List" in the acceptance criteria means `CROWN_WARNED_LIST`. Its specified field set matches the Crown Warned List's rendered rows exactly, and no list type by that name exists in `list-type-data.ts`. **If this is wrong, the third generator and its page trio target the wrong list type** — worth confirming before implementation starts, though the work is structurally identical either way.
* The PDF half of "Excel and PDF downloadable files are made available" is already delivered; this ticket adds only the Excel half plus the download UI.
* "Made available as downloadable options for the Crown hearing lists" means an on-page download journey for verified users, reusing the SJP disclaimer → files → download flow. Precedent is mixed: the magistrates lists generate Excel for email only, with no on-page download. If the intent was email-only, §6.5 and §6.6 can be dropped and the ticket shrinks to three generators plus registry entries — that is the product team's call, not an implementation detail.
* Uniformity of "data fields / columns" between Excel and PDF means the same *set of fields with the same values*, not the same visual layout. The PDF groups by court house / court room / judge / sitting as headings; the Excel flattens those into repeated columns. Flattening is required for the file to be sortable and filterable, which is the point of offering Excel.
* Excel generation happens at publication time (in `processPublication`), not on demand at download time — consistent with every other list type.
* Existing Crown artefacts published before this change will have no `.xlsx` blob and therefore no Excel download option. No backfill is specified.
* `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is already configured in every environment (it is in use for SJP and magistrates lists). If it is missing anywhere, `getSubscriptionTemplateId` **throws** and notifications fail — verify before release.
* Crown lists are not SJP, so `isSjpListType` returns false and the SJP-Excel-only template is never selected. No change to `SJP_LIST_TYPE_NAMES`.
* No new Prisma schema, migration or `list-type-data.ts` change is required — the three list types already exist and are seeded.
* No new JSON schema or validator is needed; this ticket adds no upload path. The CI guard in `libs/list-types/common/src/validation/guard.test.ts` is unaffected.

**Open questions**

* **Blocking-ish (confirm before merge, not before starting):** is "Crown Advance List" the Crown Warned List, or a fourth list type expected from #957?
* What exactly does #957 change? If it alters the PDDA JSON shape or the rendered row objects for any Crown list, the §6.3 column mappings must be re-verified against the updated renderers. This spec is written against the renderers on `master` today.
* The custody `*` prefix has no legend in the Excel file (the PDF explains it in its preamble). Options: add a `Custody` column with an explicit Yes/No, append the legend as a cell below the data, or accept the bare asterisk. A `Custody` column is the most accessible but breaks strict column parity with the specified field list. Content/product decision needed.
* Should the Crown Firm List Excel be one sheet with a Date column (as specced, matching the specified field list) or one worksheet per sitting day? One sheet is more useful for filtering and is what the field list implies; a multi-sheet variant would need `multi-sheet-converter`-style handling.
* Welsh Excel files are only produced when the artefact itself is published with `locale: "cy"` — there is no mechanism for a user viewing in Welsh to download a Welsh spreadsheet of an English-published artefact. Same limitation as the PDF. Is that acceptable for Crown lists?
* `excel_link_text` is hardcoded English (`"Download Excel version"`) in `govnotify-client.ts`. Welsh-language subscribers receive English link text. Pre-existing across all list types — should it be raised as a separate ticket?
* Does the download journey need audit logging? The service has an `audit-log` domain, and downloads of personal protected data by verified users look like an auditable event, but the existing SJP download flow records nothing. Out of scope here unless confirmed otherwise.
* Confirm the "Download a copy" button placement on the Crown pages — directly under the list header (as specced, matching SJP) or in the footer area near "Back to top"?


---

### Comment by OgechiOkelu on 2026-08-20T11:54:10Z

@plan 

