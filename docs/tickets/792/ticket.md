# #792: Style Guide: Mental Health Tribunal Daily Hearing List

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T12:43:38Z
**Updated:** 2026-07-20T12:54:47Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the Mental Health Tribunal Daily Hearing List for manual publishing in CaTH.


**AS A** Service
**I WANT** to create the supporting information for the Mental Health Tribunal Daily Hearing List
**SO THAT** this hearing list can be manually published in CaTH


**LIST DETAILS** (source: [pip-frontend `listLookup.json`](https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/listLookup.json))

| Field | Value |
|---|---|
| List type key | `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` |
| Friendly name | Mental Health Tribunal Daily Hearing List |
| Welsh friendly name | Rhestr Wrandawiadau Dyddiol y Tribiwnlys Iechyd Meddwl |
| Shortened friendly name (manual upload form) | Mental Health Tribunal Daily Hearing List |
| Jurisdiction | Tribunal (jurisdiction type: Mental Health Tribunal) |
| Region | National |
| Non-strategic | `false` |
| Default sensitivity | Public (`defaultSensitivity` is empty in the lookup → defaults to Public) |
| Restricted provenances | None |
| URL | None |


**UPLOAD TYPE**

- This is a **flat file upload** list type (e.g. PDF / manually prepared document), not a structured JSON publication.
- There is **no JSON schema validation** for this list type. Files are published as-is via the manual upload form.
- Consequently there is no style guide or validation schema to produce for this list.


**ACCEPTANCE CRITERIA**

- The Mental Health Tribunal Daily Hearing List is created in the front end and linked to the **Tribunal** jurisdiction and **National** region. In the manual upload form, the list name is displayed as **Mental Health Tribunal Daily Hearing List**.

- The list is **strategic** (`isNonStrategic` = `false`).

- The default sensitivity of the list is **Public**.

- The list is uploaded as a **flat file** — there is **no JSON schema validation** and no style guide for this list type.

- The Mental Health Tribunal rarely publishes a hearing list, so the following message should be displayed in the summary of publications page to inform users that the hearing list is not routinely published:

  > Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published.

## Comments

### Comment by junaidiqbalmoj on 2026-07-20T12:54:47Z
@SPEC
