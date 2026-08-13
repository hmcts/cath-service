# #944: Create additional file format for Download version of the Tribunals Hearing List

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-08-12T13:29:29Z
**Updated:** 2026-08-13T11:35:08Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the excel download file for all the Tribunal hearing lists not covered in the other tickets.
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
- Excel and PDF downloadable files are made available as downloadable options for all the Tribunal hearing lists above
- All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-08-13T10:55:47Z

@spec

### Comment by hmctsclaudecode on 2026-08-13T11:07:00Z

# Technical Specification — Issue #944: Excel download format for the remaining Tribunal hearing lists

## 1. User Story
**As a** CaTH verified user subscribed to a Tribunal hearing list
**I want to** receive an Excel (`.xlsx`) version of the list alongside the PDF in my subscription email
**So that** I can sort, filter and re-use the hearing data instead of reading a fixed-layout PDF

Secondary (service) story, as worded in the issue:

**As a** service
**I want to** provide additional download file options for hearing lists in CaTH
**So that** CaTH verified users have more options to choose from

## 2. Background

Publication processing already generates a PDF for every JSON list type and, for a small
number of list types, an Excel workbook. Both are stored in the `PUBLICATIONS` blob
container as `<artefactId>.pdf` / `<artefactId>.xlsx`, and the subscription email picks
up whichever files exist.

Existing plumbing that this ticket reuses unchanged:

| Concern | Location |
|---|---|
| Excel generator registry (keyed by `listTypeName`) | `libs/publication/src/processing/service.ts:361` (`EXCEL_GENERATOR_REGISTRY`) |
| Excel generation orchestration | `libs/publication/src/processing/service.ts:390` (`generatePublicationExcel`), called from `processPublication` at line 635 |
| Workbook → blob storage, cell sanitisation, column widths | `libs/list-types/common/src/excel/excel-utilities.ts` (`saveExcelToStorage`, `sanitiseCellValue`, `autoFitColumns`) |
| Email attaches whatever exists | `libs/notifications/src/notification/notification-service.ts:457` (`buildEmailDataWithFiles`) — always attempts `downloadBlob(`${artefactId}.xlsx`)` |
| Notify template selection | `libs/notifications/src/govnotify/template-config.ts:15` (`getSubscriptionTemplateId`) — returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both files are present and under 2 MB |
| Notify document links | `libs/notifications/src/govnotify/govnotify-client.ts:72-90` — sets `pdf_link_to_file` / `excel_link_to_file` personalisation |
| Reference implementations | `libs/list-types/magistrates-public-list/src/excel/excel-generator.ts`, `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` |

**The only reason these eight lists have no Excel download today is that they have no
entry in `EXCEL_GENERATOR_REGISTRY`.** Nothing in the email, template-selection or blob
layer needs behavioural change.

### The eight list types in scope

All eight are "non-strategic" lists: a flat array of row objects, rendered by the PDF as a
single table. Each already has an `ExcelConverterConfig` (Excel→JSON upload direction), a
renderer, locale files with a `tableHeaders` map, and a PDF template.

