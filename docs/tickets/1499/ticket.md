# #1499: Blob Explorer: download the generated PDF and Excel files for a publication

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-11-16T13:22:37Z
**Updated:** 2026-11-19T08:38:34Z

## Description

On the Blob Explorer publication page (`apps/web/src/pages/(system-admin)/blob-explorer-json-file`), add **Download PDF** and **Download Excel** options. A System Admin can then download the generated files for a publication straight from blob storage. This is useful for checking migrated publications against OG CaTH (PIP) during the migration.

Related: #850 (Blob Explorer view JSON), #1484 (Publications migration), #1485 (Sync Status).

## How it works
- **Where the files are:** generated files live in the `publications` blob container. Excel is stored as `<artefactId>.xlsx`, and the PDF name is the PDF blob key, as in `libs/list-types/common/src/pdf/pdf-utilities.ts`.
- **How they download:** files are read with the existing `downloadBlob` helper in `libs/azure-blob` and streamed with the correct content type and a `Content-Disposition: attachment` header.
- **File name:** a readable name, for example the list type, the court and the content date.
- **When a file is missing:**
  - A link only appears if that file exists in blob storage, which can be checked with `getBlobProperties`.
  - Otherwise the page shows "No PDF available" or "No Excel available". This also covers list types that don't generate one of the two formats.
- **Access and audit:** the download routes are restricted to System Admins, and each download is written to the audit log.

## Acceptance criteria
- A System Admin can download the PDF and the Excel file for a publication from Blob Explorer, when they exist.
- Downloaded files open correctly and match what is stored in blob storage.
- A clear message is shown when a file isn't available, instead of an error.
- The text is available in English and Welsh, and the page meets the WCAG 2.2 AA accessibility standard.

## Comments

No comments on this issue.
