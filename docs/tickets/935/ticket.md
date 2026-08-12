# #935: Create additional file formats for Download version of the Upper Tribunal hearing lists

**State:** OPEN
**Assignees:** 
**Author:** OgechiOkelu
**Labels:** enhancement, epic:public-journey
**Created:** 2026-08-12T08:27:25Z
**Updated:** 2026-08-12T09:00:39Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the CSV download file for the Upper Tribunal hearing lists. 
**Upper Tribunal hearing lists**
Upper Tribunal (Tax and Chancery Chamber) Daily hearing list
Upper Tribunal (Lands Chamber) Daily hearing list
Upper Tribunal (Immigration and Asylum) Chamber - Statutory Appeal: Daily hearing list
Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Daily hearing list
Upper Tribunal (Administrative Appeals Chamber) Daily hearing list

 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from

 

**ACCEPTANCE CRITERIA**
- CSV and PDF downloadable files are made available as downloadable options for all the Upper Tribunal hearing lists
- All the data fields available in the current downloadable PDF file should also be available on the CSV downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-08-12T08:43:07Z

@SPEC

### Comment by hmctsclaudecode on 2026-08-12T08:54:47Z

# Technical Specification — Issue #935: Additional download file formats for Upper Tribunal hearing lists

## 1. User Story

**As a** CaTH verified user subscribed to an Upper Tribunal hearing list
**I want to** download the published list as a CSV file as well as a PDF, from both the hearing list page and the subscription email
**So that** I can work with the hearing data in a spreadsheet or my own tooling instead of re-typing it out of a PDF

## 2. Background

Today, every Upper Tribunal (UT) list type generates exactly one downloadable artefact: a PDF, produced at publication time by `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (lines 276–314) and stored in Azure Blob Storage as `<artefactId>.pdf` in the `publications` container (`savePdfToStorage`, `libs/list-types/common/src/pdf/pdf-utilities.ts:32`).

A second-format pipeline already exists, but only for SJP and Magistrates lists: `EXCEL_GENERATOR_REGISTRY` (same file, lines 361–384) writes `<artefactId>.xlsx`, `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:456`) picks it up by convention from the artefact ID, and `getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:15`) selects a GOV.UK Notify template that renders both `pdf_link_to_file` and `excel_link_to_file` personalisation. There is **no CSV generation anywhere in the publication pipeline** — the only CSV code in the repo is the unrelated reference-data admin download (`libs/system-admin-pages/src/reference-data-upload/services/download-service.ts`, which uses `papaparse`).

This ticket adds a third format — CSV — and wires it through the same three surfaces the PDF already uses: blob storage, the subscription email, and the public hearing list page.

**Nine list type names are in scope** (five list families named in the ticket; the UTIAC Judicial Review family is five separate list types, one per hearing centre):

| Ticket list | `listTypeName` (stable key — never use `listTypeId`) | Lib |
|---|---|---|
| UT (Tax and Chancery Chamber) Daily | `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list` |
| UT (Lands Chamber) Daily | `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list` |
| UT (Administrative Appeals Chamber) Daily | `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list` |
| UTIAC — Statutory Appeal Daily | `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `libs/list-types/utiac-statutory-appeal-daily-hearing-list` |
| UTIAC — Judicial Review Daily | `UTIAC_JR_LONDON_DAILY_HEARING_LIST`, `UTIAC_JR_LEEDS_DAILY_HEARING_LIST`, `UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST`, `UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST`, `UTIAC_JR_CARDIFF_DAILY_HEARING_LIST` | `libs/list-types/utiac-jr-daily-hearing-list` |

All nine are `defaultSensitivity: "Public"` and `isNonStrategic: true` (`libs/list-types/common/src/list-type-data.ts`). Because they are public, the download does **not** need the verified-user sign-in gate or the terms-and-conditions disclaimer interstitial that SJP uses (`apps/web/src/pages/(list-types)/sjp-press-list/list-download-disclaimer.ts`) — that gate exists because SJP lists are `Classified` and carry Special Category Data.

The PDF's data columns per list type (source of truth for the CSV, per AC 2) are the `<thead>` columns of each `pdf-template.njk`:

