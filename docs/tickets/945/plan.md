# Technical Plan — Issue #945: Excel download for Administrative Court hearing lists

## 1. Technical Approach

### Summary of the actual gap

The notification layer is already fully list-type agnostic and already supports dual PDF + Excel
links. Verified in code:

| Component | File | State |
|---|---|---|
| Dual-link template selection | `libs/notifications/src/govnotify/template-config.ts:37` | `hasPdf && hasExcel` → `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`. Already implemented. |
| Excel blob probe | `libs/notifications/src/notification/notification-service.ts:474` | Unconditionally probes `downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS)` for every list type. Already implemented. |
| Notify personalisation | `libs/notifications/src/govnotify/govnotify-client.ts:84-89` | Sets `excel_link_to_file` / `excel_link_text` when a buffer exists. Already implemented. |
| 2 MB guard | `notification-service.ts:120,481` | `MAX_PDF_SIZE_BYTES` applied to both files. Already implemented. |
| Env var | `apps/web/.env.example:56`, `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml` | `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` already populated. |

`EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:363`) currently holds only
`MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST` and the four SJP list types. The four
Administrative Court list types are absent, so `generatePublicationExcel` returns `{}`, no `.xlsx`
blob is written, `hasExcel` is `false`, and `getSubscriptionTemplateId` falls through to
`GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` — the PDF-only email.

**The whole change is therefore: write an `.xlsx` blob to `{artefactId}.xlsx` in
`CONTAINER.PUBLICATIONS` when one of the four Administrative Court lists is published.** Everything
downstream then works with no further edits. No notification, Notify-template, Helm, env-var,
Prisma or migration changes are required.

### Lists in scope

All four share one lib (`libs/list-types/administrative-court-daily-cause-list`) and one flat
7-field row shape (`AdministrativeCourtHearingList = AdministrativeCourtHearing[]`), so a single
generator serves all four. Stable `list_type.name` keys, confirmed against
`libs/list-types/common/src/list-type-data.ts:252-282`:

- `BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`
- `LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`
- `BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`
- `MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`

`LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (`list-type-data.ts:230`) is a separate list type in
a separate lib and is **not** named in the ticket — out of scope. See CLARIFICATIONS NEEDED.

### Architecture decision: regenerate from the converted JSON, do not serve the uploaded bytes

AC 2 says "the uploaded excel file will be re-used". Read literally (persist the admin's workbook
and serve it byte-for-byte) it is unimplementable alongside AC 3 and is unsafe:

1. **AC 3 cannot be met.** The upload template carries only the 7 data columns. It has no list
   title, list date, last-updated stamp, important information, judgments text, data source or
   Special Category Data caution — all of which are in the PDF. AC 3 requires all of them.
2. **The upload is untrusted admin input.** Extra sheets, hidden rows, formulas, macros and author
   metadata would be republished verbatim to subscribers. Every existing CaTH Excel download is
   generated server-side and sanitised through `sanitiseCellValue` (formula/CSV-injection guard,
   `libs/list-types/common/src/excel/excel-utilities.ts:12`).
3. **Welsh publications would ship English column headers**, since the upload template is English.
4. **The original bytes are not stored today.** `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:136-137`
   stores only the converted JSON: *"original Excel is not stored (no value after conversion)"*.
   Serving the original would require a second blob write at upload time and a virus-scan /
   sanitisation decision for admin-supplied files.

**Decision:** re-use the uploaded Excel's *data* — the schema-validated JSON derived from it, which
is the canonical representation and the same source the PDF and the HTML page render from — and
regenerate a clean, localised workbook. This satisfies the intent of AC 2 (single source of data,
no re-keying) while meeting AC 3. Flagged in CLARIFICATIONS NEEDED in case the business means the
literal bytes, which is a larger, separate change.

### Reference implementation

`libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` is the canonical per-lib
pattern (direct locale imports → reuse the existing renderer → ExcelJS workbook →
`sanitiseCellValue` per cell → `autoFitColumns` → `saveExcelToStorage`) with its test at
`src/excel/excel-generator.test.ts`. Follow both.

### Deviations from the spec comment on the issue (§6.1), with reasons

The spec comment posted on the issue is accurate on the codebase facts. Four implementation details
should differ:

1. **Import locales directly (`import { en } from "../locales/en.js"`), not `loadTranslations`.**
   `loadTranslations` is exported from `@hmcts/list-types-common`, and both existing Excel generator
   tests mock that entire module (`vi.mock("@hmcts/list-types-common", () => ({ autoFitColumns,
   sanitiseCellValue, saveExcelToStorage }))`). Using `loadTranslations` would force every test to
   re-stub it. Direct imports are also synchronous and match both existing Excel generators.
2. **Resolve the data-source label from `t.common.provenanceLabels`, not `PROVENANCE_LABELS` from
   `@hmcts/publication`.** Two reasons: (a) `@hmcts/publication` already depends on this lib for the
   PDF generator, so importing it back creates a circular package dependency (the PDF generator gets
   away with it only because it is not a declared dependency); (b) `t.common.provenanceLabels` is
   localised and is what the public HTML page uses, whereas `PROVENANCE_LABELS` is English-only.
   Note the two maps disagree on `SNL` (`"ListAssist"` vs `"SNL"`) and `CP_CATH` (`"Libra"` vs
   `"CP-CaTH"`); the Excel will match the HTML page. Recorded as a known PDF/Excel divergence.
3. **Sheet 1's Welsh name must be a real translation, not a `[WELSH TRANSLATION REQUIRED: …]`
   placeholder.** ExcelJS rejects sheet names over 31 characters and rejects the characters
   `* ? : \ / [ ]` — a bracketed placeholder would throw at generation time. Use
   `"Gwrandawiadau"`, the term already used across the repo's Welsh locales
   (e.g. `libs/list-types/court-of-appeal-civil-daily-cause-list/src/locales/cy.ts:22`), and flag it
   for Welsh review.
4. **Include the Find a Court or Tribunal (FaCT) line on sheet 2.** The PDF template renders
   `t.common.factLinkText` / `factLinkUrl` / `factAdditionalText`
   (`src/pdf/pdf-template.njk:15`). AC 3 says every field in the PDF must be in the Excel, so
   include it rather than argue it is boilerplate.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — no new rendered page or list-type view. The four public HTML pages
already exist at `apps/web/src/pages/(list-types)/administrative-court-daily-cause-list/` and are
unchanged. The deliverables are a document generator and registry wiring.

### Files

```
libs/list-types/administrative-court-daily-cause-list/
  package.json                         EDIT  add "exceljs": "4.4.0" to dependencies
  src/index.ts                         EDIT  export * from "./excel/excel-generator.js";
  src/locales/en.ts                    EDIT  add common.excelSheetName
  src/locales/cy.ts                    EDIT  add common.excelSheetName
  src/excel/excel-generator.ts         NEW   generateAdministrativeCourtDailyCauseListExcel()
  src/excel/excel-generator.test.ts    NEW

libs/publication/
  src/processing/service.ts            EDIT  4 EXCEL_GENERATOR_REGISTRY entries;
                                             add provenance to GenerateExcelParams;
                                             pass provenance in processPublication
  src/processing/service.test.ts       EDIT  registry + provenance passthrough coverage
