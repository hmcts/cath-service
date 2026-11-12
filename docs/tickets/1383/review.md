# Code Review: Issue #1383

## Summary

The SJP public list decided whether to show "Download a copy" by checking local disk. The path was wrong (`apps/storage/temp/uploads`) and the files aren't on disk anyway, because they now live in Blob Storage. This change replaces that check with a Blob Storage lookup.

During planning the implementation found a second bug that the ticket doesn't mention, and fixes it too. Generated PDFs and Excel files are written to `CONTAINER.PUBLICATIONS` (`libs/list-types/common/src/pdf/pdf-utilities.ts:32`, `libs/list-types/common/src/excel/excel-utilities.ts:54`). The SJP download code called `getBlobProperties` and `downloadBlob` without a container argument, so they read the default `CONTAINER.ARTEFACT` (`libs/azure-blob/src/blob-client.ts:50,70`). So even with the ticket's proposed snippet, the button, the files page and the download route would all have looked in the wrong place.

The fix moves the "which generated files exist" lookup into one module-private helper, `getGeneratedFileProperties`, at `apps/web/src/pages/(list-types)/sjp-download-shared.ts:117-123`. It reads `PUBLICATIONS` explicitly. A new exported `hasDownloadableFiles` (`:63-71`) wraps that helper and returns `false` on Blob Storage errors. Both the public list (`sjp-public-list/index.ts:86-88`) and the press list (`sjp-press-list/index.ts:57-59`) now use it. `getAvailableFiles` (`:42`) and `handleBlobDownload` (`:26`) now read the right container too.

The delta public and press lists re-export these controllers, so they get the fix as well. The E2E test drops the dummy disk files and the `test.fixme`. It now waits for the real generated blobs and checks the PDF download end to end.

Files reviewed: 10 modified, 1 new test (`sjp-download-shared.test.ts`), and the ticket, plan and tasks docs. There are no template, content, schema or dependency changes.

Verification:
- From the parent session: SJP unit tests passed (15 files, 299 tests), `yarn lint` passed (71/71), and the E2E spec passed (2 of 2 tests). The only `yarn test` failure is `apps/web/src/app.test.ts` "should create an Express application". It times out the same way on unmodified master at commit 65eb3d72, so it is unrelated.
- Re-run during this review: the scoped SJP unit tests and coverage. The result matches: 15 files, 299 tests passed.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

I checked the specific risk areas the brief raised, and none of them is a defect:

- **Error paths in `getAvailableFiles` and `handleBlobDownload`.** `getBlobProperties` and `downloadBlob` still throw on errors other than 404 (`libs/azure-blob/src/blob-client.ts:62-67,78-83`). The files page (`sjp-download-shared.ts:100`) and the download route (`:26`) don't catch these. `apps/web` runs Express 5.2.1 (`apps/web/package.json:70`), so a rejected async handler goes to the global error handler (500 page) rather than causing an unhandled rejection.
  - This is not a regression. The same calls threw the same way before, only against the wrong container.
  - The plan (section 3) explicitly accepts it, because the user asked for a file on that page.
- **Press list behaviour on Blob Storage errors.** Before this change, a blob error in the inline `Promise.all` was caught by the `try/catch` at `sjp-press-list/index.ts:84-87`, so the whole list came back as a 500. Now `hasDownloadableFiles` catches it, and the list renders without the button. This matches clarification 3, and `sjp-press-list/index.test.ts` covers it ("should still render the list with null downloadDisclaimerUrl when Blob Storage errors").
- **Other callers relying on the old `ARTEFACT` default.** A grep of non-test `.ts` files in `apps/web/src` and `libs` shows that every call to `getBlobProperties` or `downloadBlob` outside SJP already passes an explicit container:
  - `proof-of-id.ts:27` passes `FILES`.
  - `libs/publication` passes `ARTEFACT`.
  - `flat-file-service.ts:96` and `notification-service.ts:604-605` pass `PUBLICATIONS`.
  - The only callers that relied on the default were the three SJP sites this change fixes. Nothing else changes behaviour.

## 💡 SUGGESTIONS

1. **E2E cleanup leaves blobs in Azurite.** `cleanupTestData` (`e2e-tests/tests/verified-user/sjp-public-list.spec.ts:134-140`) calls only `deleteTestArtefact`. The route behind it, `libs/test-support/src/routes/test-support/artefacts/[artefactId].ts` `DELETE`, removes only the DB row.
   - What gets left behind: the generated `<id>.pdf` and `<id>.xlsx` in `PUBLICATIONS`, and the mirrored `<id>.json` in `ARTEFACT`.
   - This isn't a regression. The old deployed-branch cleanup, `deleteTestFlatFileFromWeb`, deleted only `ARTEFACT/<id>.pdf`, which is the wrong blob.
   - Suggested fix, in a separate ticket: have the test-support `DELETE` also remove derived files. `deleteDerivedFiles` in `libs/publication/src/repository/queries.ts:365-374` already does this, so expose or reuse that logic. That ticket could also fix the read/write container mismatch in `libs/test-support/src/routes/test-support/flat-files.ts`, which the plan flags in section 2.

