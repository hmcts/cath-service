# Technical Plan — Issue #677: Downloadable Excel File, CFT Hearing Lists

## 0. Verification summary (what the spec comment got right and wrong)

The spec comment by `@hmctsclaudecode` was checked against the code. It is broadly sound. Corrections:

| Spec claim | Verified? | Correction |
|---|---|---|
| `EXCEL_GENERATOR_REGISTRY` holds only MAGISTRATES_PUBLIC_LIST, MAGISTRATES_STANDARD_LIST and the 4 SJP types | **Correct** | — |
| `generatePublicationExcel` / `listTypeHasExcel` are generic over the registry and keyed by `listTypeName` string | **Correct** | Registry key is the string name; `generatePublicationPdf` resolves the name from `listTypeId` and passes it through. No change needed to either function. |
| `sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage` exist in `libs/list-types/common/src/excel/excel-utilities.ts` and are exported from `@hmcts/list-types-common` | **Correct** | All three confirmed exported from `libs/list-types/common/src/index.ts:30`. |
| `magistrates-standard-list/src/excel/excel-generator.ts` is the reference shape | **Correct** | Confirmed: render → workbook → bold header row → nested loops → `autoFitColumns` → `writeBuffer` → `saveExcelToStorage`, wrapped in try/catch returning `{ success: false, error }`. |
| Nineteen in-scope list types | **WRONG** | It is **18**. The spec's own Shape B table lists 14 rows, plus 4 Shape A = 18. `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` is excluded, `HIGH_COURT_CIVIL/FAMILY` and `PCOL` have no page and no PDF generator. |
| Nineteen list pages / nineteen templates to edit | **WRONG** | There are **9 page directories and 16 `.njk` templates**. `rcj-standard-daily-cause-list/index.ts` serves 8 URLs via its `ROUTES` export (8 templates in one directory); `administrative-court-daily-cause-list` serves 4 URLs from one template. |
| `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` sits under sub-jurisdiction 12 (Crime) | **WRONG** | In `list-type-data.ts` it is tagged `subJurisdictionIds: [5]`, and sub-jurisdiction 5 is "Court of Appeal (Civil Division)" under jurisdiction 1 (Civil). So a pure sub-jurisdiction rule would pull it *into* scope. Exclude it on the stable grounds that its `provenance` is `CRIME_IDAM` and its `urlPath` is `court-of-appeal-criminal-division-daily-cause-list`. (The `[5]` tagging looks like a data bug; do not fix it under this ticket.) |
| Shape A is one uniform 15-column layout across Civil / Family / Civil and Family / COP | **WRONG** | The four PDFs have **different column sets**. Civil: 7 columns (`time, caseId, caseName, caseType, hearingType, location, duration`) with **no** applicant/respondent. Family and Civil and Family: 9 columns (adds `applicant`, `respondent`). COP: 7 columns with different labels (`startTime, caseRef, caseDetails, caseType, hearingType, timeEstimate, hearingChannel`) and it appends `caseSequenceIndicator` to the **duration** cell, not the case name. The Shape A generator must take a per-list column spec. |
| Shape B is one uniform flat `hearings[]` of `venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation` | **Mostly** | True for `rcj-standard-daily-cause-list` (`StandardHearing`), `administrative-court-daily-cause-list` (`AdministrativeCourtHearing` — identical fields), `london-administrative-court-daily-cause-list` (two arrays: `mainHearings`, `planningCourt`) and `court-of-appeal-civil-daily-cause-list` (`dailyHearings` plus `futureJudgments` which adds `date`). **`companies-winding-up-chd-daily-cause-list` is different**: it uses `ChdKbHearing` from `@hmcts/chd-kb-common` with `type` and `caseName` instead of `hearingType` and `caseDetails`. A fixed field-name contract will not work; the writer must take column accessors. |
| `buildEmailDataWithFiles` already downloads `${artefactId}.xlsx` for every list type, so AC3 needs no new email plumbing | **Correct** | `notification-service.ts:466` downloads unconditionally; `govnotify-client.ts` sets `excel_link_to_file` whenever `excelBuffer` is present. |
| "One oversized file suppresses the other's link" is a real defect | **REAL — confirmed** | `notification-service.ts:474` computes `filesUnder2MB = (hasPdf ? pdfUnder2MB : true) && (hasExcel ? excelUnder2MB : true)`. For a 3MB PDF + 400KB Excel this is `false`, and `getSubscriptionTemplateId({ hasPdf: false, hasExcel: true, filesUnder2MB: false })` hits the first branch at `template-config.ts:21` and returns `GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS` — while `excelBuffer` is still attached at line 487. The usable Excel link is silently dropped. Keep this work item. |
| — | **Additional defect the spec missed** | For non-SJP list types, `{ hasPdf: false, hasExcel: true, filesUnder2MB: true }` falls past the `isSjp` branch and past `hasPdf && hasExcel`, returning `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` — a template that needs `pdf_link_to_file`, which `govnotify-client.ts` only sets when `pdfBuffer` exists. Today this is unreachable for Civil/Family (no Excel exists). The moment we register Excel generators it becomes reachable whenever PDF generation fails but Excel succeeds. Must be handled in the same change. |
| Current SJP download journey checks role only | **Half right** | `sjp-public-list/{list-download-disclaimer,list-download-files,download}.ts` check `req.user?.role === "VERIFIED"` and nothing else. `sjp-press-list` has its own `require-verified-with-provenance.ts` which does resolve the artefact and check `allowedProvenance` — but **not** sensitivity, and **not** via `canAccessPublicationData`. So the gap is real and narrower than stated: any VERIFIED user can fetch any artefact's blob (including a `Classified` one) through `/sjp-public-list/download?artefactId=<any-uuid>&type=pdf`. Worth closing. |
| DB schema changes | **Confirmed: none** | Excel files are blobs keyed `<artefactId>.xlsx`; `ProcessPublicationResult.excelPath` is in-memory only. Nothing in `libs/postgres-prisma/prisma/schema/` needs to change. |

