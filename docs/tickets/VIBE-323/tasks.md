# VIBE-323: Implementation Tasks - Care Standards Weekly Hearing List Welsh Translation

## Tasks Overview

This document provides a step-by-step breakdown of implementation tasks for adding comprehensive Welsh language support to the Care Standards Tribunal Weekly Hearing List.

## Phase 1: Core Translation Updates

### Task 1.1: Update Welsh Content File
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/cy.ts`

**Actions**:
1. Replace all "Welsh placeholder" values with approved Welsh translations from specification
2. Ensure structure matches `en.ts` exactly
3. Add error message translations
4. Add search label translation
5. Add download PDF button translation

**Definition of Done**:
- [ ] All placeholder text replaced with Welsh translations
- [ ] Structure matches `en.ts` (same keys)
- [ ] File passes TypeScript compilation
- [ ] No hardcoded English text remains

**Estimated Effort**: 1 hour

---

### Task 1.2: Verify English Content Completeness
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/en.ts`

**Actions**:
1. Review current `en.ts` against specification
2. Add missing error messages if not present
3. Ensure all field labels match specification exactly
4. Verify download PDF button text
5. Verify Important Information content and link

**Definition of Done**:
- [ ] All specification content present in `en.ts`
- [ ] Content matches specification exactly
- [ ] No missing translations

**Estimated Effort**: 30 minutes

---

### Task 1.3: Test Date and Time Formatting for Welsh Locale
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.ts`

**Actions**:
1. Add unit tests for Welsh locale date formatting
2. Verify Luxon time formatting works with `cy-GB` locale
3. Test week commencing date displays correctly
4. Test last updated timestamp displays correctly
5. Verify month names (if using word format instead of numeric)

**Definition of Done**:
- [ ] Unit tests added for Welsh date formatting
- [ ] Tests pass for both `en-GB` and `cy-GB` locales
- [ ] Date format matches GOV.UK Welsh style guide
- [ ] Time format displays correctly (12-hour clock)

**Estimated Effort**: 1 hour

---

## Phase 2: Template Updates

### Task 2.1: Update Template to Use Locale Variables
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/care-standards-tribunal-weekly-hearing-list.njk`

**Actions**:
1. Review template for hardcoded English text
2. Replace all hardcoded text with locale variables from `en`/`cy` objects
3. Ensure page title uses `content.pageTitle`
4. Ensure all table headers use `content.tableHeaders.*`
5. Ensure Important Information uses `content.importantInformation.*`
6. Add proper `lang` attribute handling
7. Ensure search label uses `content.search.label`
8. Ensure download PDF button uses `content.downloadPdf`

**Definition of Done**:
- [ ] No hardcoded English text in template
- [ ] All text comes from locale objects
- [ ] Template works with both `en` and `cy` content
- [ ] `lang` attribute set correctly

**Estimated Effort**: 2 hours

---

### Task 2.2: Add Language Toggle Component
**Files**:
- Template (or base layout if toggle is global)
- `libs/web-core/src/views/components/language-toggle.njk` (if creating reusable component)

**Actions**:
1. Check if language toggle component already exists
2. If not, create reusable language toggle component
3. Add toggle to template (or base layout)
4. Include current language indicator (e.g., "EN | **CY**")
5. Ensure toggle links preserve query parameters (artefactId)
6. Add keyboard accessibility attributes
7. Add screen reader labels

**Definition of Done**:
- [ ] Language toggle visible on page
- [ ] Clicking toggle switches language
- [ ] Current language visually indicated
- [ ] Query parameters preserved when switching
- [ ] Keyboard accessible (Tab navigation)
- [ ] Screen reader announces toggle correctly

**Estimated Effort**: 2 hours

---

### Task 2.3: Update Controller for Locale Handling
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.ts`

**Actions**:
1. Verify controller reads `res.locals.locale` correctly
2. Ensure correct content object (`en` or `cy`) passed to template
3. Add error handling that uses locale-specific error messages
4. Pass current language to template for toggle state
5. Test query parameter `?lng=cy` switches to Welsh

**Definition of Done**:
- [ ] Controller correctly detects locale
- [ ] Correct content object passed to template
- [ ] Error messages in correct language
- [ ] Language toggle state reflects current language
- [ ] Unit tests pass

**Estimated Effort**: 1.5 hours

---

## Phase 3: Search Functionality

### Task 3.1: Implement Client-Side Search JavaScript
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/js/search.ts`

**Actions**:
1. Create `src/assets/` directory if not exists
2. Create `search.ts` with search initialization function
3. Add event listener to search input
4. Implement case-insensitive filtering of table rows
5. Show/hide rows based on search query
6. Add CSS class for hidden rows
7. Test search works in both English and Welsh

**Definition of Done**:
- [ ] Search input filters table rows correctly
- [ ] Filtering is case-insensitive
- [ ] Works with Welsh and English text
- [ ] No page reload required
- [ ] Handles empty search (shows all rows)

**Estimated Effort**: 2 hours

---

