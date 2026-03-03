# Technical Plan — Issue #428: Tribunal Non-Strategic Publishing (SIAC, POAC, PAAC, FTT Tax, FTT LRT, FTT RPT)

## 1. Technical Approach

Ten new list types across four distinct field schemas are added as six separate lib modules under `libs/list-types/`. The groupings follow the field definitions: SIAC/POAC/PAAC share one schema, FTT Tax Chamber has its own, FTT LRT has its own, and all five FTT RPT regions share one schema.

Every module follows the exact pattern established by `libs/list-types/care-standards-tribunal-weekly-hearing-list/` (list type ID 9), which is the canonical reference for non-strategic publishing. No new patterns are introduced.

**Module count: 6**

| Module package name | List type IDs covered |
|---|---|
| `@hmcts/siac-weekly-hearing-list` | 24 |
| `@hmcts/poac-weekly-hearing-list` | 25 |
| `@hmcts/paac-weekly-hearing-list` | 26 |
| `@hmcts/ftt-tax-chamber-weekly-hearing-list` | 27 |
| `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list` | 28 |
| `@hmcts/ftt-rpt-eastern-weekly-hearing-list` | 29 |
| `@hmcts/ftt-rpt-london-weekly-hearing-list` | 30 |
| `@hmcts/ftt-rpt-midlands-weekly-hearing-list` | 31 |
| `@hmcts/ftt-rpt-northern-weekly-hearing-list` | 32 |
| `@hmcts/ftt-rpt-southern-weekly-hearing-list` | 33 |

SIAC, POAC and PAAC are separate modules despite sharing the same schema because each registers a distinct list type ID and renders under its own URL path. The same applies to the five FTT RPT regional modules. Sharing a schema file is handled by colocating it in each module's own `src/schemas/` directory (copy, not a shared import) — this keeps each module self-contained and avoids cross-module coupling.

All ten modules are `isNonStrategic: true`, provenance `MANUAL_UPLOAD`.

---

## 2. Implementation Details

### 2.1 Directory structure per module (SIAC shown, others identical in shape)

```
libs/list-types/siac-weekly-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── conversion/
    │   └── siac-config.ts
    ├── email-summary/
    │   └── summary-builder.ts
    ├── models/
    │   └── types.ts
    ├── pages/
    │   ├── cy.ts
    │   ├── en.ts
    │   ├── index.ts
    │   ├── index.test.ts
    │   └── siac-weekly-hearing-list.njk
    ├── pdf/
    │   ├── pdf-generator.ts
    │   └── pdf-template.njk
    ├── rendering/
    │   └── renderer.ts
    └── schemas/
        └── siac-weekly-hearing-list.json
```

The FTT RPT modules (IDs 29-33) follow the same structure. FTT Tax (ID 27) and FTT LRT (ID 28) also follow the same structure with their own field sets.

### 2.2 `src/config.ts`

Identical pattern to the CST reference — exports `moduleRoot`, `pageRoutes` with a `prefix` matching the URL path, and `assets`.

```typescript
// libs/list-types/siac-weekly-hearing-list/src/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const pageRoutes = {
  path: path.join(__dirname, "pages"),
  prefix: "/siac-weekly-hearing-list"
};
export const assets = path.join(__dirname, "assets/");
```

Prefix values per module:

| Module | `prefix` |
|---|---|
| SIAC (24) | `/siac-weekly-hearing-list` |
| POAC (25) | `/poac-weekly-hearing-list` |
| PAAC (26) | `/paac-weekly-hearing-list` |
| FTT Tax (27) | `/ftt-tax-chamber-weekly-hearing-list` |
| FTT LRT (28) | `/ftt-lands-registration-tribunal-weekly-hearing-list` |
| FTT RPT Eastern (29) | `/ftt-rpt-eastern-weekly-hearing-list` |
| FTT RPT London (30) | `/ftt-rpt-london-weekly-hearing-list` |
| FTT RPT Midlands (31) | `/ftt-rpt-midlands-weekly-hearing-list` |
| FTT RPT Northern (32) | `/ftt-rpt-northern-weekly-hearing-list` |
| FTT RPT Southern (33) | `/ftt-rpt-southern-weekly-hearing-list` |

