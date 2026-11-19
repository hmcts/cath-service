# Code Review: Issue #1190

## Summary

The ticket work is a template-only fix in two files, each with its own tests:

- `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk`. The applicant and respondent cells now print `<party>, {{ t.legalAdvisor }}: <representative>`, with the markup copied exactly from the web template. The court house address is now built as an `addressParts` list and printed with `{% if not loop.last %}<br>{% endif %}`, so it never ends with a `<br>`.
- `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk`. The court house address is now one `<p class="govuk-body govuk-!-margin-bottom-2">` with `<br>` between the parts. The wrapper is now `div.site-header` and the `h2` has `govuk-!-margin-bottom-3`.

The implementation matches the plan and the ticket's implementation notes. It avoids `join("<br>") | safe`, so every value stays autoescaped (autoescape is on in both the PDF environment, `libs/list-types/common/src/pdf/pdf-utilities.ts:23-24`, and the web environment, `libs/web-core/src/middleware/govuk-frontend/configure-govuk.ts:31-32`). It also adds an `addressParts | length` guard so an address with every part empty produces no empty element. Biome is clean on the changed files. Both workspaces' test suites pass.

**Scope:** `git diff --name-only` now lists only the four ticket files: the two family-daily-cause-list `.njk` templates and their `.njk.test.ts` files.

The unrelated dev-environment changes found in the first review have been moved out of this change set into `stash@{0}` ("dev-env: postgres 18 volume path + azurite dev key (split from #1190)"), to be raised as a separate PR:

- the `docker-compose.yml` postgres volume path change
- the `apps/web/.env.example` Azurite key change

Both were checked and are correct.

Notes for that separate PR (not issues on this one):

- **Make the same change in `libs/auth/docker-compose.yml`.** Lines 3 and 12 still use `postgres:18` with the old `/var/lib/postgresql/data` mount, so the fix should be applied there too.
- **Tell developers to reset their local database.** Anyone with an existing `postgres_data` volume will get a fresh, empty database after the change. They should run `docker compose down -v` and then re-run migrations and seeds.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **`site-header` adds no styling on this page. Make its purpose explicit.**
   - `family-daily-cause-list.njk:75`: nothing in cath-service gives `.site-header` a global style. The inline `<style>` on this page (`:5-21`) does not define it either. The pip-frontend rule (`pip-frontend/src/main/assets/scss/main.scss:508-511`, `position: relative; top: 2em`) was not ported. That is fine, but it means the class does nothing visually here. The sibling templates that use it give it a style locally (`crown-daily-cause-list.njk:24-26`, `crown-firm-list.njk:24`).
   - The visible spacing now comes from `govuk-!-margin-bottom-3` on the `h2` (15px) and `govuk-!-margin-bottom-2` on the address `<p>` (10px). The spacing is consistent and uses GOV.UK spacing overrides correctly. The approved look does not depend on the class.
   - Edge case: the old wrapper gave 30px (`margin-bottom-6`) before the accordion. When every address part is empty, the accordion now follows the `h2` with a 15px gap. This is acceptable, just smaller.
   - **Approach:** either keep `site-header` purely as a test and selection hook (the tests at `family-daily-cause-list.njk.test.ts:157-159` rely on it) and add a one-line Nunjucks comment saying so, or add a `.site-header` rule to the page's inline `<style>` to match the crown templates. Also update `docs/tickets/1190/plan.md` section 2, which still says "wrapper `div.govuk-!-margin-bottom-6` stay[s]", to record the deliberate change to match pip-frontend.

2. **Assert "no trailing `<br>`" through the DOM, not a raw-HTML string.**
   - `family-daily-cause-list.njk.test.ts:310`, `pdf-template.njk.test.ts:182,190` use `.html()?.trim().endsWith("<br>")`. `.claude/rules/testing.md` says to assert on structure, not raw-HTML slices. The `br` count assertion next to each one (`toHaveLength(parts - 1)`) already proves there is no trailing break.
   - **Approach:** drop the `endsWith` lines, or replace them with a structural check such as `expect(block.find("p.govuk-body").children().last().is("br")).toBe(false)`.

3. **Add an escaping regression test.** The ticket explicitly bans `join("<br>") | safe` because of XSS, but no test pins that down.
   - **Approach:** in both template tests, render one address line and one representative containing `<script>alert(1)</script>`. Assert `$("script")` `toHaveLength(0)` inside the court-section or table, and assert that the text contains the literal string. This stops a future "simplify to `| safe`" refactor.

4. **The address-building logic is now duplicated.** The same 7-line `addressParts` block sits in `family-daily-cause-list.njk:77-83` and `pdf-template.njk:37-43`. The follow-up ticket (`docs/tickets/1190/follow-up-issue.md`) will copy it into three more templates.
   - **Approach:** for the follow-up, consider a shared macro in `libs/list-types/common` (for example `courtHouseAddress(address, pClass)`). Another option is to compute `courtHouseAddressParts` once in `daily-cause-list-common`'s renderer, so templates only loop over it.

5. **The `courtHouseAddressParts` / `addressEntries` test helpers read `.html()`.** Values come back entity-encoded (`&amp;`). That is harmless with the current fixtures, but it would surprise someone who adds an address containing `&`. Splitting each `<p>`'s `contents()` on `br` nodes and reading `.text()` would avoid it.

