# Technical Plan — Issue #941

**Create additional file format (CSV) for the download version of Rolls Building hearing lists**

---

## 1. Technical Approach

### 1.1 Scope reality — 1 of 17 list types exists

The ticket names 17 Rolls Building lists. Only **`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`** exists in `libs/list-types/common/src/list-type-data.ts` (line 791, `isNonStrategic: true`, `urlPath: companies-winding-up-chd-daily-cause-list`, `subJurisdictionIds: [10]`). The other 16 have no list type entry, no package, no schema mapping and no PDF generator.

Two existing names look similar but are **different** lists — flat-file (manual upload) High Court lists with no JSON pipeline:

* `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` (line 761) ≠ "London Circuit Commercial Court (KB) daily cause list"
* `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` ≠ "Business list (ChD) daily cause list"

**Consequence:** only Companies Winding Up is end-to-end demonstrable at review time. This plan builds the shared generator once and registers **only the list type names that actually exist**. Each remaining list gets CSV for free by adding one string to the name set when its list type lands.

We deliberately do **not** pre-register 16 speculative registry keys. A key that does not match the seeded `name` produces no CSV, silently, with no error — it manufactures a false sense of completion and would pass a naive code review while failing in QA. This is the single largest risk to AC 1 and is raised as a blocking clarification (§6).

### 1.2 One generator covers all 17 lists

All 17 lists share one hearing shape — `ChdKbHearing` in `libs/list-types/chd-kb-common/src/models/types.ts` — exactly 7 flat string fields:

```ts
export interface ChdKbHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}
```

`chd-kb-common` already owns the JSON schema, validator, `renderChdKbHearingList`, email-summary builder and the Excel-upload converter config for this shape. **One shared CSV generator in `chd-kb-common` therefore covers all 17 lists** — that is the core of the design.

### 1.3 PDF/CSV parity is structural, not asserted by convention

`libs/list-types/companies-winding-up-chd-daily-cause-list/src/pdf/pdf-template.njk` renders a 7-column table from `t.tableHeaders.{judge,time,venue,type,caseNumber,caseName,additionalInformation}`, in that order, iterating `renderedData.hearings`. `renderChdKbHearingList` maps hearings 1:1 with no sort and no reformat (`hearingList.map((hearing) => ({ ...hearing }))`), so **CSV row order matches PDF row order naturally** — no sorting logic is needed to satisfy AC 2.

A column-parity test (§5) locks this in: if the PDF table gains a column, the build fails rather than the CSV silently diverging.

### 1.4 Mirror the existing "second format" pipeline exactly

`EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:361`) already delivers a second download format for `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST` and the 4 SJP lists. `generatePublicationExcel` (line 390) looks up by `listTypeName`, returns `{}` when unregistered, and logs-and-swallows every failure. `processPublication` (line 635) calls it after the PDF.

We add a **parallel** `CSV_GENERATOR_REGISTRY` rather than generalising into a `DOWNLOAD_GENERATOR_REGISTRY` keyed by extension. Generalising would touch the SJP and magistrates paths for zero user-visible gain; the parallel registry is the smaller, lower-risk diff. Revisit if a third format ever appears.

### 1.5 No `csvPath` threading — the notification layer probes blob storage

`buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:457`) does **not** read `event.excelPath`. It probes blob storage unconditionally:

```ts
const excelBuffer = await downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS);
```

`downloadBlob` returns `null` on a 404 (`libs/azure-blob/src/blob-client.ts:56`). `PublicationEvent.excelPath` (`libs/notifications/src/notification/validation.ts:21`) is threaded from `processPublication` → `sendPublicationNotificationsForArtefact` → the event and is **never consumed** — dead weight.

Therefore we add **no** `csvPath` field to `PublicationEvent`, `ProcessPublicationResult` or `SendNotificationsParams`. We simply probe `${artefactId}.csv` alongside the `.xlsx` probe. Threading a value that nothing reads is ceremony and violates the KISS/YAGNI rules in `CLAUDE.md`.

The existing dead `excelPath` is recorded here as an observation. **Do not remove it in this ticket** — out of scope.

