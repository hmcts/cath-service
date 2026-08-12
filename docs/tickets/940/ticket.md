# #940: Create additional file format for Download version of RCJ hearing lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-08-12T11:05:28Z
**Updated:** 2026-08-12T11:20:10Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the CSV download file for the  RCJ hearing lists.
**RCJ Lists:**
London Administrative Court Daily Cause List
Planning Court Daily Cause List
County Court at Central London Civil Daily Cause List
Civil Daily Cause List
Family Daily Cause List
Civil Courts at the RCJ Daily Cause List
Court of Appeal (Criminal Division) Daily Cause List 
Court of Appeal (Civil Division) Daily Cause List 
Family Division of the High Court Daily Cause List
King’s Bench Division Daily Cause List 
King’s Bench Masters Daily Cause List
Senior Courts Costs Office Daily Cause List 
Mayor & City Civil Daily Cause List

 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from

 

**ACCEPTANCE CRITERIA**
- CSV and PDF downloadable files are made available as downloadable options for all RCJ hearing lists above
- All the data fields available in the current downloadable PDF file should also be available on the CSV downloadable file
- Links to download both file types are displayed in the email notifications 

## Comments

### Comment by OgechiOkelu on 2026-08-12T11:11:26Z

@spec 

### Comment by hmctsclaudecode on 2026-08-12T11:19:31Z

# Technical Specification — Issue #940: CSV download format for RCJ hearing lists

## 1. User Story
**As a** verified user of the Court and Tribunal Hearings (CaTH) service
**I want to** download RCJ hearing lists as a CSV file as well as a PDF, from the hearing list page and from the subscription email
**So that** I can open, filter and re-use the hearing data in a spreadsheet or another system instead of reading a fixed-layout PDF

## 2. Background

Today the publication pipeline generates a **PDF only** for the RCJ list types. A second downloadable format exists in the codebase but only for four SJP list types and two Magistrates list types, and it is an **Excel (`.xlsx`)** file, not CSV:

- `libs/publication/src/processing/service.ts` — `PDF_GENERATOR_REGISTRY` (keyed by `listTypeName`) and `EXCEL_GENERATOR_REGISTRY` (`MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST`, the 4 SJP types).
- `libs/list-types/common/src/excel/excel-utilities.ts` — `saveExcelToStorage`, `sanitiseCellValue` (CSV-injection guard already exists here), `autoFitColumns`.
- `libs/publication/src/file-storage/content-type.ts` — already maps `.csv` → `text/csv`, so no content-type work is needed.
- `apps/web/src/pages/(list-types)/sjp-download-shared.ts` — `handleBlobDownload` (allow-list `pdf`, `xlsx`), `getAvailableFiles` (probes `<artefactId>.pdf` / `<artefactId>.xlsx`), `formatFileSize`, `createListDownloadFilesHandler`.
- `libs/notifications/src/govnotify/govnotify-client.ts` — `prepareUpload` for `pdf_link_to_file` and `excel_link_to_file`.
- `libs/notifications/src/govnotify/template-config.ts` — `getSubscriptionTemplateId({ isSjp, hasPdf, hasExcel, filesUnder2MB })` selects a GOV.UK Notify template ID from env vars.
- `libs/notifications/src/notification/notification-service.ts` — `buildEmailDataWithFiles()` downloads `<artefactId>.pdf` / `<artefactId>.xlsx` from blob storage and attaches them as Notify file links.

So the work is: add a **CSV** generator per RCJ list family, register it in the publication pipeline, expose it on the download route/page, and attach it as a second Notify file link.

### The 13 lists in the issue map onto 4 existing code paths

