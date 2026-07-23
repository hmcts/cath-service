# Code Review: Issue #438

## Summary

Issue #438 adds the **PCOL Daily Cause List** (`PCOL_DAILY_CAUSE_LIST`) as a new flat-file
list type. As confirmed in the plan, this is a pure reference-data/seed change: no JSON
schema, validator, converter, PDF generator, page, or locale files are required for a
flat-file list, and their absence is correct and expected.

The change touches the three files that must stay in sync:

- `libs/list-types/common/src/list-type-data.ts` (lines 84-93) — TS seed data
- `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` (line 14) — prod list-type row
- `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` (lines 75-76) — Civil Court link

The three files are fully consistent, SQL comma/`ON CONFLICT` placement is correct, and the
change keys everything on the stable string `name` (never a numeric `listTypeId`), fully
complying with CLAUDE.md. Statement coverage for the only changed code workspace
(`@hmcts/list-types-common`) is 87.68%, above the 80% threshold.

Counts: 0 CRITICAL, 0 HIGH PRIORITY, 2 SUGGESTIONS.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **No automated consistency guard between the TS data and the two SQL scripts.**
   The three files are hand-synced today. A drift (e.g. someone edits `list-type-data.ts`
   but forgets script 001/003) would only surface at prod seed time. Consider a small test
   asserting that every `listTypeData` entry has a matching row in the SQL scripts (or a
   generator that emits the SQL from `listTypeData`). Not required for this change — the
   three files are correct — but it would remove a recurring class of merge risk.
   Reference: `libs/list-types/common/src/list-type-data.ts` vs
   `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql:5-74`.

2. **Manual QA tasks remain unverified (`docs/tickets/438/tasks.md:9-10`).**
   Two acceptance-relevant checks are marked as outstanding manual steps: confirming the
   dropdown label/strategic placement/sensitivity pre-fill in `/manual-upload`, and
   confirming a PDF publishes/views via `/hearing-lists/{locationId}/{id}`. The code changes
   put the mechanism in place, but these runtime confirmations should be executed against a
   local DB before release.

## ✅ Positive Feedback

- **Full three-file consistency.** `name`, English friendly name
  (`Possession Claim Online Daily Cause List`), Welsh friendly name
  (`Rhestr Achosion Dyddiol Hawliadau Meddiant Ar-lein`), shortened name
  (`PCOL Daily Cause List`), `Public` sensitivity, `CFT_IDAM` provenance, `isNonStrategic:false`,
  and Civil Court (`subJurisdictionId 1`) all match exactly across the TS data
  (`list-type-data.ts:84-93`), script 001 (`:14`), and script 003 (`:75-76`).
- **Welsh friendly name matches the ticket verbatim** and is identical in TS and SQL — no
  `[WELSH TRANSLATION REQUIRED]` placeholder, sourced from the ticket/pip-frontend.
- **Correct `listTypeName`-only keying.** No numeric `listTypeId` is referenced anywhere;
  script 003 joins on `lt.name = mapping.list_type_name` and the TS entry keys on `name`,
  fully compliant with the CLAUDE.md stable-name rule.
- **SQL is syntactically safe and idempotent.** The new row in 001 sits mid-list (line 14)
  with correct leading/trailing commas; the closing row (line 65) still has no trailing comma
  before `ON CONFLICT (name) DO UPDATE`. Script 003's new mapping (line 76) is likewise
  mid-list with a trailing comma, leaving the final `UT_ADMINISTRATIVE_APPEALS_CHAMBER...`
  row (line 178) comma-free before `) AS mapping(...)`. Column order in 001 matches the
  `INSERT` header. Both scripts remain idempotent (`DO UPDATE` / `DO NOTHING`).
- **Correct flat-file modelling.** `urlPath` is omitted in TS and `url` is `''` in SQL, so the
  publication uses the generic flat-file route rather than a non-existent rendering page —
  matching the "no JSON schema / no style guide" requirement.
