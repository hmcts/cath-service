# Code Review: Issue #1110

## Summary

This change only touches content. It replaces the summary-of-publications empty-state message in English and Welsh, updates the Welsh translations catalogue, and adjusts the unit, template and E2E tests. Six files changed (+20 / -6). No markup, controller logic, schema or dependency changes.

- EN (`en.ts:4`): `There are no lists available for this court or tribunal today.`. Matches the confirmed copy exactly.
- CY (`cy.ts:4`): `Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw.`. Matches the confirmed copy exactly, with the curly apostrophe U+2019 (checked at byte level) and a trailing full stop.
- en/cy keys match: only one value changed per file, and the parity test passes (`index.njk.test.ts`, "Locale consistency").
- No old strings are left: a grep for `no lists found for this court` and `nid ydym wedi dod o hyd i unrhyw restrau` across `apps`, `libs`, `e2e-tests` and `templates` (excluding `dist`/`node_modules`) returns nothing.
- Catalogue JSON parses (1148 keys). The new key sits in alphabetical order, between `The verification has failed, please try again.` and `There are no matching results.`.
- All tasks in `tasks.md` are ticked, and the diff confirms each one.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **The controller "empty state" unit tests do not use an empty state.** `apps/web/src/pages/(public)/summary-of-publications/index.test.ts:206-214` (existing) and `:260-268` (new)
   - **Problem**: Both tests use `locationId: "1"`, but the default `prisma.artefact.findMany` mock (`index.test.ts:42`) ignores the `where` clause and always returns the two location-9 artefacts. So `publications` is not empty. The controller also passes `noPublicationsMessage` on every render (`index.ts:138`), whatever the publications. The test names say "when no publications found", but the tests only check which locale was picked (en vs cy). That check still has value: the new cy test would fail if the controller fell back to `en`.
   - **Approach**: Add `vi.mocked(prisma.artefact.findMany).mockResolvedValueOnce([])` and assert `renderCall.publications` is empty, or rename the tests, e.g. "should pass the Welsh no-publications message when locale is cy". The template tests already cover the real empty-branch rendering (`index.njk.test.ts:68-74`, `:168-177`).

2. **No unit test pins the new copy.** `index.test.ts:213`, `:267`, and every template assertion compare against `en.noPublicationsMessage` / `cy.noPublicationsMessage`. They would pass with any string, so they are tautological about the copy itself. Only the E2E tests (`e2e-tests/tests/summary-of-publications.spec.ts:338`, `:472`) pin the approved wording, and the Welsh one is `@nightly`, so it is not in the default PR run. Using the locale constants is the right pattern in general. Since this ticket exists to change the copy, consider one cheap literal assertion, such as `expect(en.noPublicationsMessage).toBe("There are no lists available for this court or tribunal today.")` plus the Welsh equivalent. That would catch a regression on every unit run, including an accidental straight apostrophe in `na’r`.

3. **Out of scope, worth raising with the Service Manager.** As the plan notes (`plan.md` §5 items 3 and 5), the per-venue `noListMessage` / `welshNoListMessage` set by admins in `location_metadata` overrides this default (`index.njk:52-56`). Those messages may still use the old "Sorry… court" wording. Consider a follow-up ticket to audit them.

## ✅ Positive Feedback

- The change is minimal and precise. Only the locale values changed, so there is no markup or accessibility risk. The message is still plain `govuk-body` text, not an error.
- The new template assertions mean something. In the error-state test, `index.njk.test.ts:164` checks the `{% elif not error %}` branch suppression. In the Welsh render test, `:176` checks that the English text does not leak.
- A new Welsh-locale controller test (`index.test.ts:260-268`) fills a gap in locale-selection coverage.
- The E2E tests now use exact, case-sensitive string matches instead of loose case-insensitive regexes. This pins the curly apostrophe in the real rendered page.
- The catalogue was updated: the stale pair was removed and the new pair inserted in alphabetical order.
- Relative imports use `.js` extensions, and the imports are in sorted order (`index.test.ts:3-4`).

## Test Coverage Assessment

- **Unit tests**: The controller and template suites for summary-of-publications pass (49 tests). The updated EN assertion and the new CY controller test check locale selection. The template tests cover the empty, error, noListMessage, populated and Welsh states, plus en/cy key parity. See Suggestions 1 and 2 for the gaps.
- **E2E tests**: `summary-of-publications.spec.ts` gave 8 passed, 2 skipped (a pre-existing `describe.skip` CST block). The changed tests at `:338` (English empty state) and `:472` (Welsh empty state, `@nightly`) pass with exact-text assertions.
- **Accessibility tests**: The English empty-state test's existing inline axe scan (`:347-349`) passes with no new rule exclusions. The `target-size`/`link-name` exclusions were already there. The Welsh empty-state test has no axe scan (also pre-existing). The markup is identical, so the risk is low.
- **Statement coverage per changed workspace**:
  - `apps/web`: **95.57%** statements (above 80%)
  - `e2e-tests`, `templates`: no unit-testable source changed (test specs and a JSON reference file only)

## Acceptance Criteria Verification

Verbatim from the ticket Description:

> The ‘no published lists’ message is updated from 'Sorry, no lists found for this court' to ‘There are no lists available for this court or tribunal today.’
>
> **Welsh translation:** There are no lists available for this court or tribunal today - Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw

- [x] The ‘no published lists’ message is updated from 'Sorry, no lists found for this court' to ‘There are no lists available for this court or tribunal today.’
  - `apps/web/src/pages/(public)/summary-of-publications/en.ts:4`, rendered via `index.ts:138` and `index.njk:55`. Verified end to end by `e2e-tests/tests/summary-of-publications.spec.ts:338`. No remaining references to the old string (grep clean; catalogue entry removed at `templates/tech-spec-references/welsh-translations-catalogue.json`).
- [x] Welsh translation: Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw
  - `apps/web/src/pages/(public)/summary-of-publications/cy.ts:4`, with the user-confirmed trailing full stop and curly U+2019 apostrophe. Verified by `e2e-tests/tests/summary-of-publications.spec.ts:472`, `index.test.ts:267` and `index.njk.test.ts:175-176`. Catalogue pair added at `welsh-translations-catalogue.json:395`.

Tally: 2 met, 0 partial, 0 not met.

## Next Steps

- [ ] Optional: make the controller empty-state tests use an actual empty `findMany` result, or rename them (Suggestion 1)
- [ ] Optional: add literal copy assertions for EN and CY (Suggestion 2)
- [ ] Optional: raise a follow-up to audit admin-configured `noListMessage` content (Suggestion 3)

## Overall Assessment

**APPROVED**

The copy matches the approved English and the confirmed Welsh exactly. The en/cy keys match, no stale strings remain, the catalogue is valid and in order, and all tests pass with apps/web at 95.57% statement coverage. The suggestions are optional test-quality improvements and do not block merge.

## Follow-up (2026-10-14)
- Suggestion 1 — RESOLVED: both controller empty-state tests (`index.test.ts`, English and Welsh) now mock `prisma.artefact.findMany` to return `[]` and assert `publications` is empty, so they genuinely exercise the empty state.
- Suggestion 2 — RESOLVED: the same tests now assert the approved English and Welsh copy as literals, so a wording regression fails on every unit run, not only in the (nightly) E2E.
- Suggestion 3 — not actioned; separate ticket.
