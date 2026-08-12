# Technical Plan — Issue #944

**Create additional file format (CSV) for the Download version of the Tribunals Hearing Lists**

---

## 1. Technical Approach

### 1.1 What exists today

All eight in-scope list types are **non-strategic** lists: an admin uploads an `.xlsx`, an
`ExcelConverterConfig` flattens it to a JSON array of hearings, and the JSON is rendered as HTML
(`apps/web/src/pages/(list-types)/…`) and as a PDF (`PDF_GENERATOR_REGISTRY`,
`libs/publication/src/processing/service.ts:147`). All eight already have a working PDF generator,
so **no PDF generation work is needed** — only CSV generation plus the email and page wiring.

There is **no CSV output anywhere in the publication path today**. `text/csv` appears only in
`libs/publication/src/file-storage/content-type.ts` (flat files *uploaded* as CSV) and in
`libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.ts` (reference-data ingest).

The closest analogue is `.xlsx` generation (SJP + Magistrates only):

| Concern | Existing code |
|---|---|
| Registry keyed by `listTypeName` | `EXCEL_GENERATOR_REGISTRY`, `libs/publication/src/processing/service.ts:361` |
| Orchestration | `generatePublicationExcel` (`service.ts:390`), called from `processPublication` (`service.ts:635`) |
| Blob write | `saveExcelToStorage`, `libs/list-types/common/src/excel/excel-utilities.ts:43` → `CONTAINER.PUBLICATIONS` |
| Cell hardening | `sanitiseCellValue` (prefixes `=`, `+`, `-`, `@` with `'`), `excel-utilities.ts:11` |
| Email attachment | `buildEmailDataWithFiles`, `libs/notifications/src/notification/notification-service.ts:457` |
| Notify link personalisation | `excel_link_to_file` / `excel_link_text`, `libs/notifications/src/govnotify/govnotify-client.ts:83` |
| Notify template selection | `getSubscriptionTemplateId`, `libs/notifications/src/govnotify/template-config.ts:15` |
| Blob-backed download with access checks | `getExcelForDownload`, `libs/public-pages/src/flat-file/flat-file-service.ts:81` |

### 1.2 List types in scope

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

All eight verified present in `libs/list-types/common/src/list-type-data.ts` and in
`PDF_GENERATOR_REGISTRY`.

### 1.3 Architecture decisions

**AD1 — One config-driven CSV generator, not eight bespoke ones.**
All eight produce a *flat array of hearing rows*. `createNonStrategicCsvGenerator` in
`libs/list-types/common/src/csv/` takes `{ en, cy, columns, render }` and returns a generator. Each
package contributes one small config file. This mirrors `createConverter` /
`createNonStrategicCsvGenerator` style already used for the upload converters, and means the ~30
other non-strategic list types can be added later with one config file each.

**AD2 — Reuse the existing `render*Data` functions; do not re-derive formatting.**
The CSV generator calls the *same* renderer the HTML page and PDF use
(e.g. `renderGrcWeeklyHearingListData`). Dates (`dd/MM/yyyy`) and times therefore cannot drift
between PDF and CSV, which is exactly what AC2 requires. Only the `hearings` half of the renderer's
output is consumed (see AD3).

**AD3 — CSV is table-only: one header row + one row per hearing. No metadata preamble.**
This matches the existing `.xlsx` generators, keeps the file parseable by any CSV reader, and reads
"all the data fields available in the PDF" as *the hearing data fields* (the PDF table columns) —
not the PDF page furniture (list title, last-updated line, data source). **Flagged as clarifying
question Q1**; if product wants the metadata, it is an additive change inside the one shared
generator.

**AD4 — Registry keyed on the stable `listTypeName` string, never `listTypeId`.**
`CSV_GENERATOR_REGISTRY` is keyed exactly like `EXCEL_GENERATOR_REGISTRY`. `ListType.id` is
autoincrement and differs per environment.

**AD5 — CSV generation failure must never fail a publication.**
`generatePublicationCsv` swallows every error and returns `{}`, identical to
`generatePublicationExcel` (`service.ts:390-414`). A broken CSV must not block the PDF, the
notifications, or the third-party push.

