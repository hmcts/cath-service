# #792: Style Guide: Mental Health Tribunal

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-07-01T12:43:38Z
**Updated:** 2026-07-01T17:44:34Z

## Description

PROBLEM STATEMENT
This ticket is raised for the creation of Mental Health Tribunal for manual publishing in CaTH.

AS A Service
I WANT to create the supporting information for the Mental Health Tribunal list
SO THAT this hearing list can be manually published in CaTH

ACCEPTANCE CRITERIA
• The Mental Health Tribunal Daily Hearing List is created in the front end and linked to the 'Tribunal' Jurisdiction and 'National' Region. The same name is displayed on the manual upload form.
• The Mental Health Tribunal rarely publishes a hearing list and so the following message should be displayed in the summary of publications page to inform users that the hearing list is not routinely published;
'Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published.'
- Because its a manually uploaded hearing list, there is no validation schema or style guide.

## Comments

### Comment by OgechiOkelu on 2026-07-01T17:39:12Z
@spec

### Comment by hmctsclaudecode on 2026-07-01T17:44:16Z
# Technical Specification: Style Guide — Mental Health Tribunal Daily Hearing List

_GitHub Issue #792_

## 1. User Story
**As a** Service (CaTH — Court and Tribunal Hearings)
**I want to** create the supporting configuration and content for the Mental Health Tribunal Daily Hearing List
**So that** this hearing list can be manually published in CaTH and citizens are correctly informed that it is not routinely published.

## 2. Background

The Mental Health Tribunal needs a new hearing list type so that its Daily Hearing List can be manually published in CaTH. The list is linked to the **Tribunal** jurisdiction and the **National** region.

Because Mental Health hearings are held in private, the list is **rarely published**. When a citizen views the summary of publications for the relevant location, a caution message must explain that a list will normally not be available.

Critically, this list has **no JSON validation schema and no style guide**. In CaTH terms this makes it a **non-strategic** list type (`isNonStrategic: true`), which is uploaded through the **non-strategic upload** journey rather than the strategic manual-upload journey. The uploaded artefact is displayed as a flat file (the file the admin uploads) — there is no bespoke rendered template.

Relevant existing code and patterns:

| Concern | Location |
|---|---|
| List type seed data | `libs/location/src/list-type-data.ts` |
| `ListType` DB model | `libs/postgres-prisma/prisma/schema/location.prisma` |
| Jurisdiction / sub-jurisdiction / region seed data | `libs/location/src/location-data.ts` |
| Non-strategic upload page (dropdown source) | `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` |
| Non-strategic dropdown query | `findNonStrategicListTypes()` in `libs/system-admin-pages/src/list-type/queries.ts` |
| Summary of publications page | `apps/web/src/pages/(public)/summary-of-publications/index.ts` + `index.njk` |
| Location metadata (caution message) model | `LocationMetadata` in `libs/postgres-prisma/prisma/schema/location.prisma` |
| Location metadata admin page | `apps/web/src/pages/(system-admin)/location-metadata-manage/` |

Pre-existing reference data that does **not** need to be created:
- **Tribunal** jurisdiction — `jurisdictionId: 4` (`location-data.ts`).
- **Mental Health Tribunal** sub-jurisdiction — `subJurisdictionId: 20`, `jurisdictionId: 4` (`location-data.ts`).
- **National** region — `regionId: 8` (`location-data.ts`).

### Comment by OgechiOkelu on 2026-07-01T17:44:34Z
@plan
