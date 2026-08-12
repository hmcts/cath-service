# Technical Plan — Issue #940: CSV download for RCJ hearing lists

## Status of the pre-existing "Technical Specification" comment

The `hmctsclaudecode` comment on the issue was treated as input and verified line by line against
source. **Eight material errors were found.** Corrections are carried through this plan and are
listed together in [Corrections to the issue specification](#corrections-to-the-issue-specification)
so reviewers can see exactly what changed and why.

---

## 1. Technical Approach

### 1.1 What "13 RCJ lists" actually maps to

The issue names 13 lists. Verified against `libs/list-types/common/src/list-type-data.ts`, these
resolve to **12 `listTypeName` values** plus one *section* inside another list:

| # | `listTypeName` | line | Renderer family |
|---|---|---|---|
| 1 | `CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST` | 149 | A |
| 2 | `COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST` | 159 | A |
| 3 | `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` | 169 | A |
| 4 | `FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST` | 179 | A |
| 5 | `KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST` | 189 | A |
| 6 | `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` | 199 | A |
| 7 | `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` | 209 | A |
| 8 | `SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST` | 219 | A |
| 9 | `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | 230 | B |
| 10 | `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` | 241 | C |
| 11 | `CIVIL_DAILY_CAUSE_LIST` | 15 | D |
| 12 | `FAMILY_DAILY_CAUSE_LIST` | 25 | D |
| — | *Planning Court* | n/a | section of #9 |

**There is no `PLANNING_COURT_*` list type.** Planning Court is the `planningCourt: StandardHearing[]`
array on `LondonAdminCourtData` (`libs/list-types/london-administrative-court-daily-cause-list/src/models/types.ts`)
and is rendered as an `<h2>` + second table in that list's PDF template (line 63). It gets a CSV
*section* value, not its own generator or route.

**Out of scope:** `libs/list-types/administrative-court-daily-cause-list` (Birmingham, Leeds,
Bristol & Cardiff, Manchester — `list-type-data.ts` 252–282). It is a *different* lib from
`london-administrative-court-daily-cause-list`; do not touch it.

### 1.2 Four registry-facing generators cover all 12 list types

There are exactly four distinct rendered data shapes, so four generator functions are registered:

| Family | Generator | Lib | List types |
|---|---|---|---|
| A | `generateRcjStandardDailyCauseListCsv` | `libs/list-types/rcj-standard-daily-cause-list` | 8 |
| B | `generateLondonAdministrativeCourtDailyCauseListCsv` | `libs/list-types/london-administrative-court-daily-cause-list` | 1 |
| C | `generateCourtOfAppealCivilDailyCauseListCsv` | `libs/list-types/court-of-appeal-civil-daily-cause-list` | 1 |
| D | `generateCivilDailyCauseListCsv` / `generateFamilyDailyCauseListCsv` | `libs/list-types/daily-cause-list-common` (shared impl) | 2 |

A, B and C all render arrays of the same flat `StandardHearing`
(`{ venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation }`), so A/B/C
generators are **thin wrappers over one shared row builder** (`buildSectionedHearingRows`) that takes
a section list and an optional date column. Only family D needs a distinct builder because its data
is a nested tree (`courtLists → courtHouse → courtRoom → session → sittings → hearing → case`).

This mirrors the existing PDF arrangement exactly: family A already has one PDF generator serving
8 list types (`libs/list-types/rcj-standard-daily-cause-list/src/pdf/pdf-generator.ts`) and family D
already shares `libs/list-types/daily-cause-list-common/src/pdf/pdf-generator.ts`.

### 1.3 Why CSV rows derive from renderer output, not raw JSON

AC2 requires that **every data field in the PDF is also in the CSV**. The PDF does not render raw
JSON — it renders the *renderer's* output, and the renderers do real work that the raw JSON does not
contain:

- `libs/list-types/rcj-standard-daily-cause-list/src/rendering/renderer.ts` — `normaliseHearings()`
  coerces/defaults every field and produces the `header` block (`listTitle`, `listDate`,
  `lastUpdatedDate`, `lastUpdatedTime`).
- `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` — `renderCauseListData()` is
  `async` (it awaits `getLocationById`) and **mutates the tree in place**, adding
  `session.formattedJudiciaries`, `sitting.time`, `sitting.duration`/`durationAsHours`/`durationAsMinutes`,
  `sitting.caseHearingChannel`, `case.applicant`/`respondent` (+ representatives), and
  `case.formattedReportingRestriction`. None of those exist on the input JSON.
- `libs/list-types/court-of-appeal-civil-daily-cause-list/src/rendering/renderer.ts` — formats
  `FutureJudgment.date` to `dd/MM/yyyy` via `formatDdMmYyyyDate`.

If the CSV re-derived fields from raw JSON it would silently drift from the PDF the moment a renderer
changed, and AC2 would rot. **Every CSV generator therefore calls the same `render*` function the PDF
generator calls, on the same inputs, and reads the same properties the `.njk` template reads.** A
field-parity guard test (§5.4) enforces this mechanically.

### 1.4 Serialisation: reuse `papaparse`

`papaparse` is **already a repo dependency and already used to produce CSV** —
`libs/system-admin-pages/src/reference-data-upload/services/download-service.ts:68` is
`return Papa.unparse(csvData, { header: true });`, and `parsers/csv-parser.ts:35` uses `Papa.parse`.
Pinned at `papaparse` `5.5.4` / `@types/papaparse` `5.5.2` (`libs/system-admin-pages/package.json:37,43`).

The plan **reuses `Papa.unparse`** rather than hand-writing an RFC 4180 serialiser as the issue spec
proposed. The only things papaparse does not do, and which we add:

1. **UTF-8 BOM** (`﻿`) prefix, so Excel renders Welsh diacritics correctly.
2. **Per-cell `sanitiseCellValue`** — reuse the existing
   `libs/list-types/common/src/excel/excel-utilities.ts` helper (`CSV_INJECTION_CHARS = ["=", "+", "-", "@"]`,
   prefixes `'`). Formula-injection defence, already proven in the Excel path.

`papaparse` must be added to `libs/list-types/common/package.json` at the same pinned versions.

### 1.5 Pipeline shape

CSV generation slots in beside Excel, using the identical swallow-and-log contract:

```
processPublication (libs/publication/src/processing/service.ts:586)
  → generatePublicationPdf   (416)  → ${artefactId}.pdf   → CONTAINER.PUBLICATIONS
  → generatePublicationExcel (390)  → ${artefactId}.xlsx  → CONTAINER.PUBLICATIONS
  → generatePublicationCsv   (NEW)  → ${artefactId}.csv   → CONTAINER.PUBLICATIONS
  → sendPublicationNotificationsForArtefact (466)
```

`generatePublicationExcel` returns `{}` for an unregistered list type and `console.warn`/`console.error`
+ `{}` on any failure. `generatePublicationCsv` copies that behaviour verbatim: **a CSV failure can
never fail the publication, the PDF, or the notification.**

### 1.6 No `csvPath` threading is required

The issue spec proposed setting `result.csvPath` in `processPublication` and threading it through
`sendPublicationNotificationsForArtefact`. **Verified unnecessary.**
`buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:457-489`)
already ignores any passed path and *blindly probes* the blob store:

```ts
// notification-service.ts:466
const excelBuffer = await downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS);
```

`PublicationEvent.excelPath` (`libs/notifications/src/notification/validation.ts:21`) is dead — never
read anywhere. Both notification entry points (`buildEnhancedEmailData` :450 and
`buildFallbackEmailData` :500) funnel through `buildEmailDataWithFiles`, and both consumers
(`processUserNotification` :378, `processListTypeUserNotification` :601) pass the buffers to
`sendEmail`. So **one added `${artefactId}.csv` probe in `buildEmailDataWithFiles` covers both
subscription paths with zero plumbing changes to `processPublication`.** This also fixes the fact
that `sendListTypePublicationNotifications` (service.ts:518) is only handed `pdfFilePath`.

### 1.7 Download UX recommendation: in-page links, no disclaimer interstitial

SJP uses a three-page flow: `list-download-disclaimer` → `list-download-files` → `download`, all
behind `requireVerifiedWithProvenance` (`apps/web/src/pages/(list-types)/sjp-press-list/`).

**Recommendation: do not replicate that for RCJ.** Add a small "Download this list" section directly
on each existing list page, with direct links to the PDF and CSV.

Reasoning:

- The SJP disclaimer exists because SJP lists contain Special Category personal data about named
  individuals convicted in absentia, and access is restricted to verified media with an allowed
  provenance. That risk does not apply to RCJ cause lists.
- RCJ list pages are already access-gated: `createSimpleListTypeHandler`
  (`apps/web/src/pages/(list-types)/list-type-handler.ts:107`) enforces `canAccessPublicationData`,
  and civil/family go through `createListTypeHandler` (:30) with `checkAccess: true`. The CSV
  contains nothing the user is not already being shown on the page.
- Replicating the SJP flow means 2 extra pages × 12 routes plus verified-user gating on content that
  is currently open. That is a policy change, not a download feature.
- Fewer clicks. GDS: do not put an interstitial in front of a file the user can already read.

**Caveat to raise:** `FAMILY_DAILY_CAUSE_LIST` has `defaultSensitivity: "Private"`
(`list-type-data.ts:25`) unlike the other 11. See CLARIFICATIONS #4.

### 1.8 Blocking pre-existing defect: wrong blob container on read

Files are **written** to `CONTAINER.PUBLICATIONS`:

- `libs/list-types/common/src/pdf/pdf-utilities.ts:36` (`savePdfToStorage`)
- `libs/list-types/common/src/excel/excel-utilities.ts:40` (`saveExcelToStorage`)
- `libs/excel-generation/src/file-storage/file-storage-service.ts:4` (`saveExcelFile`)

They are **read** with no container argument, which defaults to `CONTAINER.ARTEFACT`
(`libs/azure-blob/src/blob-client.ts` — `containerName: ContainerName = CONTAINER.ARTEFACT` on
`downloadBlob`, `getBlobProperties`, `uploadBlob`, `deleteBlob`):

- `apps/web/src/pages/(list-types)/sjp-download-shared.ts:18` — `await downloadBlob(fileName)`
- `apps/web/src/pages/(list-types)/sjp-download-shared.ts:34` — `getBlobProperties(...)` ×2
- `apps/web/src/pages/(list-types)/sjp-press-list/index.ts:58` — `getBlobProperties(...)` ×2

Existing unit tests mock `@hmcts/azure-blob` wholesale, so they never catch it. **This must be fixed
first or the new RCJ download links will never render and every download will 404.** Fix = pass
`CONTAINER.PUBLICATIONS` explicitly at all five read sites, and add a test that asserts the container
argument rather than only the blob key.

### 1.9 No database changes

Confirmed: no schema change, no migration, no `list-type-data.ts` edit. All 12 list types already
exist. Blob keys are derived from `artefactId` (`${artefactId}.csv`); nothing about the CSV is
persisted in Postgres. Nothing to add under `libs/postgres-prisma/prisma/schema/`.

---

## 2. Implementation Details

**TEMPLATE SOURCE:** n/a — no new rendered page or list-type view; this reuses the existing local SJP
download handler/partial pattern in `apps/web/src/pages/(list-types)/`.

### 2.1 File-by-file

#### Shared CSV utility (new)