**AD6 — The email path needs no new plumbing through `processPublication`.**
`buildEmailDataWithFiles` (`notification-service.ts:457`) does **not** use the `excelPath` it is
handed — it probes blob storage directly for `${artefactId}.xlsx`. The CSV follows the same
pattern: probe `${artefactId}.csv`. So `csvPath` does **not** need threading through
`SendNotificationsParams` / `PublicationEvent`. (This corrects the spec comment on the issue, which
proposed threading it.) `csvPath` is still added to `ProcessPublicationResult` because callers and
tests assert on it.

**AD7 — Downloads are served from a new blob-backed route covering both formats.**
The existing PDF route `libs/public-pages/src/routes/pdf/[artefactId]/download.ts` reads
`storage/temp/uploads/<id>.pdf` **from the local filesystem**, while `savePdfToStorage`
(`pdf-utilities.ts:36`) writes PDFs to blob `CONTAINER.PUBLICATIONS`. It also performs **no**
`canAccessPublicationData` check. Separately, three Upper Tribunal pages render a dead
`pdfDownloadUrl: "/api/pdf/<id>/download"` — no such route exists (the route mounts at
`/pdf/...`) and no template consumes the variable.

Consequently a page-level PDF link cannot reuse the existing route and still work. One new route
serves both generated formats from blob storage with proper access checks:

`GET /api/publication-file/:artefactId/download?format=pdf|csv`

The legacy `/pdf/...` route is left untouched (out of scope) but flagged as Q5.

**AD8 — Download guard logic is factored out, not copied.**
`getExcelForDownload` (`flat-file-service.ts:81`) already implements exactly the required guard
sequence (exists → display window → `canAccessPublicationData` → blob fetch) for a *generated*
publication file. A single `getGeneratedFileForDownload(artefactId, format, user)` is added and
`getExcelForDownload` is refactored to delegate to it, so there is one copy of the guard.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

(No new rendered page or list-type view. All eight pages already exist; this ticket adds a download
block partial to them and a new API download route. The `migrate-pip-pages` skill is not used.)

### 2.1 New shared CSV utilities — `libs/list-types/common/src/csv/`

**`csv-utilities.ts`**

```ts
export function toCsvBuffer(rows: string[][]): Buffer
export async function saveCsvToStorage(artefactId: string, buffer: Buffer): Promise<{ csvPath: string }>
```

- Every cell is unconditionally wrapped in `"` and embedded `"` doubled (RFC 4180). Unconditional
  quoting removes all branching around commas, newlines and the injection-guard apostrophe.
- Rows joined with `\r\n`; a UTF-8 BOM is prepended so Excel on Windows renders Welsh diacritics.
- `saveCsvToStorage` → `uploadBlob(\`${artefactId}.csv\`, buffer, "text/csv; charset=utf-8", CONTAINER.PUBLICATIONS)`,
  returning `{ csvPath: \`${artefactId}.csv\` }`. Exact mirror of `saveExcelToStorage`.
- **Reuse** `sanitiseCellValue` from `excel/excel-utilities.ts` — do not duplicate it. Note it
  indexes `value[0]`, so it must only ever be called with a string; the generator coerces
  `null`/`undefined` to `""` first.

**`non-strategic-csv-generator.ts`**

```ts
interface NonStrategicCsvColumn {
  headerKey: string;   // key inside the locale object's tableHeaders
  fieldName: string;   // key on the rendered hearing row
}

interface NonStrategicCsvConfig<T> {
  en: { tableHeaders: Record<string, string> };
  cy: { tableHeaders: Record<string, string> };
  columns: NonStrategicCsvColumn[];
  render: (data: T, opts: { locale: string; courtName: string; contentDate: Date; lastReceivedDate: string; listTitle: string })
    => { hearings: Record<string, unknown>[] };
}

export function createNonStrategicCsvGenerator<T>(config: NonStrategicCsvConfig<T>):
  (params: GenerateCsvParams) => Promise<CsvGeneratorResult>
```

Behaviour:
1. `t = locale === "cy" ? config.cy : config.en`.
2. Call `config.render(jsonData, { locale, courtName: "", contentDate, lastReceivedDate: contentDate.toISOString(), listTitle: "" })`.
   Only `hearings` is consumed; the header fields are irrelevant to a table-only CSV, so the
   header-only options are passed as neutral values. A short comment records why.
3. Header row: `config.columns.map(c => t.tableHeaders[c.headerKey])`.
4. One row per hearing: `config.columns.map(c => sanitiseCellValue(String(hearing[c.fieldName] ?? "")))`.
5. `toCsvBuffer` → `saveCsvToStorage` → `{ success: true, csvPath }`. On throw, return
   `{ success: false, error }` — never rethrow.

