# Technical Plan: #798 Interim Applications List (ChD) Daily Cause List

Non-strategic list type published via Excel upload in CaTH: convert a two-tab
workbook to JSON, validate it against a schema, store as an artefact, render the
public page and produce PDF + Excel downloads.

Follow the standard non-strategic list-type structure and registration approach.
The distinctive aspect of #798 is the schema — a two-tab object with an
open-justice statement — and the resulting extra renderer/PDF handling of the
editable "Important information" paragraph.

## 1. Technical Approach

This is a **non-strategic** list type. Follow the standard non-strategic
list-type structure, file layout, and registration touchpoints. The distinctive
aspect is the schema (see below): #798 is a two-tab object with hearings plus an
open-justice statement.

**Inline the shared hearing pieces locally, sourcing utilities from
`@hmcts/list-types-common`.** The `hearingList` item shape (`judge`, `time`,
`venue`, `type`, `caseNumber`, `caseName`, `additionalInformation` — **all
required**) is defined locally in this lib; the shared date/validation/PDF/email
utilities come from `@hmcts/list-types-common`:

| Concern | Source |
|---------|--------|
| Tab 1 hearing field config | local `INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG` — the 7 required hearing keys, using `validateNoHtmlTags` + `validateTimeFormatSimple` |
| Hearing type | local `InterimApplicationHearing` (`src/models/types.ts`) |
| Hearings rendering | local renderer using `formatDisplayDate` / `formatLastUpdatedDateTime` (`@hmcts/list-types-common`) |
| Email case-summary | local `extractCaseSummary` + `formatCaseSummaryForEmail`, `SPECIAL_CATEGORY_DATA_WARNING` (`@hmcts/list-types-common`) |
| Two-tab Excel → JSON conversion | `createMultiSheetConverter` (`@hmcts/list-types-common`, as in `court-of-appeal-civil-daily-cause-list`) |
| Converter registration | `registerConverterByName` (`@hmcts/list-types-common`) |
| Field validators | `validateTimeFormatSimple`, `validateNoHtmlTags` (`@hmcts/list-types-common`) |
| Page controller / render helper | `createSimpleListTypeHandler`, `resolveDataSource` (`apps/web/src/pages/(list-types)/list-type-handler.ts`) |
| PDF generation | `generatePdfFromHtml`, `savePdfToStorage`, `loadTranslations`, `configureNunjucks`, `PDF_BASE_STYLES`, `createPdfErrorResult` (`@hmcts/list-types-common`) + `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`) |
| List-type reference data | `libs/list-types/common/src/list-type-data.ts` |
| Email builder registry | `EMAIL_BUILDER_REGISTRY` (`libs/notifications/src/notification/notification-service.ts`) |

### Authoritative schema source

The JSON schema is defined upstream in pip-data-management and is the definitive
contract. It is registered in
`src/main/resources/application.yaml` under
`validations.validation-schemas`:

```
INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST: "schemas/non-strategic/interim_applications_chancery_division_daily_cause_list.json"
```

**Port the upstream schema exactly** into
`libs/list-types/interim-applications-chd-daily-cause-list/src/schemas/interim-applications-chd-daily-cause-list.json`
(only the filename/kebab-case differs). Do not hand-author the schema from the
sample JSON — copy the upstream schema so CaTH validation matches
pip-data-management byte-for-byte.

### Key technical decisions

