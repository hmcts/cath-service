# #1499: Blob Explorer: download the generated PDF and Excel files for a publication

## 1. Technical Approach

Add a "Generated files" section to the existing Blob Explorer JSON file page and one new download route beside it.

> **Base branch:** this plan was first drafted on `fix/1190-family-dcl-pdf-legal-advisor`, 27 commits behind `origin/master`. Its findings were then rechecked against `origin/master` (e6e19828). Build from master.

- **Page (GET `/blob-explorer-json-file?artefactId=…`)**: as well as the metadata, the controller asks whether `<artefactId>.pdf` and `<artefactId>.xlsx` exist in the `publications` container. The template then shows a "Download PDF" / "Download Excel" link, or "No PDF available" / "No Excel available".
- **Download (GET `/blob-explorer-json-file/download?artefactId=<uuid>&type=pdf|xlsx`)**: restricted to System Admin. It checks the parameters, reads the blob with `downloadBlob(key, CONTAINER.PUBLICATIONS)`, writes an audit log entry and sends the bytes unchanged as an `attachment` named `<artefactId>.pdf` or `<artefactId>.xlsx`, as OG CaTH does.
- **Business logic stays in libs**: the blob lookup and file-name logic go in `@hmcts/publication`, next to the existing Blob Explorer helpers (`getJsonContent`, `getRenderedTemplateUrl`, `getFlatFileUrl` in `libs/publication/src/repository/service.ts`). The audit helper goes in `@hmcts/system-admin-pages`, next to `logAction`. The controllers in `apps/web` stay thin, the same as the existing page.

### What exists, and what the ticket assumes

| Ticket assumption | Finding |
|---|---|
| `downloadBlob` in `libs/azure-blob` | Exists in `libs/azure-blob/src/blob-client.ts`. It returns a whole `Buffer` (not a stream), or `null` on a 404. **Its default container is `artefact`**, so every call must pass `CONTAINER.PUBLICATIONS`. |
| `getBlobProperties` | Exists in the same file and is exported from `@hmcts/azure-blob`. It returns `{ size }`, or `null` on a 404, and rethrows any other error. It also defaults to the `artefact` container. |
| PDF blob key "as in `pdf-utilities.ts`" | `savePdfToStorage` in `libs/list-types/common/src/pdf/pdf-utilities.ts` always writes `${artefactId}.pdf` to `CONTAINER.PUBLICATIONS`. It is the only PDF writer; `deletePreviousPublicationFiles` in `libs/publication/src/processing/service.ts` uses the same key. No database lookup is needed. |
| Excel `<artefactId>.xlsx` | Written to `CONTAINER.PUBLICATIONS` by `saveExcelToStorage` (`libs/list-types/common/src/excel/excel-utilities.ts`) and `saveExcelFile` (`libs/excel-generation/src/file-storage/file-storage-service.ts`). The public Excel download already reads this key in `getExcelForDownload` (`libs/public-pages/src/flat-file/flat-file-service.ts`). |
| System Admin restriction | Every `(system-admin)` page uses `requireRole([USER_ROLES.SYSTEM_ADMIN])` from `@hmcts/auth` as the first item in its `RequestHandler[]`. |
| "Each download is written to the audit log" | `auditLogMiddleware` (`libs/system-admin-pages/src/audit-log/middleware.ts`, registered in `apps/web/src/app.ts`) **only logs POST/PUT/PATCH/DELETE**. A GET download is never logged automatically, so the route must call `logAction` (`libs/system-admin-pages/src/audit-log/logger.ts`) itself, as `libs/system-admin-pages/src/jurisdiction-management/service.ts` does. |

### Key decisions

