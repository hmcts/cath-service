# Technical Plan — #807: Intellectual Property and Enterprise Court (ChD) Daily Cause List

## 1. Technical Approach

This is a **non-strategic** list type published by uploading a completed Excel
template through the existing CaTH manual-upload journey. It is structurally
identical to the **RCJ Standard Daily Cause List** family: a flat JSON array
where each element is one hearing. There is **no new database model** and **no
new upload journey** — everything routes through the existing artefact upload,
conversion, validation, rendering, PDF and download infrastructure.

The one substantive difference from RCJ is the **field set and column order**:

| Column order (issue) | JSON field | RCJ equivalent |
|----------------------|------------|----------------|
| Judge | `judge` | `judge` |
| Time | `time` | `time` |
| Venue | `venue` | `venue` |
| Type | `type` | `hearingType` *(different)* |
| Case Number | `caseNumber` | `caseNumber` |
| Case Name | `caseName` | `caseDetails` *(different)* |
| Additional Information | `additionalInformation` | `additionalInformation` |

Because `type`/`caseName` differ from RCJ's `hearingType`/`caseDetails`, and the
displayed column order differs, **the RCJ schema, Excel config, model and
template cannot be reused verbatim**. A dedicated `@hmcts/list-types` package is
created, modelled directly on `libs/list-types/rcj-standard-daily-cause-list/`.

### Architecture decisions

- **New lib package**: `libs/list-types/ipec-daily-cause-list/` (mirrors the RCJ
  package layout: `config.ts`, `index.ts`, `conversion/`, `locales/`, `models/`,
  `pdf/`, `rendering/`, `schemas/`, `validation/`).
- **Stable list type name constant**: `IPEC_DAILY_CAUSE_LIST` *(exact seeded
  string to be confirmed — see Open Questions)*. Used everywhere as
  `listTypeName`. **Never** a numeric `listTypeId` (per CLAUDE.md List Type rules).
- **Reference data**: add one entry to `listTypeData` in
  `libs/list-types/common/src/list-type-data.ts`, seeded by
  `libs/location/src/seed-list-types.ts` on upsert. `isNonStrategic: true`,
  `subJurisdictionIds: [1]` (Civil Court under the Civil jurisdiction — matches
  the existing `CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST` entry).
- **Single list type per package** — do not fold into the multi-list RCJ config.
  The page controller can use the simple single-list handler
  (`createSimpleListTypeHandler`) rather than the multi-list guard.
- **Downloads**: PDF via a new generator registered in
  `PDF_GENERATOR_REGISTRY`; Excel download uses the standard artefact Excel
  download path unchanged (the uploaded template is stored and re-served).

## 2. Implementation Details

### 2.1 New package: `libs/list-types/ipec-daily-cause-list/`

Files (modelled on the RCJ package):

```
libs/list-types/ipec-daily-cause-list/
├── package.json                # @hmcts/ipec-daily-cause-list — copy RCJ scripts (build:nunjucks + build:schemas)
├── tsconfig.json               # extends root; declaration + declarationMap
└── src/
    ├── config.ts               # moduleRoot, schemaPath -> schemas/ipec-daily-cause-list.json
    ├── index.ts                # side-effect import of conversion config; exports locale, renderer, pdf, validator, types
    ├── conversion/
    │   ├── ipec-daily-cause-list-config.ts        # dedicated ExcelConverterConfig + registerConverterByName
    │   └── ipec-daily-cause-list-config.test.ts
    ├── locales/
    │   ├── en.ts               # page title, table headers, important-info, search labels, data-source labels
    │   └── cy.ts               # identical key structure; [WELSH TRANSLATION REQUIRED: "..."] markers
    ├── models/
    │   └── types.ts            # IpecHearing / IpecHearingList interfaces (7 fields, issue order)
    ├── pdf/
    │   ├── pdf-generator.ts     # generateIpecDailyCauseListPdf(options)
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    ├── rendering/
    │   ├── renderer.ts          # renderIpecDailyCauseList(hearingList, options) -> RenderedData
    │   └── renderer.test.ts
    ├── schemas/
    │   └── ipec-daily-cause-list.json             # draft-07, type array, items with 7 fields
    └── validation/
        ├── json-validator.ts    # validateIpecDailyCauseList(jsonData) via createJsonValidator(schemaPath)
        └── json-validator.test.ts
```

### 2.2 JSON schema (`schemas/ipec-daily-cause-list.json`)

- `"$schema": "http://json-schema.org/draft-07/schema#"`, `"type": "array"`.
- `items.type: "object"`, `required: ["judge", "time", "venue", "type", "caseNumber", "caseName"]`.
- Properties (declared in issue column order):
  - `judge`, `venue`, `type`, `caseNumber`, `caseName`, `additionalInformation`:
    string with the no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`.
  - `time`: string with pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$`
    (matches "9am", "10:30pm", "2.30pm" — same as RCJ strict time).
  - `additionalInformation` is **optional** (not in `required`).

### 2.3 Excel conversion config (`conversion/ipec-daily-cause-list-config.ts`)

