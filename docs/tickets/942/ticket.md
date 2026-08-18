# #942: Create additional file format for Download version of SSCS Hearing Lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-08-12T12:43:39Z
**Updated:** 2026-08-18T13:05:58Z

## Description

PROBLEM STATEMENT
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the excel download file for the SSCS Hearing Lists.
**SSCS Lists:**
Liverpool Social Security and Child Support Tribunal Daily Hearing List
London Social Security and Child Support Tribunal Daily Hearing List
Midlands Social Security and Child Support Tribunal Daily Hearing List
North East Social Security and Child Support Tribunal Daily Hearing List
North West Social Security and Child Support Tribunal Daily Hearing List
Scotland Social Security and Child Support Tribunal Daily Hearing List
South East Social Security and Child Support Tribunal Daily Hearing List
Wales and South West Social Security and Child Support Tribunal Daily Hearing List

 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from

 

**ACCEPTANCE CRITERIA**
- Excel and PDF downloadable files are made available as downloadable options for all SSCS hearing lists above
- The uploaded excel file will be re-used in providing the excel file for download
- All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file
- Links to download both file types are displayed in the email notifications


## Comments

### Comment by OgechiOkelu on 2026-08-18T12:56:39Z

@spec 

### Comment by hmctsclaudecode on 2026-08-18T13:04:56Z

# Technical Specification — Issue #942: Excel download format for SSCS Hearing Lists

## 1. User Story

**As a** CaTH service
**I want to** publish an Excel (`.xlsx`) version of every SSCS Social Security and Child Support Tribunal Daily Hearing List alongside the existing PDF
**So that** verified CaTH users receiving subscription email notifications can choose the format that suits how they consume hearing data, rather than being restricted to PDF only

## 2. Background

### What exists today

SSCS Daily Hearing Lists are **non-strategic** list types (`isNonStrategic: true`). They are uploaded by an internal admin as an Excel spreadsheet through `/non-strategic-upload`, converted to JSON by a registered converter, and the JSON is stored as the artefact blob. The original uploaded Excel is deliberately **discarded** — see the comment at `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:136`: *"Store converted JSON in blob — original Excel is not stored (no value after conversion)"*.

Current pipeline for an SSCS publication:

```
Admin uploads .xlsx
  └─> convertExcelForListTypeName("SSCS_<REGION>_DAILY_HEARING_LIST", buffer)
        (libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.ts)
  └─> JSON saved to blob container "artefact" as {artefactId}
  └─> processPublication()  (libs/publication/src/processing/service.ts)
        ├─ generatePublicationPdf()   → PDF_GENERATOR_REGISTRY["SSCS_…"]  ✅ exists
        │                                → {artefactId}.pdf in container "publications"
        ├─ generatePublicationExcel() → EXCEL_GENERATOR_REGISTRY["SSCS_…"] ❌ NOT REGISTERED
        └─ sendPublicationNotificationsForArtefact()
              └─> buildEmailDataWithFiles()
                    ├─ downloadBlob({artefactId}.pdf,  "publications") → pdfBuffer
                    ├─ downloadBlob({artefactId}.xlsx, "publications") → null today
                    └─ getSubscriptionTemplateId({ hasPdf, hasExcel, … })
```

### Why the email side needs almost no new code

`buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:466-496`) **unconditionally** attempts `downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS)` for every list type. `getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:15`) then selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` whenever both a PDF and an Excel buffer are present and both are under 2MB. `govnotify-client.ts:83-90` uploads the Excel buffer via Notify's `prepareUpload` and sets `excel_link_to_file` / `excel_link_text`.

**Consequence:** the moment `{artefactId}.xlsx` exists in the `publications` container for an SSCS artefact, the subscription email automatically switches to the PDF + Excel template and renders both download links. AC4 is satisfied by producing the file — no change to the notification code path is required.

### The two real gaps

1. **No Excel generator is registered for any SSCS list type.** `EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:363-386`) contains only `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST` and the four SJP list types.
2. **The Liverpool list type does not exist.** The issue names 8 SSCS lists; `libs/list-types/common/src/list-type-data.ts:577-655` defines only 7 (Midlands, South East, Wales and South West, Scotland, North East, North West, London). There is **no** `SSCS_LIVERPOOL_DAILY_HEARING_LIST`. The *location* "Liverpool Social Security and Child Support Tribunal" does exist (`libs/location/src/location-data.ts:174`), and the North West list already points observers at `sscsa-liverpool@justice.gov.uk`, which suggests Liverpool may currently be intended to publish under the North West list. This must be resolved before the ticket can be called done — see §14.

### Reference implementations to follow

| Concern | Reference |
|---|---|
| Excel generator for a JSON-backed list | `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` |
| Shared Excel helpers (`sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage`) | `libs/list-types/common/src/excel/excel-utilities.ts` |
| Registry wiring | `libs/publication/src/processing/service.ts:363` |
| In-page download journey | `apps/web/src/pages/(list-types)/sjp-download-shared.ts` + `sjp-press-list/list-download-files.ts` |
| Existing public download endpoint | `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` (`?format=excel`) |

## 3. Acceptance Criteria

* **Scenario:** Excel file is generated when an SSCS list is published
    * **Given** an internal admin has uploaded a valid SSCS Daily Hearing List spreadsheet for any of the SSCS list types
    * **When** `processPublication` runs for that artefact
    * **Then** an `.xlsx` file is written to the `publications` blob container as `{artefactId}.xlsx`, in addition to the existing `{artefactId}.pdf`

* **Scenario:** Excel contains every field present in the PDF
    * **Given** a published SSCS artefact whose JSON contains hearings with all nine fields populated (`venue`, `appealReferenceNumber`, `hearingType`, `appellant`, `courtroom`, `hearingTime`, `tribunal`, `respondent`, `additionalInformation`)
    * **When** the generated `.xlsx` is opened
    * **Then** it has a header row with the same nine column headings the PDF table uses, and one data row per hearing containing exactly the same values in the same order

* **Scenario:** Excel data matches the uploaded spreadsheet
    * **Given** an admin uploaded a spreadsheet containing N hearing rows
    * **When** the generated `.xlsx` is opened
    * **Then** it contains N data rows whose cell values are identical to the validated, converted values from the upload — no re-keying, no derived or additional data source

* **Scenario:** Subscription email offers both formats
    * **Given** a verified user is subscribed to an SSCS list type or to a location that publishes one
    * **And** both the PDF and the Excel file are under 2MB
    * **When** the list is published
    * **Then** the email uses the PDF + Excel Notify template (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`) and shows a link to download the PDF and a link to download the Excel spreadsheet

