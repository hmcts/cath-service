# Technical Plan — Issue #942: Excel download format for SSCS Hearing Lists

## 1. Technical Approach

### Strategy

The whole ticket reduces to **one new Excel generator plus registry entries**. Everything downstream — blob storage, email template selection, both download links, the existing public download endpoint — already works for any list type as soon as `{artefactId}.xlsx` exists in the `publications` container.

This was verified by reading the code, not assumed:

| Claim | Evidence |
|---|---|
| The email path already probes for an Excel blob for **every** list type | `libs/notifications/src/notification/notification-service.ts:474` — `downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS)` is unconditional |
| The PDF+Excel Notify template is selected automatically when both buffers exist and are <2MB | `libs/notifications/src/govnotify/template-config.ts:37-43` |
| A public download endpoint for the Excel already exists and is list-type agnostic | `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` (`?format=excel`) → `getExcelForDownload` (`libs/public-pages/src/flat-file/flat-file-service.ts:81`), which explicitly has **no** flat-file guard so JSON publications work |
| Artefact deletion already removes the `.xlsx` | `libs/publication/src/repository/queries.ts` |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is configured | `apps/web/helm/values.yaml:25`, `apps/api/helm/values.yaml:12`, `apps/web/.env.example:56` |

**Therefore: no changes to `libs/notifications`, no changes to the download endpoint, no new routes.** Producing the blob satisfies AC1, AC3 and AC4.

### The two real gaps

1. **No Excel generator is registered for any SSCS list type.** `EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:363-386`) contains only `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST` and the four SJP list types.
2. **The Liverpool list type does not exist.** The issue names 8 SSCS lists; `libs/list-types/common/src/list-type-data.ts:577-655` defines 7 (Midlands, South East, Wales and South West, Scotland, North East, North West, London). There is no `SSCS_LIVERPOOL_DAILY_HEARING_LIST` — no seed entry, no converter registration (`sscs-config.ts:70-76`), no `SSCS_FRIENDLY_NAMES` entry, no `importantInformationByListType` entry. The *location* "Liverpool Social Security and Child Support Tribunal" does exist (`libs/location/src/location-data.ts:174`), and the North West list's observer email is `sscsa-liverpool@justice.gov.uk` — which strongly suggests **Liverpool already publishes under the North West list**. See Open Question 1. The other seven ship regardless.

### Architecture decisions

**A. Generate the `.xlsx` from the converted JSON, not from the admin's uploaded binary.**

AC2 says *"The uploaded excel file will be re-used in providing the excel file for download."* Read literally that means storing and re-serving the admin's uploaded workbook. This plan does **not** do that:

1. The uploaded file is not retained — `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` writes only the converted JSON to the `artefact` container, with a comment saying the Excel is deliberately discarded.
2. Re-serving the raw upload would publish **unvalidated columns**. `SSCS_EXCEL_CONFIG` maps exactly nine fields; any extra column, working note or hidden sheet an admin leaves in the workbook is invisible to the PDF and the on-screen list but would be shipped verbatim to every subscriber. That is a data-exposure defect.
3. A `WELSH` publication would get English-only headers, contradicting its own PDF.
4. It re-distributes an unscanned admin-supplied binary with whatever formulas it carries. The generated path runs every cell through `sanitiseCellValue`, which neutralises formula injection.

The generated file's **data content is the validated upload data** — same rows, same values, same order, no second data source, no re-keying. That satisfies the intent of AC2 (don't build a parallel data pipeline) while satisfying AC3 exactly. It is also how every other Excel download in this codebase is produced. **Flagged for PO confirmation — Open Question 4.**

**B. One generator serves all SSCS list types.** All SSCS lists share one converter (`sscsConverter`), one JSON schema, one type (`SscsDailyHearingList`) and one PDF template. Only the header language varies. A single `generateSscsDailyHearingListExcel` registered under each name is the DRY answer.

**C. Reuse `t.tableHeaders` for the column headings — do not add an `excelColumns` block.** Both `en.ts` and `cy.ts` already carry all nine headings, and the SSCS Excel columns match the PDF/on-screen table 1:1. Magistrates needs a separate `excelColumns` block only because its Excel has 26 columns that differ from its table. Reusing `tableHeaders` keeps the Excel and the PDF in lockstep by construction and adds no keys that can drift.

