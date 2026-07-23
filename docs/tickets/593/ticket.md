# #593: Implement Employment Tribunal Lists style guide

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-05-13T08:51:59Z
**Updated:** 2026-07-16T11:31:26Z

## Description

## User Story

As a user, I want to view Employment Tribunal Lists in an accessible and well-formatted style, so that I can see scheduled hearings with all relevant case details.

## Background

Two Employment Tribunal list types are implemented together:
- `et-daily-list` (`ET_DAILY_LIST`)
- `et-fortnightly-list` (`ET_FORTNIGHTLY_PRESS_LIST`)

Each has its own separate JSON schema. They follow the same module pattern as the existing `civil-and-family-daily-cause-list` implementation.

> **Sources of truth** (verified against upstream):
> - List type metadata: [`listLookup.json`](https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/listLookup.json)
> - Style guide / language: [`locales/en/et-daily-list.json`](https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/en/et-daily-list.json), [`locales/en/et-fortnightly-list.json`](https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/en/et-fortnightly-list.json) (and `cy/` equivalents)
> - Schemas: [`et_daily_list.json`](https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/et_daily_list.json), [`et_fortnightly_press_list.json`](https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/et_fortnightly_press_list.json)

## List type metadata (from `listLookup.json`)

| Key | `ET_DAILY_LIST` | `ET_FORTNIGHTLY_PRESS_LIST` |
|-----|-----------------|-----------------------------|
| `friendlyName` (EN) | Employment Tribunals Daily List | Employment Tribunals Fortnightly Press List |
| `welshFriendlyName` (CY) | Rhestr Ddyddiol y Tribiwnlysoedd Cyflogaeth | Rhestr y Wasg Pob Pythefnos y Tribiwnlysoedd Cyflogaeth |
| `shortenedFriendlyName` | ET Daily List | ET Fortnightly List |
| `url` | `et-daily-list` | `et-fortnightly-list` |
| `jurisdictionTypes` | Employment Tribunal | Employment Tribunal |

> ⚠️ The friendly names use the **plural** "Employment **Tribunals**" and the fortnightly name includes "**Press**". Use these `listLookup.json` values for the venue/title display — they are the source of truth. An earlier draft of this ticket used singular "Tribunal" and dropped "Press"; those were incorrect.

## Acceptance Criteria

**Venue / list name displayed in the front end:**
- Employment Tribunals Daily List
- Employment Tribunals Fortnightly Press List

**Data fields for both lists:**
Start time, Duration, Case number, Claimant, Respondent, Hearing Type, and Hearing Platform

> Note on data provenance — these display fields do **not** map 1:1 to schema fields:
> - **Start time** ← `courtLists[].courtHouse.courtRoom[].session[].sittings[].sittingStart`
> - **Duration** ← derived from `sittingStart` → `sittingEnd`
> - **Case number** ← `...hearing[].case[].caseNumber`
> - **Claimant / Respondent** ← `...case[].party[]`, split by `partyRole` (see schema `enum` differences below)
> - **Hearing Type** ← `...hearing[].hearingType`
> - **Hearing Platform** ← `...sittings[].channel[]` (the `channel` string array)

**Open Justice — full text for the 'Important information' accordion** (from locale, keys `openJustice1`–`openJustice6`):

1. Open justice is a fundamental principle in our courts and tribunals system, and will continue to be as we increase the use of audio and video technology.
2. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
3. The inclusion of a case in the Press List is no guarantee that it is not subject to a restricted reporting order. Members of the Press should ensure that no order exists on an individual case before submitting material for publication.
4. Requests from the media and members of the public to observe a hearing remotely should be made in advance to: _(venue contact — from `venue.venueContact`)_
5. The naming convention in the subject heading of an email request should read:
6. "MEDIA OR PUBLIC ACCESS REQUEST - AN Other v AN Other - Hearing Date."

## Schema notes (`et_daily_list.json` vs `et_fortnightly_press_list.json`)