| `listTypeName` | Column order (field names, PDF order) |
|---|---|
| `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `time`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `hearingType`, `venue`, `additionalInformation` |
| `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `time`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `hearingType`, `venue`, `modeOfHearing`, `additionalInformation` |
| `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `time`, `appellant`, `caseReferenceNumber`, `judges`, `members`, `modeOfHearing`, `venue`, `additionalInformation` |
| `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `hearingTime`, `appellant`, `representative`, `appealReferenceNumber`, `judges`, `hearingType`, `location`, `additionalInformation` |
| `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | `hearingTime`, `caseTitle`, `representative`, `caseReferenceNumber`, `judges`, `hearingType`, `location`, `additionalInformation` |
| `UTIAC_JR_LEEDS` / `_MANCHESTER` / `_BIRMINGHAM` / `_CARDIFF` `_DAILY_HEARING_LIST` | `venue`, `judges`, `hearingTime`, `caseReferenceNumber`, `caseTitle`, `hearingType`, `additionalInformation` |

## 3. Acceptance Criteria

* **Scenario:** CSV is generated at publication time for every in-scope UT list type
    * **Given** a valid JSON publication is received for any of the nine UT `listTypeName` values
    * **When** `processPublication` runs
    * **Then** a `<artefactId>.csv` blob is written to the `publications` container with content type `text/csv`, alongside the existing `<artefactId>.pdf`, and the artefact's `csvPath` is returned in the processing result

* **Scenario:** CSV contains every data field the PDF contains
    * **Given** a UT publication whose PDF renders N hearing rows across M columns
    * **When** the CSV for the same artefact is opened
    * **Then** it has exactly one header row plus N data rows, and exactly M columns in the same left-to-right order as the PDF table, with identical cell values (same renderer output, so identical time/date formatting)

* **Scenario:** CSV header row follows the publication language
    * **Given** a UT publication published with `language: WELSH` (`locale: "cy"`)
    * **When** the CSV is generated
    * **Then** the header row uses the Welsh `tableHeaders` strings from the list type's `cy.ts`, and the file is UTF-8 with a byte order mark so accented Welsh characters render correctly when opened in Excel

* **Scenario:** Subscription email offers both formats
    * **Given** a verified user is subscribed (by location, case or list type) to a UT hearing list
    * **And** both the PDF and CSV for the published artefact exist and are each under 2MB
    * **When** the publication notification is sent
    * **Then** the email contains a "Download PDF version" link and a "Download CSV version" link, both served by the GOV.UK Notify document-download service

* **Scenario:** Email degrades safely when a format is missing or oversized
    * **Given** the CSV is missing, or is 2MB or larger
    * **When** the notification is sent
    * **Then** the email is still sent using the PDF-only template with no CSV link, and no error is surfaced to the user

* **Scenario:** Both formats are downloadable from the hearing list page
    * **Given** any user (signed in or not) views a published UT hearing list page
    * **When** the page renders
    * **Then** a "Download this list" section shows one link per available format, each labelled with its file type and size, and each link downloads the file with `Content-Disposition: attachment`

* **Scenario:** Download section is hidden when no files exist
    * **Given** a UT artefact for which neither a PDF nor a CSV blob exists (e.g. generation failed)
    * **When** the page renders
    * **Then** the download section is not rendered at all, and the rest of the page renders normally

* **Scenario:** Expired or unknown artefacts cannot be downloaded
    * **Given** a download request for an artefact ID that does not exist, is malformed, or is outside its `displayFrom`–`displayTo` window
    * **When** the request is made
    * **Then** the service responds 400 (malformed), 404 (unknown / no such file) or 410 (expired) and no file bytes are returned

## 4. User Journey Flow

Two independent journeys share one generated CSV artefact.

**Journey A — email subscriber**

```
Publication received (JSON, UT list type)
        │
        ▼
processPublication
        ├─► generatePublicationPdf   ──►  publications/<artefactId>.pdf
        ├─► generatePublicationExcel ──►  (no-op: UT lists not in Excel registry)
        └─► generatePublicationCsv   ──►  publications/<artefactId>.csv     ◄── NEW
        │
        ▼
sendPublicationNotificationsForArtefact
        │
        ▼
buildEmailDataWithFiles  ── downloads .pdf + .xlsx + .csv by artefactId
        │                    filters each to < 2MB
        ▼
getSubscriptionTemplateId({ hasPdf, hasExcel, hasCsv, filesUnder2MB })
        │
        ▼
sendEmail  ── prepareUpload(pdfBuffer) → pdf_link_to_file
             prepareUpload(csvBuffer) → csv_link_to_file                   ◄── NEW
        │
        ▼
Subscriber receives email with two download links
        │
        ├─► clicks "Download PDF version"  → Notify document service → PDF
        └─► clicks "Download CSV version"  → Notify document service → CSV
```

**Journey B — hearing list page**

```
User lands on a UT hearing list page
  /upper-tribunal-lands-chamber-daily-hearing-list?artefactId=<uuid>
        │
        ▼
Controller resolves artefact, validates JSON, renders table
  + probes blob storage for <artefactId>.pdf and <artefactId>.csv           ◄── NEW
  + passes downloadFiles[] (type, url, sizeLabel) to the template
        │
        ▼
Page renders "Download this list" section with 1–2 links
        │
        ▼
User clicks a link  →  GET /list-download?artefactId=<uuid>&type=csv        ◄── NEW
        │
        ▼
Handler: validate uuid + type → check artefact exists and is in display
         window → check access → stream blob as attachment
        │
        ▼