| File | Action | Detail |
|---|---|---|
| `libs/list-types/common/src/csv/csv-writer.ts` | NEW | `toCsvBuffer(headers: string[], rows: string[][]): Buffer` — maps every cell through `sanitiseCellValue`, calls `Papa.unparse({ fields, data })`, prefixes `﻿`, returns `Buffer.from(..., "utf8")`. |
| `libs/list-types/common/src/csv/csv-storage.ts` | NEW | `saveCsvToStorage(artefactId, buffer)` — mirrors `excel-utilities.ts:40`: `uploadBlob(\`${artefactId}.csv\`, buffer, CONTAINER.PUBLICATIONS)`, returns `{ blobKey, sizeBytes, exceedsMaxSize }`. |
| `libs/list-types/common/src/csv/sectioned-hearing-rows.ts` | NEW | `buildSectionedHearingRows(sections, options)` — shared row builder for families A/B/C over `StandardHearing`. `options.includeSection`, `options.includeDate`. |
| `libs/list-types/common/src/index.ts` | EDIT | Named re-exports: `toCsvBuffer`, `saveCsvToStorage`, `buildSectionedHearingRows`, `downloadsEn`, `downloadsCy`. |
| `libs/list-types/common/src/locales/en.ts` / `cy.ts` | EDIT | Add a `downloads` block (see §2.5). **NB: these files currently contain *only* `provenanceLabels`**, exported as `provenanceLabelsEn`/`provenanceLabelsCy` — they are not yet a general copy file. |
| `libs/list-types/common/package.json` | EDIT | Add `"papaparse": "5.5.4"` and `"@types/papaparse": "5.5.2"`. |

`libs/list-types/common` must **not** import `@hmcts/publication` — publication depends on the
list-type libs, so that would be circular. It only needs `@hmcts/azure-blob`, which it already has.

#### Family A — RCJ standard (8 list types)

| File | Action | Detail |
|---|---|---|
| `libs/list-types/rcj-standard-daily-cause-list/src/csv/csv-generator.ts` | NEW | `generateRcjStandardDailyCauseListCsv(options)`. `options` mirrors the PDF's `PdfGenerationOptions` (`src/pdf/pdf-generator.ts`): `{ artefactId, jsonData: StandardHearingList, locale, contentDate, listTypeName, provenance }`. Calls `renderStandardDailyCauseList(...)` with the same arguments the PDF generator uses, resolves `listTitle` from the **same `LIST_TITLE_MAP` the PDF uses** (`pdf-generator.ts:25`), resolves `provenanceLabel` from `PROVENANCE_LABELS`, builds rows via `buildSectionedHearingRows`, then `saveCsvToStorage`. |
| `libs/list-types/rcj-standard-daily-cause-list/src/locales/en.ts` / `cy.ts` | EDIT | Add `csvHeaders` for the context columns only (§2.4). |
| `libs/list-types/rcj-standard-daily-cause-list/src/index.ts` | EDIT | Export the generator. |

#### Family B — London Administrative Court (1 list type, 2 sections)

| File | Action | Detail |
|---|---|---|
| `libs/list-types/london-administrative-court-daily-cause-list/src/csv/csv-generator.ts` | NEW | Calls `renderLondonAdminCourtData(...)`, emits `mainHearings` then `planningCourt` with `includeSection: true`. Section labels reuse the **existing** `t.mainHearingsTitle` (`locales/en.ts:17`) and `t.planningCourtTitle` (`:18`). |
| `.../src/locales/en.ts` / `cy.ts` | EDIT | `csvHeaders` context columns only. |
| `.../src/index.ts` | EDIT | Export. |

#### Family C — Court of Appeal Civil (1 list type, 2 sections + date)

| File | Action | Detail |
|---|---|---|
| `libs/list-types/court-of-appeal-civil-daily-cause-list/src/csv/csv-generator.ts` | NEW | Calls the existing renderer, emits `dailyHearings` then `futureJudgments` with `includeSection: true, includeDate: true`. Section labels reuse existing `t.dailyHearingsTitle` (`locales/en.ts:22`) and `t.futureJudgmentsTitle` (`:23`, value **"Notice for future judgments"**). |
| `.../src/locales/en.ts` / `cy.ts` | EDIT | `csvHeaders` context columns only. |
| `.../src/index.ts` | EDIT | Export. |

#### Family D — Civil + Family strategic cause lists (2 list types)

| File | Action | Detail |
|---|---|---|
| `libs/list-types/daily-cause-list-common/src/rendering/duration-formatting.ts` | NEW | `formatDuration(durationAsHours, durationAsMinutes, t)` — extracted from the PDF template (see below). |
| `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` | EDIT | Set `sitting.durationText = formatDuration(...)` alongside the existing `sitting.duration*` assignments, so PDF and CSV share one implementation. |
| `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk` | EDIT | Replace the inline `{% set %}` duration block (lines 66–87) with `{{ sitting.durationText }}`. |
| `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` | EDIT | Same. |
| `libs/list-types/daily-cause-list-common/src/csv/csv-generator.ts` | NEW | `generateCauseListCsv(options, importEn, importCy, columnSet)` — walks the tree, one row per `case`, emitting a trailing reporting-restriction column. Mirrors the shape of `src/pdf/pdf-generator.ts`. Must `await` the renderer (it is async). |
| `libs/list-types/civil-daily-cause-list/src/csv/csv-generator.ts` | NEW | Thin wrapper exactly like `src/pdf/pdf-generator.ts`: resolve `provenanceLabel` from `PROVENANCE_LABELS`, delegate with locale importers and the civil column set (`t.caseId` header, no applicant/respondent). |
| `libs/list-types/family-daily-cause-list/src/csv/csv-generator.ts` | NEW | Same, with the family column set (`t.caseRef` header, plus `t.applicant` / `t.respondent`). |
| `libs/list-types/daily-cause-list-common/src/locales/*`, civil + family `locales/en.ts`/`cy.ts` | EDIT | `csvHeaders` context columns + duration unit strings (§2.4). |

**Why the duration extraction is mandatory:** `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk`
lines 66–87 build the duration string *inside Nunjucks* with hardcoded English `' hours'`, `' hour'`,
`' mins'`, `' min'`. That is presentation logic living in a template. If the CSV reimplemented it,
there would be two copies to keep in sync and AC2 would be fragile. Extracting it also fixes the
untranslated English units in the Welsh PDF as a side effect.

