# Technical Plan: #434 — SEND, CIC and AST Tribunal Hearing Lists

## 1. Technical Approach

Three new non-strategic list type modules following the established `care-standards-tribunal-weekly-hearing-list` pattern. Each module is a self-contained lib under `libs/list-types/` with its own validation schema, Excel converter, renderer, page controller, PDF generator, and email summary builder. Shared files (`mock-list-types.ts`, `apps/web/src/app.ts`, `tsconfig.json`) are updated once to register all three.

All three use `provenance: "MANUAL_UPLOAD"` and `isNonStrategic: true`.

## 2. List Type Registry Changes

File: `libs/list-types/common/src/mock-list-types.ts`

Add three entries (IDs 24, 25, 26 — next available after current max of 23):

```typescript
{
  id: 24,
  name: "SEND_DAILY_HEARING_LIST",
  englishFriendlyName: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "send-daily-hearing-list",
  isNonStrategic: true
},
{
  id: 25,
  name: "CIC_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Criminal Injuries Compensation Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "cic-weekly-hearing-list",
  isNonStrategic: true
},
{
  id: 26,
  name: "AST_DAILY_HEARING_LIST",
  englishFriendlyName: "Asylum Support Tribunal Daily Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "ast-daily-hearing-list",
  isNonStrategic: true
}
```

The `englishFriendlyName` drives the front-end summary of publications display name. The upload form label is controlled separately by the admin pages list type display logic (see CLARIFICATIONS NEEDED).

## 3. Module Structure (repeated for each of the three list types)

```
libs/list-types/send-daily-hearing-list/
libs/list-types/cic-weekly-hearing-list/
libs/list-types/ast-daily-hearing-list/
```

Each module mirrors the CST structure:

```
src/
  config.ts
  index.ts
  models/types.ts
  schemas/<list-type-name>.json
  conversion/<abbrev>-config.ts
  email-summary/summary-builder.ts
  rendering/renderer.ts
  pages/
    index.ts
    index.test.ts
    en.ts
    cy.ts
    <list-type-name>.njk
  pdf/
    pdf-generator.ts
    pdf-generator.test.ts
    pdf-template.njk
package.json
tsconfig.json
```

## 4. Data Models

### SEND Daily Hearing List (`src/models/types.ts`)
```typescript
export interface SendDailyHearing {
  time: string;
  caseReferenceNumber: string;
  respondent: string;
  hearingType: string;
  venue: string;
  timeEstimate: string;
}
export type SendDailyHearingList = SendDailyHearing[];
```

### CIC Weekly Hearing List
```typescript
export interface CicWeeklyHearing {
  date: string;
  hearingTime: string;
  caseReferenceNumber: string;
  caseName: string;
  venuePlatform: string;
  judges: string;
  members: string;
  additionalInformation: string;
}
export type CicWeeklyHearingList = CicWeeklyHearing[];
```

### AST Daily Hearing List
```typescript
export interface AstDailyHearing {
  appellant: string;
  appealReferenceNumber: string;
  caseType: string;
  hearingType: string;
  hearingTime: string;
  additionalInformation: string;
}
export type AstDailyHearingList = AstDailyHearing[];
```

## 5. JSON Validation Schemas

All schemas follow the same structure as the CST schema:
- `$schema`: draft-07
- `type: "array"` of objects
- Required fields list matching the data model
- String type for all fields
- Date fields use `"pattern": "^\\d{2}/\\d{2}/\\d{4}$"` (dd/MM/yyyy)
- Text fields use the no-HTML-tags pattern: `"pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"`

**SEND required fields:** `time`, `caseReferenceNumber`, `respondent`, `hearingType`, `venue`, `timeEstimate`

