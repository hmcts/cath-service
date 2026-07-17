# #673: Excel - Magistrate public and standard hearing lists

**State:** Open
**Assignees:** OgechiOkelu
**Author:** OgechiOkelu
**Labels:** enhancement, status:new
**Created:** 2025-06-04
**Updated:** 2025-07-13

## Description

### Problem Statement

This ticket is raised to create the excel downloadable version of the Magistrate public and standard hearing lists.

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from

### Acceptance Criteria

- Excel and PDF downloadable files are made available as downloadable options for the `MAGISTRATES_STANDARD_LIST` and `MAGISTRATES_PUBLIC_LIST`
- Links to download both file types are displayed in the email notifications
- The data fields / columns should be uniform on both the excel and PDF downloadable files for the `MAGISTRATES_STANDARD_LIST` and `MAGISTRATES_PUBLIC_LIST`
- For Magistrates Public List, the following fields are displayed as separate columns: Court House, Court Room, Sitting at, URN, Name, Hearing Type, Prosecuting Authority, Offence Details and Reporting Restrictions
- For Magistrates Standard List, each offence is displayed on a new line with the rest of the fields
- For Magistrates Standard List, the CSV fields are displayed as separate columns: Court House, LJA, Court Room, Sitting at, Name, Application Particulars, DOB, Age, Address, Prosecuting Authority Name, Attendance Method, Reference, Application Type, ASN, Hearing Type, Panel, Reporting Restrictions, Offence Code, Offence Title, Offence Details, Legislation, Max Penalty, Plea, Date of Plea, Convicted on and Adjourned from.

## Comments

### Technical Specification (from hmctsclaudecode bot)

#### 1. User Story

As a CaTH verified user (court reporter / press / professional user)
I want to download the Magistrates Public List and Magistrates Standard List as a CSV/Excel file (in addition to PDF)
So that I have more file format options to work with the hearing data offline (e.g. filtering, sorting and analysis in spreadsheet software)

#### 2. Background

CaTH currently distributes most strategic hearing lists as PDFs generated from publication JSON, with downloads served via the flat-file download endpoint and links surfaced in GOV.UK Notify subscription emails. This ticket adds a tabular CSV/Excel download alongside the existing PDF for two crime list types.

Relevant existing implementation:
- **List type definitions**: `libs/location/src/list-type-data.ts` — `MAGISTRATES_PUBLIC_LIST` already defined (id 4, provenance CRIME_IDAM, urlPath `magistrates-public-list`, sensitivity Public). `MAGISTRATES_STANDARD_LIST` is not yet defined and must be added.
- **PDF generation registry**: `libs/publication/src/processing/service.ts` — `PDF_GENERATOR_REGISTRY` maps a list-type name to a generator function. Neither magistrates list has an entry yet.
- **File storage & content types**: `libs/publication/src/file-storage/content-type.ts` already maps `.pdf` and `.csv`; ExcelJS extensions (`.xlsx`) would need adding.
- **Download endpoint**: `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` serves a stored file by artefactId.
- **Artefact page**: `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts` renders a PDF preview or redirects to download for non-PDF files.
- **Notifications**: `libs/notifications/src/govnotify/template-config.ts` + `govnotify-client.ts` — link_to_file is attached via `prepareUpload()`.
- **Existing tabular libraries**: ExcelJS (4.4.0, used in `libs/list-types/common/src/conversion/excel-to-json.ts`) and PapaParse (used in `libs/system-admin-pages/src/reference-data-upload`).

#### 3. Acceptance Criteria (detailed)

- **Magistrates Public List**: Published artefact → both PDF and CSV/Excel options offered; CSV/Excel columns: Court House, Court Room, Sitting at, URN, Name, Hearing Type, Prosecuting Authority, Offence Details, Reporting Restrictions
- **Magistrates Standard List**: CSV/Excel contains all columns (see §6.3); each offence on its own row with defendant-level fields repeated
- **Uniform fields**: Data fields/columns are uniform across PDF and CSV/Excel for the same list type
- **Email links**: Subscription email contains links to both PDF and CSV/Excel file
- **Welsh language**: Download link text and surrounding content in Welsh

#### 4. User Journey

```
[Subscription email]
   │  (links: "Download as PDF" / "Download as spreadsheet")
   ▼
[Hearing list artefact page]
  /hearing-lists/{locationId}/{artefactId}
   │
   ├──► "Download as PDF"          ──► GET /api/flat-file/{artefactId}/download?format=pdf
   └──► "Download as spreadsheet"  ──► GET /api/flat-file/{artefactId}/download?format=csv

[Publication processing pipeline] (background, on publish)
   parse JSON ──► generate PDF (existing) ──► generate CSV/Excel (NEW) ──► store both
                                                                        └─► notifications include links
```