Export both modules from `libs/list-types/common/src/index.ts`.

### 2.2 Per-package CSV config — six new files

`libs/list-types/<package>/src/csv/csv-generator.ts`, each exporting one generator built from the
shared factory and exported from the package's `src/index.ts`.

Column order is taken verbatim from the existing renderer output order, which is also the PDF table
column order and the `ExcelConverterConfig` field order — so upload → PDF → CSV stay in lockstep.
Field names below are the **rendered** field names (verified against each renderer):

| `listTypeName` | `columns` (headerKey → fieldName), in order |
|---|---|
| `PHT_WEEKLY_HEARING_LIST` | `date`, `caseName`, `hearingLength`, `hearingType`, `venue`, `additionalInformation` (all identity) |
| `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | same six as PHT |
| `SIAC_/POAC_/PAAC_WEEKLY_HEARING_LIST` | `date`, `time`, `appellant`, `caseReferenceNumber`, `hearingType`, `courtroom`, `additionalInformation` |
| `GRC_WEEKLY_HEARING_LIST` | `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `modeOfHearing`, `venue`, `additionalInformation` |
| `CIC_WEEKLY_HEARING_LIST` | `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `venuePlatform`, `judges`, `members`, `additionalInformation` |
| `AST_DAILY_HEARING_LIST` | `appellant`, `appealReferenceNumber`, `caseType`, `hearingType`, `hearingTime`, `additionalInformation` |

All `headerKey` values above exist in every package's `tableHeaders` in **both** `en.ts` and `cy.ts`
— verified; **no new translations are required for the CSV itself**.

Two things the issue's spec comment gets wrong, corrected here:
- **CIC needs no bracket-notation workaround.** `renderCicWeeklyHearingListData` already normalises
  the raw `"venue/platform"` key to `venuePlatform`. The CSV consumes the rendered row, so
  `fieldName: "venuePlatform"` is correct.
- **SIAC/POAC/PAAC share one config with no per-list variation.** Court name and list title only
  affect the header, which a table-only CSV omits. One generator registered under three keys.

### 2.3 Registry and orchestration — `libs/publication/src/processing/service.ts`

Add, directly mirroring the Excel block (`service.ts:338-414`):

```ts
interface GenerateCsvParams { artefactId: string; listTypeName: string; contentDate: Date; locale: string; locationId: string; jsonData: unknown; logPrefix?: string; }
interface CsvGenerationResult { hasCsv?: boolean; error?: string; }
interface CsvGeneratorResult { success: boolean; csvPath?: string; error?: string; }
type CsvGenerator = (params: GenerateCsvParams) => Promise<CsvGeneratorResult>;

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = {
  PHT_WEEKLY_HEARING_LIST: (p) => generatePhtWeeklyHearingListCsv({ ...p, jsonData: p.jsonData as PhtHearingList }),
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: (p) => generateCareStandardsTribunalWeeklyHearingListCsv({ ...p, jsonData: p.jsonData as CareStandardsTribunalHearingList }),
  SIAC_WEEKLY_HEARING_LIST: siacPoacPaacCsvGenerator,
  POAC_WEEKLY_HEARING_LIST: siacPoacPaacCsvGenerator,
  PAAC_WEEKLY_HEARING_LIST: siacPoacPaacCsvGenerator,
  GRC_WEEKLY_HEARING_LIST: (p) => generateGrcWeeklyHearingListCsv({ ...p, jsonData: p.jsonData as GrcWeeklyHearingList }),
  CIC_WEEKLY_HEARING_LIST: (p) => generateCicWeeklyHearingListCsv({ ...p, jsonData: p.jsonData as CicWeeklyHearingList }),
  AST_DAILY_HEARING_LIST: (p) => generateAstDailyHearingListCsv({ ...p, jsonData: p.jsonData as AstDailyHearingList })
};

export function listTypeHasCsv(listTypeName: string | undefined): boolean;
export async function generatePublicationCsv(params: GenerateCsvParams): Promise<CsvGenerationResult>;
```

In `processPublication`, inside the existing `if (jsonData)` block, immediately after the Excel step
(`service.ts:645`):

```ts
const csvResult = await generatePublicationCsv({
  artefactId,
  listTypeName: pdfResult.listTypeName ?? "",
  contentDate, locale, locationId, jsonData, logPrefix
});

