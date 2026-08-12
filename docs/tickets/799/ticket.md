# #799: Admiralty Court (KB) daily cause list

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T17:55:51Z
**Updated:** 2026-08-12T16:53:50Z

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Admiralty Court (KB) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.


**AS A** Service

**I WANT** to create the validation schema and style guides for Admiralty Court (KB) daily cause list

**SO THAT** the Admiralty Court (KB) daily cause list can be published in CaTH


**ACCEPTANCE CRITERIA**
- The Admiralty Court (KB) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and  is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Admiralty Court (KB) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Interim Applications List (ChD) Daily Cause List is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering 
- The validation schema and style guide for the Admiralty Court (KB) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/admiralty-court-kb-daily-cause-list?artefactId=40a9ac2f-7d46-4168-93ac-a19475b91775
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

### Comment by OgechiOkelu on 2026-07-22T14:18:53Z

@spec

### Comment by hmctsclaudecode on 2026-07-22T14:22:12Z

# Technical Specification: Admiralty Court (KB) Daily Cause List

_Issue #799 — Non-strategic publishing of the Admiralty Court (KB) daily cause list via Excel upload in CaTH._

## 1. User Story
**As a** court and tribunal hearings (CaTH) service
**I want to** create the validation schema, Excel-to-JSON conversion, style guide, and downloadable renderings for the Admiralty Court (KB) daily cause list
**So that** the Admiralty Court (KB) daily cause list can be published in CaTH through the non-strategic Excel upload route and viewed by the public in both English and Welsh.

## 2. Background
This is a **non-strategic publication** list type. Data is supplied as an Excel template uploaded through the existing CaTH admin upload journey, converted to a JSON payload, validated against a JSON schema, then rendered as an HTML page plus downloadable PDF and Excel versions.

The Admiralty Court (KB) daily cause list belongs to the **Business and Property Courts, Rolls Building** grouping. It is linked to the **Civil** jurisdiction and published under the **Royal Courts of Justice Group** region.

This list uses the flat single-table "standard daily cause list" format already established by the RCJ standard family of lists (`libs/list-types/rcj-standard-daily-cause-list`) and the Court of Appeal (Civil) list. The implementation should follow those existing patterns rather than inventing a new structure.

Reference style guide (target rendered output):
`https://pip-frontend.staging.platform.hmcts.net/admiralty-court-kb-daily-cause-list?artefactId=40a9ac2f-7d46-4168-93ac-a19475b91775`

Existing patterns to follow:
- `libs/list-types/court-of-appeal-civil-daily-cause-list/` — a single-list-type package (closest analogue)
- `libs/list-types/rcj-standard-daily-cause-list/` — shared standard 7-field format and converter config
- `libs/list-types/common/src/list-type-data.ts` — list type registration metadata
- `libs/publication/src/processing/service.ts` — `PDF_GENERATOR_REGISTRY`
- `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — sub-jurisdiction links

## 3. Acceptance Criteria

* **Scenario:** List type is registered under the correct jurisdiction and region
    * **Given** an administrator browsing list types in CaTH
    * **When** they view the Business and Property Courts (Rolls Building) grouping
    * **Then** the "Admiralty Court (KB) Daily Cause List" is present, linked to the **Civil** jurisdiction and published under the **Royal Courts of Justice Group** region

* **Scenario:** Validation schema enforces the required data fields in the listed order
    * **Given** an uploaded, converted JSON payload
    * **When** it is validated against the Admiralty Court (KB) schema
    * **Then** the schema requires the fields in this order — Judge, Time, Venue, Type, Case Number, Case Name, Additional Information — with `additionalInformation` optional and all other fields required

* **Scenario:** Publication through the Excel upload route
    * **Given** an administrator uploads a completed Admiralty Court (KB) Excel template
    * **When** the file is processed
    * **Then** it is converted to the JSON format below, validated, and published so it can be rendered

* **Scenario:** Public rendering of the hearing list
    * **Given** a published Admiralty Court (KB) artefact
    * **When** a member of the public opens the list page
    * **Then** the hearings are shown in a searchable table matching the reference style guide, in English or Welsh depending on the selected language

* **Scenario:** Downloadable PDF and Excel versions
    * **Given** a published Admiralty Court (KB) artefact
    * **When** the user selects the download options
    * **Then** a PDF and an Excel version of the hearing list are available

* **Scenario:** Invalid upload is rejected
    * **Given** an Excel/JSON payload missing a required field (e.g. `caseNumber`)
    * **When** it is validated
    * **Then** validation fails and the file is not published

## 4. User Journey Flow

```
[Admin] Upload Admiralty Court (KB) Excel template
        │
        ▼