| # | List (issue wording) | `listTypeName` | Package (`libs/list-types/…`) |
|---|---|---|---|
| 1 | Primary Health Tribunal Weekly Hearing List | `PHT_WEEKLY_HEARING_LIST` | `pht-weekly-hearing-list` |
| 2 | Care Standards Tribunal Weekly Hearing List | `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `care-standards-tribunal-weekly-hearing-list` |
| 3 | Special Immigration Appeals Commission Weekly Hearing List | `SIAC_WEEKLY_HEARING_LIST` | `siac-poac-paac-weekly-hearing-list` |
| 4 | Proscribed Organisations Appeal Commission Weekly Hearing List | `POAC_WEEKLY_HEARING_LIST` | `siac-poac-paac-weekly-hearing-list` |
| 5 | Pathogens Access Appeal Commission Weekly Hearing List | `PAAC_WEEKLY_HEARING_LIST` | `siac-poac-paac-weekly-hearing-list` |
| 6 | General Regulatory Chamber Weekly Hearing List | `GRC_WEEKLY_HEARING_LIST` | `grc-weekly-hearing-list` |
| 7 | Criminal Injuries Compensation Weekly Hearing List | `CIC_WEEKLY_HEARING_LIST` | `cic-weekly-hearing-list` |
| 8 | Asylum Support Tribunal Daily Hearing List | `AST_DAILY_HEARING_LIST` | `ast-daily-hearing-list` |

Eight list type names across six packages. All routing is by stable `listTypeName`; no
numeric `listTypeId` is used anywhere in this change.

### Design decision: one shared builder, six thin wrappers

The two existing Excel generators (`magistrates-*`) each hand-roll workbook creation
because their source data is a deeply nested court/room/session/hearing tree. The eight
lists here are all flat `Array<Record<string, string>>` with a locale `tableHeaders` map,
so eight hand-rolled generators would be eight copies of the same loop.

Therefore: add **one** config-driven builder to `@hmcts/list-types-common`
(`buildTabularListExcel`) and **one thin wrapper per package** that supplies the column
order, the localised title/sheet name and the rendered rows. The `magistrates-*`
generators are left untouched.

## 3. Acceptance Criteria

* **Scenario:** Excel is generated for a Tribunal list published as JSON
    * **Given** an admin publishes any of the eight list types in the table above (via
      non-strategic Excel upload, manual JSON upload, or the blob-ingestion API)
    * **When** `processPublication` runs
    * **Then** both `<artefactId>.pdf` and `<artefactId>.xlsx` exist in the `PUBLICATIONS`
      blob container, and `processPublication` returns `excelPath: "<artefactId>.xlsx"`

* **Scenario:** Excel contains every field shown in the PDF
    * **Given** a published list of one of the eight types
    * **When** the generated `.xlsx` is opened
    * **Then** the worksheet contains the list title, the "list for" date, the last-updated
      date/time, the data source, and one column per PDF table column **in the same order
      as the PDF**, with one row per hearing and no data loss or truncation

* **Scenario:** Both download links appear in the subscription email
    * **Given** a verified user subscribed to a location or list type that publishes one of
      the eight lists
    * **And** both generated files are under 2 MB
    * **When** the publication notification is sent
    * **Then** `getSubscriptionTemplateId` resolves to
      `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` and the email body contains two
      GOV.UK Notify document links — "Download PDF version" and "Download Excel version"

* **Scenario:** Welsh publication produces a Welsh workbook
    * **Given** a list published with `language: WELSH` (`locale: "cy"`)
    * **When** the Excel file is generated
    * **Then** the worksheet name, title row, metadata labels and column headings come from
      the package's `cy` locale object

* **Scenario:** Excel failure never blocks the publication
    * **Given** Excel generation throws (malformed row data, blob upload failure)
    * **When** `generatePublicationExcel` handles it
    * **Then** the error is logged, `hasExcel` is not set, the PDF is still stored, and the
      subscriber email is still sent using the PDF-only Notify template

* **Scenario:** A file over the Notify limit degrades safely
    * **Given** a generated `.xlsx` of 2 MB or more
    * **When** the notification is built
    * **Then** the no-links template is used (existing behaviour of
      `buildEmailDataWithFiles`) and no partial/broken link is emitted

* **Scenario:** An empty list still produces a valid workbook
    * **Given** a published artefact whose JSON array contains zero hearings
    * **When** Excel generation runs
    * **Then** a valid workbook is produced with the metadata rows and the header row and no
      data rows (mirroring the PDF, which renders its header and "no hearings" message)

## 4. User Journey Flow

```
┌────────────────────────┐
│ CaTH admin             │
│ uploads Tribunal list  │
│ (Excel template → JSON,│
│  or JSON, or API)      │
└───────────┬────────────┘
            │
            ▼
   processPublication()
            │
            ├──► extractAndStoreArtefactSearch()
            │
            ├──► generatePublicationPdf()   ──► <artefactId>.pdf   (unchanged)
            │
            ├──► generatePublicationExcel() ──► <artefactId>.xlsx  ◀── NEW for these 8
            │        └─ EXCEL_GENERATOR_REGISTRY[listTypeName]
            │             └─ generate<X>Excel()
            │                  └─ buildTabularListExcel()  (@hmcts/list-types-common)
            │                       └─ saveExcelToStorage()
            │
            └──► sendPublicationNotificationsForArtefact()
                     └─ buildEmailDataWithFiles()
                          ├─ downloadBlob(<artefactId>.pdf)
                          ├─ downloadBlob(<artefactId>.xlsx)   ← now finds a file
                          └─ getSubscriptionTemplateId({hasPdf: true, hasExcel: true})
                               └─ GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL
                                    │
                                    ▼
                    ┌──────────────────────────────────┐
                    │ Subscriber email:                │
                    │  • Download PDF version   (link) │
                    │  • Download Excel version (link) │
                    │  links valid for 1 week          │
                    └──────────────────────────────────┘