* **Scenario:** Oversized files fall back safely
    * **Given** a published SSCS artefact whose generated Excel is 2MB or larger
    * **When** subscription emails are sent
    * **Then** the no-links Notify template is used and no broken personalisation is sent (existing behaviour in `getSubscriptionTemplateId` — must not regress)

* **Scenario:** Welsh publication produces Welsh column headings
    * **Given** an SSCS list is uploaded with language `WELSH`
    * **When** the `.xlsx` is generated
    * **Then** the header row uses the Welsh column headings from `libs/list-types/sscs-daily-hearing-list/src/locales/cy.ts`

* **Scenario:** Excel generation failure does not block publication
    * **Given** Excel generation throws (for example a blob storage outage)
    * **When** `processPublication` runs
    * **Then** the artefact, its JSON blob and its PDF are still published, the error is logged, and the subscription email is sent with the PDF link only

* **Scenario:** Verified user downloads the Excel from the list page
    * **Given** a verified user is viewing a published SSCS Daily Hearing List
    * **When** they follow the download link and choose the Excel file
    * **Then** the `.xlsx` is served as an attachment with content type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

* **Scenario:** Liverpool list is covered
    * **Given** the Liverpool Social Security and Child Support Tribunal Daily Hearing List named in the issue
    * **When** a Liverpool list is published
    * **Then** both a PDF and an Excel file are produced and linked in the notification email
    * **Note:** this requires the list type itself to be created first — see §14, Open Question 1

## 4. User Journey Flow

There are two journeys: the publication (system) journey and the subscriber (user) journey.

### Journey A — Publication (system, no UI change)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Internal admin: /non-strategic-upload                                │
│   selects court, SSCS list type, uploads .xlsx, sets dates           │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ /non-strategic-upload-summary  (POST)                                │
│   convertExcelForListTypeName() → JSON                               │
│   JSON → blob "artefact"/{artefactId}                                │
│   updateSourceArtefactId(original .xlsx filename)                    │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼  (background, not awaited)
┌──────────────────────────────────────────────────────────────────────┐
│ processPublication()                                                 │
│                                                                      │
│   1. extractAndStoreArtefactSearch()                                 │
│   2. generatePublicationPdf()                                        │
│        → publications/{artefactId}.pdf          [existing]           │
│   3. generatePublicationExcel()                                      │
│        EXCEL_GENERATOR_REGISTRY["SSCS_<REGION>_DAILY_HEARING_LIST"]  │
│        → generateSscsDailyHearingListExcel()    [NEW]                │
│        → publications/{artefactId}.xlsx         [NEW]                │
│   4. sendPublicationNotificationsForArtefact()                       │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ buildEmailDataWithFiles()                     [no change needed]     │
│   pdfBuffer   = downloadBlob({id}.pdf,  publications)   → present    │
│   excelBuffer = downloadBlob({id}.xlsx, publications)   → NOW present│
│   templateId  = GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL      │
│   prepareUpload(pdf)   → pdf_link_to_file                            │
│   prepareUpload(excel) → excel_link_to_file                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Journey B — Subscriber receives the email

```
1. Subscriber receives "…has been published" email
2. Email body shows two links:
     • Download PDF version
     • Download Excel version
3. Follows either link → GOV.UK Notify document download page
     (retentionPeriod: 1 week, confirmEmailBeforeDownload: false)
4. File downloads to device
```

### Journey C — Verified user downloads from the list page (secondary scope, see §14)

```
1. User signs in, searches for the court, opens the SSCS Daily Hearing List
     /sscs-daily-hearing-list?artefactId=<uuid>
2. Selects "Download a copy of this list"
     → /sscs-daily-hearing-list/list-download-files?artefactId=<uuid>
3. Page lists the available files with sizes:
     • Download this PDF (128.4KB) to your device
     • Download this Microsoft Excel spreadsheet (14.2KB) to your device
4. Selects a link
     → /sscs-daily-hearing-list/download?artefactId=<uuid>&type=xlsx
5. File downloads as an attachment
```

## 5. Low Fidelity Wireframe

### 5.1 Subscription email (PDF + Excel template)

```
┌────────────────────────────────────────────────────────────────┐
│  GOV.UK Notify — Court and tribunal hearings                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  A new version of a hearing list you subscribed to has been    │
│  published.                                                    │
│                                                                │
│  Court or tribunal: Liverpool Social Security and Child        │
│                     Support Tribunal                           │
│  Hearing list:      North West Social Security and Child       │
│                     Support Tribunal Daily Hearing List        │
│  List for:          18 August 2026                             │
│                                                                │
│  Summary of cases                                              │
│  ─────────────────                                             │
│  Appeal reference: SC123/25/00001                              │
│  Appellant: Mr A Appellant                                     │
│  ...                                                           │
│                                                                │
│  ▸ Download PDF version          ← pdf_link_to_file            │
│  ▸ Download Excel version        ← excel_link_to_file  [NEW]   │
│                                                                │
│  Manage your subscriptions                                     │
│  Court and tribunal hearings service                           │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Generated Excel workbook layout

Single worksheet, named after the list title. Bold header row, auto-fitted columns.

```
     A          B                C            D           E          F         G         H           I
  ┌──────────┬────────────────┬────────────┬───────────┬──────────┬─────────┬─────────┬───────────┬──────────────┐
1 │ Venue    │ Appeal         │ Hearing    │ Appellant │ Courtroom│ Hearing │ Tribunal│ FTA/      │ Additional   │  ← bold
  │          │ reference      │ type       │           │          │ time    │         │ Respondent│ information  │
  │          │ number         │            │           │          │         │         │           │              │
  ├──────────┼────────────────┼────────────┼───────────┼──────────┼─────────┼─────────┼───────────┼──────────────┤