Browser saves the file (no page navigation)
```

## 5. Low Fidelity Wireframe

**Hearing list page — new download section (placed directly beneath the "List for …/Last updated …" block, above the "Important information" details component)**

```
┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                    English|Cymraeg│
├──────────────────────────────────────────────────────────────────────┤
│  BETA  This is a new service – your feedback will help us improve it. │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Upper Tribunal (Lands Chamber) Daily Hearing List                   │
│  ═══════════════════════════════════════════════════                 │
│                                                                      │
│  Find contact details and other information about courts and         │
│  tribunals in England and Wales, and some non-devolved tribunals     │
│  in Scotland.                                                        │
│                                                                      │
│  List for 12 August 2026                                             │
│  Last updated 12 August 2026 at 9:15am                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Download this list                    ◄── NEW (h2, heading-m)  │  │
│  │                                                                │  │
│  │ • Download this list as a PDF (94.2KB)                         │  │
│  │ • Download this list as a CSV (3.1KB)                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ▼ Important information                                             │
│                                                                      │
│  Search Cases                                                        │
│  [___________________________]                                       │
│                                                                      │
│  ┌──────┬────────────┬──────────┬────────┬─────────┬──────────────┐  │
│  │ Time │ Case ref   │ Case name│ Judge(s)│ Member(s)│ ...         │  │
│  ├──────┼────────────┼──────────┼────────┼─────────┼──────────────┤  │
│  │10:30 │ LC-2026-01 │ Smith v X│ HHJ Ray │ Mr Patel │ ...         │  │
│  └──────┴────────────┴──────────┴────────┴─────────┴──────────────┘  │
│                                                                      │
│  Data source: Manual Upload                                          │
│  Back to top                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

**Subscription email (GOV.UK Notify template — PDF + CSV variant)**

```
┌──────────────────────────────────────────────────────────────────────┐
│ Subject: Court and tribunal hearings update                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ The following hearing list has been published:                       │
│                                                                      │
│ Upper Tribunal (Lands Chamber) Daily Hearing List                    │
│ Royal Courts of Justice                                              │
│ 12 August 2026                                                       │
│                                                                      │
│ Download the list:                                                   │
│   Download PDF version        ◄── existing (pdf_link_to_file)        │
│   Download CSV version        ◄── NEW      (csv_link_to_file)        │
│                                                                      │
│ These links will expire after 1 week.                                │
│                                                                      │
│ Sign in to the service to manage your email subscriptions.           │
└──────────────────────────────────────────────────────────────────────┘
```

**CSV file shape (UT Lands Chamber, English publication)**

```
Time,Case reference number,Case name,Judge(s),Member(s),Hearing type,Venue,Mode of hearing,Additional information
10:30am,LC-2026-0001,Smith v Highways England,HHJ Ramsey,"Mr A Patel, Ms B Cole",Substantive,Court 12,In person,Time estimate 2 days
11:00am,LC-2026-0002,"Jones, R v Network Rail",HHJ Ramsey,Mr A Patel,Case management,Court 12,Remote - video,
```

## 6. Page Specifications

### 6.1 New shared CSV utilities — `libs/list-types/common/src/csv/csv-utilities.ts`

Mirrors `pdf-utilities.ts` / `excel-utilities.ts` so all nine list types share one implementation.

```ts
export const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // GOV.UK Notify per-file limit

export interface CsvColumn {
  headerKey: string;   // key into the locale's tableHeaders object
  fieldName: string;   // key on the rendered hearing row
}

export interface CsvGenerationResult {
  success: boolean;
  csvPath?: string;
  sizeBytes?: number;
  exceedsMaxSize?: boolean;
  error?: string;
}

export function buildCsvBuffer(rows: Record<string, unknown>[], columns: CsvColumn[], headers: Record<string, string>): Buffer;
export async function saveCsvToStorage(artefactId: string, buffer: Buffer): Promise<CsvGenerationResult>;
export function createCsvErrorResult(error: unknown): CsvGenerationResult;
```

Behaviour:

- `buildCsvBuffer` maps each rendered hearing to an object keyed by the resolved header string, in `columns` order, then calls `Papa.unparse(data, { columns: headerStrings })`. `papaparse@5.5.4` and `@types/papaparse@5.5.2` are added to `libs/list-types/common/package.json` (already pinned at those versions in `libs/system-admin-pages/package.json` — reuse the same versions, do not introduce a second).
- Every cell is coerced with `String(value ?? "")` then passed through the existing `sanitiseCellValue` from `../excel/excel-utilities.js` (prefixes `=`, `+`, `-`, `@` with an apostrophe) so the CSV has the same formula-injection protection as the Excel path. Do not duplicate that function.
- Output is prefixed with a UTF-8 BOM (`﻿`) so Excel renders Welsh diacritics (`â`, `ŵ`, `ŷ`) correctly.
- `saveCsvToStorage` uploads `<artefactId>.csv` with content type `text/csv` to `CONTAINER.PUBLICATIONS` and returns `{ success: true, csvPath, sizeBytes, exceedsMaxSize }`. `.csv → text/csv` is already in `CONTENT_TYPE_MAP` (`libs/publication/src/file-storage/content-type.ts:7`) — no change needed there.
- Exports added to `libs/list-types/common/src/index.ts`.

