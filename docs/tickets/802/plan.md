# #802 Commercial Court (KB) daily cause list — Technical Plan

## 1. Technical Approach

The Commercial Court (KB) daily cause list is a **non-strategic** list type published via the
Excel upload route: an admin uploads an `.xlsx` template, it is converted to a flat JSON array,
validated against a JSON schema, stored as an artefact, and rendered to a public HTML page plus
downloadable PDF and Excel versions.

The closest existing reference is
`libs/list-types/administrative-court-daily-cause-list/`. It is a single flat-array list type with
the same overall shape (Excel → JSON → schema validation → renderer → PDF), so we mirror its
module layout, page structure, registration wiring, and test structure.

**Key deviation from the reference.** The admin court list reuses the shared
`RCJ_EXCEL_CONFIG` (7 fields: Venue, Judge, Time, Case Number, **Case Details**, **Hearing
Type**, Additional Information). #802 has a **different field set and order**:

| # | Ticket field | JSON key | Required |
|---|--------------|----------|----------|
| 1 | Judge | `judge` | yes |
| 2 | Time | `time` | yes |
| 3 | Venue | `venue` | yes |
| 4 | Type | `type` | yes |
| 5 | Case Number | `caseNumber` | yes |
| 6 | Case Name | `caseName` | yes |
| 7 | Additional Information | `additionalInformation` | no |

Because `type`/`caseName` do not map onto `caseDetails`/`hearingType`, we **cannot** reuse
`RCJ_EXCEL_CONFIG`. This list type needs its own **dedicated JSON schema** and its own
**bespoke `ExcelConverterConfig`**. Everything else (registration chain, renderer helpers, PDF
pipeline, page controller/guard, locale-driven content) follows the admin court pattern.

Other differences:
- The admin court lib registers **4 regional converter variants**; #802 is a **single** list type
  (`COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST`), so one converter registration, one schema, one page,
  one route.
- The public route/page is single-list, so the controller uses a simple list-type handler with a
  one-entry guard config rather than the multi-list guard.

**Stable identifier rule (CLAUDE.md).** All routing, guards, PDF registry keys, converter
registration, and Prisma filters use the stable string `listTypeName`
(`COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST`). The numeric `listType.id` is autoincrement and differs
per environment — it must never appear in code, comments, or non-fixture tests.

---

## 2. Implementation Details

### 2.1 New library — `libs/list-types/commercial-court-kb-daily-cause-list/`

```
libs/list-types/commercial-court-kb-daily-cause-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── models/
    │   └── types.ts
    ├── schemas/
    │   └── commercial-court-kb-daily-cause-list.json
    ├── validation/
    │   ├── json-validator.ts
    │   └── json-validator.test.ts
    ├── conversion/
    │   ├── commercial-court-kb-daily-cause-list-config.ts
    │   └── commercial-court-kb-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    └── locales/
        ├── en.ts
        └── cy.ts
```

#### `package.json`
Mirror `libs/list-types/administrative-court-daily-cause-list/package.json`:
- `"name": "@hmcts/commercial-court-kb-daily-cause-list"`, `"type": "module"`
- `exports`: `"."` → `src/index.ts` (default) / `dist/index.js` (production);
  `"./config"` → `src/config.ts` / `dist/config.js`
- scripts: `"build": "tsc && yarn build:nunjucks && yarn build:schemas"`, plus `dev`, `test`,
  `format`, `lint`, `lint:fix`. Copy the exact `build:nunjucks` (copies `pdf/*.njk` to `dist`) and
  `build:schemas` (copies `schemas/*.json` to `dist`) recipes from the admin court package.
- deps: `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `luxon`,
  `nunjucks` (match admin court versions).

#### `tsconfig.json`
Extends `../../../tsconfig.json`; `outDir: ./dist`, `rootDir: ./src`, `declaration: true`;
`include: ["src/**/*"]`; `exclude: ["**/*.test.ts", "dist", "node_modules", "src/assets"]`.

#### `src/config.ts`
```ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "assets/");
export const schemaPath = path.join(__dirname, "schemas/commercial-court-kb-daily-cause-list.json");
```

#### `src/models/types.ts`
```ts
export interface CommercialCourtKbHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation?: string;
}

