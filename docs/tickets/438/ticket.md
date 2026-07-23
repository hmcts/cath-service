# #438: Style Guide: PCOL Daily List

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-03-12T16:58:40Z
**Updated:** 2026-07-16T10:39:17Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the Possession Claim Online (PCOL) Daily Cause List for manual publishing in CaTH.


**AS A** Service
**I WANT** to create the supporting information for the PCOL Daily Cause List
**SO THAT** this hearing list can be manually published in CaTH


**LIST DETAILS** (source: [pip-frontend `listLookup.json`](https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/listLookup.json))

| Field | Value |
|---|---|
| List type key | `PCOL_DAILY_CAUSE_LIST` |
| Friendly name | Possession Claim Online Daily Cause List |
| Welsh friendly name | Rhestr Achosion Dyddiol Hawliadau Meddiant Ar-lein |
| Shortened friendly name (manual upload form) | PCOL Daily Cause List |
| Jurisdiction | Civil Court |
| Non-strategic | `false` |
| Default sensitivity | Public (`defaultSensitivity` is empty in the lookup → defaults to Public) |
| Restricted provenances | None |
| URL | None |


**UPLOAD TYPE**

- This is a **flat file upload** list type (e.g. PDF / manually prepared document), not a structured JSON publication.
- There is **no JSON schema validation** for this list type. Files are published as-is via the manual upload form.
- Consequently there is no style guide or validation schema to produce for this list.


**ACCEPTANCE CRITERIA**

- The PCOL Daily Cause List is created in the front end and linked to the Civil jurisdiction. In the manual upload form, the list name is displayed as **PCOL Daily Cause List**.

- The list is **strategic** (`isNonStrategic` = `false`).

- The default sensitivity of the list is **Public**.

- The list is uploaded as a **flat file** — there is **no JSON schema validation** and no style guide for this list type.


## Comments

### Comment by junaidiqbalmoj on 2026-07-16T10:39:17Z
@SPEC

