# Technical Plan: Issue #675 — CSV Magistrates Hearing Lists (Part 2)

## 1. Technical Approach

For each of the four new Magistrates list types, publication processing must produce two output files per artefact: a PDF (rendered via Nunjucks/Puppeteer, same as existing list types) and a CSV (generated from the JSON payload). Both files are stored in `storage/temp/uploads/` using the artefact ID as the filename stem, differentiated by extension (`{artefactId}.pdf`, `{artefactId}.csv`).

This requires a targeted extension to the file retrieval layer — the current `findFileByArtefactId` finds the first file matching the artefact ID prefix, which breaks when two files share the same stem. The fix is minimal: add an extension-aware lookup function and thread it through the download route and flat-file service via an optional `?type=pdf|csv` query parameter.

All four list types map to two shared row-mapper implementations (adult court and public adult court) because daily and future variants have identical column sets. The four list-type modules are therefore thin wrappers that import the shared mapper.

---

## 2. Implementation Details

### 2.1 Register list types — `libs/location/src/list-type-data.ts`

Append four entries at IDs 28–31. Proposed `subJurisdictionIds` value is `[7]` (Magistrates), matching ID 4 (`MAGISTRATES_PUBLIC_LIST`) — **confirm this is correct** (see Open Questions).

```
id: 28  name: MAGISTRATES_ADULT_COURT_LIST_DAILY
id: 29  name: MAGISTRATES_ADULT_COURT_LIST_FUTURE
id: 30  name: MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY
id: 31  name: MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE
```

Each entry needs `englishFriendlyName`, `welshFriendlyName`, `provenance` (likely `CRIME_IDAM`), `urlPath`, `isNonStrategic: false`, `defaultSensitivity: "Public"`.

---

### 2.2 File storage extension — `libs/publication/src/file-storage/file-retrieval.ts`

Add `findFileByArtefactIdAndExtension(artefactId: string, extension: string)` that performs the same containment check as `findFileByArtefactId` but matches `{artefactId}{extension}` exactly rather than prefix-first.

Update `getFileBuffer` and `getFileExtension` to accept an optional `extension?: string` parameter. When provided, they delegate to the extension-aware function; when absent, behaviour is unchanged (preserves backward compat for all existing PDF-only artefacts).

Add `saveFileToStorage(artefactId: string, buffer: Buffer, extension: string): Promise<{ filePath: string; sizeBytes: number }>` — a generalisation of `savePdfToStorage` that accepts any extension. `savePdfToStorage` can be reimplemented as a one-liner calling `saveFileToStorage(artefactId, buffer, ".pdf")`, keeping the existing API intact.

Export the new functions from `libs/publication/src/index.ts`.

---

### 2.3 Download route — `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`

Read `req.query.type` (`"pdf"` | `"csv"` | absent). Map to extension (`.pdf`, `.csv`, or absent). Pass the optional extension through to `getFileForDownload`.

Update `getFileForDownload` in `libs/public-pages/src/flat-file/flat-file-service.ts` to accept an optional `extension?: string` and forward it to `getFileBuffer` and `getFileExtension`.

Existing callers that pass no `?type` continue to get the first-match behaviour, so all non-Magistrates flat files are unaffected.

---

### 2.4 Hearing list page — `libs/public-pages/src/pages/hearing-lists/[locationId]/[artefactId].ts`

Currently the page checks `fileExtension` and redirects non-PDFs directly to download. For Magistrates list types (IDs 28–31), both formats exist. The page should:

1. Call `getFlatFileForDisplay` (unchanged — still retrieves the PDF extension by default for the inline viewer).
2. Check whether a CSV also exists for the artefact by calling `getFileExtension(artefactId, ".csv")` (or a small helper `hasCsvFile(artefactId)`).
3. Pass a `csvDownloadUrl` (`/api/flat-file/${artefactId}/download?type=csv`) to the template when a CSV file is present.

The Nunjucks template `hearing-lists/[locationId]/[artefactId].njk` should render a secondary download link when `csvDownloadUrl` is set. Add translation keys to `en.ts` / `cy.ts` for the CSV link label.

---

### 2.5 Shared row mappers — new directory `libs/list-types/common/src/magistrates/`

Two files:

**`adult-court-row-mapper.ts`** — maps a JSON record to 12 CSV columns:
`Court House, Court Room, LJA, Session Start, Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code`

