# Technical Plan — #941 Additional download file format (Excel) for Rolls Building hearing lists

## 0. Blocking dependency — read this first

**#659 is still OPEN and nothing from it has landed on `master`.** Verified against the working tree at commit `2800472`:

| Expected by this ticket | Actual state on `master` |
|---|---|
| `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` is a non-strategic Excel-upload list | `libs/list-types/common/src/list-type-data.ts:751` — `provenance: "CFT_IDAM"`, `isNonStrategic: false`, i.e. still a **flat-file** list under the "High Court flat-file daily cause lists (manual upload)" block |
| `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` exists in `list-type-data.ts` | **No entry at all** |
| `libs/list-types/business-and-property-.../`, `libs/list-types/interim-applications-chd-.../` | **Do not exist** |
| `apps/web/src/pages/(list-types)/business-and-property-daily-list/`, `.../interim-applications-chd-daily-cause-list/` | **Do not exist** |

Consequences for sequencing:

* The Excel-retention change (§3) hooks into the **non-strategic** upload confirm path. For `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` that path is not reachable today, because the list type is flat-file. Until #659 flips it to `isNonStrategic: true` with an Excel converter, §3 is a no-op for that list and **AC "the uploaded excel file will be re-used" cannot be met**.
* The download-journey changes (§5) attach to page directories that #659 creates.
* **§3 and §4 (the retention hook and the shared-helper promotion) can be built and merged now** against the existing non-strategic machinery, guarded by an allow-list. They are additive and inert until the two list-type names exist.

**Recommended sequencing:** land §3 + §4 (plus their unit tests) as a first PR. Hold §5 until #659 merges, then wire the two page directories in a second, small PR. Do not start §5 speculatively — the module layout, locale export names and template names all come from #659.

## 1. Technical Approach

### 1.1 The gap

The Excel notification plumbing **already exists and works**. Verified:

* `libs/notifications/src/notification/notification-service.ts:474` — `buildEmailDataWithFiles` unconditionally does `downloadBlob(\`${artefactId}.xlsx\`, CONTAINER.PUBLICATIONS)` for every notification, then computes `hasExcel` and `excelUnder2MB` (`MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024`, line 120).
* `libs/notifications/src/govnotify/template-config.ts` — `getSubscriptionTemplateId({ isSjp, hasPdf, hasExcel, filesUnder2MB })` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` whenever `hasPdf && hasExcel` and both are under 2MB. Not SJP-specific.
* `libs/publication/src/repository/queries.ts:189` — artefact deletion already removes `${artefactId}.xlsx`.

So **no change to `libs/notifications` is required**. The email links appear the moment the blob exists. The AC "links to download both file types are displayed in the email notifications" is satisfied entirely by making the blob exist.

The actual gap is that the uploaded workbook is discarded. `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` converts the `.xlsx` to JSON, stores only the JSON, and comments:

```ts
// Store converted JSON in blob — original Excel is not stored (no value after conversion)
await saveUploadedFile(artefactId, artefactId, Buffer.from(JSON.stringify(jsonData)));
```

Nothing writes `${artefactId}.xlsx`, so every non-strategic list falls back to the PDF-only template.

### 1.2 Chosen approach: retain the upload, do not regenerate

Persist the original upload buffer to `${artefactId}.xlsx` at confirm time, for an explicit allow-list of list type names.

**Rejected alternative:** adding an `EXCEL_GENERATOR_REGISTRY` entry (`libs/publication/src/processing/service.ts:363`) that rebuilds a workbook from the converted JSON, as `MAGISTRATES_PUBLIC_LIST` and the four SJP lists do. That contradicts the AC ("the uploaded excel file will be re-used"), duplicates the source of truth, and discards the uploader's formatting. It also makes the field-parity AC something to be maintained rather than something true by construction.

Because the download *is* the uploaded file, and the PDF is generated from the JSON converted from that same file, the AC "all the data fields available in the current downloadable PDF file should also be available on the excel downloadable file" holds by construction. `CHD_KB_EXCEL_CONFIG` (`libs/list-types/chd-kb-common/src/conversion/chd-kb-excel-config.ts`) requires exactly seven fields — `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`, `additionalInformation` — all of which the ChD/KB PDF renders. A parity test still gets written so the AC is verified rather than asserted.

### 1.3 Allow-list, not a global switch

`keepsUploadedExcel(listTypeName)` gates the new write. Turning retention on globally would give ~15 other non-strategic list types an Excel link in their subscriber emails overnight (they would all flip from `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` to `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`). This ticket authorises two lists only. The allow-list is the single place a future ticket adds more.

Keyed on the stable `listTypeName` string throughout — no `ListType.id` anywhere.

### 1.4 Ordering constraint

`processPublication()` is fire-and-forget (`.catch(...)`, not awaited) and is what eventually calls `sendPublicationNotificationsForArtefact` → `buildEmailDataWithFiles`. The Excel blob must therefore be written **synchronously, awaited, before** `processPublication()` is invoked, so the notification builder's blob probe finds it. This is a real ordering dependency and must be covered by a call-order assertion in the test, not just a "was it called" assertion.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — no new rendered list-type view is created by this ticket. The two Rolls Building list pages and their `.njk` templates are delivered by #659. The download-journey templates (`disclaimer`, `files`) are copied from the existing in-repo SJP templates (`apps/web/src/pages/(list-types)/sjp-press-list/list-download-{disclaimer,files}.njk`), which are the direct precedent for this journey in this codebase.

### 3. Change 1 — retention allow-list + persist the workbook

**New file:** `libs/list-types/common/src/excel/excel-download-list-types.ts`

```ts
// List types whose uploaded .xlsx is retained in blob storage so it can be offered as a
// download and linked from subscriber emails. Keyed on the stable listTypeName.
const EXCEL_DOWNLOAD_LIST_TYPE_NAMES = new Set([
  "BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST",
  "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST"
]);

