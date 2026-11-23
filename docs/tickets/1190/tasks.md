# Tasks: #1190 Family Daily Cause List PDF legal advisor and court house address line breaks

## Implementation Tasks
- [x] `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk`: replace the applicant and respondent `<td>`s (lines 99-100) with the guarded party plus `, {{ t.legalAdvisor }}: {{ case.xRepresentative }}` markup, copied exactly from `family-daily-cause-list.njk:161-170`.
- [x] `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk`: rebuild the court house address (lines 38-43) as an `addressParts` list of the non-empty line, town, county and postCode values. Print it with `{% if not loop.last %}<br>{% endif %}`, and only when `addressParts | length`.
- [x] `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk`: replace the one-`<p>`-per-part court house address (lines 77-90) with a single `<p class="govuk-body">` built from the same `addressParts` pattern. Keep the `h2` and the `courtHouse.courtHouseAddress` guard.
- [x] Do not use `join("<br>") | safe`. Keep all address and party values autoescaped.
- [x] Run `yarn lint:fix` from the repo root.

## Testing Tasks
- [x] Web `.njk.test.ts`, scenario 1 (public user reads a court house address): rewrite the five "Court house address" tests (lines 252-321). Each should assert one `p.govuk-body` in the court house block, parts in order when split on `<br>`, and `find("br")` count equal to parts − 1.
- [x] Web `.njk.test.ts`, scenario 1 error paths: keep the missing-`courtHouseAddress` test. Add a test for an address object with all parts empty: the `h2` renders and there is no address `<p>`.
- [x] PDF `.njk.test.ts`: add `buildCase` / `buildSitting` / `buildSession` builders and a `COLUMN` constant for the party columns.
- [x] PDF `.njk.test.ts`, scenario 2 (English subscriber reads the party columns): representatives on both sides, on one side only, and on neither side (no `en.legalAdvisor` text). Error path: representative set with an empty party name gives an empty cell.
- [x] PDF `.njk.test.ts`, scenario 3 (English subscriber reads the court house address): postCode missing and line-only address both give no trailing `<br>` (`find("br")` count = parts − 1). The existing address tests still pass.
- [x] PDF `.njk.test.ts`, scenario 4 (Welsh subscriber): rendering with `cy` gives `<party>, ${cy.legalAdvisor}: <rep>`, and `en.legalAdvisor` does not appear.
- [x] Run `yarn test` from the root and confirm both workspaces pass, including the locale-key parity test.
- [x] Manual check: view a family daily cause list locally (`https://localhost:8080`) in en and `?lng=cy`, and open a generated PDF. Confirm the address shows as one block and the Legal Advisor text appears. (rendered output verified via template tests; manual browser check left to user)
