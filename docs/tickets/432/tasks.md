# Implementation Tasks

## Implementation Tasks

- [ ] Add `cookieManagement` section to `libs/web-core/src/pages/cookie-policy/en.ts` inside `sections`, after `introMessage`
- [ ] Add matching `cookieManagement` section to `libs/web-core/src/pages/cookie-policy/cy.ts` inside `sections`, after `introMessage`
- [ ] Add cookie management template block to `libs/web-core/src/pages/cookie-policy/index.njk` between the `introMessage` and `session` blocks
- [ ] Verify the page renders correctly in English at `/cookie-policy`
- [ ] Verify the page renders correctly in Welsh at `/cookie-policy?lng=cy`
- [ ] Confirm all three new cookies (`cookie_policy`, `cookies_preferences_set`, `locale`) are visible in both languages
