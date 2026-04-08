# VIBE-339: Implementation Tasks

**REFERENCE IMPLEMENTATION:** Use `libs/list-types/civil-and-family-daily-cause-list/` as the pattern for all implementations.

## Implementation Tasks

### Phase 1: Setup and Infrastructure

- [x] Verify @hmcts/pdf-generation package is available
- [x] Verify storage/temp/uploads/ directory exists for PDF storage

### Phase 2: RCJ Standard Daily Cause List (List Type 9)

**Follow civil-and-family-daily-cause-list structure exactly:**

#### PDF Generation (src/pdf/)
- [x] Create libs/list-types/rcj-standard-daily-cause-list/src/pdf/ directory
- [x] Implement pdf-generator.ts following civil-and-family-daily-cause-list/src/pdf/pdf-generator.ts pattern:
  - Use existing `renderStandardDailyCauseList()` from rendering/renderer.ts
  - Use `@hmcts/pdf-generation` package
  - Load translations from pages/en.ts and pages/cy.ts
  - Save PDF to storage/temp/uploads/
- [x] Create pdf-template.njk standalone template (no GOV.UK Frontend dependencies)
- [x] Write pdf-generator.test.ts unit tests

#### Email Summary (src/email-summary/)
- [x] Create libs/list-types/rcj-standard-daily-cause-list/src/email-summary/ directory
- [x] Implement summary-builder.ts following civil-and-family-daily-cause-list/src/email-summary/summary-builder.ts pattern:
  - Export SPECIAL_CATEGORY_DATA_WARNING constant
  - Export CaseSummaryItem interface (caseNumber, caseDetails, hearingType)
  - Export extractCaseSummary() function
  - Export formatCaseSummaryForEmail() function
- [x] Write summary-builder.test.ts unit tests

#### Module Integration
- [x] Update package.json build script to include `build:nunjucks` for pdf-template.njk
- [x] Update src/index.ts to export pdf-generator and summary-builder (match civil-and-family pattern)

### Phase 3: Court of Appeal Civil Daily Cause List (List Type 10)

**Follow civil-and-family-daily-cause-list structure exactly:**

#### PDF Generation (src/pdf/)
- [x] Create libs/list-types/court-of-appeal-civil-daily-cause-list/src/pdf/ directory
- [x] Implement pdf-generator.ts (same pattern as Phase 2)
- [x] Create pdf-template.njk standalone template
- [x] Write pdf-generator.test.ts unit tests

#### Email Summary (src/email-summary/)
- [x] Create libs/list-types/court-of-appeal-civil-daily-cause-list/src/email-summary/ directory
- [x] Implement summary-builder.ts (same pattern as Phase 2)
- [x] Write summary-builder.test.ts unit tests

#### Module Integration
- [x] Update package.json build script
- [x] Update src/index.ts exports

### Phase 4: Administrative Court Daily Cause List (List Type 11)

**Follow civil-and-family-daily-cause-list structure exactly:**

#### PDF Generation (src/pdf/)
- [x] Create libs/list-types/administrative-court-daily-cause-list/src/pdf/ directory
- [x] Implement pdf-generator.ts (same pattern as Phase 2)
- [x] Create pdf-template.njk standalone template
- [x] Write pdf-generator.test.ts unit tests

#### Email Summary (src/email-summary/)
- [x] Create libs/list-types/administrative-court-daily-cause-list/src/email-summary/ directory
- [x] Implement summary-builder.ts (same pattern as Phase 2)
- [x] Write summary-builder.test.ts unit tests

#### Module Integration
- [x] Update package.json build script
- [x] Update src/index.ts exports

### Phase 5: London Administrative Court Daily Cause List (List Type 12)

**Follow civil-and-family-daily-cause-list structure exactly:**

#### PDF Generation (src/pdf/)
- [x] Create libs/list-types/london-administrative-court-daily-cause-list/src/pdf/ directory
- [x] Implement pdf-generator.ts (same pattern as Phase 2)
- [x] Create pdf-template.njk standalone template
- [x] Write pdf-generator.test.ts unit tests

#### Email Summary (src/email-summary/)
- [x] Create libs/list-types/london-administrative-court-daily-cause-list/src/email-summary/ directory
- [x] Implement summary-builder.ts (same pattern as Phase 2)
- [x] Write summary-builder.test.ts unit tests

#### Module Integration
- [x] Update package.json build script
- [x] Update src/index.ts exports

### Phase 6: Care Standards Tribunal Weekly Hearing List (List Type 13)

**Follow civil-and-family-daily-cause-list structure exactly (with different CaseSummaryItem fields):**

#### PDF Generation (src/pdf/)
- [x] Create libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pdf/ directory
- [x] Implement pdf-generator.ts (same pattern, using CareStandardsTribunalHearingList type)
- [x] Create pdf-template.njk standalone template (weekly format)
- [x] Write pdf-generator.test.ts unit tests

#### Email Summary (src/email-summary/)
- [x] Create libs/list-types/care-standards-tribunal-weekly-hearing-list/src/email-summary/ directory
- [x] Implement summary-builder.ts with different CaseSummaryItem:
  - Export SPECIAL_CATEGORY_DATA_WARNING constant
  - Export CaseSummaryItem interface (caseName, hearingDate - NOT caseNumber/caseDetails/hearingType)
  - Export extractCaseSummary() function
  - Export formatCaseSummaryForEmail() function
- [x] Write summary-builder.test.ts unit tests

#### Module Integration
- [x] Update package.json build script
- [x] Update src/index.ts exports

### Phase 7: Notification Service Integration

- [x] Add list type constants (9, 10, 11, 12, 13) to notification-service.ts
- [x] Implement buildRcjEmailData() in notification-service.ts
- [x] Implement buildCareStandardsEmailData() in notification-service.ts
- [x] Modify buildEmailTemplateData() to handle new list types
- [x] Add environment variables to template-config.ts for new template IDs
- [x] Extend getSubscriptionTemplateIdForListType() for RCJ and Care Standards lists
- [x] Update buildEnhancedTemplateParameters() to handle new list types
- [ ] Write unit tests for new notification service functions
- [ ] Update .env.example with new template ID variables

### Phase 8: Testing

- [ ] Write integration tests for RCJ Standard Daily Cause List notification flow
- [ ] Write integration tests for Court of Appeal Civil Daily Cause List notification flow
- [ ] Write integration tests for Administrative Court Daily Cause List notification flow
- [ ] Write integration tests for London Administrative Court Daily Cause List notification flow
- [ ] Write integration tests for Care Standards Tribunal notification flow
- [ ] Create E2E test for subscription notifications with PDF attachment
- [ ] Test PDF exceeding 2MB scenario (download link instead of attachment)

### Phase 9: Documentation and Cleanup

- [ ] Update README with new list types support
- [ ] Document GOV.UK Notify template setup requirements
- [ ] Document environment variable configuration
- [ ] Verify all unit tests pass (yarn test)
- [ ] Verify all E2E tests pass (yarn test:e2e)
- [ ] Run accessibility tests (yarn test:e2e)
- [ ] Run lint and format (yarn lint:fix && yarn format)
- [ ] Manual testing of full notification flow for each list type
- [ ] Visual review of generated PDFs against style guide