#### Publication pipeline

| File | Action | Detail |
|---|---|---|
| `libs/publication/src/processing/service.ts` | EDIT | Add `interface GenerateCsvParams` — copy `GenerateExcelParams` (lines 338–346: `artefactId`, `listTypeName`, `contentDate`, `locale`, `locationId`, `jsonData`, `logPrefix`) and **add `provenance`**, which `GenerateExcelParams` lacks but the CSV needs for the "Data source" column. Add `CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>>` keyed by `listTypeName`, with 12 entries (one `rcjStandardCsvGenerator` reused for the 8 family-A names, exactly as `rcjStandardGenerator` is at line 90). Add `listTypeHasCsv(listTypeName)` and `generatePublicationCsv(params)` mirroring lines 386 and 390 — return `{}` for unknown type, `{ hasCsv: true }` on success, `console.warn`/`console.error` + `{}` on failure. |
| `libs/publication/src/processing/service.ts` | EDIT | In `processPublication` (:586), after the `generatePublicationExcel` call, add the `generatePublicationCsv` call. Set `result.csvPath = \`${artefactId}.csv\`` for observability/logging **only** — do not thread it into notifications (§1.6). |

`sendThirdPartyPublications` receives `pdfPath` and `flatFilePath` only; **third-party distribution of
CSV is out of scope** for this ticket.

#### Download routes and page section

| File | Action | Detail |
|---|---|---|
| `apps/web/src/pages/(list-types)/sjp-download-shared.ts` | RENAME → `list-download-shared.ts` | Now serves both SJP and RCJ. Update the SJP importers. |
| `list-download-shared.ts` | EDIT | `ALLOWED_TYPES = new Set(["pdf", "xlsx", "csv"])`. Keep `UUID_REGEX`. Pass `CONTAINER.PUBLICATIONS` to `downloadBlob` (was line 18) and to both `getBlobProperties` calls (was line 34); add a `${artefactId}.csv` probe. `Content-Type` already resolves via `getContentType(extension)` and `libs/publication/src/file-storage/content-type.ts` already maps `".csv" → "text/csv"` — no change needed there. |
| `list-download-shared.ts` | EDIT | New `buildDownloadSection(artefactId, prefix, locale)` → `{ heading, links: [{ href, text }] }`, resolving copy from `downloadsEn`/`downloadsCy` and size labels from the existing `formatFileSize`. Single place where download copy is resolved. |
| `apps/web/src/pages/(list-types)/list-type-handler.ts` | EDIT | Make `render` inside `createMultiListGuardAndRender` (**currently synchronous, line 267**) `async`, and `await buildDownloadSection(...)`; add `downloads` to the render model. `createSimpleListTypeHandler` (:156) and `createListTypeHandler` (:30) already `await render`, so callers are safe. Same addition to `createCauseListRender` (:225, already async). |
| `libs/web-core/src/views/components/list-downloads.njk` | NEW | Shared partial: `<h2>` + `{% for link in downloads.links %}` of `govuk-link` anchors. Renders nothing when `downloads.links` is empty. Mirrors the link-text composition in `apps/web/src/pages/(list-types)/sjp-press-list/list-download-files.njk`. |
| 8 × `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/*.njk`, `london-administrative-court-daily-cause-list/index.njk`, `court-of-appeal-civil-daily-cause-list/index.njk`, `civil-daily-cause-list/index.njk`, `family-daily-cause-list/index.njk` | EDIT | `{% include "components/list-downloads.njk" %}` after the list content. **None of these templates currently reference downloads at all.** |
| `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/download.ts` | NEW | `export const GET: RequestHandler = handleBlobDownload;` plus `export const ROUTES = [...]`. **Verified router behaviour** (`libs/simple-router/dist/simple-router.js:84-89`): a `ROUTES` export *replaces* the derived path for that module, so this file must list all 8 URLs each suffixed `/download` — the eight in `index.ts`'s `ROUTES` with `/download` appended. |
| `apps/web/src/pages/(list-types)/london-administrative-court-daily-cause-list/download.ts` | NEW | `ROUTES = ["/london-administrative-court-daily-cause-list/download"]`. |
| `apps/web/src/pages/(list-types)/court-of-appeal-civil-daily-cause-list/download.ts` | NEW | `ROUTES = ["/court-of-appeal-civil-division-daily-cause-list/download"]`. |
| `apps/web/src/pages/(list-types)/civil-daily-cause-list/download.ts` | NEW | Derived path is fine, no `ROUTES` needed. |
| `apps/web/src/pages/(list-types)/family-daily-cause-list/download.ts` | NEW | Same. |
| `apps/web/src/pages/(list-types)/sjp-press-list/index.ts` | EDIT | Fix the container on the two `getBlobProperties` calls at line 58. |

No auth middleware on the `download.ts` handlers for RCJ — the page that links to them is already
gated, and the handler validates `artefactId` as a UUID against a fixed type allow-list. SJP's
`download.ts` keeps its `requireVerifiedWithProvenance` chain unchanged.

#### Notifications

| File | Action | Detail |
|---|---|---|
| `libs/notifications/src/notification/notification-service.ts` | EDIT | `EmailTemplateData` (349–354): add `csvBuffer?`. In `buildEmailDataWithFiles` (457–489) add `downloadBlob(\`${artefactId}.csv\`, CONTAINER.PUBLICATIONS)` to the existing `Promise.all`-style probing, compute `hasCsv` and `csvUnder2MB` against `MAX_PDF_SIZE_BYTES` (:116, `2 * 1024 * 1024`), fold `csvUnder2MB` into `filesUnder2MB`, pass `hasCsv` to `getSubscriptionTemplateId`, and return `csvBuffer` only when under 2MB. |
| `libs/notifications/src/notification/notification-service.ts` | EDIT | `processUserNotification` (:378) and `processListTypeUserNotification` (:601): pass `csvBuffer` to `sendEmail`. |
| `libs/notifications/src/govnotify/govnotify-client.ts` | EDIT | `SendEmailParams` (32–38): add `csvBuffer?`. After the `excelBuffer` block (83–90), add the identical `csvBuffer` block: `prepareUpload(buffer, { confirmEmailBeforeDownload: false, retentionPeriod: "1 week" })` → `personalisation.csv_link_to_file` and `csv_link_text = "Download CSV version"`. |
| `libs/notifications/src/govnotify/template-config.ts` | EDIT | `getSubscriptionTemplateId` (:15): accept `hasCsv`. Add a `hasPdf && hasCsv` branch returning a new `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`. **Follow the existing fallback style (lines 3–5) rather than the throw style:** fall back to `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`, then to `..._NON_SJP_PDF`, so an unset env var degrades to a PDF-only email instead of throwing and losing the notification entirely. |

