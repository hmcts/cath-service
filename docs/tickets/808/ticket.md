# #808: Insolvency & Companies Court (ChD) daily cause list

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:12:07Z
**Updated:** 2026-08-11T09:36:19Z

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Insolvency & Companies Court (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Insolvency & Companies Court (ChD) daily cause list

**SO THAT** the Insolvency & Companies Court (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Insolvency & Companies Court (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Insolvency & Companies Court (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The Insolvency & Companies Court (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Insolvency & Companies Court (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/insolvency-and-companies-court-chd-daily-cause-list?artefactId=e54a8a97-7fe5-4585-b43a-d1a6a6eb4bba
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

### Comment by OgechiOkelu on 2026-07-22T15:29:05Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T15:35:49Z
# Technical Specification — Insolvency & Companies Court (ChD) Daily Cause List

**GitHub Issue:** #808
**Type:** New non-strategic list type (Excel upload → JSON → rendered web page + PDF/Excel download)

## 1. User Story

**As a** member of the public, legal professional, or media user of the Court and Tribunal Hearings (CaTH) service
**I want to** view, download and subscribe to the Insolvency & Companies Court (ChD) daily cause list
**So that** I can find out which insolvency and companies cases are being heard at the Business and Property Courts (Rolls Building), on what day, before which judge, and where.

Supporting story (publisher side): upload the list as an Excel template that is validated and converted to JSON.

## 2. Background

Non-strategic publication. Court staff prepare the list in an Excel template; CaTH validates the workbook against a schema, converts it to JSON, stores the artefact, and renders it as a bilingual web page plus a downloadable PDF. The original uploaded Excel file remains available as a flat-file download.

The list belongs to the **Business and Property Courts (Rolls Building)**, linked to the **Civil** jurisdiction and the **Royal Courts of Justice Group** region.

Reuses "RCJ standard" 7-column list machinery:
- Reference implementation to copy: `libs/list-types/administrative-court-daily-cause-list/` and `libs/list-types/rcj-standard-daily-cause-list/`.
- Shared Excel converter config: `RCJ_EXCEL_CONFIG` in `libs/list-types/common/src/conversion/rcj-field-configs.ts`.
- Shared handler/guard: `apps/web/src/pages/(list-types)/list-type-handler.ts`.
- PDF registry: `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`.
- Reference style guide: https://pip-frontend.staging.platform.hmcts.net/insolvency-and-companies-court-chd-daily-cause-list?artefactId=e54a8a97-7fe5-4585-b43a-d1a6a6eb4bba

**Field mapping note:** issue #808 defines the JSON with keys `judge, time, venue, type, caseNumber, caseName, additionalInformation`. These differ from the RCJ standard config (`hearingType`, `caseDetails`). This spec honours the issue's exact JSON contract, so a dedicated Excel converter config is required — do NOT reuse `RCJ_EXCEL_CONFIG` verbatim.

## 3. Acceptance Criteria (summary)
- List type registered under Business and Property Courts (Rolls Building), Civil jurisdiction, Royal Courts of Justice Group region.
- Schema fields in order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information (all required except Additional Information).
- Publisher uploads valid .xlsx → validated, converted to JSON, published.
- Invalid upload → specific validation error, nothing published.
- Public views rendered GOV.UK table with the 7 columns, list date and last-updated.
- Welsh rendering of all furniture/headers.
- PDF and original Excel downloadable.
- Style guide matches reference.

## 4-13. (See full spec) Page specs, content, URL, validation, error messages, navigation, accessibility, test scenarios as detailed in the issue.

New lib: `libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/` (copy admin-court skeleton).
New web page: `apps/web/src/pages/(list-types)/insolvency-and-companies-court-chd-daily-cause-list/`.
Data model field names follow the issue's JSON exactly (`type`, `caseName`).
List-type name constant assumed: `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST`.

### Comment by OgechiOkelu on 2026-07-23T13:18:14Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T13:25:17Z
## Technical plan ready — clarifications needed before implementation

Non-strategic RCJ-standard 7-column list, largely copies existing `administrative-court-daily-cause-list`. Clarifications:

1. **Field names (blocker).** JSON in issue uses `type`/`caseName`, but existing RCJ lists use `hearingType`/`caseDetails`. Does the staging reference page use the issue's keys or RCJ standard keys? Plan currently honours the issue's exact JSON.
2. **Time format.** Example includes `10:30pm` and `9am`. Confirm accepted formats (am/pm only? 24-hour? free-text?).
3. **Location.** "Business and Property Courts (Rolls Building)" does NOT currently exist in `libs/location/src/location-data.ts` — will be added (region 11 = Royal Courts of Justice Group, Civil sub-jurisdiction). Confirm canonical court name.
4. **"Excel downloadable version".** Assumed original uploaded flat file, not a generated workbook. Confirm.
5. **Important-information / caution text.** Not specified — will be taken from staging reference. Provide exact EN + CY wording.
6. **Subscriptions / email summaries.** In scope, or view/download only?
7. **Sensitivity.** Assumed `Public`. Confirm.
8. **List-type name constant.** Assumed `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST`. Confirm matches staging reference artefact.
