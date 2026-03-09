# Technical Plan: #431 — SSCS Tribunal Non-Strategic Publishing

## 1. Technical Approach

### Overview

Add 8 new Social Security and Child Support (SSCS) Tribunal Daily Hearing List types to the non-strategic publishing route in CaTH. Each tribunal is a separate list-type module following the established pattern from `libs/list-types/care-standards-tribunal-weekly-hearing-list/`.

The 8 tribunals share identical field structure and display layout — only the list title, important information text, and contact email differ between them. A shared SSCS rendering library will be created to avoid duplicating logic across 8 modules.

### Architecture Decision: Shared SSCS Library

Rather than copy-pasting renderer, email summary builder, schema, and conversion config into 8 modules, we will create:

- `libs/list-types/sscs-common/` — shared SSCS rendering, email summary, and type definitions
- 8 thin `libs/list-types/sscs-*-daily-hearing-list/` modules — each containing only per-tribunal config, converter registration, page controller, and Nunjucks template

This keeps modules small, avoids drift, and respects the DRY principle.

### High-Level Steps

1. Explore existing location data to confirm region IDs and list type IDs
2. Create `libs/list-types/sscs-common/` with shared schema, renderer, email summary builder, and types
3. Create 8 list type modules (`sscs-midlands-*`, `sscs-south-east-*`, etc.)
4. Update `libs/list-types/common/src/mock-list-types.ts` with 8 new entries
5. Update `libs/location/src/location-data.ts` with new regions and locations
6. Register all 8 modules in `apps/web/src/app.ts`
7. Register in `apps/api/src/app.ts` if any API routes are needed (not anticipated)
8. Update root `tsconfig.json` with path aliases for all new packages
9. Write unit tests for shared library and each module controller
10. Write E2E tests covering the complete user journey

---

## 2. Implementation Details

### 2.1 New Regions to Add

Add to `libs/location/src/location-data.ts`:

```typescript
{ regionId: 7, name: "Scotland", welshName: "Yr Alban" },
{ regionId: 8, name: "North East", welshName: "Gogledd Ddwyrain Lloegr" },
{ regionId: 9, name: "North West", welshName: "Gogledd Orllewin Lloegr" },
{ regionId: 10, name: "South West", welshName: "De Orllewin Lloegr" },
```

> **Note**: Region IDs 7–10 are assumed to be next available. Verify against the DB before implementation.

### 2.2 New Locations to Add

Add to `libs/location/src/location-data.ts`:

| locationId | name | regions | subJurisdictions |
|---|---|---|---|
| 11 | Midlands Social Security and Child Support Tribunal | [2] (Midlands) | [8] |
| 12 | South East Social Security and Child Support Tribunal | [3] (South East) | [8] |
| 13 | Wales and South West Social Security and Child Support Tribunal | [5, 10] (Wales, South West) | [8] |
| 14 | Scotland Social Security and Child Support Tribunal | [7] (Scotland) | [8] |
| 15 | North East Social Security and Child Support Tribunal | [8] (North East) | [8] |
| 16 | North West Social Security and Child Support Tribunal | [9] (North West) | [8] |
| 17 | London Social Security and Child Support Tribunal | [1] (London) | [8] |
| 18 | Liverpool Social Security and Child Support Tribunal | [9] (North West) | [8] |

All linked to `subJurisdictionId: 8` (Social Security and Child Support → Tribunal jurisdiction).

### 2.3 mock-list-types.ts Additions

Add 8 entries to `libs/list-types/common/src/mock-list-types.ts`:

```typescript
{
  id: 24,
  name: "SSCS_MIDLANDS_DAILY_HEARING_LIST",
  englishFriendlyName: "SSCS Midlands Daily Hearing List",
  welshFriendlyName: "[WELSH]",
  provenance: "MANUAL_UPLOAD",
  urlPath: "sscs-midlands-daily-hearing-list",
  isNonStrategic: true
},
// ... repeat for ids 25–31
```