export function keepsUploadedExcel(listTypeName: string | undefined | null): boolean {
  return !!listTypeName && EXCEL_DOWNLOAD_LIST_TYPE_NAMES.has(listTypeName);
}
```

Exported from `libs/list-types/common/src/index.ts` alongside the existing `saveExcelToStorage` export (line 30). Const at the top, exported function next, per the module-ordering rule.

> `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` is a **guess** — there is no such entry on `master`. A wrong string fails silently (the `Set.has` just returns `false`). Mitigation: a test that asserts every name in the allow-list resolves to an active entry in `listTypeData`. That test will fail until #659 lands, which is the correct signal.

**Changed file:** `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`

Inside the existing `if (isExcelFile && selectedListType?.isNonStrategic)` → `if (listTypeName && hasConverterForListTypeName(listTypeName))` branch, after `updateSourceArtefactId(...)` and before `extractAndStoreArtefactSearch(...)`:

```ts
if (keepsUploadedExcel(listTypeName)) {
  await saveExcelToStorage(artefactId, uploadData.file);
}
```

* Add `keepsUploadedExcel` and `saveExcelToStorage` to the existing dynamic `await import("@hmcts/list-types-common")` in that branch — same module, no new import cost.
* `saveExcelToStorage` (`libs/list-types/common/src/excel/excel-utilities.ts:38`) already writes `${artefactId}.xlsx` to `CONTAINER.PUBLICATIONS` with the correct `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` content type. No new storage helper.
* `uploadData.file` is the same `Buffer` passed to `convertExcelForListTypeName`, so the stored bytes are byte-for-byte the admin's upload.
* Awaited, inside the existing `try/catch`. A storage failure re-renders the summary with the processing error rather than half-publishing.
* Replace the stale comment `// Store converted JSON in blob — original Excel is not stored (no value after conversion)` — it becomes false for allow-listed types.
* Republication overwrites the blob (same `artefactId` for the same location/list type/content date via `createArtefact`), so `uploadBlob` replaces the previous workbook. No extra handling.
* **No change to `EXCEL_GENERATOR_REGISTRY`.** `generatePublicationExcel()` returns `{}` for these list types, `result.excelPath` stays `undefined`, and that is harmless — `buildEmailDataWithFiles` probes the blob by convention and ignores any passed `excelPath`.

### 4. Change 2 — promote the SJP download helpers to shared

**Rename:** `apps/web/src/pages/(list-types)/sjp-download-shared.ts` → `apps/web/src/pages/(list-types)/list-download-shared.ts`

