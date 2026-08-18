# #941: Create additional file format for Download version of Rolls Building hearing lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-08-12T11:38:14Z
**Updated:** 2026-08-18T16:00:12Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the excel download file for the Business and Property Division Rolls Building hearing lists. Implementation of this ticket is dependent on the completion of #659 

**Rolls Building Lists:**
Business and Property Division Rolls Building Daily Cause List
 Interim Applications (ChD) daily cause list

 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from
 

**ACCEPTANCE CRITERIA**
- Excel and PDF downloadable files are made available as downloadable options for all Rolls Building hearing lists above
- The uploaded excel file will be re-used in providing the excel file for download
- All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-08-13T10:29:05Z

@spec 

### Comment by OgechiOkelu on 2026-08-18T15:49:04Z

@SPEC

### Comment by hmctsclaudecode on 2026-08-18T15:59:25Z

# Technical Specification — #941 Additional download file format (Excel) for Rolls Building hearing lists

## 1. User Story

**As a** service (Court and Tribunal Hearings)
**I want to** offer an Excel download alongside the existing PDF for the Business and Property Division Rolls Building hearing lists
**So that** CaTH verified subscribers can choose the file format that suits them, and can work with the list data in a spreadsheet rather than only reading a PDF

In scope — the two Rolls Building lists named in the issue:

| Display name | Expected `listTypeName` | Expected page path |
|---|---|---|
| Business and Property Division Rolls Building Daily Cause List | `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` | `/business-and-property-daily-list` |
| Interim Applications (ChD) Daily Cause List | `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` | `/interim-applications-chd-daily-cause-list` |

Both names/paths come from #659 and must be confirmed against the merged #659 code before implementation (see §14). Everything in this spec is keyed on the stable `listTypeName` string — never on `ListType.id`.

## 2. Background

### 2.1 Dependency on #659

#659 introduces the two Rolls Building lists as **non-strategic Excel-upload list types** (an internal admin uploads an `.xlsx`, it is converted to JSON, validated against a schema, stored as an artefact and rendered as an HTML page with a generated PDF). This ticket adds the **Excel download** on top of that. It cannot be started until #659 is merged, because the list type entries, page controllers, templates, converters and PDF generators are all delivered there.

`BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` exists today in `libs/list-types/common/src/list-type-data.ts:751` but as a **flat-file** list (`provenance: "CFT_IDAM"`, served by the flat-file viewer). #659 is expected to move it to the non-strategic Excel path, in line with its ChD siblings `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (line 791) and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` (line 802).

### 2.2 What already works (verified in the codebase)

- **Emails already look for an Excel file by convention.** `buildEmailDataWithFiles` in `libs/notifications/src/notification/notification-service.ts:466` downloads `${artefactId}.xlsx` from the `PUBLICATIONS` container for every notification, and `getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:15`) selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both a PDF and an Excel exist and both are under 2MB. **No notification code change is needed** — the email links appear as soon as the blob exists.
- **Blob cleanup already covers Excel.** `libs/publication/src/repository/queries.ts:189` deletes `${artefactId}.xlsx` when an artefact is deleted/expired.
- **A download journey pattern already exists**, but only for SJP: `apps/web/src/pages/(list-types)/sjp-download-shared.ts` provides `handleBlobDownload`, `getAvailableFiles`, `formatFileSize` and `createListDownloadFilesHandler`. The helpers are already list-type agnostic; only the filename says "sjp".
- **Excel storage helper exists**: `saveExcelToStorage(artefactId, buffer)` in `libs/list-types/common/src/excel/excel-utilities.ts` (also exposed as `saveExcelFile` from `@hmcts/excel-generation`).
- **Uploads are `.xlsx` only, max 2MB** (`libs/admin-pages/src/manual-upload/validation.ts`; `.xls` is explicitly rejected), so a stored upload is always a valid `.xlsx` and always fits inside the GOV.UK Notify 2MB link limit.

### 2.3 The actual gap

1. **The uploaded Excel is thrown away.** `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:135` converts the workbook to JSON and stores only the JSON:
   ```
   // Store converted JSON in blob — original Excel is not stored (no value after conversion)
   ```
   Nothing writes `${artefactId}.xlsx`, so the email falls back to the PDF-only template and there is no Excel to download.
2. **`EXCEL_GENERATOR_REGISTRY`** (`libs/publication/src/processing/service.ts:361`) only has entries for `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST` and the four SJP lists. Those *regenerate* a workbook from JSON — which is **not** what this ticket asks for (AC: "the uploaded excel file will be re-used").
3. **No web download journey for non-SJP lists.** Only `sjp-press-list`, `sjp-public-list` and their delta variants expose a "Download a copy" button.

### 2.4 Chosen approach

Re-use the uploaded workbook byte-for-byte. At publication confirm time, when the list type is one that offers an Excel download, persist the original upload buffer to `${artefactId}.xlsx` **before** `processPublication()` runs, so notifications pick it up in the same request cycle. Then expose a verified-user download journey on the two Rolls Building pages by promoting the existing SJP download helpers to a shared, list-type-agnostic module.

Explicitly rejected: adding an `EXCEL_GENERATOR_REGISTRY` entry that rebuilds the workbook from the converted JSON. It duplicates the source data, loses the uploader's formatting, and contradicts the acceptance criteria.

## 3. Acceptance Criteria

* **Scenario:** Uploaded Excel is retained for a Rolls Building list
    * **Given** an internal admin has uploaded a valid `.xlsx` for the Business and Property Division Rolls Building Daily Cause List
    * **When** they confirm the upload on the non-strategic upload summary page
    * **Then** the original workbook is stored unchanged in the `PUBLICATIONS` blob container as `<artefactId>.xlsx`, alongside the converted JSON blob and the generated PDF

