# Plan: #673 — CSV for Magistrates Public and Standard Hearing Lists

## 1. Technical Approach

Add CSV generation for `MAGISTRATES_PUBLIC_LIST` and `MAGISTRATES_STANDARD_LIST`, surfaced as:
1. A pre-generated CSV file stored alongside the existing PDF at publication time.
2. A new download API route serving the CSV with the correct headers.
3. A CSV link on the list view page (alongside the existing PDF link).
4. A CSV link in subscription email notifications (alongside the existing PDF link).

**Scope boundary — critical open question (see §9):** The AC states "CSV and PDF downloadable files are made available." Neither list type currently has a PDF generator registered in `PDF_GENERATOR_REGISTRY`, and `MAGISTRATES_STANDARD_LIST` does not exist in `list-type-data.ts`. This plan assumes PDF generation for both list types is also in-scope for this ticket (they share the same column definitions). If PDF generation is a separate prerequisite ticket, the CSV work cannot be fully tested end-to-end; clarify before starting.

**CSV serialisation library:** PapaParse 5.5.3 is already in the monorepo (used by `libs/system-admin-pages`). Use it for consistent RFC-4180-compliant output.

---

## 2. Files to Create

### CSV utility (shared)
```
libs/list-types/common/src/csv/csv-utilities.ts
libs/list-types/common/src/csv/csv-utilities.test.ts
```

### Magistrates list-type module (new)
```
libs/list-types/magistrates-list/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config.ts
    ├── csv/
    │   ├── csv-generator.ts           # generateMagistratesPublicListCsv, generateMagistratesStandardListCsv
    │   └── csv-generator.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts           # generateMagistratesPublicListPdf, generateMagistratesStandardListPdf
    │   └── pdf-generator.test.ts
    ├── rendering/
    │   ├── magistrates-public-list-renderer.ts   # JSON → normalised rows
    │   ├── magistrates-standard-list-renderer.ts # JSON → normalised rows (one per offence)
    │   └── renderer.test.ts
    └── models/
        └── types.ts                   # MagistratesPublicListRow, MagistratesStandardListRow
```

### CSV download route
```
libs/public-pages/src/routes/csv/[artefactId]/download.ts
```

---

## 3. Files to Modify

| File | Change |
|------|--------|
| `libs/location/src/list-type-data.ts` | Add `MAGISTRATES_STANDARD_LIST` entry (next available id after existing entries) |
| `libs/publication/src/processing/service.ts` | Add `CSV_GENERATOR_REGISTRY`, `generatePublicationCsv()`, call it in `processPublication` |
| `libs/notifications/src/notification/notification-service.ts` | Thread `csvFilePath` through `sendPublicationNotificationsForArtefact`; upload CSV buffer to Notify if present |
| `libs/notifications/src/govnotify/template-config.ts` | Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` env var; extend `getSubscriptionTemplateIdForListType` signature; add `link_to_csv_file` to `TemplateParameters` |
| `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts` | No change needed — CSV has its own route |
| Root `tsconfig.json` | Add `@hmcts/magistrates-list` path alias |
| Root `package.json` / `turbo.json` | Register new workspace package |

---

## 4. CSV Utility Design (`libs/list-types/common/src/csv/csv-utilities.ts`)

```typescript
export interface CsvGenerationResult {
  success: boolean;
  csvPath?: string;
  sizeBytes?: number;
  error?: string;
}

// Serialises a 2D array to RFC-4180 CSV string, UTF-8 BOM prepended for Excel compatibility.
export function buildCsv(rows: string[][]): string

// Writes CSV string to TEMP_STORAGE_BASE/{artefactId}.csv
export async function saveCsvToStorage(artefactId: string, csvContent: string): Promise<CsvGenerationResult>