The four exports are already list-type agnostic — `handleBlobDownload` allows exactly `{pdf, xlsx}`, `getAvailableFiles` probes `${artefactId}.pdf` and `${artefactId}.xlsx`, `formatFileSize` is pure, and `createListDownloadFilesHandler` derives its sibling path from `req.path.replace("/list-download-files", "")`. Only the filename says "sjp".

Four importers to update (verified — no others):

* `sjp-press-list/list-download-files.ts`, `sjp-press-list/download.ts`
* `sjp-public-list/list-download-files.ts`, `sjp-public-list/download.ts`

Pure rename, no behaviour change for SJP.

**Add an optional template argument** so a shared template can be used without colliding with the page-local SJP ones:

```ts
export function createListDownloadFilesHandler(
  en: object,
  cy: object,
  downloadFilesKey: string,
  template = "list-download-files"
): RequestHandler
```

The default preserves current SJP behaviour exactly.

**New shared templates** — a directory with no `index.ts`, so the router creates no route, but `collectViewPaths` still registers it as a Nunjucks search path:

* `apps/web/src/pages/(list-types)/list-download/files.njk` → rendered as `"list-download/files"`
* `apps/web/src/pages/(list-types)/list-download/disclaimer.njk` → rendered as `"list-download/disclaimer"`

Both start as copies of `sjp-press-list/list-download-{files,disclaimer}.njk`, which are already fully driven by the `t` object.

**Path-qualified names are deliberate.** `sjp-press-list/` and `sjp-public-list/` each ship a template literally named `list-download-files.njk`, and every page directory becomes a search path, so the bare name `"list-download-files"` already resolves to whichever directory registers first. (This is a pre-existing latent ambiguity in the SJP pages — out of scope to fix here, but do not make it worse.) Adding a third bare `list-download-files.njk` would be a real bug.

**Also move** `createRequireVerifiedWithProvenance` from `sjp-press-list/require-verified-with-provenance.ts` to `apps/web/src/pages/(list-types)/require-verified-with-provenance.ts` so both SJP and the new pages share one copy. Note the two SJP lists currently differ: `sjp-press-list` uses the provenance-checking factory, `sjp-public-list` uses a bare inline `req.user?.role === "VERIFIED"` check. Use the **provenance-checking** version for the new pages — it also validates that the artefact exists and that the user's provenance is in the list type's `allowedProvenance`.

### 5. Change 3 — the two Rolls Building page directories *(blocked on #659)*

For each of `apps/web/src/pages/(list-types)/business-and-property-daily-list/` and `.../interim-applications-chd-daily-cause-list/`:

| File | Contents |
|---|---|
| `require-verified.ts` | `export const requireVerified = createRequireVerifiedWithProvenance();` |
| `list-download-disclaimer.ts` | `GET` renders `"list-download/disclaimer"`; `POST` requires `agreed`, else re-renders with `errors: [{ text: t.errorCheckbox, href: "#agreed" }]`; on success redirects to `<prefix>/list-download-files?artefactId=<uuid>`. Mirrors `sjp-public-list/list-download-disclaimer.ts`. |
| `list-download-files.ts` | `export const GET = [requireVerified, createListDownloadFilesHandler(en, cy, "downloadFiles", "list-download/files")]` |
| `download.ts` | `export const GET = [requireVerified, (req, res) => handleBlobDownload(req, res)]` |

**Changed:** each list's `index.ts` (from #659) gains the download-button data.

Both sibling ChD/KB lists use `createSimpleListTypeHandler` (see `financial-list-chd-kb-daily-cause-list/index.ts`), so #659's pages almost certainly will too. Its `RenderCallback` is typed `(params: { artefact, jsonData, locale, res }) => Promise<void> | void` (`list-type-handler.ts:15`) — **async render is already supported**, but the callback does **not receive `req`**, and the button needs `req.user.role` and `req.path`.

Two options; pick the first:

1. **Extend `RenderCallback` to pass `req`** (`apps/web/src/pages/(list-types)/list-type-handler.ts`). Additive and backwards compatible — existing callbacks ignore the extra property. Preferred: `res.req` works but reads as a workaround and is untyped in this codebase's usage.
2. Use `res.req` inside the render callback. Avoid unless option 1 turns out to ripple.

