# Plan: #944 Create additional file format (Excel) for the remaining Tribunal hearing lists

TEMPLATE SOURCE: n/a

## 1. Technical Approach

### What already exists

Publication processing generates a PDF for every JSON list type and, for six list type
names only (`MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST`, and the four SJP
names), an Excel workbook. Verified plumbing:

| Concern | Verified location |
|---|---|
| Excel generator registry, keyed by `listTypeName` | `libs/publication/src/processing/service.ts:361` (`EXCEL_GENERATOR_REGISTRY`) |
| Registry lookup + non-fatal error handling | `libs/publication/src/processing/service.ts:390` (`generatePublicationExcel`) |
| Called from `processPublication` | `libs/publication/src/processing/service.ts:635` (function at `:586`) |
| `listTypeName` resolved from DB | `libs/publication/src/processing/service.ts:420-421` inside `generatePublicationPdf`, returned as `GeneratePdfResult.listTypeName` and fed to the Excel call at `:637` |
| Workbook → blob, cell sanitisation, column widths | `libs/list-types/common/src/excel/excel-utilities.ts` — `sanitiseCellValue(value: string): string` (`:11`), `autoFitColumns(worksheet: ExcelJS.Worksheet): void` (`:22`), `saveExcelToStorage(artefactId: string, buffer: Buffer): Promise<{ excelPath: string }>` (`:38`, writes `<artefactId>.xlsx` to `CONTAINER.PUBLICATIONS`); all three re-exported at `libs/list-types/common/src/index.ts:30` |
| Email picks up whatever exists | `libs/notifications/src/notification/notification-service.ts:457` (`buildEmailDataWithFiles`), which **unconditionally** calls `downloadBlob(\`${artefactId}.xlsx\`, CONTAINER.PUBLICATIONS)` at `:466` |
| Notify template selection | `libs/notifications/src/govnotify/template-config.ts:15` (`getSubscriptionTemplateId`) — returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when `hasPdf && hasExcel && filesUnder2MB` (`:37-42`) |
| Size limit | local constant `MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024` at `libs/notifications/src/notification/notification-service.ts:116`; strict `<` comparison at `:469` and `:472`, combined at `:474` |
| Document links | `libs/notifications/src/govnotify/govnotify-client.ts:79` (`pdf_link_text = "Download PDF version"`) and `:89` (`excel_link_text = "Download Excel version"`), both via `prepareUpload(..., { retentionPeriod: "1 week", confirmEmailBeforeDownload: false })` |
| Notify template ID configured | `apps/web/helm/values.yaml:25`, `apps/api/helm/values.yaml:12` |

**Confirmed:** the only reason these eight lists have no Excel download is the missing
registry entry. Once `<artefactId>.xlsx` exists in the `PUBLICATIONS` container the
PDF+Excel Notify template is selected automatically — no change to the notification,
template-selection or blob layer.

### Scope: eight list type names across six packages

All eight names exist in `libs/list-types/common/src/list-type-data.ts` and all eight are
registered in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:147-336`):

| # | Issue wording | `listTypeName` | `list-type-data.ts` | `PDF_GENERATOR_REGISTRY` | Package (`libs/list-types/…`) |
|---|---|---|---|---|---|
| 1 | Primary Health Tribunal Weekly Hearing List | `PHT_WEEKLY_HEARING_LIST` | `:699` | `:317` | `pht-weekly-hearing-list` |
| 2 | Care Standards Tribunal Weekly Hearing List | `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `:128` | `:154` | `care-standards-tribunal-weekly-hearing-list` |
| 3 | Special Immigration Appeals Commission Weekly | `SIAC_WEEKLY_HEARING_LIST` | `:336` | `:209` | `siac-poac-paac-weekly-hearing-list` |
| 4 | Proscribed Organisations Appeal Commission Weekly | `POAC_WEEKLY_HEARING_LIST` | `:347` | `:216` | `siac-poac-paac-weekly-hearing-list` |
| 5 | Pathogens Access Appeal Commission Weekly | `PAAC_WEEKLY_HEARING_LIST` | `:358` | `:223` | `siac-poac-paac-weekly-hearing-list` |
| 6 | General Regulatory Chamber Weekly Hearing List | `GRC_WEEKLY_HEARING_LIST` | `:490` | `:274` | `grc-weekly-hearing-list` |
| 7 | Criminal Injuries Compensation Weekly Hearing List | `CIC_WEEKLY_HEARING_LIST` | `:468` | `:164` | `cic-weekly-hearing-list` |
| 8 | Asylum Support Tribunal Daily Hearing List | `AST_DAILY_HEARING_LIST` | `:479` | `:170` | `ast-daily-hearing-list` |

Every routing decision uses the stable string `listTypeName`. No numeric `listTypeId`
appears anywhere in this change.

### Architecture decision: one shared builder, six thin wrappers

All eight lists are flat `Array<Record<string, string>>` rendered by the PDF as a single
table, and each package already has a renderer that produces exactly the row objects the
PDF table consumes plus a `tableHeaders` map in both locales. Eight hand-rolled generators
would be eight copies of one loop.

So: add **one** config-driven builder to `@hmcts/list-types-common` and **one thin wrapper
per package** supplying column order, localised strings and the rendered rows. The two
`magistrates-*` generators are left untouched.

**Divergence from the existing reference implementations, deliberately accepted:**
`libs/list-types/magistrates-public-list/src/excel/excel-generator.ts:32-46` and
`libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts:32-62` put the
column header on **row 1** with no metadata rows, name the sheet from a `t.title` key and
read columns from a `t.excelColumns` key. The tribunal packages have neither `title` nor
`excelColumns` — they have `pageTitle` and `tableHeaders`. This plan reproduces the PDF's
header metadata (title, list-for date, last updated, data source) above the table, because
AC 2 asks for the fields available in the PDF and those four appear in the PDF header/footer
of every one of the eight templates. The magistrates generators are not retro-fitted.

