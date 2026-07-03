# #771: Magistrates Standard List - Technical Plan

## 1. Technical Approach

The magistrates-standard-list module follows the `civil-and-family-daily-cause-list` reference implementation with one key structural difference: magistrates lists always include a statutory reporting restriction section in both HTML and PDF output. This section is not conditional — it is rendered on every page and in every PDF.

The architecture splits cleanly:

- **`libs/list-types/magistrates-standard-list/`** — the library containing all business logic: renderer, validator, types, locales, PDF generator, JSON schema, config, and exports
- **`apps/web/src/pages/(list-types)/magistrates-standard-list/`** — the page controller, Nunjucks template, and co-located en/cy content files

The page controller delegates everything to `createListTypeHandler` from `list-type-handler.ts`, which handles the full request lifecycle (missing artefactId, artefact not found, access control, JSON retrieval, schema validation, and error rendering). This is identical to the `civil-and-family-daily-cause-list` controller pattern.

### Dependency on common libraries

- `@hmcts/list-types-common` — `configureNunjucks`, `savePdfToStorage`, `createPdfErrorResult`, `loadTranslations`, PDF style constants
- `@hmcts/pdf-generation` — `generatePdfFromHtml`
- `@hmcts/publication` — `validateJson`, `PROVENANCE_LABELS`, `ValidationResult`
- `@hmcts/daily-cause-list-common` — NOT reused. The magistrates-standard-list has a different JSON structure (defendant-centric, not court-room/session/sitting hierarchy) and requires its own renderer
- `@hmcts/location` — `getLocationById` for resolving the Welsh court name

---

## 2. Implementation Details

### 2.1 Exact file structure

```
libs/list-types/magistrates-standard-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                        # moduleRoot, assets, schemaPath exports
    ├── config.test.ts                   # Verifies config exports
    ├── index.ts                         # Business logic re-exports
    ├── index.test.ts                    # Verifies all expected exports present
    ├── models/
    │   └── types.ts                     # TypeScript types for the magistrates-standard-list JSON
    ├── schemas/
    │   └── magistrates-standard-list.json   # JSON Schema for validation
    ├── validation/
    │   └── json-validator.ts            # validateMagistratesStandardList()
    │   └── json-validator.test.ts
    ├── rendering/
    │   └── renderer.ts                  # renderMagistratesStandardListData()
    │   └── renderer.test.ts
    ├── locales/
    │   └── en.ts                        # Shared translations (errorTitle, errorMessage, etc.)
    │   └── cy.ts
    ├── pdf/
    │   └── pdf-generator.ts             # generateMagistratesStandardListPdf()
    │   └── pdf-generator.test.ts
    │   └── pdf-template.njk             # Self-contained HTML PDF template

apps/web/src/pages/(list-types)/magistrates-standard-list/
├── index.ts                             # GET handler using createListTypeHandler
├── index.test.ts                        # Controller tests
├── en.ts                                # Page-specific English content
├── cy.ts                                # Page-specific Welsh content
└── magistrates-standard-list.njk        # Nunjucks template for HTML view
```

### 2.2 Reporting restriction handling in `civil-and-family-daily-cause-list` and how to replicate

In `civil-and-family-daily-cause-list`, reporting restrictions are **per-case inline annotations**. In the HTML template, after each table row, there is a conditional extra row:

```njk
{% if case.formattedReportingRestriction | length %}
  <tr class="govuk-table__row">
    <td class="govuk-table__cell" colspan="9">
      <strong>{{ t.reportingRestrictions }}:</strong> {{ case.formattedReportingRestriction }}
    </td>
  </tr>
{% endif %}
```

The renderer in `daily-cause-list-common` populates this via `formatReportingRestrictions(caseItem)` which joins the `reportingRestrictionDetail` array.

For **magistrates-standard-list**, the reporting restriction handling is different. Based on the ticket's acceptance criteria, there is:

1. A **static statutory notice section** — always displayed, listing the three legal provisions (Children Act s49, s39, and Criminal Procedure (Insanity) Act s4A). This is pure content from locale strings, rendered unconditionally in both HTML and PDF.
2. Potentially **per-case reporting restriction flags** from the JSON data, which should also be rendered in the hearings table rows (following the same pattern as civil-and-family if present in the schema).

The static restriction section is rendered at the top of the page, after the header/venue block and before the hearings table. In the PDF, it appears in the same logical position.