Dedicated `ExcelConverterConfig` (do NOT import `RCJ_EXCEL_CONFIG`). `fields` in
issue column order, each with `validateNoHtmlTags` bound to the correct label;
`time` uses `validateTimeFormat`; `minRows: 1`:

```
Judge (judge, required)  → validateNoHtmlTags "Judge"
Time (time, required)    → validateTimeFormat
Venue (venue, required)  → validateNoHtmlTags "Venue"
Type (type, required)    → validateNoHtmlTags "Type"
Case Number (caseNumber, required)  → validateNoHtmlTags "Case Number"
Case Name (caseName, required)      → validateNoHtmlTags "Case Name"
Additional Information (additionalInformation, optional) → validateNoHtmlTags "Additional Information"
```

Register on module load:
`registerConverterByName("IPEC_DAILY_CAUSE_LIST", createConverter(IPEC_EXCEL_CONFIG));`

> **Confirm** the exact Excel column headers with the court ("Type" vs "Hearing
> type", "Case name" vs "Case details"). The `header` strings must match the
> uploaded template exactly.

### 2.4 Model, renderer, validator

- `models/types.ts`: `IpecHearing` interface with the 7 fields; `IpecHearingList = IpecHearing[]`.
- `rendering/renderer.ts`: `renderIpecDailyCauseList` — build header
  (listTitle, listDate via `formatDisplayDate`, lastUpdated via
  `formatLastUpdatedDateTime`) and `normaliseHearings(hearingList)`. Reuse the
  RCJ `RenderOptions`/`RenderedData` shape.
- `validation/json-validator.ts`: `validateIpecDailyCauseList(jsonData)` wrapping
  `createJsonValidator(schemaPath)`. Export from `index.ts` (MANDATORY — the CI
  guard test `libs/list-types/common/src/validation/guard.test.ts` fails otherwise).

### 2.5 PDF generator + registry

- `pdf/pdf-generator.ts`: `generateIpecDailyCauseListPdf(options)` mirroring the
  RCJ generator; `PdfGenerationOptions` extends `BasePdfGenerationOptions<IpecHearingList>`
  with `contentDate: Date` and `listTypeName: string`. Title from a
  `LIST_TITLE_MAP` keyed by the string name (single entry). `pdf-template.njk`
  renders the 7 columns in issue order.
- Register in `libs/publication/src/processing/service.ts`:
  - import `generateIpecDailyCauseListPdf` + `IpecHearingList`;
  - add to `PDF_GENERATOR_REGISTRY`:
    `IPEC_DAILY_CAUSE_LIST: (p) => generateIpecDailyCauseListPdf({ ...p, jsonData: p.jsonData as IpecHearingList, listTypeName: p.listTypeName ?? "" })`.
  - add `@hmcts/ipec-daily-cause-list` to `libs/publication/package.json` deps.

### 2.6 Page (web) — `apps/web/src/pages/(list-types)/ipec-daily-cause-list/`

```
apps/web/src/pages/(list-types)/ipec-daily-cause-list/
├── index.ts                                  # GET controller via createSimpleListTypeHandler
├── ipec-daily-cause-list.njk                 # style-guide template (7-column table, search box, important info)
└── ipec-daily-cause-list.njk.test.ts         # template structure + Welsh + key parity
```

- `ROUTES = ["/intellectual-property-and-enterprise-court-daily-cause-list"]`
  (auto-discovered; `(list-types)` group adds no URL prefix).
- `GET = createSimpleListTypeHandler<IpecHearingList>({ en, cy, validate, logPrefix, guardArtefact, render })`
  where `validate = createJsonValidator(schemaPath)` and `guardArtefact`/`render`
  come from the single-list guard helper (see `list-type-handler.ts`). The guard
  reads `artefact.listTypeName` — ID-independent.
- Template follows the staging reference page structure: header (court name,
  address, list date, last updated), important-information `details`, case search
  box, then the table with columns **Judge, Time, Venue, Type, Case number,
  Case name, Additional information**.

### 2.7 Registration wiring

- **Root `tsconfig.json`**: add path `"@hmcts/ipec-daily-cause-list": ["libs/list-types/ipec-daily-cause-list/src"]` (and `/config`).
- **`libs/list-types/common/src/list-type-data.ts`**: add the `listTypeData` entry.
- **`libs/publication`**: import + register PDF generator; add dependency.
- No `apps/web/src/app.ts` module-root registration is needed for a list-type
  page unless the package ships assets — confirm against how the RCJ package is
  (not) registered there; RCJ templates live under `apps/web` pages and are
  discovered automatically.

## 3. Error Handling & Edge Cases

Reuse existing upload-error surfacing (GOV.UK error summary, "There is a
problem", inline messages). Cases:

- Missing required column/value → row-referenced error, e.g. "Enter a value for
  Judge in row N."
- Invalid time format → "Enter a valid time in row N, for example 9am, 10:30pm or 2.30pm."
- HTML/script in a cell → blocked by the no-HTML pattern; "Remove HTML tags from [field] in row N."
- Empty file / no data rows → `minRows: 1` fails; "The uploaded file does not contain any hearings."
- Wrong file type → existing upload guard: "The selected file must be an Excel spreadsheet (.xlsx)."
- `additionalInformation` absent → valid (optional).
- Validation is server-side only; the schema pattern blocks embedded HTML.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verified by |
|----------------------|---------------|-------------|
| Created under Business and Property Courts Rolls Building | `listTypeData` entry + seed via `seed-list-types.ts` | reference-data / seed test |
| Linked to Civil jurisdiction & Royal Courts of Justice Group region | `subJurisdictionIds: [1]` (Civil Court, jurisdiction 1) — matches RCJ civil | list-type-data test |
| Fields in listed order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) | schema property order + Excel `fields` order + template column order | validator, converter, template tests |
| Published through Excel upload route as a template | dedicated `ExcelConverterConfig` registered by name; existing upload journey | converter test, E2E |
| PDF + Excel downloadable version | new PDF generator in `PDF_GENERATOR_REGISTRY`; standard Excel download path | pdf-generator test, E2E |
| Validation schema + style guide created | `schemas/ipec-daily-cause-list.json` + validator; `.njk` style-guide page | validator + template tests |
| Style guide follows staging reference structure | template mirrors reference page (header/important-info/search/table) | template test, visual review |
| JSON matches issue format | schema fields exactly `judge,time,venue,type,caseNumber,caseName,additionalInformation` | validator test (fixture = issue example) |

## 5. Testing

Follow CLAUDE.md + `.claude/rules/testing.md`:

- **Validator** (`json-validator.test.ts`): real schema, no mocks. Valid fixture
  = the issue's two-object example. One `it` per required field (`judge`, `time`,
  `venue`, `type`, `caseNumber`, `caseName`) proving each is individually
  enforced; `additionalInformation` absent still valid; invalid `time` fails.
  Deep-clone with `JSON.parse(JSON.stringify(...))`.
