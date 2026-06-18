# Tasks: #674 — Excel downloads for Crown hearing lists

## Spike (do first)

- [ ] Inspect a real Crown JSON artefact in `storage/temp/uploads/` and map each acceptance-criteria column to its actual JSON field path for all three list types (Daily, Firm, Warned)
- [ ] Confirm field paths for: Prosecuting Authority, Representative (Firm), Linked Cases (Warned), Listing Notes, Fixed For / Warned For date (Warned), Date column (Firm)

## Module setup

- [ ] Create `libs/list-types/crown-common/package.json` and `tsconfig.json` following the care-standards-tribunal pattern
- [ ] Add `@hmcts/crown-common` path alias to root `tsconfig.json`
- [ ] Create `libs/list-types/crown-common/src/config.ts` (moduleRoot export)
- [ ] Create `libs/list-types/crown-common/src/index.ts` (business logic exports)

## Types

- [ ] Create `libs/list-types/crown-common/src/models/types.ts` with `CrownDailyRow`, `CrownFirmRow`, `CrownWarnedRow` interfaces matching confirmed JSON field paths

## Excel field configs

- [ ] Create `libs/list-types/crown-common/src/conversion/crown-excel-configs.ts` with three `ExcelConverterConfig` definitions
- [ ] Register all three converters by both DB id (5, 6, 7) and by name using `registerConverter` / `registerConverterByName`
- [ ] Write unit tests for each config: required fields, optional fields, header validation, HTML-tag rejection

## Rendering

- [ ] Create `libs/list-types/crown-common/src/rendering/renderer.ts` with `renderCrownDailyList`, `renderCrownFirmList`, `renderCrownWarnedList` functions
- [ ] Write unit tests for renderer: verify each output column maps correctly from JSON input

## PDF generation

- [ ] Create `libs/list-types/crown-common/src/pdf/templates/crown-daily-list.njk` (table columns per acceptance criteria)
- [ ] Create `libs/list-types/crown-common/src/pdf/templates/crown-firm-list.njk`
- [ ] Create `libs/list-types/crown-common/src/pdf/templates/crown-warned-list.njk`
- [ ] Create `libs/list-types/crown-common/src/pdf/crown-daily-pdf-generator.ts` using `savePdfToStorage` + `generatePdfFromHtml`
- [ ] Create `libs/list-types/crown-common/src/pdf/crown-firm-pdf-generator.ts`
- [ ] Create `libs/list-types/crown-common/src/pdf/crown-warned-pdf-generator.ts`
- [ ] Write unit tests for each PDF generator (mock `savePdfToStorage` and `generatePdfFromHtml`, verify success and error paths)

## Email summaries

- [ ] Create `libs/list-types/crown-common/src/email-summary/summary-builder.ts` with `extractCaseSummary` and `formatCaseSummaryForEmail` for each list type
- [ ] Write unit tests for summary builders

## Locales

- [ ] Create `libs/list-types/crown-common/src/locales/en.ts` with list title strings
- [ ] Create `libs/list-types/crown-common/src/locales/cy.ts` (Welsh translations)

## Content-type fix

- [ ] Add `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` to `libs/publication/src/file-storage/content-type.ts`
- [ ] Add `.xlsx` test case to `libs/publication/src/file-storage/content-type.test.ts`

## Wire up PDF generators

- [ ] Import Crown PDF generators into `libs/publication/src/processing/service.ts`
- [ ] Add `CROWN_DAILY_LIST`, `CROWN_FIRM_LIST`, `CROWN_WARNED_LIST` entries to `PDF_GENERATOR_REGISTRY`

## Wire up email summary builders

- [ ] Import Crown summary functions into `libs/notifications/src/notification/notification-service.ts`
- [ ] Add `CROWN_DAILY_LIST`, `CROWN_FIRM_LIST`, `CROWN_WARNED_LIST` entries to `EMAIL_BUILDER_REGISTRY`

## Viewer pages (if in scope)

- [ ] Create `apps/web/src/pages/(list-types)/crown-daily-cause-list/index.ts` and template
- [ ] Create `apps/web/src/pages/(list-types)/crown-firm-list/index.ts` and template
- [ ] Create `apps/web/src/pages/(list-types)/crown-warned-list/index.ts` and template
- [ ] Write unit tests for each viewer page controller

## Verification

- [ ] Run `yarn test` from repo root — all tests pass
- [ ] Run `yarn lint:fix` — no lint errors
- [ ] Upload a Crown Daily List JSON via admin manual-upload and verify PDF is generated and downloadable
- [ ] Upload a Crown Firm List JSON and verify PDF
- [ ] Upload a Crown Warned List JSON and verify PDF
- [ ] Verify notification email for a Crown list contains the case summary section
- [ ] Verify `.xlsx` file upload downloads with correct content-type header
