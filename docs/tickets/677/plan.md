# Technical Plan: Excel – CFT Hearing Lists (#677)

## 1. Technical Approach

Add Excel (.xlsx) generation for the three Civil and Family hearing list types, expose an Excel download alongside the existing PDF on the hearing list page, and include an Excel download link in notification emails.

**Key constraint:** `exceljs` (v4.4.0) is already a dependency — used only for import today. We use it for export.

**Scope:** `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `CIVIL_DAILY_CAUSE_LIST`, `FAMILY_DAILY_CAUSE_LIST`.

---

## 2. Implementation Details

### 2.1 File structure

```
libs/list-types/common/src/excel/
  excel-utilities.ts               # saveExcelToStorage() — mirrors savePdfToStorage()

libs/list-types/civil-and-family-daily-cause-list/src/excel/
  excel-generator.ts               # generateCauseListExcel()

libs/list-types/civil-daily-cause-list/src/excel/
  excel-generator.ts               # generateCivilDailyCauseListExcel()

libs/list-types/family-daily-cause-list/src/excel/
  excel-generator.ts               # generateFamilyDailyCauseListExcel()
```

Files changed (not created):
- `libs/list-types/common/src/index.ts` — export `saveExcelToStorage`
- `libs/list-types/civil-and-family-daily-cause-list/src/index.ts` — export `generateCauseListExcel`
- `libs/list-types/civil-daily-cause-list/src/index.ts` — export `generateCivilDailyCauseListExcel`
- `libs/list-types/family-daily-cause-list/src/index.ts` — export `generateFamilyDailyCauseListExcel`
- `libs/publication/src/file-storage/content-type.ts` — add `.xlsx`
- `libs/publication/src/processing/service.ts` — add Excel generator registry + `generatePublicationExcel()` called from `processPublication()`; pass `xlsxFilePath` to notifications
- `libs/notifications/src/notification/notification-service.ts` — accept `xlsxFilePath` in events; pass download URL to email templates
- `libs/notifications/src/govnotify/template-config.ts` — add `excel_download_link` personalisation field
- `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` — accept `?format=xlsx` query param; resolve correct file
- `libs/public-pages/src/flat-file/flat-file-service.ts` — expose `xlsxExists` flag alongside PDF result
- `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts` — pass `xlsxDownloadUrl` + `hasXlsx` to template
- `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.njk` — render two download links
- `apps/web/src/pages/(public)/hearing-lists/en.ts` — new content keys
- `apps/web/src/pages/(public)/hearing-lists/cy.ts` — new Welsh content keys

### 2.2 Excel generator pattern (`libs/list-types/common/src/excel/excel-utilities.ts`)

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import { TEMP_STORAGE_BASE } from "../pdf/pdf-utilities.js";

export interface ExcelGenerationResult {
  success: boolean;
  xlsxPath?: string;
  sizeBytes?: number;
  error?: string;
}

export async function saveExcelToStorage(artefactId: string, buffer: Buffer): Promise<ExcelGenerationResult> {
  await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });
  const xlsxPath = path.join(TEMP_STORAGE_BASE, `${artefactId}.xlsx`);
  await fs.writeFile(xlsxPath, buffer);
  const sizeBytes = buffer.length;
  return { success: true, xlsxPath, sizeBytes };
}
```

### 2.3 Per-list Excel generator (example: `civil-and-family-daily-cause-list`)

```typescript
import { Workbook } from "exceljs";
import { saveExcelToStorage } from "@hmcts/list-types-common";
import type { CauseListData } from "../models/types.js";
import { renderCauseListData } from "../rendering/renderer.js";

export async function generateCauseListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  try {
    const renderedData = await renderCauseListData(options.jsonData, { ... });
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Hearing List");

    sheet.columns = [
      { header: "Time", key: "time" },
      { header: "Case ref", key: "caseRef" },
      { header: "Case name", key: "caseName" },
      { header: "Case type", key: "caseType" },
      { header: "Hearing type", key: "hearingType" },
      { header: "Location", key: "location" },
      { header: "Duration", key: "duration" },
      { header: "Applicant/Petitioner", key: "applicant" },
      { header: "Respondent", key: "respondent" },
      { header: "Reporting restriction", key: "reportingRestrictions" },
      { header: "Court house", key: "courtHouse" },
      { header: "Courtroom", key: "courtroom" },
      { header: "Before", key: "judiciary" },
    ];

    // Flatten courtLists → courtRoom → session → sittings → hearing → case
    for (const courtList of renderedData.listData.courtLists) {
      for (const room of courtList.courtHouse.courtRoom) {
        for (const session of room.session) {
          for (const sitting of session.sittings) {
            for (const hearing of sitting.hearing) {
              for (const c of hearing.case) {
                sheet.addRow({
                  time: sanitizeCell(sitting.sittingStart),
                  caseRef: sanitizeCell(c.caseNumber),
                  // ... etc
                });
              }
            }
          }
        }
      }
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return saveExcelToStorage(options.artefactId, buffer);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Prevent formula injection (=, +, -, @)
function sanitizeCell(value: string | undefined): string {
  if (!value) return "";
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
```

### 2.4 Content-type map

