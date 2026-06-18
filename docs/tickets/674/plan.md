# Technical Plan: #674 — Excel downloads for Crown hearing lists

## Context

Three Crown list types exist in the DB but have no Excel or PDF generation support:

| DB id | Name | URL path |
|-------|------|----------|
| 5 | `CROWN_WARNED_LIST` | crown-warned-list |
| 6 | `CROWN_DAILY_LIST` | crown-daily-cause-list |
| 7 | `CROWN_FIRM_LIST` | crown-firm-list |

These lists arrive as JSON via blob ingestion (provenance `CRIME_IDAM`). Their JSON structure is currently undocumented — the field paths must be confirmed before any rendering code is written.

---

## Open question (spike required)

**What does the Crown JSON payload actually look like?**

Before writing any renderer or PDF template, inspect a real Crown JSON artefact stored in `storage/temp/uploads/`. The acceptance criteria list specific columns for each list type. Map those columns to the actual JSON field paths.

Expected shape based on the `CauseListData` pattern used by other lists:

```
document.publicationDate
courtLists[].courtHouse.courtHouseName       → "Court House"
courtLists[].courtHouse.courtRoom[].courtRoomName  → "Court Room"
session[].judiciary[].johKnownAs             → "Judge"
sittings[].sittingStart                      → "Sitting at" / "Hearing Time"
sittings[].hearing[].case[].caseNumber       → "Case Reference" / "Case Number"
sittings[].hearing[].case[].party[]          → "Defendant Name(s)"
sittings[].hearing[].hearingType             → "Hearing Type"
```

Fields specific to Crown lists that need confirming:
- `Prosecuting Authority` — likely a `party` with `partyRole: "PROSECUTING_AUTHORITY"` or a top-level field
- `Representative` (Firm List only)
- `Linked Cases` (Warned List only) — may be `linkedCases[]` or similar
- `Listing Notes` — possibly `listingNotes` or inside `case`
- `Fixed For` / `Warned For` date (Warned List) — may be a date field on each hearing or case
- `Date` column (Firm List) — whether it sits on sittings or a higher level

Resolve this before starting implementation.

---

## Implementation plan

### 1. Create `libs/list-types/crown-common/`

A shared module for all three Crown list types, following the pattern of `care-standards-tribunal-weekly-hearing-list`.

**Files to create:**

```
libs/list-types/crown-common/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── models/
    │   └── types.ts              # CrownDailyRow, CrownFirmRow, CrownWarnedRow
    ├── conversion/
    │   └── crown-excel-configs.ts  # Three ExcelConverterConfig + registerConverter calls
    ├── pdf/
    │   ├── crown-daily-pdf-generator.ts
    │   ├── crown-firm-pdf-generator.ts
    │   ├── crown-warned-pdf-generator.ts
    │   └── templates/
    │       ├── crown-daily-list.njk
    │       ├── crown-firm-list.njk
    │       └── crown-warned-list.njk
    ├── rendering/
    │   └── renderer.ts            # renderCrownDailyList, renderCrownFirmList, renderCrownWarnedList
    ├── email-summary/
    │   └── summary-builder.ts     # extractCaseSummary + formatCaseSummaryForEmail for each list
    └── locales/
        ├── en.ts
        └── cy.ts
```

**Excel field configs** (one `ExcelConverterConfig` per list type using `createConverter` and `registerConverter` from `@hmcts/list-types-common`):

Crown Daily List — columns: Court House, Court Room, Judge, Sitting at, Hearing Time, Case Reference, Defendant Name(s), Hearing Type, Prosecuting Authority, Listing Notes

Crown Firm List — columns: Date, Court House, Court Room, Judge, Sitting at, Hearing Time, Case Number, Defendant Name(s), Hearing Type, Representative, Prosecuting Authority, Listing Notes

Crown Warned List — columns: Hearing, Fixed For, Case Reference, Defendant Name(s), Prosecuting Authority, Linked Cases, Listing Notes

Register converters in `crown-excel-configs.ts`:
```typescript
registerConverter(5, crownWarnedConverter);
registerConverter(6, crownDailyConverter);
registerConverter(7, crownFirmConverter);
registerConverterByName("CROWN_WARNED_LIST", crownWarnedConverter);
registerConverterByName("CROWN_DAILY_LIST", crownDailyConverter);
registerConverterByName("CROWN_FIRM_LIST", crownFirmConverter);
```

