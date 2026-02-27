# Implementation Tasks - Issue #292

## Implementation Tasks

### Template Changes
- [x] Modify `libs/web-core/src/views/components/service-navigation.njk` to add language toggle link in `navigationEnd` slot after Sign in/Sign out link
- [x] Add `lang` attribute to toggle link (set to `otherLocale` variable)
- [x] Add `aria-label` attribute using new `language.switchAriaLabel` key
- [x] Remove language toggle from `libs/web-core/src/views/components/phase-banner-content.njk` (remove lines 5-7)
- [x] Remove Welsh availability inset text from `apps/web/src/pages/index.njk` (remove lines 23-25)

### Content/Translation Changes
- [x] Update `libs/web-core/src/locales/en.ts`: rename `switchPhaseBanner` to `switch`, add `switchAriaLabel: "Change language to Welsh"`
- [x] Update `libs/web-core/src/locales/cy.ts`: rename `switchPhaseBanner` to `switch`, add `switchAriaLabel` with confirmed Welsh translation
- [x] Remove `welshAvailableText` and `welshAvailableLink` from `apps/web/src/pages/en.ts`
- [x] Remove `welshAvailableText` and `welshAvailableLink` from `apps/web/src/pages/cy.ts`

### Controller Changes
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/admin-dashboard/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/media-applications/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/media-applications/[id]/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/media-applications/[id]/approve.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/media-applications/[id]/approved.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/media-applications/[id]/reject.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/media-applications/[id]/reject-reasons.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/media-applications/[id]/rejected.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/manual-upload/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/manual-upload-success/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/non-strategic-upload/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/non-strategic-upload-success/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/remove-list-confirmation/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/remove-list-search/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/remove-list-search-results/index.ts`
- [x] Remove `hideLanguageToggle: true` from `libs/admin-pages/src/pages/remove-list-success/index.ts`

### Test Updates
- [x] Update `libs/admin-pages/src/pages/admin-dashboard/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/media-applications/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/media-applications/[id]/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/media-applications/[id]/approve.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/media-applications/[id]/approved.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/media-applications/[id]/reject.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/media-applications/[id]/reject-reasons.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/media-applications/[id]/rejected.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/manual-upload/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/manual-upload-success/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/manual-upload-summary/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/non-strategic-upload/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/non-strategic-upload-success/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/non-strategic-upload-summary/index.test.ts` to remove `hideLanguageToggle` assertion
- [x] Update `libs/admin-pages/src/pages/remove-list-search/index.test.ts` to remove `hideLanguageToggle` assertion

### E2E Testing
- [ ] Add E2E test for language toggle journey covering: landing page, search page, language switching, query param preservation, keyboard navigation, screen reader support, accessibility scan

### Manual Testing
- [ ] Test landing page: toggle in service nav, no inset text, no phase banner toggle
- [ ] Test search page: toggle in service nav
- [ ] Test courts list page: toggle in service nav
- [ ] Test hearing list page: toggle in service nav
- [ ] Test admin dashboard: no toggle visible
- [ ] Test media applications page: no toggle visible
- [ ] Test Welsh version: toggle reads "English"
- [ ] Test English version: toggle reads "Cymraeg"
- [ ] Test query parameter preservation
- [ ] Test keyboard navigation to toggle
- [ ] Test screen reader announcement

### Verification
- [ ] Run unit tests: `yarn test`
- [ ] Run E2E tests: `yarn test:e2e:all`
- [ ] Run linter: `yarn lint:fix`
- [ ] Verify accessibility with axe-core
