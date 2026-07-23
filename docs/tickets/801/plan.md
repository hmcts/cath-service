# Technical Plan — #801 Chancery Appeals (ChD) Daily Cause List

Non-strategic list type published via the CaTH Excel-upload route, converted to JSON,
rendered as an HTML page, and downloadable as PDF and Excel. Stable list type name:
`CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST`. URL/path: `chancery-appeals-chd-daily-cause-list`.

Field set, in order: **judge, time, venue, type, caseNumber, caseName, additionalInformation**.
Required: all except `additionalInformation`.

---

## 1. Technical Approach

### Strategy

Create a new standalone list-type library `libs/list-types/chancery-appeals-chd-daily-cause-list`
plus a page controller in `apps/web/src/pages/(list-types)/`. This mirrors the existing
`rcj-standard-daily-cause-list` module, which is the **true closest analogue**: a single
**flat root array** of hearing objects rendered into a **single table**.

> Correction to the draft spec: the draft names `court-of-appeal-civil-daily-cause-list`
> as the closest analogue. It is not. That module has a **two-array object root**
> (`{ dailyHearings, futureJudgments }`) and two tables. #801 is a single flat array of
> rows, identical in **shape** to `rcj-standard-daily-cause-list`
> (`libs/list-types/rcj-standard-daily-cause-list/src/schemas/rcj-standard-daily-cause-list.json`).
> Model the new module on `rcj-standard`, borrowing the standalone page/PDF/locale wiring
> patterns that both modules share.

### Why it needs its own module (not `RCJ_EXCEL_CONFIG` / the shared RCJ converter)

The RCJ configs (`RCJ_EXCEL_CONFIG`, `RCJ_EXCEL_CONFIG_SIMPLE_TIME` in
`libs/list-types/common/src/conversion/rcj-field-configs.ts`) hardcode the RCJ 7-field set
with field names `venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation`.

#801 uses a **different field set and different field names**:

| #801 field | RCJ field | Same? |
|------------|-----------|-------|
| judge | judge | yes |
| time | time | yes |
| venue | venue | yes |
| **type** | hearingType | **no — different key** |
| caseNumber | caseNumber | yes |
| **caseName** | caseDetails | **no — different key** |
| additionalInformation | additionalInformation | yes |

Because `type` and `caseName` differ from `hearingType` and `caseDetails`, and the **column
order differs** (judge first, then time, then venue), the RCJ configs cannot be reused. The
new module therefore ships its own `ExcelConverterConfig`, JSON schema, and TypeScript model.
It registers its converter/PDF generator **by name** (`registerConverterByName`,
`PDF_GENERATOR_REGISTRY[...]`), never by numeric `listTypeId`.

### Architecture decisions

- **Configuration separation** (`config.ts` vs `index.ts`) per CLAUDE.md — `config.ts` exports
  `moduleRoot`, `assets`, `schemaPath`; `index.ts` exports business logic + locales + a
  `validate*` function; the converter registers itself as a side-effect of importing `index.ts`.
- **No DB model changes.** The tables `list_types`, `sub_jurisdiction`,
  `list_types_sub_jurisdictions`, `jurisdiction` already exist. Only **seed data rows** are
  added (via `list-type-data.ts` + the SQL scripts). Confirmed by reading the migrations and
  seed scripts — no Prisma schema file needs editing.
- **Region is a location attribute, not a list-type attribute.** "Royal Courts of Justice
  Group" is resolved through the location the artefact is published to (location reference
  data), not through `list_types`/`sub_jurisdiction`. There is no `regionId` on a list type.
  > Correction to the draft: the draft's claim of "regionId 11" on the list type is wrong —
  > there is no region column on list types or the sub-jurisdiction seed. Region association
  > is handled by the location record.
- **Progressive enhancement**: the HTML page works without JS; the client-side table search
  (`apps/web/src/assets/js/table-search.ts` + `css/table-search.scss`, already bundled by the
  web app) enhances it. The module ships **no** frontend assets of its own.

### Key considerations

- Never compare `listTypeId` numerically — guard on `artefact.listTypeName`.
- `listTypeName` is only populated by `getArtefactById`; the page handler uses that path.
- Welsh translations are mandatory; unknown ones are marked
  `[WELSH TRANSLATION REQUIRED: "..."]`.
- Schema + validator + validator test are mandatory (CI guard at
  `libs/list-types/common/src/validation/guard.test.ts` fails otherwise).

---

## 2. Implementation Details

### New library: `libs/list-types/chancery-appeals-chd-daily-cause-list/`