Inside `render`:

```ts
const isVerifiedUser = req.user?.role === "VERIFIED";
const [pdfProps, excelProps] = isVerifiedUser
  ? await Promise.all([getBlobProperties(`${artefact.artefactId}.pdf`), getBlobProperties(`${artefact.artefactId}.xlsx`)])
  : [null, null];
const downloadDisclaimerUrl =
  isVerifiedUser && (pdfProps || excelProps)
    ? `${req.path}/list-download-disclaimer?artefactId=${artefact.artefactId}`
    : null;
```

The probes are skipped entirely for unverified users — two storage round-trips on every public page view of a high-traffic list is not worth paying for a button nobody will see.

Template addition, matching `sjp-press-list.njk`:

```njk
{% if downloadDisclaimerUrl %}
  <a href="{{ downloadDisclaimerUrl }}" role="button" draggable="false"
     class="govuk-button" data-module="govuk-button">{{ t.downloadCopy }}</a>
{% endif %}
```

### 6. Content

New locale keys go in the two list-type libs delivered by #659 (`libs/list-types/<list>/src/locales/{en,cy}.ts`), consumed via `t`. Never hardcoded in a controller or template. Key sets must match between `en` and `cy` (asserted in the template tests).

Wording is taken verbatim from the SJP journey (`libs/list-types/sjp-press-list/src/sjp-press-list/en.ts`) so the two journeys read identically.

| Key | English |
|---|---|
| `downloadCopy` | "Download a copy" |
| `disclaimer.pageTitle` | "Terms and conditions" |
| `disclaimer.disclaimerText` | "As a verified user of the court and tribunal hearings service you are authorised to download this file containing personal protected data." |
| `disclaimer.responsibility` | "It is your responsibility to ensure you comply with any GDPR and/or reporting restrictions regarding the content of this file." |
| `disclaimer.checkboxLabel` | "Please tick this box to agree to the above terms and conditions" |
| `disclaimer.continueButton` | "Continue" |
| `disclaimer.errorTitle` | "There is a problem" |
| `disclaimer.errorCheckbox` | "You must agree to the terms and conditions" |
| `downloadFiles.pageTitle` | "Download your file" |
| `downloadFiles.saveInstructions` | "Save your file somewhere you can find it. You may need to print it or show it to someone later." |
| `downloadFiles.downloadPdfLink` | "Download this PDF" |
| `downloadFiles.downloadExcelLink` | "Download this Microsoft Excel spreadsheet" |
| `downloadFiles.toDevice` | "to your device" |
| `downloadFiles.contactInfo` | "If you have any questions, call 0300 303 0656." |

Copy the corresponding Welsh strings from the SJP `cy.ts` where they exist; use `[WELSH TRANSLATION REQUIRED: '<english>']` for any that do not. File sizes are appended at render time by `formatFileSize` (`312.4KB`, `1.2MB`, `842B`) and are not translated.

No email content change — the Notify PDF+Excel template supplies both link labels.

### 7. URLs

New, for each of the two list paths (`<list>`):

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/<list>/list-download-disclaimer?artefactId=<uuid>` | VERIFIED + provenance | Terms and conditions page |
| POST | `/<list>/list-download-disclaimer` | VERIFIED + provenance | 302 to `/<list>/list-download-files?artefactId=<uuid>`, or 200 re-render with errors |
| GET | `/<list>/list-download-files?artefactId=<uuid>` | VERIFIED + provenance | Download your file page |
| GET | `/<list>/download?artefactId=<uuid>&type=pdf\|xlsx` | VERIFIED + provenance | File stream, `Content-Disposition: attachment` |

Paths come from directory + file nesting via page auto-discovery, exactly as under `sjp-press-list/`. Query strings are the only parameter carrier. `?lng=cy` is honoured throughout by the existing locale middleware.

### 8. Database / API

No schema changes. No new API routes. No new environment variables — `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is already configured and in use by the magistrates and SJP lists.

### 9. Non-goals

* No change to `libs/notifications` (template selection and attachment already work).
* No new or changed GOV.UK Notify templates.
* No change to blob retention/deletion (`queries.ts:189` already deletes `.xlsx`).
* No Excel generation from JSON for these list types.
* No change to SJP behaviour beyond the file rename and the defaulted template argument.
* No backfill of artefacts published before this change.

