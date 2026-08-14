# #802: Commercial Court (KB) daily cause list

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:03:12Z
**Updated:** 2026-08-12T15:50:40Z

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Commercial Court (KB) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Commercial Court (KB) daily cause list

**SO THAT** the Commercial Court (KB) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Commercial Court (KB) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Commercial Court (KB) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Commercial Court (KB) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Commercial Court (KB) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/commercial-court-kb-daily-cause-list?artefactId=cbcc9d8d-e8fc-4035-aba5-cee6bd0d20ae
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

### Comment by OgechiOkelu on 2026-07-22T15:00:23Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T15:03:41Z

# Technical Specification: Commercial Court (KB) Daily Cause List

**GitHub Issue:** #802
**Feature:** Non-strategic publishing of the Commercial Court (KB) daily cause list via Excel upload in CaTH

## 1. User Story
**As a** service (Court and Tribunal Hearings / CaTH publishing pipeline)
**I want to** create a validation schema, Excel-to-JSON conversion, style guide, and rendered/downloadable views for the Commercial Court (KB) daily cause list
**So that** the Commercial Court (KB) daily cause list can be published in CaTH through the non-strategic Excel upload route and viewed by the public in HTML, PDF, and Excel formats.

## 2. Background
The Commercial Court (King's Bench Division) sits within the Business and Property Courts at the Rolls Building. This list is published non-strategically: an administrator uploads an Excel template through the CaTH admin upload journey, and the service converts it to a canonical JSON document for rendering and download.

Comparable implementations to mirror:
- **Single flat-array list** (closest match): `libs/list-types/administrative-court-daily-cause-list/` and its page `apps/web/src/pages/(list-types)/administrative-court-daily-cause-list/`.
- **RCJ / Rolls Building family** rendering conventions: `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/`.

**Important deviation:** this issue specifies field set/order `judge, time, venue, type, caseNumber, caseName, additionalInformation`. The keys `type` and `caseName` do **not** map onto the shared `RCJ_EXCEL_CONFIG`. A dedicated Excel config and schema are required.

## 3. Acceptance Criteria
- List type registered against Business and Property Courts (Rolls Building), Civil jurisdiction, Royal Courts of Justice Group region.
- Validation schema enforces required field set/order (`additionalInformation` optional), rejects embedded HTML.
- Excel upload converted to canonical JSON.
- Public HTML rendering with columns in order Judge, Time, Venue, Type, Case Number, Case Name, Additional Information.
- Welsh rendering via `?lng=cy`.
- PDF and Excel downloadable versions.
- CI validator guard passes (`validateCommercialCourtKbDailyCauseList` + test).

## 6. Page Specifications
New lib `libs/list-types/commercial-court-kb-daily-cause-list/` mirroring `administrative-court-daily-cause-list`. New page `apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/`.

`SUPPORTED_LIST_TYPE = "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST"`.

Registrations required: PDF_GENERATOR_REGISTRY, registerConverterByName, root tsconfig path alias, Vite/app registration, reference-data seed.

## 9. Validation
Root is a JSON array of hearing objects. Required: `judge, time, venue, type, caseNumber, caseName`. `additionalInformation` optional. All strings reject embedded HTML; `time` uses simple-time pattern.

### Comment by OgechiOkelu on 2026-07-23T14:05:53Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T14:18:48Z

## 📋 Technical plan ready

**Approach:** a new `libs/list-types/commercial-court-kb-daily-cause-list/` lib mirroring the single flat-array `administrative-court-daily-cause-list`, plus a public page at `/commercial-court-kb-daily-cause-list`. Because the required field set/order differs from `RCJ_EXCEL_CONFIG`, a dedicated JSON schema and Excel converter config are required. All routing uses stable `listTypeName` `COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST`.

## ❓ Clarifications needed before implementation
1. Exact Excel template column headers.
2. Court hierarchy / reference-data seeding scope.
3. Important-information / caution copy.
4. Welsh translations.
5. Layout (single flat table assumed).
6. Default sensitivity (assumed PUBLIC).
