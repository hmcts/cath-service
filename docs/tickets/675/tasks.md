# Tasks: #675 — Excel Downloadable file — Magistrates Hearing Lists (Part 2)

## Implementation Tasks

- [x] Resolve CLARIFICATIONS — decided against legacy `hmcts/pip-data-management` + user:
  - ADULT_COURT → **14 columns** (adds Offence Title + Offence Summary; uniform with existing PDF), one row per case, offences comma-joined.
  - PUBLIC_ADULT → **7 columns**, single "Sitting at" column = `Courtroom N` (no separate Court Room column; feed has one room value).
  - PDF already renders these fields — no `.njk` change needed.
- [x] Add `excelColumns` object to `libs/list-types/magistrates-adult-court-list/src/locales/en.ts` (uniform for Daily/Future)
- [x] Add matching `excelColumns` object to `libs/list-types/magistrates-adult-court-list/src/locales/cy.ts` (Welsh; identical keys — verified parity)
- [x] Create `libs/list-types/magistrates-adult-court-list/src/excel/excel-generator.ts` (`generateMagistratesAdultCourtListExcel`, ExcelJS + `saveExcelToStorage`, DAILY/FUTURE title by `listTypeName`, one row per case with comma-joined Offence Code/Title/Summary)
- [x] Export `generateMagistratesAdultCourtListExcel` from `libs/list-types/magistrates-adult-court-list/src/index.ts`
- [x] Create `libs/list-types/magistrates-adult-court-list/src/excel/excel-generator.test.ts` (AAA, no `any`; header order, one row per case, empty sessions, Welsh labels, failure path)
- [x] Add `excelColumns` object to `libs/list-types/magistrates-public-adult-court-list/src/locales/en.ts`
- [x] Add matching `excelColumns` object to `libs/list-types/magistrates-public-adult-court-list/src/locales/cy.ts` (Welsh; identical keys — verified parity)
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/excel/excel-generator.ts` (`generateMagistratesPublicAdultCourtListExcel`, ExcelJS + `saveExcelToStorage`, single Sitting-at column)
- [x] Export `generateMagistratesPublicAdultCourtListExcel` from `libs/list-types/magistrates-public-adult-court-list/src/index.ts`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/excel/excel-generator.test.ts` (AAA, no `any`; header order, empty sessions, Welsh labels, failure path)
- [x] Update imports in `libs/publication/src/processing/service.ts` to include both new Excel generators
- [x] Add four entries to `EXCEL_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (both ADULT_COURT + both PUBLIC_ADULT, passing `listTypeName` through)
- [x] Lint (biome), typecheck (tsc) all three packages, and run tests — 118 list-type + 98 publication tests pass; excelColumns key parity verified (14 / 7)
- [ ] Manual/E2E check: publish each of the four list types and confirm `${artefactId}.xlsx` blob is written with correct columns (EN and CY), and the subscription email shows both PDF + Excel download links

## Notes

- No changes to PDF templates, `list-type-data.ts`, DB, or notification code — Excel availability is registry-derived and the email path auto-detects the `.xlsx` blob.
- Worksheet names capped at 31 chars (ExcelJS limit) since the Daily/Future titles exceed it.
