# #801: Chancery Appeals (ChD) daily cause list

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:00:52Z
**Updated:** 2026-08-10T12:15:17Z

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Chancery Appeals (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service
**I WANT** to create the validation schema and style guides for Chancery Appeals (ChD) daily cause list
**SO THAT** the Chancery Appeals (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Chancery Appeals (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Chancery Appeals (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Chancery Appeals (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Chancery Appeals (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/chancery-appeals-chd-daily-cause-list?artefactId=9cc94552-ee10-4226-972d-b8d189b01aa3
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

### Comment by OgechiOkelu on 2026-07-22T16:00:28Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T16:04:14Z
# Technical Specification: Chancery Appeals (ChD) Daily Cause List

_Issue #801 — non-strategic publication of the Chancery Appeals (ChD) daily cause list via Excel upload in CaTH._

## 1. User Story
**As a** HMCTS publishing user (Court and Tribunal Hearings service)
**I want to** upload the Chancery Appeals (ChD) daily cause list as an Excel file that CaTH converts to JSON, validates and renders
**So that** the Chancery Appeals (ChD) daily cause list can be published under the Business and Property Courts, Rolls Building and made available to the public as a rendered page, PDF and Excel download.

## 2. Background
This is a new **non-strategic** list type. Non-strategic list types are published by uploading an Excel template that CaTH parses, validates against a JSON schema, converts to JSON and renders through a Nunjucks template. This follows the established pattern already used for the RCJ family of lists (e.g. `KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST`) and the standalone `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST`.

Key differences from the existing RCJ standard list types:
- The Chancery Appeals list uses a **single flat table** (no "future judgments" tab).
- The field set and ordering differ. This list uses `judge, time, venue, type, caseNumber, caseName, additionalInformation` — note `type` (not `hearingType`) and `caseName` (not `caseDetails`). Because the field names and order differ, this list type **requires its own module, schema and converter config**; it cannot reuse `RCJ_EXCEL_CONFIG`.

Reference implementations to model against:
- `libs/list-types/court-of-appeal-civil-daily-cause-list/` — standalone single-list-type module (schema, converter, renderer, PDF, locales, validator).
- `apps/web/src/pages/(list-types)/court-of-appeal-civil-daily-cause-list/` — page controller using `createSimpleListTypeHandler` with a `SUPPORTED_LIST_TYPE` guard on `artefact.listTypeName`.

Reference style guide (structure to follow):
`https://pip-frontend.staging.platform.hmcts.net/chancery-appeals-chd-daily-cause-list?artefactId=9cc94552-ee10-4226-972d-b8d189b01aa3`

Confirmed existing reference data:
- Region **"Royal Courts of Justice Group"** exists (`regionId: 11`).
- Jurisdiction **"Civil"** exists (`jurisdictionId: 1`, sub-jurisdiction "Civil Court" = `1`).

## 3. Acceptance Criteria

* **Scenario:** List type registered under the correct court, jurisdiction and region — available, linked to **Civil** jurisdiction and **Royal Courts of Justice Group** region, flagged `is_non_strategic = true`.
* **Scenario:** Validation schema defines the required fields in the specified order — **Judge, Time, Venue, Type, Case Number, Case Name, Additional Information**, with `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName` required and `additionalInformation` optional.
* **Scenario:** Publish via Excel upload converted to JSON.
* **Scenario:** Invalid upload is rejected with actionable errors.
* **Scenario:** Rendered page follows the reference style guide.
* **Scenario:** PDF and Excel downloads available.
* **Scenario:** Welsh rendering with `?lng=cy`.

## 6. Page Specifications (summary)

**New module:** `libs/list-types/chancery-appeals-chd-daily-cause-list/` with config, index, schema, validator (+test), converter config, models, renderer, locales, PDF generator/template, email-summary.

**Page controller:** `apps/web/src/pages/(list-types)/chancery-appeals-chd-daily-cause-list/` using `createSimpleListTypeHandler` with `SUPPORTED_LIST_TYPE = "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST"`.

**Registration touch-points:** `list-type-data.ts` entry, `PDF_GENERATOR_REGISTRY`, module registration in `apps/web` (Nunjucks modulePaths, Vite assets).

## 9. Validation

Schema root is `type: "array"`, `items.type: "object"`. Field order and rules:

| Order | Field | Required | Rule |
|-------|-------|----------|------|
| 1 | `judge` | Yes | string, no HTML tags |
| 2 | `time` | Yes | string, time pattern (e.g. `9am`, `10:30pm`) |
| 3 | `venue` | Yes | string, no HTML tags |
| 4 | `type` | Yes | string, no HTML tags |
| 5 | `caseNumber` | Yes | string, no HTML tags |
| 6 | `caseName` | Yes | string, no HTML tags |
| 7 | `additionalInformation` | No | string, no HTML tags |

`required`: `["judge", "time", "venue", "type", "caseNumber", "caseName"]`.

### Comment by OgechiOkelu on 2026-07-23T13:05:38Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T13:17:20Z
## Planning complete — clarifications needed

A technical plan was committed to `docs/tickets/801/` on branch `feature/801-chancery-appeals-chd-daily-cause-list`.

The true structural analogue is **`rcj-standard-daily-cause-list`** (flat single-array schema), not `court-of-appeal-civil-daily-cause-list` (two-array root, different field names). The plan is modelled on the RCJ standard list.

Clarifications requested before implementation:
1. **Venue / location record** — Does a `location` row for "Business and Property Courts, Rolls Building" already exist?
2. **Sub-jurisdiction id** — Civil Court (1) vs High Court (10)? Other Business & Property / Rolls Building lists link to **[10] High Court**, contradicting the draft's assumption of [1] Civil Court.
3. **Friendly name + Welsh name** — confirm exact English friendly name, any `shortenedFriendlyName`, and Welsh translation.
4. **"Important information" body copy** (English + Welsh).
5. **Excel template column headers** — exact header strings ("Type" vs "Hearing Type", etc.).
6. **Sensitivity / provenance** — confirm `defaultSensitivity = "Public"`, `provenance = "CFT_IDAM"`, and `minRows`.