| # | List in the issue | `listTypeName` | Renderer / lib |
|---|---|---|---|
| 1 | Civil Courts at the RCJ Daily Cause List | `CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 2 | County Court at Central London Civil Daily Cause List | `COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 3 | Court of Appeal (Criminal Division) Daily Cause List | `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 4 | Family Division of the High Court Daily Cause List | `FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 5 | King's Bench Division Daily Cause List | `KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 6 | King's Bench Masters Daily Cause List | `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 7 | Mayor & City Civil Daily Cause List | `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 8 | Senior Courts Costs Office Daily Cause List | `SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST` | `@hmcts/rcj-standard-daily-cause-list` |
| 9 | London Administrative Court Daily Cause List | `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `@hmcts/london-administrative-court-daily-cause-list` |
| 10 | Planning Court Daily Cause List | *(no separate list type — see §14)* | `planningCourt` section of #9 |
| 11 | Court of Appeal (Civil Division) Daily Cause List | `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` | `@hmcts/court-of-appeal-civil-daily-cause-list` |
| 12 | Civil Daily Cause List | `CIVIL_DAILY_CAUSE_LIST` | `@hmcts/civil-daily-cause-list` → `@hmcts/daily-cause-list-common` |
| 13 | Family Daily Cause List | `FAMILY_DAILY_CAUSE_LIST` | `@hmcts/family-daily-cause-list` → `@hmcts/daily-cause-list-common` |

Lists 1–8 share one flat model (`StandardHearing[]`: `venue`, `judge`, `time`, `caseNumber`, `caseDetails`, `hearingType`, `additionalInformation`). Lists 9 and 11 use the same flat row shape but have **two sections** (`mainHearings` + `planningCourt`; `dailyHearings` + `futureJudgments`, the latter with an extra `date`). Lists 12–13 use the deep strategic JSON (`courtLists → courtHouse → courtRoom → session → sittings → hearing → case`) rendered by `@hmcts/daily-cause-list-common`.

Because each list family already has a renderer that produces exactly what the PDF template consumes, every CSV generator must build its rows from **the same renderer output** the PDF uses. That is how AC2 (field parity with the PDF) is guaranteed and kept true as the PDF evolves.

## 3. Acceptance Criteria

* **Scenario:** CSV generated on publication for an RCJ list
    * **Given** a valid JSON payload is published for any of the 13 RCJ list types in §2
    * **When** `processPublication` runs
    * **Then** a UTF-8 CSV is written to blob storage as `<artefactId>.csv` with content type `text/csv`, alongside the existing `<artefactId>.pdf`

* **Scenario:** CSV contains every field shown in the PDF
    * **Given** an RCJ artefact whose PDF renders N hearing rows across all sections
    * **When** the CSV for the same artefact is opened
    * **Then** it contains one header row plus N data rows, and every column rendered in the PDF hearing tables is present, plus the list-level values shown in the PDF header (list name, list date, last updated, data source) and the section/court-house/court-room context each row belongs to

* **Scenario:** Both download links shown on the hearing list page
    * **Given** a user is viewing an RCJ hearing list that has both files generated
    * **When** the page renders
    * **Then** a "Download this list" section shows a "Download this PDF (xxKB) to your device" link and a "Download this CSV file (xxKB) to your device" link, each with the real file size

* **Scenario:** Only the formats that exist are offered
    * **Given** CSV generation failed or the artefact predates this change
    * **When** the user views the list page
    * **Then** only the PDF link is shown, and the page renders normally with no error

* **Scenario:** Downloading the CSV
    * **Given** a user selects the CSV link for artefact `<id>`
    * **When** `GET /<list-path>/download?artefactId=<id>&type=csv` is handled
    * **Then** the response is `200` with `Content-Type: text/csv`, `Content-Disposition: attachment`, and `Cache-Control: private, no-store`

* **Scenario:** Welsh CSV
    * **Given** a Welsh-language artefact (`locale = cy`) is published
    * **When** the CSV is generated
    * **Then** the header row uses the Welsh column labels from the list type's `cy.ts` locale, and the file opens in Excel with Welsh diacritics intact (UTF-8 BOM)

* **Scenario:** Subscription email offers both formats
    * **Given** a verified user is subscribed (by location, case or list type) to one of the 13 RCJ lists
    * **When** that list is published and both files are under the 2MB Notify file limit
    * **Then** the email uses the PDF+CSV Notify template and contains a working PDF link and a working CSV link

* **Scenario:** Email degrades safely
    * **Given** the CSV is missing, or either file is 2MB or larger
    * **When** the notification is built
    * **Then** the existing template-selection rules apply (PDF-only template, or the no-links template) and the email still sends

* **Scenario:** Non-RCJ lists unchanged
    * **Given** any list type not in §2
    * **When** it is published
    * **Then** no CSV is produced and its email/page behaviour is byte-for-byte unchanged (SJP and Magistrates keep their `.xlsx`)

## 4. User Journey Flow

```
                       ┌──────────────────────────────┐
   PUBLICATION         │ Admin uploads RCJ JSON /     │
   (system)            │ API POST /publication        │
                       └───────────────┬──────────────┘
                                       ▼
                       ┌──────────────────────────────┐
                       │ processPublication()         │
                       │  1. extract search data      │
                       │  2. PDF_GENERATOR_REGISTRY   │──▶ <artefactId>.pdf
                       │  3. EXCEL_GENERATOR_REGISTRY │──▶ (not RCJ: skipped)
                       │  4. CSV_GENERATOR_REGISTRY   │──▶ <artefactId>.csv   ◀── NEW
                       │  5. send notifications       │
                       └───────────────┬──────────────┘
                                       ▼
           ┌───────────────────────────┴────────────────────────────┐
           ▼                                                        ▼
  EMAIL JOURNEY                                          WEB JOURNEY
  ┌──────────────────────────┐                    ┌──────────────────────────┐
  │ Notify email:            │                    │ /kings-bench-division-   │
  │  • Download PDF version  │                    │  daily-cause-list        │
  │  • Download CSV version  │ ◀── NEW            │  ?artefactId=<id>        │
  └────────────┬─────────────┘                    └────────────┬─────────────┘
               │ link (1 week retention)                       │ "Download this list"
               ▼                                               ▼
        File saved to device                    GET /<list-path>/download
                                                   ?artefactId=<id>&type=pdf|csv
                                                               │
                                                               ▼
                                                     File saved to device