### 2.3 `src/index.ts`

```typescript
import "./conversion/siac-config.js"; // Register converter on module load

export type { ValidationResult } from "@hmcts/publication";
export * from "./email-summary/summary-builder.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

### 2.4 TypeScript interfaces — `src/models/types.ts`

**SIAC / POAC / PAAC (shared structure, one file per module):**

```typescript
export interface SiacWeeklyHearing {
  date: string;
  time: string;
  appellant: string;
  caseReferenceNumber: string;
  hearingType: string;
  courtroom: string;
  additionalInformation: string;
}

export type SiacWeeklyHearingList = SiacWeeklyHearing[];
```

**FTT Tax Chamber:**

```typescript
export interface FttTaxChamberWeeklyHearing {
  date: string;
  hearingTime: string;
  caseName: string;
  caseReferenceNumber: string;
  judges: string;
  members: string | null; // optional
  venuePlatform: string;
}

export type FttTaxChamberWeeklyHearingList = FttTaxChamberWeeklyHearing[];
```

**FTT LRT:**

```typescript
export interface FttLandsRegistrationTribunalWeeklyHearing {
  date: string;
  hearingTime: string;
  caseName: string;
  caseReferenceNumber: string;
  judge: string; // singular
  venuePlatform: string;
}

export type FttLandsRegistrationTribunalWeeklyHearingList = FttLandsRegistrationTribunalWeeklyHearing[];
```

**FTT RPT (shared structure, one file per module):**

```typescript
export interface FttRptEasternWeeklyHearing {
  date: string;
  time: string;
  venue: string;
  caseType: string;
  caseReferenceNumber: string;
  judges: string;
  members: string | null; // optional
  hearingMethod: string;
  additionalInformation: string | null; // optional
}

export type FttRptEasternWeeklyHearingList = FttRptEasternWeeklyHearing[];
```

Type names are unique per module (e.g. `FttRptLondonWeeklyHearing` for the London module) even though the field shapes are the same, to keep each module self-contained.

### 2.5 JSON Schema — `src/schemas/<name>.json`

All schemas follow draft-07 with `"type": "array"` at the root.

**SIAC / POAC / PAAC schema (copied into each module with a name-appropriate title):**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SIAC Weekly Hearing List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["date", "time", "appellant", "caseReferenceNumber", "hearingType", "courtroom", "additionalInformation"],
    "properties": {
      "date":                { "type": "string", "pattern": "^\\d{2}/\\d{2}/\\d{4}$" },
      "time":                { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "appellant":           { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseReferenceNumber": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "hearingType":         { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "courtroom":           { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "additionalInformation": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```