**D. Iterate `jsonData` directly — do not call the renderer.** `renderSscsDailyHearingListData` (`libs/list-types/sscs-daily-hearing-list/src/rendering/renderer.ts:33`) returns `hearings: hearingList` unchanged. Calling it would add a dependency and a header-formatting concern for no transformation. The magistrates generator calls its renderer because that renderer actually restructures the data; SSCS's does not.

**E. In-page download link is out of scope by default.** No comparable list type has one. Magistrates Public and Magistrates Standard both generate Excel files today and neither has an in-page download link — only SJP does (`sjp-download-shared.ts`). The issue's problem statement is explicit that the gap is *"the email notification"*. Adding an SJP-style interstitial page for SSCS would also require fixing a container bug in shared SJP code (see §5) and making a fresh access-control decision. See Open Question 3 — if the PO wants it, the cheap answer is to link straight to the existing `/api/flat-file/:artefactId/download?format=excel`.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

(No new rendered page or list-type view in scope. This is a background file generator; the SSCS `.njk` already exists and is unchanged.)

### File structure

```
libs/list-types/sscs-daily-hearing-list/
├── package.json                                    CHANGED  add exceljs 4.4.0
└── src/
    ├── index.ts                                    CHANGED  export the generator
    ├── excel/
    │   ├── excel-generator.ts                      NEW
    │   └── excel-generator.test.ts                 NEW
    └── locales/
        ├── en.ts                                   CHANGED  add excelSheetName
        └── cy.ts                                   CHANGED  add excelSheetName

libs/publication/src/processing/
├── service.ts                                      CHANGED  register 7 SSCS names
└── service.test.ts                                 CHANGED  extend mock + add tests
```

### 2.1 NEW — `libs/list-types/sscs-daily-hearing-list/src/excel/excel-generator.ts`

Modelled on `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts`.

```
export async function generateSscsDailyHearingListExcel(options: {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: SscsDailyHearingList;
}): Promise<{ success: boolean; excelPath?: string; error?: string }>
```

Behaviour, in order:

1. `const t = locale === "cy" ? cyLocale : enLocale;`
2. Guard: if `!Array.isArray(jsonData)` return `{ success: false, error: ... }`. Should be unreachable given schema validation, but the generator must never throw into `processPublication`.
3. `const workbook = new ExcelJS.Workbook(); const worksheet = workbook.addWorksheet(t.excelSheetName);`
4. Header row from `t.tableHeaders` in the **fixed PDF column order** (`pdf-template.njk:30-38`): `venue`, `appealReferenceNumber`, `hearingType`, `appellant`, `courtroom`, `hearingTime`, `tribunal`, `respondent`, `additionalInformation`. Then `headerRow.font = { bold: true }`.
5. `worksheet.views = [{ state: "frozen", ySplit: 1 }]` so headings stay in context when scrolling a long list.
6. One row per hearing, each cell `sanitiseCellValue(hearing.<field> ?? "")`. **The `?? ""` is mandatory** — `additionalInformation` is `required: false` in `SSCS_EXCEL_CONFIG`, and `sanitiseCellValue` does `value[0]`, which throws a `TypeError` on `undefined`.
7. `autoFitColumns(worksheet)`.
8. `const buffer = await workbook.xlsx.writeBuffer(); const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));` — writes `{artefactId}.xlsx` to `CONTAINER.PUBLICATIONS`.
9. Return `{ success: true, excelPath }`.
10. Wrap steps 3–9 in `try/catch`; on error return `{ success: false, error: \`Failed to generate SSCS Excel: ${message}\` }`. Never throw.

`locationId` and `contentDate` are unused by the body but must stay in the signature to match the `ExcelGenerator` type in the registry. Prefix them or destructure only what is used, whichever Biome is happy with.

**Worksheet name — correction to the spec comment on the issue.** ExcelJS does *not* throw on names longer than 31 characters; `worksheet.js:163-166` warns and truncates. It *does* throw on `* ? : \ / [ ]` (`worksheet.js:154`). SSCS friendly names contain none of those characters, so **no `sanitiseWorksheetName()` helper is needed** — that would be speculative work (YAGNI). Instead add a short static locale key (§2.3) and avoid the console warning entirely.

Add to `src/index.ts`:

```typescript
export * from "./excel/excel-generator.js";
```

Add `"exceljs": "4.4.0"` to `dependencies` in `libs/list-types/sscs-daily-hearing-list/package.json` (pinned, matching `magistrates-standard-list/package.json:9`).

### 2.2 CHANGED — `libs/publication/src/processing/service.ts`

Add the import and one shared generator constant near the other Excel wiring, then register each SSCS name:

```typescript
const sscsExcelGenerator: ExcelGenerator = (p) =>
  generateSscsDailyHearingListExcel({ ...p, jsonData: p.jsonData as SscsDailyHearingList });
```

Registry keys to add to `EXCEL_GENERATOR_REGISTRY` — string names only, never numeric `listTypeId`:

| Key |
|---|
| `SSCS_MIDLANDS_DAILY_HEARING_LIST` |
| `SSCS_SOUTH_EAST_DAILY_HEARING_LIST` |
| `SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST` |
| `SSCS_SCOTLAND_DAILY_HEARING_LIST` |
| `SSCS_NORTH_EAST_DAILY_HEARING_LIST` |
| `SSCS_NORTH_WEST_DAILY_HEARING_LIST` |
| `SSCS_LONDON_DAILY_HEARING_LIST` |
| ~~`SSCS_LIVERPOOL_DAILY_HEARING_LIST`~~ — only if Open Question 1 says it is a distinct list type |

`SscsDailyHearingList` is already imported in this file for the PDF generator; only the new function import is needed.

**Trap that will break the build if missed:** `libs/publication/src/processing/service.test.ts:14-19` mocks `@hmcts/sscs-daily-hearing-list` with a factory exposing only `generateSscsDailyHearingListPdf` and `importantInformationByListType`. The new import will be `undefined` under that mock and every test in the file will fail. Add `generateSscsDailyHearingListExcel: vi.fn()` to that factory in the same commit.

### 2.3 CHANGED — locale files

`libs/list-types/sscs-daily-hearing-list/src/locales/en.ts`:

```typescript
excelSheetName: "SSCS Daily Hearing List",
```

`libs/list-types/sscs-daily-hearing-list/src/locales/cy.ts`:

```typescript
excelSheetName: "[WELSH TRANSLATION REQUIRED: 'SSCS Daily Hearing List']",
```

Both must be ≤31 characters *after* translation, or ExcelJS logs a warning and truncates. Tell the translator that constraint. `"Rhestr Gwrandawiadau Dyddiol"` (28) is a safe form if a suggestion is wanted.

The nine column headings need **no new content** — they already exist in both locales and are reused verbatim:

| Field | English | Welsh |
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

### 2.4 CONDITIONAL — Liverpool list type (only if Open Question 1 confirms it is new)

If confirmed, `SSCS_LIVERPOOL_DAILY_HEARING_LIST` must be added in **five** places, all keyed on the name:

| File | Change |
|---|---|
| `libs/list-types/common/src/list-type-data.ts` | New entry: `englishFriendlyName: "Liverpool Social Security and Child Support Tribunal Daily Hearing List"`, `welshFriendlyName`, `shortenedFriendlyName: "SSCS Liverpool Daily Hearing List"`, `provenance: "CFT_IDAM"`, `urlPath: "sscs-daily-hearing-list"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [8]` — matching the existing SSCS entries |
| `libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.ts` | `registerConverterByName("SSCS_LIVERPOOL_DAILY_HEARING_LIST", sscsConverter)` |
| `libs/list-types/sscs-daily-hearing-list/src/locales/en.ts` | `importantInformationByListType` entry (observer email — Open Question 2) |
| `libs/publication/src/processing/service.ts` | `SSCS_FRIENDLY_NAMES` + `PDF_GENERATOR_REGISTRY` + `EXCEL_GENERATOR_REGISTRY` entries |

No hand-written SQL. `list-type-data.ts` is the single source of truth and the deploy seed SQL is generated from it by `apps/postgres/prisma/generate-seed-sql.ts`.

**This is arguably a separate ticket** — adding a list type is materially more than "add an Excel download", and it needs a Welsh friendly name and an observer email address from the business before it can be built.

### 2.5 No changes required

| Area | Why |
|---|---|
| `libs/notifications` | `buildEmailDataWithFiles` already probes for the `.xlsx` unconditionally; `getSubscriptionTemplateId` already switches to the PDF+Excel template |
| GOV.UK Notify templates | Not in this repo. `42f65ada-6de0-45da-822a-9632f6f682fd` is already wired in both helm values files and used today by magistrates/SJP |
| Download endpoint | `/api/flat-file/:artefactId/download?format=excel` already serves `{artefactId}.xlsx` from the correct container with `canAccessPublicationData` enforced |
| Prisma schema / migrations | None. No new tables or columns |
| `apps/web` routes and pages | None in default scope |
| Artefact teardown | `queries.ts` already deletes `{artefactId}.xlsx` on artefact deletion |

