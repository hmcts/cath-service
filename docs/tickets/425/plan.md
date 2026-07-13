# Technical Plan: Issue #425 - UT Non-Strategic Publishing (UTCC, UTLC, UTAAC)

## Technical Approach

Three new non-strategic list type modules are required, each following the same pattern as `libs/list-types/care-standards-tribunal-weekly-hearing-list`. Each module is self-contained with its own Excel converter config, JSON schema, TypeScript types, renderer, PDF generator, email summary extractor, page controller, and Nunjucks templates. Once all three modules are created, a set of shared integration points are updated once each.

The three list types and their IDs (next free IDs in `list-type-data.ts` are 28, 29, 30):

| ID | Name (converter/DB key) | Module dir | Region |
|----|-------------------------|------------|--------|
| 28 | `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list` | National |
| 29 | `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-lands-chamber-daily-hearing-list` | National |
| 30 | `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-administrative-appeals-chamber-daily-hearing-list` | London |

Abbreviations used throughout: UTCC = UT Tax and Chancery Chamber, UTLC = UT Lands Chamber, UTAAC = UT Administrative Appeals Chamber.

## Implementation Details

### File Structure

Each module follows the CST reference pattern exactly:

```
libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── config.test.ts
    ├── conversion/
    │   └── utcc-config.ts
    ├── models/
    │   └── types.ts
    ├── schemas/
    │   └── upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.json
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    └── pages/
        ├── index.ts
        ├── index.test.ts
        ├── upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk
        ├── en.ts
        └── cy.ts
```

The UTLC and UTAAC modules have the same structure with their respective names replacing `utcc` and `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`.

### package.json

Identical to CST, with the module name updated. The `build:nunjucks` script copies both `pages/*.njk` and `pdf/*.njk` to `dist/`. The `build:schemas` script copies JSON schemas to `dist/schemas/`.

```json
{
  "name": "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list",
  "scripts": {
    "build": "tsc && yarn build:nunjucks && yarn build:schemas",
    "build:nunjucks": "mkdir -p dist/pages && cd src/pages && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pages/$(dirname {}) && cp {} ../../dist/pages/{}' \\; && cd ../.. && mkdir -p dist/pdf && cd src/pdf && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pdf/$(dirname {}) && cp {} ../../dist/pdf/{}' \\;",
    "build:schemas": "mkdir -p dist/schemas && cp src/schemas/*.json dist/schemas/"
  }
}
```

### config.ts

Each module exports `moduleRoot`, `pageRoutes` (with the URL-path prefix), and `assets`:

```typescript
// libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/config.ts
export const pageRoutes = {
  path: path.join(__dirname, "pages"),
  prefix: "/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list"
};
```

URL paths:
- UTCC: `/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`
- UTLC: `/upper-tribunal-lands-chamber-daily-hearing-list`
- UTAAC: `/upper-tribunal-administrative-appeals-chamber-daily-hearing-list`

### index.ts

Side-effect import of the converter config to register the converter on module load, plus re-exports of email summary, types, PDF generator, and renderer:

