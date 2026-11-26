# Code Review: Issue #945

Excel download for the Birmingham, Leeds, Bristol and Cardiff, and Manchester Administrative Court Daily Cause Lists.

Reviewed: full working tree against `HEAD` (`25364c6f` = `origin/feature-944-tribunals-hearing-list`), including staged, unstaged and untracked files (`apps/postgres/prisma/migrations/20261014120000_rename_bristol_cardiff_administrative_court_list_type/`).

## Summary

The change is small and follows the established pattern from #940/#941/#942/#944:

- **§A–E Excel:** a 17-line `reformatAdministrativeCourtDailyCauseListExcel` over the shared `reformatUploadedWorkbook`, a single `createUploadedExcelGenerator` instance, and four `EXCEL_GENERATOR_REGISTRY` entries keyed on `listTypeName`. No `apps/`, notification, Helm or env-var changes are needed, and none were made.
- **§F Welsh PDF:** `pdf-generator.ts` now takes the title and data source from the locale files. The English-only `LIST_TITLE_MAP` is gone, and so is the runtime `@hmcts/publication` import, which closed a publication → admin-court → publication cycle.
- **§G Welsh text:** `cy.ts` is aligned with legacy PIP (Leeds paragraph 2, both caution notes, data source label).
- **§H Rename:** `BRISTOL_CARDIFF_…` becomes `BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` in all code and tests, with a guarded in-place migration. `urlPath` is unchanged.

Verification I ran myself:

| Check | Result |
|---|---|
| Biome on all 18 changed `.ts`/`.json` files | Clean |
| `tsc --noEmit` on admin-court lib, publication, notifications, list-types-common, web | Clean |
| `vitest run` in admin-court lib (62), publication (544), notifications (83), list-types-common (349), web (3956 + 3 skipped) | All pass. `app.test.ts` passed on this run too |
| Remaining `BRISTOL_CARDIFF` references (tracked + untracked source, excluding `docs/`, `dist/`, the new migration) | **None**. `e2e-tests/utils/seed-list-types.ts` never listed it, and `apps/postgres/prisma/generate-seed-sql.ts` reads `listTypeData`, so it picks up the new name automatically |
| Migration SQL against `libs/postgres-prisma/prisma/schema/location.prisma` | `list_types` (`@@map`), `name` (unique) and `updated_at` (`@map`) are all correct. Every other table references list types by integer `list_type_id`/`list_type_ids`, so an in-place rename keeps all FKs and subscriptions |
| Migration executed against the local `cath-postgres` container inside `BEGIN … ROLLBACK` | (1) only the old name exists: row 26 is renamed and keeps its id; (2) both names exist: fails on the `list_types_name_key` unique index (the migration was later simplified to a single `UPDATE`, which relies on this index instead of a `DO $$` guard); (3) already renamed: no-op; (4) replaying #1144's `20261007120000_rename_list_types_to_shared_model` afterwards: no-op, row 26 unchanged. Local DB confirmed unchanged afterwards |

No critical or high-priority defects found.

## 🚨 CRITICAL Issues (file:line, impact, specific fix)

None.

## ⚠️ HIGH PRIORITY Issues

None. Every changed workspace is above 80% statement coverage, and every acceptance criterion is evidenced in code and tests (see below).

## 💡 SUGGESTIONS

1. **`as` assertion where a guard is used one line above**: `libs/list-types/administrative-court-daily-cause-list/src/pdf/pdf-generator.ts:36`
   - `t.common.provenanceLabels[options.provenance as keyof typeof t.common.provenanceLabels] || options.provenance` contradicts the type-guard approach `isCourtListTypeName` (`:64-66`) already takes for `listTypeName`. CLAUDE.md lists "`as` assertions instead of type guards" as an anti-pattern.
   - **Approach:** `Object.hasOwn(t.common.provenanceLabels, provenance) ? t.common.provenanceLabels[provenance] : provenance` (with a small guard), or a shared `getProvenanceLabel(labels, provenance)` helper in `@hmcts/list-types-common` so the Tribunal libs from #944 can use it too.