if (csvResult.hasCsv) {
  result.csvPath = `${artefactId}.csv`;
}
```

Add `csvPath?: string` to `ProcessPublicationResult`. Export `listTypeHasCsv` from
`libs/publication/src/index.ts` (the page handler needs it).

### 2.4 Email — `libs/notifications`

**`notification/notification-service.ts`**

- Add `csvBuffer?: Buffer` to `EmailTemplateData` (line 349).
- In `buildEmailDataWithFiles` (line 457) run the three blob fetches concurrently instead of
  sequentially — at subscription fan-out three serial awaits per recipient is measurable:
  ```ts
  const [pdfBuffer, excelBuffer, csvBuffer] = await Promise.all([
    pdfBlobKey ? downloadBlob(pdfBlobKey, CONTAINER.PUBLICATIONS) : Promise.resolve(null),
    downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS),
    downloadBlob(`${artefactId}.csv`, CONTAINER.PUBLICATIONS)
  ]);
  ```
- Apply the existing `MAX_PDF_SIZE_BYTES` (2MB, line 116) ceiling to the CSV; fold `csvUnder2MB`
  into `filesUnder2MB`; pass `hasCsv` into `getSubscriptionTemplateId`; return
  `csvBuffer: csvUnder2MB ? csvBuffer : undefined`.
- Thread `csvBuffer` through both `sendEmail` call sites (lines 382 and 605).

**`govnotify/govnotify-client.ts`**

- Add `csvBuffer?: Buffer` to `SendEmailParams` (line 32).
- When present, mirroring the Excel block at line 83:
  ```ts
  const csvLink = (notifyClient as any).prepareUpload(params.csvBuffer, {
    confirmEmailBeforeDownload: false,
    retentionPeriod: "1 week"
  });
  personalisation.csv_link_to_file = csvLink;
  personalisation.csv_link_text = "Download CSV version";
  ```

**`govnotify/template-config.ts`**

- New module const `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`.
- Extend `getSubscriptionTemplateId({ isSjp, hasPdf, hasExcel, hasCsv, filesUnder2MB })`. Selection
  order, most specific first; **every existing row must keep its current behaviour**:

  | `hasPdf` | `hasExcel` | `hasCsv` | Template |
  |---|---|---|---|
  | any | any | any | `…_NO_LINKS` when `!filesUnder2MB`, or when no file at all is present |
  | ✗ | ✓ | ✗ | `…_SJP_EXCEL_ONLY` (SJP only) — unchanged |
  | ✓ | ✓ | – | `…_SUBSCRIPTION_PDF_EXCEL` — unchanged (Excel wins; no list type produces both Excel and CSV) |
  | ✓ | ✗ | ✓ | `…_SUBSCRIPTION_PDF_CSV` ◀ **new** |
  | ✗ | ✗ | ✓ | `…_SUBSCRIPTION_PDF_CSV` (the PDF block is conditional inside the Notify template) |
  | ✓ | ✗ | ✗ | `…_NON_SJP_PDF` — unchanged |

  Throw the existing `"… environment variable is not set"` error style if the new var is empty and
  that branch is selected.
- Update the `!hasPdf && !hasExcel` guard at line 21 to include `!hasCsv`, otherwise a
  CSV-only publication is wrongly routed to `…_NO_LINKS`.

**Notify template (manual, outside this repo).** A new GOV.UK Notify email template containing both
`((pdf_link_to_file))` and `((csv_link_to_file))` blocks must be authored before this can ship. Its
UUID goes into `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml`, and
`apps/web/.env.example` as `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`. **Q2** — needs an owner.

### 2.5 Download route and service

**`libs/public-pages/src/flat-file/flat-file-service.ts`**

```ts
type GeneratedFormat = "pdf" | "csv" | "excel";