### 1.6 Generalise `excelBuffer` into a `secondaryFile`, no new Notify template

`govnotify-client.ts` takes `pdfBuffer?: Buffer` and `excelBuffer?: Buffer` (lines 36-37) and hardcodes `personalisation.excel_link_text = "Download Excel version"` (line 89). `getSubscriptionTemplateId` (`template-config.ts:15`) branches on `{ isSjp, hasPdf, hasExcel, filesUnder2MB }` across four env-var template IDs.

Minimal approach: replace `excelBuffer?: Buffer` with `secondaryFile?: { buffer: Buffer; linkText: string }`, so the same `excel_link_to_file` / `excel_link_text` personalisation keys carry either the Excel or the CSV, with the link text supplied by the caller. Rename `hasExcel` → `hasSecondaryFile` in `getSubscriptionTemplateId` with **identical branch logic**, so SJP and magistrates behaviour is bit-for-bit unchanged.

This means **no new Notify template and no new env var** — but it is **contingent** on the existing `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` template rendering `((excel_link_text))` as a placeholder rather than hardcoding the word "Excel" in its body. That cannot be verified from the repo. See §6 blocking question (b) and the fallback cost.

### 1.7 CSV, not `.xlsx`

The AC says CSV; the data is a flat 7-column table with no merged cells, grouping or styling, so none of ExcelJS's capabilities are needed. Serialisation is hand-rolled RFC 4180 (~20 lines), no new dependency. `libs/publication/src/file-storage/content-type.ts:7` already maps `".csv": "text/csv"` — no change needed there.

A **UTF-8 BOM** is prepended so Excel on Windows renders Welsh diacritics correctly rather than as mojibake. This matters concretely: the seeded Welsh friendly name for this list is "Rhestr Achosion Dyddiol Dirwyn Cwmnïau i Ben (Adran Siawnsri)" and the Welsh table headers contain "Gwybodaeth ychwanegol".

Note that every prior second format in this repo shipped `.xlsx`. Raised as blocking clarification (c).

### 1.8 Welsh already exists — no translation request

`libs/list-types/companies-winding-up-chd-daily-cause-list/src/locales/cy.ts` already carries approved Welsh `tableHeaders`: Barnwr / Amser / Lleoliad / Math / Rhif yr achos / Enw'r achos / Gwybodaeth ychwanegol. These are reused **verbatim** in the new shared `chd-kb-common` locale files. No `[TRANSLATE: ...]` placeholders, no translation request.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a — no new rendered page or list-type view. All work is in the publication-processing and notification layers; no `.njk` is added or migrated.**

### 2.1 Rejected suggestions from the spec comment

| Spec comment suggestion | Decision | Reason |
|---|---|---|
| Add `csvPath` to `PublicationEvent`, `ProcessPublicationResult`, `SendNotificationsParams` and thread it through | **REJECTED** | `buildEmailDataWithFiles` never reads `excelPath`; it probes blob storage. Threading `csvPath` adds a field nothing consumes. KISS/YAGNI. |
| `ROLLS_BUILDING_LIST_TYPE_NAMES` with 17 entries, 16 of them invented | **REJECTED** | A registry key that does not match the seeded `name` silently produces no CSV. Register only names that exist in `list-type-data.ts`. |
| `[TRANSLATE: "Judge"]` etc. placeholders in the new `cy.ts` | **REJECTED** | Approved Welsh already exists in the companies-winding-up `cy.ts`. Copy verbatim. |
| Thread publication `locale` into `buildEmailDataWithFiles` to localise link text | **DEFERRED** | Both links are hardcoded English today — a pre-existing bilingual defect, not introduced here. Fixing it requires adding `language` to `sendLocationAndCaseSubscriptionNotifications`'s event, which is a separate change. Raised in §6. |

### 2.2 New — `libs/list-types/common/src/csv/csv-utilities.ts`