6. **Manual check: done.** The developer generated the PDF locally, viewed it, and confirmed that the Legal Advisor text and the court house address render correctly. They also visually approved the web page court house spacing against the legacy pip-frontend screenshot. This closes the last item in `tasks.md`, which can now be ticked without the "left to user" note. No further action needed.

## ✅ Positive Feedback

- The PDF party cells are a character-for-character copy of the web markup (`pdf-template.njk:105-114` vs `family-daily-cause-list.njk:161-170`), which was exactly the intended approach. The two outputs cannot drift in wording.
- The address is built with an escaped loop and the existing push idiom rather than `| safe`, which keeps autoescaping on.
- The new `addressParts | length` guard (`family-daily-cause-list.njk:84`, `pdf-template.njk:44`) handles the "address object present but every part empty" case that the old code turned into an empty element.
- The PDF test now follows `testing.md` well: layered `buildCase` / `buildSitting` / `buildSession` builders (`pdf-template.njk.test.ts:37-63`), a `COLUMN` constant (`:14-17`), assertions in both directions (rep on both sides, either side, neither), the empty-party error path, Welsh labels including the headers (`:253-265`), and a locale-parity check (`:268`).
- The web tests were rewritten to assert the fixed behaviour (one `p`, `br` count = parts − 1) rather than being deleted, and a new all-empty case was added (`family-daily-cause-list.njk.test.ts:326-339`).
- The sibling-template bugs were scoped out properly and written up as a ready-to-raise follow-up issue.

## Test Coverage Assessment

- **Unit tests:** template tests for both changed templates. `@hmcts/family-daily-cause-list`: 5 files, 53 tests pass. `@hmcts/web`: 380 files, 3977 tests pass (3 skipped). Every AC has at least one direct template test.
- **E2E tests:** none added. This is acceptable under CLAUDE.md: it is a fix to an existing template, not a new journey, and there is no family-daily-cause-list-specific spec to extend (family lists appear only incidentally in ingestion and notification specs).
- **Accessibility tests:** no new axe test. The change keeps semantic HTML (one `h2`, one `p`, `<br>` line breaks, the same as the existing header address at `:34-38`) and the heading hierarchy is unchanged. There is no a11y regression risk worth an E2E axe run.
- **Statement coverage per changed workspace** (measured with `npx vitest run --coverage` inside each workspace, not the whole-repo `yarn test:coverage`):
  - `@hmcts/family-daily-cause-list` (libs/list-types/family-daily-cause-list): 93.54%
  - `@hmcts/web` (apps/web): 95.58%

## Acceptance Criteria Verification

- [x] The PDF shows `Legal Advisor: <name>` after the applicant and respondent when `applicantRepresentative` / `respondentRepresentative` is set.
  - Code: `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk:105-114`.
  - Tests: `pdf-template.njk.test.ts:209`, `:219`, `:226`.
- [x] The PDF shows only the party name (no dangling `, Legal Advisor:`) when there is no representative.
  - Code: the `{% if case.applicantRepresentative %}` / `respondentRepresentative` guards at `pdf-template.njk:107,112`.
  - Tests: `pdf-template.njk.test.ts:233` (cells equal the party names, and the tbody does not contain `en.legalAdvisor`), and the one-sided cases at `:219`, `:226`.
- [x] The Welsh PDF uses the Welsh `legalAdvisor` label.
  - Code: `pdf-template.njk:107,112` (`t.legalAdvisor`), with `cy.ts:22`.
  - Test: `pdf-template.njk.test.ts:253-265`.
- [x] The court house address on the web page shows as one block, with no gap between lines.
  - Code: `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk:84-89`.
  - Test: `family-daily-cause-list.njk.test.ts:266-280` (exactly one `p.govuk-body`, 5 parts, 4 `br`).
- [x] Empty address parts are still skipped on both the web page and the PDF, with no stray `<br>` at the end.
  - Web: `family-daily-cause-list.njk:79-83`, tested at `family-daily-cause-list.njk.test.ts:282`, `:296`, `:312`, `:326`.
  - PDF: `pdf-template.njk:39-49`, tested at `pdf-template.njk.test.ts:170`, `:177`, `:185`, `:193`.
- [x] Template tests updated: `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts` covers a representative being present and absent, and the web `.njk` test covers the court house address rendering as one block.
  - PDF test: `pdf-template.njk.test.ts:208-266`.
  - Web test: `family-daily-cause-list.njk.test.ts:265-376`.

## Next Steps

- [ ] Address critical issues
- [ ] Fix high priority items
- [ ] Consider suggestions
- [ ] Re-run tests after fixes

## Overall Assessment

APPROVED

- The change set now contains only the #1190 template fixes.
- All six acceptance criteria are met, with code and test evidence.
- Both changed workspaces are well above 80% statement coverage: 93.54% and 95.58%.
- There are no critical or high-priority issues.
- The manual PDF and spacing checks are done.

The remaining suggestions are optional follow-ups:

- make the purpose of the `site-header` class explicit and update `plan.md` to match
- replace the raw-HTML `endsWith("<br>")` asserts with structural checks
- add an escaping regression test
- factor the duplicated address block into a shared macro before the follow-up ticket
- make the test helpers read text rather than encoded HTML
