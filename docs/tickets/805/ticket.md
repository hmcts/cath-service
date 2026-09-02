# #805: Financial List (ChD/KB) daily cause list

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:07:45Z
**Updated:** 2026-08-06T14:56:46Z

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Financial List (ChD/KB) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.


**AS A** Service

**I WANT** to create the validation schema and style guides for Financial List (ChD/KB) daily cause list

**SO THAT** the Financial List (ChD/KB) daily cause list can be published in CaTH


**ACCEPTANCE CRITERIA**
- The Financial List (ChD/KB) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Financial List (ChD/KB) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Financial List (ChD/KB) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Financial List (ChD/KB) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/financial-list-chd-kb-daily-cause-list?artefactId=bb5307f2-e0fd-4d72-8ae8-b72457413eb8
- The Json file should follow the below format
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

## Comments

### Comment by OgechiOkelu on 2026-07-22T15:47:06Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T15:50:51Z
# Technical Specification: Financial List (ChD/KB) Daily Cause List

_GitHub issue #805 — non-strategic publishing of the Financial List (ChD/KB) daily cause list via Excel upload in CaTH._

## 1. User Story
**As a** Court and Tribunal Hearings (CaTH) service
**I want to** create the validation schema, Excel-to-JSON conversion, style guide (rendered page), and downloadable PDF/Excel versions for the Financial List (ChD/KB) daily cause list
**So that** the Financial List (ChD/KB) daily cause list can be published in CaTH through the Excel upload route and viewed by the public.

## 2. Background
The Financial List (ChD/KB) sits within the Business and Property Courts of England and Wales at the Rolls Building. This list must be publishable through CaTH's **non-strategic** publishing route — an internal user uploads an Excel template, which is converted to JSON, validated against a schema, and rendered as an HTML "style guide" page with downloadable PDF and Excel versions.

The list type is associated with:
- **Jurisdiction:** Civil (via the `Civil Court` sub-jurisdiction, `sub_jurisdiction_id = 1`, `jurisdiction_id = 1`)
- **Region:** Royal Courts of Justice Group
- **Court/venue:** Business and Property Courts, Rolls Building

Reference style guide (staging):
`https://pip-frontend.staging.platform.hmcts.net/financial-list-chd-kb-daily-cause-list?artefactId=bb5307f2-e0fd-4d72-8ae8-b72457413eb8`

This list follows the same flat single-table pattern used by the RCJ standard daily cause lists (`libs/list-types/rcj-standard-daily-cause-list`), but with a distinct field set. It **cannot** reuse `RCJ_EXCEL_CONFIG` because the columns differ (`type` not `hearingType`, `caseName` not `caseDetails`, and both `caseNumber` and `caseName` are present). It therefore requires its own module, schema, model, Excel config, renderer, and PDF generator.

**Reference implementation to mirror:** `libs/list-types/rcj-standard-daily-cause-list/` and its page controller at `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/`.

### Data shape (from the issue)
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

Column order (as required by the acceptance criteria): **Judge, Time, Venue, Type, Case Number, Case Name, Additional Information.**

## 3. Acceptance Criteria

* **Scenario:** List type registered under the correct jurisdiction and region
    * **Given** the reference data seed has been applied
    * **When** an admin browses list types under the Business and Property Courts (Rolls Building)
    * **Then** the "Financial List (ChD/KB) Daily Cause List" is available, linked to the `Civil` jurisdiction (`Civil Court` sub-jurisdiction) and the `Royal Courts of Justice Group` region

* **Scenario:** Validation schema enforces the required fields in the listed order
    * **Given** an uploaded JSON payload for the Financial List (ChD/KB)
    * **When** it is validated
    * **Then** the schema requires `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`, and `additionalInformation`, and the schema documents them in that order

* **Scenario:** Excel upload converts to JSON and publishes
    * **Given** an internal user uploads a valid Financial List (ChD/KB) Excel template
    * **When** the file is processed
    * **Then** it is converted to the JSON format above, validated, and published as an artefact viewable in CaTH

* **Scenario:** Invalid upload is rejected
    * **Given** an Excel file missing a required column value (e.g. no `Judge`)
    * **When** it is processed
    * **Then** conversion/validation fails with an error identifying the missing field and row, and no artefact is published

* **Scenario:** Rendered style guide page
    * **Given** a published Financial List (ChD/KB) artefact
    * **When** a member of the public opens the list page (with `artefactId`)
    * **Then** the list is rendered as a table matching the reference style guide, in both English and Welsh (`?lng=cy`)

* **Scenario:** Downloadable PDF and Excel
    * **Given** a published Financial List (ChD/KB) artefact
    * **When** the user selects the download options
    * **Then** a PDF and an Excel version of the hearing list are produced

## 4. User Journey Flow