**FTT Tax Chamber schema** — `members` is not in `required` (optional field):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FTT Tax Chamber Weekly Hearing List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["date", "hearingTime", "caseName", "caseReferenceNumber", "judges", "venuePlatform"],
    "properties": {
      "date":                { "type": "string", "pattern": "^\\d{2}/\\d{2}/\\d{4}$" },
      "hearingTime":         { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseName":            { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseReferenceNumber": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "judges":              { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "members":             { "type": ["string", "null"] },
      "venuePlatform":       { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```

**FTT LRT schema** — `judge` singular, no `members`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FTT Lands Registration Tribunal Weekly Hearing List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["date", "hearingTime", "caseName", "caseReferenceNumber", "judge", "venuePlatform"],
    "properties": {
      "date":                { "type": "string", "pattern": "^\\d{2}/\\d{2}/\\d{4}$" },
      "hearingTime":         { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseName":            { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseReferenceNumber": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "judge":               { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "venuePlatform":       { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```

**FTT RPT schema** — `members` and `additionalInformation` are optional:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FTT RPT Eastern Weekly Hearing List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["date", "time", "venue", "caseType", "caseReferenceNumber", "judges", "hearingMethod"],
    "properties": {
      "date":                  { "type": "string", "pattern": "^\\d{2}/\\d{2}/\\d{4}$" },
      "time":                  { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "venue":                 { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseType":              { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseReferenceNumber":   { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "judges":                { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "members":               { "type": ["string", "null"] },
      "hearingMethod":         { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "additionalInformation": { "type": ["string", "null"] }
    }
  }
}
```

### 2.6 Converter config — `src/conversion/<name>-config.ts`

Uses `createConverter` and `registerConverter` from `@hmcts/list-types-common` — identical pattern to `cst-config.ts`.

**SIAC example (POAC and PAAC are identical except the `registerConverter` call uses ID 25 and 26):**

```typescript
import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverter,
  validateDateFormat,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

export const SIAC_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Date", fieldName: "date", required: true,
      validators: [validateDateFormat(DD_MM_YYYY_PATTERN, "dd/MM/yyyy (e.g., 02/01/2025)")] },
    { header: "Time", fieldName: "time", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Time", r)] },
    { header: "Appellant", fieldName: "appellant", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Appellant", r)] },
    { header: "Case Reference Number", fieldName: "caseReferenceNumber", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Case Reference Number", r)] },
    { header: "Hearing Type", fieldName: "hearingType", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Hearing Type", r)] },
    { header: "Courtroom", fieldName: "courtroom", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Courtroom", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Additional information", r)] }
  ],
  minRows: 1
};

registerConverter(24, createConverter(SIAC_EXCEL_CONFIG));
```

For **FTT Tax Chamber** (`members` is optional — `required: false`):

```typescript
{ header: "Member(s)", fieldName: "members", required: false,
  validators: [(v, r) => validateNoHtmlTags(v, "Member(s)", r)] },
```

For **FTT RPT** (`members` and `additionalInformation` are both `required: false`).

### 2.7 Email summary — `src/email-summary/summary-builder.ts`

All ten list types emit only Date and Case Reference Number (or Hearing Time / Time for the time field depending on schema). Matches the issue spec: "Only: Date, Time (or Hearing Time), Case Reference Number".

**SIAC / POAC / PAAC / FTT RPT (use `time` field):**

```typescript
import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { SiacWeeklyHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: SiacWeeklyHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Date", value: hearing.date || "" },
    { label: "Time", value: hearing.time || "" },
    { label: "Case Reference Number", value: hearing.caseReferenceNumber || "" }
  ]);
}
```

**FTT Tax / FTT LRT (use `hearingTime` field):**

```typescript
export function extractCaseSummary(jsonData: FttTaxChamberWeeklyHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Date", value: hearing.date || "" },
    { label: "Hearing Time", value: hearing.hearingTime || "" },
    { label: "Case Reference Number", value: hearing.caseReferenceNumber || "" }
  ]);
}
```

### 2.8 Renderer — `src/rendering/renderer.ts`

Pure function, no side effects. Formats dates via `formatDdMmYyyyDate` from `@hmcts/list-types-common`. Optional fields pass through as-is (the template handles null/empty display).

**SIAC example:**

```typescript
import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { SiacWeeklyHearing, SiacWeeklyHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  courtName: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    weekCommencingDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: SiacWeeklyHearing[];
}

export function renderSiacData(hearingList: SiacWeeklyHearingList, options: RenderOptions): RenderedData {
  const weekCommencingDate = formatDisplayDate(options.displayFrom, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  const hearings = hearingList.map((hearing) => ({
    date: formatDdMmYyyyDate(hearing.date, options.locale),
    time: hearing.time,
    appellant: hearing.appellant,
    caseReferenceNumber: hearing.caseReferenceNumber,
    hearingType: hearing.hearingType,
    courtroom: hearing.courtroom,
    additionalInformation: hearing.additionalInformation
  }));

  return {
    header: { listTitle: options.listTitle, weekCommencingDate, lastUpdatedDate, lastUpdatedTime },
    hearings
  };
}
```

FTT Tax / LRT pass `hearingTime`, `caseName`, `judges`/`judge`, `members` (nullable), `venuePlatform` through unchanged. FTT RPT passes `venue`, `caseType`, `judges`, `members` (nullable), `hearingMethod`, `additionalInformation` (nullable) through unchanged.

### 2.9 PDF generator — `src/pdf/pdf-generator.ts`

Follows `generateCareStandardsTribunalWeeklyHearingListPdf` exactly. Each module has its own named export (e.g. `generateSiacWeeklyHearingListPdf`) to avoid export name collisions when multiple modules are imported by `apps/web`.

### 2.10 PDF template — `src/pdf/pdf-template.njk`

Standalone HTML with `<style>{{ pdfStyles | safe }}</style>`. Column headers match the field set for each schema group. Optional fields (members, additionalInformation) are rendered with a Nunjucks conditional: `{% if hearing.members %}{{ hearing.members }}{% endif %}`.

### 2.11 Page controller — `src/pages/index.ts`

Identical structure to `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.ts`. Key differences per module:

- `schemaPath` points to the module's own schema JSON
- `courtName` string matches the display name
- `renderXxxData` is the module's own render function
- `res.render` template name matches the `.njk` file name

**SIAC example:**

```typescript
const schemaPath = path.join(__dirname, "../schemas/siac-weekly-hearing-list.json");
const validate = createJsonValidator(schemaPath);

export const GET = async (req: Request, res: Response) => {
  // ... same error handling pattern ...
  const { header, hearings } = renderSiacData(jsonData, {
    locale,
    courtName: "Special Immigration Appeals Commission",
    displayFrom: artefact.displayFrom,
    displayTo: artefact.displayTo,
    lastReceivedDate: artefact.lastReceivedDate.toISOString(),
    listTitle: t.pageTitle
  });
  res.render("siac-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
};
```

### 2.12 Page translations — `src/pages/en.ts` and `src/pages/cy.ts`

Each module has its own translation pair. Welsh strings are stubs where translations are not yet available (matching the existing pattern seen in the CST module where Welsh is provided, but this ticket does not specify Welsh content beyond stubs).

**SIAC/POAC/PAAC `en.ts` structure:**

```typescript
export const en = {
  pageTitle: "Special Immigration Appeals Commission Weekly Hearing List",
  listForWeekCommencing: "List for week commencing",
  lastUpdated: "Last updated",
  at: "at",
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  importantInformationTitle: "Important information",
  importantInformationBody: [
    "The tribunal sometimes uses reference numbers or initials to protect the anonymity of those involved in the appeal.",
    "All hearings take place at Field House, 15-25 Bream's Buildings, London EC4A 1DZ."
  ],
  importantInformationLinkText: "Find out what to expect coming to a court or tribunal",
  importantInformationLinkUrl: "https://www.gov.uk/guidance/what-to-expect-coming-to-a-court-or-tribunal",
  searchCasesTitle: "Search Cases",
  searchCasesLabel: "Search by appellant, case reference, date, or other details",
  tableHeaders: {
    date: "Date",
    time: "Time",
    appellant: "Appellant",
    caseReferenceNumber: "Case Reference Number",
    hearingType: "Hearing Type",
    courtroom: "Courtroom",
    additionalInformation: "Additional Information"
  },
  dataSource: "Data source",
  backToTop: "Back to top",
  cautionNote: "Note this document contains Special Category Data ...",
  cautionReporting: "This document contains information intended ...",
  provenanceLabels: {
    MANUAL_UPLOAD: "Manual Upload",
    XHIBIT: "XHIBIT",
    SNL: "SNL",
    COMMON_PLATFORM: "Common Platform"
  }
};
```

Note: The SIAC/POAC/PAAC important information section contains multiple paragraphs. Use an array of strings in `en.ts`/`cy.ts` and render them in the template with a `{% for %}` loop, rather than a single string with embedded HTML.

The FTT Tax Chamber `importantInformationLinkUrl` points to `https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing`. FTT LRT and FTT RPT modules use the same observation link. Their `importantInformationBody` will include the placeholder email text as a string with `[insert office email]` until a real email is confirmed.

### 2.13 Page Nunjucks template — `src/pages/<name>.njk`

Follows the CST template pattern: extends `layouts/base-template.njk`, uses `{% block page_content %}`, uses `govuk-table`, includes the search input and `details` accordion. Column count matches the field set for each schema group.

**Optional field rendering pattern (members, additionalInformation):**

```njk
<td class="govuk-table__cell">{{ hearing.members if hearing.members else "" }}</td>
```

### 2.14 `package.json` per module

```json
{
  "name": "@hmcts/siac-weekly-hearing-list",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "production": "./dist/index.js",
      "default": "./src/index.ts"
    },
    "./config": {
      "production": "./dist/config.js",
      "default": "./src/config.ts"
    }
  },
  "scripts": {
    "build": "tsc && yarn build:nunjucks && yarn build:schemas",
    "build:nunjucks": "mkdir -p dist/pages && cd src/pages && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pages/$(dirname {}) && cp {} ../../dist/pages/{}' \\; && cd ../.. && mkdir -p dist/pdf && cd src/pdf && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pdf/$(dirname {}) && cp {} ../../dist/pdf/{}' \\;",
    "build:schemas": "mkdir -p dist/schemas && cp src/schemas/*.json dist/schemas/",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "dependencies": {
    "@hmcts/list-types-common": "workspace:*",
    "@hmcts/pdf-generation": "workspace:*",
    "@hmcts/publication": "workspace:*",
    "@hmcts/web-core": "workspace:*",
    "nunjucks": "3.2.4"
  },
  "devDependencies": {
    "@types/node": "24.10.4",
    "typescript": "5.9.3",
    "vitest": "4.0.18"
  },
  "peerDependencies": {
    "express": "^5.2.0"
  }
}
```

### 2.15 `tsconfig.json` per module

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist", "node_modules", "src/assets/"]
}
```

### 2.16 Root `tsconfig.json` — paths additions

Add all ten packages to the `paths` object in `/home/runner/work/cath-service/cath-service/tsconfig.json`:

```json
"@hmcts/siac-weekly-hearing-list": ["libs/list-types/siac-weekly-hearing-list/src"],
"@hmcts/poac-weekly-hearing-list": ["libs/list-types/poac-weekly-hearing-list/src"],
"@hmcts/paac-weekly-hearing-list": ["libs/list-types/paac-weekly-hearing-list/src"],
"@hmcts/ftt-tax-chamber-weekly-hearing-list": ["libs/list-types/ftt-tax-chamber-weekly-hearing-list/src"],
"@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list": ["libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src"],
"@hmcts/ftt-rpt-eastern-weekly-hearing-list": ["libs/list-types/ftt-rpt-eastern-weekly-hearing-list/src"],
"@hmcts/ftt-rpt-london-weekly-hearing-list": ["libs/list-types/ftt-rpt-london-weekly-hearing-list/src"],
"@hmcts/ftt-rpt-midlands-weekly-hearing-list": ["libs/list-types/ftt-rpt-midlands-weekly-hearing-list/src"],
"@hmcts/ftt-rpt-northern-weekly-hearing-list": ["libs/list-types/ftt-rpt-northern-weekly-hearing-list/src"],
"@hmcts/ftt-rpt-southern-weekly-hearing-list": ["libs/list-types/ftt-rpt-southern-weekly-hearing-list/src"]
```

### 2.17 `apps/web/src/app.ts` — registration

Import `moduleRoot` and `pageRoutes` from each new module's `/config` export, add `moduleRoot` to the `modulePaths` array, and call `app.use(await createSimpleRouter(...))` in the "Register list type routes" block.

Each import follows the existing pattern exactly:

```typescript
import {
  moduleRoot as siacModuleRoot,
  pageRoutes as siacRoutes
} from "@hmcts/siac-weekly-hearing-list/config";
// ... repeat for all 10 modules ...
```

In `modulePaths`:
```typescript
siacModuleRoot,
poacModuleRoot,
paacModuleRoot,
fttTaxChamberModuleRoot,
fttLandsRegistrationTribunalModuleRoot,
fttRptEasternModuleRoot,
fttRptLondonModuleRoot,
fttRptMidlandsModuleRoot,
fttRptNorthernModuleRoot,
fttRptSouthernModuleRoot,
```

After the existing `app.use(await createSimpleRouter(adminCourtRoutes))` line:
```typescript
app.use(await createSimpleRouter(siacRoutes));
app.use(await createSimpleRouter(poacRoutes));
app.use(await createSimpleRouter(paacRoutes));
app.use(await createSimpleRouter(fttTaxChamberRoutes));
app.use(await createSimpleRouter(fttLandsRegistrationTribunalRoutes));
app.use(await createSimpleRouter(fttRptEasternRoutes));
app.use(await createSimpleRouter(fttRptLondonRoutes));
app.use(await createSimpleRouter(fttRptMidlandsRoutes));
app.use(await createSimpleRouter(fttRptNorthernRoutes));
app.use(await createSimpleRouter(fttRptSouthernRoutes));
```

### 2.18 Mock list types registry — `libs/list-types/common/src/mock-list-types.ts`

Append ten new entries to the `mockListTypes` array. All have `isNonStrategic: true` and `provenance: "MANUAL_UPLOAD"`.

```typescript
{
  id: 24,
  name: "SIAC_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Special Immigration Appeals Commission Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "siac-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 25,
  name: "POAC_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Proscribed Organisations Appeal Commission Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "poac-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 26,
  name: "PAAC_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Pathogens Access Appeal Commission Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "paac-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 27,
  name: "FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST",
  englishFriendlyName: "First-tier Tribunal (Tax Chamber) Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ftt-tax-chamber-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 28,
  name: "FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST",
  englishFriendlyName: "First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ftt-lands-registration-tribunal-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 29,
  name: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST",
  englishFriendlyName: "First-tier Tribunal (Residential and Property Tribunal) Eastern Region Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ftt-rpt-eastern-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 30,
  name: "FTT_RPT_LONDON_WEEKLY_HEARING_LIST",
  englishFriendlyName: "FTT RPT London Region",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ftt-rpt-london-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 31,
  name: "FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST",
  englishFriendlyName: "FTT RPT Midlands Region",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ftt-rpt-midlands-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 32,
  name: "FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST",
  englishFriendlyName: "FTT RPT Northern Region",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ftt-rpt-northern-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 33,
  name: "FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST",
  englishFriendlyName: "FTT RPT Southern Region",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ftt-rpt-southern-weekly-hearing-list",
  isNonStrategic: true
}
```

---

## 3. Error Handling and Edge Cases

### 3.1 Validation error pattern

All controllers follow the four-status pattern from the CST reference:
- `400` — missing `artefactId`, or JSON schema validation failure
- `404` — artefact not found in publication service, or JSON file not on disk
- `500` — unexpected error (caught in outer `try/catch`)

This is not changed. No new error states are introduced.

### 3.2 Optional fields in JSON schema

`members` (FTT Tax, FTT RPT) and `additionalInformation` (FTT RPT) are absent from the `required` array. Their type is `["string", "null"]` to allow an explicit `null` from the converter as well as an empty/absent value. The converter `required: false` setting means the field will be `undefined` if the column is blank in the Excel file — the template must tolerate both `null` and `undefined` via `{% if hearing.members %}`.

### 3.3 SIAC/POAC/PAAC anonymity note

The issue states the tribunal sometimes uses reference numbers or initials to protect anonymity. This is informational text in the important information accordion, not a validation concern. No special schema handling is required; the Case Reference Number field is validated as any non-HTML string.

### 3.4 FTT LRT email placeholder

The important information text for FTT LRT contains `[insert office email]`. This is stored literally in `en.ts` and `cy.ts` until the real email is provided. A code comment should mark it: `// TODO: replace [insert office email] with the actual tribunal email address`. The same applies to FTT RPT modules.

### 3.5 Upload form label vs. display name discrepancy (PAAC)

The upload form label in the issue is "PACC Weekly Hearing List" (double C) but the registry name uses `PAAC`. Assume the upload form label contains a typo. Use `PAAC` consistently in code. Flag this to the product team for confirmation.

---

## 4. Acceptance Criteria Mapping

| AC | Implementation |
|---|---|
| SIAC (ID 24) publishes and renders correctly | `@hmcts/siac-weekly-hearing-list` module registered in `app.ts`, schema validates 7 fields, page renders at `/siac-weekly-hearing-list` |
| POAC (ID 25) publishes and renders correctly | `@hmcts/poac-weekly-hearing-list` module, same structure, ID 25 in converter and registry |
| PAAC (ID 26) publishes and renders correctly | `@hmcts/paac-weekly-hearing-list` module, ID 26 in converter and registry |
| FTT Tax (ID 27) publishes and renders correctly | `@hmcts/ftt-tax-chamber-weekly-hearing-list` module, distinct schema with optional `members` field |
| FTT LRT (ID 28) publishes and renders correctly | `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list` module, singular `judge` field |
| FTT RPT Eastern-Southern (IDs 29-33) publish and render | Five separate modules, identical schema, distinct IDs and URL paths |
| List type registry updated | `mock-list-types.ts` has entries 24-33 |
| Important information accordion content is correct per tribunal | Distinct `importantInformationBody`/link strings in each module's `en.ts` |
| Email summary emits Date, Time, Case Reference Number only | `extractCaseSummary` in each module returns exactly those three fields |
| All list types are `isNonStrategic: true` | Confirmed in registry entries |
| Upload form labels match specification | Labels are driven by `englishFriendlyName` in the registry and the upload admin UI — the registry entries use the names from the issue table |

---

## 5. Open Questions / CLARIFICATIONS NEEDED

1. **PAAC upload label typo**: The issue specifies "PACC Weekly Hearing List" as the upload form label (double C), but the registry name is `PAAC`. Is this a typo in the issue, or is the upload label intentionally different from the code name? The implementation uses `PAAC` consistently.

2. **FTT LRT and FTT RPT office emails**: The important information text contains `[insert office email]` as a placeholder. What are the actual email addresses for the FTT LRT and each FTT RPT region? These need to be substituted before the service goes live. A `TODO` comment will be added in `en.ts` and `cy.ts`.

3. **FTT RPT display names (IDs 30-33)**: The issue gives display names "FTT RPT London Region", "FTT RPT Midlands Region", "FTT RPT Northern Region", "FTT RPT Southern Region" without the full "First-tier Tribunal (Residential and Property Tribunal)" prefix used for the Eastern region. Is this intentional, or should IDs 30-33 follow the same full naming convention as ID 29?

4. **Welsh translations**: The issue does not supply Welsh strings for any of the ten new list types. The `cy.ts` files will be stubs mirroring the English content until translations are provided. Should a separate ticket be raised for Welsh content?

5. **FTT Tax Chamber `judges` field**: The issue specifies "Judge(s)" — i.e. potentially multiple judges. The field is stored as a free-text string (`judges: string`) rather than an array, matching the pattern used by other list types. Confirm this is the expected approach and that no array parsing is needed.

6. **FTT RPT `caseType` values**: Is `caseType` a free-text string or a constrained enum? The schema currently treats it as a free-text string. If there is a controlled vocabulary, an `enum` constraint should be added to the schema.

7. **PDF generation requirement**: The CST module implements PDF generation. It is assumed all ten new modules also require PDF generation (the issue mentions the full set of module layers). Confirm whether PDF generation is in scope for this ticket or deferred.

8. **`@hmcts/location` and `@hmcts/postgres` dependencies**: The CST `package.json` includes `@hmcts/location` and `@hmcts/postgres` as dependencies. These do not appear to be used by the list rendering code itself. The new modules will omit them unless a specific need is identified.
