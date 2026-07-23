# Implementation Tasks

## Setup `libs/excel-generation` module
- [x] Delete existing `dist/` directory (stale compiled output with wrong implementation)
- [x] Create `package.json` with `exceljs` dependency and `@hmcts/list-types-common` dependency
- [x] Create `tsconfig.json` extending root config
- [x] Create `src/config.ts` (empty module config — no routes/pages)
- [x] Register `@hmcts/excel-generation` path alias in root `tsconfig.json`

## Implement Excel generators
- [x] Create `src/excel/excel-styles.ts` — shared header/data cell styles (bold headers, auto-size)
- [x] Create `src/excel/sjp-public-list-excel-generator.ts` — 4 fixed columns (Name, Postcode, Offence, Prosecutor)
- [x] Create `src/excel/sjp-press-list-excel-generator.ts` — dynamic offence columns with DOB formatting and press restriction mapping
- [x] Create `src/file-storage/file-storage-service.ts` — `saveExcelFile` writes buffer to `storage/temp/uploads/{artefactId}.xlsx`
- [x] Create `src/index.ts` — exports `generateSjpPublicListExcel`, `generateSjpPressListExcel`, `saveExcelFile`

## Integrate into publication processing pipeline
- [x] Add `@hmcts/excel-generation` as dependency in `libs/publication/package.json`
- [x] Add `EXCEL_GENERATOR_REGISTRY` to `libs/publication/src/processing/service.ts` mapping SJP list type names to generators
- [x] Add `generatePublicationExcel` function (mirrors `generatePublicationPdf` pattern)
- [x] Call `generatePublicationExcel` in `processPublication` after PDF generation, before notifications
- [x] Wrap in try/catch so failures don't block notifications

## Unit tests
- [x] Create `src/excel/sjp-public-list-excel-generator.test.ts` — verify 4 columns, correct row data extraction
- [x] Create `src/excel/sjp-press-list-excel-generator.test.ts` — verify dynamic columns, DOB formatting (`dd/MM/yyyy (age)`), press restriction values (`Active`/`None`)
- [x] Create `src/file-storage/file-storage-service.test.ts` — verify file write path and buffer
- [x] Update `libs/publication/src/processing/service.test.ts` — test SJP Excel generation is triggered, test error isolation

## Validation
- [x] Run `yarn test` — all tests pass
- [x] Run `yarn lint:fix` — no linting errors
