# Technical Plan: #596 Magistrates Public List

## 1. Technical Approach

Create a new `libs/list-types/magistrates-public-list/` module that mirrors the `magistrates-standard-list` pattern exactly. The module:

- Uses the same JSON schema shape as `magistrates-standard-list` (courtLists → courtHouse → courtRoom → session → sittings → hearing → case/party)
- Exposes the same renderer, validator, PDF generator, and locale exports
- Is registered in `apps/web` as a page handler using `createListTypeHandler` + `createCauseListRender`
- Uses `PDF_BASE_STYLES` only (no civil/family styles) — same as magistrates-standard-list
- Includes the reporting restriction section in both HTML and PDF

The page controller lives in `apps/web/src/pages/(list-types)/magistrates-public-list/` following the co-located content pattern.

---

## 2. Implementation Details

### 2.1 Library module structure

```
libs/list-types/magistrates-public-list/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config.ts
    ├── schemas/
    │   └── magistrates-public-list.json          # Copy of magistrates-standard-list schema, renamed
    ├── models/
    │   └── types.ts                               # Re-export RenderOptions; types match standard-list shape
    ├── validation/
    │   └── json-validator.ts                      # validateMagistratesPublicList using the JSON schema
    ├── rendering/
    │   ├── renderer.ts                            # renderMagistratesPublicListData (identical logic to standard-list)
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts                       # generateMagistratesPublicListPdf
    │   └── pdf-template.njk
    └── locales/
        ├── en.ts
        └── cy.ts
```

Page files (co-located in apps/web):
```
apps/web/src/pages/(list-types)/magistrates-public-list/
├── index.ts
└── magistrates-public-list.njk
```

> **Note:** `en.ts`/`cy.ts` for the page are exported from the lib (same pattern as `magistrates-standard-list` and `civil-and-family-daily-cause-list`) so the page controller imports them from `@hmcts/magistrates-public-list`.

### 2.2 Key files

#### `src/config.ts`
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "../assets/");
export const schemaPath = path.join(__dirname, "schemas/magistrates-public-list.json");
```

#### `src/models/types.ts`
Re-export `RenderOptions` from `@hmcts/list-types-common`. The JSON data shape follows the `magistrates-standard-list` schema (no bespoke types needed beyond what the renderer constructs internally).

```typescript
export type { RenderOptions } from "@hmcts/list-types-common";
```

#### `src/validation/json-validator.ts`
```typescript
import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/magistrates-public-list.json" with { type: "json" };