```

## 5. Low Fidelity Wireframe

Download section added to the bottom of each RCJ hearing list page, above the "Data source" line:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings                        Cymraeg        │
├───────────────────────────────────────────────────────────────────────────┤
│  BETA  This is a new service – your feedback will help us improve it.     │
│                                                                           │
│  King's Bench Division Daily Cause List                                   │
│  Royal Courts of Justice                                                  │
│  Strand, London  WC2A 2LL                                                 │
│                                                                           │
│  List for 12 August 2026                                                  │
│  Last updated 12 August 2026 at 9:30am                                    │
│                                                                           │
│  ┌─────────┬────────┬──────┬──────────┬──────────────┬────────┬────────┐  │
│  │ Venue   │ Judge  │ Time │ Case no. │ Case details │ Hrg ty │ Add.   │  │
│  ├─────────┼────────┼──────┼──────────┼──────────────┼────────┼────────┤  │
│  │ Court 1 │ Smith J│ 10am │ KB-2026… │ A v B        │ Trial  │ —      │  │
│  │ Court 2 │ Jones J│ 2pm  │ KB-2026… │ C v D        │ Appl.  │ —      │  │
│  └─────────┴────────┴──────┴──────────┴──────────────┴────────┴────────┘  │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────    │
│  Download this list                                    ◀── NEW SECTION    │
│                                                                           │
│  Download this PDF (412.6KB) to your device                               │
│  Download this CSV file (18.3KB) to your device                           │
│                                                                           │
│  Data source: Royal Courts of Justice                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

Notification email (GOV.UK Notify plain-text/markdown template):

```
Subject: Court and tribunal hearings: King's Bench Division Daily Cause List

Dear <user name>,

A hearing list you have subscribed to has been published.

Court or tribunal: Royal Courts of Justice
Hearing list: King's Bench Division Daily Cause List
List date: 12 August 2026

Download PDF version   ← pdf_link_to_file
Download CSV version   ← csv_link_to_file   ◀── NEW

