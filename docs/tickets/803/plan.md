# Technical Plan: Companies Winding Up (ChD) Daily Cause List (#803)

> This plan supersedes the earlier automated spec left in the issue comments. It keeps that
> spec's correct conclusions (dedicated module, single-variant handler, field set/order,
> `listTypeName`-only routing) but corrects several claims that do not match the current
> codebase — see **Discrepancies vs prior spec** and **CLARIFICATIONS NEEDED** below.

## 1. Technical Approach

Build a new **non-strategic** list-type module, modelled directly on the real
`libs/list-types/court-of-appeal-civil-daily-cause-list/` module (single-variant, single JSON
array root, no multi-sheet/multi-list complexity — closer to
`libs/list-types/ast-daily-hearing-list/` for the schema shape). The mandated field set/order
(`judge, time, venue, type, caseNumber, caseName, additionalInformation`) does not match the
shared `RCJ_EXCEL_CONFIG` (`venue, judge, time, caseNumber, caseDetails, hearingType,
additionalInformation`), so it cannot reuse that shared config — it needs its own schema, Excel
converter, model type, renderer, PDF template and page, exactly as the prior spec concluded.

Everything is routed and registered by the stable string `listTypeName` =
`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`. Numeric `ListType.id` and numeric
`sub_jurisdiction`/`location` DB ids are never referenced in application code — they exist only
as the (already-numeric) foreign keys inside the two TypeScript source-of-truth files
(`list-type-data.ts`, `location-data.ts`), which is the existing, established pattern for every
sibling list type.

Key architecture decisions:
- **New standalone package** `@hmcts/companies-winding-up-chd-daily-cause-list` under
  `libs/list-types/`, not a new key inside `rcj-standard-daily-cause-list`.
- **Single-variant page handler**: `createSimpleListTypeHandler` from
  `apps/web/src/pages/(list-types)/list-type-handler.ts` (real, confirmed — used by
  `court-of-appeal-civil-daily-cause-list`), not the multi-list
  `createMultiListGuardAndRender` (that's only for modules serving several list-type names from
  one page, e.g. RCJ standard).
- **New location required**: "Business and Property Courts Rolls Building" does **not**
  currently exist in `libs/location/src/location-data.ts` (verified — see discrepancies). It
  must be added there, mapped to `regions: [11]` (`"Royal Courts of Justice Group"`, confirmed
  present) and `subJurisdictions: [1]` (`"Civil Court"`, confirmed present).
- **No hand-written SQL.** `libs/list-types/common/src/list-type-data.ts` and
  `libs/location/src/location-data.ts` are the only files edited for reference data. Deploy-time
  seed SQL is generated from them by `apps/postgres/prisma/generate-seed-sql.ts` (confirmed —
  reads `listTypeData` and `locationData` directly and emits idempotent `INSERT ... ON
  CONFLICT`). Local dev seeding (`yarn db:seed`) reads the same two files via
  `seedLocationData()`/`seedListTypes()`.

## 2. Implementation Details

### 2.1 New module: `libs/list-types/companies-winding-up-chd-daily-cause-list/`

Modelled on `libs/list-types/court-of-appeal-civil-daily-cause-list/` and
`libs/list-types/ast-daily-hearing-list/` (for the flat array-of-objects shape). Confirmed real
file layout for a sibling module — this module will mirror it exactly:

```
libs/list-types/companies-winding-up-chd-daily-cause-list/
├── package.json                        # @hmcts/companies-winding-up-chd-daily-cause-list
├── tsconfig.json
└── src/
    ├── config.ts                       # moduleRoot, assets, schemaPath
    ├── index.ts                        # business-logic exports only (validator, pdf, email-summary)
    ├── models/
    │   └── types.ts                    # CompaniesWindingUpHearing / CompaniesWindingUpHearingList
    ├── schemas/
    │   └── companies-winding-up-chd-daily-cause-list.json   # draft-07, root type "array"
    ├── validation/
    │   ├── json-validator.ts           # validateCompaniesWindingUpChdDailyCauseList
    │   └── json-validator.test.ts      # one `it` per required field, real schema, no mocks
    ├── conversion/
    │   ├── companies-winding-up-chd-daily-cause-list-config.ts   # ExcelConverterConfig + registerConverterByName
    │   └── companies-winding-up-chd-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts                 # header (title/list date/last updated) + hearings passthrough
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts            # generateCompaniesWindingUpChdDailyCauseListPdf
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    ├── email-summary/
    │   ├── summary-builder.ts          # extractCaseSummary / re-export formatCaseSummaryForEmail
    │   └── summary-builder.test.ts
    └── locales/
        ├── en.ts
        └── cy.ts
```

`config.ts` (confirmed pattern from `court-of-appeal-civil-daily-cause-list/src/config.ts`):
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "assets/");
export const schemaPath = path.join(__dirname, "schemas/companies-winding-up-chd-daily-cause-list.json");
```

`models/types.ts`:
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

export type CompaniesWindingUpHearingList = CompaniesWindingUpHearing[];
```

`index.ts` — business logic exports only (per `@CLAUDE.md` config/index split):
```typescript
export { validateCompaniesWindingUpChdDailyCauseList } from "./validation/json-validator.js";
export { generateCompaniesWindingUpChdDailyCauseListPdf } from "./pdf/pdf-generator.js";
export { extractCaseSummary, formatCaseSummaryForEmail } from "./email-summary/summary-builder.js";
export { renderCompaniesWindingUpChdDailyCauseList } from "./rendering/renderer.js";
export type { CompaniesWindingUpHearing, CompaniesWindingUpHearingList } from "./models/types.js";
import "./conversion/companies-winding-up-chd-daily-cause-list-config.js"; // side-effect: registerConverterByName
```

`package.json` — copy the confirmed real shape from
`court-of-appeal-civil-daily-cause-list/package.json` (name/deps changed only):
```json
{
  "name": "@hmcts/companies-winding-up-chd-daily-cause-list",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": { "production": "./dist/index.js", "default": "./src/index.ts" },
    "./config": { "production": "./dist/config.js", "default": "./src/config.ts" }
  },
  "scripts": {
    "build": "tsc && yarn build:nunjucks && yarn build:schemas",
    "build:nunjucks": "mkdir -p dist/pdf && cd src/pdf && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pdf/$(dirname {}) && cp {} ../../dist/pdf/{}' \\;",
    "build:schemas": "mkdir -p dist/schemas && cp src/schemas/*.json dist/schemas/",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write --unsafe ."
  },
  "dependencies": {
    "@hmcts/list-types-common": "workspace:*",
    "@hmcts/pdf-generation": "workspace:*",
    "@hmcts/postgres-prisma": "workspace:*",
    "exceljs": "4.4.0",
    "luxon": "3.7.2",
    "nunjucks": "3.2.4"
  },
  "devDependencies": {
    "@types/luxon": "3.7.2",
    "@types/node": "24.10.4",
    "typescript": "6.0.3",
    "vitest": "4.1.10"
  },
  "peerDependencies": { "express": "^5.1.0" }
}
```

`tsconfig.json` — standard shape from `@CLAUDE.md`.