### Task 3.2: Add Search Assets to Module Configuration
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/config.ts`

**Actions**:
1. Add `assets` export pointing to `assets/` directory
2. Update `package.json` build script to include assets
3. Register assets in web app configuration
4. Test assets are served correctly

**Definition of Done**:
- [ ] `assets` export added to `config.ts`
- [ ] Build script includes assets
- [ ] Assets registered in web app
- [ ] JavaScript loads on page

**Estimated Effort**: 1 hour

---

### Task 3.3: Add Search CSS Styles
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/css/search.scss`

**Actions**:
1. Create CSS file for search styles
2. Add `.hidden` class for filtered rows
3. Add highlight styles for matching text (optional enhancement)
4. Ensure styles work with GOV.UK Design System

**Definition of Done**:
- [ ] `.hidden` class hides rows correctly
- [ ] Styles compatible with GOV.UK
- [ ] No visual regressions

**Estimated Effort**: 30 minutes

---

## Phase 4: PDF Generation (Optional - Can be Deferred)

### Task 4.1: Investigate PDF Generation Approach
**Research Task**

**Actions**:
1. Check if `@hmcts/publication` module has PDF generation
2. Research alternative libraries (Puppeteer, PDFKit)
3. Determine if PDFs should be cached or generated on-demand
4. Document recommended approach
5. Estimate effort for full implementation

**Definition of Done**:
- [ ] PDF generation approach documented
- [ ] Library/tool selected
- [ ] Implementation plan created
- [ ] Effort estimated

**Estimated Effort**: 2 hours

---

### Task 4.2: Implement PDF Download Handler (If Proceeding)
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/pdf.ts`

**Actions**:
1. Create PDF handler GET function
2. Load artefact data same as main handler
3. Render data for PDF format
4. Generate PDF from rendered HTML
5. Set appropriate headers for download
6. Include language parameter in filename
7. Test downloads work in both languages

**Definition of Done**:
- [ ] PDF downloads successfully
- [ ] PDF contains correct data
- [ ] Filename includes language code
- [ ] Works for both English and Welsh
- [ ] PDF formatting looks good

**Estimated Effort**: 4 hours (if implementing)

---

## Phase 5: Error Handling

### Task 5.1: Add Error Messages to Translation Files
**Files**: `en.ts` and `cy.ts`

**Actions**:
1. Add `errors` object to both translation files
2. Include all error scenarios from specification:
   - No hearings scheduled
   - Search returns no results
   - List cannot be displayed
   - PDF not available
   - Invalid file upload
   - Schema validation error
3. Ensure Welsh translations are accurate

**Definition of Done**:
- [ ] All error messages in both languages
- [ ] Error structure matches between `en` and `cy`
- [ ] Welsh translations approved

**Estimated Effort**: 30 minutes

---

### Task 5.2: Update Controller Error Handling
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.ts`

**Actions**:
1. Update try-catch blocks to use locale-specific errors
2. Pass error messages to template
3. Add error display to template (if not present)
4. Test all error scenarios in both languages
5. Ensure error messages use GOV.UK error components

**Definition of Done**:
- [ ] All errors display in correct language
- [ ] Error messages use GOV.UK components
- [ ] Error summary displays correctly
- [ ] Tests cover error scenarios

**Estimated Effort**: 1.5 hours

---

## Phase 6: Accessibility Compliance

### Task 6.1: Add ARIA Attributes and Semantic HTML
**File**: Template

**Actions**:
1. Verify `<html lang="">` attribute changes with locale
2. Add `aria-label` to language toggle
3. Ensure table headers use `scope="col"`
4. Add `role="alert"` for error messages
5. Verify accordion has proper ARIA attributes (GOV.UK component should handle)
6. Test with keyboard navigation (Tab, Enter, Space)

**Definition of Done**:
- [ ] HTML `lang` attribute correct for each language
- [ ] All ARIA attributes present
- [ ] Keyboard navigation works
- [ ] No accessibility errors in automated tests

**Estimated Effort**: 1.5 hours

---

### Task 6.2: Run Accessibility Tests
**File**: New E2E test or update existing

**Actions**:
1. Add Axe accessibility tests for both languages
2. Test with screen reader (manual testing)
3. Test keyboard-only navigation
4. Verify focus indicators visible
5. Test color contrast
6. Verify heading hierarchy
7. Run WAVE or similar tool

**Definition of Done**:
- [ ] Axe tests pass with zero violations
- [ ] Screen reader announces content correctly
- [ ] Keyboard navigation fully functional
- [ ] Manual accessibility checklist complete

**Estimated Effort**: 2 hours

---

## Phase 7: Testing