---

## 1. Technical Approach

**AC1 is bigger than "add an Excel generator".** No Civil or Family list page exposes a download link of any kind today. The generated PDF for these list types is reachable only through the subscription email. So AC1 ("Excel **and PDF** downloadable files are made available as downloadable options") requires building the whole web download entry point and journey for these lists, not just the Excel half.

The work splits into four independent tracks:

1. **Excel generation** — two shape-specific generators over one shared writer, registered in `EXCEL_GENERATOR_REGISTRY` by `listTypeName`.
2. **Web download journey** — three generic pages (`/list-download-disclaimer` → `/list-download-files` → `/list-download`), generalised from the existing SJP pages, with a stronger guard chain.
3. **List page entry point** — a "Download this list" secondary button, computed once in `list-type-handler.ts` and included by each list template.
4. **Notifications** — fix the two size-gating defects in `buildEmailDataWithFiles` / `getSubscriptionTemplateId` so AC3 holds when one file is oversized or one is missing.

### Two data shapes, one writer

The in-scope list types collapse into two rendering shapes:

- **Shape A — nested cause list.** `renderCauseListData` (`libs/list-types/daily-cause-list-common/src/rendering/renderer.ts`) walks `courtLists → courtHouse → courtRoom → session → sittings → hearing → case`, decorating the tree in place with `formattedJudiciaries`, `time`, `durationAsHours`, `durationAsMinutes`, `caseHearingChannel`, `applicant`, `applicantRepresentative`, `respondent`, `respondentRepresentative`, `formattedReportingRestriction`. Used by `CIVIL_DAILY_CAUSE_LIST`, `FAMILY_DAILY_CAUSE_LIST`, `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `COP_DAILY_CAUSE_LIST` (COP wraps it to map `reportingRestrictions` onto `reportingRestrictionDetail`).
- **Shape B — flat hearing arrays.** `renderStandardDailyCauseList` and its siblings return `{ header, hearings }` (or two/three named arrays) of flat records. Used by the 7 RCJ standard lists, the 4 regional Administrative Courts, London Administrative Court, Court of Appeal (Civil Division), and Companies Winding Up (ChD).

Because the Shape A column sets differ per list type and the Shape B field names differ for Companies Winding Up, neither shape can be served by a generator with hardcoded columns. The design is therefore:

- **One low-level writer** in `@hmcts/list-types-common` that takes `columns: { header, value(row) }[]` and `sections: { name?, rows }[]`, writes a bold header row, sanitises every cell, autofits, and uploads. Column *accessors* rather than field names kill the ChdKb / CoA / London divergence outright.
- **Shape A generator** in `@hmcts/daily-cause-list-common` that flattens the nested tree to one row per `case` and delegates to the writer. It takes a per-list column spec so each list's Excel mirrors that list's PDF columns exactly (AC2).
- **Shape B generator** = the writer used directly; each list package supplies its own column spec and sections.

Both generators call the **same renderer the PDF generator calls**, so PDF and Excel cannot drift. `renderCauseListData` mutates `jsonData` in place and performs a `getLocationById` lookup; calling it a second time during Excel generation is idempotent and costs one extra location read per publication — acceptable.

### Key decisions

- **Register by `listTypeName` string, never `listTypeId`.** `ListType.id` is autoincrement and differs per environment (CLAUDE.md).
- **Excel generation must never block publication.** `generatePublicationExcel` already catches and logs; each generator additionally returns `{ success: false, error }` rather than throwing.
- **One Excel per artefact, in the publication's own locale** — matching the PDF, which is also generated once from `params.locale`. See Clarifications.
- **Flat top-level download URLs.** `/list-download-disclaimer` etc. rather than the current per-list nesting (`/sjp-public-list/list-download-disclaimer`), so one implementation serves all 18 list types with no `req.path` prefix arithmetic. It also removes a latent bug: the two SJP directories currently contain four `.njk` files under two duplicate template names, and Nunjucks resolves by name across the search path, so which copy wins is search-order dependent.
- **Do not touch SJP in this ticket.** The shared journey is added alongside the SJP pages. Consolidating SJP onto it is a follow-up (it changes existing user-facing behaviour and the SJP disclaimer wording question is unresolved). The two SJP page sets keep working unchanged.
- **Do not register `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST`.** It shares the Shape B renderer, but it is a Crime list; registering it would change the Notify template Crime subscribers receive.

---

## 2. Implementation Details

TEMPLATE SOURCE: n/a — no new list-type view page is required. The download journey templates are generalised from the existing in-repo SJP download pages (apps/web/src/pages/(list-types)/sjp-public-list/list-download-{disclaimer,files}.njk), not migrated from pip-frontend.

### 2.1 In-scope list types (18)

Registered in `EXCEL_GENERATOR_REGISTRY` keyed by the exact `listTypeName` strings below (all verified against `libs/list-types/common/src/list-type-data.ts`).

**Shape A (4)** — page directory / template one-to-one:

| `listTypeName` | Page dir | PDF columns to mirror |
|---|---|---|
| `CIVIL_DAILY_CAUSE_LIST` | `civil-daily-cause-list` | time, caseId, caseName, caseType, hearingType, location, duration |
| `FAMILY_DAILY_CAUSE_LIST` | `family-daily-cause-list` | + applicant, respondent |
| `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` | `civil-and-family-daily-cause-list` | + applicant, respondent |
| `COP_DAILY_CAUSE_LIST` | `cop-daily-cause-list` | startTime, caseRef, caseDetails, caseType, hearingType, timeEstimate, hearingChannel |

**Shape B (14)**:

| `listTypeName` | Page dir | Sections |
|---|---|---|
| `CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST` | `rcj-standard-daily-cause-list` | single |
| `COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST` | `rcj-standard-daily-cause-list` | single |
| `FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST` | `rcj-standard-daily-cause-list` | single |
| `KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST` | `rcj-standard-daily-cause-list` | single |
| `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` | `rcj-standard-daily-cause-list` | single |
| `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` | `rcj-standard-daily-cause-list` | single |
| `SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST` | `rcj-standard-daily-cause-list` | single |
| `BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `administrative-court-daily-cause-list` | single |
| `LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `administrative-court-daily-cause-list` | single |
| `BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `administrative-court-daily-cause-list` | single |
| `MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `administrative-court-daily-cause-list` | single |
| `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `london-administrative-court-daily-cause-list` | Administrative Court, Planning Court |
| `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` | `court-of-appeal-civil-daily-cause-list` | daily hearings, future judgments (has `date`) |
| `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` | `companies-winding-up-chd-daily-cause-list` | single (`ChdKbHearing` field names) |

