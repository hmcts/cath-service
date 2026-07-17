# #645: Style Guide: Implement PHT Weekly Hearing List

**State:** OPEN
**Assignees:** KianKwa
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-05-19T15:07:35Z
**Updated:** 2026-07-13T07:50:18Z

## Description

## User Story

As a user, I want to view Primary Health Tribunal Weekly Hearing List in an accessible and well-formatted style, so that I can see scheduled hearings with all relevant case details.

## Background

One weekly hearing list type is implemented:
- `pht-weekly-hearing-list` — `PHT_WEEKLY_HEARING_LIST` (Primary Health Tribunal)

This is a non-strategic list type with its own separate JSON schema. It follows the same module pattern as the existing weekly hearing list implementations (e.g. `ftt-tax-weekly-hearing-list` in #612).

## Acceptance Criteria

**Data fields for PHT Weekly Hearing List:**
Date, Case Name, Hearing Length, Hearing Type, Venue and Additional Information

**List title:**
Primary Health Tribunal Weekly Hearing List - [date]

**Wording in first section:**
Please contact the Primary Health Lists at primaryhealthlists@justice.gov.uk for details of how to access video hearings.
Link https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing is to be embedded in the text 'Observe a court or tribunal hearing as a journalist, researcher or member of the public.'

**Columns:**
Date | Case Name | Hearing length | Hearing type | Venue | Additional information

### Module structure
- [ ] New lib created: `libs/list-types/pht-weekly-hearing-list/`
- [ ] Lib contains:
  - `src/validation/json-validator.ts`, `src/schemas/pht-weekly-hearing-list.json`
  - `src/rendering/renderer.ts`, `renderer.test.ts`
  - `src/pages/index.ts`, `index.test.ts`, `en.ts`, `cy.ts`, `pht-weekly-hearing-list.njk`
  - `src/pdf/pdf-generator.ts`, `pdf-template.njk`, `pdf-generator.test.ts`
  - `src/index.ts`, `src/config.ts`, `package.json`, `tsconfig.json`

### List type data registration
- [ ] List type key added to `libs/location/src/list-type-data.ts` with correct `urlPath`, `provenance`, `isNonStrategic: true`, and `defaultSensitivity`

### Page titles

| List | EN title | CY title |
|------|----------|----------|
| pht-weekly-hearing-list | Primary Health Tribunal Weekly Hearing List | Rhestr Wrandawiadau Wythnosol y Tribiwnlys Iechyd Sylfaenol |

### Pages
- [ ] Page accessible at `GET /pht-weekly-hearing-list?artefactId=<id>`
- [ ] Displays venue name, address, content date, last updated timestamp
- [ ] Hearings table displays relevant columns per schema
- [ ] Open Justice collapsible section present
- [ ] Data source attribution shown at bottom

### Validation and access control
- [ ] Returns 400 if `artefactId` is missing
- [ ] Returns 404 if artefact not found
- [ ] Returns 403 if user does not have access
- [ ] Returns 400 if JSON fails schema validation

### PDF generation
- [ ] PDF generated matching the HTML view structure
- [ ] PDF saved to storage correctly

### Welsh language
- [ ] All page content available in Welsh via `?lng=cy`
- [ ] PDF generated in correct language based on locale

### Registration
- [ ] Module registered in `apps/web/src/app.ts`
- [ ] Path alias added to root `tsconfig.json`
- [ ] Package added as dependency in `apps/web/package.json`

### Tests
- [ ] Unit tests pass
- [ ] `yarn test` passes across the workspace

## TODO

- [ ] Add email summary (`src/email-summary/summary-builder.ts`) once email summary requirements are confirmed

## Technical Notes

- Schema sources from pip-data-management `src/main/resources/schemas/non-strategic/`
- Follow the `ftt-tax-weekly-hearing-list` module as the reference implementation

## Comments

No comments on this issue.
