# #814: Technology and Construction Court (KB) daily cause list

**State:** OPEN
**Assignees:** 
**Author:** OgechiOkelu
**Labels:** enhancement, type:story
**Created:** 2026-07-01T18:23:10Z
**Updated:** 2026-08-13T10:22:27Z

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Technology and Construction Court (KB) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for the Technology and Construction Court (KB) daily cause list

**SO THAT** the Technology and Construction Court (KB) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
The Technology and Construction Court (KB) daily cause list is created under the Business and Property Courts Rolls Building in CaTH
The following data fields are created in the listed order in the validation schema for the Technology and Construction Court (KB) daily cause list (Judge, Time, Venue Type, Case Number, Case Name and Additional Information)
The Technology and Construction Court (KB) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template
The validation schema and style guide for the Technology and Construction Court (KB) daily cause list is created.
A PDF downloadable version of the hearing list is created.

## Comments

### Comment by OgechiOkelu on 2026-08-13T09:51:44Z

@spec 

### Comment by hmctsclaudecode on 2026-08-13T10:02:17Z

# Technical Specification — Technology and Construction Court (KB) Daily Cause List (#814)

## 1. User Story

**As a** Service (HMCTS CaTH publishing service)
**I want to** publish the Technology and Construction Court (King's Bench Division) Daily Cause List via the non‑strategic Excel upload route, backed by a validation schema, a bilingual style guide (web page) and a generated PDF
**So that** court users, the press and the public can find and read the Technology and Construction Court daily cause list under Business and Property Courts Rolls Building in CaTH, in English and Welsh

## 2. Background

This is the second consumer of the shared CHD/KB (Chancery Division / King's Bench Division) Rolls Building list-type schema. The first was **Companies Winding Up (Chancery Division) Daily Cause List** (#803, merged), which deliberately extracted the reusable parts into `libs/list-types/chd-kb-common/` with in-code comments stating the schema, converter config, renderer and email-summary builder are "shared with future list types using the same schema". #814 is that future list type.

Existing building blocks that are reused unchanged:

| Asset | Location | Reused? |
|---|---|---|
| JSON schema (7 fields) | `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` | Yes, as-is |
| Validator wrapper `validateChdKbListType` | `libs/list-types/chd-kb-common/src/validation/json-validator.ts` | Yes, re-exported |
| Excel field config `CHD_KB_EXCEL_CONFIG` | `libs/list-types/chd-kb-common/src/conversion/chd-kb-excel-config.ts` | Yes, registered under a new name |
| Model `ChdKbHearing` / `ChdKbHearingList` | `libs/list-types/chd-kb-common/src/models/types.ts` | Yes, re-exported under an alias |
| Renderer `renderChdKbHearingList` | `libs/list-types/chd-kb-common/src/rendering/renderer.ts` | Yes, wrapped with this list's title |
| Email summary builder | `libs/list-types/chd-kb-common/src/email-summary/summary-builder.ts` | Yes, re-exported |
| Location "Business and Property Courts Rolls Building" | `libs/location/src/location-data.ts` — `locationId: 26`, `regions: [11]`, `subJurisdictions: [10]` | **Already exists — no location work needed** |
| Global table search JS (`#case-search-input` + `.hearings-table`) | `apps/web/src/assets/js/table-search.ts` | Yes, auto-wired, no module JS |

The reference implementation to copy is `libs/list-types/companies-winding-up-chd-daily-cause-list/` plus `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/`. This spec follows it file-for-file; only names, locale copy and registry keys change.

**No database schema change and no hand-written SQL.** Reference data is added to `libs/list-types/common/src/list-type-data.ts` only; `apps/postgres/prisma/generate-seed-sql.ts` generates the idempotent `INSERT ... ON CONFLICT` seed at deploy time, and `yarn db:seed` reads the same file locally.

## 3. Acceptance Criteria

* **Scenario:** List type is available under Business and Property Courts Rolls Building
    * **Given** a CTSC/Local admin is signed in on `/non-strategic-upload`
    * **When** they select the court "Business and Property Courts Rolls Building" and open the list type dropdown
    * **Then** "Technology and Construction Court (KB) Daily Cause List" is selectable, its default sensitivity is `Public`, and the list type is linked to sub-jurisdiction `High Court` (id 10) in the same way as Companies Winding Up (ChD)

* **Scenario:** Excel template with the specified fields in order converts to JSON
    * **Given** an `.xlsx` file whose first sheet has the header row `Judge | Time | Venue | Type | Case Number | Case Name | Additional Information`
    * **When** the admin uploads it on `/non-strategic-upload` for this list type
    * **Then** `convertExcelForListTypeName("TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST", buffer)` returns an array of objects with keys in the order `judge, time, venue, type, caseNumber, caseName, additionalInformation`

* **Scenario:** Validation schema rejects malformed data
    * **Given** an uploaded row missing `caseNumber`, or with `time` = `"half nine"`, or with `caseName` containing `<script>`
    * **When** the file is converted and validated
    * **Then** conversion fails with a row-numbered message, or `validateChdKbListType` returns `{ isValid: false, errors: [...] }`, and the artefact is not published

* **Scenario:** Published list renders as a bilingual style-guide page
    * **Given** a published artefact with `listTypeName = "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST"`
    * **When** a user opens `/technology-and-construction-court-kb-daily-cause-list?artefactId=<uuid>`
    * **Then** the page renders the list title, Rolls Building venue address, "List for <date>", "Last updated <date> at <time>", the important-information details component, a case search box, and a 7-column hearings table — and switching to `?lng=cy` renders every one of those strings in Welsh

* **Scenario:** Wrong list type is guarded
    * **Given** an artefact whose `listTypeName` is anything other than `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST`
    * **When** it is requested at this list's URL
    * **Then** the response is HTTP 400 rendering `errors/common`, and the list template is never rendered

* **Scenario:** PDF version is generated
    * **Given** the artefact is successfully processed by the publication pipeline
    * **When** `PDF_GENERATOR_REGISTRY["TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST"]` runs
    * **Then** a PDF containing the same header, important information, 7-column table, data-source line and Special Category Data caution is written to storage and is retrievable at `GET /pdf/:artefactId/download`

* **Scenario:** Case subscription email summary works
    * **Given** a user has a case-number subscription matching a case in this list
    * **When** the list is published
    * **Then** `EMAIL_BUILDER_REGISTRY` resolves an extractor for this list type and the email contains Time / Case number / Case name plus the Special Category Data warning

## 4. User Journey Flow

Two journeys. Neither introduces a new screen beyond the list page itself.

**A. Admin publishing journey (existing screens, new dropdown option)**

```
Sign in (CTSC/Local admin)
        │
        ▼
/admin-dashboard ── "Manually upload a non-strategic publication"
        │
        ▼
/non-strategic-upload
  • Court            → "Business and Property Courts Rolls Building"
  • List type        → "Technology and Construction Court (KB) Daily Cause List"   ← NEW OPTION
  • Hearing date, Sensitivity (Public default), Language, Display from/to
  • Choose .xlsx file
        │
        ▼  (Excel → JSON via CHD_KB_EXCEL_CONFIG; row-level errors surfaced here)
/non-strategic-upload-summary  ── check answers ── Confirm
        │
        ▼  publication pipeline: schema validate → store JSON → generate PDF → notify subscribers
/non-strategic-upload-confirmation
```

**B. Public reading journey (existing screens, new destination page)**

```
/  ── Start now
        │
        ▼
/view-option → "Court or tribunal hearing lists"
        │
        ▼
/courts-tribunals-list  ── search/filter ── "Business and Property Courts Rolls Building"
        │
        ▼
/summary-of-publications?locationId=26
  lists published for this court, grouped by date
        │
        ▼  link built from ListType.url
/technology-and-construction-court-kb-daily-cause-list?artefactId=<uuid>     ← NEW PAGE
  • read the table, filter it with the search box
  • toggle Cymraeg / English at any point
```

## 5. Low Fidelity Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                     English | Cymraeg    │
├──────────────────────────────────────────────────────────────────────────────┤
│ ALPHA  This is a new service – your feedback will help us improve it.        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Technology and Construction Court (King's Bench Division)         [h1, #top]│
│  Daily Cause List                                                            │
│                                                                              │
│  Find contact details and other information about courts and tribunals       │
│  in England and Wales, and some non-devolved tribunals in Scotland.          │
│                                                                              │
│  Rolls Building                                              [bold]          │
│  Fetter Lane, London                                                         │
│  EC4A 1NL                                                                    │
│                                                                              │
│  List for 13 August 2026                                     [bold]          │
│  Last updated 13 August 2026 at 9:30am                                       │
│                                                                              │
│  ▼ Important information                              [govukDetails, open]    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ <TCC-specific listing / remote-hearing guidance — see §14 Q1>          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Search Cases                                                        [h2]     │
│  ┌──────────────────────────────────┐   (label visually hidden:              │
│  │ #case-search-input               │    "Search by case number, name,       │
│  └──────────────────────────────────┘    venue, judge, type, or other        │
│                                          information")                       │
│                                                                              │
│  ┌────────┬───────┬─────────┬──────┬────────────┬───────────┬─────────────┐ │
│  │ Judge  │ Time  │ Venue   │ Type │ Case number│ Case name │ Additional  │ │
│  │        │       │         │      │            │           │ information │ │
│  ├────────┼───────┼─────────┼──────┼────────────┼───────────┼─────────────┤ │
│  │ Mr     │ 10:30am│ Court  │ Trial│ HT-2026-   │ Acme Ltd  │ Remote      │ │
│  │ Justice│       │ 61     │      │ 000123     │ v Beta plc│ hearing     │ │
│  │ Smith  │       │        │      │            │           │             │ │
│  ├────────┼───────┼─────────┼──────┼────────────┼───────────┼─────────────┤ │
│  │ ...    │ ...   │ ...    │ ...  │ ...        │ ...       │             │ │
│  └────────┴───────┴─────────┴──────┴────────────┴───────────┴─────────────┘ │
│                                                                              │
│  Data source: Courts and Tribunals Service Centre                    [s]     │
│                                                                              │
│  Back to top ↑  (anchor to #top)                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ GOV.UK footer — Accessibility statement · Cookies · Privacy policy           │
└──────────────────────────────────────────────────────────────────────────────┘
```

Empty-list state (`hearings.length === 0`) replaces the table with a single paragraph: "No hearings scheduled for this section".

## 6. Page Specifications

### 6.1 New lib: `libs/list-types/technology-and-construction-court-kb-daily-cause-list/`

A thin package over `@hmcts/chd-kb-common` — the same shape as `companies-winding-up-chd-daily-cause-list`. It owns **only** locale copy, the renderer wrapper, and the PDF generator/template.

```
libs/list-types/technology-and-construction-court-kb-daily-cause-list/
├── package.json          # @hmcts/technology-and-construction-court-kb-daily-cause-list
├── tsconfig.json
└── src/
    ├── config.ts                        # moduleRoot, assets
    ├── index.ts                         # re-exports + side-effect converter registration
    ├── conversion/
    │   ├── technology-and-construction-court-kb-daily-cause-list-config.ts
    │   └── technology-and-construction-court-kb-daily-cause-list-config.test.ts
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

**No `src/schemas/` and no `src/validation/` directory.** The schema lives in `chd-kb-common`; `validateChdKbListType` is re-exported under a list-specific alias so the dynamic dispatcher in `libs/list-types/common/src/validation/list-type-validator.ts` (which imports `@hmcts/<kebab-cased-list-type-name>` and picks the first `validate*` export) resolves it. Because the package ships no `src/schemas/*.json`, the CI guard at `libs/list-types/common/src/validation/guard.test.ts` does not apply — exactly as for `companies-winding-up-chd-daily-cause-list`.

`src/config.ts`:
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "assets/");
```

`src/index.ts`:
```typescript
import "./conversion/technology-and-construction-court-kb-daily-cause-list-config.js"; // Register converter on module load

// The hearing shape, schema, validator and email-summary logic live in @hmcts/chd-kb-common and
// are shared with Companies Winding Up (ChD). They are re-exported under this list type's own
// names so libs/publication's PDF registry, libs/notifications' email registry and the dynamic
// validator dispatcher all resolve them by this package's name.
export type {
  ChdKbHearing as TechnologyAndConstructionCourtKbHearing,
  ChdKbHearingList as TechnologyAndConstructionCourtKbHearingList
} from "@hmcts/chd-kb-common";
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateTechnologyAndConstructionCourtKbDailyCauseList
} from "@hmcts/chd-kb-common";
export type { ValidationResult } from "@hmcts/publication";
export { cy as technologyAndConstructionCourtKbDailyCauseListCy } from "./locales/cy.js";
export { en as technologyAndConstructionCourtKbDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

`src/conversion/technology-and-construction-court-kb-daily-cause-list-config.ts`:
```typescript
import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

// Field definitions are shared via @hmcts/chd-kb-common. Registration under this list type's own
// DB name must stay here — the converter registry is keyed on the stable listTypeName.
export const TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;

registerConverterByName(
  "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST",
  createConverter(TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_EXCEL_CONFIG)
);
```

`src/rendering/renderer.ts`:
```typescript
import { type ChdKbHearing, type ChdKbHearingList, renderChdKbHearingList } from "@hmcts/chd-kb-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
}

export interface RenderedData {
  header: { listTitle: string; listDate: string; lastUpdatedDate: string; lastUpdatedTime: string };
  hearings: ChdKbHearing[];
}

// Rendering logic is shared via @hmcts/chd-kb-common. Only the list title is list-type specific,
// so it is sourced from this package's locale files and passed in.
export function renderTechnologyAndConstructionCourtKbDailyCauseList(
  hearingList: ChdKbHearingList,
  options: RenderOptions
): RenderedData {
  const t = options.locale === "cy" ? cy : en;
  return renderChdKbHearingList(hearingList, { ...options, listTitle: t.pageTitle });
}
```

`src/pdf/pdf-generator.ts` — copy `companies-winding-up-chd-daily-cause-list/src/pdf/pdf-generator.ts` verbatim, renaming the exported function to `generateTechnologyAndConstructionCourtKbDailyCauseListPdf` and swapping the renderer/locale imports. It keeps `BasePdfGenerationOptions<ChdKbHearingList> & { contentDate: Date }`, `configureNunjucks(__dirname)`, `PDF_BASE_STYLES`, `loadTranslations`, `generatePdfFromHtml`, `savePdfToStorage` and `createPdfErrorResult`.

`src/pdf/pdf-template.njk` — copy the sibling template verbatim; structure is identical (header block, venue address, list/last-updated dates, important-information box, 7-column table with `no-wrap` on Judge/Time/Case number, footer with data source and the two caution paragraphs).

`package.json` — copy the sibling's, changing only `name`. Dependencies: `@hmcts/chd-kb-common`, `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `exceljs 4.4.0`, `luxon 3.7.2`, `nunjucks 3.2.4`; devDeps `@types/luxon 3.7.4`, `@types/node 24.10.4`, `typescript 6.0.3`, `vitest 4.1.10`; peerDep `express ^5.1.0`. Keep the `build:nunjucks` script so `pdf-template.njk` is copied into `dist/pdf/`.

### 6.2 New page: `apps/web/src/pages/(list-types)/technology-and-construction-court-kb-daily-cause-list/`

```
├── index.ts                                                          # GET
├── technology-and-construction-court-kb-daily-cause-list.njk
├── index.test.ts
└── technology-and-construction-court-kb-daily-cause-list.njk.test.ts
```

`index.ts`:
```typescript
import {
  type TechnologyAndConstructionCourtKbHearingList,
  technologyAndConstructionCourtKbDailyCauseListCy as cy,
  technologyAndConstructionCourtKbDailyCauseListEn as en,
  renderTechnologyAndConstructionCourtKbDailyCauseList,
  validateTechnologyAndConstructionCourtKbDailyCauseList as validate
} from "@hmcts/technology-and-construction-court-kb-daily-cause-list";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const SUPPORTED_LIST_TYPE = "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<TechnologyAndConstructionCourtKbHearingList>({
  en,
  cy,
  validate,
  logPrefix: "technology-and-construction-court-kb-daily-cause-list",
  guardArtefact: (artefact, res) => {
    if (artefact.listTypeName !== SUPPORTED_LIST_TYPE) {
      res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
      return true;
    }
    return false;
  },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderTechnologyAndConstructionCourtKbDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("technology-and-construction-court-kb-daily-cause-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      dataSource
    });
  }
});
```

`createSimpleListTypeHandler` already provides: missing `artefactId` → 400, unknown artefact → 404, `canAccessPublicationData` failure → 403 with `no-store`, missing blob → 404, schema failure → 400, thrown error → 500.

**Template** — copy `companies-winding-up-chd-daily-cause-list.njk` unchanged in structure:
`{% extends "layouts/base-template.njk" %}`, `{% block page_content %}`, `govuk-grid-column-full`, `<h1 class="govuk-heading-l" id="top">`, FaCT link paragraph, venue address block, list/last-updated paragraphs, `govukDetails({ summaryText: t.importantInformationHeading, html: ..., open: true })`, the `#case-search-input` + `#hearings-table-container` + `.hearings-table` combination that the global `table-search.ts` auto-wires, seven `<th scope="col">` headers, `{% for hearing in hearings %}`, `{% else %}` no-hearings paragraph, data-source line, back-to-top anchor.

### 6.3 Registration touch-points (existing files to edit)

1. **`libs/list-types/common/src/list-type-data.ts`** — add one entry:
   ```typescript
   {
     name: "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST",
     englishFriendlyName: "Technology and Construction Court (King's Bench Division) Daily Cause List",
     welshFriendlyName: "[TRANSLATE: \"Technology and Construction Court (King's Bench Division) Daily Cause List\"]",
     shortenedFriendlyName: "Technology and Construction Court (KB) Daily Cause List",
     provenance: "CFT_IDAM",
     urlPath: "technology-and-construction-court-kb-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [10]
   }
   ```
   `subJurisdictionIds: [10]` is `High Court` (`jurisdictionId: 1` = Civil) — the same value Companies Winding Up (ChD) uses, and the sub-jurisdiction already attached to location 26.

2. **`libs/location/src/location-data.ts`** — **no change.** `{ locationId: 26, name: "Business and Property Courts Rolls Building", welshName: "Llysoedd Busnes ac Eiddo - Adeilad Rolls", regions: [11], subJurisdictions: [10] }` already exists (added by #803).

3. **`libs/publication/src/processing/service.ts`** — add the import and the `PDF_GENERATOR_REGISTRY` entry:
   ```typescript
   TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST: (p) =>
     generateTechnologyAndConstructionCourtKbDailyCauseListPdf({
       ...p,
       jsonData: p.jsonData as TechnologyAndConstructionCourtKbHearingList
     }),
   ```

4. **`libs/notifications/src/notification/notification-service.ts`** — add the import and the `EMAIL_BUILDER_REGISTRY` entry:
   ```typescript
   TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST: {
     extract: extractTechnologyAndConstructionCourtKbSummary as SummaryExtractor,
     format: formatTechnologyAndConstructionCourtKbSummaryForEmail
   },
   ```

5. **Converter side-effect imports** — add to both admin pages so `registerConverterByName` runs in that request's module graph:
   - `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`
   - `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`
   ```typescript
   import "@hmcts/technology-and-construction-court-kb-daily-cause-list"; // Register TCC (KB) converter
   ```

6. **`apps/web/src/app.ts`** — import `moduleRoot` from `@hmcts/technology-and-construction-court-kb-daily-cause-list/config` and push it into the `modulePaths` array passed to `configureGovuk` so Nunjucks resolves the template.

7. **Root `tsconfig.json`** — add both path aliases:
   ```json
   "@hmcts/technology-and-construction-court-kb-daily-cause-list": ["libs/list-types/technology-and-construction-court-kb-daily-cause-list/src"],
   "@hmcts/technology-and-construction-court-kb-daily-cause-list/config": ["libs/list-types/technology-and-construction-court-kb-daily-cause-list/src/config"]
   ```

8. **Workspace dependencies** — add `"@hmcts/technology-and-construction-court-kb-daily-cause-list": "workspace:*"` to `apps/web/package.json`, `libs/publication/package.json` and `libs/notifications/package.json`.

9. **`apps/web/vite.config.ts`** — no change. The module ships no `assets/` directory (the sibling exports an `assets` path but has no such directory on disk); styling and search behaviour come entirely from the global bundle.

10. **`libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json`** — change `"title"` from `"Companies Winding Up (Chancery Division) Daily Cause List"` to a shared name such as `"CHD/KB Rolls Building Daily Cause List"`. The file is now genuinely shared by two list types and the stale title is misleading. No behavioural change (`title` is not validated against).

### 6.4 Database schema changes

None. No new Prisma models or columns. `list_type`, `location`, `region` and the link tables already exist and are populated from `list-type-data.ts` / `location-data.ts`.

## 7. Content

Locale keys mirror the sibling exactly so the shared template needs no edits. `Object.keys(en).sort()` must equal `Object.keys(cy).sort()`.

### `src/locales/en.ts`

```typescript
import { provenanceLabelsEn as provenanceLabels } from "@hmcts/list-types-common";

export const en = {
  pageTitle: "Technology and Construction Court (King's Bench Division) Daily Cause List",
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  venueName: "Rolls Building",
  addressLine1: "Fetter Lane, London",
  addressLine2: "EC4A 1NL",
  importantInformationHeading: "Important information",
  importantInformationHeading1: "<TCC listing guidance heading — see §14 Q1>",
  importantInformationLine1: "<TCC listing guidance body — see §14 Q1>",
  searchCasesTitle: "Search Cases",
  searchCasesLabel: "Search by case number, name, venue, judge, type, or other information",
  tableHeaders: {
    judge: "Judge",
    time: "Time",
    venue: "Venue",
    type: "Type",
    caseNumber: "Case number",
    caseName: "Case name",
    additionalInformation: "Additional information"
  },
  noHearingsMessage: "No hearings scheduled for this section",
  dataSource: "Data source",
  backToTop: "Back to top",
  listFor: "List for",
  lastUpdated: "Last updated",
  at: "at",
  cautionNote:
    "Note this document contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.",
  cautionReporting:
    "This document contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.",
  provenanceLabels
};
```

### `src/locales/cy.ts`

```typescript
import { provenanceLabelsCy as provenanceLabels } from "@hmcts/list-types-common";

export const cy = {
  pageTitle: "[TRANSLATE: \"Technology and Construction Court (King's Bench Division) Daily Cause List\"]",
  factLinkText: "[TRANSLATE: \"Find contact details and other information about courts and tribunals\"]",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "[TRANSLATE: \"in England and Wales, and some non-devolved tribunals in Scotland.\"]",
  venueName: "Rolls Building",
  addressLine1: "Fetter Lane, London",
  addressLine2: "EC4A 1NL",
  importantInformationHeading: "[TRANSLATE: \"Important information\"]",
  importantInformationHeading1: "[TRANSLATE: \"<TCC listing guidance heading — see §14 Q1>\"]",
  importantInformationLine1: "[TRANSLATE: \"<TCC listing guidance body — see §14 Q1>\"]",
  searchCasesTitle: "[TRANSLATE: \"Search Cases\"]",
  searchCasesLabel: "[TRANSLATE: \"Search by case number, name, venue, judge, type, or other information\"]",
  tableHeaders: {
    judge: "[TRANSLATE: \"Judge\"]",
    time: "[TRANSLATE: \"Time\"]",
    venue: "[TRANSLATE: \"Venue\"]",
    type: "[TRANSLATE: \"Type\"]",
    caseNumber: "[TRANSLATE: \"Case number\"]",
    caseName: "[TRANSLATE: \"Case name\"]",
    additionalInformation: "[TRANSLATE: \"Additional information\"]"
  },
  noHearingsMessage: "[TRANSLATE: \"No hearings scheduled for this section\"]",
  dataSource: "[TRANSLATE: \"Data source\"]",
  backToTop: "[TRANSLATE: \"Back to top\"]",
  listFor: "[TRANSLATE: \"List for\"]",
  lastUpdated: "[TRANSLATE: \"Last updated\"]",
  at: "[TRANSLATE: \"at\"]",
  cautionNote:
    "[TRANSLATE: \"Note this document contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.\"]",
  cautionReporting:
    "[TRANSLATE: \"This document contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.\"]",
  provenanceLabels
};
```

`venueName`, `addressLine1`, `addressLine2` and `factLinkUrl` are intentionally untranslated — the sibling keeps the Rolls Building address in English in both locales.

### Excel style guide (the uploaded template)

Sheet 1, row 1 headers exactly as below (matched case-insensitively by `CHD_KB_EXCEL_CONFIG`), data from row 2, at least one data row:

| Column | Header | Field | Required | Format |
|---|---|---|---|---|
| A | Judge | `judge` | Yes | Free text, no HTML |
| B | Time | `time` | Yes | `9am`, `10:30am`, `2.15pm` |
| C | Venue | `venue` | Yes | Free text, no HTML |
| D | Type | `type` | Yes | Free text, no HTML |
| E | Case Number | `caseNumber` | Yes | Free text, no HTML |
| F | Case Name | `caseName` | Yes | Free text, no HTML |
| G | Additional Information | `additionalInformation` | Yes | Free text, no HTML |

Sample JSON produced:
```json
[
  {
    "judge": "Mr Justice Smith",
    "time": "10:30am",
    "venue": "Court 61",
    "type": "Trial",
    "caseNumber": "HT-2026-000123",
    "caseName": "Acme Ltd v Beta plc",
    "additionalInformation": "Remote hearing via MS Teams"
  }
]
```

## 8. URL

| Purpose | Path | Notes |
|---|---|---|
| Public list page | `/technology-and-construction-court-kb-daily-cause-list?artefactId=<uuid>` | `GET` only. Auto-discovered from `apps/web/src/pages/(list-types)/technology-and-construction-court-kb-daily-cause-list/index.ts`; `(list-types)` is a route group and adds no prefix |
| Welsh | `/technology-and-construction-court-kb-daily-cause-list?artefactId=<uuid>&lng=cy` | Locale resolved by the i18n middleware into `res.locals.locale` |
| PDF | `GET /pdf/:artefactId/download` | Existing shared route (`libs/public-pages/src/routes/pdf/[artefactId]/download.ts`) — no new route |
| Inbound link | `/summary-of-publications?locationId=26` | Link built from `ListType.url`, so `urlPath` in `list-type-data.ts` **must** be `technology-and-construction-court-kb-daily-cause-list` to match the page directory |
| Admin upload | `/non-strategic-upload` → `/non-strategic-upload-summary` | Existing pages; only a new dropdown option |

## 9. Validation

### Layer 1 — Excel → JSON (`CHD_KB_EXCEL_CONFIG`, `minRows: 1`)

| Rule | Applies to | Behaviour on failure |
|---|---|---|
| Header row must contain all 7 headers | Sheet 1 row 1 | File-level error naming the missing header |
| Cell must not be empty | All 7 fields (`required: true`) | Row-numbered error |
| Cell must not contain HTML tags (`validateNoHtmlTags`) | judge, venue, type, caseNumber, caseName, additionalInformation | Row-numbered error naming the field |
| Time must match `TIME_PATTERN` (`validateTimeFormatSimple`) | time | Row-numbered error |
| At least one data row | Sheet | File rejected |

### Layer 2 — JSON schema (`chd-kb-common.json`, draft-07)

- Root `type: "array"`, items `type: "object"`
- `required`: all seven of `judge, time, venue, type, caseNumber, caseName, additionalInformation`
- Six text fields carry the no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`
- `time` carries `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`

Invoked twice: once by the upload pipeline via the dynamic dispatcher `validateListTypeJson`, and again by the page handler before rendering (defence against a corrupted blob).

### Layer 3 — page handler guards

| Condition | Result |
|---|---|
| Missing / non-string `artefactId` | 400 `errors/common` |
| Artefact not found | 404 `errors/common` |
| `canAccessPublicationData` false | 403 `errors/403`, `Cache-Control: no-store` |
| `artefact.listTypeName !== "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST"` | 400 `errors/common` |
| Blob missing | 404 `errors/common` |
| Schema invalid | 400 `errors/common` |
| Unexpected throw | 500 `errors/common` |

No numeric `listTypeId` is compared anywhere. Routing is keyed on the stable `listTypeName` string only.

## 10. Error Messages

Admin-facing (`/non-strategic-upload`, surfaced in the GOV.UK error summary with `href` to the file input):

| Trigger | Message |
|---|---|
| Header missing | `Missing required column 'Case Number' in the uploaded file` |
| Empty required cell | `'Judge' in row 4 is required` |
| HTML in a cell | `'Case Name' in row 7 must not contain HTML tags` |
| Bad time | `'Time' in row 3 is not a valid time. Enter a time like 10:30am` |
| No data rows | `The uploaded file contains no hearings` |
| Post-conversion schema failure | `The uploaded file does not match the schema for this list type` |

Exact strings are produced by the shared `convertExcelToJson` / `validators.ts` helpers and are unchanged by this ticket — the table records the format admins will see, not new copy to author.

Public-facing (`errors/common`, existing copy):

| Status | Title | Message |
|---|---|---|
| 400 (no `artefactId`) | Bad Request | Missing artefactId parameter |
| 400 (wrong list type) | Invalid List Type | This list type is not supported by this module |
| 400 (bad data) | Invalid Data | The list data is invalid |
| 404 | Not Found | The requested list could not be found |
| 403 | Access denied | You do not have permission to view this publication. |
| 500 | Error | An error occurred while displaying the list |

## 11. Navigation

- **Into the page:** only from `/summary-of-publications?locationId=26`, via a link built as `/{{ publication.urlPath }}?artefactId={{ publication.id }}`. There is no direct navigation and no menu entry.
- **No back link.** The sibling list pages omit `govukBackLink` — these are destination content pages, not steps in a question flow. Users return via the browser or the service header.
- **Back to top:** in-page `<a href="#top">` targeting the `id="top"` on the `<h1>`.
- **Language toggle:** the service-navigation English/Cymraeg links preserve `artefactId` and flip `lng`.
- **FaCT link:** external, opens in the same tab (consistent with siblings), pointing at `https://www.find-court-tribunal.service.gov.uk/`.
- **After admin upload:** `/non-strategic-upload` → POST → `/non-strategic-upload-summary` → POST → confirmation page. Validation failures re-render the current step with `data: req.body` preserved.
- **PDF:** generated and stored at publication time; retrievable at `/pdf/:artefactId/download`. No visible download link is added to the list page — see §14 Q2.

## 12. Accessibility

WCAG 2.2 AA. The template is structurally identical to the sibling, which already passes the axe checks in the E2E suite.

| Requirement | How it is met |
|---|---|
| Page title matches `<h1>` | `title: header.listTitle` passed to `res.render`; `<h1>` renders `header.listTitle` |
| Heading hierarchy | `h1` list title → `h2` "Search Cases". The `govukDetails` summary is a `<summary>`, not a heading, so no level is skipped |
| Table semantics | `<table class="govuk-table hearings-table">` with `<thead>` and seven `<th scope="col">`; `aria-label="{{ t.pageTitle }}"` on the table |
| Search input labelled | `<label class="govuk-label govuk-visually-hidden" for="case-search-input">` — a real label, visually hidden, not a placeholder |
| Language of page | `lang` attribute set to `en`/`cy` by the base layout so screen readers use the right pronunciation for Welsh |
| Keyboard | Details component, search input and all links are native focusable elements; no custom widgets, no keyboard traps. Tab order follows reading order |
| Progressive enhancement | With JS disabled the full table renders; only client-side filtering (`table-search.ts`) is lost. Nothing essential depends on JS |
| Colour not sole carrier | Search highlighting adds a `<mark>`-style wrapper, not colour alone; no status is conveyed by colour |
| Contrast | GOV.UK Frontend classes only; no custom colours or inline styles |
| Touch targets | Links and the details summary use default GOV.UK sizing (≥44px effective) |
| Reflow / small screens | `govuk-grid-column-full` plus the shared responsive table styles; horizontal scroll on the table rather than truncation |
| Announced dynamic filtering | Rows are hidden with `style.display`, which removes them from the a11y tree — acceptable as an enhancement, but see §14 Q4 for a live-region follow-up |

## 13. Test Scenarios

**Lib unit tests**

* Converter registration: `hasConverterForListTypeName("TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST")` is `true` after importing the package. Field-level behaviour is already covered by `chd-kb-common`'s suite and is not duplicated.
* Renderer: returns the English `pageTitle` as `header.listTitle` for `locale: "en"` and the Welsh one for `locale: "cy"`; formats `listDate` from `contentDate` and splits `lastReceivedDate` into `lastUpdatedDate`/`lastUpdatedTime`; passes hearings through unchanged and does not mutate the input array.
* PDF generator: renders the Nunjucks template and calls `savePdfToStorage` on success; returns `{ success: false, error }` when `generatePdfFromHtml` fails; returns an error result rather than throwing when the renderer throws.
* Locale parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, and the same for the nested `tableHeaders` object.

**Page controller tests**

* Renders the template with `en`, `cy`, `t`, `title`, `header`, `hearings` and `dataSource` for a valid artefact of the supported list type.
* Returns 400 and renders `errors/common` when `artefact.listTypeName` is a different list type — with the fixture deliberately using `listTypeId: 999` to prove routing is ID-independent.
* Returns 400 when `artefactId` is absent, 404 when the artefact or its blob is missing, 403 when access is denied, 400 when the JSON fails schema validation, and 500 on an unexpected throw.
* Selects Welsh content when `res.locals.locale === "cy"`.
* Resolves the data-source label from the artefact provenance via the locale `provenanceLabels`.

**Template tests** (`*.njk.test.ts`, Cheerio, isolated `createTestEnvironment`)

* `h1#top` contains the list title; venue name and both address lines render.
* Exactly seven `th[scope="col"]` in the specified order; one `tbody tr` per hearing; each cell maps to the right field.
* Empty hearings array renders the no-hearings paragraph and no table.
* The search input has `id="case-search-input"` with an associated `label[for]`, and the table carries the `hearings-table` class inside `#hearings-table-container` (the contract the global search JS relies on).
* Rendering with the `cy` locale object shows the Welsh headings and table headers.
* Data-source line and back-to-top anchor are present, and the anchor href matches the `h1` id.

**Registry integration**

* `PDF_GENERATOR_REGISTRY` and `EMAIL_BUILDER_REGISTRY` both resolve an entry for the new `listTypeName`.
* The dynamic dispatcher `validateListTypeJson` resolves a `validate*` export for a list type row named `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST` (confirms the re-export alias is picked up and no `PACKAGE_ALIASES` entry is needed).
* `listTypeData` contains exactly one entry with this name, its `urlPath` matches the page directory name, and `isNonStrategic` is `true`.

**E2E**

* No new spec file. The existing `e2e-tests/tests/admin/non-strategic-upload.spec.ts` journey already covers the upload flow end to end; extend it only if the new list type needs distinct coverage, and if so reuse the single existing journey test (validation, Welsh and axe checks inline) rather than adding per-assertion tests. Do not introduce another hardcoded numeric list-type `selectOption` value — select by visible option text.

## 14. Assumptions & Open Questions

* **Q1 — "Important information" copy is the only genuinely missing content, and it blocks nothing else.** Every other string is either shared with the sibling or derivable. The TCC-specific heading and body must come from the authoritative `pip-frontend` locale files (`src/main/resources/locales/{en,cy}/technology-and-construction-court-kb-daily-cause-list.json`), the same source #803 used. Until supplied, implement with a clearly-marked placeholder and treat it as a pre-launch blocker, not a merge blocker.
* **Q2 — The AC says "A PDF downloadable version of the hearing list is created", but the sibling exposes no download link on the page.** For Companies Winding Up (ChD) the PDF is generated into storage and served by the shared `/pdf/:artefactId/download` route; only the SJP lists render a visible "Download PDF" link. This spec assumes parity with the sibling (generate + shared route, no new link). If product wants a visible link on the page, that is additional scope in the template and locale files — confirm before build.
* **Q3 — The AC lists six fields ("Judge, Time, Venue Type, Case Number, Case Name and Additional Information") but the shared schema has seven, with Venue and Type separate.** This spec implements the seven-field shared shape, reading "Venue Type" as a typo for "Venue, Type". That reading is strongly supported: the sibling list at the same court, on the same schema, uses seven columns, and #803's AC was worded the same way. If product genuinely intends a single combined "Venue Type" column, the shared `chd-kb-common` schema and converter cannot be reused and the estimate roughly triples — confirm before build.
* **Q4 — Client-side row filtering is not announced to screen readers.** `table-search.ts` hides rows with `style.display = "none"`, so an assistive-technology user gets no "N results" feedback. This is pre-existing across all lists using the shared search and is out of scope here; worth raising as a separate accessibility ticket rather than fixing in one list type.
* **Assumption — list type name and URL path.** `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST` / `technology-and-construction-court-kb-daily-cause-list`, mirroring the `COMPANIES_WINDING_UP_CHD_...` precedent. The name drives the package name resolved by the dynamic validator dispatcher, so it must match the kebab-cased package directory exactly or a `PACKAGE_ALIASES` entry becomes necessary.
* **Assumption — `provenance: "CFT_IDAM"`, `defaultSensitivity: "Public"`, `isNonStrategic: true`, `subJurisdictionIds: [10]`**, all matching the sibling. Public sensitivity means the list is visible without sign-in.
* **Assumption — location reference data needs no change.** Location 26 already exists with `regions: [11]` and `subJurisdictions: [10]`. This is a real difference from #803's plan, which had to create it. Verify with `yarn db:seed` and a query against `location` before assuming the environment is already seeded.
* **Assumption — no `assets/` directory.** Styling and search behaviour come from the global web bundle, so `apps/web/vite.config.ts` is untouched. If bespoke CSS turns out to be needed, that adds a `vite.config.ts` change.
* **Note — this ticket also justifies genericising the shared schema's `title`.** With two consumers, `"Companies Winding Up (Chancery Division) Daily Cause List"` as the title of `chd-kb-common.json` is actively misleading. Cosmetic, zero behavioural risk, and cheapest to do now.


### Comment by OgechiOkelu on 2026-08-13T10:22:26Z

@plan 
