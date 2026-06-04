# Technical Plan: CSV - Crown Hearing Lists (#674)

## 1. Technical Approach

Crown lists (Daily, Firm, Warned) currently have no list-type modules, no PDF generators, and no CSV generators. This ticket delivers CSV generation for all three Crown list types, a download option on the viewer page, and CSV+PDF links in notification emails.

The implementation follows the existing pattern used by other list types:
- CSV generation using `Papa.unparse` (same library already used in `libs/system-admin-pages`)
- A `CSV_GENERATOR_REGISTRY` mirroring the existing `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`
- Storage as `{artefactId}.csv` alongside any existing PDF at `storage/temp/uploads/`
- The existing flat-file download route at `GET /api/flat-file/:artefactId/download` already supports CSV via content-type detection — it just needs a `?format=` param to select between renditions

**Prerequisite assumption:** Crown lists are ingested as structured JSON (not flat-file PDFs). If they are ingested as flat files (`isFlatFile: true`), per-column CSV cannot be generated and this plan is blocked. This must be confirmed before implementation.

## 2. Implementation Details

### 2.1 File Structure

```
libs/list-types/
├── crown-daily-list/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                          # exports generateCrownDailyListCsv
│       └── csv/
│           ├── csv-generator.ts              # CSV generation logic
│           └── csv-generator.test.ts
├── crown-firm-list/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       └── csv/
│           ├── csv-generator.ts
│           └── csv-generator.test.ts
└── crown-warned-list/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        └── csv/
            ├── csv-generator.ts
            └── csv-generator.test.ts
```

No new `libs/` module is needed for the download route or viewer — those changes go inside `libs/public-pages` and `libs/publication`.

### 2.2 CSV Column Schemas

**Crown Daily List** (10 columns, in order):
`Court House`, `Court Room`, `Judge`, `Sitting at`, `Hearing Time`, `Case Reference`, `Defendant Name(s)`, `Hearing Type`, `Prosecuting Authority`, `Listing Notes`

**Crown Firm List** (12 columns, in order):
`Date`, `Court House`, `Court Room`, `Judge`, `Sitting at`, `Hearing Time`, `Case Number`, `Defendant Name(s)`, `Hearing Type`, `Representative`, `Prosecuting Authority`, `Listing Notes`

**Crown Warned List** (7 columns, in order):
`Hearing`, `Fixed For`, `Case Reference`, `Defendant Name(s)`, `Prosecuting Authority`, `Linked Cases`, `Listing Notes`

Multi-value fields (Judge, Defendant Names, Linked Cases) are joined with `, `. `Papa.unparse` handles quoting of commas/newlines in free-text fields like Listing Notes.

### 2.3 CSV Generator Pattern

Each module follows this pattern:

```typescript
// libs/crown-daily-list/src/csv/csv-generator.ts
import Papa from "papaparse";

export function generateCrownDailyListCsv(jsonData: unknown): string {
  const rows = extractDailyListRows(jsonData);
  return Papa.unparse(rows, { header: true });
}

function extractDailyListRows(data: unknown): CrownDailyListRow[] {
  // flatten nested JSON → one row per hearing/case
}

interface CrownDailyListRow {
  "Court House": string;
  "Court Room": string;
  "Judge": string;
  "Sitting at": string;
  "Hearing Time": string;
  "Case Reference": string;
  "Defendant Name(s)": string;
  "Hearing Type": string;
  "Prosecuting Authority": string;
  "Listing Notes": string;
}
```

### 2.4 CSV Generator Registry

In `libs/publication/src/processing/service.ts`, add a `CSV_GENERATOR_REGISTRY` alongside the existing `PDF_GENERATOR_REGISTRY`:

```typescript
import { generateCrownDailyListCsv } from "@hmcts/crown-daily-list";
import { generateCrownFirmListCsv } from "@hmcts/crown-firm-list";
import { generateCrownWarnedListCsv } from "@hmcts/crown-warned-list";

const CSV_GENERATOR_REGISTRY: Partial<Record<string, (jsonData: unknown) => string>> = {
  CROWN_DAILY_LIST: generateCrownDailyListCsv,
  CROWN_FIRM_LIST: generateCrownFirmListCsv,
  CROWN_WARNED_LIST: generateCrownWarnedListCsv,
};
```

`processPublication` calls the CSV generator after PDF generation and stores the result as `{artefactId}.csv`:

```typescript
const csvGenerator = listType ? CSV_GENERATOR_REGISTRY[listType.name] : undefined;
if (csvGenerator && artefact.jsonData) {
  const csvContent = csvGenerator(artefact.jsonData);
  await saveCsvToStorage(artefact.artefactId, csvContent);
}
```

### 2.5 Storage — Multi-Rendition Support

`libs/publication/src/file-storage/file-retrieval.ts` currently finds files by `artefactId` prefix (first match). Since `{artefactId}.pdf` and `{artefactId}.csv` share the same prefix, `findFileByArtefactId` needs a `format` parameter:

```typescript
export async function findFileByArtefactId(
  artefactId: string,
  format: "pdf" | "csv" = "pdf"
): Promise<{ buffer: Buffer; extension: string } | null>
```

Add `saveCsvToStorage(artefactId, csvContent)` alongside existing `savePdfToStorage`.

### 2.6 Download Route — Format Parameter

`libs/public-pages/src/routes/flat-file/[artefactId]/download.ts` and `libs/public-pages/src/flat-file/flat-file-service.ts`:

- Accept `?format=pdf|csv` query param (default `pdf` for backwards compatibility)
- Validate format against `["pdf", "csv"]` allow-list; return 400 for unknown values
- Pass `format` to `findFileByArtefactId`
- Return 404 if requested rendition does not exist in storage

### 2.7 Viewer Page — Download Options

`libs/public-pages/src/pages/hearing-lists/[locationId]/[artefactId].ts`:

The viewer currently checks `isPdf` to decide whether to render inline or redirect. Extend to:
1. Check whether a CSV rendition exists for the artefact (call `findFileByArtefactId(artefactId, "csv")`)
2. Pass `hasCsvDownload: boolean` and `csvDownloadUrl` to the template
3. Render PDF inline as today, but add a "Download this hearing list" block with both options when available

Template changes (`[artefactId].njk`): add a section above the inline PDF:

```html
<h2 class="govuk-heading-m">{{ t.downloadSectionHeading }}</h2>
<ul class="govuk-list">
  <li><a href="{{ downloadUrl }}" class="govuk-link">{{ t.downloadPdfText }}</a></li>
  {% if hasCsvDownload %}
  <li><a href="{{ csvDownloadUrl }}" class="govuk-link">{{ t.downloadCsvText }}</a></li>
  {% endif %}
</ul>
```

Content strings added to `libs/public-pages/src/pages/hearing-lists/en.ts` and `cy.ts`:
- `downloadSectionHeading`, `downloadPdfText`, `downloadCsvText`

### 2.8 Email Notifications

`libs/notifications/src/govnotify/template-config.ts` / `notification-service.ts`:

The notification currently passes a single `pdfFilePath`. Extend to pass both download URLs as links (not file attachments) in the Notify template parameters:

```typescript
pdf_download_link: `${CATH_SERVICE_URL}/api/flat-file/${artefactId}/download?format=pdf`,
csv_download_link: `${CATH_SERVICE_URL}/api/flat-file/${artefactId}/download?format=csv`,
```

The GOV.UK Notify templates (Crown list templates) need updating to include both link placeholders. The Notify template IDs to update must be confirmed — see Open Questions.

### 2.9 Root tsconfig.json — Register New Packages

Add path aliases for all three new packages:
```json
"@hmcts/crown-daily-list": ["libs/list-types/crown-daily-list/src"],
"@hmcts/crown-firm-list": ["libs/list-types/crown-firm-list/src"],
"@hmcts/crown-warned-list": ["libs/list-types/crown-warned-list/src"]
```

## 3. Error Handling & Edge Cases

- **Missing JSON data**: If `artefact.jsonData` is null/undefined, skip CSV generation silently (log warning). Do not fail the publication processing or prevent PDF/notifications.
- **CSV generation throws**: Catch per-generator and log; do not re-throw. PDF generation and notifications must still proceed.
- **CSV not found on download**: Return 404 `{ error: "File not found in storage" }`.
- **Invalid format param**: Return 400 `{ error: "Invalid request" }`.
- **Multi-value fields**: Always join arrays with `, `; treat null/undefined as empty string `""`.
- **Listing Notes**: Contains free text with commas and newlines — `Papa.unparse` handles quoting automatically.
- **Crown list without CSV rendition**: Viewer page shows only the PDF download option; never errors on missing CSV.

## 4. Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| CSV and PDF available as download options for Crown hearing lists | §2.4 CSV registry generates CSV on publication; §2.7 viewer shows both options |
| Links to both file types in email notifications | §2.8 notification service passes both download URLs |
| Uniform fields across CSV and PDF for all three Crown list types | Column schemas in §2.2 define the canonical set; PDF generators (if implemented on same ticket) use matching fields |
| Crown Daily List columns (10) | §2.2 and `crown-daily-list` CSV generator |
| Crown Firm List columns (12, includes Date + Representative) | §2.2 and `crown-firm-list` CSV generator |
| Crown Warned List columns (7, includes Hearing + Fixed For + Linked Cases) | §2.2 and `crown-warned-list` CSV generator |

## 5. Open Questions / CLARIFICATIONS NEEDED

1. **Crown list ingestion format** — Are Crown lists ingested as structured JSON (rendering possible) or uploaded as flat PDF files (`isFlatFile: true`)? If flat files, per-column CSV generation is not possible. This is a blocker.

2. **Crown JSON schema** — What does a sample Crown Daily/Firm/Warned list JSON payload look like? The field mapping in §2.2 is based on the AC column names; the exact nested paths (e.g. how Judge vs multiple judges, how Defendant array, how Linked Cases) must be confirmed against real data before writing the extraction logic.

3. **Crown PDF generators** — Do Crown list PDF generators exist (or are they being delivered by a sibling ticket)? The "uniform columns" AC requires the PDF to show the same fields. If no Crown PDF generator exists yet, it must be built here too.

4. **Notify template IDs** — Which GOV.UK Notify template IDs cover Crown list notifications? These templates need updating to add `((pdf_download_link))` and `((csv_download_link))` placeholders. Confirm template IDs and whether a separate Notify deployment is required.

5. **Welsh CSV headers** — Should CSV column headers be localised (Welsh headers in Welsh CSVs)? Or do all CSVs use English headers (common for machine-readable exports)?

6. **Access control on CSV download** — Crown lists are marked `defaultSensitivity: "Public"`. Confirm the CSV download link in emails does not need authentication, or confirm that the download route enforces the same IDAM/verified-user gate as the PDF.