### Key technical considerations

1. **Consume the renderer output, never raw JSON.** The renderers format dates and rename
   fields. `renderCicWeeklyHearingListData` renames the upload key `"venue/platform"`
   (`libs/list-types/cic-weekly-hearing-list/src/models/types.ts:6`,
   `.../conversion/cic-config.ts:39`) to `venuePlatform`
   (`.../rendering/renderer.ts:48`). Reading raw JSON would silently emit an empty column.
2. **Dates are written as `dd/MM/yyyy` strings, not Excel date serials.** The renderers
   already produce `dd/MM/yyyy` via `formatDdMmYyyyDate`; writing text keeps the Excel
   byte-identical to the PDF and stops a US-locale reader re-interpreting it as `MM/dd/yyyy`.
   AST has no `date` column (its date is the list-level "List for" value).
3. **`provenance` must be plumbed through.** `GenerateExcelParams`
   (`libs/publication/src/processing/service.ts:338-346`) has **no** `provenance` field, so
   the "Data source" row cannot be populated today. `processPublication` already
   destructures `provenance` (`:593`) and every caller supplies it
   (`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:172`,
   `apps/web/src/pages/(admin)/manual-upload-summary/index.ts`,
   `libs/api/src/blob-ingestion/repository/service.ts:73` and `:161`), so adding the
   optional field and forwarding it at `:635` is sufficient.
4. **Do not import `@hmcts/publication` into a list-type package.**
   `libs/publication/package.json` depends on all six packages (lines 23, 26, 27, 43, 55,
   59), so importing back into them is a cycle. Five of the six PDF generators already do
   this (e.g. `libs/list-types/pht-weekly-hearing-list/src/pdf/pdf-generator.ts:4`, whose
   `package.json` does not even declare the dependency) — that pre-existing debt is not
   extended. The Excel wrappers use each package's own `provenanceLabels`
   (re-exported from `@hmcts/list-types-common` as `provenanceLabelsEn`/`provenanceLabelsCy`,
   `libs/list-types/common/src/index.ts:32-33`).
5. **Worksheet names are validated by ExcelJS, and one failure mode throws.**
   `node_modules/exceljs/lib/doc/worksheet.js:155-157` **throws** on any of `* ? : / \ [ ]`;
   `:159-161` throws on a leading/trailing `'`; `:163-166` truncates names over 31
   characters with a `console.warn`. A `[WELSH TRANSLATION REQUIRED: '…']` placeholder in a
   sheet-name key would therefore either abort generation (brackets) or produce a garbage
   tab name. Sheet names get their own short locale key with real values plus a defensive
   sanitiser, and a unit test asserting the constraints.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

### 2.1 NEW — shared tabular workbook builder

**File:** `libs/list-types/common/src/excel/tabular-list-excel.ts`
**Test:** `libs/list-types/common/src/excel/tabular-list-excel.test.ts`
**Export from:** `libs/list-types/common/src/index.ts` (next to the existing
`excel-utilities.js` export at `:30`)

Exports:

- `buildTabularListExcel(options): Promise<TabularListExcelResult>` where
  `options = { artefactId, sheetName, metadataRows: string[], columnHeaders: string[], rows: string[][] }`
  and `TabularListExcelResult = { success: boolean; excelPath?: string; error?: string }` —
  structurally identical to the `ExcelGenerator` contract at
  `libs/publication/src/processing/service.ts:353-359`, so no adapter is needed.
- `buildListMetadataRows(params): string[]` where
  `params = { listTitle, listForLabel, listForValue, lastUpdatedLabel, lastUpdatedDate, atLabel, lastUpdatedTime, dataSourceLabel?, dataSourceValue? }`.
  Returns, in order: the title; `` `${listForLabel} ${listForValue}` ``;
  `` `${lastUpdatedLabel} ${lastUpdatedDate} ${atLabel} ${lastUpdatedTime}` ``; and
  `` `${dataSourceLabel}: ${dataSourceValue}` `` **only when `dataSourceValue` is
  non-empty**, mirroring `{% if dataSource %}` in every PDF template (e.g.
  `libs/list-types/pht-weekly-hearing-list/src/pdf/pdf-template.njk:55`).

Behaviour:

1. `new ExcelJS.Workbook()`, `addWorksheet(toSafeSheetName(sheetName))`.
2. One row per `metadataRows` entry; row 1 bold.
3. One blank spacer row.
4. `columnHeaders` row with `font = { bold: true }`.
5. One row per `rows` entry, every cell through `sanitiseCellValue`.
6. `autoFitColumns(worksheet)`.
7. `saveExcelToStorage(artefactId, Buffer.from(await workbook.xlsx.writeBuffer()))`.
8. Whole body in `try/catch`; on failure return
   `{ success: false, error: \`Failed to generate Excel: ${message}\` }` — never throw.

`toSafeSheetName` is module-private: strips `* ? : / \ [ ]`, trims leading/trailing
apostrophes, collapses the result to a trimmed string, falls back to `"List"` if empty, and
truncates to 31 characters. It exists to make the ExcelJS throw impossible, not as the
primary control — the locale values are the primary control.

`exceljs` is already a dependency of `@hmcts/list-types-common`
(`libs/list-types/common/package.json`, `"exceljs": "4.4.0"`). **No new dependency.**

### 2.2 NEW — one wrapper per package

