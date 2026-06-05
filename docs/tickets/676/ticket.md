---
# #676: CSV - SJP Hearing Lists

**State:** OPEN
**Assignees:** none
**Author:** OgechiOkelu
**Labels:** enhancement, status:new
**Created:** 2026-06-04T13:56:26Z
**Updated:** 2026-06-05T08:44:20Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the CSV downloadable version of the SJP hearing lists.

**AS A** service

**I WANT** to provide additional download file options for hearing lists in CaTH

**SO THAT** CaTH verified users have more options to choose from


**ACCEPTANCE CRITERIA**

- CSV and PDF downloadable files are made available as downloadable options for the following SJP Hearing Lists; SJP_DELTA_PRESS_LIST, SJP_PRESS_LIST, SJP_DELTA_PUBLIC_LIST and SJP_PUBLIC_LIST

- Links to download the CSV file is displayed in the email notifications

- All the data fields / columns available in CaTH should also be available on the CSV downloadable file

## Comments

### Comment by OgechiOkelu on 2026-06-05T08:38:19Z
@spec

### Comment by hmctsclaudecode on 2026-06-05T08:43:31Z
# Technical Specification: CSV Download for SJP Hearing Lists (Issue #676)

## 1. User Story
**As a** CaTH verified user (media / press and members of the public)
**I want to** download Single Justice Procedure (SJP) hearing lists as a CSV file
**So that** I have more file format options for working with hearing list data outside of CaTH (filtering, sorting, archiving, and analysis in spreadsheet software).

## 2. Background

CaTH currently renders SJP hearing lists as interactive HTML pages built from the published JSON artefact. The four in-scope SJP list types are rendered by two web modules:

- **Press lists** (`SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST`) → `libs/list-types/sjp-press-list/`
- **Public lists** (`SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST`) → `libs/list-types/sjp-public-list/`

The list types are defined in `libs/location/src/list-type-data.ts`:

| id | name | sensitivity | urlPath |
|----|------|-------------|---------|
| 24 | `SJP_PRESS_LIST` | Classified | `sjp-press-list` |
| 25 | `SJP_PUBLIC_LIST` | Public | `sjp-public-list` |
| 26 | `SJP_DELTA_PRESS_LIST` | Classified | `sjp-delta-press-list` |
| 27 | `SJP_DELTA_PUBLIC_LIST` | Public | `sjp-delta-public-list` |

Unlike the daily cause lists, **SJP lists are not flat files and currently have no generated download artefact**. The `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` does not include any SJP list type, so today there is no PDF or CSV download available for SJP lists at all — only the HTML view.

## 3. Key Decisions

- **On-demand CSV generation** from the stored JSON artefact (no new DB schema, no new storage).
- **SJP case extraction** via existing `getAllSjpPressCases(artefactId, filters)` in `libs/list-types/common/src/sjp/sjp-service.ts`.
- **CSV generation** via PapaParse (`Papa.unparse`) — already a project dependency.
- **Email link** = absolute URL to download endpoint; not a file attachment (so no 2MB Notify limit concern).
- **PDF is out of scope** for this ticket — a UI slot for PDF is reserved but PDF generation is a sibling concern.

## Comments (continued)

### Comment by OgechiOkelu on 2026-06-05T08:44:20Z
@plan
