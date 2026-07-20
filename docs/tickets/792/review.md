# Code Review: Issue #792

## Summary

Registers `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` as a flat-file, strategic, manually-uploaded
list type (catalogue entry + prod-seed SQL + sub-jurisdiction link), and adds a standing
"held in private" notice to the summary-of-publications page, triggered when a location is
linked to the Mental Health Tribunal sub-jurisdiction.

The implementation is small, focused, and closely follows the approved plan. It correctly
follows the CLAUDE.md "resolve by stable name, never numeric id" rule in the controller,
the notice is escaped safely, types are correct, and tests cover both shown/not-shown and
English/Welsh cases with AAA structure. There are no critical or blocking code defects.

The two `[~]` items below are verification/pre-release gaps (runtime DB reseed + approved
Welsh translation), not code defects — the code is complete and unit-tested. Per the review
rubric, `[~]` ACs push the advisory verdict to NEEDS CHANGES.

Counts: 0 Critical, 1 High Priority, 3 Suggestions.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **Unconditional extra DB round-trip on every summary page load**
   `apps/web/src/pages/(public)/summary-of-publications/index.ts:124`
   - **Problem**: `getAllSubJurisdictions()` runs on *every* request to this public,
     high-traffic page, even though the resolved id is only needed for the (rare) Mental
     Health Tribunal locations. It is a single query returning the full sub-jurisdiction
     reference table (~30 rows), so it is **not** an N+1 and not a correctness problem — but
     it is an avoidable extra round-trip added to a hot path. The controller already issues
     four sequential awaits (`getLocationById`, `artefact.findMany`, `findAllListTypes`,
     `getLocationMetadataByLocationId`); this adds a fifth.
   - **Impact**: Small but real latency/DB-load cost on the busiest public page; scales with
     traffic rather than with MHT usage.
   - **Recommendation**: Sub-jurisdiction ids are static reference data seeded with fixed ids
     across all environments. Either (a) memoise the name→id lookup at module scope (resolve
     once, cache), or (b) fold the check into the existing `getLocationById` result if the
     query can cheaply return the linked sub-jurisdiction names. This keeps the stable-name
     resolution (CLAUDE.md compliant) while removing the per-request query. Non-blocking, but
     worth addressing before this page grows more logic.

## 💡 SUGGESTIONS

1. **Magic string `"Mental Health Tribunal"` in the controller**
   `apps/web/src/pages/(public)/summary-of-publications/index.ts:125`
   - **Benefit**: The sub-jurisdiction name is a load-bearing lookup key; if the seeded name
     ever diverges the notice silently stops showing (fail-safe, but silent). Extracting it
     to a named `const MENTAL_HEALTH_TRIBUNAL_SUB_JURISDICTION = "Mental Health Tribunal";`
     at the top of the module documents the coupling and matches the CLAUDE.md
     stable-name-guard convention used elsewhere.
   - **Approach**: Declare the constant at module top (per CLAUDE.md module-ordering rule)
     and reference it in the `.find(...)`.

2. **Test Arrange duplication in `list-type-data.test.ts`**
   `libs/list-types/common/src/list-type-data.test.ts:9-88`
   - **Benefit**: Every `it` repeats `listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST")`.
     A shared `const entry = ...` (or `beforeEach`) would reduce noise. Minor — the current
     form is readable and each test is well isolated, so this is optional.

3. **Welsh notice placeholder must be tracked as a pre-release TODO**
   `apps/web/src/pages/(public)/summary-of-publications/cy.ts:12`
   - **Benefit**: The `[WELSH TRANSLATION REQUIRED: ...]` placeholder is a deliberate,
     approved interim per the resolved decisions — not a code defect. Ensure a release
     checklist item exists so the approved Welsh string lands before this ships to prod;
     otherwise Welsh users will see the English-with-brackets placeholder.

## ✅ Positive Feedback

- **CLAUDE.md stable-name rule followed correctly**: the controller resolves the
  sub-jurisdiction id via `getAllSubJurisdictions()` by the stable `name` rather than
  hardcoding a numeric id in logic (`index.ts:124-126`). The `subJurisdictionIds: [20]` in
  the catalogue and SQL are fixed explicitly-seeded reference ids (consistent with every
  other entry), not autoincrement `listTypeId`s — correct interpretation of the rule.
- **Type safety is sound**: `location.subJurisdictions` is `number[]` (`model.ts:6`),
  `mentalHealthTribunalId` is `number | undefined`, and the `!== undefined` guard before
  `.includes()` (`index.ts:126`) makes the comparison type-correct with no `any`.
- **Safe escaping / correct component**: `govukInsetText({ text: mentalHealthNotice })`
  (`index.njk:31`) uses the auto-escaping `text` option (not `html`), so no injection risk.
  Inset text is an appropriate GOV.UK component for a standing informational notice, placed
  logically after the caution message inside the two-thirds column.
- **Fail-safe design**: if the sub-jurisdiction name is not found, `mhtId` is `undefined`
  and the notice simply does not render — no crash.
- **Good test coverage of the new branch**: `index.test.ts:721-766` covers notice shown (EN),
  notice shown (CY placeholder), and notice not shown, all AAA-structured with realistic
  mocks for `getLocationById` and `getAllSubJurisdictions`.
- **Both seed paths updated**: non-prod catalogue (`list-type-data.ts`) and prod idempotent
  SQL (`001` + `003`) are kept in sync, so STG and prod will not diverge.
- **Locale consistency test** (`index.njk.test.ts:74-76`) guarantees `en`/`cy` keys stay in
  lockstep, catching a missing translation key.