### API endpoints

None new. Existing, unchanged:

| Route | Purpose |
|---|---|
| `GET /sscs-daily-hearing-list?artefactId=<uuid>` | Renders the list (all SSCS types share this `urlPath`) |
| `GET /api/flat-file/:artefactId/download?format=pdf` | Serves `{artefactId}.pdf` |
| `GET /api/flat-file/:artefactId/download?format=excel` | Serves `{artefactId}.xlsx` — works for SSCS the moment the blob exists |

### Blob keys

| Key | Container | Written by |
|---|---|---|
| `{artefactId}` | `artefact` | Converted JSON |
| `{artefactId}.pdf` | `publications` | `savePdfToStorage` |
| `{artefactId}.xlsx` | `publications` | `saveExcelToStorage` — **new for SSCS** |

### Database schema changes

None.

## 3. Error Handling & Edge Cases

### Generator input handling

| Condition | Required behaviour |
|---|---|
| `additionalInformation` is `undefined` / `null` | Coerce to `""` **before** `sanitiseCellValue`, which does `value[0]` and throws on non-strings. This is the single most likely defect in the whole ticket — the field is `required: false` in the converter config |
| `jsonData` is `[]` | Produce a workbook with only the bold header row and return `{ success: true }`. The PDF renders an empty list in the same situation; the two formats must agree |
| `jsonData` is not an array | Return `{ success: false, error }`. Do not throw |
| A value begins with `=`, `+`, `-` or `@` | `sanitiseCellValue` prefixes `'`, blocking formula injection. Applies to every cell, including headings-adjacent data |
| `saveExcelToStorage` rejects (blob outage) | Caught; return `{ success: false, error }`. `generatePublicationExcel` logs and returns `{}`; publication and the PDF still succeed |
| Welsh sheet name >31 chars | ExcelJS truncates with a console warning — not a failure, but keep the locale value short |

### Pipeline-level behaviour

- **Excel failure must never block publication.** `generatePublicationExcel` (`service.ts:392-416`) already swallows both a `success: false` result and a thrown error, returning `{}`. `processPublication` then simply omits `excelPath` and the email falls back to the PDF-only template. The generator must uphold its half of that contract by never throwing.
- **Pre-existing coupling worth knowing:** `generatePublicationExcel` receives `listTypeName` from `pdfResult.listTypeName`. If PDF generation crashes and the `catch` branch returns `{}`, the Excel is silently skipped too. Pre-existing, out of scope, but do not be surprised by it in testing.
- **No latency added to the admin request.** Excel generation runs inside the already-detached `processPublication`. Do not move any of it into the request cycle — the existing comment in `non-strategic-upload-summary/index.ts` records that Chromium PDF rendering plus subscriber emails were causing request timeouts. An ExcelJS write of a few hundred flat rows is milliseconds.
- **2MB ceiling.** `MAX_PDF_SIZE_BYTES` is 2MB (`notification-service.ts:120`). If the Excel is ≥2MB, `filesUnder2MB` is false and `getSubscriptionTemplateId` returns the **no-links** template — which also drops the PDF link. A nine-column flat sheet needs ~20,000+ rows to reach 2MB, so this is not a realistic daily list, but the fallback must be covered by a test rather than assumed.

### No new user-facing validation

Excel generation is a background system step with no form input. Upload validation is unchanged: the JSON schema (`src/schemas/sscs-daily-hearing-list.json`) plus the `required` flags and `validateNoHtmlTags` validators in `sscs-config.ts` already run at `/non-strategic-upload`. A file that fails validation never becomes an artefact and never reaches the generator.

### Accessibility of the generated file

An `.xlsx` is non-web content, but three things still apply:

- Bold **and** frozen header row (`worksheet.views = [{ state: "frozen", ySplit: 1 }]`) so the headings stay in context.
- Header row in the publication's language.
- One flat table: no merged cells, no decorative title block above the headings, no blank spacer rows, no meaning conveyed by colour. Merged cells above a table break screen-reader table navigation.