Evidence for the degrade-not-throw recommendation: `GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY`
(`template-config.ts:2`) is set in **no** helm values file, so that branch already throws in every
environment today. Repeating the pattern for CSV would add a new way to lose emails.

#### Config and helm

| File | Action | Detail |
|---|---|---|
| `apps/web/.env.example` | EDIT | Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV=` near the existing Notify block (lines 55–59). |
| `apps/web/helm/values.yaml` | EDIT | Add the key beside `..._SUBSCRIPTION_PDF_EXCEL` (lines 23–27). |
| `apps/web/helm/values.dev.yaml` | EDIT | Same. |
| `apps/api/helm/values.yaml` | EDIT | Add beside the existing three Notify IDs (lines 10–12). |

**`apps/api/helm/values.dev.yaml` does not exist** — the issue spec referenced it. `apps/api` also has
no `.env.example`.

### 2.2 CSV column specification — families A, B, C

All three share the same context prefix, then the seven PDF hearing columns in PDF order
(`libs/list-types/rcj-standard-daily-cause-list/src/pdf/pdf-template.njk`).

| Column | Header source | Value source |
|---|---|---|
| List name | `t.csvHeaders.listName` (new) | `header.listTitle` |
| List date | `t.common.listFor` (existing) | `header.listDate` |
| Last updated | `t.common.lastUpdated` (existing) | `header.lastUpdatedDate` + `header.lastUpdatedTime` |
| Data source | `t.common.dataSource` (existing) | `provenanceLabel` |
| *Section* — B and C only | `t.csvHeaders.section` (new) | B: `mainHearingsTitle` \| `planningCourtTitle`. C: `dailyHearingsTitle` \| `futureJudgmentsTitle` |
| *Date* — C only | `t.csvHeaders.date` (new) | `FutureJudgment.date`; empty for daily hearings |
| Venue | `t.common.tableHeaders.venue` | `hearing.venue` |
| Judge | `t.common.tableHeaders.judge` | `hearing.judge` |
| Time | `t.common.tableHeaders.time` | `hearing.time` |
| Case number | `t.common.tableHeaders.caseNumber` | `hearing.caseNumber` |
| Case details | `t.common.tableHeaders.caseDetails` | `hearing.caseDetails` |
| Hearing type | `t.common.tableHeaders.hearingType` | `hearing.hearingType` |
| Additional information | `t.common.tableHeaders.additionalInformation` | `hearing.additionalInformation` |

### 2.3 CSV column specification — family D (Civil, Family)

One row per `case`, with the parent tree context flattened onto every row (the PDF conveys that
context via `<h2>`/sub-headings; the CSV must carry it per row or the data is unusable).

| Column | Header source | Value source |
|---|---|---|
| List name | `t.csvHeaders.listName` (new) | `t.title` |
| List date | `t.listFor` (existing) | `header.contentDate` |
| Last updated | `t.lastUpdated` (existing) | `header.lastUpdated` |
| Data source | `t.dataSource` (existing) | `provenanceLabel` |
| Court house | `t.csvHeaders.courtHouse` (new) | `courtHouse.courtHouseName` |
| Court house address | `t.csvHeaders.courtHouseAddress` (new) | joined `courtHouse.courtHouseAddress` lines |
| Court room | `t.csvHeaders.courtRoom` (new) | `courtRoom.courtRoomName` |
| Judiciary | `t.csvHeaders.judiciary` (new) | `session.formattedJudiciaries` |
| Time | `t.time` (existing) | `sitting.time` |
| Case ID / Case ref | Civil `t.caseId`, Family `t.caseRef` (existing) | `case.caseNumber` |
| Case name | `t.caseName` (existing) | `case.caseName` + ` [case.caseSequenceIndicator]` when present — matches the PDF template exactly |
| Case type | `t.caseType` (existing) | `case.caseType` |
| Hearing type | `t.hearingType` (existing) | `hearing.hearingType` |
| Location | `t.location` (existing) | `sitting.caseHearingChannel` |
| Duration | `t.duration` (existing) | `sitting.durationText` (from the extracted formatter) |
| Applicant — **Family only** | `t.applicant` (existing) | `case.applicant` |
| Respondent — **Family only** | `t.respondent` (existing) | `case.respondent` |
| Reporting restriction | `t.csvHeaders.reportingRestriction` (new) | `case.formattedReportingRestriction`; empty when none |

The PDF renders reporting restrictions as a `<td colspan="7">` (Civil) / `colspan="9"` (Family) row
beneath the case; in CSV it becomes a trailing column on the case's own row. Representative fields
(`applicantRepresentative`, `respondentRepresentative`) are set by the renderer but **not rendered in
either PDF**, so they are excluded — AC2 is parity with the PDF, not with the renderer.

### 2.4 Static PDF narrative content is excluded

The family-A PDF template carries a large per-court information box, a FaCT link, court address lines
1–4, and `cautionNote`/`cautionReporting` footer text. These are **static template copy**, not
hearing data. They are excluded from the CSV. See CLARIFICATIONS #5.

### 2.5 Locale placement

`libs/list-types/common/src/locales/{en,cy}.ts` **exists but currently holds only `provenanceLabels`**
(MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA), exported as `provenanceLabelsEn` /
`provenanceLabelsCy`. Shared download copy goes there as a new `downloads` block exported as
`downloadsEn` / `downloadsCy`, because all five affected page controllers already depend on
`@hmcts/list-types-common` — no new edges in the dependency graph.

```ts
// libs/list-types/common/src/locales/en.ts
export const downloads = {
  heading: "Download this list",
  pdfLink: "Download PDF version",
  csvLink: "Download CSV version",
  toDevice: "to your device"
};
```

```ts
// libs/list-types/common/src/locales/cy.ts
export const downloads = {
  heading: "[WELSH TRANSLATION REQUIRED: 'Download this list']",
  pdfLink: "[WELSH TRANSLATION REQUIRED: 'Download PDF version']",
  csvLink: "[WELSH TRANSLATION REQUIRED: 'Download CSV version']",
  toDevice: "[WELSH TRANSLATION REQUIRED: 'to your device']"
};
```

Every new `csvHeaders` key in every affected lib follows the same
`[WELSH TRANSLATION REQUIRED: '...']` convention in `cy.ts`, and `en.ts`/`cy.ts` key sets must stay
identical (asserted by test — §5.2).

---

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| **CSV generation fails** | `generatePublicationCsv` catches, `console.error`s with the `logPrefix`, returns `{}`. Publication succeeds, PDF is unaffected, notification still sends with the PDF only. Copied verbatim from `generatePublicationExcel` (`libs/publication/src/processing/service.ts:390`). |
| **List type not registered for CSV** | `CSV_GENERATOR_REGISTRY[listTypeName]` is `undefined` → return `{}` immediately, no warning noise beyond a debug log. Same as Excel. |
| **Empty hearing list** | Generator still writes a CSV containing the BOM + header row, so the download link appears and the file opens cleanly in Excel. Do not skip generation — an empty list is valid published data. |
| **Blob missing on download** | `handleBlobDownload` already returns `404 { error: "File not found" }` when `downloadBlob` yields nothing. Unchanged. |
| **Blob missing on page render** | `buildDownloadSection` probes with `getBlobProperties`; a missing blob simply omits that link. If no files exist, `downloads.links` is empty and the partial renders nothing — no empty heading. |
| **Historical artefacts with no CSV** | Published before this change → no `.csv` blob → PDF-only link on the page, PDF-only link in emails. No backfill in this ticket (CLARIFICATIONS #7). |
| **Path traversal / arbitrary blob read** | Two existing defences retained: `UUID_REGEX` on `artefactId` and the `ALLOWED_TYPES` allow-list (now `pdf`, `xlsx`, `csv`). Both must pass or `400 { error: "Invalid request" }`. The extension is never taken from user input beyond that allow-list. |
| **CSV formula injection** | Every cell goes through `sanitiseCellValue` (`libs/list-types/common/src/excel/excel-utilities.ts`) before `Papa.unparse`. Safe on empty strings. |
| **File over Notify's 2MB limit** | `buildEmailDataWithFiles` already compares against `MAX_PDF_SIZE_BYTES` and withholds the buffer; the oversize file is simply not linked, and `filesUnder2MB` steers `getSubscriptionTemplateId` to the no-links template. The in-page download link is unaffected — it streams from blob storage with no size limit. |
| **Notify template env var unset** | Falls back `..._SUBSCRIPTION_PDF_CSV` → `..._SUBSCRIPTION_PDF_EXCEL` → `..._NON_SJP_PDF`. Degrades to a PDF-only email; never throws. |
| **Welsh** | The CSV is generated per artefact locale using the same locale importer the PDF uses. UTF-8 BOM ensures diacritics survive in Excel. Two known pre-existing gaps are documented, not fixed here: family A's `LIST_TITLE_MAP` (`pdf/pdf-generator.ts:25-34`) is English-only, so a Welsh family-A CSV shows an English list title *exactly as the Welsh PDF already does*; and family C's `header.listTitle` is hardcoded in the renderer (`rendering/renderer.ts:40`). Fixing those changes the PDF and is out of scope. |
| **Wrong blob container (pre-existing)** | Must be fixed as task 1 (§1.8) or nothing else works. |
| **Renderer mutates input (family D)** | `renderCauseListData` mutates `jsonData` in place. The CSV generator calls the renderer itself on its own parsed copy — it must **not** reuse an object already passed to the PDF generator, or double-formatting could occur. |

---

## 4. Acceptance Criteria Mapping

### AC1 — CSV and PDF both available as downloadable options for all RCJ lists

| How satisfied | How verified |
|---|---|
| `CSV_GENERATOR_REGISTRY` holds all 12 `listTypeName`s; `generatePublicationCsv` runs in `processPublication` for every publication; `buildDownloadSection` surfaces one link per existing blob; 5 new `download.ts` route modules cover all 12 URLs (family A's exports 8 paths). | Unit test asserting `Object.keys(CSV_GENERATOR_REGISTRY)` equals the 12 expected names, so a new RCJ list cannot be added without a CSV. Template tests asserting both anchors render. E2E journey downloading a CSV. Manual check that `ALLOWED_TYPES` accepts `csv`. |

### AC2 — All data fields in the PDF are also in the CSV

| How satisfied | How verified |
|---|---|
| Each CSV generator calls the *same* `render*` function as its PDF generator and reads the same properties the `.njk` template reads. Column specs §2.2/§2.3 were derived by reading each PDF template's `<th>`/`<td>` set. Duration formatting is extracted from the template into `formatDuration` so PDF and CSV share one implementation. | The **field-parity guard test** (§5.4) — parses each PDF `.njk` for the fields it renders and asserts each appears in the corresponding CSV column map. Plus per-family unit tests asserting exact header rows and cell values. |

### AC3 — Links to download both file types displayed in email notifications

| How satisfied | How verified |
|---|---|
| `buildEmailDataWithFiles` probes `${artefactId}.csv`; `govnotify-client.ts` calls `prepareUpload` and sets `csv_link_to_file` / `csv_link_text`; `getSubscriptionTemplateId` selects a PDF+CSV template. Because both notification paths funnel through `buildEmailDataWithFiles`, location, case **and** list-type subscriptions all get the link. | Unit tests on `buildEmailDataWithFiles` (csv present / absent / oversize), on `govnotify-client` (personalisation keys set only when the buffer exists), and on `getSubscriptionTemplateId` (each branch + each fallback). Manual Notify preview once the template exists. |

---

## 5. Testing

### 5.1 Unit tests (Vitest, co-located `*.test.ts`, Arrange-Act-Assert)

| File | Coverage |
|---|---|
| `libs/list-types/common/src/csv/csv-writer.test.ts` | BOM is the first bytes; embedded commas/quotes/newlines round-trip via `Papa.parse`; `=cmd` / `+1` / `-1` / `@x` are prefixed with `'`; empty rows produce a header-only file. |
| `libs/list-types/common/src/csv/csv-storage.test.ts` | Uploads to `CONTAINER.PUBLICATIONS` with key `${artefactId}.csv` — **assert the container argument**, not just the key. |
| `libs/list-types/common/src/csv/sectioned-hearing-rows.test.ts` | Section and date columns included/excluded per options; column order fixed. |
| One `csv-generator.test.ts` per family (4 files) | Exact header row (en and cy); one fully-populated hearing → exact cell values; empty list → header only; Welsh locale selects the `cy` importer. |
| `libs/list-types/daily-cause-list-common/src/rendering/duration-formatting.test.ts` | hours only, minutes only, both, zero, singular vs plural. |
| `libs/publication/src/processing/service.test.ts` | `CSV_GENERATOR_REGISTRY` key set == the 12 names; `generatePublicationCsv` returns `{}` and logs on throw; `processPublication` still resolves successfully when the CSV generator throws. |
| `libs/notifications/src/notification/notification-service.test.ts` | csv present → `csvBuffer` returned; absent → `undefined`; >2MB → withheld and `filesUnder2MB` false. |
| `libs/notifications/src/govnotify/govnotify-client.test.ts` | `csv_link_to_file` / `csv_link_text` set only when `csvBuffer` is present. |
| `libs/notifications/src/govnotify/template-config.test.ts` | Every branch of `getSubscriptionTemplateId` including the new fallback chain. |
| `apps/web/src/pages/(list-types)/list-download-shared.test.ts` | `csv` accepted; unknown type → 400; non-UUID → 400; `Content-Type: text/csv`; `Content-Disposition` filename; **`CONTAINER.PUBLICATIONS` passed to every blob call**; `buildDownloadSection` omits links for absent blobs and returns an empty list when nothing exists. |