- **GET links, not POST forms.** A download is a safe, repeatable read, and a link is the GOV.UK pattern for one. A form would get the middleware's automatic audit logging, but it would make a link into a button for no user benefit.
- **The blob key comes from the artefactId alone.** `type` is checked against a fixed list (`pdf`, `xlsx`) and mapped to an extension. Users never supply any part of the key, so path traversal is not possible.
- **The bytes are sent unchanged** with `res.send(buffer)`, a fixed content type for each type, and `Content-Length`. The file the user gets is the file in storage. `downloadBlob` loads the whole blob into memory. That is fine for these files (Excel generation already stops above `MAX_EXCEL_PAYLOAD_BYTES`). **Agreed:** buffering is acceptable, so no streaming helper is added.
- **The audit write must succeed before any bytes are sent (agreed).** If `logAction` throws, the download fails with a 500 and no file is sent. This is stricter than `auditLogMiddleware`, which only logs failures.
- **The link text shows the file size, as OG CaTH does (agreed).** OG CaTH's `list-download-files` shows "Download this PDF (SIZE) to your device", with the size in KB or MB. `getBlobProperties` already returns `size`, so this costs nothing extra.
- **No translated copies.** Each upload (English or Welsh) is its own artefact, and it gets one PDF in the upload's language (`${artefactId}.pdf`). OG CaTH also generated an `additionalPdf` for some Welsh lists. This service does not, and this ticket does not add it.
- **Audit action** `AuditLogAction.BLOB_EXPLORER_DOWNLOAD = "Blob explorer download"`, stored in the normalised form `BLOB_EXPLORER_DOWNLOAD`. That matches how the middleware stores `BLOB_EXPLORER_RESUBMISSION`, so both Blob Explorer actions look the same in the audit log list.
- **Locale**: the page reads `req.query.lng`, not `res.locals.locale`. Keep that so the page stays consistent with itself. The download link carries `&lng=cy` when the page is in Welsh, so any error page shown from the route is also in Welsh.

## 2. Implementation Details

TEMPLATE SOURCE: n/a — modifies the existing blob-explorer-json-file page; no new rendered page

### Files to change or create

```
libs/publication/src/file-storage/
  generated-files.ts                 NEW  availability check, file size, file fetch
  generated-files.test.ts            NEW
libs/publication/src/index.ts        EDIT export the new functions and types

libs/system-admin-pages/src/audit-log/
  logger.ts                          EDIT add AuditLogAction.BLOB_EXPLORER_DOWNLOAD
  blob-explorer-download.ts          NEW  recordBlobExplorerDownload(user, artefactId, fileType)
  blob-explorer-download.test.ts     NEW
libs/system-admin-pages/src/index.ts EDIT export recordBlobExplorerDownload

apps/web/src/pages/(system-admin)/blob-explorer-json-file/
  index.ts                           EDIT call getGeneratedFileAvailability, pass the result and links to the view
  index.njk                          EDIT add the "Generated files" section
  en.ts / cy.ts                      EDIT new strings
  index.test.ts                      EDIT
  index.njk.test.ts                  EDIT
  download.ts                        NEW  GET [requireRole(SYSTEM_ADMIN), downloadHandler]
  download.test.ts                   NEW

e2e-tests/tests/system-admin/blob-explorer.spec.ts   EDIT extend the existing journey
```

`download.ts` sits beside `index.ts`, the same layout as `apps/web/src/pages/(list-types)/sjp-public-list/download.ts`. simple-router serves it at `/blob-explorer-json-file/download`. `apps/web` only adds route files to an existing page directory, so no new module needs registering.

### `libs/publication/src/file-storage/generated-files.ts`

```ts
export const GENERATED_FILE_TYPES = {
  pdf: { extension: ".pdf", contentType: "application/pdf" },
  xlsx: { extension: ".xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
} as const;
export type GeneratedFileType = keyof typeof GENERATED_FILE_TYPES;

export function isGeneratedFileType(value: unknown): value is GeneratedFileType;
export function getGeneratedFileKey(artefactId: string, type: GeneratedFileType): string; // `${artefactId}${extension}`

// Calls getBlobProperties(key, CONTAINER.PUBLICATIONS) for both types with Promise.all.
// Returns the size in bytes, or null when the file is not available.
// A null result (404) means "not available". Any other error is logged (artefactId and type only)
// and treated as "not available", so a storage outage cannot break the page.
export async function getGeneratedFileAvailability(artefactId: string): Promise<{ pdf: number | null; xlsx: number | null }>;

// Formats a size the way OG CaTH does: KB below 1 MB, otherwise MB, to 2 decimal places (for example "120.45KB").
export function formatFileSize(bytes: number): string;

// downloadBlob(key, CONTAINER.PUBLICATIONS). Returns null on a 404. Other errors are rethrown.
export async function getGeneratedFile(artefactId: string, type: GeneratedFileType): Promise<{ buffer: Buffer; contentType: string } | null>;
```

