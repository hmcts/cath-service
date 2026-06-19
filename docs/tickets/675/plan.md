# Technical Plan — #675: Excel - Magistrates Hearing Lists (Part 2)

## Critical Prerequisite

**Part 1 (Magistrates list-type module) must be merged first.** The current `master` has no `MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, or `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` entries in `libs/location/src/list-type-data.ts`, and no Magistrates list-type module exists under `libs/list-types/`. This ticket assumes Part 1 delivered those. See Open Questions if Part 1 is not yet merged.

---

## 1. Technical Approach

This ticket introduces an **Excel generation pipeline** alongside the existing PDF pipeline. The key insight from reading the codebase:

- `libs/publication/src/processing/service.ts` has a `PDF_GENERATOR_REGISTRY` keyed by list-type name — we add a parallel `EXCEL_GENERATOR_REGISTRY`.
- `libs/list-types/common/src/pdf/pdf-utilities.ts` has `savePdfToStorage()` which writes `{artefactId}.pdf` to `storage/temp/uploads/` — we add `saveExcelToStorage()` writing `{artefactId}.xlsx`.
- `libs/publication/src/file-storage/file-retrieval.ts`'s `findFileByArtefactId()` scans for any file **starting with** `artefactId` — so storing both `{artefactId}.pdf` and `{artefactId}.xlsx` in the same directory means the current code only finds whichever comes first alphabetically. We need a `findFileByArtefactIdAndExtension(artefactId, ext)` variant.
- The download route (`libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts`) currently resolves one file — we add a `?format=pdf|xlsx` query param.
- The hearing-list page controller currently `res.redirect(downloadUrl)` for non-PDF flat files — for Magistrates generated lists it must instead render the page showing both download links.
- The notification pipeline (`libs/notifications/src/notification/notification-service.ts`) passes a single `pdfFilePath` — we thread an optional `excelFilePath` through.

**ExcelJS** (`exceljs@4.4.0`) is already a dependency in `libs/list-types/common` (used for reading). We use it for writing too.

---

## 2. Column Definitions (Single Source of Truth)

These column sets live in each list-type module's renderer and are shared by both PDF and Excel generators.

**Private lists** (`MAGISTRATES_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_ADULT_COURT_LIST_FUTURE`) — 12 columns:
```
Court House | Court Room | LJA | Session Start | Block Start | Defendant Name |
Date of Birth | Address | Age | Informant | Case Number | Offence Code
```

**Public lists** (`MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`) — 8 columns:
```
Court House | Sitting at | Court Room | LJA | Session Start | Listing Time |
Defendant Name | Case Number
```

---

## 3. Implementation Details

### 3a. New: `libs/list-types/common/src/excel/excel-writer.ts`

Generic Excel writing utility, mirroring the structure of `pdf-utilities.ts`:

```typescript
export interface ExcelRow = Record<string, string | number | null>;

export interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  sizeBytes?: number;
  error?: string;
}

export async function saveExcelToStorage(
  artefactId: string,
  headers: string[],
  rows: ExcelRow[],
  sheetName: string
): Promise<ExcelGenerationResult>
```

Uses `exceljs` to create a workbook, write a header row (bold, frozen), write data rows, return a result with `excelPath = storage/temp/uploads/{artefactId}.xlsx`.

Export from `libs/list-types/common/src/index.ts`.

### 3b. New: Excel generator in the Magistrates list-type module

Assuming Part 1 created `libs/list-types/magistrates-adult-court-list/` (or similar), add:

**`src/excel/excel-generator.ts`** for the private lists:
```typescript
export async function generateMagistratesAdultCourtListExcel(
  options: ExcelGenerationOptions
): Promise<ExcelGenerationResult>
```

Calls the existing renderer to get a flat `{ headers, rows }` structure (same source used for PDF), then calls `saveExcelToStorage()`.

**`src/excel/excel-generator-public.ts`** (or a single file with both) for public lists — same pattern, 8-column set.

Export both generators from the module's `src/index.ts`.

### 3c. Changed: `libs/publication/src/file-storage/file-retrieval.ts`

Add:
```typescript
export async function findFileByArtefactIdAndExtension(
  artefactId: string,
  extension: string  // e.g. ".xlsx" or ".pdf"
): Promise<Buffer | null>
```

This does a targeted lookup for `{artefactId}{extension}` instead of scanning for any matching prefix. The existing `findFileByArtefactId` (used by legacy flat-file uploads) is unchanged.

### 3d. Changed: `libs/publication/src/file-storage/content-type.ts`

Add `.xlsx` to `CONTENT_TYPE_MAP`:
```typescript
".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

