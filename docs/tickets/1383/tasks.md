# #1383 Tasks

Branch from `origin/master` (not local `master`).

## Implementation Tasks
- [x] In `apps/web/src/pages/(list-types)/sjp-download-shared.ts`, add `getGeneratedFileProperties(artefactId)`. It calls `getBlobProperties` for `<id>.pdf` and `<id>.xlsx` with `CONTAINER.PUBLICATIONS`.
- [x] In `sjp-download-shared.ts`, add `hasDownloadableFiles(artefactId)`. It returns true if either blob exists. On a Blob Storage error it logs and returns false.
- [x] In `sjp-download-shared.ts`, refactor `getAvailableFiles` to use `getGeneratedFileProperties`, so it reads `PUBLICATIONS`.
- [x] In `sjp-download-shared.ts`, pass `CONTAINER.PUBLICATIONS` to `downloadBlob` in `handleBlobDownload`.
- [x] In `apps/web/src/pages/(list-types)/sjp-public-list/index.ts`, remove `MONOREPO_ROOT`, `STORAGE_DIR` and `fileExists`, plus the `node:fs/promises`, `node:path` and `node:url` imports and `__filename`/`__dirname`.
- [x] In `sjp-public-list/index.ts`, set `downloadDisclaimerUrl` from `isVerifiedUser && (await hasDownloadableFiles(artefactId))`. Check verified first so there are no blob calls for other users.
- [x] In `apps/web/src/pages/(list-types)/sjp-press-list/index.ts`, replace the inline `getBlobProperties` pair (line 58) with `hasDownloadableFiles`, verified first. Remove the unused `@hmcts/azure-blob` import.
- [x] Run `yarn lint:fix` and `yarn test` for `apps/web`.

## Testing Tasks
- [x] In `sjp-public-list/index.test.ts`, replace the `node:fs/promises` mock with a mock of `@hmcts/azure-blob` (`getBlobProperties`). Keep the real `CONTAINER` via `importOriginal`.
- [x] Add a unit test to `sjp-public-list/index.test.ts`: verified user with only the PDF blob gets a disclaimer URL, and the `PUBLICATIONS` container is queried.
- [x] Add a unit test to `sjp-public-list/index.test.ts`: verified user with only the Excel blob gets a disclaimer URL.
- [x] Add a unit test to `sjp-public-list/index.test.ts`: verified user with no blobs gets `downloadDisclaimerUrl: null`.
- [x] Add a unit test to `sjp-public-list/index.test.ts`: unverified or anonymous user with blobs present gets `null`, and `getBlobProperties` is not called.
- [x] Add a unit test to `sjp-public-list/index.test.ts`: when `getBlobProperties` rejects, the list still renders with `downloadDisclaimerUrl: null`.
- [x] Add a unit test to `sjp-public-list/index.test.ts`: on the delta path, the disclaimer URL uses the `/sjp-delta-public-list` prefix.
- [x] Create `sjp-download-shared.test.ts` covering `hasDownloadableFiles`: PDF only is true, Excel only is true, neither is false, and an error is false and logged. Each case asserts the `PUBLICATIONS` container.
- [x] In `sjp-press-list/index.test.ts`, make the `@hmcts/azure-blob` mock spread `importOriginal` so `CONTAINER` exists. Update the button tests and assert the `PUBLICATIONS` container.
- [x] In `sjp-public-list/list-download-files.test.ts` and `sjp-press-list/list-download-files.test.ts`, fix the `CONTAINER` mock and assert that `getBlobProperties` uses `CONTAINER.PUBLICATIONS`.
- [x] In `sjp-public-list/download.test.ts` and `sjp-press-list/download.test.ts`, fix the `CONTAINER` mock and assert that `downloadBlob` uses `CONTAINER.PUBLICATIONS`.
- [x] In `e2e-tests/tests/verified-user/sjp-public-list.spec.ts`, remove `fs`, `path`, `MONOREPO_ROOT`, `STORAGE_PATH`, `uploadDownloadableFiles` and the local-disk cleanup. Also remove `deleteTestFlatFileFromWeb` from cleanup.
- [x] In the same spec's `beforeAll`, `expect.poll` on `checkFlatFileExists(artefactId, ".pdf")` and `checkFlatFileExists(artefactId, ".xlsx")` until both exist.
- [x] In the same spec, remove `test.fixme` and the #1383 annotation from "verified user can view SJP public list and download files". Add a step that clicks the PDF link and asserts a download named `<artefactId>.pdf`.
- [x] Run the E2E spec locally against Azurite (`docker-compose up azurite`, `AZURE_STORAGE_CONNECTION_STRING` set) and confirm both tests in the spec pass.