```ts
const CSV_CONTENT_TYPE = "text/csv";
const UTF8_BOM = "﻿";
const QUOTE_REQUIRED_CHARS = [",", '"', "\r", "\n"];
const ROW_SEPARATOR = "\r\n";

export function toCsv(rows: string[][]): string;
export async function saveCsvToStorage(artefactId: string, content: string): Promise<{ csvPath: string }>;
```

* `toCsv` — RFC 4180. Each field is passed through the existing `sanitiseCellValue` (from `../excel/excel-utilities.js`) to neutralise formula injection, then quoted if it contains `,` `"` `\r` or `\n`, with internal `"` doubled. Rows joined with `\r\n`.
* `saveCsvToStorage` — prepends `UTF8_BOM`, `Buffer.from(..., "utf8")`, uploads via `uploadBlob(\`${artefactId}.csv\`, buffer, CSV_CONTENT_TYPE, CONTAINER.PUBLICATIONS)`, returns `{ csvPath }`. Mirrors `saveExcelToStorage` (`excel-utilities.ts:38`) exactly.

Consts at top, exported functions next, per `CLAUDE.md` module ordering. Functional, no classes.

Both exported from `libs/list-types/common/src/index.ts` (next to the existing `autoFitColumns, sanitiseCellValue, saveExcelToStorage` export on line 30).

### 2.3 Changed — `libs/list-types/common/src/excel/excel-utilities.ts`

`sanitiseCellValue` currently does `CSV_INJECTION_CHARS.includes(value[0])`. For `""`, `value[0]` is `undefined`, which is not in the array, so it happens to be correct today. Add an explicit guard while the file is being touched:

```ts
export function sanitiseCellValue(value: string): string {
  if (!value) {
    return value;
  }
  if (CSV_INJECTION_CHARS.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}
```

No behaviour change for existing callers; removes the reliance on an accident.

### 2.4 New — `libs/list-types/chd-kb-common/src/locales/en.ts` and `cy.ts`

The 7 column names are identical for all 17 lists, so they live once in `chd-kb-common` rather than being duplicated into 17 packages.

```ts
// en.ts
export const en = {
  csvColumns: {
    judge: "Judge",
    time: "Time",
    venue: "Venue",
    type: "Type",
    caseNumber: "Case number",
    caseName: "Case name",
    additionalInformation: "Additional information"
  }
};
```

```ts
// cy.ts — values copied verbatim from
// libs/list-types/companies-winding-up-chd-daily-cause-list/src/locales/cy.ts tableHeaders
export const cy = {
  csvColumns: {
    judge: "Barnwr",
    time: "Amser",
    venue: "Lleoliad",
    type: "Math",
    caseNumber: "Rhif yr achos",
    caseName: "Enw'r achos",
    additionalInformation: "Gwybodaeth ychwanegol"
  }
};
```

A locale-key-parity assertion is required per `.claude/rules/testing.md`:
`expect(Object.keys(en.csvColumns).sort()).toEqual(Object.keys(cy.csvColumns).sort())`.

### 2.5 New — `libs/list-types/chd-kb-common/src/csv/csv-generator.ts`

```ts
const CSV_COLUMN_ORDER = ["judge", "time", "venue", "type", "caseNumber", "caseName", "additionalInformation"] as const;

export async function generateChdKbCsv(options: ChdKbCsvGenerationOptions): Promise<ChdKbCsvGenerationResult>;

interface ChdKbCsvGenerationOptions {
  artefactId: string;
  locale: string;
  jsonData: ChdKbHearingList;
}

interface ChdKbCsvGenerationResult {
  success: boolean;
  csvPath?: string;
  error?: string;
}
```

Behaviour:

1. `const t = locale === "cy" ? cy : en`.
2. Guard: if `!Array.isArray(jsonData)` return `{ success: false, error: "jsonData is not an array" }`.
3. Header row: `CSV_COLUMN_ORDER.map((key) => t.csvColumns[key])`.
4. One data row per hearing: `CSV_COLUMN_ORDER.map((key) => hearing[key] ?? "")`. Driving both the header and the data rows off the same `CSV_COLUMN_ORDER` const is what makes field-to-column mapping impossible to get out of step.
5. `toCsv(rows)` → `saveCsvToStorage(artefactId, csv)` → `{ success: true, csvPath }`.
6. Wrap in `try/catch`; on throw return `{ success: false, error }`. **Never propagate** — same contract as the Excel generators.