The `englishFriendlyName` here is the **short upload form name** (e.g. "SSCS Midlands Daily Hearing List"). The full tribunal name (e.g. "Midlands Social Security and Child Support Tribunal Daily Hearing List") is the page title stored in the module's `en.ts`.

### 2.4 Shared SSCS Library: `libs/list-types/sscs-common/`

```
libs/list-types/sscs-common/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # exports
    ├── schemas/
    │   └── sscs-hearing.json       # Shared JSON schema (all 9 fields)
    ├── models/
    │   └── types.ts                # SscsHearing, SscsHearingList
    ├── rendering/
    │   ├── renderer.ts             # renderSscsData(hearings) → { header, hearings }
    │   └── renderer.test.ts
    └── email-summary/
        ├── summary-builder.ts      # extractCaseSummary(hearings) → EmailSummaryRow[]
        └── summary-builder.test.ts
```

**Types (`models/types.ts`):**
```typescript
interface SscsHearing {
  hearingTime: string;
  appealReferenceNumber: string;
  hearingType: string;
  appellant: string;
  courtroom: string;
  venue: string;
  tribunal: string;
  ftaRespondent: string;
  additionalInformation: string;
}
type SscsHearingList = SscsHearing[];
```

**Renderer (`rendering/renderer.ts`):**
```typescript
export function renderSscsData(hearings: SscsHearingList) {
  return { hearings };
}
```

**Email summary (`email-summary/summary-builder.ts`):**
```typescript
export function extractCaseSummary(hearings: SscsHearingList) {
  return hearings.map(h => ({
    hearingTime: h.hearingTime,
    hearingType: h.hearingType,
    appealReferenceNumber: h.appealReferenceNumber
  }));
}
```

**JSON Schema (`schemas/sscs-hearing.json`):**
All 9 fields required, all use HTML injection prevention pattern:
```
^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$
```

### 2.5 Individual List Type Modules

Each of the 8 modules is thin, containing only tribunal-specific config:

```
libs/list-types/sscs-[region]-daily-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                   # pageRoutes with prefix
    ├── index.ts                    # imports conversion config, exports pdf generator
    ├── conversion/
    │   └── sscs-[region]-config.ts # ExcelConverterConfig + registerConverter(listTypeId)
    ├── pdf/
    │   ├── pdf-generator.ts        # Wraps shared PDF logic with tribunal config
    │   └── pdf-template.njk        # PDF Nunjucks template (tribunal-specific title/info)
    └── pages/
        ├── en.ts                   # English content (pageTitle, importantInformationText)
        ├── cy.ts                   # Welsh content
        ├── index.ts                # GET controller
        ├── index.test.ts           # Unit tests
        └── sscs-[region]-daily-hearing-list.njk  # Page template
```

**config.ts pattern:**
```typescript
export const pageRoutes = {
  path: path.join(__dirname, "pages"),
  prefix: "/sscs-midlands-daily-hearing-list"
};
export const assets = path.join(__dirname, "assets/");
```

**index.ts pattern:**
```typescript
import "./conversion/sscs-midlands-config.js";
export * from "@hmcts/sscs-common";
export * from "./pdf/pdf-generator.js";
```

**Conversion config pattern:**
```typescript
const SSCS_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Hearing Time", fieldName: "hearingTime", validators: [validateNoHtmlTags] },
    { header: "Appeal Reference Number", fieldName: "appealReferenceNumber", validators: [validateNoHtmlTags] },
    { header: "Hearing Type", fieldName: "hearingType", validators: [validateNoHtmlTags] },
    { header: "Appellant", fieldName: "appellant", validators: [validateNoHtmlTags] },
    { header: "Courtroom", fieldName: "courtroom", validators: [validateNoHtmlTags] },
    { header: "Venue", fieldName: "venue", validators: [validateNoHtmlTags] },
    { header: "Tribunal", fieldName: "tribunal", validators: [validateNoHtmlTags] },
    { header: "FTA/Respondent", fieldName: "ftaRespondent", validators: [validateNoHtmlTags] },
    { header: "Additional Information", fieldName: "additionalInformation", validators: [validateNoHtmlTags] },
  ],
  minRows: 1
};
registerConverter(24, createConverter(SSCS_EXCEL_CONFIG)); // 24 = SSCS_MIDLANDS list type ID
```

