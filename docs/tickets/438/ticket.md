# #438: CaTH – Lists for Manual Publishing

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-03-12T16:58:40Z
**Updated:** 2026-03-17T13:32:28Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of lists for manual publishing in CaTH.

**AS A** Service
**I WANT** to create the supporting information for Lists that are to be manual published in CaTH
**SO THAT** these hearing lists can be manually published in CaTH

**ACCEPTANCE CRITERIA**
- The Possession Daily Cause List is created in the front end and linked to the Civil Jurisdiction. In the manual upload form, the list name is displayed as PCOL Daily Cause list.
- The Mental Health Tribunal Daily Hearing List is created in the front end and linked to the 'Tribunal' Jurisdiction and 'National' Region. The same name is displayed on the manual upload form.
- The Mental Health Tribunal rarely publishes a hearing list and so the following message should be displayed in the summary of publications page to inform users that the hearing list is not routinely published:
  'Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published.'
- Immigration and Asylum Chamber publishes 2 lists manually in CaTH; the Immigration and Asylum Chamber Daily List and the Immigration and Asylum Chamber Daily List – Additional Cases. These lists are created in the front end.
- The Immigration and Asylum Chamber Daily List will always appear first where both list types are published under the same venue, regardless of the order in which both lists are published.

## Comments

### Comment by OgechiOkelu on 2026-03-17T12:38:33Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-03-17T12:42:39Z

## 1. User Story

**As a** Service
**I want to** create the supporting configuration for Possession, Mental Health Tribunal, and Immigration and Asylum Chamber hearing lists in CaTH
**So that** these hearing lists can be manually published via the non-strategic upload form

---

## 2. Background

CaTH currently supports 23 list types across strategic (automated) and non-strategic (manual upload) publication flows. The non-strategic upload form (`/non-strategic-upload`) renders list types where `isNonStrategic: true` from `libs/list-types/common/src/mock-list-types.ts`.

This ticket adds four new non-strategic list types:

| List Name (display) | Internal name | Jurisdiction | Region |
|---|---|---|---|
| PCOL Daily Cause List | `POSSESSION_DAILY_CAUSE_LIST` | Civil | (venue-specific) |
| Mental Health Tribunal Daily Hearing List | `MENTAL_HEALTH_TRIBUNAL_DAILY_HEARING_LIST` | Tribunal | National |
| Immigration and Asylum Chamber Daily List | `IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST` | Tribunal | (venue-specific) |
| Immigration and Asylum Chamber Daily List – Additional Cases | `IMMIGRATION_AND_ASYLUM_CHAMBER_DAILY_LIST_ADDITIONAL_CASES` | Tribunal | (venue-specific) |

The Mental Health Tribunal requires a `noListMessage` on the summary of publications page because hearings are typically held in private. The Immigration and Asylum Chamber Daily List must always be sorted before its "Additional Cases" variant on the summary page.

---

## 3. Acceptance Criteria (BDD)

- **PCOL Daily Cause List** appears in the non-strategic upload form dropdown
- `POSSESSION_DAILY_CAUSE_LIST` has `jurisdictionId: 1` (Civil) and `isNonStrategic: true`
- **Mental Health Tribunal Daily Hearing List** appears in the upload form dropdown
- `MENTAL_HEALTH_TRIBUNAL_DAILY_HEARING_LIST` has `jurisdictionId: 4` (Tribunal) and links to National region
- Mental Health Tribunal `noListMessage` is displayed on summary of publications for MHT venues
- Both IAC list types appear in the upload form dropdown
- IAC Daily List appears before IAC Daily List – Additional Cases on the summary page (any publication order)

---

## 4. Technical Context from Spec

- New list types go in `libs/list-types/common/src/mock-list-types.ts` (IDs 24–27)
- A new "National" region (regionId: 7) must be added to seed data
- `noListMessage` is stored in `location_metadata` per-location (English + Welsh)
- IAC sort order is naturally satisfied by alphabetical sort (no code change required — verify only)
- No new page routes introduced

**Affected pages:**
- `/non-strategic-upload` — list type dropdown gains 4 new options
- `/summary-of-publications?locationId=<id>` — MHT venues show `noListMessage`

---

## 5. Welsh Translations Required

- `PCOL Daily Cause List` — Welsh translation needed
- `Immigration and Asylum Chamber Daily List – Additional Cases` — Welsh translation needed
- MHT `noListMessage` Welsh: "Cynhelir gwrandawiadau iechyd meddwl yn breifat ac oni bai bod y claf wedi gwneud cais am wrandawiad cyhoeddus ni chaiff rhestr gwrandawiadau ei chyhoeddi."

---

## 6. Open Questions (from Spec)

1. Should `ListType` interface be extended with `jurisdictionId?` field?
2. Does "created in the front end" mean hardcoded in source (current pattern) or managed via admin UI?
3. Should new list types appear in `/manual-upload` (strategic) as well as `/non-strategic-upload`?
4. Should IAC list types also be associated with sub-jurisdiction (subJurisdictionId: 6)?
5. Welsh translations for PCOL Daily Cause List and IAC Daily List – Additional Cases?

### Comment by OgechiOkelu on 2026-03-17T13:32:28Z
@plan
