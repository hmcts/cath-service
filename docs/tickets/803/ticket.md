# #803: Companies Winding Up (ChD) daily cause list

**State:** OPEN
**Assignees:** KianKwa
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:04:52Z
**Updated:** 2026-07-31T13:00:52Z

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Companies Winding Up (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.


**AS A** Service
**I WANT** to create the validation schema and style guides for Companies Winding Up (ChD) daily cause list
**SO THAT** the Companies Winding Up (ChD) daily cause list can be published in CaTH


**ACCEPTANCE CRITERIA**
- The Companies Winding Up (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Companies Winding Up (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Companies Winding Up (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Companies Winding Up (ChD) daily cause list is created.
- A PDF of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/companies-winding-up-chd-daily-cause-list?artefactId=171f1390-8eff-4a01-86a1-6572ac3f3944
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

### Comment by OgechiOkelu on 2026-07-22T15:52:33Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T15:56:49Z
# Technical Specification: Companies Winding Up (ChD) Daily Cause List

> GitHub Issue #803 — Non-strategic publishing of The Companies Winding Up (ChD) daily cause list via Excel upload in CaTH.

## 1. User Story
**As a** CaTH publishing service (and the media/public who consume published lists)
**I want to** create the validation schema, Excel-to-JSON conversion, style guide and downloadable outputs for the Companies Winding Up (ChD) Daily Cause List
**So that** the Companies Winding Up (ChD) Daily Cause List can be uploaded as an Excel template, converted to JSON, rendered as an accessible web page, and downloaded as PDF/Excel under the Business and Property Courts Rolls Building.

## 2. Background
This is a **non-strategic** list type published through the manual Excel upload route in CaTH (uploaded Excel → validated → converted to JSON → rendered). It follows the established pattern used by the RCJ / Administrative Court daily cause lists.

Key reference implementations in the codebase:
- **Closest analogue:** `libs/list-types/rcj-standard-daily-cause-list/` — a single module serving several RCJ list variants through a shared 7-field converter and a multi-list guard/render handler.
- Shared Excel converter configs: `libs/list-types/common/src/conversion/rcj-field-configs.ts` (`RCJ_EXCEL_CONFIG`).
- List-type registry / metadata: `libs/list-types/common/src/list-type-data.ts`.
- PDF/Excel generator registration: `libs/publication/src/processing/service.ts` (`PDF_GENERATOR_REGISTRY`, `EXCEL_GENERATOR_REGISTRY`).
- Page controllers/templates: `apps/web/src/pages/(list-types)/`.

**Important divergence from the RCJ standard format.** The RCJ standard converter (`RCJ_EXCEL_CONFIG`) uses the fields and order: `Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information`. Issue #803 specifies a **different field set and order**: `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`. Because the field names (`type` vs `hearingType`, `caseName` vs `caseDetails`) and the column order differ, this list **cannot reuse `RCJ_EXCEL_CONFIG`** and requires its own module, schema, Excel config, model type, renderer, PDF template and page template.

Reference style guide (existing PIP frontend, to be matched): `https://pip-frontend.staging.platform.hmcts.net/companies-winding-up-chd-daily-cause-list?artefactId=171f1390-8eff-4a01-86a1-6572ac3f3944`

**Court / jurisdiction association (per acceptance criteria):**
- Court: **Business and Property Courts Rolls Building** (Royal Courts of Justice Group region)
- Jurisdiction: **Civil**
- Sub-jurisdiction: **Civil Court** (`subJurisdictionIds: [1]`, as used by the other RCJ civil lists)

## 3. Acceptance Criteria

* **Scenario:** List type registered and discoverable in CaTH
    * **Given** an admin browses list types under the Business and Property Courts Rolls Building
    * **When** they view lists linked to the Civil jurisdiction / Royal Courts of Justice Group region
    * **Then** the "Companies Winding Up (ChD) Daily Cause List" appears and is selectable for upload

* **Scenario:** Validation schema enforces the specified field set and order
    * **Given** a JSON payload derived from an uploaded Excel file
    * **When** it is validated against the Companies Winding Up (ChD) schema
    * **Then** the required fields `judge, time, venue, type, caseNumber, caseName` are enforced, `additionalInformation` is optional, and the field order in the schema matches: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information

* **Scenario:** Excel upload converted to JSON
    * **Given** an admin uploads a correctly formatted `.xlsx` template
    * **When** CaTH processes the upload
    * **Then** the rows are converted to the JSON format specified in the issue (array of objects with `judge, time, venue, type, caseNumber, caseName, additionalInformation`) and stored as an artefact

* **Scenario:** Invalid Excel rejected with a clear error
    * **Given** an admin uploads an Excel file missing a required column or with an HTML tag / invalid time in a cell
    * **When** CaTH validates the file
    * **Then** the upload is rejected and a specific error identifying the row and field is shown

* **Scenario:** Published list renders as an accessible web page
    * **Given** a published Companies Winding Up (ChD) artefact
    * **When** a user opens `/companies-winding-up-chd-daily-cause-list?artefactId=...`
    * **Then** the list renders with the header, court address, list date, last-updated line, a searchable table with the seven columns, and matches the reference style guide structure

* **Scenario:** Welsh rendering
    * **Given** a published artefact
    * **When** the user switches to Welsh (`?lng=cy`)
    * **Then** all static labels, headings and table headers render in Welsh

* **Scenario:** Downloadable PDF and Excel
    * **Given** a published artefact
    * **When** the user selects download
    * **Then** a PDF version of the list is generated and available, and the source Excel file is downloadable

## 4. User Journey Flow

```
ADMIN (publisher) journey
─────────────────────────
1. Sign in as verified/admin publisher
2. Manual upload → select "Business and Property Courts Rolls Building"
3. Select list type "Companies Winding Up (ChD) Daily Cause List"
4. Set content date, display dates, sensitivity (Public), language
5. Upload .xlsx template
        │
        ▼
   ┌─────────────────────────────┐
   │ CaTH processing pipeline     │
   │  a. Parse Excel (xlsx)       │
   │  b. Map columns → fields     │
   │  c. Row validators           │
   │  d. Convert to JSON array    │
   │  e. Validate JSON vs schema  │
   │  f. Store artefact           │
   │  g. Generate PDF             │
   └─────────────────────────────┘
        │  valid                         │  invalid
        ▼                                ▼
6a. Artefact published            6b. Upload rejected with
    (JSON + source Excel + PDF)       row/field-specific error

PUBLIC / MEDIA journey
──────────────────────
1. Navigate to published list (artefactId link / search)
2. Page renders header + court address + table (7 columns)
3. Search/filter cases within the table
4. Toggle Welsh (?lng=cy)
5. Download PDF or Excel
```

## 5. Low Fidelity Wireframe

```
┌───────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings                          [Cymraeg]  │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Companies Winding Up (ChD) Daily Cause List                (h1)        │
│                                                                         │
│  Find contact details and other information about courts and tribunals  │
│  in England and Wales... (FaCT link)                                    │
│                                                                         │
│  Business and Property Courts of England and Wales      (bold)          │
│  The Rolls Building                                                     │
│  7 Rolls Buildings, Fetter Lane                                         │
│  London, EC4A 1NL                                                       │
│                                                                         │
│  List for [22 July 2026]                                (bold)          │
│  Last updated [22 July 2026] at [9:00am]                                │
│                                                                         │
│  ▸ Important information                                (details)       │
│                                                                         │
│  Search Cases                                           (h2)            │
│  [ search by judge, case, venue... ____________________ ]               │
│                                                                         │
│  ┌────────┬──────┬───────┬──────┬────────────┬───────────┬───────────┐ │
│  │ Judge  │ Time │ Venue │ Type │ Case Number│ Case Name │ Additional│ │
│  ├────────┼──────┼───────┼──────┼────────────┼───────────┼───────────┤ │
│  │ Judge A│ 9am  │Venue A│Type A│ 12345      │ Case name │ This is...│ │
│  │ Judge B│10:30…│Venue B│Type B│ 12346      │ Case name │ Another...│ │
│  └────────┴──────┴───────┴──────┴────────────┴───────────┴───────────┘ │
│                                                                         │
│  Data source: [provenance]                                             │
│  [Download PDF]   [Download Excel]                                      │
│                                                                         │
│  ↑ Back to top                                                         │
└───────────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

**New module:** `libs/list-types/companies-winding-up-chd-daily-cause-list/`

```
libs/list-types/companies-winding-up-chd-daily-cause-list/
├── package.json                       # @hmcts/companies-winding-up-chd-daily-cause-list
├── tsconfig.json
├── README.md
└── src/
    ├── config.ts                      # moduleRoot, schemaPath
    ├── index.ts                       # exports (imports conversion for side-effect registration)
    ├── models/types.ts                # CompaniesWindingUpHearing / ...HearingList
    ├── schemas/
    │   └── companies-winding-up-chd-daily-cause-list.json
    ├── validation/
    │   ├── json-validator.ts          # validateCompaniesWindingUpChdDailyCauseList
    │   └── json-validator.test.ts
    ├── conversion/
    │   ├── companies-winding-up-chd-daily-cause-list-config.ts   # Excel config + registerConverterByName
    │   └── companies-winding-up-chd-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts           # generateCompaniesWindingUpChdDailyCauseListPdf
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    └── locales/
        ├── en.ts
        └── cy.ts
```

**New page (web app):** `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/`
```
├── index.ts                           # GET controller (createSimpleListTypeHandler)
├── companies-winding-up-chd-daily-cause-list.njk
├── index.test.ts
└── companies-winding-up-chd-daily-cause-list.njk.test.ts
```

**Data model type** (`src/models/types.ts`):
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

**Registration touch-points (existing files to edit):**
1. `libs/list-types/common/src/list-type-data.ts` — add the `ListTypeData` entry (see §8/§9).
2. `libs/publication/src/processing/service.ts` — add to `PDF_GENERATOR_REGISTRY` keyed by `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`.
3. `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — link the new list type to sub-jurisdiction `Civil Court` (id 1).
4. Excel converter self-registers via `registerConverterByName` on module import (through `index.ts` side-effect import).

Because there is only **one** list variant, use `createSimpleListTypeHandler` with a single-key guard (the RCJ module's `createMultiListGuardAndRender` is only needed for multiple variants; follow the simpler single-list pattern).

## 7. Content

**List type friendly names** (`list-type-data.ts`):
- English: `Companies Winding Up (ChD) Daily Cause List`
- Welsh: `[WELSH TRANSLATION REQUIRED: "Companies Winding Up (ChD) Daily Cause List"]`

**Page content** — `libs/list-types/companies-winding-up-chd-daily-cause-list/src/locales/en.ts`:
```typescript
export const en = {
  pageTitle: "Companies Winding Up (ChD) Daily Cause List",
  locationLine1: "Business and Property Courts of England and Wales",
  locationLine2: "The Rolls Building",
  locationLine3: "7 Rolls Buildings, Fetter Lane",
  locationLine4: "London, EC4A 1NL",
  importantInfoText:
    "Open justice is a fundamental principle of our justice system. Requests from the media and others, including legal bloggers, should be made to the court. When considering the use of telephone and video technology the judiciary will have regard to the principles of open justice. The court may exclude observers where necessary to secure the proper administration of justice.",
  common: {
    factLinkText: "Find contact details and other information about courts and tribunals",
    factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
    factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
    importantInfoTitle: "Important information",
    searchCasesTitle: "Search Cases",
    searchCasesLabel: "Search by judge, case number, case name, venue, type, or other information",
    tableHeaders: {
      judge: "Judge",
      time: "Time",
      venue: "Venue",
      type: "Type",
      caseNumber: "Case number",
      caseName: "Case name",
      additionalInformation: "Additional information"
    },
    dataSource: "Data source",
    backToTop: "Back to top",
    listFor: "List for",
    lastUpdated: "Last updated",
    at: "at"
  }
};
```

Welsh (`cy.ts`) — identical structure, all values wrapped as translation markers:
```typescript
export const cy = {
  pageTitle: `[WELSH TRANSLATION REQUIRED: "Companies Winding Up (ChD) Daily Cause List"]`,
  locationLine1: `[WELSH TRANSLATION REQUIRED: "Business and Property Courts of England and Wales"]`,
  locationLine2: `[WELSH TRANSLATION REQUIRED: "The Rolls Building"]`,
  locationLine3: `[WELSH TRANSLATION REQUIRED: "7 Rolls Buildings, Fetter Lane"]`,
  locationLine4: `[WELSH TRANSLATION REQUIRED: "London, EC4A 1NL"]`,
  importantInfoText: `[WELSH TRANSLATION REQUIRED: "Open justice is a fundamental principle of our justice system. Requests from the media and others, including legal bloggers, should be made to the court. When considering the use of telephone and video technology the judiciary will have regard to the principles of open justice. The court may exclude observers where necessary to secure the proper administration of justice."]`,
  common: {
    factLinkText: `[WELSH TRANSLATION REQUIRED: "Find contact details and other information about courts and tribunals"]`,
    factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
    factAdditionalText: `[WELSH TRANSLATION REQUIRED: "in England and Wales, and some non-devolved tribunals in Scotland."]`,
    importantInfoTitle: `[WELSH TRANSLATION REQUIRED: "Important information"]`,
    searchCasesTitle: `chwilio achosion`,
    searchCasesLabel: `[WELSH TRANSLATION REQUIRED: "Search by judge, case number, case name, venue, type, or other information"]`,
    tableHeaders: {
      judge: `[WELSH TRANSLATION REQUIRED: "Judge"]`,
      time: `Amser`,
      venue: `Lleoliad`,
      type: `[WELSH TRANSLATION REQUIRED: "Type"]`,
      caseNumber: `[WELSH TRANSLATION REQUIRED: "Case number"]`,
      caseName: `Enw'r Achos`,
      additionalInformation: `Gwybodaeth ychwanegol`
    },
    dataSource: `[WELSH TRANSLATION REQUIRED: "Data source"]`,
    backToTop: `Yn 'l i frig y dudalen`,
    listFor: `Rhestr ar gyfer`,
    lastUpdated: `[WELSH TRANSLATION REQUIRED: "Last updated"]`,
    at: `am`
  }
};
```
> Court address lines above are indicative and must be confirmed against the reference style guide before build.

## 8. URL

- **Public page route:** `/companies-winding-up-chd-daily-cause-list` (auto-discovered from `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/index.ts`), consumed with `?artefactId=<uuid>`.
- **`urlPath` in `list-type-data.ts`:** `companies-winding-up-chd-daily-cause-list`
- **List type name (stable `@unique`):** `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`

`ListTypeData` entry to add:
```typescript
{
  name: "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST",
  englishFriendlyName: "Companies Winding Up (ChD) Daily Cause List",
  welshFriendlyName: "[TRANSLATE: \"Companies Winding Up (ChD) Daily Cause List\"]",
  provenance: "CFT_IDAM",
  urlPath: "companies-winding-up-chd-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "Companies Winding Up (ChD) Daily Cause List",
  subJurisdictionIds: [1]   // Civil Court
}
```

## 9. Validation

**JSON schema** (`src/schemas/companies-winding-up-chd-daily-cause-list.json`) — draft-07, root `type: "array"`, items with required `judge, time, venue, type, caseNumber, caseName` and optional `additionalInformation`. Fields declared in the issue's order. Every string field uses the no-HTML pattern used elsewhere; `time` uses the time-format pattern.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Companies Winding Up (ChD) Daily Cause List",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["judge", "time", "venue", "type", "caseNumber", "caseName"],
    "properties": {
      "judge":  { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "time":   { "type": "string", "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$" },
      "venue":  { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "type":   { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseNumber": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "caseName":   { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
      "additionalInformation": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
    }
  }
}
```

**Validator wrapper** (mandatory per CLAUDE.md list-type rule 6):
```typescript
// src/validation/json-validator.ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateCompaniesWindingUpChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```
Export it from `src/index.ts`. The CI guard test in `libs/list-types/common/src/validation/guard.test.ts` will fail if the schema ships without this export.

**Excel converter config** (`src/conversion/...-config.ts`) — columns in the issue's order, `additionalInformation` optional, HTML-tag validators on text fields and time-format validator on `time`:
```typescript
import { createConverter, registerConverterByName, validateNoHtmlTags } from "@hmcts/list-types-common";
import { validateTimeFormat } from "@hmcts/list-types-common"; // strict hour 1-12

export const COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG = {
  fields: [
    { header: "Judge",  fieldName: "judge",  required: true, validators: [(v, r) => validateNoHtmlTags(v, "Judge", r)] },
    { header: "Time",   fieldName: "time",   required: true, validators: [validateTimeFormat] },
    { header: "Venue",  fieldName: "venue",  required: true, validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Type",   fieldName: "type",   required: true, validators: [(v, r) => validateNoHtmlTags(v, "Type", r)] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Number", r)] },
    { header: "Case Name",   fieldName: "caseName",   required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    { header: "Additional Information", fieldName: "additionalInformation", required: false, validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)] }
  ],
  minRows: 1
};

registerConverterByName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST", createConverter(COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG));
```

**Rules recap:**
- Filter/route by `listTypeName` only — never numeric `listTypeId`.
- All display strings come from locale files, never hardcoded in the controller.
- PDF generator and converter registered **by name**.

## 10. Error Messages

Upload/conversion errors (produced by the Excel converter and JSON validator; surfaced on the admin upload flow):

| Condition | Message |
|-----------|---------|
| Required column missing from sheet | "The uploaded file is missing the required column '[Header]'." |
| Required cell empty | "Enter a value for '[Field]' in row [n]." |
| HTML tags in a text cell | "'[Field]' in row [n] must not contain HTML tags." |
| Invalid time format | "Enter a valid time for row [n], like 9am, 10:30am or 2:30pm." |
| Empty sheet / no data rows | "The uploaded file does not contain any hearings." |
| JSON fails schema validation | "The uploaded file could not be processed. Check it matches the Companies Winding Up (ChD) template and try again." |

Rendering error (public page, wrong artefact type routed here): render `errors/common` with a 400 when `artefact.listTypeName !== "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST"`.

All admin-facing error copy must have Welsh equivalents: `[WELSH TRANSLATION REQUIRED: "..."]`.

## 11. Navigation

- Reached via the published-artefact link `/companies-winding-up-chd-daily-cause-list?artefactId=<uuid>` (from search results / subscriptions / direct link).
- Language toggle preserves `artefactId` and switches locale via `?lng=cy` / `?lng=en`.
- "Back to top" anchor within the page (`#top`).
- FaCT external link opens the Find a Court or Tribunal service.
- Download links: PDF (generated during processing) and Excel (source upload) served from the standard publication download endpoints.
- Guard: if the artefact's `listTypeName` does not match, respond 400 and render the common error page (do not render the list template).

## 12. Accessibility

- **WCAG 2.2 AA**, progressive enhancement — table and content fully usable without JavaScript; the case search is a JS enhancement over a fully-rendered table.
- Single `<h1>` matching the page title; `<h2>` for "Search Cases" and "Important information" content — logical heading order.
- Data table uses `<table class="govuk-table">` with `<th scope="col">` header cells and an `aria-label` naming the list.
- Search input has an associated `<label>` (visually hidden) plus `aria-label`.
- `govukDetails` for "Important information" (native disclosure, keyboard operable).
- Colour never the sole information carrier; standard GOV.UK focus states retained.
- All interactive elements keyboard reachable in reading order; no keyboard traps.
- Welsh page sets `lang="cy"` appropriately via the i18n layer.
- Axe checks run inline within the E2E journey.

## 13. Test Scenarios

* **JSON validator unit tests** (`json-validator.test.ts`): one `it` per required field (`judge, time, venue, type, caseNumber, caseName`) proving each is individually enforced; a valid fully-hydrated fixture returns `isValid: true`; optional `additionalInformation` may be omitted; invalid `time` format is rejected; HTML in a text field is rejected. Real schema, no mocks; deep-clone fixture with `JSON.parse(JSON.stringify(...))`.
* **Excel conversion unit tests** (`...-config.test.ts`): a valid sheet converts to the exact JSON shape/field order from the issue; missing required column errors; empty required cell errors with row number; invalid time errors; optional Additional Information handled; converter is registered under the correct name.
* **Renderer unit tests**: header (title, list date, last-updated), hearings normalised, data passed through in field order.
* **PDF generator unit tests**: generates HTML from template and returns a saved PDF result; correct list title mapping; handles empty list.
* **Controller unit tests** (`index.test.ts`): renders template with `en`/`cy`/`t` for a matching artefact; returns 400 / common error for a non-matching `listTypeName`; ID-independent (fixture uses `listTypeId: 999`, `listTypeName` drives behaviour).
* **Template tests** (`*.njk.test.ts`): seven column headers present in correct order; a hearing row renders all seven cells; Welsh headings render with the `cy` locale; `en`/`cy` key parity (`Object.keys` equal); important-information details block present.
* **E2E journey** (`@nightly`, one journey test): publish/seed a Companies Winding Up (ChD) artefact → open the page → assert heading and table → run case search → toggle Welsh and assert translated headings → inline Axe accessibility scan → verify PDF and Excel download links.

## 14. Assumptions & Open Questions

* **Own module required, not a new RCJ variant** — because the field set/order (`judge, time, venue, type, caseNumber, caseName, additionalInformation`) differs from `RCJ_EXCEL_CONFIG`, a dedicated module/schema/converter is built rather than adding a key to the RCJ standard module. *Confirm this is acceptable vs. extending the shared config.*
* **Court address content** — the exact address/wording for the Business and Property Courts Rolls Building and the "Important information" text must be taken from the reference style guide (`.../companies-winding-up-chd-daily-cause-list?artefactId=171f1390-...`). The values in §7 are placeholders pending confirmation.
* **Provenance / sensitivity** — assumed `CFT_IDAM`, `Public`, `isNonStrategic: true`, matching sibling RCJ non-strategic lists. Confirm the correct provenance for manual Excel upload (some manual lists use `MANUAL_UPLOAD`).
* **Sub-jurisdiction** — assumed `Civil Court` (id 1) per the "Civil jurisdiction" acceptance criterion and consistent with other RCJ civil lists. Confirm no dedicated "Business and Property Courts" sub-jurisdiction is expected.
* **"Excel downloadable version"** — assumed to be the **source uploaded Excel** served from the existing publication download route (the `EXCEL_GENERATOR_REGISTRY` in `service.ts` is currently only used to *generate* Excel for API-sourced SJP lists, which have no source file). Confirm whether a regenerated/standardised Excel is required instead of the original upload.
* **Time format** — assumed the strict `validateTimeFormat` (hour 1–12) matching `RCJ_EXCEL_CONFIG`. The issue example includes `"10:30pm"`, which is valid under this pattern; confirm 24-hour times are not expected.
* **Location seeding** — assumes the "Business and Property Courts Rolls Building" location already exists in the location reference data and is mapped to the Royal Courts of Justice Group region; if not, a location seed/reference-data update is also required.


### Comment by OgechiOkelu on 2026-07-23T09:39:51Z
@plan 

### Comment by SarahLittlejohn on 2026-07-23T12:02:04Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T12:06:25Z
## 📋 Technical plan committed

Plan for #803 pushed to branch \`feature/803-companies-winding-up-chd-daily-cause-list\` under \`docs/tickets/803/\` (\`plan.md\`, \`tasks.md\`, \`ticket.md\`).

**Approach:** a dedicated non-strategic list-type module modelled on the single-variant \`court-of-appeal-civil-daily-cause-list\`. The mandated field set/order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) differs from the shared RCJ config (\`caseDetails\`/\`hearingType\`, different order), so this needs its own schema, Excel converter, renderer, PDF template and page — it cannot reuse \`RCJ_EXCEL_CONFIG\`. Everything routed/registered by \`listTypeName\` = \`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST\`.

### ❓ Clarifications needed before implementation

1. **Court address & "Important information" copy** — please confirm the authoritative wording (and Welsh translations) for the Business and Property Courts Rolls Building header and the important-information block, as shown on the reference style guide. The plan currently uses placeholders.
2. **Provenance / sensitivity** — assumed \`CFT_IDAM\`, \`Public\`, \`isNonStrategic: true\` (matching sibling non-strategic RCJ lists). Is that correct for the manual Excel-upload route, or should provenance differ?
3. **"Excel downloadable version"** — assumed to be the **original uploaded Excel** served from the existing publication download route (no generated Excel). Confirm a regenerated/standardised Excel is *not* required.
4. **Sub-jurisdiction** — assumed \`Civil Court\` (id 1) per the "Civil jurisdiction" criterion. Confirm no dedicated "Business and Property Courts" sub-jurisdiction is expected.
5. **Time format** — assumed \`validateTimeFormatSimple\` (accepts \`9am\`, \`10:30pm\` from the issue example). Confirm 24-hour times are not required.
6. **Location reference data** — assumes the "Business and Property Courts Rolls Building" location already exists and is mapped to the Royal Courts of Justice Group region. If not, a location seed update is also needed — please confirm.
7. **Route / urlPath** — plan uses \`companies-winding-up-chd-daily-cause-list\` for both the public route and \`urlPath\` (matching the reference URL). Confirm this is the intended path.

Once confirmed, run \`/qk-implement 803\` to build against this plan.

### Comment by OgechiOkelu on 2026-07-23T12:57:51Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T13:00:28Z
## 📋 Plan verified & current — branch `feature/803-companies-winding-up-chd-daily-cause-list`

Re-ran planning for #803. The plan under `docs/tickets/803/` (`plan.md`, `tasks.md`, `ticket.md`) is up to date and its technical assumptions have now been **verified against the codebase**:

- `validateTimeFormatSimple`, `validateNoHtmlTags`, `registerConverterByName`, `createConverter` all exist in `@hmcts/list-types-common`.
- Sub-jurisdiction **id 1 = Civil Court** confirmed in `003_upsert_sub_jurisdictions_and_list_type_links.sql` and matches every sibling civil list (`CIVIL_DAILY_CAUSE_LIST`, etc.).
- Registration touch-points confirmed: `list-type-data.ts`, `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`, SQL seed scripts 001/003, root `tsconfig.json` paths.

**Approach:** dedicated non-strategic module modelled on the single-variant `court-of-appeal-civil-daily-cause-list`. The mandated field set/order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) differs from the shared `RCJ_EXCEL_CONFIG` (which uses `caseDetails`/`hearingType` in a different order), so it needs its own schema, Excel converter, renderer, PDF template and page. Everything routed by `listTypeName` = `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`.

### ❓ Still-open clarifications (blocking, previously unanswered)

1. **Court address & 'Important information' copy** — please confirm the authoritative English **and Welsh** wording for the Business and Property Courts Rolls Building header and the important-information block (the reference style guide shows the structure; the plan uses placeholders + `[WELSH TRANSLATION REQUIRED]` markers).
2. **Location reference data** — does the 'Business and Property Courts Rolls Building' location already exist and map to the Royal Courts of Justice Group region? If not, a location seed update is also needed.
3. **Excel download** — confirm the downloadable Excel is the **original uploaded file** (served via the existing publication download route), not a regenerated/standardised workbook.
4. **Time format** — confirm `validateTimeFormatSimple` is acceptable (accepts `9am`, `10:30pm` per the issue examples; 24-hour times not required).

Assumptions taken where unblocking (confirm if wrong): provenance `CFT_IDAM`, sensitivity `Public`, `isNonStrategic: true`, sub-jurisdiction `Civil Court` (1), route/`urlPath` = `companies-winding-up-chd-daily-cause-list`.

Once the above are confirmed, run `/qk-implement 803`.