Excel → JSON conversion (registered converter, 7-field standard config)
        │
        ▼
JSON validated against admiralty-court-kb-daily-cause-list.json schema
        │
     ┌──┴───────────────┐
   valid            invalid
     │                  │
     ▼                  ▼
Artefact published   Upload rejected, error shown to admin
     │
     ▼
[Public] Opens /admiralty-court-kb-daily-cause-list?artefactId=...
     │
     ├─► Renders searchable HTML table (EN / CY)
     ├─► Download PDF
     └─► Download Excel
```

## 5. Low Fidelity Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                    [Cymraeg]   │
├──────────────────────────────────────────────────────────────────┤
│  Admiralty Court (KB) Daily Cause List                             │
│                                                                    │
│  Find contact details and other information about courts and       │
│  tribunals in England and Wales...                                 │
│                                                                    │
│  Royal Courts of Justice                                           │
│  Rolls Building, Fetter Lane                                       │
│  London, EC4A 1NL                                                  │
│                                                                    │
│  List for 22 July 2026                                             │
│  Last updated 22 July 2026 at 9:30am                               │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Search Cases                                               │    │
│  │ [ Search by judge, time, venue, case number...        🔍 ] │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  [ Download a copy ▾ ]   PDF | Excel                               │
│                                                                    │
│  ┌───────┬──────┬───────┬──────┬────────────┬───────────┬───────┐ │
│  │ Judge │ Time │ Venue │ Type │ Case number│ Case name │ Add.  │ │
│  │       │      │       │      │            │           │ info  │ │
│  ├───────┼──────┼───────┼──────┼────────────┼───────────┼───────┤ │
│  │Judge A│ 9am  │Venue A│Type A│ 12345      │Case name A│ ...   │ │
│  │Judge B│10:30 │Venue B│Type B│ 12346      │Case name B│ ...   │ │
│  │       │ pm   │       │      │            │           │       │ │
│  └───────┴──────┴───────┴──────┴────────────┴───────────┴───────┘ │
│                                                                    │
│  Data source: ...                                                  │
│  [Special Category Data caution notice]                            │
│                                    Back to top ▲                   │
└──────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

**New lib package:** `libs/list-types/admiralty-court-kb-daily-cause-list/`, mirroring `court-of-appeal-civil-daily-cause-list` structure:

```
libs/list-types/admiralty-court-kb-daily-cause-list/
├── package.json                 # @hmcts/admiralty-court-kb-daily-cause-list
├── tsconfig.json
└── src/
    ├── config.ts                # moduleRoot, assets, schemaPath
    ├── index.ts                 # exports (locales, validator, pdf, renderer, types)
    ├── conversion/
    │   └── admiralty-court-kb-daily-cause-list-config.ts   # registerConverterByName
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    ├── models/
    │   └── types.ts             # AdmiraltyCourtKbHearing / ...HearingList
    ├── pdf/
    │   ├── pdf-generator.ts
    │   └── pdf-template.njk
    ├── rendering/
    │   └── renderer.ts
    ├── schemas/
    │   └── admiralty-court-kb-daily-cause-list.json
    └── validation/
        ├── json-validator.ts
        └── json-validator.test.ts