Types at the bottom of the file, consts at top, per `CLAUDE.md`. Relative imports carry `.js` extensions.

Exported from `libs/list-types/chd-kb-common/src/index.ts`. `chd-kb-common` already depends on `@hmcts/list-types-common` (`package.json`), so `toCsv`/`saveCsvToStorage` are importable with no dependency change.

### 2.6 New — `libs/list-types/chd-kb-common/src/csv/rolls-building-list-types.ts`

```ts
/** Rolls Building list types that currently exist in list-type-data.ts.
 *  Add a name here when its list type, schema mapping and PDF generator land. */
export const ROLLS_BUILDING_LIST_TYPE_NAMES: readonly string[] = ["COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST"];
```

Stable string `name` values only — never `ListType.id`, which is autoincrement and differs per environment. Exported from `index.ts`.

### 2.7 Changed — `libs/publication/src/processing/service.ts`

Add a CSV registry parallel to `EXCEL_GENERATOR_REGISTRY` (which ends at line ~383):

```ts
const chdKbCsvGenerator: CsvGenerator = (p) =>
  generateChdKbCsv({ artefactId: p.artefactId, locale: p.locale, jsonData: p.jsonData as ChdKbHearingList });

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = Object.fromEntries(
  ROLLS_BUILDING_LIST_TYPE_NAMES.map((name) => [name, chdKbCsvGenerator])
);

export async function generatePublicationCsv(params: GenerateCsvParams): Promise<CsvGenerationResult>;

interface GenerateCsvParams {
  artefactId: string;
  listTypeName: string;
  locale: string;
  jsonData: unknown;
  logPrefix?: string;
}

interface CsvGenerationResult {
  hasCsv?: boolean;
}

type CsvGenerator = (params: GenerateCsvParams) => Promise<{ success: boolean; csvPath?: string; error?: string }>;
```

`generatePublicationCsv` mirrors `generatePublicationExcel` line-for-line: look up by `listTypeName`, return `{}` when unregistered (no log noise), `console.warn` on a generator-reported failure, `console.error` on a throw, always return a result object.

In `processPublication`, immediately after the `if (excelResult.hasExcel)` block (line ~646):

```ts
await generatePublicationCsv({
  artefactId,
  listTypeName: pdfResult.listTypeName ?? "",
  locale,
  jsonData,
  logPrefix
});
```

The return value is intentionally not stored on `result` — nothing downstream reads it (§1.5). `ProcessPublicationResult` is unchanged.

Imports added: `import { type ChdKbHearingList, generateChdKbCsv, ROLLS_BUILDING_LIST_TYPE_NAMES } from "@hmcts/chd-kb-common";`

`libs/publication/package.json` gains `"@hmcts/chd-kb-common": "workspace:*"`. No cycle: `chd-kb-common` depends only on `@hmcts/list-types-common`.

### 2.8 Changed — `libs/notifications/src/notification/notification-service.ts`

New consts at top of file (near `MAX_PDF_SIZE_BYTES` on line 116):

```ts
const EXCEL_LINK_TEXT = "Download Excel version";
const CSV_LINK_TEXT = "Download CSV version";
```

In `buildEmailDataWithFiles` (line ~457), replace the two sequential `downloadBlob` calls with three parallel ones — they run per subscriber, so the latency saving is real:

```ts
const [pdfBuffer, excelBuffer, csvBuffer] = await Promise.all([
  pdfBlobKey ? downloadBlob(pdfBlobKey, CONTAINER.PUBLICATIONS) : Promise.resolve(null),
  downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS),
  downloadBlob(`${artefactId}.csv`, CONTAINER.PUBLICATIONS)
]);
```

Resolve the secondary file. `.xlsx` and `.csv` are mutually exclusive per list type in practice; `.xlsx` wins as a safety net, with a warning:

```ts
if (excelBuffer && csvBuffer) {
  console.warn("[Notifications] Both xlsx and csv present, using xlsx:", { artefactId });
}

const secondaryBuffer = excelBuffer ?? csvBuffer;
const secondaryLinkText = excelBuffer ? EXCEL_LINK_TEXT : CSV_LINK_TEXT;

const hasSecondaryFile = !!secondaryBuffer;
const secondaryUnder2MB = hasSecondaryFile && secondaryBuffer.length < MAX_PDF_SIZE_BYTES;
const filesUnder2MB = (hasPdf ? pdfUnder2MB : true) && (hasSecondaryFile ? secondaryUnder2MB : true);

const templateId = getSubscriptionTemplateId({
  isSjp,
  hasPdf: hasPdf && pdfUnder2MB,
  hasSecondaryFile: hasSecondaryFile && secondaryUnder2MB,
  filesUnder2MB
});

return {
  templateParameters,
  templateId,
  pdfBuffer: pdfUnder2MB ? pdfBuffer : undefined,
  secondaryFile: secondaryUnder2MB && secondaryBuffer ? { buffer: secondaryBuffer, linkText: secondaryLinkText } : undefined
};
```

`EmailTemplateData` (line 349): `excelBuffer?: Buffer` → `secondaryFile?: { buffer: Buffer; linkText: string }`.

Both `sendEmail` call sites (lines ~383 and ~606) change `excelBuffer: emailData.excelBuffer` → `secondaryFile: emailData.secondaryFile`.

`PublicationEvent` in `validation.ts` is **not** changed.

### 2.9 Changed — `libs/notifications/src/govnotify/govnotify-client.ts`

`SendEmailParams` (line 37): `excelBuffer?: Buffer` → `secondaryFile?: { buffer: Buffer; linkText: string }`.

In `sendEmailInternal` (line ~83):

```ts
if (params.secondaryFile) {
  personalisation.excel_link_to_file = (notifyClient as any).prepareUpload(params.secondaryFile.buffer, {
    confirmEmailBeforeDownload: false,
    retentionPeriod: "1 week"
  });
  personalisation.excel_link_text = params.secondaryFile.linkText;
}
```

The `excel_link_*` personalisation **keys** are retained — they are the contract with the existing Notify templates. Only the link *text* varies by format. The hardcoded `pdf_link_text = "Download PDF version"` (line 79) is left as-is.

### 2.10 Changed — `libs/notifications/src/govnotify/template-config.ts`

`getSubscriptionTemplateId` param `hasExcel` → `hasSecondaryFile`, branch logic byte-for-byte identical:

```ts
export function getSubscriptionTemplateId(params: { isSjp: boolean; hasPdf: boolean; hasSecondaryFile: boolean; filesUnder2MB: boolean }): string
```

`if (!filesUnder2MB || (!hasPdf && !hasSecondaryFile))` → NO_LINKS; `if (isSjp && hasSecondaryFile && !hasPdf)` → SJP_EXCEL_ONLY; `if (hasPdf && hasSecondaryFile)` → SUBSCRIPTION_PDF_EXCEL; else NON_SJP_PDF. No env vars added or removed. Update the existing comment referring to "PDF/Excel templates" to say "second-format".

### 2.11 Not changed

* **PDF generation** — untouched. Companies Winding Up already has a generator.
* **`libs/publication/src/file-storage/content-type.ts`** — `.csv` → `text/csv` already present (line 7).
* **Third-party push** (`sendThirdPartyPublications`) — receives `pdfPath` and `flatFilePath` only. CSV is not pushed. Out of scope, flagged in §6.
* **In-service download page** — none added; matching the magistrates Excel precedent (email links only).
* **`PublicationEvent.excelPath`** — dead but left in place; removing it is out of scope.

---

## 3. Error Handling & Edge Cases

CSV generation must **never** fail a publication or block the PDF or the notification.