Do not create a `types.ts`.

### `libs/system-admin-pages/src/audit-log/blob-explorer-download.ts`

```ts
export async function recordBlobExplorerDownload(user: Express.User, artefactId: string, fileType: "pdf" | "xlsx"): Promise<void>
```
This calls `logAction` with `userId`, `userEmail`, `userRole` and `userProvenance` taken from `req.user`, using the same fallbacks the middleware uses (`"unknown"`, `"SYSTEM_ADMIN"`, `"azure-ad"`). It sets `action: "BLOB_EXPLORER_DOWNLOAD"` and `details: "Artefact ID: <id>; File: PDF|Excel; Status: Completed successfully"`. It does **not** catch errors. A failed audit write is rethrown, so the route fails closed (agreed).

### Page controller changes (`index.ts`)

- After `metadata` is loaded, call `getGeneratedFileAvailability(artefactId)`.
- Pass `pdfDownloadUrl` and `excelDownloadUrl` to the view, or `null` when that file is not available. Also pass `pdfFileSize` and `excelFileSize`, formatted with `formatFileSize`. Each URL is `/blob-explorer-json-file/download?artefactId=${encodeURIComponent(artefactId)}&type=pdf` (or `type=xlsx`), plus `&lng=cy` when the page is in Welsh.

### Template changes (`index.njk`)

Add this after the metadata `govukSummaryList` and before the "Link to rendered template" paragraph:

```njk
<h2 class="govuk-heading-m govuk-!-margin-top-6">{{ jsonFileGeneratedFilesHeading }}</h2>
<ul class="govuk-list">
  <li>{% if pdfDownloadUrl %}<a href="{{ pdfDownloadUrl }}" class="govuk-link">{{ jsonFileDownloadPdf | replace("SIZE", pdfFileSize) }}</a>{% else %}{{ jsonFileNoPdf }}{% endif %}</li>
  <li>{% if excelDownloadUrl %}<a href="{{ excelDownloadUrl }}" class="govuk-link">{{ jsonFileDownloadExcel | replace("SIZE", excelFileSize) }}</a>{% else %}{{ jsonFileNoExcel }}{% endif %}</li>
</ul>
```

- This uses plain GOV.UK typography and links and needs no JavaScript.
- The link text is unique and makes sense on its own (WCAG 2.4.4). The heading keeps the page outline in order (h1 > h2).
- The "not available" text is ordinary body text, not error styling, so it is not mistaken for a failure.

### New content (`en.ts` / `cy.ts`)

| Key | English | Welsh |
|---|---|---|
| `jsonFileGeneratedFilesHeading` | Generated files | Generated files |
| `jsonFileDownloadPdf` | Download PDF (SIZE) | Llwytho’r PDF (SIZE) i lawr |
| `jsonFileDownloadExcel` | Download Excel (SIZE) | Llwytho’r daenlen Excel (SIZE) i lawr |
| `jsonFileNoPdf` | No PDF available | No PDF available |
| `jsonFileNoExcel` | No Excel available | No Excel available |

The Welsh download wording is adapted from OG CaTH's `list-download-files` strings ("Llwytho’r PDF (SIZE) yma ar eich dyfais", "Llwytho’r daenlen Microsoft Excel (SIZE) yma ar eich dyfais"). This follows OG CaTH's Blob Explorer, which translates its download link but leaves the page's other body text in English in its Welsh file (agreed 2026-11-19). The heading and the "not available" strings are therefore English in both `en.ts` and `cy.ts`. The existing labels on this page are left alone. Copying OG's Welsh titles and headings onto all six Blob Explorer pages is a separate ticket, #1583.

### Download route (`download.ts`)

Middleware chain: `export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), downloadHandler];`

`downloadHandler`:
1. Read `artefactId` and `type` from `req.query`. Check `artefactId` against the UUID regex (the same one as `sjp-download-shared.ts`) and `isGeneratedFileType(type)`. If either fails, return `res.status(400).render("errors/400", …)`.
2. `getGeneratedFile(artefactId, type)`. If it returns `null` (no such artefact, a list type that never generates this format, or the blob was removed after the page loaded), return a 404 error page. No database lookup is needed, because the key comes from the artefactId alone.
3. `await recordBlobExplorerDownload(req.user, artefactId, type)`. If this throws, the `catch` in step 5 renders a 500 and no file is sent.
4. Set these headers:
   - `Content-Type`: the type's content type
   - `Content-Length`: `buffer.length`
   - `Content-Disposition`: `attachment; filename="<artefactId>.pdf"` or `"<artefactId>.xlsx"`, matching OG CaTH. The artefactId is a validated UUID, so no escaping is needed.
   - `Cache-Control: no-store, no-cache, must-revalidate, private`
   - `X-Content-Type-Options: nosniff`

   Then `res.send(buffer)`.