**Explicitly excluded**: `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` (Crime, `CRIME_IDAM`); `HIGH_COURT_CIVIL_DAILY_CAUSE_LIST`, `HIGH_COURT_FAMILY_DAILY_CAUSE_LIST` (have a `urlPath` in `list-type-data.ts` but no page directory, no PDF generator, no schema); `PCOL_DAILY_CAUSE_LIST` (no `urlPath` at all). There is no PDF whose columns an Excel could mirror, so AC2 is unsatisfiable for these.

### 2.2 New files — Excel generation (libs)

```
libs/list-types/common/src/excel/
  hearing-list-excel.ts            # NEW  shared writer + generateHearingListExcel (Shape B entry point)
  hearing-list-excel.test.ts       # NEW
  excel-utilities.ts               # MODIFY  add toWorksheetName()
  excel-utilities.test.ts          # MODIFY

libs/list-types/daily-cause-list-common/src/excel/
  cause-list-excel.ts              # NEW  generateCauseListExcel — flattens Shape A, delegates to the writer
  cause-list-excel.test.ts         # NEW

libs/list-types/daily-cause-list-common/src/rendering/
  sitting-duration.ts              # NEW  formatSittingDuration(sitting) — extracted from the 4 PDF .njk files
  sitting-duration.test.ts         # NEW
```

Shared writer contract (`libs/list-types/common/src/excel/hearing-list-excel.ts`):

```ts
export interface ExcelColumn<T> { header: string; value: (row: T) => string }
export interface ExcelSection<T> { name?: string; rows: T[] }

export async function generateHearingListExcel<T>(options: {
  artefactId: string;
  sheetName: string;
  columns: ExcelColumn<T>[];
  sections: ExcelSection<T>[];
  sectionHeader?: string;   // when set, a leading "Section" column is emitted
}): Promise<{ success: boolean; excelPath?: string; error?: string }>
```

Behaviour: `new ExcelJS.Workbook()`; `addWorksheet(toWorksheetName(sheetName))`; bold header row; one row per `rows` entry across all sections, every cell through `sanitiseCellValue`; `autoFitColumns`; `workbook.xlsx.writeBuffer()`; `saveExcelToStorage(artefactId, Buffer.from(buffer))`. Never throws — returns `{ success: false, error }`.