export function createCsvErrorResult(error: unknown): CsvGenerationResult
```

- Uses `Papa.unparse()` from PapaParse with `{ newline: "\r\n" }`.
- Prepends UTF-8 BOM (`﻿`) so Excel renders Welsh/accented characters correctly.
- Storage path mirrors PDF: `path.join(TEMP_STORAGE_BASE, `${artefactId}.csv`)` (import `TEMP_STORAGE_BASE` from `pdf-utilities.ts`).

---

## 5. Column Definitions

### 5.1 Magistrates Public List (9 columns)

| # | Header | Source path in JSON |
|---|--------|---------------------|
| 1 | Court House | `courtHouse.courtHouseName` |
| 2 | Court Room | `courtRoom.courtRoomName` |
| 3 | Sitting at | `sitting.sittingStart` (formatted time) |
| 4 | URN | `hearing.case[].caseUrn` |
| 5 | Name | `hearing.case[].party[type=IND].name` |
| 6 | Hearing Type | `hearing.hearingType` |
| 7 | Prosecuting Authority | `hearing.case[].prosecutionCounsel` or `party[type=ORG]` |
| 8 | Offence Details | `offence.offenceWording` (joined if multiple) |
| 9 | Reporting Restrictions | `hearing.case[].reportingRestrictionDetail` |

One row per case/hearing.

### 5.2 Magistrates Standard List (26 columns)

| # | Header | Level |
|---|--------|-------|
| 1 | Court House | case |
| 2 | LJA | case |
| 3 | Court Room | case |
| 4 | Sitting at | case |
| 5 | Name | case |
| 6 | Application Particulars | case |
| 7 | DOB | case |
| 8 | Age | case |
| 9 | Address | case |
| 10 | Prosecuting Authority Name | case |
| 11 | Attendance Method | case |
| 12 | Reference | case |
| 13 | Application Type | case |
| 14 | ASN | case |
| 15 | Hearing Type | case |
| 16 | Panel | case |
| 17 | Reporting Restrictions | case |
| 18 | Offence Code | offence |
| 19 | Offence Title | offence |
| 20 | Offence Details | offence |
| 21 | Legislation | offence |
| 22 | Max Penalty | offence |
| 23 | Plea | offence |
| 24 | Date of Plea | offence |
| 25 | Convicted on | offence |
| 26 | Adjourned from | offence |

**One row per offence.** Case-level fields (columns 1–17) repeat on every row. A case with zero offences produces one row with offence columns blank.

**Column parity with PDF:** Both the CSV generator and the PDF renderer must use the same normalised data types (`MagistratesPublicListRow` / `MagistratesStandardListRow`) to guarantee uniform field exposure.

---

## 6. Pipeline Wiring (`libs/publication/src/processing/service.ts`)

```typescript
interface GenerateCsvResult {
  csvPath?: string;
  sizeBytes?: number;
}

type CsvGenerator = (params: GeneratePdfParams) => Promise<CsvGenerationResult>;

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = {
  MAGISTRATES_PUBLIC_LIST: (p) => generateMagistratesPublicListCsv({ ...p, jsonData: p.jsonData as MagistratesPublicListData }),
  MAGISTRATES_STANDARD_LIST: (p) => generateMagistratesStandardListCsv({ ...p, jsonData: p.jsonData as MagistratesStandardListData }),
};

async function generatePublicationCsv(params: GeneratePdfParams): Promise<GenerateCsvResult> {
  // lookup by listType.name, call generator, log+swallow errors (never block publication)
}
```

In `processPublication`:
1. Call `generatePublicationPdf` (unchanged).
2. Call `generatePublicationCsv`; capture `csvPath`.
3. Pass `csvPath` as new optional param to `sendPublicationNotificationsForArtefact`.

CSV failure must be caught, logged, and must not prevent the PDF step or notification step from completing.

---

## 7. CSV Download Route (`libs/public-pages/src/routes/csv/[artefactId]/download.ts`)

Mirrors `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`:

- Validate `artefactId` against UUID regex → 400 on failure.
- Resolve artefact from DB; confirm requester is authorised (same `canAccessPublicationData` check as the list view page).
- Resolve `path.join(TEMP_STORAGE_BASE, `${artefactId}.csv`)`.
- If file missing → 404. If artefact expired → 410.
- Respond: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="{listTypeName}-{contentDate}.csv"`, `Cache-Control: private, no-store`.

---

## 8. Email Notification Changes

