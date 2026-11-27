# Code Review: Issue #1499

Blob Explorer: download the generated PDF and Excel files for a publication.

## Summary

The change adds a "Generated files" section to the Blob Explorer JSON file page. It also adds a System Admin-only download route, `GET /blob-explorer-json-file/download?artefactId=&type=pdf|xlsx`, and a fail-closed audit entry (`BLOB_EXPLORER_DOWNLOAD`). The business logic sits in libs, as `CLAUDE.md` asks:

- `libs/publication/src/file-storage/generated-files.ts` does the blob availability check, the size formatting and the file fetch.
- `libs/system-admin-pages/src/audit-log/blob-explorer-download.ts` writes the audit entry.

The `apps/web` controllers stay thin.

The implementation follows `plan.md`, including every decision in section 6. The blob key is built only from a UUID that has been checked against a regex and an extension from a fixed list, so neither path traversal nor header injection is possible. Coverage of the changed files is 100% in all three workspaces. The `@nightly` E2E journey covers both downloads, the Welsh links and Axe WCAG 2.2 AA scans in English and Welsh.

I found no critical or high-priority issues. The suggestions below are small hardening and test-strength improvements.

Files reviewed:
- `apps/web/src/pages/(system-admin)/blob-explorer-json-file/{index.ts,index.njk,en.ts,cy.ts,download.ts}` and their tests
- `libs/publication/src/file-storage/generated-files.ts` and its test, plus `libs/publication/src/index.ts`
- `libs/system-admin-pages/src/audit-log/{blob-explorer-download.ts,logger.ts}` and the test, plus `libs/system-admin-pages/src/index.ts`
- `e2e-tests/tests/system-admin/blob-explorer.spec.ts`

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **A HEAD request writes an audit entry without sending a file.** See `apps/web/src/pages/(system-admin)/blob-explorer-json-file/download.ts:9-30`.
   - Express sends HEAD requests to GET handlers. A HEAD request to the download URL would therefore download the blob, write a `BLOB_EXPLORER_DOWNLOAD` entry ("Status: Completed successfully") and then send headers only.
   - The risk is low, because the route is System Admin-only and browsers don't send HEAD for link clicks. Still, it makes the audit trail slightly wrong, and it is a full blob read for no benefit.
   - Approach: return early when `req.method === "HEAD"` (headers only, no audit write), or accept the behaviour and say so in the plan.

2. **The E2E test compares file size, not content.** See `e2e-tests/tests/system-admin/blob-explorer.spec.ts:139-145`.
   - The AC says the downloaded files "match what is stored". The code makes this true: `download.ts:30` sends the buffer unchanged, and `download.test.ts:88` checks the exact buffer. The E2E test, though, only checks `stat(...).size === stored.sizeBytes`.
   - A SHA-256 comparison would be stronger. For example, the test-support `GET /test-support/flat-files` route (`libs/test-support/src/routes/test-support/flat-files.ts:15-18`) could also return a hash of the buffer it already downloads, and the test could hash the downloaded file.
   - This is optional, because the unit test already proves the bytes pass through unchanged.

3. **The E2E test doesn't check the audit entry.** See `e2e-tests/tests/system-admin/blob-explorer.spec.ts:107-110`.
   - The audit write is covered at unit level (`download.test.ts:82`, `:92-109`, `:181-193` and `blob-explorer-download.test.ts`), and it was confirmed by hand in this session. The nightly journey, however, never checks that a `BLOB_EXPLORER_DOWNLOAD` row appears.
   - Visiting the Audit Log list after the downloads, or asking a test-support endpoint, would guard against a regression in how the route is wired. This would also let tasks.md mark the "confirm a `BLOB_EXPLORER_DOWNLOAD` entry appears" part of the manual check as automated.

4. **The availability check runs after three earlier awaits, one after another.** See `apps/web/src/pages/(system-admin)/blob-explorer-json-file/index.ts:28-40`.
   - `getArtefactMetadata`, `getJsonContent` and `getRenderedTemplateUrl` already run in sequence (that code was there before this change), and `getGeneratedFileAvailability` adds a fourth round trip. The two `getBlobProperties` calls inside it are already run in parallel (`generated-files.ts:16`).
   - Putting the blob check into a `Promise.all` with `getJsonContent` and `getRenderedTemplateUrl`, after metadata has been confirmed, would save one storage round trip on each page load.
   - Keeping it after the `!metadata` check is correct, because it means the artefactId is a real UUID before storage is asked about it. That ordering should stay.