2. **Make the E2E download step check more than the filename.** `sjp-public-list.spec.ts:222-225` checks only `download.suggestedFilename()`. That proves the route set the `Content-Disposition` header, but not that it returned a real file.
   - A cheap addition: `expect(await download.failure()).toBeNull()`.
   - Or check a non-zero size via `await download.path()` and `fs.stat`.
   - Either would catch a regression where the route sends an empty body.

3. **Poll for both generated files at once.** `waitForGeneratedFiles` (`sjp-public-list.spec.ts:124-131`) polls `.pdf` and then `.xlsx` one after the other, each with its own 30s timeout, so the worst case is 60s. Ingestion generates both together, so polling them in parallel would halve the worst case. One way: `Promise.all` over the two `expect.poll` calls, or a single poll that checks both. This only matters when the test is already failing, so it's optional.

4. **Remove the unused `downloadBlob` mock.** `sjp-download-shared.test.ts:8` mocks `downloadBlob`, but no test in the file uses it. `hasDownloadableFiles` never calls it.

5. **Add an explicit return type.** `getGeneratedFileProperties` (`sjp-download-shared.ts:117`) relies on an inferred return type. Annotating it as `Promise<{ pdf: { size: number } | null; xlsx: { size: number } | null }>` would document the contract that both `getAvailableFiles` and `hasDownloadableFiles` depend on. This is minor, and `getAvailableFiles` was already unannotated before this change.

6. **Logging.** `hasDownloadableFiles` logs the artefact ID and the raw error (`sjp-download-shared.ts:68`).
   - The artefact ID is not sensitive. The Azure SDK `RestError` redacts auth headers by default.
   - This matches the existing `deleteDerivedFiles` logging in `libs/publication/src/repository/queries.ts:367-372`, so no change is needed.
   - If the team moves to structured logging, log `error.message` or `error.code` rather than the whole object. That keeps log volume down when Blob Storage is unavailable, since every verified page view would log otherwise.

## ✅ Positive Feedback

- **Root cause beyond the ticket.** The implementation spotted the container mismatch that the ticket's proposed snippet would have missed. It fixed the button, the files page and the download route together, so the whole journey now reads the same container. The E2E download step at `sjp-public-list.spec.ts:221-225` locks that in.
- **Good single source of truth.** `getGeneratedFileProperties` is module-private, in line with CLAUDE.md pitfall 13. `hasDownloadableFiles` is exported only because two controllers use it. The module order follows CLAUDE.md section 8: constants, then exported functions, then private helpers at the bottom.
- **Placement is consistent.** Keeping the helper in `apps/web/src/pages/(list-types)/sjp-download-shared.ts` matches the existing pattern. This file and `publication-access.ts` were already the shared SJP route code, and their only consumers are web pages. The shared storage logic stays in `libs/azure-blob`.
- **Verified check first.** `isVerifiedUser && (await hasDownloadableFiles(...))` at `sjp-public-list/index.ts:87` and `sjp-press-list/index.ts:58` short-circuits, so anonymous and non-verified users trigger no Blob Storage calls. Tests assert `getBlobProperties` is not called in that case.
- **Graceful degradation.** The list data comes from Postgres, so a Blob Storage outage now hides only the optional button rather than failing the page. On the press list this replaces a 500.
- **Dead code removed.** The public list controller no longer has `fs`, `path`, `fileURLToPath`, `__dirname`, `MONOREPO_ROOT`, `STORAGE_DIR` or `fileExists`.
- **Better mocks.** The new and updated mocks keep the real `CONTAINER` via `importOriginal`, so a container argument that is wrong or undefined would fail the assertions instead of passing silently.
- **Thorough unit tests.** They follow the AAA pattern and cover PDF only, Excel only, neither, anonymous, non-verified, Blob Storage error, and the delta-path prefix.
- **E2E is realistic.** It uses files generated by the real ingestion path rather than dummy blobs written through a helper that targets the wrong container. Faking the files that way would have hidden the very bug this change fixes.
- **Security posture unchanged.**
  - The public list access check (`checkArtefactDataAccess`, `sjp-public-list/index.ts:46-51`) and the press list check (`canAccessPublicationData`, `sjp-press-list/index.ts:31`) both still run before any blob call.
  - The download and files routes are still gated by `requireVerified` (`sjp-public-list/download.ts`, `list-download-files.ts`) or `requireVerifiedWithProvenance` (press list).
  - Download requests still pass UUID and allowed-type validation (`sjp-download-shared.ts:13`).