2 │ Liverpool│ SC123/25/00001 │ Oral       │ Mr A      │ Room 1   │ 10:00am │ Judge,  │ DWP       │ Interpreter  │
  │ SSCS     │                │            │ Appellant │          │         │ Doctor  │           │ required     │
  ├──────────┼────────────────┼────────────┼───────────┼──────────┼─────────┼─────────┼───────────┼──────────────┤
3 │ Liverpool│ SC123/25/00002 │ Paper      │ Ms B      │ Room 2   │ 11:30am │ Judge   │ HMRC      │              │
  │ SSCS     │                │            │ Appellant │          │         │         │           │              │
  └──────────┴────────────────┴────────────┴───────────┴──────────┴─────────┴─────────┴───────────┴──────────────┘
```

Column order is fixed and mirrors the PDF table column order exactly (`pdf-template.njk` / `sscs-daily-hearing-list.njk`).

### 5.3 Download-a-copy page (secondary scope)

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back                                                       │
│                                                              │
│  Download your file                                          │
│  ══════════════════                                          │
│                                                              │
│  Save your file somewhere you can find it. You may need to   │
│  print it or show it to someone later.                       │
│                                                              │
│  Download this PDF (128.4KB) to your device                  │
│                                                              │
│  Download this Microsoft Excel spreadsheet (14.2KB) to your  │
│  device                                                      │
│                                                              │
│  If you have any questions, call 0300 303 0656.              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 Design decision: generate the Excel from the validated JSON

AC2 states *"the uploaded excel file will be re-used in providing the excel file for download"*. Read literally that means storing the admin's uploaded `.xlsx` and serving that exact binary. **This spec does not do that**, for four concrete reasons:

1. **The uploaded file is not retained.** `non-strategic-upload-summary/index.ts:137` writes only the converted JSON to blob storage. Serving the original would require persisting an extra copy of every upload.
2. **Unvalidated columns would be published.** The converter maps only the nine configured fields (`sscs-config.ts`). Any extra column an admin happens to leave in the workbook — working notes, unredacted party data, a hidden sheet — is invisible to the PDF and to the on-screen list but would be shipped verbatim to every subscriber. That is a data-exposure defect, not a feature.
3. **No Welsh headings.** An uploaded workbook has English headers only, so a `WELSH` publication's Excel would contradict its PDF.
4. **Untrusted binary re-distribution.** Passing an admin-supplied `.xlsx` straight into `prepareUpload` re-distributes an unscanned binary with whatever formulas or macros it carries. The generated path runs every cell through `sanitiseCellValue`, which neutralises formula injection.

**What is delivered instead:** the `.xlsx` is generated from the JSON that was itself converted from the uploaded spreadsheet. The data content is byte-for-byte the validated upload data — same rows, same values, same order, no second data source and no re-keying — which satisfies the *intent* of AC2 (do not build a separate data pipeline) while satisfying AC3 exactly (all PDF fields present) and avoiding the four problems above. This also matches how every other Excel download in the codebase is produced. **Flagged for PO confirmation in §14.**

### 6.2 NEW — `libs/list-types/sscs-daily-hearing-list/src/excel/excel-generator.ts`

Follows `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts`.

```
Function:  generateSscsDailyHearingListExcel(options): Promise<ExcelGenerationResult>

Options:   artefactId   string
           locationId   string
           contentDate  Date
           locale       string   ("en" | "cy")
           jsonData     SscsDailyHearingList

Returns:   { success: true, excelPath }  |  { success: false, error }
```

Behaviour:

1. Select translations: `const t = locale === "cy" ? cyLocale : enLocale`.
2. Create an `ExcelJS.Workbook` and one worksheet. Worksheet name derives from the list title; it **must** be truncated to 31 characters and stripped of `[ ] : * ? / \` — Excel rejects longer or invalid sheet names, and SSCS friendly names are 60+ characters (e.g. *"Wales and South West Social Security and Child Support Tribunal Daily Hearing List"*). Add a shared `sanitiseWorksheetName()` helper to `libs/list-types/common/src/excel/excel-utilities.ts` since this problem is not SSCS-specific.
3. Add the header row from `t.tableHeaders` in this order, then set `headerRow.font = { bold: true }`:
   `venue`, `appealReferenceNumber`, `hearingType`, `appellant`, `courtroom`, `hearingTime`, `tribunal`, `respondent`, `additionalInformation`.
4. Iterate the hearings array (`SscsDailyHearingList` is a flat `SscsDailyHearing[]` — no nesting) and add one row per hearing, each cell passed through `sanitiseCellValue`. Coerce `undefined`/`null` to `""` before sanitising: `additionalInformation` is optional in the converter config (`required: false`) and `sanitiseCellValue` indexes `value[0]`, which throws on a non-string.
5. `autoFitColumns(worksheet)`.
6. `const buffer = await workbook.xlsx.writeBuffer()` then `saveExcelToStorage(artefactId, Buffer.from(buffer))` → writes `{artefactId}.xlsx` to `CONTAINER.PUBLICATIONS`.
7. Wrap the whole body in `try/catch`; on error return `{ success: false, error: "Failed to generate SSCS Excel: <message>" }`. Never throw — `generatePublicationExcel` already swallows and logs, and publication must not be blocked.

Export from `libs/list-types/sscs-daily-hearing-list/src/index.ts`:

```
export * from "./excel/excel-generator.js";
```

### 6.3 CHANGED — `libs/publication/src/processing/service.ts`

Add the import and register every SSCS list type in `EXCEL_GENERATOR_REGISTRY`. Use a single shared generator constant so the eight entries do not duplicate the cast:

```
const sscsExcelGenerator: ExcelGenerator = (p) =>
  generateSscsDailyHearingListExcel({ ...p, jsonData: p.jsonData as SscsDailyHearingList });