**`public-adult-court-row-mapper.ts`** — maps a JSON record to 8 CSV columns:
`Court House, Sitting at, Court Room, LJA, Session Start, Listing Time, Defendant Name, Case Number`

Both files export a `mapRows(jsonData: unknown): string[][]` function that returns a header row followed by data rows. Missing fields produce empty strings. Export both from `libs/list-types/common/src/index.ts`.

The JSON payload shape for these list types is currently unknown — see Open Questions. The mappers should be written defensively with optional chaining throughout.

---

### 2.6 CSV generation helper — `libs/list-types/common/src/csv/csv-utilities.ts`

```typescript
export interface CsvGenerationResult {
  success: boolean;
  csvPath?: string;
  sizeBytes?: number;
  error?: string;
}

export async function saveCsvToStorage(
  artefactId: string,
  rows: string[][],
): Promise<CsvGenerationResult>
```

Uses PapaParse (`Papa.unparse(rows)`) to serialise the rows, then writes `{artefactId}.csv` to `TEMP_STORAGE_BASE`. Returns `CsvGenerationResult`. Export from `libs/list-types/common/src/index.ts`.

---

### 2.7 Four list-type modules under `libs/list-types/`

Directory names (kebab-case):
- `magistrates-adult-court-list-daily`
- `magistrates-adult-court-list-future`
- `magistrates-public-adult-court-list-daily`
- `magistrates-public-adult-court-list-future`

Each module contains:
- `package.json` — `@hmcts/<module-name>`, exports `.` and `./config`
- `tsconfig.json`
- `src/config.ts` — `pageRoutes`, `moduleRoot`, `assets`
- `src/index.ts` — exports `generate<Name>Pdf`, `generate<Name>Csv`, `extractCaseSummary`, `formatCaseSummaryForEmail`
- `src/pages/en.ts`, `src/pages/cy.ts` — page content
- `src/pages/index.ts`, `src/pages/index.njk` — page controller and template
- `src/pdf/pdf-generator.ts` — calls shared PDF utilities (Nunjucks template + Puppeteer)
- `src/pdf/pdf-template.njk` — HTML template for PDF output
- `src/csv/csv-generator.ts` — calls the appropriate shared row mapper then `saveCsvToStorage`
- `src/email-summary/summary-builder.ts` — `extractCaseSummary` + re-exports `formatCaseSummaryForEmail`
- `src/models/types.ts` — TypeScript types for the JSON payload (adult court or public adult court shape)

Adult-court daily and future share identical PDF/CSV/email logic — the future module simply imports and re-exports from the daily module. Same for the public adult court pair.

Register each module in the root `tsconfig.json` paths map.

---

### 2.8 PDF generator registry — `libs/publication/src/processing/service.ts`

Add imports for all four `generate<Name>Pdf` functions and register them in `PDF_GENERATOR_REGISTRY` under the four list type name keys.

---

### 2.9 CSV generator registry and `generatePublicationCsv` — `libs/publication/src/processing/service.ts`

Mirror the PDF registry pattern:

```typescript
type CsvGenerator = (params: GenerateCsvParams) => Promise<CsvGenerationResult>;

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = {
  MAGISTRATES_ADULT_COURT_LIST_DAILY: ...,
  MAGISTRATES_ADULT_COURT_LIST_FUTURE: ...,
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY: ...,
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE: ...,
};

export async function generatePublicationCsv(params: GenerateCsvParams): Promise<{ csvPath?: string }>
```

`GenerateCsvParams` is a subset of `GeneratePdfParams` (no `locale`, `provenance`, `displayFrom`, `displayTo` needed for CSV generation).

---

### 2.10 `processPublication` update — `libs/publication/src/processing/service.ts`

After the `generatePublicationPdf` call, add:

```typescript
const csvResult = await generatePublicationCsv({ artefactId, listTypeId, locationId, jsonData, logPrefix });
result.csvPath = csvResult.csvPath;
```

Extend `ProcessPublicationResult` with `csvPath?: string`. CSV failure must not prevent PDF generation or notifications from proceeding — wrap in its own try/catch with a `console.warn`.

---

### 2.11 Email builder registry — `libs/notifications/src/notification/notification-service.ts`

Add imports for all four `extractCaseSummary` / `formatCaseSummaryForEmail` from the new modules and register in `EMAIL_BUILDER_REGISTRY` under the four name keys.

---