Test fixtures use `listTypeId: 999` with a real `listTypeName`, per CLAUDE.md, to prove
ID-independence.

### 5.2 Locale parity

For each edited locale pair: `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`, plus
the same on the nested `csvHeaders` / `downloads` objects.

### 5.3 Template tests (`*.njk.test.ts`, `@hmcts/test-support` + Cheerio, structural assertions)

- `libs/web-core/src/views/components/list-downloads.njk.test.ts` — with two links renders two
  `a.govuk-link` with the expected `href` and text; with an empty list renders no `h2` and no anchor.
- Extend the existing per-list `*.njk.test.ts` files (all 8 family-A templates plus the other 4) to
  assert the download section is present when `downloads.links` is populated and **absent** when it
  is not, and that Welsh copy appears when rendered with the `cy` object. Assert on DOM structure and
  `toHaveLength`, no raw-HTML string matching, no AAA comments.
- The two edited PDF templates (Civil, Family) — assert `sitting.durationText` is rendered and the
  duration cell content is unchanged from before the extraction (regression guard).

### 5.4 Field-parity guard test (protects AC2 over time)

`libs/list-types/common/src/csv/field-parity.test.ts`. For each of the four families, read the PDF
`.njk` source, extract the data expressions it renders inside table cells (e.g. `hearing.venue`,
`case.caseNumber`, `sitting.durationText`) with a regex over `{{ ... }}`, and assert that every
extracted field path appears in that family's exported CSV column map. A curated
`EXCLUDED_FIELDS` set covers deliberate omissions — static narrative copy, `colspan` layout
artefacts, and the representative fields the PDFs do not render — each entry carrying a one-line
reason.