```

Sequence at the code level:

```
non-strategic-upload-summary/index.ts (or manual-upload-summary, or blob-ingestion)
  └─ processPublication (libs/publication/src/processing/service.ts:586)
       ├─ generatePublicationPdf   (line 416)  → listTypeName resolved from DB here
       ├─ generatePublicationExcel (line 390)  → registry lookup by listTypeName
       └─ sendPublicationNotificationsForArtefact (line 466)
```

Note the ordering dependency: `generatePublicationExcel` is called with
`listTypeName: pdfResult.listTypeName`. `generatePublicationPdf` is the only place that
resolves the name from the database, so a list type must have a PDF generator registered
for the Excel lookup to receive a name. All eight already have PDF generators registered
(`PDF_GENERATOR_REGISTRY`, lines 154-321), so this holds.

## 5. Low Fidelity Wireframe

There is no new or changed CaTH page. Two artefacts change: the email a subscriber
receives, and the workbook they open.

### 5.1 Subscription email (existing PDF+Excel Notify template, now used for these lists)

```
┌───────────────────────────────────────────────────────────────┐
│  GOV.UK                                                       │
│  Court and Tribunal Hearings                                  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  There has been an update to a court or tribunal hearing       │
│  list you have subscribed to.                                 │
│                                                               │
│  List:      General Regulatory Chamber Weekly Hearing List    │
│  Court:     Field House                                       │
│  Date:      16 August 2026                                    │
│                                                               │
│  Summary of cases                                             │
│  ...                                                          │
│                                                               │
│  Download PDF version      ← link (Notify document service)   │
│  Download Excel version    ← link (Notify document service)   │
│                                                               │
│  These links will stop working after one week.                │
│                                                               │
│  Manage your subscriptions                                    │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 Generated workbook — weekly list example (GRC)

Sheet name: `General Regulatory Chamber`

```
    A                    B             C                D          E         F         G               H       I
 1  General Regulatory Chamber Weekly Hearing List
 2  List for week commencing 16 August 2026
 3  Last updated 15 August 2026 at 5:35pm
 4  Data source: Manual upload
 5  (blank)
 6 ┌────────────┬──────────────┬────────────────┬──────────┬─────────┬─────────┬───────────────┬───────┬─────────────┐
    │ Date       │ Hearing time │ Case reference │ Case name│ Judge(s)│ Member(s)│ Mode of hearing│ Venue │ Additional  │  ← bold
    │            │              │ number         │          │         │          │               │       │ information │
 7  │ 16/08/2026 │ 10:30am      │ GRC/1234/2026  │ A v B    │ Judge A │ Member A │ Remote        │ Field │ …           │
 8  │ 16/08/2026 │ 2pm          │ GRC/1235/2026  │ C v D    │ Judge B │ Member B │ In person     │ House │ …           │
    └────────────┴──────────────┴────────────────┴──────────┴─────────┴─────────┴───────────────┴───────┴─────────────┘
```

### 5.3 Generated workbook — daily list example (AST)

Sheet name: `Asylum Support Tribunal`

```
    A            B                        C          D            E            F
 1  Asylum Support Tribunal Daily Hearing List
 2  List for 16 August 2026
 3  Last updated 15 August 2026 at 5:35pm
 4  Data source: Manual upload
 5  (blank)
 6 ┌───────────┬────────────────────────┬───────────┬──────────────┬──────────────┬────────────────────────┐
    │ Appellant │ Appeal reference number│ Case type │ Hearing type │ Hearing time │ Additional information │  ← bold
 7  │ A Person  │ AS/1234/2026           │ Section 95│ Substantive  │ 10am         │ …                      │
    └───────────┴────────────────────────┴───────────┴──────────────┴──────────────┴────────────────────────┘
```

## 6. Page Specifications

No CaTH page or route changes. The specification below covers the module changes.

### 6.1 NEW — shared tabular workbook builder

**File:** `libs/list-types/common/src/excel/tabular-list-excel.ts`
**Exported from:** `libs/list-types/common/src/index.ts` (alongside the existing
`autoFitColumns` / `sanitiseCellValue` / `saveExcelToStorage` export at line 30)

```typescript
import ExcelJS from "exceljs";
import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "./excel-utilities.js";

const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_NAME_CHARS = /[*?:/\\[\]]/g;

export interface TabularListExcelOptions {
  artefactId: string;
  sheetName: string;
  metadataRows: string[];
  columnHeaders: string[];
  rows: string[][];
}

export interface TabularListExcelResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function buildTabularListExcel(options: TabularListExcelOptions): Promise<TabularListExcelResult> {
  // 1. new Workbook, addWorksheet(toSafeSheetName(options.sheetName))
  // 2. one row per metadataRows entry; row 1 bold
  // 3. one blank spacer row
  // 4. columnHeaders row, font { bold: true }
  // 5. rows.map -> worksheet.addRow(row.map(sanitiseCellValue))
  // 6. autoFitColumns(worksheet)
  // 7. saveExcelToStorage(artefactId, Buffer.from(await workbook.xlsx.writeBuffer()))
  // 8. try/catch -> { success: false, error: `Failed to generate Excel: ${message}` }
}
```