### Task 7.1: Write Unit Tests for Welsh Content
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.test.ts`

**Actions**:
1. Add test for Welsh locale rendering
2. Add test for locale-specific error messages
3. Add test for date formatting with Welsh locale
4. Add test for content object selection (`en` vs `cy`)
5. Ensure existing tests still pass

**Definition of Done**:
- [ ] All unit tests pass
- [ ] Welsh locale scenarios covered
- [ ] Test coverage maintained or improved
- [ ] Tests run successfully in CI

**Estimated Effort**: 2 hours

---

### Task 7.2: Add E2E Tests for Welsh Language
**File**: `e2e-tests/tests/care-standards-tribunal.spec.ts` (or new file)

**Actions**:
1. Add test for displaying Welsh content with `?lng=cy`
2. Add test for language toggle functionality
3. Add test for search in Welsh
4. Add test for PDF download in Welsh (if implemented)
5. Add test for error messages in Welsh
6. Verify accessibility in both languages
7. Test preserves language when navigating

**Definition of Done**:
- [ ] E2E tests pass for both languages
- [ ] Language toggle tested
- [ ] Search functionality tested in both languages
- [ ] Accessibility verified in tests
- [ ] Tests tagged with `@nightly` if appropriate

**Estimated Effort**: 3 hours

---

### Task 7.3: Cross-Browser Testing
**Manual Testing Task**

**Actions**:
1. Test in Chrome/Edge
2. Test in Firefox
3. Test in Safari
4. Test on mobile browsers (iOS Safari, Chrome Android)
5. Verify Welsh characters display correctly in all browsers
6. Check language toggle works in all browsers
7. Document any browser-specific issues

**Definition of Done**:
- [ ] Works in all major browsers
- [ ] Welsh characters display correctly
- [ ] No layout issues
- [ ] Language toggle works everywhere

**Estimated Effort**: 1 hour

---

## Phase 8: Documentation

### Task 8.1: Update Module README
**File**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/README.md`

**Actions**:
1. Document Welsh translation support
2. Document language toggle usage
3. Document how to add new translations
4. Document locale handling in controller
5. Document search functionality
6. Add examples of English and Welsh URLs

**Definition of Done**:
- [ ] README includes Welsh translation section
- [ ] Translation process documented
- [ ] Examples provided
- [ ] Clear and easy to understand

**Estimated Effort**: 1 hour

---

### Task 8.2: Add Inline Code Comments
**Files**: Various

**Actions**:
1. Add comments explaining Welsh-specific logic
2. Document locale detection in controller
3. Document date formatting with locales
4. Add JSDoc comments to public functions
5. Document any Welsh-specific edge cases

**Definition of Done**:
- [ ] Key functions have JSDoc comments
- [ ] Welsh-specific logic explained
- [ ] Code is self-documenting

**Estimated Effort**: 30 minutes

---

## Task Dependencies

```
Phase 1 (Core Translation)
├─ Task 1.1: Update Welsh Content File
├─ Task 1.2: Verify English Content
└─ Task 1.3: Test Date/Time Formatting
    │
    v
Phase 2 (Template Updates)
├─ Task 2.1: Update Template to Use Locale Variables [depends on 1.1, 1.2]
├─ Task 2.2: Add Language Toggle [depends on 2.1]
└─ Task 2.3: Update Controller [depends on 2.1]
    │
    v
Phase 3 (Search)
├─ Task 3.1: Implement Search JS
├─ Task 3.2: Add Search Assets [depends on 3.1]
└─ Task 3.3: Add Search CSS [depends on 3.1]
    │
    v
Phase 4 (PDF - Optional)
├─ Task 4.1: Investigate PDF Approach
└─ Task 4.2: Implement PDF Handler [depends on 4.1]
    │
    v
Phase 5 (Error Handling)
├─ Task 5.1: Add Error Messages [depends on 1.1, 1.2]
└─ Task 5.2: Update Controller Error Handling [depends on 5.1]
    │
    v
Phase 6 (Accessibility)
├─ Task 6.1: Add ARIA Attributes [depends on 2.1, 2.2]
└─ Task 6.2: Run Accessibility Tests [depends on 6.1]
    │
    v
Phase 7 (Testing)
├─ Task 7.1: Unit Tests [depends on all above]
├─ Task 7.2: E2E Tests [depends on all above]
└─ Task 7.3: Cross-Browser Testing [depends on all above]
    │
    v
Phase 8 (Documentation)
├─ Task 8.1: Update README [depends on all above]
└─ Task 8.2: Add Code Comments [ongoing throughout]
```

## Total Effort Estimate

- **Phase 1**: 2.5 hours
- **Phase 2**: 5.5 hours
- **Phase 3**: 3.5 hours
- **Phase 4**: 6 hours (optional - can be deferred)
- **Phase 5**: 2 hours
- **Phase 6**: 3.5 hours
- **Phase 7**: 6 hours
- **Phase 8**: 1.5 hours

**Total (excluding Phase 4)**: ~24.5 hours (~3-4 days)
**Total (including Phase 4)**: ~30.5 hours (~4-5 days)

## Notes

- PDF generation (Phase 4) can be deferred to a separate ticket if it proves complex
- Welsh translations must be approved by HMCTS Welsh Translation Unit before deployment
- Testing should be done iteratively throughout implementation, not just at the end
- Cross-browser testing can be done in parallel with other tasks
