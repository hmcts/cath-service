# #944: Create additional file format for Download version of the Tribunals Hearing List

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-08-12T13:29:29Z
**Updated:** 2026-08-12T17:02:13Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the CSV download file for all the Tribunal hearing lists not covered in the other tickets.
**Tribunal Hearing Lists:**
Primary Health Tribunal Weekly Hearing List
Care Standards Tribunal Weekly Hearing List
Special Immigration Appeals Commission weekly hearing list
Proscribed Organisations Appeal Commission weekly hearing list
Pathogens Access Appeal Commission weekly hearing list
General Regulatory Chamber weekly hearing list
Criminal Injuries Compensation weekly hearing list
Asylum Support Tribunal Daily hearing list 

 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from

 

**ACCEPTANCE CRITERIA**
- CSV and PDF downloadable files are made available as downloadable options for all the Tribunal hearing lists above
- All the data fields available in the current downloadable PDF file should also be available on the CSV downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-08-12T16:10:38Z

@spec 

### Comment by hmctsclaudecode on 2026-08-12T16:21:14Z

# Technical Specification — Issue #944

**Create additional file format (CSV) for the Download version of the Tribunals Hearing Lists**

## 1. User Story

**As a** CaTH verified user subscribed to a tribunal hearing list
**I want to** download the published hearing list as a CSV file as well as a PDF, from both the publication page and the subscription email
**So that** I can open the list in a spreadsheet and re-use the hearing data without re-typing it out of a PDF

## 2. Background

The eight tribunal hearing lists in scope are all **non-strategic** list types. They are uploaded by an admin as an `.xlsx` file, converted to a flat JSON array (one object per hearing) by an `ExcelConverterConfig`, and then rendered two ways:

- **HTML** — `apps/web/src/pages/(list-types)/<list>/…` via `createSimpleListTypeHandler`
- **PDF** — `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`, stored as `<artefactId>.pdf` in the `publications` blob container

There is **no CSV output anywhere in the service today**. `text/csv` appears only in `libs/publication/src/file-storage/content-type.ts` (for *flat files uploaded as* CSV) and in `libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.ts` (reference-data ingestion). Neither is a publication download path.

The closest existing analogue is Excel (`.xlsx`) generation, which exists for SJP and Magistrates lists only:

| Concern | Existing code |
|---|---|
| Registry keyed by `listTypeName` | `EXCEL_GENERATOR_REGISTRY`, `libs/publication/src/processing/service.ts:361` |
| Orchestration | `generatePublicationExcel` / `processPublication`, same file |
| Blob write | `saveExcelToStorage`, `libs/list-types/common/src/excel/excel-utilities.ts` → `publications` container |
| Generator | `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` |
| Cell hardening | `sanitiseCellValue` (prefixes `=`, `+`, `-`, `@` with `'`), `excel-utilities.ts` |
| Email attachment | `buildEmailDataWithFiles`, `libs/notifications/src/notification/notification-service.ts:457` |
| Notify link personalisation | `excel_link_to_file` / `excel_link_text`, `libs/notifications/src/govnotify/govnotify-client.ts:83` |
| Notify template selection | `getSubscriptionTemplateId`, `libs/notifications/src/govnotify/template-config.ts:15` |
| UI download page (SJP only) | `apps/web/src/pages/(list-types)/sjp-download-shared.ts` |

**List types in scope** (all eight already have a working PDF generator, so no PDF work is needed — only the CSV side and the email wiring):

| # | Ticket wording | `listTypeName` | Package |
|---|---|---|---|
| 1 | Primary Health Tribunal Weekly Hearing List | `PHT_WEEKLY_HEARING_LIST` | `@hmcts/pht-weekly-hearing-list` |
| 2 | Care Standards Tribunal Weekly Hearing List | `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `@hmcts/care-standards-tribunal-weekly-hearing-list` |
| 3 | Special Immigration Appeals Commission Weekly Hearing List | `SIAC_WEEKLY_HEARING_LIST` | `@hmcts/siac-poac-paac-weekly-hearing-list` |
| 4 | Proscribed Organisations Appeal Commission Weekly Hearing List | `POAC_WEEKLY_HEARING_LIST` | `@hmcts/siac-poac-paac-weekly-hearing-list` |
| 5 | Pathogens Access Appeal Commission Weekly Hearing List | `PAAC_WEEKLY_HEARING_LIST` | `@hmcts/siac-poac-paac-weekly-hearing-list` |
| 6 | General Regulatory Chamber Weekly Hearing List | `GRC_WEEKLY_HEARING_LIST` | `@hmcts/grc-weekly-hearing-list` |
| 7 | Criminal Injuries Compensation Weekly Hearing List | `CIC_WEEKLY_HEARING_LIST` | `@hmcts/cic-weekly-hearing-list` |
| 8 | Asylum Support Tribunal Daily Hearing List | `AST_DAILY_HEARING_LIST` | `@hmcts/ast-daily-hearing-list` |

Because all eight share the same *flat array of hearings* shape, a **single config-driven CSV generator** covers all of them. Do not write eight bespoke generators.

**Column sets** are taken verbatim from the existing `ExcelConverterConfig` field order (which is also the PDF table column order), so upload → PDF → CSV stay in lockstep:

| `listTypeName` | Columns (in order) |
|---|---|
| `PHT_WEEKLY_HEARING_LIST` | Date, Case name, Hearing length, Hearing type, Venue, Additional information |
| `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | Date, Case name, Hearing length, Hearing type, Venue, Additional information |
| `SIAC_WEEKLY_HEARING_LIST`, `POAC_WEEKLY_HEARING_LIST`, `PAAC_WEEKLY_HEARING_LIST` | Date, Time, Appellant, Case Reference Number, Hearing Type, Courtroom, Additional information |
| `GRC_WEEKLY_HEARING_LIST` | Date, Hearing time, Case reference number, Case name, Judge(s), Member(s), Mode of hearing, Venue, Additional information |
| `CIC_WEEKLY_HEARING_LIST` | Date, Hearing time, Case reference number, Case name, Venue/platform, Judge(s), Member(s), Additional information |
| `AST_DAILY_HEARING_LIST` | Appellant, Appeal reference number, Case type, Hearing type, Hearing time, Additional information |

