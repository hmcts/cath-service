# #1499 Tasks

## Implementation Tasks

- [x] Branch from `origin/master`, not the current `fix/1190-…` branch

### Library: `@hmcts/publication`
- [x] Create `libs/publication/src/file-storage/generated-files.ts` with:
  - `GENERATED_FILE_TYPES`
  - `isGeneratedFileType`
  - `getGeneratedFileKey`
  - `getGeneratedFileAvailability`, which uses `getBlobProperties` with `CONTAINER.PUBLICATIONS`, returns each file's size or null, and treats any non-404 error as not available
  - `formatFileSize` (KB/MB, 2 decimal places, as OG CaTH does)
  - `getGeneratedFile`, which uses `downloadBlob` with `CONTAINER.PUBLICATIONS`
- [x] Export the new functions and type from `libs/publication/src/index.ts`
- [x] Write `generated-files.test.ts`. Cover availability for both, PDF only, Excel only, neither, and a storage error. Check that `CONTAINER.PUBLICATIONS` is always passed. Cover `formatFileSize` either side of 1 MB. (Test Scenarios 1 and 2)

### Library: `@hmcts/system-admin-pages` (audit)
- [x] Add `BLOB_EXPLORER_DOWNLOAD = "Blob explorer download"` to `AuditLogAction` in `libs/system-admin-pages/src/audit-log/logger.ts`
- [x] Create `libs/system-admin-pages/src/audit-log/blob-explorer-download.ts` with `recordBlobExplorerDownload(user, artefactId, fileType)`. It calls `logAction` with action `BLOB_EXPLORER_DOWNLOAD`, artefact and file details, and the middleware's user fallbacks, and it lets failures propagate (fail closed)
- [x] Export it from `libs/system-admin-pages/src/index.ts`
- [x] Write `blob-explorer-download.test.ts`: the `logAction` payload, the user-field fallbacks, and that an error from `logAction` is rethrown (Test Scenario 5)

### Download route
- [x] Create `apps/web/src/pages/(system-admin)/blob-explorer-json-file/download.ts` with `GET = [requireRole([USER_ROLES.SYSTEM_ADMIN]), downloadHandler]`. The handler:
  - checks `artefactId` against the UUID regex and `type` against the allow-list (`pdf`, `xlsx`), and returns a 400 if either fails
  - calls `getGeneratedFile` and returns a 404 if it returns null (this also covers an artefact that doesn't exist)
  - calls `recordBlobExplorerDownload` before sending anything; a failure goes to the 500 path
  - sets `Content-Type`, `Content-Length`, `Content-Disposition: attachment; filename="<artefactId>.<ext>"` (as OG CaTH), `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`, then sends the buffer unchanged
  - catches unexpected errors and returns a 500, logging the artefactId and type only
- [x] Write `download.test.ts`:
  - the happy path for PDF and Excel: headers, exact buffer, audit call (Test Scenario 1)
  - 400 for a bad or missing `artefactId` and for a bad, missing or traversal `type`, with no blob call (Test Scenario 4)
  - 404 when the blob is missing, with no audit entry
  - 500 when the storage call throws
  - 500 and no `res.send` when the audit write fails
  - `GET[0]` is `requireRole` for `SYSTEM_ADMIN` (Test Scenario 5)

### Page changes
- [x] Add these keys to `en.ts` and `cy.ts` in `apps/web/src/pages/(system-admin)/blob-explorer-json-file/`:
  - `jsonFileGeneratedFilesHeading` (English in both files, as OG CaTH does)
  - `jsonFileDownloadPdf` (with a `SIZE` placeholder)
  - `jsonFileDownloadExcel` (with a `SIZE` placeholder)
  - `jsonFileNoPdf` and `jsonFileNoExcel` (English in both files)
  - Welsh only for the two download links, from OG CaTH's wording. Leave existing labels alone (#1583)
- [x] Update `index.ts`:
  - call `getGeneratedFileAvailability(artefactId)` after the metadata loads
  - pass `pdfDownloadUrl` and `excelDownloadUrl` to the view, or `null` when the file is not available, plus the formatted `pdfFileSize` and `excelFileSize`
  - add `&lng=cy` to the URLs when the page is in Welsh
- [x] Update `index.njk`: add a "Generated files" `h2` and a `govuk-list` that shows the download link with its size, or the "No … available" text for each format. Do not show the section when the page has an error
- [x] Update `index.test.ts`:
  - the URLs and formatted sizes are passed when the files are available and are `null` when they are not
  - the URLs carry `lng=cy` in Welsh
  - `getGeneratedFileAvailability` is called with the artefactId (Test Scenario 2)
- [x] Update `index.njk.test.ts` (Test Scenarios 2 and 3):
  - each link is shown with its size when its URL is given and is replaced by the "not available" text when it is not
  - the section is hidden when the page has an error
  - the Welsh download link text appears with the `cy` locale
  - `en`/`cy` have the same keys

### E2E
- [x] Extend the existing `@nightly` journey in `e2e-tests/tests/system-admin/blob-explorer.spec.ts` (already un-skipped on master). On the JSON file page:
  - check that each format shows a "Download …" link or a "No … available" message
  - click each link that is shown, wait for the `download` event, and check the suggested file extension and the file size against the test-support `flat-files` check
  - switch to Cymraeg and check the Welsh text
  - run an Axe scan with the WCAG 2.2 AA tags

  This covers Test Scenarios 1, 2 and 3

### Finish
- [x] Run `yarn lint:fix` and `yarn test` from the repo root and fix any failures
- [x] Manual check with a System Admin locally:
  - download a publication that has both files and open each one
  - open a list type that has no Excel and see "No Excel available"
  - confirm a `BLOB_EXPLORER_DOWNLOAD` entry appears in the Audit Log list
