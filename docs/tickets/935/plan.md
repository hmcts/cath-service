# Technical Plan — Issue #935: Additional download file formats for Upper Tribunal hearing lists

## 1. Technical Approach

### 1.1 What exists today (verified against the codebase)

| Concern | Current state |
|---|---|
| PDF generation | `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (keyed by `listTypeName`); all nine UT list types are registered and produce `<artefactId>.pdf` in the `publications` blob container via `savePdfToStorage` (`libs/list-types/common/src/pdf/pdf-utilities.ts`) |
| Second-format generation | `EXCEL_GENERATOR_REGISTRY` in the same file writes `<artefactId>.xlsx` — **SJP and Magistrates only**. No UT list type is in it |
| CSV anywhere in the publication pipeline | **None.** The only CSV code in the repo is the unrelated reference-data admin upload/download (`libs/system-admin-pages`, uses `papaparse@5.5.4`) |
| Email | `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:457`) fetches `<artefactId>.pdf` + `<artefactId>.xlsx` by convention, filters each to `< 2MB`, and `getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:15`) picks a Notify template. `sendEmail` sets `pdf_link_to_file` / `excel_link_to_file` via `prepareUpload` |
| UT hearing list pages | Five page dirs under `apps/web/src/pages/(list-types)/`, six templates (UTIAC JR has a regional and a London variant). **None of them renders any download link.** Three controllers pass a dead `pdfDownloadUrl` that no template consumes |
| Download route pattern | `apps/web/src/pages/(list-types)/sjp-download-shared.ts` — `handleBlobDownload` (query `artefactId` + `type`, UUID regex, allow-list `pdf`/`xlsx`), `getAvailableFiles`, `formatFileSize`, plus a separate `list-download-files` interstitial page used by SJP behind a verified-user gate and a T&Cs disclaimer |

### 1.2 Scope: nine list type names

The ticket names five list families; UTIAC Judicial Review is five separate list types with two different column shapes. All nine `listTypeName` values (never `listTypeId` — `list_type.id` is autoincrement and differs per environment):

| Ticket list | `listTypeName` | Lib |
|---|---|---|
| UT (Tax and Chancery Chamber) Daily | `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list` |
| UT (Lands Chamber) Daily | `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-lands-chamber-daily-hearing-list` |
| UT (Administrative Appeals Chamber) Daily | `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-administrative-appeals-chamber-daily-hearing-list` |
| UTIAC Statutory Appeal Daily | `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `utiac-statutory-appeal-daily-hearing-list` |
| UTIAC Judicial Review Daily | `UTIAC_JR_LONDON_DAILY_HEARING_LIST`, `UTIAC_JR_LEEDS_DAILY_HEARING_LIST`, `UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST`, `UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST`, `UTIAC_JR_CARDIFF_DAILY_HEARING_LIST` | `utiac-jr-daily-hearing-list` |

All nine are `defaultSensitivity: "Public"` (`libs/list-types/common/src/list-type-data.ts`). Because they are public, **no verified-user gate and no terms-and-conditions interstitial are required** — the SJP disclaimer journey exists because SJP lists are `Classified`. Download links go directly on the hearing list page.

### 1.3 Strategy

Three independent, additive changes, each mirroring an existing pattern so there is no new architecture:

1. **Generate the CSV at publication time**, in a `CSV_GENERATOR_REGISTRY` that mirrors `EXCEL_GENERATOR_REGISTRY` exactly — same registry-by-name shape, same swallow-and-log failure policy. `<artefactId>.csv` goes to `CONTAINER.PUBLICATIONS` (`.csv → text/csv` is already in `CONTENT_TYPE_MAP`, `libs/publication/src/file-storage/content-type.ts`).
2. **Add the CSV to the subscription email**, mirroring the existing Excel buffer path end to end (`csvBuffer` → `prepareUpload` → `csv_link_to_file`), with one new Notify template ID.
3. **Surface both formats on the hearing list page**, inline (no interstitial), via a shared Nunjucks partial and a shared per-page `download.ts` route handler.

### 1.4 Key architecture decision: the CSV reuses the PDF's renderer

AC 2 ("all the data fields available in the PDF must be on the CSV") is satisfied structurally, not by copying field lists. Each UT PDF generator calls a renderer (`renderUtlcDailyHearingListData`, `renderUtiacJrLeedsDailyHearingListData`, …) that returns `{ header, hearings }`, and the PDF template renders `hearings` through a fixed `<thead>`. The CSV generator calls **the same renderer** and serialises `hearings` through a declared column list matching that `<thead>`. Consequences:

