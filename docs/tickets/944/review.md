# Code Review: Issue #944 (re-review 2)

Excel download for the remaining Tribunal hearing lists. This re-review covers the uncommitted working tree on `feature-944-tribunals-hearing-list` (base `f1521ded`, #941). It focuses on what changed since the last review:
- SIAC/POAC/PAAC court names restored, and the SIAC PDF now takes the court name and title from the locale
- PDF data-source label from each lib's locale `provenanceLabels`
- `normalizeTime` ("." to ":") in the GRC, SIAC/POAC/PAAC and AST renderers and Excel reformatters
- E2E Welsh CIC heading switched to the curly "Enw’r achos"

## Summary

The Excel work is unchanged and still correct. The eight `EXCEL_GENERATOR_REGISTRY` entries are at `libs/publication/src/processing/service.ts:476-483`, with the shared SIAC/POAC/PAAC Excel generator at `:418`. The four changes since the last review are all correct, consistent between PDF, web and Excel, and tested. The previous HIGH (the E2E apostrophe) is fixed. I found no new critical or high issues.

### Court names restored

- `siacCourtName` / `poacCourtName` / `paacCourtName` are back in the SIAC `en.ts` and `cy.ts`, with English values in `cy` (settled). `git diff HEAD` shows no change to `en.ts`.
- `RenderOptions.courtName` is still in the SIAC renderer. The renderer diff only touches `time`.
- The SIAC web page controller (`apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.ts`) is byte-identical to HEAD (`git diff --quiet HEAD` succeeds).
- `generateSiacPoacPaacWeeklyHearingListPdf` maps `listTypeName` to a pair of locale keys through `LIST_TYPE_KEYS` (`libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.ts:13-17`). It resolves `courtName` and `listTitle` from `t` (`:28-29`). An unknown name returns `{ success: false }` before any rendering (`:20-23`).
  - `ListTypeKeys` uses literal-union key types (`:39-42`), so `t[keys.courtName]` is type-checked against the locale with no `as`.
  - Module ordering follows CLAUDE.md: consts, then the exported function, then interfaces.
- `service.ts:142-143` registers one `siacPoacPaacGenerator` that forwards `listTypeName` (with `?? ""`). It is used for all three names at `:253-255`. The hard-coded English court names and titles in the registry are gone.
- `service.test.ts` asserts that `listTypeName` is forwarded and that the registry no longer passes `courtName`. The lib test checks the locale court name and title for POAC cy, all three names × both locales, the legacy Welsh SIAC title as a literal, and the unsupported-name path.
- The PDF uses the same locale keys as the web page, so the two now agree for all three list types in both languages.

### Data-source label from the locale

- All six tribunal PDF generators now resolve `provenanceLabel` from `t.provenanceLabels`:
  - `pht-weekly-hearing-list/src/pdf/pdf-generator.ts:22`
  - `care-standards-tribunal-weekly-hearing-list/src/pdf/pdf-generator.ts:43`
  - `cic-weekly-hearing-list/src/pdf/pdf-generator.ts:18`
  - `grc-weekly-hearing-list/src/pdf/pdf-generator.ts:43`
  - `ast-daily-hearing-list/src/pdf/pdf-generator.ts:18`
  - `siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.ts:31`
- Every lib's `en.ts` and `cy.ts` already re-exports `provenanceLabelsEn` / `provenanceLabelsCy` from `@hmcts/list-types-common` (`libs/list-types/common/src/locales/en.ts:1-7`, `cy.ts:1-7`): MANUAL_UPLOAD is "Manual Upload" / "Lanlwytho â Llaw", SNL is "ListAssist", CP_CATH is "Libra". This matches legacy `convertDataSourceName`.
- The web page resolves the same `t.provenanceLabels` first (`apps/web/src/pages/(list-types)/list-type-handler.ts:165`), so PDF and web now show the same label in both languages.
- The runtime import of `PROVENANCE_LABELS` from `@hmcts/publication` is gone from all six libs. A repo-wide grep finds no remaining reference in them. Their remaining `@hmcts/publication` imports are `export type` only. This removes the runtime circular-dependency smell flagged last time.
- The GRC switch from `provenanceLabelsEn` to `t.provenanceLabels` fixes the Welsh GRC PDF too.

### Times

- `normalizeTime` (`libs/list-types/common/src/rendering/date-formatting.ts:54-56`, exported at `index.ts:77`) is applied in:
  - the GRC renderer (`renderer.ts:28`) and Excel reformatter (`excel-reformatter.ts:15`)
  - the SIAC renderer (`renderer.ts:28`) and Excel reformatter (`excel-reformatter.ts:15`)
  - the AST renderer (`renderer.ts:32`) and Excel reformatter (`excel-reformatter.ts:15`)
- The renderers are shared by the web page and the PDF (`apps/web/src/pages/(list-types)/{grc,siac-poac-paac,ast}-*/index.ts` call them), so all three outputs agree.
- **Null safety:** `normalizeTime` calls `.replace` on its argument. The renderers are safe because `hearingTime` / `time` is `required` in all three JSON schemas and typed `string`. The reformatters are safe because `formatDataRow` pre-fills every field with `""` (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts:89`).
- The Excel round-trip tests ("should write the same rows as the PDF" in en and cy) still pass with the new formatting on both sides. Each lib also has a dot-time test for the renderer and for the Excel. The GRC Excel fixture now uses `"10.30am"`, so the round-trip actually exercises the conversion.
- CIC times are untouched, as settled.

### Excel reformatter comments

All six comments are accurate after the change:
- PHT, CST and CIC: "long-form date"
- GRC and SIAC: "long-form date and times with a colon"
- AST: "hearing times with a colon", replacing the old "no extra formatting", which is now false
- The CIC alias comment still describes the `"venue/platform"` vs `venuePlatform` key mismatch correctly

### E2E

`CIC_CY_HEADINGS` at `e2e-tests/tests/admin/non-strategic-upload.spec.ts:95` is now `"Enw’r achos"`. This matches `cic-weekly-hearing-list/src/locales/cy.ts:29` and the existing `INTERIM_APPLICATIONS_CY_HEADINGS` (`:61`). The previous HIGH 1 is resolved.

### Checks run

- **Biome:** clean on the 54 changed files.
- **`tsc --noEmit`:** passes for the six libs, `publication` and `apps/web`.
- **Unit tests:** all pass.
  - PHT 57
  - CST 44
  - CIC 43
  - GRC 41
  - AST 39
  - SIAC 57
  - publication 528
  - web SIAC page 14

### Security

- No change from the last review.
- Excel cell values still go through `sanitiseCellValue` (`uploaded-workbook-reformatter.ts:78`).
- Only the allow-listed columns of the first sheet are copied into a fresh workbook.
- The failure log is `{ artefactId, error }` only (tested at `service.test.ts:2448`).
- The new code adds no logging.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

Inherited from #942 (still open, not introduced here, and not counted):
- `createUploadedExcelGenerator` calls `deleteBlob` without a guard (`service.ts:409-411`). A failed delete makes the Excel step throw, where the guarded `deleteStaleExcel` (`:797`) would not (#942 review HIGH 3).
- Duplicate mapped headers: the converter keeps the last match and the reformatter the first (#942 review HIGH 5).

## 💡 SUGGESTIONS

1. **Two copies of the SIAC/POAC/PAAC name-to-locale-key mapping.** The PDF's `LIST_TYPE_KEYS` (`siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.ts:13-17`) and the web page's `LIST_TYPE_CONFIG` (`apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.ts:15-34`) encode the same mapping. They agree today. A fourth list type, or a renamed key, would have to be changed in both. A small exported resolver in the lib (for example `resolveSiacPoacPaacHeader(listTypeName, locale)`) would let both use one source. Do this in a follow-up, because the web controller was deliberately kept identical to HEAD.
2. **The provenance-label expression is now repeated six more times.** `options.provenance ? t.provenanceLabels[options.provenance as keyof typeof t.provenanceLabels] || options.provenance : ""` appears in each tribunal PDF generator, and the `PROVENANCE_LABELS` variant appears in about 25 other libs. A shared `resolveProvenanceLabel(labels, provenance)` in `@hmcts/list-types-common` would remove the `as` cast and the duplication. It would also be the natural place to move the other lists' PDFs onto the localised labels. Right now the eight Tribunal PDFs say "ListAssist"/"Libra" while, for example, SSCS and RCJ PDFs still say "SNL"/"CP-CaTH". That is outside #944's scope, so it belongs in a follow-up.
3. **The GRC PDF test's mock of `@hmcts/list-types-common` has the wrong SNL value.** It defines `provenanceLabelsEn` / `provenanceLabelsCy` with `SNL: "SNL"` (`grc-weekly-hearing-list/src/pdf/pdf-generator.test.ts:16-23`), but the real value is "ListAssist". No current GRC test asserts on SNL, so nothing fails. However, a future "as legacy does" SNL assertion would test the mock, not the real behaviour. Use `"ListAssist"`, or import the real label objects.
4. **The new AST tests have no AAA comments.** The AST renderer test (`ast-daily-hearing-list/src/rendering/renderer.test.ts:83`) and the provenance `it.each` (`pdf-generator.test.ts:108`) follow the existing AST file style, which has no `// Arrange / Act / Assert` anywhere. `.claude/rules/testing.md` requires AAA. The GRC and SIAC equivalents in this change set use it.
5. **`PHT_COURT_NAME` is now dead code.** `pht-weekly-hearing-list/src/rendering/renderer.ts:4` is exported but referenced nowhere in `apps/` or `libs/`. It was already unused at HEAD. Its sibling `PHT_LIST_TITLE` was removed in this change set, so removing this one too would finish the clean-up.
6. **Carried over from the last review (still open, all optional):**
   - The SIAC/POAC/PAAC Welsh caution text uses straight apostrophes. This is settled for now; record the convention when the content pass happens.
   - The English GRC E2E heading check is tautological: `GRC_EN_HEADINGS` equals `GRC_UPLOADED_HEADER` (`non-strategic-upload.spec.ts:62-84`).
   - The ExcelJS test helpers are duplicated across six `excel-reformatter.test.ts` files.
   - `consoleWarnSpy.mockRestore()` at the end of the test body (`service.test.ts:2472`) is not failure-safe. Prefer `afterEach(() => vi.restoreAllMocks())`.
   - There are `as any` casts in the new cy web test (`apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.test.ts:276,279`) and in the Tribunal `prisma.listType.findUnique` mocks. These follow the existing file pattern.
   - Follow-up tickets:
     - Welsh `searchCasesLabel` for GRC (`grc-weekly-hearing-list/src/locales/cy.ts:21`) and SIAC (`cy.ts:12`)
     - English-only Notify link text (`libs/notifications/src/govnotify/govnotify-client.ts:89`)
     - the AST Welsh body text "sylaenol" typo and straight apostrophes (`ast-daily-hearing-list/src/locales/cy.ts:14-15`)

## ✅ Positive Feedback

- **The court-name restore is minimal.** The keys, renderer option and web controller are back to their HEAD state. The only behavioural change is that the PDF reads court name and title from the locale by `listTypeName` instead of from strings hard-coded in `service.ts`. This follows CLAUDE.md's rule against hard-coded display strings, and its rule to use `listTypeName`, not `listTypeId`.
- **The unsupported-name branch fails safely.** An unknown `listTypeName` returns an error result instead of rendering "undefined" into a PDF, and it is tested.
- **The data-source fix matches legacy and the web page.** All six libs have an en/cy provenance test. AST and SIAC include SNL → "ListAssist", which pins the legacy-facing value.
- **Time formatting is consistent.** It is applied in the renderer (web and PDF) and the reformatter (Excel) from one shared helper. Both the dedicated dot-time tests and the existing round-trip tests prove PDF/Excel parity.
- **The test fixtures are good.** The Tribunal block in `service.test.ts` uses `listTypeId: 999` throughout. The SIAC web test uses 999/998/997, in line with CLAUDE.md. The Tribunal list-type names are derived from `listTypeData` by `urlPath`, so a missing registration fails CI.
- **The locale tests guard against regressions.** The SIAC `locales.test.ts` now has key parity (including `tableHeaders`) and a "translated, not placeholder, not English" check for every heading. GRC has an equivalent new `locales.test.ts`.
- The previous HIGH (E2E apostrophe) was fixed exactly as recommended.

## Test Coverage Assessment

- **Unit tests:** strong.
  - The Excel round-trip tests compare against the PDF renderer in en and cy for every lib:
    - PHT `excel-reformatter.test.ts:74`
    - CST `:74`
    - SIAC `:85`
    - GRC `:100`
    - CIC `:98`
    - AST `:74`
  - The new tests cover:
    - locale court name and title for the SIAC PDF
    - localised data source in all six libs
    - dot-to-colon time in three renderers and three reformatters
    - SIAC locale parity
  - All suites pass. The new tests follow AAA except the AST ones (Suggestion 4).
- **E2E tests:** the `@nightly` journey (STEP 8 GRC English, STEP 9 CIC Welsh) is inside `test.describe.skip` (`non-strategic-upload.spec.ts:285-286`), so nothing runs end to end today. The constants are now consistent with the locales, so STEP 9 should pass when the suite is re-enabled. The tasks.md §4 lower-environment check is the real gate and is legitimately pending deployment.
- **Accessibility tests:** not applicable. No templates, routes or page markup changed.
- **Statement coverage** (`vitest run --coverage`, text-summary Statements):

  | Workspace | Statements | Note |
  |---|---|---|
  | `@hmcts/pht-weekly-hearing-list` | 89.65% (26/29) | |
  | `@hmcts/care-standards-tribunal-weekly-hearing-list` | 97.61% (41/42) | |
  | `@hmcts/siac-poac-paac-weekly-hearing-list` | 100% (39/39) | |
  | `@hmcts/grc-weekly-hearing-list` | 95.45% (42/44) | |
  | `@hmcts/cic-weekly-hearing-list` | 100% (34/34) | |
  | `@hmcts/ast-daily-hearing-list` | 100% (32/32) | |
  | `@hmcts/publication` | 95.68% (443/463) | |
  | `apps/web` | n/a | No source file changed. Only `siac-poac-paac-weekly-hearing-list/index.test.ts` changed (14 tests pass), and the controller is identical to HEAD |

  No workspace is below 80%.

## Acceptance Criteria Verification

- [x] **Excel and PDF downloadable files are made available as downloadable options for all the Tribunal hearing lists above.**
  - The 8 names are in `EXCEL_GENERATOR_REGISTRY` at `libs/publication/src/processing/service.ts:476-483`, with the shared SIAC/POAC/PAAC Excel generator at `:418`.
  - The PDFs are registered: SIAC/POAC/PAAC at `:253-255`, PHT at `:343`, AST at `:213`, and the others unchanged.
  - Tested at `service.test.ts:2384` (exactly eight names, derived from `listTypeData`) and `:2389` (`listTypeHasExcel` is true for each).
  - JSON-only publications get no Excel, as settled in plan.md §1.
- [x] **The uploaded excel file will be re-used in providing the excel file for download.**
  - The summary page passes the upload as `uploadedExcel` (`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:127,137,175`).
  - `createUploadedExcelGenerator` (`service.ts:392-414`) hands it to each lib's reformatter, e.g. `pht-weekly-hearing-list/src/excel/excel-reformatter.ts:10-17`.
  - Tested in `service.test.ts:2409` (the reformatter is called with the uploaded buffer). The kept sheet name and dropped content are tested per lib, e.g. `pht-weekly-hearing-list/src/excel/excel-reformatter.test.ts:109`.
- [x] **All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file.**
  - Met as decided: table fields only (plan.md §1).
  - Each converter's `fields` equals its PDF columns. Headings come from the same `t.tableHeaders`, with the CIC alias at `cic-weekly-hearing-list/src/excel/excel-reformatter.ts:11`.
  - Values get the same formatting as the PDF:
    - long-form dates, e.g. `grc-weekly-hearing-list/src/excel/excel-reformatter.ts:15`
    - `normalizeTime` for GRC, SIAC and AST, at `:15` in each
  - Parity against the PDF renderer in en and cy is tested at:
    - PHT `excel-reformatter.test.ts:74`
    - CST `:74`
    - SIAC `:85`
    - GRC `:100`
    - CIC `:98`
    - AST `:74`
- [x] **Links to download both file types are displayed in the email notifications.**
  - `processPublication` passes `excelPath` to `sendLocationAndCaseSubscriptionNotifications` (tested at `service.test.ts:2409`).
  - `buildEmailDataWithFiles` probes `${artefactId}.xlsx` (`libs/notifications/src/notification/notification-service.ts:513`), and `getSubscriptionTemplateId` returns `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` (`libs/notifications/src/govnotify/template-config.ts:38-42`).
  - The E2E link assertions are at `non-strategic-upload.spec.ts:617,631`, but the suite is skipped. The lower-environment check is pending deployment.

Tally: 4 met, 0 partial, 0 not met.

## Next Steps

- [ ] Optional clean-ups in this PR:
  - fix the GRC mock SNL value (Suggestion 3)
  - add AAA comments to the new AST tests (Suggestion 4)
  - remove `PHT_COURT_NAME` (Suggestion 5)
- [ ] Raise follow-ups:
  - shared SIAC header resolver (Suggestion 1)
  - shared `resolveProvenanceLabel` and localised labels for the other lists' PDFs (Suggestion 2)
  - Welsh search labels, Notify link text and AST Welsh body text (Suggestion 6)
- [ ] Ask the #942 owner to close the inherited guarded-delete and duplicate-header issues
- [ ] After #1122, #1129 and #941 are deployed, run the tasks.md §4 lower-environment check, including one Welsh upload per lib. Confirm the Welsh titles, Welsh data source and colon times in both the PDF and the Excel
- [ ] Merge after #1122, #1129 and #941, by merge rather than rebase

## Overall Assessment

**APPROVED** (advisory). There are no critical or high issues, all four acceptance criteria are met, and every changed workspace is above 80% statement coverage. The changes since the last review are correct and well tested:
- Court names are restored to their HEAD state, with the SIAC PDF reading court name and title from the locale by `listTypeName`.
- The localised data-source label now matches the web page and legacy.
- Dot-to-colon times are applied consistently across web, PDF and Excel.
- The previous E2E HIGH is fixed.

The remaining suggestions are small hygiene items and follow-ups.
