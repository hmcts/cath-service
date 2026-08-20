# Implementation Tasks — #674: Excel — Crown hearing lists

> Resolve CLARIFICATIONS NEEDED #1 (on-page download journey vs email-only) and #2 (#957
> sequencing) before starting. If email-only is chosen, tasks 12–29 drop out.

## Prerequisites

- [ ] Confirm scope: on-page download journey (SJP precedent) vs email-only (magistrates precedent)
- [ ] Confirm the `EXCEL_GENERATOR_REGISTRY` key for the Crown Advance/Warned list against #957
- [ ] Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in every environment

## Dependencies and locales

- [ ] Add `"exceljs": "4.4.0"` and `"@hmcts/location": "workspace:*"` to `libs/list-types/crown-daily-list/package.json`
- [ ] Same for `crown-firm-list/package.json` and `crown-warned-list/package.json`; run `yarn install`
- [ ] Add `excelColumns` to `crown-daily-list` `en.ts`/`cy.ts` (reuse existing keys' values; new Welsh needed for `courtHouse`, `courtRoom`, `judge`)
- [ ] Add `excelColumns` to `crown-firm-list` `en.ts`/`cy.ts` (new Welsh for `courtHouse`, `courtRoom`, `judge`, `date`)
- [ ] Add `excelColumns` to `crown-warned-list` `en.ts`/`cy.ts` (new Welsh for `courtHouse`, `hearing`)
- [ ] Add locale key-parity tests (`Object.keys(en.excelColumns).sort()` ≡ `cy`) for all three libs

## Excel generators

- [ ] Create `libs/list-types/crown-daily-list/src/excel/excel-generator.ts` — flatten `courtLists → courtRoom → session → sittings → hearing → case`, columns A–J per plan §3.3
- [ ] Create `libs/list-types/crown-firm-list/src/excel/excel-generator.ts` — read **`groupedListData`** (not `listData`, which is `null`), columns A–L
- [ ] Create `libs/list-types/crown-warned-list/src/excel/excel-generator.ts` — read `groupedCategories`, import `TO_BE_ALLOCATED_KEY`, `*` custody prefix, columns A–G
- [ ] Coalesce every value with `?? ""` before `sanitiseCellValue` (it throws on `undefined`)
- [ ] Freeze the header row (`worksheet.views = [{ state: "frozen", ySplit: 1 }]`) in all three
- [ ] Export `generateCrownDailyListExcel` / `generateCrownFirmListExcel` / `generateCrownWarnedListExcel` from each lib's `src/index.ts`
- [ ] Write `excel-generator.test.ts` for each: worksheet name, header order/count, Welsh locale, one row per case with repeated ancestors, empty list → header-only workbook, formula-injection prefixing, `undefined` fields → empty cells, success/failure result shapes
- [ ] `crown-firm-list` test: date repeated per row, multiple court rooms grouped under one day
- [ ] `crown-warned-list` test: `TO_BE_ALLOCATED` → translated label; `*` present/absent per `isInCustody`

## Pipeline registration

- [ ] Add the three `EXCEL_GENERATOR_REGISTRY` entries in `libs/publication/src/processing/service.ts` (string names only, no numeric ids)
- [ ] Extend `service.test.ts`: `listTypeHasExcel` true for all three, dispatch reaches the right generator, generator failure leaves publication succeeding on the PDF path, `result.excelPath` reaches notifications
- [ ] Add a notification test: PDF+Excel Notify template selected for a Crown artefact with both files under 2MB; PDF-only fallback when the Excel is absent

## Shared download journey (skip if email-only)

- [ ] Move `list-download-disclaimer.njk` and `list-download-files.njk` into `libs/web-core/src/views/`; delete the four duplicate SJP copies
- [ ] Update the four `list-download-*.njk.test.ts` files' `createTestEnvironment` paths to the shared views dir
- [ ] Rename `sjp-download-shared.ts` → `list-download-shared.ts`; update all SJP imports
- [ ] Move `createRequireVerifiedWithProvenance` (+ the `requireVerifiedWithProvenance` default) into `list-download-shared.ts`; delete `sjp-press-list/require-verified-with-provenance.ts`
- [ ] Replace the inline guard duplicate in `sjp-press-list/list-download-disclaimer.ts` with the shared factory
- [ ] Add `createListDownloadDisclaimerHandlers(en, cy)` to `list-download-shared.ts` so the GET/POST pair is not copied per list type
- [ ] Run the full SJP page + template test suites to confirm no regression from the move

## Crown page wiring (skip if email-only)

- [ ] Add `req` to `RenderCallback` params in `list-type-handler.ts` and thread it through `createListTypeHandler` and `createSimpleListTypeHandler`
- [ ] `crown-daily-cause-list/index.ts`: compute `downloadDisclaimerUrl` from `req.user?.role === "VERIFIED"` and `getBlobProperties` for `.pdf`/`.xlsx`; pass to the template
- [ ] Same for `crown-firm-list/index.ts` and `crown-warned-list/index.ts`
- [ ] Add the button-styled link to all three `.njk` files, gated on `downloadDisclaimerUrl`
- [ ] Add `downloadCopy`, `disclaimer` and `downloadFiles` to all six Crown locale files, copying the approved Welsh from `libs/list-types/sjp-press-list/src/sjp-press-list/cy.ts:54-75` verbatim
- [ ] Create `list-download-disclaimer.ts`, `list-download-files.ts` and `download.ts` under `crown-daily-cause-list/` (guard + shared handler, no `.njk`)
- [ ] Same trio under `crown-firm-list/` and `crown-warned-list/`
- [ ] Write co-located controller tests: `downloadDisclaimerUrl` null for unverified users and when no blob exists; disclaimer POST without `agreed` re-renders with the error summary; with `agreed` redirects to the files page; files page lists both files, PDF-only when the Excel is missing, 404 when neither exists; `/download?type=xlsx` sets the spreadsheet content type, attachment disposition and no-store headers; 400 on bad `type` or malformed `artefactId`; unverified access redirects to `/sign-in` and sets `session.returnTo`
- [ ] Add template tests for the three Crown views: exactly one download button when the URL is set, none when null; Welsh render

## E2E (skip if email-only)

- [ ] Create `e2e-tests/tests/crown-list-download.spec.ts` with one `@nightly` journey per list type — validation error, Welsh switch, inline Axe scan, keyboard navigation, both file links with sizes, and an actual Excel download asserting the content type
- [ ] Add a check that an unverified user sees no download button and is redirected from a direct disclaimer request

## Verification

- [ ] `yarn lint:fix` and `yarn format`
- [ ] `yarn test` (root) green, including the `libs/list-types/common` schema guard test
- [ ] `yarn test:e2e:all` green
- [ ] Manually publish each Crown list type locally; confirm `{artefactId}.xlsx` appears in the PUBLICATIONS container and the Excel columns match the PDF field-for-field
- [ ] Publish a `locale: "cy"` Crown artefact; confirm Welsh worksheet name and headers
- [ ] Note the pre-existing `listTypeName: pdfResult.listTypeName ?? ""` coupling in the PR description (not fixed here)