export type CommercialCourtKbDailyCauseList = CommercialCourtKbHearing[];
```

#### `src/schemas/commercial-court-kb-daily-cause-list.json`
Draft-07, root `"type": "array"`, `items` object. Copy the HTML-tag rejection pattern and time
pattern verbatim from
`libs/list-types/administrative-court-daily-cause-list/src/schemas/administrative-court-daily-cause-list.json`.
Required: `["judge", "time", "venue", "type", "caseNumber", "caseName"]`; `additionalInformation`
optional. `additionalProperties: false`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": false,
    "required": ["judge", "time", "venue", "type", "caseNumber", "caseName"],
    "properties": {
      "judge":  { "type": "string", "pattern": "<HTML-REJECT-PATTERN>" },
      "time":   { "type": "string", "pattern": "<TIME-PATTERN>" },
      "venue":  { "type": "string", "pattern": "<HTML-REJECT-PATTERN>" },
      "type":   { "type": "string", "pattern": "<HTML-REJECT-PATTERN>" },
      "caseNumber": { "type": "string", "pattern": "<HTML-REJECT-PATTERN>" },
      "caseName":   { "type": "string", "pattern": "<HTML-REJECT-PATTERN>" },
      "additionalInformation": { "type": "string", "pattern": "<HTML-REJECT-PATTERN>" }
    }
  }
}
```
`<HTML-REJECT-PATTERN>` = the admin court's `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`.
`<TIME-PATTERN>` = the admin court's `^\d{1,2}([:.]\d{2})?[ap]m\s*$` (accepts `9am`, `10:30pm`).

#### `src/validation/json-validator.ts`
```ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateCommercialCourtKbDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```

#### `src/conversion/commercial-court-kb-daily-cause-list-config.ts`
Bespoke config — **do not** import `RCJ_EXCEL_CONFIG`. Fields in ticket order, each with an HTML
validator except `time` which uses `validateTimeFormat`; `additionalInformation` optional.
```ts
import {
  createConverter,
  registerConverterByName,
  validateNoHtmlTags,
  validateTimeFormat,
  type ExcelConverterConfig
} from "@hmcts/list-types-common";

export const COMMERCIAL_COURT_KB_EXCEL_CONFIG: ExcelConverterConfig = {
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

registerConverterByName(
  "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  createConverter(COMMERCIAL_COURT_KB_EXCEL_CONFIG)
);
```
The exact **Excel column headers** must match the published template — see CLARIFICATIONS.

#### `src/rendering/renderer.ts`
Mirror `administrative-court-daily-cause-list/src/rendering/renderer.ts`:
`renderCommercialCourtKb(hearingList, options)` returns
`{ header: { listTitle, listDate, lastUpdatedDate, lastUpdatedTime }, hearings: normaliseHearings(hearingList) }`
using `formatDisplayDate`, `formatLastUpdatedDateTime`, `normaliseHearings` from
`@hmcts/list-types-common`.

#### `src/locales/en.ts` / `src/locales/cy.ts`
Same shape as the admin court locales: a list-type object (`pageTitle`, important-info text,
etc.) plus a `common` block (`factLink*`, `importantInfoTitle`, `searchCases*`, `tableHeaders`,
`dataSource`, `backToTop`, `listFor`, `lastUpdated`, `at`, caution/provenance labels).
`tableHeaders` in ticket order: Judge, Time, Venue, Type, Case Number, Case Name, Additional
Information. Welsh mirrors the English structure; unknown strings marked
`[WELSH TRANSLATION REQUIRED: "..."]`.