`toSafeSheetName` (module-private) strips `* ? : / \ [ ]`, trims leading/trailing
apostrophes and truncates to 31 characters — these are hard limits of the OOXML sheet-name
format, and Welsh sheet names are the realistic overflow risk.

Behavioural requirements:

- Every cell value passes through `sanitiseCellValue` (CSV/formula-injection guard already
  used by the `magistrates-*` generators).
- `undefined` / `null` field values become `""`, never the string `"undefined"`.
- Returns `{ success: false, error }` rather than throwing — matches the `ExcelGenerator`
  contract in `libs/publication/src/processing/service.ts:359`.

### 6.2 NEW — one wrapper per package

**Files:** `libs/list-types/<package>/src/excel/excel-generator.ts` (6 new files), each
exported from that package's `src/index.ts`.

Shape (PHT shown; the other five differ only in columns, renderer and title source):

```typescript
import { buildTabularListExcel, type TabularListExcelResult } from "@hmcts/list-types-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { PhtHearingList } from "../models/types.js";
import { PHT_LIST_TITLE, renderPhtData } from "../rendering/renderer.js";

const COLUMNS = ["date", "caseName", "hearingLength", "hearingType", "venue", "additionalInformation"] as const;

interface ExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: PhtHearingList;
  provenance?: string;
}

export function generatePhtWeeklyHearingListExcel(options: ExcelGenerationOptions): Promise<TabularListExcelResult> {
  const t = options.locale === "cy" ? cyLocale : enLocale;
  const { header, hearings } = renderPhtData(options.jsonData, {
    locale: options.locale,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.pageTitle
  });

  return buildTabularListExcel({
    artefactId: options.artefactId,
    sheetName: t.excelSheetName,
    metadataRows: buildMetadataRows(t, header, options.provenance),
    columnHeaders: COLUMNS.map((key) => t.tableHeaders[key]),
    rows: hearings.map((hearing) => COLUMNS.map((key) => String(hearing[key] ?? "")))
  });
}
```

`buildMetadataRows` is a small shared helper (also in
`libs/list-types/common/src/excel/tabular-list-excel.ts`) producing, in order:

1. `header.listTitle`
2. `` `${t.listForWeekCommencing} ${header.weekCommencingDate}` `` — or
   `` `${t.listForDate} ${header.listForDate}` `` for the AST daily list
3. `` `${t.lastUpdated} ${header.lastUpdatedDate} ${t.at} ${header.lastUpdatedTime}` ``
4. `` `${t.dataSource}: ${t.provenanceLabels[provenance] ?? provenance}` `` — omitted when
   `provenance` is absent, matching the PDF footer's `{% if dataSource %}`

Localised provenance comes from the locale's own `provenanceLabels` map (already present in
every one of these packages via `provenanceLabelsEn` / `provenanceLabelsCy`), which is what
`resolveDataSource` in `apps/web/src/pages/(list-types)/list-type-handler.ts:164` uses. Do
**not** import the English-only `PROVENANCE_LABELS` from `@hmcts/publication` here.

`lastReceivedDate` is set to generation time, exactly as `generateListPdf` does
(`libs/list-types/common/src/pdf/pdf-utilities.ts:148`), so the Excel and PDF
"Last updated" values agree.

### 6.3 Column order per list type

Column order and keys are taken verbatim from each PDF template's `<th>` order, which
guarantees AC 2. Keys index both `t.tableHeaders` and the renderer's row objects.