> **A note on acceptance criterion 2.** "All the data fields available in the current downloadable PDF file should also be available on the CSV" is read literally in this spec: the PDF header block (list title, list date, last updated, data source) is emitted as a small key/value preamble above the table. That deviates from the existing `.xlsx` generators, which emit only the header row and data rows, and it breaks naive one-header-row CSV parsers. The trade-off is flagged in section 14 as an open question — but the work below implements the preamble, because AC 2 is explicit.

## 3. Acceptance Criteria

* **Scenario:** CSV is generated when a tribunal list is published
    * **Given** an admin publishes a valid `GRC_WEEKLY_HEARING_LIST` JSON artefact with three hearings
    * **When** `processPublication` runs
    * **Then** a `<artefactId>.csv` blob exists in the `publications` container with content type `text/csv; charset=utf-8`, containing the metadata preamble, one header row of the nine GRC columns, and three data rows

* **Scenario:** Every list type in scope produces a CSV
    * **Given** a valid artefact for each of the eight `listTypeName` values in scope
    * **When** each is published
    * **Then** a CSV blob is produced for every one of them, with the column set and column order defined in section 2

* **Scenario:** CSV carries the same data fields as the PDF
    * **Given** a published `CIC_WEEKLY_HEARING_LIST` artefact
    * **When** the CSV and the PDF for that artefact are compared
    * **Then** every hearing column shown in the PDF table appears as a CSV column with the same value and the same date/time formatting, and the PDF's list title, list date, last-updated timestamp and data source appear in the CSV preamble

* **Scenario:** Both download links appear in the subscription email
    * **Given** a verified user subscribed to `AST_DAILY_HEARING_LIST` at a location
    * **When** an artefact for that list type and location is published and both the PDF and the CSV are under 2MB
    * **Then** the user receives one email containing a "Download PDF version" link and a "Download CSV version" link, both resolving to GOV.UK Notify document-download URLs with a 1 week retention period

* **Scenario:** Email degrades safely when a file is missing or oversized
    * **Given** a published artefact whose CSV blob is missing, or whose CSV exceeds 2MB
    * **When** the subscription email is built
    * **Then** the email is still sent, using the template appropriate to the files that *are* available, and no CSV link personalisation is set

* **Scenario:** CSV is downloadable from the publication page
    * **Given** a verified user viewing `/pht-weekly-hearing-list?artefactId=<uuid>`
    * **When** they select the "Download this list as a CSV file" link
    * **Then** the browser downloads `<artefactId>.csv` with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment`

* **Scenario:** CSV download respects publication access rules
    * **Given** an artefact whose `displayFrom`/`displayTo` window has expired, or which the requesting user is not permitted to see
    * **When** `/api/csv/<artefactId>/download` is requested
    * **Then** the response is `410` (expired) or `403` (not permitted) and no CSV bytes are returned

* **Scenario:** CSV cells cannot be used for formula injection
    * **Given** a hearing whose `additionalInformation` value is `=cmd|' /c calc'!A0`
    * **When** the CSV is generated
    * **Then** the cell is written as `"'=cmd|' /c calc'!A0"` — prefixed with an apostrophe and quoted — so no spreadsheet evaluates it

* **Scenario:** Welsh CSV uses Welsh column headings
    * **Given** an artefact published with `language: WELSH` (locale `cy`)
    * **When** the CSV is generated
    * **Then** the preamble labels and the column headings come from the list type's `cy` locale object

## 4. User Journey Flow

**Journey A — publication (system, no UI)**

```
Admin uploads .xlsx  →  non-strategic-upload-summary
                              │
                              ▼
                  convertExcelForListTypeName  →  JSON stored in `artefact` container
                              │
                              ▼
                     processPublication()
                       ├── extractAndStoreArtefactSearch()
                       ├── generatePublicationPdf()    → publications/<id>.pdf
                       ├── generatePublicationExcel()  → (no-op for these 8 list types)
                       ├── generatePublicationCsv()    → publications/<id>.csv        ◀── NEW
                       └── sendPublicationNotificationsForArtefact({ pdfFilePath, excelPath, csvPath })
                                        │
                                        ▼
                              buildEmailDataWithFiles()
                                 downloads .pdf + .xlsx + .csv from blob
                                 drops any file ≥ 2MB
                                 getSubscriptionTemplateId({ hasPdf, hasExcel, hasCsv })
                                        │
                                        ▼
                              GOV.UK Notify email with
                              pdf_link_to_file + csv_link_to_file
```

**Journey B — subscriber reading the email**

```
Email in inbox
  │  "Download PDF version"  ─────▶ Notify document download (PDF)
  └─ "Download CSV version"  ─────▶ Notify document download (CSV)
```

**Journey C — user on the publication page**

```
/hearing-lists  →  select court  →  select list
        │
        ▼
/grc-weekly-hearing-list?artefactId=<uuid>
        │
        │  "Download this list" section under the last-updated line
        ├── "Download this list as a PDF file (124.3KB)" → /api/pdf/<uuid>/download
        └── "Download this list as a CSV file (8.1KB)"   → /api/csv/<uuid>/download
                                                                │
                                                                ▼
                                            200 + attachment  |  403  |  404  |  410
