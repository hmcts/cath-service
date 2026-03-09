# #431: Tribunal non-Strategic publishing - SSCS Hearing Lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-03-09T15:04:40Z
**Updated:** 2026-03-09T16:06:24Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the SSCS tribunals to publish in CaTH through the non-strategic publishing route.

**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for the SSCS tribunal hearing lists
**SO THAT** the SSCS tribunal hearing lists can be published in CaTH through the non-strategic publishing route

**ACCEPTANCE CRITERIA**
- Validation schemas are created for each hearing list from the tribunals listed above
- Error handling is put in place for the validation schema
- Valid publications are saved via the current method
- List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
- A new pdf template is created for the downloadable version of each tribunal hearing list
- All the tribunals adopt a unified email summary format similar to the existing email summary
- The fields to be published within the email summary for all the lists are Hearing time, Hearing Type and Appeal Reference Number
- A new style guide is created for each hearing list of the SSCS tribunals
- List manipulation is created for the style guide(s)
- The SSCS hearing lists are linked to the 'Tribunal' jurisdiction
- Midlands Social Security and Child Support Tribunal is created and linked to the 'Midlands' region
- South East Social Security and Child Support Tribunal is created and linked to the 'South East' region
- Wales and South West Social Security and Child Support Tribunal is created and linked to the 'Wales' and 'South West' region
- Scotland Social Security and Child Support Tribunal is created and linked to the 'Scotland' region
- North East Social Security and Child Support Tribunal is created and linked to the 'North East' region
- North West Social Security and Child Support Tribunal is created and linked to the 'North West' region
- London Social Security and Child Support Tribunal is created and linked to the 'London' region
- Liverpool Social Security and Child Support Tribunal is created and linked to the 'North West' region
- The hearing lists for the SSCS tribunals will be published daily
- The full list names shall be displayed in the front-end summary of publications as specified
- On the Excel file upload form, lists displayed as short names (e.g. "SSCS Midlands Daily Hearing List")

**Display fields within all SSCS Hearing lists:** Venue, Appeal Reference Number, Hearing Type, Appellant, Courtroom, Hearing Time, Tribunal, FTA/Respondent and Additional Information

**Per-tribunal contact emails for the important information accordion:**
- London: sscsa-sutton@justice.gov.uk
- Midlands: ascbirmingham@justice.gov.uk
- North East: sscsa-leeds@Justice.gov.uk
- North West: sscsa-liverpool@justice.gov.uk
- Scotland: sscsa-glasgow@justice.gov.uk
- South East: sscs_bradford@justice.gov.uk
- Wales and South West: sscsa-cardiff@justice.gov.uk
- Liverpool: sscsa-liverpool@justice.gov.uk (same as North West)

## Comments

### Comment by OgechiOkelu on 2026-03-09T15:39:47Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-03-09T15:44:40Z

## 1. User Story

**As a** Service
**I want to** create the validation schema, style guide, PDF and email summary for the SSCS tribunal hearing lists
**So that** the SSCS tribunal hearing lists can be published in CaTH through the non-strategic publishing route

## 2. Background

This ticket covers the addition of 8 Social Security and Child Support (SSCS) Tribunal Daily Hearing Lists to the non-strategic publishing route in CaTH. Each tribunal corresponds to a distinct geographical region and requires its own list type, location entry, validation schema, style guide (Nunjucks template), PDF template, and email summary.

The implementation follows the established non-strategic list type pattern, as seen in `libs/list-types/care-standards-tribunal-weekly-hearing-list/`. Each of the 8 SSCS tribunals will be a separate list type module within `libs/list-types/`.

The SSCS sub-jurisdiction (`Social Security and Child Support`, `subJurisdictionId: 8`) already exists in `libs/location/src/location-data.ts` and is linked to the `Tribunal` jurisdiction (`jurisdictionId: 4`).

## 6. Page Specifications

### New List Type Modules (8 total)

| Module name | List type name (enum) | Short name (upload form) | Full name (front end) | List type ID |
|---|---|---|---|---|
| `sscs-midlands-daily-hearing-list` | `SSCS_MIDLANDS_DAILY_HEARING_LIST` | SSCS Midlands Daily Hearing List | Midlands Social Security and Child Support Tribunal Daily Hearing List | 24 |
| `sscs-south-east-daily-hearing-list` | `SSCS_SOUTH_EAST_DAILY_HEARING_LIST` | SSCS South East Daily Hearing List | South East Social Security and Child Support Tribunal Daily Hearing List | 25 |
| `sscs-wales-south-west-daily-hearing-list` | `SSCS_WALES_SOUTH_WEST_DAILY_HEARING_LIST` | SSCS Wales and South West Daily Hearing List | Wales and South West Social Security and Child Support Tribunal Daily Hearing List | 26 |
| `sscs-scotland-daily-hearing-list` | `SSCS_SCOTLAND_DAILY_HEARING_LIST` | SSCS Scotland Daily Hearing List | Scotland Social Security and Child Support Tribunal Daily Hearing List | 27 |
| `sscs-north-east-daily-hearing-list` | `SSCS_NORTH_EAST_DAILY_HEARING_LIST` | SSCS North East Daily Hearing List | North East Social Security and Child Support Tribunal Daily Hearing List | 28 |
| `sscs-north-west-daily-hearing-list` | `SSCS_NORTH_WEST_DAILY_HEARING_LIST` | SSCS North West Daily Hearing List | North West Social Security and Child Support Tribunal Daily Hearing List | 29 |
| `sscs-london-daily-hearing-list` | `SSCS_LONDON_DAILY_HEARING_LIST` | SSCS London Daily Hearing List | London Social Security and Child Support Tribunal Daily Hearing List | 30 |
| `sscs-liverpool-daily-hearing-list` | `SSCS_LIVERPOOL_DAILY_HEARING_LIST` | SSCS Liverpool Daily Hearing List | Liverpool Social Security and Child Support Tribunal Daily Hearing List | 31 |

### Location Data Changes

New regions: Scotland (7), North East (8), North West (9), South West (10)
New locations: 8 SSCS tribunals (locationId 11–18), all linked to subJurisdictionId 8

## 9. Validation

JSON schema for all 8 list types shares identical structure with 9 required fields:
hearingTime, appealReferenceNumber, hearingType, appellant, courtroom, venue, tribunal, ftaRespondent, additionalInformation

All fields have HTML injection prevention pattern: `^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$`

## 14. Assumptions & Open Questions

- List type IDs 24–31 assumed to be next available (highest current: 23)
- New region IDs 7–10 assumed to be next available after existing 6 regions
- Liverpool contact email: assumed same as North West (sscsa-liverpool@justice.gov.uk) — confirm
- Access level: assumed Public unless specified otherwise
- Welsh translations for opening statements: confirm if official translations available
- Shared renderer approach recommended — confirm whether in @hmcts/list-types-common or new @hmcts/sscs-common
- South West region: confirm it needs creating (currently absent from location-data.ts)
- Scotland region: confirm it needs creating
- tribunal field: confirm if free-text or fixed per list type
- additionalInformation: confirm if required or optional
- Publication frequency: confirm if technically enforced or publishing convention only

### Comment by OgechiOkelu on 2026-03-09T16:06:24Z
@plan
