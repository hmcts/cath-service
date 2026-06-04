# Issue #677 — CSV Download for Civil and Family Daily Cause List

## Technical Approach

Generate a CSV file alongside the existing PDF during publication processing for `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` artefacts. Store it at the same path pattern (`{artefactId}.csv`) in the shared temp storage directory. Extend file retrieval to support format-specific lookup so PDF and CSV can be fetched independently. Expose the CSV via the existing download route using a `?format=` query parameter. Surface a CSV download link alongside the PDF link on the hearing-lists viewer page.

**Key decisions:**

- Reuse `renderCauseListData()` in the CSV generator — it already computes all derived fields (duration, party names, hearing channel, formatted restrictions). Do not duplicate that logic.
- CSV generation is non-blocking during `processPublication`. If it fails, log the error and continue — the PDF and notifications must not be held up.
- File retrieval currently uses `files.find(f => f.startsWith(artefactId))`, which returns whichever file happens to sort first. With two files for the same artefactId this is non-deterministic. Add an optional `extension` parameter to `findFileByArtefactId` to make lookup explicit.
- The hearing-lists flat-file viewer already redirects non-PDF files straight to download. A CSV artefact would follow that same path. However, CFT artefacts in this service are rendered list types (not flat files — `isFlatFile` is false). The download link is therefore surfaced separately on the rendered page, not via the flat-file viewer.
- Scope is `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` only. Other list types can be added later via the same registry pattern.
- UTF-8 BOM (`﻿`) is prepended so Excel opens the file correctly without encoding prompts.

---

## Implementation Details

### 1. `libs/list-types/civil-and-family-daily-cause-list/package.json`

Add `papaparse` as a runtime dependency and `@types/papaparse` as a dev dependency. Check the version already used by `system-admin-pages` (5.5.3) and pin to the same version.

### 2. `libs/list-types/common/src/csv/csv-utilities.ts` (new file)

Mirror `savePdfToStorage` in structure. Export:

- `saveCsvToStorage(artefactId: string, csvContent: string): Promise<CsvGenerationResult>` — writes `{artefactId}.csv` to `TEMP_STORAGE_BASE`, returns `{ success, csvPath }` or `{ success: false, error }`.
- `CsvGenerationResult` interface — `success`, `csvPath?`, `error?`.

Export from `libs/list-types/common/src/index.ts` alongside the existing pdf-utilities exports.

### 3. `libs/list-types/civil-and-family-daily-cause-list/src/csv/csv-generator.ts` (new file)

Export `generateCauseListCsv(options: CsvGenerationOptions): Promise<CsvGenerationResult>`.

`CsvGenerationOptions` extends `BasePdfGenerationOptions<CauseListData>` and adds `contentDate: Date` — identical shape to `PdfGenerationOptions` in the PDF generator.

Implementation:

1. Call `renderCauseListData(options.jsonData, renderOptions)` — reuses the same transformation already proven for the PDF.
2. Flatten the nested structure (`courtLists → courtHouse → courtRoom → session → sittings → hearing → case`) to one row per case, carrying context from each level (court house name, court room name, judiciaries, time, channel, duration).
3. Use `Papa.unparse()` to serialise rows to CSV.
4. Prepend UTF-8 BOM.
5. Call `saveCsvToStorage(options.artefactId, csvString)`.

Export `generateCauseListCsv` from `libs/list-types/civil-and-family-daily-cause-list/src/index.ts`.

### 4. `libs/publication/src/file-storage/file-retrieval.ts`

Change the signature of `findFileByArtefactId`:

```
findFileByArtefactId(artefactId: string, extension?: string): Promise<...>
```

When `extension` is provided (e.g. `".pdf"` or `".csv"`), filter with `file.startsWith(artefactId) && file.endsWith(extension)` instead of the bare `startsWith` check. When omitted, behaviour is unchanged (first match wins) so all existing callers are unaffected.

Update `getFileBuffer`, `getFileExtension` to accept and forward the optional `extension` parameter.

### 5. `libs/public-pages/src/flat-file/flat-file-service.ts`

Update `getFileForDownload(artefactId: string, format?: "pdf" | "csv")`:

- Map `format` to a file extension string (default `".pdf"`).
- Pass the extension to `getFileBuffer` and `getFileExtension` so the correct file is returned when both exist.