```

## 5. Low Fidelity Wireframe

**Publication page — new "Download this list" block (all eight list pages)**

```
┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                     Cymraeg      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  General Regulatory Chamber Weekly Hearing List            (h1)      │
│                                                                      │
│  Find contact details and other information about courts and         │
│  tribunals in England and Wales, and some non-devolved tribunals     │
│  in Scotland.                                                        │
│                                                                      │
│  List for week commencing 12 August 2026                   (bold)    │
│  Last updated 11 August 2026 at 4:32pm                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Download this list                                    (h2, S)  │  │
│  │                                                                │  │
│  │ Download this list as a PDF file (124.3KB)                     │  │
│  │ Download this list as a CSV file (8.1KB)                       │  │
│  │                                                                │  │
│  │ CSV files can be opened in a spreadsheet application such      │  │
│  │ as Microsoft Excel or Google Sheets.                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ▸ Important information                                (details)    │
│                                                                      │
│  Search Cases                                              (h2, S)   │
│  [                              ]                                    │
│                                                                      │
│  ┌──────┬──────────┬───────────┬───────────┬──────────┬───────────┐  │
│  │ Date │ Hearing  │ Case ref  │ Case name │ Judge(s) │ …         │  │
│  │      │ time     │ number    │           │          │           │  │
│  ├──────┼──────────┼───────────┼───────────┼──────────┼───────────┤  │
│  │12/08 │ 10:30am  │ GRC/0001  │ A v B     │ J Smith  │ …         │  │
│  └──────┴──────────┴───────────┴───────────┴──────────┴───────────┘  │
│                                                                      │
│  Back to top                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

**Subscription email (GOV.UK Notify, PDF + CSV template)**

```
┌──────────────────────────────────────────────────────────────────────┐
│ Subject: Court and tribunal hearings — your subscription             │
├──────────────────────────────────────────────────────────────────────┤
│ There is a new hearing list for a court or tribunal you have         │
│ subscribed to.                                                       │
│                                                                      │
│ Court or tribunal: Field House                                       │
│ Hearing list: General Regulatory Chamber Weekly Hearing List         │
│ List date: 12 August 2026                                            │
│                                                                      │
│ Download the list                                                    │
│                                                                      │
│   Download PDF version                          ← pdf_link_to_file   │
│   Download CSV version                          ← csv_link_to_file   │
│                                                                      │
│ These links expire after 1 week.                                     │
│                                                                      │
│ Manage your subscriptions: https://…/subscriptions                   │
└──────────────────────────────────────────────────────────────────────┘
```

**Generated CSV, opened in a spreadsheet (GRC example)**

```
┌───┬──────────────────────┬────────────────────────────────────────────┐
│   │ A                    │ B                                          │
├───┼──────────────────────┼────────────────────────────────────────────┤
│ 1 │ List                 │ General Regulatory Chamber Weekly Hearing…  │
│ 2 │ List for week comm…  │ 12 August 2026                              │
│ 3 │ Last updated         │ 11 August 2026 at 4:32pm                    │
│ 4 │ Data source          │ Manual Upload                               │
│ 5 │                      │                                             │
├───┼──────┬──────────┬────┴───────┬───────────┬──────────┬─────────────┤
│ 6 │ Date │ Hearing  │ Case refer…│ Case name │ Judge(s) │ …           │
│ 7 │12/08 │ 10:30am  │ GRC/0001   │ A v B     │ J Smith  │ …           │
│ 8 │12/08 │ 2:00pm   │ GRC/0002   │ C v D     │ K Jones  │ …           │
└───┴──────┴──────────┴────────────┴───────────┴──────────┴─────────────┘
```

## 6. Page Specifications

### 6.1 New shared CSV utilities — `libs/list-types/common/src/csv/`

**`csv-utilities.ts`**

```ts
export function toCsvRow(cells: string[]): string
export function toCsvBuffer(rows: string[][]): Buffer
export async function saveCsvToStorage(artefactId: string, buffer: Buffer): Promise<{ csvPath: string }>
```

- `toCsvRow` — RFC 4180 quoting: always wrap each cell in `"`, escape embedded `"` as `""`. Always quoting (rather than conditionally) keeps embedded commas, newlines and the injection-guard apostrophe safe with no branching.
- `toCsvBuffer` — joins rows with `\r\n`, prepends a UTF-8 BOM (`﻿`) so Excel on Windows renders Welsh diacritics correctly, returns a `Buffer`.
- `saveCsvToStorage` — `uploadBlob(`${artefactId}.csv`, buffer, "text/csv; charset=utf-8", CONTAINER.PUBLICATIONS)`, returns `{ csvPath: `${artefactId}.csv` }`. Mirrors `saveExcelToStorage` exactly; the `publications` container is the one PDFs and `.xlsx` already use.
- Reuse the existing `sanitiseCellValue` from `libs/list-types/common/src/excel/excel-utilities.ts` — do not duplicate it. Every cell value passes through `sanitiseCellValue` before `toCsvRow`.

**`non-strategic-csv-generator.ts`** — one generator for all eight list types:

```ts
interface NonStrategicCsvColumn {
  headerKey: string;   // key inside the locale object's tableHeaders
  fieldName: string;   // key on the rendered hearing row
}

interface NonStrategicCsvConfig<T> {
  en: Record<string, unknown>;
  cy: Record<string, unknown>;
  columns: NonStrategicCsvColumn[];
  listDateLabelKey: string;                    // "listForWeekCommencing" | "listForDate"
  render: (data: T, opts: RenderOptions) => { header: RenderedHeader; hearings: Record<string, string>[] };
}

export function createNonStrategicCsvGenerator<T>(config: NonStrategicCsvConfig<T>): CsvGenerator
```