Both schemas are `type: object`, `required: ["document", "venue", "courtLists"]`, and are **structurally near-identical**. Key structure:

```
document.publicationDate                         (required, ISO datetime)
venue.venueName                                  (required)
venue.venueContact.{venueTelephone, venueEmail}
courtLists[].courtHouse                          (required)
  courtHouseName                                 (required)
  courtHouseAddress.{line[], town, county, postCode}
  courtRoom[].session[].sittings[]               (session, sittings required)
    sittingStart, sittingEnd                     (required)
    hearing[]                                     (required)
      hearingType                                (required)
      case[].caseNumber                          (required)
      case[].caseSequenceIndicator
      case[].party[].partyRole                   (required)
      case[].party[].individualDetails.{title, individualForenames, individualSurname}
      case[].party[].organisationDetails.organisationName
    channel[]                                     (string array — hearing platform)
```

**The only meaningful difference between the two schemas** is the `party[].partyRole` enum:
- `et_daily_list.json`: `["APPLICANT_PETITIONER", "RESPONDENT"]`
- `et_fortnightly_press_list.json`: `["APPLICANT_PETITIONER", "APPLICANT_PETITIONER_REPRESENTATIVE", "RESPONDENT", "RESPONDENT_REPRESENTATIVE"]` (adds representative roles)

The fortnightly list therefore also renders representative parties — see the `rep` / `noRep` locale keys below. Copy both schema files verbatim from pip-data-management; do not share a single schema.

## Module structure
- [ ] Two new libs created:
  - `libs/list-types/et-daily-list/`
  - `libs/list-types/et-fortnightly-list/`
- [ ] Each lib contains:
  - `src/models/types.ts` — TypeScript interfaces matching the respective JSON schema
  - `src/validation/json-validator.ts` — validates against the respective schema (+ `json-validator.test.ts`, per CLAUDE.md list-type rules)
  - `src/schemas/{list-type}.json` — copied from pip-data-management (`et_daily_list.json`, `et_fortnightly_press_list.json`)
  - `src/rendering/renderer.ts` and `renderer.test.ts`
  - `src/pages/index.ts`, `index.test.ts`, `en.ts`, `cy.ts`, `{list-type}.njk`
  - `src/pdf/pdf-generator.ts`, `pdf-template.njk`, `pdf-generator.test.ts`
  - `src/index.ts`, `src/config.ts`, `package.json`, `tsconfig.json`

## Page content (EN) — from `locales/en/et-daily-list.json` / `et-fortnightly-list.json`

Both ET lists share the same locale keys. Values below are taken verbatim from pip-frontend.

| Key | English |
|-----|---------|
| `title` (et-daily-list) | Employment Tribunals Daily List |
| `title` (et-fortnightly-list) | Employment Tribunals Fortnightly Press List |
| `listFor` | List for |
| `listUpdated` | Last updated DATE at |
| `importantInformation` | Important information |
| `venue` | Venue: |
| `courtRoom` | Courtroom |
| `backButton` | Back |
| `dataSource` | Data Source |
| `hearingDurationHour` / `hearingDurationHours` | hour / hours |
| `hearingDurationMinute` / `hearingDurationMinutes` | min / mins |
| `rep` (fortnightly only) | Rep |
| `noRep` (fortnightly only) | No Representative |

> Note: the upstream `locales/en/et-fortnightly-list.json` `title` value reads "Employment Tribunals Fortnightly **List**" (missing "Press"), which conflicts with the `listLookup.json` friendly name. Use the `listLookup.json` value ("Employment Tribunals Fortnightly Press List") for the page title.

## Page content (CY) — from `locales/cy/et-daily-list.json` / `et-fortnightly-list.json`