```

Registry keys to add (string names only — never numeric `listTypeId`):

| Key |
|---|
| `SSCS_MIDLANDS_DAILY_HEARING_LIST` |
| `SSCS_SOUTH_EAST_DAILY_HEARING_LIST` |
| `SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST` |
| `SSCS_SCOTLAND_DAILY_HEARING_LIST` |
| `SSCS_NORTH_EAST_DAILY_HEARING_LIST` |
| `SSCS_NORTH_WEST_DAILY_HEARING_LIST` |
| `SSCS_LONDON_DAILY_HEARING_LIST` |
| `SSCS_LIVERPOOL_DAILY_HEARING_LIST` (subject to Open Question 1) |

Note that `generatePublicationExcel` receives `listTypeName` from `pdfResult.listTypeName`, which `generatePublicationPdf` resolves from the DB. That works, but it means **Excel generation is silently skipped whenever PDF generation returns early with no `listTypeName`** (the `catch` branch at `service.ts:442` returns `{}`). This is pre-existing behaviour and out of scope to fix, but the implementer should be aware that a PDF-generation crash also loses the Excel.

### 6.4 CHANGED — Liverpool list type (conditional on Open Question 1)

If the Liverpool list is confirmed as a distinct list type, add `SSCS_LIVERPOOL_DAILY_HEARING_LIST` in **all six** places, keyed on the name:

| File | Change |
|---|---|
| `libs/list-types/common/src/list-type-data.ts` | New entry: `englishFriendlyName: "Liverpool Social Security and Child Support Tribunal Daily Hearing List"`, `welshFriendlyName`, `shortenedFriendlyName: "SSCS Liverpool Daily Hearing List"`, `provenance: "CFT_IDAM"`, `urlPath: "sscs-daily-hearing-list"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [8]` |
| `libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.ts` | `registerConverterByName("SSCS_LIVERPOOL_DAILY_HEARING_LIST", sscsConverter)` |
| `libs/list-types/sscs-daily-hearing-list/src/locales/en.ts` | `importantInformationByListType` entry (observer email TBC — Open Question 2) |
| `libs/publication/src/processing/service.ts` | `SSCS_FRIENDLY_NAMES` entry + `PDF_GENERATOR_REGISTRY` entry + `EXCEL_GENERATOR_REGISTRY` entry |

No hand-written SQL: `list-type-data.ts` is the single source of truth and the deploy seed SQL is generated from it (`apps/postgres/prisma/generate-seed-sql.ts`).

### 6.5 CHANGED — Welsh Excel column headings

`libs/list-types/sscs-daily-hearing-list/src/locales/cy.ts` already contains a complete `tableHeaders` block, so no new locale keys are required for the workbook. Reuse `t.tableHeaders` rather than introducing a separate `excelColumns` block (magistrates needs one only because its Excel has 26 columns that differ from its on-screen table; SSCS has a 1:1 match). This keeps the Excel and the PDF headings in lockstep by construction.

### 6.6 NEW (secondary scope) — download-a-copy pages

Two new page controllers under `apps/web/src/pages/(list-types)/sscs-daily-hearing-list/`:

| File | Route | Behaviour |
|---|---|---|
| `list-download-files.ts` + `list-download-files.njk` | `/sscs-daily-hearing-list/list-download-files?artefactId=<uuid>` | Lists available files with sizes. Reuses `createListDownloadFilesHandler(en, cy, "downloadFiles")` |
| `download.ts` | `/sscs-daily-hearing-list/download?artefactId=<uuid>&type=pdf\|xlsx` | Streams the blob as an attachment. Reuses `handleBlobDownload` |

Plus a link on `sscs-daily-hearing-list.njk`, placed directly beneath the "Last updated" paragraph:

```
<p class="govuk-body">
  <a href="/sscs-daily-hearing-list/list-download-files?artefactId={{ artefactId }}"
     class="govuk-link">{{ t.downloadCopyLink }}</a>