### `template-config.ts`
- Add env var `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`.
- Extend `getSubscriptionTemplateIdForListType` to select the new template when both PDF and CSV are present.
- Add `link_to_csv_file?: unknown` to `TemplateParameters`.

### `notification-service.ts`
- `sendPublicationNotificationsForArtefact` gains optional `csvFilePath?: string`.
- When present and file is ≤ 2MB, read it and pass to `sendEmail` as a second `prepareUpload` call, stored in personalisation as `link_to_csv_file`.
- If CSV upload fails, log the error and still send the email without the CSV link (graceful degradation).

### GOV.UK Notify templates (managed in Notify console, not in this repo)
- Add a new template variant that renders both `((link_to_file))` (PDF) and `((link_to_csv_file))` (CSV).
- Template IDs wired via `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` env var.
- Welsh template variant required.

---

## 9. `list-type-data.ts` Changes

Add `MAGISTRATES_STANDARD_LIST` with the next available numeric id, following the same shape as `MAGISTRATES_PUBLIC_LIST`:

```typescript
{
  id: <next-available>,
  name: "MAGISTRATES_STANDARD_LIST",
  englishFriendlyName: "Magistrates Standard List",
  welshFriendlyName: "Magistrates Standard List",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-standard-list",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [7]
}
```

A DB migration seeding this row is also required (the reference data is stored in the `list_type` table).

---

## 10. Error Handling

- **CSV generation failure at publication time:** Catch, log with artefact ID, return `createCsvErrorResult(error)`. Never throw. Publication continues.
- **Download route — invalid id:** 400 `{ "error": "Invalid request" }`.
- **Download route — artefact not found:** 404 `{ "error": "Artefact not found" }`.
- **Download route — file missing from disk:** 404 `{ "error": "File not found in storage" }`.
- **Download route — expired artefact:** 410 `{ "error": "File has expired" }`.
- **Download route — unauthorised:** 403.
- **Email — CSV upload failure:** Log error; send email with PDF link only (no CSV link in personalisation).
- **All null/undefined fields in JSON input:** Render as empty string `""` in CSV output; never write `"null"` or `"undefined"`.

---

## 11. Acceptance Criteria Mapping

| AC | How satisfied |
|----|--------------|
| CSV + PDF downloadable for both list types | CSV generator + download route; PDF generator registered in `PDF_GENERATOR_REGISTRY` |
| Both links in email notifications | New `csvFilePath` param threaded through notification service; new Notify template with `link_to_csv_file` |
| Uniform fields between CSV and PDF | Both generators consume the same normalised row types from the renderer |
| Public List columns (9) | `MagistratesPublicListRow` type + `PUBLIC_LIST_HEADERS` constant |
| Standard List — each offence on new line | Renderer expands to one row per offence |
| Standard List columns (26) | `MagistratesStandardListRow` type + `STANDARD_LIST_HEADERS` constant |

---

## 12. CLARIFICATIONS NEEDED

1. **PDF scope:** Is generating the PDF for `MAGISTRATES_PUBLIC_LIST` and `MAGISTRATES_STANDARD_LIST` in scope for this ticket, or does a separate ticket already deliver that? The estimate changes substantially — if PDF is in-scope, the magistrates list-type module (parser, Nunjucks template, PDF generator) must all be built here.

2. **Source JSON schema:** What are the exact field paths in the magistrates publication JSON for fields like `LJA`, `ASN`, `Application Particulars`, `Convicted on`, `Adjourned from`? These need a sample JSON payload or schema from the upstream data provider to map correctly.

3. **Email template strategy:** Who owns the GOV.UK Notify template changes (adding the CSV link)? These templates are managed in the Notify console outside this repo. Do we need to coordinate with a content designer?

4. **Welsh CSV headers:** Should the CSV use English headers only, or should headers follow the artefact's publication language (Welsh headers for Welsh-language publications)?

5. **`summary-of-publications` page:** Should the CSV download link also appear on the publication summary listing page, or only on the individual list view page?

6. **`MAGISTRATES_STANDARD_LIST` DB migration:** Confirm the next available `id` for the new list type entry so the migration doesn't conflict with other in-flight tickets.
