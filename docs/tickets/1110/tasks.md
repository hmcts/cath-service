# Tasks — Issue #1110: Update to the 'no published lists' message

## Implementation Tasks

- [ ] Update `apps/web/src/pages/(public)/summary-of-publications/en.ts:4` — set `noPublicationsMessage` to `"There are no lists available for this court or tribunal today."` (keep the trailing full stop)
- [ ] Update `apps/web/src/pages/(public)/summary-of-publications/cy.ts:4` — set `noPublicationsMessage` to `"Nid oes unrhyw restrau ar gael ar gyfer y llys na'r tribiwnlys hwn heddiw"` (straight apostrophe in `na'r`, no trailing full stop, verbatim from the issue)
- [ ] Update `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` — add `import { en } from "./en.js";` and change line 211 from the hard-coded literal to `expect(renderCall.noPublicationsMessage).toBe(en.noPublicationsMessage);` so the copy lives in one place only
- [ ] Optional: add a matching Welsh assertion in the existing `describe("Welsh locale")` block in `index.test.ts` — `expect(renderCall.noPublicationsMessage).toBe(cy.noPublicationsMessage)` using the empty-publications fixture (`locationId: "1"`, `locale: "cy"`)
- [ ] Update `e2e-tests/tests/summary-of-publications.spec.ts:312` (test "should display no publications message when location has no publications") to `await expect(page.getByText(/there are no lists available for this court or tribunal today/i)).toBeVisible();`
- [ ] Update `e2e-tests/tests/summary-of-publications.spec.ts:446` (test "should preserve language selection with no publications message @nightly") to `await expect(page.getByText(/nid oes unrhyw restrau ar gael ar gyfer y llys/i)).toBeVisible();` — stop the pattern before `na'r` so the apostrophe never enters the regex
- [ ] Update `templates/tech-spec-references/welsh-translations-catalogue.json` — remove the stale `"Sorry, no lists found for this court"` entry (line 356) and add `"There are no lists available for this court or tribunal today.": "Nid oes unrhyw restrau ar gael ar gyfer y llys na'r tribiwnlys hwn heddiw"` in alphabetical position, immediately before `"There are no matching results."`
- [ ] Do NOT edit `apps/web/src/pages/(public)/summary-of-publications/index.njk`, `index.ts`, or `index.njk.test.ts` — the template is value-agnostic, the controller already passes `t.noPublicationsMessage`, and the template test already asserts via the imported `en`/`cy` objects
- [ ] Do NOT edit `requirements/migrations/011_reconcile_board_2026_07_29.sql` or `012_reconcile_board_2026_08_04.sql` — immutable historical dumps
- [ ] Run a repo-wide grep for the old English string `Sorry, no lists found for this court` and the old Welsh string `Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau` — confirm zero hits outside `requirements/migrations/*.sql`
- [ ] Run `yarn lint:fix` from the repo root and confirm clean
- [ ] Run `yarn test` from the repo root and confirm the summary-of-publications controller and template tests pass (including the locale-key-parity test)
- [ ] Run the targeted E2E suite for `summary-of-publications` (including the `@nightly` Welsh test via `yarn test:e2e:all`) and confirm both empty-state assertions pass and the inline axe scan reports no violations
- [ ] Raise the clarifications from `plan.md` section 5 with the Service Manager — in particular (a) the EN/CY full-stop asymmetry and (b) the curly vs straight apostrophe — before the change is signed off