1. **JSON shape (root object, two arrays) — confirmed against the upstream schema.**
   The schema root is an **object** (`type: "object"`) with both arrays
   `required`:
   - `hearingList[]` — item `required`: `judge`, `time`, `venue`, `type`,
     `caseNumber`, `caseName`, **and `additionalInformation`**. All SEVEN fields
     are required per the upstream schema — `additionalInformation` is **not**
     optional (this corrects both the earlier @spec and the first draft of this
     plan).
   - `openJusticeStatementDetails[]` — item `required`: `nameToBeDisplayed`,
     `email`. The array must be present but has **no `minItems`**, so it may be
     empty (resolves CLARIFICATION 5 — see below).

   The Tab 1 hearing keys (`judge`, `time`, `venue`, `type`, `caseNumber`,
   `caseName`, `additionalInformation`, all required) are defined locally in
   `INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG`.

   Text fields use the no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`; `time`
   uses `^\d{1,2}([:.]\d{2})?[ap]m\s*$`. Note the schema applies **no** email
   format check to `email` beyond the no-HTML pattern.

2. **`openJusticeStatementDetails` is the one genuinely new pattern.** No existing
   ChD list type has a second tab. So #798 adds:
   - a **two-tab converter** (`createMultiSheetConverter`) wrapping the local
     hearings config for Tab 1 plus a small new Tab 2 config
     (`nameToBeDisplayed`, `email`),
   - an **object-root schema + validator** (`type: object`, both arrays required),
   - a **renderer** that renders `data.hearingList` and additionally builds the
     editable "Important information" first paragraph from
     `openJusticeStatementDetails[0]` (name + email), so that paragraph changes
     per upload with no code change (AC 3).

3. **Time format.** VERIFIED: `TIME_PATTERN = /^(\d{1,2})([:.]\d{2})?\s*[ap]m\s*$/i`
   accepts `"10.30am"` (dot). `validateTimeFormatSimple` and the schema pattern
   `^\d{1,2}([:.]\d{2})?[ap]m\s*$` both accept it. No new validator needed.

4. **Location reference data ALREADY EXISTS.** VERIFIED: the @plan comment is now
   out of date. `libs/location/src/location-data.ts` contains
   `locationId: 26, name: "Business and Property Courts Rolls Building"`,
   `regions: [11]` ("Royal Courts of Justice Group"),
   `subJurisdictions: [10]` ("High Court", jurisdictionId 1 = Civil). No
   location change is required; the list type attaches via `subJurisdictionIds: [10]`.

5. **Never use `listTypeId`.** All guards/registrations key on the stable
   `listTypeName` string `"INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST"`.

## 2. Implementation Details

### TEMPLATE SOURCE (recorded verbatim)

> migrate from pip-frontend interim-applications-chd-daily-cause-list

The `/implement` step runs the migrate-pip-pages skill against this source to
fetch and adapt the upstream style guide/template. The fetch/adapt/verify steps
are intentionally not reproduced here.

### New lib: `libs/list-types/interim-applications-chd-daily-cause-list/`

Use the standard non-strategic list-type lib layout. The hearing config, hearing
type, hearings renderer, and email-summary helpers are defined locally in this
lib (sourcing shared utilities from `@hmcts/list-types-common`); this lib adds the
two-tab converter, the object-root schema+validator, the open-justice-aware
renderer, the PDF generator, and locales.

```
libs/list-types/interim-applications-chd-daily-cause-list/
├── package.json                 # @hmcts/interim-applications-chd-daily-cause-list; deps: @hmcts/list-types-common, @hmcts/pdf-generation, @hmcts/postgres-prisma
├── tsconfig.json                # extends root; declaration + declarationMap
└── src/
    ├── config.ts                # moduleRoot, assets, schemaPath (points at this lib's own object-root schema)
    ├── index.ts                 # side-effect converter import; export hearing type + email helpers, validator (validateInterimApplicationsChdDailyCauseList), renderer, pdf, locales
    ├── conversion/
    │   ├── interim-applications-chd-daily-cause-list-config.ts   # createMultiSheetConverter(local hearings config for tab1 + OPEN_JUSTICE_CONFIG for tab2); registerConverterByName
    │   └── interim-applications-chd-daily-cause-list-config.test.ts
    ├── models/
    │   └── types.ts             # InterimApplicationsChdData { hearingList: InterimApplicationHearing[]; openJusticeStatementDetails: OpenJusticeStatementDetail[] }; InterimApplicationHearing; OpenJusticeStatementDetail
    ├── rendering/
    │   ├── renderer.ts          # renders data.hearingList + builds importantInfo editable paragraph from openJusticeStatementDetails[0]
    │   └── renderer.test.ts
    ├── validation/
    │   ├── json-validator.ts    # validateInterimApplicationsChdDailyCauseList via createJsonValidator(schemaPath)
    │   └── json-validator.test.ts
    ├── email-summary/
    │   └── summary-builder.ts    # object-shaped extractCaseSummary reading data.hearingList; re-exports formatCaseSummaryForEmail + SPECIAL_CATEGORY_DATA_WARNING
    ├── schemas/
    │   └── interim-applications-chd-daily-cause-list.json        # ported verbatim from the upstream pip-data-management schema (object root)
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    └── pdf/
        ├── pdf-generator.ts     # generateInterimApplicationsChdDailyCauseListPdf
        ├── pdf-generator.test.ts
        └── pdf-template.njk