5. Wrap steps 2–4 in `try/catch`. On an unexpected error (a storage error other than 404, or an audit write failure), log the artefactId and type only and render `errors/500` with status 500.

### API endpoints / database

- No API (`apps/api`) changes.
- No Prisma schema change or migration. The audit entry uses the existing `audit_log` table through `prisma.auditLog.create`.

## 3. Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| `artefactId` missing on the page | No change: redirect to `/blob-explorer-locations`. |
| `artefactId` missing or not a UUID on the download route | 400 error page. It is checked before Prisma sees it, because `artefact_id` is `@db.Uuid` and a bad value would make Prisma throw. |
| `type` missing or not `pdf`/`xlsx` (for example `../x`, `json`, `PDF`) | 400 error page. No blob call is made. |
| Path traversal in a blob key | Not possible: the key is `${validatedUuid}${allowListedExtension}`. |
| Artefact not found | The download route finds no blob and shows a 404 error page. The page itself keeps its existing `jsonFileError` summary. |
| File missing in storage (list type has no Excel generator, PDF generation failed or was skipped, payload too large) | The page shows "No PDF available" / "No Excel available". No link is shown, so the user never reaches a 404. |
| Blob deleted between the page check and the click (for example a publication update runs `deletePreviousPublicationFiles`) | `downloadBlob` returns `null`, so a 404 error page is shown. No audit entry is written, because nothing was downloaded. |
| `getBlobProperties` throws something other than a 404 while the page loads | Logged, and treated as not available. The rest of the page still renders. |
| `downloadBlob` throws something other than a 404 | 500 error page. Logs contain the artefactId and type only. |
| Audit write fails | Fail closed: 500 error page and no file is sent. The error is logged with the artefactId and type only. |
| User is not a System Admin, or not signed in | `requireRole` handles it: an unauthenticated user goes to sign-in; an admin with another role goes to their own dashboard. |
| Flat-file publication opened on this page | Nothing is generated for flat files in `publications`, so both rows show "not available". No special handling is needed. |
| Welsh-language publication (`language: WELSH`) | The PDF is in Welsh because it was generated that way. English and Welsh uploads are separate artefacts, so their file names (`<artefactId>.<ext>`) never clash. |

## 4. Acceptance Criteria Mapping

| AC | How it is met | How it is checked |
|---|---|---|
| A System Admin can download the PDF and the Excel file for a publication when they exist | The links are shown only when `getBlobProperties` finds the blob. The `download.ts` route is behind `requireRole([SYSTEM_ADMIN])` and sends the file as an attachment. | `download.test.ts` (happy path for both types), `index.test.ts` (URLs passed only when available), `index.njk.test.ts` (links shown/hidden), the E2E download step |
| The downloaded files open correctly and match what is stored | The buffer from `downloadBlob` is sent unchanged with the correct `Content-Type`, `Content-Length` and `attachment` disposition. | `download.test.ts` checks that `res.send` gets the exact mocked buffer and checks the headers. The E2E test checks `download.suggestedFilename()` is `<artefactId>.pdf`/`.xlsx`, and that the saved file's size equals the blob size (via test-support `GET /test-support/flat-files?artefactId=&extension=` → `sizeBytes`). |
| A clear message instead of an error when a file isn't available | The template shows "No PDF available" / "No Excel available". The route returns a 404 page, not a crash, if a file disappears. | `index.njk.test.ts` checks both the present and absent cases. `download.test.ts` covers a missing blob giving a 404 render. |
| English and Welsh, WCAG 2.2 AA | All new text is in `en.ts`/`cy.ts` with matching keys. The page uses only GOV.UK typography, a heading and links. | `index.njk.test.ts` (Welsh render and key parity). The E2E test runs an Axe scan with `wcag22aa` tags and checks the Welsh toggle on the page. |
| (How it works) Each download is audit-logged | `recordBlobExplorerDownload` → `logAction` with `BLOB_EXPLORER_DOWNLOAD`. | `blob-explorer-download.test.ts`, and `download.test.ts` checks the call and that no audit is written on a 404 |

