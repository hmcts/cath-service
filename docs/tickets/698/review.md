# Code Review: #698 — Add/Update provenance for all lists

## Summary

Provenance-data + representation-hardening work. The change:

- Retypes `ListTypeData.provenance` from `string` → `string[]` and converts all 78 entries to array literals (`libs/list-types/common/src/list-type-data.ts`).
- Introduces a single delimiter/known-set module `libs/list-types/common/src/user-provenance.ts` (`USER_PROVENANCES`, `PUBLISHER_PROVENANCES`, `formatProvenance`, `parseProvenance`) exported both from the barrel and via a dedicated `./user-provenance` package subpath.
- Fixes the 5 data mismatches (4 magistrates adult-court lists gain `PI_AAD`; `PHT_WEEKLY_HEARING_LIST` `MANUAL_UPLOAD` → `CFT_IDAM`, sign-off recorded as granted).
- Routes both seed paths, the authorisation check, the sjp-press-list middleware, the System Admin queries/validation and the add/edit controllers through the shared module.
- Adds a parity test against the 102-entry `reference-list-types.json`, unit tests for the module, and authorisation spaced-row cases.
- Widens `list_types.allowed_provenance` `VARCHAR(50)` → `VARCHAR(255)` (catalog-only `ALTER`).

The implementation matches the plan closely and is high quality. No critical issues. Two testing-infrastructure gaps are worth addressing but do not affect the acceptance criteria, which are all met, or coverage, which is above 80% on every changed workspace.

---

## 🚨 CRITICAL Issues

None.

---

## ⚠️ HIGH PRIORITY Issues

### 1. The modified postgres seed test is never executed in CI
`apps/postgres/prisma/generate-seed-sql.test.ts` was updated in this PR (provenance arrays), and it passes when invoked directly (`vitest run prisma/generate-seed-sql.test.ts` → 12 passed). But `apps/postgres/package.json:13` defines:
```
"test": "echo 'No tests for migration runner'"
```
So the seed-SQL generator — the production deploy path that now calls `formatProvenance(lt.provenance)` (`apps/postgres/prisma/generate-seed-sql.ts:134`) — has **no CI-enforced test**. A regression in the generated `allowed_provenance` column would not be caught by `yarn test`. This is a pre-existing wiring gap, not introduced here, but this ticket adds behaviour to that exact path and relies on the test. Recommend wiring the postgres workspace `test` script to `vitest run`.

### 2. The changed sjp-press-list authorisation middleware has no direct unit test
`apps/web/src/pages/(list-types)/sjp-press-list/require-verified-with-provenance.ts` is a security-relevant authorisation gate and was modified (line 31, `.split(",")` → `parseProvenance(...)`). There is no co-located `*.test.ts` and no other test references `createRequireVerifiedWithProvenance`. The new `!dbListType || ...` guard is behaviourally safer than the old optional-chain (a null list type now redirects rather than throwing), and `parseProvenance` is unit-tested in isolation, so risk is low — but an authorisation path changing with zero direct coverage should be tested. Add a small test covering: not-verified redirect, unknown artefact redirect, provenance-mismatch redirect, and provenance-match `next()`.

---

## 💡 SUGGESTIONS

1. **`as never` cast in `validation.ts:77`** — `PUBLISHER_PROVENANCES.includes(provenance as never)` works but is a smell. Since the input is already `string[]`, `(PUBLISHER_PROVENANCES as readonly string[]).includes(provenance)` mirrors the pattern already used inside `formatProvenance` (`user-provenance.ts:12`) and reads more honestly. Minor.

2. **Duplicated `buildProvenanceOptions` helper** — identical functions exist in `add-list-type/index.ts:11` and `edit-list-type/index.ts:11`. Small and page-local, so acceptable under YAGNI, but if a third caller appears it should move beside `PUBLISHER_PROVENANCES` in the shared module.