`autoFitColumns` caps width at 60 chars and Excel wraps rather than truncates, so no data is lost.

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| **AC1** — Excel and PDF downloadable for all SSCS lists | PDF generators already registered for all 7. Adding all 7 to `EXCEL_GENERATOR_REGISTRY` makes both formats exist for every SSCS publication; the existing `?format=excel` endpoint serves the Excel | Unit: `generatePublicationExcel` returns `{ hasExcel: true }` for each of the 7 names. Manual: both blobs present in `publications` on STG. **Liverpool is not covered — Open Question 1** |
| **AC2** — Uploaded Excel re-used | Deviation, documented in §1-A: the `.xlsx` is generated from the JSON that was converted from the upload. Same rows, same values, same order, no second data source | Unit: N hearings in → N data rows out with identical values. **Needs PO sign-off — Open Question 4** |
| **AC3** — All PDF fields present in the Excel | Column list is taken from the same `t.tableHeaders` object the PDF template uses, in the same order as `pdf-template.njk:30-38`. There is no second list of columns that could drift | Unit: header row equals the nine `tableHeaders` values in PDF order; each hearing's nine values land in the right columns. Manual: row-for-row comparison of `.xlsx` against the PDF for the same artefact |
| **AC4** — Both download links in the notification email | Automatic. `buildEmailDataWithFiles` already fetches the `.xlsx`; `getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` once both buffers exist; `govnotify-client.ts` sets `pdf_link_to_file` and `excel_link_to_file`. **No code change** | Unit: template selection with both files present / with an oversized Excel. Manual: STG test subscriber receives an email with both links and both resolve |

### Test plan

**Unit — `libs/list-types/sscs-daily-hearing-list/src/excel/excel-generator.test.ts` (new)**

Follow AAA. Mock only `@hmcts/list-types-common` (`saveExcelToStorage`, `sanitiseCellValue`, `autoFitColumns`) in the style of `magistrates-standard-list/src/excel/excel-generator.test.ts`. Where cell values matter, capture the buffer passed to `saveExcelToStorage` and read it back with `workbook.xlsx.load` so assertions are on real cells, not on mock call arguments.

- Bold header row containing the nine English headings in PDF column order
- One data row per hearing with each of the nine values in the correct column
- Welsh headings when `locale` is `"cy"`
- Empty cell — and no throw — when `additionalInformation` is `undefined`
- Header-row-only workbook, still `success: true`, when `jsonData` is `[]`
- Value beginning with `=` is passed through `sanitiseCellValue` (formula-injection guard)
- Header row is frozen (`worksheet.views[0].ySplit === 1`)
- Calls `saveExcelToStorage` with the artefact ID and returns `{ success: true, excelPath: "<artefactId>.xlsx" }`
- Returns `{ success: false, error }` and does **not** throw when `saveExcelToStorage` rejects
- Returns `{ success: false, error }` when `jsonData` is not an array

**Unit — `libs/publication/src/processing/service.test.ts` (extend)**

- Add `generateSscsDailyHearingListExcel: vi.fn()` to the existing `@hmcts/sscs-daily-hearing-list` mock factory (line ~14) — otherwise the whole file fails
- `generatePublicationExcel` returns `{ hasExcel: true }` for each of the 7 SSCS names (table-driven)
- `generatePublicationExcel` returns `{}` and logs a warning when the SSCS generator returns `success: false`
- `processPublication` sets `excelPath` to `{artefactId}.xlsx` and passes it to `sendPublicationNotificationsForArtefact` for an SSCS publication
- `processPublication` still returns the PDF path and still sends notifications when the SSCS Excel generator fails — publication is not blocked
- Existing SJP and magistrates registry behaviour unchanged (regression guard on the registry edit)

**Unit — reference-data parity (extend `libs/list-types/common` tests)**

- Every SSCS name in `EXCEL_GENERATOR_REGISTRY` has a `listTypeData` entry and a registered converter, and vice versa. This is the test that will fail if Liverpool is added to one place and not the others — and the test that proves Open Question 1 has actually been resolved rather than half-applied.

**Unit — `libs/notifications` (extend existing tests, if not already covered)**

- `getSubscriptionTemplateId` returns the PDF+Excel template for a non-SJP list type with both files under 2MB
- Returns the no-links template when the Excel is ≥2MB even though a PDF exists

**E2E — one journey test, tagged `@nightly`**

A single test, with Welsh and accessibility checks inline (not as separate tests): sign in as an internal admin, upload an SSCS Daily Hearing List spreadsheet via `/non-strategic-upload`, confirm on the summary page, assert the success page, open the published list, switch to Welsh and assert the translated headings, run an Axe scan, then hit `/api/flat-file/<artefactId>/download?format=excel` and assert a 200 with the xlsx content type.

**Manual / UAT**