| Condition | Layer | Behaviour |
|---|---|---|
| List type not in `CSV_GENERATOR_REGISTRY` | `generatePublicationCsv` | Return `{}`. No CSV, no log line — this is the overwhelmingly common path and must not add noise. |
| `jsonData` is not an array | `generateChdKbCsv` | Return `{ success: false, error }`. PDF and notification unaffected. |
| Empty hearing array | `generateChdKbCsv` | `success: true`, header row only. The email still links to it. |
| Field value begins `=` `+` `-` `@` | `sanitiseCellValue` via `toCsv` | Prefixed with `'` so no spreadsheet evaluates it. |
| Field is `""` / `undefined` | explicit guard in `sanitiseCellValue`; `?? ""` in the generator | Emitted as an empty field. |
| Field contains `,` `"` `\r` `\n` | `toCsv` | Wrapped in double quotes, internal `"` doubled. |
| Welsh diacritics in Excel on Windows | `saveCsvToStorage` | UTF-8 BOM prepended. |
| Blob upload rejects | `generateChdKbCsv` `catch` | `{ success: false, error }`; `generatePublicationCsv` logs `console.warn`. Publication succeeds. |
| Generator throws unexpectedly | `generatePublicationCsv` `catch` | `console.error`, return `{}`. |
| CSV or PDF exceeds 2 MB | `buildEmailDataWithFiles` | `filesUnder2MB` false → existing NO_LINKS template, neither file attached. Unchanged behaviour. |
| Both `.xlsx` and `.csv` exist for one artefact | `buildEmailDataWithFiles` | `.xlsx` wins; `console.warn`. Safety net, not a supported configuration. |
| `.csv` blob absent (every non-Rolls-Building list) | `downloadBlob` returns `null` on 404 | `hasSecondaryFile` resolves from `.xlsx` or is false. Email byte-for-byte as today. |
| Notify send fails | existing `retryWithBackoff` | Unchanged. |

No email addresses, case names or defendant details in any log line — the existing redaction in `sendPublicationNotificationsForArtefact` stays.

---

## 4. Acceptance Criteria Mapping

### AC 1 — "CSV and PDF downloadable files are made available as downloadable options for all Rolls Building hearing lists above"

**Partially demonstrable today, and that must be understood up front.**

| Verification | Status |
|---|---|
| Publish a `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` JSON payload; assert `<artefactId>.csv` exists in the `PUBLICATIONS` container with content type `text/csv`, alongside `<artefactId>.pdf` | Demonstrable now (E2E non-strategic upload + unit tests on `generatePublicationCsv`) |
| The other 16 named lists | **Not demonstrable.** No list type, no package, no PDF generator. Each gets CSV automatically by adding one name to `ROLLS_BUILDING_LIST_TYPE_NAMES` when it lands. Blocking clarification (a). |

Unit test: `generatePublicationCsv` returns `hasCsv` for every name in `ROLLS_BUILDING_LIST_TYPE_NAMES` and `{}` for a non-Rolls-Building name (e.g. `CIVIL_DAILY_CAUSE_LIST`).

### AC 2 — "All the data fields available in the current downloadable PDF file should also be available on the CSV downloadable file"

* Row 1 is a header row with exactly the 7 columns the PDF table renders, in the PDF's order.
* One data row per hearing, in the PDF's order (guaranteed structurally — `renderChdKbHearingList` does not sort).
* **Column-parity test** (§5) asserts `CSV_COLUMN_ORDER` matches the keys rendered by `pdf-template.njk`'s `tableHeaders`, so a future PDF column addition fails the build.
* Interpretation: "data fields" = the 7 tabular fields. The PDF header block (list title, list date, last-updated, venue address, important-information box) is **not** reproduced — metadata rows above a header row break sorting and filtering in every spreadsheet application, and this matches the magistrates Excel precedent. Confirm with the PO — §6.

### AC 3 — "Links to download both file types are displayed in the email notifications"

