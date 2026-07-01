# #438: Style Guide: PCOL Daily List

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-03-12T16:58:40Z
**Updated:** 2026-07-01T17:28:33Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the Possession Daily Cause List for manual publishing in CaTH.


**AS A** Service
**I WANT** to create the supporting information for the Possession Daily Cause List
**SO THAT** this hearing list can be manually published in CaTH


**ACCEPTANCE CRITERIA**

- The Possession Daily Cause List is created in the front end and linked to the Civil Jurisdiction. In the manual upload form, the list name is displayed as PCOL Daily Cause list.

- Because its a manually uploaded hearing list, there is no validation schema or style guide.

## Comments

### Comment by OgechiOkelu on 2026-03-17T12:38:33Z
@SPEC new-feature.md

### Comment by OgechiOkelu on 2026-03-17T13:32:28Z
@plan

### Comment by OgechiOkelu on 2026-07-01T17:17:43Z
@spec

### Comment by hmctsclaudecode on 2026-07-01T17:21:51Z
# Technical Specification: Style Guide — PCOL Daily Cause List

_Issue #438 — Possession (PCOL) Daily Cause List for manual publishing in CaTH_

## 1. User Story
**As a** service (CaTH)
**I want to** register the Possession (PCOL) Daily Cause List as a selectable list type, linked to the Civil jurisdiction
**So that** an administrator can manually upload and publish the PCOL Daily Cause List through the existing manual upload form.

## 2. Background
The Court and Tribunal Hearings (CaTH) service publishes hearing lists. Most list types are ingested automatically and validated against a JSON schema with a matching style guide (renderer). This ticket adds the **Possession (PCOL) Daily Cause List**, which is a **manually uploaded** list only.

Because it is manually uploaded, it deliberately has:
- **No validation schema** (no JSON schema / no data validation of file contents)
- **No style guide / renderer** (the uploaded file is stored and served as-is)

List types are defined centrally in `libs/location/src/list-type-data.ts` and seeded into the `list_type` table via `libs/location/src/seed-list-types.ts`. Adding a single entry to `list-type-data.ts` registers the list type across the service.

A precedent for a manually uploaded list linked to Civil already exists: `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` (id 15).

## 3. Acceptance Criteria

* PCOL Daily Cause List is available in the manual upload form dropdown
* PCOL Daily Cause List is linked to the Civil jurisdiction (subJurisdictionIds: [1])
* A PCOL file can be manually uploaded and published with no content validation
* No style guide or validation schema is created
* Welsh display name is provided

## 4. Open Questions (from prior spec)

* **`isNonStrategic` value:** Confirm with product owner — must be `false` to appear in the standard manual upload dropdown
* **Sub-jurisdiction:** Assumed Civil Court (`subJurisdictionId: 1`); confirm if High Court or CoA Civil also required
* **Welsh friendly name:** Awaiting approved Welsh translation for "PCOL Daily Cause List"
* **Default sensitivity:** Assumed `Public` — confirm with business
* **Naming casing:** Issue writes "PCOL Daily Cause list" (lower-case "l"); confirm exact casing

### Comment by OgechiOkelu on 2026-07-01T17:28:32Z
@plan