These links expire after 1 week. Sign in to the service to view the list at
any time.
```

## 6. Page Specifications

### 6.1 New / changed modules

| Path | Change |
|---|---|
| `libs/list-types/common/src/csv/csv-writer.ts` | **New.** `toCsvBuffer(headers: string[], rows: string[][]): Buffer` — RFC 4180 serialisation (CRLF, quote fields containing `,`/`"`/newline, `"` → `""`), UTF-8 BOM prefix, cells passed through the existing `sanitiseCellValue` injection guard. `saveCsvToStorage(artefactId, buffer): Promise<{ csvPath: string }>` — `uploadBlob(`${artefactId}.csv`, buffer, "text/csv", CONTAINER.PUBLICATIONS)`. Exported from `libs/list-types/common/src/index.ts`. |
| `libs/list-types/rcj-standard-daily-cause-list/src/csv/csv-generator.ts` | **New.** `generateRcjStandardDailyCauseListCsv(options)` — calls `renderStandardDailyCauseList` with the same `listTitle` from `LIST_TITLE_MAP` the PDF uses, emits one row per hearing. Covers list types 1–8. |
| `libs/list-types/london-administrative-court-daily-cause-list/src/csv/csv-generator.ts` | **New.** `generateLondonAdministrativeCourtDailyCauseListCsv` — rows from `mainHearings` then `planningCourt`, with a `Section` column ("Main hearings" / "Planning Court"). Covers list types 9 and 10. |
| `libs/list-types/court-of-appeal-civil-daily-cause-list/src/csv/csv-generator.ts` | **New.** `generateCourtOfAppealCivilDailyCauseListCsv` — rows from `dailyHearings` then `futureJudgments`, with `Section` ("Daily hearings" / "Future judgments") and the `Date` column populated for future judgments only. |
| `libs/list-types/daily-cause-list-common/src/csv/csv-generator.ts` | **New.** `generateCauseListCsv(options)` — flattens the rendered `courtLists` tree to one row per case, carrying court house / court room / judiciary / sitting context columns. Consumed by `civil-daily-cause-list` and `family-daily-cause-list`, each re-exporting a thin wrapper (`generateCivilDailyCauseListCsv`, `generateFamilyDailyCauseListCsv`) so the applicant/respondent columns present in the Family PDF are included for Family only. |
| `libs/publication/src/processing/service.ts` | `CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>>` keyed by `listTypeName` (13 entries, 4 shared generator functions), `generatePublicationCsv(params)` mirroring `generatePublicationExcel` (swallow-and-log on failure — a CSV failure must never fail the publication), `listTypeHasCsv(listTypeName)`, and `processPublication` sets `result.csvPath = `${artefactId}.csv`` then passes `csvPath` to `sendPublicationNotificationsForArtefact`. |
| `libs/notifications/src/notification/notification-service.ts` | `buildEmailDataWithFiles` also `downloadBlob(`${artefactId}.csv`)`, computes `hasCsv` / `csvUnder2MB`, folds CSV into `filesUnder2MB`, passes `csvBuffer` through `EmailTemplateData` → `sendEmail`. Applies to both the location/case path and the list-type path (both funnel through `buildEmailDataWithFiles`, so no extra plumbing). |
| `libs/notifications/src/govnotify/govnotify-client.ts` | `SendEmailParams.csvBuffer?: Buffer`; when present, `prepareUpload` → `personalisation.csv_link_to_file` and `personalisation.csv_link_text`. |
| `libs/notifications/src/govnotify/template-config.ts` | `getSubscriptionTemplateId` gains `hasCsv`. New env vars `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` and `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_CSV_ONLY`. Resolution order: no files / oversize → `NO_LINKS`; SJP excel-only → unchanged; `hasPdf && hasExcel` → unchanged; `hasPdf && hasCsv` → `..._PDF_CSV`; `hasCsv && !hasPdf` → `..._CSV_ONLY` (falls back to `NO_LINKS` if unset); else → `..._NON_SJP_PDF`. |
| `apps/web/src/pages/(list-types)/sjp-download-shared.ts` → `apps/web/src/pages/(list-types)/list-download-shared.ts` | Rename (it is no longer SJP-specific) and extend: `ALLOWED_TYPES` adds `csv`; `getAvailableFiles` probes `.csv` as well as `.pdf`/`.xlsx` and returns `{ type, url, sizeLabel }` in the order pdf → xlsx → csv. Update the four SJP import sites. |
| `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/download.ts` | **New.** `export const ROUTES` = the 8 existing RCJ standard routes each suffixed `/download`; `export const GET = handleBlobDownload`. |
| `apps/web/src/pages/(list-types)/{london-administrative-court-daily-cause-list,court-of-appeal-civil-daily-cause-list,civil-daily-cause-list,family-daily-cause-list}/download.ts` | **New.** Same handler, one file per page directory (mirroring `ROUTES` where the page declares one). |
| `apps/web/src/pages/(list-types)/download-links.njk` | **New shared partial.** Renders the "Download this list" heading and one `govuk-link` per available file. `{% include %}`d by the 13 RCJ list templates (11 `.njk` files). |
| `libs/list-types/common/src/locales/{en,cy}.ts` | New shared `downloads` block (heading + link text per file type + "to your device") so the copy is written once for all 13 lists. |
| `apps/web/.env.example`, `apps/web/helm/values.yaml`, `apps/web/helm/values.dev.yaml`, `apps/api/helm/values.yaml` | Add the two new Notify template ID env vars. |

### 6.2 Page behaviour

- Each RCJ list controller (`createSimpleListTypeHandler` / `createMultiListGuardAndRender`) additionally resolves `downloadFiles = await getAvailableFiles(artefactId, req.path)` and passes it to the template. The lookup is two `getBlobProperties` HEAD calls in parallel — no file bodies are fetched.
- The partial renders nothing at all when `downloadFiles` is empty, so historical artefacts with neither file generated are unaffected.
- No new authorisation: the download route is reachable only for an artefact the user could already view, and `handleBlobDownload` serves a file whose content is the same data already rendered on the page. The SJP verified-user disclaimer gate is deliberately **not** applied here (see §14).

### 6.3 CSV structure

Column order for list families 1–8 / 9–10 / 11 (flat `StandardHearing` shape):

| Col | Header (en) | Source |
|---|---|---|
| 1 | List name | `renderedData.header.listTitle` |
| 2 | List date | `renderedData.header.listDate` |
| 3 | Last updated | `header.lastUpdatedDate` + `header.lastUpdatedTime` |
| 4 | Data source | `PROVENANCE_LABELS[provenance]` |
| 5 | Section | *(lists 9–11 only)* `Main hearings` / `Planning Court` / `Daily hearings` / `Future judgments` |
| 6 | Date | *(list 11 only)* `futureJudgments[].date` |
| 7 | Venue | `hearing.venue` |
| 8 | Judge | `hearing.judge` |
| 9 | Time | `hearing.time` |
| 10 | Case number | `hearing.caseNumber` |
| 11 | Case details | `hearing.caseDetails` |
| 12 | Hearing type | `hearing.hearingType` |
| 13 | Additional information | `hearing.additionalInformation` |

Column order for lists 12–13 (strategic cause lists), matching the PDF table plus its section context:

`List name`, `List date`, `Last updated`, `Data source`, `Court house`, `Court house address`, `Court room`, `Judiciary`, `Time`, `Case reference`, `Case name`, `Case type`, `Hearing type`, `Location`, `Duration`, `Applicant` *(Family only)*, `Respondent` *(Family only)*, `Reporting restrictions`.

Rules:
- Header labels come from the list type's existing locale `tableHeaders` / PDF label keys, so Welsh headers need **no new translations** for the data columns.
- Empty values are written as empty fields, never `null` / `undefined` / `-`.
- Multi-line PDF cell content (e.g. `additionalInformation`) keeps its newlines inside a quoted field.
- Lists with zero hearings still produce a valid CSV: header row only.

## 7. Content

New copy (the only new strings — data column headers reuse existing translated keys).

`libs/list-types/common/src/locales/en.ts`:
```ts
downloads: {
  heading: "Download this list",
  downloadPdfLink: "Download this PDF",
  downloadCsvLink: "Download this CSV file",
  downloadExcelLink: "Download this Microsoft Excel spreadsheet",
  toDevice: "to your device"
}
```

`libs/list-types/common/src/locales/cy.ts`:
```ts
downloads: {
  heading: [WELSH TRANSLATION REQUIRED: "Download this list"],
  downloadPdfLink: [WELSH TRANSLATION REQUIRED: "Download this PDF"],
  downloadCsvLink: [WELSH TRANSLATION REQUIRED: "Download this CSV file"],
  downloadExcelLink: [WELSH TRANSLATION REQUIRED: "Download this Microsoft Excel spreadsheet"],
  toDevice: [WELSH TRANSLATION REQUIRED: "to your device"]
}
```

Section labels used in the CSV `Section` column — `libs/list-types/london-administrative-court-daily-cause-list/src/locales/{en,cy}.ts` and `libs/list-types/court-of-appeal-civil-daily-cause-list/src/locales/{en,cy}.ts` (reuse the existing `planningCourtTitle` / `futureJudgmentsTitle` keys where they already exist; add only what is missing):

```ts
// en
csvSections: { mainHearings: "Main hearings", planningCourt: "Planning Court" }
csvSections: { dailyHearings: "Daily hearings", futureJudgments: "Future judgments" }