| File | Responsibility |
|------|----------------|
| `package.json` | `@hmcts/chancery-appeals-chd-daily-cause-list`; `build` = `tsc && build:nunjucks && build:schemas`; deps `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `exceljs`, `luxon`, `nunjucks` (copy from rcj-standard `package.json`). |
| `tsconfig.json` | Extends `../../../tsconfig.json`; `outDir dist`, `rootDir src`, excludes tests + `src/assets`. |
| `src/config.ts` | Exports `moduleRoot = __dirname`, `assets = join(__dirname,"assets/")`, `schemaPath = join(__dirname,"schemas/chancery-appeals-chd-daily-cause-list.json")`. |
| `src/index.ts` | `import "./conversion/chancery-appeals-chd-daily-cause-list-config.js"` (side-effect register); export types, renderer, pdf-generator, email-summary, locales as `chanceryAppealsChdDailyCauseListEn/Cy`, and `validateChanceryAppealsChdDailyCauseList`. |
| `src/models/types.ts` | `interface ChanceryAppealsChdHearing { judge; time; venue; type; caseNumber; caseName; additionalInformation }` and `type ChanceryAppealsChdHearingList = ChanceryAppealsChdHearing[]`. Types colocated (no `types.ts`-as-dump; this file holds the model interface). |
| `src/schemas/chancery-appeals-chd-daily-cause-list.json` | JSON schema (see below). |
| `src/validation/json-validator.ts` | `export function validateChanceryAppealsChdDailyCauseList(jsonData): ValidationResult { return createJsonValidator(schemaPath)(jsonData); }` |
| `src/validation/json-validator.test.ts` | Real-schema tests: one `it` per required field + a valid-data case. |
| `src/conversion/chancery-appeals-chd-daily-cause-list-config.ts` | Bespoke `ExcelConverterConfig` (fields below) + `registerConverterByName("CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST", createConverter(config))`. |
| `src/rendering/renderer.ts` | `renderChanceryAppealsChd(list, {locale, listTitle, contentDate, lastReceivedDate})` → `{ header, hearings }`; uses `normaliseHearings`, `formatDisplayDate`, `formatLastUpdatedDateTime`. |
| `src/rendering/renderer.test.ts` | Unit tests for header + hearing normalisation + Welsh. |
| `src/locales/en.ts` / `src/locales/cy.ts` | Page/table content (see §5 for open copy items); `provenanceLabels` re-export as in rcj-standard. |
| `src/pdf/pdf-generator.ts` | `generateChanceryAppealsChdDailyCauseListPdf(options)`; renders `pdf-template.njk`; saves via `savePdfToStorage`. |
| `src/pdf/pdf-template.njk` | Single-table PDF markup (columns in #801 order). |
| `src/pdf/pdf-generator.test.ts` | PDF generation happy-path + error result. |
| `src/email-summary/summary-builder.ts` | `extractCaseSummary(list)` → `[{Time},{Case number},{Case name}]`; re-export `formatCaseSummaryForEmail`, `SPECIAL_CATEGORY_DATA_WARNING`. |

### New page controller: `apps/web/src/pages/(list-types)/chancery-appeals-chd-daily-cause-list/`

| File | Responsibility |
|------|----------------|
| `index.ts` | `createSimpleListTypeHandler<ChanceryAppealsChdHearingList>` with `SUPPORTED_LIST_TYPE = "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST"` guard on `artefact.listTypeName`; `validate = createJsonValidator(schemaPath)` from `@hmcts/chancery-appeals-chd-daily-cause-list/config`; render via `renderChanceryAppealsChd` + `resolveDataSource`. Optional `ROUTES = ["/chancery-appeals-chd-daily-cause-list"]`. |
| `chancery-appeals-chd-daily-cause-list.njk` | Extends `layouts/base-template.njk`, `page_content` block; single table with columns Judge, Time, Venue, Type, Case Number, Case Name, Additional Information; `govukDetails` important-information box; table-search input. |
| `index.test.ts` | Controller tests (mirror COA-civil `index.test.ts`: success, missing artefactId → 400, not found → 404, wrong list type → 400, bad JSON → 404, validation fail → 400, server error → 500, Welsh locale). |
| `chancery-appeals-chd-daily-cause-list.njk.test.ts` | Cheerio structural tests: heading, column count/order, conditional additionalInformation, "no hearings" message, Welsh headings, en/cy key parity. |

### Registration touch-points (VERIFIED paths)

1. **Root `tsconfig.json`** (`/home/runner/work/cath-service/cath-service/tsconfig.json`) — add:
   ```json
   "@hmcts/chancery-appeals-chd-daily-cause-list": ["libs/list-types/chancery-appeals-chd-daily-cause-list/src"],
   "@hmcts/chancery-appeals-chd-daily-cause-list/config": ["libs/list-types/chancery-appeals-chd-daily-cause-list/src/config"]
   ```
   (`rcj-standard` and `court-of-appeal-civil` only register the base path and rely on
   package.json `exports` for `/config`, but adding both is the majority convention — do both.)

2. **`libs/list-types/common/src/list-type-data.ts`** — add a `ListTypeData` entry:
   ```ts
   {
     name: "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Chancery Appeals (ChD) Daily Cause List",
     welshFriendlyName: "[WELSH TRANSLATION REQUIRED: 'Chancery Appeals (ChD) Daily Cause List']",
     provenance: "CFT_IDAM",                 // matches all non-strategic RCJ lists
     urlPath: "chancery-appeals-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [1]                 // Civil Court — see open question re [10] High Court
   }
   ```

3. **`apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`** — add a `VALUES` row
   (name, friendly_name, welsh_friendly_name, shortened_friendly_name, url,
   default_sensitivity, allowed_provenance, is_non_strategic, NOW()). Idempotent via
   `ON CONFLICT (name) DO UPDATE`.

4. **`apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`** —
   add a mapping row `('CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST', 1)` (or `10`) to the Step-2
   junction `VALUES` block. No new sub-jurisdiction rows required (Civil Court = 1 exists;
   High Court = 10 exists). No change to script 002 or 004.

5. **`libs/publication/src/processing/service.ts`** — import
   `generateChanceryAppealsChdDailyCauseListPdf` + type, then add to `PDF_GENERATOR_REGISTRY`:
   ```ts
   CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST: (p) =>
     generateChanceryAppealsChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as ChanceryAppealsChdHearingList }),
   ```

6. **`apps/web/src/app.ts`** — add
   `import { moduleRoot as chanceryAppealsChdModuleRoot } from "@hmcts/chancery-appeals-chd-daily-cause-list/config";`
   and add `chanceryAppealsChdModuleRoot` to the `modulePaths` array (Nunjucks template
   discovery for the PDF template; the page template is discovered from
   `apps/web/src/pages`).

7. **`apps/web/vite.build.ts`** — **no change required.**
   > Correction to the draft/harness note ("register vite assets"): `vite.build.ts` only globs
   > `apps/web/src/assets/**` and copies `apps/web/src/pages/**/*.njk`. It does **not** import
   > per-module `assets` exports. The reference `court-of-appeal-civil` module defines
   > `assets` in its `config.ts` yet is absent from `vite.build.ts`. Because this module ships
   > no frontend assets, no vite change is needed. (Only add a step here if the module later
   > ships its own `src/assets`.)

8. **`apps/api/src/app.ts`** — **no change required** for this module (no API routes;
   converter registration happens through the `@hmcts/publication` import chain that already
   pulls in list-type packages). Verified: no per-list-type import lines exist in the api app.

### JSON schema definition

Root is an **array** (like `rcj-standard`), items are objects. Field order preserved via
property declaration order; `required` omits `additionalInformation`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Chancery Appeals (ChD) Daily Cause List",
  "description": "Schema for the Chancery Appeals (ChD) Daily Cause List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["judge", "time", "venue", "type", "caseNumber", "caseName"],
    "properties": {
      "judge":                 { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "time":                  { "type": "string", "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$" },
      "venue":                 { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "type":                  { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseNumber":            { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseName":              { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "additionalInformation": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```