| List type | Columns (in order) |
|---|---|
| `PHT_WEEKLY_HEARING_LIST` | `date`, `caseName`, `hearingLength`, `hearingType`, `venue`, `additionalInformation` |
| `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `date`, `caseName`, `hearingLength`, `hearingType`, `venue`, `additionalInformation` |
| `SIAC_WEEKLY_HEARING_LIST`, `POAC_WEEKLY_HEARING_LIST`, `PAAC_WEEKLY_HEARING_LIST` | `date`, `time`, `appellant`, `caseReferenceNumber`, `hearingType`, `courtroom`, `additionalInformation` |
| `GRC_WEEKLY_HEARING_LIST` | `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `modeOfHearing`, `venue`, `additionalInformation` |
| `CIC_WEEKLY_HEARING_LIST` | `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `venuePlatform`, `judges`, `members`, `additionalInformation` |
| `AST_DAILY_HEARING_LIST` | `appellant`, `appealReferenceNumber`, `caseType`, `hearingType`, `hearingTime`, `additionalInformation` |

Two traps to respect:

- **CIC** — the upload JSON key is `"venue/platform"`, but `renderCicData`
  (`libs/list-types/cic-weekly-hearing-list/src/rendering/renderer.ts:48`) renames it to
  `venuePlatform`. The Excel wrapper must consume the **renderer output**, not raw JSON.
- **Dates** — `date` is formatted to `dd/MM/yyyy` by the renderers via
  `formatDdMmYyyyDate`. Write it as a **string**, not an Excel date serial, so the Excel
  matches the PDF exactly and cannot be re-interpreted as US `MM/dd/yyyy` by the reader's
  locale. AST has no `date` column (its date is the list-level "List for" date).

### 6.4 SIAC / POAC / PAAC — three list types, one package

The package has no single page title; the web controller
(`apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.ts:15-34`) keys
off `listTypeName` into a `LIST_TYPE_CONFIG` of locale-backed titles. Mirror that inside
the lib so no display string is hardcoded in the registry:

```typescript
const LIST_TYPE_CONFIG: Record<string, { enTitle: string; cyTitle: string; enSheet: string; cySheet: string }> = {
  SIAC_WEEKLY_HEARING_LIST: { enTitle: en.siacPageTitle, cyTitle: cy.siacPageTitle, enSheet: en.siacExcelSheetName, cySheet: cy.siacExcelSheetName },
  POAC_WEEKLY_HEARING_LIST: { … },
  PAAC_WEEKLY_HEARING_LIST: { … }
};

export function generateSiacPoacPaacWeeklyHearingListExcel(options: ExcelGenerationOptions & { listTypeName: string }) {
  const config = LIST_TYPE_CONFIG[options.listTypeName];
  if (!config) return Promise.resolve({ success: false, error: `Unsupported list type: ${options.listTypeName}` });
  …
}
```

### 6.5 CHANGED — registry and parameter plumbing

**File:** `libs/publication/src/processing/service.ts`

1. Add `provenance?: string` to `GenerateExcelParams` (line 338). The interface currently
   has no provenance, so the "Data source" metadata row cannot be populated without it.
2. Pass `provenance` in the `generatePublicationExcel` call inside `processPublication`
   (line 635) — the value is already destructured from `ProcessPublicationParams`.
3. Add eight entries to `EXCEL_GENERATOR_REGISTRY` (line 361):

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

`siacPoacPaacExcelGenerator` is a module-level `const` mirroring the existing
`rcjStandardGenerator` / `adminCourtGenerator` pattern (lines 90-96) and forwarding
`listTypeName`.

`libs/publication/package.json` already depends on all six packages (their PDF generators
are imported at the top of `service.ts`), and `libs/list-types/common/package.json` already
pins `exceljs: 4.4.0` — **no new dependencies**.

`listTypeHasExcel` (line 386) reads the same registry, so it starts returning `true` for
these eight names automatically.

### 6.6 Out of scope (deliberate)

No in-service "download this list" page is added. Only SJP lists have one today
(`apps/web/src/pages/(list-types)/sjp-*/list-download-files.ts`); Excel for
`MAGISTRATES_PUBLIC_LIST` and `MAGISTRATES_STANDARD_LIST` was delivered email-only, and
AC 3 of this issue scopes the links to the email notification. See §14.

## 7. Content

Only one new locale key per list type (plus three for the SIAC package): the worksheet
name. Titles, metadata labels and column headings all reuse existing keys
(`pageTitle`, `listForWeekCommencing`, `listForDate`, `lastUpdated`, `at`, `dataSource`,
`tableHeaders.*`, `provenanceLabels`) which already exist in both `en.ts` and `cy.ts`.

### 7.1 New keys — English

```typescript
// libs/list-types/pht-weekly-hearing-list/src/locales/en.ts
excelSheetName: "Primary Health Tribunal",

// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/locales/en.ts
excelSheetName: "Care Standards Tribunal",

// libs/list-types/grc-weekly-hearing-list/src/locales/en.ts
excelSheetName: "General Regulatory Chamber",

// libs/list-types/cic-weekly-hearing-list/src/locales/en.ts
excelSheetName: "Criminal Injuries Compensation",