// cy
csvSections: { mainHearings: [WELSH TRANSLATION REQUIRED: "Main hearings"], planningCourt: [WELSH TRANSLATION REQUIRED: "Planning Court"] }
csvSections: { dailyHearings: [WELSH TRANSLATION REQUIRED: "Daily hearings"], futureJudgments: [WELSH TRANSLATION REQUIRED: "Future judgments"] }
```

GOV.UK Notify personalisation (set in `govnotify-client.ts`, English only — Notify templates are per-language and the Welsh template supplies its own body copy):
```
csv_link_text: "Download CSV version"
```

Notify template body copy to be created in the Notify console by the content designer, for both the English and Welsh PDF+CSV templates (mirroring the wording of the existing PDF+Excel template):
```
((pdf_link_to_file))   labelled "Download PDF version"
((csv_link_to_file))   labelled "Download CSV version"
```

Link text rendered on the page is composed as `{{ linkText }} ({{ file.sizeLabel }}) {{ toDevice }}` — e.g. "Download this CSV file (18.3KB) to your device" — matching the established SJP download-files wording.

## 8. URL

No new page URLs. One new download endpoint per existing RCJ list route:

| Existing page route | New download route |
|---|---|
| `/civil-courts-rcj-daily-cause-list` | `/civil-courts-rcj-daily-cause-list/download` |
| `/county-court-central-london-civil-daily-cause-list` | `…/download` |
| `/court-of-appeal-criminal-division-daily-cause-list` | `…/download` |
| `/family-division-high-court-daily-cause-list` | `…/download` |
| `/kings-bench-division-daily-cause-list` | `…/download` |
| `/kings-bench-masters-daily-cause-list` | `…/download` |
| `/mayor-city-civil-daily-cause-list` | `…/download` |
| `/senior-courts-costs-office-daily-cause-list` | `…/download` |
| `/london-administrative-court-daily-cause-list` | `…/download` |
| `/court-of-appeal-civil-division-daily-cause-list` | `…/download` |
| `/civil-daily-cause-list` | `…/download` |
| `/family-daily-cause-list` | `…/download` |

Query string: `?artefactId=<uuid>&type=pdf|csv`.

Blob storage keys (container `PUBLICATIONS`): `<artefactId>.pdf`, `<artefactId>.csv`.

## 9. Validation

Download route (`handleBlobDownload`, existing logic extended):
- `artefactId` required and must match `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` → else `400`.
- `type` required and must be in `{pdf, xlsx, csv}` → else `400`. The allow-list is what prevents path traversal into other blobs; the blob key is only ever `<uuid>.<allow-listed-ext>`.
- Blob missing → `404`.

CSV generation:
- Only runs for a `listTypeName` present in `CSV_GENERATOR_REGISTRY`; unknown names are a no-op, not an error.
- Runs after JSON schema validation has already passed upstream (`validateListTypeJson`) — the generator does not re-validate, but must tolerate optional/missing fields by writing empty cells.
- Every cell is passed through `sanitiseCellValue` before serialisation: a leading `=`, `+`, `-` or `@` is prefixed with `'` to block formula injection in Excel/Sheets.
- Fields are quoted when they contain `,`, `"`, `\r` or `\n`; embedded `"` is doubled.
- A generation failure is logged and swallowed — the publication, the PDF and the notification must still succeed.

