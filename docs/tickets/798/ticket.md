# #798: Interim Applications List (ChD) Daily Cause List

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T17:52:24Z
**Updated:** 2026-08-13T12:55:45Z

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Interim Applications List (ChD) Daily Cause List (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.
[interimApplicationsChanceryDivisionDailyCauseList.xlsx](https://github.com/user-attachments/files/30275690/interimApplicationsChanceryDivisionDailyCauseList.xlsx)

**AS A** Service
**I WANT** to create the validation schema and style guides for Interim Applications List (ChD) Daily Cause List
**SO THAT** the Interim Applications List (ChD) Daily Cause List can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Interim Applications List (ChD) Daily Cause List is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The the Interim Applications List (ChD) Daily Cause List is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The excel template contains with 2 tabs. The date fields in the first tab of the excel template are Judge, Time, Venue, Type, Case Number, Case Name and Additional Information. The second tab contains date fields that supports the flexibility in updating the judge's name and email address each time the excel file is uploaded in CaTH (this means that the first paragraph of the important information section of the style guide for the Interim Applications list daily cause list is open to editing each time the template is uploaded).
- The validation schema and style guide for the Interim Applications List (ChD) Daily Cause List is created.
- A PDF and excel downloadable version of the hearing list is created.
- The style guide should adopt the format in https://pip-frontend.staging.platform.hmcts.net/interim-applications-chd-daily-cause-list?artefactId=9d1e86f3-1917-42de-8370-7da22773589f
- The Json file should follow the format in https://github.com/hmcts/pip-data-management/blob/master/src/integrationTest/resources/data/non-strategic/interim-applications-chd-daily-cause-list/interimApplicationsChanceryDivisionDailyCauseList.json
- A sample of the excel template is attached

## Comments

### Comment by OgechiOkelu on 2026-07-22T16:05:16Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T16:09:33Z

# Technical Specification: Interim Applications List (ChD) Daily Cause List

> GitHub Issue #798 — Non-strategic publishing of the Interim Applications List (ChD) Daily Cause List via Excel upload in CaTH.

## 1. User Story
**As a** Court and Tribunal Hearings (CaTH) publisher for the Business and Property Courts (Rolls Building)
**I want to** upload an Excel template of the Interim Applications List (ChD) Daily Cause List and have it converted to JSON, validated and rendered as a publication (with PDF and Excel download options)
**So that** the Interim Applications List (ChD) Daily Cause List can be published in CaTH under the Civil jurisdiction and Royal Courts of Justice Group region, and viewed by the public.

## 2. Background

This is a **non-strategic** list type. Non-strategic lists are published by uploading an Excel workbook through the CaTH manual-upload route; the workbook is converted to JSON, validated against a JSON schema, stored as an artefact, and rendered by a dedicated page controller and template. A PDF and the original Excel file are made available as downloads.

The Interim Applications List (ChD) Daily Cause List sits under the **Business and Property Courts, Rolls Building**, is linked to the **Civil** jurisdiction and the **Royal Courts of Justice Group** region.

Distinctive requirement: the Excel workbook has **two tabs**.
- **Tab 1 — hearings**: one row per hearing with the fields Judge, Time, Venue, Type, Case Number, Case Name, Additional Information.
- **Tab 2 — judge details**: a single editable block carrying the judge's name and email address. This feeds the **first paragraph of the "Important information" section** of the style guide so that the sitting judge's name and contact email can change on every upload without a code change.

Supporting references from the issue:
- Sample Excel template: `interimApplicationsChanceryDivisionDailyCauseList.xlsx` (attached to the issue).
- Target style guide format (staging): `https://pip-frontend.staging.platform.hmcts.net/interim-applications-chd-daily-cause-list?artefactId=9d1e86f3-1917-42de-8370-7da22773589f`
- Target JSON format: `https://github.com/hmcts/pip-data-management/blob/master/src/integrationTest/resources/data/non-strategic/interim-applications-chd-daily-cause-list/interimApplicationsChanceryDivisionDailyCauseList.json`

### Existing patterns this feature follows
The codebase already contains directly comparable non-strategic, multi-tab RCJ list types. This spec reuses their infrastructure rather than introducing new abstractions:

| Concern | Reference implementation |
|---------|--------------------------|
| Two-tab Excel → JSON conversion | `libs/list-types/court-of-appeal-civil-daily-cause-list/src/conversion/court-of-appeal-civil-daily-cause-list-config.ts` (`createMultiSheetConverter`) |
| Single-tab RCJ 7-field conversion | `libs/list-types/common/src/conversion/rcj-field-configs.ts` (`RCJ_EXCEL_CONFIG_SIMPLE_TIME`) |
| Lib structure, config, validator | `libs/list-types/london-administrative-court-daily-cause-list/` |
| Page controller + render helper | `apps/web/src/pages/(list-types)/london-administrative-court-daily-cause-list/index.ts` (`createSimpleListTypeHandler`) |
| List-type registration | `libs/list-types/common/src/list-type-data.ts` |
| PDF generator registry | `libs/publication/src/processing/service.ts` (`PDF_GENERATOR_REGISTRY`) |

## 3. Acceptance Criteria

* **Scenario:** List type registered under the correct hierarchy
    * **Given** the CaTH reference data
    * **When** the Interim Applications List (ChD) Daily Cause List is registered
    * **Then** it appears under the Business and Property Courts (Rolls Building) location, linked to the **Civil** jurisdiction and the **Royal Courts of Justice Group** region, and is marked `isNonStrategic: true`.

* **Scenario:** Publisher uploads the two-tab Excel template
    * **Given** a publisher on the manual Excel-upload route selecting the "Interim Applications List (ChD) Daily Cause List" list type
    * **When** they upload a workbook whose Tab 1 contains the columns Judge, Time, Venue, Type, Case Number, Case Name, Additional Information and whose Tab 2 contains the judge name and email
    * **Then** the workbook is converted to JSON, validated against the schema, and stored as an artefact.

* **Scenario:** Judge name/email is editable per upload
    * **Given** a previously published list
    * **When** a new workbook is uploaded with a different judge name and email in Tab 2
    * **Then** the first paragraph of the "Important information" section on the rendered page and PDF reflects the new judge name and email, with no code change.

* **Scenario:** Rendered publication matches the agreed style guide
    * **Given** a valid published artefact for this list type
    * **When** a member of the public views the publication
    * **Then** the page renders in the format of the staging style guide, with the hearings table (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information), the "Important information" section, and a case search field.

* **Scenario:** Downloads available
    * **Given** a published artefact
    * **When** the user chooses to download
    * **Then** both a **PDF** and the original **Excel** version of the hearing list are available.

* **Scenario:** Invalid upload rejected
    * **Given** a workbook missing a required column or containing malformed data (e.g. bad time format, HTML tags, missing required Tab 1 field)
    * **When** the publisher uploads it
    * **Then** conversion/validation fails with a clear, row-referenced error and no artefact is created.

* **Scenario:** Welsh language support
    * **Given** any view of the publication
    * **When** the user switches to Welsh (`?lng=cy`)
    * **Then** all static page furniture (headings, table headers, important-info title, search labels, data-source label) renders in Welsh.

## 4. User Journey Flow

(diagrams as in the original spec — publisher upload journey and public view journey)

## 5. Low Fidelity Wireframe

(wireframe as in the original spec — h1, FaCT link, location lines, list date, editable Important information block from Tab 2, Search Cases, hearings table, data source, download PDF/Excel, back to top)

## 6. Page Specifications

### 6.1 New module (lib)
Create `libs/list-types/interim-applications-chd-daily-cause-list/` mirroring the London Administrative Court lib.

### 6.2 Excel → JSON conversion (two tabs)
Use `createMultiSheetConverter` (as in `court-of-appeal-civil-daily-cause-list-config.ts`).
- Tab 1 — Hearings: Judge, Time (time format), Venue, Type, Case Number, Case Name (all required), Additional Information (optional), `validateNoHtmlTags` on text.
- Tab 2 — Judge details: Judge Name, Judge Email (required).
Register with `registerConverterByName("INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST", converter)`.

### 6.3 JSON shape
Match the referenced pip-data-management JSON (see plan clarification — actual keys are `hearingList[]` and `openJusticeStatementDetails[]`).

### 6.4 Renderer
`renderInterimApplicationsChd` returns header, hearings, and `importantInfoParagraph` built from the editable judge details prepended to the static important-information text.

### 6.5 Page controller
`apps/web/src/pages/(list-types)/interim-applications-chd-daily-cause-list/index.ts` using `createSimpleListTypeHandler`.

### 6.6 Registrations
1. `libs/list-types/common/src/list-type-data.ts` — add the list type.
2. `libs/publication/src/processing/service.ts` — add PDF generator to `PDF_GENERATOR_REGISTRY`.
3. Register lib in root `tsconfig.json`, `apps/web/src/app.ts`, `apps/web/vite.config.ts`.
4. Ensure the location (Business and Property Courts / Rolls Building) with Civil jurisdiction + Royal Courts of Justice Group region exists in `libs/location/src/location-data.ts`.

## 7–13. Content, URL, Validation, Error messages, Navigation, Accessibility, Test scenarios

(as detailed in the original spec — see plan.md for the finalised approach)

## 14. Assumptions & Open Questions

(see the @plan comment below for the confirmed answers)

### Comment by OgechiOkelu on 2026-07-23T14:58:50Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T15:06:07Z

## Technical plan created 📋

Plan committed to `docs/tickets/798/` on branch `feature/798-interim-applications-chd-daily-cause-list`:
- `plan.md` — technical implementation plan
- `tasks.md` — implementation checklist

While drafting the plan I verified the real reference JSON and the existing codebase patterns. A few clarifications are needed before implementation:

1. **JSON key names — correction to the auto-generated spec.** The actual pip-data-management reference JSON uses a root **object** with two **arrays**: `hearingList[]` (hearing keys `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`, `additionalInformation`) and `openJusticeStatementDetails[]` (keys `nameToBeDisplayed`, `email`). The earlier `@spec` comment assumed `hearings`/`judgeDetails`/`judgeName`/`judgeEmail` — the plan uses the confirmed upstream keys so CaTH matches pip-data-management. Please confirm this is acceptable.

2. **Location / region reference data.** "Business and Property Courts (Rolls Building)" does **not** currently exist in `libs/location/src/location-data.ts`, and region 11 ("Royal Courts of Justice Group") currently has **no** locations attached. Should we (a) create a new location for Business and Property Courts (Rolls Building) under region 11 + the Civil sub-jurisdiction, or (b) attach the list to the existing "Royal Courts of Justice" location (id 4)? Please provide the location id and the exact display/Welsh names.

3. **Sample workbook sheet names & column headers.** The exact Tab 1 / Tab 2 sheet names and header-row text from the attached `.xlsx` are needed for the converter's `worksheetName` values and header mapping (an index fallback exists, but exact names are preferred).

4. **Time format.** The reference JSON shows `"10.30am"` (dot rather than colon). Does `validateTimeFormatSimple` accept that format, or is a different/looser validator required?

5. **Is Tab 2 (open justice) mandatory per upload?** Should the schema require at least one `openJusticeStatementDetails` entry (`minItems: 1`), or allow zero and fall back to static text only?

6. **Static "Important information" wording.** The exact static paragraph(s) that follow the editable judge paragraph, plus the editable-paragraph template wording, need to be lifted verbatim from the staging style guide. Can that text be provided?

7. **Welsh translations.** `welshFriendlyName` for `list-type-data.ts` and all `cy.ts` strings need real translations (marked `[WELSH TRANSLATION REQUIRED]` until provided).
