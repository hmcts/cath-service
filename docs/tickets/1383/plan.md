# #1383: SJP public list "Download a copy" button never appears — Technical Plan

Code baseline: `origin/master` (local `master` is 17 commits behind). Implement on a fresh branch from `origin/master`.

## 1. Technical Approach

The SJP public list controller decides whether to show "Download a copy" by checking local disk (`fs.access`) under a `STORAGE_DIR` built from a wrong `MONOREPO_ROOT`. Generated PDFs and Excel files have been written to Azure Blob Storage since #773 ("route artefacts to separate containers by file type"), so the check always fails.

Replace the disk check with a Blob Storage existence check, as the ticket proposes. Verifying the code turned up a second defect the ticket does not mention, and the fix has to cover it as well:

- **Container mismatch.** `savePdfToStorage` (`libs/list-types/common/src/pdf/pdf-utilities.ts:32`), `saveExcelToStorage` (`libs/list-types/common/src/excel/excel-utilities.ts:54`) and `saveExcelFile` (`libs/excel-generation/src/file-storage/file-storage-service.ts:4`) all upload to `CONTAINER.PUBLICATIONS`.
- `getBlobProperties` and `downloadBlob` (`libs/azure-blob/src/blob-client.ts:50,70`) default to `CONTAINER.ARTEFACT`.
- `sjp-download-shared.ts:26` (`downloadBlob`) and `:42` (`getBlobProperties`) call them **without** a container, so they look in `artefact`, where generated SJP files never are. `sjp-press-list/index.ts:58` has the same bug.
- If we copied the ticket's snippet as written, the button would still never appear for real publications, and the files page and download route would return 404 even when the button did show.

Strategy:

1. Put the "which generated files exist for this artefact" lookup in one place, `apps/web/src/pages/(list-types)/sjp-download-shared.ts`. It reads `CONTAINER.PUBLICATIONS` explicitly.
2. Use it from the SJP public list page (this ticket), the files page (`getAvailableFiles`) and the download route (`handleBlobDownload`). That keeps the button, the files list and the download consistent. They all share the same helper, so the SJP press list's button check (`sjp-press-list/index.ts:58`) moves onto it too. This one-line change stops the press list button being the only part of the journey still reading the wrong container (see Clarifications).
3. Delete the `MONOREPO_ROOT` / `STORAGE_DIR` / `fileExists` code and the `node:fs/promises`, `node:path` and `node:url` imports from the SJP public list controller.
4. E2E: the real ingestion endpoint (`POST /publication`, used by `uploadTestPublication`) already generates the SJP public PDF and Excel into `PUBLICATIONS` (`libs/publication/src/processing/service.ts:270,481`). So the test should wait for those generated blobs, using the existing `checkFlatFileExists` helper, which reads `PUBLICATIONS`. It should not upload dummy files. The existing upload helper (`uploadTestFlatFile[ToWeb]` → `POST /test-support/flat-files`) writes to `CONTAINER.ARTEFACT`. That is the wrong container for this check, and using it would hide the container bug. Then remove `test.fixme`.

Key considerations:
- No new dependency: `apps/web/package.json` already depends on `@hmcts/azure-blob`.
- Keep the button decision in the controller (`isVerifiedUser && hasFiles`). The verified check should come first so anonymous and public users make no Blob Storage calls.
- `sjp-delta-public-list/index.ts` re-exports the public list `GET`/`POST`, and `sjp-delta-press-list/index.ts` the press list, so the button check is fixed for the delta lists too. The delta folders had no `list-download-disclaimer`, `list-download-files` or `download` routes, so the button linked to a 404. Add those three as re-exports of the full-list routes in both delta folders. The handlers already build onward links from `req.path`, and templates resolve by name across page folders, so nothing else changes.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No new pages, templates, content, API endpoints or DB schema changes. `sjp-public-list.njk` already renders the button when `downloadDisclaimerUrl` is truthy (lines 32-38).

### Files to change