Notification:
- CSV attached only when the buffer exists and `length < MAX_PDF_SIZE_BYTES` (2MB, the GOV.UK Notify per-file limit).
- Both new env vars must be validated at use time with the existing "environment variable is not set" throw pattern, except `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_CSV_ONLY`, which falls back to `NO_LINKS` when unset.

## 10. Error Messages

No new user-facing error copy. Existing behaviour applies:

| Condition | Response |
|---|---|
| Missing/invalid `artefactId` or `type` on the download route | `400` JSON `{ "error": "Invalid request" }` (existing `handleBlobDownload` behaviour) |
| Requested file not in blob storage | `404` JSON `{ "error": "File not found" }` |
| Missing `artefactId` on the list page | `400` `errors/common` — "There is a problem with the service" / "Missing artefactId parameter" (existing) |
| Artefact not found or not accessible | existing `404` / `errors/common` render from `createSimpleListTypeHandler` |
| CSV generation failed | No user-facing error. Logged as `[Publication] CSV generation failed: { artefactId, error }`; the page and email simply omit the CSV link |
| Notify rejects the CSV upload | Existing notification retry/`Failed` audit path; error string logged with email addresses redacted |

## 11. Navigation

- The download links sit at the bottom of the list page content, above the "Data source" line; they do not replace or move any existing element.
- Selecting a link triggers a file download in place (`Content-Disposition: attachment`) — the user stays on the hearing list page, so no back-link or return-to logic is needed.
- No interstitial or disclaimer page is introduced for RCJ lists (unlike SJP, which routes `list-download-disclaimer` → `list-download-files` → `download`).
- Email links point at GOV.UK Notify's document-download service with 1-week retention and `confirmEmailBeforeDownload: false`, consistent with the existing PDF links.
- `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate` is retained on downloads so files are not cached by shared proxies.