**Files:** `libs/list-types/<package>/src/excel/excel-generator.ts` (6 new)
**Tests:** `libs/list-types/<package>/src/excel/excel-generator.test.ts` (6 new)
**Export:** add `export * from "./excel/excel-generator.js";` to each package's
`src/index.ts` (each already does the same for `./pdf/pdf-generator.js` and
`./rendering/renderer.js`).

Shape (PHT; the other five differ only in renderer, columns, title key and the
weekly/daily metadata row):

```typescript
import { buildListMetadataRows, buildTabularListExcel, type TabularListExcelResult } from "@hmcts/list-types-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { PhtHearingList } from "../models/types.js";
import { renderPhtData } from "../rendering/renderer.js";

const COLUMNS = ["date", "caseName", "hearingLength", "hearingType", "venue", "additionalInformation"] as const satisfies readonly (keyof typeof enLocale.tableHeaders)[];

interface ExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: PhtHearingList;
  provenance?: string;
}

export function generatePhtWeeklyHearingListExcel(options: ExcelGenerationOptions): Promise<TabularListExcelResult> { /* … */ }
```

`COLUMNS` typed against `keyof typeof en.tableHeaders` makes a bad column key a compile
error. Row values are read as `String(hearing[key] ?? "")` so a missing optional field
becomes an empty cell, never the string `"undefined"`.

`lastReceivedDate` is set to generation time (`new Date().toISOString()`), exactly as
`generateListPdf` does at `libs/list-types/common/src/pdf/pdf-utilities.ts:148`, so the
Excel and PDF "Last updated" values agree.

### 2.3 Column order per list type — verified against the PDF templates and renderers

Column keys index **both** `t.tableHeaders` and the renderer's row objects, so PDF/Excel
parity is structural rather than asserted by hand.