2. **English-only fallback title**: `pdf-generator.ts:20`
   - `DEFAULT_LIST_TITLE = "Administrative Court Daily Cause List"` is used for both locales. It's practically unreachable, because the registry only routes the four known names and the guard checks `en` keys. Even so, a Welsh PDF that hits the fallback would still have an English title.
   - **Approach:** move the generic title into `en.common`/`cy.common` (for example `defaultPageTitle`) and use `t.common.defaultPageTitle`.

3. **Welsh PDF still has English fragments (pre-existing, not touched by this diff)**: `src/pdf/pdf-template.njk:2` and `:54`
   - `<html lang="en">` is hardcoded, and the empty-state text `No hearings scheduled.` is a literal English string. §F's goal was Welsh parity for the PDF, and the wrong `lang` affects screen-reader pronunciation in a tagged PDF. Not an AC of #945.
   - **Approach:** follow-up ticket. Use `lang="{{ 'cy' if locale == 'cy' else 'en' }}"` and add a `common.noHearings` locale key.

4. **Reformatter parity test: the `cy` case adds no signal, and Excel-typed time cells aren't covered**: `src/excel/excel-reformatter.test.ts:88`
   - `it.each(["en", "cy"])` compares data rows, but `renderAdminCourt(...).hearings` and `normaliseHearing` don't depend on locale, so the `cy` run repeats the `en` run. The test also passes `en`'s Birmingham `listTitle` for `cy`. The parity itself is real: it goes through the real converter (`convertExcelForListTypeName`) and the real `renderAdminCourt`, which is the PDF's code path. However, the fixture only uses string cells.
   - **Approach:** replace the locale loop with one more fixture row whose Time cell is an Excel time value (a `Date`). That covers the `readCellValue` branch where converter and reformatter parity matters most.

5. **Migration timestamp order relative to #1144**: `apps/postgres/prisma/migrations/20261014120000_…`
   - If #945 merges and deploys before #1144, #1144's `20261007120000_…` will be applied after a later-dated migration. I proved the SQL is order-independent (see Summary), and `prisma migrate deploy` applies any unapplied migration. Still, run `prisma migrate status` on STG after the second PR merges to confirm both rows exist in `_prisma_migrations`.