#### `src/pdf/pdf-template.njk` and `src/pdf/pdf-generator.ts`
Copy the admin court PDF template, changing the table columns to the 7 ticket fields in order.
`generateCommercialCourtKbDailyCauseListPdf(options)` mirrors the admin court generator:
`PdfGenerationOptions extends BasePdfGenerationOptions<CommercialCourtKbDailyCauseList>` with
`contentDate: Date` and `listTypeName: string`; single-entry `LIST_TITLE_MAP` keyed by
`listTypeName` with a fallback title; uses `configureNunjucks(__dirname)` →
`generatePdfFromHtml` → `savePdfToStorage`.

#### `src/index.ts`
```ts
import "./conversion/commercial-court-kb-daily-cause-list-config.js"; // side-effect: register converter

export type { ValidationResult } from "@hmcts/list-types-common";
export { cy as commercialCourtKbCy } from "./locales/cy.js";
export { en as commercialCourtKbEn } from "./locales/en.js";
export * from "./models/types.js";
export { generateCommercialCourtKbDailyCauseListPdf } from "./pdf/pdf-generator.js";
export { renderCommercialCourtKb } from "./rendering/renderer.js";
export { validateCommercialCourtKbDailyCauseList } from "./validation/json-validator.js";
```
The `validate*` export is **mandatory** — the CI guard
(`libs/list-types/common/src/validation/guard.test.ts`) fails a package that ships a schema
without one.

### 2.2 New page — `apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/`

```
apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/
├── index.ts
├── index.test.ts
├── commercial-court-kb-daily-cause-list.njk
└── commercial-court-kb-daily-cause-list.njk.test.ts
```

`index.ts` — mirror the admin court page controller but for a single list type:
- Read `artefactId` from query; 400 if missing.
- `getArtefactById(artefactId)` → 404 if not found.
- Guard: if `artefact.listTypeName !== "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST"` render the common
  400 error (guard reads `listTypeName`, never a numeric id).
- `getPublicationJson(artefactId)` → 404 if blob missing.
- `validateCommercialCourtKbDailyCauseList(json)` → 400 on invalid.
- `renderCommercialCourtKb(...)`, resolve `dataSource` from provenance labels, `res.render`.
- Provide `en`, `cy`, `t` (locale-selected). Optionally export
  `export const ROUTES = ["/commercial-court-kb-daily-cause-list"];` (simple-router honours a
  `ROUTES` string array; otherwise the directory name provides the single route).

`commercial-court-kb-daily-cause-list.njk` — extend `layouts/base-template.njk`, block
`page_content`: FACT court link, `govukDetails` important-information block, search input, hearings
`<table>` with the 7 columns in ticket order (Additional Information column rendered
conditionally), data-source line, back-to-top link.

### 2.3 Existing files to edit

| File | Change |
|------|--------|
| `tsconfig.json` (root) | Add path `"@hmcts/commercial-court-kb-daily-cause-list": ["libs/list-types/commercial-court-kb-daily-cause-list/src"]` |
| `apps/web/package.json` | Add dependency `"@hmcts/commercial-court-kb-daily-cause-list": "workspace:*"` |
| `libs/publication/package.json` | Add the same workspace dependency (publication imports the PDF generator) |
| `apps/web/src/app.ts` | `import { moduleRoot as commercialCourtKbModuleRoot } from "@hmcts/commercial-court-kb-daily-cause-list/config";` and add `commercialCourtKbModuleRoot` to the `modulePaths` array (Nunjucks template discovery for the PDF template dir) |
| `apps/web/src/app.test.ts` | Add `vi.mock("@hmcts/commercial-court-kb-daily-cause-list/config", () => ({ moduleRoot: "…" }))` alongside the other `/config` mocks |
| `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` | Add side-effect `import "@hmcts/commercial-court-kb-daily-cause-list";` to register the Excel converter for the upload flow |
| `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` | Add the same side-effect import (this is where the admin court converter is registered today) |
| `libs/publication/src/processing/service.ts` | Import `generateCommercialCourtKbDailyCauseListPdf`; define `commercialCourtKbGenerator` (adapting `jsonData`/`contentDate`/`listTypeName`); add `COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST` to `PDF_GENERATOR_REGISTRY` |
| `libs/publication/src/processing/service.test.ts` | Add a `vi.mock("@hmcts/commercial-court-kb-daily-cause-list", …)` and assert the registry dispatches to the new generator |
| `libs/list-types/common/src/list-type-data.ts` | Add `listTypeData` entry (drives DB seeding & the upload dropdown) — see 2.4 |
| `libs/list-types/common/src/list-type-data.test.ts` | Assert the new entry exists and name uniqueness still holds |
| `e2e-tests/utils/seed-list-types.ts` | Add to `BASE_LIST_TYPES` if the E2E upload flow must surface it |