The test **fails when a new field is added to a PDF template and not to the CSV**, which is precisely
the AC2 regression risk as these templates evolve. It is deliberately a source-scanning test rather
than a snapshot: snapshots get regenerated without thought, a failing assertion with a named missing
field does not.

### 5.5 E2E (Playwright, `e2e-tests/tests/`)

**One** new spec, `e2e-tests/tests/rcj-list-downloads.spec.ts`, tagged `@nightly`, covering a single
complete journey and folding validation, Welsh and accessibility inline per `.claude/rules/e2e-testing.md`:

1. Navigate to a seeded RCJ list page.
2. Assert the download section shows both a PDF and a CSV link.
3. Run `AxeBuilder` on the page inline.
4. Switch to Welsh (`Cymraeg` link) and assert the translated download heading.
5. Keyboard-navigate to the CSV link and activate it.
6. Capture the download and assert filename and non-empty content.
7. Hit `/…/download?artefactId=not-a-uuid` and assert `400`.

Do **not** add separate specs per list type, per validation, per language or per Axe run.

---

## 6. Corrections to the issue specification

Direct answer to "flag anything in the pre-existing spec you found to be wrong":

1. **Hand-written RFC 4180 serialiser — wrong.** `papaparse` is already a dependency and already used
   for CSV output (`libs/system-admin-pages/src/reference-data-upload/services/download-service.ts:68`).
   Use `Papa.unparse`; add only the BOM and `sanitiseCellValue`.