```typescript
import "./conversion/utcc-config.js";
export type { ValidationResult } from "@hmcts/publication";
export * from "./email-summary/summary-builder.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

### TypeScript Types (models/types.ts)

**UTCC** (8 fields):
```typescript
export interface UtccHearing {
  time: string;
  caseReference: string;
  caseName: string;
  judges: string;
  members: string;
  hearingType: string;
  venue: string;
  additionalInformation?: string;
}
export type UtccHearingList = UtccHearing[];
```

**UTLC** (9 fields, adds `modeOfHearing`):
```typescript
export interface UtlcHearing {
  time: string;
  caseReference: string;
  caseName: string;
  judges: string;
  members: string;
  hearingType: string;
  venue: string;
  modeOfHearing: string;
  additionalInformation?: string;
}
export type UtlcHearingList = UtlcHearing[];
```

**UTAAC** (9 fields, adds `appellant` and `modeOfHearing`, renames `caseReference` to `caseReferenceNumber`):
```typescript
export interface UtaacHearing {
  time: string;
  appellant: string;
  caseReferenceNumber: string;
  caseName: string;
  judges: string;
  members: string;
  modeOfHearing: string;
  venue: string;
  additionalInformation?: string;
}
export type UtaacHearingList = UtaacHearing[];
```

`additionalInformation` is optional in all three types (and marked not-required in the JSON schema). `members` is required in all three.

### JSON Schemas (schemas/<name>.json)

Each schema is a JSON Schema Draft-07 array of objects. Key rules shared by all three:
- `minItems: 1` (at least one row)
- `time`: required, no-HTML string, free text (time format is not currently validated at schema level — see open questions)
- `members`: required, no-HTML string
- `additionalInformation`: optional, no-HTML string (not in `required` array)
- All other listed text fields: required, no-HTML string

The no-HTML pattern (same as CST): `"^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"`

UTCC required fields: `time`, `caseReference`, `caseName`, `judges`, `members`, `hearingType`, `venue`
UTLC required fields: `time`, `caseReference`, `caseName`, `judges`, `members`, `hearingType`, `venue`, `modeOfHearing`
UTAAC required fields: `time`, `appellant`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `modeOfHearing`, `venue`

### Converter Config (conversion/<abbr>-config.ts)

Follows the CST pattern. Registers by ID and by name. UTCC example:

```typescript
import {
  createConverter,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

export const UTCC_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Time", fieldName: "time", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Time", r)] },
    { header: "Case Reference", fieldName: "caseReference", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Case Reference", r)] },
    { header: "Case Name", fieldName: "caseName", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    { header: "Judge(s)", fieldName: "judges", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Judge(s)", r)] },
    { header: "Member(s)", fieldName: "members", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Member(s)", r)] },
    { header: "Hearing Type", fieldName: "hearingType", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Hearing Type", r)] },
    { header: "Venue", fieldName: "venue", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: false,
      validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)] }
  ],
  minRows: 1
};

const utccConverter = createConverter(UTCC_EXCEL_CONFIG);
registerConverter(28, utccConverter);
registerConverterByName("UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST", utccConverter);
```

UTLC adds `{ header: "Mode of Hearing", fieldName: "modeOfHearing", required: true, ... }`. Registered with ID 29 and name `UT_LANDS_CHAMBER_DAILY_HEARING_LIST`.

UTAAC has `appellant` and `caseReferenceNumber` (not `caseReference`), plus `modeOfHearing`, and drops `hearingType`. Registered with ID 30 and name `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST`.

### Renderer (rendering/renderer.ts)

The renderer mirrors the CST pattern. It formats `time` as-is (pass-through — no date parsing needed, it is a time string). The `contentDate` passed in from the artefact is formatted as the hearing list date in the header.

```typescript
export interface RenderOptions {
  locale: string;
  courtName: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    hearingDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: UtccHearing[];  // (or UtlcHearing[] / UtaacHearing[])
}
```

The `hearingDate` replaces `weekCommencingDate` from CST because these are daily lists. It is formatted from `contentDate` using `formatDisplayDate`.

### Opening Statements in en.ts

The opening statement text is placed in `en.ts` as a structured object with links. The "Observe a court or tribunal hearing" link is masked to `https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing` as required.

**UTCC opening statement fields in en.ts:**
```typescript
openingStatement: {
  contactText: "A representative of the media, or any other person, wishing to attend a remote hearing should contact uttc@justice.gov.uk and we will arrange for your attendance.",
  observeLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
  observeLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"
}
```

**UTLC opening statement fields in en.ts:**
```typescript
openingStatement: {
  contactText: "If a representative of the media or a member of the public wishes to attend a Cloud Video Platform (CVP) hearing they should contact the Lands Chamber listing section Lands@justice.gov.uk who will provide further information.",
  observeLinkText: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
  observeLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"
}
```

**UTAAC opening statement** is longer and contains multiple paragraphs for England/Wales and Scotland, with contact emails `adminappeals@justice.gov.uk` and `UTAACMailbox@justice.gov.uk`. The "Observe" link text/URL is confirmed to appear in UTAAC (the ticket requires the link wherever displayed — see open questions for clarification). The full text is structured as an array of paragraph strings in `en.ts`.

Welsh (`cy.ts`) uses `[TRANSLATE: "..."]` markers for all strings pending content team delivery.

### Email Summary Builder (email-summary/summary-builder.ts)

All three share the same per-hearing fields: **Date** (from `artefact.contentDate`), **Time**, **Case Reference Number**. The date value is the content date of the artefact (passed in as a formatted string), not a field from the row data.

```typescript
export function extractCaseSummary(jsonData: UtccHearingList, contentDate: string): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Date", value: contentDate },
    { label: "Time", value: hearing.time || "" },
    { label: "Case Reference Number", value: hearing.caseReference || "" }
  ]);
}
```

Note: UTAAC uses `hearing.caseReferenceNumber` rather than `hearing.caseReference`. The `formatCaseSummaryForEmail` and `SPECIAL_CATEGORY_DATA_WARNING` are re-exported from `@hmcts/list-types-common` as in CST.

The current CST `extractCaseSummary` signature takes only `jsonData`. The UT modules will need to accept `contentDate` as a second parameter. Check how the email summary is called in `notification-service.ts` — if the `extract` function signature is `(jsonData: unknown) => CaseSummary[]`, contentDate will need to be baked in or the interface extended. The simplest approach is to have the `summary-builder.ts` export a factory function `createExtractCaseSummary(contentDate: string)` that returns a `SummaryExtractor`-compatible function. Alternatively, the summary builder can expose a wrapper that reads the date from the first hearing row if available. This is a design decision to resolve before implementation (see open questions).

### PDF Generator (pdf/pdf-generator.ts)

Mirrors the CST pattern. UTAAC has 9 columns which may require a landscape page orientation. Pass `landscape: true` to `generatePdfFromHtml` if that function supports it, or apply a CSS `@page { size: A4 landscape; }` rule in the `pdf-template.njk` for UTAAC only.

### Nunjucks Templates

**Style guide page (`pages/<name>.njk`):** Extends `layouts/base-template.njk`, uses `{% block page_content %}`. Renders a GOV.UK table with the appropriate columns per list type. Includes the opening statement in a `govuk-details` component (open by default, as per CST pattern). Contains a client-side search input and a back-to-top link. Table columns match the field sets above.

**PDF template (`pdf/pdf-template.njk`):** Standalone HTML with embedded CSS from `pdfStyles`. Renders the same table columns. UTAAC pdf-template includes a `@page { size: A4 landscape; }` style override.

### Integration Points

#### 1. `libs/location/src/location-data.ts`

Add a "National" region (regionId 7) to `regions`. Check: regionId 7 is currently `Yorkshire` — there is no "National" region. A new entry is required:

```typescript
{
  regionId: 7,
  name: "National",
  welshName: "[TRANSLATE: National]"
}
```

Wait — regionId 7 is taken by `Yorkshire` in the existing data. The next free regionId is 7. Check again: existing regions are 1–6. RegionId 7 is free. But Yorkshire uses regionId 6? Let me re-read: `regionId: 6, name: "Yorkshire"`. So regionId 7 is free and can be used for "National".

Add three new sub-jurisdictions (subJurisdictionId 10, 11, 12) under jurisdiction 4 (Tribunal):

```typescript
{
  subJurisdictionId: 10,
  name: "Upper Tribunal Tax and Chancery Chamber",
  welshName: "[TRANSLATE: Upper Tribunal Tax and Chancery Chamber]",
  jurisdictionId: 4
},
{
  subJurisdictionId: 11,
  name: "Upper Tribunal Lands Chamber",
  welshName: "[TRANSLATE: Upper Tribunal Lands Chamber]",
  jurisdictionId: 4
},
{
  subJurisdictionId: 12,
  name: "Upper Tribunal Administrative Appeals Chamber",
  welshName: "[TRANSLATE: Upper Tribunal Administrative Appeals Chamber]",
  jurisdictionId: 4
}
```

Add three new locations (or reuse a virtual location like the SJP "Single Justice Procedure" entry). Because UT (T&CC) and UT (LC) are "National" and UT (AAC) is "London", virtual locations are needed that cover those regions:

```typescript
{
  locationId: 13,
  name: "Upper Tribunal Tax and Chancery Chamber",
  welshName: "[TRANSLATE: Upper Tribunal Tax and Chancery Chamber]",
  regions: [7],   // National
  subJurisdictions: [10]
},
{
  locationId: 14,
  name: "Upper Tribunal Lands Chamber",
  welshName: "[TRANSLATE: Upper Tribunal Lands Chamber]",
  regions: [7],   // National
  subJurisdictions: [11]
},
{
  locationId: 15,
  name: "Upper Tribunal Administrative Appeals Chamber",
  welshName: "[TRANSLATE: Upper Tribunal Administrative Appeals Chamber]",
  regions: [1],   // London (regionId 1)
  subJurisdictions: [12]
}
```

#### 2. `libs/location/src/list-type-data.ts`

Append three entries at the end of `listTypeData`. The `shortenedFriendlyName` field carries the upload-form label from the ticket:

```typescript
{
  id: 28,
  name: "UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST",
  englishFriendlyName: "Upper Tribunal Tax and Chancery Chamber Daily Hearing list",
  welshFriendlyName: "[TRANSLATE: Upper Tribunal Tax and Chancery Chamber Daily Hearing list]",
  provenance: "MANUAL_UPLOAD",
  urlPath: "upper-tribunal-tax-and-chancery-chamber-daily-hearing-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "UT (T and CC) Daily Hearing List",
  subJurisdictionIds: [10]
},
{
  id: 29,
  name: "UT_LANDS_CHAMBER_DAILY_HEARING_LIST",
  englishFriendlyName: "Upper Tribunal (Lands Chamber) Daily Hearing list",
  welshFriendlyName: "[TRANSLATE: Upper Tribunal (Lands Chamber) Daily Hearing list]",
  provenance: "MANUAL_UPLOAD",
  urlPath: "upper-tribunal-lands-chamber-daily-hearing-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "UT (LC) Daily Hearing List",
  subJurisdictionIds: [11]
},
{
  id: 30,
  name: "UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST",
  englishFriendlyName: "Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list",
  welshFriendlyName: "[TRANSLATE: Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list]",
  provenance: "MANUAL_UPLOAD",
  urlPath: "upper-tribunal-administrative-appeals-chamber-daily-hearing-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "UT (AAC) Daily Hearing List",
  subJurisdictionIds: [12]
}
```

Note: IDs 28–30 are the next free IDs as of the current `list-type-data.ts` (last entry is 27). Confirm no parallel branch has added entries before merging.

#### 3. `libs/publication/src/processing/service.ts`

Add three entries to `PDF_GENERATOR_REGISTRY`. Import the new generator functions and types:

```typescript
import {
  generateUtccDailyHearingListPdf,
  type UtccHearingList
} from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
import {
  generateUtlcDailyHearingListPdf,
  type UtlcHearingList
} from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list";
import {
  generateUtaacDailyHearingListPdf,
  type UtaacHearingList
} from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list";