5. **The size format has an edge case at the 1 MB boundary.** `formatFileSize(1024 * 1024 - 1)` returns `"1024.00KB"`, which `generated-files.test.ts:123` checks.
   - This is cosmetic, and it matches the OG CaTH rule (KB below 1 MB). If you'd prefer "1.00MB", compare the rounded KB value with 1024 instead.
   - Optionally, a space between the number and the unit ("120.45 KB") reads better with screen readers. This is a content choice; OG CaTH leaves the space out.

6. **The error page and the page use different locale sources.** `download.ts:38` reads `res.locals.locale`, while `index.ts:19` reads `req.query.lng`.
   - Both give the same answer in practice, because the locale middleware (`libs/web-core/src/middleware/i18n/locale-middleware.ts:56`) sets `res.locals.locale` from `lng` or the cookie, and the download URL carries `&lng=cy`.
   - The difference is deliberate and correct: the download route renders shared error templates that expect `res.locals.locale`. No change is needed, but a one-line note in the plan would save the next reader from wondering about it.

## ✅ Positive Feedback

- **Strict input validation before anything else runs** (`download.ts:12`):
  - The UUID regex, a `typeof` string check (which rejects array query values) and an `Object.hasOwn` list check (which rejects `toString`/`constructor`, as `generated-files.test.ts:36` shows) run before any storage call.
  - The key `${uuid}${extension}` cannot be traversed, and the `Content-Disposition` file name (`download.ts:27`) is safe without escaping.
- **The audit write fails closed, and in the right order** (`download.ts:17-30`):
  - A missing blob returns 404 without an audit entry.
  - The audit entry is written before any header or byte is sent.
  - An audit failure sends nothing (`download.test.ts:181-193` checks that `setHeader` and `send` are never called).
- **Good security headers**: `Cache-Control: no-store, …, private` and `X-Content-Type-Options: nosniff`.
- **Logs contain no personal data**: both `console.error` calls log only the artefactId, the type and `error.message` (`download.ts:32`, `generated-files.ts:41`). The comment at `generated-files.ts:40` explains why, not what.
- **A storage outage can't break the page**: each format fails on its own, and `generated-files.test.ts:93-103` proves the other format still shows.
- **Conventions are followed**:
  - Module ordering matches `CLAUDE.md` section 8: constants, exported functions, private helpers in the order they're used, types at the bottom.
  - There is no `types.ts`, and imports use `.js`.
  - `getGeneratedFileKey` stays private and is tested through its public callers (`CLAUDE.md` "Don't export functions in order to test them").
  - The audit action is stored in the same normalised form the middleware uses (`blob-explorer-download.ts:6`), so it lines up with `BLOB_EXPLORER_RESUBMISSION` in the audit list.
- **Accessible, progressively enhanced markup** (`index.njk:82-98`):
  - It uses a plain `h2` (keeping the h1 > h2 outline), a `govuk-list` and `govuk-link` anchors, and needs no JavaScript.
  - The link text is unique, names the file type and gives the size, as GOV.UK file-link guidance asks.
  - "No … available" is ordinary body text, not error styling.
- **Unit tests are thorough and easy to read**:
  - They follow Arrange/Act/Assert.
  - `it.each` covers the eight invalid-input cases.
  - One test proves the audit entry is written before the file is sent (`download.test.ts:92-109`).
  - One test checks that `en` and `cy` have the same keys (`index.njk.test.ts`, "locale files").
- **The E2E work extends the existing `@nightly` journey** instead of adding new tests, as `.claude/rules/e2e-testing.md` asks.
  - `beforeAll` waits until both blobs exist, so the test isn't flaky.
  - The existing Axe scan now uses the full WCAG 2.2 AA tag set, and a Welsh scan was added.

## Test Coverage Assessment

- **Unit tests**:
  - publication: 28 tests pass (`generated-files.test.ts`).
  - system-admin-pages: 5 tests pass (`blob-explorer-download.test.ts`). The audit-log directory has 88 in total.
  - web: 45 tests pass (`blob-explorer-json-file`: `index.test.ts`, `index.njk.test.ts`, `download.test.ts`).
  - All three workspaces were re-run during this review.