</p>
```

This requires passing `artefactId` into the render context in `index.ts` (currently it is not passed).

**Blocking defect to fix first.** `sjp-download-shared.ts` reads from the wrong container. `handleBlobDownload` calls `downloadBlob(fileName)` and `getAvailableFiles` calls `getBlobProperties(...)`, both with no container argument, so both default to `CONTAINER.ARTEFACT` (`libs/azure-blob/src/blob-client.ts:65`). PDFs and Excels are written to `CONTAINER.PUBLICATIONS`. Both helpers must be passed `CONTAINER.PUBLICATIONS` before they can be reused, or the SSCS download page will always render a 404. Verify against the SJP journey on STG before changing it, in case SJP relies on a duplicate blob in `artefact`.

**Access control.** SJP wraps these routes in `requireVerifiedWithProvenance`. SSCS lists are `defaultSensitivity: "Public"` and their view page uses `createSimpleListTypeHandler` without an access check, so the download routes must apply the *same* access rule as the view page — do not blanket-copy the SJP verified-only guard, which would make a public list harder to download than to read. Use `canAccessPublicationData` with the resolved list type, consistent with `getExcelForDownload` in `libs/public-pages/src/flat-file/flat-file-service.ts:81`.

### 6.7 Alternative to 6.6 — reuse the existing endpoint

`GET /api/flat-file/:artefactId/download?format=excel` already exists, already performs artefact lookup, display-window and `canAccessPublicationData` checks, and already serves `{artefactId}.xlsx` from the correct container. If the PO only needs *a* download route rather than the SJP-style interstitial page, link straight to it from `sscs-daily-hearing-list.njk` and skip §6.6 entirely. **Recommended** — it is materially less code, has no container bug, and needs no new access-control decision.

## 7. Content

### 7.1 Excel column headings — no new content required

The nine headings already exist in both locales and are reused verbatim.

| Field | English (`locales/en.ts`) | Welsh (`locales/cy.ts`) |
|---|---|---|
| `venue` | Venue | Lleoliad |
| `appealReferenceNumber` | Appeal reference number | Cyfeirnod Apêl |
| `hearingType` | Hearing type | Math o Wrandawiad |
| `appellant` | Appellant | Apellydd |
| `courtroom` | Courtroom | Ystafell y Llys |
| `hearingTime` | Hearing time | Amser y Gwrandawiad |
| `tribunal` | Tribunal | Tribiwnlys |
| `respondent` | FTA/Respondent | ATC/Ymatebydd |
| `additionalInformation` | Additional information | Gwybodaeth Ychwanegol |

### 7.2 NEW content — download link on the list page (secondary scope)

Add to `libs/list-types/sscs-daily-hearing-list/src/locales/en.ts`:

```typescript
downloadCopyLink: "Download a copy of this list",
```

Add to `libs/list-types/sscs-daily-hearing-list/src/locales/cy.ts`:

```typescript
downloadCopyLink: "[TRANSLATE: \"Download a copy of this list\"]",
```

### 7.3 NEW content — download-files page (only if §6.6 is chosen over §6.7)

Add a `downloadFiles` block to both locale files, mirroring the SJP wording so the two journeys read identically.

`en.ts`:

```typescript
downloadFiles: {
  pageTitle: "Download your file",
  saveInstructions: "Save your file somewhere you can find it. You may need to print it or show it to someone later.",
  downloadPdfLink: "Download this PDF",
  downloadExcelLink: "Download this Microsoft Excel spreadsheet",
  toDevice: "to your device",
  contactInfo: "If you have any questions, call 0300 303 0656."
}
```

`cy.ts` — these strings already exist verbatim in `libs/list-types/sjp-press-list/src/sjp-press-list/cy.ts:67-74` and should be copied rather than re-translated, to keep the two journeys consistent:

```typescript
downloadFiles: {
  pageTitle: "[TRANSLATE: \"Download your file\"]",
  saveInstructions: "[TRANSLATE: \"Save your file somewhere you can find it. You may need to print it or show it to someone later.\"]",
  downloadPdfLink: "[TRANSLATE: \"Download this PDF\"]",
  downloadExcelLink: "[TRANSLATE: \"Download this Microsoft Excel spreadsheet\"]",
  toDevice: "[TRANSLATE: \"to your device\"]",
  contactInfo: "[TRANSLATE: \"If you have any questions, call 0300 303 0656.\"]"
}
```

**Note on the phone number:** `0300 303 0656` is the SJP contact number. Confirm the correct SSCS contact number with the PO before shipping — do not copy the SJP number blind. Tracked as Open Question 5.

### 7.4 Liverpool list type content (conditional on Open Question 1)

`list-type-data.ts`:

```typescript
englishFriendlyName: "Liverpool Social Security and Child Support Tribunal Daily Hearing List",
welshFriendlyName: "[TRANSLATE: \"Liverpool Social Security and Child Support Tribunal Daily Hearing List\"]",
shortenedFriendlyName: "SSCS Liverpool Daily Hearing List",
```

`SSCS_FRIENDLY_NAMES` in `libs/publication/src/processing/service.ts`:

```typescript
SSCS_LIVERPOOL_DAILY_HEARING_LIST: {
  en: "Liverpool Social Security and Child Support Tribunal Daily Hearing List",
  cy: "[TRANSLATE: \"Liverpool Social Security and Child Support Tribunal Daily Hearing List\"]"
}
```

The other seven Welsh friendly names follow the established pattern `Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant <region>`, so the translator should be asked for the correct Welsh form of "Liverpool" (Lerpwl) in that construction.

### 7.5 Email content — GOV.UK Notify templates (not in the repo)

The email body lives in the Notify template `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`, not in this codebase. It must already contain both personalisation placeholders:

| Placeholder | Set by | Value |
|---|---|---|
| `pdf_link_to_file` | `govnotify-client.ts:77` | Notify upload link |
| `pdf_link_text` | `govnotify-client.ts:79` | `Download PDF version` |
| `excel_link_to_file` | `govnotify-client.ts:88` | Notify upload link |
| `excel_link_text` | `govnotify-client.ts:89` | `Download Excel version` |

**Welsh gap (pre-existing, out of scope but must be recorded):** `pdf_link_text` and `excel_link_text` are hardcoded English string literals in `govnotify-client.ts`. A Welsh-language subscriber to a Welsh SSCS publication will receive English link text. This affects every list type, not just SSCS, so it should be raised as a separate ticket rather than fixed here — but do not let it be discovered in UAT and mistaken for a regression introduced by this ticket.

## 8. URL

### Existing routes (unchanged)

| Route | Purpose |
|---|---|
| `GET /sscs-daily-hearing-list?artefactId=<uuid>` | Renders the SSCS list. All eight list types share this `urlPath` |
| `GET /api/flat-file/:artefactId/download?format=pdf` | Serves `{artefactId}.pdf` |
| `GET /api/flat-file/:artefactId/download?format=excel` | Serves `{artefactId}.xlsx` — **already implemented, works for SSCS as soon as the blob exists** |
| `POST /non-strategic-upload-summary?uploadId=<id>` | Publication trigger |

### New routes (only if §6.6 is chosen over §6.7)

| Route | Purpose |
|---|---|
| `GET /sscs-daily-hearing-list/list-download-files?artefactId=<uuid>` | Interstitial page listing PDF and Excel with file sizes |
| `GET /sscs-daily-hearing-list/download?artefactId=<uuid>&type=pdf\|xlsx` | Streams the file as an attachment |

Routes are auto-discovered from `apps/web/src/pages/(list-types)/sscs-daily-hearing-list/`; the `(list-types)` route group adds no URL prefix.

### Blob storage keys

| Key | Container | Written by |
|---|---|---|
| `{artefactId}` | `artefact` | Converted JSON (`saveUploadedFile`) |
| `{artefactId}.pdf` | `publications` | `savePdfToStorage` |
| `{artefactId}.xlsx` | `publications` | `saveExcelToStorage` — **NEW for SSCS** |

## 9. Validation

### 9.1 No new user-facing validation

Excel generation is a background system step with no form input. Upload validation is unchanged: the JSON schema at `libs/list-types/sscs-daily-hearing-list/src/schemas/sscs-daily-hearing-list.json` and the field validators in `sscs-config.ts` (`required` flags plus `validateNoHtmlTags` on all nine fields) already run at `/non-strategic-upload` before the summary page is reached. A file that fails validation never produces an artefact, so it never reaches the Excel generator.

### 9.2 Generator input handling

| Condition | Required behaviour |
|---|---|
| `jsonData` is an empty array (`[]`) | Produce a workbook containing only the bold header row. Do **not** error — the PDF renders an empty list in the same situation, so the two formats must agree |
| `additionalInformation` is `undefined` or `null` | Write an empty cell. Coerce to `""` **before** calling `sanitiseCellValue`, which does `value[0]` and throws on a non-string |
| Any field value begins with `=`, `+`, `-` or `@` | Prefix with `'` via `sanitiseCellValue` to block CSV/formula injection |
| Worksheet name exceeds 31 chars or contains `[ ] : * ? / \` | Truncate and strip via the new `sanitiseWorksheetName()` helper. ExcelJS throws otherwise, and every SSCS friendly name exceeds 31 characters |
| `jsonData` is not an array | Return `{ success: false, error }`. Should be unreachable given schema validation, but the generator must not throw into `processPublication` |

### 9.3 Download route validation (secondary scope)

| Rule | Response |
|---|---|
| `artefactId` missing or not a v4-shaped UUID | `400` |
| `type` not in `{pdf, xlsx}` | `400` |
| Artefact not found | `404` |
| Now outside `displayFrom`–`displayTo` | `410` |
| `canAccessPublicationData` returns false | `403` |
| Blob absent from `publications` | `404` |

The UUID regex and allow-list already exist in `sjp-download-shared.ts:5-6` and `download.ts:5-6`; reuse them rather than writing new ones.

### 9.4 File size

`MAX_PDF_SIZE_BYTES` is 2MB (`notification-service.ts:120`). An Excel of 2MB or more is dropped from the email and `getSubscriptionTemplateId` falls back to the no-links template — which also drops the PDF link. The generated SSCS Excel is a flat nine-column sheet, so 2MB implies roughly 20,000+ hearing rows and is not a realistic daily list; no new handling is specified. It must be covered by a test so the fallback is proven, not assumed.

## 10. Error Messages

### 10.1 System / log messages (not user-facing)

| Condition | Message | Where |
|---|---|---|
| Excel generation returns `success: false` | `Failed to generate SSCS Excel: <message>` | Returned by the generator, logged by `generatePublicationExcel` as `[Non-Strategic Upload] Excel generation failed:` with `{ artefactId, error }` |
| Excel generation throws | `[Non-Strategic Upload] Excel generation error:` with `{ artefactId, error }` | `service.ts:413` (existing) |
| No generator registered for the list type | Silent — `generatePublicationExcel` returns `{}` | `service.ts:398` (existing) |

Log messages must never include hearing data, appellant names or email addresses. Log only `artefactId` and the error message, matching the existing pattern.

### 10.2 User-facing messages (secondary scope download pages)

Reuse the existing SSCS error content, which is already wired into `createSimpleListTypeHandler`:

| Status | Template | Content |
|---|---|---|
| `400` | `errors/400` | Existing shared 400 content |
| `403` | `errors/403` | `t.error403Title` / `t.error403Message` |
| `404` | `errors/404` | Existing shared 404 content |
| `410` | `errors/common` | Existing expired-publication content |

No new error strings are introduced. If the download-files page finds neither file, `createListDownloadFilesHandler` already renders `errors/404`.

## 11. Navigation

### 11.1 Publication flow (no navigation change)

Excel generation happens inside the already-backgrounded `processPublication` call. The admin is redirected to `/non-strategic-upload-success` as soon as the artefact, blob and search data are persisted — before Excel generation completes. This is deliberate (see the comment at `non-strategic-upload-summary/index.ts:161-165`: Chromium PDF rendering plus subscriber emails were causing request timeouts). Adding Excel generation to this background path **must not** move any of it back into the request cycle.

### 11.2 Email navigation

Both links point at GOV.UK Notify's document download service with a one-week retention period. They are external absolute URLs generated by `prepareUpload`; no CaTH route is involved and no sign-in is required (`confirmEmailBeforeDownload: false`).

### 11.3 List page navigation (secondary scope)

```
/sscs-daily-hearing-list?artefactId=<uuid>
        │
        │  "Download a copy of this list"
        ▼