export async function getGeneratedFileForDownload(artefactId: string, format: GeneratedFormat, user: UserProfile | undefined)
```

Guard sequence, lifted verbatim from `getExcelForDownload` so there is one copy:
`getArtefactById` → `NOT_FOUND` · display window → `EXPIRED` · `canAccessPublicationData` →
`ACCESS_DENIED` · `downloadBlob(\`${artefactId}.${ext}\`, CONTAINER.PUBLICATIONS)` → `FILE_NOT_FOUND`.
Returns `{ success, fileBuffer, contentType, fileName }`. No `isFlatFile` guard — these are
generated files from JSON publications (`isFlatFile: false`), as the existing comment at line 78
already explains for Excel.

Refactor `getExcelForDownload` to `return getGeneratedFileForDownload(artefactId, "excel", user)`.

**New route `libs/public-pages/src/routes/api/publication-file/[artefactId]/download.ts`**

`GET /api/publication-file/:artefactId/download?format=pdf|csv`

1. Validate `artefactId` against the existing `UUID_REGEX` → `400 { error: "Invalid request" }`.
2. `format` must be in `["pdf", "csv"]`, defaulting to `"pdf"` (same shape as the flat-file route's
   `resolveFormat`).
3. Delegate to `getGeneratedFileForDownload`; map errors exactly as the flat-file route does:
   `ACCESS_DENIED`→403, `NOT_FOUND`/`FILE_NOT_FOUND`→404, `EXPIRED`→410.
4. On success: `Content-Type` from the result, `Content-Disposition: attachment; filename="<id>.<ext>"`,
   `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate` (set on every response
   path, including errors — matching the existing routes).

The blob key is built from an already-UUID-validated id, so there is no path-traversal surface. No
filename is ever accepted from the query string.

Auto-discovered by the existing `createSimpleRouter(publicPagesApiRoutes)` wiring in
`apps/web/src/app.ts:214` and `apps/api/src/app.ts` — no manual registration.

### 2.6 Publication page download block

New shared partial `libs/list-types/common/src/views/partials/list-download-options.njk`
(`libs/list-types/common` has no `views/` dir yet — create it, and add `moduleRoot` to `modulePaths`
in `apps/web/src/app.ts` if it is not already there):

```njk
{% if downloadOptions.length %}
  <h2 class="govuk-heading-s govuk-!-margin-top-6">{{ t.downloadHeading }}</h2>
  <ul class="govuk-list">
    {% for option in downloadOptions %}
      <li><a class="govuk-link" href="{{ option.url }}" download>{{ option.linkText }} ({{ option.sizeLabel }})</a></li>
    {% endfor %}
  </ul>
  <p class="govuk-body govuk-hint">{{ t.downloadCsvHint }}</p>
{% endif %}
```

Included in the six templates (SIAC/POAC/PAAC share one) immediately after the `lastUpdated`
paragraph and before the "Important information" `<details>`:

- `apps/web/src/pages/(list-types)/pht-weekly-hearing-list/pht-weekly-hearing-list.njk`
- `apps/web/src/pages/(list-types)/care-standards-tribunal-weekly-hearing-list/…njk`
- `apps/web/src/pages/(list-types)/grc-weekly-hearing-list/…njk`
- `apps/web/src/pages/(list-types)/cic-weekly-hearing-list/…njk`
- `apps/web/src/pages/(list-types)/ast-daily-hearing-list/…njk`
- `libs/list-types/siac-poac-paac-weekly-hearing-list/src/views/siac-poac-paac-weekly-hearing-list.njk`

Populated by a new exported helper in `apps/web/src/pages/(list-types)/list-type-handler.ts`:

```ts
export async function buildDownloadOptions(artefact: Artefact, t: SimpleLocaleContent) { … }
```

- Probes `${id}.pdf` and (only when `listTypeHasCsv(artefact.listTypeName)`) `${id}.csv` via
  `getBlobProperties(..., CONTAINER.PUBLICATIONS)`, both inside one `Promise.all`.
- Wrapped in try/catch returning `[]` — a blob-storage blip degrades to "no download links", never
  a 500 on the list page.
- URLs: `/api/publication-file/${id}/download?format=pdf` and `…?format=csv`.
- Called from `createWeeklyHearingListRender` (covers PHT, CST, GRC, CIC, AST — note this makes that
  render callback `async`, which `RenderCallback<T>` already permits) and from the SIAC/POAC/PAAC
  page's bespoke `render`.

`createWeeklyHearingListRender` is shared with other list types beyond the eight. Because
`buildDownloadOptions` only adds a CSV entry when `listTypeHasCsv` is true, and the partial renders
nothing when `downloadOptions` is empty, other list types are unaffected unless their template
includes the partial. **However, every list type using that render fn will now get a PDF entry in
`downloadOptions`** — harmless (their templates do not include the partial) but it does add two HEAD
requests per page render for all of them. Gate on `listTypeHasCsv` first and skip the PDF probe too
when it is false, so only in-scope list types pay the cost.

`formatFileSize` already exists in `apps/web/src/pages/(list-types)/sjp-download-shared.ts:56`.
Move it to `libs/publication/src/file-storage/file-size.ts`, export it from `@hmcts/publication`,
and import it in both places rather than duplicating.

### 2.7 New content — six packages × 2 locales

Added to each package's `src/locales/en.ts` and `src/locales/cy.ts` (shared by the page and the
partial, so they belong in the lib):