* Unit test: `buildEmailDataWithFiles` picks up `<artefactId>.csv` and returns `secondaryFile` with `linkText: "Download CSV version"`.
* Unit test: `getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both PDF and CSV are present and under 2 MB.
* Unit test: `sendEmailInternal` sets `personalisation.excel_link_to_file` and `excel_link_text` from `secondaryFile`.
* Regression test: existing SJP and magistrates Excel behaviour unchanged.
* **Contingent on blocking clarification (b)** — if the Notify template hardcodes "Excel" in its body, the CSV link will read "Download Excel version" to the user and a new template is required.

---

## 5. Testing

Per `.claude/rules/testing.md`: Vitest, co-located `*.test.ts`, Arrange-Act-Assert, `vi.clearAllMocks()` in `beforeEach`.

### `libs/list-types/common/src/csv/csv-utilities.test.ts`

* `toCsv` serialises a simple row set with `\r\n` row separators.
* Quotes and escapes fields containing a comma, a double quote (doubled), a carriage return and a newline.
* Prefixes `'` onto values beginning `=`, `+`, `-`, `@` (one assertion per char).
* Handles an empty-string field without throwing and emits an empty field.
* `saveCsvToStorage` calls `uploadBlob` with `<artefactId>.csv`, `text/csv`, `CONTAINER.PUBLICATIONS`, and a buffer whose first bytes are the UTF-8 BOM (`EF BB BF`). Mock `@hmcts/azure-blob`.

### `libs/list-types/common/src/excel/excel-utilities.test.ts`

* Add: `sanitiseCellValue("")` returns `""` (locks the new explicit guard).

### `libs/list-types/chd-kb-common/src/csv/csv-generator.test.ts`

Mock `@hmcts/list-types-common`'s `saveCsvToStorage` to capture the serialised content.

* English header row in the fixed 7-column order for `locale: "en"`.
* Welsh header row (`Barnwr`, `Amser`, …) for `locale: "cy"`.
* One data row per hearing, preserving input order and field-to-column mapping.
* `success: true` with a header-only file for an empty hearing array.
* `success: false`, does not throw, when `jsonData` is not an array.
* `success: false`, does not throw, when the upload rejects.
* Locale-key parity: `expect(Object.keys(en.csvColumns).sort()).toEqual(Object.keys(cy.csvColumns).sort())`.

### `libs/list-types/chd-kb-common/src/csv/csv-column-parity.test.ts` — AC 2 guard

Read `libs/list-types/companies-winding-up-chd-daily-cause-list/src/pdf/pdf-template.njk` from disk, extract the `t.tableHeaders.<key>` references from the `<thead>` in document order, and assert the array equals `CSV_COLUMN_ORDER`. **If the PDF table gains, removes or reorders a column, this test fails** — that is the mechanism keeping AC 2 true over time, rather than a comment asking future developers to remember.

### `libs/publication/src/processing/service.test.ts`

