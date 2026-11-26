# Plan: #675 — Excel Downloadable file — Magistrates Hearing Lists (Part 2)

## 1. Technical Approach

### Goal
Add ExcelJS **download** generators for the four Magistrates adult-court list types so that verified users get an Excel download option alongside the PDF that already exists, and so email notifications automatically surface both download links.

| List type | Lib dir |
|-----------|---------|
| `MAGISTRATES_ADULT_COURT_LIST_DAILY` | `libs/list-types/magistrates-adult-court-list/` |
| `MAGISTRATES_ADULT_COURT_LIST_FUTURE` | `libs/list-types/magistrates-adult-court-list/` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` | `libs/list-types/magistrates-public-adult-court-list/` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` | `libs/list-types/magistrates-public-adult-court-list/` |

The four types have provenance `CRIME_IDAM`, `isNonStrategic: false`, and are **already registered in `PDF_GENERATOR_REGISTRY`** — no PDF-generation change is required for the downloads to work. This ticket adds Excel generation only.

### CRITICAL — two unrelated "Excel" systems (do not confuse)
- **Excel→JSON on upload** (`createConverter` / `registerConverterByName` in `@hmcts/list-types-common` `conversion/excel-to-json.ts`) is for non-strategic manual uploads. **NOT this ticket.** The four target types are strategic (`CRIME_IDAM`, `isNonStrategic: false`) and are fed by the raw CRIME JSON feed.
- **Excel download generation** (this ticket) uses **ExcelJS directly** + `saveExcelToStorage(...)` from `@hmcts/list-types-common`, wired into `EXCEL_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`. Follow `magistrates-public-list` and `magistrates-standard-list` exactly.

### Registry-driven availability model
Excel availability is **not** a flag on `list-type-data.ts`. It is derived at runtime:
- `listTypeHasExcel(name)` (`service.ts` ~388) = `name in EXCEL_GENERATOR_REGISTRY`.
- `generatePublicationExcel` (~392) runs the registered generator, which writes the blob and returns `excelPath = ${artefactId}.xlsx` (~648/registry entry).
- Notifications discover the Excel purely by **blob existence** — `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts` ~465) always attempts `downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS)` (~474). Once the generator writes the blob, the email picks it up automatically.

So the entire feature is delivered by: **(a)** an ExcelJS generator per lib dir, **(b)** `excelColumns` in each lib's locale files, and **(c)** four `EXCEL_GENERATOR_REGISTRY` entries + two imports in `service.ts`.

### Architecture decisions
- One generator function per lib dir (each serves its DAILY + FUTURE pair). For `magistrates-public-adult-court-list` a single generator serves both; for `magistrates-adult-court-list` a single generator serves both — the column set is identical across DAILY and FUTURE per the ticket.
- Reuse the existing renderers as the single source of transformed data — do **not** re-parse the raw CRIME feed in the Excel generator:
  - `renderMagistratesAdultCourtList(jsonData, { locationId, contentDate, locale })` → `{ header, openJustice, listData: { sessions[] } }`
  - `renderMagistratesPublicAdultCourtListData(jsonData, { locationId, contentDate, locale })` → `{ header, listData: ProcessedSession[] }`
- Use `sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage` from `@hmcts/list-types-common` (identical to the reference generators).
- No API route, no page/template, no DB/schema change. Availability is registry + blob driven.

## 2. Implementation Details

### Template source (verbatim)
> n/a — no new rendered page; the four list types already have PDF generators wired. This ticket adds ExcelJS download generators + EXCEL_GENERATOR_REGISTRY registration only.

### No API / DB / schema changes
- No new Prisma schema, no migration.
- No change to `libs/list-types/common/src/list-type-data.ts` (all four entries already exist; there is no excel/pdf availability flag — availability is derived from registry presence + blob existence).
- No change to `PDF_GENERATOR_REGISTRY` (all four already registered, ~324–337).
- No strictly-required notification code change (Excel is auto-detected by blob existence) — but template selection must be **verified** (see AC mapping).

### New / edited files

#### A. `libs/list-types/magistrates-adult-court-list/`
- **NEW** `src/excel/excel-generator.ts` — `generateMagistratesAdultCourtListExcel(options)` following the `magistrates-public-list` shape:
  ```
  import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
  import ExcelJS from "exceljs";
  import { enDaily, enFuture } from "../locales/en.js";   // pick title variant by listTypeName
  import { cyDaily, cyFuture } from "../locales/cy.js";
  import { renderMagistratesAdultCourtList, type MagistratesAdultCourtListData } from "../rendering/renderer.js";
  ```
  - Options: `{ artefactId, listTypeName, locationId, contentDate, locale, jsonData }`.
  - Select locale object by `locale` (`cy`/`en`) and title variant by `listTypeName` (`_DAILY` vs `_FUTURE`) so the worksheet/title matches the PDF.
  - Header row from `t.excelColumns` (order = addRow column order, 1:1).
  - Loop `listData.sessions[] → session.cases[]`, one row per case (see offence-granularity decision below).
  - `saveExcelToStorage(artefactId, Buffer.from(buffer))` → `{ success: true, excelPath }`; `try/catch` returns `{ success: false, error }`.