**No edit expected** to `apps/web/vite.build.ts` — it globs `src/pages/**/*.{njk,html}`, so the new
page template is copied automatically, and the lib exposes no frontend `assets/`. (Note: the build
config is `vite.build.ts`, not `vite.config.ts`.)

### 2.4 Reference / seed data (`listTypeData` entry)

`apps/postgres/prisma/seed.ts` iterates `listTypeData` and upserts `prisma.listType` +
`listTypeSubJurisdiction`. Add:
```ts
{
  name: "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  englishFriendlyName: "Commercial Court (KB) Daily Cause List",
  welshFriendlyName: "[WELSH TRANSLATION REQUIRED: \"Commercial Court (KB) Daily Cause List\"]",
  provenance: "CFT_IDAM",
  urlPath: "commercial-court-kb-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "PUBLIC",
  subJurisdictionIds: [1] // Civil — same value used by all administrative-court entries
}
```
The AC requires the list under **Business and Property Courts (Rolls Building)**, **Civil**
jurisdiction, **Royal Courts of Justice Group** region. `subJurisdictionIds: [1]` covers the Civil
sub-jurisdiction; whether the court/location/region hierarchy needs additional seed rows (or
already exists) is a CLARIFICATION.

---

## 3. Error Handling & Edge Cases

- **Wrong list type** — controller guard compares `artefact.listTypeName` against
  `"COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST"`; mismatch renders the common 400 error page. Never
  compares numeric ids.
- **Missing `artefactId`** — 400 before any DB call.
- **Artefact not found / expired** — `getArtefactById` returns null → 404.
- **Missing publication blob** — `getPublicationJson` returns null → 404.
- **Empty artefact (`[]`)** — schema permits an empty array; renderer produces an empty
  `hearings` list; template shows a "no hearings" message rather than an empty table.
- **Malformed time** (`25:00`, `noon`) — rejected at Excel conversion (`validateTimeFormat`) and by
  the schema `time` pattern; converter error names the row number.
- **Embedded HTML** in any text field — rejected at conversion (`validateNoHtmlTags`) and by the
  schema HTML-reject pattern (defence in depth; prevents stored XSS).
- **Missing required field / extra column** — conversion fails with a row-specific message;
  schema validation fails with `additionalProperties: false`.
- **PDF generation failure** — generator returns/propagates failure per the admin court pattern;
  processing logs and does not silently swallow. Public page still renders from JSON even if the
  PDF/Excel download is unavailable.

---

## 4. Acceptance Criteria Mapping

| AC | Delivered by |
|----|--------------|
| Created under Business and Property Courts (Rolls Building), Civil jurisdiction, RCJ Group region | `listTypeData` entry (§2.4), `subJurisdictionIds: [1]`; court hierarchy per CLARIFICATION |
| Fields in listed order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | Schema `required` order (§2.1), bespoke Excel config (§2.1), `tableHeaders`, PDF template |
| Published via Excel upload route; converted to JSON | Bespoke converter + `registerConverterByName`; side-effect imports in the two non-strategic-upload controllers |
| Validation schema and style guide created | `commercial-court-kb-daily-cause-list.json` + validator; page template as the style guide |
| PDF and Excel downloadable versions | PDF generator + registry entry in `libs/publication`; Excel download uses the existing non-strategic download path once the converter/list type are registered |
| Style guide follows the pip-frontend reference page structure | Page `.njk` mirrors admin court layout (FACT link, important info, search, table) |
| JSON follows the given flat-array format | `CommercialCourtKbHearing` model + schema |

