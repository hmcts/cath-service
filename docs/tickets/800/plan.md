# Technical Plan — #800 Business list (ChD) daily cause list

## 1. Technical Approach

Add a new **non-strategic** list type, `BUSINESS_LIST_CHD_DAILY_CAUSE_LIST`, that is
published via the existing CaTH Excel-upload route, converted to JSON, validated against a
new schema, and rendered as an HTML page with PDF and Excel downloads.

This follows the established RCJ non-strategic list pattern. The closest reference is
`libs/list-types/rcj-standard-daily-cause-list/` (module layout) and
`apps/web/src/pages/(list-types)/london-administrative-court-daily-cause-list/index.ts`
(single-list-type page controller).

**Critical constraint (verified):** this list **cannot reuse** the shared
`RCJ_EXCEL_CONFIG`. That config is `Venue, Judge, Time, Case Number, Case Details,
Hearing Type, Additional Information`. The Business list (ChD) requires a *different field
set and order*: `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`
(`Type` ≠ `Hearing Type`, `Case Name` ≠ `Case Details`). A bespoke Excel config **and**
JSON schema are therefore mandatory.

Per CLAUDE.md, everything keys off the stable `listTypeName` string
(`BUSINESS_LIST_CHD_DAILY_CAUSE_LIST`) — never a numeric `listTypeId`.

### Architecture decisions

- **New library module** `libs/list-types/business-list-chd-daily-cause-list/` — mirrors
  `rcj-standard-daily-cause-list` exactly (config, schema, validator, converter, renderer,
  PDF generator, locales, models). No shared config reuse for conversion/schema.
- **New page** `apps/web/src/pages/(list-types)/business-list-chd-daily-cause-list/` — a
  single-list-type controller using `createSimpleListTypeHandler`, plus a Nunjucks template,
  controller test and template test.
- **No DB schema change.** `list_type`, `artefact`, `location` models already exist; the list
  type is added via the reference-data seed (`e2e-tests/utils/seed-list-types.ts` and however
  the environment reference data is loaded — see Open Questions), not a Prisma migration.
- **No new API routes or download endpoints.** Registering the converter
  (`registerConverterByName`) and the PDF generator (`PDF_GENERATOR_REGISTRY`) is sufficient;
  the existing artefact PDF/Excel download routes pick them up by `listTypeName`.

### JSON shape (from the issue — a flat array, root type `array`)

```json
[
  { "judge": "Judge A", "time": "9am", "venue": "Venue A", "type": "Type A",
    "caseNumber": "12345", "caseName": "Case name A",
    "additionalInformation": "This is additional information" }
]
```

## 2. Implementation Details

### 2.1 New library module — `libs/list-types/business-list-chd-daily-cause-list/`

```
libs/list-types/business-list-chd-daily-cause-list/
├── package.json                    # name: @hmcts/business-list-chd-daily-cause-list
├── tsconfig.json                   # extends ../../../tsconfig.json (same as rcj-standard)
└── src/
    ├── config.ts                   # moduleRoot, schemaPath
    ├── index.ts                    # side-effect import of converter config + public exports
    ├── models/types.ts             # BusinessListChdHearing, BusinessListChdHearingList
    ├── schemas/business-list-chd-daily-cause-list.json
    ├── validation/
    │   ├── json-validator.ts       # validateBusinessListChdDailyCauseList()
    │   └── json-validator.test.ts
    ├── conversion/
    │   ├── business-list-chd-daily-cause-list-config.ts   # BUSINESS_LIST_CHD_EXCEL_CONFIG + registerConverterByName
    │   └── business-list-chd-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts             # renderBusinessListChd()
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts        # generateBusinessListChdDailyCauseListPdf()
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    └── locales/
        ├── en.ts
        └── cy.ts
```

`package.json` copies the `rcj-standard-daily-cause-list` scripts verbatim — importantly the
`build:schemas` and `build:nunjucks` steps (schema JSON and the PDF `.njk` must be copied
into `dist`). Same dependency set (`@hmcts/list-types-common`, `@hmcts/pdf-generation`,
`@hmcts/postgres-prisma`, `luxon`, `nunjucks`).