- **NEW** `src/excel/excel-generator.test.ts` — Vitest, AAA, no `any`, mock `@hmcts/list-types-common` `saveExcelToStorage`/`autoFitColumns`/`sanitiseCellValue` and `@hmcts/location` `getLocationById`; assert header row order, one row per case, empty-session handling, and Welsh column labels.
- **EDIT** `src/locales/en.ts` and `src/locales/cy.ts` — add an `excelColumns` object to the shared `en`/`cy` base (inherited by `enDaily/enFuture` and `cyDaily/cyFuture` via spread). Column set is uniform for DAILY and FUTURE.
- **EDIT** `src/index.ts` — `export { generateMagistratesAdultCourtListExcel } from "./excel/excel-generator.js";`

#### B. `libs/list-types/magistrates-public-adult-court-list/`
- **NEW** `src/excel/excel-generator.ts` — `generateMagistratesPublicAdultCourtListExcel(options)`, same shape. Uses single `en`/`cy` locale (no Daily/Future variant), renderer `renderMagistratesPublicAdultCourtListData` returning `{ header, listData: ProcessedSession[] }`. Loop `listData[] (sessions) → session.cases[]`.
- **NEW** `src/excel/excel-generator.test.ts` — as above.
- **EDIT** `src/locales/en.ts` and `src/locales/cy.ts` — add `excelColumns`.
- **EDIT** `src/index.ts` — `export { generateMagistratesPublicAdultCourtListExcel } from "./excel/excel-generator.js";`

#### C. `libs/publication/src/processing/service.ts`
- **EDIT** imports (~27–28) to also pull the two new Excel generators:
  ```
  import { generateMagistratesAdultCourtListExcel, generateMagistratesAdultCourtListPdf, type MagistratesAdultCourtListData } from "@hmcts/magistrates-adult-court-list";
  import { generateMagistratesPublicAdultCourtListExcel, generateMagistratesPublicAdultCourtListPdf, type MagistratesPublicAdultCourtListData } from "@hmcts/magistrates-public-adult-court-list";
  ```
- **EDIT** `EXCEL_GENERATOR_REGISTRY` (~363) — add four entries (pass `listTypeName` through so the generator can pick the DAILY/FUTURE title):
  ```
  MAGISTRATES_ADULT_COURT_LIST_DAILY:  (p) => generateMagistratesAdultCourtListExcel({ ...p, jsonData: p.jsonData as MagistratesAdultCourtListData }),
  MAGISTRATES_ADULT_COURT_LIST_FUTURE: (p) => generateMagistratesAdultCourtListExcel({ ...p, jsonData: p.jsonData as MagistratesAdultCourtListData }),
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY:  (p) => generateMagistratesPublicAdultCourtListExcel({ ...p, jsonData: p.jsonData as MagistratesPublicAdultCourtListData }),
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE: (p) => generateMagistratesPublicAdultCourtListExcel({ ...p, jsonData: p.jsonData as MagistratesPublicAdultCourtListData })
  ```
  `GenerateExcelParams` already includes `listTypeName`, so no signature change is needed.

### Column → field mapping

#### `MAGISTRATES_ADULT_COURT_LIST_DAILY` and `_FUTURE` (identical)
Source: `renderMagistratesAdultCourtList` → `SessionOutput` + `CaseOutput`.

| Ticket column | Source field | Notes |
|---------------|-------------|-------|
| Court House | `session.court` | courthouse name from the session node |
| Court Room | `session.room` | numeric room; stringify |
| LJA | `session.lja` | Local Justice Area |
| Session Start | `session.sessionStart` | already formatted (`formatStartTime`) |
| Block Start | `case.blockStart` | already formatted |
| Defendant Name | `case.defendantName` | |
| Date of Birth | `case.dateOfBirth` | optional, may be `""` |
| Address | `case.address` | joined address lines |
| Age | `case.age` | optional, may be `""` |
| Informant | `case.informant` | optional |
| Case Number | `case.caseNumber` | |
| Offence Code | `case.offenceCode` | currently comma-joined across offences in renderer — see decision |

#### `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `_FUTURE` (identical)
Source: `renderMagistratesPublicAdultCourtListData` → `ProcessedSession` + `ProcessedCase`.

| Ticket column | Source field | Notes |
|---------------|-------------|-------|
| Court House | `session.courtName` | courthouse (`session.court`) |
| Sitting at | **NO SOURCE** | not present in renderer/schema — see Clarifications |
| Court Room | `session.courtRoom` | |
| LJA | `session.lja` | |
| Session Start | `session.sessionStartTime` | formatted |
| Listing Time | `case.blockStartTime` | formatted block/sitting start |
| Defendant Name | `case.defendantName` | |
| Case Number | `case.caseNumber` | |

