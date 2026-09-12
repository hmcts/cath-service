# Code Review: Issue #798

## Summary

The implementation adds the **Interim Applications List (ChD) Daily Cause List** as a non-strategic list type, closely following the established RCJ/ChD pattern. It introduces a new lib (`libs/list-types/interim-applications-chd-daily-cause-list/`) owning an object-root JSON schema, validator, two-tab Excel converter, open-justice-aware renderer, PDF generator, and full en/cy locales, plus a public page under `apps/web/src/pages/(list-types)/`. All registration touchpoints (root tsconfig paths, `list-type-data.ts`, `PDF_GENERATOR_REGISTRY`, `EMAIL_BUILDER_REGISTRY`, side-effect converter imports on both upload pages, `moduleRoot` in `app.ts`) are wired correctly.

The change also carries a **shared bug fix** in `libs/list-types/common/src/conversion/excel-to-json.ts` (`normalizeCellValue` + 1899-epoch time formatting) that affects all list types. This is the highest-risk part of the change and was reviewed carefully — it is well-targeted and well-tested, with only a minor UTC/local-year edge case worth noting.

Code quality is high: strict typing (one documented, pattern-matching `as any` cast), AAA-structured tests, locale-key parity tests, per-field validator tests, and a structural template test. Test coverage is strong across every changed workspace. All acceptance criteria are met (Excel download descoped — not required for now), and the `govukDetails` `html:` rendering follows the established sibling pattern with double-layer no-HTML sanitisation of its user-derived fields.

Counts: 0 Critical, 0 High Priority, 5 Suggestions.

> **Review update (resolved by product/author decision):** The two items originally
> raised as HIGH PRIORITY have been resolved and are retained below under RESOLVED
> for the record:
> 1. The `html:` injection in `govukDetails` **follows the established pattern used by
>    every sibling list type** (`companies-winding-up`, `court-of-appeal-civil`,
>    `london-administrative-court`, all `rcj-standard-daily-cause-list` variants,
>    `iac-daily-list`, `sjp-press-list`). The two user-derived fields it interpolates
>    (`nameToBeDisplayed`, `email`) are sanitised by the no-HTML validator at BOTH the
>    converter and the schema `pattern` layer, so `<…>` content is rejected before
>    render. Accepted as-is — idiomatic and double-sanitised.
> 2. **No Excel download is required for now** (product decision). The Excel half of
>    that acceptance criterion is descoped; PDF download is fully implemented.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## ✔️ RESOLVED (originally raised, closed by decision)

1. **Open-justice paragraph rendered via `html:` in `govukDetails` — follows established pattern, accepted.**
   - File: `apps/web/src/pages/(list-types)/interim-applications-chd-daily-cause-list/interim-applications-chd-daily-cause-list.njk:23-27`; paragraph built in `libs/list-types/interim-applications-chd-daily-cause-list/src/rendering/renderer.ts:36`.
   - This `html:` string-concatenation approach is the **codebase convention** — every RCJ/ChD sibling uses it. The two interpolated fields from Tab 2 (`nameToBeDisplayed`, `email`) pass through `validateNoHtmlTags` in the converter AND the schema's no-HTML `pattern` at render, so any value containing `<...>` is rejected at two layers before reaching the template. Given the double sanitisation and pattern consistency, this is accepted.
   - (Optional hardening, not required: the PDF template uses auto-escaped `{{ }}` at `pdf-template.njk:27`; the web template could match that for defence-in-depth, but it is not necessary given the two-layer validation.)

2. **Excel download — descoped (not required for now).**
   - PDF download is fully implemented and registered (`libs/publication/src/processing/service.ts:190-191`). Excel download is not required at this time per product decision, so the Excel portion of the "PDF and Excel downloadable version" criterion is out of scope.

## 💡 SUGGESTIONS