Shape A generator (`libs/list-types/daily-cause-list-common/src/excel/cause-list-excel.ts`):

```ts
export interface CauseListExcelRow {
  courtHouseName: string; courtRoomName: string; judge: string;
  time: string; caseNumber: string; caseName: string; caseType: string;
  hearingType: string; hearingChannel: string; duration: string;
  caseSequenceIndicator: string;
  applicant: string; applicantRepresentative: string;
  respondent: string; respondentRepresentative: string;
  reportingRestriction: string;
}

export async function generateCauseListExcel(options: {
  artefactId: string; locationId: string; contentDate: Date; locale: string;
  jsonData: CauseListData;
  sheetName: string;
  columns: ExcelColumn<CauseListExcelRow>[];   // per-list-type spec
}): Promise<{ success: boolean; excelPath?: string; error?: string }>
```

It calls `renderCauseListData(jsonData, { locale, locationId, contentDate })`, flattens to one `CauseListExcelRow` per `case`, and delegates. Court house, court room and judge are always populated on every row because a spreadsheet has no section headings to hang them on — that satisfies AC2 for the context the PDF carries in headings.

Per-list column specs live in each list package next to its locale files:

```
libs/list-types/civil-daily-cause-list/src/excel/excel-generator.ts               # NEW  generateCivilDailyCauseListExcel
libs/list-types/family-daily-cause-list/src/excel/excel-generator.ts             # NEW  generateFamilyDailyCauseListExcel
libs/list-types/civil-and-family-daily-cause-list/src/excel/excel-generator.ts    # NEW  generateCivilAndFamilyDailyCauseListExcel
libs/list-types/cop-daily-cause-list/src/excel/excel-generator.ts                 # NEW  generateCopDailyCauseListExcel
libs/list-types/rcj-standard-daily-cause-list/src/excel/excel-generator.ts        # NEW  generateRcjStandardDailyCauseListExcel(listTypeName)
libs/list-types/administrative-court-daily-cause-list/src/excel/excel-generator.ts# NEW  generateAdministrativeCourtDailyCauseListExcel(listTypeName)
libs/list-types/london-administrative-court-daily-cause-list/src/excel/excel-generator.ts  # NEW  two sections
libs/list-types/court-of-appeal-civil-daily-cause-list/src/excel/excel-generator.ts        # NEW  two sections, date column
libs/list-types/companies-winding-up-chd-daily-cause-list/src/excel/excel-generator.ts    # NEW  ChdKbHearing accessors
```

Each is exported from its package `index.ts` and has a co-located `*.test.ts`.

Column headers come from each package's existing locale objects. Shape A packages gain an `excelColumns` object in `locales/{en,cy}.ts` (the `magistrates-standard-list` convention); Shape B packages reuse their existing `tableHeaders` keys plus one new shared `section` label. No hardcoded English in generators.

### 2.3 Registry additions

`libs/publication/src/processing/service.ts` — add 18 entries to `EXCEL_GENERATOR_REGISTRY`, keyed by the string names above, using shared factory constants exactly as `rcjStandardGenerator` / `adminCourtGenerator` do for PDFs:

```ts
const rcjStandardExcelGenerator: ExcelGenerator = (p) =>
  generateRcjStandardDailyCauseListExcel({ ...p, jsonData: p.jsonData as StandardHearingList });

const adminCourtExcelGenerator: ExcelGenerator = (p) =>
  generateAdministrativeCourtDailyCauseListExcel({ ...p, jsonData: p.jsonData as AdministrativeCourtHearingList });
```

`GenerateExcelParams` already carries `artefactId, listTypeName, contentDate, locale, locationId, jsonData` — everything the generators need. **No change** to `generatePublicationExcel`, `listTypeHasExcel` or `processPublication`; they are already generic over the registry and already set `result.excelPath = \`${artefactId}.xlsx\``.

### 2.4 New files — download journey (apps/web)

```
apps/web/src/pages/(list-types)/list-download-shared.ts              # NEW  requireDownloadAccess, getAvailableFiles, formatFileSize, hasDownloadableFile
apps/web/src/pages/(list-types)/list-download-shared.test.ts         # NEW
apps/web/src/pages/(list-types)/list-download-disclaimer/index.ts    # NEW  GET, POST
apps/web/src/pages/(list-types)/list-download-disclaimer/index.njk   # NEW
apps/web/src/pages/(list-types)/list-download-disclaimer/index.test.ts       # NEW
apps/web/src/pages/(list-types)/list-download-disclaimer/index.njk.test.ts   # NEW
apps/web/src/pages/(list-types)/list-download-files/index.ts         # NEW  GET
apps/web/src/pages/(list-types)/list-download-files/index.njk        # NEW
apps/web/src/pages/(list-types)/list-download-files/index.test.ts    # NEW
apps/web/src/pages/(list-types)/list-download-files/index.njk.test.ts# NEW
apps/web/src/pages/(list-types)/list-download/index.ts               # NEW  GET (streams blob, no template)
apps/web/src/pages/(list-types)/list-download/index.test.ts          # NEW
```