// libs/list-types/ast-daily-hearing-list/src/locales/en.ts
excelSheetName: "Asylum Support Tribunal",

// libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/en.ts
siacExcelSheetName: "SIAC Weekly Hearing List",
poacExcelSheetName: "POAC Weekly Hearing List",
paacExcelSheetName: "PAAC Weekly Hearing List",
```

All are ≤ 31 characters and contain none of `* ? : / \ [ ]`.

### 7.2 New keys — Welsh

```typescript
// libs/list-types/pht-weekly-hearing-list/src/locales/cy.ts
excelSheetName: Tribiwnlys Iechyd Sylfaenol,

// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/locales/cy.ts
excelSheetName: Tribiwnlys Safonau Gofal,

// libs/list-types/grc-weekly-hearing-list/src/locales/cy.ts
excelSheetName: Siambr Reoleiddio Gyffredinol,

// libs/list-types/cic-weekly-hearing-list/src/locales/cy.ts
excelSheetName: [WELSH TRANSLATION REQUIRED: "Criminal Injuries Compensation"],

// libs/list-types/ast-daily-hearing-list/src/locales/cy.ts
excelSheetName: Tribiwnlys Cefnogi Ceiswyr Lloches,

// libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/cy.ts
siacExcelSheetName: [WELSH TRANSLATION REQUIRED: "SIAC Weekly Hearing List"],
poacExcelSheetName: [WELSH TRANSLATION REQUIRED: "POAC Weekly Hearing List"],
paacExcelSheetName: [WELSH TRANSLATION REQUIRED: "PAAC Weekly Hearing List"],
```

Welsh strings are typically 15-25% longer than English. Any translation exceeding 31
characters must be shortened by the content designer rather than silently truncated by
`toSafeSheetName`; the locale-parity unit test (§13) asserts the length bound so this is
caught in CI, not by a user opening a workbook with a clipped tab name.

### 7.3 Email content

No new content. `"Download PDF version"` and `"Download Excel version"` are set as
`pdf_link_text` / `excel_link_text` in `libs/notifications/src/govnotify/govnotify-client.ts:79,89`
and rendered by the existing `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` Notify
template. Welsh email content is a property of the Notify template, not this codebase.

### 7.4 Existing Welsh debt (flagged, not fixed here)

`libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/cy.ts` currently holds
English strings for `listForWeekCommencing`, `lastUpdated`, `at`, `factLinkText` and the
`tableHeaders` entries. A Welsh SIAC/POAC/PAAC workbook will therefore show English
headings — identical to the current Welsh PDF and web page. Fixing that locale file is a
separate content ticket; this ticket must not regress it.

## 8. URL

No new or changed routes. Artefact paths in the `PUBLICATIONS` blob container:

| Artefact | Key |
|---|---|
| PDF (existing) | `<artefactId>.pdf` |
| Excel (new for these 8) | `<artefactId>.xlsx` |

Download URLs in the email are ephemeral GOV.UK Notify document-service links generated by
`prepareUpload`, with `retentionPeriod: "1 week"` and
`confirmEmailBeforeDownload: false` (`govnotify-client.ts:73-87`).

## 9. Validation

No user-facing input is added — Excel generation is a server-side side effect of
publication. Validation applies to the generation inputs and outputs.

| Rule | Where enforced | Behaviour on breach |
|---|---|---|
| JSON must satisfy the list type's schema | Existing `validate*` on upload (`libs/list-types/<pkg>/src/validation/json-validator.ts`) | Upload rejected before publication — Excel never runs on invalid data |
| Worksheet name ≤ 31 chars, excludes `* ? : / \ [ ]` | `toSafeSheetName` in `buildTabularListExcel`; asserted in unit tests | Sanitised + truncated; test failure in CI if a locale value is too long |
| Cell values must not be interpretable as formulas | `sanitiseCellValue` (existing) prefixes `=`, `+`, `-`, `@` with `'` | Value escaped |
| Missing/undefined optional field | Wrapper's `String(value ?? "")` | Empty cell |
| Row count ≥ 0 | `buildTabularListExcel` | Zero rows → header-only workbook (valid) |
| Generated file < 2 MB for email attachment | Existing `MAX_PDF_SIZE_BYTES` check in `buildEmailDataWithFiles` | No-links Notify template used |
| Column keys must exist in `tableHeaders` | TypeScript — `COLUMNS` typed against `keyof typeof en.tableHeaders` | Compile error |

## 10. Error Messages

No user-facing error text: the failure surface is server logs, and every failure mode is
already non-fatal by design.

