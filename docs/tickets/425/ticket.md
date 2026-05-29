# #425: Style Guide: Tribunal non-strategic publishing - UTCC, UTLC & UTAAC

**State:** open
**Assignees:** alexbottenberg
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-02-27T16:23:17Z
**Updated:** 2026-05-28T14:59:06Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the Upper Tribunal (Tax and Chancery Chamber), Upper Tribunal (Lands Chamber) and the Upper Tribunal (Administrative Appeals Chamber) to publish in CaTH, through the non-strategic publishing route.

**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for tribunal hearing lists to be published through the non-strategic publishing route
**SO THAT** the tribunal hearing lists can be published in CaTH

**ACCEPTANCE CRITERIA**
- Validation schemas are created for each hearing list from the tribunals listed above
- Error handling is put in place for the validation schema
- Valid publications are saved via the current method
- List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
- A new pdf template is created for the downloadable version of each tribunal hearing list
- All the tribunals adopt a unified email summary format similar to the existing email summary
- The fields to be published for the email summary for all the lists are the Date, Time and Case Reference Number
- A new style guide is created for each hearing list of the above-mentioned tribunals
- List manipulation is created for the style guide(s)
- The full list names shall be displayed as follows in the front-end summary of publications:
  - Upper Tribunal Tax and Chancery Chamber Daily Hearing list - date
  - Upper Tribunal (Lands Chamber) Daily Hearing list – date
  - Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list - date
  - In the upload form: UT (T and CC) Daily Hearing List, UT (LC) Daily Hearing List, UT (AAC) Daily Hearing List
- The 'Region' for UT (T and CC) Daily Hearing List and UT (LC) Daily Hearing List is 'National' while for UT (AAC) Daily Hearing List is 'London'
- Opening statement for Upper Tribunal (Tax and Chancery Chamber):
  > A representative of the media, or any other person, wishing to attend a remote hearing should contact uttc@justice.gov.uk and we will arrange for your attendance.
  > Observe a court or tribunal hearing as a journalist, researcher or member of the public
- Fields for UT (T and CC): Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue and Additional Information
- Opening statement for Upper Tribunal (Lands Chamber):
  > If a representative of the media or a member of the public wishes to attend a Cloud Video Platform (CVP) hearing they should contact the Lands Chamber listing section Lands@justice.gov.uk who will provide further information.
  > Observe a court or tribunal hearing as a journalist, researcher or member of the public
- Fields for UT (LC): Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Mode of Hearing and Additional Information
- Opening statement for Upper Tribunal (Administrative Appeals Chamber):
  > Details
  > Lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
  >
  > **England and Wales**
  > Remote hearings via CVP and BT Meet Me
  > [detailed paragraphs about public attendance via CVP, contact adminappeals@justice.gov.uk]
  >
  > **Scotland**
  > Remote hearings (CVP)
  > [detailed paragraph about Scotland CVP hearings, contact UTAACMailbox@justice.gov.uk]
- Fields for UT (AAC): Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue and Additional Information
- The link "Observe a court or tribunal hearing as a journalist, researcher or member of the public" should be masked to https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing wherever displayed

## Comments

### Comment by OgechiOkelu on 2026-02-27T16:25:54Z
@SPEC new-feature.md

### Comment by hmctsclaudecode[bot] on 2026-02-27T16:30:41Z
[Technical Specification generated - see latest @spec comment below for current version]

### Comment by OgechiOkelu on 2026-02-27T16:36:20Z
@plan

### Comment by hmctsclaudecode[bot] on 2026-02-27T16:45:14Z
## Technical Plan - Clarifications Needed

The technical plan has been created on branch `feature/425-ut-non-strategic-publishing` in `docs/tickets/425/`. Before implementation begins, the following questions need answers:

1. **Welsh translations** - Official Welsh translations are needed from the content team before the service can go live. Are translations available now, or should placeholders be used?
2. **"Observe a court..." link in UTAAC** - Should it appear in the UTAAC opening statement?
3. **`members` field** - required or optional in every row?
4. **`additionalInformation` field** - required or optional?
5. **Region stored on list type or per publication?**
6. **Short name display in upload form** - Should we add a `shortName` field to the interface?

### Comment by SarahLittlejohn on 2026-03-03T14:33:26Z
@analyse