```

**Page controller:** `apps/web/src/pages/(list-types)/admiralty-court-kb-daily-cause-list/` with `index.ts`, `index.njk`, `index.test.ts`, and a template test `admiralty-court-kb-daily-cause-list.njk.test.ts`. Use `createSimpleListTypeHandler` with a single-list-type guard/render (this list has one variant, unlike the RCJ multi-variant handler).

**Data model** (`models/types.ts`):
```typescript
export interface AdmiraltyCourtKbHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export type AdmiraltyCourtKbHearingList = AdmiraltyCourtKbHearing[];
```

Note the field names differ from the RCJ standard format (`type` not `hearingType`, `caseName` not `caseDetails`), so the renderer/converter field mapping must be defined for these keys explicitly.

**Registrations required:**
1. `libs/list-types/common/src/list-type-data.ts` — add `ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST` entry: `subJurisdictionIds: [1]` (Civil Court), `urlPath: "admiralty-court-kb-daily-cause-list"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`.
2. `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — add the `('ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST', 1)` link.
3. `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` — insert the list type row if seeded there.
4. `libs/publication/src/processing/service.ts` — add to `PDF_GENERATOR_REGISTRY` keyed by `ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST`.
5. Register Excel converter by name via `registerConverterByName("ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST", converter)`.
6. Register the module's `moduleRoot` and `assets` in `apps/web` (Nunjucks paths + vite) and root `tsconfig.json` paths.

## 7. Content

**JSON payload format** (post-conversion, from the issue):
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

**Page title (English):** "Admiralty Court (KB) Daily Cause List"
**Page title (Welsh):** [WELSH TRANSLATION REQUIRED: "Admiralty Court (KB) Daily Cause List"]

**Location block (English):**
- Royal Courts of Justice
- Rolls Building, Fetter Lane
- London, EC4A 1NL

**Location block (Welsh):**
- Llysoedd Barn Brenhinol
- [WELSH TRANSLATION REQUIRED: "Rolls Building, Fetter Lane"]
- [WELSH TRANSLATION REQUIRED: "London, EC4A 1NL"]

**Table column headers (English → Welsh):**
| English | Welsh |
|---------|-------|
| Judge | [WELSH TRANSLATION REQUIRED: "Judge"] |
| Time | Amser |
| Venue | Lleoliad |
| Type | [WELSH TRANSLATION REQUIRED: "Type"] |
| Case number | [WELSH TRANSLATION REQUIRED: "Case number"] |
| Case name | Enw'r Achos |
| Additional information | Gwybodaeth ychwanegol |

**Shared/common content** (search box, "List for", "Last updated", data source label, and the Special Category Data caution notices) is reused from `@hmcts/list-types-common` and existing locale files. Welsh friendly name for `list-type-data.ts`: [WELSH TRANSLATION REQUIRED: "Admiralty Court (KB) Daily Cause List"].

**Search box label (English):** "Search by judge, time, venue, case number, case name, or other information"
**Search box label (Welsh):** [WELSH TRANSLATION REQUIRED: "Search by judge, time, venue, case number, case name, or other information"]

## 8. URL

- **Public page:** `/admiralty-court-kb-daily-cause-list?artefactId=<uuid>`
- **List type name (stable, `@unique`):** `ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST`
- **urlPath in `list-type-data.ts`:** `admiralty-court-kb-daily-cause-list`

All routing and guards MUST key off `listTypeName` (the stable string), never the autoincrement `listTypeId`, per CLAUDE.md list-type rules.

## 9. Validation

JSON Schema at `src/schemas/admiralty-court-kb-daily-cause-list.json`, root `type: "array"`, each item `type: "object"`.

**Required fields (in listed order):** `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`.
**Optional:** `additionalInformation`.