| Condition | Message | Channel |
|---|---|---|
| Generator returns `{ success: false }` | `[Publication] Excel generation failed: { artefactId, error }` | `console.warn` — existing, `service.ts:406` |
| Generator throws | `[Publication] Excel generation error: { artefactId, error }` | `console.error` — existing, `service.ts:411` |
| Workbook build/upload failure inside the builder | `Failed to generate Excel: <message>` returned as `error` | Surfaced via the warn above |
| Unsupported `listTypeName` reaches the SIAC wrapper | `Unsupported list type: <name>` returned as `error` | Surfaced via the warn above |
| Notify rejects the send | `GOV.UK Notify error: <details>` | Existing, `govnotify-client.ts:113` |

Log lines must not contain hearing data or personal data — artefact ID and error message
only, consistent with the existing lines.

## 11. Navigation

- No CaTH navigation change; no new links in the web app.
- In the email, the two document links sit in the existing PDF+Excel Notify template
  alongside the existing "start page" and "manage subscriptions" links
  (`start_page_link`, `subscription_page_link` in `buildTemplateParameters`).
- Link order in the template is PDF first, then Excel — matching the SJP PDF+Excel email
  so subscribers see one consistent layout across list types.

## 12. Accessibility

WCAG 2.2 AA applies to the artefacts we emit, even though no HTML page changes.

Spreadsheet accessibility:

- **Single data table per sheet**, one header row, no merged cells and no blank columns —
  screen readers and `Ctrl`+arrow navigation depend on a contiguous rectangular range.
- **Header row is bold and is the row directly above the data** (row 6 in §5.2), so Excel
  and assistive technology can infer it. Metadata rows sit above a single blank spacer row
  and are never interleaved with data.
- **Every column has a non-empty heading**, taken from the localised `tableHeaders` — no
  positional-only columns.
- **No information conveyed by colour or formatting alone.** Bold is decorative emphasis on
  the title/header rows only; all meaning is in text.
- **Text, not codes**: reporting/mode values are written as the same human-readable strings
  the PDF shows.
- **Worksheet name is meaningful** (the tribunal name), not `Sheet1`.
- **Language**: the whole workbook is generated from a single locale object, so a Welsh
  publication yields a wholly Welsh workbook — no mixed-language rows.
- **Email links have descriptive text** — "Download PDF version" / "Download Excel version"
  state both action and format, rather than "click here". Format is stated in the link text
  because the file type is not otherwise announced.
- The PDF remains available for users whose assistive technology handles it better; Excel is
  an *additional* option, never a replacement (AC 1).

## 13. Test Scenarios

Unit — `libs/list-types/common/src/excel/tabular-list-excel.test.ts` (new):

* Produces a workbook whose metadata rows, blank spacer, bold header row and data rows
  appear in the specified order, read back with ExcelJS
* Truncates a worksheet name longer than 31 characters and strips `* ? : / \ [ ]`
* Escapes a cell value beginning with `=` so it cannot execute as a formula
* Renders `undefined` and `null` field values as empty cells, never `"undefined"`
* Returns a header-only workbook when passed zero rows
* Returns `{ success: false, error }` (does not throw) when blob upload rejects
* Calls `saveExcelToStorage` with the `<artefactId>` key

Unit — `libs/list-types/<package>/src/excel/excel-generator.test.ts` (6 new files):

* Emits columns in exactly the order the package's PDF template renders them
* Column headings come from `en.tableHeaders` for `locale: "en"` and `cy.tableHeaders` for
  `locale: "cy"`, and the worksheet name switches locale with them
* Metadata rows carry the list title, the "list for week commencing" (or "list for" for
  AST) date, the last-updated date/time, and the localised data source