| `listTypeName` | Renderer (verified export) | Renderer `RenderOptions` | Header fields | Columns in order — identical to PDF `<th>` order |
|---|---|---|---|---|
| `PHT_WEEKLY_HEARING_LIST` | `renderPhtData` (`pht-…/src/rendering/renderer.ts:25`) | `locale`, `courtName?`, `contentDate`, `lastReceivedDate`, `listTitle` | `listTitle`, `weekCommencingDate`, `lastUpdatedDate`, `lastUpdatedTime` | `date`, `caseName`, `hearingLength`, `hearingType`, `venue`, `additionalInformation` (`pdf-template.njk:29-34`) |
| `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `renderCareStandardsTribunalData` (`…/renderer.ts:22`) | `locale`, `courtName` (**required**), `contentDate`, `lastReceivedDate`, `listTitle` | same as PHT | `date`, `caseName`, `hearingLength`, `hearingType`, `venue`, `additionalInformation` (`pdf-template.njk:29-34`) |
| `SIAC_WEEKLY_HEARING_LIST`, `POAC_WEEKLY_HEARING_LIST`, `PAAC_WEEKLY_HEARING_LIST` | `renderSiacPoacPaacData` (`…/renderer.ts:22`) | `locale`, `courtName` (**required**), `contentDate`, `lastReceivedDate`, `listTitle` | same as PHT | `date`, `time`, `appellant`, `caseReferenceNumber`, `hearingType`, `courtroom`, `additionalInformation` (`pdf-template.njk:30-36`) |
| `GRC_WEEKLY_HEARING_LIST` | `renderGrcWeeklyHearingListData` (`…/renderer.ts:22`) | `locale`, `courtName` (**required**), `contentDate`, `lastReceivedDate`, `listTitle` | same as PHT | `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `modeOfHearing`, `venue`, `additionalInformation` (`pdf-template.njk:31-39`) |
| `CIC_WEEKLY_HEARING_LIST` | `renderCicWeeklyHearingListData` (`…/renderer.ts:32`) | `locale`, `contentDate`, `lastReceivedDate`, `listTitle` | same as PHT | `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `venuePlatform`, `judges`, `members`, `additionalInformation` (`pdf-template.njk:33-40`) |
| `AST_DAILY_HEARING_LIST` | `renderAstDailyHearingListData` (`…/renderer.ts:21`) | `locale`, `contentDate`, `lastReceivedDate`, `listTitle` | `listTitle`, **`listForDate`**, `lastUpdatedDate`, `lastUpdatedTime` | `appellant`, `appealReferenceNumber`, `caseType`, `hearingType`, `hearingTime`, `additionalInformation` (`pdf-template.njk:34-39`) |

`courtName` is required by the `RenderOptions` type of CST, GRC and SIAC but is **not read**
by any of those three renderers. Pass the same literal the PDF generator passes so the call
is provably equivalent: `"Care Standards Tribunal"`
(`care-standards-…/src/pdf/pdf-generator.ts:28`), `"General Regulatory Chamber"`
(`grc-…/src/pdf/pdf-generator.ts:29`), and for SIAC/POAC/PAAC the locale keys
`t.siacCourtName` / `t.poacCourtName` / `t.paacCourtName`
(`siac-…/src/locales/en.ts:29-31`).

### 2.4 Verified locale keys used per package

Every key below was read from the files; nothing is assumed.

| Key | PHT | CST | GRC | CIC | AST | SIAC pkg |
|---|---|---|---|---|---|---|
| `pageTitle` | `en:4`/`cy:4` | `en:4`/`cy:4` | `en:4`/`cy:4` **cy is a placeholder** | `en:4`/`cy:4` | `en:4`/`cy:4` | **absent** — uses `siacPageTitle`/`poacPageTitle`/`paacPageTitle` (`en:32-34`, `cy:32-34`) |
| `listForWeekCommencing` | `:5` | `:5` | `:5` | `:5` | **absent** | `en:4`/`cy:4` |
| `listForDate` | absent | absent | absent | absent | `:5` | absent |
| `lastUpdated` | `:6` | `:6` | `:6` | `:6` | `:6` | `:5` |
| `at` | `:7` | `:7` | `:7` | `:7` | `:7` | `:6` |
| `dataSource` | `:25` | `:25` | `:33` | `:35` | `:30` | `:22` |
| `tableHeaders` | `:17-24` | `:17-24` | `:22-32` | `:25-34` | `:22-29` | `:13-21` |
| `provenanceLabels` | `:31` | `:31` | `:39` | `:37` | `:32` | `:28` |

Notes established by reading the files, not assumed:

- **`GRC` `cy.pageTitle` is `"[WELSH TRANSLATION REQUIRED: 'General Regulatory Chamber Weekly Hearing List']"`**
  (`libs/list-types/grc-weekly-hearing-list/src/locales/cy.ts:4`). It is already rendered on
  the Welsh GRC web page (`apps/web/src/pages/(list-types)/list-type-handler.ts:188` passes
  `t.pageTitle` as `listTitle`). Writing it into a workbook title cell is unacceptable. This
  plan replaces it with the content-approved Welsh already shipped in reference data:
  `"Rhestr Wrandawiadau Wythnosol y Siambr Reoleiddio Gyffredinol"`
  (`libs/list-types/common/src/list-type-data.ts:492`, `welshFriendlyName`). One-line change,
  no new translation invented. Flagged in Clarifications.
- **The entire `siac-poac-paac` `cy.ts` holds English strings** (all 39 lines, verified) —
  pre-existing debt. A Welsh SIAC/POAC/PAAC workbook will show English headings, identical
  to the current Welsh PDF and web page. Do not regress it; do not fix it here.
- The PDF's list title is **English in both locales for all eight lists** (see Corrections
  §5.5). The Excel deliberately uses the locale title, matching the web page.

### 2.5 NEW — one locale key per package for the worksheet name

Worksheet names must be ≤ 31 characters and must not contain `* ? : / \ [ ]` or a
leading/trailing apostrophe. `t.pageTitle` cannot be used: every one is 42-62 characters.

English (all ≤ 31, no illegal characters):

| File | Key and value |
|---|---|
| `pht-…/src/locales/en.ts` | `excelSheetName: "Primary Health Tribunal"` (23) |
| `care-standards-…/src/locales/en.ts` | `excelSheetName: "Care Standards Tribunal"` (23) |
| `grc-…/src/locales/en.ts` | `excelSheetName: "General Regulatory Chamber"` (26) |
| `cic-…/src/locales/en.ts` | `excelSheetName: "Criminal Injuries Compensation"` (30) |
| `ast-…/src/locales/en.ts` | `excelSheetName: "Asylum Support Tribunal"` (23) |
| `siac-…/src/locales/en.ts` | `siacExcelSheetName: "SIAC Weekly Hearing List"` (24), `poacExcelSheetName: "POAC Weekly Hearing List"` (24), `paacExcelSheetName: "PAAC Weekly Hearing List"` (24) |

Welsh — taken from the `welshFriendlyName` values already in
`libs/list-types/common/src/list-type-data.ts` (content-approved, shipped) and shortened to
the tribunal name so they fit 31 characters:

| File | Key and value | Source |
|---|---|---|
| `pht-…/src/locales/cy.ts` | `excelSheetName: "Tribiwnlys Iechyd Sylfaenol"` (27) | `list-type-data.ts:701` |
| `care-standards-…/src/locales/cy.ts` | `excelSheetName: "Tribiwnlys Safonau Gofal"` (24) | `list-type-data.ts:130` |
| `grc-…/src/locales/cy.ts` | `excelSheetName: "Siambr Reoleiddio Gyffredinol"` (29) | `list-type-data.ts:492` |
| `cic-…/src/locales/cy.ts` | `excelSheetName: "Iawndal am Anafiadau Troseddol"` (30) | `list-type-data.ts:470` |
| `ast-…/src/locales/cy.ts` | `excelSheetName: "Tribiwnlys Cymorth Lloches"` (26) | `list-type-data.ts:481` |
| `siac-…/src/locales/cy.ts` | `siacExcelSheetName: "[WELSH TRANSLATION REQUIRED: 'SIAC Weekly Hearing List']"`, and likewise for POAC and PAAC | no Welsh exists anywhere |

The three SIAC placeholders exceed 31 characters and contain `[` `]`, so the sanitiser will
rewrite them. That is acceptable **only** because the whole SIAC Welsh locale is already
English (§2.4) and the sanitiser guarantees generation cannot fail. The unit test asserts
that the *non-placeholder* keys satisfy the constraints, and a Clarification asks content
design for three short Welsh names so the placeholders can be replaced.

**Considered and rejected:** `shortenedFriendlyName` in `list-type-data.ts` (e.g.
`"GRC Weekly Hearing List"`, `:493`) is English-only and therefore fails the Welsh
requirement. It also contains a typo for PAAC (`"PACC Weekly Hearing List"`,
`list-type-data.ts:361`) — do not copy it.

### 2.6 CHANGED — registry and parameter plumbing

**File:** `libs/publication/src/processing/service.ts`

1. Add `provenance?: string` to `GenerateExcelParams` (`:338-346`).
2. Add `provenance` to the `generatePublicationExcel({ … })` call at `:635-643`; the value
   is already destructured at `:593`.
3. Add eight entries to `EXCEL_GENERATOR_REGISTRY` (`:361`), mirroring the existing
   `jsonData` cast style used by the `MAGISTRATES_*` entries at `:362-363`:

```typescript
PHT_WEEKLY_HEARING_LIST: (p) => generatePhtWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as PhtHearingList }),
CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: (p) => generateCareStandardsTribunalWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as CareStandardsTribunalHearingList }),
GRC_WEEKLY_HEARING_LIST: (p) => generateGrcWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as GrcWeeklyHearingList }),
CIC_WEEKLY_HEARING_LIST: (p) => generateCicWeeklyHearingListExcel({ ...p, jsonData: p.jsonData as CicWeeklyHearingList }),
AST_DAILY_HEARING_LIST: (p) => generateAstDailyHearingListExcel({ ...p, jsonData: p.jsonData as AstDailyHearingList }),
SIAC_WEEKLY_HEARING_LIST: siacPoacPaacExcelGenerator,
POAC_WEEKLY_HEARING_LIST: siacPoacPaacExcelGenerator,
PAAC_WEEKLY_HEARING_LIST: siacPoacPaacExcelGenerator
```

`siacPoacPaacExcelGenerator` is a module-level `const ExcelGenerator` forwarding
`p.listTypeName`, mirroring `rcjStandardGenerator` / `adminCourtGenerator` at `:90-94`.
All eight `jsonData` types and the six `generate…Pdf` functions are already imported at the
top of `service.ts` (lines 2, 3, 4, 20, 31, 35), so only the `generate…Excel` names are
added to those existing import statements. `libs/publication/package.json` already depends
on all six packages. **No new dependency, no new import of a new package.**

### 2.7 SIAC / POAC / PAAC — three list types, one package

The package has no single `pageTitle`. Mirror the web controller's approach
(`apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.ts:15-33`) with a
string-keyed config inside the lib so no display string is hardcoded in the registry:

```typescript
const LIST_TYPE_CONFIG: Record<string, { title: (t) => string; sheetName: (t) => string; courtName: (t) => string }> = {
  SIAC_WEEKLY_HEARING_LIST: { … },   // t.siacPageTitle / t.siacExcelSheetName / t.siacCourtName
  POAC_WEEKLY_HEARING_LIST: { … },
  PAAC_WEEKLY_HEARING_LIST: { … }
};
```

`generateSiacPoacPaacWeeklyHearingListExcel(options & { listTypeName: string })` returns
`{ success: false, error: \`Unsupported list type: ${listTypeName}\` }` for an unknown name
rather than throwing. No `id`→`name` mapping, consistent with CLAUDE.md.

### 2.8 Data source label

The metadata row uses `t.provenanceLabels[provenance] ?? provenance`, matching
`resolveDataSource` at `apps/web/src/pages/(list-types)/list-type-handler.ts:164-166`
(minus its `@hmcts/publication` fallback, which would create the cycle described in §1.4).

Note the two label maps in the codebase disagree:
`PROVENANCE_LABELS` (`libs/publication/src/provenance.ts:9-15`) maps `SNL → "SNL"` and
`CP_CATH → "CP-CaTH"`, while `provenanceLabelsEn`
(`libs/list-types/common/src/locales/en.ts`) maps `SNL → "ListAssist"` and
`CP_CATH → "Libra"`. Seven of the eight PDFs use the former; the GRC PDF already uses the
latter (`grc-…/src/pdf/pdf-generator.ts:10`). For these eight non-strategic lists the
publisher is `MANUAL_UPLOAD` in practice, where both maps agree (`"Manual Upload"` /
`"Lanlwytho â Llaw"`), so the divergence is theoretical — but it is real and is recorded
here rather than glossed over.

### 2.9 API endpoints / DB schema

None. No new or changed route, no Prisma schema change, no new environment variable, no new
package. Blob keys are unchanged: `<artefactId>.pdf` and `<artefactId>.xlsx` in
`CONTAINER.PUBLICATIONS`.

### 2.10 Out of scope

No in-service "download this list" page. Only SJP has one
(`apps/web/src/pages/(list-types)/sjp-public-list/list-download-files.ts`,
`.../sjp-press-list/list-download-files.ts`, plus `sjp-download-shared.ts`); the equivalent
Excel work for `MAGISTRATES_PUBLIC_LIST` / `MAGISTRATES_STANDARD_LIST` shipped email-only,
and AC 3 scopes the links to the email notification. See Clarification 1.

## 3. Error Handling & Edge Cases

| Case | Handling | Where |
|---|---|---|
| Excel generation throws | Caught by the builder's `try/catch`, returned as `{ success: false, error }`; `generatePublicationExcel` logs `[Publication] Excel generation failed:` (`service.ts:406`) and returns `{}`, so `excelPath` stays undefined | new builder + existing `service.ts:393-413` |
| Generator itself rejects | Existing outer `catch` logs `[Publication] Excel generation error:` (`service.ts:411`) | existing |
| PDF generation failed but JSON is valid | `generatePublicationPdf` still returns `listTypeName` (`service.ts:424`, `:439`), so Excel is still generated and the email uses the Excel-plus-no-PDF path → `getSubscriptionTemplateId` falls through to `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` with `hasPdf: false`, `hasExcel: true`. **This is an existing gap, not introduced here**: the non-SJP branch has no Excel-only template (`template-config.ts:44-47`), so the email would reference an Excel link the template may not render. Noted in Clarification 5; not changed |
| List type has no PDF generator | `generatePublicationPdf` returns `{ listTypeName }` and Excel still runs — all eight have PDF generators, so not reachable for this ticket |
| Empty hearing array | Metadata rows + header row, zero data rows; still a valid workbook. Mirrors the PDF, which renders its header and a "no hearings" message (`pht-…/pdf-template.njk:50-52`) |
| `undefined` / `null` field value | `String(value ?? "")` in the wrapper → empty cell, never `"undefined"` |
| Cell value starting `= + - @` | `sanitiseCellValue` prefixes `'` (`excel-utilities.ts:11-16`) |
| Sheet name with `* ? : / \ [ ]` or leading/trailing `'` | Stripped by `toSafeSheetName` before `addWorksheet`, which would otherwise **throw** (`exceljs/lib/doc/worksheet.js:155-161`) |
| Sheet name > 31 characters | Truncated by `toSafeSheetName`, avoiding ExcelJS's `console.warn` at `worksheet.js:163-166`. Unit test asserts every non-placeholder locale value is already within bounds |
| Sheet name empty after sanitising | Falls back to `"List"` |
| Workbook ≥ 2 MB | Existing behaviour: `filesUnder2MB` false → no-links template, **both** links dropped (`notification-service.ts:469-481`). Unchanged; see Clarification 4 |
| Blob upload failure | `saveExcelToStorage` rejects → builder returns `{ success: false, error }` → PDF and email still proceed |
| Unknown `listTypeName` in the SIAC wrapper | `{ success: false, error: "Unsupported list type: …" }`, surfaced through the existing warn |
| Malformed JSON | Cannot reach here: upload validates against the package's schema first (`libs/list-types/<pkg>/src/validation/json-validator.ts`) |
| Log content | Artefact ID and error message only — no hearing or personal data, consistent with existing log lines |

## 4. Acceptance Criteria Mapping

### AC 1 — "Excel and PDF downloadable files are made available as downloadable options for all the Tribunal hearing lists above"

Satisfied by the eight `EXCEL_GENERATOR_REGISTRY` entries (§2.6): publishing any of the
eight produces both `<artefactId>.pdf` and `<artefactId>.xlsx` in `CONTAINER.PUBLICATIONS`,
and `processPublication` returns `excelPath: "<artefactId>.xlsx"` (`service.ts:645-647`).

Verified by:
- Unit: extend the `generatePublicationExcel` describe block at
  `libs/publication/src/processing/service.test.ts:1584` — each of the eight names resolves
  to a generator and yields `{ hasExcel: true }`; `listTypeHasExcel` returns `true` for all
  eight and `false` for an unregistered name; `processPublication` forwards `provenance` and
  sets `excelPath`.
- E2E `@nightly`: extend `e2e-tests/tests/api/subscription-notifications.spec.ts`, following
  the existing test at `:537`, using `waitForFileGeneration(artefactId, [".pdf", ".xlsx"])`
  (`:49`). Two journeys only — one weekly (GRC) and one daily (AST, for the `listForDate`
  metadata variant). Eight near-identical E2E tests are not added; per-list-type column
  correctness is unit-tested and the publish→generate→email path is identical.
- Manual: open one workbook per list type in Excel and LibreOffice — no repair prompt,
  correct tab name, `dd/MM/yyyy` not re-interpreted.

Interpretation recorded: "downloadable options" means both artefacts generated and both
linked in the email. No in-service download page (§2.10, Clarification 1).

### AC 2 — "All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file"

Satisfied structurally: column keys index both `t.tableHeaders` and the renderer row
objects, and the renderer is the same function the PDF template consumes (§2.3). Metadata
rows reproduce the PDF's header/footer fields — title, list-for date, last updated, data
source.

Verified by: per-package `excel-generator.test.ts` asserting the exact `columnHeaders`
array order against the PDF template's `<th>` order, that CIC's `venue/platform` upload key
surfaces in the `Venue/Platform` column, that AST has no `date` column, and a
field-coverage assertion that every field in the fixture appears in the sheet. A
`tableHeaders`-keyed `COLUMNS` tuple makes an unknown key a compile error.

Interpretation recorded: "data fields" means the PDF's table columns plus its header/footer
metadata. It excludes the PDF's static guidance prose (FaCT link, "Important information",
reporting-restriction caution) — instructional narrative, not list data (Clarification 2).