## Test Coverage Assessment

- **Unit tests**: Present and good quality.
  - `list-type-data.test.ts` — 9 tests asserting every field of the new entry plus catalogue
    name-uniqueness (AAA, isolated).
  - `summary-of-publications/index.test.ts` — new "Mental Health Tribunal notice" block with
    3 realistic cases (EN shown, CY shown, not-shown).
  - `summary-of-publications/index.njk.test.ts` — asserts EN notice text and CY placeholder
    presence + locale key parity.
- **E2E tests**: None added. Acceptable for this change — the notice is exercised by unit
  tests, and adding a full Playwright journey would require a seeded MHT location. Consider
  folding a notice assertion into an existing summary-of-publications journey if one exists.
- **Accessibility tests**: None added specifically; `govukInsetText` is a standard accessible
  GOV.UK component and the page-level a11y is covered by existing tooling.

**Statement coverage per changed workspace:**

| Workspace | Changed file | Stmt coverage | Notes |
|---|---|---|---|
| `@hmcts/list-types-common` | `src/list-type-data.ts` | ~100% (pure data array, imported + asserted) | Full-suite coverage run hits the known pre-existing `@hmcts/pht-weekly-hearing-list` import failure (unrelated to #792); scoped test run passes 9/9. |
| `@hmcts/web` | `src/pages/(public)/summary-of-publications/index.ts` | **100% stmts / 94.44% branch** | Uncovered branch lines 11 (`res.locals.locale \|\| "en"`) and 64 (list-type name fallback) are **pre-existing**, not introduced by this change. New notice logic (lines 121-137) is fully covered. |

Both changed workspaces are well above the 80% threshold. No ⚠️ coverage flag.

## Acceptance Criteria Verification

- [~] **AC1 — List created, linked to Tribunal jurisdiction + National region, shown as
  "Mental Health Tribunal Daily Hearing List" in the manual upload form.**
  Code is fully present: catalogue entry `list-type-data.ts:94-103`; prod insert
  `001_insert_missing_list_types.sql:15`; sub-jurisdiction link (MHT = 20, under Tribunal
  jurisdiction) `003_upsert_sub_jurisdictions_and_list_type_links.sql:77-78`. The manual
  upload dropdown auto-populates from `findStrategicListTypes()` using `shortenedFriendlyName`
  (`apps/web/src/pages/(admin)/manual-upload/index.ts:12,17`), so the label displays
  correctly with no controller change. Region "National" is a location-level attribute (per
  resolved decision — no list-type change). **Runtime-unverified**: confirming the dropdown
  entry and default sensitivity requires a live DB reseed + browser, not possible headless.

- [x] **AC2 — Strategic (`isNonStrategic = false`).**
  `list-type-data.ts:100` (`isNonStrategic: false`), SQL `false` column
  `001_insert_missing_list_types.sql:15`, asserted `list-type-data.test.ts:15-24`.

- [x] **AC3 — Default sensitivity Public.**
  `list-type-data.ts:99` (`defaultSensitivity: "Public"`), SQL `'Public'`
  `001_insert_missing_list_types.sql:15`, asserted `list-type-data.test.ts:26-35`.

- [x] **AC4 — Flat file, no JSON schema, no style guide.**
  No schema/validator/converter/PDF/list page was created (correct for a flat-file type per
  the resolved decision). Confirmed by absence and by the catalogue entry omitting `urlPath`
  (`list-type-data.ts:94-103`; asserted `list-type-data.test.ts:83-92`). The CLAUDE.md
  "every schema needs a validator" guard does not apply as there is no schema.

- [~] **AC5 — Summary-of-publications notice (EN + CY).**
  Logic fully present and unit-tested: EN copy `en.ts:12`, CY placeholder `cy.ts:12`,
  controller trigger `index.ts:124-137`, `govukInsetText` block `index.njk:30-32`, tests
  `index.test.ts:721-766`. Two gaps keep this partial: (1) the Welsh string is an
  approved-interim `[WELSH TRANSLATION REQUIRED: ...]` placeholder pending final translation
  (pre-release TODO, not a defect); (2) live render at `?lng=cy` on a seeded MHT location is
  runtime-unverified headless. Trigger = location linked to the MHT sub-jurisdiction, per the
  resolved decision.

## Next Steps

- [ ] (High) Memoise or otherwise avoid the per-request `getAllSubJurisdictions()` call on
      the summary-of-publications hot path (`index.ts:124`).
- [ ] (Suggestion) Extract `"Mental Health Tribunal"` to a named module-scope constant
      (`index.ts:125`).
- [ ] (Pre-release) Replace the Welsh notice placeholder with the approved translation
      (`cy.ts:12`).
- [ ] (Verification) Reseed a local/STG DB, confirm the list appears in `/manual-upload` as
      "Mental Health Tribunal Daily Hearing List" defaulting to Public sensitivity (AC1), and
      confirm the notice renders in EN and `?lng=cy` on an MHT location's summary page (AC5).

## Overall Assessment

**NEEDS CHANGES** (advisory).

The code is complete, correct, type-safe, secure, and well-tested — there are no blocking
code defects and coverage on both changed workspaces exceeds 80%. The verdict is driven
solely by the two `[~]` acceptance criteria (AC1, AC5), which are outstanding due to
runtime verification that is impossible headless and the pending approved Welsh translation —
not because of code problems. Once the Welsh string is finalised and the AC1/AC5 runtime
checks are performed on a seeded environment (and, ideally, the extra reference-data query is
memoised), this is ready to approve.