```

Because #798's JSON is an object (`data.hearingList`) rather than a root array,
its `extractCaseSummary` reads `data.hearingList`; `formatCaseSummaryForEmail` and
`SPECIAL_CATEGORY_DATA_WARNING` come from `@hmcts/list-types-common`.

`index.ts`, e.g.:

```ts
import "./conversion/interim-applications-chd-daily-cause-list-config.js"; // register converter on load
export { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./email-summary/summary-builder.js";
export { validateInterimApplicationsChdDailyCauseList } from "./validation/json-validator.js";
export type { InterimApplicationHearing, InterimApplicationsChdData, OpenJusticeStatementDetail } from "./models/types.js";
export { cy as interimApplicationsChdDailyCauseListCy } from "./locales/cy.js";
export { en as interimApplicationsChdDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```


### Page (in apps, per CLAUDE.md)

```
apps/web/src/pages/(list-types)/interim-applications-chd-daily-cause-list/
├── index.ts                     # createSimpleListTypeHandler + ROUTES + guard on listTypeName
├── interim-applications-chd-daily-cause-list.njk
├── index.test.ts
└── interim-applications-chd-daily-cause-list.njk.test.ts
```

### JSON shape (schema `type: "object"`)

```jsonc
{
  "hearingList": [
    { "judge": "...", "time": "10.30am", "venue": "...", "type": "...",
      "caseNumber": "...", "caseName": "...", "additionalInformation": "..." }
  ],
  "openJusticeStatementDetails": [
    { "nameToBeDisplayed": "...", "email": "..." }
  ]
}
```

Schema (ported verbatim from the upstream pip-data-management schema):
- Root `required`: `hearingList`, `openJusticeStatementDetails` (both arrays).
- `hearingList[].required`: `judge`, `time`, `venue`, `type`, `caseNumber`,
  `caseName`, `additionalInformation` — **all seven required**.
- `openJusticeStatementDetails[].required`: `nameToBeDisplayed`, `email`. No
  `minItems` — the array may be empty.
- `time` pattern: `^\d{1,2}([:.]\d{2})?[ap]m\s*$`.
- Text fields: no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`.

### Converter config (`conversion/...-config.ts`)

Tab 1 uses the local `INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG` (its 7 required
fields with `validateNoHtmlTags` + `validateTimeFormatSimple`). Tab 2 has its own
config. Use `createMultiSheetConverter` (as in
`court-of-appeal-civil-daily-cause-list-config.ts`):

- Tab 1 "hearings" → `dataKey: "hearingList"`,
  `config: INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG`. Note `additionalInformation`
  is required in the schema; the converter emits the key with an empty string for
  present-but-blank cells rather than omitting it, so validation passes.
- Tab 2 "open justice" → `dataKey: "openJusticeStatementDetails"`, new
  `OPEN_JUSTICE_CONFIG`: `Name to be displayed`→`nameToBeDisplayed`,
  `Email`→`email` (both required, `validateNoHtmlTags`).

```ts
import { createMultiSheetConverter, registerConverterByName, type ExcelConverterConfig, validateNoHtmlTags, validateTimeFormatSimple } from "@hmcts/list-types-common";

const INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Judge", r)] },
    { header: "Time", fieldName: "time", required: true, validators: [(v, r) => validateTimeFormatSimple(v, r)] },
    { header: "Venue", fieldName: "venue", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Type", fieldName: "type", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Type", r)] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Number", r)] },
    { header: "Case Name", fieldName: "caseName", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)] }
  ],
  minRows: 1
};

const OPEN_JUSTICE_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Name to be displayed", fieldName: "nameToBeDisplayed", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Name to be displayed", r)] },
    { header: "Email", fieldName: "email", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Email", r)] }
  ],
  minRows: 0
};

const convertInterimApplicationsChdExcel = (buffer: Buffer) =>
  createMultiSheetConverter(buffer, [
    { worksheetName: "Hearing List", worksheetIndex: 0, dataKey: "hearingList", config: INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG },
    { worksheetName: "Open Justice Statement Details", worksheetIndex: 1, dataKey: "openJusticeStatementDetails", config: OPEN_JUSTICE_CONFIG }
  ]);

registerConverterByName("INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST", {
  config: INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG,
  convertExcelToJson: convertInterimApplicationsChdExcel as any
});
```
The `worksheetName` values (`"Hearing List"` / `"Open Justice Statement Details"`)
match the sample workbook; `worksheetIndex` fallback (0/1) covers unknown names.

### Validator (`validation/json-validator.ts`)

```ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateInterimApplicationsChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```
Exported from `index.ts` (satisfies the CI guard in
`libs/list-types/common/src/validation/guard.test.ts`).

### Renderer (`rendering/renderer.ts`)

Renders the hearings and adds the open-justice paragraph.
`renderInterimApplicationsChdDailyCauseList(data, options)`
returns `{ header, hearings, importantInfo }` where:
- `header`/`hearings`: built from `data.hearingList` using `formatDisplayDate` /
  `formatLastUpdatedDateTime` and `t.pageTitle` as the list title.
- `importantInfo.editableParagraph`: built from
  `data.openJusticeStatementDetails[0]` (`nameToBeDisplayed` + `email`) using a
  locale template; when the array is empty, fall back to static text only
  (CLARIFICATION 5 — schema allows empty).
- `importantInfo.staticParagraphs`: static wording from locale (CLARIFICATION 6).

### Page controller (`index.ts`)

Use the standard non-strategic list-type controller. `createSimpleListTypeHandler<InterimApplicationsChdData>`:
- `validate = validateInterimApplicationsChdDailyCauseList` (this lib's own
  object-root validator).
- `guardArtefact`: reject when
  `artefact.listTypeName !== "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST"` →
  400 `errors/common`.
- `render`: call the renderer, resolve `dataSource` via `resolveDataSource`, render
  the njk template with `en, cy, t, title: header.listTitle, header, hearings, importantInfo, dataSource`.
- Route auto-discovered from the page directory (exports only `GET` — no explicit
  `ROUTES` needed).

### PDF generator (`pdf/pdf-generator.ts`)

Use the standard non-strategic `pdf-generator.ts` structure.
`generateInterimApplicationsChdDailyCauseListPdf(options)`:
- call this lib's renderer, `loadTranslations(locale, () => import("../locales/en.js"), () => import("../locales/cy.js"))`,
  resolve `PROVENANCE_LABELS[provenance]`, `configureNunjucks(__dirname)`, render
  `pdf-template.njk` with `{ header, hearings, importantInfo, dataSource, t, pdfStyles: PDF_BASE_STYLES }`,
  `generatePdfFromHtml`, `savePdfToStorage`, `createPdfErrorResult` on failure.
- Interface extends `BasePdfGenerationOptions<InterimApplicationsChdData>` with
  `contentDate: Date`. No numeric `listTypeId`.
- The PDF template must additionally render the Important-information block
  (editable paragraph + static text), which single-tab list templates do not have.

### Registration touchpoints

All touchpoints are the standard non-strategic list-type registration points.

1. `libs/list-types/common/src/list-type-data.ts` — add (include
   `shortenedFriendlyName`):
   ```ts
   {
     name: "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Interim Applications List (ChD) Daily Cause List",
     welshFriendlyName: "[WELSH TRANSLATION REQUIRED]",
     shortenedFriendlyName: "Interim Applications List (ChD) Daily Cause List",
     provenance: "CFT_IDAM",
     urlPath: "interim-applications-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [10]
   }
   ```
   (Reference data auto-seeds all environments via the generated seed SQL — do
   not hand-write `.sql`. Location 26 already exists and already lists
   `subJurisdictions: [10]`, so no `location-data.ts` change is required.)
2. `libs/publication/src/processing/service.ts` — import the PDF generator + type,
   add `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST: (p) => generateInterimApplicationsChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as InterimApplicationsChdData })`
   to `PDF_GENERATOR_REGISTRY`.
3. `libs/notifications/src/notification/notification-service.ts` — import
   `extractCaseSummary`/`formatCaseSummaryForEmail` from the new lib and add
   `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST: { extract, format }` to
   `EMAIL_BUILDER_REGISTRY`. Add the workspace dep to
   `libs/notifications/package.json`.
4. `libs/publication/package.json`, `apps/web/package.json`, and
   `libs/notifications/package.json` — add
   `"@hmcts/interim-applications-chd-daily-cause-list": "workspace:*"`. The new lib's
   own `package.json` depends only on `@hmcts/list-types-common`,
   `@hmcts/pdf-generation` and `@hmcts/postgres-prisma`.
5. Root `tsconfig.json` `paths` — add
   `"@hmcts/interim-applications-chd-daily-cause-list": ["libs/list-types/interim-applications-chd-daily-cause-list/src"]`.
6. `apps/web/src/app.ts` — import `moduleRoot as interimApplicationsChdModuleRoot`
   from `.../config` and add to `modulePaths`.
7. **Both** upload pages get the side-effect converter import:
   - `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`
   - `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`
   each add `import "@hmcts/interim-applications-chd-daily-cause-list";`.
8. No `apps/web/vite.build.ts` change unless the lib ships `assets/` (London
   Administrative Court ships none — likely not required here).

### Excel download

The original uploaded workbook is stored and served by the existing
non-strategic download route (same as other non-strategic lists). No new Excel-generation
code needed — AC "Excel downloadable version" is satisfied by the existing store
+ download infrastructure.

## 3. Error Handling & Edge Cases

Conversion errors surface on the upload path with row-referenced messages;
validation errors surface both at upload and at render (`createSimpleListTypeHandler`
returns 400 `errors/common` on `validationResult.isValid === false`).

- **Missing required Tab 1 column/value** → converter throws
  `"Missing required field 'X' in row N"`; no artefact created.
- **Malformed time** (e.g. `10:3pm`, `25:00`) → `validateTimeFormatSimple` throws
  `Invalid time format '...' in row N`. `"10.30am"` is valid.
- **HTML tags in any text field** → `validateNoHtmlTags` throws with field + row.
- **Missing Tab 2 sheet** → `createMultiSheetConverter` falls back to
  `worksheetIndex` then to `[]`; renderer degrades to static Important-information
  text (pending CLARIFICATION 5 on whether `minItems: 1` should hard-fail).
- **Empty sheets** → `minRows: 0` allows an empty `hearingList`; the template
  shows the `noHearingsMessage`.
- **Missing/invalid `artefactId`, artefact not found, blob missing, access
  denied** → handled by `createSimpleListTypeHandler` (400/404/403) and logged
  with `logPrefix`.
- **Schema mismatch at render** (blob doesn't match schema) → 400 `errors/common`.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|----|---------------|--------------|
| Registered under Business and Property Courts (Rolls Building), Civil jurisdiction, RCJ Group region, `isNonStrategic` | `list-type-data.ts` entry `subJurisdictionIds: [10]` (High Court → Civil); location 26 already region 11 | Unit: list-type-data entry present; manual: appears under location 26 on upload |
| Published via Excel upload, converted to JSON | Converter registered via `registerConverterByName`; side-effect import on upload-summary page | Converter unit test (two-tab → object with both arrays) |
| Two tabs; Tab 1 fields Judge/Time/Venue/Type/Case Number/Case Name/Additional Information; Tab 2 judge name + email editable per upload | Custom Tab 1 config + Tab 2 config; renderer builds editable first paragraph from `openJusticeStatementDetails[0]` | Converter test asserts key mapping; renderer test asserts editable paragraph reflects Tab 2 |
| Validation schema + style guide created | `schemas/*.json` + validator + template migrated from pip-frontend | Validator test (per-field), template test (structure) |
| PDF + Excel downloads | PDF generator + `PDF_GENERATOR_REGISTRY`; Excel via existing store/download | PDF generator test; manual download check |
| Style guide format matches staging | Template migrated from pip-frontend source | njk template test (headings, table, important-info, search) |
| JSON matches pip-data-management format | `hearingList[]` + `openJusticeStatementDetails[]` with confirmed keys | Validator test against fully-hydrated fixture |
| Welsh support | `cy.ts` mirrors `en.ts`; `?lng=cy` | Template test in `cy`; locale-key parity test |

## 5. CLARIFICATIONS NEEDED

1. **JSON key names.** Confirm the plan's use of the confirmed upstream keys
   `hearingList[]` (`judge`,`time`,`venue`,`type`,`caseNumber`,`caseName`,
   `additionalInformation`) and `openJusticeStatementDetails[]`
   (`nameToBeDisplayed`,`email`) — this supersedes the earlier @spec
   (`hearings`/`judgeDetails`/`judgeName`/`judgeEmail`).

2. **Location / region reference data.** RESOLVED —
   `Business and Property Courts Rolls Building` (locationId 26, region 11
   "Royal Courts of Justice Group", subJurisdiction 10) already exists in
   `location-data.ts`. #798 attaches via `subJurisdictionIds: [10]` and requires
   **no** `location-data.ts` change. Confirm only that Interim Applications should
   attach to location 26.

3. **Sample workbook sheet names & column headers.** The exact Tab 1 / Tab 2
   sheet names and header-row text from the attached
   `interimApplicationsChanceryDivisionDailyCauseList.xlsx` are needed for the
   `worksheetName` values and header→field mapping (index fallback exists, exact
   names preferred).

4. **Time format.** RESOLVED — `validateTimeFormatSimple` and the schema pattern
   both accept `"10.30am"` (dot). No change required; confirm no colon-only
   variant is expected.

5. **Is Tab 2 (open justice) mandatory per upload?** RESOLVED by the upstream
   schema — `openJusticeStatementDetails` is a **required array with no
   `minItems`**, so it must be present but may be empty. The renderer therefore
   falls back to static Important-information text when the array is empty. Keep
   the ported schema as-is (do not add `minItems: 1`) so CaTH matches
   pip-data-management. Confirm only that the empty-array fallback behaviour on
   the render page is the desired UX.

6. **Static "Important information" wording.** The exact static paragraph(s)
   following the editable judge paragraph, plus the editable-paragraph template
   wording, must be lifted verbatim from the staging style guide. Please provide.

7. **Welsh translations.** `welshFriendlyName` for `list-type-data.ts` and all
   `cy.ts` strings need real translations (marked `[WELSH TRANSLATION REQUIRED]`
   until provided).