### 2.12 Application registration — `apps/web/src/app.ts` and `apps/web/vite.config.ts`

Import `pageRoutes` and `assets` from each of the four new `/config` paths and register them.

---

## 3. Critical Infrastructure Change

The core constraint is that `findFileByArtefactId` (in `libs/publication/src/file-storage/file-retrieval.ts`) uses `files.find(file => file.startsWith(artefactId))` — this returns the first alphabetical match, which becomes non-deterministic when both `.csv` and `.pdf` exist.

The fix must be backward compatible. The strategy:

- `findFileByArtefactId` — unchanged behaviour (still returns first match); used only in cases where a single file per artefact is guaranteed (all existing non-Magistrates types).
- `findFileByArtefactIdAndExtension(artefactId, ext)` — matches `{artefactId}{ext}` exactly; used by the new download route when `?type=` is specified.
- `getFileBuffer(artefactId, extension?)` and `getFileExtension(artefactId, extension?)` — delegate to the appropriate function based on whether `extension` is provided.

No database schema change is needed. The extension is determined at read time from the filesystem filename.

---

## 4. Error Handling and Edge Cases

**CSV generation fails, PDF succeeds** — `processPublication` logs a warning and continues. The artefact record is stored. The hearing list page checks for CSV file existence at render time; if the file is absent, no CSV link is shown. The user can still view and download the PDF.

**PDF generation fails, CSV succeeds** — existing behaviour: `pdfPath` is absent in the result; notification email falls back to the non-PDF template. CSV download link is still shown on the page.

**Missing fields in JSON payload** — row mappers use optional chaining and produce empty strings for absent fields. PapaParse handles empty strings without error.

**Expired artefact** — `getFileForDownload` already checks `displayFrom`/`displayTo` and returns `EXPIRED` before attempting file retrieval. No change needed.

**`?type=csv` requested but only PDF exists** — `findFileByArtefactIdAndExtension` returns `null`; the download route returns 404.

**Backward compat for existing PDF-only artefacts** — `getFileBuffer` called without `extension` falls back to `findFileByArtefactId` (prefix match), which finds the single `.pdf` file as before.

---

## 5. Acceptance Criteria Mapping

| AC | How satisfied |
|----|--------------|
| Four new list types accepted by the publication API | List type IDs 28–31 registered in `list-type-data.ts`; seeded into DB |
| CSV generated on publication | `generatePublicationCsv` called in `processPublication`; CSV written to `storage/temp/uploads/` |
| PDF generated on publication | Registered in `PDF_GENERATOR_REGISTRY`; existing `generatePublicationPdf` flow unchanged |
| CSV available for download | Download route reads `?type=csv`; resolves to `{artefactId}.csv` |
| Hearing list page shows CSV download link | Page controller checks for CSV file; template renders secondary link |
| Correct columns per list type | Adult court: 12 cols; public adult court: 8 cols; enforced in row mappers |
| Notifications sent on publication | Email builder registered in `EMAIL_BUILDER_REGISTRY` |
| Welsh language support | `cy.ts` files present for each module; page controller selects locale |

---

## 6. Open Questions

1. **JSON payload shape** — The structure of the incoming JSON for these four list types is not confirmed. The row mappers cannot be finalised without knowing the exact field paths. This is the highest-priority blocker. Request a sample payload or schema from the data team before writing mappers.

2. **Part 1 list type seeding** — Did issue #674 (Part 1) already seed IDs 28–31 into the database, or is that the responsibility of this ticket? `list-type-data.ts` currently ends at ID 27, so the entries are not yet present. Clarify to avoid a duplicate-ID migration conflict.

3. **CSV column headers in Welsh** — The column headers specified in the AC are in English. Should Welsh publications produce Welsh-language column headers? The row mappers need to know whether to accept a `locale` parameter.

4. **`subJurisdictionIds` for new list types** — ID 4 (`MAGISTRATES_PUBLIC_LIST`) uses `[7]`. Confirm whether all four new Magistrates types should also use `[7]`, or a different sub-jurisdiction.

5. **Email attachment policy for CSV** — The existing email flow attaches the PDF when it is under 2 MB. Should the CSV also be attached, or should the email only contain a link? The GOV.UK Notify attachment size limit is the same 2 MB. Clarify before implementing `sendPublicationNotificationsForArtefact`.

6. **`provenance` for new list types** — Likely `CRIME_IDAM` based on other Magistrates types, but confirm.
