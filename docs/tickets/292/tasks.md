## Implementation Tasks

### Templates

- [ ] Remove language toggle block from `libs/web-core/src/views/components/phase-banner-content.njk`
- [ ] Add language toggle `<li>` to `navigationEnd` slot in `libs/web-core/src/views/components/service-navigation.njk`, guarded by `{% if not hideLanguageToggle %}`

### Landing page

- [ ] Remove `govuk-inset-text` block from `apps/web/src/pages/index.njk`
- [ ] Remove `welshAvailableText` and `welshAvailableLink` keys from `apps/web/src/pages/en.ts`
- [ ] Remove `welshAvailableText` and `welshAvailableLink` keys from `apps/web/src/pages/cy.ts`

### Shared locales

- [ ] Rename `language.switchPhaseBanner` to `language.switch` and add `language.switchAriaLabel` in `libs/web-core/src/locales/en.ts`
- [ ] Rename `language.switchPhaseBanner` to `language.switch` and add `language.switchAriaLabel` in `libs/web-core/src/locales/cy.ts`

### E2E tests

- [ ] Update `e2e-tests/tests/landing-page.spec.ts`: replace inset text toggle assertion with service navigation toggle assertion
- [ ] Update `e2e-tests/tests/landing-page.spec.ts`: replace inset text English toggle assertion in the Welsh journey test with a service navigation assertion
- [ ] Update `e2e-tests/tests/page-structure.spec.ts`: replace all `.govuk-phase-banner a:has-text("Cymraeg")` and `.govuk-phase-banner a:has-text("English")` selectors with `getByRole("link", { name: /cymraeg/i })` and `getByRole("link", { name: /english/i })`
- [ ] Rename `page-structure.spec.ts` test "should display Welsh toggle in beta banner" to reflect the new service navigation location

### Verification

- [ ] Run `yarn lint:fix` and confirm no linter errors
- [ ] Run `yarn test` and confirm all unit tests pass
- [ ] Manually verify toggle appears in service navigation on a public page (e.g., `/`, `/view-option`, `/search`)
- [ ] Manually verify toggle is absent on an admin page (e.g., `/manual-upload`)
- [ ] Manually verify toggle is absent from the phase banner on all pages
- [ ] Manually verify the inset text block no longer appears on the landing page
- [ ] Verify WCAG AA accessibility with axe on the landing page after changes