- **Converter** (`*-config.test.ts`): well-formed sheet → JSON array in correct
  field order; missing required column, invalid time, HTML-in-cell each raise a
  row-referenced error; `minRows` enforced.
- **Renderer**: maps metadata + hearings into the view model in correct column order.
- **PDF generator**: produces a PDF for a valid list; titled for the list type name.
- **Page controller** (`index.test.ts`): renders for matching `listTypeName`;
  returns the common error page when it does not match — fixture uses arbitrary
  `listTypeId: 999` to prove ID-independence.
- **Template** (`*.njk.test.ts`): headings, location block, important-info
  details, search box, table headers in order; Welsh headings under `cy`;
  `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`.
- **E2E** (`e2e-tests/`, `@nightly`): open a published IPEC list → verify header,
  columns and a hearing row → switch to Welsh → Axe accessibility check →
  download PDF and Excel. One journey test.

## 6. Accessibility (WCAG 2.2 AA)

`<title>` matches `<h1>`; single `<h1>`; section headings at `<h2>`/details; table
uses `<thead>`, `<th scope="col">`, `aria-label` of the list title; search input
has an associated (visually-hidden) label; table present without JS (progressive
enhancement); descriptive download link text; logical tab order; Welsh page
passes the same checks; Axe inline in the E2E journey.

## 7. Open Questions — CLARIFICATIONS NEEDED

1. **Exact list-type name string**: is the stable seeded name
   `IPEC_DAILY_CAUSE_LIST` or `INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST`?
   This constant is used for all guards, converter registration and the PDF
   registry key and must exactly match what the reference-data owner seeds.
2. **`subJurisdictionIds`**: plan assumes `[1]` (Civil Court, jurisdiction 1),
   matching `CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST`. Confirm this correctly represents
   "Business and Property Courts Rolls Building" under Civil / Royal Courts of
   Justice Group — is a new/different sub-jurisdiction required, or is the
   Rolls Building association purely a location grouping rather than a
   sub-jurisdiction?
3. **Excel template column headers**: exact header strings ("Type" vs "Hearing
   type"; "Case name" vs "Case details") — the converter `header` values must
   match the distributed template byte-for-byte.
4. **Court address & IPEC media-contact block**: the Rolls Building address lines
   and the media-enquiries contact text for the important-information section
   need to be supplied by the court (placeholders used until confirmed).
5. **Welsh translations**: official Welsh for page title, table headers,
   important-information paragraphs, search labels, error messages, and the
   `welshFriendlyName`. Marked `[WELSH TRANSLATION REQUIRED: "..."]` until provided.
6. **Default sensitivity**: assumed `Public` (consistent with the RCJ family) —
   confirm.
7. **Time format**: assumed 12-hour am/pm with optional minutes
   (`^\d{1,2}([:.]\d{2})?[ap]m\s*$`); the issue examples "9am"/"10:30pm" fit.
   Confirm no other formats (e.g. 24-hour, "Not before") are expected.
8. **Excel download**: assumed the standard artefact Excel download applies with
   no bespoke styling. Confirm.