- **Type safety.** The new entry satisfies the `ListTypeData` interface
  (`list-type-data.ts:1-11`) with no `any`, no assertions, and correct optional-field usage.

## Test Coverage Assessment

| Workspace | Unit | E2E | Accessibility | Statement Coverage |
|---|---|---|---|---|
| `@hmcts/list-types-common` | Existing suite passes (248 tests, 16 files) | N/A (data-only) | N/A | **87.68%** ✅ |
| `apps/postgres` (SQL scripts) | N/A — plain SQL seed scripts, no unit test harness | N/A | N/A | N/A |

- `list-type-data.ts` is a pure data array with no executable logic; it does not appear as a
  separately measured file in the v8 report and needs no dedicated test. Consistency with the
  SQL scripts is verified manually in this review.
- E2E: no PCOL-specific journey was added. Per the plan and CLAUDE.md E2E guidance
  (minimise test count; existing manual-upload journey covers the flow), this is acceptable.
- Accessibility: no UI/template change, so no a11y testing applies to this change.
- The full `yarn test:coverage` turbo run surfaced one unrelated failure
  (`apps/web` `src/server.test.ts` "should export server startup functionality" — a 5s
  import timeout), which is not related to this change. Scoped coverage was therefore run
  directly in `libs/list-types/common` via `yarn vitest run --coverage`.

## Acceptance Criteria Verification

- [x] **The PCOL Daily Cause List is created and linked to the Civil jurisdiction; in the manual upload form the list name is displayed as "PCOL Daily Cause List".**
  Data created in `list-type-data.ts:84-93` with `subJurisdictionIds: [1]` (Civil Court) and
  `shortenedFriendlyName: "PCOL Daily Cause List"`; prod rows in
  `001_insert_missing_list_types.sql:14` and Civil link in
  `003_upsert_sub_jurisdictions_and_list_type_links.sql:75-76`. The manual-upload dropdown
  uses `shortenedFriendlyName || friendlyName || name` (pre-existing, proven for sibling
  Civil lists). Runtime UI confirmation is an outstanding manual QA step
  (`tasks.md:9`) but the code change fully satisfies the criterion.

- [x] **The list is strategic (`isNonStrategic = false`).**
  `list-type-data.ts:89` (`isNonStrategic: false`) and `001_insert_missing_list_types.sql:14`
  (`... false, NOW()` in the `is_non_strategic` column).

- [x] **The default sensitivity of the list is Public.**
  `list-type-data.ts:90` (`defaultSensitivity: "Public"`) and
  `001_insert_missing_list_types.sql:14` (`'Public'`).

- [x] **The list is uploaded as a flat file — no JSON schema validation and no style guide.**
  No schema/validator/converter/PDF generator/page added; `urlPath` omitted in
  `list-type-data.ts:84-93` and `url` empty (`''`) in `001_insert_missing_list_types.sql:14`,
  routing publications through the generic flat-file path.

## Next Steps

- [ ] Execute the two outstanding manual QA checks (`tasks.md:9-10`): verify PCOL appears in
  `/manual-upload` as "PCOL Daily Cause List", is strategic (absent from
  `/non-strategic-upload`), pre-fills Public sensitivity, and that a PDF publishes/views via
  `/hearing-lists/{locationId}/{id}`.
- [ ] Confirm the `00x_*.sql` scripts are executed as part of the prod release for this change
  (prod seeding is skipped by the TS seeder).
- [ ] (Optional) Consider an automated guard asserting TS ↔ SQL list-type consistency
  (Suggestion 1).

## Overall Assessment

**APPROVED**

All four acceptance criteria are fully met, the three reference-data files are internally
consistent and SQL-correct, the change complies with the CLAUDE.md `listTypeName` rule, and
the sole changed code workspace exceeds 80% statement coverage (87.68%). Remaining items are
manual QA/release verifications, not code defects.