### Comment by hmctsclaudecode[bot] on 2026-03-03T14:36:09Z
## Requirements Analysis: Issue #425

### Conflicts Detected

| Conflict Type | This Issue | Conflicts With | Resolution Needed |
|---|---|---|---|
| Parallel shared-file modification | Adds 3 new list type entries to `mock-list-types.ts` and `non-strategic-list-registry.ts` | #428 (SIAC, POAC, PAAC, FFT TC, FFT LRT & FFT RPT) — identical infrastructure touchpoints | Coordinate sequential IDs and merge order |
| Contradictory approach | Extends `mock-list-types.ts` | #342 (Refactor code to use List Information from database table) — requires deleting `mock-list-types.ts` | Determine whether #425 should target the database table directly |

**Impact Rating:** Medium — touches same shared registration and ID-allocation mechanism as parallel issue #428. Potential conflict with #342 if that advances first.

### Comment by OgechiOkelu on 2026-05-26T13:48:01Z
@spec

### Comment by hmctsclaudecode[bot] on 2026-05-26T13:54:21Z
[Full technical spec - see below for summary]

## Latest Technical Specification (from @spec on 2026-05-26)

### List Types

| ID (next free) | DB/converter name | Public-facing summary heading | Upload-form label | Region |
|---|---|---|---|---|
| 28 | `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | Upper Tribunal Tax and Chancery Chamber Daily Hearing list - {date} | UT (T and CC) Daily Hearing List | National |
| 29 | `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | Upper Tribunal (Lands Chamber) Daily Hearing list – {date} | UT (LC) Daily Hearing List | National |
| 30 | `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list - {date} | UT (AAC) Daily Hearing List | London |

**Note:** Confirm next free id against latest `list-type-data.ts` before merging.

### Module Layout (three sibling modules under `libs/list-types/`)

```
libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/
libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/
libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/
```

Each module structure:
```
src/
├── config.ts
├── index.ts
├── conversion/<name>-config.ts
├── models/types.ts
├── schemas/<name>.json
├── rendering/renderer.ts
├── pdf/pdf-generator.ts
├── pdf/pdf-template.njk
├── email-summary/summary-builder.ts
├── pages/index.ts
├── pages/<name>.njk
├── pages/en.ts
└── pages/cy.ts
```

### Integration Points

1. `libs/location/src/location-data.ts` – add sub-jurisdiction rows
2. `libs/location/src/list-type-data.ts` – append three entries
3. `libs/publication/src/processing/service.ts` – add to `PDF_GENERATOR_REGISTRY`
4. `libs/notifications/src/notification/notification-service.ts` – add to `EMAIL_BUILDER_REGISTRY`
5. `apps/web/src/app.ts` – import and register pageRoutes and assets
6. `libs/list-search-config/src/repository/queries.ts` – add ListSearchConfig rows

### URL Paths

- `/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`
- `/upper-tribunal-lands-chamber-daily-hearing-list`
- `/upper-tribunal-administrative-appeals-chamber-daily-hearing-list`

### Table Columns

- UT (T&CC): Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Additional Information
- UT (LC): Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Mode of Hearing, Additional Information
- UT (AAC): Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue, Additional Information

### Validation

- `additionalInformation` is **optional** in all three schemas
- `members` is **required** in all three schemas
- `modeOfHearing` is **required** for UT (LC) and UT (AAC)
- Time format: 12-hour clock assumed (confirm with business if 24-hour needed)
- All text fields: no HTML tags
- Minimum one row per workbook

### Email Summary

All three share the unified non-strategic email template. Per hearing: **Date, Time, Case Reference Number**.

### Open Questions

1. **Time format:** 12-hour clock assumed — confirm with business if 24-hour clock.
2. **Region "National":** check if a "National" region row exists in `locationData.regions`; if not, add it.
3. **Sub-jurisdictions:** confirm three separate sub-jurisdictions vs single "Upper Tribunal" sub-jurisdiction.
4. **Date semantics:** email summary `Date` derived from `artefact.contentDate` — confirm acceptable.
5. **Mode of Hearing values:** free text assumed.
6. **PDF page orientation for UT (AAC):** 9 columns — may need landscape.
7. **Welsh translations:** use `[TRANSLATE: "..."]` markers pending content team delivery.