### 6.2 Shared CSV generator factory — `libs/list-types/common/src/csv/csv-generator-factory.ts`

```ts
export interface CsvGenerationOptions<T> {
  artefactId: string;
  locale: string;
  contentDate: Date;
  jsonData: T;
}

export function createDailyHearingListCsvGenerator<T, R>(
  renderFn: (data: T, options: { locale: string; contentDate: Date; lastReceivedDate: string; listTitle: string; courtName?: string }) => { hearings: R[] },
  columns: CsvColumn[],
  importEn: () => Promise<{ en: Record<string, unknown> }>,
  importCy: () => Promise<{ cy: Record<string, unknown> }>
): (options: CsvGenerationOptions<T>) => Promise<CsvGenerationResult>;
```

The factory reuses the **same `renderFn` the PDF generator uses** (e.g. `renderUtccDailyHearingListData`) and takes `.hearings` from its output. This is what guarantees AC 2 (field parity) and identical formatting — there is no second formatting code path to drift. Headers come from `loadTranslations(locale, importEn, importCy).tableHeaders`, the same call the PDF generators make.

### 6.3 Per-list-type CSV generators

One small file per lib, no logic:

| File | Export |
|---|---|
| `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtccDailyHearingListCsv` |
| `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtlcDailyHearingListCsv` |
| `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtaacDailyHearingListCsv` |
| `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtiacStatutoryAppealDailyHearingListCsv` |
| `libs/list-types/utiac-jr-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtiacJrDailyHearingListCsv` (Leeds/Manchester/Birmingham/Cardiff shape) and `generateUtiacJrLondonDailyHearingListCsv` (London shape) |

Each declares its `CsvColumn[]` using the exact PDF column order in §2, and is exported from the lib's `src/index.ts`. Column arrays are the only per-list-type code.

### 6.4 Publication pipeline — `libs/publication/src/processing/service.ts`

Add, mirroring the existing Excel block (lines 338–414):

```ts
type CsvGenerator = (params: GenerateCsvParams) => Promise<CsvGeneratorResult>;

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = {
  UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST: (p) => generateUtccDailyHearingListCsv({ ...p, jsonData: p.jsonData as UtccHearingList }),
  UT_LANDS_CHAMBER_DAILY_HEARING_LIST: (p) => generateUtlcDailyHearingListCsv({ ...p, jsonData: p.jsonData as UtlcHearingList }),
  UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST: (p) => generateUtaacDailyHearingListCsv({ ...p, jsonData: p.jsonData as UtaacHearingList }),
  UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST: (p) => generateUtiacStatutoryAppealDailyHearingListCsv({ ...p, jsonData: p.jsonData as UtiacStatutoryAppealHearingList }),
  UTIAC_JR_LONDON_DAILY_HEARING_LIST: (p) => generateUtiacJrLondonDailyHearingListCsv({ ...p, jsonData: p.jsonData as UtiacJrLondonHearingList }),
  UTIAC_JR_LEEDS_DAILY_HEARING_LIST: utiacJrCsvGenerator,
  UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST: utiacJrCsvGenerator,
  UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST: utiacJrCsvGenerator,
  UTIAC_JR_CARDIFF_DAILY_HEARING_LIST: utiacJrCsvGenerator
};

export function listTypeHasCsv(listTypeName: string | undefined): boolean;
export async function generatePublicationCsv(params: GenerateCsvParams): Promise<CsvGenerationResult>;
```

`processPublication` gains a third generation step after the Excel step, keyed on `pdfResult.listTypeName` (already resolved from the DB by `generatePublicationPdf`, so no extra query), and sets `result.csvPath = `${artefactId}.csv``. Failures are logged with `console.warn`/`console.error` and swallowed, exactly as the Excel step does — **a CSV failure must never block the PDF, the notifications or the third-party push.**

`ProcessPublicationResult` gains `csvPath?: string`.

### 6.5 Notifications — `libs/notifications`

- `SendEmailParams` (`govnotify/govnotify-client.ts:32`) gains `csvBuffer?: Buffer`. When present, `prepareUpload(csvBuffer, { confirmEmailBeforeDownload: false, retentionPeriod: "1 week" })` sets `personalisation.csv_link_to_file` and `personalisation.csv_link_text`.
- `getSubscriptionTemplateId` (`govnotify/template-config.ts:15`) gains `hasCsv: boolean`. New branch, evaluated before the existing `hasPdf && hasExcel` branch: `hasPdf && hasCsv` → `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`. Throw the same "environment variable is not set" error if unset. Existing branches and their ordering are unchanged, so SJP/Magistrates behaviour is untouched.
- `buildEmailDataWithFiles` (`notification/notification-service.ts:456`) additionally does `downloadBlob(`${artefactId}.csv`, CONTAINER.PUBLICATIONS)`, applies the same `< MAX_PDF_SIZE_BYTES` filter, and feeds `hasCsv` into the template-ID selection and `csvBuffer` into `EmailTemplateData`.
- Both notification senders (`processUserNotification` and `processListTypeUserNotification`) pass `csvBuffer` through to `sendEmail`. No change is needed to `PublicationEvent` or `ListTypePublicationEvent`: the CSV is located by artefact-ID convention, exactly as the Excel file already is.