6. **Welsh "data source" label is inconsistent across libs** (user decision; noted only): `src/locales/cy.ts:52`
   - "Ffynhonnell y Data" (PIP's PDF wording) is now used by 5 list-type libs, while 17 still use "Ffynhonnell data". Consider a single `dataSource` string in `@hmcts/list-types-common` locales so the libs can't drift.

7. **Type-only `@hmcts/publication` re-export remains**: `src/index.ts:4`
   - `export type { ValidationResult } from "@hmcts/publication"` is erased at runtime, so the runtime cycle is removed as claimed. A compile-time edge remains, though, and `@hmcts/publication` was never declared in this lib's `package.json`. The same pattern is in 29 list-type libs, so this is a repo-wide follow-up (re-export `ValidationResult` from `@hmcts/list-types-common`), not a #945 fix.

8. **`as any` in new publication tests**: `libs/publication/src/processing/service.test.ts:2556`, `:2573`, `:2591`
   - `mockResolvedValue({ name: "…" } as any)` matches the 55 existing uses in the file, but `as unknown as Awaited<ReturnType<typeof prisma.listType.findUnique>>`, or a typed `buildListType()` helper, would keep the new block `any`-free.

9. **Local hygiene (not in the diff):** gitignored `dist/` folders still contain `BRISTOL_CARDIFF` (`libs/list-types/common/dist/mock-list-types.js`, `libs/location/dist/list-type-data.js`, `libs/publication/dist/…`, `libs/notifications/dist/…`, the admin-court lib's `dist/locales`). Two of them have no `src/` counterpart any more. They're only used under the `production` export condition and are rebuilt in CI/Docker, but run `rm -rf libs/**/dist && yarn build` before any local production-mode run so stale output doesn't hide a regression.

10. **Pre-existing failing suite, unrelated:** `apps/postgres/src/schema-discovery.test.ts` fails with `Cannot find module './schema-discovery.js'`. The test file is tracked at HEAD and the module isn't. Not caused by #945; it's worth a separate fix because `yarn test` in `apps/postgres` is red.

## ✅ Positive Feedback

- **Minimal, pattern-consistent change.** The reformatter is 17 lines and reuses `ADMIN_COURT_EXCEL_CONFIG.fields`, `t.common.tableHeaders` (the same keys as `pdf-template.njk:30-36`) and `normaliseHearing` (the row form of what `renderAdminCourt` uses), so the Excel and PDF table can't drift.
- **Security is handled by the shared reformatter.** It builds a fresh workbook, so hidden sheets, notes, formulas and metadata are dropped, unknown columns are dropped, and every cell goes through `sanitiseCellValue`. The tests prove the `=HYPERLINK(...)` escape and the dropped "Internal notes" column (`excel-reformatter.test.ts:133-158`). The failure log contains only `artefactId` and the error message (`service.test.ts:2588-2608`), with no cell content.
- **CLAUDE.md compliance.** Everything is keyed on `listTypeName` and the fixtures use `listTypeId: 999`. All relative imports have `.js`. Nothing is exported just for tests (`isCourtListTypeName` is module-private). Module ordering is correct in `pdf-generator.ts` (consts, exported function, helper, then interface/type at the bottom). No meaningless comments were added.
- **The migration is careful.** The in-place rename keeps the id, and therefore the artefacts, subscriptions (`Int[]` with no FK), third-party and search config. It fails loudly on a conflicting duplicate rather than letting the seed's soft-delete reconciliation hide the old row, and its comment explains *why* (open-justice data loss), not *what*. It's byte-compatible with #1144 in either order.
- **Good registry-completeness test.** `service.test.ts:2481-2522` derives the four names from `listTypeData` by `urlPath` and uses a non-mutating sort, so a future rename or a missing registry entry fails loudly.
- **`pdf-generator` refactor.** Replacing the dynamic `loadTranslations` imports and the `Record<string, string>` cast with a static locale pick and a real type guard (`Object.hasOwn`, excluding `common`) removes two casts and the cycle, and keeps the module at 100% branch coverage.
- **E2E test extended inside the existing journey**, not added as a new one: Welsh headings, normalised time, dropped column, bold header, both Notify links, inline axe check through `checkAccessibility: true`, and cleanup in `finally`.

## Test Coverage Assessment

**Unit**
- `excel-reformatter.test.ts`: 7 tests (11 cases). Real ExcelJS round trips with no mocks of `@hmcts/list-types-common`. Covers English/Welsh bold headings, row-by-row parity with `renderAdminCourt` via the real converter, `10.30am` → `10:30am`, empty Additional Information as `""`, the dropped extra column and second sheet, the uploaded sheet name kept, the frozen header, formula escaping, and all four list type names.
- `pdf-generator.test.ts`: +10 cases. The Welsh/English title and data source for each of the four names are asserted on the rendered HTML (not just the mock call). Also covers the raw-provenance fallback and omission when provenance is absent.
- `service.test.ts`: +16 cases. Registry completeness, `listTypeHasExcel`, reformat and save with `(buffer, locale)`, stale-xlsx delete when nothing was uploaded, `processPublication` with and without an upload, failure path keeping the PDF, and the redacted log payload.
- Rename updates in the renderer, web controller and web template tests. Top-level locale-key parity is already asserted at `administrative-court-daily-cause-list.njk.test.ts:102`.

**E2E**: `e2e-tests/tests/admin/non-strategic-upload.spec.ts:649-673` (STEP 10), inside `test.describe.skip` until SSO is re-enabled (agreed). Unit tests are the effective gate until then.

**Accessibility**: no web UI changes. The E2E upload uses `checkAccessibility: true` (`:655`), which only runs once the suite is unskipped. The reformatted workbook keeps a single header row at A1 with no merged cells and a frozen header, which is the shared reformatter's behaviour.

**Statement coverage per changed workspace** (`vitest run --coverage`):

| Workspace | Statements | Status |
|---|---|---|
| `@hmcts/administrative-court-daily-cause-list` | 100% (38/38); branches 100% (28/28) | ✅ |
| `@hmcts/publication` | 95.68% (444/464) | ✅ |
| `@hmcts/notifications` (one-line rename) | 90.58% (231/255) | ✅ |
| `@hmcts/list-types-common` (one-line rename) | 93.91% (586/624) | ✅ |
| `@hmcts/web` (controller rename + tests) | 95.57% (5227/5469) | ✅ |
| `apps/postgres` (migration SQL only) | n/a. No TS changed; SQL exercised manually against Postgres | ✅ |
| `e2e-tests` | n/a | n/a |

No workspace is below 80%.

## Acceptance Criteria Verification

- [x] **Excel and PDF downloadable files are made available as downloadable options for all the administrative court hearing lists above**
  - PDF: `libs/publication/src/processing/service.ts:238-242` (Bristol at `:241` under the new name). Excel: `service.ts:422` and `:469-472`, keyed on all four `listTypeName`s. Proven by `service.test.ts:2519-2551` (names derived from `listTypeData`, `listTypeHasExcel` true, reformat and save for each). The same blob is served by the existing `?format=excel` download, exercised in the E2E at `non-strategic-upload.spec.ts:660`. Excel is produced for Excel uploads only, per the agreed decision.
- [x] **The uploaded excel file will be re-used in providing the excel file for download**
  - The uploaded buffer is passed by `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:127-137,175`, reformatted by `libs/list-types/administrative-court-daily-cause-list/src/excel/excel-reformatter.ts:6-17` (first sheet, uploaded sheet name, widths and styles kept), and saved by `service.ts:422` → `createUploadedExcelGenerator`. Tests: `excel-reformatter.test.ts:133-147` (uploaded sheet name kept, unknown content dropped) and `service.test.ts:2532-2541`.
- [x] **All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file**
  - The 7 PDF table columns (`src/pdf/pdf-template.njk:30-46`) are the allow-list (`excel-reformatter.ts:12-14`: `ADMIN_COURT_EXCEL_CONFIG.fields`, `t.common.tableHeaders`, `normaliseHearing`). Row-for-row parity with `renderAdminCourt` through the real converter: `excel-reformatter.test.ts:88-110`. This is table-only by agreed decision, matching PIP PUB-3307 and #940.
- [x] **Links to download both file types are displayed in the email notifications**
  - The xlsx is written to `{artefactId}.xlsx` in `PUBLICATIONS` (`createUploadedExcelGenerator` → `saveExcelToStorage`) and probed by `libs/notifications/src/notification/notification-service.ts:513`. `libs/notifications/src/govnotify/template-config.ts:38-42` then selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`. `service.test.ts:2554-2569` proves `excelPath` reaches `sendLocationAndCaseSubscriptionNotifications`. The E2E asserts two Notify document links (`non-strategic-upload.spec.ts:673`, currently skipped; delivered email to be confirmed on a lower environment, see Next Steps).

**Tally: 4 met / 0 partial / 0 unmet of 4.**

## Next Steps

- [ ] Optional: suggestions 1–2 (`as` assertion and English fallback title in `pdf-generator.ts`) before raising the PR; both are a few lines
- [ ] Optional: suggestion 4 (time-typed Excel cell in the parity fixture)
- [ ] Raise follow-ups: Welsh `lang`/empty-state in `pdf-template.njk` (S3), shared Welsh `dataSource` string (S6), `ValidationResult` re-export from list-types-common (S7), broken `apps/postgres/src/schema-discovery.test.ts` (S10)
- [ ] Lower environment, after deploy: confirm the Bristol and Cardiff `list_types` row keeps its id, its existing publications and subscriptions still show, and `prisma migrate status` is clean (again after #1144 merges)
- [ ] Lower environment: upload one English and one Welsh workbook per court with a hidden sheet, an extra column, a note and a formula; confirm the email has both links, the xlsx has none of the extra content and matches the PDF table row for row, and the Welsh PDF title and data source are in Welsh
- [ ] Un-skip the E2E journey when SSO specs are re-enabled
- [ ] Locally: `rm -rf` stale `dist/` folders and rebuild before any production-condition run

## Overall Assessment: APPROVED

No critical or high-priority issues. All four acceptance criteria are met with code and test evidence, every changed workspace is above 80% statement coverage (lowest 90.58%), lint and typecheck are clean, and the rename migration was verified against the real schema and a real Postgres instance in all its paths. The remaining items are small refinements and pre-existing follow-ups.