Template structure for the static section (HTML):

```njk
<div class="govuk-inset-text">
  <h2 class="govuk-heading-m">{{ t.restrictionInformationHeading }}</h2>
  <p class="govuk-body">{{ t.restrictionInformationP1 }}</p>
  <p class="govuk-body govuk-!-font-weight-bold">{{ t.restrictionInformationBoldText }}</p>
  <p class="govuk-body">{{ t.restrictionInformationP2 }}</p>
  <ul class="govuk-list govuk-list--bullet">
    <li>{{ t.restrictionBulletPoint1 }}</li>
    <li>{{ t.restrictionBulletPoint2 }}</li>
  </ul>
  <p class="govuk-body">{{ t.restrictionInformationP3 }}</p>
  <ul class="govuk-list govuk-list--bullet">
    <li>{{ t.restrictionBulletPoint1 }}</li>
    <li>{{ t.restrictionBulletPoint2 }}</li>
  </ul>
  <p class="govuk-body">{{ t.restrictionInformationP4 }}</p>
</div>
```

### 2.3 TypeScript types for the magistrates-standard-list JSON structure

The magistrates-standard-list JSON schema (from pip-data-management) follows a flat defendant-centric structure within the court list hierarchy. Based on the ticket columns (defendant name, case number, offence, plea, results, results proviso) and the known pip-data-management schema, the types are:

```typescript
// libs/list-types/magistrates-standard-list/src/models/types.ts

export interface MagistratesDefendant {
  name?: string;
  caseNumber?: string;
  offence?: string[];
  plea?: string;
  results?: string;
  resultsProviso?: string;
  reportingRestrictionDetail?: string[];
  individualDetails?: {
    title?: string;
    individualForenames?: string;
    individualMiddleName?: string;
    individualSurname?: string;
  };
}

export interface MagistratesHearing {
  hearingTime?: string;
  defendant?: MagistratesDefendant[];
}

export interface MagistratesSession {
  sittings?: MagistratesSitting[];
  judiciary?: Array<{ johKnownAs: string; isPresiding?: boolean }>;
}

export interface MagistratesSitting {
  sittingStart?: string;
  hearing?: MagistratesHearing[];
}

export interface MagistratesCourtRoom {
  courtRoomName?: string;
  session?: MagistratesSession[];
}

export interface MagistratesCourtHouse {
  courtHouseName?: string;
  courtHouseAddress?: {
    line?: string[];
    town?: string;
    county?: string;
    postCode?: string;
  };
  courtRoom?: MagistratesCourtRoom[];
}

export interface MagistratesCourtList {
  courtHouse: MagistratesCourtHouse;
}

export interface MagistratesStandardListData {
  document: {
    publicationDate: string;
    documentName?: string;
    version?: string;
  };
  venue: {
    venueName: string;
    venueAddress: {
      line: string[];
      town?: string;
      county?: string;
      postCode: string;
    };
    venueContact?: {
      venueTelephone?: string;
      venueEmail?: string;
    };
  };
  courtLists: MagistratesCourtList[];
}

export interface RenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}
```

Note: The actual schema structure needs to be verified against the pip-data-management source (`magistrates_standard_list.json`). There is ambiguity about whether defendants appear directly under sittings or within a hearing wrapper — the schema should be consulted to confirm. See Open Questions.

### 2.4 Renderer transformation

The renderer in `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` is responsible for:

1. Looking up the location name from the DB (`getLocationById`) and preferring Welsh if locale is `cy`
2. Formatting the content date and last updated timestamp
3. Flattening nested defendant/case data into a structure suitable for template iteration
4. Formatting per-case reporting restrictions (joining the `reportingRestrictionDetail` array) for any inline annotations in the table

The renderer returns:

```typescript
{
  header: {
    locationName: string;
    addressLines: string[];
    contentDate: string;   // formatted, locale-aware
    lastUpdated: string;   // formatted, locale-aware
  };
  listData: MagistratesStandardListData;   // mutated with computed fields
}
```

Unlike the civil-and-family renderer, there is no `openJustice` object because the magistrates-standard-list uses a reporting restriction section instead.

### 2.5 Template structure (HTML)

`apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk`:

```
extends layouts/base-template.njk
block page_content
  - H1: venue name + list date (using t.title)
  - Venue address lines
  - List date line
  - Last updated line
  - Reporting restriction section (static, unconditional, using t.restrictionInformationHeading etc.)
  - Open Justice collapsible (govuk-details, using t.openJusticeTitle)
  - Case search input
  - govuk-accordion with court rooms and sessions
    - Table per session: Time | Defendant name | Case number | Offence | Plea | Results
    - Inline reporting restriction row per case if present
  - "No hearings today" message if courtLists is empty
  - Back to top link
  - Data source attribution
```

### 2.6 Template structure (PDF)

`libs/list-types/magistrates-standard-list/src/pdf/pdf-template.njk`:

Self-contained HTML using inline CSS (from `pdfStyles`). Same logical layout as the HTML view:

```
- Header: venue name, address, list date, last updated
- Reporting restriction section (static)
- Table per court room/session: defendant data
- Footer: data source
```

The PDF generator uses `configureNunjucks(__dirname)` pointing to the `pdf/` directory, and `PDF_BASE_STYLES` from `@hmcts/list-types-common`.

### 2.7 Locale files

The library provides shared locales for error messages and page metadata. Page-specific content (heading text, column labels, reporting restriction paragraphs) lives co-located with the page controller in `apps/web/src/pages/(list-types)/magistrates-standard-list/en.ts` and `cy.ts`.

**Lib locales** (`libs/list-types/magistrates-standard-list/src/locales/en.ts`):

```typescript
export const en = {
  errorTitle: "Publication not available",
  errorMessage: "This publication cannot be viewed at the moment. ...",
  error403Title: "Access Denied",
  error403Message: "You do not have permission to view this publication."
};
```

**Page locales** (`apps/web/src/pages/(list-types)/magistrates-standard-list/en.ts`):

All content keys from the ticket's acceptance criteria table, plus the reporting restriction keys, column headers, and common error texts. The page locale objects are passed as `en` and `cy` to the template.

### 2.8 Registration

**`apps/web/src/app.ts`**:

```typescript
import { moduleRoot as magistratesStandardListModuleRoot } from "@hmcts/magistrates-standard-list/config";

// Add to modulePaths array:
magistratesStandardListModuleRoot,
```

**`apps/web/package.json`** — add dependency:

```json
"@hmcts/magistrates-standard-list": "workspace:*",
```

**Root `tsconfig.json`** — add path alias:

```json
"@hmcts/magistrates-standard-list": ["libs/list-types/magistrates-standard-list/src"],
```

**`libs/publication/src/processing/service.ts`** — add PDF generator to registry:

```typescript
import { generateMagistratesStandardListPdf, type MagistratesStandardListData } from "@hmcts/magistrates-standard-list";

MAGISTRATES_STANDARD_LIST: (p) => generateMagistratesStandardListPdf({ ...p, jsonData: p.jsonData as MagistratesStandardListData }),
```

**`libs/location/src/list-type-data.ts`** — add list type entry with the correct ID (the next available id after 27):

```typescript
{
  id: 28,  // Verify this is correct against the DB seed
  name: "MAGISTRATES_STANDARD_LIST",
  englishFriendlyName: "Magistrates Standard List",
  welshFriendlyName: "Rhestr Safonol Llys Ynadon",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-standard-list",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [7]
}
```

**`libs/publication/package.json`** — add dependency on `@hmcts/magistrates-standard-list`.

**`libs/notifications/package.json`** — if email summary is added later.

### 2.9 `package.json` for the lib

The lib needs the same build scripts as `civil-and-family-daily-cause-list`:

```json
"build": "tsc && yarn build:pdf-templates",
"build:pdf-templates": "mkdir -p dist/pdf && cp src/pdf/*.njk dist/pdf/",
```

No `build:nunjucks` script is needed because the HTML template lives in `apps/web/src/pages/`, not in the lib.

---

## 3. Error Handling and Edge Cases

- **Missing `artefactId`**: `createListTypeHandler` returns 400 before any DB lookup
- **Artefact not found**: 404 via `getArtefactById` returning null
- **Access denied**: 403 if `checkAccess: true` and `canAccessPublicationData` returns false. The access control behaviour for magistrates-standard-list (whether `checkAccess` should be true or false) needs confirming — `civil-and-family-daily-cause-list` uses `checkAccess: true`. Magistrates lists use `CRIME_IDAM` provenance, so the same access control logic should apply.
- **JSON blob not found**: 404 logged with artefact ID
- **JSON schema validation failure**: 400 with validation errors logged
- **Empty court list**: Template renders `t.noHearings` message instead of an empty accordion
- **Missing defendant name**: Graceful empty string, not a crash
- **Locale fallback**: Default to `"en"` if `res.locals.locale` is not set