#### 5. Files/Components to Change

| Area | Change |
|------|--------|
| `libs/location/src/list-type-data.ts` | Add `MAGISTRATES_STANDARD_LIST` entry |
| `libs/list-types/magistrates-public-list/` (new lib) | JSON schema, EN/CY locales, renderer, config.ts |
| `libs/list-types/magistrates-standard-list/` (new lib) | As above, with offence-per-row expansion logic |
| `libs/list-types/common/src/export/` (new) | Shared `csv-generator.ts` (PapaParse) and/or `excel-generator.ts` (ExcelJS) |
| `libs/publication/src/processing/service.ts` | Add `SPREADSHEET_GENERATOR_REGISTRY` or extend processing to generate/store CSV/Excel |
| `libs/publication/src/file-storage/content-type.ts` | Ensure `.csv` and `.xlsx` content types mapped |
| `libs/public-pages/src/flat-file/flat-file-service.ts` + download route | Support `format` query param |
| `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/` | Render both download links when CSV exists |
| `libs/notifications/src/govnotify/` | Include CSV/Excel download link in personalisation |

#### 6. Column Specifications

**6.2 Magistrates Public List** (one row per case):
Court House, Court Room, Sitting at, URN, Name, Hearing Type, Prosecuting Authority, Offence Details, Reporting Restrictions

**6.3 Magistrates Standard List** (one row per offence):
Court House, LJA, Court Room, Sitting at, Name, Application Particulars, DOB, Age, Address, Prosecuting Authority Name, Attendance Method, Reference, Application Type, ASN, Hearing Type, Panel, Reporting Restrictions, Offence Code, Offence Title, Offence Details, Legislation, Max Penalty, Plea, Date of Plea, Convicted on, Adjourned from

- Each offence on a defendant produces a new row; defendant-level fields repeated on each offence row
- Same column set/order drives the PDF table (uniformity requirement)

#### 7. Content (EN/CY)

- Download section heading: "Download this list"
- PDF link: "Download as a PDF"
- CSV link: "Download as a spreadsheet (CSV)"
- File size hint: "{size}" in parentheses (e.g. "(38 KB)")

Welsh translations required for all above. Column headers also need EN/CY in locale files.

#### 8. URLs

- `GET /api/flat-file/{artefactId}/download?format=csv` — CSV/Excel
- `GET /api/flat-file/{artefactId}/download?format=pdf` — PDF (default, current)
- New list type url path: `magistrates-standard-list`

#### 9. Validation

- `artefactId`: must match existing UUID regex; reject with 400 otherwise
- `format`: allow-list `{ pdf, csv }` — unknown value → default to pdf or 400
- Path traversal: never build file path from raw format value — map format → fixed extension server-side
- CSV injection: prefix cells beginning with `=`, `+`, `-`, `@`
- Publication JSON: validate against new schemas before generating outputs

#### 10. Error Handling

- Not found / location mismatch → 404, "errorNotFound"
- Expired → 410, "errorExpired"
- Missing generated file → 404, "errorFileNotFound" (graceful: CSV link hidden if not generated)
- Invalid request → 400, "errorInvalidRequest"
- Older artefact without spreadsheet → show PDF-only without errors

#### 11. Accessibility

- Download links: descriptive text including format and file size
- Real `<a>` elements, keyboard focusable
- Download section introduced by h2 heading
- Spreadsheet: single header row, no merged cells, consistent column order
- Welsh content fully provided; WCAG 2.2 AA

#### 12. Open Questions / Assumptions

1. **CSV vs Excel format**: Primary deliverable — confirm `.csv` (PapaParse) or `.xlsx` (ExcelJS), or both?
2. **MAGISTRATES_STANDARD_LIST**: Not yet in list-type-data.ts — this ticket adds it; confirm scope split with any paired PDF ticket
3. **Exact JSON field paths**: Precise publication JSON paths for Standard List fields (LJA, ASN, Panel, etc.) need confirming against a real payload/schema
4. **Standard List row layout**: Repeated cells on each offence row vs blank after first — duplication preferred for filtering
5. **Notify templates**: Confirm whether existing templates can carry two `link_to_file` values, or new templates needed
6. **File size / attachment limits**: PDFs >2 MB are link-only; confirm same threshold for spreadsheets
7. **Retention**: Spreadsheet files follow same `/storage/temp/uploads` retention as PDFs — assumed
8. **Standard List sensitivity**: Must be confirmed with data owner (Public List is Public)