---

## 5. Test Plan

- **Validator** (`json-validator.test.ts`) — real schema, no mocks. Valid fixture = the ticket
  sample. One `it` per required field (delete `judge`/`time`/`venue`/`type`/`caseNumber`/`caseName`
  individually → invalid); one `it` that a record without `additionalInformation` is valid; one
  for HTML-tag rejection; one for malformed time. Deep-clone with
  `JSON.parse(JSON.stringify(VALID_DATA))` per test.
- **Conversion** (`…-config.test.ts`) — field order and required/optional split; `validateTimeFormat`
  accept (`9am`, `10:30pm`) / reject (`25:00`); HTML rejection; error message includes the row
  number; a full-row happy path produces the correct JSON keys.
- **Renderer** (`renderer.test.ts`) — header fields populated; en and cy; empty list; time
  normalisation; all seven fields preserved; last-updated formatting.
- **PDF** (`pdf-generator.test.ts`) — success path (mock `generatePdfFromHtml` /
  `savePdfToStorage`); correct render options; save failure; missing buffer; renderer exception;
  fallback title when `listTypeName` not in `LIST_TITLE_MAP`.
- **Template** (`commercial-court-kb-daily-cause-list.njk.test.ts`) — Cheerio structural
  assertions with a `COLUMN` index constant; correct headers/order; Additional Information column
  present vs absent; Welsh render via the `cy` locale object; locale-key parity
  `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())` (and the same for the `common`
  block). Use `createTestEnvironment([__dirname, webCoreViews])`.
- **Controller** (`index.test.ts`) — success (en + cy), missing `artefactId` 400, not-found 404,
  unsupported list type 400, missing blob 404, invalid data 400, server error 500, provenance
  data-source label. Artefact fixtures use `listTypeId: 999` with
  `listTypeName: "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST"` to prove ID-independence.
- **Publication registry** (`service.test.ts`) — dispatch to the new generator by `listTypeName`.
- **CI guard** (`libs/list-types/common/src/validation/guard.test.ts`) — must stay green (satisfied
  by the `validate*` export).
- **E2E** (`e2e-tests/tests/commercial-court-kb-daily-cause-list.spec.ts`) — one `@nightly`
  end-to-end journey: seed an artefact, open the page, assert table + headers, switch to Welsh,
  run an inline AxeBuilder WCAG check, and exercise keyboard navigation — all within the single
  journey test.

---

## 6. Clarifications Needed

1. **Exact Excel template column headers.** The converter matches on header strings. The ticket
   lists field *labels* (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information)
   but the published `.xlsx` template headers must match exactly (case/wording). Confirm the
   authoritative template.
2. **Court hierarchy seeding scope.** Does #802 include creating/associating the *Business and
   Property Courts (Rolls Building)* court/location, the *Civil* jurisdiction link, and the
   *Royal Courts of Justice Group* region — or do these reference rows already exist and we only
   add the `listTypeData` entry with `subJurisdictionIds: [1]`? Confirm whether any
   location/region seed changes are in scope.
3. **Important-information / caution copy block (EN + CY).** The style-guide reference page shows an
   important-information details block and caution/reporting text. Provide the exact English copy
   and its Welsh translation (currently placeholdered).
4. **Welsh translations.** English friendly name, page title, table headers, and all body copy need
   confirmed Welsh. Everything unknown is marked `[WELSH TRANSLATION REQUIRED: "..."]` pending sign-off.
5. **Layout — single flat list vs sub-sections.** The JSON is a flat array; confirm the page
   renders a single table (assumed) rather than grouping by venue/judge/date sub-sections.
6. **Default sensitivity.** Assumed `PUBLIC` (matches other daily cause lists). Confirm this list
   type is not restricted/classified.
</content>