The returned generator:
1. Picks `t = locale === "cy" ? config.cy : config.en`.
2. Calls `config.render(jsonData, { locale, contentDate, lastReceivedDate, listTitle, courtName })` — the **same** render function the HTML page and PDF use, so formatting cannot drift.
3. Emits the preamble rows: `[t.csvListLabel, header.listTitle]`, `[t[listDateLabelKey], header.weekCommencingDate ?? header.listDate]`, `[t.lastUpdated, `${header.lastUpdatedDate} ${t.at} ${header.lastUpdatedTime}`]`, `[t.dataSource, provenanceLabel]`, then `[]`.
4. Emits the header row from `columns.map(c => t.tableHeaders[c.headerKey])`.
5. Emits one row per hearing: `columns.map(c => sanitiseCellValue(hearing[c.fieldName] ?? ""))`.
6. `toCsvBuffer` → `saveCsvToStorage` → `{ success: true, csvPath }`; on throw returns `{ success: false, error }` (never rethrows — CSV failure must not fail a publication).

Export both from `libs/list-types/common/src/index.ts`.

### 6.2 Per-package CSV config — one small file per list type package

`libs/list-types/<package>/src/csv/csv-generator.ts`, e.g.:

```ts
export const generateGrcWeeklyHearingListCsv = createNonStrategicCsvGenerator<GrcWeeklyHearingList>({
  en, cy,
  listDateLabelKey: "listForWeekCommencing",
  columns: [
    { headerKey: "date", fieldName: "date" },
    { headerKey: "hearingTime", fieldName: "hearingTime" },
    { headerKey: "caseReferenceNumber", fieldName: "caseReferenceNumber" },
    { headerKey: "caseName", fieldName: "caseName" },
    { headerKey: "judges", fieldName: "judges" },
    { headerKey: "members", fieldName: "members" },
    { headerKey: "modeOfHearing", fieldName: "modeOfHearing" },
    { headerKey: "venue", fieldName: "venue" },
    { headerKey: "additionalInformation", fieldName: "additionalInformation" }
  ],
  render: renderGrcWeeklyHearingListData
});
```

Export from each package's `src/index.ts`. Six new files (SIAC/POAC/PAAC share one, differing only by court name and list title, which come from the artefact's `listTypeName` as they already do in the PDF registry).

`CIC_WEEKLY_HEARING_LIST` has one gotcha: its field is literally `"venue/platform"` (with the slash) — index it with bracket notation, do not rename it.

### 6.3 Registry and orchestration — `libs/publication/src/processing/service.ts`

Add, mirroring the Excel block:

```ts
type CsvGenerator = (params: GenerateCsvParams) => Promise<CsvGeneratorResult>;

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = {
  PHT_WEEKLY_HEARING_LIST: (p) => generatePhtWeeklyHearingListCsv({ ...p, jsonData: p.jsonData as PhtHearingList }),
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: (p) => generateCareStandardsTribunalWeeklyHearingListCsv({ ... }),
  SIAC_WEEKLY_HEARING_LIST: siacPoacPaacCsvGenerator,
  POAC_WEEKLY_HEARING_LIST: siacPoacPaacCsvGenerator,
  PAAC_WEEKLY_HEARING_LIST: siacPoacPaacCsvGenerator,
  GRC_WEEKLY_HEARING_LIST: (p) => generateGrcWeeklyHearingListCsv({ ... }),
  CIC_WEEKLY_HEARING_LIST: (p) => generateCicWeeklyHearingListCsv({ ... }),
  AST_DAILY_HEARING_LIST: (p) => generateAstDailyHearingListCsv({ ... })
};

export function listTypeHasCsv(listTypeName: string | undefined): boolean;
export async function generatePublicationCsv(params: GenerateCsvParams): Promise<CsvGenerationResult>;
```

Keys are the stable `listTypeName` strings. **Never** key on `listTypeId` — it is autoincrement and differs per environment.

In `processPublication`, inside the existing `if (jsonData)` block, after the Excel step:

```ts
const csvResult = await generatePublicationCsv({
  artefactId,
  listTypeName: pdfResult.listTypeName ?? "",
  contentDate, locale, locationId, jsonData,
  provenance,
  lastReceivedDate,
  logPrefix
});
if (csvResult.hasCsv) {
  result.csvPath = `${artefactId}.csv`;
}
```

Add `csvPath?: string` to `ProcessPublicationResult` and to `SendNotificationsParams`, and pass it through to `sendLocationAndCaseSubscriptionNotifications` and `sendListTypePublicationNotifications`.

`generatePublicationCsv` swallows all errors and returns `{}` — identical to `generatePublicationExcel`. A failed CSV must never block the PDF, the notifications, or the third-party push.

### 6.4 Email — `libs/notifications`

**`notification-service.ts`**

- Add `csvBuffer?: Buffer` to `EmailTemplateData`.
- In `buildEmailDataWithFiles`, download the CSV alongside the others and run the three downloads concurrently rather than sequentially (three awaits per recipient per publication is measurable at fan-out):
  ```ts
  const [pdfBuffer, excelBuffer, csvBuffer] = await Promise.all([
    pdfBlobKey ? downloadBlob(pdfBlobKey, CONTAINER.PUBLICATIONS) : Promise.resolve(null),
    downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS),
    downloadBlob(`${artefactId}.csv`, CONTAINER.PUBLICATIONS)
  ]);
  ```
- Apply the existing `MAX_PDF_SIZE_BYTES` (2MB) ceiling to the CSV, fold `csvUnder2MB` into `filesUnder2MB`, and pass `hasCsv` into `getSubscriptionTemplateId`.
- Return `csvBuffer: csvUnder2MB ? csvBuffer : undefined`.
- Thread `csvBuffer` through `processUserNotification` → `sendEmail`.

**`govnotify-client.ts`**

- Add `csvBuffer?: Buffer` to `SendEmailParams`.
- When present:
  ```ts
  const csvLink = notifyClient.prepareUpload(params.csvBuffer, {
    confirmEmailBeforeDownload: false,
    retentionPeriod: "1 week"
  });
  personalisation.csv_link_to_file = csvLink;
  personalisation.csv_link_text = "Download CSV version";
  ```
  Same options as the existing PDF/Excel uploads.