## 12. Accessibility

- Links, not buttons: a download that navigates to a file is a link (`class="govuk-link"`), inside a `<p class="govuk-body">`, under an `<h2 class="govuk-heading-m">`.
- Link text is self-describing out of context and states format and size — "Download this CSV file (18.3KB) to your device" — meeting WCAG 2.2 AA 2.4.4 (Link Purpose) and the GDS guidance to warn users about file type and size before they select.
- The new `<h2>` continues the existing heading hierarchy (page `<h1>`, section `<h2>`); no heading levels are skipped.
- No `aria-label` overrides and no `title` attributes: the visible text is the accessible name.
- No icons, no colour-only signalling; the file format is conveyed in text.
- Links are in the natural DOM order at the end of the content region, so keyboard order is correct with no `tabindex`; the default GOV.UK focus style is untouched.
- Target size is met by default GOV.UK link line-height and body spacing (WCAG 2.2 AA 2.5.8).
- Welsh: the section renders from the `cy` locale when `res.locals.locale === "cy"`; the CSV header row is generated in the artefact's language so the downloaded file matches the page.
- CSV itself: single header row and no merged/blank spacer rows, so screen readers and assistive spreadsheet tooling can associate every cell with a column header.
- Axe checks run inline in the E2E journeys (§13), not as separate tests.

## 13. Test Scenarios