/sscs-daily-hearing-list/list-download-files?artefactId=<uuid>
        │
        │  "Download this PDF (…)" / "Download this Microsoft Excel spreadsheet (…)"
        ▼
/sscs-daily-hearing-list/download?artefactId=<uuid>&type=pdf|xlsx
        │
        ▼
   File attachment (browser download; page does not navigate)
```

The download-files page must render a GOV.UK back link to the list page, preserving `artefactId` and the `lng` query parameter so a Welsh user is not dropped back into English.

## 12. Accessibility

WCAG 2.2 AA is mandatory. Most of this ticket is a background file generator with no UI, but three accessibility obligations apply.

### 12.1 The Excel file itself

An `.xlsx` is a document, not a web page, so WCAG applies to it as non-web-content. Concretely:

| Requirement | Implementation |
|---|---|
| Row 1 is an identifiable header row | `headerRow.font = { bold: true }` — matches the existing magistrates generators. **Additionally set `worksheet.views = [{ state: "frozen", ySplit: 1 }]`** so screen-reader and keyboard users keep the headings in context when scrolling a long list |
| Headings are meaningful without colour or formatting | Text headings only; no colour-coded cells, no merged cells. Do not use fill colour to convey anything |
| Column widths do not truncate content | `autoFitColumns` caps at 60 chars, and Excel wraps rather than truncates, so no data is lost |
| Locale matches the publication | Header row in the publication's language (`t.tableHeaders`) |
| Single flat table, no blank spacer rows | One header row followed by contiguous data rows — assistive technology can traverse the range without hitting gaps |

Do **not** add a decorative title block or merged banner above the header row. Merged cells above a table break screen-reader table navigation, and the list title is already conveyed by the worksheet name and the email context.

### 12.2 The email links

Link text comes from Notify personalisation and must describe the destination and format. `Download PDF version` and `Download Excel version` are distinguishable and self-describing, satisfying 2.4.4 Link Purpose. The Notify template must **not** use "click here" or repeat identical text for both links. Because the two links sit in the same context, they must not be visually distinguished by colour alone — the differing text handles this.

### 12.3 The download pages (secondary scope)

| Requirement | Implementation |
|---|---|
| Page title matches `h1` | `t.downloadFiles.pageTitle` used for both |
| Link text states format and size | `Download this Microsoft Excel spreadsheet (14.2KB) to your device` — file type and size announced, satisfying the GOV.UK file-link pattern and 2.4.4 |
| Heading hierarchy | Single `h1`, no skipped levels |
| Keyboard operable | Plain `<a>` elements; no JavaScript required for any part of the journey (progressive enhancement) |
| Focus visible | Default GOV.UK focus styles; no custom focus overrides |
| Back link | `govuk-back-link` as the first element in `page_content` |
| Colour contrast | GOV.UK link colours only; no custom colours |
| Screen reader announcement of the new list-page link | `Download a copy of this list` is unambiguous in context; no `aria-label` override needed |

Axe-core checks must be run inline within the E2E journey test (see §13), not as a separate test.

### 12.4 What must not regress

The existing SSCS list page has an unlabelled-input risk already mitigated by a `govuk-visually-hidden` label plus `aria-label` on `#case-search-input`. Adding the download link above the table must not disturb the heading order (`h1` list title → `h2` Search Cases) — insert the link as a `<p class="govuk-body">` between the "Last updated" paragraph and the Important information `<details>`, not as a new heading.