**`template-config.ts`**

- New env var `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`.
- Extend `getSubscriptionTemplateId({ isSjp, hasPdf, hasExcel, hasCsv, filesUnder2MB })`. Selection order, most specific first:

  | `hasPdf` | `hasExcel` | `hasCsv` | Template env var |
  |---|---|---|---|
  | – | – | – | `…_NO_LINKS` (also when `!filesUnder2MB`) |
  | ✗ | ✓ | ✗ | `…_SJP_EXCEL_ONLY` (SJP only) |
  | ✓ | ✓ | ✗ | `…_SUBSCRIPTION_PDF_EXCEL` |
  | ✓ | ✗ | ✓ | `…_SUBSCRIPTION_PDF_CSV` ◀── NEW |
  | ✓ | ✗ | ✗ | `…_NON_SJP_PDF` |
  | ✗ | ✗ | ✓ | `…_SUBSCRIPTION_PDF_CSV` (CSV link renders, PDF block conditional in the Notify template) |

  Existing rows must not change behaviour. Throw the same "environment variable is not set" error style if the new var is empty and the PDF+CSV branch is selected.

**Notify template (manual, outside the codebase)** — a new GOV.UK Notify email template must be created containing both `((pdf_link_to_file))` and `((csv_link_to_file))` blocks. Its UUID goes into:

- `apps/web/helm/values.yaml`
- `apps/api/helm/values.yaml`
- `apps/web/.env.example` (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV=template-uuid-here`)

### 6.5 CSV download route — `libs/public-pages/src/routes/api/csv/[artefactId]/download.ts`

`GET /api/csv/:artefactId/download`:

1. Validate `artefactId` against the existing `UUID_REGEX`; `400` on mismatch.
2. `getArtefactById(id)`; `404` if absent.
3. `canAccessPublicationData(req.user, artefact, await resolveListType(artefact.listTypeId))`; `403` if denied.
4. `now < artefact.displayFrom || now > artefact.displayTo` → `410`.
5. `downloadBlob(`${id}.csv`, CONTAINER.PUBLICATIONS)`; `404` if null.
6. Headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="<id>.csv"`, `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate`.

Note this route reads from `CONTAINER.PUBLICATIONS` explicitly. `downloadBlob`'s default container is `CONTAINER.ARTEFACT`, and `sjp-download-shared.ts` relies on that default while PDFs/Excel are written to `publications` — do not copy that pattern (see section 14).

The existing `libs/public-pages/src/routes/pdf/[artefactId]/download.ts` reads the PDF from the local filesystem (`storage/temp/uploads`) and performs **no** access check. It is left untouched by this ticket, but that asymmetry is called out in section 14.

### 6.6 Publication page download block

Add a shared partial `libs/list-types/common/src/views/partials/list-download-options.njk`:

```njk
{% if downloadOptions.length %}
  <h2 class="govuk-heading-s govuk-!-margin-top-6">{{ t.downloadHeading }}</h2>
  <ul class="govuk-list">
    {% for option in downloadOptions %}
      <li>
        <a class="govuk-link" href="{{ option.url }}" download>
          {{ option.linkText }}{% if option.sizeLabel %} ({{ option.sizeLabel }}){% endif %}
        </a>
      </li>
    {% endfor %}
  </ul>
  <p class="govuk-body govuk-hint">{{ t.downloadCsvHint }}</p>
{% endif %}
```

Include it in the eight list templates immediately after the last-updated paragraph:

- `apps/web/src/pages/(list-types)/pht-weekly-hearing-list/pht-weekly-hearing-list.njk`
- `apps/web/src/pages/(list-types)/care-standards-tribunal-weekly-hearing-list/…njk`
- `apps/web/src/pages/(list-types)/cic-weekly-hearing-list/…njk`
- `apps/web/src/pages/(list-types)/ast-daily-hearing-list/…njk`
- `apps/web/src/pages/(list-types)/grc-weekly-hearing-list/…njk`
- `libs/list-types/siac-poac-paac-weekly-hearing-list/src/views/siac-poac-paac-weekly-hearing-list.njk` (SIAC/POAC/PAAC share this template)

Populate `downloadOptions` in `apps/web/src/pages/(list-types)/list-type-handler.ts` via a new exported helper, so all eight pages get it without duplicating logic:

```ts
export async function buildDownloadOptions(artefact: Artefact, t: SimpleLocaleContent) {
  const options = [];
  const pdf = await getBlobProperties(`${artefact.artefactId}.pdf`, CONTAINER.PUBLICATIONS);
  if (pdf) options.push({ url: `/api/pdf/${artefact.artefactId}/download`, linkText: t.downloadPdfLinkText, sizeLabel: formatFileSize(pdf.size) });
  if (listTypeHasCsv(artefact.listTypeName)) {
    const csv = await getBlobProperties(`${artefact.artefactId}.csv`, CONTAINER.PUBLICATIONS);
    if (csv) options.push({ url: `/api/csv/${artefact.artefactId}/download`, linkText: t.downloadCsvLinkText, sizeLabel: formatFileSize(csv.size) });
  }
  return options;
}
```

Call it from `createWeeklyHearingListRender` (covers PHT, CST, GRC, CIC, AST) and from the SIAC/POAC/PAAC page's bespoke `render`. `formatFileSize` already exists in `sjp-download-shared.ts` — move it to `libs/publication/src/file-storage/` and import it from both places rather than duplicating.

The two `getBlobProperties` calls are HEAD requests; issue them with `Promise.all` and swallow failures so a blob-storage blip degrades to "no download links" rather than a 500.

## 7. Content

All new strings go in each list type package's `src/locales/en.ts` and `src/locales/cy.ts` (they are shared by the CSV generator, the PDF and the page, so they belong in the lib, not co-located with the controller). Keys are identical across all eight packages.

**English (`en.ts`)**

```ts
downloadHeading: "Download this list",
downloadPdfLinkText: "Download this list as a PDF file",
downloadCsvLinkText: "Download this list as a CSV file",
downloadCsvHint: "CSV files can be opened in a spreadsheet application such as Microsoft Excel or Google Sheets.",
csvListLabel: "List",
```

`listForWeekCommencing` / `listForDate`, `lastUpdated`, `at`, `dataSource` and the whole `tableHeaders` object already exist in every package and are reused unchanged by the CSV generator.

**Welsh (`cy.ts`)**

```ts
downloadHeading: [WELSH TRANSLATION REQUIRED: "Download this list"],
downloadPdfLinkText: [WELSH TRANSLATION REQUIRED: "Download this list as a PDF file"],
downloadCsvLinkText: [WELSH TRANSLATION REQUIRED: "Download this list as a CSV file"],
downloadCsvHint: [WELSH TRANSLATION REQUIRED: "CSV files can be opened in a spreadsheet application such as Microsoft Excel or Google Sheets."],
csvListLabel: [WELSH TRANSLATION REQUIRED: "List"],
```

**Email link text** (set in `govnotify-client.ts`, matching the existing hardcoded `"Download PDF version"` / `"Download Excel version"`):

```
csv_link_text: "Download CSV version"
```

**Notify template body additions** (authored in the GOV.UK Notify console, not in this repo):

- English: `Download the list`, `Download PDF version`, `Download CSV version`, `These links expire after 1 week.`
- Welsh: [WELSH TRANSLATION REQUIRED: "Download the list"], [WELSH TRANSLATION REQUIRED: "Download PDF version"], [WELSH TRANSLATION REQUIRED: "Download CSV version"], [WELSH TRANSLATION REQUIRED: "These links expire after 1 week."]

**CSV column headings** are already present as `tableHeaders` in both locales in all eight packages — no new translation needed. Verify parity with `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())` in each package's locale test.

## 8. URL

| Method | Path | Purpose | New? |
|---|---|---|---|
| `GET` | `/api/csv/:artefactId/download` | Download the generated CSV for an artefact | **Yes** |
| `GET` | `/api/pdf/:artefactId/download` | Existing PDF download | No |
| `GET` | `/pht-weekly-hearing-list?artefactId=<uuid>` | Publication page, gains the download block | No |
| `GET` | `/care-standards-tribunal-weekly-hearing-list?artefactId=<uuid>` | as above | No |
| `GET` | `/siac-weekly-hearing-list?artefactId=<uuid>` | as above | No |
| `GET` | `/poac-weekly-hearing-list?artefactId=<uuid>` | as above | No |
| `GET` | `/paac-weekly-hearing-list?artefactId=<uuid>` | as above | No |
| `GET` | `/grc-weekly-hearing-list?artefactId=<uuid>` | as above | No |
| `GET` | `/cic-weekly-hearing-list?artefactId=<uuid>` | as above | No |
| `GET` | `/ast-daily-hearing-list?artefactId=<uuid>` | as above | No |

The route is auto-discovered from `libs/public-pages/src/routes/api/csv/[artefactId]/download.ts` by the existing `createSimpleRouter` wiring — no manual registration.

Blob keys: `publications/<artefactId>.csv` (new), alongside the existing `publications/<artefactId>.pdf`.

## 9. Validation

There is no user input in this feature beyond the route parameter. Validation is therefore on the route and on the data being serialised.

**Route parameter**

| Rule | Behaviour on failure |
|---|---|
| `artefactId` present | `400` |
| `artefactId` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | `400` |
| Artefact exists | `404` |
| Requesting user passes `canAccessPublicationData` | `403` |
| `displayFrom <= now <= displayTo` | `410` |
| `<artefactId>.csv` blob exists | `404` |

The blob key is built as `` `${id}.csv` `` from an already UUID-validated `id`, so there is no path-traversal surface; do not accept a filename from the query string.

**CSV serialisation**

| Rule | Handling |
|---|---|
| Cell starts with `=`, `+`, `-` or `@` | Prefix with `'` via the existing `sanitiseCellValue` |
| Cell contains `"` | Escape as `""` |
| Cell contains `,`, `\r` or `\n` | Neutralised by unconditional quoting |
| Field missing or `null`/`undefined` on the hearing row | Emit an empty quoted cell `""`, never the string `"undefined"` |
| Non-ASCII characters (Welsh diacritics, `£`) | UTF-8 with leading BOM |
| Zero hearings in the artefact | Still write a CSV: preamble + header row, no data rows |

Upstream JSON schema validation is unchanged — the CSV generator only ever runs on data that already passed `validate<ListType>` at upload time.

## 10. Error Messages

No new user-facing form errors. The user-visible failure modes:

| Condition | Response | Text shown |
|---|---|---|
| Malformed / missing `artefactId` on the CSV route | `400` JSON | `{ "error": "Invalid request" }` (matches the existing PDF route) |
| Artefact not found, or CSV blob absent | `404` JSON | `{ "error": "File not found" }` |
| User not permitted to see the publication | `403` page `errors/403` | EN: "Access denied" / "You do not have permission to view this publication." — CY: [WELSH TRANSLATION REQUIRED: "Access denied"] / [WELSH TRANSLATION REQUIRED: "You do not have permission to view this publication."] |
| Publication display window has expired | `410` JSON | `{ "error": "File has expired" }` |
| CSV not yet generated for an older artefact | Link is simply not rendered (the `getBlobProperties` probe returns null) — no error text |

**Operator-facing logs** (never surfaced to users, never containing personal data):

| Event | Log |
|---|---|
| CSV generator threw | `console.error("[Publication] CSV generation error:", { artefactId, error })` |
| Generator returned `success: false` | `console.warn("[Publication] CSV generation failed:", { artefactId, error })` |
| Notify send failed | existing path — errors are email-redacted by the regex in `sendPublicationNotificationsForArtefact` before logging |

## 11. Navigation

- The download block sits **inline on the publication page**, directly under the last-updated line and above the "Important information" details component. No interstitial download page, and no disclaimer page — the SJP two-step (`list-download-disclaimer` → `list-download-files`) exists because SJP carries reporting-restriction warnings; these eight tribunal lists do not, so adding an extra click would be unjustified friction.
- Both links use `<a … download>` and are ordered PDF first, CSV second, so the existing PDF affordance stays where users already expect it.
- Selecting either link triggers a browser download and leaves the user on the publication page — no redirect, no history entry to back out of.
- The email links point at GOV.UK Notify's document-download service (not at CaTH), and expire after 1 week, matching the existing PDF and Excel behaviour.
- No change to the `/hearing-lists` → court → list navigation path.

## 12. Accessibility

WCAG 2.2 AA. The block is plain text and links, so the requirements are modest but specific:

- **Heading hierarchy** — the download block's `<h2 class="govuk-heading-s">` sits between the page `<h1>` and the existing "Search Cases" `<h2>`. No level is skipped.
- **Link text is self-describing** — "Download this list as a CSV file (8.1KB)" states format and size in the link text itself, so it makes sense out of context in a screen-reader link list. Never use "click here" or a bare "CSV".
- **File format and size announced** — required by WCAG 2.2 for downloads that leave the page context; the size comes from `getBlobProperties` and is rendered inside the anchor.
- **List semantics** — the two links are `<li>` children of a `govuk-list` `<ul>`, so assistive tech announces "list of 2 items".
- **Not colour-dependent** — the PDF/CSV distinction is carried entirely by text; no icons, no colour coding.
- **Keyboard** — standard anchors, reachable in DOM order (last-updated paragraph → PDF link → CSV link → Important information details), default GOV.UK focus styles, no `tabindex` overrides, no keyboard trap.
- **Touch targets** — links sit in a `govuk-list` with default GOV.UK line spacing, keeping the 44×44px target and 24px spacing requirement satisfied on mobile.
- **Welsh parity** — with `?lng=cy` the heading, both link texts and the hint render from `cy.ts`; the CSV itself uses Welsh column headings.
- **The hint** is a `govuk-body govuk-hint` paragraph, not `aria-describedby`-wired to a control (there is no form control here), so it reads naturally in document order.
- **No JavaScript** — the block is server-rendered; downloads work with JS disabled.
- Run axe inline in the E2E journey for at least one of the eight pages.

## 13. Test Scenarios

**Unit — `libs/list-types/common/src/csv/csv-utilities.test.ts`**
* Quotes every cell and escapes an embedded double quote as `""`
* Preserves an embedded comma and an embedded newline within a single quoted cell
* Prepends a UTF-8 BOM and joins rows with CRLF
* `saveCsvToStorage` uploads to the `publications` container with blob key `<artefactId>.csv` and content type `text/csv; charset=utf-8`

**Unit — `libs/list-types/common/src/csv/non-strategic-csv-generator.test.ts`**
* Emits the metadata preamble, a blank separator row, the header row, then one row per hearing
* Uses Welsh preamble labels and Welsh column headings when locale is `cy`
* Emits an empty cell for a hearing field that is absent from the rendered row
* Produces preamble plus header row and no data rows for an empty hearings array
* Prefixes a cell beginning `=` with an apostrophe (formula-injection guard)
* Returns `{ success: false, error }` rather than throwing when the blob upload rejects

**Unit — per package, e.g. `libs/list-types/grc-weekly-hearing-list/src/csv/csv-generator.test.ts`**
* Emits the nine GRC columns in the documented order
* Delegates row formatting to `renderGrcWeeklyHearingListData` so CSV dates and times match the PDF
* (CIC) Reads the `"venue/platform"` field despite the slash in the key
* (SIAC/POAC/PAAC) Uses the correct court name and list title for each of the three `listTypeName` values

**Unit — `libs/publication/src/processing/service.test.ts`**
* `listTypeHasCsv` returns true for all eight in-scope `listTypeName` values and false for `CIVIL_DAILY_CAUSE_LIST`
* `processPublication` sets `csvPath` to `<artefactId>.csv` when the generator succeeds
* `processPublication` omits `csvPath`, still returns the PDF path, and still sends notifications when the CSV generator fails
* `processPublication` passes `csvPath` through to `sendPublicationNotificationsForArtefact`
* No registry key is a numeric list type id

**Unit — `libs/notifications/src/govnotify/template-config.test.ts`**
* Returns the PDF+CSV template when `hasPdf` and `hasCsv` are true and `hasExcel` is false
* Returns the unchanged PDF+Excel template when `hasPdf` and `hasExcel` are true
* Returns the no-links template when no file is available, and when `filesUnder2MB` is false
* Throws a named error when `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` is unset and that branch is selected

**Unit — `libs/notifications/src/notification/notification-service.test.ts`**
* Downloads the CSV from the `publications` container and includes `csvBuffer` when it is under 2MB
* Omits `csvBuffer` and does not select the CSV template when the CSV is 2MB or larger
* Still sends the email when the CSV blob is absent
* Runs the PDF, Excel and CSV downloads concurrently

**Unit — `libs/notifications/src/govnotify/govnotify-client.test.ts`**
* Sets `csv_link_to_file` and `csv_link_text` when `csvBuffer` is supplied
* Calls `prepareUpload` with `confirmEmailBeforeDownload: false` and `retentionPeriod: "1 week"`
* Leaves CSV personalisation unset when no `csvBuffer` is supplied

**Unit — `libs/public-pages/src/routes/api/csv/[artefactId]/download.test.ts`**
* Returns the CSV with attachment disposition and no-store cache headers for a valid, in-window, permitted artefact
* Returns 400 for a non-UUID `artefactId`
* Returns 403 when `canAccessPublicationData` denies the user
* Returns 410 when the artefact display window has expired
* Returns 404 when the CSV blob is missing
* Reads from the `publications` container, not the default `artefact` container

**Unit — `apps/web/src/pages/(list-types)/list-type-handler.test.ts`**
* `buildDownloadOptions` returns both PDF and CSV entries with formatted sizes when both blobs exist
* Omits the CSV entry for a list type absent from the CSV registry
* Omits the CSV entry when the blob probe returns null
* Returns an empty array (no throw) when blob storage errors

**Template — e.g. `grc-weekly-hearing-list.njk.test.ts`**
* Renders an `h2` "Download this list" and a two-item `govuk-list` when both options are supplied
* Renders link text containing the format and the size, with the `download` attribute set
* Renders no download block at all when `downloadOptions` is empty
* Renders Welsh heading, link texts and hint under the `cy` locale

**E2E — `e2e-tests/tests/tribunal-list-csv-download.spec.ts`, one journey test tagged `@nightly`**
* Publish a GRC list as an admin, view it as a verified user, assert both download links are present with sizes, download the CSV and assert its first data row matches the first table row on the page, switch to Welsh and assert the translated download heading and link text, run an axe scan inline, and tab to the CSV link and activate it with Enter

## 14. Assumptions & Open Questions

**Assumptions**

1. "CSV download file" means a **generated** CSV derived from the published JSON — not the admin's original uploaded `.xlsx` re-exported. The eight list types are JSON/Excel-upload lists, not flat files.
2. All eight already have working PDF generation and PDF email links, so "CSV and PDF downloadable files are made available" needs no PDF work; only the CSV and the two-link email are new.
3. The CSV column set and order mirror the existing `ExcelConverterConfig` field order, which is also the PDF table column order. If product wants a different CSV column order, that is a content decision to confirm before build.
4. CSV rows are the *rendered* values (dates as `dd/MM/yyyy`, times as `10:30am`) rather than raw ISO values, so the CSV matches the PDF exactly. This is the literal reading of AC 2, but it makes the CSV less machine-friendly than ISO values would be.
5. The 2MB Notify attachment ceiling applies to the CSV as it already does to the PDF and Excel. CSVs for these lists are a few KB, so this will effectively never bite.
6. Notify's 1-week document retention is acceptable for CSV, as it already is for PDF.
7. Only forward-looking publications get a CSV. Artefacts published before this change have no `.csv` blob and will show only the PDF link. No backfill is in scope.
8. Existing `.xlsx` behaviour for SJP and Magistrates lists is untouched; this ticket adds a parallel CSV path rather than replacing Excel.
9. `sanitiseCellValue`'s existing four-character guard list (`=`, `+`, `-`, `@`) is sufficient; it is reused rather than re-specified.

**Open questions**

1. **Metadata preamble — confirm with product.** AC 2 taken literally requires the PDF's list title / list date / last-updated / data source in the CSV, which this spec implements as a four-row key/value preamble. It makes the file non-conformant with a single-header-row CSV parser, and it differs from the existing `.xlsx` generators, which emit only the table. The alternatives are (a) drop the preamble and emit table-only, matching the existing Excel exports and maximising machine-readability, or (b) repeat the metadata as four extra columns on every row. **Recommendation: (a) table-only**, with the metadata carried by the filename and the email body — but AC 2 as written says otherwise, so product must decide.
2. **New Notify template.** A PDF+CSV email template must be authored in the GOV.UK Notify console before this can ship, and its UUID added to both Helm values files. Who owns that, and is there an existing template we should extend rather than create?
3. **Should the CSV also be pushed to third parties?** `sendThirdPartyPublications` currently receives `pdfPath` and `flatFilePath` but not `excelPath`. This spec does not add `csvPath` to it. Confirm no third-party consumer wants CSV.
4. **Container mismatch in the SJP download path (pre-existing bug, out of scope).** `sjp-download-shared.ts` calls `getBlobProperties`/`downloadBlob` without a container argument, so both default to `CONTAINER.ARTEFACT`, while PDFs and `.xlsx` are written to `CONTAINER.PUBLICATIONS` (`pdf-utilities.ts:36`, `excel-utilities.ts`). The SJP download page therefore appears unable to find the files it advertises. The new CSV route passes `CONTAINER.PUBLICATIONS` explicitly. Worth raising as a separate defect.
5. **The existing PDF download route has no authorisation check and reads from local disk.** `libs/public-pages/src/routes/pdf/[artefactId]/download.ts` reads `storage/temp/uploads/<id>.pdf` from the filesystem and checks only the display window, not `canAccessPublicationData`. The new CSV route is blob-backed and does check access, so the two routes will behave differently for restricted publications. Should the PDF route be brought in line as part of this ticket, or tracked separately? **Recommendation: separate ticket, but flag it now** — it is a live authorisation gap, not a cosmetic inconsistency.
6. **Welsh CSVs.** A CSV is only generated in the locale of the publication. If both an English and a Welsh artefact exist for the same hearing list, each gets its own CSV under its own artefact id — confirm that is the expected behaviour rather than one bilingual file.
7. **Should the other 30+ list types get CSV too?** The ticket says "all the Tribunal hearing lists not covered in the other tickets", implying sibling tickets cover the rest. The generic `createNonStrategicCsvGenerator` built here will cover any other flat non-strategic list with a one-file config, so those tickets should reuse it rather than write new generators.


### Comment by OgechiOkelu on 2026-08-12T17:02:13Z

@plan 