Add to `libs/publication/src/file-storage/content-type.ts`:
```typescript
".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

### 2.5 Publication processing service

Add an `EXCEL_GENERATOR_REGISTRY` and `generatePublicationExcel()` in `libs/publication/src/processing/service.ts` with the same structure as the PDF registry (only the 3 CFT list types). Call it inside `processPublication()` right after `generatePublicationPdf()`, catching errors so Excel failure never blocks PDF or publication. Pass `xlsxFilePath` to `sendPublicationNotificationsForArtefact`.

```typescript
// New result fields
interface ProcessPublicationResult {
  // existing...
  xlsxPath?: string;
}
```

### 2.6 Download endpoint

`libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` — add `?format` query parameter:

```typescript
const format = typeof req.query.format === "string" ? req.query.format.toLowerCase() : "pdf";
const result = await getFileForDownload(artefactId, format === "xlsx" ? "xlsx" : "pdf");
```

`getFileForDownload` in `flat-file-service.ts` gains an optional `format` param and uses `findFileByExtension(artefactId, extension)` to look up the right file. The existing `findFileByArtefactId` finds _any_ file starting with artefactId — introduce `findFileByArtefactIdAndExtension` in `file-retrieval.ts` (or pass a preferred extension and fall back).

For the Excel download, set `Content-Disposition: attachment` (force download, not inline).

### 2.7 Hearing list page

`flat-file-service.ts / getFlatFileForDisplay` — check whether `{artefactId}.xlsx` also exists in storage and return `hasXlsx: boolean`.

Page controller passes `xlsxDownloadUrl` and `hasXlsx` to the template. Template conditionally renders both download links using `<a>` elements styled with GOV.UK link styling.

### 2.8 Email notifications

The email strategy is links-only (no Excel attachment). Add `xlsxFilePath` to `PublicationEvent` and `ListTypePublicationEvent`. In `buildEmailTemplateData`, if `xlsxFilePath` is present, add `excel_download_link` personalisation using the public URL pattern `{CATH_SERVICE_URL}/api/flat-file/{artefactId}/download?format=xlsx`. This requires a new `display_excel` boolean personalisation field and corresponding GOV.UK Notify template update (outside this repo — coordination required).

**Template parameters additions:**
```typescript
display_excel?: string;       // "yes" | "no"
excel_download_link?: string; // full URL to xlsx download
```

---

## 3. Excel Column Set (matches Civil & Family PDF)

| # | Header | Source |
|---|--------|--------|
| 1 | Time | `sitting.sittingStart` |
| 2 | Case ref | `case.caseNumber` |
| 3 | Case name | `case.caseName` |
| 4 | Case type | `case.caseType` |
| 5 | Hearing type | `hearing.hearingType` |
| 6 | Location | `sitting.channel[]` joined |
| 7 | Duration | derived from sittingStart/sittingEnd |
| 8 | Applicant/Petitioner | `case.party[]` role=APPLICANT_PETITIONER |
| 9 | Respondent | `case.party[]` role=RESPONDENT |
| 10 | Reporting restriction | `case.reportingRestrictionDetail[]` joined |
| 11 | Court house | `courtHouse.courtHouseName` (repeated per row) |
| 12 | Courtroom | `courtRoom.courtRoomName` (repeated per row) |
| 13 | Before (Judiciary) | `session.judiciary[].johKnownAs` joined |

All string cells pass through `sanitizeCell()` to prevent formula injection.

---

## 4. Error Handling & Edge Cases

- **Excel generation failure** — caught, logged with `console.warn`; must not block PDF or publication.
- **No xlsx file for artefact** — `getFileForDownload` with `format=xlsx` returns `FILE_NOT_FOUND`; endpoint returns 404. Page controller hides the Excel link if `hasXlsx` is false.
- **Invalid format param** — anything other than `xlsx` falls back to PDF behaviour.
- **Formula injection** — `sanitizeCell()` prefixes `'` for cells starting with `=`, `+`, `-`, `@`.
- **Legacy artefacts** (published before this feature) — no `.xlsx` file exists; page hides the Excel link gracefully.

---

## 5. Acceptance Criteria Mapping

| AC | Implementation |
|----|---------------|
| Excel + PDF downloadable for all Civil & Family lists | Excel generator for 3 list types; both download links shown on page |
| Same data fields as PDF | Column set matches PDF template; flat rows preserve all fields |
| Links in email notifications | `excel_download_link` personalisation added to Notify email; `display_excel: "yes"` |

---

## 6. New Content Keys

**`apps/web/src/pages/(public)/hearing-lists/en.ts`:**
```typescript
downloadHeading: "Download this hearing list",
downloadPdfLinkText: "Download as PDF",
downloadExcelLinkText: "Download as Excel",
```

**`apps/web/src/pages/(public)/hearing-lists/cy.ts`:**
```typescript
downloadHeading: "Lawrlwytho'r rhestr wrando hon",
downloadPdfLinkText: "Lawrlwytho fel PDF",
downloadExcelLinkText: "Lawrlwytho fel Excel",
```

---

## 7. CLARIFICATIONS NEEDED

1. **GOV.UK Notify templates** — adding `display_excel` / `excel_download_link` personalisation fields requires editing Notify templates in the Notify console (not in this repo). This must be coordinated before the notification changes go live. Should a new template be created, or should existing templates be edited?

2. **Which list types are in scope?** Assumed: `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `CIVIL_DAILY_CAUSE_LIST`, `FAMILY_DAILY_CAUSE_LIST`. Are any additional CFT list types (e.g. RCJ standard lists) expected to have Excel export?

3. **Email: links vs attachment** — assumed Excel is link-only (no file attached to email). Confirm this is correct.

4. **`findFileByArtefactId` picks the first matching file** — currently there will only be one file per artefactId. When both `.pdf` and `.xlsx` exist for the same artefactId, `getFileBuffer`/`getFileExtension` (used by `getFlatFileForDisplay`) will return whichever file comes first alphabetically. The download endpoint needs to request a specific extension. Confirm the preferred approach: extend `file-retrieval.ts` to accept a preferred extension, or keep them as separate storage keys?

5. **`Content-Disposition` for PDF download** — currently `inline`. Should the PDF download link remain inline (opens in browser) while Excel is `attachment` (force-download)? Or should both be `attachment`?
