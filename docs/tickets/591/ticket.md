# #591: Style Guide: Implement COP Daily Cause List

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story, epic:public-journey
**Created:** 2026-05-13T08:51:02Z
**Updated:** 2026-07-21T16:43:18Z

## Description

## User Story

As a user, I want to view the Court of Protection Daily Cause List in an accessible and well-formatted style, so that I can see scheduled hearings with all relevant case details.

## Background

The Court of Protection Daily Cause List (`cop-daily-cause-list`) is a strategic list type with its own JSON schema. It follows the same module pattern as the existing `civil-and-family-daily-cause-list` implementation.

### List type metadata

Sourced from pip-data-management list configuration:

```json
"COP_DAILY_CAUSE_LIST": {
    "friendlyName": "Court of Protection Daily Cause List",
    "welshFriendlyName": "Rhestr Achosion Dyddiol y Llys Gwarchod",
    "shortenedFriendlyName": "COP Daily Cause List",
    "url": "cop-daily-cause-list",
    "jurisdictionTypes": ["Family Court", "High Court of the Family Division"],
    "restrictedProvenances": [],
    "defaultSensitivity": "",
    "isNonStrategic": false
}
```

- `listTypeName`: **`COP_DAILY_CAUSE_LIST`** — this is the stable `@unique` string used for all routing/guards. Never use a numeric `listTypeId`.
- Route: `GET /cop-daily-cause-list?artefactId=`

## Acceptance Criteria

**Data fields:**
Start Time, Case Ref, Case Details, Case Type, Hearing Type, Time Estimate and Hearing Channel.

**Open justice statement to be displayed within the 'Important Information' accordion:**
Open justice is a fundamental principle of our justice system. You can attend a public hearing in person or you can apply for permission to observe remotely.

Requests to observe remotely a hearing that is taking place at Belfast Laganside Court should be made in good time direct to: a@b.com or by calling +44 1234 1234 1234. You may be asked to provide further details.

The judge hearing the case will decide if it is appropriate for you to observe remotely. They will have regard to the interests of justice, the technical capacity for remote observation and what is necessary to secure the proper administration of justice.

Sometimes it is necessary for hearings to be held in private and you will not be able to observe remotely or in person. Members of the press are able to attend some private hearings.

For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing.

## JSON schema structure

