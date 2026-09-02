# #484: Generate SJP Excel file when list is uploaded

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-04-14T10:57:58Z
**Updated:** 2026-05-20T08:40:50Z

## Description

## User Story

As a verified user, I want an Excel file to be generated automatically when an SJP list is uploaded, so that I can download the case data in spreadsheet format.

## Background

When a publication is ingested via `POST /v1/publication`, the `processPublication` function in `libs/publication` is called asynchronously (fire-and-forget). Currently it only triggers PDF generation and notifications. Excel generation needs to be added to this pipeline for SJP list types.

A placeholder `libs/excel-generation` library already exists in the monorepo with empty `src/excel/` and `src/file-storage/` directories. This is where the implementation lives.

Four SJP list types require Excel generation:
- `SJP_PUBLIC_LIST`
- `SJP_DELTA_PUBLIC_LIST`
- `SJP_PRESS_LIST`
- `SJP_DELTA_PRESS_LIST`

---

## Excel Output Specification

### SJP Public List (`SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST`)

Fixed 4 columns, one row per defendant:

| Column | Description |
|--------|-------------|
| Name | Defendant name |
| Postcode | Defendant postcode |
| Offence | Offence title |
| Prosecutor | Prosecuting organisation |

JSON source path:
```
courtLists[] → courtHouse → courtRoom[] → session[] → sittings[] → hearing[]
```

### SJP Press List (`SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST`)

Dynamic columns — offence columns repeat based on the maximum number of offences across all defendants. One row per defendant:

| Column | Description |
|--------|-------------|
| Address | Defendant address |
| Case URN | Case URN(s) |
| Date of Birth | DOB formatted as `dd/MM/yyyy` with age in brackets e.g. `01/01/1990 (34)` |
| Defendant Name | Accused name |
| Offence 1 Press Restriction Requested | `Active` or `None` |
| Offence 1 Title | Offence title |
| Offence 1 Wording | Offence wording |
| Offence N … | Repeated for each offence up to the maximum across all defendants |
| Prosecutor Name | Prosecuting organisation |

---

## Acceptance Criteria

### `libs/excel-generation` library

- [ ] `src/excel/sjp-public-list-excel-generator.ts` — generates Excel from SJP public list JSON with 4 columns: Name, Postcode, Offence, Prosecutor
- [ ] `src/excel/sjp-press-list-excel-generator.ts` — generates Excel from SJP press list JSON with dynamic offence columns as defined above
- [ ] `src/file-storage/excel-file-storage.ts` — saves the generated `.xlsx` buffer to `storage/temp/uploads/{artefactId}.xlsx`
- [ ] `src/index.ts` exports `generateSjpPublicListExcel`, `generateSjpPressListExcel`, `saveExcelFile`
- [ ] Header row is bold, columns are auto-sized
- [ ] Delta variants (`SJP_DELTA_PUBLIC_LIST`, `SJP_DELTA_PRESS_LIST`) use the same generator as their non-delta counterparts

### `libs/publication` processing pipeline

- [ ] `libs/publication/src/processing/service.ts` — `processPublication` calls `generateSjpPublicListExcel` or `generateSjpPressListExcel` (from `@hmcts/excel-generation`) based on `listTypeId`, then calls `saveExcelFile`
- [ ] Excel generation only runs when the list type is one of the four SJP types
- [ ] Excel generation runs after the JSON is saved and before notifications are sent
- [ ] If Excel generation fails, the error is logged but does not block notifications or fail the ingestion

### File storage
- [ ] Excel file saved as `{artefactId}.xlsx` in `storage/temp/uploads/`
- [ ] File is retrievable via the existing file download mechanism

### Registration
- [ ] `libs/excel-generation` added as a dependency in `libs/publication/package.json`
- [ ] Path alias `@hmcts/excel-generation` added to root `tsconfig.json`

### Tests
- [ ] Unit tests for `sjp-public-list-excel-generator.ts` — verify correct columns and row data
- [ ] Unit tests for `sjp-press-list-excel-generator.ts` — verify dynamic offence columns, DOB formatting, press restriction values
- [ ] Unit tests for `excel-file-storage.ts`
- [ ] `processPublication` unit tests updated to cover SJP Excel generation
- [ ] `yarn test` passes across the workspace

### Welsh language
- [ ] Excel generation uses English column headers regardless of locale (spreadsheets are English-only)

---

## Technical Notes

- Excel library: `exceljs` (already used elsewhere in the monorepo for Excel-to-JSON conversion)
- File naming: `{artefactId}.xlsx` in `storage/temp/uploads/` — same pattern as `{artefactId}.json` and `{artefactId}.pdf`
- The `processPublication` call in `libs/api/src/blob-ingestion/repository/service.ts` is fire-and-forget — Excel generation must not block the HTTP response
- The existing `PDF_GENERATOR_REGISTRY` pattern in `libs/publication/src/processing/service.ts` can serve as a model for an `EXCEL_GENERATOR_REGISTRY`
- `SJP_DELTA_*` list types represent incremental updates — they have the same JSON structure as their non-delta counterparts
- The SJP press list CSV download at `GET /sjp-press-list-download` serves a similar purpose but is generated on-demand per request; the Excel is pre-generated at upload time

## Comments

No comments on this issue.