3. **Parity test AC caveat is documented but not asserted** — the "nothing outside the seed handles the delimited form" AC is satisfied in intent (only the module touches the delimiter). A cheap guard test that greps the repo for stray `.split(",")`/`.join(",")` on provenance would lock this in against future regressions, the way the list-type schema guard test does. Optional.

---

## ✅ Positive Feedback

- **Delimiter genuinely centralised.** Grep confirms no stray `.split(",")`/`.join(",")` on provenance outside `user-provenance.ts`. The remaining `.join(", ")` hits in `reference-data-upload/validation.ts` and `blob-ingestion/validation.ts` are error-message strings for the unrelated location-reference/artefact-provenance concepts, correctly left untouched.
- **The subpath-import discipline is respected** — both seed paths import from `@hmcts/list-types-common/user-provenance` (not the barrel), preserving the nunjucks/exceljs-free footprint of the postgres deploy image. This is easy to get wrong and was done right (`generate-seed-sql.ts:7`, `seed-list-types.ts:5`).
- **Authorisation change is behaviour-preserving.** `parseProvenance` is equivalent to `.split(",")` for delimiter-free values and strictly widens matching only for legacy spaced rows. The two new spaced-row tests (`service.test.ts:203`, `:209`) prove the trim fix without changing any unchanged-list behaviour.
- **The parity test is well-structured** — `NAME_ALIASES` (19), `KNOWN_GAPS` (22 real + 3 deprecated-superseded), `ALLOWED_DIVERGENCES` empty (PHT signed off to `CFT_IDAM`), and it reads arrays directly so the type change is validated end-to-end. `reference-list-types.json` confirmed at 102 entries with 6 deprecated, matching the plan.
- **Type safety maintained** — no new `any`; `provenance: string[]` is properly propagated; typecheck and biome both clean on changed files.
- **System Admin forms did not regress** — checkbox `items` now driven by `provenanceOptions` from `PUBLISHER_PROVENANCES` inside the existing `govukCheckboxes` macro (`add-list-type/index.njk:100`, `edit-list-type/index.njk:100`); fieldset/legend/hint/error wiring unchanged, so GOV.UK structure and a11y are preserved. Multi-select round-trip is covered by new controller tests.
- **Migration is catalog-only** as claimed (`ALTER COLUMN ... TYPE VARCHAR(255)`), no table rewrite, matches `location.prisma:54`.

---

## Test Coverage Assessment

Per-workspace statement coverage (changed workspaces):