### AC 3 — "Links to download both file types are displayed in the email notifications"

Requires no code change and is already provable:
`buildEmailDataWithFiles` unconditionally downloads `<artefactId>.xlsx`
(`notification-service.ts:466`), and with both buffers under 2 MB
`getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`
(`template-config.ts:37-42`), which is what causes `pdf_link_text` / `excel_link_text` to be
set (`govnotify-client.ts:79`, `:89`).

Verified by: the existing unit test "should return subscription PDF+Excel template when
non-SJP with both formats under 2MB" (`template-config.test.ts:72`) — **no new test needed
here** (see Correction §5.12) — plus the two E2E journeys asserting the Notify email body
contains at least two document links.

### Welsh

Every metadata label, column heading and worksheet name comes from the locale object
selected by `locale === "cy"`, so a `language: WELSH` publication produces a wholly Welsh
workbook — except SIAC/POAC/PAAC, whose entire `cy.ts` is already English (§2.4).
Verified by per-package tests rendering with `locale: "cy"` and asserting Welsh headings and
sheet name, plus a key-parity assertion `Object.keys(en).sort()` equals
`Object.keys(cy).sort()` after adding the new key. Note only
`libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/locales.test.ts` exists
today; the other five packages need new locale tests (Correction §5.13).

## 5. Corrections to the drafted spec in the issue comment