## 10. Error Handling & Edge Cases

### 10.1 Relied-on existing validation (no new upload validation)

| Rule | Where |
|---|---|
| Extension must be `.xlsx` (case-insensitive); `.xls` rejected | `libs/admin-pages/src/manual-upload/validation.ts` |
| Max 2MB | multer limit + `LIMIT_FILE_SIZE` handling in `non-strategic-upload/index.ts` |
| Workbook converts cleanly for the list type | `convertExcelForListTypeName` on the upload page |
| Converted JSON satisfies the list-type schema | the list type's `validate*` wrapper |

Because only a validated `.xlsx` under 2MB reaches confirm, the stored blob is always a well-formed workbook that fits Notify's 2MB link limit.

### 10.2 Download journey

| Input | Rule | Failure |
|---|---|---|
| `artefactId` | Required, UUID-shaped | Pages: redirect `/sign-in` (auth middleware runs first). Download route: `400 {"error":"Invalid request"}` |
| `artefactId` | Must resolve to an existing artefact | Redirect `/sign-in` from middleware; `404` from the files page if no blobs exist |
| `type` | Exactly `pdf` or `xlsx` | `400 {"error":"Invalid request"}` |
| User | `role === "VERIFIED"` and `provenance` set, provenance in the list type's `allowedProvenance` | `session.returnTo` set, redirect `/sign-in` |
| `agreed` | Present on disclaimer POST | 200 re-render with error summary + inline error |
| Requested blob | Exists in `PUBLICATIONS` | `404 {"error":"File not found"}` |

The download route sets `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate`. Existing helper behaviour — must not be weakened.

### 10.3 Edge cases

| Case | Behaviour |
|---|---|
| Artefact published before this change (no `.xlsx`) | `getAvailableFiles` returns PDF only; files page shows one link; email uses the PDF-only template. No error. |
| Republication with a corrected workbook | Same `artefactId`, `uploadBlob` overwrites, subscribers get a fresh email linking the new file. |
| Upload at exactly 2MB (2,097,152 bytes) | Not `< MAX_PDF_SIZE_BYTES`, so `filesUnder2MB` is false and the **no-links** template is used. Consistent with existing large-PDF behaviour; not a regression, but worth knowing. |
| `saveExcelToStorage` throws at confirm | Existing `try/catch` re-renders the summary with the processing error. The artefact row and JSON blob are already persisted, so the admin retries confirm; `createArtefact` is upsert-shaped so the retry reuses the same artefact. |
| PDF generation fails but Excel stored | `getSubscriptionTemplateId` has an Excel-only template **for SJP only**. For a non-SJP list with `hasExcel && !hasPdf` it falls through to `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` — an email with a PDF link and no PDF. Pre-existing, but this ticket makes it reachable for a non-SJP list for the first time. See Q5; recommend a separate ticket, not scope creep here. |
| Non-allow-listed non-strategic list | No `.xlsx` written, behaviour identical to today. Must be asserted by test. |
| JSON (non-Excel) upload | Takes the `else` branch, `keepsUploadedExcel` never consulted, no `.xlsx` written. |

## 11. Acceptance Criteria Mapping

| AC | How satisfied | Verified by |
|---|---|---|
| Excel and PDF are downloadable options for both Rolls Building lists | §3 writes `${artefactId}.xlsx`; §5 exposes the disclaimer → files → download journey; PDF already generated by `processPublication` | Unit tests §12.2/§12.4; E2E journey §12.7 |
| The uploaded excel file is re-used | `saveExcelToStorage(artefactId, uploadData.file)` stores the exact upload buffer; no `EXCEL_GENERATOR_REGISTRY` entry added | Unit test asserting the buffer passed to storage is identity-equal to the staged upload buffer |
| All PDF data fields present in the Excel | True by construction — the download *is* the file the PDF was derived from. `CHD_KB_EXCEL_CONFIG` requires all seven fields (`judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`, `additionalInformation`) and the PDF renders all seven | Parity test §12.6 |
| Links to both file types in email notifications | No code change needed — `buildEmailDataWithFiles` probes `${artefactId}.xlsx` and `getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both exist under 2MB | Unit test §12.3 asserting a non-SJP Rolls Building artefact selects the PDF+Excel template |

## 12. Test Scenarios

### 12.1 `libs/list-types/common/src/excel/excel-download-list-types.test.ts`
* `true` for both Rolls Building names
* `false` for `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (a non-strategic list deliberately outside the allow-list)
* `false` for `undefined`, `null` and `""`
* Every name in the allow-list resolves to an active entry in `listTypeData` — catches a typo that would silently disable the feature