Unit (Vitest, co-located, AAA):
* `toCsvBuffer` quotes fields containing commas, quotes and newlines, doubles embedded quotes, terminates rows with CRLF and prefixes the UTF-8 BOM.
* `toCsvBuffer` prefixes `'` to cells beginning `=`, `+`, `-` or `@`, and leaves other cells untouched.
* `saveCsvToStorage` uploads to key `<artefactId>.csv` with content type `text/csv` into the publications container.
* RCJ standard CSV generator emits one row per hearing, with the column set and order specified in §6.3, for each of the 8 list types (list title resolved from `listTypeName`, never a numeric id).
* RCJ standard CSV generator returns a header-only file for an empty hearing list, and reports failure without throwing when the renderer throws.
* London Administrative CSV generator emits `Main hearings` rows followed by `Planning Court` rows, with the section label taken from the locale.
* Court of Appeal (Civil) CSV generator populates the `Date` column for future judgments only and leaves it empty for daily hearings.
* Civil and Family cause list CSV generators flatten the `courtLists` tree to one row per case, carry court house / court room / judiciary / sitting context, include reporting restrictions, and include applicant/respondent for Family only.
* Welsh generation produces the Welsh header row for every generator, and the English one for `locale = "en"`.
* Field-parity guard: for each list family, the CSV header set is asserted to cover every data field the PDF template renders — this is the test that protects AC2 as templates change.
* `generatePublicationCsv` returns `{}` and logs for a list type not in the registry; returns `{ hasCsv: true }` on success; swallows and logs generator errors.
* `processPublication` sets `csvPath` for an RCJ list type, leaves it undefined for a non-RCJ list type, and still returns the PDF path when CSV generation fails.
* `getSubscriptionTemplateId` returns the PDF+CSV template for `hasPdf && hasCsv`, the CSV-only template for `hasCsv && !hasPdf`, the existing PDF+Excel template for SJP/Magistrates, and `NO_LINKS` when nothing is under 2MB — with a test per new env var throwing when unset.
* `buildEmailDataWithFiles` attaches a CSV buffer under 2MB, omits one at/over 2MB, and does not attach when the blob is absent.
* `govnotify-client` sets `csv_link_to_file` and `csv_link_text` when `csvBuffer` is supplied, and omits both when it is not.
* `handleBlobDownload` accepts `type=csv`, rejects an unknown type with `400`, rejects a non-UUID `artefactId` with `400`, returns `404` for a missing blob, and sets `text/csv` plus the attachment and no-store headers on success.
* `getAvailableFiles` returns pdf-only, csv-only, both, or an empty array according to which blobs exist.
* Each of the 12 RCJ page controllers passes `downloadFiles` to the template.
* Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()` for every touched locale file.

Template (`*.njk.test.ts`, Cheerio, structural assertions):
* The download partial renders one link per available file with the correct `href`, and the size and format in the link text.
* The partial renders no heading and no links when `downloadFiles` is empty.
* The partial renders the Welsh heading and Welsh link text when rendered with the `cy` locale object.

E2E (Playwright, `e2e-tests/tests/`, one journey per list family, tagged `@nightly`):
* Verified user journey — RCJ standard list: publish a fixture artefact, open the list page, assert both download links appear with sizes, download the CSV and assert the header row and a known case number are present, switch to Welsh and assert the Welsh heading and link text, run an inline Axe scan, and confirm keyboard access to the links.
* Verified user journey — strategic cause list (Family): same journey, additionally asserting the applicant/respondent columns in the downloaded CSV.
* Subscription notification journey: subscribe to an RCJ list type, publish, and assert via the Notify stub that the email used the PDF+CSV template with both file-link personalisations set.

## 14. Assumptions & Open Questions

* **"Planning Court Daily Cause List" is not a separate list type.** There is no `PLANNING_COURT_*` entry in `libs/list-types/common/src/list-type-data.ts`; Planning Court is the `planningCourt` array inside `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (`LondonAdminCourtData = { mainHearings, planningCourt }`). **Assumption:** covering it as a `Section` in the London Administrative CSV satisfies the AC. Confirm with the BA — if Planning Court is meant to become its own published list type, that is a separate ticket and this spec's item 10 drops out.
* **"Civil Daily Cause List" is read as `CIVIL_DAILY_CAUSE_LIST`.** Note the ambiguity: `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST`'s PDF title is also literally "Civil Daily Cause List" in `LIST_TITLE_MAP`. Both list types are in scope here, so the reading does not change delivery — but the duplicate display title is worth flagging to the content designer.
* **CSV, not Excel.** The issue says CSV, so this adds a third format alongside the existing `.xlsx` path rather than reusing it. SJP and Magistrates keep Excel and gain nothing here. If the product intent is really "a spreadsheet format" and consistency with SJP matters more than CSV specifically, say so now — reusing `EXCEL_GENERATOR_REGISTRY` would be materially less work (no new Notify templates, no new download type).
* **Two new GOV.UK Notify templates (English and Welsh) must be created before deployment**, and their IDs added to `apps/web/helm/values*.yaml` and `apps/api/helm/values.yaml`. Until `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` is set, RCJ notifications with a CSV present would throw on template resolution — so the code must be deployed with the env var configured, or gated to fall back to the PDF-only template when unset. **Recommendation:** fall back to the PDF-only template when unset, so a missing config degrades instead of breaking notifications.
* **No verified-user disclaimer gate for RCJ downloads.** SJP downloads sit behind a `requireVerified` middleware and a terms-and-conditions page because SJP lists contain personal protected data. RCJ list pages are already viewable by whoever passes `canAccessPublicationData`, and the CSV contains nothing the page does not already display, so a gate would be inconsistent. Confirm with the service owner — if a gate is wanted, the SJP `list-download-disclaimer` / `list-download-files` pattern can be reused, but it adds 2 pages × 12 routes.
* **List metadata is repeated on every CSV row** (list name, list date, last updated, data source) rather than emitted as a preamble block, to keep the file a single parseable table. This is what makes "all the data fields in the PDF are in the CSV" literally true. Static PDF narrative content — "Important information", open-justice notices, media contact addresses, court address — is **not** included, as it is guidance rather than hearing data. Confirm this reading of AC2.
* **Downloaded filename is `<artefactId>.csv`**, inherited from the existing shared handler. That is opaque for users saving files. A friendlier `<list-slug>-<yyyy-mm-dd>.csv` is a small change to `handleBlobDownload` but also changes SJP's PDF/Excel filenames. Raise separately unless the BA wants it in this ticket.
* **Existing artefacts are not backfilled.** CSVs appear only for artefacts published after release; older RCJ artefacts show the PDF link only. Confirm no backfill is required, or raise a follow-up for a one-off regeneration job.
* **Third-party push is out of scope.** `sendThirdPartyPublications` receives `pdfPath` and `flatFilePath` only; no CSV is pushed to third parties.
* **CSV file size is expected to stay well under the 2MB Notify limit** (a plain-text table of a daily cause list is tens of KB), so the CSV should not be the reason an email falls back to the no-links template. Worth monitoring for the largest strategic lists after release.


### Comment by OgechiOkelu on 2026-08-12T11:20:10Z

@plan 