The drafted spec is largely accurate — the registry line numbers, the eight list type
names, all six column orders, the Excel helper signatures, the notification behaviour and
the 2 MB limit all check out. The following are wrong or materially incomplete.

**§5.1 Renderer function name (`renderCicData` does not exist).**
The spec's §6.3 says `renderCicData`. The real export is
`renderCicWeeklyHearingListData` (`libs/list-types/cic-weekly-hearing-list/src/rendering/renderer.ts:32`).
The `venuePlatform` rename line reference (`:48`) is correct. The other five real names are
`renderPhtData`, `renderCareStandardsTribunalData`, `renderGrcWeeklyHearingListData`,
`renderAstDailyHearingListData`, `renderSiacPoacPaacData` — the spec named only
`renderPhtData`.

**§5.2 The wrapper signature in §6.2 will not compile for three of the six packages.**
`RenderOptions` requires `courtName: string` (non-optional) for CST
(`…/renderer.ts:4-10`), GRC (`…/renderer.ts:4-10`) and SIAC (`…/renderer.ts:4-10`). It is
optional for PHT (`…/renderer.ts:9`) and absent for CIC (`…/renderer.ts:4-9`) and AST
(`…/renderer.ts:4-9`). The spec's PHT example omits it.

**§5.3 `PDF_GENERATOR_REGISTRY` line range.**
The spec says "lines 154-321". It is `libs/publication/src/processing/service.ts:147-336`.
The substantive claim — all eight names have PDF generators — is correct.