- Cell values are byte-identical to the PDF (same date/time formatting) — there is no second formatting code path that can drift.
- Column headers come from the same `loadTranslations(locale, importEn, importCy).tableHeaders` the PDF uses, so Welsh publications get Welsh headers for free.
- The only per-list-type code is a `CsvColumn[]` array. A column added to a PDF template that isn't added to the array is caught by the parity test in §5.

**Verified PDF column orders** (from each `pdf-template.njk` `<thead>`, which the CSV column arrays must mirror):

| `listTypeName` | Columns, in PDF order |
|---|---|
| `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `time`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `hearingType`, `venue`, `additionalInformation` |
| `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `time`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `hearingType`, `venue`, `modeOfHearing`, `additionalInformation` |
| `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `time`, `appellant`, `caseReferenceNumber`, `judges`, `members`, `modeOfHearing`, `venue`, `additionalInformation` |
| `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `hearingTime`, `appellant`, `representative`, `appealReferenceNumber`, `judges`, `hearingType`, `location`, `additionalInformation` |
| `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | `hearingTime`, `caseTitle`, `representative`, `caseReferenceNumber`, `judges`, `hearingType`, `location`, `additionalInformation` |
| `UTIAC_JR_{LEEDS,MANCHESTER,BIRMINGHAM,CARDIFF}_DAILY_HEARING_LIST` | `venue`, `judges`, `hearingTime`, `caseReferenceNumber`, `caseTitle`, `hearingType`, `additionalInformation` |

Two renderer signatures exist and the factory must accommodate both: UTCC/UTLC/UTAAC renderers take `{ locale, contentDate, lastReceivedDate, listTitle }`; UTIAC statutory-appeal and JR renderers additionally require `courtName`. London also overrides headers with `londonTableHeaders` / `londonTableHeadersCy` rather than `t.tableHeaders`, so the factory takes a header-resolver override.

### 1.5 What the CSV deliberately does not contain

Only the hearing table: one header row, then one row per hearing. The PDF's surrounding prose (list title, hearing date, last-updated line, opening statement, data source, caution note) is **not** emitted as banner rows above the header — preamble rows break standard CSV parsers and spreadsheet imports, and they defeat the screen-reader column-header announcement that makes the file accessible. Flagged for confirmation in §6.

### 1.6 TEMPLATE SOURCE

**n/a** — no new rendered page or list-type view is introduced. The download markup is a small shared partial modelled on the in-repo SJP `list-download-files.njk` pattern; the six existing UT templates are edited in place.

---

## 2. Implementation Details

### 2.1 Shared CSV utilities — `libs/list-types/common/src/csv/csv-utilities.ts` (new)

Mirrors `pdf/pdf-utilities.ts` and `excel/excel-utilities.ts`.

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

- `buildCsvBuffer` resolves each `headerKey` against `headers` (falling back to the key itself if a translation is missing), maps each row to `{ [headerString]: value }` in column order, and calls `Papa.unparse(data, { columns: headerStrings })`. `Papa.unparse` handles quoting/escaping of embedded commas, quotes and newlines.
- Every cell: `String(value ?? "")` then the **existing** `sanitiseCellValue` from `../excel/excel-utilities.js` (prefixes `= + - @` with an apostrophe). Do not duplicate that function.
- Prepend a UTF-8 BOM (`﻿`) so Excel renders Welsh diacritics (`â`, `ŵ`, `ŷ`) correctly.
- `saveCsvToStorage` → `uploadBlob(`${artefactId}.csv`, buffer, "text/csv", CONTAINER.PUBLICATIONS)`, returns `{ success: true, csvPath, sizeBytes, exceedsMaxSize }`.
- Dependencies: add `"papaparse": "5.5.4"` and `"@types/papaparse": "5.5.2"` to `libs/list-types/common/package.json` — the **same pinned versions** already used by `libs/system-admin-pages`. Do not introduce a second version.
- Export from `libs/list-types/common/src/index.ts`.

### 2.2 Shared UT CSV generator factory — `libs/list-types/upper-tribunal-common/src/csv-generator.ts` (new)

Placed next to `createUtDailyHearingListPdfGenerator`, whose shape it mirrors:

```ts
export function createUtDailyHearingListCsvGenerator<T>(params: {
  renderFn: (data: T, options: DailyHearingListRenderOptions & { courtName?: string }) => { hearings: unknown[] };
  importEn: () => Promise<{ en: Record<string, unknown> }>;
  importCy: () => Promise<{ cy: Record<string, unknown> }>;
  columns: CsvColumn[];
  courtName?: string;                                              // UTIAC statutory appeal + JR renderers require it
  resolveHeaders?: (translations: Record<string, unknown>, locale: string) => Record<string, string>;  // default: translations.tableHeaders; London overrides
  resolveListTitle?: (translations: Record<string, unknown>) => string;                               // default: translations.pageTitle
}): (options: BasePdfGenerationOptions<T> & { contentDate: Date }) => Promise<CsvGenerationResult>;
```

Flow: `loadTranslations` → `renderFn(jsonData, { locale, contentDate, lastReceivedDate: new Date().toISOString(), listTitle, courtName })` → `buildCsvBuffer(hearings, columns, headers)` → `saveCsvToStorage`. All errors returned as `createCsvErrorResult(error)`; the factory never throws. Export from `libs/list-types/upper-tribunal-common/src/index.ts`.

### 2.3 Per-list-type CSV generators (column arrays only)

| New file | Export(s) |
|---|---|
| `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtccDailyHearingListCsv` |
| `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtlcDailyHearingListCsv` |
| `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtaacDailyHearingListCsv` |
| `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtiacStatutoryAppealDailyHearingListCsv` |
| `libs/list-types/utiac-jr-daily-hearing-list/src/csv/csv-generator.ts` | `generateUtiacJrDailyHearingListCsv` (regional 7-column shape) |
| `libs/list-types/utiac-jr-daily-hearing-list/src/csv/csv-generator-london.ts` | `generateUtiacJrLondonDailyHearingListCsv` (London 8-column shape, `resolveHeaders` → `londonTableHeaders`/`londonTableHeadersCy`) |

Each declares its `CsvColumn[]` in the §1.4 order and is exported from its lib's `src/index.ts`.

### 2.4 Publication pipeline — `libs/publication/src/processing/service.ts`

Add after the Excel block, mirroring it:

```ts
interface GenerateCsvParams { artefactId: string; listTypeName: string; contentDate: Date; locale: string; provenance?: string; jsonData: unknown; logPrefix?: string; }
type CsvGenerator = (params: GenerateCsvParams) => Promise<CsvGenerationResult>;

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = { /* nine entries, keyed by listTypeName */ };