```
INTERNAL PUBLISHING JOURNEY
┌──────────────────────────────────────────────────────────────────┐
│ 1. Admin signs in → Upload publication                             │
│ 2. Selects court: Business & Property Courts (Rolls Building)      │
│ 3. Selects list type: Financial List (ChD/KB) Daily Cause List     │
│ 4. Selects jurisdiction (Civil) / region (RCJ Group) / dates       │
│ 5. Uploads .xlsx template                                          │
│        │                                                           │
│        ▼                                                           │
│   Excel → JSON conversion (registerConverterByName)                │
│        │                                                           │
│        ├── conversion/validation fails → error shown, no publish   │
│        │                                                           │
│        ▼ success                                                   │
│   JSON validated against schema → artefact stored                  │
│   PDF + Excel derivatives generated (registries)                   │
└──────────────────────────────────────────────────────────────────┘

PUBLIC VIEWING JOURNEY
┌──────────────────────────────────────────────────────────────────┐
│ 1. User finds the court → sees published lists                     │
│ 2. Opens Financial List (ChD/KB) Daily Cause List (artefactId)     │
│ 3. Reads rendered table (EN/CY), search-filters rows               │
│ 4. Downloads PDF or Excel version                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 5. Low Fidelity Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings                    [ Cymraeg ]   │
├────────────────────────────────────────────────────────────────────┤
│ ‹ Back                                                               │
│                                                                      │
│  Financial List (ChD/KB) Daily Cause List                     <h1>   │
│                                                                      │
│  Business and Property Courts of England and Wales                   │
│  Rolls Building, Fetter Lane, London, EC4A 1NL                       │
│                                                                      │
│  List for 22 July 2026                                               │
│  Last updated 22 July 2026 at 9:00am                                 │
│                                                                      │
│  [ Download PDF ]   [ Download Excel ]                               │
│                                                                      │
│  Search Cases                                                        │
│  [ Search by judge, case number, case name, venue... ]  🔍          │
│                                                                      │
│  ┌───────┬──────┬───────┬──────┬───────────┬───────────┬─────────┐  │
│  │ Judge │ Time │ Venue │ Type │ Case      │ Case name │ Add.    │  │
│  │       │      │       │      │ number    │           │ info    │  │
│  ├───────┼──────┼───────┼──────┼───────────┼───────────┼─────────┤  │
│  │Judge A│ 9am  │Venue A│Type A│ 12345     │Case name A│ This ...│  │
│  │Judge B│10:30 │Venue B│Type B│ 12346     │Case name B│ This ...│  │
│  │       │ pm   │       │      │           │           │         │  │
│  └───────┴──────┴───────┴──────┴───────────┴───────────┴─────────┘  │
│                                                                      │
│  ▸ Data source: <provenance>                                         │
│  Back to top ↑                                                       │
└────────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

New module `libs/list-types/financial-list-chd-kb-daily-cause-list/` (mirrors the RCJ standard module):

```
libs/list-types/financial-list-chd-kb-daily-cause-list/
├── package.json                # @hmcts/financial-list-chd-kb-daily-cause-list
├── tsconfig.json
├── README.md
└── src/
    ├── config.ts               # moduleRoot, schemaPath
    ├── index.ts                # exports; imports conversion config for side-effect registration
    ├── schemas/
    │   └── financial-list-chd-kb-daily-cause-list.json
    ├── models/
    │   └── types.ts            # FinancialListHearing, FinancialListHearingList
    ├── conversion/
    │   ├── financial-list-chd-kb-daily-cause-list-config.ts   # Excel config + registerConverterByName
    │   └── financial-list-chd-kb-daily-cause-list-config.test.ts
    ├── validation/
    │   ├── json-validator.ts   # validateFinancialListChdKbDailyCauseList
    │   └── json-validator.test.ts
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    └── pdf/
        ├── pdf-template.njk
        ├── pdf-generator.ts    # generateFinancialListChdKbDailyCauseListPdf
        └── pdf-generator.test.ts
```

Page controller (rendered "style guide" page) at:
```
apps/web/src/pages/(list-types)/financial-list-chd-kb-daily-cause-list/
├── index.ts                    # GET handler via createSimpleListTypeHandler
├── financial-list-chd-kb-daily-cause-list.njk
├── financial-list-chd-kb-daily-cause-list.njk.test.ts
└── index.test.ts
```

**Model** (`models/types.ts`):
```typescript
export interface FinancialListHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export type FinancialListHearingList = FinancialListHearing[];
```

**Registration points** (all keyed by the stable `listTypeName` string `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` — never a numeric id):
| File | Change |
|------|--------|
| `libs/list-types/common/src/list-type-data.ts` | Add list type entry (name, friendly names, `urlPath`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [1]`) |
| `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` | Insert row for the new list type |
| `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` | Link `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` → sub-jurisdiction `1` (Civil Court) |
| `libs/publication/src/processing/service.ts` | Add to `PDF_GENERATOR_REGISTRY`; add `@hmcts/financial-list-chd-kb-daily-cause-list` dependency to `libs/publication/package.json` |
| `apps/web/src/app.ts` / `vite.config.ts` / root `tsconfig.json` | Register module root/paths per module-registration guide |