### Offence-row-granularity decision (ADULT_COURT)
**Decision:** keep one row per case with `Offence Code` comma-joined, matching the existing `renderMagistratesAdultCourtList` output (`offenceCode` is already a `", "`-joined string). The ticket lists a single `Offence Code` column (not per-offence detail), so the standard-list "one row per offence" pattern is unnecessary here and would desync Excel rows from the PDF/rendered page which group by case. If the PDF later moves to offence-per-row, revisit for uniformity (flagged in Clarifications).

## 3. Error Handling & Edge Cases
- **Empty sessions / empty cases** — nested loops naturally produce a header-only worksheet; no rows. Test this explicitly.
- **Missing optional fields** — `dateOfBirth`, `age`, `informant`, `address` may be `""` from the renderer; pass through `sanitiseCellValue`. Never emit `undefined`.
- **`sanitiseCellValue`** — wrap every cell value (defends against CSV/formula injection e.g. leading `=`, `+`, `-`, `@`) exactly as the reference generators do.
- **Offence with no code** — renderer already filters falsy codes before join, so `offenceCode` may be `""`. Row still renders.
- **`offences.length === 0`** — with the comma-join decision there is no empty-offence row; the single case row simply has an empty `Offence Code`. (Only relevant if we later adopt offence-per-row.)
- **Numeric room** — `session.room`/`courtRoom` is numeric; stringify via `sanitiseCellValue` (handles number → string).
- **`>2MB` email fallback** — `buildEmailDataWithFiles` performs a per-file `<2MB` check and `getSubscriptionTemplateId` falls back to `_NO_LINKS` when files exceed 2MB. No new handling needed — verify the large-file path still selects the correct template.
- **Welsh (`cy`) locale** — select `cy*` locale object; column labels come from `excelColumns` in `cy.ts`. Renderer already returns Welsh location name and Welsh offence titles/summaries where present. Ensure `excelColumns` keys in `cy.ts` match `en.ts` exactly.
- **Generator failure** — `try/catch` returns `{ success: false, error }`; `generatePublicationExcel` logs and returns `{}` / error without throwing, so PDF/notification flow is unaffected.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|----|---------------|--------------|
| Excel **and** PDF available for the four list types | PDF already registered (`PDF_GENERATOR_REGISTRY` ~324–337); add 4 Excel entries to `EXCEL_GENERATOR_REGISTRY`. `listTypeHasExcel` returns true → blob written. | Unit test on generators; manual publish per type → confirm `${artefactId}.xlsx` blob written; `listTypeHasExcel(name) === true`. |
| Download links for **both** file types in email notifications | Excel auto-detected by blob existence in `buildEmailDataWithFiles` (~474); `getSubscriptionTemplateId({ hasPdf, hasExcel, ... })` selects a PDF+Excel template; `govnotify-client.ts` (~68–89) sets `pdf_link_to_file` + `excel_link_to_file`. | Verify template selection resolves to `_SUBSCRIPTION_PDF_EXCEL` (non-SJP, both present, under 2MB) rather than `_NON_SJP_PDF`; confirm both personalisation links populated. See Clarifications item 3. |
| Data fields uniform across Excel **and** PDF for all four | `excelColumns` mirror the PDF template columns per list type. | Cross-check `excelColumns` against each `pdf-template.njk`; flag any divergence (Clarifications). |
| `MAGISTRATES_ADULT_COURT_LIST_DAILY` columns | Mapping table above (all fields present in `CaseOutput`/`SessionOutput`). | Header-row assertion in test. |
| `MAGISTRATES_ADULT_COURT_LIST_FUTURE` columns | Same generator/columns as DAILY. | Header-row assertion; title variant differs only. |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` columns | Mapping table above — **all except "Sitting at"** map cleanly. | Header-row assertion; "Sitting at" pending clarification. |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` columns | Same generator/columns as DAILY. | As above. |

## 5. CLARIFICATIONS NEEDED

1. **"Sitting at" source for PUBLIC_ADULT (blocker for that column).** The current `magistrates-public-adult-court-list` renderer and JSON schema surface no field for "Sitting at". Options: (a) it maps to the courthouse/venue and "Court House" is actually the parent location name (`header.locationName`) — mirroring `magistrates-public-list` where `courtHouse = header.locationName` and `sittingAt` = a sitting time; (b) it is a genuinely new field requiring a **renderer + schema extension** to the raw CRIME feed. Need product confirmation of the exact source field before implementing this column. Until resolved, either omit "Sitting at" or emit an empty column (flagged).

2. **Offence granularity for ADULT_COURT.** Plan assumes one row per case with comma-joined `Offence Code` (matches current renderer). Confirm this is acceptable versus one row per offence (as `magistrates-standard-list` does). Impacts row count and uniformity with the PDF.

3. **PDF column uniformity.** The ticket requires uniform columns across Excel and PDF. Need to confirm the existing `pdf-template.njk` for each of the two lib dirs already renders exactly the ticket's column set. If the PDFs currently show a different/extra set (e.g. Offence Title / Offence Summary on the adult-court PDF), the **PDF templates may also need column changes** to stay uniform — potentially widening this ticket's scope beyond Excel-only.
