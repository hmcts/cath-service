# #791: Style Guide: IAC Daily List

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-07-01T12:42:33Z
**Updated:** 2026-07-01T17:32:38Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of IAC Daily List for manual publishing in CaTH.

**AS A** Service
**I WANT** to create the supporting information for IAC Daily List 
**SO THAT** this hearing list can be manually published in CaTH

**ACCEPTANCE CRITERIA**
• Immigration and Asylum Chamber publishes 2 lists manually in CaTH; the Immigration and Asylum Chamber Daily List and the Immigration and Asylum Chamber Daily List – Additional Cases. These lists are created in the front end.
• The Immigration and Asylum Chamber Daily List will always appear first where both list types are published under the same venue, regardless of the order in which both lists are published

- Because its a manually uploaded hearing list, there is no validation schema or style guide.

## Comments

### Comment by OgechiOkelu on 2026-07-01T17:22:57Z
@spec 

### Comment by hmctsclaudecode on 2026-07-01T17:27:39Z
# Technical Specification: IAC Daily List (Immigration and Asylum Chamber)

> GitHub Issue #791 — Style Guide: IAC Daily List

## 1. User Story
**As a** service (Immigration and Asylum Chamber publishing team)
**I want to** register and manually publish the *Immigration and Asylum Chamber Daily List* and the *Immigration and Asylum Chamber Daily List – Additional Cases*
**So that** these hearing lists can be manually published and viewed in CaTH under the correct venue, with the Daily List always shown before the Additional Cases list.

## 2. Background
The Immigration and Asylum Chamber (IAC) publishes two hearing lists manually into CaTH:

1. **Immigration and Asylum Chamber Daily List**
2. **Immigration and Asylum Chamber Daily List – Additional Cases**

Both are **manually uploaded flat files** (HTML/PDF/DOC). Because they are manually uploaded, there is **no JSON validation schema and no bespoke rendered style guide/template** — they are served as flat files, in the same way as the existing manual-upload list types (e.g. `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST`).

The work is therefore primarily **list-type registration and configuration**, not the building of a new rendered page. The two list types must be added so they appear:
- In the manual upload list-type dropdown (`/manual-upload`), so admins can publish against them.
- In the Summary of Publications page for a venue, respecting the ordering rule.

Key reference files identified in the codebase:

| Purpose | Path |
|---------|------|
| List type seed/registry data | `libs/location/src/list-type-data.ts` |
| `ListType` Prisma model | `libs/postgres-prisma/prisma/schema/location.prisma` |
| `Artefact` Prisma model | `libs/postgres-prisma/prisma/schema/base.prisma` |
| Manual upload controller | `apps/web/src/pages/(admin)/manual-upload/index.ts` |
| Manual upload summary/confirm | `apps/web/src/pages/(admin)/manual-upload-summary/index.ts` |
| Summary of publications (venue view + ordering) | `apps/web/src/pages/(public)/summary-of-publications/index.ts` |
| Flat-file viewer | `apps/web/src/pages/(system-admin)/blob-explorer-flat-file/index.ts` |
| Provenance enum | `libs/publication/src/provenance.ts` |
| List-type admin CRUD | `libs/system-admin-pages/src/list-type/` |

Closest existing analogue: `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` (`provenance: "MANUAL_UPLOAD"`, `isNonStrategic: true`).

## 3. Acceptance Criteria

* **Scenario:** Both IAC list types are available for manual publishing
    * **Given** an authorised admin is on the manual upload page (`/manual-upload`) for an IAC venue
    * **When** they open the list type selector
    * **Then** both *Immigration and Asylum Chamber Daily List* and *Immigration and Asylum Chamber Daily List – Additional Cases* are selectable

* **Scenario:** A manually uploaded IAC list is published and viewable
    * **Given** an admin uploads a flat file against the *Immigration and Asylum Chamber Daily List* for a venue with a hearing date, sensitivity and language
    * **When** they confirm on the summary page
    * **Then** an artefact is created with `provenance = MANUAL_UPLOAD`, and the list appears on that venue's Summary of Publications page and opens as a flat file

* **Scenario:** Daily List ordered before Additional Cases under the same venue
    * **Given** both the *Immigration and Asylum Chamber Daily List* and the *Immigration and Asylum Chamber Daily List – Additional Cases* are published and live under the same venue
    * **When** a user views that venue's Summary of Publications page
    * **Then** the *Immigration and Asylum Chamber Daily List* is always listed **before** the *Immigration and Asylum Chamber Daily List – Additional Cases*, regardless of the order in which they were published

* **Scenario:** Welsh language support
    * **Given** a user views the Summary of Publications page with `?lng=cy`
    * **When** either IAC list is present
    * **Then** the Welsh friendly name is displayed for each list

## 4. Open Questions (from @spec)

- What are the exact **Welsh friendly names** and shortened names for both lists?
- What is the correct **`subJurisdictionId`(s)** for the Immigration and Asylum Chamber?
- Should ordering be implemented as a **targeted comparator tie-break** or via a general **`displayOrder` column** on `ListType`?
- Are there notification/subscription implications?
- Is the en dash `–` in "Daily List – Additional Cases" the required exact character?
- What is the `defaultSensitivity` for both lists?

### Comment by OgechiOkelu on 2026-07-01T17:32:38Z
@plan