`(list-types)` is a route group, so URLs are top level.

| Method | URL | Purpose |
|---|---|---|
| GET | `/list-download-disclaimer?artefactId=<uuid>` | Terms and conditions |
| POST | `/list-download-disclaimer` | body `artefactId`, `agreed` → redirect to files page |
| GET | `/list-download-files?artefactId=<uuid>` | Lists the formats that exist |
| GET | `/list-download?artefactId=<uuid>&type=pdf\|xlsx` | Streams the blob as an attachment |

`requireDownloadAccess` (in `list-download-shared.ts`, applied as the first middleware on all three pages):

1. Read `artefactId` from `req.query` or `req.body`; reject missing/malformed with `400` + `errors/400`.
2. No `req.user` → set `req.session.returnTo = req.originalUrl`, redirect `/sign-in`.
3. `req.user.role !== "VERIFIED"` → `403` + `errors/403`.
4. `getArtefactById(artefactId)` → `404` + `errors/404` when absent.
5. `canAccessPublicationData(req.user, artefact, await resolveListType(artefact.listTypeId))` → `403` + `errors/403` when false. Set `Cache-Control: private, no-store` on the 403, as `createSimpleListTypeHandler` does.
6. `res.locals.artefact = artefact` so handlers do not refetch.

`getAvailableFiles(artefactId)` — parallel `getBlobProperties` on `<id>.pdf` and `<id>.xlsx`, returns `{ type, url, sizeLabel }[]` with absolute `/list-download?...` URLs (drop the `prefix` argument the SJP version needs). `formatFileSize` carried over unchanged. `hasDownloadableFile(artefactId)` — the same two calls, returns `true` if either resolves.

### 2.5 List page entry point

`apps/web/src/pages/(list-types)/list-type-handler.ts` — in **both** `createListTypeHandler` (after the `checkAccess` branch) and `createSimpleListTypeHandler` (after the `canAccessPublicationData` branch), before `render(...)`:

```ts
res.locals.downloadDisclaimerUrl =
  req.user?.role === "VERIFIED" && (await hasDownloadableFile(artefactId))
    ? `/list-download-disclaimer?artefactId=${artefactId}`
    : null;
```

This covers all 9 in-scope page directories with one change: the 4 Shape A pages use `createListTypeHandler` (all four pass `checkAccess: true`); the 5 Shape B pages use `createSimpleListTypeHandler`, which always checks access. The blob probe runs only for VERIFIED users, so it adds no latency for the public. `res.locals` is merged into the Nunjucks context by Express, so no per-page controller change is needed.

Because `list-type-handler.ts` is shared by *every* list type including out-of-scope ones, gate the button on the list type as well — a `DOWNLOADABLE_LIST_TYPES` set of the 18 names in `list-download-shared.ts`, checked against `artefact.listTypeName`. Without this, Crime and tribunal pages would sprout a download button too, which is outside this ticket's remit.

New shared partial `libs/web-core/src/views/components/list-download-button.njk`, included once by each of the 16 in-scope `.njk` templates immediately below the "Last updated" line:

```njk
{% if downloadDisclaimerUrl %}
  <p class="govuk-body">
    <a href="{{ downloadDisclaimerUrl }}" role="button" draggable="false"
       class="govuk-button govuk-button--secondary" data-module="govuk-button">
      {{ listDownload.downloadListButton }}
    </a>
  </p>
{% endif %}
```

`listDownload` is put on `res.locals` by the same block that sets `downloadDisclaimerUrl`, resolved from the request locale — so no list template needs a locale key added.

### 2.6 Notification fixes

`libs/notifications/src/notification/notification-service.ts` — replace the combined flag in `buildEmailDataWithFiles` with per-file gating:

```ts
const attachPdf = hasPdf && pdfBuffer.length < MAX_PDF_SIZE_BYTES;
const attachExcel = hasExcel && excelBuffer.length < MAX_PDF_SIZE_BYTES;

const templateId = getSubscriptionTemplateId({ isSjp, hasPdf: attachPdf, hasExcel: attachExcel });

return { templateParameters, templateId, pdfBuffer: attachPdf ? pdfBuffer : undefined, excelBuffer: attachExcel ? excelBuffer : undefined };
```

`libs/notifications/src/govnotify/template-config.ts` — drop `filesUnder2MB` from `getSubscriptionTemplateId`'s signature (callers now pass pre-gated booleans; the existing `!hasPdf && !hasExcel` branch already returns the no-links template) **and** fix the non-SJP Excel-only fall-through: when `hasExcel && !hasPdf` and the list is not SJP there is no PDF+Excel or PDF-only template that will render, so return the no-links template rather than `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF`, whose `pdf_link_to_file` personalisation would be unset.

No new Notify templates and no new environment variables are required. `sendListTypePublicationNotifications` is called without `excelPath` but `buildEmailDataWithFiles` downloads `${artefactId}.xlsx` unconditionally, so that path picks the Excel up too.