**Page controller pattern (pages/index.ts):**
```typescript
import { en } from "./en.js";
import { cy } from "./cy.js";
import { renderSscsData, extractCaseSummary } from "@hmcts/sscs-common";
// ... GET handler: validates artefactId, loads JSON, validates against schema, renders template
```

**Template: All 8 share an identical Nunjucks template structure.** The important information text comes from the `en`/`cy` content objects, so the template itself is identical for all 8 — one possible refactor is to have a single shared template in `sscs-common`. For simplicity and to follow the established pattern, each module has its own template file initially.

### 2.6 apps/web Registration

In `apps/web/src/app.ts`, add imports and route registration for all 8 modules:

```typescript
import { pageRoutes as sscsMidlandsRoutes } from "@hmcts/sscs-midlands-daily-hearing-list/config";
// ... repeat for all 8

app.use(await createSimpleRouter(sscsMidlandsRoutes));
// ... repeat for all 8
```

### 2.7 Root tsconfig.json Path Aliases

Add 9 entries (1 for sscs-common + 8 for list type modules):

```json
"@hmcts/sscs-common": ["libs/list-types/sscs-common/src"],
"@hmcts/sscs-midlands-daily-hearing-list": ["libs/list-types/sscs-midlands-daily-hearing-list/src"],
"@hmcts/sscs-south-east-daily-hearing-list": ["libs/list-types/sscs-south-east-daily-hearing-list/src"],
// ... etc.
```

---

## 3. File Structure Summary

### New Files

```
libs/list-types/sscs-common/
libs/list-types/sscs-midlands-daily-hearing-list/
libs/list-types/sscs-south-east-daily-hearing-list/
libs/list-types/sscs-wales-south-west-daily-hearing-list/
libs/list-types/sscs-scotland-daily-hearing-list/
libs/list-types/sscs-north-east-daily-hearing-list/
libs/list-types/sscs-north-west-daily-hearing-list/
libs/list-types/sscs-london-daily-hearing-list/
libs/list-types/sscs-liverpool-daily-hearing-list/
```

### Modified Files

```
libs/location/src/location-data.ts             # Add 4 regions, 8 locations
libs/list-types/common/src/mock-list-types.ts  # Add 8 list type entries
apps/web/src/app.ts                            # Register 8 new page routes
tsconfig.json                                  # Add 9 path aliases
```

---

## 4. Error Handling & Edge Cases

### Validation Errors (schema level)

- Missing required field → `"[Field name] is required in row [n]"`
- HTML injection in any field → `"[Field name] must not contain HTML tags in row [n]"`
- Empty file (no rows) → `"The uploaded file contains no hearing data"`

### Page-Level Errors (controller level)

| Condition | HTTP Status | Error Page |
|---|---|---|
| Missing `artefactId` | 400 | `errors/common` — "Missing artefactId parameter" |
| Artefact not found | 404 | `errors/common` — "The requested list could not be found" |
| JSON fails schema validation | 400 | `errors/common` — "The list data is invalid" |
| Unexpected error | 500 | `errors/common` — "An error occurred while loading the list" |

---

