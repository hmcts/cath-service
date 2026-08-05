# Tasks — #895: CaTH account verification requirement added in CaTH account creation T&C

## Implementation Tasks

- [ ] Confirm `termsText` has no consumers outside `apps/web/src/pages/(public)/create-media-account/` (grep before editing)
- [ ] `en.ts`: remove `termsText`; add `termsHeading`, `termsText1`, `termsText2` (new annual verification paragraph), `termsText3`
- [ ] `cy.ts`: mirror the same four keys with the Welsh copy from the ticket (use `GLlTEF`, not `GLlTEM`)
- [ ] `index.njk`: insert `<h2 class="govuk-heading-m">{{ termsHeading }}</h2>` plus three `<p class="govuk-body">` paragraphs after the `idProof` form group and before the checkbox
- [ ] `index.njk`: remove the `hint` key from the `govukCheckboxes` call
- [ ] `index.njk.test.ts`: rewrite the English terms test to assert the `h2` heading and all three paragraphs
- [ ] `index.njk.test.ts`: add an assertion that the `h2` appears after `#idProof` and before the `termsText1` paragraph (AC ordering)
- [ ] `index.njk.test.ts`: update the Welsh terms assertions to the new keys
- [ ] `index.njk.test.ts`: update the `requiredKeys` list (drop `termsText`, add the four new keys)
- [ ] Verify the checkbox has no dangling `aria-describedby` now the hint is gone
- [ ] Run `index.test.ts` to confirm the controller tests still pass unchanged
- [ ] `e2e-tests/tests/create-media-account.spec.ts`: extend the existing "should display form with all required fields" test with heading + annual verification assertions (do NOT add a new spec)
- [ ] Manual check `/create-media-account` and `/create-media-account?lng=cy`
- [ ] Confirm axe reports no heading-order violation from the new `h2`
- [ ] `yarn lint:fix` and `yarn test`