**§5.4 `listTitle: t.pageTitle` would emit a placeholder string into the GRC workbook.**
`libs/list-types/grc-weekly-hearing-list/src/locales/cy.ts:4` is
`"[WELSH TRANSLATION REQUIRED: 'General Regulatory Chamber Weekly Hearing List']"`. The
spec's §7 asserts "Titles … already exist in both `en.ts` and `cy.ts`" without noticing
this. Handled in §2.4 by copying the shipped Welsh from `list-type-data.ts:492`.

**§5.5 "Column order … taken verbatim from each PDF template … guarantees AC 2" is right,
but the spec's claim that the Excel title matches the PDF is not.**
All eight PDF generators hardcode an **English** `listTitle` regardless of locale:
`PHT_LIST_TITLE` (`pht-…/src/pdf/pdf-generator.ts:18`, constant at `…/renderer.ts:5`),
`"Care Standards Tribunal Weekly Hearing List"` (`care-standards-…/pdf-generator.ts:31`),
`"General Regulatory Chamber Weekly Hearing List"` (`grc-…/pdf-generator.ts:31`),
`"Criminal Injuries Compensation Weekly Hearing List"` (`cic-…/pdf-generator.ts:16`),
`"Asylum Support Tribunal Daily Hearing List"` (`ast-…/pdf-generator.ts:16`), and the three
SIAC titles from the registry (`service.ts:214`, `:221`, `:228`). Using `t.pageTitle` gives
a Welsh title in the Excel where the PDF shows English. That is the right call (CLAUDE.md
requires Welsh, and it matches the web page at `list-type-handler.ts:188`) but it is a
deliberate divergence, not parity, and the spec presents it as parity.

**§5.6 The data-source label claim is half right.**
The spec says the PDF footer's data source is localised and that `resolveDataSource` uses
the locale map. `resolveDataSource` (`list-type-handler.ts:164-166`) does — that is the
**web page**. The **PDF** uses the English-only `PROVENANCE_LABELS` from
`@hmcts/publication` for seven of the eight (e.g. `pht-…/pdf-generator.ts:4,19`); only GRC
uses `provenanceLabelsEn` (`grc-…/pdf-generator.ts:10`). The two maps disagree on `SNL`
("SNL" vs "ListAssist") and `CP_CATH` ("CP-CaTH" vs "Libra") —
`libs/publication/src/provenance.ts:9-15` vs `libs/list-types/common/src/locales/en.ts`.
The spec's recommendation (use the locale map) is still correct, and there is a stronger
reason it omits: `libs/publication/package.json` depends on all six packages, so importing
`@hmcts/publication` into them is a **circular dependency** — one that already exists
undeclared in five of the six PDF generators (`libs/list-types/pht-weekly-hearing-list/package.json`
lists no `@hmcts/publication` although `src/pdf/pdf-generator.ts:4` imports it).

**§5.7 The spec's own Welsh sheet-name values break ExcelJS.**
`node_modules/exceljs/lib/doc/worksheet.js:155-157` **throws** on `* ? : / \ [ ]`. The
spec's §7.2 proposes `excelSheetName: [WELSH TRANSLATION REQUIRED: "Criminal Injuries Compensation"]`
and three identical SIAC placeholders — all contain `[` and `]`. Its own §7.1 assertion
"All are ≤ 31 characters and contain none of `* ? : / \ [ ]`" is then contradicted by §7.2.
Separately, its proposed AST Welsh value `"Tribiwnlys Cefnogi Ceiswyr Lloches"` is **34
characters** and would be silently truncated (`worksheet.js:163-166`), despite §7.2 claiming
the parity test bounds the length. §2.5 uses shipped `welshFriendlyName` values instead.

**§5.8 The reference implementations do not have metadata rows, so this is a new pattern,
not "the existing pattern".**
`magistrates-public-list/src/excel/excel-generator.ts:32-46` and
`magistrates-standard-list/src/excel/excel-generator.ts:32-62` put the bold header on row 1,
name the sheet `t.title` and read a `t.excelColumns` map. The tribunal packages have
`pageTitle` and `tableHeaders`, not `title` and `excelColumns`. The spec's §7 statement that
only the sheet-name key is new is correct for the tribunal packages, but its framing of the
magistrates generators as the pattern being followed is not.

**§5.9 `listTypeHasExcel` has no production consumers.**
The spec says it "starts returning `true` for these eight names automatically" as though
that has an effect. It is exported at `libs/publication/src/index.ts:16` and referenced
only by tests — `grep` finds no non-test consumer. True but inert.

**§5.10 `excelPath` is not what makes the email find the workbook.**
The spec's flow diagram implies the `excelPath` returned by `processPublication` drives the
email. It does not: `buildEmailDataWithFiles` unconditionally downloads
`\`${artefactId}.xlsx\`` (`notification-service.ts:466`). `excelPath` is declared on the
event type at `libs/notifications/src/notification/validation.ts:21` and **never read**
anywhere in `libs/notifications`. The AC is still testable, but the email does not depend on
it.