| Key | Welsh |
|-----|-------|
| `title` (et-daily-list) | Rhestr Ddyddiol y Tribiwnlysoedd Cyflogaeth |
| `title` (et-fortnightly-list) | Rhestr y Wasg Pob Pythefnos y Tribiwnlysoedd Cyflogaeth |
| `listFor` | Rhestr ar gyfer |
| `listUpdated` | Diweddarwyd ddiwethaf DATE am |
| `importantInformation` | Gwybodaeth bwysig |
| `venue` | Lleoliad: |
| `courtRoom` | Ystafell llys |
| `backButton` | Yn ôl |
| `dataSource` | Ffynhonnell y Data |
| `hearingDurationHour` / `hearingDurationHours` | awr / awr |
| `hearingDurationMinute` / `hearingDurationMinutes` | munud / munud |
| `rep` (fortnightly only) | Cynrychiolydd |
| `noRep` (fortnightly only) | Dim Cynrychiolydd |

> ⚠️ The upstream `locales/cy/et-fortnightly-list.json` `title` is a copy-paste bug — it reads "Tribiwnlysoedd Cyflogaeth Rhestr Ddyddiol" (Daily). Use the `welshFriendlyName` from `listLookup.json` instead (shown above). Also note the CY Open Justice text differs slightly in whitespace from EN — copy it verbatim from the CY locale file.

## Hearings table columns

Both ET lists use the same `tableHeaders` array from locale:

| # | EN (from locale) | CY (from locale) |
|---|------------------|------------------|
| 1 | Start Time | Amser Cychwyn |
| 2 | Duration | Hyd |
| 3 | Case Number | Cyfeirnod yr Achos |
| 4 | Claimant | Hawlydd |
| 5 | Respondent | Atebydd |
| 6 | Hearing Type | Math o wrandawiad |
| 7 | Hearing Platform | Sianel y Gwrandawiad |

> ⚠️ Column 7 Welsh in the upstream locale is "**Sianel y Gwrandawiad**" (Hearing *Channel*), not "Platfform Gwrandawiad". Match the locale file. The `channel[]` schema field backs this column.

## Pages
- [ ] Pages accessible at:
  - `GET /et-daily-list?artefactId=`
  - `GET /et-fortnightly-list?artefactId=`
- [ ] Each displays venue name, address, content date, last updated timestamp
- [ ] Hearings table shows the 7 columns defined above
- [ ] Open Justice collapsible section present (full `openJustice1`–`openJustice6` text)
- [ ] Case search input present
- [ ] Data source attribution shown at bottom

## Validation and access control
- [ ] Returns 400 if `artefactId` is missing
- [ ] Returns 404 if artefact not found
- [ ] Returns 403 if user does not have access
- [ ] Returns 400 if JSON fails schema validation

## PDF generation
- [ ] PDF generated for each list type matching the HTML view structure
- [ ] PDF saved to storage correctly

## Welsh language
- [ ] All page content available in Welsh via `?lng=cy`
- [ ] PDF generated in correct language based on locale

## Registration
- [ ] Both modules registered in `apps/web/src/app.ts`
- [ ] Path aliases added to root `tsconfig.json`
- [ ] Packages added as dependencies in `apps/web/package.json`
- [ ] PDF generators registered by `listTypeName` in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`)
- [ ] Excel/JSON converters registered by name (`registerConverterByName`)

## Tests
- [ ] Unit tests pass for both modules (including `json-validator.test.ts` with one `it` per required field at every nesting level)
- [ ] `yarn test` passes across the workspace

## TODO

- [ ] Add email summary (`src/email-summary/summary-builder.ts`) for each list once email summary requirements are confirmed

## Technical Notes

- Schema sources: `et_daily_list.json`, `et_fortnightly_press_list.json` from pip-data-management `src/main/resources/schemas/`
- Follow the `civil-and-family-daily-cause-list` module as the reference implementation
- **Never use numeric `listTypeId`** — route/guard on `listTypeName` (`ET_DAILY_LIST`, `ET_FORTNIGHTLY_PRESS_LIST`) per CLAUDE.md list-type rules


## Comments

No comments on this issue.