Schema source: [`cop_daily_cause_list.json`](https://raw.githubusercontent.com/hmcts/pip-data-management/refs/heads/master/src/main/resources/schemas/cop_daily_cause_list.json) from pip-data-management `src/main/resources/schemas/`. Copy verbatim into `src/schemas/cop-daily-cause-list.json`.

The validator fixture (`VALID_DATA`) must satisfy every `required` array at every nesting level below. All string fields enforce HTML-tag prevention via regex pattern validation.

**Required fields by nesting level:**

| Level | Object | Required fields |
|-------|--------|-----------------|
| Root | (root) | `document`, `venue`, `courtLists` |
| Document | `document` | `publicationDate` |
| Venue | `venue` | `venueName`, `venueContact` |
| Venue contact | `venueContact` | `venueEmail`, `venueTelephone` |
| Court lists item | (item) | `courtHouse` |
| Court house | `courtHouse` | `courtHouseName`, `courtRoom` |
| Court room item | `courtRoom[]` | `courtRoomName`, `session` |
| Session item | `session[]` | `sittings` |
| Sittings item | `sittings[]` | `sittingStart`, `sittingEnd`, `hearing` |
| Hearing item | `hearing[]` | `case` |
| Case item | `case[]` | `caseNumber` |

**Object properties:**
- **Case**: `caseNumber`, `caseSequenceIndicator`, `caseName`, `caseType`, `reportingRestrictions`
- **Hearing**: `hearingType`, `case`
- **Session**: `judiciary`, `sittings`
- **Judiciary**: `johKnownAs`, `isPresiding`
- **Sittings**: `sittingStart`, `sittingEnd`, `channel`, `hearing`
- **Location details** (optional root): `jurisdiction`, `region` (with `name` and `regionalJOH` judiciary array)
- Reusable definitions: address object (`line[]`, `town`, `county`, `postCode`), venue contact (`venueTelephone`, `venueEmail`)

### Module structure
New lib created at `libs/list-types/cop-daily-cause-list/` with the following:
- `src/models/types.ts` — TypeScript interfaces matching the JSON schema structure
- `src/validation/json-validator.ts` — validates incoming JSON against `cop_daily_cause_list.json` schema
- `src/validation/json-validator.test.ts` — real-schema tests, one `it` per required field at every nesting level (mandatory — CI guard in `libs/list-types/common` fails otherwise)
- `src/schemas/cop-daily-cause-list.json` — copied from pip-data-management `cop_daily_cause_list.json`
- `src/rendering/renderer.ts` — transforms raw JSON into view-ready data
- `src/rendering/renderer.test.ts` — unit tests for renderer
- `src/pages/index.ts` — page controller (GET handler)
- `src/pages/index.test.ts` — unit tests for controller
- `src/pages/en.ts` — English translations
- `src/pages/cy.ts` — Welsh translations
- `src/pages/cop-daily-cause-list.njk` — Nunjucks HTML template
- `src/pdf/pdf-generator.ts` — PDF generation
- `src/pdf/pdf-template.njk` — PDF Nunjucks template
- `src/pdf/pdf-generator.test.ts` — unit tests for PDF generator
- `src/email-summary/summary-builder.ts` — email summary builder
- `src/email-summary/summary-builder.test.ts` — unit tests for email summary
- `src/index.ts` — exports renderer, PDF generator, validator and email summary builder
- `src/config.ts` — exports `pageRoutes` and `moduleRoot`
- `package.json` — with build scripts including `build:nunjucks` and `build:pdf-templates`
- `tsconfig.json`

### Page content (EN)

| Key | English |
|-----|---------|
| title | Court of Protection Daily Cause List |
| listDate | List for date: |
| lastUpdated | Last updated: |
| publishedAt | Published at: |
| venueAddress | Venue address |
| artefactSummaryTitle | Important information |
| artefactSummaryText | This is a court list showing hearings scheduled for today. Details of parties may be restricted by court order. |
| openJusticeTitle | Open justice |
| openJusticeText | The open justice principle means courts and tribunals should, where possible, be open for the public and press to observe. |
| dataSource | Data source |
| caseRef | Case ref |
| caseName | Case name |
| caseDetails | Case details |
| caseType | Case type |
| hearingType | Hearing type |
| timeEstimate | Time estimate |
| hearingChannel | Mode of hearing |
| reportingRestriction | Reporting restriction |
| startTime | Start time |
| judiciary | Judiciary |
| noHearings | No hearings today |
| linkToTop | Back to top |

### Page content (CY)

| Key | Welsh |
|-----|-------|
| title | Rhestr Achosion Dyddiol Llys Gwarchod |
| listDate | Rhestr ar gyfer dyddiad: |
| lastUpdated | Diweddarwyd ddiwethaf: |
| publishedAt | Cyhoeddwyd am: |
| venueAddress | Cyfeiriad y lleoliad |
| artefactSummaryTitle | Gwybodaeth bwysig |
| artefactSummaryText | Rhestr llys yw hon sy'n dangos gwrandawiadau sydd wedi'u trefnu ar gyfer heddiw. Efallai y bydd manylion y partïon yn cael eu cyfyngu gan orchymyn llys. |
| openJusticeTitle | Cyfiawnder agored |
| openJusticeText | Mae egwyddor cyfiawnder agored yn golygu y dylai llysoedd a thribiwnlysoedd, lle bo modd, fod yn agored i'r cyhoedd a'r wasg eu gwylio. |
| dataSource | Ffynhonnell data |
| caseRef | Cyfeirnod yr achos |
| caseName | Enw'r achos |
| caseDetails | Manylion yr achos |
| caseType | Math o achos |
| hearingType | Math o wrandawiad |
| timeEstimate | Amcangyfrif o'r amser |
| hearingChannel | Dull gwrandawiad |
| reportingRestriction | Cyfyngiad adrodd |
| startTime | Amser dechrau |
| judiciary | Barnwriaeth |
| noHearings | Dim gwrandawiadau heddiw |
| linkToTop | Yn ôl i'r brig |

### Hearings table columns

| Column | EN | CY |
|--------|----|----|
| Start time | Start time | Amser dechrau |
| Case ref | Case ref | Cyfeirnod yr achos |
| Case name | Case name | Enw'r achos |
| Case type | Case type | Math o achos |
| Hearing type | Hearing type | Math o wrandawiad |
| Time estimate | Time estimate | Amcangyfrif o'r amser |
| Mode of hearing | Mode of hearing | Dull gwrandawiad |
| Reporting restriction | Reporting restriction | Cyfyngiad adrodd |

### Page
- Page accessible at `GET /cop-daily-cause-list?artefactId=`
- Displays venue name, address, content date, last updated timestamp
- Displays court rooms grouped in accordion sections
- Each accordion section shows judiciary name(s)
- Hearings table shows the 8 columns defined above
- Special category data warning displayed where applicable
- Open Justice collapsible section present
- Case search input present
- Data source attribution shown at bottom

### Validation and access control
- Returns 400 if `artefactId` is missing
- Returns 404 if artefact not found
- Returns 403 if user does not have access
- Returns 400 if JSON fails schema validation

### PDF generation
- PDF generated from `pdf-template.njk` matching the HTML view structure
- PDF saved to storage correctly
- PDF includes data source and Special Category Data warning where applicable

### Email summary

Confirmed from pip-data-management `CopDailyCauseListSummaryData.java`. The summary traverses `courtLists → courtHouse → courtRoom → session → sittings → hearing → case`, and for **each case** emits:

| Summary field | Source JSON field |
|---------------|-------------------|
| Case reference | `case.caseNumber` |
| Case details | `case.caseName` |
| Case type | `case.caseType` |
| Hearing type | `hearing.hearingType` |

Notes for the TS port:
- Each case is a flat key/value map of the four fields above; cases are aggregated into a list.
- The Java version wraps the list in a single map with a `null` key (no per-court grouping in the summary). Port this as an ungrouped list of case summaries.

### Welsh language
- All page content available in Welsh via `?lng=cy`
- PDF generated in correct language based on locale

### Registration
- Module registered in `apps/web/src/app.ts` (`pageRoutes` and `moduleRoot`)
- Route prefix added to `apps/web/vite.config.ts` (assets)
- `@hmcts/cop-daily-cause-list` path alias added to root `tsconfig.json`
- Package added as dependency in `apps/web/package.json`
- PDF generator registered by name (`COP_DAILY_CAUSE_LIST`) in `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`
- Excel converter registered by name via `registerConverterByName("COP_DAILY_CAUSE_LIST", ...)` if applicable

### Tests
- Unit tests pass for controller, renderer, validator, email summary and PDF generator
- `yarn test` passes across the workspace

## Technical Notes

- Schema source: `cop_daily_cause_list.json` from pip-data-management `src/main/resources/schemas/`
- Email summary source: `CopDailyCauseListSummaryData.java` from pip-data-management
- Locale reference: pip-frontend `src/main/resources/locales/{en,cy}/cop-daily-cause-list.json`
- Follow the `civil-and-family-daily-cause-list` module as the reference implementation
- COP lists may contain special category data — ensure the warning is displayed in both HTML and PDF output
- Always route/guard on `listTypeName` (`COP_DAILY_CAUSE_LIST`), never a numeric `listTypeId`

## Comments

### Comment by junaidiqbalmoj on 2026-07-21T16:39:39Z
@SPEC

### Comment by hmctsclaudecode on 2026-07-21T16:43:18Z
A full technical specification was auto-generated (see issue #591 comment). Key points incorporated into the plan below: reuse of `createListTypeHandler` / `createCauseListRender` from `list-type-handler.ts`, reuse of `renderCauseListData` from `@hmcts/daily-cause-list-common`, the `administrative-court-daily-cause-list` `pageRoutes` pattern (controller inside the lib), the 8-column hearings table, and the ungrouped email summary port. Open questions flagged: definitive column set / `hearingChannel` label, whether Open Justice contact details are static or dynamic, whether an Excel converter applies, and pip-frontend wording deltas.