* **Scenario:** Uploaded Excel is retained for the Interim Applications (ChD) list
    * **Given** an internal admin has uploaded a valid `.xlsx` for the Interim Applications (ChD) Daily Cause List
    * **When** they confirm the upload
    * **Then** `<artefactId>.xlsx` is stored and its bytes are identical to the file that was uploaded

* **Scenario:** Other list types are unaffected
    * **Given** an internal admin uploads an `.xlsx` for a non-strategic list type that is not in the Excel-download allow-list
    * **When** they confirm the upload
    * **Then** no `<artefactId>.xlsx` blob is created and the publication behaves exactly as it does today

* **Scenario:** Subscriber email contains links to both file formats
    * **Given** a verified user is subscribed to a Rolls Building list (by location, list type or case)
    * **And** the publication has produced both a PDF and an Excel file, each under 2MB
    * **When** the publication notification is sent
    * **Then** the GOV.UK Notify template used is the PDF + Excel template (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`)
    * **And** the email shows a link to download the PDF and a link to download the Microsoft Excel spreadsheet

* **Scenario:** All PDF data fields are present in the Excel file
    * **Given** a published Rolls Building list
    * **When** a user opens the downloaded Excel file and the downloaded PDF side by side
    * **Then** every column rendered in the PDF (judge, time, venue, type, case number, case name, additional information) is present in the Excel file for every hearing row

* **Scenario:** Verified user downloads the Excel from the list page
    * **Given** a signed-in verified user is viewing a published Rolls Building list
    * **When** they select "Download a copy", agree to the terms and conditions, and select the Excel link
    * **Then** the browser downloads `<artefactId>.xlsx` with content type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    * **And** the file size shown next to the link matches the stored blob size

* **Scenario:** Both formats are offered when both exist
    * **Given** a published Rolls Building list with a PDF and an Excel file
    * **When** a verified user reaches the "Download your file" page
    * **Then** both a PDF link and an Excel link are shown, each with its file size

* **Scenario:** Unverified user cannot download
    * **Given** a user who is not signed in, or is signed in without the `VERIFIED` role
    * **When** they request the download disclaimer, download files or download route for a Rolls Building artefact
    * **Then** they are redirected to `/sign-in` and no file is served
    * **And** the "Download a copy" button is not rendered on the list page

* **Scenario:** Welsh users get the Welsh download journey
    * **Given** a verified user viewing a Rolls Building list with `?lng=cy`
    * **When** they move through the download journey
    * **Then** the button, terms and conditions page and download page are all shown in Welsh

* **Scenario:** Republished list replaces the previous Excel
    * **Given** a Rolls Building list has already been published for a content date
    * **When** an admin uploads a corrected `.xlsx` for the same location, list type and content date
    * **Then** the stored `<artefactId>.xlsx` is overwritten with the new workbook and subscribers receive an email linking to the new file

* **Scenario:** Excel missing does not break the page or the email
    * **Given** a Rolls Building artefact published before this change (no `<artefactId>.xlsx` blob)
    * **When** a verified user views the list page and a notification is sent
    * **Then** only the PDF link is offered on the download page, the PDF-only Notify template is used, and no error is shown

## 4. User Journey Flow

### 4.1 Publication (internal admin) — where the Excel gets stored

```
 Internal admin (CTSC / Local / System admin)
        |
        v
 /non-strategic-upload  ──── selects court, list type, .xlsx, dates, sensitivity
        |                    (Excel converted once here purely to validate it)
        v
 /non-strategic-upload-summary?uploadId=...   [POST confirm]
        |
        |-- createArtefact()                      -> artefact row (artefactId)
        |-- convertExcelForListTypeName()         -> jsonData
        |-- saveUploadedFile(artefactId, JSON)    -> <artefactId>            (JSON blob)
        |-- updateSourceArtefactId(fileName)      -> original file name kept
        |
        |== NEW ==> if EXCEL_DOWNLOAD_LIST_TYPES.has(listTypeName)
        |             saveExcelToStorage(artefactId, uploadData.file)
        |                                          -> <artefactId>.xlsx     (original workbook)
        |
        |-- extractAndStoreArtefactSearch()
        |
        v
 processPublication()  (background, fire-and-forget)
        |-- generatePublicationPdf()   -> <artefactId>.pdf
        |-- generatePublicationExcel() -> no-op for these list types (no registry entry)
        |-- sendPublicationNotificationsForArtefact()
                 |
                 v
        buildEmailDataWithFiles(artefactId, pdfPath, listTypeName, params)
                 |-- downloadBlob(<artefactId>.pdf)    -> found
                 |-- downloadBlob(<artefactId>.xlsx)   -> found  (because of the NEW step)
                 |-- getSubscriptionTemplateId({hasPdf: true, hasExcel: true, ...})
                 v
        GOV.UK Notify: PDF + Excel template  -> subscriber inbox with BOTH links
```

Ordering matters: the Excel blob is written **synchronously before** `processPublication()` is invoked, so the notification builder always sees it. No new parameters are threaded through `processPublication()`.

### 4.2 Consumption (verified user) — two entry points

```
 (a) Email                                  (b) Web
 ┌────────────────────────────┐             ┌──────────────────────────────────┐
 │ Notify email               │             │ /business-and-property-daily-list│
 │  • Download the PDF  ──────┼──┐          │   ?artefactId=<uuid>             │
 │  • Download the Excel ─────┼──┤          │                                  │
 └────────────────────────────┘  │          │  [Download a copy]  (verified    │
        Notify-hosted link       │          │                      users only) │
        (no CaTH auth needed)    │          └───────────────┬──────────────────┘
                                 │                          v
                                 │       /business-and-property-daily-list/
                                 │            list-download-disclaimer?artefactId=<uuid>
                                 │                          |
                                 │            tick "I agree" -> Continue
                                 │                          v
                                 │       /business-and-property-daily-list/
                                 │            list-download-files?artefactId=<uuid>
                                 │                          |
                                 │            "Download this PDF (312.4KB) to your device"
                                 │            "Download this Microsoft Excel spreadsheet (48.2KB)…"
                                 │                          v
                                 └──────>  /business-and-property-daily-list/
                                               download?artefactId=<uuid>&type=xlsx
                                                          |
                                            Content-Disposition: attachment
```

Unhappy paths:

```
 not signed in / not VERIFIED / unknown artefactId  ->  redirect /sign-in
 disclaimer submitted without ticking the box       ->  re-render disclaimer + error summary
 no PDF and no Excel blob for the artefact          ->  404 page
 blob missing when download route is hit            ->  404 JSON { error: "File not found" }
 bad artefactId or type not in {pdf, xlsx}          ->  400 JSON { error: "Invalid request" }
```

## 5. Low Fidelity Wireframe

### 5.1 List page — download button added (verified users only)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings          English | Cymraeg           │
├──────────────────────────────────────────────────────────────────────────┤
│ < Back                                                                   │
│                                                                          │
│ Business and Property Division Rolls Building Daily Cause List           │
│ ══════════════════════════════════════════════════════════════           │
│ Rolls Building, Fetter Lane, London, EC4A 1NL                            │
│                                                                          │
│ List for 18 August 2026                                                  │
│ Last updated: 18 August 2026 at 9:55am                                   │
│                                                                          │
│ ▸ Important information                                                  │
│                                                                          │
│ ┌────────────────────┐                                                   │
│ │  Download a copy   │   <-- NEW. Rendered only when the user is         │
│ └────────────────────┘       VERIFIED and a PDF and/or Excel blob exists │
│                                                                          │
│ Search Cases  [                    ]                                     │
│                                                                          │
│ ┌─────────┬──────┬───────┬──────┬──────────┬───────────┬──────────────┐ │
│ │ Judge   │ Time │ Venue │ Type │ Case no. │ Case name │ Additional   │ │
│ ├─────────┼──────┼───────┼──────┼──────────┼───────────┼──────────────┤ │
│ │ ...     │ ...  │ ...   │ ...  │ ...      │ ...       │ ...          │ │
│ └─────────┴──────┴───────┴──────┴──────────┴───────────┴──────────────┘ │
│                                                                          │
│ Data Source: Manual Upload                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Terms and conditions page

```
┌──────────────────────────────────────────────────────────────────────────┐
│ < Back                                                                   │
│                                                                          │
│ Terms and conditions                                                     │
│ ═════════════════════                                                    │
│                                                                          │
│ As a verified user of the court and tribunal hearings service you are     │
│ authorised to download this file containing personal protected data.      │
│                                                                          │
│ It is your responsibility to ensure you comply with any GDPR and/or       │
│ reporting restrictions regarding the content of this file.                │
│                                                                          │
│ [ ] Please tick this box to agree to the above terms and conditions       │
│                                                                          │
│ ┌────────────┐                                                           │
│ │  Continue  │                                                           │
│ └────────────┘                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

Validation failure state:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ ! There is a problem                                                 │ │
│ │   • You must agree to the terms and conditions                       │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ Terms and conditions                                                     │
│ ...                                                                      │
│ │ You must agree to the terms and conditions                             │
│ [ ] Please tick this box to agree to the above terms and conditions      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Download your file page

```
┌──────────────────────────────────────────────────────────────────────────┐
│ < Back                                                                   │
│                                                                          │
│ Download your file                                                       │
│ ══════════════════                                                       │
│                                                                          │
│ Save your file somewhere you can find it. You may need to print it or     │
│ show it to someone later.                                                │
│                                                                          │
│ Download this PDF (312.4KB) to your device                                │
│                                                                          │
│ Download this Microsoft Excel spreadsheet (48.2KB) to your device         │
│                                                                          │
│ If you have any questions, call 0300 303 0656.                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Email (GOV.UK Notify — existing template, no change)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Subject: Court and tribunal hearings — new list published                 │
│                                                                          │
│ A list you have subscribed to has been published:                        │
│   Business and Property Division Rolls Building Daily Cause List          │
│   Business and Property Courts Rolls Building                             │
│   18 August 2026                                                         │
│                                                                          │
│   Download the PDF version of the list                                   │
│   Download the Microsoft Excel version of the list                       │
│                                                                          │
│ Note this email contains Special Category Data …                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 Change 1 — allow-list of list types that keep their uploaded Excel

**New file:** `libs/list-types/common/src/excel/excel-download-list-types.ts`

```ts
// List types whose uploaded .xlsx is kept in blob storage so it can be offered as a
// download and linked from subscriber emails. Keyed on the stable listTypeName.
const EXCEL_DOWNLOAD_LIST_TYPE_NAMES = new Set([
  "BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST",
  "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST"
]);

export function keepsUploadedExcel(listTypeName: string | undefined): boolean {
  return !!listTypeName && EXCEL_DOWNLOAD_LIST_TYPE_NAMES.has(listTypeName);
}
```

Exported from `libs/list-types/common/src/index.ts` next to the existing `saveExcelToStorage` export. Consts at the top of the module, exported function next, per the module ordering rules.

Why an allow-list rather than "always keep the upload": every non-strategic list type currently discards its workbook, and turning that on globally would silently change the email template for ~40 other list types (they would all start receiving Excel links). This ticket only authorises the two Rolls Building lists. The set is the single place to add future list types.

### 6.2 Change 2 — persist the uploaded workbook

**Changed file:** `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`

Inside the existing `if (isExcelFile && selectedListType?.isNonStrategic)` branch, after `saveUploadedFile(...)` / `updateSourceArtefactId(...)` and **before** `processPublication(...)`:

```ts
if (keepsUploadedExcel(listTypeName)) {
  await saveExcelToStorage(artefactId, uploadData.file);
}
```

Notes:
- Import `keepsUploadedExcel` and `saveExcelToStorage` from `@hmcts/list-types-common` in the same dynamic `await import(...)` already used in this branch, so the module-load cost stays where it is today.
- Replace the now-inaccurate comment `// Store converted JSON in blob — original Excel is not stored (no value after conversion)` with one that states the JSON blob is the rendering source and the `.xlsx` is retained only for list types in the allow-list.
- Uses the same `uploadData.file` buffer that was converted, so the stored bytes are exactly what the admin uploaded (AC: "the uploaded excel file will be re-used").
- Awaited (not fire-and-forget) so the blob exists before the notification path probes for it. A failure here throws into the existing `try/catch`, which re-renders the summary page with an error rather than half-publishing.
- No change to `EXCEL_GENERATOR_REGISTRY`; `generatePublicationExcel()` remains a no-op for these list types and `result.excelPath` stays `undefined`. That is harmless because `buildEmailDataWithFiles` probes the blob by convention and ignores the passed `excelPath`.

### 6.3 Change 3 — promote the SJP download helpers to shared

**Renamed file:** `apps/web/src/pages/(list-types)/sjp-download-shared.ts` → `apps/web/src/pages/(list-types)/list-download-shared.ts`

The four exported helpers (`handleBlobDownload`, `getAvailableFiles`, `formatFileSize`, `createListDownloadFilesHandler`) are already list-type agnostic — `getAvailableFiles` probes `${artefactId}.pdf` and `${artefactId}.xlsx`, and `handleBlobDownload` allows exactly `pdf` and `xlsx`. Only two changes:

1. Rename the file and update the six SJP importers (`sjp-press-list/{download,list-download-files,list-download-disclaimer}.ts`, `sjp-public-list/{download,list-download-files,list-download-disclaimer}.ts`, plus the delta variants if they import it directly). Pure rename — no behaviour change for SJP.
2. Add an optional template name to `createListDownloadFilesHandler` so a shared template can be used without colliding with the SJP page-local templates:

```ts
export function createListDownloadFilesHandler(
  en: object,
  cy: object,
  downloadFilesKey: string,
  template = "list-download-files"
): RequestHandler
```

**New shared templates** (no `index.ts`, so no route is created — the directory is picked up as a Nunjucks search path by `collectViewPaths` in `libs/web-core/src/middleware/govuk-frontend/configure-govuk.ts`):

- `apps/web/src/pages/(list-types)/list-download/files.njk` — rendered as `"list-download/files"`
- `apps/web/src/pages/(list-types)/list-download/disclaimer.njk` — rendered as `"list-download/disclaimer"`

Both are copies of the existing `sjp-press-list/list-download-files.njk` and `sjp-press-list/list-download-disclaimer.njk`, which are already fully driven by the `t` object. Path-qualified names are used deliberately: `sjp-press-list` and `sjp-public-list` both already ship a template literally named `list-download-files.njk`, and because every page directory becomes a search path, an unqualified duplicate would resolve to whichever path is registered first. Do not add a third bare `list-download-files.njk`.

### 6.4 Change 4 — the two Rolls Building page directories

For each of `apps/web/src/pages/(list-types)/business-and-property-daily-list/` and `.../interim-applications-chd-daily-cause-list/` (both created by #659), add:

| File | Purpose |
|---|---|
| `require-verified.ts` | `export const requireVerified = createRequireVerifiedWithProvenance();` — re-uses the middleware factory that currently lives in `sjp-press-list/require-verified-with-provenance.ts`. Move that factory to `apps/web/src/pages/(list-types)/require-verified-with-provenance.ts` so all four consumers share one copy. |
| `list-download-disclaimer.ts` | `GET` renders `"list-download/disclaimer"`; `POST` requires the `agreed` checkbox, then redirects to `<prefix>/list-download-files?artefactId=<uuid>`. Mirrors `sjp-public-list/list-download-disclaimer.ts` (the simpler of the two SJP variants). |
| `list-download-files.ts` | `export const GET = [requireVerified, createListDownloadFilesHandler(en, cy, "downloadFiles", "list-download/files")]` |
| `download.ts` | `export const GET = [requireVerified, (req, res) => handleBlobDownload(req, res)]` |

**Changed file:** each list's `index.ts` (from #659) gains the download button data:

```ts
const isVerifiedUser = req.user?.role === "VERIFIED";
const [pdfProps, excelProps] = await Promise.all([
  getBlobProperties(`${artefactId}.pdf`),
  getBlobProperties(`${artefactId}.xlsx`)
]);
const downloadDisclaimerUrl =
  isVerifiedUser && (pdfProps || excelProps)
    ? `${req.path}/list-download-disclaimer?artefactId=${artefactId}`
    : null;
```

`downloadDisclaimerUrl` is passed to the render context; the list template renders the GOV.UK button exactly as `sjp-press-list.njk:43-47` does:

```njk
{% if downloadDisclaimerUrl %}
  <a href="{{ downloadDisclaimerUrl }}" role="button" draggable="false"
     class="govuk-button" data-module="govuk-button">{{ t.downloadCopy }}</a>
{% endif %}
```

If #659 renders these pages through `createSimpleListTypeHandler` / `createMultiListGuardAndRender` (`apps/web/src/pages/(list-types)/list-type-handler.ts`), add the two blob probes inside the `renderFn` for these list types rather than forking the shared handler.

### 6.5 Data field parity (PDF vs Excel)

The ChD/KB shape shared by these lists (`CHD_KB_EXCEL_CONFIG` in `libs/list-types/chd-kb-common`) has seven required fields: `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`, `additionalInformation`. The converter requires all seven on every row, and the PDF template renders all seven. Because the downloaded Excel *is* the uploaded workbook, field parity is guaranteed by construction — the PDF is derived from the same file. Implementation must add a test that asserts the seven columns exist in both outputs, so the parity AC is verified rather than assumed. If #659 defines a different field set for either list, use that list's converter config as the source of truth.

### 6.6 Non-goals

- No change to `libs/notifications` (template selection and file attachment already work).
- No change to GOV.UK Notify templates or `GOVUK_NOTIFY_TEMPLATE_ID_*` environment variables.
- No change to blob deletion / retention (`queries.ts` already deletes `.xlsx`).
- No Excel generation from JSON for these list types.
- No change to the SJP download journey beyond the file rename and the optional template argument.

## 7. Content

All strings live in the locale files of the two list-type libs delivered by #659 — `libs/list-types/<list>/src/locales/en.ts` and `cy.ts` — and are consumed via `t`. No display string is hardcoded in a controller or template. `en.ts` and `cy.ts` must have identical key sets (there is a parity assertion in the template tests).

### 7.1 List page — new key

**English** (`en.ts`):

```ts
downloadCopy: "Download a copy",
```

**Welsh** (`cy.ts`):

```ts
downloadCopy: "Download a copy",
```

### 7.2 Terms and conditions page

**English** (`en.ts` → `disclaimer`):

```ts
disclaimer: {
  pageTitle: "Terms and conditions",
  disclaimerText:
    "As a verified user of the court and tribunal hearings service you are authorised to download this file containing personal protected data.",
  responsibility:
    "It is your responsibility to ensure you comply with any GDPR and/or reporting restrictions regarding the content of this file.",
  checkboxLabel: "Please tick this box to agree to the above terms and conditions",
  continueButton: "Continue",
  errorTitle: "There is a problem",
  errorCheckbox: "You must agree to the terms and conditions"
},
```

**Welsh** (`cy.ts` → `disclaimer`):

```ts
disclaimer: {
  pageTitle: "Telerau ac amodau",
  disclaimerText: "[WELSH TRANSLATION REQUIRED: "As a verified user of the court and tribunal hearings service you are authorised to download this file containing personal protected data."]",
  responsibility: "Eich cyfrifoldeb chi yw sicrhau eich bod yn cydymffurfio ag unrhyw gyfyngiadau GDPR a/neu gyfyngiadau riportio gyda golwg ar gynnwys y ffeil hon.",
  checkboxLabel: "[WELSH TRANSLATION REQUIRED: "Please tick this box to agree to the above terms and conditions"]",
  continueButton: "Parhau",
  errorTitle: "Mae problem",
  errorCheckbox: "Rhaid ichi gytuno 'r telerau a'r amodau"
},
```

### 7.3 Download your file page

**English** (`en.ts` → `downloadFiles`):

```ts
downloadFiles: {
  pageTitle: "Download your file",
  saveInstructions: "Save your file somewhere you can find it. You may need to print it or show it to someone later.",
  downloadPdfLink: "Download this PDF",
  downloadExcelLink: "Download this Microsoft Excel spreadsheet",
  toDevice: "to your device",
  contactInfo: "If you have any questions, call 0300 303 0656."
}
```

**Welsh** (`cy.ts` → `downloadFiles`):

```ts
downloadFiles: {
  pageTitle: "Llwytho eich ffeil i lawr",
  saveInstructions: "Arbedwch eich ffeil yn rhywle y gellir cael hyd iddi. Efallai y bydd arnoch angen ei hargraffu neu ei dangos i rywun yn nes ymlaen.",
  downloadPdfLink: "[WELSH TRANSLATION REQUIRED: "Download this PDF"]",
  downloadExcelLink: "[WELSH TRANSLATION REQUIRED: "Download this Microsoft Excel spreadsheet"]",
  toDevice: "[WELSH TRANSLATION REQUIRED: "to your device"]",
  contactInfo: "Os oes gennych gwestiwn, ffoniwch 0300 303 0656."
}
```

The wording is taken verbatim from the SJP journey (`libs/list-types/sjp-press-list/src/sjp-press-list/en.ts:53-72`) so the two journeys read identically. File sizes are appended at render time by `formatFileSize` (`312.4KB`, `1.2MB`, `842B`) and are not translated.

### 7.4 Email content

No new content. The existing GOV.UK Notify PDF + Excel subscription template supplies both link labels; CaTH only supplies the personalisation fields already built by `buildTemplateParameters` / `buildEnhancedTemplateParameters`. Welsh email content is a Notify template concern and out of scope for this ticket.

### 7.5 Downloaded file name

`handleBlobDownload` sets `Content-Disposition: attachment; filename="<artefactId>.xlsx"`. The uploaded workbook's original name is recorded on the artefact (`updateSourceArtefactId`) but is **not** used for the download filename — keeping the artefact-id name matches the existing SJP behaviour and avoids header-injection handling for admin-supplied filenames. Flagged in §14 as a content/UX question.

## 8. URL

Existing (from #659):

| Method | Path | Notes |
|---|---|---|
| GET | `/business-and-property-daily-list?artefactId=<uuid>` | List page, public |
| GET | `/interim-applications-chd-daily-cause-list?artefactId=<uuid>` | List page, public |

New in this ticket, for each of the two list paths (`<list>` = either path above):

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/<list>/list-download-disclaimer?artefactId=<uuid>` | VERIFIED + provenance | Terms and conditions page |
| POST | `/<list>/list-download-disclaimer` | VERIFIED + provenance | 302 to `/<list>/list-download-files?artefactId=<uuid>`, or re-render with error |
| GET | `/<list>/list-download-files?artefactId=<uuid>` | VERIFIED + provenance | Download your file page |
| GET | `/<list>/download?artefactId=<uuid>&type=pdf\|xlsx` | VERIFIED + provenance | File stream (attachment) |

Routing notes:
- Paths are derived from directory nesting by the page auto-discovery router; the nested file names (`list-download-disclaimer.ts`, `list-download-files.ts`, `download.ts`) become the path segments, exactly as they do under `sjp-press-list/`.
- `list-download-shared.ts` derives the sibling path with `req.path.replace("/list-download-files", "")`, so no route prefix is hardcoded and the same helpers work for both lists.
- `?lng=cy` is honoured on every page in the journey via the existing locale middleware.
- Query strings are the only parameter carrier; no path parameters are introduced.

## 9. Validation

### 9.1 Upload side

No new upload validation. Existing rules stand and are relied on:

| Rule | Where | Behaviour |
|---|---|---|
| File extension must be `.xlsx` (case-insensitive); `.xls` rejected | `libs/admin-pages/src/manual-upload/validation.ts` | Error on the upload page |
| Max file size 2MB | multer limit, `LIMIT_FILE_SIZE` handling in `non-strategic-upload/index.ts` | Error on the upload page |
| Workbook must convert cleanly for the list type | `convertExcelForListTypeName` on the upload page | Converter error text shown against the file field |
| Converted JSON must satisfy the list type schema | `validate*` wrapper from the list-type lib | Publication rejected |

Because only a validated `.xlsx` under 2MB can reach the confirm step, the stored blob is always a well-formed `.xlsx` that fits inside GOV.UK Notify's 2MB link limit. A file at exactly 2MB (2,097,152 bytes) is **not** under `MAX_PDF_SIZE_BYTES`, so a maximum-size upload would fall back to the no-links email template — acceptable, and consistent with existing behaviour for large PDFs.

### 9.2 Download journey

| Input | Rule | Failure behaviour |
|---|---|---|
| `artefactId` | Required, must match the UUID v4-shaped regex used in `list-download-shared.ts` / `require-verified-with-provenance.ts` | Disclaimer / files pages: redirect `/sign-in` (auth middleware runs first). Download route: `400 {"error":"Invalid request"}` |
| `artefactId` | Must resolve to an existing artefact | Redirect `/sign-in` from the middleware; `404` from the files page if no blobs exist |
| `type` | Required, must be exactly `pdf` or `xlsx` | `400 {"error":"Invalid request"}` |
| User | `req.user.role === "VERIFIED"` and `req.user.provenance` set | Store `returnTo`, redirect `/sign-in` |
| User provenance | Must be in the list type's `allowedProvenance` | Store `returnTo`, redirect `/sign-in` |
| `agreed` (disclaimer POST) | Must be present (checkbox ticked) | Re-render the disclaimer with error summary and inline error, HTTP 200 |
| Requested blob | Must exist in the `PUBLICATIONS` container | `404 {"error":"File not found"}` |

The download route sets `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate` so files containing special-category data are not cached by intermediaries. This is existing helper behaviour and must not be weakened.

## 10. Error Messages

### 10.1 User-facing

| Trigger | Location | English | Welsh |
|---|---|---|---|
| Continue pressed without ticking the checkbox | Error summary title | "There is a problem" | `Mae problem` |
| Continue pressed without ticking the checkbox | Error summary item + inline error on the checkbox | "You must agree to the terms and conditions" | `Rhaid ichi gytuno 'r telerau a'r amodau` |
| Artefact has neither a PDF nor an Excel blob | `errors/404` page | "Page not found" (existing shared error page content) | existing shared Welsh content |
| Malformed `artefactId` on the files page | `errors/400` page | "There is a problem with the service" (existing shared content) | existing shared Welsh content |
| Unhandled failure rendering the list page | `errors/common` via the list-type handler | List-type `errorTitle` / `errorMessage` from #659 locales | as delivered by #659 |

The error summary is rendered by `govukErrorSummary` at the top of the disclaimer page, and the inline message by `govukCheckboxes`' `errorMessage`, so the summary link moves focus to the checkbox.

### 10.2 API-shaped responses (download route only)

| Condition | Status | Body |
|---|---|---|
| Missing/invalid `artefactId`, or `type` not `pdf`/`xlsx` | 400 | `{"error":"Invalid request"}` |
| Blob not present in storage | 404 | `{"error":"File not found"}` |

These are unchanged from the existing helper. They are reached only by hand-crafted URLs — the UI never links to an unavailable file, because `getAvailableFiles` probes blob properties before rendering the links.

### 10.3 Operational / log-only

| Condition | Behaviour | Log |
|---|---|---|
| `saveExcelToStorage` fails at confirm time | The existing `try/catch` in the upload-summary POST re-renders the summary page with the processing error; the artefact row and JSON blob are already persisted, so the admin retries the confirm | `console.error("Upload processing error:", error)` (existing) |
| PDF generation fails but the Excel was stored | Email uses the Excel-capable path only if a PDF also exists; with no PDF and a `hasExcel` non-SJP list, `getSubscriptionTemplateId` falls through to the PDF template branch | Existing `[Non-Strategic Upload] Excel generation failed` / PDF warnings |

The second row is a real edge case worth calling out: `getSubscriptionTemplateId` only has an Excel-only template for SJP (`GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY`). For a non-SJP list with an Excel but no PDF, it returns `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF`, which would render a PDF link that resolves to nothing. This is pre-existing behaviour, but this ticket is the first to make it reachable for a non-SJP list. See §14 — recommend raising a follow-up rather than widening scope here, since a missing PDF for these lists means PDF generation failed, which is already an incident.

No sensitive data (file contents, case names, user email addresses) is written to logs.

## 11. Navigation

| From | Trigger | To |
|---|---|---|
| List page | "Download a copy" button (verified users, at least one file present) | `/<list>/list-download-disclaimer?artefactId=<uuid>` |
| Disclaimer page | Back link | Browser history back to the list page |
| Disclaimer page | Continue with checkbox ticked | `/<list>/list-download-files?artefactId=<uuid>` (302) |
| Disclaimer page | Continue without ticking | Same URL, re-rendered with errors (200) |
| Download files page | PDF link | `/<list>/download?artefactId=<uuid>&type=pdf` — file attachment, page stays put |
| Download files page | Excel link | `/<list>/download?artefactId=<uuid>&type=xlsx` — file attachment, page stays put |
| Any download URL, unauthenticated | — | `/sign-in`, with `session.returnTo` set to the original URL so the user lands back on the download step after signing in |
| Subscriber email | PDF or Excel link | GOV.UK Notify-hosted file link (does not route through CaTH and needs no CaTH session) |

Additional rules:
- The button is not rendered at all for unverified users — no disabled state, no "sign in to download" prompt (matches SJP).
- Language is preserved across the journey by the existing locale middleware; the `lng` query parameter survives the disclaimer redirect because the locale is also held in the session/cookie.
- The download route responds with an attachment and no navigation, so browser history is unchanged and the back link on the files page still returns to the disclaimer page.

## 12. Accessibility

WCAG 2.2 AA is mandatory. Requirements specific to this change:

**Download button (list page)**
- Rendered as `<a role="button" class="govuk-button" data-module="govuk-button">`, matching the existing SJP markup — keyboard focusable, activates on Enter, has the GOV.UK focus style and a target well above 44×44px.
- Link text "Download a copy" is meaningful out of context (2.4.4 / 2.4.9).

**Terms and conditions page**
- `<h1>` matches the page `<title>` ("Terms and conditions").
- The checkbox is a `govukCheckboxes` single item, so the label is programmatically associated with the input (1.3.1, 3.3.2).
- On error: the error summary is the first element in the content area, its container receives focus on load, and each summary item links to the offending input (3.3.1). The inline error is referenced by `aria-describedby` on the input, generated by the GOV.UK macro.
- Error text is not conveyed by colour alone — the message text and the red border/inline message appear together (1.4.1).
- The page `<title>` is prefixed with "Error: " when validation fails, so screen reader users hear the failure on load.

**Download your file page**
- `<h1>` "Download your file" matches the page title.
- Each link's accessible name includes the format, size and destination — "Download this Microsoft Excel spreadsheet (48.2KB) to your device" — so a screen reader user knows what they are getting before activating it (2.4.4, and good practice for unexpected downloads).
- File size is text, not an icon or colour cue.
- Links are ordinary `<a>` elements in a single column; reading order matches visual order (1.3.2).

**General**
- No new JavaScript. The whole journey works with JavaScript disabled — the disclaimer is a standard `POST` form and the downloads are plain links (progressive enhancement).
- Every page in the journey extends `layouts/base-template.njk`, inheriting the skip link, header, service navigation, language toggle and footer.
- Colour contrast is inherited from GOV.UK Frontend components; no bespoke colours are introduced.
- Welsh: `<html lang="cy">` is set by the existing layout when the locale is Welsh, so screen readers switch pronunciation. All new strings must be present in `cy.ts`.
- Axe checks are run inline within the E2E journey tests (see §13), on the list page, the disclaimer page (both clean and error states) and the download files page.

## 13. Test Scenarios

### 13.1 Unit — allow-list (`libs/list-types/common/src/excel/excel-download-list-types.test.ts`)

* Returns true for `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` and for `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST`
* Returns false for another non-strategic list type name (e.g. `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`)
* Returns false for `undefined` and for an empty string

### 13.2 Unit — upload confirm (`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts`)

* Stores the uploaded workbook as `<artefactId>.xlsx` when the list type is a Rolls Building list, asserting the buffer passed to storage is the same buffer that came out of the staged upload (byte-for-byte reuse, not a regenerated workbook)
* Does not store any `.xlsx` blob when the list type is a non-strategic list outside the allow-list
* Does not store any `.xlsx` blob when the uploaded file is JSON rather than Excel
* Stores the Excel blob before `processPublication` is invoked (assert call ordering, since the notification builder depends on it)
* Still stores the converted JSON blob, records the original file name via `updateSourceArtefactId`, and extracts search data — i.e. the new step is additive
* Re-renders the summary page with the processing error, and does not redirect to the success page, when Excel storage throws
* Uses a fixture with `listTypeId: 999` and the real `listTypeName` so the test proves the behaviour is ID-independent

### 13.3 Unit — notification template selection (`libs/notifications/src/notification/notification-service.test.ts`)

* Selects the PDF + Excel template and attaches both buffers when both blobs exist for a Rolls Building artefact
* Selects the PDF-only template when the Excel blob is absent (legacy artefacts)
* Selects the no-links template when either file is 2MB or larger
* These assertions exist for SJP already; add Rolls Building cases to prove non-SJP lists take the PDF + Excel branch rather than the SJP Excel-only branch

### 13.4 Unit — download journey handlers

* `list-download-files.ts`: renders the shared template with both files and their formatted sizes when both blobs exist; renders only the PDF entry when the Excel is absent; returns 404 when neither exists; returns 400 for a malformed `artefactId`; selects Welsh content when the locale is `cy`
* `list-download-disclaimer.ts`: renders the terms page; redirects to the files page when `agreed` is present; re-renders with the error summary and inline error when it is not; keeps the `artefactId` through the redirect
* `download.ts`: streams the Excel with the spreadsheet content type and an attachment disposition; streams the PDF; 400 for `type=csv`; 400 for a non-UUID `artefactId`; 404 when the blob is missing; sets the no-store cache headers
* Auth middleware: unauthenticated, non-`VERIFIED`, and `VERIFIED`-without-matching-provenance users are all redirected to `/sign-in` with `returnTo` set, on all three routes

### 13.5 Template tests (Vitest + Cheerio, `@hmcts/test-support`)

* List page renders the "Download a copy" button when `downloadDisclaimerUrl` is set, and renders no button element when it is null (assert both directions)
* List page button `href` carries the artefactId
* `list-download/files.njk`: renders one link per file entry; the PDF entry uses the PDF label and the Excel entry uses the spreadsheet label; the size label appears inside the link text; renders no links when `files` is empty
* `list-download/disclaimer.njk`: renders the checkbox and Continue button; renders the error summary with the expected message only when `errors` is set
* Welsh render of all three templates shows the Welsh headings and labels
* Locale key parity: `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())` for each list type's locale objects, including the nested `disclaimer` and `downloadFiles` objects

### 13.6 Data parity test

* A test that reads the list type's Excel converter config and the PDF template's column set and asserts they cover the same seven ChD/KB fields (`judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`, `additionalInformation`), so a future field added to one and not the other fails CI

### 13.7 E2E (Playwright, `e2e-tests/tests/`)

Two journeys only — one per list type is not needed; the second list is covered by a unit/template test for its route wiring.

* **`rolls-building-list-download.spec.ts` — verified user downloads both formats (`@nightly`)**: sign in as a verified user, publish/seed a Business and Property Rolls Building artefact with a PDF and an Excel, open the list page, run an Axe scan, select "Download a copy", submit the disclaimer without ticking to assert the validation error and run Axe on the error state, switch to Welsh and assert the Welsh terms wording, tick and continue, assert both download links with their size labels, run Axe, download the Excel and assert the file name and non-zero size, then download the PDF
* **Admin publish leg** (extend the existing non-strategic upload E2E rather than adding a new spec): upload a Rolls Building `.xlsx`, confirm, then assert the published list page offers both download formats — this exercises the store-on-confirm step end to end
* **Unverified access** (assert inside the journey above, not as a separate spec): sign out and request the download URL directly, expect a redirect to `/sign-in` and no file body

## 14. Assumptions & Open Questions

### Assumptions

* **#659 is merged first.** It delivers both list type entries in `list-type-data.ts`, the Excel converters, JSON schemas and validators, the page controllers/templates, and the PDF generators. This ticket adds only Excel retention plus the download journey. If #659 lands with a different module layout, §6.4 needs re-basing onto it, but §6.1–6.3 are unaffected.
* **These are non-strategic Excel-upload lists.** `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` is currently a flat-file `CFT_IDAM` list type (`list-type-data.ts:751`); the AC "the uploaded excel file will be re-used" only makes sense if #659 converts it to the Excel-upload path, like its ChD siblings. If it stays flat-file, this ticket is a no-op for that list and the AC cannot be met as written.
* `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` is a placeholder name. The stable `name` from #659 must be used verbatim in the allow-list — a typo silently disables the feature (the allow-list lookup just returns false), so the implementation must include a test asserting the name matches the entry in `list-type-data.ts`.
* Both lists use the shared ChD/KB seven-field shape from `@hmcts/chd-kb-common`, so PDF/Excel field parity holds by construction.
* Uploads remain `.xlsx`-only and ≤2MB, so no format conversion or size handling is needed and files always fit Notify's 2MB limit.
* The `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` template is already configured in every environment (it is already used by magistrates and SJP lists), so no new environment variables or Helm/key-vault changes are required.
* Verified-user gating and the terms-and-conditions step are appropriate for these lists, on the basis that their notification emails already carry the Special Category Data warning (`SPECIAL_CATEGORY_DATA_WARNING` is exported and used by the ChD/KB email summary builder).

### Open questions

1. **Does AC 1 require a web download journey, or only the email links?** "Excel and PDF downloadable files are made available as downloadable options" is ambiguous. This spec implements both (web journey + email links) because email-only would leave a verified user with no way to get the Excel from the service itself. If the product intent is email-only, §6.3–6.4 drop out and the ticket shrinks to §6.1–6.2 — confirm before starting, as it roughly halves the work.
2. **Should the download be gated behind the terms-and-conditions page?** SJP requires it because of protected personal data. Rolls Building lists are public lists, so the disclaimer may be unnecessary friction — but their emails carry the Special Category Data warning, which argues for keeping it. Default in this spec: keep it, for consistency with the only existing precedent. Needs a content designer / IG decision.
3. **Should unverified (public) users be able to download?** This spec restricts downloads to `VERIFIED` users with matching provenance, mirroring SJP and the issue's framing ("available to CaTH verified users"). If public download is wanted, the auth middleware is simply omitted — but that is a data-access decision, not an implementation detail.
4. **Downloaded file name.** Currently `<artefactId>.xlsx`, which is opaque to users. Would a human-readable name (e.g. `business-and-property-daily-cause-list-2026-08-18.xlsx`) be preferred? That is a small, self-contained change to `handleBlobDownload`, but it would change SJP behaviour too unless parameterised.
5. **Non-SJP Excel-without-PDF email template.** If PDF generation fails but the Excel is stored, `getSubscriptionTemplateId` returns the non-SJP PDF template, producing an email with a PDF link and no PDF. Should a non-SJP Excel-only template be added (new Notify template + env var), or is "PDF generation failed" treated purely as an incident? Recommend a separate ticket.
6. **Retrospective backfill.** Artefacts published before this change have no `.xlsx` blob, so their emails have already been sent with PDF-only links and their pages will offer PDF only. Is any backfill wanted for still-live artefacts, and is the source workbook even recoverable (the staged upload lives in Redis for 1 hour only, so the answer is likely no)? Assumed: no backfill.
7. **Third-party publication push.** `sendThirdPartyPublications` receives `pdfPath` but no `excelPath`. Should third parties subscribed to these lists also receive the Excel? Out of scope here; flag to the product owner.
8. **Are these the only two Rolls Building lists?** The issue names two. `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` also sit at Business and Property Courts Rolls Building (`locationId: 26`) and already take Excel uploads that are discarded. Should they be added to the allow-list in the same change? Cheap to include (two more strings), but it changes their email template, so it needs explicit sign-off.


### Comment by OgechiOkelu on 2026-08-18T16:00:12Z

@plan 