### 2.7 Content (libs/web-core)

```
libs/web-core/src/locales/list-download/en.ts   # NEW
libs/web-core/src/locales/list-download/cy.ts   # NEW
libs/web-core/src/index.ts                      # MODIFY  export listDownloadEn / listDownloadCy
```

Content is shared across three pages plus 16 list templates, so per CLAUDE.md it belongs in a lib rather than co-located. Wording is carried over verbatim from `libs/list-types/sjp-public-list/src/sjp-public-list/en.ts` (`downloadListButton`, `disclaimer.{pageTitle, disclaimerText, responsibility, checkboxLabel, continueButton, errorTitle, errorCheckbox}`, `downloadFiles.{pageTitle, saveInstructions, downloadPdfLink, downloadExcelLink, toDevice, contactInfo}`) so the journey reads identically to the one verified users already know. Welsh reuses the existing SJP `cy` strings where they exist and carries `[WELSH TRANSLATION REQUIRED: "..."]` markers where they do not. `cy` must mirror `en` key-for-key, recursively.

Excel column labels are **not** shared — they live in each list package's `locales/{en,cy}.ts` because they differ per list type (see 0. above).

### 2.8 Database

**No schema changes.** No new file in `libs/postgres-prisma/prisma/schema/`, no migration. Excel output is a blob keyed `<artefactId>.xlsx` in `CONTAINER.PUBLICATIONS`; `excelPath` exists only on the in-memory `ProcessPublicationResult`. No `list-type-data.ts` or `location-data.ts` change either — every in-scope list type is already seeded.

---

## 3. Error Handling & Edge Cases

### Validation

| Input | Rule | Failure |
|---|---|---|
| `artefactId` (all three pages, query and body) | required; `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | `400` + `errors/400`. Validate the shape **before** any DB or blob call so the ID cannot be used to probe storage. |
| `type` (`/list-download`) | required; member of the `["pdf","xlsx"]` allow-list | `400` + `errors/400`. The allow-list, not string concatenation, is what makes the blob key safe. |
| `agreed` (`POST /list-download-disclaimer`) | required; any truthy value | Re-render the disclaimer at `200` with a `govukErrorSummary` item linked to `#agreed`, preserving `artefactId` in the hidden field. Server-side only. |
| Excel generation input | none | The JSON was already accepted by `validateListTypeJson` at upload and is consumed through the same renderer as the PDF. |

### Response matrix

| Condition | Response |
|---|---|
| Not signed in | `302` → `/sign-in`, `session.returnTo` preserved |
| Signed in but not `VERIFIED` | `403` + `errors/403` |
| `canAccessPublicationData` false | `403` + `errors/403`, `Cache-Control: private, no-store` |
| Artefact not found | `404` + `errors/404` |
| Neither `.pdf` nor `.xlsx` exists | `404` + `errors/404` |
| Requested `type`'s blob missing | `404` + `errors/404`, not an empty `200` |
| Blob storage / unexpected failure | `500` + `errors/500`, logged without artefact personal data |
| Excel generation fails at publication | No user-facing error. Warning logged by `generatePublicationExcel`; page and email offer PDF only |

Note the existing SJP `handleBlobDownload` returns `res.status(400).json({ error: "Invalid request" })`. The new pages render the GOV.UK error pages instead — these are browser navigations, and a raw JSON body is neither accessible nor bilingual.

### Edge cases