**PDF generators** follow the same pattern as `generateCareStandardsTribunalWeeklyHearingListPdf`: render data via Nunjucks template, generate PDF with `@hmcts/pdf-generation`, save with `savePdfToStorage`.

**PDF templates** use `PDF_BASE_STYLES` from `@hmcts/list-types-common`. The table structure for each list must match the column set in the acceptance criteria.

### 2. Add `.xlsx` to the content-type map

File: `libs/publication/src/file-storage/content-type.ts`

Add:
```typescript
".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

This is needed so the download route serves Excel files with the correct MIME type.

### 3. Wire up PDF generators in `PDF_GENERATOR_REGISTRY`

File: `libs/publication/src/processing/service.ts`

Import the three PDF generators from `@hmcts/crown-common` and add entries:
```typescript
CROWN_DAILY_LIST: (p) => generateCrownDailyListPdf({ ...p, jsonData: p.jsonData as CrownJsonData }),
CROWN_FIRM_LIST: (p) => generateCrownFirmListPdf({ ...p, jsonData: p.jsonData as CrownJsonData }),
CROWN_WARNED_LIST: (p) => generateCrownWarnedListPdf({ ...p, jsonData: p.jsonData as CrownJsonData }),
```

The existing `generatePublicationPdf` function already wraps generator failures gracefully — PDF failure will not block publication.

### 4. Wire up email summary builders in `EMAIL_BUILDER_REGISTRY`

File: `libs/notifications/src/notification/notification-service.ts`

Import `extractCaseSummary` and `formatCaseSummaryForEmail` variants from `@hmcts/crown-common` and add:
```typescript
CROWN_DAILY_LIST: { extract: extractCrownDailySummary, format: formatCrownSummaryForEmail },
CROWN_FIRM_LIST: { extract: extractCrownFirmSummary, format: formatCrownSummaryForEmail },
CROWN_WARNED_LIST: { extract: extractCrownWarnedSummary, format: formatCrownSummaryForEmail },
```

### 5. Register `tsconfig.json` path alias

Root `tsconfig.json` — add:
```json
"@hmcts/crown-common": ["libs/list-types/crown-common/src"]
```

### 6. Register module in web app (if Crown list pages are added)

Crown list pages do not currently exist under `apps/web/src/pages/(list-types)/`. If the ticket scope includes viewer pages, create one per list type following the pattern in `(list-types)/civil-daily-cause-list/index.ts`. If viewer pages are out of scope for this ticket, skip this step — the flat-file download path already works for blob-stored Excel files once the content-type map is updated.

---

## Error-handling rules

- PDF generation failure must not block publication or notification dispatch. The `generatePublicationPdf` wrapper already swallows failures gracefully.
- Excel converter registration errors (wrong column names, missing rows) must surface as validation errors during upload, not at publication time.
- If `extractCaseSummary` throws for a Crown list, the email falls back to the standard template via the existing `catch` block in `buildEnhancedEmailData`.

---

## Testing requirements

Each new file needs a co-located `*.test.ts`:

- `crown-excel-configs.ts` — unit tests for each field config: required fields, optional fields, header validation, HTML-tag rejection
- `renderer.ts` — unit tests for data transformation: verify each column maps to the right JSON path
- `*-pdf-generator.ts` — unit tests verifying success/error paths (mock `savePdfToStorage` and `generatePdfFromHtml`)
- `summary-builder.ts` — unit tests for `extractCaseSummary` output shape
- `content-type.ts` — add `.xlsx` case to existing test file

---

## Files changed / created summary

| File | Action |
|------|--------|
| `libs/list-types/crown-common/` (whole module) | Create |
| `libs/publication/src/file-storage/content-type.ts` | Edit — add `.xlsx` entry |
| `libs/publication/src/processing/service.ts` | Edit — add 3 entries to `PDF_GENERATOR_REGISTRY` |
| `libs/notifications/src/notification/notification-service.ts` | Edit — add 3 entries to `EMAIL_BUILDER_REGISTRY` |
| `tsconfig.json` (root) | Edit — add `@hmcts/crown-common` path alias |
| `apps/web/src/pages/(list-types)/crown-*/` | Create (if viewer pages in scope) |