Field rules (following the RCJ standard schema conventions):
| Field | Type | Rule |
|-------|------|------|
| `judge` | string | No embedded HTML tags (anti-injection pattern) |
| `time` | string | Matches time pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$` (e.g. `9am`, `10:30pm`) |
| `venue` | string | No embedded HTML tags |
| `type` | string | No embedded HTML tags |
| `caseNumber` | string | No embedded HTML tags |
| `caseName` | string | No embedded HTML tags |
| `additionalInformation` | string | Optional; no embedded HTML tags |

Anti-injection pattern (as used elsewhere): `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`.

A `validateAdmiraltyCourtKbDailyCauseList` wrapper (using `createJsonValidator(schemaPath)`) MUST be exported from the package `index.ts`, with a co-located `json-validator.test.ts` containing one `it` per required field (deep-cloned fixture via `JSON.parse(JSON.stringify(...))`). This is mandatory — the CI guard test in `libs/list-types/common/src/validation/guard.test.ts` fails otherwise.

## 10. Error Messages

Upload/validation errors surface on the existing admin upload journey (not this public page). Messages follow the shared publication validation output; no new bespoke public-facing error copy is required for this page. Where the artefact does not match the expected list type, the shared `errors/common` render is used (guard returns 400), consistent with existing list-type handlers.

If a validation failure message is shown to the admin, it should name the offending field, e.g.:
- **English:** "The uploaded file is missing required field: Case number"
- **Welsh:** [WELSH TRANSLATION REQUIRED: "The uploaded file is missing required field: Case number"]

## 11. Navigation

- Reached from the CaTH list-type navigation under Business and Property Courts (Rolls Building) → Royal Courts of Justice Group region.
- Public page is opened via `artefactId` query parameter (same as all other list types).
- Download links (PDF, Excel) are rendered inline on the page via the shared download component.
- "Back to top" link at the foot of the table.

## 12. Accessibility

- WCAG 2.2 AA compliance mandatory.
- Page title matches the `<h1>` ("Admiralty Court (KB) Daily Cause List").
- Logical heading hierarchy (h1 → h2 for sections).
- Hearing data rendered as a semantic `<table>` with `<th scope="col">` headers.
- Search input has an associated visible `<label>`.
- Language toggle sets `lang` attribute correctly; Welsh content fully translated.
- Colour not used as sole information carrier.
- All interactive elements (search, download, language toggle) keyboard accessible with visible focus states.
- Download links have descriptive accessible text indicating format (PDF / Excel).

## 13. Test Scenarios

* Schema validation: valid fully-populated payload passes; one test per required field asserting failure when that field is removed (judge, time, venue, type, caseNumber, caseName); optional `additionalInformation` absence still passes.
* Excel-to-JSON converter produces the expected 7-field objects with correct key names (`type`, `caseName`) from a sample template.
* Renderer normalises times and returns the correct localised list title and header for both `en` and `cy`.
* Template test (Cheerio): renders all seven column headers, one row per hearing, correct cell mapping; asserts Welsh headings when the `cy` locale is used; conditional "no hearings" message when the list is empty.
* Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`.
* Controller test: GET renders with `en`, `cy`, `t`; guard returns 400 when artefact `listTypeName` is not `ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST` (fixture uses arbitrary `listTypeId: 999` to prove ID-independence).
* PDF generator produces a PDF for a valid payload and returns an error result on failure.
* E2E (single journey, `@nightly`): open a published Admiralty Court (KB) list, verify the table renders, search filters rows, switch to Welsh and verify translated headings, run an inline Axe accessibility scan, and confirm PDF and Excel downloads are available.

## 14. Assumptions & Open Questions

* **Field naming:** The issue's JSON uses `type` and `caseName`, which differ from the RCJ standard format's `hearingType`/`caseDetails`. This spec assumes the issue's exact key names are authoritative and the shared standard converter/renderer config must be adapted (not reused verbatim). **Confirm** whether reusing the RCJ standard 7-field config with a key remap is acceptable, or whether bespoke config is required.
* **Region modelling:** "Royal Courts of Justice Group" region and "Business and Property Courts (Rolls Building)" grouping — confirm how region/grouping is represented in the current data model (the codebase links list types to sub-jurisdictions, not explicit regions). Assumed `subJurisdictionIds: [1]` (Civil Court) satisfies the "Civil jurisdiction" requirement.
* **Location address:** Rolls Building address (Fetter Lane, EC4A 1NL) assumed from the Business and Property Courts location; **confirm** exact location lines against the reference style guide before finalising locale content.
* **Excel template columns:** Assumed the uploaded Excel template columns map 1:1 to the seven JSON fields in the listed order. **Confirm** the exact template header labels/positions.
* **"Interim Applications List (ChD)" mention** in acceptance criteria bullet 3 appears to be a copy/paste error from another ticket; assumed it should read "Admiralty Court (KB)".
* **Time format:** Assumed the RCJ time pattern (`9am`, `10:30pm`) applies. The issue's example `"10:30pm"` is technically an invalid clock time but matches the pattern format; **confirm** whether time values require semantic validation or free-text display only.
* **Welsh translations** are marked with `[TRANSLATE: ...]` and will be resolved by the post-processing translation script.


### Comment by OgechiOkelu on 2026-08-12T16:53:50Z

@plan
