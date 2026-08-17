# #804: Competition List (ChD) daily cause list

**State:** OPEN
**Assignees:** alao-daniel
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:06:18Z
**Updated:** 2026-08-11T15:17:31Z

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Competition List (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.


**AS A** Service

**I WANT** to create the validation schema and style guides for Competition List (ChD) daily cause list

**SO THAT** the Competition List (ChD) daily cause list can be published in CaTH


**ACCEPTANCE CRITERIA**
- The Competition List (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH  and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Competition List (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Competition List (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Competition List (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/competition-list-chd-daily-cause-list?artefactId=504b46d6-f6b4-4d13-a145-6bbe3b35f1aa
- The Json file should follow the below format
[
{
"judge":"Judge A",
"time":"9am",
"venue":"Venue A",
"type":"Type A",
"caseNumber":"12345",
"caseName":"Case name A",
"additionalInformation":"This is additional information"
},
{
"judge":"Judge B",
"time":"10:30pm",
"venue":"Venue B",
"type":"Type B",
"caseNumber":"12346",
"caseName":"Case name B",
"additionalInformation":"This is another additional information"
}
]

## Comments

### Comment by OgechiOkelu on 2026-07-22T15:36:38Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T15:44:17Z
# Technical Specification: Competition List (ChD) Daily Cause List

**GitHub Issue:** #804
**List type name (stable, `@unique`):** `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`
**URL path:** `/competition-list-chd-daily-cause-list`

## 1. User Story

**As a** member of the public, legal professional, or member of the media using Court and Tribunal Hearings (CaTH)
**I want to** view, and download as PDF or Excel, the Competition List (ChD) daily cause list published under the Business and Property Courts Rolls Building
**So that** I can find out which competition cases are being heard, before which judge, at what time and venue, on a given day.

Supporting (publisher) story from the issue:

**As a** Service
**I want** to create the validation schema and style guide for the Competition List (ChD) daily cause list
**So that** the Competition List (ChD) daily cause list can be published in CaTH via the non-strategic Excel upload route.

## 2. Background

This is a **non-strategic** list type. Publication happens through the existing Excel upload route in CaTH: a publisher uploads an Excel template, which is converted to JSON, validated against a JSON schema, stored as an artefact, and rendered to HTML with downloadable PDF and Excel versions.

The list belongs under the **Business and Property Courts Rolls Building**, is linked to the **Civil** jurisdiction (`jurisdiction_id = 1` → sub-jurisdiction "Civil Court", `sub_jurisdiction_id = 1`) and the **Royal Courts of Justice Group** region (`region_id = 11`).

The reference style guide (staging) to match:
`https://pip-frontend.staging.platform.hmcts.net/competition-list-chd-daily-cause-list?artefactId=504b46d6-f6b4-4d13-a145-6bbe3b35f1aa`

The JSON payload is a flat array of hearing objects (from the issue):

```json
[
  {
    "judge": "Judge A",
    "time": "9am",
    "venue": "Venue A",
    "type": "Type A",
    "caseNumber": "12345",
    "caseName": "Case name A",
    "additionalInformation": "This is additional information"
  },
  {
    "judge": "Judge B",
    "time": "10:30pm",
    "venue": "Venue B",
    "type": "Type B",
    "caseNumber": "12346",
    "caseName": "Case name B",
    "additionalInformation": "This is another additional information"
  }
]
```

**Existing patterns to follow.** This list is structurally almost identical to the RCJ Standard Daily Cause List family (`libs/list-types/rcj-standard-daily-cause-list`), which also uses a flat array of hearings. It differs in two field names and the column order:

| Competition List (ChD) field | Order | Closest RCJ field |
|---|---|---|
| `judge` | 1 | `judge` |
| `time` | 2 | `time` |
| `venue` | 3 | `venue` |
| `type` | 4 | `hearingType` (renamed) |
| `caseNumber` | 5 | `caseNumber` |
| `caseName` | 6 | `caseDetails` (renamed) |
| `additionalInformation` | 7 | `additionalInformation` |

Because the field names and order differ, this needs its **own list-type module** (`libs/list-types/competition-list-chd-daily-cause-list`) and its **own Excel converter config** — it cannot reuse `RCJ_EXCEL_CONFIG` verbatim.

## 3. Acceptance Criteria

* **Scenario:** List type is registered and discoverable in CaTH
    * **Given** the reference data has been seeded
    * **When** a publisher browses list types under the Business and Property Courts Rolls Building location
    * **Then** "Competition List (ChD) Daily Cause List" is available, linked to the Civil jurisdiction and the Royal Courts of Justice Group region, and flagged `is_non_strategic = true`.

* **Scenario:** Publisher uploads a valid Excel file
    * **Given** a publisher has an Excel template with the columns Judge, Time, Venue, Type, Case Number, Case Name, Additional Information (in that order)
    * **When** they upload it through the Excel upload route for this list type
    * **Then** the file is converted to the JSON format above, validated against the schema, stored as an artefact, and no validation errors are shown.

* **Scenario:** Validation rejects malformed data
    * **Given** an uploaded file missing a required field (e.g. `judge`) or containing an HTML tag in a cell, or a `time` value that is not in the accepted format
    * **When** the file is processed
    * **Then** conversion/validation fails and the publisher is shown a clear error identifying the row and field.

* **Scenario:** Public user views the rendered list
    * **Given** a published Competition List (ChD) artefact exists
    * **When** a user opens `/competition-list-chd-daily-cause-list?artefactId=<id>`
    * **Then** the page renders a table with columns Judge, Time, Venue, Type, Case Number, Case Name, Additional Information, styled to match the staging reference, with the list date, last-updated timestamp, and data source shown.

* **Scenario:** Downloadable PDF and Excel versions
    * **Given** a published artefact
    * **When** the user selects the PDF or Excel download
    * **Then** a PDF and an Excel version of the hearing list are produced and downloadable.

* **Scenario:** Welsh language support
    * **Given** a published artefact
    * **When** the user switches to Welsh (`?lng=cy`)
    * **Then** all page furniture, table headings, and static content are shown in Welsh (hearing data itself is rendered as supplied).

## 4. User Journey Flow

Two journeys: publishing (admin/CTSC upload) and public viewing.

```
PUBLISHING (existing Excel upload route — no new UI)
┌────────────────┐   ┌──────────────────┐   ┌───────────────────┐   ┌───────────────┐
│ Publisher signs│──▶│ Selects location │──▶│ Selects list type │──▶│ Uploads Excel │
│ in             │   │ (BPC Rolls Bldg) │   │ Competition (ChD) │   │ template      │
└────────────────┘   └──────────────────┘   └───────────────────┘   └───────┬───────┘
                                                                             │
                          ┌──────────────────────────────────────────────────┘
                          ▼
        ┌─────────────────────────────┐   valid    ┌──────────────────────────┐
        │ Excel → JSON conversion +   │───────────▶│ Artefact stored,         │
        │ schema validation           │            │ PDF + Excel generated    │
        └──────────────┬──────────────┘            └──────────────────────────┘
                       │ invalid
                       ▼
        ┌─────────────────────────────┐
        │ Error shown (row + field)   │
        └─────────────────────────────┘

PUBLIC VIEWING
┌──────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│ User finds list  │──▶│ GET /competition-list-chd- │──▶│ Guard: artefact.listType   │
│ (search/location)│   │ daily-cause-list?artefactId│   │ Name === COMPETITION_...   │
└──────────────────┘   └───────────────────────────┘   └────────────┬──────────────┘
                                                                     │ match
                          ┌──────────────────────────────────────────┘
                          ▼
        ┌──────────────────────────────────────────────────────────┐
        │ Render HTML table + PDF/Excel download links + Welsh toggle│
        └──────────────────────────────────────────────────────────┘
```

## 5. Low Fidelity Wireframe

```
┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings                          Cymraeg  │
├──────────────────────────────────────────────────────────────────────┤
│ [phase banner: Beta]                                                   │
│                                                                        │
│  Competition List (ChD) Daily Cause List                    (h1)      │
│                                                                        │
│  Find contact details and other information about courts and          │
│  tribunals in England and Wales... (FaCT link)                        │
│                                                                        │
│  Royal Courts of Justice (Rolls Building)               (location)    │
│  Fetter Lane, London                                                   │
│  EC4A 1NL                                                              │
│                                                                        │
│  List for: 22 July 2026                                                │
│  Last updated: 22 July 2026 at 9:30am                                 │
│                                                                        │
│  ▸ Important information                              (govukDetails)   │
│                                                                        │
│  Search Cases                                                          │
│  [ search by judge, case number, name, venue...            ] (input)  │
│                                                                        │
│  [ Download PDF ]   [ Download Excel ]                                 │
│                                                                        │
│  ┌───────┬──────┬───────┬──────┬───────────┬───────────┬───────────┐  │
│  │ Judge │ Time │ Venue │ Type │ Case      │ Case name │ Additional│  │
│  │       │      │       │      │ number    │           │ info      │  │
│  ├───────┼──────┼───────┼──────┼───────────┼───────────┼───────────┤  │
│  │Judge A│ 9am  │Venue A│Type A│ 12345     │ Case A    │ ...       │  │
│  │Judge B│10:30 │Venue B│Type B│ 12346     │ Case B    │ ...       │  │
│  │       │ pm   │       │      │           │           │           │  │
│  └───────┴──────┴───────┴──────┴───────────┴───────────┴───────────┘  │
│                                                                        │
│  Data source: Manual upload                                            │
│  ↑ Back to top                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

**Rendered page** (`apps/web/src/pages/(list-types)/competition-list-chd-daily-cause-list/`):

- `index.ts` — GET controller. Reuses the shared list-type handler helpers (`createSimpleListTypeHandler` + a single-list guard/render from `../list-type-handler.js`), a `createJsonValidator(schemaPath)` validator, and the module's `renderCompetitionListChd` renderer. Guards on `artefact.listTypeName === "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST"` (never a numeric id — per CLAUDE.md). Imports the schema via the module's `/config` subpath export.
- `index.njk` — template extending `layouts/base-template.njk`, using `page_content` block. Full-width grid. Renders header block, FaCT link, location lines, list date / last-updated, an `Important information` `govukDetails`, a client-side case search input, a `govukTable` of hearings, PDF/Excel download links, data-source line, and back-to-top link. Model closely on `civil-courts-rcj-daily-cause-list.njk` but with the seven Competition List columns in the specified order.
- `index.test.ts` — controller unit tests (GET renders, guard rejects wrong list type with `errors/common`).
- `competition-list-chd-daily-cause-list.njk.test.ts` — template tests using `@hmcts/test-support` (`createTestEnvironment` / `render`), asserting on structure (column headers, row count, colspan behaviour) and Welsh headings.

**Business logic module** (`libs/list-types/competition-list-chd-daily-cause-list/`):

```
libs/list-types/competition-list-chd-daily-cause-list/
├── package.json                         # @hmcts/competition-list-chd-daily-cause-list
├── tsconfig.json
└── src/
    ├── config.ts                        # moduleRoot, schemaPath
    ├── index.ts                         # exports + side-effect converter registration
    ├── models/
    │   └── types.ts                     # CompetitionHearing, CompetitionHearingList
    ├── schemas/
    │   └── competition-list-chd-daily-cause-list.json
    ├── validation/
    │   ├── json-validator.ts            # validateCompetitionListChdDailyCauseList
    │   └── json-validator.test.ts       # real-schema tests, one per required field
    ├── conversion/
    │   ├── competition-list-chd-config.ts        # Excel converter config + registerConverterByName
    │   └── competition-list-chd-config.test.ts
    ├── rendering/
    │   ├── renderer.ts                  # renderCompetitionListChd
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts             # generateCompetitionListChdDailyCauseListPdf
    │   └── pdf-template.njk
    └── locales/
        ├── en.ts
        └── cy.ts
```

**Registration touch-points** (existing shared files to edit):

1. `libs/list-types/common/src/list-type-data.ts` — add a `ListTypeData` entry (see §7).
2. `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` — add the `list_types` upsert row (columns: `name, friendly_name, welsh_friendly_name, shortened_friendly_name, url, default_sensitivity, allowed_provenance, is_non_strategic, updated_at`).
3. `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — add `('COMPETITION_LIST_CHD_DAILY_CAUSE_LIST', 1)` to the mapping (Civil Court sub-jurisdiction).
4. `libs/location/src/location-data.ts` — ensure a "Business and Property Courts Rolls Building" location exists in region 11 (RCJ Group) linked to sub-jurisdiction 1; add it if missing (see §14). There is currently **no** Rolls Building location record.
5. `libs/publication/src/processing/service.ts` — add the top-of-file `import` of `@hmcts/competition-list-chd-daily-cause-list`, define a `PdfGenerator` wrapper, and register it in `PDF_GENERATOR_REGISTRY` under key `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`. (If no generator is registered, `generatePublicationPdf` silently produces no PDF.)
6. `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` — add the side-effect import `import "@hmcts/competition-list-chd-daily-cause-list";` so the Excel converter self-registers. Add the same side-effect import to any other upload entry point that resolves converters (e.g. `manual-upload`). **This is easy to miss** — without it `hasConverterForListTypeName` returns false and uploads fail.
7. `e2e-tests/utils/seed-list-types.ts` — add the new list-type name to `BASE_LIST_TYPES` so E2E environments seed it.
8. `apps/web/src/app.ts` / `apps/web/vite.config.ts` — register module root/assets only if the module ships app-discoverable views/assets. The PDF template is rendered internally via `configureNunjucks`, so app-level template registration is not required for the lib; the page template lives in `apps/web`.

**Package exports** (`libs/.../package.json`): expose both `"."` and `"./config"` (the latter for `schemaPath`), and include `build:nunjucks` (copy `pdf/*.njk` into `dist`) and `build:schemas` (copy `schemas/*.json` into `dist`) build steps — mirroring the RCJ package — so the schema and PDF template resolve in the production build. The `index.ts` must side-effect `import "./conversion/competition-list-chd-config.js";` at the top so the converter registers on module load.

**Data model.** No new Prisma model. Uses the existing `Artefact` / `ListType` tables. `ListType.id` is autoincrement and environment-specific — all routing and guards use `listTypeName`. List types link to **sub-jurisdictions** (not directly to jurisdictions/regions); sub-jurisdiction 1 = "Civil Court" under jurisdiction 1 = Civil.

```typescript
// libs/list-types/competition-list-chd-daily-cause-list/src/models/types.ts
export interface CompetitionHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export type CompetitionHearingList = CompetitionHearing[];
```

## 7. Content

**Reference-data entry** (`list-type-data.ts`):

```typescript
{
  name: "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST",
  englishFriendlyName: "Competition List (ChD) Daily Cause List",
  welshFriendlyName: "[TRANSLATE: \"Competition List (ChD) Daily Cause List\"]",
  provenance: "MANUAL_UPLOAD",
  urlPath: "competition-list-chd-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "Competition List (ChD) Daily Cause List",
  subJurisdictionIds: [1] // Civil Court
}
```

**Page content** (`libs/.../locales/en.ts` and `cy.ts` — identical key structure). English shown; Welsh keys use `[TRANSLATE: ...]` markers.

English (`en.ts`):

```typescript
export const en = {
  pageTitle: "Competition List (ChD) Daily Cause List",
  locationLine1: "Royal Courts of Justice (Rolls Building)",
  locationLine2: "Fetter Lane, London",
  locationLine3: "EC4A 1NL",
  importantInfoTitle: "Important information",
  importantInfoText:
    "Open justice is a fundamental principle of our justice system. You can attend a public hearing in person, or you can apply for permission to observe a hearing remotely. Requests to observe a hearing remotely should be made in good time to the court. The judge hearing the case will decide if it is appropriate for you to observe remotely.",
  searchCasesTitle: "Search Cases",
  searchCasesLabel: "Search by judge, time, venue, type, case number or case name",
  tableHeaders: {
    judge: "Judge",
    time: "Time",
    venue: "Venue",
    type: "Type",
    caseNumber: "Case number",
    caseName: "Case name",
    additionalInformation: "Additional information"
  },
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  listFor: "List for",
  lastUpdated: "Last updated",
  at: "at",
  dataSource: "Data source",
  backToTop: "Back to top",
  downloadPdf: "Download PDF",
  downloadExcel: "Download Excel"
};
```

Welsh (`cy.ts`) — mirror the same keys, each value wrapped for translation, e.g.:

```typescript
export const cy = {
  pageTitle: "[TRANSLATE: \"Competition List (ChD) Daily Cause List\"]",
  locationLine1: "[TRANSLATE: \"Royal Courts of Justice (Rolls Building)\"]",
  locationLine2: "[TRANSLATE: \"Fetter Lane, London\"]",
  locationLine3: "EC4A 1NL",
  importantInfoTitle: "[TRANSLATE: \"Important information\"]",
  importantInfoText: "[TRANSLATE: \"Open justice is a fundamental principle of our justice system. You can attend a public hearing in person, or you can apply for permission to observe a hearing remotely. Requests to observe a hearing remotely should be made in good time to the court. The judge hearing the case will decide if it is appropriate for you to observe remotely.\"]",
  searchCasesTitle: "[TRANSLATE: \"Search Cases\"]",
  searchCasesLabel: "[TRANSLATE: \"Search by judge, time, venue, type, case number or case name\"]",
  tableHeaders: {
    judge: "[TRANSLATE: \"Judge\"]",
    time: "[TRANSLATE: \"Time\"]",
    venue: "[TRANSLATE: \"Venue\"]",
    type: "[TRANSLATE: \"Type\"]",
    caseNumber: "[TRANSLATE: \"Case number\"]",
    caseName: "[TRANSLATE: \"Case name\"]",
    additionalInformation: "[TRANSLATE: \"Additional information\"]"
  },
  factLinkText: "[TRANSLATE: \"Find contact details and other information about courts and tribunals\"]",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "[TRANSLATE: \"in England and Wales, and some non-devolved tribunals in Scotland.\"]",
  listFor: "[TRANSLATE: \"List for\"]",
  lastUpdated: "[TRANSLATE: \"Last updated\"]",
  at: "[TRANSLATE: \"at\"]",
  dataSource: "[TRANSLATE: \"Data source\"]",
  backToTop: "[TRANSLATE: \"Back to top\"]",
  downloadPdf: "[TRANSLATE: \"Download PDF\"]",
  downloadExcel: "[TRANSLATE: \"Download Excel\"]"
};
```

> Note: the exact "Important information" copy and location address must be confirmed against the staging reference page (see §14 Open Questions). The address shown (Rolls Building, Fetter Lane, EC4A 1NL) is the real Business and Property Courts / Rolls Building address and should be verified. Also add a `cautionNote`/`cautionReporting` block and `provenanceLabels` to the locales if the PDF footer requires them (as the RCJ locales do).

## 8. URL

- **Public rendered page:** `GET /competition-list-chd-daily-cause-list?artefactId=<uuid>`
- **`urlPath` reference value:** `competition-list-chd-daily-cause-list` (stored on the `list_types.url` column and in `list-type-data.ts`)
- Route auto-discovered from `apps/web/src/pages/(list-types)/competition-list-chd-daily-cause-list/index.ts`. The `(list-types)` parenthesised route group adds no URL prefix.
- Publishing uses the existing generic Excel-upload endpoints (no new route).

## 9. Validation

Two validation layers, both mandatory (per CLAUDE.md list-type rules).

**A. Excel → JSON converter config** (`conversion/competition-list-chd-config.ts`) — validates on upload/conversion. Columns in the issue's order:

| Excel header | JSON field | Required | Validators |
|---|---|---|---|
| Judge | `judge` | yes | `validateNoHtmlTags` |
| Time | `time` | yes | `validateTimeFormat` |
| Venue | `venue` | yes | `validateNoHtmlTags` |
| Type | `type` | yes | `validateNoHtmlTags` |
| Case Number | `caseNumber` | yes | `validateNoHtmlTags` |
| Case Name | `caseName` | yes | `validateNoHtmlTags` |
| Additional Information | `additionalInformation` | no | `validateNoHtmlTags` |

`minRows: 1`. Build with `createConverter(COMPETITION_LIST_CHD_EXCEL_CONFIG)` and register with `registerConverterByName("COMPETITION_LIST_CHD_DAILY_CAUSE_LIST", converter)` (from `@hmcts/list-types-common`), imported for side effect from the module `index.ts`. The converter is invoked at **upload** time by `convertExcelForListTypeName` (guarded by `hasConverterForListTypeName`), not at publish time.

**B. JSON schema** (`schemas/competition-list-chd-daily-cause-list.json`) — draft-07, `type: array`, each item requires `judge, time, venue, type, caseNumber, caseName` (`additionalInformation` optional). Reuse the RCJ patterns:

- Text fields: `"pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"` (rejects embedded HTML tags).
- `time`: `"pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$"` (accepts `9am`, `10:30pm`, `2.30pm`).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Competition List (ChD) Daily Cause List",
  "description": "Schema for Competition List (ChD) Daily Cause Lists",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["judge", "time", "venue", "type", "caseNumber", "caseName"],
    "properties": {
      "judge":  { "title": "Judge",  "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "time":   { "title": "Time",   "type": "string", "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$" },
      "venue":  { "title": "Venue",  "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "type":   { "title": "Type",   "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseNumber": { "title": "Case Number", "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseName":   { "title": "Case Name",   "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "additionalInformation": { "title": "Additional Information", "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```

Validator wrapper (must be the real public API used by `validateListTypeJson`, exported from `index.ts`):

```typescript
// validation/json-validator.ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateCompetitionListChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```

> The CI guard test at `libs/list-types/common/src/validation/guard.test.ts` will fail if the schema ships without a `validate*` export — this wrapper satisfies it. `createJsonValidator` uses AJV with `allErrors: true` and returns `{ isValid, errors }` where each error is `"<field>: <message>"`.

## 10. Error Messages

**Excel conversion / upload errors** (produced by the converter, surfaced on the existing upload UI):

- Missing required column value — e.g. `Row 4: Judge is required`
- HTML tags present — e.g. `Row 4: Type must not contain HTML tags`
- Invalid time format — e.g. `Row 4: Time must be in a valid format, like 9am, 10:30am or 2:30pm`
- Empty file / no data rows — `The uploaded file does not contain any hearings`

**JSON schema validation errors** (from `createJsonValidator`) — `ValidationResult.errors[]` lists each failing field/row; upload is rejected and the errors returned to the publisher.

**Rendered-page guard error** — if an artefact whose `listTypeName` is not `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST` is requested at this route, respond `400` and render `errors/common` (consistent with other list-type handlers). Missing/invalid `artefactId` → standard not-found handling.

## 11. Navigation

- Users reach the page via CaTH search or the location's published-lists listing under **Business and Property Courts Rolls Building** (Civil / Royal Courts of Justice Group).
- The rendered page is standalone (no multi-step flow). It provides:
  - FaCT external link (courts & tribunals contact details).
  - PDF download link and Excel download link for the artefact.
  - "Back to top" anchor link.
  - Welsh/English language toggle in the service header (handled globally by the i18n middleware; page reads `res.locals.locale`).
- After a successful publish, the artefact appears in the location's list and notifications are sent via the existing subscription/notification pipeline.

## 12. Accessibility

Target: **WCAG 2.2 AA**.

- Page `<title>` matches the `<h1>` (`Competition List (ChD) Daily Cause List`).
- Single `<h1>`; logical heading order (`h1` → `h2` for "Search Cases").
- Data rendered in a semantic `govuk-table` with `<th scope="col">` header cells and an `aria-label` describing the table.
- Search input has an associated `<label>` (visually hidden but present); input reachable and operable by keyboard.
- `govukDetails` (Important information) is a native `<details>`/`<summary>` — keyboard operable, state announced.
- Download links are real `<a>` elements with descriptive text ("Download PDF", "Download Excel") — not colour-only or icon-only.
- Colour is never the sole information carrier; visible focus states on all interactive elements (GOV.UK defaults).
- Welsh rendering must keep the same structure and pass the same checks.
- Template/E2E tests include an Axe scan inline in the viewing journey.

## 13. Test Scenarios

(High-level descriptions only.)

* **JSON validator unit tests** — real schema, no mocks; a fully-hydrated valid fixture passes; one test per required field (`judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`) proving each is individually enforced; a test proving `additionalInformation` is optional; a test rejecting an embedded HTML tag; a test rejecting a malformed `time`.
* **Excel converter config tests** — valid workbook converts to the expected JSON array with correct field mapping and order; missing required column value fails with a row/field message; invalid time fails; optional Additional Information may be blank.
* **Renderer unit tests** — maps hearings to the view model, formats header/date fields, handles empty list.
* **Controller tests** — GET renders the template with `en`, `cy`, `t`; guard rejects an artefact with a different `listTypeName` (renders `errors/common`, status 400); artefact from `getArtefactById` supplies `listTypeName`.
* **Template tests** (`@hmcts/test-support`) — seven column headers render in the correct order; one `<tr>` per hearing; Welsh headings render under the `cy` locale; `en`/`cy` key parity check.
* **PDF generation test** — generates a PDF buffer for a sample list and saves it (mock storage), using the correct list title.
* **E2E (Playwright, `@nightly`)** — one complete viewing journey: open a published Competition List (ChD) artefact, assert the table and columns, toggle to Welsh and assert translated headings, run an inline Axe accessibility scan, and exercise the PDF/Excel download links — all within a single journey test. The list type must be added to `e2e-tests/utils/seed-list-types.ts` for the environment to seed it.
* **List-type guard CI test** — the existing `libs/list-types/common` guard test passes (schema has a matching `validate*` export).

## 14. Assumptions & Open Questions

* **Location record.** `libs/location/src/location-data.ts` currently has "Royal Courts of Justice" (`locationId: 4`, region 1 = London) but **no** "Business and Property Courts Rolls Building" location. **Open question:** should this list attach to the existing RCJ location, or does a new "Business and Property Courts Rolls Building" location need to be created in the **Royal Courts of Justice Group** region (`region_id = 11`) and linked to the Civil Court sub-jurisdiction (`1`)? The AC explicitly names the Rolls Building, so a new location record is likely required.
* **Sub-jurisdiction.** The 30 seeded sub-jurisdictions include Civil Court (1) but **no** Chancery / Business & Property / Competition sub-jurisdiction. Assumed the list attaches to Civil Court (1). Confirm whether a new sub-jurisdiction is needed.
* **Region wiring.** Assumed region Royal Courts of Justice Group (`region_id = 11`). To be confirmed against how region↔location↔list-type are joined for RCJ-group lists (the existing RCJ *location* sits in region 1 = London, not 11 — so the AC's region requirement needs deliberate wiring).
* **Provenance.** Assumed `MANUAL_UPLOAD` (non-strategic Excel upload, as with PHT). Confirm whether it should instead be `CFT_IDAM` like the RCJ family.
* **Static page copy.** The exact "Important information" text, location address lines, and any court-specific notices must be lifted from the staging reference page (`.../competition-list-chd-daily-cause-list?artefactId=504b46d6-...`). The copy in §7 is a best-effort placeholder based on RCJ conventions and needs verification.
* **Sensitivity.** Assumed `Public`. Confirm.
* **Welsh translations.** All Welsh strings are marked `[WELSH TRANSLATION REQUIRED: "..."]` for the post-processing script; the friendly name in reference data likewise needs a confirmed Welsh translation (some existing list types keep an English-only supplied name).
* **Excel template.** Assumes a single-sheet template with the seven columns in the issue's order and a header row. Confirm whether a downloadable blank Excel template needs to be provided to publishers.
* **Excel download.** For non-strategic lists the originally uploaded Excel file is stored and served rather than regenerated from JSON (only SJP lists use an `EXCEL_GENERATOR_REGISTRY` to regenerate). Confirm the AC's "Excel downloadable version" is satisfied by serving the uploaded file.
* **New module vs. extend RCJ family.** This spec proposes a dedicated module because field names (`type`, `caseName`) and column order differ from `RCJ_EXCEL_CONFIG`. If product prefers, the fields could be normalised to the RCJ shape (`hearingType`, `caseDetails`) and folded into the existing multi-list handler — but that would diverge from the JSON contract given in the issue.


### Comment by OgechiOkelu on 2026-07-23T13:27:54Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T13:32:44Z
## Technical plan ready — clarifying questions

A technical plan has been committed to `docs/tickets/804/` on branch `feature/804-competition-list-chd-daily-cause-list`. The list is structurally almost identical to the RCJ Standard Daily Cause List family (flat array of hearings), so it will be a dedicated module + dedicated Excel converter config (field names `type`/`caseName` and column order differ from the RCJ config).

Before/during implementation, please confirm the following:

1. **Location record.** There is no "Business and Property Courts Rolls Building" location today, and the existing "Royal Courts of Justice" location sits in **region 1 (London)**, not **region 11 (Royal Courts of Justice Group)** which the AC requires. Should we create a **new** location in region 11 (linked to sub-jurisdiction 1), or attach to the existing RCJ location?
2. **Sub-jurisdiction.** The seeded sub-jurisdictions include Civil Court (1) but no Chancery / Business & Property / Competition sub-jurisdiction. Attach to Civil Court (1), or create a new sub-jurisdiction?
3. **Provenance.** Should this be `MANUAL_UPLOAD` (like PHT) or `CFT_IDAM` (as the RCJ family uses despite being non-strategic)?
4. **Excel download.** Is the "Excel downloadable version" AC satisfied by serving the originally uploaded Excel file (standard non-strategic behaviour), or must an Excel be regenerated from JSON (as SJP lists do)?
5. **Static page copy.** Please confirm the exact "Important information" text and location address lines from the staging reference page — the current draft copy is a best-effort placeholder based on RCJ conventions.
6. **Welsh translations.** All Welsh strings (including the `welshFriendlyName`) are placeholders and need confirmed translations.
7. **Blank Excel template.** Does a downloadable blank Excel template need to be provided to publishers, or is that out of scope?
8. **Email summary.** Does this list need a subscription email-summary builder (RCJ has one)? Assumed not required.