**CIC required fields:** `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `venuePlatform`, `judges`, `members`, `additionalInformation`

**AST required fields:** `appellant`, `appealReferenceNumber`, `caseType`, `hearingType`, `hearingTime`, `additionalInformation`

## 6. Excel Conversion

Each module registers a converter using `registerConverter(listTypeId, createConverter(config))` on module load.

| Module | List Type ID | Excel column headers |
|--------|-------------|----------------------|
| SEND   | 24 | Time, Case reference number, Respondent, Hearing type, Venue, Time estimate |
| CIC    | 25 | Date, Hearing time, Case reference number, Case name, Venue/Platform, Judge(s), Member(s), Additional information |
| AST    | 26 | Appellant, Appeal reference number, Case type, Hearing type, Hearing time, Additional information |

Validators applied: `validateDateFormat` for date fields, `validateNoHtmlTags` for all text fields.

## 7. Rendering

Each renderer exports a function (e.g. `renderSendDailyData`) with the same `RenderOptions` / `RenderedData` pattern as CST. Date fields formatted with `formatDdMmYyyyDate`. Last updated date/time via `formatLastUpdatedDateTime`.

SEND and AST: use `displayFrom` date as "list for date" (daily). CIC: use `displayFrom` as "list for week commencing" (weekly, same as CST).

AST: the fixed venue address is a content constant in `en.ts` / `cy.ts`, not a data field — it is always displayed in the page header area below the list title.

## 8. Email Summary

Each `summary-builder.ts` exports `extractCaseSummary(jsonData): CaseSummary[]` mapping hearing records to label/value pairs:

- **SEND**: `[{ label: "Time", value: hearing.time }, { label: "Case reference number", value: hearing.caseReferenceNumber }, { label: "Venue", value: hearing.venue }]`
- **CIC**: `[{ label: "Hearing time", value: hearing.hearingTime }, { label: "Case reference number", value: hearing.caseReferenceNumber }, { label: "Venue/Platform", value: hearing.venuePlatform }]`
- **AST**: `[{ label: "Appellant", value: hearing.appellant }, { label: "Appeal reference number", value: hearing.appealReferenceNumber }, { label: "Hearing time", value: hearing.hearingTime }]`

All summary builders re-export `formatCaseSummaryForEmail` and `SPECIAL_CATEGORY_DATA_WARNING` from `@hmcts/list-types-common`.

## 9. Page Content (en.ts)

Key content differences per list type:

**SEND `en.ts`:**
- `pageTitle`: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List"
- `listForDate`: "List for"
- `importantInformationText`: multi-paragraph block (5 paragraphs as per AC):
  - Para 1: "Special Educational Needs and Disability (SEND) Tribunal hearings are held in private..."
  - Para 2: "Private hearings do not allow anyone to observe remotely or in person..."
  - Para 3: "Open justice is a fundamental principle of our justice system..."
  - Para 4: "Requests to observe a public hearing... send@justice.gov.uk..."
  - Para 5: "The judge hearing the case will decide..."
- `tableHeaders`: time, caseReferenceNumber, respondent, hearingType, venue, timeEstimate

**CIC `en.ts`:**
- `pageTitle`: "Criminal Injuries Compensation Weekly Hearing List"
- `listForWeekCommencing`: "List for week commencing"
- `importantInformationText`: multi-paragraph (open justice, CIC.enquiries@Justice.gov.uk, restricted reporting orders, link to observe-a-court-or-tribunal-hearing)
- `tableHeaders`: date, hearingTime, caseReferenceNumber, caseName, venuePlatform, judges, members, additionalInformation

**AST `en.ts`:**
- `pageTitle`: "Asylum Support Tribunal Daily Hearing List"
- `listForDate`: "List for"
- `venueAddress`: "East London Tribunal Service, HMCTS, 2nd Floor, Import Building, 2 Clove Crescent London E14 2BE"
- `importantInformationText`: multi-paragraph (open justice, asylumsupporttribunals@justice.gov.uk, link)
- `tableHeaders`: appellant, appealReferenceNumber, caseType, hearingType, hearingTime, additionalInformation

All three `cy.ts` files mirror the English structure with Welsh placeholder strings for content that hasn't been translated yet (matching the CST pattern of `"Welsh placeholder"`).

## 10. Nunjucks Templates

Both page template (`.njk`) and PDF template (`pdf-template.njk`) follow the CST template exactly with column headers adjusted per list type.

AST template additionally renders the fixed venue address in a prominent block below the list title (before the important information accordion).

Important information sections with multiple paragraphs should use a `for` loop over an array of paragraph strings in the content file, or individual named keys — whichever is simpler given existing template patterns.

## 11. App Registration

File: `apps/web/src/app.ts` — add imports for all three new modules:

```typescript
import { moduleRoot as sendModuleRoot, pageRoutes as sendRoutes } from "@hmcts/send-daily-hearing-list/config";
import { moduleRoot as cicModuleRoot, pageRoutes as cicRoutes } from "@hmcts/cic-weekly-hearing-list/config";
import { moduleRoot as astModuleRoot, pageRoutes as astRoutes } from "@hmcts/ast-daily-hearing-list/config";
```

Register each with `createSimpleRouter` and `createGovukFrontend` as per existing pattern.

File: `tsconfig.json` — add path aliases:
```json
"@hmcts/send-daily-hearing-list": ["libs/list-types/send-daily-hearing-list/src"],
"@hmcts/cic-weekly-hearing-list": ["libs/list-types/cic-weekly-hearing-list/src"],
"@hmcts/ast-daily-hearing-list": ["libs/list-types/ast-daily-hearing-list/src"]
```

## 12. Error Handling

- Missing `artefactId` → 400 with error page (identical to CST controller pattern)
- Artefact not found → 404
- JSON file not readable → 404
- JSON fails schema validation → 400 with "Invalid Data" error
- Unexpected error → 500

Validation errors are logged via `console.error` before returning the error response.

## 13. Access / User Groups

All three list types are `isNonStrategic: true` with `provenance: "MANUAL_UPLOAD"`. Access control classification follows the existing non-strategic pattern. The AC states "Public, Private, etc" classification is required — this is handled by the existing list type registry and publication access control logic, not by the new modules themselves.

## 14. Acceptance Criteria Mapping

| AC | Implementation |
|----|---------------|
| Validation schemas created | JSON schema files in each module's `src/schemas/` |
| Error handling for schemas | Controller validates and returns 400 on failure |
| Valid publications saved via current method | Existing publication save flow unchanged; new list types registered in mock-list-types.ts |
| List types classified with user groups | Entries in mock-list-types.ts with correct provenance/isNonStrategic flags |
| PDF templates created | `src/pdf/pdf-template.njk` + `pdf-generator.ts` per module |
| Unified email summary format | `extractCaseSummary` following CaseSummary pattern in each module |
| Style guides (page templates) created | `src/pages/*.njk` per module |
| List manipulation for style guides | Renderer functions per module |
| Full names in front-end summary | `englishFriendlyName` in mock-list-types.ts |
| Upload form display names | Driven by mock-list-types.ts display name (see CLARIFICATIONS NEEDED) |
| SEND/CIC → Tribunal/National | mock-list-types.ts entries (jurisdiction/region fields — see CLARIFICATIONS NEEDED) |
| AST → Tribunal/London | mock-list-types.ts entry |
| Daily/weekly publication cadence | Handled at publication scheduling level, not in the list type modules |
| SEND data fields | Schema, model, renderer, template |
| CIC data fields | Schema, model, renderer, template |
| AST data fields + address | Schema, model, renderer, template (address as content constant) |
| Email summary fields per list | `extractCaseSummary` implementations |
| Important information accordion text | Content in `en.ts` / `cy.ts` per module |

## 15. CLARIFICATIONS NEEDED

1. **Upload form display names**: The AC specifies "SEND Daily Hearing list", "CIC Weekly Hearing List", "AST Daily Hearing List" for the Excel upload form (different capitalisation/abbreviation from the full `englishFriendlyName`). Is there a separate `uploadFormLabel` or `shortName` field in the `ListType` interface, or does the upload form use a different truncated display derived from `englishFriendlyName`? Currently `mockListTypes` has no separate short-name field.

2. **Jurisdiction/Region fields**: The `ListType` interface in `mock-list-types.ts` has no `jurisdiction` or `region` fields. The AC requires SEND/CIC to link to "Tribunal" jurisdiction and "National" region, and AST to "Tribunal"/"London". Do these fields need to be added to the `ListType` interface, or is jurisdiction/region handled via the location database separately?

3. **Welsh translations**: The existing CST module uses `"Welsh placeholder"` for all Welsh content. Should these three new modules also use placeholders, or are Welsh translations available for the important information text and table headers?

4. **Merge order dependency**: Issues #425, #428, #429, #431 all modify the same `mock-list-types.ts` and `apps/web/src/app.ts`. What is the intended merge sequence, and should this issue claim IDs 24–26 or wait for prior issues to land first?

5. **Issue #342 (database-driven list types)**: If #342 lands before this, the `mock-list-types.ts` approach may be replaced. Should this implementation include a database migration for the three new list type records as a fallback?