export function listTypeHasCsv(listTypeName: string | undefined): boolean;
export async function generatePublicationCsv(params: GenerateCsvParams): Promise<{ hasCsv?: boolean; error?: string }>;
```

- The four regional JR names share one generator reference; London uses its own.
- In `processPublication`, add a third generation step after the Excel step, keyed on `pdfResult.listTypeName` (already resolved from the DB inside `generatePublicationPdf` — **no extra query**), and set `result.csvPath = `${artefactId}.csv`` on success.
- `ProcessPublicationResult` gains `csvPath?: string`.
- Failure policy identical to Excel: registry miss → `{}` silently; generator error → `console.warn`/`console.error` and continue. **A CSV failure must never block the PDF, the notifications or the third-party push.**

### 2.5 Notifications — `libs/notifications`

- `SendEmailParams` (`govnotify/govnotify-client.ts:32`) gains `csvBuffer?: Buffer`. When present: `prepareUpload(csvBuffer, { confirmEmailBeforeDownload: false, retentionPeriod: "1 week" })` → `personalisation.csv_link_to_file`, and `personalisation.csv_link_text = "Download CSV version"` (matching the existing hard-coded English `pdf_link_text` / `excel_link_text` convention).
- `getSubscriptionTemplateId` gains `hasCsv: boolean`. New branch, placed after the SJP excel-only branch and before the `hasPdf && hasExcel` branch:
  - `hasPdf && hasCsv` → `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`.
  - **Decision (divergence worth noting):** if that variable is unset, log a warning and **fall back to the existing PDF-only template** rather than throwing. Throwing would turn a missing config value into total notification failure for UT subscribers who receive working PDF-only emails today — a regression strictly worse than shipping without the CSV link. Existing branches keep their throw-on-unset behaviour so SJP/Magistrates are untouched. Confirmation requested in §6.
- `buildEmailDataWithFiles` (`notification/notification-service.ts:457`) additionally does `downloadBlob(`${artefactId}.csv`, CONTAINER.PUBLICATIONS)`, applies the same `< MAX_PDF_SIZE_BYTES` filter, folds `hasCsv` into the template-ID call and `csvUnder2MB ? csvBuffer : undefined` into `EmailTemplateData`.
- `EmailTemplateData` gains `csvBuffer?: Buffer`; both senders (`processUserNotification` ~line 383 and `processListTypeUserNotification` ~line 606) pass it to `sendEmail`.
- No change to `PublicationEvent` / `ListTypePublicationEvent` — the CSV is located by artefact-ID convention, exactly as the Excel file already is.

### 2.6 New environment variable

`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` — a Notify template rendering both `((pdf_link_to_file))` and `((csv_link_to_file))`.

Wire into: `apps/web/.env.example`, `apps/web/helm/values.yaml`, `apps/web/helm/values.dev.yaml`, `apps/api/helm/values.yaml` (alongside the existing `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` entries). **Creating the template in the GOV.UK Notify console is a delivery dependency, not a code change** — see §6.

### 2.7 Shared download helpers — `apps/web/src/pages/(list-types)/list-download-shared.ts` (new)

Generic, container-explicit versions of the SJP helpers:

```ts
export async function handleListBlobDownload(req: Request, res: Response, allowedTypes: Set<string>): Promise<Response>;
export async function getAvailableDownloadFiles(artefactId: string, prefix: string, t: DownloadLinksContent): Promise<DownloadFile[]>;
export function formatFileSize(bytes: number): string;
```

- `handleListBlobDownload` validates `artefactId` against the same `UUID_REGEX` and `type` against the passed allow-list (`new Set(["pdf", "csv"])`), builds the blob key **only** from validated values, then `downloadBlob(key, CONTAINER.PUBLICATIONS)` → 404 if null → responds with `getContentTypeFromExtension`, `Content-Disposition: attachment`, and `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate`.
- `getAvailableDownloadFiles` probes `getBlobProperties(`${artefactId}.pdf`, CONTAINER.PUBLICATIONS)` and `…csv` **in parallel** and returns `{ type, url, linkText, sizeLabel }[]` — empty array when neither exists.
- `formatFileSize` moves here; `sjp-download-shared.ts` imports it from this module so there is one implementation. SJP's own behaviour is otherwise left byte-identical.

**Existing defect not to replicate:** `sjp-download-shared.ts` calls `downloadBlob(fileName)` and `getBlobProperties(...)` **without a container**, so both default to `CONTAINER.ARTEFACT` (`libs/azure-blob/src/blob-client.ts:45,65`) while PDFs and Excel files are written to `CONTAINER.PUBLICATIONS`. The new code passes `CONTAINER.PUBLICATIONS` explicitly. Fixing SJP is out of scope — raise separately (§6).

### 2.8 Download routes and page links

- Five new 4-line route files, following the existing `sjp-*/download.ts` convention (auto-discovered; `(list-types)` adds no URL prefix):
  `apps/web/src/pages/(list-types)/<ut-page>/download.ts` → `GET /<ut-page>/download?artefactId=<uuid>&type=pdf|csv`.
  No `requireVerified` middleware — these lists are public.
- New shared partial `libs/web-core/src/views/components/list-download-links.njk`, included as `{% include "components/list-download-links.njk" %}` (web-core is already on `modulePaths`). Renders **nothing** when `downloadFiles` is empty:

```njk
{% if downloadFiles.length %}
  <h2 class="govuk-heading-m govuk-!-margin-top-6">{{ downloadLinks.heading }}</h2>
  <ul class="govuk-list">
    {% for file in downloadFiles %}
      <li><a class="govuk-link" href="{{ file.url }}" download>{{ file.linkText }} ({{ file.sizeLabel }})</a></li>
    {% endfor %}
  </ul>
{% endif %}
```

- Include it in all **six** UT templates, directly after the "Last updated" paragraph and above the "Important information" `<details>`.
- Each of the five UT controllers `await getAvailableDownloadFiles(artefact.artefactId, "/<ut-page>", t.downloadLinks)` and passes `downloadFiles` + `downloadLinks` to `res.render`. `RenderCallback` in `list-type-handler.ts` already returns `Promise<void> | void`, so no handler change is needed.
- Delete the dead `pdfDownloadUrl` from the three controllers that pass it (UTLC, UTCC, UTAAC) — no template consumes it, and it points at an API route that reads the local filesystem, not blob storage.

### 2.9 Content — `libs/list-types/common/src/locales/{en,cy}.ts`

One shared block (all nine list types share it), exported from `libs/list-types/common/src/index.ts` as `downloadLinksEn` / `downloadLinksCy` and re-exposed on each UT lib's locale object as `downloadLinks` so templates can read `t.downloadLinks`:

```ts
// en.ts
export const downloadLinks = {
  heading: "Download this list",
  pdfLinkText: "Download this list as a PDF",
  csvLinkText: "Download this list as a CSV"
};
```

`cy.ts` uses `[WELSH TRANSLATION REQUIRED: '…']` placeholders per the CLAUDE.md convention, with the same keys (parity test in §5).

CSV **column headers require no new content** — they reuse each lib's existing `tableHeaders` in `en.ts`/`cy.ts`.

### 2.10 Database / API

No schema change. `artefact` has no file-path columns (the PDF/Excel paths are already convention-based), so nothing to migrate and no seed-data change. No new API endpoint.

---

## 3. Error Handling & Edge Cases

| Condition | Behaviour |
|---|---|
| CSV generator throws | `console.error("[Publication] CSV generation error:", { artefactId, error })`, swallowed. PDF, notifications and third-party push unaffected |
| Generator returns `success: false` | `console.warn(...)`, swallowed |
| Unregistered list type | Silent no-op (registry miss returns `{}`) — same as Excel |
| Empty hearing array | Valid CSV containing **only** the header row. Not an error, not a skipped file |
| Welsh publication (`locale: "cy"`) | Welsh `tableHeaders` in the header row; UTF-8 BOM so Excel renders diacritics |
| Cell contains `,` `"` or newline | Quoted/escaped by `Papa.unparse` |
| Cell starts with `= + - @` | Prefixed with `'` by the shared `sanitiseCellValue` (formula-injection guard) |
| Cell is `null`/`undefined` | Empty string, never the literal `"null"` |
| CSV ≥ 2MB | Blob still written (page download works); `exceedsMaxSize: true`; email link suppressed — matches existing PDF behaviour |
| CSV blob missing at email time | Email sent via the PDF-only template, no CSV link, no error to the user |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` unset | Warn and fall back to the PDF-only template (§2.5 decision) |
| Malformed/missing `artefactId` or `type` outside the allow-list (incl. `../../secret`) | `400 { "error": "Invalid request" }`; blob key never built from raw input |
| Artefact/blob not found | `404`. Error responses must not echo the requested filename or blob key |
| Neither PDF nor CSV exists | Download section not rendered at all — no empty heading, no disabled link |
| Artefacts published before this change | No CSV; the section shows PDF only. No backfill (§6) |
| Page-render cost | Two parallel blob HEAD requests per UT page view. Acceptable; if latency becomes a problem the fix is caching or persisting paths on the artefact, not a change here |

**Validation rules for `/<ut-page>/download`:** `artefactId` must match `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` (400); `type` must be exactly `pdf` or `csv` via allow-list, not a pattern (400); blob must exist in `publications` (404). Publication JSON is already schema-validated upstream by `validateListTypeJson` before `processPublication`, so the CSV generator does not re-validate.

---

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| **CSV and PDF downloadable for all UT hearing lists** | `CSV_GENERATOR_REGISTRY` covers all nine `listTypeName` values; the shared partial renders one link per available format on all six templates. The PDF already exists for all nine — this ticket makes it *reachable* from the page for the first time | Unit: registry invoked per list type name, `csvPath` set. Template: one `<a>` per `downloadFiles` entry. E2E: both links visible and downloadable |
| **All PDF data fields present in the CSV** | The CSV calls the same renderer as the PDF and serialises through a `CsvColumn[]` mirroring the PDF `<thead>`; no second formatting path | Unit parity test per list type: CSV header row and column count equal the PDF template's `<thead>` cells, same order; row values byte-identical to renderer output |
| **Links to both file types in the email notification** | `csvBuffer` → `prepareUpload` → `csv_link_to_file` + `csv_link_text`, with a new PDF+CSV Notify template selected by `getSubscriptionTemplateId` | Unit: template selection for `hasPdf && hasCsv`; `sendEmail` sets both personalisation keys; degradation when the CSV is missing/oversized. **End-to-end verification blocked until the Notify template exists (§6)** |

---

## 5. Test Plan

**Unit — `libs/list-types/common/src/csv/csv-utilities.test.ts`**: column order and resolved header row; header-only output for an empty array; quoting of commas/quotes/newlines; formula-injection prefixing; UTF-8 BOM; `null`/`undefined` → `""`; upload to `<artefactId>.csv` in `publications` with `text/csv`; `exceedsMaxSize` above 2MB while still `success: true`; error result (never a throw) when upload rejects.

**Unit — `libs/list-types/upper-tribunal-common/src/csv-generator.test.ts`**: renderer receives the expected options (including `courtName` when supplied); `resolveHeaders` override honoured; Welsh locale loads `cy`; failures returned as error results.

**Unit — one test file per UT lib (6 generators)**: header row and column count match that list type's PDF `<thead>` exactly, in order (**the direct test of AC 2**); Welsh headers under `locale: "cy"`; row values identical to the shared renderer's output; the four regional JR types share the 7-column shape while London uses its own 8-column shape.

**Unit — `libs/publication/src/processing/service.test.ts`**: CSV generated for each of the nine names with `csvPath` set; skipped silently for an unregistered type; a throwing generator is logged and swallowed while PDF/notifications/third-party push still complete; keyed on `listTypeName` with an arbitrary `listTypeId: 999` fixture.

**Unit — notifications**: new template returned for `hasPdf && hasCsv`; **regression** — PDF-only, PDF+Excel, SJP-excel-only and no-links selections unchanged; fallback + warning when the new env var is unset; `buildEmailDataWithFiles` attaches a CSV under 2MB and omits one at/above 2MB; missing CSV blob still sends; `sendEmail` sets `csv_link_to_file`/`csv_link_text` only when a buffer is supplied; both subscriber paths pass the buffer through.

**Unit — download route (per UT page, or one shared test of `list-download-shared.ts` plus thin per-page tests)**: CSV streamed as `text/csv` with `attachment`; PDF as `application/pdf`; 400 for missing/malformed `artefactId`; 400 for a `type` outside the allow-list including traversal attempts; 404 for unknown artefact and for a missing blob; reads from `publications`, not the default `artefact` container.

**Template tests (`*.njk.test.ts`, Cheerio structural assertions, no AAA comments)**: partial renders one `<li>`/`<a>` per `downloadFiles` entry with correct `href`, link text and size label; section including its `<h2>` absent when `downloadFiles` is empty; `<h2>` in the right position relative to the `<h1>` and the "Important information" `<details>`; Welsh strings under the `cy` locale; `Object.keys(en).sort()` equals `Object.keys(cy).sort()` for every modified locale file.

**E2E — one journey test tagged `@nightly`**: publish a UT fixture, open the page, assert both formats listed with sizes, download the CSV and assert its header row matches the on-page table headers, switch to Welsh and assert the translated heading, run axe inline at both languages, and reach + activate a download link by keyboard — all in a single test per the repo's minimum-test-count rule.

---

## 6. CLARIFICATIONS NEEDED

1. **Notify template ownership (blocks AC 3).** A new template rendering both `((pdf_link_to_file))` and `((csv_link_to_file))` must be created in the GOV.UK Notify console and its ID supplied as `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`. Who creates it, and is the wording of its download block agreed? Until it exists, AC 3 cannot be verified in any environment.
2. **Fallback vs. fail-loud when that variable is unset.** The plan falls back to the PDF-only template with a warning, so UT subscribers keep receiving working emails minus the CSV link. Confirm that is preferred over failing the notification outright (the behaviour every other branch of `getSubscriptionTemplateId` has).
3. **CSV contents: table only?** The CSV carries the hearing table and nothing else — no list title, hearing date or last-updated banner rows, because preamble rows break spreadsheet imports and CSV parsers. If the business needs the title/date inside the file, the least damaging option is repeated columns rather than banner rows. Confirm.
4. **Nine list types, not five.** UTIAC Judicial Review is five separate list types (London, Leeds, Manchester, Birmingham, Cardiff) with two different column shapes. All five are in scope here — confirm that matches expectation.
5. **Backfill.** Should CSVs be generated retrospectively for UT artefacts still inside their display window, so today's already-published lists gain the CSV option? Not specified; would need a one-off job re-reading each artefact's JSON from blob storage. Default assumption: no backfill.
6. **Welsh email content.** `csv_link_text` is hard-coded English, consistent with the existing `pdf_link_text`/`excel_link_text` — Welsh-language subscribers already receive English link text for the PDF. Should this ticket start fixing that, or is it separate work?
7. **Excel + CSV together.** No UT list type has an Excel file today, so a PDF+Excel+CSV combination cannot arise in scope and no such template is added. Confirm acceptable, otherwise the template matrix grows.
8. **Existing SJP download container defect.** `sjp-download-shared.ts` reads from the default `artefact` container while files are written to `publications` — this looks like a live defect in the SJP download journey, unrelated to this ticket but in the same area. Fix here, or raise as its own issue? Default assumption: raise separately.