**Table rendering:** GOV.UK Table component, seven columns in the required order. Use the same header block, "Search Cases" filter, data-source footer, and "Back to top" pattern as the RCJ standard templates. No visual styling beyond GOV.UK classes.

## 7. Content

Locale files `libs/list-types/financial-list-chd-kb-daily-cause-list/src/locales/{en,cy}.ts`. Structure the content under a `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` key plus a `common` key for shared table headers/labels, matching the RCJ standard shape.

Reference-data friendly names:
- English friendly name: `Financial List (ChD/KB) Daily Cause List`
- Welsh friendly name: `[WELSH TRANSLATION REQUIRED: "Financial List (ChD/KB) Daily Cause List"]`

## 8. URL

- **Rendered page (public style guide):** `/financial-list-chd-kb-daily-cause-list?artefactId=<uuid>`
- **`urlPath` in list-type-data:** `financial-list-chd-kb-daily-cause-list`
- **List type name (stable, `@unique`):** `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST`
- Publishing/upload uses the existing non-strategic Excel upload route; no new upload URL is introduced.

## 9. Validation

Two layers, both required:

**A. Excel-to-JSON conversion config** — a new `ExcelConverterConfig` (do **not** reuse `RCJ_EXCEL_CONFIG`), with columns in the required order and `validateNoHtmlTags` on text fields plus `validateTimeFormat` on `Time`:

| Header | fieldName | required | validators |
|--------|-----------|----------|------------|
| Judge | `judge` | true | `validateNoHtmlTags` |
| Time | `time` | true | `validateTimeFormat` |
| Venue | `venue` | true | `validateNoHtmlTags` |
| Type | `type` | true | `validateNoHtmlTags` |
| Case Number | `caseNumber` | true | `validateNoHtmlTags` |
| Case Name | `caseName` | true | `validateNoHtmlTags` |
| Additional Information | `additionalInformation` | false | `validateNoHtmlTags` |

`minRows: 1`. Register with `registerConverterByName("FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST", converter)`.

**B. JSON Schema** (`schemas/financial-list-chd-kb-daily-cause-list.json`), draft-07, root `type: array`, required `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`, `additionalInformation`.

Wrapper (`validation/json-validator.ts`) using `createJsonValidator(schemaPath)`, exported from `index.ts` as `validateFinancialListChdKbDailyCauseList`. A CI guard test (`libs/list-types/common/src/validation/guard.test.ts`) fails if a schema ships without a `validate*` export, so this wrapper and its test are mandatory.

## 14. Assumptions & Open Questions

* **Excel-only, non-strategic:** publishing is via manual Excel upload; there is no API/JSON ingestion route for this list type.
* **Region modelling:** "Royal Courts of Justice Group" is a location/region attribute of the court, not stored on the list type. **Open question:** confirm the exact location record the artefacts will attach to.
* **Distinct field set:** this list has both `caseNumber` and `caseName` and uses `type` (not `hearingType`). **Open question:** confirm whether `caseName` and `caseNumber` are both truly mandatory.
* **Sample time value `10:30pm`:** confirm the expected time format/validation.
* **Excel download:** confirm whether the Excel download should regenerate a formatted workbook or return the originally uploaded template.
* **List title / court address:** confirm the exact court name and address lines against the live style guide.
* **Welsh translations:** all `[WELSH TRANSLATION REQUIRED: …]` markers resolved by the post-processing translation script.

### Comment by OgechiOkelu on 2026-07-23T13:01:14Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T13:04:41Z
## Technical plan ready — clarifications needed

Plan committed to `docs/tickets/805/` on branch `feature/805-financial-list-chd-kb-daily-cause-list`. The approach mirrors the existing RCJ standard daily cause list module (verified against the codebase). Before implementation, please confirm:

1. **Exact location record.** Which precise location/court record (Business and Property Courts / Rolls Building) should artefacts attach to?
2. **Mandatory fields.** Are both `caseName` **and** `caseNumber` truly mandatory, and is `additionalInformation` optional?
3. **Time format.** The example JSON contains `10:30pm`. Should `validateTimeFormat` accept 12-hour values only, or also 24-hour times?
4. **Excel download semantics.** Should the Excel download **regenerate** a formatted workbook or return the **originally uploaded** template?
5. **Court name & address lines.** Please confirm the exact header/PDF court name and address lines against the live staging style guide.
6. **Welsh translations.** All Welsh strings marked `[WELSH TRANSLATION REQUIRED: …]` pending sign-off.
