# #677: CSV - CFT Hearing Lists

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement, status:new
**Created:** 2026-06-04T13:59:33Z
**Updated:** 2026-06-04T14:46:59Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the downloadable CSV file for the CFT hearing lists.

**AS A** service

**I WANT** to provide additional download file options for hearing lists in CaTH

**SO THAT** CaTH verified users have more options to choose from

**ACCEPTANCE CRITERIA**

CSV and PDF downloadable files are made available as downloadable options for All Civil and Family Hearing Lists
All the data fields / columns available in the current downloadable PDF file should also be available on the CSV downloadable file
Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-06-04T14:00:06Z
@spec

### Comment by hmctsclaudecode on 2026-06-04T14:06:04Z
(Full technical specification — see plan.md)

Key points from spec comment:
- PDF generation entry point: `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-generator.ts`
- Orchestration/registry: `libs/publication/src/processing/service.ts`
- PDF column source of truth: `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk`
- File storage helpers: `libs/list-types/common/src/pdf/pdf-utilities.ts`
- Download endpoint: `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`
- CSV content-type already mapped in `libs/publication/src/file-storage/content-type.ts`
- `papaparse` already in repo (used by system-admin-pages)

### Comment by OgechiOkelu on 2026-06-04T14:46:59Z
@plan