```ts
downloadHeading: "Download this list",
downloadPdfLinkText: "Download this list as a PDF file",
downloadCsvLinkText: "Download this list as a CSV file",
downloadCsvHint: "CSV files can be opened in a spreadsheet application such as Microsoft Excel or Google Sheets.",
```

Welsh entries use the `[WELSH TRANSLATION REQUIRED: "…"]` placeholder convention until translations
arrive. `libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/locales.test.ts` already
asserts en/cy key parity — add the same assertion in any package that lacks it.

Email link text is hardcoded in `govnotify-client.ts` alongside the existing
`"Download PDF version"` / `"Download Excel version"`: `"Download CSV version"`.

### 2.8 Database schema changes

None. CSVs are blobs in the existing `publications` container, keyed by artefact id like PDFs and
`.xlsx`. No new list types, so no `list-type-data.ts` change.

---

## 3. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| CSV generator throws | `generatePublicationCsv` catches, `console.error("[Publication] CSV generation error:", { artefactId, error })`, returns `{}`. Publication, PDF, notifications and third-party push all proceed. |
| Generator returns `success: false` | `console.warn("[Publication] CSV generation failed:", { artefactId, error })`, returns `{}`. |
| Blob upload rejects | Caught inside the generator → `{ success: false, error }`. Never rethrown. |
| Artefact has zero hearings | CSV is still written: header row only. Consistent with the PDF, which renders an empty table. |
| Hearing field missing / `null` / `undefined` | Coerced to `""` before `sanitiseCellValue`, emitted as an empty quoted cell. Never the literal string `"undefined"`. |
| Cell starts `=`, `+`, `-`, `@` | Apostrophe-prefixed by the existing `sanitiseCellValue`. Guards against CSV/formula injection. |
| Cell contains `"` | Doubled to `""` per RFC 4180. |
| Cell contains `,`, `\r`, `\n` | Neutralised by unconditional quoting of every cell. |
| Welsh diacritics, `£` | UTF-8 with a leading BOM so Excel on Windows does not mojibake. |
| CSV blob absent at email time | `downloadBlob` returns `null`; `hasCsv` false; the template appropriate to the remaining files is selected. Email still sends. |
| CSV ≥ 2MB | `csvUnder2MB` false → `filesUnder2MB` false → `…_NO_LINKS` template, matching current PDF/Excel behaviour. |
| CSV-only (PDF generation failed) | Routed to `…_SUBSCRIPTION_PDF_CSV`; the PDF block in the Notify template is conditional on `pdf_link_to_file`. |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` unset in an environment | `getSubscriptionTemplateId` throws the standard "environment variable is not set" error. **Must be set in both Helm values files before merge** or every tribunal-list notification for these eight types breaks. |
| Artefact published before this change | No `.csv` blob. `getBlobProperties` returns `null` → no CSV link rendered, no error. No backfill in scope. |
| Download: malformed `artefactId` | `400 { error: "Invalid request" }` |
| Download: unknown `format` | Defaults to `pdf` (mirrors the flat-file route). |
| Download: artefact not found / blob missing | `404 { error: "Artefact not found" }` / `404 { error: "File not found in storage" }` |
| Download: user not permitted | `403 { error: "Access denied" }` |
| Download: display window expired | `410 { error: "File has expired" }` |
| Blob storage error while building page download links | Caught → `[]` → block not rendered. List page still renders. |

Upstream JSON schema validation is unchanged; the CSV generator only ever runs on data that already
passed `validate<ListType>` at upload time.

---

## 4. Acceptance Criteria Mapping

**AC1 — "CSV and PDF downloadable files are made available as downloadable options for all the
Tribunal hearing lists above"**

- CSV: `CSV_GENERATOR_REGISTRY` covers all eight `listTypeName` values; `processPublication` writes
  `publications/<artefactId>.csv` on every publication.
- PDF: already generated for all eight; now genuinely downloadable via the new blob-backed route
  (the pre-existing `/pdf/...` route reads local disk and cannot serve them — see AD7).
- Both offered on the publication page and in the email.
- *Verify:* unit test asserting `listTypeHasCsv` is true for all eight names and false for a
  control (`CIVIL_DAILY_CAUSE_LIST`); E2E journey downloading both files.

**AC2 — "All the data fields available in the current downloadable PDF file should also be available
on the CSV downloadable file"**

- Column sets are derived from the same renderer output the PDF template iterates, in the same
  order, with the same date/time formatting.
- *Verify:* per-package unit test asserting the exact column list and order; a test asserting the
  CSV data row equals the values the renderer produced. Note the deliberate exclusion of the PDF's
  *page furniture* (list title / last-updated / data source) under AD3 — **Q1**.

**AC3 — "Links to download both file types are displayed in the email notifications"**

- `csv_link_to_file` + `csv_link_text` personalisation set alongside the existing `pdf_link_to_file`;
  `getSubscriptionTemplateId` returns the new PDF+CSV template.
- *Verify:* unit tests on `govnotify-client` (personalisation set, `prepareUpload` options),
  `template-config` (branch selection incl. every unchanged row), and `notification-service`
  (buffer included / excluded at the 2MB boundary, email still sent when the blob is absent).
- **Blocked on Q2** — the Notify template itself is authored outside this repo.

---

## 5. Test Plan

Following `.claude/rules/testing.md` — Vitest, co-located, Arrange-Act-Assert.

| File | Coverage |
|---|---|
| `libs/list-types/common/src/csv/csv-utilities.test.ts` | quoting, `""` escaping, embedded comma/newline, CRLF joins, BOM, `saveCsvToStorage` container + blob key + content type |
| `libs/list-types/common/src/csv/non-strategic-csv-generator.test.ts` | header row then one row per hearing; Welsh headings under `cy`; missing field → empty cell; empty hearings → header only; `=` prefixed with `'`; upload rejection → `{ success: false }` not a throw |
| `libs/list-types/<pkg>/src/csv/csv-generator.test.ts` × 6 | exact column set and order; values match the package renderer (CIC covers `venuePlatform`; SIAC config serves all three list types) |
| `libs/publication/src/processing/service.test.ts` | `listTypeHasCsv` true for all eight / false for a control; `csvPath` set on success; omitted on failure while PDF path and notifications still proceed; no registry key is numeric |
| `libs/notifications/src/govnotify/template-config.test.ts` | new PDF+CSV branch; **each existing branch unchanged**; CSV-only; `!filesUnder2MB`; unset-env throw |
| `libs/notifications/src/notification/notification-service.test.ts` | `csvBuffer` included under 2MB / omitted at or above; email still sent when CSV blob absent; three downloads issued concurrently |
| `libs/notifications/src/govnotify/govnotify-client.test.ts` | `csv_link_to_file`/`csv_link_text` set; `prepareUpload` options; unset when no buffer |
| `libs/public-pages/src/flat-file/flat-file-service.test.ts` | `getGeneratedFileForDownload` per format; each guard branch; reads `CONTAINER.PUBLICATIONS`; `getExcelForDownload` still behaves identically after refactor |
| `libs/public-pages/src/routes/api/publication-file/[artefactId]/download.test.ts` | 200 + attachment + no-store for both formats; 400 non-UUID; 403; 410; 404 |
| `apps/web/src/pages/(list-types)/list-type-handler.test.ts` | `buildDownloadOptions`: both entries with sizes; no CSV entry when not in registry; none when probe returns null; `[]` (no throw) on storage error |
| `…/<list>.njk.test.ts` (existing files) | `h2` + two-item `govuk-list` + `download` attr; nothing rendered when `downloadOptions` empty; Welsh heading/link/hint |
| `e2e-tests/tests/tribunal-list-csv-download.spec.ts` | **one** `@nightly` journey: publish a GRC list, view as a verified user, assert both links with sizes, download the CSV and match its first data row to the page's first table row, switch to Welsh and assert translated heading/link text, inline axe scan, tab to the CSV link and activate with Enter |