- **Excel failure must never block publication.** `generatePublicationExcel` already try/catches and returns `{}`; every generator additionally returns `{ success: false, error }` rather than throwing. Verified by a test asserting a throwing generator leaves `result.pdfPath` set and notifications sent.
- **Empty hearings.** A list with no `courtLists`, an empty `session.sittings`, an empty `hearing.case`, or an empty flat `hearings[]` must produce a header-only workbook, not throw and not upload nothing.
- **Missing optional branches.** Absent `party` array, absent `judiciary`, absent `sittingStart`/`sittingEnd`, absent `reportingRestrictionDetail` — emit an empty cell. `renderCauseListData` already tolerates all of these; the flattener must not assume presence.
- **CSV injection.** Every string written to a cell goes through `sanitiseCellValue`, which prefixes `'` when the value starts with `=`, `+`, `-` or `@`. Applies to case names, party names, additional information and section names alike. Numbers and dates are written as the pre-formatted strings the PDF renders (`"10am"`, `"2 hours 30 mins"`), so no locale-dependent spreadsheet coercion occurs.
- **31-character worksheet name limit.** ExcelJS rejects sheet names over 31 characters and names containing `[ ] : * ? / \`. Several in-scope list titles exceed 31 characters (e.g. "Court of Appeal (Civil Division) Daily Cause List"), and the existing `magistrates-standard-list` generator passes `t.title` straight through with no truncation. Add `toWorksheetName(title)` to `excel-utilities.ts` (strip invalid characters, trim to 31) and use it in the shared writer, so this cannot be forgotten per list type.
- **Only offer formats that exist.** `/list-download-files` derives its links from `getBlobProperties`. If PDF succeeded and Excel failed, only the PDF link is shown and the page does not error. If neither exists, `404`.
- **`hasDownloadableFile` failure.** Wrap in try/catch and treat a blob-storage error as "no file" so a storage blip degrades to a hidden button rather than a `500` on the list page.
- **Duration text is hardcoded English in the PDF templates** (`' hours'`, `' mins'`), including under `?lng=cy`. When extracting `formatSittingDuration`, preserve that behaviour exactly so the Excel matches the PDF; do not silently start emitting Welsh in one and not the other. Fixing the underlying Welsh gap is a separate ticket.
- **COP's `caseSequenceIndicator`** is appended to the *duration* cell, not the case name. The COP column spec must reproduce that, not the Civil and Family behaviour.
- **Out-of-scope list types must not gain a download button.** `list-type-handler.ts` is shared by all ~60 list types; gate on `DOWNLOADABLE_LIST_TYPES`.
- **Notify: one oversized file.** 3MB PDF + 400KB Excel must send the Excel-link template, not the no-links template (regression test).
- **Notify: Excel-only, non-SJP.** PDF generation failed, Excel succeeded → the no-links template, never `NON_SJP_PDF`, whose `pdf_link_to_file` would be unset.

---

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | How it is verified |
|---|---|---|
| **AC1** — "Excel and PDF downloadable files are made available as downloadable options for All Civil and Family Hearing Lists" | Two parts. **(a) Excel exists**: the shared writer plus Shape A / Shape B generators, registered for the 18 `listTypeName` strings in §2.1, produce `<artefactId>.xlsx` at publication time. **(b) A download entry point exists at all** — and this is the larger half. No Civil or Family list page currently exposes any download link; the PDF is reachable only through the subscription email. AC1 therefore requires building the `/list-download-disclaimer` → `/list-download-files` → `/list-download` journey (§2.4) and the "Download this list" button on all 16 in-scope templates (§2.5). PDF becomes downloadable from the web for these lists for the first time. | Unit: `listTypeHasExcel` returns `true` for each of the 18 names and `false` for `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST`; `processPublication` sets `result.excelPath`; fixtures use `listTypeId: 999` to prove name-driven routing. Controller tests: files page lists both formats when both blobs exist, only PDF when Excel is absent, `404` when neither. Template test: `list-download-button.njk` renders the anchor when `downloadDisclaimerUrl` is set and nothing when null. Handler test: `res.locals.downloadDisclaimerUrl` set for a VERIFIED user with a blob, null for media/anonymous/no-blob/out-of-scope list type. E2E: the full journey ends in an `.xlsx` download. |
| **AC2** — "All the data fields / columns available in the current downloadable PDF file should also be available on the Excel downloadable file" | Each list type gets its **own** column spec mirroring its own PDF template's `<th>` set — because the four Shape A PDFs do not share a column set (Civil 7, Family 9, Civil and Family 9, COP 7 with different labels) and Companies Winding Up uses different field names. Both generators call the **same renderer the PDF generator calls**, so derived values (`formattedJudiciaries`, `caseHearingChannel`, `formattedReportingRestriction`, duration via the extracted `formatSittingDuration`) cannot drift. Context the PDF carries in section headings (court house, court room, judge; section name for multi-table lists) becomes data columns, since a spreadsheet has no headings to hang it on. Reporting restrictions, which the PDF renders as a `colspan` row, get their own column. Legal advisors, which the PDF renders inline under the party, get their own columns. | Unit per generator: header row equals the expected label list in order and is bold; one row per case across a fixture with two court houses, two court rooms, two sessions, two sittings and multiple hearings and cases; court house / room / judge repeated on every row of that section; `caseSequenceIndicator` rendered in the PDF's position for that list type (case name for Civil and Family, duration cell for COP); duration formatted `"2 hours 30 mins"` / `"1 hour"` / `"1 min"` / empty; legal advisors and reporting restrictions in their own columns; Welsh headers under the `cy` locale. Plus a **column-parity test per list type** asserting the generator's header list covers every `t.*` key used in a `<th>` of that list's `pdf-template.njk`. |
| **AC3** — "Links to download both file types are displayed in the email notifications" | Already plumbed: `buildEmailDataWithFiles` downloads `${artefactId}.xlsx` for every list type, `getSubscriptionTemplateId` selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both exist, and `govnotify-client.ts` sets `pdf_link_to_file` and `excel_link_to_file`. Once the Excel exists, AC3 holds for the common case with no email changes. Two gating defects must be fixed for it to hold generally: the combined `filesUnder2MB` flag drops the link to a file that *does* fit when the other does not (real, verified, and Civil/Family cause lists for large venues are among the biggest PDFs in the service), and the non-SJP Excel-only path selects a PDF template whose `pdf_link_to_file` will be unset. | Notification tests: both files under 2MB → PDF+Excel template with both personalisations; PDF over 2MB + Excel under → Excel link, **not** the no-links template (regression); Excel over 2MB + PDF under → PDF-only template; both over → no-links; Excel blob absent → existing PDF-only behaviour unchanged; non-SJP Excel-only → no-links template, never `NON_SJP_PDF`. `template-config.test.ts` updated for the dropped `filesUnder2MB` parameter. |

---

## 5. Security & Access Control

Guard chain applied by `requireDownloadAccess` to all three download pages, in this order:

1. **UUID validation** of `artefactId` (query or body) — `400` before any DB or blob call, so the parameter cannot be used to probe storage.
2. **Sign-in redirect** — no `req.user` → `req.session.returnTo = req.originalUrl`, `302` to `/sign-in`, returning the user to the exact URL after authentication.
3. **`getArtefactById(artefactId)`** — `404` when absent.
4. **`canAccessPublicationData(req.user, artefact, await resolveListType(artefact.listTypeId))`** — `403` + `errors/403` when false. This is the check that considers artefact `sensitivity` (Public / Private / Classified) as well as `allowedProvenance`.
5. **`req.user.role === "VERIFIED"`** — `403` otherwise. Downloads remain a verified-user capability even for `Public` artefacts, matching today's SJP rule and the "CaTH verified users" framing in the user story.

`/list-download` additionally enforces the `["pdf","xlsx"]` allow-list, sets `Content-Disposition: attachment`, and sends `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate`.

**Flagged gap in the existing SJP journey — worth closing.** `sjp-public-list/list-download-disclaimer.ts`, `list-download-files.ts` and `download.ts` gate on `req.user?.role === "VERIFIED"` and nothing else: they never resolve the artefact. So any signed-in verified user can retrieve **any** artefact's blob, including a `Classified` one belonging to a different list type, via `/sjp-public-list/download?artefactId=<any-uuid>&type=pdf`. `sjp-press-list` is better — its `require-verified-with-provenance.ts` resolves the artefact and checks `allowedProvenance` — but it still does not consult `sensitivity` and does not go through `canAccessPublicationData`. Step 4 above closes this for the new journey. Migrating the SJP pages onto the shared journey closes it for SJP; that migration is deliberately **not** in this ticket's scope (see Clarifications), so raise it as a follow-up rather than leaving it undocumented.

Other notes: no personal data in logs (error logs carry `artefactId` and an error message only); blob keys are unchanged, so the Notify path and third-party push path are unaffected; the whole journey is HTML forms and links with no JavaScript dependency; Notify-hosted email links download directly and do not route through CaTH, so the disclaimer is not shown for the email path — existing behaviour, unchanged.

---

## CLARIFICATIONS NEEDED

1. **Does "CFT" scope include tribunals, or only the Civil and Family jurisdictions?** The title says "CFT hearing lists"; the acceptance criteria say "All Civil and Family Hearing Lists". This plan builds the narrower reading: 18 list types under jurisdictions Civil (1) and Family (2). Tribunals would add roughly 40 more. Confirm tribunals are a follow-up. (Most tribunal lists already use the flat Shape B renderer, so the follow-up is cheap.)
2. **Do downloads stay verified-user-only even for `Public` artefacts?** This plan says yes, matching the current SJP rule. Confirm a media or anonymous user viewing a `Public` Civil list should still see no download link.
3. **Is one Excel per artefact, generated at publication in the publication's own locale, acceptable?** This matches the PDF. A Welsh-speaking user downloading an English-language publication would get English column headers. If not acceptable, the generator must produce two blobs per artefact and the download page and Notify personalisation must choose between them.
4. **Is audit logging of downloads required?** There is no existing download-audit mechanism (the service audits notifications only). If verified-user downloads of personal data need an audit-log entry, that is additional work in `libs/audit` and should be in scope explicitly.
5. **Must SJP-specific disclaimer wording be preserved?** This plan leaves the SJP pages untouched and reuses their (generic, list-type-agnostic) wording for the new shared journey. If SJP and CFT can share one wording, the SJP pages should be consolidated onto the shared journey in a follow-up — which also closes the security gap in §5. If they must differ, the shared content object needs a per-list override.
6. **What is the acceptable blast radius of the Notify size-gating fix?** Fixing the combined `filesUnder2MB` flag changes behaviour for **every** list type, not just Civil and Family: any artefact where one file exceeds 2MB and the other does not starts receiving a link instead of a no-links email. That is the correct behaviour and AC3 needs it, but it is a live change outside this ticket's stated scope. Confirm it ships here rather than as a separate change.
7. **`COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` is tagged `subJurisdictionIds: [5]` — "Court of Appeal (Civil Division)", jurisdiction Civil — despite `provenance: "CRIME_IDAM"`.** This plan excludes it on provenance grounds. Confirm the `[5]` tagging is a data bug to be fixed separately, and confirm Crime subscribers should not start receiving the PDF+Excel Notify template under this ticket.