**JSON schema** (`src/schemas/companies-winding-up-chd-daily-cause-list.json`) — draft-07, root
`type: "array"`, required fields `judge, time, venue, type, caseNumber, caseName` (order as
specified), `additionalInformation` optional, no-HTML pattern on text fields, time pattern on
`time`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Companies Winding Up (ChD) Daily Cause List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["judge", "time", "venue", "type", "caseNumber", "caseName"],
    "properties": {
      "judge": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "time": { "type": "string", "pattern": "^\\d{1,2}([:.]\\d{2})?\\s*[ap]m\\s*$" },
      "venue": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "type": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseNumber": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseName": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "additionalInformation": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```
Note: the `time` pattern above matches `libs/list-types/common/src/conversion/validators.ts`
`TIME_PATTERN` (confirmed), which allows an optional space before am/pm.

**Validator wrapper** (mandatory per `@CLAUDE.md` list-type rule 6 — CI-guarded by
`libs/list-types/common/src/validation/guard.test.ts`, confirmed real):
```typescript
// src/validation/json-validator.ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateCompaniesWindingUpChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```

**Excel converter config** — confirmed real helpers `createConverter`, `registerConverterByName`,
`validateNoHtmlTags`, `validateTimeFormatSimple` all exist in `@hmcts/list-types-common`
(`libs/list-types/common/src/index.ts`, `.../conversion/validators.ts`,
`.../conversion/non-strategic-list-registry.ts`):
```typescript
// src/conversion/companies-winding-up-chd-daily-cause-list-config.ts
import { createConverter, type ExcelConverterConfig, registerConverterByName, validateNoHtmlTags, validateTimeFormatSimple } from "@hmcts/list-types-common";

export const COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Judge", r)] },
    { header: "Time", fieldName: "time", required: true, validators: [(v, r) => validateTimeFormatSimple(v, r)] },
    { header: "Venue", fieldName: "venue", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Type", fieldName: "type", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Type", r)] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Number", r)] },
    { header: "Case Name", fieldName: "caseName", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: false, validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)] }
  ],
  minRows: 1
};

registerConverterByName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST", createConverter(COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG));
```
(See **CLARIFICATIONS NEEDED** — `validateTimeFormatSimple` vs `validateTimeFormat` is unresolved.)

**Renderer / PDF generator / PDF template** — model directly on
`libs/list-types/court-of-appeal-civil-daily-cause-list/src/rendering/renderer.ts` and
`.../pdf/pdf-generator.ts`/`pdf-template.njk` but simplified to a single flat hearings array (no
`dailyHearings`/`futureJudgments` split — this list has no future-judgments concept per the
issue's JSON shape). Reuse `BasePdfGenerationOptions`, `configureNunjucks`, `createPdfErrorResult`,
`loadTranslations`, `PDF_BASE_STYLES`, `savePdfToStorage` from `@hmcts/list-types-common`
(all confirmed real exports).

**Email summary builder** — every sibling list-type module (confirmed: all ~30 modules under
`libs/list-types/`) has `src/email-summary/summary-builder.ts` exporting `extractCaseSummary`
and re-exporting `formatCaseSummaryForEmail`, wired into
`libs/notifications/src/notification/notification-service.ts`'s `EMAIL_BUILDER_REGISTRY` (used
for case-subscription email digests). This was **omitted from the prior spec's file tree** —
see discrepancies. Model on
`court-of-appeal-civil-daily-cause-list/src/email-summary/summary-builder.ts`:
```typescript
import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CompaniesWindingUpHearing, CompaniesWindingUpHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: CompaniesWindingUpHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case name", value: hearing.caseName || "" }
  ];
}

export function extractCaseSummary(jsonData: CompaniesWindingUpHearingList): CaseSummary[] {
  return jsonData.map(mapHearingToSummary);
}
```

**Locales** (`src/locales/en.ts` / `cy.ts`) — **CONFIRMED**: copy sourced directly from the live
pip-frontend locale files
(`pip-frontend/src/main/resources/locales/{en,cy}/companies-winding-up-chd-daily-cause-list.json`):

English (`en.ts`):
- `pageTitle` / `heading`: `"Companies Winding Up (Chancery Division) Daily Cause List"`
- `venueName`: `"Rolls Building"`
- `addressLine1`: `"Fetter Lane, London"`
- `addressLine2`: `"EC4A 1NL"`
- `importantInformationHeading1`: `"Company Insolvency Pro Bono Scheme"`
- `importantInformationLine1`: `"The Company Insolvency Pro Bono Scheme provides free legal advice and/or representation in court on Wednesdays. If you have a case listed in the winding up court, please come to Consultation Room 17 on the 2nd Floor of the Rolls Building to speak with a barrister on Wednesday morning. You can also email in advance on admin@companyinsolvencyscheme.com."`
- `tableHeaders`: `"Judge", "Time", "Venue", "Type", "Case number", "Case name", "Additional information"`
  — note the exact casing (lower-case "number"/"name") from the reference copy; use this, not the
  issue's title-case versions.

Welsh (`cy.ts`) — direct confirmed equivalents, **no** `[WELSH TRANSLATION REQUIRED]` markers
needed for these fields:
- `pageTitle` / `heading`: `"Rhestr Achosion Dyddiol Dirwyn Cwmnïau i Ben (Adran Siawnsri)"`
- `venueName`: `"Rolls Building"`
- `addressLine1`: `"Fetter Lane, London"`
- `addressLine2`: `"EC4A 1NL"`
- `importantInformationHeading1`: `"Cynllun Pro Bono Ansolfedd Cwmni"`
- `importantInformationLine1`: `"Mae'r Cynllun Pro Bono Ansolfedd Cwmnïau yn darparu cyngor cyfreithiol a / neu gynrychiolaeth am ddim yn y llys ar ddydd Mercher. Os oes gennych achos wedi'i restru yn y llys dirwyn i ben, dewch i Ystafell Ymgynghori 17 ar 2il Lawr Adeilad y Rolls i siarad â bargyfreithiwr fore Mercher. Gallwch hefyd anfon e-bost at admin@companyinsolvencyscheme.com ymlaen llaw."`
- `tableHeaders`: `"Barnwr", "Amser", "Leoliad", "Math", "Rhif yr achos", "Enw'r achos", "Gwybodaeth ychwanegol"`

The shared `common.*` strings (`factLinkText`, `searchCasesTitle`, `dataSource`, `backToTop`, etc.)
are not part of the pip-frontend list-specific file (they're shared across all list types there) —
reuse the existing shared-copy pattern from
`court-of-appeal-civil-daily-cause-list/src/locales/{en,cy}.ts` for those.

The list-type registry friendly name (`ListTypeData.englishFriendlyName`/`welshFriendlyName`, used
on admin upload screens, distinct from the page's own `pageTitle`) keeps the issue's abbreviated
"(ChD)" form for English; the Welsh registry friendly name uses the confirmed page title above
(`"Rhestr Achosion Dyddiol Dirwyn Cwmnïau i Ben (Adran Siawnsri)"`) since no separate abbreviated
Welsh form exists.

### 2.2 New page: `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/`

Confirmed real sibling pattern — `apps/web/src/pages/(list-types)/court-of-appeal-civil-daily-cause-list/`:
```
├── index.ts                                                    # GET via createSimpleListTypeHandler
├── companies-winding-up-chd-daily-cause-list.njk
├── index.test.ts
└── companies-winding-up-chd-daily-cause-list.njk.test.ts
```

`index.ts` (confirmed pattern from `list-type-handler.ts`'s real signature):
```typescript
import {
  type CompaniesWindingUpHearingList,
  companiesWindingUpChdDailyCauseListCy as cy,
  companiesWindingUpChdDailyCauseListEn as en,
  renderCompaniesWindingUpChdDailyCauseList
} from "@hmcts/companies-winding-up-chd-daily-cause-list";
import { schemaPath } from "@hmcts/companies-winding-up-chd-daily-cause-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const ROUTES = ["/companies-winding-up-chd-daily-cause-list"];

const validate = createJsonValidator(schemaPath);
const SUPPORTED_LIST_TYPE = "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<CompaniesWindingUpHearingList>({
  en,
  cy,
  validate,
  logPrefix: "companies-winding-up-chd-daily-cause-list",
  guardArtefact: (artefact, res) => {
    if (artefact.listTypeName !== SUPPORTED_LIST_TYPE) {
      res.status(400).render("errors/common", {
        en, cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
      return true;
    }
    return false;
  },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderCompaniesWindingUpChdDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("companies-winding-up-chd-daily-cause-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
```

`companies-winding-up-chd-daily-cause-list.njk` — model on the confirmed real
`court-of-appeal-civil-daily-cause-list.njk` structure: `{% extends "layouts/base-template.njk"
%}`, `{% block page_content %}`, `govukDetails` for "Important information", the
`case-search-input` / `hearings-table` id/class combination that
`apps/web/src/assets/js/table-search.ts` (confirmed real, already global) auto-wires with no
per-module JS needed, `<table class="govuk-table hearings-table">` with the seven `<th scope="col">`
headers in issue order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information),
`{% for hearing in hearings %}` for one flat table (no daily/future split), data-source line,
back-to-top anchor.

### 2.3 Registration touch-points (existing files to edit)

Confirmed exhaustively by tracing every real registry/import site used by
`court-of-appeal-civil-daily-cause-list` and `ast-daily-hearing-list`. The prior spec's list of
4 touch-points was **incomplete** — the full, verified list is:

1. **`libs/list-types/common/src/list-type-data.ts`** — add one `ListTypeData` entry:
   ```typescript
   {
     name: "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Companies Winding Up (ChD) Daily Cause List",
     welshFriendlyName: "Rhestr Achosion Dyddiol Dirwyn Cwmnïau i Ben (Adran Siawnsri)",
     provenance: "CFT_IDAM",
     urlPath: "companies-winding-up-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     shortenedFriendlyName: "Companies Winding Up (ChD) Daily Cause List",
     subJurisdictionIds: [10] // High Court — CONFIRMED by product (not Civil Court)
   }
   ```
2. **`libs/location/src/location-data.ts`** — add a new `Location` entry (next free
   `locationId`; the file's highest current id is `25`, so `26`):
   ```typescript
   {
     locationId: 26,
     name: "Business and Property Courts Rolls Building",
     welshName: "Llysoedd Busnes ac Eiddo - Adeilad Rolls",
     regions: [11],          // "Royal Courts of Justice Group" — confirmed exists, currently has NO locations
     subJurisdictions: [10]  // "High Court" — CONFIRMED by product (not Civil Court); id 10 verified in location-data.ts (jurisdictionId 1 = Civil)
   }
   ```
   Name/Welsh name and sub-jurisdiction now **CONFIRMED**. This is new reference data, not an
   existing row — see discrepancies. No SQL is written by hand; `yarn db:generate`/`yarn db:seed`
   locally and `generate-seed-sql.ts` at deploy time pick this up automatically.
3. **`libs/publication/src/processing/service.ts`** — add to `PDF_GENERATOR_REGISTRY`:
   ```typescript
   COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST: (p) =>
     generateCompaniesWindingUpChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as CompaniesWindingUpHearingList }),
   ```
   plus the corresponding import line at the top of the file (confirmed keyed by string
   `listTypeName`, not numeric id).
4. **`libs/notifications/src/notification/notification-service.ts`** — add to
   `EMAIL_BUILDER_REGISTRY` (confirmed real registry, **missed by the prior spec entirely**):
   ```typescript
   COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST: {
     extract: extractCompaniesWindingUpSummary as SummaryExtractor,
     format: formatCompaniesWindingUpSummaryForEmail
   },
   ```
   plus the corresponding named import at the top of the file.
5. **Excel converter self-registration** — `registerConverterByName` runs as a side effect of
   importing the new package. Two admin pages need an explicit side-effect import so the
   converter is registered in that request's module graph (confirmed pattern — every sibling
   non-strategic module is imported this way in both files):
   - `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`
   - `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`
   ```typescript
   import "@hmcts/companies-winding-up-chd-daily-cause-list"; // Register Companies Winding Up converter
   ```
6. **`apps/web/src/app.ts`** — add `moduleRoot` import and push it into the `modulePaths` array
   passed to `configureGovuk` (confirmed pattern — every list-type module with a page/template
   does this so Nunjucks can find its templates).
7. **Root `tsconfig.json`** — add `"@hmcts/companies-winding-up-chd-daily-cause-list":
   ["libs/list-types/companies-winding-up-chd-daily-cause-list/src"]` to `compilerOptions.paths`
   (confirmed required — every workspace package has an entry here).
8. **`apps/web/vite.build.ts`** — only if the new module ships an `assets/` directory (CSS/JS);
   the sibling `court-of-appeal-civil-daily-cause-list` module exports an `assets` path from
   `config.ts` but has no actual `assets/` directory on disk, so this step can likely be skipped
   — confirm no bespoke styling/JS is needed beyond the shared table-search behaviour.

**Not required** (corrects the prior spec): no `.sql` file exists or should be created/edited.
`apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`, referenced
twice in the prior spec's comments, does not exist anywhere in the repository.

### 2.4 Database schema changes

None. No new Prisma models/columns — `list_type`, `location`, `region`,
`location_region`/`sub_jurisdiction` link tables already exist and are populated purely from
`list-type-data.ts` / `location-data.ts` via the existing generator. Do not hand-write SQL, do
not reference `ListType.id` or `SubJurisdiction.id`/`Location.id` outside these two TS files.

## 3. Error Handling & Edge Cases

- **Missing required Excel column** → `convertExcelToJson` (via `ExcelConverterConfig.fields`)
  throws with the header name; surfaced on `/non-strategic-upload` as a file-level error.
- **Empty required cell** → row-specific error from the field validator (`validateNoHtmlTags`
  throws with row number when value is empty/HTML — confirm exact empty-value behaviour of
  `validateNoHtmlTags` while implementing; existing sibling tests demonstrate the message
  format).
- **HTML tag in a text cell** → `validateNoHtmlTags` throws `"'[Field]' in row [n] must not
  contain HTML tags."` pattern (exact message format to confirm from `excel-to-json.ts`
  implementation).
- **Invalid time format** (`time` not matching `TIME_PATTERN`) →
  `validateTimeFormatSimple` throws with row number.
- **Empty sheet / zero data rows** → `minRows: 1` on the converter config rejects it.
- **JSON fails schema validation post-conversion** → `validateCompaniesWindingUpChdDailyCauseList`
  returns `{ isValid: false, errors: [...] }`; caller (processing pipeline) rejects the artefact.
- **Wrong `listTypeName` routed to this page** → `guardArtefact` returns `true`, renders
  `errors/common` with HTTP 400 (never render the list template for a mismatched artefact).
- **Missing/malformed `artefactId` query param** → handled generically by
  `createSimpleListTypeHandler` (confirm its existing not-found/error behaviour is sufficient;
  no bespoke handling needed in this module).
- **Welsh translation gaps** — until confirmed copy is supplied, `cy.ts` values are
  `[WELSH TRANSLATION REQUIRED: "..."]` placeholders; this must not block merging the technical
  scaffolding but must be tracked as a follow-up before the page is enabled in Welsh for real
  users.
- **Optional `additionalInformation`** — must render correctly (empty cell) whether absent from
  the JSON entirely or present as an empty string; schema treats it as non-required, converter
  treats it as `required: false`.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| List created under Business and Property Courts Rolls Building, linked to Civil jurisdiction (via High Court sub-jurisdiction) / RCJ Group region | New `Location` entry (`regions: [11]`, `subJurisdictions: [10]`) in `location-data.ts` + `ListTypeData.subJurisdictionIds: [10]` | Manual check on `/non-strategic-upload`: selecting the new location filters/shows the new list type; `yarn db:seed` then query `location`, `sub_jurisdiction`, `list_type` tables |
| Fields created in order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) | JSON schema `required` array + `properties` order; Excel converter `fields` array in same order | `json-validator.test.ts` (one `it` per required field) + `...-config.test.ts` (asserts converted JSON key order matches) |
| Published via Excel upload, converted to JSON | `registerConverterByName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST", ...)`; wired into `/non-strategic-upload` via `convertExcelForListTypeName` | `...-config.test.ts` round-trips a sample `.xlsx`-shaped buffer to the exact JSON in the issue |
| Validation schema + style guide created | Schema file + this plan's page/PDF templates matching the referenced PIP frontend structure | `json-validator.test.ts`; manual visual comparison against the reference URL |
| PDF of the hearing list created | `generateCompaniesWindingUpChdDailyCauseListPdf` registered in `PDF_GENERATOR_REGISTRY` | `pdf-generator.test.ts`; manual: upload a sample file, confirm PDF artefact generated |
| Matches reference style guide structure | Page/PDF templates modelled on the confirmed sibling templates, header/court-address/table structure, using the confirmed pip-frontend copy (§2.1) | Manual comparison against the reference URL |
| JSON follows the specified array-of-objects shape | `CompaniesWindingUpHearing`/`...HearingList` model type; converter output order | `...-config.test.ts` snapshot-style assertion against the issue's literal example JSON |

## 5. Confirmed Decisions (previously CLARIFICATIONS NEEDED — all resolved by product/stakeholder)

All items below were open questions in the original plan; all have now been answered directly by
the ticket assignee and are locked in for implementation:

1. **Court address & "Important information" copy** — **RESOLVED.** Sourced from the authoritative
   pip-frontend locale files
   (`pip-frontend/src/main/resources/locales/{en,cy}/companies-winding-up-chd-daily-cause-list.json`).
   Exact English/Welsh copy recorded in §2.1 "Locales" above. This supersedes all placeholder text.
2. **Location reference data (name/Welsh name)** — **RESOLVED.** Confirmed name:
   `"Business and Property Courts Rolls Building"`, confirmed Welsh name:
   `"Llysoedd Busnes ac Eiddo - Adeilad Rolls"`. This location genuinely does not exist yet in
   `libs/location/src/location-data.ts` (verified — all 25 current locations checked, none maps to
   region 11) and must be added as `locationId: 26` per §2.3 point 2.
3. **Excel download** — **RESOLVED: do NOT implement.** No `EXCEL_GENERATOR_REGISTRY` entry, no
   Excel-download link/route work for this list type. The style guide/template must not include an
   "Download Excel" link. (The source-Excel-download question from the prior spec is moot — this
   feature is explicitly out of scope.)
4. **Time format strictness** — **RESOLVED: use `validateTimeFormatSimple`** (no hour-range check;
   accepts the issue's examples `9am`, `10:30pm`). Already reflected in §2.1's Excel converter
   config.
5. **Provenance value** — **RESOLVED: `CFT_IDAM`**. Already reflected in §2.3 point 1's
   `ListTypeData` entry.
6. **Route / `urlPath`** — **RESOLVED: `companies-winding-up-chd-daily-cause-list`** for both the
   public route and `urlPath`, matching the reference URL's path segment. No change from the
   plan's existing assumption.
7. **Sub-jurisdiction** — **RESOLVED: `"High Court"` (`subJurisdictionId: 10`), NOT `"Civil Court"`
   (id 1) as this plan previously assumed.** Verified present in `libs/location/src/location-data.ts`:
   `{ subJurisdictionId: 10, name: "High Court", welshName: "Yr Uchel Lys", jurisdictionId: 1 }` —
   `jurisdictionId: 1` is Civil, so this still satisfies the issue's "Civil jurisdiction" acceptance
   criterion, but via the High Court sub-jurisdiction rather than the generic Civil Court one. **All
   `subJurisdictionIds`/`subJurisdictions` references in §2.3 points 1 and 2, and in the §4
   acceptance criteria table, have been updated from `[1]` to `[10]`.**
8. **Email-summary special-category warning** — **RESOLVED: yes**, `SPECIAL_CATEGORY_DATA_WARNING`
   applies to this list type's case-subscription emails, matching every sibling civil/family list.
   Already reflected in §2.1's email-summary builder snippet.