Update the download route to read `req.query.format`, validate it is `"pdf"` or `"csv"` (400 on anything else), and pass it through.

### 6. `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`

Add format query parameter handling:

```
const FORMAT_ALLOWLIST = new Set(["pdf", "csv"]);
const format = req.query.format as string | undefined;
if (format && !FORMAT_ALLOWLIST.has(format)) {
  return res.status(400).json({ error: "Invalid format" });
}
```

Pass `format` (cast to `"pdf" | "csv" | undefined`) to `getFileForDownload`.

### 7. `libs/publication/src/processing/service.ts`

Add:

- `CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>>` with `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` entry.
- `generatePublicationCsv(params: GeneratePdfParams): Promise<{ csvPath?: string }>` — same structure as `generatePublicationPdf`, logs and returns `{}` on failure.
- Add `csvPath?: string` to `ProcessPublicationResult`.

In `processPublication`, after the `generatePublicationPdf` call:

```typescript
const csvResult = await generatePublicationCsv({ ... });
result.csvPath = csvResult.csvPath;
```

The call must not throw — wrap in try/catch or rely on the internal error handling in `generatePublicationCsv`.

Thread `csvPath` into `sendPublicationNotificationsForArtefact` via the `SendNotificationsParams` interface (`csvFilePath?: string`).

### 8. Hearing-lists viewer page

The existing page at `libs/public-pages/src/pages/hearing-lists/[locationId]/[artefactId].ts` already renders an inline PDF viewer with a download link. When a CSV exists for the same artefactId, the controller should also pass a `csvDownloadUrl` to the template.

The controller needs to know whether a CSV is available. Options:

- Query the filesystem directly for `{artefactId}.csv` — simple but couples the viewer to storage internals.
- Call `findFileByArtefactId(artefactId, ".csv")` via the publication file-retrieval API — cleaner.

Add a `hasCsvDownload` flag to `getFlatFileForDisplay` return value (check for CSV file existence). The template renders a secondary "Download CSV" link when `hasCsvDownload` is true.

Translation keys to add to `libs/public-pages/src/pages/hearing-lists/en.ts` and `cy.ts`:

- `downloadCsvLinkText` — "Download as CSV"
- `downloadPdfLinkText` — "Download as PDF" (to disambiguate the existing link label when both formats are shown)

### 9. `libs/notifications/src/notification/notification-service.ts`

When `csvFilePath` is present in the publication event, read the CSV buffer and attach it (or a link to it) alongside the PDF in the email template parameters. This requires a new GOV.UK Notify template that includes a `link_to_csv_file` personalisation field.

Because `prepareUpload` in the Notify client is used for PDF attachment today, CSV can be attached the same way. However, Notify has a 2MB limit per file — CSVs for large cause lists may also approach this. Add a size check (`MAX_CSV_UPLOAD_SIZE_BYTES = 2MB`) matching the PDF limit.

Add `csvFilePath?: string` to `PublicationEvent` in `libs/notifications/src/notification/validation.ts`.

---

## Data Model: CSV Columns

One row per case. Context fields from parent levels are repeated on each row.

| Column header | Source |
|---|---|
| Court House | `courtHouse.courtHouseName` |
| Court Room | `courtRoom.courtRoomName` |
| Judge | `session.formattedJudiciaries` (computed by `formatJudiciaries`) |
| Time | `sitting.time` (computed by `calculateDuration` → `formatTime`) |
| Duration (hours) | `sitting.durationAsHours` |
| Duration (minutes) | `sitting.durationAsMinutes` |
| Case Ref | `caseItem.caseNumber` |
| Case Name | `caseItem.caseName` |
| Case Type | `caseItem.caseType` |
| Hearing Type | `hearing.hearingType` |
| Location / Channel | `sitting.caseHearingChannel` |
| Applicant | `caseItem.applicant` (computed by `processParties`) |
| Applicant Representative | `caseItem.applicantRepresentative` |
| Respondent | `caseItem.respondent` |
| Respondent Representative | `caseItem.respondentRepresentative` |
| Reporting Restrictions | `caseItem.formattedReportingRestriction` |

Column headers are English-only in the initial implementation (see Open Questions on Welsh headers).

---

## Error Handling & Edge Cases