- **E2E tests**: `e2e-tests/tests/system-admin/blob-explorer.spec.ts` (`@nightly`). It downloads both files, checks the suggested file name and the size against the stored blob (lines 107-110, 135-146) and checks the Welsh link text and `lng=cy` hrefs (lines 120-123). My caller reported two passing runs with real SSO; I did not re-run it.
- **Accessibility tests**: Axe runs with `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` on the JSON file page in English (lines 113-117) and in Welsh (lines 124-128). Only `region` is disabled, as the existing spec already did.
- **Statement coverage**: this is for the changed files only, not the whole workspace. It was measured with the vitest `json-summary` reporter.

| Workspace | File(s) | Statements | Branches | Functions |
|---|---|---|---|---|
| `libs/publication` | `src/file-storage/generated-files.ts` | 100% (19/19) | 100% (10/10) | 100% (6/6) |
| `libs/system-admin-pages` | `src/audit-log/blob-explorer-download.ts` | 100% (3/3) | 100% (8/8) | 100% (1/1) |
| `apps/web` | `blob-explorer-json-file/*.ts` (`index.ts`, `download.ts`, `en.ts`, `cy.ts`) | 100% (51/51) | 100% (35/35) | 100% (6/6) |

No workspace is below 80%.

## Acceptance Criteria Verification

The criteria below are copied word for word from `docs/tickets/1499/ticket.md:26-29`.

- [x] **A System Admin can download the PDF and the Excel file for a publication from Blob Explorer, when they exist.**
  - Links appear only when `getBlobProperties` finds the blob: `libs/publication/src/file-storage/generated-files.ts:15-18,35-44`, `apps/web/src/pages/(system-admin)/blob-explorer-json-file/index.ts:40,47-50` and `index.njk:85-96`.
  - The route is restricted to System Admin: `download.ts:46`, tested in `download.test.ts:60-65`.
  - The file is sent as an attachment: `download.ts:25-30`.
  - The E2E test downloads both files: `blob-explorer.spec.ts:107-110`.
  - Audit (from "How it works"): `blob-explorer-download.ts:13-22` and `download.ts:23`.
- [x] **Downloaded files open correctly and match what is stored in blob storage.**
  - The buffer is sent unchanged with the right content type and `Content-Length`: `download.ts:25-30`, `generated-files.ts:6-9,27-33`.
  - The unit test checks the exact buffer: `download.test.ts:88`.
  - The E2E test checks the file name and that the size equals the stored blob: `blob-explorer.spec.ts:141-145`. See suggestion 2 for a stronger content check.
- [x] **A clear message is shown when a file isn't available, instead of an error.**
  - The page shows "No PDF available" / "No Excel available": `index.njk:87-89,94-96`, `en.ts:11-12`, tested in `index.njk.test.ts` ("should show the not available text…").
  - A blob that disappears gives a 404 page, not a crash: `download.ts:19-21`, tested in `download.test.ts:151-163`.
  - A storage error is treated as not available: `generated-files.ts:39-43`.
- [x] **The text is available in English and Welsh, and the page meets the WCAG 2.2 AA accessibility standard.**
  - The new keys are in both `en.ts:8-12` and `cy.ts:8-12`. The Welsh download links come from OG CaTH wording (`cy.ts:9-10`). The heading and "No … available" stay English, as agreed in plan decision 4.
  - The download URLs carry `lng=cy`: `index.ts:77-80`.
  - Axe WCAG 2.2 AA scans pass in English and Welsh: `blob-explorer.spec.ts:113-128`.

Tally: 4 of 4 met, 0 partial, 0 not met.

## Next Steps

- [ ] Someone completes the manual check still open in `tasks.md`:
  - download both files locally and open them
  - check a list type with no Excel shows "No Excel available"
  - confirm the `BLOB_EXPLORER_DOWNLOAD` row in the Audit Log list
- [ ] Optional: decide how HEAD requests on the download route should behave (suggestion 1).
- [ ] Optional: make the E2E test stronger with a content hash and an audit-entry check (suggestions 2 and 3).
- [ ] Optional: run the blob availability check in parallel on the page (suggestion 4).

## Overall Assessment

**APPROVED**

There are no critical or high-priority issues, all four acceptance criteria are met, and coverage of the changed files is 100% in every changed workspace. The suggestions are optional. This verdict is advisory, and the open manual check in `tasks.md` still needs a person.

## Update after review (2026-11-19)

- Suggestion 1 (HEAD requests) is fixed. `download.ts` now answers HEAD with `405` and `Allow: GET` before any storage call or audit write. New unit test in `download.test.ts`: "should refuse a HEAD request without reading storage or writing an audit entry". 18/18 tests pass, and `download.ts` is still at 100% statements and branches.