Accessibility (WCAG 2.2 AA) of the new block: `h2` between the page `h1` and the existing
"Search Cases" `h2` (no skipped level); link text states format and size so it is self-describing
out of context; `<li>` children of a `govuk-list` so it announces as a 2-item list; format conveyed
by text only, no colour or icons; plain anchors in DOM order with default GOV.UK focus styles;
server-rendered, works with JS disabled; Welsh parity via `?lng=cy`.

---

## 6. Risks

1. **Missing Notify template UUID breaks live notifications.** If
   `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` is not set in an environment,
   `getSubscriptionTemplateId` throws for every publication of these eight list types — a
   regression on currently-working PDF emails. Set both Helm values files in the same PR as the
   code, and confirm the template exists in Notify first (Q2).
2. **`buildDownloadOptions` adds blob HEAD requests to the page render path.** Gated on
   `listTypeHasCsv` so only the eight in-scope types pay for it, and failures degrade to no links.
3. **`getExcelForDownload` refactor touches a live SJP/Magistrates path.** Behaviour must be
   byte-identical; keep its existing tests green unchanged.
4. **Scope ambiguity on the page download block** (Q3) — if product wants email-only, section 2.6
   and its tests drop out cleanly; nothing else depends on them.

---

## 7. CLARIFICATIONS NEEDED