**CSV generation failure.** `generatePublicationCsv` returns `{}` on any error and logs a warning. `processPublication` continues with `result.csvPath = undefined`. The notification layer omits the CSV attachment when `csvFilePath` is absent — this is the same pattern already used for PDF.

**PDF still succeeds if CSV fails.** The two generators are independent calls. CSV failure does not affect `result.pdfPath`.

**Mixed size cases.** CSVs for large cause lists could be large but are unlikely to exceed the 2MB Notify limit given that CSV is pure text. The size check is included as a safeguard — if exceeded, the email is sent without the CSV attachment (matches current PDF-over-2MB behaviour).

**Format parameter validation on download route.** Anything outside the `["pdf", "csv"]` allowlist returns 400. This prevents both arbitrary file type confusion and path traversal via extension injection, though the existing `path.resolve` containment check in `findFileByArtefactId` already handles the latter.

**artefactId with no CSV.** When `?format=csv` is requested but `{artefactId}.csv` does not exist in storage, `findFileByArtefactId` returns `null`, `getFileBuffer` returns `null`, and `getFileForDownload` returns `{ error: "FILE_NOT_FOUND" }`. The download route responds 404 — same as for a missing PDF.

**renderCauseListData mutates the input.** It calls `(sitting as any).time = ...` etc. on the passed `jsonData`. This is the same shared function used by the PDF. The CSV generator must call it on the same pass or accept that the data is already mutated (since it will have been called first by the PDF generator). In practice, `generateCauseListCsv` calls `renderCauseListData` independently with the same `jsonData` reference — mutation is idempotent, so calling it twice is safe.

---

## Acceptance Criteria Mapping

| Acceptance Criterion | How satisfied |
|---|---|
| CSV download available for CFT cause list publications | `CSV_GENERATOR_REGISTRY` entry for `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` in `service.ts`; `generateCauseListCsv` called during `processPublication` |
| CSV contains same data as PDF table columns | Column list derived directly from fields populated by `renderCauseListData` — the same data source as the PDF template |
| CSV download accessible from the publication viewer page | `hasCsvDownload` flag passed to hearing-lists template; "Download as CSV" link rendered when true |
| CSV download does not break PDF download | PDF and CSV are retrieved via extension-specific `findFileByArtefactId`; download route defaults to PDF when no `?format=` param |
| CSV failure does not break publication pipeline | `generatePublicationCsv` is non-blocking; errors are logged and processing continues |
| Accessible download links | Hidden text distinguishes format (e.g. `<span class="govuk-visually-hidden"> (CSV)</span>`); both links use GOV.UK link component |
| Welsh language support | Translation keys added to both `en.ts` and `cy.ts` for download labels |
| Email notification includes CSV | `csvFilePath` threaded through notification layer; attached via `prepareUpload` when under size limit |

---

## Open Questions

**1. GOV.UK Notify template update.**
The email notification change requires a template update in the GOV.UK Notify service dashboard — this cannot be deployed via code alone. The `link_to_csv_file` personalisation field must be added to whichever template(s) are in use (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`, `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY`). This is an operational dependency that must be coordinated before the notification code is deployed. Decision needed: should CSV email attachment be in scope for this ticket or tracked separately?

**2. CFT artefact flat-file vs rendered distinction.**
`CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` publications are rendered list types (`isFlatFile = false`). They are displayed via the dedicated civil-and-family page, not the flat-file viewer at `/hearing-lists/[locationId]/[artefactId]`. The CSV download link therefore needs to be added to the civil-and-family rendered page (in `libs/list-types/civil-and-family-daily-cause-list/src/pages/`), not to the flat-file viewer. The flat-file download route extension is still needed for any future flat-file list types that produce CSVs. Confirm which page(s) need the CSV link.

**3. CSV header language.**
Should column headers be localised to Welsh when `locale === "cy"`? The PDF uses the same English headers regardless of locale. Keeping CSV headers English-only is simpler and avoids ambiguity when the file is opened in tools that do not understand Welsh. However, if the service has a policy of providing Welsh-language downloadable content, headers should be translated. Decision needed before implementation.

**4. Scope: only CIVIL_AND_FAMILY_DAILY_CAUSE_LIST or additional list types?**
The registry pattern means additional list types are easy to add later. This ticket is scoped to CFT only. Should the csv-utilities and download-route extension be labelled explicitly as foundational infrastructure for future list types, or treated as CFT-specific?