2. **`result.csvPath` threading into notifications — unnecessary.** `buildEmailDataWithFiles`
   (`notification-service.ts:466`) blindly probes the blob store and ignores the path it is given;
   `PublicationEvent.excelPath` (`validation.ts:21`) is dead code never read. One `.csv` probe covers
   both subscription paths.
3. **New `csvSections` locale keys — redundant.** Section titles already exist:
   `mainHearingsTitle` / `planningCourtTitle` (london-admin `locales/en.ts:17-18`) and
   `dailyHearingsTitle` / `futureJudgmentsTitle` (COA civil `locales/en.ts:22-23`).
4. **"Future judgments" — wrong copy.** The real value is **"Notice for future judgments"**
   (COA civil `locales/en.ts:23`).
5. **"No new Welsh translations needed for data columns" — only partly true.** Family D's duration
   units are hardcoded English *inside the Nunjucks template*
   (`civil-daily-cause-list/src/pdf/pdf-template.njk:66-87`), and family A's `LIST_TITLE_MAP`
   (`pdf/pdf-generator.ts:25-34`) is English-only. Full Welsh parity is not free; new `csvHeaders`
   keys are needed for all context columns.
6. **`apps/api/helm/values.dev.yaml` — does not exist.** `apps/api/helm/` has only `values.yaml`.
7. **Missed a blocking defect.** Reads default to `CONTAINER.ARTEFACT` while writes go to
   `CONTAINER.PUBLICATIONS` (§1.8, five call sites). Nothing in this feature works until it is fixed,
   and existing tests cannot catch it because they mock `@hmcts/azure-blob` wholesale.
8. **Missed two API shape problems.** `createMultiListGuardAndRender`'s `render`
   (`apps/web/src/pages/(list-types)/list-type-handler.ts:267`) is synchronous and must become async
   to await the blob probe; and `GenerateExcelParams` (`libs/publication/src/processing/service.ts:338-346`)
   has no `provenance`, which the CSV needs for its "Data source" column, so `GenerateCsvParams`
   cannot simply be an alias.

Also worth noting: the `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` → `"Civil Daily Cause List"` display-title
collision the issue flagged is **real** (`rcj-standard-daily-cause-list/src/pdf/pdf-generator.ts:32`,
identical to `CIVIL_DAILY_CAUSE_LIST`'s friendly name at `list-type-data.ts:16`). Since CSV filenames
are `${artefactId}.csv`, the collision does not affect downloads — but two different lists produce a
CSV whose "List name" column reads identically. See CLARIFICATIONS #6.

---

## 7. CLARIFICATIONS NEEDED

1. **Is CSV genuinely wanted, or should the existing `.xlsx` path be extended instead?**
   `EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:361`), `saveExcelToStorage`,
   the Notify PDF+Excel template and the `excel_link_to_file` personalisation all already exist for
   Magistrates and SJP. Registering the 12 RCJ lists for Excel would reuse all of it and deliver a
   format most users open in Excel anyway, with materially less new code than a parallel CSV pipeline.
   CSV is the better choice only if the driver is machine-readability or open-data reuse. **Which is
   it?** The whole shape of this plan changes on the answer.

2. **Should Planning Court be its own list type rather than a section?**
   No `PLANNING_COURT_*` entry exists in `list-type-data.ts`, so it is currently a section of
   `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`. The issue lists it as a 13th list. If users expect
   to subscribe to or download Planning Court independently, that is a separate change to
   `list-type-data.ts`, the search config and the routes — not part of this ticket. **Confirm it stays
   a section.**

3. **Who creates the Notify template, and is the fallback behaviour acceptable?**
   A new PDF+CSV Notify template plus `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` in web/api helm
   is needed. This plan **recommends falling back to the PDF+Excel then PDF-only template when unset,
   rather than throwing** — the existing throw pattern already breaks silently today, since
   `GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY` (`template-config.ts:2`) is set in no helm file.
   **Confirm the degrade-not-throw approach, and who raises the Notify template request.**

4. **Should the RCJ download be gated behind the verified-user disclaimer?**
   Recommendation is no (§1.7). But `FAMILY_DAILY_CAUSE_LIST` has `defaultSensitivity: "Private"`
   (`list-type-data.ts:25`) unlike the other 11 — a machine-readable CSV of family hearings is easier
   to scrape and aggregate than a PDF. **Does the family list need different treatment, or is
   in-page-link parity with the existing PDF sufficient?**

5. **Does AC2's "all data fields" include the static PDF narrative content?**
   Family A's PDF carries a substantial per-court information box, a FaCT link, four court address
   lines and `cautionNote`/`cautionReporting` footer text. This plan treats those as template copy and
   excludes them, putting only hearing data plus list metadata in the CSV. **Confirm.**

6. **`MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` and `CIVIL_DAILY_CAUSE_LIST` both produce a CSV whose
   "List name" column reads "Civil Daily Cause List"** (`pdf/pdf-generator.ts:32` vs
   `list-type-data.ts:16`). Filenames are UUID-based so downloads do not clash, but the file contents
   are ambiguous. **Fix the title in this ticket (which changes the PDF too), or accept it?**

7. **Download filename: `<artefactId>.csv` or a human-friendly slug?**
   The existing handler sets `Content-Disposition: attachment; filename="<id>.<ext>"`
   (`sjp-download-shared.ts`), so users get a UUID filename. A slug like
   `kings-bench-division-daily-cause-list-2026-08-12.csv` is far more usable when several lists are
   downloaded, but diverges from SJP's current behaviour. **Change for both, change for RCJ only, or
   keep the UUID?**

8. **Backfill existing artefacts?**
   Artefacts published before release have no `.csv` blob, so they show a PDF-only link indefinitely
   (cause lists are daily, so this self-heals within a day for live data but not for the archive).
   **Is a one-off backfill job required, or is forward-only acceptable?**

9. **Third-party distribution.** `sendThirdPartyPublications` currently receives `pdfPath` and
   `flatFilePath` only. This plan leaves third-party CSV distribution out of scope. **Confirm no
   third-party subscriber needs the CSV.**