| File | Change |
|---|---|
| `apps/web/src/pages/(list-types)/sjp-download-shared.ts` | Import `CONTAINER`. Add a module-private (not exported, per CLAUDE.md pitfall 13) `getGeneratedFileProperties(artefactId)`, which runs `Promise.all` over `getBlobProperties(\`${artefactId}.pdf\`, CONTAINER.PUBLICATIONS)` and `getBlobProperties(\`${artefactId}.xlsx\`, CONTAINER.PUBLICATIONS)` and returns `{ pdf, xlsx }`. Add `hasDownloadableFiles(artefactId): Promise<boolean>`, which returns `!!(pdf \|\| xlsx)`; on a Blob Storage error it logs (`console.error`, artefactId only) and returns `false`. Refactor `getAvailableFiles` to use `getGeneratedFileProperties`. Pass `CONTAINER.PUBLICATIONS` to `downloadBlob` in `handleBlobDownload`. |
| `apps/web/src/pages/(list-types)/sjp-public-list/index.ts` | Remove `fs`, `path`, `fileURLToPath`, `__filename`/`__dirname`, `MONOREPO_ROOT`, `STORAGE_DIR` and `fileExists`. Replace lines 94-97 with `const isVerifiedUser = req.user?.role === "VERIFIED"; const hasFiles = isVerifiedUser && (await hasDownloadableFiles(artefactId)); const downloadDisclaimerUrl = hasFiles ? ... : null;` |
| `apps/web/src/pages/(list-types)/sjp-press-list/index.ts` | Replace the inline `getBlobProperties` pair at line 58 with `hasDownloadableFiles(artefactId)`, using the same verified-first ordering. Drop the `@hmcts/azure-blob` import. |
| `apps/web/src/pages/(list-types)/sjp-public-list/index.test.ts` | Replace the `node:fs/promises` mock with a mock of `@hmcts/azure-blob` (`getBlobProperties`), keeping the real `CONTAINER` via `importOriginal`. Rewrite the download-button tests (currently lines 518-595). |
| `apps/web/src/pages/(list-types)/sjp-press-list/index.test.ts` | Its `@hmcts/azure-blob` mock (line 44) does not export `CONTAINER`. Spread `importOriginal`. Assert the `PUBLICATIONS` container. |
| `apps/web/src/pages/(list-types)/sjp-public-list/list-download-files.test.ts`, `sjp-press-list/list-download-files.test.ts`, `sjp-public-list/download.test.ts`, `sjp-press-list/download.test.ts` | Same `CONTAINER` mock fix wherever `@hmcts/azure-blob` is mocked. Add an assertion that the `PUBLICATIONS` container is queried or downloaded. |
| `apps/web/src/pages/(list-types)/sjp-download-shared.test.ts` (new) | Unit tests for `hasDownloadableFiles` (see Test Scenarios). |
| `e2e-tests/tests/verified-user/sjp-public-list.spec.ts` | Remove `fs`, `path`, `MONOREPO_ROOT`, `STORAGE_PATH`, `uploadDownloadableFiles` and the local-disk cleanup branch. In `beforeAll`, after upload, `expect.poll` on `checkFlatFileExists(artefactId, ".pdf")` and `(artefactId, ".xlsx")` until `exists` (same pattern as `admin/manual-upload.spec.ts:512`). Drop `deleteTestFlatFileFromWeb` from cleanup. It deletes only `<id>.pdf` from `ARTEFACT`, and `deleteTestArtefact` already removes the artefact. Remove `test.fixme` and its annotation (lines 204-206). |

### Related code (disk-based pattern), out of scope

- No other list-type page uses the `MONOREPO_ROOT` / `STORAGE_DIR` / `fileExists` pattern. `sjp-public-list/index.ts` is the only one.
- `e2e-tests/tests/flat-file-viewing.spec.ts:19` keeps a local-disk `STORAGE_PATH` fallback for when `AZURE_STORAGE_CONNECTION_STRING` is unset. Leave it.
- `libs/test-support/src/routes/test-support/flat-files.ts` is inconsistent with itself: `GET` reads `PUBLICATIONS`, while `POST` and `DELETE` use `ARTEFACT`, and `POST` always sets `application/pdf`. This plan does not need it changed. Worth a separate ticket.
- `test-support/artefacts/[artefactId]` `DELETE` removes only the DB row, not the generated `PUBLICATIONS` blobs. Test blobs are left in Azurite. This is a pre-existing gap and minor.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Missing blob | `getBlobProperties` returns `null` on a 404, which counts as "does not exist". |
| Only the PDF exists, or only the Excel | The button is shown (`pdf \|\| xlsx`). The files page lists only the file that exists (existing `getAvailableFiles` behaviour). |
| Neither exists, e.g. PDF generation skipped or still in progress | No button. `downloadDisclaimerUrl: null`. |
| User not VERIFIED (anonymous, or any other role) | No button, and no Blob Storage calls (verified check short-circuits). |
| Blob Storage unavailable or erroring (non-404) | `hasDownloadableFiles` catches the error, logs `Failed to check downloadable files for artefact <id>` with the error, and returns `false`. The list still renders without the button, because the list data comes from Postgres and Blob Storage is only needed for the optional download. The files page (`getAvailableFiles`) and download route keep their current behaviour: the error goes to the global error handler. That is acceptable, since the user explicitly asked for a file there. |
| Misconfiguration (`AZURE_STORAGE_ACCOUNT_NAME` unset) | `createBlobServiceClient` throws synchronously inside the async call, so it becomes a rejected promise and follows the error row above. |
| Delta SJP public and press lists | The list page is fixed through the `index.ts` re-export, and `req.path` keeps the delta prefix in the disclaimer URL. The disclaimer, file-list and download routes are added as re-exports under `sjp-delta-*-list/`, so the journey stays on the delta path instead of hitting a 404. |
| `artefactId` | Already validated by access control (`checkArtefactDataAccess`) before the blob check. The blob name is `${artefactId}.pdf` / `.xlsx`, with no path traversal risk in blob naming. |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| The button appears for a verified user when the PDF and/or Excel blob exists for the artefact, and not otherwise. | Controller uses `isVerifiedUser && hasDownloadableFiles(artefactId)`, checking the `PUBLICATIONS` container where the files are written. | Unit tests in `sjp-public-list/index.test.ts`: PDF only, Excel only, both, neither, unverified, blob error. E2E journey asserts the button is visible for a verified user. |
| The test passes locally using Blob Storage test files. | E2E uses the PDF/Excel that real ingestion generates into Blob Storage (Azurite locally and in CI, Azure when deployed), waits for them, then runs the journey with `test.fixme` removed. | Run `e2e-tests/tests/verified-user/sjp-public-list.spec.ts` locally against Azurite (`docker-compose up azurite`, `AZURE_STORAGE_CONNECTION_STRING` set as in `apps/web/.env.example`). |