**Q1 — Should the CSV contain a metadata preamble, or the table only?**
AC2 says "all the data fields available in the current downloadable PDF". This plan implements
**table-only** (header row + data rows), matching the existing `.xlsx` exports and keeping the file
parseable by any CSV reader. The literal alternative is a four-row key/value preamble (list title,
list date, last updated, data source) above the table, which breaks single-header-row parsers.
**Recommendation: table-only**, with that metadata carried by the email body and the page. Needs a
product decision — it is a small, contained change either way.

**Q2 — Who authors the new GOV.UK Notify PDF+CSV email template, and is there an existing template
to extend?** A template containing both `((pdf_link_to_file))` and `((csv_link_to_file))` must exist
before this ships, and its UUID must be added to `apps/web/helm/values.yaml` and
`apps/api/helm/values.yaml`. This is a hard blocker on AC3. Also confirm the Welsh version of the
template body.

**Q3 — Is the on-page "Download this list" block in scope, or is this email-only?**
The problem statement is framed entirely around the email notification, but AC1 says the files are
"made available as downloadable options", which reads as on-page too. This plan implements both.
Confirm — dropping the page block removes roughly a third of the work.

**Q4 — Should the CSV also be pushed to third-party consumers?** `sendThirdPartyPublications`
currently receives `pdfPath` and `flatFilePath` but not `excelPath`. This plan does not add
`csvPath`. Confirm no third-party consumer wants CSV.

**Q5 — Pre-existing defects found while planning. Fix here or track separately?**
- `libs/public-pages/src/routes/pdf/[artefactId]/download.ts` reads
  `storage/temp/uploads/<id>.pdf` from the **local filesystem** while `savePdfToStorage` writes
  PDFs to **blob** `CONTAINER.PUBLICATIONS`, and it performs **no** `canAccessPublicationData`
  check — a live authorisation gap on top of a path that cannot find its files in a deployed
  environment.
- `apps/web/src/pages/(list-types)/sjp-download-shared.ts:21,35` calls `downloadBlob` /
  `getBlobProperties` with **no container argument**, so both default to `CONTAINER.ARTEFACT` while
  the files live in `CONTAINER.PUBLICATIONS`. The SJP download page therefore appears unable to
  find the files it advertises.
- Three Upper Tribunal page controllers set `pdfDownloadUrl: "/api/pdf/<id>/download"`, a route
  that does not exist (the route mounts at `/pdf/...`), and no template consumes the variable —
  dead code.

  **Recommendation: separate tickets**, but flagging now. This plan works around the first by adding
  a correct blob-backed route rather than depending on the broken one.

**Q6 — Welsh CSVs.** A CSV is generated in the locale of its own artefact, so an English and a Welsh
publication of the same list each get their own CSV under their own artefact id. Confirm that is
expected rather than one bilingual file.

**Q7 — The other ~30 non-strategic list types.** The ticket says "not covered in the other tickets",
implying siblings cover the rest. `createNonStrategicCsvGenerator` built here covers any flat
non-strategic list with a one-file config — those tickets should reuse it rather than write new
generators. Confirm which sibling tickets exist so the shared factory lands in a compatible shape.
