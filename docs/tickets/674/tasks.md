# Implementation Tasks

Scope: **email attachment only** — three Excel generators + registry wiring. No on-page download journey.

Reference implementation: **PR #970** (issue #675, Excel for Magistrates adult-court lists) — same file shape, same registry pattern. Mirror it.

**Dependency:** hard dependency on **#957**. `crown-advanced-pdda-list` / `CROWN_ADVANCED_PDDA_LIST` exist only on `feature-674` (via the #957 rename commits), not on `master`. Do not rebase onto a `master` without #957; #674 cannot merge before #957 (or must carry those commits). `crown-daily-list` and `crown-firm-list` are unaffected. Shared Excel helpers are already on `master` — no dependency on #970.

## Excel generators (libs)
- [x] Add `excelColumns` block to `crown-daily-list` `locales/en.ts` and `cy.ts` (Welsh placeholder-tagged, keep en/cy key parity)
- [x] Add `excelColumns` block to `crown-firm-list` `locales/en.ts` and `cy.ts`
- [x] Add `excelColumns` block to `crown-advanced-pdda-list` `locales/en.ts` and `cy.ts`
- [x] Create `crown-daily-list/src/excel/excel-generator.ts` (`generateCrownDailyListExcel`) using renderer + `sanitiseCellValue`/`autoFitColumns`/`saveExcelToStorage`. `Sitting at` → `sitting.time`, `Hearing Time` → `case.timeMarkingNote` (distinct columns)
- [x] Create `crown-firm-list/src/excel/excel-generator.ts` (`generateCrownFirmListExcel`), including `Date` and `Representative` columns; same two-time-column split as Daily
- [x] Create `crown-advanced-pdda-list/src/excel/excel-generator.ts` (`generateCrownAdvanceListExcel`), incl. `Linked Cases`; custody = `*` prefix on defendant cell when `row.isInCustody` + `preStatementSuffix4` legend row beneath the data (no "In custody" column)
- [x] Export each generator from its lib's `index.ts`

## Registry wiring (publication)
- [x] Import the three generators in `libs/publication/src/processing/service.ts`
- [x] Add `CROWN_DAILY_LIST`, `CROWN_FIRM_LIST`, `CROWN_ADVANCED_PDDA_LIST` entries to `EXCEL_GENERATOR_REGISTRY` (reuse existing `CrownDailyListData`/`CrownFirmListData`/`CrownAdvanceListData` type imports)

## Tests
- [x] Unit test each Excel generator (worksheet name, header row bold + English labels, Welsh labels via `cy` locale, per-row values, `sanitiseCellValue` applied, empty-list header-only output, `{ success: false }` on renderer/upload failure)
- [x] Registry/pipeline test: `generatePublicationExcel` dispatches each Crown name to its generator; `processPublication` still completes (PDF path intact) when a Crown generator fails

## Verification
- [x] `yarn lint:fix` and `yarn format`
- [x] `yarn test` (workspace)
- [ ] Manual: publish each Crown list type, confirm the `.xlsx` is generated and both PDF + Excel links appear in the subscription email
- [ ] Resolve CLARIFICATIONS in plan.md with product (custody column, Firm List layout, time columns, env config) before finalising
