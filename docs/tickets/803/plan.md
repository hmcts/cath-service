# Technical Plan — #803 Companies Winding Up (ChD) Daily Cause List

## 1. Technical Approach

A **non-strategic** list type published through the manual Excel-upload route:
uploaded `.xlsx` → parsed and row-validated → converted to a JSON array →
validated against a JSON schema → stored as an artefact → rendered as an
accessible web page and downloadable as PDF (and the source Excel).

**Reference pattern:** `libs/list-types/court-of-appeal-civil-daily-cause-list/`
is the closest **single-variant** analogue (one list, one flat table of
hearings, `createSimpleListTypeHandler` controller). Follow it rather than the
RCJ multi-list module (`createMultiListGuardAndRender`), which only earns its
complexity when one controller serves several list variants — here there is one.

**Key divergence from existing RCJ configs.** The issue mandates the field set
and order `Judge, Time, Venue, Type, Case Number, Case Name, Additional
Information`. The shared RCJ config (`RCJ_EXCEL_CONFIG` /
`RCJ_EXCEL_CONFIG_SIMPLE_TIME`) uses different field names (`caseDetails`,
`hearingType`) and a different order (`Venue, Judge, Time, ...`). Therefore this
list **cannot reuse the shared RCJ config** and needs its own module, schema,
Excel converter config, model type, renderer, PDF template and page template.

**Stable naming rule (CLAUDE.md):** route and register everything by the
`@unique` string `listTypeName` — `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` —
never by numeric `listTypeId`.

## 2. Implementation Details

### 2.1 New module: `libs/list-types/companies-winding-up-chd-daily-cause-list/`

```
package.json                # @hmcts/companies-winding-up-chd-daily-cause-list
tsconfig.json
src/
  config.ts                 # moduleRoot, assets, schemaPath
  index.ts                  # exports + side-effect import of conversion (registers converter)
  models/types.ts           # CompaniesWindingUpHearing, CompaniesWindingUpData
  schemas/
    companies-winding-up-chd-daily-cause-list.json
  validation/
    json-validator.ts       # validateCompaniesWindingUpChdDailyCauseList
    json-validator.test.ts
  conversion/
    companies-winding-up-chd-daily-cause-list-config.ts        # Excel config + registerConverterByName
    companies-winding-up-chd-daily-cause-list-config.test.ts
  rendering/
    renderer.ts             # renderCompaniesWindingUpChd
    renderer.test.ts
  pdf/
    pdf-generator.ts        # generateCompaniesWindingUpChdDailyCauseListPdf
    pdf-generator.test.ts
    pdf-template.njk
  locales/
    en.ts
    cy.ts
```

Mirror `court-of-appeal-civil-daily-cause-list`'s `package.json` exports
(`.` and `./config`), `tsconfig.json`, and `config.ts`. Register the path
`@hmcts/companies-winding-up-chd-daily-cause-list` in the root `tsconfig.json`
`paths`.

**Data model** (`src/models/types.ts`):
```typescript
export interface CompaniesWindingUpHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}
export type CompaniesWindingUpData = CompaniesWindingUpHearing[];
```

`index.ts` (mirroring court-of-appeal-civil):
```typescript
import "./conversion/companies-winding-up-chd-daily-cause-list-config.js"; // register converter on load
export { cy as companiesWindingUpChdDailyCauseListCy } from "./locales/cy.js";
export { en as companiesWindingUpChdDailyCauseListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateCompaniesWindingUpChdDailyCauseList } from "./validation/json-validator.js";
```

### 2.2 New page: `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/`

```
index.ts                                          # GET via createSimpleListTypeHandler
companies-winding-up-chd-daily-cause-list.njk     # template
index.test.ts
companies-winding-up-chd-daily-cause-list.njk.test.ts
```

Controller mirrors `court-of-appeal-civil-daily-cause-list/index.ts`:
`ROUTES = ["/companies-winding-up-chd-daily-cause-list"]`, `SUPPORTED_LIST_TYPE
= "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST"`, guard on `listTypeName`, render
via `renderCompaniesWindingUpChd`, resolve `dataSource` via `resolveDataSource`.

### 2.3 Existing files to edit (registration touch-points)