* `generatePublicationCsv` invokes the ChD/KB generator for `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and reports `hasCsv: true`.
* Returns `{}` for an unregistered list type (e.g. `CIVIL_DAILY_CAUSE_LIST`) and does not log.
* Swallows and logs a generator failure; the returned `pdfPath` is unaffected.
* `processPublication` calls `generatePublicationCsv` with the resolved `listTypeName` and does not add `csvPath` to its result.

### `libs/notifications/src/notification/notification-service.test.ts`

* Picks up `<artefactId>.csv` and returns `secondaryFile` with `linkText: "Download CSV version"`.
* Picks up `<artefactId>.xlsx` and returns `linkText: "Download Excel version"` (regression).
* Prefers `.xlsx` and logs a warning when both exist.
* Falls back to the no-links template when the secondary file exceeds 2 MB.
* No secondary file when neither blob exists; template selection unchanged.
* Existing SJP and magistrates Excel paths unchanged (regression).

### `libs/notifications/src/govnotify/template-config.test.ts`

* `getSubscriptionTemplateId` returns the same template ID as today for every existing combination of `{isSjp, hasPdf, hasSecondaryFile, filesUnder2MB}` — a pure rename regression matrix.

### `libs/notifications/src/govnotify/govnotify-client.test.ts`

* Update the two existing `excelBuffer` tests (lines ~302, ~342) to `secondaryFile`, and assert `personalisation.excel_link_text` equals the caller-supplied `linkText` rather than the previously hardcoded string.

### E2E

**Do not add a new spec.** GOV.UK Notify emails and Notify document-download links cannot be asserted in Playwright, so a new spec would have no assertable outcome. The existing non-strategic upload journey for Companies Winding Up already covers publication success and the rendered list page; extend it only if a specific assertion adds value. Email delivery is covered by the unit tests above.

---

## 6. CLARIFICATIONS NEEDED

### Blocking — answer before build

**(a) 16 of the 17 named list types do not exist in the codebase.** Only `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` is in `list-type-data.ts`. Is this ticket expected to (a) deliver CSV for Companies Winding Up now, with the shared generator extended as each list type lands, or (b) wait on the tickets that create the other 16? This plan assumes **(a)** and registers only the one name that exists. Under (a), **the ticket cannot be demonstrated against 16 of the 17 lists at review time** — that needs accepting up front, not discovering in QA. If a name set for the other 16 has already been agreed elsewhere, supply it and we register them; inventing names risks registry keys that silently match nothing.

**(b) Does the `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` Notify template render `((excel_link_text))` as a placeholder, or does it hardcode the word "Excel" in its body?** Someone with Notify access must check. This design reuses that template with `excel_link_text` set to "Download CSV version", which only works if the text is a placeholder. **Fallback cost if hardcoded:** a new Notify template plus a `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` env var wired through Helm and Key Vault in *every* environment, plus a list-type-aware branch in `getSubscriptionTemplateId`. Materially more work — price it into the estimate now.

**(c) CSV or `.xlsx`?** The AC says CSV, and this plan delivers a genuine `text/csv` file. But every prior "additional format" in this repo shipped `.xlsx` (4 SJP lists, 2 magistrates lists). If the product intent is really "a spreadsheet file" and consistency with the existing formats matters more than the literal AC wording, say so — it becomes a smaller change (reuse `saveExcelToStorage` and ExcelJS, drop `csv-utilities.ts` entirely). This gets raised at review if not settled first.

### Decisions taken, open to challenge

* **No metadata preamble in the CSV.** Header row + data rows only, so the file sorts and filters cleanly and reads correctly in a spreadsheet's table semantics. **Does the PO read "all the data fields available in the current downloadable PDF file" as including the list title, list date, last-updated timestamp, venue address and important-information text?** If so, the file shape and every test expectation change. Matches the magistrates Excel precedent as written.
* **Email-only delivery, no in-service download page.** The problem statement scopes this to the email ("only the PDF download file is available… in the email notification") and AC 3 is about email links. The magistrates Excel work shipped email-only. If an in-service format chooser is wanted, that is separate work: `apps/web/src/pages/(list-types)/sjp-download-shared.ts` would need generalising out of the SJP folder, `ALLOWED_TYPES` extending with `"csv"`, plus a `list-download-files` page, locale content and template tests per list type.
* **Welsh email link text.** Both the PDF and secondary-file link texts are hardcoded English today, for all publication languages — a pre-existing bilingual defect, not introduced here. Fixing it needs `language` threading into `buildEmailDataWithFiles` via `sendLocationAndCaseSubscriptionNotifications`'s event. **In scope for this ticket, or a follow-up?** This plan defers it; if deferred, raise the follow-up rather than leaving it undecided. Note an English link inside a Welsh email is a WCAG 3.1.1 concern.
* **Parallel CSV registry, not a generalised download registry.** Smaller, lower-risk diff. Revisit if a third format appears.
* **`.xlsx` and `.csv` are mutually exclusive per list type.** No current or planned list type produces both. The `.xlsx`-wins precedence rule plus warning log is a safety net, not a supported configuration.
* **Third-party push excludes CSV.** `sendThirdPartyPublications` forwards `pdfPath` and `flatFilePath` only. Out of scope unless a third party has asked for CSV.
* **Notify document links expire after 1 week** (unchanged from the PDF). The CSV is therefore not a permanent archive. If users expect long-term access, that argues for the in-service download page above.
* **`PublicationEvent.excelPath` is dead code** — threaded from `processPublication` but never read, because `buildEmailDataWithFiles` probes blob storage instead. Left in place; removal is out of scope for this ticket.