* Omits the data-source row when `provenance` is absent
* CIC specifically: the `venue/platform` upload key surfaces in the `Venue/Platform`
  column (guards the renderer's `venuePlatform` rename)
* SIAC package: `SIAC_`, `POAC_` and `PAAC_WEEKLY_HEARING_LIST` each produce their own
  title and sheet name; an unknown `listTypeName` returns `{ success: false }`
* Every field present in the fixture JSON appears somewhere in the sheet (AC 2, expressed
  as a field-coverage assertion rather than a column-by-column duplicate)

Unit — locale parity (extend each package's existing locale test):

* `Object.keys(en).sort()` equals `Object.keys(cy).sort()` after adding the new key
* Each `excelSheetName` (en and cy) is ≤ 31 characters and free of `* ? : / \ [ ]`

Unit — `libs/publication/src/processing/service.test.ts` (extend the existing
`generatePublicationExcel` describe block at line 1584):

* Each of the eight `listTypeName` values resolves to a generator and yields
  `{ hasExcel: true }` on success
* A failing tribunal generator logs the warning and returns `{}`, and `processPublication`
  still returns the PDF path with `excelPath` undefined
* `processPublication` forwards `provenance` into `generatePublicationExcel`
* `processPublication` sets `excelPath: "<artefactId>.xlsx"` and passes it to
  `sendPublicationNotificationsForArtefact` for a tribunal list
* `listTypeHasExcel` returns `true` for all eight names and `false` for an unregistered name

Unit — `libs/notifications/src/govnotify/template-config.test.ts` (extend):

* A non-SJP list with both PDF and Excel under 2 MB resolves to
  `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` (regression cover for these lists
  now taking that branch)

E2E — extend `e2e-tests/tests/api/subscription-notifications.spec.ts`, following the
existing `"SJP public list generates PDF and Excel with both download links in email @nightly"`
test:

* One `@nightly` journey test for a representative weekly tribunal list (GRC): publish via
  the API, `waitForFileGeneration(artefactId, [".pdf", ".xlsx"])`, assert both files exist
  with non-zero size, assert the Notify email body contains at least two document links,
  and assert the list name and content date appear in the body
* One `@nightly` journey test for the daily list (AST) covering the `listForDate` metadata
  variant

Deliberately not added: eight near-identical E2E tests. Per-list-type column correctness is
unit-tested; the E2E tests prove the end-to-end publish → generate → email path, which is
identical for all eight.

Manual verification before sign-off:

* Open one generated workbook per list type in Excel and in LibreOffice; confirm no repair
  prompt, correct tab name, and that `dd/MM/yyyy` dates are not re-interpreted
* Publish one list in Welsh and confirm the workbook is Welsh throughout (noting §7.4 for
  SIAC/POAC/PAAC)

## 14. Assumptions & Open Questions

Assumptions:

* "Excel and PDF … made available as downloadable options" is satisfied by generating both
  artefacts and linking both in the email. **No in-service download page is added for these
  eight lists.** Only SJP lists have one, and the equivalent Excel work for
  `MAGISTRATES_PUBLIC_LIST` / `MAGISTRATES_STANDARD_LIST` was delivered email-only. If the
  product intent is an on-page "Download" option for tribunal lists, that is a distinct,
  larger piece of work (a shared download page + disclaimer + `require-verified` guard for
  ~8 list types) and should be its own ticket.
* "All the data fields available in the current downloadable PDF" means the PDF's table
  columns plus its header/footer metadata (title, list date, last updated, data source). It
  does not mean the PDF's static guidance prose (FaCT link, "Important information",
  reporting-restriction caution) — that is instructional narrative, not list data, and does
  not belong in a data grid.
* One worksheet per workbook. None of these eight lists is grouped by court or venue in its
  PDF, so there is nothing to split across sheets.
* Dates stay as `dd/MM/yyyy` **text**, matching the PDF byte-for-byte. This trades
  native date-sorting for exactness and locale safety.
* `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is already configured in
  `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml`, and the referenced Notify
  template renders `excel_link_to_file` for non-SJP lists. No new environment variable.
* Third-party fulfilment (`sendThirdPartyPublications`) continues to push JSON/PDF only —
  it takes `pdfPath` and is untouched.

Open questions:

1. **Retrospective generation** — artefacts published before this change have no `.xlsx`.
   Should a backfill run over live artefacts still inside their display window, or is
   Excel only available for lists published after release? Assumed the latter (no backfill),
   as the email is sent once at publication time.
2. **Data source row** — the PDF footer shows "Data source" only when provenance is known.
   Confirmed as reproduced in Excel; confirm with content design that it belongs above the
   table rather than below it. (Above keeps the data range contiguous — an accessibility
   requirement, §12.)
3. **SIAC/POAC/PAAC Welsh content** — §7.4. Should the Welsh locale fix be pulled into this
   ticket or raised separately? Assumed separate; flagged so it is not mistaken for a
   regression introduced here.
4. **Notify template wording for tribunal lists** — the shared PDF+Excel template body was
   written with SJP in mind. Someone should read the live template and confirm the wording
   reads correctly for a weekly tribunal list before release.
5. **2 MB ceiling** — a large weekly list could push the combined attachment set over the
   Notify limit, and the current behaviour then drops **both** links (no-links template). Is
   silently losing the PDF link acceptable in that case, or should the PDF be linked alone
   when only the Excel is oversized? Current code treats them as a pair; unchanged here.

### Comment by OgechiOkelu on 2026-08-13T11:35:08Z

@plan