---

## 4. Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| New lib at `libs/list-types/magistrates-standard-list/` | Lib scaffolded with all files listed in section 2.1 |
| Page at `GET /magistrates-standard-list?artefactId=` | Page controller at `apps/web/src/pages/(list-types)/magistrates-standard-list/index.ts` |
| Displays venue name, address, content date, last updated | `header` object from renderer, passed to template |
| Hearings table with correct columns | Template renders defendant-centric table using court list data |
| Reporting restriction section | Static section in HTML template using locale keys; same in PDF |
| Open Justice collapsible | `govuk-details` component with `t.openJusticeTitle` |
| Case search input | HTML input element with `id="case-search-input"` |
| Data source attribution | `dataSource` variable resolved via `PROVENANCE_LABELS` |
| Returns 400 if `artefactId` missing | `createListTypeHandler` handles this before any DB call |
| Returns 404 if artefact not found | `createListTypeHandler` handles this |
| Returns 403 if no access | `createListTypeHandler` with `checkAccess: true` |
| Returns 400 if JSON fails validation | `createListTypeHandler` validates against schema |
| PDF generated matching HTML structure | `pdf-template.njk` mirrors HTML layout |
| PDF includes reporting restriction | Static section in `pdf-template.njk` |
| PDF saved to storage | `savePdfToStorage` via `@hmcts/list-types-common` |
| Welsh via `?lng=cy` | `cy.ts` locale files, locale resolved from `res.locals.locale` |
| Module registered in `apps/web/src/app.ts` | `moduleRoot` import added to `modulePaths` |
| Path alias in `tsconfig.json` | Entry added to root `tsconfig.json` paths |
| Package added to `apps/web/package.json` | Workspace dependency added |
| Unit tests pass | Tests for renderer, validator, PDF generator, page controller, config |
| `yarn test` passes | All test suites green |

---

## 5. Open Questions (CLARIFICATIONS NEEDED)

### 5.1 Magistrates-standard-list JSON schema structure

The exact field names and nesting depth for defendants within the JSON need to be confirmed against the pip-data-management source file (`src/main/resources/schemas/magistrates_standard_list.json`). Key questions:

- Are defendants nested directly under `sitting`, or within a `hearing` wrapper under `sitting`?
- What is the exact field name for the defendant's name? (`name`, `individualDetails`, or a combined string?)
- Is `offence` a single string or an array?
- Is `hearingTime` a field on the sitting or on the defendant/case?
- Are there any required fields vs optional fields for the table columns (offence, plea, results, resultsProviso)?

Without the source schema, the types in section 2.3 are best-effort approximations based on the ticket's column definitions.

### 5.2 List type ID for MAGISTRATES_STANDARD_LIST

The `list-type-data.ts` currently has IDs up to 27. The correct next ID (28) needs to be confirmed against the actual database state and any pending migrations. If there is already a DB record for this list type, the ID must match exactly.

### 5.3 `checkAccess` flag for the page controller

The ticket says to follow `civil-and-family-daily-cause-list` which uses `checkAccess: true`. Magistrates lists use `CRIME_IDAM` provenance (same as magistrates-public-list, id 4). Confirm whether access control should be applied the same way for the standard list.

### 5.4 Open Justice section content

The ticket specifies `openJusticeTitle` as a locale key but does not provide the full Open Justice paragraph text for magistrates-standard-list. Should it reuse the same Open Justice paragraphs as `civil-and-family-daily-cause-list`, or is there magistrates-specific text? This affects whether `venueContact` data is needed from the JSON.

### 5.5 Reporting restriction section bullet point structure

The ticket shows the same two bullet points listed under both s49 (P2) and s39 (P3). Confirm this is the intended rendering — two bullet point lists with identical items under two different statutory provisions — before implementing the template.

### 5.6 `libs/publication` dependency

Adding `MAGISTRATES_STANDARD_LIST` to the `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` requires adding `@hmcts/magistrates-standard-list` as a dependency in `libs/publication/package.json`. Confirm this is acceptable and will not create a circular dependency.