## 13. Test Scenarios

### 13.1 Unit — `libs/list-types/sscs-daily-hearing-list/src/excel/excel-generator.test.ts`

Mock `@hmcts/list-types-common`'s `saveExcelToStorage` only; use real ExcelJS and read the generated buffer back with `workbook.xlsx.load` to assert on actual cell values. Follow AAA.

* Generates a workbook with a bold header row containing the nine English headings in the fixed PDF column order
* Generates one data row per hearing, with each of the nine values in the correct column
* Uses the Welsh headings from `cy.ts` when locale is `cy`
* Writes an empty cell when `additionalInformation` is `undefined`, and does not throw
* Produces a header-row-only workbook when the hearings array is empty, and still reports success
* Prefixes a value beginning with `=` with an apostrophe (formula-injection guard)
* Truncates a worksheet name longer than 31 characters and strips Excel-illegal characters, for the longest SSCS friendly name (Wales and South West)
* Freezes the header row (`worksheet.views` ySplit is 1)
* Calls `saveExcelToStorage` with the artefact ID and returns `{ success: true, excelPath: "<artefactId>.xlsx" }`
* Returns `{ success: false, error }` — and does not throw — when `saveExcelToStorage` rejects
* Returns `{ success: false, error }` when `jsonData` is not an array

### 13.2 Unit — `libs/list-types/common/src/excel/excel-utilities.test.ts` (extend)

* `sanitiseWorksheetName` truncates to 31 characters
* `sanitiseWorksheetName` removes each of `[ ] : * ? / \`
* `sanitiseWorksheetName` returns a short valid name unchanged

### 13.3 Unit — `libs/publication/src/processing/service.test.ts` (extend)

* `listTypeHasExcel` returns true for all eight SSCS list type names
* `generatePublicationExcel` invokes the SSCS generator and returns `{ hasExcel: true }` for an SSCS list type
* `processPublication` sets `excelPath` to `{artefactId}.xlsx` and passes it to `sendPublicationNotificationsForArtefact` for an SSCS publication
* `processPublication` still returns the PDF path and still sends notifications when the SSCS Excel generator returns `success: false` — publication is not blocked
* Existing SJP and magistrates registry behaviour is unchanged (regression guard on the registry edit)

### 13.4 Unit — `libs/notifications` (extend existing tests)

* `getSubscriptionTemplateId` returns the PDF + Excel template when a non-SJP list type has both files under 2MB
* `getSubscriptionTemplateId` returns the no-links template when the Excel is 2MB or larger, even though a PDF exists
* `buildEmailDataWithFiles` sets both `pdfBuffer` and `excelBuffer` when both blobs are present for an SSCS artefact

### 13.5 Unit — converter registration

* `hasConverterForListTypeName` returns true for all eight SSCS list type names (this currently fails for Liverpool and is the test that proves Open Question 1 has been resolved)

### 13.6 Unit — list-type reference data

* `listTypeData` contains an entry for every SSCS name registered in `EXCEL_GENERATOR_REGISTRY`, and vice versa — a parity test that prevents a registry entry from being added without the seed data, or the reverse
* Every SSCS entry in `listTypeData` has both `englishFriendlyName` and `welshFriendlyName` populated

### 13.7 Unit — page controller (secondary scope)

* `list-download-files` renders the file list with both PDF and Excel when both blobs exist
* `list-download-files` returns 400 for a malformed `artefactId`
* `list-download-files` renders 404 when neither blob exists
* `download` returns 400 for an unsupported `type`
* `download` sets `Content-Type` to the xlsx MIME type and `Content-Disposition: attachment` for `type=xlsx`
* `download` returns 403 when `canAccessPublicationData` denies access

### 13.8 Template — `sscs-daily-hearing-list.njk.test.ts` (extend, secondary scope)

Use `createTestEnvironment` and Cheerio; no AAA comments in template tests.

* Renders the download link with an href carrying the artefact ID
* Renders the Welsh link text when the `cy` locale object is used
* Does not render the download link when no `artefactId` is supplied
* Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`
* Heading order is unchanged after inserting the link (single `h1`, `h2` for Search Cases)

### 13.9 E2E — `e2e-tests/tests/` (one journey test, tagged `@nightly`)

A single test covering the whole journey — validations, Welsh and accessibility checked inline, not as separate tests:

* Sign in as an internal admin, upload an SSCS Daily Hearing List spreadsheet through `/non-strategic-upload`, confirm on the summary page, and assert the success page; then open the published list, switch to Welsh and assert the translated headings, run an Axe scan on the list page, follow the download journey, and assert that both a PDF and an `.xlsx` are offered and that the `.xlsx` downloads with the correct content type