**`config.ts`** (verified against rcj-standard):
```typescript
export const moduleRoot = __dirname;
export const schemaPath = path.join(__dirname, "schemas/business-list-chd-daily-cause-list.json");
```

**`models/types.ts`**:
```typescript
export interface BusinessListChdHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation?: string;
}
export type BusinessListChdHearingList = BusinessListChdHearing[];
```

**`conversion/business-list-chd-daily-cause-list-config.ts`** — bespoke 7-field config using
`createConverter` + `registerConverterByName` (never a numeric id), reusing the common
validators `validateNoHtmlTags` and `validateTimeFormat`:
```typescript
export const BUSINESS_LIST_CHD_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Judge", r)] },
    { header: "Time", fieldName: "time", required: true, validators: [validateTimeFormat] },
    { header: "Venue", fieldName: "venue", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Type", fieldName: "type", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Type", r)] },
    { header: "Case Number", fieldName: "caseNumber", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Case Number", r)] },
    { header: "Case Name", fieldName: "caseName", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: false,
      validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)] }
  ],
  minRows: 1
};
registerConverterByName("BUSINESS_LIST_CHD_DAILY_CAUSE_LIST", createConverter(BUSINESS_LIST_CHD_EXCEL_CONFIG));
```
> Confirm the exact `ExcelConverterConfig` field shape and the `validateNoHtmlTags` /
> `validateTimeFormat` signatures against `libs/list-types/common/src/conversion/` when
> implementing — copy the shape from `rcj-field-configs.ts` rather than assuming.

