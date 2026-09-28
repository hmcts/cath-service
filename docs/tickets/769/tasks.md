# Tasks — Issue #769

## Implementation Tasks

- [x] Update `apps/web/src/pages/(public)/sign-in/en.ts`: set `createAccountText` to "Don't have an account?", set `createAccountLink` to "Create a Court and tribunal hearings account", add `userResearchText`
- [x] Update `apps/web/src/pages/(public)/sign-in/cy.ts` with the matching Welsh values and `userResearchText`, keeping the key set identical to `en.ts`
- [x] Replace the create-account `<p>` block in `apps/web/src/pages/(public)/sign-in/index.njk` with the `<h2>` + link `<p>` + bold notice `<p>`, leaving it outside the `<form>` and leaving `href="/create-media-account"` unchanged
- [x] Update `index.njk.test.ts`: assert `h2` text, anchor text, notice text and notice-after-anchor DOM order in both `en` and `cy`; assert all three render in the error state; add `userResearchText` to `requiredKeys`
- [x] Update `index.test.ts` for any assertion referencing the old copy
- [x] Update the **existing** tests in `e2e-tests/tests/sign-in.spec.ts` to the new heading text, new link accessible name, and notice visibility (English and Welsh); do not add new tests
- [x] Fix the stale tab-order comment in the E2E keyboard navigation test (Continue button comes before the create-account link)
- [x] Run `yarn lint:fix`, then `yarn test`, then `yarn test:e2e` from the repo root
- [x] Manually compare `/sign-in` and `/sign-in?lng=cy` side by side against `https://pip-frontend.staging.platform.hmcts.net/sign-in`; confirm heading size (see plan Open Question 4)
- [x] Manually check keyboard access to the link, 320px width, and 400% zoom in both locales