## 5. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| Validation schemas created for each hearing list | JSON schema in `sscs-common/src/schemas/sscs-hearing.json`; referenced by each converter |
| Error handling for validation | `validateNoHtmlTags` on all fields + required field checks in schema |
| Valid publications saved via current method | Converter uses existing `registerConverter` flow |
| List types classified and user groups decided | Set `isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"`; access level: **Public** (pending confirmation) |
| PDF template created for each tribunal | `pdf-template.njk` per module with tribunal title and important info |
| Unified email summary format | `extractCaseSummary` in sscs-common returns hearingTime, hearingType, appealReferenceNumber |
| Style guide created for each tribunal | Nunjucks template per module displaying 9-column table |
| List manipulation in style guide | Search/filter within table via existing list manipulation pattern |
| Linked to Tribunal jurisdiction | `subJurisdictionId: 8` (Social Security and Child Support) on each location entry |
| 8 regional tribunals created with correct region links | New location entries in `location-data.ts` |
| Full list names displayed on front-end | `pageTitle` in each module's `en.ts` |
| Short names on upload form | `englishFriendlyName` in `mock-list-types.ts` |
| Per-tribunal opening statement in accordion | `importantInformationText` in each module's `en.ts` |
| Published daily | Convention — no technical enforcement required (to confirm) |

---

## 6. Testing Approach

### Unit Tests (Vitest, co-located)

**`sscs-common` renderer tests:**
- Returns correctly shaped `hearings` array from valid input
- Passes through all 9 fields unchanged

**`sscs-common` email summary tests:**
- Returns array of `{ hearingTime, hearingType, appealReferenceNumber }` for each hearing

**Schema validation tests (per schema, or once for shared schema):**
- Valid hearing object passes validation
- Object missing `hearingTime` fails with descriptive error
- Object with HTML in any field fails

**Controller tests (per module or representative sample):**
- GET renders template with `en`, `cy`, `hearings`
- GET returns 400 when `artefactId` missing
- GET returns 404 when artefact not found
- GET returns 400 when JSON fails schema
- GET selects Welsh translations when `res.locals.locale === "cy"`

### E2E Tests (Playwright, `@nightly`)

One journey test covering:
1. Navigate to SSCS list page with valid artefactId
2. Verify all 9 column headers are present in English
3. Switch to Welsh (`?lng=cy`) and verify column headers in Welsh
4. Run axe accessibility scan — expect zero violations
5. Verify important information accordion is open by default
6. Verify tribunal-specific opening statement text and contact email
7. Use search to filter hearing rows and verify results update
8. Download PDF and verify it generates without error

---

## 7. CLARIFICATIONS NEEDED

The following questions should be posted as clarifications on the issue before or during implementation:

1. **List type IDs 24–31**: Confirm these are the next available IDs. Current highest is assumed to be 23 (`MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`). Are there any in-flight additions that could cause a conflict?

2. **Region IDs 7–10**: Confirm that Scotland (7), North East (8), North West (9), and South West (10) are the correct next available region IDs in the database.

3. **Liverpool contact email**: The issue links Liverpool to the North West region. The North West opening statement uses `sscsa-liverpool@justice.gov.uk`. Is this the same email for Liverpool, or does Liverpool have a distinct contact address?

4. **Access level (Public vs Private)**: The acceptance criteria mention classifying list types by user group. Are SSCS hearing lists Public (visible to all) or restricted to a specific user group?

5. **Welsh translations for opening statements**: The 8 opening statements are lengthy and tribunal-specific. Are official Welsh translations available, or should placeholder Welsh text be used initially?

6. **`tribunal` field**: Is the `Tribunal` column in the hearing table a free-text field entered by the publisher (e.g. "SSCS"), or should it be defaulted/hardcoded per list type?

7. **`additionalInformation` required or optional**: The Care Standards Tribunal schema marks this as required. Should SSCS lists follow the same convention, or can `additionalInformation` be empty/omitted?

8. **Liverpool Welsh page title**: The spec comment does not provide a Welsh translation for "Liverpool Social Security and Child Support Tribunal Daily Hearing List". Can this be provided?

9. **Welsh translations for shared content strings**: Several shared content keys (e.g. `lastUpdated`, `importantInformationTitle`, `dataSource`, `searchCasesLabel`) are marked `[WELSH TRANSLATION REQUIRED]` in the spec. Are translations available?

10. **South West region**: Confirm that a new "South West" region needs to be added (currently absent from `location-data.ts`), separate from the existing "Wales" region, to support the Wales and South West tribunal's dual-region linking.