### 6.6 New environment variable

| Variable | Purpose |
|---|---|
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` | Notify template rendering both `((pdf_link_to_file))` and `((csv_link_to_file))` |

Must be added to the Helm values / key vault config for `apps/web` and `apps/api` alongside the existing `GOVUK_NOTIFY_TEMPLATE_ID_*` entries, and to `.env.example`. The Notify template itself must be created in the GOV.UK Notify console by the team that owns the service account — **this is a delivery dependency, not a code change** (see §14).

### 6.7 Shared download route — `apps/web/src/pages/(list-types)/list-download/index.ts`

One route serves all nine list types (and is reusable by future public list types), rather than five near-identical `download.ts` files:

```
GET /list-download?artefactId=<uuid>&type=pdf|csv
```

Handler steps:
1. Validate `artefactId` against the `UUID_REGEX` already used across the list-type pages, and `type` against `new Set(["pdf", "csv"])`. Reject anything else with 400. The blob key is built as `<validated-uuid>.<validated-type>` — never from raw user input.
2. `getArtefactById(artefactId)`; 404 if absent.
3. 410 if `now < artefact.displayFrom || now > artefact.displayTo` (matches `libs/public-pages/src/routes/pdf/[artefactId]/download.ts`).
4. `canAccessPublicationData(req.user, artefact, await resolveListType(artefact.listTypeId))`; 403 if false. Public UT lists pass for anonymous users, and the check keeps the route safe if a non-public list type is ever pointed at it.
5. `downloadBlob(blobKey, CONTAINER.PUBLICATIONS)`; 404 if null.
6. Respond with `Content-Type` from `getContentTypeFromExtension`, `Content-Disposition: attachment; filename="<artefactId>.<type>"`, and `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate`.

**Note on an existing defect to avoid replicating:** `apps/web/src/pages/(list-types)/sjp-download-shared.ts` calls `downloadBlob(fileName)` and `getBlobProperties(...)` without a container argument, so both default to `CONTAINER.ARTEFACT` (`libs/azure-blob/src/blob-client.ts:45,65`) — but PDFs and Excel files are written to `CONTAINER.PUBLICATIONS`. The new code must pass `CONTAINER.PUBLICATIONS` explicitly. Fixing the SJP path is out of scope for this ticket but should be raised separately.

### 6.8 Download links on the five UT page templates

- New shared partial `libs/web-core/src/views/components/list-download-links.njk`, rendering nothing when `downloadFiles` is empty:

```njk
{% if downloadFiles.length %}
  <h2 class="govuk-heading-m govuk-!-margin-top-6">{{ downloadLinks.heading }}</h2>
  <ul class="govuk-list">
    {% for file in downloadFiles %}
      <li>
        <a class="govuk-link" href="{{ file.url }}" download>
          {{ file.linkText }} ({{ file.sizeLabel }})
        </a>
      </li>
    {% endfor %}
  </ul>
{% endif %}
```

- New shared helper `apps/web/src/pages/(list-types)/list-download-files.ts` exporting `getDownloadFiles(artefactId, t)`, which probes `getBlobProperties(`${artefactId}.pdf`, CONTAINER.PUBLICATIONS)` and `getBlobProperties(`${artefactId}.csv`, CONTAINER.PUBLICATIONS)` in parallel and returns `{ type, url, linkText, sizeLabel }[]`. Reuse the existing `formatFileSize` from `sjp-download-shared.ts` (move it to this new module and have the SJP module import it, so there is one implementation).
- Each of the five UT page controllers awaits `getDownloadFiles(...)` and passes `downloadFiles` plus the `downloadLinks` locale block into `res.render`.
- Each of the six UT page templates (`utiac-jr-daily-hearing-list` has two: the regional and the London variant) includes the partial after the "Last updated" paragraph:
  `{% include "components/list-download-links.njk" %}`
- The now-unused `pdfDownloadUrl: `/api/pdf/${artefact.artefactId}/download`` value passed by the UT controllers is removed. It points at `libs/public-pages/src/routes/pdf/[artefactId]/download.ts`, which reads from the local filesystem (`storage/temp/uploads`) rather than blob storage and is not referenced by any UT template.

## 7. Content

New user-facing strings only. CSV column headers reuse the existing per-list-type `tableHeaders` in each lib's `en.ts`/`cy.ts` — **no new translations are required for the CSV contents themselves.**

### 7.1 Shared download-section content — `libs/list-types/common/src/locales/en.ts` / `cy.ts`

Exported from `libs/list-types/common/src/index.ts` as `downloadLinksEn` / `downloadLinksCy`, so all nine list types share one copy.

```ts
// en.ts
export const downloadLinks = {
  heading: "Download this list",
  pdfLinkText: "Download this list as a PDF",
  csvLinkText: "Download this list as a CSV"
};
```

```ts
// cy.ts
export const downloadLinks = {
  heading: [WELSH TRANSLATION REQUIRED: "Download this list"],
  pdfLinkText: [WELSH TRANSLATION REQUIRED: "Download this list as a PDF"],
  csvLinkText: [WELSH TRANSLATION REQUIRED: "Download this list as a CSV"]
};
```

### 7.2 Email link text — `libs/notifications/src/govnotify/govnotify-client.ts`

Set alongside the existing `pdf_link_text`:

| Personalisation key | Value |
|---|---|
| `pdf_link_text` | `Download PDF version` (unchanged) |
| `csv_link_text` | `Download CSV version` |

Notification emails are currently English-only — `sendListTypePublicationNotifications` takes a `language` parameter used to select *subscribers*, not to localise the email body, and all existing personalisation strings (`Download PDF version`, `Download Excel version`) are hard-coded English. `csv_link_text` follows the same convention. Localising notification content is a pre-existing gap and is out of scope here; flagged in §14.

### 7.3 Content standards applied

- Link text says what the user gets and in which format, per GOV.UK guidance on file-download links; the size is appended in parentheses so users on metered connections can decide before clicking.
- "CSV" is used rather than "comma-separated values" — it is the term used in the ticket's acceptance criteria and is the file extension users will see.
- Sentence case throughout. No new error copy is needed for the happy path.

## 8. URL

| URL | Method | Purpose | Status |
|---|---|---|---|
| `/list-download?artefactId=<uuid>&type=pdf` | GET | Download the generated PDF | New |
| `/list-download?artefactId=<uuid>&type=csv` | GET | Download the generated CSV | New |
| `/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list?artefactId=<uuid>` | GET | Unchanged route, now renders the download section | Modified |
| `/upper-tribunal-lands-chamber-daily-hearing-list?artefactId=<uuid>` | GET | As above | Modified |
| `/upper-tribunal-administrative-appeals-chamber-daily-hearing-list?artefactId=<uuid>` | GET | As above | Modified |
| `/utiac-statutory-appeal-daily-hearing-list?artefactId=<uuid>` | GET | As above | Modified |
| `/utiac-jr-daily-hearing-list?artefactId=<uuid>` | GET | As above (both regional and London templates) | Modified |

Route is auto-discovered from `apps/web/src/pages/(list-types)/list-download/index.ts`; `(list-types)` is a route group, so it adds no URL prefix. Blob keys are `publications/<artefactId>.pdf` and `publications/<artefactId>.csv`.

## 9. Validation

**Download request (`/list-download`)**

| Input | Rule | On failure |
|---|---|---|
| `artefactId` | Required; must match `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | 400 |
| `type` | Required; must be exactly `pdf` or `csv` (allow-list, not a pattern) | 400 |
| artefact | Must exist | 404 |
| display window | `displayFrom <= now <= displayTo` | 410 |
| access | `canAccessPublicationData` must return true | 403 |
| blob | Must exist in `publications` | 404 |