### 3e. Changed: `libs/publication/src/processing/service.ts`

Add `GenerateExcelParams`, `GenerateExcelResult`, `ExcelGenerator` types (mirrors the PDF equivalents).

Add `EXCEL_GENERATOR_REGISTRY`:
```typescript
const EXCEL_GENERATOR_REGISTRY: Partial<Record<string, ExcelGenerator>> = {
  MAGISTRATES_ADULT_COURT_LIST_DAILY: (p) => generateMagistratesAdultCourtListExcel(...),
  MAGISTRATES_ADULT_COURT_LIST_FUTURE: (p) => generateMagistratesAdultCourtListExcel(...),
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY: (p) => generateMagistratesPublicAdultCourtListExcel(...),
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE: (p) => generateMagistratesPublicAdultCourtListExcel(...),
};
```

Add `generatePublicationExcel()` (mirrors `generatePublicationPdf()`).

Update `processPublication()` to call `generatePublicationExcel()` alongside `generatePublicationPdf()` when `jsonData` is present, and thread `excelFilePath` into the notifications call.

Update `ProcessPublicationResult` and `SendNotificationsParams` to include optional `excelFilePath`.

### 3f. Changed: `libs/public-pages/src/flat-file/flat-file-service.ts`

Add `format` param to `getFileForDownload`:
```typescript
export async function getFileForDownload(artefactId: string, format: "pdf" | "xlsx" = "pdf")
```

When `format === "xlsx"`, use `findFileByArtefactIdAndExtension(artefactId, ".xlsx")`. Return `FILE_NOT_FOUND` if not present.

Add `getExcelAvailability(artefactId)` for the page controller to know whether to show the Excel link.

### 3g. Changed: `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts`

Read `req.query.format`, validate it is `"pdf"` or `"xlsx"` (allow-list; default `"pdf"`), pass to `getFileForDownload`.

### 3h. Changed: hearing-list page controller

`apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts`

The current code redirects immediately for non-PDF flat files (`index.ts:64-66`). For Magistrates generated lists, both PDF and Excel exist — the page must render showing both download links.

Strategy: after `getFlatFileForDisplay()` succeeds, check whether an Excel file also exists using `getExcelAvailability(artefactId)`. If yes, render the page with both `pdfDownloadUrl` and `excelDownloadUrl`.

```typescript
const pdfDownloadUrl = `/api/flat-file/${result.artefactId}/download?format=pdf`;
const excelDownloadUrl = `/api/flat-file/${result.artefactId}/download?format=xlsx`;
const hasExcel = await getExcelAvailability(result.artefactId);
```

Pass `hasExcel`, `pdfDownloadUrl`, `excelDownloadUrl` to the template.

Update `apps/web/src/pages/(public)/hearing-lists/en.ts` and `cy.ts` with new content keys:
- `downloadHeading` — "Download this hearing list"
- `downloadExcelLinkText` — "Download as a spreadsheet (Excel)"
- `excelFileLabel` — "Excel spreadsheet"
- `excelNotAvailable` — "The spreadsheet version of this list is not available."

Update `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.njk` to render the dual download block when `hasExcel` is true.

### 3i. Changed: notification service

`libs/notifications/src/notification/notification-service.ts`

Add optional `excelFilePath` to `PublicationEvent` and `ListTypePublicationEvent`.

In `buildEmailDataWithPdf` (`:236`) rename/generalise to handle both files. The simplest approach: keep attaching the PDF buffer as `link_to_file` (existing template), and add `link_to_file_excel` as a second personalisation variable when Excel is present and under size limit.

`libs/notifications/src/govnotify/govnotify-client.ts` — add second `prepareUpload` call for the Excel buffer when provided.