**§5.11 The 2 MB constant is local to notifications and the comparison is strict.**
`MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024` is defined at
`libs/notifications/src/notification/notification-service.ts:116` — not imported from
`@hmcts/list-types-common`, which has its own identical constant at
`libs/list-types/common/src/pdf/pdf-utilities.ts:6`. The comparison is `<`
(`notification-service.ts:469`, `:472`), so exactly 2 MB takes the no-links branch. The
spec's AC wording ("2 MB or more") happens to be right.

**§5.12 The template-config test the spec asks for already exists.**
`libs/notifications/src/govnotify/template-config.test.ts:72` is
"should return subscription PDF+Excel template when non-SJP with both formats under 2MB".
No change to that file is needed.

**§5.13 "Extend each package's existing locale test" — five of the six have no locale test.**
Only `libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/locales.test.ts` exists.
New test files (or assertions inside the new `excel-generator.test.ts`) are required for the
other five.

**§5.14 The spec's "Calls `saveExcelToStorage` with the `<artefactId>` key" test is not
achievable as written.**
The builder lives inside `@hmcts/list-types-common` and imports `saveExcelToStorage` from
the sibling module `./excel-utilities.js`, so mocking the **package** export cannot
intercept it (the trick used by
`magistrates-public-list/src/excel/excel-generator.test.ts:4-8` works only because that
wrapper is in a different package). Tests for the builder must mock `@hmcts/azure-blob`'s
`uploadBlob` and assert on the captured blob key and buffer. Per-package wrapper tests
should instead partially mock `@hmcts/list-types-common` with `importOriginal` and spy on
`buildTabularListExcel`, asserting the `columnHeaders` / `rows` / `metadataRows` arrays
directly — deterministic, and it keeps the real locale objects.

**§5.15 Minor.** The spec cites the SIAC web controller as `index.ts:15-34`; the config
block is `:15-33`. `pdf_link_text` / `excel_link_text` at `govnotify-client.ts:79,89` ✓.
`GenerateExcelParams` really does lack `provenance` (`service.ts:338-346`) ✓ and
`processPublication` really does have it available (`service.ts:593`) ✓. The
`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` value is configured in both
`apps/web/helm/values.yaml:25` and `apps/api/helm/values.yaml:12` ✓. All eight names exist
in `list-type-data.ts` ✓ and all eight are in `PDF_GENERATOR_REGISTRY` ✓. All six column
orders in its §6.3 table match the PDF templates exactly ✓. The locale keys it lists
(`pageTitle`, `listForWeekCommencing`, `listForDate`, `lastUpdated`, `at`, `dataSource`,
`tableHeaders`, `provenanceLabels`) all exist as claimed ✓, with the two caveats that AST
has `listForDate` and **not** `listForWeekCommencing`, and the SIAC package has **no**
`pageTitle` (which the spec does note in its §6.4).

## CLARIFICATIONS NEEDED

1. **In-service download page.** AC 1 says "made available as downloadable options". This
   plan delivers generation + email links only, matching how Excel shipped for
   `MAGISTRATES_PUBLIC_LIST` / `MAGISTRATES_STANDARD_LIST`. Only SJP has an on-page
   download journey. If product wants an on-page "Download" option for these eight, that is
   a separate, larger ticket (shared download page + disclaimer + verified-user guard for
   eight list types). Confirm email-only is acceptable.
2. **Definition of "all the data fields".** Assumed: the PDF's table columns plus title,
   list-for date, last updated and data source. Excludes the PDF's static guidance prose
   (FaCT link, "Important information", caution notes). Confirm with content design.
3. **GRC Welsh page title.** `grc-…/src/locales/cy.ts:4` is a
   `[WELSH TRANSLATION REQUIRED: …]` placeholder that is already live on the Welsh GRC web
   page. This plan replaces it with the Welsh already shipped in
   `list-type-data.ts:492` ("Rhestr Wrandawiadau Wythnosol y Siambr Reoleiddio Gyffredinol").
   Confirm this one-line content fix can ride along, or the Welsh workbook title will read
   as a placeholder.
4. **Three Welsh worksheet names for SIAC / POAC / PAAC.** No Welsh exists anywhere in the
   codebase for these three (the whole `cy.ts` is English, and `welshFriendlyName` in
   `list-type-data.ts:337,348,359` is also English). Content design needs three Welsh names
   of ≤ 31 characters. Until then the sanitised placeholder is used.
5. **Excel-only edge case.** If PDF generation fails but Excel succeeds, a non-SJP list
   takes the `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` branch (`template-config.ts:44-47`)
   with `hasPdf: false, hasExcel: true` — there is no non-SJP Excel-only template. Existing
   behaviour, not introduced here. Confirm it is acceptable to leave, or raise separately.
6. **2 MB ceiling drops both links.** A large weekly list that pushes either file to 2 MB
   or more causes the no-links template, losing the PDF link too
   (`notification-service.ts:474`). Unchanged here. Confirm that is still the desired
   behaviour now that a second file can trip it.
7. **Retrospective generation.** Artefacts published before release have no `.xlsx`.
   Assumed no backfill (the email is sent once, at publication). Confirm.
8. **Notify template wording.** The shared PDF+Excel template body
   (`42f65ada-6de0-45da-822a-9632f6f682fd`) was written with SJP in mind. Someone should
   read the live template and confirm it reads correctly for a weekly tribunal list before
   release.
9. **SIAC/POAC/PAAC Welsh locale debt.** The whole `cy.ts` holds English strings. Assumed
   out of scope and raised separately; flagged so a Welsh SIAC workbook showing English
   headings is not mistaken for a regression introduced by this ticket.