| Workspace | Statements | Flag |
|---|---|---|
| `@hmcts/list-types-common` | 87.84% (477/543) | ✅ |
| `@hmcts/publication` | 95.41% (416/436) | ✅ |
| `@hmcts/location` | 92.55% (199/215) | ✅ |
| `@hmcts/system-admin-pages` | 93.04% (1177/1265) | ✅ |
| `@hmcts/web` (changed pages only) | 97.82% (90/92); add-list-type 100%, edit-list-type 96.49% | ✅ |
| `@hmcts/postgres` | No coverage config; `test` script is `echo` (see HIGH PRIORITY #1) | ⚠️ |

All changed workspaces with a real test suite are above 80%.

**Full `yarn test:coverage`** produced 4 web failures across 2 files — `app.test.ts` ("should create an Express application" + 2 siblings) and `remove-list-search-results/index.test.ts`. All four are `Test timed out in 5000ms` errors under full-suite coverage load. Re-run in isolation: **20/20 passed**. Confirmed environmental (import/transform contention during coverage instrumentation), not a regression — and neither file is touched by this ticket. The web `remove-list-search-results` timeout is the same class as the known flaky `app.test.ts` hook-timeout noted in the task.

---

## Acceptance Criteria Verification

- [x] **`ListTypeData.provenance` is `string[]`, and every entry in `list-type-data.ts` declares its provenances as a list.** — Interface at `libs/list-types/common/src/list-type-data.ts:5`; all 78 entries converted to array literals (e.g. `:353`, `:920`); parity test reads them as arrays.
- [x] **The seed joins the list into `list_types.allowed_provenance`; nothing outside the seed handles the delimited form.** — `formatProvenance` used in both seed paths (`apps/postgres/prisma/generate-seed-sql.ts:134`, `libs/location/src/seed-list-types.ts:49,58`). Delimiter is owned solely by `libs/list-types/common/src/user-provenance.ts:10-24`; grep confirms no caller does raw split/join. Note: the authorisation read (`service.ts:35`) and edit read (`edit-list-type/index.ts:44`) must parse the still-delimited column, but do so via `parseProvenance` — no caller handles the raw delimiter, which satisfies the AC intent (documented in plan §"AC caveat").
- [x] **The four `MAGISTRATES_*_ADULT_COURT_LIST_*` types allow both `CRIME_IDAM` and `PI_AAD`.** — `list-type-data.ts:920,929,938,947`; asserted in parity test `list-type-data.parity.test.ts:110-123`.
- [x] **Provenance values are validated against a known set; an unrecognised value fails at build or seed time rather than silently denying access.** — `formatProvenance` throws on any value outside `USER_PROVENANCES` (`user-provenance.ts:10-16`), and runs in both seed paths; tested `user-provenance.test.ts:27,35`.
- [x] **Whitespace around the delimiter cannot break matching — either by trimming on read, or by never producing it.** — Both: `formatProvenance` never emits spaces (array join, `user-provenance.ts:16`) and `parseProvenance` trims on read (`:22`). Proven by `user-provenance.test.ts:56` and authorisation spaced-row cases `service.test.ts:203,209`.
- [x] **A test asserts, for every list type, that its declared provenances match the shared model, or that the divergence is explicitly recorded with a reason.** — `list-type-data.parity.test.ts:84-108` iterates every entry against `reference-list-types.json` (post-`NAME_ALIASES`), with `ALLOWED_DIVERGENCES` for recorded exceptions (currently empty).
- [x] **The provenance for all lists in CaTH can be added/updated through the System Admin dashboard, for multiple provenances per list.** — Checkboxes driven from `PUBLISHER_PROVENANCES` (`add-list-type/index.ts:11,23`, `edit-list-type/index.ts:11`), persisted via `formatProvenance` (`queries.ts:120,143,171`); multi-select round-trip tested (`add-list-type/index.test.ts:146`, `edit-list-type/index.test.ts:80`).
- [x] **Existing publisher authorisation is unchanged for every list type whose provenance set is unchanged.** — `parseProvenance` is behaviour-equivalent to `.split(",")` for delimiter-free values (`service.ts:35`); the pre-existing authorisation suite still passes (392 tests), including unchanged classified/provenance cases.

**Tally: 8 met / 0 partial / 0 unmet.**

---

## Next Steps

- [ ] Wire `apps/postgres` `test` script to `vitest run` so `generate-seed-sql.test.ts` runs in CI (HIGH PRIORITY #1).
- [ ] Add a unit test for `require-verified-with-provenance.ts` covering the four branches (HIGH PRIORITY #2).
- [ ] (Optional) Drop the `as never` cast in `validation.ts:77`.
- [ ] (Optional) Add a grep-guard test to lock in delimiter centralisation.
- [ ] The 4 web coverage-run timeouts are environmental (pass 20/20 in isolation) — no action, but worth raising the coverage-run `testTimeout` to reduce flake noise.

---

## Overall Assessment

**APPROVED.**

All 8 acceptance criteria are fully met with cited code/test evidence, every changed workspace with a test suite is above 80% statements, the delimiter is genuinely centralised, and the authorisation change cannot broaden or break matching for unchanged list types. The two HIGH PRIORITY items are testing-infrastructure gaps (postgres test not wired to CI; sjp middleware lacks a direct test) rather than defects in the shipped logic — they should be addressed as fast follow-ups but do not block this work.