### 12.2 `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts`
* Stores `${artefactId}.xlsx` for an allow-listed list type, asserting the buffer passed to storage is **the same buffer** that came out of the staged upload (byte-for-byte reuse, not regeneration)
* Stores nothing for a non-strategic list type outside the allow-list
* Stores nothing for a JSON upload
* Asserts **call ordering**: Excel storage resolves before `processPublication` is invoked
* Still stores the JSON blob, calls `updateSourceArtefactId`, and extracts search data — the step is additive
* Re-renders the summary with the processing error (no redirect to success) when Excel storage throws
* Fixture uses `listTypeId: 999` with the real `listTypeName`, proving ID-independence

### 12.3 `libs/notifications/src/notification/notification-service.test.ts`
* Non-SJP Rolls Building artefact with both blobs → PDF+Excel template, both buffers attached
* Excel blob absent → PDF-only template
* Either file ≥ 2MB → no-links template
* (SJP equivalents exist; these prove non-SJP takes the PDF+Excel branch rather than the SJP Excel-only branch)

### 12.4 Download journey handlers
* `list-download-files.ts`: both files with formatted sizes when both blobs exist; PDF only when Excel absent; 404 when neither; 400 for malformed `artefactId`; Welsh content when locale is `cy`; renders the **path-qualified** template name
* `list-download-disclaimer.ts`: renders terms; redirects to files page when `agreed` present; re-renders with error summary + inline error when absent; `artefactId` survives the redirect
* `download.ts`: streams Excel with the spreadsheet content type and attachment disposition; streams PDF; 400 for `type=csv`; 400 for non-UUID `artefactId`; 404 when blob missing; sets the no-store cache headers
* Auth middleware on all three routes: unauthenticated, non-`VERIFIED`, and `VERIFIED`-without-matching-provenance all redirect to `/sign-in` with `returnTo` set
* Renamed shared module: existing SJP tests must still pass unchanged (regression guard on the rename)

### 12.5 Template tests (Vitest + Cheerio via `@hmcts/test-support`)
* List page renders the "Download a copy" button when `downloadDisclaimerUrl` is set, and renders **no button element** when it is null — assert both directions
* Button `href` carries the `artefactId`
* `list-download/files.njk`: one link per file entry; PDF entry uses the PDF label, Excel entry the spreadsheet label; size label inside the link text; no links when `files` is empty
* `list-download/disclaimer.njk`: checkbox and Continue button render; error summary with the expected message only when `errors` is set
* Welsh render of all three templates shows Welsh headings/labels
* Locale key parity: `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`, including nested `disclaimer` and `downloadFiles`

### 12.6 Parity test
* Assert the list type's Excel converter config field set and the PDF template's column set cover the same seven ChD/KB fields, so adding a field to one and not the other fails CI

### 12.7 E2E (Playwright, `e2e-tests/tests/`)
Minimum test count — one journey per user flow, with validation, Welsh and Axe checks **inline**:

* **`rolls-building-list-download.spec.ts` (`@nightly`)** — sign in as a verified user; seed/publish a Business and Property Rolls Building artefact with a PDF and an Excel; open the list page and run Axe; select "Download a copy"; submit the disclaimer **without** ticking to assert the validation error and run Axe on the error state; switch to Welsh and assert the Welsh terms wording; tick and continue; assert both download links with size labels and run Axe; download the Excel and assert filename + non-zero size; download the PDF; sign out and request the download URL directly, expecting a redirect to `/sign-in` with no file body
* **Admin publish leg** — extend the existing non-strategic upload E2E rather than adding a spec: upload a Rolls Building `.xlsx`, confirm, then assert the published list page offers both formats. Exercises the store-on-confirm step end to end.

The second list type is covered by unit/template tests for its route wiring — a duplicate E2E journey adds runtime without adding coverage.