export function validateMagistratesPublicList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
```

#### `src/rendering/renderer.ts`
Identical logic to `magistrates-standard-list/dist/rendering/renderer.js` but in TypeScript. Entry point:

```typescript
export async function renderMagistratesPublicListData(jsonData: MagistratesPublicListData, options: RenderOptions) {
  const header = await buildHeader(jsonData, options);
  const listData = processCourtLists(jsonData.courtLists, options.locale);
  return { header, listData };
}
```

Internal functions: `buildHeader`, `processCourtLists`, `processSitting`, `buildCaseHearingInfo`, `buildApplicationHearingInfo`, `addHearingToSittings`, `buildSittingHeading`, `buildPartyInfo`, `buildIndividualPartyInfo`, `buildOrganisationPartyInfo`, `formatIndividualName`, `findProsecutingAuthority`, `processOffences`, `formatCourtRoomWithJudiciary`, `formatReportingRestrictionDetails`, `formatAddressLines`, `formatAddress`, `formatDate`, `formatDateAndTime`, `formatDateFromIso`, `formatSittingTime`, `formatAmPmTime`.

All identical to standard-list implementation — the schema and data shape are the same.

#### `src/pdf/pdf-generator.ts`
```typescript
export async function generateMagistratesPublicListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  // ...same as magistrates-standard-list:
  // renderMagistratesPublicListData → loadTranslations → configureNunjucks → render pdf-template.njk
  // pdfStyles: PDF_BASE_STYLES  (no civil-family styles)
}
```

#### `src/pdf/pdf-template.njk`
Copy `magistrates-standard-list` PDF template — same layout: header, restriction section, listData accordion rows.

#### `src/locales/en.ts`
Keys per acceptance criteria:

```typescript
export const en = {
  title: "Magistrates Public List",
  listDate: "List for date:",
  lastUpdated: "Last updated:",
  publishedAt: "Published at:",
  venueAddress: "Venue address",
  openJusticeTitle: "Open justice",
  dataSource: "Data source",
  defendant: "Defendant",
  caseNumber: "Case number",
  offence: "Offence",
  plea: "Plea",
  results: "Results",
  resultsProviso: "Results proviso",
  noHearings: "No hearings today",
  linkToTop: "Back to top",
  // Table column headers
  time: "Time",
  defendantName: "Defendant name",
  // Reporting restriction content
  restrictionInformationHeading: "Restriction information",
  restrictionInformationP1: "In these cases, certain information may be subject to reporting restrictions...",
  restrictionInformationBoldText: "Further information about reporting restrictions may be obtained from the Clerk of the Court before any publication is made.",
  restrictionInformationP2: "Section 49 of the Children and Young Persons Act 1933 provides that in any proceedings against a young person, the court shall not publish:",
  restrictionInformationP3: "Section 39 of the Children and Young Persons Act 1933 gives the court the power to impose restrictions...",
  restrictionInformationP4: "In cases where a defendant is found unfit to plead, Section 4A of the Criminal Procedure (Insanity) Act 1964 gives courts the power to impose restrictions.",
  restrictionBulletPoint1: "the name, address or school of the young person",
  restrictionBulletPoint2: "any particulars calculated to lead to the identification of the young person",
  // Open justice
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  openJusticeIntro: "...",
  openJusticeContact: (venueName: string, email: string, phone: string) => `...`,
  openJusticeDecision: "...",
  openJusticePrivate: "...",
  openJusticeMoreInfo: "For more information, please visit",
  openJusticeLink: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
  openJusticeLinkText: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
  // Search
  searchCases: "Search Cases",
  // Error states
  errorTitle: "Publication not available",
  errorMessage: "This publication cannot be viewed at the moment...",
  error403Title: "Access Denied",
  error403Message: "You do not have permission to view this publication."
};
```

#### `src/locales/cy.ts`
Welsh equivalents for all keys from the acceptance criteria.

#### `src/index.ts`
```typescript
export type { ValidationResult } from "@hmcts/publication";
export { cy as magistratesPublicListCy } from "./locales/cy.js";
export { en as magistratesPublicListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateMagistratesPublicList } from "./validation/json-validator.js";
```

### 2.3 Page controller (`apps/web/src/pages/(list-types)/magistrates-public-list/index.ts`)

```typescript
import {
  type MagistratesPublicListData,
  magistratesPublicListCy as cy,
  magistratesPublicListEn as en,
  renderMagistratesPublicListData,
  validateMagistratesPublicList
} from "@hmcts/magistrates-public-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<MagistratesPublicListData>({
  en,
  cy,
  validate: validateMagistratesPublicList,
  logPrefix: "magistrates-public-list",
  checkAccess: true,
  render: createCauseListRender(renderMagistratesPublicListData, "magistrates-public-list", en, cy)
});
```

> **Note:** `MagistratesPublicListData` will be the inferred type from the renderer. Check what type `createCauseListRender` expects — if it uses the same generic as `civil-and-family`, the type import from the lib is required.

### 2.4 Nunjucks template (`apps/web/src/pages/(list-types)/magistrates-public-list/magistrates-public-list.njk`)

Based on the `magistrates-standard-list` template. Key structure:
- `<h1>` with `t.title`
- FACT link
- List date (`t.listDate` + `header.contentDate`)
- Last updated / Published at
- Venue address
- **Restriction information section** — always visible (not a `<details>` element), contains `t.restrictionInformationHeading`, P1, bold text, P2 + bullet points, P3 + bullet points, P4
- Open justice `<details>` collapsible
- Case search input
- Court listings accordion (per `listData`):
  - `courtHouseName` heading
  - `lja` sub-heading
  - `courtRoomName` sub-heading
  - Per sitting: accordion section header = sitting time
  - Per hearing: 6-column table row: Time | Defendant name | Case number | Offence | Plea | Results
- Data source at bottom
- Back to top link

### 2.5 Registration

**`apps/web/src/app.ts`** — add:
```typescript
import { moduleRoot as magistratesPublicListModuleRoot } from "@hmcts/magistrates-public-list/config";
// ...add to modulePaths array
```

**Root `tsconfig.json`** — add to `paths`:
```json
"@hmcts/magistrates-public-list": ["libs/list-types/magistrates-public-list/src"]
```

**`apps/web/package.json`** — add to `dependencies`:
```json
"@hmcts/magistrates-public-list": "workspace:*"
```

---

## 3. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| Missing `artefactId` query param | `createListTypeHandler` returns 400 |
| Artefact not found | `createListTypeHandler` returns 404 |
| User lacks access | `createListTypeHandler` returns 403 (via `checkAccess: true`) |
| JSON fails schema validation | `createListTypeHandler` returns 400 |
| Empty `courtLists` | `processCourtLists` returns `[]`; template shows `t.noHearings` |
| Missing optional fields (`lja`, `venueAddress`, etc.) | Null-coalesced to `""` or `[]` in renderer |
| Invalid date strings | `formatDate`/`formatDateFromIso` degrade gracefully |

---

## 4. Acceptance Criteria Mapping

| Criterion | Implementation |
|---|---|
| New lib `libs/list-types/magistrates-public-list/` | Full module created per section 2.1 |
| Page at `GET /magistrates-public-list?artefactId=` | `apps/web/src/pages/(list-types)/magistrates-public-list/index.ts` |
| Venue name, address, content date, last updated | `header` from renderer, rendered in `.njk` |
| 6-column hearings table | Template iterates `listData` sittings/hearings |
| Reporting restriction section | Static section in `.njk` and `pdf-template.njk` |
| Open Justice collapsible | `<details>` in `.njk` |
| Case search input | Standard search input in `.njk` |
| Data source at bottom | `dataSource` variable passed to template |
| 400/404/403 responses | `createListTypeHandler` handles all |
| PDF with restriction section | `pdf-template.njk` includes restriction block |
| Welsh via `?lng=cy` | `cy` locale object; `loadTranslations` in PDF generator |
| Module registered in `apps/web` | `app.ts` import + `modulePaths` |
| Path alias in root `tsconfig.json` | `@hmcts/magistrates-public-list` path added |
| Package dependency in `apps/web/package.json` | `workspace:*` dependency added |

---

## 5. Open Questions / CLARIFICATIONS NEEDED

1. **Schema version**: The ticket references `pip-data-management` schema `magistrates_public_list.json`. Is the schema identical to `magistrates-standard-list.json`? If there are differences (e.g. additional fields for public list), the `magistrates-public-list.json` in this module must match exactly.

2. **Table columns — Offence/Plea/Results mapping**: The 6 columns are Time, Defendant name, Case number, Offence, Plea, Results. These map to `offence[0].offenceTitle`, `offence[0].plea`, and what for Results? The standard-list does not have a "Results" column. Clarify what JSON field maps to "Results" and "Results proviso".

3. **`MagistratesPublicListData` type**: `createCauseListRender` is typed against `CauseListData` in the civil-and-family handler. Check whether `list-type-handler.ts` uses a generic that accepts any data type, or whether a shared magistrates data type should be defined.

4. **Email summary**: Ticket says "Add email summary once requirements are confirmed" — out of scope for this implementation.