1. **Converter time validator is looser than the schema time pattern.**
   `TIME_PATTERN = /^(\d{1,2})([:.]\d{2})?\s*[ap]m\s*$/i` (`libs/list-types/common/src/conversion/validators.ts:7`) is case-insensitive and allows whitespace before `am`/`pm`, whereas the schema pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$` is case-sensitive lowercase with no internal space. A value like `"10.30 AM"` or `"10.30AM"` passes the converter but would fail the schema at render time. Consider aligning them, or documenting that the schema is the stricter authority. Low impact (converter output from `formatExcelTime` is always lowercase, no space).

2. **1899-epoch discriminator mixes UTC and local date components.**
   `formatDateValue` (`excel-to-json.ts:38-49`) branches on `value.getUTCFullYear() === 1899` but formats genuine dates with local `getDate()/getMonth()/getFullYear()`. A real midnight date near a year boundary in a negative-UTC-offset timezone could theoretically land on `1899-12-31` UTC and be misformatted as a time. For court-listing data (no 1899 dates, server runs UTC) this is effectively unreachable, but using consistent UTC accessors throughout would remove the ambiguity. The discriminator is otherwise a safe choice.

3. **`index.ts` shows 0% coverage.**
   The lib barrel (`libs/list-types/interim-applications-chd-daily-cause-list/src/index.ts`) is re-exports plus the side-effect converter import; tests import from relative paths, so it registers 0%. Overall lib statements are 93.87%, so this is cosmetic — but a single import-the-barrel smoke test would both lift the number and assert the side-effect registration actually happens via the public entry point.

4. **Redundant `role="table"` and `aria-label` on a native `<table>`.**
   `interim-applications-chd-daily-cause-list.njk:40` sets `role="table"` on a `<table>` (redundant) and an `aria-label` equal to the page `<h1>`. Native semantics already convey the role; consider dropping `role` and using `aria-labelledby` pointing at the h1 (or a `<caption>`) to avoid duplicating the title for screen-reader users.

5. **`email` schema property has no `format`/email check (matches upstream).**
   Documented as intentional (byte-for-byte port of pip-data-management), so acceptable. Worth a one-line comment in the schema or validator noting the deliberate omission so a future contributor doesn't "fix" it and diverge from upstream.

## ✅ Positive Feedback

- **Shared `excel-to-json.ts` fix is exactly right and well-tested.** The 1899-epoch time formatting and `normalizeCellValue` (hyperlink/richText/formula/text extraction) fix a real upload failure (Time cell rendering as `30/12/1899`, mailto email cell rendering as `[object Object]`). The added tests (`excel-to-json.test.ts`) cover time-with-minutes, on-the-hour, hyperlink, richText, and — crucially — a regression test proving genuine calendar dates still format as `dd/MM/yyyy`. This directly de-risks the cross-cutting change.
- **`listTypeName` used everywhere, `listTypeId` never.** The guard keys on the string name (`index.ts:20`), and the controller test deliberately uses `listTypeId: 999` to prove ID-independence — exactly per CLAUDE.md.
- **Validator tests are exemplary:** real schema execution (no mocks), one `it` per required field at both nesting levels, deep-cloned fixtures, plus empty-array, bad-time and HTML-tag cases.
- **Full, real Welsh translation** in `cy.ts` (not placeholders), with locale-key parity and table-header-key parity asserted in the template test.
- **CLAUDE.md structure and naming followed precisely** — lib layout, `config.ts` exports, `schemaPath`, co-located tests, kebab-case files, singular schema, side-effect converter import on both upload pages, workspace deps added to all three consumers.
- **PDF template correctly auto-escapes** all data fields, and the PDF generator uses the standard `createPdfErrorResult` failure path.

## Test Coverage Assessment

- **Unit tests:** Strong. Validator (16 tests, per-field + empty-array + bad-time + HTML), converter (registration, config shape, two-tab conversion, Excel-native time/hyperlink cells, malformed time, HTML rejection, empty Tab 2), renderer (editable paragraph, per-upload judge change, empty fallback, Welsh), PDF generator (success, failure, render options), controller (400/404/400-guard/400-invalid/500/Welsh). Well structured and realistic.
- **Template tests:** Structural Cheerio assertions on header, FaCT link, important-info block (both editable and fallback), search input + visually-hidden label, table header order, per-column cell placement, empty state, footer, back-to-top, and Welsh rendering. Locale-key and table-header-key parity asserted.
- **E2E tests:** Intentionally **not added** (known infra gap — the non-strategic upload journey is SSO-gated and the `test-support/artefacts` API cannot seed a JSON blob to drive a view-render E2E). Documented in `tasks.md`. Acceptable given the constraint; unit + template tests provide the functional coverage. Should be revisited once E2E blob seeding exists.
- **Accessibility tests:** No automated axe run for this page (tied to the E2E gap). The template test covers semantic structure and the visually-hidden search label, but there is no axe assertion. Note as a follow-up alongside E2E.

Statement coverage per changed workspace (all ≥80%, no flags):

| Workspace | Statements |
|-----------|-----------|
| `@hmcts/interim-applications-chd-daily-cause-list` | 93.87% |
| `@hmcts/list-types-common` | 87.94% |
| `@hmcts/notifications` | 90.57% |
| `@hmcts/publication` | 95.34% |
| `@hmcts/web` | 95.74% |

## Acceptance Criteria Verification

### Source 1 — Description "ACCEPTANCE CRITERIA" (ticket.md lines 21-28)

- [x] List created under Business and Property Courts Rolls Building, linked to Civil jurisdiction and Royal Courts of Justice Group region — `libs/list-types/common/src/list-type-data.ts:801-811` (`subJurisdictionIds: [10]`); `libs/location/src/location-data.ts:189-192` (location "Business and Property Courts Rolls Building", `regions: [11]`, `subJurisdictions: [10]`); subJurisdiction 10 = "High Court" → `jurisdictionId: 1` = "Civil" (`location-data.ts:347-351`, `271-274`).
- [x] Published through Excel upload route, converted to JSON — converter registered `libs/list-types/interim-applications-chd-daily-cause-list/src/conversion/interim-applications-chd-daily-cause-list-config.ts:62`; side-effect imports `apps/web/src/pages/(admin)/non-strategic-upload/index.ts:10` and `.../non-strategic-upload-summary/index.ts:10`.
- [x] Excel with 2 tabs; Tab 1 fields Judge/Time/Venue/Type/Case Number/Case Name/Additional Information; Tab 2 editable judge name + email — `interim-applications-chd-daily-cause-list-config.ts:11-53`; editable first paragraph built per upload in `renderer.ts:29-37`.
- [x] Validation schema and style guide created — `libs/list-types/interim-applications-chd-daily-cause-list/src/schemas/interim-applications-chd-daily-cause-list.json`; validator `src/validation/json-validator.ts:4-6`; template `apps/web/.../interim-applications-chd-daily-cause-list.njk`.
- [x] PDF downloadable version created (Excel descoped — not required for now) — PDF: `src/pdf/pdf-generator.ts:24` + registry `libs/publication/src/processing/service.ts:190-191`. Excel download not required at this time per product decision.
- [x] Style guide adopts the staging format — template renders h1, FaCT link, venue/address, list date, editable important-info block, Search Cases, hearings table, data source, back-to-top (`interim-applications-chd-daily-cause-list.njk:8-78`).
- [x] JSON follows pip-data-management format (`hearingList[]` + `openJusticeStatementDetails[]`) — schema ported verbatim, keys match (`schemas/interim-applications-chd-daily-cause-list.json:5-88`); types in `src/models/types.ts:1-19`.
- [x] Sample Excel template attached — attachment on the issue; no code deliverable.

### Source 2 — Tech-spec "3. Acceptance Criteria" Given/When/Then (ticket.md lines 75-108)

- [x] List type registered under correct hierarchy, `isNonStrategic: true` — `list-type-data.ts:801-811` (`isNonStrategic: true`, `subJurisdictionIds: [10]`, location 26 region 11).
- [x] Publisher uploads two-tab Excel → converted, validated, stored — converter `interim-applications-chd-daily-cause-list-config.ts:49-62`; validator wired through `createSimpleListTypeHandler` (`apps/web/.../index.ts:14-17`); storage via existing upload flow.
- [x] Judge name/email editable per upload with no code change — `renderer.ts:29-37`; asserted in `renderer.test.ts:47-55` ("should reflect a different judge name and email per upload").
- [x] Rendered publication matches style guide (hearings table, Important information, case search) — `interim-applications-chd-daily-cause-list.njk:23-72`; template test `interim-applications-chd-daily-cause-list.njk.test.ts:144-219`.
- [x] Downloads available (PDF) — PDF verified (registry + generator + test). Excel download descoped — not required for now per product decision.
- [x] Invalid upload rejected with clear, row-referenced error, no artefact — `excel-to-json.ts:143-151` wraps errors as `Error in row N: ...`; `validateTimeFormatSimple`/`validateNoHtmlTags` throw with field + row; converter tests `interim-applications-chd-daily-cause-list-config.test.ts:120-136`.
- [x] Welsh language support (`?lng=cy`) — full `cy.ts`; controller selects locale (`index.ts:32`); template test `interim-applications-chd-daily-cause-list.njk.test.ts:239-255`.

## Next Steps

- [ ] Consider aligning the converter time validator with the stricter schema pattern (Suggestion 1).
- [ ] Optionally add a barrel smoke test to cover `index.ts` and assert converter registration (Suggestion 3).
- [ ] Follow-up: add the E2E happy-path journey + inline axe check once E2E JSON-blob seeding is available.

## Overall Assessment

**APPROVED**

No critical issues, no high-priority issues, and no unmet acceptance criteria; every changed workspace exceeds 80% statement coverage. The two items originally raised as HIGH PRIORITY are resolved: the `govukDetails` `html:` rendering follows the established sibling pattern and its two user-derived fields are double-sanitised (converter + schema no-HTML validation), and the Excel download is descoped (not required for now) so PDF-only satisfies the download requirement. The shared `excel-to-json.ts` change is well-scoped, well-tested, and safe for existing list types. Strong, pattern-consistent work — ready to commit.