Implied by the AC, because the journey test exercises it: after "Download a copy", the files page lists PDF and Excel, and a download returns the file. This needs the `PUBLICATIONS` fix in `getAvailableFiles` and `handleBlobDownload`.

## 5. Test Scenarios

### Unit (Vitest, AAA, co-located)

`sjp-public-list/index.test.ts` (GET):
1. Verified user, PDF blob only → `downloadDisclaimerUrl` = `/sjp-public-list/list-download-disclaimer?artefactId=…`. Assert `getBlobProperties` is called with `CONTAINER.PUBLICATIONS`.
2. Verified user, Excel blob only → URL set.
3. Verified user, no blobs → `downloadDisclaimerUrl: null`.
4. Unverified/anonymous user with blobs present → `null`, and `getBlobProperties` is not called.
5. Verified user, `getBlobProperties` rejects → page still renders `sjp-public-list` with `downloadDisclaimerUrl: null`.
6. Delta path (`req.path = "/sjp-delta-public-list"`) → URL uses the delta prefix.

`sjp-download-shared.test.ts` (new): `hasDownloadableFiles` returns true for PDF only, true for Excel only, false for neither, and false (with `console.error` logged) on a rejection. It queries `PUBLICATIONS`.

`sjp-press-list/index.test.ts`: the existing button tests are updated to use the helper. Add one assertion that the `PUBLICATIONS` container is queried.

`list-download-files.test.ts` (public and press): the existing tests still pass. Add an assertion that `getBlobProperties` is called with `CONTAINER.PUBLICATIONS`.

`download.test.ts` (public and press): add an assertion that `downloadBlob` is called with `CONTAINER.PUBLICATIONS`.

### E2E (Playwright, one journey)

`verified user can view SJP public list and download files @nightly` is the existing journey, now un-fixme'd:
- Setup publishes via `POST /publication` and waits for the generated `.pdf` and `.xlsx` in Blob Storage.
- Verified login → list page → "Download a copy" is visible → axe → disclaimer → validation error → agree → files page lists PDF and Excel → axe → Welsh list page and Welsh button → Welsh disclaimer.
- New step: click the PDF link and assert a download event with filename `<artefactId>.pdf`. This proves the download route reads the right container.

The unverified "no button" path is covered by unit tests only. Per `.claude/rules/e2e-testing.md` it does not get its own E2E test (one test per journey). If the team wants E2E cover for it, fold it into the existing filter journey as a pre-login check rather than adding a new test.

## 6. Open Questions

### CLARIFICATIONS RESOLVED (HarveyMoj, 2026-11-11)

1. **Scope: container fix across the shared SJP download code — DECIDED: keep it all in this ticket.** The ticket scopes the change to the button check only. Fixing just the button (with the right container) leaves the files page and download route reading `artefact`, so the E2E journey would still fail at "Download your file", and the press list button would still never appear. This ticket therefore fixes `sjp-download-shared.ts` (`getAvailableFiles`, `handleBlobDownload`) and the press list button check too.
2. **E2E data source — DECIDED: use the real generated files.** The E2E test relies on ingestion generating the real PDF and Excel, not the ticket's "Blob Storage helper". The only helper (`POST /test-support/flat-files`) writes to `ARTEFACT`, which would mask the container bug. If PDF generation proves unreliable in CI, the fallback is an optional `container` parameter on the test-support flat-files route in `libs/test-support`.
3. **Blob Storage outage behaviour on the list page — DECIDED: degrade gracefully on both lists.** The public and press lists render without the button and log the error. The press list currently lets the error become a 500.
4. **Deployed environments — DECIDED: no separate manual check.** This version of CaTH is not live, so no real users are affected. Deployed verification is covered by the re-enabled E2E journey when the pipeline runs it against the staging environment.