1. **`libs/list-types/common/src/list-type-data.ts`** — add the `ListTypeData`
   entry:
   ```typescript
   {
     name: "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Companies Winding Up (ChD) Daily Cause List",
     welshFriendlyName: "Companies Winding Up (ChD) Daily Cause List", // [WELSH TRANSLATION REQUIRED]
     provenance: "CFT_IDAM",
     urlPath: "companies-winding-up-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     shortenedFriendlyName: "Companies Winding Up (ChD) Daily Cause List",
     subJurisdictionIds: [1]  // Civil Court
   }
   ```
   Update `list-type-data.test.ts` count/assertions if present.

2. **`libs/publication/src/processing/service.ts`** — add to
   `PDF_GENERATOR_REGISTRY` keyed by the list type name:
   ```typescript
   COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST: (p) =>
     generateCompaniesWindingUpChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as CompaniesWindingUpData }),
   ```
   Import the generator + type from the new package. (Excel download is served
   from the stored source upload — see open question §5.4 — so no
   `EXCEL_GENERATOR_REGISTRY` entry is expected.)

3. **`apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`** — add an
   upsert row for `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (Public, CFT_IDAM,
   `is_non_strategic = true`, url `companies-winding-up-chd-daily-cause-list`).

4. **`apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`**
   — add mapping `('COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST', 1)` (Civil
   Court) in the `list_types_sub_jurisdictions` VALUES list.

5. **Root `tsconfig.json`** — add the `paths` entry for the new package.

6. **App registration** — verify whether `(list-types)` pages need the module
   root added to `apps/web/src/app.ts` `modulePaths` / vite assets. Check how
   `court-of-appeal-civil` is wired; if list-type page templates live under
   `apps/web/src/pages` they are auto-discovered and only the lib PDF template
   dir may need registering. Follow the sibling exactly.

### 2.4 Excel converter config

```typescript
export const COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge",  fieldName: "judge",  required: true,  validators: [(v, r) => validateNoHtmlTags(v, "Judge", r)] },
    { header: "Time",   fieldName: "time",   required: true,  validators: [validateTimeFormatSimple] },
    { header: "Venue",  fieldName: "venue",  required: true,  validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Type",   fieldName: "type",   required: true,  validators: [(v, r) => validateNoHtmlTags(v, "Type", r)] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Number", r)] },
    { header: "Case Name",   fieldName: "caseName",   required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: false, validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)] }
  ],
  minRows: 1
};

registerConverterByName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST", createConverter(COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG));
```
Use `validateTimeFormatSimple` (matches the simple-time RCJ variant and accepts
the issue examples `9am`, `10:30pm`). Confirm the exact validator helpers by
reading `@hmcts/list-types-common` before implementing.

### 2.5 JSON schema (`src/schemas/companies-winding-up-chd-daily-cause-list.json`)

Draft-07, root `type: "array"`, item required
`["judge","time","venue","type","caseNumber","caseName"]`,
`additionalInformation` optional. Fields declared in the issue order. Text fields
use the no-HTML pattern used by sibling schemas; `time` uses the shared
time-format pattern. Copy the exact patterns from
`court-of-appeal-civil-daily-cause-list.json` to stay consistent.

### 2.6 Validator wrapper (mandatory per CLAUDE.md list-type rule 6)

```typescript
// src/validation/json-validator.ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateCompaniesWindingUpChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```
Exported from `index.ts`. The CI guard test in
`libs/list-types/common/src/validation/guard.test.ts` fails if the schema ships
without this export.

### 2.7 Renderer, PDF, template, locales

- **Renderer**: `renderCompaniesWindingUpChd(data, { locale, contentDate,
  lastReceivedDate })` → `{ header: { listTitle, listDate, lastUpdatedDate,
  lastUpdatedTime }, hearings }`. Use `formatDisplayDate`,
  `formatLastUpdatedDateTime`, `normaliseHearings`/`normalizeTime` from common.
  `listTitle` localised (EN/CY) as in the court-of-appeal renderer.
- **PDF**: `generateCompaniesWindingUpChdDailyCauseListPdf` + `pdf-template.njk`,
  mirroring the court-of-appeal PDF generator; `listTypeName`-keyed title map.