Do not add separate E2E tests for the Welsh check, the accessibility check or each validation message.

### 13.10 Manual / UAT verification

* Confirm on STG that a published SSCS list produces both `{artefactId}.pdf` and `{artefactId}.xlsx` in the `publications` container (blob explorer at `/blob-explorer`)
* Confirm the subscription email received by a test subscriber shows both download links and that both resolve
* Open the downloaded `.xlsx` in Excel, LibreOffice and Google Sheets and confirm the header row, frozen pane and all nine columns
* Compare the `.xlsx` row-for-row against the PDF for the same artefact to evidence AC3
* Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is populated in every environment's config **before** release — if it is unset, `getSubscriptionTemplateId` throws and subscription emails for SSCS will start failing the moment the Excel file appears. This is the highest-risk deployment step in the ticket

## 14. Assumptions & Open Questions

### Open questions — need an answer before the ticket can be closed

1. **The Liverpool list type does not exist.** The issue names eight SSCS lists; the codebase defines seven. There is no `SSCS_LIVERPOOL_DAILY_HEARING_LIST` in `list-type-data.ts`, no converter registration, no PDF generator entry and no important-information text. The *location* "Liverpool Social Security and Child Support Tribunal" exists, and the North West list's observer email is `sscsa-liverpool@justice.gov.uk`. **Is Liverpool a genuinely new list type, or does Liverpool publish under the North West list?** If it is new, §6.4 applies and this ticket grows beyond "add Excel" into "add a list type" — which is arguably a separate ticket. If it is not, the issue's list of eight should be corrected to seven. *Blocking for the Liverpool acceptance criterion only; the other seven can be delivered regardless.*

2. **Observer contact email for Liverpool** (only if Q1 answers "new list type"). Every other SSCS list has a regional `importantInformationByListType` entry with a specific `@justice.gov.uk` address. Which address should Liverpool use?

3. **Does AC1 mean "downloadable from the list page" or only "downloadable from the email"?** The problem statement is explicit that the gap is *"the email notification"*, and AC4 covers the email. But AC1's "made available as downloadable options" reads as an in-page journey. §6.6 and §6.7 specify both options. **Recommendation: do §6.7** — link straight to the existing `/api/flat-file/:artefactId/download?format=excel` endpoint, which already has correct access control and container handling. §6.6 requires fixing a container bug in shared SJP code and making a fresh access-control decision for a public list type. If neither is wanted, the ticket reduces to §6.2 + §6.3 alone.

4. **Confirm the deviation from AC2** (see §6.1). This spec generates the Excel from the validated JSON rather than re-serving the admin's uploaded binary. The data is identical; the reasons for not re-serving the raw file are retention, unvalidated extra columns being published, English-only headings, and re-distributing an unscanned binary. **Does the PO accept this reading of "the uploaded excel file will be re-used"?** If they insist on the literal raw-file passthrough, the design changes materially: `non-strategic-upload-summary/index.ts` must persist the upload to `publications/{artefactId}.xlsx`, and a column-allow-list scrub plus `.xls`/`.csv` handling must be added. Estimate roughly doubles and the security review becomes non-trivial.

5. **SSCS contact phone number** for the download-files page (only if §6.6 is chosen). `0300 303 0656` is the SJP number and must not be copied blind.

6. **Welsh link text in emails.** `pdf_link_text` and `excel_link_text` are hardcoded English in `govnotify-client.ts:79,89`. This is pre-existing and affects all list types. Confirm it is raised as a separate ticket rather than absorbed here.

### Assumptions

* **No notification code changes are required.** `buildEmailDataWithFiles` already probes for `{artefactId}.xlsx` unconditionally for every list type, so producing the blob is sufficient for AC4. Verified by reading `notification-service.ts:466-496`.
* **`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is configured and its Notify template already renders both link placeholders.** It is used today by the magistrates and SJP lists. If any environment is missing it, SSCS subscription emails will throw as soon as the Excel blob appears — see §13.10.
* **`t.tableHeaders` is the right source for column headings**, rather than a new `excelColumns` block. The SSCS Excel columns match the on-screen and PDF table 1:1, so a second set of keys would be duplication that can drift.
* **All eight SSCS lists share one Excel layout.** They share one converter (`sscsConverter`), one schema, one type (`SscsDailyHearingList`) and one PDF template, so a single generator serves all of them. Only the worksheet name and header language vary.
* **The uploaded spreadsheet always contains exactly the nine configured columns.** Enforced by `SSCS_EXCEL_CONFIG` at upload time; unmapped columns are dropped during conversion and therefore cannot reach the generated Excel.
* **Third-party (`sendThirdPartyPublications`) consumers do not need the Excel.** It currently receives `pdfPath` and `flatFilePath` only. This ticket does not extend the third-party payload; no requirement in the issue suggests it should.
* **Deleting an artefact already cleans up the Excel.** `libs/publication/src/repository/queries.ts:189` deletes `{artefactId}.xlsx` from `publications`, so no new teardown is needed.
* **Excel generation stays in the background path.** It runs inside the already-detached `processPublication`, so it adds no latency to the admin's request. An ExcelJS write of a few hundred flat rows is milliseconds — far cheaper than the Chromium PDF render that already runs there.
* **2MB is not a practical constraint** for a nine-column flat sheet (roughly 20,000+ rows). No chunking or size-reduction strategy is specified, but the fallback is tested.

### Out of scope

* Retro-generating Excel files for SSCS artefacts already published before this change. Existing artefacts will continue to have PDF only until republished. If backfill is required, raise it separately — it needs a migration job that reads each JSON blob and runs the generator.
* Excel downloads for any non-SSCS list type not already covered.
* Fixing the hardcoded English Notify link text (Open Question 6).
* Fixing the `sjp-download-shared.ts` container mismatch, unless §6.6 is chosen — in which case it becomes a prerequisite, not an extra.


### Comment by OgechiOkelu on 2026-08-18T13:05:57Z

@plan 