`libs/notifications/src/govnotify/template-config.ts` — add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` env var for a new Notify template that renders both file links. Add `getSubscriptionTemplateIdForListType` overload for `hasPdf && hasExcel`.

**Note:** The GOV.UK Notify email templates themselves must be updated by the ops/Notify team — this is a cross-team dependency. The code adds the personalisation variable; the template must reference it.

---

## 4. File Structure Summary

```
libs/list-types/common/src/excel/
  excel-writer.ts              # NEW — saveExcelToStorage(), ExcelGenerationResult

libs/list-types/magistrates-adult-court-list/src/excel/
  excel-generator.ts           # NEW — generateMagistratesAdultCourtListExcel()
  excel-generator-public.ts    # NEW — generateMagistratesPublicAdultCourtListExcel()

libs/publication/src/file-storage/
  content-type.ts              # CHANGED — add .xlsx MIME type
  file-retrieval.ts            # CHANGED — add findFileByArtefactIdAndExtension()

libs/publication/src/processing/
  service.ts                   # CHANGED — EXCEL_GENERATOR_REGISTRY, generatePublicationExcel()

libs/public-pages/src/flat-file/
  flat-file-service.ts         # CHANGED — format param, getExcelAvailability()

libs/public-pages/src/routes/api/flat-file/[artefactId]/
  download.ts                  # CHANGED — ?format query param

apps/web/src/pages/(public)/hearing-lists/
  en.ts                        # CHANGED — new content keys
  cy.ts                        # CHANGED — new Welsh content keys (translations needed)

apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/
  index.ts                     # CHANGED — dual download links
  index.njk                    # CHANGED — render Excel download link when available

libs/notifications/src/govnotify/
  govnotify-client.ts          # CHANGED — second prepareUpload for Excel
  template-config.ts           # CHANGED — new template ID env var

libs/notifications/src/notification/
  notification-service.ts      # CHANGED — excelFilePath threaded through
```

---

## 5. Error Handling & Edge Cases

- **`format=xlsx` but no Excel file exists** (e.g. older artefacts): `getFileForDownload` returns `FILE_NOT_FOUND` → download route returns 404. The page controller checks `getExcelAvailability` before rendering the link, so this link only appears when the file exists.
- **Unknown `format` value**: treat as `"pdf"` (default) — no user input reaches the file path.
- **Empty JSON payload**: Excel generator must still produce a valid `.xlsx` with only a header row.
- **Excel > 2MB**: Follow same `exceedsMaxSize` pattern as PDF — store the file but do not attach it to the Notify email; send link-only template instead.
- **Part 1 not merged**: `EXCEL_GENERATOR_REGISTRY` lookup returns `undefined`, `generatePublicationExcel()` returns `{}`, no Excel file is written. Graceful no-op.
- **Renderer produces no rows**: Excel writes header row only — valid file, no crash.

---

## 6. Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Excel + PDF download options for all 4 list types | EXCEL_GENERATOR_REGISTRY + hearing-list page dual links |
| Both file types in email notifications | excelFilePath threaded through → second link_to_file personalisation |
| Uniform fields across Excel and PDF | Shared renderer `{ headers, rows }` output consumed by both generators |
| Private lists: 12 columns | Renderer in magistrates-adult-court-list module |
| Public lists: 8 columns (no sensitive fields) | Separate public renderer / column set |

---

## 7. Open Questions / Clarifications Needed

1. **Is Part 1 merged?** The four list-type names don't exist in `list-type-data.ts` on current `master`. If Part 1 is in a branch but not merged, confirm the module path (`libs/list-types/magistrates-adult-court-list/` or different name) and renderer API before implementing.

2. **JSON field mapping**: What are the exact source JSON paths for `LJA`, `Informant`, `Block Start`, `Listing Time`, `Offence Code`, and `Age` in the Magistrates payload? Is `Age` calculated from Date of Birth + content date, or is it provided directly in the JSON?

3. **GOV.UK Notify template**: Adding `link_to_file_excel` requires a new or updated Notify template. Who is the contact for this, and is there an existing template that handles two file links? This is a blocker for email AC.

4. **Renderer API from Part 1**: Does the Part 1 renderer already return a `{ headers, rows }` flat structure, or does it return a hierarchical object for PDF template rendering only? The Excel generator needs flat rows — confirm whether Part 1 exports a suitable function or whether we need to add one.

5. **Welsh column headers**: Should the Excel file headers be translated for Welsh-language artefacts (`language = "WELSH"`)? The PDF from Part 1 sets the precedent — match whatever it does.