- **Template**: `base-template.njk`; `<h1>` page title, court address block,
  "List for"/"Last updated" lines, `govukDetails` important-information block,
  hidden-label search input (JS-enhanced filter), `govuk-table` with the seven
  columns in order, data-source line, PDF/Excel download links, back-to-top.
  Match the reference style guide structure.
- **Locales**: `en.ts` / `cy.ts` with identical key structure. All Welsh values
  not yet translated wrapped as `[WELSH TRANSLATION REQUIRED: "..."]`. Court
  address / important-information copy taken from the reference style guide.

## 3. Error Handling & Edge Cases

| Condition | Behaviour |
|-----------|-----------|
| Required column missing | Upload rejected; error names the missing header |
| Required cell empty | Rejected; error names field + row number |
| HTML tags in a text cell | Rejected via `validateNoHtmlTags` (field + row) |
| Invalid time format | Rejected via time validator (row) |
| No data rows (`minRows: 1`) | Rejected — "no hearings" |
| JSON fails schema | Processing fails with generic template-mismatch error |
| Wrong `listTypeName` routed to page | Guard returns 400 + `errors/common` |
| Missing/absent `additionalInformation` | Allowed; renders empty cell |

All admin-facing error copy needs Welsh equivalents.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| Created under Business & Property Courts Rolls Building, Civil jurisdiction, RCJ Group region | `list-type-data.ts` entry + SQL scripts 001/003 linking to Civil Court (sub-jurisdiction 1) | Seed scripts + list-type-data test |
| Fields in listed order in schema | Schema `required` + property order; Excel config field order | `json-validator.test.ts`, converter test |
| Published via Excel upload, converted to JSON | Converter registered by name; `createConverter` pipeline | Converter unit test |
| Validation schema + style guide created | Schema + validator wrapper; web template matching reference | Validator + template tests, E2E |
| PDF and Excel downloadable | PDF generator registered in `PDF_GENERATOR_REGISTRY`; Excel = stored source upload | PDF generator test, E2E download check |
| Style guide matches reference URL | Template + locales built to the reference structure | `*.njk.test.ts`, E2E |
| JSON format matches issue | Model type + converter output shape | Converter test asserting exact shape/order |

## 5. Open Questions (CLARIFICATIONS NEEDED)

1. **Own module vs. shared config** — Confirmed approach is a **dedicated
   module** because the field set/order differs from `RCJ_EXCEL_CONFIG`. Confirm
   this is acceptable rather than extending a shared config.
2. **Court address & "Important information" copy** — exact wording for the
   Business and Property Courts Rolls Building and the important-information
   text must come from the reference style guide
   (`.../companies-winding-up-chd-daily-cause-list?artefactId=171f1390-...`).
   Please confirm the authoritative content (and Welsh translations).
3. **Provenance / sensitivity** — assumed `CFT_IDAM`, `Public`,
   `isNonStrategic: true` (matching sibling non-strategic RCJ lists). Confirm
   the correct provenance for the manual Excel-upload route.
4. **"Excel downloadable version"** — assumed to be the **original uploaded
   Excel** served from the existing publication download route (no
   `EXCEL_GENERATOR_REGISTRY` entry, which is currently only used to *generate*
   Excel for API-sourced SJP lists). Confirm a regenerated/standardised Excel is
   not required.
5. **Sub-jurisdiction** — assumed `Civil Court` (id 1) per the "Civil
   jurisdiction" criterion. Confirm no dedicated "Business and Property Courts"
   sub-jurisdiction is expected.
6. **Time format** — assumed `validateTimeFormatSimple` (accepts `9am`,
   `10:30pm`). Confirm 24-hour times are not required.
7. **Location reference data** — assumes the "Business and Property Courts Rolls
   Building" location already exists and is mapped to the Royal Courts of
   Justice Group region. If not, a location seed/reference-data update is also
   needed.
8. **Route/urlPath consistency** — the reference URL and issue use
   `companies-winding-up-chd-daily-cause-list`; note the court-of-appeal sibling
   uses a `-division-` route path that differs from its `urlPath`. Confirm the
   public route and `urlPath` should both be
   `companies-winding-up-chd-daily-cause-list`.
</content>
