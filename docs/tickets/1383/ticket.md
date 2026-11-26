# #1383: SJP public list "Download a copy" button never appears: file check reads local disk, not Blob Storage

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** ashwini-mv
**Labels:** None
**Created:** 2026-11-09T17:26:11Z
**Updated:** 2026-11-11T14:58:55Z

## Description

## Summary
The "Download a copy" button on the SJP public list checks the local disk for the generated PDF and Excel files. Those files are now saved to Azure Blob Storage, so the check fails and the button is never shown.

Where: `apps/web/src/pages/(list-types)/sjp-public-list/index.ts:94-97`

## Cause
The button shows only if the user is verified and a PDF or Excel file exists for the publication. In the failed run the user was verified; the file check failed.

1. **Wrong path.** The controller builds `MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..")` and `STORAGE_DIR = <root>/storage/temp/uploads`. The page now sits one level deeper inside the `(list-types)` group, so five levels up stops at `apps/`, one short of the repo root. It looks in `apps/storage/temp/uploads`, which doesn't exist. The test writes its files to `<repo>/storage/temp/uploads`, so they are never found.
2. **Wrong storage.** Even with the path fixed, the files aren't on disk.
   - PDFs: `savePdfToStorage` in `libs/list-types/common/src/pdf/pdf-utilities.ts`
   - Excel: `libs/list-types/common/src/excel/excel-utilities.ts:54`

   The rest of the SJP download journey already reads from Blob Storage (`getBlobProperties` on the file-list page, `downloadBlob` in `sjp-download-shared.ts`). Only this button check was left on the disk-based approach.

## Impact
- **Locally:** the button never appears, so the related test always fails (it was already failing before recent changes).
- **Deployed:** the web server's disk doesn't hold these files, so the check likely returns false there too. Real verified users probably never see "Download a copy" on the SJP public list. Not yet confirmed on an environment.
- The test is out of date: it writes dummy files to local disk to make the button appear.

## Proposed fix
Replace the disk check with the Blob Storage check already used at `sjp-download-shared.ts:42`:

```ts
const [pdfProps, excelProps] = await Promise.all([
  getBlobProperties(`${artefactId}.pdf`),
  getBlobProperties(`${artefactId}.xlsx`)
]);
```

- Remove the `MONOREPO_ROOT` / `STORAGE_DIR` / `fileExists` code.
- Update the test to upload its files through the Blob Storage helper instead of writing to local disk.

## Acceptance criteria
- The button appears for a verified user when the PDF and/or Excel blob exists for the artefact, and not otherwise.
- The test passes locally using Blob Storage test files.


## Comments

No comments on this issue.
