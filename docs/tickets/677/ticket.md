# #677: Excel - CFT Hearing Lists

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement, status:new
**Created:** 2026-06-04T13:59:33Z
**Updated:** 2026-06-18T13:00:57Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the downloadable Excel file for the CFT hearing lists.

**AS A** service

**I WANT** to provide additional download file options for hearing lists in CaTH

**SO THAT** CaTH verified users have more options to choose from

**ACCEPTANCE CRITERIA**

- Excel and PDF downloadable files are made available as downloadable options for All Civil and Family Hearing Lists
- All the data fields / columns available in the current downloadable PDF file should also be available on the Excel downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-06-04T14:00:06Z
@spec

### Comment by OgechiOkelu on 2026-06-04T14:46:59Z
@plan

### Comment by OgechiOkelu on 2026-06-18T12:54:47Z
@SPEC

### Comment by hmctsclaudecode on 2026-06-18T12:59:49Z
*(Full technical specification posted — see GitHub issue for details. Key points:)*

- Excel generation using existing `exceljs` dependency (already in tree for import, not export)
- Add Excel generator registry alongside PDF generator registry in `libs/publication/src/processing/service.ts`
- Add `.xlsx` MIME type to `libs/publication/src/file-storage/content-type.ts`
- Extend download endpoint `/api/flat-file/{artefactId}/download` with `?format=xlsx` param
- Update hearing list page to show both PDF and Excel download links
- Add Excel download links to GOV.UK Notify email templates
- Scope: `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `CIVIL_DAILY_CAUSE_LIST`, `FAMILY_DAILY_CAUSE_LIST`
- Excel columns must match the existing PDF template's data fields
- Formula injection protection required for cell values

Open questions from spec:
1. Which list types are "All Civil and Family Hearing Lists"? (assumed 3 list types above)
2. Email links vs attachments — attach Excel or link only?
3. GOV.UK Notify template changes — coordination needed outside repo
4. Download endpoint shape — `?format=xlsx` query param vs separate route
5. Excel layout for grouped data — flat rows vs grouped rows/multiple sheets
6. Verified-user gating — follows existing access rules (no new gating)?

### Comment by OgechiOkelu on 2026-06-18T13:00:57Z
@plan
