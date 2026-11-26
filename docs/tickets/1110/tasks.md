# Tasks — #1110: Update to the 'no published lists' message

## Implementation Tasks

- [x] Update `noPublicationsMessage` in `apps/web/src/pages/(public)/summary-of-publications/en.ts` to `There are no lists available for this court or tribunal today.`
- [x] Update `noPublicationsMessage` in `apps/web/src/pages/(public)/summary-of-publications/cy.ts` to `Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw.` (curly apostrophe, trailing full stop — confirmed)
- [x] Update the stale entry in `templates/tech-spec-references/welsh-translations-catalogue.json`: remove the `Sorry, no lists found for this court` key and add the new EN to CY pair in alphabetical order

## Testing Tasks

- [x] `index.test.ts`: import `en`/`cy` and replace the literal assertion at line 211 with `en.noPublicationsMessage`
- [x] `index.test.ts`: add a Welsh-locale empty-state test asserting `cy.noPublicationsMessage`
- [x] `index.njk.test.ts`: in the error-state test, assert the default message is absent
- [x] `index.njk.test.ts`: in the Welsh render test, assert `en.noPublicationsMessage` is absent
- [x] `e2e-tests/tests/summary-of-publications.spec.ts:338`: assert the exact new English text
- [x] `e2e-tests/tests/summary-of-publications.spec.ts:472`: assert the exact new Welsh text (with curly `’`)

## Verification Tasks

- [x] `grep -rn "Sorry, no lists found for this court\|ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau" apps/*/src libs/*/src e2e-tests templates` returns no hits
- [x] `yarn test` passes, including the locale parity test (run for the `@hmcts/web` workspace: 380 files, 3952 passed, 3 skipped)
- [x] `yarn lint:fix` is clean (changed files clean; one pre-existing warning in an untouched file, `sjp-press-list/require-verified-with-provenance.ts`)
- [x] Run the two affected E2E tests; the axe scan passes with no new exclusions (ran full summary-of-publications.spec.ts incl. @nightly: 8 passed, 2 skipped — pre-existing describe.skip CST block)
- [x] Check `/summary-of-publications?locationId=<empty venue>` in English and with `?lng=cy` (covered by the two E2E tests above against the running app)