**`index.ts`** — side-effect import registers the converter on module load, then export the
public API (mirror rcj-standard's `index.ts`):
```typescript
import "./conversion/business-list-chd-daily-cause-list-config.js";
export { cy as businessListChdDailyCauseListCy } from "./locales/cy.js";
export { en as businessListChdDailyCauseListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateBusinessListChdDailyCauseList } from "./validation/json-validator.js";
```

**`rendering/renderer.ts`** — build the header (title + formatted list date + last-updated
date/time via `formatDisplayDate` / `formatLastUpdatedDateTime` from `@hmcts/list-types-common`)
and pass hearings through in order. Note the RCJ-standard renderer takes `listTitle` and
`listTypeName` in its `RenderOptions` and returns `{ header, hearings }`; decide whether to
derive `listTitle` from the locale (`en.pageTitle`) inside the controller or the renderer —
keep it consistent with how the controller invokes it (see 2.2).

### 2.2 New page — `apps/web/src/pages/(list-types)/business-list-chd-daily-cause-list/`

```
├── index.ts                                   # GET controller
├── business-list-chd-daily-cause-list.njk     # template (7-column table, matches style guide)
├── index.test.ts
└── business-list-chd-daily-cause-list.njk.test.ts
```

Controller mirrors `london-administrative-court-daily-cause-list/index.ts`:
- `export const ROUTES = ["/business-list-chd-daily-cause-list"];`
- `const validate = createJsonValidator(schemaPath);`
- `const SUPPORTED_LIST_TYPE = "BUSINESS_LIST_CHD_DAILY_CAUSE_LIST";`
- `export const GET = createSimpleListTypeHandler<BusinessListChdHearingList>({ ... })` with a
  `guardArtefact` returning `true` (and rendering `errors/common` 400) when
  `artefact.listTypeName !== SUPPORTED_LIST_TYPE`, and a `render` fn that resolves the data
  source via `resolveDataSource(...) || PROVENANCE_LABELS[...] || artefact.provenance` and
  calls `res.render("business-list-chd-daily-cause-list", { en, cy, t, title, header, hearings, dataSource })`.

Template extends the shared list-type layout used by the RCJ pages
(`apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/*.njk` is the reference):
GOV.UK header/footer, phase banner, location block, "List for" / "Last updated" lines,
"Important information" `govukDetails`, "Search Cases" `<h2>` + search input, and a
`govuk-table` with 7 `scope="col"` headers in AC order, one row per hearing.

### 2.3 PDF registration — `libs/publication/src/processing/service.ts`

Add an import and a registry entry keyed by the string name (verified: registry is
`Partial<Record<string, PdfGenerator>>` at line ~139, and `generateRcjStandardDailyCauseListPdf`
takes `listTypeName`):
```typescript
BUSINESS_LIST_CHD_DAILY_CAUSE_LIST: (p) =>
  generateBusinessListChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as BusinessListChdHearingList, listTypeName: p.listTypeName ?? "" }),
```
Add `@hmcts/business-list-chd-daily-cause-list` to `libs/publication/package.json`
dependencies so the import (and thus `registerConverterByName` side-effect) is available on
the API side.

### 2.4 Registration wiring

- **Root `tsconfig.json` `paths`**: add
  `"@hmcts/business-list-chd-daily-cause-list": ["libs/list-types/business-list-chd-daily-cause-list/src"]`
  and the `/config` entry (match how other list-types are registered — check whether existing
  list-types list a `/config` path entry).
- **`apps/web/src/app.ts`**: only needed if the module ships shared views; the page template
  lives under `apps/web/src/pages/` and is auto-discovered, so likely no change. Confirm
  whether the PDF `.njk` needs a module path registered (rcj-standard does not add one — its
  PDF template is resolved by the PDF generator itself).
- **Converter availability on API**: ensured by the `@hmcts/publication` → module import chain
  (2.3), same mechanism as existing RCJ lists.

### 2.5 List-type seed metadata — `e2e-tests/utils/seed-list-types.ts`

Add to `BASE_LIST_TYPES` (shape verified against existing non-strategic entries):
```typescript
{
  name: "BUSINESS_LIST_CHD_DAILY_CAUSE_LIST",
  friendlyName: "Business list (ChD) daily cause list",
  welshFriendlyName: "[WELSH TRANSLATION REQUIRED: \"Business list (ChD) daily cause list\"]",
  url: "business-list-chd-daily-cause-list",
  defaultSensitivity: "Public",
  provenance: "CFT_IDAM",
  isNonStrategic: true
}
```

### 2.6 JSON schema — `schemas/business-list-chd-daily-cause-list.json`

Root `type: "array"`, `items` object with `required`
`["judge","time","venue","type","caseNumber","caseName"]` (i.e. `additionalInformation`
optional), properties declared in AC order. String fields use the established no-HTML pattern
`^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`; `time` uses the RCJ pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$`.
(These patterns copied verbatim from `rcj-standard-daily-cause-list.json`.)

## 3. Error Handling & Edge Cases

| Condition | Behaviour |
|---|---|
| Missing required Excel column | Conversion fails: `Missing required column "Case Name"` |
| Empty required cell | `Judge is required (row 4)` (row-numbered by the converter) |
| Invalid `Time` value | `validateTimeFormat` fails with the offending row number |
| HTML in any field | `validateNoHtmlTags` rejects it |
| No data rows | `minRows: 1` → conversion error |
| `additionalInformation` blank/absent | Valid (optional) |
| Missing `artefactId` on view | `errors/common` (400) |
| Artefact not found | `errors/common` (404) |
| Wrong `listTypeName` for this page | `errors/common` (400) "Invalid List Type" |
| Blob/JSON missing or schema fails at render | `errors/common` (404 / 400) |

`time` supports `9am`, `10:30pm`, `2.30pm`. The issue example `10:30pm` validates under this
pattern. See Open Questions re 24-hour/free-text times.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| Created under Business & Property Courts Rolls Building, Civil jurisdiction, RCJ Group region | Seed metadata (2.5) + location/jurisdiction/region reference-data linkage | Manual check on env + seed; see Open Q on linkage mechanism |
| Fields in order Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | JSON schema (2.6) + Excel config (2.1) declare fields in this order | Schema/config unit tests assert order & required flags |
| Published via Excel upload, converted to JSON | Bespoke converter registered by name (2.1) | Converter unit test + E2E upload journey |
| Validation schema + style guide created | New schema (2.6) + template matching staging (2.2) | Validator tests + template (Cheerio) tests |
| PDF + Excel downloadable | PDF generator registered (2.3); Excel served by existing route | PDF generator test + E2E download check |
| Style guide matches staging URL | Template mirrors RCJ view layout, 7-column table | `*.njk.test.ts` structural assertions |
| JSON matches issue format | `BusinessListChdHearing` type + schema (2.6) | Validator test using issue fixture |

## 5. Testing

Per CLAUDE.md list-type rules:
- **Validator test** (`json-validator.test.ts`): real schema, no mocks; fully-hydrated fixture
  (issue JSON) → `isValid`; one `it` per required field deleted via
  `JSON.parse(JSON.stringify(...))` → invalid; `additionalInformation` optional passes;
  invalid `time` fails. **Mandatory** — the CI guard test in `libs/list-types/common` fails if
  a schema ships without a `validate*` export.
- **Excel config test**: 7 fields in order, required/optional flags, `minRows === 1`, time
  validator accepts `9am`/`10:30pm`/`2.30pm` and rejects `9`/`25:00am`.
- **Renderer test**: header fields (title, formatted list date, last-updated) + hearings in order.
- **Controller test** (`index.test.ts`): renders `en`/`cy`/`t`; 400 on wrong `listTypeName`;
  404 when artefact/JSON missing; 400 on schema failure.
- **Template test** (`*.njk.test.ts`): 7 headers in AC order, one row per hearing, correct
  cell→column mapping, Welsh headings via `cy`, `Object.keys(en).sort() === Object.keys(cy).sort()`.
- **PDF generator test**: produces a PDF for the issue JSON, includes title + column data.
- **E2E** (`e2e-tests/tests/*.spec.ts`, one journey, `@nightly` if slow): seed list type,
  publish via Excel upload, open view page, assert table, switch to Welsh, inline axe-core
  scan, confirm PDF + Excel downloads.

## 6. Content / Welsh

All strings live in the module's `locales/en.ts` and `cy.ts` with **identical keys**. Welsh
values use `[WELSH TRANSLATION REQUIRED: "..."]` markers for the post-processing script. Keys
(mirror RCJ/London Admin): `pageTitle`, `locationLine1..3`, fact link text/url,
`importantInfoTitle`/`Text`, `searchCasesTitle`/`Label`, `tableHeaders.{judge,time,venue,type,
caseNumber,caseName,additionalInformation}`, `noHearingsMessage`, `dataSource`, `listFor`,
`lastUpdated`, `at`, `backToTop`. No display strings hardcoded in controller/template.

## 7. Accessibility

Semantic `govuk-table` with `<thead>`/`scope="col"` and an `aria-label` = list title; single
`<h1>`, `<h2>` for "Search Cases"; full EN/CY parity (`?lng=cy`); labelled search input;
`govukDetails` for "Important information"; no colour-only meaning. Target WCAG 2.2 AA, verified
inline in the E2E journey with axe-core.

---

## CLARIFICATIONS NEEDED

1. **Location address & record.** Assumed `locationLine2` = "7 Rolls Buildings, Fetter Lane,
   London", `locationLine3` = "EC4A 1NL". Confirm exact strings, and whether a location record
   for "Business and Property Courts Rolls Building" already exists in reference data or must be
   created/seeded.
2. **Jurisdiction/region linkage mechanism.** How is the Civil jurisdiction + Royal Courts of
   Justice Group region association configured — location reference data, list-search-config, or
   an admin step beyond `seed-list-types.ts`? Is any extra seeding needed?
3. **Time format.** Reusing the RCJ pattern (`9am`, `10:30pm`, `2.30pm`). Do 24-hour or
   free-text times ever occur for this list? If so the pattern must be relaxed.
4. **Sensitivity / provenance.** Assumed `Public` sensitivity + `CFT_IDAM` provenance (as other
   non-strategic RCJ lists). Confirm with the publishing team.
5. **Welsh friendly name.** Should `welshFriendlyName` be a real translation or remain the
   English list name (as some existing entries do)?
6. **Excel download.** Assumed the platform re-serves the originally uploaded Excel (standard
   non-strategic behaviour) — no separately generated Excel. Confirm.
7. **`ExcelConverterConfig` / validator signatures.** Confirm the exact field-config shape and
   `validateNoHtmlTags` / `validateTimeFormat` signatures in `libs/list-types/common` at
   implementation time (copy from `rcj-field-configs.ts`) rather than relying on the sketch above.