- Time pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$` matches the issue examples (`9am`, `10:30pm`)
  and the shared `validateTimeFormatSimple` used across RCJ modules.
- No-HTML pattern on every free-text field prevents markup injection.

### Converter config (`ExcelConverterConfig`)

Bespoke config in `chancery-appeals-chd-daily-cause-list-config.ts`, columns in #801 order,
using shared `validateTimeFormatSimple` and `validateNoHtmlTags`:

```ts
const CHANCERY_APPEALS_CHD_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge",  fieldName: "judge",  required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Judge", r)] },
    { header: "Time",   fieldName: "time",   required: true, validators: [validateTimeFormatSimple] },
    { header: "Venue",  fieldName: "venue",  required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Type",   fieldName: "type",   required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Type", r)] },
    { header: "Case Number", fieldName: "caseNumber", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Case Number", r)] },
    { header: "Case Name",   fieldName: "caseName",   required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: false,
      validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)] }
  ],
  minRows: 1
};
registerConverterByName("CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST", createConverter(CHANCERY_APPEALS_CHD_CONFIG));
```

> Note on `minRows`: the draft proposed `0`. Single-sheet flat lists (e.g. RCJ standard via
> `RCJ_EXCEL_CONFIG`) use `minRows: 1` — a daily cause list with zero rows is almost
> certainly a bad upload. Recommend **`minRows: 1`**. The exact Excel column-header wording
> ("Type" vs "Hearing Type", "Case Name" vs "Case name") is an open question (§5) — the
> `header` strings must match the supplied Excel template exactly.

### No DB model changes — confirmed

All required tables exist (`list_types`, `sub_jurisdiction`, `jurisdiction`,
`list_types_sub_jurisdictions`). Adding the list type is pure seed data. Run
`yarn db:generate` only if you touch `.prisma` files — **you will not**, so a DB regenerate is
not strictly needed; `yarn db:migrate:dev` is not required either. The seed scripts are run by
the DB seeding process.

---

## 3. Error Handling & Edge Cases

| Case | Handling |
|------|----------|
| Missing `artefactId` query param | `createSimpleListTypeHandler` → 400 `errors/common` ("Bad Request"). |
| Artefact not found | 404 `errors/common` ("Not Found"). |
| Wrong `listTypeName` | `guardArtefact` → 400 `errors/common` ("Invalid List Type"). Guards on the stable name, never a numeric id. |
| JSON blob missing | 404 `errors/common` ("Not Found"), logged with `logPrefix`. |
| JSON fails schema validation | 400 `errors/common` ("Invalid Data"), errors logged. |
| Unexpected error | 500 `errors/common` ("Error"). |
| **Excel: missing required column** | Converter reports a row error (required field absent); upload rejected before publish. |
| **Excel: invalid time** (`validateTimeFormatSimple`) | Row-level validation error; upload rejected. |
| **HTML injection** in any free-text field | Blocked twice: `validateNoHtmlTags` at Excel conversion, and the no-HTML `pattern` at JSON-schema validation. |
| **Empty file** (no data rows) | `minRows: 1` → conversion error surfaced to uploader. |
| **Optional `additionalInformation` absent/empty** | Valid; renderer defaults to `""` via `normaliseHearings`; template renders an empty cell. |

---

## 4. Acceptance Criteria Mapping

| AC | How satisfied | How verified |
|----|---------------|--------------|
| Created under Business & Property Courts, Rolls Building; linked to Civil jurisdiction & RCJ Group region | `list-type-data.ts` + SQL seed row with `subJurisdictionIds`/link; region resolved via the Rolls Building location record | DB seed applied; page reachable via published artefact at that location; §5 open items |
| Data fields in order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) | Schema property order + converter field order + table column order | `json-validator.test.ts`; template `.njk.test.ts` column-order assertions |
| Published via Excel upload → JSON | Bespoke `ExcelConverterConfig` registered by name; `convertExcelForListTypeName` | Converter unit behaviour; manual upload E2E |
| Validation schema + style guide created | `schemas/*.json` + validator + page template following the staging style guide | Validator tests; template tests; visual check vs staging URL |
| PDF and Excel downloadable versions | PDF via `PDF_GENERATOR_REGISTRY`; Excel is the re-downloadable source artefact (existing platform behaviour) | `pdf-generator.test.ts`; E2E download check |
| Style guide follows staging structure | Page template mirrors single-table RCJ layout with important-info box + search | `.njk.test.ts`; manual comparison to `.../chancery-appeals-chd-daily-cause-list?artefactId=...` |
| JSON follows the given format | Flat array of objects with the 7 keys | `json-validator.test.ts` valid-data fixture matches the issue sample |

---

## 5. CLARIFICATIONS NEEDED

1. **Venue / location record.** Does a location row for **"Business and Property Courts,
   Rolls Building"** already exist in location reference data (with address lines used by the
   page header)? If not, a location record must be added by the reference-data owner before
   the list can be published/associated with the RCJ Group region. The page header location
   lines (`locationLine1/2/3`) depend on the answer.
2. **Sub-jurisdiction id.** AC says "Civil jurisdiction". Both **Civil Court (1)** and
   **High Court (10)** roll up to the Civil jurisdiction. Existing Business & Property lists
   (`BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST`, etc.) use **[10] High Court**. Confirm whether
   Chancery Appeals should link to **1 (Civil Court)** — as the draft assumed — or **10
   (High Court)**, which is more consistent with other Rolls Building / B&P lists.
3. **Friendly name + Welsh name.** Confirm the exact English friendly name
   ("Chancery Appeals (ChD) Daily Cause List"?) and provide the Welsh translation (currently
   `[WELSH TRANSLATION REQUIRED]`). Also confirm `shortenedFriendlyName`, if any.
4. **"Important information" body copy.** The page needs the specific important-information /
   guidance text for Chancery Appeals (the COA-civil live-streaming/judgments copy is not
   reusable). Provide English + Welsh, or confirm a minimal box.
5. **Excel template column-header wording.** Confirm exact header strings in the supplied
   Excel template — e.g. "Type" vs "Hearing Type", "Case Name" vs "Case name",
   "Additional Information" vs "Additional information". The converter `header` values must
   match byte-for-byte.
6. **Sensitivity / provenance.** Confirm `defaultSensitivity = "Public"` and
   `provenance = "CFT_IDAM"` (assumed, matching every other non-strategic RCJ list). Confirm
   `minRows` (recommend 1).