// Inside PDF_GENERATOR_REGISTRY:
UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST: (p) =>
  generateUtccDailyHearingListPdf({ ...p, jsonData: p.jsonData as UtccHearingList }),
UT_LANDS_CHAMBER_DAILY_HEARING_LIST: (p) =>
  generateUtlcDailyHearingListPdf({ ...p, jsonData: p.jsonData as UtlcHearingList }),
UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST: (p) =>
  generateUtaacDailyHearingListPdf({ ...p, jsonData: p.jsonData as UtaacHearingList }),
```

#### 4. `libs/notifications/src/notification/notification-service.ts`

Add three entries to `EMAIL_BUILDER_REGISTRY`. Import the extract and format functions:

```typescript
import {
  extractCaseSummary as extractUtccSummary,
  formatCaseSummaryForEmail as formatUtccSummaryForEmail
} from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
// (similar for UTLC and UTAAC)

// Inside EMAIL_BUILDER_REGISTRY:
UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST: {
  extract: extractUtccSummary as SummaryExtractor,
  format: formatUtccSummaryForEmail
},
```

Note: If `extractCaseSummary` in the UT modules has a different signature from `SummaryExtractor` (due to the `contentDate` parameter), the factory/wrapper approach must be resolved first (see open questions).

#### 5. `apps/web/src/app.ts`

Add imports and router registration in the same block as `careStandardsTribunalRoutes`:

```typescript
import {
  moduleRoot as utccModuleRoot,
  pageRoutes as utccRoutes
} from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/config";
import {
  moduleRoot as utlcModuleRoot,
  pageRoutes as utlcRoutes
} from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list/config";
import {
  moduleRoot as utaacModuleRoot,
  pageRoutes as utaacRoutes
} from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/config";