**CSV generation**

- Runs only for the nine registered `listTypeName` values; any other list type is a silent no-op (registry miss returns `{}`), matching the Excel registry's behaviour.
- Input JSON is already schema-validated upstream by `validateListTypeJson` before `processPublication` is called; the CSV generator does not re-validate.
- An empty hearing array produces a valid CSV containing only the header row — not an error, and not a skipped file.
- Every cell is stringified and passed through `sanitiseCellValue` before serialisation. Embedded commas, double quotes and newlines are quoted/escaped by `Papa.unparse`.
- `sizeBytes > MAX_CSV_SIZE_BYTES` (2MB) sets `exceedsMaxSize: true`. The blob is still written (so the page download works); only the email attachment is suppressed, matching the existing PDF behaviour.

## 10. Error Messages

No new user-facing validation copy is introduced — there are no new forms or inputs. Failure modes are handled as follows:

| Condition | User-visible result | Log |
|---|---|---|
| CSV generation throws | Page and PDF unaffected; download section shows PDF only | `console.error("[Publication] CSV generation error:", { artefactId, error })` |
| CSV generator returns `success: false` | As above | `console.warn("[Publication] CSV generation failed:", { artefactId, error })` |
| CSV blob missing at email time | Email sent via the PDF-only template, no CSV link | none (expected path) |
| CSV ≥ 2MB | Email sent via the PDF-only template, no CSV link | none |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` unset | Notification fails and is recorded as `Failed` in the notification audit log | `Error: GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV environment variable is not set` |
| Malformed `artefactId`/`type` | `400` — existing `errors/400` page for page routes; JSON `{ "error": "Invalid request" }` for the download route, matching `sjp-download-shared.ts` | none |
| Artefact not found / blob missing | `404` | none |
| Artefact outside display window | `410` | none |
| Access denied | `403` — existing `errors/403` page | none |

Error responses must not echo the requested filename or blob key back to the user.

## 11. Navigation

- The download links are plain `<a>` elements with the `download` attribute; clicking one triggers a file save and leaves the user on the hearing list page. There is no interstitial, no disclaimer step and no redirect — these lists are `Public`, so the SJP terms-and-conditions journey does not apply.
- The download section sits between the "Last updated" line and the "Important information" details component: high enough to be found without scrolling past the whole table, low enough that it does not push the list title away from the top of the page.
- No back link is added — the page is an entry point reached from search or A–Z, not a step in a linear journey.
- Email links resolve to the GOV.UK Notify document-download service and expire after one week (`retentionPeriod: "1 week"`), unchanged from the existing PDF behaviour.
- The download section renders identically on the Welsh version of each page; the generated file is whatever language the artefact was published in, which may not match the user's chosen interface language (see §14).

## 12. Accessibility

- **Link text is self-describing.** Each link reads "Download this list as a PDF (94.2KB)" — meaningful out of context for screen-reader users navigating by link list. Format and size are part of the link text, not a separate adjacent element, per GOV.UK guidance on linking to documents.
- **Heading hierarchy.** The section heading is an `<h2>` (`govuk-heading-m`) beneath the page's single `<h1>`, keeping the existing hierarchy intact on all six templates. No level is skipped.
- **Semantic list.** Links are `<li>` items in a `govuk-list` `<ul>`, so assistive technology announces the number of available formats.
- **No colour-only meaning.** Format is conveyed in text; nothing relies on an icon or colour.
- **Keyboard.** Standard links — reachable by Tab in reading order, activated with Enter, with the default GOV.UK focus style. No custom widget, no JavaScript, so the feature works fully with JS disabled (progressive enhancement).
- **Target size.** Links inherit `govuk-link` sizing within `govuk-list` line spacing, meeting the 24×24 CSS-pixel minimum of WCAG 2.2 SC 2.5.8; list items give vertical separation between adjacent targets.
- **Conditional content.** When no files exist the section is omitted entirely rather than rendered empty or disabled, so there is no unlabelled or non-functional control for screen-reader users to encounter.
- **CSV accessibility.** A single header row followed by uniform data rows (no merged cells, no preamble rows, no blank spacer rows) is required for the file to be machine-readable and for screen readers in spreadsheet software to announce column headers. This is the main reason the CSV carries no title/date banner rows.
- Both the English and Welsh renderings of each modified template must be re-checked with axe as part of the E2E journey test (see §13).

## 13. Test Scenarios

**Unit — shared CSV utilities (`libs/list-types/common/src/csv/*.test.ts`)**

* Serialises rows in declared column order with the resolved header strings as the first row
* Emits a header-only file when the hearing array is empty
* Quotes and escapes values containing commas, double quotes and newlines
* Prefixes cells starting with `=`, `+`, `-` or `@` with an apostrophe (formula-injection guard)
* Prepends a UTF-8 BOM
* Coerces `null`/`undefined` field values to empty strings rather than the literal "null"
* Uploads to `<artefactId>.csv` in the `publications` container with content type `text/csv`
* Flags `exceedsMaxSize` above 2MB while still reporting `success: true`
* Returns an error result (never throws) when the upload rejects

**Unit — per-list-type generators (one test file per lib)**

* For each of the nine list types: the generated CSV's header row and column count match that list type's PDF template columns exactly, in the same order (this is the direct test of AC 2)
* Welsh locale produces Welsh `tableHeaders` in the header row
* Row values are byte-identical to the values the shared renderer produces for the same fixture (proves no second formatting path)
* The four regional UTIAC JR list types share the seven-column shape; London uses its own eight-column shape

**Unit — publication pipeline (`libs/publication/src/processing/service.test.ts`)**

* CSV generation is invoked for each of the nine registered list type names, and `csvPath` is set on the result
* CSV generation is skipped, with no error, for an unregistered list type
* A throwing CSV generator is logged and swallowed: the PDF path, notifications and third-party push all still complete
* CSV generation is keyed on `listTypeName`, not `listTypeId` — a fixture with an arbitrary `listTypeId: 999` and a valid name still generates

**Unit — notifications**

* `getSubscriptionTemplateId` returns the new PDF+CSV template when `hasPdf && hasCsv`
* Existing PDF-only, PDF+Excel, SJP-Excel-only and no-links selections are unchanged (regression)
* Throws a named error when `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` is unset
* `buildEmailDataWithFiles` attaches a CSV buffer under 2MB and omits one at or above 2MB
* A missing CSV blob falls back to the PDF-only template and the email still sends
* `sendEmail` sets `csv_link_to_file` and `csv_link_text` when a CSV buffer is supplied, and neither key when it is not
* Both the location/case subscriber path and the list-type subscriber path pass the CSV buffer through

**Unit — download route (`apps/web/src/pages/(list-types)/list-download/index.test.ts`)**

* Streams the CSV with `text/csv` and an `attachment` disposition for a valid request
* Streams the PDF with `application/pdf` for `type=pdf`
* 400 for a missing, malformed or non-UUID `artefactId`
* 400 for a `type` outside the allow-list, including path-traversal attempts such as `../../secret`
* 404 for an unknown artefact and for a valid artefact with no such blob
* 410 for an artefact outside its display window
* 403 when `canAccessPublicationData` returns false
* Reads from the `publications` container, not the default `artefact` container

**Template tests (`*.njk.test.ts`, Cheerio structural assertions)**

* Each of the six UT templates renders one link per entry in `downloadFiles`, with the correct `href`, link text and size label
* The section, including its `<h2>`, is absent when `downloadFiles` is empty
* The `<h2>` sits at the right position in the heading order relative to the existing `<h1>` and the "Important information" component
* Welsh locale renders the Welsh `downloadLinks` strings
* `Object.keys(en).sort()` equals `Object.keys(cy).sort()` for the modified locale files (parity)

**E2E (`e2e-tests/tests/`) — one journey test, tagged `@nightly`**

* Publish a UT hearing list fixture, open its page, assert the download section lists both formats with sizes, download the CSV and assert its header row matches the on-page table headers, switch to Welsh and assert the translated section heading and Welsh CSV headers, run axe inline at both languages, and tab to and activate a download link by keyboard — all within a single test, per the repo's minimum-test-count rule

## 14. Assumptions & Open Questions

**Assumptions**

* "CSV" in the acceptance criteria means a genuine comma-separated `text/csv` file, not the `.xlsx` workbook the existing "Download Excel version" pipeline produces. Both formats are therefore supported side by side; the existing Excel path is untouched and no UT list type is added to `EXCEL_GENERATOR_REGISTRY`.
* "All the data fields available in the current downloadable PDF" means the columns of the PDF's hearing table. The CSV deliberately omits the PDF's surrounding prose (list title, hearing date, last-updated line, important-information paragraphs, data source, caution notices) — preamble rows above a header row break every standard CSV parser and spreadsheet import. If the business genuinely needs the list title and content date inside the file, the least damaging option is extra repeated columns rather than banner rows; this needs confirming.
* Nine list types are in scope. The ticket names "UTIAC — Judicial Review: Daily hearing list" as one item, but it exists as five separate list types (London, Leeds, Manchester, Birmingham, Cardiff) with two different column shapes. All five are covered.
* The PDF already exists for all nine list types, so AC 1's "PDF … made available as a downloadable option" is delivered by surfacing the existing PDF on the page (it currently is not linked from any UT page), not by building new PDF generation.
* Because all nine list types are `Public`, no sign-in gate and no terms-and-conditions disclaimer are required before download. If the business wants the SJP-style disclaimer for consistency, that is a separate scope decision that changes the journey in §4.
* The CSV is generated in the publication's own language, matching PDF behaviour. There is one CSV per artefact, not one per language.
* Existing artefacts published before this change will have no CSV. The download section will show PDF only for them, and their subscription emails have already been sent. No backfill is specified — see below.

**Open questions**

* **Notify template creation is a hard dependency.** A new GOV.UK Notify template rendering both `((pdf_link_to_file))` and `((csv_link_to_file))` must be created and its ID supplied as `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` before AC 3 can be verified in any environment. Who owns this, and is the wording of the new template's download block agreed? Until the ID is set, subscription emails for UT lists will fail rather than degrade — consider making the new branch fall back to the PDF-only template when the variable is unset, at the cost of silently dropping the CSV link.
* **Should the email offer three links** (PDF + Excel + CSV) for list types that have all three? No UT list type has an Excel file today, so the combination cannot arise in scope, and this spec does not add a PDF+Excel+CSV template. Confirm that is acceptable, or the template matrix grows.
* **Backfill.** Should CSVs be generated retrospectively for UT artefacts still inside their display window, so users viewing yesterday's list also get the CSV option? Not specified in the ticket; would need a one-off job reading each artefact's JSON from blob storage.
* **Welsh notification content.** `csv_link_text` is hard-coded English, consistent with the existing `pdf_link_text` and `excel_link_text`. Welsh-language subscribers currently receive English link text for the PDF too. Should this ticket start fixing that, or is it a separate piece of work?
* **Existing SJP download container bug** (§6.7): `sjp-download-shared.ts` reads from the default `artefact` container while files are written to `publications`. This looks like a live defect in the SJP download journey. Should it be fixed here, since this ticket touches the same area, or raised as its own issue?
* **File size labels and the 2MB ceiling.** UT daily lists are small, so the 2MB Notify limit is unlikely to bite. Confirm no UT venue publishes a list large enough to exceed it — if one does, the email silently loses its links, which is the current PDF behaviour and would be worth a monitoring alert rather than a code change.


### Comment by OgechiOkelu on 2026-08-12T09:00:38Z

@plan 