## 5. Test Scenarios

There is one scenario per user journey. Error paths are tested at unit level inside each journey's test file.

1. **Admin downloads the generated PDF and Excel for a publication** (happy path, both files exist)
   - Unit tests in `download.test.ts`:
     - For `type=pdf` and `type=xlsx`, the response has the correct content type, `attachment; filename="<artefactId>.<ext>"`, and `Content-Length`.
     - `res.send` gets the exact buffer.
     - `recordBlobExplorerDownload` is called with the user, the artefactId and the type.
   - Unit tests in `generated-files.test.ts`:
     - The key is built correctly.
     - `CONTAINER.PUBLICATIONS` is passed every time.
     - `formatFileSize` gives KB below 1 MB and MB above it.
   - E2E step: on the JSON file page, wait for the `download` event after clicking "Download PDF", then "Download Excel", and check each file's name and size.

2. **Admin views a publication where one or both files were never generated**
   - Unit tests in `generated-files.test.ts`: availability for both, only the PDF, only the Excel, neither, and a non-404 storage error treated as not available.
   - Unit tests in `index.test.ts`: `pdfDownloadUrl`/`excelDownloadUrl` are `null` when unavailable, and the URLs carry `lng=cy` in Welsh.
   - Template tests in `index.njk.test.ts`:
     - Each link is shown when its URL is given and is replaced by the "No … available" text when it is not.
     - The section is not shown when the page has an error.
   - E2E step: check that a "No … available" message or a link is shown for each format.

3. **Admin uses the page in Welsh**
   - Template tests in `index.njk.test.ts`: with the `cy` locale the Welsh download link text appears, and `en`/`cy` have the same keys.
   - E2E step: switch to Cymraeg on the JSON file page, check the Welsh download link text, and run an Axe scan with the `wcag2a`, `wcag2aa`, `wcag21aa` and `wcag22aa` tags.

4. **Download request fails** (error paths the AC does not name). Unit tests in `download.test.ts`:
   - `artefactId` missing or not a UUID → 400.
   - `type` missing, unknown or a traversal attempt → 400, and `downloadBlob` is not called.
   - Blob missing at download time → 404 with no audit entry.
   - `downloadBlob` throws → 500.
   - The audit write fails → 500, and `res.send` is not called.

5. **A user who is not a System Admin tries the download URL**
   - Unit test in `download.test.ts`: `GET[0]` is the `requireRole` middleware for `SYSTEM_ADMIN`. This is checked by mocking `@hmcts/auth`, as `files/[filename].test.ts` does.
   - Unit tests in `blob-explorer-download.test.ts`: `logAction` gets the action, details and user fields with their fallbacks, and an error from `logAction` is rethrown.

## 6. Decisions (agreed 2026-11-19)

1. **Audit write fails:** fail closed. 500, no file.
2. **File name:** `<artefactId>.pdf` / `<artefactId>.xlsx`, matching OG CaTH, so testers can compare files directly. Uploads are never translated: an English and a Welsh upload are separate artefacts, each with its own files.
3. **File size:** shown in the link text, as OG CaTH does.
4. **Welsh:** follow OG CaTH. Only the two download links get Welsh; the new heading and "No … available" text stay English in `cy.ts`. Generated files are always in the upload's own language (a WELSH upload is generated with the `cy` locale), and the route serves them unchanged. The page's existing untranslated title and heading are #1583.
5. **Streaming:** buffering the whole file is acceptable.
6. **E2E:** on `origin/master` the Blob Explorer suite is already un-skipped (`test.describe("Blob Explorer", …)`, one `@nightly` journey). Extend that journey and do not add a new test.
7. **Flat-file page:** out of scope. A flat file has no generated PDF or Excel, and `blob-explorer-flat-file` already links to the uploaded file itself (`flatFileLinkToFile`).
8. **SJP container bug:** already fixed on master by #1454 (c78147d8). Nothing to raise.


## 7. CLARIFICATIONS NEEDED

None outstanding.