// In modulePaths array:
utccModuleRoot,
utlcModuleRoot,
utaacModuleRoot,

// In router registration block:
app.use(await createSimpleRouter(utccRoutes));
app.use(await createSimpleRouter(utlcRoutes));
app.use(await createSimpleRouter(utaacRoutes));
```

#### 6. `libs/list-search-config/src/repository/queries.ts`

This file exposes the `upsert` function used by the seed/admin code to configure which fields are used for artefact search indexing. The UT list types need rows in `ListSearchConfig` so that case-number and case-name subscriptions work.

This is typically applied via a migration or seed script rather than by modifying `queries.ts` itself. Confirm with the team whether a seed script (`e2e-tests/utils/seed-list-types.ts` style) or a Prisma migration is the correct mechanism for inserting `ListSearchConfig` rows. The field mapping for each:
- UTCC: `caseNumberFieldName: "caseReference"`, `caseNameFieldName: "caseName"`
- UTLC: `caseNumberFieldName: "caseReference"`, `caseNameFieldName: "caseName"`
- UTAAC: `caseNumberFieldName: "caseReferenceNumber"`, `caseNameFieldName: "caseName"`

#### 7. Root `tsconfig.json`

Add three path mappings:

```json
"@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list": [
  "libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src"
],
"@hmcts/upper-tribunal-lands-chamber-daily-hearing-list": [
  "libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src"
],
"@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list": [
  "libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src"
]
```

The `/config` sub-path is resolved automatically in the same way as other modules via the `exports` field in each `package.json`.

## Error Handling and Edge Cases

- **Missing artefactId**: Return 400, render `errors/common` — same as CST.
- **Artefact not found in DB**: Return 404, render `errors/common`.
- **JSON file missing from storage**: Return 404, render `errors/common`.
- **Schema validation failure**: Return 400, render `errors/common`. Log validation errors server-side (no details to client).
- **PDF generation failure**: Log warning, continue — the publication still succeeds without a PDF (matches existing behaviour in `service.ts`).
- **Notification failure**: Log error, do not rethrow — matches existing notification error handling.
- **`additionalInformation` absent in upload**: The field is optional in the schema and type (`?`). The template must handle absent/undefined gracefully with `{% if hearing.additionalInformation %}` or by defaulting to an empty string in the renderer.
- **UT (AAC) 9-column PDF overflow**: UTAAC has one extra column (Appellant) compared to UTCC. Use landscape orientation in the PDF template as a precaution.
- **Converter registration at module load**: The side-effect import in `index.ts` ensures converters are registered when the module is first imported. Both ID-based and name-based registration handle database ID drift.

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| Validation schemas created | JSON schema files in `schemas/` for each module; `createJsonValidator` used in page controller |
| Error handling in validation | `GET` handler returns 400 with `errors/common` on schema validation failure; converter validators reject HTML tags and enforce required fields |
| Valid publications saved via current method | Existing artefact storage unchanged; new list types are processed through the same pipeline in `service.ts` |
| List types classified and user groups decided | `defaultSensitivity: "Public"` set in `list-type-data.ts` entries; `isNonStrategic: true` flags non-strategic route |
| New PDF template for each list | `pdf/pdf-template.njk` created per module with correct columns |
| Unified email summary format | `extractCaseSummary` returns Date, Time, Case Reference Number per hearing; `formatCaseSummaryForEmail` from `@hmcts/list-types-common` used |
| Email summary fields: Date, Time, Case Reference | Implemented in `summary-builder.ts` for all three |
| New style guide for each list | `pages/<name>.njk` with GOV.UK table component, opening statement, and search input |
| List manipulation (search) | Client-side search input in `pages/<name>.njk` as per CST |
| Full names displayed correctly | `englishFriendlyName` values match ticket specification |
| Upload form short names | `shortenedFriendlyName` field added to `list-type-data.ts` entries |
| Region National for UTCC and UTLC | New region `National` (regionId 7) added; virtual locations assigned to it |
| Region London for UTAAC | UTAAC virtual location assigned regionId 1 (London, already exists) |
| Opening statements displayed | Opening statement content in `en.ts`/`cy.ts`; rendered in `govuk-details` component in page template |
| "Observe" link masked to correct URL | `observeLinkUrl: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"` in all three `en.ts` files |