## Test Coverage Assessment

- **Unit tests:** These are thorough.
  - New file `sjp-download-shared.test.ts` (4 tests) covers `hasDownloadableFiles`, including the error-and-log path.
  - `sjp-public-list/index.test.ts:520-658` has 7 button tests.
  - `sjp-press-list/index.test.ts:331+` has 3 button tests.
  - Container assertions were added to both `list-download-files.test.ts` files and both `download.test.ts` files.
  - All 299 SJP tests pass.
- **E2E tests:** `e2e-tests/tests/verified-user/sjp-public-list.spec.ts` has been re-enabled, with `test.fixme` removed. It now covers:
  - waiting for the real generated blobs
  - a verified user seeing the button
  - the disclaimer page with validation
  - the files page listing both PDF and Excel
  - the PDF download
  - the Welsh list page and Welsh disclaimer page

  Both tests in the spec passed against the worktree servers. Following `.claude/rules/e2e-testing.md` (one test per journey), the "no button for unverified users" case is covered by unit tests only.
- **Accessibility tests:** Inline axe scans still run on the list page (`:186-187`) and the download-files page (`:218-219`), with no violations. No templates changed, so there's no new accessibility surface. These scans use `.disableRules(["region"])` without WCAG tags, which is pre-existing and consistent with the rest of the spec.
- **Statement coverage per changed workspace:**
  - apps/web: 93.69% (SJP-scoped). On the changed SJP source files only, it is 93.58%. `sjp-download-shared.ts` is at 96.55%, `sjp-public-list/index.ts` at 100% and `sjp-press-list/index.ts` at 89.58%.
  - e2e-tests: n/a (no unit coverage, since it is a Playwright suite).
  - How this was measured: `npx vitest run --coverage 'src/pages/(list-types)/sjp'` in `apps/web`, rather than a full-workspace `yarn test:coverage`. The full run is very slow here and includes the unrelated, pre-existing `app.test.ts` timeout, while `apps/web` is the only changed workspace with source code. The scoped figure covers every changed source file.

## Acceptance Criteria Verification

- [x] **The button appears for a verified user when the PDF and/or Excel blob exists for the artefact, and not otherwise.**
  - Implementation: `apps/web/src/pages/(list-types)/sjp-public-list/index.ts:86-88` sets `isVerifiedUser && hasDownloadableFiles(artefactId)`. `apps/web/src/pages/(list-types)/sjp-download-shared.ts:63-71` and `:117-123` implement the PDF-or-Excel check against `CONTAINER.PUBLICATIONS`. The same logic now applies to the press list at `sjp-press-list/index.ts:57-59`.
  - Unit tests: `sjp-public-list/index.test.ts:559` (PDF only), `:576` (Excel only), `:591` (neither, so no button), `:603` (anonymous), `:616` (non-verified), `:629` (Blob Storage error) and `:644` (delta prefix).
  - E2E: `e2e-tests/tests/verified-user/sjp-public-list.spec.ts:182-183`.
- [x] **The test passes locally using Blob Storage test files.**
  - `e2e-tests/tests/verified-user/sjp-public-list.spec.ts:122-131,149` waits for the generated `.pdf` and `.xlsx` in Blob Storage (`PUBLICATIONS`) through `checkFlatFileExists`.
  - `:160` is the test with `test.fixme` removed.
  - `:221-225` downloads the PDF from Blob Storage.
  - The parent session ran it against the local worktree servers and Azurite: 2 passed.
  - The test uses blobs generated by real ingestion rather than ones uploaded through the test-support helper, as agreed in plan clarification 2. That helper writes to the wrong container and would have hidden the bug.

## Next Steps

- [ ] Address critical issues (none)
- [ ] Fix high priority items (none)
- [ ] Consider suggestions: E2E blob cleanup (separate ticket), a stronger download assertion, polling both files in parallel, removing the unused mock, and an explicit return type
- [ ] Re-run tests after fixes

## Overall Assessment

APPROVED

The fix is correct and minimal, and it goes past the ticket to fix the underlying container bug across the whole SJP download journey. Tests are thorough, coverage is above 80%, both acceptance criteria are met with evidence, and the previously skipped E2E journey now passes. The suggestions are optional follow-ups and don't block merging.