```

No `libs/publication/package.json` change — `@hmcts/administrative-court-daily-cause-list` is
already imported there (`service.ts:1`).

### `generateAdministrativeCourtDailyCauseListExcel`

`libs/list-types/administrative-court-daily-cause-list/src/excel/excel-generator.ts`

Signature mirrors the registry's `ExcelGenerator` contract so it drops straight in:

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

Behaviour, in order:

1. `const t = locale === "cy" ? cyLocale : enLocale;`
2. `const court = t[listTypeName as keyof typeof t] as Record<string, string> | undefined;`
   If `court` is undefined (or has no `pageTitle`), return
   `{ success: false, error: "Failed to generate Administrative Court Excel: unsupported list type '<name>'" }`
   **without** calling `saveExcelToStorage`. Do not throw — the caller logs and continues.
3. Build header metadata with the **existing** renderer so the Excel and the PDF agree:
   ```ts
   const { header, hearings } = renderAdminCourt(jsonData, {
     locale,
     listTypeName,
     listTitle: court.pageTitle,
     contentDate,
     lastReceivedDate: new Date().toISOString()
   });
   ```
   This reuses `normaliseHearings`, `formatDisplayDate` and `formatLastUpdatedDateTime`.
   Note: the PDF resolves its title from an English-only `LIST_TITLE_MAP`
   (`src/pdf/pdf-generator.ts:25`); the Excel uses the localised `court.pageTitle`, which is
   correct. Do not copy the English map.
4. **Sheet 1**, named `t.common.excelSheetName`:
   - Row 1 = header row from `t.common.tableHeaders` in fixed PDF column order: `venue`, `judge`,
     `time`, `caseNumber`, `caseDetails`, `hearingType`, `additionalInformation`.
     `headerRow.font = { bold: true }`.
   - `worksheet.views = [{ state: "frozen", ySplit: 1 }]`.
   - One row per hearing. Every cell `sanitiseCellValue(String(value ?? ""))` — note
     `sanitiseCellValue` reads `value[0]`, which throws a `TypeError` on `undefined`, so the `?? ""`
     coercion is mandatory, not cosmetic.
   - `autoFitColumns(worksheet)`.
5. **Sheet 2**, named `t.common.importantInfoTitle` ("Important information", 21 chars /
   "Gwybodaeth bwysig", 17 chars — both inside the 31-char limit), single column A, rows in this
   order, mirroring `src/pdf/pdf-template.njk`:

   | Row | Content | Style |
   |---|---|---|
   | 1 | `header.listTitle` | bold |
   | 2 | `${t.common.factLinkText} ${t.common.factAdditionalText} ${t.common.factLinkUrl}` | |
   | 3 | `${t.common.listFor} ${header.listDate}` | bold |
   | 4 | `${t.common.lastUpdated} ${header.lastUpdatedDate} ${t.common.at} ${header.lastUpdatedTime}` | |
   | 5 | (blank) | |
   | 6 | `t.common.importantInfoTitle` | bold |
   | 7 | `court.importantInfoText` | |
   | 8 | `court.judgmentsTitle` | bold |
   | 9 | `court.judgmentsText` | |
   | 10 | (blank) | |
   | 11 | `${t.common.dataSource}: ${label}` — **omitted entirely when `provenance` is absent**, matching the PDF's `{% if dataSource %}` | |
   | 12 | `t.common.cautionNote` | |
   | 13 | `t.common.cautionReporting` | |

   `label = t.common.provenanceLabels[provenance] ?? provenance`. All values through
   `sanitiseCellValue`. `autoFitColumns` caps column A at 60 chars.
6. `const buffer = await workbook.xlsx.writeBuffer();`
   `const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));`
   → writes `{artefactId}.xlsx` to `CONTAINER.PUBLICATIONS` with the correct content type,
   overwriting any previous blob for that artefact (so republication self-heals).
7. Whole body in `try/catch`; on error return
   `{ success: false, error: \`Failed to generate Administrative Court Excel: ${message}\` }`.

**Sheet-name constraint:** the four `pageTitle` values are 43–56 characters, far over ExcelJS's
31-character sheet-name limit. Sheet names must be the short localised constants above, never
`court.pageTitle`.

### Registry wiring — `libs/publication/src/processing/service.ts`

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

Keyed on the stable `list_type.name` strings. Never key on `listTypeId` — it is autoincrement and
differs per environment.

Two supporting edits in the same file:

- Add `provenance?: string;` to `GenerateExcelParams` (`service.ts:339`). It is currently absent, so
  the "Data source" row cannot be populated without it.
- In `processPublication` (`service.ts:637`), add `provenance` to the `generatePublicationExcel({…})`
  call. `provenance` is already destructured at `service.ts:596` and already threaded into the PDF
  path at `service.ts:627`.

No change to `listTypeHasExcel`, to `generatePublicationExcel`'s error handling, or to the
notification call — `result.excelPath` is already derived from `hasExcel` at `service.ts:645-647`.

**Ordering note to be aware of, not to fix:** `generatePublicationExcel` is called with
`listTypeName: pdfResult.listTypeName ?? ""`. `generatePublicationPdf` returns `listTypeName` on the
success path, the "no generator" path and the "generator failed" path, but returns `{}` if the
`prisma.listType.findUnique` lookup itself throws — in which case Excel is skipped too. Acceptable
(a DB failure means the publication is already degraded), but understand it rather than discover it.

### Locale changes

`src/locales/en.ts`, inside `common`:
```ts
excelSheetName: "Hearings"
```
`src/locales/cy.ts`, inside `common`:
```ts
excelSheetName: "Gwrandawiadau"
```
Everything else is reused verbatim — `common.tableHeaders.*`, `common.importantInfoTitle`,
`common.listFor`, `common.lastUpdated`, `common.at`, `common.dataSource`, `common.cautionNote`,
`common.cautionReporting`, `common.factLinkText/Url/AdditionalText`, `common.provenanceLabels`, and
per-court `pageTitle` / `importantInfoText` / `judgmentsTitle` / `judgmentsText`. All already exist
in both locales — verified. So `excelSheetName` is the only new translation.

Key parity must hold: `expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort())`.

### Storage layout

| Artefact | Key | Container |
|---|---|---|
| Converted JSON (source of truth) | `{artefactId}` | `CONTAINER.ARTEFACT` |
| PDF (existing) | `{artefactId}.pdf` | `CONTAINER.PUBLICATIONS` |
| **Excel (new)** | `{artefactId}.xlsx` | `CONTAINER.PUBLICATIONS` |

No new HTTP routes. No database or Prisma schema changes. No migration or backfill: artefacts
published before this change have no `.xlsx` and their emails have already been sent; republishing
the same location + list type + content date + language regenerates both files and re-notifies,
which is the existing mechanism if a backfill is ever requested.

## 3. Error Handling & Edge Cases

| Condition | Behaviour |
|---|---|
| `jsonData` is an empty array | Success. Sheet 1 has the header row and zero data rows; sheet 2 is complete. |
| `listTypeName` not present in the locale object | `{ success: false, error }`. `saveExcelToStorage` is not called. PDF and publication unaffected. |
| Optional field `undefined` / `null` | Written as an empty string, never the literal `"undefined"`. |
| Cell value starts with `=`, `+`, `-` or `@` | Prefixed with `'` by `sanitiseCellValue` (formula/CSV-injection guard). |
| ExcelJS or blob-storage failure | Caught; `{ success: false, error }` returned. `generatePublicationExcel` logs `[…] Excel generation failed` (`console.warn`) or `Excel generation error` (`console.error`) and returns `{}`. The artefact and PDF stay published and the PDF-only email is sent. Publication is never blocked. |
| Generated file ≥ 2 MB | Existing `MAX_PDF_SIZE_BYTES` guard in `buildEmailDataWithFiles` excludes it and selects the no-links template. The blob is still written and remains available. |
| Republication (`isUpdate: true`, same `artefactId`) | `uploadBlob` overwrites `{artefactId}.xlsx`; no stale workbook is retained. |
| Sheet name over 31 chars or containing `* ? : \ / [ ]` | Would throw inside ExcelJS. Prevented by using the short localised constants and a real Welsh translation rather than a bracketed placeholder. |

Existing upload-time validation is the only user-facing gate and is unchanged:
`ADMIN_COURT_EXCEL_CONFIG` (= `RCJ_EXCEL_CONFIG`, all 7 columns required, `validateTimeFormat` on
`time`, `validateNoHtmlTags` on free text) and `validateAdministrativeCourtDailyCauseList`
(JSON Schema). A bad upload is rejected before any artefact is stored.

Logging: no hearing data, case numbers or subscriber email addresses. Notification errors are
already email-redacted in `sendPublicationNotificationsForArtefact`.

### Document accessibility

The web UI is untouched, so service WCAG 2.2 AA compliance is unaffected. Workbook-level rules:

- Sheet 1's table starts at A1 with exactly one header row — no title rows above it, no merged
  cells, no blank spacer rows. This is what preserves column context for screen readers and keeps
  sort/filter working. It is why the non-tabular content goes on sheet 2.
- No merged cells anywhere.
- Meaningful, localised sheet names rather than `Sheet1` / `Sheet2`.
- Frozen header row rather than a repeated header.
- Bold is used for headings only, always alongside structural position — no colour-only meaning, no
  fills.
- Explanatory text lives in real cells, not comments or notes, so it is keyboard- and
  screen-reader-reachable.
- No images, charts or shapes, so no text alternatives are needed.

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| **1.** Excel and PDF are both downloadable options for all four Administrative Court lists | New generator registered under all four stable `list_type.name` keys, so `processPublication` writes `{artefactId}.xlsx` alongside the existing `{artefactId}.pdf` for every one of them | Unit: `listTypeHasExcel` true for all four; `generatePublicationExcel` reports `hasExcel: true` for each. Manual: publish one list per court on staging and confirm both links arrive |
| **2.** The uploaded Excel is re-used to provide the download | The workbook is regenerated from the schema-validated JSON that the upload produced — the same and only data source. No second upload, no re-keying. **Interpreted as re-using the uploaded list's data, not its bytes** — rationale in §1; flagged in CLARIFICATIONS NEEDED | Unit: generator output rows correspond 1:1 to the input `jsonData` hearings. Code review: no data source other than the converted JSON |
| **3.** All fields in the PDF are in the Excel | Sheet 1 carries all 7 data columns in PDF order. Sheet 2 carries every non-tabular PDF element: list title, FaCT line, list date, last-updated date/time, important-information heading and text, judgments heading and text, data source, both caution paragraphs | Unit: assert each of the 13 sheet-2 rows and all 7 columns. Review: diff sheet 2 against `src/pdf/pdf-template.njk` element by element |
| **4.** Links to both file types appear in the email notification | Emergent, no code change: once `.xlsx` exists, `buildEmailDataWithFiles` sets `hasExcel: true` and `getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`; `govnotify-client.ts` sets `excel_link_to_file` / `excel_link_text` | Unit: existing `libs/notifications` tests already cover PDF+Excel → `PDF_EXCEL` template and the ≥2 MB fallback; extend only if a gap is found. Manual on staging: confirm both links render and both files open |

### Test plan

Unit — `libs/list-types/administrative-court-daily-cause-list/src/excel/excel-generator.test.ts`
(new). Mock only `@hmcts/list-types-common` (`autoFitColumns`, `sanitiseCellValue`,
`saveExcelToStorage`) exactly as the two existing Excel tests do, then capture the buffer passed to
`saveExcelToStorage` and re-read it with a real `ExcelJS.Workbook` so assertions run against the
parsed workbook rather than mock call args:

- Produces two sheets named `Hearings` and `Important information` for a Birmingham list.
- Sheet 1 row 1 holds the 7 English headers in the specified order and is bold.
- Sheet 1 has a frozen pane at `ySplit: 1`.
- One data row per hearing, each of the 7 fields in the right column, for a multi-hearing fixture.
- A hearing with empty `additionalInformation` yields an empty cell, not `"undefined"`.
- A value beginning with `=` is written with a leading apostrophe (injection guard).
- Sheet 2 contains the list title, the FaCT line, "List for <date>", "Last updated <date> at
  <time>", the court's important-information text, the judgments heading and text, and both caution
  paragraphs.
- Sheet 2 includes the "Data source" row when `provenance` is supplied and omits it when it is not.
- Welsh locale (`locale: "cy"`) produces Welsh sheet names, Welsh headers, the Welsh `pageTitle` and
  Welsh caution text.
- Each of the four `listTypeName`s resolves to its own court title and important-information text.
- An unrecognised `listTypeName` returns `{ success: false }` with an error and does **not** call
  `saveExcelToStorage`.
- An empty hearings array returns success with a header-only sheet 1.
- A `saveExcelToStorage` rejection is caught and returned as `{ success: false, error }` — nothing
  throws out of the generator.
- `saveExcelToStorage` is called with `artefactId`, so the blob key is `{artefactId}.xlsx`.

Unit — `libs/publication/src/processing/service.test.ts` (extend):

- `listTypeHasExcel` returns `true` for all four Administrative Court names.
- `generatePublicationExcel` invokes the Administrative Court generator and returns `hasExcel: true`
  for each of the four names.
- `processPublication` sets `result.excelPath` to `{artefactId}.xlsx` and forwards it to
  `sendPublicationNotificationsForArtefact`.
- `processPublication` forwards `provenance` into `generatePublicationExcel`.
- A generator failure leaves `excelPath` undefined while the PDF path and the notification call
  still proceed.
- Fixtures use an arbitrary `listTypeId` (e.g. `999`) to prove routing is driven solely by
  `listTypeName`.

Locale parity — assert `en.common` and `cy.common` key sets are identical after adding
`excelSheetName`.

E2E — extend the existing non-strategic upload journey under `e2e-tests/tests/` rather than adding a
new spec (one test per journey, not one per assertion): an internal user uploads a Birmingham
Administrative Court `.xlsx`, confirms, sees the success page, and the list renders at its public
URL; the same test covers the Welsh toggle and an inline Axe scan. Notify delivery and document
links are not assertable from Playwright — cover them manually.

Manual verification on staging (record the outcome on the ticket):

- Publish one list per court, English and Welsh. Confirm both links appear in the received email,
  the workbook opens cleanly in Excel and LibreOffice, sheet names / headers / title are in the
  expected language, and the download arrives with a usable `.xlsx` filename.
- Smoke-test that `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in the target
  environment. If it were unset, `getSubscriptionTemplateId` now **throws** for these lists where it
  previously returned the PDF-only template — the one behavioural risk this change introduces.

Commands: `yarn test`, `yarn lint:fix`, `yarn test:e2e`.

## 5. CLARIFICATIONS NEEDED

1. **AC 2 — data or bytes?** This plan re-uses the uploaded list's *data* (the converted JSON) and
   regenerates a clean localised workbook, because serving the uploaded file verbatim cannot satisfy
   AC 3 (no title, dates, important information or caution text in the upload template), would
   republish untrusted admin input including any macros/hidden sheets, and would give Welsh
   publications English headers. Serving the original bytes would additionally require storing a
   second blob at upload time, since the original is currently discarded after conversion. **Please
   confirm the data interpretation is acceptable, or raise a separate ticket if the literal file is
   required.**
2. **Is an on-page download panel expected as well, or email links only?** AC 1 says "downloadable
   options" while the problem statement is specifically about the email notification. Today only SJP
   has on-page download pages (`list-download-files`, `list-download-disclaimer`). Adding them for
   Administrative Court lists needs a design decision on whether the SJP data-handling disclaimer
   applies. This plan covers the email links only.
3. **Should `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` be included?** It is not named in the
   ticket and lives in a separate lib, so it is excluded. It has the same 7-field shape, so it is a
   near-copy if wanted — cheaper to do now than as a follow-up.
4. **Is a second sheet acceptable presentation for the PDF's non-tabular content?** The alternative
   (metadata rows above the table on sheet 1) was rejected because it breaks the single-header-row
   accessibility rule and defeats sorting and filtering. Please confirm with the BA.
5. **Welsh sheet name.** `excelSheetName` is the only new string. `"Gwrandawiadau"` is proposed
   (already used in the repo's Welsh locales). It cannot be a `[WELSH TRANSLATION REQUIRED: …]`
   placeholder because ExcelJS rejects `[` and `]` in sheet names and caps them at 31 characters.
   **Needs Welsh reviewer sign-off.**

### Known pre-existing issues, deliberately out of scope

- The PDF's list title comes from an English-only `LIST_TITLE_MAP`, so on Welsh publications the PDF
  title and the new Excel title will disagree. One-line PDF fix; raise separately.
- `pdf_link_text` / `excel_link_text` are hardcoded English in `govnotify-client.ts` and the Notify
  templates are English, so Welsh subscribers get English link text today. Pre-existing and
  service-wide.
- The PDF's data-source label uses `PROVENANCE_LABELS` (English, `SNL` → `"SNL"`) while the HTML
  page and the new Excel use the localised `provenanceLabels` (`SNL` → `"ListAssist"`).
- `prepareUpload` is called without a `filename` option. Verify on staging that the Excel downloads
  with a `.xlsx` extension; if not, passing `filename` affects the PDF link too, so treat as a
  shared fix.
- **Performance:** daily cause lists run to tens or low hundreds of rows. Workbook generation is
  negligible next to Chromium PDF rendering and runs in the same background task, so no timeout or
  queueing changes are needed.