## CLARIFICATIONS NEEDED

1. **Time format**: The ticket does not specify 12-hour vs 24-hour clock for the `time` field. The `@spec` comment noted "12-hour clock assumed — confirm with business." No schema-level time format validation should be added until confirmed. Currently the `time` field is treated as free text.

2. **contentDate in email summary**: The email summary requires `Date` per hearing row, but the JSON data rows do not contain a date field (unlike CST which has a `date` field per row). The date should be derived from `artefact.contentDate` at the time the email is built. The `SummaryExtractor` type signature in `notification-service.ts` is `(jsonData: unknown) => CaseSummary[]`, which does not pass `contentDate`. A design decision is needed: either (a) change the extractor to a factory `(contentDate: string) => SummaryExtractor`, which requires changes to `notification-service.ts` and the `EmailBuilderConfig` interface, or (b) omit the Date label from the email summary rows and rely on the `publicationDate` already included in the GOV.Notify template parameters. Option (b) is the path of least resistance and avoids changing shared interfaces. Confirm which approach is acceptable before implementing.

3. **"Observe" link in UTAAC**: The opening statement for UTAAC in the ticket does not explicitly include the "Observe a court or tribunal hearing" hyperlink (unlike UTCC and UTLC which explicitly list it). The ticket acceptance criterion states "The link should be masked wherever displayed." Confirm whether it should appear in the UTAAC opening statement section.

4. **National region Welsh translation**: Official Welsh for "National" is needed. Use `[TRANSLATE: "National"]` as a placeholder.

5. **Welsh translations for all new content**: All strings in `cy.ts` files should use `[TRANSLATE: "..."]` markers. Confirm whether this is acceptable for the initial release or if Welsh translations are required before go-live.

6. **ListSearchConfig insertion mechanism**: Confirm whether the three new `ListSearchConfig` rows should be inserted via a Prisma migration, a seed script, or via the existing admin UI. The `queries.ts` file itself does not need editing; the question is how the rows get into the database.

7. **ID collision with parallel work**: The `@analyse` comment flagged that issue #428 (SIAC, POAC, PAAC, FFT list types) also allocates new list type IDs from the same sequence. Confirm IDs 28–30 are not already claimed by #428 before merging this branch.