- Confirm on STG that a published SSCS list produces both `{artefactId}.pdf` and `{artefactId}.xlsx` in `publications` (`/blob-explorer`)
- Confirm a test subscriber's email shows both links and both resolve
- Open the `.xlsx` in Excel, LibreOffice and Google Sheets — header row, frozen pane, all nine columns
- Compare the `.xlsx` row-for-row against the PDF for the same artefact as evidence for AC3
- Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is populated in every environment **before** release. It is present in both helm values files today, but if it were ever unset, `getSubscriptionTemplateId` **throws** — and it will start being called for SSCS the moment the Excel blob appears. This is the highest-risk deployment step in the ticket

## 5. Out of Scope

- **Backfill.** SSCS artefacts published before this change keep PDF only until republished. A backfill would need a job that reads each JSON blob and runs the generator — raise separately if wanted.
- **In-page "Download a copy of this list" journey.** See Open Question 3. If it is later wanted, note that `apps/web/src/pages/(list-types)/sjp-download-shared.ts` calls `downloadBlob`/`getBlobProperties` with no container argument, so both default to `CONTAINER.ARTEFACT` while PDFs and Excels are written to `CONTAINER.PUBLICATIONS`. Reusing those helpers for SSCS without passing `CONTAINER.PUBLICATIONS` would always 404. That makes the existing `?format=excel` endpoint the cheaper option.
- **Welsh link text in emails.** `pdf_link_text` and `excel_link_text` are hardcoded English literals in `libs/notifications/src/govnotify/govnotify-client.ts`. A Welsh subscriber to a Welsh SSCS publication gets English link text. Pre-existing and affects every list type — raise as its own ticket, but do not let it surface in UAT and get mistaken for a regression from this ticket.
- **Third-party push.** `sendThirdPartyPublications` receives `pdfPath` and `flatFilePath` only. Nothing in the issue asks to extend that payload.
- **Excel for any non-SSCS list type not already covered.**

## 6. CLARIFICATIONS NEEDED

1. **Liverpool: new list type, or does it publish under North West?** *(blocks only the Liverpool part of AC1)*
   The issue names eight SSCS lists; the codebase defines seven. There is no `SSCS_LIVERPOOL_DAILY_HEARING_LIST` anywhere — no seed entry, no converter registration, no PDF generator entry, no important-information text. The *location* "Liverpool Social Security and Child Support Tribunal" does exist, and the **North West** list's observer email is already `sscsa-liverpool@justice.gov.uk`, which suggests Liverpool publishes under North West. If Liverpool is genuinely a new list type, §2.4 applies and this ticket grows from "add Excel" into "add a list type" — which should probably be split out. If it is not, the issue's list of eight should be corrected to seven. The other seven can be delivered either way.

2. **Observer contact email for Liverpool** *(only if Q1 answers "new list type")*
   Every other SSCS list has a regional `@justice.gov.uk` address in `importantInformationByListType`. Which address should Liverpool use? And what is the correct Welsh friendly name (the existing pattern is `Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant <region>` — "Lerpwl"?).

3. **Does AC1 mean downloadable from the email only, or also from the list page?**
   The problem statement is explicit that the gap is *"the email notification"*, and AC4 covers the email. But "made available as downloadable options" could be read as an in-page journey. Note that Magistrates Public and Magistrates Standard both generate Excel files today and **neither has an in-page download link** — only SJP does. So email-only matches the established pattern for JSON list types. **Recommendation: email-only for this ticket.** If an in-page link is wanted, the cheap option is a single link to the existing `/api/flat-file/:artefactId/download?format=excel` (correct access control and container already), not an SJP-style interstitial page — that route needs the container bug in §5 fixed first and `artefactId` added to the SSCS render context.

4. **Confirm the deviation from AC2** (see §1-A).
   This plan generates the Excel from the validated JSON rather than re-serving the admin's uploaded binary. The data is identical; the reasons for not re-serving the raw file are non-retention, unvalidated extra columns being published to subscribers, English-only headings on Welsh publications, and re-distributing an unscanned binary. **Does the PO accept this reading of "the uploaded excel file will be re-used"?** If they insist on literal raw-file passthrough, the design changes materially: `non-strategic-upload-summary/index.ts` must persist the upload to `publications/{artefactId}.xlsx`, and a column allow-list scrub plus `.xls`/`.csv` handling must be added. Estimate roughly doubles and the security review becomes non-trivial.

5. **Welsh translation for `excelSheetName`.**
   New content, and it must be ≤31 characters or Excel truncates the sheet tab. English is `"SSCS Daily Hearing List"`. Can the translator supply a short Welsh form?

6. **Confirm the hardcoded English email link text is raised separately** (see §5), not absorbed into this ticket.