## 13. Accessibility

WCAG 2.2 AA. Specific to this change:

* **Download button** — `<a role="button" class="govuk-button" data-module="govuk-button">`, matching existing SJP markup: keyboard focusable, activates on Enter, GOV.UK focus style, target well above 44×44px. "Download a copy" is meaningful out of context (2.4.4).
* **Terms page** — `<h1>` matches `<title>`; `govukCheckboxes` associates label with input (1.3.1, 3.3.2). On error the summary is first in the content area, receives focus on load, and each item links to the offending input (3.3.1); the inline message is wired via `aria-describedby` by the macro; error is not colour-only (1.4.1); `<title>` is prefixed "Error: ".
* **Download files page** — `<h1>` matches `<title>`; each link's accessible name includes format, size and destination ("Download this Microsoft Excel spreadsheet (48.2KB) to your device") so a screen-reader user knows what they are getting before activating an unexpected download (2.4.4); size is text, not an icon or colour cue; reading order matches visual order (1.3.2).
* **General** — no new JavaScript; the whole journey works JS-disabled (standard POST form, plain links). Every page extends `layouts/base-template.njk`, inheriting skip link, header, language toggle and footer. No bespoke colours. Welsh sets `<html lang="cy">` via the layout, so all new strings must exist in `cy.ts`. Axe runs inline in the E2E journey on the list page, both disclaimer states, and the files page.

## CLARIFICATIONS NEEDED

1. **#659 is not merged — confirm sequencing.** `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` is still a flat-file `CFT_IDAM` list type and `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` does not exist at all. Is it acceptable to land §3 + §4 now (inert until the list types exist) and §5 after #659, or should the whole ticket wait?

2. **What is the exact `listTypeName` for the Interim Applications (ChD) list?** `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` is a guess. A wrong string silently disables the feature. Needs the value #659 will actually add to `list-type-data.ts`.

3. **Will #659 make `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` a non-strategic Excel-upload list?** The AC "the uploaded excel file will be re-used" only makes sense if it does. If it stays flat-file (`isNonStrategic: false`, `CFT_IDAM`), this ticket is a no-op for that list and the AC is unachievable as written.

4. **Does AC 1 require a web download journey, or only the email links?** "made available as downloadable options" is ambiguous. This plan implements both, because email-only leaves a verified user with no way to get the Excel from the service itself. If the intent is email-only, §4 and §5 drop out and the ticket roughly halves in size. **This is the single biggest scope question — please answer before implementation starts.**

5. **Should the download sit behind a terms-and-conditions step?** SJP requires it for protected personal data. These are public lists, so the disclaimer may be unnecessary friction — but their notification emails already carry the Special Category Data warning. Default here: keep it, matching the only precedent. Needs a content designer / IG decision.

6. **Should unverified public users be able to download?** This plan restricts to `VERIFIED` with matching provenance, mirroring SJP and the issue's framing ("available to CaTH verified users"). Public download is a one-line change (omit the middleware) but it is a data-access decision.

7. **Downloaded filename.** Currently `<artefactId>.xlsx`, which is opaque. Would `business-and-property-daily-cause-list-2026-08-18.xlsx` be preferred? Small change to `handleBlobDownload`, but it changes SJP behaviour too unless parameterised.

8. **Non-SJP Excel-without-PDF email.** If PDF generation fails but the Excel is stored, `getSubscriptionTemplateId` returns the non-SJP PDF template — an email with a PDF link that resolves to nothing. Add a non-SJP Excel-only Notify template (new template + env var), or treat a missing PDF purely as an incident? Recommend a separate ticket.

9. **Backfill.** Artefacts published before this change have no `.xlsx`, so their emails already went out PDF-only and their pages will offer PDF only. Assumed: no backfill — and likely impossible anyway, since the staged upload lives in Redis for one hour. Confirm.

10. **Third-party publication push.** `sendThirdPartyPublications` receives `pdfPath` but no `excelPath`. Should third parties subscribed to these lists also receive the Excel? Assumed out of scope.

11. **Are these really the only two Rolls Building lists?** `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` also sit at Business and Property Courts Rolls Building and already take Excel uploads that are discarded. Adding them costs two strings, but it changes their email template, so it needs explicit sign-off.
